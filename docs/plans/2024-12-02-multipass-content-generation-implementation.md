# Multi-Pass Content Generation Implementation Plan

> **Status:** ✅ IMPLEMENTED (2025-12-02)
>
> All phases complete. Migrations created but need to be pushed to Supabase.
> Run `npx supabase db push` to apply migrations.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-pass, resumable content generation system that applies 25+ SEO rules from research docs and survives browser close/network issues.

**Architecture:** Section-by-section generation in Pass 1 avoids 60s timeout. 8 sequential passes apply different rule categories. Jobs/sections persisted to Supabase with Realtime subscriptions for live progress. Resume capability picks up exactly where interrupted.

**Tech Stack:** React, TypeScript, Supabase (PostgreSQL + Realtime), TailwindCSS, existing AI provider abstraction

---

## Phase 1: Database Schema

### Task 1.1: Create content_generation_jobs migration

**Files:**
- Create: `supabase/migrations/20251202100000_add_content_generation_jobs.sql`

**Step 1: Write the migration file**

```sql
-- supabase/migrations/20251202100000_add_content_generation_jobs.sql
-- Multi-pass content generation job tracking

CREATE TABLE public.content_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.content_briefs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  map_id UUID NOT NULL REFERENCES public.topical_maps(id),

  -- Job Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'paused', 'completed', 'failed', 'cancelled')),

  -- Multi-pass tracking
  current_pass INTEGER NOT NULL DEFAULT 1 CHECK (current_pass >= 1 AND current_pass <= 8),
  passes_status JSONB NOT NULL DEFAULT '{
    "pass_1_draft": "pending",
    "pass_2_headers": "pending",
    "pass_3_lists": "pending",
    "pass_4_visuals": "pending",
    "pass_5_microsemantics": "pending",
    "pass_6_discourse": "pending",
    "pass_7_intro": "pending",
    "pass_8_audit": "pending"
  }'::jsonb,

  -- Section tracking for Pass 1
  total_sections INTEGER,
  completed_sections INTEGER DEFAULT 0,
  current_section_key TEXT,

  -- Content accumulation
  draft_content TEXT,

  -- Audit results
  final_audit_score NUMERIC(5,2),
  audit_details JSONB,

  -- Error handling
  last_error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(brief_id)
);

-- RLS Policies
ALTER TABLE public.content_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON public.content_generation_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs"
  ON public.content_generation_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON public.content_generation_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs"
  ON public.content_generation_jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_content_generation_jobs_brief_id ON public.content_generation_jobs(brief_id);
CREATE INDEX idx_content_generation_jobs_user_id ON public.content_generation_jobs(user_id);
CREATE INDEX idx_content_generation_jobs_status ON public.content_generation_jobs(status);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_generation_jobs;

-- Updated_at trigger
CREATE TRIGGER update_content_generation_jobs_updated_at
  BEFORE UPDATE ON public.content_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Verify migration syntax**

Run: `npx supabase db diff --local` (or review SQL syntax manually)
Expected: No syntax errors

**Step 3: Commit**

```bash
git add supabase/migrations/20251202100000_add_content_generation_jobs.sql
git commit -m "feat(db): add content_generation_jobs table for multi-pass workflow"
```

---

### Task 1.2: Create content_generation_sections migration

**Files:**
- Create: `supabase/migrations/20251202100001_add_content_generation_sections.sql`

**Step 1: Write the migration file**

```sql
-- supabase/migrations/20251202100001_add_content_generation_sections.sql
-- Individual section storage with version history per pass

CREATE TABLE public.content_generation_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.content_generation_jobs(id) ON DELETE CASCADE,

  -- Section identification
  section_key TEXT NOT NULL,
  section_heading TEXT,
  section_order INTEGER NOT NULL,
  section_level INTEGER DEFAULT 2,

  -- Content versions (one per pass)
  pass_1_content TEXT,
  pass_2_content TEXT,
  pass_3_content TEXT,
  pass_4_content TEXT,
  pass_5_content TEXT,
  pass_6_content TEXT,
  pass_7_content TEXT,
  pass_8_content TEXT,

  -- Current version pointer
  current_content TEXT,
  current_pass INTEGER DEFAULT 1,

  -- Per-section audit scores
  audit_scores JSONB DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(job_id, section_key)
);

-- RLS (inherits from job ownership)
ALTER TABLE public.content_generation_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sections"
  ON public.content_generation_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.content_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own sections"
  ON public.content_generation_sections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.content_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sections"
  ON public.content_generation_sections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.content_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own sections"
  ON public.content_generation_sections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.content_generation_jobs j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_content_generation_sections_job_id ON public.content_generation_sections(job_id);
CREATE INDEX idx_content_generation_sections_order ON public.content_generation_sections(job_id, section_order);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_generation_sections;

-- Updated_at trigger
CREATE TRIGGER update_content_generation_sections_updated_at
  BEFORE UPDATE ON public.content_generation_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Commit**

```bash
git add supabase/migrations/20251202100001_add_content_generation_sections.sql
git commit -m "feat(db): add content_generation_sections table with pass versioning"
```

---

### Task 1.3: Push migrations to Supabase

**Step 1: Push migrations**

Run: `npx supabase db push`
Expected: Both tables created successfully

**Step 2: Verify tables exist**

Run: `npx supabase db diff --linked` (or check Supabase Dashboard)
Expected: No diff (tables exist in remote)

**Step 3: Commit any generated types**

```bash
git add -A
git commit -m "chore: update database types after migration push" --allow-empty
```

---

## Phase 2: TypeScript Types

### Task 2.1: Add ContentGenerationJob types

**Files:**
- Modify: `types.ts` (append after line ~500)

**Step 1: Add the new types**

Add to `types.ts`:

```typescript
// === Multi-Pass Content Generation Types ===

export type JobStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type SectionStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type PassStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface PassesStatus {
  pass_1_draft: PassStatus;
  pass_2_headers: PassStatus;
  pass_3_lists: PassStatus;
  pass_4_visuals: PassStatus;
  pass_5_microsemantics: PassStatus;
  pass_6_discourse: PassStatus;
  pass_7_intro: PassStatus;
  pass_8_audit: PassStatus;
}

export interface ContentGenerationJob {
  id: string;
  brief_id: string;
  user_id: string;
  map_id: string;
  status: JobStatus;
  current_pass: number;
  passes_status: PassesStatus;
  total_sections: number | null;
  completed_sections: number;
  current_section_key: string | null;
  draft_content: string | null;
  final_audit_score: number | null;
  audit_details: AuditDetails | null;
  last_error: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface AuditDetails {
  algorithmicResults: AuditRuleResult[];
  aiAuditResult?: {
    semanticScore: number;
    suggestions: string[];
  };
  passingRules: number;
  totalRules: number;
  timestamp: string;
}

export interface ContentGenerationSection {
  id: string;
  job_id: string;
  section_key: string;
  section_heading: string | null;
  section_order: number;
  section_level: number;
  pass_1_content: string | null;
  pass_2_content: string | null;
  pass_3_content: string | null;
  pass_4_content: string | null;
  pass_5_content: string | null;
  pass_6_content: string | null;
  pass_7_content: string | null;
  pass_8_content: string | null;
  current_content: string | null;
  current_pass: number;
  audit_scores: Record<string, number>;
  status: SectionStatus;
  created_at: string;
  updated_at: string;
}

export interface SectionDefinition {
  key: string;
  heading: string;
  level: number;
  order: number;
  subordinateTextHint?: string;
  methodologyNote?: string;
}

export const PASS_NAMES: Record<number, string> = {
  1: 'Draft Generation',
  2: 'Header Optimization',
  3: 'Lists & Tables',
  4: 'Visual Semantics',
  5: 'Micro Semantics',
  6: 'Discourse Integration',
  7: 'Introduction Synthesis',
  8: 'Final Audit'
};
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no type errors

**Step 3: Commit**

```bash
git add types.ts
git commit -m "feat(types): add ContentGenerationJob and Section types"
```

---

## Phase 3: Core Orchestrator

### Task 3.1: Create contentGenerationOrchestrator.ts

**Files:**
- Create: `services/ai/contentGeneration/orchestrator.ts`

**Step 1: Create directory structure**

```bash
mkdir -p services/ai/contentGeneration
```

**Step 2: Write the orchestrator**

```typescript
// services/ai/contentGeneration/orchestrator.ts
import { getSupabaseClient } from '../../supabaseClient';
import { ContentGenerationJob, ContentGenerationSection, ContentBrief, PassesStatus, SectionDefinition, PASS_NAMES } from '../../../types';

