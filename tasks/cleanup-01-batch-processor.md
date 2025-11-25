
# Cleanup Task 01: BatchProcessor Type Safety

**Status:** [x] Completed
**Priority:** LOW (Code Hygiene)
**Target File:** `services/batchProcessor.ts`

## 1. Objective
Remove the `as unknown as SEOPillars` cast. The `activeMap` object is now strictly typed, so this cast is unnecessary code noise.

## 2. Steps
1.  Locate the `generateContentBrief` call inside `generateAllBriefs`.
2.  Find the `pillars` argument: `activeMap.pillars as unknown as SEOPillars`.
3.  Change it to: `activeMap.pillars`.
    *   *Note:* Since we check `if (!activeMap.pillars)` at the start of the function, TypeScript knows it is not undefined. If TS complains about `undefined`, use the non-null assertion `activeMap.pillars!` or ensure the guard clause is robust.

## 3. Verification
*   Compile the application.
