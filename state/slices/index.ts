/**
 * State Slices - Barrel Exports
 *
 * This module exports all state slices for use in the main app reducer.
 * Each slice handles a specific domain of the application state.
 *
 * Created: 2024-12-19 - AppState reducer refactoring
 */

// UI State (loading, errors, notifications, modals)
export {
  type UIState,
  type UIAction,
  initialUIState,
  uiReducer,
  uiActions,
} from './uiSlice';

// Site Analysis State (V2 site analysis workflow)
export {
  type SiteAnalysisState,
  type SiteAnalysisViewMode,
  type SiteAnalysisAction,
  initialSiteAnalysisState,
  siteAnalysisReducer,
  siteAnalysisActions,
} from './siteAnalysisSlice';

// Audit State (Linking Audit + Unified Audit)
export {
  type AuditState,
  type LinkingAuditState,
  type UnifiedAuditState,
  type AuditAction,
  initialAuditState,
  initialLinkingAuditState,
  initialUnifiedAuditState,
  auditReducer,
  linkingAuditActions,
  unifiedAuditActions,
} from './auditSlice';

// Publication Planning State (calendar, scheduling, performance tracking)
export {
  type PublicationPlanningState,
  type PlanningViewMode,
  type CalendarMode,
  type PublicationPlanningAction,
  initialPublicationPlanningState,
  publicationPlanningReducer,
  publicationPlanningActions,
} from './publicationPlanningSlice';

// Organization State (multi-tenancy)
export {
  type OrganizationState,
  type OrganizationAction,
  initialOrganizationState,
  organizationReducer,
  organizationActions,
} from './organizationSlice';
