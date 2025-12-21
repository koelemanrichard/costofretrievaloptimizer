/**
 * ConfirmationModal Component
 *
 * A confirmation dialog with warning icon, used for destructive actions.
 * Uses the accessible Modal component with full keyboard navigation and ARIA support.
 *
 * Updated: 2024-12-19 - Migrated to accessible Modal component
 */

import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  /** Optional: customize the confirm button text (default: "Confirm") */
  confirmText?: string;
  /** Optional: customize the cancel button text (default: "Cancel") */
  cancelText?: string;
  /** Optional: customize confirm button variant (default: destructive red) */
  confirmVariant?: 'destructive' | 'primary';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'destructive',
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={typeof message === 'string' ? message : undefined}
      maxWidth="max-w-lg"
      zIndex="z-[60]"
      showHeader={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            className={confirmVariant === 'destructive' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : ''}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-900/50">
          <svg
            className="h-6 w-6 text-yellow-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg leading-6 font-medium text-white mt-4">{title}</h3>
        <div className="mt-2 px-7 py-3">
          <p className="text-sm text-gray-400">{message}</p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
