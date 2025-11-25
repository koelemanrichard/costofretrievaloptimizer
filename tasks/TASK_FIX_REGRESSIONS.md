# Task: Fix Critical Regressions (Generate Brief & UI)

**Objective:** Holistically resolve the regressions reported by the user, including the non-functional "Generate Brief" button and broken UI elements in the `TopicItem` component. This plan is to be executed according to the newly updated `UI_SPECIFICATION.md`.

## 1. Root Cause Analysis

- **Primary Bug:** The logic in `ProjectDashboard.tsx`'s `handleSelectTopicForBrief` function is flawed. It checks the `canGenerateBriefs` prerequisite universally, blocking users from *viewing* existing briefs if the conditions for *generating* new ones aren't met. This is the source of the error message.
- **UI Bug 1 (Brief Icon):** The user is correct; the visual state for the brief icon (pencil vs. green eye) is not functioning as intended because the parent button's state logic is overly complex and likely interfering.
- **UI Bug 2 (Slug Edit Icon):** The "unavailable" edit slug icon on core topics is a styling regression. The hover-reveal mechanism (`group-hover`) is likely being disrupted by other class changes.

## 2. Task Plan

1.  **Correct the Core Logic in `ProjectDashboard.tsx`.**
    *   **File:** `components/ProjectDashboard.tsx`
    *   **Function:** `handleSelectTopicForBrief`
    *   **Change:** Modify the prerequisite check to be more specific.
        *   **Old Logic:** `if (!canGenerateBriefs) { showError }`
        *   **New Logic:** `if (!briefs[topic.id] && !canGenerateBriefs) { showError }`
    *   **Reasoning:** This new logic correctly translates to: "If the brief does NOT exist AND you are NOT allowed to generate one, THEN show the error." It will now correctly allow viewing of existing briefs regardless of the `canGenerateBriefs` state.

2.  **Refactor `TopicItem.tsx` to Match the UI Specification.**
    *   **File:** `components/TopicItem.tsx`
    *   **Task 1 (Brief Button):** Overhaul the "Generate/View Brief" button to be a single, stateful component.
        *   The `disabled` attribute must be: `disabled={!hasBrief && !canGenerateBriefs}`.
        *   The `title` attribute must be dynamic based on the `hasBrief` and `canGenerateBriefs` props.
        *   The icon displayed inside the button must conditionally render either the "pencil" SVG or the "green eye" SVG based on the `hasBrief` prop.
    *   **Task 2 (Slug Edit):** Verify and restore the hover-reveal functionality for the slug's edit button.
        *   Ensure the top-level `div` has the `group` class.
        *   Ensure the edit button `svg` has the `opacity-0 group-hover:opacity-100` classes and that no other styles are interfering.

## 3. Validation (Test-Driven Development Steps)

-   **Test Case 1 (Viewing Existing Brief - No Prerequisites):**
    *   **Given:** A map where a topic has an existing brief, but the user has NOT run "Analyze Domain".
    *   **When:** The user clicks the **green eye icon** on that topic.
    *   **Then:** The `ContentBriefModal` must open successfully without any error message.

-   **Test Case 2 (Generating New Brief - No Prerequisites):**
    *   **Given:** A map where a topic has NO brief, and the user has NOT run "Analyze Domain".
    *   **When:** The user hovers the brief icon.
    *   **Then:** The icon must be disabled, and the tooltip must read "Define SEO Pillars and run 'Analyze Domain' to enable.". Clicking it should do nothing.

-   **Test Case 3 (Generating New Brief - Prerequisites Met):**
    *   **Given:** A map with defined pillars and an analyzed domain. A topic has NO brief.
    *   **When:** The user clicks the **pencil icon**.
    *   **Then:** The `ResponseCodeSelectionModal` must open successfully.

-   **Test Case 4 (Slug Edit UI):**
    *   **Given:** The `ProjectDashboard` is open.
    *   **When:** The user hovers their mouse over a **Core Topic**.
    *   **Then:** The small pencil icon to edit the slug must appear next to the slug text.
    *   **When:** The user hovers their mouse over an **Outer Topic**.
    *   **Then:** The pencil icon for the slug must **NOT** appear.