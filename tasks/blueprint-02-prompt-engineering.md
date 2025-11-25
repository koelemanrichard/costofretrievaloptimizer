
# Task 02: Prompt Engineering for Blueprints

**Status:** [x] Completed
**Priority:** HIGH
**Objective:** Create a specialized prompt that acts as a "Content Architect," generating structural plans for topics in batches without writing the full content.

## 1. Update `config/prompts.ts`
*   Export `GENERATE_TOPIC_BLUEPRINT_PROMPT(topics: string[], info: BusinessInfo, pillars: SEOPillars)`.
*   **Context:** Inject Central Entity and Source Context.
*   **Instructions:**
    *   "For each topic, design the **Contextual Vector** (Sequence of H2 headings)."
    *   "Define the **Methodology** (e.g., 'Comparative Analysis with Table')."
    *   "Draft the **Subordinate Text Hint** (Instructions for the first paragraph)."
    *   "Define the **Interlinking Strategy** and **Anchor Text**."
*   **Output Schema:** JSON Array of objects matching the `TopicBlueprint` interface (plus the topic title/ID to match back).

## 2. Verification
*   Review prompt logic to ensure it explicitly asks for the missing columns identified in the Data Completeness Plan.
