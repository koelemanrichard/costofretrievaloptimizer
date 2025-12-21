import { BusinessInfo, EnrichedTopic, MergeSuggestion, KnowledgeGraph as KnowledgeGraphType } from '../../types';
import * as geminiService from '../geminiService';
import * as openAiService from '../openAiService';
import * as anthropicService from '../anthropicService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';
import { dispatchToProvider } from './providerDispatcher';
import { AppAction } from '../../state/appState';
import React from 'react';
import { KnowledgeGraph, SemanticDistanceResult } from '../../lib/knowledgeGraph';

// =============================================================================
// SEMANTIC DISTANCE-BASED CLUSTERING
// =============================================================================

/**
 * Cluster interface for semantic distance-based grouping
 */
export interface SemanticCluster {
    id: string;
    centralTopic: EnrichedTopic;
    members: EnrichedTopic[];
    avgDistance: number;
    cohesion: number; // 0-1, higher = more cohesive
}

/**
 * Linking candidate with semantic distance info
 */
export interface LinkingCandidate {
    topic: EnrichedTopic;
    distance: SemanticDistanceResult;
    relevanceScore: number;
}

/**
 * Cluster topics using semantic distance from knowledge graph.
 * Uses hierarchical clustering with distance threshold.
 */
export function clusterTopicsSemanticDistance(
    topics: EnrichedTopic[],
    knowledgeGraph: KnowledgeGraph,
    distanceThreshold: number = 0.5
): SemanticCluster[] {
    if (topics.length === 0) return [];

    // Build distance matrix for topics
    const distances: Map<string, Map<string, number>> = new Map();

    for (const topicA of topics) {
        distances.set(topicA.id, new Map());
        for (const topicB of topics) {
            if (topicA.id === topicB.id) {
                distances.get(topicA.id)!.set(topicB.id, 0);
            } else {
                const result = knowledgeGraph.calculateSemanticDistance(
                    topicA.title,
                    topicB.title
                );
                distances.get(topicA.id)!.set(topicB.id, result.distance);
            }
        }
    }

    // Hierarchical agglomerative clustering
    const clusters: SemanticCluster[] = [];
    const assigned = new Set<string>();
    let clusterId = 1;

    // Find cluster seeds (topics with most close neighbors)
    const neighborCounts = topics.map(topic => {
        let closeNeighbors = 0;
        for (const other of topics) {
            if (topic.id !== other.id) {
                const dist = distances.get(topic.id)?.get(other.id) || 1;
                if (dist < distanceThreshold) closeNeighbors++;
            }
        }
        return { topic, closeNeighbors };
    });

    // Sort by neighbor count (descending) to find best cluster seeds
    neighborCounts.sort((a, b) => b.closeNeighbors - a.closeNeighbors);

    // Build clusters starting from seeds
    for (const { topic: seed } of neighborCounts) {
        if (assigned.has(seed.id)) continue;

        const members: EnrichedTopic[] = [seed];
        assigned.add(seed.id);

        // Find all topics within threshold distance from seed
        for (const candidate of topics) {
            if (assigned.has(candidate.id)) continue;

            const dist = distances.get(seed.id)?.get(candidate.id) || 1;
            if (dist < distanceThreshold) {
                members.push(candidate);
                assigned.add(candidate.id);
            }
        }

        // Calculate cluster metrics
        let totalDist = 0;
        let pairCount = 0;
        for (let i = 0; i < members.length; i++) {
            for (let j = i + 1; j < members.length; j++) {
                totalDist += distances.get(members[i].id)?.get(members[j].id) || 0;
                pairCount++;
            }
        }
        const avgDistance = pairCount > 0 ? totalDist / pairCount : 0;
        const cohesion = 1 - avgDistance; // Higher = more cohesive

        clusters.push({
            id: `cluster_${clusterId++}`,
            centralTopic: seed,
            members,
            avgDistance: Math.round(avgDistance * 100) / 100,
            cohesion: Math.round(cohesion * 100) / 100
        });
    }

    return clusters;
}

