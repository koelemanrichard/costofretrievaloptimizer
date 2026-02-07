/**
 * usePermissions Hook
 *
 * Hook for checking user permissions based on organization role.
 * Provides permission checking and feature gating utilities.
 *
 * Created: 2026-01-09 - Multi-tenancy Phase 5
 * Updated: 2026-01-11 - Added actual feature gate RPC calls
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useOrganizationContext } from '../components/organization/OrganizationProvider';
import { OrganizationPermissions, OrganizationRole } from '../types';
import { useAppState } from '../state/appState';
import { getSupabaseClient } from '../services/supabaseClient';

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
  const { permissions, membership, current: organization } = useOrganizationContext();

  // Ensure permissions is always a valid object with safe defaults
  const safePermissions = permissions || {
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

  /**
   * Check if user has a specific permission
   */
  const can = useCallback((permission: Permission): boolean => {
    return safePermissions[permission] === true;
  }, [safePermissions]);

  /**
   * Check if user has any of the specified permissions
   */
  const canAny = useCallback((permissionList: Permission[]): boolean => {
    return (permissionList || []).some((p) => safePermissions[p] === true);
  }, [safePermissions]);

  /**
   * Check if user has all of the specified permissions
   */
  const canAll = useCallback((permissionList: Permission[]): boolean => {
    return (permissionList || []).every((p) => safePermissions[p] === true);
  }, [safePermissions]);

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

    // Current state (use safe permissions)
    permissions: safePermissions,
    role: membership?.role,
    organizationType: organization?.type,

    // Helpers
    getPermissionReason,
  };
}

// ============================================================================
// Feature Gate Hook
// ============================================================================

/**
 * Feature gate hook that checks if a feature is enabled for the current organization.
 * Uses the can_use_feature() RPC to check module subscriptions and role access.
 *
 * @param feature - The feature flag to check (e.g., 'content_generation', 'audit_system')
 * @returns Object with enabled status, loading state, and reason for disabled features
 */
export function useFeatureGate(feature: string): {
  enabled: boolean;
  loading: boolean;
  reason?: string;
} {
  const { state } = useAppState();
  const { current: organization } = useOrganizationContext();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<string | undefined>();

  const supabase = useMemo(() => {
    if (!state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) {
      return null;
    }
    return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  useEffect(() => {
    async function checkFeature() {
      // If no organization or supabase, default to enabled (legacy behavior)
      if (!organization || !supabase) {
        setEnabled(true);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase.rpc('can_use_feature', {
          p_org_id: organization.id,
          p_feature: feature,
        });

        if (error) {
          // If the RPC fails (function doesn't exist yet), default to enabled
          console.warn('[useFeatureGate] RPC error, defaulting to enabled:', error);
          setEnabled(true);
          setReason(undefined);
        } else if (data === true) {
          // Feature is explicitly enabled via subscription
          setEnabled(true);
          setReason(undefined);
        } else {
          // Grace period: default to enabled until billing module is fully deployed.
          // When org_subscriptions are enforced, switch to setEnabled(false).
          console.info(`[useFeatureGate] Feature "${feature}" not explicitly enabled for org ${organization.id}. ` +
            'Defaulting to enabled during billing transition period.');
          setEnabled(true);
          setReason(undefined);
        }
      } catch (err) {
        console.error('[useFeatureGate] Error checking feature:', err);
        // Default to enabled on error
        setEnabled(true);
        setReason(undefined);
      } finally {
        setLoading(false);
      }
    }

    checkFeature();
  }, [organization, supabase, feature]);

  return { enabled, loading, reason };
}

/**
 * Get all available features for the current organization.
 * Uses get_available_features() RPC.
 */
export function useAvailableFeatures(): {
  features: string[];
  loading: boolean;
} {
  const { state } = useAppState();
  const { current: organization } = useOrganizationContext();
  const [features, setFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => {
    if (!state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) {
      return null;
    }
    return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  useEffect(() => {
    async function fetchFeatures() {
      if (!organization || !supabase) {
        setFeatures([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase.rpc('get_available_features', {
          p_org_id: organization.id,
        });

        if (error) {
          console.warn('[useAvailableFeatures] RPC error:', error);
          setFeatures([]);
        } else {
          setFeatures(data || []);
        }
      } catch (err) {
        console.error('[useAvailableFeatures] Error:', err);
        setFeatures([]);
      } finally {
        setLoading(false);
      }
    }

    fetchFeatures();
  }, [organization, supabase]);

  return { features, loading };
}
