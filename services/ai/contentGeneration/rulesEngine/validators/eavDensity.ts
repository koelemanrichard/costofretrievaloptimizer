// services/ai/contentGeneration/rulesEngine/validators/eavDensity.ts

import { ValidationViolation, SemanticTriple, SectionGenerationContext } from '../../../../../types';
import { getLanguageName } from '../../../../../utils/languageUtils';

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

/**
 * Multilingual EAV verb patterns
 * Format: Entity + verb + value patterns per language
 */
interface LanguageEavPatterns {
  verbs: string[];
  attributeOf: RegExp;  // "The X of Y is Z" pattern
  weakPatterns: RegExp[];
}

const MULTILINGUAL_EAV_PATTERNS: Record<string, LanguageEavPatterns> = {
  'English': {
    verbs: [
      'is', 'are', 'was', 'were', 'has', 'have', 'had',
      'requires', 'needs', 'provides', 'offers', 'contains',
      'includes', 'weighs', 'measures', 'costs', 'lasts',
      'equals', 'represents', 'consists', 'means', 'defines',
    ],
    attributeOf: /\bThe\s+\w+\s+of\s+\w+\s+(?:is|are|measures?|equals?)/i,
    weakPatterns: [
      /^It\s+(?:is|was)\s+\w+\.$/i,
      /^Things?\s+(?:is|are|happen)/i,
      /^This\s+(?:is|was)\s+\w+\.$/i,
    ],
  },

  'Dutch': {
    verbs: [
      'is', 'zijn', 'was', 'waren', 'heeft', 'hebben', 'had',
      'vereist', 'nodig heeft', 'biedt', 'bieden', 'bevat',
      'omvat', 'weegt', 'meet', 'kost', 'duurt',
      'komt overeen met', 'vertegenwoordigt', 'bestaat uit', 'betekent', 'definieert',
    ],
    attributeOf: /\bDe\s+\w+\s+van\s+\w+\s+(?:is|zijn|meet|komt overeen)/i,
    weakPatterns: [
      /^Het\s+(?:is|was)\s+\w+\.$/i,
      /^Dingen?\s+(?:is|zijn|gebeuren)/i,
      /^Dit\s+(?:is|was)\s+\w+\.$/i,
    ],
  },

  'German': {
    verbs: [
      'ist', 'sind', 'war', 'waren', 'hat', 'haben', 'hatte',
      'erfordert', 'braucht', 'bietet', 'enthält',
      'umfasst', 'wiegt', 'misst', 'kostet', 'dauert',
      'entspricht', 'repräsentiert', 'besteht aus', 'bedeutet', 'definiert',
    ],
    attributeOf: /\bDie\s+\w+\s+von\s+\w+\s+(?:ist|sind|misst|entspricht)/i,
    weakPatterns: [
      /^Es\s+(?:ist|war)\s+\w+\.$/i,
      /^Dinge?\s+(?:ist|sind|passieren)/i,
      /^Dies\s+(?:ist|war)\s+\w+\.$/i,
    ],
  },

  'French': {
    verbs: [
      'est', 'sont', 'était', 'étaient', 'a', 'ont', 'avait',
      'nécessite', 'besoin de', 'fournit', 'offre', 'contient',
      'comprend', 'pèse', 'mesure', 'coûte', 'dure',
      'équivaut à', 'représente', 'consiste en', 'signifie', 'définit',
    ],
    attributeOf: /\bLa?\s+\w+\s+de\s+\w+\s+(?:est|sont|mesure|équivaut)/i,
    weakPatterns: [
      /^Il\s+(?:est|était)\s+\w+\.$/i,
      /^Les?\s+choses?\s+(?:est|sont|arrivent)/i,
      /^Ceci\s+(?:est|était)\s+\w+\.$/i,
    ],
  },

  'Spanish': {
    verbs: [
      'es', 'son', 'era', 'eran', 'tiene', 'tienen', 'tenía',
      'requiere', 'necesita', 'proporciona', 'ofrece', 'contiene',
      'incluye', 'pesa', 'mide', 'cuesta', 'dura',
      'equivale a', 'representa', 'consiste en', 'significa', 'define',
    ],
    attributeOf: /\bEl\s+\w+\s+de\s+\w+\s+(?:es|son|mide|equivale)/i,
    weakPatterns: [
      /^Eso?\s+(?:es|era)\s+\w+\.$/i,
      /^Las?\s+cosas?\s+(?:es|son|pasan)/i,
      /^Esto\s+(?:es|era)\s+\w+\.$/i,
    ],
  },
};

/**
 * Get EAV patterns for a specific language
 */
function getEavPatterns(language?: string): LanguageEavPatterns {
  const langName = getLanguageName(language);
  return MULTILINGUAL_EAV_PATTERNS[langName] || MULTILINGUAL_EAV_PATTERNS['English'];
}

/**
 * Build dynamic EAV regex patterns from verb list
 */
