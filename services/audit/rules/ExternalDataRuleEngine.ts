/**
 * ExternalDataRuleEngine
 *
 * Rules that require external API data (GSC, web search, page crawl).
 * The engine defines check criteria but delegates data fetching to injected providers.
 *
 * Rules implemented:
 *   rule-20  - Author has citations on external sources
 *   rule-186 - Navigation links are crawlable
 *   rule-187 - Navigation structure consistent
 *   rule-188 - Breadcrumb present
 *   rule-189 - Footer links present
 *   rule-190 - Jump links have valid targets
 *   rule-191 - Table of contents for long content
 *   rule-192 - Anchor IDs are descriptive
 *   rule-193 - No broken fragments
 *   rule-194 - Skip links for accessibility
 *   rule-368 - Page is indexed in Google
 *   rule-369 - Page was crawled recently
 *   rule-370 - No coverage issues
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Data providers that can be injected */
export interface ExternalDataProviders {
  /** Fetch GSC indexation status for a URL */
  getGscIndexStatus?: (
    url: string
  ) => Promise<{ indexed: boolean; lastCrawled?: string; coverage?: string }>;
  /** Check if a URL exists in GSC */
  isInGsc?: (url: string) => Promise<boolean>;
  /** Fetch all internal links from a page */
  getPageLinks?: (
    url: string
  ) => Promise<Array<{ href: string; text: string; isNavigation: boolean }>>;
  /** Search web for author citations */
  searchAuthorCitations?: (
    authorName: string
  ) => Promise<Array<{ url: string; title: string }>>;
}

export interface ExternalDataInput {
  url: string;
  authorName?: string;
  html?: string;
  /** Pre-fetched data (to avoid re-fetching) */
  gscStatus?: {
    indexed: boolean;
    lastCrawled?: string;
    coverage?: string;
  };
  pageLinks?: Array<{ href: string; text: string; isNavigation: boolean }>;
  authorCitations?: Array<{ url: string; title: string }>;
  /** Jump links / fragments in the page */
  fragmentTargets?: string[];
  /** All internal link hrefs from the page */
  internalLinks?: string[];
}

