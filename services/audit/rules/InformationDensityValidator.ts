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
    this.checkStopWordRatio(text, issues); // Rule 99 - Stop word ratio <30%
    this.checkFactDensity(text, issues); // Rule 100 - Facts per 100 words
    this.checkInformationDensityScore(text, issues); // Rule 101 - Composite IDS

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

  /**
   * Rule 99: Stop word ratio should be <30%.
   * High stop word ratio indicates low information density.
   */
  checkStopWordRatio(text: string, issues: DensityIssue[]): void {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
      'on', 'with', 'at', 'by', 'from', 'and', 'or', 'but', 'not', 'if',
      'this', 'that', 'it', 'its', 'as', 'so', 'than', 'then', 'too',
      'also', 'very', 'just', 'about', 'up', 'out', 'no', 'only', 'into',
      'over', 'after', 'before', 'between', 'through', 'during', 'each',
      'all', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
      'own', 'same', 'any', 'what', 'which', 'who', 'whom', 'when',
      'where', 'why', 'how', 'here', 'there', 'their', 'they', 'them',
      'he', 'she', 'him', 'her', 'his', 'we', 'our', 'us', 'you', 'your',
      'me', 'my', 'i', 'am',
    ]);

    const words = text.toLowerCase().replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0);
    if (words.length < 50) return;

    const stopCount = words.filter(w => stopWords.has(w)).length;
    const ratio = stopCount / words.length;

    if (ratio > 0.30) {
      issues.push({
        ruleId: 'rule-99',
        severity: 'medium',
        title: 'High stop word ratio',
        description: `Stop word ratio is ${Math.round(ratio * 100)}% (target: <30%). ${stopCount} of ${words.length} words are stop words.`,
        currentValue: `${Math.round(ratio * 100)}%`,
        exampleFix: 'Replace filler with specific entities, attributes, and data points.',
      });
    }
  }

  /**
   * Rule 100: Fact density (facts per 100 words).
   * Counts numbers, proper nouns, technical terms, and specific data.
   */
  checkFactDensity(text: string, issues: DensityIssue[]): void {
    const words = text.split(/\s+/).length;
    if (words < 100) return;

    let factIndicators = 0;

    // Numbers and measurements
    const numbers = text.match(/\b\d+(?:\.\d+)?(?:\s*%|px|em|rem|KB|MB|GB|ms|s|kg|g|m|cm|mm|km|°[CF])?\b/g);
    factIndicators += (numbers?.length || 0);

    // Proper nouns (capitalized words mid-sentence)
    const properNouns = text.match(/(?<=[.!?]\s+\w+\s+)[A-Z][a-z]{2,}/g);
    factIndicators += (properNouns?.length || 0);

    // Years
    const years = text.match(/\b(19|20)\d{2}\b/g);
    factIndicators += (years?.length || 0);

    // Technical terms in backticks/code
    const codeTerms = text.match(/`[^`]+`/g);
    factIndicators += (codeTerms?.length || 0);

    const factsPer100 = (factIndicators / words) * 100;

    if (factsPer100 < 3) {
      issues.push({
        ruleId: 'rule-100',
        severity: 'medium',
        title: 'Low fact density',
        description: `Only ${factsPer100.toFixed(1)} factual data points per 100 words (target: 3+). Content lacks specific numbers, entities, and concrete data.`,
        currentValue: `${factsPer100.toFixed(1)} facts/100 words`,
        exampleFix: 'Add specific numbers, measurements, dates, entity names, and concrete data points.',
      });
    }
  }

  /**
   * Rule 101: Information Density Score (IDS) - composite metric.
   * IDS = (1 - stopWordRatio) × factDensity × (1 - redundancyScore)
   * Target: IDS > 2.0
   */
  checkInformationDensityScore(text: string, issues: DensityIssue[]): void {
    const words = text.toLowerCase().replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0);
    if (words.length < 100) return;

    // Stop word component
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
      'on', 'with', 'at', 'by', 'from', 'and', 'or', 'but', 'not', 'if',
      'this', 'that', 'it', 'as', 'so', 'than', 'also', 'very', 'just',
    ]);
    const stopRatio = words.filter(w => stopWords.has(w)).length / words.length;

    // Fact density component
    let facts = 0;
    const numbers = text.match(/\b\d+(?:\.\d+)?\b/g);
    facts += (numbers?.length || 0);
    const properNouns = text.match(/(?<=[.!?]\s+\w+\s+)[A-Z][a-z]{2,}/g);
    facts += (properNouns?.length || 0);
    const factDensity = (facts / words.length) * 100;

    // Redundancy component (simplified)
    const paragraphs = this.splitParagraphs(text);
    let redundantPairs = 0;
    for (let i = 0; i < paragraphs.length - 1; i++) {
      const sim = this.jaccardSimilarity(
        this.getSignificantWords(paragraphs[i]),
        this.getSignificantWords(paragraphs[i + 1])
      );
      if (sim >= 0.4) redundantPairs++;
    }
    const redundancyScore = paragraphs.length > 1 ? redundantPairs / (paragraphs.length - 1) : 0;

    // Composite IDS
    const ids = (1 - stopRatio) * factDensity * (1 - redundancyScore);

    if (ids < 2.0) {
      issues.push({
        ruleId: 'rule-101',
        severity: 'medium',
        title: 'Low Information Density Score (IDS)',
        description: `IDS = ${ids.toFixed(2)} (target: >2.0). Components: stop ratio ${Math.round(stopRatio * 100)}%, fact density ${factDensity.toFixed(1)}/100w, redundancy ${Math.round(redundancyScore * 100)}%.`,
        currentValue: ids.toFixed(2),
        exampleFix: 'Increase information density by reducing filler words, adding specific data, and removing repetitive content.',
      });
    }
  }
}
