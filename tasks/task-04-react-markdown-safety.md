# Task 04: Defensive React-Markdown Rendering

**Status:** [x] Completed
**Priority:** MEDIUM
**Files Affected:**
- `components/BriefReviewModal.tsx`
- `components/ContentBriefModal.tsx`
- `components/DraftingModal.tsx`

## 1. The Issue
Several components render markdown content using `<ReactMarkdown>{someVariable}</ReactMarkdown>`.
If `someVariable` (e.g., `brief.outline`) ends up being `null`, `undefined`, or a non-string object (due to sanitizer failure or partial data), the `react-markdown` library or React itself may throw a runtime error, crashing the UI.

## 2. Implementation Plan

### Step 2.1: Audit and Guard
**Files:** `components/BriefReviewModal.tsx`, `components/ContentBriefModal.tsx`, `components/DraftingModal.tsx`
- Locate all instances of `<ReactMarkdown>`.
- Ensure the child content uses a fallback.
  - **Unsafe:** `<ReactMarkdown>{brief.outline}</ReactMarkdown>`
  - **Safe:** `<ReactMarkdown>{brief.outline || ''}</ReactMarkdown>`
- Ideally, add a type check check before rendering if data integrity is suspect:
  ```tsx
  {typeof brief.outline === 'string' ? (
      <ReactMarkdown>{brief.outline}</ReactMarkdown>
  ) : (
      <p>Invalid content format.</p>
  )}
  ```

### Step 2.2: Check Other Text Fields
- Review other fields like `brief.title`, `brief.metaDescription`. While standard HTML elements handle `null` gracefully (rendering nothing), it is good practice to enforce string types: `{brief.title || 'Untitled'}`.

## 3. Validation & Testing
1.  **Manual Corruption:** Temporarily modify the state (via Redux DevTools or code injection) to set a brief's outline to `null` or `{}`.
2.  **Open Modal:** Open the Brief Review or Content Brief modal.
3.  **Result:** The modal should render empty content or an error message, but the **application should not crash**.

## 4. Systematic Risks
- None. This is a purely defensive UI update.