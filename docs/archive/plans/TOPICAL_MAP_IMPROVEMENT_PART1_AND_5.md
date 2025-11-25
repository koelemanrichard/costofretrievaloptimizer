# Topical Map Improvement Plan: Semantic & Algorithmic Mastery (Part 5)

**Status:** Proposed
**Objective:** Integrate advanced semantic and algorithmic concepts into the workbench. This moves beyond structure (Part 1-4) into the nuances of **Information Extraction**, **Search Engine Understanding**, and **Ranking Signals**.

---

## 1. Semantic Role Labeling (SRL) & Subordinate Text (Concepts 1 & 7)

**The Concept:** Search engines parse sentences to find the Agent, Predicate, and Theme. The **Subordinate Text** (the text immediately following a heading) must start with a **Candidate Answer Passage** that is grammatically optimized for this parsing.

### Current Gap
The current `GENERATE_ARTICLE_DRAFT_PROMPT` encourages "high-quality" writing but does not enforce specific sentence structures for the critical first sentence of a section.

### Implementation Plan

#### A. The "Answer First" Protocol
**Target:** `services/geminiService.ts` (`GENERATE_ARTICLE_DRAFT_PROMPT`), `config/prompts.ts`

1.  **Strict Directive:** Modify the drafting prompt to enforce the **"First Sentence Rule"** for every H2 and H3.
    *   *Bad:* "When we talk about X, it is important to consider..." (Fluff/Ambiguous Subject).
    *   *Good:* "X **is** a [Category] that [Function]..." (Definitive Predicate).
2.  **SRL Verb Injection:**
    *   Instruct the AI to prioritize "definitive" verbs in the first sentence: *is, causes, increases, reduces, consists of*.
    *   Avoid "weak" verbs: *involves, relates to, concerns*.

#### B. Validation (The "Fluff Detector")
**Target:** `services/aiService.ts` (`auditContentIntegrity`)

1.  **New Audit Rule:** `checkCandidatePassage`.
    *   **Logic:** Extract the text immediately following the H1/H2.
    *   **Check:** Does it contain the Subject (Topic Keyword) within the first 5 words?
    *   **Check:** Is the sentence length < 25 words? (Conciseness aids extraction).

---

## 2. Canonical Query (CQ) & Search Intent (CSI) (Concept 3)

**The Concept:** A cluster of queries (e.g., "cost of x", "x price", "how much for x") resolves to a single **Canonical Query**. The content must target this CQ to rank for the whole cluster.

### Current Gap
The app generates topics but doesn't explicitly group them under a "Canonical Query" label, potentially leading to keyword cannibalization if multiple topics target the same CQ.

### Implementation Plan

#### A. Canonical Clustering
**Target:** `services/aiService.ts` (`findMergeOpportunities`), `types.ts`

1.  **Schema Update:** Add `canonical_query` to `EnrichedTopic`.
2.  **Map Generation Logic:**
    *   When generating topics, the AI must identify the CQ for that topic.
    *   *Example:* Topic "Pricing Models for CRM" -> CQ "CRM Cost".
3.  **Cannibalization Check:**
    *   If two distinct Core Topics share the same CQ, flag them for **Merge** immediately.

---

## 3. Semantic Distance & Borders (Concept 2)

**The Concept:** **Closeness** connects nodes; **Distance** defines borders. We must ensure we don't drift "off-topic" (diluting the graph) or stay too narrow (missing context).

### Current Gap
The "Expand Knowledge Domain" feature is purely additive. It lacks a "Distance Check" to stop expansion into irrelevant territories.

### Implementation Plan

#### A. The "Border Patrol" Agent
**Target:** `services/aiService.ts` (`addTopicIntelligently`), `KnowledgeDomainModal.tsx`

1.  **Logic:** Before adding a new node/topic, calculate its **Semantic Distance** from the `Central Entity`.
2.  **Simulation:**
    *   Prompt: "On a scale of 1-10, how closely related is '{newTopic}' to '{centralEntity}' in the context of '{sourceContext}'?"
    *   **Threshold:** If Score < 6, reject the topic as "Out of Scope" or suggest creating a separate Linked Map.

---

## 4. Uncertain Inference (UI) (Concept 4)

**The Concept:** Users often search with "incomplete" intent. Search engines use UI to predict the *likely* next step. Our content must address this *future* need.

### Current Gap
Briefs focus on the literal title. They don't predict the "Next Click".

