# Content Brief & Authorship Improvement Plan

**Status:** Approved for Execution
**Objective:** Refactor the Content Brief and Article Draft generation logic to strictly adhere to the provided "Cost of Retrieval" reduction rules (Foundational, Structural, Linguistic, Visual, and Interlinking).

---

## 1. Gap Analysis: Current vs. Holistic Rules

| Rule Category | Current Application State | Gap / Deficit | Action Required |
| :--- | :--- | :--- | :--- |
| **I. Foundational** | Has `Central Entity`, `Source Context`. | Lacks strict attribute prioritization (Unique > Root > Rare). Lacks EAV Compliance thresholding. | Update prompt to force attribute sorting based on uniqueness. Implement Semantic Compliance score. |
| **II. Structure** | Has `outline`, `structured_outline`. | `Contextual Bridge` is just a link list, not a transition logic. Lacks explicit `Visual Hierarchy` enforcement in drafts. | Redefine `ContextualBridge` as a structural transition paragraph. Enforce H-tag logic in prompts. |
| **III. Linguistic** | "Answer First" exists. | Lacks `Definitive Answer` constraints (<40 words). Lacks `Explicit Naming` (no pronouns). Lacks `Discourse Integration` (anchor segments). | Rewrite Draft Prompt to enforce specific sentence structures, word counts, and anchor segments. |
| **IV. Visuals** | Basic `ImageAltText`. | Lacks `Infographics/Data` prioritization. Lacks specific technical specs (width/height) in brief. | Expand `visuals` schema to include data visualization prompts and dimensions. |
| **V. Interlinking** | Has `Anchor Text`. | Lacks `Link Position` rules (after definition). Lacks `Annotation Text` semantic alignment enforcement. | Enforce "Post-Definition" linking rules in the brief instructions and audit logic. |

---

## 2. Schema & Type Definition Upgrades

We need to expand the `ContentBrief` interface to act as a stricter container for these rules.

**Target File:** `types.ts`

### New/Modified Fields:
1.  **`query_type_format`**: Explicitly maps the `ResponseCode` to a retrieval format (e.g., `Instructional` -> `Ordered List`, `Definitional` -> `Prose`). (Rule II.G).
2.  **`featured_snippet_target`**: A specific field defining the **Candidate Answer Passage** (CAP).
    *   *Structure:* `{ question: string, answer_target_length: number, required_predicates: string[] }`.
3.  **`visual_semantics`**: Replace simple `visuals` with a robust array.
    *   *Structure:* `Array<{ type: 'INFOGRAPHIC' | 'CHART' | 'PHOTO', description: string, caption_data: string, height_hint?: string, width_hint?: string }>` (Rule IV.A, IV.D).
4.  **`discourse_anchors`**: A list of "Anchor Segments" (mutual words) to use for paragraph transitions (Rule III.H).

---

## 3. Prompt Engineering: The "Algorithmic Architect"

We will rewrite `GENERATE_CONTENT_BRIEF_PROMPT` in `config/prompts.ts` to be a strict rule-injector.

### Section I: Strategy & Entity (Rules I.A - I.E)
*   **Central Entity Focus (Rule I.A):** "Reject any topic or sub-heading that does not strictly modify the **Central Entity** ('{centralEntity}'). Do not generalize."
*   **Source Context Alignment (Rule I.B):** "Filter attributes based on the Source Context ('{sourceContext}'). Only include attributes relevant to the monetization intent."
*   **Attribute Ordering (Rule I.D):** "Structure the outline to answer **Unique Attributes** (definitive features/IDs) FIRST, followed by **Root Attributes** (Definitions), then **Rare Attributes** (Deep Details)."

### Section II: Structure & Flow (Rules II.A - II.G)
*   **Contextual Vector (Rule II.B):** "Generate a strictly ordered Heading List (H1 -> H2 -> H3) that creates a logical Contextual Vector."
*   **The Bridge (Rule II.D):** "Define a specific `Contextual Bridge` section. This must be a transitional paragraph (using an H2) that moves the user from the Macro Context (The Site's Core Topic) to the Micro Context (This Article)."
*   **Subordinate Text (Rule II.F):** "For every H2, define the **Subordinate Text**. This is the *very first sentence*. It must be a definitive statement answering the heading directly."
*   **Summary (Rule II.E):** "Mandate an **Introductory Summary** that synthesizes the entire document (Abstractive)."

