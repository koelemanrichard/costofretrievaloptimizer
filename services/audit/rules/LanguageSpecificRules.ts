// services/audit/rules/LanguageSpecificRules.ts
// Language-specific audit checks for EN, NL, DE, FR, ES
// Provides stop words, compound word detection, and linguistic rule validation

export type SupportedLanguage = 'en' | 'nl' | 'de' | 'fr' | 'es';

export interface LanguageRuleIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

// ---------------------------------------------------------------------------
// Stop word sets per language (20-30 common function words each)
// ---------------------------------------------------------------------------

const ENGLISH_STOP_WORDS = new Set<string>([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'and', 'or', 'but', 'not', 'if',
  'this', 'that', 'it', 'as',
]);

const GERMAN_STOP_WORDS = new Set<string>([
  'der', 'die', 'das', 'ein', 'eine', 'ist', 'sind', 'war', 'waren',
  'hat', 'haben', 'wird', 'werden', 'kann', 'können', 'und', 'oder',
  'aber', 'nicht', 'von', 'zu', 'in', 'mit', 'auf', 'für', 'an',
  'nach', 'über', 'auch', 'als',
]);

const DUTCH_STOP_WORDS = new Set<string>([
  'de', 'het', 'een', 'is', 'zijn', 'was', 'waren', 'heeft', 'hebben',
  'wordt', 'worden', 'kan', 'kunnen', 'en', 'of', 'maar', 'niet', 'van',
  'te', 'in', 'met', 'op', 'voor', 'aan', 'naar', 'ook', 'als', 'er',
  'nog', 'wel',
]);

const FRENCH_STOP_WORDS = new Set<string>([
  'le', 'la', 'les', 'un', 'une', 'des', 'est', 'sont', 'a', 'ont',
  'et', 'ou', 'mais', 'pas', 'ne', 'de', 'du', 'en', 'dans', 'pour',
  'avec', 'sur', 'par', 'ce', 'cette', 'qui', 'que', 'il', 'elle',
]);

const SPANISH_STOP_WORDS = new Set<string>([
  'el', 'la', 'los', 'las', 'un', 'una', 'es', 'son', 'y', 'o',
  'pero', 'no', 'de', 'del', 'en', 'para', 'con', 'por', 'que', 'se',
  'su', 'al', 'como', 'más', 'este', 'esta',
]);

const STOP_WORDS_MAP: Record<SupportedLanguage, Set<string>> = {
  en: ENGLISH_STOP_WORDS,
  de: GERMAN_STOP_WORDS,
  nl: DUTCH_STOP_WORDS,
  fr: FRENCH_STOP_WORDS,
  es: SPANISH_STOP_WORDS,
};

// ---------------------------------------------------------------------------
// German compound word detection
// ---------------------------------------------------------------------------

/**
 * Common German compound word patterns.
 * Each entry maps a space-separated (incorrect) form to the proper compound.
 */
const GERMAN_COMPOUND_PATTERNS: Array<{ parts: string[]; compound: string }> = [
  { parts: ['suchmaschinen', 'optimierung'], compound: 'Suchmaschinenoptimierung' },
  { parts: ['suchmaschinen', 'marketing'], compound: 'Suchmaschinenmarketing' },
  { parts: ['inhalts', 'verzeichnis'], compound: 'Inhaltsverzeichnis' },
  { parts: ['schlüssel', 'wort'], compound: 'Schlüsselwort' },
  { parts: ['web', 'seite'], compound: 'Webseite' },
  { parts: ['ziel', 'gruppe'], compound: 'Zielgruppe' },
  { parts: ['lande', 'seite'], compound: 'Landeseite' },
  { parts: ['start', 'seite'], compound: 'Startseite' },
  { parts: ['link', 'aufbau'], compound: 'Linkaufbau' },
  { parts: ['wett', 'bewerber'], compound: 'Wettbewerber' },
  { parts: ['rang', 'liste'], compound: 'Rangliste' },
  { parts: ['inhalts', 'marketing'], compound: 'Inhaltsmarketing' },
  { parts: ['nutzer', 'erfahrung'], compound: 'Nutzererfahrung' },
  { parts: ['seiten', 'geschwindigkeit'], compound: 'Seitengeschwindigkeit' },
];

