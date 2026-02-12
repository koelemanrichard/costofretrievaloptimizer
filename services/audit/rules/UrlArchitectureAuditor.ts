/**
 * UrlArchitectureAuditor
 *
 * Validates URL architecture best practices for SEO audit purposes.
 * Checks URL format, redirects, canonical chains, sitemap presence,
 * response time, and duplicate content handling.
 *
 * Rules implemented:
 *   338 - Lowercase URLs (no uppercase in path)
 *   340 - No session IDs in URLs
 *   348 - No canonical chains
 *   354-355 - Bot response time within acceptable limits
 *   359 - No active 404s (404 pages linked from other pages)
 *   361 - 301 for permanent redirects (not 302)
 *   362 - No redirect chains (>1 hop)
 *   365 - No filter/facet URL explosion
 *   367 - Duplicates handled via canonical
 *   374 - URL should be in sitemap
 *   375 - Sitemap should not contain 4xx/5xx URLs
 *   378 - Sitemap should exist
 */

export interface UrlArchitectureInput {
  url: string;
  canonicalUrl?: string;
  canonicalOfCanonical?: string; // canonical of the canonical page (for chain detection)
  statusCode?: number;
  redirectTarget?: string;
  redirectStatusCode?: number; // 301 vs 302
  redirectChainLength?: number;
  responseTimeMs?: number;
  sitemapUrls?: string[];
  linkedFrom?: string[]; // pages that link to this URL
  duplicateUrls?: string[]; // URLs with same/similar content
  queryParams?: string[];
}

export interface UrlArchitectureIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

/** Common session ID query parameter names. */
const SESSION_ID_PARAMS = [
  'session',
  'sid',
  'phpsessid',
  'jsessionid',
  'token',
  '_ga',
  'sessionid',
  'asp.net_sessionid',
];

/** Query parameter patterns that indicate filter/facet/pagination URLs. */
const FACET_PARAM_PATTERNS = [
  'filter',
  'sort',
  'page',
  'order',
  'orderby',
  'limit',
  'offset',
  'color',
  'size',
  'category',
  'facet',
  'refinement',
];

export class UrlArchitectureAuditor {
  validate(input: UrlArchitectureInput): UrlArchitectureIssue[] {
    const issues: UrlArchitectureIssue[] = [];

    this.checkLowercaseUrl(input, issues);
    this.checkSessionIds(input, issues);
    this.checkCanonicalChain(input, issues);
    this.checkResponseTime(input, issues);
    this.checkActive404(input, issues);
    this.checkPermanentRedirect(input, issues);
    this.checkRedirectChain(input, issues);
    this.checkFacetExplosion(input, issues);
    this.checkDuplicateCanonical(input, issues);
    this.checkUrlInSitemap(input, issues);
    this.checkSitemapClean(input, issues);
    this.checkSitemapExists(input, issues);

    return issues;
  }

  // ---------------------------------------------------------------------------
  // Rule 338 — URL should be all lowercase
  // ---------------------------------------------------------------------------

