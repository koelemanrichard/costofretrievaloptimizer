
// state/appState.ts
//
// State management split into domain slices. See state/slices/ for extracted reducers:
// uiSlice, siteAnalysisSlice, auditSlice, publicationPlanningSlice, organizationSlice,
// topicOperationsSlice, contentGenerationSlice
//
import React, { createContext, useContext, Dispatch } from 'react';
import { User } from '@supabase/supabase-js';

// Import slices
import {
  type UIState,
  type UIAction,
  initialUIState,
  uiReducer,
} from './slices/uiSlice';

import {
  type SiteAnalysisState,
  type SiteAnalysisAction,
  initialSiteAnalysisState,
  siteAnalysisReducer,
} from './slices/siteAnalysisSlice';

import {
  type AuditState,
  type AuditAction,
  initialAuditState,
  auditReducer,
} from './slices/auditSlice';

import {
  type PublicationPlanningState,
  type PublicationPlanningAction,
  initialPublicationPlanningState,
  publicationPlanningReducer,
} from './slices/publicationPlanningSlice';

import {
  topicOperationsReducer,
  isTopicOperationsAction,
} from './slices/topicOperationsSlice';

import {
  contentGenerationReducer,
  isContentGenerationAction,
} from './slices/contentGenerationSlice';

import {
    AppStep,
    BusinessInfo,
    Project,
    TopicalMap,
    EnrichedTopic,
    ContentBrief,
    BriefSection,
    KnowledgeGraph as KnowledgeGraphType,
    GenerationLogEntry,
    ValidationResult,
    MapImprovementSuggestion,
    MergeSuggestion,
    SemanticAnalysisResult,
    ContextualCoverageMetrics,
    InternalLinkAuditResult,
    TopicalAuthorityScore,
    PublicationPlan,
    ContentIntegrityResult,
    SchemaGenerationResult,
    EnhancedSchemaResult,
    GscOpportunity,
    SEOPillars,
    SemanticTriple,
    ExpansionMode,
    FlowAuditResult,
    SiteAnalysisProject,
    DiscoveredPillars,
    FoundationPage,
    NavigationStructure,
    NavigationSyncStatus,
    FoundationNotification,
    NAPData,
    LinkingAuditResult,
    LinkingAutoFix,
    LinkingFixHistoryEntry,
    UnifiedAuditResult,
    AuditFixHistoryEntry,
    // Publication Planning types
    PublicationStatus,
    PublicationPhase,
    PublicationPriority,
    TopicPublicationPlan,
    PerformanceSnapshot,
    PlanningFilters,
    PublicationPlanResult,
} from '../types';

// Union type for schema results - supports both legacy and enhanced schema
export type SchemaResult = SchemaGenerationResult | EnhancedSchemaResult;
import { AuditProgress } from '../services/ai/unifiedAudit';
import { KnowledgeGraph } from '../lib/knowledgeGraph';
import { defaultBusinessInfo } from '../config/defaults';

export interface AppState {
    user: User | null;
    appStep: AppStep;
    viewMode: 'CREATION' | 'MIGRATION'; // NEW: Toggle between creation and migration workflows
    isLoading: { [key: string]: boolean | undefined; };
    error: string | null;
    notification: string | null;

    // UX State
    isStrategistOpen: boolean;

    businessInfo: BusinessInfo;
    projects: Project[];
    activeProjectId: string | null;
    topicalMaps: TopicalMap[];
    activeMapId: string | null;
    
    knowledgeGraph: KnowledgeGraph | null;
    generationLog: GenerationLogEntry[];
    
    activeBriefTopic: EnrichedTopic | null;
    briefGenerationResult: ContentBrief | null;
    briefGenerationStatus: string | null;
    briefGenerationCancelled: boolean;
    briefGenerationTotal: number;
    briefGenerationCurrent: number;

    // New Expansion State
    activeExpansionTopic: EnrichedTopic | null;
    activeExpansionMode: ExpansionMode | null;

    modals: Record<string, boolean>;
    confirmation: { title: string; message: React.ReactNode; onConfirm: () => void } | null;

    // Analysis results
    gscOpportunities: GscOpportunity[] | null;
    validationResult: ValidationResult | null;
    improvementLog: MapImprovementSuggestion | null;
    mergeSuggestions: MergeSuggestion[] | null;
    semanticAnalysisResult: SemanticAnalysisResult | null;
    contextualCoverageResult: ContextualCoverageMetrics | null;
    internalLinkAuditResult: InternalLinkAuditResult | null;
    topicalAuthorityScore: TopicalAuthorityScore | null;
    publicationPlan: PublicationPlan | null;
    contentIntegrityResult: ContentIntegrityResult | null;
    schemaResult: SchemaResult | null;
    flowAuditResult: FlowAuditResult | null;

