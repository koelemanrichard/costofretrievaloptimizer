# Task: Implement Perplexity Service

**Status:** Pending
**Priority:** MEDIUM
**Target File:** `services/perplexityService.ts`

## 1. Objective
Replace stubs with `fetch` calls to Perplexity API.

## 2. Implementation Details
*   **Base URL:** `https://api.perplexity.ai/chat/completions`
*   **Helper:** Create `callApi`.
*   **Models:** Ensure correct model names (`sonar-pro`, etc.) are supported.
*   **Logic:** Implement all exported functions. Note that Perplexity is optimized for search, so prompts might need to emphasize "Using your search capabilities..." or "Based on general knowledge...".

## 3. Verification
*   Select "Perplexity" in settings.
*   Run "Generate Initial Map".
