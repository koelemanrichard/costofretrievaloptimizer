// services/ai/contentGeneration/rulesEngine/validators/futureTenseValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { getLanguageName } from '../../../../../utils/languageUtils';
import { splitSentences } from '../../../../../utils/sentenceTokenizer';

/**
 * Patterns that detect future tense used for permanent/established facts.
 *
 * Framework rule: Use present tense for permanent facts.
 * "Water will boil at 100°C" → "Water boils at 100°C"
 * "React will use a virtual DOM" → "React uses a virtual DOM"
 *
 * Exception: Future tense is valid for predictions, plans, and upcoming events.
 */

interface FutureTensePatterns {
  /** Patterns matching future tense in factual contexts */
  futureFactPatterns: RegExp[];
  /** Contexts where future tense is acceptable */
  validFutureContexts: RegExp[];
}

const MULTILINGUAL_FUTURE_PATTERNS: Record<string, FutureTensePatterns> = {
  'English': {
    futureFactPatterns: [
      // "will" + permanent state verbs
      /\bwill\s+(always|never|typically|usually|generally|normally|consistently)\s+\w+/gi,
      // "will" + being verbs for definitions
      /\bwill\s+(be|have|contain|include|require|need|consist|comprise|involve)\b/gi,
      // "will" + present-fact verbs
      /\bwill\s+(work|function|operate|perform|run|execute|process|handle)\b/gi,
    ],
    validFutureContexts: [
      /\b(upcoming|future|next|planned|expected|scheduled|soon|eventually|roadmap)\b/i,
      /\b(if|when|once|after|before|until)\s+/i, // Conditional clauses
      /\b(prediction|forecast|estimate|projection)\b/i,
      /\b(will\s+be\s+(released|launched|available|updated|announced|published))\b/i,
    ],
  },

  'Dutch': {
    futureFactPatterns: [
      /\bzal\s+(altijd|nooit|doorgaans|meestal|over het algemeen|normaal)\s+\w+/gi,
      /\bzal\s+(zijn|hebben|bevatten|omvatten|vereisen|bestaan)\b/gi,
      /\bzullen\s+(altijd|nooit|doorgaans|meestal)\s+\w+/gi,
    ],
    validFutureContexts: [
      /\b(toekomstige?|volgende|gepland|verwacht|binnenkort)\b/i,
      /\b(als|wanneer|zodra|nadat|voordat|totdat)\s+/i,
    ],
  },

  'German': {
    futureFactPatterns: [
      /\bwird\s+(immer|nie|typischerweise|normalerweise|im Allgemeinen)\s+\w+/gi,
      /\bwird\s+(sein|haben|enthalten|umfassen|erfordern|bestehen)\b/gi,
      /\bwerden\s+(immer|nie|typischerweise|normalerweise)\s+\w+/gi,
    ],
    validFutureContexts: [
      /\b(zukünftige?|nächste[rns]?|geplant|erwartet|bald)\b/i,
      /\b(wenn|sobald|nachdem|bevor|bis)\s+/i,
    ],
  },

  'French': {
    futureFactPatterns: [
      /\b(sera|seront)\s+(toujours|jamais|typiquement|habituellement|généralement)\b/gi,
      /\b(sera|seront)\s+(un|une|le|la|les)\b/gi,
    ],
    validFutureContexts: [
      /\b(futur|prochain|planifié|prévu|bientôt)\b/i,
      /\b(si|quand|une fois|après|avant|jusqu'à)\s+/i,
    ],
  },

  'Spanish': {
    futureFactPatterns: [
      /\b(será|serán)\s+(siempre|nunca|típicamente|usualmente|generalmente)\b/gi,
      /\b(será|serán)\s+(un|una|el|la|los|las)\b/gi,
    ],
    validFutureContexts: [
      /\b(futuro|próximo|planificado|esperado|pronto)\b/i,
      /\b(si|cuando|una vez|después|antes|hasta)\s+/i,
    ],
  },
};

function getFutureTensePatterns(language?: string): FutureTensePatterns {
  const langName = getLanguageName(language);
  return MULTILINGUAL_FUTURE_PATTERNS[langName] || MULTILINGUAL_FUTURE_PATTERNS['English'];
}

/**
 * FutureTenseValidator - Detects future tense used for permanent facts.
 *
 * Suggests present tense for established facts, while allowing future tense
 * for genuine predictions, plans, and upcoming events.
 */
export class FutureTenseValidator {
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const sentences = splitSentences(content);

    if (sentences.length < 3) return violations;

    const language = context.language;
    const { futureFactPatterns, validFutureContexts } = getFutureTensePatterns(language);

    let futureFactCount = 0;
    const examples: string[] = [];

    for (const sentence of sentences) {
      // Skip if sentence has a valid future context
      const hasValidContext = validFutureContexts.some(ctx => ctx.test(sentence));
      if (hasValidContext) continue;

      // Check for future tense in factual statements
      for (const pattern of futureFactPatterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(sentence);
        if (match) {
          futureFactCount++;
          if (examples.length < 2) {
            examples.push(`"${match[0]}"`);
          }
          break; // Count each sentence only once
        }
      }
    }

    if (futureFactCount > 0) {
      violations.push({
        rule: 'FUTURE_TENSE_FACTS',
        text: `${futureFactCount} sentence(s) use future tense for established facts`,
        position: 0,
        suggestion: `Use present tense for permanent facts. Change ${examples.join(', ')} to present simple. Future tense should only describe predictions or upcoming events.`,
        severity: 'warning',
      });
    }

    return violations;
  }
}
