/**
 * MemberManagementModal Component
 *
 * A comprehensive modal for managing organization members and invitations.
 * Combines MemberList and InviteMemberModal with tabbed navigation.
 *
 * Features:
 * - Tab navigation between "Members" and "Pending Invitations"
 * - Member list with role management
 * - Pending invitations with revoke/resend functionality
 * - Invitation count badge on pending tab
 * - Integrated invite modal
 *
 * Created: 2026-01-10 - Multi-tenancy Phase 2, Task 8
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SmartLoader } from '../ui/FunLoaders';
import { MemberList } from './MemberList';
import { InviteMemberModal } from './InviteMemberModal';
import { useOrganizationContext } from './OrganizationProvider';
import { useInvitations } from '../../hooks/useInvitations';
import { usePermissions } from '../../hooks/usePermissions';
import { InvitationWithInviter } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface MemberManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InvitationRowProps {
  invitation: InvitationWithInviter;
  onRevoke: () => void;
  onResend: () => void;
  canManage: boolean;
  isLoading?: boolean;
}

type TabType = 'members' | 'pending';

// ============================================================================
// Role Badge Helper
// ============================================================================

const ROLE_COLORS: Record<string, { text: string; bg: string }> = {
  admin: { text: 'text-blue-300', bg: 'bg-blue-500/20 border-blue-500/30' },
  editor: { text: 'text-green-300', bg: 'bg-green-500/20 border-green-500/30' },
  viewer: { text: 'text-gray-300', bg: 'bg-gray-500/20 border-gray-500/30' },
};

function RoleBadge({ role }: { role: string }) {
  const colors = ROLE_COLORS[role] || ROLE_COLORS.viewer;
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded border capitalize ${colors.bg} ${colors.text}`}
    >
      {role}
    </span>
  );
}

// ============================================================================
// Invitation Row Component
// ============================================================================

function InvitationRow({
  invitation,
  onRevoke,
  onResend,
  canManage,
  isLoading,
}: InvitationRowProps) {
  const expiresAt = new Date(invitation.expires_at);
  const isExpired = expiresAt < new Date();
  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Get inviter name
  const inviterName =
    invitation.inviter?.raw_user_meta_data?.full_name ||
    invitation.inviter?.raw_user_meta_data?.name ||
    invitation.inviter?.email ||
    'Unknown';

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg">
      {/* Email initial avatar */}
      <div className="w-10 h-10 rounded-full bg-amber-600/30 flex items-center justify-center text-amber-300 font-medium flex-shrink-0">
        {invitation.email.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-gray-200 font-medium truncate">{invitation.email}</p>
          <RoleBadge role={invitation.role} />
        </div>
        <p className="text-sm text-gray-400 truncate">
          Invited by {inviterName}
          {' - '}
          {isExpired ? (
            <span className="text-red-400">Expired</span>
          ) : (
            <span className="text-amber-400">
              Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>

      {/* Actions */}
      {canManage && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onResend}
            disabled={isLoading}
            title="Resend invitation"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Resend
          </Button>
          <button
            onClick={onRevoke}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
            title="Revoke invitation"
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
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Confirm Dialog Component
// ============================================================================

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-200 mb-2">{title}</h3>
        <p className="text-gray-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <SmartLoader context="loading" size="sm" showText={false} /> : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MemberManagementModal({ isOpen, onClose }: MemberManagementModalProps) {
  const { current: organization } = useOrganizationContext();
  const {
    getOrganizationInvitations,
    revokeInvitation,
    resendInvitation,
    isLoading: inviteLoading,
  } = useInvitations();
  const { can } = usePermissions();

  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [pendingInvitations, setPendingInvitations] = useState<InvitationWithInviter[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    invitationId: string | null;
    email: string;
  }>({ isOpen: false, invitationId: null, email: '' });

  const canManageMembers = can('canManageMembers');

  // Load pending invitations
  const loadInvitations = useCallback(async () => {
    if (!organization || !isOpen) return;

    setIsLoadingInvitations(true);
    setError(null);

    try {
      const invitations = await getOrganizationInvitations(organization.id);
      setPendingInvitations(invitations);
    } catch (err) {
      console.error('Failed to load invitations:', err);
      setError('Failed to load invitations');
    } finally {
      setIsLoadingInvitations(false);
    }
  }, [organization, isOpen, getOrganizationInvitations]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations, refreshKey]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('members');
      setError(null);
    }
  }, [isOpen]);

  // Handle revoke invitation with confirmation
  const showRevokeConfirmation = useCallback((invitationId: string, email: string) => {
    setConfirmDialog({ isOpen: true, invitationId, email });
  }, []);

  const handleConfirmRevoke = useCallback(async () => {
    if (!confirmDialog.invitationId) return;

    setActionInProgress(confirmDialog.invitationId);
    setError(null);

    try {
      const success = await revokeInvitation(confirmDialog.invitationId);
      if (success) {
        setPendingInvitations((prev) =>
          prev.filter((i) => i.id !== confirmDialog.invitationId)
        );
      }
    } catch (err) {
      console.error('Failed to revoke invitation:', err);
      setError('Failed to revoke invitation');
    } finally {
      setActionInProgress(null);
      setConfirmDialog({ isOpen: false, invitationId: null, email: '' });
    }
  }, [confirmDialog.invitationId, revokeInvitation]);

  const cancelRevoke = useCallback(() => {
    setConfirmDialog({ isOpen: false, invitationId: null, email: '' });
  }, []);

  // Handle resend invitation
  const handleResend = useCallback(async (invitationId: string) => {
    setActionInProgress(invitationId);
    setError(null);

    try {
      const success = await resendInvitation(invitationId);
      if (success) {
        // Refresh to get updated expiry
        setRefreshKey((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Failed to resend invitation:', err);
      setError('Failed to resend invitation');
    } finally {
      setActionInProgress(null);
    }
  }, [resendInvitation]);

  // Handle successful invite
  const handleInviteSuccess = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    setActiveTab('pending');
  }, []);

  // Open invite modal
  const handleInviteClick = useCallback(() => {
    setIsInviteModalOpen(true);
  }, []);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Team Members"
        description={`Manage members of ${organization?.name || 'your organization'}`}
        maxWidth="max-w-2xl"
        zIndex="z-[60]"
      >
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Members
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Pending Invitations
            {pendingInvitations.length > 0 && (
              <span className="bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {pendingInvitations.length}
              </span>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'members' && (
          <MemberList key={refreshKey} onInviteClick={handleInviteClick} />
        )}

        {activeTab === 'pending' && (
          <div className="space-y-4">
            {/* Header with invite button */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-200">
                Pending ({pendingInvitations.length})
              </h3>
              {canManageMembers && (
                <Button variant="primary" size="sm" onClick={handleInviteClick}>
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

            {/* Invitations list */}
            {isLoadingInvitations ? (
              <div className="flex items-center justify-center p-8">
                <SmartLoader context="loading" size="lg" showText={false} />
              </div>
            ) : pendingInvitations.length === 0 ? (
              <div className="text-center p-8 text-gray-400 bg-gray-800/30 rounded-lg">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-400 mb-2">No pending invitations</p>
                {canManageMembers && (
                  <p className="text-sm text-gray-500">
                    Invite team members to collaborate on your projects
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => (
                  <InvitationRow
                    key={invitation.id}
                    invitation={invitation}
                    onRevoke={() => showRevokeConfirmation(invitation.id, invitation.email)}
                    onResend={() => handleResend(invitation.id)}
                    canManage={canManageMembers}
                    isLoading={actionInProgress === invitation.id || inviteLoading}
                  />
                ))}
              </div>
            )}

            {/* Invitation expiry info */}
            {pendingInvitations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs text-gray-500">
                  Invitations expire after 7 days. You can resend an invitation to reset the expiry.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={handleInviteSuccess}
      />

      {/* Revoke Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Revoke Invitation"
        message={`Are you sure you want to revoke the invitation sent to ${confirmDialog.email}? They will no longer be able to join the organization using this invitation.`}
        confirmLabel="Revoke"
        onConfirm={handleConfirmRevoke}
        onCancel={cancelRevoke}
        isLoading={actionInProgress !== null}
      />
    </>
  );
}

export default MemberManagementModal;
