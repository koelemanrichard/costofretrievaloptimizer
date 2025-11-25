
# Plan: Fix Infinite Render Loop in AI Model Selector

**Status:** Active
**Priority:** CRITICAL (Bug Fix)
**Objective:** Resolve the application freeze/hang when using the `AIModelSelector`. This is caused by a `useEffect` dependency cycle where the child component updates the parent, causing a re-render that recreates the handler function, which re-triggers the child's effect.

## 1. Root Cause Analysis
The `AIModelSelector` component has a `useEffect` that fetches models and calls `onConfigChange` to set the default model:

```typescript
// AIModelSelector.tsx
useEffect(() => {
    // ... fetches models ...
    onConfigChange(selectedProvider, models[0]); // Updates parent state
}, [..., onConfigChange]);
```

In the parent components (e.g., `DraftingModal.tsx`), the handler is defined inline:

```typescript
// DraftingModal.tsx
const handleConfigChange = (provider, model) => { 
    setOverrideSettings(...) 
}; 
// This function is recreated on every render!
```

**The Cycle:**
1. `AIModelSelector` calls `onConfigChange`.
2. `DraftingModal` updates state -> Re-renders.
3. `handleConfigChange` is recreated (new reference).
4. `AIModelSelector` sees new `onConfigChange` prop -> `useEffect` runs again.
5. Repeat infinitely -> Browser Crash.

## 2. Remediation Strategy

### A. Parent Components: Memoize Handlers
We must wrap the `handleConfigChange` functions in `useCallback` in all parent components. This ensures the function reference remains stable across renders unless dependencies change.

**Targets:**
1.  `components/DraftingModal.tsx`
2.  `components/ResponseCodeSelectionModal.tsx`
3.  `components/TopicExpansionModal.tsx`

### B. Child Component: Guarded Updates
We should update `AIModelSelector` to prevent unnecessary calls to the parent if the value hasn't actually changed.

**Target:** `components/ui/AIModelSelector.tsx`
*   Add a check inside the `useEffect`: Only call `onConfigChange` if the calculated default model is different from the current `selectedModel`.

## 3. Execution Steps

1.  **Task 1:** Update `DraftingModal.tsx`, `ResponseCodeSelectionModal.tsx`, and `TopicExpansionModal.tsx` to use `useCallback` for the config handler.
2.  **Task 2:** Update `AIModelSelector.tsx` to add a guard clause inside the `useEffect` to prevent redundant updates.

## 4. Verification
1.  Open the Drafting Modal.
2.  Toggle the Model Selector.
3.  Change providers.
4.  **Success Criteria:** The browser does not hang/freeze.
