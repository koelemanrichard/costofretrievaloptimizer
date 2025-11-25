
# Authorship Task 06: UI Integration (Refinement Loop)

**Priority:** HIGH
**Target File:** `components/DraftingModal.tsx`, `components/ContentIntegrityModal.tsx`

## 1. Objective
Connect the Audit results to the Refinement Service via the UI.

## 2. Implementation Steps

### Content Integrity Modal
*   Update the `frameworkRules` list display.
*   If a rule fails (`isPassing: false`) AND it is a "fixable" algorithmic rule (like Question Protection), show a **"Auto-Fix"** button.

### Drafting Modal Integration
*   When "Auto-Fix" is clicked:
    1.  Identify the failing section in the draft (this might require the audit to return line numbers or the text snippet).
    2.  Call `refineDraftSection`.
    3.  Show a loading spinner on the button.
    4.  Upon success, replace the text in the `draft` state.
    5.  Re-run the specific audit rule locally to verify the fix (optional but good).

## 3. Verification
1.  Generate a draft.
2.  Run Audit.
3.  Find a failure (or manually create one).
4.  Click "Auto-Fix".
5.  Verify the text updates in the editor.

**Status:** [x] Completed
