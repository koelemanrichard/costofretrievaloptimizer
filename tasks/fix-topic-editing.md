
# Task: Enable Full Topic Editing (Title & Slug)

**Status:** [x] Completed
**Priority:** HIGH
**Target Files:** `components/ProjectDashboardContainer.tsx`, `components/TopicItem.tsx`

## 1. Objective
Allow users to edit Topic Titles and Slugs and persist changes to Supabase.

## 2. Implementation Steps

### Step 2.1: Logic Layer (`ProjectDashboardContainer.tsx`)
*   [x] Locate the `handleUpdateTopic` function (or the function passed to `TopicalMapDisplay`'s `onUpdateTopic`).
*   [x] Currently, it likely only dispatches `UPDATE_TOPIC`.
*   [x] **Action:** Add the Supabase call:
    ```typescript
    const supabase = getSupabaseClient(...);
    await supabase.from('topics').update(updates).eq('id', topicId);
    ```
*   [x] Ensure `TopicalMapDisplay` passes this handler down correctly to `TopicItem`.

### Step 2.2: UI Layer (`TopicItem.tsx`)
*   [x] **State Refactor:**
    *   Replace `isEditingSlug` with `isEditing`.
    *   Add `tempTitle` and `tempSlug` state variables initialized from props.
*   [x] **Edit Mode Render:**
    *   Wrap the Title `<h4>` in a conditional: `{isEditing ? <Input ... /> : <h4>...</h4>}`.
    *   Keep the Slug `<Input>` logic but tie it to the global `isEditing` state.
*   [x] **Action Buttons:**
    *   The "Edit" pencil icon sets `isEditing(true)`.
    *   The "Save" icon calls a new `handleSave` function.
    *   The "Cancel" icon sets `isEditing(false)` and resets temp values.
*   [x] **Save Handler:**
    *   Validate inputs (Title not empty).
    *   Call `onUpdateTopic(topic.id, { title: tempTitle, slug: slugify(tempSlug) })`.

## 3. Verification
*   Edit a topic title. Save. Reload. Verify persistence.

**Progress Update:**
Implemented comprehensive topic editing. Added `handleUpdateTopic` logic in `ProjectDashboardContainer.tsx` to persist changes to Supabase. Updated `ProjectDashboard.tsx` and `TopicalMapDisplay.tsx` to pass this handler down. Refactored `TopicItem.tsx` to support editing both title and slug in a unified "Edit Mode", including UI controls for saving and cancelling.

**Next Task:** `tasks/fix-empty-brief-bug.md`
