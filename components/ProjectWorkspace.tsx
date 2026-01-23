
// components/ProjectWorkspace.tsx
import React from 'react';
import { useAppState } from '../state/appState';
import { AppStep, SEOPillars, SemanticTriple, TopicalMap, BusinessInfo, EnrichedTopic, FreshnessProfile, NAPData } from '../types';
import BusinessInfoForm from './BusinessInfoForm';
import {
    PillarDefinitionWizard,
    EavDiscoveryWizard,
    CompetitorRefinementWizard,
    WebsiteBlueprintWizard,
    type BlueprintConfig,
} from './wizards';
import ProjectDashboardContainer from './ProjectDashboardContainer';
import { getSupabaseClient } from '../services/supabaseClient';
import { verifiedDelete, verifiedBulkDelete } from '../services/verifiedDatabaseService';
import { useMapGeneration } from '../hooks/useMapGeneration';

const ProjectWorkspace: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { appStep, activeMapId, businessInfo } = state;
    const { handleFinalizeBlueprint, handleSkipBlueprint } = useMapGeneration(state, dispatch);

    const handleBackToDashboard = () => dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_DASHBOARD });
    const handleBackToProjectSelection = () => {
        dispatch({ type: 'SET_ACTIVE_PROJECT', payload: null });
        dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION });
    };

    const handleSaveBusinessInfo = async (formData: Partial<BusinessInfo>) => {
        if (!activeMapId) return;

        // Whitelist strategic fields to be saved with the map.
        // This prevents sensitive data like API keys from being saved in the map's JSON.
        // Include brandKit and authorProfile for content generation context.
        const strategicInfo: Partial<BusinessInfo> = {
            // Core business context
            seedKeyword: formData.seedKeyword,
            industry: formData.industry,
            valueProp: formData.valueProp,
            audience: formData.audience,
            language: formData.language,
            targetMarket: formData.targetMarket,
            // AI provider settings
            aiProvider: formData.aiProvider,
            aiModel: formData.aiModel,
            // Brand kit for content/image generation
            brandKit: formData.brandKit,
            // Author profile for E-E-A-T signals
            authorProfile: formData.authorProfile,
            // Domain info
            domain: formData.domain,
            projectName: formData.projectName,
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
        dispatch({ type: 'SET_COMPETITORS', payload: { mapId: activeMapId, competitors } });
        // Move to Blueprint Wizard instead of directly generating map
        dispatch({ type: 'SET_STEP', payload: AppStep.BLUEPRINT_WIZARD });
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

                        // Delete in order: briefs (by topic_id), topics, foundation_pages, navigation, then map
                        // Get topic IDs first - content_briefs uses topic_id, not map_id
                        const { data: topics } = await supabase.from('topics').select('id').eq('map_id', map.id);
                        const topicIds = (topics || []).map(t => t.id);

                        // Delete content_briefs by topic_id (cascade)
                        if (topicIds.length > 0) {
                            const briefsResult = await verifiedBulkDelete(
                                supabase,
                                { table: 'content_briefs', operationDescription: `delete briefs for map ${map.id}` },
                                { column: 'topic_id', operator: 'in', value: topicIds }
                            );
                            if (!briefsResult.success) {
                                console.warn(`[DeleteMap] Content briefs deletion issue:`, briefsResult.error);
                            }
                        }

                        // Delete topics - verified
                        if (topicIds.length > 0) {
                            const topicsResult = await verifiedBulkDelete(
                                supabase,
                                { table: 'topics', operationDescription: `delete topics for map ${map.id}` },
                                { column: 'map_id', operator: 'eq', value: map.id },
                                topicIds.length
                            );
                            if (!topicsResult.success) {
                                console.warn(`[DeleteMap] Topics deletion issue:`, topicsResult.error);
                            }
                        }

                        // Delete foundation pages and navigation (optional - may not exist)
                        const foundationResult = await verifiedBulkDelete(
                            supabase,
                            { table: 'foundation_pages', operationDescription: `delete foundation pages for map ${map.id}` },
                            { column: 'map_id', operator: 'eq', value: map.id }
                        );
                        if (!foundationResult.success && foundationResult.error && !foundationResult.error.includes('0 records')) {
                            console.warn(`[DeleteMap] Foundation pages deletion issue:`, foundationResult.error);
                        }

                        const navStructResult = await verifiedBulkDelete(
                            supabase,
                            { table: 'navigation_structures', operationDescription: `delete navigation structures for map ${map.id}` },
                            { column: 'map_id', operator: 'eq', value: map.id }
                        );
                        if (!navStructResult.success && navStructResult.error && !navStructResult.error.includes('0 records')) {
                            console.warn(`[DeleteMap] Navigation structures deletion issue:`, navStructResult.error);
                        }

                        const navSyncResult = await verifiedBulkDelete(
                            supabase,
                            { table: 'navigation_sync_status', operationDescription: `delete navigation sync status for map ${map.id}` },
                            { column: 'map_id', operator: 'eq', value: map.id }
                        );
                        if (!navSyncResult.success && navSyncResult.error && !navSyncResult.error.includes('0 records')) {
                            console.warn(`[DeleteMap] Navigation sync status deletion issue:`, navSyncResult.error);
                        }

                        // Delete the map itself - verified
                        const mapResult = await verifiedDelete(
                            supabase,
                            { table: 'topical_maps', operationDescription: `delete map "${map.name}"` },
                            { column: 'id', value: map.id }
                        );
                        if (!mapResult.success) {
                            throw new Error(mapResult.error || 'Map deletion verification failed');
                        }

                        dispatch({ type: 'DELETE_TOPICAL_MAP', payload: { mapId: map.id } });
                        dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Map "${map.name}" deleted (verified).` });
                    } catch (e) {
                        console.error('Delete map error:', e);
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
        case AppStep.BLUEPRINT_WIZARD: {
            const currentMap = state.topicalMaps.find(m => m.id === activeMapId);
            // AI settings ALWAYS from global user_settings, not map's business_info
            const mapBusinessInfo = currentMap?.business_info as Partial<BusinessInfo> || {};
            const { aiProvider: _ap, aiModel: _am, geminiApiKey: _g, openAiApiKey: _o, anthropicApiKey: _a, perplexityApiKey: _p, openRouterApiKey: _or, ...mapBusinessContext } = mapBusinessInfo;
            const effectiveBusinessInfo = {
                ...state.businessInfo,
                ...mapBusinessContext,
                // AI settings ALWAYS from global
                aiProvider: state.businessInfo.aiProvider,
                aiModel: state.businessInfo.aiModel,
            };
            return <WebsiteBlueprintWizard
                businessInfo={effectiveBusinessInfo}
                pillars={currentMap?.pillars}
                existingNAPData={state.websiteStructure?.napData}
                isLoading={!!state.isLoading.map}
                onComplete={handleFinalizeBlueprint}
                onSkip={handleSkipBlueprint}
                onBack={() => dispatch({ type: 'SET_STEP', payload: AppStep.COMPETITOR_WIZARD })}
            />;
        }
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
