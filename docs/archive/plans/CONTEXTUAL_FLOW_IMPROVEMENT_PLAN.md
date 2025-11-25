# Contextual Flow & Algorithmic Authorship Improvement Plan

**Status:** Proposed
**Priority:** CRITICAL (Quality Assurance Level 2)
**Objective:** Implement a rigorous "Deep Audit" system that validates content against the "Cost of Retrieval" reduction framework. This system must work for both **Drafts** (pre-publication) and **Live URLs** (post-publication).

---

## 1. The Core Concept: "The Flow Validator" (Standalone Engine)

We will build a specialized engine—**The Flow Validator**—that audits content against the three dimensions provided:
1.  **Intra-Page Vector:** Does the document flow logically from H1 to Hx?
2.  **Microsemantics:** Are sentences dense, explicit, and modally correct?
3.  **Network Connection:** Do links flow towards authority (Core Section)?

### Architecture: The "Lab" Approach
To ensure this does not interfere with the current app, we will implement this as a **"Semantic Audit Lab"**.
*   **Input Agnostic:** It accepts `(text, context)` OR `(url, context)`.
*   **Read-Only:** It analyzes data but does not mutate the `content_briefs` table directly (unless the user explicitly applies a fix).
*   **Future-Ready:** The data structure `FlowAuditResult` is designed to be stored in a future `url_audits` table for historical tracking.

---

## 2. Technical Architecture

### A. New Data Types (`types.ts`)

```typescript
export interface ContextualFlowIssue {
    category: 'VECTOR' | 'LINGUISTIC' | 'LINKING' | 'MACRO';
    rule: string; // e.g., "Attribute Order", "Discourse Integration"
    score: number; // 0-100
    details: string;
    offendingSnippet?: string;
    remediation: string;
}

export interface FlowAuditResult {
    overallFlowScore: number;
    vectorStraightness: number; // 0-100
    informationDensity: number; // 0-100
    issues: ContextualFlowIssue[];
    headingVector: string[]; // The extracted skeleton H1->H2->H3
    discourseGaps: number[]; // Indices of paragraphs where flow breaks
}
```

### B. Service Layer: `services/ai/flowValidator.ts`

We will create a new service module dedicated to this deep analysis. It will contain specific functions mapped to your provided rules:

1.  **`analyzeIntraPageFlow(text, context)`**:
    *   **Vector Straightness (Rule I.A):** Extracts headings. Asks AI: "Does this sequence represent a logical progression from Definition to Nuance without deviation?"
    *   **Attribute Order (Rule I.B):** Asks AI: "Does the content introduce Unique Attributes before Root/Rare attributes?"
    *   **Discourse Integration (Rule I.D):** Splits text into paragraphs. Compares $P_{end}$ vs $P_{(next)start}$ for semantic overlap (Anchor Segments).
    *   **Subordinate Text (Rule I.E):** Checks first sentence of every section for "Answer First" syntax.

2.  **`analyzeLinguisticDensity(text)`**:
    *   **Information Density (Rule II.A):** Checks sentence length vs. unique EAV count.
    *   **Explicit Naming (Rule II.B):** Checks Co-reference resolution.
    *   **Modality (Rule I.F):** Detects weak modal verbs ("can", "might").

3.  **`analyzeLiveUrl(url)`**:
    *   Uses the existing `content-analyzer` Edge Function to fetch HTML.
    *   Sanitizes the HTML to text/structure.
    *   Runs the above checks.

---

## 3. UI Implementation Strategy

We will introduce a new **"Deep Audit & Flow"** interface, accessible from the Drafting Modal (for drafts) and the Dashboard (for live URLs).

### A. The "Flow Report" UI (`components/FlowAuditModal.tsx`)

Instead of a simple list, this modal will feature:
1.  **The Vector Visualizer:** A vertical timeline showing H1 -> H2 -> H3.
    *   *Green Line:* Smooth flow.
    *   *Red Break:* "Vector Interruption" (e.g., Rare attribute placed before Root).
2.  **The "Heatmap" View:**
    *   Displays the content text.
    *   Highlights **"Fluff"** (Redundant Phrases - Rule II.C) in Yellow.
    *   Highlights **"Weak Links"** (Premature Linking - Rule IV.B) in Red.
    *   Highlights **"Discourse Gaps"** (Broken paragraph transitions) with a "Broken Chain" icon.
3.  **Metric Cards:**
    *   "Hub-Spoke Alignment" score.
    *   "Information Density" score.

### B. Dashboard Integration ("Live Audit")

*   **Location:** `AnalysisToolsPanel`.
*   **Action:** "Audit Live URL".
*   **Input:** URL.
*   **Process:** Fetch -> Parse -> Audit -> Show Report.
*   **Benefit:** Allows user to check competitors or their own published pages against the framework.

---

## 4. Prompt Engineering Strategy (`config/prompts.ts`)

We need extremely specific prompts to enforce these rules.

**Prompt Example: `AUDIT_CONTEXTUAL_FLOW_PROMPT`**
> "You are a Semantic Auditor. Analyze this text for 'Discourse Integration'.
> For every sequential paragraph pair (A -> B), check if the last sentence of A and the first sentence of B share a 'Mutual Context' or 'Anchor Segment'.
> If the subject changes abruptly without a bridge, flag it as a 'Flow Break'."

**Prompt Example: `AUDIT_ATTRIBUTE_ORDER_PROMPT`**
> "Analyze the sequence of attributes in this text.
> Standard Flow: Identity (Unique) -> Definition (Root) -> Details (Rare).
> Identify any section where a 'Rare' attribute (e.g., History/Trivia) appears *before* the 'Root' definition."

---

## 5. Execution Roadmap

### Phase 1: The Logic Engine
1.  **Task:** Create `services/ai/flowValidator.ts`.
2.  **Task:** Implement `analyzeIntraPageFlow` with prompts for Vector, Attribute Order, and Discourse.
3.  **Task:** Implement `analyzeLinguisticDensity` with prompts for Explicit Naming and Modality.

### Phase 2: The UI & Integration
1.  **Task:** Create `FlowAuditModal.tsx` to visualize the Vector and Discourse Chains.
2.  **Task:** Update `AnalysisToolsPanel.tsx` to add "Deep Semantic Audit".
3.  **Task:** Wire up the `content-analyzer` edge function to fetch external URLs provided by user.

## 6. Future Expansion (Out of Scope for Now)
*   **Project Tracking:** Saving `FlowAuditResult` to a database table to track improvements over time.
*   **Batch Processing:** Running this on a list of URLs.

This plan ensures the new functionality is isolated, reusable, and data-driven without destabilizing the core map generation features.