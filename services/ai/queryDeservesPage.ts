// services/ai/queryDeservesPage.ts

/**
 * QueryDeservesPage (QDP)
 *
 * Decision matrix for evaluating whether a query deserves its own page,
 * a section within an existing page, an FAQ entry, or should be merged.
 *
 * Based on the framework's Query Deserves Page concept:
 * - Volume + Intent + Depth = Decision
 * - High volume + transactional = standalone
 * - Low volume + informational + shallow = FAQ or merge
 */

export type QDPDecision = 'page' | 'section' | 'faq' | 'merge' | 'skip';

export interface QDPSignals {
  /** The query/keyword */
  query: string;
  /** Monthly search volume */
  volume: number;
  /** Search intent */
  intent: 'informational' | 'navigational' | 'transactional' | 'commercial';
  /** Expected content depth (words) to fully answer */
  expectedDepth: number;
  /** Is there a parent page that already partially covers this? */
  hasParentPage?: boolean;
  /** Semantic distance from central entity */
  ceDistance?: number;
  /** Competition level (0-1, higher = more competitive) */
  competition?: number;
  /** Number of SERP features for this query */
  serpFeatureCount?: number;
}

export interface QDPResult {
  /** Decision */
  decision: QDPDecision;
  /** Score breakdown */
  scores: {
    volumeScore: number;
    intentScore: number;
    depthScore: number;
    competitionScore: number;
    total: number;
  };
  /** Human-readable explanation */
  explanation: string;
  /** Priority for implementation (1=highest) */
  priority: number;
}

/**
 * QDP Decision Matrix:
 *
 * | Volume   | Intent         | Depth     | → Decision    |
 * |----------|----------------|-----------|---------------|
 * | High     | Transactional  | Any       | Page          |
 * | High     | Informational  | Deep      | Page          |
 * | High     | Informational  | Shallow   | Section       |
 * | Medium   | Any            | Deep      | Page          |
 * | Medium   | Any            | Shallow   | Section       |
 * | Low      | Any            | Deep      | Section       |
 * | Low      | Any            | Medium    | FAQ           |
 * | Low      | Any            | Shallow   | Merge/Skip    |
 */
export class QueryDeservesPage {
  private static readonly VOLUME_HIGH = 500;
  private static readonly VOLUME_MEDIUM = 50;
  private static readonly DEPTH_DEEP = 1000;
  private static readonly DEPTH_MEDIUM = 300;

  /**
   * Evaluate a single query.
   */
  static evaluate(signals: QDPSignals): QDPResult {
    // Score components (0-10 each)
    const volumeScore = this.scoreVolume(signals.volume);
    const intentScore = this.scoreIntent(signals.intent);
    const depthScore = this.scoreDepth(signals.expectedDepth);
    const competitionScore = signals.competition !== undefined
      ? Math.round((1 - signals.competition) * 10) // Lower competition = higher score
      : 5;

    const total = volumeScore + intentScore + depthScore + competitionScore;

    // Decision logic
    let decision: QDPDecision;

    if (signals.volume >= this.VOLUME_HIGH && signals.intent === 'transactional') {
      decision = 'page';
    } else if (signals.volume >= this.VOLUME_HIGH && signals.expectedDepth >= this.DEPTH_DEEP) {
      decision = 'page';
    } else if (total >= 28) {
      decision = 'page';
    } else if (total >= 20) {
      decision = 'section';
    } else if (total >= 12 && signals.expectedDepth >= this.DEPTH_MEDIUM) {
      decision = 'faq';
    } else if (total >= 8) {
      decision = 'merge';
    } else {
      decision = 'skip';
    }

    // Override: if has parent page and low volume, prefer section/merge
    if (signals.hasParentPage && signals.volume < this.VOLUME_MEDIUM) {
      if (decision === 'page') decision = 'section';
    }

    // Override: if far from CE (>0.8), downgrade
    if (signals.ceDistance && signals.ceDistance > 0.8) {
      if (decision === 'page') decision = 'section';
      if (decision === 'section') decision = 'merge';
    }

    // Priority (1=highest, inversely proportional to total score)
    const priority = total >= 30 ? 1 : total >= 25 ? 2 : total >= 20 ? 3 : total >= 15 ? 4 : 5;

    return {
      decision,
      scores: { volumeScore, intentScore, depthScore, competitionScore, total },
      explanation: this.buildExplanation(signals, decision, total),
      priority,
    };
  }

  /**
   * Evaluate a batch of queries and sort by priority.
   */
  static evaluateBatch(queries: QDPSignals[]): Map<string, QDPResult> {
    const results = new Map<string, QDPResult>();
    for (const q of queries) {
      results.set(q.query, this.evaluate(q));
    }
    return results;
  }

  private static scoreVolume(volume: number): number {
    if (volume >= 10000) return 10;
    if (volume >= 5000) return 9;
    if (volume >= 1000) return 8;
    if (volume >= 500) return 7;
    if (volume >= 100) return 5;
    if (volume >= 50) return 3;
    if (volume >= 10) return 2;
    return 1;
  }

  private static scoreIntent(intent: string): number {
    switch (intent) {
      case 'transactional': return 10;
      case 'commercial': return 8;
      case 'informational': return 5;
      case 'navigational': return 3;
      default: return 5;
    }
  }

  private static scoreDepth(depth: number): number {
    if (depth >= 2000) return 10;
    if (depth >= 1500) return 8;
    if (depth >= 1000) return 7;
    if (depth >= 500) return 5;
    if (depth >= 300) return 3;
    return 1;
  }

  private static buildExplanation(
    signals: QDPSignals,
    decision: QDPDecision,
    total: number
  ): string {
    const parts: string[] = [`"${signals.query}"`];
    parts.push(`→ ${decision.toUpperCase()}`);
    parts.push(`(score: ${total}/40)`);
    parts.push(`vol: ${signals.volume}`);
    parts.push(`intent: ${signals.intent}`);
    parts.push(`depth: ${signals.expectedDepth}w`);
    return parts.join(' | ');
  }
}
