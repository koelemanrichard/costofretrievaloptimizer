# Task Plan: Holistic Fix for "Generate Brief" Crash

**Objective:** Holistically resolve the critical bug where the application crashes when a user tries to generate a content brief. This plan addresses the root cause by refactoring the data flow and implementing robust error handling.

**Guiding Principle:** Eliminate reliance on implicit global state for critical actions. Pass data explicitly as arguments and wrap all external service calls in `try...catch` blocks.

---

### Phase 1: Documentation & Planning

1.  **Update `FAILURE_LOG.md`**
    *   **Task:** Increment the failure count to 23.
    *   **Details:** Document the root cause as a state management race condition (`activeBriefTopic` being null) combined with a lack of exception handling, leading to a component tree crash.
2.  **Create `HOLISTIC_TEST_PLAN.md`**
    *   **Task:** Create the new, comprehensive test plan.
    *   **Details:** Include all previous test cases and add a new top-level section: **"4. Error Handling & Resilience"**. This section must include a test case specifically for an AI service call failure, ensuring the application does not crash and provides clear user feedback.
3.  **Create this file: `HOLISTIC_TASK_PLAN.md`**
    *   **Task:** Document the granular, step-by-step plan for executing the fix.

---

### Phase 2: Refactor Data Flow (Eliminate Race Condition)

1.  **Modify `ProjectDashboard.tsx`**
    *   **File:** `components/ProjectDashboard.tsx`
    *   **Task:** Change how a topic is selected for a brief.
        *   Instead of only dispatching to global state, the `handleSelectTopicForBrief` function will now set a **local state variable** (e.g., `const [topicForBrief, setTopicForBrief] = useState(null)`).
        *   It will still dispatch to open the modal.
    *   **Validation:** The component now manages the "topic in waiting" itself.
2.  **Update `ResponseCodeSelectionModal.tsx` Props**
    *   **File:** `components/ResponseCodeSelectionModal.tsx`
    *   **Task 1:** Modify the component's props interface to accept the `topic` object directly: `topic: EnrichedTopic;`.
    *   **Task 2:** Change the `onGenerate` prop signature to `onGenerate: (topic: EnrichedTopic, responseCode: ResponseCode) => void;`.
    *   **Task 3:** Update the internal `handleSubmit` function to call `props.onGenerate(props.topic, selectedCode)`. It now passes the topic it received straight back up.
    *   **Validation:** The modal is now a "pure" component that receives all necessary data via props.
3.  **Connect the Flow in `ProjectDashboard.tsx`**
    *   **File:** `components/ProjectDashboard.tsx`
    *   **Task:** Update the rendering of the `ResponseCodeSelectionModal`.
        *   Pass the local state variable as the `topic` prop: `<ResponseCodeSelectionModal ... topic={topicForBrief} ... />`.
        *   The modal's `onGenerate` prop should now be connected to a new handler (`handleGenerateBriefFromModal`). This handler will receive both the `topic` and `responseCode` and will then call the `onGenerateBrief` prop passed down from the container, passing both arguments along.
    *   **Validation:** The data flow is now explicit: `TopicItem -> ProjectDashboard (local state) -> ResponseCodeSelectionModal (prop) -> ProjectDashboard (callback) -> ProjectDashboardContainer (prop)`.

---

### Phase 3: Implement Robust Error Handling (Prevent Crashes)

1.  **Modify `ProjectDashboardContainer.tsx`**
    *   **File:** `components/ProjectDashboardContainer.tsx`
    *   **Function:** `onGenerateBrief` (or a new handler with this name).
    *   **Task 1:** This function must now accept both `topic` and `responseCode` as arguments.
    *   **Task 2:** Wrap the entire body of this function, specifically the `aiService.generateContentBrief` call, in a `try...catch` block.
    *   **Task 3:** Inside the `catch (e)` block, dispatch a `SET_ERROR` action with a user-friendly message (`e.message`).
    *   **Validation:** An error from the AI service will now be caught and displayed to the user instead of crashing the application.

---

### Phase 4: Final Validation

1.  **Execute the Full `HOLISTIC_TEST_PLAN.md`.**
    *   **File:** `HOLISTIC_TEST_PLAN.md`
    *   **Task:** Go through every single test case.
    *   **Critical Validation:**
        *   **Test Case 3.3 ("Full 'Generate Brief' Workflow"):** The application must successfully complete the entire brief generation flow without crashing.
        *   **Test Case 4.1 ("AI Service Call Failure"):** To simulate this, temporarily break the API key in the settings. Attempt to generate a brief. The application must **NOT** crash. It must display the error message from the AI service in the error banner. The dashboard must remain fully interactive.
    *   **Outcome:** All tests must pass before the task is considered complete.