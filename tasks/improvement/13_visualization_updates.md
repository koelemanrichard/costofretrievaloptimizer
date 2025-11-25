
# Improvement Task 13: Visualization & UI Integration

**Status:** [x] Completed
**Priority:** HIGH
**Objective:** Surface the newly generated Holistic SEO data (Canonical Queries, Hints, Query Networks) in the UI so users can review and utilize it before exporting.

## 1. Update `TopicDetailPanel.tsx`
The detail panel currently shows basic info (Title, Description). We need to add a "Holistic Identity" section.

*   **Display `Canonical Query`:** Show clearly as the primary intent target.
*   **Display `Query Network`:** Render as a list of tags/chips.
*   **Display `URL Slug Hint`:** Show the optimized 3-word slug hint next to the actual slug.
*   **Display `Publication Date`:** Show the planned date if available.
*   **Edit Capability (Optional but good):** Allow editing the Canonical Query manually.

## 2. Update `ContentBriefModal.tsx` & `BriefReviewModal.tsx`
These modals show the brief. They need to show the new strategic instructions.

*   **New "Strategy" Tab or Section:**
    *   Display `Methodology Note` (e.g., "Use comparative table format").
    *   Display `Perspectives` (e.g., "Write as a Developer").
*   **Enhanced Outline View:**
    *   The `structured_outline` contains `subordinate_text_hint`.
    *   **Action:** When rendering the outline, display the hint *below* the heading in a distinct style (e.g., italicized gray text: *"Hint: Start this section by defining X as Y..."*).
*   **Enhanced Linking View:**
    *   In the "Internal Linking Plan" section, display the `annotation_text_hint` next to the anchor text so the writer knows *how* to embed the link naturally.

## 3. Update `DraftingModal.tsx`
*   **Sidebar/Context:** When writing the draft, the user needs to see the `subordinate_text_hint` for the section they are working on.
*   **Implementation:** Ensure the `structured_outline` is visible in a "Reference" pane while editing the draft.

## 4. Verification
1.  Open a Topic. Verify Canonical Query and Network are visible.
2.  Open a Brief. Verify "Hints" are visible in the outline structure.
3.  Verify that these UI elements handle missing data gracefully (for old maps that haven't been backfilled).
