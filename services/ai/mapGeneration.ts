
// services/ai/mapGeneration.ts
import { BusinessInfo, CandidateEntity, SourceContextOption, SEOPillars, SemanticTriple, EnrichedTopic, KnowledgeGraph, ExpansionMode, TopicViabilityResult, TopicBlueprint, WebsiteType } from '../../types';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { dispatchToProvider } from './providerDispatcher';
import { AppAction } from '../../state/appState';
import { getWebsiteTypeConfig, validateHubSpokeRatio } from '../../config/websiteTypeTemplates';
import { validateLanguageSettings } from '../../utils/languageUtils';
import React from 'react';

// ============================================
// CLUSTER ROLE ASSIGNMENT LOGIC
// Based on Holistic SEO best practices:
// - A "pillar" is a core topic with sufficient spokes (3+) to form a content cluster
// - All other topics are "cluster_content"
// ============================================

const DEFAULT_PILLAR_SPOKE_THRESHOLD = 3; // Default minimum spokes for a core topic to be considered a pillar

/**
 * Get the pillar spoke threshold based on website type
 * Uses the minimum hub-spoke ratio from the website type config
 */
const getPillarSpokeThreshold = (websiteType?: WebsiteType): number => {
    if (!websiteType) return DEFAULT_PILLAR_SPOKE_THRESHOLD;
    const config = getWebsiteTypeConfig(websiteType);
    return config.hubSpokeRatio.min;
};

/**
 * Assigns cluster_role to topics based on hub-spoke structure
 *
 * - Core topics with N+ spokes → pillar (hub pages) where N is based on website type
 * - Core topics with <N spokes → cluster_content (standalone content)
 * - Outer topics → cluster_content (spoke pages)
 *
 * This enables:
 * - Navigation prioritization of pillars in header
 * - PageRank flow optimization toward money pages
 * - Quality Node detection in navigation service
 */
export const assignClusterRoles = (
    coreTopics: EnrichedTopic[],
    outerTopics: EnrichedTopic[],
    websiteType?: WebsiteType
): { coreTopics: EnrichedTopic[], outerTopics: EnrichedTopic[], hubSpokeAnalysis: HubSpokeAnalysis } => {
    const threshold = getPillarSpokeThreshold(websiteType);
    const typeConfig = websiteType ? getWebsiteTypeConfig(websiteType) : null;

    // Count spokes per core topic
    const spokeCountMap = new Map<string, number>();
    for (const outer of outerTopics) {
        if (outer.parent_topic_id) {
            const current = spokeCountMap.get(outer.parent_topic_id) || 0;
            spokeCountMap.set(outer.parent_topic_id, current + 1);
        }
    }

    // Assign cluster_role to core topics and collect hub-spoke analysis
    const hubRatios: number[] = [];
    const enrichedCoreTopics = coreTopics.map(core => {
        const spokeCount = spokeCountMap.get(core.id) || 0;
        hubRatios.push(spokeCount);
        const clusterRole: 'pillar' | 'cluster_content' = spokeCount >= threshold
            ? 'pillar'
            : 'cluster_content';

        // Validate hub-spoke ratio for this core topic
        const ratioValidation = websiteType
            ? validateHubSpokeRatio(websiteType, spokeCount)
            : { valid: true, message: '' };

        return {
            ...core,
            cluster_role: clusterRole,
            metadata: {
                ...core.metadata,
                cluster_role: clusterRole,
                spoke_count: spokeCount,
                hub_spoke_valid: ratioValidation.valid,
                hub_spoke_message: ratioValidation.message
            }
        };
    });

    // Assign cluster_role to outer topics (all are cluster_content)
    const enrichedOuterTopics = outerTopics.map(outer => ({
        ...outer,
        cluster_role: 'cluster_content' as const,
        metadata: {
            ...outer.metadata,
            cluster_role: 'cluster_content'
        }
    }));

    // Calculate overall hub-spoke analysis
    const avgRatio = hubRatios.length > 0 ? hubRatios.reduce((a, b) => a + b, 0) / hubRatios.length : 0;
    const hubSpokeAnalysis: HubSpokeAnalysis = {
        averageRatio: avgRatio,
        optimalRatio: typeConfig?.hubSpokeRatio.optimal || 7,
        minRatio: typeConfig?.hubSpokeRatio.min || 3,
        maxRatio: typeConfig?.hubSpokeRatio.max || 10,
        isOptimal: typeConfig
            ? avgRatio >= typeConfig.hubSpokeRatio.min && avgRatio <= typeConfig.hubSpokeRatio.max
            : avgRatio >= 3,
        pillarsCount: enrichedCoreTopics.filter(t => t.cluster_role === 'pillar').length,
        totalCoreTopics: enrichedCoreTopics.length,
        recommendations: []
    };

    // Generate recommendations
    if (avgRatio < hubSpokeAnalysis.minRatio) {
        hubSpokeAnalysis.recommendations.push(
            `Average spoke count (${avgRatio.toFixed(1)}) is below minimum (${hubSpokeAnalysis.minRatio}). Consider adding more spoke pages per core topic.`
        );
    }
    if (avgRatio > hubSpokeAnalysis.maxRatio) {
        hubSpokeAnalysis.recommendations.push(
            `Average spoke count (${avgRatio.toFixed(1)}) exceeds maximum (${hubSpokeAnalysis.maxRatio}). Consider creating additional hub pages.`
        );
    }

    return { coreTopics: enrichedCoreTopics, outerTopics: enrichedOuterTopics, hubSpokeAnalysis };
};

