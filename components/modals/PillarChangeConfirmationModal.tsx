// components/PillarChangeConfirmationModal.tsx
import React from 'react';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { Modal } from '../ui/Modal';

interface PillarChangeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (strategy: 'keep' | 'regenerate') => void;
  isLoading?: boolean;
}

const PillarChangeConfirmationModal: React.FC<PillarChangeConfirmationModalProps> = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const footer = (
    <div className="w-full text-center">
      <Button variant="secondary" onClick={onClose} disabled={isLoading}>
        Cancel Change
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm SEO Pillar Change"
      description="Choose how to handle your existing topical map after pillar changes"
      maxWidth="max-w-2xl"
      footer={footer}
    >
      <div className="text-center">
        <p className="text-gray-300">
          Changing your core SEO pillars is a significant strategic shift. How would you like to proceed with the existing topical map?
        </p>

        <div
          className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left"
          role="group"
          aria-label="Pillar change options"
        >
          <div className="p-4 border border-gray-600 rounded-lg flex flex-col">
            <h3 className="font-semibold text-lg text-white">Save and Keep Map</h3>
            <p className="text-sm text-gray-400 mt-2 flex-grow">
              Your new pillars will be saved. Your current topics and briefs will remain unchanged, but they may become misaligned with your new strategy.
            </p>
            <p className="text-xs text-yellow-400 mt-2">Recommended: Run "Validate Map" and other analysis tools after saving.</p>
            <Button onClick={() => onConfirm('keep')} className="w-full mt-4" disabled={isLoading}>
              Choose this Option
            </Button>
          </div>
          <div className="p-4 border border-red-700 bg-red-900/20 rounded-lg flex flex-col" role="alert">
            <h3 className="font-semibold text-lg text-red-300">Save and Regenerate Map</h3>
            <p className="text-sm text-gray-400 mt-2 flex-grow">
              <strong className="text-red-400">Warning: This is a destructive action.</strong> A completely new set of topics will be generated based on your new pillars.
            </p>
            <p className="text-xs text-red-400 mt-2">All current topics, briefs, and manual changes will be permanently deleted.</p>
            <Button onClick={() => onConfirm('regenerate')} className="w-full mt-4 bg-red-600 hover:bg-red-700 focus:ring-red-500" disabled={isLoading}>
              {isLoading ? <Loader className="w-5 h-5 mx-auto" /> : 'Choose this Option'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PillarChangeConfirmationModal;