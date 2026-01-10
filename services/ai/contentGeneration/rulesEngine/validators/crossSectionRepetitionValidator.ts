// services/ai/contentGeneration/rulesEngine/validators/crossSectionRepetitionValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';

/**
 * Multilingual transitional phrases that should be ignored when detecting repetition
 * Organized by language code
 */
const MULTILINGUAL_TRANSITIONS: Record<string, string[]> = {
  en: [
    'in addition', 'furthermore', 'moreover', 'however', 'therefore',
    'consequently', 'as a result', 'on the other hand', 'in contrast',
    'for example', 'for instance', 'in other words', 'in conclusion',
    'to summarize', 'first of all', 'second of all', 'last but not least',
    'in summary', 'to begin with', 'as mentioned', 'as stated', 'as noted',
    'it is important', 'it is worth', 'it should be', 'in this context',
    'at the same time', 'in the meantime', 'on top of that', 'as such',
  ],
  nl: [
    'daarnaast', 'bovendien', 'echter', 'daarom', 'derhalve', 'bijgevolg',
    'als gevolg', 'aan de andere kant', 'daarentegen', 'in tegenstelling',
    'bijvoorbeeld', 'met andere woorden', 'ter conclusie', 'samenvattend',
    'ten eerste', 'ten tweede', 'ten slotte', 'kortom', 'om te beginnen',
    'zoals vermeld', 'zoals gesteld', 'zoals opgemerkt', 'het is belangrijk',
    'het is de moeite waard', 'in dit opzicht', 'tegelijkertijd', 'inmiddels',
    'ook', 'tevens', 'eveneens', 'aldus', 'hierdoor', 'hiermee', 'daardoor',
    'met name', 'overigens', 'desalniettemin', 'niettemin', 'wel', 'immers',
  ],
  de: [
    'darüber hinaus', 'außerdem', 'ferner', 'jedoch', 'daher', 'deshalb',
    'folglich', 'infolgedessen', 'andererseits', 'im gegensatz', 'im kontrast',
    'zum beispiel', 'beispielsweise', 'mit anderen worten', 'zusammenfassend',
    'erstens', 'zweitens', 'schließlich', 'kurz gesagt', 'zunächst',
    'wie erwähnt', 'wie gesagt', 'wie bereits erwähnt', 'es ist wichtig',
    'es lohnt sich', 'in diesem zusammenhang', 'gleichzeitig', 'inzwischen',
    'ebenso', 'ebenfalls', 'zudem', 'somit', 'dadurch', 'hierbei', 'demzufolge',
    'insbesondere', 'übrigens', 'nichtsdestotrotz', 'dennoch', 'allerdings',
  ],
  fr: [
    'de plus', 'en outre', 'par ailleurs', 'cependant', 'toutefois', 'donc',
    'par conséquent', 'en conséquence', "d'autre part", 'en revanche', 'au contraire',
    'par exemple', 'en d\'autres termes', 'en conclusion', 'en résumé', 'pour résumer',
    'premièrement', 'deuxièmement', 'enfin', 'bref', 'pour commencer',
    'comme mentionné', 'comme indiqué', 'comme noté', 'il est important',
    "il convient de", 'dans ce contexte', 'en même temps', 'entre-temps',
    'également', 'ainsi', 'de ce fait', 'à cet égard', 'en ce qui concerne',
    'notamment', "d'ailleurs", 'néanmoins', 'pourtant', 'certes', 'or',
  ],
  es: [
    'además', 'asimismo', 'sin embargo', 'no obstante', 'por lo tanto',
    'por consiguiente', 'en consecuencia', 'por otro lado', 'en cambio',
    'por el contrario', 'por ejemplo', 'en otras palabras', 'en conclusión',
    'en resumen', 'para resumir', 'en primer lugar', 'en segundo lugar',
    'por último', 'finalmente', 'para empezar', 'como se mencionó',
    'como se indicó', 'es importante', 'vale la pena', 'en este sentido',
    'al mismo tiempo', 'mientras tanto', 'también', 'igualmente', 'así',
    'de este modo', 'al respecto', 'en cuanto a', 'a pesar de', 'aunque',
  ],
  it: [
    'inoltre', 'in aggiunta', 'tuttavia', 'pertanto', 'quindi', 'dunque',
    'di conseguenza', "d'altra parte", 'al contrario', 'invece', 'anzi',
    'per esempio', 'ad esempio', 'in altre parole', 'in conclusione',
    'in sintesi', 'riassumendo', 'in primo luogo', 'in secondo luogo',
    'infine', 'per finire', 'per cominciare', 'come menzionato',
    'come indicato', 'è importante', 'vale la pena', 'in questo contesto',
    'allo stesso tempo', 'nel frattempo', 'anche', 'altresì', 'così',
    'in tal modo', 'a questo proposito', 'per quanto riguarda', 'nonostante',
  ],
  pt: [
    'além disso', 'ademais', 'no entanto', 'contudo', 'portanto', 'assim',
    'por conseguinte', 'consequentemente', 'por outro lado', 'em contrapartida',
    'pelo contrário', 'por exemplo', 'em outras palavras', 'em conclusão',
    'em resumo', 'resumindo', 'em primeiro lugar', 'em segundo lugar',
    'por fim', 'finalmente', 'para começar', 'como mencionado',
    'como indicado', 'é importante', 'vale a pena', 'neste contexto',
    'ao mesmo tempo', 'entretanto', 'também', 'igualmente', 'dessa forma',
    'deste modo', 'a este respeito', 'no que diz respeito', 'apesar de',
  ],
  pl: [
    'ponadto', 'dodatkowo', 'poza tym', 'jednakże', 'jednak', 'dlatego',
    'w związku z tym', 'w rezultacie', 'z drugiej strony', 'w przeciwieństwie',
    'natomiast', 'na przykład', 'innymi słowy', 'podsumowując', 'reasumując',
    'po pierwsze', 'po drugie', 'na koniec', 'wreszcie', 'na początek',
    'jak wspomniano', 'jak wskazano', 'jak zauważono', 'ważne jest',
    'warto zauważyć', 'w tym kontekście', 'jednocześnie', 'w międzyczasie',
    'również', 'podobnie', 'tak więc', 'tym samym', 'w tym względzie',
    'co do', 'pomimo', 'chociaż', 'mimo że', 'niemniej jednak',
  ],
};

