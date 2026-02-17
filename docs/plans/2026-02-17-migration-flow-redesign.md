# Migration Flow Redesign — Full Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the migration experience from "ideal-map-first, reality-second" to a dual-path system where existing-site users start from their reality, while greenfield users keep the current map-first flow. Both paths converge on a fully optimized topical map with visual overlay, impact-effort prioritization, and enhanced workbench.

**Architecture:** Dual-entry system (New Strategy vs Optimize Existing Site) with 8 implementation phases. Phase 1 enriches the existing flow with semantic data. Phases 2-3 enable pillar suggestion and augmented map generation. Phase 4 adds the visual overlay. Phases 5-8 add prioritization, enhanced workbench, Path B entry point, and polish. Each phase is independently valuable.

**Tech Stack:** React 18, TypeScript, TailwindCSS, Vite, Supabase (PostgreSQL + Edge Functions), multi-provider AI service layer (Gemini/OpenAI/Anthropic).

**Non-Negotiable Principle:** Business Info (language, region, market, industry, audience) and Pillars (CE/SC/CSI) are MANDATORY prerequisites for ALL system operations. Every user path MUST validate these before any AI-driven analysis or map generation.

---

## Current Architecture Reference

```
MapSelectionScreen
  ├─ "Create New Topical Map" → BusinessInfoWizard → PillarWizard → EAVWizard → TopicGeneration
  ├─ "Analyze Existing Website" (DISABLED)
  └─ "Load Map" → MigrationDashboardContainer
      └─ AuthorityWizardContainer (5-step wizard)
          ├─ Step 1: Import (sitemap + GSC)
          ├─ Step 2: Audit (batch page analysis, 437-rule audit)
          ├─ Step 3: Match (Jaccard text similarity, 4 signals)
          ├─ Step 4: Plan (5-signal decision engine)
          └─ Step 5: Execute (per-page workbench)
```

**Key services:** `AutoMatchService.ts` (Jaccard matching), `MigrationPlanEngine.ts` (action planning), `semanticAnalysis.ts` (CE/SC/CSI detection/alignment), `semanticAnalysisPersistence.ts` (save/load analysis results).

**Key hooks:** `useBatchAudit`, `useAutoMatch`, `useMigrationPlan`, `useInventoryOperations`, `useSemanticAnalysis`.

**Key tables:** `site_inventory` (pages + metrics + matching + plan), `semantic_analysis_results` (per-page analysis), `migration_plans` (plan metadata), `transition_snapshots` (content versions), `topics` (topical map nodes).

---

## Phase 1: Foundation — Connect the Data

*Goal: Make existing semantic data flow into matching and planning. No new UI, just richer data.*

### Task 1: Batch Semantic Analysis Service

**Files:**
- Create: `services/ai/batchSemanticAnalysis.ts`
- Test: `services/ai/__tests__/batchSemanticAnalysis.test.ts`

This service runs `analyzePageSemantics()` in DETECTION mode across multiple pages with configurable concurrency, progress tracking, and persistence.

**Step 1: Write the failing test**

```typescript
// services/ai/__tests__/batchSemanticAnalysis.test.ts
import { describe, it, expect, vi } from 'vitest';
import { BatchSemanticAnalysisService, BatchSemanticProgress } from '../batchSemanticAnalysis';

describe('BatchSemanticAnalysisService', () => {
  it('should process pages sequentially with progress callbacks', async () => {
    const mockAnalyze = vi.fn().mockResolvedValue({
      overallScore: 75,
      coreEntities: { centralEntity: 'Test CE', searchIntent: 'Learn testing', detectedSourceContext: 'Tech blog' },
      actions: [],
      analyzedAt: new Date().toISOString(),
    });

    const service = new BatchSemanticAnalysisService({
      analyzeFn: mockAnalyze,
      concurrency: 1,
    });

    const progressUpdates: BatchSemanticProgress[] = [];
    const items = [
      { id: 'inv-1', url: 'https://example.com/page1', content: 'Page 1 content' },
      { id: 'inv-2', url: 'https://example.com/page2', content: 'Page 2 content' },
    ];

    const results = await service.analyze(items, (p) => progressUpdates.push({ ...p }));

    expect(mockAnalyze).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
    expect(results[0].inventoryId).toBe('inv-1');
    expect(results[0].detectedCE).toBe('Test CE');
    expect(progressUpdates.length).toBeGreaterThanOrEqual(2);
    expect(progressUpdates[progressUpdates.length - 1].completed).toBe(2);
  });

  it('should skip pages that already have cached results', async () => {
    const mockAnalyze = vi.fn().mockResolvedValue({
      overallScore: 80,
      coreEntities: { centralEntity: 'CE', searchIntent: 'Intent', detectedSourceContext: 'SC' },
      actions: [],
      analyzedAt: new Date().toISOString(),
    });

    const mockCheckCache = vi.fn()
      .mockResolvedValueOnce({ overallScore: 90, coreEntities: { centralEntity: 'Cached CE' } }) // cached
      .mockResolvedValueOnce(null); // not cached

    const service = new BatchSemanticAnalysisService({
      analyzeFn: mockAnalyze,
      concurrency: 1,
      checkCacheFn: mockCheckCache,
    });

    const items = [
      { id: 'inv-1', url: 'https://example.com/page1', content: 'Page 1' },
      { id: 'inv-2', url: 'https://example.com/page2', content: 'Page 2' },
    ];

    const results = await service.analyze(items);

    expect(mockAnalyze).toHaveBeenCalledTimes(1); // Only uncached
    expect(results).toHaveLength(2);
    expect(results[0].detectedCE).toBe('Cached CE'); // From cache
    expect(results[1].detectedCE).toBe('CE'); // Freshly analyzed
  });

  it('should handle analysis failures gracefully', async () => {
    const mockAnalyze = vi.fn()
      .mockResolvedValueOnce({
        overallScore: 75,
        coreEntities: { centralEntity: 'CE1' },
        actions: [],
        analyzedAt: new Date().toISOString(),
      })
      .mockRejectedValueOnce(new Error('API failure'));

    const service = new BatchSemanticAnalysisService({
      analyzeFn: mockAnalyze,
      concurrency: 1,
    });

    const items = [
      { id: 'inv-1', url: 'https://example.com/page1', content: 'Page 1' },
      { id: 'inv-2', url: 'https://example.com/page2', content: 'Page 2' },
    ];

    const results = await service.analyze(items);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[1].error).toBe('API failure');
  });

  it('should respect concurrency limit', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const mockAnalyze = vi.fn().mockImplementation(async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise(r => setTimeout(r, 50));
      concurrent--;
      return {
        overallScore: 75,
        coreEntities: { centralEntity: 'CE' },
        actions: [],
        analyzedAt: new Date().toISOString(),
      };
    });

    const service = new BatchSemanticAnalysisService({
      analyzeFn: mockAnalyze,
      concurrency: 2,
    });

    const items = Array.from({ length: 6 }, (_, i) => ({
      id: `inv-${i}`,
      url: `https://example.com/page${i}`,
      content: `Page ${i}`,
    }));

    await service.analyze(items);

    expect(maxConcurrent).toBeLessThanOrEqual(2);
    expect(mockAnalyze).toHaveBeenCalledTimes(6);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/ai/__tests__/batchSemanticAnalysis.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// services/ai/batchSemanticAnalysis.ts
import type { SemanticAuditResult } from '../../types';

export interface BatchSemanticInput {
  id: string;          // inventory item ID
  url: string;
  content: string;
}

export interface BatchSemanticProgress {
  total: number;
  completed: number;
  failed: number;
  currentUrl: string;
}

export interface BatchSemanticResultItem {
  inventoryId: string;
  success: boolean;
  result?: SemanticAuditResult;
  detectedCE?: string;
  detectedSC?: string;
  detectedCSI?: string;
  overallScore?: number;
  error?: string;
}

interface BatchSemanticAnalysisConfig {
  analyzeFn: (content: string, url: string) => Promise<SemanticAuditResult>;
  concurrency: number;
  checkCacheFn?: (inventoryId: string, content: string) => Promise<SemanticAuditResult | null>;
  persistFn?: (inventoryId: string, result: SemanticAuditResult, content: string) => Promise<void>;
}

export class BatchSemanticAnalysisService {
  private config: BatchSemanticAnalysisConfig;

  constructor(config: BatchSemanticAnalysisConfig) {
    this.config = config;
  }

