
# Holistic Task 05: UI Integration (Modals)

**Status:** [x] Completed
**Priority:** MEDIUM
**Target Files:** `components/ContentBriefModal.tsx`, `components/BriefReviewModal.tsx`

## 1. Objective
Surface the new strategic data (Visuals, Snippet Targets, Discourse Anchors) to the user in the Brief Modals.

## 2. Implementation Steps

### Step 2.1: Update `ContentBriefModal` & `BriefReviewModal`
1.  **New Section: "Search & Retrieval Strategy"**
    *   Display `Query Format`: (e.g., "Ordered List").
    *   Display `Featured Snippet Target`: Show the question and the target length.
2.  **New Section: "Visual Semantics"**
    *   Render a list/grid of the `visual_semantics` array.
    *   Show Type (Badge: INFOGRAPHIC), Description, and Data Points.
3.  **Enhanced Outline Rendering**
    *   Display `discourse_anchors` if available (perhaps as a footer note or sidebar).

### Step 2.2: Refactoring Note
*   Ensure `safeString` parsing is used for all new fields to prevent rendering crashes.

## 3. Verification
*   Open a newly generated brief.
*   Verify that "Visual Semantics" are visible and formatted correctly.
*   Verify that the "Featured Snippet Target" is clearly called out.

Progress Update: Completed UI integration for displaying new Holistic SEO fields in both Brief modals.
Next Task: tasks/holistic-06-validation.md
