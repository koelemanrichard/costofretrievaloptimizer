
# Plan: Flow Audit Remediation (Fix or Dismiss)

**Status:** Proposed
**Priority:** HIGH
**Objective:** Upgrade the `FlowAuditModal` to allow users to interactively "Accept" (Auto-Fix) or "Dismiss" specific flow issues. This transforms the audit from a passive report into an active editing tool.

## 1. User Experience Design

### The "Action Column"
We will update the "Identified Flow Issues" list in `FlowAuditModal.tsx`. Each issue card will gain a footer or side-action area containing:
1.  **"✨ Auto-Fix" Button:** Visible only if the issue has a valid `offendingSnippet` and `remediation`. Clicking this triggers an AI call to rewrite that specific section.
2.  **"Dismiss" (Trash/X) Button:** Hides the issue from the view for this session (useful for false positives).

### Interaction Flow
1.  **User:** Clicks "Auto-Fix" on a "Discourse Gap" issue.
2.  **UI:** Shows a loading spinner on that specific card.
3.  **System:** Sends the specific snippet + context to the AI.
4.  **AI:** Rewrites the transition to include the necessary anchor words.
5.  **System:** Updates the master Draft Content in the parent `DraftingModal`.
6.  **UI:** Marks the issue as "RESOLVED" (Green checkmark) and disables the button.

## 2. Technical Architecture

### A. Service Layer (`services/ai/flowValidator.ts`)
We need a new function to handle the specific logic of fixing flow issues, which is slightly different from generic drafting fixes because it often involves bridging two distinct paragraphs.

*   **New Function:** `applyFlowRemediation(originalDraft: string, issue: ContextualFlowIssue, businessInfo: BusinessInfo): Promise<string>`
*   **Prompt Strategy:**
    *   "You are a Semantic Editor."
    *   "Here is a specific text segment that causes a Flow Issue: '{issue.offendingSnippet}'."
    *   "The specific violation is: '{issue.details}'."
    *   "The required fix is: '{issue.remediation}'."
    *   "Rewrite strictly this segment to resolve the issue while maintaining the original meaning and tone."

### B. Component Logic (`FlowAuditModal.tsx`)
We need local state to track the status of each issue since the main `FlowAuditResult` is immutable until a full re-run.

*   **State:** `issueStates: Record<number, 'IDLE' | 'FIXING' | 'FIXED' | 'DISMISSED'>` (keyed by index).
*   **Props:**
    *   `onApplyFix: (newDraft: string) => void` (Callback to update the parent draft).
    *   `draftContent: string` (Needed to perform the replacement).

### C. Integration (`DraftingModal.tsx`)
*   Pass the current `draftContent` and a handle to `setDraftContent` down to the `FlowAuditModal`.

## 3. Execution Tasks

1.  **Task F-01:** Implement `applyFlowRemediation` service in `services/ai/flowValidator.ts` with a specialized prompt.
2.  **Task F-02:** Update `FlowAuditModal.tsx` to accept `draftContent` and `onApplyFix` props. Implement the local state management for tracking Fix/Dismiss status.
3.  **Task F-03:** Implement the UI for the Action Buttons (Fix/Dismiss) and the visual states (Loading/Resolved).
4.  **Task F-04:** Update `DraftingModal.tsx` to pass the necessary props to wire it all together.

## 4. Verification Plan
1.  Open a Draft.
2.  Run Flow Audit.
3.  Find an issue (e.g., a Vector Break or Discourse Gap).
4.  Click "Auto-Fix".
5.  **Verify:** The button spins, then turns Green.
6.  **Verify:** The text in the background (Editor) updates with the improved phrasing.
7.  Click "Dismiss" on another issue.
8.  **Verify:** The card fades out or collapses.
