# Task: Fix Knowledge Graph State Hydration on Map Load

**Objective:** Resolve the persistent "Cannot generate brief" error by ensuring the application's in-memory Knowledge Graph is correctly and automatically rebuilt when a user loads an existing topical map.

## 1. Root Cause Analysis

-   **Symptom:** The user-facing debug panel consistently shows `Knowledge Graph Ready: false` after loading a project, even when the map data contains the necessary semantic triples (`eavs`).
-   **Cause:** The application is failing to "hydrate" the global `knowledgeGraph` state object from the persisted `eavs` data in the loaded `activeMap` object. There is no mechanism that triggers this crucial state reconstruction step.
-   **Impact:** All downstream features that depend on the knowledge graph (brief generation, topic expansion, advanced analysis) fail their prerequisite checks, leading to a critical workflow block.

## 2. Task Plan

1.  **Implement an Automatic Hydration Hook in `ProjectDashboardContainer.tsx`.**
    *   **File:** `components/ProjectDashboardContainer.tsx`
    *   **Task:** Create a new `useEffect` hook that runs whenever the `activeMap` changes.
    *   **Logic:**
        1.  Add detailed logging to the Application Log to trace the entire process.
        2.  **Guard Clause:** If the `activeMap` has no `eavs`, ensure the global `knowledgeGraph` state is `null` (to clear out old data from a previous map) and exit.
        3.  **Guard Clause:** If a `knowledgeGraph` object already exists in the state, exit to prevent unnecessary re-renders.
        4.  **Rebuild Logic:** If `eavs` exist and the `knowledgeGraph` is `null`, create a new `KnowledgeGraph` instance.
        5.  Iterate through the `eavs` array from the `activeMap` and use them to populate the new `KnowledgeGraph` instance with nodes.
        6.  **Dispatch:** Dispatch a `SET_KNOWLEDGE_GRAPH` action with the newly populated graph object to update the global state.
        7.  Wrap the entire process in a `try...catch` block to handle potential data parsing errors gracefully.

## 3. Validation

-   **Test Case 1 (Successful Hydration):**
    *   **Given:** A user has a saved topical map in the database that contains valid `eavs` data.
    *   **When:** The user loads this project and selects the topical map.
    *   **Then (Application Log):** The log must show messages like "Active map has EAVs. Rebuilding knowledge graph..." followed by "KG rebuild complete. Nodes found: X."
    *   **Then (Debug Panel):** The State Debug Panel must now show `Knowledge Graph Ready: true`.
    *   **Then (User Action):** Clicking the "Generate Brief" icon must now successfully open the `ResponseCodeSelectionModal` without an error.

-   **Test Case 2 (No EAVs):**
    *   **Given:** A user loads a map that does *not* have any saved `eavs`.
    *   **When:** The user loads the map.
    *   **Then (Application Log):** The log must show "No EAVs found in the current map. Skipping KG rebuild."
    *   **Then (Debug Panel):** The panel must show `Knowledge Graph Ready: false`.

-   **Test Case 3 (Switching Maps):**
    *   **Given:** A user loads Map A (with EAVs), then navigates back and loads Map B (with no EAVs).
    *   **When:** The user loads Map B.
    *   **Then (Application Log):** The log must show "Clearing existing knowledge graph from previous session."
    *   **Then (Debug Panel):** The panel must correctly update to show `Knowledge Graph Ready: false` for Map B.