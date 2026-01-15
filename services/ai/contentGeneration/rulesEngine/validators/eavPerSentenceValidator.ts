// services/ai/contentGeneration/rulesEngine/validators/eavPerSentenceValidator.ts

import { ValidationViolation, SectionGenerationContext, SemanticTriple } from '../../../../../types';
import { splitSentences } from '../../../../../utils/sentenceTokenizer';

/**
 * Validates that each sentence contains exactly one EAV triple.
 * Framework rule: "One EAV triple per sentence (maximize Information Density)"
 */
export class EavPerSentenceValidator {
  /**
   * Minimum sentence word count to require EAV content.
   * Very short sentences (like "Yes." or "Indeed.") are exempt.
   */
  private static readonly MIN_WORDS_FOR_EAV = 5;

  /**
   * Maximum percentage of sentences allowed to have no EAV before error.
   * Warning at 30%, error at 50%.
   */
  private static readonly NO_EAV_WARNING_THRESHOLD = 0.3;
  private static readonly NO_EAV_ERROR_THRESHOLD = 0.5;

  /**
   * Validate that each sentence contains exactly one EAV triple.
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    // Get EAVs from context - check both contextualVectors and eavs fields
    const eavs = context.brief?.contextualVectors || (context.brief as any)?.eavs || [];

    // Skip validation if no EAVs to check against
    if (!eavs || eavs.length === 0) {
      return violations;
    }

    const sentences = splitSentences(content);
    let sentencesWithNoEav = 0;
    let sentencesWithMultipleEav = 0;
    let totalValidSentences = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();

      // Skip very short sentences
      const wordCount = sentence.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount < this.MIN_WORDS_FOR_EAV) {
        continue;
      }

      totalValidSentences++;
      const eavCount = this.countEavsInSentence(sentence, eavs);

      if (eavCount === 0) {
        sentencesWithNoEav++;
        // Individual sentence warning only for longer sentences
        if (wordCount >= 10) {
          violations.push({
            rule: 'SENTENCE_NO_EAV',
            text: sentence.substring(0, 80) + (sentence.length > 80 ? '...' : ''),
            position: content.indexOf(sentence),
            suggestion: 'Sentence lacks factual EAV content. Add a specific fact (Entity-Attribute-Value).',
            severity: 'warning', // Using 'warning' since 'info' is not in ValidationViolation type
          });
        }
      } else if (eavCount > 1) {
        sentencesWithMultipleEav++;
        violations.push({
          rule: 'SENTENCE_MULTIPLE_EAVS',
          text: sentence.substring(0, 80) + (sentence.length > 80 ? '...' : ''),
          position: content.indexOf(sentence),
          suggestion: `Sentence contains ${eavCount} EAV facts. Split into ${eavCount} separate sentences for optimal information density.`,
          severity: 'warning',
        });
      }
    }

    // Overall density check
    if (totalValidSentences > 0) {
      const noEavRatio = sentencesWithNoEav / totalValidSentences;

      if (noEavRatio >= this.NO_EAV_ERROR_THRESHOLD) {
        violations.push({
          rule: 'EAV_DENSITY_LOW',
          text: `${Math.round(noEavRatio * 100)}% of sentences lack EAV content`,
          position: 0,
          suggestion: 'More than half of sentences lack factual EAV content. Add specific facts to improve information density.',
          severity: 'error',
        });
      } else if (noEavRatio >= this.NO_EAV_WARNING_THRESHOLD) {
        violations.push({
          rule: 'EAV_DENSITY_MODERATE',
          text: `${Math.round(noEavRatio * 100)}% of sentences lack EAV content`,
          position: 0,
          suggestion: 'Consider adding more factual EAV content to improve information density.',
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  /**
   * Count how many EAV triples are referenced in a sentence.
   * A sentence "matches" an EAV if it contains either:
   * - The subject label AND the object value
   * - The subject label AND the predicate relation
   */
  static countEavsInSentence(sentence: string, eavs: SemanticTriple[]): number {
    const sentenceLower = sentence.toLowerCase();
    let count = 0;

    for (const eav of eavs) {
      const subjectLabel = (eav.subject?.label || (eav as any).entity || '').toLowerCase();
      const objectValue = String(eav.object?.value || (eav as any).value || '').toLowerCase();
      const predicateRelation = (eav.predicate?.relation || '').toLowerCase().replace(/_/g, ' ');

      // Skip if no subject
      if (!subjectLabel || subjectLabel.length < 2) continue;

      // Check if subject is mentioned
      const hasSubject = sentenceLower.includes(subjectLabel) ||
                        subjectLabel.split(' ').some(word =>
                          word.length >= 4 && sentenceLower.includes(word)
                        );

      if (!hasSubject) continue;

      // Check if object value or predicate relation is mentioned
      const hasObject = objectValue.length >= 2 && sentenceLower.includes(objectValue);
      const hasPredicate = predicateRelation.length >= 3 && sentenceLower.includes(predicateRelation);

      if (hasObject || hasPredicate) {
        count++;
      }
    }

    return count;
  }
}
