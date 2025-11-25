
# Plan: Fix Drafting API Context & Topic Sections

**Status:** Active
**Priority:** CRITICAL
**Objective:** Resolve the "OpenRouter not implemented" error during drafting and the incorrect "Author Section" visualization on the dashboard.

## 1. Fix "OpenRouter" Error in Drafting
*   **Root Cause:** `DraftingModal.tsx` currently pulls `state.businessInfo` directly from the global store. This uses the user's global defaults (which might be set to OpenRouter or empty) instead of the Map-Specific settings (Gemini).
*   **Fix:**
    1.  Update `DraftingModal` props to accept `businessInfo: BusinessInfo`.
    2.  Update `ProjectDashboard.tsx` to pass `effectiveBusinessInfo` (which correctly merges global keys with map strategy) to the modal.
    3.  Update `DraftingModal` logic to use this prop for AI calls.

## 2. Fix "Author Section" Visualization
*   **Root Cause:** Topics missing the `metadata.topic_class` field default to `'informational'` (Author Section/Blue). Existing maps or maps generated with older logic may lack this tag.
*   **Fix:**
    1.  Update `TopicDetailPanel.tsx` to include a "Topic Section" selector (Monetization vs Informational).
    2.  This allows the user to manually correct the classification of their pillars, instantly fixing the visual hierarchy (Gold vs Blue borders).
    3.  Ensure `onUpdateTopic` persists this change to `metadata`.

## 3. Execution Tasks
1.  **Task 01:** Update `DraftingModal.tsx` and `ProjectDashboard.tsx` to pass the correct Business Info.
2.  **Task 02:** Update `TopicDetailPanel.tsx` to add the Section Toggle.
