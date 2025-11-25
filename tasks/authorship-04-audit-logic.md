
# Authorship Task 04: Advanced Algorithmic Audit Logic

**Status:** [x] Completed
**Priority:** HIGH
**Target File:** `services/ai/briefGeneration.ts`

## 1. Objective
Implement the "Algorithmic Validator" that checks if the draft actually follows the rules defined in the prompt.

## 2. Implementation Steps

### New Helper Functions
1.  **`checkQuestionProtection(text)`:**
    *   Find H2/H3s that start with "What", "How", "Why".
    *   Check the first sentence of the next paragraph.
    *   Does it contain a definitive verb ("is", "are", "consists") within the first 5 words?
    *   *Penalty:* "Delayed Answer".
2.  **`checkListLogic(text)`:**
    *   Find List blocks (`- ` or `1. `).
    *   Check the preceding line. Does it end with a colon? Does it mention a number if the list is numbered?
    *   *Penalty:* "Weak List Preamble".
3.  **`auditFactConsistency(text, knowledgeGraph)`:**
    *   Extract numbers/stats from text.
    *   (Advanced) Compare against KG values if available. (For now, simple consistency check: does the same number appear differently in the text?)

### Integration
*   Update `auditContentIntegrity` to run these checks and add them to `frameworkRules`.

## 3. Verification
*   Run "Audit Content Integrity" on a draft.
*   Verify that "Question Protection" and "List Logic" appear in the results.
