# Test Plan: AI Service Delegate Refactoring

**Objective:** To validate that the simplification of the `delegate` function in `services/aiService.ts` has fixed the "Minified React error #31" crash and has not introduced any new regressions.

---

## 1. Primary Validation: Crash Resolution

This is the most critical test. It directly validates that the root cause of the crash has been eliminated.

| Test Case ID | Workflow                         | Given                                                              | When                                                                                       | Then                                                                                                                                                                                                                                                                |
| :----------- | :------------------------------- | :----------------------------------------------------------------- | :----------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1.1**      | **Full "Generate Brief" Workflow** | A user is on the dashboard with a map where all prerequisites are met (Pillars defined, Knowledge Graph generated). | The user clicks the "Generate Brief" icon, selects a `ResponseCode` from the modal, and clicks "Generate Brief". | The application must **NOT** crash. The AI service call must be made successfully, the brief data must be correctly processed and added to the state, and the `ContentBriefModal` must open to display the newly generated brief. |

---

## 2. Secondary Validation: Type Safety & Compilation

This test ensures that our simplification of the *internal* logic did not break the *external* type contract that the rest of the application relies on.

| Test Case ID | Workflow                | Given                                         | When                                  | Then                                                                                                                                                                                                               |
| :----------- | :---------------------- | :-------------------------------------------- | :------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2.1**      | **TypeScript Compilation** | The code for `services/aiService.ts` has been refactored. | The application's build/compilation process is run. | The application must compile **without any new TypeScript errors**. This proves that the explicit casting on the exported functions has successfully maintained the type-safe contract that other components (like `ProjectDashboardContainer.tsx`) depend on. |

---

## 3. Code Quality & Readability Validation

This is a qualitative check to ensure the refactoring met its goal of reducing complexity.

| Test Case ID | Description               | Given                                         | When                                                       | Then                                                                                                                                                         |
| :----------- | :------------------------ | :-------------------------------------------- | :--------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3.1**      | **Code Readability Review** | The code for `services/aiService.ts` has been refactored. | A developer reviews the new `delegate` function. | The function's logic should be significantly easier to understand. The removal of complex generics should make its purpose—dispatching a function call—immediately obvious. |

---

## Conclusion

If all test cases pass, the refactoring is considered successful. The application is more stable, and the codebase is more maintainable.