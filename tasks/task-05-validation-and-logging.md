# Task 05: Full System Validation & Regression Testing

**Status:** [x] Completed
**Priority:** CRITICAL
**Dependencies:** Tasks 01-04 must be marked Complete.

## 1. Objective
Verify that the "React Error #31" (Object as React Child) crash is permanently resolved and that the application handles malformed data gracefully without crashing.

## 2. Test Plan

### Test A: The "Bad Data" Simulation
1.  **Setup:** In `components/ProjectDashboardContainer.tsx`, temporarily modify `sanitizeBriefFromDb` to *intentionally* inject bad data (e.g., set `outline` to `{ text: "I am an object" }` instead of a string).
2.  **Action:** Reload the dashboard. Open the "Brief Review" or "Content Brief" modal for that topic.
3.  **Expected Result:**
    *   The App MUST NOT crash.
    *   The modal should appear.
    *   The outline area should display the stringified object (`{"text":"I am an object"}`) or be empty, depending on your implementation of Task 02.
    *   **Pass/Fail:** PASS

### Test B: Batch Generation Resilience
1.  **Action:** Trigger "Generate All Briefs".
2.  **Observation:** Watch the logs. Ensure that `sanitizeBriefFromDb` is handling the incoming AI data before it hits the state.
3.  **Action:** Open newly generated briefs.
4.  **Expected Result:** All fields render correctly as strings/lists.
5.  **Pass/Fail:** PASS

### Test C: Graph Visualization
1.  **Action:** Open "View Internal Linking".
2.  **Expected Result:** Graph renders. No console errors regarding property access on undefined.
3.  **Pass/Fail:** PASS

## 3. Issue Logging
Create a new file `docs/plans/FIX_VALIDATION_LOG.md`.
- Log the outcome of the tests above.
- If any test fails, describe the stack trace and the specific data shape that caused it.
- Create a plan for any follow-up fixes required.

## 4. Completion
Only mark this task as complete if the application is STABLE against type mismatches.