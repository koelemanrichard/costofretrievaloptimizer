/**
 * HtmlTechnicalValidator
 *
 * Standalone validator for HTML technical P1 rules that checks common
 * structural and performance issues in page HTML.
 *
 * Rules implemented:
 *   233 - Content should be wrapped in <article>
 *   239 - Only one <main> element per page
 *   244 - No pseudo-headings (bold text or large font used instead of h-tags)
 *   255 - Images should be unique per page (no duplicate src)
 *   258 - Images should have loading="lazy" (except above fold)
 *   261 - Images should have width and height attributes
 */

export interface HtmlTechIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class HtmlTechnicalValidator {
  /**
   * Run all HTML technical checks against the provided HTML string.
   * Returns an array of issues found (empty array = clean).
   */
  validate(html: string): HtmlTechIssue[] {
    const issues: HtmlTechIssue[] = [];

    this.checkArticleWrapper(html, issues);    // Rule 233
    this.checkSingleMain(html, issues);        // Rule 239
    this.checkPseudoHeadings(html, issues);    // Rule 244
    this.checkImageRules(html, issues);        // Rules 255, 258, 261

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Rule 233: Content should be wrapped in <article>
  // ---------------------------------------------------------------------------

  private checkArticleWrapper(html: string, issues: HtmlTechIssue[]): void {
    if (!/<article\b/i.test(html)) {
      issues.push({
        ruleId: 'rule-233',
        severity: 'medium',
        title: 'Content not wrapped in <article>',
        description:
          'Main content should be wrapped in a semantic <article> element. ' +
          'This helps search engines identify the primary content area and improves ' +
          'accessibility for screen readers.',
        exampleFix: 'Wrap the main article content in an <article> tag.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 239: Only one <main> element per page
  // ---------------------------------------------------------------------------

  private checkSingleMain(html: string, issues: HtmlTechIssue[]): void {
    const mainCount = (html.match(/<main\b/gi) || []).length;
    if (mainCount > 1) {
      issues.push({
        ruleId: 'rule-239',
        severity: 'high',
        title: 'Multiple <main> elements',
        description:
          `Found ${mainCount} <main> elements. The HTML spec allows only one visible <main> ` +
          'element per page. Multiple <main> elements confuse assistive technologies and ' +
          'may cause search engines to misidentify the primary content area.',
        exampleFix: 'Use a single <main> element containing the primary content.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 244: No pseudo-headings
  // ---------------------------------------------------------------------------

  private checkPseudoHeadings(html: string, issues: HtmlTechIssue[]): void {
    // Detect <p><strong>Text</strong></p> or <p><b>Text</b></p> patterns (likely pseudo-headings)
    const pseudoHeadingPattern =
      /<p[^>]*>\s*<(?:strong|b)>([^<]{5,80})<\/(?:strong|b)>\s*<\/p>/gi;
    const pseudoHeadings: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = pseudoHeadingPattern.exec(html)) !== null) {
      pseudoHeadings.push(match[1].trim());
    }

    // Also detect font-size styled pseudo-headings
    const fontSizePattern =
      /style=["'][^"']*font-size:\s*(1\.[5-9]|[2-9]|[1-9]\d+)(em|rem|px)/gi;
    const styledCount = (html.match(fontSizePattern) || []).length;

    if (pseudoHeadings.length > 0 || styledCount > 2) {
      issues.push({
        ruleId: 'rule-244',
        severity: 'medium',
        title: 'Pseudo-headings detected',
        description:
          `Found ${pseudoHeadings.length} bold-as-heading pattern(s) and ${styledCount} ` +
          'font-size styled text element(s). Use proper <h2>-<h6> tags instead of styling ' +
          'text to look like headings. Semantic headings are critical for document outline ' +
          'and search-engine heading parsers.',
        affectedElement:
          pseudoHeadings.length > 0
            ? pseudoHeadings.slice(0, 3).join(', ')
            : undefined,
        exampleFix: 'Replace <p><strong>Title</strong></p> with <h2>Title</h2>.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rules 255, 258, 261: Image rules
  // ---------------------------------------------------------------------------

  private checkImageRules(html: string, issues: HtmlTechIssue[]): void {
    const imgRegex = /<img\b[^>]*>/gi;
    let match: RegExpExecArray | null;
    const srcs: string[] = [];
    let noLazy = 0;
    let noDimensions = 0;
    let total = 0;

    while ((match = imgRegex.exec(html)) !== null) {
      total++;
      const tag = match[0];

      // Collect src for duplicate detection (rule 255)
      const srcMatch = tag.match(/src=["']([^"']+)["']/i);
      if (srcMatch) srcs.push(srcMatch[1]);

      // Rule 258: lazy loading (skip first image — assumed above fold)
      if (!/loading\s*=\s*["'](lazy|eager)["']/i.test(tag) && total > 1) {
        noLazy++;
      }

      // Rule 261: dimensions
      const hasWidth = /width\s*=/i.test(tag);
      const hasHeight = /height\s*=/i.test(tag);
      if (!hasWidth || !hasHeight) {
        noDimensions++;
      }
    }

    // Rule 255: unique images
    const uniqueSrcs = new Set(srcs);
    if (uniqueSrcs.size < srcs.length) {
      issues.push({
        ruleId: 'rule-255',
        severity: 'low',
        title: 'Duplicate images on page',
        description:
          `${srcs.length - uniqueSrcs.size} duplicate image src(s) found. ` +
          'Duplicate images add no informational value and may signal low-quality content.',
        exampleFix: 'Use unique images. Remove duplicates or vary with different views.',
      });
    }

    // Rule 258: lazy loading
    if (noLazy > 0) {
      issues.push({
        ruleId: 'rule-258',
        severity: 'medium',
        title: 'Images missing lazy loading',
        description:
          `${noLazy} image(s) lack a loading="lazy" attribute. Lazy loading defers ` +
          'off-screen images, improving initial page load speed (a Core Web Vitals factor).',
        exampleFix: 'Add loading="lazy" to images below the fold.',
      });
    }

    // Rule 261: dimensions
    if (noDimensions > 0) {
      issues.push({
        ruleId: 'rule-261',
        severity: 'medium',
        title: 'Images missing dimensions',
        description:
          `${noDimensions} image(s) lack width/height attributes, causing layout shift ` +
          '(CLS). Browsers cannot reserve space for the image before it loads without ' +
          'explicit dimensions.',
        exampleFix: 'Add width and height attributes to all <img> tags.',
      });
    }
  }
}
