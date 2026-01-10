/**
 * SubscriptionBillingModal Component
 *
 * Modal wrapper for SubscriptionBillingTab. Provides organization subscription
 * and billing management in a modal overlay.
 *
 * Created: 2026-01-11 - Multi-tenancy UI Integration
 */

import React from 'react';
import { Modal } from '../ui/Modal';
import { SubscriptionBillingTab } from './SubscriptionBillingTab';

interface SubscriptionBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionBillingModal({ isOpen, onClose }: SubscriptionBillingModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Subscription & Billing"
      description="Manage your organization's subscription and billing settings"
      maxWidth="max-w-4xl"
      zIndex="z-[70]"
    >
      <SubscriptionBillingTab onClose={onClose} />
    </Modal>
  );
}

export default SubscriptionBillingModal;
