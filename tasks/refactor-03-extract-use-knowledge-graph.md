
# Refactoring Task 03: Extract useKnowledgeGraph Hook

**Status:** [x] Completed
**Priority:** MEDIUM
**Objective:** Encapsulate the complex logic required to rebuild the `KnowledgeGraph` class instance from database JSON. This declutters the main container and makes the logic testable.

## 1. Files to Create/Modify
- Create: `hooks/useKnowledgeGraph.ts`
- Modify: `components/ProjectDashboardContainer.tsx`

## 2. Implementation Steps

### Step 2.1: Create `hooks/useKnowledgeGraph.ts`
-   Define hook `useKnowledgeGraph(activeMap: TopicalMap | undefined, dispatch: React.Dispatch<AppAction>)`.
-   Move the `hydrateKnowledgeGraph` logic (the `useEffect`) from `ProjectDashboardContainer` to here.
-   **Logic:**
    -   Check `activeMap?.eavs`.
    -   Instantiate `new KnowledgeGraph()`.
    -   Populate nodes from EAVs.
    -   Dispatch `SET_KNOWLEDGE_GRAPH`.
    -   Handle the case where `activeMap` is undefined (clear KG).

### Step 2.2: Refactor `ProjectDashboardContainer.tsx`
-   Import `useKnowledgeGraph`.
-   Remove the `hydrateKnowledgeGraph` function and its `useEffect`.
-   Call `useKnowledgeGraph(activeMap, dispatch)` inside the component.

## 3. Verification
1.  **Load Map:** Open a map that has existing EAVs.
2.  **Check Debug Panel:** Ensure "Knowledge Graph Ready" is `true`.
3.  **Check Logs:** Look for "KG rebuild complete" messages.
