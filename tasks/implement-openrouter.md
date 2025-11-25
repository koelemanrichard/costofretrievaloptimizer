# Task: Implement OpenRouter Service

**Status:** Pending
**Priority:** HIGH
**Target File:** `services/openRouterService.ts`

## 1. Objective
Replace the stubs in `services/openRouterService.ts` with a working implementation that calls the OpenRouter API.

## 2. Implementation Details
*   **Base URL:** `https://openrouter.ai/api/v1/chat/completions`
*   **Helper:** Create a local `callApi` function similar to `geminiService.ts` but using `fetch`.
*   **Headers:**
    *   `Authorization: Bearer $KEY`
    *   `HTTP-Referer: $SITE_URL` (Required by OpenRouter)
    *   `X-Title: Holistic SEO Workbench` (Required by OpenRouter)
*   **Logic:**
    *   Map all exported functions (e.g., `suggestCentralEntityCandidates`, `polishDraft`) to use `callApi` with the correct prompt.
    *   Ensure `prompts.ts` functions are called with the correct arguments.
    *   Pass the `sanitizerFn` to `callApi` to ensure type safety.

## 3. Verification
*   Select "OpenRouter" in Business Info.
*   Enter a valid key.
*   Perform "Polish Draft" (as this was the user's reported failure).
