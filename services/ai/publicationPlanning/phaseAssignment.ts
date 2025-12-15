/**
 * Phase Assignment for Publication Planning
 *
 * Assigns topics to publication phases based on semantic SEO guidelines:
 * - Phase 1 "Authority Anchor": Batch publish 20-60 topics (monetization + pillars)
 * - Phase 2 "Contextual Expansion": 3-7/week (remaining monetization + high-priority informational)
 * - Phase 3 "Authority Deepening": 2-5/week (informational with RARE/UNIQUE EAVs)
 * - Phase 4 "Long-tail Coverage": 1-2/week (remaining topics)
 */

import {
    EnrichedTopic,
    SemanticTriple,
    PublicationPhase,
} from '../../../types';
import { TopicPriorityResult } from './priorityCalculator';

interface PhaseAssignmentInput {
    topics: EnrichedTopic[];
    priorities: TopicPriorityResult[];
    eavs: SemanticTriple[];
    config?: {
        phase1MaxTopics?: number;  // Default: 60
        phase1MinTopics?: number;  // Default: 20
    };
}

interface TopicPhaseResult {
    topic_id: string;
    phase: PublicationPhase;
    reason: string;
}

/**
 * Assign topics to publication phases
 */
export function assignPhases(input: PhaseAssignmentInput): TopicPhaseResult[] {
    const { topics, priorities, eavs, config = {} } = input;
    const {
        phase1MaxTopics = 60,
        phase1MinTopics = 20
    } = config;

    const results: TopicPhaseResult[] = [];
    const priorityMap = new Map(priorities.map(p => [p.topic_id, p]));

    // Create helper sets for categorization
    const monetizationTopics = new Set(
        topics.filter(t => t.topic_class === 'monetization').map(t => t.id)
    );
    const pillarTopics = new Set(
        topics.filter(t => t.cluster_role === 'pillar').map(t => t.id)
    );
    const coreTopics = new Set(
        topics.filter(t => t.type === 'core').map(t => t.id)
    );

    // Map EAVs to topics
    const topicEavCategories = getTopicEavCategories(topics, eavs);

    // Phase 1: Authority Anchor
    // Monetization + Pillars + Core topics with critical/high priority
    const phase1Candidates = topics.filter(t => {
        const priority = priorityMap.get(t.id);
        const isMonetization = monetizationTopics.has(t.id);
        const isPillar = pillarTopics.has(t.id);
        const isCore = coreTopics.has(t.id);
        const isHighPriority = priority && (priority.priority === 'critical' || priority.priority === 'high');

        return (isMonetization || isPillar) || (isCore && isHighPriority);
    });

    // Sort by priority score descending
    const phase1Sorted = phase1Candidates
        .sort((a, b) => {
            const pa = priorityMap.get(a.id)?.score || 0;
            const pb = priorityMap.get(b.id)?.score || 0;
            return pb - pa;
        })
        .slice(0, phase1MaxTopics);

    const phase1Set = new Set(phase1Sorted.map(t => t.id));

    // Phase 2: Contextual Expansion
    // Remaining monetization + high-priority informational
    const phase2Candidates = topics.filter(t => {
        if (phase1Set.has(t.id)) return false;

        const priority = priorityMap.get(t.id);
        const isRemainingMonetization = monetizationTopics.has(t.id);
        const isHighPriorityInformational =
            t.topic_class === 'informational' &&
            priority &&
            (priority.priority === 'critical' || priority.priority === 'high');

        return isRemainingMonetization || isHighPriorityInformational;
    });

    const phase2Sorted = phase2Candidates.sort((a, b) => {
        const pa = priorityMap.get(a.id)?.score || 0;
        const pb = priorityMap.get(b.id)?.score || 0;
        return pb - pa;
    });

    const phase2Set = new Set(phase2Sorted.map(t => t.id));

    // Phase 3: Authority Deepening
    // Informational topics with RARE/UNIQUE EAVs
    const phase3Candidates = topics.filter(t => {
        if (phase1Set.has(t.id) || phase2Set.has(t.id)) return false;

        const eavCategories = topicEavCategories.get(t.id) || new Set();
        const hasRareUnique = eavCategories.has('UNIQUE') || eavCategories.has('RARE');
        const priority = priorityMap.get(t.id);
        const isMediumOrHigher = priority && priority.priority !== 'low';

        return hasRareUnique && isMediumOrHigher;
    });

    const phase3Sorted = phase3Candidates.sort((a, b) => {
        const pa = priorityMap.get(a.id)?.score || 0;
        const pb = priorityMap.get(b.id)?.score || 0;
        return pb - pa;
    });

    const phase3Set = new Set(phase3Sorted.map(t => t.id));

    // Phase 4: Long-tail Coverage
    // Everything else
    const phase4Set = new Set(
        topics
            .filter(t => !phase1Set.has(t.id) && !phase2Set.has(t.id) && !phase3Set.has(t.id))
            .map(t => t.id)
    );

    // Build results with reasons
    topics.forEach(topic => {
        let phase: PublicationPhase;
        let reason: string;

        if (phase1Set.has(topic.id)) {
            phase = 'phase_1_authority';
            const isMonetization = monetizationTopics.has(topic.id);
            const isPillar = pillarTopics.has(topic.id);
            reason = isMonetization
                ? 'Monetization topic for authority launch'
                : isPillar
                    ? 'Pillar topic for authority launch'
                    : 'High-priority core topic for authority launch';
        } else if (phase2Set.has(topic.id)) {
            phase = 'phase_2_support';
            reason = monetizationTopics.has(topic.id)
                ? 'Additional monetization topic'
                : 'High-priority informational content';
        } else if (phase3Set.has(topic.id)) {
            phase = 'phase_3_expansion';
            reason = 'Informational topic with unique/rare EAVs';
        } else {
            phase = 'phase_4_longtail';
            reason = 'Long-tail coverage topic';
        }

        results.push({ topic_id: topic.id, phase, reason });
    });

    // Ensure Phase 1 meets minimum threshold
    if (phase1Set.size < phase1MinTopics) {
        // Promote from Phase 2 to reach minimum
        const deficit = phase1MinTopics - phase1Set.size;
        const promotionCandidates = results
            .filter(r => r.phase === 'phase_2_support')
            .slice(0, deficit);

        promotionCandidates.forEach(c => {
            c.phase = 'phase_1_authority';
            c.reason += ' (promoted to meet batch minimum)';
        });
    }

    return results;
}

