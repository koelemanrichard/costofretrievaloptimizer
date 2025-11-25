
# Final Polish Task 02: Wire Knowledge Graph Expansion

**Status:** [x] Completed
**Priority:** MEDIUM
**Target File:** `components/ProjectDashboardContainer.tsx`

## 1. Objective
Implement the `onExpandKnowledgeDomain` and `onFindAndAddMissingKnowledgeTerms` handlers for the `KnowledgeDomainModal`. Currently, they are empty functions. These features allow the user to grow their semantic model using AI.

## 2. Implementation Steps

### Step 2.1: Implement `handleExpandKnowledgeDomain`
In `ProjectDashboardContainer.tsx`:
1.  Create the function.
2.  **Context:** Get the current EAVs from `activeMap.eavs` (as `SemanticTriple[]`).
3.  **AI Call:** Call `aiService.expandSemanticTriples(effectiveBusinessInfo, activeMap.pillars, currentEavs, dispatch)`.
4.  **Process Results:**
    *   The AI returns *new* triples.
    *   Update the `KnowledgeGraph` instance: `knowledgeGraph.addNode(...)` for the new subjects/objects.
    *   **Persistence:** Dispatch `SET_EAVS` to update the map's data in the state (and optionally DB, but state is sufficient for the session).
    *   Re-dispatch `SET_KNOWLEDGE_GRAPH` to trigger a UI refresh.

### Step 2.2: Implement `handleFindMissingTerms`
1.  Reuse the logic from Step 2.1 or create a specific variation.
2.  For now, wiring it to the same expansion logic is a valid MVP step, as "Finding Missing Terms" is functionally equivalent to "Expanding Semantic Triples" in the current AI service architecture.

### Step 2.3: Pass Props
1.  Update the `<KnowledgeDomainModal ... />` component in the JSX.
2.  Connect `onExpandKnowledgeDomain` to `handleExpandKnowledgeDomain`.
3.  Connect `onFindAndAddMissingKnowledgeTerms` to `handleExpandKnowledgeDomain` (alias).
4.  Pass `isExpandingKnowledgeDomain={!!isLoading.knowledgeDomain}`.

## 3. Verification
1.  **Action:** Open "Analyze Domain".
2.  **Trigger:** Click the "Expand Knowledge Domain" button (if available in UI) or verify the `KnowledgeDomainModal` has the necessary controls. (Note: You might need to check if the Modal actually exposes a button for this. If not, this task focuses on the *props* passed to it, ensuring they are ready when the UI supports it).
