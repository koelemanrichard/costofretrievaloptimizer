
# Improvement Task 03: Holistic Map Generation Logic

**Status:** [x] Completed
**Priority:** HIGH
**Objective:** Implement the "Core Section vs. Author Section" logic and the "1:7 Hub-Spoke Ratio".

## 1. Prompt Engineering
**File:** `config/prompts.ts`

*   Update `GENERATE_INITIAL_TOPICAL_MAP_PROMPT`.
*   **New Instruction:** "You are a Holistic SEO Architect. Do not just generate topics. You must generate two distinct SECTIONS:"
    1.  **Monetization Section (Core):** Strictly `{Central Entity} + {Source Context}`.
    2.  **Informational Section (Author):** `{Central Entity} + {Background/History/Definitions}`.
*   **Constraint:** "For every Topic in the Monetization Section, you MUST generate exactly 7 supporting 'Cluster Content' topics (Spokes) to satisfy the 1:7 ratio."
*   **Output Schema:** Update the expected JSON structure to return nested objects representing this structure.

## 2. Logic Implementation
**File:** `services/ai/mapGeneration.ts`

*   Update `generateInitialTopicalMap`.
*   **Parse Response:** Handle the new split structure.
*   **Map to Schema:**
    *   Monetization Topics -> `topic_class: 'monetization'`.
    *   Informational Topics -> `topic_class: 'informational'`.
*   **Slug Cleaning:** Implement a helper `cleanSlug(parentSlug, childTitle)` that removes repetitive words (Rule II.E) before saving to DB.

## 3. UI Updates
**File:** `components/TopicalMapDisplay.tsx`

*   **Visual Distinction:** Render Monetization topics with a Gold border/badge and Informational topics with a Blue border/badge.
*   **Ratio Warning:** If a Core Topic has < 7 children, display a small "Low Density" warning icon next to it.

## 4. Verification
*   Generate a new map.
*   Verify visual distinction between sections.
*   Verify that core topics have ~7 children.
*   Verify slugs are clean (e.g., `/visa/requirements` not `/visa/visa-requirements`).
