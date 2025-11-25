
# Authorship Task 05: The Refinement Service (The Loop)

**Status:** [x] Completed
**Priority:** HIGH
**Target File:** `services/ai/briefGeneration.ts`

## 1. Objective
Create the mechanism for the "Refinement Loop". This allows the application to automatically fix specific violations found by the audit.

## 2. Implementation Steps

### New Service Function
`export const refineDraftSection(originalText: string, violationType: string, instruction: string, businessInfo: BusinessInfo, dispatch: any): Promise<string>`

*   **Prompt:** "You are an Editor. Rewrite the following text segment to fix a specific violation."
*   **Input:** The failing paragraph.
*   **Violation:** e.g., "Passive Voice", "Delayed Answer".
*   **Instruction:** e.g., "Rewrite to start with the verb."
*   **Output:** The corrected text segment ONLY.

## 3. Verification
*   Unit test or manual test: Call function with a bad sentence ("It is believed by many that...") and instruction ("Remove passive voice"). Verify output.