export interface OrchestratorCallbacks {
  onPassStart: (passNumber: number, passName: string) => void;
  onPassComplete: (passNumber: number) => void;
  onSectionStart: (sectionKey: string, sectionHeading: string) => void;
  onSectionComplete: (sectionKey: string) => void;
  onError: (error: Error, context: string) => void;
  onJobComplete: (auditScore: number) => void;
}

export class ContentGenerationOrchestrator {
  private supabaseUrl: string;
  private supabaseKey: string;
  private callbacks: OrchestratorCallbacks;
  private abortController: AbortController;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    callbacks: OrchestratorCallbacks
  ) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.callbacks = callbacks;
    this.abortController = new AbortController();
  }

  private get supabase() {
    return getSupabaseClient(this.supabaseUrl, this.supabaseKey);
  }

  async createJob(briefId: string, mapId: string, userId: string): Promise<ContentGenerationJob> {
    const { data, error } = await this.supabase
      .from('content_generation_jobs')
      .insert({
        brief_id: briefId,
        map_id: mapId,
        user_id: userId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create job: ${error.message}`);
    return data as ContentGenerationJob;
  }

  async getExistingJob(briefId: string): Promise<ContentGenerationJob | null> {
    const { data, error } = await this.supabase
      .from('content_generation_jobs')
      .select('*')
      .eq('brief_id', briefId)
      .in('status', ['pending', 'in_progress', 'paused', 'failed'])
      .maybeSingle();

    if (error) throw new Error(`Failed to check existing job: ${error.message}`);
    return data as ContentGenerationJob | null;
  }

  async updateJob(jobId: string, updates: Partial<ContentGenerationJob>): Promise<void> {
    const { error } = await this.supabase
      .from('content_generation_jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', jobId);

    if (error) throw new Error(`Failed to update job: ${error.message}`);
  }

  async getSections(jobId: string): Promise<ContentGenerationSection[]> {
    const { data, error } = await this.supabase
      .from('content_generation_sections')
      .select('*')
      .eq('job_id', jobId)
      .order('section_order', { ascending: true });

    if (error) throw new Error(`Failed to get sections: ${error.message}`);
    return (data || []) as ContentGenerationSection[];
  }

  async upsertSection(section: Partial<ContentGenerationSection> & { job_id: string; section_key: string }): Promise<void> {
    const { error } = await this.supabase
      .from('content_generation_sections')
      .upsert(section, { onConflict: 'job_id,section_key' });

    if (error) throw new Error(`Failed to upsert section: ${error.message}`);
  }

  async deleteJob(jobId: string): Promise<void> {
    const { error } = await this.supabase
      .from('content_generation_jobs')
      .delete()
      .eq('id', jobId);

    if (error) throw new Error(`Failed to delete job: ${error.message}`);
  }

  async pauseJob(jobId: string): Promise<void> {
    await this.updateJob(jobId, { status: 'paused' });
    this.abortController.abort();
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.updateJob(jobId, { status: 'cancelled' });
    this.abortController.abort();
  }

  calculateProgress(job: ContentGenerationJob): number {
    const passWeight = 100 / 8;
    let progress = 0;

    // Count completed passes
    const passesStatus = job.passes_status;
    const passKeys = Object.keys(passesStatus) as (keyof PassesStatus)[];

    for (let i = 0; i < passKeys.length; i++) {
      if (passesStatus[passKeys[i]] === 'completed') {
        progress += passWeight;
      } else if (passesStatus[passKeys[i]] === 'in_progress') {
        // For pass 1, calculate section progress
        if (i === 0 && job.total_sections && job.total_sections > 0) {
          const sectionProgress = (job.completed_sections / job.total_sections) * passWeight;
          progress += sectionProgress;
        } else {
          // For other passes, assume 50% if in progress
          progress += passWeight * 0.5;
        }
        break;
      } else {
        break;
      }
    }

    return Math.round(progress);
  }

  parseSectionsFromBrief(brief: ContentBrief): SectionDefinition[] {
    const sections: SectionDefinition[] = [];

    // Add introduction
    sections.push({
      key: 'intro',
      heading: 'Introduction',
      level: 2,
      order: 0,
      subordinateTextHint: brief.metaDescription
    });

    // Parse structured_outline if available
    if (brief.structured_outline && brief.structured_outline.length > 0) {
      brief.structured_outline.forEach((section, idx) => {
        sections.push({
          key: `section_${idx + 1}`,
          heading: section.heading,
          level: section.level || 2,
          order: idx + 1,
          subordinateTextHint: section.subordinate_text_hint,
          methodologyNote: section.methodology_note
        });

        // Add subsections if present
        if (section.subsections) {
          section.subsections.forEach((sub, subIdx) => {
            sections.push({
              key: `section_${idx + 1}_sub_${subIdx + 1}`,
              heading: sub.heading,
              level: 3,
              order: idx + 1 + (subIdx + 1) * 0.1,
              subordinateTextHint: sub.subordinate_text_hint
            });
          });
        }
      });
    } else {
      // Fallback: parse from outline string
      const lines = (brief.outline || '').split('\n').filter(l => l.trim());
      lines.forEach((line, idx) => {
        const match = line.match(/^(#{2,3})\s*(.+)/);
        if (match) {
          sections.push({
            key: `section_${idx + 1}`,
            heading: match[2].trim(),
            level: match[1].length,
            order: idx + 1
          });
        }
      });
    }

    // Add conclusion
    sections.push({
      key: 'conclusion',
      heading: 'Conclusion',
      level: 2,
      order: 999
    });

    return sections.sort((a, b) => a.order - b.order);
  }

  async assembleDraft(jobId: string): Promise<string> {
    const sections = await this.getSections(jobId);

    return sections
      .sort((a, b) => a.section_order - b.section_order)
      .map(s => {
        const heading = s.section_level === 2 ? `## ${s.section_heading}` : `### ${s.section_heading}`;
        return `${heading}\n\n${s.current_content || ''}`;
      })
      .join('\n\n');
  }
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/orchestrator.ts
git commit -m "feat: add ContentGenerationOrchestrator core class"
```

---

### Task 3.2: Create Pass 1 - Draft Generation

**Files:**
- Create: `services/ai/contentGeneration/passes/pass1DraftGeneration.ts`

**Step 1: Create passes directory**

```bash
mkdir -p services/ai/contentGeneration/passes
```

**Step 2: Write Pass 1**

```typescript
// services/ai/contentGeneration/passes/pass1DraftGeneration.ts
import { ContentBrief, ContentGenerationJob, SectionDefinition, BusinessInfo } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { callAIProvider } from '../../index';
import { GENERATE_SECTION_DRAFT_PROMPT } from '../../../../config/prompts';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function executePass1(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  onSectionComplete: (key: string, heading: string, current: number, total: number) => void,
  shouldAbort: () => boolean
): Promise<string> {
  // 1. Parse sections from brief
  const sections = orchestrator.parseSectionsFromBrief(brief);

  // 2. Update job with section count
  await orchestrator.updateJob(job.id, {
    total_sections: sections.length,
    status: 'in_progress',
    started_at: new Date().toISOString(),
    passes_status: { ...job.passes_status, pass_1_draft: 'in_progress' }
  });

  let completedCount = job.completed_sections || 0;

  // 3. Find where to resume (if any sections already completed)
  const existingSections = await orchestrator.getSections(job.id);
  const completedKeys = new Set(
    existingSections
      .filter(s => s.status === 'completed' && s.pass_1_content)
      .map(s => s.section_key)
  );

  // 4. Generate each section
  for (const section of sections) {
    // Check for abort
    if (shouldAbort()) {
      return '';
    }

    // Skip already completed sections
    if (completedKeys.has(section.key)) {
      continue;
    }

    // Update current section
    await orchestrator.updateJob(job.id, { current_section_key: section.key });

    // Generate with retry
    const content = await generateSectionWithRetry(
      section,
      brief,
      businessInfo,
      sections,
      3
    );

    // Save to sections table
    await orchestrator.upsertSection({
      job_id: job.id,
      section_key: section.key,
      section_heading: section.heading,
      section_order: Math.round(section.order * 10), // Convert to integer
      section_level: section.level,
      pass_1_content: content,
      current_content: content,
      current_pass: 1,
      status: 'completed'
    });

    // Update progress
    completedCount++;
    await orchestrator.updateJob(job.id, {
      completed_sections: completedCount
    });

    // Callback
    onSectionComplete(section.key, section.heading, completedCount, sections.length);

    // Small delay between sections to avoid rate limiting
    await delay(500);
  }

  // 5. Assemble full draft
  const fullDraft = await orchestrator.assembleDraft(job.id);

  // 6. Mark pass complete
  await orchestrator.updateJob(job.id, {
    draft_content: fullDraft,
    passes_status: { ...job.passes_status, pass_1_draft: 'completed' },
    current_pass: 2,
    current_section_key: null
  });

  return fullDraft;
}

