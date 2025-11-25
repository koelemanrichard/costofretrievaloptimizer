
# Task: Refactor Bulk Add Logic

**Priority:** CRITICAL
**Target File:** `components/ProjectDashboardContainer.tsx`

## 1. Objective
Refactor `onBulkAddTopics` to handle dependency resolution. We cannot insert an Outer topic into the database until its Core parent has been inserted and has a real UUID.

## 2. Implementation Steps
1.  **Refactor `onBulkAddTopics`:**
    *   Accept the payload containing `suggestedParent` (string title).
    *   **Pass 1 (Core):** Filter inputs where `type === 'core'`.
        *   Insert them into Supabase.
        *   Store the result in a map: `Map<TopicTitle, TopicUUID>`.
    *   **Pass 2 (Outer):** Filter inputs where `type === 'outer'`.
        *   Iterate through them.
        *   **Resolve Parent:**
            *   Check the `Map` (Is the parent one we just created?).
            *   Check `allTopics` state (Is the parent an existing topic?).
            *   If found, use that UUID as `parent_topic_id`.
            *   If not found, set to `null` (Root) or handle error.
        *   Insert Outer topics with the resolved IDs.
    *   **Cleanup:** Dispatch `ADD_TOPIC` for all new topics.

## 3. Verification
-   Perform the full End-to-End flow.
-   Verify in the Dashboard graph view that the new Outer topics are correctly connected to their new Core parents.

**Status:** [x] Completed
