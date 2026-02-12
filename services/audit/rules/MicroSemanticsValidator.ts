/**
 * MicroSemanticsValidator
 *
 * Validates sentence-level semantic quality: modality, predicate specificity,
 * and SPO (Subject-Predicate-Object) patterns.
 *
 * Rules implemented:
 *   57 - Mixed modality in sentences
 *   58 - Excessive hedging language
 *   61 - Low predicate specificity
 *   73 - Weak sentence structure (non-SPO)
 */

export interface MicroSemanticsIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class MicroSemanticsValidator {
  validate(text: string): MicroSemanticsIssue[] {
    const issues: MicroSemanticsIssue[] = [];
    const sentences = this.splitSentences(text);

    this.checkModality(sentences, issues);             // Rules 57-58
    this.checkPredicateSpecificity(sentences, issues);  // Rule 61
    this.checkSpoPattern(sentences, issues);            // Rule 73

    return issues;
  }

  /**
   * Rules 57-58: Correct modality usage.
   * Facts should use "is/are/has/have" (indicative).
   * Possibilities should use "can/may/might/could" (modal).
   * Flag mixing: modal verbs for statements that should be factual.
   */
  checkModality(sentences: string[], issues: MicroSemanticsIssue[]): void {
    const factualPatterns = /\b(is|are|was|were|has|have|had)\b/i;
    const modalPatterns = /\b(can|could|may|might|would|should)\b/i;

    let modalFactMix = 0;
    for (const sentence of sentences) {
      // Flag sentences with mixed modality signals
      const hasFact = factualPatterns.test(sentence);
      const hasModal = modalPatterns.test(sentence);
      // Sentences with both factual and hedging language in same sentence
      if (hasFact && hasModal && sentence.length > 20) {
        modalFactMix++;
      }
    }

    if (sentences.length > 5 && modalFactMix > sentences.length * 0.3) {
      issues.push({
        ruleId: 'rule-57',
        severity: 'medium',
        title: 'Mixed modality in sentences',
        description: `${modalFactMix} of ${sentences.length} sentences mix factual and modal language. Use "is/are" for facts, "can/may" for possibilities.`,
        exampleFix: 'Separate factual statements from speculative ones. Use "is" for facts, "may" for possibilities.',
      });
    }

    // Check for excessive hedging (too many modals in factual content)
    const modalSentences = sentences.filter(s => modalPatterns.test(s) && !factualPatterns.test(s));
    if (sentences.length > 5 && modalSentences.length > sentences.length * 0.4) {
      issues.push({
        ruleId: 'rule-58',
        severity: 'medium',
        title: 'Excessive hedging language',
        description: `${modalSentences.length} of ${sentences.length} sentences use only modal verbs. Make definitive statements where facts are established.`,
        exampleFix: 'Replace "X can be..." with "X is..." when stating established facts.',
      });
    }
  }

  /**
   * Rule 61: Predicate specificity.
   * Detect vague predicates like "do", "make", "get", "have" when more specific verbs should be used.
   */
  checkPredicateSpecificity(sentences: string[], issues: MicroSemanticsIssue[]): void {
    const vaguePredicates = /\b(do|does|did|make|makes|made|get|gets|got|have|has|had|go|goes|went|put|puts|take|takes|took|thing|stuff)\b/gi;

    let vagueCount = 0;
    for (const sentence of sentences) {
      const matches = sentence.match(vaguePredicates) || [];
      const words = sentence.split(/\s+/).length;
      // If >20% of verbs are vague in a sentence
      if (words > 5 && matches.length > 1) {
        vagueCount++;
      }
    }

    if (sentences.length > 5 && vagueCount > sentences.length * 0.25) {
      issues.push({
        ruleId: 'rule-61',
        severity: 'medium',
        title: 'Low predicate specificity',
        description: `${vagueCount} of ${sentences.length} sentences use vague predicates (do/make/get/have). Use specific verbs.`,
        exampleFix: 'Replace "do the process" with "execute the process", "make changes" with "implement changes".',
      });
    }
  }

  /**
   * Rule 73: SPO (Subject-Predicate-Object) sentence pattern.
   * Sentences should follow clear SPO structure. Flag sentences that start with weak patterns.
   */
  checkSpoPattern(sentences: string[], issues: MicroSemanticsIssue[]): void {
    const weakStarters = /^(there (is|are|was|were)|it (is|was|seems|appears)|(this|that) (is|was|means))/i;

    let weakStartCount = 0;
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 15 && weakStarters.test(trimmed)) {
        weakStartCount++;
      }
    }

    if (sentences.length > 5 && weakStartCount > sentences.length * 0.2) {
      issues.push({
        ruleId: 'rule-73',
        severity: 'medium',
        title: 'Weak sentence structure (non-SPO)',
        description: `${weakStartCount} of ${sentences.length} sentences start with weak patterns (There is/It is). Use Subject-Predicate-Object structure.`,
        exampleFix: 'Replace "There are many benefits" with "React hooks provide many benefits".',
      });
    }
  }

  splitSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);
  }
}
