# Unified Content Audit System — Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify 16+ audit subsystems into one cohesive experience with full 437-rule coverage, configurable weights, external URL support, fact validation, GSC/GA4 API integration, and exportable results.

**Architecture:** Facade-based unification. `UnifiedAuditOrchestrator` coordinates existing services through 14 phase adapters matching the 437-rule checklist categories.

**Tech Stack:** React 18, TypeScript, Supabase (PostgreSQL + Edge Functions), Vitest, TailwindCSS, Recharts

**Reference Documents:**
- Architecture & user flows: `docs/plans/2026-02-11-unified-content-audit-system.md`
- Critical review & decisions: `docs/plans/2026-02-11-unified-audit-critical-review.md`
- 437-rule checklist: `docs/build-docs/semantic-seo-audit-checklist-v2.md`

---

## Master Sprint Overview

| Sprint | Goal | Tasks | Depends On | Status |
|--------|------|-------|------------|--------|
| **0** | UI Cleanup & Foundation | 4 | — | Pending |
| **1** | Orchestrator + Phase Adapters | 8 | Sprint 0 | Pending |
| **2** | Content Fetching + URL Discovery | 4 | Sprint 1 | Pending |
| **3** | Fact Validation Service | 3 | Sprint 1 | Pending |
| **4A** | GSC API (single property) | 5 | Sprint 1 | Pending |
| **4B** | Multi-property GSC + GA4 | 5 | Sprint 4A | Pending |
| **4C** | Multi-account & Sync | 4 | Sprint 4B | Pending |
| **5** | P0 Rules (blockers) | 10 | Sprint 1 | Pending |
| **6** | P1 Rules (critical) | 13 | Sprint 5 | Pending |
| **7** | P2-P4 Rules (completeness) | 3 groups | Sprint 6 | Pending |
| **8** | Unified Dashboard UI | 8 | Sprint 5 | Pending |
| **9** | Click-to-Audit Integration | 4 | Sprint 8 | Pending |
| **10** | Multilingual Support | 5 | Sprint 8 | Pending |
| **11** | Export Enhancement | 3 | Sprint 8 | Pending |
| **12** | Performance Timeline | 5 | Sprint 4A | Pending |
| **13** | Advanced Features & Polish | 6 | All above | Pending |

**Parallel tracks possible:** Sprints 2, 3, 4A, and 5 can run in parallel after Sprint 1.

---

## Key Conventions

- **TDD**: Write failing test → verify it fails → implement → verify it passes → commit
- **Commits**: After each task, commit with descriptive message
- **Validation**: After each sprint: `npx tsc --noEmit && npx vitest run`
- **No regressions**: 2,408+ tests must pass at all times
- **File paths**: All paths relative to project root `D:\www\cost-of-retreival-reducer\`

---

## Sprint 0: UI Cleanup & Foundation

### Context

**Verified findings from codebase audit:**

The `components/site-analysis/` directory has 22 files (21 .tsx + 1 .ts index):
- **5 pure V1 components** (no "V2" suffix): `SiteAnalysisTool.tsx`, `ProjectSetup.tsx`, `CrawlProgress.tsx`, `AuditDashboard.tsx`, `PageAuditDetail.tsx`
- **5 V2 components**: `SiteAnalysisToolV2.tsx`, `ProjectSetupV2.tsx`, `CrawlProgressV2.tsx`, `AuditDashboardV2.tsx`, `PageAuditDetailV2.tsx`
- **2 modals shared with V2**: `AISuggestionReviewModal.tsx`, `BatchSuggestionReviewModal.tsx` (used by `PageAuditDetailV2.tsx` — DO NOT DELETE)
- **1 shared component**: `PillarValidation.tsx` (used by V2 only)
- **`page-audit/` subdirectory** (6 files): used ONLY by `PageAuditDetailV2.tsx`
- **`report/` subdirectory** (2 files): `SEOAuditReportModal.tsx`
- **`index.ts`**: exports both V1 and V2 components

**Critical corrections from original plan:**
- `components/AuditDashboard.tsx` (root level) is **ACTIVE** — used by `ProjectDashboardContainer.tsx` (line 21, 442-452) as the unified audit modal. **MUST KEEP.**
- `components/dashboard/ComprehensiveAuditDashboard.tsx` is **ACTIVE** — mounted at route `/p/:projectId/m/:mapId/audit` via `components/pages/map/AuditPage.tsx`. Has 8 tabs (overview, your-map, competitor-research, gap-analysis, semantic-map, eat-authority, corpus, history).
- `components/insights/InsightsHub.tsx` is **ACTIVE** — mounted at route `/p/:projectId/m/:mapId/insights` via `InsightsPage.tsx`. Has 8 tabs (executive-summary, topical-authority, competitive-intel, authority-trust, content-health, publication-progress, cost-usage, action-center).
- V1 site-analysis components are NOT routed anywhere — only exported via `index.ts` and imported by each other.

### Task 0.1: Delete V1 site-analysis components

**Files:**
- Delete: `components/site-analysis/SiteAnalysisTool.tsx` (V1 — only imports other V1 files)
- Delete: `components/site-analysis/ProjectSetup.tsx` (V1 — only imported by SiteAnalysisTool)
- Delete: `components/site-analysis/CrawlProgress.tsx` (V1 — only imported by SiteAnalysisTool)
- Delete: `components/site-analysis/AuditDashboard.tsx` (V1 in site-analysis/ — only imported by SiteAnalysisTool)
- Delete: `components/site-analysis/PageAuditDetail.tsx` (V1 — only imported by SiteAnalysisTool)
- Modify: `components/site-analysis/index.ts` — remove V1 exports, keep V2 exports

**DO NOT DELETE:**
- `components/AuditDashboard.tsx` (root level) — ACTIVE, used by ProjectDashboardContainer
- `AISuggestionReviewModal.tsx` — used by V2's PageAuditDetailV2
- `BatchSuggestionReviewModal.tsx` — used by V2's PageAuditDetailV2

**Step 1: Search for imports of V1 components**

Run: `grep -rn "from.*site-analysis/SiteAnalysisTool[^V]" components/ services/`
Run: `grep -rn "from.*site-analysis/ProjectSetup[^V]" components/ services/`
Run: `grep -rn "from.*site-analysis/CrawlProgress[^V]" components/ services/`
Run: `grep -rn "from.*site-analysis/AuditDashboard[^V]" components/ services/`
Run: `grep -rn "from.*site-analysis/PageAuditDetail[^V]" components/ services/`
Expected: Results only from other V1 files (being deleted) and `index.ts` (being updated).

**Step 2: Update index.ts — remove V1 exports**

Modify: `components/site-analysis/index.ts`
Remove these lines:
```typescript
export { SiteAnalysisTool } from './SiteAnalysisTool';
export { ProjectSetup } from './ProjectSetup';
export { CrawlProgress } from './CrawlProgress';
export { AuditDashboard } from './AuditDashboard';
export { PageAuditDetail } from './PageAuditDetail';
```
Keep V2 exports and PillarValidation.

**Step 3: Delete V1 files**

```bash
git rm components/site-analysis/SiteAnalysisTool.tsx
git rm components/site-analysis/ProjectSetup.tsx
git rm components/site-analysis/CrawlProgress.tsx
git rm components/site-analysis/AuditDashboard.tsx
git rm components/site-analysis/PageAuditDetail.tsx
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 5: Verify tests pass**

Run: `npx vitest run`
Expected: 2,408+ passing, 0 failures

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: delete V1 site-analysis components (superseded by V2)"
```

---

### Task 0.2: Consolidate ComprehensiveAuditDashboard into InsightsHub

This is the most complex task in Sprint 0. ComprehensiveAuditDashboard has 8 tabs, InsightsHub has 8 tabs. They overlap on:
- competitor research / competitive intel
- E-A-T / authority-trust
- corpus / content-health

ComprehensiveAuditDashboard has unique tabs NOT in InsightsHub:
- `semantic-map` (SemanticDistanceMatrix visualization)
- `history` (audit history)
- `your-map` (EAV analysis, semantic compliance)
- `gap-analysis` (CompetitorGapGraph visualization)

**Step 1: Read both components to understand their tabs and data**

Read: `components/dashboard/ComprehensiveAuditDashboard.tsx`
Read: `components/insights/InsightsHub.tsx`
Read: `components/pages/map/AuditPage.tsx` (the route wrapper)

Identify:
- Which tabs from ComprehensiveAuditDashboard are NOT in InsightsHub
- What data/hooks they use (e.g., `useCompetitorGapNetwork`)
- What can be moved as-is vs needs adaptation

**Step 2: Extract unique tab content from ComprehensiveAuditDashboard**

Create small focused components for the unique tabs:
- `components/insights/tabs/SemanticMapTab.tsx` (wraps SemanticDistanceMatrix)
- `components/insights/tabs/AuditHistoryTab.tsx` (wraps audit history list)
- `components/insights/tabs/SemanticComplianceTab.tsx` (wraps EAV/your-map analysis)
- `components/insights/tabs/GapAnalysisTab.tsx` (wraps CompetitorGapGraph)

**Step 3: Add missing tabs to InsightsHub**

Modify: `components/insights/InsightsHub.tsx`
- Add "Semantic Map" tab
- Add "History" tab
- Add "Gap Analysis" tab (or merge into existing competitive-intel tab)
- Add "Semantic Compliance" tab (or merge into existing content-health tab)
- Add necessary imports and data hooks

**Step 4: Update route for /audit to redirect to /insights**

Modify: `components/pages/map/AuditPage.tsx`
- Replace `ComprehensiveAuditDashboard` with a redirect to the insights page
- OR: Update `components/router/AppRouter.tsx` to redirect `/audit` → `/insights`

**Step 5: Delete ComprehensiveAuditDashboard**

```bash
git rm components/dashboard/ComprehensiveAuditDashboard.tsx
git rm components/pages/map/AuditPage.tsx
```

**Step 6: Update AnalysisToolsPanel button #12 ("Full Research")**

Modify: `components/dashboard/AnalysisToolsPanel.tsx`
- Change "Full Research" (button #12, amber) to navigate to `/insights` instead of triggering `onComprehensiveAudit`

**Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 8: Verify tests pass**

Run: `npx vitest run`
Expected: 2,408+ passing

**Step 9: Commit**

```bash
git add -A
git commit -m "refactor: merge ComprehensiveAuditDashboard unique tabs into InsightsHub, redirect /audit route"
```

---

### Task 0.3: Clean up AnalysisToolsPanel buttons

**Files:**
- Modify: `components/dashboard/AnalysisToolsPanel.tsx`

**Step 1: Read the current button definitions**

Read: `components/dashboard/AnalysisToolsPanel.tsx`

Current 12 buttons (verified):
1. Validate Map, 2. Find Merges, 3. Semantics, 4. Coverage,
5. Link Audit, 6. Authority, 7. Plan, 8. Health Check (purple, `onRunUnifiedAudit`),
9. Query Network (blue), 10. E-A-T Scanner (green), 11. Corpus Audit (indigo),
12. Full Research (amber, `onComprehensiveAudit`) + Data Repair section

**Step 2: Consolidate overlapping buttons**

Changes:
- Rename "Full Research" (#12) to "Insights" → navigates to `/insights` (ComprehensiveAuditDashboard was merged there in Task 0.2)
- Keep "Health Check" (#8) as quick unified audit (modal-based via root `components/AuditDashboard.tsx`)
- Group buttons logically with visual separators

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: consolidate AnalysisToolsPanel buttons, rename Full Research to Insights"
```

