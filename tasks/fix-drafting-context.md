
# Task: Fix Drafting Modal API Context

**Status:** [x] Completed
**Priority:** CRITICAL
**Target Files:**
- `components/DraftingModal.tsx`
- `components/ProjectDashboard.tsx`

## 1. Objective
Ensure `DraftingModal` uses the Map-Specific AI settings (Gemini) instead of potentially stale global defaults.

## 2. Implementation Steps
1.  **Update `DraftingModal.tsx`:**
    -   Add `businessInfo: BusinessInfo` to the interface `DraftingModalProps`.
    -   Remove usage of `state.businessInfo` for AI calls. Use `props.businessInfo` instead.
2.  **Update `ProjectDashboard.tsx`:**
    -   Locate where `<DraftingModal />` is rendered.
    -   Pass `businessInfo={effectiveBusinessInfo}` as a prop.

## 3. Verification
-   Open the Drafting Modal.
-   Click "Finalize & Polish".
-   Verify it calls Gemini (success) instead of throwing OpenRouter error.
