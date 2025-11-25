# Task: Implement Anthropic Service

**Status:** Pending
**Priority:** MEDIUM
**Target File:** `services/anthropicService.ts`

## 1. Objective
Replace stubs with `@anthropic-ai/sdk` calls.

## 2. Implementation Details
*   **SDK:** Import `Anthropic` from `@anthropic-ai/sdk`.
*   **Helper:** Create `callApi`.
*   **System Prompts:** Anthropic passes system prompts as a top-level parameter, not a message role.
*   **JSON Enforcement:** Claude is chatty. Append "Return ONLY JSON." to the user message, or prefill the assistant response with `{` to force valid JSON generation.
*   **Logic:** Implement all exported functions.

## 3. Verification
*   Select "Anthropic" in settings.
*   Run "Analyze Knowledge Domain".