// ============================================
// HUB-SPOKE AUTO-CORRECTION
// Automatically rebalances topic clusters when
// hub-spoke ratios fall outside website type bounds.
// ============================================

export interface HubSpokeCorrection {
    type: 'split_hub' | 'reassign_spoke' | 'promote_spoke';
    description: string;
    affectedTopicIds: string[];
}

/**
 * Auto-correct hub-spoke ratios by rebalancing topic clusters.
 *
 * For over-spoke hubs (spokeCount > max):
 *   - Promotes the spoke with most sub-relations to a new core topic (sub-hub)
 *   - Reassigns nearby spokes to the new sub-hub
 *
 * For under-spoke hubs (spokeCount < min):
 *   - Steals the most distant spoke from the most over-spoke hub
 *   - Reassigns it to the under-spoke hub
 *
 * Returns corrected topics + log of corrections applied.
 */
export const correctHubSpokeRatios = (
    coreTopics: EnrichedTopic[],
    outerTopics: EnrichedTopic[],
    websiteType?: WebsiteType
): { coreTopics: EnrichedTopic[], outerTopics: EnrichedTopic[], corrections: HubSpokeCorrection[] } => {
    if (!websiteType) {
        return { coreTopics, outerTopics, corrections: [] };
    }

    const config = getWebsiteTypeConfig(websiteType);
    const { min, max } = config.hubSpokeRatio;
    const corrections: HubSpokeCorrection[] = [];

    // Work with mutable copies
    let mutableCore = coreTopics.map(c => ({ ...c }));
    let mutableOuter = outerTopics.map(o => ({ ...o }));

    // Build spoke count map
    const getSpokeCount = (coreId: string) =>
        mutableOuter.filter(o => o.parent_topic_id === coreId).length;

    // ── Phase 1: Fix over-spoke hubs by splitting ──
    // Iterate until no hub exceeds max (with safety limit)
    for (let iteration = 0; iteration < 5; iteration++) {
        const overSpokeHub = mutableCore.find(c => getSpokeCount(c.id) > max);
        if (!overSpokeHub) break;

        const spokes = mutableOuter.filter(o => o.parent_topic_id === overSpokeHub.id);
        if (spokes.length <= max) break;

        // Pick the spoke with the longest title (heuristic: more specific = better sub-hub)
        const bestSubHub = spokes.reduce((best, s) =>
            s.title.length > best.title.length ? s : best, spokes[0]);

        // Find spokes most similar to the new sub-hub (by word overlap)
        const subHubWords = new Set(bestSubHub.title.toLowerCase().split(/\s+/).filter(w => w.length > 2));
        const scored = spokes
            .filter(s => s.id !== bestSubHub.id)
            .map(s => {
                const sWords = s.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                const overlap = sWords.filter(w => subHubWords.has(w)).length;
                return { spoke: s, overlap };
            })
            .sort((a, b) => b.overlap - a.overlap);

        // Move enough spokes to bring original hub to optimal range
        const spokesToMove = Math.min(
            Math.ceil((spokes.length - max) / 2) + 1,
            scored.length
        );
        const movedSpokes = scored.slice(0, spokesToMove).map(s => s.spoke);

        // Remove bestSubHub from outer, add to core
        mutableOuter = mutableOuter.filter(o => o.id !== bestSubHub.id);
        const newCore: EnrichedTopic = {
            ...bestSubHub,
            type: 'core',
            parent_topic_id: null,
            cluster_role: 'pillar',
            metadata: {
                ...bestSubHub.metadata,
                cluster_role: 'pillar',
                promoted_from: overSpokeHub.id,
            }
        };
        mutableCore.push(newCore);

        // Reassign moved spokes to the new sub-hub
        for (const spoke of movedSpokes) {
            const idx = mutableOuter.findIndex(o => o.id === spoke.id);
            if (idx >= 0) {
                mutableOuter[idx] = { ...mutableOuter[idx], parent_topic_id: bestSubHub.id };
            }
        }

        corrections.push({
            type: 'split_hub',
            description: `Split "${overSpokeHub.title}" (${spokes.length} spokes > max ${max}): promoted "${bestSubHub.title}" to sub-hub with ${movedSpokes.length} reassigned spokes`,
            affectedTopicIds: [overSpokeHub.id, bestSubHub.id, ...movedSpokes.map(s => s.id)],
        });
    }

    // ── Phase 2: Fix under-spoke hubs by stealing from over-spoke hubs ──
    for (let iteration = 0; iteration < 5; iteration++) {
        const underSpokeHub = mutableCore.find(c => {
            const count = getSpokeCount(c.id);
            return count > 0 && count < min; // Only fix hubs that have SOME spokes
        });
        if (!underSpokeHub) break;

        // Find the hub with the most spokes to steal from
        const donorHub = mutableCore
            .filter(c => c.id !== underSpokeHub.id)
            .map(c => ({ hub: c, count: getSpokeCount(c.id) }))
            .sort((a, b) => b.count - a.count)[0];

        if (!donorHub || donorHub.count <= min) break; // No donor has spokes to spare

        // Find the donor's spoke whose title is most similar to the under-spoke hub
        const underWords = new Set(underSpokeHub.title.toLowerCase().split(/\s+/).filter(w => w.length > 2));
        const donorSpokes = mutableOuter.filter(o => o.parent_topic_id === donorHub.hub.id);
        const bestMatch = donorSpokes
            .map(s => {
                const sWords = s.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                const overlap = sWords.filter(w => underWords.has(w)).length;
                return { spoke: s, overlap };
            })
            .sort((a, b) => b.overlap - a.overlap)[0];

        if (!bestMatch) break;

        // Reassign the spoke
        const idx = mutableOuter.findIndex(o => o.id === bestMatch.spoke.id);
        if (idx >= 0) {
            mutableOuter[idx] = { ...mutableOuter[idx], parent_topic_id: underSpokeHub.id };
        }

        corrections.push({
            type: 'reassign_spoke',
            description: `Reassigned "${bestMatch.spoke.title}" from "${donorHub.hub.title}" (${donorHub.count} spokes) to "${underSpokeHub.title}" (${getSpokeCount(underSpokeHub.id)} spokes) — below min ${min}`,
            affectedTopicIds: [underSpokeHub.id, donorHub.hub.id, bestMatch.spoke.id],
        });
    }

    return { coreTopics: mutableCore, outerTopics: mutableOuter, corrections };
};

