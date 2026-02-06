# Brief → Generation Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Content Brief the single source of truth for content generation with transparent change tracking.

**Architecture:** Brief defines WHAT → Generation executes faithfully → Deviations logged with justification

**Tech Stack:** TypeScript, React, Supabase, Vitest

---

## Task 1: Add BriefChangeLog Types

**Files:**
- Modify: `types/content.ts`

**Step 1: Write the failing test**

Create `services/ai/contentGeneration/__tests__/briefChangeTracker.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { BriefChangeLogEntry, BriefGenerationSummary } from '../../../../types';

describe('BriefChangeLog Types', () => {
  it('should have correct BriefChangeLogEntry shape', () => {
    const entry: BriefChangeLogEntry = {
      id: 'test-id',
      timestamp: '2026-02-06T10:00:00Z',
      pass: 6,
      change_type: 'image_added',
      section_key: 'section-0',
      field: 'image',
      original_value: null,
      new_value: 'Test image description',
      reason: 'Section > 300 words without visual',
      criteria_met: ['word_count_threshold', 'process_content']
    };

    expect(entry.change_type).toBe('image_added');
    expect(entry.criteria_met).toContain('word_count_threshold');
  });

  it('should have correct BriefGenerationSummary shape', () => {
    const summary: BriefGenerationSummary = {
      total_changes: 3,
      images_added: 2,
      images_modified: 1,
      sections_modified: 0,
      last_updated: '2026-02-06T10:00:00Z'
    };

    expect(summary.total_changes).toBe(3);
    expect(summary.images_added + summary.images_modified).toBe(3);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/ai/contentGeneration/__tests__/briefChangeTracker.test.ts`
Expected: FAIL with "Cannot find type 'BriefChangeLogEntry'"

**Step 3: Add the types to content.ts**

In `types/content.ts`, after the `CompetitorSpecs` interface (~line 395), add:

```typescript
/**
 * Log entry for tracking changes made during content generation
 * that deviate from the original brief specification.
 */
export interface BriefChangeLogEntry {
  id: string;
  timestamp: string;
  pass: number;
  change_type: 'image_added' | 'image_modified' | 'image_removed' | 'section_modified';
  section_key: string;
  field: string;
  original_value?: string | number | null;
  new_value: string | number;
  reason: string;
  criteria_met: string[];
}

/**
 * Summary of generation changes for UI display
 */
export interface BriefGenerationSummary {
  total_changes: number;
  images_added: number;
  images_modified: number;
  sections_modified: number;
  last_updated: string;
}
```

**Step 4: Add fields to ContentBrief interface**

In `types/content.ts`, inside the `ContentBrief` interface (~line 350), add:

```typescript
  // Generation change tracking (populated during content generation)
  generation_changes?: BriefChangeLogEntry[];
  generation_summary?: BriefGenerationSummary;
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run services/ai/contentGeneration/__tests__/briefChangeTracker.test.ts`
Expected: PASS

**Step 6: Verify build**

Run: `npm run build`
Expected: No TypeScript errors

**Step 7: Commit**

```bash
git add types/content.ts services/ai/contentGeneration/__tests__/briefChangeTracker.test.ts
git commit -m "feat(types): add BriefChangeLogEntry and BriefGenerationSummary types

Adds types for tracking changes made during content generation that
deviate from original brief specification.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Database Migration

**Files:**
- Create: `supabase/migrations/20260206100000_add_generation_changes.sql`

**Step 1: Create migration file**

```sql
-- Add generation_changes JSONB column to content_briefs
ALTER TABLE content_briefs
ADD COLUMN IF NOT EXISTS generation_changes JSONB DEFAULT '[]'::jsonb;

