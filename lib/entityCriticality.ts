/**
 * Entity Criticality Score Calculator
 *
 * Calculates which entities need verification based on their importance
 * in the semantic SEO framework. Entities with higher criticality scores
 * are more important for the content's semantic structure and should be
 * prioritized for verification.
 */

import { AttributeCategory } from '../types';

/**
 * Input data for calculating entity criticality
 */
export interface EntityCriticalityInput {
  /**
   * The name of the entity.
   * @constraint Should not be empty
   */
  entityName: string;
  /** Whether this is the central entity (main topic) */
  isCentralEntity: boolean;
  /** The attribute category classification */
  attributeCategory: AttributeCategory | 'COMMON';
  /** Whether the entity appears in core sections */
  isCoreSectionEntity: boolean;
  /**
   * Number of topics this entity appears in.
   * @constraint Should be >= 1 (values < 1 are treated as 1)
   */
  topicCount: number;
  /**
   * Betweenness centrality score from knowledge graph.
   * @constraint Must be in range 0-1 (values outside range are clamped)
   */
  betweennessCentrality: number;
}

/**
 * Breakdown of how the criticality score was calculated
 */
export interface CriticalityBreakdown {
  /** Base weight from attribute category */
  baseWeight: number;
  /** Bonus for appearing in core sections */
  coreSectionBonus: number;
  /** Bonus for co-occurring across multiple topics */
  coOccurrenceBonus: number;
  /** Bonus for being a bridge entity in the knowledge graph */
  bridgeBonus: number;
}

/**
 * Result of criticality calculation for an entity
 */
export interface EntityCriticalityResult {
  /** The name of the entity */
  entityName: string;
  /** Overall criticality score (0-1) */
  score: number;
  /** Whether this entity requires verification */
  isCritical: boolean;
  /** Breakdown of score components */
  breakdown: CriticalityBreakdown;
}

/**
 * Threshold above which an entity is considered critical
 * and requires verification
 */
export const CRITICALITY_THRESHOLD = 0.7;

/**
 * Base weights for each attribute category
 * Higher weights indicate more unique/important attributes
 */
const ATTRIBUTE_CATEGORY_WEIGHTS: Record<AttributeCategory | 'COMMON', number> = {
  // Legacy categories - map to reasonable weights
  CORE_DEFINITION: 0.9,
  SEARCH_DEMAND: 0.8,
  COMPETITIVE_EXPANSION: 0.6,
  COMPOSITE: 0.6,
  UNCLASSIFIED: 0.4,
  // Primary categories used in semantic SEO
  UNIQUE: 0.9,
  ROOT: 0.8,
  RARE: 0.6,
  COMMON: 0.4,
};

/**
 * Core section bonus value
 */
const CORE_SECTION_BONUS = 0.2;

/**
 * Co-occurrence bonus per additional topic
 */
const CO_OCCURRENCE_BONUS_PER_TOPIC = 0.1;

/**
 * Maximum co-occurrence bonus
 */
const MAX_CO_OCCURRENCE_BONUS = 0.3;

/**
 * Bridge bonus multiplier for betweenness centrality
 */
const BRIDGE_BONUS_MULTIPLIER = 0.3;

/**
 * Round a number to 2 decimal places
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate the criticality score for a single entity
 *
 * The score is calculated based on:
 * - Base weight from attribute category (UNIQUE=0.9, ROOT=0.8, RARE=0.6, COMMON=0.4)
 * - Core section bonus (+0.2 if entity appears in core sections)
 * - Co-occurrence bonus (+0.1 per topic beyond the first, max 0.3)
 * - Bridge bonus (betweennessCentrality * 0.3)
 *
 * The total score is capped at 1.0 and rounded to 2 decimal places.
 * Central entities always return a score of 1.0.
 *
 * @param input - Entity data for calculation
 * @returns Criticality result with score and breakdown
 */
export function calculateCriticalityScore(
  input: EntityCriticalityInput
): EntityCriticalityResult {
  const { entityName, isCentralEntity, attributeCategory, isCoreSectionEntity, topicCount, betweennessCentrality } = input;

  // Central entity always has maximum criticality
  if (isCentralEntity) {
    return {
      entityName,
      score: 1.0,
      isCritical: true,
      breakdown: {
        baseWeight: 1.0,
        coreSectionBonus: 0,
        coOccurrenceBonus: 0,
        bridgeBonus: 0,
      },
    };
  }

  // Input validation: clamp betweennessCentrality to 0-1 range
  const clampedBetweennessCentrality = Math.max(0, Math.min(1, betweennessCentrality));

  // Input validation: treat negative topicCount as 0 (will result in 0 additional topics)
  const validatedTopicCount = Math.max(0, topicCount);

  // Calculate base weight from attribute category
  const baseWeight = ATTRIBUTE_CATEGORY_WEIGHTS[attributeCategory] ?? 0.4;

  // Core section bonus
  const coreSectionBonus = isCoreSectionEntity ? CORE_SECTION_BONUS : 0;

  // Co-occurrence bonus: +0.1 per topic beyond the first, max 0.3
  const additionalTopics = Math.max(0, validatedTopicCount - 1);
  const rawCoOccurrenceBonus = additionalTopics * CO_OCCURRENCE_BONUS_PER_TOPIC;
  const coOccurrenceBonus = Math.min(rawCoOccurrenceBonus, MAX_CO_OCCURRENCE_BONUS);

  // Bridge bonus: betweenness centrality * 0.3
  const bridgeBonus = clampedBetweennessCentrality * BRIDGE_BONUS_MULTIPLIER;

  // Calculate total score (capped at 1.0)
  const rawScore = baseWeight + coreSectionBonus + coOccurrenceBonus + bridgeBonus;
  const score = roundToTwoDecimals(Math.min(rawScore, 1.0));

  // Determine if entity is critical
  const isCritical = score >= CRITICALITY_THRESHOLD;

  return {
    entityName,
    score,
    isCritical,
    breakdown: {
      baseWeight,
      coreSectionBonus,
      coOccurrenceBonus,
      bridgeBonus,
    },
  };
}

/**
 * Calculate criticality scores for multiple entities
 *
 * @param inputs - Array of entity data
 * @returns Array of criticality results
 */
export function batchCalculateCriticality(
  inputs: EntityCriticalityInput[]
): EntityCriticalityResult[] {
  return inputs.map(calculateCriticalityScore);
}

/**
 * Filter to only entities that are critical (score >= threshold)
 *
 * @param results - Array of criticality results
 * @returns Filtered array of critical entities only
 */
export function filterCriticalEntities(
  results: EntityCriticalityResult[]
): EntityCriticalityResult[] {
  return results.filter((result) => result.isCritical);
}

/**
 * Sort entities by criticality score in descending order
 *
 * Does not mutate the original array.
 *
 * @param results - Array of criticality results
 * @returns New array sorted by score descending
 */
export function sortByCriticality(
  results: EntityCriticalityResult[]
): EntityCriticalityResult[] {
  return [...results].sort((a, b) => b.score - a.score);
}
