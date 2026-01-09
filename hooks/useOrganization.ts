/**
 * useOrganization Hook
 *
 * Hook for accessing and managing organization context in multi-tenancy.
 * Provides organization loading, switching, and permission checking.
 *
 * Created: 2026-01-09 - Multi-tenancy Phase 1
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import {
  Organization,
  OrganizationMember,
  OrganizationWithMembership,
  OrganizationPermissions,
  OrganizationRole,
} from '../types';

// ============================================================================
// Permission Computation
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

function computePermissions(membership: OrganizationMember | null): OrganizationPermissions {
  if (!membership) return getDefaultPermissions();

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
// Hook
// ============================================================================

export function useOrganization() {
  const supabase = getSupabaseClient();

  // Local state (will be moved to global state in future integration)
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [currentMembership, setCurrentMembership] = useState<OrganizationMember | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationWithMembership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Compute permissions from current membership
  const permissions = useMemo(() => computePermissions(currentMembership), [currentMembership]);

  // Load organizations for the current user
  const loadOrganizations = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: memberships, error: queryError } = await supabase
        .from('organization_members')
        .select(`
          id,
          organization_id,
          user_id,
          role,
          permission_overrides,
          invited_by,
          invited_at,
          accepted_at,
          created_at,
          organization:organizations (
            id,
            name,
            slug,
            type,
            owner_id,
            settings,
            billing_email,
            stripe_customer_id,
            cost_visibility,
            branding,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .not('accepted_at', 'is', null);

      if (queryError) throw queryError;

      const orgs: OrganizationWithMembership[] = (memberships || [])
        .filter((m: any) => m.organization) // Filter out any null organizations
        .map((m: any) => ({
          ...m.organization,
          membership: {
            id: m.id,
            organization_id: m.organization_id,
            user_id: m.user_id,
            role: m.role,
            permission_overrides: m.permission_overrides || {},
            invited_by: m.invited_by,
            invited_at: m.invited_at,
            accepted_at: m.accepted_at,
            created_at: m.created_at,
          },
        }));

      setOrganizations(orgs);

      // Auto-select personal org if none selected
      if (!currentOrganization && orgs.length > 0) {
        const personalOrg = orgs.find((o) => o.type === 'personal');
        if (personalOrg) {
          await switchOrganization(personalOrg.id);
        }
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase, currentOrganization]);

  // Switch to a different organization
  const switchOrganization = useCallback(async (orgId: string) => {
    setIsSwitching(true);
    setError(null);

    try {
      const org = organizations.find((o) => o.id === orgId);
      if (!org) {
        throw new Error('Organization not found');
      }

      // Update user metadata with current org
      await supabase.auth.updateUser({
        data: {
          current_organization_id: orgId,
          current_organization_role: org.membership.role,
        },
      });

      setCurrentOrganization(org);
      setCurrentMembership(org.membership);
    } catch (err) {
      console.error('Failed to switch organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch organization');
    } finally {
      setIsSwitching(false);
    }
  }, [organizations, supabase]);

  // Create a new organization
  const createOrganization = useCallback(async (
    name: string,
    type: 'team' | 'enterprise' = 'team'
  ): Promise<OrganizationWithMembership | null> => {
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug: `${slug}-${Date.now()}`, // Ensure uniqueness
        type,
        owner_id: userId,
        billing_email: user.email,
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Add user as owner member
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: userId,
        role: 'owner',
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (memberError) throw memberError;

    const newOrg: OrganizationWithMembership = {
      ...org,
      membership: {
        id: membership.id,
        organization_id: membership.organization_id,
        user_id: membership.user_id,
        role: membership.role,
        permission_overrides: membership.permission_overrides || {},
        invited_by: membership.invited_by,
        invited_at: membership.invited_at,
        accepted_at: membership.accepted_at,
        created_at: membership.created_at,
      },
    };

    setOrganizations((prev) => [...prev, newOrg]);

    // Log audit event
    try {
      await supabase.rpc('log_audit_event', {
        p_org_id: org.id,
        p_action: 'org.created',
        p_target_type: 'organization',
        p_target_id: org.id,
        p_new_value: { name, type },
      });
    } catch (auditError) {
      console.warn('Failed to log audit event:', auditError);
    }

    return newOrg;
  }, [userId, supabase]);

  // Load organizations when user changes
  useEffect(() => {
    if (userId && organizations.length === 0 && !isLoading) {
      loadOrganizations();
    }
  }, [userId, organizations.length, isLoading, loadOrganizations]);

  return {
    // Current context
    current: currentOrganization,
    membership: currentMembership,
    permissions,

    // All organizations
    organizations,

    // Loading states
    isLoading,
    isSwitching,
    error,

    // Actions
    loadOrganizations,
    switchOrganization,
    createOrganization,

    // Helpers
    isPersonalOrg: currentOrganization?.type === 'personal',
    hasMultipleOrgs: organizations.length > 1,
  };
}
