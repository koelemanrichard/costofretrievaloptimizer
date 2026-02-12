/**
 * HeadingAndDiscourseValidator
 *
 * Validates heading content quality and discourse integration patterns.
 *
 * Heading Rules:
 *   142 - Heading keyword density (max 2 repetitions of same significant word)
 *   143 - Heading semantic progression (intro -> core -> details -> conclusion)
 *   147 - Heading parallelism (sibling headings should use same grammatical pattern)
 *   149 - Heading uniqueness across sections (no near-duplicate headings at same level)
 *
 * Discourse Rules:
 *   150 - Section transitions (each section should begin with a transitional sentence)
 *   151 - Topic sentence presence (paragraphs should not start with continuation words)
 *   152 - Conclusion signals (final section should contain conclusion markers)
 *   153 - Introduction-conclusion alignment (intro themes revisited in conclusion)
 */

export interface HeadingDiscourseIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export interface HeadingDiscourseInput {
  /** Full text content */
  text: string;
  /** Headings extracted from content, in order */
  headings: Array<{ level: number; text: string }>;
  /** Optional: sections split by headings */
  sections?: string[];
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'it', 'its', 'this',
  'that', 'these', 'those', 'not', 'no', 'nor', 'so', 'if', 'as', 'up',
  'out', 'about', 'into', 'over', 'after', 'your', 'you', 'how', 'what',
  'when', 'where', 'why', 'who', 'which', 'all', 'each', 'every', 'both',
  'more', 'most', 'other', 'some', 'such', 'than', 'too', 'very',
]);

const TRANSITION_PHRASES = [
  'however', 'moreover', 'in contrast', 'building on', 'next',
  'additionally', 'with that in mind', 'turning to', 'as we saw',
  'furthermore', 'consequently', 'therefore', 'meanwhile',
  'nevertheless', 'in addition', 'on the other hand', 'as a result',
  'for example', 'similarly', 'likewise', 'that said', 'to that end',
  'given this', 'with this in mind', 'having established',
  'now that', 'moving on', 'let us now', 'following this',
];

const CONTINUATION_STARTERS = [
  'also,', 'additionally,', 'furthermore,', 'moreover,', 'besides,', 'plus,',
];

const CONCLUSION_MARKERS = [
  'in summary', 'to summarize', 'in conclusion', 'to conclude',
  'key takeaways', 'the bottom line', 'wrapping up', 'final thoughts',
  'to sum up', 'all in all', 'ultimately', 'in closing',
];

const INTRO_HEADING_PATTERNS = /^(introduction|overview|what is|about|getting started|background)/i;
const CONCLUSION_HEADING_PATTERNS = /^(conclusion|summary|final thoughts|key takeaways|wrapping up|in closing)/i;

export class HeadingAndDiscourseValidator {
  validate(input: HeadingDiscourseInput): HeadingDiscourseIssue[] {
    const issues: HeadingDiscourseIssue[] = [];

    // Heading rules
    if (input.headings.length > 0) {
      this.checkHeadingKeywordDensity(input.headings, issues);       // Rule 142
      this.checkHeadingSemanticProgression(input.headings, issues);   // Rule 143
      this.checkHeadingParallelism(input.headings, issues);           // Rule 147
      this.checkHeadingUniqueness(input.headings, issues);            // Rule 149
    }

    // Discourse rules
    const sections = input.sections || this.splitSections(input.text, input.headings);
    this.checkSectionTransitions(sections, issues);                    // Rule 150
    this.checkTopicSentencePresence(input.text, issues);               // Rule 151
    this.checkConclusionSignals(sections, input.headings, issues);     // Rule 152
    this.checkIntroductionConclusionAlignment(sections, issues);       // Rule 153

    return issues;
  }

  /**
   * Rule 142: Heading keyword density.
   * Extract significant words from all headings (remove stop words).
   * If any word appears >2 times across headings, flag.
   */
  checkHeadingKeywordDensity(
    headings: Array<{ level: number; text: string }>,
    issues: HeadingDiscourseIssue[]
  ): void {
    const wordFrequency = new Map<string, number>();

    for (const heading of headings) {
      const words = this.extractSignificantWords(heading.text);
      for (const word of words) {
        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
      }
    }

    const stuffedWords = [...wordFrequency.entries()]
      .filter(([, count]) => count > 2)
      .map(([word, count]) => `"${word}" (${count}x)`);

    if (stuffedWords.length > 0) {
      issues.push({
        ruleId: 'rule-142',
        severity: 'medium',
        title: 'Heading keyword density too high',
        description: `Significant words repeated more than twice across headings: ${stuffedWords.join(', ')}. This may signal keyword stuffing.`,
        exampleFix: 'Vary heading wording. Use synonyms or rephrase to avoid repetition.',
      });
    }
  }

