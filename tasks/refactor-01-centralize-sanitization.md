
# Refactoring Task 01: Centralize Data Sanitization

**Status:** [x] Completed
**Priority:** CRITICAL
**Objective:** Eliminate inconsistent data handling by moving sanitization logic out of `ProjectDashboardContainer` and into the shared `utils/parsers.ts` library. This ensures `App.tsx`, `BatchProcessor`, and the Dashboard all use the exact same "immune system" against bad data.

## 1. Files to Modify
- `components/ProjectDashboardContainer.tsx`
- `utils/parsers.ts`
- `services/batchProcessor.ts`

## 2. Implementation Steps

### Step 2.1: Update `utils/parsers.ts`
1.  **Extract `sanitizeTopicFromDb`:**
    -   Copy the logic from `ProjectDashboardContainer`.
    -   Ensure it uses `safeString` for all string fields (`title`, `slug`, `description`).
    -   Ensure `freshness` has a fallback to `FreshnessProfile.STANDARD`.
    -   Export it.

2.  **Extract `sanitizeBriefFromDb`:**
    -   Copy the logic from `ProjectDashboardContainer`.
    -   **Crucial Upgrade:** Inside the `keyTakeaways` processing, explicitly check `typeof item`. If it is an object, use `JSON.stringify(item)`. If it is null, skip it. This is the specific fix for "Error #31".
    -   Ensure `outline` uses `safeString` (handling cases where Gemini returns an object/array instead of a markdown string).
    -   Export it.

### Step 2.2: Clean `ProjectDashboardContainer.tsx`
-   Import `sanitizeTopicFromDb` and `sanitizeBriefFromDb` from `../utils/parsers`.
-   Delete the local definitions of these functions inside the component.
-   Update the `fetchMapDetails` effect to use the imported functions.

### Step 2.3: Update `services/batchProcessor.ts`
-   Import `sanitizeBriefFromDb` (or verify if it needs a specific variation for AI responses vs DB rows, but usually, the structure should be aligned or sanitized before saving).
-   Ensure that when the batch processor receives data from `aiService`, it runs it through a sanitizer before dispatching `ADD_BRIEF`.

## 3. Verification
1.  **Compile:** Ensure no TypeScript errors regarding missing functions.
2.  **Load Project:** Load the project that was crashing.
3.  **Check Logs:** Verify that no "Objects are not valid as a React child" errors appear.
4.  **Code Check:** Verify that `ProjectDashboardContainer.tsx` is significantly shorter (~30-50 lines removed).
