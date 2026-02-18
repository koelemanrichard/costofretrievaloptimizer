// services/ai/topicalBorderValidator.ts

/**
 * TopicalBorderValidator
 *
 * Validates that topics stay within the semantic boundary of the central entity.
 * Uses semantic distance from the knowledge graph to detect border breaches.
 *
 * Framework rule: Topics with semantic distance > 0.8 from the central entity
 * are outside topical borders and risk diluting authority.
 */

export interface TopicalBorderResult {
  /** Is the topic within topical borders? */
  withinBorders: boolean;
  /** Semantic distance from central entity (0-1) */
  distanceFromCE: number;
  /** Risk level */
  risk: 'none' | 'low' | 'medium' | 'high';
  /** Suggestion if outside borders */
  suggestion?: string;
}

export interface TopicalBorderReport {
  /** Central entity */
  centralEntity: string;
  /** Total topics analyzed */
  totalTopics: number;
  /** Topics within borders */
  withinBorders: number;
  /** Topics at risk (0.7-0.8 distance) */
  atRisk: number;
  /** Topics outside borders (>0.8 distance) */
  outsideBorders: number;
  /** Per-topic results */
  topicResults: Map<string, TopicalBorderResult>;
  /** Overall border health score (0-100) */
  borderHealthScore: number;
}

/**
 * Thresholds for topical border validation.
 */
const BORDER_THRESHOLDS = {
  /** Maximum distance for a topic to be considered "within borders" */
  withinBorder: 0.7,
  /** Distance above which a topic is "at risk" of being outside */
  atRisk: 0.7,
  /** Distance above which a topic is definitively "outside borders" */
  outsideBorder: 0.8,
};

export class TopicalBorderValidator {
  /**
   * Validate a single topic's position relative to the central entity.
   */
  static validateTopic(
    topic: string,
    centralEntity: string,
    semanticDistance: number
  ): TopicalBorderResult {
    if (semanticDistance <= BORDER_THRESHOLDS.withinBorder) {
      return {
        withinBorders: true,
        distanceFromCE: semanticDistance,
        risk: 'none',
      };
    }

    if (semanticDistance <= BORDER_THRESHOLDS.outsideBorder) {
      return {
        withinBorders: true,
        distanceFromCE: semanticDistance,
        risk: 'medium',
        suggestion: `"${topic}" is near the topical border (distance: ${semanticDistance.toFixed(2)}). Consider strengthening its connection to "${centralEntity}" through bridge content.`,
      };
    }

    return {
      withinBorders: false,
      distanceFromCE: semanticDistance,
      risk: 'high',
      suggestion: `"${topic}" is outside topical borders (distance: ${semanticDistance.toFixed(2)}). Consider: (1) removing it, (2) creating bridge content to connect it to "${centralEntity}", or (3) making it a separate topical map.`,
    };
  }

  /**
   * Validate all topics in a topical map against the central entity.
   * Requires a distance function that calculates semantic distance between two terms.
   */
  static validateMap(
    centralEntity: string,
    topics: string[],
    distanceFunction: (a: string, b: string) => number
  ): TopicalBorderReport {
    const topicResults = new Map<string, TopicalBorderResult>();
    let withinBorders = 0;
    let atRisk = 0;
    let outsideBorders = 0;

    for (const topic of topics) {
      const distance = distanceFunction(centralEntity, topic);
      const result = this.validateTopic(topic, centralEntity, distance);
      topicResults.set(topic, result);

      if (result.risk === 'none') withinBorders++;
      else if (result.risk === 'medium') atRisk++;
      else if (result.risk === 'high') outsideBorders++;
    }

    // Calculate border health score
    const total = topics.length || 1;
    const borderHealthScore = Math.round(
      ((withinBorders + atRisk * 0.5) / total) * 100
    );

    return {
      centralEntity,
      totalTopics: topics.length,
      withinBorders,
      atRisk,
      outsideBorders,
      topicResults,
      borderHealthScore,
    };
  }

  /**
   * Suggest bridge topics for entities near or outside the border.
   * Bridge topics create semantic paths from the central entity to peripheral topics.
   */
  static suggestBridgeTopics(
    centralEntity: string,
    peripheralTopic: string,
    existingTopics: string[]
  ): string[] {
    // Generate candidate bridge topics by combining aspects of CE and peripheral topic
    const ceWords = centralEntity.toLowerCase().split(/\s+/);
    const ptWords = peripheralTopic.toLowerCase().split(/\s+/);

    const bridges: string[] = [];

    // Pattern: "[CE word] [PT word]" combinations
    for (const ceWord of ceWords) {
      for (const ptWord of ptWords) {
        if (ceWord !== ptWord && ceWord.length > 2 && ptWord.length > 2) {
          const candidate = `${ceWord} ${ptWord}`;
          if (!existingTopics.some(t => t.toLowerCase() === candidate)) {
            bridges.push(candidate);
          }
        }
      }
    }

    // Pattern: "how [CE] relates to [PT]"
    bridges.push(`how ${centralEntity} relates to ${peripheralTopic}`);

    // Pattern: "[CE] and [PT]"
    bridges.push(`${centralEntity} and ${peripheralTopic}`);

    // Pattern: "[PT] for [CE]"
    bridges.push(`${peripheralTopic} for ${centralEntity}`);

    return bridges.slice(0, 5); // Return top 5 suggestions
  }
}
