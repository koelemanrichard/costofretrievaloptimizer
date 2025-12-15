
import React, { useCallback } from 'react';
import { AppAction } from '../state/appState';
import { getSupabaseClient } from '../services/supabaseClient';
import { BusinessInfo, EnrichedTopic } from '../types';
import * as aiService from '../services/ai/index';
import { sanitizeTopicFromDb } from '../utils/parsers';
import { User } from '@supabase/supabase-js';

export const useTopicOperations = (
    activeMapId: string | null,
    businessInfo: BusinessInfo,
    allTopics: EnrichedTopic[],
    dispatch: React.Dispatch<AppAction>,
    user: User | null
) => {

    const handleAddTopic = useCallback(async (topicData: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>, placement: 'ai' | 'root' | string, overrideSettings?: { provider: string, model: string }) => {
        if (!activeMapId || !user) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'addTopic', value: true } });
        
        const configToUse = overrideSettings 
            ? { ...businessInfo, aiProvider: overrideSettings.provider as any, aiModel: overrideSettings.model }
            : businessInfo;

        try {
            let parentId: string | null = null;
            let topicType = topicData.type;

            if (placement === 'ai' && topicType === 'outer') {
                const suggestion = await aiService.addTopicIntelligently(
                    topicData.title, 
                    topicData.description, 
                    allTopics, 
                    configToUse, 
                    dispatch
                );
                // If AI returns a title as parent, find the ID
                if (suggestion.parentTopicId && !suggestion.parentTopicId.match(/^[0-9a-f]{8}-/)) {
                     const parent = allTopics.find(t => t.title === suggestion.parentTopicId);
                     if (parent) parentId = parent.id;
                } else {
                     parentId = suggestion.parentTopicId;
                }
                topicType = suggestion.type as 'core' | 'outer';
            } else if (placement !== 'root' && placement !== 'ai') {
                parentId = placement;
            }

            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const { data, error } = await supabase.from('topics').insert({
                map_id: activeMapId,
                user_id: user.id,
                title: topicData.title,
                description: topicData.description,
                slug: topicData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                type: topicType,
                parent_topic_id: parentId,
                freshness: topicData.freshness,
                metadata: {
                    topic_class: topicData.topic_class || (topicType === 'core' ? 'monetization' : 'informational'),
                    cluster_role: topicData.cluster_role,
                    attribute_focus: topicData.attribute_focus,
                    canonical_query: topicData.canonical_query,
                }
            }).select().single();

            if (error) throw error;
            
            const newTopic = sanitizeTopicFromDb(data);
            dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: newTopic } });
            dispatch({ type: 'SET_NOTIFICATION', payload: `Added topic "${newTopic.title}".` });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'addTopic', visible: false } });

        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to add topic." });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'addTopic', value: false } });
        }
    }, [activeMapId, businessInfo, allTopics, dispatch, user]);

    const handleBulkAddTopics = useCallback(async (topics: {data: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>, placement: 'ai' | 'root' | string}[]) => {
        if (!activeMapId || !user) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'addTopic', value: true } });

        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
        const newCoreTopicsMap = new Map<string, string>(); // Title -> UUID
        
        try {
            // Phase 1: Insert Core Topics
            const coreInputs = topics.filter(t => t.data.type === 'core');
            for (const input of coreInputs) {
                const { data, error } = await supabase.from('topics').insert({
                    map_id: activeMapId,
                    user_id: user.id,
                    title: input.data.title,
                    description: input.data.description,
                    slug: input.data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    type: 'core',
                    parent_topic_id: null,
                    freshness: input.data.freshness,
                    metadata: {
                        topic_class: input.data.topic_class || 'monetization',
                        cluster_role: input.data.cluster_role,
                        attribute_focus: input.data.attribute_focus,
                        canonical_query: input.data.canonical_query,
                    }
                }).select().single();
                
                if (error) throw error;
                const topic = sanitizeTopicFromDb(data);
                newCoreTopicsMap.set(topic.title, topic.id);
                dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic } });
            }

            // Phase 2: Insert Outer Topics (Resolving Parents)
            const outerInputs = topics.filter(t => t.data.type === 'outer');
            for (const input of outerInputs) {
                let parentId: string | null = null;
                const parentTitle = input.placement; // In AI Assistant mode, placement is the title

                if (parentTitle && parentTitle !== 'root' && parentTitle !== 'ai') {
                    // Check newly created cores first
                    if (newCoreTopicsMap.has(parentTitle)) {
                        parentId = newCoreTopicsMap.get(parentTitle)!;
                    } else {
                        // Check existing topics
                        const existingParent = allTopics.find(t => t.title === parentTitle);
                        if (existingParent) parentId = existingParent.id;
                    }
                }

                const { data, error } = await supabase.from('topics').insert({
                    map_id: activeMapId,
                    user_id: user.id,
                    title: input.data.title,
                    description: input.data.description,
                    slug: input.data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    type: 'outer',
                    parent_topic_id: parentId,
                    freshness: input.data.freshness,
                    metadata: {
                        topic_class: input.data.topic_class || 'informational',
                        cluster_role: input.data.cluster_role,
                        attribute_focus: input.data.attribute_focus,
                        canonical_query: input.data.canonical_query,
                    }
                }).select().single();

                if (error) throw error;
                const topic = sanitizeTopicFromDb(data);
                dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic } });
            }
            
            dispatch({ type: 'SET_NOTIFICATION', payload: `Successfully added ${topics.length} topics.` });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'addTopic', visible: false } });

        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Bulk add failed." });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'addTopic', value: false } });
        }
    }, [activeMapId, businessInfo, allTopics, dispatch, user]);

    const handleUpdateTopic = useCallback(async (topicId: string, updates: Partial<EnrichedTopic>) => {
        if (!activeMapId) return;
        
        // 1. Optimistic Update
        dispatch({ 
            type: 'UPDATE_TOPIC', 
            payload: { mapId: activeMapId, topicId, updates } 
        });

        // 2. Database Update
        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
        
        // Prepare DB payload
        const dbPayload: any = {};
        // Standard columns
        if (updates.title !== undefined) dbPayload.title = updates.title;
        if (updates.slug !== undefined) dbPayload.slug = updates.slug;
        if (updates.parent_topic_id !== undefined) dbPayload.parent_topic_id = updates.parent_topic_id;
        if (updates.type !== undefined) dbPayload.type = updates.type;
        if (updates.freshness !== undefined) dbPayload.freshness = updates.freshness;
        if (updates.description !== undefined) dbPayload.description = updates.description;
        
        // Metadata columns mapped to keys in EnrichedTopic but stored in 'metadata' JSONB in DB
        const metadataKeys: (keyof EnrichedTopic)[] = [
            'topic_class', 'cluster_role', 'attribute_focus', 'canonical_query', 
            'query_network', 'query_type', 'topical_border_note', 
            'planned_publication_date', 'url_slug_hint', 'blueprint', 'decay_score'
        ];

        // Check if we need to update metadata
        const needsMetadataUpdate = updates.metadata || metadataKeys.some(key => updates[key] !== undefined);

        if (needsMetadataUpdate) {
             // Fetch current to merge properly if we don't have the full object in updates
             const { data: current } = await supabase.from('topics').select('metadata').eq('id', topicId).single();
             
             const mergedMeta = { ...((current?.metadata as Record<string, any>) || {}), ...(updates.metadata || {}) };
             
             // Map top-level fields into metadata if present in updates
             metadataKeys.forEach(key => {
                 if (updates[key] !== undefined) {
                     mergedMeta[key] = updates[key];
                 }
             });
             
             dbPayload.metadata = mergedMeta;
        }

        const { error } = await supabase.from('topics').update(dbPayload).eq('id', topicId);
        
        if (error) {
            console.error("Failed to update topic:", error);
            dispatch({ type: 'SET_ERROR', payload: "Failed to save topic changes." });
        } else {
            dispatch({ type: 'SET_NOTIFICATION', payload: "Topic updated." });
        }
    }, [activeMapId, businessInfo, dispatch]);

    const handleDeleteTopic = useCallback(async (topicId: string) => {
        if (!activeMapId) return;
        if (!window.confirm("Are you sure you want to delete this topic?")) return;

        dispatch({ type: 'SET_LOADING', payload: { key: 'deleteTopic', value: true } });
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const { error } = await supabase.from('topics').delete().eq('id', topicId);
            if (error) throw error;

            dispatch({ type: 'DELETE_TOPIC', payload: { mapId: activeMapId, topicId } });
            dispatch({ type: 'SET_NOTIFICATION', payload: "Topic deleted." });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to delete topic." });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'deleteTopic', value: false } });
        }
    }, [activeMapId, businessInfo, dispatch]);

    return {
        handleAddTopic,
        handleBulkAddTopics,
        handleUpdateTopic,
        handleDeleteTopic
    };
};