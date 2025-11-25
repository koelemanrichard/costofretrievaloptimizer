
# Functional Task 02: Wire Action Handlers (Write Operations)

**Status:** Completed
**Priority:** HIGH
**Target File:** `components/ProjectDashboardContainer.tsx`

## 1. Objective
Implement the logic for actions that modify the map structure based on AI suggestions. These are "destructive" or "additive" operations that go beyond simple analysis.

## 2. Implementation Steps

### Handler 1: `onImproveMap` (From Validation Modal)
1.  **Input:** Accepts `issues: ValidationIssue[]`.
2.  **AI Call:** Call `aiService.improveTopicalMap(allTopics, issues, ...)` to get suggestions.
3.  **Process Additions:**
    *   Iterate through `result.newTopics`.
    *   Generate UUIDs and Slugs.
    *   Sanitize data.
    *   **Action:** Insert into Supabase `topics` table (optional but recommended) and dispatch `ADD_TOPIC`.
4.  **Process Deletions:**
    *   Iterate through `result.topicTitlesToDelete`.
    *   Find the topic ID by matching the title.
    *   **Action:** Delete from Supabase `topics` table and dispatch `DELETE_TOPIC`.
5.  **Feedback:** Dispatch `SET_IMPROVEMENT_LOG` to show the user what happened.

### Handler 2: `onExecuteMerge` (From Merge Modal)
1.  **Input:** Accepts `suggestion: MergeSuggestion`.
2.  **Process Creation:**
    *   Create a new Core Topic based on `suggestion.newTopic`.
    *   Generate UUID.
    *   **Action:** Dispatch `ADD_TOPIC`.
3.  **Process Deletion:**
    *   Iterate through `suggestion.topicIds`.
    *   **Action:** Dispatch `DELETE_TOPIC` for each.
4.  **Cleanup:** Close the modal and clear the suggestion state.

## 3. Verification
-   **Improvement:** Run "Validate Map". If issues exist, click "Fix Issues". Verify new topics appear and/or bad topics disappear.
-   **Merging:** Run "Find Merge Opportunities". Click "Execute Merge". Verify the old topics are gone and the new one exists.
