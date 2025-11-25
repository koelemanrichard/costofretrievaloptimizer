
# Persistence Task 01: Fix Internal Linking Data Loss

**Status:** [x] Completed
**Priority:** CRITICAL
**Target File:** `components/InternalLinkingModal.tsx`

## 1. The Issue
When the user clicks "Find Linking Opportunities" in the `InternalLinkingModal`, the application calculates new links and updates the local state via `UPDATE_BRIEF_LINKS`. However, it **fails to save these new links to the database**. If the user refreshes the page, all suggested links are lost.

## 2. Implementation Steps

### Step 2.1: Import Dependencies
- Import `getSupabaseClient` from `../services/supabaseClient`.

### Step 2.2: Update `handleFindLinks`
- Locate the `handleFindLinks` function.
- Inside the loop where `opportunities` are processed:
    1.  Retrieve the *current* brief for the `sourceTopic`.
    2.  Construct the new `contextualBridge` array (existing links + new link).
    3.  **Perform DB Update:**
        ```typescript
        await supabase
            .from('content_briefs')
            .update({ contextual_bridge: newContextualBridge as any })
            .eq('topic_id', sourceTopic.id);
        ```
    4.  Keep the existing `dispatch` call to update the UI immediately (Optimistic UI).

## 3. Verification
1.  Open "View Internal Linking".
2.  Select a node and click "Find Linking Opportunities".
3.  Wait for success notification.
4.  **Reload the page.**
5.  Open "View Internal Linking" again.
6.  Verify the dashed lines (contextual links) for that topic still exist.
