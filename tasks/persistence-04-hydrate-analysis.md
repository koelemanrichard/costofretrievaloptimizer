
# Persistence Task 04: Hydrate Analysis State

**Status:** [x] Completed
**Priority:** MEDIUM
**Target File:** `hooks/useMapData.ts`

## 1. The Issue
Even if we save the reports (Task 03), the application currently doesn't load them back into the active state (`state.validationResult`, etc.) when the map is loaded. It only loads the map object itself.

## 2. Implementation Steps

### Step 2.1: Update `useMapData` Hook
- Inside the `fetchMapDetails` logic (or a new effect dependent on `activeMap`), check if `activeMap.analysis_state` exists.
- If it exists, dispatch actions to populate the global state:
    ```typescript
    if (map.analysis_state) {
        if (map.analysis_state.validationResult) dispatch({ type: 'SET_VALIDATION_RESULT', payload: map.analysis_state.validationResult });
        if (map.analysis_state.semanticAnalysisResult) dispatch({ type: 'SET_SEMANTIC_ANALYSIS_RESULT', payload: map.analysis_state.semanticAnalysisResult });
        // ... dispatch for all other cached reports
    }
    ```

## 3. Verification
1.  Run "Validate Map" (ensuring Task 03 is done so it saves).
2.  Reload the page.
3.  Open the "Validate Map" modal (or check Debug panel).
4.  **Result:** The previous report should be visible immediately without re-running the AI.
