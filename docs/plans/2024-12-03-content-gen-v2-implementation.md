# Content Generation V2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a human-first, priority-based content generation system with user control over prompts, pass execution, and version management.

**Architecture:** Multi-pass generation with user-configurable priorities (readability, conversion, SEO, density). Each pass stores a version enabling revert. Brief compliance service auto-suggests missing fields. Prompts customizable via simple/advanced UI.

**Tech Stack:** React 18, TypeScript, Supabase (PostgreSQL + Edge Functions), TailwindCSS

---

## Pre-requisites (Already Completed)

- [x] Database migration: `supabase/migrations/20251203000000_content_gen_v2.sql`
- [x] TypeScript types: `types/contentGeneration.ts`
- [x] Types export: `types.ts` updated

---

## Task 1: Brief Compliance Service - Core Structure

**Files:**
- Create: `services/briefComplianceService.ts`
- Test: `services/__tests__/briefComplianceService.test.ts`

**Step 1: Write the failing test for methodology inference**

```typescript
// services/__tests__/briefComplianceService.test.ts
import { describe, it, expect } from 'vitest';
import { BriefComplianceService } from '../briefComplianceService';

describe('BriefComplianceService', () => {
  const service = new BriefComplianceService();

  describe('inferMethodology', () => {
    it('returns ordered_list for "how to" headings', () => {
      const result = service.inferMethodology({ heading: 'How to Install Software' });
      expect(result).toBe('ordered_list');
    });

    it('returns unordered_list for "benefits of" headings', () => {
      const result = service.inferMethodology({ heading: 'Benefits of Cloud Computing' });
      expect(result).toBe('unordered_list');
    });

    it('returns comparison_table for "vs" headings', () => {
      const result = service.inferMethodology({ heading: 'AWS vs Azure Comparison' });
      expect(result).toBe('comparison_table');
    });

    it('returns definition_prose for "what is" headings', () => {
      const result = service.inferMethodology({ heading: 'What is Machine Learning?' });
      expect(result).toBe('definition_prose');
    });

    it('returns prose for generic headings', () => {
      const result = service.inferMethodology({ heading: 'Understanding the Basics' });
      expect(result).toBe('prose');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/__tests__/briefComplianceService.test.ts`
Expected: FAIL with "Cannot find module '../briefComplianceService'"

**Step 3: Write minimal implementation**

