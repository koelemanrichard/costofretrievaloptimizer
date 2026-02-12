/**
 * HtmlNestingValidator
 *
 * Validates HTML nesting rules to catch common structural errors that
 * cause browser quirks-mode corrections and hurt SEO rendering.
 *
 * Rules implemented:
 *   242 - <figure> must not be nested inside <p>
 *   243 - Block-level elements must not be nested inside <p>
 *   251 - Only one <h1> per page
 *   252 - No heading-level skips (e.g. h1 -> h3 without h2)
 */

export interface NestingIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

/**
 * Block-level elements that are invalid inside <p> per the HTML spec.
 * The spec states that <p> can only contain phrasing content.
 */
const BLOCK_ELEMENTS = [
  'div',
  'table',
  'ul',
  'ol',
  'blockquote',
  'pre',
  'section',
  'article',
  'aside',
  'header',
  'footer',
  'nav',
  'main',
] as const;

export class HtmlNestingValidator {
  /**
   * Run all nesting checks against the provided HTML string.
   * Returns an array of issues found (empty array = clean).
   */
  validate(html: string): NestingIssue[] {
    const issues: NestingIssue[] = [];

    this.checkFigureInP(html, issues);
    this.checkBlockInP(html, issues);
    this.checkMultipleH1(html, issues);
    this.checkHeadingSkip(html, issues);

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Rule 242: <figure> must NOT be nested inside <p>
  // ---------------------------------------------------------------------------

  private checkFigureInP(html: string, issues: NestingIssue[]): void {
    // Match <p> ... <figure ...> ... </p>  (non-greedy, case-insensitive)
    const pattern = /<p[\s>][\s\S]*?<figure[\s>][\s\S]*?<\/p>/gi;

    if (pattern.test(html)) {
      issues.push({
        ruleId: 'rule-242',
        severity: 'critical',
        title: '<figure> nested inside <p>',
        description:
          'A <figure> element was found inside a <p> tag. The HTML spec forbids block-level ' +
          'elements inside <p>; browsers will auto-close the paragraph, causing layout shifts ' +
          'and incorrect DOM structure that may confuse search-engine parsers.',
        affectedElement: '<p>...<figure>...</p>',
        exampleFix:
          'Move the <figure> element outside the <p> tag:\n' +
          '<p>Text before the figure.</p>\n' +
          '<figure><img src="x.jpg" alt="..." /></figure>\n' +
          '<p>Text after the figure.</p>',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 243: Block elements must NOT be inside <p>
  // ---------------------------------------------------------------------------

  private checkBlockInP(html: string, issues: NestingIssue[]): void {
    // Build a single alternation pattern for all block elements.
    // We intentionally exclude <figure> since it has its own dedicated rule (242).
    const blockTagPattern = BLOCK_ELEMENTS.join('|');
    const pattern = new RegExp(
      `<p[\\s>][\\s\\S]*?<(${blockTagPattern})[\\s>][\\s\\S]*?<\\/p>`,
      'gi'
    );

    let match: RegExpExecArray | null;
    const reportedTags = new Set<string>();

    while ((match = pattern.exec(html)) !== null) {
      const tag = match[1].toLowerCase();
      // Report each unique block tag type only once.
      if (!reportedTags.has(tag)) {
        reportedTags.add(tag);
        issues.push({
          ruleId: 'rule-243',
          severity: 'critical',
          title: `Block element <${tag}> nested inside <p>`,
          description:
            `A <${tag}> element was found inside a <p> tag. Per the HTML spec, <p> may only ` +
            'contain phrasing (inline) content. Browsers will forcibly close the paragraph, ' +
            'resulting in unexpected DOM structure and potential SEO impact.',
          affectedElement: `<p>...<${tag}>...</p>`,
          exampleFix:
            `Close the <p> before the <${tag}> and open a new one after:\n` +
            `<p>Text before.</p>\n<${tag}>...</${tag}>\n<p>Text after.</p>`,
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 251: Only ONE <h1> per page
  // ---------------------------------------------------------------------------

  private checkMultipleH1(html: string, issues: NestingIssue[]): void {
    const h1Matches = html.match(/<h1[\s>]/gi);
    const count = h1Matches ? h1Matches.length : 0;

    if (count > 1) {
      issues.push({
        ruleId: 'rule-251',
        severity: 'high',
        title: 'Multiple <h1> elements detected',
        description:
          `Found ${count} <h1> tags on the page. Best practice and most SEO guidelines ` +
          'recommend a single <h1> per page to clearly signal the primary topic to search engines.',
        affectedElement: `<h1> (${count} occurrences)`,
        exampleFix:
          'Keep one <h1> for the main title and demote the others to <h2> or lower.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 252: No heading level skips (e.g. h1 -> h3 without h2)
  // ---------------------------------------------------------------------------

  private checkHeadingSkip(html: string, issues: NestingIssue[]): void {
    // Extract all heading levels in document order.
    const headingPattern = /<h([1-6])[\s>]/gi;
    const levels: number[] = [];
    let match: RegExpExecArray | null;

    while ((match = headingPattern.exec(html)) !== null) {
      levels.push(parseInt(match[1], 10));
    }

    for (let i = 1; i < levels.length; i++) {
      const prev = levels[i - 1];
      const curr = levels[i];

      // A skip exists when the current level is deeper than prev by more than 1.
      // Going *up* (e.g. h3 -> h1) is fine — that's closing sections.
      if (curr > prev && curr - prev > 1) {
        issues.push({
          ruleId: 'rule-252',
          severity: 'medium',
          title: `Heading level skip: <h${prev}> to <h${curr}>`,
          description:
            `Found a heading level jump from <h${prev}> directly to <h${curr}>, ` +
            `skipping <h${prev + 1}>. This breaks the document outline and can confuse ` +
            'both screen readers and search-engine heading parsers.',
          affectedElement: `<h${curr}>`,
          exampleFix:
            `Add an intermediate <h${prev + 1}> between the <h${prev}> and <h${curr}>, ` +
            `or promote the <h${curr}> to <h${prev + 1}>.`,
        });
      }
    }
  }
}
