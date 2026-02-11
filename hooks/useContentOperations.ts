
import { useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { AppAction } from '../state/appState';
import {
    AppStep,
    SEOPillars,
    EnrichedTopic,
    ContentBrief,
    BusinessInfo,
    TopicalMap,
    ResponseCode,
    ExpansionMode,
    EnhancedSchemaResult,
} from '../types';
import { ContentGenerationOrchestrator } from '../services/ai/contentGeneration/orchestrator';
import { executePass9 } from '../services/ai/contentGeneration/passes/pass9SchemaGeneration';
import * as aiService from '../services/aiService';
import { getSupabaseClient } from '../services/supabaseClient';
import type { Json } from '../database.types';
import { v4 as uuidv4 } from 'uuid';
import { slugify, cleanSlug } from '../utils/helpers';
import { KnowledgeGraph } from '../lib/knowledgeGraph';
import { BatchProcessor } from '../services/batchProcessor';
import { sanitizeTopicFromDb } from '../utils/parsers';
import { generateMasterExport } from '../utils/exportUtils';
import { generateEnhancedExport, EnhancedExportInput } from '../utils/enhancedExportUtils';
import { verifiedInsert, verifiedBulkInsert, verifiedUpdate } from '../services/verifiedDatabaseService';
import type { ExportSettings } from '../components/modals';

// ============================================
// useContentOperations
// Extracted from ProjectDashboardContainer – handles content generation,
// topic CRUD, export, schema generation, quick audit, and remaining
// operational handlers that don't belong to map, analysis, or foundation hooks.
// ============================================

interface UseContentOperationsParams {
    activeProjectId: string | null;
    activeMapId: string | null;
    activeMap: TopicalMap | undefined;
    activeProject: { project_name: string; domain?: string } | undefined;
    effectiveBusinessInfo: BusinessInfo;
    businessInfo: BusinessInfo;
    knowledgeGraph: KnowledgeGraph | null;
    allTopics: EnrichedTopic[];
    briefs: Record<string, ContentBrief>;
    dispatch: React.Dispatch<AppAction>;
    user: User | null;
    stateRef: React.MutableRefObject<any>;
    // Slices of state referenced by individual handlers
    topicalMaps: TopicalMap[];
    activeBriefTopic: EnrichedTopic | null;
    validationResult: any;
    websiteStructure: { foundationPages: any[]; navigation: any };
    // Local state setters
    setShowExportSettings: (v: boolean) => void;
    setShowBulkSummary: (v: boolean) => void;
}

export function useContentOperations({
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
    user,
    stateRef,
    topicalMaps,
    activeBriefTopic,
    validationResult,
    websiteStructure,
    setShowExportSettings,
    setShowBulkSummary,
}: UseContentOperationsParams) {

    // --- START ANALYSIS ---
    const handleStartAnalysis = useCallback(async () => {
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
    }, [activeProjectId, businessInfo, dispatch]);

    // --- CONTENT BRIEF GENERATION ---
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
            const briefData = await aiService.generateContentBrief(configToUse, topic, allTopics, activeMap.pillars, safeKG, responseCode, dispatch, undefined, activeMap.eavs || []);

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

    // --- BULK BRIEF GENERATION ---
    const onGenerateAllBriefs = useCallback(async () => {
        const processor = new BatchProcessor(dispatch, () => stateRef.current);
        await processor.generateAllBriefs(allTopics);
        // Show bulk generation summary modal after completion
        setShowBulkSummary(true);
    }, [dispatch, allTopics, stateRef, setShowBulkSummary]);

    const onCancelBriefGeneration = useCallback(() => {
        dispatch({ type: 'CANCEL_BRIEF_GENERATION' });
    }, [dispatch]);

    // --- ADD SINGLE TOPIC ---
    const onAddTopic = useCallback(async (topicData: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>, placement: 'ai' | 'root' | string, overrideSettings?: { provider: string, model: string }) => {
        if (!activeMapId) return;
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
    }, [activeMapId, allTopics, effectiveBusinessInfo, dispatch, businessInfo, user]);

    // --- BULK ADD TOPICS ---
    const onBulkAddTopics = useCallback(async (topics: {data: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>, placement: 'ai' | 'root' | string}[]) => {
        if (!activeMapId) return;
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
    }, [activeMapId, allTopics, effectiveBusinessInfo, dispatch, businessInfo, user]);

    // --- TOPIC EXPANSION ---
    const handleOpenExpansionModal = useCallback((coreTopic: EnrichedTopic, mode: ExpansionMode) => {
        dispatch({ type: 'SET_ACTIVE_EXPANSION_TOPIC', payload: coreTopic });
        dispatch({ type: 'SET_ACTIVE_EXPANSION_MODE', payload: mode });
        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'topicExpansion', visible: true } });
    }, [dispatch]);

    const handleExpandCoreTopic = useCallback(async (coreTopic: EnrichedTopic, mode: ExpansionMode, userContext?: string, overrideSettings?: { provider: string, model: string }) => {
        const safeKG = knowledgeGraph || new KnowledgeGraph();
        if (!activeMapId || !activeMap?.pillars) return;
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
    }, [activeMap, activeMapId, knowledgeGraph, allTopics, effectiveBusinessInfo, dispatch, businessInfo, user]);

    // --- DRAFT GENERATION ---
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
    }, [activeMapId, effectiveBusinessInfo, businessInfo, dispatch]);

    // --- SCHEMA GENERATION ---
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
                    const topic = activeBriefTopic;

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
                        user?.id || '',
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
    }, [effectiveBusinessInfo, dispatch, activeBriefTopic, user?.id]);

    // --- TOPIC UPDATE ---
    const handleUpdateTopic = useCallback(async (topicId: string, updates: Partial<EnrichedTopic>) => {
        console.log('[handleUpdateTopic] Called with:', { topicId, updates });

        if (!activeMapId) {
            console.warn('[handleUpdateTopic] No activeMapId, returning early');
            return;
        }
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
                    const currentActiveMap = topicalMaps.find(m => m.id === activeMapId);
                    const oldTopic = currentActiveMap?.topics?.find(t => t.id === topicId);
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
    }, [activeMapId, businessInfo, dispatch, user, topicalMaps]);

    // --- EXPORT ---
    const handleExportData = useCallback(async (format: 'csv' | 'xlsx' | 'zip') => {
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
                    metrics: validationResult
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
    }, [activeMap, activeProject, allTopics, briefs, validationResult, dispatch, setShowExportSettings]);

    const handleEnhancedExport = useCallback(async (settings: ExportSettings) => {
        if (!activeMap) return;
        setShowExportSettings(false);

        dispatch({ type: 'SET_LOADING', payload: { key: 'export', value: true } });
        try {
            // Get foundation pages, NAP data, navigation, and brand kit for comprehensive export
            const currentFoundationPages = websiteStructure?.foundationPages || [];
            const currentNapData = currentFoundationPages.find((p: any) => p.nap_data)?.nap_data || undefined;
            const currentNavigation = websiteStructure?.navigation || null;
            const currentBrandKit = (activeMap.business_info as any)?.brandKit || undefined;

            const input: EnhancedExportInput = {
                topics: allTopics,
                briefs: briefs,
                pillars: activeMap.pillars,
                eavs: activeMap.eavs,
                competitors: activeMap.competitors,
                metrics: validationResult,
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
    }, [activeMap, activeProject, allTopics, briefs, validationResult, effectiveBusinessInfo, websiteStructure, dispatch, setShowExportSettings]);

    // --- VIEW MODE SWITCHING ---
    const handleSwitchToMigration = useCallback(() => {
        dispatch({ type: 'SET_VIEW_MODE', payload: 'MIGRATION' });
    }, [dispatch]);

    const handleSwitchToCreation = useCallback(() => {
        dispatch({ type: 'SET_VIEW_MODE', payload: 'CREATION' });
    }, [dispatch]);

    // --- QUICK AUDIT ---
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

    // --- REGENERATE FAILED BRIEFS (used by BulkGenerationSummary) ---
    const handleRegenerateFailed = useCallback((topicIds: string[]) => {
        const topicsToRegenerate = allTopics.filter(t => topicIds.includes(t.id));
        if (topicsToRegenerate.length > 0) {
            const processor = new BatchProcessor(dispatch, () => stateRef.current);
            processor.generateAllBriefs(topicsToRegenerate).then(() => {
                setShowBulkSummary(true);
            });
        }
    }, [allTopics, dispatch, stateRef, setShowBulkSummary]);

    return {
        // Analysis
        handleStartAnalysis,
        // Content generation
        onGenerateBrief,
        onGenerateAllBriefs,
        onCancelBriefGeneration,
        onGenerateDraft,
        onGenerateSchema,
        // Topic operations
        onAddTopic,
        onBulkAddTopics,
        handleOpenExpansionModal,
        handleExpandCoreTopic,
        handleUpdateTopic,
        // Export
        handleExportData,
        handleEnhancedExport,
        // View mode
        handleSwitchToMigration,
        handleSwitchToCreation,
        // Other
        handleQuickAudit,
        handleRegenerateFailed,
    };
}