function buildEavRegexPatterns(verbs: string[]): RegExp[] {
  const verbPattern = verbs.join('|');
  return [
    // Entity + verb + value: "X is/are Y"
    new RegExp(`\\b[A-Z][a-z]+(?:\\s+[A-Z]?[a-z]+)*\\s+(?:${verbPattern})\\s+`, 'i'),
    // Numeric values (universal - strong EAV indicator)
    /\d+(?:\.\d+)?(?:\s*(?:percent|%|kg|lb|cm|mm|m|ft|hours?|minutes?|days?|weeks?|months?|years?|uur|minuten?|dagen?|weken?|maanden?|jaren?|Stunden?|Minuten?|Tagen?|Wochen?|Monaten?|Jahren?|heures?|minutes?|jours?|semaines?|mois|années?|horas?|minutos?|días?|semanas?|meses|años?))?/i,
  ];
}

export class EAVDensityValidator {
  // Minimum word count for a sentence to require full EAV
  private static readonly MIN_WORDS_FOR_EAV = 4;

  // Minimum word count for a section to require EAV terms
  private static readonly MIN_SECTION_WORDS = 50;

  /**
   * LENIENT section-level EAV density validation
   * Only warns if entire sections have no EAV terms - not sentence-level
   */
  static validateSections(
    sections: { heading: string; content: string }[] | undefined | null,
    eavs: SemanticTriple[] | undefined | null,
    language?: string
  ): EavDensityResult {
    // Guard against undefined/null sections
    if (!sections || !Array.isArray(sections)) {
      return {
        score: 100, // No sections = nothing to validate
        sectionResults: [],
        warnings: [],
        totalSections: 0,
        sectionsWithEav: 0
      };
    }

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

      // Tiered EAV density enforcement based on section length
      if (wordCount >= this.MIN_SECTION_WORDS) {
        if (!hasEavTerms) {
          // No EAV terms at all - warning for moderate sections, error for long sections
          warnings.push({
            sectionHeading: section.heading,
            issue: 'no_facts',
            suggestion: `Section "${section.heading}" (${wordCount} words) contains no recognizable EAV terms. Add specific facts about your entity.`,
            severity: wordCount >= 150 ? 'error' : 'warning'  // Block long sections without any EAV
          });
        } else if (matchedTerms.length < 2 && wordCount >= 100) {
          // Very low density - only 1 EAV term in substantial section
          warnings.push({
            sectionHeading: section.heading,
            issue: 'sparse',
            suggestion: `Section "${section.heading}" has only ${matchedTerms.length} EAV term(s) in ${wordCount} words. Add more specific facts.`,
            severity: 'warning'
          });
        }
      }
    });

    // Calculate overall score
    const totalSections = sections.length;
    const score = totalSections > 0
      ? Math.round((sectionsWithEav / totalSections) * 100)
      : 0;

    // Tiered overall density warnings/errors
    if (score < 20 && totalSections >= 3) {
      // CRITICAL: Extremely low density - content fails quality standards
      warnings.unshift({
        sectionHeading: '[Overall]',
        issue: 'low_density',
        suggestion: `Only ${score}% of sections contain EAV terms. Content lacks factual substance and will fail quality audit.`,
        severity: 'error'  // Block content with extremely low EAV density
      });
    } else if (score < 40 && totalSections >= 3) {
      // Warning: Low density but recoverable
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
  private static extractEavTerms(eavs: SemanticTriple[] | undefined | null): string[] {
    const terms = new Set<string>();

    // Guard against undefined/null eavs
    if (!eavs || !Array.isArray(eavs)) {
      return [];
    }

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
   * Sentence-level validation with multilingual support
   * @param content - The content to validate
   * @param context - Optional context containing language setting
   */
  static validate(content: string, context?: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const sentences = this.splitSentences(content);
    const language = context?.language;
    const patterns = getEavPatterns(language);
    const eavPatterns = buildEavRegexPatterns(patterns.verbs);

    // Add the attributeOf pattern
    eavPatterns.push(patterns.attributeOf);

    sentences.forEach((sentence) => {
      const words = sentence.trim().split(/\s+/);

      // Skip very short sentences
      if (words.length < this.MIN_WORDS_FOR_EAV) return;

      // Check for weak patterns (language-specific)
      for (const pattern of patterns.weakPatterns) {
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

      // Check if sentence has EAV structure (language-specific)
      const hasEAV = eavPatterns.some(pattern => pattern.test(sentence));

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
  static calculateDensity(content: string, language?: string): number {
    const sentences = this.splitSentences(content);
    if (sentences.length === 0) return 0;

    const patterns = getEavPatterns(language);
    const eavPatterns = buildEavRegexPatterns(patterns.verbs);
    eavPatterns.push(patterns.attributeOf);

    let eavCount = 0;
    sentences.forEach(sentence => {
      const hasEAV = eavPatterns.some(pattern => pattern.test(sentence));
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

// Export for testing and direct use
export { MULTILINGUAL_EAV_PATTERNS, getEavPatterns, buildEavRegexPatterns };
