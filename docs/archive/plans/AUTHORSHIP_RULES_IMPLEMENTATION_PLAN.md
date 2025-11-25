# Authorship & Algorithmic Integrity Master Plan

**Status:** Active
**Objective:** Upgrade the content generation engine to strictly adhere to the "Cost of Retrieval" reduction rules. This transforms the application from a "Writer" to an "Algorithmic Author".

---

## I. Foundational & Strategic Authorship (Identity)

**Goal:** Establish the Author as a reconciled Entity with a specific Stylometry.

### Tasks:
1.  **Schema Upgrade (Author Entity):**
    *   **File:** `types.ts`, `BusinessInfoForm.tsx`
    *   **Action:** Upgrade `BusinessInfo` to support multiple `AuthorProfiles`.
    *   **Fields:** `Name`, `Bio`, `Credentials`, `SocialURLs`, `StylometryProfile` (e.g., "Academic", "Direct", "Data-Driven").
    *   **Output:** Inject `Person` schema into the article JSON-LD.
2.  **Stylometry Injection:**
    *   **File:** `config/prompts.ts`
    *   **Action:** Create a "Stylometry System Prompt" that enforces negative constraints (e.g., "Never use 'In conclusion'", "No passive voice").

---

## II. Algorithmic Authorship (Linguistic & Density)

**Goal:** Maximize Information Density (One Fact/Sentence) and maintain Fact Consistency.

### Tasks:
1.  **Dependency Tree Constraint:**
    *   **File:** `config/prompts.ts`
    *   **Action:** Update Drafting prompt: "Construct sentences with a short Dependency Tree. One Subject-Predicate-Object per sentence. Avoid compound clauses."
2.  **Fact Consistency Check (The Truth Engine):**
    *   **File:** `services/ai/analysis.ts`
    *   **Action:** Implement `auditFactConsistency`. Cross-reference numerical claims in the draft against the `KnowledgeGraph`. If the draft says "Price: $50" but KG says "$100", flag it.
3.  **Explicit Naming Enforcement:**
    *   **File:** `services/ai/briefGeneration.ts`
    *   **Action:** Upgrade `checkPronounDensity`. If "It/They" is used > 3 times in a paragraph without restating the Entity Name, flag as **Ambiguous Co-reference**.

---

## III. Content Brief & Structure Rules (Layout)

**Goal:** Organize content for the Search Engine's Contextual Vector.

### Tasks:
1.  **Question Protection (Candidate Answer Passage):**
    *   **File:** `services/ai/briefGeneration.ts`
    *   **Action:** Implement `checkQuestionProtection`.
    *   **Logic:** If H2 starts with "What/How/Why", regex check the first sentence of the following paragraph. It MUST contain a definitive verb (is/are/means) within the first 5 words.
2.  **List Logic Preamble:**
    *   **File:** `services/ai/briefGeneration.ts`
    *   **Action:** Audit lists (`<ul>`, `<ol>`). Ensure the *preceding* paragraph ends with a definitive count (e.g., "The 3 factors are:").
3.  **Subordinate Text Optimization:**
    *   **File:** `config/prompts.ts`
    *   **Action:** Force the AI to write the "Answer" in the first sentence of every section, keeping it under 40 words (340 chars).

---

## IV. The "Check & Re-generate" Loop (Refinement)

**Goal:** Automate the correction of authorship violations.

### Tasks:
1.  **The Refinement Service:**
    *   **File:** `services/ai/briefGeneration.ts`
    *   **Action:** Implement `refineDraftSection(text, specificViolation)`.
    *   **Logic:** Sends *only* the failing paragraph to the AI with a specific fix instruction (e.g., "Rewrite this to remove passive voice" or "Rewrite this to answer the H2 directly").
2.  **UI Integration:**
    *   **File:** `components/DraftingModal.tsx`
    *   **Action:** Add "Auto-Fix" buttons next to Audit failures.
    *   **Workflow:** User runs Audit -> System flags "Weak First Sentence" -> User clicks "Fix" -> AI rewrites just that sentence -> Draft updates in real-time.

---

## V. Implementation Sequence

1.  **Step 1:** Update `types.ts` to support Author Profiles.
2.  **Step 2:** Rewrite `GENERATE_ARTICLE_DRAFT_PROMPT` to include the new Authorship constraints.
3.  **Step 3:** Upgrade `auditContentIntegrity` with the new Regex checks (Question Protection, List Logic).
4.  **Step 4:** Implement the `refineDraftSection` service.
5.  **Step 5:** Update `DraftingModal` to enable the "Check -> Re-generate" workflow.
