// services/momentumTracker.ts

/**
 * MomentumTracker
 *
 * Tracks publication frequency, velocity, and content momentum.
 * Implements the framework's momentum concept: consistent publishing
 * signals topical commitment to search engines.
 *
 * Key metrics:
 * - Publication velocity (pages/week)
 * - Core-first ordering (core pages published before supplementary)
 * - Consistency score (regularity of publishing)
 * - Momentum trend (accelerating, steady, decelerating)
 */

export interface PublicationEvent {
  /** Page/topic identifier */
  id: string;
  /** Publication date */
  publishedAt: Date | string;
  /** Is this a core/pillar page? */
  isCore?: boolean;
  /** Cluster/pillar this belongs to */
  cluster?: string;
  /** Word count */
  wordCount?: number;
}

export interface MomentumMetrics {
  /** Pages published per week (rolling 4-week average) */
  velocityPerWeek: number;
  /** Pages published per month */
  velocityPerMonth: number;
  /** Total pages published */
  totalPublished: number;
  /** Consistency score (0-100, higher = more regular) */
  consistencyScore: number;
  /** Trend direction */
  trend: 'accelerating' | 'steady' | 'decelerating' | 'stalled';
  /** Were core pages published first? */
  coreFirstScore: number;
  /** Per-cluster publication stats */
  clusterStats: ClusterMomentum[];
  /** Weekly publication history */
  weeklyHistory: WeeklyStats[];
  /** Suggestions for improvement */
  suggestions: string[];
}

export interface ClusterMomentum {
  /** Cluster name */
  cluster: string;
  /** Pages published */
  pageCount: number;
  /** First publication date */
  firstPublished: Date;
  /** Last publication date */
  lastPublished: Date;
  /** Is cluster complete? */
  isActive: boolean;
}

export interface WeeklyStats {
  /** Week start date */
  weekStart: Date;
  /** Pages published that week */
  count: number;
  /** Core pages published */
  coreCount: number;
  /** Total word count */
  wordCount: number;
}

export class MomentumTracker {
  /**
   * Analyze publication momentum from a list of publication events.
   */
  static analyze(events: PublicationEvent[]): MomentumMetrics {
    if (events.length === 0) {
      return {
        velocityPerWeek: 0,
        velocityPerMonth: 0,
        totalPublished: 0,
        consistencyScore: 0,
        trend: 'stalled',
        coreFirstScore: 0,
        clusterStats: [],
        weeklyHistory: [],
        suggestions: ['No publications found. Start publishing content to build momentum.'],
      };
    }

    // Normalize dates
    const normalizedEvents = events.map(e => ({
      ...e,
      publishedAt: e.publishedAt instanceof Date ? e.publishedAt : new Date(e.publishedAt as string),
    })).sort((a, b) => (a.publishedAt as Date).getTime() - (b.publishedAt as Date).getTime());

    // Calculate weekly history
    const weeklyHistory = this.buildWeeklyHistory(normalizedEvents);

    // Velocity (rolling 4-week average)
    const recentWeeks = weeklyHistory.slice(-4);
    const velocityPerWeek = recentWeeks.length > 0
      ? Math.round((recentWeeks.reduce((s, w) => s + w.count, 0) / recentWeeks.length) * 10) / 10
      : 0;

    const velocityPerMonth = Math.round(velocityPerWeek * 4.33 * 10) / 10;

    // Consistency score
    const consistencyScore = this.calculateConsistency(weeklyHistory);

    // Trend
    const trend = this.calculateTrend(weeklyHistory);

    // Core-first ordering
    const coreFirstScore = this.calculateCoreFirst(normalizedEvents);

    // Cluster stats
    const clusterStats = this.calculateClusterStats(normalizedEvents);

    // Suggestions
    const suggestions = this.generateSuggestions(
      velocityPerWeek, consistencyScore, trend, coreFirstScore, clusterStats
    );

    return {
      velocityPerWeek,
      velocityPerMonth,
      totalPublished: events.length,
      consistencyScore,
      trend,
      coreFirstScore,
      clusterStats,
      weeklyHistory,
      suggestions,
    };
  }

