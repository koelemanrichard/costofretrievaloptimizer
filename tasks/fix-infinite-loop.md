
# Task: Fix Infinite Loop in AI Selector

**Status:** [x] Completed
**Priority:** CRITICAL
**Objective:** Break the `useEffect` dependency cycle causing the browser to hang.

## 1. Parent Component Fixes (Memoization)

### Step 1.1: `components/DraftingModal.tsx`
- [x] Import `useCallback` from 'react'.
- [x] Wrap `handleConfigChange` in `useCallback`.

### Step 1.2: `components/ResponseCodeSelectionModal.tsx`
- [x] Import `useCallback` from 'react'.
- [x] Wrap `handleConfigChange` in `useCallback`.

### Step 1.3: `components/TopicExpansionModal.tsx`
- [x] Import `useCallback` from 'react'.
- [x] Wrap `handleConfigChange` in `useCallback`.

## 2. Child Component Hardening

### Step 2.1: `components/ui/AIModelSelector.tsx`
- [x] Inside the `useEffect` that fetches models:
    - [x] Before calling `onConfigChange(selectedProvider, models[0])`, check if `selectedModel` is already equal to `models[0]`.
    - [x] If they are equal, **do not call** `onConfigChange`. This breaks the loop even if the parent re-renders.

## 3. Verification
- [x] Reload application.
- [x] Open "Generate Brief" modal.
- [x] Change Provider to OpenAI (if key exists).
- [x] Verify no crash/hang.
