# Functional Completion Plan

**Status:** Active
**Objective:** Wire up the UI placeholders in `ProjectDashboardContainer.tsx` to the existing backend logic in `services/aiService.ts`.

## 1. The Missing Link
The application structure is solid, but the "Advanced Analysis" and "Action" buttons currently trigger a `placeholder()` function that just shows a notification. This plan details the implementation of the actual logic.

## 2. Execution Phases

### Phase 1: Analysis Tools (Read-Only)
Wire up the buttons that generate reports/modals without modifying the map structure directly.
- **Target:** `components/ProjectDashboardContainer.tsx`
- **Functions:**
    1.  `onFindMergeOpportunities` -> `aiService.findMergeOpportunities`
    2.  `onAnalyzeSemanticRelationships` -> `aiService.analyzeSemanticRelationships`
    3.  `onAnalyzeContextualCoverage` -> `aiService.analyzeContextualCoverage`
    4.  `onAuditInternalLinking` -> `aiService.auditInternalLinking`
    5.  `onCalculateTopicalAuthority` -> `aiService.calculateTopicalAuthority`
    6.  `onGeneratePublicationPlan` -> `aiService.generatePublicationPlan`

### Phase 2: Action Handlers (Write Operations)
Wire up the functions that modify the map structure based on user confirmation.
- **Target:** `components/ProjectDashboardContainer.tsx`
- **Functions:**
    1.  `onImproveMap` (From Validation Modal) -> `aiService.improveTopicalMap` -> `ADD_TOPIC` / `DELETE_TOPIC`.
    2.  `onExecuteMerge` (From Merge Modal) -> Logic to create new topic and delete old ones.

### Phase 3: Content Tools
Wire up the specific content generation tools.
- **Target:** `components/ProjectDashboardContainer.tsx`
- **Functions:**
    1.  `onGenerateDraft` -> `aiService.generateArticleDraft` -> Update Brief in State.
    2.  `onAuditDraft` -> `aiService.auditContentIntegrity` -> Show Result Modal.
    3.  `onGenerateSchema` -> `aiService.generateSchema` -> Show Schema Modal.

## 3. Completion Criteria
- All buttons on the dashboard trigger real AI calls.
- Loading states are correctly handled (spinners appear).
- Errors are caught and displayed in the notification banner.
- Modals open with populated data.
