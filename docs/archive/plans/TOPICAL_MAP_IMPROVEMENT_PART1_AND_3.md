
# Topical Map Improvement Plan: Validation & Quality (Part 3)

**Status:** Proposed
**Objective:** Integrate "The Cost of Retrieval Check" validation logic into the application. This shifts the focus from simply *generating* topics to *rigorously auditing* them for efficiency, factuality, and authority before publication.

---

## 1. The Core Philosophy: Cost of Retrieval

Search engines penalize "expensive" sites—those with inconsistent facts, low information density, or poor structural efficiency. To minimize this cost, we must implement five specific quality controls.

### The 5 New Quality Pillars

1.  **Structural Efficiency:** The **1:7 Hub-Spoke Ratio**. A hub with too few spokes is weak; one with too many is diluted.
2.  **Factuality (CWA):** Adhering to **Corroboration of Web Answers**. Avoiding absolute statements when consensus is lacking (using "Truth Ranges").
3.  **Consistency:** Site-wide alignment of facts. If Article A says "Sky is Blue", Article B cannot imply "Sky is Green".
4.  **Always-On Improvement:** The map is dynamic. Content must be flagged for updates based on freshness, not just creation.
5.  **Authority Proof (Unique Expertise):** The inclusion of **Unique Attributes** that competitors do not have.

---

## 2. Implementation Plan

### Phase A: Metric Quantification (Rule A)
**Target:** `components/ValidationResultModal.tsx`, `services/aiService.ts`

We need to move beyond generic "validation" to specific calculations.

1.  **Hub-Spoke Ratio Calculator:**
    *   **Logic:** For every `Core Section` topic, count the linked `Author Section` (outer) topics.
    *   **Threshold:**
        *   **< 4:** Critical Warning (Under-supported Hub).
        *   **5-9:** Optimal (Green).
        *   **> 12:** Warning (Potential Dilution/Cannibalization).
2.  **Semantic Compliance Score:**
    *   **Logic:** `(Number of EAVs in Brief) / (Total Expected Attributes for Entity Type)`.
    *   **Action:** If score < 85%, the brief generation is flagged as "Low Density".
3.  **Context Coherence Score:**
    *   **AI Task:** Evaluate specific topic titles against the `Source Context`.
    *   **Prompt:** "Does the topic '{topic.title}' align with the source context '{sourceContext}'? Score 0-1."

### Phase B: The Truth Engine (Rules B & C)
**Target:** `lib/knowledgeGraph.ts`, `services/geminiService.ts`

To ensure consistency, the application needs a "Memory" of established facts.

1.  **Knowledge Graph "Truth Bank":**
    *   Update `KnowledgeNode` to store `definitions` and `accepted_ranges`.
    *   *Example:* If we define "MDR" as "Managed Detection and Response" in the Core Pillar, no future brief can define it as "Medical Device Reporting" without a disambiguation context.
2.  **Conflict Detection:**
    *   **New AI Tool:** `checkConsistency(newBrief, existingKnowledgeGraph)`.
    *   **Prompt:** "Compare the assertions in this new brief against the existing Knowledge Graph nodes. Are there contradictions?"

### Phase C: Factuality & Truth Ranges (Rule B)
**Target:** `config/prompts.ts` (`GENERATE_CONTENT_BRIEF_PROMPT`, `AUDIT_CONTENT_INTEGRITY_PROMPT`)

1.  **Prompt Engineering (CWA):**
    *   **Instruction:** "For numerical values or disputed facts, DO NOT state an absolute. You MUST state a 'Truth Range' citing the variance (e.g., '7.0 - 7.8 pH')."
    *   **Instruction:** "Identify specific EAVs that require external corroboration."
2.  **Audit Rule:**
    *   **New Check:** "Absolute Statement Detector". The auditor flags distinct numbers or claims that lack attribution or range qualifiers.

### Phase D: Authority Proof Injection (Rule E)
**Target:** `components/BusinessInfoForm.tsx`, `types.ts`

1.  **New Input Field:** `UniqueDataAssets` (e.g., "We have a proprietary database of 10k malware samples").
2.  **Prompt Integration:**
    *   The AI must be forced to include these unique assets in *every* Core Section brief to prove E-E-A-T.
    *   **Validation:** If a Core Brief does not mention a Unique Data Asset, it fails the "Authority Proof" check.

### Phase E: Content Configuration (Rule D)
**Target:** `database.types.ts`, `types.ts`, `ProjectDashboardContainer.tsx`

1.  **Schema Update:** Add `last_audited_at` and `decay_score` to `content_briefs`.
2.  **Decay Logic:**
    *   Topics marked `FreshnessProfile.FREQUENT` decay by 10% score every week.
    *   Topics marked `EVERGREEN` decay by 1% every month.
3.  **Dashboard Alert:** "Stale Content Alert" panel for briefs that have dropped below a freshness threshold.

---

## 3. Execution Task List

1.  **Task 3.1 (Metrics):** Implement `calculateHubSpokeRatio` utility and integrate it into `validateTopicalMap`.
2.  **Task 3.2 (Schema):** Update `types.ts` to include `UniqueDataAssets` in `BusinessInfo` and `decay_score` in `EnrichedTopic`.
3.  **Task 3.3 (Prompts):** Rewrite `GENERATE_CONTENT_BRIEF_PROMPT` to strictly enforce "Truth Ranges" and "Unique Asset Injection".
4.  **Task 3.4 (Logic):** Implement `detectSemanticConflicts` in `aiService.ts` to cross-reference new briefs against the Knowledge Graph.
5.  **Task 3.5 (UI):** Add a "Quality & Consistency" tab to the Validation Modal to display these new advanced metrics.

