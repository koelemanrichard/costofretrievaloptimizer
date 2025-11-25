
# Task 01: Fix Knowledge Graph Null Pointer Crash & State Hydration

**Status:** [x] Completed
**Priority:** CRITICAL
**Files Affected:**
- `config/prompts.ts`
- `components/ProjectDashboardContainer.tsx`
- `services/geminiService.ts` (Indirectly via prompt call)

## 1. The Issue
The application crashes immediately upon clicking "Generate Brief" if the Knowledge Graph (KG) hasn't been successfully built.
- **Root Cause A:** The `GENERATE_CONTENT_BRIEF_PROMPT` function in `config/prompts.ts` attempts to call `.query()` on the `knowledgeGraph` argument without checking if it is null.
- **Root Cause B:** The `useEffect` hook in `ProjectDashboardContainer.tsx` responsible for "hydrating" the KG from database records (`activeMap.eavs`) is fragile. It fails silently if `activeMap.eavs` is null, undefined, or not an array, leaving the global `knowledgeGraph` state as `null`.

## 2. Implementation Plan

### Step 2.1: Guard the Prompt Generator
**File:** `config/prompts.ts`
- Modify `GENERATE_CONTENT_BRIEF_PROMPT`.
- Add a check: `if (!knowledgeGraph) { return "No knowledge graph context available."; }` (or similar safe fallback string).
- Ensure the returned string for context doesn't break the overall JSON structure of the prompt.

### Step 2.2: Harden State Hydration
**File:** `components/ProjectDashboardContainer.tsx`
- Locate the `useEffect` that calls `hydrateKnowledgeGraph`.
- Refactor the logic to be defensive:
  ```typescript
  // Pseudocode logic
  if (!activeMap) return;
  let eavs = activeMap.eavs;
  // Handle potential stringified JSON from DB
  if (typeof eavs === 'string') {
      try { eavs = JSON.parse(eavs); } catch { eavs = []; }
  }
  if (!Array.isArray(eavs)) eavs = [];
  
  // Always dispatch a valid KG, even if empty, to prevent null pointers downstream
  const kg = new KnowledgeGraph();
  // ... populate kg ...
  dispatch({ type: 'SET_KNOWLEDGE_GRAPH', payload: kg });
  ```

## 3. Validation & Testing
1.  **Test Null Case:** Load a topical map that has **zero** EAVs. Click "Generate Brief". The application must NOT crash. The prompt sent to AI should simply lack the KG context section.
2.  **Test Valid Case:** Load a map with EAVs. Ensure the "Knowledge Graph Ready" indicator (if available in debug panel) is true. Generate Brief.
3.  **Test Malformed Case:** (Developer Test) Temporarily force `activeMap.eavs` to be a string or `null` in the code. Ensure the hydration logic recovers and creates an empty KG.

## 4. Systematic Risks
- **Subtask:** Verify `FIND_LINKING_OPPORTUNITIES_PROMPT` and `CALCULATE_TOPICAL_AUTHORITY_PROMPT` in `config/prompts.ts` as they likely share the same vulnerability. Apply the same guard clauses there.
