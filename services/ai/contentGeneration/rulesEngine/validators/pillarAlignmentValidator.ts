// services/ai/contentGeneration/rulesEngine/validators/pillarAlignmentValidator.ts

import { ValidationViolation, SectionGenerationContext, SEOPillars } from '../../../../../types';

/**
 * Result of pillar alignment calculation
 */
export interface PillarAlignmentResult {
  centralEntityScore: number;      // 0-100
  sourceContextScore: number;      // 0-100
  searchIntentScore: number;       // 0-100
  overallScore: number;            // Weighted average
  passing: boolean;
}

const PASSING_THRESHOLD = 70;

/**
 * PillarAlignmentValidator (Rule S3)
 *
 * Ensures content aligns with the 3 SEO pillars:
 * - centralEntity: The main topic entity
 * - sourceContext: The business value proposition
 * - centralSearchIntent: The user's search intent
 *
 * Content must score >= 70% alignment with pillars.
 */
export class PillarAlignmentValidator {
  /**
   * Calculate term frequency in content
   * For multi-word terms, looks for exact phrase matches
   * For single words, counts word occurrences
   */
  private static calculateTermFrequency(content: string, term: string): number {
    if (!term || term.trim().length === 0) return 0;

    const lowerContent = content.toLowerCase();
    const lowerTerm = term.toLowerCase().trim();
    const termWords = lowerTerm.split(/\s+/);

    // For multi-word terms, look for exact phrase
    if (termWords.length > 1) {
      const regex = new RegExp(lowerTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = content.match(regex) || [];
      return matches.length;
    }

    // For single words, count word boundaries
    const words = lowerContent.split(/\s+/);
    return words.filter(w => w === lowerTerm || w.startsWith(lowerTerm) || w.endsWith(lowerTerm)).length;
  }

  /**
   * Calculate semantic overlap between content and a description
   * Returns percentage of description words found in content
   */
  private static calculateSemanticOverlap(content: string, description: string): number {
    if (!description || description.trim().length === 0) return 50; // Neutral score if no description

    // Extract meaningful words (> 3 chars) from content
    const contentWords = new Set(
      content.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3)
    );

    // Extract meaningful words from description
    const descriptionWords = description.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);

    if (descriptionWords.length === 0) return 50; // Neutral score if no meaningful words

    // Count how many description words appear in content
    const matchCount = descriptionWords.filter(w => contentWords.has(w)).length;
    return Math.min(100, (matchCount / descriptionWords.length) * 100);
  }

  /**
   * Calculate alignment scores for content against SEO pillars
   */
  static calculateAlignment(content: string, pillars: SEOPillars): PillarAlignmentResult {
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

    // Central Entity Score: Based on mention frequency
    // We want entity density to translate into a meaningful score
    const entityMentions = this.calculateTermFrequency(content, pillars.centralEntity);
    const entityDensity = wordCount > 0 ? (entityMentions / wordCount) * 100 : 0;
    // Scale: 1 mention per 20 words = 5% density = 100 score
    // This means 1 mention per ~33 words = ~3% density = ~60 score
    const centralEntityScore = Math.min(100, entityDensity * 20);

    // Source Context Score: Based on semantic overlap with value proposition
    const sourceContextScore = this.calculateSemanticOverlap(content, pillars.sourceContext);

    // Search Intent Score: Based on semantic overlap with search intent
    const searchIntentScore = this.calculateSemanticOverlap(content, pillars.centralSearchIntent);

    // Weighted overall: Entity most important (50%), intent (30%), context (20%)
    const overallScore = Math.round(
      centralEntityScore * 0.5 +
      searchIntentScore * 0.3 +
      sourceContextScore * 0.2
    );

    return {
      centralEntityScore: Math.round(centralEntityScore),
      sourceContextScore: Math.round(sourceContextScore),
      searchIntentScore: Math.round(searchIntentScore),
      overallScore,
      passing: overallScore >= PASSING_THRESHOLD,
    };
  }

  /**
   * Validate content against SEO pillars
   * Returns violations if alignment is below threshold
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    const pillars = context.pillars;
    if (!pillars || !pillars.centralEntity) {
      return violations; // No pillars to validate against
    }

    const result = this.calculateAlignment(content, pillars);

    if (!result.passing) {
      const issues: string[] = [];

      if (result.centralEntityScore < 50) {
        issues.push(`central entity "${pillars.centralEntity}" underrepresented (${result.centralEntityScore}%)`);
      }
      if (result.searchIntentScore < 50) {
        issues.push(`search intent alignment weak (${result.searchIntentScore}%)`);
      }
      if (result.sourceContextScore < 50) {
        issues.push(`value proposition alignment weak (${result.sourceContextScore}%)`);
      }

      violations.push({
        rule: 'S3_PILLAR_ALIGNMENT',
        text: `Content alignment with SEO pillars is ${result.overallScore}% (threshold: ${PASSING_THRESHOLD}%)`,
        position: 0,
        suggestion: `Improve pillar alignment: ${issues.length > 0 ? issues.join('; ') + '. ' : ''}Mention "${pillars.centralEntity}" more frequently and ensure content addresses the search intent.`,
        severity: 'warning',
      });
    }

    return violations;
  }
}