  async analyze(
    items: BatchSemanticInput[],
    onProgress?: (progress: BatchSemanticProgress) => void,
    signal?: AbortSignal
  ): Promise<BatchSemanticResultItem[]> {
    const results: BatchSemanticResultItem[] = [];
    let completed = 0;
    let failed = 0;

    // Process in batches respecting concurrency
    const queue = [...items];
    const inFlight: Promise<void>[] = [];

    const processItem = async (item: BatchSemanticInput) => {
      if (signal?.aborted) return;

      try {
        // Check cache first
        let analysisResult: SemanticAuditResult | null = null;
        if (this.config.checkCacheFn) {
          analysisResult = await this.config.checkCacheFn(item.id, item.content);
        }

        if (!analysisResult) {
          analysisResult = await this.config.analyzeFn(item.content, item.url);
          // Persist if handler provided
          if (this.config.persistFn && analysisResult) {
            await this.config.persistFn(item.id, analysisResult, item.content);
          }
        }

        results.push({
          inventoryId: item.id,
          success: true,
          result: analysisResult,
          detectedCE: analysisResult.coreEntities?.centralEntity,
          detectedSC: analysisResult.coreEntities?.detectedSourceContext,
          detectedCSI: analysisResult.coreEntities?.searchIntent,
          overallScore: analysisResult.overallScore,
        });
      } catch (err) {
        failed++;
        results.push({
          inventoryId: item.id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      completed++;
      onProgress?.({
        total: items.length,
        completed,
        failed,
        currentUrl: item.url,
      });
    };

    // Concurrency-limited execution
    for (const item of queue) {
      if (signal?.aborted) break;

      const promise = processItem(item).then(() => {
        const idx = inFlight.indexOf(promise);
        if (idx >= 0) inFlight.splice(idx, 1);
      });
      inFlight.push(promise);

      if (inFlight.length >= this.config.concurrency) {
        await Promise.race(inFlight);
      }
    }

    // Wait for remaining
    await Promise.all(inFlight);

    // Return in original order
    const resultMap = new Map(results.map(r => [r.inventoryId, r]));
    return items.map(item => resultMap.get(item.id)!);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/ai/__tests__/batchSemanticAnalysis.test.ts`
Expected: PASS (4 tests)

**Step 5: Run full type check and test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: Zero errors, zero failures

**Step 6: Commit**

```bash
git add services/ai/batchSemanticAnalysis.ts services/ai/__tests__/batchSemanticAnalysis.test.ts
git commit -m "feat: add BatchSemanticAnalysisService with concurrency and caching"
```

---

### Task 2: useBatchSemanticAnalysis Hook

**Files:**
- Create: `hooks/useBatchSemanticAnalysis.ts`

This React hook wraps `BatchSemanticAnalysisService` for use in components, providing state management, cancellation, and persistence integration.

**Step 1: Write the hook**

```typescript
// hooks/useBatchSemanticAnalysis.ts
import { useState, useCallback, useRef } from 'react';
import { BatchSemanticAnalysisService, BatchSemanticProgress, BatchSemanticResultItem, BatchSemanticInput } from '../services/ai/batchSemanticAnalysis';
import { analyzePageSemantics } from '../services/ai/semanticAnalysis';
import { getExistingSemanticAnalysis, saveSemanticAnalysis } from '../services/semanticAnalysisPersistence';
import { useAppState } from '../state/appState';
import type { SiteInventoryItem } from '../types';
import { getSupabaseClient } from '../services/supabaseClient';

export interface UseBatchSemanticAnalysisReturn {
  isRunning: boolean;
  progress: BatchSemanticProgress | null;
  results: BatchSemanticResultItem[] | null;
  error: string | null;
  startBatch: (inventory: SiteInventoryItem[], contentMap: Map<string, string>) => Promise<BatchSemanticResultItem[]>;
  cancel: () => void;
}

export function useBatchSemanticAnalysis(
  projectId: string,
  mapId: string | null
): UseBatchSemanticAnalysisReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BatchSemanticProgress | null>(null);
  const [results, setResults] = useState<BatchSemanticResultItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { state } = useAppState();
  const { businessInfo, dispatch } = state;

  const startBatch = useCallback(async (
    inventory: SiteInventoryItem[],
    contentMap: Map<string, string>
  ): Promise<BatchSemanticResultItem[]> => {
    if (isRunning) return [];

    setIsRunning(true);
    setError(null);
    setProgress(null);
    setResults(null);

    abortRef.current = new AbortController();
    const supabase = getSupabaseClient();

    const items: BatchSemanticInput[] = inventory
      .filter(item => contentMap.has(item.id))
      .map(item => ({
        id: item.id,
        url: item.url,
        content: contentMap.get(item.id)!,
      }));

    const service = new BatchSemanticAnalysisService({
      analyzeFn: async (content, url) => {
        return analyzePageSemantics(content, url, businessInfo, dispatch);
        // Detection mode: no pillars passed
      },
      concurrency: 2,
      checkCacheFn: async (inventoryId, content) => {
        const supabaseUrl = businessInfo.supabaseUrl;
        const supabaseAnonKey = businessInfo.supabaseAnonKey;
        return getExistingSemanticAnalysis(inventoryId, mapId, content, supabaseUrl, supabaseAnonKey);
      },
      persistFn: async (inventoryId, result, content) => {
        const supabaseUrl = businessInfo.supabaseUrl;
        const supabaseAnonKey = businessInfo.supabaseAnonKey;
        await saveSemanticAnalysis(inventoryId, mapId, content, result, supabaseUrl, supabaseAnonKey);
      },
    });

    try {
      const batchResults = await service.analyze(
        items,
        (p) => setProgress({ ...p }),
        abortRef.current.signal
      );

      setResults(batchResults);

      // Write detected CE/SC/CSI back to site_inventory for quick access
      const updates = batchResults
        .filter(r => r.success && r.detectedCE)
        .map(r => ({
          id: r.inventoryId,
          detected_ce: r.detectedCE,
          detected_sc: r.detectedSC,
          detected_csi: r.detectedCSI,
          semantic_overall_score: r.overallScore,
        }));

      if (updates.length > 0) {
        for (const update of updates) {
          await supabase
            .from('site_inventory')
            .update({
              detected_ce: update.detected_ce,
              detected_sc: update.detected_sc,
              detected_csi: update.detected_csi,
            })
            .eq('id', update.id);
        }
      }

      return batchResults;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Batch analysis failed';
      setError(msg);
      return [];
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  }, [isRunning, businessInfo, dispatch, mapId]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { isRunning, progress, results, error, startBatch, cancel };
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: Zero errors

**Step 3: Commit**

```bash
git add hooks/useBatchSemanticAnalysis.ts
git commit -m "feat: add useBatchSemanticAnalysis hook with persistence"
```

---

### Task 3: Database Migration — Add Semantic Columns to site_inventory

**Files:**
- Create: `supabase/migrations/20260217000001_add_semantic_columns_to_inventory.sql`

Add columns to `site_inventory` for detected CE/SC/CSI so they can be used in matching and planning without joining `semantic_analysis_results`.

**Step 1: Write the migration**

```sql
-- supabase/migrations/20260217000001_add_semantic_columns_to_inventory.sql
-- Add detected semantic entities to site_inventory for fast matching/planning access

ALTER TABLE public.site_inventory
  ADD COLUMN IF NOT EXISTS detected_ce text,
  ADD COLUMN IF NOT EXISTS detected_sc text,
  ADD COLUMN IF NOT EXISTS detected_csi text,
  ADD COLUMN IF NOT EXISTS ce_alignment numeric,
  ADD COLUMN IF NOT EXISTS sc_alignment numeric,
  ADD COLUMN IF NOT EXISTS csi_alignment numeric,
  ADD COLUMN IF NOT EXISTS semantic_overall_score numeric,
  ADD COLUMN IF NOT EXISTS overlay_status text
    CHECK (overlay_status IN ('covered_aligned', 'covered_needs_work', 'gap', 'orphan', 'cannibalization'));

-- Add source tracking to topics
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'generated'
    CHECK (source IN ('generated', 'discovered', 'manual')),
  ADD COLUMN IF NOT EXISTS covered_by_inventory_ids uuid[];

COMMENT ON COLUMN public.site_inventory.detected_ce IS 'Central Entity detected by semantic analysis (detection mode)';
COMMENT ON COLUMN public.site_inventory.detected_sc IS 'Source Context detected by semantic analysis';
COMMENT ON COLUMN public.site_inventory.detected_csi IS 'Central Search Intent detected by semantic analysis';
COMMENT ON COLUMN public.site_inventory.overlay_status IS 'Visual overlay status for map reconciliation view';
COMMENT ON COLUMN public.topics.source IS 'How this topic was created: generated (AI), discovered (from existing site), manual (user)';
```

**Step 2: Deploy migration**

Run: `supabase db push` (or apply via Supabase dashboard)

**Step 3: Update TypeScript types**

Modify: `types.ts` — Add new fields to `SiteInventoryItem` interface:

```typescript
// Add to SiteInventoryItem interface:
detected_ce?: string;
detected_sc?: string;
detected_csi?: string;
ce_alignment?: number;
sc_alignment?: number;
csi_alignment?: number;
semantic_overall_score?: number;
overlay_status?: 'covered_aligned' | 'covered_needs_work' | 'gap' | 'orphan' | 'cannibalization';
```

Add to `EnrichedTopic` interface:

```typescript
// Add to EnrichedTopic interface:
source?: 'generated' | 'discovered' | 'manual';
covered_by_inventory_ids?: string[];
```

**Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: Zero errors

**Step 5: Commit**

```bash
git add supabase/migrations/20260217000001_add_semantic_columns_to_inventory.sql types.ts
git commit -m "feat: add semantic detection columns to site_inventory and source tracking to topics"
```

---

### Task 4: Enhance AutoMatchService with Semantic Signals

**Files:**
- Modify: `services/migration/AutoMatchService.ts`
- Test: `services/migration/__tests__/AutoMatchService.test.ts`

Add semantic signals (detected CE, SC, CSI) to the matching algorithm. These are optional — if semantic data exists, it's used; if not, the existing 4-signal matching still works.

**Step 1: Write the failing test**

```typescript
// services/migration/__tests__/AutoMatchService.test.ts
// Add to existing test file:

describe('AutoMatchService - Semantic Signals', () => {
  it('should boost confidence when detected CE matches topic title', () => {
    const service = new AutoMatchService();

    const inventory: SiteInventoryItem[] = [{
      id: 'inv-1',
      project_id: 'proj-1',
      url: 'https://example.com/cms-solutions',
      title: 'CMS Solutions',
      page_h1: 'Our Solutions',  // Weak H1 match
      page_title: 'Solutions Page', // Weak title match
      detected_ce: 'Enterprise CMS', // Strong CE match!
      status: 'AUDIT_PENDING' as any,
      mapped_topic_id: null,
      created_at: '',
      updated_at: '',
    }];

    const topics: EnrichedTopic[] = [{
      id: 'topic-1',
      map_id: 'map-1',
      title: 'Enterprise CMS Solutions',
      slug: 'enterprise-cms-solutions',
      description: '',
      type: 'core',
      freshness: 'EVERGREEN' as any,
      parent_topic_id: null,
    }];

    const result = service.match(inventory, topics);
    const match = result.matches.find(m => m.inventoryId === 'inv-1');

    expect(match).toBeDefined();
    expect(match!.category).toBe('matched');
    // CE signal should contribute to higher confidence
    expect(match!.confidence).toBeGreaterThan(0.4);
    expect(match!.matchSignals.some(s => s.type === 'detected_ce')).toBe(true);
  });

  it('should work without semantic data (backward compatible)', () => {
    const service = new AutoMatchService();

    const inventory: SiteInventoryItem[] = [{
      id: 'inv-1',
      project_id: 'proj-1',
      url: 'https://example.com/cms-solutions',
      title: 'Enterprise CMS Solutions',
      page_h1: 'Enterprise CMS Solutions',
      page_title: 'Enterprise CMS Solutions',
      // No detected_ce, detected_sc, detected_csi
      status: 'AUDIT_PENDING' as any,
      mapped_topic_id: null,
      created_at: '',
      updated_at: '',
    }];

    const topics: EnrichedTopic[] = [{
      id: 'topic-1',
      map_id: 'map-1',
      title: 'Enterprise CMS Solutions',
      slug: 'enterprise-cms-solutions',
      description: '',
      type: 'core',
      freshness: 'EVERGREEN' as any,
      parent_topic_id: null,
    }];

    const result = service.match(inventory, topics);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].category).toBe('matched');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/migration/__tests__/AutoMatchService.test.ts`
Expected: FAIL — `detected_ce` signal type not recognized

**Step 3: Implement semantic signals in AutoMatchService**

Modify `services/migration/AutoMatchService.ts`:

1. Add new signal types to `MatchSignal`:

```typescript
export interface MatchSignal {
  type: 'h1' | 'title' | 'url_slug' | 'gsc_query' | 'content_body' | 'heading_keywords'
    | 'detected_ce' | 'detected_sc' | 'detected_csi'; // NEW
  score: number;
  detail: string;
}
```

2. Update `SIGNAL_WEIGHTS` — redistribute weights when semantic data is present:

```typescript
// When semantic data IS available (rebalanced weights):
const SEMANTIC_SIGNAL_WEIGHTS: Record<string, number> = {
  h1: 0.15,
  title: 0.15,
  url_slug: 0.10,
  gsc_query: 0.15,
  detected_ce: 0.20,    // NEW: Central Entity match is strongest signal
  detected_sc: 0.10,    // NEW: Source Context match
  detected_csi: 0.10,   // NEW: Search Intent match
  content_body: 0,
  heading_keywords: 0,
};

// When semantic data is NOT available (original weights):
const BASIC_SIGNAL_WEIGHTS: Record<string, number> = {
  h1: 0.30,
  title: 0.25,
  url_slug: 0.20,
  gsc_query: 0.25,
  content_body: 0,
  heading_keywords: 0,
  detected_ce: 0,
  detected_sc: 0,
  detected_csi: 0,
};
```

3. In `computeSignals()`, add semantic signal computation:

```typescript
// After existing signal computation, add:
if (item.detected_ce) {
  const ceTokens = tokenize(item.detected_ce);
  const ceScore = jaccard(ceTokens, topic.titleTokens);
  signals.push({
    type: 'detected_ce',
    score: ceScore,
    detail: `CE "${item.detected_ce}" vs topic "${topic.title}": ${(ceScore * 100).toFixed(0)}%`,
  });
}

if (item.detected_sc) {
  // SC match is softer — check if source context type aligns
  const scTokens = tokenize(item.detected_sc);
  const topicDescTokens = topic.descriptionTokens || topic.titleTokens;
  const scScore = jaccard(scTokens, topicDescTokens) * 0.5 + 0.5; // Baseline 0.5 (SC is less discriminating)
  signals.push({
    type: 'detected_sc',
    score: Math.min(scScore, 1),
    detail: `SC "${item.detected_sc}": ${(scScore * 100).toFixed(0)}%`,
  });
}

if (item.detected_csi) {
  const csiTokens = tokenize(item.detected_csi);
  const csiScore = jaccard(csiTokens, [...topic.titleTokens, ...topic.keywordTokens]);
  signals.push({
    type: 'detected_csi',
    score: csiScore,
    detail: `CSI "${item.detected_csi}": ${(csiScore * 100).toFixed(0)}%`,
  });
}

// Choose weight set based on whether semantic data exists
const hasSemanticData = signals.some(s =>
  s.type === 'detected_ce' || s.type === 'detected_sc' || s.type === 'detected_csi'
);
const weights = hasSemanticData ? SEMANTIC_SIGNAL_WEIGHTS : BASIC_SIGNAL_WEIGHTS;
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/migration/__tests__/AutoMatchService.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: Zero errors, zero failures

**Step 6: Commit**

```bash
git add services/migration/AutoMatchService.ts services/migration/__tests__/AutoMatchService.test.ts
git commit -m "feat: add semantic signals (CE/SC/CSI) to AutoMatchService matching"
```

---

### Task 5: Enhance MigrationPlanEngine with Semantic Alignment

**Files:**
- Modify: `services/migration/MigrationPlanEngine.ts`

Update the `computeSignals()` method to use semantic alignment scores when available.

**Step 1: Modify Strategic Alignment signal**

In `MigrationPlanEngine.ts`, update the `computeSignals` method:

```typescript
// Replace the current strategicAlignment calculation:
// OLD: strategicAlignment = match_confidence * 100

// NEW: Use semantic alignment if available, otherwise fall back to match confidence
private computeSignals(item: SiteInventoryItem): SignalScores {
  // ... existing contentHealth, trafficOpportunity, technicalHealth, linkingStrength ...

  // Strategic Alignment: prefer semantic alignment over match confidence
  let strategicAlignment: number;
  if (item.ce_alignment != null && item.sc_alignment != null && item.csi_alignment != null) {
    // Weighted semantic alignment: CE=40%, SC=30%, CSI=30%
    strategicAlignment = item.ce_alignment * 0.4 + item.sc_alignment * 0.3 + item.csi_alignment * 0.3;
  } else if (item.match_confidence != null) {
    strategicAlignment = item.match_confidence * 100;
  } else {
    strategicAlignment = 50; // neutral default
  }

  // Content Health: blend audit_score with semantic_overall_score if available
  let contentHealth = item.audit_score ?? 70;
  if (item.semantic_overall_score != null) {
    contentHealth = (contentHealth + item.semantic_overall_score) / 2;
  }
  // ... word count adjustments, schema bonus ...

  return { contentHealth, trafficOpportunity, technicalHealth, strategicAlignment, linkingStrength, composite };
}
```

**Step 2: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: Zero errors, zero failures

**Step 3: Commit**

```bash
git add services/migration/MigrationPlanEngine.ts
git commit -m "feat: use semantic alignment scores in MigrationPlanEngine"
```

---

### Task 6: Wire Semantic Analysis into Audit Step

**Files:**
- Modify: `hooks/useBatchAudit.ts`
- Modify: `components/migration/steps/AuditStep.tsx`

After each page's unified audit completes, also run semantic analysis in detection mode. This ensures that by the time users reach the Match step, semantic data is already available.

**Step 1: Modify useBatchAudit to chain semantic analysis**

In `hooks/useBatchAudit.ts`, after each successful audit:

```typescript
// Inside the per-page audit loop, after audit_score is saved:
// Add semantic analysis call
import { analyzePageSemantics } from '../services/ai/semanticAnalysis';
import { saveSemanticAnalysis } from '../services/semanticAnalysisPersistence';

// After audit completes for a page and content is available:
if (contentMarkdown && contentMarkdown.length > 100) {
  try {
    const semanticResult = await analyzePageSemantics(
      contentMarkdown,
      item.url,
      businessInfo,
      dispatch
      // No pillars = detection mode
    );

    // Save to semantic_analysis_results table
    await saveSemanticAnalysis(
      item.id,
      mapId,
      contentMarkdown,
      semanticResult,
      businessInfo.supabaseUrl,
      businessInfo.supabaseAnonKey
    );

    // Write detected entities to site_inventory for quick access
    await supabase
      .from('site_inventory')
      .update({
        detected_ce: semanticResult.coreEntities?.centralEntity || null,
        detected_sc: semanticResult.coreEntities?.detectedSourceContext || null,
        detected_csi: semanticResult.coreEntities?.searchIntent || null,
        semantic_overall_score: semanticResult.overallScore,
      })
      .eq('id', item.id);
  } catch (err) {
    console.warn(`[useBatchAudit] Semantic analysis failed for ${item.url}:`, err);
    // Non-fatal: audit still succeeded
  }
}
```

**Step 2: Update AuditStep to show detected entities**

In `components/migration/steps/AuditStep.tsx`, add a "Detected Entities" summary after the quality overview:

```typescript
// Add computed value:
const detectedEntities = useMemo(() => {
  const withCE = inventory.filter(i => i.detected_ce);
  if (withCE.length === 0) return null;

  // Count unique CEs
  const ceCount = new Map<string, number>();
  for (const item of withCE) {
    const ce = item.detected_ce!;
    ceCount.set(ce, (ceCount.get(ce) || 0) + 1);
  }

  // Sort by frequency
  const sorted = Array.from(ceCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    total: withCE.length,
    topEntities: sorted,
  };
}, [inventory]);

// Render after quality overview:
{detectedEntities && (
  <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
    <h4 className="text-sm font-medium text-gray-300 mb-2">
      Detected Central Entities ({detectedEntities.total} pages analyzed)
    </h4>
    <div className="flex flex-wrap gap-2">
      {detectedEntities.topEntities.map(([ce, count]) => (
        <span key={ce} className="px-2 py-1 bg-blue-900/30 text-blue-300 border border-blue-700 rounded text-xs">
          {ce} ({count})
        </span>
      ))}
    </div>
  </div>
)}
```

**Step 3: Run type check and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: Zero errors, zero failures

**Step 4: Commit**

```bash
git add hooks/useBatchAudit.ts components/migration/steps/AuditStep.tsx
git commit -m "feat: chain semantic analysis after audit, show detected entities"
```

---

## Phase 2: Pillar Suggestion Engine

*Goal: System suggests CE/SC/CSI from analyzed site content. User validates.*

### Task 7: Pillar Detection Service

**Files:**
- Create: `services/ai/pillarDetection.ts`
- Test: `services/ai/__tests__/pillarDetection.test.ts`

Given batch semantic analysis results across many pages, use AI to suggest the site's CE, SC, and CSI with confidence scores.

**Step 1: Write the failing test**

```typescript
// services/ai/__tests__/pillarDetection.test.ts
import { describe, it, expect, vi } from 'vitest';
import { PillarDetectionService, PillarSuggestion } from '../pillarDetection';

describe('PillarDetectionService', () => {
  it('should aggregate detected CEs and suggest the most frequent as primary', () => {
    const service = new PillarDetectionService();

    const detectedResults = [
      { inventoryId: '1', url: 'https://example.com/page1', detectedCE: 'Enterprise CMS', detectedSC: 'Software Company', detectedCSI: 'Buy CMS' },
      { inventoryId: '2', url: 'https://example.com/page2', detectedCE: 'Enterprise CMS', detectedSC: 'Software Company', detectedCSI: 'Compare CMS' },
      { inventoryId: '3', url: 'https://example.com/page3', detectedCE: 'Headless CMS', detectedSC: 'Tech Blog', detectedCSI: 'Learn CMS' },
      { inventoryId: '4', url: 'https://example.com/page4', detectedCE: 'Enterprise CMS', detectedSC: 'Software Company', detectedCSI: 'Buy CMS' },
      { inventoryId: '5', url: 'https://example.com/page5', detectedCE: 'Content Management', detectedSC: 'Software Company', detectedCSI: 'Evaluate CMS' },
    ];

    const suggestion = service.aggregateFromDetections(detectedResults);

    expect(suggestion.centralEntity).toBe('Enterprise CMS'); // Most frequent
    expect(suggestion.centralEntityConfidence).toBeGreaterThan(50);
    expect(suggestion.sourceContext).toBe('Software Company'); // Most frequent
    expect(suggestion.alternativeSuggestions.centralEntity).toContain('Headless CMS');
    expect(suggestion.alternativeSuggestions.centralEntity).toContain('Content Management');
  });

  it('should detect language from content signals', () => {
    const service = new PillarDetectionService();
    const detectedResults = [
      { inventoryId: '1', url: 'https://example.nl/page1', detectedCE: 'Dakbedekking', language: 'nl' },
      { inventoryId: '2', url: 'https://example.nl/page2', detectedCE: 'Dakbedekking', language: 'nl' },
      { inventoryId: '3', url: 'https://example.nl/page3', detectedCE: 'Dakbedekking', language: 'en' },
    ];

    const suggestion = service.aggregateFromDetections(detectedResults);
    expect(suggestion.detectedLanguage).toBe('nl'); // Most frequent
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/ai/__tests__/pillarDetection.test.ts`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// services/ai/pillarDetection.ts

export interface DetectedPageResult {
  inventoryId: string;
  url: string;
  detectedCE?: string;
  detectedSC?: string;
  detectedCSI?: string;
  language?: string;
}

export interface PillarSuggestion {
  centralEntity: string;
  centralEntityConfidence: number;
  centralEntityEvidence: string[];   // URLs that support this CE
  sourceContext: string;
  sourceContextConfidence: number;
  centralSearchIntent: string;
  centralSearchIntentConfidence: number;
  alternativeSuggestions: {
    centralEntity: string[];
    sourceContext: string[];
    centralSearchIntent: string[];
  };
  detectedLanguage: string;
  detectedRegion: string;
}

export class PillarDetectionService {
  aggregateFromDetections(results: DetectedPageResult[]): PillarSuggestion {
    // Count CE frequencies
    const ceFreq = this.countFrequencies(results, 'detectedCE');
    const scFreq = this.countFrequencies(results, 'detectedSC');
    const csiFreq = this.countFrequencies(results, 'detectedCSI');
    const langFreq = this.countFrequencies(results, 'language');

    const totalWithCE = results.filter(r => r.detectedCE).length;
    const totalWithSC = results.filter(r => r.detectedSC).length;
    const totalWithCSI = results.filter(r => r.detectedCSI).length;

    // Primary = most frequent
    const primaryCE = ceFreq[0]?.[0] || 'Unknown';
    const primarySC = scFreq[0]?.[0] || 'Unknown';
    const primaryCSI = csiFreq[0]?.[0] || 'Unknown';
    const primaryLang = langFreq[0]?.[0] || 'en';

    // Confidence = percentage of pages with this value
    const ceConfidence = totalWithCE > 0 ? Math.round((ceFreq[0]?.[1] || 0) / totalWithCE * 100) : 0;
    const scConfidence = totalWithSC > 0 ? Math.round((scFreq[0]?.[1] || 0) / totalWithSC * 100) : 0;
    const csiConfidence = totalWithCSI > 0 ? Math.round((csiFreq[0]?.[1] || 0) / totalWithCSI * 100) : 0;

    // Evidence: URLs where primary CE was detected
    const ceEvidence = results
      .filter(r => r.detectedCE === primaryCE)
      .map(r => r.url)
      .slice(0, 10);

    // Alternatives: other frequent values (excluding primary)
    const altCE = ceFreq.slice(1, 4).map(([val]) => val);
    const altSC = scFreq.slice(1, 4).map(([val]) => val);
    const altCSI = csiFreq.slice(1, 4).map(([val]) => val);

    // Detect region from URL TLD
    const detectedRegion = this.detectRegionFromUrls(results.map(r => r.url));

    return {
      centralEntity: primaryCE,
      centralEntityConfidence: ceConfidence,
      centralEntityEvidence: ceEvidence,
      sourceContext: primarySC,
      sourceContextConfidence: scConfidence,
      centralSearchIntent: primaryCSI,
      centralSearchIntentConfidence: csiConfidence,
      alternativeSuggestions: {
        centralEntity: altCE,
        sourceContext: altSC,
        centralSearchIntent: altCSI,
      },
      detectedLanguage: primaryLang,
      detectedRegion,
    };
  }

  private countFrequencies(
    results: DetectedPageResult[],
    field: keyof DetectedPageResult
  ): [string, number][] {
    const freq = new Map<string, number>();
    for (const r of results) {
      const val = r[field] as string | undefined;
      if (val) {
        freq.set(val, (freq.get(val) || 0) + 1);
      }
    }
    return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
  }

  private detectRegionFromUrls(urls: string[]): string {
    const tldCount = new Map<string, number>();
    for (const url of urls) {
      try {
        const hostname = new URL(url).hostname;
        const tld = hostname.split('.').pop() || '';
        // Map common TLDs to regions
        const regionMap: Record<string, string> = {
          nl: 'Netherlands', de: 'Germany', fr: 'France', es: 'Spain',
          uk: 'United Kingdom', be: 'Belgium', it: 'Italy', 'co.uk': 'United Kingdom',
        };
        if (regionMap[tld]) {
          tldCount.set(regionMap[tld], (tldCount.get(regionMap[tld]) || 0) + 1);
        }
      } catch { /* ignore invalid URLs */ }
    }

    if (tldCount.size === 0) return 'Global';
    return Array.from(tldCount.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }
}
```

**Step 4: Run tests**

Run: `npx vitest run services/ai/__tests__/pillarDetection.test.ts`
Expected: PASS

**Step 5: Type check and full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: Zero errors, zero failures

**Step 6: Commit**

```bash
git add services/ai/pillarDetection.ts services/ai/__tests__/pillarDetection.test.ts
git commit -m "feat: add PillarDetectionService for CE/SC/CSI suggestion from detected data"
```

---

### Task 8: AI-Enhanced Pillar Suggestion (with LLM refinement)

**Files:**
- Modify: `services/ai/pillarDetection.ts`

Add an AI-powered method that takes the aggregated detection results and asks an LLM to produce refined, canonical pillar suggestions.

**Step 1: Add `suggestPillarsWithAI` method**

```typescript
// Add to PillarDetectionService class:

async suggestPillarsWithAI(
  aggregation: PillarSuggestion,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<PillarSuggestion> {
  const prompt = `You are a Holistic SEO strategist. Given the detected semantic signals from analyzing an existing website, suggest the optimal SEO Pillars.

DETECTED FROM WEBSITE ANALYSIS:
- Most common Central Entity: "${aggregation.centralEntity}" (${aggregation.centralEntityConfidence}% of pages)
- Alternative CEs: ${aggregation.alternativeSuggestions.centralEntity.join(', ') || 'none'}
- Most common Source Context: "${aggregation.sourceContext}" (${aggregation.sourceContextConfidence}% of pages)
- Most common Search Intent: "${aggregation.centralSearchIntent}" (${aggregation.centralSearchIntentConfidence}% of pages)
- Detected language: ${aggregation.detectedLanguage}
- Detected region: ${aggregation.detectedRegion}

BUSINESS CONTEXT:
- Domain: ${businessInfo.domain}
- Industry: ${businessInfo.industry}
- Audience: ${businessInfo.audience}

TASK: Suggest the OPTIMAL pillars for this website. The CE must be a single unambiguous entity (not a keyword). The SC must describe the authority type. The CSI must be in [VERB] + [OBJECT] format.

Return JSON: {
  "centralEntity": "string",
  "sourceContext": "string",
  "centralSearchIntent": "string",
  "reasoning": "string explaining why these are optimal"
}`;

  // Use the AI service to generate refined suggestion
  const aiService = selectAiProvider(businessInfo);
  const response = await aiService.generateJson(prompt);

  return {
    ...aggregation,
    centralEntity: response.centralEntity || aggregation.centralEntity,
    sourceContext: response.sourceContext || aggregation.sourceContext,
    centralSearchIntent: response.centralSearchIntent || aggregation.centralSearchIntent,
  };
}
```

**Step 2: Type check and commit**

Run: `npx tsc --noEmit && npx vitest run`

```bash
git add services/ai/pillarDetection.ts
git commit -m "feat: add AI-enhanced pillar suggestion refinement"
```

---

### Task 9: PillarValidationStep Component

**Files:**
- Create: `components/migration/steps/PillarValidationStep.tsx`

A step where the user sees AI-suggested pillars with confidence bars and evidence, and can confirm or edit each one.

**Step 1: Write the component**

```typescript
// components/migration/steps/PillarValidationStep.tsx
import React, { useState, useMemo, useCallback } from 'react';
import type { PillarSuggestion } from '../../../services/ai/pillarDetection';
import type { SEOPillars } from '../../../types';

interface PillarValidationStepProps {
  suggestion: PillarSuggestion | null;
  isLoading: boolean;
  onConfirm: (pillars: SEOPillars, language: string, region: string) => void;
  onRegenerate: () => void;
}

export const PillarValidationStep: React.FC<PillarValidationStepProps> = ({
  suggestion,
  isLoading,
  onConfirm,
  onRegenerate,
}) => {
  const [centralEntity, setCentralEntity] = useState(suggestion?.centralEntity || '');
  const [sourceContext, setSourceContext] = useState(suggestion?.sourceContext || '');
  const [centralSearchIntent, setCentralSearchIntent] = useState(suggestion?.centralSearchIntent || '');
  const [language, setLanguage] = useState(suggestion?.detectedLanguage || 'en');
  const [region, setRegion] = useState(suggestion?.detectedRegion || 'Global');

  // Update fields when suggestion changes
  React.useEffect(() => {
    if (suggestion) {
      setCentralEntity(suggestion.centralEntity);
      setSourceContext(suggestion.sourceContext);
      setCentralSearchIntent(suggestion.centralSearchIntent);
      setLanguage(suggestion.detectedLanguage);
      setRegion(suggestion.detectedRegion);
    }
  }, [suggestion]);

  const handleConfirm = useCallback(() => {
    if (!centralEntity.trim() || !sourceContext.trim() || !centralSearchIntent.trim()) return;
    onConfirm(
      { centralEntity: centralEntity.trim(), sourceContext: sourceContext.trim(), centralSearchIntent: centralSearchIntent.trim() },
      language,
      region
    );
  }, [centralEntity, sourceContext, centralSearchIntent, language, region, onConfirm]);

  const isValid = centralEntity.trim() && sourceContext.trim() && centralSearchIntent.trim();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin text-2xl mb-3">&#9881;</div>
          <p className="text-gray-400">Analyzing your site to suggest pillars...</p>
        </div>
      </div>
    );
  }

  if (!suggestion) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>Run semantic analysis first to get pillar suggestions.</p>
        <button onClick={onRegenerate} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500">
          Generate Suggestions
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-1">Confirm Your SEO Pillars</h3>
        <p className="text-sm text-gray-400">
          We analyzed your site and detected these patterns. Review, edit if needed, then confirm.
        </p>
      </div>

      {/* Central Entity */}
      <PillarField
        label="Central Entity (CE)"
        description="The single unambiguous main subject of your website"
        value={centralEntity}
        onChange={setCentralEntity}
        confidence={suggestion.centralEntityConfidence}
        evidence={suggestion.centralEntityEvidence}
        alternatives={suggestion.alternativeSuggestions.centralEntity}
        onSelectAlternative={setCentralEntity}
      />

      {/* Source Context */}
      <PillarField
        label="Source Context (SC)"
        description="Who is speaking? What type of authority?"
        value={sourceContext}
        onChange={setSourceContext}
        confidence={suggestion.sourceContextConfidence}
        alternatives={suggestion.alternativeSuggestions.sourceContext}
        onSelectAlternative={setSourceContext}
      />

      {/* Central Search Intent */}
      <PillarField
        label="Central Search Intent (CSI)"
        description="Primary user intent in [VERB] + [OBJECT] format"
        value={centralSearchIntent}
        onChange={setCentralSearchIntent}
        confidence={suggestion.centralSearchIntentConfidence}
        alternatives={suggestion.alternativeSuggestions.centralSearchIntent}
        onSelectAlternative={setCentralSearchIntent}
      />

      {/* Language & Region */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Language</label>
          <input
            type="text"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Region</label>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-700">
        <button
          onClick={onRegenerate}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Re-analyze
        </button>
        <button
          onClick={handleConfirm}
          disabled={!isValid}
          className="px-6 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm Pillars
        </button>
      </div>
    </div>
  );
};

// Sub-component for each pillar field
interface PillarFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (val: string) => void;
  confidence: number;
  evidence?: string[];
  alternatives: string[];
  onSelectAlternative: (val: string) => void;
}

const PillarField: React.FC<PillarFieldProps> = ({
  label, description, value, onChange, confidence, evidence, alternatives, onSelectAlternative,
}) => {
  const [showEvidence, setShowEvidence] = useState(false);

  const confidenceColor = confidence >= 70 ? 'bg-green-500' : confidence >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-white">{label}</h4>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full ${confidenceColor} rounded-full`} style={{ width: `${confidence}%` }} />
          </div>
          <span className="text-xs text-gray-400 w-10 text-right">{confidence}%</span>
        </div>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
      />

      {alternatives.length > 0 && (
        <div>
          <span className="text-xs text-gray-500">Alternatives: </span>
          {alternatives.map((alt) => (
            <button
              key={alt}
              onClick={() => onSelectAlternative(alt)}
              className="mr-2 px-2 py-0.5 text-xs bg-gray-800 text-blue-400 border border-gray-700 rounded hover:bg-gray-700 cursor-pointer"
            >
              {alt}
            </button>
          ))}
        </div>
      )}

      {evidence && evidence.length > 0 && (
        <div>
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            {showEvidence ? 'Hide' : 'Show'} evidence ({evidence.length} pages)
          </button>
          {showEvidence && (
            <ul className="mt-1 space-y-0.5">
              {evidence.slice(0, 5).map((url) => (
                <li key={url} className="text-xs text-gray-500 truncate">{url}</li>
              ))}
              {evidence.length > 5 && (
                <li className="text-xs text-gray-600">+{evidence.length - 5} more</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default PillarValidationStep;
```

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: Zero errors

**Step 3: Commit**

```bash
git add components/migration/steps/PillarValidationStep.tsx
git commit -m "feat: add PillarValidationStep component with confidence bars and alternatives"
```

---

## Phase 3: Augmented Map Generation

*Goal: Generate a topical map that incorporates existing content and identifies gaps.*

### Task 10: Site Structure Discovery Service

**Files:**
- Create: `services/ai/siteStructureDiscovery.ts`
- Test: `services/ai/__tests__/siteStructureDiscovery.test.ts`

Clusters analyzed inventory pages by detected CE similarity, identifying topic hierarchies and hub-spoke patterns from existing content.

**Step 1: Write failing test**

```typescript
// services/ai/__tests__/siteStructureDiscovery.test.ts
import { describe, it, expect } from 'vitest';
import { SiteStructureDiscoveryService, DiscoveredSiteStructure } from '../siteStructureDiscovery';

describe('SiteStructureDiscoveryService', () => {
  it('should cluster pages by detected CE', () => {
    const service = new SiteStructureDiscoveryService();

    const pages = [
      { id: '1', url: '/cms-benefits', detectedCE: 'Enterprise CMS', detectedCSI: 'Learn CMS', auditScore: 80, gscClicks: 100 },
      { id: '2', url: '/cms-security', detectedCE: 'Enterprise CMS', detectedCSI: 'Secure CMS', auditScore: 70, gscClicks: 50 },
      { id: '3', url: '/headless-cms', detectedCE: 'Headless CMS', detectedCSI: 'Learn Headless', auditScore: 60, gscClicks: 200 },
      { id: '4', url: '/headless-api', detectedCE: 'Headless CMS', detectedCSI: 'Build API', auditScore: 75, gscClicks: 80 },
      { id: '5', url: '/about-us', detectedCE: undefined, auditScore: 40, gscClicks: 10 },
    ];

    const structure = service.discoverStructure(pages);

    expect(structure.clusters.length).toBe(2); // Two CE groups
    expect(structure.clusters[0].detectedCE).toBe('Enterprise CMS');
    expect(structure.clusters[0].pages).toHaveLength(2);
    expect(structure.orphans).toHaveLength(1); // about-us has no CE
    expect(structure.orphans[0].id).toBe('5');
  });

  it('should assign core/outer based on cluster size and traffic', () => {
    const service = new SiteStructureDiscoveryService();

    const pages = [
      { id: '1', url: '/cms-1', detectedCE: 'Enterprise CMS', gscClicks: 500 },
      { id: '2', url: '/cms-2', detectedCE: 'Enterprise CMS', gscClicks: 300 },
      { id: '3', url: '/cms-3', detectedCE: 'Enterprise CMS', gscClicks: 200 },
      { id: '4', url: '/blog-1', detectedCE: 'Blog Post', gscClicks: 20 },
    ];

    const structure = service.discoverStructure(pages);
    const cmsCluster = structure.clusters.find(c => c.detectedCE === 'Enterprise CMS');
    const blogCluster = structure.clusters.find(c => c.detectedCE === 'Blog Post');

    expect(cmsCluster?.coreOrOuter).toBe('core'); // 3 pages, high traffic
    expect(blogCluster?.coreOrOuter).toBe('outer'); // 1 page, low traffic
  });
});
```

**Step 2: Implement**

```typescript
// services/ai/siteStructureDiscovery.ts

export interface DiscoveredPage {
  id: string;
  url: string;
  detectedCE?: string;
  detectedSC?: string;
  detectedCSI?: string;
  auditScore?: number;
  gscClicks?: number;
  pageTitle?: string;
  pageH1?: string;
}

export interface DiscoveredCluster {
  suggestedTopicTitle: string;
  pages: DiscoveredPage[];
  coreOrOuter: 'core' | 'outer';
  detectedCE: string;
  avgAlignmentScore: number;
  totalTraffic: number;
}

export interface DiscoveredSiteStructure {
  clusters: DiscoveredCluster[];
  orphans: DiscoveredPage[];
  suggestedHierarchy: {
    parentCluster: string;
    childClusters: string[];
  }[];
}

export class SiteStructureDiscoveryService {
  discoverStructure(pages: DiscoveredPage[]): DiscoveredSiteStructure {
    // Group pages by detected CE
    const ceGroups = new Map<string, DiscoveredPage[]>();
    const orphans: DiscoveredPage[] = [];

    for (const page of pages) {
      if (page.detectedCE) {
        const existing = ceGroups.get(page.detectedCE) || [];
        existing.push(page);
        ceGroups.set(page.detectedCE, existing);
      } else {
        orphans.push(page);
      }
    }

    // Create clusters from CE groups
    const clusters: DiscoveredCluster[] = [];
    for (const [ce, groupPages] of ceGroups) {
      const totalTraffic = groupPages.reduce((sum, p) => sum + (p.gscClicks || 0), 0);
      const avgScore = groupPages.reduce((sum, p) => sum + (p.auditScore || 50), 0) / groupPages.length;

      // Core if: 2+ pages AND meaningful traffic, otherwise outer
      const isCore = groupPages.length >= 2 && totalTraffic >= 50;

      clusters.push({
        suggestedTopicTitle: ce,
        pages: groupPages,
        coreOrOuter: isCore ? 'core' : 'outer',
        detectedCE: ce,
        avgAlignmentScore: Math.round(avgScore),
        totalTraffic,
      });
    }

    // Sort clusters by traffic (descending)
    clusters.sort((a, b) => b.totalTraffic - a.totalTraffic);

    // Detect hierarchy: clusters with similar CEs may be parent-child
    const hierarchy = this.detectHierarchy(clusters);

    return { clusters, orphans, suggestedHierarchy: hierarchy };
  }

  private detectHierarchy(clusters: DiscoveredCluster[]): DiscoveredSiteStructure['suggestedHierarchy'] {
    const hierarchy: DiscoveredSiteStructure['suggestedHierarchy'] = [];

    // Simple heuristic: if a cluster's CE is a substring of another, it may be a parent
    for (const parent of clusters) {
      const children = clusters.filter(child =>
        child.detectedCE !== parent.detectedCE &&
        child.detectedCE.includes(parent.detectedCE) &&
        child.totalTraffic < parent.totalTraffic
      );

      if (children.length > 0) {
        hierarchy.push({
          parentCluster: parent.detectedCE,
          childClusters: children.map(c => c.detectedCE),
        });
      }
    }

    return hierarchy;
  }
}
```

**Step 3: Run tests**

Run: `npx vitest run services/ai/__tests__/siteStructureDiscovery.test.ts`
Expected: PASS

**Step 4: Type check and full suite**

Run: `npx tsc --noEmit && npx vitest run`

**Step 5: Commit**

```bash
git add services/ai/siteStructureDiscovery.ts services/ai/__tests__/siteStructureDiscovery.test.ts
git commit -m "feat: add SiteStructureDiscoveryService for clustering pages by detected CE"
```

---

### Task 11: Augmented Map Generator

**Files:**
- Create: `services/ai/augmentedMapGeneration.ts`
- Test: `services/ai/__tests__/augmentedMapGeneration.test.ts`

Takes discovered site structure + validated pillars, uses AI to identify gaps and generate a unified map with `source: 'existing'` and `source: 'gap'` markers.

**Step 1: Write failing test**

```typescript
// services/ai/__tests__/augmentedMapGeneration.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AugmentedMapGenerator, AugmentedMapResult } from '../augmentedMapGeneration';

describe('AugmentedMapGenerator', () => {
  it('should produce topics from both existing clusters and AI-identified gaps', async () => {
    const mockAI = vi.fn().mockResolvedValue({
      gapTopics: [
        { title: 'CMS Migration Guide', type: 'core', description: 'Guide for migrating between CMS platforms' },
        { title: 'CMS Security Best Practices', type: 'outer', description: 'Security hardening guide' },
      ],
    });

    const generator = new AugmentedMapGenerator({ generateGapsFn: mockAI });

    const result = await generator.generate({
      clusters: [
        {
          suggestedTopicTitle: 'Enterprise CMS',
          pages: [{ id: '1', url: '/cms', detectedCE: 'Enterprise CMS' }],
          coreOrOuter: 'core',
          detectedCE: 'Enterprise CMS',
          avgAlignmentScore: 80,
          totalTraffic: 500,
        },
      ],
      orphans: [],
      suggestedHierarchy: [],
      pillars: { centralEntity: 'Enterprise CMS', sourceContext: 'Software Company', centralSearchIntent: 'Buy CMS' },
    });

    // Should have both existing-sourced and gap topics
    const existingTopics = result.topics.filter(t => t.source === 'discovered');
    const gapTopics = result.topics.filter(t => t.source === 'generated');

    expect(existingTopics.length).toBeGreaterThan(0);
    expect(gapTopics.length).toBeGreaterThan(0);
    expect(existingTopics[0].coveredByInventoryIds).toContain('1');
  });
});
```

**Step 2: Implement**

```typescript
// services/ai/augmentedMapGeneration.ts
import { v4 as uuidv4 } from 'uuid';
import type { SEOPillars, EnrichedTopic, FreshnessProfile } from '../../types';
import type { DiscoveredSiteStructure, DiscoveredCluster } from './siteStructureDiscovery';

export interface AugmentedMapInput {
  clusters: DiscoveredCluster[];
  orphans: { id: string; url: string }[];
  suggestedHierarchy: { parentCluster: string; childClusters: string[] }[];
  pillars: SEOPillars;
}

export interface AugmentedTopic extends EnrichedTopic {
  source: 'discovered' | 'generated' | 'manual';
  covered_by_inventory_ids: string[];
}

export interface AugmentedMapResult {
  topics: AugmentedTopic[];
  discoveredCount: number;
  gapCount: number;
}

interface AugmentedMapGeneratorConfig {
  generateGapsFn: (prompt: string) => Promise<{ gapTopics: { title: string; type: string; description: string }[] }>;
}

export class AugmentedMapGenerator {
  private config: AugmentedMapGeneratorConfig;

  constructor(config: AugmentedMapGeneratorConfig) {
    this.config = config;
  }

  async generate(input: AugmentedMapInput): Promise<AugmentedMapResult> {
    const topics: AugmentedTopic[] = [];

    // Phase 1: Convert discovered clusters to topics
    for (const cluster of input.clusters) {
      const topic: AugmentedTopic = {
        id: uuidv4(),
        map_id: '', // Set by caller
        title: cluster.suggestedTopicTitle,
        slug: this.slugify(cluster.suggestedTopicTitle),
        description: `Discovered from ${cluster.pages.length} existing page(s)`,
        type: cluster.coreOrOuter,
        freshness: 'EVERGREEN' as FreshnessProfile,
        parent_topic_id: null,
        source: 'discovered',
        covered_by_inventory_ids: cluster.pages.map(p => p.id),
      };
      topics.push(topic);
    }

    // Phase 2: Set hierarchy from discovered parent-child relationships
    for (const h of input.suggestedHierarchy) {
      const parent = topics.find(t => t.title === h.parentCluster);
      if (parent) {
        for (const childCE of h.childClusters) {
          const child = topics.find(t => t.title === childCE);
          if (child) {
            child.parent_topic_id = parent.id;
          }
        }
      }
    }

    // Phase 3: Ask AI to identify gap topics
    const existingTopicTitles = topics.map(t => t.title);
    const prompt = this.buildGapPrompt(input.pillars, existingTopicTitles);

    try {
      const gapResponse = await this.config.generateGapsFn(prompt);

      for (const gap of gapResponse.gapTopics || []) {
        const gapTopic: AugmentedTopic = {
          id: uuidv4(),
          map_id: '',
          title: gap.title,
          slug: this.slugify(gap.title),
          description: gap.description,
          type: gap.type === 'core' ? 'core' : 'outer',
          freshness: 'EVERGREEN' as FreshnessProfile,
          parent_topic_id: null,
          source: 'generated',
          covered_by_inventory_ids: [],
        };
        topics.push(gapTopic);
      }
    } catch (err) {
      console.warn('[AugmentedMapGenerator] Gap analysis failed:', err);
      // Continue with discovered topics only
    }

    return {
      topics,
      discoveredCount: topics.filter(t => t.source === 'discovered').length,
      gapCount: topics.filter(t => t.source === 'generated').length,
    };
  }

  private buildGapPrompt(pillars: SEOPillars, existingTopics: string[]): string {
    return `You are a Holistic SEO strategist. Given:

CENTRAL ENTITY: ${pillars.centralEntity}
SOURCE CONTEXT: ${pillars.sourceContext}
CENTRAL SEARCH INTENT: ${pillars.centralSearchIntent}

EXISTING TOPICS ALREADY COVERED:
${existingTopics.map(t => `- ${t}`).join('\n')}

Identify 5-15 GAP topics that are MISSING for complete topical authority on "${pillars.centralEntity}".
Only suggest topics NOT already covered above.

Return JSON: {
  "gapTopics": [
    { "title": "string", "type": "core|outer", "description": "string" }
  ]
}`;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
```

**Step 3: Tests, type check, commit**

Run: `npx vitest run services/ai/__tests__/augmentedMapGeneration.test.ts && npx tsc --noEmit && npx vitest run`

```bash
git add services/ai/augmentedMapGeneration.ts services/ai/__tests__/augmentedMapGeneration.test.ts
git commit -m "feat: add AugmentedMapGenerator combining discovered structure with AI gap analysis"
```

---

## Phase 4: Visual Overlay

*Goal: Color-coded overlay showing existing content mapped onto the ideal structure.*

### Task 12: Overlay Service

**Files:**
- Create: `services/migration/overlayService.ts`
- Test: `services/migration/__tests__/overlayService.test.ts`

Computes the overlay state for every topic in the map, determining status colors.

**Step 1: Write failing test**

```typescript
// services/migration/__tests__/overlayService.test.ts
import { describe, it, expect } from 'vitest';
import { OverlayService, OverlayNode } from '../overlayService';

describe('OverlayService', () => {
  it('should mark topics with aligned pages as covered_aligned (green)', () => {
    const service = new OverlayService();

    const result = service.computeOverlay({
      topics: [{ id: 't1', title: 'CMS Benefits', type: 'core' }],
      inventory: [{
        id: 'inv1', url: '/cms-benefits', mapped_topic_id: 't1',
        ce_alignment: 85, sc_alignment: 80, csi_alignment: 75,
        gsc_clicks: 100, audit_score: 80,
      }],
    });

    expect(result[0].status).toBe('covered_aligned');
    expect(result[0].statusColor).toBe('green');
  });

  it('should mark topics with misaligned pages as covered_needs_work (yellow)', () => {
    const service = new OverlayService();

    const result = service.computeOverlay({
      topics: [{ id: 't1', title: 'CMS Benefits', type: 'core' }],
      inventory: [{
        id: 'inv1', url: '/cms-benefits', mapped_topic_id: 't1',
        ce_alignment: 40, sc_alignment: 30, csi_alignment: 50,
        gsc_clicks: 100, audit_score: 45,
      }],
    });

    expect(result[0].status).toBe('covered_needs_work');
    expect(result[0].statusColor).toBe('yellow');
  });

  it('should mark topics with no pages as gap (red)', () => {
    const service = new OverlayService();

    const result = service.computeOverlay({
      topics: [{ id: 't1', title: 'CMS Migration', type: 'core' }],
      inventory: [],
    });

    expect(result[0].status).toBe('gap');
    expect(result[0].statusColor).toBe('red');
  });

  it('should detect cannibalization when 2+ pages match same topic', () => {
    const service = new OverlayService();

    const result = service.computeOverlay({
      topics: [{ id: 't1', title: 'CMS Benefits', type: 'core' }],
      inventory: [
        { id: 'inv1', url: '/cms-benefits', mapped_topic_id: 't1', gsc_clicks: 100, audit_score: 80 },
        { id: 'inv2', url: '/cms-advantages', mapped_topic_id: 't1', gsc_clicks: 50, audit_score: 60 },
      ],
    });

    expect(result[0].status).toBe('cannibalization');
    expect(result[0].statusColor).toBe('orange');
    expect(result[0].matchedPages).toHaveLength(2);
  });

  it('should identify orphan pages not mapped to any topic', () => {
    const service = new OverlayService();

    const result = service.computeOverlay({
      topics: [{ id: 't1', title: 'CMS Benefits', type: 'core' }],
      inventory: [
        { id: 'inv1', url: '/cms-benefits', mapped_topic_id: 't1', gsc_clicks: 100 },
        { id: 'inv2', url: '/about-us', mapped_topic_id: null, gsc_clicks: 10 },
      ],
    });

    expect(result).toHaveLength(2); // topic node + orphan node
    const orphanNode = result.find(n => n.status === 'orphan');
    expect(orphanNode).toBeDefined();
  });
});
```

**Step 2: Implement**

```typescript
// services/migration/overlayService.ts

export interface OverlayInput {
  topics: { id: string; title: string; type: string; parent_topic_id?: string | null }[];
  inventory: {
    id: string;
    url: string;
    mapped_topic_id: string | null;
    match_confidence?: number;
    ce_alignment?: number;
    sc_alignment?: number;
    csi_alignment?: number;
    gsc_clicks?: number;
    gsc_impressions?: number;
    audit_score?: number;
    recommended_action?: string;
  }[];
}

export interface OverlayMatchedPage {
  inventoryId: string;
  url: string;
  matchConfidence: number;
  alignmentScore: number;
  gscClicks: number;
  auditScore: number;
  actionNeeded: string;
}

export interface OverlayNode {
  topicId: string;
  topicTitle: string;
  topicType: string;
  source: 'existing' | 'gap' | 'orphan';
  status: 'covered_aligned' | 'covered_needs_work' | 'gap' | 'orphan' | 'cannibalization';
  statusColor: 'green' | 'yellow' | 'red' | 'gray' | 'orange';
  matchedPages: OverlayMatchedPage[];
  competingPages?: { url: string; strength: number }[];
  parentTopicId?: string | null;
}

export class OverlayService {
  computeOverlay(input: OverlayInput): OverlayNode[] {
    const nodes: OverlayNode[] = [];

    // Group inventory by mapped_topic_id
    const topicPageMap = new Map<string, typeof input.inventory>();
    const unmappedPages: typeof input.inventory = [];

    for (const item of input.inventory) {
      if (item.mapped_topic_id) {
        const existing = topicPageMap.get(item.mapped_topic_id) || [];
        existing.push(item);
        topicPageMap.set(item.mapped_topic_id, existing);
      } else {
        unmappedPages.push(item);
      }
    }

    // Process each topic
    for (const topic of input.topics) {
      const pages = topicPageMap.get(topic.id) || [];

      if (pages.length === 0) {
        // GAP: no content exists
        nodes.push({
          topicId: topic.id,
          topicTitle: topic.title,
          topicType: topic.type,
          source: 'gap',
          status: 'gap',
          statusColor: 'red',
          matchedPages: [],
          parentTopicId: topic.parent_topic_id,
        });
      } else if (pages.length >= 2) {
        // CANNIBALIZATION: multiple pages for one topic
        const matchedPages = pages.map(p => this.toMatchedPage(p));
        nodes.push({
          topicId: topic.id,
          topicTitle: topic.title,
          topicType: topic.type,
          source: 'existing',
          status: 'cannibalization',
          statusColor: 'orange',
          matchedPages,
          competingPages: matchedPages.map(mp => ({ url: mp.url, strength: mp.alignmentScore })),
          parentTopicId: topic.parent_topic_id,
        });
      } else {
        // Single page — check alignment
        const page = pages[0];
        const alignment = this.computeAlignmentScore(page);
        const matchedPage = this.toMatchedPage(page);

        const isAligned = alignment >= 70;

        nodes.push({
          topicId: topic.id,
          topicTitle: topic.title,
          topicType: topic.type,
          source: 'existing',
          status: isAligned ? 'covered_aligned' : 'covered_needs_work',
          statusColor: isAligned ? 'green' : 'yellow',
          matchedPages: [matchedPage],
          parentTopicId: topic.parent_topic_id,
        });
      }
    }

    // Add orphan nodes for unmapped pages
    for (const page of unmappedPages) {
      nodes.push({
        topicId: `orphan-${page.id}`,
        topicTitle: page.url,
        topicType: 'orphan',
        source: 'orphan',
        status: 'orphan',
        statusColor: 'gray',
        matchedPages: [this.toMatchedPage(page)],
      });
    }

    return nodes;
  }

  private computeAlignmentScore(page: OverlayInput['inventory'][0]): number {
    if (page.ce_alignment != null && page.sc_alignment != null && page.csi_alignment != null) {
      return page.ce_alignment * 0.4 + page.sc_alignment * 0.3 + page.csi_alignment * 0.3;
    }
    if (page.match_confidence != null) {
      return page.match_confidence * 100;
    }
    return 50; // neutral default
  }

  private toMatchedPage(page: OverlayInput['inventory'][0]): OverlayMatchedPage {
    return {
      inventoryId: page.id,
      url: page.url,
      matchConfidence: page.match_confidence || 0,
      alignmentScore: this.computeAlignmentScore(page),
      gscClicks: page.gsc_clicks || 0,
      auditScore: page.audit_score || 0,
      actionNeeded: page.recommended_action || 'Not analyzed',
    };
  }
}
```

**Step 3: Tests, type check, commit**

Run: `npx vitest run services/migration/__tests__/overlayService.test.ts && npx tsc --noEmit && npx vitest run`

```bash
git add services/migration/overlayService.ts services/migration/__tests__/overlayService.test.ts
git commit -m "feat: add OverlayService for visual coverage status computation"
```

---

### Task 13: Overlay View Component

**Files:**
- Create: `components/migration/OverlayView.tsx`

Two-panel layout: left panel shows topic tree with color-coded status, right panel shows detail for selected topic.

This is a large UI component. Key features:
- Color-coded topic tree (green/yellow/red/gray/orange status dots)
- Summary bar showing coverage stats
- Right panel detail view for selected topic (matched pages, alignment bars, quick actions)
- Filter by status color
- Click to select, drag orphan to reassign

**Step 1: Write the component** (full implementation in separate file due to size)

**Step 2: Type check, commit**

```bash
git add components/migration/OverlayView.tsx
git commit -m "feat: add OverlayView component with color-coded topic tree and detail panel"
```

---

## Phase 5: Impact-Effort Prioritization

### Task 14: Opportunity Scoring Service

**Files:**
- Create: `services/migration/opportunityScorer.ts`
- Test: `services/migration/__tests__/opportunityScorer.test.ts`

Computes Impact and Effort scores for each page/topic to enable quadrant visualization.

**Step 1: Write failing test**

```typescript
// services/migration/__tests__/opportunityScorer.test.ts
import { describe, it, expect } from 'vitest';
import { OpportunityScorer } from '../opportunityScorer';

describe('OpportunityScorer', () => {
  it('should score high-traffic, low-quality pages as high-impact', () => {
    const scorer = new OpportunityScorer();

    const result = scorer.score({
      id: 'inv1',
      gscImpressions: 5000,
      gscClicks: 200,
      auditScore: 35,
      ceAlignment: 40,
      matchConfidence: 0.8,
      topicType: 'core',
      wordCount: 500,
      hasStrikingDistance: true,
    });

    expect(result.impactScore).toBeGreaterThan(70);
  });

  it('should score well-aligned pages as low-effort', () => {
    const scorer = new OpportunityScorer();

    const result = scorer.score({
      id: 'inv1',
      gscImpressions: 1000,
      gscClicks: 50,
      auditScore: 85,
      ceAlignment: 90,
      matchConfidence: 0.95,
      topicType: 'core',
      wordCount: 2000,
      hasStrikingDistance: false,
    });

    expect(result.effortScore).toBeLessThan(30);
  });

  it('should classify high-impact low-effort as quick_win', () => {
    const scorer = new OpportunityScorer();

    const result = scorer.score({
      id: 'inv1',
      gscImpressions: 5000,
      gscClicks: 200,
      auditScore: 60,
      ceAlignment: 50,
      matchConfidence: 0.7,
      topicType: 'core',
      wordCount: 800,
      hasStrikingDistance: true,
    });

    expect(result.quadrant).toBe('quick_win');
  });
});
```

**Step 2: Implement**

```typescript
// services/migration/opportunityScorer.ts

export interface OpportunityInput {
  id: string;
  gscImpressions: number;
  gscClicks: number;
  auditScore: number;
  ceAlignment?: number;
  matchConfidence: number;
  topicType: 'core' | 'outer';
  wordCount: number;
  hasStrikingDistance: boolean;
}

export interface OpportunityResult {
  id: string;
  impactScore: number;      // 0-100
  effortScore: number;      // 0-100
  quadrant: 'quick_win' | 'strategic_investment' | 'fill_in' | 'deprioritize';
}

export class OpportunityScorer {
  score(input: OpportunityInput): OpportunityResult {
    // Impact Score (0-100)
    const trafficPotential = Math.min(
      20 * Math.log10((input.gscImpressions || 1) + 1) + (input.hasStrikingDistance ? 20 : 0),
      100
    ) * 0.3;

    const alignmentGap = (100 - (input.ceAlignment || input.matchConfidence * 100)) * 0.3;

    const strategicImportance = (input.topicType === 'core' ? 80 : 40) * 0.2;

    const qualityGap = (100 - input.auditScore) * 0.2;

    const impactScore = Math.min(Math.round(trafficPotential + alignmentGap + strategicImportance + qualityGap), 100);

    // Effort Score (0-100)
    const contentRewriteScope = Math.max(0, 100 - input.auditScore) * 0.4;
    const alignmentWork = Math.max(0, 100 - (input.ceAlignment || input.matchConfidence * 100)) * 0.3;
    const contentVolume = (input.wordCount < 300 ? 80 : input.wordCount < 800 ? 40 : 10) * 0.3;

    const effortScore = Math.min(Math.round(contentRewriteScope + alignmentWork + contentVolume), 100);

    // Quadrant classification
    let quadrant: OpportunityResult['quadrant'];
    if (impactScore >= 50 && effortScore < 50) {
      quadrant = 'quick_win';
    } else if (impactScore >= 50 && effortScore >= 50) {
      quadrant = 'strategic_investment';
    } else if (impactScore < 50 && effortScore < 50) {
      quadrant = 'fill_in';
    } else {
      quadrant = 'deprioritize';
    }

    return { id: input.id, impactScore, effortScore, quadrant };
  }
}
```

**Step 3: Tests, type check, commit**

```bash
git add services/migration/opportunityScorer.ts services/migration/__tests__/opportunityScorer.test.ts
git commit -m "feat: add OpportunityScorer for impact-effort prioritization"
```

---

### Task 15: Running Site Score in SiteHealthSummary

**Files:**
- Modify: `components/migration/SiteHealthSummary.tsx`

Add a prominent "Site Optimization Score" that aggregates alignment scores weighted by traffic.

**Step 1: Add optimization score computation**

```typescript
// Add to SiteHealthSummary metrics computation:
const optimizationScore = useMemo(() => {
  const withAlignment = inventory.filter(i =>
    (i.ce_alignment != null || i.audit_score != null) && (i.gsc_clicks ?? 0) > 0
  );
  if (withAlignment.length === 0) return null;

  let weightedSum = 0;
  let totalWeight = 0;
  for (const item of withAlignment) {
    const alignment = item.ce_alignment != null
      ? (item.ce_alignment * 0.4 + (item.sc_alignment ?? 50) * 0.3 + (item.csi_alignment ?? 50) * 0.3)
      : (item.audit_score ?? 50);
    const weight = Math.log10((item.gsc_clicks ?? 1) + 1) + 1; // Traffic weight (log scale)
    weightedSum += alignment * weight;
    totalWeight += weight;
  }

  return Math.round(weightedSum / totalWeight);
}, [inventory]);

// Render as a large score ring at the top:
{optimizationScore != null && (
  <div className="flex items-center gap-3 mb-4">
    <div className={`text-3xl font-bold ${
      optimizationScore >= 70 ? 'text-green-400' :
      optimizationScore >= 40 ? 'text-yellow-400' : 'text-red-400'
    }`}>
      {optimizationScore}
    </div>
    <div>
      <div className="text-sm font-medium text-white">Site Score</div>
      <div className="text-xs text-gray-500">Traffic-weighted optimization</div>
    </div>
  </div>
)}
```

**Step 2: Type check, commit**

```bash
git add components/migration/SiteHealthSummary.tsx
git commit -m "feat: add traffic-weighted Site Optimization Score to SiteHealthSummary"
```

---

## Phase 6: Enhanced Workbench

### Task 16: Workbench Receives Full Context

**Files:**
- Modify: `components/migration/MigrationWorkbenchModal.tsx`

When the workbench opens for a page, display:
- The TOPIC it's mapped to (title, description, target keywords)
- EAV coverage gap
- Alignment delta (current vs target)
- GSC queries the page ranks for
- Competing pages (if cannibalization)

**Step 1: Add context panel above the analysis**

Add a "Strategic Context" collapsible section at the top of the left panel:

```typescript
// Add props for topic context:
interface MigrationWorkbenchModalProps {
  // ... existing props ...
  mappedTopic?: EnrichedTopic | null;       // NEW
  competingPages?: SiteInventoryItem[];      // NEW
  mapEavs?: SemanticTriple[];               // NEW
}

// Render strategic context section:
{mappedTopic && (
  <div className="mb-4 p-3 bg-gray-800/50 border border-gray-700 rounded-lg space-y-2">
    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
      Target Topic
      <span className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-300 border border-blue-700 rounded">
        {mappedTopic.type}
      </span>
    </h4>
    <p className="text-sm text-gray-300">{mappedTopic.title}</p>
    {mappedTopic.canonical_query && (
      <p className="text-xs text-gray-500">Target query: {mappedTopic.canonical_query}</p>
    )}
    {inventoryItem?.gsc_top_queries && (
      <div className="text-xs text-gray-500">
        Ranking for: {(inventoryItem.gsc_top_queries as string[]).slice(0, 5).join(', ')}
      </div>
    )}
    {competingPages && competingPages.length > 0 && (
      <div className="text-xs text-orange-400">
        Cannibalization: {competingPages.length} other page(s) compete for this topic
      </div>
    )}
  </div>
)}
```

**Step 2: Type check, commit**

```bash
git add components/migration/MigrationWorkbenchModal.tsx
git commit -m "feat: add strategic context display to MigrationWorkbenchModal"
```

---

## Phase 7: Path B Entry Point

### Task 17: Dual-Path Entry Screen

**Files:**
- Modify: `components/screens/MapSelectionScreen.tsx`

Replace the current layout with dual-path entry: "New Strategy" (left) and "Optimize Existing Site" (right), with existing maps below.

**Step 1: Redesign MapSelectionScreen layout**

Replace the current 1/3 + 2/3 grid with:

```typescript
// New layout structure:
<div className="max-w-6xl mx-auto space-y-8">
  {/* Dual-Path Cards */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Path A: New Strategy */}
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-blue-600 transition-colors cursor-pointer"
         onClick={onCreateNewMap}>
      <div className="text-3xl mb-3">&#x1F4DD;</div>
      <h3 className="text-xl font-bold text-white mb-2">New Strategy</h3>
      <p className="text-gray-400 text-sm mb-4">
        Build your content strategy from the ground up. Define your business context,
        SEO pillars, and generate an ideal topical map.
      </p>
      <p className="text-xs text-gray-500">Best for: New websites, major pivots, greenfield content</p>
      <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 font-medium">
        Start Fresh
      </button>
    </div>

    {/* Path B: Optimize Existing Site */}
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-green-600 transition-colors cursor-pointer"
         onClick={onStartExistingSite}>
      <div className="text-3xl mb-3">&#x1F50D;</div>
      <h3 className="text-xl font-bold text-white mb-2">Optimize Existing Site</h3>
      <p className="text-gray-400 text-sm mb-4">
        Import your site, analyze what you have, discover your SEO pillars from
        existing content, and build an optimized strategy around your reality.
      </p>
      <p className="text-xs text-gray-500">Best for: Existing websites, site optimization, content audits</p>
      <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 font-medium">
        Import Site
      </button>
    </div>
  </div>

  {/* Existing Maps */}
  {topicalMaps.length > 0 && (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Your Maps</h3>
      {/* ... existing map list rendering ... */}
    </div>
  )}
</div>
```

**Step 2: Add `onStartExistingSite` prop and handler**

```typescript
interface MapSelectionScreenProps {
  // ... existing ...
  onStartExistingSite: () => void; // NEW
}
```

**Step 3: Type check, commit**

```bash
git add components/screens/MapSelectionScreen.tsx
git commit -m "feat: redesign MapSelectionScreen with dual-path entry (New Strategy / Optimize Existing Site)"
```

---

### Task 18: Path B Wizard Container

**Files:**
- Create: `components/migration/ExistingSiteWizardContainer.tsx`

7-step wizard for the existing site path:
1. Business Info (validate/create context)
2. Import (sitemap + GSC)
3. Analyze (batch semantic analysis)
4. Pillars (suggest & validate CE/SC/CSI)
5. Map (generate & review augmented map)
6. Overlay (visual reconciliation)
7. Execute (prioritized action queue + workbench)

This component orchestrates the new flow by reusing existing step components and adding new ones (PillarValidationStep, BatchAnalysisStep, MapReviewStep, OverlayView).

**Step 1: Write the container** (follows same pattern as `AuthorityWizardContainer.tsx` but with 7 steps)

**Step 2: Type check, commit**

```bash
git add components/migration/ExistingSiteWizardContainer.tsx
git commit -m "feat: add ExistingSiteWizardContainer with 7-step Path B wizard"
```

---

## Phase 8: Polish & Integration

### Task 19: Business Info Validation Gate

**Files:**
- Create: `utils/businessInfoValidator.ts`
- Modify: `hooks/useSemanticAnalysis.ts` — add validation before analysis
- Modify: `hooks/useBatchAudit.ts` — add validation before audit
- Modify: `services/ai/mapGeneration.ts` — add validation before generation

Add a validation check at every AI-invocation boundary.

**Step 1: Create validator utility**

```typescript
// utils/businessInfoValidator.ts

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateBusinessInfoForAnalysis(businessInfo: any): ValidationResult {
  const errors: string[] = [];

  if (!businessInfo?.language) errors.push('Language is required. Set it in Business Info.');
  if (!businessInfo?.industry) errors.push('Industry is required. Set it in Business Info.');
  if (!businessInfo?.audience) errors.push('Target audience is required. Set it in Business Info.');

  return { valid: errors.length === 0, errors };
}

export function validatePillarsForAnalysis(pillars: any): ValidationResult {
  const errors: string[] = [];

  if (!pillars?.centralEntity?.trim()) errors.push('Central Entity (CE) is required. Define it in SEO Pillars.');
  if (!pillars?.sourceContext?.trim()) errors.push('Source Context (SC) is required. Define it in SEO Pillars.');
  if (!pillars?.centralSearchIntent?.trim()) errors.push('Central Search Intent (CSI) is required. Define it in SEO Pillars.');

  return { valid: errors.length === 0, errors };
}
```

**Step 2: Wire into services** (add early-return with clear error messages)

**Step 3: Type check, full tests, commit**

```bash
git add utils/businessInfoValidator.ts hooks/useSemanticAnalysis.ts hooks/useBatchAudit.ts
git commit -m "feat: add Business Info validation gate before AI operations"
```

---

### Task 20: Data Freshness Indicators

**Files:**
- Modify: `components/migration/SiteHealthSummary.tsx`

Show when key data was last computed:
- "Semantic analysis: 2 hours ago (45 pages)"
- "Auto-match: ran after last analysis"
- "Plan: generated 1 hour ago"

**Step 1: Add freshness queries**

```typescript
// Add to SiteHealthSummary:
const freshnessInfo = useMemo(() => {
  const lastAudit = inventory.reduce((latest, i) => {
    const t = i.last_audited_at ? new Date(i.last_audited_at).getTime() : 0;
    return t > latest ? t : latest;
  }, 0);

  const analyzedCount = inventory.filter(i => i.detected_ce != null).length;

  const lastPlanUpdate = inventory.reduce((latest, i) => {
    if (i.recommended_action && i.updated_at) {
      const t = new Date(i.updated_at).getTime();
      return t > latest ? t : latest;
    }
    return latest;
  }, 0);

  return {
    lastAudit: lastAudit > 0 ? new Date(lastAudit) : null,
    analyzedCount,
    lastPlan: lastPlanUpdate > 0 ? new Date(lastPlanUpdate) : null,
    auditedCount: inventory.filter(i => i.audit_score != null).length,
  };
}, [inventory]);

// Render:
<div className="text-xs text-gray-500 space-y-1 mt-3">
  {freshnessInfo.lastAudit && (
    <div>Audit: {timeAgo(freshnessInfo.lastAudit)} ({freshnessInfo.auditedCount} pages)</div>
  )}
  {freshnessInfo.analyzedCount > 0 && (
    <div>Semantic: {freshnessInfo.analyzedCount} pages analyzed</div>
  )}
  {freshnessInfo.lastPlan && (
    <div>Plan: {timeAgo(freshnessInfo.lastPlan)}</div>
  )}
</div>
```

**Step 2: Type check, commit**

```bash
git add components/migration/SiteHealthSummary.tsx
git commit -m "feat: add data freshness indicators to SiteHealthSummary"
```

---

### Task 21: Export Enhancements

**Files:**
- Modify: `components/migration/ExportPanel.tsx` (or create if needed)

Add export options:
- Overlay status CSV (topic, status, matched URL, action, priority)
- Redirect map (old URL → new URL) for dev team
- Full migration report

**Step 1: Add overlay export**

```typescript
// Add export function:
export function exportOverlayStatusCsv(nodes: OverlayNode[]): string {
  const headers = ['Topic', 'Status', 'Color', 'Matched URL', 'Alignment Score', 'GSC Clicks', 'Audit Score', 'Action'];
  const rows = nodes.map(node => {
    const page = node.matchedPages[0];
    return [
      node.topicTitle,
      node.status,
      node.statusColor,
      page?.url || '',
      page?.alignmentScore?.toString() || '',
      page?.gscClicks?.toString() || '',
      page?.auditScore?.toString() || '',
      page?.actionNeeded || '',
    ].map(v => `"${v.replace(/"/g, '""')}"`).join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

export function exportRedirectMap(inventory: SiteInventoryItem[]): string {
  const headers = ['Source URL', 'Target URL', 'Action'];
  const rows = inventory
    .filter(i => i.recommended_action === 'REDIRECT_301' || i.recommended_action === 'MERGE')
    .map(i => [i.url, '', i.recommended_action || ''].join(','));
  return [headers.join(','), ...rows].join('\n');
}
```

**Step 2: Type check, commit**

```bash
git add components/migration/ExportPanel.tsx
git commit -m "feat: add overlay status CSV and redirect map export"
```

---

## Database Changes Summary

| Migration File | What |
|---------------|------|
| `20260217000001_add_semantic_columns_to_inventory.sql` | `detected_ce`, `detected_sc`, `detected_csi`, `ce_alignment`, `sc_alignment`, `csi_alignment`, `semantic_overall_score`, `overlay_status` on `site_inventory`; `source`, `covered_by_inventory_ids` on `topics` |

---

## Files Changed Summary

### New Files (16)
| File | Phase | What |
|------|-------|------|
| `services/ai/batchSemanticAnalysis.ts` | 1 | Batch semantic analysis service |
| `services/ai/__tests__/batchSemanticAnalysis.test.ts` | 1 | Tests |
| `hooks/useBatchSemanticAnalysis.ts` | 1 | React hook for batch analysis |
| `services/ai/pillarDetection.ts` | 2 | Pillar suggestion from detected data |
| `services/ai/__tests__/pillarDetection.test.ts` | 2 | Tests |
| `components/migration/steps/PillarValidationStep.tsx` | 2 | Pillar confirm/edit UI |
| `services/ai/siteStructureDiscovery.ts` | 3 | Cluster pages by detected CE |
| `services/ai/__tests__/siteStructureDiscovery.test.ts` | 3 | Tests |
| `services/ai/augmentedMapGeneration.ts` | 3 | Map with existing + gap topics |
| `services/ai/__tests__/augmentedMapGeneration.test.ts` | 3 | Tests |
| `services/migration/overlayService.ts` | 4 | Compute overlay status |
| `services/migration/__tests__/overlayService.test.ts` | 4 | Tests |
| `components/migration/OverlayView.tsx` | 4 | Visual overlay component |
| `services/migration/opportunityScorer.ts` | 5 | Impact-effort scoring |
| `services/migration/__tests__/opportunityScorer.test.ts` | 5 | Tests |
| `components/migration/ExistingSiteWizardContainer.tsx` | 7 | Path B 7-step wizard |
| `utils/businessInfoValidator.ts` | 8 | Validation gate utility |

### Modified Files (9)
| File | Phase | What |
|------|-------|------|
| `types.ts` | 1 | Add semantic columns to SiteInventoryItem, source to EnrichedTopic |
| `services/migration/AutoMatchService.ts` | 1 | Add CE/SC/CSI semantic signals |
| `services/migration/MigrationPlanEngine.ts` | 1 | Use alignment scores in planning |
| `hooks/useBatchAudit.ts` | 1 | Chain semantic analysis after audit |
| `components/migration/steps/AuditStep.tsx` | 1 | Show detected entities |
| `components/migration/SiteHealthSummary.tsx` | 5,8 | Site score + freshness indicators |
| `components/migration/MigrationWorkbenchModal.tsx` | 6 | Strategic context display |
| `components/screens/MapSelectionScreen.tsx` | 7 | Dual-path entry |
| `components/migration/ExportPanel.tsx` | 8 | Overlay CSV + redirect map export |

### Database Migrations (1)
| File | What |
|------|------|
| `supabase/migrations/20260217000001_add_semantic_columns_to_inventory.sql` | Semantic columns + topic source tracking |

---

## Recommended Implementation Order

1. **Phase 1** (Tasks 1-6): Foundation — immediately improves existing flow with semantic data
2. **Phase 4** (Tasks 12-13): Visual Overlay — the "aha moment" for user comprehension
3. **Phase 2** (Tasks 7-9): Pillar Suggestion — enables Path B pillar detection
4. **Phase 3** (Tasks 10-11): Augmented Map — enables Path B map generation
5. **Phase 5** (Tasks 14-15): Prioritization — helps users know what to do first
6. **Phase 7** (Tasks 17-18): Path B Entry — connects everything end-to-end
7. **Phase 6** (Task 16): Enhanced Workbench — richer per-page optimization
8. **Phase 8** (Tasks 19-21): Polish — validation gates, freshness, exports

---

## Success Criteria

1. Path B users can start from their existing site without creating a topical map first
2. Pillars are always validated before any semantic work begins (both paths)
3. Overlay view makes coverage/gaps immediately visible at a glance
4. Matching accuracy improves — measured by reduction in manual reassignments
5. Users feel in control — at every step, they can see what the system did and override it
6. Site score provides momentum — users see measurable progress as they optimize
7. No regression for Path A (greenfield) users
8. `npx tsc --noEmit` — zero errors
9. `npx vitest run` — zero failures
