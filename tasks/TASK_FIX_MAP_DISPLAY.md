# Task: Fix Missing Topical Maps on Project Load

**Objective:** Resolve the regression where the list of topical maps for a selected project is not displayed on the `MapSelectionScreen`.

## 1. Root Cause Analysis

- **File:** `state/appState.ts`
- **Finding:** The reducer for the `SET_ACTIVE_PROJECT` action incorrectly resets the `topicalMaps` array to `[]`.
- **File:** `App.tsx`
- **Finding:** In the `handleLoadProject` function, the actions are dispatched in an order that causes the newly fetched map data to be immediately overwritten by the reset in the `SET_ACTIVE_PROJECT` reducer.
    1. `SET_TOPICAL_MAPS` is called (state now has maps).
    2. `SET_ACTIVE_PROJECT` is called (state's maps are reset to `[]`).

## 2. Task Plan

1.  **Correct the Dispatch Order in `App.tsx`.**
    *   **File:** `App.tsx`
    *   **Function:** `handleLoadProject`
    *   **Change:** Modify the order of `dispatch` calls to set the active project *before* setting the topical maps. This will ensure the state is cleared first, then populated with the new data, preventing the race condition.

## 3. Validation

-   **Test Case:** `TEST_PLAN.md` -> **Test Case ID 3.1**
-   **Description:** "Full Project & Map Loading"
-   **Success Criteria:**
    1. After loading a project with existing maps, the `MapSelectionScreen` must correctly display the list of those maps.
    2. The "No topical maps have been created..." message must NOT be shown if maps exist in the database for that project.
