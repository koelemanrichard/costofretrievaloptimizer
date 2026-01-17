/**
 * CreateOrganizationModal Component
 *
 * Modal for creating new team or enterprise organizations.
 * After successful creation, automatically switches to the new organization.
 *
 * Created: 2026-01-10 - Multi-tenancy Phase 2
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';
import { SmartLoader } from '../ui/FunLoaders';
import { useOrganizationContext } from './OrganizationProvider';

// ============================================================================
// Types
// ============================================================================

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (orgId: string) => void;
}

// Organization types available for creation
const ORGANIZATION_TYPES: { value: 'team' | 'enterprise'; label: string; description: string }[] = [
  { value: 'team', label: 'Team', description: 'For small to medium teams with shared projects and resources' },
  { value: 'enterprise', label: 'Enterprise', description: 'For large organizations with advanced features and controls' },
];

// ============================================================================
// Component
// ============================================================================

export function CreateOrganizationModal({ isOpen, onClose, onSuccess }: CreateOrganizationModalProps) {
  const { createOrganization, switchOrganization, loadOrganizations } = useOrganizationContext();

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'team' | 'enterprise'>('team');

  // Loading and error state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation error
  const [validationError, setValidationError] = useState<string | null>(null);

  // Combined error display
  const displayError = validationError || error;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = useCallback(() => {
    setName('');
    setType('team');
    setError(null);
    setValidationError(null);
    setIsLoading(false);
  }, []);

  const validateName = useCallback((nameValue: string): boolean => {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      setValidationError('Organization name is required');
      return false;
    }
    if (trimmed.length < 2) {
      setValidationError('Organization name must be at least 2 characters');
      return false;
    }
    setValidationError(null);
    return true;
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateName(name)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create the organization
      const newOrg = await createOrganization(name.trim(), type);

      if (!newOrg) {
        throw new Error('Failed to create organization');
      }

      // Reload organizations to ensure the list is updated
      await loadOrganizations();

      // Switch to the new organization
      await switchOrganization(newOrg.id);

      // Reset form and close modal
      resetForm();
      onSuccess?.(newOrg.id);
      onClose();
    } catch (err) {
      console.error('Failed to create organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setIsLoading(false);
    }
  }, [name, type, createOrganization, switchOrganization, loadOrganizations, validateName, resetForm, onSuccess, onClose]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
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
        form="create-organization-form"
        disabled={isLoading || name.trim().length < 2}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <SmartLoader context="building" size="sm" showText={false} />
            Creating...
          </span>
        ) : (
          'Create Organization'
        )}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Organization"
      description="Set up a new team or enterprise organization"
      maxWidth="max-w-md"
      zIndex="z-[70]"
      footer={footerContent}
    >
      <form id="create-organization-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Info box about what happens next */}
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
              After creating your organization, you will be automatically switched to it. You can then invite team members and start creating shared projects.
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

        {/* Name field */}
        <div>
          <Label htmlFor="org-name">Organization Name</Label>
          <Input
            id="org-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="My Team"
            required
            autoFocus
            minLength={2}
            aria-describedby={validationError ? 'name-error' : undefined}
          />
          {validationError && (
            <p id="name-error" className="text-xs text-red-400 mt-1">
              {validationError}
            </p>
          )}
        </div>

        {/* Type selection */}
        <div>
          <Label htmlFor="org-type">Organization Type</Label>
          <Select
            id="org-type"
            value={type}
            onChange={(e) => setType(e.target.value as 'team' | 'enterprise')}
          >
            {ORGANIZATION_TYPES.map((typeOption) => (
              <option key={typeOption.value} value={typeOption.value}>
                {typeOption.label}
              </option>
            ))}
          </Select>
          {/* Type description */}
          <p className="text-xs text-gray-400 mt-1">
            {ORGANIZATION_TYPES.find((t) => t.value === type)?.description}
          </p>
        </div>
      </form>
    </Modal>
  );
}

export default CreateOrganizationModal;
