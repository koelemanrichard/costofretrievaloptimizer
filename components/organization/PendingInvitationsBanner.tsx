// components/organization/PendingInvitationsBanner.tsx
/**
 * PendingInvitationsBanner Component
 *
 * Displays a banner showing pending invitations for the current user.
 * Allows accepting or declining invitations directly from the banner.
 *
 * Created: 2026-01-10 - Multi-tenancy Phase 1, Task 10
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useInvitations } from '../../hooks/useInvitations';
import { Button } from '../ui/Button';
import { SmartLoader } from '../ui/FunLoaders';
import { Invitation } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface PendingInvitationsBannerProps {
  onAccept?: (orgId?: string, projectId?: string) => void;
}

// ============================================================================
// Helper Components
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-200 mb-2">{title}</h3>
        <p className="text-gray-400 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <SmartLoader context="loading" size="sm" showText={false} /> : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface InvitationTypeBadgeProps {
  type: 'organization' | 'project';
}

function InvitationTypeBadge({ type }: InvitationTypeBadgeProps) {
  const isOrg = type === 'organization';
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded border ${
        isOrg
          ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
          : 'bg-green-500/20 border-green-500/30 text-green-300'
      }`}
    >
      {isOrg ? 'Organization' : 'Project'}
    </span>
  );
}

interface RoleBadgeProps {
  role: string;
}

function RoleBadge({ role }: RoleBadgeProps) {
  const roleConfig: Record<string, { color: string; bgColor: string }> = {
    owner: { color: 'text-purple-300', bgColor: 'bg-purple-500/20 border-purple-500/30' },
    admin: { color: 'text-blue-300', bgColor: 'bg-blue-500/20 border-blue-500/30' },
    editor: { color: 'text-green-300', bgColor: 'bg-green-500/20 border-green-500/30' },
    viewer: { color: 'text-gray-300', bgColor: 'bg-gray-500/20 border-gray-500/30' },
  };

  const config = roleConfig[role] || roleConfig.viewer;
  const displayRole = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded border ${config.bgColor} ${config.color}`}
    >
      {displayRole}
    </span>
  );
}

interface InvitationCardProps {
  invitation: Invitation;
  onAccept: (invitation: Invitation) => void;
  onDecline: (invitation: Invitation) => void;
  isProcessing: boolean;
}

function InvitationCard({
  invitation,
  onAccept,
  onDecline,
  isProcessing,
}: InvitationCardProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-blue-900/20 rounded-lg border border-blue-800/30">
      {/* Invitation info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <InvitationTypeBadge type={invitation.type} />
          <RoleBadge role={invitation.role} />
        </div>
        <p className="text-sm text-gray-300">
          You have been invited to join as{' '}
          <span className="font-medium text-gray-200">{invitation.role}</span>
        </p>
        {invitation.message && (
          <p className="text-sm text-gray-400 mt-1 italic">
            &quot;{invitation.message}&quot;
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 sm:flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDecline(invitation)}
          disabled={isProcessing}
        >
          Decline
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onAccept(invitation)}
          disabled={isProcessing}
        >
          {isProcessing ? <SmartLoader context="loading" size="sm" showText={false} /> : 'Accept'}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PendingInvitationsBanner({ onAccept }: PendingInvitationsBannerProps) {
  const {
    getPendingInvitationsForUser,
    acceptInvitation,
    declineInvitation,
    isLoading: hookLoading,
  } = useInvitations();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Confirmation dialog state for decline
  const [declineDialog, setDeclineDialog] = useState<{
    isOpen: boolean;
    invitation: Invitation | null;
  }>({ isOpen: false, invitation: null });

  // Load pending invitations on mount
  const loadInvitations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pending = await getPendingInvitationsForUser();
      setInvitations(pending);
    } catch (err) {
      console.error('Failed to load pending invitations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  }, [getPendingInvitationsForUser]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  // Handle accept invitation
  const handleAccept = useCallback(async (invitation: Invitation) => {
    setProcessingId(invitation.id);
    setError(null);

    try {
      const result = await acceptInvitation(invitation.token);

      if (result?.success) {
        // Remove from local state
        setInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));

        // Call the onAccept callback with org/project IDs
        if (onAccept) {
          onAccept(result.organization_id, result.project_id);
        }
      } else {
        setError('Failed to accept invitation. It may have expired.');
      }
    } catch (err) {
      console.error('Failed to accept invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setProcessingId(null);
    }
  }, [acceptInvitation, onAccept]);

  // Show decline confirmation
  const showDeclineConfirmation = useCallback((invitation: Invitation) => {
    setDeclineDialog({ isOpen: true, invitation });
  }, []);

  // Handle decline invitation
  const handleDecline = useCallback(async () => {
    if (!declineDialog.invitation) return;

    const invitation = declineDialog.invitation;
    setProcessingId(invitation.id);
    setError(null);

    try {
      const success = await declineInvitation(invitation.token);

      if (success) {
        // Remove from local state
        setInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));
        setDeclineDialog({ isOpen: false, invitation: null });
      } else {
        setError('Failed to decline invitation');
      }
    } catch (err) {
      console.error('Failed to decline invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to decline invitation');
    } finally {
      setProcessingId(null);
    }
  }, [declineDialog.invitation, declineInvitation]);

  // Cancel decline
  const cancelDecline = useCallback(() => {
    setDeclineDialog({ isOpen: false, invitation: null });
  }, []);

  // Don't show anything while loading
  if (isLoading) {
    return null;
  }

  // Don't render if no pending invitations
  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-5 h-5 text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-blue-200">
          Pending Invitations ({invitations.length})
        </h3>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-3">
          {error}
        </div>
      )}

      {/* Invitation list */}
      <div className="space-y-3">
        {invitations.map((invitation) => (
          <InvitationCard
            key={invitation.id}
            invitation={invitation}
            onAccept={handleAccept}
            onDecline={showDeclineConfirmation}
            isProcessing={processingId === invitation.id}
          />
        ))}
      </div>

      {/* Decline Confirmation Dialog */}
      <ConfirmDialog
        isOpen={declineDialog.isOpen}
        title="Decline Invitation"
        message={`Are you sure you want to decline this invitation? You will need to be re-invited if you change your mind.`}
        confirmLabel="Decline"
        onConfirm={handleDecline}
        onCancel={cancelDecline}
        isLoading={processingId === declineDialog.invitation?.id}
      />
    </div>
  );
}