  private static buildWeeklyHistory(
    events: (PublicationEvent & { publishedAt: Date })[]
  ): WeeklyStats[] {
    if (events.length === 0) return [];

    const firstDate = events[0].publishedAt;
    const lastDate = events[events.length - 1].publishedAt;
    const weeks: WeeklyStats[] = [];

    // Generate week buckets
    const weekStart = new Date(firstDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const end = new Date(lastDate);
    end.setDate(end.getDate() + 7);

    let current = new Date(weekStart);
    while (current <= end) {
      const nextWeek = new Date(current);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const weekEvents = events.filter(e =>
        e.publishedAt >= current && e.publishedAt < nextWeek
      );

      weeks.push({
        weekStart: new Date(current),
        count: weekEvents.length,
        coreCount: weekEvents.filter(e => e.isCore).length,
        wordCount: weekEvents.reduce((s, e) => s + (e.wordCount || 0), 0),
      });

      current = nextWeek;
    }

    return weeks;
  }

  private static calculateConsistency(weeklyHistory: WeeklyStats[]): number {
    if (weeklyHistory.length < 2) return 0;

    // Only consider weeks between first and last publication
    const activeWeeks = weeklyHistory.filter((_w, i) => {
      const beforeFirst = weeklyHistory.slice(0, i + 1).every(w => w.count === 0);
      const afterLast = weeklyHistory.slice(i).every(w => w.count === 0);
      return !beforeFirst && !afterLast;
    });

    if (activeWeeks.length < 2) return 0;

    // Consistency = percentage of active weeks that have at least 1 publication
    const publishingWeeks = activeWeeks.filter(w => w.count > 0).length;
    const score = Math.round((publishingWeeks / activeWeeks.length) * 100);

    return Math.min(100, score);
  }

  private static calculateTrend(weeklyHistory: WeeklyStats[]): MomentumMetrics['trend'] {
    if (weeklyHistory.length < 4) return 'steady';

    const recent4 = weeklyHistory.slice(-4);
    const prior4 = weeklyHistory.slice(-8, -4);

    if (prior4.length === 0) return 'steady';

    const recentAvg = recent4.reduce((s, w) => s + w.count, 0) / recent4.length;
    const priorAvg = prior4.reduce((s, w) => s + w.count, 0) / prior4.length;

    // Check if stalled (no recent publications)
    if (recentAvg === 0) return 'stalled';

    const change = priorAvg > 0 ? (recentAvg - priorAvg) / priorAvg : recentAvg > 0 ? 1 : 0;

    if (change > 0.2) return 'accelerating';
    if (change < -0.2) return 'decelerating';
    return 'steady';
  }

  private static calculateCoreFirst(
    events: (PublicationEvent & { publishedAt: Date })[]
  ): number {
    const coreEvents = events.filter(e => e.isCore);
    const nonCoreEvents = events.filter(e => !e.isCore);

    if (coreEvents.length === 0 || nonCoreEvents.length === 0) return 100;

    // What percentage of core pages were published before the median non-core page?
    const nonCoreMedianDate = nonCoreEvents[Math.floor(nonCoreEvents.length / 2)].publishedAt;

    const coreBefore = coreEvents.filter(
      e => e.publishedAt <= nonCoreMedianDate
    ).length;

    return Math.round((coreBefore / coreEvents.length) * 100);
  }

  private static calculateClusterStats(
    events: (PublicationEvent & { publishedAt: Date })[]
  ): ClusterMomentum[] {
    const clusterMap = new Map<string, (PublicationEvent & { publishedAt: Date })[]>();

    for (const event of events) {
      const cluster = event.cluster || 'Uncategorized';
      if (!clusterMap.has(cluster)) clusterMap.set(cluster, []);
      clusterMap.get(cluster)!.push(event);
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return Array.from(clusterMap.entries()).map(([cluster, clusterEvents]) => ({
      cluster,
      pageCount: clusterEvents.length,
      firstPublished: clusterEvents[0].publishedAt,
      lastPublished: clusterEvents[clusterEvents.length - 1].publishedAt,
      isActive: clusterEvents[clusterEvents.length - 1].publishedAt >= thirtyDaysAgo,
    }));
  }

  private static generateSuggestions(
    velocity: number,
    consistency: number,
    trend: string,
    coreFirst: number,
    clusterStats: ClusterMomentum[]
  ): string[] {
    const suggestions: string[] = [];

    if (velocity < 1) {
      suggestions.push('Publishing velocity is below 1 page/week. Aim for 2-3 pages/week for consistent momentum.');
    }

    if (consistency < 50) {
      suggestions.push(`Consistency score is ${consistency}%. Publish regularly rather than in bursts for better momentum signals.`);
    }

    if (trend === 'decelerating') {
      suggestions.push('Publishing momentum is decelerating. Maintain or increase publishing frequency.');
    } else if (trend === 'stalled') {
      suggestions.push('Publishing has stalled. Resume regular publishing to maintain topical authority signals.');
    }

    if (coreFirst < 70) {
      suggestions.push(`Core-first score is ${coreFirst}%. Publish core/pillar pages before supplementary content.`);
    }

    const inactiveClusters = clusterStats.filter(c => !c.isActive);
    if (inactiveClusters.length > 0) {
      suggestions.push(
        `${inactiveClusters.length} cluster(s) have no recent publications: ${inactiveClusters.map(c => c.cluster).join(', ')}`
      );
    }

    return suggestions;
  }
}