/**
 * Hub-spoke analysis result
 */
export interface HubSpokeAnalysis {
    averageRatio: number;
    optimalRatio: number;
    minRatio: number;
    maxRatio: number;
    isOptimal: boolean;
    pillarsCount: number;
    totalCoreTopics: number;
    recommendations: string[];
}

export const suggestCentralEntityCandidates = (
    businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<CandidateEntity[]> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.suggestCentralEntityCandidates(businessInfo, dispatch),
        openai: () => openAiService.suggestCentralEntityCandidates(businessInfo, dispatch),
        anthropic: () => anthropicService.suggestCentralEntityCandidates(businessInfo, dispatch),
        perplexity: () => perplexityService.suggestCentralEntityCandidates(businessInfo, dispatch),
        openrouter: () => openRouterService.suggestCentralEntityCandidates(businessInfo, dispatch),
    });
};

export const suggestSourceContextOptions = (
    businessInfo: BusinessInfo, centralEntity: string, dispatch: React.Dispatch<any>
): Promise<SourceContextOption[]> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.suggestSourceContextOptions(businessInfo, centralEntity, dispatch),
        openai: () => openAiService.suggestSourceContextOptions(businessInfo, centralEntity, dispatch),
        anthropic: () => anthropicService.suggestSourceContextOptions(businessInfo, centralEntity, dispatch),
        perplexity: () => perplexityService.suggestSourceContextOptions(businessInfo, centralEntity, dispatch),
        openrouter: () => openRouterService.suggestSourceContextOptions(businessInfo, centralEntity, dispatch),
    });
};

