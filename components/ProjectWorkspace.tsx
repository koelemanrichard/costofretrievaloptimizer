
// components/ProjectWorkspace.tsx
import React from 'react';
import { useAppState } from '../state/appState';
import { AppStep, SEOPillars, SemanticTriple, TopicalMap, BusinessInfo, EnrichedTopic, FreshnessProfile } from '../types';
import BusinessInfoForm from './BusinessInfoForm';
import PillarDefinitionWizard from './PillarDefinitionWizard';
import EavDiscoveryWizard from './EavDiscoveryWizard';
import CompetitorRefinementWizard from './CompetitorRefinementWizard';
import ProjectDashboardContainer from './ProjectDashboardContainer';
import { getSupabaseClient } from '../services/supabaseClient';
import * as aiService from '../services/aiService';
import { v4 as uuidv4 } from 'uuid';
import { slugify, cleanSlug } from '../utils/helpers';
import { sanitizeTopicFromDb } from '../utils/parsers';

const ProjectWorkspace: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { appStep, activeMapId, businessInfo } = state;

    const handleBackToDashboard = () => dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_DASHBOARD });
    const handleBackToProjectSelection = () => {
        dispatch({ type: 'SET_ACTIVE_PROJECT', payload: null });
        dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION });
    };

    const handleSaveBusinessInfo = async (formData: Partial<BusinessInfo>) => {
        if (!activeMapId) return;

        // Whitelist only the strategic fields to be saved with the map.
        // This prevents sensitive data like API keys from being saved in the map's JSON.
        const strategicInfo: Partial<BusinessInfo> = {
            seedKeyword: formData.seedKeyword,
            industry: formData.industry,
            valueProp: formData.valueProp,
            audience: formData.audience,
            language: formData.language,
            targetMarket: formData.targetMarket,
            aiProvider: formData.aiProvider,
            aiModel: formData.aiModel,
        };

        dispatch({ type: 'UPDATE_MAP_DATA', payload: { mapId: activeMapId, data: { business_info: strategicInfo } } });
        dispatch({ type: 'SET_STEP', payload: AppStep.PILLAR_WIZARD });
    };

    const handleFinalizePillars = (pillars: SEOPillars) => {
        if (!activeMapId) return;
        dispatch({ type: 'SET_PILLARS', payload: { mapId: activeMapId, pillars } });
        dispatch({ type: 'SET_STEP', payload: AppStep.EAV_WIZARD });
    };

    const handleFinalizeEavs = (eavs: SemanticTriple[]) => {
        if (!activeMapId) return;
        dispatch({ type: 'SET_EAVS', payload: { mapId: activeMapId, eavs } });
        dispatch({ type: 'SET_STEP', payload: AppStep.COMPETITOR_WIZARD });
    };
    
    const handleFinalizeCompetitors = async (competitors: string[]) => {
        if (!activeMapId) return;
        const user = state.user;

        if (!user) {
             dispatch({ type: 'SET_ERROR', payload: "User not authenticated. Cannot save map." });
             return;
        }

        dispatch({ type: 'SET_COMPETITORS', payload: { mapId: activeMapId, competitors } });
        
        // This is where we save everything and trigger map generation
        dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true } });
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const currentMap = state.topicalMaps.find(m => m.id === activeMapId);
            if (!currentMap) throw new Error("Active map not found");

            // 1. Save Wizard Data
            const { error: updateError } = await supabase
                .from('topical_maps')
                .update({
                    business_info: currentMap.business_info as any,
                    pillars: currentMap.pillars as any,
                    eavs: currentMap.eavs as any,
                    competitors: competitors,
                })
                .eq('id', activeMapId);
            
            if (updateError) throw updateError;
            
            // 2. Generate Initial Topics with AI
            // Use effective business info (global keys + map strategy)
            const effectiveBusinessInfo = {
                ...state.businessInfo,
                ...(currentMap.business_info as Partial<BusinessInfo> || {})
            };

            // NOTE: If pillars are missing here (shouldn't happen if flow is followed), we might want to throw.
            if (!currentMap.pillars || !currentMap.eavs) {
                 throw new Error("Missing pillars or EAVs for generation.");
            }

            const { coreTopics, outerTopics } = await aiService.generateInitialTopicalMap(
                effectiveBusinessInfo,
                currentMap.pillars,
                currentMap.eavs,
                competitors,
                dispatch
            );

            // 3. Process and ID assignment
            const topicMap = new Map<string, string>(); // Maps temp ID (e.g. "core_1") to real UUID
            const finalTopics: EnrichedTopic[] = [];

            // Process Core Topics first
            coreTopics.forEach(core => {
                const realId = uuidv4();
                topicMap.set(core.id, realId); // Store mapping

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
                    slug: `${parentSlug}/${cleanSlug(parentSlug, outer.title)}`.replace(/^\//, ''), // Use Clean Slug Logic
                    parent_topic_id: parentRealId || null,
                    type: 'outer',
                    freshness: outer.freshness || FreshnessProfile.STANDARD
                } as EnrichedTopic);
            });

            // 4. Save Topics to DB
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
                // New metadata field for Holistic SEO attributes
                metadata: {
                    topic_class: t.topic_class || 'informational',
                    cluster_role: t.cluster_role,
                    attribute_focus: t.attribute_focus,
                    canonical_query: t.canonical_query,
                    decay_score: t.decay_score
                }
            }));

            if (dbTopics.length > 0) {
                const { error: insertError } = await supabase.from('topics').insert(dbTopics);
                if (insertError) throw insertError;
            }

            // 5. Update State
            // NOTE: We use finalTopics directly here. Using sanitizeTopicFromDb might accidentally strip
            // the 'metadata' properties if the function expects a different DB structure than the flat object we just created.
            dispatch({ type: 'SET_TOPICS_FOR_MAP', payload: { mapId: activeMapId, topics: finalTopics } });

            // 6. Redirect
            dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_DASHBOARD });

        } catch (e) {
            console.error("Map Generation Error:", e);
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to save map settings or generate topics."});
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: false } });
        }
    };

    const handleInitiateDeleteMap = (map: TopicalMap) => {
        dispatch({
            type: 'SHOW_CONFIRMATION',
            payload: {
                title: 'Delete Topical Map?',
                message: `Are you sure you want to permanently delete the map "${map.name}"? This action cannot be undone.`,
                onConfirm: async () => {
                    try {
                        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
                        const { error } = await supabase.rpc('delete_topical_map', { p_map_id: map.id });
                        if (error) throw error;
                        dispatch({ type: 'DELETE_TOPICAL_MAP', payload: { mapId: map.id } });
                        dispatch({ type: 'SET_NOTIFICATION', payload: `Map "${map.name}" deleted.` });
                    } catch (e) {
                        dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to delete map.' });
                    } finally {
                        dispatch({ type: 'HIDE_CONFIRMATION' });
                    }
                }
            }
        });
    };

    switch (appStep) {
        case AppStep.BUSINESS_INFO:
            return <BusinessInfoForm 
                        onSave={handleSaveBusinessInfo} 
                        onBack={handleBackToDashboard} 
                        isLoading={!!state.isLoading.map} 
                   />;
        case AppStep.PILLAR_WIZARD:
            return <PillarDefinitionWizard 
                        onFinalize={handleFinalizePillars} 
                        onBack={() => dispatch({ type: 'SET_STEP', payload: AppStep.BUSINESS_INFO })} 
                   />;
        case AppStep.EAV_WIZARD:
            return <EavDiscoveryWizard 
                        onFinalize={handleFinalizeEavs} 
                        onBack={() => dispatch({ type: 'SET_STEP', payload: AppStep.PILLAR_WIZARD })} 
                   />;
        case AppStep.COMPETITOR_WIZARD:
            return <CompetitorRefinementWizard 
                        onFinalize={handleFinalizeCompetitors}
                        onBack={() => dispatch({ type: 'SET_STEP', payload: AppStep.EAV_WIZARD })}
                    />;
        case AppStep.PROJECT_DASHBOARD:
        case AppStep.PROJECT_WORKSPACE: // Default to dashboard
        default:
            return <ProjectDashboardContainer 
                        onInitiateDeleteMap={handleInitiateDeleteMap}
                        onBackToProjects={handleBackToProjectSelection}
                    />;
    }
};

export default ProjectWorkspace;
