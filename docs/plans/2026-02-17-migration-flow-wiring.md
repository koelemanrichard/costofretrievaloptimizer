# Migration Flow Wiring — Follow-Up Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire all orphaned Phase 1 components and services into the frontend so the dual-path migration flow is fully accessible to users end-to-end.

**Architecture:** The services, hooks, and components from the migration-flow-redesign plan are all built and tested. This plan connects them: launching the ExistingSiteWizardContainer from MapSelectionScreen, integrating real step components into the wizard, creating missing hook wrappers, and passing context props to existing components.

**Tech Stack:** React 18, TypeScript, TailwindCSS, existing services/hooks from Phase 1.

---

## Context: What Exists But Isn't Wired

| Item | Type | Location | Gap |
|------|------|----------|-----|
| ExistingSiteWizardContainer | Component | `components/migration/ExistingSiteWizardContainer.tsx` | Never imported; steps are placeholder divs |
| OverlayView | Component | `components/migration/OverlayView.tsx` | Never imported |
| PillarValidationStep | Component | `components/migration/steps/PillarValidationStep.tsx` | Never imported |
| useBatchSemanticAnalysis | Hook | `hooks/useBatchSemanticAnalysis.ts` | Never called |
| PillarDetectionService | Service | `services/ai/pillarDetection.ts` | No hook wrapper; never instantiated |
| SiteStructureDiscoveryService | Service | `services/ai/siteStructureDiscovery.ts` | Never used |
| AugmentedMapGenerator | Service | `services/ai/augmentedMapGeneration.ts` | Never used |
| OverlayService | Service | `services/migration/overlayService.ts` | Types used but service never called |
| OpportunityScorer | Service | `services/migration/opportunityScorer.ts` | Never used |
| businessInfoValidator | Utility | `utils/businessInfoValidator.ts` | Never called |
| MigrationWorkbenchModal | Component | `components/migration/MigrationWorkbenchModal.tsx` | mappedTopic/competingPages props never passed |
| MapSelectionScreen | Component | `components/screens/MapSelectionScreen.tsx` | onStartAnalysis does nothing |

---

## Task 1: Launch ExistingSiteWizardContainer from MapSelectionScreen

**Files:**
- Modify: `components/migration/MigrationDashboardContainer.tsx`
- Modify: `App.tsx` or parent routing component

**What:**
- When `onStartAnalysis` is called from MapSelectionScreen, set `viewMode` to show `ExistingSiteWizardContainer`
- Import `ExistingSiteWizardContainer` in `MigrationDashboardContainer`
- Add state to toggle between `AuthorityWizardContainer` and `ExistingSiteWizardContainer`
- Pass required props: `projectId`, `mapId`, `inventory`, `topics`, `isLoadingInventory`, `onRefreshInventory`, `onOpenWorkbench`

**Acceptance:**
- Clicking "Optimize Existing Site" on MapSelectionScreen opens the 7-step wizard
- Clicking "New Strategy" still works as before (no regression)

---

## Task 2: Wire Step 2 (Import) into ExistingSiteWizardContainer

**Files:**
- Modify: `components/migration/ExistingSiteWizardContainer.tsx`

**What:**
- Import `ImportStep` from `./steps/ImportStep`
- Replace Step 2 placeholder div with `<ImportStep>` component
- Pass required props: `projectId`, `mapId`, `inventory`, `onComplete`, `onRefreshInventory`
- Wire `onComplete` to advance to Step 3

**Acceptance:**
- Step 2 shows the real import UI (sitemap + GSC)
- Completing import advances to Step 3

---

## Task 3: Wire Step 3 (Analyze) — Connect useBatchSemanticAnalysis

**Files:**
- Modify: `components/migration/ExistingSiteWizardContainer.tsx`

**What:**
- Import and call `useBatchSemanticAnalysis` hook
- Replace Step 3 placeholder with a semantic analysis UI:
  - "Run Semantic Analysis" button that calls `startBatch(inventory)`
  - Progress bar showing `progress.completed / progress.total`
  - Results summary: detected entities, top CEs
  - Error display
- Wire completion to advance to Step 4
- Store `results` in state for Step 4 (PillarDetection)

