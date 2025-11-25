// components/PillarChangeConfirmationModal.tsx
import React from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';

interface PillarChangeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (strategy: 'keep' | 'regenerate') => void;
  isLoading?: boolean;
}

const PillarChangeConfirmationModal: React.FC<PillarChangeConfirmationModalProps> = ({ isOpen, onClose, onConfirm, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <h2 className="text-2xl font-bold text-white">Confirm SEO Pillar Change</h2>
          <p className="mt-4 text-gray-300">
            Changing your core SEO pillars is a significant strategic shift. How would you like to proceed with the existing topical map?
          </p>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
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
            <div className="p-4 border border-red-700 bg-red-900/20 rounded-lg flex flex-col">
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
        <div className="p-4 bg-gray-800 border-t border-gray-700 text-center">
             <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel Change
            </Button>
        </div>
      </Card>
    </div>
  );
};

export default PillarChangeConfirmationModal;