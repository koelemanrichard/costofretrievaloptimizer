// services/ai/contentGeneration/rulesEngine/validators/discourseChainingValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';

/**
 * Discourse chaining analysis result
 */
export interface DiscourseChainAnalysis {
  totalPairs: number;
  chainedPairs: number;
  chainingRatio: number;
  details: Array<{
    sentence1: string;
    sentence2: string;
    chained: boolean;
    method?: 'pronoun' | 'repetition';
  }>;
}

/**
 * Pronouns that typically refer back to the previous sentence's object
 */
const CHAINING_PRONOUNS = ['this', 'that', 'it', 'these', 'those', 'they', 'them', 'such'];

/**
 * Default threshold for acceptable chaining ratio (50%)
 */
const DEFAULT_CHAINING_THRESHOLD = 0.5;

/**
 * DiscourseChainingValidator (D5)
 *
 * Validates discourse chaining - the linguistic pattern where the object of
 * sentence 1 becomes the subject of sentence 2, creating natural flow.
 *
 * Example of good chaining:
 * - "Solar panels convert sunlight into electricity." (object: electricity)
 * - "This electricity powers homes and businesses." (subject: electricity)
 */
export class DiscourseChainingValidator {
  /**
   * Validate discourse chaining in content
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Handle empty or whitespace-only content
    if (!content || !content.trim()) {
      return violations;
    }

    const analysis = this.analyzeChaining(content);

    // Need at least 2 sentences (1 pair) to validate chaining
    if (analysis.totalPairs < 1) {
      return violations;
    }

    // Check if chaining ratio is below threshold
    if (analysis.chainingRatio < DEFAULT_CHAINING_THRESHOLD) {
      violations.push({
        rule: 'D5_DISCOURSE_CHAINING',
        text: `${Math.round(analysis.chainingRatio * 100)}% chaining ratio (${analysis.chainedPairs}/${analysis.totalPairs} pairs)`,
        position: 0,
        suggestion: `Improve discourse chaining by starting sentences with references to the previous sentence's object. Use pronouns (This, That, These, Those, It) or repeat key noun phrases from the previous sentence. Target: 50%+ of sentence pairs should chain.`,
        severity: 'warning',
      });
    }

    return violations;
  }

  /**
   * Analyze discourse chaining in content
   * Returns detailed analysis including chaining ratio and pair details
   */
  static analyzeChaining(content: string): DiscourseChainAnalysis {
    // Strip HTML tags
    const cleanContent = content.replace(/<[^>]*>/g, ' ').trim();

    // Split into sentences
    const sentences = this.splitIntoSentences(cleanContent);

    if (sentences.length < 2) {
      return {
        totalPairs: 0,
        chainedPairs: 0,
        chainingRatio: 1, // Single sentence is considered "passing"
        details: [],
      };
    }

    const details: DiscourseChainAnalysis['details'] = [];
    let chainedPairs = 0;

    // Check each consecutive pair of sentences
    for (let i = 0; i < sentences.length - 1; i++) {
      const sentence1 = sentences[i];
      const sentence2 = sentences[i + 1];

      const chainResult = this.checkChaining(sentence1, sentence2);

      details.push({
        sentence1,
        sentence2,
        chained: chainResult.chained,
        method: chainResult.method,
      });

      if (chainResult.chained) {
        chainedPairs++;
      }
    }

    const totalPairs = sentences.length - 1;
    const chainingRatio = totalPairs > 0 ? chainedPairs / totalPairs : 1;

    return {
      totalPairs,
      chainedPairs,
      chainingRatio,
      details,
    };
  }

  /**
   * Split content into sentences
   */
  private static splitIntoSentences(content: string): string[] {
    // Split on sentence-ending punctuation followed by space or end
    const rawSentences = content.split(/[.!?]+(?:\s+|$)/);

    // Filter out empty sentences and trim
    return rawSentences
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Check if sentence2 chains from sentence1
   */
  private static checkChaining(
    sentence1: string,
    sentence2: string
  ): { chained: boolean; method?: 'pronoun' | 'repetition' } {
    // Get the first word(s) of sentence2
    const sentence2Lower = sentence2.toLowerCase();
    const sentence2Words = sentence2Lower.split(/\s+/);
    const firstWord = sentence2Words[0];

    // Check for pronoun reference
    if (CHAINING_PRONOUNS.includes(firstWord)) {
      return { chained: true, method: 'pronoun' };
    }

    // Extract potential object/key phrases from sentence1
    const objectPhrases = this.extractObjectPhrases(sentence1);

    // Check if sentence2 starts with or contains a reference to sentence1's object
    for (const phrase of objectPhrases) {
      const phraseLower = phrase.toLowerCase();

      // Check if sentence2 starts with the phrase (possibly with article)
      if (this.startsWithPhrase(sentence2Lower, phraseLower)) {
        return { chained: true, method: 'repetition' };
      }
    }

    return { chained: false };
  }

  /**
   * Extract potential object phrases from a sentence
   * Focuses on nouns and noun phrases that could be referenced in the next sentence
   */
  private static extractObjectPhrases(sentence: string): string[] {
    const phrases: string[] = [];

    // Extract words (excluding common function words)
    const words = sentence.split(/\s+/);
    const contentWords = words.filter(w => !this.isFunctionWord(w.toLowerCase()));

    // Get the last few content words as potential objects
    // Objects typically appear at the end of sentences
    const lastWords = contentWords.slice(-3);
    phrases.push(...lastWords);

    // Also extract noun-like words from the entire sentence
    // (words that might be significant nouns based on position and form)
    for (const word of contentWords) {
      // Skip very short words
      if (word.length < 4) continue;

      // Add words that look like nouns (not ending in common verb suffixes)
      const cleanWord = word.replace(/[.,;:!?'"]/g, '');
      if (!this.looksLikeVerb(cleanWord)) {
        phrases.push(cleanWord);
      }
    }

    return Array.from(new Set(phrases)); // Remove duplicates
  }

  /**
   * Check if a word is a common function word (article, preposition, etc.)
   */
  private static isFunctionWord(word: string): boolean {
    const functionWords = [
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'to', 'of', 'in',
      'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
      'during', 'before', 'after', 'above', 'below', 'between', 'under',
      'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
      'not', 'only', 'also', 'very', 'just', 'more', 'most', 'other',
      'some', 'any', 'no', 'all', 'each', 'every', 'many', 'much', 'few',
    ];
    return functionWords.includes(word);
  }

  /**
   * Check if a word looks like a verb (based on common endings)
   */
  private static looksLikeVerb(word: string): boolean {
    const verbEndings = ['ing', 'ed', 'ize', 'ise', 'ify', 'ate'];
    const lowerWord = word.toLowerCase();
    return verbEndings.some(ending => lowerWord.endsWith(ending));
  }

  /**
   * Check if sentence starts with a phrase (optionally with article)
   */
  private static startsWithPhrase(sentence: string, phrase: string): boolean {
    const articles = ['the ', 'a ', 'an ', ''];

    for (const article of articles) {
      if (sentence.startsWith(article + phrase)) {
        return true;
      }
    }

    return false;
  }
}