    // Content generation job refresh trigger (incremented to notify useContentGeneration to re-check job state)
    jobRefreshTrigger: number;

    // Site Analysis V2 state (persisted across tab navigation)
    siteAnalysis: {
        viewMode: 'project_list' | 'setup' | 'extracting' | 'pillars' | 'analyzing' | 'results' | 'page_detail';
        currentProject: SiteAnalysisProject | null;
        selectedPageId: string | null;
        discoveredPillars: DiscoveredPillars | null;
    };

    // Foundation Pages & Navigation state
    websiteStructure: {
        foundationPages: FoundationPage[];
        navigation: NavigationStructure | null;
        navigationSyncStatus: NavigationSyncStatus | null;
        napData?: NAPData;
        notifications: FoundationNotification[];
        isGenerating: boolean;
    };

    // Linking Audit state (Phase 5)
    linkingAudit: {
        result: LinkingAuditResult | null;
        isRunning: boolean;
        pendingFixes: LinkingAutoFix[];
        fixHistory: LinkingFixHistoryEntry[];
        lastAuditId: string | null;
    };

    // Unified Audit state (Phase 6)
    unifiedAudit: {
        result: UnifiedAuditResult | null;
        isRunning: boolean;
        progress: AuditProgress | null;
        fixHistory: AuditFixHistoryEntry[];
        lastAuditId: string | null;
    };

    // Publication Planning state - delegated to publicationPlanningSlice
    publicationPlanning: PublicationPlanningState;
}