**Acceptance:**
- Step 3 shows analysis controls
- Clicking "Run" processes all inventory pages
- Progress bar updates in real time
- Results are accessible to Step 4

---

## Task 4: Create usePillarDetection hook

**Files:**
- Create: `hooks/usePillarDetection.ts`

**What:**
- Wrap `PillarDetectionService.aggregateFromDetections()` in a React hook
- Accept `inventory: SiteInventoryItem[]` (reads detected_ce/sc/csi from items)
- Convert inventory items to `DetectedPageResult[]` format
- Call `aggregateFromDetections()` to produce `PillarSuggestion`
- Optionally call `suggestPillarsWithAI()` for AI refinement
- Return `{ suggestion, isLoading, error, detect, refineWithAI }`

**Acceptance:**
- Hook compiles with zero errors
- Returns PillarSuggestion that PillarValidationStep can render

---

## Task 5: Wire Step 4 (Pillars) — Connect PillarValidationStep

**Files:**
- Modify: `components/migration/ExistingSiteWizardContainer.tsx`

**What:**
- Import `PillarValidationStep` from `./steps/PillarValidationStep`
- Import `usePillarDetection` hook
- Replace Step 4 placeholder with `<PillarValidationStep>`
- Call `usePillarDetection` to generate suggestion from Step 3 results
- Pass props: `suggestion`, `isLoading`, `onConfirm`, `onRegenerate`
- On confirm: store validated pillars in state, advance to Step 5
- On regenerate: re-run `usePillarDetection`

**Acceptance:**
- Step 4 shows real pillar validation UI with confidence bars
- Users can edit/confirm pillars
- Confirmed pillars are stored for downstream steps

---

## Task 6: Create useAugmentedMap hook

**Files:**
- Create: `hooks/useAugmentedMap.ts`

**What:**
- Wrap `SiteStructureDiscoveryService` + `AugmentedMapGenerator` in a React hook
- Accept inventory (with detected_ce), confirmed pillars, and businessInfo
- Step 1: Call `SiteStructureDiscoveryService.discoverStructure()` to cluster pages
- Step 2: Call `AugmentedMapGenerator.generate()` with clusters + AI gap analysis
- Return `{ topics, discoveredCount, gapCount, isGenerating, error, generate }`

**Acceptance:**
- Hook compiles with zero errors
- Produces AugmentedMapResult with discovered + generated topics

---

## Task 7: Wire Step 5 (Map) — Connect useAugmentedMap

**Files:**
- Modify: `components/migration/ExistingSiteWizardContainer.tsx`

**What:**
- Import `useAugmentedMap` hook
- Replace Step 5 placeholder with map review UI:
  - "Generate Map" button
  - Display discovered topics (with page counts) and gap topics
  - Allow removing gap topics or editing titles
  - Summary: "N discovered topics, M gap topics identified"
- Wire completion to advance to Step 6

**Acceptance:**
- Step 5 shows the augmented topical map
- Users can review discovered vs generated topics
- Proceeding stores the final topic list for overlay

---

## Task 8: Create useOverlay hook

**Files:**
- Create: `hooks/useOverlay.ts`

**What:**
- Wrap `OverlayService.computeOverlay()` in a React hook
- Accept topics (from Step 5) and inventory
- Return `{ nodes, summary, isComputing, compute }`
- Summary includes counts per status (green/yellow/red/orange/gray)

**Acceptance:**
- Hook compiles with zero errors
- Produces OverlayNode[] that OverlayView can render

---

## Task 9: Wire Step 6 (Overlay) — Connect OverlayView

**Files:**
- Modify: `components/migration/ExistingSiteWizardContainer.tsx`

**What:**
- Import `OverlayView` from `../OverlayView`
- Import `useOverlay` hook
- Replace Step 6 placeholder with `<OverlayView>`
- Auto-compute overlay when entering Step 6
- Pass `nodes` from useOverlay to OverlayView
- Wire `onOpenWorkbench` callback

**Acceptance:**
- Step 6 shows the real overlay visualization
- Color-coded topics with detail panel
- Users can open workbench from overlay

---