---

### Task 0.4: Final Sprint 0 verification

**Step 1: Full TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Full test suite**

Run: `npx vitest run`
Expected: 2,408+ passing, 0 failures

**Step 3: Grep verification — no references to deleted components**

```bash
# V1 site-analysis components should not be imported anywhere
grep -rn "SiteAnalysisTool[^V]" components/ services/
grep -rn "from.*site-analysis/AuditDashboard[^V]" components/ services/
grep -rn "from.*site-analysis/PageAuditDetail[^V]" components/ services/

# ComprehensiveAuditDashboard should not be imported
grep -rn "ComprehensiveAuditDashboard" components/ services/
```
Expected: All return 0 results

**Verify KEPT components still work:**
```bash
# Root AuditDashboard is still used by ProjectDashboardContainer
grep -rn "from.*components/AuditDashboard" components/ProjectDashboardContainer.tsx
# Expected: 1 result (the active import)
```

**Step 4: Commit sprint completion marker**

```bash
git add -A
git commit -m "chore: Sprint 0 complete — UI cleanup and consolidation"
```

---

## Sprint 1: Orchestrator + Phase Adapters

### Context

Create the core `UnifiedAuditOrchestrator` service that coordinates 14 audit phases matching the 437-rule checklist categories. Each phase wraps existing services where they exist.

### Task 1.1: Create audit types

**Files:**
- Create: `services/audit/types.ts`

**Step 1: Write the failing test**

Create: `services/audit/__tests__/types.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import type {
  AuditRequest,
  AuditPhaseName,
  AuditPhaseResult,
  AuditFinding,
  UnifiedAuditReport,
  AuditWeightConfig,
} from '../types';

describe('Audit Types', () => {
  it('AuditPhaseName covers all 14 checklist categories + fact validation', () => {
    const phases: AuditPhaseName[] = [
      'strategicFoundation', 'eavSystem', 'microSemantics',
      'informationDensity', 'contextualFlow', 'internalLinking',
      'semanticDistance', 'contentFormat', 'htmlTechnical',
      'metaStructuredData', 'costOfRetrieval', 'urlArchitecture',
      'crossPageConsistency', 'websiteTypeSpecific', 'factValidation',
    ];
    expect(phases).toHaveLength(15);
  });

  it('DEFAULT_AUDIT_WEIGHTS sums to 100 (excluding websiteTypeSpecific and factValidation)', () => {
    // Import will fail until types.ts is created
    const { DEFAULT_AUDIT_WEIGHTS } = require('../types');
    const coreWeights = Object.entries(DEFAULT_AUDIT_WEIGHTS)
      .filter(([k]) => k !== 'websiteTypeSpecific' && k !== 'factValidation')
      .reduce((sum, [, v]) => sum + (v as number), 0);
    expect(coreWeights).toBe(100);
  });

  it('AuditFinding has required explanation fields', () => {
    const finding: AuditFinding = {
      id: 'test-1',
      phase: 'strategicFoundation',
      ruleId: 'rule-1',
      checklistRuleNumber: 1,
      severity: 'critical',
      title: 'Test finding',
      description: 'Test description',
      whyItMatters: 'Because it matters',
      currentValue: 'bad',
      expectedValue: 'good',
      exampleFix: 'Do this instead',
      autoFixAvailable: false,
      estimatedImpact: 'high',
      category: 'test',
    };
    expect(finding.whyItMatters).toBeTruthy();
    expect(finding.checklistRuleNumber).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/audit/__tests__/types.test.ts`
Expected: FAIL — module not found

**Step 3: Write the types file**

Create: `services/audit/types.ts`

Full type definitions including:
- `AuditPhaseName` (15 phases)
- `AuditRequest` (input for audit)
- `AuditPhaseResult` (per-phase output)
- `AuditFinding` (individual finding with `whyItMatters`, `exampleFix`, `checklistRuleNumber`)
- `UnifiedAuditReport` (complete audit output)
- `AuditWeightConfig` (configurable weights)
- `DEFAULT_AUDIT_WEIGHTS` (matching checklist percentages)
- `ContentMergeSuggestion`, `CannibalizationRisk`, `PerformanceSnapshot`, `PerformanceCorrelation`

See `docs/plans/2026-02-11-unified-audit-critical-review.md` "Revised Phase Architecture" section for exact type definitions.

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/audit/__tests__/types.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add services/audit/types.ts services/audit/__tests__/types.test.ts
git commit -m "feat(audit): add unified audit type definitions with 15 phases and configurable weights"
```

---

### Task 1.2: Create AuditPhase interface and base class

**Files:**
- Create: `services/audit/phases/AuditPhase.ts`

**Step 1: Write the failing test**

Create: `services/audit/__tests__/phases/AuditPhase.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { AuditPhase } from '../../phases/AuditPhase';
import type { AuditRequest, AuditPhaseResult, AuditFinding } from '../../types';

class TestPhase extends AuditPhase {
  readonly phaseName = 'strategicFoundation' as const;

  async execute(request: AuditRequest): Promise<AuditPhaseResult> {
    return this.buildResult([]);
  }
}

