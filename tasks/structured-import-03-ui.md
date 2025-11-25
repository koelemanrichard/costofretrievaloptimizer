
# Task: Update AddTopicModal UI

**Priority:** MEDIUM
**Target File:** `components/AddTopicModal.tsx`

## 1. Objective
Update the AI Assistant tab in the modal to display the hierarchical structure (Core vs Outer) returned by the new service.

## 2. Implementation Steps
1.  **State:** Update `suggestions` state type to include `type` and `suggestedParent`.
2.  **Logic:**
    *   In `handleGenerateSuggestions`, call the new `generateStructuredTopicSuggestions` service instead of the old one.
    *   Pass `coreTopics` (from props) to the service so the AI knows about existing pillars.
3.  **Rendering:**
    *   Update the list item render.
    *   If `type === 'core'`, show a visual indicator (e.g., Green Badge).
    *   If `type === 'outer'`, show a different indicator (e.g., Purple Badge) and display "Parent: [suggestedParent]".
4.  **Handover:**
    *   Update `handleAddSelected`.
    *   Construct the payload for `onBulkAddTopics`.
    *   Pass the `suggestedParent` title in the payload (or resolve it partially here if possible, but better left to the container).

## 3. Verification
-   Open the modal.
-   Enter a complex request: "Add a core topic 'SEO' with subtopics 'Backlinks' and 'Content'."
-   Click Generate.
-   Verify the UI shows 'SEO' as Core and the others as Outer linked to 'SEO'.

**Status:** [x] Completed
