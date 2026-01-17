/**
 * InviteMemberModal Component
 *
 * Modal for sending organization invitations to new members.
 * Supports role selection and optional personal message.
 *
 * Created: 2026-01-10 - Multi-tenancy Phase 2
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { SmartLoader } from '../ui/FunLoaders';
import { useInvitations } from '../../hooks/useInvitations';
import { useOrganizationContext } from './OrganizationProvider';
import { OrganizationRole } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Roles available for invitation (excludes 'owner')
const INVITABLE_ROLES: { value: Exclude<OrganizationRole, 'owner'>; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Can manage members, projects, and organization settings' },
  { value: 'editor', label: 'Editor', description: 'Can create and edit projects and content' },
  { value: 'viewer', label: 'Viewer', description: 'Can view projects and content (read-only)' },
];

// ============================================================================
// Component
// ============================================================================

export function InviteMemberModal({ isOpen, onClose, onSuccess }: InviteMemberModalProps) {
  const { current: currentOrganization } = useOrganizationContext();
  const { createInvitation, isLoading, error: hookError } = useInvitations();

  // Form state
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<OrganizationRole, 'owner'>>('editor');
  const [message, setMessage] = useState('');

  // Local validation error
  const [validationError, setValidationError] = useState<string | null>(null);

  // Combined error display
  const displayError = validationError || hookError;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = useCallback(() => {
    setEmail('');
    setRole('editor');
    setMessage('');
    setValidationError(null);
  }, []);

  const validateEmail = useCallback((emailValue: string): boolean => {
    if (!emailValue.trim()) {
      setValidationError('Email is required');
      return false;
    }
    if (!emailValue.includes('@')) {
      setValidationError('Please enter a valid email address');
      return false;
    }
    setValidationError(null);
    return true;
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentOrganization) {
      setValidationError('No organization selected');
      return;
    }

    if (!validateEmail(email)) {
      return;
    }

    const result = await createInvitation({
      type: 'organization',
      organization_id: currentOrganization.id,
      email: email.trim(),
      role,
      message: message.trim() || undefined,
    });

    if (result) {
      resetForm();
      onSuccess?.();
      onClose();
    }
  }, [currentOrganization, email, role, message, createInvitation, validateEmail, resetForm, onSuccess, onClose]);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  }, [validationError]);

  const footerContent = (
    <div className="flex justify-end gap-4 w-full">
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={isLoading}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form="invite-member-form"
        disabled={isLoading || !email.trim()}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <SmartLoader context="saving" size="sm" showText={false} />
            Sending...
          </span>
        ) : (
          'Send Invitation'
        )}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Team Member"
      description="Send an invitation to join your organization"
      maxWidth="max-w-md"
      zIndex="z-[70]"
      footer={footerContent}
    >
      <form id="invite-member-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Info box about expiration */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-blue-200">
              Invitations expire after 7 days. The recipient will receive an email with a link to join your organization.
            </p>
          </div>
        </div>

        {/* Error display */}
        {displayError && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-red-200">{displayError}</p>
            </div>
          </div>
        )}

        {/* Email field */}
        <div>
          <Label htmlFor="invite-email">Email Address</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="colleague@example.com"
            required
            autoFocus
            aria-describedby={validationError ? 'email-error' : undefined}
          />
          {validationError && (
            <p id="email-error" className="text-xs text-red-400 mt-1">
              {validationError}
            </p>
          )}
        </div>

        {/* Role selection */}
        <div>
          <Label htmlFor="invite-role">Role</Label>
          <Select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Exclude<OrganizationRole, 'owner'>)}
          >
            {INVITABLE_ROLES.map((roleOption) => (
              <option key={roleOption.value} value={roleOption.value}>
                {roleOption.label}
              </option>
            ))}
          </Select>
          {/* Role description */}
          <p className="text-xs text-gray-400 mt-1">
            {INVITABLE_ROLES.find((r) => r.value === role)?.description}
          </p>
        </div>

        {/* Optional message */}
        <div>
          <Label htmlFor="invite-message">
            Personal Message <span className="text-gray-500 font-normal">(optional)</span>
          </Label>
          <Textarea
            id="invite-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a personal message to include in the invitation email..."
            rows={3}
          />
        </div>
      </form>
    </Modal>
  );
}

export default InviteMemberModal;
