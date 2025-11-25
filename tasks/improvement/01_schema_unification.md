
# Improvement Task 01: Unified Schema Upgrade

**Status:** [x] Completed
**Priority:** CRITICAL
**Objective:** Update the application's data structures to support the new concepts defined in the Holistic SEO framework (Parts 1-5). This effectively "upgrades the DNA" of the application before we build the new features.

## 1. Conceptual Changes
We are moving from a simple parent/child hierarchy to a **Section-Based Model** with advanced metadata for quality control.

## 2. Files to Modify

### A. `types.ts`
Update the following interfaces:

1.  **`EnrichedTopic`**:
    *   `topic_class`: `'monetization'` (Core Section) | `'informational'` (Author Section).
    *   `cluster_role`: `'pillar'` | `'cluster_content'`.
    *   `attribute_focus`: `'unique'` | `'root'` | `'rare'`.
    *   `canonical_query`: `string` (The primary intent cluster this topic targets).
    *   `decay_score`: `number` (0-100, for maintenance).

2.  **`SEOPillars`**:
    *   `primary_verb`: `string` (e.g., "Buy", "Hire").
    *   `auxiliary_verb`: `string` (e.g., "Learn", "Compare").

3.  **`ContentBrief`**:
    *   `structural_template_hash`: `string` (For symmetry checks).
    *   `contextualBridge`: Change from array to object or enhanced array:
        ```typescript
        interface ContextualBridgeSection {
             type: 'section';
             content: string; // The transition paragraph
             links: ContextualBridgeLink[];
        }
        ```

4.  **`BusinessInfo`**:
    *   `uniqueDataAssets`: `string` (For Authority Proof).
    *   `authorName`: `string`.
    *   `authorBio`: `string`.

### B. `database.types.ts`
*   Reflect these changes in the `Json` column definitions for `topical_maps` (pillars, business_info) and `topics` (new columns) and `content_briefs`.
*   **Migration Note:** Since Supabase uses `jsonb` for `business_info` and `pillars`, strictly typed interfaces in `types.ts` are the primary enforcement mechanism. However, `topics` table might need explicit columns if we want to query by them efficiently, OR we can store these new fields in a `metadata` JSONB column in the `topics` table to avoid a heavy migration.
*   **Decision:** Add a `metadata` JSONB column to the `topics` table to store `topic_class`, `cluster_role`, etc., without altering the core schema too aggressively.

### C. `utils/parsers.ts`
*   Update `sanitizeTopicFromDb` to extract `topic_class` etc. from the `metadata` column (or defaults).
*   Update `parseBusinessInfo` to handle the new author/asset fields.
*   Update `sanitizeBriefFromDb` to handle the new complex `contextualBridge`.

## 3. Execution Steps
1.  Create a SQL migration file `docs/migrations/05_holistic_schema.txt` to add `metadata` column to `topics`.
2.  Update `types.ts`.
3.  Update `database.types.ts`.
4.  Update `utils/parsers.ts`.
5.  Verify the app compiles.

## 4. Validation
*   Manually inspect the `types.ts` file to ensure all new fields are present.
*   Ensure existing parsers default to safe values (e.g., `topic_class` defaults to `'informational'` if missing) so existing maps don't break.