## Task 10: Wire Step 7 (Execute) into ExistingSiteWizardContainer

**Files:**
- Modify: `components/migration/ExistingSiteWizardContainer.tsx`

**What:**
- Import `ExecuteStep` from `./steps/ExecuteStep`
- Replace Step 7 placeholder with `<ExecuteStep>`
- Pass required props: `projectId`, `mapId`, `inventory`, `topics`, `onOpenWorkbench`

**Acceptance:**
- Step 7 shows the real execute UI with action queue
- Users can open workbench for individual pages

---

## Task 11: Pass strategic context to MigrationWorkbenchModal

**Files:**
- Modify: `components/migration/MigrationDashboardContainer.tsx`

**What:**
- When opening workbench, find the mapped topic for the inventory item
- Find competing pages (other inventory items mapped to same topic)
- Pass `mappedTopic` and `competingPages` to `<MigrationWorkbenchModal>`

```typescript
const mappedTopic = workbenchItem?.mapped_topic_id
  ? allTopics.find(t => t.id === workbenchItem.mapped_topic_id) ?? null
  : null;

const competingPages = workbenchItem?.mapped_topic_id
  ? inventory.filter(i => i.mapped_topic_id === workbenchItem.mapped_topic_id && i.id !== workbenchItem.id)
  : [];
```

**Acceptance:**
- Workbench shows "Target Topic" card with topic title/type
- Shows cannibalization warning when competing pages exist
- Shows GSC queries the page ranks for

---

## Task 12: Wire businessInfoValidator at analysis boundaries

**Files:**
- Modify: `components/migration/ExistingSiteWizardContainer.tsx`

**What:**
- Import `validateBusinessInfoForAnalysis` and `validatePillarsForAnalysis`
- Before Step 3 (Analyze): validate business info, show error if invalid
- Before Step 5 (Map): validate pillars, show error if invalid
- Show validation errors as inline alerts with instructions

**Acceptance:**
- Users see clear error messages if business info is incomplete
- Cannot proceed to analysis without valid business info

---

## Task 13: Integrate OpportunityScorer into PlanStep

**Files:**
- Modify: `components/migration/steps/PlanStep.tsx`

**What:**
- Import `OpportunityScorer` from `../../services/migration/opportunityScorer`
- After plan generation, score each action with OpportunityScorer
- Add quadrant badge to each row in the plan table (Quick Win / Strategic / Fill-in / Deprioritize)
- Sort Quick Wins to top by default

**Acceptance:**
- Plan table shows opportunity quadrant for each action
- Quick Wins are visually highlighted
- Users can prioritize work effectively

---

## Task 14: Pass overlayNodes to ExportPanel

**Files:**
- Modify: `components/migration/MigrationDashboardContainer.tsx`

**What:**
- When overlay data is available, pass `overlayNodes` prop to ExportPanel
- This enables the "Overlay Status CSV" export button

**Acceptance:**
- Export panel shows "Overlay Status CSV" button when overlay data exists
- CSV downloads with correct topic/status/page data

---

## Files Changed Summary

| File | Action | What |
|------|--------|------|
| `components/migration/MigrationDashboardContainer.tsx` | MODIFY | Launch wizard, pass workbench context, pass overlay to export |
| `components/migration/ExistingSiteWizardContainer.tsx` | MODIFY | Replace all 7 placeholder steps with real components |
| `hooks/usePillarDetection.ts` | CREATE | Hook wrapping PillarDetectionService |
| `hooks/useAugmentedMap.ts` | CREATE | Hook wrapping SiteStructureDiscovery + AugmentedMapGenerator |
| `hooks/useOverlay.ts` | CREATE | Hook wrapping OverlayService |
| `components/migration/steps/PlanStep.tsx` | MODIFY | Add OpportunityScorer quadrant badges |

---

## Verification

1. `npx tsc --noEmit` — zero errors
2. `npx vitest run` — zero failures
3. Manual: Click "Optimize Existing Site" → verify 7-step wizard opens
4. Manual: Walk through all 7 steps with real data
5. Manual: Open workbench → verify strategic context shows
6. Manual: Export overlay CSV → verify data is correct
