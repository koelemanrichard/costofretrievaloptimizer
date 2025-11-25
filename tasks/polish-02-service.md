
# Task 02: Implement Polish Service

**Priority:** HIGH
**Status:** [x] Completed
**Target Files:** 
- `services/geminiService.ts` (and other providers)
- `services/ai/briefGeneration.ts`

## Objective
Wire up the prompt to the API execution layer.

## Implementation Steps
1.  **`geminiService.ts`:** Implement `polishDraft`. Use the `POLISH_ARTICLE_DRAFT_PROMPT`. Use `generateContent` (non-JSON mode might be safer for large Markdown, or `text/plain` MIME type).
2.  **`ai/briefGeneration.ts`:** Export `polishDraft` as part of the facade. Ensure it switches on the provider correctly.

## Verification
- Ensure type safety in `services/ai/index.ts`.
