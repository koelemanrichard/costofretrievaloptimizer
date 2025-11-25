# Polish Task 01: Standardize TopicItem

**Status:** [x] Completed
**Priority:** LOW (Code Hygiene)
**Target File:** `components/TopicItem.tsx`

## 1. The Issue
The `TopicItem` component currently defines its own local `safeString` helper function. This duplicates logic found in `utils/parsers.ts` and risks inconsistency if the global sanitization rules change.

## 2. Implementation Steps
1.  **Import:** Add `import { safeString } from '../utils/parsers';`
2.  **Remove Local:** Delete the local `const safeString = (val: any) => ...` definition inside the component.
3.  **Verify Usage:** Ensure that `title`, `slug`, and `description` variables are still using `safeString(...)`.

## 3. Validation
-   **Compile:** Ensure no TypeScript errors.
-   **Visual:** Check the Dashboard list view. Topic titles and descriptions should render correctly.