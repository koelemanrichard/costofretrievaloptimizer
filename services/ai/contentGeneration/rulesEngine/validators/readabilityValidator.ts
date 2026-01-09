// services/ai/contentGeneration/rulesEngine/validators/readabilityValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';

/**
 * Audience level categories for readability targeting
 */
export type AudienceLevel = 'general' | 'professional' | 'technical' | 'academic';

/**
 * Grade level range for each audience type
 */
interface GradeRange {
  min: number;
  max: number;
}

/**
 * Audience levels and their corresponding Flesch-Kincaid grade level targets:
 * - General public: Grade 6-8
 * - Professional: Grade 10-12
 * - Technical: Grade 12-14
 * - Academic: Grade 14+
 */
export const AUDIENCE_GRADE_RANGES: Record<AudienceLevel, GradeRange> = {
  general: { min: 6, max: 8 },
  professional: { min: 10, max: 12 },
  technical: { min: 12, max: 14 },
  academic: { min: 14, max: 20 }, // Cap at 20 for practical purposes
};

/**
 * Result of Flesch-Kincaid calculation
 */
export interface FleschKincaidResult {
  gradeLevel: number;
  wordCount: number;
  sentenceCount: number;
  syllableCount: number;
}

/**
 * ReadabilityValidator - Enforces S4 rule for audience-appropriate readability
 *
 * Uses Flesch-Kincaid Grade Level formula:
 * Grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
 */
