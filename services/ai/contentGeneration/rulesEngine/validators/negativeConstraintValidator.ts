// services/ai/contentGeneration/rulesEngine/validators/negativeConstraintValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { getLanguageName } from '../../../../../utils/languageUtils';
import { splitSentences } from '../../../../../utils/sentenceTokenizer';

/**
 * NegativeConstraintValidator - Validates presence of "what X is NOT" statements.
 *
 * Framework rule: Definitions should include negative constraints to help
 * search engines understand entity boundaries. When defining an entity,
 * stating what it is NOT helps disambiguate from related concepts.
 *
 * Example:
 *   "A topical map is a strategic content plan." (positive definition)
 *   "A topical map is not a keyword list or a sitemap." (negative constraint)
 *
 * This validator only fires for sections that contain definitions (FS format code
 * or first section of article).
 */

interface NegativeConstraintPatterns {
  /** Patterns matching negative constraint statements */
  negativePatterns: RegExp[];
  /** Patterns matching definition statements (triggering constraint check) */
  definitionPatterns: RegExp[];
}

const MULTILINGUAL_NEGATIVE_PATTERNS: Record<string, NegativeConstraintPatterns> = {
  'English': {
    negativePatterns: [
      /\b(is not|are not|isn't|aren't|does not|doesn't|should not be confused with)\b/i,
      /\b(unlike|in contrast to|as opposed to|rather than|different from|distinct from)\b/i,
      /\b(not to be confused with|not the same as|should not be mistaken for)\b/i,
    ],
    definitionPatterns: [
      /\b(is|are|refers?\s+to|means?|denotes?)\s+(a|an|the)\b/i,
      /\b(is defined as|is known as|can be described as)\b/i,
    ],
  },

  'Dutch': {
    negativePatterns: [
      /\b(is niet|zijn niet|niet hetzelfde als|in tegenstelling tot|anders dan|verschilt van)\b/i,
      /\b(mag niet verward worden met|niet te verwarren met)\b/i,
    ],
    definitionPatterns: [
      /\b(is|zijn|verwijst naar|betekent)\s+(een|de|het)\b/i,
    ],
  },

  'German': {
    negativePatterns: [
      /\b(ist nicht|sind nicht|ist kein|sind keine|im Gegensatz zu|anders als|unterscheidet sich von)\b/i,
      /\b(sollte nicht verwechselt werden mit|nicht dasselbe wie|nicht zu verwechseln mit)\b/i,
    ],
    definitionPatterns: [
      /\b(ist|sind|bezieht sich auf|bedeutet)\s+(ein|eine|der|die|das)\b/i,
    ],
  },

  'French': {
    negativePatterns: [
      /\b(n'est pas|ne sont pas|contrairement à|à la différence de|différent de|distinct de)\b/i,
      /\b(ne doit pas être confondu avec|pas la même chose que)\b/i,
    ],
    definitionPatterns: [
      /\b(est|sont|se réfère à|signifie)\s+(un|une|le|la)\b/i,
    ],
  },

  'Spanish': {
    negativePatterns: [
      /\b(no es|no son|a diferencia de|en contraste con|diferente de|distinto de)\b/i,
      /\b(no debe confundirse con|no es lo mismo que)\b/i,
    ],
    definitionPatterns: [
      /\b(es|son|se refiere a|significa)\s+(un|una|el|la)\b/i,
    ],
  },
};

function getNegativePatterns(language?: string): NegativeConstraintPatterns {
  const langName = getLanguageName(language);
  return MULTILINGUAL_NEGATIVE_PATTERNS[langName] || MULTILINGUAL_NEGATIVE_PATTERNS['English'];
}

export class NegativeConstraintValidator {
  /**
   * Validate that definitions include negative constraints.
   * Only applies to sections with definitions (FS format or first section).
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const language = context.language;
    const { negativePatterns, definitionPatterns } = getNegativePatterns(language);

    // Only check for sections that likely contain definitions
    const isDefinitional = context.section.format_code === 'FS' ||
      context.section.format_code === 'DEFINITIVE' ||
      (context.allSections?.length > 0 && context.allSections[0] === context.section);

    if (!isDefinitional) return violations;

    const sentences = splitSentences(content);

    // Check if content has a definition
    const hasDefinition = sentences.some(s =>
      definitionPatterns.some(p => p.test(s))
    );

    if (!hasDefinition) return violations;

    // Check if content has negative constraints
    const hasNegativeConstraint = sentences.some(s =>
      negativePatterns.some(p => p.test(s))
    );

    if (!hasNegativeConstraint) {
      const centralEntity = context.businessInfo?.seedKeyword || 'the entity';
      violations.push({
        rule: 'NEGATIVE_CONSTRAINT',
        text: 'Definition without negative constraint',
        position: 0,
        suggestion: `Add a "what ${centralEntity} is NOT" statement to disambiguate from related concepts. Example: "${centralEntity} is not [related but different concept]."`,
        severity: 'info',
      });
    }

    return violations;
  }
}