export type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_STEP'; payload: AppStep }
  | { type: 'SET_VIEW_MODE'; payload: 'CREATION' | 'MIGRATION' } // NEW: Toggle workflows
  | { type: 'TOGGLE_STRATEGIST'; payload?: boolean } // NEW: Toggle strategist panel
  | { type: 'SET_LOADING'; payload: { key: string; value: boolean } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_NOTIFICATION'; payload: string | null }
  | { type: 'SET_BUSINESS_INFO'; payload: BusinessInfo }
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: { projectId: string } }
  | { type: 'SET_ACTIVE_PROJECT'; payload: string | null }
  | { type: 'SET_TOPICAL_MAPS'; payload: TopicalMap[] }
  | { type: 'ADD_TOPICAL_MAP'; payload: TopicalMap }
  | { type: 'DELETE_TOPICAL_MAP', payload: { mapId: string } }
  | { type: 'SET_ACTIVE_MAP'; payload: string | null }
  | { type: 'UPDATE_MAP_DATA'; payload: { mapId: string; data: Partial<TopicalMap> } }
  | { type: 'SET_PILLARS'; payload: { mapId: string, pillars: SEOPillars } }
  | { type: 'SET_EAVS'; payload: { mapId: string, eavs: SemanticTriple[] } }
  | { type: 'ADD_EAVS'; payload: { mapId: string, eavs: SemanticTriple[] } }
  | { type: 'SET_COMPETITORS'; payload: { mapId: string, competitors: string[] } }
  | { type: 'SET_TOPICS_FOR_MAP'; payload: { mapId: string; topics: EnrichedTopic[] } }
  | { type: 'ADD_TOPIC'; payload: { mapId: string; topic: EnrichedTopic } }
  | { type: 'ADD_TOPICS'; payload: { mapId: string; topics: EnrichedTopic[] } }
  | { type: 'UPDATE_TOPIC'; payload: { mapId: string; topicId: string; updates: Partial<EnrichedTopic> } }
  | { type: 'DELETE_TOPIC'; payload: { mapId: string; topicId: string } }
  | { type: 'SET_BRIEFS_FOR_MAP'; payload: { mapId: string; briefs: Record<string, ContentBrief> } }
  | { type: 'ADD_BRIEF'; payload: { mapId: string; topicId: string; brief: ContentBrief } }
  | { type: 'UPDATE_BRIEF'; payload: { mapId: string; topicId: string; updates: Partial<ContentBrief> } }
  | { type: 'UPDATE_BRIEF_LINKS'; payload: { mapId: string, sourceTopicId: string, linkToAdd: any } }
  | { type: 'SET_KNOWLEDGE_GRAPH'; payload: KnowledgeGraph | null }
  | { type: 'LOG_EVENT'; payload: GenerationLogEntry }
  | { type: 'CLEAR_LOG' }
  | { type: 'SET_ACTIVE_BRIEF_TOPIC'; payload: EnrichedTopic | null }
  | { type: 'SET_BRIEF_GENERATION_RESULT'; payload: ContentBrief | null }
  | { type: 'SET_BRIEF_GENERATION_STATUS'; payload: string | null }
  | { type: 'SET_BRIEF_GENERATION_PROGRESS'; payload: { current: number; total: number; status: string } }
  | { type: 'CANCEL_BRIEF_GENERATION' }
  | { type: 'RESET_BRIEF_GENERATION' }
  | { type: 'SET_ACTIVE_EXPANSION_TOPIC'; payload: EnrichedTopic | null }
  | { type: 'SET_ACTIVE_EXPANSION_MODE'; payload: ExpansionMode | null }
  | { type: 'SET_MODAL_VISIBILITY'; payload: { modal: string; visible: boolean } }
  | { type: 'SHOW_CONFIRMATION'; payload: { title: string; message: React.ReactNode; onConfirm: () => void } }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'SET_GSC_OPPORTUNITIES'; payload: GscOpportunity[] | null }
  | { type: 'SET_VALIDATION_RESULT'; payload: ValidationResult | null }
  | { type: 'SET_IMPROVEMENT_LOG'; payload: MapImprovementSuggestion | null }
  | { type: 'SET_MERGE_SUGGESTIONS'; payload: MergeSuggestion[] | null }
  | { type: 'SET_SEMANTIC_ANALYSIS_RESULT'; payload: SemanticAnalysisResult | null }
  | { type: 'SET_CONTEXTUAL_COVERAGE_RESULT'; payload: ContextualCoverageMetrics | null }
  | { type: 'SET_INTERNAL_LINK_AUDIT_RESULT'; payload: InternalLinkAuditResult | null }
  | { type: 'SET_TOPICAL_AUTHORITY_SCORE'; payload: TopicalAuthorityScore | null }
  | { type: 'SET_PUBLICATION_PLAN'; payload: PublicationPlan | null }
  | { type: 'SET_CONTENT_INTEGRITY_RESULT'; payload: ContentIntegrityResult | null }
  | { type: 'SET_SCHEMA_RESULT'; payload: SchemaResult | null }
  | { type: 'SET_FLOW_AUDIT_RESULT'; payload: FlowAuditResult | null }
  // Site Analysis V2 actions
  | { type: 'SET_SITE_ANALYSIS_VIEW_MODE'; payload: AppState['siteAnalysis']['viewMode'] }
  | { type: 'SET_SITE_ANALYSIS_PROJECT'; payload: SiteAnalysisProject | null }
  | { type: 'SET_SITE_ANALYSIS_SELECTED_PAGE'; payload: string | null }
  | { type: 'SET_SITE_ANALYSIS_PILLARS'; payload: DiscoveredPillars | null }
  | { type: 'RESET_SITE_ANALYSIS' }
  // Foundation Pages & Navigation actions
  | { type: 'SET_FOUNDATION_PAGES'; payload: FoundationPage[] }
  | { type: 'ADD_FOUNDATION_PAGE'; payload: FoundationPage }
  | { type: 'UPDATE_FOUNDATION_PAGE'; payload: { pageId: string; updates: Partial<FoundationPage> } }
  | { type: 'DELETE_FOUNDATION_PAGE'; payload: { pageId: string } }
  | { type: 'SET_NAVIGATION'; payload: NavigationStructure | null }
  | { type: 'UPDATE_NAVIGATION'; payload: Partial<NavigationStructure> }
  | { type: 'SET_NAV_SYNC_STATUS'; payload: NavigationSyncStatus | null }
  | { type: 'SET_NAP_DATA'; payload: NAPData }
  | { type: 'ADD_FOUNDATION_NOTIFICATION'; payload: FoundationNotification }
  | { type: 'DISMISS_FOUNDATION_NOTIFICATION'; payload: { notificationId: string } }
  | { type: 'SET_WEBSITE_STRUCTURE_GENERATING'; payload: boolean }
  | { type: 'RESET_WEBSITE_STRUCTURE' }
  // Linking Audit actions (Phase 5)
  | { type: 'SET_LINKING_AUDIT_RESULT'; payload: LinkingAuditResult | null }
  | { type: 'SET_LINKING_AUDIT_RUNNING'; payload: boolean }
  | { type: 'SET_LINKING_PENDING_FIXES'; payload: LinkingAutoFix[] }
  | { type: 'ADD_LINKING_FIX_HISTORY'; payload: LinkingFixHistoryEntry }
  | { type: 'CLEAR_LINKING_FIX_HISTORY' }
  | { type: 'SET_LINKING_LAST_AUDIT_ID'; payload: string | null }
  | { type: 'RESET_LINKING_AUDIT' }
  // Unified Audit actions (Phase 6)
  | { type: 'SET_UNIFIED_AUDIT_RESULT'; payload: UnifiedAuditResult | null }
  | { type: 'SET_UNIFIED_AUDIT_RUNNING'; payload: boolean }
  | { type: 'SET_UNIFIED_AUDIT_PROGRESS'; payload: AuditProgress | null }
  | { type: 'SET_UNIFIED_AUDIT_HISTORY'; payload: AuditFixHistoryEntry[] }
  | { type: 'ADD_UNIFIED_AUDIT_HISTORY'; payload: AuditFixHistoryEntry }
  | { type: 'SET_UNIFIED_AUDIT_ID'; payload: string | null }
  | { type: 'RESET_UNIFIED_AUDIT' }
  // Brief Editing actions
  | { type: 'UPDATE_BRIEF_SECTION'; payload: { mapId: string; topicId: string; sectionIndex: number; section: BriefSection } }
  | { type: 'DELETE_BRIEF_SECTION'; payload: { mapId: string; topicId: string; sectionIndex: number } }
  | { type: 'ADD_BRIEF_SECTION'; payload: { mapId: string; topicId: string; sectionIndex: number; section: BriefSection } }
  | { type: 'REORDER_BRIEF_SECTIONS'; payload: { mapId: string; topicId: string; sections: BriefSection[] } }
  | { type: 'REPLACE_BRIEF'; payload: { mapId: string; topicId: string; brief: ContentBrief } }
  // Content generation job refresh trigger
  | { type: 'TRIGGER_JOB_REFRESH' }
  // Publication Planning actions
  | { type: 'SET_PLANNING_VIEW_MODE'; payload: 'calendar' | 'list' }
  | { type: 'SET_PLANNING_CALENDAR_MODE'; payload: 'month' | 'week' }
  | { type: 'SET_PLANNING_CURRENT_DATE'; payload: string }
  | { type: 'SET_PLANNING_FILTERS'; payload: PlanningFilters }
  | { type: 'SET_PLANNING_SELECTED_TOPICS'; payload: string[] }
  | { type: 'TOGGLE_PLANNING_TOPIC_SELECTION'; payload: string }
  | { type: 'CLEAR_PLANNING_SELECTION' }
  | { type: 'SET_PERFORMANCE_SNAPSHOTS'; payload: { mapId: string; snapshots: PerformanceSnapshot[] } }
  | { type: 'ADD_PERFORMANCE_SNAPSHOT'; payload: { mapId: string; snapshot: PerformanceSnapshot } }
  | { type: 'SET_TOPIC_BASELINE'; payload: { topicId: string; snapshot: PerformanceSnapshot } }
  | { type: 'SET_PUBLICATION_PLAN_RESULT'; payload: PublicationPlanResult | null }
  | { type: 'SET_GENERATING_PLAN'; payload: boolean }
  | { type: 'SET_BATCH_LAUNCH_DATE'; payload: string | null }
  | { type: 'UPDATE_TOPIC_PUBLICATION_STATUS'; payload: { mapId: string; topicId: string; status: PublicationStatus } }
  | { type: 'UPDATE_TOPIC_PUBLICATION_PHASE'; payload: { mapId: string; topicId: string; phase: PublicationPhase } }
  | { type: 'SET_TOPIC_PUBLICATION_DATE'; payload: { mapId: string; topicId: string; dateType: 'optimal' | 'scheduled' | 'actual'; date: string | null } }
  | { type: 'BULK_UPDATE_PUBLICATION_PHASE'; payload: { mapId: string; topicIds: string[]; phase: PublicationPhase } }
  | { type: 'APPLY_PUBLICATION_PLAN'; payload: { mapId: string; planResult: PublicationPlanResult } }
  | { type: 'RESET_PUBLICATION_PLANNING' };

