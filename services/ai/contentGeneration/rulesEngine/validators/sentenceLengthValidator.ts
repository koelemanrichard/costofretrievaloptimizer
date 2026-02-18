// services/ai/contentGeneration/rulesEngine/validators/sentenceLengthValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';
import { splitSentences } from '../../../../../utils/sentenceTokenizer';

/**
 * Sentence type classification and target word count ranges.
 *
 * Framework rules:
 * - Definitional sentences: 15-20 words (direct, concise definitions)
 * - Explanatory sentences: 20-30 words (detailed explanations)
 * - Instructional sentences: 10-15 words (clear, actionable steps)
 */
type SentenceType = 'definitional' | 'explanatory' | 'instructional' | 'other';

interface LengthTarget {
  min: number;
  max: number;
}

const SENTENCE_LENGTH_TARGETS: Record<SentenceType, LengthTarget> = {
  definitional: { min: 15, max: 20 },
  explanatory: { min: 20, max: 30 },
  instructional: { min: 10, max: 15 },
  other: { min: 10, max: 30 }, // General range
};

// Tolerance: sentences can be within +/- this many words of target and still pass
const TOLERANCE = 5;

/**
 * Definitional patterns across languages.
 * These patterns identify sentences that define an entity or concept.
 */
const DEFINITIONAL_PATTERNS: RegExp[] = [
  // English
  /\b(is|are|refers?\s+to|means?|denotes?|signifies?|represents?)\s+(a|an|the)\b/i,
  /\b(is defined as|is known as|is called)\b/i,
  // Dutch
  /\b(is|zijn|verwijst naar|betekent|staat voor)\s+(een|de|het)\b/i,
  // German
  /\b(ist|sind|bezieht sich auf|bedeutet|steht für)\s+(ein|eine|der|die|das)\b/i,
  // French
  /\b(est|sont|se réfère à|signifie|représente)\s+(un|une|le|la|les)\b/i,
  // Spanish
  /\b(es|son|se refiere a|significa|representa)\s+(un|una|el|la|los|las)\b/i,
];

/**
 * Instructional patterns across languages.
 * These patterns identify imperative/instructional sentences.
 */
const INSTRUCTIONAL_PATTERNS: RegExp[] = [
  // English imperative starters
  /^(install|configure|run|create|add|remove|update|check|verify|ensure|use|set|click|open|close|save|select|enter|type|press|navigate|download|upload|import|export)\b/i,
  // Step indicators
  /^(step\s+\d+|first|next|then|finally|after that)\b/i,
  // Dutch
  /^(installeer|configureer|maak|voeg|verwijder|controleer|gebruik|stel|klik|open|sluit|sla|selecteer)\b/i,
  // German
  /^(installieren Sie|konfigurieren Sie|erstellen Sie|fügen Sie|entfernen Sie|prüfen Sie|verwenden Sie|klicken Sie|öffnen Sie)\b/i,
  // French
  /^(installez|configurez|créez|ajoutez|supprimez|vérifiez|utilisez|cliquez|ouvrez|fermez)\b/i,
  // Spanish
  /^(instale|configure|cree|agregue|elimine|verifique|use|haga clic|abra|cierre)\b/i,
];

/**
 * SentenceLengthValidator - Enforces word count targets by sentence type.
 *
 * Classifies each sentence as definitional, explanatory, or instructional,
 * then validates word count against framework targets.
 */
export class SentenceLengthValidator {
  /**
   * Classify a sentence by its type based on linguistic patterns.
   */
  static classifySentence(sentence: string): SentenceType {
    const trimmed = sentence.trim();

    // Check instructional first (imperative mood)
    if (INSTRUCTIONAL_PATTERNS.some(p => p.test(trimmed))) {
      return 'instructional';
    }

    // Check definitional (contains "is a", "refers to", etc.)
    if (DEFINITIONAL_PATTERNS.some(p => p.test(trimmed))) {
      return 'definitional';
    }

    // Default to explanatory for longer sentences, other for short ones
    const wordCount = trimmed.split(/\s+/).length;
    return wordCount > 15 ? 'explanatory' : 'other';
  }

  /**
   * Validate sentence lengths against framework targets.
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const sentences = splitSentences(content);

    if (sentences.length < 3) return violations;

    const typeCounts: Record<SentenceType, { total: number; outOfRange: number; examples: string[] }> = {
      definitional: { total: 0, outOfRange: 0, examples: [] },
      explanatory: { total: 0, outOfRange: 0, examples: [] },
      instructional: { total: 0, outOfRange: 0, examples: [] },
      other: { total: 0, outOfRange: 0, examples: [] },
    };

    for (const sentence of sentences) {
      const wordCount = sentence.split(/\s+/).length;
      if (wordCount < 3) continue; // Skip fragments

      const type = this.classifySentence(sentence);
      const target = SENTENCE_LENGTH_TARGETS[type];
      typeCounts[type].total++;

      // Check with tolerance
      if (wordCount < target.min - TOLERANCE || wordCount > target.max + TOLERANCE) {
        typeCounts[type].outOfRange++;
        if (typeCounts[type].examples.length < 2) {
          typeCounts[type].examples.push(`"${sentence.slice(0, 60)}..." (${wordCount} words)`);
        }
      }
    }

    // Report violations per sentence type (only when >30% are out of range)
    for (const [type, counts] of Object.entries(typeCounts) as [SentenceType, typeof typeCounts[SentenceType]][]) {
      if (type === 'other') continue; // Don't report "other" type
      if (counts.total < 2) continue; // Need enough samples

      const outOfRangeRatio = counts.outOfRange / counts.total;
      if (outOfRangeRatio > 0.3) {
        const target = SENTENCE_LENGTH_TARGETS[type];
        violations.push({
          rule: `SENTENCE_LENGTH_${type.toUpperCase()}`,
          text: `${counts.outOfRange}/${counts.total} ${type} sentences outside target range`,
          position: 0,
          suggestion: `${type.charAt(0).toUpperCase() + type.slice(1)} sentences should be ${target.min}-${target.max} words. ${counts.examples.join('; ')}`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }
}
