
# Task 04: Graph Logic Stability & Type Safety

**Status:** [x] Completed
**Priority:** MEDIUM
**Target File:** `components/InternalLinkingModal.tsx`

## 1. The Issue
The component uses an unsafe cast: `Object.values(briefs) as ContentBrief[]`.
If the `briefs` state contains partial objects, error objects, or nulls, TypeScript treats them as full `ContentBrief` objects. When the code later accesses `brief.contextualBridge` (which might be undefined on a malformed object), it can throw errors or crash the graph generation logic.

## 2. Implementation Instructions

### Step 2.1: Safe Data Preparation
Inside `InternalLinkingModal.tsx`, inside the `useMemo` hook where nodes/edges are calculated:

1.  **Filter Briefs:**
    *   Do not just cast `Object.values(briefs)`.
    *   Create a robust filtered list:
    ```typescript
    const validBriefs = Object.values(briefs).filter(b => 
        b && 
        typeof b === 'object' && 
        'topic_id' in b && 
        Array.isArray(b.contextualBridge)
    ) as ContentBrief[];
    ```
2.  **Use Valid Briefs:**
    *   Update the loop `for (const brief of validBriefs)` to use this safe list instead of the raw cast.

### Step 2.2: Defensive Property Access
*   Inside the loop, ensure `brief.contextualBridge` is iterated safely. (The filter above helps, but ensuring the loop doesn't break is vital).

## 3. Verification
- Open the "View Internal Linking" modal.
- Ensure the graph renders.
- Ensure that topics with missing briefs or malformed brief data do not break the visualization for the rest of the map.
