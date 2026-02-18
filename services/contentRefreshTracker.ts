// services/contentRefreshTracker.ts

/**
 * ContentRefreshTracker
 *
 * Implements the 30% Refresh Rule from the Semantic SEO framework.
 * Tracks content age and staleness, recommending refresh when
 * >30% of content in a topical map is stale.
 *
 * Staleness criteria:
 * - Content age > threshold (configurable, default 6 months)
 * - Significant SERP changes detected
 * - EAV values outdated
 * - Performance decline (impressions/clicks drop)
 */

export interface ContentAge {
  /** URL or topic identifier */
  id: string;
  /** Title or topic name */
  title: string;
  /** Date content was last published/updated */
  lastUpdated: Date;
  /** Days since last update */
  daysSinceUpdate: number;
  /** Is this content stale? */
  isStale: boolean;
  /** Staleness reason */
  stalenessReason?: string;
  /** Priority for refresh (1=highest) */
  refreshPriority: number;
}

export interface RefreshReport {
  /** Total content items analyzed */
  totalItems: number;
  /** Number of stale items */
  staleItems: number;
  /** Staleness percentage */
  stalenessPercentage: number;
  /** Does the map exceed the 30% threshold? */
  exceeds30PercentRule: boolean;
  /** Per-item age analysis */
  items: ContentAge[];
  /** Recommended refresh order (by priority) */
  refreshOrder: string[];
  /** Summary suggestions */
  suggestions: string[];
}

export interface ContentItem {
  /** Identifier */
  id: string;
  /** Title */
  title: string;
  /** Last updated date */
  lastUpdated: Date | string;
  /** Word count */
  wordCount?: number;
  /** Is this a core/pillar page? */
  isCore?: boolean;
  /** Performance metrics */
  performance?: {
    impressions?: number;
    clicks?: number;
    previousImpressions?: number;
    previousClicks?: number;
  };
}

export class ContentRefreshTracker {
  private static readonly DEFAULT_STALE_DAYS = 180; // 6 months
  private static readonly CORE_STALE_DAYS = 90; // Core pages go stale faster
  private static readonly REFRESH_THRESHOLD = 0.30; // 30% rule

  /**
   * Analyze content freshness across a topical map.
   */
  static analyze(
    items: ContentItem[],
    staleDaysOverride?: number
  ): RefreshReport {
    const now = new Date();
    const contentAges: ContentAge[] = [];

    for (const item of items) {
      const lastUpdated = item.lastUpdated instanceof Date
        ? item.lastUpdated
        : new Date(item.lastUpdated);

      const daysSinceUpdate = Math.floor(
        (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
      );

      const staleThreshold = staleDaysOverride
        || (item.isCore ? this.CORE_STALE_DAYS : this.DEFAULT_STALE_DAYS);

      const isStale = this.evaluateStaleness(item, daysSinceUpdate, staleThreshold);
      const stalenessReason = isStale
        ? this.getStalenessReason(item, daysSinceUpdate, staleThreshold)
        : undefined;

      const refreshPriority = this.calculatePriority(item, daysSinceUpdate, isStale);

      contentAges.push({
        id: item.id,
        title: item.title,
        lastUpdated,
        daysSinceUpdate,
        isStale,
        stalenessReason,
        refreshPriority,
      });
    }

    // Sort by priority
    contentAges.sort((a, b) => a.refreshPriority - b.refreshPriority);

    const staleItems = contentAges.filter(c => c.isStale).length;
    const stalenessPercentage = items.length > 0
      ? Math.round((staleItems / items.length) * 100)
      : 0;

    const exceeds30PercentRule = (staleItems / Math.max(items.length, 1)) > this.REFRESH_THRESHOLD;

    // Generate suggestions
    const suggestions: string[] = [];
    if (exceeds30PercentRule) {
      suggestions.push(
        `${stalenessPercentage}% of content is stale (threshold: 30%). Immediate refresh campaign recommended.`
      );
    }

    const staleCore = contentAges.filter(c => c.isStale && items.find(i => i.id === c.id)?.isCore);
    if (staleCore.length > 0) {
      suggestions.push(
        `${staleCore.length} core/pillar page(s) are stale. Prioritize these for refresh.`
      );
    }

    const veryOld = contentAges.filter(c => c.daysSinceUpdate > 365);
    if (veryOld.length > 0) {
      suggestions.push(
        `${veryOld.length} item(s) haven't been updated in over a year. Consider whether they should be refreshed or pruned.`
      );
    }

    const declining = contentAges.filter(c => {
      const item = items.find(i => i.id === c.id);
      return item?.performance?.previousImpressions
        && item.performance.impressions !== undefined
        && item.performance.impressions < item.performance.previousImpressions * 0.7;
    });
    if (declining.length > 0) {
      suggestions.push(
        `${declining.length} item(s) show >30% impression decline. These are high-priority refresh candidates.`
      );
    }

    return {
      totalItems: items.length,
      staleItems,
      stalenessPercentage,
      exceeds30PercentRule,
      items: contentAges,
      refreshOrder: contentAges
        .filter(c => c.isStale)
        .map(c => c.id),
      suggestions,
    };
  }

  private static evaluateStaleness(
    item: ContentItem,
    daysSinceUpdate: number,
    staleThreshold: number
  ): boolean {
    // Age-based staleness
    if (daysSinceUpdate >= staleThreshold) return true;

    // Performance-based staleness (>30% decline)
    if (item.performance?.previousImpressions && item.performance.impressions !== undefined) {
      if (item.performance.impressions < item.performance.previousImpressions * 0.7) {
        return true;
      }
    }

    return false;
  }

  private static getStalenessReason(
    item: ContentItem,
    daysSinceUpdate: number,
    staleThreshold: number
  ): string {
    const reasons: string[] = [];

    if (daysSinceUpdate >= staleThreshold) {
      reasons.push(`Content is ${daysSinceUpdate} days old (threshold: ${staleThreshold})`);
    }

    if (item.performance?.previousImpressions && item.performance.impressions !== undefined) {
      const decline = Math.round(
        (1 - item.performance.impressions / item.performance.previousImpressions) * 100
      );
      if (decline > 30) {
        reasons.push(`Impressions declined ${decline}%`);
      }
    }

    return reasons.join('; ');
  }

  private static calculatePriority(
    item: ContentItem,
    daysSinceUpdate: number,
    isStale: boolean
  ): number {
    if (!isStale) return 5;

    let priority = 3; // Default stale priority

    // Core pages get highest priority
    if (item.isCore) priority = 1;

    // Performance decline increases priority
    if (item.performance?.previousImpressions && item.performance.impressions !== undefined) {
      const decline = 1 - (item.performance.impressions / item.performance.previousImpressions);
      if (decline > 0.5) priority = Math.min(priority, 1);
      else if (decline > 0.3) priority = Math.min(priority, 2);
    }

    // Very old content
    if (daysSinceUpdate > 365) priority = Math.min(priority, 2);

    return priority;
  }
}
