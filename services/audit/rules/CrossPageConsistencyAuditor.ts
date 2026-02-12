/**
 * CrossPageConsistencyAuditor
 *
 * Standalone validator for cross-page consistency P1 rules:
 *   - Rule 380: CE appears in site boilerplate (header/footer/nav)
 *   - Rule 382: One CE per entire site
 *   - Rule 390: AS->CS flow exists (Attribute Sections before Contextual Sections)
 *   - Rule 392: No orphan pages (every page linked from at least one other page)
 *   - Rule 394: Canonical query assignment per page (unique primary query per page)
 */

export interface CrossPageInput {
  /** Current page URL */
  pageUrl: string;
  /** Central Entity for this page */
  pageCentralEntity?: string;
  /** Primary target query/keyword for this page */
  pageTargetQuery?: string;

  /** Site-wide Central Entity (the ONE CE for the entire site) */
  siteCentralEntity?: string;
  /** Header/footer/nav HTML from site-wide boilerplate */
  boilerplateHtml?: string;

  /** All page URLs on the site */
  allPageUrls?: string[];
  /** Primary target queries for all pages (parallel array with allPageUrls) */
  allPageTargetQueries?: string[];
  /** Central Entities declared on all pages (parallel array with allPageUrls) */
  allPageCentralEntities?: string[];
  /** URLs of pages that link to this page internally */
  internalLinksToThisPage?: string[];

  /** Section type classifications in order (e.g. ['AS', 'AS', 'CS', 'CS']) */
  sectionTypes?: string[];
}

