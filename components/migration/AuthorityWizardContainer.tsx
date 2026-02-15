import React, { useState, useEffect, useCallback } from 'react';
import { SiteInventoryItem, EnrichedTopic } from '../../types';
import { ImportStep } from './steps/ImportStep';
import { AuditStep } from './steps/AuditStep';
import { MatchStep } from './steps/MatchStep';
import { PlanStep } from './steps/PlanStep';
import { ExecuteStep } from './steps/ExecuteStep';

interface AuthorityWizardContainerProps {
  projectId: string;
  mapId: string;
  inventory: SiteInventoryItem[];
  topics: EnrichedTopic[];
  isLoadingInventory: boolean;
  onRefreshInventory: () => void;
  onOpenWorkbench?: (item: SiteInventoryItem) => void;
  onCreateBrief?: (topicId: string) => void;
}

interface StepConfig {
  number: 1 | 2 | 3 | 4 | 5;
  label: string;
  description: string;
}

const STEPS: StepConfig[] = [
  { number: 1, label: 'Import', description: 'Import Website Data' },
  { number: 2, label: 'Audit', description: 'Batch Content Audit' },
  { number: 3, label: 'Match', description: 'Match URLs to Topics' },
  { number: 4, label: 'Plan', description: 'Generate Migration Plan' },
  { number: 5, label: 'Execute', description: 'Execute Migration' },
];