/**
 * Multilingual stop words to filter out when extracting significant phrases
 * Organized by language code
 */
const MULTILINGUAL_STOP_WORDS: Record<string, Set<string>> = {
  en: new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
    'he', 'she', 'him', 'her', 'his', 'we', 'us', 'our', 'you', 'your',
    'who', 'which', 'what', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
    'also', 'now', 'here', 'there', 'then', 'once', 'if', 'into', 'about',
    'after', 'before', 'above', 'below', 'between', 'under', 'over', 'any',
  ]),
  nl: new Set([
    'de', 'het', 'een', 'en', 'of', 'maar', 'in', 'op', 'aan', 'naar', 'voor',
    'van', 'met', 'door', 'uit', 'als', 'is', 'zijn', 'was', 'waren', 'ben',
    'bent', 'wordt', 'worden', 'werd', 'werden', 'hebben', 'heeft', 'had',
    'hadden', 'heb', 'hebt', 'zal', 'zullen', 'zou', 'zouden', 'kan', 'kunnen',
    'kon', 'konden', 'mag', 'mogen', 'mocht', 'mochten', 'moet', 'moeten',
    'dit', 'dat', 'deze', 'die', 'het', 'zij', 'ze', 'hun', 'haar', 'hem',
    'hij', 'wij', 'we', 'ons', 'onze', 'jij', 'je', 'jullie', 'u', 'uw',
    'wie', 'welke', 'wat', 'wanneer', 'waar', 'waarom', 'hoe', 'al', 'alle',
    'elk', 'elke', 'beide', 'weinig', 'meer', 'meest', 'ander', 'andere',
    'sommige', 'geen', 'niet', 'alleen', 'eigen', 'zo', 'dan', 'ook', 'zeer',
    'nu', 'hier', 'daar', 'toen', 'eens', 'indien', 'over', 'onder', 'tussen',
    'er', 'nog', 'wel', 'toch', 'dus', 'reeds', 'steeds', 'echter', 'immers',
  ]),
  de: new Set([
    'der', 'die', 'das', 'ein', 'eine', 'einer', 'eines', 'einem', 'einen',
    'und', 'oder', 'aber', 'in', 'im', 'auf', 'an', 'am', 'zu', 'zum', 'zur',
    'für', 'von', 'vom', 'mit', 'durch', 'aus', 'als', 'ist', 'sind', 'war',
    'waren', 'sein', 'bin', 'bist', 'wird', 'werden', 'wurde', 'wurden',
    'haben', 'hat', 'hatte', 'hatten', 'habe', 'hast', 'kann', 'können',
    'konnte', 'konnten', 'darf', 'dürfen', 'durfte', 'durften', 'muss',
    'müssen', 'musste', 'mussten', 'soll', 'sollen', 'sollte', 'sollten',
    'will', 'wollen', 'wollte', 'wollten', 'mag', 'mögen', 'mochte', 'möchte',
    'dies', 'diese', 'dieser', 'dieses', 'jene', 'jener', 'jenes', 'es',
    'sie', 'er', 'ihm', 'ihn', 'ihr', 'wir', 'uns', 'unser', 'du', 'dein',
    'wer', 'was', 'wann', 'wo', 'warum', 'wie', 'welche', 'welcher', 'welches',
    'alle', 'jede', 'jeder', 'beide', 'wenig', 'mehr', 'meist', 'andere',
    'einige', 'kein', 'keine', 'nicht', 'nur', 'eigen', 'gleich', 'so',
    'dann', 'auch', 'sehr', 'jetzt', 'hier', 'dort', 'da', 'wenn', 'über',
    'unter', 'zwischen', 'noch', 'schon', 'doch', 'also', 'dabei', 'damit',
  ]),
  fr: new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'dans', 'en',
    'sur', 'à', 'au', 'aux', 'pour', 'de', 'du', 'avec', 'par', 'comme',
    'est', 'sont', 'était', 'étaient', 'être', 'suis', 'es', 'sera', 'seront',
    'ont', 'a', 'avait', 'avaient', 'avoir', 'ai', 'as', 'aura', 'auront',
    'peut', 'peuvent', 'pouvait', 'pouvaient', 'doit', 'doivent', 'devait',
    'ce', 'cette', 'ces', 'cet', 'il', 'elle', 'ils', 'elles', 'lui', 'leur',
    'nous', 'vous', 'je', 'tu', 'on', 'se', 'qui', 'que', 'quoi', 'dont',
    'où', 'quand', 'comment', 'pourquoi', 'quel', 'quelle', 'quels', 'quelles',
    'tout', 'tous', 'toute', 'toutes', 'chaque', 'autre', 'autres', 'même',
    'aucun', 'aucune', 'pas', 'ne', 'plus', 'moins', 'très', 'aussi', 'bien',
    'si', 'non', 'oui', 'ici', 'là', 'alors', 'donc', 'car', 'parce', 'entre',
    'sans', 'sous', 'sur', 'avant', 'après', 'pendant', 'depuis', 'vers',
    'encore', 'déjà', 'jamais', 'toujours', 'souvent', 'parfois', 'peu',
  ]),
  es: new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero',
    'en', 'sobre', 'a', 'al', 'para', 'de', 'del', 'con', 'por', 'como',
    'es', 'son', 'era', 'eran', 'ser', 'estar', 'soy', 'eres', 'está', 'están',
    'fue', 'fueron', 'sido', 'siendo', 'han', 'ha', 'había', 'habían', 'haber',
    'he', 'has', 'puede', 'pueden', 'podía', 'podían', 'debe', 'deben', 'debía',
    'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel',
    'él', 'ella', 'ellos', 'ellas', 'le', 'les', 'lo', 'nos', 'nosotros',
    'vosotros', 'ustedes', 'yo', 'tú', 'se', 'quien', 'que', 'cual', 'cuyo',
    'donde', 'cuando', 'cómo', 'por qué', 'cuál', 'todo', 'todos', 'toda',
    'todas', 'cada', 'otro', 'otros', 'otra', 'otras', 'mismo', 'misma',
    'ningún', 'ninguno', 'no', 'ni', 'más', 'menos', 'muy', 'también', 'bien',
    'sí', 'aquí', 'ahí', 'allí', 'entonces', 'pues', 'porque', 'entre',
    'sin', 'bajo', 'ante', 'desde', 'hasta', 'hacia', 'según', 'durante',
    'aún', 'ya', 'nunca', 'siempre', 'solo', 'poco', 'mucho', 'tan', 'así',
  ]),
  it: new Set([
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'e', 'o', 'ma',
    'in', 'su', 'a', 'al', 'allo', 'alla', 'per', 'di', 'del', 'dello', 'della',
    'con', 'da', 'dal', 'dallo', 'dalla', 'come', 'è', 'sono', 'era', 'erano',
    'essere', 'sono', 'sei', 'siamo', 'siete', 'fu', 'furono', 'stato', 'stata',
    'hanno', 'ha', 'aveva', 'avevano', 'avere', 'ho', 'hai', 'abbiamo', 'avete',
    'può', 'possono', 'poteva', 'potevano', 'deve', 'devono', 'doveva',
    'questo', 'questa', 'questi', 'queste', 'quello', 'quella', 'quelli',
    'lui', 'lei', 'loro', 'esso', 'essa', 'essi', 'esse', 'noi', 'voi',
    'io', 'tu', 'si', 'chi', 'che', 'cui', 'quale', 'dove', 'quando', 'come',
    'perché', 'tutto', 'tutti', 'tutta', 'tutte', 'ogni', 'altro', 'altri',
    'altra', 'altre', 'stesso', 'stessa', 'nessun', 'nessuno', 'non', 'né',
    'più', 'meno', 'molto', 'anche', 'bene', 'sì', 'no', 'qui', 'qua', 'là',
    'allora', 'quindi', 'perché', 'tra', 'fra', 'senza', 'sotto', 'sopra',
    'prima', 'dopo', 'durante', 'fino', 'verso', 'ancora', 'già', 'mai',
    'sempre', 'solo', 'poco', 'tanto', 'così', 'proprio', 'proprio',
  ]),
  pt: new Set([
    'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'e', 'ou', 'mas',
    'em', 'no', 'na', 'nos', 'nas', 'sobre', 'para', 'de', 'do', 'da', 'dos',
    'das', 'com', 'por', 'pelo', 'pela', 'como', 'é', 'são', 'era', 'eram',
    'ser', 'estar', 'sou', 'és', 'está', 'estão', 'foi', 'foram', 'sido',
    'têm', 'tem', 'tinha', 'tinham', 'ter', 'tenho', 'tens', 'temos',
    'pode', 'podem', 'podia', 'podiam', 'deve', 'devem', 'devia', 'deviam',
    'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',
    'ele', 'ela', 'eles', 'elas', 'lhe', 'lhes', 'nós', 'vós', 'vocês',
    'eu', 'tu', 'se', 'quem', 'que', 'qual', 'cujo', 'onde', 'quando',
    'como', 'por que', 'porquê', 'todo', 'todos', 'toda', 'todas', 'cada',
    'outro', 'outros', 'outra', 'outras', 'mesmo', 'mesma', 'nenhum',
    'nenhuma', 'não', 'nem', 'mais', 'menos', 'muito', 'também', 'bem',
    'sim', 'aqui', 'aí', 'ali', 'então', 'pois', 'porque', 'entre', 'sem',
    'sob', 'ante', 'desde', 'até', 'após', 'durante', 'ainda', 'já',
    'nunca', 'sempre', 'só', 'pouco', 'tão', 'assim', 'próprio', 'própria',
  ]),
  pl: new Set([
    'i', 'a', 'oraz', 'lub', 'ale', 'w', 'we', 'na', 'do', 'od', 'z', 'ze',
    'dla', 'po', 'o', 'przy', 'przez', 'pod', 'nad', 'za', 'przed', 'między',
    'to', 'ten', 'ta', 'te', 'ci', 'tamten', 'tamta', 'tamto', 'on', 'ona',
    'ono', 'oni', 'one', 'go', 'jej', 'ich', 'mu', 'im', 'ją', 'je',
    'my', 'wy', 'ja', 'ty', 'się', 'sobie', 'siebie', 'kto', 'co', 'który',
    'która', 'które', 'gdzie', 'kiedy', 'jak', 'dlaczego', 'jaki', 'jaka',
    'jest', 'są', 'był', 'była', 'było', 'byli', 'były', 'być', 'jestem',
    'jesteś', 'będzie', 'będą', 'ma', 'mają', 'miał', 'miała', 'mieć',
    'może', 'mogą', 'mógł', 'mogła', 'musi', 'muszą', 'musiał', 'musiała',
    'wszystko', 'wszystkie', 'każdy', 'każda', 'każde', 'inny', 'inna',
    'inne', 'sam', 'sama', 'samo', 'żaden', 'żadna', 'żadne', 'nie', 'ani',
    'więcej', 'mniej', 'bardzo', 'też', 'także', 'również', 'dobrze', 'tak',
    'tutaj', 'tam', 'teraz', 'wtedy', 'potem', 'więc', 'bo', 'bez', 'jeszcze',
    'już', 'nigdy', 'zawsze', 'tylko', 'właśnie', 'jednak', 'nawet', 'gdyż',
  ]),
};

