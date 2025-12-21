/**
 * Publication Planning Slice - Handles publication planning state
 *
 * Manages:
 * - View mode (calendar/list)
 * - Calendar mode (month/week)
 * - Current date focus
 * - Topic selection for bulk operations
 * - Performance snapshots
 * - AI-generated publication plans
 */

import type {
  PlanningFilters,
  PerformanceSnapshot,
  PublicationPlanResult,
} from '../../types';

// ============================================================================
// STATE TYPES
// ============================================================================

export type PlanningViewMode = 'calendar' | 'list';
export type CalendarMode = 'month' | 'week';

export interface PublicationPlanningState {
  viewMode: PlanningViewMode;
  calendarMode: CalendarMode;
  currentDate: string;                              // ISO date for calendar focus
  filters: PlanningFilters;
  selectedTopicIds: string[];                       // For bulk operations
  snapshotsByMap: Record<string, PerformanceSnapshot[]>;
  baselinesByTopic: Record<string, PerformanceSnapshot>;
  planResult: PublicationPlanResult | null;         // Latest AI-generated plan
  isGeneratingPlan: boolean;
  batchLaunchDate: string | null;                   // Configurable batch launch date
}

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialPublicationPlanningState: PublicationPlanningState = {
  viewMode: 'list',
  calendarMode: 'month',
  currentDate: new Date().toISOString().split('T')[0],
  filters: {},
  selectedTopicIds: [],
  snapshotsByMap: {},
  baselinesByTopic: {},
  planResult: null,
  isGeneratingPlan: false,
  batchLaunchDate: null,
};

// ============================================================================
// ACTION TYPES
// ============================================================================

export type PublicationPlanningAction =
  | { type: 'SET_PLANNING_VIEW_MODE'; payload: PlanningViewMode }
  | { type: 'SET_PLANNING_CALENDAR_MODE'; payload: CalendarMode }
  | { type: 'SET_PLANNING_CURRENT_DATE'; payload: string }
  | { type: 'SET_PLANNING_FILTERS'; payload: PlanningFilters }
  | { type: 'SET_PLANNING_SELECTED_TOPICS'; payload: string[] }
  | { type: 'TOGGLE_PLANNING_TOPIC_SELECTION'; payload: string }
  | { type: 'CLEAR_PLANNING_SELECTION' }
  | { type: 'SET_PERFORMANCE_SNAPSHOTS'; payload: { mapId: string; snapshots: PerformanceSnapshot[] } }
  | { type: 'ADD_PERFORMANCE_SNAPSHOT'; payload: { mapId: string; snapshot: PerformanceSnapshot } }
  | { type: 'SET_TOPIC_BASELINE'; payload: { topicId: string; snapshot: PerformanceSnapshot } }
  | { type: 'SET_PUBLICATION_PLAN_RESULT'; payload: PublicationPlanResult | null }
  | { type: 'SET_GENERATING_PLAN'; payload: boolean }
  | { type: 'SET_BATCH_LAUNCH_DATE'; payload: string | null }
  | { type: 'RESET_PUBLICATION_PLANNING' };

// ============================================================================
// REDUCER
// ============================================================================

