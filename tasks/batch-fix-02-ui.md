
# Task: Batch Fix UI & Integration

**Status:** [x] Completed
**Priority:** HIGH
**Target Files:**
- `components/FlowAuditModal.tsx`
- `components/ProjectDashboardContainer.tsx`

## 1. Objective
Allow the user to select issues and trigger the batch fix.

## 2. Implementation Steps

### Step 2.1: FlowAuditModal
- [x] Add state `selectedIssueIndices: Set<number>`.
- [x] Add Checkbox to the Issue Card rendering.
- [x] Add "Select All" toggle in the header of the issues list.
- [x] Add Footer Button: `Fix {count} Issues`.
- [x] **Logic:** When clicked, call `onBatchFix(selectedIssues)`.

### Step 2.2: Container Logic
- [x] Implement `handleBatchFlowAutoFix` in `ProjectDashboardContainer`.
- [x] **Workflow:**
    1.  Call `aiService.applyBatchFlowRemediation`.
    2.  Update DB `content_briefs`.
    3.  **Crucial:** Immediately call `handleAnalyzeFlow(newDraft)` to re-score the new text.
    4.  Update the `FlowAuditModal` with the NEW result (so the user sees the green checkmarks and new score immediately).

## 3. Verification
-   Open Draft -> Flow Audit.
-   Select 3 issues.
-   Click Fix.
-   Verify spinner runs.
-   Verify modal updates with a higher score and fewer issues.
-   Verify draft text in editor is updated.
