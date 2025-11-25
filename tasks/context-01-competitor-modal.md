
# Task: Create Competitor Manager Modal

**Status:** [x] Completed
**Priority:** MEDIUM
**Target File:** `components/CompetitorManagerModal.tsx`
**Dependencies:** None

## 1. Objective
Create a modal component that allows users to view, add, and remove competitor URLs for the current map.

## 2. Requirements
- **Props:**
    - `isOpen`: boolean
    - `onClose`: () => void
    - `competitors`: string[]
    - `onSave`: (newCompetitors: string[]) => Promise<void>
- **State:** Local state to manage the list while editing.
- **UI Elements:**
    - List of current competitors with a "Remove" (trash icon) button.
    - Input field + "Add" button to append new URLs.
    - "Save Changes" button (calls `onSave`).
    - "Cancel" button (calls `onClose`).

## 3. Implementation Steps
1.  Create `components/CompetitorManagerModal.tsx`.
2.  Implement standard Modal layout (Overlay + Card).
3.  Implement local state `localCompetitors`.
4.  Implement `handleAdd` (validate URL format ideally) and `handleRemove`.
5.  Implement `handleSave` (trigger loading state, call prop).

## 4. Verification
- Import temporarily in `ProjectDashboard.tsx` to visually verify (or wait for Task 03).