-- Add generation_summary JSONB column
ALTER TABLE content_briefs
ADD COLUMN IF NOT EXISTS generation_summary JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN content_briefs.generation_changes IS 'Array of BriefChangeLogEntry tracking deviations during generation';
COMMENT ON COLUMN content_briefs.generation_summary IS 'Summary statistics of generation changes';
```

**Step 2: Run migration locally**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Verify column exists**

Run: `npx supabase db diff`
Expected: No diff (migration already applied)

**Step 4: Commit**

```bash
git add supabase/migrations/20260206100000_add_generation_changes.sql
git commit -m "feat(db): add generation_changes columns to content_briefs

Adds JSONB columns for tracking generation changes and summary.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create BriefChangeTracker Service

**Files:**
- Create: `services/ai/contentGeneration/briefChangeTracker.ts`
- Modify: `services/ai/contentGeneration/__tests__/briefChangeTracker.test.ts`

**Step 1: Add tests for BriefChangeTracker**

Append to `services/ai/contentGeneration/__tests__/briefChangeTracker.test.ts`:

```typescript
import { BriefChangeTracker, ImageAdditionCriteria } from '../briefChangeTracker';

describe('BriefChangeTracker', () => {
  describe('evaluateImageAddition', () => {
    it('should reject addition when word count is low', () => {
      const result = BriefChangeTracker.evaluateImageAddition(
        'Short content with only a few words.',
        'Test Section',
        false,
        false
      );

      expect(result.justified).toBe(false);
      expect(result.criteria.wordCountThreshold).toBe(false);
    });

    it('should justify addition for long section with process content', () => {
      const longContent = 'Step 1: First do this. '.repeat(50); // ~300+ words
      const result = BriefChangeTracker.evaluateImageAddition(
        longContent,
        'How to Configure WiFi',
        false,
        false
      );

      expect(result.justified).toBe(true);
      expect(result.criteria.wordCountThreshold).toBe(true);
      expect(result.criteria.processContent).toBe(true);
      expect(result.reason).toContain('words without visual');
    });

    it('should justify addition for featured snippet target', () => {
      const result = BriefChangeTracker.evaluateImageAddition(
        'Some content about the topic.',
        'What is WiFi Security',
        false,
        true // isFeaturedSnippetTarget
      );

      expect(result.justified).toBe(true);
      expect(result.criteria.featuredSnippetTarget).toBe(true);
    });

    it('should reject when brief already has image', () => {
      const longContent = 'Step 1: First do this. '.repeat(50);
      const result = BriefChangeTracker.evaluateImageAddition(
        longContent,
        'How to Configure',
        true, // briefHasImage
        false
      );

      expect(result.justified).toBe(false);
    });
  });

  describe('logImageAdded', () => {
    it('should create correct log entry', () => {
      // Mock Supabase client
      const mockSupabase = {} as any;
      const tracker = new BriefChangeTracker('brief-123', mockSupabase);

      const criteria: ImageAdditionCriteria = {
        wordCountThreshold: true,
        processContent: true,
        featuredSnippetTarget: false,
        userExperienceValue: true
      };

      tracker.logImageAdded(6, 'section-2', 'Process diagram', criteria, 'Long section needs visual');

      const changes = tracker.getChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0].change_type).toBe('image_added');
      expect(changes[0].section_key).toBe('section-2');
      expect(changes[0].criteria_met).toContain('word_count_threshold');
      expect(changes[0].criteria_met).toContain('process_content');
    });
  });

  describe('getSummary', () => {
    it('should calculate correct summary', () => {
      const mockSupabase = {} as any;
      const tracker = new BriefChangeTracker('brief-123', mockSupabase);

      const criteria: ImageAdditionCriteria = {
        wordCountThreshold: true,
        processContent: false,
        featuredSnippetTarget: false,
        userExperienceValue: true
      };

      tracker.logImageAdded(6, 'section-1', 'Image 1', criteria, 'Reason 1');
      tracker.logImageAdded(6, 'section-2', 'Image 2', criteria, 'Reason 2');
      tracker.logImageModified(6, 'section-0', 'Old desc', 'New desc', 'Quality improvement');

      const summary = tracker.getSummary();
      expect(summary.total_changes).toBe(3);
      expect(summary.images_added).toBe(2);
      expect(summary.images_modified).toBe(1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/ai/contentGeneration/__tests__/briefChangeTracker.test.ts`
