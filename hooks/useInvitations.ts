/**
 * useInvitations Hook
 *
 * Hook for managing invitations to organizations and projects.
 * Provides invitation creation, listing, acceptance, and revocation.
 *
 * Created: 2026-01-09 - Multi-tenancy Phase 2
 */

import { useCallback, useState, useMemo } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import { useAppState } from '../state/appState';
import {
  Invitation,
  InvitationWithInviter,
  CreateInvitationParams,
  AcceptInvitationResult,
  InvitationType,
} from '../types';

// ============================================================================
// Hook
// ============================================================================

export function useInvitations() {
  const { state } = useAppState();
  const supabase = useMemo(() => {
    if (!state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) {
      return null;
    }
    return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new invitation
   */
  const createInvitation = useCallback(async (
    params: CreateInvitationParams
  ): Promise<Invitation | null> => {
    if (!supabase) return null;

    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: insertError } = await supabase
        .from('invitations')
        .insert({
          type: params.type,
          organization_id: params.type === 'organization' ? params.organization_id : null,
          project_id: params.type === 'project' ? params.project_id : null,
          email: params.email.toLowerCase().trim(),
          role: params.role,
          message: params.message || null,
          invited_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Log audit event
      try {
        await supabase.rpc('log_audit_event', {
          p_org_id: params.organization_id || null,
          p_action: 'invitation.created',
          p_target_type: params.type,
          p_target_id: params.type === 'organization' ? params.organization_id : params.project_id,
          p_target_email: params.email,
          p_new_value: { role: params.role, type: params.type },
        });
      } catch (auditError) {
        console.warn('Failed to log audit event:', auditError);
      }

      return data;
    } catch (err) {
      console.error('Failed to create invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to create invitation');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Get pending invitations for an organization
   */
  const getOrganizationInvitations = useCallback(async (
    organizationId: string
  ): Promise<InvitationWithInviter[]> => {
    if (!supabase) return [];

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('invitations')
        .select(`
          *,
          inviter:user_profiles!invitations_invited_by_fkey (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .eq('type', 'organization')
        .eq('organization_id', organizationId)
        .is('accepted_at', null)
        .is('declined_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      // Always return an array (never undefined)
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Failed to get organization invitations:', err);
      setError(err instanceof Error ? err.message : 'Failed to get invitations');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Get pending invitations for a project
   */
  const getProjectInvitations = useCallback(async (
    projectId: string
  ): Promise<InvitationWithInviter[]> => {
    if (!supabase) return [];

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('invitations')
        .select(`
          *,
          inviter:user_profiles!invitations_invited_by_fkey (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .eq('type', 'project')
        .eq('project_id', projectId)
        .is('accepted_at', null)
        .is('declined_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      return data || [];
    } catch (err) {
      console.error('Failed to get project invitations:', err);
      setError(err instanceof Error ? err.message : 'Failed to get invitations');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Get invitations sent by the current user
   */
  const getSentInvitations = useCallback(async (): Promise<InvitationWithInviter[]> => {
    if (!supabase) return [];

    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: queryError } = await supabase
        .from('invitations')
        .select('*')
        .eq('invited_by', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (queryError) throw queryError;

      return data || [];
    } catch (err) {
      console.error('Failed to get sent invitations:', err);
      setError(err instanceof Error ? err.message : 'Failed to get invitations');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Get pending invitations for the current user's email
   */
  const getPendingInvitationsForUser = useCallback(async (): Promise<Invitation[]> => {
    if (!supabase) return [];

    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Not authenticated');

      const { data, error: queryError } = await supabase
        .from('invitations')
        .select('*')
        .eq('email', user.email.toLowerCase())
        .is('accepted_at', null)
        .is('declined_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      return data || [];
    } catch (err) {
      console.error('Failed to get pending invitations:', err);
      setError(err instanceof Error ? err.message : 'Failed to get invitations');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Accept an invitation by token
   */
  const acceptInvitation = useCallback(async (
    token: string
  ): Promise<AcceptInvitationResult | null> => {
    if (!supabase) return null;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('accept_invitation', { p_token: token });

      if (rpcError) throw rpcError;

      return data as AcceptInvitationResult;
    } catch (err) {
      console.error('Failed to accept invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Decline an invitation by token
   */
  const declineInvitation = useCallback(async (
    token: string
  ): Promise<boolean> => {
    if (!supabase) return false;

    setIsLoading(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase
        .rpc('decline_invitation', { p_token: token });

      if (rpcError) throw rpcError;

      return true;
    } catch (err) {
      console.error('Failed to decline invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to decline invitation');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Revoke (delete) an invitation
   */
  const revokeInvitation = useCallback(async (
    invitationId: string
  ): Promise<boolean> => {
    if (!supabase) return false;

    setIsLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (deleteError) throw deleteError;

      return true;
    } catch (err) {
      console.error('Failed to revoke invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  /**
   * Resend an invitation (resets expiry)
   */
  const resendInvitation = useCallback(async (
    invitationId: string
  ): Promise<boolean> => {
    if (!supabase) return false;

    setIsLoading(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase
        .rpc('resend_invitation', { p_invitation_id: invitationId });

      if (rpcError) throw rpcError;

      return true;
    } catch (err) {
      console.error('Failed to resend invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to resend invitation');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  return {
    // State
    isLoading,
    error,

    // Actions
    createInvitation,
    getOrganizationInvitations,
    getProjectInvitations,
    getSentInvitations,
    getPendingInvitationsForUser,
    acceptInvitation,
    declineInvitation,
    revokeInvitation,
    resendInvitation,
  };
}