async function generateSectionWithRetry(
  section: SectionDefinition,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  allSections: SectionDefinition[],
  maxRetries: number
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const prompt = GENERATE_SECTION_DRAFT_PROMPT(
        section,
        brief,
        businessInfo,
        allSections
      );

      const response = await callAIProvider(
        businessInfo.aiProvider,
        businessInfo.aiModel,
        prompt,
        businessInfo,
        800 // tokens per section
      );

      if (typeof response === 'string') {
        return response.trim();
      }

      throw new Error('AI returned non-string response');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        // Exponential backoff
        await delay(1000 * Math.pow(2, attempt - 1));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
```

**Step 3: Add prompt to config/prompts.ts**

Add at end of `config/prompts.ts`:

```typescript
export const GENERATE_SECTION_DRAFT_PROMPT = (
  section: { key: string; heading: string; level: number; subordinateTextHint?: string; methodologyNote?: string },
  brief: ContentBrief,
  info: BusinessInfo,
  allSections: { heading: string }[]
): string => `
You are an expert content writer following the Holistic SEO framework.

Write ONLY the content for this specific section. Do NOT include the heading itself - just the body text.

## Section to Write
Heading: ${section.heading}
Level: H${section.level}
${section.subordinateTextHint ? `Subordinate Text Hint: ${section.subordinateTextHint}` : ''}
${section.methodologyNote ? `Format Requirement: ${section.methodologyNote}` : ''}

## Article Context
Title: ${brief.title}
Central Entity: ${info.seedKeyword}
Meta Description: ${brief.metaDescription}
Key Takeaways: ${brief.keyTakeaways?.join(', ') || 'N/A'}

## Full Article Structure (for context)
${allSections.map((s, i) => `${i + 1}. ${s.heading}`).join('\n')}

${businessContext(info)}

## Writing Rules
1. **First Sentence Rule**: Start with a direct, responsive sentence using "is", "are", or "means"
2. **EAV Density**: Each sentence must contain an Entity-Attribute-Value triple
3. **Subject Positioning**: "${info.seedKeyword}" should be the grammatical SUBJECT where relevant
4. **No Fluff**: Avoid "also", "basically", "very", "maybe", "actually"
5. **Modality**: Use definitive verbs ("is", "are") not uncertainty ("can be", "might")
6. **Information Density**: Every sentence must add a new fact

${getStylometryInstructions(info.authorProfile)}

Write 150-300 words of content for this section. Output ONLY the prose content, no headings or metadata.
`;
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/passes/pass1DraftGeneration.ts config/prompts.ts
git commit -m "feat: add Pass 1 section-by-section draft generation"
```

---

### Task 3.3: Create Passes 2-4 (Headers, Lists, Visuals)

**Files:**
- Create: `services/ai/contentGeneration/passes/pass2Headers.ts`
- Create: `services/ai/contentGeneration/passes/pass3Lists.ts`
- Create: `services/ai/contentGeneration/passes/pass4Visuals.ts`

**Step 1: Write Pass 2 - Headers**

```typescript
// services/ai/contentGeneration/passes/pass2Headers.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { callAIProvider } from '../../index';
import { PASS_2_HEADER_OPTIMIZATION_PROMPT } from '../../../../config/prompts';

export async function executePass2(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo
): Promise<string> {
  const draft = job.draft_content || '';

  await orchestrator.updateJob(job.id, {
    passes_status: { ...job.passes_status, pass_2_headers: 'in_progress' }
  });

  const prompt = PASS_2_HEADER_OPTIMIZATION_PROMPT(draft, brief, businessInfo);

  const optimizedDraft = await callAIProvider(
    businessInfo.aiProvider,
    businessInfo.aiModel,
    prompt,
    businessInfo,
    4000
  );

  const result = typeof optimizedDraft === 'string' ? optimizedDraft : draft;

  await orchestrator.updateJob(job.id, {
    draft_content: result,
    passes_status: { ...job.passes_status, pass_2_headers: 'completed' },
    current_pass: 3
  });

  return result;
}
```

**Step 2: Write Pass 3 - Lists**

```typescript
// services/ai/contentGeneration/passes/pass3Lists.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { callAIProvider } from '../../index';
import { PASS_3_LIST_TABLE_PROMPT } from '../../../../config/prompts';

export async function executePass3(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo
): Promise<string> {
  const draft = job.draft_content || '';

  await orchestrator.updateJob(job.id, {
    passes_status: { ...job.passes_status, pass_3_lists: 'in_progress' }
  });

  const prompt = PASS_3_LIST_TABLE_PROMPT(draft, brief);

  const optimizedDraft = await callAIProvider(
    businessInfo.aiProvider,
    businessInfo.aiModel,
    prompt,
    businessInfo,
    4000
  );

  const result = typeof optimizedDraft === 'string' ? optimizedDraft : draft;

  await orchestrator.updateJob(job.id, {
    draft_content: result,
    passes_status: { ...job.passes_status, pass_3_lists: 'completed' },
    current_pass: 4
  });

  return result;
}
```

**Step 3: Write Pass 4 - Visuals**

```typescript
// services/ai/contentGeneration/passes/pass4Visuals.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { callAIProvider } from '../../index';
import { PASS_4_VISUAL_SEMANTICS_PROMPT } from '../../../../config/prompts';

export async function executePass4(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo
): Promise<string> {
  const draft = job.draft_content || '';

  await orchestrator.updateJob(job.id, {
    passes_status: { ...job.passes_status, pass_4_visuals: 'in_progress' }
  });

  const prompt = PASS_4_VISUAL_SEMANTICS_PROMPT(draft, brief, businessInfo);

  const optimizedDraft = await callAIProvider(
    businessInfo.aiProvider,
    businessInfo.aiModel,
    prompt,
    businessInfo,
    4000
  );

  const result = typeof optimizedDraft === 'string' ? optimizedDraft : draft;

  await orchestrator.updateJob(job.id, {
    draft_content: result,
    passes_status: { ...job.passes_status, pass_4_visuals: 'completed' },
    current_pass: 5
  });

  return result;
}
```

**Step 4: Add prompts to config/prompts.ts**

```typescript
export const PASS_2_HEADER_OPTIMIZATION_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor specializing in heading optimization.

## Current Draft
${draft}

## Central Entity: ${info.seedKeyword}
## Title: ${brief.title}

## Header H Rules to Apply:
1. **H1 contains Central Entity + Main Attribute** - Verify the title reflects the main topic
2. **Straight Line Flow**: H1→H2→H3 must follow logical, incremental order
3. **Contextual Overlap**: Each H2/H3 must contain terms linking back to the Central Entity
4. **No Level Skips**: Never skip from H2 to H4
5. **Heading Order**: Definition → Types → Benefits → How-to → Risks → Conclusion
6. **Query Pattern Matching**: Headings should match likely search queries

## Instructions:
1. Review all headings for hierarchy and flow
2. Ensure each heading includes a contextual term related to "${info.seedKeyword}"
3. Reorder sections if they don't follow logical flow
4. Fix any level skips
5. Make headings more specific where generic

Return the COMPLETE optimized article with all content preserved. Do not summarize or truncate.
`;

export const PASS_3_LIST_TABLE_PROMPT = (
  draft: string,
  brief: ContentBrief
): string => `
You are a Holistic SEO editor specializing in structured data optimization.

## Current Draft
${draft}

## List & Table Rules to Apply:
1. **Ordered Lists (<ol>)**: Use ONLY for rankings, steps, or superlatives ("Top 10", "How to")
2. **Unordered Lists (<ul>)**: Use for types, examples, components where order doesn't matter
3. **List Preamble**: Every list MUST be preceded by a sentence with exact count ("The 5 main types include:")
4. **Table Structure**: Columns = attributes (Price, Speed), Rows = entities
5. **One Fact Per Item**: Each list item delivers ONE unique EAV triple
6. **Instructional Lists**: Items in how-to lists start with command verbs

## Instructions:
1. Convert appropriate prose to lists where Featured Snippet opportunity exists
2. Ensure every list has a proper count preamble
3. Verify ordered vs unordered is semantically correct
4. Keep prose where it's more appropriate than lists

Return the COMPLETE optimized article. Do not summarize or truncate.
`;

export const PASS_4_VISUAL_SEMANTICS_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor specializing in visual semantics.

## Current Draft
${draft}

## Central Entity: ${info.seedKeyword}
## Title: ${brief.title}

## Visual Semantics Rules:
1. **Alt Tag Vocabulary Extension**: Alt tags must use NEW vocabulary not in H1/Title
2. **Context Bridging**: Alt text bridges the image to surrounding content
3. **No Image Between H and Text**: Never place image between heading and its subordinate text
4. **Textual Qualification**: Sentence before/after image must reference it
5. **LCP Prominence**: First major image relates directly to Central Entity

## Instructions:
Insert [IMAGE: description | alt="vocabulary-extending alt text"] placeholders where images would enhance the content. Place them:
- After the first paragraph (LCP image)
- After key definitions or explanations
- In "How-to" sections for visual steps
- NEVER immediately after a heading

Example: [IMAGE: Diagram showing contract lifecycle stages | alt="contract management workflow phases from creation to renewal"]

Return the COMPLETE article with image placeholders inserted. Do not summarize or truncate.
`;
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add services/ai/contentGeneration/passes/pass2Headers.ts \
        services/ai/contentGeneration/passes/pass3Lists.ts \
        services/ai/contentGeneration/passes/pass4Visuals.ts \
        config/prompts.ts
git commit -m "feat: add Passes 2-4 (headers, lists, visuals)"
```

---

### Task 3.4: Create Pass 5 - Micro Semantics (Major Pass)

**Files:**
- Create: `services/ai/contentGeneration/passes/pass5MicroSemantics.ts`

**Step 1: Write Pass 5**

```typescript
// services/ai/contentGeneration/passes/pass5MicroSemantics.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { callAIProvider } from '../../index';
import { PASS_5_MICRO_SEMANTICS_PROMPT } from '../../../../config/prompts';

export async function executePass5(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo
): Promise<string> {
  const draft = job.draft_content || '';

  await orchestrator.updateJob(job.id, {
    passes_status: { ...job.passes_status, pass_5_microsemantics: 'in_progress' }
  });

  const prompt = PASS_5_MICRO_SEMANTICS_PROMPT(draft, brief, businessInfo);

  const optimizedDraft = await callAIProvider(
    businessInfo.aiProvider,
    businessInfo.aiModel,
    prompt,
    businessInfo,
    4000
  );

  const result = typeof optimizedDraft === 'string' ? optimizedDraft : draft;

  await orchestrator.updateJob(job.id, {
    draft_content: result,
    passes_status: { ...job.passes_status, pass_5_microsemantics: 'completed' },
    current_pass: 6
  });

  return result;
}
```

**Step 2: Add Pass 5 prompt to config/prompts.ts**

```typescript
export const PASS_5_MICRO_SEMANTICS_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor specializing in micro-semantic optimization. This is the most comprehensive linguistic optimization pass.

## Current Draft
${draft}

## Central Entity: ${info.seedKeyword}
## Title: ${brief.title}

## MICRO SEMANTICS RULES TO APPLY:

### 1. Modality Certainty
- Replace uncertain language ("can be", "might be", "could be") with definitive verbs ("is", "are")
- Only keep uncertainty for genuinely uncertain claims backed by science
- BAD: "Water can be vital for life"
- GOOD: "Water is vital for life"

### 2. Stop Word Removal
- Remove fluff words: "also", "basically", "very", "maybe", "actually", "really", "just", "quite"
- Be ESPECIALLY strict in the first 2 paragraphs
- BAD: "It also helps with digestion"
- GOOD: "It helps digestion"

### 3. Subject Positioning
- The Central Entity ("${info.seedKeyword}") must be the grammatical SUBJECT, not object
- BAD: "Financial advisors help you achieve financial independence"
- GOOD: "Financial independence relies on sufficient savings"

### 4. Definition Structure (Is-A Hypernymy)
- Definitions must follow: "[Entity] is a [Category] that [Function]"
- BAD: "Penguins swim and don't fly"
- GOOD: "A penguin is a flightless sea bird native to the Southern Hemisphere"

### 5. Information Density
- Every sentence must add a NEW fact
- No entity repetition without new attribute
- BAD: "The Glock 19 is a gun. The Glock 19 is popular."
- GOOD: "The Glock 19 weighs 30oz. It has a 15-round capacity."

### 6. Reference Principle
- Never place links at the START of a sentence
- Make your declaration first, then cite
- BAD: "[According to research], the method works"
- GOOD: "The method works effectively, as [research confirms]"

### 7. Negative Constraints
- Add "is not" clarifications for disambiguation where helpful
- Example: "This visa is not for permanent residency"

### 8. Centerpiece Annotation
- The core answer/definition must appear in the first 400 characters of main content
- Front-load the most important information

## Instructions:
Apply ALL rules above. Go sentence by sentence if needed. This pass dramatically impacts search engine comprehension.

Return the COMPLETE optimized article. Do not summarize or truncate.
`;
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/passes/pass5MicroSemantics.ts config/prompts.ts
git commit -m "feat: add Pass 5 micro semantics optimization"
```

---

### Task 3.5: Create Passes 6-8 (Discourse, Intro, Audit)

**Files:**
- Create: `services/ai/contentGeneration/passes/pass6Discourse.ts`
- Create: `services/ai/contentGeneration/passes/pass7Introduction.ts`
- Create: `services/ai/contentGeneration/passes/pass8Audit.ts`

**Step 1: Write Pass 6 - Discourse**

```typescript
// services/ai/contentGeneration/passes/pass6Discourse.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { callAIProvider } from '../../index';
import { PASS_6_DISCOURSE_PROMPT } from '../../../../config/prompts';

export async function executePass6(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo
): Promise<string> {
  const draft = job.draft_content || '';

  await orchestrator.updateJob(job.id, {
    passes_status: { ...job.passes_status, pass_6_discourse: 'in_progress' }
  });

  const prompt = PASS_6_DISCOURSE_PROMPT(draft, brief);

  const optimizedDraft = await callAIProvider(
    businessInfo.aiProvider,
    businessInfo.aiModel,
    prompt,
    businessInfo,
    4000
  );

  const result = typeof optimizedDraft === 'string' ? optimizedDraft : draft;

  await orchestrator.updateJob(job.id, {
    draft_content: result,
    passes_status: { ...job.passes_status, pass_6_discourse: 'completed' },
    current_pass: 7
  });

  return result;
}
```

**Step 2: Write Pass 7 - Introduction**

```typescript
// services/ai/contentGeneration/passes/pass7Introduction.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { callAIProvider } from '../../index';
import { PASS_7_INTRO_SYNTHESIS_PROMPT } from '../../../../config/prompts';

export async function executePass7(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo
): Promise<string> {
  const draft = job.draft_content || '';

  await orchestrator.updateJob(job.id, {
    passes_status: { ...job.passes_status, pass_7_intro: 'in_progress' }
  });

  const prompt = PASS_7_INTRO_SYNTHESIS_PROMPT(draft, brief, businessInfo);

  const newIntro = await callAIProvider(
    businessInfo.aiProvider,
    businessInfo.aiModel,
    prompt,
    businessInfo,
    1000
  );

  // Replace the introduction section
  let result = draft;
  if (typeof newIntro === 'string') {
    // Find and replace introduction
    const introPattern = /## Introduction\n\n[\s\S]*?(?=\n## )/;
    if (introPattern.test(draft)) {
      result = draft.replace(introPattern, `## Introduction\n\n${newIntro.trim()}\n\n`);
    }
  }

  await orchestrator.updateJob(job.id, {
    draft_content: result,
    passes_status: { ...job.passes_status, pass_7_intro: 'completed' },
    current_pass: 8
  });

  return result;
}
```

**Step 3: Write Pass 8 - Audit**

```typescript
// services/ai/contentGeneration/passes/pass8Audit.ts
import { ContentBrief, ContentGenerationJob, BusinessInfo, AuditRuleResult, AuditDetails } from '../../../../types';
import { ContentGenerationOrchestrator } from '../orchestrator';
import { runAlgorithmicAudit } from './auditChecks';

