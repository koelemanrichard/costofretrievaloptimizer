
# Holistic Task 04: Advanced Audit Logic Implementation

**Status:** [x] Completed
**Priority:** MEDIUM
**Target File:** `services/ai/briefGeneration.ts` (Note: Modified from `analysis.ts` to keep drafting logic co-located)

## 1. Objective
Upgrade the `auditContentIntegrity` function (or create helper functions) to programmatically verify the new linguistic and structural rules.

## 2. Implementation Steps

### Step 2.1: Implement Helper Functions
Create specific checkers for the rules:

1.  **`checkSubjectivity(text: string):`**
    *   Regex match for: "I think", "In my opinion", "hope", "feel", "believe".
    *   Return penalty if found.
2.  **`checkPronounDensity(text: string, entityName: string):`**
    *   Count occurrences of "it", "they", "he", "she".
    *   Count occurrences of `entityName`.
    *   Flag if Pronoun/Entity ratio > Threshold (e.g., 0.5).
3.  **`checkFirstSentencePrecision(text: string):`**
    *   Extract first sentence of H2 sections.
    *   Flag if length > 25 words.
    *   Flag if it lacks a definitive verb ("is", "are", "means", "refers to").
4.  **`checkLinkPositioning(text: string):`**
    *   Regex to find markdown links `[...]`.
    *   Check if a link appears within the first 15 characters of a paragraph. If so, flag as "Premature Linking".

### Step 2.2: Integrate into Audit
*   Update `auditContentIntegrity` to run these checks on the draft.
*   Add the results to the `frameworkRules` array in the `ContentIntegrityResult`.

## 3. Verification
*   Run an audit on a generated draft.
*   Manually inject a subjective sentence ("I feel this is good"). Ensure the audit flags it.
*   Manually inject a premature link. Ensure the audit flags it.

Progress Update: Implemented algorithmic checks in briefGeneration.ts.
Next Task: tasks/holistic-05-ui-integration.md
