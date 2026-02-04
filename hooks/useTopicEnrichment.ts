
import React, { useState, useCallback } from 'react';
import { AppAction } from '../state/appState';
import { getSupabaseClient } from '../services/supabaseClient';
import { BusinessInfo, EnrichedTopic, SEOPillars, SemanticTriple } from '../types';
import * as aiService from '../services/aiService';
import { fetchKeywordSearchVolume } from '../services/serpApiService';

// ============================================
// EAV-TOPIC MATCHING LOGIC
// Matches semantic triples (EAVs) to topics based on entity/attribute overlap
// This enables semantic relevance scoring in navigation
// ============================================

// ============================================
// SEARCH VOLUME INTEGRATION
// Fetches search volume from DataForSEO for Quality Node detection
// ============================================

/**
 * Map target market to DataForSEO location code
 */
const getLocationCode = (targetMarket?: string): string => {
    const marketCodes: Record<string, string> = {
        'US': '2840', 'United States': '2840',
        'UK': '2826', 'United Kingdom': '2826',
        'NL': '2528', 'Netherlands': '2528',
        'DE': '2276', 'Germany': '2276',
        'FR': '2250', 'France': '2250',
        'ES': '2724', 'Spain': '2724',
        'IT': '2380', 'Italy': '2380',
        'AU': '2036', 'Australia': '2036',
        'CA': '2124', 'Canada': '2124',
    };
    return marketCodes[targetMarket || ''] || '2840';
};

/**
 * Match EAVs to a topic based on title/description overlap with EAV subjects and objects
 * Uses fuzzy word matching to find semantically related EAVs
 */
const matchEavsToTopic = (topic: EnrichedTopic, eavs: SemanticTriple[]): SemanticTriple[] => {
    if (!eavs || eavs.length === 0) return [];

    // Extract significant words from topic (filter out stop words, keep 3+ char words)
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'will', 'from', 'that', 'with', 'this', 'they', 'what', 'their', 'which', 'about', 'would', 'there', 'could']);

    const topicText = `${topic.title} ${topic.description || ''} ${topic.attribute_focus || ''}`.toLowerCase();
    const topicWords = new Set(
        topicText.split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w))
            .map(w => w.replace(/[^a-z0-9]/g, '')) // Clean punctuation
    );

    // Match EAVs where subject label or object value has word overlap
    const matchedEavs = eavs.filter(eav => {
        const subjectLabel = eav.subject.label.toLowerCase();
        const objectValue = String(eav.object.value).toLowerCase();
        const predicateRelation = eav.predicate.relation.toLowerCase();

        // Check for word overlap
        const eavText = `${subjectLabel} ${objectValue} ${predicateRelation}`;
        const eavWords = eavText.split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w))
            .map(w => w.replace(/[^a-z0-9]/g, ''));

        // Count matching words
        const matchCount = eavWords.filter(w => topicWords.has(w)).length;

        // Require at least 1 matching significant word
        return matchCount >= 1;
    });

    // Return top 5 most relevant EAVs
    return matchedEavs.slice(0, 5);
};

