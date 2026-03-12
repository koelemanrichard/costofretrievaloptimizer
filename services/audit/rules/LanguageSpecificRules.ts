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
// Filler word definitions per language
// ---------------------------------------------------------------------------

interface FillerEntry {
  filler: string;
  suggestion: string;
}

const DUTCH_FILLERS: FillerEntry[] = [
  { filler: 'eigenlijk', suggestion: 'Remove or replace with a concrete statement' },
  { filler: 'gewoon', suggestion: 'Remove — adds no meaning' },
  { filler: 'wellicht', suggestion: 'Replace with "mogelijk" or commit to a definite statement' },
  { filler: 'sowieso', suggestion: 'Remove or replace with "hoe dan ook"' },
  { filler: 'natuurlijk', suggestion: 'Remove — if it is obvious, no need to state it' },
  { filler: 'uiteraard', suggestion: 'Remove — if it is obvious, no need to state it' },
  { filler: 'over het algemeen', suggestion: 'Be specific: state the actual scope or frequency' },
  { filler: 'in principe', suggestion: 'Remove or state the principle explicitly' },
  { filler: 'als het ware', suggestion: 'Remove — use a direct comparison instead' },
  { filler: 'zeg maar', suggestion: 'Remove — too informal for written content' },
  { filler: 'op dit moment', suggestion: 'Replace with a specific date or timeframe' },
  { filler: 'heden ten dage', suggestion: 'Replace with a specific date or timeframe' },
  { filler: 'niet onbelangrijk', suggestion: 'Replace with "belangrijk" (avoid double negation)' },
  { filler: 'het moge duidelijk zijn', suggestion: 'Remove — just state the point directly' },
  { filler: 'het spreekt voor zich', suggestion: 'Remove — just state the point directly' },
];

const GERMAN_FILLERS: FillerEntry[] = [
  { filler: 'eigentlich', suggestion: 'Remove or replace with a concrete statement' },
  { filler: 'grundsätzlich', suggestion: 'Remove or state the principle explicitly' },
  { filler: 'sozusagen', suggestion: 'Remove — use a direct comparison instead' },
  { filler: 'gewissermaßen', suggestion: 'Remove — be precise instead of hedging' },
  { filler: 'im Grunde genommen', suggestion: 'Remove or state the core point directly' },
  { filler: 'an und für sich', suggestion: 'Remove — adds no meaning' },
  { filler: 'im Endeffekt', suggestion: 'Replace with "letztendlich" or state the result directly' },
  { filler: 'natürlich', suggestion: 'Remove — if it is obvious, no need to state it' },
  { filler: 'selbstverständlich', suggestion: 'Remove — if it is obvious, no need to state it' },
  { filler: 'im Prinzip', suggestion: 'Remove or state the principle explicitly' },
  { filler: 'quasi', suggestion: 'Remove — use a direct comparison instead' },
  { filler: 'halt', suggestion: 'Remove — too informal for written content' },
  { filler: 'eben', suggestion: 'Remove — too informal for written content' },
];

// ---------------------------------------------------------------------------
// Address form definitions
// ---------------------------------------------------------------------------

const DUTCH_FORMAL_ADDRESS = ['u', 'uw'];
const DUTCH_INFORMAL_ADDRESS = ['je', 'jij', 'jouw', 'jullie'];

const GERMAN_INFORMAL_ADDRESS = ['du', 'dein', 'deine', 'deinem', 'deinen', 'deiner', 'dir', 'dich'];

// ---------------------------------------------------------------------------
// V2 verb forms for word-order checking
// ---------------------------------------------------------------------------

const DUTCH_VERB_FORMS = new Set<string>([
  'is', 'zijn', 'was', 'waren', 'heeft', 'hebben', 'wordt', 'worden',
  'kan', 'kunnen', 'moet', 'moeten', 'mag', 'mogen', 'weegt', 'kost',
  'duurt', 'bevat', 'biedt', 'vereist', 'levert', 'werkt',
]);

const GERMAN_VERB_FORMS = new Set<string>([
  'ist', 'sind', 'war', 'waren', 'hat', 'haben', 'wird', 'werden',
  'kann', 'können', 'muss', 'müssen', 'kostet', 'wiegt', 'dauert',
  'enthält', 'bietet', 'erfordert', 'liefert', 'funktioniert',
]);

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

/**
 * Detect filler words/phrases in text using word-boundary-aware regex.
 */
