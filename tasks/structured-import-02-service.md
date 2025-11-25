
# Task: Implement Structured Import Service

**Priority:** HIGH
**Target Files:**
- `services/geminiService.ts`
- `services/ai/mapGeneration.ts`
- `services/openAiService.ts` (stub)
- `services/anthropicService.ts` (stub)
- `services/perplexityService.ts` (stub)
- `services/openRouterService.ts` (stub)

## 1. Objective
Implement the service function that orchestrates the AI call using the new prompt and returns the structured suggestions.

## 2. Implementation Steps
1.  **Update Provider Services:**
    *   In `services/geminiService.ts`, implement `generateStructuredTopicSuggestions`.
    *   It should accept `userThoughts` and `existingCoreTopics`.
    *   It calls `GENERATE_STRUCTURED_TOPIC_SUGGESTIONS_PROMPT`.
    *   It calls the API and sanitizes the result.
    *   Add stubs to other provider services.
2.  **Update Facade:**
    *   In `services/ai/mapGeneration.ts`, export `generateStructuredTopicSuggestions`.
    *   Implement the `switch(provider)` logic to route to the correct service.

## 3. Verification
-   Ensure TypeScript compiles without errors in the service layer.

**Status:** [x] Completed
