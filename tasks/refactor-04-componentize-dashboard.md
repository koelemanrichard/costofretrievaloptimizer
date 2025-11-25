
# Refactoring Task 04: Componentize Project Dashboard

**Status:** [x] Completed
**Priority:** MEDIUM
**Objective:** Break the monolithic `ProjectDashboard.tsx` render method into smaller, semantic sub-components to improve readability and prevent "prop drilling" confusion.

## 1. Files to Create/Modify
- Create: `components/dashboard/WorkbenchPanel.tsx`
- Create: `components/dashboard/AnalysisToolsPanel.tsx`
- Modify: `components/ProjectDashboard.tsx`

## 2. Implementation Steps

### Step 2.1: Create `WorkbenchPanel.tsx`
-   Extract the "Workbench" Card (Analyze Domain, Add Topic, View Linking, etc.) from `ProjectDashboard.tsx`.
-   Define explicit props interface for the handlers it needs (e.g., `onAnalyzeKnowledgeDomain`, `onAddTopicManually`).
-   Move the relevant JSX into this file.

### Step 2.2: Create `AnalysisToolsPanel.tsx`
-   Extract the "Advanced Analysis & Tools" Card.
-   Define props for `onValidateMap`, `onFindMergeOpportunities`, etc.
-   Move the JSX into this file.

### Step 2.3: Update `ProjectDashboard.tsx`
-   Import the two new components.
-   Replace the massive blocks of JSX with `<WorkbenchPanel ... />` and `<AnalysisToolsPanel ... />`.

## 3. Verification
1.  **Visual Check:** The dashboard should look exactly the same as before.
2.  **Interaction Check:** Click buttons in the workbench and tools panels (e.g., "Analyze Domain"). They should still trigger the correct modals/actions.
