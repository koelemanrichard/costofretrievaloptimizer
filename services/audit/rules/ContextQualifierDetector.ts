/**
 * ContextQualifierDetector
 *
 * Validates that content uses appropriate context qualifiers to make
 * statements precise and credible.
 *
 * Rules implemented:
 *   85 - Temporal qualifiers for time-sensitive statements
 *   86 - Spatial/geographic qualifiers for location-dependent statements
 *   87 - Conditional qualifiers for recommendations
 *   88 - Source attribution for claims
 *   89 - Comparative context with baselines
 *   90 - Audience qualifiers for advice
 *   91 - Version/edition qualifiers for technical content
 *   92 - Methodology qualifiers for data claims
 *   93 - Certainty qualifiers distinguishing facts from opinions
 */

export interface ContextQualifierIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class ContextQualifierDetector {
  validate(text: string): ContextQualifierIssue[] {
    const issues: ContextQualifierIssue[] = [];

    if (!text || text.trim().length === 0) return issues;

    const sentences = this.splitSentences(text);

    this.checkTemporalQualifiers(sentences, issues); // Rule 85
    this.checkSpatialQualifiers(sentences, issues); // Rule 86
    this.checkConditionalQualifiers(sentences, issues); // Rule 87
    this.checkSourceAttribution(sentences, issues); // Rule 88
    this.checkComparativeContext(sentences, issues); // Rule 89
    this.checkAudienceQualifiers(sentences, issues); // Rule 90
    this.checkVersionQualifiers(sentences, issues); // Rule 91
    this.checkMethodologyQualifiers(sentences, issues); // Rule 92
    this.checkCertaintyQualifiers(sentences, issues); // Rule 93

    return issues;
  }

  /**
   * Rule 85 (medium): Temporal qualifiers
   *
   * Statements with numbers/stats/percentages should include temporal context
   * ("as of 2024", "in Q3 2023", "since version 3.0", "currently").
   * Only flag if >3 such unqualified stats found.
   */
  private checkTemporalQualifiers(
    sentences: string[],
    issues: ContextQualifierIssue[]
  ): void {
    const statPatterns =
      /(?:\d+%|\$[\d,]+(?:\.\d+)?(?:\s*(?:billion|million|thousand|k|m|b))?|\d+(?:,\d{3})+|\d+\s+(?:users|customers|teams|companies|organizations|employees|developers|respondents|participants))/i;

    const temporalMarkers =
      /\b(?:20\d{2}|19\d{2}|as of|in Q[1-4]|since|currently|at the time of writing|this year|last year|in \d{4}|year[\s-]over[\s-]year|quarter|annually|monthly|recently)\b/i;

    let unqualifiedCount = 0;
    const examples: string[] = [];

    for (const sentence of sentences) {
      if (statPatterns.test(sentence) && !temporalMarkers.test(sentence)) {
        unqualifiedCount++;
        if (examples.length < 2) {
          examples.push(sentence.trim().slice(0, 80));
        }
      }
    }

    if (unqualifiedCount > 3) {
      issues.push({
        ruleId: 'rule-85',
        severity: 'medium',
        title: 'Statistics lack temporal context',
        description: `${unqualifiedCount} statement(s) contain numbers or statistics without temporal qualifiers. Time-sensitive data should specify when it was accurate.`,
        affectedElement: examples[0],
        exampleFix:
          'Add temporal context: "As of 2024, 85% of teams..." or "In Q3 2023, revenue reached $2.1M".',
      });
    }
  }

  /**
   * Rule 86 (medium): Spatial/geographic qualifiers
   *
   * Location-dependent statements (cost, price, salary, regulation, law, tax,
   * compliance) should specify geography. Only flag if >2 found.
   */
  private checkSpatialQualifiers(
    sentences: string[],
    issues: ContextQualifierIssue[]
  ): void {
    const locationDependentPatterns =
      /\b(?:cost[s]?|price[s]?|pricing|salary|salaries|wage[s]?|regulation[s]?|law[s]?|tax(?:es|ation)?|compliance|legal(?:ly)?|minimum wage|insurance|healthcare|rent)\b/i;

    const geographicMarkers =
      /\b(?:in the (?:US|UK|EU|USA|U\.S\.|United States|United Kingdom)|in (?:Europe|Asia|Africa|America|Australia|Canada|Germany|France|Japan|China|India|Brazil)|across|globally|worldwide|region(?:al|ally)?|country|countries|international(?:ly)?|domestic(?:ally)?|local(?:ly)?)\b/i;

    let unqualifiedCount = 0;
    const examples: string[] = [];

    for (const sentence of sentences) {
      if (
        locationDependentPatterns.test(sentence) &&
        !geographicMarkers.test(sentence)
      ) {
        unqualifiedCount++;
        if (examples.length < 2) {
          examples.push(sentence.trim().slice(0, 80));
        }
      }
    }

    if (unqualifiedCount > 2) {
      issues.push({
        ruleId: 'rule-86',
        severity: 'medium',
        title: 'Location-dependent statements lack geographic context',
        description: `${unqualifiedCount} statement(s) about location-sensitive topics (cost, regulation, salary, etc.) lack geographic qualifiers.`,
        affectedElement: examples[0],
        exampleFix:
          'Specify geography: "In the US, the average salary..." or "EU regulations require...".',
      });
    }
  }

