
# Strict Typing Task 03: Refactor Components & Remove Casts

**Status:** [x] Completed
**Priority:** HIGH
**Target Files:** 
- `components/ProjectDashboardContainer.tsx`
- `components/ProjectWorkspace.tsx`
- `components/ui/PillarsDisplay.tsx`
- `components/EavDiscoveryWizard.tsx`

## 1. Objective
Now that `TopicalMap` is strictly typed, we must remove the unsafe `as unknown as` casts scattered throughout the components. This cleans up the codebase and relies on true type safety.

## 2. Implementation Steps

### Step 2.1: `ProjectDashboardContainer.tsx`
*   Remove `as unknown as SEOPillars` when accessing `activeMap.pillars`.
*   Remove `as unknown as SemanticTriple[]` when accessing `activeMap.eavs`.
*   TypeScript should now automatically recognize these fields as their correct types.

### Step 2.2: `ProjectWorkspace.tsx`
*   Remove unsafe casts in `handleFinalizePillars` and `handleFinalizeEavs` if present.
*   Ensure `activeMap.business_info` is treated correctly as `Partial<BusinessInfo>`.

### Step 2.3: `EavDiscoveryWizard.tsx`
*   Remove `activeMap?.eavs as unknown as SemanticTriple[]`. It should just be `activeMap?.eavs`.

### Step 2.4: `PillarsDisplay.tsx`
*   Verify props are correctly typed as `SEOPillars`.

## 3. Verification
*   **Compile:** The entire application must compile with `npm run build` (or equivalent).
*   **Runtime:** Verify that the Dashboard and Wizards still load and display data correctly.
