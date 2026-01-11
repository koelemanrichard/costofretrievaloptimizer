
// components/ProjectDashboardContainer.tsx
import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useAppState } from '../state/appState';
import { AppStep, SEOPillars, EnrichedTopic, ContentBrief, BusinessInfo, TopicalMap, TopicRecommendation, GscRow, ValidationIssue, MergeSuggestion, ResponseCode, FreshnessProfile, MapImprovementSuggestion, SemanticTriple, ExpansionMode, AuditRuleResult, ContextualFlowIssue, FoundationPage, FoundationPageType, NAPData, NavigationStructure, EnhancedSchemaResult, StreamingProgress } from '../types';
import { ContentGenerationOrchestrator } from '../services/ai/contentGeneration/orchestrator';
import { executePass9 } from '../services/ai/contentGeneration/passes/pass9SchemaGeneration';
import * as aiService from '../services/aiService';
import * as foundationPagesService from '../services/ai/foundationPages';
import { getSupabaseClient } from '../services/supabaseClient';
import type { Json } from '../database.types';
import { v4 as uuidv4 } from 'uuid';
import { slugify, cleanSlug } from '../utils/helpers';
import { KnowledgeGraph } from '../lib/knowledgeGraph';
import { BatchProcessor } from '../services/batchProcessor';
import { useMapData } from '../hooks/useMapData';
import { useKnowledgeGraph } from '../hooks/useKnowledgeGraph';
import { useTopicEnrichment } from '../hooks/useTopicEnrichment';
import { sanitizeTopicFromDb, sanitizeBriefFromDb, safeString, normalizeRpcData, parseTopicalMap, repairBriefsInMap } from '../utils/parsers';
import { generateMasterExport, generateFullZipExport } from '../utils/exportUtils';
import { generateEnhancedExport, EnhancedExportInput } from '../utils/enhancedExportUtils';
import { verifiedInsert, verifiedBulkInsert, verifiedUpdate, verifiedDelete, verifiedBulkDelete } from '../services/verifiedDatabaseService';

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
  type ExportSettings,
  NewMapModal,
  BriefReviewModal,
  FlowAuditModal,
  ImprovementConfirmationModal,
} from './modals';
import { runUnifiedAudit, UnifiedAuditContext, AuditProgress } from '../services/ai/unifiedAudit';
import { applyFix, generateFix, generateBatchFixes, FixContext } from '../services/ai/auditFixes';

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

    // Helper to save analysis results to DB to persist them across reloads
    const saveAnalysisState = useCallback(async (key: string, data: any) => {
        if (!activeMapId || !activeMap) return;
        try {
            const currentAnalysisState = activeMap.analysis_state || {};
            const updatedAnalysisState = {
                ...currentAnalysisState,
                [key]: data
            };
            
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            await supabase
                .from('topical_maps')
                .update({ analysis_state: updatedAnalysisState as any })
                .eq('id', activeMapId);

            // Update local state to reflect the change (important if we navigate away and back)
            dispatch({ 
                type: 'UPDATE_MAP_DATA', 
                payload: { 
                    mapId: activeMapId, 
                    data: { analysis_state: updatedAnalysisState } 
                } 
            });

        } catch (err) {
            console.error("Failed to save analysis state:", err);
            // Non-critical error, don't block the UI
        }
    }, [activeMapId, activeMap, businessInfo, dispatch]);


    const handleSelectMap = (mapId: string) => {
        // Clear KG when switching maps to force hydration for new map
        dispatch({ type: 'SET_KNOWLEDGE_GRAPH', payload: null });
        dispatch({ type: 'SET_ACTIVE_MAP', payload: mapId });
        dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_DASHBOARD });
    };

    const handleCreateNewMap = async (mapName: string) => {
        if (!activeProjectId) return;
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const { data, error } = await supabase.rpc('create_new_map', { p_project_id: activeProjectId, p_map_name: mapName });
            if (error) throw error;
            
            // FIX: Use normalizeRpcData to safely handle array vs object return types
            const rawMap = normalizeRpcData(data);
            const newMap = parseTopicalMap(rawMap);

            dispatch({ type: 'ADD_TOPICAL_MAP', payload: newMap });
            dispatch({ type: 'SET_ACTIVE_MAP', payload: newMap.id });
            dispatch({ type: 'SET_STEP', payload: AppStep.BUSINESS_INFO });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to create map.';
            dispatch({ type: 'SET_ERROR', payload: message });
            throw e;
        }
    };

    // Pre-flight validation helper for map generation
    const validateMapGenerationContext = (): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        // Check pillars - SEOPillars has: centralEntity, sourceContext, centralSearchIntent
        if (!activeMap?.pillars) {
            errors.push('Pillars are not defined. Complete the Pillar Definition step first.');
        } else {
            if (!activeMap.pillars.centralEntity) {
                errors.push('Central Entity is missing in Pillars.');
            }
            if (!activeMap.pillars.centralSearchIntent) {
                errors.push('Central Search Intent is missing in Pillars.');
            }
        }

        // Check domain (from effective business info)
        if (!effectiveBusinessInfo.domain) {
            errors.push('Domain is not set. Set it in Project settings or Business Info.');
        }

        // Check AI configuration
        if (!effectiveBusinessInfo.aiProvider) {
            errors.push('AI Provider is not configured. Check Settings.');
        }

        // Check API key based on provider
        const provider = effectiveBusinessInfo.aiProvider;
        if (provider === 'gemini' && !effectiveBusinessInfo.geminiApiKey) {
            errors.push('Gemini API key is not configured. Add it in Settings.');
        } else if (provider === 'openai' && !effectiveBusinessInfo.openAiApiKey) {
            errors.push('OpenAI API key is not configured. Add it in Settings.');
        } else if (provider === 'anthropic' && !effectiveBusinessInfo.anthropicApiKey) {
            errors.push('Anthropic API key is not configured. Add it in Settings.');
        } else if (provider === 'perplexity' && !effectiveBusinessInfo.perplexityApiKey) {
            errors.push('Perplexity API key is not configured. Add it in Settings.');
        } else if (provider === 'openrouter' && !effectiveBusinessInfo.openRouterApiKey) {
            errors.push('OpenRouter API key is not configured. Add it in Settings.');
        }

        return { valid: errors.length === 0, errors };
    };

    const handleGenerateInitialMap = async () => {
        if (!activeMapId || !activeMap || !activeMap.pillars) {
            dispatch({ type: 'SET_ERROR', payload: 'Cannot generate map: No active map or pillars not defined.' });
            return;
        }
        const user = state.user;
        if (!user) {
             dispatch({ type: 'SET_ERROR', payload: 'User session required.' });
             return;
        }

        // PRE-FLIGHT VALIDATION
        const validation = validateMapGenerationContext();
        if (!validation.valid) {
            const errorMsg = `Cannot generate map. Please fix the following:\n\n• ${validation.errors.join('\n• ')}`;
            dispatch({ type: 'SET_ERROR', payload: errorMsg });
            dispatch({ type: 'LOG_EVENT', payload: {
                service: 'MapGeneration',
                message: 'Pre-flight validation failed',
                status: 'failure',
                timestamp: Date.now(),
                data: { errors: validation.errors, effectiveConfig: {
                    domain: effectiveBusinessInfo.domain,
                    provider: effectiveBusinessInfo.aiProvider,
                    model: effectiveBusinessInfo.aiModel,
                    centralEntity: activeMap.pillars?.centralEntity,
                    centralSearchIntent: activeMap.pillars?.centralSearchIntent?.substring(0, 100)
                }}
            }});
            return;
        }

        // Log the configuration being used
        dispatch({ type: 'LOG_EVENT', payload: {
            service: 'MapGeneration',
            message: 'Starting map generation with validated config',
            status: 'info',
            timestamp: Date.now(),
            data: {
                domain: effectiveBusinessInfo.domain,
                provider: effectiveBusinessInfo.aiProvider,
                model: effectiveBusinessInfo.aiModel,
                centralEntity: activeMap.pillars.centralEntity,
                centralSearchIntent: activeMap.pillars.centralSearchIntent?.substring(0, 100),
                eavCount: activeMap.eavs?.length || 0,
                competitorCount: activeMap.competitors?.length || 0
            }
        }});

        dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true } });
        try {
            // Use effective business info (global keys + map strategy)
            const eavs = activeMap.eavs || [];
            const competitors = activeMap.competitors || [];

            const { coreTopics, outerTopics } = await aiService.generateInitialTopicalMap(
                effectiveBusinessInfo,
                activeMap.pillars,
                eavs,
                competitors,
                dispatch
            );

            // Process and ID assignment
            const topicMap = new Map<string, string>(); // Maps temp ID (e.g. "core_1") to real UUID
            const finalTopics: EnrichedTopic[] = [];

            // Process Core Topics first
            coreTopics.forEach(core => {
                const realId = uuidv4();
                topicMap.set(core.id, realId);

                finalTopics.push({
                    ...core,
                    id: realId,
                    map_id: activeMapId,
                    slug: slugify(core.title),
                    parent_topic_id: null,
                    type: 'core',
                    freshness: core.freshness || FreshnessProfile.EVERGREEN
                } as EnrichedTopic);
            });

            // Process Outer Topics
            outerTopics.forEach(outer => {
                const parentRealId = outer.parent_topic_id ? topicMap.get(outer.parent_topic_id) : null;
                const parentTopic = finalTopics.find(t => t.id === parentRealId);
                const parentSlug = parentTopic ? parentTopic.slug : '';
                
                finalTopics.push({
                    ...outer,
                    id: uuidv4(),
                    map_id: activeMapId,
                    slug: `${parentSlug}/${cleanSlug(parentSlug, outer.title)}`.replace(/^\//, ''),
                    parent_topic_id: parentRealId || null,
                    type: 'outer',
                    freshness: outer.freshness || FreshnessProfile.STANDARD
                } as EnrichedTopic);
            });

            // Save Topics to DB with Metadata
            const dbTopics = finalTopics.map(t => ({
                id: t.id,
                map_id: t.map_id,
                user_id: user.id, 
                parent_topic_id: t.parent_topic_id,
                title: t.title,
                slug: t.slug,
                description: t.description,
                type: t.type,
                freshness: t.freshness,
                metadata: {
                    topic_class: t.topic_class || 'informational',
                    cluster_role: t.cluster_role,
                    attribute_focus: t.attribute_focus,
                    canonical_query: t.canonical_query,
                    decay_score: t.decay_score,
                    // New holistic fields
                    query_network: t.query_network,
                    url_slug_hint: t.url_slug_hint
                }
            }));

            if (dbTopics.length > 0) {
                // Log topic_class distribution for debugging
                const monetizationCount = finalTopics.filter(t => t.topic_class === 'monetization').length;
                const informationalCount = finalTopics.filter(t => t.topic_class === 'informational').length;
                const undefinedCount = finalTopics.filter(t => !t.topic_class).length;
                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'MapGeneration',
                    message: `Saving ${dbTopics.length} topics to DB. topic_class distribution: monetization=${monetizationCount}, informational=${informationalCount}, undefined=${undefinedCount}`,
                    status: 'info',
                    timestamp: Date.now()
                }});

                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

                // Use verified bulk insert to ensure all topics are saved
                const insertResult = await verifiedBulkInsert(
                    supabase,
                    { table: 'topics', operationDescription: `save ${dbTopics.length} generated topics` },
                    dbTopics,
                    'id'
                );

                if (!insertResult.success) {
                    throw new Error(insertResult.error || 'Topic insert verification failed');
                }
            }

            // Update State
            // We use finalTopics directly to preserve the in-memory metadata immediately
            dispatch({ type: 'SET_TOPICS_FOR_MAP', payload: { mapId: activeMapId, topics: finalTopics } });

            // Provide clear user feedback based on results
            if (finalTopics.length === 0) {
                // AI returned empty results - alert the user
                dispatch({ type: 'SET_ERROR', payload: 'The AI returned no topics. This can happen if: (1) The pillars/seed keyword context is too vague, (2) There was an API parsing error, or (3) The AI model is unavailable. Please check the Logs panel for details and try again.' });
                dispatch({ type: 'LOG_EVENT', payload: { service: 'MapGeneration', message: 'AI returned empty topic arrays. Check business context and API configuration.', status: 'warning', timestamp: Date.now(), data: { coreCount: coreTopics.length, outerCount: outerTopics.length, effectiveModel: effectiveBusinessInfo.aiModel, effectiveProvider: effectiveBusinessInfo.aiProvider } } });
            } else {
                dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Initial topical map generated and verified: ${coreTopics.length} core topics and ${outerTopics.length} supporting topics.` });
            }

        } catch (e) {
            console.error("Map Generation Error:", e);
            dispatch({ type: 'LOG_EVENT', payload: { service: 'MapGeneration', message: `Generation failed: ${e instanceof Error ? e.message : 'Unknown error'}`, status: 'failure', timestamp: Date.now(), data: e } });
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to generate initial map."});
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: false } });
        }
    };
    
    const handleStartAnalysis = async () => {
        if (!activeProjectId) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'analysis', value: true } });
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const { error } = await supabase.functions.invoke('start-website-analysis', {
                body: { project_id: activeProjectId },
            });
            if (error) throw error;
            dispatch({ type: 'SET_STEP', payload: AppStep.ANALYSIS_STATUS });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to start analysis.';
            dispatch({ type: 'SET_ERROR', payload: message });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'analysis', value: false } });
        }
    };

    const onAnalyzeKnowledgeDomain = useCallback(async () => {
        if (!activeMapId || !activeMap?.pillars) {
            dispatch({ type: 'SET_ERROR', payload: 'Pillars must be defined to analyze the knowledge domain.' });
            return;
        }
        dispatch({ type: 'SET_LOADING', payload: { key: 'knowledgeDomain', value: true } });
        try {
            const triples = await aiService.expandSemanticTriples(effectiveBusinessInfo, activeMap.pillars, activeMap.eavs || [], dispatch);
            const kg = new KnowledgeGraph();
            
            // Rebuild from scratch to include new triples + existing
            const existingEavs = Array.isArray(activeMap.eavs) ? activeMap.eavs : [];
            [...existingEavs, ...triples].forEach((triple: any) => {
                if (triple?.subject?.label) kg.addNode({ id: triple.subject.label, term: triple.subject.label, type: triple.subject.type, definition: '', metadata: { importance: 8, source: 'AI' } });
                if (triple?.object?.value) kg.addNode({ id: String(triple.object.value), term: String(triple.object.value), type: triple.object.type, definition: '', metadata: { importance: 5, source: 'AI' } });
            });

            dispatch({ type: 'SET_KNOWLEDGE_GRAPH', payload: kg });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'knowledgeDomain', visible: true } });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to analyze domain.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'knowledgeDomain', value: false } });
        }
    }, [activeMap, activeMapId, dispatch, effectiveBusinessInfo]);

    const handleExpandKnowledgeDomain = useCallback(async () => {
        if (!activeMapId || !activeMap?.pillars || !knowledgeGraph) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'knowledgeDomain', value: true } });
        
        try {
            const currentEavs = activeMap.eavs || [];
            const newTriples = await aiService.expandSemanticTriples(effectiveBusinessInfo, activeMap.pillars, currentEavs, dispatch);
            
            if (newTriples.length > 0) {
                // Update Knowledge Graph
                newTriples.forEach((triple) => {
                     if (triple?.subject?.label) knowledgeGraph.addNode({ id: triple.subject.label, term: triple.subject.label, type: triple.subject.type, definition: '', metadata: { importance: 7, source: 'Expansion' } });
                     if (triple?.object?.value) knowledgeGraph.addNode({ id: String(triple.object.value), term: String(triple.object.value), type: triple.object.type, definition: '', metadata: { importance: 4, source: 'Expansion' } });
                });

                // Update State and Persist (Optimistic update, skipping immediate DB save for session fluidity, or we can save to DB)
                const updatedEavs = [...currentEavs, ...newTriples];
                dispatch({ type: 'SET_EAVS', payload: { mapId: activeMapId, eavs: updatedEavs } });
                
                // Trigger KG re-render via dispatching the updated instance
                dispatch({ type: 'SET_KNOWLEDGE_GRAPH', payload: knowledgeGraph });
                
                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

                // Use verified update to ensure EAVs are persisted
                const updateResult = await verifiedUpdate(
                    supabase,
                    { table: 'topical_maps', operationDescription: 'save expanded EAVs' },
                    activeMapId,
                    { eavs: updatedEavs as any }
                );

                if (!updateResult.success) {
                    dispatch({ type: 'SET_ERROR', payload: `⚠️ Added concepts to graph but failed to persist: ${updateResult.error}` });
                } else {
                    dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Added ${newTriples.length} new semantic concepts to the Knowledge Graph.` });
                }
            } else {
                 dispatch({ type: 'SET_NOTIFICATION', payload: 'AI did not find any significant new concepts to add.' });
            }
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to expand knowledge domain.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'knowledgeDomain', value: false } });
        }
    }, [activeMap, activeMapId, knowledgeGraph, effectiveBusinessInfo, dispatch, businessInfo]);

    const onGenerateBrief = useCallback(async (topic: EnrichedTopic, responseCode: ResponseCode, overrideSettings?: { provider: string, model: string }) => {
        const safeKG = knowledgeGraph || new KnowledgeGraph();

        if (!topic || !activeMap || !activeMap.pillars) {
            dispatch({ type: 'SET_ERROR', payload: "Cannot generate brief: critical context is missing." });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'briefs', value: true } });
        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'responseCode', visible: false } });
        // Set status for pulsing indicator on topic
        dispatch({ type: 'SET_BRIEF_GENERATION_STATUS', payload: `Generating brief: "${topic.title}"` });

        const configToUse = overrideSettings
            ? { ...effectiveBusinessInfo, aiProvider: overrideSettings.provider as any, aiModel: overrideSettings.model }
            : effectiveBusinessInfo;

        try {
            const briefData = await aiService.generateContentBrief(configToUse, topic, allTopics, activeMap.pillars, safeKG, responseCode, dispatch);

            // MERGE STRATEGY: Fix "Untitled Topic" Bug
            const newBrief: ContentBrief = {
                ...briefData,
                id: uuidv4(),
                topic_id: topic.id,
                title: topic.title // FORCE the known title from the topic object
            };

            // Decoupled workflow: Set result in temp state and open review modal
            dispatch({ type: 'SET_BRIEF_GENERATION_RESULT', payload: newBrief });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'briefReview', visible: true } });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to generate brief.';
            dispatch({ type: 'SET_ERROR', payload: message });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'briefs', value: false } });
            dispatch({ type: 'SET_BRIEF_GENERATION_STATUS', payload: null }); // Clear status
        }
    }, [activeMap, knowledgeGraph, dispatch, effectiveBusinessInfo, allTopics]);

    const onGenerateAllBriefs = useCallback(async () => {
        const processor = new BatchProcessor(dispatch, () => stateRef.current);
        await processor.generateAllBriefs(allTopics);
        // Show bulk generation summary modal after completion
        setShowBulkSummary(true);
    }, [dispatch, allTopics]);

    const onCancelBriefGeneration = useCallback(() => {
        dispatch({ type: 'CANCEL_BRIEF_GENERATION' });
    }, [dispatch]);

    const onSavePillars = useCallback(async (newPillars: SEOPillars) => {
        if (!activeMapId) return;

        const hasChanges = JSON.stringify(activeMap?.pillars) !== JSON.stringify(newPillars);

        if (hasChanges) {
            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true } });
            try {
                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

                // Use verified update to ensure pillars are persisted
                const updateResult = await verifiedUpdate(
                    supabase,
                    { table: 'topical_maps', operationDescription: 'save SEO pillars' },
                    activeMapId,
                    { pillars: newPillars as any }
                );

                if (!updateResult.success) {
                    throw new Error(updateResult.error || 'Pillar update verification failed');
                }

                dispatch({ type: 'SET_PILLARS', payload: { mapId: activeMapId, pillars: newPillars } });

                if ((activeMap?.topics || []).length > 0) {
                    dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'pillarConfirmation', visible: true } });
                }
            } catch (e) {
                dispatch({ type: 'SET_ERROR', payload: `❌ ${e instanceof Error ? e.message : 'Failed to update pillars.'}` });
            } finally {
                 dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: false } });
            }
        }
    }, [dispatch, activeMapId, activeMap?.pillars, activeMap?.topics, businessInfo]);

    const onConfirmPillarChange = useCallback(async (strategy: 'keep' | 'regenerate') => {
        if (!activeMapId || !activeMap) return;
        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'pillarConfirmation', visible: false } });
        if (strategy === 'regenerate') {
            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true } });
            try {
                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

                // Get all topic IDs for this map to verify deletion
                const { data: existingTopics } = await supabase
                    .from('topics')
                    .select('id')
                    .eq('map_id', activeMapId);

                const topicIds = (existingTopics || []).map(t => t.id);

                if (topicIds.length > 0) {
                    // Use verified bulk delete
                    const deleteResult = await verifiedBulkDelete(
                        supabase,
                        { table: 'topics', operationDescription: 'delete all topics before regeneration' },
                        topicIds
                    );

                    if (!deleteResult.success) {
                        throw new Error(deleteResult.error || 'Topic deletion verification failed');
                    }
                }

                dispatch({ type: 'SET_TOPICS_FOR_MAP', payload: { mapId: activeMapId, topics: [] } });
                // Trigger the AI regeneration
                await handleGenerateInitialMap();

            } catch (e) {
                dispatch({ type: 'SET_ERROR', payload: `❌ ${e instanceof Error ? e.message : 'Failed to regenerate map.'}` });
            }
            finally {
                dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: false } });
            }
        }
    }, [activeMapId, activeMap, dispatch, businessInfo, handleGenerateInitialMap]);

    // First confirmation step for regenerate map
    const handleRegenerateMap = useCallback(async () => {
        if (!activeMapId || !activeMap?.pillars) return;

        const topicCount = (activeMap.topics || []).length;
        const briefCount = Object.keys(activeMap.briefs || {}).length;

        if (topicCount > 0) {
            // Show first confirmation with clear warning about what will be lost
            dispatch({
                type: 'SHOW_CONFIRMATION',
                payload: {
                    title: '⚠️ Regenerate Topical Map?',
                    message: (
                        <div className="space-y-3">
                            <p className="text-red-400 font-semibold">This is a destructive action that cannot be undone.</p>
                            <div className="bg-red-900/30 border border-red-600 rounded p-3">
                                <p className="text-sm text-gray-300">The following will be permanently deleted:</p>
                                <ul className="mt-2 text-sm text-red-300 list-disc list-inside">
                                    <li>{topicCount} topics</li>
                                    <li>{briefCount} content briefs</li>
                                    <li>All associated data and customizations</li>
                                </ul>
                            </div>
                            <p className="text-sm text-gray-400">A new topical map will be generated based on your current SEO pillars and business information.</p>
                        </div>
                    ),
                    onConfirm: () => {
                        dispatch({ type: 'HIDE_CONFIRMATION' });
                        // Show second confirmation modal
                        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'pillarConfirmation', visible: true } });
                    }
                }
            });
            return;
        }
        // If empty, just generate
        await handleGenerateInitialMap();

    }, [activeMapId, activeMap, dispatch, handleGenerateInitialMap]);


    const onAddTopic = useCallback(async (topicData: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>, placement: 'ai' | 'root' | string, overrideSettings?: { provider: string, model: string }) => {
        if (!activeMapId) return;
        const user = state.user;
        if (!user) {
             dispatch({ type: 'SET_ERROR', payload: 'User session required.' });
             return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'addTopic', value: true } });
        const configToUse = overrideSettings 
            ? { ...effectiveBusinessInfo, aiProvider: overrideSettings.provider as any, aiModel: overrideSettings.model }
            : effectiveBusinessInfo;

        try {
            let parentId = null;
            let type = topicData.type;

            if (placement === 'ai') {
                const result = await aiService.addTopicIntelligently(topicData.title, topicData.description || '', allTopics, configToUse, dispatch);
                parentId = result.parentTopicId;
                type = result.type;
            } else if (placement !== 'root') {
                parentId = placement;
            }
            
            const parentSlug = allTopics.find(t => t.id === parentId)?.slug || '';
            const newTopic: EnrichedTopic = {
                ...topicData,
                id: uuidv4(),
                map_id: activeMapId,
                slug: `${parentSlug}/${cleanSlug(parentSlug, topicData.title)}`.replace(/^\//, ''), // Use Clean Slug
                parent_topic_id: parentId,
                type: type,
            };
            
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // Use verified insert to ensure topic is saved
            const insertResult = await verifiedInsert(
                supabase,
                { table: 'topics', operationDescription: `add topic "${newTopic.title}"` },
                {
                    id: newTopic.id,
                    map_id: newTopic.map_id,
                    title: newTopic.title,
                    slug: newTopic.slug,
                    description: newTopic.description,
                    type: newTopic.type,
                    parent_topic_id: newTopic.parent_topic_id,
                    freshness: newTopic.freshness,
                    metadata: (newTopic.metadata || {}) as Json,
                    user_id: user.id
                }
            );

            if (!insertResult.success || !insertResult.data) {
                throw new Error(insertResult.error || 'Topic insert verification failed');
            }

            const safeTopic = sanitizeTopicFromDb(insertResult.data);
            dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: safeTopic } });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'addTopic', visible: false } });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to add topic.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'addTopic', value: false } });
        }
    }, [activeMapId, allTopics, effectiveBusinessInfo, dispatch, businessInfo, state.user]);

    // Batch add handler for AI-Assisted topic creation
    const onBulkAddTopics = useCallback(async (topics: {data: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>, placement: 'ai' | 'root' | string}[]) => {
        if (!activeMapId) return;
        const user = state.user;
        if (!user) {
             dispatch({ type: 'SET_ERROR', payload: 'User session required.' });
             return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'addTopic', value: true } });
        
        try {
            // Separate inputs into Core, Outer, and Child types
            const coreInputs = topics.filter(t => t.data.type === 'core');
            const outerInputs = topics.filter(t => t.data.type === 'outer');
            const childInputs = topics.filter(t => t.data.type === 'child');

            // Temp store for new topic IDs: Title -> UUID
            const newCoreIdMap = new Map<string, string>();
            const newOuterIdMap = new Map<string, string>();
            
            const coreTopicsToInsert: any[] = [];

            // --- PASS 1: Process & Insert Core Topics ---
            for (const input of coreInputs) {
                const newId = uuidv4();
                newCoreIdMap.set(input.data.title, newId);
                
                coreTopicsToInsert.push({
                    id: newId,
                    map_id: activeMapId,
                    title: input.data.title,
                    slug: slugify(input.data.title),
                    description: input.data.description || '',
                    parent_topic_id: null,
                    type: 'core',
                    freshness: input.data.freshness || 'EVERGREEN',
                    metadata: (input.data.metadata || {}) as Json,
                    user_id: user.id
                });
            }

            // Insert Core Topics First (to satisfy FK constraints for children)
            if (coreTopicsToInsert.length > 0) {
                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

                // Use verified bulk insert
                const coreResult = await verifiedBulkInsert(
                    supabase,
                    { table: 'topics', operationDescription: `save ${coreTopicsToInsert.length} core topics` },
                    coreTopicsToInsert,
                    'id'
                );

                if (!coreResult.success) {
                    throw new Error(coreResult.error || 'Core topic insert verification failed');
                }

                // Dispatch Core Topics immediately
                coreTopicsToInsert.forEach(topic => {
                    const safeTopic = sanitizeTopicFromDb(topic);
                    dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: safeTopic } });
                });
            }

            // --- PASS 2: Process & Insert Outer Topics ---
            const outerTopicsToInsert = await Promise.all(outerInputs.map(async ({ data: topicData, placement }) => {
                let parentId: string | null = null;
                let type = topicData.type;

                // Resolve Parent ID
                if (placement === 'ai') {
                    // Fallback to AI placement if no parent specified
                    const result = await aiService.addTopicIntelligently(topicData.title, topicData.description || '', allTopics, effectiveBusinessInfo, dispatch);
                    parentId = result.parentTopicId;
                    type = result.type;
                } else if (placement === 'root') {
                    parentId = null;
                } else if (newCoreIdMap.has(placement)) {
                    // It's a newly created Core topic from Pass 1
                    parentId = newCoreIdMap.get(placement) || null;
                } else {
                    // Check if it's an existing topic ID or Title
                    const existingTopic = allTopics.find(t => t.id === placement || t.title === placement);
                    if (existingTopic) {
                        parentId = existingTopic.id;
                    } else {
                        parentId = null;
                    }
                }
                
                // Resolve Slug
                let parentSlug = '';
                if (parentId) {
                    // Check new topics first
                    const newParent = coreTopicsToInsert.find(t => t.id === parentId);
                    if (newParent) {
                        parentSlug = newParent.slug;
                    } else {
                        // Check existing topics
                        const existingParent = allTopics.find(t => t.id === parentId);
                        if (existingParent) parentSlug = existingParent.slug;
                    }
                }

                return {
                    id: uuidv4(),
                    map_id: activeMapId,
                    title: topicData.title,
                    slug: `${parentSlug}/${cleanSlug(parentSlug, topicData.title)}`.replace(/^\//, ''),
                    description: topicData.description || '',
                    parent_topic_id: parentId,
                    type: type,
                    freshness: topicData.freshness || 'EVERGREEN',
                    metadata: (topicData.metadata || {}) as Json,
                    user_id: user.id
                };
            }));

            // Insert Outer Topics
            if (outerTopicsToInsert.length > 0) {
                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

                // Use verified bulk insert
                const outerResult = await verifiedBulkInsert(
                    supabase,
                    { table: 'topics', operationDescription: `save ${outerTopicsToInsert.length} outer topics` },
                    outerTopicsToInsert as any,
                    'id'
                );

                if (!outerResult.success) {
                    throw new Error(outerResult.error || 'Outer topic insert verification failed');
                }

                // Track outer topic IDs for child topic resolution & Dispatch Outer Topics
                outerTopicsToInsert.forEach(topic => {
                    newOuterIdMap.set(topic.title, topic.id);
                    const safeTopic = sanitizeTopicFromDb(topic);
                    dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: safeTopic } });
                });
            }

            // --- PASS 3: Process & Insert Child Topics ---
            const childTopicsToInsert = childInputs.map(({ data: topicData, placement }) => {
                let parentId: string | null = null;

                // Resolve Parent ID (should be an outer topic)
                if (placement && placement !== 'ai' && placement !== 'root') {
                    // Check if it's a newly created outer topic from Pass 2
                    if (newOuterIdMap.has(placement)) {
                        parentId = newOuterIdMap.get(placement) || null;
                    } else {
                        // Check if it's an existing topic ID or Title
                        const existingTopic = [...allTopics, ...outerTopicsToInsert].find(t => t.id === placement || t.title === placement);
                        if (existingTopic) {
                            parentId = existingTopic.id;
                        }
                    }
                }

                // Resolve Slug
                let parentSlug = '';
                if (parentId) {
                    const newParent = outerTopicsToInsert.find(t => t.id === parentId);
                    if (newParent) {
                        parentSlug = newParent.slug;
                    } else {
                        const existingParent = allTopics.find(t => t.id === parentId);
                        if (existingParent) parentSlug = existingParent.slug;
                    }
                }

                return {
                    id: uuidv4(),
                    map_id: activeMapId,
                    title: topicData.title,
                    slug: `${parentSlug}/${cleanSlug(parentSlug, topicData.title)}`.replace(/^\//, ''),
                    description: topicData.description || '',
                    parent_topic_id: parentId,
                    type: 'child' as const,
                    freshness: topicData.freshness || 'EVERGREEN',
                    metadata: (topicData.metadata || {}) as Json,
                    user_id: user.id
                };
            });

            // Insert Child Topics
            if (childTopicsToInsert.length > 0) {
                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

                // Use verified bulk insert
                const childResult = await verifiedBulkInsert(
                    supabase,
                    { table: 'topics', operationDescription: `save ${childTopicsToInsert.length} child topics` },
                    childTopicsToInsert as any,
                    'id'
                );

                if (!childResult.success) {
                    throw new Error(childResult.error || 'Child topic insert verification failed');
                }

                // Dispatch Child Topics
                childTopicsToInsert.forEach(topic => {
                    const safeTopic = sanitizeTopicFromDb(topic);
                    dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: safeTopic } });
                });
            }

            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'addTopic', visible: false } });
            dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Successfully added and verified ${coreTopicsToInsert.length + outerTopicsToInsert.length + childTopicsToInsert.length} new topics.` });

        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to add topics.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'addTopic', value: false } });
        }
    }, [activeMapId, allTopics, effectiveBusinessInfo, dispatch, businessInfo, state.user]);

    const handleOpenExpansionModal = useCallback((coreTopic: EnrichedTopic, mode: ExpansionMode) => {
        dispatch({ type: 'SET_ACTIVE_EXPANSION_TOPIC', payload: coreTopic });
        dispatch({ type: 'SET_ACTIVE_EXPANSION_MODE', payload: mode });
        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'topicExpansion', visible: true } });
    }, [dispatch]);

    const handleExpandCoreTopic = useCallback(async (coreTopic: EnrichedTopic, mode: ExpansionMode, userContext?: string, overrideSettings?: { provider: string, model: string }) => {
        const safeKG = knowledgeGraph || new KnowledgeGraph();
        if (!activeMapId || !activeMap?.pillars) return;
        const user = state.user;
        if (!user) return;
        
        const loadingKey = `expand_${coreTopic.id}`;
        dispatch({ type: 'SET_LOADING', payload: { key: loadingKey, value: true } });
        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'topicExpansion', visible: false } }); // Close modal immediately
        
        const configToUse = overrideSettings 
            ? { ...effectiveBusinessInfo, aiProvider: overrideSettings.provider as any, aiModel: overrideSettings.model }
            : effectiveBusinessInfo;

        try {
            const newTopicSuggestions = await aiService.expandCoreTopic(configToUse, activeMap.pillars, coreTopic, allTopics, safeKG, dispatch, mode, userContext);

            if (!newTopicSuggestions || newTopicSuggestions.length === 0) {
                dispatch({ type: 'SET_NOTIFICATION', payload: `No new topics generated for "${coreTopic.title}". The AI may not have found relevant expansions.` });
                return;
            }

            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const topicsToAdd = newTopicSuggestions.map(suggestion => ({
                id: uuidv4(),
                map_id: activeMapId,
                user_id: user.id,
                parent_topic_id: coreTopic.id,
                title: suggestion.title,
                slug: `${coreTopic.slug}/${cleanSlug(coreTopic.slug, suggestion.title)}`, // Use Clean Slug
                description: suggestion.description,
                type: 'outer' as 'core' | 'outer',
                freshness: 'STANDARD'
            }));

            // Use verified bulk insert
            const insertResult = await verifiedBulkInsert(
                supabase,
                { table: 'topics', operationDescription: `expand "${coreTopic.title}" with ${topicsToAdd.length} new topics` },
                topicsToAdd,
                '*'
            );

            if (!insertResult.success || !insertResult.data) {
                throw new Error(insertResult.error || 'Topic expansion insert verification failed');
            }

            // Batch add all topics at once to prevent HMR-related state issues
            const safeTopics = (insertResult.data || []).map(dbTopic => sanitizeTopicFromDb(dbTopic));
            dispatch({ type: 'ADD_TOPICS', payload: { mapId: activeMapId, topics: safeTopics }});
            dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Successfully expanded "${coreTopic.title}" with ${topicsToAdd.length} new topics (verified).` });
        } catch(e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to expand topic.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: loadingKey, value: false } });
            dispatch({ type: 'SET_ACTIVE_EXPANSION_TOPIC', payload: null });
        }
    }, [activeMap, activeMapId, knowledgeGraph, allTopics, effectiveBusinessInfo, dispatch, businessInfo, state.user]);

    const onValidateMap = useCallback(async () => {
        if (!activeMap || !activeMap.pillars) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'validation', value: true } });
        dispatch({ type: 'SET_NOTIFICATION', payload: 'Validating map structure... This may take a moment.' });
        try {
            const result = await aiService.validateTopicalMap(allTopics, activeMap.pillars, effectiveBusinessInfo, dispatch, briefs);
            dispatch({ type: 'SET_VALIDATION_RESULT', payload: result });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'validation', visible: true } });
            saveAnalysisState('validationResult', result);
            const issueCount = result.issues?.length || 0;
            dispatch({ type: 'SET_NOTIFICATION', payload: issueCount > 0
                ? `Validation complete: ${issueCount} issue${issueCount > 1 ? 's' : ''} found.`
                : 'Validation complete: No issues found!' });
        } catch(e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Validation failed' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'validation', value: false } });
        }
    }, [activeMap, allTopics, effectiveBusinessInfo, dispatch, saveAnalysisState, briefs]);

    const onFindMergeOpportunities = useCallback(async () => {
        if (!activeMap || !activeMap.pillars) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'merge', value: true } });
        try {
            const suggestions = await aiService.findMergeOpportunities(allTopics, effectiveBusinessInfo, dispatch);
            dispatch({ type: 'SET_MERGE_SUGGESTIONS', payload: suggestions });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'merge', visible: true } });
        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to find merge opportunities.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'merge', value: false } });
        }
    }, [activeMap, allTopics, effectiveBusinessInfo, dispatch]);

    const onAnalyzeSemanticRelationships = useCallback(async () => {
        if (!activeMap || !activeMap.pillars) return;
         dispatch({ type: 'SET_LOADING', payload: { key: 'semantic', value: true } });
         try {
             const result = await aiService.analyzeSemanticRelationships(allTopics, effectiveBusinessInfo, dispatch);
             dispatch({ type: 'SET_SEMANTIC_ANALYSIS_RESULT', payload: result });
             dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'semantic', visible: true } });
             saveAnalysisState('semanticAnalysisResult', result);
         } catch (e) {
              dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Semantic analysis failed.' });
         } finally {
              dispatch({ type: 'SET_LOADING', payload: { key: 'semantic', value: false } });
         }
    }, [activeMap, allTopics, effectiveBusinessInfo, dispatch, saveAnalysisState]);

    const onAnalyzeContextualCoverage = useCallback(async () => {
        if (!activeMap || !activeMap.pillars) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'coverage', value: true } });
        try {
             const result = await aiService.analyzeContextualCoverage(effectiveBusinessInfo, allTopics, activeMap.pillars, dispatch);
             dispatch({ type: 'SET_CONTEXTUAL_COVERAGE_RESULT', payload: result });
             dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'coverage', visible: true } });
             saveAnalysisState('contextualCoverageResult', result);
         } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Contextual coverage analysis failed.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'coverage', value: false } });
        }
    }, [activeMap, allTopics, effectiveBusinessInfo, dispatch, saveAnalysisState]);

    const onAuditInternalLinking = useCallback(async () => {
        if (!activeMap || !activeMap.pillars) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'linkingAudit', value: true } });
        try {
             const result = await aiService.auditInternalLinking(allTopics, briefs, effectiveBusinessInfo, dispatch);
             dispatch({ type: 'SET_INTERNAL_LINK_AUDIT_RESULT', payload: result });
             dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'linkingAudit', visible: true } });
             saveAnalysisState('internalLinkAuditResult', result);
        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Linking audit failed.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'linkingAudit', value: false } });
        }
    }, [activeMap, allTopics, briefs, effectiveBusinessInfo, dispatch, saveAnalysisState]);

    const onCalculateTopicalAuthority = useCallback(async () => {
        if (!activeMap || !activeMap.pillars || !knowledgeGraph) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'authority', value: true } });
        try {
             const result = await aiService.calculateTopicalAuthority(allTopics, briefs, knowledgeGraph, effectiveBusinessInfo, dispatch);
             dispatch({ type: 'SET_TOPICAL_AUTHORITY_SCORE', payload: result });
             dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'authority', visible: true } });
             saveAnalysisState('topicalAuthorityScore', result);
        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Authority calculation failed.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'authority', value: false } });
        }
    }, [activeMap, allTopics, briefs, knowledgeGraph, effectiveBusinessInfo, dispatch, saveAnalysisState]);

    const onGeneratePublicationPlan = useCallback(async () => {
        if (!activeMap || !activeMap.pillars) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'plan', value: true } });
        try {
             const result = await aiService.generatePublicationPlan(allTopics, effectiveBusinessInfo, dispatch);
             dispatch({ type: 'SET_PUBLICATION_PLAN', payload: result });
             dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'plan', visible: true } });
             saveAnalysisState('publicationPlan', result);
        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Publication plan generation failed.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'plan', value: false } });
        }
    }, [activeMap, allTopics, effectiveBusinessInfo, dispatch, saveAnalysisState]);

    // Unified Audit handler (Phase 6)
    const onRunUnifiedAudit = useCallback(async () => {
        if (!activeMap || !activeMapId) return;
        dispatch({ type: 'SET_UNIFIED_AUDIT_RUNNING', payload: true });
        dispatch({ type: 'SET_LOADING', payload: { key: 'unifiedAudit', value: true } });
        dispatch({ type: 'SET_UNIFIED_AUDIT_PROGRESS', payload: null });

        try {
            const context: UnifiedAuditContext = {
                mapId: activeMapId,
                topics: allTopics,
                briefs: briefs,
                foundationPages: state.websiteStructure.foundationPages || [],
                navigation: state.websiteStructure.navigation || null,
                eavs: (activeMap.eavs as SemanticTriple[]) || [],
                pillars: activeMap.pillars ? [{ id: activeMap.pillars.centralEntity, name: activeMap.pillars.centralEntity }] : [],
            };

            const result = await runUnifiedAudit(
                context,
                state.user?.id,
                (progress) => {
                    dispatch({ type: 'SET_UNIFIED_AUDIT_PROGRESS', payload: progress });
                }
            );
            dispatch({ type: 'SET_UNIFIED_AUDIT_RESULT', payload: result });
            dispatch({ type: 'SET_UNIFIED_AUDIT_ID', payload: result.id });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'unifiedAudit', visible: true } });
            saveAnalysisState('unifiedAuditResult', result);
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Unified audit failed.' });
        } finally {
            dispatch({ type: 'SET_UNIFIED_AUDIT_RUNNING', payload: false });
            dispatch({ type: 'SET_UNIFIED_AUDIT_PROGRESS', payload: null });
            dispatch({ type: 'SET_LOADING', payload: { key: 'unifiedAudit', value: false } });
        }
    }, [activeMap, activeMapId, allTopics, briefs, state.websiteStructure, state.user, dispatch, saveAnalysisState]);

    // Handle applying a single fix from unified audit
    const handleApplyUnifiedFix = useCallback(async (issue: any, existingFix?: any) => {
        if (!activeMapId || !state.user) return;
        const fix = existingFix || generateFix(issue);
        if (!fix) {
            dispatch({ type: 'SET_NOTIFICATION', payload: `Acknowledged: ${issue.suggestedFix || issue.message}` });
            return;
        }

        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
        const context: FixContext = {
            supabase,
            mapId: activeMapId,
            userId: state.user.id,
            auditRunId: state.unifiedAudit.lastAuditId || '',
        };

        const result = await applyFix(issue, fix, context);
        if (result.success) {
            dispatch({ type: 'SET_NOTIFICATION', payload: result.message });
            if (result.historyEntry) {
                dispatch({ type: 'ADD_UNIFIED_AUDIT_HISTORY', payload: result.historyEntry });
            }
        } else {
            dispatch({ type: 'SET_ERROR', payload: result.error || result.message });
        }
    }, [activeMapId, state.user, state.unifiedAudit.lastAuditId, businessInfo, dispatch]);

    // Handle applying all fixes from unified audit
    const handleApplyAllUnifiedFixes = useCallback(async (issues: any[], _fixes: any[]) => {
        for (const issue of issues) {
            await handleApplyUnifiedFix(issue);
        }
        dispatch({ type: 'SET_NOTIFICATION', payload: `Applied fixes for ${issues.length} issues` });
    }, [handleApplyUnifiedFix, dispatch]);

    // Phase 1: Generate improvement suggestions and show confirmation modal
    const onImproveMap = useCallback(async (issues: ValidationIssue[], options?: { includeTypeReclassifications?: boolean }) => {
        if (!activeMapId || !activeMap?.pillars) return;
        const user = state.user;
        if (!user) return;

        const includeTypeReclassifications = options?.includeTypeReclassifications ?? true;
        setPendingImprovementOptions({ includeTypeReclassifications });

        dispatch({ type: 'SET_LOADING', payload: { key: 'improveMap', value: true } });

        try {
            const suggestion = await aiService.improveTopicalMap(allTopics, issues, effectiveBusinessInfo, dispatch);
            dispatch({ type: 'SET_IMPROVEMENT_LOG', payload: suggestion });

            // Show confirmation modal instead of immediately applying
            setShowImprovementConfirmation(true);
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'validation', visible: false } });

        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Map improvement analysis failed.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'improveMap', value: false } });
        }
    }, [activeMapId, activeMap, allTopics, effectiveBusinessInfo, dispatch, state.user]);

    // Phase 2: Apply the confirmed improvements
    const onApplyImprovement = useCallback(async () => {
        if (!activeMapId || !state.improvementLog) return;
        const user = state.user;
        if (!user) return;

        const suggestion = state.improvementLog;
        const includeTypeReclassifications = pendingImprovementOptions.includeTypeReclassifications;

        setIsApplyingImprovement(true);

        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // Build a lookup of core topics by title for parent assignment
            const coreTopicsByTitle = new Map<string, EnrichedTopic>();
            allTopics.filter(t => t.type === 'core').forEach(t => {
                coreTopicsByTitle.set(t.title.toLowerCase(), t);
            });

            // Collect all new topics (from newTopics and hubSpokeGapFills)
            const allNewTopics: typeof suggestion.newTopics = [...suggestion.newTopics];

            // Process hubSpokeGapFills - convert to newTopics format
            if (suggestion.hubSpokeGapFills && suggestion.hubSpokeGapFills.length > 0) {
                suggestion.hubSpokeGapFills.forEach(fill => {
                    fill.newSpokes.forEach(spoke => {
                        allNewTopics.push({
                            title: spoke.title,
                            description: spoke.description,
                            type: 'outer',
                            topic_class: spoke.topic_class,
                            parentTopicTitle: fill.hubTitle,
                            reasoning: `Hub-spoke gap fill for "${fill.hubTitle}"`
                        });
                    });
                });
            }

            if (allNewTopics.length > 0) {
                // First pass: Create core topics to get their IDs
                const coreTopicsToAdd = allNewTopics.filter(t => t.type === 'core');
                const outerTopicsToAdd = allNewTopics.filter(t => t.type === 'outer');

                // Track newly created cores for parent resolution
                const newCoresByTitle = new Map<string, string>(); // title -> id

                // Add core topics first
                if (coreTopicsToAdd.length > 0) {
                    const coreDbTopics = coreTopicsToAdd.map(t => ({
                        id: uuidv4(),
                        map_id: activeMapId,
                        user_id: user.id,
                        title: t.title,
                        slug: slugify(t.title),
                        description: t.description,
                        type: 'core' as const,
                        freshness: 'EVERGREEN',
                        parent_topic_id: null,
                        metadata: {
                            topic_class: t.topic_class || 'informational'
                        }
                    }));

                    coreDbTopics.forEach(ct => {
                        newCoresByTitle.set(ct.title.toLowerCase(), ct.id);
                    });

                    // Use verified bulk insert
                    const coreResult = await verifiedBulkInsert(
                        supabase,
                        { table: 'topics', operationDescription: `add ${coreDbTopics.length} core topics from improvement` },
                        coreDbTopics,
                        '*'
                    );

                    if (!coreResult.success) {
                        throw new Error(coreResult.error || 'Core topic insert verification failed');
                    }

                    (coreResult.data || []).forEach(topic => {
                        dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: sanitizeTopicFromDb(topic) } });
                    });

                    dispatch({ type: 'LOG_EVENT', payload: {
                        service: 'MapImprovement',
                        message: `✓ Added ${coreResult.data?.length || 0} new core topics (verified)`,
                        status: 'info',
                        timestamp: Date.now()
                    }});
                }

                // Add outer topics with proper parent assignment
                if (outerTopicsToAdd.length > 0) {
                    const outerDbTopics = outerTopicsToAdd.map(t => {
                        // Resolve parent topic ID
                        let parentId: string | null = null;
                        if (t.parentTopicTitle) {
                            const parentTitleLower = t.parentTopicTitle.toLowerCase();
                            // First check newly created cores
                            if (newCoresByTitle.has(parentTitleLower)) {
                                parentId = newCoresByTitle.get(parentTitleLower) || null;
                            } else if (coreTopicsByTitle.has(parentTitleLower)) {
                                // Then check existing cores
                                parentId = coreTopicsByTitle.get(parentTitleLower)?.id || null;
                            }
                        }

                        // Generate proper slug with parent context
                        const parentTopic = parentId ?
                            (allTopics.find(p => p.id === parentId) || { slug: '' }) :
                            { slug: '' };
                        const parentSlug = parentTopic.slug || '';
                        const slug = parentId && parentSlug
                            ? `${parentSlug}/${cleanSlug(parentSlug, t.title)}`.replace(/^\//, '')
                            : slugify(t.title);

                        return {
                            id: uuidv4(),
                            map_id: activeMapId,
                            user_id: user.id,
                            title: t.title,
                            slug,
                            description: t.description,
                            type: 'outer' as const,
                            freshness: 'STANDARD',
                            parent_topic_id: parentId,
                            metadata: {
                                topic_class: t.topic_class || 'informational'
                            }
                        };
                    });

                    // Use verified bulk insert
                    const outerResult = await verifiedBulkInsert(
                        supabase,
                        { table: 'topics', operationDescription: `add ${outerDbTopics.length} outer topics from improvement` },
                        outerDbTopics,
                        '*'
                    );

                    if (!outerResult.success) {
                        throw new Error(outerResult.error || 'Outer topic insert verification failed');
                    }

                    (outerResult.data || []).forEach(topic => {
                        dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: sanitizeTopicFromDb(topic) } });
                    });

                    // Log parent assignment stats
                    const withParent = outerDbTopics.filter(t => t.parent_topic_id).length;
                    const orphaned = outerDbTopics.filter(t => !t.parent_topic_id).length;
                    dispatch({ type: 'LOG_EVENT', payload: {
                        service: 'MapImprovement',
                        message: `✓ Added ${outerResult.data?.length || 0} outer topics (${withParent} with parents, ${orphaned} orphaned) (verified)`,
                        status: orphaned > 0 ? 'warning' : 'info',
                        timestamp: Date.now()
                    }});
                }
            }

            if (suggestion.topicTitlesToDelete.length > 0) {
                const idsToDelete: string[] = [];
                suggestion.topicTitlesToDelete.forEach(title => {
                    const match = allTopics.find(t => t.title.toLowerCase() === title.toLowerCase());
                    if (match) idsToDelete.push(match.id);
                });

                if (idsToDelete.length > 0) {
                    const deleteResult = await verifiedBulkDelete(
                        supabase,
                        { table: 'topics', operationDescription: `delete ${idsToDelete.length} topics from improvement` },
                        { column: 'id', operator: 'in', value: idsToDelete },
                        idsToDelete.length
                    );

                    if (!deleteResult.success) {
                        throw new Error(deleteResult.error || 'Topic deletion verification failed');
                    }

                    idsToDelete.forEach(id => {
                         dispatch({ type: 'DELETE_TOPIC', payload: { mapId: activeMapId, topicId: id } });
                    });

                    dispatch({ type: 'LOG_EVENT', payload: {
                        service: 'MapImprovement',
                        message: `✓ Deleted ${idsToDelete.length} topics (verified)`,
                        status: 'info',
                        timestamp: Date.now()
                    }});
                }
            }

            // Process type reclassifications (core -> outer or vice versa) - only if enabled
            if (includeTypeReclassifications && suggestion.typeReclassifications && suggestion.typeReclassifications.length > 0) {
                let reclassifiedCount = 0;
                for (const reclass of suggestion.typeReclassifications) {
                    const topic = allTopics.find(t => t.title.toLowerCase() === reclass.topicTitle.toLowerCase());
                    if (!topic) continue;

                    // Find the new parent if specified
                    let newParentId: string | null = null;
                    if (reclass.newParentTitle && reclass.newType === 'outer') {
                        const parent = allTopics.find(t =>
                            t.title.toLowerCase() === reclass.newParentTitle!.toLowerCase() && t.type === 'core'
                        );
                        newParentId = parent?.id || null;
                    }

                    // Build update object
                    const updateData: Record<string, any> = {
                        type: reclass.newType,
                        parent_topic_id: newParentId
                    };

                    // Update slug if becoming outer with a parent
                    if (reclass.newType === 'outer' && newParentId) {
                        const parentTopic = allTopics.find(p => p.id === newParentId);
                        if (parentTopic?.slug) {
                            updateData.slug = `${parentTopic.slug}/${cleanSlug(parentTopic.slug, topic.title)}`.replace(/^\//, '');
                        }
                    }

                    const reclassResult = await verifiedUpdate(
                        supabase,
                        { table: 'topics', operationDescription: `reclassify topic "${topic.title}" to ${reclass.newType}` },
                        topic.id,
                        updateData,
                        'id, type, parent_topic_id, slug'
                    );

                    if (!reclassResult.success) {
                        console.error(`Failed to reclassify topic "${topic.title}":`, reclassResult.error);
                        dispatch({ type: 'LOG_EVENT', payload: {
                            service: 'MapImprovement',
                            message: `⚠ Failed to reclassify "${topic.title}": ${reclassResult.error}`,
                            status: 'warning',
                            timestamp: Date.now()
                        }});
                        continue;
                    }

                    // Update local state with verified data
                    dispatch({ type: 'UPDATE_TOPIC', payload: {
                        mapId: activeMapId,
                        topicId: topic.id,
                        updates: {
                            type: reclassResult.data?.type || reclass.newType,
                            parent_topic_id: reclassResult.data?.parent_topic_id || newParentId,
                            slug: reclassResult.data?.slug || updateData.slug || topic.slug
                        }
                    }});
                    reclassifiedCount++;
                }

                if (reclassifiedCount > 0) {
                    dispatch({ type: 'LOG_EVENT', payload: {
                        service: 'MapImprovement',
                        message: `Reclassified ${reclassifiedCount} topics (type changes applied)`,
                        status: 'info',
                        timestamp: Date.now()
                    }});
                }
            }

            // Close confirmation modal and show success log
            setShowImprovementConfirmation(false);
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'improvementLog', visible: true } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Map improvements applied successfully.' });

        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Map improvement failed.' });
        } finally {
             setIsApplyingImprovement(false);
        }
    }, [activeMapId, allTopics, dispatch, businessInfo, state.user, state.improvementLog, pendingImprovementOptions]);

    const onExecuteMerge = useCallback(async (suggestion: MergeSuggestion) => {
        if (!activeMapId) return;
        const user = state.user;
        if (!user) return;

        dispatch({ type: 'SET_LOADING', payload: { key: 'executeMerge', value: true } });
        
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            const newTopicData = {
                id: uuidv4(),
                map_id: activeMapId,
                user_id: user.id,
                title: suggestion.newTopic.title,
                description: suggestion.newTopic.description,
                slug: slugify(suggestion.newTopic.title),
                type: 'core' as 'core' | 'outer',
                freshness: 'EVERGREEN',
                parent_topic_id: null
            };

            // Verified insert for merged topic
            const insertResult = await verifiedInsert(
                supabase,
                { table: 'topics', operationDescription: `create merged topic "${suggestion.newTopic.title}"` },
                newTopicData,
                '*'
            );

            if (!insertResult.success || !insertResult.data) {
                throw new Error(insertResult.error || 'Merged topic insert verification failed');
            }

            // Verified delete for old topics
            const deleteResult = await verifiedBulkDelete(
                supabase,
                { table: 'topics', operationDescription: `delete ${suggestion.topicIds.length} topics being merged` },
                { column: 'id', operator: 'in', value: suggestion.topicIds },
                suggestion.topicIds.length
            );

            if (!deleteResult.success) {
                // Rollback: delete the newly created topic
                await verifiedDelete(
                    supabase,
                    { table: 'topics', operationDescription: 'rollback merged topic' },
                    newTopicData.id
                );
                throw new Error(deleteResult.error || 'Old topics deletion verification failed');
            }

            dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: sanitizeTopicFromDb(insertResult.data) } });
            suggestion.topicIds.forEach(id => {
                dispatch({ type: 'DELETE_TOPIC', payload: { mapId: activeMapId, topicId: id } });
            });

            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'merge', visible: false } });
            dispatch({ type: 'SET_NOTIFICATION', payload: '✓ Topics merged successfully (verified).' });

        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Merge execution failed.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'executeMerge', value: false } });
        }
    }, [activeMapId, businessInfo, dispatch, state.user]);

    // --- CONTENT TOOLS HANDLERS (Task 03) ---

    const onGenerateDraft = useCallback(async (brief: ContentBrief, overrideSettings?: { provider: string, model: string }) => {
        if (!activeMapId) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: true } }); // Using generic loading key for drafting
        
        const configToUse = overrideSettings 
            ? { ...effectiveBusinessInfo, aiProvider: overrideSettings.provider as any, aiModel: overrideSettings.model }
            : effectiveBusinessInfo;

        try {
            const draft = await aiService.generateArticleDraft(brief, configToUse, dispatch);

            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // Verified update for article draft
            const updateResult = await verifiedUpdate(
                supabase,
                { table: 'content_briefs', operationDescription: `save article draft for "${brief.title}"` },
                brief.id,
                { article_draft: draft },
                'id, article_draft'
            );

            if (!updateResult.success) {
                throw new Error(updateResult.error || 'Article draft save verification failed');
            }

            // Update the brief in the state with the new draft
            const updatedBrief = { ...brief, articleDraft: draft };
            dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });

            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'drafting', visible: true } });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'contentBrief', visible: false } });

        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to generate draft.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: false } });
        }
    }, [activeMapId, effectiveBusinessInfo, businessInfo, dispatch, state.activeBriefTopic]);

    const onAuditDraft = useCallback(async (brief: ContentBrief, draft: string) => {
        if (!activeMapId) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: true } });

        // Strip base64 images to reduce token count - they can exceed context limits
        const draftForAudit = draft
            .replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+\)/g, '![image](base64-image-removed)')
            .replace(/<img[^>]*src="data:image\/[^;]+;base64,[A-Za-z0-9+/=]+"[^>]*>/g, '<img src="base64-image-removed" />');

        if (draftForAudit.length !== draft.length) {
            console.log(`[onAuditDraft] Stripped base64 images from draft. Content reduced from ${draft.length} to ${draftForAudit.length} chars`);
        }

        // Create a slimmed-down brief for the audit to stay within token limits
        // The audit prompt includes JSON.stringify(brief) which can be massive
        // Remove large fields that aren't needed for the audit
        const briefForAudit: Partial<ContentBrief> = {
            id: brief.id,
            topic_id: brief.topic_id,
            title: brief.title,
            slug: brief.slug,
            metaDescription: brief.metaDescription,
            keyTakeaways: brief.keyTakeaways?.slice(0, 5), // Limit to 5 takeaways
            targetKeyword: brief.targetKeyword,
            searchIntent: brief.searchIntent,
            // Slim down serpAnalysis - just PAA and basic info
            serpAnalysis: {
                peopleAlsoAsk: brief.serpAnalysis?.peopleAlsoAsk?.slice(0, 5) || [],
                competitorHeadings: [], // Exclude - can be huge
                avgWordCount: brief.serpAnalysis?.avgWordCount,
                query_type: brief.serpAnalysis?.query_type
            },
            // Only include essential vectors (max 20)
            contextualVectors: brief.contextualVectors?.slice(0, 20),
            // Exclude large fields:
            // - articleDraft (we're passing it separately, already stripped)
            // - structured_outline (can be huge)
            // - visual_semantics / enhanced_visual_semantics (image data)
            // - contextualBridge (can be large)
            cta: brief.cta,
            query_type_format: brief.query_type_format,
            featured_snippet_target: brief.featured_snippet_target
        };

        const briefJson = JSON.stringify(briefForAudit);
        console.log(`[onAuditDraft] Slimmed brief for audit: ${briefJson.length} chars (original would be ~${JSON.stringify(brief).length} chars)`)

        // Activity-based timeout: resets on each streaming progress event
        const INACTIVITY_TIMEOUT_MS = 90000; // 90 seconds of no activity = timeout
        let activityTimeoutId: ReturnType<typeof setTimeout> | null = null;
        let lastActivityTime = Date.now();

        const resetActivityTimeout = () => {
            if (activityTimeoutId) clearTimeout(activityTimeoutId);
            lastActivityTime = Date.now();
            activityTimeoutId = setTimeout(() => {
                const inactivityDuration = Date.now() - lastActivityTime;
                console.warn(`[onAuditDraft] Audit operation inactive for ${inactivityDuration}ms - timing out`);
                dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: false } });
                dispatch({ type: 'SET_ERROR', payload: `Audit operation timed out after ${Math.round(inactivityDuration/1000)}s of inactivity.` });
            }, INACTIVITY_TIMEOUT_MS);
        };

        resetActivityTimeout();
        const handleProgress = (_progress: StreamingProgress) => resetActivityTimeout();

        try {
            const result = await aiService.auditContentIntegrity(briefForAudit as ContentBrief, draftForAudit, effectiveBusinessInfo, dispatch, handleProgress);
            if (activityTimeoutId) clearTimeout(activityTimeoutId);
            dispatch({ type: 'SET_CONTENT_INTEGRITY_RESULT', payload: result });

            // Persist the audit result to the database with verification
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const updateResult = await verifiedUpdate(
                supabase,
                { table: 'content_briefs', operationDescription: `save content audit for "${brief.title}"` },
                brief.id,
                { content_audit: result as any },
                'id'
            );

            if (!updateResult.success) {
                console.warn('[onAuditDraft] Audit result could not be persisted:', updateResult.error);
                // Non-fatal: still show the result to user
            }

            // Update local brief state with the new audit result
            const updatedBrief = { ...brief, contentAudit: result };
            dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });

            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'integrity', visible: true } });
        } catch (e) {
            if (activityTimeoutId) clearTimeout(activityTimeoutId);
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Audit failed.' });
        } finally {
            if (activityTimeoutId) clearTimeout(activityTimeoutId);
            dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: false } });
        }
    }, [activeMapId, businessInfo, effectiveBusinessInfo, dispatch]);

    // New Auto-Fix Handler
    const handleAutoFix = useCallback(async (rule: AuditRuleResult, fullDraft: string) => {
        if (!activeMapId || !state.activeBriefTopic) return;
        if (!rule.affectedTextSnippet || !rule.remediation) {
            dispatch({ type: 'SET_ERROR', payload: "Cannot auto-fix: missing text context." });
            return;
        }

        const brief = briefs[state.activeBriefTopic.id];
        if (!brief) return;

        dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: true } }); // Use audit loading key for UI feedback
        
        try {
            const refinedSnippet = await aiService.refineDraftSection(
                rule.affectedTextSnippet,
                rule.ruleName,
                rule.remediation,
                effectiveBusinessInfo,
                dispatch
            );

            // Replace the first occurrence of the snippet
            const newDraft = fullDraft.replace(rule.affectedTextSnippet, refinedSnippet);

            // Update DB with verification
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const updateResult = await verifiedUpdate(
                supabase,
                { table: 'content_briefs', operationDescription: `save auto-fix for "${brief.title}"` },
                brief.id,
                { article_draft: newDraft },
                'id, article_draft'
            );

            if (!updateResult.success) {
                throw new Error(updateResult.error || 'Auto-fix save verification failed');
            }

            // Update State
            const updatedBrief = { ...brief, articleDraft: newDraft };
            dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });

            // Re-run audit locally to update result
            await onAuditDraft(updatedBrief, newDraft);

            dispatch({ type: 'SET_NOTIFICATION', payload: '✓ Applied fix successfully (verified).' });

        } catch(e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Auto-fix failed.' });
            dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: false } });
        }
    }, [activeMapId, state.activeBriefTopic, briefs, effectiveBusinessInfo, dispatch, businessInfo, onAuditDraft]);


    const onGenerateSchema = useCallback(async (brief: ContentBrief) => {
        dispatch({ type: 'SET_LOADING', payload: { key: 'schema', value: true } });
        try {
            // First, check if there's an existing Pass 9 schema from content generation
            if (brief.id && effectiveBusinessInfo.supabaseUrl && effectiveBusinessInfo.supabaseAnonKey) {
                const orchestrator = new ContentGenerationOrchestrator(
                    effectiveBusinessInfo.supabaseUrl,
                    effectiveBusinessInfo.supabaseAnonKey,
                    {
                        onPassStart: () => {},
                        onPassComplete: () => {},
                        onSectionStart: () => {},
                        onSectionComplete: () => {},
                        onError: () => {},
                        onJobComplete: () => {}
                    }
                );

                const latestJob = await orchestrator.getLatestJob(brief.id);

                // Case 1: Job has schema - display it
                if (latestJob?.schema_data) {
                    const schemaResult = latestJob.schema_data as EnhancedSchemaResult;
                    console.log('[onGenerateSchema] Using existing Pass 9 schema:', schemaResult.pageType);
                    dispatch({ type: 'SET_SCHEMA_RESULT', payload: schemaResult });
                    dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'schema', visible: true } });
                    dispatch({ type: 'SET_LOADING', payload: { key: 'schema', value: false } });
                    return;
                }

                // Case 2: Job exists with draft but no schema - run Pass 9
                if (latestJob?.draft_content && latestJob.status === 'completed') {
                    console.log('[onGenerateSchema] Running Pass 9 for job without schema');
                    dispatch({ type: 'SET_NOTIFICATION', payload: 'Running Pass 9 schema generation...' });

                    // Build SEO pillars from active map or defaults
                    const safePillars: SEOPillars = {
                        centralEntity: brief.targetKeyword || '',
                        sourceContext: effectiveBusinessInfo.industry || '',
                        centralSearchIntent: brief.searchIntent || 'informational'
                    };

                    // Get topic from state if available
                    const topic = state.activeBriefTopic;

                    const pass9Result = await executePass9(
                        latestJob.id,
                        brief,
                        effectiveBusinessInfo,
                        safePillars,
                        latestJob.draft_content,
                        topic || undefined,
                        latestJob.progressive_schema_data,
                        effectiveBusinessInfo.supabaseUrl,
                        effectiveBusinessInfo.supabaseAnonKey,
                        state.user?.id || '',
                        undefined,
                        (msg) => console.log('[Pass9]', msg)
                    );

                    if (pass9Result.success && pass9Result.schemaResult) {
                        console.log('[onGenerateSchema] Pass 9 completed:', pass9Result.schemaResult.pageType);
                        dispatch({ type: 'SET_SCHEMA_RESULT', payload: pass9Result.schemaResult });
                        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'schema', visible: true } });
                        dispatch({ type: 'SET_NOTIFICATION', payload: `Schema generated: ${pass9Result.schemaResult.pageType}` });
                    } else {
                        throw new Error(pass9Result.error || 'Schema generation failed');
                    }
                    dispatch({ type: 'SET_LOADING', payload: { key: 'schema', value: false } });
                    return;
                }
            }

            // No job or no draft - fall back to legacy schema generation
            console.log('[onGenerateSchema] No completed job found, using legacy generation');
            const result = await aiService.generateSchema(brief, effectiveBusinessInfo, dispatch);
            dispatch({ type: 'SET_SCHEMA_RESULT', payload: result });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'schema', visible: true } });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Schema generation failed.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'schema', value: false } });
        }
    }, [effectiveBusinessInfo, dispatch, state.activeBriefTopic, state.user?.id]);

    const handleAnalyzeGsc = useCallback(async (gscData: GscRow[]) => {
        if (!knowledgeGraph) {
             dispatch({ type: 'SET_ERROR', payload: 'Knowledge Graph is required for GSC analysis. Please run "Analyze Domain" first.' });
             return;
        }
        dispatch({ type: 'SET_LOADING', payload: { key: 'gsc', value: true } });
        try {
            const opportunities = await aiService.analyzeGscDataForOpportunities(gscData, knowledgeGraph, effectiveBusinessInfo, dispatch);
            dispatch({ type: 'SET_GSC_OPPORTUNITIES', payload: opportunities });
            saveAnalysisState('gscOpportunities', opportunities);
            // The modal stays open, the results just populate inside it
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'GSC Analysis failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'gsc', value: false } });
        }
    }, [knowledgeGraph, effectiveBusinessInfo, dispatch, saveAnalysisState]);

    const handleUpdateEavs = useCallback(async (newEavs: SemanticTriple[]) => {
        if (!activeMapId) return;

        // CRITICAL: Prevent concurrent saves that can cause hangs
        // The EAV expansion can trigger rapid successive saves which overwhelm Supabase
        const lockKey = `eavs_${activeMapId}`;
        if (saveLocks.current[lockKey]) {
            console.warn('[handleUpdateEavs] Save already in progress, queueing request...');
            // Queue the save to happen after current one completes
            // Use a simple retry mechanism with exponential backoff
            let retries = 0;
            const maxRetries = 5;
            const waitAndRetry = async (): Promise<void> => {
                while (saveLocks.current[lockKey] && retries < maxRetries) {
                    retries++;
                    const waitTime = Math.min(1000 * Math.pow(2, retries - 1), 10000); // 1s, 2s, 4s, 8s, 10s
                    console.log(`[handleUpdateEavs] Waiting ${waitTime}ms for lock to release (attempt ${retries}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
                if (!saveLocks.current[lockKey]) {
                    // Lock released, proceed with save
                    return handleUpdateEavs(newEavs);
                } else {
                    // Still locked after max retries, show error
                    console.error('[handleUpdateEavs] Save lock timeout after', retries, 'retries');
                    dispatch({ type: 'SET_ERROR', payload: 'Save operation is taking too long. Please try again.' });
                }
            };
            return waitAndRetry();
        }

        // Acquire lock
        saveLocks.current[lockKey] = true;
        console.log('[handleUpdateEavs] Lock acquired for', lockKey);

        dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true } });
        try {
            // Log the EAVs being saved for debugging
            console.log('[handleUpdateEavs] Saving EAVs:', {
                count: newEavs.length,
                firstFew: newEavs.slice(0, 3).map(e => e.subject?.label || 'unknown'),
                lastFew: newEavs.slice(-3).map(e => e.subject?.label || 'unknown'),
                totalSize: JSON.stringify(newEavs).length
            });

            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // Use verifiedUpdate for timeout protection and read-back verification
            // (same pattern as handleUpdateCompetitors)
            const result = await verifiedUpdate(
                supabase,
                { table: 'topical_maps', operationDescription: 'update EAVs (semantic triples)' },
                activeMapId,
                { eavs: newEavs as unknown as any },
                'id, eavs'
            );

            if (!result.success) {
                console.error('[handleUpdateEavs] Verification failed:', result.error);
                throw new Error(result.error || 'EAV update verification failed');
            }

            // Verify count matches what we sent
            const savedEavs = result.data?.eavs as unknown as SemanticTriple[] | undefined;
            const savedCount = Array.isArray(savedEavs) ? savedEavs.length : 0;
            console.log('[handleUpdateEavs] Verified saved count:', savedCount);

            if (savedCount !== newEavs.length) {
                console.warn('[handleUpdateEavs] MISMATCH! Sent:', newEavs.length, 'Saved:', savedCount);
                // If there's a mismatch, show a warning but still update local state with what was actually saved
                if (savedEavs) {
                    dispatch({ type: 'SET_EAVS', payload: { mapId: activeMapId, eavs: savedEavs } });
                    dispatch({ type: 'SET_NOTIFICATION', payload: `Warning: Only ${savedCount} of ${newEavs.length} EAVs were saved. Check console for details.` });
                }
            } else {
                dispatch({ type: 'SET_EAVS', payload: { mapId: activeMapId, eavs: newEavs } });
                dispatch({ type: 'SET_NOTIFICATION', payload: `${newEavs.length} Semantic Triples saved successfully (verified).` });
            }

            // Clear KG to force rebuild on next render/hook trigger
            dispatch({ type: 'SET_KNOWLEDGE_GRAPH', payload: null });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'eavManager', visible: false } });
        } catch (e) {
            console.error('[handleUpdateEavs] Error:', e);
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to update EAVs.' });
        } finally {
            // Release lock
            saveLocks.current[lockKey] = false;
            console.log('[handleUpdateEavs] Lock released for', lockKey);
            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: false } });
        }
    }, [activeMapId, businessInfo, dispatch]);

    const handleUpdateCompetitors = useCallback(async (newCompetitors: string[]) => {
        if (!activeMapId) return;

        dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true } });
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // Verified update for competitors
            const result = await verifiedUpdate(
                supabase,
                { table: 'topical_maps', operationDescription: 'update competitors list' },
                activeMapId,
                { competitors: newCompetitors },
                'id, competitors'
            );

            if (!result.success) {
                throw new Error(result.error || 'Competitors update verification failed');
            }

            dispatch({ type: 'SET_COMPETITORS', payload: { mapId: activeMapId, competitors: newCompetitors } });
            dispatch({ type: 'SET_NOTIFICATION', payload: '✓ Competitors updated successfully (verified).' });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'competitorManager', visible: false } });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to update competitors.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: false } });
        }
    }, [activeMapId, businessInfo, dispatch]);

    const handleUpdateTopic = useCallback(async (topicId: string, updates: Partial<EnrichedTopic>) => {
        console.log('[handleUpdateTopic] Called with:', { topicId, updates });

        if (!activeMapId) {
            console.warn('[handleUpdateTopic] No activeMapId, returning early');
            return;
        }
        const user = state.user;
        if (!user) {
            console.warn('[handleUpdateTopic] No user, returning early');
            return;
        }

        const loadingKey = `update_${topicId}`;
        dispatch({ type: 'SET_LOADING', payload: { key: loadingKey, value: true } });

        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // Note: Skip getSession() verification - it can hang indefinitely.
            // RLS policies will reject if not authenticated anyway.
            console.log('[handleUpdateTopic] Updating topic via RLS...');

            // List of fields that live in the `metadata` JSONB column, NOT as root columns
            // IMPORTANT: search_intent is stored in metadata, not as a direct column
            const metaFields = [
                'topic_class', 'cluster_role', 'attribute_focus', 'canonical_query', 'decay_score',
                'query_network', 'topical_border_note', 'planned_publication_date', 'url_slug_hint',
                'blueprint', 'query_type', 'search_intent'
            ];

            // Separate root-level DB columns from metadata fields
            const dbUpdates: any = {};
            const metadataUpdates: Record<string, any> = {};

            Object.entries(updates).forEach(([key, value]) => {
                if (metaFields.includes(key)) {
                    // This field belongs in metadata JSONB
                    metadataUpdates[key] = value;
                } else if (key === 'metadata') {
                    // Caller provided a full metadata object - merge it
                    Object.assign(metadataUpdates, value);
                } else {
                    // Root-level column (title, slug, description, type, etc.)
                    dbUpdates[key] = value;
                }
            });

            // If we have metadata updates, we need to fetch existing metadata and merge
            if (Object.keys(metadataUpdates).length > 0) {
                // Fetch current metadata to merge
                const { data: currentTopic, error: fetchError } = await supabase
                    .from('topics')
                    .select('metadata')
                    .eq('id', topicId)
                    .single();

                if (fetchError) throw fetchError;

                const existingMetadata = (currentTopic?.metadata as Record<string, any>) || {};
                const mergedMetadata = { ...existingMetadata, ...metadataUpdates };
                dbUpdates.metadata = mergedMetadata;

                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'TopicUpdate',
                    message: `Updating metadata for topic ${topicId}: ${JSON.stringify(metadataUpdates)}`,
                    status: 'info',
                    timestamp: Date.now()
                }});
            }

            // Only perform update if we have something to update
            if (Object.keys(dbUpdates).length > 0) {
                // Always set updated_at for tracking
                dbUpdates.updated_at = new Date().toISOString();

                console.log('[handleUpdateTopic] Sending to Supabase:', { topicId, dbUpdates });

                const updateResult = await verifiedUpdate(
                    supabase,
                    { table: 'topics', operationDescription: `update topic ${topicId}` },
                    { column: 'id', value: topicId },
                    dbUpdates,
                    '*'
                );

                console.log('[handleUpdateTopic] Verified response:', { success: updateResult.success, data: updateResult.data });

                if (!updateResult.success) {
                    console.error('[handleUpdateTopic] Update verification failed:', updateResult.error);
                    throw new Error(updateResult.error || 'Topic update verification failed. Please try refreshing the page.');
                }

                // CASCADE TYPE CHANGES TO CHILDREN
                // When a topic's type changes, its children need to be updated too
                if (updates.type) {
                    const activeMap = state.topicalMaps.find(m => m.id === activeMapId);
                    const oldTopic = activeMap?.topics?.find(t => t.id === topicId);
                    const oldType = oldTopic?.type;
                    const newType = updates.type;

                    if (oldType && oldType !== newType) {
                        console.log('[handleUpdateTopic] Type change detected:', oldType, '->', newType);

                        // Get all direct children of this topic
                        const { data: children } = await supabase
                            .from('topics')
                            .select('id, title, type')
                            .eq('parent_topic_id', topicId)
                            .eq('map_id', activeMapId);

                        if (children && children.length > 0) {
                            console.log('[handleUpdateTopic] Found', children.length, 'children to cascade');

                            // Determine new child type based on parent's new type
                            let newChildType: 'core' | 'outer' | 'child' | null = null;

                            if (newType === 'outer') {
                                // Parent became outer -> children become child
                                newChildType = 'child';
                            } else if (newType === 'core') {
                                // Parent became core -> children become outer
                                newChildType = 'outer';
                            }
                            // Note: If parent becomes 'child', children can't exist (max 3 levels)

                            if (newChildType) {
                                let successCount = 0;
                                for (const child of children) {
                                    if (child.type !== newChildType) {
                                        console.log('[handleUpdateTopic] Cascading type change for child:', child.title, '->', newChildType);
                                        const childResult = await verifiedUpdate(
                                            supabase,
                                            { table: 'topics', operationDescription: `cascade type to child "${child.title}"` },
                                            child.id,
                                            { type: newChildType, updated_at: new Date().toISOString() },
                                            'id, type'
                                        );

                                        if (!childResult.success) {
                                            console.error('[handleUpdateTopic] Failed to cascade to child:', child.title, childResult.error);
                                        } else {
                                            successCount++;
                                            // Update local state for this child too
                                            dispatch({
                                                type: 'UPDATE_TOPIC',
                                                payload: {
                                                    mapId: activeMapId,
                                                    topicId: child.id,
                                                    updates: { type: newChildType }
                                                }
                                            });
                                        }
                                    }
                                }
                                if (successCount > 0) {
                                    dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Updated ${successCount} child topic(s) to type "${newChildType}" (verified)` });
                                }
                            }
                        }
                    }
                }
            } else {
                console.warn('[handleUpdateTopic] No dbUpdates to send');
            }

            // Update local state
            console.log('[handleUpdateTopic] Updating local state');
            dispatch({
                type: 'UPDATE_TOPIC',
                payload: {
                    mapId: activeMapId,
                    topicId: topicId,
                    updates: updates
                }
            });

        } catch (e) {
            console.error('[handleUpdateTopic] Error:', e);
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to update topic.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: loadingKey, value: false } });
        }
    }, [activeMapId, businessInfo, dispatch, state.user, state.topicalMaps]);

    const handleAnalyzeFlow = useCallback(async (draft: string) => {
        if (!activeMap || !activeMap.pillars) {
             dispatch({ type: 'SET_ERROR', payload: "Missing map pillars for flow analysis." });
             return;
        }
        dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: true } });

        // Strip base64 images to reduce token count - they can exceed context limits
        const draftForFlow = draft
            .replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+\)/g, '![image](base64-image-removed)')
            .replace(/<img[^>]*src="data:image\/[^;]+;base64,[A-Za-z0-9+/=]+"[^>]*>/g, '<img src="base64-image-removed" />');

        if (draftForFlow.length !== draft.length) {
            console.log(`[handleAnalyzeFlow] Stripped base64 images. Content reduced from ${draft.length} to ${draftForFlow.length} chars`);
        }

        // Activity-based timeout: resets on each streaming progress event
        const INACTIVITY_TIMEOUT_MS = 90000; // 90 seconds of no activity = timeout
        let activityTimeoutId: ReturnType<typeof setTimeout> | null = null;
        let lastActivityTime = Date.now();

        const resetActivityTimeout = () => {
            if (activityTimeoutId) clearTimeout(activityTimeoutId);
            lastActivityTime = Date.now();
            activityTimeoutId = setTimeout(() => {
                const inactivityDuration = Date.now() - lastActivityTime;
                console.warn(`[handleAnalyzeFlow] Flow analysis inactive for ${inactivityDuration}ms - timing out`);
                dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: false } });
                dispatch({ type: 'SET_ERROR', payload: `Flow analysis timed out after ${Math.round(inactivityDuration/1000)}s of inactivity.` });
            }, INACTIVITY_TIMEOUT_MS);
        };

        resetActivityTimeout();
        const handleProgress = (_progress: StreamingProgress) => resetActivityTimeout();

        try {
            const result = await aiService.analyzeContextualFlow(
                draftForFlow,
                activeMap.pillars.centralEntity,
                effectiveBusinessInfo,
                dispatch,
                handleProgress
            );
            if (activityTimeoutId) clearTimeout(activityTimeoutId);
            dispatch({ type: 'SET_FLOW_AUDIT_RESULT', payload: result });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'flowAudit', visible: true } });
        } catch(e) {
            if (activityTimeoutId) clearTimeout(activityTimeoutId);
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Flow audit failed.' });
        } finally {
            if (activityTimeoutId) clearTimeout(activityTimeoutId);
            dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: false } });
        }
    }, [activeMap, effectiveBusinessInfo, dispatch]);

    const handleFlowAutoFix = useCallback(async (issue: ContextualFlowIssue) => {
        if (!activeMapId || !state.activeBriefTopic) return;
        if (!issue.offendingSnippet || !issue.remediation) {
            dispatch({ type: 'SET_ERROR', payload: "Cannot auto-fix: missing text context." });
            return;
        }

        const brief = briefs[state.activeBriefTopic.id];
        if (!brief || !brief.articleDraft) return;

        dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: true } });
        
        try {
            const refinedSnippet = await aiService.applyFlowRemediation(
                issue.offendingSnippet,
                issue,
                effectiveBusinessInfo,
                dispatch
            );

            // Replace the snippet in the full draft
            const newDraft = brief.articleDraft.replace(issue.offendingSnippet, refinedSnippet);

            // Update DB
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const { error } = await supabase
                .from('content_briefs')
                .update({ article_draft: newDraft })
                .eq('id', brief.id);
            
            if (error) throw error;

            // Update State
            const updatedBrief = { ...brief, articleDraft: newDraft };
            dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });

            // NOTE: Don't re-run analysis here - let the UI show "Fixed" first
            // User can re-run flow analysis manually to see updated results
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Applied flow remediation successfully. Re-run flow analysis to see updated results.' });

        } catch(e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Flow auto-fix failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: false } });
        }
    }, [activeMapId, state.activeBriefTopic, briefs, effectiveBusinessInfo, dispatch, businessInfo, handleAnalyzeFlow]);

    const handleBatchFlowAutoFix = useCallback(async (issues: ContextualFlowIssue[]) => {
        if (!activeMapId || !state.activeBriefTopic) return;
        const brief = briefs[state.activeBriefTopic.id];
        if (!brief || !brief.articleDraft) return;

        if (issues.length === 0) return;

        dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: true } });

        try {
            const newDraft = await aiService.applyBatchFlowRemediation(
                brief.articleDraft,
                issues,
                effectiveBusinessInfo,
                dispatch
            );

            // Update DB
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const { error } = await supabase
                .from('content_briefs')
                .update({ article_draft: newDraft })
                .eq('id', brief.id);

            if (error) throw error;

            // Update State
            const updatedBrief = { ...brief, articleDraft: newDraft };
            dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });

            // NOTE: Don't re-run analysis here - let the UI show "Fixed" first
            // User can re-run flow analysis manually to see updated results
            dispatch({ type: 'SET_NOTIFICATION', payload: `Batch fixed ${issues.length} flow issues. Re-run flow analysis to see updated results.` });

        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Batch flow auto-fix failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: false } });
        }
    }, [activeMapId, state.activeBriefTopic, briefs, effectiveBusinessInfo, dispatch, businessInfo, handleAnalyzeFlow]);


    const handleExportData = async (format: 'csv' | 'xlsx' | 'zip') => {
        if (!activeMap) return;

        if (format === 'csv') {
            // Quick CSV export - use simple export
            dispatch({ type: 'SET_LOADING', payload: { key: 'export', value: true } });
            try {
                const filename = `${activeProject?.project_name || 'Project'}_${activeMap.name}_HolisticMap`;
                generateMasterExport({
                    topics: allTopics,
                    briefs: briefs,
                    pillars: activeMap.pillars as SEOPillars,
                    metrics: state.validationResult
                }, 'csv', filename);
                dispatch({ type: 'SET_NOTIFICATION', payload: 'Export generated successfully.' });
            } catch (e) {
                dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Export failed.' });
            } finally {
                dispatch({ type: 'SET_LOADING', payload: { key: 'export', value: false } });
            }
        } else {
            // For xlsx/zip, show settings modal for enhanced export
            setShowExportSettings(true);
        }
    };

    const handleEnhancedExport = async (settings: ExportSettings) => {
        if (!activeMap) return;
        setShowExportSettings(false);

        dispatch({ type: 'SET_LOADING', payload: { key: 'export', value: true } });
        try {
            // Get foundation pages, NAP data, navigation, and brand kit for comprehensive export
            const currentFoundationPages = state.websiteStructure?.foundationPages || [];
            const currentNapData = currentFoundationPages.find(p => p.nap_data)?.nap_data || undefined;
            const currentNavigation = state.websiteStructure?.navigation || null;
            const currentBrandKit = (activeMap.business_info as any)?.brandKit || undefined;

            const input: EnhancedExportInput = {
                topics: allTopics,
                briefs: briefs,
                pillars: activeMap.pillars,
                eavs: activeMap.eavs,
                competitors: activeMap.competitors,
                metrics: state.validationResult,
                businessInfo: effectiveBusinessInfo,
                mapName: activeMap.name,
                projectName: activeProject?.project_name,
                // NEW: Additional data for comprehensive export
                foundationPages: currentFoundationPages,
                napData: currentNapData,
                navigation: currentNavigation,
                brandKit: currentBrandKit
            };

            const filename = `${activeProject?.project_name || 'project'}_${activeMap.name || 'map'}_${new Date().toISOString().split('T')[0]}`;

            await generateEnhancedExport(input, settings, filename);

            dispatch({ type: 'SET_NOTIFICATION', payload: 'Enhanced export generated successfully.' });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Export failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'export', value: false } });
        }
    };

    // --- MIGRATION MODE HANDLERS ---
    const handleSwitchToMigration = useCallback(() => {
        dispatch({ type: 'SET_VIEW_MODE', payload: 'MIGRATION' });
    }, [dispatch]);

    const handleSwitchToCreation = useCallback(() => {
        dispatch({ type: 'SET_VIEW_MODE', payload: 'CREATION' });
    }, [dispatch]);

    const handleQuickAudit = useCallback(async (url: string) => {
        if (!activeMapId) return;

        const apiKey = effectiveBusinessInfo.firecrawlApiKey;
        if (!apiKey) {
            dispatch({ type: 'SET_ERROR', payload: 'Firecrawl API key is required for Quick Audit. Please configure it in Settings.' });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'quickAudit', value: true } });
        try {
            // Scrape the URL content using Firecrawl
            const scrapeResult = await aiService.scrapeUrl(url, apiKey);
            if (!scrapeResult || !scrapeResult.markdown) {
                throw new Error('Failed to scrape URL content.');
            }

            // Create a transient brief from the scraped content
            const transientBrief: Partial<ContentBrief> & { id: string; topic_id: string; title: string; articleDraft: string } = {
                id: `transient_${uuidv4()}`,
                topic_id: 'transient',
                title: scrapeResult.title || 'Quick Audit',
                slug: '',
                metaDescription: '',
                keyTakeaways: [],
                outline: '',
                serpAnalysis: { peopleAlsoAsk: [], competitorHeadings: [] },
                visuals: { featuredImagePrompt: '', imageAltText: '' },
                contextualVectors: [],
                contextualBridge: [],
                articleDraft: scrapeResult.markdown
            };

            // Set the result in state and open the content brief modal
            dispatch({ type: 'SET_ACTIVE_BRIEF_TOPIC', payload: { id: 'transient', title: 'Quick Audit' } as EnrichedTopic });
            dispatch({ type: 'SET_BRIEF_GENERATION_RESULT', payload: transientBrief as ContentBrief });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'contentBrief', visible: true } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Quick audit content loaded. You can now run audits on this content.' });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Quick audit failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'quickAudit', value: false } });
        }
    }, [activeMapId, effectiveBusinessInfo.firecrawlApiKey, dispatch]);

    // ===========================================
    // Foundation Pages Handlers
    // ===========================================

    // Get foundation pages from state
    const foundationPages = useMemo(() => state.websiteStructure?.foundationPages || [], [state.websiteStructure?.foundationPages]);
    const napData = useMemo(() => {
        // Get NAP data from the first foundation page that has it, or undefined
        const pageWithNap = foundationPages.find(p => p.nap_data);
        return pageWithNap?.nap_data;
    }, [foundationPages]);

    // Get navigation structure from state
    const navigation = useMemo(() => state.websiteStructure?.navigation || null, [state.websiteStructure?.navigation]);

    // Load foundation pages and navigation when map changes
    useEffect(() => {
        const loadFoundationPagesAndNavigation = async () => {
            if (!activeMapId) return;

            // Clear existing data first to prevent showing stale data from previous map
            dispatch({ type: 'SET_FOUNDATION_PAGES', payload: [] });
            dispatch({ type: 'SET_NAVIGATION', payload: null });

            try {
                // Load foundation pages for this specific map
                const pages = await foundationPagesService.loadFoundationPages(activeMapId);
                dispatch({ type: 'SET_FOUNDATION_PAGES', payload: pages });

                // Load navigation structure for this specific map
                const nav = await foundationPagesService.loadNavigationStructure(activeMapId);
                dispatch({ type: 'SET_NAVIGATION', payload: nav });
            } catch (error) {
                console.error('Failed to load foundation pages/navigation:', error);
            }
        };
        loadFoundationPagesAndNavigation();
    }, [activeMapId, dispatch]);

    const handleSaveNAPData = useCallback(async (newNapData: NAPData) => {
        if (!activeMapId || !state.user?.id) {
            dispatch({ type: 'SET_ERROR', payload: 'Cannot save NAP data: missing map or user session.' });
            return;
        }

        // If no foundation pages exist yet, store NAP data in map's business_info temporarily
        if (foundationPages.length === 0) {
            try {
                const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
                const currentBusinessInfo = activeMap?.business_info || {};
                const updatedBusinessInfo = {
                    ...currentBusinessInfo,
                    napData: newNapData,
                };

                const { error } = await supabase
                    .from('topical_maps')
                    .update({ business_info: updatedBusinessInfo as any })
                    .eq('id', activeMapId);

                if (error) throw error;

                // Update local state
                dispatch({ type: 'UPDATE_MAP_DATA', payload: { mapId: activeMapId, data: { business_info: updatedBusinessInfo } } });
                dispatch({ type: 'SET_NOTIFICATION', payload: 'NAP data saved. Generate foundation pages to apply it.' });
            } catch (error) {
                dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to save NAP data.' });
            }
            return;
        }

        // Update NAP data on all foundation pages
        const updatedPages = foundationPages.map(page => ({
            ...page,
            nap_data: newNapData
        }));

        try {
            await foundationPagesService.saveFoundationPages(
                activeMapId,
                state.user.id,
                updatedPages,
                effectiveBusinessInfo.supabaseUrl,
                effectiveBusinessInfo.supabaseAnonKey
            );
            dispatch({ type: 'SET_FOUNDATION_PAGES', payload: updatedPages });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'NAP data saved successfully.' });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to save NAP data.' });
        }
    }, [activeMapId, state.user?.id, foundationPages, effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey, dispatch, activeMap?.business_info]);

    const handleUpdateFoundationPage = useCallback(async (pageId: string, updates: Partial<FoundationPage>) => {
        try {
            const updatedPage = await foundationPagesService.updateFoundationPage(pageId, updates);
            dispatch({ type: 'UPDATE_FOUNDATION_PAGE', payload: { pageId, updates: updatedPage } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Foundation page updated.' });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update foundation page.' });
        }
    }, [dispatch]);

    const handleDeleteFoundationPage = useCallback(async (pageId: string) => {
        try {
            await foundationPagesService.deleteFoundationPage(pageId, 'user_deleted');
            dispatch({ type: 'DELETE_FOUNDATION_PAGE', payload: { pageId } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Foundation page deleted.' });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete foundation page.' });
        }
    }, [dispatch]);

    const handleRestoreFoundationPage = useCallback(async (pageId: string) => {
        try {
            const restoredPage = await foundationPagesService.restoreFoundationPage(pageId);
            dispatch({ type: 'UPDATE_FOUNDATION_PAGE', payload: { pageId, updates: restoredPage } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Foundation page restored.' });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to restore foundation page.' });
        }
    }, [dispatch]);

    // Save navigation structure
    const handleSaveNavigation = useCallback(async (updatedNavigation: NavigationStructure) => {
        if (!activeMapId || !state.user?.id) {
            dispatch({ type: 'SET_ERROR', payload: 'Cannot save navigation: missing map or user.' });
            return;
        }

        try {
            const savedNavigation = await foundationPagesService.saveNavigationStructure(
                activeMapId,
                state.user.id,
                updatedNavigation
            );
            dispatch({ type: 'SET_NAVIGATION', payload: savedNavigation });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Navigation saved successfully.' });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to save navigation.' });
        }
    }, [activeMapId, state.user?.id, dispatch]);

    // Business Info save handler
    const handleSaveBusinessInfo = useCallback(async (updates: Partial<BusinessInfo>) => {
        if (!activeMapId) {
            dispatch({ type: 'SET_ERROR', payload: 'Cannot save business info: no active map.' });
            return;
        }

        try {
            const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);

            // Merge updates with existing business info
            const updatedBusinessInfo = { ...effectiveBusinessInfo, ...updates };

            const { error } = await supabase
                .from('topical_maps')
                .update({ business_info: updatedBusinessInfo as any })
                .eq('id', activeMapId);

            if (error) throw error;

            // Update local state
            dispatch({
                type: 'UPDATE_MAP_DATA',
                payload: { mapId: activeMapId, data: { business_info: updatedBusinessInfo } }
            });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Business info saved successfully.' });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to save business info.' });
        }
    }, [activeMapId, effectiveBusinessInfo, dispatch]);

    // Brand Kit save handler (saves via business info)
    const handleSaveBrandKit = useCallback(async (brandKit: any) => {
        await handleSaveBusinessInfo({ brandKit });
    }, [handleSaveBusinessInfo]);

    const handleGenerateMissingFoundationPages = useCallback(async () => {
        console.log('=== handleGenerateMissingFoundationPages START ===');
        if (!activeMapId || !state.user?.id || !activeMap?.pillars) {
            console.error('Missing required data:', { activeMapId, userId: state.user?.id, pillars: !!activeMap?.pillars });
            dispatch({ type: 'SET_ERROR', payload: 'Cannot generate foundation pages: missing map, user, or pillars.' });
            return;
        }

        // Determine which page types are missing (active pages only, not deleted ones)
        const REQUIRED_PAGES: FoundationPageType[] = ['homepage', 'about', 'contact', 'privacy', 'terms'];
        const existingActivePageTypes = foundationPages
            .filter(p => !p.deleted_at)
            .map(p => p.page_type);
        const missingPageTypes = REQUIRED_PAGES.filter(pt => !existingActivePageTypes.includes(pt));

        console.log('Existing page types:', existingActivePageTypes);
        console.log('Missing page types:', missingPageTypes);

        if (missingPageTypes.length === 0) {
            dispatch({ type: 'SET_NOTIFICATION', payload: 'All required foundation pages already exist.' });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'foundationPages', value: true } });
        try {
            console.log('Generating missing pages with AI...');
            // Generate ONLY the missing page types
            const result = await foundationPagesService.generateFoundationPages(
                effectiveBusinessInfo,
                activeMap.pillars as SEOPillars,
                dispatch,
                missingPageTypes // Pass only missing page types
            );
            console.log('AI generation result:', result);

            console.log('Preparing pages for save...');
            const pagesToSave = foundationPagesService.prepareFoundationPagesForSave(
                result,
                activeMapId,
                state.user.id,
                napData
            );
            console.log('Pages to save:', pagesToSave.length);

            console.log('Saving to database...');
            const savedPages = await foundationPagesService.saveFoundationPages(
                activeMapId,
                state.user.id,
                pagesToSave,
                effectiveBusinessInfo.supabaseUrl,
                effectiveBusinessInfo.supabaseAnonKey
            );
            console.log('Saved pages:', savedPages.length);

            // MERGE new pages with existing pages instead of replacing
            const existingPageIds = foundationPages.map(p => p.id);
            const newPages = savedPages.filter(p => !existingPageIds.includes(p.id));
            const updatedPages = foundationPages.map(existingPage => {
                const updated = savedPages.find(p => p.id === existingPage.id);
                return updated || existingPage;
            });
            const mergedPages = [...updatedPages, ...newPages];
            console.log('Merged pages total:', mergedPages.length);

            dispatch({ type: 'SET_FOUNDATION_PAGES', payload: mergedPages });
            dispatch({ type: 'SET_NOTIFICATION', payload: `Generated ${savedPages.length} missing foundation pages.` });
            console.log('=== handleGenerateMissingFoundationPages SUCCESS ===');
        } catch (error) {
            console.error('Error generating missing pages:', error);
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to generate foundation pages.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'foundationPages', value: false } });
        }
    }, [activeMapId, state.user?.id, activeMap?.pillars, effectiveBusinessInfo, napData, foundationPages, dispatch]);

    // Repair foundation pages from validation modal
    const handleRepairFoundation = useCallback(async (missingPageTypes: FoundationPageType[]) => {
        if (!activeMapId || !state.user?.id || !activeMap?.pillars) {
            dispatch({ type: 'SET_ERROR', payload: 'Cannot repair foundation pages: missing map, user, or pillars.' });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'repairFoundation', value: true } });
        try {
            // Generate only the missing pages
            const result = await foundationPagesService.generateFoundationPages(
                effectiveBusinessInfo,
                activeMap.pillars as SEOPillars,
                dispatch
            );

            // Filter to only the missing page types
            const filteredResult = {
                ...result,
                foundationPages: result.foundationPages.filter(p => missingPageTypes.includes(p.page_type))
            };

            if (filteredResult.foundationPages.length === 0) {
                dispatch({ type: 'SET_NOTIFICATION', payload: 'All foundation pages already exist.' });
                return;
            }

            const pagesToSave = foundationPagesService.prepareFoundationPagesForSave(
                filteredResult,
                activeMapId,
                state.user.id,
                napData
            );

            const savedPages = await foundationPagesService.saveFoundationPages(
                activeMapId,
                state.user.id,
                pagesToSave,
                effectiveBusinessInfo.supabaseUrl,
                effectiveBusinessInfo.supabaseAnonKey
            );

            // Merge with existing pages
            const existingPages = state.websiteStructure?.foundationPages || [];
            const allPages = [...existingPages, ...savedPages];
            dispatch({ type: 'SET_FOUNDATION_PAGES', payload: allPages });
            dispatch({ type: 'SET_NOTIFICATION', payload: `Generated ${savedPages.length} missing foundation page${savedPages.length > 1 ? 's' : ''}.` });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to repair foundation pages.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'repairFoundation', value: false } });
        }
    }, [activeMapId, state.user?.id, activeMap?.pillars, effectiveBusinessInfo, napData, state.websiteStructure?.foundationPages, dispatch]);

    // Repair/regenerate navigation structure
    const handleRepairNavigation = useCallback(async () => {
        if (!activeMapId || !state.user?.id) {
            dispatch({ type: 'SET_ERROR', payload: 'Cannot repair navigation: missing map or user.' });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'repairNavigation', value: true } });
        try {
            const currentFoundationPages = state.websiteStructure?.foundationPages || [];

            // Generate new navigation structure
            const navigation = await foundationPagesService.generateDefaultNavigation(
                currentFoundationPages,
                allTopics,
                effectiveBusinessInfo,
                dispatch
            );

            // Save the navigation
            const savedNavigation = await foundationPagesService.saveNavigationStructure(
                activeMapId,
                state.user.id,
                navigation
            );

            dispatch({ type: 'SET_NAVIGATION', payload: savedNavigation });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Navigation structure regenerated.' });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to repair navigation.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'repairNavigation', value: false } });
        }
    }, [activeMapId, state.user?.id, state.websiteStructure?.foundationPages, allTopics, effectiveBusinessInfo, dispatch]);

    // Repair malformed briefs in the current map
    const handleRepairBriefs = useCallback(async () => {
        if (!activeMapId) {
            return { repaired: 0, skipped: 0, errors: ['No active map'] };
        }

        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
        const result = await repairBriefsInMap(supabase, activeMapId);

        if (result.repaired > 0) {
            dispatch({ type: 'SET_NOTIFICATION', payload: `Repaired ${result.repaired} brief(s). Reload the page to see changes.` });
        }

        return result;
    }, [activeMapId, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, dispatch]);

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
                onRegenerateFailed={(topicIds) => {
                    // Filter to topics that need regeneration and trigger batch
                    const topicsToRegenerate = allTopics.filter(t => topicIds.includes(t.id));
                    if (topicsToRegenerate.length > 0) {
                        const processor = new BatchProcessor(dispatch, () => stateRef.current);
                        processor.generateAllBriefs(topicsToRegenerate).then(() => {
                            setShowBulkSummary(true);
                        });
                    }
                }}
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