  /**
   * Rule 87 (medium): Conditional qualifiers
   *
   * Recommendations ("should", "must", "recommend", "best practice") should
   * specify conditions. Only flag if >3 unconditional recommendations.
   */
  private checkConditionalQualifiers(
    sentences: string[],
    issues: ContextQualifierIssue[]
  ): void {
    const recommendationPatterns =
      /\b(?:should|must|recommend(?:ed)?|best practice|it is (?:essential|important|crucial|critical|necessary)|always use|never use)\b/i;

    const conditionalMarkers =
      /\b(?:if|when|for (?:teams|projects|organizations|applications|companies|users)|unless|depending on|in cases where|provided that|assuming|for [\w]+ larger than|for [\w]+ smaller than|when [\w]+ exceeds?)\b/i;

    let unconditionalCount = 0;
    const examples: string[] = [];

    for (const sentence of sentences) {
      if (
        recommendationPatterns.test(sentence) &&
        !conditionalMarkers.test(sentence)
      ) {
        unconditionalCount++;
        if (examples.length < 2) {
          examples.push(sentence.trim().slice(0, 80));
        }
      }
    }

    if (unconditionalCount > 3) {
      issues.push({
        ruleId: 'rule-87',
        severity: 'medium',
        title: 'Recommendations lack conditional context',
        description: `${unconditionalCount} recommendation(s) do not specify conditions under which they apply.`,
        affectedElement: examples[0],
        exampleFix:
          'Add conditions: "For teams larger than 10, you should..." or "When budget exceeds $1000, we recommend...".',
      });
    }
  }

  /**
   * Rule 88 (low): Source attribution
   *
   * Claims ("studies show", "research indicates", "data shows", "experts say")
   * should attribute sources. Only flag if >2 unattributed claims.
   */
  private checkSourceAttribution(
    sentences: string[],
    issues: ContextQualifierIssue[]
  ): void {
    const claimPatterns =
      /\b(?:studies show|research (?:indicates?|shows?|suggests?|has shown|confirms?)|data (?:shows?|indicates?|suggests?|confirms?)|experts? (?:say|agree|recommend|suggest|believe)|statistics (?:show|indicate|suggest|reveal)|reports? (?:show|indicate|suggest|reveal)|evidence (?:shows?|suggests?|indicates?))\b/i;

    const attributionMarkers =
      /\b(?:according to|based on|per|as reported by|as noted by|as published (?:in|by)|cited (?:in|by)|from (?:a |the )?(?:\d{4}\s)?(?:study|report|survey|analysis)|(?:Gartner|Forrester|McKinsey|Deloitte|Harvard|Stanford|MIT|Google|Microsoft|Amazon|IBM))\b/i;

    let unattributedCount = 0;
    const examples: string[] = [];

    for (const sentence of sentences) {
      if (claimPatterns.test(sentence) && !attributionMarkers.test(sentence)) {
        unattributedCount++;
        if (examples.length < 2) {
          examples.push(sentence.trim().slice(0, 80));
        }
      }
    }

    if (unattributedCount > 2) {
      issues.push({
        ruleId: 'rule-88',
        severity: 'low',
        title: 'Claims lack source attribution',
        description: `${unattributedCount} claim(s) reference studies or research without attributing specific sources.`,
        affectedElement: examples[0],
        exampleFix:
          'Attribute sources: "According to Gartner\'s 2024 report..." or "Based on a study by Stanford...".',
      });
    }
  }

