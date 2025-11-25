
# Task: Enable Draft Editing & Saving

**Status:** [x] Completed
**Priority:** HIGH
**Objective:** Allow users to edit the AI-generated draft and save changes to the database.

## 1. Update DraftingModal
**File:** `components/DraftingModal.tsx`
- Replace the read-only view with a `Textarea` (or toggle between view/edit).
- Add a "Save Draft" button.
- Implement `handleSave` that calls `supabase.from('content_briefs').update(...)`.

## 2. Verification
- Generate Draft.
- Edit text.
- Save.
- Reload page.
- Verify changes persist.
