
# Gap Analysis & Roadmap: Holistic SEO Framework Alignment

**Status:** Completed
**Date:** Current
**Objective:** Upgrade the application data model and AI logic to achieve 100% compliance with the "Cost of Retrieval" reduction framework defined by Koray Tuğberk GÜBÜR.

---

## I. Gap Analysis

### 1. Foundational Components (Node Identity)

| Data Point | Current Status | Severity | Action Required |
| :--- | :--- | :--- | :--- |
| **Central Entity** | ✅ Implemented | Low | Maintain in `SEOPillars`. |
| **Map Section** | ✅ Implemented | Low | Using `topic_class` ('monetization'/'informational'). |
| **Attribute** | ✅ Implemented | Low | Stored in `attribute_focus` and Metadata. |
| **Target Query Network** | ✅ Implemented | Low | Stored in `topic.metadata.query_network`. |
| **Canonical Query (CQ)** | ✅ Implemented | Low | Stored in `topic.metadata.canonical_query`. |
| **Query Type** | ✅ Implemented | Low | Mapped to `ResponseCode`. |

### 2. Content Structure (Brief Blueprint)

| Data Point | Current Status | Severity | Action Required |
| :--- | :--- | :--- | :--- |
| **Macro Context / H1** | ✅ Implemented | Low | Covered by `Topic Title` and `Brief Title`. |
| **Contextual Vector** | ✅ Implemented | Low | Covered by `ContentBrief.outline`. |
| **Subordinate Text Hint** | ✅ Implemented | Low | Stored in `structured_outline`. |
| **Image Alt / URL Hint** | ✅ Implemented | Low | URL Hint stored in `topic.metadata`. |
| **Perspective Req** | ✅ Implemented | Low | Stored in `brief.perspectives`. |
| **EAV Consistency** | ✅ Implemented | Low | Handled via "Truth Ranges" prompt instructions. |

### 3. Interlinking & Connections

| Data Point | Current Status | Severity | Action Required |
| :--- | :--- | :--- | :--- |
| **Anchor Text** | ✅ Implemented | Low | In `ContextualBridge`. |
| **Annotation Text Hint** | ✅ Implemented | Low | Stored in `ContextualBridgeLink.annotation_text_hint`. |
| **Anchor Repetition** | ✅ Implemented | Low | Covered by `auditAnchorTextVariation` in `analysis.ts`. |

### 4. Logistics & Metrics

| Data Point | Current Status | Severity | Action Required |
| :--- | :--- | :--- | :--- |
| **Publication Date** | ✅ Implemented | Low | Stored in `topic.metadata.planned_publication_date`. |
| **Semantic Compliance** | ⚠️ Planned | Low | Future AI Analysis feature. |
| **Context Coherence** | ⚠️ Planned | Low | Future AI Analysis feature. |
| **Topical Borders** | ✅ Implemented | Low | Stored in `topical_border_note`. |

---

## II. Implementation Roadmap (Completed)

### Phase 1: Schema "Hyper-Granularity" (The Data Upgrade)
**Objective:** Add the missing columns to our TypeScript interfaces and Database schema.

*   **Task 09:** ✅ Update `EnrichedTopic` to include `canonical_query`, `query_network`, `planned_publication_date`, and `topical_border_note`.
*   **Task 10:** ✅ Update `ContentBrief` to include `perspectives`, `methodology_note`.
*   **Task 11:** ✅ Refactor `ContextualBridgeLink` to include `annotation_text_hint`.

### Phase 2: Prompt Engineering "Micro-Management" (The Brain Upgrade)
**Objective:** Update AI prompts to generate these granular details.

*   **Task 12 (Map Gen):** ✅ Update `GENERATE_INITIAL_TOPICAL_MAP_PROMPT` to identify the **Canonical Query**, **Query Network**, and **URL Hint**.
*   **Task 13 (Brief Gen):** ✅ Update `GENERATE_CONTENT_BRIEF_PROMPT` to write **Subordinate Text Hints**, **Annotation Text Hints**, and **Perspectives**.

### Phase 3: Visualization & Feedback
**Objective:** Show these new dimensions to the user.

*   **Task 14:** ✅ Update `TopicDetailPanel` to show the Canonical Query and Query Network.
*   **Task 15:** ✅ Update `BriefReviewModal` to render the new hints clearly.

### Phase 4: Data Portability & Completeness (The Export Engine)
**Objective:** Ensure users can extract the full Topical Map with all extensive columns.

*   **Task 11 (Export):** ✅ Implement `TopicalMapExporter` utility using `xlsx` library.
*   **Task 12 (Data Backfill):** ✅ Create a "Regenerate Metadata" workflow to enrich existing maps.
