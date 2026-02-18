// services/ai/contentGeneration/rulesEngine/validators/formatCodeValidator.ts

import { ValidationViolation, FormatCode } from '../../../../../types';
import { splitSentences } from '../../../../../utils/sentenceTokenizer';

export class FormatCodeValidator {
  private static readonly FS_MIN_WORDS = 40;
  private static readonly FS_MAX_WORDS = 50;

  static validate(content: string, formatCode: FormatCode): ValidationViolation[] {
    switch (formatCode) {
      case 'FS':
        return this.validateFeaturedSnippet(content);
      case 'PAA':
        return this.validatePAA(content);
      case 'LISTING':
        return this.validateListing(content);
      case 'TABLE':
        return this.validateTable(content);
      case 'DEFINITIVE':
        return this.validateDefinitive(content);
      default:
        return [];
    }
  }

  private static validateFeaturedSnippet(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const words = content.trim().split(/\s+/).length;

    if (words < this.FS_MIN_WORDS) {
      violations.push({
        rule: 'FS_WORD_COUNT',
        text: `${words} words`,
        position: 0,
        suggestion: `Featured Snippet must be 40-50 words. Current: ${words}. Add more detail.`,
        severity: 'error',
      });
    } else if (words > this.FS_MAX_WORDS) {
      violations.push({
        rule: 'FS_WORD_COUNT',
        text: `${words} words`,
        position: 0,
        suggestion: `Featured Snippet must be 40-50 words. Current: ${words}. Reduce to fit snippet box.`,
        severity: 'error',
      });
    }

    // Check for direct definition at start
    const startsWithDefinition = /^[A-Z][^.!?]*\s+(?:is|are|refers?\s+to|means?)\s+/i.test(content);
    if (!startsWithDefinition) {
      violations.push({
        rule: 'FS_NO_DEFINITION',
        text: content.substring(0, 50) + '...',
        position: 0,
        suggestion: 'Featured Snippet must start with direct definition: "[Entity] is/are..."',
        severity: 'warning',
      });
    }

    return violations;
  }

  private static validatePAA(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    const sentences = splitSentences(content);

    // PAA should have definition + expansion structure
    if (sentences.length < 2) {
      violations.push({
        rule: 'PAA_STRUCTURE',
        text: content,
        position: 0,
        suggestion: 'PAA answer needs Definition + Expansion. Add elaboration after the direct answer.',
        severity: 'warning',
      });
    }

    // First sentence should be a direct definition/answer
    if (sentences.length > 0) {
      const first = sentences[0];
      const isDirectAnswer = /\b(is|are|refers?\s+to|means?|stands?\s+for|involves?|requires?|includes?)\b/i.test(first);
      if (!isDirectAnswer) {
        violations.push({
          rule: 'PAA_DIRECT_ANSWER',
          text: first.substring(0, 60) + '...',
          position: 0,
          suggestion: 'PAA first sentence should be a direct answer: "[Entity] is/are [definition]". Start with the entity as subject.',
          severity: 'warning',
        });
      }
    }

    // Total word count check: PAA answers should be concise (40-60 words)
    const words = content.trim().split(/\s+/).length;
    if (words > 80) {
      violations.push({
        rule: 'PAA_LENGTH',
        text: `${words} words`,
        position: 0,
        suggestion: `PAA answers should be concise (40-60 words). Current: ${words}. Trim to essential definition + one expansion.`,
        severity: 'warning',
      });
    }

    return violations;
  }

  private static validateListing(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Check for list markers
    const hasListMarkers = /[-*•]\s+|^\d+\.\s+/m.test(content);

    if (!hasListMarkers) {
      violations.push({
        rule: 'LISTING_NO_LIST',
        text: content.substring(0, 100),
        position: 0,
        suggestion: 'LISTING format requires bullet points or numbered list.',
        severity: 'error',
      });
      return violations;
    }

    // Check for preamble (sentence before list)
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const firstLineIsList = /^[-*•]\s+|^\d+\.\s+/.test(lines[0]?.trim() || '');

    if (firstLineIsList) {
      violations.push({
        rule: 'LISTING_NO_PREAMBLE',
        text: lines[0],
        position: 0,
        suggestion: 'Lists require a preamble sentence before items. E.g., "The main benefits include:"',
        severity: 'error',
      });
    }

    return violations;
  }

  private static validateTable(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Check for table structure (markdown or HTML)
    const hasTable = /\|.*\|/.test(content) || /<table/i.test(content);

    if (!hasTable) {
      violations.push({
        rule: 'TABLE_NO_TABLE',
        text: content.substring(0, 100),
        position: 0,
        suggestion: 'TABLE format requires actual table markup (Markdown | or HTML <table>).',
        severity: 'error',
      });
    }

    return violations;
  }

  private static validateDefinitive(content: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const words = content.trim().split(/\s+/).length;

    // Definitive should be comprehensive - at least 200 words
    if (words < 200) {
      violations.push({
        rule: 'DEFINITIVE_TOO_SHORT',
        text: `${words} words`,
        position: 0,
        suggestion: `DEFINITIVE format requires comprehensive coverage. Current: ${words} words. Expand with more detail.`,
        severity: 'warning',
      });
    }

    return violations;
  }
}
