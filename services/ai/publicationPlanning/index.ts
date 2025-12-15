/**
 * Publication Planning Service
 *
 * Generates optimal publication schedules based on semantic SEO guidelines.
 *
 * Usage:
 * ```typescript
 * import { generatePublicationPlan } from './services/ai/publicationPlanning';
 *
 * const plan = generatePublicationPlan({
 *   topics,
 *   eavs,
 *   batchLaunchDate: '2025-01-15'
 * });
 * ```
 */

import {
    EnrichedTopic,
    SemanticTriple,
    PublicationPlanResult,
    PublicationPhase,
} from '../../../types';
import { calculatePriorities, TopicPriorityResult } from './priorityCalculator';
import { assignPhases, getPhaseStats, TopicPhaseResult } from './phaseAssignment';
import { resolveDependencies, DependencyResult } from './dependencyResolver';
import { distributePublicationDates, calculateTotalWeeks, TopicDateResult } from './dateDistribution';

export interface PublicationPlanInput {
    topics: EnrichedTopic[];
    eavs: SemanticTriple[];
    batchLaunchDate: string;  // ISO date
    config?: {
        phase1MaxTopics?: number;
        phase1MinTopics?: number;
        phase2RateMin?: number;
        phase2RateMax?: number;
        phase3RateMin?: number;
        phase3RateMax?: number;
        phase4RateMin?: number;
        phase4RateMax?: number;
    };
}

/**
 * Generate a complete publication plan for all topics
 */
export function generatePublicationPlan(input: PublicationPlanInput): PublicationPlanResult {
    const { topics, eavs, batchLaunchDate, config } = input;

    if (topics.length === 0) {
        return {
            topics: [],
            summary: {
                phase_1_count: 0,
                phase_2_count: 0,
                phase_3_count: 0,
                phase_4_count: 0,
                total_duration_weeks: 0,
                batch_launch_date: batchLaunchDate
            }
        };
    }

    // Step 1: Calculate priorities
    const priorities = calculatePriorities({ topics, eavs });

    // Step 2: Assign phases
    const phases = assignPhases({ topics, priorities, eavs, config });

    // Step 3: Resolve dependencies
    const dependencies = resolveDependencies(topics);

    // Step 4: Distribute dates
    const dates = distributePublicationDates({
        phases,
        dependencies,
        batchLaunchDate,
        config
    });

    // Build result
    const priorityMap = new Map(priorities.map(p => [p.topic_id, p]));
    const phaseMap = new Map(phases.map(p => [p.topic_id, p.phase]));
    const dateMap = new Map(dates.map(d => [d.topic_id, d.optimal_publication_date]));
    const depMap = new Map(dependencies.map(d => [d.topic_id, d.dependencies]));

    const planTopics = topics.map(topic => {
        const priority = priorityMap.get(topic.id)!;
        return {
            topic_id: topic.id,
            phase: phaseMap.get(topic.id) || 'phase_4_longtail' as PublicationPhase,
            priority: priority.priority,
            priority_score: priority.score,
            priority_breakdown: priority.breakdown,
            optimal_publication_date: dateMap.get(topic.id) || batchLaunchDate,
            dependencies: depMap.get(topic.id) || []
        };
    });

    // Calculate phase stats
    const phaseStats = getPhaseStats(phases);
    const totalWeeks = calculateTotalWeeks(dates);

    return {
        topics: planTopics,
        summary: {
            phase_1_count: phaseStats['phase_1_authority'],
            phase_2_count: phaseStats['phase_2_support'],
            phase_3_count: phaseStats['phase_3_expansion'],
            phase_4_count: phaseStats['phase_4_longtail'],
            total_duration_weeks: totalWeeks,
            batch_launch_date: batchLaunchDate
        }
    };
}

/**
 * Update an existing plan when topics change
 */
export function updatePublicationPlan(
    existingPlan: PublicationPlanResult,
    newTopics: EnrichedTopic[],
    eavs: SemanticTriple[]
): PublicationPlanResult {
    // Generate new plan using existing batch launch date
    return generatePublicationPlan({
        topics: newTopics,
        eavs,
        batchLaunchDate: existingPlan.summary.batch_launch_date
    });
}

/**
 * Get topics scheduled for a specific date
 */
export function getTopicsForDate(
    plan: PublicationPlanResult,
    date: string
): PublicationPlanResult['topics'] {
    return plan.topics.filter(t => t.optimal_publication_date === date);
}

/**
 * Get topics in a date range
 */
export function getTopicsInRange(
    plan: PublicationPlanResult,
    startDate: string,
    endDate: string
): PublicationPlanResult['topics'] {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return plan.topics.filter(t => {
        const topicDate = new Date(t.optimal_publication_date);
        return topicDate >= start && topicDate <= end;
    });
}

/**
 * Get overdue topics (past optimal date, not published)
 */
export function getOverdueTopics(
    plan: PublicationPlanResult,
    publishedTopicIds: Set<string>,
    asOfDate: string = new Date().toISOString().split('T')[0]
): PublicationPlanResult['topics'] {
    const today = new Date(asOfDate);

    return plan.topics.filter(t => {
        const optimalDate = new Date(t.optimal_publication_date);
        return optimalDate < today && !publishedTopicIds.has(t.topic_id);
    });
}

/**
 * Calculate publication progress
 */
export function calculateProgress(
    plan: PublicationPlanResult,
    publishedTopicIds: Set<string>
): {
    total: number;
    published: number;
    percentage: number;
    byPhase: Record<PublicationPhase, { total: number; published: number; percentage: number }>;
} {
    const total = plan.topics.length;
    const published = plan.topics.filter(t => publishedTopicIds.has(t.topic_id)).length;

    const phaseGroups: Record<PublicationPhase, PublicationPlanResult['topics']> = {
        'phase_1_authority': [],
        'phase_2_support': [],
        'phase_3_expansion': [],
        'phase_4_longtail': []
    };

    plan.topics.forEach(t => {
        phaseGroups[t.phase].push(t);
    });

    const byPhase = Object.entries(phaseGroups).reduce((acc, [phase, topics]) => {
        const phaseTotal = topics.length;
        const phasePublished = topics.filter(t => publishedTopicIds.has(t.topic_id)).length;
        acc[phase as PublicationPhase] = {
            total: phaseTotal,
            published: phasePublished,
            percentage: phaseTotal > 0 ? Math.round((phasePublished / phaseTotal) * 100) : 0
        };
        return acc;
    }, {} as Record<PublicationPhase, { total: number; published: number; percentage: number }>);

    return {
        total,
        published,
        percentage: total > 0 ? Math.round((published / total) * 100) : 0,
        byPhase
    };
}

// Re-export types and utilities
export {
    calculatePriorities,
    assignPhases,
    resolveDependencies,
    distributePublicationDates,
    getPhaseStats,
    calculateTotalWeeks
};

export type {
    TopicPriorityResult,
    TopicPhaseResult,
    DependencyResult,
    TopicDateResult
};