export const useTopicEnrichment = (
    activeMapId: string | null,
    businessInfo: BusinessInfo,
    allTopics: EnrichedTopic[],
    pillars: SEOPillars | undefined,
    dispatch: React.Dispatch<AppAction>,
    eavs?: SemanticTriple[] // Optional EAVs for matching
) => {
    const [isEnriching, setIsEnriching] = useState(false);
    const [isGeneratingBlueprints, setIsGeneratingBlueprints] = useState(false);

    const handleEnrichData = useCallback(async () => {
        if (!activeMapId) return;
        
        const topicsToEnrich = allTopics.filter(t => 
            !t.canonical_query || 
            !t.query_network || 
            t.query_network.length === 0 || 
            !t.url_slug_hint ||
            !t.attribute_focus ||
            !t.query_type ||
            !t.topical_border_note
        );

        if (topicsToEnrich.length === 0) {
            dispatch({ type: 'SET_NOTIFICATION', payload: 'All topics are already enriched with metadata.' });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'enrichment', value: true } });
        setIsEnriching(true);
        
        try {
            const chunkSize = 20;
            let enrichedCount = 0;
            
            for (let i = 0; i < topicsToEnrich.length; i += chunkSize) {
                const chunk = topicsToEnrich.slice(i, i + chunkSize);
                dispatch({ type: 'LOG_EVENT', payload: { service: 'Enrichment', message: `Enriching metadata batch ${i/chunkSize + 1}...`, status: 'info', timestamp: Date.now() } });

                const results = await aiService.enrichTopicMetadata(
                    chunk.map(t => ({ id: t.id, title: t.title, description: t.description })),
                    businessInfo,
                    dispatch
                );

                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
                
                for (const result of results) {
                    const originalTopic = allTopics.find(t => t.id === result.id);
                    if (!originalTopic) continue;

                    // Match EAVs to this topic based on semantic overlap
                    const matchedEavs = eavs ? matchEavsToTopic(originalTopic, eavs) : [];

                    const updatedMetadata = {
                        ...originalTopic.metadata,
                        canonical_query: result.canonical_query,
                        query_network: result.query_network,
                        url_slug_hint: result.url_slug_hint,
                        attribute_focus: result.attribute_focus,
                        query_type: result.query_type,
                        topical_border_note: result.topical_border_note,
                        planned_publication_date: result.planned_publication_date,
                        // NEW: EAV-topic matching for navigation semantic relevance
                        matched_eavs: matchedEavs.length > 0 ? matchedEavs : undefined
                    };

                    // Cast to any to avoid TypeScript error regarding Json compatibility with interfaces
                    // Add verification to catch silent RLS failures
                    const { data: enrichData, error: enrichError } = await supabase
                        .from('topics')
                        .update({ metadata: updatedMetadata as any })
                        .eq('id', result.id)
                        .select('id');

                    if (enrichError) {
                        console.error('[TopicEnrichment] Failed to update topic metadata:', result.id, enrichError.message);
                        // Continue with next topic instead of failing the whole batch
                    } else if (!enrichData || enrichData.length === 0) {
                        console.warn('[TopicEnrichment] Topic metadata update returned no rows - possible RLS issue:', result.id);
                    }

                    dispatch({
                        type: 'UPDATE_TOPIC',
                        payload: {
                            mapId: activeMapId,
                            topicId: result.id,
                            updates: {
                                canonical_query: result.canonical_query,
                                query_network: result.query_network,
                                url_slug_hint: result.url_slug_hint,
                                attribute_focus: result.attribute_focus,
                                query_type: result.query_type,
                                topical_border_note: result.topical_border_note,
                                planned_publication_date: result.planned_publication_date,
                                metadata: updatedMetadata
                            }
                        }
                    });
                    enrichedCount++;
                }
            }

            // Step 2: Fetch search volumes from DataForSEO (if credentials available)
            let searchVolumeCount = 0;
            if (businessInfo.dataforseoLogin && businessInfo.dataforseoPassword) {
                dispatch({
                    type: 'LOG_EVENT',
                    payload: {
                        service: 'Enrichment',
                        message: 'Fetching search volume data from DataForSEO...',
                        status: 'info',
                        timestamp: Date.now()
                    }
                });

                try {
                    // Collect all canonical_queries that were just enriched
                    const canonicalQueries = allTopics
                        .map(t => t.canonical_query)
                        .filter((q): q is string => !!q && q.length > 0);

                    if (canonicalQueries.length > 0) {
                        const volumeMap = await fetchKeywordSearchVolume(
                            canonicalQueries,
                            businessInfo.dataforseoLogin,
                            businessInfo.dataforseoPassword,
                            getLocationCode(businessInfo.targetMarket),
                            businessInfo.language,
                            { supabaseUrl: businessInfo.supabaseUrl, supabaseAnonKey: businessInfo.supabaseAnonKey }
                        );

                        // Update topics with search volume
                        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

                        for (const topic of allTopics) {
                            if (!topic.canonical_query) continue;

                            const searchVolume = volumeMap.get(topic.canonical_query.toLowerCase());
                            if (searchVolume !== undefined && searchVolume > 0) {
                                const updatedMetadata = {
                                    ...topic.metadata,
                                    search_volume: searchVolume
                                };

                                // Add verification to catch silent RLS failures
                                const { data: volData, error: volError } = await supabase
                                    .from('topics')
                                    .update({ metadata: updatedMetadata })
                                    .eq('id', topic.id)
                                    .select('id');

                                if (volError) {
                                    console.error('[TopicEnrichment] Failed to update search volume:', topic.id, volError.message);
                                } else if (!volData || volData.length === 0) {
                                    console.warn('[TopicEnrichment] Search volume update returned no rows - possible RLS issue:', topic.id);
                                }

                                dispatch({
                                    type: 'UPDATE_TOPIC',
                                    payload: {
                                        mapId: activeMapId,
                                        topicId: topic.id,
                                        updates: { metadata: updatedMetadata }
                                    }
                                });
                                searchVolumeCount++;
                            }
                        }

                        dispatch({
                            type: 'LOG_EVENT',
                            payload: {
                                service: 'Enrichment',
                                message: `Search volume data added to ${searchVolumeCount} topics.`,
                                status: 'success',
                                timestamp: Date.now()
                            }
                        });
                    }
                } catch (error) {
                    dispatch({
                        type: 'LOG_EVENT',
                        payload: {
                            service: 'Enrichment',
                            message: `Could not fetch search volume: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            status: 'warning',
                            timestamp: Date.now()
                        }
                    });
                }
            }

            // Build final notification message
            const topicsWithEavs = allTopics.filter(t => Array.isArray(t.metadata?.matched_eavs) && t.metadata.matched_eavs.length > 0).length;
            let message = `Successfully enriched ${enrichedCount} topics.`;
            if (eavs && eavs.length > 0 && topicsWithEavs > 0) {
                message += ` ${topicsWithEavs} topics matched with EAVs.`;
            }
            if (searchVolumeCount > 0) {
                message += ` ${searchVolumeCount} topics with search volume data.`;
            }
            dispatch({ type: 'SET_NOTIFICATION', payload: message });

        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Data enrichment failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'enrichment', value: false } });
            setIsEnriching(false);
        }
    }, [activeMapId, allTopics, businessInfo, dispatch, eavs]);

    const handleGenerateBlueprints = useCallback(async () => {
        if (!activeMapId || !pillars) {
            dispatch({ type: 'SET_ERROR', payload: "Cannot generate blueprints: Missing map ID or Pillars." });
            return;
        }

        const topicsMissingBlueprints = allTopics.filter(t => !t.blueprint);

        if (topicsMissingBlueprints.length === 0) {
            dispatch({ type: 'SET_NOTIFICATION', payload: 'All topics already have blueprints.' });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'blueprints', value: true } });
        setIsGeneratingBlueprints(true);

        try {
            // Smaller batch size for blueprints as it's more generation-heavy
            const chunkSize = 5; 
            let processedCount = 0;

            for (let i = 0; i < topicsMissingBlueprints.length; i += chunkSize) {
                const chunk = topicsMissingBlueprints.slice(i, i + chunkSize);
                dispatch({ type: 'LOG_EVENT', payload: { service: 'Blueprints', message: `Generating blueprints for batch ${(i/chunkSize) + 1}...`, status: 'info', timestamp: Date.now() } });

                const results = await aiService.generateTopicBlueprints(
                    chunk.map(t => ({ id: t.id, title: t.title })),
                    businessInfo,
                    pillars,
                    dispatch
                );

                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

                for (const result of results) {
                    const originalTopic = allTopics.find(t => t.id === result.id);
                    if (!originalTopic) continue;

                    // Merge blueprint into metadata
                    const updatedMetadata = {
                        ...originalTopic.metadata,
                        blueprint: result.blueprint
                    };

                    // Cast to any to avoid TypeScript error regarding Json compatibility with interfaces
                    // Add verification to catch silent RLS failures
                    const { data: bpData, error: bpError } = await supabase
                        .from('topics')
                        .update({ metadata: updatedMetadata as any })
                        .eq('id', result.id)
                        .select('id');

                    if (bpError) {
                        console.error('[TopicEnrichment] Failed to update blueprint:', result.id, bpError.message);
                    } else if (!bpData || bpData.length === 0) {
                        console.warn('[TopicEnrichment] Blueprint update returned no rows - possible RLS issue:', result.id);
                    }

                    dispatch({
                        type: 'UPDATE_TOPIC',
                        payload: {
                            mapId: activeMapId,
                            topicId: result.id,
                            updates: {
                                blueprint: result.blueprint,
                                metadata: updatedMetadata
                            }
                        }
                    });
                    processedCount++;
                }
            }
            dispatch({ type: 'SET_NOTIFICATION', payload: `Successfully generated blueprints for ${processedCount} topics.` });

        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Blueprint generation failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'blueprints', value: false } });
            setIsGeneratingBlueprints(false);
        }

    }, [activeMapId, allTopics, businessInfo, pillars, dispatch]);

    return {
        handleEnrichData,
        isEnriching,
        handleGenerateBlueprints,
        isGeneratingBlueprints
    };
};
