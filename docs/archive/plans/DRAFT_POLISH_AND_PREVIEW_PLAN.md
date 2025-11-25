
# Plan: Draft Polishing & HTML Preview

**Status:** Completed
**Objective:** Upgrade the "Drafting" phase from a simple text editor to a "Publication Workbench". This involves two key features:
1.  **HTML Preview:** Ability to view the Markdown draft as rendered HTML (tables, lists, bolding) to verify visual structure.
2.  **Draft Polishing (Pass 2):** An AI-driven "Senior Editor" workflow that takes a raw draft and optimizes it for publication (rewriting intros, formatting tables, adding visual placeholders).

## 1. Feature Specification

### A. HTML Preview Tab
*   **Current UI:** `DraftingModal` has a single `Textarea`.
*   **New UI:** Add a Tab Switcher at the top:
    *   **[Editor]**: The existing raw Markdown textarea.
    *   **[Preview]**: A read-only, rendered view of the content.
*   **Rendering:** Use `react-markdown` with `remark-gfm` plugin to support Tables and Strikethrough.
*   **Safety:** Ensure the input to the renderer is strictly sanitized (using `safeString`) to prevent the "Error #31" crash that occurred previously.

### B. Content Polishing (The "Senior Editor" Agent)
*   **Problem:** Raw AI drafts often lack formatting variety (too many paragraphs, few tables) and have generic introductions.
*   **Solution:** A "Pass 2" generation step.
*   **Trigger:** A "Finalize & Polish" button in the Drafting Modal (floating or in footer).
*   **Prompt Strategy:** `POLISH_ARTICLE_DRAFT_PROMPT`
    *   **Input:** The current raw draft.
    *   **Directives:**
        *   **Rewriting Intro:** Create a concise, abstractive summary based on the *actual* generated content.
        *   **Formatting:** Convert dense lists to HTML `<ul>`/`<ol>`. Convert comparisons to Markdown Tables.
        *   **Visuals:** Insert `[IMAGE PLACEHOLDER]` markers where relevant.
        *   **Sanity:** Do *not* change the core facts (EAVs).

## 2. Technical Architecture

### A. Dependencies
*   We need `react-markdown` and `remark-gfm` available in the import map (`index.html`) if not already present.

### B. Service Layer (`services/ai/briefGeneration.ts`)
*   **New Function:** `polishDraft(draft, brief, businessInfo)`.
*   **Provider Dispatch:** Update `ai/index.ts` and `geminiService.ts` to handle this new request type.

### C. UI Components (`components/DraftingModal.tsx`)
*   **State:** Track `activeTab` ('edit' | 'preview').
*   **State:** Track `isPolishing` (loading state).
*   **Logic:**
    *   When "Polish" is clicked -> Call API -> Update `draftContent` -> Switch to 'Preview' tab automatically to show results.

## 3. Execution Tasks

1.  **Task 01:** [x] Create the `POLISH_ARTICLE_DRAFT_PROMPT` and update `config/prompts.ts`.
2.  **Task 02:** [x] Implement the backend service logic (`polishDraft`) in `geminiService.ts` and `ai/briefGeneration.ts`.
3.  **Task 03:** [x] Update `DraftingModal.tsx` with Tabs, Preview logic, and the Polish button.
4.  **Task 04:** [x] Validation (Generate a draft, polish it, view preview).
