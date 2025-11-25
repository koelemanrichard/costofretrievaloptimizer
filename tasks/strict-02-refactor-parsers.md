
# Strict Typing Task 02: Refactor Parsers

**Status:** [x] Completed
**Priority:** HIGH
**Target File:** `utils/parsers.ts`

## 1. Objective
Update the data parsing functions to satisfy the new, strict `TopicalMap` interface. The parsers must act as the bridge, converting the loose database types (`any` or `Json`) into the strict application types.

## 2. Implementation Steps
1.  **Update `parsePillars`:**
    *   Ensure it strictly returns `SEOPillars`.
    *   Handle null/undefined input by returning a default object with empty strings, NOT `null`.
2.  **Update `parseTopicalMap`:**
    *   The return type `TopicalMap` will now require strictly typed fields.
    *   **Business Info:** Ensure `parseBusinessInfo` returns `Partial<BusinessInfo>`.
    *   **Pillars:** Assign `pillars: parsePillars(data.pillars)`. Remove any `as any` casts if possible, or ensure the cast is valid.
    *   **EAVs:** Create a helper `parseEavs(json: any): SemanticTriple[]`.
        *   Check if array.
        *   Map and validate structure (`subject`, `predicate`, `object`).
        *   Return `[]` if invalid.
    *   **Assign:** `eavs: parseEavs(data.eavs)`.

## 3. Verification
*   **Compile:** `utils/parsers.ts` should compile without errors.
