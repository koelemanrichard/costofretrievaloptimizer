
// components/ProjectDashboard.tsx
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useAppState } from '../state/appState';
import { TopicalMap, EnrichedTopic, ContentBrief, BusinessInfo, SEOPillars, TopicRecommendation, GscRow, ValidationIssue, MergeSuggestion, ResponseCode, SemanticTriple, ExpansionMode, AuditRuleResult, ContextualFlowIssue, FoundationPage, FoundationPageType, NAPData, NavigationStructure, ExpandedTemplateResult, FreshnessProfile } from '../types';
import { getSupabaseClient } from '../services/supabaseClient';
import { KnowledgeGraph as KnowledgeGraphClass } from '../lib/knowledgeGraph';
import { calculateDashboardMetrics } from '../utils/helpers';
import { calculateNextSteps, RecommendationType } from '../services/recommendationEngine';

// Import child components
import TopicalMapDisplay from './TopicalMapDisplay';
import { NextStepsWidget } from './dashboard/NextStepsWidget';
import { FoundationPagesPanel } from './FoundationPagesPanel';

// Modals
import {
  AddTopicModal,
  ContentBriefModal,
  KnowledgeDomainModal,
  GscExpansionHubModal,
  ValidationResultModal,
  MergeSuggestionsModal,
  SemanticAnalysisModal,
  ContextualCoverageModal,
  InternalLinkingAuditModal,
  LinkingAuditModal,
  TopicalAuthorityModal,
  PublicationPlanModal,
  ImprovementLogModal,
  DraftingModal,
  SchemaModal,
  ContentIntegrityModal,
  ResponseCodeSelectionModal,
  BriefReviewModal,
  InternalLinkingModal,
  PillarChangeConfirmationModal,
  EavManagerModal,
  CompetitorManagerModal,
  TopicExpansionModal,
  TopicResourcesModal,
  BusinessInfoModal,
  PillarEditModal,
} from './modals';
import { LocationManagerModal } from './templates/LocationManagerModal';
import { PlanningDashboard, PerformanceImportModal } from './planning';
import { KPStrategyPage } from './KPStrategyPage';
import { EntityAuthorityPage } from './EntityAuthorityPage';
import { QueryNetworkAudit } from './QueryNetworkAudit';
import { MentionScannerDashboard } from './MentionScannerDashboard';
import { CorpusAuditReport } from './CorpusAuditReport';
import { EnhancedMetricsDashboard } from './dashboard/EnhancedMetricsDashboard';
import { ComprehensiveAuditDashboard } from './dashboard/ComprehensiveAuditDashboard';
import { InsightsHub } from './insights';

// Gamification Components
import { ConfidenceDashboard, PriorityTieringSystem } from './gamification';

import { Button } from './ui/Button';
import { FeatureErrorBoundary } from './ui/FeatureErrorBoundary';
import TabNavigation, { createDashboardTabs, NavIcons } from './dashboard/TabNavigation';
import StrategyOverview from './dashboard/StrategyOverview';
import CollapsiblePanel from './dashboard/CollapsiblePanel';

interface ProjectDashboardProps {
  projectName: string;
  topicalMap: TopicalMap;
  knowledgeGraph: KnowledgeGraphClass | null;
  allTopics: EnrichedTopic[];
  canExpandTopics: boolean;
  canGenerateBriefs: boolean;
  effectiveBusinessInfo: BusinessInfo;

  // Action Handlers
  onAnalyzeKnowledgeDomain: () => void;
  onAddTopicManually: () => void;
  onViewInternalLinking: () => void;
  onUploadGsc: () => void;
  onGenerateAllBriefs: () => void;
  onExportData: (format: 'csv' | 'xlsx') => void;
  onValidateMap: () => void;
  onFindMergeOpportunities: () => void;
  onAnalyzeSemanticRelationships: () => void;
  onAnalyzeContextualCoverage: () => void;
  onAuditInternalLinking: () => void;
  onCalculateTopicalAuthority: () => void;
  onGeneratePublicationPlan: () => void;
  onRunUnifiedAudit: () => void;
  onRepairBriefs?: () => Promise<{ repaired: number; skipped: number; errors: string[] }>;
  onExpandCoreTopic: (coreTopic: EnrichedTopic, mode: ExpansionMode, userContext?: string, overrideSettings?: { provider: string, model: string }) => void;
  expandingCoreTopicId: string | null;
  onSavePillars: (newPillars: SEOPillars) => void;
  onBackToProjects: () => void;

