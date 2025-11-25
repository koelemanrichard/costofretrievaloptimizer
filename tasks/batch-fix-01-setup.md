
# Task: Implement Batch Remediation Logic

**Status:** [x] Completed
**Priority:** HIGH
**Target Files:**
- `config/prompts.ts`
- `services/ai/flowValidator.ts`
- `services/geminiService.ts`

## 1. Objective
Create the "Brain" of the batch fixer. It must take a list of issues and the full text, and return a fully coherent rewritten version.

## 2. Implementation Steps

### Step 2.1: Prompt Engineering
- [x] Create `BATCH_FLOW_REMEDIATION_PROMPT`.
- [x] **Structure:**
    ```text
    System: Senior Editor.
    Context: {Business Info/Stylometry}
    Original Draft:
    """
    {draft}
    """
    Issues to Resolve:
    1. [Category] - [Details] - Fix: [Remediation] - Near: "{snippet}"
    2. [Category] - [Details] - Fix: [Remediation] - Near: "{snippet}"
    ...

    Instructions:
    Rewrite the text to resolve these specific issues.
    Ensure global coherence.
    Return the full corrected markdown.
    ```

### Step 2.2: Service Implementation
- [x] Update `services/ai/flowValidator.ts` to export `applyBatchFlowRemediation`.
- [x] Update `services/geminiService.ts` to implement the call.
- [x] Ensure `AIResponseSanitizer` handles the response (which should be a JSON object containing `{ polishedDraft: string }`).

## 3. Verification
-   Unit test: Send a text with 2 distinct errors (e.g., a bad heading and a bad transition).
-   Verify both are fixed in the returned text.