describe('AuditPhase base class', () => {
  it('buildResult creates correct structure with zero findings', () => {
    const phase = new TestPhase();
    const result = phase.buildResult([]);
    expect(result.phase).toBe('strategicFoundation');
    expect(result.score).toBe(100);
    expect(result.findings).toHaveLength(0);
    expect(result.passedChecks).toBe(0);
    expect(result.totalChecks).toBe(0);
  });

  it('buildResult calculates score from findings', () => {
    const phase = new TestPhase();
    const findings: AuditFinding[] = [
      { id: '1', phase: 'strategicFoundation', ruleId: 'r1', checklistRuleNumber: 1,
        severity: 'critical', title: 't', description: 'd', whyItMatters: 'w',
        autoFixAvailable: false, estimatedImpact: 'high', category: 'c' },
    ];
    const result = phase.buildResult(findings, 10);
    expect(result.score).toBeLessThan(100);
    expect(result.totalChecks).toBe(10);
    expect(result.passedChecks).toBe(9);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/audit/__tests__/phases/AuditPhase.test.ts`
Expected: FAIL

**Step 3: Implement AuditPhase base class**

Create: `services/audit/phases/AuditPhase.ts`

Abstract class with:
- Abstract `phaseName` property
- Abstract `execute(request)` method
- `buildResult(findings, totalChecks)` — calculates score based on severity penalties
- `createFinding(params)` — factory method with defaults

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/audit/__tests__/phases/AuditPhase.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/audit/phases/AuditPhase.ts services/audit/__tests__/phases/AuditPhase.test.ts
git commit -m "feat(audit): add AuditPhase base class with score calculation"
```

---

### Task 1.3: Create UnifiedAuditOrchestrator

**Files:**
- Create: `services/audit/UnifiedAuditOrchestrator.ts`
- Create: `services/audit/__tests__/UnifiedAuditOrchestrator.test.ts`

**Step 1: Write the failing test**

Test cases:
- `checkPrerequisites()` returns correct status for business info, pillars, EAVs
- `runAudit()` calls all registered phases
- `runAudit()` catches phase errors without failing entire audit
- `runAudit()` calculates weighted overall score
- `runAudit()` deduplicates findings across phases
- `runAudit()` emits progress events
- `runAudit()` uses custom weights when provided

**Step 2: Run test to verify it fails**

Expected: FAIL — module not found

**Step 3: Implement UnifiedAuditOrchestrator**

Key methods:
- `constructor(phases: AuditPhase[])` — accepts phase array (dependency injection)
- `checkPrerequisites(projectId)` — checks business info, pillars, EAVs exist
- `runAudit(request)` — runs all phases, aggregates results
- `calculateWeightedScore(results, weights)` — applies configurable weights
- `deduplicateFindings(findings)` — removes duplicate findings across phases

**Step 4: Run test to verify it passes**

Expected: PASS

**Step 5: Commit**

```bash
git add services/audit/UnifiedAuditOrchestrator.ts services/audit/__tests__/UnifiedAuditOrchestrator.test.ts
git commit -m "feat(audit): add UnifiedAuditOrchestrator with weighted scoring and phase coordination"
```

---

### Task 1.4: Create StrategicFoundationPhase adapter

**Files:**
- Create: `services/audit/phases/StrategicFoundationPhase.ts`
- Create: `services/audit/__tests__/phases/StrategicFoundationPhase.test.ts`

This wraps existing services: `centralEntityAnalyzer.ts`, `eatScanner.ts`, and adds new checks from checklist rules 1-32.

**Step 1: Write tests** for rules that are already implemented (wrap existing)
**Step 2: Run test — fails**
**Step 3: Implement phase adapter** — calls existing services, transforms results to `AuditFinding[]`
**Step 4: Run test — passes**
**Step 5: Commit**

---

### Task 1.5: Create EavSystemPhase adapter

Wraps: `eavAudit.ts`, adds attribute classification and ordering checks.
Same TDD cycle as 1.4.

### Task 1.6: Create ContentQualityPhase adapter

Wraps: `auditChecks.ts` (35 checks), `contentValidation.ts`, `qualityRulesRegistry.ts`.
Covers checklist categories C, D, E (micro-semantics, density, flow).
Same TDD cycle.

### Task 1.7: Create LinkStructurePhase adapter

Wraps: `linkingAudit.ts` (4-pass).
Same TDD cycle.

### Task 1.8: Create remaining phase adapters (scaffold)

Create skeleton adapters for phases that don't have existing services yet:
- `SemanticDistancePhase.ts` (will use `lib/knowledgeGraph.ts`)
- `HtmlTechnicalPhase.ts` (new — Sprint 5)
- `MetaStructuredDataPhase.ts` (new — Sprint 5)
- `CostOfRetrievalPhase.ts` (new — Sprint 6)
- `UrlArchitecturePhase.ts` (new — Sprint 6)
- `CrossPageConsistencyPhase.ts` (wraps existing KBT check)
- `WebsiteTypeSpecificPhase.ts` (new — Sprint 7)
- `FactValidationPhase.ts` (new — Sprint 3)

Each returns empty results for now, with TODO comments referencing the sprint that implements them.

**Commit:**
```bash
git commit -m "feat(audit): scaffold remaining phase adapters (to be implemented in Sprints 3-7)"
```

---

### Sprint 1 Verification

```bash
npx tsc --noEmit           # 0 errors
npx vitest run             # 2,408+ passing + new tests
```

```bash
git commit -m "chore: Sprint 1 complete — orchestrator and phase adapters"
```

---

## Sprint 2: Content Fetching & External URL Support

### Context

The application has content fetching via `jinaService.ts` (`extractPageContent`, `extractPageContentWithHtml`) and `firecrawlService.ts` (`scrapeUrl`, `scrapeForAudit`). We need a unified `ContentFetcher` that wraps both with a fallback chain, plus a `RelatedUrlDiscoverer` that finds related pages on a target site.

### Task 2.1: Create FetchedContent type and ContentFetcher service

**Files:**
- Create: `services/audit/ContentFetcher.ts`
- Create: `services/audit/__tests__/ContentFetcher.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { ContentFetcher } from '../ContentFetcher';
import type { FetchedContent } from '../types';

describe('ContentFetcher', () => {
  it('returns FetchedContent with both semanticText and rawHtml', async () => {
    const fetcher = new ContentFetcher();
    // Mock jina service
    vi.mock('../../../services/jinaService', () => ({
      extractPageContentWithHtml: vi.fn().mockResolvedValue({
        content: 'semantic text', html: '<html>...</html>',
        title: 'Test', links: [],
      }),
    }));
    const result = await fetcher.fetch('https://example.com', { preferredProvider: 'jina' });
    expect(result.semanticText).toBeTruthy();
    expect(result.rawHtml).toBeTruthy();
    expect(result.provider).toBe('jina');
  });

  it('falls back to next provider on failure', async () => {
    const fetcher = new ContentFetcher();
    // Mock jina to fail, firecrawl to succeed
    const result = await fetcher.fetch('https://example.com', {
      preferredProvider: 'jina',
      fallbackEnabled: true,
    });
    expect(result.provider).toBeDefined();
  });

  it('throws when all providers fail', async () => {
    const fetcher = new ContentFetcher();
    await expect(fetcher.fetch('https://invalid.example', {
      preferredProvider: 'direct',
      fallbackEnabled: false,
    })).rejects.toThrow();
  });

  it('extracts headings, images, links from raw HTML', async () => {
    const fetcher = new ContentFetcher();
    const html = '<html><body><h1>Title</h1><img src="img.jpg" alt="Photo"><a href="/about">About</a></body></html>';
    const parsed = fetcher.parseHtml(html, 'https://example.com');
    expect(parsed.headings).toContainEqual({ level: 1, text: 'Title' });
    expect(parsed.images).toContainEqual(expect.objectContaining({ alt: 'Photo' }));
    expect(parsed.internalLinks.length).toBeGreaterThanOrEqual(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/audit/__tests__/ContentFetcher.test.ts`
Expected: FAIL — module not found

**Step 3: Implement ContentFetcher**

Create `services/audit/ContentFetcher.ts`:
- `fetch(url, options)` — try preferred provider, fallback chain
- `fetchWithJina(url)` — calls `extractPageContentWithHtml` from `services/jinaService.ts`
- `fetchWithFirecrawl(url)` — calls `scrapeForAudit` from `services/firecrawlService.ts`
- `fetchDirect(url)` — built-in `fetch()` + HTML parsing
- `parseHtml(html, baseUrl)` — extracts headings, images, links, schema markup
- `buildFallbackChain(preferred)` — returns ordered provider list

Add `FetchedContent` and `FetchOptions` to `services/audit/types.ts`:

```typescript
export interface FetchedContent {
  url: string;
  semanticText: string;
  rawHtml: string;
  title: string;
  metaDescription: string;
  headings: { level: number; text: string }[];
  images: { src: string; alt: string }[];
  internalLinks: { href: string; anchor: string }[];
  externalLinks: { href: string; anchor: string }[];
  schemaMarkup: object[];
  language: string;
  provider: 'jina' | 'firecrawl' | 'apify' | 'direct';
  fetchDurationMs: number;
}

export interface FetchOptions {
  preferredProvider: 'jina' | 'firecrawl' | 'apify' | 'direct';
  fallbackEnabled?: boolean;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/audit/__tests__/ContentFetcher.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add services/audit/ContentFetcher.ts services/audit/__tests__/ContentFetcher.test.ts services/audit/types.ts
git commit -m "feat(audit): add ContentFetcher with multi-provider fallback chain"
```

---

### Task 2.2: Create RelatedUrlDiscoverer

**Files:**
- Create: `services/audit/RelatedUrlDiscoverer.ts`
- Create: `services/audit/__tests__/RelatedUrlDiscoverer.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { RelatedUrlDiscoverer } from '../RelatedUrlDiscoverer';

describe('RelatedUrlDiscoverer', () => {
  it('parses sitemap.xml and returns URLs', async () => {
    const discoverer = new RelatedUrlDiscoverer();
    const sitemapXml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/page1</loc></url>
        <url><loc>https://example.com/page2</loc></url>
      </urlset>`;
    const urls = discoverer.parseSitemapXml(sitemapXml);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toBe('https://example.com/page1');
  });

  it('extracts internal links from HTML', () => {
    const discoverer = new RelatedUrlDiscoverer();
    const html = '<a href="/about">About</a><a href="https://other.com">Ext</a>';
    const links = discoverer.extractInternalLinks(html, 'https://example.com');
    expect(links).toContainEqual(expect.objectContaining({ href: 'https://example.com/about' }));
    expect(links.find(l => l.href.includes('other.com'))).toBeUndefined();
  });

  it('deduplicates and ranks by relevance', () => {
    const discoverer = new RelatedUrlDiscoverer();
    const urls = [
      { url: 'https://example.com/a', source: 'sitemap' as const },
      { url: 'https://example.com/a', source: 'link' as const },
      { url: 'https://example.com/b', source: 'link' as const },
    ];
    const ranked = discoverer.deduplicateAndRank(urls, 'https://example.com/target');
    expect(ranked).toHaveLength(2);
    // URL found in both sources should rank higher
    expect(ranked[0].url).toBe('https://example.com/a');
  });
});
```

**Step 2: Run test — FAIL**

**Step 3: Implement RelatedUrlDiscoverer**

Methods:
- `discover(url, limit)` — orchestrates strategies, returns `DiscoveredUrl[]`
- `fetchSitemap(baseUrl)` — fetches `/sitemap.xml`, parses sitemap index if present
- `parseSitemapXml(xml)` — extracts `<loc>` elements
- `extractInternalLinks(html, baseUrl)` — parses `<a>` tags, filters same-domain
- `deduplicateAndRank(urls, targetUrl)` — dedup + relevance scoring
- `findRelatedByPattern(url, allUrls)` — finds URLs in same directory/category

**Step 4: Run test — PASS**

**Step 5: Commit**

```bash
git add services/audit/RelatedUrlDiscoverer.ts services/audit/__tests__/RelatedUrlDiscoverer.test.ts
git commit -m "feat(audit): add RelatedUrlDiscoverer with sitemap + internal link strategies"
```

---

### Task 2.3: Add FetchedContent to orchestrator pipeline

**Files:**
- Modify: `services/audit/UnifiedAuditOrchestrator.ts`

**Step 1: Write test** — orchestrator calls ContentFetcher when `request.url` is set

**Step 2: Run test — FAIL**

**Step 3: Wire ContentFetcher into `runAudit()`** — for external/published audits, fetch content first, then pass to phases

**Step 4: Run test — PASS**

**Step 5: Commit**

```bash
git commit -m "feat(audit): wire ContentFetcher into orchestrator pipeline for external URLs"
```

---

### Task 2.4: Add scraping preference to user settings

**Files:**
- Modify: existing user settings component (find settings form)
- Modify: `types.ts` — add `scrapingProvider` to user settings type

Add "Content Fetching" section:
- Radio: Jina (default) / Firecrawl / Apify / Direct
- Toggle: "Enable automatic fallback" (default: on)

**Commit:**
```bash
git commit -m "feat(audit): add scraping provider preference to user settings"
```

---

### Sprint 2 Verification

```bash
npx tsc --noEmit           # 0 errors
npx vitest run             # All passing + new tests
```

```bash
git commit -m "chore: Sprint 2 complete — content fetching and URL discovery"
```

---

## Sprint 3: Fact Validation Service

### Context

Build a `FactValidator` that extracts factual claims from content (statistics, dates, attributions) and verifies them using Perplexity (already integrated as `perplexityService.ts`) or web search. This connects to the `factValidation` audit phase.

### Task 3.1: Create FactValidator types and service

**Files:**
- Create: `services/audit/FactValidator.ts`
- Create: `services/audit/__tests__/FactValidator.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { FactValidator } from '../FactValidator';

