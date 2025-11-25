
# Task: Fix Dashboard Topic Creation (User ID)

**Status:** [x] Completed
**Priority:** CRITICAL
**Target File:** `components/ProjectDashboardContainer.tsx`

## 1. Objective
Update all event handlers that insert new topics to include the `user_id` in the payload.

## 2. Implementation Steps

### Step 1: Update `handleGenerateInitialMap`
*   Get `user = state.user`. If null, return error.
*   Add `user_id: user.id` to the map iteration creating `dbTopics`.

### Step 2: Update `onAddTopic`
*   Get `user = state.user`.
*   Add `user_id: user.id` to the `insert` payload.

### Step 3: Update `onExpandCoreTopic`
*   Get `user = state.user`.
*   Add `user_id: user.id` to the map iteration creating `topicsToAdd`.

### Step 4: Update `onImproveMap`
*   Get `user = state.user`.
*   Add `user_id: user.id` to the map iteration creating `topicsToAdd`.

### Step 5: Update `onExecuteMerge`
*   Get `user = state.user`.
*   Add `user_id: user.id` to `newTopicData`.

## 3. Verification
*   Manually generate an empty map via dashboard button.
*   Manually add a topic.
*   Expand a core topic.
*   All actions should succeed without the "Failed..." error.
