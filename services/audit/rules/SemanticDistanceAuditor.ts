/**
 * SemanticDistanceAuditor
 *
 * Validates that each page targets a unique focus topic. When multiple pages
 * target the same or very similar topics, keyword cannibalization occurs.
 *
 * Uses the project's semantic distance model thresholds:
 *   distance < 0.2  = cannibalization risk
 *   distance 0.2-0.3 = potential overlap (warning)
 *   distance 0.3-0.7 = linking sweet spot
 *   distance > 0.7  = different clusters
 *
 * Rules implemented:
 *   203 - Canonical query assignment: each page must have a unique focus topic
 */

export interface SemanticDistanceInput {
  /** Current page's primary topic/keyword */
  pageTopic: string;

  /** All other pages' topics with their URLs */
  otherPages: Array<{
    url: string;
    topic: string;
  }>;

  /** Optional: pre-computed semantic distances to other pages */
  precomputedDistances?: Array<{
    url: string;
    topic: string;
    distance: number; // 0-1, where <0.2 = cannibalization risk
  }>;
}

export interface SemanticDistanceIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class SemanticDistanceAuditor {
  private static readonly CANNIBALIZATION_THRESHOLD = 0.2;
  private static readonly OVERLAP_THRESHOLD = 0.3;

  private static readonly STOP_WORDS = new Set([
    'the',
    'a',
    'an',
    'is',
    'are',
    'of',
    'in',
    'for',
    'to',
    'and',
    'or',
    'with',
    'on',
    'by',
    'at',
    'from',
  ]);

  validate(input: SemanticDistanceInput): SemanticDistanceIssue[] {
    const issues: SemanticDistanceIssue[] = [];

    if (!input.pageTopic || (!input.otherPages?.length && !input.precomputedDistances?.length)) {
      return issues;
    }

    const distances = input.precomputedDistances ?? this.computeDistances(input);

    this.checkCannibalizationRisk(input.pageTopic, distances, issues);

    return issues;
  }

  /**
   * Rule 203: Canonical query assignment.
   * Flag pages whose semantic distance to the current page falls below thresholds.
   */
  private checkCannibalizationRisk(
    pageTopic: string,
    distances: Array<{ url: string; topic: string; distance: number }>,
    issues: SemanticDistanceIssue[]
  ): void {
    for (const entry of distances) {
      if (entry.distance < SemanticDistanceAuditor.CANNIBALIZATION_THRESHOLD) {
        issues.push({
          ruleId: 'rule-203',
          severity: 'high',
          title: 'Keyword cannibalization risk',
          description:
            `Topic "${pageTopic}" has a semantic distance of ${entry.distance.toFixed(2)} ` +
            `to "${entry.topic}" (${entry.url}). Distance < 0.2 indicates these pages ` +
            'compete for the same queries, diluting ranking signals.',
          affectedElement: entry.url,
          exampleFix:
            'Merge the two pages into one comprehensive piece, or differentiate their focus ' +
            'topics so the semantic distance exceeds 0.2.',
        });
      } else if (entry.distance < SemanticDistanceAuditor.OVERLAP_THRESHOLD) {
        issues.push({
          ruleId: 'rule-203',
          severity: 'medium',
          title: 'Potential topic overlap',
          description:
            `Topic "${pageTopic}" has a semantic distance of ${entry.distance.toFixed(2)} ` +
            `to "${entry.topic}" (${entry.url}). Distance 0.2-0.3 indicates significant ` +
            'overlap that may cause partial cannibalization.',
          affectedElement: entry.url,
          exampleFix:
            'Review both pages and ensure each has a clearly differentiated angle, unique ' +
            'EAVs, and distinct search intent coverage.',
        });
      }
    }
  }

  /**
   * Compute distances using Jaccard similarity as a heuristic when
   * pre-computed embedding-based distances are not available.
   */
  private computeDistances(
    input: SemanticDistanceInput
  ): Array<{ url: string; topic: string; distance: number }> {
    const pageWords = this.getSignificantWords(input.pageTopic);

    return input.otherPages.map((other) => {
      const otherWords = this.getSignificantWords(other.topic);
      const similarity = this.jaccardSimilarity(pageWords, otherWords);
      return {
        url: other.url,
        topic: other.topic,
        distance: 1 - similarity,
      };
    });
  }

  /**
   * Extract significant words from a topic string, filtering stop words
   * and very short tokens.
   */
  getSignificantWords(text: string): Set<string> {
    return new Set(
      text
        .toLowerCase()
        .split(/\W+/)
        .filter(
          (w) => w.length > 2 && !SemanticDistanceAuditor.STOP_WORDS.has(w)
        )
    );
  }

  /**
   * Jaccard similarity coefficient: |intersection| / |union|.
   * Returns 0 when both sets are empty to avoid division by zero.
   */
  jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) return 0;
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }
}
