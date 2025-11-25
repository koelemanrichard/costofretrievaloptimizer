# Task: Fix "Generate Brief" Button Silent Failure

**Objective:** Resolve the bug where clicking the "Generate Brief" button in the `ResponseCodeSelectionModal` does nothing if prerequisites are not met, and provide clear user feedback.

## 1. Root Cause Analysis

- **File:** `components/ProjectDashboardContainer.tsx`
- **Function:** `handleGenerateBrief`
- **Finding:** The function contains a guard clause: `if (!activeBriefTopic || !activeMap || !activeMap.pillars || !knowledgeGraph || !user) return;`. If the map's `pillars` are not defined or the session's `knowledgeGraph` has not been generated (by clicking "Analyze Domain"), this function exits silently.
- **User Impact:** The user clicks the button, the modal closes, and nothing happens, leading to confusion. There is no feedback explaining *why* the action failed.

## 2. Task Plan

1.  **Implement a Prerequisite Check in `ProjectDashboardContainer.tsx`.**
    *   **File:** `components/ProjectDashboardContainer.tsx`
    *   **Task:** Create a `useMemo` hook to calculate a `canGenerateBriefs` boolean. This will be `true` only if `activeMap.pillars` and `state.knowledgeGraph` both exist.

2.  **Propagate the Prerequisite State to the UI.**
    *   **File:** `components/ProjectDashboardContainer.tsx` -> `components/ProjectDashboard.tsx` -> `components/TopicalMapDisplay.tsx` -> `components/TopicItem.tsx`
    *   **Task:** Pass the new `canGenerateBriefs` boolean as a prop through the component hierarchy.

3.  **Update the UI in `TopicItem.tsx` to Reflect State.**
    *   **File:** `components/TopicItem.tsx`
    *   **Task 1:** Find the `button` element responsible for generating a brief.
    *   **Task 2:** Add a `disabled` attribute to the button. The logic should be: `disabled={!hasBrief && !canGenerateBriefs}`. This ensures the button is only disabled when trying to *generate* a new brief without prerequisites; viewing an *existing* brief is always allowed.
    *   **Task 3:** Add a `title` attribute to the button to provide contextual help on hover. It should dynamically change to "View Content Brief", "Generate Content Brief", or "Define SEO Pillars and run 'Analyze Domain' to enable." based on the state.

4.  **Update UI Specification Document.**
    *   **File:** `UI_SPECIFICATION.md`
    *   **Task:** Add a new section for the `ResponseCodeSelectionModal` to formally document its behavior and states. Also, update the `TopicItem` specification to include the new disabled state for the "Generate Brief" action.

## 3. Validation (Test-Driven Development Steps)

-   **Test Case 1 (Pillars Missing):**
    *   **Given:** A user loads a map that has topics but no defined SEO Pillars.
    *   **When:** The user hovers over the "Generate Brief" icon on a topic without a brief.
    *   **Then:** The icon must be visually disabled, and a tooltip must appear with the text "Define SEO Pillars and run 'Analyze Domain' to enable.".

-   **Test Case 2 (Knowledge Graph Missing):**
    *   **Given:** A user loads a map with defined SEO Pillars but has NOT yet clicked "Analyze Domain".
    *   **When:** The user hovers over the "Generate Brief" icon.
    *   **Then:** The same outcome as Test Case 1 must occur.

-   **Test Case 3 (Prerequisites Met):**
    *   **Given:** A user has a map with defined Pillars AND has run "Analyze Domain".
    *   **When:** The user clicks the "Generate Brief" icon.
    *   **Then:** The `ResponseCodeSelectionModal` must open successfully, and the button should not be disabled.

-   **Test Case 4 (Brief Already Exists):**
    *   **Given:** A user loads a map where a topic already has a brief, but the prerequisites (pillars, kg) for generating new briefs are NOT met.
    *   **When:** The user hovers over and clicks the icon (now a "view" icon) for that topic.
    *   **Then:** The button must NOT be disabled, the tooltip must say "View Content Brief", and clicking it must successfully open the `ContentBriefModal`.