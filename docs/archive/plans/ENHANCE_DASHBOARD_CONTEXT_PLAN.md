
# Plan: Enhance Dashboard Strategy & Context

**Status:** Draft
**Priority:** HIGH
**Objective:** Empower users to view and edit the strategic "background" data (EAVs, Competitors) directly from the Dashboard and provide a way to re-generate the map structure based on updated settings.

## 1. UX Design: The "Strategic Context Panel"

We will replace the current `PillarsDisplay.tsx` with a more robust `StrategicContextPanel.tsx`.

### Layout & Features
1.  **SEO Pillars Section (Visible):** Keeps the core pillars (Entity, Context, Intent) visible as they are the primary reference.
2.  **Context Management Buttons:**
    *   **"Manage EAVs"**: Opens a modal to view, add, edit, or delete Semantic Triples.
    *   **"Manage Competitors"**: Opens a modal to view, add, or remove Competitors.
3.  **Map Actions (The "Danger Zone"):**
    *   **"Regenerate Map Structure"**: A button that triggers the AI generation process again.
    *   *Logic:* If topics already exist, it asks for confirmation: "This will delete all existing topics and briefs. Are you sure?"

## 2. New Components

### A. `components/dashboard/StrategicContextPanel.tsx`
*   **Role:** Replaces `PillarsDisplay`.
*   **Props:** `pillars`, `eavsCount`, `competitorsCount`, `onEditPillars`, `onManageEavs`, `onManageCompetitors`, `onRegenerateMap`, `isRegenerating`.
*   **UI:** Card layout. Top section: Pillars. Bottom bar: Action buttons.

### B. `components/EavManagerModal.tsx`
*   **Role:** Full CRUD for Semantic Triples.
*   **Features:**
    *   List existing EAVs.
    *   Form to add a new manual EAV (Subject, Predicate, Object).
    *   "Expand with AI" button (reuses existing service).
    *   Save changes to DB (`topical_maps` table).

### C. `components/CompetitorManagerModal.tsx`
*   **Role:** Manage the competitor list.
*   **Features:**
    *   List URLs.
    *   Input to add new URL.
    *   Remove button.
    *   Save changes to DB.

## 3. Logic Updates (`ProjectDashboardContainer.tsx`)

### A. Handlers
1.  `handleUpdateEavs(newEavs: SemanticTriple[])`: Updates local state and Supabase.
2.  `handleUpdateCompetitors(newCompetitors: string[])`: Updates local state and Supabase.
3.  `handleRegenerateMap()`:
    *   **Check:** If map has topics, show `ConfirmationModal`.
    *   **Action:**
        1.  Call `supabase.from('topics').delete().eq('map_id', activeMapId)`.
        2.  Call `aiService.generateInitialTopicalMap(...)` (reusing the logic from `fix-map-gen` tasks).
        3.  Save new topics.
        4.  Update state.

## 4. Implementation Task List

1.  **Task 01:** Create `EavManagerModal` and `CompetitorManagerModal`.
2.  **Task 02:** Create `StrategicContextPanel` and integrate it into `ProjectDashboard`.
3.  **Task 03:** Implement the `handleRegenerateMap` logic (including the destructive delete step) in `ProjectDashboardContainer`.
4.  **Task 04:** Wire everything together in `ProjectDashboardContainer` and pass down props.
