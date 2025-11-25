# Audit & Fix Plan V4: Code Hygiene and Consistency

**Status:** Pending
**Objective:** Enforce "Don't Repeat Yourself" (DRY) principles by removing duplicate logic in UI components and ensuring all parts of the application use the centralized `utils/parsers.ts` library.

## 1. Identified Inconsistencies

The following components define their own local versions of `safeString` or rendering guards, ignoring the centralized `utils/parsers.ts` library created in the previous refactor. This creates technical debt.

| Component | Issue | Risk |
| :--- | :--- | :--- |
| `components/TopicItem.tsx` | Defines local `safeString` helper. | If central parser logic changes (e.g., handling objects differently), this component won't benefit. |
| `components/DraftingModal.tsx` | Defines local `safeString` helper. | Same as above. |
| `components/BriefReviewModal.tsx` | Uses inline `String()` casting. | Inconsistent with the rest of the app using `safeString`. |
| `components/ContentBriefModal.tsx` | Uses inline `typeof` checks. | Should use `safeString` for consistency. |

## 2. Refactoring Tasks

### Task 01: Standardize TopicItem
**Target:** `components/TopicItem.tsx`
- Import `safeString` from `../utils/parsers`.
- Remove the local `safeString` function definition.
- Replace usages.

### Task 02: Standardize Modals
**Targets:** `components/DraftingModal.tsx`, `components/BriefReviewModal.tsx`, `components/ContentBriefModal.tsx`
- Import `safeString` from `../utils/parsers`.
- Replace local helpers and inline `String()` casts with `safeString()`.
- This ensures that `null`, `undefined`, and `object` types are handled identically across the entire UI.

### Task 03: Verify Unused Imports
**Target:** `components/ProjectDashboardContainer.tsx`
- After the massive refactor, double-check that no unused imports (like old `useEffect` dependencies or local state variables that were moved to hooks) remain.

## 3. Final Validation
- **Compilation:** Ensure no broken imports.
- **Runtime:** Verify that Topic titles, Brief outlines, and Drafts still render correctly with the imported utility.
