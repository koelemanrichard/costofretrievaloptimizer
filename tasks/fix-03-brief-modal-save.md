
# Task: Implement Save Logic in BriefReviewModal

**Priority:** CRITICAL
**Objective:** Ensure that when the user clicks "Save to Map" in the single brief review modal, the data is actually written to Supabase.

## 1. Update Component
**File:** `components/BriefReviewModal.tsx`
- Import `getSupabaseClient`.
- In `handleSave`:
    1. Set a loading state (local state).
    2. Call `supabase.from('content_briefs').insert({...})` with all fields.
    3. On error, show notification.
    4. On success, dispatch `ADD_BRIEF` and close modal.

## 2. Verification
- Generate a single brief.
- Click Save.
- Reload page.
- The brief should still be there.

**Status:** [x] Completed