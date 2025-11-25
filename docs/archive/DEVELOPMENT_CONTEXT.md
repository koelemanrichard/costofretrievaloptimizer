# Development Context & State

## Purpose

This document is my persistent "memory" for this project. It is my single source of truth to combat context amnesia and ensure all development work is aligned with our strategic goals.

## Strategic Vision

Our goal is to build the "Holistic SEO Workbench," a comprehensive platform based on Koray Tuğberk GÜBÜR's framework. The core philosophy is **"AI-first, user-in-control,"** supported by a flexible, robust architecture. The full strategy is detailed in `HOLISTIC_PLAN.md`.

## Current Status of the Application

### Completed Work:

1.  **Phase 1: Foundational Architectural Shift (✅ Complete)**
    *   The database has been successfully migrated to a relational schema using Supabase PostgreSQL.
    *   The setup script (`SUPABASE_SETUP_GUIDE.md`) is now fully idempotent and robust, using `uuid` for all IDs.
    *   The application correctly connects to this new database schema.

2.  **Phase 2: Reinventing the User Experience (✅ Complete)**
    *   The application's entry point is now the `ProjectSelectionScreen`, which correctly fetches and displays a list of existing projects from the database.
    *   Users can create a new project, which is persisted to the database.
    *   Loading an existing project correctly takes the user to the `ProjectWorkspace`.
    *   The `ProjectWorkspace` correctly displays a list of all topical maps associated with the loaded project.
    *   The "New Map" workflow can be initiated from the workspace. This flow includes wizards for Business Info, SEO Pillars, EAVs (Semantic Triples), and Competitors.
    *   **Crucially, every step of this wizard now correctly and incrementally saves its data to the specific topical map record in the database.**

### The Immediate Next Step (The Current Task):

The application is currently paused at the final step of the "New Map" wizard. The `handleCompetitorsFinalized` function in `App.tsx` correctly saves the list of competitors, but it **does not yet trigger the AI to generate the topical map itself.**

The next set of tasks, as detailed in `REFACTORING_TASK_LIST.md`, is to:
1.  Implement the AI call to the `generateInitialTopicalMap` service.
2.  Use all the saved strategic data (pillars, EAVs, etc.) as context for the AI.
3.  Save the AI-generated topics to the database.
4.  Transition the user to the `PROJECT_DASHBOARD` to view their newly created map.