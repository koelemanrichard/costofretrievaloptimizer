import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SiteInventoryItem, EnrichedTopic, ActionType, SEOPillars, TransitionStatus, BusinessInfo } from '../../types';
import { useAppState } from '../../state/appState';
import { ImportStep } from './steps/ImportStep';
import { PillarValidationStep } from './steps/PillarValidationStep';
import { ExecuteStep } from './steps/ExecuteStep';
import { OverlayView } from './OverlayView';
import { useBatchSemanticAnalysis } from '../../hooks/useBatchSemanticAnalysis';
import { usePillarDetection } from '../../hooks/usePillarDetection';
import { useAugmentedMap } from '../../hooks/useAugmentedMap';
import { useOverlay } from '../../hooks/useOverlay';
import { validateBusinessInfoForAnalysis, validatePillarsForAnalysis } from '../../utils/businessInfoValidator';
import { extractSinglePage } from '../../services/pageExtractionService';
import type { AugmentedTopic } from '../../services/ai/augmentedMapGeneration';

interface ExistingSiteWizardContainerProps {
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

type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const ExistingSiteWizardContainer: React.FC<ExistingSiteWizardContainerProps> = ({
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
  const { businessInfo } = state;

  // Merge map-level business_info with global (map overrides global for language/industry/domain)
  const activeMap = state.topicalMaps.find(m => m.id === mapId);
  const mapBizInfo = activeMap?.business_info as Partial<BusinessInfo> | undefined;
  const effectiveLanguage = mapBizInfo?.language || businessInfo?.language;
  const effectiveIndustry = mapBizInfo?.industry || businessInfo?.industry;
  const effectiveDomain = mapBizInfo?.domain || businessInfo?.domain;
  const effectiveAudience = mapBizInfo?.audience || businessInfo?.audience;

  const hasBusinessInfo = !!(effectiveLanguage && effectiveIndustry);

  // Collapsible business settings panel — always accessible
  const [showBusinessSettings, setShowBusinessSettings] = useState(false);

  const [currentStep, setCurrentStep] = useState<StepNumber>(1);

  // ── Step 3: Semantic Analysis state ──────────────────────────────────────
  const batchAnalysis = useBatchSemanticAnalysis(businessInfo, dispatch, mapId);
  const [isFetchingContent, setIsFetchingContent] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<{ current: number; total: number } | null>(null);
  const contentMapRef = useRef<Map<string, string>>(new Map());
  const [analysisValidationError, setAnalysisValidationError] = useState<string | null>(null);

  // ── Step 4: Pillar Detection state ──────────────────────────────────────
  const pillarDetection = usePillarDetection();
  const [confirmedPillars, setConfirmedPillars] = useState<SEOPillars | null>(null);

  // ── Step 5: Augmented Map state ─────────────────────────────────────────
  const augmentedMap = useAugmentedMap();
  const [mapValidationError, setMapValidationError] = useState<string | null>(null);
  const [editableTopics, setEditableTopics] = useState<AugmentedTopic[]>([]);

  // ── Step 6: Overlay state ───────────────────────────────────────────────
  const overlay = useOverlay();

  // ── Navigation ──────────────────────────────────────────────────────────
  const canNavigateTo = (step: number): boolean => {
    return step <= currentStep;
  };

  const goToStep = useCallback((step: StepNumber) => {
    setCurrentStep(step);
  }, []);

  // ── Step 3: Content fetching + analysis ─────────────────────────────────
  const handleRunAnalysis = useCallback(async () => {
    // Validate business info before proceeding
    const validation = validateBusinessInfoForAnalysis(businessInfo);
    if (!validation.valid) {
      setAnalysisValidationError(validation.errors.join(' '));
      setShowBusinessSettings(true); // Auto-open panel so user can fix
      return;
    }
    setAnalysisValidationError(null);

    const pagesWithoutContent = inventory.filter(item => !contentMapRef.current.has(item.id));

    if (pagesWithoutContent.length > 0) {
      setIsFetchingContent(true);
      setFetchProgress({ current: 0, total: pagesWithoutContent.length });

      for (let i = 0; i < pagesWithoutContent.length; i++) {
        const item = pagesWithoutContent[i];
        try {
          const extracted = await extractSinglePage(item.url, {
            jinaApiKey: businessInfo.jinaApiKey,
            apifyToken: businessInfo.apifyToken,
            firecrawlApiKey: businessInfo.firecrawlApiKey,
            extractionType: 'semantic_only',
            enableFallback: true,
          });
          if (extracted.semantic?.content) {
            contentMapRef.current.set(item.id, extracted.semantic.content);
          }
        } catch {
          // Skip pages that fail to fetch
        }
        setFetchProgress({ current: i + 1, total: pagesWithoutContent.length });
      }
      setIsFetchingContent(false);
      setFetchProgress(null);
    }

    // Run batch semantic analysis
    await batchAnalysis.startBatch(inventory, contentMapRef.current);
    onRefreshInventory();
  }, [inventory, businessInfo, batchAnalysis, onRefreshInventory]);

  // ── Step 4: Auto-detect pillars when entering ──────────────────────────
  useEffect(() => {
    if (currentStep === 4 && !pillarDetection.suggestion && !pillarDetection.isLoading) {
      pillarDetection.detect(inventory);
    }
  }, [currentStep, inventory, pillarDetection]);

  const handlePillarConfirm = useCallback((pillars: SEOPillars, _language: string, _region: string) => {
    setConfirmedPillars(pillars);
    goToStep(5);
  }, [goToStep]);

  const handlePillarRegenerate = useCallback(() => {
    pillarDetection.detect(inventory);
  }, [inventory, pillarDetection]);

  // ── Step 5: Generate augmented map ─────────────────────────────────────
  const handleGenerateMap = useCallback(async () => {
    if (!confirmedPillars) {
      setMapValidationError('Confirmed pillars are required. Go back to Step 4.');
      return;
    }
    const validation = validatePillarsForAnalysis(confirmedPillars);
    if (!validation.valid) {
      setMapValidationError(validation.errors.join(' '));
      return;
    }
    setMapValidationError(null);
    await augmentedMap.generate(inventory, confirmedPillars, businessInfo, dispatch);
  }, [confirmedPillars, inventory, businessInfo, dispatch, augmentedMap]);

  // Sync editable topics when augmented map generates
  useEffect(() => {
    if (augmentedMap.topics.length > 0) {
      setEditableTopics([...augmentedMap.topics]);
    }
  }, [augmentedMap.topics]);

  const handleRemoveTopic = useCallback((topicId: string) => {
    setEditableTopics(prev => prev.filter(t => t.id !== topicId));
  }, []);

  const handleEditTopicTitle = useCallback((topicId: string, newTitle: string) => {
    setEditableTopics(prev => prev.map(t =>
      t.id === topicId ? { ...t, title: newTitle } : t
    ));
  }, []);

  // ── Step 6: Auto-compute overlay when entering ─────────────────────────
  useEffect(() => {
    if (currentStep === 6 && editableTopics.length > 0) {
      const overlayTopics: EnrichedTopic[] = editableTopics.map(t => ({
        id: t.id,
        map_id: mapId,
        title: t.title,
        slug: t.slug,
        description: t.description,
        type: t.type,
        freshness: t.freshness,
        parent_topic_id: t.parent_topic_id,
      }));
      overlay.compute(overlayTopics, inventory);
    }
  }, [currentStep, editableTopics, inventory, mapId, overlay]);

  // ── Render ──────────────────────────────────────────────────────────────
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
                  onClick={() => isClickable && setCurrentStep(step.number as StepNumber)}
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

      {/* Business Settings Toggle */}
      <div className="flex-shrink-0 px-4 py-1.5 flex items-center gap-2 border-b border-gray-700/50">
        <button
          onClick={() => setShowBusinessSettings(prev => !prev)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors ${
            showBusinessSettings
              ? 'bg-amber-900/30 border border-amber-700 text-amber-300'
              : !hasBusinessInfo || !effectiveAudience
                ? 'bg-amber-900/20 border border-amber-700/50 text-amber-400 animate-pulse'
                : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          <span>{showBusinessSettings ? '\u25BC' : '\u25B6'}</span>
          Business Settings
          {(!hasBusinessInfo || !effectiveAudience) && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
          )}
        </button>
        {hasBusinessInfo && (
          <span className="text-[10px] text-gray-500">
            {effectiveLanguage} &middot; {effectiveIndustry}
            {effectiveAudience ? ` \u00B7 ${effectiveAudience}` : ''}
            {effectiveDomain ? ` \u00B7 ${effectiveDomain}` : ''}
          </span>
        )}
      </div>

      {/* Collapsible Business Settings Panel */}
      {showBusinessSettings && (
        <ExistingSiteInlineBusinessInfoForm
          mapId={mapId}
          inventory={inventory}
          initialLanguage={effectiveLanguage}
          initialIndustry={effectiveIndustry}
          initialDomain={effectiveDomain}
          initialAudience={effectiveAudience}
          currentBusinessInfo={businessInfo}
          dispatch={dispatch}
          onSaved={() => {
            setAnalysisValidationError(null);
            setShowBusinessSettings(false);
          }}
        />
      )}

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ─── Step 1: Business Context ───────────────────────────────────── */}
        {currentStep === 1 && (
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-white">Business Context</h2>
            <p className="text-gray-400 text-sm">
              Define your business information before proceeding. This context is used by all AI-driven analysis.
            </p>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-4">
              {hasBusinessInfo ? (
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-500">Language:</span>
                    <span className="text-white">{effectiveLanguage}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-500">Industry:</span>
                    <span className="text-white">{effectiveIndustry}</span>
                  </div>
                  {effectiveAudience && (
                    <div className="flex gap-2">
                      <span className="text-gray-500">Audience:</span>
                      <span className="text-white">{effectiveAudience}</span>
                    </div>
                  )}
                  {effectiveDomain && (
                    <div className="flex gap-2">
                      <span className="text-gray-500">Domain:</span>
                      <span className="text-white">{effectiveDomain}</span>
                    </div>
                  )}
                  {!effectiveAudience && (
                    <p className="text-xs text-amber-400 mt-2">
                      Audience is required for semantic analysis.{' '}
                      <button onClick={() => setShowBusinessSettings(true)} className="underline hover:text-amber-300">
                        Open Business Settings
                      </button>{' '}
                      to add it.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-sm text-amber-300">
                  <p>No business context set yet.</p>
                  <button
                    onClick={() => setShowBusinessSettings(true)}
                    className="mt-2 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-500 text-sm font-medium"
                  >
                    Open Business Settings
                  </button>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBusinessSettings(true)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
                >
                  Edit Settings
                </button>
                {hasBusinessInfo && (
                  <button
                    onClick={() => goToStep(2)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm font-medium"
                  >
                    Continue to Import
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 2: Import ─────────────────────────────────────────────── */}
        {currentStep === 2 && (
          <div className="max-w-4xl mx-auto">
            <ImportStep
              projectId={projectId}
              mapId={mapId}
              inventory={inventory}
              onComplete={() => goToStep(3)}
              onRefreshInventory={onRefreshInventory}
            />
            <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={() => goToStep(1)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
              >
                Back
              </button>
              {inventory.length > 0 && (
                <button
                  onClick={() => goToStep(3)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm font-medium"
                >
                  Continue to Analyze
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── Step 3: Semantic Analysis ──────────────────────────────────── */}
        {currentStep === 3 && (
          <div className="max-w-4xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-white">Semantic Analysis</h2>
            <p className="text-gray-400 text-sm">
              Run batch semantic analysis to detect Central Entities, Source Context, and Search Intent across all pages.
            </p>

            {/* Validation error */}
            {analysisValidationError && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
                {analysisValidationError.replace(/Set it in Business Info\./g, '')}
                <button
                  onClick={() => setShowBusinessSettings(true)}
                  className="ml-1 underline text-amber-400 hover:text-amber-300"
                >
                  Open Business Settings
                </button>
              </div>
            )}

            {/* Already analyzed count */}
            {(() => {
              const analyzedCount = inventory.filter(i => i.detected_ce).length;
              return analyzedCount > 0 && !batchAnalysis.isRunning && (
                <div className="bg-green-900/20 border border-green-700/50 rounded-lg px-4 py-3 text-sm text-green-300">
                  {analyzedCount} of {inventory.length} pages already have semantic data.
                </div>
              );
            })()}

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-4">
              {/* Content fetching progress */}
              {isFetchingContent && fetchProgress && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-blue-300">
                    <span className="animate-spin">&#9881;</span>
                    Fetching page content... {fetchProgress.current}/{fetchProgress.total}
                  </div>
                  <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all"
                      style={{ width: `${(fetchProgress.current / fetchProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Batch analysis progress */}
              {batchAnalysis.isRunning && batchAnalysis.progress && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-blue-300">
                    <span className="animate-spin">&#9881;</span>
                    Analyzing pages... {batchAnalysis.progress.completed}/{batchAnalysis.progress.total}
                    {batchAnalysis.progress.failed > 0 && (
                      <span className="text-gray-500 ml-2">({batchAnalysis.progress.failed} failed)</span>
                    )}
                  </div>
                  <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all"
                      style={{ width: `${(batchAnalysis.progress.completed / batchAnalysis.progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Analysis results */}
              {batchAnalysis.results && !batchAnalysis.isRunning && (
                <div className="space-y-2">
                  <div className="text-sm text-green-400">
                    Analysis complete: {batchAnalysis.results.filter(r => r.success).length} pages analyzed successfully.
                  </div>
                  {batchAnalysis.results.filter(r => r.detectedCE).length > 0 && (
                    <div className="text-xs text-gray-400">
                      Top detected entities: {
                        [...new Set(batchAnalysis.results.filter(r => r.detectedCE).map(r => r.detectedCE))]
                          .slice(0, 5)
                          .join(', ')
                      }
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {batchAnalysis.error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
                  {batchAnalysis.error}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => goToStep(2)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
                >
                  Back
                </button>
                <button
                  onClick={handleRunAnalysis}
                  disabled={batchAnalysis.isRunning || isFetchingContent || inventory.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {batchAnalysis.isRunning || isFetchingContent ? 'Analyzing...' : 'Run Semantic Analysis'}
                </button>
                {batchAnalysis.isRunning && (
                  <button
                    onClick={batchAnalysis.cancel}
                    className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-600 text-sm"
                  >
                    Cancel
                  </button>
                )}
                {batchAnalysis.results && !batchAnalysis.isRunning && (
                  <button
                    onClick={() => goToStep(4)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 text-sm font-medium"
                  >
                    Continue to Pillars
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 4: Pillar Validation ──────────────────────────────────── */}
        {currentStep === 4 && (
          <div className="max-w-3xl mx-auto space-y-4">
            <PillarValidationStep
              suggestion={pillarDetection.suggestion}
              isLoading={pillarDetection.isLoading}
              onConfirm={handlePillarConfirm}
              onRegenerate={handlePillarRegenerate}
            />
            {pillarDetection.error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
                {pillarDetection.error}
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => goToStep(3)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 5: Augmented Map ──────────────────────────────────────── */}
        {currentStep === 5 && (
          <div className="max-w-4xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-white">Augmented Topical Map</h2>
            <p className="text-gray-400 text-sm">
              Review the generated topical map combining discovered topics from your site with AI-identified gaps.
            </p>

            {/* Validation error */}
            {mapValidationError && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
                {mapValidationError}
              </div>
            )}

            {/* Generate button */}
            {editableTopics.length === 0 && !augmentedMap.isGenerating && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center space-y-4">
                <p className="text-gray-400 text-sm">
                  Click below to discover your site's structure and generate a topical map with AI gap analysis.
                </p>
                <button
                  onClick={handleGenerateMap}
                  disabled={augmentedMap.isGenerating}
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

            {/* Topic list */}
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

                <div className="max-h-[50vh] overflow-y-auto space-y-1.5">
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

            {/* Navigation */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => goToStep(4)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
              >
                Back
              </button>
              {editableTopics.length > 0 && (
                <button
                  onClick={() => goToStep(6)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm font-medium"
                >
                  Continue to Overlay
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── Step 6: Coverage Overlay ───────────────────────────────────── */}
        {currentStep === 6 && (
          <div className="max-w-6xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-white">Coverage Overlay</h2>
            <p className="text-gray-400 text-sm">
              See how your existing content maps to the topical map. Green = well covered, Yellow = needs work, Red = gap, Orange = cannibalization.
            </p>

            {overlay.nodes.length > 0 ? (
              <OverlayView
                nodes={overlay.nodes}
                onOpenWorkbench={onOpenWorkbench ? (inventoryId) => {
                  const item = inventory.find(i => i.id === inventoryId);
                  if (item) onOpenWorkbench(item);
                } : undefined}
              />
            ) : (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
                <p className="text-gray-400 text-sm">
                  {overlay.isComputing ? 'Computing overlay...' : 'No overlay data yet. Go back and generate a topical map first.'}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => goToStep(5)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
              >
                Back
              </button>
              <button
                onClick={() => goToStep(7)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm font-medium"
              >
                Continue to Execute
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 7: Execute ────────────────────────────────────────────── */}
        {currentStep === 7 && (
          <div className="max-w-6xl mx-auto">
            <ExecuteStep
              projectId={projectId}
              mapId={mapId}
              inventory={inventory}
              topics={editableTopics.length > 0 ? editableTopics.map(t => ({
                id: t.id,
                map_id: mapId,
                title: t.title,
                slug: t.slug,
                description: t.description,
                type: t.type,
                freshness: t.freshness,
                parent_topic_id: t.parent_topic_id,
              })) : topics}
              onOpenWorkbench={onOpenWorkbench}
              onCreateBrief={onCreateBrief}
              onMarkOptimized={onMarkOptimized}
              onUpdateStatus={onUpdateStatus}
              onUpdateAction={onUpdateAction}
            />
            <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={() => goToStep(6)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
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

// ── Inline Business Info Form ─────────────────────────────────────────────────

interface ExistingSiteInlineBusinessInfoFormProps {
  mapId: string;
  inventory: SiteInventoryItem[];
  initialLanguage?: string;
  initialIndustry?: string;
  initialDomain?: string;
  initialAudience?: string;
  currentBusinessInfo: BusinessInfo;
  dispatch: React.Dispatch<any>;
  onSaved?: () => void;
}

const ExistingSiteInlineBusinessInfoForm: React.FC<ExistingSiteInlineBusinessInfoFormProps> = ({
  mapId, inventory, initialLanguage, initialIndustry, initialDomain, initialAudience, currentBusinessInfo, dispatch, onSaved,
}) => {
  const detectedDomain = useMemo(() => {
    if (initialDomain) return initialDomain;
    for (const item of inventory) {
      if (item.url) {
        try { return new URL(item.url).hostname; } catch { /* skip */ }
      }
    }
    return '';
  }, [inventory, initialDomain]);

  const detectedLanguage = useMemo(() => {
    if (initialLanguage) return initialLanguage;
    const tldMap: Record<string, string> = {
      nl: 'nl', de: 'de', fr: 'fr', es: 'es', it: 'it', pt: 'pt',
      be: 'nl', at: 'de', ch: 'de', uk: 'en', au: 'en', ca: 'en',
    };
    const tld = detectedDomain.split('.').pop()?.toLowerCase() || '';
    return tldMap[tld] || '';
  }, [detectedDomain, initialLanguage]);

  const [language, setLanguage] = useState(detectedLanguage);
  const [industry, setIndustry] = useState(initialIndustry || '');
  const [domain, setDomain] = useState(detectedDomain);
  const [audience, setAudience] = useState(initialAudience || '');

  const handleSave = () => {
    if (!language.trim() || !industry.trim()) return;

    const updatedFields: Partial<BusinessInfo> = {
      language: language.trim(),
      industry: industry.trim(),
      domain: domain.trim(),
      audience: audience.trim(),
    };

    dispatch({
      type: 'UPDATE_MAP_DATA',
      payload: { mapId, data: { business_info: updatedFields } },
    });
    dispatch({
      type: 'SET_BUSINESS_INFO',
      payload: { ...currentBusinessInfo, ...updatedFields },
    });
    onSaved?.();
  };

  return (
    <div className="flex-shrink-0 mx-4 my-2 bg-amber-900/20 border border-amber-700 rounded-lg px-4 py-3">
      <p className="text-xs text-amber-300 mb-2">
        Set your business context. Language, industry, and audience are required for AI analysis.
      </p>
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 uppercase tracking-wider">Language *</label>
          <input type="text" value={language} onChange={(e) => setLanguage(e.target.value)}
            placeholder="e.g. nl, en" className="w-24 px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 uppercase tracking-wider">Industry *</label>
          <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g. roofing, dental" className="w-40 px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 uppercase tracking-wider">Audience *</label>
          <input type="text" value={audience} onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g. homeowners, business owners" className="w-48 px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 uppercase tracking-wider">Domain</label>
          <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. example.nl" className="w-40 px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
        </div>
        <button onClick={handleSave} disabled={!language.trim() || !industry.trim()}
          className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
            language.trim() && industry.trim() ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}>
          Save
        </button>
      </div>
    </div>
  );
};

export default ExistingSiteWizardContainer;
