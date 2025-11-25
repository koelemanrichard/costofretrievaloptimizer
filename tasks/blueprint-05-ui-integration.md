
# Task 05: UI Integration & Hook Expansion

**Priority:** HIGH
**Status:** Completed
**Objective:** Expose the "Generate Blueprints" feature to the user via the Dashboard.

## 1. Update `hooks/useTopicEnrichment.ts`
*   **New Handler:** `handleGenerateBlueprints`.
*   **Logic:**
    1.  Filter topics where `metadata.blueprint` is missing.
    2.  Batch them (chunk size ~5).
    3.  Call `aiService.generateTopicBlueprints`.
    4.  Update Supabase `topics` table (merge new blueprint into metadata).
    5.  Dispatch `UPDATE_TOPIC` to update local state.

## 2. Update `components/dashboard/StrategicContextPanel.tsx`
*   **New Props:** `onGenerateBlueprints`, `isGeneratingBlueprints`, `missingBlueprintsCount`.
*   **UI:** Add a new button (or a split button with "Enrich Data") specifically for "Generate Blueprints".
*   **Feedback:** Show how many topics need blueprints.

## 3. Update `ProjectDashboardContainer.tsx`
*   Connect the new hook functions to the dashboard props.

## 4. Verification
*   Load a map.
*   Click "Generate Blueprints".
*   Verify progress spinner.
*   Verify database updates (inspect Network tab or DB).
