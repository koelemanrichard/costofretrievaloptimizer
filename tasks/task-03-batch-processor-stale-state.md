# Task 03: Fix Batch Processor Stale State Closure

**Status:** [ ] Not Started
**Priority:** MEDIUM
**Files Affected:**
- `components/ProjectDashboardContainer.tsx`
- `services/batchProcessor.ts`

## 1. The Issue
The `BatchProcessor` class is instantiated in `ProjectDashboardContainer.tsx` inside the `onGenerateAllBriefs` function. It is passed a closure: `() => state`.
Because `onGenerateAllBriefs` is created within the functional component's render cycle (often wrapped in `useCallback`), the `state` variable it captures is the state *at the moment the callback was defined*.
If the batch process runs for 5 minutes, and the user updates settings or the Knowledge Graph finishes hydrating in the background, the `BatchProcessor` will continue using the **old, stale state**.

## 2. Implementation Plan

### Step 2.1: Use a Ref for Current State
**File:** `components/ProjectDashboardContainer.tsx`
- Create a ref to hold the current state: `const stateRef = useRef(state);`
- Update the ref on every render: `useEffect(() => { stateRef.current = state; }, [state]);`

### Step 2.2: Update Batch Processor Instantiation
**File:** `components/ProjectDashboardContainer.tsx`
- Inside `onGenerateAllBriefs`, pass the ref's current value accessor:
  ```typescript
  const processor = new BatchProcessor(dispatch, () => stateRef.current);
  ```

### Step 2.3: Verify Batch Processor Logic
**File:** `services/batchProcessor.ts`
- Ensure `this.getState()` is called *inside* the loop or asynchronous steps, not just once at the constructor level. It needs to check `this.getState().activeMap` dynamically to detect if the user switched maps mid-process (and potentially abort).

## 3. Validation & Testing
1.  **Code Review:** Verify that `getState()` invocation is dynamic.
2.  **Simulation:**
    - Trigger "Generate All Briefs".
    - While it's running, change a setting (e.g., toggling a flag in `activeMap` via a separate console command or UI action if available).
    - Verify the processor sees the new setting in subsequent loop iterations (logs can confirm this).

## 4. Systematic Risks
- Any other long-running async operations relying on `state` inside `ProjectDashboardContainer` should be checked for this same pattern.
