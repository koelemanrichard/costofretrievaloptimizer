
# Persistence Task 03: Save Analysis Reports

**Status:** [x] Completed
**Priority:** MEDIUM
**Target File:** `components/ProjectDashboardContainer.tsx`

## 1. The Issue
Currently, when an analysis (like `onValidateMap`) completes, it dispatches the result to the Redux state but does not write it to the `topical_maps` table.

## 2. Implementation Steps

### Step 2.1: Helper Function
- Create a helper `saveAnalysisState(key: keyof AnalysisState, data: any)` inside the component.
- It should:
    1.  Get the current `activeMap`.
    2.  Merge the new data with the existing `activeMap.analysis_state`.
    3.  Call `supabase.from('topical_maps').update({ analysis_state: mergedState }).eq(...)`.
    4.  Dispatch `UPDATE_MAP_DATA` to update the local `topicalMaps` list with the new cache.

### Step 2.2: Update Handlers
Update the following handlers to call `saveAnalysisState` after a successful AI call:
- `onValidateMap` (save `validationResult`)
- `onAnalyzeSemanticRelationships` (save `semanticAnalysisResult`)
- `onAnalyzeContextualCoverage` (save `contextualCoverageResult`)
- `onAuditInternalLinking` (save `internalLinkAuditResult`)
- `onCalculateTopicalAuthority` (save `topicalAuthorityScore`)
- `onGeneratePublicationPlan` (save `publicationPlan`)
- `handleAnalyzeGsc` (save `gscOpportunities`)

## 3. Verification
- Run an analysis (e.g., Validate Map).
- Check the Network tab or Supabase dashboard to confirm a `PATCH` request was sent to `topical_maps`.