/**
 * Find linking candidates for a topic using semantic distance.
 * Returns topics in the optimal linking range (0.3-0.7 distance).
 */
export function findSemanticLinkingCandidates(
    targetTopic: EnrichedTopic,
    allTopics: EnrichedTopic[],
    knowledgeGraph: KnowledgeGraph,
    limit: number = 10
): LinkingCandidate[] {
    const candidates: LinkingCandidate[] = [];

    for (const topic of allTopics) {
        if (topic.id === targetTopic.id) continue;

        const distanceResult = knowledgeGraph.calculateSemanticDistance(
            targetTopic.title,
            topic.title
        );

        if (distanceResult.shouldLink) {
            // Calculate relevance score (highest in middle of range)
            const distFromOptimal = Math.abs(distanceResult.distance - 0.5);
            const relevanceScore = 1 - (distFromOptimal * 2); // 1.0 at 0.5, 0.0 at 0.0 or 1.0

            candidates.push({
                topic,
                distance: distanceResult,
                relevanceScore: Math.round(relevanceScore * 100) / 100
            });
        }
    }

    // Sort by relevance score (highest first)
    candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return candidates.slice(0, limit);
}

/**
 * Identify cannibalization risks between topics.
 * Returns pairs of topics that are too similar (distance < 0.2).
 */
export function findCannibalizationRisks(
    topics: EnrichedTopic[],
    knowledgeGraph: KnowledgeGraph
): Array<{
    topicA: EnrichedTopic;
    topicB: EnrichedTopic;
    distance: number;
    recommendation: string;
}> {
    const risks: Array<{
        topicA: EnrichedTopic;
        topicB: EnrichedTopic;
        distance: number;
        recommendation: string;
    }> = [];

    for (let i = 0; i < topics.length; i++) {
        for (let j = i + 1; j < topics.length; j++) {
            const distanceResult = knowledgeGraph.calculateSemanticDistance(
                topics[i].title,
                topics[j].title
            );

            if (distanceResult.distance < 0.2) {
                risks.push({
                    topicA: topics[i],
                    topicB: topics[j],
                    distance: distanceResult.distance,
                    recommendation: distanceResult.linkingRecommendation
                });
            }
        }
    }

    // Sort by distance (lowest = highest risk)
    risks.sort((a, b) => a.distance - b.distance);

    return risks;
}

/**
 * Suggest optimal hub-spoke structure based on semantic distance.
 * Identifies potential hubs and their ideal spokes.
 */
export function suggestHubSpokeStructure(
    topics: EnrichedTopic[],
    knowledgeGraph: KnowledgeGraph,
    optimalSpokeCount: number = 7
): Array<{
    hub: EnrichedTopic;
    suggestedSpokes: EnrichedTopic[];
    avgSpokeDistance: number;
    structureQuality: number;
}> {
    const suggestions: Array<{
        hub: EnrichedTopic;
        suggestedSpokes: EnrichedTopic[];
        avgSpokeDistance: number;
        structureQuality: number;
    }> = [];

    // Consider each topic as a potential hub
    for (const hub of topics) {
        const spokeCandidates: Array<{
            topic: EnrichedTopic;
            distance: number;
        }> = [];

        for (const spoke of topics) {
            if (spoke.id === hub.id) continue;

            const distanceResult = knowledgeGraph.calculateSemanticDistance(
                hub.title,
                spoke.title
            );

            // Ideal spokes are in the 0.3-0.6 range (close but not duplicate)
            if (distanceResult.distance >= 0.3 && distanceResult.distance <= 0.6) {
                spokeCandidates.push({
                    topic: spoke,
                    distance: distanceResult.distance
                });
            }
        }

        if (spokeCandidates.length > 0) {
            // Sort by distance (closest first)
            spokeCandidates.sort((a, b) => a.distance - b.distance);

            // Take up to optimal count
            const selectedSpokes = spokeCandidates.slice(0, optimalSpokeCount);

            // Calculate metrics
            const avgDistance = selectedSpokes.reduce((s, c) => s + c.distance, 0) / selectedSpokes.length;
            const structureQuality = calculateHubSpokeQuality(
                selectedSpokes.length,
                optimalSpokeCount,
                avgDistance
            );

            suggestions.push({
                hub,
                suggestedSpokes: selectedSpokes.map(s => s.topic),
                avgSpokeDistance: Math.round(avgDistance * 100) / 100,
                structureQuality: Math.round(structureQuality * 100) / 100
            });
        }
    }

    // Sort by structure quality (highest first)
    suggestions.sort((a, b) => b.structureQuality - a.structureQuality);

    return suggestions;
}

