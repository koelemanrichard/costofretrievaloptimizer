// services/ai/contentGeneration/rulesEngine/validators/eavDensity.ts

import { ValidationViolation, SemanticTriple, BriefSection } from '../../../../../types';

/**
 * Result of EAV density validation
 */
export interface EavDensityResult {
  score: number;  // 0-100 overall density score
  sectionResults: {
    sectionHeading: string;
    hasEavTerms: boolean;
    matchedTerms: string[];
    wordCount: number;
  }[];
  warnings: EavDensityWarning[];
  totalSections: number;
  sectionsWithEav: number;
}

export interface EavDensityWarning {
  sectionHeading: string;
  issue: 'sparse' | 'no_facts' | 'low_density';
  suggestion: string;
  severity: 'info' | 'warning' | 'error';
}

export class EAVDensityValidator {
  // Minimum word count for a sentence to require full EAV
  private static readonly MIN_WORDS_FOR_EAV = 4;

  // Minimum word count for a section to require EAV terms
  private static readonly MIN_SECTION_WORDS = 50;

  // Patterns indicating presence of Entity-Attribute-Value
  private static readonly EAV_PATTERNS = [
    // Entity + verb + value: "X is/are Y"
    /\b[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*\s+(?:is|are|was|were|has|have|had|requires?|needs?|provides?|offers?|contains?|includes?|weighs?|measures?|costs?|lasts?)\s+/i,
    // Entity + attribute + value: "The X of Y is Z"
    /\bThe\s+\w+\s+of\s+\w+\s+(?:is|are|measures?|equals?)/i,
    // Numeric values (strong EAV indicator)
    /\d+(?:\.\d+)?(?:\s*(?:percent|%|kg|lb|cm|mm|m|ft|hours?|minutes?|days?|weeks?|months?|years?))?/i,
  ];

  // Patterns indicating weak/empty sentences
  private static readonly WEAK_PATTERNS = [
    /^It\s+(?:is|was)\s+\w+\.$/i,
    /^Things?\s+(?:is|are|happen)/i,
    /^This\s+(?:is|was)\s+\w+\.$/i,
  ];

  /**
   * LENIENT section-level EAV density validation
   * Only warns if entire sections have no EAV terms - not sentence-level
   */
  static validateSections(
    sections: { heading: string; content: string }[],
    eavs: SemanticTriple[]
  ): EavDensityResult {
    // Extract all EAV terms (subjects and object values)
    const eavTerms = this.extractEavTerms(eavs);
    const warnings: EavDensityWarning[] = [];
    const sectionResults: EavDensityResult['sectionResults'] = [];

    let sectionsWithEav = 0;

    sections.forEach(section => {
      const contentLower = section.content.toLowerCase();
      const wordCount = section.content.split(/\s+/).filter(w => w.length > 0).length;

      // Find which EAV terms appear in this section
      const matchedTerms = eavTerms.filter(term =>
        contentLower.includes(term.toLowerCase())
      );

      const hasEavTerms = matchedTerms.length > 0;
      if (hasEavTerms) sectionsWithEav++;

      sectionResults.push({
        sectionHeading: section.heading,
        hasEavTerms,
        matchedTerms,
        wordCount
      });

      // LENIENT: Only warn if section is substantial but has NO EAV terms
      if (!hasEavTerms && wordCount >= this.MIN_SECTION_WORDS) {
        warnings.push({
          sectionHeading: section.heading,
          issue: 'no_facts',
          suggestion: `Section "${section.heading}" (${wordCount} words) contains no recognizable EAV terms. Consider adding specific facts about your entity.`,
          severity: 'info'  // Info level, not warning - lenient!
        });
      }
    });

    // Calculate overall score
    const totalSections = sections.length;
    const score = totalSections > 0
      ? Math.round((sectionsWithEav / totalSections) * 100)
      : 0;

    // Only add overall warning if score is very low (lenient threshold)
    if (score < 30 && totalSections >= 3) {
      warnings.unshift({
        sectionHeading: '[Overall]',
        issue: 'low_density',
        suggestion: `Only ${score}% of sections contain EAV terms. Consider enriching content with more facts about your entity.`,
        severity: 'warning'
      });
    }

    return {
      score,
      sectionResults,
      warnings,
      totalSections,
      sectionsWithEav
    };
  }

  /**
   * Extract searchable terms from EAV triples
   */
  private static extractEavTerms(eavs: SemanticTriple[]): string[] {
    const terms = new Set<string>();

    eavs.forEach(eav => {
      // Add subject label
      if (eav.subject?.label) {
        terms.add(eav.subject.label);
        // Also add individual words for multi-word labels
        eav.subject.label.split(/\s+/).forEach(word => {
          if (word.length >= 4) terms.add(word);
        });
      }

      // Add object value
      if (eav.object?.value) {
        const value = String(eav.object.value);
        terms.add(value);
        // Also add individual words for multi-word values
        value.split(/\s+/).forEach(word => {
          if (word.length >= 4) terms.add(word);
        });
      }

      // Add synonyms if available
      if (eav.lexical?.synonyms) {
        eav.lexical.synonyms.forEach(syn => terms.add(syn));
      }
    });

    return Array.from(terms);
  }

  /**
   * Original sentence-level validation (kept for backwards compatibility)
   * Use validateSections() for lenient section-level validation
   */
  static validate(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const sentences = this.splitSentences(content);

    sentences.forEach((sentence, index) => {
      const words = sentence.trim().split(/\s+/);

      // Skip very short sentences
      if (words.length < this.MIN_WORDS_FOR_EAV) return;

      // Check for weak patterns
      for (const pattern of this.WEAK_PATTERNS) {
        if (pattern.test(sentence)) {
          violations.push({
            rule: 'EAV_DENSITY',
            text: sentence,
            position: content.indexOf(sentence),
            suggestion: 'Sentence lacks Entity-Attribute-Value structure. Add specific entity, attribute, and measurable value.',
            severity: 'warning',
          });
          return;
        }
      }

      // Check if sentence has EAV structure
      const hasEAV = this.EAV_PATTERNS.some(pattern => pattern.test(sentence));

      if (!hasEAV && words.length >= 6) {
        violations.push({
          rule: 'EAV_DENSITY',
          text: sentence,
          position: content.indexOf(sentence),
          suggestion: 'Sentence may lack clear Entity-Attribute-Value. Ensure it contains: Entity (subject) + Attribute (verb/property) + Value (object/measurement).',
          severity: 'warning',
        });
      }
    });

    return violations;
  }

  /**
   * Calculate EAV density percentage based on EAV patterns
   */
  static calculateDensity(content: string): number {
    const sentences = this.splitSentences(content);
    if (sentences.length === 0) return 0;

    let eavCount = 0;
    sentences.forEach(sentence => {
      const hasEAV = this.EAV_PATTERNS.some(pattern => pattern.test(sentence));
      if (hasEAV) eavCount++;
    });

    return Math.round((eavCount / sentences.length) * 100);
  }

  /**
   * Calculate EAV density using actual EAV terms
   */
  static calculateTermDensity(content: string, eavs: SemanticTriple[]): number {
    const eavTerms = this.extractEavTerms(eavs);
    if (eavTerms.length === 0) return 0;

    const contentLower = content.toLowerCase();
    let foundCount = 0;

    eavTerms.forEach(term => {
      if (contentLower.includes(term.toLowerCase())) foundCount++;
    });

    return Math.round((foundCount / eavTerms.length) * 100);
  }

  private static splitSentences(content: string): string[] {
    return content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
}
