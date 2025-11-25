
# Improvement Task 09: Schema Gap Fill (Holistic Data Dimensions)

**Status:** [x] Completed
**Priority:** CRITICAL
**Objective:** Update the application's data structures to support the granular columns identified in the Gap Analysis (Canonical Query, Annotation Hints, Publication Date, etc.).

## 1. Files to Modify

### A. `types.ts`

1.  **Update `EnrichedTopic` (Node Identity & Logistics):**
    *   `canonical_query`: `string` (The representative query).
    *   `query_network`: `string[]` (Cluster of related mid-string queries).
    *   `topical_border_note`: `string` (Notes defining where this topic ends).
    *   `planned_publication_date`: `string` (ISO Date).
    *   `url_slug_hint`: `string` (Specific instructions for URL optimization, e.g., "max 3 words").

2.  **Update `ContentBrief` (Contextual Structure):**
    *   `perspectives`: `string[]` (e.g., "Legal", "Financial").
    *   `methodology_note`: `string` (Specific formatting instructions).

3.  **Update `ContextualBridgeLink` (Interlinking):**
    *   `annotation_text_hint`: `string` (Text surrounding the anchor).

### B. `database.types.ts`
*   Update the `metadata` JSONB column definition in comments/docs to reflect these new fields.
*   We will store `canonical_query`, `query_network`, `topical_border_note`, `planned_publication_date`, and `url_slug_hint` inside the `topics.metadata` JSONB column.
*   We will store `perspectives`, `methodology_note` inside the `content_briefs` table (adding to the JSON structure).

### C. `utils/parsers.ts`
*   Update `sanitizeTopicFromDb` to extract the new metadata fields.
*   Update `sanitizeBriefFromDb` to parse the new brief fields.

## 2. Execution Steps
1.  Modify `types.ts`.
2.  Modify `utils/parsers.ts`.
3.  Verify compilation.

## 3. Verification
*   Code review only (Type check).
