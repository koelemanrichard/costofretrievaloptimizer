// services/ai/contentGeneration/rulesEngine/validators/prohibitedLanguage.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { getLanguageName } from '../../../../../utils/languageUtils';
import { splitSentences } from '../../../../../utils/sentenceTokenizer';

/**
 * Multilingual patterns for prohibited language detection
 * Supports: English, Dutch, German, French, Spanish
 */
interface LanguagePatterns {
  STOP_WORDS: string[];
  OPINIONS: RegExp[];
  ANALOGIES: RegExp[];
  PASSIVE_VOICE: RegExp[];
  FUTURE_FOR_FACTS: RegExp[];
  AMBIGUOUS_PRONOUNS: RegExp[];
  FLUFF_OPENERS: RegExp[];
  /** LLM-typical phrases that reveal AI authorship (Expression Identity) */
  EXPRESSION_IDENTITY: RegExp[];
  /** Words that indicate weak semantic connections ("also" ban) */
  WEAK_CONNECTORS: string[];
}

const MULTILINGUAL_PATTERNS: Record<string, LanguagePatterns> = {
  'English': {
    STOP_WORDS: [
      'also', 'basically', 'actually', 'very', 'really',
      'just', 'quite', 'anyway', 'maybe', 'perhaps',
      'certainly', 'definitely', 'obviously', 'simply',
    ],
    OPINIONS: [
      /\b(I think|we think|I believe|we believe|in my opinion|in our opinion)\b/gi,
      /\b(unfortunately|fortunately|hopefully|ideally|interestingly)\b/gi,
      /\b(beautiful|amazing|wonderful|terrible|horrible|awesome|fantastic)\b/gi,
    ],
    ANALOGIES: [
      /\b(like a|similar to|is like|as if|imagine|think of it as)\b/gi,
      /\b(metaphor|analogy|compared to a|just like)\b/gi,
    ],
    PASSIVE_VOICE: [
      /\b(is|are|was|were|been|being)\s+(being\s+)?\w+ed\b/gi,
    ],
    FUTURE_FOR_FACTS: [
      /\bwill (always|never|typically|usually|generally)\b/gi,
    ],
    AMBIGUOUS_PRONOUNS: [
      /^(It|They|This|That|These|Those)\s+(is|are|was|were|said|mentioned|noted)\b/gi,
    ],
    FLUFF_OPENERS: [
      /^(In this (article|guide|post|section)|Let's (dive|explore|look|discuss)|Have you ever wondered)/i,
      /^(Welcome to|Today we|We will|We're going to)/i,
    ],
    EXPRESSION_IDENTITY: [
      /\b(it's important to note|it is important to note|it's worth noting|it is worth noting)\b/gi,
      /\b(delve into|delve deeper|delving into)\b/gi,
      /\b(in the realm of|in the world of|in the landscape of)\b/gi,
      /\b(navigate the (landscape|complexities|challenges|world))\b/gi,
      /\b(tapestry of|myriad of|plethora of|multifaceted)\b/gi,
      /\b(it's crucial to|it is crucial to|it's essential to|it is essential to)\b/gi,
      /\b(at the end of the day|when it comes to|in terms of)\b/gi,
      /\b(shed light on|pave the way|game changer|cutting edge|cutting-edge)\b/gi,
      /\b(leverag(e|ing)|synergy|synergies|paradigm shift|holistic approach)\b/gi,
      /\b(unlock(ing)? the (power|potential|secrets)|harness(ing)? the power)\b/gi,
      /\b(dive deep|deep dive|take a closer look|closer look at)\b/gi,
      /\b(the bottom line is|at its core|when all is said and done)\b/gi,
      /\b(stands? as a testament|serves? as a reminder)\b/gi,
      /\b(in today's (digital|modern|fast-paced|ever-changing))\b/gi,
      /\b(embark on a journey|on this journey|transformative)\b/gi,
    ],
    WEAK_CONNECTORS: ['also', 'additionally', 'furthermore', 'moreover'],
  },

  'Dutch': {
    STOP_WORDS: [
      'ook', 'eigenlijk', 'echt', 'zeer', 'erg',
      'gewoon', 'best', 'nogal', 'sowieso', 'misschien',
      'natuurlijk', 'uiteraard', 'wellicht', 'simpelweg',
      'zeker', 'absoluut', 'duidelijk', 'overigens',
    ],
    OPINIONS: [
      /\b(ik denk|wij denken|ik geloof|wij geloven|naar mijn mening|volgens mij|naar onze mening)\b/gi,
      /\b(helaas|gelukkig|hopelijk|idealiter|interessant genoeg)\b/gi,
      /\b(mooi|geweldig|prachtig|verschrikkelijk|vreselijk|fantastisch|schitterend)\b/gi,
    ],
    ANALOGIES: [
      /\b(zoals een|vergelijkbaar met|is als|alsof|stel je voor|denk eraan als)\b/gi,
      /\b(metafoor|analogie|vergeleken met een|net als|net zoals)\b/gi,
    ],
    PASSIVE_VOICE: [
      /\b(wordt|worden|werd|werden|is|zijn|was|waren)\s+(ge\w+d|ge\w+en|ge\w+t)\b/gi,
    ],
    FUTURE_FOR_FACTS: [
      /\bzal (altijd|nooit|doorgaans|meestal|over het algemeen)\b/gi,
      /\bzullen (altijd|nooit|doorgaans|meestal|over het algemeen)\b/gi,
    ],
    AMBIGUOUS_PRONOUNS: [
      /^(Het|Ze|Dit|Dat|Deze|Die)\s+(is|zijn|was|waren|zei|vermeldde|noteerde)\b/gi,
    ],
    FLUFF_OPENERS: [
      /^(In dit (artikel|gids|bericht|sectie)|Laten we (duiken|verkennen|kijken|bespreken)|Heb je je ooit afgevraagd)/i,
      /^(Welkom bij|Vandaag gaan we|We zullen|We gaan)\b/i,
    ],
    EXPRESSION_IDENTITY: [
      /\b(het is belangrijk om op te merken|het is vermeldenswaard)\b/gi,
      /\b(duiken in|dieper duiken|verdiepen in)\b/gi,
      /\b(in het landschap van|in de wereld van)\b/gi,
      /\b(het navigeren door de (complexiteit|uitdagingen))\b/gi,
      /\b(een veelheid aan|een overvloed aan|veelzijdig)\b/gi,
      /\b(het is cruciaal om|het is essentieel om)\b/gi,
      /\b(uiteindelijk|als het aankomt op|in termen van)\b/gi,
      /\b(licht werpen op|de weg vrijmaken|baanbrekend)\b/gi,
    ],
    WEAK_CONNECTORS: ['ook', 'daarnaast', 'bovendien', 'tevens'],
  },

  'German': {
    STOP_WORDS: [
      'auch', 'eigentlich', 'wirklich', 'sehr', 'echt',
      'einfach', 'ziemlich', 'jedenfalls', 'vielleicht', 'eventuell',
      'natürlich', 'selbstverständlich', 'möglicherweise', 'schlicht',
      'sicher', 'absolut', 'offensichtlich', 'übrigens',
    ],
    OPINIONS: [
      /\b(ich denke|wir denken|ich glaube|wir glauben|meiner Meinung nach|unserer Meinung nach)\b/gi,
      /\b(leider|glücklicherweise|hoffentlich|idealerweise|interessanterweise)\b/gi,
      /\b(schön|großartig|wunderbar|schrecklich|furchtbar|fantastisch|herrlich)\b/gi,
    ],
    ANALOGIES: [
      /\b(wie ein|ähnlich wie|ist wie|als ob|stell dir vor|denk daran als)\b/gi,
      /\b(Metapher|Analogie|verglichen mit einem|genau wie|genauso wie)\b/gi,
    ],
    PASSIVE_VOICE: [
      /\b(wird|werden|wurde|wurden|ist|sind|war|waren)\s+(ge\w+t|ge\w+en)\b/gi,
    ],
    FUTURE_FOR_FACTS: [
      /\bwird (immer|nie|typischerweise|normalerweise|im Allgemeinen)\b/gi,
      /\bwerden (immer|nie|typischerweise|normalerweise|im Allgemeinen)\b/gi,
    ],
    AMBIGUOUS_PRONOUNS: [
      /^(Es|Sie|Dies|Das|Diese|Jene)\s+(ist|sind|war|waren|sagte|erwähnte|notierte)\b/gi,
    ],
    FLUFF_OPENERS: [
      /^(In diesem (Artikel|Leitfaden|Beitrag|Abschnitt)|Lassen Sie uns (eintauchen|erkunden|schauen|besprechen)|Haben Sie sich jemals gefragt)/i,
      /^(Willkommen bei|Heute werden wir|Wir werden|Wir werden)\b/i,
    ],
    EXPRESSION_IDENTITY: [
      /\b(es ist wichtig zu beachten|es ist erwähnenswert)\b/gi,
      /\b(tiefer eintauchen|eintauchen in|vertiefen in)\b/gi,
      /\b(in der Landschaft von|in der Welt von)\b/gi,
      /\b(die (Komplexität|Herausforderungen) navigieren)\b/gi,
      /\b(eine Vielzahl von|eine Fülle von|vielschichtig)\b/gi,
      /\b(es ist entscheidend|es ist wesentlich)\b/gi,
      /\b(letztendlich|wenn es darum geht|in Bezug auf)\b/gi,
      /\b(Licht werfen auf|den Weg ebnen|bahnbrechend)\b/gi,
    ],
    WEAK_CONNECTORS: ['auch', 'darüber hinaus', 'außerdem', 'zudem'],
  },

  'French': {
    STOP_WORDS: [
      'aussi', 'fondamentalement', 'en fait', 'très', 'vraiment',
      'juste', 'assez', 'de toute façon', 'peut-être', 'éventuellement',
      'certainement', 'définitivement', 'évidemment', 'simplement',
      'bien sûr', 'absolument', 'clairement', 'd\'ailleurs',
    ],
    OPINIONS: [
      /\b(je pense|nous pensons|je crois|nous croyons|à mon avis|selon moi|à notre avis)\b/gi,
      /\b(malheureusement|heureusement|espérons|idéalement|curieusement)\b/gi,
      /\b(beau|magnifique|merveilleux|terrible|horrible|fantastique|superbe)\b/gi,
    ],
    ANALOGIES: [
      /\b(comme un|similaire à|est comme|comme si|imaginez|pensez-y comme)\b/gi,
      /\b(métaphore|analogie|comparé à un|tout comme|exactement comme)\b/gi,
    ],
    PASSIVE_VOICE: [
      /\b(est|sont|était|étaient|a été|ont été)\s+(\w+é|é\w+)\b/gi,
    ],
    FUTURE_FOR_FACTS: [
      /\b(sera|seront) (toujours|jamais|typiquement|habituellement|généralement)\b/gi,
    ],
    AMBIGUOUS_PRONOUNS: [
      /^(Il|Elle|Cela|Ce|Ces|Ceux)\s+(est|sont|était|étaient|a dit|a mentionné)\b/gi,
    ],
    FLUFF_OPENERS: [
      /^(Dans cet? (article|guide|publication|section)|Plongeons|Explorons|Regardons|Discutons|Vous êtes-vous jamais demandé)/i,
      /^(Bienvenue|Aujourd'hui nous|Nous allons|Nous allons)\b/i,
    ],
    EXPRESSION_IDENTITY: [
      /\b(il est important de noter|il convient de noter)\b/gi,
      /\b(plonger dans|approfondir|se pencher sur)\b/gi,
      /\b(dans le paysage de|dans le monde de)\b/gi,
      /\b(naviguer dans (la complexité|les défis))\b/gi,
      /\b(une multitude de|une pléthore de|multifacette)\b/gi,
      /\b(il est crucial de|il est essentiel de)\b/gi,
      /\b(en fin de compte|quand il s'agit de|en termes de)\b/gi,
      /\b(mettre en lumière|ouvrir la voie|révolutionnaire)\b/gi,
    ],
    WEAK_CONNECTORS: ['aussi', 'de plus', 'en outre', 'par ailleurs'],
  },

  'Spanish': {
    STOP_WORDS: [
      'también', 'básicamente', 'en realidad', 'muy', 'realmente',
      'solo', 'bastante', 'de todos modos', 'quizás', 'tal vez',
      'ciertamente', 'definitivamente', 'obviamente', 'simplemente',
      'por supuesto', 'absolutamente', 'claramente', 'además',
    ],
    OPINIONS: [
      /\b(yo creo|nosotros creemos|yo pienso|nosotros pensamos|en mi opinión|según yo|en nuestra opinión)\b/gi,
      /\b(desafortunadamente|afortunadamente|ojalá|idealmente|curiosamente)\b/gi,
      /\b(bonito|increíble|maravilloso|terrible|horrible|fantástico|espléndido)\b/gi,
    ],
    ANALOGIES: [
      /\b(como un|similar a|es como|como si|imagina|piénsalo como)\b/gi,
      /\b(metáfora|analogía|comparado con un|igual que|exactamente como)\b/gi,
    ],
    PASSIVE_VOICE: [
      /\b(es|son|fue|fueron|ha sido|han sido)\s+(\w+ado|ido\w*)\b/gi,
    ],
    FUTURE_FOR_FACTS: [
      /\b(será|serán) (siempre|nunca|típicamente|usualmente|generalmente)\b/gi,
    ],
    AMBIGUOUS_PRONOUNS: [
      /^(Esto|Eso|Estos|Esas|Ellos|Ellas)\s+(es|son|fue|fueron|dijo|mencionó)\b/gi,
    ],
    FLUFF_OPENERS: [
      /^(En est[ea] (artículo|guía|publicación|sección)|Vamos a (sumergirnos|explorar|ver|discutir)|¿Alguna vez te has preguntado)/i,
      /^(Bienvenido a|Hoy vamos|Vamos a|Iremos a)\b/i,
    ],
    EXPRESSION_IDENTITY: [
      /\b(es importante notar|vale la pena mencionar|cabe destacar)\b/gi,
      /\b(profundizar en|sumergirse en|adentrarse en)\b/gi,
      /\b(en el panorama de|en el mundo de|en el ámbito de)\b/gi,
      /\b(navegar por (la complejidad|los desafíos))\b/gi,
      /\b(una multitud de|una plétora de|multifacético)\b/gi,
      /\b(es crucial|es esencial|es fundamental)\b/gi,
      /\b(al final del día|cuando se trata de|en términos de)\b/gi,
      /\b(arrojar luz sobre|allanar el camino|revolucionario)\b/gi,
    ],
    WEAK_CONNECTORS: ['también', 'además', 'asimismo', 'igualmente'],
  },
};

// Legacy export for backward compatibility
export const PROHIBITED_PATTERNS = MULTILINGUAL_PATTERNS['English'];

/**
 * Get patterns for a specific language, with fallback to English
 */
function getPatterns(language?: string): LanguagePatterns {
  const langName = getLanguageName(language);
  return MULTILINGUAL_PATTERNS[langName] || MULTILINGUAL_PATTERNS['English'];
}

export class ProhibitedLanguageValidator {
  /**
   * Validate content against prohibited language patterns
   * @param content - The content to validate
   * @param context - Optional context containing language setting
   */
  static validate(content: string, context?: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const language = context?.language;
    const patterns = getPatterns(language);

    // Check stop words
    for (const stopWord of patterns.STOP_WORDS) {
      const indices = this.findWordIndices(content, stopWord);
      for (const index of indices) {
        violations.push({
          rule: 'STOP_WORDS',
          text: stopWord,
          position: index,
          suggestion: `Remove filler word "${stopWord}" - it adds no semantic value`,
          severity: 'warning',
        });
      }
    }

    // Check opinions (BLOCKING - severity: 'error')
    for (const pattern of patterns.OPINIONS) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'OPINIONS',
          text: match[0],
          position: match.index || 0,
          suggestion: `Remove opinionated language "${match[0]}" - use factual statements instead`,
          severity: 'error',
        });
      }
    }

    // Check analogies (BLOCKING - severity: 'error')
    for (const pattern of patterns.ANALOGIES) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'ANALOGIES',
          text: match[0],
          position: match.index || 0,
          suggestion: `Remove analogy "${match[0]}" - analogies introduce irrelevant entities into the semantic space`,
          severity: 'error',
        });
      }
    }

    // Check fluff openers (BLOCKING - severity: 'error')
    for (const pattern of patterns.FLUFF_OPENERS) {
      if (pattern.test(content)) {
        const match = content.match(pattern);
        violations.push({
          rule: 'FLUFF_OPENERS',
          text: match?.[0] || '',
          position: 0,
          suggestion: 'Remove fluff opener - start with a direct definition or fact',
          severity: 'error',
        });
      }
    }

    // Check ambiguous pronouns at sentence starts
    const sentences = splitSentences(content);
    sentences.forEach((sentence) => {
      for (const pattern of patterns.AMBIGUOUS_PRONOUNS) {
        if (pattern.test(sentence)) {
          const match = sentence.match(pattern);
          violations.push({
            rule: 'AMBIGUOUS_PRONOUNS',
            text: match?.[0] || '',
            position: content.indexOf(sentence),
            suggestion: 'Replace ambiguous pronoun with explicit entity name',
            severity: 'warning',
          });
        }
      }
    });

    // Check future tense for facts
    for (const pattern of patterns.FUTURE_FOR_FACTS) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'FUTURE_FOR_FACTS',
          text: match[0],
          position: match.index || 0,
          suggestion: `Use present tense for permanent facts - change "${match[0]}" to present simple`,
          severity: 'warning',
        });
      }
    }

    // Check passive voice
    for (const pattern of patterns.PASSIVE_VOICE) {
      const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        violations.push({
          rule: 'PASSIVE_VOICE',
          text: match[0],
          position: match.index || 0,
          suggestion: `Convert passive voice "${match[0]}" to active voice - clarify the subject/agent`,
          severity: 'warning',
        });
      }
    }

    // Check Expression Identity (LLM-typical phrases) - BLOCKING
    if (patterns.EXPRESSION_IDENTITY) {
      for (const pattern of patterns.EXPRESSION_IDENTITY) {
        const matches = content.matchAll(new RegExp(pattern.source, 'gi'));
        for (const match of matches) {
          violations.push({
            rule: 'EXPRESSION_IDENTITY',
            text: match[0],
            position: match.index || 0,
            suggestion: `Remove LLM-typical phrase "${match[0]}" - it signals AI authorship and adds no semantic value. Replace with specific, factual language.`,
            severity: 'error',
          });
        }
      }
    }

    // Check Weak Connectors ("also" ban) - flag "also" specifically as it creates weak semantic connections
    if (patterns.WEAK_CONNECTORS) {
      for (const connector of patterns.WEAK_CONNECTORS) {
        const sentencesWithConnector = sentences.filter(s =>
          new RegExp(`\\b${connector}\\b`, 'i').test(s)
        );
        // Flag if >20% of sentences use weak connectors
        if (sentences.length >= 5 && sentencesWithConnector.length > sentences.length * 0.2) {
          violations.push({
            rule: 'WEAK_CONNECTOR',
            text: `"${connector}" used in ${sentencesWithConnector.length}/${sentences.length} sentences`,
            position: 0,
            suggestion: `Reduce use of "${connector}" - it creates weak semantic connections. Replace with specific causal or consequential connectors (because, therefore, as a result).`,
            severity: 'warning',
          });
        }
      }
    }

    return violations;
  }

  private static findWordIndices(content: string, word: string): number[] {
    const indices: number[] = [];
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
      indices.push(match.index);
    }
    return indices;
  }
}

// Export for testing and direct use
export { MULTILINGUAL_PATTERNS, getPatterns };
