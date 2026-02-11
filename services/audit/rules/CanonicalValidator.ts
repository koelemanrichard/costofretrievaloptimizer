/**
 * CanonicalValidator
 *
 * Validates canonical tag configuration for SEO audit purposes.
 * Checks presence, format, self-referencing, noindex conflicts,
 * and consistency between HTML and HTTP header canonical signals.
 *
 * Rules implemented:
 *   271 - Canonical tag must be present
 *   273 - noindex + canonical pointing elsewhere = conflict
 *   346 - Canonical should be self-referencing
 *   347 - Canonical URL must be absolute and well-formed (no relative, no fragments)
 *   349 - HTML canonical and HTTP Link header canonical must match
 */

export interface CanonicalIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export interface CanonicalContext {
  html: string;
  pageUrl: string;
  httpHeaders?: Record<string, string>;
}

export class CanonicalValidator {
  validate(context: CanonicalContext): CanonicalIssue[] {
    const issues: CanonicalIssue[] = [];
    const canonical = this.extractCanonical(context.html);
    const metaRobots = this.extractMetaRobots(context.html);

    this.checkCanonicalPresent(canonical, issues);
    this.checkNoindexCanonicalConflict(canonical, metaRobots, context.pageUrl, issues);
    this.checkSelfReferencing(canonical, context.pageUrl, issues);
    this.checkCanonicalFormat(canonical, issues);
    this.checkConsistentSignals(canonical, context, issues);

    return issues;
  }

  /**
   * Extract the canonical URL from an HTML <link rel="canonical"> tag.
   * Handles both attribute orderings: rel before href and href before rel.
   */
  extractCanonical(html: string): string | null {
    const match =
      html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
      html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
    return match?.[1] || null;
  }