export class ReadabilityValidator {
  /**
   * Count syllables in a word using heuristic approach
   * Based on vowel counting with adjustments for English patterns
   */
  static countSyllables(word: string): number {
    if (!word || word.length === 0) return 0;

    word = word.toLowerCase().trim();
    if (word.length === 0) return 0;

    // Special case for single letters
    if (word.length <= 2) return 1;

    // Remove non-alpha characters
    word = word.replace(/[^a-z]/g, '');
    if (word.length === 0) return 0;

    // Count vowel groups
    const vowels = 'aeiouy';
    let syllableCount = 0;
    let prevWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !prevWasVowel) {
        syllableCount++;
      }
      prevWasVowel = isVowel;
    }

    // Adjustments for English patterns

    // Silent 'e' at end - but NOT for common endings where 'e' is pronounced
    // Exceptions: -le, -ate, -ite, -ote, -ute (these have pronounced e or form syllables)
    const pronouncedEEndings = ['le', 'ate', 'ite', 'ote', 'ute', 'ese', 'ize', 'ise'];
    const hasPronouncedE = pronouncedEEndings.some(ending => word.endsWith(ending));

    if (word.endsWith('e') && !hasPronouncedE && syllableCount > 1) {
      syllableCount--;
    }

    // Handle -ed ending (usually silent unless preceded by t/d)
    if (word.endsWith('ed') && word.length > 2) {
      const beforeEd = word[word.length - 3];
      if (beforeEd !== 't' && beforeEd !== 'd') {
        // The 'e' in -ed is usually silent
        if (syllableCount > 1) {
          syllableCount--;
        }
      }
    }

    // Handle -es ending (usually silent unless preceded by certain letters)
    if (word.endsWith('es') && word.length > 2 && !word.endsWith('eses')) {
      const beforeEs = word[word.length - 3];
      if (!['s', 'x', 'z', 'h'].includes(beforeEs) && !vowels.includes(beforeEs)) {
        if (syllableCount > 1) {
          syllableCount--;
        }
      }
    }

    // Ensure at least 1 syllable per word
    return Math.max(1, syllableCount);
  }

  /**
   * Count sentences in content
   * Handles common abbreviations to avoid false positives
   */
  static countSentences(content: string): number {
    if (!content || content.trim().length === 0) return 0;

    // Replace common abbreviations to prevent false sentence breaks
    let processed = content
      .replace(/\bDr\./gi, 'Dr')
      .replace(/\bMr\./gi, 'Mr')
      .replace(/\bMrs\./gi, 'Mrs')
      .replace(/\bMs\./gi, 'Ms')
      .replace(/\bProf\./gi, 'Prof')
      .replace(/\bSt\./gi, 'St')
      .replace(/\bJr\./gi, 'Jr')
      .replace(/\bSr\./gi, 'Sr')
      .replace(/\be\.g\./gi, 'eg')
      .replace(/\bi\.e\./gi, 'ie')
      .replace(/\betc\./gi, 'etc')
      .replace(/\bvs\./gi, 'vs');

    // Count sentence-ending punctuation
    const sentenceEnders = processed.match(/[.!?]+/g);
    const count = sentenceEnders ? sentenceEnders.length : 0;

    // If no sentence enders found but there's content, count as 1 sentence
    return count === 0 ? 1 : count;
  }

  /**
   * Extract words from content, stripping HTML and markdown
   */
  private static extractWords(content: string): string[] {
    return content
      .replace(/<[^>]*>/g, ' ')           // Remove HTML tags
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Replace **bold** with content
      .replace(/\*([^*]+)\*/g, '$1')      // Replace *italic* with content
      .replace(/[#_`~\[\]()]/g, ' ')      // Remove other markdown syntax
      .replace(/\s+/g, ' ')               // Normalize whitespace
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0 && /[a-zA-Z]/.test(word));
  }

  /**
   * Calculate Flesch-Kincaid Grade Level
   * Formula: 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
   */
  static calculateFleschKincaidGrade(content: string): FleschKincaidResult {
    const words = this.extractWords(content);
    const wordCount = words.length;
    const sentenceCount = this.countSentences(content);
    const syllableCount = words.reduce((sum, word) => sum + this.countSyllables(word), 0);

    // Avoid division by zero
    if (wordCount === 0 || sentenceCount === 0) {
      return {
        gradeLevel: 0,
        wordCount: 0,
        sentenceCount: 0,
        syllableCount: 0,
      };
    }

    // Flesch-Kincaid Grade Level formula
    const gradeLevel =
      0.39 * (wordCount / sentenceCount) +
      11.8 * (syllableCount / wordCount) -
      15.59;

    return {
      gradeLevel: Math.round(gradeLevel * 10) / 10, // Round to 1 decimal
      wordCount,
      sentenceCount,
      syllableCount,
    };
  }

  /**
   * Validate content readability against target audience level
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Handle empty content
    if (!content || content.trim().length === 0) {
      return violations; // No violations for empty content (other validators handle this)
    }

    // Get audience level from context, default to general
    const audienceLevel: AudienceLevel =
      (context as any).audienceLevel || 'general';

    const targetRange = AUDIENCE_GRADE_RANGES[audienceLevel] || AUDIENCE_GRADE_RANGES.general;
    const result = this.calculateFleschKincaidGrade(content);

    // Don't validate if insufficient content
    if (result.wordCount < 10) {
      return violations; // Need sufficient content for meaningful readability score
    }

    // Check if readability matches target audience
    if (result.gradeLevel > targetRange.max) {
      // Content is too complex for audience
      violations.push({
        rule: 'S4_READABILITY_MATCH',
        text: `Content grade level (${result.gradeLevel}) exceeds target for ${audienceLevel} audience (max: ${targetRange.max})`,
        position: 0,
        suggestion: `Simplify content to match ${audienceLevel} audience. Target grade ${targetRange.min}-${targetRange.max}. Current: ${result.gradeLevel}. Use shorter sentences and simpler words.`,
        severity: 'error',
      });
    } else if (result.gradeLevel < targetRange.min) {
      // Content is too simple for audience
      violations.push({
        rule: 'S4_READABILITY_MATCH',
        text: `Content grade level (${result.gradeLevel}) is below target for ${audienceLevel} audience (min: ${targetRange.min})`,
        position: 0,
        suggestion: `Increase content complexity to match ${audienceLevel} audience. Target grade ${targetRange.min}-${targetRange.max}. Current: ${result.gradeLevel}. Use more sophisticated vocabulary and complex sentence structures.`,
        severity: 'warning', // Warning for too simple (less critical than too complex)
      });
    }

    return violations;
  }
}
