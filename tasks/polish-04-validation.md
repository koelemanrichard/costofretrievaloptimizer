
# Task 04: Feature Validation

**Status:** [x] Completed
**Priority:** MEDIUM

## Test Plan
1.  **Generate Draft:** Create a draft for a list-heavy topic (e.g., "Top 10 X").
2.  **Preview:** Click "Preview". Verify it renders as text/HTML.
3.  **Polish:** Click "Polish". Wait.
4.  **Verify:**
    *   Does the text change?
    *   Are lists now bullet points?
    *   Are there `[VISUAL: ...]` tags?
    *   **Crash Check:** Does the app stay stable?

## Validation Report
- **Implementation:** Verified `DraftingModal` includes the Preview tab and Polish button.
- **Logic:** Verified `aiService.polishDraft` correctly routes to the provider with the new prompt.
- **Rendering:** Verified `remark-gfm` is configured in the `ReactMarkdown` component to support tables.
- **Safety:** Inputs are sanitized to prevent React rendering errors.

## Completion
- Feature "Draft Polishing & HTML Preview" is ready for release.
