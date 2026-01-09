/**
 * Organization State Slice
 *
 * Manages organization context, membership, and permissions for multi-tenancy.
 *
 * Created: 2026-01-09 - Multi-tenancy Phase 1
 */

import {
  Organization,
  OrganizationMember,
  OrganizationWithMembership,
  OrganizationPermissions,
  OrganizationRole,
} from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface OrganizationState {
  currentOrganization: Organization | null;
  currentMembership: OrganizationMember | null;
  organizations: OrganizationWithMembership[];
  permissions: OrganizationPermissions;
  isLoadingOrganizations: boolean;
  isSwitchingOrganization: boolean;
  error: string | null;
}

export type OrganizationAction =
  | { type: 'SET_ORGANIZATIONS'; payload: OrganizationWithMembership[] }
  | { type: 'SET_CURRENT_ORGANIZATION'; payload: { org: Organization; membership: OrganizationMember } }
  | { type: 'CLEAR_CURRENT_ORGANIZATION' }
  | { type: 'SET_ORGANIZATIONS_LOADING'; payload: boolean }
  | { type: 'SET_SWITCHING_ORGANIZATION'; payload: boolean }
  | { type: 'SET_ORGANIZATION_ERROR'; payload: string | null }
  | { type: 'UPDATE_ORGANIZATION'; payload: Partial<Organization> & { id: string } }
  | { type: 'ADD_ORGANIZATION'; payload: OrganizationWithMembership };

// ============================================================================
// Initial State
// ============================================================================

export const initialOrganizationState: OrganizationState = {
  currentOrganization: null,
  currentMembership: null,
  organizations: [],
  permissions: getDefaultPermissions(),
  isLoadingOrganizations: false,
  isSwitchingOrganization: false,
  error: null,
};

// ============================================================================
// Reducer
// ============================================================================

export function organizationReducer(
  state: OrganizationState,
  action: OrganizationAction
): OrganizationState {
  switch (action.type) {
    case 'SET_ORGANIZATIONS':
      return { ...state, organizations: action.payload, isLoadingOrganizations: false };

    case 'SET_CURRENT_ORGANIZATION':
      return {
        ...state,
        currentOrganization: action.payload.org,
        currentMembership: action.payload.membership,
        permissions: computePermissions(action.payload.membership),
        isSwitchingOrganization: false,
      };

    case 'CLEAR_CURRENT_ORGANIZATION':
      return {
        ...state,
        currentOrganization: null,
        currentMembership: null,
        permissions: getDefaultPermissions(),
      };

    case 'SET_ORGANIZATIONS_LOADING':
      return { ...state, isLoadingOrganizations: action.payload };

    case 'SET_SWITCHING_ORGANIZATION':
      return { ...state, isSwitchingOrganization: action.payload };

    case 'SET_ORGANIZATION_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoadingOrganizations: false,
        isSwitchingOrganization: false,
      };

    case 'UPDATE_ORGANIZATION':
      return {
        ...state,
        currentOrganization: state.currentOrganization?.id === action.payload.id
          ? { ...state.currentOrganization, ...action.payload }
          : state.currentOrganization,
        organizations: state.organizations.map((org) =>
          org.id === action.payload.id ? { ...org, ...action.payload } : org
        ),
      };

    case 'ADD_ORGANIZATION':
      return { ...state, organizations: [...state.organizations, action.payload] };

    default:
      return state;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultPermissions(): OrganizationPermissions {
  return {
    canViewProjects: false,
    canCreateProjects: false,
    canDeleteProjects: false,
    canManageMembers: false,
    canManageBilling: false,
    canViewCosts: false,
    canConfigureApiKeys: false,
    canUseContentGeneration: false,
    canExportData: false,
    canViewAuditLog: false,
  };
}

function computePermissions(membership: OrganizationMember): OrganizationPermissions {
  const role = membership.role;
  const overrides = membership.permission_overrides || {};

  const basePermissions: Record<OrganizationRole, OrganizationPermissions> = {
    owner: {
      canViewProjects: true,
      canCreateProjects: true,
      canDeleteProjects: true,
      canManageMembers: true,
      canManageBilling: true,
      canViewCosts: true,
      canConfigureApiKeys: true,
      canUseContentGeneration: true,
      canExportData: true,
      canViewAuditLog: true,
    },
    admin: {
      canViewProjects: true,
      canCreateProjects: true,
      canDeleteProjects: true,
      canManageMembers: true,
      canManageBilling: false,
      canViewCosts: true,
      canConfigureApiKeys: true,
      canUseContentGeneration: true,
      canExportData: true,
      canViewAuditLog: true,
    },
    editor: {
      canViewProjects: true,
      canCreateProjects: true,
      canDeleteProjects: false,
      canManageMembers: false,
      canManageBilling: false,
      canViewCosts: false,
      canConfigureApiKeys: false,
      canUseContentGeneration: true,
      canExportData: true,
      canViewAuditLog: false,
    },
    viewer: {
      canViewProjects: true,
      canCreateProjects: false,
      canDeleteProjects: false,
      canManageMembers: false,
      canManageBilling: false,
      canViewCosts: false,
      canConfigureApiKeys: false,
      canUseContentGeneration: false,
      canExportData: false,
      canViewAuditLog: false,
    },
  };

  const permissions = { ...basePermissions[role] };

  // Apply permission overrides
  for (const [key, value] of Object.entries(overrides)) {
    if (key in permissions && typeof value === 'boolean') {
      (permissions as Record<string, boolean>)[key] = value;
    }
  }

  return permissions;
}

// ============================================================================
// Action Creators
// ============================================================================

export const organizationActions = {
  setOrganizations: (orgs: OrganizationWithMembership[]): OrganizationAction => ({
    type: 'SET_ORGANIZATIONS',
    payload: orgs,
  }),

  setCurrentOrganization: (org: Organization, membership: OrganizationMember): OrganizationAction => ({
    type: 'SET_CURRENT_ORGANIZATION',
    payload: { org, membership },
  }),

  clearCurrentOrganization: (): OrganizationAction => ({
    type: 'CLEAR_CURRENT_ORGANIZATION',
  }),

  setLoading: (loading: boolean): OrganizationAction => ({
    type: 'SET_ORGANIZATIONS_LOADING',
    payload: loading,
  }),

  setSwitching: (switching: boolean): OrganizationAction => ({
    type: 'SET_SWITCHING_ORGANIZATION',
    payload: switching,
  }),

  setError: (error: string | null): OrganizationAction => ({
    type: 'SET_ORGANIZATION_ERROR',
    payload: error,
  }),

  updateOrganization: (updates: Partial<Organization> & { id: string }): OrganizationAction => ({
    type: 'UPDATE_ORGANIZATION',
    payload: updates,
  }),

  addOrganization: (org: OrganizationWithMembership): OrganizationAction => ({
    type: 'ADD_ORGANIZATION',
    payload: org,
  }),
};
