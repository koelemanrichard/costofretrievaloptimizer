# Topical Map Improvement Plan: Holistic SEO (Part 1 & 2)

**Status:** Approved for Execution
**Objective:** Refactor the application to strictly adhere to Koray Tuğberk GÜBÜR's Holistic SEO framework, specifically the **Foundational Rules (The 5 Essentials)** and the **Structural Rules (Hierarchy & Configuration)**.

---

## 1. The Conceptual Shift

The current application treats topics as generic "Core" (Parent) vs "Outer" (Child). We must upgrade this to a semantically rigorous **Section-Based Model**.

### Old Model vs. New Model

| Feature | Current App | Holistic SEO Upgrade |
| :--- | :--- | :--- |
| **Structure** | Hierarchy (Parent -> Child) | **Sections** (Core/Monetization vs. Author/Informational) |
| **Expansion** | "Add 3-5 topics" | **1:7 Hub-Spoke Ratio** (Strict density requirement) |
| **EAVs** | Generic Triples | **Prioritized Attributes** (Unique > Root > Rare) |
| **Briefs** | Basic Outline | **Granular Directives** (Exact list counts, column orders) |
| **Links** | Semantic Similarity | **PageRank Flow** (Author Section -> Core Section) |

---

## 2. Detailed Implementation Tasks

### Phase A: Schema & Data Modeling
**Target:** `types.ts`, `database.types.ts`, `utils/parsers.ts`

1.  **Refactor `EnrichedTopic`:**
    *   Add `topic_class`: `'monetization'` (Core Section) | `'informational'` (Author Section).
    *   Add `attribute_focus`: `'unique'` | `'root'` | `'rare'` (To track attribute coverage).
    *   *Rationale:* Align with Rule I.D/E (Sections) and II.B (Attribute Prioritization).

2.  **Refactor `ContentBrief`:**
    *   Expand `contextualBridge` to be a full object: `{ type: 'section', content: string, links: Link[] }`. It's not just links; it's a "transition paragraph" (Rule II.H).

### Phase B: Prompt Engineering (The "Brain" Upgrade)
**Target:** `config/prompts.ts`

#### 1. "New Map" Generation (`GENERATE_INITIAL_TOPICAL_MAP_PROMPT`)
*   **Strict Sectioning:** Force the AI to output two distinct arrays: `monetizationTopics` (Core Section - CE + SC) and `informationalTopics` (Author Section - CE + Predicate).
*   **The 1:7 Rule:** Explicitly instruct the AI: "For every Core Section hub, generate at least **7** spoke topics." (Rule II.D).
*   **Slug Hygiene:** "Ensure URL slugs do not repeat words redundantly. e.g., use `/visa/requirements` instead of `/visa/visa-requirements`." (Rule II.E).

#### 2. EAV Discovery (`DISCOVER_CORE_SEMANTIC_TRIPLES_PROMPT`)
*   **Attribute Labeling:** Instruct AI to categorize every triple as `Unique` (defines the identity), `Root` (defines the nature), or `Rare` (historical/specific).
*   **Prioritization:** "Generate content based on Unique attributes first." (Rule II.B).

#### 3. Content Brief Generation (`GENERATE_CONTENT_BRIEF_PROMPT`)
*   **Granular Control (Rule II.G):**
    *   "Do not just say 'Create a table'. Specify: 'Create a table with 3 columns: Name, Price, Lifespan'."
    *   "Do not just say 'List benefits'. Specify: 'Create a list of exactly 5 benefits'."
*   **Contextual Bridge (Rule II.H):**
    *   Require a dedicated H2 or paragraph explicitly designed to transition from the Macro Context (Head) to the Micro Context (Body).
*   **CSI Injection (Rule I.C):**
    *   Force the `Central Search Intent` phrase into the Meta Description.

### Phase C: Logic & Utility Upgrades
**Target:** `services/aiService.ts`, `utils/helpers.ts`

1.  **Slug Cleaner Utility:**
    *   Implement `cleanSlug(parentSlug: string, childTitle: string)` to programmatically remove redundant words from child slugs to satisfy Rule II.E.
2.  **Internal Linking Logic:**
    *   Update `findLinkingOpportunities` to enforce the "River Flow" of authority:
        *   **Must:** `Author Section` pages link to `Core Section` pages.
        *   **Avoid:** `Core Section` pages linking heavily to deep `Author Section` pages (dilution).

### Phase D: Validation & Analysis
**Target:** `components/ValidationResultModal.tsx`

1.  **Hub-Spoke Validator:**
    *   New check: Does every Hub have at least 7 Spokes? (Warn if < 7).
2.  **Contextual Focus Validator:**
    *   New check: Do titles contain the Central Entity?

---

## 3. Execution Sequence

1.  **Task 1 (Types):** Update `types.ts` to support Sections and Attribute types.
2.  **Task 2 (Prompts):** Rewrite `GENERATE_INITIAL_TOPICAL_MAP_PROMPT` to enforce Sections and 1:7 ratio.
3.  **Task 3 (Logic):** Update `generateInitialTopicalMap` in `aiService` to handle the new response structure and apply Slug Cleaning.
4.  **Task 4 (Briefs):** Rewrite `GENERATE_CONTENT_BRIEF_PROMPT` for extreme granularity and Contextual Bridges.
5.  **Task 5 (UI):** Update `TopicalMapDisplay` to visually distinguish "Monetization" vs "Informational" sections (e.g., Gold vs Blue borders).
