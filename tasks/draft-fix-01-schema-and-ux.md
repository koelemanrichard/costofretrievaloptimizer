
# Task: Fix Schema Rendering & Brief UX

**Status:** [x] Completed
**Priority:** HIGH
**Objective:** Fix the visual bug in Schema generation and provide feedback when generating drafts.

## 1. Fix Schema Regex
**File:** `components/SchemaModal.tsx`
- The current regex `/\b\d+\b/g` matches numbers inside HTML classes (like `text-green-400`), breaking the UI.
- Update the regex to avoid matching numbers inside tags or quotes if possible, or refine the highlighting logic.

## 2. Add Loading State
**File:** `components/ContentBriefModal.tsx`
- The "Generate Article Draft" button needs to show a spinner when `isLoading.audit` (or a specific drafting key) is true.
- Pass `isLoading` prop from `ProjectDashboard`.

## 3. Verification
- Generate Schema -> Check for `400">` artifacts.
- Click Generate Draft -> Check button state.
