// lib/pageRankSimulator.ts

/**
 * PageRankSimulator
 *
 * Simulates PageRank flow through the internal link structure of a site.
 * Uses the classic iterative power method with a damping factor.
 *
 * Key concepts:
 * - Core Section pages should receive highest PageRank flow
 * - Hub pages distribute PR to spoke pages
 * - Orphan pages receive no flow
 * - Damping factor (0.85) represents probability of following a link
 */

export interface LinkEdge {
  /** Source page URL/ID */
  from: string;
  /** Target page URL/ID */
  to: string;
  /** Link weight (default 1, can be used for main content vs boilerplate) */
  weight?: number;
}

export interface PageRankResult {
  /** Page URL/ID */
  page: string;
  /** Computed PageRank score */
  score: number;
  /** Normalized rank (0-100) */
  normalizedScore: number;
  /** Number of inbound links */
  inboundLinks: number;
  /** Number of outbound links */
  outboundLinks: number;
}

export interface PageRankReport {
  /** Results sorted by score (descending) */
  results: PageRankResult[];
  /** Did the algorithm converge? */
  converged: boolean;
  /** Number of iterations used */
  iterations: number;
  /** Total pages in the graph */
  totalPages: number;
  /** Orphan pages (no inbound links) */
  orphanPages: string[];
  /** Sink pages (no outbound links) */
  sinkPages: string[];
  /** Suggestions for improving PR flow */
  suggestions: string[];
}

export class PageRankSimulator {
  private static readonly DEFAULT_DAMPING = 0.85;
  private static readonly DEFAULT_MAX_ITERATIONS = 100;
  private static readonly DEFAULT_CONVERGENCE_THRESHOLD = 0.0001;

  /**
   * Run PageRank simulation on a link graph.
   */
  static simulate(
    edges: LinkEdge[],
    options?: {
      damping?: number;
      maxIterations?: number;
      convergenceThreshold?: number;
    }
  ): PageRankReport {
    const damping = options?.damping ?? this.DEFAULT_DAMPING;
    const maxIterations = options?.maxIterations ?? this.DEFAULT_MAX_ITERATIONS;
    const convergenceThreshold = options?.convergenceThreshold ?? this.DEFAULT_CONVERGENCE_THRESHOLD;

    // Build adjacency structure
    const allPages = new Set<string>();
    const outLinks = new Map<string, Map<string, number>>(); // from -> (to -> weight)
    const inLinks = new Map<string, Set<string>>(); // to -> set of from

    for (const edge of edges) {
      allPages.add(edge.from);
      allPages.add(edge.to);

      if (!outLinks.has(edge.from)) outLinks.set(edge.from, new Map());
      outLinks.get(edge.from)!.set(edge.to, edge.weight ?? 1);

      if (!inLinks.has(edge.to)) inLinks.set(edge.to, new Set());
      inLinks.get(edge.to)!.add(edge.from);
    }

    const pages = [...allPages];
    const N = pages.length;
    if (N === 0) {
      return {
        results: [],
        converged: true,
        iterations: 0,
        totalPages: 0,
        orphanPages: [],
        sinkPages: [],
        suggestions: [],
      };
    }

    const pageIndex = new Map<string, number>();
    pages.forEach((p, i) => pageIndex.set(p, i));

    // Initialize PageRank uniformly
    let pr = new Array(N).fill(1 / N);
    let converged = false;
    let iterations = 0;

    // Identify sink pages (no outbound links)
    const sinkPages = pages.filter(p => !outLinks.has(p) || outLinks.get(p)!.size === 0);
    const sinkIndices = new Set(sinkPages.map(p => pageIndex.get(p)!));

    // Iterative computation
    for (let iter = 0; iter < maxIterations; iter++) {
      iterations = iter + 1;
      const newPr = new Array(N).fill((1 - damping) / N);

      // Redistribute sink PageRank evenly
      let sinkPr = 0;
      for (const si of sinkIndices) {
        sinkPr += pr[si];
      }
      const sinkContribution = damping * sinkPr / N;
      for (let i = 0; i < N; i++) {
        newPr[i] += sinkContribution;
      }

      // Normal link contribution
      for (const [from, targets] of outLinks) {
        const fromIdx = pageIndex.get(from)!;
        // Calculate total outbound weight
        let totalWeight = 0;
        for (const w of targets.values()) totalWeight += w;

        for (const [to, weight] of targets) {
          const toIdx = pageIndex.get(to)!;
          newPr[toIdx] += damping * pr[fromIdx] * (weight / totalWeight);
        }
      }

      // Check convergence
      let maxDiff = 0;
      for (let i = 0; i < N; i++) {
        maxDiff = Math.max(maxDiff, Math.abs(newPr[i] - pr[i]));
      }

      pr = newPr;

      if (maxDiff < convergenceThreshold) {
        converged = true;
        break;
      }
    }

    // Build results
    const maxPr = Math.max(...pr);
    const results: PageRankResult[] = pages.map((page, i) => ({
      page,
      score: Math.round(pr[i] * 1000000) / 1000000,
      normalizedScore: maxPr > 0 ? Math.round((pr[i] / maxPr) * 100) : 0,
      inboundLinks: inLinks.get(page)?.size || 0,
      outboundLinks: outLinks.get(page)?.size || 0,
    }));

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Identify orphan pages (no inbound links from other pages)
    const orphanPages = pages.filter(p => !inLinks.has(p) || inLinks.get(p)!.size === 0);

    // Generate suggestions
    const suggestions: string[] = [];

    if (orphanPages.length > 0) {
      suggestions.push(
        `${orphanPages.length} orphan page(s) receive no internal links: ${orphanPages.slice(0, 5).join(', ')}${orphanPages.length > 5 ? '...' : ''}`
      );
    }

    if (sinkPages.length > 0) {
      suggestions.push(
        `${sinkPages.length} sink page(s) have no outbound links, wasting PageRank: ${sinkPages.slice(0, 5).join(', ')}${sinkPages.length > 5 ? '...' : ''}`
      );
    }

    // Check if top pages are core pages
    const top5 = results.slice(0, 5);
    suggestions.push(
      `Top 5 pages by PageRank: ${top5.map(r => `${r.page} (${r.normalizedScore})`).join(', ')}`
    );

    // Detect PageRank hoarding
    if (results.length >= 5) {
      const top20Percent = Math.ceil(N * 0.2);
      const topPrSum = results.slice(0, top20Percent).reduce((s, r) => s + r.score, 0);
      const totalPrSum = results.reduce((s, r) => s + r.score, 0);
      if (totalPrSum > 0 && topPrSum / totalPrSum > 0.8) {
        suggestions.push(
          'Top 20% of pages hold >80% of PageRank. Consider better internal link distribution.'
        );
      }
    }

    return {
      results,
      converged,
      iterations,
      totalPages: N,
      orphanPages,
      sinkPages,
      suggestions,
    };
  }
}
