// services/ai/contentGeneration/rulesEngine/validators/activeVoiceValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { getLanguageName } from '../../../../../utils/languageUtils';
import { splitSentences } from '../../../../../utils/sentenceTokenizer';

/**
 * Multilingual passive voice detection patterns.
 * Each language has its own passive construction rules.
 */
interface PassiveVoicePatterns {
  /** Patterns that match passive voice constructions */
  patterns: RegExp[];
  /** Words/contexts where passive is acceptable (e.g., in process descriptions) */
  allowedContexts: RegExp[];
}

const MULTILINGUAL_PASSIVE_PATTERNS: Record<string, PassiveVoicePatterns> = {
  'English': {
    patterns: [
      // Standard passive: be + past participle
      /\b(is|are|was|were|been|being|gets?|got)\s+(being\s+)?(\w+ed|built|broken|bought|caught|chosen|cut|done|drawn|driven|eaten|fallen|felt|found|given|gone|grown|held|hidden|hit|kept|known|led|left|lost|made|meant|met|paid|put|read|run|said|seen|sent|set|shown|shut|sold|sat|slept|spoken|spent|stood|struck|taken|taught|thought|told|understood|won|worn|written|brought|fought|sought|caught)\b/gi,
    ],
    allowedContexts: [
      /\b(is (called|named|known as|defined as|considered|classified|categorized))\b/i,
      /\b(are (called|named|known as|defined as|considered|classified|categorized))\b/i,
    ],
  },

  'Dutch': {
    patterns: [
      /\b(wordt|worden|werd|werden)\s+(ge\w+d|ge\w+en|ge\w+t)\b/gi,
      /\b(is|zijn|was|waren)\s+(ge\w+d|ge\w+en|ge\w+t)\b/gi,
    ],
    allowedContexts: [
      /\b(wordt (genoemd|beschouwd als|gedefinieerd als|geclassificeerd als))\b/i,
    ],
  },

  'German': {
    patterns: [
      /\b(wird|werden|wurde|wurden)\s+(ge\w+t|ge\w+en)\b/gi,
      /\b(ist|sind|war|waren)\s+(ge\w+t|ge\w+en)\b/gi,
    ],
    allowedContexts: [
      /\b(wird (genannt|bezeichnet als|definiert als|betrachtet als))\b/i,
    ],
  },

  'French': {
    patterns: [
      /\b(est|sont|a été|ont été|était|étaient|fut|furent)\s+(\w+é[es]?|\w+i[es]?|\w+u[es]?)\b/gi,
    ],
    allowedContexts: [
      /\b(est (appelé|nommé|considéré|défini|classé))\b/i,
    ],
  },

  'Spanish': {
    patterns: [
      /\b(es|son|fue|fueron|ha sido|han sido|será|serán)\s+(\w+ado[s]?|\w+ido[s]?|\w+ada[s]?|\w+ida[s]?)\b/gi,
      /\bse\s+(\w+a[n]?|\w+e[n]?)\b/gi, // reflexive passive
    ],
    allowedContexts: [
      /\b(es (llamado|considerado|definido|clasificado))\b/i,
    ],
  },
};

function getPassivePatterns(language?: string): PassiveVoicePatterns {
  const langName = getLanguageName(language);
  return MULTILINGUAL_PASSIVE_PATTERNS[langName] || MULTILINGUAL_PASSIVE_PATTERNS['English'];
}

/**
 * ActiveVoiceValidator - Enforces active voice usage in content.
 *
 * Framework rule: Sentences should predominantly use active voice.
 * Active voice: "React hooks manage state" (clear subject performing action)
 * Passive voice: "State is managed by React hooks" (subject receives action)
 *
 * Target: >70% active voice sentences.
 * Passive is acceptable in:
 *   - Definitions ("X is called/known as/defined as")
 *   - Process descriptions where agent is irrelevant
 */
export class ActiveVoiceValidator {
  static readonly ACTIVE_VOICE_TARGET = 0.7; // 70% minimum active voice

  /**
   * Validate content for active voice usage.
   * Returns violations when passive voice exceeds 30% of sentences.
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const sentences = splitSentences(content);

    if (sentences.length < 3) return violations;

    const language = context.language;
    const { patterns, allowedContexts } = getPassivePatterns(language);

    let passiveCount = 0;
    const passiveSentences: string[] = [];

    for (const sentence of sentences) {
      // Skip short sentences (less meaningful for voice analysis)
      if (sentence.split(/\s+/).length < 5) continue;

      // Check if sentence matches any allowed context (acceptable passive)
      const isAllowed = allowedContexts.some(ctx => ctx.test(sentence));
      if (isAllowed) continue;

      // Check for passive voice patterns
      const isPassive = patterns.some(pattern => {
        // Reset lastIndex for global patterns
        pattern.lastIndex = 0;
        return pattern.test(sentence);
      });

      if (isPassive) {
        passiveCount++;
        if (passiveSentences.length < 3) {
          passiveSentences.push(sentence.slice(0, 80));
        }
      }
    }

    const meaningfulSentences = sentences.filter(s => s.split(/\s+/).length >= 5);
    const activeRatio = meaningfulSentences.length > 0
      ? 1 - (passiveCount / meaningfulSentences.length)
      : 1;

    if (activeRatio < this.ACTIVE_VOICE_TARGET && meaningfulSentences.length >= 3) {
      violations.push({
        rule: 'ACTIVE_VOICE',
        text: `${Math.round(activeRatio * 100)}% active voice (target: ${Math.round(this.ACTIVE_VOICE_TARGET * 100)}%)`,
        position: 0,
        suggestion: `Convert passive voice to active voice. ${passiveCount} of ${meaningfulSentences.length} sentences use passive voice. Examples: "${passiveSentences[0] || ''}"`,
        severity: 'warning',
      });
    }

    return violations;
  }
}