```typescript
// services/briefComplianceService.ts
import { ContentBrief, BusinessInfo, EnrichedTopic, BriefSection } from '../types';
import {
  BriefComplianceCheck,
  MissingField,
  AutoSuggestion,
  FeaturedSnippetTarget
} from '../types/contentGeneration';

type Methodology = 'ordered_list' | 'unordered_list' | 'comparison_table' | 'definition_prose' | 'prose';

export class BriefComplianceService {
  /**
   * Infer methodology (list/table/prose) from heading pattern
   */
  inferMethodology(section: { heading: string }): Methodology {
    const heading = section.heading.toLowerCase();

    // Ordered list patterns
    if (/^(how to|steps to|guide to|\d+\s+(ways|steps|tips|methods))/i.test(heading)) {
      return 'ordered_list';
    }

    // Unordered list patterns
    if (/^(types of|benefits of|advantages|features|characteristics)/i.test(heading)) {
      return 'unordered_list';
    }

    // Table patterns
    if (/^(comparison|vs\.?|versus|differences between|pricing)/i.test(heading)) {
      return 'comparison_table';
    }

    // Definition patterns
    if (/^(what is|definition|meaning of|understanding)/i.test(heading)) {
      return 'definition_prose';
    }

    return 'prose';
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/__tests__/briefComplianceService.test.ts`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add services/briefComplianceService.ts services/__tests__/briefComplianceService.test.ts
git commit -m "feat(brief-compliance): add methodology inference from heading patterns"
```

---

## Task 2: Brief Compliance Service - Subordinate Text Hints

**Files:**
- Modify: `services/briefComplianceService.ts`
- Modify: `services/__tests__/briefComplianceService.test.ts`

**Step 1: Write the failing test for subordinate text hint generation**

```typescript
// Add to services/__tests__/briefComplianceService.test.ts
describe('generateSubordinateTextHint', () => {
  it('returns definition hint for "what is" headings', () => {
    const result = service.generateSubordinateTextHint(
      { heading: 'What is Cloud Computing?' },
      { targetKeyword: 'cloud computing' } as any
    );
    expect(result).toContain('Define');
    expect(result).toContain('is-a');
  });

  it('returns action hint for "how to" headings', () => {
    const result = service.generateSubordinateTextHint(
      { heading: 'How to Deploy Applications' },
      { targetKeyword: 'deploy' } as any
    );
    expect(result).toContain('action verb');
  });

  it('returns reason hint for "why" headings', () => {
    const result = service.generateSubordinateTextHint(
      { heading: 'Why Use Containers?' },
      { targetKeyword: 'containers' } as any
    );
    expect(result).toContain('reason');
  });

  it('returns count hint for "benefits" headings', () => {
    const result = service.generateSubordinateTextHint(
      { heading: 'Benefits of Automation' },
      { targetKeyword: 'automation' } as any
    );
    expect(result).toContain('number');
    expect(result).toContain('benefits');
  });

  it('returns default hint for generic headings', () => {
    const result = service.generateSubordinateTextHint(
      { heading: 'Advanced Techniques' },
      { targetKeyword: 'techniques' } as any
    );
    expect(result).toContain('Directly answer');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/__tests__/briefComplianceService.test.ts`
Expected: FAIL with "generateSubordinateTextHint is not a function"

**Step 3: Add implementation**

```typescript
// Add to services/briefComplianceService.ts
/**
 * Generate subordinate text hint for a section based on heading pattern
 */
generateSubordinateTextHint(
  section: { heading: string },
  brief: { targetKeyword?: string }
): string {
  const heading = section.heading;
  const keyword = brief.targetKeyword || 'the topic';

  // Pattern matching for common heading types
  if (/^what (is|are)/i.test(heading)) {
    return `Define ${keyword} clearly using the "is-a" structure: "[Entity] is a [category] that [function]"`;
  }

  if (/^how to/i.test(heading)) {
    return `Start with the key action verb. State the primary method in one sentence.`;
  }

  if (/^why/i.test(heading)) {
    return `State the primary reason directly. Use "because" or causative language.`;
  }

  if (/^(benefits|advantages)/i.test(heading)) {
    return `State the number of benefits and the primary benefit first: "The X main benefits include [primary benefit], which..."`;
  }

  if (/^(types|kinds|categories)/i.test(heading)) {
    return `State the exact count: "There are X types of ${keyword}:" followed by the list.`;
  }

  // Default
  return `Directly answer the question implied by "${heading}" in the first sentence. Be definitive, not vague.`;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/__tests__/briefComplianceService.test.ts`
Expected: PASS (10 tests)

**Step 5: Commit**

```bash
git add services/briefComplianceService.ts services/__tests__/briefComplianceService.test.ts
git commit -m "feat(brief-compliance): add subordinate text hint generation"
```

---

## Task 3: Brief Compliance Service - Featured Snippet Inference

**Files:**
- Modify: `services/briefComplianceService.ts`
- Modify: `services/__tests__/briefComplianceService.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to services/__tests__/briefComplianceService.test.ts
describe('inferFeaturedSnippetTarget', () => {
  it('returns paragraph type for "what is" titles', () => {
    const result = service.inferFeaturedSnippetTarget({
      title: 'What is Docker?',
      targetKeyword: 'docker'
    } as any);
    expect(result?.type).toBe('paragraph');
    expect(result?.maxLength).toBe(50);
  });

  it('returns ordered_list for "how to" titles', () => {
    const result = service.inferFeaturedSnippetTarget({
      title: 'How to Install Docker',
      targetKeyword: 'docker'
    } as any);
    expect(result?.type).toBe('ordered_list');
    expect(result?.maxItems).toBe(8);
  });

  it('returns table for comparison titles', () => {
    const result = service.inferFeaturedSnippetTarget({
      title: 'Docker vs Kubernetes Comparison',
      targetKeyword: 'docker'
    } as any);
    expect(result?.type).toBe('table');
  });

  it('returns null for generic titles', () => {
    const result = service.inferFeaturedSnippetTarget({
      title: 'Advanced Docker Techniques',
      targetKeyword: 'docker'
    } as any);
    expect(result).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/__tests__/briefComplianceService.test.ts`
Expected: FAIL with "inferFeaturedSnippetTarget is not a function"

**Step 3: Add implementation**

```typescript
// Add to services/briefComplianceService.ts
/**
 * Infer featured snippet target from brief data
 */
inferFeaturedSnippetTarget(brief: { title: string; targetKeyword?: string }): FeaturedSnippetTarget | null {
  const title = brief.title.toLowerCase();

  // Definition snippet
  if (/^what (is|are)/i.test(title)) {
    return {
      type: 'paragraph',
      target: brief.title,
      format: 'Under 50 words definition starting with "[Entity] is..."',
      maxLength: 50
    };
  }

  // List snippet
  if (/^(how to|steps|guide|\d+\s+(ways|tips|methods))/i.test(title)) {
    return {
      type: 'ordered_list',
      target: brief.title,
      format: 'Numbered steps, each starting with action verb',
      maxItems: 8
    };
  }

  // Table snippet
  if (/^(comparison|vs|best|top \d+)/i.test(title)) {
    return {
      type: 'table',
      target: brief.title,
      format: 'Comparison table with clear column headers'
    };
  }

  return null;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/__tests__/briefComplianceService.test.ts`
Expected: PASS (14 tests)

**Step 5: Commit**

```bash
git add services/briefComplianceService.ts services/__tests__/briefComplianceService.test.ts
git commit -m "feat(brief-compliance): add featured snippet target inference"
```

---

## Task 4: Brief Compliance Service - Full Compliance Check

**Files:**
- Modify: `services/briefComplianceService.ts`
- Modify: `services/__tests__/briefComplianceService.test.ts`

**Step 1: Write the failing test**

```typescript
// Add to services/__tests__/briefComplianceService.test.ts
describe('checkBriefCompliance', () => {
  it('identifies missing structured_outline as critical', async () => {
    const result = await service.checkBriefCompliance(
      { title: 'Test', outline: '## Section 1\n## Section 2' } as any,
      { seedKeyword: 'test' } as any,
      []
    );
    expect(result.hasStructuredOutline).toBe(false);
    expect(result.missingFields.some(f => f.field === 'structured_outline' && f.importance === 'critical')).toBe(true);
  });

  it('identifies missing subordinate text hints as high importance', async () => {
    const result = await service.checkBriefCompliance(
      {
        title: 'Test',
        structured_outline: [
          { heading: 'Section 1' },
          { heading: 'Section 2', subordinate_text_hint: 'hint' }
        ]
      } as any,
      { seedKeyword: 'test' } as any,
      []
    );
    expect(result.hasSubordinateTextHints).toBe(false);
    expect(result.missingFields.some(f => f.field === 'subordinate_text_hints')).toBe(true);
  });

  it('calculates compliance score based on missing fields', async () => {
    const result = await service.checkBriefCompliance(
      {
        title: 'Test',
        structured_outline: [{ heading: 'Section', subordinate_text_hint: 'hint' }],
        serpAnalysis: { peopleAlsoAsk: ['question'] },
        contextualBridge: [{ targetTopic: 'link', anchorText: 'anchor' }]
      } as any,
      { seedKeyword: 'test', audience: 'developers' } as any,
      []
    );
    expect(result.score).toBeGreaterThan(50);
  });

  it('generates auto-suggestions for missing fields', async () => {
    const result = await service.checkBriefCompliance(
      {
        title: 'What is Docker?',
        outline: '## What is Docker\n## Benefits'
      } as any,
      { seedKeyword: 'docker' } as any,
      []
    );
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions.some(s => s.field === 'featured_snippet_target')).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/__tests__/briefComplianceService.test.ts`
Expected: FAIL with "checkBriefCompliance is not a function"

**Step 3: Add implementation**

```typescript
// Add to services/briefComplianceService.ts
/**
 * Check brief completeness and return missing fields with suggestions
 */
async checkBriefCompliance(
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  topics: EnrichedTopic[]
): Promise<BriefComplianceCheck> {
  const missingFields: MissingField[] = [];
  const suggestions: AutoSuggestion[] = [];

  // Check structured outline
  const hasStructuredOutline = !!brief.structured_outline?.length;
  if (!hasStructuredOutline) {
    missingFields.push({
      field: 'structured_outline',
      importance: 'critical',
      description: 'Structured outline with subordinate text hints required for quality content',
      canAutoGenerate: true
    });

    // Generate suggestion from markdown outline if available
    if (brief.outline) {
      const parsedOutline = this.parseOutlineToStructured(brief.outline);
      suggestions.push({
        field: 'structured_outline',
        suggestedValue: parsedOutline,
        confidence: 0.8,
        source: 'Parsed from markdown outline'
      });
    }
  }

  // Check subordinate text hints
  let hasSubordinateTextHints = false;
  if (brief.structured_outline?.length) {
    const missingSubs = brief.structured_outline.filter(s => !s.subordinate_text_hint);
    hasSubordinateTextHints = missingSubs.length === 0;

    if (missingSubs.length > 0) {
      missingFields.push({
        field: 'subordinate_text_hints',
        importance: 'high',
        description: `${missingSubs.length} sections missing subordinate text hints`,
        canAutoGenerate: true
      });

      // Generate hints for each missing section
      for (const section of missingSubs) {
        const hint = this.generateSubordinateTextHint(section, brief);
        suggestions.push({
          field: `subordinate_text_hint:${section.heading}`,
          suggestedValue: hint,
          confidence: 0.7,
          source: 'AI-generated based on heading and context'
        });
      }
    }
  }

  // Check featured snippet target
  const hasFeaturedSnippetTarget = !!brief.featured_snippet_target;
  if (!hasFeaturedSnippetTarget) {
    missingFields.push({
      field: 'featured_snippet_target',
      importance: 'medium',
      description: 'No featured snippet target defined',
      canAutoGenerate: true
    });

    const fsTarget = this.inferFeaturedSnippetTarget(brief);
    if (fsTarget) {
      suggestions.push({
        field: 'featured_snippet_target',
        suggestedValue: fsTarget,
        confidence: 0.6,
        source: 'Inferred from title pattern and SERP analysis'
      });
    }
  }

  // Check contextual bridge (internal linking)
  const hasContextualBridge = this.hasContextualBridge(brief);
  if (!hasContextualBridge) {
    missingFields.push({
      field: 'contextualBridge',
      importance: 'high',
      description: 'No internal linking plan defined',
      canAutoGenerate: true
    });
  }

  // Check SERP analysis
  const hasSerpAnalysis = !!brief.serpAnalysis?.peopleAlsoAsk?.length;

  // Check business fields
  const hasBusinessGoal = !!businessInfo.conversionGoal;
  const hasCTA = !!brief.cta;
  const hasTargetAudience = !!businessInfo.audience;
  const hasMethodologyNotes = brief.structured_outline?.some(s => s.methodology_note) || false;
  const hasDiscourseAnchors = !!brief.discourse_anchors?.length;

  // Calculate score
  const score = this.calculateComplianceScore(missingFields);

  return {
    hasStructuredOutline,
    hasSubordinateTextHints,
    hasMethodologyNotes,
    hasSerpAnalysis,
    hasFeaturedSnippetTarget,
    hasContextualBridge,
    hasDiscourseAnchors,
    hasBusinessGoal,
    hasCTA,
    hasTargetAudience,
    score,
    missingFields,
    suggestions
  };
}

/**
 * Check if brief has contextual bridge links
 */
private hasContextualBridge(brief: ContentBrief): boolean {
  if (!brief.contextualBridge) return false;
  if (Array.isArray(brief.contextualBridge)) {
    return brief.contextualBridge.length > 0;
  }
  return !!brief.contextualBridge.links?.length;
}

/**
 * Parse markdown outline to structured format
 */
private parseOutlineToStructured(outline: string): BriefSection[] {
  const lines = outline.split('\n').filter(line => line.trim().startsWith('#'));
  return lines.map((line, index) => {
    const level = (line.match(/^#+/) || ['##'])[0].length;
    const heading = line.replace(/^#+\s*/, '').trim();
    return {
      key: `section-${index}`,
      heading,
      level,
      order: index
    };
  });
}

/**
 * Calculate compliance score based on missing fields
 */
private calculateComplianceScore(missingFields: MissingField[]): number {
  const weights: Record<string, number> = {
    critical: 30,
    high: 20,
    medium: 10,
    low: 5
  };

  let penalty = 0;
  for (const field of missingFields) {
    penalty += weights[field.importance] || 5;
  }

  return Math.max(0, 100 - penalty);
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/__tests__/briefComplianceService.test.ts`
Expected: PASS (18 tests)

**Step 5: Commit**

```bash
git add services/briefComplianceService.ts services/__tests__/briefComplianceService.test.ts
git commit -m "feat(brief-compliance): add full compliance check with auto-suggestions"
```

---

## Task 5: Settings Service - CRUD Operations

**Files:**
- Create: `services/contentGenerationSettingsService.ts`
- Test: `services/__tests__/contentGenerationSettingsService.test.ts`

**Step 1: Write the failing test**

```typescript
// services/__tests__/contentGenerationSettingsService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentGenerationSettingsService } from '../contentGenerationSettingsService';
import { DEFAULT_CONTENT_GENERATION_SETTINGS, PRIORITY_PRESETS } from '../../types/contentGeneration';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  single: vi.fn()
};

describe('ContentGenerationSettingsService', () => {
  let service: ContentGenerationSettingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContentGenerationSettingsService(mockSupabase as any);
  });

  describe('getDefaultSettings', () => {
    it('returns default settings when none exist', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      const result = await service.getOrCreateDefaultSettings('user-123');

      expect(result.priorities).toEqual(PRIORITY_PRESETS.balanced);
      expect(result.tone).toBe('professional');
    });

    it('returns existing settings when they exist', async () => {
      const existingSettings = {
        id: 'settings-1',
        user_id: 'user-123',
        priority_human_readability: 50,
        priority_business_conversion: 30,
        priority_machine_optimization: 15,
        priority_factual_density: 5,
        tone: 'conversational',
        audience_expertise: 'expert',
        pass_config: { checkpoint_after_pass_1: true, passes: {} }
      };
      mockSupabase.single.mockResolvedValue({ data: existingSettings, error: null });

      const result = await service.getOrCreateDefaultSettings('user-123');

      expect(result.priorities.humanReadability).toBe(50);
      expect(result.tone).toBe('conversational');
    });
  });

  describe('applyPreset', () => {
    it('applies preset priorities to settings', () => {
      const settings = { ...DEFAULT_CONTENT_GENERATION_SETTINGS, userId: 'user-123' };

      const result = service.applyPreset(settings as any, 'seo_focused');

      expect(result.priorities).toEqual(PRIORITY_PRESETS.seo_focused);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/__tests__/contentGenerationSettingsService.test.ts`
Expected: FAIL with "Cannot find module '../contentGenerationSettingsService'"

**Step 3: Write implementation**

```typescript
// services/contentGenerationSettingsService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import {
  ContentGenerationSettings,
  ContentGenerationSettingsRow,
  ContentGenerationPriorities,
  PRIORITY_PRESETS,
  DEFAULT_CONTENT_GENERATION_SETTINGS,
  settingsRowToInterface,
  settingsToDbInsert
} from '../types/contentGeneration';

export class ContentGenerationSettingsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get or create default settings for a user
   */
  async getOrCreateDefaultSettings(userId: string): Promise<ContentGenerationSettings> {
    // Try to get existing default settings
    const { data: existing, error } = await this.supabase
      .from('content_generation_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .is('map_id', null)
      .single();

    if (existing && !error) {
      return settingsRowToInterface(existing as ContentGenerationSettingsRow);
    }

    // Create default settings
    const newSettings = {
      ...DEFAULT_CONTENT_GENERATION_SETTINGS,
      userId
    };

    const { data: created, error: createError } = await this.supabase
      .from('content_generation_settings')
      .insert(settingsToDbInsert(newSettings))
      .select()
      .single();

    if (createError || !created) {
      // Return in-memory defaults if DB fails
      return {
        ...DEFAULT_CONTENT_GENERATION_SETTINGS,
        id: 'default',
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as ContentGenerationSettings;
    }

    return settingsRowToInterface(created as ContentGenerationSettingsRow);
  }

  /**
   * Get settings for a specific map (or fall back to user defaults)
   */
  async getSettingsForMap(userId: string, mapId: string): Promise<ContentGenerationSettings> {
    // Try map-specific settings first
    const { data: mapSettings } = await this.supabase
      .from('content_generation_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('map_id', mapId)
      .single();

    if (mapSettings) {
      return settingsRowToInterface(mapSettings as ContentGenerationSettingsRow);
    }

    // Fall back to user defaults
    return this.getOrCreateDefaultSettings(userId);
  }

  /**
   * Save settings
   */
  async saveSettings(settings: ContentGenerationSettings): Promise<ContentGenerationSettings> {
    const dbData = settingsToDbInsert(settings);

    const { data, error } = await this.supabase
      .from('content_generation_settings')
      .update(dbData)
      .eq('id', settings.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to save settings: ${error?.message}`);
    }

    return settingsRowToInterface(data as ContentGenerationSettingsRow);
  }

  /**
   * Apply a preset to settings
   */
  applyPreset(
    settings: ContentGenerationSettings,
    presetKey: keyof typeof PRIORITY_PRESETS
  ): ContentGenerationSettings {
    return {
      ...settings,
      priorities: { ...PRIORITY_PRESETS[presetKey] }
    };
  }

  /**
   * Get all presets
   */
  getPresets(): Record<string, ContentGenerationPriorities> {
    return PRIORITY_PRESETS;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/__tests__/contentGenerationSettingsService.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add services/contentGenerationSettingsService.ts services/__tests__/contentGenerationSettingsService.test.ts
git commit -m "feat(settings): add content generation settings service with CRUD"
```

---

## Task 6: Prompt Builder - Core Structure

**Files:**
- Create: `config/contentPrompts/index.ts`
- Create: `config/contentPrompts/sectionPrompt.ts`
- Test: `config/contentPrompts/__tests__/sectionPrompt.test.ts`

**Step 1: Write the failing test**

```typescript
// config/contentPrompts/__tests__/sectionPrompt.test.ts
import { describe, it, expect } from 'vitest';
import { buildSectionPrompt } from '../sectionPrompt';
import { PRIORITY_PRESETS, DEFAULT_CONTENT_GENERATION_SETTINGS } from '../../../types/contentGeneration';

describe('buildSectionPrompt', () => {
  const mockContext = {
    section: {
      key: 'section-1',
      heading: 'What is Cloud Computing?',
      level: 2,
      order: 0,
      subordinateTextHint: 'Define cloud computing using is-a structure'
    },
    brief: {
      title: 'Cloud Computing Guide',
      targetKeyword: 'cloud computing',
      metaDescription: 'Complete guide to cloud computing',
      keyTakeaways: ['scalability', 'cost savings'],
      serpAnalysis: { peopleAlsoAsk: ['Is cloud computing safe?'] }
    },
    businessInfo: {
      seedKeyword: 'cloud computing',
      language: 'English',
      targetMarket: 'Global',
      industry: 'Technology'
    },
    settings: {
      ...DEFAULT_CONTENT_GENERATION_SETTINGS,
      id: 'test',
      userId: 'user-1',
      createdAt: '',
      updatedAt: ''
    },
    allSections: [{ key: 'section-1', heading: 'What is Cloud Computing?', level: 2, order: 0 }]
  };

  it('includes the section heading in prompt', () => {
    const prompt = buildSectionPrompt(mockContext as any);
    expect(prompt).toContain('What is Cloud Computing?');
  });

  it('includes subordinate text hint when provided', () => {
    const prompt = buildSectionPrompt(mockContext as any);
    expect(prompt).toContain('Define cloud computing');
  });

  it('includes language requirement', () => {
    const prompt = buildSectionPrompt(mockContext as any);
    expect(prompt).toContain('English');
  });

  it('includes priority instructions based on settings', () => {
    const prompt = buildSectionPrompt(mockContext as any);
    expect(prompt).toContain('Human Readability');
  });

  it('includes SERP data when available', () => {
    const prompt = buildSectionPrompt(mockContext as any);
    expect(prompt).toContain('Is cloud computing safe?');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run config/contentPrompts/__tests__/sectionPrompt.test.ts`
Expected: FAIL with "Cannot find module '../sectionPrompt'"

**Step 3: Write implementation**

```typescript
// config/contentPrompts/sectionPrompt.ts
import { ContentGenerationSettings, ContentGenerationPriorities } from '../../types/contentGeneration';
import { ContentBrief, BusinessInfo, BriefSection } from '../../types';

export interface SectionDefinition {
  key: string;
  heading: string;
  level: number;
  order: number;
  subordinateTextHint?: string;
  methodologyNote?: string;
}

export interface GeneratedSection {
  key: string;
  heading: string;
  content: string;
}

export interface PromptContext {
  section: SectionDefinition;
  brief: Partial<ContentBrief>;
  businessInfo: Partial<BusinessInfo>;
  settings: ContentGenerationSettings;
  allSections: SectionDefinition[];
  previousSections?: GeneratedSection[];
}

export function buildSectionPrompt(ctx: PromptContext): string {
  const { section, brief, businessInfo, settings, allSections, previousSections } = ctx;
  const { priorities, tone, audienceExpertise } = settings;

  return `
# CONTENT GENERATION TASK

You are an expert content writer creating a section for an article about "${brief.title || 'the topic'}".

## YOUR WRITING PRIORITIES (Follow this balance)

${buildPriorityInstructions(priorities)}

## SECTION DETAILS

**Section Heading:** ${section.heading}
**Heading Level:** H${section.level}
**Position in Article:** Section ${section.order + 1} of ${allSections.length}

## CRITICAL: FIRST SENTENCE RULE (Subordinate Text)

${section.subordinateTextHint ? `
YOUR FIRST SENTENCE MUST: ${section.subordinateTextHint}

This is the "Candidate Answer Passage" - the sentence search engines will extract for Featured Snippets.
Make it definitive, factual, and directly responsive to the heading.
` : `
Start with a direct, informative sentence that answers the question implied by the heading.
`}

## CONTENT FORMAT REQUIREMENT

${buildMethodologyInstructions(section, brief)}

## LANGUAGE & TONE

- **Language:** ${businessInfo.language || 'English'}
- **Target Market:** ${businessInfo.targetMarket || 'Global'}
- **Tone:** ${getToneInstructions(tone)}
- **Audience Level:** ${getAudienceInstructions(audienceExpertise)}

## ARTICLE CONTEXT

**Central Entity:** ${businessInfo.seedKeyword || brief.targetKeyword || 'the topic'}
**Target Keyword:** ${brief.targetKeyword || businessInfo.seedKeyword || 'N/A'}
**Meta Description:** ${brief.metaDescription || 'N/A'}
**Key Takeaways:** ${brief.keyTakeaways?.join(', ') || 'N/A'}

## FULL ARTICLE STRUCTURE (for flow context)

${allSections.map((s, i) => `${i + 1}. ${s.heading}${s.key === section.key ? ' ← YOU ARE HERE' : ''}`).join('\n')}

${previousSections?.length ? `
## PREVIOUSLY WRITTEN SECTIONS (maintain continuity)

${previousSections.slice(-2).map(s => `### ${s.heading}\n${s.content.substring(0, 300)}...`).join('\n\n')}
` : ''}

## SERP INTELLIGENCE

${buildSerpInstructions(brief, section)}

## QUALITY RULES

${buildQualityRules(priorities)}

## OUTPUT INSTRUCTIONS

Write ${getWordCountRange(section)} words of content for this section.

- Output ONLY the prose content
- Do NOT include the heading itself
- Do NOT add meta-commentary
- Write in ${businessInfo.language || 'English'}

BEGIN WRITING:
`;
}

function buildPriorityInstructions(priorities: ContentGenerationPriorities): string {
  const total = Object.values(priorities).reduce((a, b) => a + b, 0) || 100;
  const norm = (v: number) => Math.round((v / total) * 100);
  const lines: string[] = [];

  if (norm(priorities.humanReadability) >= 30) {
    lines.push(`### Human Readability (${norm(priorities.humanReadability)}% priority)
- Write naturally, like explaining to a knowledgeable friend
- Use varied sentence structures and rhythms
- Create smooth transitions between ideas
- Make it engaging - the reader should WANT to continue reading
- Avoid robotic, template-like language`);
  }

  if (norm(priorities.businessConversion) >= 20) {
    lines.push(`### Business & Conversion (${norm(priorities.businessConversion)}% priority)
- Every section should move the reader toward action
- Clearly communicate VALUE - what does the reader gain?
- Address objections and build confidence
- Use language that motivates without being pushy`);
  }

  if (norm(priorities.machineOptimization) >= 20) {
    lines.push(`### Machine Optimization (${norm(priorities.machineOptimization)}% priority)
- Use the central entity as the grammatical SUBJECT where natural
- Structure sentences for clear Entity-Attribute-Value extraction
- Include contextual terms that link back to the main topic
- Place the most important information early in paragraphs`);
  }

  if (norm(priorities.factualDensity) >= 15) {
    lines.push(`### Information Density (${norm(priorities.factualDensity)}% priority)
- Every sentence should add a new fact or insight
- Avoid filler words: "basically", "actually", "very", "really"
- Use specific numbers, dates, and measurements where available
- No sentence should repeat information from another sentence`);
  }

  return lines.join('\n\n');
}

function buildMethodologyInstructions(section: SectionDefinition, brief: Partial<ContentBrief>): string {
  const methodology = section.methodologyNote || 'prose';

  switch (methodology) {
    case 'ordered_list':
      return `**FORMAT: ORDERED LIST**
- Use a numbered list for this section
- Start with a complete sentence stating the count
- Each list item MUST start with an ACTION VERB
- Each item delivers ONE clear instruction`;
    case 'unordered_list':
      return `**FORMAT: UNORDERED LIST**
- Use bullet points for this section
- Start with a complete sentence introducing the list
- Each item should be a distinct category/type/benefit
- Bold the key term at the start of each item`;
    case 'comparison_table':
      return `**FORMAT: COMPARISON TABLE**
- Create a markdown table for this section
- Columns = attributes (features, specs, prices)
- Rows = entities being compared`;
    case 'definition_prose':
      return `**FORMAT: DEFINITION PROSE**
- First sentence MUST be a clear definition
- Use the "Is-A" structure (hypernymy)
- Be authoritative and precise`;
    default:
      return `**FORMAT: PROSE**
- Use flowing paragraphs
- Vary sentence length for rhythm
- Use transitions between ideas`;
  }
}

function buildSerpInstructions(brief: Partial<ContentBrief>, section: SectionDefinition): string {
  const lines: string[] = [];

  if (brief.serpAnalysis?.peopleAlsoAsk?.length) {
    lines.push(`**"People Also Ask" Questions (address if relevant to this section):**
${brief.serpAnalysis.peopleAlsoAsk.slice(0, 4).map(q => `- ${q}`).join('\n')}`);
  }

  return lines.length ? lines.join('\n\n') : 'No specific SERP data for this section.';
}

function buildQualityRules(priorities: ContentGenerationPriorities): string {
  const rules = [
    '1. **No Repetitive Openings**: Each paragraph must start differently',
    '2. **Definitive Language**: Use "is/are" not "can be/might be" for facts',
    '3. **No Fluff**: Remove "also", "basically", "very", "actually", "really"'
  ];

  if (priorities.machineOptimization > 25) {
    rules.push('4. **Subject Positioning**: Central entity should be grammatical SUBJECT');
  }

  if (priorities.factualDensity > 20) {
    rules.push('5. **One Fact Per Sentence**: Each sentence adds unique information');
  }

  return rules.join('\n');
}

function getToneInstructions(tone: string): string {
  switch (tone) {
    case 'conversational': return 'Friendly and approachable, like talking to a colleague';
    case 'professional': return 'Authoritative but accessible. Clear and confident';
    case 'academic': return 'Formal and precise. Measured and objective';
    case 'sales': return 'Persuasive and benefit-focused';
    default: return 'Professional and clear';
  }
}

function getAudienceInstructions(level: string): string {
  switch (level) {
    case 'beginner': return 'Explain concepts from scratch. Define technical terms';
    case 'intermediate': return 'Assume basic familiarity. Can use industry terms';
    case 'expert': return 'Assume deep knowledge. Focus on nuance';
    default: return 'Assume intermediate familiarity';
  }
}

function getWordCountRange(section: SectionDefinition): string {
  if (section.level === 2) return '200-350';
  if (section.level === 3) return '150-250';
  return '100-200';
}
```

**Step 4: Create index file**

```typescript
// config/contentPrompts/index.ts
export * from './sectionPrompt';
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run config/contentPrompts/__tests__/sectionPrompt.test.ts`
Expected: PASS (5 tests)

**Step 6: Commit**

```bash
git add config/contentPrompts/
git commit -m "feat(prompts): add priority-based section prompt builder"
```

---

## Task 7: UI Component - Priority Sliders

**Files:**
- Create: `components/ui/PrioritySlider.tsx`
- Test: `components/ui/__tests__/PrioritySlider.test.tsx`

**Step 1: Write the failing test**

```typescript
// components/ui/__tests__/PrioritySlider.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrioritySlider } from '../PrioritySlider';

describe('PrioritySlider', () => {
  it('renders with label and value', () => {
    render(
      <PrioritySlider
        label="Human Readability"
        description="Natural flow"
        value={40}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Human Readability')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('calls onChange when slider moves', () => {
    const onChange = vi.fn();
    render(
      <PrioritySlider
        label="Test"
        description="Test"
        value={50}
        onChange={onChange}
      />
    );
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });
    expect(onChange).toHaveBeenCalledWith(75);
  });

  it('displays description text', () => {
    render(
      <PrioritySlider
        label="Test"
        description="Test description"
        value={50}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/__tests__/PrioritySlider.test.tsx`
Expected: FAIL with "Cannot find module '../PrioritySlider'"

**Step 3: Write implementation**

```tsx
// components/ui/PrioritySlider.tsx
import React from 'react';

interface PrioritySliderProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  min?: number;
  max?: number;
}

export const PrioritySlider: React.FC<PrioritySliderProps> = ({
  label,
  description,
  value,
  onChange,
  color = 'blue',
  min = 0,
  max = 100
}) => {
  const colorClasses: Record<string, string> = {
    blue: 'accent-blue-500',
    green: 'accent-green-500',
    purple: 'accent-purple-500',
    orange: 'accent-orange-500'
  };

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-sm text-gray-200">{label}</span>
        <span className="text-sm text-gray-400">{value}%</span>
      </div>
      <input
        type="range"
        role="slider"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${colorClasses[color]}`}
      />
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
};

export default PrioritySlider;
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run components/ui/__tests__/PrioritySlider.test.tsx`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add components/ui/PrioritySlider.tsx components/ui/__tests__/PrioritySlider.test.tsx
git commit -m "feat(ui): add PrioritySlider component"
```

---

## Task 8: UI Component - Content Generation Settings Panel

**Files:**
- Create: `components/ContentGenerationSettingsPanel.tsx`
- Test: `components/__tests__/ContentGenerationSettingsPanel.test.tsx`

**Step 1: Write the failing test**

```typescript
// components/__tests__/ContentGenerationSettingsPanel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContentGenerationSettingsPanel } from '../ContentGenerationSettingsPanel';
import { DEFAULT_CONTENT_GENERATION_SETTINGS, PRIORITY_PRESETS } from '../../types/contentGeneration';

describe('ContentGenerationSettingsPanel', () => {
  const defaultSettings = {
    ...DEFAULT_CONTENT_GENERATION_SETTINGS,
    id: 'test',
    userId: 'user-1',
    createdAt: '',
    updatedAt: ''
  };

  it('renders all priority sliders', () => {
    render(
      <ContentGenerationSettingsPanel
        settings={defaultSettings as any}
        onChange={() => {}}
        presets={PRIORITY_PRESETS}
      />
    );
    expect(screen.getByText('Human Readability')).toBeInTheDocument();
    expect(screen.getByText('Business & Conversion')).toBeInTheDocument();
    expect(screen.getByText('Machine Optimization')).toBeInTheDocument();
    expect(screen.getByText('Factual Density')).toBeInTheDocument();
  });

  it('renders preset buttons', () => {
    render(
      <ContentGenerationSettingsPanel
        settings={defaultSettings as any}
        onChange={() => {}}
        presets={PRIORITY_PRESETS}
      />
    );
    expect(screen.getByText('Balanced')).toBeInTheDocument();
    expect(screen.getByText('SEO Focused')).toBeInTheDocument();
  });

  it('calls onChange when preset is selected', () => {
    const onChange = vi.fn();
    render(
      <ContentGenerationSettingsPanel
        settings={defaultSettings as any}
        onChange={onChange}
        presets={PRIORITY_PRESETS}
      />
    );
    fireEvent.click(screen.getByText('SEO Focused'));
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0].priorities).toEqual(PRIORITY_PRESETS.seo_focused);
  });

  it('renders tone and audience selects', () => {
    render(
      <ContentGenerationSettingsPanel
        settings={defaultSettings as any}
        onChange={() => {}}
        presets={PRIORITY_PRESETS}
      />
    );
    expect(screen.getByLabelText('Tone')).toBeInTheDocument();
    expect(screen.getByLabelText('Audience Level')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/ContentGenerationSettingsPanel.test.tsx`
Expected: FAIL with "Cannot find module '../ContentGenerationSettingsPanel'"

**Step 3: Write implementation**

```tsx
// components/ContentGenerationSettingsPanel.tsx
import React, { useState } from 'react';
import {
  ContentGenerationSettings,
  ContentGenerationPriorities,
  ContentTone,
  AudienceExpertise
} from '../types/contentGeneration';
import { PrioritySlider } from './ui/PrioritySlider';

interface Props {
  settings: ContentGenerationSettings;
  onChange: (settings: ContentGenerationSettings) => void;
  presets: Record<string, ContentGenerationPriorities>;
}

const formatPresetName = (key: string): string => {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const ContentGenerationSettingsPanel: React.FC<Props> = ({
  settings,
  onChange,
  presets
}) => {
  const [activePreset, setActivePreset] = useState<string | null>('balanced');

  const handlePriorityChange = (key: keyof ContentGenerationPriorities, value: number) => {
    setActivePreset(null);
    onChange({
      ...settings,
      priorities: { ...settings.priorities, [key]: value }
    });
  };

  const handlePresetSelect = (presetKey: string) => {
    setActivePreset(presetKey);
    onChange({
      ...settings,
      priorities: presets[presetKey]
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-white">Content Generation Settings</h3>

      {/* Presets */}
      <div className="mb-6">
        <label className="text-sm text-gray-400 mb-2 block">Quick Presets</label>
        <div className="flex gap-2 flex-wrap">
          {Object.keys(presets).map(key => (
            <button
              key={key}
              onClick={() => handlePresetSelect(key)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                activePreset === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {formatPresetName(key)}
            </button>
          ))}
        </div>
      </div>

      {/* Priority Sliders */}
      <div className="space-y-4 mb-6">
        <PrioritySlider
          label="Human Readability"
          description="Natural flow, engagement, readability"
          value={settings.priorities.humanReadability}
          onChange={(v) => handlePriorityChange('humanReadability', v)}
          color="blue"
        />
        <PrioritySlider
          label="Business & Conversion"
          description="CTAs, value props, action-oriented"
          value={settings.priorities.businessConversion}
          onChange={(v) => handlePriorityChange('businessConversion', v)}
          color="green"
        />
        <PrioritySlider
          label="Machine Optimization"
          description="SEO signals, entity positioning"
          value={settings.priorities.machineOptimization}
          onChange={(v) => handlePriorityChange('machineOptimization', v)}
          color="purple"
        />
        <PrioritySlider
          label="Factual Density"
          description="Information per sentence, EAV triples"
          value={settings.priorities.factualDensity}
          onChange={(v) => handlePriorityChange('factualDensity', v)}
          color="orange"
        />
      </div>

      {/* Tone & Audience */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="tone" className="text-sm text-gray-400 mb-1 block">Tone</label>
          <select
            id="tone"
            value={settings.tone}
            onChange={(e) => onChange({ ...settings, tone: e.target.value as ContentTone })}
            className="w-full bg-gray-700 border-gray-600 rounded px-3 py-2 text-white"
          >
            <option value="conversational">Conversational</option>
            <option value="professional">Professional</option>
            <option value="academic">Academic</option>
            <option value="sales">Sales-focused</option>
          </select>
        </div>
        <div>
          <label htmlFor="audience" className="text-sm text-gray-400 mb-1 block">Audience Level</label>
          <select
            id="audience"
            value={settings.audienceExpertise}
            onChange={(e) => onChange({ ...settings, audienceExpertise: e.target.value as AudienceExpertise })}
            className="w-full bg-gray-700 border-gray-600 rounded px-3 py-2 text-white"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="expert">Expert</option>
          </select>
        </div>
      </div>

      {/* Checkpoint Setting */}
      <div className="mt-4 flex items-center gap-2">
        <input
          type="checkbox"
          id="checkpoint"
          checked={settings.checkpointAfterPass1}
          onChange={(e) => onChange({ ...settings, checkpointAfterPass1: e.target.checked })}
          className="rounded bg-gray-700 border-gray-600"
        />
        <label htmlFor="checkpoint" className="text-sm text-gray-300">
          Pause for approval after initial draft
        </label>
      </div>
    </div>
  );
};

export default ContentGenerationSettingsPanel;
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run components/__tests__/ContentGenerationSettingsPanel.test.tsx`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add components/ContentGenerationSettingsPanel.tsx components/__tests__/ContentGenerationSettingsPanel.test.tsx
git commit -m "feat(ui): add ContentGenerationSettingsPanel with priority sliders"
```

---

## Task 9: Integrate Settings into useContentGeneration Hook

**Files:**
- Modify: `hooks/useContentGeneration.ts`

**Step 1: Read current implementation**

```bash
cat hooks/useContentGeneration.ts | head -100
```

**Step 2: Add settings parameter to hook**

Add to imports:
```typescript
import { ContentGenerationSettings, DEFAULT_CONTENT_GENERATION_SETTINGS } from '../types/contentGeneration';
```

Add settings to hook interface and pass to orchestrator:
```typescript
interface UseContentGenerationOptions {
  briefId: string;
  mapId: string;
  settings?: ContentGenerationSettings;
}

export function useContentGeneration({ briefId, mapId, settings }: UseContentGenerationOptions) {
  // Use provided settings or defaults
  const activeSettings = settings || {
    ...DEFAULT_CONTENT_GENERATION_SETTINGS,
    id: 'default',
    userId: '',
    createdAt: '',
    updatedAt: ''
  };

  // ... pass activeSettings to orchestrator calls
}
```

**Step 3: Test manually**

Start dev server and verify content generation still works with default settings.

**Step 4: Commit**

```bash
git add hooks/useContentGeneration.ts
git commit -m "feat(hooks): integrate settings into useContentGeneration"
```

---

## Task 10: Version Tracking in Orchestrator

**Files:**
- Modify: `services/ai/contentGeneration/orchestrator.ts`

**Step 1: Add version saving after each pass**

After each pass completion, save version:
```typescript
async saveContentVersion(
  jobId: string,
  passNumber: number,
  content: string,
  settings: ContentGenerationSettings
): Promise<void> {
  // Count existing versions for this pass
  const { count } = await this.supabase
    .from('content_versions')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('pass_number', passNumber);

  const versionNumber = (count || 0) + 1;

  // Deactivate previous active version
  await this.supabase
    .from('content_versions')
    .update({ is_active: false })
    .eq('job_id', jobId)
    .eq('pass_number', passNumber)
    .eq('is_active', true);

  // Insert new version
  await this.supabase
    .from('content_versions')
    .insert({
      job_id: jobId,
      pass_number: passNumber,
      version_number: versionNumber,
      content,
      word_count: content.split(/\s+/).length,
      settings_snapshot: settings,
      is_active: true
    });
}
```

**Step 2: Add revert capability**

```typescript
async revertToVersion(jobId: string, versionId: string): Promise<string> {
  // Get the version to revert to
  const { data: version } = await this.supabase
    .from('content_versions')
    .select('*')
    .eq('id', versionId)
    .single();

  if (!version) throw new Error('Version not found');

  // Deactivate all versions for this pass
  await this.supabase
    .from('content_versions')
    .update({ is_active: false })
    .eq('job_id', jobId)
    .eq('pass_number', version.pass_number);

  // Activate the selected version
  await this.supabase
    .from('content_versions')
    .update({ is_active: true })
    .eq('id', versionId);

  // Update job draft content
  await this.supabase
    .from('content_generation_jobs')
    .update({
      draft_content: version.content,
      current_pass: version.pass_number
    })
    .eq('id', jobId);

  return version.content;
}
```

**Step 3: Test manually**

Run content generation and verify versions are being saved in database.

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/orchestrator.ts
git commit -m "feat(orchestrator): add version tracking and revert capability"
```

---

## Task 11: Pass Control Panel UI

**Files:**
- Create: `components/PassControlPanel.tsx`

**Step 1: Write component** (similar structure to Task 8)

**Step 2: Test manually**

**Step 3: Commit**

```bash
git add components/PassControlPanel.tsx
git commit -m "feat(ui): add PassControlPanel for granular pass control"
```

---

## Task 12: Integration - Add Settings to Content Brief Modal

**Files:**
- Modify: `components/ContentBriefModal.tsx`

**Step 1: Import and add settings panel**

**Step 2: Pass settings to generation hook**

**Step 3: Test end-to-end**

**Step 4: Commit**

```bash
git add components/ContentBriefModal.tsx
git commit -m "feat(modal): integrate settings panel into content brief modal"
```

---

## Final Integration Test

**Step 1: Run full test suite**
```bash
npm run test
```

**Step 2: Manual E2E test**
1. Create a content brief
2. Adjust priority sliders
3. Start generation
4. Verify draft preview shows content
5. After completion, test version revert

**Step 3: Create PR**
```bash
git push -u origin feature/content-gen-v2
gh pr create --title "feat: Content Generation V2 with priority-based settings" --body "..."
```

---

## Success Criteria

- [ ] Brief compliance service identifies missing fields and generates suggestions
- [ ] Priority sliders affect prompt content
- [ ] Versions are saved after each pass
- [ ] Revert functionality works
- [ ] All tests pass
- [ ] No TypeScript errors