export const suggestCentralSearchIntent = (
    businessInfo: BusinessInfo, centralEntity: string, sourceContext: string, dispatch: React.Dispatch<any>
): Promise<{ intent: string, reasoning: string }[]> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.suggestCentralSearchIntent(businessInfo, centralEntity, sourceContext, dispatch),
        openai: () => openAiService.suggestCentralSearchIntent(businessInfo, centralEntity, sourceContext, dispatch),
        anthropic: () => anthropicService.suggestCentralSearchIntent(businessInfo, centralEntity, sourceContext, dispatch),
        perplexity: () => perplexityService.suggestCentralSearchIntent(businessInfo, centralEntity, sourceContext, dispatch),
        openrouter: () => openRouterService.suggestCentralSearchIntent(businessInfo, centralEntity, sourceContext, dispatch),
    });
};

export const discoverCoreSemanticTriples = (
    businessInfo: BusinessInfo, pillars: SEOPillars, dispatch: React.Dispatch<any>
): Promise<SemanticTriple[]> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.discoverCoreSemanticTriples(businessInfo, pillars, dispatch),
        openai: () => openAiService.discoverCoreSemanticTriples(businessInfo, pillars, dispatch),
        anthropic: () => anthropicService.discoverCoreSemanticTriples(businessInfo, pillars, dispatch),
        perplexity: () => perplexityService.discoverCoreSemanticTriples(businessInfo, pillars, dispatch),
        openrouter: () => openRouterService.discoverCoreSemanticTriples(businessInfo, pillars, dispatch),
    });
};

export const expandSemanticTriples = (
    businessInfo: BusinessInfo, pillars: SEOPillars, existingTriples: SemanticTriple[], dispatch: React.Dispatch<any>, count: number = 15
): Promise<SemanticTriple[]> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.expandSemanticTriples(businessInfo, pillars, existingTriples, dispatch, count),
        openai: () => openAiService.expandSemanticTriples(businessInfo, pillars, existingTriples, dispatch, count),
        anthropic: () => anthropicService.expandSemanticTriples(businessInfo, pillars, existingTriples, dispatch, count),
        perplexity: () => perplexityService.expandSemanticTriples(businessInfo, pillars, existingTriples, dispatch, count),
        openrouter: () => openRouterService.expandSemanticTriples(businessInfo, pillars, existingTriples, dispatch, count),
    });
};