describe('FactValidator', () => {
  describe('extractClaims', () => {
    it('identifies statistics claims', async () => {
      const validator = new FactValidator();
      const text = '83% of marketers use content marketing. The company was founded in 2015.';
      // Mock AI extraction
      const claims = await validator.extractClaims(text, 'en');
      expect(claims.length).toBeGreaterThanOrEqual(2);
      expect(claims.find(c => c.claimType === 'statistic')).toBeDefined();
      expect(claims.find(c => c.claimType === 'date')).toBeDefined();
    });

    it('identifies attribution claims', async () => {
      const validator = new FactValidator();
      const text = 'According to Harvard Business Review, companies that invest in SEO see 3x ROI.';
      const claims = await validator.extractClaims(text, 'en');
      expect(claims.find(c => c.claimType === 'attribution')).toBeDefined();
    });
  });

  describe('verifyClaim', () => {
    it('returns verified status with sources', async () => {
      const validator = new FactValidator();
      const claim = {
        id: 'test-1',
        text: 'The Earth orbits the Sun',
        claimType: 'general' as const,
        confidence: 0.9,
        verificationStatus: 'unverified' as const,
        verificationSources: [],
      };
      const result = await validator.verifyClaim(claim);
      expect(result.verificationStatus).toBe('verified');
      expect(result.verificationSources.length).toBeGreaterThanOrEqual(1);
    });

    it('flags outdated statistics', async () => {
      const validator = new FactValidator();
      const claim = {
        id: 'test-2',
        text: 'As of 2019, 65% of businesses use social media',
        claimType: 'statistic' as const,
        confidence: 0.8,
        verificationStatus: 'unverified' as const,
        verificationSources: [],
      };
      const result = await validator.verifyClaim(claim);
      expect(['outdated', 'verified']).toContain(result.verificationStatus);
    });
  });

  describe('verifyAll', () => {
    it('batch-verifies with rate limiting', async () => {
      const validator = new FactValidator();
      const claims = Array.from({ length: 5 }, (_, i) => ({
        id: `claim-${i}`,
        text: `Claim number ${i}`,
        claimType: 'general' as const,
        confidence: 0.8,
        verificationStatus: 'unverified' as const,
        verificationSources: [],
      }));
      const results = await validator.verifyAll(claims);
      expect(results).toHaveLength(5);
      results.forEach(r => expect(r.verificationStatus).not.toBe('unverified'));
    });
  });
});
```

**Step 2: Run test — FAIL**

**Step 3: Implement FactValidator**

```typescript
export class FactValidator {
  // Step 1: Use AI (Gemini fast model via service registry) to extract claims
  async extractClaims(content: string, language: string): Promise<FactClaim[]>

  // Step 2: Verify each claim via Perplexity (uses perplexityService.ts)
  async verifyClaim(claim: FactClaim): Promise<FactClaim>

  // Step 3: Batch with concurrency limit (3 at a time)
  async verifyAll(claims: FactClaim[], concurrency?: number): Promise<FactClaim[]>

  // Internal: Detect if a statistic is outdated (>2 years old)
  private isOutdated(text: string): boolean

  // Internal: Detect unattributed statistics
  private isUnattributed(text: string): boolean
}
```

Add `FactClaim` and `VerificationSource` types to `services/audit/types.ts`.

**Step 4: Run test — PASS**

**Step 5: Commit**

```bash
git add services/audit/FactValidator.ts services/audit/__tests__/FactValidator.test.ts services/audit/types.ts
git commit -m "feat(audit): add FactValidator with claim extraction and Perplexity verification"
```

---

### Task 3.2: Wire FactValidationPhase adapter

**Files:**
- Modify: `services/audit/phases/FactValidationPhase.ts` (update scaffold from Sprint 1)

**Step 1: Write test** — FactValidationPhase calls FactValidator and transforms results to AuditFindings

**Step 2: Run test — FAIL**

**Step 3: Implement** — call `extractClaims()` then `verifyAll()`, convert disputed/outdated/unverifiable claims to findings

**Step 4: Run test — PASS**

**Step 5: Commit**

```bash
git commit -m "feat(audit): implement FactValidationPhase with claim verification pipeline"
```

---

### Task 3.3: Add fact_validation_cache table

**Files:**
- Create: migration SQL

```sql
CREATE TABLE fact_validation_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_hash TEXT NOT NULL UNIQUE,
  claim_text TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  sources JSONB,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);
CREATE INDEX idx_fv_cache_hash ON fact_validation_cache(claim_hash);
CREATE INDEX idx_fv_cache_expires ON fact_validation_cache(expires_at);
```

Update FactValidator to check cache before calling Perplexity.

**Commit:**
```bash
git commit -m "feat(audit): add fact_validation_cache table with 30-day TTL"
```

---

### Sprint 3 Verification

```bash
npx tsc --noEmit && npx vitest run
```

```bash
git commit -m "chore: Sprint 3 complete — fact validation service"
```

---

## Sprint 4A: GSC API Integration (Single Property)

### Context

Currently `gscService.ts` only has `parseGscCsv()` for manual CSV import. We need to build Google OAuth infrastructure and a GSC API client. The WordPress integration (`wordpress_connections` table pattern) serves as the architectural reference for multi-connection support.

**Pre-requisite**: A Google Cloud project with Search Console API enabled and OAuth 2.0 credentials configured.

### Task 4A.1: Create analytics database tables

**Files:**
- Create: Supabase migration

```sql
-- Supports multiple Google accounts per user
CREATE TABLE analytics_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'bing')),
  account_email TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider, account_email)
);

-- Supports multiple GSC/GA4 properties per project
CREATE TABLE analytics_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  account_id UUID REFERENCES analytics_accounts(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('gsc', 'ga4')),
  property_id TEXT NOT NULL,
  property_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  sync_enabled BOOLEAN DEFAULT true,
  sync_frequency TEXT DEFAULT 'daily' CHECK (sync_frequency IN ('hourly', 'daily', 'weekly')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, service, property_id)
);

ALTER TABLE analytics_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_accounts_user ON analytics_accounts FOR ALL USING (user_id = auth.uid());
CREATE POLICY analytics_properties_project ON analytics_properties FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);
```

**Commit:**
```bash
git commit -m "feat(audit): add analytics_accounts and analytics_properties tables with RLS"
```

---

### Task 4A.2: Create Google OAuth edge function

**Files:**
- Create: `supabase/functions/google-oauth-callback/index.ts`

**Step 1: Write the test** (mock OAuth token exchange)

```typescript
// Test the token exchange logic in isolation
describe('Google OAuth callback', () => {
  it('exchanges code for tokens and stores encrypted', async () => {
    // Mock the token exchange response
    const mockTokens = {
      access_token: 'test_access',
      refresh_token: 'test_refresh',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    };
    // Verify tokens are stored in analytics_accounts
  });

  it('rejects invalid state parameter', async () => {
    // Should return 400
  });

  it('handles token refresh', async () => {
    // When access_token is expired, use refresh_token
  });
});
```

**Step 2: Run test — FAIL**

**Step 3: Implement OAuth callback**

The edge function:
1. Receives `code` and `state` from Google OAuth redirect
2. Exchanges code for tokens via `https://oauth2.googleapis.com/token`
3. Fetches user email via `https://www.googleapis.com/oauth2/v2/userinfo`
4. Stores encrypted tokens in `analytics_accounts`
5. Redirects back to app settings page

**Step 4: Run test — PASS**

**Step 5: Commit**

```bash
git commit -m "feat(audit): add Google OAuth callback edge function for analytics accounts"
```

---

### Task 4A.3: Create GscApiAdapter service

**Files:**
- Create: `services/audit/adapters/GscApiAdapter.ts`
- Create: `services/audit/__tests__/adapters/GscApiAdapter.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { GscApiAdapter } from '../../adapters/GscApiAdapter';

describe('GscApiAdapter', () => {
  it('generates correct OAuth authorization URL', () => {
    const adapter = new GscApiAdapter();
    const url = adapter.getAuthorizationUrl('project-123', 'https://app.example.com/callback');
    expect(url).toContain('accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('webmasters.readonly');
    expect(url).toContain('state=');
  });

  it('fetches search analytics data', async () => {
    const adapter = new GscApiAdapter();
    // Mock the GSC API response
    vi.spyOn(adapter as any, 'callGscApi').mockResolvedValue({
      rows: [
        { keys: ['test keyword'], clicks: 100, impressions: 1000, ctr: 0.1, position: 5.2 },
      ],
    });
    const data = await adapter.getSearchAnalytics({
      siteUrl: 'https://example.com',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      dimensions: ['query'],
      accessToken: 'test-token',
    });
    expect(data).toHaveLength(1);
    expect(data[0].clicks).toBe(100);
  });

  it('converts GSC response to PerformanceSnapshot', async () => {
    const adapter = new GscApiAdapter();
    const snapshot = await adapter.getPagePerformance(
      'https://example.com/page', 30, 'test-token'
    );
    expect(snapshot).toHaveProperty('clicks');
    expect(snapshot).toHaveProperty('impressions');
    expect(snapshot).toHaveProperty('ctr');
    expect(snapshot).toHaveProperty('position');
  });
});
```

**Step 2: Run test — FAIL**

**Step 3: Implement GscApiAdapter**

```typescript
export class GscApiAdapter {
  getAuthorizationUrl(projectId: string, redirectUri: string): string
  async handleCallback(code: string, projectId: string, userId: string): Promise<void>
  async getSearchAnalytics(params: GscQueryParams): Promise<GscRow[]>
  async getPagePerformance(url: string, days: number, accessToken: string): Promise<PerformanceSnapshot>
  async getTopQueries(url: string, limit: number, accessToken: string): Promise<GscQueryRow[]>
  async getClickTrend(url: string, days: number, accessToken: string): Promise<{ date: string; clicks: number }[]>
  private async callGscApi(endpoint: string, body: object, accessToken: string): Promise<any>
  private async refreshTokenIfNeeded(accountId: string): Promise<string>
}
```

Uses `https://www.googleapis.com/webmasters/v3/` base URL (add to service registry).

**Step 4: Run test — PASS**

**Step 5: Commit**

```bash
git add services/audit/adapters/GscApiAdapter.ts services/audit/__tests__/adapters/GscApiAdapter.test.ts
git commit -m "feat(audit): add GscApiAdapter with search analytics, page performance, click trends"
```

---

### Task 4A.4: Keep CSV import as fallback

**Files:**
- Modify: `services/gscService.ts` — add re-export or wrapper

Ensure `parseGscCsv()` remains available. Add a `GscDataSource` union type:

```typescript
export type GscDataSource =
  | { type: 'api'; accountId: string; propertyId: string }
  | { type: 'csv'; csvText: string };
```

**Commit:**
```bash
git commit -m "feat(audit): preserve GSC CSV import as fallback alongside API adapter"
```

---

### Task 4A.5: Add "Connect Search Console" UI

**Files:**
- Modify: user settings / integrations section

Add:
- "Connect Google Search Console" button → opens OAuth flow
- Connection status indicator (connected / not connected / token expired)
- Connected property display with "Disconnect" option
- Fallback: "Or import CSV manually" link (existing flow)

**Commit:**
```bash
git commit -m "feat(audit): add GSC connection UI in settings with OAuth flow"
```

---

### Sprint 4A Verification

```bash
npx tsc --noEmit && npx vitest run
```

```bash
git commit -m "chore: Sprint 4A complete — GSC API single property integration"
```

---

## Sprint 4B: Multi-Property GSC + GA4 API

### Context

Extend Sprint 4A to support multiple GSC properties per project and add GA4 API integration using the same OAuth infrastructure.

### Task 4B.1: Property selector UI

**Files:**
- Create: `components/audit/AnalyticsPropertySelector.tsx`

