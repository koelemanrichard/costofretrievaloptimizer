/**
 * Brief Quality Score Calculator
 *
 * Calculates completeness score for content briefs to help users
 * identify empty, partial, or complete briefs at a glance.
 */

import { ContentBrief } from '../types';

export type BriefHealthLevel = 'complete' | 'partial' | 'empty';

export interface BriefQualityResult {
  score: number;
  level: BriefHealthLevel;
  missingFields: string[];
  sectionCount: number;
  targetWordCount: number | null;
  summary: string;
}

export interface BriefHealthStats {
  total: number;
  complete: number;
  partial: number;
  empty: number;
  withBriefs: number;
  withoutBriefs: number;
}

/**
 * Field weights for brief quality calculation
 * Note: Only includes fields that can be persisted to the database.
 * targetKeyword and searchIntent exist in TypeScript interface but NOT in DB schema.
 */
const FIELD_WEIGHTS = {
  metaDescription: 15,
  structuredOutline: 30,  // Increased from 25 to compensate for removed fields
  serpAvgWordCount: 15,   // Increased from 10
  serpPeopleAlsoAsk: 10,
  contextualBridge: 15,   // Increased from 10
  visualsFeaturedImage: 15, // Increased from 10
} as const;

/**
 * Score thresholds for health levels
 */
const THRESHOLDS = {
  complete: 80,
  partial: 40,
} as const;

/**
 * Calculate brief quality score
 */
export function calculateBriefQualityScore(brief: ContentBrief | null | undefined): BriefQualityResult {
  if (!brief) {
    return {
      score: 0,
      level: 'empty',
      missingFields: ['No brief generated'],
      sectionCount: 0,
      targetWordCount: null,
      summary: 'No brief available',
    };
  }

  let score = 0;
  const missingFields: string[] = [];

  // Meta Description (15%)
  if (brief.metaDescription && brief.metaDescription.length > 50) {
    score += FIELD_WEIGHTS.metaDescription;
  } else {
    missingFields.push('Meta description');
  }

  // Structured Outline (25%)
  const sectionCount = brief.structured_outline?.length || 0;
  if (sectionCount > 0) {
    score += FIELD_WEIGHTS.structuredOutline;
  } else {
    missingFields.push('Content outline');
  }

  // SERP Average Word Count (10%)
  if (brief.serpAnalysis?.avgWordCount && brief.serpAnalysis.avgWordCount > 0) {
    score += FIELD_WEIGHTS.serpAvgWordCount;
  } else {
    missingFields.push('Competitor word count data');
  }

  // SERP People Also Ask (10%)
  if (brief.serpAnalysis?.peopleAlsoAsk && brief.serpAnalysis.peopleAlsoAsk.length > 0) {
    score += FIELD_WEIGHTS.serpPeopleAlsoAsk;
  } else {
    missingFields.push('People Also Ask questions');
  }

  // Contextual Bridge / Internal Links (10%)
  const hasContextualBridge = brief.contextualBridge && (
    Array.isArray(brief.contextualBridge)
      ? brief.contextualBridge.length > 0
      : (brief.contextualBridge as any)?.suggested_internal_links?.length > 0 ||
        (brief.contextualBridge as any)?.semantic_bridges?.length > 0
  );
  if (hasContextualBridge) {
    score += FIELD_WEIGHTS.contextualBridge;
  } else {
    missingFields.push('Internal linking strategy');
  }

  // Featured Image Prompt (15%)
  if (brief.visuals?.featuredImagePrompt && brief.visuals.featuredImagePrompt.length > 10) {
    score += FIELD_WEIGHTS.visualsFeaturedImage;
  } else {
    missingFields.push('Featured image guidance');
  }

  // Note: targetKeyword and searchIntent are not checked because they can't be persisted to DB

  // Determine health level
  const level = getBriefHealthLevel(score);

  // Calculate target word count
  const targetWordCount = brief.serpAnalysis?.avgWordCount || null;

  // Generate summary
  const summary = generateBriefSummary(score, level, sectionCount, missingFields);

  return {
    score,
    level,
    missingFields,
    sectionCount,
    targetWordCount,
    summary,
  };
}

/**
 * Get health level from score
 */
export function getBriefHealthLevel(score: number): BriefHealthLevel {
  if (score >= THRESHOLDS.complete) return 'complete';
  if (score >= THRESHOLDS.partial) return 'partial';
  return 'empty';
}

/**
 * Generate human-readable summary
 */
function generateBriefSummary(
  score: number,
  level: BriefHealthLevel,
  sectionCount: number,
  missingFields: string[]
): string {
  if (level === 'complete') {
    return `Brief ready${sectionCount > 0 ? ` • ${sectionCount} sections` : ''}`;
  }

  if (level === 'partial') {
    const topMissing = missingFields.slice(0, 2).join(', ');
    return `Partial • Missing ${topMissing}`;
  }

  if (missingFields.length === 1 && missingFields[0] === 'No brief generated') {
    return 'No brief generated';
  }

  return `Incomplete • ${missingFields.length} items missing`;
}

/**
 * Calculate aggregate stats for a collection of briefs
 */
export function calculateBriefHealthStats(
  briefs: Record<string, ContentBrief>,
  topicIds: string[]
): BriefHealthStats {
  const stats: BriefHealthStats = {
    total: topicIds.length,
    complete: 0,
    partial: 0,
    empty: 0,
    withBriefs: 0,
    withoutBriefs: 0,
  };

  for (const topicId of topicIds) {
    const brief = briefs[topicId];

    if (!brief) {
      stats.withoutBriefs++;
      continue;
    }

    stats.withBriefs++;
    const { level } = calculateBriefQualityScore(brief);

    switch (level) {
      case 'complete':
        stats.complete++;
        break;
      case 'partial':
        stats.partial++;
        break;
      case 'empty':
        stats.empty++;
        break;
    }
  }

  return stats;
}

/**
 * Get color class for health level
 */
export function getHealthLevelColor(level: BriefHealthLevel): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  switch (level) {
    case 'complete':
      return {
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        border: 'border-green-500/30',
        icon: 'text-green-500',
      };
    case 'partial':
      return {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        icon: 'text-yellow-500',
      };
    case 'empty':
      return {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-500/30',
        icon: 'text-red-500',
      };
  }
}

/**
 * Get emoji for health level
 */
export function getHealthLevelEmoji(level: BriefHealthLevel): string {
  switch (level) {
    case 'complete':
      return '✅';
    case 'partial':
      return '⚠️';
    case 'empty':
      return '❌';
  }
}

/**
 * Get missing fields for a brief
 * Convenience function that extracts just the missing fields array
 */
export function getMissingFields(brief: ContentBrief | null | undefined): string[] {
  return calculateBriefQualityScore(brief).missingFields;
}
