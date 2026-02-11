
// components/ProjectDashboardContainer.tsx
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useAppState } from '../state/appState';
import { SEOPillars, BusinessInfo, TopicalMap, TopicRecommendation, SemanticTriple } from '../types';
import { useMapData } from '../hooks/useMapData';
import { useKnowledgeGraph } from '../hooks/useKnowledgeGraph';
import { useTopicEnrichment } from '../hooks/useTopicEnrichment';
import { useMapOperations } from '../hooks/useMapOperations';
import { useAnalysisOperations } from '../hooks/useAnalysisOperations';
import { useFoundationPageOperations } from '../hooks/useFoundationPageOperations';
import { useContentOperations } from '../hooks/useContentOperations';

// Import Screens
import { MapSelectionScreen } from './screens';
import ProjectDashboard from './ProjectDashboard';
import MigrationDashboardContainer from './migration/MigrationDashboardContainer';
import { Loader } from './ui/Loader';
import { Button } from './ui/Button';
import DebugStatePanel from './ui/DebugStatePanel';
import AuditDashboard from './AuditDashboard';
import BulkGenerationSummary from './BulkGenerationSummary';
import BulkBriefProgress from './BulkBriefProgress';

// Modals
import {
  ExportSettingsModal,
  NewMapModal,
  BriefReviewModal,
  FlowAuditModal,
  ImprovementConfirmationModal,
} from './modals';
// UnifiedAudit and auditFixes imports moved to useAnalysisOperations hook

interface ProjectDashboardContainerProps {
  onInitiateDeleteMap: (map: TopicalMap) => void;
  onBackToProjects: () => void;
}

