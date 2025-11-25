# Refactoring Plan: Reducing Complexity to Fix React Error #31

**Date:** Current
**Status:** Pending Approval
**Objective:** Deconstruct "God Components" into manageable, testable units to eliminate Context Amnesia and permanently enforce data sanitization.

## 1. The Core Problem: Complexity Hides Bugs

The persistent "Minified React error #31" (Objects as React Children) is a data integrity issue. Despite previous patches, the error returns because the logic to fetch and sanitize data is duplicated, scattered, or buried inside massive component files.

**Key Finding:**
In `components/ProjectDashboardContainer.tsx`, the `sanitizeBriefFromDb` function is defined *inside* the component. This is an anti-pattern for stability. It means other parts of the app (like `App.tsx` or `BatchProcessor`) cannot reuse this exact logic, leading to inconsistent data states.

## 2. Files Flagged for Refactoring

I have identified the following files as "High Risk" due to size and cyclomatic complexity:

| File | Lines | Responsibilities (Too Many) | Risk Level |
| :--- | :---: | :--- | :---: |
| `components/ProjectDashboardContainer.tsx` | ~400+ | Data Fetching, State Sync, AI Callbacks, **Local Sanitization Logic**, Modal State Mgmt | **CRITICAL** |
| `components/ProjectDashboard.tsx` | ~250+ | Layout, rendering 15+ Modals, prop-drilling 30+ handlers | **HIGH** |
| `services/geminiService.ts` | ~300+ | API Config, Prompts, **Schema Definitions**, Response Parsing | **MEDIUM** |
| `config/prompts.ts` | ~300+ | Huge template strings. Consumes context window rapidly. | **MEDIUM** |

---

## 3. Detailed Refactoring Tasks

### Task A: Dismantle `ProjectDashboardContainer.tsx` (The Root Cause)

This component is the bottleneck. We will extract logic into **Custom Hooks** and **Shared Utilities**.

1.  **Move Sanitization Logic Global:**
    *   **Action:** Move `sanitizeBriefFromDb` and `sanitizeTopicFromDb` out of this file and into `utils/parsers.ts`.
    *   **Benefit:** Ensures `App.tsx`, `BatchProcessor`, and `Dashboard` use the *exact same code* to clean data. No more "it works here but crashes there."

2.  **Create `hooks/useMapData.ts`:**
    *   **Responsibility:** Encapsulate the `useEffect` that fetches topics and briefs.
    *   **Logic:** It handles the Supabase query, runs the data through `utils/parsers.ts`, and dispatches to the store.
    *   **Benefit:** The Container becomes cleaner: `useMapData(activeMapId, dispatch);`.

3.  **Create `hooks/useKnowledgeGraph.ts`:**
    *   **Responsibility:** Encapsulate the complex "Hydration" logic (converting DB JSON -> Class Instance).
    *   **Benefit:** Removes ~50 lines of fragile logic from the UI component.

### Task B: Simplify `ProjectDashboard.tsx`

This component passes too many props, making it hard to see which data is actually being used (and potentially crashing).

1.  **Componentize Sections:**
    *   Extract the "Workbench" card into `components/dashboard/WorkbenchPanel.tsx`.
    *   Extract the "Advanced Tools" card into `components/dashboard/AnalysisToolsPanel.tsx`.
2.  **Slot Pattern for Modals:**
    *   Instead of importing 15 modals, group them into a `DashboardModals` wrapper component.

### Task C: Modularize `geminiService.ts`

1.  **Extract Schemas:** Move `CONTENT_BRIEF_SCHEMA` and fallback objects to `config/schemas.ts`.
2.  **Isolate Types:** Ensure strict typing imports are clean.

---

## 4. The Path to Fixing "Error #31"

This refactoring is not just aesthetic. It is the mechanism to solve the crash:

1.  **Step 1:** We move `sanitizeBriefFromDb` to `utils/parsers.ts`.
2.  **Step 2:** We update `utils/parsers.ts` to be **aggressive**. (e.g., if `keyTakeaways` contains an object, we JSON.stringify it immediately. We never let an object slip through as "unknown").
3.  **Step 3:** We update `App.tsx`, `ProjectDashboardContainer`, and `BatchProcessor` to ALL import this single `parse` function.
4.  **Result:** It becomes mathematically impossible for "bad data" to exist in the Redux state, because the *only* door in is guarded by the strict parser.

## 5. Execution Order

1.  **Refactor Utils:** Move sanitization logic to `utils/parsers.ts`.
2.  **Refactor Hooks:** Create `useMapData` and `useKnowledgeGraph`.
3.  **Clean Container:** Implement hooks in `ProjectDashboardContainer`.
4.  **Verify:** Run the app. The crash should be gone because the data layer is finally unified.