function detectFillers(
  text: string,
  fillers: FillerEntry[],
  languageCode: string,
): LanguageRuleIssue[] {
  const issues: LanguageRuleIssue[] = [];

  for (const entry of fillers) {
    // Use word boundaries; case-insensitive
    const regex = new RegExp(`\\b${entry.filler.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    if (regex.test(text)) {
      issues.push({
        ruleId: `FILLER_${languageCode.toUpperCase()}`,
        severity: 'low',
        title: `Filler detected (${languageCode.toUpperCase()})`,
        description: `"${entry.filler}" is a filler expression. ${entry.suggestion}.`,
        affectedElement: entry.filler,
        exampleFix: entry.suggestion,
      });
    }
  }

  return issues;
}

/**
 * Detect mixing of formal and informal address forms within the same text.
 * Dutch: u/uw (formal) vs je/jij/jouw/jullie (informal)
 * German: Sie (capital, formal) vs du/dein/deine/deinem/deinen/deiner/dir/dich (informal)
 */
function detectAddressMixing(
  text: string,
  language: SupportedLanguage,
): LanguageRuleIssue[] {
  if (language === 'nl') {
    const hasFormal = DUTCH_FORMAL_ADDRESS.some(w =>
      new RegExp(`\\b${w}\\b`, 'i').test(text),
    );
    const hasInformal = DUTCH_INFORMAL_ADDRESS.some(w =>
      new RegExp(`\\b${w}\\b`, 'i').test(text),
    );
    if (hasFormal && hasInformal) {
      return [{
        ruleId: 'ADDRESS_MIX_NL',
        severity: 'high',
        title: 'Mixed formal/informal address (Dutch)',
        description: 'Text mixes formal (u/uw) and informal (je/jij/jouw/jullie) address forms. Choose one consistently.',
        affectedElement: 'u/uw + je/jij/jouw/jullie',
        exampleFix: 'Use either formal (u/uw) or informal (je/jij/jouw/jullie) throughout.',
      }];
    }
  }

  if (language === 'de') {
    // Sie (formal) must be case-sensitive — capital S
    const hasFormal = /\bSie\b/.test(text);
    const hasInformal = GERMAN_INFORMAL_ADDRESS.some(w =>
      new RegExp(`\\b${w}\\b`, 'i').test(text),
    );
    if (hasFormal && hasInformal) {
      return [{
        ruleId: 'ADDRESS_MIX_DE',
        severity: 'high',
        title: 'Mixed formal/informal address (German)',
        description: 'Text mixes formal (Sie) and informal (du/dein/dir/dich) address forms. Choose one consistently.',
        affectedElement: 'Sie + du/dein/dir/dich',
        exampleFix: 'Use either formal (Sie/Ihr) or informal (du/dein) throughout.',
      }];
    }
  }

  return [];
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
        return [
          ...detectCompoundSplits(text, GERMAN_COMPOUND_PATTERNS, 'German'),
          ...detectFillers(text, GERMAN_FILLERS, 'de'),
          ...detectAddressMixing(text, 'de'),
        ];
      case 'nl':
        return [
          ...detectCompoundSplits(text, DUTCH_COMPOUND_PATTERNS, 'Dutch'),
          ...detectFillers(text, DUTCH_FILLERS, 'nl'),
          ...detectAddressMixing(text, 'nl'),
        ];
      case 'en':
      case 'fr':
      case 'es':
        return [];
      default:
        return [];
    }
  }

  /**
   * Validate a single EAV sentence for V2 word-order violations.
   *
   * In Dutch and German main clauses the finite verb must appear in the
   * second position (V2 rule). A common SEO-writing error is placing the
   * verb at the end of the sentence (SOV), which reads as a subordinate
   * clause. This method flags sentences where the last word is a known
   * finite verb form.
   *
   * Only applies for 'nl' and 'de'; returns empty array for other languages.
   */
  validateEavSentence(sentence: string, language: SupportedLanguage): LanguageRuleIssue[] {
    if (language !== 'nl' && language !== 'de') {
      return [];
    }

    // Strip trailing punctuation, then split into words
    const stripped = sentence.replace(/[.!?;:,]+$/, '').trim();
    const words = stripped.split(/\s+/).filter(w => w.length > 0);

    if (words.length < 4) {
      return [];
    }

    const lastWord = words[words.length - 1].toLowerCase();
    const verbForms = language === 'nl' ? DUTCH_VERB_FORMS : GERMAN_VERB_FORMS;

    if (verbForms.has(lastWord)) {
      const ruleId = language === 'nl' ? 'V2_WORD_ORDER_NL' : 'V2_WORD_ORDER_DE';
      const langLabel = language === 'nl' ? 'Dutch' : 'German';
      return [{
        ruleId,
        severity: 'medium',
        title: `Possible V2 word-order violation (${langLabel})`,
        description: `The sentence appears to end with the finite verb "${lastWord}". In ${langLabel} main clauses the verb should be in second position.`,
        affectedElement: sentence,
        exampleFix: `Move "${lastWord}" to the second position in the sentence.`,
      }];
    }

    return [];
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