export function publicationPlanningReducer(
  state: PublicationPlanningState,
  action: PublicationPlanningAction
): PublicationPlanningState {
  switch (action.type) {
    case 'SET_PLANNING_VIEW_MODE':
      return { ...state, viewMode: action.payload };

    case 'SET_PLANNING_CALENDAR_MODE':
      return { ...state, calendarMode: action.payload };

    case 'SET_PLANNING_CURRENT_DATE':
      return { ...state, currentDate: action.payload };

    case 'SET_PLANNING_FILTERS':
      return { ...state, filters: action.payload };

    case 'SET_PLANNING_SELECTED_TOPICS':
      return { ...state, selectedTopicIds: action.payload };

    case 'TOGGLE_PLANNING_TOPIC_SELECTION': {
      const topicId = action.payload;
      const isSelected = state.selectedTopicIds.includes(topicId);
      return {
        ...state,
        selectedTopicIds: isSelected
          ? state.selectedTopicIds.filter(id => id !== topicId)
          : [...state.selectedTopicIds, topicId]
      };
    }

    case 'CLEAR_PLANNING_SELECTION':
      return { ...state, selectedTopicIds: [] };

    case 'SET_PERFORMANCE_SNAPSHOTS':
      return {
        ...state,
        snapshotsByMap: {
          ...state.snapshotsByMap,
          [action.payload.mapId]: action.payload.snapshots
        }
      };

    case 'ADD_PERFORMANCE_SNAPSHOT':
      return {
        ...state,
        snapshotsByMap: {
          ...state.snapshotsByMap,
          [action.payload.mapId]: [
            ...(state.snapshotsByMap[action.payload.mapId] || []),
            action.payload.snapshot
          ]
        }
      };

    case 'SET_TOPIC_BASELINE':
      return {
        ...state,
        baselinesByTopic: {
          ...state.baselinesByTopic,
          [action.payload.topicId]: action.payload.snapshot
        }
      };

    case 'SET_PUBLICATION_PLAN_RESULT':
      return { ...state, planResult: action.payload };

    case 'SET_GENERATING_PLAN':
      return { ...state, isGeneratingPlan: action.payload };

    case 'SET_BATCH_LAUNCH_DATE':
      return { ...state, batchLaunchDate: action.payload };

    case 'RESET_PUBLICATION_PLANNING':
      return initialPublicationPlanningState;

    default:
      return state;
  }
}

// ============================================================================
// ACTION CREATORS
// ============================================================================

export const publicationPlanningActions = {
  setViewMode: (mode: PlanningViewMode): PublicationPlanningAction => ({
    type: 'SET_PLANNING_VIEW_MODE',
    payload: mode
  }),

  setCalendarMode: (mode: CalendarMode): PublicationPlanningAction => ({
    type: 'SET_PLANNING_CALENDAR_MODE',
    payload: mode
  }),

  setCurrentDate: (date: string): PublicationPlanningAction => ({
    type: 'SET_PLANNING_CURRENT_DATE',
    payload: date
  }),

  setFilters: (filters: PlanningFilters): PublicationPlanningAction => ({
    type: 'SET_PLANNING_FILTERS',
    payload: filters
  }),

  setSelectedTopics: (topicIds: string[]): PublicationPlanningAction => ({
    type: 'SET_PLANNING_SELECTED_TOPICS',
    payload: topicIds
  }),

  toggleTopicSelection: (topicId: string): PublicationPlanningAction => ({
    type: 'TOGGLE_PLANNING_TOPIC_SELECTION',
    payload: topicId
  }),

  clearSelection: (): PublicationPlanningAction => ({
    type: 'CLEAR_PLANNING_SELECTION'
  }),

  setPerformanceSnapshots: (mapId: string, snapshots: PerformanceSnapshot[]): PublicationPlanningAction => ({
    type: 'SET_PERFORMANCE_SNAPSHOTS',
    payload: { mapId, snapshots }
  }),

  addPerformanceSnapshot: (mapId: string, snapshot: PerformanceSnapshot): PublicationPlanningAction => ({
    type: 'ADD_PERFORMANCE_SNAPSHOT',
    payload: { mapId, snapshot }
  }),

  setTopicBaseline: (topicId: string, snapshot: PerformanceSnapshot): PublicationPlanningAction => ({
    type: 'SET_TOPIC_BASELINE',
    payload: { topicId, snapshot }
  }),

  setPlanResult: (result: PublicationPlanResult | null): PublicationPlanningAction => ({
    type: 'SET_PUBLICATION_PLAN_RESULT',
    payload: result
  }),

  setGeneratingPlan: (isGenerating: boolean): PublicationPlanningAction => ({
    type: 'SET_GENERATING_PLAN',
    payload: isGenerating
  }),

  setBatchLaunchDate: (date: string | null): PublicationPlanningAction => ({
    type: 'SET_BATCH_LAUNCH_DATE',
    payload: date
  }),

  reset: (): PublicationPlanningAction => ({
    type: 'RESET_PUBLICATION_PLANNING'
  }),
};
