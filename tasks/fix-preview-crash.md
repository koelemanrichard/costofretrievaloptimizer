
# Task: Fix HTML Preview Crash

**Status:** [x] Completed
**Priority:** CRITICAL
**Target File:** `components/DraftingModal.tsx`

## 1. The Issue
The application crashes with "Minified React error #31" when switching to the "HTML Preview" tab. The stack trace points to `react-markdown` and specifically the `remark-gfm` plugin integration causing an invalid object to be passed as a React child.

## 2. Implementation Steps
1.  **Modify `DraftingModal.tsx`:**
    *   Remove the import of `remark-gfm`.
    *   Remove the `remarkPlugins={[remarkGfm]}` prop from the `<ReactMarkdown>` component.
    *   Ensure `safeString` is still used to sanitize the input.

## 3. Verification
1.  Generate a draft.
2.  Click "HTML Preview".
3.  The app should NOT crash.
4.  Basic Markdown (headers, lists, bold) should still render. Tables might render as raw text, which is an acceptable tradeoff for stability.