Shows all GSC properties available from the connected Google account. User selects which to link to the current project. Sets one as "primary".

**TDD cycle**: test → fail → implement → pass → commit

---

### Task 4B.2: Create GA4 API adapter

**Files:**
- Create: `services/audit/adapters/Ga4ApiAdapter.ts`
- Create: `services/audit/__tests__/adapters/Ga4ApiAdapter.test.ts`

**Step 1: Write test** — getPageMetrics returns pageviews, bounceRate, avgTimeOnPage

**Step 2: Run test — FAIL**

**Step 3: Implement** using Google Analytics Data API v1 (`https://analyticsdata.googleapis.com/v1beta/`).

Methods:
- `getPageMetrics(propertyId, pagePath, dateRange, accessToken)` → `Ga4PageMetrics`
- `getPageviewsTrend(propertyId, pagePath, days, accessToken)` → trend data
- `listProperties(accessToken)` → available GA4 properties for account

**Step 4: Run test — PASS**

**Step 5: Commit**

```bash
git commit -m "feat(audit): add GA4 API adapter with page metrics and trends"
```

---

### Task 4B.3: GA4 OAuth scope extension

**Files:**
- Modify: `supabase/functions/google-oauth-callback/index.ts`

Add `https://www.googleapis.com/auth/analytics.readonly` scope. Handle case where user has existing GSC-only connection and wants to add GA4 (re-authorize with additional scope).

**Commit:**
```bash
git commit -m "feat(audit): extend Google OAuth to include GA4 analytics scope"
```

---

### Task 4B.4: Multi-property link UI

**Files:**
- Create: `components/audit/AnalyticsPropertiesManager.tsx`

Per-project settings panel:
- "Link GSC Property" dropdown → shows all GSC sites from all connected accounts
- "Link GA4 Property" dropdown → shows all GA4 properties
- Can link multiple properties per service
- Set primary property per service
- Toggle sync enabled/disabled per property

**Commit:**
```bash
git commit -m "feat(audit): add multi-property analytics manager UI"
```

---

### Task 4B.5: Create PerformanceCorrelator

**Files:**
- Create: `services/audit/PerformanceCorrelator.ts`
- Create: `services/audit/__tests__/PerformanceCorrelator.test.ts`

**Step 1: Write test**

```typescript
describe('PerformanceCorrelator', () => {
  it('calculates Pearson correlation between audit scores and clicks', () => {
    const correlator = new PerformanceCorrelator();
    const auditScores = [
      { date: '2026-01-01', score: 60 },
      { date: '2026-01-15', score: 72 },
      { date: '2026-02-01', score: 85 },
    ];
    const clicks = [
      { date: '2026-01-01', value: 100 },
      { date: '2026-01-15', value: 120 },
      { date: '2026-02-01', value: 180 },
    ];
    const result = correlator.calculateCorrelation(auditScores, clicks);
    expect(result).toBeGreaterThan(0.8); // Strong positive correlation
  });

  it('supports time-lagged correlation', () => {
    const correlator = new PerformanceCorrelator();
    // Audit improvements show in metrics 2-4 weeks later
    const result = correlator.calculateLaggedCorrelation(auditScores, clicks, 14);
    expect(result).toBeDefined();
  });
});
```

**Step 2: Run test — FAIL**

**Step 3: Implement**

Methods:
- `correlate(projectId, url, auditHistory)` → `PerformanceCorrelation`
- `calculateCorrelation(series1, series2)` → Pearson coefficient
- `calculateLaggedCorrelation(series1, series2, lagDays)` → Pearson with offset
- `generateInsight(correlation)` → AI-generated insight string

**Step 4: Run test — PASS**

**Step 5: Commit**

```bash
git commit -m "feat(audit): add PerformanceCorrelator with Pearson correlation and time-lag support"
```

---

### Sprint 4B Verification

```bash
npx tsc --noEmit && npx vitest run
```

```bash
git commit -m "chore: Sprint 4B complete — multi-property GSC + GA4 integration"
```

---

## Sprint 4C: Multi-Account & Sync

### Context

Support multiple Google accounts per user (personal + business), and automated periodic sync.

### Task 4C.1: Multi-account management UI

**Files:**
- Create: `components/settings/AnalyticsAccountsPanel.tsx`

User settings → "Analytics" tab:
- List all connected Google accounts with email
- "Add Another Google Account" button → OAuth flow
- Per-account: disconnect button, scopes list, last used date

**Commit:**
```bash
git commit -m "feat(audit): add multi-account Google analytics management UI"
```

---

### Task 4C.2: Create sync worker edge function

**Files:**
- Create: `supabase/functions/analytics-sync-worker/index.ts`

Edge function triggered by Supabase cron (pg_cron):
1. Query `analytics_properties` where `sync_enabled = true` and due for sync
2. For each property, fetch latest data via GSC/GA4 API
3. Store in `enhanced_metrics_snapshots` (existing table)
4. Update `last_synced_at`
5. Log to `analytics_sync_logs`

**Commit:**
```bash
git commit -m "feat(audit): add analytics sync worker edge function with cron support"
```

---

### Task 4C.3: Create analytics_sync_logs table

**Files:**
- Create: migration

```sql
CREATE TABLE analytics_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES analytics_properties(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  rows_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE analytics_sync_logs ENABLE ROW LEVEL SECURITY;
```

**Commit:**
```bash
git commit -m "feat(audit): add analytics_sync_logs table"
```

---

### Task 4C.4: Sync status dashboard

**Files:**
- Create: `components/settings/AnalyticsSyncStatus.tsx`

Shows per-property:
- Last sync time
- Rows synced
- Error messages (if any)
- Manual "Sync Now" button
- Sync frequency selector (hourly/daily/weekly)

**Commit:**
```bash
git commit -m "feat(audit): add sync status dashboard in settings"
```

---

### Sprint 4C Verification

```bash
npx tsc --noEmit && npx vitest run
```

```bash
git commit -m "chore: Sprint 4C complete — multi-account analytics with auto-sync"
```

---

## Sprint 5: P0 Rules Implementation (Blockers)

### Context

Implement ALL P0 (blocker) rules from the 437-rule checklist that aren't already implemented. P0 rules block publication. See `docs/plans/2026-02-11-unified-audit-critical-review.md` "Sprint 5" section for the full list.

### Task 5.1: Create HtmlNestingValidator

**Files:**
- Create: `services/audit/rules/HtmlNestingValidator.ts`
- Create: `services/audit/rules/__tests__/HtmlNestingValidator.test.ts`

**Step 1: Write the failing test**

```typescript
describe('HtmlNestingValidator', () => {
  it('detects <figure> nested inside <p> (rule 242)', () => {
    const validator = new HtmlNestingValidator();
    const html = '<p>Text <figure><img src="x.jpg"></figure> more text</p>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-242' }));
  });

  it('detects block elements in <p> (rule 243)', () => {
    const validator = new HtmlNestingValidator();
    const html = '<p>Text <div>block</div></p>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-243' }));
  });

  it('validates single <h1> in HTML (rule 251)', () => {
    const validator = new HtmlNestingValidator();
    const html = '<h1>First</h1><h1>Second</h1>';
    const issues = validator.validate(html);
    expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-251' }));
  });

  it('passes clean HTML', () => {
    const validator = new HtmlNestingValidator();
    const html = '<article><h1>Title</h1><p>Text</p><figure><img src="x.jpg"></figure></article>';
    const issues = validator.validate(html);
    expect(issues).toHaveLength(0);
  });
});
```

**Step 2: Run test — FAIL**
**Step 3: Implement** — parses HTML, checks nesting rules
**Step 4: Run test — PASS**
**Step 5: Commit**

```bash
git commit -m "feat(audit): add HtmlNestingValidator for rules 242, 243, 251, 252"
```

---

### Task 5.2: Create CanonicalValidator

**Files:**
- Create: `services/audit/rules/CanonicalValidator.ts`
- Create: `services/audit/rules/__tests__/CanonicalValidator.test.ts`

Tests for rules 271, 273, 346, 347, 349:
- Canonical tag present
- No canonical + noindex conflict
- Self-referencing canonical
- Canonical doesn't point to 404
- Canonical consistent with other signals

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add CanonicalValidator for rules 271, 273, 346, 347, 349"
```

---

### Task 5.3: Create SignalConflictChecker

**Files:**
- Create: `services/audit/rules/SignalConflictChecker.ts`
- Create: `services/audit/rules/__tests__/SignalConflictChecker.test.ts`

Checks for conflicting SEO signals:
- robots.txt blocks + sitemap includes (rule 373)
- noindex + canonical points elsewhere (rule 273)
- nofollow on internal links (rule context)

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add SignalConflictChecker for conflicting SEO signals"
```

---

### Task 5.4: Create RedirectChainChecker

**Files:**
- Create: `services/audit/rules/RedirectChainChecker.ts`
- Create: `services/audit/rules/__tests__/RedirectChainChecker.test.ts`

Tests for rules 358, 363:
- Detect 5xx errors
- Detect redirect loops/chains (follow up to 10 hops)

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add RedirectChainChecker for 5xx detection and redirect loops"
```

---

### Task 5.5: Create SourceContextAligner

**Files:**
- Create: `services/audit/rules/SourceContextAligner.ts`
- Create: `services/audit/rules/__tests__/SourceContextAligner.test.ts`

Validates content aligns with Source Context (SC) and Content Specification Index (CSI) — rule 6.

Uses AI to compare content against project business info and pillar definitions.

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add SourceContextAligner for SC/CSI alignment (rule 6)"
```

---

### Task 5.6: Strengthen centerpiece text validation

**Files:**
- Modify: existing `services/audit/phases/ContextualFlowPhase.ts`

Enhance rule 113: first 400 chars must contain CE + definition + key attributes (currently only checks CE presence).

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): strengthen centerpiece validation — CE + definition + key attributes in first 400 chars"
```

---

### Task 5.7: Add meta robots + robots.txt checks

**Files:**
- Create: `services/audit/rules/RobotsTxtParser.ts`
- Create: `services/audit/rules/__tests__/RobotsTxtParser.test.ts`

Rules 371, 372:
- Parse robots.txt, check if URL is blocked
- Check meta robots for noindex when page should be indexed

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add RobotsTxtParser for rules 371, 372"
```

---

### Task 5.8: Add alt text validation

**Files:**
- Modify: `services/audit/phases/HtmlTechnicalPhase.ts`

