/**
 * usePermissions Hook
 *
 * Hook for checking user permissions based on organization role.
 * Provides permission checking and feature gating utilities.
 *
 * Created: 2026-01-09 - Multi-tenancy Phase 5
 */

import { useCallback, useMemo } from 'react';
import { useOrganization } from './useOrganization';
import { OrganizationPermissions, OrganizationRole } from '../types';

// ============================================================================
// Permission Types
// ============================================================================

export type Permission = keyof OrganizationPermissions;

export type PermissionCheck =
  | Permission
  | Permission[]
  | { any: Permission[] }
  | { all: Permission[] };

// ============================================================================
// Hook
// ============================================================================

export function usePermissions() {
  const { permissions, membership, current: organization } = useOrganization();

  /**
   * Check if user has a specific permission
   */
  const can = useCallback((permission: Permission): boolean => {
    return permissions[permission] === true;
  }, [permissions]);

  /**
   * Check if user has any of the specified permissions
   */
  const canAny = useCallback((permissionList: Permission[]): boolean => {
    return permissionList.some((p) => permissions[p] === true);
  }, [permissions]);

  /**
   * Check if user has all of the specified permissions
   */
  const canAll = useCallback((permissionList: Permission[]): boolean => {
    return permissionList.every((p) => permissions[p] === true);
  }, [permissions]);

  /**
   * Flexible permission check supporting multiple formats
   */
  const check = useCallback((permissionCheck: PermissionCheck): boolean => {
    if (typeof permissionCheck === 'string') {
      return can(permissionCheck);
    }
    if (Array.isArray(permissionCheck)) {
      return canAll(permissionCheck);
    }
    if ('any' in permissionCheck) {
      return canAny(permissionCheck.any);
    }
    if ('all' in permissionCheck) {
      return canAll(permissionCheck.all);
    }
    return false;
  }, [can, canAny, canAll]);

  /**
   * Check if user has a minimum role level
   */
  const hasRole = useCallback((minRole: OrganizationRole): boolean => {
    if (!membership) return false;

    const roleHierarchy: OrganizationRole[] = ['viewer', 'editor', 'admin', 'owner'];
    const userRoleIndex = roleHierarchy.indexOf(membership.role);
    const minRoleIndex = roleHierarchy.indexOf(minRole);

    return userRoleIndex >= minRoleIndex;
  }, [membership]);

  /**
   * Check if user is the organization owner
   */
  const isOwner = useMemo(() => {
    return membership?.role === 'owner';
  }, [membership]);

  /**
   * Check if user is at least an admin
   */
  const isAdmin = useMemo(() => {
    return membership?.role === 'owner' || membership?.role === 'admin';
  }, [membership]);

  /**
   * Check if user can edit content
   */
  const canEdit = useMemo(() => {
    return membership?.role !== 'viewer';
  }, [membership]);

  /**
   * Get permission explanation for UI
   */
  const getPermissionReason = useCallback((permission: Permission): string | null => {
    if (can(permission)) return null;

    const reasons: Partial<Record<Permission, string>> = {
      canViewProjects: 'You need to be a member of this organization',
      canCreateProjects: 'Only editors and above can create projects',
      canDeleteProjects: 'Only admins and owners can delete projects',
      canManageMembers: 'Only admins and owners can manage members',
      canManageBilling: 'Only owners can manage billing',
      canViewCosts: 'Cost viewing is restricted by organization settings',
      canConfigureApiKeys: 'Only admins and owners can configure API keys',
      canUseContentGeneration: 'Content generation requires editor access or higher',
      canExportData: 'Data export requires editor access or higher',
      canViewAuditLog: 'Only admins and owners can view the audit log',
    };

    return reasons[permission] || 'You do not have permission for this action';
  }, [can]);

  return {
    // Permission checks
    can,
    canAny,
    canAll,
    check,

    // Role checks
    hasRole,
    isOwner,
    isAdmin,
    canEdit,

    // Current state
    permissions,
    role: membership?.role,
    organizationType: organization?.type,

    // Helpers
    getPermissionReason,
  };
}

// ============================================================================
// Feature Gate Hook
// ============================================================================

export function useFeatureGate(feature: string): {
  enabled: boolean;
  loading: boolean;
} {
  // For now, return enabled for all features
  // In production, this would check feature flags
  return {
    enabled: true,
    loading: false,
  };
}
