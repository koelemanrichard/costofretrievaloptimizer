
# Improvement Task 12: Data Backfill & Enrichment Workflow

**Status:** [x] Completed
**Priority:** MEDIUM
**Objective:** The new columns (Canonical Query, Query Network, Hints) will be empty for existing maps. We need a non-destructive "Enrichment" process to fill these gaps without deleting the topics.

## 1. Logic Implementation
**File:** `services/ai/mapGeneration.ts`

*   **New Function:** `enrichTopicMetadata(topics, businessInfo)`.
*   **Process:**
    1.  Identify topics with missing `canonical_query`, `query_network`, or `url_slug_hint`.
    2.  Batch them (e.g., 5 at a time) to send to the AI.
    3.  **Prompt:** "Analyze these topic titles. For each, identify:
        *   'Canonical Query' (User Intent)
        *   'Query Network' (3-5 related terms)
        *   'URL Hint' (Max 3 words)"
    4.  **Update:** Write the results back to the `metadata` column in Supabase `topics` table.

**File:** `services/ai/briefGeneration.ts`

*   **New Function:** `retroactiveBriefEnhancement(briefs)`.
*   **Process:**
    1.  Identify briefs that lack `subordinate_text_hint` or `annotation_text_hint` in their structure.
    2.  Mark them in the UI as "Structure Update Available".

## 2. UI Integration
**File:** `components/dashboard/StrategicContextPanel.tsx`

*   **New Button:** "Enrich Data" (Visible only if gaps are detected).
*   **Interaction:**
    *   Clicking it opens a progress modal ("Analyzing 50 topics for Query Networks...").
    *   Calls the `enrichTopicMetadata` service.
    *   Updates the local state upon completion.

## 3. Verification
1.  Load an "Old" map (created before Schema Upgrade).
2.  Check Export: Columns `Canonical Query` and `Query Network` should be empty.
3.  Click "Enrich Data".
4.  Wait for completion.
5.  Check Export: Columns should now be populated with AI-generated data.
