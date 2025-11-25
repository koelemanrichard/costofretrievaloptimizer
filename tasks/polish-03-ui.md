
# Task 03: Update Drafting Modal UI

**Priority:** HIGH
**Target File:** `components/DraftingModal.tsx`
**Status:** [x] Completed

## Objective
Add the "Preview" tab and "Polish" action to the editor.

## Implementation Steps
1.  **Tabs:** Add state `activeTab`. Render a simple toggle (Editor / Preview) in the header.
2.  **Preview View:**
    *   When `activeTab === 'preview'`, hide `Textarea` and show a div container.
    *   Use `ReactMarkdown` (with `remark-gfm` plugin) to render `safeString(draftContent)`.
    *   Style the container with `prose prose-invert` (Tailwind typography) for good readability.
3.  **Polish Button:**
    *   Add "✨ Polish Draft" button.
    *   `onClick`: Call `aiService.polishDraft`.
    *   On success: Update `draftContent` and set `activeTab = 'preview'` so user sees the changes immediately.

## Verification
- Open modal.
- Switch tabs.
- Click Polish.