/**
 * Calculate hub-spoke structure quality score.
 */
function calculateHubSpokeQuality(
    spokeCount: number,
    optimalCount: number,
    avgDistance: number
): number {
    // Ratio quality: penalize too few or too many spokes
    const ratioScore = 1 - Math.abs(spokeCount - optimalCount) / optimalCount;

    // Distance quality: prefer ~0.45 average (middle of ideal range)
    const distanceOptimal = 0.45;
    const distanceScore = 1 - Math.abs(avgDistance - distanceOptimal) / 0.45;

    // Combined score
    return (ratioScore * 0.5 + distanceScore * 0.5);
}

// =============================================================================
// AI-BASED CLUSTERING (EXISTING FACADE METHODS)
// =============================================================================

export const findMergeOpportunities = (
    topics: EnrichedTopic[], businessInfo: BusinessInfo, dispatch: React.Dispatch<any>
): Promise<MergeSuggestion[]> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.findMergeOpportunities(topics, businessInfo, dispatch),
        openai: () => openAiService.findMergeOpportunities(topics, businessInfo, dispatch),
        anthropic: () => anthropicService.findMergeOpportunities(topics, businessInfo, dispatch),
        perplexity: () => perplexityService.findMergeOpportunities(topics, businessInfo, dispatch),
        openrouter: () => openRouterService.findMergeOpportunities(topics, businessInfo, dispatch),
    });
};

export const findMergeOpportunitiesForSelection = (
    businessInfo: BusinessInfo, selectedTopics: EnrichedTopic[], dispatch: React.Dispatch<AppAction>
): Promise<MergeSuggestion> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.findMergeOpportunitiesForSelection(businessInfo, selectedTopics, dispatch),
        openai: () => openAiService.findMergeOpportunitiesForSelection(businessInfo, selectedTopics, dispatch),
        anthropic: () => anthropicService.findMergeOpportunitiesForSelection(businessInfo, selectedTopics, dispatch),
        perplexity: () => perplexityService.findMergeOpportunitiesForSelection(businessInfo, selectedTopics, dispatch),
        openrouter: () => openRouterService.findMergeOpportunitiesForSelection(businessInfo, selectedTopics, dispatch),
    });
};

export const findLinkingOpportunitiesForTopic = (
    targetTopic: EnrichedTopic, allTopics: EnrichedTopic[], knowledgeGraph: KnowledgeGraph, businessInfo: BusinessInfo, dispatch: React.Dispatch<AppAction>
): Promise<any[]> => {
    return dispatchToProvider(businessInfo, {
        gemini: () => geminiService.findLinkingOpportunitiesForTopic(targetTopic, allTopics, knowledgeGraph, businessInfo, dispatch),
        openai: () => openAiService.findLinkingOpportunitiesForTopic(targetTopic, allTopics, knowledgeGraph, businessInfo, dispatch),
        anthropic: () => anthropicService.findLinkingOpportunitiesForTopic(targetTopic, allTopics, knowledgeGraph, businessInfo, dispatch),
        perplexity: () => perplexityService.findLinkingOpportunitiesForTopic(targetTopic, allTopics, knowledgeGraph, businessInfo, dispatch),
        openrouter: () => openRouterService.findLinkingOpportunitiesForTopic(targetTopic, allTopics, knowledgeGraph, businessInfo, dispatch),
    });
};
