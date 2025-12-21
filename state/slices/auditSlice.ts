/**
 * Audit Slice - Handles audit-related state
 *
 * Manages:
 * - Linking Audit (Phase 5)
 * - Unified Audit (Phase 6)
 */

import type {
  LinkingAuditResult,
  LinkingAutoFix,
  LinkingFixHistoryEntry,
  UnifiedAuditResult,
  AuditFixHistoryEntry,
} from '../../types';
import type { AuditProgress } from '../../services/ai/unifiedAudit';

// ============================================================================
// STATE TYPES
// ============================================================================

export interface LinkingAuditState {
  result: LinkingAuditResult | null;
  isRunning: boolean;
  pendingFixes: LinkingAutoFix[];
  fixHistory: LinkingFixHistoryEntry[];
  lastAuditId: string | null;
}

export interface UnifiedAuditState {
  result: UnifiedAuditResult | null;
  isRunning: boolean;
  progress: AuditProgress | null;
  fixHistory: AuditFixHistoryEntry[];
  lastAuditId: string | null;
}

export interface AuditState {
  linking: LinkingAuditState;
  unified: UnifiedAuditState;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

export const initialLinkingAuditState: LinkingAuditState = {
  result: null,
  isRunning: false,
  pendingFixes: [],
  fixHistory: [],
  lastAuditId: null,
};

export const initialUnifiedAuditState: UnifiedAuditState = {
  result: null,
  isRunning: false,
  progress: null,
  fixHistory: [],
  lastAuditId: null,
};

export const initialAuditState: AuditState = {
  linking: initialLinkingAuditState,
  unified: initialUnifiedAuditState,
};

// ============================================================================
// ACTION TYPES
// ============================================================================

export type AuditAction =
  // Linking Audit actions
  | { type: 'SET_LINKING_AUDIT_RESULT'; payload: LinkingAuditResult | null }
  | { type: 'SET_LINKING_AUDIT_RUNNING'; payload: boolean }
  | { type: 'SET_LINKING_PENDING_FIXES'; payload: LinkingAutoFix[] }
  | { type: 'ADD_LINKING_FIX_HISTORY'; payload: LinkingFixHistoryEntry }
  | { type: 'CLEAR_LINKING_FIX_HISTORY' }
  | { type: 'SET_LINKING_LAST_AUDIT_ID'; payload: string | null }
  | { type: 'RESET_LINKING_AUDIT' }
  // Unified Audit actions
  | { type: 'SET_UNIFIED_AUDIT_RESULT'; payload: UnifiedAuditResult | null }
  | { type: 'SET_UNIFIED_AUDIT_RUNNING'; payload: boolean }
  | { type: 'SET_UNIFIED_AUDIT_PROGRESS'; payload: AuditProgress | null }
  | { type: 'SET_UNIFIED_AUDIT_HISTORY'; payload: AuditFixHistoryEntry[] }
  | { type: 'ADD_UNIFIED_AUDIT_HISTORY'; payload: AuditFixHistoryEntry }
  | { type: 'SET_UNIFIED_AUDIT_ID'; payload: string | null }
  | { type: 'RESET_UNIFIED_AUDIT' };

// ============================================================================
// REDUCER
// ============================================================================

export function auditReducer(state: AuditState, action: AuditAction): AuditState {
  switch (action.type) {
    // Linking Audit
    case 'SET_LINKING_AUDIT_RESULT':
      return {
        ...state,
        linking: { ...state.linking, result: action.payload }
      };

    case 'SET_LINKING_AUDIT_RUNNING':
      return {
        ...state,
        linking: { ...state.linking, isRunning: action.payload }
      };

    case 'SET_LINKING_PENDING_FIXES':
      return {
        ...state,
        linking: { ...state.linking, pendingFixes: action.payload }
      };

    case 'ADD_LINKING_FIX_HISTORY':
      return {
        ...state,
        linking: {
          ...state.linking,
          fixHistory: [...state.linking.fixHistory, action.payload]
        }
      };

    case 'CLEAR_LINKING_FIX_HISTORY':
      return {
        ...state,
        linking: { ...state.linking, fixHistory: [] }
      };

    case 'SET_LINKING_LAST_AUDIT_ID':
      return {
        ...state,
        linking: { ...state.linking, lastAuditId: action.payload }
      };

    case 'RESET_LINKING_AUDIT':
      return {
        ...state,
        linking: initialLinkingAuditState
      };

    // Unified Audit
    case 'SET_UNIFIED_AUDIT_RESULT':
      return {
        ...state,
        unified: { ...state.unified, result: action.payload }
      };

    case 'SET_UNIFIED_AUDIT_RUNNING':
      return {
        ...state,
        unified: { ...state.unified, isRunning: action.payload }
      };

    case 'SET_UNIFIED_AUDIT_PROGRESS':
      return {
        ...state,
        unified: { ...state.unified, progress: action.payload }
      };

    case 'SET_UNIFIED_AUDIT_HISTORY':
      return {
        ...state,
        unified: { ...state.unified, fixHistory: action.payload }
      };

    case 'ADD_UNIFIED_AUDIT_HISTORY':
      return {
        ...state,
        unified: {
          ...state.unified,
          fixHistory: [...state.unified.fixHistory, action.payload]
        }
      };

    case 'SET_UNIFIED_AUDIT_ID':
      return {
        ...state,
        unified: { ...state.unified, lastAuditId: action.payload }
      };

    case 'RESET_UNIFIED_AUDIT':
      return {
        ...state,
        unified: initialUnifiedAuditState
      };

    default:
      return state;
  }
}

// ============================================================================
// ACTION CREATORS
// ============================================================================

export const linkingAuditActions = {
  setResult: (result: LinkingAuditResult | null): AuditAction => ({
    type: 'SET_LINKING_AUDIT_RESULT',
    payload: result
  }),

  setRunning: (running: boolean): AuditAction => ({
    type: 'SET_LINKING_AUDIT_RUNNING',
    payload: running
  }),

  setPendingFixes: (fixes: LinkingAutoFix[]): AuditAction => ({
    type: 'SET_LINKING_PENDING_FIXES',
    payload: fixes
  }),

  addFixHistory: (entry: LinkingFixHistoryEntry): AuditAction => ({
    type: 'ADD_LINKING_FIX_HISTORY',
    payload: entry
  }),

  clearFixHistory: (): AuditAction => ({
    type: 'CLEAR_LINKING_FIX_HISTORY'
  }),

  setLastAuditId: (id: string | null): AuditAction => ({
    type: 'SET_LINKING_LAST_AUDIT_ID',
    payload: id
  }),

  reset: (): AuditAction => ({
    type: 'RESET_LINKING_AUDIT'
  }),
};

export const unifiedAuditActions = {
  setResult: (result: UnifiedAuditResult | null): AuditAction => ({
    type: 'SET_UNIFIED_AUDIT_RESULT',
    payload: result
  }),

  setRunning: (running: boolean): AuditAction => ({
    type: 'SET_UNIFIED_AUDIT_RUNNING',
    payload: running
  }),

  setProgress: (progress: AuditProgress | null): AuditAction => ({
    type: 'SET_UNIFIED_AUDIT_PROGRESS',
    payload: progress
  }),

  setHistory: (history: AuditFixHistoryEntry[]): AuditAction => ({
    type: 'SET_UNIFIED_AUDIT_HISTORY',
    payload: history
  }),

  addHistory: (entry: AuditFixHistoryEntry): AuditAction => ({
    type: 'ADD_UNIFIED_AUDIT_HISTORY',
    payload: entry
  }),

  setLastAuditId: (id: string | null): AuditAction => ({
    type: 'SET_UNIFIED_AUDIT_ID',
    payload: id
  }),

  reset: (): AuditAction => ({
    type: 'RESET_UNIFIED_AUDIT'
  }),
};
