
# Refactoring Task 02: Extract useMapData Hook

**Status:** [x] Completed
**Priority:** HIGH
**Objective:** Reduce the complexity of `ProjectDashboardContainer` by extracting the data fetching logic (Topics & Briefs) into a reusable custom hook.

## 1. Files to Create/Modify
- Create: `hooks/useMapData.ts`
- Modify: `components/ProjectDashboardContainer.tsx`

## 2. Implementation Steps

### Step 2.1: Create `hooks/useMapData.ts`
-   Define a custom hook `useMapData(activeMapId: string | null, businessInfo: BusinessInfo, dispatch: React.Dispatch<AppAction>)`.
-   Move the `useEffect` that fetches `topics` and `content_briefs` from `ProjectDashboardContainer.tsx` into this hook.
-   **Dependencies:** The hook should depend on `activeMapId`.
-   **Logic:**
    -   Check if `activeMapId` exists.
    -   Use `getSupabaseClient`.
    -   Fetch topics -> `sanitizeTopicFromDb`.
    -   Fetch briefs -> `sanitizeBriefFromDb`.
    -   Dispatch `SET_TOPICS_FOR_MAP` and `SET_BRIEFS_FOR_MAP`.
    -   Handle loading states (`SET_LOADING`) and errors (`SET_ERROR`).

### Step 2.2: Refactor `ProjectDashboardContainer.tsx`
-   Import `useMapData`.
-   Remove the large `useEffect` block responsible for fetching.
-   Call `useMapData(activeMapId, businessInfo, dispatch)` at the top level of the component.

## 3. Verification
1.  **Functional Test:** Reload the application. Select a map.
2.  **Observation:** The "Loading Map Details..." spinner should appear, then the dashboard should populate with topics.
3.  **Regression Check:** Ensure that switching between different maps correctly triggers a re-fetch.
