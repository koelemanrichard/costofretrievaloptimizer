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
    this.checkActiveVoice(sentences, issues);           // Rule 74 - Active voice
    this.checkSentenceLength(sentences, issues);        // Rule 75 - Sentence length by type
    this.checkAlsoUsage(sentences, issues);             // Rule 76 - "Also" ban
    this.checkExpressionIdentity(sentences, issues);    // Rule 77 - LLM phrase detection

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

  /**
   * Rule 74: Active voice validation.
   * Content should use >70% active voice. Passive voice obscures the agent.
   */
  checkActiveVoice(sentences: string[], issues: MicroSemanticsIssue[]): void {
    const passivePattern = /\b(is|are|was|were|been|being)\s+(being\s+)?(\w+ed|built|broken|bought|caught|chosen|done|drawn|driven|eaten|found|given|gone|grown|held|hidden|kept|known|led|left|lost|made|meant|met|paid|read|run|said|seen|sent|set|shown|sold|spoken|spent|taken|taught|thought|told|understood|won|worn|written)\b/gi;
    const allowedPassive = /\b(is (called|named|known as|defined as|considered|classified))\b/i;

    let passiveCount = 0;
    const meaningful = sentences.filter(s => s.split(/\s+/).length >= 5);

    for (const sentence of meaningful) {
      if (allowedPassive.test(sentence)) continue;
      passivePattern.lastIndex = 0;
      if (passivePattern.test(sentence)) {
        passiveCount++;
      }
    }

    const activeRatio = meaningful.length > 0 ? 1 - (passiveCount / meaningful.length) : 1;

    if (meaningful.length > 5 && activeRatio < 0.7) {
      issues.push({
        ruleId: 'rule-74',
        severity: 'medium',
        title: 'Insufficient active voice',
        description: `Only ${Math.round(activeRatio * 100)}% of sentences use active voice (target: 70%). ${passiveCount} of ${meaningful.length} sentences use passive voice.`,
        exampleFix: 'Replace "The data is processed by the server" with "The server processes the data".',
      });
    }
  }

  /**
   * Rule 75: Sentence length by type.
   * Definitional: 15-20 words, Explanatory: 20-30 words, Instructional: 10-15 words.
   */
  checkSentenceLength(sentences: string[], issues: MicroSemanticsIssue[]): void {
    const definitionPattern = /\b(is|are|refers?\s+to|means?|denotes?)\s+(a|an|the)\b/i;
    const instructionPattern = /^(install|configure|run|create|add|remove|update|check|verify|use|set|click|open|step\s+\d+|first|next|then|finally)\b/i;

    let outOfRange = 0;
    let total = 0;

    for (const sentence of sentences) {
      const words = sentence.split(/\s+/).length;
      if (words < 3) continue;
      total++;

      if (definitionPattern.test(sentence)) {
        // Definitional: 15-20 words (tolerance ±5)
        if (words < 10 || words > 25) outOfRange++;
      } else if (instructionPattern.test(sentence)) {
        // Instructional: 10-15 words (tolerance ±5)
        if (words < 5 || words > 20) outOfRange++;
      } else {
        // Explanatory: 20-30 words (tolerance ±5)
        if (words > 35) outOfRange++;
      }
    }

    if (total > 5 && outOfRange > total * 0.3) {
      issues.push({
        ruleId: 'rule-75',
        severity: 'low',
        title: 'Sentence length varies from type targets',
        description: `${outOfRange} of ${total} sentences fall outside target word counts (definitions: 15-20, explanations: 20-30, instructions: 10-15).`,
        exampleFix: 'Shorten overly long definitions and expand too-brief explanatory sentences.',
      });
    }
  }

  /**
   * Rule 76: "Also" ban - weak connector usage.
   * "Also" creates weak semantic connections between statements.
   */
  checkAlsoUsage(sentences: string[], issues: MicroSemanticsIssue[]): void {
    const alsoPattern = /\balso\b/gi;
    let alsoCount = 0;

    for (const sentence of sentences) {
      alsoPattern.lastIndex = 0;
      if (alsoPattern.test(sentence)) {
        alsoCount++;
      }
    }

    if (sentences.length >= 5 && alsoCount > sentences.length * 0.15) {
      issues.push({
        ruleId: 'rule-76',
        severity: 'medium',
        title: 'Excessive "also" usage (weak connector)',
        description: `"Also" appears in ${alsoCount} of ${sentences.length} sentences. This creates weak semantic connections.`,
        exampleFix: 'Replace "X also has Y" with causal connectors: "Because X includes Y" or "X integrates Y to achieve Z".',
      });
    }
  }

  /**
   * Rule 77: Expression Identity detection.
   * Detects LLM-typical phrases that signal AI authorship.
   */
  checkExpressionIdentity(sentences: string[], issues: MicroSemanticsIssue[]): void {
    const llmPhrases = [
      /\b(it's important to note|it is important to note|it's worth noting)\b/i,
      /\b(delve into|delve deeper|delving into)\b/i,
      /\b(in the realm of|in the world of|in the landscape of)\b/i,
      /\b(navigate the (landscape|complexities|challenges))\b/i,
      /\b(tapestry of|myriad of|plethora of|multifaceted)\b/i,
      /\b(it's crucial to|it is crucial to|it's essential to)\b/i,
      /\b(shed light on|pave the way|game changer|cutting.edge)\b/i,
      /\b(unlock(ing)? the (power|potential|secrets))\b/i,
      /\b(dive deep|deep dive|take a closer look)\b/i,
      /\b(stands? as a testament|serves? as a reminder)\b/i,
      /\b(in today's (digital|modern|fast-paced|ever-changing))\b/i,
      /\b(embark on a journey|on this journey|transformative)\b/i,
      /\b(leverag(e|ing)|synergy|paradigm shift)\b/i,
    ];

    let llmCount = 0;
    const examples: string[] = [];

    for (const sentence of sentences) {
      for (const pattern of llmPhrases) {
        const match = sentence.match(pattern);
        if (match) {
          llmCount++;
          if (examples.length < 3) examples.push(match[0]);
          break;
        }
      }
    }

    if (llmCount > 0) {
      issues.push({
        ruleId: 'rule-77',
        severity: 'high',
        title: 'Expression Identity detected (LLM phrases)',
        description: `Found ${llmCount} LLM-typical phrase(s): "${examples.join('", "')}". These signal AI authorship.`,
        exampleFix: 'Remove or replace with specific, factual language. "It\'s important to note that X" → "X is [fact]".',
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
