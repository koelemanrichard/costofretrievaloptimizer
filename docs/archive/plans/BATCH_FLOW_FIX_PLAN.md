# Plan: Context-Aware Batch Flow Remediation

**Status:** Proposed
**Priority:** CRITICAL
**Objective:** Solve the "Whack-a-Mole" problem in flow auditing. Instead of fixing issues in isolation (which breaks surrounding context), allow users to select multiple issues and fix them in a single, context-aware pass.

## 1. The Concept: "The Editorial Review"

We are moving from a "Patch" model to an "Editor" model.
*   **Current:** Find error -> Patch specific sentence -> Insert back (Risk: Disjointed flow).
*   **New:** Select all errors -> Send full draft + list of errors to AI -> AI rewrites affected areas harmoniously -> Return full coherent draft.

## 2. User Experience (UX)

### A. Selection Interface (`FlowAuditModal.tsx`)
1.  **Checkboxes:** Every issue card in the "Identified Flow Issues" list gets a checkbox.
2.  **Batch Controls:** A new footer/header section:
    *   "Select All / Deselect All".
    *   **Primary Action:** "Fix X Selected Issues".
3.  **Diff View (Safety):** When the batch fix returns, show a "Before vs After" comparison (or simply the new score) before permanently overwriting the draft.

## 3. Technical Architecture

### A. Service Layer (`services/ai/flowValidator.ts`)
*   **New Function:** `applyBatchFlowRemediation`
*   **Input:**
    *   `fullDraft`: The complete current text.
    *   `issues`: An array of selected `ContextualFlowIssue` objects.
    *   `businessInfo`: For tone/stylometry context.
*   **Prompt Strategy (`BATCH_FLOW_REMEDIATION_PROMPT`):**
    *   **Role:** "You are a Senior Semantic Editor."
    *   **Task:** "Here is a draft. Here is a list of specific flow violations (Vector breaks, Discourse gaps) found at specific locations."
    *   **Constraint:** "Rewrite the text to resolve ALL these issues simultaneously. Ensure the transitions between corrected sections are smooth. Do not change the meaning of sections that are not flagged."

### B. Integration (`ProjectDashboardContainer.tsx`)
*   **Handler:** `handleBatchFix`.
    1.  Set Loading state.
    2.  Call `applyBatchFlowRemediation`.
    3.  **Auto-Validation:** Immediately run `analyzeContextualFlow` on the *new* draft to confirm the score improved.
    4.  Update the Draft state.
    5.  Show success notification with the new score ("Flow Score improved from 65 -> 92").

## 4. Execution Tasks

1.  **Task 1:** Create `BATCH_FLOW_REMEDIATION_PROMPT` in `config/prompts.ts`.
2.  **Task 2:** Implement `applyBatchFlowRemediation` in `services/ai/flowValidator.ts` (and provider services).
3.  **Task 3:** Update `FlowAuditModal` to support multi-selection state and the "Fix Selected" button.
4.  **Task 4:** Wire up the batch handler in `ProjectDashboardContainer` to execute the fix and auto-validate the result.