  private checkLowercaseUrl(input: UrlArchitectureInput, issues: UrlArchitectureIssue[]): void {
    let pathname: string;
    try {
      pathname = new URL(input.url).pathname;
    } catch {
      pathname = input.url;
    }

    if (pathname !== pathname.toLowerCase()) {
      issues.push({
        ruleId: 'rule-338',
        severity: 'medium',
        title: 'URL contains uppercase letters',
        description:
          `The URL path "${pathname}" contains uppercase characters. ` +
          'Search engines treat URLs as case-sensitive, so uppercase and lowercase variants ' +
          'may be indexed as separate pages, diluting ranking signals.',
        affectedElement: input.url,
        exampleFix: input.url.replace(pathname, pathname.toLowerCase()),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 340 — No session IDs in URLs
  // ---------------------------------------------------------------------------

  private checkSessionIds(input: UrlArchitectureInput, issues: UrlArchitectureIssue[]): void {
    const params = this.getQueryParams(input);
    const sessionParams = params.filter((p) =>
      SESSION_ID_PARAMS.includes(p.toLowerCase())
    );

    if (sessionParams.length > 0) {
      issues.push({
        ruleId: 'rule-340',
        severity: 'medium',
        title: 'Session ID detected in URL',
        description:
          `The URL contains session-related query parameter(s): ${sessionParams.join(', ')}. ` +
          'Session IDs in URLs create infinite URL variations for the same content, ' +
          'wasting crawl budget and causing duplicate content issues.',
        affectedElement: input.url,
        exampleFix:
          'Use cookies for session management instead of URL parameters. ' +
          'Add these parameters to robots.txt Disallow or use canonical tags.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 348 — No canonical chains
  // ---------------------------------------------------------------------------

  private checkCanonicalChain(input: UrlArchitectureInput, issues: UrlArchitectureIssue[]): void {
    if (!input.canonicalUrl || !input.canonicalOfCanonical) return;

    const normalizedCanonical = this.normalizeUrl(input.canonicalUrl);
    const normalizedCanonicalOfCanonical = this.normalizeUrl(input.canonicalOfCanonical);

    if (normalizedCanonical !== normalizedCanonicalOfCanonical) {
      issues.push({
        ruleId: 'rule-348',
        severity: 'high',
        title: 'Canonical chain detected',
        description:
          `This page's canonical points to "${input.canonicalUrl}", which itself has a canonical ` +
          `pointing to "${input.canonicalOfCanonical}". Canonical chains confuse search engines ` +
          'and may cause them to ignore the canonical signal entirely.',
        affectedElement: `${input.url} -> ${input.canonicalUrl} -> ${input.canonicalOfCanonical}`,
        exampleFix:
          `Update the canonical tag to point directly to the final target: "${input.canonicalOfCanonical}".`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rules 354-355 — Bot response time
  // ---------------------------------------------------------------------------

  private checkResponseTime(input: UrlArchitectureInput, issues: UrlArchitectureIssue[]): void {
    if (input.responseTimeMs === undefined) return;

    if (input.responseTimeMs > 5000) {
      issues.push({
        ruleId: 'rule-354',
        severity: 'critical',
        title: 'Extremely slow response time',
        description:
          `The page took ${input.responseTimeMs}ms to respond, far exceeding the 5-second critical threshold. ` +
          'Search engine bots may time out or abandon crawling, and slow pages are demoted in rankings.',
        affectedElement: input.url,
        exampleFix:
          'Investigate server performance, enable caching, optimize database queries, and consider a CDN.',
      });
    } else if (input.responseTimeMs > 2000) {
      issues.push({
        ruleId: 'rule-355',
        severity: 'medium',
        title: 'Slow response time',
        description:
          `The page took ${input.responseTimeMs}ms to respond, exceeding the 2-second recommended limit. ` +
          'Slow response times waste crawl budget and negatively impact user experience and rankings.',
        affectedElement: input.url,
        exampleFix:
          'Optimize server response time to under 2 seconds. Consider server-side caching or upgrading hosting.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 359 — No active 404s
  // ---------------------------------------------------------------------------

  private checkActive404(input: UrlArchitectureInput, issues: UrlArchitectureIssue[]): void {
    if (input.statusCode !== 404) return;
    if (!input.linkedFrom || input.linkedFrom.length === 0) return;

    issues.push({
      ruleId: 'rule-359',
      severity: 'high',
      title: 'Active 404 — broken page linked from other pages',
      description:
        `The page "${input.url}" returns a 404 status but is linked from ${input.linkedFrom.length} page(s): ` +
        `${input.linkedFrom.slice(0, 3).join(', ')}${input.linkedFrom.length > 3 ? '...' : ''}. ` +
        'Active 404s waste crawl budget, break link equity flow, and harm user experience.',
      affectedElement: input.url,
      exampleFix:
        'Either restore the page, redirect it to a relevant alternative with a 301, or remove the incoming links.',
    });
  }

  // ---------------------------------------------------------------------------
  // Rule 361 — 301 for permanent redirects
  // ---------------------------------------------------------------------------

  private checkPermanentRedirect(
    input: UrlArchitectureInput,
    issues: UrlArchitectureIssue[]
  ): void {
    if (!input.redirectTarget) return;
    if (input.redirectStatusCode === undefined) return;

    if (input.redirectStatusCode === 302 || input.redirectStatusCode === 307) {
      issues.push({
        ruleId: 'rule-361',
        severity: 'high',
        title: 'Temporary redirect used instead of permanent (301)',
        description:
          `The URL "${input.url}" uses a ${input.redirectStatusCode} (temporary) redirect to "${input.redirectTarget}". ` +
          'For permanent URL changes, use a 301 redirect so search engines transfer ranking signals to the new URL. ' +
          'Temporary redirects do not consolidate link equity.',
        affectedElement: input.url,
        exampleFix:
          `Change the ${input.redirectStatusCode} redirect to a 301 (permanent) redirect.`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 362 — No redirect chains
  // ---------------------------------------------------------------------------

  private checkRedirectChain(input: UrlArchitectureInput, issues: UrlArchitectureIssue[]): void {
    if (input.redirectChainLength === undefined) return;

    if (input.redirectChainLength > 1) {
      issues.push({
        ruleId: 'rule-362',
        severity: 'high',
        title: 'Redirect chain detected',
        description:
          `The URL "${input.url}" goes through ${input.redirectChainLength} redirect hops before reaching the final destination. ` +
          'Each redirect hop adds latency, wastes crawl budget, and may cause search engines to stop following the chain.',
        affectedElement: input.url,
        exampleFix:
          'Update redirects to point directly to the final destination URL, eliminating intermediate hops.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 365 — No filter/facet URL explosion
  // ---------------------------------------------------------------------------

  private checkFacetExplosion(input: UrlArchitectureInput, issues: UrlArchitectureIssue[]): void {
    const params = this.getQueryParams(input);
    const facetParams = params.filter((p) =>
      FACET_PARAM_PATTERNS.some((pattern) => p.toLowerCase().includes(pattern))
    );

    if (facetParams.length > 3) {
      issues.push({
        ruleId: 'rule-365',
        severity: 'medium',
        title: 'Filter/facet URL explosion risk',
        description:
          `The URL contains ${facetParams.length} filter/facet/pagination parameters: ${facetParams.join(', ')}. ` +
          'Excessive faceted navigation parameters generate thousands of URL variants with near-duplicate content, ' +
          'wasting crawl budget and diluting ranking signals.',
        affectedElement: input.url,
        exampleFix:
          'Use robots.txt to block faceted URLs, add noindex to filtered pages, ' +
          'or implement AJAX-based filtering that does not change the URL.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 367 — Duplicates handled via canonical
  // ---------------------------------------------------------------------------

  private checkDuplicateCanonical(
    input: UrlArchitectureInput,
    issues: UrlArchitectureIssue[]
  ): void {
    if (!input.duplicateUrls || input.duplicateUrls.length === 0) return;

    if (!input.canonicalUrl) {
      issues.push({
        ruleId: 'rule-367',
        severity: 'medium',
        title: 'Duplicate content without canonical tag',
        description:
          `The page "${input.url}" has ${input.duplicateUrls.length} duplicate URL(s) ` +
          `(${input.duplicateUrls.slice(0, 3).join(', ')}${input.duplicateUrls.length > 3 ? '...' : ''}) ` +
          'but no canonical tag is set. Without a canonical tag, search engines may index multiple versions ' +
          'of the same content, splitting ranking signals across duplicates.',
        affectedElement: input.url,
        exampleFix:
          `Add <link rel="canonical" href="${input.url}"> to designate the preferred version.`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 374 — URL should be in sitemap
  // ---------------------------------------------------------------------------

  private checkUrlInSitemap(input: UrlArchitectureInput, issues: UrlArchitectureIssue[]): void {
    if (!input.sitemapUrls) return;

    const normalizedUrl = this.normalizeUrl(input.url);
    const inSitemap = input.sitemapUrls.some(
      (u) => this.normalizeUrl(u) === normalizedUrl
    );

    if (!inSitemap) {
      issues.push({
        ruleId: 'rule-374',
        severity: 'medium',
        title: 'URL not found in sitemap',
        description:
          `The page "${input.url}" is not listed in the XML sitemap. ` +
          'Pages missing from the sitemap may be discovered less efficiently by search engine crawlers, ' +
          'especially on large sites where internal linking alone may not surface all pages.',
        affectedElement: input.url,
        exampleFix: `Add "${input.url}" to the sitemap.xml file.`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 375 — Sitemap should not contain 4xx/5xx URLs
  // ---------------------------------------------------------------------------

  private checkSitemapClean(input: UrlArchitectureInput, issues: UrlArchitectureIssue[]): void {
    if (!input.sitemapUrls || input.statusCode === undefined) return;

    const normalizedUrl = this.normalizeUrl(input.url);
    const inSitemap = input.sitemapUrls.some(
      (u) => this.normalizeUrl(u) === normalizedUrl
    );

    if (inSitemap && input.statusCode >= 400) {
      issues.push({
        ruleId: 'rule-375',
        severity: 'high',
        title: 'Error URL found in sitemap',
        description:
          `The URL "${input.url}" returns HTTP ${input.statusCode} but is listed in the sitemap. ` +
          'Sitemaps should only contain indexable, 200-status URLs. Including error pages wastes crawl budget ' +
          'and signals poor site maintenance to search engines.',
        affectedElement: input.url,
        exampleFix:
          `Remove "${input.url}" from the sitemap, or fix the page so it returns a 200 status.`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 378 — Sitemap must exist
  // ---------------------------------------------------------------------------

  private checkSitemapExists(input: UrlArchitectureInput, issues: UrlArchitectureIssue[]): void {
    // Only flag if sitemapUrls was explicitly provided as empty or not provided.
    // undefined means "not checked", but empty array means "checked and empty".
    if (input.sitemapUrls !== undefined && input.sitemapUrls.length > 0) return;
    if (input.sitemapUrls === undefined) return;

    issues.push({
      ruleId: 'rule-378',
      severity: 'low',
      title: 'No sitemap found',
      description:
        'No XML sitemap was found or the sitemap is empty. ' +
        'A sitemap helps search engines discover and prioritize pages for crawling, ' +
        'especially on large or deep sites where internal linking may miss some pages.',
      affectedElement: 'sitemap.xml',
      exampleFix:
        'Create a sitemap.xml file listing all indexable pages and submit it via Google Search Console.',
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Extract query parameter names from the input, either from the explicit
   * queryParams array or by parsing the URL.
   */
  private getQueryParams(input: UrlArchitectureInput): string[] {
    if (input.queryParams && input.queryParams.length > 0) {
      return input.queryParams;
    }

    try {
      const parsed = new URL(input.url);
      return Array.from(parsed.searchParams.keys());
    } catch {
      return [];
    }
  }

  /**
   * Normalize a URL for comparison by lowercasing protocol + host,
   * removing trailing slashes, and stripping default ports.
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      let normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
      if (normalized.endsWith('/') && parsed.pathname !== '/') {
        normalized = normalized.slice(0, -1);
      }
      if (parsed.search) {
        normalized += parsed.search;
      }
      return normalized.toLowerCase();
    } catch {
      return url.toLowerCase().replace(/\/+$/, '');
    }
  }
}
