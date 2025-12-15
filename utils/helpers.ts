
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
import { EnrichedTopic, ContentBrief, DashboardMetrics, KnowledgeGraph } from '../types';

export const slugify = (text: string): string => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};

export const cleanSlug = (parentSlug: string, childTitle: string): string => {
    if (!parentSlug || !childTitle) return slugify(childTitle);
    
    const parentParts = parentSlug.split('/').filter(p => p);
    const parentLastPart = parentParts[parentParts.length - 1] || '';
    
    // Slugify the child title
    let childSlug = slugify(childTitle);
    
    // Heuristic: Remove the parent's slug words from the start of the child slug if they exist to prevent redundancy
    // e.g. parent: "visa-services", child: "visa-services-cost" -> "cost"
    // This aligns with Rule II.E of the Holistic SEO framework.
    if (parentLastPart && childSlug.startsWith(parentLastPart + '-')) {
        childSlug = childSlug.replace(parentLastPart + '-', '');
    }
    
    return childSlug;
};

export const sanitizeForUI = (text: string | null | undefined): string => {
    if (typeof document === 'undefined' || !text) return text || ''; // Return empty string for null/undefined or if not in browser
    const element = document.createElement('div');
    element.innerText = text;
    return element.innerHTML;
};

interface MetricsInput {
    briefs: Record<string, ContentBrief>;
    knowledgeGraph: KnowledgeGraph | null;
    allTopics: EnrichedTopic[];
}

export const calculateDashboardMetrics = ({ briefs, knowledgeGraph, allTopics }: MetricsInput): DashboardMetrics => {
    const totalTopics = allTopics.length;
    const briefsGenerated = Object.keys(briefs).length;

    const briefGenerationProgress = totalTopics > 0 ? (briefsGenerated / totalTopics) * 100 : 0;
    
    // Placeholder for knowledge domain coverage
    const knowledgeDomainCoverage = knowledgeGraph ? (knowledgeGraph.getNodes().size / (totalTopics + 1)) * 50 : 10;
    
    const totalEAVs = Object.values(briefs).reduce((sum, brief) => sum + (brief.contextualVectors?.length || 0), 0);
    const avgEAVsPerBrief = briefsGenerated > 0 ? totalEAVs / briefsGenerated : 0;

    // Placeholder for contextual flow score
    const contextualFlowScore = (avgEAVsPerBrief / 10) * 100 + (briefGenerationProgress / 10);
    
    return {
        briefGenerationProgress: Math.min(100, Math.round(briefGenerationProgress)),
        knowledgeDomainCoverage: Math.min(100, Math.round(knowledgeDomainCoverage)),
        avgEAVsPerBrief: parseFloat(avgEAVsPerBrief.toFixed(1)),
        contextualFlowScore: Math.min(100, Math.round(contextualFlowScore)),
    };
};

export interface TopicSimilarityPair {
    topicA: string;
    topicB: string;
    similarity: number;
}

/**
 * Calculate similarity between topics based on their hierarchical relationships.
 * Returns pairs sorted by relevance (highest similarity first).
 */
export function calculateTopicSimilarityPairs(topics: EnrichedTopic[]): TopicSimilarityPair[] {
    const pairs: TopicSimilarityPair[] = [];

    // Create a map for quick parent lookup
    const topicMap = new Map(topics.map(t => [t.id, t]));

    // Calculate similarity for each pair of topics
    for (let i = 0; i < topics.length; i++) {
        for (let j = i + 1; j < topics.length; j++) {
            const topicA = topics[i];
            const topicB = topics[j];

            let similarity = 0.1; // Default: weakly related (same map = some relation)

            // Direct parent-child relationship = very high similarity
            if (topicA.parent_topic_id === topicB.id || topicB.parent_topic_id === topicA.id) {
                similarity = 0.95;
            }
            // Siblings (same parent) = high similarity
            else if (topicA.parent_topic_id && topicA.parent_topic_id === topicB.parent_topic_id) {
                similarity = 0.85;
            }
            // Cousins (share grandparent) = medium-high similarity
            else if (topicA.parent_topic_id && topicB.parent_topic_id) {
                const parentA = topicMap.get(topicA.parent_topic_id);
                const parentB = topicMap.get(topicB.parent_topic_id);
                if (parentA?.parent_topic_id && parentA.parent_topic_id === parentB?.parent_topic_id) {
                    similarity = 0.6;
                } else if (parentA?.parent_topic_id === topicB.id || parentB?.parent_topic_id === topicA.id) {
                    // Uncle/aunt relationship
                    similarity = 0.7;
                }
            }
            // Same type = moderate similarity
            else if (topicA.type === topicB.type) {
                similarity = 0.4;
            }
            // Both are core topics = some similarity
            else if (topicA.type === 'core' && topicB.type === 'core') {
                similarity = 0.35;
            }

            pairs.push({
                topicA: topicA.title,
                topicB: topicB.title,
                similarity
            });
        }
    }

    // Sort by similarity (highest first) so AI focuses on most relevant pairs
    return pairs.sort((a, b) => b.similarity - a.similarity);
}
