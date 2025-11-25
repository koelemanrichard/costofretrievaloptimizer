

# Task: Implement Auto-Generation in Wizard

**Priority:** CRITICAL
**Target File:** `components/ProjectWorkspace.tsx`

## 1. Objective
Update the `handleFinalizeCompetitors` function to generate and save the initial topical map before redirecting the user to the dashboard.

## 2. Implementation Details

### Dependencies
- Import `aiService` from `../services/aiService`.
- Import `v4 as uuidv4` from `uuid`.
- Import `slugify` from `../utils/helpers`.
- Import `sanitizeTopicFromDb` from `../utils/parsers`.
- Import `EnrichedTopic` type.

### Logic (in `handleFinalizeCompetitors`)
1.  **Keep existing:** Saving competitors to `topical_maps`.
2.  **Add Generation:**
    ```typescript
    const { coreTopics, outerTopics } = await aiService.generateInitialTopicalMap(
        effectiveBusinessInfo, // Ensure this includes global API keys
        currentMap.pillars,
        currentMap.eavs,
        competitors,
        dispatch
    );
    ```
3.  **Data Transformation:**
    *   Iterate `coreTopics`: Assign new UUIDs. Create slugs.
    *   Iterate `outerTopics`: Match `parent_topic_id` (which is currently a temp ID like "core_1") to the *newly generated UUID* of the parent. Create slugs (`parent-slug/child-slug`).
4.  **Persistence:**
    *   Combine all topics.
    *   `supabase.from('topics').insert(allTopics)`.
5.  **State Update:**
    *   Dispatch `SET_TOPICS_FOR_MAP`.
6.  **Redirect:**
    *   `dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_DASHBOARD })`.

## 3. Verification
-   Create a *new* map.
-   Complete the wizard.
-   Verify that upon reaching the dashboard, topics are visible.

**Status:** [x] Completed
