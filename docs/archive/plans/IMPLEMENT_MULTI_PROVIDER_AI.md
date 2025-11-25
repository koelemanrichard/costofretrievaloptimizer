# Plan: Implement Multi-Provider AI Services

**Status:** Active
**Priority:** CRITICAL
**Objective:** Replace the placeholder stubs in `openAiService.ts`, `anthropicService.ts`, `perplexityService.ts`, and `openRouterService.ts` with fully functional implementations that match the feature set of `geminiService.ts`.

## 1. Analysis & Strategy

The application uses a Facade pattern (`services/ai/index.ts`) that dispatches calls to specific provider files based on `businessInfo.aiProvider`. Currently, only `geminiService.ts` is implemented. The others throw "Not Implemented" errors.

### Common Requirements for All Services
1.  **Interface Compliance:** Must export all ~30 functions defined in `services/ai/*.ts` (e.g., `generateContentBrief`, `polishDraft`).
2.  **Sanitization:** Must use `AIResponseSanitizer` to clean and validate JSON responses.
3.  **Logging:** Must dispatch `LOG_EVENT` actions for request/response tracing.
4.  **Error Handling:** Must wrap API calls in try/catch blocks and throw descriptive errors.

### Provider-Specific Strategies

#### A. OpenRouter Service
*   **API:** Standard OpenAI-compatible Chat Completions API (`https://openrouter.ai/api/v1/chat/completions`).
*   **Auth:** Bearer Token (`openRouterApiKey`).
*   **JSON Mode:** Support `response_format: { type: "json_object" }` where possible.
*   **Models:** Dynamic models supported via the existing discovery service.

#### B. OpenAI Service
*   **SDK:** `openai` (already in import map).
*   **Auth:** `openAiApiKey`.
*   **JSON Mode:** Use `response_format: { type: "json_object" }`.
*   **Refinement:** Ensure system prompts are correctly passed as `role: "system"`.

#### C. Anthropic Service
*   **SDK:** `@anthropic-ai/sdk` (already in import map).
*   **Auth:** `anthropicApiKey`.
*   **JSON Extraction:** Claude does not natively support JSON-mode in the same way. We will use a "Tool Use" or "Prefill" strategy (prefilling `{` to force JSON) or rely on the Sanitizer.

#### D. Perplexity Service
*   **API:** REST API (`https://api.perplexity.ai/chat/completions`).
*   **Auth:** Bearer Token (`perplexityApiKey`).
*   **Special Handling:** Perplexity models (Sonar) are search-grounded. Prompts might need slight adjustment if they refuse to generate creative text, but usually standard prompts work.

## 2. Implementation Tasks

1.  **Task 01:** Implement `services/openRouterService.ts` (Priority: High, requested by user).
2.  **Task 02:** Implement `services/openAiService.ts`.
3.  **Task 03:** Implement `services/anthropicService.ts`.
4.  **Task 04:** Implement `services/perplexityService.ts`.

## 3. Verification Plan

For each provider:
1.  Update Settings with a valid API key.
2.  Run a lightweight action: "Add Topic (AI Assistant)" -> Verify `generateStructuredTopicSuggestions`.
3.  Run a heavy action: "Generate Content Brief" -> Verify `generateContentBrief` and schema validation.
4.  Run a text action: "Polish Draft" -> Verify `polishDraft` (Markdown handling).