export const initialState: AppState = {
    user: null,
    appStep: AppStep.AUTH,
    viewMode: 'CREATION',
    isLoading: {},
    error: null,
    notification: null,
    isStrategistOpen: false,
    businessInfo: defaultBusinessInfo,
    projects: [],
    activeProjectId: null,
    topicalMaps: [],
    activeMapId: null,
    knowledgeGraph: null,
    generationLog: [],
    activeBriefTopic: null,
    briefGenerationResult: null,
    briefGenerationStatus: null,
    briefGenerationCancelled: false,
    briefGenerationTotal: 0,
    briefGenerationCurrent: 0,
    activeExpansionTopic: null,
    activeExpansionMode: null,
    modals: {},
    confirmation: null,
    gscOpportunities: null,
    validationResult: null,
    improvementLog: null,
    mergeSuggestions: null,
    semanticAnalysisResult: null,
    contextualCoverageResult: null,
    internalLinkAuditResult: null,
    topicalAuthorityScore: null,
    publicationPlan: null,
    contentIntegrityResult: null,
    schemaResult: null,
    flowAuditResult: null,
    jobRefreshTrigger: 0,
    siteAnalysis: {
        viewMode: 'project_list',
        currentProject: null,
        selectedPageId: null,
        discoveredPillars: null,
    },
    websiteStructure: {
        foundationPages: [],
        navigation: null,
        navigationSyncStatus: null,
        notifications: [],
        isGenerating: false,
    },
    linkingAudit: {
        result: null,
        isRunning: false,
        pendingFixes: [],
        fixHistory: [],
        lastAuditId: null,
    },
    unifiedAudit: {
        result: null,
        isRunning: false,
        progress: null,
        fixHistory: [],
        lastAuditId: null,
    },
    publicationPlanning: initialPublicationPlanningState,
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        case 'SET_USER': return { ...state, user: action.payload };
        case 'SET_STEP': return { ...state, appStep: action.payload };
        case 'SET_VIEW_MODE': return { ...state, viewMode: action.payload }; // Handle viewMode toggle
        case 'TOGGLE_STRATEGIST': return { ...state, isStrategistOpen: action.payload !== undefined ? action.payload : !state.isStrategistOpen };
        case 'SET_LOADING': return { ...state, isLoading: { ...state.isLoading, [action.payload.key]: action.payload.value } };
        case 'SET_ERROR': return { ...state, error: action.payload };
        case 'SET_NOTIFICATION': return { ...state, notification: action.payload };
        case 'SET_BUSINESS_INFO': return { ...state, businessInfo: action.payload };
        case 'SET_PROJECTS': return { ...state, projects: action.payload };
        case 'ADD_PROJECT': return { ...state, projects: [...state.projects, action.payload] };
        case 'DELETE_PROJECT': return { ...state, projects: state.projects.filter(p => p.id !== action.payload.projectId) };
        case 'SET_ACTIVE_PROJECT': return { ...state, activeProjectId: action.payload, activeMapId: null, topicalMaps: [] };
        case 'SET_TOPICAL_MAPS': return { ...state, topicalMaps: action.payload };
        case 'ADD_TOPICAL_MAP': return { ...state, topicalMaps: [...state.topicalMaps, action.payload] };
        case 'DELETE_TOPICAL_MAP': return { ...state, topicalMaps: state.topicalMaps.filter(m => m.id !== action.payload.mapId) };
        case 'SET_ACTIVE_MAP': return { ...state, activeMapId: action.payload };
        case 'UPDATE_MAP_DATA':
        case 'SET_PILLARS':
        case 'SET_EAVS':
        case 'ADD_EAVS':
        case 'SET_COMPETITORS':
        case 'SET_TOPICS_FOR_MAP':
        case 'SET_BRIEFS_FOR_MAP':
        case 'ADD_TOPIC':
        case 'ADD_TOPICS':
        case 'UPDATE_TOPIC':
        case 'DELETE_TOPIC':
        case 'ADD_BRIEF':
        case 'UPDATE_BRIEF':
        case 'UPDATE_BRIEF_LINKS':
        case 'UPDATE_BRIEF_SECTION':
        case 'DELETE_BRIEF_SECTION':
        case 'ADD_BRIEF_SECTION':
        case 'REORDER_BRIEF_SECTIONS':
        case 'REPLACE_BRIEF': {
            const newTopicalMaps = state.topicalMaps.map(map => {
                const matches = 'mapId' in action.payload && map.id === action.payload.mapId;
                return matches ? mapReducer(map, action) : map;
            });
            return {
                ...state,
                topicalMaps: newTopicalMaps
            };
        }
        case 'SET_KNOWLEDGE_GRAPH': return { ...state, knowledgeGraph: action.payload };
        case 'LOG_EVENT': return { ...state, generationLog: [action.payload, ...state.generationLog].slice(0, 100) };
        case 'CLEAR_LOG': return { ...state, generationLog: [] };
        case 'SET_ACTIVE_BRIEF_TOPIC': return { ...state, activeBriefTopic: action.payload };
        case 'SET_BRIEF_GENERATION_RESULT': return { ...state, briefGenerationResult: action.payload };
        case 'SET_BRIEF_GENERATION_STATUS': return { ...state, briefGenerationStatus: action.payload };
        case 'SET_BRIEF_GENERATION_PROGRESS': return {
            ...state,
            briefGenerationCurrent: action.payload.current,
            briefGenerationTotal: action.payload.total,
            briefGenerationStatus: action.payload.status
        };
        case 'CANCEL_BRIEF_GENERATION': return { ...state, briefGenerationCancelled: true };
        case 'RESET_BRIEF_GENERATION': return {
            ...state,
            briefGenerationCancelled: false,
            briefGenerationTotal: 0,
            briefGenerationCurrent: 0,
            briefGenerationStatus: null
        };
        case 'SET_ACTIVE_EXPANSION_TOPIC': return { ...state, activeExpansionTopic: action.payload };
        case 'SET_ACTIVE_EXPANSION_MODE': return { ...state, activeExpansionMode: action.payload };
        case 'SET_MODAL_VISIBILITY': return { ...state, modals: { ...state.modals, [action.payload.modal]: action.payload.visible } };
        case 'SHOW_CONFIRMATION': return { ...state, confirmation: action.payload };
        case 'HIDE_CONFIRMATION': return { ...state, confirmation: null };

        // Analysis results
        case 'SET_GSC_OPPORTUNITIES': return { ...state, gscOpportunities: action.payload };
        case 'SET_VALIDATION_RESULT': return { ...state, validationResult: action.payload };
        case 'SET_IMPROVEMENT_LOG': return { ...state, improvementLog: action.payload };
        case 'SET_MERGE_SUGGESTIONS': return { ...state, mergeSuggestions: action.payload };
        case 'SET_SEMANTIC_ANALYSIS_RESULT': return { ...state, semanticAnalysisResult: action.payload };
        case 'SET_CONTEXTUAL_COVERAGE_RESULT': return { ...state, contextualCoverageResult: action.payload };
        case 'SET_INTERNAL_LINK_AUDIT_RESULT': return { ...state, internalLinkAuditResult: action.payload };
        case 'SET_TOPICAL_AUTHORITY_SCORE': return { ...state, topicalAuthorityScore: action.payload };
        case 'SET_PUBLICATION_PLAN': return { ...state, publicationPlan: action.payload };
        case 'SET_CONTENT_INTEGRITY_RESULT': return { ...state, contentIntegrityResult: action.payload };
        case 'SET_SCHEMA_RESULT': return { ...state, schemaResult: action.payload };
        case 'SET_FLOW_AUDIT_RESULT': return { ...state, flowAuditResult: action.payload };

        // Content generation job refresh trigger
        case 'TRIGGER_JOB_REFRESH': return { ...state, jobRefreshTrigger: state.jobRefreshTrigger + 1 };

        // Site Analysis V2 reducers - delegated to siteAnalysisSlice
        case 'SET_SITE_ANALYSIS_VIEW_MODE':
        case 'SET_SITE_ANALYSIS_PROJECT':
        case 'SET_SITE_ANALYSIS_SELECTED_PAGE':
        case 'SET_SITE_ANALYSIS_PILLARS':
        case 'RESET_SITE_ANALYSIS':
            return {
                ...state,
                siteAnalysis: siteAnalysisReducer(state.siteAnalysis, action as SiteAnalysisAction)
            };

        // Foundation Pages & Navigation reducers
        case 'SET_FOUNDATION_PAGES':
            return {
                ...state,
                websiteStructure: { ...state.websiteStructure, foundationPages: action.payload }
            };
        case 'ADD_FOUNDATION_PAGE':
            return {
                ...state,
                websiteStructure: {
                    ...state.websiteStructure,
                    foundationPages: [...state.websiteStructure.foundationPages, action.payload]
                }
            };
        case 'UPDATE_FOUNDATION_PAGE':
            return {
                ...state,
                websiteStructure: {
                    ...state.websiteStructure,
                    foundationPages: state.websiteStructure.foundationPages.map(page =>
                        page.id === action.payload.pageId
                            ? { ...page, ...action.payload.updates }
                            : page
                    )
                }
            };
        case 'DELETE_FOUNDATION_PAGE':
            return {
                ...state,
                websiteStructure: {
                    ...state.websiteStructure,
                    foundationPages: state.websiteStructure.foundationPages.map(page =>
                        page.id === action.payload.pageId
                            ? { ...page, deleted_at: new Date().toISOString(), deletion_reason: 'user_deleted' as const }
                            : page
                    )
                }
            };
        case 'SET_NAVIGATION':
            return {
                ...state,
                websiteStructure: { ...state.websiteStructure, navigation: action.payload }
            };
        case 'UPDATE_NAVIGATION':
            return {
                ...state,
                websiteStructure: {
                    ...state.websiteStructure,
                    navigation: state.websiteStructure.navigation
                        ? { ...state.websiteStructure.navigation, ...action.payload }
                        : null
                }
            };
        case 'SET_NAV_SYNC_STATUS':
            return {
                ...state,
                websiteStructure: { ...state.websiteStructure, navigationSyncStatus: action.payload }
            };
        case 'SET_NAP_DATA':
            return {
                ...state,
                websiteStructure: { ...state.websiteStructure, napData: action.payload }
            };
        case 'ADD_FOUNDATION_NOTIFICATION':
            return {
                ...state,
                websiteStructure: {
                    ...state.websiteStructure,
                    notifications: [...state.websiteStructure.notifications, action.payload]
                }
            };
        case 'DISMISS_FOUNDATION_NOTIFICATION':
            return {
                ...state,
                websiteStructure: {
                    ...state.websiteStructure,
                    notifications: state.websiteStructure.notifications.filter(n => n.id !== action.payload.notificationId)
                }
            };
        case 'SET_WEBSITE_STRUCTURE_GENERATING':
            return {
                ...state,
                websiteStructure: { ...state.websiteStructure, isGenerating: action.payload }
            };
        case 'RESET_WEBSITE_STRUCTURE':
            return {
                ...state,
                websiteStructure: {
                    foundationPages: [],
                    navigation: null,
                    navigationSyncStatus: null,
                    notifications: [],
                    isGenerating: false,
                }
            };

        // Linking Audit reducers (Phase 5)
        case 'SET_LINKING_AUDIT_RESULT':
            return {
                ...state,
                linkingAudit: { ...state.linkingAudit, result: action.payload }
            };
        case 'SET_LINKING_AUDIT_RUNNING':
            return {
                ...state,
                linkingAudit: { ...state.linkingAudit, isRunning: action.payload }
            };
        case 'SET_LINKING_PENDING_FIXES':
            return {
                ...state,
                linkingAudit: { ...state.linkingAudit, pendingFixes: action.payload }
            };
        case 'ADD_LINKING_FIX_HISTORY':
            return {
                ...state,
                linkingAudit: {
                    ...state.linkingAudit,
                    fixHistory: [action.payload, ...state.linkingAudit.fixHistory].slice(0, 100)
                }
            };
        case 'CLEAR_LINKING_FIX_HISTORY':
            return {
                ...state,
                linkingAudit: { ...state.linkingAudit, fixHistory: [] }
            };
        case 'SET_LINKING_LAST_AUDIT_ID':
            return {
                ...state,
                linkingAudit: { ...state.linkingAudit, lastAuditId: action.payload }
            };
        case 'RESET_LINKING_AUDIT':
            return {
                ...state,
                linkingAudit: {
                    result: null,
                    isRunning: false,
                    pendingFixes: [],
                    fixHistory: [],
                    lastAuditId: null,
                }
            };

        // Unified Audit reducers (Phase 6)
        case 'SET_UNIFIED_AUDIT_RESULT':
            return {
                ...state,
                unifiedAudit: { ...state.unifiedAudit, result: action.payload }
            };
        case 'SET_UNIFIED_AUDIT_RUNNING':
            return {
                ...state,
                unifiedAudit: { ...state.unifiedAudit, isRunning: action.payload }
            };
        case 'SET_UNIFIED_AUDIT_PROGRESS':
            return {
                ...state,
                unifiedAudit: { ...state.unifiedAudit, progress: action.payload }
            };
        case 'SET_UNIFIED_AUDIT_HISTORY':
            return {
                ...state,
                unifiedAudit: { ...state.unifiedAudit, fixHistory: action.payload }
            };
        case 'ADD_UNIFIED_AUDIT_HISTORY':
            return {
                ...state,
                unifiedAudit: {
                    ...state.unifiedAudit,
                    fixHistory: [action.payload, ...state.unifiedAudit.fixHistory]
                }
            };
        case 'SET_UNIFIED_AUDIT_ID':
            return {
                ...state,
                unifiedAudit: { ...state.unifiedAudit, lastAuditId: action.payload }
            };
        case 'RESET_UNIFIED_AUDIT':
            return {
                ...state,
                unifiedAudit: {
                    result: null,
                    isRunning: false,
                    progress: null,
                    fixHistory: [],
                    lastAuditId: null,
                }
            };

        // Publication Planning reducers - delegated to publicationPlanningSlice
        case 'SET_PLANNING_VIEW_MODE':
        case 'SET_PLANNING_CALENDAR_MODE':
        case 'SET_PLANNING_CURRENT_DATE':
        case 'SET_PLANNING_FILTERS':
        case 'SET_PLANNING_SELECTED_TOPICS':
        case 'TOGGLE_PLANNING_TOPIC_SELECTION':
        case 'CLEAR_PLANNING_SELECTION':
        case 'SET_PERFORMANCE_SNAPSHOTS':
        case 'ADD_PERFORMANCE_SNAPSHOT':
        case 'SET_TOPIC_BASELINE':
        case 'SET_PUBLICATION_PLAN_RESULT':
        case 'SET_GENERATING_PLAN':
        case 'SET_BATCH_LAUNCH_DATE':
        case 'RESET_PUBLICATION_PLANNING':
            return {
                ...state,
                publicationPlanning: publicationPlanningReducer(state.publicationPlanning, action as PublicationPlanningAction)
            };
        case 'UPDATE_TOPIC_PUBLICATION_STATUS':
        case 'UPDATE_TOPIC_PUBLICATION_PHASE':
        case 'SET_TOPIC_PUBLICATION_DATE':
        case 'BULK_UPDATE_PUBLICATION_PHASE':
        case 'APPLY_PUBLICATION_PLAN': {
            // Delegate to mapReducer for topic updates within maps
            const newTopicalMaps = state.topicalMaps.map(map => {
                const matches = 'mapId' in action.payload && map.id === action.payload.mapId;
                return matches ? mapReducerForPlanning(map, action) : map;
            });
            return {
                ...state,
                topicalMaps: newTopicalMaps
            };
        }
        default: return state;
    }
};

