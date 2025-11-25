
# Strict Typing Task 01: Refactor Application Types

**Status:** [x] Completed
**Priority:** HIGH
**Target File:** `types.ts`

## 1. Objective
Replace the loose `Json` type definitions in the `TopicalMap` interface with concrete, strict interfaces (`SEOPillars`, `SemanticTriple[]`, `BusinessInfo`). This allows TypeScript to catch data structure errors at compile time.

## 2. Implementation Steps
1.  **Import Interfaces:** Ensure `SEOPillars`, `SemanticTriple`, `BusinessInfo` are defined (they already are).
2.  **Modify `TopicalMap` Interface:**
    *   Change `business_info?: Json;` to `business_info?: Partial<BusinessInfo>;`
    *   Change `pillars?: Json;` to `pillars?: SEOPillars;`
    *   Change `eavs?: Json;` to `eavs?: SemanticTriple[];`
    *   *Note:* Keep `competitors` as `string[]` (already correct).
3.  **Modify `ContentBrief` Interface:**
    *   Verify `keyTakeaways` is `string[]` (already correct).
    *   Verify `contextualVectors` is `SemanticTriple[]` (already correct).

## 3. Verification
*   **Compile:** Running the compiler will likely produce errors in `parsers.ts` and components where data is assigned. This is expected and will be resolved in subsequent tasks.
