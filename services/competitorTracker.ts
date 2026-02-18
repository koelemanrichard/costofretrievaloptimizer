// services/competitorTracker.ts

/**
 * CompetitorTracker
 *
 * Stores and compares competitor snapshots over time to detect
 * content, ranking, schema, and structural changes.
 *
 * Helps identify competitive threats and content opportunities
 * by monitoring what competitors publish and modify.
 */

export interface CompetitorSnapshot {
  /** Competitor domain */
  domain: string;
  /** Snapshot date */
  date: Date | string;
  /** Number of indexed pages (estimated) */
  indexedPages?: number;
  /** Top keywords this competitor ranks for */
  topKeywords?: KeywordRanking[];
  /** Schema types found on homepage */
  schemaTypes?: string[];
  /** Content topics/categories detected */
  contentTopics?: string[];
  /** New pages detected since last snapshot */
  newPages?: string[];
  /** Removed pages since last snapshot */
  removedPages?: string[];
  /** Average content length */
  avgContentLength?: number;
  /** Domain authority (if available) */
  domainAuthority?: number;
}

export interface KeywordRanking {
  /** Keyword */
  keyword: string;
  /** Current position */
  position: number;
  /** Previous position (if available) */
  previousPosition?: number;
  /** Estimated monthly volume */
  volume?: number;
}

export interface CompetitorChange {
  /** Type of change detected */
  type: 'new_content' | 'content_removed' | 'ranking_gained' | 'ranking_lost' | 'schema_change' | 'topic_expansion';
  /** Description */
  description: string;
  /** Severity/importance */
  importance: 'high' | 'medium' | 'low';
  /** Timestamp */
  detectedAt: Date;
  /** Related data */
  details?: Record<string, unknown>;
}

export interface CompetitorComparisonReport {
  /** Your domain */
  yourDomain: string;
  /** Competitors analyzed */
  competitors: string[];
  /** Changes detected */
  changes: CompetitorChange[];
  /** Content gaps (topics competitors cover that you don't) */
  contentGaps: string[];
  /** Your strengths (topics you cover that competitors don't) */
  yourStrengths: string[];
  /** Recommendations */
  recommendations: string[];
}

export class CompetitorTracker {
  private snapshots: Map<string, CompetitorSnapshot[]> = new Map();

  /**
   * Add a snapshot for a competitor.
   */
  addSnapshot(snapshot: CompetitorSnapshot): void {
    const domain = snapshot.domain;
    if (!this.snapshots.has(domain)) {
      this.snapshots.set(domain, []);
    }
    this.snapshots.get(domain)!.push({
      ...snapshot,
      date: snapshot.date instanceof Date ? snapshot.date : new Date(snapshot.date as string),
    });
  }

