/**
 * Priority Calculator for Publication Planning
 *
 * Calculates priority scores (0-100) for topics based on:
 * - STRUCTURAL (35 pts): core type, pillar role, monetization class
 * - SEMANTIC (30 pts): EAV categories (UNIQUE/RARE/ROOT/COMMON)
 * - DEPENDENCY (20 pts): has children, root level, depth penalty
 * - SEASONAL (15 pts): timing relative to freshness profile
 */

import {
    EnrichedTopic,
    SemanticTriple,
    PublicationPriority,
    PriorityScoreBreakdown,
} from '../../../types';

interface PriorityCalculatorInput {
    topics: EnrichedTopic[];
    eavs: SemanticTriple[];
}

interface TopicPriorityResult {
    topic_id: string;
    score: number;
    priority: PublicationPriority;
    breakdown: PriorityScoreBreakdown;
}

/**
 * Calculate priority scores for all topics
 */
export function calculatePriorities(input: PriorityCalculatorInput): TopicPriorityResult[] {
    const { topics, eavs } = input;

    // Build parent-child relationships
    const childrenMap = new Map<string, string[]>();
    const depthMap = new Map<string, number>();

    // Initialize maps
    topics.forEach(t => {
        childrenMap.set(t.id, []);
        depthMap.set(t.id, 0);
    });

    // Build children map
    topics.forEach(t => {
        if (t.parent_topic_id) {
            const parentChildren = childrenMap.get(t.parent_topic_id) || [];
            parentChildren.push(t.id);
            childrenMap.set(t.parent_topic_id, parentChildren);
        }
    });

    // Calculate depths
    const calculateDepth = (topicId: string, visited = new Set<string>()): number => {
        if (visited.has(topicId)) return 0;
        visited.add(topicId);

        const topic = topics.find(t => t.id === topicId);
        if (!topic || !topic.parent_topic_id) return 0;

        return 1 + calculateDepth(topic.parent_topic_id, visited);
    };

    topics.forEach(t => {
        depthMap.set(t.id, calculateDepth(t.id));
    });

    // Calculate priority for each topic
    return topics.map(topic => {
        const breakdown = calculateBreakdown(topic, eavs, childrenMap, depthMap);
        const score = breakdown.structural.total +
            breakdown.semantic.total +
            breakdown.dependency.total +
            breakdown.seasonal.total;

        return {
            topic_id: topic.id,
            score: Math.min(100, Math.max(0, Math.round(score))),
            priority: scoreToPriority(score),
            breakdown
        };
    });
}

/**
 * Calculate the full priority breakdown for a single topic
 */
function calculateBreakdown(
    topic: EnrichedTopic,
    eavs: SemanticTriple[],
    childrenMap: Map<string, string[]>,
    depthMap: Map<string, number>
): PriorityScoreBreakdown {
    const structural = calculateStructuralScore(topic);
    const semantic = calculateSemanticScore(topic, eavs);
    const dependency = calculateDependencyScore(topic, childrenMap, depthMap);
    const seasonal = calculateSeasonalScore(topic);

    return { structural, semantic, dependency, seasonal };
}

/**
 * STRUCTURAL (max 35 pts)
 * - core type: +15
 * - pillar role: +10
 * - monetization class: +10
 */
function calculateStructuralScore(topic: EnrichedTopic): PriorityScoreBreakdown['structural'] {
    const core_type = topic.type === 'core' ? 15 : 0;
    const pillar_role = topic.cluster_role === 'pillar' ? 10 : 0;
    const monetization = topic.topic_class === 'monetization' ? 10 : 0;

    return {
        total: core_type + pillar_role + monetization,
        core_type,
        pillar_role,
        monetization
    };
}

/**
 * SEMANTIC (max 30 pts)
 * - UNIQUE EAVs: +8 each (max 16 = 2 triples)
 * - RARE EAVs: +4 each (max 8 = 2 triples)
 * - ROOT EAVs: +2 each (max 4 = 2 triples)
 * - COMMON EAVs: +0.5 each (max 2 = 4 triples)
 */
