// services/contentPruningAdvisor.ts

/**
 * ContentPruningAdvisor
 *
 * Identifies thin, orphan, and underperforming pages and recommends
 * the appropriate action: keep, refresh, consolidate, 301, or 410.
 *
 * Framework rule: Use 410 (Gone) instead of 404 for intentionally
 * removed content — it tells crawlers to stop revisiting.
 * Use 301 for content that has been consolidated elsewhere.
 */

export type PruningAction = 'keep' | 'refresh' | 'consolidate' | 'redirect_301' | 'remove_410' | 'noindex';

export interface PageMetrics {
  /** Page URL or identifier */
  url: string;
  /** Page title */
  title: string;
  /** Word count */
  wordCount: number;
  /** Number of internal links pointing to this page */
  inboundLinks: number;
  /** Number of internal links from this page */
  outboundLinks: number;
  /** Monthly organic impressions (if available) */
  impressions?: number;
  /** Monthly organic clicks (if available) */
  clicks?: number;
  /** Last updated date */
  lastUpdated?: Date | string;
  /** Is this a core/pillar page? */
  isCore?: boolean;
  /** Topical cluster */
  cluster?: string;
  /** Does this page have external backlinks? */
  hasBacklinks?: boolean;
  /** Number of indexed keywords */
  indexedKeywords?: number;
}

export interface PruningRecommendation {
  /** The page */
  url: string;
  title: string;
  /** Recommended action */
  action: PruningAction;
  /** Confidence in recommendation (0-1) */
  confidence: number;
  /** Reasoning */
  reasoning: string;
  /** If consolidate/redirect, target URL */
  targetUrl?: string;
  /** Priority (1=highest) */
  priority: number;
  /** Flags that triggered this recommendation */
  flags: string[];
}

export interface PruningReport {
  /** Total pages analyzed */
  totalPages: number;
  /** Pages to keep */
  keep: number;
  /** Pages to refresh */
  refresh: number;
  /** Pages to consolidate */
  consolidate: number;
  /** Pages to 301 redirect */
  redirect: number;
  /** Pages to 410 remove */
  remove: number;
  /** Pages to noindex */
  noindex: number;
  /** Per-page recommendations */
  recommendations: PruningRecommendation[];
  /** Summary suggestions */
  suggestions: string[];
}

export class ContentPruningAdvisor {
  private static readonly THIN_CONTENT_THRESHOLD = 300; // words
  private static readonly ORPHAN_LINK_THRESHOLD = 1; // Less than N inbound = orphan
  private static readonly LOW_PERFORMANCE_IMPRESSIONS = 10; // monthly
  private static readonly OLD_CONTENT_DAYS = 365;

  /**
   * Analyze pages and recommend pruning actions.
   */
  static analyze(
    pages: PageMetrics[],
    consolidationCandidates?: Map<string, string> // url -> target url
  ): PruningReport {
    const recommendations: PruningRecommendation[] = [];

    for (const page of pages) {
      const recommendation = this.evaluatePage(page, consolidationCandidates);
      recommendations.push(recommendation);
    }

    // Sort by priority
    recommendations.sort((a, b) => a.priority - b.priority);

    const counts = {
      keep: 0, refresh: 0, consolidate: 0, redirect: 0, remove: 0, noindex: 0,
    };
    for (const rec of recommendations) {
      switch (rec.action) {
        case 'keep': counts.keep++; break;
        case 'refresh': counts.refresh++; break;
        case 'consolidate': counts.consolidate++; break;
        case 'redirect_301': counts.redirect++; break;
        case 'remove_410': counts.remove++; break;
        case 'noindex': counts.noindex++; break;
      }
    }

    const suggestions = this.generateSuggestions(pages.length, counts, recommendations);

    return {
      totalPages: pages.length,
      ...counts,
      recommendations,
      suggestions,
    };
  }

