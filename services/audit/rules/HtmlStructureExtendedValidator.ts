/**
 * HtmlStructureExtendedValidator
 *
 * Validates extended HTML structural rules that catch common quality issues
 * beyond basic nesting and semantic checks.
 *
 * Rules implemented:
 *   245 - No empty elements (<p>, <div>, <span> with no content)
 *   246 - No deprecated HTML tags (<font>, <center>, <strike>, <marquee>, <blink>, <big>, <small>)
 *   247 - Proper list usage (<ul>/<ol> should only contain <li> as direct children)
 *   248 - No inline styles (style="" attributes; prefer CSS classes)
 *   249 - Proper table structure (<table> should have <thead> with <th> elements)
 *   250 - No excessive nesting (elements nested >6 levels deep)
 *   251 - Semantic <article> tag usage in main content
 *   252 - Semantic <section> tag usage
 *   253 - Semantic <nav> tag for navigation
 *   254 - Images should be wrapped in <figure> + <figcaption>
 *   255b - ARIA landmarks for accessibility
 */

export interface HtmlStructureIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

/** Deprecated HTML tags that should no longer be used. */
const DEPRECATED_TAGS = ['font', 'center', 'strike', 'marquee', 'blink', 'big'] as const;

export class HtmlStructureExtendedValidator {
  /**
   * Run all HTML structure checks against the provided HTML string.
   * Returns an array of issues found (empty array = clean).
   */
  validate(html: string): HtmlStructureIssue[] {
    const issues: HtmlStructureIssue[] = [];

    this.checkEmptyElements(html, issues);       // Rule 245
    this.checkDeprecatedTags(html, issues);       // Rule 246
    this.checkListUsage(html, issues);            // Rule 247
    this.checkInlineStyles(html, issues);         // Rule 248
    this.checkTableStructure(html, issues);       // Rule 249
    this.checkExcessiveNesting(html, issues);     // Rule 250
    this.checkArticleTag(html, issues);           // Rule 251
    this.checkSectionTag(html, issues);           // Rule 252
    this.checkNavTag(html, issues);               // Rule 253
    this.checkFigureFigcaption(html, issues);     // Rule 254
    this.checkAriaLandmarks(html, issues);        // Rule 255b

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Rule 245: No empty elements
  // ---------------------------------------------------------------------------

  private checkEmptyElements(html: string, issues: HtmlStructureIssue[]): void {
    // Match empty <p>, <div>, or <span> tags (may contain only whitespace).
    // Also match self-referencing with attributes, e.g. <p class="x">  </p>
    const emptyPattern = /<(p|div|span)(\s[^>]*)?>(\s|&nbsp;)*<\/\1>/gi;
    const matches = html.match(emptyPattern);
    const count = matches ? matches.length : 0;

    if (count > 0) {
      issues.push({
        ruleId: 'rule-245',
        severity: 'low',
        title: 'Empty HTML elements detected',
        description:
          `Found ${count} empty element(s) (<p>, <div>, or <span> with no content). ` +
          'Empty elements add unnecessary DOM nodes, can cause unexpected spacing, ' +
          'and signal low-quality markup to search engines.',
        affectedElement: matches ? matches.slice(0, 3).join(', ') : undefined,
        exampleFix: 'Remove empty elements or add meaningful content inside them.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 246: No deprecated HTML tags
  // ---------------------------------------------------------------------------

  private checkDeprecatedTags(html: string, issues: HtmlStructureIssue[]): void {
    const tagPattern = new RegExp(
      `<(${DEPRECATED_TAGS.join('|')})\\b`,
      'gi'
    );
    const found = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = tagPattern.exec(html)) !== null) {
      found.add(match[1].toLowerCase());
    }

    if (found.size > 0) {
      const tagList = Array.from(found)
        .map(t => `<${t}>`)
        .join(', ');
      issues.push({
        ruleId: 'rule-246',
        severity: 'low',
        title: 'Deprecated HTML tags detected',
        description:
          `Found deprecated tag(s): ${tagList}. These tags are obsolete in HTML5 and ` +
          'should be replaced with modern CSS styling or semantic alternatives. ' +
          'Deprecated tags may not render consistently across browsers and signal ' +
          'outdated markup to search engines.',
        affectedElement: tagList,
        exampleFix:
          'Replace <font> with CSS font properties, <center> with CSS text-align, ' +
          '<strike> with <del> or CSS text-decoration, and remove <marquee>/<blink> entirely.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 247: Proper list usage
  // ---------------------------------------------------------------------------

  private checkListUsage(html: string, issues: HtmlStructureIssue[]): void {
    // Extract content between <ul>...</ul> and <ol>...</ol> (non-nested, first level).
    // Check if there are direct child elements that are NOT <li>.
    const listPattern = /<(ul|ol)(\s[^>]*)?>(((?!<\/\1>)[\s\S])*?)<\/\1>/gi;
    let match: RegExpExecArray | null;
    const invalidChildren: string[] = [];

    while ((match = listPattern.exec(html)) !== null) {
      const listContent = match[3];
      // Strip nested lists to avoid false positives on deeply nested structures
      const withoutNestedLists = listContent.replace(/<(ul|ol)[\s\S]*?<\/\1>/gi, '');
      // Find direct child elements that are not <li> (skip text nodes, comments, whitespace)
      const directChildPattern = /<(?!\/?li\b|!--)([a-z][a-z0-9]*)\b/gi;
      let childMatch: RegExpExecArray | null;

      while ((childMatch = directChildPattern.exec(withoutNestedLists)) !== null) {
        const tag = childMatch[1].toLowerCase();
        if (tag !== 'li' && !invalidChildren.includes(tag)) {
          invalidChildren.push(tag);
        }
      }
    }

    if (invalidChildren.length > 0) {
      const tagList = invalidChildren.map(t => `<${t}>`).join(', ');
      issues.push({
        ruleId: 'rule-247',
        severity: 'medium',
        title: 'Invalid direct children in list element',
        description:
          `Found non-<li> element(s) as direct children of <ul> or <ol>: ${tagList}. ` +
          'Per the HTML spec, <ul> and <ol> should only contain <li> elements as direct ' +
          'children. Invalid list structure can confuse screen readers and search-engine parsers.',
        affectedElement: tagList,
        exampleFix:
          'Wrap non-<li> content inside <li> elements, or move it outside the list.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 248: No inline styles
  // ---------------------------------------------------------------------------

  private checkInlineStyles(html: string, issues: HtmlStructureIssue[]): void {
    const stylePattern = /\bstyle\s*=\s*["'][^"']*["']/gi;
    const matches = html.match(stylePattern);
    const count = matches ? matches.length : 0;

    // Only flag if more than 3 inline styles are found (minor use is acceptable)
    if (count > 3) {
      issues.push({
        ruleId: 'rule-248',
        severity: 'low',
        title: 'Excessive inline styles detected',
        description:
          `Found ${count} inline style attribute(s). Inline styles make content harder ` +
          'to maintain, increase page weight, and prevent proper caching of stylesheets. ' +
          'Use CSS classes instead for consistent, maintainable styling.',
        affectedElement: matches ? matches.slice(0, 3).join(', ') : undefined,
        exampleFix:
          'Move inline styles to CSS classes. Replace style="color: red" with class="text-danger".',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 249: Proper table structure
  // ---------------------------------------------------------------------------

  private checkTableStructure(html: string, issues: HtmlStructureIssue[]): void {
    const tablePattern = /<table\b/gi;
    const tables = html.match(tablePattern);

    if (!tables || tables.length === 0) return;

    const tableCount = tables.length;

    // Check for <thead> with <th> inside tables
    const theadWithThPattern = /<thead[\s\S]*?<th\b/gi;
    const hasProperHeaders = theadWithThPattern.test(html);

    // Also check for tables that have <th> even outside <thead> (still somewhat proper)
    const anyThPattern = /<th\b/gi;
    const hasAnyTh = anyThPattern.test(html);

    if (!hasProperHeaders) {
      issues.push({
        ruleId: 'rule-249',
        severity: 'medium',
        title: 'Table missing proper header structure',
        description:
          `Found ${tableCount} table(s) without a proper <thead> containing <th> elements. ` +
          'Tables should have a <thead> section with <th> header cells to provide semantic ' +
          'meaning and improve accessibility for screen readers and search engines.' +
          (!hasAnyTh
            ? ' No <th> elements were found at all.'
            : ' <th> elements exist but are not wrapped in <thead>.'),
        affectedElement: `<table> (${tableCount} occurrence${tableCount > 1 ? 's' : ''})`,
        exampleFix:
          'Add <thead><tr><th>Header 1</th><th>Header 2</th></tr></thead> as the first child of <table>.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 250: No excessive nesting
  // ---------------------------------------------------------------------------

  private checkExcessiveNesting(html: string, issues: HtmlStructureIssue[]): void {
    // Track nesting depth by scanning opening and closing tags.
    // Self-closing and void elements do not count.
    const VOID_ELEMENTS = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr',
    ]);

    const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*\/?>/gi;
    let match: RegExpExecArray | null;
    let depth = 0;
    let maxDepth = 0;
    let deepestTag = '';

    while ((match = tagPattern.exec(html)) !== null) {
      const fullMatch = match[0];
      const tagName = match[1].toLowerCase();

      // Skip void elements and self-closing tags
      if (VOID_ELEMENTS.has(tagName) || fullMatch.endsWith('/>')) continue;
      // Skip comments and doctype
      if (fullMatch.startsWith('<!')) continue;

      if (fullMatch.startsWith('</')) {
        // Closing tag
        depth = Math.max(0, depth - 1);
      } else {
        // Opening tag
        depth++;
        if (depth > maxDepth) {
          maxDepth = depth;
          deepestTag = tagName;
        }
      }
    }

    if (maxDepth > 6) {
      issues.push({
        ruleId: 'rule-250',
        severity: 'low',
        title: 'Excessive HTML nesting detected',
        description:
          `Maximum nesting depth of ${maxDepth} levels found (threshold: 6). ` +
          'Deeply nested HTML increases DOM complexity, slows rendering, and makes ' +
          'content harder to parse for search engines and assistive technologies.',
        affectedElement: `<${deepestTag}> at depth ${maxDepth}`,
        exampleFix:
          'Flatten the DOM structure by reducing wrapper elements. Use CSS flexbox/grid ' +
          'instead of deeply nested <div> elements.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 251: Semantic <article> tag usage in main content
  // ---------------------------------------------------------------------------

  private checkArticleTag(html: string, issues: HtmlStructureIssue[]): void {
    const hasArticle = /<article\b/i.test(html);

    // Only flag if the page has substantial content (multiple paragraphs)
    const paragraphCount = (html.match(/<p\b/gi) || []).length;
    if (paragraphCount < 3) return;

    if (!hasArticle) {
      issues.push({
        ruleId: 'rule-251',
        severity: 'medium',
        title: 'No <article> tag for main content',
        description:
          'The page contains substantial content but does not use the <article> semantic element. ' +
          'The <article> tag identifies self-contained, independently distributable content, ' +
          'helping search engines and screen readers identify the primary content area.',
        exampleFix:
          'Wrap the main article content in <article>...</article> tags.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 252: Semantic <section> tag usage
  // ---------------------------------------------------------------------------

  private checkSectionTag(html: string, issues: HtmlStructureIssue[]): void {
    const hasSection = /<section\b/i.test(html);

    // Only flag if the page has multiple headings (indicating sections)
    const headingCount = (html.match(/<h[2-6]\b/gi) || []).length;
    if (headingCount < 2) return;

    if (!hasSection) {
      issues.push({
        ruleId: 'rule-252',
        severity: 'low',
        title: 'No <section> tags for content grouping',
        description:
          `The page has ${headingCount} subheadings but does not use <section> elements to group content. ` +
          'The <section> tag provides semantic grouping of thematically related content, ' +
          'improving document outline and accessibility for screen readers.',
        exampleFix:
          'Wrap each thematic group of content (heading + associated paragraphs) in <section>...</section> tags.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 253: Semantic <nav> tag for navigation
  // ---------------------------------------------------------------------------

  private checkNavTag(html: string, issues: HtmlStructureIssue[]): void {
    const hasNav = /<nav\b/i.test(html);

    // Detect navigation patterns: multiple links in a list or a header area
    const navPatterns = [
      /<ul\b[^>]*>(\s*<li\b[^>]*>\s*<a\b[^>]*>[\s\S]*?<\/a>\s*<\/li>\s*){3,}<\/ul>/gi,
      /class=["'][^"']*nav[^"']*["']/gi,
      /id=["'][^"']*nav[^"']*["']/gi,
    ];

    const hasNavPattern = navPatterns.some((pattern) => pattern.test(html));

    if (!hasNav && hasNavPattern) {
      issues.push({
        ruleId: 'rule-253',
        severity: 'low',
        title: 'Navigation not wrapped in <nav> tag',
        description:
          'The page appears to contain navigation link patterns but does not use the <nav> semantic element. ' +
          'The <nav> tag identifies major navigation blocks, helping screen readers offer ' +
          'skip-to-navigation shortcuts and helping search engines understand site structure.',
        exampleFix:
          'Wrap navigation link groups in <nav>...</nav> tags. For multiple nav blocks, ' +
          'use aria-label to distinguish them (e.g., <nav aria-label="Main navigation">).',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 254: Images should be wrapped in <figure> + <figcaption>
  // ---------------------------------------------------------------------------

  private checkFigureFigcaption(html: string, issues: HtmlStructureIssue[]): void {
    const imgCount = (html.match(/<img\b/gi) || []).length;
    if (imgCount === 0) return;

    const figureCount = (html.match(/<figure\b/gi) || []).length;
    const figcaptionCount = (html.match(/<figcaption\b/gi) || []).length;

    // Count images inside <figure> elements
    const figureImgPattern = /<figure\b[^>]*>[\s\S]*?<img\b[\s\S]*?<\/figure>/gi;
    const figureImgs = (html.match(figureImgPattern) || []).length;

    const unwrappedImgs = imgCount - figureImgs;

    if (unwrappedImgs > 0 && imgCount >= 2) {
      issues.push({
        ruleId: 'rule-254',
        severity: 'low',
        title: 'Images not wrapped in <figure> with <figcaption>',
        description:
          `${unwrappedImgs} of ${imgCount} image(s) are not wrapped in <figure> elements. ` +
          'The <figure> element with a <figcaption> provides semantic association between an image ' +
          'and its caption, improving accessibility and giving search engines additional context ' +
          'about the image content.',
        affectedElement: `${unwrappedImgs} unwrapped image(s), ${figureCount} <figure>(s), ${figcaptionCount} <figcaption>(s)`,
        exampleFix:
          'Wrap images in <figure><img src="..." alt="..."><figcaption>Description</figcaption></figure>.',
      });
    }

    // Also flag figures without figcaptions
    if (figureCount > 0 && figcaptionCount < figureCount) {
      issues.push({
        ruleId: 'rule-254',
        severity: 'low',
        title: '<figure> elements missing <figcaption>',
        description:
          `${figureCount - figcaptionCount} <figure> element(s) lack a <figcaption>. ` +
          'Each <figure> should include a <figcaption> to provide a text description ' +
          'that search engines and screen readers can use as additional context.',
        affectedElement: `${figureCount} <figure>(s), ${figcaptionCount} <figcaption>(s)`,
        exampleFix:
          'Add <figcaption> inside each <figure>: <figure><img ...><figcaption>Caption text</figcaption></figure>.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 255b: ARIA landmarks for accessibility
  // ---------------------------------------------------------------------------

  private checkAriaLandmarks(html: string, issues: HtmlStructureIssue[]): void {
    // Only check pages with substantial content (at least a heading or body tag)
    const hasSubstantialContent =
      /<body\b/i.test(html) ||
      /<h[1-6]\b/i.test(html) ||
      (html.match(/<[a-z]/gi) || []).length >= 5;
    if (!hasSubstantialContent) return;

    // Check for key ARIA landmark roles or their semantic HTML equivalents
    const landmarks = {
      banner: { role: /role=["']banner["']/i, tag: /<header\b/i, label: 'banner (<header>)' },
      navigation: { role: /role=["']navigation["']/i, tag: /<nav\b/i, label: 'navigation (<nav>)' },
      main: { role: /role=["']main["']/i, tag: /<main\b/i, label: 'main (<main>)' },
      contentinfo: { role: /role=["']contentinfo["']/i, tag: /<footer\b/i, label: 'contentinfo (<footer>)' },
    };

    const missingLandmarks: string[] = [];

    for (const [, config] of Object.entries(landmarks)) {
      const hasRole = config.role.test(html);
      const hasTag = config.tag.test(html);
      if (!hasRole && !hasTag) {
        missingLandmarks.push(config.label);
      }
    }

    // Only flag if multiple landmarks are missing (page likely lacks semantic structure)
    if (missingLandmarks.length >= 2) {
      issues.push({
        ruleId: 'rule-255b',
        severity: 'low',
        title: 'Missing ARIA landmarks',
        description:
          `The page is missing ${missingLandmarks.length} key ARIA landmark(s): ${missingLandmarks.join(', ')}. ` +
          'ARIA landmarks (or their semantic HTML equivalents like <header>, <nav>, <main>, <footer>) ' +
          'enable screen readers to provide quick navigation between page regions and help search engines ' +
          'understand page structure.',
        affectedElement: `Missing: ${missingLandmarks.join(', ')}`,
        exampleFix:
          'Use semantic HTML elements: <header> for banner, <nav> for navigation, ' +
          '<main> for main content, and <footer> for content info. ' +
          'Alternatively, add role="banner", role="navigation", role="main", role="contentinfo" attributes.',
      });
    }
  }
}