function calculateSemanticScore(
    topic: EnrichedTopic,
    eavs: SemanticTriple[]
): PriorityScoreBreakdown['semantic'] {
    // Filter EAVs that are related to this topic
    // SemanticTriple uses subject.label as the entity
    const topicEavs = eavs.filter(eav => {
        const entityLabel = eav.subject?.label?.toLowerCase() || '';
        const topicTitle = topic.title.toLowerCase();
        return entityLabel.includes(topicTitle) || topicTitle.includes(entityLabel);
    });

    // Count by category (stored in predicate.category)
    const getCategory = (eav: SemanticTriple) => eav.predicate?.category;
    const uniqueCount = topicEavs.filter(e => getCategory(e) === 'UNIQUE').length;
    const rareCount = topicEavs.filter(e => getCategory(e) === 'RARE').length;
    const rootCount = topicEavs.filter(e => getCategory(e) === 'ROOT').length;
    const commonCount = topicEavs.filter(e => getCategory(e) === 'COMMON').length;

    // Calculate scores with caps
    const unique_eavs = Math.min(16, uniqueCount * 8);
    const rare_eavs = Math.min(8, rareCount * 4);
    const root_eavs = Math.min(4, rootCount * 2);
    const common_eavs = Math.min(2, commonCount * 0.5);

    return {
        total: unique_eavs + rare_eavs + root_eavs + common_eavs,
        unique_eavs,
        rare_eavs,
        root_eavs,
        common_eavs
    };
}

/**
 * DEPENDENCY (max 20 pts)
 * - has children: +10
 * - root level (no parent): +10
 * - depth penalty: -2 per level deep (after first)
 */
function calculateDependencyScore(
    topic: EnrichedTopic,
    childrenMap: Map<string, string[]>,
    depthMap: Map<string, number>
): PriorityScoreBreakdown['dependency'] {
    const children = childrenMap.get(topic.id) || [];
    const depth = depthMap.get(topic.id) || 0;

    const has_children = children.length > 0 ? 10 : 0;
    const root_level = !topic.parent_topic_id ? 10 : 0;
    const depth_penalty = depth > 0 ? -Math.min(10, depth * 2) : 0;

    return {
        total: Math.max(0, has_children + root_level + depth_penalty),
        has_children,
        root_level,
        depth_penalty
    };
}

/**
 * SEASONAL (max 15 pts)
 * Based on freshness profile:
 * - EVERGREEN with seasonal peak approaching: +15
 * - TIME_SENSITIVE or EVENT: +10 (if in season)
 * - EVERGREEN: +5
 * - Others: +2
 */
function calculateSeasonalScore(topic: EnrichedTopic): PriorityScoreBreakdown['seasonal'] {
    const freshness = topic.freshness;

    let timing_score = 2; // Default

    if (typeof freshness === 'string') {
        // Simple string freshness
        if (freshness === 'EVERGREEN') {
            timing_score = 5;
        }
    } else if (freshness && typeof freshness === 'object') {
        // Complex FreshnessProfile object
        const profile = freshness as { type?: string; peakSeasons?: string[] };

        if (profile.type === 'EVERGREEN') {
            // Check for approaching peak season
            if (profile.peakSeasons && profile.peakSeasons.length > 0) {
                const currentMonth = new Date().getMonth();
                const seasonMonths: Record<string, number[]> = {
                    'winter': [11, 0, 1],
                    'spring': [2, 3, 4],
                    'summer': [5, 6, 7],
                    'fall': [8, 9, 10],
                    'autumn': [8, 9, 10]
                };

                const isPeakApproaching = profile.peakSeasons.some(season => {
                    const months = seasonMonths[season.toLowerCase()];
                    if (!months) return false;
                    // Check if peak is within next 2 months
                    const upcomingMonths = [(currentMonth + 1) % 12, (currentMonth + 2) % 12];
                    return months.some(m => upcomingMonths.includes(m));
                });

                timing_score = isPeakApproaching ? 15 : 5;
            } else {
                timing_score = 5;
            }
        } else if (profile.type === 'TIME_SENSITIVE' || profile.type === 'EVENT') {
            timing_score = 10;
        }
    }

    return {
        total: timing_score,
        timing_score
    };
}

/**
 * Convert numerical score to priority level
 */
function scoreToPriority(score: number): PublicationPriority {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
}

export type { TopicPriorityResult };
