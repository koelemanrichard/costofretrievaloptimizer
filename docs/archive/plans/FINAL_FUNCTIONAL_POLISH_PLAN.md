
# Final Functional Polish Plan

**Status:** Pending
**Objective:** Connect the final remaining disconnected features in `ProjectDashboardContainer.tsx` to achieve 100% functional coverage.

## 1. Identified Gaps

### Gap A: Google Search Console (GSC) Analysis
*   **Location:** `components/ProjectDashboardContainer.tsx`
*   **Current State:** `onAnalyzeGsc={(data) => placeholder('onAnalyzeGsc')}`
*   **Target State:** Call `aiService.analyzeGscDataForOpportunities`, dispatch `SET_GSC_OPPORTUNITIES`, and handle loading/errors.

### Gap B: Knowledge Domain Expansion
*   **Location:** `components/ProjectDashboardContainer.tsx` -> `KnowledgeDomainModal` props.
*   **Current State:** `onExpandKnowledgeDomain={() => {}}` and `onFindAndAddMissingKnowledgeTerms={() => {}}`.
*   **Target State:**
    *   `onExpandKnowledgeDomain`: Should trigger an AI call to find related concepts based on the current graph nodes and add them to the graph.
    *   `onFindMissingTerms`: A specific check for missing "expected" attributes (e.g., checking if "Pricing" is missing for a "Software" entity).

## 2. Execution Tasks

### Task 01: Wire GSC Analysis
*   Implement `handleAnalyzeGsc` in `ProjectDashboardContainer`.
*   Use `aiService.analyzeGscDataForOpportunities`.
*   Update `ProjectDashboard` to pass this handler correctly.

### Task 02: Wire Knowledge Graph Actions
*   Implement `handleExpandKnowledgeGraph`.
    *   Since there isn't a specific `expandKnowledgeGraph` in `aiService` yet (only `expandSemanticTriples`), we will reuse `expandSemanticTriples` passing the *current* graph nodes as context.
*   Implement `handleFindMissingTerms`.
    *   This might require a new small helper in `aiService` or reusing `expandSemanticTriples` with a specific prompt tweak, or we can mark it as "Future" if no backend service exists. *Decision:* We will wire it to `expandSemanticTriples` for now as a valid approximation.

## 3. Final Cleanup
*   Search entire codebase for `placeholder` string.
*   Ensure `console.log` debugs are removed or converted to `dispatch({ type: 'LOG_EVENT' })`.
