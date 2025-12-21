/**
 * Site Analysis Slice - Handles site analysis V2 state
 *
 * Manages:
 * - Site analysis view mode
 * - Current project
 * - Selected page
 * - Discovered pillars
 */

import type { SiteAnalysisProject, DiscoveredPillars } from '../../types';

// ============================================================================
// STATE TYPES
// ============================================================================

export type SiteAnalysisViewMode =
  | 'project_list'
  | 'setup'
  | 'extracting'
  | 'pillars'
  | 'analyzing'
  | 'results'
  | 'page_detail';

export interface SiteAnalysisState {
  viewMode: SiteAnalysisViewMode;
  currentProject: SiteAnalysisProject | null;
  selectedPageId: string | null;
  discoveredPillars: DiscoveredPillars | null;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialSiteAnalysisState: SiteAnalysisState = {
  viewMode: 'project_list',
  currentProject: null,
  selectedPageId: null,
  discoveredPillars: null,
};

// ============================================================================
// ACTION TYPES
// ============================================================================

export type SiteAnalysisAction =
  | { type: 'SET_SITE_ANALYSIS_VIEW_MODE'; payload: SiteAnalysisViewMode }
  | { type: 'SET_SITE_ANALYSIS_PROJECT'; payload: SiteAnalysisProject | null }
  | { type: 'SET_SITE_ANALYSIS_SELECTED_PAGE'; payload: string | null }
  | { type: 'SET_SITE_ANALYSIS_PILLARS'; payload: DiscoveredPillars | null }
  | { type: 'RESET_SITE_ANALYSIS' };

// ============================================================================
// REDUCER
// ============================================================================

export function siteAnalysisReducer(
  state: SiteAnalysisState,
  action: SiteAnalysisAction
): SiteAnalysisState {
  switch (action.type) {
    case 'SET_SITE_ANALYSIS_VIEW_MODE':
      return { ...state, viewMode: action.payload };

    case 'SET_SITE_ANALYSIS_PROJECT':
      return { ...state, currentProject: action.payload };

    case 'SET_SITE_ANALYSIS_SELECTED_PAGE':
      return { ...state, selectedPageId: action.payload };

    case 'SET_SITE_ANALYSIS_PILLARS':
      return { ...state, discoveredPillars: action.payload };

    case 'RESET_SITE_ANALYSIS':
      return initialSiteAnalysisState;

    default:
      return state;
  }
}

// ============================================================================
// ACTION CREATORS
// ============================================================================

export const siteAnalysisActions = {
  setViewMode: (mode: SiteAnalysisViewMode): SiteAnalysisAction => ({
    type: 'SET_SITE_ANALYSIS_VIEW_MODE',
    payload: mode
  }),

  setProject: (project: SiteAnalysisProject | null): SiteAnalysisAction => ({
    type: 'SET_SITE_ANALYSIS_PROJECT',
    payload: project
  }),

  setSelectedPage: (pageId: string | null): SiteAnalysisAction => ({
    type: 'SET_SITE_ANALYSIS_SELECTED_PAGE',
    payload: pageId
  }),

  setPillars: (pillars: DiscoveredPillars | null): SiteAnalysisAction => ({
    type: 'SET_SITE_ANALYSIS_PILLARS',
    payload: pillars
  }),

  reset: (): SiteAnalysisAction => ({
    type: 'RESET_SITE_ANALYSIS'
  }),
};
