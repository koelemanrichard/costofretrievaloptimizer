// services/audit/rules/NgramConsistencyChecker.ts

/**
 * NgramConsistencyChecker
 *
 * Analyzes N-gram distribution across pages to ensure consistent
 * terminology usage. Inconsistent N-gram usage increases Cost of
 * Retrieval by forcing search engines to reconcile different terms
 * for the same concept.
 *
 * Checks:
 * - Core entity N-grams used consistently
 * - No competing terms for the same concept
 * - Template consistency (boilerplate N-grams stable)
 * - Boilerplate ratio acceptable (<30%)
 */

export interface NgramAnalysis {
  /** The N-gram text */
  ngram: string;
  /** N (unigram=1, bigram=2, trigram=3) */
  n: number;
  /** Number of pages this appears on */
  pageCount: number;
  /** Total occurrences across all pages */
  totalOccurrences: number;
  /** Is this a boilerplate N-gram? (appears on >80% of pages) */
  isBoilerplate: boolean;
  /** Variance in frequency across pages (lower = more consistent) */
  frequencyVariance: number;
}

export interface NgramConsistencyReport {
  /** Total unique N-grams found */
  totalNgrams: number;
  /** Core entity N-grams */
  coreNgrams: NgramAnalysis[];
  /** Boilerplate N-grams */
  boilerplateNgrams: NgramAnalysis[];
  /** Inconsistent N-grams (high variance) */
  inconsistentNgrams: NgramAnalysis[];
  /** Boilerplate ratio (boilerplate tokens / total tokens) */
  boilerplateRatio: number;
  /** Consistency score (0-100) */
  consistencyScore: number;
  /** Issues found */
  issues: NgramIssue[];
  /** Suggestions */
  suggestions: string[];
}

export interface NgramIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
}

export class NgramConsistencyChecker {
  private static readonly BOILERPLATE_THRESHOLD = 0.8; // 80% of pages
  private static readonly MAX_BOILERPLATE_RATIO = 0.30; // 30%
  private static readonly HIGH_VARIANCE_THRESHOLD = 2.0; // Standard deviations

  /**
   * Extract N-grams from text.
   */
  static extractNgrams(text: string, maxN: number = 3): Map<string, number> {
    const ngrams = new Map<string, number>();
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1);

