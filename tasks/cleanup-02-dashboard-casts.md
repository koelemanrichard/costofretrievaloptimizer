
# Cleanup Task 02: ProjectDashboard Type Safety

**Status:** [x] Completed
**Priority:** LOW (Code Hygiene)
**Target File:** `components/ProjectDashboard.tsx`

## 1. Objective
Remove the `as unknown as SEOPillars` cast when rendering the `PillarsDisplay` component.

## 2. Steps
1.  Locate `<PillarsDisplay ... />`.
2.  Change `pillars={topicalMap.pillars as unknown as SEOPillars}` to `pillars={topicalMap.pillars}`.
    *   The wrapping condition `{topicalMap.pillars && (...)}` ensures it is not undefined.

## 3. Verification
*   Compile the application.
*   Load the dashboard. Ensure pillars still display correctly.
