
# Holistic Task 03: Prompt Engineering - Algorithmic Authorship

**Status:** [x] Completed
**Priority:** HIGH
**Target File:** `config/prompts.ts`

## 1. Objective
Rewrite `GENERATE_ARTICLE_DRAFT_PROMPT` to transform the AI from a "Creative Writer" to an "Algorithmic Author" that minimizes retrieval cost.

## 2. Implementation Steps

### Step 2.1: Define the System Instruction
"You are an Algorithmic Author. You do not write fluff. You construct sentences based on Semantic Role Labeling (Agent-Predicate-Theme)."

### Step 2.2: Inject Drafting Constraints
1.  **The <40 Word Rule:** "For the section identified as `featured_snippet_target`, the answer MUST be in the first sentence and under 40 words."
2.  **Discourse Integration:** "Use the `discourse_anchors` provided in the brief to transition between paragraphs."
3.  **EAV Density:** "One Fact Per Sentence. Avoid compound sentences."
4.  **Explicit Naming:** "Do not use 'it' or 'they' to refer to [{centralEntity}]. Repeat the noun."
5.  **Visuals:** "Insert placeholders for the defined `visual_semantics` using `[VISUAL: Description]` format."

### Step 2.3: Pass Context
Ensure the prompt receives the full `ContentBrief` object, including the new fields (`visual_semantics`, `featured_snippet_target`).

## 3. Verification
*   Generate a draft using a brief created in Task 02.
*   **Inspection:**
    *   Are the first sentences definitive ("X is Y")?
    *   Is the Featured Snippet answer concise?
    *   Are pronouns minimized?
