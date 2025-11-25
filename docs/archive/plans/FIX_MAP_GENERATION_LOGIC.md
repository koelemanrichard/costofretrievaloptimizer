# Plan: Fix Topical Map Generation Logic

**Status:** Active
**Priority:** CRITICAL
**Objective:** Ensure that finishing the "Competitor Refinement" wizard automatically triggers the AI to generate the initial topic structure. Also, provide a manual "Generate Map" button on the dashboard for projects that are stuck in the "configured but empty" state.

## 1. Root Cause Analysis
The `handleFinalizeCompetitors` function in `components/ProjectWorkspace.tsx` currently performs the following actions:
1.  Updates the local state with competitors.
2.  Updates the `topical_maps` table in Supabase with the wizard data.
3.  **MISSING:** Calls `aiService.generateInitialTopicalMap`.
4.  **MISSING:** Saves the generated topics to the `topics` table.
5.  Redirects to `AppStep.PROJECT_DASHBOARD`.

Result: The user arrives at the dashboard with Pillars and Competitors saved, but zero Topics.

## 2. Remediation Strategy

### Phase 1: Fix the Wizard (The Auto-Pilot Fix)
We must modify `ProjectWorkspace.tsx` to chain the generation logic before the redirect.

**Logic Flow:**
1.  Save Competitors to DB (Existing).
2.  **NEW:** Set Loading State (`map: true`).
3.  **NEW:** Call `aiService.generateInitialTopicalMap(businessInfo, pillars, eavs, competitors)`.
4.  **NEW:** Process the AI response:
    *   Assign UUIDs to Core Topics.
    *   Assign UUIDs to Outer Topics and map their `parent_topic_id` correctly.
    *   Generate Slugs.
5.  **NEW:** Bulk insert these topics into Supabase.
6.  **NEW:** Dispatch `SET_TOPICS_FOR_MAP`.
7.  Redirect to Dashboard.

### Phase 2: Fix the Dashboard (The Recovery Fix)
For users (like you) who are already stuck on the dashboard with an empty map, we need a button to trigger this process manually.

**Logic Flow:**
1.  Update `ProjectDashboardContainer.tsx`:
    *   Create a new handler `handleGenerateInitialMap`.
    *   It will reuse the logic defined above (call AI -> Save Topics -> Update State).
2.  Update `ProjectDashboard.tsx` & `TopicalMapDisplay.tsx`:
    *   Pass this handler down.
    *   In `TopicalMapDisplay`, checks if `topics.length === 0` AND `pillars` exist.
    *   If true, render a large CTA button: "Generate Topical Map Structure".

## 3. Task Breakdown

*   **Task 01:** Implement Auto-Generation in `ProjectWorkspace.tsx`.
*   **Task 02:** Implement Manual Trigger in `ProjectDashboardContainer.tsx` and UI.
