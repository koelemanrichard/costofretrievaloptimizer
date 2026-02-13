import { useRef } from 'react';
import { AppStep, BusinessInfo, EnrichedTopic, FreshnessProfile, SemanticTriple } from '../types';
import { AppState, AppAction } from '../state/appState';
import type { BlueprintConfig } from '../components/wizards/WebsiteBlueprintWizard';
import { getSupabaseClient } from '../services/supabaseClient';
import { verifiedBulkInsert, verifiedUpdate } from '../services/verifiedDatabaseService';
import * as aiService from '../services/aiService';
import * as foundationPagesService from '../services/ai/foundationPages';
import { v4 as uuidv4 } from 'uuid';
import { slugify, cleanSlug } from '../utils/helpers';
import { validateEAVCoverage } from '../services/ai/eavCoverageValidator';
import { detectTitleCannibalization } from '../services/ai/clustering';
import { validateContentFlow } from '../services/ai/contentFlowValidator';
import { batchInferSerpData } from '../services/ai/serpInference';
import { buildSerpIntelligenceForMap } from '../config/prompts';
import type { SerpIntelligenceForMap } from '../config/prompts';
import { isProviderConfigured } from '../services/ai/providerDispatcher';
import { handleOperationError } from '../utils/errorHandling';
import { getMapSizeAdvisory } from '../utils/mapSizeAdvisory';

