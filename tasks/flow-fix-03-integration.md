
# Task: Integrate Flow Remediation

**Status:** [x] Completed
**Priority:** HIGH
**Target Files:**
- `components/ProjectDashboardContainer.tsx`
- `components/ProjectDashboard.tsx`
- `components/DraftingModal.tsx`

## 1. Objective
Wire up the "Auto-Fix" functionality from the `FlowAuditModal` to the application's logic, ensuring that when a fix is applied, the underlying draft content is updated in the database and reflected in the editor.

## 2. Implementation Steps
- [x] **`ProjectDashboardContainer.tsx`**: Ensure `handleFlowAutoFix` logic is robust.
    - Update DB `article_draft`.
    - Update local state.
    - Re-run flow analysis (`handleAnalyzeFlow`) on the new draft to update the report.
    - Render `<FlowAuditModal>` and pass `onAutoFix={handleFlowAutoFix}`.
- [x] **`ProjectDashboard.tsx`**: Ensure `onAnalyzeFlow` is accepted as a prop and passed to `<DraftingModal>`.
- [x] **`DraftingModal.tsx`**: Ensure `onAnalyzeFlow` is accepted and triggered by the "Flow & Vector Audit" button.

## 3. Verification
- Open a Draft.
- Run Flow Audit.
- Click "Auto-Fix" on an issue.
- **Expected:**
    1. Button shows loading state.
    2. Notification "Applied flow remediation successfully" appears.
    3. The issue in the modal marks as "RESOLVED".
    4. The draft text in the background editor updates.
    5. The Vector Visualization (left column) might update if the vector changed (due to re-analysis).