  /**
   * Extract the meta robots content directive from HTML.
   * Handles both attribute orderings: name before content and content before name.
   */
  extractMetaRobots(html: string): string {
    const match =
      html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i);
    return match?.[1]?.toLowerCase() || '';
  }

  /**
   * Extract canonical URL from HTTP Link header.
   * Parses `Link: <url>; rel="canonical"` format.
   */
  extractHttpCanonical(httpHeaders?: Record<string, string>): string | null {
    if (!httpHeaders) return null;

    // Normalize header keys to lowercase for case-insensitive lookup
    const linkValue = Object.entries(httpHeaders).find(
      ([key]) => key.toLowerCase() === 'link'
    )?.[1];

    if (!linkValue) return null;

    const match = linkValue.match(/<([^>]+)>\s*;\s*rel=["']?canonical["']?/i);
    return match?.[1] || null;
  }

  // ---------------------------------------------------------------------------
  // Rule checks
  // ---------------------------------------------------------------------------

  /**
   * Rule 271: Canonical tag must be present in the HTML.
   */
  private checkCanonicalPresent(canonical: string | null, issues: CanonicalIssue[]): void {
    if (!canonical) {
      issues.push({
        ruleId: 'rule-271',
        severity: 'critical',
        title: 'Missing canonical tag',
        description:
          'The page does not contain a <link rel="canonical"> tag. ' +
          'Without a canonical tag, search engines may index duplicate versions of this page, ' +
          'diluting ranking signals.',
        affectedElement: '<head>',
        exampleFix: '<link rel="canonical" href="https://example.com/page">',
      });
    }
  }

  /**
   * Rule 273: noindex directive combined with a canonical pointing to a different
   * URL creates a conflicting signal for search engines.
   *
   * A self-referencing canonical with noindex is not a conflict (the page simply
   * asks not to be indexed). The conflict arises when the canonical points
   * elsewhere, telling engines "the authoritative version is over there" while
   * simultaneously saying "don't index this page."
   */
  private checkNoindexCanonicalConflict(
    canonical: string | null,
    metaRobots: string,
    pageUrl: string,
    issues: CanonicalIssue[]
  ): void {
    if (!canonical) return;

    const hasNoindex = metaRobots.includes('noindex');
    if (!hasNoindex) return;

    // Only flag when canonical points to a different URL
    const normalizedCanonical = this.normalizeUrl(canonical);
    const normalizedPage = this.normalizeUrl(pageUrl);
    if (normalizedCanonical === normalizedPage) return;

    issues.push({
      ruleId: 'rule-273',
      severity: 'critical',
      title: 'noindex conflicts with canonical tag',
      description:
        'The page has a "noindex" robots directive but also includes a canonical tag ' +
        `pointing to a different URL (${canonical}). This sends conflicting signals ` +
        'to search engines. Either remove the noindex directive or make the canonical self-referencing.',
      affectedElement: '<meta name="robots">',
      exampleFix:
        'Remove "noindex" from the robots meta tag, or change the canonical to point to this page.',
    });
  }

  /**
   * Rule 346: The canonical tag should be self-referencing, pointing back to the
   * current page URL. A non-self-referencing canonical may be intentional (e.g.
   * paginated pages), but it is flagged as a high-severity advisory.
   */
  private checkSelfReferencing(
    canonical: string | null,
    pageUrl: string,
    issues: CanonicalIssue[]
  ): void {
    if (!canonical) return;

    const normalizedCanonical = this.normalizeUrl(canonical);
    const normalizedPage = this.normalizeUrl(pageUrl);

    if (normalizedCanonical !== normalizedPage) {
      issues.push({
        ruleId: 'rule-346',
        severity: 'high',
        title: 'Canonical is not self-referencing',
        description:
          `The canonical tag points to "${canonical}" which differs from the current page ` +
          `URL "${pageUrl}". If this is unintentional, update the canonical to be self-referencing. ` +
          'Non-self-referencing canonicals cause search engines to deprioritize this page in favor of the target.',
        affectedElement: `<link rel="canonical" href="${canonical}">`,
        exampleFix: `<link rel="canonical" href="${pageUrl}">`,
      });
    }
  }

  /**
   * Rule 347: The canonical URL must be absolute (starting with http:// or https://)
   * and must not contain a fragment identifier (#).
   */
  private checkCanonicalFormat(canonical: string | null, issues: CanonicalIssue[]): void {
    if (!canonical) return;

    const isAbsolute = /^https?:\/\//i.test(canonical);
    const hasFragment = canonical.includes('#');

    if (!isAbsolute) {
      issues.push({
        ruleId: 'rule-347',
        severity: 'high',
        title: 'Canonical URL is not absolute',
        description:
          `The canonical tag contains a relative URL "${canonical}". ` +
          'Canonical URLs must be fully qualified absolute URLs including the protocol and domain.',
        affectedElement: `<link rel="canonical" href="${canonical}">`,
        exampleFix: `<link rel="canonical" href="https://example.com${canonical}">`,
      });
    } else if (hasFragment) {
      issues.push({
        ruleId: 'rule-347',
        severity: 'high',
        title: 'Canonical URL contains a fragment',
        description:
          `The canonical tag URL "${canonical}" contains a fragment identifier (#). ` +
          'Fragment identifiers are not processed by search engines for canonical evaluation ' +
          'and should be removed.',
        affectedElement: `<link rel="canonical" href="${canonical}">`,
        exampleFix: `<link rel="canonical" href="${canonical.split('#')[0]}">`,
      });
    }
  }

  /**
   * Rule 349: When both an HTML <link rel="canonical"> and an HTTP Link header
   * canonical exist, they must point to the same URL.
   */
  private checkConsistentSignals(
    canonical: string | null,
    context: CanonicalContext,
    issues: CanonicalIssue[]
  ): void {
    if (!canonical) return;

    const httpCanonical = this.extractHttpCanonical(context.httpHeaders);
    if (!httpCanonical) return;

    const normalizedHtml = this.normalizeUrl(canonical);
    const normalizedHttp = this.normalizeUrl(httpCanonical);

    if (normalizedHtml !== normalizedHttp) {
      issues.push({
        ruleId: 'rule-349',
        severity: 'high',
        title: 'HTML and HTTP header canonical mismatch',
        description:
          `The HTML canonical tag points to "${canonical}" but the HTTP Link header ` +
          `canonical points to "${httpCanonical}". These must be consistent; conflicting ` +
          'canonical signals confuse search engines and may result in the wrong URL being indexed.',
        affectedElement: 'HTTP Link header vs <link rel="canonical">',
        exampleFix:
          'Ensure both the HTML canonical tag and the HTTP Link header point to the same URL.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Normalize a URL for comparison by removing trailing slashes,
   * lowercasing the protocol and hostname, and stripping default ports.
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Lowercase protocol + host, remove default ports, remove trailing slash
      let normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
      // Remove trailing slash (except for root "/")
      if (normalized.endsWith('/') && parsed.pathname !== '/') {
        normalized = normalized.slice(0, -1);
      }
      // Append search params if present
      if (parsed.search) {
        normalized += parsed.search;
      }
      return normalized.toLowerCase();
    } catch {
      // If the URL is not parseable (e.g. relative), return it lowercased as-is
      return url.toLowerCase().replace(/\/+$/, '');
    }
  }
}
