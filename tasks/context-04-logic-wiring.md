
# Task: Logic Integration & Regeneration

**Status:** [x] Completed
**Priority:** CRITICAL
**Target File:** `components/ProjectDashboardContainer.tsx`

## 1. Objective
Implement the logic to save EAV/Competitor changes to the database and handle the destructive "Regenerate Map" action.

## 2. Implementation Steps

### Step 1: Update Handlers
**File:** `components/ProjectDashboardContainer.tsx`

1.  **`handleUpdateCompetitors(newCompetitors: string[])`:**
    -   Call `supabase.from('topical_maps').update({ competitors: ... })`.
    -   Dispatch `SET_COMPETITORS`.
2.  **`handleUpdateEavs(newEavs: SemanticTriple[])`:**
    -   Call `supabase.from('topical_maps').update({ eavs: ... })`.
    -   Dispatch `SET_EAVS`.
    -   **Crucial:** Re-hydrate Knowledge Graph (`dispatch({ type: 'SET_KNOWLEDGE_GRAPH', payload: null })` or trigger rebuild).

### Step 2: Implement Regeneration Logic
**Refactor:** Rename/Upgrade `handleGenerateInitialMap` (from previous fix) to `handleRegenerateMap`.
-   **Check:** If topics exist, delete them first: `supabase.from('topics').delete().eq('map_id', activeMapId)`.
-   **Generate:** Call `aiService.generateInitialTopicalMap`.
-   **Save:** Insert new topics.
-   **Update State:** Dispatch `SET_TOPICS_FOR_MAP`.

### Step 3: Pass Handlers
-   Pass these new handlers to `<ProjectDashboard />`.

## 3. Verification
1.  **Edit Context:** Open Competitor Manager, add a URL, save. Reload page. Verify URL persists.
2.  **Regenerate:** Click "Regenerate Map". Confirm warning. Verify old topics are gone and new ones appear.
