/**
 * useFrameExpansionRecommendation Hook
 *
 * Auto-detects when Frame Semantics expansion should be recommended
 * based on topic characteristics like low search volume, abstract concepts,
 * or process-oriented content.
 */

import { useMemo } from 'react';
import { EnrichedTopic } from '../types';
import { isFrameExpansionCandidate } from '../services/ai/frameExpansion';

export interface FrameExpansionRecommendation {
  shouldRecommend: boolean;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  alternativeMode?: 'ATTRIBUTE' | 'ENTITY' | 'CONTEXT';
}

/**
 * Keywords that indicate process/action-oriented topics
 */
const PROCESS_INDICATORS = [
  'how to', 'guide', 'tutorial', 'process', 'steps', 'workflow',
  'method', 'approach', 'technique', 'strategy', 'framework',
  'implement', 'build', 'create', 'develop', 'establish',
  'manage', 'optimize', 'improve', 'transform', 'migrate'
];

/**
 * Keywords that indicate abstract concepts
 */
const ABSTRACT_INDICATORS = [
  'concept', 'theory', 'principle', 'philosophy', 'methodology',
  'approach', 'mindset', 'culture', 'strategy', 'vision',
  'leadership', 'innovation', 'transformation', 'agile', 'lean'
];

/**
 * Keywords that indicate concrete/product topics (better for ATTRIBUTE/ENTITY)
 */
const CONCRETE_INDICATORS = [
  'software', 'tool', 'platform', 'product', 'service', 'app',
  'device', 'system', 'solution', 'package', 'suite', 'kit',
  'price', 'cost', 'review', 'comparison', 'vs', 'versus', 'alternative'
];

/**
 * Keywords that indicate local/niche topics where competitor data is sparse
 * (Based on Koray's recommendation for Local SEO with weak competitors)
 */
const LOCAL_NICHE_INDICATORS = [
  'local', 'near me', 'in [city]', 'nearby', 'regional',
  'specialized', 'niche', 'boutique', 'artisan', 'custom', 'bespoke',
  'small business', 'family-owned', 'independent', 'handcrafted',
  'personalized', 'tailored', 'exclusive', 'premium local'
];

/**
 * Analyze topic title for indicators
 */
function analyzeTitle(title: string): {
  processScore: number;
  abstractScore: number;
  concreteScore: number;
  localNicheScore: number;
} {
  const lowerTitle = title.toLowerCase();

  let processScore = 0;
  let abstractScore = 0;
  let concreteScore = 0;
  let localNicheScore = 0;

  PROCESS_INDICATORS.forEach(indicator => {
    if (lowerTitle.includes(indicator)) processScore++;
  });

  ABSTRACT_INDICATORS.forEach(indicator => {
    if (lowerTitle.includes(indicator)) abstractScore++;
  });

  CONCRETE_INDICATORS.forEach(indicator => {
    if (lowerTitle.includes(indicator)) concreteScore++;
  });

  LOCAL_NICHE_INDICATORS.forEach(indicator => {
    if (lowerTitle.includes(indicator)) localNicheScore++;
  });

  return { processScore, abstractScore, concreteScore, localNicheScore };
}

/**
 * Check if topic has sparse expansion results
 */
function hasSparsePreviousExpansion(topic: EnrichedTopic, allTopics: EnrichedTopic[]): boolean {
  // Find child topics of this topic
  const childTopics = allTopics.filter(t => t.parent_topic_id === topic.id);

  // If topic has been expanded but yielded few results
  if (childTopics.length > 0 && childTopics.length < 3) {
    return true;
  }

  return false;
}

/**
 * Calculate frame expansion recommendation for a topic
 */