  private static evaluatePage(
    page: PageMetrics,
    consolidationCandidates?: Map<string, string>
  ): PruningRecommendation {
    const flags: string[] = [];
    let score = 0; // Positive = keep, negative = prune

    // Factor 1: Content depth
    if (page.wordCount < this.THIN_CONTENT_THRESHOLD) {
      flags.push('thin_content');
      score -= 3;
    } else if (page.wordCount >= 1000) {
      score += 2;
    }

    // Factor 2: Internal linking (orphan detection)
    if (page.inboundLinks < this.ORPHAN_LINK_THRESHOLD) {
      flags.push('orphan_page');
      score -= 2;
    } else if (page.inboundLinks >= 5) {
      score += 2;
    }

    // Factor 3: Performance
    if (page.impressions !== undefined) {
      if (page.impressions < this.LOW_PERFORMANCE_IMPRESSIONS) {
        flags.push('low_performance');
        score -= 2;
      } else if (page.impressions >= 100) {
        score += 3;
      }
    }

    // Factor 4: Age
    if (page.lastUpdated) {
      const updated = page.lastUpdated instanceof Date
        ? page.lastUpdated
        : new Date(page.lastUpdated);
      const daysSince = Math.floor(
        (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince > this.OLD_CONTENT_DAYS) {
        flags.push('outdated');
        score -= 1;
      }
    }

    // Factor 5: Core pages always kept
    if (page.isCore) {
      flags.push('core_page');
      score += 5;
    }

    // Factor 6: External backlinks
    if (page.hasBacklinks) {
      flags.push('has_backlinks');
      score += 3;
    }

    // Factor 7: Indexed keywords
    if (page.indexedKeywords !== undefined && page.indexedKeywords > 0) {
      score += 1;
      if (page.indexedKeywords >= 10) score += 1;
    }

    // Determine action
    let action: PruningAction;
    let targetUrl: string | undefined;

    if (score >= 3) {
      action = 'keep';
    } else if (score >= 0) {
      action = 'refresh';
    } else if (consolidationCandidates?.has(page.url)) {
      action = 'consolidate';
      targetUrl = consolidationCandidates.get(page.url);
    } else if (page.hasBacklinks) {
      // Has backlinks but poor content — redirect to preserve link equity
      action = 'redirect_301';
    } else if (flags.includes('thin_content') && flags.includes('low_performance')) {
      // Thin + low performance + no backlinks — 410
      action = 'remove_410';
    } else if (flags.includes('orphan_page') && !flags.includes('core_page')) {
      action = 'noindex';
    } else {
      action = 'refresh';
    }

    // Calculate confidence
    const absScore = Math.abs(score);
    const confidence = Math.min(1, absScore / 8);

    // Calculate priority
    const priority = action === 'remove_410' ? 1
      : action === 'redirect_301' ? 2
      : action === 'consolidate' ? 2
      : action === 'noindex' ? 3
      : action === 'refresh' ? 4
      : 5;

    return {
      url: page.url,
      title: page.title,
      action,
      confidence: Math.round(confidence * 100) / 100,
      reasoning: this.buildReasoning(page, action, flags),
      targetUrl,
      priority,
      flags,
    };
  }

  private static buildReasoning(
    page: PageMetrics,
    action: PruningAction,
    flags: string[]
  ): string {
    const parts: string[] = [];

    switch (action) {
      case 'keep':
        parts.push('Content is performing well.');
        break;
      case 'refresh':
        parts.push('Content needs updating.');
        if (flags.includes('outdated')) parts.push('Content is over 1 year old.');
        break;
      case 'consolidate':
        parts.push('Content should be merged into a stronger page.');
        break;
      case 'redirect_301':
        parts.push('Page has backlinks — use 301 redirect to preserve link equity.');
        break;
      case 'remove_410':
        parts.push('Use 410 Gone to signal intentional removal. Crawlers will stop revisiting.');
        if (flags.includes('thin_content')) parts.push(`Only ${page.wordCount} words.`);
        break;
      case 'noindex':
        parts.push('Mark as noindex to prevent indexation of low-value page.');
        break;
    }

    return parts.join(' ');
  }

  private static generateSuggestions(
    total: number,
    counts: Record<string, number>,
    _recommendations: PruningRecommendation[]
  ): string[] {
    const suggestions: string[] = [];
    const pruneCount = counts.consolidate + counts.redirect + counts.remove + counts.noindex;
    const prunePercent = total > 0 ? Math.round((pruneCount / total) * 100) : 0;

    if (prunePercent > 30) {
      suggestions.push(
        `${prunePercent}% of pages recommended for pruning. Focus on high-priority 410s and 301s first.`
      );
    }

    if (counts.remove > 0) {
      suggestions.push(
        `${counts.remove} page(s) recommended for 410 removal. Use 410 (not 404) for intentional removals.`
      );
    }

    if (counts.redirect > 0) {
      suggestions.push(
        `${counts.redirect} page(s) should be 301 redirected to preserve backlink equity.`
      );
    }

    if (counts.refresh > 0) {
      suggestions.push(
        `${counts.refresh} page(s) need content refresh. Prioritize core/pillar pages first.`
      );
    }

    return suggestions;
  }
}
