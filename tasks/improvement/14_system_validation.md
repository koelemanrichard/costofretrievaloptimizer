
# Improvement Task 14: System Validation & Quality Assurance

**Status:** [x] Completed
**Priority:** MEDIUM
**Objective:** Perform a full end-to-end test of the "Holistic SEO Upgrade" to ensure data flows correctly from Generation -> Storage -> UI -> Export, and catch any systematic regressions.

## 1. Workflow Tests

### Test A: The "Fresh Start" Flow
1.  Create a **New Map**.
2.  Run through the entire Wizard (Pillars -> EAV -> Competitors -> Generate).
3.  **Check:** Do the generated topics have `topic_class` assigned (Monetization vs Informational)?
4.  **Check:** Do they have `canonical_query` populated in the database?

### Test B: The "Backfill" Flow
1.  Load an **Old Map** (simulate by manually removing metadata from a topic in DB or using an existing old project).
2.  Go to the Dashboard.
3.  **Check:** "Data Gaps Detected" alert should be visible in `StrategicContextPanel`.
4.  Click **"Enrich Data"**.
5.  **Check:** Progress indicator works.
6.  **Check:** After completion, open `TopicDetailPanel`. `Query Network` should now be populated.

### Test C: The "Export" Flow
1.  Click **"Export Data"** -> Excel.
2.  Open the file.
3.  **Verify Columns:**
    *   `Canonical Query` (Not empty)
    *   `Target Query Network` (Comma-separated list)
    *   `Subordinate Text Hint` (Should be text, not `[object Object]`)
    *   `Annotation Text Hints` (Should be text)

## 2. Edge Case & Error Testing

### Test D: AI Hallucination Resilience
1.  **Simulation:** Manually corrupt a `query_network` in the database to be a string instead of an array.
2.  **Check:** Open `TopicDetailPanel`. The app should **not crash**. The parser should handle it (display single item or empty).

### Test E: Brief Generation Stability
1.  Generate a brief for a topic.
2.  **Check:** Verify the `structured_outline` is saved correctly to Supabase.
3.  Reload the page.
4.  Open the brief. Verify hints are still visible.

## 3. Deliverable
*   Create a report `docs/reports/HOLISTIC_UPGRADE_VALIDATION.md` summarizing the test results and any bugs fixed during this phase.
