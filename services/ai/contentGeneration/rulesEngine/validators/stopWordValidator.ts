// services/ai/contentGeneration/rulesEngine/validators/stopWordValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { getLanguageName } from '../../../../../utils/languageUtils';

/**
 * Comprehensive stop word lists per language.
 * These are function words with minimal semantic value.
 */
const STOP_WORDS: Record<string, Set<string>> = {
  'English': new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'and', 'or', 'but', 'not', 'if',
    'this', 'that', 'it', 'its', 'as', 'so', 'than', 'then', 'too',
    'also', 'very', 'just', 'about', 'up', 'out', 'no', 'only', 'into',
    'over', 'after', 'before', 'between', 'through', 'during', 'each',
    'all', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
    'own', 'same', 'any', 'what', 'which', 'who', 'whom', 'when',
    'where', 'why', 'how', 'here', 'there', 'their', 'they', 'them',
    'he', 'she', 'him', 'her', 'his', 'we', 'our', 'us', 'you', 'your',
    'me', 'my', 'i', 'am',
  ]),

  'Dutch': new Set([
    'de', 'het', 'een', 'is', 'zijn', 'was', 'waren', 'wordt', 'worden',
    'heeft', 'hebben', 'had', 'hadden', 'kan', 'kunnen', 'zal', 'zullen',
    'zou', 'zouden', 'moet', 'moeten', 'mag', 'mogen', 'wil', 'willen',
    'van', 'in', 'op', 'aan', 'met', 'voor', 'bij', 'uit', 'door',
    'over', 'na', 'tot', 'om', 'en', 'of', 'maar', 'dat', 'die',
    'er', 'dan', 'ook', 'nog', 'al', 'wel', 'niet', 'geen', 'meer',
    'te', 'als', 'naar', 'hun', 'zij', 'hij', 'haar', 'hem', 'je',
    'jij', 'we', 'wij', 'ik', 'mij', 'dit', 'deze', 'zo', 'wat',
    'wie', 'waar', 'wanneer', 'hoe', 'hier', 'daar',
  ]),

  'German': new Set([
    'der', 'die', 'das', 'ein', 'eine', 'ist', 'sind', 'war', 'waren',
    'wird', 'werden', 'hat', 'haben', 'hatte', 'hatten', 'kann', 'können',
    'soll', 'sollen', 'muss', 'müssen', 'darf', 'dürfen', 'will', 'wollen',
    'von', 'in', 'auf', 'an', 'mit', 'für', 'bei', 'aus', 'durch',
    'über', 'nach', 'bis', 'um', 'und', 'oder', 'aber', 'dass',
    'es', 'er', 'sie', 'ihm', 'ihr', 'wir', 'uns', 'ich', 'mich',
    'du', 'dich', 'nicht', 'kein', 'mehr', 'zu', 'als', 'auch',
    'noch', 'schon', 'so', 'was', 'wer', 'wo', 'wann', 'wie',
    'hier', 'dort', 'den', 'dem', 'des',
  ]),

  'French': new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'est', 'sont', 'a', 'ont',
    'était', 'étaient', 'sera', 'seront', 'peut', 'peuvent', 'doit',
    'doivent', 'de', 'du', 'en', 'dans', 'sur', 'à', 'avec', 'pour',
    'par', 'au', 'aux', 'et', 'ou', 'mais', 'que', 'qui', 'ce',
    'cette', 'ces', 'il', 'elle', 'ils', 'elles', 'nous', 'vous',
    'je', 'tu', 'on', 'ne', 'pas', 'plus', 'aussi', 'très',
    'son', 'sa', 'ses', 'mon', 'ma', 'mes', 'leur', 'leurs',
    'se', 'si', 'comme', 'quand', 'où', 'comment', 'ici', 'là',
  ]),

  'Spanish': new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'es', 'son',
    'fue', 'fueron', 'ha', 'han', 'puede', 'pueden', 'debe', 'deben',
    'de', 'del', 'en', 'sobre', 'a', 'con', 'para', 'por', 'al',
    'y', 'o', 'pero', 'que', 'este', 'esta', 'estos', 'estas',
    'él', 'ella', 'ellos', 'ellas', 'nosotros', 'ustedes', 'yo',
    'tú', 'se', 'no', 'más', 'también', 'muy', 'su', 'sus',
    'mi', 'mis', 'tu', 'tus', 'como', 'cuando', 'donde', 'cómo',
    'aquí', 'allí', 'lo', 'le', 'les', 'me', 'nos',
  ]),
};

