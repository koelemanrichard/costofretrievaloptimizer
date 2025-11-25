
# Final Cleanup Task: Remove Ghost Files & Debris

**Status:** Pending
**Priority:** LOW (Maintenance)
**Objective:** Delete redundant root-level files that merely re-export components, and remove placeholder files that are no longer needed.

## 1. Files to Delete

### Root-Level Duplicates (Ghost Files)
These files exist in the root directory but point to the real source in `components/`. They are confusing and unnecessary.
- `PillarDefinitionWizard.tsx`
- `EavDiscoveryWizard.tsx`
- `CompetitorRefinementWizard.tsx`
- `ProjectDashboardContainer.tsx`
- `ProjectDashboard.tsx`
- `MergeSuggestionsModal.tsx` (Root version)

### Unused Component Placeholders
These were created early in development but superseded by the final architecture.
- `components/TemplateSelectionModal.tsx` (Replaced by `ResponseCodeSelectionModal`)
- `components/AdvancedAnalysisPanel.tsx` (Replaced by `components/dashboard/AnalysisToolsPanel`)
- `components/ui/WorkbenchPanel.tsx` (Replaced by `components/dashboard/WorkbenchPanel`)
- `components/ui/ActionSuggestionModal.tsx`

### Unused Service Placeholders
Empty files created for module resolution that are not yet implemented.
- `services/topicalAuthorityService.ts`
- `services/informationGainService.ts`
- `services/semanticDistanceService.ts`
- `services/infranodusService.ts`

## 2. Execution
Run the provided `cleanup_script.txt`.

## 3. Verification
- Ensure the application still builds and runs.
- Verify that `ProjectWorkspace.tsx` imports `ProjectDashboardContainer` from the `./` (components) directory, which it does.
