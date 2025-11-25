# Test Plan: Deep Sanitizer Validation

**Objective:** To validate that the refactoring of the `AIResponseSanitizer` to support deep schema validation has definitively fixed the "Minified React error #31" crash.

---

## 1. Primary Validation: Crash Resolution & Data Correction

This test validates that the sanitizer now correctly handles malformed nested data, which was the root cause of the crash.

| Test Case ID | Workflow                         | Given                                                                    | When                                                                                       | Then                                                                                                                                                                                                                                                                                                                      |
| :----------- | :------------------------------- | :----------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1.1**      | **Full "Generate Brief" Workflow** | A user is on the dashboard with a map where all prerequisites are met.     | The user clicks the "Generate Brief" icon, selects a `ResponseCode`, and confirms.         | The application must **NOT** crash, regardless of how the AI formats the nested `serpAnalysis` or `visuals` objects. The data saved to the state must be structurally valid according to the `ContentBrief` type. The `ContentBriefModal` must open and display the results successfully. |
| **1.2**      | **Unit Test Simulation**         | A developer simulates a malformed AI response within the `geminiService.ts` file. | The `sanitizer.sanitize` method is called with a JSON string where a nested object is replaced with a primitive (e.g., `"serpAnalysis": "N/A"`). | The sanitizer must not throw an error. It must return a complete, valid `ContentBrief` object where the malformed `serpAnalysis` has been replaced by the structured fallback value (`{ peopleAlsoAsk: [], competitorHeadings: [] }`). |

---

## 2. Regression Testing

This ensures that the fix did not break existing functionality.

| Test Case ID | Workflow                            | Given                                       | When                                                              | Then                                                                                                                                                                |
| :----------- | :---------------------------------- | :------------------------------------------ | :---------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **2.1**      | **Handling of Non-Nested Objects**  | The `suggestResponseCode` AI call is made. | The sanitizer processes a response for a simple, non-nested object. | The sanitizer must still correctly parse and validate the simple JSON object without errors.                                                                        |
| **2.2**      | **Handling of Array Responses**     | The `suggestCentralEntityCandidates` AI call is made. | The `sanitizer.sanitizeArray` method is called.             | The `sanitizeArray` method must still correctly parse and return an array, proving that the changes to the `sanitize` method did not negatively impact its sibling method. |

---

## Conclusion

If all test cases pass, the fix is considered robust and complete. The application is now resilient to the primary identified cause of instability from AI service calls.
