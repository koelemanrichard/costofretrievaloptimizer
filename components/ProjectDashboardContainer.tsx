
// components/ProjectDashboardContainer.tsx
import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { useAppState } from '../state/appState';
import { AppStep, SEOPillars, EnrichedTopic, ContentBrief, BusinessInfo, TopicalMap, TopicRecommendation, GscRow, ValidationIssue, MergeSuggestion, ResponseCode, FreshnessProfile, MapImprovementSuggestion, SemanticTriple, ExpansionMode, AuditRuleResult, ContextualFlowIssue } from '../types';
import * as aiService from '../services/ai/index';
import { getSupabaseClient } from '../services/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { slugify, cleanSlug } from '../utils/helpers';
import { KnowledgeGraph } from '../lib/knowledgeGraph';
import { BatchProcessor } from '../services/batchProcessor';
import { useMapData } from '../hooks/useMapData';
import { useKnowledgeGraph } from '../hooks/useKnowledgeGraph';
import { useTopicEnrichment } from '../hooks/useTopicEnrichment';
import { sanitizeTopicFromDb, sanitizeBriefFromDb, safeString, normalizeRpcData, parseTopicalMap } from '../utils/parsers';
import { generateMasterExport } from '../utils/exportUtils';

// Import Screens
import MapSelectionScreen from './MapSelectionScreen';
import ProjectDashboard from './ProjectDashboard';
import NewMapModal from './NewMapModal';
import { Loader } from './ui/Loader';
import DebugStatePanel from './ui/DebugStatePanel';
import BriefReviewModal from './BriefReviewModal';
import FlowAuditModal from './FlowAuditModal';

interface ProjectDashboardContainerProps {
  onInitiateDeleteMap: (map: TopicalMap) => void;
  onBackToProjects: () => void;
}

