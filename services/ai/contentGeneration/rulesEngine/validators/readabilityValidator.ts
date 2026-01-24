// services/ai/contentGeneration/rulesEngine/validators/readabilityValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { getLanguageName } from '../../../../../utils/languageUtils';

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
 * Language-specific vowel patterns for syllable counting
 */
interface LanguageSyllableConfig {
  vowels: string;
  silentPatterns: RegExp[];
  dipthongs: string[];
  // Some languages have different syllable rules
  countConsonantClusters?: boolean;
}

const LANGUAGE_SYLLABLE_CONFIGS: Record<string, LanguageSyllableConfig> = {
  'English': {
    vowels: 'aeiouy',
    silentPatterns: [
      /e$/,  // Silent e at end (but not always)
      /ed$/, // Often silent -ed
      /es$/, // Often silent -es
    ],
    dipthongs: ['ai', 'au', 'aw', 'ay', 'ea', 'ee', 'ei', 'eu', 'ew', 'ey', 'ie', 'oa', 'oe', 'oi', 'oo', 'ou', 'ow', 'oy'],
  },
  'Dutch': {
    vowels: 'aeiouïëäöüy',
    silentPatterns: [],
    dipthongs: ['aa', 'ee', 'ie', 'oe', 'oo', 'uu', 'eu', 'ui', 'ei', 'ij', 'au', 'ou', 'ai', 'oi', 'aai', 'oei', 'ooi', 'eeu', 'ieu', 'uw'],
    countConsonantClusters: false,
  },
  'German': {
    vowels: 'aeiouäöüy',
    silentPatterns: [],
    dipthongs: ['aa', 'ee', 'ie', 'ei', 'ai', 'au', 'äu', 'eu', 'oo'],
  },
  'French': {
    vowels: 'aeiouyàâäéèêëïîôùûüœæ',
    silentPatterns: [
      /e$/,   // Silent e at end
      /es$/,  // Silent es
      /ent$/, // Often silent -ent in verbs
    ],
    dipthongs: ['ai', 'au', 'eau', 'ei', 'eu', 'oi', 'ou', 'œu'],
  },
  'Spanish': {
    vowels: 'aeiouáéíóúü',
    silentPatterns: [],
    dipthongs: ['ai', 'au', 'ei', 'eu', 'oi', 'ou', 'ia', 'ie', 'io', 'iu', 'ua', 'ue', 'ui', 'uo'],
  },
  'Italian': {
    vowels: 'aeiouàèéìíòóùú',
    silentPatterns: [],
    dipthongs: ['ai', 'au', 'ei', 'eu', 'oi', 'ou', 'ia', 'ie', 'io', 'iu', 'ua', 'ue', 'ui', 'uo'],
  },
  'Portuguese': {
    vowels: 'aeiouáàâãéêíóôõúü',
    silentPatterns: [],
    dipthongs: ['ai', 'au', 'ei', 'eu', 'oi', 'ou', 'ui', 'ãe', 'ão', 'õe'],
  },
  'Polish': {
    vowels: 'aeiouóąęy',
    silentPatterns: [],
    dipthongs: [], // Polish has very few dipthongs
    countConsonantClusters: true, // Polish has many consonant clusters
  },
};

/**
 * Language-specific abbreviations for sentence counting
 */
const LANGUAGE_ABBREVIATIONS: Record<string, RegExp[]> = {
  'English': [
    /\bDr\./gi, /\bMr\./gi, /\bMrs\./gi, /\bMs\./gi, /\bProf\./gi,
    /\bSt\./gi, /\bJr\./gi, /\bSr\./gi, /\be\.g\./gi, /\bi\.e\./gi,
    /\betc\./gi, /\bvs\./gi, /\bInc\./gi, /\bLtd\./gi,
  ],
  'Dutch': [
    /\bDr\./gi, /\bMr\./gi, /\bMw\./gi, /\bDrs\./gi, /\bProf\./gi,
    /\bBijv\./gi, /\bo\.a\./gi, /\bd\.w\.z\./gi, /\benz\./gi, /\bca\./gi,
    /\bB\.V\./gi, /\bN\.V\./gi,
  ],
  'German': [
    /\bDr\./gi, /\bHr\./gi, /\bFr\./gi, /\bProf\./gi, /\bz\.B\./gi,
    /\bd\.h\./gi, /\busw\./gi, /\bbzw\./gi, /\bca\./gi, /\bggf\./gi,
    /\bGmbH\./gi, /\bAG\./gi,
  ],
  'French': [
    /\bDr\./gi, /\bM\./gi, /\bMme\./gi, /\bMlle\./gi, /\bProf\./gi,
    /\bc\.-à-d\./gi, /\bp\.ex\./gi, /\betc\./gi, /\bvs\./gi,
  ],
  'Spanish': [
    /\bDr\./gi, /\bSr\./gi, /\bSra\./gi, /\bSrta\./gi, /\bProf\./gi,
    /\bp\.ej\./gi, /\betc\./gi, /\bvs\./gi, /\bS\.A\./gi, /\bS\.L\./gi,
  ],
  'Italian': [
    /\bDr\./gi, /\bSig\./gi, /\bSig\.ra\./gi, /\bProf\./gi,
    /\bp\.es\./gi, /\becc\./gi, /\bS\.p\.A\./gi, /\bS\.r\.l\./gi,
  ],
  'Portuguese': [
    /\bDr\./gi, /\bSr\./gi, /\bSra\./gi, /\bProf\./gi,
    /\bp\.ex\./gi, /\betc\./gi, /\bvs\./gi, /\bLtda\./gi, /\bS\.A\./gi,
  ],
  'Polish': [
    /\bDr\./gi, /\bMgr\./gi, /\bInż\./gi, /\bProf\./gi,
    /\bnp\./gi, /\btj\./gi, /\bitp\./gi, /\bitd\./gi, /\bsp\. z o\.o\./gi,
  ],
};