/**
 * StopWordValidator - Enforces stop word ratio < 30%.
 *
 * Framework rule: Content with >30% stop words has low information density.
 * Also computes a basic Information Density Score (IDS):
 *   IDS = (1 - stopWordRatio) * factDensity
 *   where factDensity = facts-per-100-words (estimated via entity/number count)
 */
export class StopWordValidator {
  static readonly MAX_STOP_WORD_RATIO = 0.30;

  /**
   * Get stop words for a language, with fallback to English.
   */
  private static getStopWords(language?: string): Set<string> {
    const langName = getLanguageName(language);
    return STOP_WORDS[langName] || STOP_WORDS['English'];
  }

  /**
   * Calculate stop word ratio for content.
   */
  static calculateStopWordRatio(content: string, language?: string): {
    ratio: number;
    stopWordCount: number;
    totalWords: number;
  } {
    const stopWords = this.getStopWords(language);
    const words = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/[#*_`~\[\]()]/g, ' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 0 && /[a-zA-Zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i.test(w));

    const totalWords = words.length;
    const stopWordCount = words.filter(w => stopWords.has(w)).length;
    const ratio = totalWords > 0 ? stopWordCount / totalWords : 0;

    return { ratio, stopWordCount, totalWords };
  }

  /**
   * Estimate facts-per-100-words by counting entities, numbers, and specific terms.
   */
  static estimateFactDensity(content: string): number {
    const words = content.split(/\s+/).length;
    if (words < 10) return 0;

    // Count factual indicators
    let factIndicators = 0;

    // Numbers and measurements
    const numbers = content.match(/\b\d+(?:\.\d+)?(?:\s*%|px|em|rem|KB|MB|GB|ms|s|kg|g|m|cm|mm)?\b/g);
    factIndicators += (numbers?.length || 0);

    // Proper nouns (capitalized words not at start of sentence)
    const properNouns = content.match(/(?<=[.!?]\s+\w+\s+)[A-Z][a-z]+/g);
    factIndicators += (properNouns?.length || 0) * 0.5;

    // Technical terms in code/quotes
    const codeTerms = content.match(/`[^`]+`/g);
    factIndicators += (codeTerms?.length || 0);

    return (factIndicators / words) * 100;
  }

  /**
   * Validate content for stop word ratio and information density.
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    const { ratio, stopWordCount, totalWords } = this.calculateStopWordRatio(content, context.language);

    if (totalWords < 20) return violations; // Need sufficient content

    if (ratio > this.MAX_STOP_WORD_RATIO) {
      violations.push({
        rule: 'STOP_WORD_RATIO',
        text: `${Math.round(ratio * 100)}% stop words (max: ${Math.round(this.MAX_STOP_WORD_RATIO * 100)}%)`,
        position: 0,
        suggestion: `Reduce stop word ratio from ${Math.round(ratio * 100)}% to below ${Math.round(this.MAX_STOP_WORD_RATIO * 100)}%. Replace filler with specific entities and attributes. ${stopWordCount} of ${totalWords} words are stop words.`,
        severity: 'warning',
      });
    }

    // Information Density Score
    const factDensity = this.estimateFactDensity(content);
    if (totalWords >= 100 && factDensity < 2) {
      violations.push({
        rule: 'INFO_DENSITY_LOW',
        text: `${factDensity.toFixed(1)} facts per 100 words`,
        position: 0,
        suggestion: 'Low information density. Add specific numbers, measurements, entity names, and concrete data points.',
        severity: 'warning',
      });
    }

    return violations;
  }
}
