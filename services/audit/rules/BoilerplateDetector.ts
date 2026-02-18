/**
 * BoilerplateDetector
 *
 * Identifies boilerplate regions (nav, footer, sidebar, header) versus main
 * content in an HTML document. Used by audit phases that need to focus analysis
 * on unique page content rather than repeated site-wide chrome.
 *
 * Detection strategy:
 *   1. Semantic markers: <main>, <article>, [role="main"] for content;
 *      <nav>, <footer>, <aside>, <header>, [role="navigation"],
 *      [role="complementary"], [role="banner"], [role="contentinfo"] for boilerplate.
 *   2. Heuristic fallback: when no semantic markers exist, treat the first and
 *      last 15% of text content as likely boilerplate.
 *
 * Rules implemented:
 *   BP-1 - Low main-content ratio (< 40% of page text is unique content)
 *   BP-2 - No semantic landmark elements found (heuristic fallback used)
 */

export interface BoilerplateIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export interface BoilerplateResult {
  /** Text extracted from main content regions */
  mainContent: string;
  /** Text extracted from boilerplate regions */
  boilerplate: string;
  /** Ratio of main content text length to total text length (0-1) */
  mainContentRatio: number;
}

/**
 * Semantic HTML tags that denote the primary content area of a page.
 */
const MAIN_CONTENT_TAGS = ['main', 'article'] as const;

/**
 * ARIA roles that denote the primary content area.
 */
const MAIN_CONTENT_ROLES = ['main'] as const;

/**
 * Semantic HTML tags that typically contain boilerplate / site-wide chrome.
 */
const BOILERPLATE_TAGS = ['nav', 'footer', 'aside', 'header'] as const;

/**
 * ARIA roles that map to boilerplate regions.
 */
const BOILERPLATE_ROLES = [
  'navigation',
  'complementary',
  'banner',
  'contentinfo',
] as const;

export class BoilerplateDetector {
  /**
   * Detect main content vs boilerplate in the provided HTML string.
   * Returns the extracted text for each region and the content ratio.
   */
  detect(html: string): BoilerplateResult {
    const mainContentText = this.extractMainContent(html);
    const boilerplateText = this.extractBoilerplate(html);

    // If semantic markers were found, use them directly
    if (mainContentText !== null || boilerplateText !== null) {
      const main = mainContentText ?? '';
      const bp = boilerplateText ?? '';
      const totalLength = main.length + bp.length;

      return {
        mainContent: main,
        boilerplate: bp,
        mainContentRatio: totalLength > 0 ? main.length / totalLength : 0,
      };
    }

    // Fallback: heuristic based on text position
    return this.heuristicDetect(html);
  }

  /**
   * Run detection and return any audit issues found.
   */
  validate(html: string): BoilerplateIssue[] {
    const issues: BoilerplateIssue[] = [];
    const result = this.detect(html);

    // Check whether semantic landmarks were present
    const hasSemanticMarkers = this.hasSemanticLandmarks(html);

    if (!hasSemanticMarkers) {
      issues.push({
        ruleId: 'rule-bp-2',
        severity: 'medium',
        title: 'No semantic landmark elements found',
        description:
          'The page does not use semantic HTML elements (<main>, <article>, <nav>, <header>, <footer>, <aside>) ' +
          'or ARIA landmark roles. Boilerplate detection fell back to a positional heuristic which is less accurate. ' +
          'Semantic landmarks help search engines isolate main content from site-wide chrome.',
        affectedElement: '<body>',
        exampleFix:
          'Wrap primary content in <main> or <article> and navigation in <nav>. ' +
          'Use <header> for site header and <footer> for site footer.',
      });
    }

    if (result.mainContentRatio < 0.4) {
      issues.push({
        ruleId: 'rule-bp-1',
        severity: 'high',
        title: 'Low main-content ratio',
        description:
          `Only ${Math.round(result.mainContentRatio * 100)}% of page text is main content. ` +
          'A ratio below 40% suggests excessive boilerplate (navigation, footers, sidebars) ' +
          'relative to unique content, which can dilute topical relevance signals.',
        affectedElement: '<body>',
        exampleFix:
          'Reduce boilerplate text or increase unique main-content length. ' +
          'Consider consolidating navigation and trimming footer content.',
      });
    }

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Semantic extraction
  // ---------------------------------------------------------------------------

  /**
   * Extract text from elements identified as main content via semantic tags
   * or ARIA roles. Returns null if no semantic markers are found.
   */
  private extractMainContent(html: string): string | null {
    const segments: string[] = [];

    // Extract by tag: <main>...</main>, <article>...</article>
    for (const tag of MAIN_CONTENT_TAGS) {
      const pattern = new RegExp(
        `<${tag}[\\s>][\\s\\S]*?<\\/${tag}>`,
        'gi'
      );
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(html)) !== null) {
        segments.push(this.stripTags(match[0]));
      }
    }