/**
 * Get syllable config for a language
 */
function getSyllableConfig(language?: string): LanguageSyllableConfig {
  const langName = getLanguageName(language);
  return LANGUAGE_SYLLABLE_CONFIGS[langName] || LANGUAGE_SYLLABLE_CONFIGS['English'];
}

/**
 * Get abbreviations for a language
 */
function getAbbreviations(language?: string): RegExp[] {
  const langName = getLanguageName(language);
  return LANGUAGE_ABBREVIATIONS[langName] || LANGUAGE_ABBREVIATIONS['English'];
}

/**
 * ReadabilityValidator - Enforces S4 rule for audience-appropriate readability
 *
 * Uses Flesch-Kincaid Grade Level formula (adapted for multilingual):
 * Grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
 */
export class ReadabilityValidator {
  /**
   * Count syllables in a word using language-specific rules
   */
  static countSyllables(word: string, language?: string): number {
    if (!word || word.length === 0) return 0;

    word = word.toLowerCase().trim();
    if (word.length === 0) return 0;

    // Special case for single letters
    if (word.length <= 2) return 1;

    const config = getSyllableConfig(language);
    const langName = getLanguageName(language);

    // Remove non-alpha characters (keeping accented chars for non-English)
    const alphaPattern = language && language !== 'en' && language !== 'English'
      ? /[^a-zA-Zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿąćęłńóśźżäöüßàâäéèêëïîôùûüœæ]/g
      : /[^a-z]/g;
    word = word.replace(alphaPattern, '');
    if (word.length === 0) return 0;

    // English-specific algorithm (heuristic based)
    if (langName === 'English') {
      let syllableCount = 0;
      const vowels = config.vowels; // aeiouy

      // Problem: "beautiful" -> "eau" is tripthong, "ea" is dipthong, etc.
      // Standard algorithm:
      // 1. Count vowel groups
      // 2. Subtract silent endings

      // Step 1: Count vowel groups (consecutive vowels count as 1)
      let isPrevVowel = false;
      for (let i = 0; i < word.length; i++) {
        const isVowel = vowels.includes(word[i]);
        if (isVowel && !isPrevVowel) {
          syllableCount++;
        }
        isPrevVowel = isVowel;
      }

      // Step 2: Handle special cases

      // Silent 'e' at end
      if (word.endsWith('e')) {
        // Check for pronounced endings like 'le' (table)
        if (word.endsWith('le') && word.length > 2 && !vowels.includes(word[word.length - 3])) {
          // 'table' -> 'le' is pronounced, keep count
        } else {
          // 'safe', 'rate' -> silent e, subtract
          syllableCount--;
        }
      }

      // 'ed' ending (often silent)
      if (word.endsWith('ed')) {
        // 'ted', 'ded' are pronounced
        if (word.length > 3 && (word[word.length - 3] === 't' || word[word.length - 3] === 'd')) {
          // keep count
        } else {
          // 'looked' -> silent 'ed'
          syllableCount--;
        }
      }

      // 'es' ending
      if (word.endsWith('es')) {
        if (word.length > 3 && !['s', 'z', 'x', 'ch', 'sh'].some(end => word.slice(0, -2).endsWith(end))) {
          // 'rates' -> silent 'es' (actually silent e + s)
          syllableCount--;
        }
      }

      // Special corrections for some common patterns
      // 'ia' usually 2 syllables (media, dial)
      if (word.includes('ia')) syllableCount++;
      // 'eo' usually 2 syllables (video)
      if (word.includes('eo')) syllableCount++;
      // 'ii' usually 2 syllables (radii)
      if (word.includes('ii')) syllableCount++;
      // 'ea' split in -eate endings (create, permeate, delineate)
      if (word.endsWith('eate')) syllableCount++;

      // Ensure at least 1
      return Math.max(1, syllableCount);
    }

    // Default/Fallback algorithm for other languages
    // Count vowel groups
    const vowels = config.vowels;
    let syllableCount = 0;
    let prevWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !prevWasVowel) {
        syllableCount++;
      }
      prevWasVowel = isVowel;
    }

    // Adjust for dipthongs (two vowels = one syllable)
    // NOTE: Simple counting of vowel groups already treats "ea" as 1 count
    // So we don't need to subtract unless dipthong logic was additive

    // Language specific silent endings
    if (langName === 'French') {
      if (word.endsWith('e') && syllableCount > 1) syllableCount--;
      if (word.endsWith('ent') && word.length > 4 && syllableCount > 1) syllableCount--;
    }

    return Math.max(1, syllableCount);
  }

  /**
   * Count sentences in content
   * Handles language-specific abbreviations to avoid false positives
   */
  static countSentences(content: string, language?: string): number {
    if (!content || content.trim().length === 0) return 0;

    let processed = content;
    const abbreviations = getAbbreviations(language);

    // Replace abbreviations to prevent false sentence breaks
    for (const abbr of abbreviations) {
      processed = processed.replace(abbr, (match) => match.replace('.', ''));
    }

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
      .filter(word => word.length > 0 && /[a-zA-Zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿąćęłńóśźżäöüß]/i.test(word));
  }

  /**
   * Calculate Flesch-Kincaid Grade Level (or equivalent for other languages)
   * Formula: 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
   *
   * For non-English languages, we use a normalized approach that provides
   * comparable results across languages.
   */
  static calculateFleschKincaidGrade(content: string, language?: string): FleschKincaidResult {
    const words = this.extractWords(content);
    const wordCount = words.length;
    const sentenceCount = this.countSentences(content, language);
    const syllableCount = words.reduce((sum, word) => sum + this.countSyllables(word, language), 0);

    // Avoid division by zero
    if (wordCount === 0 || sentenceCount === 0) {
      return {
        gradeLevel: 0,
        wordCount: 0,
        sentenceCount: 0,
        syllableCount: 0,
      };
    }

    const langName = getLanguageName(language);

    let gradeLevel: number;

    // Use language-specific formulas where available
    switch (langName) {
      case 'Dutch':
        // Brouwer formula for Dutch:
        // 195 - (2/3 * average_sentence_length) - (100 * syllables/words)
        // Convert to grade level (higher = harder)
        const brouwerScore = 195 - (2 / 3 * (wordCount / sentenceCount)) - (100 * (syllableCount / wordCount));
        // Convert Brouwer (0-100 scale, higher=easier) to grade level
        gradeLevel = Math.max(0, (100 - brouwerScore) / 6);
        break;

      case 'German':
        // Wiener Sachtextformel (simplified)
        // Similar complexity calculation
        gradeLevel = 0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / wordCount) - 15.59;
        // German text tends to score higher, adjust
        gradeLevel = gradeLevel * 0.9;
        break;

      case 'French':
        // French adaptation of Flesch
        gradeLevel = 0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / wordCount) - 15.59;
        break;

      case 'Spanish':
        // Fernandez-Huerta formula (adapted)
        const fernandezScore = 206.84 - (0.60 * (syllableCount / wordCount * 100)) - (1.02 * (wordCount / sentenceCount));
        // Convert to grade level (score 0-100, 100=easiest)
        gradeLevel = Math.max(0, (100 - fernandezScore) / 5);
        break;

      case 'Italian':
        // GULPEASE index adaptation
        const gulpease = 89 + ((300 * sentenceCount - 10 * (content.replace(/\s/g, '').length)) / wordCount);
        // Convert GULPEASE (0-100, 100=easiest) to grade level
        gradeLevel = Math.max(0, (100 - gulpease) / 5);
        break;

      case 'Portuguese':
      case 'Polish':
      default:
        // Standard Flesch-Kincaid for English and fallback
        gradeLevel = 0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / wordCount) - 15.59;
        break;
    }

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

    // Get language from context
    const language = context.language || context.businessInfo?.language;

    // Get audience level from context, default to general
    const audienceLevel: AudienceLevel =
      (context as any).audienceLevel || 'general';

    const targetRange = AUDIENCE_GRADE_RANGES[audienceLevel] || AUDIENCE_GRADE_RANGES.general;
    const result = this.calculateFleschKincaidGrade(content, language);

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