  /**
   * Rule 89 (low): Comparative context
   *
   * Comparisons ("faster", "better", "cheaper", "more efficient", "X% more/less")
   * should specify the baseline. Only flag if >2 baseless comparisons.
   */
  private checkComparativeContext(
    sentences: string[],
    issues: ContextQualifierIssue[]
  ): void {
    const comparativePatterns =
      /\b(?:faster|slower|better|worse|cheaper|more expensive|more efficient|less efficient|more effective|less effective|more reliable|more scalable|more secure|higher|lower|greater|fewer|\d+%\s+(?:more|less|higher|lower|faster|slower|better|cheaper|greater|fewer))\b/i;

    const baselineMarkers =
      /\b(?:than|compared to|versus|vs\.?|relative to|over|against|benchmarked against|in comparison (?:to|with))\b/i;

    let baselessCount = 0;
    const examples: string[] = [];

    for (const sentence of sentences) {
      if (
        comparativePatterns.test(sentence) &&
        !baselineMarkers.test(sentence)
      ) {
        baselessCount++;
        if (examples.length < 2) {
          examples.push(sentence.trim().slice(0, 80));
        }
      }
    }

    if (baselessCount > 2) {
      issues.push({
        ruleId: 'rule-89',
        severity: 'low',
        title: 'Comparisons lack baseline context',
        description: `${baselessCount} comparison(s) do not specify what is being compared against.`,
        affectedElement: examples[0],
        exampleFix:
          'Specify baselines: "40% faster than v2.0" or "cheaper compared to the industry average".',
      });
    }
  }