    for (let n = 1; n <= maxN; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        const ngram = words.slice(i, i + n).join(' ');
        ngrams.set(ngram, (ngrams.get(ngram) || 0) + 1);
      }
    }

    return ngrams;
  }

  /**
   * Analyze N-gram consistency across multiple pages.
   */
  static analyze(
    pages: Map<string, string>, // url -> text content
    centralEntity?: string
  ): NgramConsistencyReport {
    const pageCount = pages.size;
    if (pageCount === 0) {
      return this.emptyReport();
    }

    // Extract N-grams per page
    const pageNgrams = new Map<string, Map<string, number>>();
    for (const [url, text] of pages) {
      pageNgrams.set(url, this.extractNgrams(text));
    }

    // Aggregate across pages
    const globalNgrams = new Map<string, {
      pages: Set<string>;
      frequencies: number[];
      totalOccurrences: number;
    }>();

    for (const [url, ngrams] of pageNgrams) {
      for (const [ngram, count] of ngrams) {
        if (!globalNgrams.has(ngram)) {
          globalNgrams.set(ngram, { pages: new Set(), frequencies: [], totalOccurrences: 0 });
        }
        const entry = globalNgrams.get(ngram)!;
        entry.pages.add(url);
        entry.frequencies.push(count);
        entry.totalOccurrences += count;
      }
    }

    // Calculate per-ngram statistics
    const analyses: NgramAnalysis[] = [];
    for (const [ngram, data] of globalNgrams) {
      const ngramWords = ngram.split(' ').length;
      const isBoilerplate = data.pages.size / pageCount >= this.BOILERPLATE_THRESHOLD;

      // Calculate frequency variance
      const mean = data.totalOccurrences / pageCount;
      const variance = data.frequencies.reduce(
        (s, f) => s + Math.pow(f - mean, 2), 0
      ) / Math.max(pageCount - 1, 1);
      const frequencyVariance = mean > 0
        ? Math.round(Math.sqrt(variance) / mean * 100) / 100
        : 0;

      analyses.push({
        ngram,
        n: ngramWords,
        pageCount: data.pages.size,
        totalOccurrences: data.totalOccurrences,
        isBoilerplate,
        frequencyVariance,
      });
    }

    // Sort by occurrence
    analyses.sort((a, b) => b.totalOccurrences - a.totalOccurrences);

    // Categorize
    const coreNgrams = centralEntity
      ? analyses.filter(a =>
          a.ngram.includes(centralEntity.toLowerCase()) ||
          centralEntity.toLowerCase().includes(a.ngram)
        )
      : analyses.filter(a => a.pageCount >= pageCount * 0.5 && !a.isBoilerplate).slice(0, 20);

    const boilerplateNgrams = analyses.filter(a => a.isBoilerplate);
    const inconsistentNgrams = analyses.filter(
      a => a.frequencyVariance > this.HIGH_VARIANCE_THRESHOLD && a.pageCount >= 2
    );

    // Calculate boilerplate ratio
    const totalTokens = analyses.reduce((s, a) => s + a.totalOccurrences, 0);
    const boilerplateTokens = boilerplateNgrams.reduce((s, a) => s + a.totalOccurrences, 0);
    const boilerplateRatio = totalTokens > 0
      ? Math.round((boilerplateTokens / totalTokens) * 100) / 100
      : 0;

    // Issues
    const issues: NgramIssue[] = [];

    if (boilerplateRatio > this.MAX_BOILERPLATE_RATIO) {
      issues.push({
        ruleId: 'ngram-boilerplate-ratio',
        severity: 'high',
        title: `High boilerplate ratio: ${Math.round(boilerplateRatio * 100)}%`,
        description: `Boilerplate content represents ${Math.round(boilerplateRatio * 100)}% of total content (target: <30%). Reduce template repetition.`,
      });
    }

    if (centralEntity && coreNgrams.length === 0) {
      issues.push({
        ruleId: 'ngram-missing-ce',
        severity: 'critical',
        title: 'Central entity not consistently present in content',
        description: `"${centralEntity}" N-grams not found consistently across pages. Ensure CE appears in all content.`,
      });
    }

    if (inconsistentNgrams.length > 10) {
      issues.push({
        ruleId: 'ngram-inconsistent-terminology',
        severity: 'medium',
        title: `${inconsistentNgrams.length} N-grams used inconsistently`,
        description: 'Multiple N-grams have high frequency variance across pages, suggesting inconsistent terminology.',
      });
    }

    // Consistency score
    const consistencyScore = this.calculateConsistencyScore(
      boilerplateRatio, inconsistentNgrams.length, coreNgrams, pageCount
    );

    // Suggestions
    const suggestions: string[] = [];
    if (boilerplateRatio > 0.3) {
      suggestions.push('Reduce boilerplate content. Each page should have >70% unique content.');
    }
    if (inconsistentNgrams.length > 5) {
      suggestions.push(
        `Standardize terminology: ${inconsistentNgrams.slice(0, 3).map(n => `"${n.ngram}"`).join(', ')} have inconsistent usage.`
      );
    }

    return {
      totalNgrams: analyses.length,
      coreNgrams: coreNgrams.slice(0, 50),
      boilerplateNgrams: boilerplateNgrams.slice(0, 50),
      inconsistentNgrams: inconsistentNgrams.slice(0, 50),
      boilerplateRatio,
      consistencyScore,
      issues,
      suggestions,
    };
  }

  private static calculateConsistencyScore(
    boilerplateRatio: number,
    inconsistentCount: number,
    coreNgrams: NgramAnalysis[],
    _pageCount: number
  ): number {
    let score = 100;

    // Penalize high boilerplate
    if (boilerplateRatio > 0.3) score -= 20;
    else if (boilerplateRatio > 0.2) score -= 10;

    // Penalize inconsistent terminology
    score -= Math.min(30, inconsistentCount * 3);

    // Reward consistent core N-grams
    if (coreNgrams.length > 0) {
      const avgCoreVariance = coreNgrams.reduce((s, n) => s + n.frequencyVariance, 0) / coreNgrams.length;
      if (avgCoreVariance < 0.5) score += 10;
      else if (avgCoreVariance > 2) score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  private static emptyReport(): NgramConsistencyReport {
    return {
      totalNgrams: 0,
      coreNgrams: [],
      boilerplateNgrams: [],
      inconsistentNgrams: [],
      boilerplateRatio: 0,
      consistencyScore: 100,
      issues: [],
      suggestions: [],
    };
  }
}