### Implementation Plan

#### A. "Next Step" Prediction
**Target:** `config/prompts.ts` (`GENERATE_CONTENT_BRIEF_PROMPT`)

1.  **New Brief Section:** `predicted_user_journey`.
    *   Instruction: "If a user searches for this topic, what is the *Uncertain Inference* for their next query? (e.g., Search: 'Flat tire' -> UI: 'Tow truck service' or 'Tire repair shop')."
2.  **Action:** Create a dedicated `Call to Action` or `Internal Link` in the brief specifically targeting this inferred need.

---

## 5. Initial Ranking (IR) & Quality Signals (Concept 5)

**The Concept:** **IR** is determined largely by "Static Quality Signals" (formatting, authorship, unique media) present at the moment of indexing.

### Current Gap
The app generates text but ignores non-text quality signals that boost IR.

### Implementation Plan

#### A. The "IR Booster" Pack
**Target:** `BusinessInfoForm.tsx`, `types.ts`, `SchemaModal.tsx`

1.  **Authorship Configuration:**
    *   Add `AuthorName`, `AuthorBio`, and `AuthorCredentials` to `BusinessInfo`.
2.  **Schema Injection:**
    *   Ensure `SchemaModal` automatically generates `Person` (Author) and `Organization` schema linked to the `Article` schema.
3.  **Visuals Enhancement:**
    *   In `ContentBrief`, upgrade `visuals` to require **Unique Data Visualization** ideas (Charts, Graphs), not just "stock photo prompts".

---

## 6. Site-Wide N-Grams (Concept 6)

**The Concept:** Consistent phrases used across the entire site (boilerplate) signal the macro-context to the engine.

### Current Gap
Briefs are generated in isolation. There is no "Site Voice" enforcement.

### Implementation Plan

#### A. N-Gram Enforcement
**Target:** `components/ProjectDashboardContainer.tsx`, `config/prompts.ts`

1.  **Configuration:** Extract `Source Context` keywords as "Mandatory N-Grams".
2.  **Brief Generation:**
    *   Inject a rule: "The phrase '{sourceContext_keyword}' MUST appear in the Introduction and Conclusion of every article."
3.  **Validation:**
    *   The `AuditContentIntegrity` function checks for the presence of these specific N-grams.

---

## 7. URL Fragments & Jump Links (Concept 8)

**The Concept:** Long content requires deep linking points (`#section`) for "Scroll-to-Text" ranking features.

### Current Gap
Outlines are generated as simple text lists.

### Implementation Plan

#### A. Fragment Generation
**Target:** `services/geminiService.ts`

1.  **Structure:** The `outline` object in `ContentBrief` should explicitly key every H2/H3 with a clean `id` attribute.
    *   *Format:* `H2: What is SEO? {#what-is-seo}`.
2.  **UI Rendering:**
    *   The `DraftingModal` should render a clickable **Table of Contents** using these IDs to verify navigation flow.

---

## 8. Semantic Coverage & Contextual Weight (Concept 9)

**The Concept:** A page must justify its existence by covering the topic with sufficient **weight** (depth).

### Current Gap
We check "Contextual Coverage" broadly, but not per-page density.

### Implementation Plan

#### A. Contextual Weight Score
**Target:** `services/aiService.ts` (`auditContentIntegrity`)

1.  **Calculation:**
    *   Analyze the draft.
    *   Count "Entity Occurrences" vs "Total Word Count".
    *   **Metric:** If the `Central Entity` (or its variations) constitutes < 1% or > 4% of the text (keyword stuffing vs dilution), flag it.
    *   *Goal:* Ensure the *weight* of the content is balanced on the core topic.

---

## 9. Execution Task List

1.  **Task 5.1 (SRL/Drafting):** Rewrite `GENERATE_ARTICLE_DRAFT_PROMPT` to enforce "Subject-Predicate-Object" syntax for first sentences.
2.  **Task 5.2 (Canonical/Merge):** Update `findMergeOpportunities` to group topics by `Canonical Query` (Intent Clustering).
3.  **Task 5.3 (Distance/Validation):** Implement `checkSemanticDistance` in `aiService` to prevent off-topic expansion.
4.  **Task 5.4 (IR/Schema):** Update `SchemaModal` to include Authorship signals derived from `BusinessInfo`.
5.  **Task 5.5 (N-Grams):** Add a "Mandatory N-Grams" check to the `ContentIntegrity` audit.