  // Modal Action Handlers
  onAddTopic: (topicData: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>, placement: 'ai' | 'root' | string, overrideSettings?: { provider: string, model: string }) => void;
  onBulkAddTopics?: (topics: {data: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>, placement: 'ai' | 'root' | string}[]) => Promise<void>;
  onAddTopicFromRecommendation: (recommendation: TopicRecommendation) => Promise<void>;
  onAnalyzeGsc: (gscData: GscRow[]) => void;
  onAddTopicFromGsc: (title: string, description: string) => void;
  onImproveMap: (issues: ValidationIssue[]) => void;
  onExecuteMerge: (suggestion: any) => void;
  onAddTopicFromContextualGap: (title: string, description?: string) => Promise<void>;
  onGenerateBrief: (topic: EnrichedTopic, responseCode: ResponseCode, overrideSettings?: { provider: string, model: string }) => void;
  onGenerateDraft: (brief: ContentBrief, overrideSettings?: { provider: string, model: string }) => void;
  onAuditDraft: (brief: ContentBrief, draft: string) => void;
  onGenerateSchema: (brief: ContentBrief) => void;
  onConfirmPillarChange: (strategy: 'keep' | 'regenerate') => void;
  onExpandKnowledgeDomain: () => void;
  onFindAndAddMissingKnowledgeTerms: () => void;
  onGenerateInitialMap?: () => void;

  // Context Management
  onUpdateEavs: (newEavs: SemanticTriple[]) => Promise<void>;
  onUpdateCompetitors: (newCompetitors: string[]) => Promise<void>;
  onRegenerateMap: () => Promise<void>;
  onExpandWithContext: (topic: EnrichedTopic, mode: ExpansionMode, context?: string, overrideSettings?: { provider: string, model: string }) => void;

  // Data Enrichment & Blueprinting
  onEnrichData: () => Promise<void>;
  isEnriching?: boolean;
  onGenerateBlueprints: () => Promise<void>;
  isGeneratingBlueprints?: boolean;

  // Authorship Refinement
  onAutoFix: (rule: AuditRuleResult, fullDraft: string) => Promise<void>;

  // Topic Update
  onUpdateTopic: (topicId: string, updates: Partial<EnrichedTopic>) => void;

  // Flow Audit
  onAnalyzeFlow: (draft: string) => void;

  // Quick Audit
  onQuickAudit: (url: string) => void;

  // Mode Switching
  onSwitchToMigration: () => void;

  // Foundation Pages
  foundationPages: FoundationPage[];
  napData?: NAPData;
  isLoadingFoundationPages?: boolean;
  onSaveNAPData: (napData: NAPData) => Promise<void>;
  onUpdateFoundationPage: (pageId: string, updates: Partial<FoundationPage>) => Promise<void>;
  onDeleteFoundationPage: (pageId: string) => Promise<void>;
  onRestoreFoundationPage: (pageId: string) => Promise<void>;
  onGenerateMissingFoundationPages?: () => Promise<void>;
  onRepairFoundation?: (missingPages: FoundationPageType[]) => void;
  isRepairingFoundation?: boolean;
  onRepairNavigation?: () => void;
  isRepairingNavigation?: boolean;
  // Navigation
  navigation?: NavigationStructure | null;
  onSaveNavigation?: (navigation: NavigationStructure) => Promise<void>;
  // Brand Kit
  onSaveBrandKit?: (brandKit: any) => Promise<void>;
  // Business Info / Map Settings
  onSaveBusinessInfo?: (updates: Partial<BusinessInfo>) => Promise<void>;
}


