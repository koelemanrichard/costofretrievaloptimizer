// components/organization/MemberList.tsx
/**
 * MemberList Component
 *
 * Displays organization members with role badges.
 * Allows role changes and member removal for admins.
 *
 * Created: 2026-01-10 - Multi-tenancy Phase 1, Task 6
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useOrganizationContext } from './OrganizationProvider';
import { usePermissions } from '../../hooks/usePermissions';
import { useSupabase } from '../../services/supabaseClient';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { SmartLoader } from '../ui/FunLoaders';
import { OrganizationMember, OrganizationRole } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface MemberWithUser extends OrganizationMember {
  user?: {
    email: string;
    raw_user_meta_data?: {
      full_name?: string;
      name?: string;
      avatar_url?: string;
    };
  };
}

interface MemberListProps {
  onInviteClick?: () => void;
}

// ============================================================================
// Role Configuration
// ============================================================================

const ROLE_CONFIG: Record<OrganizationRole, { label: string; color: string; bgColor: string }> = {
  owner: {
    label: 'Owner',
    color: 'text-purple-300',
    bgColor: 'bg-purple-500/20 border-purple-500/30',
  },
  admin: {
    label: 'Admin',
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/20 border-blue-500/30',
  },
  editor: {
    label: 'Editor',
    color: 'text-green-300',
    bgColor: 'bg-green-500/20 border-green-500/30',
  },
  viewer: {
    label: 'Viewer',
    color: 'text-gray-300',
    bgColor: 'bg-gray-500/20 border-gray-500/30',
  },
};

const ASSIGNABLE_ROLES: OrganizationRole[] = ['admin', 'editor', 'viewer'];

// ============================================================================
// Helper Components
// ============================================================================

interface RoleBadgeProps {
  role: OrganizationRole;
}

function RoleBadge({ role }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role];
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded border ${config.bgColor} ${config.color}`}
    >
      {config.label}
    </span>
  );
}

interface MemberAvatarProps {
  name: string;
  avatarUrl?: string;
}

function MemberAvatar({ name, avatarUrl }: MemberAvatarProps) {
  const initial = name.charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-10 h-10 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-medium">
      {initial}
    </div>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'secondary' | 'ghost';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-200 mb-2">{title}</h3>
        <p className="text-gray-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <Loader className="w-4 h-4" /> : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface MemberRowProps {
  member: MemberWithUser;
  isCurrentUser: boolean;
  canManage: boolean;
  isOwner: boolean;
  onRoleChange: (memberId: string, newRole: OrganizationRole) => void;
  onRemove: (member: MemberWithUser) => void;
  isUpdating: boolean;
}

function MemberRow({
  member,
  isCurrentUser,
  canManage,
  isOwner,
  onRoleChange,
  onRemove,
  isUpdating,
}: MemberRowProps) {
  const displayName =
    member.user?.raw_user_meta_data?.full_name ||
    member.user?.raw_user_meta_data?.name ||
    member.user?.email ||
    'Unknown User';
  const email = member.user?.email || '';
  const avatarUrl = member.user?.raw_user_meta_data?.avatar_url;
  const isMemberOwner = member.role === 'owner';

  // Cannot modify owner or yourself
  const canModify = canManage && !isMemberOwner && !isCurrentUser;

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
      {/* Avatar */}
      <MemberAvatar name={displayName} avatarUrl={avatarUrl} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-gray-200 font-medium truncate">{displayName}</span>
          {isCurrentUser && (
            <span className="text-xs text-gray-500">(you)</span>
          )}
        </div>
        <p className="text-sm text-gray-400 truncate">{email}</p>
      </div>

      {/* Role Badge or Dropdown */}
      <div className="flex items-center gap-3">
        {canModify ? (
          <select
            value={member.role}
            onChange={(e) => onRoleChange(member.id, e.target.value as OrganizationRole)}
            disabled={isUpdating}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ASSIGNABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_CONFIG[role].label}
              </option>
            ))}
          </select>
        ) : (
          <RoleBadge role={member.role} />
        )}

        {/* Remove Button */}
        {canModify && (
          <button
            onClick={() => onRemove(member)}
            disabled={isUpdating}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
            title="Remove member"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MemberList({ onInviteClick }: MemberListProps) {
  const { current: organization } = useOrganizationContext();
  const { isAdmin, isOwner, can } = usePermissions();
  const supabase = useSupabase();

  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    member: MemberWithUser | null;
  }>({ isOpen: false, member: null });

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    };
    getUser();
  }, [supabase]);

  // Load members
  const loadMembers = useCallback(async () => {
    if (!organization) return;

    setIsLoading(true);
    setError(null);

    try {
      // Query organization members with user data
      // Note: Using user_profiles view which exposes auth.users data for PostgREST joins
      const { data, error: queryError } = await (supabase as any)
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
          user:user_profiles!organization_members_user_id_fkey (
            email,
            raw_user_meta_data
          )
        `)
        .eq('organization_id', organization.id)
        .not('accepted_at', 'is', null)
        .order('created_at', { ascending: true });

      if (queryError) throw queryError;

      // Transform data to match MemberWithUser interface
      const transformedMembers: MemberWithUser[] = (data || []).map((m: any) => ({
        id: m.id,
        organization_id: m.organization_id,
        user_id: m.user_id,
        role: m.role,
        permission_overrides: m.permission_overrides || {},
        invited_by: m.invited_by,
        invited_at: m.invited_at,
        accepted_at: m.accepted_at,
        created_at: m.created_at,
        user: m.user ? {
          email: m.user.email,
          raw_user_meta_data: m.user.raw_user_meta_data,
        } : undefined,
      }));

      setMembers(transformedMembers);
    } catch (err) {
      console.error('Failed to load members:', err);
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  }, [organization, supabase]);

  // Load members on mount and when organization changes
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Handle role change
  const handleRoleChange = useCallback(async (memberId: string, newRole: OrganizationRole) => {
    if (!organization) return;

    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const oldRole = member.role;
    if (oldRole === newRole) return;

    setIsUpdating(true);
    setError(null);

    try {
      // Update member role
      const { error: updateError } = await (supabase as any)
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (updateError) throw updateError;

      // Update local state
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );

      // Log audit event
      try {
        await supabase.rpc('log_audit_event', {
          p_org_id: organization.id,
          p_action: 'member.role_changed',
          p_target_type: 'organization_member',
          p_target_id: memberId,
          p_target_email: member.user?.email || null,
          p_old_value: { role: oldRole },
          p_new_value: { role: newRole },
        });
      } catch (auditError) {
        console.warn('Failed to log audit event:', auditError);
      }
    } catch (err) {
      console.error('Failed to update role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setIsUpdating(false);
    }
  }, [organization, members, supabase]);

  // Handle member removal
  const handleRemoveMember = useCallback(async () => {
    if (!organization || !confirmDialog.member) return;

    const member = confirmDialog.member;
    setIsUpdating(true);
    setError(null);

    try {
      // Delete member
      const { error: deleteError } = await (supabase as any)
        .from('organization_members')
        .delete()
        .eq('id', member.id);

      if (deleteError) throw deleteError;

      // Update local state
      setMembers((prev) => prev.filter((m) => m.id !== member.id));

      // Log audit event
      try {
        await supabase.rpc('log_audit_event', {
          p_org_id: organization.id,
          p_action: 'member.removed',
          p_target_type: 'organization_member',
          p_target_id: member.id,
          p_target_email: member.user?.email || null,
          p_old_value: { role: member.role, user_id: member.user_id },
          p_new_value: null,
        });
      } catch (auditError) {
        console.warn('Failed to log audit event:', auditError);
      }

      // Close dialog
      setConfirmDialog({ isOpen: false, member: null });
    } catch (err) {
      console.error('Failed to remove member:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setIsUpdating(false);
    }
  }, [organization, confirmDialog.member, supabase]);

  // Show remove confirmation
  const showRemoveConfirmation = useCallback((member: MemberWithUser) => {
    setConfirmDialog({ isOpen: true, member });
  }, []);

  // Cancel remove
  const cancelRemove = useCallback(() => {
    setConfirmDialog({ isOpen: false, member: null });
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-8 h-8" />
      </div>
    );
  }

  // No organization
  if (!organization) {
    return (
      <div className="text-center p-8 text-gray-400">
        No organization selected
      </div>
    );
  }

  const canManageMembers = can('canManageMembers');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-200">
          Members ({members.length})
        </h3>
        {canManageMembers && onInviteClick && (
          <Button variant="primary" size="sm" onClick={onInviteClick}>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Invite
            </span>
          </Button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Member list */}
      {members.length === 0 ? (
        <div className="text-center p-8 text-gray-400 bg-gray-800/30 rounded-lg">
          No members found
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isCurrentUser={member.user_id === currentUserId}
              canManage={canManageMembers}
              isOwner={isOwner}
              onRoleChange={handleRoleChange}
              onRemove={showRemoveConfirmation}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}

      {/* Role legend for non-admins */}
      {!isAdmin && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 mb-2">Role permissions:</p>
          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <RoleBadge role="owner" />
              <span>- Full access</span>
            </div>
            <div className="flex items-center gap-1">
              <RoleBadge role="admin" />
              <span>- Manage members & settings</span>
            </div>
            <div className="flex items-center gap-1">
              <RoleBadge role="editor" />
              <span>- Create & edit content</span>
            </div>
            <div className="flex items-center gap-1">
              <RoleBadge role="viewer" />
              <span>- View only</span>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Remove Member"
        message={`Are you sure you want to remove ${
          confirmDialog.member?.user?.raw_user_meta_data?.full_name ||
          confirmDialog.member?.user?.raw_user_meta_data?.name ||
          confirmDialog.member?.user?.email ||
          'this member'
        } from the organization? They will lose access to all organization resources.`}
        confirmLabel="Remove"
        confirmVariant="primary"
        onConfirm={handleRemoveMember}
        onCancel={cancelRemove}
        isLoading={isUpdating}
      />
    </div>
  );
}
