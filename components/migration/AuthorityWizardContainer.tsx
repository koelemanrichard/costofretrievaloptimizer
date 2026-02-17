import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SiteInventoryItem, EnrichedTopic, ActionType, TransitionStatus } from '../../types';
import { useAppState } from '../../state/appState';
import { useBatchAudit } from '../../hooks/useBatchAudit';
import { useTopicOperations } from '../../hooks/useTopicOperations';
import { usePillarDetection } from '../../hooks/usePillarDetection';
import { useAugmentedMap } from '../../hooks/useAugmentedMap';
import { ImportStep } from './steps/ImportStep';
import { AuditStep } from './steps/AuditStep';
import { MatchStep } from './steps/MatchStep';
import { PlanStep } from './steps/PlanStep';
import { ExecuteStep } from './steps/ExecuteStep';
import type { AugmentedTopic } from '../../services/ai/augmentedMapGeneration';

interface AuthorityWizardContainerProps {
  projectId: string;
  mapId: string;
  inventory: SiteInventoryItem[];
  topics: EnrichedTopic[];
  isLoadingInventory: boolean;
  onRefreshInventory: () => void;
  onOpenWorkbench?: (item: SiteInventoryItem) => void;
  onCreateBrief?: (topicId: string) => void;
  onMarkOptimized?: (itemId: string) => Promise<void>;
  onUpdateStatus?: (itemId: string, status: TransitionStatus) => Promise<void>;
  onUpdateAction?: (itemId: string, action: ActionType) => Promise<void>;
}

interface StepConfig {
  number: 1 | 2 | 3 | 4 | 5 | 6;
  label: string;
  description: string;
}

const STEPS: StepConfig[] = [
  { number: 1, label: 'Import', description: 'Add your website pages' },
  { number: 2, label: 'Analyze', description: 'Check content quality' },
  { number: 3, label: 'Map', description: 'Generate topical map' },
  { number: 4, label: 'Match', description: 'Connect pages to topics' },
  { number: 5, label: 'Plan', description: 'Get AI recommendations' },
  { number: 6, label: 'Improve', description: 'Apply changes' },
];

type StepNumber = 1 | 2 | 3 | 4 | 5 | 6;

