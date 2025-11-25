
# Improvement Task 05: The Quality Engine

**Status:** Pending
**Priority:** MEDIUM
**Objective:** Implement the metrics defined in Part 3 (Validation) and structural rules from Part 2.

## 1. New Analysis Logic
**File:** `services/ai/analysis.ts` (or `qualityService.ts`)

*   **`calculateHubSpokeRatio(topics)`:** Returns a map of `CoreTopicID -> Ratio`. Checks against the **1:7** optimal ratio (Rule II.D).
*   **`checkSemanticDistance(topic, centralEntity)`:** (Simulated via AI Prompt). Ask AI: "Rate relevance 0-10".
*   **`checkContextualFocus(topic, sourceContext)`:** Ask AI: "Does this topic align with the source context?"
*   **`auditAnchorTextVariation(briefs)`:** (Rule II.F). Iterate through all planned internal links across all briefs.
    *   **Logic:** If the exact same string (e.g., "best running shoes") is used as an anchor text > 3 times pointing to the same target URL, flag as a "Repetitive Anchor Text" warning.
*   **`calculateContentDecay(topics)`:** (Rule III.D).
    *   **Input:** `topic.freshness` (EVERGREEN | STANDARD | FREQUENT) and `topic.last_audited_at`.
    *   **Logic:**
        *   `FREQUENT`: Decays 10% score every 7 days.
        *   `STANDARD`: Decays 5% score every 30 days.
        *   `EVERGREEN`: Decays 1% score every 90 days.
    *   **Output:** Flag topics with < 70% freshness score as "Stale - Needs Update".

## 2. UI Integration
**File:** `components/ValidationResultModal.tsx`

*   Add a new tab or section: "Holistic Quality Metrics".
*   Display "Hub-Spoke Efficiency" charts (Green/Yellow/Red based on 1:7 target).
*   Display "Semantic Drift" warnings for topics that scored low on the Distance check.
*   Display "Anchor Text Diversity" report.
*   Display "Content Freshness" report showing decaying topics.

## 3. Verification
*   Run "Validate Map".
*   Check if the new metrics appear.
*   Deliberately add an off-topic topic (e.g., "Pizza" in a "Software" map). Verify the validator flags it.