// ---------------------------------------------------------------------------
// Dutch compound word detection
// ---------------------------------------------------------------------------

/**
 * Common Dutch compound word patterns.
 * Each entry maps a space-separated (incorrect) form to the proper compound.
 */
const DUTCH_COMPOUND_PATTERNS: Array<{ parts: string[]; compound: string }> = [
  { parts: ['zoekmachine', 'optimalisatie'], compound: 'zoekmachineoptimalisatie' },
  { parts: ['zoekmachine', 'marketing'], compound: 'zoekmachinemarketing' },
  { parts: ['inhouds', 'opgave'], compound: 'inhoudsopgave' },
  { parts: ['sleutel', 'woord'], compound: 'sleutelwoord' },
  { parts: ['web', 'pagina'], compound: 'webpagina' },
  { parts: ['doel', 'groep'], compound: 'doelgroep' },
  { parts: ['land', 'pagina'], compound: 'landingspagina' },
  { parts: ['start', 'pagina'], compound: 'startpagina' },
  { parts: ['link', 'opbouw'], compound: 'linkopbouw' },
  { parts: ['gebruikers', 'ervaring'], compound: 'gebruikerservaring' },
  { parts: ['pagina', 'snelheid'], compound: 'paginasnelheid' },
  { parts: ['zoek', 'resultaten'], compound: 'zoekresultaten' },
];

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Tokenize text into lowercase words, stripping punctuation.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,;:!?'"()\[\]{}<>\/\\@#$%^&*+=~`|]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

/**
 * Check for compound word splits in text using a pattern list.
 */
function detectCompoundSplits(
  text: string,
  patterns: Array<{ parts: string[]; compound: string }>,
  languageLabel: string,
): LanguageRuleIssue[] {
  const issues: LanguageRuleIssue[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of patterns) {
    const splitForm = pattern.parts.join(' ');
    if (lowerText.includes(splitForm)) {
      issues.push({
        ruleId: `COMPOUND_SPLIT_${languageLabel.toUpperCase()}`,
        severity: 'medium',
        title: `${languageLabel} compound word split`,
        description: `"${splitForm}" should be written as a single compound word "${pattern.compound}".`,
        affectedElement: splitForm,
        exampleFix: pattern.compound,
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Main class
// ---------------------------------------------------------------------------

export class LanguageSpecificRules {
  /**
   * Get the set of stop words for a given language.
   * Falls back to English stop words for unrecognized language codes.
   */
  getStopWords(language: SupportedLanguage): Set<string> {
    return STOP_WORDS_MAP[language] ?? ENGLISH_STOP_WORDS;
  }

  /**
   * Run language-specific validation checks on text.
   *
   * Currently implements:
   * - German: compound word split detection
   * - Dutch: compound word split detection
   * - English / French / Spanish: returns empty (future enhancement)
   */
  validate(text: string, language: SupportedLanguage): LanguageRuleIssue[] {
    switch (language) {
      case 'de':
        return detectCompoundSplits(text, GERMAN_COMPOUND_PATTERNS, 'German');
      case 'nl':
        return detectCompoundSplits(text, DUTCH_COMPOUND_PATTERNS, 'Dutch');
      case 'en':
      case 'fr':
      case 'es':
        return [];
      default:
        return [];
    }
  }

  /**
   * Extract significant (non-stop) words from text, filtering by the
   * language-appropriate stop word list.
   */
  getSignificantWords(text: string, language: SupportedLanguage): Set<string> {
    const stopWords = this.getStopWords(language);
    const words = tokenize(text);
    const significant = new Set<string>();

    for (const word of words) {
      if (!stopWords.has(word)) {
        significant.add(word);
      }
    }

    return significant;
  }
}
