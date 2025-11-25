
# Task 06: Fix Data Fetching Regression (Empty Dashboard)

**Status:** [x] Completed
**Priority:** CRITICAL
**Files Affected:**
- `utils/parsers.ts`

## 1. The Issue
After implementing the `parseTopicalMap` utility to sanitize data, the Topical Map dashboard now shows 0 topics, even though the project loads successfully and the "Active Map Found" debug check passes.

**Root Cause:**
1.  In `utils/parsers.ts`, the `parseTopicalMap` function initializes the `topics` property as `[]` (empty array).
2.  In `components/ProjectDashboardContainer.tsx`, the `useEffect` hook responsible for fetching topics has a guard clause:
    ```typescript
    const currentMap = state.topicalMaps.find(m => m.id === activeMapId);
    if (currentMap && currentMap.topics) return; // <--- THE BUG
    ```
3.  In JavaScript, an empty array `[]` is **truthy**.
4.  Therefore, the component believes the topics have already been fetched/cached, skips the Supabase call, and renders the empty array.

## 2. Implementation Plan

### Step 2.1: Update Parser Initialization
**File:** `utils/parsers.ts`
- Locate `parseTopicalMap`.
- Change the default values for `topics` and `briefs`.
- **Current:**
  ```typescript
  topics: [],
  briefs: {}
  ```
- **Required Change:**
  ```typescript
  topics: undefined,
  briefs: undefined
  ```
- This ensures that when the map is first loaded into the global state, these fields are `undefined`, which allows the `if (currentMap.topics)` check to evaluate to `false`, triggering the fetch.

## 3. Validation & Testing
1.  **Reload Application:** Refresh the browser.
2.  **Load Project:** Select the project.
3.  **Observe Dashboard:** The topics list should now populate correctly (the loading spinner should appear briefly).
4.  **Check Debug Panel:** The "Active Map Found" should be true, and the list should not be empty (unless the map is actually empty).
