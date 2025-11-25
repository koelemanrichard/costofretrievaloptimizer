
# Task 03: Refactor Enrichment Logic (Cleanup)

**Priority:** HIGH (Refactoring)
**Status:** Completed
**Objective:** `ProjectDashboardContainer.tsx` is becoming unmanageable. Before adding the Blueprint logic, we must extract the existing "Enrich Data" logic into a reusable hook.

## 1. Create `hooks/useTopicEnrichment.ts`
*   **Function:** `useTopicEnrichment(activeMapId, businessInfo, allTopics, dispatch)`.
*   **State:** Manage `isEnriching` (loading state) locally or via global dispatch.
*   **Logic:** Move `handleEnrichData` (the existing metadata backfill logic) from the Container to this hook.

## 2. Integrate into Container
*   Import `useTopicEnrichment` in `ProjectDashboardContainer.tsx`.
*   Replace the local handler and loading state with the hook's return values.

## 3. Verification
*   Run the existing "Enrich Data" flow on a map.
*   Verify it still works exactly as before.
*   Verify `ProjectDashboardContainer.tsx` line count has decreased.
