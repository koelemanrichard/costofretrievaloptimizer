
# Improvement Task 08: Advanced Algorithmic Features

**Status:** [x] Completed
**Priority:** MEDIUM
**Objective:** Implement the sophisticated refinement logic from Part 4 (Expansion) and Part 5 (Algorithmic Concepts) to ensure content is not just structured correctly, but algorithmically optimized for modern search engines.

## 1. Topic Viability Check (The "Page vs. Section" Test)
**Source:** Part 4, Rule C (Topological Refinement)

### Logic Implementation
**File:** `services/ai/mapGeneration.ts`

*   **New Function:** `analyzeTopicViability(topic, context)`.
*   **Prompt:** "Analyze the search demand and complexity of '{topic}'. Determine if it justifies a dedicated URL (Index) or if it is too thin and should be merged as a section into a parent page."
*   **Output:** `{ decision: 'PAGE' | 'SECTION', reasoning: string, targetParent?: string }`.

### UI Integration
**File:** `components/AddTopicModal.tsx`

*   **Workflow:** When a user adds a topic manually, run this check in the background.
*   **Feedback:** If `decision === 'SECTION'`, display a warning: "⚠️ This topic may be 'Dead Weight'. AI recommends adding it as an H2 section to [Parent Topic] instead."

## 2. Authorship & Initial Ranking (IR) Signals
**Source:** Part 5, Concept 5 (IR/PR) & Rule E (Authority Proof)

### Schema Update
**File:** `types.ts` (BusinessInfo)

*   Add fields: `authorName`, `authorBio`, `authorCredentials`, `socialProfileUrls`.

### Logic Implementation
**File:** `services/ai/briefGeneration.ts` (`generateSchema`)

*   **Schema Injection:** Automatically inject `Person` (Author) schema linked to the `Article` schema.
*   **Credential Validaton:** Ensure the `authorCredentials` (e.g., "PhD in Computer Science") are explicitly mentioned in the `authorBio` schema property to align E-E-A-T signals.

## 3. URL Fragments & Jump Links
**Source:** Part 5, Concept 8 (URL Fragments)

### Logic Implementation
**File:** `services/ai/briefGeneration.ts`

*   **Constraint:** In `GENERATE_CONTENT_BRIEF_PROMPT`, enforce a specific format for the `outline` object.
*   **Format:** Every H2 and H3 must include a semantic ID anchor.
    *   *Bad:* `## What is SEO?`
    *   *Good:* `## What is SEO? {#what-is-seo}`
*   **Rationale:** Supports "Scroll-to-Text" ranking features and improves contextual clarity.

### UI Verification
**File:** `components/BriefReviewModal.tsx`

*   **Visual Check:** Render a "Table of Contents" preview in the modal using these IDs to prove the structure is navigational.

## 4. Uncertain Inference (UI) & Next Steps
**Source:** Part 5, Concept 4 (Uncertain Inference)

### Logic Implementation
**File:** `config/prompts.ts`

*   **New Section:** Add `predicted_user_journey` to the Brief schema.
*   **Prompt:** "Predict the *Uncertain Inference* (UI). If a user searches for this topic, what is their *next* likely query? (e.g., 'Flat Tire' -> 'Tow Truck')."
*   **Action:** Generate a specific `Internal Link` or `Call to Action` targeting this predicted next step.

## 5. Site-Wide N-Grams
**Source:** Part 5, Concept 6 (N-Grams)

### Logic Implementation
**File:** `services/ai/analysis.ts` (`auditContentIntegrity`)

*   **Configuration:** Extract strict N-Grams from the `Source Context` (e.g., "Enterprise-Grade Security").
*   **Audit Rule:** Check if these specific N-grams appear in the **First 100 words** (Introduction) and **Last 100 words** (Conclusion) of the draft.
*   **Penalty:** If missing, flag as "Weak Source Context Signal".

## 6. Publication Momentum (Core First)
**Source:** Part 4, Rule B (Momentum)

### Logic Implementation
**File:** `services/ai/analysis.ts` (`generatePublicationPlan`)

*   **Constraint:** Modify the logic to enforce a strict 2-Phase rollout.
*   **Phase 1 Rules:**
    *   Must include ALL topics where `topic_class === 'monetization'` (Core Section).
    *   Must include "About" / "Home" trust pages.
    *   **Strictly** 0% `Author Section` (Informational) pages in this phase unless they are required dependencies.
*   **Phase 2 Rules:**
    *   Begin introducing `Author Section` pages, interleaved with updates to Core pages.

## 7. Multilingual Symmetry (Preparation)
**Source:** Part 4, Rule D

*   **Schema:** Ensure `ContentBrief` has `master_structure_id`.
*   **Logic:** No active logic needed yet, but ensure the `structural_template_hash` (Task 01) is being populated during brief generation to support future symmetry checks.

## 8. Verification
*   **Viability:** Try adding a very niche topic (e.g., "Color of the Save Button"). Expect a warning to merge it.
*   **Fragments:** Generate a brief. Check the outline for `{#id-tags}`.
*   **Momentum:** Generate a Publication Plan. Verify Phase 1 is almost entirely Core/Monetization topics.
