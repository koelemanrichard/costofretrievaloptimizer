
# Plan: Fix Topic Editing (Titles & Slugs)

**Status:** Proposed
**Priority:** HIGH
**Objective:** Enable users to edit both the **Title** and the **Slug** of any topic directly from the Dashboard list view, and ensure these changes are persisted to the database (Supabase) immediately.

## 1. Root Cause Analysis
*   **Slug Issue:** The user reports that saving the slug "doesn't work." The current `TopicItem` updates the local slug state via `onUpdateTopic`, but the parent container (`ProjectDashboardContainer`) likely only updates the local React state without triggering a Supabase `UPDATE` call.
*   **Title Issue:** There is currently no UI input field provided to edit the Title. The UI only renders an `<h4>` tag.

## 2. UX Design
*   **Trigger:** We will upgrade the existing "Edit" (pencil) icon. Clicking it will put the *entire topic row* into "Edit Mode".
*   **Edit Mode UI:**
    *   **Title:** The static text is replaced by an `<Input type="text">` pre-filled with the current title.
    *   **Slug:** The static text is replaced by an `<Input type="text">` pre-filled with the current slug.
    *   **Actions:** A "Save" button (Checkmark) and a "Cancel" button (X) appear.
*   **Persistence:** Clicking "Save" triggers a database update. The UI optimistically updates, then confirms success.

## 3. Technical Implementation

### Step A: Upgrade `ProjectDashboardContainer.tsx` (The Logic)
We need a robust handler that writes to the DB.
1.  Define `handleUpdateTopic` (or ensure the existing one performs a DB write).
2.  **Logic:**
    ```typescript
    const handleUpdateTopic = async (topicId, updates) => {
        // 1. Optimistic Update (Dispatch to Redux Store)
        dispatch({ type: 'UPDATE_TOPIC', ... });
        
        // 2. Database Update
        const { error } = await supabase.from('topics').update(updates).eq('id', topicId);
        
        // 3. Error Handling
        if (error) revertState();
    }
    ```

### Step B: Upgrade `TopicItem.tsx` (The UI)
1.  **State:** Rename `isEditingSlug` to `isEditing` (boolean).
2.  **State:** Add `editValues` state: `{ title: string, slug: string }`.
3.  **Render:**
    *   If `isEditing`: Render Inputs for Title and Slug.
    *   Else: Render standard display.
4.  **Handlers:**
    *   `onSave`: Sanitize the slug (using `slugify`), call `onUpdateTopic`, turn off edit mode.

## 4. Verification Strategy
1.  Load Map.
2.  Click Edit on a Core Topic.
3.  Change Title from "Old" to "New Title". Change Slug to "new-title".
4.  Click Save.
5.  **Reload Page.**
6.  Verify the new Title and Slug are still there (persistence check).
