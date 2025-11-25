
# Task: Dashboard UI Integration (Context Panel)

**Priority:** HIGH
**Target Files:** 
- `components/dashboard/StrategicContextPanel.tsx`
- `components/ProjectDashboard.tsx`
- `state/appState.ts`

## 1. Objective
Replace the static `PillarsDisplay` with a functional `StrategicContextPanel` and update the Dashboard to render the new Modals.

## 2. Implementation Steps

### Step 1: Update App State
**File:** `state/appState.ts`
- Add new keys to `modals` state in `initialState`: `competitorManager: false`, `eavManager: false`.
- (No new action needed, `SET_MODAL_VISIBILITY` handles dynamic keys).

### Step 2: Create Context Panel
**File:** `components/dashboard/StrategicContextPanel.tsx`
- **Props:** `pillars`, `eavsCount`, `competitorsCount`, `onEditPillars`, `onManageEavs`, `onManageCompetitors`, `onRegenerateMap`.
- **UI:**
    - Display Pillars (read-only view, reuse logic from PillarsDisplay or keep simple).
    - Action Bar:
        - Button: `Manage EAVs (${eavsCount})`
        - Button: `Manage Competitors (${competitorsCount})`
        - Button (Red/Warning): `Regenerate Map Structure`

### Step 3: Update ProjectDashboard
**File:** `components/ProjectDashboard.tsx`
- Import `StrategicContextPanel`, `EavManagerModal`, `CompetitorManagerModal`.
- Replace `<PillarsDisplay ... />` with `<StrategicContextPanel ... />`.
- Render the new Modals at the bottom.
- Wire up `onManageEavs` to `dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'eavManager', visible: true } })`.
- Wire up `onManageCompetitors` similarly.

## 3. Verification
- Load Dashboard.
- Verify `PillarsDisplay` is gone and `StrategicContextPanel` is present.
- Click "Manage EAVs" -> Modal opens.
- Click "Manage Competitors" -> Modal opens.
