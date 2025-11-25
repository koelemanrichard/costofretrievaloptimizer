
# Holistic Task 02: Prompt Engineering - Content Brief

**Status:** [x] Completed
**Priority:** HIGH
**Target File:** `config/prompts.ts`
**Dependencies:** Task 01 (Schema Upgrade)

## 1. Objective
Rewrite `GENERATE_CONTENT_BRIEF_PROMPT` to strictly enforce the 5 categories of "Cost of Retrieval" rules: Foundational, Structural, Linguistic, Visual, and Interlinking.

## 2. Implementation Steps

### Step 2.1: Structure the Prompt
Break the prompt into clear sections corresponding to the rules.

*   **Section I: Strategy & Entity:**
    *   Enforce **Attribute Ordering** (Unique > Root > Rare).
    *   Enforce **Source Context** filtering.
*   **Section II: Structure & Flow:**
    *   Enforce strict **H-Tag Hierarchy**.
    *   Require a **Contextual Bridge** (Transition Paragraph).
    *   Define the **Subordinate Text** rule (First sentence must be definitive).
*   **Section III: Linguistic Directives:**
    *   **Explicit Naming:** Forbid pronouns for the Central Entity.
    *   **No Opinion:** Forbid subjective phrases.
*   **Section IV: Visuals:**
    *   Request **Visual Semantics** (Infographics/Charts) instead of generic photos.
*   **Section V: Interlinking:**
    *   Rule: "Links must be placed *after* the definition."

### Step 2.2: Output Requirements
*   Ensure the prompt explicitly asks for the new JSON fields defined in Task 01 (`visual_semantics`, `featured_snippet_target`, etc.).

## 3. Verification
*   Generate a brief.
*   **Inspection:**
    *   Does the outline follow the Unique -> Root -> Rare order?
    *   Are `visual_semantics` populated with data-driven descriptions?
    *   Is `featured_snippet_target` defined?

Progress Update: Completed prompt engineering for content briefs.
Next Task: tasks/holistic-03-drafting-prompt-engineering.md
