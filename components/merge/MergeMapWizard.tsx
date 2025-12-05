import React, { useCallback } from 'react';
import { useMapMerge } from '../../hooks/useMapMerge';
import { useAppState } from '../../state/appState';
import { TopicalMap } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import MergeMapSelectStep from './MergeMapSelectStep';

interface MergeMapWizardProps {
  isOpen: boolean;
  onClose: () => void;
  availableMaps: TopicalMap[];
}

const MergeMapWizard: React.FC<MergeMapWizardProps> = ({
  isOpen,
  onClose,
  availableMaps,
}) => {
  const { state: appState, dispatch: appDispatch } = useAppState();
  const {
    state: mergeState,
    dispatch: mergeDispatch,
    setStep,
    selectMaps,
    setSourceMaps,
    reset,
  } = useMapMerge();

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleNext = useCallback(() => {
    const steps: Array<typeof mergeState.step> = ['select', 'context', 'eavs', 'topics', 'review'];
    const currentIndex = steps.indexOf(mergeState.step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  }, [mergeState.step, setStep]);

  const handleBack = useCallback(() => {
    const steps: Array<typeof mergeState.step> = ['select', 'context', 'eavs', 'topics', 'review'];
    const currentIndex = steps.indexOf(mergeState.step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  }, [mergeState.step, setStep]);

  const handleMapsSelected = useCallback((mapIds: string[]) => {
    selectMaps(mapIds);
    const maps = availableMaps.filter(m => mapIds.includes(m.id));
    setSourceMaps(maps);
  }, [selectMaps, setSourceMaps, availableMaps]);

  if (!isOpen) return null;

  const stepTitles: Record<typeof mergeState.step, string> = {
    select: 'Select Maps to Merge',
    context: 'Business Context & Pillars',
    eavs: 'EAV Consolidation',
    topics: 'Topic Matching',
    review: 'Review & Finalize',
  };

  const renderStep = () => {
    switch (mergeState.step) {
      case 'select':
        return (
          <MergeMapSelectStep
            availableMaps={availableMaps}
            selectedMapIds={mergeState.selectedMapIds}
            onMapsSelected={handleMapsSelected}
          />
        );
      case 'context':
        return <div className="text-gray-400 p-8 text-center">Context step coming soon...</div>;
      case 'eavs':
        return <div className="text-gray-400 p-8 text-center">EAV step coming soon...</div>;
      case 'topics':
        return <div className="text-gray-400 p-8 text-center">Topics step coming soon...</div>;
      case 'review':
        return <div className="text-gray-400 p-8 text-center">Review step coming soon...</div>;
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (mergeState.step) {
      case 'select':
        return mergeState.selectedMapIds.length >= 2;
      default:
        return true;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">
              {stepTitles[mergeState.step]}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              &times;
            </button>
          </div>
          {/* Progress indicator */}
          <div className="flex gap-2 mt-4">
            {(['select', 'context', 'eavs', 'topics', 'review'] as const).map((step, index) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded ${
                  index <= ['select', 'context', 'eavs', 'topics', 'review'].indexOf(mergeState.step)
                    ? 'bg-blue-500'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-between">
          <Button
            variant="secondary"
            onClick={mergeState.step === 'select' ? handleClose : handleBack}
          >
            {mergeState.step === 'select' ? 'Cancel' : 'Back'}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {mergeState.step === 'review' ? 'Create Merged Map' : 'Next'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MergeMapWizard;
