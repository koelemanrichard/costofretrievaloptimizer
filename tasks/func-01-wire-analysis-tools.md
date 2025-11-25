# Functional Task 01: Wire Analysis Tools

**Status:** Completed
**Priority:** HIGH
**Target File:** `components/ProjectDashboardContainer.tsx`

## 1. Objective
Replace the `placeholder()` calls for the 6 Advanced Analysis buttons with real `aiService` integration.

## 2. Implementation Steps
For each of the following handlers in `ProjectDashboardContainer.tsx`:
1.  Check requirements (e.g., `activeMap`, `knowledgeGraph`).
2.  Set Loading state.
3.  Call the corresponding `aiService` function.
4.  Dispatch the result to the global state (e.g., `SET_MERGE_SUGGESTIONS`).
5.  Open the corresponding Modal.
6.  Handle Errors.
7.  Reset Loading state.

**Handlers to Implement:**
- [x] `onFindMergeOpportunities`
- [x] `onAnalyzeSemanticRelationships`
- [x] `onAnalyzeContextualCoverage`
- [x] `onAuditInternalLinking`
- [x] `onCalculateTopicalAuthority`
- [x] `onGeneratePublicationPlan`

## 3. Verification
- Click each button on the dashboard.
- Ensure the "Generating..." or loading state appears.
- Ensure the modal opens with real data (or a mock response if the AI service uses a stub).
