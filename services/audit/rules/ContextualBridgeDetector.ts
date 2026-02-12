/**
 * ContextualBridgeDetector
 *
 * Validates the presence and quality of contextual bridges between related
 * content pages. Contextual bridges are paragraphs that create natural
 * context for linking to related pages.
 *
 * Rules implemented:
 *   154 - Bridge presence (related pages should have contextual bridges)
 *   155 - Bridge relevance (bridge text relevant to both source and target)
 *   156 - Bridge positioning (bridges should not be afterthoughts)
 *   157 - Bridge diversity (no copy-paste bridges)
 *   158 - Bridge completeness (≥3 bridges for pages with 5+ related pages)
 */

export interface BridgeContext {
  /** Current page text */
  text: string;
  /** Current page's primary topic */
  currentTopic: string;
  /** Related pages with their topics and optional bridge text */
  relatedPages: Array<{
    url: string;
    topic: string;
    anchorText?: string;
  }>;
  /** Paragraphs of the current page (auto-split from text if omitted) */
  paragraphs?: string[];
}

export interface BridgeIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class ContextualBridgeDetector {
  validate(input: BridgeContext): BridgeIssue[] {
    const issues: BridgeIssue[] = [];

    if (input.relatedPages.length === 0) {
      return issues;
    }

    const paragraphs =
      input.paragraphs ?? this.splitParagraphs(input.text);

    const bridgeMap = this.identifyBridges(paragraphs, input.relatedPages);

    this.checkBridgePresence(bridgeMap, input.relatedPages, issues); // Rule 154
    this.checkBridgeRelevance(bridgeMap, input.currentTopic, issues); // Rule 155
    this.checkBridgePositioning(bridgeMap, paragraphs, issues); // Rule 156
    this.checkBridgeDiversity(bridgeMap, input.relatedPages, issues); // Rule 157
    this.checkBridgeCompleteness(bridgeMap, input.relatedPages, issues); // Rule 158

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Bridge identification
  // ---------------------------------------------------------------------------

  /**
   * For each related page, find paragraphs that reference its topic.
   * A paragraph is a bridge if:
   *   - It contains the related topic (case-insensitive), OR
   *   - Its significant words overlap ≥30% with the related topic's words
   */
  identifyBridges(
    paragraphs: string[],
    relatedPages: BridgeContext['relatedPages']
  ): Map<string, { paragraphIndex: number; paragraphText: string }[]> {
    const bridgeMap = new Map<
      string,
      { paragraphIndex: number; paragraphText: string }[]
    >();

    for (const page of relatedPages) {
      const matches: { paragraphIndex: number; paragraphText: string }[] = [];
      const topicWords = this.getSignificantWords(page.topic);

      for (let i = 0; i < paragraphs.length; i++) {
        const para = paragraphs[i];
        const paraLower = para.toLowerCase();

        // Direct topic mention
        if (paraLower.includes(page.topic.toLowerCase())) {
          matches.push({ paragraphIndex: i, paragraphText: para });
          continue;
        }

        // Significant word overlap ≥30%
        if (topicWords.size > 0) {
          const paraWords = this.getSignificantWords(para);
          const overlap = this.overlapRatio(topicWords, paraWords);
          if (overlap >= 0.3) {
            matches.push({ paragraphIndex: i, paragraphText: para });
          }
        }
      }

      bridgeMap.set(page.url, matches);
    }

    return bridgeMap;
  }

  // ---------------------------------------------------------------------------
  // Rule 154: Bridge presence
  // ---------------------------------------------------------------------------

  checkBridgePresence(
    bridgeMap: Map<string, { paragraphIndex: number; paragraphText: string }[]>,
    relatedPages: BridgeContext['relatedPages'],
    issues: BridgeIssue[]
  ): void {
    const pagesWithBridges = [...bridgeMap.values()].filter(
      (m) => m.length > 0
    ).length;

    if (pagesWithBridges === 0 && relatedPages.length > 0) {
      issues.push({
        ruleId: 'rule-154',
        severity: 'medium',
        title: 'No contextual bridges found',
        description: `None of the ${relatedPages.length} related page(s) have a contextual bridge paragraph in the current content.`,
        exampleFix:
          'Add paragraphs that naturally reference concepts from related pages to create linking context.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 155: Bridge relevance
  // ---------------------------------------------------------------------------

  checkBridgeRelevance(
    bridgeMap: Map<string, { paragraphIndex: number; paragraphText: string }[]>,
    currentTopic: string,
    issues: BridgeIssue[]
  ): void {
    const currentTopicWords = this.getSignificantWords(currentTopic);
    let irrelevantCount = 0;

    for (const [, bridges] of bridgeMap) {
      for (const bridge of bridges) {
        const bridgeWords = this.getSignificantWords(bridge.paragraphText);
        const hasCurrentTopicWord = this.setsShareWord(
          currentTopicWords,
          bridgeWords
        );

        if (!hasCurrentTopicWord) {
          irrelevantCount++;
        }
      }
    }

    if (irrelevantCount > 0) {
      issues.push({
        ruleId: 'rule-155',
        severity: 'medium',
        title: 'Bridge text not relevant to current page',
        description: `${irrelevantCount} bridge paragraph(s) do not contain keywords from the current page topic "${currentTopic}".`,
        exampleFix:
          'Ensure bridge paragraphs mention concepts from both the current page and the target page.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 156: Bridge positioning
  // ---------------------------------------------------------------------------

  checkBridgePositioning(
    bridgeMap: Map<string, { paragraphIndex: number; paragraphText: string }[]>,
    paragraphs: string[],
    issues: BridgeIssue[]
  ): void {
    if (paragraphs.length < 2) return;

    const lastIndex = paragraphs.length - 1;
    let endBridgeCount = 0;

    for (const [, bridges] of bridgeMap) {
      for (const bridge of bridges) {
        if (bridge.paragraphIndex === lastIndex) {
          endBridgeCount++;
        }
      }
    }

    if (endBridgeCount > 0) {
      issues.push({
        ruleId: 'rule-156',
        severity: 'low',
        title: 'Bridge paragraphs placed at end of content',
        description: `${endBridgeCount} bridge(s) appear in the final paragraph, suggesting they are afterthoughts.`,
        exampleFix:
          'Move bridge content earlier in the article where it flows naturally with the surrounding content.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 157: Bridge diversity
  // ---------------------------------------------------------------------------

  checkBridgeDiversity(
    bridgeMap: Map<string, { paragraphIndex: number; paragraphText: string }[]>,
    relatedPages: BridgeContext['relatedPages'],
    issues: BridgeIssue[]
  ): void {
    // Check anchor text uniqueness
    const anchorTexts = relatedPages
      .filter((p) => p.anchorText && p.anchorText.trim().length > 0)
      .map((p) => p.anchorText!.toLowerCase().trim());

    if (anchorTexts.length > 1) {
      const uniqueAnchors = new Set(anchorTexts);
      if (uniqueAnchors.size < anchorTexts.length) {
        issues.push({
          ruleId: 'rule-157',
          severity: 'low',
          title: 'Duplicate bridge anchor text',
          description: `${anchorTexts.length - uniqueAnchors.size} duplicate anchor text(s) found across bridges to different pages.`,
          exampleFix:
            'Use unique, descriptive anchor text for each bridge link.',
        });
        return; // Already flagged
      }
    }

    // Check bridge paragraph similarity (Jaccard < 0.5)
    const allBridgeParagraphs: string[] = [];
    for (const [, bridges] of bridgeMap) {
      for (const bridge of bridges) {
        allBridgeParagraphs.push(bridge.paragraphText);
      }
    }

    if (allBridgeParagraphs.length > 1) {
      let similarPairs = 0;
      for (let i = 0; i < allBridgeParagraphs.length - 1; i++) {
        for (let j = i + 1; j < allBridgeParagraphs.length; j++) {
          const similarity = this.jaccardSimilarity(
            this.getSignificantWords(allBridgeParagraphs[i]),
            this.getSignificantWords(allBridgeParagraphs[j])
          );
          if (similarity >= 0.5) {
            similarPairs++;
          }
        }
      }

      if (similarPairs > 0) {
        issues.push({
          ruleId: 'rule-157',
          severity: 'low',
          title: 'Bridge paragraphs too similar',
          description: `${similarPairs} pair(s) of bridge paragraphs have ≥50% word overlap, suggesting copy-paste bridges.`,
          exampleFix:
            'Write unique bridge paragraphs tailored to each related page\'s context.',
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 158: Bridge completeness
  // ---------------------------------------------------------------------------

  checkBridgeCompleteness(
    bridgeMap: Map<string, { paragraphIndex: number; paragraphText: string }[]>,
    relatedPages: BridgeContext['relatedPages'],
    issues: BridgeIssue[]
  ): void {
    if (relatedPages.length < 5) return;

    const pagesWithBridges = [...bridgeMap.values()].filter(
      (m) => m.length > 0
    ).length;

    if (pagesWithBridges < 3) {
      issues.push({
        ruleId: 'rule-158',
        severity: 'medium',
        title: 'Incomplete bridge coverage',
        description: `Only ${pagesWithBridges} of ${relatedPages.length} related pages have contextual bridges. At least 3 are recommended.`,
        exampleFix:
          'Add bridge paragraphs for more related pages to strengthen topical interconnection.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  splitParagraphs(text: string): string[] {
    return text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  /**
   * Extract significant words from text, filtering out stop words.
   * Reuses the same stop-word set pattern as InformationDensityValidator.
   */
  getSignificantWords(text: string): Set<string> {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
      'on', 'with', 'at', 'by', 'from', 'and', 'or', 'but', 'not', 'if',
      'this', 'that', 'it', 'as', 'its', 'they', 'them', 'their', 'your',
      'you', 'we', 'our', 'more', 'also', 'about', 'how', 'what', 'which',
      'when', 'where', 'who', 'why', 'than', 'then', 'into', 'each',
    ]);
    return new Set(
      text
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 2 && !stopWords.has(w))
    );
  }

  /**
   * Ratio of words from setA that appear in setB.
   */
  overlapRatio(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0) return 0;
    let count = 0;
    for (const word of setA) {
      if (setB.has(word)) count++;
    }
    return count / setA.size;
  }

  /**
   * Check whether two sets share at least one word.
   */
  setsShareWord(setA: Set<string>, setB: Set<string>): boolean {
    for (const word of setA) {
      if (setB.has(word)) return true;
    }
    return false;
  }

  /**
   * Jaccard similarity between two sets.
   */
  jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) return 0;
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }
}