export interface ExternalDataIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** IDs that are too generic to be considered descriptive */
const NON_DESCRIPTIVE_ID_PATTERNS = [
  /^s\d+$/i, // s1, s2
  /^section\d+$/i, // section1, section2
  /^a\d*$/i, // a, a1
  /^[a-z]$/i, // single letter
  /^\d+$/, // bare numbers
  /^id\d*$/i, // id, id1
  /^item\d*$/i, // item, item1
  /^content\d*$/i, // content, content1 (only when bare)
  /^block\d*$/i, // block, block1
  /^el\d*$/i, // el, el1
];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const COVERAGE_ERROR_KEYWORDS = ['excluded', 'error', 'redirect'];

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class ExternalDataRuleEngine {
  /**
   * Run all rules using pre-fetched data only (synchronous, no API calls).
   * Each rule checks whether the relevant input field is provided before running.
   */
  validate(input: ExternalDataInput): ExternalDataIssue[] {
    const issues: ExternalDataIssue[] = [];

    this.checkAuthorCitations(input, issues);
    this.checkGscIndexed(input, issues);
    this.checkGscCrawlRecency(input, issues);
    this.checkGscCoverage(input, issues);
    this.checkNavigationCrawlable(input, issues);
    this.checkNavigationConsistent(input, issues);
    this.checkBreadcrumb(input, issues);
    this.checkFooterLinks(input, issues);
    this.checkJumpLinkTargets(input, issues);
    this.checkTableOfContents(input, issues);
    this.checkAnchorIdDescriptive(input, issues);
    this.checkBrokenFragments(input, issues);
    this.checkSkipLink(input, issues);

    return issues;
  }

  /**
   * Run all rules, fetching missing data from providers as needed (async).
   * First runs validate() with whatever data is available, then fills in
   * missing data from providers and re-checks those rules.
   */
  async validateWithFetch(
    input: ExternalDataInput,
    providers: ExternalDataProviders
  ): Promise<ExternalDataIssue[]> {
    // Clone the input so we can augment it without mutating the caller's object
    const augmented: ExternalDataInput = { ...input };

    // Fetch missing GSC status
    if (!augmented.gscStatus && providers.getGscIndexStatus) {
      try {
        augmented.gscStatus = await providers.getGscIndexStatus(
          augmented.url
        );
      } catch {
        // Silently skip — we'll just skip those rules
      }
    }

    // Fetch missing page links
    if (!augmented.pageLinks && providers.getPageLinks) {
      try {
        augmented.pageLinks = await providers.getPageLinks(augmented.url);
      } catch {
        // Silently skip
      }
    }

    // Fetch missing author citations
    if (
      !augmented.authorCitations &&
      augmented.authorName &&
      providers.searchAuthorCitations
    ) {
      try {
        augmented.authorCitations = await providers.searchAuthorCitations(
          augmented.authorName
        );
      } catch {
        // Silently skip
      }
    }

    return this.validate(augmented);
  }

  // -------------------------------------------------------------------------
  // Rule 20 — Author has citations on external sources
  // -------------------------------------------------------------------------

  private checkAuthorCitations(
    input: ExternalDataInput,
    issues: ExternalDataIssue[]
  ): void {
    if (!input.authorName) return;
    // Only flag if authorCitations was explicitly provided (or fetched) and is empty
    if (input.authorCitations === undefined) return;

    if (input.authorCitations.length === 0) {
      issues.push({
        ruleId: 'rule-20',
        severity: 'medium',
        title: 'Author has no external citations',
        description:
          `No external citations were found for author "${input.authorName}". ` +
          'Author mentions on third-party sites strengthen E-E-A-T signals and ' +
          'help search engines verify author credibility.',
        affectedElement: input.authorName,
        exampleFix:
          'Build author authority through guest posts, interviews, or expert commentary ' +
          'on reputable industry sites.',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Rules 368-370 — GSC Indexation
  // -------------------------------------------------------------------------

  private checkGscIndexed(
    input: ExternalDataInput,
    issues: ExternalDataIssue[]
  ): void {
    if (!input.gscStatus) return;

    if (!input.gscStatus.indexed) {
      issues.push({
        ruleId: 'rule-368',
        severity: 'critical',
        title: 'Page is not indexed in Google',
        description:
          `The page at "${input.url}" is not indexed in Google Search Console. ` +
          'An unindexed page receives zero organic search visibility.',
        affectedElement: input.url,
        exampleFix:
          'Submit the URL for indexing via Google Search Console and verify there are no ' +
          'noindex tags, robots.txt blocks, or canonical issues preventing indexation.',
      });
    }
  }

  private checkGscCrawlRecency(
    input: ExternalDataInput,
    issues: ExternalDataIssue[]
  ): void {
    if (!input.gscStatus?.lastCrawled) return;

    const lastCrawled = new Date(input.gscStatus.lastCrawled);
    const now = new Date();
    const daysSinceCrawl = Math.floor(
      (now.getTime() - lastCrawled.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (now.getTime() - lastCrawled.getTime() > THIRTY_DAYS_MS) {
      issues.push({
        ruleId: 'rule-369',
        severity: 'high',
        title: 'Page not crawled recently',
        description:
          `The page was last crawled ${daysSinceCrawl} days ago. ` +
          'A crawl gap of more than 30 days suggests the page may have low crawl priority ' +
          'or be affected by crawl budget constraints.',
        affectedElement: input.url,
        exampleFix:
          'Improve internal linking to the page, update its content, and request a ' +
          're-crawl through Google Search Console.',
      });
    }
  }

  private checkGscCoverage(
    input: ExternalDataInput,
    issues: ExternalDataIssue[]
  ): void {
    if (!input.gscStatus?.coverage) return;

    const coverage = input.gscStatus.coverage.toLowerCase();
    const hasError = COVERAGE_ERROR_KEYWORDS.some((kw) =>
      coverage.includes(kw)
    );

    if (hasError) {
      issues.push({
        ruleId: 'rule-370',
        severity: 'high',
        title: 'GSC coverage issue detected',
        description:
          `Google Search Console reports a coverage status of "${input.gscStatus.coverage}". ` +
          'Coverage issues can prevent proper indexation and reduce organic visibility.',
        affectedElement: input.url,
        exampleFix:
          'Review the specific coverage issue in Google Search Console and resolve ' +
          'any redirect chains, canonical conflicts, or noindex directives.',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Rules 186-189 — Navigation & Dynamic Links
  // -------------------------------------------------------------------------

  private checkNavigationCrawlable(
    input: ExternalDataInput,
    issues: ExternalDataIssue[]
  ): void {
    if (!input.html) return;

    // Look for onclick/javascript navigation without proper <a href>
    const jsNavPattern =
      /<(?:div|span|button)[^>]*onclick=["'][^"']*(?:location|navigate|window\.open)[^"']*["']/gi;
    const matches = input.html.match(jsNavPattern);

    if (matches && matches.length > 0) {
      issues.push({
        ruleId: 'rule-186',
        severity: 'high',
        title: 'Navigation links use JavaScript instead of <a href>',
        description:
          `Found ${matches.length} navigation element(s) that rely on JavaScript ` +
          '(onclick handlers) instead of standard <a href> links. JavaScript-dependent ' +
          'navigation may not be crawlable by search engines.',
        affectedElement: matches[0],
        exampleFix:
          'Replace onclick handlers with proper <a href="/path"> elements. ' +
          'Use progressive enhancement if interactivity is needed.',
      });
    }
  }

  private checkNavigationConsistent(
    input: ExternalDataInput,
    issues: ExternalDataIssue[]
  ): void {
    if (!input.pageLinks) return;

    const navLinks = input.pageLinks.filter((l) => l.isNavigation);

    if (navLinks.length < 3) {
      issues.push({
        ruleId: 'rule-187',
        severity: 'medium',
        title: 'Insufficient navigation links',
        description:
          `Only ${navLinks.length} navigation link(s) detected. A consistent navigation ` +
          'structure with at least 3 links helps search engines understand site hierarchy ' +
          'and distributes link equity across important pages.',
        affectedElement: `${navLinks.length} navigation link(s)`,
        exampleFix:
          'Add a primary navigation menu with links to key category or pillar pages.',
      });
    }
  }

  private checkBreadcrumb(
    input: ExternalDataInput,
    issues: ExternalDataIssue[]
  ): void {
    if (!input.html) return;

    const hasBreadcrumbAria =
      /aria-label=["']breadcrumb["']/i.test(input.html);
    const hasBreadcrumbClass = /class=["'][^"']*breadcrumb[^"']*["']/i.test(
      input.html
    );
    const hasBreadcrumbSchema = /BreadcrumbList/i.test(input.html);

    if (!hasBreadcrumbAria && !hasBreadcrumbClass && !hasBreadcrumbSchema) {
      issues.push({
        ruleId: 'rule-188',
        severity: 'medium',
        title: 'No breadcrumb navigation found',
        description:
          'The page has no detectable breadcrumb navigation (no aria-label="breadcrumb", ' +
          'breadcrumb class, or BreadcrumbList schema). Breadcrumbs improve both user ' +
          'navigation and search engine understanding of site structure.',
        exampleFix:
          'Add breadcrumb markup: <nav aria-label="breadcrumb"><ol class="breadcrumb">...</ol></nav> ' +
          'and include BreadcrumbList JSON-LD schema.',
      });
    }
  }

  private checkFooterLinks(
    input: ExternalDataInput,
    issues: ExternalDataIssue[]
  ): void {
    if (!input.html) return;

    // Check for <footer> tag containing at least one link
    const footerMatch = input.html.match(
      /<footer[\s>][\s\S]*?<\/footer>/i
    );

    if (!footerMatch) {
      issues.push({
        ruleId: 'rule-189',
        severity: 'low',
        title: 'No footer section found',
        description:
          'The page has no <footer> element. A footer with links to important pages ' +
          '(privacy policy, sitemap, contact) is a standard web convention that helps ' +
          'both users and search engines.',
        exampleFix:
          'Add a <footer> element with links to key site pages, contact information, ' +
          'and legal/policy pages.',
      });
    } else {
      // Footer exists but check if it contains links
      const hasLinks = /<a\s+[^>]*href/i.test(footerMatch[0]);
      if (!hasLinks) {
        issues.push({
          ruleId: 'rule-189',
          severity: 'low',
          title: 'Footer has no links',
          description:
            'The <footer> element exists but contains no links. Footer links help ' +
            'distribute link equity and provide secondary navigation for users and crawlers.',
          affectedElement: '<footer>',
          exampleFix:
            'Add links to important pages (sitemap, privacy policy, contact) inside the footer.',
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Rules 190-194 — URL Fragments / Jump Links
  // -------------------------------------------------------------------------

  private checkJumpLinkTargets(
    input: ExternalDataInput,
    issues: ExternalDataIssue[]
  ): void {
    if (!input.html || !input.fragmentTargets) return;

    // Collect all id attributes from the HTML
    const idSet = this.extractIds(input.html);

    const brokenTargets = input.fragmentTargets.filter(
      (frag) => !idSet.has(frag)
    );

    if (brokenTargets.length > 0) {
      issues.push({
        ruleId: 'rule-190',
        severity: 'high',
        title: 'Jump links point to non-existent targets',
        description:
          `Found ${brokenTargets.length} fragment link(s) whose target IDs do not exist ` +
          `in the page: ${brokenTargets.slice(0, 5).join(', ')}. ` +
          'Broken jump links degrade the user experience and may confuse crawlers.',
        affectedElement: brokenTargets.slice(0, 3).join(', '),
        exampleFix:
          'Add matching id attributes to the target elements, or update the href fragments ' +
          'to point to existing IDs.',
      });
    }
  }

  private checkTableOfContents(
    input: ExternalDataInput,
    issues: ExternalDataIssue[]
  ): void {
    if (!input.html) return;

    // Count words in the text content (rough estimate by stripping tags)
    const textContent = input.html.replace(/<[^>]+>/g, ' ');
    const wordCount = textContent
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    if (wordCount <= 2000) return;

    // Check for TOC pattern: multiple <a href="#..."> links
    const fragmentLinkMatches = input.html.match(/<a\s+[^>]*href=["']#[^"']+["']/gi);
    const fragmentLinkCount = fragmentLinkMatches ? fragmentLinkMatches.length : 0;

    // Also check for common TOC class patterns
    const hasTocClass =
      /class=["'][^"']*(?:toc|table-of-contents|tableofcontents)[^"']*["']/i.test(
        input.html
      );

    if (fragmentLinkCount < 3 && !hasTocClass) {
      issues.push({
        ruleId: 'rule-191',
        severity: 'medium',
        title: 'Long content lacks a table of contents',
        description:
          `The page has approximately ${wordCount} words but no table of contents was ` +
          'detected. Long-form content benefits from a TOC that provides jump links ' +
          'to major sections, improving usability and enabling featured snippet opportunities.',
        exampleFix:
          'Add a table of contents with anchor links to each major heading:\n' +
          '<nav class="toc"><ul><li><a href="#section-name">Section Name</a></li>...</ul></nav>',
      });
    }
  }

  private checkAnchorIdDescriptive(
    input: ExternalDataInput,
    issues: ExternalDataIssue[]
  ): void {
    if (!input.html) return;

    const ids = this.extractIds(input.html);
    const nonDescriptiveIds: string[] = [];

    for (const id of ids) {
      if (this.isNonDescriptiveId(id)) {
        nonDescriptiveIds.push(id);
      }
    }

    if (nonDescriptiveIds.length > 0) {
      issues.push({
        ruleId: 'rule-192',
        severity: 'low',
        title: 'Non-descriptive anchor IDs detected',
        description:
          `Found ${nonDescriptiveIds.length} non-descriptive ID(s): ` +
          `${nonDescriptiveIds.slice(0, 5).join(', ')}. ` +
          'Descriptive IDs improve URL readability when used as fragments and help ' +
          'search engines understand page structure.',
        affectedElement: nonDescriptiveIds.slice(0, 3).join(', '),
        exampleFix:
          'Use descriptive, hyphenated IDs like id="pricing-overview" instead of id="section1".',
      });
    }
  }

  private checkBrokenFragments(
    input: ExternalDataInput,
    issues: ExternalDataIssue[]
  ): void {
    if (!input.html) return;

    // Extract all href="#xxx" links from the HTML
    const fragmentLinks: string[] = [];
    const fragPattern = /<a\s+[^>]*href=["']#([^"']+)["']/gi;
    let match: RegExpExecArray | null;

    while ((match = fragPattern.exec(input.html)) !== null) {
      fragmentLinks.push(match[1]);
    }

    if (fragmentLinks.length === 0) return;

    const idSet = this.extractIds(input.html);
    const broken = fragmentLinks.filter((frag) => !idSet.has(frag));

    if (broken.length > 0) {
      issues.push({
        ruleId: 'rule-193',
        severity: 'high',
        title: 'Broken fragment links detected',
        description:
          `Found ${broken.length} fragment link(s) pointing to IDs that do not exist ` +
          `in the page: ${broken.slice(0, 5).join(', ')}.`,
        affectedElement: broken.slice(0, 3).join(', '),
        exampleFix:
          'Either add the missing id attributes to the target elements or remove the broken links.',
      });
    }
  }

  private checkSkipLink(
    input: ExternalDataInput,
    issues: ExternalDataIssue[]
  ): void {
    if (!input.html) return;

    // Look for skip-to-content patterns
    const hasSkipLink =
      /<a\s+[^>]*href=["']#(?:main-content|main|content|skip|maincontent)["']/i.test(
        input.html
      );
    const hasSkipClass =
      /class=["'][^"']*(?:skip-link|skip-to-content|skip-nav|skiplink)[^"']*["']/i.test(
        input.html
      );

    if (!hasSkipLink && !hasSkipClass) {
      issues.push({
        ruleId: 'rule-194',
        severity: 'low',
        title: 'No skip-to-content link found',
        description:
          'The page has no skip-to-content link. Skip links are an accessibility best practice ' +
          'that allow keyboard and screen reader users to bypass navigation and jump directly ' +
          'to the main content.',
        exampleFix:
          'Add a skip link as the first focusable element:\n' +
          '<a href="#main-content" class="skip-link">Skip to main content</a>',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Utility helpers
  // -------------------------------------------------------------------------

  /** Extract all id="..." attribute values from HTML */
  private extractIds(html: string): Set<string> {
    const ids = new Set<string>();
    const idPattern = /\bid=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;

    while ((match = idPattern.exec(html)) !== null) {
      ids.add(match[1]);
    }

    return ids;
  }

  /** Check if an id value is non-descriptive */
  private isNonDescriptiveId(id: string): boolean {
    return NON_DESCRIPTIVE_ID_PATTERNS.some((pattern) => pattern.test(id));
  }
}
