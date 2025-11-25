
# Task: Update Flow Audit UI for Remediation

**Status:** [x] Completed
**Priority:** HIGH
**Target File:** `components/FlowAuditModal.tsx`

## 1. Objective
Update the `FlowAuditModal` to become an interactive remediation tool.

## 2. Implementation Steps
- [x] Update `FlowAuditModal` props to accept `onAutoFix`.
- [x] Add local state to track issue status (`IDLE`, `FIXING`, `FIXED`, `DISMISSED`).
- [x] Add UI controls (Auto-Fix, Dismiss) to the issue card.
- [x] Implement visual feedback (loading spinners, success indicators).

## 3. Verification
- Open Flow Audit modal.
- Verify buttons appear on issues.
- Verify clicking "Fix" triggers loading state (integration test next).
