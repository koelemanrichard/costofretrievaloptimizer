/**
 * Date Distribution for Publication Planning
 *
 * Distributes publication dates across phases following semantic SEO guidelines:
 * - Phase 1: All on batch launch date
 * - Phase 2: 3-7 articles per week (patternless distribution)
 * - Phase 3: 2-5 articles per week
 * - Phase 4: 1-2 articles per week
 *
 * Key principles:
 * - Patternless: Vary daily counts (1-7 articles) across ALL days including weekends
 * - Respect dependencies: Parents before children
 * - Avoid predictable patterns
 */

import { PublicationPhase } from '../../../types';
import { TopicPhaseResult } from './phaseAssignment';
import { DependencyResult } from './dependencyResolver';

interface DateDistributionInput {
    phases: TopicPhaseResult[];
    dependencies: DependencyResult[];
    batchLaunchDate: string;  // ISO date for Phase 1
    config?: {
        phase2RateMin?: number;  // Min articles per week (default: 3)
        phase2RateMax?: number;  // Max articles per week (default: 7)
        phase3RateMin?: number;  // Default: 2
        phase3RateMax?: number;  // Default: 5
        phase4RateMin?: number;  // Default: 1
        phase4RateMax?: number;  // Default: 2
    };
}

interface TopicDateResult {
    topic_id: string;
    optimal_publication_date: string;  // ISO date
    phase: PublicationPhase;
}

/**
 * Distribute publication dates across topics
 */
export function distributePublicationDates(input: DateDistributionInput): TopicDateResult[] {
    const { phases, dependencies, batchLaunchDate, config = {} } = input;

    const {
        phase2RateMin = 3,
        phase2RateMax = 7,
        phase3RateMin = 2,
        phase3RateMax = 5,
        phase4RateMin = 1,
        phase4RateMax = 2
    } = config;

    const results: TopicDateResult[] = [];
    const phaseMap = new Map(phases.map(p => [p.topic_id, p.phase]));
    const depMap = new Map(dependencies.map(d => [d.topic_id, d]));

    // Group topics by phase
    const phase1Topics = phases.filter(p => p.phase === 'phase_1_authority');
    const phase2Topics = phases.filter(p => p.phase === 'phase_2_support');
    const phase3Topics = phases.filter(p => p.phase === 'phase_3_expansion');
    const phase4Topics = phases.filter(p => p.phase === 'phase_4_longtail');

    const batchDate = new Date(batchLaunchDate);

    // Phase 1: All on batch launch date
    phase1Topics.forEach(topic => {
        results.push({
            topic_id: topic.topic_id,
            optimal_publication_date: formatDate(batchDate),
            phase: 'phase_1_authority'
        });
    });

    // Calculate start date for Phase 2 (day after batch launch)
    let currentDate = addDays(batchDate, 1);

    // Phase 2: Patternless distribution
    const phase2Dates = distributePatternless(
        phase2Topics.map(p => p.topic_id),
        dependencies,
        currentDate,
        phase2RateMin,
        phase2RateMax
    );

    phase2Dates.forEach(([topicId, date]) => {
        results.push({
            topic_id: topicId,
            optimal_publication_date: formatDate(date),
            phase: 'phase_2_support'
        });
    });

    // Update current date for Phase 3
    if (phase2Dates.length > 0) {
        const lastPhase2Date = phase2Dates[phase2Dates.length - 1][1];
        currentDate = addDays(lastPhase2Date, 1);
    }

    // Phase 3: Patternless distribution
    const phase3Dates = distributePatternless(
        phase3Topics.map(p => p.topic_id),
        dependencies,
        currentDate,
        phase3RateMin,
        phase3RateMax
    );

    phase3Dates.forEach(([topicId, date]) => {
        results.push({
            topic_id: topicId,
            optimal_publication_date: formatDate(date),
            phase: 'phase_3_expansion'
        });
    });

    // Update current date for Phase 4
    if (phase3Dates.length > 0) {
        const lastPhase3Date = phase3Dates[phase3Dates.length - 1][1];
        currentDate = addDays(lastPhase3Date, 1);
    }

    // Phase 4: Patternless distribution (slower rate)
    const phase4Dates = distributePatternless(
        phase4Topics.map(p => p.topic_id),
        dependencies,
        currentDate,
        phase4RateMin,
        phase4RateMax
    );

    phase4Dates.forEach(([topicId, date]) => {
        results.push({
            topic_id: topicId,
            optimal_publication_date: formatDate(date),
            phase: 'phase_4_longtail'
        });
    });

    return results;
}

/**
 * Distribute topics with patternless scheduling
 * Uses seeded randomness for reproducibility while avoiding patterns
 */