export const useMapGeneration = (
    state: AppState,
    dispatch: React.Dispatch<AppAction>
) => {
    const { activeMapId, businessInfo } = state;
    const isGeneratingRef = useRef(false);

    // Blueprint wizard completion - generates the map with blueprint config
    const handleFinalizeBlueprint = async (blueprintConfig: BlueprintConfig) => {
        if (isGeneratingRef.current) return;

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
        if (isGeneratingRef.current) return;
        await generateMapWithBlueprint(undefined);
    };

    // Shared map generation logic
    const generateMapWithBlueprint = async (blueprintConfig?: BlueprintConfig) => {
        // Re-entrance guard: prevent double-clicks from spawning parallel generations
        if (isGeneratingRef.current) {
            dispatch({ type: 'SET_NOTIFICATION', payload: { message: 'Map generation already in progress.', severity: 'warning' } });
            return;
        }
        isGeneratingRef.current = true;

        console.log('=== generateMapWithBlueprint START ===');
        console.log('activeMapId:', activeMapId);

        if (!activeMapId) {
            console.error('No activeMapId in generateMapWithBlueprint');
            isGeneratingRef.current = false;
            return;
        }
        const user = state.user;

        if (!user) {
            console.error('No user in generateMapWithBlueprint');
            dispatch({ type: 'SET_ERROR', payload: "User not authenticated. Cannot save map." });
            isGeneratingRef.current = false;
            return;
        }

        // Compute effective business info early — needed for API key validation
        const currentMapForValidation = state.topicalMaps.find(m => m.id === activeMapId);
        const mapBusinessInfoForValidation = currentMapForValidation?.business_info as Partial<BusinessInfo> || {};
        const { aiProvider: _ap2, aiModel: _am2, geminiApiKey: _g2, openAiApiKey: _o2, anthropicApiKey: _a2, perplexityApiKey: _p2, openRouterApiKey: _or2, ...mapBizCtx } = mapBusinessInfoForValidation;
        const effectiveBusinessInfoForValidation = {
            ...state.businessInfo,
            ...mapBizCtx,
            aiProvider: state.businessInfo.aiProvider,
            aiModel: state.businessInfo.aiModel,
        };

        // API key pre-validation: fail fast with a clear message instead of a cryptic provider error
        if (!isProviderConfigured(effectiveBusinessInfoForValidation)) {
            isGeneratingRef.current = false;
            dispatch({ type: 'SET_ERROR', payload: `No API key configured for ${effectiveBusinessInfoForValidation.aiProvider}. Add your API key in Settings before generating.` });
            return;
        }

        console.log('Setting loading state...');
        dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true, context: 'Step 1/6: Saving wizard configuration...' } });
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

            // 1. Save Wizard Data using verifiedUpdate for timeout + read-back verification
            console.log('Step 1: Saving wizard data to DB...');

            // Log data sizes for debugging
            const eavCount = currentMap.eavs?.length || 0;
            const competitorCount = currentMap.competitors?.length || 0;
            console.log(`Step 1a: Data sizes - EAVs: ${eavCount}, Competitors: ${competitorCount}`);

            // Use verifiedUpdate for timeout protection and read-back verification
            const wizardDataResult = await verifiedUpdate(
                supabase,
                { table: 'topical_maps', operationDescription: 'save wizard data (business info, pillars, EAVs, competitors)' },
                activeMapId,
                {
                    business_info: currentMap.business_info as any,
                    pillars: currentMap.pillars as any,
                    eavs: currentMap.eavs as any,
                    competitors: currentMap.competitors,
                },
                'id'
            );

            if (!wizardDataResult.success) {
                console.error('Wizard data save failed:', wizardDataResult.error);
                throw new Error(wizardDataResult.error || 'Failed to save wizard data');
            }
            console.log('Step 1 complete: Wizard data saved (verified)');

            // 2. Generate Initial Topics with AI
            // Use effective business info (global keys + map strategy)
            // AI settings ALWAYS from global user_settings, not map's business_info
            const mapBusinessInfo = currentMap.business_info as Partial<BusinessInfo> || {};
            const { aiProvider: _ap, aiModel: _am, geminiApiKey: _g, openAiApiKey: _o, anthropicApiKey: _a, perplexityApiKey: _p, openRouterApiKey: _or, ...mapBusinessContext } = mapBusinessInfo;
            const effectiveBusinessInfo = {
                ...state.businessInfo,
                ...mapBusinessContext,
                // AI settings ALWAYS from global
                aiProvider: state.businessInfo.aiProvider,
                aiModel: state.businessInfo.aiModel,
            };
            console.log('effectiveBusinessInfo.aiProvider:', effectiveBusinessInfo.aiProvider);

            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true, context: 'Step 2/6: Gathering SERP intelligence...' } });

            // NOTE: If pillars are missing here (shouldn't happen if flow is followed), we might want to throw.
            if (!currentMap.pillars || !currentMap.eavs) {
                console.error('Missing pillars or eavs:', { pillars: currentMap.pillars, eavs: currentMap.eavs });
                throw new Error("Missing pillars or EAVs for generation.");
            }

            // 2a. Gather SERP intelligence for pillar queries (non-blocking — falls back to no data)
            let serpIntel: SerpIntelligenceForMap | undefined;
            try {
                // Build seed queries from available pillar data
                const seedQueries: string[] = [currentMap.pillars.centralEntity];
                if (currentMap.pillars.sourceContext) seedQueries.push(`${currentMap.pillars.centralEntity} ${currentMap.pillars.sourceContext}`);
                if (currentMap.pillars.centralSearchIntent) seedQueries.push(currentMap.pillars.centralSearchIntent);
                // Add top EAV subjects as additional SERP queries
                if (currentMap.eavs) {
                    const uniqueSubjects = [...new Set(
                        currentMap.eavs
                            .map((e: any) => e.subject?.label)
                            .filter((l: any): l is string => typeof l === 'string' && l.length > 2)
                    )].slice(0, 3);
                    seedQueries.push(...uniqueSubjects);
                }
                const pillarQueries = seedQueries.slice(0, 6); // Limit to 6 queries to keep latency reasonable

                dispatch({
                    type: 'LOG_EVENT',
                    payload: { service: 'MapGeneration', message: `Inferring SERP landscape for ${pillarQueries.length} pillar queries...`, status: 'info', timestamp: Date.now() }
                });

                const serpResults = await batchInferSerpData(
                    pillarQueries,
                    effectiveBusinessInfo,
                    (completed, total) => {
                        dispatch({
                            type: 'LOG_EVENT',
                            payload: { service: 'MapGeneration', message: `SERP inference: ${completed}/${total} queries analyzed`, status: 'info', timestamp: Date.now() }
                        });
                    }
                );

                serpIntel = buildSerpIntelligenceForMap(pillarQueries, serpResults);
                dispatch({
                    type: 'LOG_EVENT',
                    payload: { service: 'MapGeneration', message: `SERP intelligence gathered: ${serpIntel.pillarInsights.length} pillar insights`, status: 'success', timestamp: Date.now() }
                });
            } catch (serpError) {
                // SERP inference is non-blocking — log and continue without it
                console.warn('[MapGeneration] SERP inference failed, continuing without:', serpError);
                dispatch({
                    type: 'LOG_EVENT',
                    payload: { service: 'MapGeneration', message: `SERP inference skipped: ${serpError instanceof Error ? serpError.message : 'unknown error'}`, status: 'warning', timestamp: Date.now() }
                });
            }

            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true, context: 'Step 3/6: Generating topics with AI...' } });
            console.log('Step 2: Generating initial topical map with AI...');

            const { coreTopics, outerTopics } = await aiService.generateInitialTopicalMap(
                effectiveBusinessInfo,
                currentMap.pillars,
                currentMap.eavs,
                currentMap.competitors || [],
                dispatch,
                serpIntel
            );

            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true, context: 'Step 4/6: Processing and validating topics...' } });

            // In-memory title dedup: AI can return duplicate titles across core/outer
            const seenTitles = new Set<string>();
            const dedupFilter = (topics: typeof coreTopics) => {
                const deduped = topics.filter(t => {
                    if (!t.title) return true; // let the isValidTopic filter handle missing titles
                    const key = t.title.trim().toLowerCase();
                    if (seenTitles.has(key)) return false;
                    seenTitles.add(key);
                    return true;
                });
                return deduped;
            };
            const dedupedCoreTopics = dedupFilter(coreTopics);
            const dedupedOuterTopics = dedupFilter(outerTopics);
            const totalDupsRemoved = (coreTopics.length + outerTopics.length) - (dedupedCoreTopics.length + dedupedOuterTopics.length);
            if (totalDupsRemoved > 0) {
                console.warn(`[MapGeneration] Removed ${totalDupsRemoved} duplicate topic titles from AI output`);
                dispatch({
                    type: 'LOG_EVENT',
                    payload: { service: 'MapGeneration', message: `Removed ${totalDupsRemoved} duplicate topic titles from AI output`, status: 'warning', timestamp: Date.now() },
                });
            }

            // 3. Process and ID assignment
            const topicMap = new Map<string, string>(); // Maps temp ID (e.g. "core_1") to real UUID
            const finalTopics: EnrichedTopic[] = [];

            // Helper to validate topic has required fields
            const isValidTopic = (t: any): boolean => t && t.title && typeof t.title === 'string' && t.title.trim().length > 0;

            // Process Core Topics first (filter out invalid ones)
            dedupedCoreTopics.filter(isValidTopic).forEach(core => {
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

            // Process Outer Topics (filter out invalid ones)
            dedupedOuterTopics.filter(isValidTopic).forEach(outer => {
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
            // Filter out any malformed topics (missing title) to prevent DB constraint violations
            const validTopics = finalTopics.filter(t => t.title && typeof t.title === 'string' && t.title.trim().length > 0);

            if (validTopics.length < finalTopics.length) {
                const skippedCount = finalTopics.length - validTopics.length;
                console.warn(`[MapGeneration] Filtered out ${skippedCount} malformed topics (missing title)`);
                dispatch({
                    type: 'LOG_EVENT', payload: {
                        service: 'MapGeneration',
                        message: `Warning: ${skippedCount} topics were skipped due to missing titles`,
                        status: 'warning',
                        timestamp: Date.now()
                    }
                });
            }

            // Validate EAV coverage across generated topics
            if (currentMap.eavs && currentMap.eavs.length > 0) {
                const eavCoverage = validateEAVCoverage(validTopics, currentMap.eavs as SemanticTriple[]);
                if (eavCoverage.warnings.length > 0) {
                    eavCoverage.warnings.forEach(w => {
                        dispatch({
                            type: 'LOG_EVENT',
                            payload: { service: 'MapGeneration', message: w, status: 'warning', timestamp: Date.now() }
                        });
                    });
                }
                console.log(`[MapGeneration] EAV Coverage: ${eavCoverage.coveragePercentage}% (${eavCoverage.coveredTriples.length}/${currentMap.eavs.length} triples covered)`);
            }

            // Check for cannibalization risks (title/query word overlap > 70%)
            const cannibalizationRisks = detectTitleCannibalization(validTopics);
            if (cannibalizationRisks.length > 0) {
                cannibalizationRisks.forEach(risk => {
                    dispatch({
                        type: 'LOG_EVENT',
                        payload: { service: 'MapGeneration', message: risk.recommendation, status: 'warning', timestamp: Date.now() },
                    });
                });
                console.warn(`[MapGeneration] ${cannibalizationRisks.length} cannibalization risks detected`);
            }

            // Validate content flow (informational topics should support monetization topics)
            const flowResult = validateContentFlow(validTopics);
            if (flowResult.issues.length > 0) {
                flowResult.issues.forEach(issue => {
                    dispatch({
                        type: 'LOG_EVENT',
                        payload: {
                            service: 'MapGeneration',
                            message: `[${issue.severity.toUpperCase()}] ${issue.monetizationTopic}: ${issue.missingFoundation}`,
                            status: issue.severity === 'warning' ? 'warning' : 'info',
                            timestamp: Date.now(),
                        },
                    });
                });
            }

            const dbTopics = validTopics.map(t => ({
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

            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true, context: `Step 5/6: Saving ${dbTopics.length} topics to database...` } });

            if (dbTopics.length > 0) {
                // Layer 1 dedup: delete existing topics for this map before inserting new ones
                try {
                    const { data: existingTopics } = await supabase
                        .from('topics')
                        .select('id')
                        .eq('map_id', activeMapId);

                    if (existingTopics && existingTopics.length > 0) {
                        console.log(`[MapGeneration] Replacing ${existingTopics.length} existing topics with ${dbTopics.length} newly generated topics`);
                        dispatch({
                            type: 'LOG_EVENT',
                            payload: { service: 'MapGeneration', message: `Replacing ${existingTopics.length} existing topics with ${dbTopics.length} newly generated topics`, status: 'info', timestamp: Date.now() },
                        });
                        await supabase
                            .from('topics')
                            .delete()
                            .eq('map_id', activeMapId);
                    }
                } catch (deleteError) {
                    // Non-blocking: duplicates are better than data loss
                    console.warn('[MapGeneration] Failed to delete existing topics before insert, continuing:', deleteError);
                }

                // Log topic_class distribution for debugging
                const monetizationCount = finalTopics.filter(t => t.topic_class === 'monetization').length;
                const informationalCount = finalTopics.filter(t => t.topic_class === 'informational').length;
                const undefinedCount = finalTopics.filter(t => !t.topic_class).length;
                dispatch({
                    type: 'LOG_EVENT', payload: {
                        service: 'MapGeneration',
                        message: `Saving ${dbTopics.length} topics to DB. topic_class distribution: monetization=${monetizationCount}, informational=${informationalCount}, undefined=${undefinedCount}`,
                        status: 'info',
                        timestamp: Date.now()
                    }
                });

                const insertResult = await verifiedBulkInsert(
                    supabase,
                    { table: 'topics', operationDescription: `insert ${dbTopics.length} generated topics` },
                    dbTopics,
                    'id'
                );

                if (!insertResult.success) {
                    throw new Error(insertResult.error || 'Topics insert verification failed');
                }

                dispatch({
                    type: 'LOG_EVENT', payload: {
                        service: 'MapGeneration',
                        message: `✓ Verified ${insertResult.data?.length || 0} topics saved to database`,
                        status: 'success',
                        timestamp: Date.now()
                    }
                });
            }

            // 5. Update State
            // NOTE: We use validTopics (filtered) to ensure state matches what was saved to DB.
            // Using sanitizeTopicFromDb might accidentally strip the 'metadata' properties.
            dispatch({ type: 'SET_TOPICS_FOR_MAP', payload: { mapId: activeMapId, topics: validTopics } });

            // 5b. Map size advisory notification
            const advisory = getMapSizeAdvisory(validTopics.length);
            if (advisory) {
                dispatch({
                    type: 'SET_NOTIFICATION',
                    payload: {
                        message: `${advisory.message} ${advisory.suggestion}`,
                        severity: advisory.level === 'critical' ? 'warning' : 'info'
                    }
                });
            }

            // 6. Generate Foundation Pages (non-blocking)
            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: true, context: 'Step 6/6: Generating foundation pages...' } });
            try {
                // Get selected pages from blueprint config, default to standard 5 pages
                const selectedPages = blueprintConfig?.selectedPages || ['homepage', 'about', 'contact', 'privacy', 'terms'];
                const napData = blueprintConfig?.napData;

                dispatch({
                    type: 'LOG_EVENT', payload: {
                        service: 'FoundationPages',
                        message: `Generating ${selectedPages.length} foundation pages...`,
                        status: 'info',
                        timestamp: Date.now()
                    }
                });

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

                dispatch({
                    type: 'LOG_EVENT', payload: {
                        service: 'FoundationPages',
                        message: `Generated ${savedPages.length} foundation pages and navigation structure`,
                        status: 'success',
                        timestamp: Date.now()
                    }
                });
            } catch (foundationError) {
                // Foundation page generation is non-blocking - log error but continue
                console.error('Foundation page generation failed:', foundationError);
                dispatch({
                    type: 'LOG_EVENT', payload: {
                        service: 'FoundationPages',
                        message: `Foundation page generation failed: ${foundationError instanceof Error ? foundationError.message : 'Unknown error'}`,
                        status: 'failure',
                        timestamp: Date.now()
                    }
                });
            }

            // 7. Redirect
            dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_DASHBOARD });

        } catch (e) {
            handleOperationError(e, dispatch, 'MapGeneration');
        } finally {
            isGeneratingRef.current = false;
            dispatch({ type: 'SET_LOADING', payload: { key: 'map', value: false } });
        }
    };

    return {
        handleFinalizeBlueprint,
        handleSkipBlueprint
    };
};
