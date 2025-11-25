# Task: Implement OpenAI Service

**Status:** Pending
**Priority:** MEDIUM
**Target File:** `services/openAiService.ts`

## 1. Objective
Replace stubs with `openai` SDK calls.

## 2. Implementation Details
*   **SDK:** Import `OpenAI` from `openai`.
*   **Helper:** Create `callApi` that initializes `new OpenAI({ apiKey, dangerouslyAllowBrowser: true })`.
*   **Config:** Use `response_format: { type: "json_object" }` for all JSON-expecting functions.
*   **Logic:** Implement all 30+ exported functions mapping prompts to `messages: [{ role: "system", ... }, { role: "user", ... }]`.

## 3. Verification
*   Select "OpenAI" in settings.
*   Generate a Content Brief.