function distributePatternless(
    topicIds: string[],
    dependencies: DependencyResult[],
    startDate: Date,
    weeklyMin: number,
    weeklyMax: number
): Array<[string, Date]> {
    if (topicIds.length === 0) return [];

    const results: Array<[string, Date]> = [];
    const depMap = new Map(dependencies.map(d => [d.topic_id, d]));

    // Sort topics by dependency order
    const sortedTopics = [...topicIds].sort((a, b) => {
        const orderA = depMap.get(a)?.order || 0;
        const orderB = depMap.get(b)?.order || 0;
        return orderA - orderB;
    });

    // Track assigned dates for dependency checking
    const assignedDates = new Map<string, Date>();

    let currentDate = new Date(startDate);
    let weeklyCount = 0;
    let weeklyTarget = randomInRange(weeklyMin, weeklyMax, topicIds.length);
    let dayOfWeek = 0;

    // Track daily counts for patternless variation
    const dailyCountHistory: number[] = [];

    for (const topicId of sortedTopics) {
        const dep = depMap.get(topicId);

        // Ensure date is after all dependencies
        if (dep && dep.dependencies.length > 0) {
            const maxDepDate = dep.dependencies
                .map(depId => assignedDates.get(depId))
                .filter((d): d is Date => d !== undefined)
                .reduce((max, d) => d > max ? d : max, new Date(0));

            if (maxDepDate > currentDate) {
                currentDate = addDays(maxDepDate, 1);
                weeklyCount = 0;
                dayOfWeek = 0;
            }
        }

        // Check if we need to start a new week
        if (dayOfWeek >= 7) {
            dayOfWeek = 0;
            weeklyCount = 0;
            weeklyTarget = randomInRange(weeklyMin, weeklyMax, sortedTopics.indexOf(topicId));
        }

        // Determine articles for today (patternless: vary 0-3 per day)
        const todayTarget = getPatternlessDailyCount(dailyCountHistory, weeklyTarget - weeklyCount, 7 - dayOfWeek);

        if (todayTarget === 0 || weeklyCount >= weeklyTarget) {
            // Skip to next day
            currentDate = addDays(currentDate, 1);
            dayOfWeek++;
            dailyCountHistory.push(0);
        }

        // Assign date
        results.push([topicId, new Date(currentDate)]);
        assignedDates.set(topicId, new Date(currentDate));
        weeklyCount++;

        // Record daily count
        if (dailyCountHistory.length === 0 || dailyCountHistory[dailyCountHistory.length - 1] >= todayTarget) {
            dailyCountHistory.push(1);
        } else {
            dailyCountHistory[dailyCountHistory.length - 1]++;
        }

        // Move to next day if we've hit today's target
        if (dailyCountHistory[dailyCountHistory.length - 1] >= todayTarget) {
            currentDate = addDays(currentDate, 1);
            dayOfWeek++;
        }
    }

    return results;
}

/**
 * Get a patternless daily count based on history
 * Avoids predictable patterns by varying daily counts
 */
function getPatternlessDailyCount(
    history: number[],
    remaining: number,
    daysLeft: number
): number {
    if (daysLeft <= 0) return remaining;
    if (remaining <= 0) return 0;

    // Calculate average needed per day
    const avgNeeded = Math.ceil(remaining / daysLeft);

    // Vary from avg -1 to avg +2 for patternless feel
    const recentCounts = history.slice(-3);
    const recentAvg = recentCounts.length > 0
        ? recentCounts.reduce((a, b) => a + b, 0) / recentCounts.length
        : avgNeeded;

    // If recent counts were high, go lower. If low, go higher.
    if (recentAvg > avgNeeded) {
        return Math.max(1, avgNeeded - 1);
    } else if (recentAvg < avgNeeded - 0.5) {
        return Math.min(remaining, avgNeeded + 1);
    }

    // Default: use average with slight random variation
    return Math.max(1, Math.min(remaining, avgNeeded));
}

/**
 * Generate pseudo-random number in range using seed
 */
function randomInRange(min: number, max: number, seed: number): number {
    // Simple seeded random for reproducibility
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    const rand = x - Math.floor(x);
    return Math.floor(rand * (max - min + 1)) + min;
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Format date as ISO date string (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Calculate total duration in weeks for a plan
 */
export function calculateTotalWeeks(dates: TopicDateResult[]): number {
    if (dates.length === 0) return 0;

    const sortedDates = dates
        .map(d => new Date(d.optimal_publication_date))
        .sort((a, b) => a.getTime() - b.getTime());

    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];

    const diffMs = lastDate.getTime() - firstDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    return Math.ceil(diffDays / 7);
}

export type { TopicDateResult };
