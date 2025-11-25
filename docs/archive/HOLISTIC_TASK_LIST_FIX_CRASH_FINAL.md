# Task List: Implement Deep Schema Validation to Fix Crash

**Objective:** Implement the plan from `HOLISTIC_PLAN_FIX_CRASH_FINAL.md` to make the AI response sanitizer robust against malformed nested data, fixing the critical crash.

---

### Pre-computation

-   [x] **Analyze Root Cause:** Confirmed that the lack of deep/recursive validation for nested objects in the `AIResponseSanitizer` is the true root cause, based on a simulated test.
-   [x] **Formulate Strategy:** Decided to upgrade the sanitizer to handle nested schemas and update the service-level schemas to be fully descriptive.

### Implementation Tasks

1.  **Enhance `services/aiResponseSanitizer.ts`:**
    *   [ ] **Target the `sanitize` method.**
    *   [ ] **Add Recursive Logic:** Modify the main loop inside the function. When checking a property, add a condition: `if (isObject(expectedSchema[key]))`.
    *   [ ] If this condition is true, recursively call `sanitize` on the nested object: `sanitizedObject[keyTyped] = this.sanitize(receivedValue, expectedSchema[key], fallback[keyTyped]);`.
    *   [ ] Ensure the logic correctly handles cases where the received nested value is not an object, using the fallback as a replacement.
    *   [ ] Add appropriate TypeScript type assertions (`as any` or `as Record<string, any>`) within the recursive call, guarded by `isObject` checks, to satisfy the compiler's strict generic type checking.

2.  **Update `services/geminiService.ts`:**
    *   [ ] **Target the `generateContentBrief` function.**
    *   [ ] **Expand `briefSchema`:** Replace the shallow `serpAnalysis: Object` and `visuals: Object` with fully defined nested objects that match the `ContentBrief` type.
    *   [ ] **Verify `fallback` Object:** Double-check that the `fallback` object has the exact same nested structure as the new, detailed `briefSchema`. This is critical.

### Validation Tasks

1.  **Perform Unit Test Simulation (Test Case 2.1):**
    *   [ ] Temporarily add a `console.log` inside the `catch` block of the `onGenerateBrief` handler in `ProjectDashboardContainer.tsx`.
    *   [ ] In `geminiService.ts`, before the `return callApi(...)` line in `generateContentBrief`, manually create a malformed JSON string: `const malformedJson = JSON.stringify({ ...briefData, serpAnalysis: "none" });`
    *   [ ] Call `sanitizer.sanitize(malformedJson, briefSchema, fallback)` and log the result.
    *   [ ] **Verification:** The logged output must show a correctly structured object where `serpAnalysis` is `{ peopleAlsoAsk: [], competitorHeadings: [] }`, proving the sanitizer fixed the malformed data. Remove the test code after verification.

2.  **Perform End-to-End Test (Test Case 1.1):**
    *   [ ] With the real code in place, navigate through the application and generate a new content brief.
    *   [ ] **Verification:** The application must not crash. The `ContentBriefModal` must appear with the new brief. Even if the AI's live response is slightly malformed, the sanitizer should now correct it, and the user experience should be seamless.

### Post-computation

-   [ ] **Clean Up:** Remove any temporary test code or `console.log` statements.
-   [ ] **Mark Task as Complete:** Once all validation passes, the task is complete.
