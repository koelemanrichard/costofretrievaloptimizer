
# Task 01: Polish Prompt Engineering

**Status:** [x] Completed
**Priority:** HIGH
**Target File:** `config/prompts.ts`

## Objective
Create the `POLISH_ARTICLE_DRAFT_PROMPT`. This prompt must instruct the AI to act as an editor, improving presentation without hallucinating new facts.

## Requirements
1.  **Input:** `draft` (string), `brief` (ContentBrief), `info` (BusinessInfo).
2.  **Instructions:**
    *   **Introduction:** Rewrite to be engaging and summarize the specific content.
    *   **Formatting:** Aggressively convert text lists to Markdown lists/tables.
    *   **Visuals:** Insert placeholders `[VISUAL: description]`.
    *   **Tone:** Enforce the Author's Stylometry again.
    *   **Output:** Return clean Markdown.

## Verification
- Check `config/prompts.ts` for the new export.

Next Task: `tasks/polish-02-service.md`
