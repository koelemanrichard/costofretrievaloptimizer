
// components/ProjectWorkspace.tsx
import React from 'react';
import { useAppState } from '../state/appState';
import { AppStep, SEOPillars, SemanticTriple, TopicalMap, BusinessInfo, EnrichedTopic, FreshnessProfile, NAPData } from '../types';
import BusinessInfoForm from './BusinessInfoForm';
import PillarDefinitionWizard from './PillarDefinitionWizard';
import EavDiscoveryWizard from './EavDiscoveryWizard';
import CompetitorRefinementWizard from './CompetitorRefinementWizard';
import { WebsiteBlueprintWizard, BlueprintConfig } from './WebsiteBlueprintWizard';
import ProjectDashboardContainer from './ProjectDashboardContainer';
import { getSupabaseClient } from '../services/supabaseClient';
import * as aiService from '../services/aiService';
import * as foundationPagesService from '../services/ai/foundationPages';
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

    // Blueprint wizard completion - generates the map with blueprint config
    const handleFinalizeBlueprint = async (blueprintConfig: BlueprintConfig) => {
        console.log('=== handleFinalizeBlueprint START ===');
        console.log('blueprintConfig:', blueprintConfig);
        console.log('activeMapId:', activeMapId);
        console.log('state.user:', state.user);

        if (!activeMapId) {
            console.error('No activeMapId - cannot proceed');
            dispatch({ type: 'SET_ERROR', payload: "No active map selected." });
            return;
        }
        const user = state.user;

        if (!user) {
             console.error('No user - cannot proceed');
             dispatch({ type: 'SET_ERROR', payload: "User not authenticated. Cannot save map." });
             return;
        }

        console.log('Dispatching SET_NAP_DATA...');
        // Store blueprint config in state for later use
        dispatch({ type: 'SET_NAP_DATA', payload: blueprintConfig.napData });

        // Continue with map generation
        console.log('Calling generateMapWithBlueprint...');
        try {
            await generateMapWithBlueprint(blueprintConfig);
            console.log('=== handleFinalizeBlueprint SUCCESS ===');
        } catch (e) {
            console.error('Error in generateMapWithBlueprint:', e);
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to generate map.' });
        }
    };

    // Skip blueprint - generate map without blueprint config
    const handleSkipBlueprint = async () => {
        await generateMapWithBlueprint(undefined);
    };

    // Shared map generation logic
    const generateMapWithBlueprint = async (blueprintConfig?: BlueprintConfig) => {
        console.log('=== generateMapWithBlueprint START ===');
        console.log('activeMapId:', activeMapId);

        if (!activeMapId) {
            console.error('No activeMapId in generateMapWithBlueprint');
            return;
        }
        const user = state.user;

        if (!user) {
             console.error('No user in generateMapWithBlueprint');
             dispatch({ type: 'SET_ERROR', payload: "User not authenticated. Cannot save map." });
             return;
        }

        console.log('Setting loading state...');
        dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true } });
        try {
            console.log('Getting supabase client...');
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            console.log('Finding current map in state.topicalMaps:', state.topicalMaps.length, 'maps');
            const currentMap = state.topicalMaps.find(m => m.id === activeMapId);
            console.log('Found currentMap:', currentMap ? 'yes' : 'no');
            if (!currentMap) throw new Error("Active map not found in state");

            console.log('currentMap.pillars:', currentMap.pillars);
            console.log('currentMap.eavs:', currentMap.eavs);
            console.log('currentMap.competitors:', currentMap.competitors);

            // 1. Save Wizard Data
            console.log('Step 1: Saving wizard data to DB...');
            const { error: updateError } = await supabase
                .from('topical_maps')
                .update({
                    business_info: currentMap.business_info as any,
                    pillars: currentMap.pillars as any,
                    eavs: currentMap.eavs as any,
                    competitors: currentMap.competitors,
                })
                .eq('id', activeMapId);

            if (updateError) {
                console.error('DB update error:', updateError);
                throw updateError;
            }
            console.log('Step 1 complete: Wizard data saved');

            // 2. Generate Initial Topics with AI
            // Use effective business info (global keys + map strategy)
            const effectiveBusinessInfo = {
                ...state.businessInfo,
                ...(currentMap.business_info as Partial<BusinessInfo> || {})
            };
            console.log('effectiveBusinessInfo.aiProvider:', effectiveBusinessInfo.aiProvider);

            // NOTE: If pillars are missing here (shouldn't happen if flow is followed), we might want to throw.
            if (!currentMap.pillars || !currentMap.eavs) {
                console.error('Missing pillars or eavs:', { pillars: currentMap.pillars, eavs: currentMap.eavs });
                throw new Error("Missing pillars or EAVs for generation.");
            }

            console.log('Step 2: Generating initial topical map with AI...');

            const { coreTopics, outerTopics } = await aiService.generateInitialTopicalMap(
                effectiveBusinessInfo,
                currentMap.pillars,
                currentMap.eavs,
                currentMap.competitors || [],
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

                const { error: insertError } = await supabase.from('topics').insert(dbTopics);
                if (insertError) throw insertError;
            }

            // 5. Update State
            // NOTE: We use finalTopics directly here. Using sanitizeTopicFromDb might accidentally strip
            // the 'metadata' properties if the function expects a different DB structure than the flat object we just created.
            dispatch({ type: 'SET_TOPICS_FOR_MAP', payload: { mapId: activeMapId, topics: finalTopics } });

            // 6. Generate Foundation Pages (non-blocking)
            try {
                // Get selected pages from blueprint config, default to standard 5 pages
                const selectedPages = blueprintConfig?.selectedPages || ['homepage', 'about', 'contact', 'privacy', 'terms'];
                const napData = blueprintConfig?.napData;

                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'FoundationPages',
                    message: `Generating ${selectedPages.length} foundation pages...`,
                    status: 'info',
                    timestamp: Date.now()
                }});

                const foundationResult = await foundationPagesService.generateFoundationPages(
                    effectiveBusinessInfo,
                    currentMap.pillars,
                    dispatch,
                    selectedPages // Pass selected pages to filter generation
                );

                const pagesToSave = foundationPagesService.prepareFoundationPagesForSave(
                    foundationResult,
                    activeMapId,
                    user.id,
                    napData // Pass NAP data from blueprint wizard
                );

                const savedPages = await foundationPagesService.saveFoundationPages(
                    activeMapId,
                    user.id,
                    pagesToSave,
                    effectiveBusinessInfo.supabaseUrl,
                    effectiveBusinessInfo.supabaseAnonKey
                );

                // Generate navigation structure based on foundation pages and core topics
                const coreTopicsForNav = finalTopics.filter(t => t.type === 'core');
                const navigation = await foundationPagesService.generateDefaultNavigation(
                    savedPages,
                    coreTopicsForNav,
                    effectiveBusinessInfo,
                    dispatch
                );

                const savedNavigation = await foundationPagesService.saveNavigationStructure(
                    activeMapId,
                    user.id,
                    { ...navigation, map_id: activeMapId }
                );

                // Update state with foundation pages and navigation
                dispatch({ type: 'SET_FOUNDATION_PAGES', payload: savedPages });
                dispatch({ type: 'SET_NAVIGATION', payload: savedNavigation });

                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'FoundationPages',
                    message: `Generated ${savedPages.length} foundation pages and navigation structure`,
                    status: 'success',
                    timestamp: Date.now()
                }});
            } catch (foundationError) {
                // Foundation page generation is non-blocking - log error but continue
                console.error('Foundation page generation failed:', foundationError);
                dispatch({ type: 'LOG_EVENT', payload: {
                    service: 'FoundationPages',
                    message: `Foundation page generation failed: ${foundationError instanceof Error ? foundationError.message : 'Unknown error'}`,
                    status: 'failure',
                    timestamp: Date.now()
                }});
            }

            // 7. Redirect
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

                        // Delete in order: briefs (by topic_id), topics, foundation_pages, navigation, then map
                        // Get topic IDs first - content_briefs uses topic_id, not map_id
                        const { data: topics } = await supabase.from('topics').select('id').eq('map_id', map.id);
                        const topicIds = (topics || []).map(t => t.id);

                        // Delete content_briefs by topic_id
                        for (const topicId of topicIds) {
                            await supabase.from('content_briefs').delete().eq('topic_id', topicId);
                        }

                        // Delete topics
                        await supabase.from('topics').delete().eq('map_id', map.id);

                        // Delete foundation pages and navigation (may not exist, ignore errors)
                        await supabase.from('foundation_pages').delete().eq('map_id', map.id).then(() => {}, () => {});
                        await supabase.from('navigation_structures').delete().eq('map_id', map.id).then(() => {}, () => {});
                        await supabase.from('navigation_sync_status').delete().eq('map_id', map.id).then(() => {}, () => {});

                        // Delete the map itself
                        const { error } = await supabase.from('topical_maps').delete().eq('id', map.id);
                        if (error) throw error;

                        dispatch({ type: 'DELETE_TOPICAL_MAP', payload: { mapId: map.id } });
                        dispatch({ type: 'SET_NOTIFICATION', payload: `Map "${map.name}" deleted.` });
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
            const effectiveBusinessInfo = {
                ...state.businessInfo,
                ...(currentMap?.business_info as Partial<BusinessInfo> || {})
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