  /**
   * Rule 143: Heading semantic progression.
   * Headings should follow a logical order: introduction at start,
   * conclusion at end, with core concepts in the middle.
   */
  checkHeadingSemanticProgression(
    headings: Array<{ level: number; text: string }>,
    issues: HeadingDiscourseIssue[]
  ): void {
    if (headings.length < 3) return;

    const problems: string[] = [];

    // Check: intro-like heading should be near the start (first 2 headings)
    const introIndex = headings.findIndex(h => INTRO_HEADING_PATTERNS.test(h.text));
    if (introIndex > 1) {
      problems.push(`Introduction-type heading "${headings[introIndex].text}" appears at position ${introIndex + 1} instead of near the start`);
    }

    // Check: conclusion-like heading should be near the end (last 2 headings)
    const conclusionIndices = headings
      .map((h, i) => CONCLUSION_HEADING_PATTERNS.test(h.text) ? i : -1)
      .filter(i => i !== -1);
    for (const ci of conclusionIndices) {
      if (ci < headings.length - 2) {
        problems.push(`Conclusion-type heading "${headings[ci].text}" appears at position ${ci + 1} instead of near the end`);
      }
    }

    if (problems.length > 0) {
      issues.push({
        ruleId: 'rule-143',
        severity: 'medium',
        title: 'Heading semantic progression issue',
        description: `Headings do not follow a logical progression. ${problems.join('. ')}.`,
        exampleFix: 'Reorder headings: Introduction/Overview first, core concepts in the middle, Conclusion/Summary last.',
      });
    }
  }

  /**
   * Rule 147: Heading parallelism.
   * Group sibling headings (same level). Check if they start with same grammatical pattern.
   * Flag if siblings have mixed patterns (>50% inconsistency).
   */
  checkHeadingParallelism(
    headings: Array<{ level: number; text: string }>,
    issues: HeadingDiscourseIssue[]
  ): void {
    // Group headings by level
    const byLevel = new Map<number, string[]>();
    for (const h of headings) {
      const existing = byLevel.get(h.level) || [];
      existing.push(h.text);
      byLevel.set(h.level, existing);
    }

    for (const [level, siblings] of byLevel.entries()) {
      if (siblings.length < 3) continue; // Need at least 3 to check parallelism

      const patterns = siblings.map(s => this.classifyHeadingPattern(s));
      const patternCounts = new Map<string, number>();
      for (const p of patterns) {
        patternCounts.set(p, (patternCounts.get(p) || 0) + 1);
      }

      // Find the dominant pattern
      let dominantPattern = '';
      let dominantCount = 0;
      for (const [pattern, count] of patternCounts.entries()) {
        if (count > dominantCount) {
          dominantCount = count;
          dominantPattern = pattern;
        }
      }

      // If the dominant pattern covers less than 50% of siblings, flag
      const consistencyRatio = dominantCount / siblings.length;
      if (consistencyRatio < 0.5) {
        const mixed = siblings
          .filter((_, i) => patterns[i] !== dominantPattern)
          .slice(0, 3)
          .map(s => `"${s}"`)
          .join(', ');

        issues.push({
          ruleId: 'rule-147',
          severity: 'medium',
          title: 'Heading parallelism inconsistent',
          description: `H${level} sibling headings use mixed grammatical patterns. Dominant: ${dominantPattern} (${dominantCount}/${siblings.length}). Inconsistent: ${mixed}.`,
          affectedElement: `H${level} headings`,
          exampleFix: 'Align sibling headings to use the same grammatical structure (all verbs, all nouns, all questions, etc.).',
        });
      }
    }
  }

  /**
   * Rule 149: Heading uniqueness across sections.
   * No two headings at the same level should be identical or near-identical (Jaccard >0.8).
   */
  checkHeadingUniqueness(
    headings: Array<{ level: number; text: string }>,
    issues: HeadingDiscourseIssue[]
  ): void {
    // Group headings by level
    const byLevel = new Map<number, Array<{ text: string; index: number }>>();
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      const existing = byLevel.get(h.level) || [];
      existing.push({ text: h.text, index: i });
      byLevel.set(h.level, existing);
    }