export function calculateFrameRecommendation(
  topic: EnrichedTopic,
  allTopics: EnrichedTopic[]
): FrameExpansionRecommendation {
  const reasons: string[] = [];
  let score = 0;

  // 1. Check using service function
  if (isFrameExpansionCandidate(topic)) {
    reasons.push('Topic characteristics suggest scene-based analysis');
    score += 30;
  }

  // 2. Analyze title indicators
  const { processScore, abstractScore, concreteScore, localNicheScore } = analyzeTitle(topic.title);

  if (processScore >= 2) {
    reasons.push('Process/workflow-oriented topic');
    score += 25;
  } else if (processScore === 1) {
    score += 10;
  }

  if (abstractScore >= 2) {
    reasons.push('Abstract concept requiring scene decomposition');
    score += 25;
  } else if (abstractScore === 1) {
    score += 10;
  }

  // Local/niche topics benefit from Frame semantics when competitor data is sparse
  // (Per Koray's advice for Local SEO with weak competitors)
  if (localNicheScore >= 2) {
    reasons.push('Local/niche topic where competitor search data is sparse');
    score += 30;
  } else if (localNicheScore === 1) {
    reasons.push('Local market with potentially limited query data');
    score += 15;
  }

  // Concrete topics are better suited for ATTRIBUTE/ENTITY
  if (concreteScore >= 2) {
    score -= 30;
  } else if (concreteScore === 1) {
    score -= 15;
  }

  // 3. Check description for clues
  const description = topic.description?.toLowerCase() || '';

  if (description.includes('how') || description.includes('process') || description.includes('steps')) {
    reasons.push('Description indicates procedural content');
    score += 15;
  }

  if (description.includes('understand') || description.includes('learn') || description.includes('explore')) {
    reasons.push('Educational/exploratory topic');
    score += 10;
  }

  // 4. Check for sparse previous expansions
  if (hasSparsePreviousExpansion(topic, allTopics)) {
    reasons.push('Previous expansion yielded sparse results');
    score += 20;
  }

  // 5. Check metadata hints
  const metadata = topic.metadata || {};

  if (metadata.query_type === 'informational' || metadata.query_type === 'educational') {
    reasons.push('Informational query type');
    score += 10;
  }

  if (metadata.estimated_search_volume && metadata.estimated_search_volume < 100) {
    reasons.push('Low search volume topic');
    score += 20;
  }

  // 6. Core topics without children benefit from Frame expansion
  if (topic.type === 'core') {
    const childCount = allTopics.filter(t => t.parent_topic_id === topic.id).length;
    if (childCount === 0) {
      reasons.push('Core topic not yet expanded');
      score += 5;
    }
  }

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (score >= 60) {
    confidence = 'high';
  } else if (score >= 35) {
    confidence = 'medium';
  }

  // Determine alternative mode if Frame is not recommended
  let alternativeMode: 'ATTRIBUTE' | 'ENTITY' | 'CONTEXT' | undefined;
  if (score < 35) {
    if (concreteScore >= 2) {
      alternativeMode = 'ENTITY';
    } else if (processScore >= 1) {
      alternativeMode = 'CONTEXT';
    } else {
      alternativeMode = 'ATTRIBUTE';
    }
  }

  return {
    shouldRecommend: score >= 35,
    confidence,
    reasons: reasons.slice(0, 3), // Top 3 reasons
    alternativeMode
  };
}

/**
 * Hook to get Frame expansion recommendation for a topic
 *
 * Frame Semantics is particularly useful when:
 * - Traditional keyword data is sparse (low search volume)
 * - Competitors are weak (Local SEO scenarios)
 * - Topic is process/action-oriented
 * - Topic represents an abstract concept
 *
 * @param topic - The topic to analyze
 * @param allTopics - All topics in the map (for context)
 * @param options - Configuration options
 * @returns Recommendation with confidence and reasons
 */
export const useFrameExpansionRecommendation = (
  topic: EnrichedTopic | null,
  allTopics: EnrichedTopic[],
  options?: { restrictToCoreTopics?: boolean }
): FrameExpansionRecommendation | null => {
  const restrictToCoreTopics = options?.restrictToCoreTopics ?? false;

  return useMemo(() => {
    if (!topic) {
      return null;
    }

    // By default, analyze all topics. If restrictToCoreTopics is true, only analyze core topics.
    if (restrictToCoreTopics && topic.type !== 'core') {
      return null;
    }

    return calculateFrameRecommendation(topic, allTopics);
  }, [topic, allTopics, restrictToCoreTopics]);
};

/**
 * Hook to get recommendations for multiple topics
 * Useful for batch analysis or dashboard views
 */
export const useFrameExpansionRecommendations = (
  topics: EnrichedTopic[]
): Map<string, FrameExpansionRecommendation> => {
  return useMemo(() => {
    const recommendations = new Map<string, FrameExpansionRecommendation>();

    const coreTopics = topics.filter(t => t.type === 'core');

    coreTopics.forEach(topic => {
      const recommendation = calculateFrameRecommendation(topic, topics);
      if (recommendation.shouldRecommend) {
        recommendations.set(topic.id, recommendation);
      }
    });

    return recommendations;
  }, [topics]);
};

/**
 * Get a human-readable summary of the recommendation
 */
export function getRecommendationSummary(rec: FrameExpansionRecommendation): string {
  if (!rec.shouldRecommend) {
    return rec.alternativeMode
      ? `Try ${rec.alternativeMode} expansion instead`
      : 'Standard expansion modes recommended';
  }

  const confidenceText = rec.confidence === 'high'
    ? 'strongly recommended'
    : rec.confidence === 'medium'
      ? 'recommended'
      : 'may be helpful';

  return `Frame expansion ${confidenceText}: ${rec.reasons[0]}`;
}

export default useFrameExpansionRecommendation;
