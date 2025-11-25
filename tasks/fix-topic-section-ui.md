
# Task: Add Topic Section Toggle

**Priority:** HIGH
**Target File:** `components/ui/TopicDetailPanel.tsx`

## 1. Objective
Allow users to manually fix the "Author Section" vs "Core Section" classification for any topic.

## 2. Implementation Steps
1.  **Update `TopicDetailPanel.tsx`:**
    -   Locate the metadata display section (below description).
    -   Add a new `<Select>` or Toggle for "Section Type".
    -   Options:
        -   `Monetization (Core Section)` -> Sets `topic_class: 'monetization'`
        -   `Informational (Author Section)` -> Sets `topic_class: 'informational'`
    -   **Handler:** On change, call `onUpdateTopic`.
    -   Ensure it updates the `metadata` object correctly (merging with existing metadata).

## 3. Verification
-   Click a Core Topic (currently showing Blue/Author).
-   Change Section to "Monetization".
-   Verify the border turns Gold/Green immediately.

**Progress:**
- [x] Implemented `handleUpdateTopic` logic update in `ProjectDashboardContainer.tsx` to properly handle metadata updates by separating DB columns from state updates.
- [x] Updated `TopicDetailPanel.tsx` to include the Section Type `<Select>` and logic to construct the correct update payload.
- [x] Updated `TopicItem.tsx` and `TopicalMapGraphView.tsx` to pass `onUpdateTopic` down to the detail panel.
- [x] Updated `TopicalMapDisplay.tsx` to pass `onUpdateTopic` to `TopicalMapGraphView`.

**Next Steps:** Verification.
