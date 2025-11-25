
# Plan: Definitive Fix for HTML Preview Crash

**Status:** Active
**Priority:** CRITICAL
**Objective:** Permanently resolve "Minified React error #31" in the Drafting Modal by removing the `react-markdown` dependency and implementing a lightweight, zero-dependency Markdown renderer.

## 1. Root Cause Analysis
*   **The Error:** `Minified React error #31: Objects are not valid as a React child`.
*   **The Source:** The `react-markdown` library, loaded via ESM/CDN, is likely importing its own internal version of React or failing to interop with the global React instance provided by `index.html`. This causes it to return objects that the main React tree cannot render.
*   **The Fix:** Stop fighting the library versions. Since we only need to preview basic formatting (Headers, Lists, Bold, Tables), a custom Regex-based parser is significantly more stable, faster, and has zero dependencies to crash.

## 2. Technical Solution: `SimpleMarkdown` Component
We will create a new UI component `components/ui/SimpleMarkdown.tsx` that takes a markdown string and renders sanitized HTML.

### Features Supported
*   **Headers:** `#` to `<h6>`.
*   **Bold:** `**text**`.
*   **Italic:** `*text*`.
*   **Lists:** `- item` or `1. item`.
*   **Tables:** Basic pipe tables `| col | col |`.
*   **Line Breaks:** Preserved.

## 3. Execution Steps

1.  **Create `components/ui/SimpleMarkdown.tsx`:** Implement the parser logic.
2.  **Update `components/DraftingModal.tsx`:**
    *   Remove `import ReactMarkdown`.
    *   Remove `import remarkGfm`.
    *   Import `SimpleMarkdown`.
    *   Replace usage.
3.  **Verification:**
    *   Open "Drafting" workspace.
    *   Switch to "HTML Preview".
    *   Verify no crash.
    *   Verify formatting appears.
