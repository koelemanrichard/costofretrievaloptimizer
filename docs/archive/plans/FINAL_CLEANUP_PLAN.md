# Final Cleanup & Pre-Flight Plan

**Status:** Pending
**Objective:** Remove legacy "type hacks" (unsafe casting) that persist in the codebase despite the strict typing refactor. Ensure the application relies purely on the TypeScript interfaces defined in `types.ts`.

## 1. Identified Legacy Code (Technical Debt)

Now that `TopicalMap.pillars` is typed as `SEOPillars` (optional) instead of `Json`, the following casts are redundant and should be removed:

### A. `services/batchProcessor.ts`
*   **Current:** `activeMap.pillars as unknown as SEOPillars`
*   **Target:** `activeMap.pillars` (The logic already guards against undefined).

### B. `components/ProjectDashboard.tsx`
*   **Current:** `pillars={topicalMap.pillars as unknown as SEOPillars}`
*   **Target:** `pillars={topicalMap.pillars}` (The JSX already guards with `topicalMap.pillars && ...`).

## 2. Execution Tasks

1.  **Task 01:** Clean up `services/batchProcessor.ts`.
2.  **Task 02:** Clean up `components/ProjectDashboard.tsx`.

## 3. Final System Verification

Once these casts are removed, if the application compiles successfully, it proves that our Data Parsers (`utils/parsers.ts`) are correctly converting Database JSON into Application Objects, and the Types are flowing correctly through the entire system.
