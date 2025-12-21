
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
    businessInfo: BusinessInfo, pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[], dispatch: React.Dispatch<any>
): Promise<{ coreTopics: EnrichedTopic[], outerTopics: EnrichedTopic[] }> => {
    // Step 1: Get raw topics from AI provider
    const rawResult = await dispatchToProvider(businessInfo, {
        gemini: () => geminiService.generateInitialTopicalMap(businessInfo, pillars, eavs, competitors, dispatch),
        openai: () => openAiService.generateInitialTopicalMap(businessInfo, pillars, eavs, competitors, dispatch),
        anthropic: () => anthropicService.generateInitialTopicalMap(businessInfo, pillars, eavs, competitors, dispatch),
        perplexity: () => perplexityService.generateInitialTopicalMap(businessInfo, pillars, eavs, competitors, dispatch),
        openrouter: () => openRouterService.generateInitialTopicalMap(businessInfo, pillars, eavs, competitors, dispatch),
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

    // 2. Apply Momentum Algorithm for Publication Dates
    // Logic: Start 3 days from now, space items by 3 days.
    // This prevents "date clumping" and simulates a content calendar.
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 3); // Start 3 days out

    const enrichedWithDates = aiResults.map((item: any, index: number) => {
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
