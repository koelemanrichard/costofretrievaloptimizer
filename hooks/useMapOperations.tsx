
import React, { useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { AppAction } from '../state/appState';
import { AppStep, SEOPillars, EnrichedTopic, BusinessInfo, TopicalMap, FreshnessProfile, SemanticTriple } from '../types';
import * as aiService from '../services/aiService';
import { getSupabaseClient } from '../services/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { slugify, cleanSlug } from '../utils/helpers';
import { normalizeRpcData, parseTopicalMap } from '../utils/parsers';
import { verifiedBulkInsert, verifiedUpdate, verifiedBulkDelete } from '../services/verifiedDatabaseService';

// ============================================
// useMapOperations
// Extracted from ProjectDashboardContainer - handles map CRUD,
// pillar saves, map generation/regeneration, EAV and competitor updates.
// ============================================

interface UseMapOperationsParams {
    activeProjectId: string | null;
    activeMapId: string | null;
    activeMap: TopicalMap | undefined;
    effectiveBusinessInfo: BusinessInfo;
    businessInfo: BusinessInfo;
    user: User | null;
    dispatch: React.Dispatch<AppAction>;
    saveLocks: React.MutableRefObject<{ [key: string]: boolean }>;
}

export function useMapOperations({
    activeProjectId,
    activeMapId,
    activeMap,
    effectiveBusinessInfo,
    businessInfo,
    user,
    dispatch,
    saveLocks,
}: UseMapOperationsParams) {

    const handleSelectMap = useCallback((mapId: string) => {
        // Clear KG when switching maps to force hydration for new map
        dispatch({ type: 'SET_KNOWLEDGE_GRAPH', payload: null });
        dispatch({ type: 'SET_ACTIVE_MAP', payload: mapId });
        dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_DASHBOARD });
    }, [dispatch]);

    const handleCreateNewMap = useCallback(async (mapName: string) => {
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
    }, [activeProjectId, businessInfo, dispatch]);

    // Pre-flight validation helper for map generation
    const validateMapGenerationContext = useCallback((): { valid: boolean; errors: string[] } => {
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
    }, [activeMap?.pillars, effectiveBusinessInfo]);

    const handleGenerateInitialMap = useCallback(async () => {
        if (!activeMapId || !activeMap || !activeMap.pillars) {
            dispatch({ type: 'SET_ERROR', payload: 'Cannot generate map: No active map or pillars not defined.' });
            return;
        }
        if (!user) {
             dispatch({ type: 'SET_ERROR', payload: 'User session required.' });
             return;
        }

        // PRE-FLIGHT VALIDATION
        const validation = validateMapGenerationContext();
        if (!validation.valid) {
            const errorMsg = `Cannot generate map. Please fix the following:\n\n\u2022 ${validation.errors.join('\n\u2022 ')}`;
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
                dispatch({ type: 'SET_NOTIFICATION', payload: `\u2713 Initial topical map generated and verified: ${coreTopics.length} core topics and ${outerTopics.length} supporting topics.` });
            }

        } catch (e) {
            console.error("Map Generation Error:", e);
            dispatch({ type: 'LOG_EVENT', payload: { service: 'MapGeneration', message: `Generation failed: ${e instanceof Error ? e.message : 'Unknown error'}`, status: 'failure', timestamp: Date.now(), data: e } });
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to generate initial map."});
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: false } });
        }
    }, [activeMapId, activeMap, user, validateMapGenerationContext, effectiveBusinessInfo, businessInfo, dispatch]);

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
                dispatch({ type: 'SET_ERROR', payload: `\u274C ${e instanceof Error ? e.message : 'Failed to update pillars.'}` });
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
                dispatch({ type: 'SET_ERROR', payload: `\u274C ${e instanceof Error ? e.message : 'Failed to regenerate map.'}` });
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
                    title: '\u26A0\uFE0F Regenerate Topical Map?',
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
    }, [activeMapId, businessInfo, dispatch, saveLocks]);

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
            dispatch({ type: 'SET_NOTIFICATION', payload: '\u2713 Competitors updated successfully (verified).' });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'competitorManager', visible: false } });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to update competitors.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: false } });
        }
    }, [activeMapId, businessInfo, dispatch]);

    return {
        handleSelectMap,
        handleCreateNewMap,
        handleGenerateInitialMap,
        onSavePillars,
        onConfirmPillarChange,
        handleRegenerateMap,
        handleUpdateEavs,
        handleUpdateCompetitors,
    };
}
