
# Task: Integrate Model Selector into Modals

**Status:** [x] Completed
**Priority:** HIGH
**Target Files:**
- `components/DraftingModal.tsx`
- `components/ResponseCodeSelectionModal.tsx`
- `components/TopicExpansionModal.tsx`

## 1. Objective
Place the `AIModelSelector` into the key workflows so the user can switch models right before triggering the action.

## 2. Implementation Steps

### A. ResponseCodeSelectionModal (Briefs)
*   [x] Add state `selectedProvider`, `selectedModel`.
*   [x] Render `AIModelSelector` above the "Generate Brief" button.
*   [x] Pass the selection to `onGenerate`.

### B. DraftingModal (Drafts)
*   [x] Add state for override.
*   [x] Render `AIModelSelector` in the header/footer.
*   [x] Pass the selection to `polishDraft`.

### C. TopicExpansionModal (Expansion)
*   [x] Add state for override.
*   [x] Render `AIModelSelector` in the footer.
*   [x] Pass selection to `onExpand`.

## 3. Verification
1.  Open "Generate Brief".
2.  Select a DIFFERENT provider than the project default.
3.  Click Generate.
4.  Check the Application Log to confirm the request was sent to the new provider.