const mapReducer = (map: TopicalMap, action: any): TopicalMap => {
    // Delegate to extracted slices first
    if (isTopicOperationsAction(action.type)) {
        const result = topicOperationsReducer(map, action);
        if (result !== null) return result;
    }
    if (isContentGenerationAction(action.type)) {
        const result = contentGenerationReducer(map, action);
        if (result !== null) return result;
    }

    // Remaining map-level actions not yet extracted to slices
    switch(action.type) {
        case 'UPDATE_MAP_DATA': return { ...map, ...action.payload.data };
        case 'SET_PILLARS': return { ...map, pillars: action.payload.pillars };
        case 'SET_EAVS': return { ...map, eavs: action.payload.eavs };
        case 'ADD_EAVS': {
            const existing = map.eavs || [];
            const existingKeys = new Set(existing.map((e: SemanticTriple) =>
                `${e.subject?.label}:${e.predicate?.relation}:${e.object?.value}`.toLowerCase()
            ));
            const newEavs = action.payload.eavs.filter((e: SemanticTriple) => {
                const key = `${e.subject?.label}:${e.predicate?.relation}:${e.object?.value}`.toLowerCase();
                return !existingKeys.has(key);
            });
            return { ...map, eavs: [...existing, ...newEavs] };
        }
        case 'SET_COMPETITORS': return { ...map, competitors: action.payload.competitors };
        default: return map;
    }
}

