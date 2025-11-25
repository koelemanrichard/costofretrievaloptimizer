
# Task: Implement Dashboard Recovery (Manual Gen)

**Priority:** HIGH
**Target Files:**
- `components/ProjectDashboardContainer.tsx`
- `components/ProjectDashboard.tsx`
- `components/TopicalMapDisplay.tsx`

## 1. Objective
Allow users with an "Empty but Configured" map to trigger the initial generation process directly from the dashboard.

## 2. Implementation Details

### Step 1: Container Logic (`ProjectDashboardContainer.tsx`)
1.  Create `onGenerateInitialMap` handler.
2.  Copy/Reuse the generation logic from Task 01 (AI Call -> ID Mapping -> DB Insert -> Dispatch).
3.  Pass this handler to `ProjectDashboard`.

### Step 2: Prop Drilling (`ProjectDashboard.tsx`)
1.  Accept `onGenerateInitialMap` prop.
2.  Pass it to `TopicalMapDisplay`.

### Step 3: UI Trigger (`TopicalMapDisplay.tsx`)
1.  Check condition: `coreTopics.length === 0` AND `outerTopics.length === 0`.
2.  If true, check if `canGenerateBriefs` (or a similar prop indicating pillars exist) is true.
3.  Render a "Call to Action" state:
    *   "Your map is configured but empty."
    *   Button: "Generate Map Structure with AI".
    *   OnClick: Call `onGenerateInitialMap`.

## 3. Verification
*   Load your existing "daadvracht" project (which is currently empty).
*   Verify the "Generate Map Structure" button appears.
*   Click it.
*   Verify topics appear after loading.

**Status:** [x] Completed