Rule 256: All images must have alt text. Wire existing alt text generation logic to validation.

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add alt text presence validation (rule 256)"
```

---

### Task 5.9: Add no-ads-before-content check

**Files:**
- Modify: `services/audit/phases/ContextualFlowPhase.ts`

Rule 118: No share buttons, ads, or banners before main content text.

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add no-ads-before-content check (rule 118)"
```

---

### Task 5.10: Wire all P0 rules into phase adapters

**Files:**
- Modify: `services/audit/phases/StrategicFoundationPhase.ts`
- Modify: `services/audit/phases/HtmlTechnicalPhase.ts`
- Modify: `services/audit/phases/ContextualFlowPhase.ts`
- Modify: `services/audit/phases/MetaStructuredDataPhase.ts`
- Modify: `services/audit/phases/UrlArchitecturePhase.ts`
- Modify: `services/audit/phases/CrossPageConsistencyPhase.ts`

Register all new P0 rule validators in the appropriate phase adapters.

**Commit:**
```bash
git commit -m "feat(audit): wire all P0 blocker rules into phase adapters"
```

---

### Sprint 5 Verification

```bash
npx tsc --noEmit && npx vitest run
```

Grep verification:
```bash
# All P0 rule IDs should appear in test files
grep -rn "rule-242\|rule-243\|rule-251\|rule-271\|rule-273\|rule-346\|rule-371\|rule-372" services/audit/
```

```bash
git commit -m "chore: Sprint 5 complete — all P0 blocker rules implemented"
```

---

## Sprint 6: P1 Rules Implementation (Critical)

### Context

Implement the ~52 P1 (critical) rules. These are organized by the existing phase structure. Rather than listing every single task, this sprint groups rules by phase adapter.

### Task 6.1: Strategic Foundation P1 rules (rules 4-5, 7-9, 11-13, 17, 19)

**Files:**
- Modify: `services/audit/phases/StrategicFoundationPhase.ts`
- Create: `services/audit/rules/AuthorEntityChecker.ts` (rules 17, 19)
- Tests for each

New checks:
- CE in first 2 sentences / first sentence (rules 4-5)
- SC attribute priority (rule 7), CS/AS classification (rules 8-9)
- CSI predicates (rules 11-13)
- Author entity existence (rule 17), Author schema (rule 19)

**TDD cycle per rule group**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): implement Strategic Foundation P1 rules (4-5, 7-9, 11-13, 17, 19)"
```

---

### Task 6.2: EAV System P1 rules (rules 33-41, 45, 51)

**Files:**
- Modify: `services/audit/phases/EavSystemPhase.ts`

New checks building on `eavAudit.ts`:
- Explicit EAV triples in text (rules 33-36)
- Named entities, not just pronouns (rule 37)
- Specific quantitative values with units (rules 40-41)
- Root attributes complete (rule 45)
- Facts align with authoritative sources (rule 51 → delegate to FactValidator)

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): implement EAV System P1 rules (33-41, 45, 51)"
```

---

### Task 6.3: Micro-Semantics P1 rules (rules 57-58, 61, 73)

**Files:**
- Modify: `services/audit/phases/MicroSemanticsPhase.ts`

New checks:
- Modality: "is/are" for facts, "can/may" for possibilities (rules 57-58)
- Predicate specificity (rule 61)
- SPO sentence pattern (rule 73)

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): implement Micro-Semantics P1 rules (57-58, 61, 73)"
```

---

### Task 6.4: Information Density P1 rules (rules 94-96, 98)

**Files:**
- Modify: `services/audit/phases/InformationDensityPhase.ts`

New checks:
- No redundant repetition (rule 94)
- No filler paragraphs (rule 95)
- No vague statements (rule 96)
- Direct answers without preamble (rule 98)

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): implement Information Density P1 rules (94-96, 98)"
```

---

### Task 6.5: Contextual Flow P1 rules (rules 115-117, 121-129, 135-136, 139, 141, 144, 146, 148)

**Files:**
- Modify: `services/audit/phases/ContextualFlowPhase.ts`

New checks:
- Centerpiece primaries (rules 115-117)
- Subordinate text rules — 11 rules (121-129)
- Heading content & vector rules (135-136, 139, 141, 144, 146, 148)

This is the largest rule group. Split into sub-tasks if needed during implementation.

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): implement Contextual Flow P1 rules (115-148)"
```

---

### Task 6.6: Internal Linking P1 rules (rules 162-165, 169, 171-172, 174, 177, 178-179, 181, 184)

**Files:**
- Modify: `services/audit/phases/InternalLinkingPhase.ts`

Building on existing `linkingAudit.ts`:
- Anchor text rules (162-165)
- Link placement (169, 171-172)
- Annotation text (174, 177)
- Link volume (178-179, 181, 184)

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): implement Internal Linking P1 rules (162-184)"
```

---

### Task 6.7: Content Format P1 rules (rules 205-206, 210, 215-216, 229)

**Files:**
- Modify: `services/audit/phases/ContentFormatPhase.ts`

New checks:
- OL for how-to, TABLE for comparisons (rules 205-206)
- List rules (210, 215)
- Table headers required (rule 216)
- IR Zone answer in first 400 chars (rule 229)

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): implement Content Format P1 rules (205-229)"
```

---

### Task 6.8: HTML Technical P1 rules (rules 233, 239, 244, 247, 255, 258, 261)

**Files:**
- Modify: `services/audit/phases/HtmlTechnicalPhase.ts`

New checks:
- Semantic HTML: `<article>` wraps content (rule 233), single `<main>` (rule 239)
- No pseudo-headings via bold/font-size (rule 244)
- HTML validates (rule 247)
- Image rules: unique per page (255), lazy loading (258), dimensions (261)

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): implement HTML Technical P1 rules (233-261)"
```

---

### Task 6.9: Meta & Structured Data P1 rules (rules 270, 276-279, 284, 288)

**Files:**
- Modify: `services/audit/phases/MetaStructuredDataPhase.ts`

New checks:
- Meta description length and uniqueness (rule 270)
- `lang` attribute (rule 276), viewport meta (rule 277), charset (rule 278)
- Schema type matches page type (rule 279)
- Schema validates against Google guidelines (rule 284)
- LocalBusiness/Service schema for applicable pages (rule 288)

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): implement Meta & Structured Data P1 rules (270-288)"
```

---

### Task 6.10: Cost of Retrieval P1 rules (rules 292, 304, 308)

**Files:**
- Modify: `services/audit/phases/CostOfRetrievalPhase.ts`
- Create: `services/audit/rules/CostOfRetrievalAuditor.ts`

New checks:
- DOM nodes < 1500 (rule 292) — count from raw HTML
- TTFB < 100ms (rule 304) — measure during fetch
- Compression enabled (rule 308) — check response headers

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): implement Cost of Retrieval P1 rules (292, 304, 308)"
```

---

### Task 6.11: URL Architecture P1 rules (rules 338, 340, 348, 354-355, 359, 361-362, 365, 367-369, 374-375, 378)

**Files:**
- Modify: `services/audit/phases/UrlArchitecturePhase.ts`
- Create: `services/audit/rules/UrlArchitectureAuditor.ts`

New checks:
- Lowercase URLs (rule 338), no session IDs (rule 340)
- No canonical chains (rule 348)
- Bot response time (rules 354-355)
- No active 404s (rule 359), 301 for permanent redirects (rule 361)
- No redirect chains (rule 362)
- No filter URL explosion (rule 365), duplicates handled via canonical (rule 367)
- Not "crawled not indexed" (rules 368-369) — needs GSC data
- In sitemap (rule 374), sitemap clean (rule 375), submitted (rule 378)

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): implement URL Architecture P1 rules (338-378)"
```

---

### Task 6.12: Cross-Page Consistency P1 rules (rules 380, 382, 390, 392, 394)

**Files:**
- Modify: `services/audit/phases/CrossPageConsistencyPhase.ts`

New checks:
- CE appears in site boilerplate (rule 380)
- One CE per entire site (rule 382)
- AS→CS flow exists (rule 390)
- No orphan pages (rule 392)
- Canonical query assignment per page (rule 394)

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): implement Cross-Page Consistency P1 rules (380-394)"
```

---

### Task 6.13: Semantic Distance P1 rule (rule 203)

**Files:**
- Modify: `services/audit/phases/SemanticDistancePhase.ts`

Wire `KnowledgeGraph.calculateSemanticDistance()` from `lib/knowledgeGraph.ts`:
- Rule 203: Canonical query assignment (each page has unique focus)

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): implement Semantic Distance P1 rule (203)"
```

---

### Sprint 6 Verification

```bash
npx tsc --noEmit && npx vitest run
```

```bash
git commit -m "chore: Sprint 6 complete — all P1 critical rules implemented"
```

---

## Sprint 7: P2-P4 Rules Implementation (Completeness)

### Context

Implement remaining ~225 rules (P2-P4). These are organized by implementation type for efficiency.

### Task 7.1: Algorithmic pattern-based rules (~120 rules)

**Files:**
- Multiple rule files in `services/audit/rules/`

Grouped sub-tasks:

**7.1a: Context qualifiers (rules 85-93)**
- Detect temporal, spatial, conditional qualifiers
- `ContextQualifierDetector.ts`

**7.1b: Filler word replacement (rules 100-112)**
- Enhance existing filler detection with replacement suggestions
- Modify `InformationDensityPhase.ts`

**7.1c: Heading content validation (rules 142-143, 147, 149)**
- Vector straightness, no keyword stuffing in headings

**7.1d: Discourse integration (rules 150-153)**
- Transition word detection between sections

**7.1e: Contextual bridges (rules 154-158)**
- Topic bridge detection between related pages

**7.1f: URL structure rules (rules 336-345)**
- URL length, depth, word separators

**7.1g: HTML nesting/structure (rules 245-250)**
- Extend HtmlNestingValidator

**7.1h: Image metadata (rules 260-267)**
- Next-gen format, width/height attributes, file size

**7.1i: Caching headers (rules 311-314)**
- Cache-Control, ETag, max-age

**7.1j: HTTP headers (rules 315-319)**
- Security headers, HSTS, X-Content-Type

**7.1k: Core Web Vitals (rules 320-333)**
- Create `services/audit/rules/CoreWebVitalsChecker.ts`
- LCP, FID/INP, CLS thresholds

**7.1l: Table/list formatting (rules 211-219)**
- Extend ContentFormatPhase

**7.1m: Visual hierarchy (rules 220-224)**
- Component ordering validation

Each sub-task follows TDD cycle. Commit after each group.

```bash
git commit -m "feat(audit): implement P2-P4 algorithmic rules — context qualifiers, filler, headings, discourse, URLs, HTML, CWV"
```

---

### Task 7.2: AI-assisted rules (~80 rules)

**Files:**
- Multiple modifications to phase adapters

These rules require LLM analysis. Group by phase:

**7.2a: SC attribute priority alignment (rules 7-8, 14-16)**
- AI evaluates if content prioritizes the right SC attributes

**7.2b: Author expertise signals (rules 21-24)**
- AI checks for first-person experience, specific examples, unique insights

**7.2c: EAV explicitness validation (rules 34-36, 47-48)**
- AI validates that EAV triples are explicitly stated, not implied

**7.2d: Frame semantics (rules 69-72)**
- AI detects semantic frames and validates appropriate predicates

**7.2e: Vector straightness / content progression (rules 144-149)**
- AI evaluates if content progresses logically

**7.2f: Featured snippet optimization (rules 225-228)**
- AI checks for 40-60 word direct answer format

**7.2g: Related content relevance (rules 230-232)**
- AI validates "related articles" section relevance

**7.2h: Website-type specific rules (rules 400-432)**
- `WebsiteTypeRuleEngine.ts`
- E-commerce: product schema, pricing, availability
- SaaS: feature comparisons, pricing tables, docs structure
- B2B: case studies, testimonials, service pages
- Blog: author info, dates, categories

Each sub-task follows TDD cycle. Commit after each group.

```bash
git commit -m "feat(audit): implement P2-P4 AI-assisted rules — SC priority, author, EAV, frames, snippets, website-type"
```

---

### Task 7.3: External data rules (~30 rules)

**Files:**
- Multiple phase adapter modifications

Rules requiring external API calls:
- Author citations on external sources (rule 20) — web search
- Competitor attribute analysis (rule 413) — SERP data
- GSC indexation status (rules 368-370) — GSC API
- Navigation/dynamic link rules (rules 186-189) — page crawl
- URL fragments / jump links (rules 190-194) — page crawl

These rules are conditional on data availability (e.g., GSC rules only run if GSC connected).

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): implement P2-P4 external data rules — citations, indexation, navigation"
```