export const AuthorityWizardContainer: React.FC<AuthorityWizardContainerProps> = ({
  projectId,
  mapId,
  inventory,
  topics,
  isLoadingInventory,
  onRefreshInventory,
  onOpenWorkbench,
  onCreateBrief,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [importComplete, setImportComplete] = useState(false);
  const [auditComplete, setAuditComplete] = useState(false);
  const [matchComplete, setMatchComplete] = useState(false);
  const [planComplete, setPlanComplete] = useState(false);

  // Auto-detect completion state from persisted inventory data
  const hasAutoAdvanced = React.useRef(false);
  useEffect(() => {
    if (inventory.length === 0) return;

    setImportComplete(true);

    const hasAuditData = inventory.some(i => i.audit_score != null);
    if (hasAuditData) setAuditComplete(true);

    const hasMatchData = inventory.some(i => i.match_category != null);
    if (hasMatchData) setMatchComplete(true);

    const hasPlanData = inventory.some(i => i.recommended_action != null || i.action != null);
    if (hasPlanData) setPlanComplete(true);

    // Auto-advance to the furthest actionable step on first load
    if (!hasAutoAdvanced.current) {
      hasAutoAdvanced.current = true;
      if (hasPlanData) {
        setCurrentStep(5);
      } else if (hasMatchData) {
        setCurrentStep(4);
      } else if (hasAuditData) {
        setCurrentStep(3);
      } else {
        setCurrentStep(2);
      }
    }
  }, [inventory]);

  const canNavigateToStep = useCallback((step: 1 | 2 | 3 | 4 | 5): boolean => {
    switch (step) {
      case 1: return true;
      case 2: return importComplete;
      case 3: return importComplete && auditComplete;
      case 4: return importComplete && auditComplete && matchComplete;
      case 5: return importComplete && auditComplete && matchComplete && planComplete;
      default: return false;
    }
  }, [importComplete, auditComplete, matchComplete, planComplete]);

  const handleStepClick = (step: 1 | 2 | 3 | 4 | 5) => {
    if (canNavigateToStep(step)) {
      setCurrentStep(step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2 | 3 | 4 | 5);
    }
  };

  const handleContinue = () => {
    if (currentStep < 5) {
      const nextStep = (currentStep + 1) as 1 | 2 | 3 | 4 | 5;
      if (canNavigateToStep(nextStep)) {
        setCurrentStep(nextStep);
      }
    }
  };

  const handleMarkComplete = () => {
    switch (currentStep) {
      case 1:
        setImportComplete(true);
        break;
      case 2:
        setAuditComplete(true);
        break;
      case 3:
        setMatchComplete(true);
        break;
      case 4:
        setPlanComplete(true);
        break;
    }
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1: return importComplete;
      case 2: return auditComplete;
      case 3: return matchComplete;
      case 4: return planComplete;
      case 5: return false; // Final step has no "complete" state in the wizard
      default: return false;
    }
  };

  const canContinue = (): boolean => {
    if (currentStep >= 5) return false;
    return canNavigateToStep((currentStep + 1) as 1 | 2 | 3 | 4 | 5);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      {/* Step Indicator */}
      <div className="flex-shrink-0 px-8 pt-6 pb-4">
        <div className="relative flex items-center justify-between max-w-2xl mx-auto">
          {/* Connecting line behind circles */}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-700" />
          <div
            className="absolute top-5 left-5 h-0.5 bg-green-600 transition-all duration-300"
            style={{
              width: `${((Math.max(0, currentStep - 1)) / 4) * 100}%`,
              maxWidth: 'calc(100% - 40px)',
            }}
          />

          {STEPS.map((step) => {
            const isActive = currentStep === step.number;
            const isComplete = isStepComplete(step.number);
            const isClickable = canNavigateToStep(step.number);

            let circleClasses = 'bg-gray-700 text-gray-400';
            if (isActive) {
              circleClasses = 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900';
            } else if (isComplete) {
              circleClasses = 'bg-green-600 text-white';
            }

            return (
              <div
                key={step.number}
                className="relative flex flex-col items-center z-10"
              >
                <button
                  onClick={() => handleStepClick(step.number)}
                  disabled={!isClickable}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${circleClasses} ${
                    isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'
                  }`}
                  title={`Step ${step.number}: ${step.label}`}
                >
                  {isComplete && !isActive ? (
                    <span className="text-base">&#10003;</span>
                  ) : (
                    step.number
                  )}
                </button>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isActive ? 'text-blue-400' : isComplete ? 'text-green-400' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700" />

      {/* Step Content Area */}
      <div className="flex-grow overflow-y-auto">
        {currentStep === 1 && (
          <ImportStep
            projectId={projectId}
            mapId={mapId}
            inventory={inventory}
            onComplete={() => setImportComplete(true)}
            onRefreshInventory={onRefreshInventory}
          />
        )}

        {currentStep === 2 && (
          <AuditStep
            projectId={projectId}
            mapId={mapId}
            inventory={inventory}
            onComplete={() => setAuditComplete(true)}
            onRefreshInventory={onRefreshInventory}
          />
        )}

        {currentStep === 3 && (
          <MatchStep
            projectId={projectId}
            mapId={mapId}
            inventory={inventory}
            topics={topics}
            onComplete={() => setMatchComplete(true)}
            onRefreshInventory={onRefreshInventory}
          />
        )}

        {currentStep === 4 && (
          <PlanStep
            projectId={projectId}
            mapId={mapId}
            inventory={inventory}
            topics={topics}
            onComplete={() => setPlanComplete(true)}
          />
        )}

        {currentStep === 5 && (
          <ExecuteStep
            projectId={projectId}
            mapId={mapId}
            inventory={inventory}
            topics={topics}
            onOpenWorkbench={onOpenWorkbench}
            onCreateBrief={onCreateBrief}
          />
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex-shrink-0 border-t border-gray-700 px-6 py-4 flex justify-between items-center">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentStep === 1
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600 cursor-pointer'
          }`}
        >
          Back
        </button>

        <div className="flex gap-3">
          {currentStep < 5 && !isStepComplete(currentStep) && currentStep !== 1 && (
            <button
              onClick={() => {
                handleMarkComplete();
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              Skip
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={!canContinue()}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              canContinue()
                ? 'bg-blue-600 text-white hover:bg-blue-500 cursor-pointer'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthorityWizardContainer;