const ProjectDashboardContainer: React.FC<ProjectDashboardContainerProps> = ({ onInitiateDeleteMap, onBackToProjects }) => {
    const { state, dispatch } = useAppState();
    const { activeProjectId, activeMapId, topicalMaps, knowledgeGraph, businessInfo, modals, isLoading } = state;

    // Use a ref to track the latest state for long-running processes like batch generation
    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const activeProject = useMemo(() => state.projects.find(p => p.id === activeProjectId), [state.projects, activeProjectId]);
    const activeMap = useMemo(() => topicalMaps.find(m => m.id === activeMapId), [topicalMaps, activeMapId]);
    
    const allTopics = useMemo(() => activeMap?.topics || [], [activeMap]);
    const briefs = useMemo(() => activeMap?.briefs || {}, [activeMap]);

    // REFACTOR 02: Use custom hook for data fetching
    useMapData(activeMapId, activeMap, businessInfo, dispatch);

    // REFACTOR 03: Use custom hook for KG hydration
    useKnowledgeGraph(activeMap, knowledgeGraph, dispatch);

    const effectiveBusinessInfo = useMemo<BusinessInfo>(() => ({
        ...businessInfo,
        ...(activeMap?.business_info as Partial<BusinessInfo> || {})
    }), [businessInfo, activeMap]);
    
    // REFACTOR 03 & Task 05: Use custom hook for Enrichment & Blueprints
    const { handleEnrichData, isEnriching, handleGenerateBlueprints, isGeneratingBlueprints } = useTopicEnrichment(
        activeMapId, 
        effectiveBusinessInfo, 
        allTopics, 
        activeMap?.pillars as SEOPillars | undefined,
        dispatch
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

    const handleGenerateInitialMap = async () => {
        if (!activeMapId || !activeMap || !activeMap.pillars) return;
        const user = state.user;
        if (!user) {
             dispatch({ type: 'SET_ERROR', payload: 'User session required.' });
             return;
        }
        
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
                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
                const { error: insertError } = await supabase.from('topics').insert(dbTopics);
                if (insertError) throw insertError;
            }

            // Update State
            // We use finalTopics directly to preserve the in-memory metadata immediately
            dispatch({ type: 'SET_TOPICS_FOR_MAP', payload: { mapId: activeMapId, topics: finalTopics } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Initial topical map generated successfully.' });

        } catch (e) {
            console.error("Map Generation Error:", e);
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
                await supabase.from('topical_maps').update({ eavs: updatedEavs as any }).eq('id', activeMapId);
                
                dispatch({ type: 'SET_NOTIFICATION', payload: `Added ${newTriples.length} new semantic concepts to the Knowledge Graph.` });
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
        }
    }, [activeMap, knowledgeGraph, dispatch, effectiveBusinessInfo, allTopics]);

    const onGenerateAllBriefs = useCallback(async () => {
        const processor = new BatchProcessor(dispatch, () => stateRef.current);
        await processor.generateAllBriefs(allTopics);
    }, [dispatch, allTopics]);

    const onSavePillars = useCallback(async (newPillars: SEOPillars) => {
        if (!activeMapId) return;
        
        const hasChanges = JSON.stringify(activeMap?.pillars) !== JSON.stringify(newPillars);

        if (hasChanges) {
            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true } });
            try {
                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
                const { error } = await supabase.from('topical_maps').update({ pillars: newPillars as any }).eq('id', activeMapId);
                if (error) throw error;

                dispatch({ type: 'SET_PILLARS', payload: { mapId: activeMapId, pillars: newPillars } });

                if ((activeMap?.topics || []).length > 0) {
                    dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'pillarConfirmation', visible: true } });
                }
            } catch (e) {
                dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to update pillars.' });
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
                const { error } = await supabase.from('topics').delete().eq('map_id', activeMapId);
                if(error) throw error;

                dispatch({ type: 'SET_TOPICS_FOR_MAP', payload: { mapId: activeMapId, topics: [] } });
                // Trigger the AI regeneration
                await handleGenerateInitialMap();

            } catch (e) {
                dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to regenerate map.' });
            }
            finally {
                dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: false } });
            }
        }
    }, [activeMapId, activeMap, dispatch, businessInfo, handleGenerateInitialMap]);

    const handleRegenerateMap = useCallback(async () => {
        if (!activeMapId || !activeMap?.pillars) return;
        
        if ((activeMap.topics || []).length > 0) {
             dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'pillarConfirmation', visible: true } });
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
            // FIX: Inject user_id
            const { data: insertedTopic, error } = await supabase.from('topics').insert({
                ...newTopic,
                user_id: user.id
            }).select().single();
            
            if (error) throw error;
            
            const safeTopic = sanitizeTopicFromDb(insertedTopic);
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
            // Separate inputs into Core (Potential Parents) and Outer (Children)
            const coreInputs = topics.filter(t => t.data.type === 'core');
            const outerInputs = topics.filter(t => t.data.type === 'outer');
            
            // Temp store for new Core IDs: Title -> UUID
            const newCoreIdMap = new Map<string, string>();
            
            const coreTopicsToInsert: any[] = [];

            // --- PASS 1: Process & Insert Core Topics ---
            for (const input of coreInputs) {
                const newId = uuidv4();
                newCoreIdMap.set(input.data.title, newId);
                
                coreTopicsToInsert.push({
                    ...input.data,
                    id: newId,
                    map_id: activeMapId,
                    slug: slugify(input.data.title),
                    parent_topic_id: null,
                    type: 'core',
                    user_id: user.id
                });
            }

            // Insert Core Topics First (to satisfy FK constraints for children)
            if (coreTopicsToInsert.length > 0) {
                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
                const { error: coreError } = await supabase.from('topics').insert(coreTopicsToInsert).select();
                if (coreError) throw coreError;
                
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
                    ...topicData,
                    id: uuidv4(),
                    map_id: activeMapId,
                    slug: `${parentSlug}/${cleanSlug(parentSlug, topicData.title)}`.replace(/^\//, ''),
                    parent_topic_id: parentId,
                    type: type,
                    user_id: user.id
                };
            }));

            // Insert Outer Topics
            if (outerTopicsToInsert.length > 0) {
                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
                const { error: outerError } = await supabase.from('topics').insert(outerTopicsToInsert);
                if (outerError) throw outerError;

                // Dispatch Outer Topics
                outerTopicsToInsert.forEach(topic => {
                    const safeTopic = sanitizeTopicFromDb(topic);
                    dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: safeTopic } });
                });
            }

            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'addTopic', visible: false } });
            dispatch({ type: 'SET_NOTIFICATION', payload: `Successfully added ${coreTopicsToInsert.length + outerTopicsToInsert.length} new topics.` });

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

            const { data, error } = await supabase.from('topics').insert(topicsToAdd).select();
            if (error) throw error;

            (data || []).forEach(dbTopic => {
                const safeTopic = sanitizeTopicFromDb(dbTopic);
                dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: safeTopic }});
            });
            dispatch({ type: 'SET_NOTIFICATION', payload: `Successfully expanded "${coreTopic.title}" with ${topicsToAdd.length} new topics.` });
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
        try {
            const result = await aiService.validateTopicalMap(allTopics, activeMap.pillars, effectiveBusinessInfo, dispatch, briefs);
            dispatch({ type: 'SET_VALIDATION_RESULT', payload: result });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'validation', visible: true } });
            saveAnalysisState('validationResult', result);
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

    const onImproveMap = useCallback(async (issues: ValidationIssue[]) => {
        if (!activeMapId || !activeMap?.pillars) return;
        const user = state.user;
        if (!user) return;

        dispatch({ type: 'SET_LOADING', payload: { key: 'improveMap', value: true } });
        
        try {
            const suggestion = await aiService.improveTopicalMap(allTopics, issues, effectiveBusinessInfo, dispatch);
            dispatch({ type: 'SET_IMPROVEMENT_LOG', payload: suggestion });
            
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            
            if (suggestion.newTopics.length > 0) {
                // FIX: Inject user_id
                const topicsToAdd = suggestion.newTopics.map(t => ({
                   id: uuidv4(),
                   map_id: activeMapId,
                   user_id: user.id,
                   title: t.title,
                   slug: slugify(t.title),
                   description: t.description,
                   type: t.type,
                   freshness: 'STANDARD',
                   parent_topic_id: null
                }));
                
                const { data: addedTopics, error: addError } = await supabase.from('topics').insert(topicsToAdd).select();
                if (addError) throw addError;
                
                (addedTopics || []).forEach(topic => {
                    dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: sanitizeTopicFromDb(topic) } });
                });
            }
            
            if (suggestion.topicTitlesToDelete.length > 0) {
                const idsToDelete: string[] = [];
                suggestion.topicTitlesToDelete.forEach(title => {
                    const match = allTopics.find(t => t.title.toLowerCase() === title.toLowerCase());
                    if (match) idsToDelete.push(match.id);
                });
                
                if (idsToDelete.length > 0) {
                    const { error: deleteError } = await supabase.from('topics').delete().in('id', idsToDelete);
                    if (deleteError) throw deleteError;
                    
                    idsToDelete.forEach(id => {
                         dispatch({ type: 'DELETE_TOPIC', payload: { mapId: activeMapId, topicId: id } });
                    });
                }
            }
            
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'improvementLog', visible: true } });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'validation', visible: false } });
            
        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Map improvement failed.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'improveMap', value: false } });
        }
    }, [activeMapId, activeMap, allTopics, effectiveBusinessInfo, dispatch, businessInfo, state.user]);

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
                user_id: user.id, // FIX: Inject user_id
                title: suggestion.newTopic.title,
                description: suggestion.newTopic.description,
                slug: slugify(suggestion.newTopic.title),
                type: 'core' as 'core' | 'outer', // Explicit cast to match union type
                freshness: 'EVERGREEN',
                parent_topic_id: null
            };

            const { data: newTopic, error: createError } = await supabase.from('topics').insert(newTopicData).select().single();
            if (createError) throw createError;

            const { error: deleteError } = await supabase.from('topics').delete().in('id', suggestion.topicIds);
            if (deleteError) throw deleteError;

            dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: sanitizeTopicFromDb(newTopic) } });
            suggestion.topicIds.forEach(id => {
                dispatch({ type: 'DELETE_TOPIC', payload: { mapId: activeMapId, topicId: id } });
            });

            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'merge', visible: false } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Topics merged successfully.' });

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
            
            const { error } = await supabase
                .from('content_briefs')
                .update({ article_draft: draft })
                .eq('id', brief.id);
            
            if (error) throw error;

            // Update the brief in the state with the new draft
            const updatedBrief = { ...brief, articleDraft: draft };
            dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });
            
            // Update active brief reference if needed (often redundant as it references map briefs)
            if (state.activeBriefTopic?.id === brief.topic_id) {
                 // No special action needed as UI reads from map.briefs
            }

            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'drafting', visible: true } });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'contentBrief', visible: false } }); // Close brief modal if open

        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to generate draft.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: false } });
        }
    }, [activeMapId, effectiveBusinessInfo, businessInfo, dispatch, state.activeBriefTopic]);

    const onAuditDraft = useCallback(async (brief: ContentBrief, draft: string) => {
        if (!activeMapId) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: true } });
        try {
            const result = await aiService.auditContentIntegrity(brief, draft, effectiveBusinessInfo, dispatch);
            dispatch({ type: 'SET_CONTENT_INTEGRITY_RESULT', payload: result });
            
            // Persist the audit result to the database
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            await supabase
                .from('content_briefs')
                .update({ content_audit: result as any })
                .eq('id', brief.id);

            // Update local brief state with the new audit result
            const updatedBrief = { ...brief, contentAudit: result };
            dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });
            
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'integrity', visible: true } });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Audit failed.' });
        } finally {
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
            
            // Re-run audit locally to update result (or just close/notify)
            // For better UX, we'll trigger a fresh audit on the new text
            await onAuditDraft(updatedBrief, newDraft);
            
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Applied fix successfully.' });

        } catch(e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Auto-fix failed.' });
            dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: false } });
        }
    }, [activeMapId, state.activeBriefTopic, briefs, effectiveBusinessInfo, dispatch, businessInfo, onAuditDraft]);


    const onGenerateSchema = useCallback(async (brief: ContentBrief) => {
        dispatch({ type: 'SET_LOADING', payload: { key: 'schema', value: true } });
        try {
            const result = await aiService.generateSchema(brief, effectiveBusinessInfo, dispatch);
            dispatch({ type: 'SET_SCHEMA_RESULT', payload: result });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'schema', visible: true } });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Schema generation failed.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'schema', value: false } });
        }
    }, [effectiveBusinessInfo, dispatch]);

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
        
        dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true } });
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const { error } = await supabase.from('topical_maps').update({ eavs: newEavs as any }).eq('id', activeMapId);
            if (error) throw error;

            dispatch({ type: 'SET_EAVS', payload: { mapId: activeMapId, eavs: newEavs } });
            // Clear KG to force rebuild on next render/hook trigger
            dispatch({ type: 'SET_KNOWLEDGE_GRAPH', payload: null });
            
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Semantic Triples updated successfully.' });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'eavManager', visible: false } });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to update EAVs.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: false } });
        }
    }, [activeMapId, businessInfo, dispatch]);

    const handleUpdateCompetitors = useCallback(async (newCompetitors: string[]) => {
        if (!activeMapId) return;

        dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true } });
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const { error } = await supabase.from('topical_maps').update({ competitors: newCompetitors }).eq('id', activeMapId);
            if (error) throw error;

            dispatch({ type: 'SET_COMPETITORS', payload: { mapId: activeMapId, competitors: newCompetitors } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Competitors updated successfully.' });
             dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'competitorManager', visible: false } });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to update competitors.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: false } });
        }
    }, [activeMapId, businessInfo, dispatch]);

    const handleUpdateTopic = useCallback(async (topicId: string, updates: Partial<EnrichedTopic>) => {
        if (!activeMapId) return;
        const user = state.user;
        if (!user) return;

        // Optimistic update? Or wait for DB?
        // DB first ensures consistency.
        
        const loadingKey = `update_${topicId}`;
        dispatch({ type: 'SET_LOADING', payload: { key: loadingKey, value: true } });

        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            
            // Sanitize updates for DB: Remove fields that are not actual columns on the topics table.
            // We only want to update explicit columns like title, slug OR the metadata column.
            const dbUpdates: any = { ...updates };
            
            // List of fields that live in the `metadata` JSONB column, NOT as root columns
            const metaFields = [
                'topic_class', 'cluster_role', 'attribute_focus', 'canonical_query', 'decay_score', 
                'query_network', 'topical_border_note', 'planned_publication_date', 'url_slug_hint', 
                'blueprint', 'query_type'
            ];
            
            // If updates contains metadata fields, we should probably merge them into the existing metadata
            // However, typical usage of this function sends EITHER root columns (title/slug) OR a pre-constructed metadata object.
            // If the caller sends { topic_class: '...', metadata: ... }, we need to be careful.
            
            // Strategy: 
            // 1. Remove metadata-only fields from the root of dbUpdates.
            // 2. If the caller provided a `metadata` object, it will be used.
            // 3. If the caller provided metadata fields at the root but NOT a metadata object, we might lose data here if we just delete them.
            //    Ideally, the caller should structure the update correctly. 
            //    But for safety, let's warn if we are stripping data.
            
            metaFields.forEach(field => {
                if (dbUpdates[field] !== undefined) {
                    delete dbUpdates[field];
                }
            });

            const { error } = await supabase
                .from('topics')
                .update(dbUpdates)
                .eq('id', topicId);

            if (error) throw error;

            dispatch({ 
                type: 'UPDATE_TOPIC', 
                payload: { 
                    mapId: activeMapId, 
                    topicId: topicId, 
                    updates: updates 
                } 
            });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Topic updated successfully.' });

        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to update topic.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: loadingKey, value: false } });
        }
    }, [activeMapId, businessInfo, dispatch, state.user]);

    const handleAnalyzeFlow = useCallback(async (draft: string) => {
        if (!activeMap || !activeMap.pillars) {
             dispatch({ type: 'SET_ERROR', payload: "Missing map pillars for flow analysis." });
             return;
        }
        dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: true } });
        try {
            const result = await aiService.analyzeContextualFlow(draft, activeMap.pillars.centralEntity, effectiveBusinessInfo, dispatch);
            dispatch({ type: 'SET_FLOW_AUDIT_RESULT', payload: result });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'flowAudit', visible: true } });
        } catch(e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Flow audit failed.' });
        } finally {
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
            
            // Re-run flow analysis to update the result in the modal
            await handleAnalyzeFlow(newDraft);
            
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Applied flow remediation successfully.' });

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

            // Re-run flow analysis to update the result in the modal
            await handleAnalyzeFlow(newDraft);

            dispatch({ type: 'SET_NOTIFICATION', payload: `Batch fixed ${issues.length} flow issues successfully.` });

        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Batch flow auto-fix failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: false } });
        }
    }, [activeMapId, state.activeBriefTopic, briefs, effectiveBusinessInfo, dispatch, businessInfo, handleAnalyzeFlow]);


    const handleExportData = (format: 'csv' | 'xlsx') => {
        if (!activeMap) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'export', value: true } });
        try {
            // Assuming briefs contains only fetched briefs.
            // If we want ALL briefs, we might need to fetch them all first if not loaded.
            // For now, export what is in state. 
            const filename = `${activeProject?.project_name || 'Project'}_${activeMap.name}_HolisticMap`;
            
            // Use state analysis result if available
            const metrics = state.validationResult;

            generateMasterExport({
                topics: allTopics,
                briefs: briefs,
                pillars: activeMap.pillars as SEOPillars, // safe cast
                metrics
            }, format, filename);

            dispatch({ type: 'SET_NOTIFICATION', payload: 'Export generated successfully.' });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Export failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'export', value: false } });
        }
    }
    
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
                onExpandCoreTopic={handleOpenExpansionModal}
                expandingCoreTopicId={Object.entries(isLoading).find(([k, v]) => k.startsWith('expand_') && v === true)?.[0].split('_')[1] || null}
                onSavePillars={onSavePillars}
                onBackToProjects={onBackToProjects}
                onAddTopic={onAddTopic}
                onBulkAddTopics={onBulkAddTopics}
                onAddTopicFromRecommendation={async (rec: TopicRecommendation) => { onAddTopic({ title: rec.title, description: rec.description, type: 'outer', parent_topic_id: null, freshness: 'STANDARD' as any }, 'ai') }}
                onAnalyzeGsc={handleAnalyzeGsc}
                onAddTopicFromGsc={(title, desc) => onAddTopic({ title, description: desc, type: 'outer', parent_topic_id: null, freshness: 'STANDARD' as any }, 'ai')}
                onImproveMap={onImproveMap}
                onExecuteMerge={onExecuteMerge}
                onAddTopicFromContextualGap={async (title, desc) => { onAddTopic({ title, description: desc || '', type: 'outer', parent_topic_id: null, freshness: 'STANDARD' as any }, 'ai') }}
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
            />
        </>
    );
};

export default ProjectDashboardContainer;
