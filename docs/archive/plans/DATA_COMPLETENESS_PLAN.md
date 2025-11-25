
# Data Completeness & Holistic Export Plan

**Status:** Active
**Objective:** Ensure 100% population of the "Required Columns for Topical Map Construction" defined in the Holistic SEO framework specifications. Currently, several columns in the export are empty.

## 1. Gap Analysis & Solution Strategy

We need to bridge the gap between the stored data model and the required export columns.

### A. Node Identity Gaps (Topic Level)
*   **Missing:** `Attribute (Subtopic)`, `Query Type`, `Topical Borders Note`, `Publication Date`.
*   **Solution:** Upgrade the `enrichTopicMetadata` workflow.
    *   **Prompt Engineering:** Update `ENRICH_TOPIC_METADATA_PROMPT` to explicitly extract the "Specific Attribute" (e.g., "Pricing") and "Query Type" (e.g., "Comparative") from the title.
    *   **Logic:** Implement a "Momentum Calculator" in the service layer to auto-assign `Publication Date` based on a starting date + frequency, rather than asking AI to guess dates.

### B. Content Structure Gaps (Brief Level)
*   **Missing:** `Contextual Vector (Outline)`, `Article Methodology`, `Subordinate Text Hint`, `Image Alt Text`, `Perspective Requirement`.
*   **Solution:** These exist in the `ContentBrief` schema but are often nested or optional.
    *   **Extraction Logic:** Update `utils/exportUtils.ts` to flattening complex objects.
        *   `Contextual Vector`: Convert Markdown Outline -> Arrow-flow string (`H2: Intro > H2: Benefits`).
        *   `Subordinate Text Hint`: Join hints from `structured_outline`.
        *   `Article Methodology`: Fallback to `responseCode` if `methodology_note` is empty.

### C. Interlinking Gaps
*   **Missing:** `Interlinking Strategy`, `Anchor Text`, `Annotation Text Hints`.
*   **Solution:**
    *   **Extraction Logic:** Iterate through `brief.contextualBridge` links.
    *   **Formatting:** Format as a rich string: `[Anchor] -> Target (Hint: ...)`.

---

## 2. Implementation Roadmap

### Step 1: Upgrade Enrichment Prompt (`config/prompts.ts`)
Modify `ENRICH_TOPIC_METADATA_PROMPT` to require:
1.  `attribute_focus`: The specific sub-facet (e.g., 'Cost', 'History').
2.  `query_type`: The functional intent (e.g., 'Definition', 'Comparison').
3.  `topical_border_note`: A definition of what this topic covers vs. its neighbors.

### Step 2: Upgrade Enrichment Service (`services/ai/mapGeneration.ts`)
Update `enrichTopicMetadata` to:
1.  Process the new fields from the AI response.
2.  **Momentum Logic:** Assign `planned_publication_date` sequentially starting from "Next Monday", spacing topics by 3 days (configurable default).

### Step 3: Upgrade Parsers (`utils/parsers.ts`)
Ensure `sanitizeTopicFromDb` extracts and stores these new fields in the `metadata` JSONB column.

### Step 4: Upgrade Export Utility (`utils/exportUtils.ts`)
Rewrite the mapping logic to strictly follow the column requirements.
*   **Vector Flattening:** Create a helper to turn the outline into a logical flow string.
*   **Fallback Chaining:** If `Image Alt` is missing, generate a placeholder based on `Title + Central Entity`.

## 3. Verification
1.  Run "Enrich Data" on a map.
2.  Check `TopicDetailPanel` (update UI to show new fields).
3.  Run "Export Data".
4.  Verify all columns are populated.
