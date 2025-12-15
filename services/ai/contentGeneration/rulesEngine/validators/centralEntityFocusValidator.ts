// services/ai/contentGeneration/rulesEngine/validators/centralEntityFocusValidator.ts

import { ValidationViolation, SectionGenerationContext, SemanticTriple } from '../../../../../types';

/**
 * Result of Central Entity focus validation
 */
export interface CentralEntityFocusResult {
  score: number;  // 0-100 focus score
  entityMentions: number;
  totalSentences: number;
  sectionsWithEntity: number;
  totalSections: number;
  driftingSections: {
    heading: string;
    entityMentions: number;
    wordCount: number;
  }[];
  warnings: CentralEntityFocusWarning[];
}

export interface CentralEntityFocusWarning {
  sectionHeading: string;
  issue: 'no_entity' | 'low_mention' | 'topic_drift';
  suggestion: string;
  severity: 'info' | 'warning' | 'error';
}

export class CentralEntityFocusValidator {
  // Minimum section word count to require entity mention
  private static readonly MIN_SECTION_WORDS = 100;

  // Entity mention threshold per 100 words
  private static readonly MENTIONS_PER_100_WORDS = 0.5; // At least 1 mention per 200 words

  /**
   * Validate that content maintains focus on the Central Entity
   *
   * Research Requirement: Every sentence should relate back to the Central Entity.
   * "Non-facts" (sentences without EAV about central entity) should be flagged.
   *
   * Implementation: LENIENT validation at section level
   * - Warns if sections are substantial but don't mention central entity
   * - Calculates overall focus score
   */
  static validateSections(
    sections: { heading: string; content: string }[],
    centralEntity: string,
    eavs?: SemanticTriple[]
  ): CentralEntityFocusResult {
    if (!centralEntity || centralEntity.trim() === '') {
      return {
        score: 100, // Can't validate without entity
        entityMentions: 0,
        totalSentences: 0,
        sectionsWithEntity: 0,
        totalSections: 0,
        driftingSections: [],
        warnings: []
      };
    }

    const warnings: CentralEntityFocusWarning[] = [];
    const driftingSections: CentralEntityFocusResult['driftingSections'] = [];

    // Build entity terms to search for (entity + EAV subjects)
    const entityTerms = this.buildEntityTerms(centralEntity, eavs);

    let totalMentions = 0;
    let totalSentences = 0;
    let sectionsWithEntity = 0;

    sections.forEach(section => {
      const contentLower = section.content.toLowerCase();
      const wordCount = section.content.split(/\s+/).filter(w => w.length > 0).length;
      const sentences = this.splitSentences(section.content);
      totalSentences += sentences.length;

      // Count entity mentions in this section
      let sectionMentions = 0;
      entityTerms.forEach(term => {
        const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
        const matches = section.content.match(regex);
        if (matches) sectionMentions += matches.length;
      });

      totalMentions += sectionMentions;

      if (sectionMentions > 0) {
        sectionsWithEntity++;
      }

      // Check if section is drifting (substantial but low/no entity mentions)
      if (wordCount >= this.MIN_SECTION_WORDS) {
        const expectedMentions = Math.ceil(wordCount * this.MENTIONS_PER_100_WORDS / 100);

        if (sectionMentions === 0) {
          driftingSections.push({
            heading: section.heading,
            entityMentions: 0,
            wordCount
          });

          warnings.push({
            sectionHeading: section.heading,
            issue: 'no_entity',
            suggestion: `Section "${section.heading}" (${wordCount} words) doesn't mention the central entity "${centralEntity}". Consider relating content back to the main topic.`,
            severity: 'info'  // LENIENT: info level
          });
        } else if (sectionMentions < expectedMentions && sectionMentions < 2) {
          warnings.push({
            sectionHeading: section.heading,
            issue: 'low_mention',
            suggestion: `Section "${section.heading}" only mentions the central entity ${sectionMentions} time(s) in ${wordCount} words. Consider reinforcing focus.`,
            severity: 'info'  // LENIENT: info level
          });
        }
      }
    });

    // Calculate overall focus score
    const totalSections = sections.length;
    const score = totalSections > 0
      ? Math.round((sectionsWithEntity / totalSections) * 100)
      : 100;

    // Overall warning if focus is very low
    if (score < 40 && totalSections >= 3) {
      warnings.unshift({
        sectionHeading: '[Overall]',
        issue: 'topic_drift',
        suggestion: `Only ${score}% of sections mention the central entity "${centralEntity}". Content may be drifting off-topic.`,
        severity: 'warning'
      });
    }

    return {
      score,
      entityMentions: totalMentions,
      totalSentences,
      sectionsWithEntity,
      totalSections,
      driftingSections,
      warnings
    };
  }

  /**
   * Quick per-section validation for use during content generation
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    // Use seedKeyword from businessInfo as the central entity
    const centralEntity = context.businessInfo?.seedKeyword;

    if (!centralEntity || content.length < 200) return violations;

    const entityLower = centralEntity.toLowerCase();
    const contentLower = content.toLowerCase();
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

    // Check for entity presence
    const entityTerms = centralEntity.toLowerCase().split(/\s+/).filter(t => t.length > 3);
    const hasEntityMention = entityTerms.some(term =>
      contentLower.includes(term)
    );

    // LENIENT: Only flag substantial sections with no entity mention
    if (!hasEntityMention && wordCount >= this.MIN_SECTION_WORDS) {
      violations.push({
        rule: 'CENTRAL_ENTITY_FOCUS',
        text: content.substring(0, 100) + '...',
        position: 0,
        suggestion: `Section doesn't mention the central entity "${centralEntity}". Consider relating content back to the main topic.`,
        severity: 'warning',  // Warning, not error - lenient approach
      });
    }

    return violations;
  }

  /**
   * Build list of entity terms to search for
   */
  private static buildEntityTerms(centralEntity: string, eavs?: SemanticTriple[]): string[] {
    const terms = new Set<string>();

    // Add central entity and its components
    terms.add(centralEntity);
    centralEntity.split(/\s+/).forEach(word => {
      if (word.length >= 4) terms.add(word);
    });

    // Add EAV subject labels if available
    if (eavs && eavs.length > 0) {
      eavs.forEach(eav => {
        if (eav.subject?.label) {
          terms.add(eav.subject.label);
        }
      });
    }

    return Array.from(terms);
  }

  private static splitSentences(content: string): string[] {
    return content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