    // Extract by ARIA role: [role="main"]
    for (const role of MAIN_CONTENT_ROLES) {
      const pattern = new RegExp(
        `<[a-z][a-z0-9]*[^>]+role=["']${role}["'][^>]*>[\\s\\S]*?<\\/[a-z][a-z0-9]*>`,
        'gi'
      );
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(html)) !== null) {
        segments.push(this.stripTags(match[0]));
      }
    }

    return segments.length > 0 ? segments.join(' ').trim() : null;
  }

  /**
   * Extract text from elements identified as boilerplate via semantic tags
   * or ARIA roles. Returns null if no semantic markers are found.
   */
  private extractBoilerplate(html: string): string | null {
    const segments: string[] = [];

    // Extract by tag
    for (const tag of BOILERPLATE_TAGS) {
      const pattern = new RegExp(
        `<${tag}[\\s>][\\s\\S]*?<\\/${tag}>`,
        'gi'
      );
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(html)) !== null) {
        segments.push(this.stripTags(match[0]));
      }
    }

    // Extract by ARIA role
    for (const role of BOILERPLATE_ROLES) {
      const pattern = new RegExp(
        `<[a-z][a-z0-9]*[^>]+role=["']${role}["'][^>]*>[\\s\\S]*?<\\/[a-z][a-z0-9]*>`,
        'gi'
      );
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(html)) !== null) {
        segments.push(this.stripTags(match[0]));
      }
    }

    return segments.length > 0 ? segments.join(' ').trim() : null;
  }

  // ---------------------------------------------------------------------------
  // Heuristic fallback
  // ---------------------------------------------------------------------------

  /**
   * When no semantic landmarks exist, treat the first 15% and last 15% of
   * the plain-text content as likely boilerplate and the middle 70% as main
   * content.
   */
  private heuristicDetect(html: string): BoilerplateResult {
    const fullText = this.stripTags(html).trim();
    const len = fullText.length;

    if (len === 0) {
      return { mainContent: '', boilerplate: '', mainContentRatio: 0 };
    }

    const headerCut = Math.floor(len * 0.15);
    const footerCut = Math.floor(len * 0.85);

    const headerBoilerplate = fullText.slice(0, headerCut);
    const mainContent = fullText.slice(headerCut, footerCut);
    const footerBoilerplate = fullText.slice(footerCut);
    const boilerplate = (headerBoilerplate + ' ' + footerBoilerplate).trim();

    const totalLength = mainContent.length + boilerplate.length;

    return {
      mainContent: mainContent.trim(),
      boilerplate,
      mainContentRatio: totalLength > 0 ? mainContent.trim().length / totalLength : 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Check whether the HTML contains any semantic landmark elements or ARIA
   * landmark roles.
   */
  private hasSemanticLandmarks(html: string): boolean {
    const allTags = [...MAIN_CONTENT_TAGS, ...BOILERPLATE_TAGS];
    for (const tag of allTags) {
      if (new RegExp(`<${tag}[\\s>]`, 'i').test(html)) return true;
    }

    const allRoles = [...MAIN_CONTENT_ROLES, ...BOILERPLATE_ROLES];
    for (const role of allRoles) {
      if (new RegExp(`role=["']${role}["']`, 'i').test(html)) return true;
    }

    return false;
  }

  /**
   * Strip HTML tags and collapse whitespace, returning plain text.
   */
  private stripTags(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
