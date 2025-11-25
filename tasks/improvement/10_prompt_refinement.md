
# Improvement Task 10: Prompt Refinement (Hints & Signals)

**Status:** [x] Completed
**Priority:** HIGH
**Objective:** Force the AI to generate the specific "Hints" and "Networks" required for high-precision content creation, covering all columns in the specs.

## 1. Target: `GENERATE_CONTENT_BRIEF_PROMPT` (in `config/prompts.ts`)

### New Instructions to Inject:

1.  **Subordinate Text Hint (The "Answer First" Rule):**
    *   *Instruction:* "For every H2 and H3, provide a `subordinate_text_hint`. This must explicitly dictate the syntax of the first sentence (e.g., 'Define X as Y using a definitive verb like IS or MEANS')."

2.  **Annotation Text Hint (Contextual Linking):**
    *   *Instruction:* "For every internal link in the `contextualBridge`, provide an `annotation_text_hint`. This is the text *surrounding* the anchor text. It must semantically bridge the current paragraph to the target topic."

3.  **Perspectives:**
    *   *Instruction:* "Identify 1-2 specific `perspectives` needed for this article (e.g., 'Developer', 'Regulator', 'End-User') to ensure comprehensive coverage."

4.  **Methodology/Format:**
    *   *Instruction:* "For each section, specify the `methodology_note` (e.g., 'Use a comparison table', 'Use an ordered list with item count')."

## 2. Target: `GENERATE_INITIAL_TOPICAL_MAP_PROMPT`

1.  **Canonical Query & Network:**
    *   *Instruction:* "For every topic generated, identify the `canonical_query` (the main user intent) AND a `query_network` (list of 3-5 related search queries/mid-string keywords)."

2.  **URL Optimization:**
    *   *Instruction:* "Provide a `url_slug_hint`. This should be a concise version of the title, max 3 words, suitable for a URL."

## 3. Execution Steps
1.  Update `config/prompts.ts`.
2.  Update `services/geminiService.ts` (and schema config) to expect these new fields in the JSON response.

## 4. Verification
*   Generate a brief.
*   Check the logs/modal. Does the outline now contain specific instructions like "Start with 'X is...'"?
*   Generate a map. Check for `query_network` in the logs.