    const duplicatePairs: string[] = [];

    for (const [, siblings] of byLevel.entries()) {
      for (let i = 0; i < siblings.length; i++) {
        for (let j = i + 1; j < siblings.length; j++) {
          const similarity = this.jaccardSimilarity(
            siblings[i].text.toLowerCase(),
            siblings[j].text.toLowerCase()
          );
          if (similarity >= 0.8) {
            duplicatePairs.push(
              `"${siblings[i].text}" ~ "${siblings[j].text}" (${Math.round(similarity * 100)}% similar)`
            );
          }
        }
      }
    }

    if (duplicatePairs.length > 0) {
      issues.push({
        ruleId: 'rule-149',
        severity: 'low',
        title: 'Near-duplicate headings at same level',
        description: `Found near-identical headings: ${duplicatePairs.join('; ')}.`,
        exampleFix: 'Differentiate headings to clearly distinguish section content.',
      });
    }
  }

  /**
   * Rule 150: Section transitions.
   * Each section (except first) should begin with a transitional sentence.
   */
  checkSectionTransitions(
    sections: string[],
    issues: HeadingDiscourseIssue[]
  ): void {
    if (sections.length < 2) return;

    let missingSections = 0;
    const missingIndices: number[] = [];

    for (let i = 1; i < sections.length; i++) {
      const sectionText = sections[i].trim();
      if (!sectionText || sectionText.length < 20) continue;

      const firstSentence = this.getFirstSentence(sectionText).toLowerCase();
      const hasTransition = TRANSITION_PHRASES.some(phrase =>
        firstSentence.includes(phrase)
      );

      if (!hasTransition) {
        missingSections++;
        missingIndices.push(i + 1); // 1-based for display
      }
    }

    if (sections.length > 2 && missingSections > (sections.length - 1) * 0.5) {
      issues.push({
        ruleId: 'rule-150',
        severity: 'medium',
        title: 'Missing section transitions',
        description: `${missingSections} of ${sections.length - 1} sections lack a transitional opening sentence (sections ${missingIndices.slice(0, 5).join(', ')}${missingIndices.length > 5 ? '...' : ''}).`,
        exampleFix: 'Begin each section with a transition phrase like "Building on...", "However,...", "Turning to..." to connect ideas.',
      });
    }
  }

  /**
   * Rule 151: Topic sentence presence.
   * Each paragraph should start with a topic sentence, not a continuation word.
   */
  checkTopicSentencePresence(
    text: string,
    issues: HeadingDiscourseIssue[]
  ): void {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);
    if (paragraphs.length < 3) return;

    let continuationCount = 0;
    const offendingStarts: string[] = [];

    for (const para of paragraphs) {
      const trimmed = para.trim().toLowerCase();
      const matchedStarter = CONTINUATION_STARTERS.find(s => trimmed.startsWith(s));
      if (matchedStarter) {
        continuationCount++;
        offendingStarts.push(matchedStarter.replace(',', ''));
      }
    }

    if (continuationCount > 0) {
      issues.push({
        ruleId: 'rule-151',
        severity: 'medium',
        title: 'Paragraphs start with continuation words',
        description: `${continuationCount} paragraph(s) begin with continuation words (${[...new Set(offendingStarts)].join(', ')}) instead of proper topic sentences.`,
        exampleFix: 'Start each paragraph with a clear topic sentence that states the main point. Move "Also", "Additionally" mid-sentence.',
      });
    }
  }

  /**
   * Rule 152: Conclusion signals.
   * The final section should contain conclusion markers.
   */
  checkConclusionSignals(
    sections: string[],
    headings: Array<{ level: number; text: string }>,
    issues: HeadingDiscourseIssue[]
  ): void {
    if (sections.length < 2) return;

    const lastSection = sections[sections.length - 1].toLowerCase();
    if (lastSection.trim().length < 20) return;

    // Check if the last heading already indicates a conclusion
    const lastHeading = headings.length > 0 ? headings[headings.length - 1] : null;
    const headingIsConclusionLike = lastHeading
      ? CONCLUSION_HEADING_PATTERNS.test(lastHeading.text)
      : false;

    const hasMarker = CONCLUSION_MARKERS.some(marker =>
      lastSection.includes(marker)
    );

    if (!hasMarker && !headingIsConclusionLike) {
      issues.push({
        ruleId: 'rule-152',
        severity: 'low',
        title: 'Missing conclusion signals',
        description: 'The final section does not contain recognizable conclusion markers (e.g., "in summary", "key takeaways", "to conclude").',
        exampleFix: 'Add a concluding paragraph with summary markers like "In summary..." or "Key takeaways include...".',
      });
    }
  }

  /**
   * Rule 153: Introduction-conclusion alignment.
   * Key nouns from the introduction should reappear in the conclusion.
   * At least 30% of intro key nouns should be in the conclusion.
   */
  checkIntroductionConclusionAlignment(
    sections: string[],
    issues: HeadingDiscourseIssue[]
  ): void {
    if (sections.length < 2) return;

    const introSection = sections[0];
    const conclusionSection = sections[sections.length - 1];

    if (introSection.trim().length < 20 || conclusionSection.trim().length < 20) return;

    const introNouns = this.extractKeyNouns(introSection);
    if (introNouns.length < 3) return; // Not enough key nouns to compare

    const conclusionLower = conclusionSection.toLowerCase();
    const matchedNouns = introNouns.filter(noun => conclusionLower.includes(noun));

    const alignmentRatio = matchedNouns.length / introNouns.length;

    if (alignmentRatio < 0.3) {
      issues.push({
        ruleId: 'rule-153',
        severity: 'low',
        title: 'Introduction-conclusion misalignment',
        description: `Only ${matchedNouns.length} of ${introNouns.length} key themes from the introduction reappear in the conclusion (${Math.round(alignmentRatio * 100)}%). Aim for at least 30%.`,
        exampleFix: 'Revisit key themes from the introduction in your conclusion to create a cohesive narrative arc.',
      });
    }
  }

  // ---------- Helper methods ----------

  /** Extract significant (non-stop) words from text, lowercased */
  extractSignificantWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  }

  /** Classify heading grammatical pattern */
  classifyHeadingPattern(heading: string): string {
    const trimmed = heading.trim();

    // "How to..." pattern (must check before generic question pattern)
    if (/^how to\b/i.test(trimmed)) {
      return 'how-to';
    }

    // Question pattern
    if (/\?$/.test(trimmed) || /^(what|why|how|when|where|who|which|is|are|can|do|does)\b/i.test(trimmed)) {
      return 'question';
    }

    // Verb-starting (imperative) pattern
    if (/^(install|configure|deploy|create|build|set up|use|implement|add|remove|manage|optimize|check|run|test|write|design|plan|define|avoid|choose|compare|enable|disable|understand)\b/i.test(trimmed)) {
      return 'verb-imperative';
    }

    // Gerund pattern (-ing)
    if (/^[A-Z]?[a-z]*ing\b/.test(trimmed)) {
      return 'gerund';
    }

    // Noun phrase (default)
    return 'noun-phrase';
  }

  /** Calculate Jaccard similarity between two strings (word-level) */
  jaccardSimilarity(a: string, b: string): number {
    const setA = new Set(a.split(/\s+/).filter(w => w.length > 0));
    const setB = new Set(b.split(/\s+/).filter(w => w.length > 0));

    if (setA.size === 0 && setB.size === 0) return 1;

    let intersection = 0;
    for (const word of setA) {
      if (setB.has(word)) intersection++;
    }

    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  /** Split content into sections based on headings */
  splitSections(text: string, headings: Array<{ level: number; text: string }>): string[] {
    if (headings.length === 0) return [text];

    const sections: string[] = [];
    let remaining = text;

    for (const heading of headings) {
      const headingText = heading.text;
      const idx = remaining.indexOf(headingText);
      if (idx >= 0) {
        const before = remaining.slice(0, idx).trim();
        if (before.length > 0 || sections.length === 0) {
          sections.push(before);
        }
        remaining = remaining.slice(idx + headingText.length);
      }
    }

    // Push the last section
    if (remaining.trim().length > 0) {
      sections.push(remaining.trim());
    }

    return sections.length > 0 ? sections : [text];
  }

  /** Get the first sentence from a text block */
  getFirstSentence(text: string): string {
    const match = text.match(/^[^.!?]+[.!?]/);
    return match ? match[0] : text.slice(0, 150);
  }

  /** Extract key nouns from text (significant words that are likely nouns) */
  extractKeyNouns(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w));

    // Count frequency and return unique words that appear at least once
    const freq = new Map<string, number>();
    for (const w of words) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }

    // Return unique significant words, sorted by frequency (most common first)
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
  }
}