---

### Sprint 7 Verification

```bash
npx tsc --noEmit && npx vitest run
```

Rule coverage grep:
```bash
# Count implemented rule references
grep -rn "ruleId.*rule-" services/audit/ | wc -l
# Should be close to 437
```

```bash
git commit -m "chore: Sprint 7 complete — full 437-rule coverage achieved"
```

---

## Sprint 8: Unified Dashboard UI

### Context

Build the single unified audit dashboard that replaces the fragmented audit UIs. Uses the 14 phase cards matching the checklist categories, with configurable weights and website-type selector.

### Task 8.1: Create UnifiedAuditDashboard component

**Files:**
- Create: `components/audit/UnifiedAuditDashboard.tsx`
- Create: `components/audit/__tests__/UnifiedAuditDashboard.test.tsx`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UnifiedAuditDashboard } from '../UnifiedAuditDashboard';
import type { UnifiedAuditReport } from '../../../services/audit/types';

const mockReport: UnifiedAuditReport = {
  id: 'test',
  projectId: 'proj-1',
  auditType: 'internal',
  overallScore: 78,
  phaseResults: [
    { phase: 'strategicFoundation', score: 85, weight: 10, passedChecks: 28, totalChecks: 32, findings: [], summary: 'Good' },
    // ... other phases
  ],
  contentMergeSuggestions: [],
  missingKnowledgeGraphTopics: [],
  cannibalizationRisks: [],
  language: 'en',
  version: 1,
  createdAt: new Date().toISOString(),
  auditDurationMs: 45000,
  prerequisitesMet: { businessInfo: true, pillars: true, eavs: true },
};

describe('UnifiedAuditDashboard', () => {
  it('renders overall score', () => {
    render(<UnifiedAuditDashboard report={mockReport} />);
    expect(screen.getByText('78')).toBeDefined();
  });

  it('renders all 14 phase cards', () => {
    render(<UnifiedAuditDashboard report={mockReport} />);
    expect(screen.getByText(/Strategic Foundation/)).toBeDefined();
    // ... check all 14 phases render
  });

  it('groups findings by severity', () => {
    render(<UnifiedAuditDashboard report={mockReport} />);
    expect(screen.getByText(/Critical Issues/)).toBeDefined();
  });

  it('shows prerequisite status', () => {
    render(<UnifiedAuditDashboard report={mockReport} />);
    expect(screen.getByText(/Business Info/)).toBeDefined();
  });
});
```

**Step 2: Run test — FAIL**
**Step 3: Implement** — layout from brainstorm document section 5.1
**Step 4: Run test — PASS**
**Step 5: Commit**

```bash
git commit -m "feat(audit): add UnifiedAuditDashboard with 14 phase cards and severity grouping"
```

---

### Task 8.2: Create AuditFindingCard component

**Files:**
- Create: `components/audit/AuditFindingCard.tsx`

Expandable card showing: severity icon, title, phase badge, "Why It Matters", current vs expected, example fix, impact badge, auto-fix button.

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add AuditFindingCard with contextual suggestions and auto-fix"
```

---

### Task 8.3: Create PhaseScoreCard component

**Files:**
- Create: `components/audit/PhaseScoreCard.tsx`

Compact card: phase name, icon, score with color-coded progress bar, passed/total count, expandable detail.

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add PhaseScoreCard with color-coded progress bars"
```

---

### Task 8.4: Create AuditScoreRing component

**Files:**
- Create: `components/audit/AuditScoreRing.tsx`

Circular SVG progress indicator: score in center, animated ring, delta from previous audit.

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add AuditScoreRing with animated circular progress"
```

---

### Task 8.5: Create AuditWeightSliders component

**Files:**
- Create: `components/audit/AuditWeightSliders.tsx`

Weight configuration panel:
- One slider per audit phase (14 sliders)
- Sliders constrain to sum = 100
- "Reset to defaults" button
- Save to `project_audit_config` table

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add AuditWeightSliders for per-project weight configuration"
```

---

### Task 8.6: Create WebsiteTypeSelector component

**Files:**
- Create: `components/audit/WebsiteTypeSelector.tsx`

Dropdown: E-commerce / SaaS / B2B / Blog / Other

Selecting a type applies the bonus/malus rules from Deel O (rules 400-432).

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add WebsiteTypeSelector for industry-specific rules"
```

---

### Task 8.7: Create AuditPrerequisiteGate component

**Files:**
- Create: `components/audit/AuditPrerequisiteGate.tsx`

Modal shown when prerequisites missing: checklist of 3 pillars with status, links to setup wizards, "Proceed anyway" for external URLs.

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add AuditPrerequisiteGate with wizard links"
```

---

### Task 8.8: Create project_audit_config table and API

**Files:**
- Create: migration for `project_audit_config`

```sql
CREATE TABLE project_audit_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  weights JSONB NOT NULL DEFAULT '{}',
  website_type TEXT DEFAULT 'other',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE project_audit_config ENABLE ROW LEVEL SECURITY;
```

**Commit:**
```bash
git commit -m "feat(audit): add project_audit_config table for weight customization"
```

---

### Sprint 8 Verification

```bash
npx tsc --noEmit && npx vitest run
```

```bash
git commit -m "chore: Sprint 8 complete — unified audit dashboard with configurable weights"
```

---

## Sprint 9: Click-to-Audit Integration

### Context

Add audit triggers to every URL display in the application so users can audit any page with one click.

### Task 9.1: Create AuditButton component

**Files:**
- Create: `components/audit/AuditButton.tsx`
- Create: `components/audit/__tests__/AuditButton.test.tsx`

Small reusable button: icon-only, icon+text, or text-only variants. On click navigates to `/audit?url=...&projectId=...`.

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add reusable AuditButton component with variants"
```

---

### Task 9.2: Add AuditButton to URL displays

**Files to modify** (add AuditButton next to each URL):
- Topic cards with published URLs
- Performance data tables
- Content overview lists
- Migration workbench URL rows
- GSC data table URL column

Identify exact components by grepping for URL rendering patterns.

**Commit:**
```bash
git commit -m "feat(audit): add click-to-audit buttons to all URL displays across the app"
```

---

### Task 9.3: Create AuditSidePanel component

**Files:**
- Create: `components/audit/AuditSidePanel.tsx`

Slide-out panel (right, 50% width): compact version of UnifiedAuditDashboard, close button, "Open full audit" link.

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add AuditSidePanel for inline audit results"
```

---

### Task 9.4: Create ExternalUrlInput component

**Files:**
- Create: `components/audit/ExternalUrlInput.tsx`

URL input with validation, provider selector dropdown, "Discover related pages" checkbox, "Run Audit" button with loading state.

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add ExternalUrlInput for external URL auditing"
```

---

### Sprint 9 Verification

```bash
npx tsc --noEmit && npx vitest run
```

```bash
git commit -m "chore: Sprint 9 complete — click-to-audit integration"
```

---

## Sprint 10: Multilingual Support

### Context

All audit checks, messages, and UI elements must support EN, NL, DE, FR, ES. Some language support already exists (stop words, LLM phrases in `auditPatternsMultilingual.ts`).

### Task 10.1: Create audit i18n system

**Files:**
- Create: `config/audit-i18n/index.ts` — translation loader + type definitions
- Create: `config/audit-i18n/en.ts` — English translations
- Create: `config/audit-i18n/nl.ts` — Dutch translations
- Create: `config/audit-i18n/de.ts` — German translations
- Create: `config/audit-i18n/fr.ts` — French translations
- Create: `config/audit-i18n/es.ts` — Spanish translations

Structure per language file:
- `phases` — phase names and descriptions
- `findings` — finding templates (title, whyItMatters, exampleFix) keyed by ruleId
- `ui` — dashboard labels, buttons, tooltips
- `philosophy` — scoring interpretation text

**TDD cycle**: test type-safety of translation keys → implement → pass → commit

```bash
git commit -m "feat(audit): add i18n system for audit UI with EN/NL/DE/FR/ES translations"
```

---

### Task 10.2: Make language-specific rules work for all 5 languages

**Files:**
- Modify: `services/audit/phases/MicroSemanticsPhase.ts`
- Modify: `services/audit/phases/InformationDensityPhase.ts`

German-specific: verb-final clause detection
French-specific: adjective position after noun
Dutch-specific: compound word handling

**TDD cycle**: test each language variant → implement → pass → commit

```bash
git commit -m "feat(audit): add language-specific rule variants for DE/FR/NL"
```

---

### Task 10.3: Auto-detect content language

**Files:**
- Modify: `services/audit/ContentFetcher.ts`