const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
    projectName,
    topicalMap,
    knowledgeGraph,
    allTopics,
    canExpandTopics,
    canGenerateBriefs,
    effectiveBusinessInfo,
    onAnalyzeKnowledgeDomain,
    onAddTopicManually,
    onViewInternalLinking,
    onUploadGsc,
    onGenerateAllBriefs,
    onExportData,
    onValidateMap,
    onFindMergeOpportunities,
    onAnalyzeSemanticRelationships,
    onAnalyzeContextualCoverage,
    onAuditInternalLinking,
    onCalculateTopicalAuthority,
    onGeneratePublicationPlan,
    onRunUnifiedAudit,
    onRepairBriefs,
    onExpandCoreTopic,
    expandingCoreTopicId,
    onSavePillars,
    onBackToProjects,
    onAddTopic,
    onBulkAddTopics,
    onAddTopicFromRecommendation,
    onAnalyzeGsc,
    onAddTopicFromGsc,
    onImproveMap,
    onExecuteMerge,
    onAddTopicFromContextualGap,
    onGenerateBrief,
    onGenerateDraft,
    onAuditDraft,
    onGenerateSchema,
    onConfirmPillarChange,
    onExpandKnowledgeDomain,
    onFindAndAddMissingKnowledgeTerms,
    onGenerateInitialMap,
    onUpdateEavs,
    onUpdateCompetitors,
    onRegenerateMap,
    onExpandWithContext,
    onEnrichData,
    isEnriching,
    onGenerateBlueprints,
    isGeneratingBlueprints,
    onAutoFix,
    onUpdateTopic,
    onAnalyzeFlow,
    onQuickAudit,
    onSwitchToMigration,
    // Foundation Pages
    foundationPages,
    napData,
    isLoadingFoundationPages,
    onSaveNAPData,
    onUpdateFoundationPage,
    onDeleteFoundationPage,
    onRestoreFoundationPage,
    onGenerateMissingFoundationPages,
    onRepairFoundation,
    isRepairingFoundation,
    onRepairNavigation,
    isRepairingNavigation,
    // Navigation
    navigation,
    onSaveNavigation,
    // Brand Kit
    onSaveBrandKit,
    // Business Info / Map Settings
    onSaveBusinessInfo
}) => {
    const { state, dispatch } = useAppState();
    const { modals, isLoading, briefGenerationStatus, validationResult, unifiedAudit } = state;
    const [topicForBrief, setTopicForBrief] = useState<EnrichedTopic | null>(null);
    const [isBusinessInfoModalOpen, setIsBusinessInfoModalOpen] = useState(false);

    // Ref for scrolling to Website Structure section
    const websiteStructureRef = useRef<HTMLDivElement>(null);
    const scrollToWebsiteStructure = useCallback(() => {
        websiteStructureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const coreTopics = useMemo(() => allTopics.filter(t => t.type === 'core'), [allTopics]);
    const outerTopics = useMemo(() => allTopics.filter(t => t.type === 'outer'), [allTopics]);
    const childTopics = useMemo(() => allTopics.filter(t => t.type === 'child'), [allTopics]);
    const briefs = useMemo(() => topicalMap.briefs || {}, [topicalMap.briefs]);

    const metrics = useMemo(() => calculateDashboardMetrics({
        briefs,
        knowledgeGraph,
        allTopics
    }), [briefs, knowledgeGraph, allTopics]);

    // Calculate Next Steps
    const recommendations = useMemo(() =>
        calculateNextSteps(topicalMap, validationResult),
    [topicalMap, validationResult]);

    const handleSelectTopicForBrief = useCallback((topic: EnrichedTopic) => {
        const briefExists = !!briefs[topic.id];

        setTopicForBrief(topic);

        if (briefExists) {
            dispatch({ type: 'SET_ACTIVE_BRIEF_TOPIC', payload: topic });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'contentBrief', visible: true } });
            return;
        }

        if (canGenerateBriefs) {
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'responseCode', visible: true } });
        } else {
            dispatch({ type: 'SET_ERROR', payload: "Cannot generate brief. Please ensure you have defined SEO Pillars and run 'Analyze Domain' action at least once." });
        }
    }, [dispatch, briefs, canGenerateBriefs]);

    // Handler for bulk updating topics (used by Auto-Fix for search intents)
    const handleBulkUpdateTopics = useCallback(async (updatedTopics: EnrichedTopic[]) => {
        for (const topic of updatedTopics) {
            onUpdateTopic(topic.id, {
                search_intent: topic.search_intent,
                metadata: topic.metadata
            });
        }
    }, [onUpdateTopic]);

    // Handler for adding topics from Auto-Fix (adapts simplified interface to onAddTopic)
    const handleAutoFixAddTopic = useCallback(async (topic: { title: string; type: 'core' | 'outer'; search_intent?: string; parentId?: string }) => {
        const topicData: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'> = {
            title: topic.title,
            type: topic.type,
            search_intent: topic.search_intent as EnrichedTopic['search_intent'],
            parent_topic_id: topic.parentId || null,
            cluster_role: topic.type === 'core' ? 'pillar' : 'cluster_content',
            description: '',
            freshness: FreshnessProfile.EVERGREEN,
            metadata: {
                auto_fix_generated: true,
                created_at: new Date().toISOString()
            }
        };
        // Use 'ai' placement to let the system determine best position, or use parentId if provided
        const placement = topic.parentId || 'ai';
        onAddTopic(topicData, placement);
    }, [onAddTopic]);

    const handleGenerateBriefFromModal = (topic: EnrichedTopic, responseCode: ResponseCode, overrideSettings?: { provider: string, model: string }) => {
        onGenerateBrief(topic, responseCode, overrideSettings);
    };

    const handleRecommendationAction = (type: RecommendationType) => {
        switch (type) {
            case 'GENERATE_INITIAL_MAP':
                if(onGenerateInitialMap) onGenerateInitialMap();
                break;
            case 'ANALYZE_DOMAIN':
                onAnalyzeKnowledgeDomain();
                break;
            case 'GENERATE_BRIEFS':
                onGenerateAllBriefs();
                break;
            case 'VALIDATE_MAP':
                onValidateMap();
                break;
            case 'FIX_VALIDATION_ISSUES':
                // Open validation modal which has the "Fix" button
                dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'validation', visible: true } });
                break;
            case 'EXPAND_TOPICS':
                // Open Add Topic modal or trigger expansion.
                // For "Strengthen Core Clusters", adding manually or expanding a specific core is best.
                // Let's open Add Topic manual for now, or scroll to map.
                dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'addTopic', visible: true } });
                break;
            case 'EXPORT_DATA':
                // Trigger default export (Excel)
                onExportData('xlsx');
                break;
        }
    };

    // Handle topics generated from query templates
    const handleTemplateGeneratedTopics = useCallback(async (result: ExpandedTemplateResult) => {
        if (!topicalMap.id || result.generated_topics.length === 0) return;

        const user = state.user;
        if (!user?.id) {
            dispatch({ type: 'SET_ERROR', payload: 'User not authenticated' });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'templateExpansion', value: true } });
        try {
            const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);

            // Insert generated topics to database
            const topicsToInsert = result.generated_topics.map(topic => ({
                id: topic.id,
                map_id: topicalMap.id,
                parent_topic_id: topic.parent_topic_id,
                title: topic.title,
                slug: topic.slug,
                description: topic.description,
                type: topic.type || 'outer',
                freshness: topic.freshness || 'EVERGREEN',
                user_id: user.id,
            }));

            const { data, error } = await supabase
                .from('topics')
                .insert(topicsToInsert)
                .select();

            if (error) throw error;

            // Update local state
            if (data) {
                dispatch({
                    type: 'SET_TOPICS_FOR_MAP',
                    payload: {
                        mapId: topicalMap.id,
                        topics: [...allTopics, ...data as EnrichedTopic[]],
                    },
                });
            }

            dispatch({
                type: 'SET_NOTIFICATION',
                payload: `Generated ${result.generated_topics.length} topics from template "${result.original_template.name}"`,
            });

        } catch (e) {
            console.error('Template topic generation error:', e);
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to generate topics from template' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'templateExpansion', value: false } });
        }
    }, [topicalMap.id, effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey, allTopics, dispatch, state.user]);

    // Location Manager Modal state
    const [showLocationManager, setShowLocationManager] = useState(false);

    // KP Strategy and Entity Authority page states
    const [showKPStrategy, setShowKPStrategy] = useState(false);
    const [showEntityAuthority, setShowEntityAuthority] = useState(false);

    // Create navigation tabs configuration
    const dashboardTabs = createDashboardTabs({
        onEditPillars: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'pillarEdit', visible: true } }),
        onManageEavs: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'eavManager', visible: true } }),
        onManageCompetitors: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'competitorManager', visible: true } }),
        onBusinessInfo: () => setIsBusinessInfoModalOpen(true),
        onGenerateBriefs: onGenerateAllBriefs,
        onAddTopic: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'addTopic', visible: true } }),
        onUploadGsc: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'gsc', visible: true } }),
        onValidate: onValidateMap,
        onLinkAudit: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'multiPassLinkingAudit', visible: true } }),
        onUnifiedAudit: onRunUnifiedAudit,
        onQueryNetworkAudit: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'queryNetworkAudit', visible: true } }),
        onMentionScanner: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'mentionScanner', visible: true } }),
        onCorpusAudit: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'corpusAudit', visible: true } }),
        onEnhancedMetrics: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'enhancedMetrics', visible: true } }),
        onComprehensiveAudit: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'comprehensiveAudit', visible: true } }),
        onMapAuditDashboard: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'mapAuditDashboard', visible: true } }),
        onRegenerateMap: onRegenerateMap,
        onRepairBriefs: onRepairBriefs,
        onExport: () => onExportData('xlsx'),
        isValidating: !!isLoading.validation,
        isAuditing: !!isLoading.linkAudit,
        canGenerateBriefs: canGenerateBriefs,
        // Current values for dropdown display
        currentPillars: topicalMap.pillars ? {
            ce: topicalMap.pillars.centralEntity,
            sc: topicalMap.pillars.sourceContext,
            csi: topicalMap.pillars.centralSearchIntent,
        } : undefined,
        eavCount: (topicalMap.eavs as any[])?.length || 0,
        competitorCount: topicalMap.competitors?.length || 0,
        // Planning
        onOpenPlanning: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'planningDashboard', visible: true } }),
        onGeneratePlan: onGeneratePublicationPlan,
        onImportPerformance: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'performanceImport', visible: true } }),
        isGeneratingPlan: state.publicationPlanning?.isGeneratingPlan,
        hasPlan: !!state.publicationPlanning?.planResult,
        // KP Strategy and Entity Authority
        onKPStrategy: () => setShowKPStrategy(true),
        onEntityAuthority: () => setShowEntityAuthority(true),
    });

    return (
        <div className="space-y-6 max-w-7xl w-full">
            {/* Compact Header */}
            <header className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-white">{projectName}</h1>
                <p className="text-sm text-gray-400">Topical Map: {topicalMap.name}</p>
              </div>
              <div className="flex gap-2">
                  <Button onClick={onSwitchToMigration} variant="secondary" className="text-sm">
                      Migration Workbench
                  </Button>
                  <Button onClick={onBackToProjects} variant="ghost" className="text-sm">Back to Projects</Button>
              </div>
            </header>

            {/* Tab Navigation - All actions in one place */}
            <TabNavigation tabs={dashboardTabs} />

            {/* Condensed Strategy Overview */}
            <CollapsiblePanel
                id="strategy-overview"
                title="Strategy Overview"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                defaultExpanded={true}
                persistKey="dashboard-strategy"
            >
                <StrategyOverview
                    pillars={topicalMap.pillars}
                    topics={allTopics}
                    briefs={briefs}
                    eavs={topicalMap.eavs as SemanticTriple[] || []}
                    knowledgeGraph={knowledgeGraph}
                    onEditPillars={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'pillarEdit', visible: true } })}
                    onEditEavs={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'eavManager', visible: true } })}
                    onEditCompetitors={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'competitorManager', visible: true } })}
                />
            </CollapsiblePanel>

            {/* Semantic Authority Score (Gamification) */}
            <CollapsiblePanel
                id="semantic-authority"
                title="Semantic Authority Score"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                defaultExpanded={false}
                persistKey="dashboard-semantic-score"
            >
                <FeatureErrorBoundary featureName="Semantic Authority Score">
                    <ConfidenceDashboard
                        map={topicalMap}
                        briefs={Object.values(briefs)}
                        dispatch={dispatch}
                        onSaveEavs={onUpdateEavs}
                        onSaveTopics={handleBulkUpdateTopics}
                        onAddTopic={handleAutoFixAddTopic}
                    />
                </FeatureErrorBoundary>
            </CollapsiblePanel>

            {/* Content Priority Tiers (Gamification) */}
            <CollapsiblePanel
                id="priority-tiers"
                title="Content Priority Tiers"
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>}
                defaultExpanded={false}
                persistKey="dashboard-priority-tiers"
            >
                <FeatureErrorBoundary featureName="Priority Tiers">
                    <PriorityTieringSystem
                        map={topicalMap}
                        briefs={Object.values(briefs)}
                        onTopicClick={(topicId) => {
                            const topic = allTopics.find(t => t.id === topicId);
                            if (topic) handleSelectTopicForBrief(topic);
                        }}
                    />
                </FeatureErrorBoundary>
            </CollapsiblePanel>

            {/* Priority Recommendations (Compact) */}
            {recommendations.length > 0 && (
                <CollapsiblePanel
                    id="next-steps"
                    title={`Next Steps (${recommendations.length})`}
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                    defaultExpanded={recommendations.some(r => r.priority === 'CRITICAL')}
                    persistKey="dashboard-nextsteps"
                >
                    <NextStepsWidget recommendations={recommendations} onAction={handleRecommendationAction} />
                </CollapsiblePanel>
            )}

            {/* Main Content: Topical Map */}
            <FeatureErrorBoundary featureName="Topical Map">
                <TopicalMapDisplay
                    coreTopics={coreTopics}
                    outerTopics={outerTopics}
                    childTopics={childTopics}
                    briefs={briefs}
                    onSelectTopicForBrief={handleSelectTopicForBrief}
                    onExpandCoreTopic={(topic, mode) => onExpandCoreTopic(topic, mode, undefined, undefined)} // Default no override for direct click
                    expandingCoreTopicId={expandingCoreTopicId}
                    onExecuteMerge={() => {}} // Placeholder
                    canExpandTopics={canExpandTopics}
                    canGenerateBriefs={canGenerateBriefs}
                    onGenerateInitialMap={onGenerateInitialMap}
                    onUpdateTopic={onUpdateTopic}
                    onRepairFoundationPages={onGenerateMissingFoundationPages}
                    isRepairingFoundation={isLoadingFoundationPages}
                />
            </FeatureErrorBoundary>

            {/* Website Structure - Foundation Pages */}
            <div ref={websiteStructureRef}>
                <FoundationPagesPanel
                    foundationPages={foundationPages}
                    napData={napData}
                    isLoading={isLoadingFoundationPages}
                    onSaveNAPData={onSaveNAPData}
                    onUpdatePage={onUpdateFoundationPage}
                    onDeletePage={onDeleteFoundationPage}
                    onRestorePage={onRestoreFoundationPage}
                    onGenerateMissingPages={onGenerateMissingFoundationPages}
                    businessInfo={effectiveBusinessInfo}
                    pillars={topicalMap.pillars}
                    // Navigation props
                    navigation={navigation}
                    topics={allTopics}
                    onSaveNavigation={onSaveNavigation}
                    onGenerateNavigation={onRepairNavigation}
                    onRegenerateNavigation={onRepairNavigation ? async () => onRepairNavigation() : undefined}
                    isGeneratingNavigation={isRepairingNavigation}
                    // Brand Kit
                    onSaveBrandKit={onSaveBrandKit}
                />
            </div>

            <AddTopicModal
                isOpen={!!modals.addTopic}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'addTopic', visible: false } })}
                onAddTopic={onAddTopic}
                onBulkAddTopics={onBulkAddTopics}
                coreTopics={coreTopics}
                outerTopics={outerTopics}
                isLoading={!!isLoading.addTopic}
                mapId={topicalMap.id}
                onGenerateTopicsFromTemplate={handleTemplateGeneratedTopics}
                onOpenLocationManager={() => setShowLocationManager(true)}
            />
            <ContentBriefModal
                allTopics={allTopics}
                onGenerateDraft={onGenerateDraft}
            />
            <BriefReviewModal
                isOpen={!!modals.briefReview}
            />
            {topicForBrief && (
                 <ResponseCodeSelectionModal
                    isOpen={!!modals.responseCode}
                    onClose={() => {
                        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'responseCode', visible: false } });
                        setTopicForBrief(null);
                    }}
                    topic={topicForBrief}
                    onGenerate={handleGenerateBriefFromModal}
                    businessInfo={effectiveBusinessInfo}
                />
            )}

            <DraftingModal
                isOpen={!!modals.drafting}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'drafting', visible: false } })}
                brief={state.activeBriefTopic ? briefs[state.activeBriefTopic.id] : null}
                onAudit={onAuditDraft}
                onGenerateSchema={onGenerateSchema}
                isLoading={!!isLoading.audit || !!isLoading.schema || !!isLoading.flowAudit}
                businessInfo={effectiveBusinessInfo}
                onAnalyzeFlow={onAnalyzeFlow}
            />
            <ContentIntegrityModal
                isOpen={!!modals.integrity}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'integrity', visible: false } })}
                result={state.contentIntegrityResult}
                onAutoFix={onAutoFix}
            />
            <SchemaModal
                isOpen={!!modals.schema}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'schema', visible: false } })}
                result={state.schemaResult}
            />
            <TopicResourcesModal
                isOpen={!!modals.topicResources}
                topic={state.activeBriefTopic}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'topicResources', visible: false } })}
            />
            <KnowledgeDomainModal
                isOpen={!!modals.knowledgeDomain}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'knowledgeDomain', visible: false } })}
                knowledgeGraph={knowledgeGraph}
                recommendations={[]}
                onAddTopicIntelligently={onAddTopicFromRecommendation}
                isLoading={!!isLoading.knowledgeDomain}
                error={null}
                onExpandKnowledgeDomain={onExpandKnowledgeDomain}
                isExpandingKnowledgeDomain={!!isLoading.knowledgeDomain}
                onFindAndAddMissingKnowledgeTerms={onFindAndAddMissingKnowledgeTerms}
                isFindingMissingTerms={!!isLoading.knowledgeDomain}
                eavs={topicalMap.eavs as SemanticTriple[] | undefined}
                centralEntity={topicalMap.pillars?.centralEntity}
            />
            <InternalLinkingModal
                 isOpen={!!modals.internalLinking}
                 onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'internalLinking', visible: false } })}
                 coreTopics={coreTopics}
                 outerTopics={outerTopics}
                 briefs={briefs}
                 businessInfo={effectiveBusinessInfo}
                 knowledgeGraph={knowledgeGraph}
            />
            <GscExpansionHubModal
                isOpen={!!modals.gsc}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'gsc', visible: false } })}
                onAnalyze={onAnalyzeGsc}
                onAddTopic={onAddTopicFromGsc}
            />
            <ValidationResultModal
                isOpen={!!modals.validation}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'validation', visible: false } })}
                result={state.validationResult}
                onImproveMap={onImproveMap}
                isImprovingMap={!!isLoading.improveMap}
                onRepairFoundation={onRepairFoundation}
                isRepairingFoundation={isRepairingFoundation}
                onRepairNavigation={onRepairNavigation}
                isRepairingNavigation={isRepairingNavigation}
            />
            <ImprovementLogModal
                isOpen={!!modals.improvementLog}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'improvementLog', visible: false }})}
                log={state.improvementLog}
            />
            <MergeSuggestionsModal
                isOpen={!!modals.merge}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'merge', visible: false }})}
                suggestions={state.mergeSuggestions || []}
                onExecuteMerge={onExecuteMerge}
            />
            <SemanticAnalysisModal
                isOpen={!!modals.semantic}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'semantic', visible: false }})}
                result={state.semanticAnalysisResult}
            />
            <ContextualCoverageModal
                isOpen={!!modals.coverage}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'coverage', visible: false }})}
                result={state.contextualCoverageResult}
                onAddTopic={onAddTopicFromContextualGap}
            />
            <InternalLinkingAuditModal
                isOpen={!!modals.linkingAudit}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'linkingAudit', visible: false }})}
                result={state.internalLinkAuditResult}
            />
            <LinkingAuditModal
                isOpen={!!modals.multiPassLinkingAudit}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'multiPassLinkingAudit', visible: false }})}
                mapId={topicalMap.id}
            />
            <TopicalAuthorityModal
                isOpen={!!modals.authority}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'authority', visible: false }})}
                result={state.topicalAuthorityScore}
            />
            <PublicationPlanModal
                isOpen={!!modals.plan}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'plan', visible: false }})}
                plan={state.publicationPlan}
            />
            <PillarChangeConfirmationModal
                isOpen={!!modals.pillarConfirmation}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'pillarConfirmation', visible: false } })}
                onConfirm={onConfirmPillarChange}
            />
            <PillarEditModal
                isOpen={!!modals.pillarEdit}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'pillarEdit', visible: false } })}
                pillars={topicalMap.pillars}
                onSave={onSavePillars}
            />
            {topicalMap.eavs && (
                <EavManagerModal
                    isOpen={!!modals.eavManager}
                    onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'eavManager', visible: false } })}
                    eavs={topicalMap.eavs as any}
                    onSave={onUpdateEavs}
                />
            )}
            {topicalMap.competitors && (
                <CompetitorManagerModal
                    isOpen={!!modals.competitorManager}
                    onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'competitorManager', visible: false } })}
                    competitors={topicalMap.competitors}
                    onSave={onUpdateCompetitors}
                />
            )}
            <TopicExpansionModal
                isOpen={!!modals.topicExpansion}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'topicExpansion', visible: false } })}
                onExpand={onExpandWithContext}
            />
            {onSaveBusinessInfo && (
                <BusinessInfoModal
                    isOpen={isBusinessInfoModalOpen}
                    onClose={() => setIsBusinessInfoModalOpen(false)}
                    businessInfo={effectiveBusinessInfo}
                    onSave={onSaveBusinessInfo}
                />
            )}
            {/* Planning Dashboard Modal */}
            {modals.planningDashboard && (
                <div className="fixed inset-0 z-50 bg-gray-900">
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                            <h2 className="text-xl font-semibold text-white">Publication Planning</h2>
                            <button
                                onClick={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'planningDashboard', visible: false } })}
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <PlanningDashboard topics={allTopics} />
                        </div>
                    </div>
                </div>
            )}
            {/* Performance Import Modal */}
            <PerformanceImportModal
                isOpen={!!modals.performanceImport}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'performanceImport', visible: false } })}
                topics={allTopics}
                mapId={topicalMap.id}
                userId={state.user?.id || ''}
                supabaseUrl={effectiveBusinessInfo.supabaseUrl || ''}
                supabaseKey={effectiveBusinessInfo.supabaseAnonKey || ''}
            />
            {/* Query Network Audit Modal */}
            {modals.queryNetworkAudit && (
                <div className="fixed inset-0 z-50">
                    <QueryNetworkAudit
                        initialKeyword={topicalMap.pillars?.centralEntity || ''}
                        mapId={topicalMap.id}
                        onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'queryNetworkAudit', visible: false } })}
                    />
                </div>
            )}

            {modals.mentionScanner && (
                <MentionScannerDashboard
                    businessInfo={effectiveBusinessInfo}
                    initialEntityName={topicalMap.pillars?.centralEntity || effectiveBusinessInfo.projectName || ''}
                    mapId={topicalMap.id}
                    onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'mentionScanner', visible: false } })}
                />
            )}

            {modals.corpusAudit && (
                <CorpusAuditReport
                    businessInfo={effectiveBusinessInfo}
                    targetEAVs={topicalMap.eavs as any[] || []}
                    mapId={topicalMap.id}
                    onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'corpusAudit', visible: false } })}
                />
            )}

            {/* Enhanced Metrics Dashboard Modal */}
            {modals.enhancedMetrics && (
                <div className="fixed inset-0 z-50 bg-gray-900/95 overflow-auto">
                    <div className="min-h-full p-6">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-white">Enhanced Audit Metrics</h2>
                                <button
                                    onClick={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'enhancedMetrics', visible: false } })}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <EnhancedMetricsDashboard
                                eavs={topicalMap.eavs as SemanticTriple[] || []}
                                topicCount={allTopics.length}
                                issues={unifiedAudit?.result?.categories?.flatMap(c => c.issues) || []}
                                projectName={projectName}
                                mapName={topicalMap.name}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* SEO Insights Hub Modal */}
            {modals.comprehensiveAudit && (
                <div className="fixed inset-0 z-50 bg-gray-900/95 overflow-auto">
                    <div className="min-h-full p-6">
                        <div className="max-w-7xl mx-auto">
                            <FeatureErrorBoundary featureName="SEO Insights Hub">
                                <InsightsHub
                                    mapId={topicalMap.id}
                                    projectName={projectName}
                                    mapName={topicalMap.name}
                                    onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'comprehensiveAudit', visible: false } })}
                                    onOpenQueryNetworkAudit={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'queryNetworkAudit', visible: true } })}
                                    onOpenEATScanner={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'eatScanner', visible: true } })}
                                    onOpenCorpusAudit={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'corpusAudit', visible: true } })}
                                />
                            </FeatureErrorBoundary>
                        </div>
                    </div>
                </div>
            )}

            {/* Map Audit Dashboard Modal - Gap Analysis & Semantic Distance */}
            {modals.mapAuditDashboard && (
                <div className="fixed inset-0 z-50 bg-gray-900/95 overflow-auto">
                    <div className="min-h-full p-6">
                        <div className="max-w-7xl mx-auto">
                            <FeatureErrorBoundary featureName="Map Audit Dashboard">
                                <ComprehensiveAuditDashboard
                                    mapId={topicalMap.id}
                                    projectName={projectName}
                                    mapName={topicalMap.name}
                                    topicCount={allTopics.length}
                                    eavs={topicalMap.eavs as SemanticTriple[] || []}
                                    issues={unifiedAudit?.result?.categories?.flatMap(c => c.issues) || []}
                                    onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'mapAuditDashboard', visible: false } })}
                                />
                            </FeatureErrorBoundary>
                        </div>
                    </div>
                </div>
            )}

            {/* Location Manager Modal - for managing locations used in templates */}
            <LocationManagerModal
                isOpen={showLocationManager}
                onClose={() => setShowLocationManager(false)}
            />

            {/* KP Strategy Page */}
            <KPStrategyPage
                isOpen={showKPStrategy}
                onClose={() => setShowKPStrategy(false)}
                businessInfo={effectiveBusinessInfo}
                entityIdentity={effectiveBusinessInfo.entityIdentity}
                eavs={topicalMap.eavs as SemanticTriple[] || []}
            />

            {/* Entity Authority Page */}
            <EntityAuthorityPage
                isOpen={showEntityAuthority}
                onClose={() => setShowEntityAuthority(false)}
                businessInfo={effectiveBusinessInfo}
                entityIdentity={effectiveBusinessInfo.entityIdentity}
                eavs={topicalMap.eavs as SemanticTriple[] || []}
                onOpenKPStrategy={() => {
                    setShowEntityAuthority(false);
                    setShowKPStrategy(true);
                }}
            />
        </div>
    );
};

export default ProjectDashboard;