### Section III: Linguistic Directives (Rules III.A - III.H)
*   **No Opinion (Rule III.G):** "Strictly FORBID subjective phrases ('I think', 'In my opinion'). Use only declarative, factual statements supported by EAVs."
*   **Explicit Naming (Rule III.D):** "Instruct the writer to use **Explicit Naming**. Do not use pronouns ('it', 'they') for the Central Entity. Repeat the noun to ensure Named Entity Recognition (NER)."
*   **Predicate Selection (Rule III.E):** "Use functional predicates (verbs) aligned with the Central Search Intent (e.g., use 'generate' or 'configure' for software, not 'do')."

### Section IV: Visuals & Metadata (Rules IV.A - IV.E)
*   **Infographics (Rule IV.A):** "Instead of stock photos, describe a specific **Data Visualization** or **Infographic** that represents the EAVs of this section (e.g., 'Chart showing pH levels vs Temperature')."
*   **Schema (Rule IV.C):** "Define specific Schema types beyond 'Article' (e.g., 'FAQ', 'Product', 'AggregateRating') based on the content."

---

## 4. Drafting Logic: The "Algorithmic Author"

We will rewrite `GENERATE_ARTICLE_DRAFT_PROMPT` to enforce the *execution* of these rules.

**New System Instruction:**
"You are an Algorithmic Author designed to minimize Search Engine Retrieval Cost. You do not write 'fluff'. You construct sentences based on Semantic Role Labeling (Agent-Predicate-Theme)."

### Drafting Constraints:
1.  **The <40 Word Rule (Rule III.C):** "For the definition of the main topic (Featured Snippet Target), the answer MUST be contained within the first sentence and MUST be under 40 words (approx 340 characters)."
2.  **Discourse Integration (Rule III.H):** "Ensure the last sentence of Paragraph A contains a keyword (Anchor Segment) that is repeated in the first sentence of Paragraph B to maintain flow."
3.  **EAV Density (Rule III.B):** "One Fact Per Sentence. Do not combine multiple EAV triples into complex compound sentences. Increase Information Density."
4.  **Link Positioning (Rule V.C):** "Insert internal links ONLY *after* the entity has been defined. Never link in the first sentence of a paragraph. Do not link from the first paragraph."

---

## 5. Validation & Auditing (The Quality Gate)

We will upgrade `auditContentIntegrity` in `services/ai/analysis.ts` to check these specific rules.

**New Audit Rules:**
1.  **`checkSubjectivity` (Rule III.G)**: Scan for words like "hope", "feel", "believe", "opinion". Penalty if found.
2.  **`checkPronounDensity` (Rule III.D)**: Calculate ratio of "It/They/He/She" vs "Specific Entity Name". If ratio > X, flag for "Ambiguous Co-Reference".
3.  **`checkFirstSentencePrecision` (Rule II.F)**: Extract first sentence of H2s. If length > 25 words or lacks definitive verb ("is", "means"), flag as "High Retrieval Cost".
4.  **`checkLinkPositioning` (Rule V.C)**: Regex check. If `[Link]` appears in the first 10% of a paragraph's characters, flag as "Premature Linking".
5.  **`checkFSCompliance` (Rule III.C)**: If the brief designates a Featured Snippet target, check if the corresponding draft section is < 40 words.

---

## 6. Execution Steps

1.  **Step 1 (Schema):** Update `types.ts` and `utils/parsers.ts` to include `visual_semantics`, `featured_snippet_target`, and `query_type_format`.
2.  **Step 2 (Prompts):** Completely rewrite `GENERATE_CONTENT_BRIEF_PROMPT` using the "Rules I-V" structure defined above.
3.  **Step 3 (Drafting):** Rewrite `GENERATE_ARTICLE_DRAFT_PROMPT` to enforce Algorithmic Authorship constraints (SRL, Discourse Integration, Word Counts).
4.  **Step 4 (Validation):** Implement the specific Regex/AI checks for Subjectivity, Pronouns, and Link Positioning in `services/ai/analysis.ts`.
5.  **Step 5 (UI):** Update `ContentBriefModal` to render the new `visual_semantics` (Infographic descriptions) and `featured_snippet_target` guidance.