export interface CrossPageIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export class CrossPageConsistencyAuditor {
  /**
   * Run all cross-page consistency checks against the given input.
   */
  validate(input: CrossPageInput): CrossPageIssue[] {
    const issues: CrossPageIssue[] = [];

    this.checkCeInBoilerplate(input, issues);
    this.checkOneCePerSite(input, issues);
    this.checkAsToCsFlow(input, issues);
    this.checkOrphanPages(input, issues);
    this.checkCanonicalQueryAssignment(input, issues);

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Rule 380 — CE appears in site boilerplate
  // ---------------------------------------------------------------------------

  private checkCeInBoilerplate(
    input: CrossPageInput,
    issues: CrossPageIssue[]
  ): void {
    if (!input.siteCentralEntity || !input.boilerplateHtml) return;

    const ce = input.siteCentralEntity.trim().toLowerCase();
    if (!ce) return;

    // Strip HTML tags to get text content from boilerplate
    const boilerplateText = this.stripHtml(input.boilerplateHtml).toLowerCase();

    if (!boilerplateText.includes(ce)) {
      issues.push({
        ruleId: 'rule-380',
        severity: 'medium',
        title: 'Central Entity missing from site boilerplate',
        description:
          `The Central Entity "${input.siteCentralEntity}" does not appear in the site-wide boilerplate ` +
          '(header, footer, or navigation). Search engines use boilerplate elements to reinforce topical relevance ' +
          'across the entire site.',
        affectedElement: 'header / footer / nav',
        exampleFix:
          `Include "${input.siteCentralEntity}" in the site header, footer tagline, or navigation label.`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 382 — One CE per entire site
  // ---------------------------------------------------------------------------

  private checkOneCePerSite(
    input: CrossPageInput,
    issues: CrossPageIssue[]
  ): void {
    if (!input.allPageCentralEntities || input.allPageCentralEntities.length === 0) return;

    const uniqueCEs = new Set(
      input.allPageCentralEntities
        .filter((ce) => ce && ce.trim().length > 0)
        .map((ce) => ce.trim().toLowerCase())
    );

    if (uniqueCEs.size > 1) {
      const ceList = [...uniqueCEs].join(', ');
      issues.push({
        ruleId: 'rule-382',
        severity: 'high',
        title: 'Multiple Central Entities detected across site',
        description:
          `Found ${uniqueCEs.size} distinct Central Entities across all pages: ${ceList}. ` +
          'A site should focus on a single Central Entity to build topical authority. ' +
          'Multiple competing CEs dilute semantic signals and confuse search engines.',
        affectedElement: 'site-wide CE declarations',
        exampleFix:
          'Align all pages to a single Central Entity. Use sub-topics and attributes to cover breadth, ' +
          'not separate Central Entities.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 390 — AS->CS flow exists
  // ---------------------------------------------------------------------------

  private checkAsToCsFlow(
    input: CrossPageInput,
    issues: CrossPageIssue[]
  ): void {
    if (!input.sectionTypes || input.sectionTypes.length === 0) return;

    const types = input.sectionTypes.map((t) => t.trim().toUpperCase());

    const hasAS = types.some((t) => t === 'AS');
    const hasCS = types.some((t) => t === 'CS');

    if (!hasAS || !hasCS) {
      const missing = !hasAS && !hasCS
        ? 'both Attribute Sections (AS) and Contextual Sections (CS)'
        : !hasAS
          ? 'Attribute Sections (AS)'
          : 'Contextual Sections (CS)';

      issues.push({
        ruleId: 'rule-390',
        severity: 'medium',
        title: 'Missing AS→CS content flow',
        description:
          `The page is missing ${missing}. ` +
          'A well-structured page should progress from Attribute Sections (defining entity properties) ' +
          'to Contextual Sections (providing broader context and relationships).',
        affectedElement: 'content section structure',
        exampleFix:
          'Add both AS and CS sections. Start with entity attributes, then transition to contextual information.',
      });
      return;
    }

    // Check that at least one AS appears before the first CS
    const firstASIndex = types.indexOf('AS');
    const firstCSIndex = types.indexOf('CS');

    if (firstCSIndex < firstASIndex) {
      issues.push({
        ruleId: 'rule-390',
        severity: 'medium',
        title: 'AS→CS flow inverted',
        description:
          'Contextual Sections appear before Attribute Sections. The page should establish entity attributes ' +
          'before providing contextual information. The logical flow is AS→CS, not CS→AS.',
        affectedElement: 'content section ordering',
        exampleFix:
          'Reorder sections so that Attribute Sections (defining properties) come before Contextual Sections.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 392 — No orphan pages
  // ---------------------------------------------------------------------------

  private checkOrphanPages(
    input: CrossPageInput,
    issues: CrossPageIssue[]
  ): void {
    if (!input.allPageUrls || !input.internalLinksToThisPage) return;

    // Exception: homepage is never orphaned by definition
    if (this.isHomepage(input.pageUrl)) return;

    if (input.internalLinksToThisPage.length === 0) {
      issues.push({
        ruleId: 'rule-392',
        severity: 'high',
        title: 'Orphan page detected',
        description:
          `The page "${input.pageUrl}" has no internal links pointing to it from other pages on the site. ` +
          'Orphan pages are difficult for search engines to discover and receive no internal link equity.',
        affectedElement: input.pageUrl,
        exampleFix:
          'Add contextual internal links from related pages to this page. Ensure it appears in relevant ' +
          'navigation or content hubs.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 394 — Canonical query assignment per page
  // ---------------------------------------------------------------------------

  private checkCanonicalQueryAssignment(
    input: CrossPageInput,
    issues: CrossPageIssue[]
  ): void {
    if (!input.allPageTargetQueries || !input.pageTargetQuery) return;

    const thisQuery = input.pageTargetQuery.trim().toLowerCase();
    if (!thisQuery) return;

    // Count how many pages share the same target query (excluding empty queries)
    const duplicateCount = input.allPageTargetQueries.filter(
      (q) => q && q.trim().toLowerCase() === thisQuery
    ).length;

    // If more than 1 page targets the same query, we have cannibalization
    if (duplicateCount > 1) {
      issues.push({
        ruleId: 'rule-394',
        severity: 'high',
        title: 'Duplicate target query across pages',
        description:
          `The target query "${input.pageTargetQuery}" is assigned to ${duplicateCount} pages. ` +
          'Each page should target a unique primary query to avoid keyword cannibalization. ' +
          'When multiple pages compete for the same query, search engines may rank neither well.',
        affectedElement: `query: "${input.pageTargetQuery}"`,
        exampleFix:
          'Assign a unique primary query to each page. Differentiate similar pages by intent ' +
          '(informational vs. transactional) or by entity attribute focus.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private isHomepage(url: string): boolean {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname.replace(/\/+$/, '');
      return path === '' || path === '/';
    } catch {
      // If URL cannot be parsed, check for simple patterns
      return url === '/' || url.endsWith('.com') || url.endsWith('.com/');
    }
  }
}
