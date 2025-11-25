# Topical Map Improvement Plan: The Foundational 5 (Part 1)

**Status:** Proposed
**Objective:** Refactor the Topical Map generation, expansion, and validation logic to strictly adhere to the "Five Essentials" of Holistic SEO: Central Entity (CE), Source Context (SC), Central Search Intent (CSI), Core Section (CS), and Author Section (AS).

## 1. Conceptual Shift: From "Parents/Children" to "Sections"

Currently, the app thinks in terms of `Core Topic -> Outer Topic` (Hierarchy).
**The Fix:** We must shift to `Core Section (Monetization)` vs. `Author Section (Background/Trust)`.

### New Data Structures
We need to update `EnrichedTopic` types to support this distinction.

*   **Core Section (CS):** Topics that represent **CE + SC** (The "Money" pages).
    *   *Example:* Visa Application Services, German Business Visa.
*   **Author Section (AS):** Topics that represent **CE + Predicate** (The "Trust" pages).
    *   *Example:* History of German Immigration, German Culture Guide.

---

## 2. Detailed Implementation Plan

### Phase A: Schema & Type Refactoring
**Target:** `types.ts`, `database.types.ts`

1.  **Update `EnrichedTopic`:**
    *   Add `topic_class`: `'monetization'` (Core Section) | `'informational'` (Author Section).
    *   Add `cluster_role`: `'pillar'` | `'cluster_content'`.
    *   *Rationale:* Allows the internal linker to prioritize links FROM `informational` TO `monetization`.
2.  **Update `SEOPillars`:**
    *   Explicitly split CSI into `primary_verb` (e.g., "Go") and `auxiliary_verb` (e.g., "Know").
    *   *Rationale:* Helps the AI separate content that belongs in AS ("Know") vs CS ("Go").

### Phase B: "New Map" Generation Prompt Engineering
**Target:** `config/prompts.ts` (`GENERATE_INITIAL_TOPICAL_MAP_PROMPT`)

The current prompt is too loose. It just asks for "5-7 core topics". We will restructure it to enforce the rules:

1.  **Rule A (CE Consolidation):**
    *   *Instruction:* "Reject any topic that does not strictly modify the Central Entity ('{centralEntity}'). Do not generate topics about adjacent entities."
2.  **Rule B (SC Prioritization):**
    *   *Instruction:* "Filter attributes based on Source Context ('{sourceContext}'). If a topic (e.g., 'History') does not directly support the monetization intent of the Source Context, exclude it or move it to the deepest part of the Author Section."
3.  **Rule D & E (Section Splitting):**
    *   *Instruction:* "Explicitly generate two distinct lists:
        1.  **Core Section (Monetization):** Topics directly related to `{centralEntity} + {sourceContext}`.
        2.  **Author Section (Historical/Info):** Topics related to `{centralEntity} + Knowledge/Background`."

### Phase C: Content Brief & CSI Injection
**Target:** `config/prompts.ts` (`GENERATE_CONTENT_BRIEF_PROMPT`)

1.  **Rule C (CSI Presence):**
    *   *Instruction:* "The Central Search Intent ('{centralSearchIntent}') MUST be explicitly mentioned in the 'Introduction' or 'Meta Description' to signal the canonical action."
2.  **Rule A (CE Focus):**
    *   *Instruction:* "Ensure the H1 and Title Tag focus heavily on the Central Entity. Avoid generic titles."

### Phase D: Internal Linking Logic (The Cost of Retrieval)
**Target:** `services/aiService.ts` (Link Audit), `components/InternalLinkingModal.tsx`

1.  **Rule D (PageRank Flow):**
    *   *Current Logic:* Links based on semantic similarity.
    *   *New Logic:*
        *   **Hard Rule:** Topics in the `Author Section` MUST link to the `Core Section`.
        *   **Hard Rule:** The `Core Section` should link sparingly to the `Author Section` (only for definition), to avoid diluting monetization authority.
2.  **Visualization Update:**
    *   Color code nodes by `Section` (Monetization = Gold, Info = Blue) to visualize the flow of authority.

### Phase E: Validation & Gap Analysis
**Target:** `services/aiService.ts` (`validateTopicalMap`)

1.  **New Validation Rules:**
    *   **"Focus Check":** Detect topics that deviate from the Central Entity (Rule A violation).
    *   **"Context Check":** Detect topics that do not align with the Source Context (Rule B violation).
    *   **"Flow Check":** Detect `Author Section` clusters that do not bridge back to a `Core Section` pillar (Orphaned History).

---

## 3. Step-by-Step Task Breakdown

1.  **Task 1.1:** Update `types.ts` and `utils/parsers.ts` to support `topic_class` (Monetization vs Info).
2.  **Task 1.2:** Refactor `GENERATE_INITIAL_TOPICAL_MAP_PROMPT` to strictly separate Core Section (CS) and Author Section (AS).
3.  **Task 1.3:** Refactor `GENERATE_CONTENT_BRIEF_PROMPT` to mandate CSI inclusion and strict CE focus.
4.  **Task 1.4:** Update `InternalLinkingModal` to visually distinguish CS vs AS and enforce directional linking suggestions (AS -> CS).
5.  **Task 1.5:** Update `validateTopicalMap` prompt to audit for "Source Context deviations".
