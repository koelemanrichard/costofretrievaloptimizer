
# Task: Fix Indefinite Expansion Spinner

**Status:** [x] Completed
**Priority:** HIGH (Bug Fix)
**Target File:** `components/ProjectDashboardContainer.tsx`

## 1. The Issue
When expanding a core topic, the loading spinner sometimes persists even after the operation completes or fails. This locks the UI state for that topic.

## 2. Diagnosis
The `expandingCoreTopicId` variable in `ProjectDashboardContainer` is derived from the `isLoading` state keys.
1.  **Key Mismatch:** We need to ensure the key used to set loading (`expand_${id}`) matches exactly what is checked.
2.  **Exception Handling:** If an error occurs inside the `try` block before the `finally` block is reached (rare, but possible if async handling is weird), or if the component unmounts, the state might get stuck.

## 3. Implementation Steps
1.  **Locate:** `onExpandCoreTopic` in `ProjectDashboardContainer.tsx`.
2.  **Verify Key:** Ensure `dispatch({ type: 'SET_LOADING', payload: { key: \`expand_${coreTopic.id}\`, value: true } })` is used.
3.  **Verify Finally:** Ensure the `finally` block exists and sets `value: false` for the *exact same key string*.
4.  **Safety:** Wrap the entire logic block in a `try/finally` to guarantee execution.

## 4. Verification
1.  Expand a topic.
2.  Wait for completion.
3.  Verify spinner disappears.