export const generateInitialTopicalMap = async (
    businessInfo: BusinessInfo, pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[], dispatch: React.Dispatch<any>,
    serpIntel?: import('../../config/prompts').SerpIntelligenceForMap
): Promise<{ coreTopics: EnrichedTopic[], outerTopics: EnrichedTopic[] }> => {
    // Validate language and region settings before generation
    const validation = validateLanguageSettings(businessInfo.language, businessInfo.region);
    if (validation.warnings.length > 0) {
        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'MapGeneration',
                message: `Language/Region Settings Warning: ${validation.warnings.join(' | ')}`,
                status: 'warning',
                timestamp: Date.now()
            }
        });
    }

    // Step 1: Get raw topics from AI provider (with SERP intelligence if available)
    const rawResult = await dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateInitialTopicalMap(businessInfo, pillars, eavs, competitors, dispatch, serpIntel),
        openai: () => openAiService.generateInitialTopicalMap(businessInfo, pillars, eavs, competitors, dispatch, serpIntel),
        anthropic: () => anthropicService.generateInitialTopicalMap(businessInfo, pillars, eavs, competitors, dispatch, serpIntel),
        perplexity: () => perplexityService.generateInitialTopicalMap(businessInfo, pillars, eavs, competitors, dispatch, serpIntel),
        openrouter: () => openRouterService.generateInitialTopicalMap(businessInfo, pillars, eavs, competitors, dispatch, serpIntel),
    });

    // Step 2: Apply cluster_role assignment based on hub-spoke structure (website type aware)
    const threshold = getPillarSpokeThreshold(businessInfo.websiteType);
    const enrichedResult = assignClusterRoles(rawResult.coreTopics, rawResult.outerTopics, businessInfo.websiteType);

    // Log the pillar assignment results with hub-spoke analysis
    const { hubSpokeAnalysis } = enrichedResult;
    dispatch({
        type: 'LOG_EVENT',
        payload: {
            service: 'MapGeneration',
            message: `Cluster role assignment complete: ${hubSpokeAnalysis.pillarsCount} pillars identified (${threshold}+ spokes threshold)`,
            status: hubSpokeAnalysis.isOptimal ? 'info' : 'warning',
            timestamp: Date.now(),
            data: {
                totalCore: enrichedResult.coreTopics.length,
                pillars: hubSpokeAnalysis.pillarsCount,
                clusterContent: enrichedResult.coreTopics.length - hubSpokeAnalysis.pillarsCount,
                hubSpokeAnalysis: {
                    averageRatio: hubSpokeAnalysis.averageRatio.toFixed(1),
                    optimalRatio: hubSpokeAnalysis.optimalRatio,
                    isOptimal: hubSpokeAnalysis.isOptimal,
                    recommendations: hubSpokeAnalysis.recommendations
                }
            }
        }
    });

    // Log recommendations if hub-spoke ratio is not optimal
    if (hubSpokeAnalysis.recommendations.length > 0) {
        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'MapGeneration',
                message: `Hub-Spoke Recommendations: ${hubSpokeAnalysis.recommendations.join(' ')}`,
                status: 'warning',
                timestamp: Date.now()
            }
        });
    }

    // Step 3: Auto-correct hub-spoke ratios if outside bounds
    if (!hubSpokeAnalysis.isOptimal) {
        const correctionResult = correctHubSpokeRatios(
            enrichedResult.coreTopics,
            enrichedResult.outerTopics,
            businessInfo.websiteType
        );

        if (correctionResult.corrections.length > 0) {
            // Log each correction
            correctionResult.corrections.forEach(c => {
                dispatch({
                    type: 'LOG_EVENT',
                    payload: {
                        service: 'MapGeneration',
                        message: `Hub-Spoke Auto-Fix (${c.type}): ${c.description}`,
                        status: 'info',
                        timestamp: Date.now()
                    }
                });
            });

            // Re-run cluster role assignment on corrected topics
            const reEnriched = assignClusterRoles(
                correctionResult.coreTopics,
                correctionResult.outerTopics,
                businessInfo.websiteType
            );

            dispatch({
                type: 'LOG_EVENT',
                payload: {
                    service: 'MapGeneration',
                    message: `Hub-Spoke corrected: ${correctionResult.corrections.length} adjustment(s). New ratio: ${reEnriched.hubSpokeAnalysis.averageRatio.toFixed(1)} (was ${hubSpokeAnalysis.averageRatio.toFixed(1)})`,
                    status: reEnriched.hubSpokeAnalysis.isOptimal ? 'success' : 'warning',
                    timestamp: Date.now()
                }
            });

            // Detect orphans in corrected set
            const correctedAll = [...reEnriched.coreTopics, ...reEnriched.outerTopics];
            const correctedOrphans = correctedAll.filter(t =>
                !t.parent_topic_id && t.cluster_role !== 'pillar' && t.cluster_role !== 'cluster_content'
            );
            if (correctedOrphans.length > 0) {
                dispatch({
                    type: 'LOG_EVENT',
                    payload: {
                        service: 'MapGeneration',
                        message: `${correctedOrphans.length} orphan topic(s) detected after correction: ${correctedOrphans.slice(0, 3).map(t => t.title).join(', ')}${correctedOrphans.length > 3 ? ` +${correctedOrphans.length - 3} more` : ''}`,
                        status: 'warning',
                        timestamp: Date.now(),
                    }
                });
            }

            return { coreTopics: reEnriched.coreTopics, outerTopics: reEnriched.outerTopics };
        }
    }

    // Step 4: Detect orphan topics (no parent, no cluster)
    const allTopics = [...enrichedResult.coreTopics, ...enrichedResult.outerTopics];
    const orphans = allTopics.filter(t =>
        !t.parent_topic_id && t.cluster_role !== 'pillar' && t.cluster_role !== 'cluster_content'
    );
    if (orphans.length > 0) {
        dispatch({
            type: 'LOG_EVENT',
            payload: {
                service: 'MapGeneration',
                message: `${orphans.length} orphan topic(s) detected with no parent or cluster assignment: ${orphans.slice(0, 3).map(t => t.title).join(', ')}${orphans.length > 3 ? ` +${orphans.length - 3} more` : ''}`,
                status: 'warning',
                timestamp: Date.now(),
            }
        });
    }

    return { coreTopics: enrichedResult.coreTopics, outerTopics: enrichedResult.outerTopics };
};

