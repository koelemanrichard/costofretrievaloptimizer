# Task List: Refactor `delegate` Function for Stability

**Objective:** Implement the plan outlined in `HOLISTIC_PLAN_REACT_ERROR_31.md` to simplify the `delegate` function and fix the critical rendering crash.

---

### Pre-computation

-   [x] **Analyze Root Cause:** Confirmed that complex generic type inference in `delegate` is the source of data corruption leading to the React crash.
-   [x] **Formulate Strategy:** Decided to replace implicit inference with explicit casting to maintain external type safety while simplifying internal logic.

### Implementation Tasks

1.  **Modify `services/aiService.ts`:**
    *   [ ] **Target the `delegate` function.**
    *   [ ] **Remove the complex generic signature:** Delete `<T extends (...args: any[]) => any>` from the function definition.
    *   [ ] **Update the function's return type:** The function should now return a generic function type, like `(...args: any[]): any`.
    *   [ ] **Explicitly Cast All Exports:** For every exported function that uses `delegate`, add an explicit `as` cast to ensure it has the correct type signature from the perspective of the rest of the application.
        *   **Example:** `export const generateContentBrief = delegate('generateContentBrief') as typeof geminiService.generateContentBrief;`
        *   **Action:** Apply this pattern to all 22 exported functions in the file.

### Validation Tasks

1.  **Perform End-to-End Test (Test Case 1.1):**
    *   [ ] Navigate through the application to the `ProjectDashboard`.
    *   [ ] Ensure all prerequisites are met (Pillars are defined, Knowledge Graph is generated).
    *   [ ] Click the "Generate Brief" icon on a topic.
    *   [ ] Select a `ResponseCode` and confirm.
    *   [ ] **Verification:** The application must not crash. The `ContentBriefModal` must appear with the new brief.

2.  **Perform Compilation Test (Test Case 2.1):**
    *   [ ] Trigger the application's build or type-checking process.
    *   [ ] **Verification:** The process must complete without any new TypeScript errors, confirming that type safety has been preserved for external modules.

3.  **Perform Code Review (Test Case 3.1):**
    *   [ ] Review the diff for `services/aiService.ts`.
    *   [ ] **Verification:** The `delegate` function should be significantly shorter and easier to understand. The explicit casts on the exports should be clear and correct.

### Post-computation

-   [ ] **Final Sanity Check:** Briefly click through other parts of the application to ensure no obvious regressions were introduced.
-   [ ] **Mark Task as Complete:** Once all validation passes, the task is complete.