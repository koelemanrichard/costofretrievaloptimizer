
# Final Polish Task 01: Wire Google Search Console Analysis

**Status:** [x] Completed
**Priority:** MEDIUM
**Target File:** `components/ProjectDashboardContainer.tsx`

## 1. Objective
Implement the `onAnalyzeGsc` handler in `ProjectDashboardContainer.tsx`. Currently, it is a placeholder. This function should take parsed GSC data, send it to the AI service to find "striking distance" opportunities, and store the results in the application state.

## 2. Implementation Steps

### Step 2.1: Update `ProjectDashboardContainer.tsx`
1.  Locate the `ProjectDashboard` return statement.
2.  Find the `onAnalyzeGsc` prop.
3.  Create a new handler function `handleAnalyzeGsc`:
    *   **Signature:** `async (gscData: GscRow[])`
    *   **Prerequisites:** Check if `knowledgeGraph` exists (it's needed for context).
    *   **Loading State:** `dispatch({ type: 'SET_LOADING', payload: { key: 'gsc', value: true } });`
    *   **AI Call:** `await aiService.analyzeGscDataForOpportunities(gscData, knowledgeGraph, effectiveBusinessInfo, dispatch);`
    *   **State Update:** `dispatch({ type: 'SET_GSC_OPPORTUNITIES', payload: opportunities });`
    *   **Error Handling:** Wrap in `try/catch` block. Dispatch `SET_ERROR` on failure.
    *   **Finally:** Reset loading state.

## 3. Verification
1.  **Mock Data:** Prepare a small CSV file with GSC data (Query, Clicks, Impressions, CTR, Position) or use the file parser to generate mock data.
2.  **Action:** Click "Upload GSC CSV" -> Select File -> Click "Analyze with AI".
3.  **Expected Result:** The "AI-Identified Opportunities" section in the modal should populate with suggestions. The application should not crash.