Detect language from:
1. `<html lang="...">` attribute
2. Meta content-language header
3. Heuristic: character frequency analysis (existing `detectLanguage` utility if available)

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add automatic content language detection"
```

---

### Task 10.4: Translate finding messages

**Files:**
- Modify: `services/audit/phases/AuditPhase.ts` (base class)

`createFinding()` looks up translation for current language. Falls back to English if translation missing.

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): translate finding messages using i18n system"
```

---

### Task 10.5: Localize dashboard UI strings

**Files:**
- Modify: `components/audit/UnifiedAuditDashboard.tsx` and sub-components

Replace all hardcoded English strings with i18n lookups.

**Commit:**
```bash
git commit -m "feat(audit): localize audit dashboard UI for 5 languages"
```

---

### Sprint 10 Verification

```bash
npx tsc --noEmit && npx vitest run
```

```bash
git commit -m "chore: Sprint 10 complete — multilingual audit support (EN/NL/DE/FR/ES)"
```

---

## Sprint 11: Export Enhancement

### Context

Connect the unified audit results to the existing export system (`utils/exportUtils.ts`). That module already supports CSV, XLSX, HTML, PDF, and ZIP export.

### Task 11.1: Create AuditReportExporter service

**Files:**
- Create: `services/audit/AuditReportExporter.ts`
- Create: `services/audit/__tests__/AuditReportExporter.test.ts`

**Step 1: Write the failing test**

```typescript
describe('AuditReportExporter', () => {
  it('exports CSV with one row per finding', async () => {
    const exporter = new AuditReportExporter();
    const csv = await exporter.exportCsv(mockReport);
    expect(csv).toContain('Phase,Severity,Rule,Title');
    const lines = csv.split('\n');
    expect(lines.length).toBeGreaterThan(1);
  });

  it('exports XLSX with multiple sheets', async () => {
    const exporter = new AuditReportExporter();
    const blob = await exporter.exportXlsx(mockReport);
    expect(blob.size).toBeGreaterThan(0);
    // Verify sheet names via xlsx library
  });

  it('exports standalone HTML report', async () => {
    const exporter = new AuditReportExporter();
    const html = await exporter.exportHtml(mockReport);
    expect(html).toContain('<html');
    expect(html).toContain('Overall Score');
    // Verify no external CSS/JS dependencies
    expect(html).not.toContain('href="http');
  });
});
```

**Step 2: Run test — FAIL**
**Step 3: Implement** using existing export patterns from `utils/exportUtils.ts`
**Step 4: Run test — PASS**
**Step 5: Commit**

```bash
git commit -m "feat(audit): add AuditReportExporter with CSV, XLSX (5 sheets), HTML formats"
```

---

### Task 11.2: Add export dropdown to dashboard

**Files:**
- Modify: `components/audit/UnifiedAuditDashboard.tsx`

Add dropdown button in header: Export as CSV / Export as Excel / Export as HTML / Export as PDF.

**Commit:**
```bash
git commit -m "feat(audit): add export dropdown to unified audit dashboard"
```

---

### Task 11.3: Add batch export for corpus audits

**Files:**
- Modify: `services/audit/AuditReportExporter.ts`

Add `exportBatch(reports[])` — ZIP file with one report per page/topic, plus summary sheet.

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add batch export as ZIP for corpus-level audits"
```

---

### Sprint 11 Verification

```bash
npx tsc --noEmit && npx vitest run
```

```bash
git commit -m "chore: Sprint 11 complete — export enhancement"
```

---

## Sprint 12: Performance Timeline & Audit History

### Context

Track audit versions over time, visualize improvement trajectory, and correlate with GSC/GA4 performance data.

### Task 12.1: Create unified_audit_snapshots table

**Files:**
- Create: migration

```sql
CREATE TABLE unified_audit_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  audit_type TEXT NOT NULL CHECK (audit_type IN ('internal', 'external', 'published')),

  overall_score NUMERIC(5,2) NOT NULL,
  phase_scores JSONB NOT NULL, -- {phaseName: score} for all 14 phases

  findings_count_critical INT DEFAULT 0,
  findings_count_high INT DEFAULT 0,
  findings_count_medium INT DEFAULT 0,
  findings_count_low INT DEFAULT 0,

  full_report JSONB, -- Complete UnifiedAuditReport

  -- Performance data at time of audit
  gsc_clicks INT,
  gsc_impressions INT,
  gsc_ctr NUMERIC(5,4),
  gsc_position NUMERIC(5,2),
  ga4_pageviews INT,
  ga4_bounce_rate NUMERIC(5,4),

  -- Legacy audit references
  legacy_audit_id UUID REFERENCES audit_results(id),
  legacy_linking_audit_id UUID,

  language TEXT DEFAULT 'en',
  version INT NOT NULL DEFAULT 1,
  content_hash TEXT,
  weights_used JSONB, -- Weight config at time of audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_uas_project ON unified_audit_snapshots(project_id);
CREATE INDEX idx_uas_url ON unified_audit_snapshots(url);
CREATE INDEX idx_uas_created ON unified_audit_snapshots(created_at);
CREATE INDEX idx_uas_topic ON unified_audit_snapshots(topic_id);

ALTER TABLE unified_audit_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY uas_project ON unified_audit_snapshots FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);
```

**Commit:**
```bash
git commit -m "feat(audit): add unified_audit_snapshots table with performance data and legacy references"
```

---

### Task 12.2: Wire snapshot saving into orchestrator

**Files:**
- Modify: `services/audit/UnifiedAuditOrchestrator.ts`

After `runAudit()` completes, automatically save snapshot. Include current GSC/GA4 data if available.

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): auto-save audit snapshots after each audit run"
```

---

### Task 12.3: Create AuditTimelineView component

**Files:**
- Create: `components/audit/AuditTimelineView.tsx`

Recharts-based timeline:
- Horizontal axis: dates
- Line: audit score over time
- Optional overlay: GSC clicks / GA4 pageviews
- Click data point to view that historical audit
- AI-generated insight text below chart

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add AuditTimelineView with performance overlay"
```

---

### Task 12.4: Create AuditComparisonView component

**Files:**
- Create: `components/audit/AuditComparisonView.tsx`

Side-by-side comparison of two snapshots:
- Phase-by-phase score comparison with delta arrows
- New findings (appeared since last)
- Resolved findings (fixed since last)
- Persistent findings (still present)

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add AuditComparisonView for snapshot diff"
```

---

### Task 12.5: Create PerformanceTrendChart component

**Files:**
- Create: `components/audit/PerformanceTrendChart.tsx`

Dual Y-axis Recharts chart:
- Left axis: audit score (0-100)
- Right axis: clicks / impressions
- Hover tooltip with all values
- Time-lagged correlation indicator

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): add PerformanceTrendChart with dual-axis and correlation"
```

---

### Sprint 12 Verification

```bash
npx tsc --noEmit && npx vitest run
```

```bash
git commit -m "chore: Sprint 12 complete — performance timeline and audit history"
```

---

## Sprint 13: Advanced Features & Polish

### Context

Final sprint: integrate remaining cross-cutting features, add polish, and prepare for production.

### Task 13.1: Content merge suggestions integration

**Files:**
- Modify: `services/audit/UnifiedAuditOrchestrator.ts`

Wire `corpusAudit.ts` overlap detection into unified results:
- When auditing a page, check for overlap with other project pages
- Add `ContentMergeSuggestion` items to the report

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): integrate content merge suggestions from corpus audit"
```

---

### Task 13.2: Knowledge graph gap detection

**Files:**
- Modify: `services/audit/phases/EavSystemPhase.ts`

Wire EAV audit gaps:
- Report missing entities from knowledge graph
- Suggest specific EAV triples to add
- Link to EAV Discovery Wizard

**TDD cycle**: test → fail → implement → pass → commit

```bash
git commit -m "feat(audit): integrate knowledge graph gap detection into audit results"
```

---

### Task 13.3: 80%+ scoring philosophy messaging

**Files:**
- Modify: `components/audit/UnifiedAuditDashboard.tsx`

Add contextual messaging:
- Score interpretation badges: "Excellent (90+)", "Very Good (80-89)", etc.
- Scoring philosophy note at bottom of dashboard
- Achievement indicators when score crosses thresholds

**Commit:**
```bash
git commit -m "feat(audit): add scoring philosophy messaging and achievement indicators"
```

---

### Task 13.4: Audit scheduling schema (future-ready)

**Files:**
- Create: migration for `audit_schedules` table

```sql
CREATE TABLE audit_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  alert_threshold NUMERIC(5,2) DEFAULT 70,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Schema only — scheduled execution deferred to future sprint.

**Commit:**
```bash
git commit -m "feat(audit): add audit_schedules table for future automated auditing"
```

---

### Task 13.5: Update CLAUDE.md with audit system documentation

**Files:**
- Modify: `CLAUDE.md`

Add section documenting:
- `services/audit/` directory structure
- UnifiedAuditOrchestrator API
- Phase adapter pattern
- How to add new audit rules
- Weight configuration
- Export system

**Commit:**
```bash
git commit -m "docs: update CLAUDE.md with unified audit system documentation"
```

---

### Task 13.6: Final integration test and cleanup

**Files:**
- Create: `services/audit/__tests__/integration.test.ts`

Full integration test:
1. Create mock project with business info, pillars, EAVs
2. Run unified audit
3. Verify all 14 phases return results
4. Verify snapshot is saved
5. Run second audit, verify comparison works
6. Export results, verify format

```bash
npx tsc --noEmit && npx vitest run
```

Final grep verification:
```bash
# Rule coverage
grep -c "ruleId" services/audit/rules/*.ts services/audit/phases/*.ts
# Should reference 437+ rule IDs

# No orphaned V1 components
grep -rn "ComprehensiveAuditDashboard" components/
# Should return 0

# No hardcoded model names outside service registry
grep -rn "validClaudeModels\|validGeminiModels" services/
# Should return 0
```

**Commit:**
```bash
git commit -m "chore: Sprint 13 complete — advanced features, polish, and final integration test"
```

---

### Full Implementation Complete

```bash
git commit -m "chore: Unified Content Audit System complete — 437-rule coverage, 14 phases, GSC/GA4 integration, multilingual, export"
```

---

## Verification Checklist (Per Sprint)

After every sprint, verify:

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npx vitest run` — all tests pass (no regressions)
- [ ] New tests added for all new code
- [ ] No hardcoded values (use `config/serviceRegistry.ts` for external config)
- [ ] No new V1-style component duplication
- [ ] Commit history is clean with descriptive messages