export async function executePass8(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo
): Promise<{ draft: string; score: number; details: AuditDetails }> {
  const draft = job.draft_content || '';

  await orchestrator.updateJob(job.id, {
    passes_status: { ...job.passes_status, pass_8_audit: 'in_progress' }
  });

  // Run all algorithmic checks
  const algorithmicResults = runAlgorithmicAudit(draft, brief, businessInfo);

  // Calculate final score
  const passingRules = algorithmicResults.filter(r => r.isPassing).length;
  const totalRules = algorithmicResults.length;
  const finalScore = totalRules > 0 ? Math.round((passingRules / totalRules) * 100) : 0;

  const auditDetails: AuditDetails = {
    algorithmicResults,
    passingRules,
    totalRules,
    timestamp: new Date().toISOString()
  };

  await orchestrator.updateJob(job.id, {
    draft_content: draft,
    final_audit_score: finalScore,
    audit_details: auditDetails,
    passes_status: { ...job.passes_status, pass_8_audit: 'completed' },
    status: 'completed',
    completed_at: new Date().toISOString()
  });

  return { draft, score: finalScore, details: auditDetails };
}
```

**Step 4: Add prompts to config/prompts.ts**

```typescript
export const PASS_6_DISCOURSE_PROMPT = (
  draft: string,
  brief: ContentBrief
): string => `
You are a Holistic SEO editor specializing in discourse integration.

## Current Draft
${draft}

## Discourse Anchors (transition words to use)
${brief.discourse_anchors?.join(', ') || 'contextual, semantic, optimization, framework, methodology'}

## Discourse Rules:
1. **Paragraph Transitions**: End of paragraph A should hook into start of paragraph B
2. **Contextual Bridges**: Use bridge sentences when moving between sub-topics
3. **Anchor Segments**: Include mutual words (discourse anchors) at transitions
4. **Annotation Text**: Text surrounding links must explain WHY the link exists
5. **Link Micro-Context**: "For more details on **engine performance**, check our guide on [V8 Engines]"

## Instructions:
1. Add transitional sentences between major sections
2. Ensure internal links have proper annotation text
3. Use discourse anchors naturally at paragraph transitions
4. Smooth any abrupt topic changes

Return the COMPLETE article with improved flow. Do not summarize or truncate.
`;

