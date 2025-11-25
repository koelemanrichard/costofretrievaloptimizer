
# Task 01: Implement Global Error Boundary

**Status:** [x] Completed
**Priority:** CRITICAL (Debugging Visibility)
**Files to Create/Modify:**
- Create: `components/GlobalErrorBoundary.tsx`
- Modify: `index.tsx`

## 1. Objective
Implement a React Error Boundary to catch "Minified React error #31" and other runtime crashes. Instead of the application disappearing (white screen), it must display the specific error message and stack trace to the user/developer.

## 2. Implementation Steps

### Step 2.1: Create `components/GlobalErrorBoundary.tsx`
Create a class component `GlobalErrorBoundary` that extends `React.Component`.

**Requirements:**
- **State:** `{ hasError: boolean, error: Error | null, errorInfo: React.ErrorInfo | null }`
- **`getDerivedStateFromError`:** Returns `{ hasError: true, error }`.
- **`componentDidCatch`:** Updates state with `errorInfo` and logs to console.
- **Render:**
    - If `hasError` is false, render `this.props.children`.
    - If `hasError` is true, render a fallback UI using Tailwind classes (`fixed inset-0 z-[9999] bg-gray-900 text-white ...`).
    - **Fallback UI must show:**
        - A clear "Something went wrong" header.
        - The `error.toString()` message.
        - A `<details>` tag containing `errorInfo.componentStack`.
        - A "Reload Application" button that calls `window.location.reload()`.

### Step 2.2: Integrate in `index.tsx`
- Import `GlobalErrorBoundary` from `./components/GlobalErrorBoundary`.
- Wrap the `<App />` component with `<GlobalErrorBoundary>`.
- **Do NOT** wrap `StateProvider` inside it; wrap `App` specifically or wrap everything inside `StateProvider`. Wrapping the entire tree inside `StrictMode` is best.
  ```tsx
  <React.StrictMode>
    <GlobalErrorBoundary>
      <StateProvider>
        <App />
      </StateProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
  ```

## 3. Validation
1.  **Manual Trigger:** Temporarily insert `throw new Error("Test Crash")` inside `App.tsx` or a child component.
2.  **Verify:** The Red Screen of Death appears with the error message and stack trace.
3.  **Recovery:** Click "Reload". The app should reload.