  /**
   * Rule 90 (medium): Audience qualifiers
   *
   * Advice ("you should", "we recommend", "it's best to") should specify who
   * it applies to. Only flag if >3 unspecified.
   */
  private checkAudienceQualifiers(
    sentences: string[],
    issues: ContextQualifierIssue[]
  ): void {
    const advicePatterns =
      /\b(?:you should|we recommend|it(?:'s| is) best to|you need to|you(?:'ll| will) want to|make sure (?:to|you)|be sure to|consider using|start (?:by|with))\b/i;

    const audienceMarkers =
      /\b(?:for (?:beginners|experts|advanced users|developers|teams|enterprises|startups|small businesses|freelancers|designers|managers|administrators)|if you(?:'re| are) (?:a |an )?(?:beginner|developer|designer|manager|team lead|new to)|(?:enterprise|small|large) teams? should|developers (?:who|familiar with|experienced in)|those (?:who|with)|anyone (?:who|with)|professionals (?:who|with))\b/i;

    let unspecifiedCount = 0;
    const examples: string[] = [];

    for (const sentence of sentences) {
      if (advicePatterns.test(sentence) && !audienceMarkers.test(sentence)) {
        unspecifiedCount++;
        if (examples.length < 2) {
          examples.push(sentence.trim().slice(0, 80));
        }
      }
    }

    if (unspecifiedCount > 3) {
      issues.push({
        ruleId: 'rule-90',
        severity: 'medium',
        title: 'Advice lacks audience specification',
        description: `${unspecifiedCount} piece(s) of advice do not specify the intended audience.`,
        affectedElement: examples[0],
        exampleFix:
          'Specify audience: "For beginners, you should..." or "Enterprise teams should consider...".',
      });
    }
  }

  /**
   * Rule 91 (low): Version/edition qualifiers
   *
   * Technical content mentioning technology names should specify versions.
   * Only flag if >3 unversioned tech mentions.
   */
  private checkVersionQualifiers(
    sentences: string[],
    issues: ContextQualifierIssue[]
  ): void {
    // Common technology names that benefit from version specification
    const techNames = [
      'React',
      'Angular',
      'Vue',
      'Next\\.js',
      'Nuxt',
      'Svelte',
      'Node\\.js',
      'Deno',
      'Python',
      'Java',
      'TypeScript',
      'JavaScript',
      'PHP',
      'Ruby',
      'Go',
      'Rust',
      'Swift',
      'Kotlin',
      'PostgreSQL',
      'MySQL',
      'MongoDB',
      'Redis',
      'Elasticsearch',
      'Docker',
      'Kubernetes',
      'Terraform',
      'Webpack',
      'Vite',
      'ESLint',
      'Jest',
      'Vitest',
      'Playwright',
      'Cypress',
      'AWS',
      'Azure',
      'Tailwind(?:\\s?CSS)?',
      'Bootstrap',
      'Express',
      'Django',
      'Flask',
      'Spring\\s?Boot',
      'Laravel',
      'Rails',
      'Gatsby',
      'Remix',
    ];

    // Build a combined regex to match technology names
    const techPattern = new RegExp(
      `\\b(?:${techNames.join('|')})\\b`,
      'gi'
    );

    // Version patterns that follow or precede a tech name
    const versionPattern =
      /(?:\s+v?\d+(?:\.\d+)*(?:\.\d+)?|\s+\d{4}|\s+(?:LTS|latest|stable|beta|alpha|RC\d*))/i;

    let unversionedCount = 0;
    const seenTechs = new Set<string>();

    for (const sentence of sentences) {
      let match;
      // Reset lastIndex before each sentence
      techPattern.lastIndex = 0;
      while ((match = techPattern.exec(sentence)) !== null) {
        const techName = match[0];
        const afterMatch = sentence.slice(match.index + techName.length);
        const beforeMatch = sentence.slice(
          Math.max(0, match.index - 10),
          match.index
        );

        const hasVersionAfter = versionPattern.test(
          afterMatch.slice(0, 15)
        );
        const hasVersionBefore = /v?\d+(?:\.\d+)+\s*$/.test(beforeMatch);

        if (!hasVersionAfter && !hasVersionBefore) {
          const normalizedTech = techName.toLowerCase();
          if (!seenTechs.has(normalizedTech)) {
            seenTechs.add(normalizedTech);
            unversionedCount++;
          }
        }
      }
    }

    if (unversionedCount > 3) {
      issues.push({
        ruleId: 'rule-91',
        severity: 'low',
        title: 'Technology mentions lack version numbers',
        description: `${unversionedCount} technology mention(s) do not specify version numbers. Version context helps readers assess relevance.`,
        exampleFix:
          'Specify versions: "React 18", "Python 3.11", "PostgreSQL 15", "Node.js 20 LTS".',
      });
    }
  }

  /**
   * Rule 92 (low): Methodology qualifiers
   *
   * Data claims (percentages, survey, study, benchmark, analysis) should
   * mention methodology. Only flag if >2 unmethodologied claims.
   */
  private checkMethodologyQualifiers(
    sentences: string[],
    issues: ContextQualifierIssue[]
  ): void {
    const dataClaimPatterns =
      /\b(?:\d+%\s+of|survey(?:ed|s)?|(?:our |the |a )?study|benchmark(?:ed|s|ing)?|(?:our |the |a )?analysis|(?:our |the |a )?research found|polling|(?:our |the |a )?test(?:ing|s|ed)? (?:showed?|revealed?|found|confirmed?))\b/i;

    const methodologyMarkers =
      /\b(?:based on|using|measured (?:with|using|by)|conducted (?:with|using|by|across|among)|sample (?:of|size)|(?:n|N)\s*=\s*\d+|respondents?|participants?|(?:across|among|surveyed|polled|tested)\s+\d+|methodology|method(?:s)?|(?:controlled|randomized|double-blind)\s+(?:study|trial|experiment)|Lighthouse|PageSpeed|GTmetrix|WebPageTest)\b/i;

    let unmethodologiedCount = 0;
    const examples: string[] = [];

    for (const sentence of sentences) {
      if (
        dataClaimPatterns.test(sentence) &&
        !methodologyMarkers.test(sentence)
      ) {
        unmethodologiedCount++;
        if (examples.length < 2) {
          examples.push(sentence.trim().slice(0, 80));
        }
      }
    }

    if (unmethodologiedCount > 2) {
      issues.push({
        ruleId: 'rule-92',
        severity: 'low',
        title: 'Data claims lack methodology context',
        description: `${unmethodologiedCount} data claim(s) do not mention the methodology used to collect the data.`,
        affectedElement: examples[0],
        exampleFix:
          'Add methodology: "Based on a survey of 500 users..." or "Measured using Lighthouse 11...".',
      });
    }
  }

  /**
   * Rule 93 (medium): Certainty qualifiers
   *
   * Distinguish facts from opinions. Flag content where strong assertions
   * vastly outnumber hedged language (ratio >4:1).
   */
  private checkCertaintyQualifiers(
    sentences: string[],
    issues: ContextQualifierIssue[]
  ): void {
    const strongAssertionPatterns =
      /\b(?:is the best|is the worst|always works?|never fails?|guaranteed to|undoubtedly|without question|unquestionably|definitely the|clearly the|obviously the|is always|is never|will always|will never|impossible to|certain(?:ly)? (?:is|will|the))\b/i;

    const hedgingPatterns =
      /\b(?:studies suggest|research suggests?|tends? to|often|in most cases|typically|generally|it appears|may be|might be|could be|likely|probably|arguably|some evidence suggests?|it seems|in our experience|anecdotally|depending on|it is possible)\b/i;

    let strongCount = 0;
    let hedgedCount = 0;

    for (const sentence of sentences) {
      if (strongAssertionPatterns.test(sentence)) {
        strongCount++;
      }
      if (hedgingPatterns.test(sentence)) {
        hedgedCount++;
      }
    }

    // Only flag if there are enough strong assertions and the ratio is too high
    if (strongCount > 4 && (hedgedCount === 0 || strongCount / hedgedCount > 4)) {
      issues.push({
        ruleId: 'rule-93',
        severity: 'medium',
        title: 'Excessive certainty without hedging',
        description: `Content contains ${strongCount} strong assertion(s) but only ${hedgedCount} hedged statement(s). Distinguish facts from opinions with appropriate qualifiers.`,
        exampleFix:
          'Use hedging where appropriate: "Studies suggest..." instead of "It is always the case that...", or "In most cases..." instead of "Always...".',
      });
    }
  }

  /**
   * Split text into sentences using common sentence-ending punctuation.
   */
  private splitSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
}
