
# Improvement Task 04: Holistic Content Briefs

**Status:** Pending
**Priority:** HIGH
**Objective:** Upgrade brief generation to be encyclopedic and factually rigorous, strictly adhering to Rules II.G, II.H, and II.I.

## 1. Prompt Engineering
**File:** `config/prompts.ts` -> `GENERATE_CONTENT_BRIEF_PROMPT` & `GENERATE_ARTICLE_DRAFT_PROMPT`

*   **SRL (Semantic Role Labeling) & Answer First (Rule V.7):** "The first sentence of every section MUST define the Subject using a definitive verb (is, causes, comprises). Avoid fluff."
*   **Truth Ranges (Rule III.B):** "For any numerical value (price, dimensions, stats), provide a 'Truth Range' (e.g., $500-$800) rather than a single number, citing variance."
*   **Granularity (Rule II.G):** "Do not write 'List benefits'. Write 'List exactly 5 benefits in descending order of importance'."
*   **Contextual Bridge (Rule II.H):** "Write a specific 'Transition Paragraph' that connects the Macro Context of the site to the Micro Context of this article."
*   **EAV Density (Rule II.I):** "Adopt a strict 'One Fact Per Sentence' structure. Do not mix multiple unrelated facts in a single sentence. Structure sentences to allow easy extraction of Subject-Predicate-Object triples."

## 2. Logic Implementation
**File:** `services/ai/briefGeneration.ts`

*   Pass the `Source Context` and `Central Search Intent` more aggressively into the system prompt.
*   **Validation:** Post-process the brief. If `serpAnalysis` is missing, auto-fill it with "simulated" data based on the entity type to ensure the writer always has a template.

## 3. Verification
*   Generate a brief.
*   Inspect the `outline`. Does it have strict instructions like "List 5..."?
*   Inspect the `keyTakeaways`. Do they use definitive verbs?
