
# Polish Task 03: Cleanup ProjectDashboardContainer

**Status:** [x] Completed
**Priority:** LOW (Cleanup)
**Target File:** `components/ProjectDashboardContainer.tsx`

## 1. The Issue
Following the major refactor where logic was moved to hooks (`useMapData`, `useKnowledgeGraph`), the main container file likely contains unused imports, unused local variables, or deprecated code blocks that clutter the file.

## 2. Implementation Steps
1.  **Audit Imports:** Check for unused imports from `react` (e.g., `useEffect` might be unused if all effects are in hooks), `services/supabaseClient` (might be moved to hooks), or `utils/helpers`.
2.  **Audit Variables:** Ensure variables like `activeMap` are derived cleanly and used efficiently.
3.  **Remove Legacy Code:** Delete any commented-out code related to the old fetching logic or local sanitization.

## 3. Validation
-   **Compile:** Ensure the application builds without warnings about unused variables.
-   **Functional:** Ensure the dashboard still loads correctly.
