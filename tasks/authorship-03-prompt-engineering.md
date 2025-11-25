
# Authorship Task 03: Prompt Engineering (Linguistic & Structure)

**Status:** [x] Completed
**Priority:** CRITICAL
**Target File:** `config/prompts.ts`
**Dependencies:** Task 01

## 1. Objective
Rewrite `GENERATE_ARTICLE_DRAFT_PROMPT` to inject the new Authorship Rules directly into the AI's instructions.

## 2. Implementation Steps

### Step 2.1: Stylometry Injection (Rule I.E)
*   Extract `authorProfile` from `BusinessInfo`.
*   Create a helper to generate a "System Persona" based on `stylometry` type.
*   *Example:* If 'DIRECT_TECHNICAL', inject: "Use short sentences. Avoid adjectives. Focus on mechanics."
*   Inject `customStylometryRules` as negative constraints ("NEVER use these words...").

### Step 2.2: Linguistic Density (Rule II.A)
*   Add instruction: "Maximize Information Density. Adhere to a strict 'One Fact Per Sentence' rule. Keep the Dependency Tree short."

### Step 2.3: Structure Rules (Rule III.C, III.D)
*   **Question Protection:** "If a heading is a question, the IMMEDIATELY following sentence must be the direct answer."
*   **List Logic:** "Before any list, provide a definitive introductory sentence stating the count (e.g., 'The 5 factors are:')."

## 3. Verification
*   Generate a draft.
*   Inspect the output. Does it match the selected tone? Does it answer questions immediately?