/**
 * Handles publication planning updates to topics within a map.
 * Updates topic metadata with publication plan data.
 */
const mapReducerForPlanning = (map: TopicalMap, action: any): TopicalMap => {
    const updateTopicMetadata = (topicId: string, updates: Record<string, any>): EnrichedTopic[] => {
        return (map.topics || []).map(t => {
            if (t.id !== topicId) return t;
            const currentMetadata = t.metadata || {};
            const currentPlan = (typeof currentMetadata.publication_plan === 'object' && currentMetadata.publication_plan !== null)
              ? currentMetadata.publication_plan
              : {};
            return {
                ...t,
                metadata: {
                    ...currentMetadata,
                    publication_plan: { ...currentPlan, ...updates }
                }
            };
        });
    };

    switch (action.type) {
        case 'UPDATE_TOPIC_PUBLICATION_STATUS': {
            const topics = updateTopicMetadata(action.payload.topicId, {
                status: action.payload.status
            });
            return { ...map, topics };
        }
        case 'UPDATE_TOPIC_PUBLICATION_PHASE': {
            const topics = updateTopicMetadata(action.payload.topicId, {
                phase: action.payload.phase
            });
            return { ...map, topics };
        }
        case 'SET_TOPIC_PUBLICATION_DATE': {
            const { topicId, dateType, date } = action.payload;
            const dateKey = `${dateType}_publication_date`;
            const topics = updateTopicMetadata(topicId, { [dateKey]: date });
            return { ...map, topics };
        }
        case 'BULK_UPDATE_PUBLICATION_PHASE': {
            const { topicIds, phase } = action.payload;
            const updatedTopics = (map.topics || []).map(t => {
                if (!topicIds.includes(t.id)) return t;
                const currentMetadata = t.metadata || {};
                const currentPlan = (typeof currentMetadata.publication_plan === 'object' && currentMetadata.publication_plan !== null)
                  ? currentMetadata.publication_plan
                  : {};
                return {
                    ...t,
                    metadata: {
                        ...currentMetadata,
                        publication_plan: { ...currentPlan, phase }
                    }
                };
            });
            return { ...map, topics: updatedTopics };
        }
        case 'APPLY_PUBLICATION_PLAN': {
            const { planResult } = action.payload as { planResult: PublicationPlanResult };
            const planByTopic = new Map<string, PublicationPlanResult['topics'][0]>(
                planResult.topics.map(p => [p.topic_id, p])
            );
            const updatedTopics = (map.topics || []).map(t => {
                const plan = planByTopic.get(t.id);
                if (!plan) return t;
                const currentMetadata = t.metadata || {};
                return {
                    ...t,
                    metadata: {
                        ...currentMetadata,
                        publication_plan: {
                            phase: plan.phase,
                            priority: plan.priority,
                            priority_score: plan.priority_score,
                            optimal_publication_date: plan.optimal_publication_date,
                            dependencies: plan.dependencies,
                            status: 'not_started' as PublicationStatus
                        }
                    }
                };
            });
            return { ...map, topics: updatedTopics };
        }
        default:
            return map;
    }
};


export const AppStateContext = createContext<{ state: AppState; dispatch: Dispatch<AppAction> } | undefined>(undefined);

export const useAppState = () => {
    const context = useContext(AppStateContext);
    if (context === undefined) {
        throw new Error('useAppState must be used within a StateProvider');
    }
    return context;
};