export const PASS_7_INTRO_SYNTHESIS_PROMPT = (
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): string => `
You are a Holistic SEO editor rewriting the introduction AFTER the full article exists.

## Full Article
${draft}

## Brief Info
Title: ${brief.title}
Central Entity: ${info.seedKeyword}
Key Takeaways: ${brief.keyTakeaways?.join(', ') || 'N/A'}
Featured Snippet Target: ${brief.featured_snippet_target?.target || 'N/A'}

## Introduction Synthesis Rules:
1. **Centerpiece Annotation**: Core answer/definition in FIRST 400 characters
2. **Summary Alignment**: Synthesize all H2/H3 topics in the SAME ORDER as they appear
3. **Key Terms**: Include at least one term from each major section
4. **Featured Snippet**: Address the featured snippet target immediately
5. **No Fluff**: Maximum information density

## Instructions:
Write a NEW introduction (150-250 words) that:
1. Starts with a direct definition/answer (centerpiece annotation)
2. Previews ALL major sections in order
3. Includes key terms from each section
4. Sets reader expectations clearly

Output ONLY the introduction paragraph content. Do not include "## Introduction" heading.
`;
```

**Step 5: Create auditChecks.ts**

```typescript
// services/ai/contentGeneration/passes/auditChecks.ts
import { ContentBrief, BusinessInfo, AuditRuleResult } from '../../../../types';

export function runAlgorithmicAudit(
  draft: string,
  brief: ContentBrief,
  info: BusinessInfo
): AuditRuleResult[] {
  const results: AuditRuleResult[] = [];

  // 1. Modality Check
  results.push(checkModality(draft));

  // 2. Stop Words Check
  results.push(checkStopWords(draft));

  // 3. Subject Positioning
  results.push(checkSubjectPositioning(draft, info.seedKeyword));

  // 4. Heading Hierarchy
  results.push(checkHeadingHierarchy(draft));

  // 5. List Count Specificity
  results.push(checkListCountSpecificity(draft));

  // 6. Pronoun Density
  results.push(checkPronounDensity(draft, brief.title));

  // 7. Link Positioning
  results.push(checkLinkPositioning(draft));

  // 8. First Sentence Precision
  results.push(checkFirstSentencePrecision(draft));

  // 9. Centerpiece Annotation
  results.push(checkCenterpieceAnnotation(draft, info.seedKeyword));

  // 10. Information Density
  results.push(checkInformationDensity(draft, info.seedKeyword));

  return results;
}

function checkModality(text: string): AuditRuleResult {
  const uncertainPatterns = /\b(can be|might be|could be|may be|possibly|perhaps)\b/gi;
  const matches = text.match(uncertainPatterns) || [];

  if (matches.length > 3) {
    return {
      ruleName: 'Modality Certainty',
      isPassing: false,
      details: `Found ${matches.length} uncertain phrases. Use definitive "is/are" for facts.`,
      affectedTextSnippet: matches.slice(0, 3).join(', '),
      remediation: 'Replace "can be/might be" with "is/are" where factually appropriate.'
    };
  }
  return { ruleName: 'Modality Certainty', isPassing: true, details: 'Good use of definitive language.' };
}

function checkStopWords(text: string): AuditRuleResult {
  const fluffWords = /\b(also|basically|very|maybe|actually|really|just|quite|simply)\b/gi;
  const first500 = text.substring(0, 500);
  const matchesInIntro = first500.match(fluffWords) || [];

  if (matchesInIntro.length > 2) {
    return {
      ruleName: 'Stop Word Removal',
      isPassing: false,
      details: `Found ${matchesInIntro.length} fluff words in first 500 chars.`,
      affectedTextSnippet: matchesInIntro.join(', '),
      remediation: 'Remove "also", "basically", "very", etc. especially from introduction.'
    };
  }
  return { ruleName: 'Stop Word Removal', isPassing: true, details: 'Minimal fluff words in introduction.' };
}