export const AuthorityWizardContainer: React.FC<AuthorityWizardContainerProps> = ({
  projectId,
  mapId,
  inventory,
  topics,
  isLoadingInventory,
  onRefreshInventory,
  onOpenWorkbench,
  onCreateBrief,
  onMarkOptimized,
  onUpdateStatus,
  onUpdateAction,
}) => {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const { user, businessInfo } = state;

  const { handleAddTopic } = useTopicOperations(mapId, businessInfo, topics, dispatch, user);

  // Business context validation
  const hasBusinessInfo = !!(
    businessInfo?.language &&
    businessInfo?.industry
  );

  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [importComplete, setImportComplete] = useState(false);
  const [auditComplete, setAuditComplete] = useState(false);
  const [mapComplete, setMapComplete] = useState(false);
  const [matchComplete, setMatchComplete] = useState(false);
  const [planComplete, setPlanComplete] = useState(false);

  // Lifted batch audit state — persists across step navigation
  const batchAudit = useBatchAudit(projectId, mapId);

  // ── Map step state ──────────────────────────────────────────────────────
  const pillarDetection = usePillarDetection();
  const augmentedMap = useAugmentedMap();
  const [editableTopics, setEditableTopics] = useState<AugmentedTopic[]>([]);

  // Track audit completion: running → done triggers notification + refresh
  const prevAuditRunning = useRef(batchAudit.isRunning);
  useEffect(() => {
    if (prevAuditRunning.current && !batchAudit.isRunning && !batchAudit.error) {
      const completed = batchAudit.progress?.completed ?? 0;
      dispatch({
        type: 'SET_NOTIFICATION',
        payload: {
          message: `Audit complete: ${completed} page${completed !== 1 ? 's' : ''} analyzed`,
          severity: 'success',
        },
      });
      onRefreshInventory();
      setAuditComplete(true);
    }
    prevAuditRunning.current = batchAudit.isRunning;
  }, [batchAudit.isRunning, batchAudit.error, batchAudit.progress, dispatch, onRefreshInventory]);

  // Auto-detect completion state from persisted inventory data
  const hasAutoAdvanced = React.useRef(false);
  useEffect(() => {
    if (inventory.length === 0) return;

    setImportComplete(true);

    const hasAuditData = inventory.some(i => i.audit_score != null);
    if (hasAuditData) setAuditComplete(true);

    // If topics already exist, mark map as complete
    if (topics.length > 0) setMapComplete(true);

    const hasMatchData = inventory.some(i => i.match_category != null);
    if (hasMatchData) setMatchComplete(true);

    const hasPlanData = inventory.some(i => i.recommended_action != null || i.action != null);
    if (hasPlanData) setPlanComplete(true);

    // Auto-advance to the furthest actionable step on first load
    // Guard each branch with prerequisite checks to avoid skipping incomplete steps
    if (!hasAutoAdvanced.current) {
      hasAutoAdvanced.current = true;
      if (hasPlanData && topics.length > 0 && hasMatchData && hasAuditData) {
        setCurrentStep(6);
      } else if (hasMatchData && topics.length > 0 && hasAuditData) {
        setCurrentStep(5);
      } else if (topics.length > 0 && hasAuditData) {
        setCurrentStep(4);
      } else if (hasAuditData) {
        setCurrentStep(3);
      } else {
        setCurrentStep(2);
      }
    }
  }, [inventory, topics.length]);

  // ── Map step: auto-detect pillars on step entry ──────────────────────
  useEffect(() => {
    if (currentStep === 3 && !pillarDetection.suggestion && !pillarDetection.isLoading) {
      pillarDetection.detect(inventory);
    }
  }, [currentStep, inventory, pillarDetection]);

  // Sync editable topics when augmented map generates
  useEffect(() => {
    if (augmentedMap.topics.length > 0) {
      setEditableTopics([...augmentedMap.topics]);
      setMapComplete(true);
    }
  }, [augmentedMap.topics]);

  const handleGenerateMap = useCallback(async () => {
    if (!pillarDetection.suggestion || !businessInfo) return;

    const pillars = {
      centralEntity: pillarDetection.suggestion.centralEntity,
      sourceContext: pillarDetection.suggestion.sourceContext,
      centralSearchIntent: pillarDetection.suggestion.centralSearchIntent,
    };

    await augmentedMap.generate(inventory, pillars, businessInfo, dispatch);
  }, [pillarDetection.suggestion, inventory, businessInfo, dispatch, augmentedMap]);

  const handleRemoveTopic = useCallback((topicId: string) => {
    setEditableTopics(prev => prev.filter(t => t.id !== topicId));
  }, []);

  const handleEditTopicTitle = useCallback((topicId: string, newTitle: string) => {
    setEditableTopics(prev => prev.map(t =>
      t.id === topicId ? { ...t, title: newTitle } : t
    ));
  }, []);

  // Convert editable topics to EnrichedTopic[] for downstream steps
  const generatedTopics: EnrichedTopic[] = useMemo(() => {
    if (editableTopics.length === 0) return [];
    return editableTopics.map(t => ({
      id: t.id,
      map_id: mapId,
      title: t.title,
      slug: t.slug,
      description: t.description,
      type: t.type,
      freshness: t.freshness,
      parent_topic_id: t.parent_topic_id,
    }));
  }, [editableTopics, mapId]);

  // Use generated topics if available, otherwise fall back to prop topics
  const effectiveTopics = generatedTopics.length > 0 ? generatedTopics : topics;

  const canNavigateToStep = useCallback((step: StepNumber): boolean => {
    switch (step) {
      case 1: return true;
      case 2: return importComplete;
      case 3: return importComplete && auditComplete && hasBusinessInfo;
      case 4: return importComplete && auditComplete && mapComplete && hasBusinessInfo;
      case 5: return importComplete && auditComplete && mapComplete && matchComplete && hasBusinessInfo;
      case 6: return importComplete && auditComplete && mapComplete && matchComplete && planComplete && hasBusinessInfo;
      default: return false;
    }
  }, [importComplete, auditComplete, mapComplete, matchComplete, planComplete, hasBusinessInfo]);

  const handleStepClick = (step: StepNumber) => {
    if (canNavigateToStep(step)) {
      setCurrentStep(step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as StepNumber);
    }
  };

  const handleContinue = () => {
    if (currentStep < 6) {
      const nextStep = (currentStep + 1) as StepNumber;
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
        setMapComplete(true);
        break;
      case 4:
        setMatchComplete(true);
        break;
      case 5:
        setPlanComplete(true);
        break;
    }
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1: return importComplete;
      case 2: return auditComplete;
      case 3: return mapComplete;
      case 4: return matchComplete;
      case 5: return planComplete;
      case 6: return false; // Final step has no "complete" state in the wizard
      default: return false;
    }
  };

  const canContinue = (): boolean => {
    if (currentStep >= 6) return false;
    return canNavigateToStep((currentStep + 1) as StepNumber);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      {/* Step Indicator */}
      <div className="flex-shrink-0 px-6 pt-3 pb-2">
        <div className="relative flex items-center justify-between max-w-3xl mx-auto">
          {/* Connecting line behind circles */}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-700" />
          <div
            className="absolute top-5 left-5 h-0.5 bg-green-600 transition-all duration-300"
            style={{
              width: `${((Math.max(0, currentStep - 1)) / 5) * 100}%`,
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

      {/* Mini-progress bar when audit runs in background */}
      {batchAudit.isRunning && currentStep !== 2 && batchAudit.progress && (
        <button
          onClick={() => setCurrentStep(2)}
          className="flex-shrink-0 mx-4 mt-2 px-4 py-2 bg-blue-900/40 border border-blue-700/50 rounded-lg flex items-center gap-3 hover:bg-blue-900/60 transition-colors cursor-pointer group"
        >
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-300 font-medium truncate">
                Audit running: {batchAudit.progress.completed}/{batchAudit.progress.total} pages
                ({Math.round((batchAudit.progress.completed / Math.max(batchAudit.progress.total, 1)) * 100)}%)
              </span>
              <span className="text-blue-400/70 text-[10px] ml-2 group-hover:text-blue-300">
                View &#9654;
              </span>
            </div>
            <div className="w-full h-1 bg-blue-900/60 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((batchAudit.progress.completed / Math.max(batchAudit.progress.total, 1)) * 100)}%` }}
              />
            </div>
          </div>
        </button>
      )}

      {/* Step Content Area */}
      <div className="flex-grow min-h-0 overflow-y-auto">
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
          <>
            {!hasBusinessInfo && (
              <div className="mx-4 mt-3 bg-amber-900/20 border border-amber-700 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
                <p className="text-sm text-amber-300">
                  <strong>Business context required.</strong> Set your language and industry
                  before proceeding to the Match step.
                </p>
                <button
                  onClick={() => navigate(`/p/${projectId}/m/${mapId}/setup/business?from=migration`)}
                  className="flex-shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded transition-colors"
                >
                  Set up Business Info
                </button>
              </div>
            )}
            <AuditStep
              projectId={projectId}
              mapId={mapId}
              inventory={inventory}
              onComplete={() => setAuditComplete(true)}
              onRefreshInventory={onRefreshInventory}
              isRunning={batchAudit.isRunning}
              progress={batchAudit.progress}
              startBatch={batchAudit.startBatch}
              cancelBatch={batchAudit.cancelBatch}
              auditError={batchAudit.error}
            />
          </>
        )}

        {currentStep === 3 && (
          <div className="px-4 py-3 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white">Generate Topical Map</h2>
              <p className="text-sm text-gray-400 mt-1">
                Auto-detect your SEO pillars from the imported pages, then generate a topical map with AI gap analysis.
              </p>
            </div>

            {/* Pillar Detection Summary */}
            {pillarDetection.isLoading && (
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg px-4 py-3 text-sm text-blue-300 flex items-center gap-2">
                <span className="animate-spin">&#9881;</span>
                Detecting SEO pillars from your pages...
              </div>
            )}

            {pillarDetection.error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
                {pillarDetection.error}
              </div>
            )}

            {pillarDetection.suggestion && !pillarDetection.isLoading && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-300">Detected Pillars</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs uppercase tracking-wider">Central Entity</span>
                    <p className="text-white font-medium mt-0.5">{pillarDetection.suggestion.centralEntity}</p>
                    <span className="text-[10px] text-gray-500">{Math.round(pillarDetection.suggestion.centralEntityConfidence * 100)}% confidence</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs uppercase tracking-wider">Source Context</span>
                    <p className="text-white font-medium mt-0.5">{pillarDetection.suggestion.sourceContext}</p>
                    <span className="text-[10px] text-gray-500">{Math.round(pillarDetection.suggestion.sourceContextConfidence * 100)}% confidence</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs uppercase tracking-wider">Search Intent</span>
                    <p className="text-white font-medium mt-0.5">{pillarDetection.suggestion.centralSearchIntent}</p>
                    <span className="text-[10px] text-gray-500">{Math.round(pillarDetection.suggestion.centralSearchIntentConfidence * 100)}% confidence</span>
                  </div>
                </div>
              </div>
            )}

            {/* Generate Map Button */}
            {editableTopics.length === 0 && !augmentedMap.isGenerating && pillarDetection.suggestion && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center space-y-4">
                <p className="text-gray-400 text-sm">
                  Click below to discover your site's structure and generate a topical map with AI gap analysis.
                </p>
                <button
                  onClick={handleGenerateMap}
                  disabled={augmentedMap.isGenerating || !pillarDetection.suggestion}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm font-medium disabled:opacity-50"
                >
                  Generate Map
                </button>
              </div>
            )}

            {/* Generating indicator */}
            {augmentedMap.isGenerating && (
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg px-4 py-3 text-sm text-blue-300 flex items-center gap-2">
                <span className="animate-spin">&#9881;</span>
                Discovering site structure and generating gap analysis...
              </div>
            )}

            {/* Error */}
            {augmentedMap.error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
                {augmentedMap.error}
              </div>
            )}

            {/* Editable Topic list */}
            {editableTopics.length > 0 && (
              <>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-sm flex items-center gap-4">
                  <span className="text-green-400 font-semibold">
                    {editableTopics.filter(t => t.source === 'discovered').length} discovered
                  </span>
                  <span className="text-cyan-400 font-semibold">
                    {editableTopics.filter(t => t.source === 'generated').length} gap topics
                  </span>
                  <span className="text-gray-500 ml-auto">
                    {editableTopics.length} total topics
                  </span>
                </div>

                <div className="max-h-[40vh] overflow-y-auto space-y-1.5">
                  {editableTopics.map(topic => (
                    <div
                      key={topic.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                        topic.source === 'discovered'
                          ? 'bg-gray-800/40 border-gray-700'
                          : 'bg-cyan-900/10 border-cyan-800/30'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        topic.source === 'discovered' ? 'bg-green-500' : 'bg-cyan-500'
                      }`} />
                      <input
                        type="text"
                        value={topic.title}
                        onChange={(e) => handleEditTopicTitle(topic.id, e.target.value)}
                        className="flex-1 bg-transparent text-sm text-gray-200 border-none focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-1"
                      />
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                        topic.type === 'core' ? 'bg-blue-900/40 text-blue-300' : 'bg-gray-700 text-gray-400'
                      }`}>
                        {topic.type}
                      </span>
                      {topic.coveredByInventoryIds.length > 0 && (
                        <span className="text-[10px] text-gray-500 font-mono">
                          {topic.coveredByInventoryIds.length} pg
                        </span>
                      )}
                      {topic.source === 'generated' && (
                        <button
                          onClick={() => handleRemoveTopic(topic.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors text-xs px-1"
                          title="Remove topic"
                        >
                          &#x2715;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <MatchStep
            projectId={projectId}
            mapId={mapId}
            inventory={inventory}
            topics={effectiveTopics}
            onComplete={() => setMatchComplete(true)}
            onRefreshInventory={onRefreshInventory}
            onCreateTopic={handleAddTopic}
          />
        )}

        {currentStep === 5 && (
          <PlanStep
            projectId={projectId}
            mapId={mapId}
            inventory={inventory}
            topics={effectiveTopics}
            onComplete={() => setPlanComplete(true)}
            onRefreshInventory={onRefreshInventory}
          />
        )}

        {currentStep === 6 && (
          <ExecuteStep
            projectId={projectId}
            mapId={mapId}
            inventory={inventory}
            topics={effectiveTopics}
            onOpenWorkbench={onOpenWorkbench}
            onCreateBrief={onCreateBrief}
            onMarkOptimized={onMarkOptimized}
            onUpdateStatus={onUpdateStatus}
            onUpdateAction={onUpdateAction}
          />
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex-shrink-0 border-t border-gray-700 px-6 py-2.5 flex justify-between items-center">
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
          {currentStep < 6 && !isStepComplete(currentStep) && currentStep !== 1 && (
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