const ProjectDashboardContainer: React.FC<ProjectDashboardContainerProps> = ({ onInitiateDeleteMap, onBackToProjects }) => {
    const { state, dispatch } = useAppState();
    const {
        activeProjectId,
        activeMapId,
        topicalMaps,
        knowledgeGraph,
        businessInfo,
        modals,
        isLoading,
        viewMode,
        briefGenerationCurrent,
        briefGenerationTotal,
        briefGenerationStatus
    } = state;

    // Use a ref to track the latest state for long-running processes like batch generation
    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // Save operation locks to prevent concurrent saves that can hang
    // Using refs because we don't want to trigger re-renders on lock state changes
    const saveLocks = useRef<{ [key: string]: boolean }>({});

    // Export settings modal state
    const [showExportSettings, setShowExportSettings] = useState(false);

    // Bulk generation summary modal state
    const [showBulkSummary, setShowBulkSummary] = useState(false);

    // Improvement confirmation modal state
    const [showImprovementConfirmation, setShowImprovementConfirmation] = useState(false);
    const [pendingImprovementOptions, setPendingImprovementOptions] = useState<{ includeTypeReclassifications: boolean }>({ includeTypeReclassifications: true });
    const [isApplyingImprovement, setIsApplyingImprovement] = useState(false);

    const activeProject = useMemo(() => state.projects.find(p => p.id === activeProjectId), [state.projects, activeProjectId]);
    const activeMap = useMemo(() => topicalMaps.find(m => m.id === activeMapId), [topicalMaps, activeMapId]);

    const allTopics = useMemo(() => activeMap?.topics || [], [activeMap]);
    const briefs = useMemo(() => activeMap?.briefs || {}, [activeMap]);

    // REFACTOR 02: Use custom hook for data fetching
    useMapData(activeMapId, activeMap, businessInfo, dispatch);

    // REFACTOR 03: Use custom hook for KG hydration
    useKnowledgeGraph(activeMap, knowledgeGraph, dispatch);

    // Build effective business info: global settings + project domain + map overrides
    // Priority:
    //   - AI settings (provider, model, API keys): Always from global businessInfo
    //   - Domain/project: map.business_info > project > global
    //   - Business context: map.business_info > global
    const effectiveBusinessInfo = useMemo<BusinessInfo>(() => {
        const mapBusinessInfo = activeMap?.business_info as Partial<BusinessInfo> || {};

        // Extract map business context fields (NOT AI settings - those come from global)
        // This prevents stale map business_info.aiProvider from overriding user's current global settings
        const {
            aiProvider: _mapAiProvider,
            aiModel: _mapAiModel,
            geminiApiKey: _gk,
            openAiApiKey: _ok,
            anthropicApiKey: _ak,
            perplexityApiKey: _pk,
            openRouterApiKey: _ork,
            ...mapBusinessContext
        } = mapBusinessInfo;

        return {
            ...businessInfo,
            // Use project domain if map doesn't have one set
            domain: mapBusinessContext.domain || activeProject?.domain || businessInfo.domain,
            projectName: mapBusinessContext.projectName || activeProject?.project_name || businessInfo.projectName,
            // Spread map-specific business context (NOT AI settings)
            ...mapBusinessContext,
            // But ensure domain is always from project if map didn't override it
            ...(mapBusinessContext.domain ? {} : { domain: activeProject?.domain || businessInfo.domain }),
            // AI settings ALWAYS from global (user_settings), not from map's business_info
            aiProvider: businessInfo.aiProvider,
            aiModel: businessInfo.aiModel,
            geminiApiKey: businessInfo.geminiApiKey,
            openAiApiKey: businessInfo.openAiApiKey,
            anthropicApiKey: businessInfo.anthropicApiKey,
            perplexityApiKey: businessInfo.perplexityApiKey,
            openRouterApiKey: businessInfo.openRouterApiKey,
        };
    }, [businessInfo, activeMap, activeProject]);

    // REFACTOR 04: Use custom hook for map operations
    const {
        handleSelectMap,
        handleCreateNewMap,
        handleGenerateInitialMap,
        onSavePillars,
        onConfirmPillarChange,
        handleRegenerateMap,
        handleUpdateEavs,
        handleUpdateCompetitors,
    } = useMapOperations({
        activeProjectId,
        activeMapId,
        activeMap,
        effectiveBusinessInfo,
        businessInfo,
        user: state.user,
        dispatch,
        saveLocks,
    });

    // REFACTOR 03 & Task 05: Use custom hook for Enrichment & Blueprints
    const { handleEnrichData, isEnriching, handleGenerateBlueprints, isGeneratingBlueprints } = useTopicEnrichment(
        activeMapId,
        effectiveBusinessInfo,
        allTopics,
        activeMap?.pillars as SEOPillars | undefined,
        dispatch,
        activeMap?.eavs as SemanticTriple[] | undefined // Pass EAVs for semantic matching
    );

    const canGenerateBriefs = useMemo(() => {
        const hasPillars = !!activeMap?.pillars;
        const hasKg = !!knowledgeGraph;
        return hasPillars && hasKg;
    }, [activeMap?.pillars, knowledgeGraph]);

    const canExpandTopics = useMemo(() => !!(activeMap?.pillars && knowledgeGraph), [activeMap, knowledgeGraph]);

    // REFACTOR 04.2: Use custom hook for analysis operations
    const {
        saveAnalysisState,
        onAnalyzeKnowledgeDomain,
        handleExpandKnowledgeDomain,
        onValidateMap,
        onFindMergeOpportunities,
        onAnalyzeSemanticRelationships,
        onAnalyzeContextualCoverage,
        onAuditInternalLinking,
        onCalculateTopicalAuthority,
        onGeneratePublicationPlan,
        onRunUnifiedAudit,
        handleApplyUnifiedFix,
        handleApplyAllUnifiedFixes,
        onImproveMap,
        onApplyImprovement,
        onExecuteMerge,
        handleAnalyzeGsc,
        onAuditDraft,
        handleAutoFix,
        handleAnalyzeFlow,
        handleFlowAutoFix,
        handleBatchFlowAutoFix,
    } = useAnalysisOperations({
        activeMapId,
        activeMap,
        effectiveBusinessInfo,
        businessInfo,
        knowledgeGraph,
        allTopics,
        briefs,
        dispatch,
        user: state.user,
        websiteStructure: state.websiteStructure,
        unifiedAudit: state.unifiedAudit,
        activeBriefTopic: state.activeBriefTopic,
        improvementLog: state.improvementLog,
        topicalMaps: state.topicalMaps,
        setShowImprovementConfirmation,
        setIsApplyingImprovement,
        pendingImprovementOptions,
        setPendingImprovementOptions,
    });

    // REFACTOR 04.3: Use custom hook for foundation page operations
    const {
        foundationPages,
        napData,
        navigation,
        handleSaveNAPData,
        handleUpdateFoundationPage,
        handleDeleteFoundationPage,
        handleRestoreFoundationPage,
        handleSaveNavigation,
        handleSaveBusinessInfo,
        handleSaveBrandKit,
        handleGenerateMissingFoundationPages,
        handleRepairFoundation,
        handleRepairNavigation,
        handleRepairBriefs,
    } = useFoundationPageOperations({
        activeMapId,
        activeMap,
        effectiveBusinessInfo,
        businessInfo,
        user: state.user,
        dispatch,
        allTopics,
        websiteStructure: state.websiteStructure,
    });

    // REFACTOR 04.4: Use custom hook for content generation & remaining operations
    const {
        handleStartAnalysis,
        onGenerateBrief,
        onGenerateAllBriefs,
        onCancelBriefGeneration,
        onGenerateDraft,
        onGenerateSchema,
        onAddTopic,
        onBulkAddTopics,
        handleOpenExpansionModal,
        handleExpandCoreTopic,
        handleUpdateTopic,
        handleExportData,
        handleEnhancedExport,
        handleSwitchToMigration,
        handleSwitchToCreation,
        handleQuickAudit,
        handleRegenerateFailed,
    } = useContentOperations({
        activeProjectId,
        activeMapId,
        activeMap,
        activeProject,
        effectiveBusinessInfo,
        businessInfo,
        knowledgeGraph,
        allTopics,
        briefs,
        dispatch,
        user: state.user,
        stateRef,
        topicalMaps: state.topicalMaps,
        activeBriefTopic: state.activeBriefTopic,
        validationResult: state.validationResult,
        websiteStructure: state.websiteStructure,
        setShowExportSettings,
        setShowBulkSummary,
    });

    const stateSnapshot = {
        'Active Map Found': !!activeMap,
        'Map Has Pillars': !!activeMap?.pillars,
        'Knowledge Graph Ready': !!knowledgeGraph,
        'Can Generate Briefs (Final Check)': canGenerateBriefs,
        'Effective Business Info': { seedKeyword: effectiveBusinessInfo.seedKeyword, aiProvider: effectiveBusinessInfo.aiProvider, aiModel: effectiveBusinessInfo.aiModel, hasGeminiKey: !!effectiveBusinessInfo.geminiApiKey }
    };

    if (!activeProject) {
        return <div className="flex flex-col items-center justify-center h-screen"><Loader /><p className="mt-4">Loading Project...</p></div>;
    }

    if (isLoading.mapDetails) {
        return <div className="flex flex-col items-center justify-center h-screen"><Loader /><p className="mt-4">Loading Map Details...</p></div>;
    }

    if (!activeMap) {
        return (
            <>
                <MapSelectionScreen
                    projectName={activeProject.project_name}
                    topicalMaps={topicalMaps}
                    onSelectMap={handleSelectMap}
                    onCreateNewMap={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'newMap', visible: true } })}
                    onStartAnalysis={handleStartAnalysis}
                    onBackToProjects={onBackToProjects}
                    onInitiateDeleteMap={onInitiateDeleteMap}
                />
                <NewMapModal
                    isOpen={!!modals.newMap}
                    onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'newMap', visible: false } })}
                    onCreateMap={handleCreateNewMap}
                />
            </>
        );
    }

    // Render based on view mode
    if (viewMode === 'MIGRATION') {
        return (
            <>
                <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700">
                    <Button onClick={handleSwitchToCreation} variant="secondary" className="text-xs">
                        ← Back to Creation Mode
                    </Button>
                    <Button onClick={onBackToProjects} variant="secondary" className="text-xs">
                        Back to Projects
                    </Button>
                </div>
                <MigrationDashboardContainer />
                <DebugStatePanel stateSnapshot={stateSnapshot} />
            </>
        );
    }

    return (
        <>
            <ProjectDashboard
                projectName={activeProject.project_name}
                topicalMap={activeMap}
                knowledgeGraph={knowledgeGraph}
                allTopics={allTopics}
                canExpandTopics={canExpandTopics}
                canGenerateBriefs={canGenerateBriefs}
                effectiveBusinessInfo={effectiveBusinessInfo}
                onAnalyzeKnowledgeDomain={onAnalyzeKnowledgeDomain}
                onAddTopicManually={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'addTopic', visible: true } })}
                onViewInternalLinking={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'internalLinking', visible: true } })}
                onUploadGsc={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'gsc', visible: true } })}
                onGenerateAllBriefs={onGenerateAllBriefs}
                onExportData={handleExportData}
                onValidateMap={onValidateMap}
                onFindMergeOpportunities={onFindMergeOpportunities}
                onAnalyzeSemanticRelationships={onAnalyzeSemanticRelationships}
                onAnalyzeContextualCoverage={onAnalyzeContextualCoverage}
                onAuditInternalLinking={onAuditInternalLinking}
                onCalculateTopicalAuthority={onCalculateTopicalAuthority}
                onGeneratePublicationPlan={onGeneratePublicationPlan}
                onRunUnifiedAudit={onRunUnifiedAudit}
                onRepairBriefs={handleRepairBriefs}
                onExpandCoreTopic={handleOpenExpansionModal}
                expandingCoreTopicId={Object.entries(isLoading).find(([k, v]) => k.startsWith('expand_') && v === true)?.[0].split('_')[1] || null}
                onSavePillars={onSavePillars}
                onBackToProjects={onBackToProjects}
                onAddTopic={onAddTopic}
                onBulkAddTopics={onBulkAddTopics}
                onAddTopicFromRecommendation={async (rec: TopicRecommendation) => { await onAddTopic({ title: rec.title, description: rec.description, type: 'outer', parent_topic_id: null, freshness: 'STANDARD' as any }, 'ai') }}
                onAnalyzeGsc={handleAnalyzeGsc}
                onAddTopicFromGsc={async (title, desc) => { await onAddTopic({ title, description: desc, type: 'outer', parent_topic_id: null, freshness: 'STANDARD' as any }, 'ai') }}
                onImproveMap={onImproveMap}
                onExecuteMerge={onExecuteMerge}
                onAddTopicFromContextualGap={async (title, desc) => { await onAddTopic({ title, description: desc || '', type: 'outer', parent_topic_id: null, freshness: 'STANDARD' as any }, 'ai') }}
                onGenerateBrief={onGenerateBrief}
                onGenerateDraft={onGenerateDraft}
                onAuditDraft={onAuditDraft}
                onGenerateSchema={onGenerateSchema}
                onConfirmPillarChange={onConfirmPillarChange}
                onExpandKnowledgeDomain={handleExpandKnowledgeDomain}
                onFindAndAddMissingKnowledgeTerms={handleExpandKnowledgeDomain}
                onGenerateInitialMap={handleGenerateInitialMap}
                // New Context Management Props
                onUpdateEavs={handleUpdateEavs}
                onUpdateCompetitors={handleUpdateCompetitors}
                onRegenerateMap={handleRegenerateMap}
                onExpandWithContext={handleExpandCoreTopic}
                // REFACTOR 03: Pass new props to dashboard
                onEnrichData={handleEnrichData}
                isEnriching={isEnriching}
                // Task 05: Blueprint Props
                onGenerateBlueprints={handleGenerateBlueprints}
                isGeneratingBlueprints={isGeneratingBlueprints}
                // Authorship Refinement
                onAutoFix={handleAutoFix}
                // Topic Update Handler
                onUpdateTopic={handleUpdateTopic}
                // Flow Audit
                onAnalyzeFlow={handleAnalyzeFlow}
                // Migration Mode Props
                onQuickAudit={handleQuickAudit}
                onSwitchToMigration={handleSwitchToMigration}
                // Foundation Pages Props
                foundationPages={foundationPages}
                napData={napData}
                isLoadingFoundationPages={!!isLoading.foundationPages}
                onSaveNAPData={handleSaveNAPData}
                onUpdateFoundationPage={handleUpdateFoundationPage}
                onDeleteFoundationPage={handleDeleteFoundationPage}
                onRestoreFoundationPage={handleRestoreFoundationPage}
                onGenerateMissingFoundationPages={handleGenerateMissingFoundationPages}
                onRepairFoundation={handleRepairFoundation}
                isRepairingFoundation={!!isLoading.repairFoundation}
                onRepairNavigation={handleRepairNavigation}
                isRepairingNavigation={!!isLoading.repairNavigation}
                // Navigation
                navigation={navigation}
                onSaveNavigation={handleSaveNavigation}
                // Brand Kit
                onSaveBrandKit={handleSaveBrandKit}
                // Business Info / Map Settings
                onSaveBusinessInfo={handleSaveBusinessInfo}
            />
            <BriefReviewModal
                isOpen={!!modals.briefReview}
            />
            <DebugStatePanel stateSnapshot={stateSnapshot} />
            <FlowAuditModal
                isOpen={!!modals.flowAudit}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'flowAudit', visible: false }})}
                result={state.flowAuditResult}
                onAutoFix={handleFlowAutoFix}
                onBatchAutoFix={handleBatchFlowAutoFix}
                onRefreshAnalysis={async () => {
                    const brief = state.activeBriefTopic ? briefs[state.activeBriefTopic.id] : null;
                    if (brief?.articleDraft) {
                        await handleAnalyzeFlow(brief.articleDraft);
                    }
                }}
                isRefreshing={!!state.isLoading?.flowAudit}
            />

            {/* Unified Audit Dashboard (Phase 6) */}
            <AuditDashboard
                isOpen={!!modals.unifiedAudit}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'unifiedAudit', visible: false }})}
                result={state.unifiedAudit.result}
                isLoading={state.unifiedAudit.isRunning}
                onRunAudit={onRunUnifiedAudit}
                onApplyFix={handleApplyUnifiedFix}
                onApplyAllFixes={handleApplyAllUnifiedFixes}
                isApplyingFix={!!isLoading.applyingFix}
                historyEntries={state.unifiedAudit.fixHistory}
            />

            {/* Export Settings Modal */}
            <ExportSettingsModal
                isOpen={showExportSettings}
                onClose={() => setShowExportSettings(false)}
                onExport={handleEnhancedExport}
                hasSchemas={false}
                hasAuditResults={!!state.validationResult}
            />

            {/* Bulk Generation Progress Modal */}
            <BulkBriefProgress
                isOpen={briefGenerationTotal > 0}
                current={briefGenerationCurrent}
                total={briefGenerationTotal}
                currentTopicTitle={briefGenerationStatus}
                onCancel={onCancelBriefGeneration}
            />

            {/* Bulk Generation Summary Modal */}
            <BulkGenerationSummary
                isOpen={showBulkSummary}
                onClose={() => setShowBulkSummary(false)}
                topics={allTopics}
                briefs={briefs}
                onRegenerateFailed={handleRegenerateFailed}
            />

            {/* Improvement Confirmation Modal */}
            <ImprovementConfirmationModal
                isOpen={showImprovementConfirmation}
                onClose={() => {
                    setShowImprovementConfirmation(false);
                    dispatch({ type: 'SET_IMPROVEMENT_LOG', payload: null });
                }}
                suggestion={state.improvementLog}
                onConfirm={onApplyImprovement}
                isApplying={isApplyingImprovement}
            />
        </>
    );
};

export default ProjectDashboardContainer;