function checkSubjectPositioning(text: string, centralEntity: string): AuditRuleResult {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const entityRegex = new RegExp(centralEntity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  let entityAsSubject = 0;
  let entityMentions = 0;

  sentences.forEach(sentence => {
    if (entityRegex.test(sentence)) {
      entityMentions++;
      const firstHalf = sentence.substring(0, sentence.length / 2);
      if (entityRegex.test(firstHalf)) {
        entityAsSubject++;
      }
    }
  });

  const ratio = entityMentions > 0 ? entityAsSubject / entityMentions : 1;

  if (ratio < 0.6) {
    return {
      ruleName: 'Subject Positioning',
      isPassing: false,
      details: `Entity "${centralEntity}" is subject in only ${Math.round(ratio * 100)}% of mentions.`,
      remediation: 'Rewrite sentences so the central entity is the grammatical subject.'
    };
  }
  return { ruleName: 'Subject Positioning', isPassing: true, details: 'Entity is appropriately positioned as subject.' };
}

function checkHeadingHierarchy(text: string): AuditRuleResult {
  const headings = text.match(/^#{2,4}\s+.+$/gm) || [];
  let lastLevel = 1;
  let hasSkip = false;

  headings.forEach(h => {
    const level = (h.match(/^#+/) || [''])[0].length;
    if (level > lastLevel + 1) {
      hasSkip = true;
    }
    lastLevel = level;
  });

  if (hasSkip) {
    return {
      ruleName: 'Heading Hierarchy',
      isPassing: false,
      details: 'Found heading level skips (e.g., H2 to H4).',
      remediation: 'Ensure headings follow H1→H2→H3 without skipping levels.'
    };
  }
  return { ruleName: 'Heading Hierarchy', isPassing: true, details: 'Heading levels are properly nested.' };
}

function checkListCountSpecificity(text: string): AuditRuleResult {
  const listStarts = text.match(/(?:^|\n)[-*]\s/g) || [];
  const countPreambles = text.match(/\b(\d+|three|four|five|six|seven|eight|nine|ten)\s+(main|key|primary|essential|important|types?|ways?|steps?|reasons?|benefits?|factors?)/gi) || [];

  if (listStarts.length > 5 && countPreambles.length === 0) {
    return {
      ruleName: 'List Count Specificity',
      isPassing: false,
      details: 'Lists found without count preambles.',
      remediation: 'Add preamble sentences with exact counts before lists (e.g., "The 5 main types include:").'
    };
  }
  return { ruleName: 'List Count Specificity', isPassing: true, details: 'Lists have proper count preambles.' };
}

function checkPronounDensity(text: string, topicTitle: string): AuditRuleResult {
  const pronouns = (text.match(/\b(it|they|he|she|this|that)\b/gi) || []).length;
  const wordCount = text.split(/\s+/).length;
  const ratio = wordCount > 0 ? pronouns / wordCount : 0;

  if (ratio > 0.05) {
    return {
      ruleName: 'Explicit Naming (Pronoun Density)',
      isPassing: false,
      details: `High pronoun density (${(ratio * 100).toFixed(1)}%).`,
      remediation: `Replace pronouns with explicit entity name "${topicTitle}".`
    };
  }
  return { ruleName: 'Explicit Naming (Pronoun Density)', isPassing: true, details: 'Good explicit naming.' };
}

function checkLinkPositioning(text: string): AuditRuleResult {
  const paragraphs = text.split('\n\n');
  let prematureLinks = 0;

  paragraphs.forEach(p => {
    const linkMatch = p.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch && linkMatch.index !== undefined && linkMatch.index < 20) {
      if (!p.trim().startsWith('-') && !p.trim().startsWith('*')) {
        prematureLinks++;
      }
    }
  });

  if (prematureLinks > 0) {
    return {
      ruleName: 'Link Positioning',
      isPassing: false,
      details: `Found ${prematureLinks} paragraphs starting with links.`,
      remediation: 'Move links to second or third sentence. Define concept first.'
    };
  }
  return { ruleName: 'Link Positioning', isPassing: true, details: 'Link positioning is correct.' };
}

function checkFirstSentencePrecision(text: string): AuditRuleResult {
  const sections = text.split(/\n##/);
  let badSentences = 0;

  sections.forEach(section => {
    const lines = section.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    if (lines.length > 0) {
      const firstLine = lines[0];
      if (!firstLine.startsWith('-') && !firstLine.startsWith('*') && !firstLine.startsWith('|')) {
        const firstSentence = firstLine.split('.')[0];
        const hasDefinitiveVerb = /\b(is|are|means|refers to|consists of|defines)\b/i.test(firstSentence);
        if (!hasDefinitiveVerb) {
          badSentences++;
        }
      }
    }
  });

  if (badSentences > 2) {
    return {
      ruleName: 'First Sentence Precision',
      isPassing: false,
      details: `${badSentences} sections lack definitive first sentences.`,
      remediation: 'Start each section with a direct definition using "is/are/means".'
    };
  }
  return { ruleName: 'First Sentence Precision', isPassing: true, details: 'Sections start with precise definitions.' };
}

function checkCenterpieceAnnotation(text: string, centralEntity: string): AuditRuleResult {
  const first400 = text.substring(0, 400);
  const entityRegex = new RegExp(centralEntity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const hasDefinitiveVerb = /\b(is|are|means|refers to)\b/i.test(first400);

  if (!entityRegex.test(first400) || !hasDefinitiveVerb) {
    return {
      ruleName: 'Centerpiece Annotation',
      isPassing: false,
      details: 'Core definition not in first 400 characters.',
      remediation: `Start article with direct definition of "${centralEntity}".`
    };
  }
  return { ruleName: 'Centerpiece Annotation', isPassing: true, details: 'Core answer appears early in content.' };
}

function checkInformationDensity(text: string, centralEntity: string): AuditRuleResult {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const entityRegex = new RegExp(centralEntity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

  let repetitiveCount = 0;
  let lastSentenceHadEntity = false;

  sentences.forEach(sentence => {
    const hasEntity = entityRegex.test(sentence);
    if (hasEntity && lastSentenceHadEntity) {
      // Check if this sentence adds new information
      const words = sentence.toLowerCase().split(/\s+/);
      if (words.length < 8) {
        repetitiveCount++;
      }
    }
    lastSentenceHadEntity = hasEntity;
  });

  if (repetitiveCount > 3) {
    return {
      ruleName: 'Information Density',
      isPassing: false,
      details: `${repetitiveCount} potentially repetitive entity mentions.`,
      remediation: 'Each sentence with entity should add new attribute/value.'
    };
  }
  return { ruleName: 'Information Density', isPassing: true, details: 'Good information density.' };
}
```

**Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add services/ai/contentGeneration/passes/pass6Discourse.ts \
        services/ai/contentGeneration/passes/pass7Introduction.ts \
        services/ai/contentGeneration/passes/pass8Audit.ts \
        services/ai/contentGeneration/passes/auditChecks.ts \
        config/prompts.ts
git commit -m "feat: add Passes 6-8 (discourse, intro, audit) with 10 audit rules"
```

---

### Task 3.6: Create index.ts for passes

**Files:**
- Create: `services/ai/contentGeneration/passes/index.ts`
- Create: `services/ai/contentGeneration/index.ts`

**Step 1: Write passes/index.ts**

```typescript
// services/ai/contentGeneration/passes/index.ts
export { executePass1 } from './pass1DraftGeneration';
export { executePass2 } from './pass2Headers';
export { executePass3 } from './pass3Lists';
export { executePass4 } from './pass4Visuals';
export { executePass5 } from './pass5MicroSemantics';
export { executePass6 } from './pass6Discourse';
export { executePass7 } from './pass7Introduction';
export { executePass8 } from './pass8Audit';
export { runAlgorithmicAudit } from './auditChecks';
```

**Step 2: Write contentGeneration/index.ts**

```typescript
// services/ai/contentGeneration/index.ts
export { ContentGenerationOrchestrator } from './orchestrator';
export type { OrchestratorCallbacks } from './orchestrator';
export * from './passes';
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/passes/index.ts \
        services/ai/contentGeneration/index.ts
git commit -m "feat: add index exports for content generation module"
```

---

## Phase 4: React Hook

### Task 4.1: Create useContentGeneration hook

**Files:**
- Create: `hooks/useContentGeneration.ts`

**Step 1: Write the hook**

```typescript
// hooks/useContentGeneration.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import {
  ContentGenerationJob,
  ContentGenerationSection,
  ContentBrief,
  BusinessInfo,
  PASS_NAMES
} from '../types';
import {
  ContentGenerationOrchestrator,
  executePass1,
  executePass2,
  executePass3,
  executePass4,
  executePass5,
  executePass6,
  executePass7,
  executePass8
} from '../services/ai/contentGeneration';

interface UseContentGenerationProps {
  briefId: string;
  mapId: string;
  userId: string;
  businessInfo: BusinessInfo;
  brief: ContentBrief;
  onLog: (message: string, status: 'info' | 'success' | 'failure' | 'warning') => void;
}

interface UseContentGenerationReturn {
  job: ContentGenerationJob | null;
  sections: ContentGenerationSection[];
  isGenerating: boolean;
  isPaused: boolean;
  isComplete: boolean;
  progress: number;
  currentPassName: string;
  startGeneration: () => Promise<void>;
  pauseGeneration: () => Promise<void>;
  resumeGeneration: () => Promise<void>;
  cancelGeneration: () => Promise<void>;
  error: string | null;
}

export function useContentGeneration({
  briefId,
  mapId,
  userId,
  businessInfo,
  brief,
  onLog
}: UseContentGenerationProps): UseContentGenerationReturn {
  const [job, setJob] = useState<ContentGenerationJob | null>(null);
  const [sections, setSections] = useState<ContentGenerationSection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);
  const orchestratorRef = useRef<ContentGenerationOrchestrator | null>(null);

  const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

  // Initialize orchestrator
  useEffect(() => {
    orchestratorRef.current = new ContentGenerationOrchestrator(
      businessInfo.supabaseUrl,
      businessInfo.supabaseAnonKey,
      {
        onPassStart: (num, name) => onLog(`Starting Pass ${num}: ${name}`, 'info'),
        onPassComplete: (num) => onLog(`Completed Pass ${num}`, 'success'),
        onSectionStart: (key, heading) => onLog(`Generating: ${heading}`, 'info'),
        onSectionComplete: (key) => onLog(`Section complete`, 'success'),
        onError: (err, ctx) => onLog(`Error in ${ctx}: ${err.message}`, 'failure'),
        onJobComplete: (score) => onLog(`Generation complete! Score: ${score}%`, 'success')
      }
    );
  }, [businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, onLog]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!job?.id) return;

    const jobChannel = supabase
      .channel(`job-${job.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_generation_jobs',
        filter: `id=eq.${job.id}`
      }, (payload) => {
        setJob(payload.new as ContentGenerationJob);
      })
      .subscribe();

    const sectionsChannel = supabase
      .channel(`sections-${job.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_generation_sections',
        filter: `job_id=eq.${job.id}`
      }, (payload) => {
        setSections(prev => {
          const updated = [...prev];
          const newSection = payload.new as ContentGenerationSection;
          const idx = updated.findIndex(s => s.id === newSection.id);
          if (idx >= 0) {
            updated[idx] = newSection;
          } else {
            updated.push(newSection);
          }
          return updated.sort((a, b) => a.section_order - b.section_order);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
      supabase.removeChannel(sectionsChannel);
    };
  }, [job?.id, supabase]);

  // Check for existing job on mount
  useEffect(() => {
    const checkExisting = async () => {
      if (!orchestratorRef.current) return;
      const existing = await orchestratorRef.current.getExistingJob(briefId);
      if (existing) {
        setJob(existing);
        const existingSections = await orchestratorRef.current.getSections(existing.id);
        setSections(existingSections);
      }
    };
    checkExisting();
  }, [briefId]);

  const runPasses = async (orchestrator: ContentGenerationOrchestrator, currentJob: ContentGenerationJob) => {
    let updatedJob = currentJob;
    const shouldAbort = () => abortRef.current;

    try {
      // Pass 1: Draft Generation
      if (updatedJob.current_pass === 1) {
        onLog('Pass 1: Generating draft section-by-section...', 'info');
        await executePass1(
          orchestrator,
          updatedJob,
          brief,
          businessInfo,
          (key, heading, current, total) => {
            onLog(`Section ${current}/${total}: ${heading}`, 'success');
          },
          shouldAbort
        );
        if (shouldAbort()) return;
        updatedJob = { ...updatedJob, current_pass: 2 };
      }

      // Pass 2: Headers
      if (updatedJob.current_pass === 2) {
        onLog('Pass 2: Optimizing headers...', 'info');
        await executePass2(orchestrator, updatedJob, brief, businessInfo);
        if (shouldAbort()) return;
        updatedJob = { ...updatedJob, current_pass: 3 };
      }

      // Pass 3: Lists & Tables
      if (updatedJob.current_pass === 3) {
        onLog('Pass 3: Optimizing lists and tables...', 'info');
        await executePass3(orchestrator, updatedJob, brief, businessInfo);
        if (shouldAbort()) return;
        updatedJob = { ...updatedJob, current_pass: 4 };
      }

      // Pass 4: Visuals
      if (updatedJob.current_pass === 4) {
        onLog('Pass 4: Adding visual semantics...', 'info');
        await executePass4(orchestrator, updatedJob, brief, businessInfo);
        if (shouldAbort()) return;
        updatedJob = { ...updatedJob, current_pass: 5 };
      }

      // Pass 5: Micro Semantics
      if (updatedJob.current_pass === 5) {
        onLog('Pass 5: Applying micro semantics rules...', 'info');
        await executePass5(orchestrator, updatedJob, brief, businessInfo);
        if (shouldAbort()) return;
        updatedJob = { ...updatedJob, current_pass: 6 };
      }

      // Pass 6: Discourse
      if (updatedJob.current_pass === 6) {
        onLog('Pass 6: Integrating discourse flow...', 'info');
        await executePass6(orchestrator, updatedJob, brief, businessInfo);
        if (shouldAbort()) return;
        updatedJob = { ...updatedJob, current_pass: 7 };
      }

      // Pass 7: Introduction
      if (updatedJob.current_pass === 7) {
        onLog('Pass 7: Synthesizing introduction...', 'info');
        await executePass7(orchestrator, updatedJob, brief, businessInfo);
        if (shouldAbort()) return;
        updatedJob = { ...updatedJob, current_pass: 8 };
      }

      // Pass 8: Audit
      if (updatedJob.current_pass === 8) {
        onLog('Pass 8: Running final audit...', 'info');
        const result = await executePass8(orchestrator, updatedJob, brief, businessInfo);
        onLog(`Complete! Audit score: ${result.score}%`, 'success');
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      onLog(`Error: ${message}`, 'failure');
      await orchestrator.updateJob(updatedJob.id, {
        status: 'failed',
        last_error: message
      });
    }
  };

  const startGeneration = useCallback(async () => {
    if (!orchestratorRef.current) return;
    abortRef.current = false;
    setError(null);

    try {
      const newJob = await orchestratorRef.current.createJob(briefId, mapId, userId);
      setJob(newJob);
      await runPasses(orchestratorRef.current, newJob);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start';
      setError(message);
      onLog(message, 'failure');
    }
  }, [briefId, mapId, userId, brief, businessInfo, onLog]);

  const pauseGeneration = useCallback(async () => {
    if (!orchestratorRef.current || !job) return;
    abortRef.current = true;
    await orchestratorRef.current.pauseJob(job.id);
    onLog('Generation paused', 'info');
  }, [job, onLog]);

  const resumeGeneration = useCallback(async () => {
    if (!orchestratorRef.current || !job) return;
    abortRef.current = false;
    setError(null);

    await orchestratorRef.current.updateJob(job.id, { status: 'in_progress' });
    const updatedJob = { ...job, status: 'in_progress' as const };
    setJob(updatedJob);

    onLog('Resuming generation...', 'info');
    await runPasses(orchestratorRef.current, updatedJob);
  }, [job, brief, businessInfo, onLog]);

  const cancelGeneration = useCallback(async () => {
    if (!orchestratorRef.current || !job) return;
    abortRef.current = true;
    await orchestratorRef.current.cancelJob(job.id);
    setJob(null);
    setSections([]);
    onLog('Generation cancelled', 'info');
  }, [job, onLog]);

  const progress = job ? orchestratorRef.current?.calculateProgress(job) || 0 : 0;
  const currentPassName = job ? PASS_NAMES[job.current_pass] || 'Unknown' : '';

  return {
    job,
    sections,
    isGenerating: job?.status === 'in_progress',
    isPaused: job?.status === 'paused',
    isComplete: job?.status === 'completed',
    progress,
    currentPassName,
    startGeneration,
    pauseGeneration,
    resumeGeneration,
    cancelGeneration,
    error
  };
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add hooks/useContentGeneration.ts
git commit -m "feat: add useContentGeneration hook with realtime updates"
```

---

## Phase 5: UI Components

### Task 5.1: Create ContentGenerationProgress component

**Files:**
- Create: `components/ContentGenerationProgress.tsx`

**Step 1: Write the component**

```typescript
// components/ContentGenerationProgress.tsx
import React from 'react';
import { ContentGenerationJob, ContentGenerationSection, PASS_NAMES, PassesStatus } from '../types';

interface ContentGenerationProgressProps {
  job: ContentGenerationJob;
  sections: ContentGenerationSection[];
  progress: number;
  currentPassName: string;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

const CheckIcon = () => (
  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-4 h-4 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const CircleIcon = () => (
  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
  </svg>
);

const getPassStatus = (job: ContentGenerationJob, passNum: number): 'completed' | 'in_progress' | 'pending' => {
  const passKeys: (keyof PassesStatus)[] = [
    'pass_1_draft', 'pass_2_headers', 'pass_3_lists', 'pass_4_visuals',
    'pass_5_microsemantics', 'pass_6_discourse', 'pass_7_intro', 'pass_8_audit'
  ];
  const key = passKeys[passNum - 1];
  return job.passes_status[key] || 'pending';
};

export const ContentGenerationProgress: React.FC<ContentGenerationProgressProps> = ({
  job,
  sections,
  progress,
  currentPassName,
  onPause,
  onResume,
  onCancel
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-white">
        Generating Article Draft
      </h3>

      {/* Overall Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1 text-gray-300">
          <span>Pass {job.current_pass} of 8: {currentPassName}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Pass 1 Section Progress */}
      {job.current_pass === 1 && sections.length > 0 && (
        <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
          <p className="text-sm text-gray-400 mb-2">
            Section {job.completed_sections || 0} of {job.total_sections || '?'}
          </p>
          {sections.map((section) => (
            <div key={section.section_key} className="flex items-center gap-2 text-sm">
              {section.status === 'completed' ? (
                <CheckIcon />
              ) : section.section_key === job.current_section_key ? (
                <SpinnerIcon />
              ) : (
                <CircleIcon />
              )}
              <span className={section.status === 'completed' ? 'text-gray-400' : 'text-gray-200'}>
                {section.section_heading || section.section_key}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pass List */}
      <div className="space-y-1 mb-4">
        {Object.entries(PASS_NAMES).map(([num, name]) => {
          const passNum = parseInt(num);
          const status = getPassStatus(job, passNum);
          return (
            <div key={num} className="flex items-center gap-2 text-sm">
              {status === 'completed' ? (
                <CheckIcon />
              ) : status === 'in_progress' ? (
                <SpinnerIcon />
              ) : (
                <CircleIcon />
              )}
              <span className={status === 'completed' ? 'text-gray-400' : 'text-gray-200'}>
                Pass {num}: {name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error Display */}
      {job.last_error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-sm text-red-300">
          {job.last_error}
        </div>
      )}

      {/* Audit Score */}
      {job.status === 'completed' && job.final_audit_score !== null && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded">
          <p className="text-green-300 font-semibold">
            Audit Score: {job.final_audit_score}%
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {job.status === 'in_progress' && (
          <button
            onClick={onPause}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
          >
            Pause
          </button>
        )}
        {job.status === 'paused' && (
          <button
            onClick={onResume}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            Resume
          </button>
        )}
        {(job.status === 'in_progress' || job.status === 'paused') && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default ContentGenerationProgress;
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add components/ContentGenerationProgress.tsx
git commit -m "feat: add ContentGenerationProgress UI component"
```

---

### Task 5.2: Integrate into ContentBriefModal

**Files:**
- Modify: `components/ContentBriefModal.tsx`

**Step 1: Update ContentBriefModal to use new system**

This task requires reading the existing file and integrating the new hook and progress component. The integration involves:

1. Import `useContentGeneration` hook
2. Import `ContentGenerationProgress` component
3. Replace single-shot draft generation with multi-pass system
4. Show progress UI during generation

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Test locally**

Run: `npm run dev`
- Navigate to a content brief
- Click "Generate Draft"
- Verify progress UI appears
- Verify sections generate one by one

**Step 4: Commit**

```bash
git add components/ContentBriefModal.tsx
git commit -m "feat: integrate multi-pass generation into ContentBriefModal"
```

---

## Phase 6: Testing

### Task 6.1: Test the complete flow

**Step 1: Push migrations**

Run: `npx supabase db push`
Expected: Tables created

**Step 2: Start dev server**

Run: `npm run dev`
Expected: Server starts on localhost:5173

**Step 3: Test generation flow**

1. Login to application
2. Select a project with a topical map
3. Open a topic and generate a content brief
4. Click "Generate Draft"
5. Verify:
   - Progress UI shows
   - Sections generate one by one
   - All 8 passes complete
   - Audit score displays
   - Draft content saved

**Step 4: Test pause/resume**

1. Start a generation
2. Click Pause during Pass 3
3. Refresh the page
4. Verify job state persisted
5. Click Resume
6. Verify generation continues from Pass 3

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during testing"
```

---

## Phase 7: Final Cleanup

### Task 7.1: Update exports and documentation

**Files:**
- Modify: `services/ai/index.ts` - Add contentGeneration export
- Update: `CLAUDE.md` - Document new system

**Step 1: Update services/ai/index.ts**

Add: `export * from './contentGeneration';`

**Step 2: Update CLAUDE.md**

Add section about multi-pass content generation system.

**Step 3: Final build verification**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "docs: update exports and documentation for multi-pass system"
```

---

## Summary

This implementation plan covers:

- **Phase 1**: Database schema (2 tables with RLS and Realtime)
- **Phase 2**: TypeScript types for jobs and sections
- **Phase 3**: Core orchestrator and 8 pass implementations
- **Phase 4**: React hook with Realtime subscriptions
- **Phase 5**: Progress UI component
- **Phase 6**: End-to-end testing
- **Phase 7**: Final cleanup

**Total Tasks**: 16 main tasks with ~50 individual steps
**Estimated Implementation Time**: 4-6 focused hours

**Key Features Delivered**:
- Section-by-section generation (avoids timeout)
- 8-pass optimization workflow
- 10 algorithmic audit rules
- Pause/Resume/Cancel capability
- Live progress via Supabase Realtime
- Resume from any interruption point
