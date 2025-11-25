
// components/ProjectDashboard.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useAppState } from '../state/appState';
import { TopicalMap, EnrichedTopic, ContentBrief, BusinessInfo, SEOPillars, TopicRecommendation, GscRow, ValidationIssue, MergeSuggestion, ResponseCode, SemanticTriple, ExpansionMode, AuditRuleResult, ContextualFlowIssue } from '../types';
import { KnowledgeGraph as KnowledgeGraphClass } from '../lib/knowledgeGraph';
import { calculateDashboardMetrics } from '../utils/helpers';

// Import child components
import TopicalMapDisplay from './TopicalMapDisplay';
import StrategicDashboard from './ui/StrategicDashboard';
import WorkbenchPanel from './dashboard/WorkbenchPanel';
import AnalysisToolsPanel from './dashboard/AnalysisToolsPanel';
import StrategicContextPanel from './dashboard/StrategicContextPanel';

// Modals
import AddTopicModal from './AddTopicModal';
import ContentBriefModal from './ContentBriefModal';
import KnowledgeDomainModal from './KnowledgeDomainModal';
import GscExpansionHubModal from './GscExpansionHubModal';
import ValidationResultModal from './ValidationResultModal';
import MergeSuggestionsModal from './MergeSuggestionsModal';
import SemanticAnalysisModal from './SemanticAnalysisModal';
import ContextualCoverageModal from './ContextualCoverageModal';
import { InternalLinkingAuditModal } from './InternalLinkingAuditModal';
import TopicalAuthorityModal from './TopicalAuthorityModal';
import PublicationPlanModal from './PublicationPlanModal';
import ImprovementLogModal from './ImprovementLogModal';
import DraftingModal from './DraftingModal';
import SchemaModal from './SchemaModal';
import ContentIntegrityModal from './ContentIntegrityModal';
import ResponseCodeSelectionModal from './ResponseCodeSelectionModal';
import BriefReviewModal from './BriefReviewModal';
import { InternalLinkingModal } from './InternalLinkingModal';
import PillarChangeConfirmationModal from './PillarChangeConfirmationModal';
import EavManagerModal from './EavManagerModal';
import CompetitorManagerModal from './CompetitorManagerModal';
import TopicExpansionModal from './TopicExpansionModal';

import { Button } from './ui/Button';

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
    onAnalyzeFlow
}) => {
    const { state, dispatch } = useAppState();
    const { modals, isLoading, briefGenerationStatus } = state;
    const [topicForBrief, setTopicForBrief] = useState<EnrichedTopic | null>(null);

    const coreTopics = useMemo(() => allTopics.filter(t => t.type === 'core'), [allTopics]);
    const outerTopics = useMemo(() => allTopics.filter(t => t.type === 'outer'), [allTopics]);
    const briefs = useMemo(() => topicalMap.briefs || {}, [topicalMap.briefs]);

    const metrics = useMemo(() => calculateDashboardMetrics({
        briefs,
        knowledgeGraph,
        allTopics
    }), [briefs, knowledgeGraph, allTopics]);
    
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

    const handleGenerateBriefFromModal = (topic: EnrichedTopic, responseCode: ResponseCode, overrideSettings?: { provider: string, model: string }) => {
        onGenerateBrief(topic, responseCode, overrideSettings);
    };

    return (
        <div className="space-y-8 max-w-7xl w-full">
            <header className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-white">{projectName}</h1>
                <p className="text-lg text-gray-400 mt-1">Topical Map: {topicalMap.name}</p>
              </div>
              <Button onClick={onBackToProjects} variant="secondary">Back to Projects</Button>
            </header>

            <StrategicDashboard metrics={metrics} />
            
            {topicalMap.pillars && (
                <StrategicContextPanel
                    pillars={topicalMap.pillars}
                    eavsCount={(topicalMap.eavs || []).length}
                    competitorsCount={(topicalMap.competitors || []).length}
                    onEditPillars={onSavePillars}
                    onManageEavs={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'eavManager', visible: true } })}
                    onManageCompetitors={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'competitorManager', visible: true } })}
                    onRegenerateMap={onRegenerateMap}
                    isRegenerating={!!isLoading.map}
                    onEnrichData={onEnrichData}
                    isEnriching={isEnriching}
                    topics={allTopics}
                    onGenerateBlueprints={onGenerateBlueprints}
                    isGeneratingBlueprints={isGeneratingBlueprints}
                />
            )}

            <WorkbenchPanel 
                isLoading={isLoading}
                canGenerateBriefs={canGenerateBriefs}
                briefGenerationStatus={briefGenerationStatus}
                onAnalyzeKnowledgeDomain={onAnalyzeKnowledgeDomain}
                onAddTopicManually={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'addTopic', visible: true } })}
                onViewInternalLinking={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'internalLinking', visible: true } })}
                onUploadGsc={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'gsc', visible: true } })}
                onGenerateAllBriefs={onGenerateAllBriefs}
                onExportData={onExportData}
            />

            <AnalysisToolsPanel 
                isLoading={isLoading}
                onValidateMap={onValidateMap}
                onFindMergeOpportunities={onFindMergeOpportunities}
                onAnalyzeSemanticRelationships={onAnalyzeSemanticRelationships}
                onAnalyzeContextualCoverage={onAnalyzeContextualCoverage}
                onAuditInternalLinking={onAuditInternalLinking}
                onCalculateTopicalAuthority={onCalculateTopicalAuthority}
                onGeneratePublicationPlan={onGeneratePublicationPlan}
            />

            <TopicalMapDisplay
                coreTopics={coreTopics}
                outerTopics={outerTopics}
                briefs={briefs}
                onSelectTopicForBrief={handleSelectTopicForBrief}
                onExpandCoreTopic={(topic, mode) => onExpandCoreTopic(topic, mode, undefined, undefined)} // Default no override for direct click
                expandingCoreTopicId={expandingCoreTopicId}
                onExecuteMerge={() => {}} // Placeholder
                canExpandTopics={canExpandTopics}
                canGenerateBriefs={canGenerateBriefs}
                onGenerateInitialMap={onGenerateInitialMap}
                onUpdateTopic={onUpdateTopic}
            />
            
            <AddTopicModal
                isOpen={!!modals.addTopic}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'addTopic', visible: false } })}
                onAddTopic={onAddTopic}
                onBulkAddTopics={onBulkAddTopics}
                coreTopics={coreTopics}
                isLoading={!!isLoading.addTopic}
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
        </div>
    );
};

export default ProjectDashboard;