  /**
   * Detect changes between the two most recent snapshots for a competitor.
   */
  detectChanges(domain: string): CompetitorChange[] {
    const history = this.snapshots.get(domain);
    if (!history || history.length < 2) return [];

    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    const changes: CompetitorChange[] = [];
    const now = new Date();

    // New content
    if (current.newPages && current.newPages.length > 0) {
      changes.push({
        type: 'new_content',
        description: `${domain} published ${current.newPages.length} new page(s): ${current.newPages.slice(0, 3).join(', ')}${current.newPages.length > 3 ? '...' : ''}`,
        importance: current.newPages.length >= 5 ? 'high' : 'medium',
        detectedAt: now,
        details: { pages: current.newPages },
      });
    }

    // Removed content
    if (current.removedPages && current.removedPages.length > 0) {
      changes.push({
        type: 'content_removed',
        description: `${domain} removed ${current.removedPages.length} page(s)`,
        importance: 'low',
        detectedAt: now,
        details: { pages: current.removedPages },
      });
    }

    // Ranking changes
    if (current.topKeywords && previous.topKeywords) {
      const prevMap = new Map(previous.topKeywords.map(k => [k.keyword, k.position]));

      for (const kw of current.topKeywords) {
        const prevPos = prevMap.get(kw.keyword);
        if (prevPos === undefined) {
          // New ranking
          changes.push({
            type: 'ranking_gained',
            description: `${domain} now ranks #${kw.position} for "${kw.keyword}"`,
            importance: kw.position <= 3 ? 'high' : kw.position <= 10 ? 'medium' : 'low',
            detectedAt: now,
            details: { keyword: kw.keyword, position: kw.position },
          });
        } else if (kw.position < prevPos - 5) {
          // Significant improvement
          changes.push({
            type: 'ranking_gained',
            description: `${domain} improved from #${prevPos} to #${kw.position} for "${kw.keyword}"`,
            importance: kw.position <= 5 ? 'high' : 'medium',
            detectedAt: now,
            details: { keyword: kw.keyword, from: prevPos, to: kw.position },
          });
        }
      }

      // Lost rankings
      for (const kw of previous.topKeywords) {
        const currentKw = current.topKeywords.find(k => k.keyword === kw.keyword);
        if (!currentKw) {
          changes.push({
            type: 'ranking_lost',
            description: `${domain} lost ranking for "${kw.keyword}" (was #${kw.position})`,
            importance: kw.position <= 10 ? 'medium' : 'low',
            detectedAt: now,
            details: { keyword: kw.keyword, previousPosition: kw.position },
          });
        }
      }
    }

    // Schema changes
    if (current.schemaTypes && previous.schemaTypes) {
      const newTypes = current.schemaTypes.filter(t => !previous.schemaTypes!.includes(t));
      if (newTypes.length > 0) {
        changes.push({
          type: 'schema_change',
          description: `${domain} added schema types: ${newTypes.join(', ')}`,
          importance: 'medium',
          detectedAt: now,
          details: { newTypes },
        });
      }
    }

    // Topic expansion
    if (current.contentTopics && previous.contentTopics) {
      const newTopics = current.contentTopics.filter(t => !previous.contentTopics!.includes(t));
      if (newTopics.length > 0) {
        changes.push({
          type: 'topic_expansion',
          description: `${domain} expanded into new topics: ${newTopics.slice(0, 5).join(', ')}`,
          importance: newTopics.length >= 3 ? 'high' : 'medium',
          detectedAt: now,
          details: { newTopics },
        });
      }
    }

    return changes;
  }

  /**
   * Compare your site against competitors.
   */
  static compare(
    yourTopics: string[],
    competitorTopicsMap: Map<string, string[]>
  ): CompetitorComparisonReport {
    const yourTopicsLower = new Set(yourTopics.map(t => t.toLowerCase()));
    const allCompetitorTopics = new Set<string>();
    const recommendations: string[] = [];

    for (const [, topics] of competitorTopicsMap) {
      for (const topic of topics) {
        allCompetitorTopics.add(topic.toLowerCase());
      }
    }

    // Content gaps: competitors have, you don't
    const contentGaps = [...allCompetitorTopics]
      .filter(t => !yourTopicsLower.has(t));

    // Your strengths: you have, no competitor has
    const yourStrengths = [...yourTopicsLower]
      .filter(t => !allCompetitorTopics.has(t));

    if (contentGaps.length > 0) {
      recommendations.push(
        `${contentGaps.length} topic(s) covered by competitors but missing from your site. Prioritize high-volume gaps.`
      );
    }

    if (yourStrengths.length > 0) {
      recommendations.push(
        `You cover ${yourStrengths.length} unique topic(s). Strengthen these as competitive advantages.`
      );
    }

    // Overlap analysis
    const overlap = [...yourTopicsLower].filter(t => allCompetitorTopics.has(t));
    if (overlap.length > 0) {
      recommendations.push(
        `${overlap.length} topic(s) overlap with competitors. Ensure your content depth exceeds theirs for differentiation.`
      );
    }

    return {
      yourDomain: '',
      competitors: [...competitorTopicsMap.keys()],
      changes: [],
      contentGaps: contentGaps.slice(0, 50),
      yourStrengths: yourStrengths.slice(0, 50),
      recommendations,
    };
  }

  /**
   * Get all snapshots for a domain.
   */
  getHistory(domain: string): CompetitorSnapshot[] {
    return this.snapshots.get(domain) || [];
  }
}