/**
 * Get EAV categories associated with each topic
 */
function getTopicEavCategories(
    topics: EnrichedTopic[],
    eavs: SemanticTriple[]
): Map<string, Set<string>> {
    const result = new Map<string, Set<string>>();

    topics.forEach(topic => {
        const categories = new Set<string>();

        eavs.forEach(eav => {
            // SemanticTriple uses subject.label as the entity
            const entityLabel = eav.subject?.label?.toLowerCase() || '';
            const topicTitle = topic.title.toLowerCase();
            const matchesEntity = entityLabel.includes(topicTitle) || topicTitle.includes(entityLabel);

            if (matchesEntity) {
                // Category is stored in predicate.category
                const category = eav.predicate?.category;
                if (category) {
                    categories.add(category);
                }
            }
        });

        result.set(topic.id, categories);
    });

    return result;
}

/**
 * Get phase statistics
 */
export function getPhaseStats(results: TopicPhaseResult[]): Record<PublicationPhase, number> {
    return {
        'phase_1_authority': results.filter(r => r.phase === 'phase_1_authority').length,
        'phase_2_support': results.filter(r => r.phase === 'phase_2_support').length,
        'phase_3_expansion': results.filter(r => r.phase === 'phase_3_expansion').length,
        'phase_4_longtail': results.filter(r => r.phase === 'phase_4_longtail').length,
    };
}

export type { TopicPhaseResult };
