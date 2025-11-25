
# Task: Replace Crashing Markdown Library

**Status:** [x] Completed
**Priority:** CRITICAL
**Target Files:**
- `components/ui/SimpleMarkdown.tsx` (Create)
- `components/DraftingModal.tsx` (Update)

## 1. Objective
Replace `react-markdown` with a custom component to fix React Error #31.

## 2. Implementation Steps

### Step 1: Create `components/ui/SimpleMarkdown.tsx`
Implement a component that accepts a `content` string prop.
- Use `dangerouslySetInnerHTML` (safely, as this is local content or AI generated, but mostly to allow the regex replacement to work).
- Implement Regex replacers for:
    - Headers (`#`) -> `<h3>` etc.
    - Bold (`**`) -> `<strong>`.
    - Lists (`- `) -> `<li>`.
    - Paragraphs (`\n\n`) -> `<p>`.

### Step 2: Update `DraftingModal.tsx`
- Remove `import ReactMarkdown from 'react-markdown';`
- Remove `import remarkGfm from 'remark-gfm';`
- Import `SimpleMarkdown` from `./ui/SimpleMarkdown`.
- Replace:
  ```tsx
  <ReactMarkdown remarkPlugins={[remarkGfm]}>
     {safeString(draftContent)}
  </ReactMarkdown>
  ```
  With:
  ```tsx
  <SimpleMarkdown content={safeString(draftContent)} />
  ```

## 3. Verification
- Reload app.
- Generate draft.
- Click "HTML Preview".
- **Success Criteria:** The preview renders formatted text without crashing the application.