interface PhraseOccurrence {
  phrase: string;
  sectionIndex: number;
  position: number;
}

interface Section {
  heading: string;
  content: string;
  startPosition: number;
}

/**
 * Get transitions for a specific language, falling back to English
 */
function getTransitions(language?: string): string[] {
  const lang = (language || 'en').toLowerCase().substring(0, 2);
  return MULTILINGUAL_TRANSITIONS[lang] || MULTILINGUAL_TRANSITIONS.en;
}

/**
 * Get stop words for a specific language, falling back to English
 */
function getStopWords(language?: string): Set<string> {
  const lang = (language || 'en').toLowerCase().substring(0, 2);
  return MULTILINGUAL_STOP_WORDS[lang] || MULTILINGUAL_STOP_WORDS.en;
}

export class CrossSectionRepetitionValidator {
  /**
   * Validate content for cross-section repetition (Rule H9)
   * Flags phrases that appear in 2+ different sections
   */
  static validate(content: string, context?: SectionGenerationContext): ValidationViolation[] {
    if (!content || content.trim().length === 0) {
      return [];
    }

    const language = context?.language;
    const violations: ValidationViolation[] = [];
    const sections = this.splitIntoSections(content);

    // If there's only one section or no sections, nothing to compare
    if (sections.length < 2) {
      return [];
    }

    // Extract significant phrases from each section
    const phraseOccurrences = new Map<string, PhraseOccurrence[]>();
    const transitions = getTransitions(language);

    sections.forEach((section, sectionIndex) => {
      const phrases = this.extractSignificantPhrases(section.content, language);

      for (const phraseData of phrases) {
        const normalizedPhrase = phraseData.phrase.toLowerCase();

        // Skip common transitions
        if (this.isCommonTransition(normalizedPhrase, transitions)) {
          continue;
        }

        if (!phraseOccurrences.has(normalizedPhrase)) {
          phraseOccurrences.set(normalizedPhrase, []);
        }

        phraseOccurrences.get(normalizedPhrase)!.push({
          phrase: phraseData.phrase,
          sectionIndex,
          position: section.startPosition + phraseData.position,
        });
      }
    });

    // Find phrases that appear in multiple sections
    for (const [phrase, occurrences] of phraseOccurrences) {
      const uniqueSections = new Set<number>(occurrences.map(o => o.sectionIndex));

      if (uniqueSections.size >= 2) {
        // Report the first occurrence after the first section
        const firstOccurrence = occurrences[0];
        const sectionNumbers = Array.from(uniqueSections)
          .map((i: number) => i + 1)
          .sort((a: number, b: number) => a - b);

        violations.push({
          rule: 'H9_CROSS_SECTION_REPETITION',
          text: firstOccurrence.phrase,
          position: firstOccurrence.position,
          suggestion: `Phrase "${firstOccurrence.phrase}" appears in sections ${sectionNumbers.join(', ')}. Consider rephrasing to avoid redundancy and improve information diversity.`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  /**
   * Split content into sections based on H2 and H3 headings
   */
  private static splitIntoSections(content: string): Section[] {
    const sections: Section[] = [];
    // Match ## or ### headings in markdown
    const headingRegex = /^#{2,3}\s+.+$/gm;

    const matches = [...content.matchAll(headingRegex)];

    if (matches.length === 0) {
      // No headings found, treat entire content as one section
      return [{ heading: '', content, startPosition: 0 }];
    }

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const heading = match[0];
      const startPos = match.index!;
      const contentStart = startPos + heading.length;

      // Find where this section ends (next heading or end of content)
      const endPos = i < matches.length - 1
        ? matches[i + 1].index!
        : content.length;

      const sectionContent = content.slice(contentStart, endPos).trim();

      sections.push({
        heading,
        content: sectionContent,
        startPosition: startPos,
      });
    }

    return sections;
  }

  /**
   * Extract significant phrases (3-5 word n-grams) from text
   * Filters out phrases that are mostly stop words
   * Uses Unicode-aware word extraction for multilingual support
   */
  static extractSignificantPhrases(text: string, language?: string): { phrase: string; position: number }[] {
    const phrases: { phrase: string; position: number }[] = [];
    const stopWords = getStopWords(language);

    // Unicode-aware word extraction: letters and numbers from any language
    const wordMatches = [...text.matchAll(/[\p{L}\p{N}]+/gu)];
    const words: { word: string; index: number }[] = wordMatches.map(m => ({
      word: m[0],
      index: m.index!,
    }));

    if (words.length === 0) {
      return phrases;
    }

    // Extract n-grams of sizes 3, 4, and 5
    for (let n = 3; n <= 5; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        const phraseWords = words.slice(i, i + n);
        const phraseText = phraseWords.map(pw => pw.word).join(' ');

        // Count significant (non-stop) words
        const significantWordCount = phraseWords.filter(
          pw => !stopWords.has(pw.word.toLowerCase())
        ).length;

        // Require at least 2 significant words in the phrase
        if (significantWordCount >= 2) {
          phrases.push({
            phrase: phraseText.toLowerCase(),
            position: phraseWords[0].index,
          });
        }
      }
    }

    return phrases;
  }

  /**
   * Check if a phrase is a common transitional phrase
   */
  private static isCommonTransition(phrase: string, transitions: string[]): boolean {
    const normalizedPhrase = phrase.toLowerCase().trim();

    return transitions.some(transition => {
      // Check if phrase starts with or equals the transition
      return normalizedPhrase.startsWith(transition) ||
        normalizedPhrase === transition ||
        transition.startsWith(normalizedPhrase);
    });
  }
}
