/**
 * InformationDensityValidator
 *
 * Detects content quality issues related to information density:
 * redundancy, filler, vagueness, and preamble.
 *
 * Rules implemented:
 *   94 - No redundant repetition (same idea restated within 3 paragraphs)
 *   95 - No filler paragraphs (paragraphs with no informational content)
 *   96 - No vague statements (weasel words, vague quantifiers)
 *   98 - Direct answers without preamble
 */

export interface DensityIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  currentValue?: string;
  exampleFix?: string;
}

export class InformationDensityValidator {
  validate(text: string): DensityIssue[] {
    const issues: DensityIssue[] = [];
    const paragraphs = this.splitParagraphs(text);

    this.checkRedundantRepetition(paragraphs, issues); // Rule 94
    this.checkFillerParagraphs(paragraphs, issues); // Rule 95
    this.checkVagueStatements(text, issues); // Rule 96
    this.checkPreamble(text, issues); // Rule 98

    return issues;
  }

  /**
   * Rule 94: No redundant repetition — same idea restated within 3 paragraphs.
   * Uses simple n-gram overlap detection via Jaccard similarity.
   */
  checkRedundantRepetition(
    paragraphs: string[],
    issues: DensityIssue[]
  ): void {
    if (paragraphs.length < 3) return;

    let redundantPairs = 0;
    for (let i = 0; i < paragraphs.length - 1; i++) {
      for (let j = i + 1; j <= Math.min(i + 3, paragraphs.length - 1); j++) {
        const similarity = this.jaccardSimilarity(
          this.getSignificantWords(paragraphs[i]),
          this.getSignificantWords(paragraphs[j])
        );
        if (similarity >= 0.5) {
          redundantPairs++;
        }
      }
    }

    if (redundantPairs > 0) {
      issues.push({
        ruleId: 'rule-94',
        severity: 'high',
        title: 'Redundant content repetition',
        description: `Found ${redundantPairs} pair(s) of paragraphs with >50% word overlap within 3 paragraphs.`,
        exampleFix:
          'Remove or consolidate paragraphs that repeat the same information.',
      });
    }
  }

  /**
   * Rule 95: No filler paragraphs — paragraphs with no informational content.
   * Detect paragraphs that are mostly filler phrases.
   */
  checkFillerParagraphs(paragraphs: string[], issues: DensityIssue[]): void {
    const fillerPatterns = [
      /\b(in today's world|in this day and age|it goes without saying)\b/i,
      /\b(needless to say|it is worth noting|it is important to note)\b/i,
      /\b(as we all know|as you can see|as mentioned (above|earlier|before))\b/i,
      /\b(in conclusion|to sum up|all in all|at the end of the day)\b/i,
      /\b(without further ado|with that being said|having said that)\b/i,
      /\b(let's dive in|let's take a look|let's explore)\b/i,
    ];

    let fillerCount = 0;
    for (const para of paragraphs) {
      if (para.length < 20) continue;
      const matchCount = fillerPatterns.filter((p) => p.test(para)).length;
      const words = para.split(/\s+/).length;
      if (matchCount >= 2 || (matchCount >= 1 && words < 25)) {
        fillerCount++;
      }
    }

    if (fillerCount > 0) {
      issues.push({
        ruleId: 'rule-95',
        severity: 'medium',
        title: 'Filler paragraphs detected',
        description: `${fillerCount} paragraph(s) contain excessive filler phrases with little informational content.`,
        exampleFix: 'Remove filler phrases and add substantive information.',
      });
    }
  }

  /**
   * Rule 96: No vague statements.
   * Detect weasel words, vague quantifiers, and unsubstantiated claims.
   */
  checkVagueStatements(text: string, issues: DensityIssue[]): void {
    const vaguePatterns = [
      /\b(many|some|several|various|numerous|a lot of|a number of)\s+(people|experts?|studies|sources?|users?)\b/gi,
      /\b(it is (believed|thought|said|known)|experts? (say|believe|think|recommend))\b/gi,
      /\b(generally|typically|usually|often|sometimes|rarely)\b/gi,
      /\b(very|really|extremely|incredibly|absolutely|totally|completely)\b/gi,
    ];

    let vagueCount = 0;
    for (const pattern of vaguePatterns) {
      const matches = text.match(pattern);
      vagueCount += (matches || []).length;
    }

    const words = text.split(/\s+/).length;
    if (words > 100 && vagueCount > words * 0.03) {
      issues.push({
        ruleId: 'rule-96',
        severity: 'medium',
        title: 'Vague statements detected',
        description: `Found ${vagueCount} vague qualifiers in ${words} words. Be specific and substantiate claims.`,
        exampleFix:
          'Replace "many users" with "78% of surveyed users". Replace "very fast" with "completes in 50ms".',
      });
    }
  }

  /**
   * Rule 98: Direct answers without preamble.
   * First sentence should provide value, not meta-commentary.
   */
  checkPreamble(text: string, issues: DensityIssue[]): void {
    const firstSentence = text.split(/[.!?]/)[0]?.trim() || '';
    const preamblePatterns = [
      /^(in this (article|post|guide|blog)|this (article|post|guide) (will|is going to))/i,
      /^(today we('ll| will)|welcome to|thank you for|before we (begin|start|dive))/i,
      /^(have you ever wondered|did you know|what if I told you)/i,
      /^(if you('re| are) (looking for|wondering|trying to))/i,
    ];

    if (preamblePatterns.some((p) => p.test(firstSentence))) {
      issues.push({
        ruleId: 'rule-98',
        severity: 'high',
        title: 'Content starts with preamble',
        description:
          'The first sentence is meta-commentary rather than providing direct value.',
        currentValue: firstSentence.slice(0, 80),
        exampleFix: 'Start with the answer or key information directly.',
      });
    }
  }

  splitParagraphs(text: string): string[] {
    return text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  getSignificantWords(text: string): Set<string> {
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'shall',
      'to',
      'of',
      'in',
      'for',
      'on',
      'with',
      'at',
      'by',
      'from',
      'and',
      'or',
      'but',
      'not',
      'if',
      'this',
      'that',
      'it',
      'as',
    ]);
    return new Set(
      text
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 2 && !stopWords.has(w))
    );
  }

  jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) return 0;
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }
}
