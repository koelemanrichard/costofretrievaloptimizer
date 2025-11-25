# Holistic Plan: Refactor Brief Generation for Stability and Debuggability

**Objective:** Address the root cause of the recurring "Minified React error #31" crash by refactoring the `onGenerateBrief` workflow. The current implementation is a monolithic, tightly-coupled process that is difficult to debug and prone to state corruption.

**Guiding Principle:** Decouple complex, asynchronous operations from direct mutations of critical application state. Introduce clear, isolated stages for generation, review, and commitment of data.

---

### Phase 1: Analysis & Planning

1.  **Root Cause Analysis:**
    *   **Problem:** The current `onGenerateBrief` handler is a single, complex transaction that performs an AI call, sanitizes the data, and immediately dispatches an `ADD_BRIEF` action to mutate the core `topicalMaps` state.
    *   **Failure Mode:** If the `AIResponseSanitizer` fails to catch a subtle data malformation, the invalid data is injected directly into the main state tree.
    *   **Impact:** When the `ProjectDashboard` re-renders with the corrupted `briefs` object, React encounters an invalid data structure (e.g., a string where an object is expected) and throws `React error #31`, crashing the entire component tree. Debugging is difficult because the error source is in the data, but the crash occurs in a complex downstream component.

2.  **The Refactoring Strategy: Introduce a Review & Confirmation Step**
    *   **Decoupling:** The core of the strategy is to separate the *generation* of the brief from the *commitment* of the brief to the main state.
    *   **Isolate AI Output:** Create a new, temporary state slice (`briefGenerationResult: ContentBrief | null`) to serve as a holding area for the AI's raw, sanitized output.
    *   **Introduce a Review Modal:** Create a new, simple `BriefReviewModal` component. Its sole responsibility is to display the data from `briefGenerationResult`. If a crash occurs due to malformed data, it will be contained within this simple component, making the root cause immediately obvious.
    *   **Refactor the Workflow:**
        1.  The `onGenerateBrief` handler will now be responsible only for calling the AI and populating the `briefGenerationResult` state.
        2.  Upon success, it will open the `BriefReviewModal`.
        3.  The user can then review the generated content.
        4.  The final "Save to Map" action within the modal will trigger the `ADD_BRIEF` action, which is now a simple, synchronous state update.

3.  **Create a New Test Plan.**
    *   **File:** `HOLISTIC_TEST_PLAN_REFACTOR_BRIEF_GENERATION.md`
    *   **Task:** Define a test plan that validates the new workflow.
        *   **Test Case 1:** The "Generate Brief" action now leads to the `BriefReviewModal`.
        *   **Test Case 2:** Clicking "Save to Map" correctly updates the main `topicalMap` state and closes the modal.
        *   **Test Case 3:** A simulated crash would be contained within the review modal and not affect the main dashboard.

---

### Phase 2: Implementation

1.  **Update `state/appState.ts`:**
    *   **Task:** Add the new `briefGenerationResult` property to the `AppState` and the corresponding actions/reducers.
2.  **Create `components/BriefReviewModal.tsx`:**
    *   **Task:** Build the new component as specified.
3.  **Refactor `ProjectDashboardContainer.tsx`:**
    *   **Task:** Modify the `onGenerateBrief` handler to implement the new, decoupled logic.
4.  **Integrate the Modal in `ProjectDashboard.tsx`:**
    *   **Task:** Render the new `BriefReviewModal` and connect it to the global state.
5.  **Execute the Test Plan.**
    *   **Task:** Run through all scenarios defined in the new test plan to validate the refactoring.

---

### Expected Outcome

The application will be fundamentally more stable. The brief generation process will be resilient to AI data errors, as any issues will be isolated before they can corrupt the main application state. This refactoring fixes the immediate bug while also improving the long-term health and maintainability of the codebase.