export const addTopicIntelligently = (
    newTopicTitle: string, newTopicDescription: string, allTopics: EnrichedTopic[], businessInfo: BusinessInfo, dispatch: React.Dispatch<AppAction>
): Promise<{ parentTopicId: string | null; type: 'core' | 'outer' }> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.addTopicIntelligently(newTopicTitle, newTopicDescription, allTopics, businessInfo, dispatch),
        openai: () => openAiService.addTopicIntelligently(newTopicTitle, newTopicDescription, allTopics, businessInfo, dispatch) as Promise<{ parentTopicId: string | null; type: 'core' | 'outer' }>,
        anthropic: () => anthropicService.addTopicIntelligently(newTopicTitle, newTopicDescription, allTopics, businessInfo, dispatch) as Promise<{ parentTopicId: string | null; type: 'core' | 'outer' }>,
        perplexity: () => perplexityService.addTopicIntelligently(newTopicTitle, newTopicDescription, allTopics, businessInfo, dispatch) as Promise<{ parentTopicId: string | null; type: 'core' | 'outer' }>,
        openrouter: () => openRouterService.addTopicIntelligently(newTopicTitle, newTopicDescription, allTopics, businessInfo, dispatch) as Promise<{ parentTopicId: string | null; type: 'core' | 'outer' }>,
    });
};

export const expandCoreTopic = (
    businessInfo: BusinessInfo, pillars: SEOPillars, coreTopicToExpand: EnrichedTopic, allTopics: EnrichedTopic[], knowledgeGraph: KnowledgeGraph, dispatch: React.Dispatch<AppAction>, mode: ExpansionMode = 'CONTEXT', userContext?: string
): Promise<{title: string, description: string}[]> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.expandCoreTopic(businessInfo, pillars, coreTopicToExpand, allTopics, knowledgeGraph, dispatch, mode, userContext),
        openai: () => openAiService.expandCoreTopic(businessInfo, pillars, coreTopicToExpand, allTopics, knowledgeGraph, dispatch, mode, userContext),
        anthropic: () => anthropicService.expandCoreTopic(businessInfo, pillars, coreTopicToExpand, allTopics, knowledgeGraph, dispatch, mode, userContext),
        perplexity: () => perplexityService.expandCoreTopic(businessInfo, pillars, coreTopicToExpand, allTopics, knowledgeGraph, dispatch, mode, userContext),
        openrouter: () => openRouterService.expandCoreTopic(businessInfo, pillars, coreTopicToExpand, allTopics, knowledgeGraph, dispatch, mode, userContext),
    });
};

export const analyzeTopicViability = (
    topic: string, description: string, businessInfo: BusinessInfo, dispatch: React.Dispatch<AppAction>
): Promise<TopicViabilityResult> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.analyzeTopicViability(topic, description, businessInfo, dispatch),
        openai: () => openAiService.analyzeTopicViability(topic, description, businessInfo, dispatch) as Promise<TopicViabilityResult>,
        anthropic: () => anthropicService.analyzeTopicViability(topic, description, businessInfo, dispatch) as Promise<TopicViabilityResult>,
        perplexity: () => perplexityService.analyzeTopicViability(topic, description, businessInfo, dispatch) as Promise<TopicViabilityResult>,
        openrouter: () => openRouterService.analyzeTopicViability(topic, description, businessInfo, dispatch) as Promise<TopicViabilityResult>,
    });
};

export const generateCoreTopicSuggestions = (
    userThoughts: string, businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<{ title: string, description: string, reasoning: string }[]> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateCoreTopicSuggestions(userThoughts, businessInfo, dispatch),
        openai: () => openAiService.generateCoreTopicSuggestions(userThoughts, businessInfo, dispatch),
        anthropic: () => anthropicService.generateCoreTopicSuggestions(userThoughts, businessInfo, dispatch),
        perplexity: () => perplexityService.generateCoreTopicSuggestions(userThoughts, businessInfo, dispatch),
        openrouter: () => openRouterService.generateCoreTopicSuggestions(userThoughts, businessInfo, dispatch),
    });
};

