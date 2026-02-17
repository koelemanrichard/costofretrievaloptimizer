import React, { useState } from 'react';
import { SiteInventoryItem, EnrichedTopic } from '../../types';
import { useAppState } from '../../state/appState';

interface ExistingSiteWizardContainerProps {
  projectId: string;
  mapId: string;
  inventory: SiteInventoryItem[];
  topics: EnrichedTopic[];
  isLoadingInventory: boolean;
  onRefreshInventory: () => void;
  onOpenWorkbench?: (item: SiteInventoryItem) => void;
}

interface StepConfig {
  number: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  label: string;
  description: string;
}

const STEPS: StepConfig[] = [
  { number: 1, label: 'Business', description: 'Define your business context' },
  { number: 2, label: 'Import', description: 'Add your website pages' },
  { number: 3, label: 'Analyze', description: 'Semantic content analysis' },
  { number: 4, label: 'Pillars', description: 'Validate SEO pillars' },
  { number: 5, label: 'Map', description: 'Generate topical map' },
  { number: 6, label: 'Overlay', description: 'Review coverage gaps' },
  { number: 7, label: 'Execute', description: 'Apply optimizations' },
];

export const ExistingSiteWizardContainer: React.FC<ExistingSiteWizardContainerProps> = ({
  projectId,
  mapId,
  inventory,
  topics,
  isLoadingInventory,
  onRefreshInventory,
  onOpenWorkbench,
}) => {
  const { state } = useAppState();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);

  const canNavigateTo = (step: number): boolean => {
    // Allow going back to any completed step, or forward to the next step
    return step <= currentStep;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Step Navigation Bar */}
      <div className="flex-shrink-0 bg-gray-900 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          {STEPS.map((step, idx) => {
            const isActive = step.number === currentStep;
            const isCompleted = step.number < currentStep;
            const isClickable = canNavigateTo(step.number);

            return (
              <React.Fragment key={step.number}>
                {idx > 0 && (
                  <div className={`flex-1 h-px mx-2 ${
                    isCompleted ? 'bg-green-600' : 'bg-gray-700'
                  }`} />
                )}
                <button
                  onClick={() => isClickable && setCurrentStep(step.number as 1 | 2 | 3 | 4 | 5 | 6 | 7)}
                  disabled={!isClickable}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-900/30 border border-blue-700 text-blue-300'
                      : isCompleted
                        ? 'text-green-400 hover:bg-gray-800 cursor-pointer'
                        : 'text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                    isActive
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : isCompleted
                        ? 'bg-green-600 border-green-500 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-500'
                  }`}>
                    {isCompleted ? '\u2713' : step.number}
                  </span>
                  <span className="hidden md:inline">{step.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentStep === 1 && (
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-white">Business Context</h2>
            <p className="text-gray-400 text-sm">
              Define your business information before proceeding. This context is used by all AI-driven analysis.
            </p>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <p className="text-gray-400 text-sm">
                Business info is managed from the project settings. Ensure language, industry, and audience are set.
              </p>
              <button
                onClick={() => setCurrentStep(2)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm font-medium"
              >
                Continue to Import
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="max-w-4xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-white">Import Your Site</h2>
            <p className="text-gray-400 text-sm">
              Import pages from your sitemap and connect Google Search Console data.
            </p>
            {/* ImportStep will be integrated here */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
              <p className="text-gray-400 text-sm">Import step integration point</p>
              <div className="flex gap-3 justify-center mt-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm font-medium"
                >
                  Continue to Analyze
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="max-w-4xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-white">Semantic Analysis</h2>
            <p className="text-gray-400 text-sm">
              Run batch semantic analysis to detect Central Entities, Source Context, and Search Intent across all pages.
            </p>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
              <p className="text-gray-400 text-sm">Batch analysis integration point</p>
              <div className="flex gap-3 justify-center mt-4">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm font-medium"
                >
                  Continue to Pillars
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-white">SEO Pillar Validation</h2>
            <p className="text-gray-400 text-sm">
              Review the detected SEO pillars. Confirm or adjust the Central Entity, Source Context, and Central Search Intent.
            </p>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
              <p className="text-gray-400 text-sm">PillarValidationStep integration point</p>
              <div className="flex gap-3 justify-center mt-4">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(5)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm font-medium"
                >
                  Continue to Map
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="max-w-4xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-white">Augmented Topical Map</h2>
            <p className="text-gray-400 text-sm">
              Review the generated topical map combining discovered topics from your site with AI-identified gaps.
            </p>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
              <p className="text-gray-400 text-sm">Map review integration point</p>
              <div className="flex gap-3 justify-center mt-4">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(6)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm font-medium"
                >
                  Continue to Overlay
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="max-w-6xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-white">Coverage Overlay</h2>
            <p className="text-gray-400 text-sm">
              See how your existing content maps to the topical map. Green = well covered, Yellow = needs work, Red = gap, Orange = cannibalization.
            </p>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
              <p className="text-gray-400 text-sm">OverlayView integration point</p>
              <div className="flex gap-3 justify-center mt-4">
                <button
                  onClick={() => setCurrentStep(5)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(7)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm font-medium"
                >
                  Continue to Execute
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 7 && (
          <div className="max-w-6xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-white">Execute Optimizations</h2>
            <p className="text-gray-400 text-sm">
              Work through your prioritized action queue. Quick wins are highlighted first.
            </p>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
              <p className="text-gray-400 text-sm">Execute step integration point</p>
              <button
                onClick={() => setCurrentStep(6)}
                className="mt-4 px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
              >
                Back to Overlay
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExistingSiteWizardContainer;
