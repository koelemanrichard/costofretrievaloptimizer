# Task List: Refactor Brief Generation Workflow for Stability

**Objective:** Implement the plan from `HOLISTIC_PLAN_REFACTOR_BRIEF_GENERATION.md` to decouple AI generation from state mutation, fixing the critical crash.

---

### Phase 1: State Management (`state/appState.ts`)

-   [ ] **Modify `AppState` Interface:**
    *   Add a new property: `briefGenerationResult: ContentBrief | null;`.
-   [ ] **Modify `AppAction` Type:**
    *   Add a new action type: `| { type: 'SET_BRIEF_GENERATION_RESULT'; payload: ContentBrief | null }`
-   [ ] **Modify `appReducer` Function:**
    *   Add a new case to handle `SET_BRIEF_GENERATION_RESULT`:
        ```javascript
        case 'SET_BRIEF_GENERATION_RESULT':
            return { ...state, briefGenerationResult: action.payload };
        ```
-   [ ] **Update `initialState`:**
    *   Add `briefGenerationResult: null` to the initial state object.

---

### Phase 2: Create New Component (`components/BriefReviewModal.tsx`)

-   [ ] **Create New File:** `components/BriefReviewModal.tsx`.
-   [ ] **Component Definition:**
    *   Define the props interface: `interface BriefReviewModalProps { isOpen: boolean; }`.
    *   Create the functional component `BriefReviewModal`.
-   [ ] **State & Data Fetching:**
    *   Use the `useAppState()` hook to get `state` and `dispatch`.
    *   Get the result from state: `const result = state.briefGenerationResult;`.
    *   Get the active map ID from state.
-   [ ] **Component Logic:**
    *   Implement an `onClose` handler that dispatches `SET_BRIEF_GENERATION_RESULT` with `null` and closes the modal.
    *   Implement an `onSave` handler that:
        1.  Dispatches `ADD_BRIEF` with the `mapId` and the `result` from the state.
        2.  Calls the `onClose` handler to clear state and close the modal.
-   [ ] **JSX Structure:**
    *   Render a standard modal structure (overlay, Card).
    *   Display the brief's title, meta description, and outline (using `ReactMarkdown`).
    *   Add a footer with two buttons:
        *   `"Discard"` (Button, variant="secondary", onClick={onClose}).
        *   `"Save to Map"` (Button, onClick={onSave}).

---

### Phase 3: Refactor Container & Integrate (`ProjectDashboardContainer.tsx` & `ProjectDashboard.tsx`)

1.  **Refactor `ProjectDashboardContainer.tsx`:**
    *   [ ] **Target the `onGenerateBrief` function.**
    *   [ ] **Remove State Mutations:** Delete the `dispatch` calls for `ADD_BRIEF` and `SET_ACTIVE_BRIEF_TOPIC`.
    *   [ ] **Modify Success Logic:** In the `try` block, after successfully receiving `newBrief`, replace the old dispatches with the following:
        ```javascript
        dispatch({ type: 'SET_BRIEF_GENERATION_RESULT', payload: newBrief });
        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'briefReview', visible: true } });
        ```

2.  **Integrate into `ProjectDashboard.tsx`:**
    *   [ ] **Import:** `import BriefReviewModal from './BriefReviewModal';`
    *   [ ] **Render the Modal:** Add the new modal to the JSX, alongside the other modals.
        ```jsx
        <BriefReviewModal 
            isOpen={!!modals.briefReview} 
        />
        ```
    *   The `onClose` and `onSave` logic is self-contained within the new modal, so no props are needed.

---

### Phase 4: Update Documentation & Validation

1.  **Update `TEST_PLAN.md`:**
    *   [ ] **Modify Test Case 3.3:** Change the final step to "The `BriefReviewModal` must appear, displaying the content of the new brief."
    *   [ ] **Add New Test Case 3.4 ("Saving a Reviewed Brief"):**
        *   **Given:** The `BriefReviewModal` is open with a new brief.
        *   **When:** The user clicks the "Save to Map" button.
        *   **Then:** The modal must close, the brief must be added to the `activeMap.briefs` record in the state, and the `TopicItem`'s icon on the dashboard must update to the "green eye".

2.  **Execute the New Test Plan.**
    *   [ ] **Test Case 3.3:** Run the "Generate Brief" workflow. Verify the new review modal appears.
    *   [ ] **Test Case 3.4:** Click "Save to Map". Verify the state updates correctly.
    *   [ ] **Test Case (Discard):** Run the workflow again. Click "Discard". Verify the modal closes and the state is NOT updated.
    *   [ ] **Test Case (Crash Simulation):** Manually insert invalid data into the `briefGenerationResult` state using dev tools. Verify that only the `BriefReviewModal` crashes/shows an error, while the main dashboard remains intact.

### Post-computation

-   [ ] **Final Sanity Check:** Ensure all related modals (ContentBrief, Drafting, etc.) still function as expected after these changes.
-   [ ] **Mark Task as Complete.**