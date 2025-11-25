# Task: Fix Missing Topical Map Selection Screen Regression

**Objective:** Restore the topical map selection screen that should appear after a user loads a project.

## 1. Root Cause Analysis

- **File:** `App.tsx`
- **Function:** `handleLoadProject`
- **Finding:** A state management race condition was reintroduced. The function dispatched actions in an incorrect order:
    1. `dispatch({ type: 'SET_TOPICAL_MAPS', ... })` was called first, correctly populating the state with the project's maps.
    2. `dispatch({ type: 'SET_ACTIVE_PROJECT', ... })` was called second. The reducer for this action is designed to clear old state, and it reset `state.topicalMaps` back to an empty array (`[]`), effectively deleting the data that was just fetched.
- **Impact:** The `MapSelectionScreen` component received an empty list of maps and therefore rendered nothing, blocking the user from proceeding.

## 2. Task Plan

1.  **Correct the Dispatch Order in `App.tsx`.**
    *   **File:** `App.tsx`
    *   **Function:** `handleLoadProject`
    *   **Change:** Reverse the order of the two `dispatch` calls. The `SET_ACTIVE_PROJECT` action must be called **before** the `SET_TOPICAL_MAPS` action. This ensures the state is correctly reset first, and then populated with the new data.

## 3. Validation

-   **Test Case:** `TEST_PLAN.md` -> **Test Case ID 3.1** ("Full Project & Map Loading")
-   **Success Criteria:**
    1. Log in to the application.
    2. On the `ProjectSelectionScreen`, click "Load Project" on a project that is known to have existing topical maps.
    3. The application must transition to the `MapSelectionScreen`.
    4. The screen must correctly display the full list of all topical maps associated with the loaded project. The "No topical maps have been created..." message must **not** be shown.