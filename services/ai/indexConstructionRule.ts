// services/ai/indexConstructionRule.ts

/**
 * IndexConstructionRule
 *
 * Decision engine for determining whether a query/topic deserves
 * its own standalone page or should be a section within another page.
 *
 * Framework rule: Not every topic needs its own page. Topics should
 * only get a standalone page when they have sufficient search volume,
 * distinct intent, and enough depth for standalone content.
 */

export type PageDecision = 'standalone_page' | 'section' | 'faq_entry' | 'merge_into_parent';

export interface IndexConstructionResult {
  /** The recommended decision */
  decision: PageDecision;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reasoning for the decision */
  reasoning: string;
  /** If merge, which parent topic */
  mergeTarget?: string;
  /** Minimum content depth (words) if standalone */
  minimumDepth?: number;
}

export interface TopicSignals {
  /** Topic name/query */
  topic: string;
  /** Monthly search volume (if available) */
  searchVolume?: number;
  /** Search intent (informational, navigational, transactional, commercial) */
  intent?: string;
  /** Estimated content depth needed (words) */
  estimatedDepth?: number;
  /** Parent topic (if subtopic) */
  parentTopic?: string;
  /** Semantic distance from parent (0-1) */
  distanceFromParent?: number;
  /** Number of related subtopics */
  subtopicCount?: number;
  /** Attribute category */
  category?: 'UNIQUE' | 'ROOT' | 'RARE' | 'COMMON';
  /** Does this topic have SERP features? */
  hasSerpFeatures?: boolean;
}

export class IndexConstructionRule {
  /**
   * Evaluate whether a topic deserves its own page.
   */
  static evaluate(signals: TopicSignals): IndexConstructionResult {
    const scores: Record<PageDecision, number> = {
      standalone_page: 0,
      section: 0,
      faq_entry: 0,
      merge_into_parent: 0,
    };

    // Factor 1: Search Volume
    if (signals.searchVolume !== undefined) {
      if (signals.searchVolume >= 1000) scores.standalone_page += 3;
      else if (signals.searchVolume >= 100) scores.standalone_page += 2;
      else if (signals.searchVolume >= 10) scores.section += 1;
      else scores.merge_into_parent += 2;
    }

    // Factor 2: Content Depth
    if (signals.estimatedDepth !== undefined) {
      if (signals.estimatedDepth >= 1500) scores.standalone_page += 3;
      else if (signals.estimatedDepth >= 500) scores.standalone_page += 1;
      else if (signals.estimatedDepth >= 200) scores.section += 2;
      else if (signals.estimatedDepth >= 50) scores.faq_entry += 2;
      else scores.merge_into_parent += 2;
    }

    // Factor 3: Intent
    if (signals.intent) {
      switch (signals.intent.toLowerCase()) {
        case 'transactional':
        case 'commercial':
          scores.standalone_page += 2;
          break;
        case 'informational':
          if ((signals.searchVolume || 0) >= 100) scores.standalone_page += 1;
          else scores.section += 1;
          break;
        case 'navigational':
          scores.standalone_page += 1;
          break;
      }
    }

    // Factor 4: Semantic Distance from Parent
    if (signals.distanceFromParent !== undefined) {
      if (signals.distanceFromParent > 0.6) scores.standalone_page += 2;
      else if (signals.distanceFromParent > 0.3) scores.section += 1;
      else scores.merge_into_parent += 2;
    }

    // Factor 5: Attribute Category
    if (signals.category) {
      switch (signals.category) {
        case 'UNIQUE': scores.standalone_page += 2; break;
        case 'ROOT': scores.standalone_page += 1; break;
        case 'RARE': scores.section += 1; break;
        case 'COMMON': scores.merge_into_parent += 1; break;
      }
    }

    // Factor 6: Subtopic count
    if (signals.subtopicCount !== undefined) {
      if (signals.subtopicCount >= 3) scores.standalone_page += 2;
      else if (signals.subtopicCount >= 1) scores.section += 1;
    }

    // Factor 7: SERP Features
    if (signals.hasSerpFeatures) {
      scores.standalone_page += 1;
    }

    // Determine winner
    const entries = Object.entries(scores) as [PageDecision, number][];
    entries.sort((a, b) => b[1] - a[1]);
    const [decision, topScore] = entries[0];
    const totalScore = entries.reduce((s, [, v]) => s + v, 0);
    const confidence = totalScore > 0 ? topScore / totalScore : 0.5;

    // Build reasoning
    const reasons: string[] = [];
    if (signals.searchVolume !== undefined) {
      reasons.push(`Search volume: ${signals.searchVolume}`);
    }
    if (signals.estimatedDepth !== undefined) {
      reasons.push(`Est. depth: ${signals.estimatedDepth} words`);
    }
    if (signals.distanceFromParent !== undefined) {
      reasons.push(`Distance from parent: ${signals.distanceFromParent.toFixed(2)}`);
    }
    if (signals.category) {
      reasons.push(`Category: ${signals.category}`);
    }

    return {
      decision,
      confidence: Math.round(confidence * 100) / 100,
      reasoning: `${decision}: ${reasons.join(', ')}`,
      mergeTarget: decision === 'merge_into_parent' ? signals.parentTopic : undefined,
      minimumDepth: decision === 'standalone_page'
        ? Math.max(800, signals.estimatedDepth || 800)
        : undefined,
    };
  }

  /**
   * Evaluate an entire topical map and return page decisions for all topics.
   */
  static evaluateMap(topics: TopicSignals[]): Map<string, IndexConstructionResult> {
    const results = new Map<string, IndexConstructionResult>();

    for (const topic of topics) {
      results.set(topic.topic, this.evaluate(topic));
    }

    return results;
  }
}
