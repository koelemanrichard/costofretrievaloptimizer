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
 * Multilingual chaining pronouns that typically refer back to the previous sentence's object
 * Organized by language code
 */
const MULTILINGUAL_CHAINING_PRONOUNS: Record<string, string[]> = {
  en: ['this', 'that', 'it', 'these', 'those', 'they', 'them', 'such', 'which', 'what'],
  nl: ['dit', 'dat', 'het', 'deze', 'die', 'zij', 'ze', 'hen', 'hun', 'dergelijke', 'zulke', 'welke', 'wat', 'hierbij', 'daarbij', 'hierdoor', 'daardoor', 'hiermee', 'daarmee'],
  de: ['dies', 'diese', 'dieser', 'dieses', 'jene', 'jener', 'jenes', 'es', 'sie', 'solche', 'solcher', 'welche', 'welcher', 'was', 'damit', 'dadurch', 'hierbei', 'dabei', 'hiermit', 'somit'],
  fr: ['ce', 'ceci', 'cela', 'ça', 'cette', 'ces', 'celui', 'celle', 'ceux', 'celles', 'tel', 'telle', 'tels', 'telles', 'lequel', 'laquelle', 'lesquels', 'lesquelles', 'ainsi', 'donc'],
  es: ['esto', 'eso', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel', 'aquella', 'aquellos', 'aquellas', 'tal', 'tales', 'cual', 'cuales', 'así', 'ello'],
  it: ['questo', 'questa', 'questi', 'queste', 'quello', 'quella', 'quelli', 'quelle', 'ciò', 'esso', 'essa', 'essi', 'esse', 'tale', 'tali', 'quale', 'quali', 'così', 'pertanto'],
  pt: ['isto', 'isso', 'aquilo', 'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'tal', 'tais', 'qual', 'quais', 'assim'],
  pl: ['to', 'ten', 'ta', 'te', 'ci', 'tamten', 'tamta', 'tamto', 'taki', 'taka', 'takie', 'tacy', 'takie', 'który', 'która', 'które', 'którzy', 'tak', 'tym', 'zatem', 'tedy'],
};

/**
 * Multilingual function words (articles, prepositions, conjunctions, auxiliaries)
 * Organized by language code
 */
const MULTILINGUAL_FUNCTION_WORDS: Record<string, string[]> = {
  en: [
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'under',
    'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
    'not', 'only', 'also', 'very', 'just', 'more', 'most', 'other',
    'some', 'any', 'no', 'all', 'each', 'every', 'many', 'much', 'few',
  ],
  nl: [
    'de', 'het', 'een', 'is', 'zijn', 'was', 'waren', 'ben', 'bent', 'wordt',
    'worden', 'werd', 'werden', 'hebben', 'heeft', 'had', 'hadden', 'zal',
    'zullen', 'zou', 'zouden', 'kan', 'kunnen', 'mag', 'mogen', 'moet', 'moeten',
    'van', 'naar', 'in', 'voor', 'op', 'met', 'aan', 'door', 'uit', 'als',
    'over', 'onder', 'tussen', 'na', 'voor', 'boven', 'onder',
    'en', 'maar', 'of', 'noch', 'dus', 'toch', 'ook', 'nog', 'zeer',
    'veel', 'weinig', 'elk', 'elke', 'alle', 'geen', 'niet',
  ],
  de: [
    'der', 'die', 'das', 'ein', 'eine', 'einer', 'eines', 'einem', 'einen',
    'ist', 'sind', 'war', 'waren', 'sein', 'bin', 'bist', 'wird', 'werden',
    'wurde', 'wurden', 'haben', 'hat', 'hatte', 'hatten', 'kann', 'können',
    'darf', 'dürfen', 'muss', 'müssen', 'soll', 'sollen', 'will', 'wollen',
    'von', 'zu', 'zum', 'zur', 'in', 'im', 'für', 'auf', 'am', 'mit', 'an',
    'durch', 'aus', 'als', 'über', 'unter', 'zwischen', 'nach', 'vor',
    'und', 'aber', 'oder', 'noch', 'so', 'doch', 'auch', 'nur', 'sehr',
    'viel', 'wenig', 'jede', 'jeder', 'alle', 'kein', 'keine', 'nicht',
  ],
  fr: [
    'le', 'la', 'les', 'un', 'une', 'des', 'est', 'sont', 'était', 'étaient',
    'être', 'suis', 'es', 'sera', 'seront', 'ont', 'a', 'avait', 'avaient',
    'avoir', 'peut', 'peuvent', 'doit', 'doivent', 'veut', 'vouloir',
    'de', 'du', 'à', 'au', 'aux', 'en', 'dans', 'pour', 'sur', 'avec',
    'par', 'comme', 'entre', 'sans', 'sous', 'avant', 'après', 'depuis',
    'et', 'ou', 'mais', 'donc', 'ni', 'car', 'aussi', 'très', 'plus',
    'moins', 'tout', 'tous', 'toute', 'toutes', 'chaque', 'aucun', 'pas', 'ne',
  ],
  es: [
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'es', 'son',
    'era', 'eran', 'ser', 'estar', 'está', 'están', 'fue', 'fueron',
    'ha', 'han', 'había', 'habían', 'haber', 'puede', 'pueden', 'debe', 'deben',
    'de', 'del', 'a', 'al', 'en', 'para', 'sobre', 'con', 'por', 'como',
    'entre', 'sin', 'bajo', 'ante', 'desde', 'hasta', 'hacia', 'tras',
    'y', 'o', 'pero', 'ni', 'pues', 'también', 'muy', 'más', 'menos',
    'todo', 'todos', 'toda', 'todas', 'cada', 'ningún', 'no', 'nunca',
  ],
  it: [
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'è', 'sono',
    'era', 'erano', 'essere', 'sei', 'siamo', 'fu', 'furono', 'stato',
    'ha', 'hanno', 'aveva', 'avevano', 'avere', 'può', 'possono', 'deve', 'devono',
    'di', 'del', 'dello', 'della', 'a', 'al', 'allo', 'alla', 'in', 'per',
    'su', 'con', 'da', 'dal', 'dallo', 'dalla', 'come', 'tra', 'fra', 'senza',
    'e', 'o', 'ma', 'né', 'quindi', 'anche', 'molto', 'più', 'meno',
    'tutto', 'tutti', 'tutta', 'tutte', 'ogni', 'nessun', 'non', 'mai',
  ],
  pt: [
    'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'é', 'são', 'era',
    'eram', 'ser', 'estar', 'está', 'estão', 'foi', 'foram', 'sido',
    'tem', 'têm', 'tinha', 'tinham', 'ter', 'pode', 'podem', 'deve', 'devem',
    'de', 'do', 'da', 'dos', 'das', 'a', 'ao', 'à', 'em', 'no', 'na',
    'para', 'sobre', 'com', 'por', 'pelo', 'pela', 'como', 'entre', 'sem',
    'e', 'ou', 'mas', 'nem', 'pois', 'também', 'muito', 'mais', 'menos',
    'todo', 'todos', 'toda', 'todas', 'cada', 'nenhum', 'não', 'nunca',
  ],
  pl: [
    'ten', 'ta', 'to', 'ci', 'te', 'jest', 'są', 'był', 'była', 'było',
    'byli', 'były', 'być', 'jestem', 'jesteś', 'będzie', 'będą',
    'ma', 'mają', 'miał', 'miała', 'mieć', 'może', 'mogą', 'musi', 'muszą',
    'z', 'ze', 'w', 'we', 'na', 'do', 'od', 'dla', 'po', 'o', 'przy',
    'przez', 'pod', 'nad', 'za', 'przed', 'między', 'bez', 'jak', 'jako',
    'i', 'a', 'lub', 'ale', 'więc', 'też', 'także', 'bardzo', 'więcej',
    'mniej', 'wszystko', 'wszystkie', 'każdy', 'żaden', 'nie', 'nigdy',
  ],
};

/**
 * Multilingual articles for detecting phrase starts
 * Organized by language code
 */
const MULTILINGUAL_ARTICLES: Record<string, string[]> = {
  en: ['the ', 'a ', 'an ', ''],
  nl: ['de ', 'het ', 'een ', ''],
  de: ['der ', 'die ', 'das ', 'ein ', 'eine ', 'einer ', 'eines ', 'einem ', 'einen ', ''],
  fr: ['le ', 'la ', 'les ', 'un ', 'une ', 'des ', "l'", ''],
  es: ['el ', 'la ', 'los ', 'las ', 'un ', 'una ', 'unos ', 'unas ', ''],
  it: ['il ', 'lo ', 'la ', 'i ', 'gli ', 'le ', 'un ', 'uno ', 'una ', "l'", ''],
  pt: ['o ', 'a ', 'os ', 'as ', 'um ', 'uma ', 'uns ', 'umas ', ''],
  pl: [''], // Polish has no articles
};

/**
 * Multilingual verb endings for detecting verb-like words
 * Organized by language code
 */
const MULTILINGUAL_VERB_ENDINGS: Record<string, string[]> = {
  en: ['ing', 'ed', 'ize', 'ise', 'ify', 'ate'],
  nl: ['en', 'de', 'te', 'den', 'ten', 'eren', 'igen', 'iseren'],
  de: ['en', 'te', 'st', 'ieren', 'igen', 'ieren', 'isieren'],
  fr: ['er', 'ir', 'oir', 're', 'ant', 'ment', 'iser', 'ifier'],
  es: ['ar', 'er', 'ir', 'ando', 'iendo', 'ado', 'ido', 'izar', 'ificar'],
  it: ['are', 'ere', 'ire', 'ando', 'endo', 'ato', 'ito', 'izzare', 'ificare'],
  pt: ['ar', 'er', 'ir', 'ando', 'endo', 'indo', 'ado', 'ido', 'izar', 'ificar'],
  pl: ['ać', 'ić', 'ować', 'ywać', 'iwać', 'nąć', 'ąc', 'ując', 'iony', 'any'],
};

/**
 * Default threshold for acceptable chaining ratio (50%)
 */
const DEFAULT_CHAINING_THRESHOLD = 0.5;

/**
 * Get chaining pronouns for a specific language, falling back to English
 */
function getChainingPronouns(language?: string): string[] {
  const lang = (language || 'en').toLowerCase().substring(0, 2);
  return MULTILINGUAL_CHAINING_PRONOUNS[lang] || MULTILINGUAL_CHAINING_PRONOUNS.en;
}

/**
 * Get function words for a specific language, falling back to English
 */
function getFunctionWords(language?: string): string[] {
  const lang = (language || 'en').toLowerCase().substring(0, 2);
  return MULTILINGUAL_FUNCTION_WORDS[lang] || MULTILINGUAL_FUNCTION_WORDS.en;
}

/**
 * Get articles for a specific language, falling back to English
 */
function getArticles(language?: string): string[] {
  const lang = (language || 'en').toLowerCase().substring(0, 2);
  return MULTILINGUAL_ARTICLES[lang] || MULTILINGUAL_ARTICLES.en;
}

/**
 * Get verb endings for a specific language, falling back to English
 */
function getVerbEndings(language?: string): string[] {
  const lang = (language || 'en').toLowerCase().substring(0, 2);
  return MULTILINGUAL_VERB_ENDINGS[lang] || MULTILINGUAL_VERB_ENDINGS.en;
}

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
    const language = context?.language;

    // Handle empty or whitespace-only content
    if (!content || !content.trim()) {
      return violations;
    }

    const analysis = this.analyzeChaining(content, language);

    // Need at least 2 sentences (1 pair) to validate chaining
    if (analysis.totalPairs < 1) {
      return violations;
    }

    // Check if chaining ratio is below threshold
    if (analysis.chainingRatio < DEFAULT_CHAINING_THRESHOLD) {
      // Get language-specific suggestion
      const pronounExamples = this.getPronounExamples(language);

      violations.push({
        rule: 'D5_DISCOURSE_CHAINING',
        text: `${Math.round(analysis.chainingRatio * 100)}% chaining ratio (${analysis.chainedPairs}/${analysis.totalPairs} pairs)`,
        position: 0,
        suggestion: `Improve discourse chaining by starting sentences with references to the previous sentence's object. Use pronouns (${pronounExamples}) or repeat key noun phrases from the previous sentence. Target: 50%+ of sentence pairs should chain.`,
        severity: 'warning',
      });
    }

    return violations;
  }

  /**
   * Get example pronouns for the suggestion message
   */
  private static getPronounExamples(language?: string): string {
    const lang = (language || 'en').toLowerCase().substring(0, 2);
    const examples: Record<string, string> = {
      en: 'This, That, These, Those, It',
      nl: 'Dit, Dat, Deze, Die, Het',
      de: 'Dies, Diese, Dieser, Es, Sie',
      fr: 'Ce, Ceci, Cela, Cette, Ces',
      es: 'Esto, Eso, Este, Esta, Estos',
      it: 'Questo, Questa, Quello, Quella, Ciò',
      pt: 'Isto, Isso, Este, Esta, Aquilo',
      pl: 'To, Ten, Ta, Te, Tym',
    };
    return examples[lang] || examples.en;
  }

  /**
   * Analyze discourse chaining in content
   * Returns detailed analysis including chaining ratio and pair details
   */
  static analyzeChaining(content: string, language?: string): DiscourseChainAnalysis {
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

      const chainResult = this.checkChaining(sentence1, sentence2, language);

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
   * Uses language-agnostic sentence splitting
   */
  private static splitIntoSentences(content: string): string[] {
    // Split on sentence-ending punctuation followed by space or end
    // Also handle common abbreviations in multiple languages
    const rawSentences = content.split(/[.!?。！？]+(?:\s+|$)/);

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
    sentence2: string,
    language?: string
  ): { chained: boolean; method?: 'pronoun' | 'repetition' } {
    const chainingPronouns = getChainingPronouns(language);

    // Get the first word(s) of sentence2 using Unicode-aware extraction
    const sentence2Lower = sentence2.toLowerCase();
    const wordMatches = [...sentence2Lower.matchAll(/[\p{L}\p{N}]+/gu)];
    const firstWord = wordMatches.length > 0 ? wordMatches[0][0] : '';

    // Check for pronoun reference
    if (chainingPronouns.includes(firstWord)) {
      return { chained: true, method: 'pronoun' };
    }

    // Also check for two-word pronoun combinations (e.g., "this method", "deze methode")
    if (wordMatches.length >= 2) {
      const firstTwoWords = wordMatches[0][0] + ' ' + wordMatches[1][0];
      for (const pronoun of chainingPronouns) {
        if (firstTwoWords.startsWith(pronoun + ' ')) {
          return { chained: true, method: 'pronoun' };
        }
      }
    }

    // Extract potential object/key phrases from sentence1
    const objectPhrases = this.extractObjectPhrases(sentence1, language);

    // Check if sentence2 starts with or contains a reference to sentence1's object
    const articles = getArticles(language);
    for (const phrase of objectPhrases) {
      const phraseLower = phrase.toLowerCase();

      // Check if sentence2 starts with the phrase (possibly with article)
      if (this.startsWithPhrase(sentence2Lower, phraseLower, articles)) {
        return { chained: true, method: 'repetition' };
      }
    }

    return { chained: false };
  }

  /**
   * Extract potential object phrases from a sentence
   * Focuses on nouns and noun phrases that could be referenced in the next sentence
   * Uses Unicode-aware word extraction for multilingual support
   */
  private static extractObjectPhrases(sentence: string, language?: string): string[] {
    const phrases: string[] = [];
    const functionWords = getFunctionWords(language);

    // Unicode-aware word extraction
    const wordMatches = [...sentence.matchAll(/[\p{L}\p{N}]+/gu)];
    const words = wordMatches.map(m => m[0]);

    const contentWords = words.filter(w => !functionWords.includes(w.toLowerCase()));

    // Get the last few content words as potential objects
    // Objects typically appear at the end of sentences
    const lastWords = contentWords.slice(-3);
    phrases.push(...lastWords);

    // Also extract noun-like words from the entire sentence
    // (words that might be significant nouns based on position and form)
    const verbEndings = getVerbEndings(language);

    for (const word of contentWords) {
      // Skip very short words
      if (word.length < 4) continue;

      // Add words that look like nouns (not ending in common verb suffixes)
      const cleanWord = word.replace(/[.,;:!?'"]/g, '');
      if (!this.looksLikeVerb(cleanWord, verbEndings)) {
        phrases.push(cleanWord);
      }
    }

    return Array.from(new Set(phrases)); // Remove duplicates
  }

  /**
   * Check if a word looks like a verb (based on common endings for the language)
   */
  private static looksLikeVerb(word: string, verbEndings: string[]): boolean {
    const lowerWord = word.toLowerCase();
    return verbEndings.some(ending => lowerWord.endsWith(ending));
  }

  /**
   * Check if sentence starts with a phrase (optionally with article)
   */
  private static startsWithPhrase(sentence: string, phrase: string, articles: string[]): boolean {
    for (const article of articles) {
      if (sentence.startsWith(article + phrase)) {
        return true;
      }
    }

    return false;
  }
}
