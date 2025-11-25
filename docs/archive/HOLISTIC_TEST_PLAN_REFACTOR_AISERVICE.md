# Test Plan: AI Service Explicit Dispatcher Refactoring

**Objective:** To validate that the complete refactoring of `services/aiService.ts`—replacing the `delegate` function with an explicit `switch`-based dispatcher—has fixed all underlying stability issues and has not introduced regressions.

---

## 1. Primary Validation: Crash Resolution & Workflow Success

This test ensures the core user journey that was previously crashing is now stable and functional.

| Test Case ID | Workflow                         | Given                                                              | When                                                                                       | Then                                                                                                                                                                                                                                                                                                                         |
| :----------- | :------------------------------- | :----------------------------------------------------------------- | :----------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1.1**      | **Full "Generate Brief" Workflow** | A user is on the dashboard with a map where all prerequisites are met. | The user clicks the "Generate Brief" icon, selects a `ResponseCode` from the modal, and clicks "Generate Brief". | **1. No Crash:** The application must not crash or display any React errors. <br/> **2. Correct Flow:** The `BriefReviewModal` must open, displaying the content of the newly generated brief. <br/> **3. Data Integrity:** The brief content displayed in the modal must be complete and correctly structured. |

---

## 2. Secondary Validation: Type Safety & Architecture

This test validates that the new architecture meets its design goals of clarity and type safety.

| Test Case ID | Workflow                | Given                                         | When                                                              | Then                                                                                                                                                                                                                         |
| :----------- | :---------------------- | :-------------------------------------------- | :---------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2.1**      | **TypeScript Compilation** | The code for `services/aiService.ts` has been fully refactored. | The application's build/compilation process is run.               | The application must compile **without any new TypeScript errors**. This confirms that the explicit function signatures in `aiService.ts` correctly match the signatures in the provider-specific services (`geminiService.ts`, etc.). |
| **2.2**      | **Code Readability Review** | The refactored `services/aiService.ts` is open for review.    | A developer examines any function within the file (e.g., `generateContentBrief`). | The logic flow must be immediately obvious. It should be a simple `switch` statement that directly calls the corresponding function from an imported module. There should be no "magic" or complex abstractions. |

---

## 3. Regression Testing

This ensures that the refactoring, which touched every AI service call, did not inadvertently break other features.

| Test Case ID | Workflow                            | Given                                       | When                                                              | Then                                                                                                                                                       |
| :----------- | :---------------------------------- | :------------------------------------------ | :---------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3.1**      | **Pillar Definition Wizard**        | The user is creating a new map and is on the "SEO Pillars" step. | The wizard loads.                                                 | The wizard must successfully call `suggestCentralEntityCandidates` and display the AI-generated options without error.                                   |
| **3.2**      | **Knowledge Domain Analysis**       | The user is on the dashboard and prerequisites are met.  | The user clicks the "Analyze Domain" button.                      | The application must successfully call `expandSemanticTriples`, build the knowledge graph, and open the `KnowledgeDomainModal` with the results. |

---

## Conclusion

If all test cases pass, the refactoring is a success. The application's core AI service layer is now considered stable, maintainable, and robust. This should close the chapter on the persistent `React error #31` crashes.