export const generateStructuredTopicSuggestions = (
    userThoughts: string,
    existingCoreTopics: { title: string, id: string }[],
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<{ title: string, description: string, type: 'core' | 'outer', suggestedParent: string }[]> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateStructuredTopicSuggestions(userThoughts, existingCoreTopics, businessInfo, dispatch),
        openai: () => openAiService.generateStructuredTopicSuggestions(userThoughts, existingCoreTopics, businessInfo, dispatch),
        anthropic: () => anthropicService.generateStructuredTopicSuggestions(userThoughts, existingCoreTopics, businessInfo, dispatch),
        perplexity: () => perplexityService.generateStructuredTopicSuggestions(userThoughts, existingCoreTopics, businessInfo, dispatch),
        openrouter: () => openRouterService.generateStructuredTopicSuggestions(userThoughts, existingCoreTopics, businessInfo, dispatch),
    });
};

export const enrichTopicMetadata = async (
    topics: {id: string, title: string, description: string}[],
    businessInfo: BusinessInfo,
    dispatch: React.Dispatch<any>
): Promise<{ 
    id: string, 
    canonical_query: string, 
    query_network: string[], 
    url_slug_hint: string, 
    attribute_focus: string, 
    query_type: string, 
    topical_border_note: string,
    planned_publication_date: string
}[]> => {
    
    // 1. Call AI for semantic data
    const aiResults = await dispatchToProvider(businessInfo, {
        gemini: () => geminiService.enrichTopicMetadata(topics, businessInfo, dispatch),
        openai: () => openAiService.enrichTopicMetadata(topics, businessInfo, dispatch),
        anthropic: () => anthropicService.enrichTopicMetadata(topics, businessInfo, dispatch),
        perplexity: () => perplexityService.enrichTopicMetadata(topics, businessInfo, dispatch),
        openrouter: () => openRouterService.enrichTopicMetadata(topics, businessInfo, dispatch),
    });

    // 2. Dependency-aware publication scheduling
    // Sort: informational parents first, then monetization children
    // This ensures foundational content is published before commercial content
    const sortedForPublication = [...aiResults].sort((a: any, b: any) => {
        // Informational before monetization
        const classOrder: Record<string, number> = { informational: 0, monetization: 1 };
        const aClass = classOrder[a.topic_class] ?? 0;
        const bClass = classOrder[b.topic_class] ?? 0;
        if (aClass !== bClass) return aClass - bClass;

        // Parents before children
        if (a.id === b.parent_topic_id) return -1;
        if (b.id === a.parent_topic_id) return 1;

        // Core before outer
        const typeOrder: Record<string, number> = { core: 0, outer: 1 };
        const aType = typeOrder[a.type] ?? 1;
        const bType = typeOrder[b.type] ?? 1;
        return aType - bType;
    });

    // Assign dates with 3-day spacing based on dependency-sorted order
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 3); // Start 3 days out

    const enrichedWithDates = sortedForPublication.map((item: any, index: number) => {
        const pubDate = new Date(baseDate);
        pubDate.setDate(baseDate.getDate() + (index * 3)); // 3-day spacing
        return {
            ...item,
            planned_publication_date: pubDate.toISOString().split('T')[0] // YYYY-MM-DD
        };
    });

    return enrichedWithDates;
};

export const generateTopicBlueprints = (
    topics: { title: string, id: string }[],
    businessInfo: BusinessInfo,
    pillars: SEOPillars,
    dispatch: React.Dispatch<any>
): Promise<{ id: string, blueprint: TopicBlueprint }[]> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateTopicBlueprints(topics, businessInfo, pillars, dispatch),
        openai: () => openAiService.generateTopicBlueprints(topics, businessInfo, pillars, dispatch),
        anthropic: () => anthropicService.generateTopicBlueprints(topics, businessInfo, pillars, dispatch),
        perplexity: () => perplexityService.generateTopicBlueprints(topics, businessInfo, pillars, dispatch),
        openrouter: () => openRouterService.generateTopicBlueprints(topics, businessInfo, pillars, dispatch),
    });
};
