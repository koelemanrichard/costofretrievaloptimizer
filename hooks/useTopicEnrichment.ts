
import React, { useState, useCallback } from 'react';
import { AppAction } from '../state/appState';
import { getSupabaseClient } from '../services/supabaseClient';
import { BusinessInfo, EnrichedTopic, SEOPillars } from '../types';
import * as aiService from '../services/ai/index';

export const useTopicEnrichment = (
    activeMapId: string | null,
    businessInfo: BusinessInfo,
    allTopics: EnrichedTopic[],
    pillars: SEOPillars | undefined,
    dispatch: React.Dispatch<AppAction>
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

                    const updatedMetadata = {
                        ...originalTopic.metadata,
                        canonical_query: result.canonical_query,
                        query_network: result.query_network,
                        url_slug_hint: result.url_slug_hint,
                        attribute_focus: result.attribute_focus,
                        query_type: result.query_type,
                        topical_border_note: result.topical_border_note,
                        planned_publication_date: result.planned_publication_date
                    };

                    await supabase.from('topics').update({ metadata: updatedMetadata }).eq('id', result.id);

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
            dispatch({ type: 'SET_NOTIFICATION', payload: `Successfully enriched ${enrichedCount} topics.` });

        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Data enrichment failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'enrichment', value: false } });
            setIsEnriching(false);
        }
    }, [activeMapId, allTopics, businessInfo, dispatch]);

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
                    await supabase.from('topics').update({ metadata: updatedMetadata as any }).eq('id', result.id);

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
