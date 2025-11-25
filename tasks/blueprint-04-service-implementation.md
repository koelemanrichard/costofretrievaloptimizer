
# Task 04: Implement Blueprint Generation Service

**Priority:** HIGH
**Status:** Completed
**Objective:** Implement the service layer logic to call the AI and process the blueprint data.

## 1. Update `services/ai/mapGeneration.ts`
*   **New Function:** `generateTopicBlueprints(topics, businessInfo, pillars)`.
*   **Switch Logic:** Implement the provider dispatch (Gemini, OpenAI, etc.).
*   **AI Call:** Call the `GENERATE_TOPIC_BLUEPRINT_PROMPT`.
*   **Return:** Array of `{ id, blueprint }`.

## 2. Update Provider Services
*   Update `services/geminiService.ts` (and stubs for others) to handle the new prompt call.
*   Ensure `responseSchema` is used if possible (for Gemini) to enforce the Blueprint structure.

## 3. Verification
*   Check type safety of the new service function.