Expected: FAIL with "Cannot resolve '../briefChangeTracker'"

**Step 3: Create BriefChangeTracker service**

Create `services/ai/contentGeneration/briefChangeTracker.ts`:

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { BriefChangeLogEntry, BriefGenerationSummary } from '../../../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Criteria for justifying additional images
 */
export interface ImageAdditionCriteria {
  wordCountThreshold: boolean;
  processContent: boolean;
  featuredSnippetTarget: boolean;
  userExperienceValue: boolean;
}

/**
 * Service for tracking and persisting changes made to brief during generation
 */
export class BriefChangeTracker {
  private changes: BriefChangeLogEntry[] = [];
  private briefId: string;
  private supabase: SupabaseClient;

  constructor(briefId: string, supabase: SupabaseClient) {
    this.briefId = briefId;
    this.supabase = supabase;
  }

  /**
   * Log an image addition with justification
   */
  logImageAdded(
    pass: number,
    sectionKey: string,
    imageDescription: string,
    criteria: ImageAdditionCriteria,
    reason: string
  ): void {
    const criteriaMet: string[] = [];
    if (criteria.wordCountThreshold) criteriaMet.push('word_count_threshold');
    if (criteria.processContent) criteriaMet.push('process_content');
    if (criteria.featuredSnippetTarget) criteriaMet.push('featured_snippet_target');
    if (criteria.userExperienceValue) criteriaMet.push('user_experience_value');

    this.changes.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      pass,
      change_type: 'image_added',
      section_key: sectionKey,
      field: 'image',
      original_value: null,
      new_value: imageDescription,
      reason,
      criteria_met: criteriaMet
    });

    console.log(`[BriefChangeTracker] Image added to ${sectionKey}: ${reason}`);
  }

  /**
   * Log an image description modification
   */
  logImageModified(
    pass: number,
    sectionKey: string,
    originalDescription: string,
    newDescription: string,
    reason: string
  ): void {
    this.changes.push({
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      pass,
      change_type: 'image_modified',
      section_key: sectionKey,
      field: 'image_description',
      original_value: originalDescription,
      new_value: newDescription,
      reason,
      criteria_met: ['quality_improvement']
    });

    console.log(`[BriefChangeTracker] Image modified in ${sectionKey}: ${reason}`);
  }

  /**
   * Check if adding an image to a section is justified
   */
  static evaluateImageAddition(
    sectionContent: string,
    sectionHeading: string,
    briefHasImage: boolean,
    isFeaturedSnippetTarget: boolean
  ): { justified: boolean; criteria: ImageAdditionCriteria; reason: string } {
    const wordCount = sectionContent.split(/\s+/).filter(w => w.length > 0).length;
    const combinedText = sectionHeading + ' ' + sectionContent;
    const hasProcessContent = /\b(step|proces|stap|how to|hoe|procedure|workflow|guide|tutorial)\b/i.test(combinedText);

    const criteria: ImageAdditionCriteria = {
      wordCountThreshold: wordCount > 300 && !briefHasImage,
      processContent: hasProcessContent && !briefHasImage,
      featuredSnippetTarget: isFeaturedSnippetTarget && !briefHasImage,
      userExperienceValue: false
    };

    // At least 2 criteria must be met, OR featured snippet target alone justifies
    const criteriaMetCount = [criteria.wordCountThreshold, criteria.processContent, criteria.featuredSnippetTarget].filter(Boolean).length;
    criteria.userExperienceValue = criteriaMetCount >= 2 || criteria.featuredSnippetTarget;

    let reason = '';
    if (criteria.userExperienceValue) {
      const reasons: string[] = [];
      if (criteria.wordCountThreshold) reasons.push(`section has ${wordCount} words without visual`);
      if (criteria.processContent) reasons.push('contains process/step content');
      if (criteria.featuredSnippetTarget) reasons.push('featured snippet target needs supporting visual');
      reason = `Added image: ${reasons.join('; ')}. This improves user experience and content comprehension.`;
    }

    return { justified: criteria.userExperienceValue, criteria, reason };
  }

  /**
   * Get current changes
   */
  getChanges(): BriefChangeLogEntry[] {
    return [...this.changes];
  }

  /**
   * Generate summary statistics
   */
  getSummary(): BriefGenerationSummary {
    return {
      total_changes: this.changes.length,
      images_added: this.changes.filter(c => c.change_type === 'image_added').length,
      images_modified: this.changes.filter(c => c.change_type === 'image_modified').length,
      sections_modified: this.changes.filter(c => c.change_type === 'section_modified').length,
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Persist changes to the brief in database
   */
  async persistChanges(): Promise<void> {
    if (this.changes.length === 0) {
      console.log('[BriefChangeTracker] No changes to persist');
      return;
    }

    const summary = this.getSummary();

    const { error } = await this.supabase
      .from('content_briefs')
      .update({
        generation_changes: this.changes,
        generation_summary: summary
      })
      .eq('id', this.briefId);

    if (error) {
      console.error('[BriefChangeTracker] Failed to persist changes:', error);
    } else {
      console.log(`[BriefChangeTracker] Persisted ${this.changes.length} changes to brief ${this.briefId}`);
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/ai/contentGeneration/__tests__/briefChangeTracker.test.ts`
Expected: PASS (all tests)

**Step 5: Verify build**

Run: `npm run build`
Expected: No TypeScript errors

**Step 6: Commit**

```bash
git add services/ai/contentGeneration/briefChangeTracker.ts services/ai/contentGeneration/__tests__/briefChangeTracker.test.ts
git commit -m "feat(content-gen): add BriefChangeTracker service

Tracks and persists changes made during content generation:
- evaluateImageAddition() checks if extra image is justified
- logImageAdded/Modified() records changes with criteria
- persistChanges() saves to database

Criteria for justified additions:
- Section > 300 words without visual
- Contains process/step content
- Featured snippet target section

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Standardize Section Key Format

**Files:**
- Modify: `services/ai/contentGeneration/orchestrator.ts`

**Step 1: Write the failing test**

Create `services/ai/contentGeneration/__tests__/sectionKeyFormat.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('Section Key Format', () => {
  it('should use hyphen and 0-indexed format: section-0, section-1', () => {
    // Test the expected format
    const expectedKeys = ['section-0', 'section-1', 'section-2'];

    expectedKeys.forEach((key, idx) => {
      expect(key).toBe(`section-${idx}`);
      expect(key).toMatch(/^section-\d+$/);
      expect(key).not.toContain('_'); // No underscores
    });
  });

  it('should use parent-sub-N format for subsections', () => {
    const parentKey = 'section-1';
    const expectedSubKeys = ['section-1-sub-0', 'section-1-sub-1'];

    expectedSubKeys.forEach((key, idx) => {
      expect(key).toBe(`${parentKey}-sub-${idx}`);
    });
  });
});
```

**Step 2: Run test to verify it passes (format spec)**

Run: `npx vitest run services/ai/contentGeneration/__tests__/sectionKeyFormat.test.ts`
Expected: PASS (this just documents the expected format)

**Step 3: Fix orchestrator key format**

In `services/ai/contentGeneration/orchestrator.ts`, find `parseSectionsFromBrief()` method.

Change line ~731-732 from:
```typescript
bodySections.push({
  key: `section_${idx + 1}`,
```

To:
```typescript
// Use brief's key if available, otherwise generate in standard format: section-{0-indexed}
// This MUST match visualSemanticsService.analyzeImageRequirements() format
const sectionKey = section.key || `section-${idx}`;
bodySections.push({
  key: sectionKey,
```

Change line ~744 from:
```typescript
key: `section_${idx + 1}_sub_${subIdx + 1}`,
```

To:
```typescript
// Subsection key format: {parentKey}-sub-{0-indexed}
const parentKey = section.key || `section-${idx}`;
```

And line ~745:
```typescript
key: `${parentKey}-sub-${subIdx}`,
```

**Step 4: Verify build**

Run: `npm run build`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/orchestrator.ts services/ai/contentGeneration/__tests__/sectionKeyFormat.test.ts
git commit -m "fix(orchestrator): standardize section key format to match brief

Changes key format from section_1 (underscore, 1-indexed) to
section-0 (hyphen, 0-indexed) to match visualSemanticsService.

This fixes image-to-section matching in the generation pipeline.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Enforce Brief Image Plan in Pass 1

**Files:**
- Modify: `services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts`

**Step 1: Locate the image section in sectionPromptBuilder.ts**

Read lines 165-204 of `sectionPromptBuilder.ts` to find the current image handling logic.

**Step 2: Replace image logic with brief-enforcing version**

Replace the image section (approximately lines 165-204) with:

```typescript
    // Add visual semantics ONLY if brief designates an image for this section
    const enhancedVS = brief.enhanced_visual_semantics;
    let briefDesignatesImage = false;
    let imageSpec: any = null;

    if (enhancedVS) {
      const sectionKey = section.key || section.heading?.toLowerCase().replace(/\s+/g, '-');
      const headingLower = section.heading?.toLowerCase() || '';

      // Try Record-based section_images first
      if (enhancedVS.section_images && typeof enhancedVS.section_images === 'object') {
        const matchingEntry = Object.entries(enhancedVS.section_images).find(([key]) => {
          const keyLower = key.toLowerCase();
          const sectionKeyLower = sectionKey?.toLowerCase() || '';
          // Match with normalization (handles section-0 vs section_0)
          return keyLower === sectionKeyLower ||
                 keyLower.replace(/-/g, '_') === sectionKeyLower.replace(/-/g, '_') ||
                 keyLower.replace(/_/g, '-') === sectionKeyLower.replace(/_/g, '-');
        });

        if (matchingEntry) {
          briefDesignatesImage = true;
          imageSpec = matchingEntry[1];
        }
      }
      // Fall back to array-based sectionImages
      else if (Array.isArray((enhancedVS as any).sectionImages)) {
        const visualGuide = (enhancedVS as any).sectionImages.find(
          (v: { sectionKey: string }) => {
            const vKeyLower = v.sectionKey?.toLowerCase() || '';
            const sectionKeyLower = sectionKey?.toLowerCase() || '';
            return vKeyLower === sectionKeyLower || headingLower.includes(vKeyLower);
          }
        );
        if (visualGuide) {
          briefDesignatesImage = true;
          imageSpec = visualGuide;
        }
      }
    }

    // ONLY add image placeholder if brief designates it
    if (briefDesignatesImage && imageSpec) {
      const imageType = imageSpec.n_gram_match?.[0]?.toUpperCase() || imageSpec.type || 'SECTION';
      const description = imageSpec.image_description || imageSpec.description;
      const altText = imageSpec.alt_text_recommendation || imageSpec.altText;

      guidance += `\n## VISUAL PLACEHOLDER (Brief-Designated)
Type: ${imageType}
Description: ${description}
Alt text: ${altText}
**REQUIRED:** Insert exactly one image placeholder: [IMAGE: ${description} | alt="${altText}"]
Place after the first paragraph, never between heading and first paragraph.
`;
    } else {
      // NO image for this section per brief - explicitly forbid
      guidance += `\n## NO IMAGE FOR THIS SECTION
The content brief does not designate an image for this section.
Do NOT insert any [IMAGE:] placeholders in this section.
`;
    }
```

**Step 3: Verify build**

Run: `npm run build`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts
git commit -m "feat(pass1): enforce brief image plan in section prompts

Only instructs AI to add [IMAGE:] placeholders for sections that
the brief explicitly designates for images. Sections without brief
designation are explicitly forbidden from adding images.

This makes the content brief the source of truth for image placement.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Update Pass 4 for Brief-Led Image Processing

**Files:**
- Modify: `services/ai/contentGeneration/passes/pass4Visuals.ts`

**Step 1: Update Pass 4 imports**

Add import at top of `pass4Visuals.ts`:

```typescript
import { BriefChangeTracker } from '../briefChangeTracker';
```

**Step 2: Update executePass4 signature**

Change the function signature to accept optional changeTracker:

```typescript
export async function executePass4(
  orchestrator: ContentGenerationOrchestrator,
  job: ContentGenerationJob,
  brief: ContentBrief,
  businessInfo: BusinessInfo,
  onSectionProgress?: SectionProgressCallback,
  shouldAbort?: () => boolean,
  changeTracker?: BriefChangeTracker
): Promise<string> {
```

**Step 3: Replace filterSections logic**

Replace the `filterSections` function inside `executeSectionPass` options with:

```typescript
      filterSections: (sections: ContentGenerationSection[], budget: ContentFormatBudget) => {
        // Build set of brief-designated image sections
        const briefImageSections = new Set<string>();
        if (brief.enhanced_visual_semantics?.section_images) {
          Object.keys(brief.enhanced_visual_semantics.section_images).forEach(key => {
            briefImageSections.add(key.toLowerCase());
            briefImageSections.add(key.toLowerCase().replace(/-/g, '_'));
            briefImageSections.add(key.toLowerCase().replace(/_/g, '-'));
          });
        }
        // Always include intro for hero image
        briefImageSections.add('intro');

        return sections.filter(s => {
          const sectionKeyLower = s.section_key.toLowerCase();
          const sectionKeyNormalized = sectionKeyLower.replace(/-/g, '_');

          // 1. Always process if brief designates this section for an image
          if (briefImageSections.has(sectionKeyLower) || briefImageSections.has(sectionKeyNormalized)) {
            return true;
          }

          // 2. Check if section already has an image (from Pass 1)
          const hasImage = (s.current_content || '').includes('[IMAGE:');
          if (hasImage) {
            return true;
          }

          // 3. Evaluate if adding an image is justified
          const isFSTarget = brief.featured_snippet_target?.question?.toLowerCase().includes(
            s.section_heading?.toLowerCase().split(' ')[0] || ''
          ) || false;

          const evaluation = BriefChangeTracker.evaluateImageAddition(
            s.current_content || '',
            s.section_heading || '',
            false,
            isFSTarget
          );

          if (evaluation.justified && changeTracker) {
            changeTracker.logImageAdded(
              6,
              s.section_key,
              `Auto-generated visual for ${s.section_heading}`,
              evaluation.criteria,
              evaluation.reason
            );
            return true;
          }

          return false;
        });
      }
```

**Step 4: Verify build**

Run: `npm run build`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add services/ai/contentGeneration/passes/pass4Visuals.ts
git commit -m "feat(pass4): enforce brief image plan with justified additions

Pass 4 now:
1. Only processes sections designated by brief for images
2. Allows justified additions (word count, process content, FS target)
3. Logs all additions to BriefChangeTracker with reasons

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Wire Change Tracker in Orchestrator

**Files:**
- Modify: `services/ai/contentGeneration/orchestrator.ts`

**Step 1: Add import and property**

At top of `orchestrator.ts`, add import:

```typescript
import { BriefChangeTracker } from './briefChangeTracker';
```

Add property to the `ContentGenerationOrchestrator` class:

```typescript
private changeTrackers: Map<string, BriefChangeTracker> = new Map();
```

**Step 2: Add tracker management methods**

Add these methods to the class:

```typescript
/**
 * Get or create change tracker for a job
 */
getChangeTracker(jobId: string, briefId: string): BriefChangeTracker {
  if (!this.changeTrackers.has(jobId)) {
    this.changeTrackers.set(jobId, new BriefChangeTracker(briefId, this.supabase));
  }
  return this.changeTrackers.get(jobId)!;
}

/**
 * Persist and clean up change tracker after job completion
 */
async finalizeChangeTracker(jobId: string): Promise<void> {
  const tracker = this.changeTrackers.get(jobId);
  if (tracker) {
    await tracker.persistChanges();
    this.changeTrackers.delete(jobId);
  }
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add services/ai/contentGeneration/orchestrator.ts
git commit -m "feat(orchestrator): add change tracker management

Adds getChangeTracker() and finalizeChangeTracker() methods for
managing BriefChangeTracker instances per generation job.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Create GenerationChangesPanel UI Component

**Files:**
- Create: `components/drafting/GenerationChangesPanel.tsx`

**Step 1: Create the component**

```typescript
// components/drafting/GenerationChangesPanel.tsx

import React, { useState } from 'react';
import { BriefChangeLogEntry, BriefGenerationSummary } from '../../types';
import { ChevronDown, ChevronRight, ImageIcon, Edit, AlertCircle } from 'lucide-react';

interface GenerationChangesPanelProps {
  changes: BriefChangeLogEntry[];
  summary: BriefGenerationSummary | null;
}

export const GenerationChangesPanel: React.FC<GenerationChangesPanelProps> = ({
  changes,
  summary
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!changes || changes.length === 0) {
    return null;
  }

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'image_added':
        return <ImageIcon className="w-4 h-4 text-green-400" />;
      case 'image_modified':
        return <Edit className="w-4 h-4 text-amber-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-400" />;
    }
  };

  const formatCriteria = (criteria: string[]) => {
    const labels: Record<string, string> = {
      'word_count_threshold': 'Long section',
      'process_content': 'Process content',
      'featured_snippet_target': 'FS target',
      'user_experience_value': 'UX value',
      'quality_improvement': 'Quality'
    };
    return criteria.map(c => labels[c] || c).join(', ');
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-200">
            Generation Changes
          </span>
          <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">
            {summary?.total_changes || changes.length} changes
          </span>
        </div>

        {summary && (
          <div className="flex items-center gap-3 text-xs">
            {summary.images_added > 0 && (
              <span className="text-green-400">+{summary.images_added} images</span>
            )}
            {summary.images_modified > 0 && (
              <span className="text-amber-400">{summary.images_modified} modified</span>
            )}
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-gray-700 p-3 space-y-2 max-h-64 overflow-y-auto">
          {changes.map((change) => (
            <div
              key={change.id}
              className="flex items-start gap-2 p-2 bg-gray-900/50 rounded text-xs"
            >
              {getChangeIcon(change.change_type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-300">
                    {change.section_key}
                  </span>
                  <span className="text-gray-500">Pass {change.pass}</span>
                  {change.criteria_met.length > 0 && (
                    <span className="text-gray-600">
                      ({formatCriteria(change.criteria_met)})
                    </span>
                  )}
                </div>
                <p className="text-gray-400 mt-1 line-clamp-2">
                  {change.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

**Step 2: Verify build**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add components/drafting/GenerationChangesPanel.tsx
git commit -m "feat(ui): add GenerationChangesPanel component

Collapsible panel showing generation changes with:
- Summary badge (total changes, images added/modified)
- Detailed list with icons, section keys, pass numbers
- Criteria tags explaining why changes were made

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Integrate Panel in DraftingModal

**Files:**
- Modify: `components/modals/DraftingModal.tsx`

**Step 1: Add import**

Add at top of `DraftingModal.tsx`:

```typescript
import { GenerationChangesPanel } from '../drafting/GenerationChangesPanel';
```

**Step 2: Add panel to render**

Find a suitable location after the progress section (search for "progress" or "ContentGenerationProgress") and add:

```typescript
{/* Generation Changes Panel */}
{brief?.generation_changes && brief.generation_changes.length > 0 && (
  <GenerationChangesPanel
    changes={brief.generation_changes}
    summary={brief.generation_summary || null}
  />
)}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add components/modals/DraftingModal.tsx
git commit -m "feat(drafting): integrate GenerationChangesPanel

Shows generation changes in DraftingModal when brief has changes
from content generation.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Wire Change Tracker in useContentGeneration Hook

**Files:**
- Modify: `hooks/useContentGeneration.ts`

**Step 1: Find Pass 4/6 execution**

Search for `executePass4` or `pass_6_visuals` in the hook.

**Step 2: Add change tracker to Pass 4 call**

Before the Pass 4 call, get the tracker:

```typescript
// Get change tracker for this job
const changeTracker = orchestrator.getChangeTracker(jobId, brief.id);
```

Update the Pass 4 call to include the tracker:

```typescript
await executePass4(
  orchestrator,
  updatedJob,
  brief,
  businessInfo,
  handleSectionProgress,
  () => abortedRef.current,
  changeTracker  // Add this parameter
);
```

**Step 3: Finalize tracker at completion**

At the end of successful generation (after all passes), add:

```typescript
// Persist generation changes to brief
await orchestrator.finalizeChangeTracker(jobId);

// Refresh brief to get updated generation_changes
const { data: refreshedBrief } = await supabase
  .from('content_briefs')
  .select('*')
  .eq('id', brief.id)
  .single();

if (refreshedBrief) {
  // The brief state should be updated to include generation_changes
  console.log('[useContentGeneration] Brief updated with generation changes:',
    refreshedBrief.generation_summary);
}
```

**Step 4: Verify build**

Run: `npm run build`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add hooks/useContentGeneration.ts
git commit -m "feat(hook): wire change tracker through generation pipeline

Passes BriefChangeTracker to Pass 4 for image addition tracking.
Finalizes and persists changes at job completion.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Verification Checklist

After all tasks complete, run these verification tests:

**1. Build Test:**
```bash
npm run build
```
Expected: No errors

**2. Unit Tests:**
```bash
npx vitest run services/ai/contentGeneration/__tests__/
```
Expected: All tests pass

**3. Key Format Test:**
- Generate a content brief
- Check `enhanced_visual_semantics.section_images` keys are `section-0`, `section-1` format
- Run content generation
- Verify database `content_generation_sections.section_key` matches brief keys

**4. Image Count Test:**
- Create brief with 5 designated section images
- Run content generation
- Count `[IMAGE:]` placeholders in output - should be ~5-6 (hero + sections)
- If more, check `generation_changes` has entries explaining additions

**5. UI Test:**
- Run generation that triggers justified image additions
- Open DraftingModal
- Verify GenerationChangesPanel appears with change entries

---

## Files Changed Summary

| File | Action |
|------|--------|
| `types/content.ts` | MODIFY - Add types |
| `supabase/migrations/20260206100000_add_generation_changes.sql` | CREATE |
| `services/ai/contentGeneration/briefChangeTracker.ts` | CREATE |
| `services/ai/contentGeneration/__tests__/briefChangeTracker.test.ts` | CREATE |
| `services/ai/contentGeneration/__tests__/sectionKeyFormat.test.ts` | CREATE |
| `services/ai/contentGeneration/orchestrator.ts` | MODIFY - Key format + tracker |
| `services/ai/contentGeneration/rulesEngine/prompts/sectionPromptBuilder.ts` | MODIFY |
| `services/ai/contentGeneration/passes/pass4Visuals.ts` | MODIFY |
| `components/drafting/GenerationChangesPanel.tsx` | CREATE |
| `components/modals/DraftingModal.tsx` | MODIFY |
| `hooks/useContentGeneration.ts` | MODIFY |
