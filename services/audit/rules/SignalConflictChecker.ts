/**
 * SignalConflictChecker
 *
 * Detects conflicting SEO signals on a page:
 *   - Rule 373: URL blocked by robots.txt but present in sitemap
 *   - Rule 273: Page has noindex meta tag but canonical points to a different URL
 *   - Internal nofollow: rel="nofollow" on internal links wastes crawl equity
 */

export interface SignalConflict {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

export interface SignalContext {
  html: string;
  pageUrl: string;
  robotsTxt?: string;
  sitemapUrls?: string[];
}

interface RobotsTxtRule {
  type: 'allow' | 'disallow';
  pattern: string;
}

interface RobotsTxtSection {
  userAgents: string[];
  rules: RobotsTxtRule[];
}

export class SignalConflictChecker {
  /**
   * Run all signal conflict checks against the given context.
   */
  check(context: SignalContext): SignalConflict[] {
    const conflicts: SignalConflict[] = [];
    this.checkRobotsBlockedInSitemap(context, conflicts);
    this.checkNoindexWithCanonical(context, conflicts);
    this.checkNofollowInternalLinks(context, conflicts);
    return conflicts;
  }

  // ---------------------------------------------------------------------------
  // Rule 373 — robots.txt blocks the URL but it appears in the sitemap
  // ---------------------------------------------------------------------------

  private checkRobotsBlockedInSitemap(
    context: SignalContext,
    conflicts: SignalConflict[]
  ): void {
    if (!context.robotsTxt || !context.sitemapUrls) return;

    const blocked = this.isUrlBlocked(context.robotsTxt, context.pageUrl);
    const inSitemap = context.sitemapUrls.some(
      (u) => this.normalizeUrl(u) === this.normalizeUrl(context.pageUrl)
    );

    if (blocked && inSitemap) {
      conflicts.push({
        ruleId: 'rule-373',
        severity: 'critical',
        title: 'URL blocked by robots.txt but listed in sitemap',
        description:
          `The page "${context.pageUrl}" is disallowed in robots.txt yet included in the XML sitemap. ` +
          'Search engines receive contradictory signals: one tells them not to crawl, while the other invites indexing.',
        affectedElement: 'robots.txt + sitemap',
        exampleFix:
          'Either remove the Disallow rule from robots.txt or remove the URL from the sitemap.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Rule 273 — noindex meta tag combined with a canonical pointing elsewhere
  // ---------------------------------------------------------------------------

  private checkNoindexWithCanonical(
    context: SignalContext,
    conflicts: SignalConflict[]
  ): void {
    const hasNoindex = this.hasNoindexDirective(context.html);
    const canonicalHref = this.extractCanonicalHref(context.html);

    if (!hasNoindex || !canonicalHref) return;

    const canonicalNorm = this.normalizeUrl(canonicalHref);
    const pageNorm = this.normalizeUrl(context.pageUrl);

    if (canonicalNorm !== pageNorm) {
      conflicts.push({
        ruleId: 'rule-273',
        severity: 'critical',
        title: 'noindex page has canonical pointing to a different URL',
        description:
          `The page has a "noindex" robots directive but its canonical tag points to "${canonicalHref}". ` +
          'These signals conflict: noindex tells search engines to drop the page from the index, while ' +
          'the cross-domain/cross-page canonical suggests another URL should receive ranking signals.',
        affectedElement: '<meta name="robots"> + <link rel="canonical">',
        exampleFix:
          'Remove the noindex directive if the canonical target should be indexed, or set the canonical to self-referencing.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Internal nofollow — rel="nofollow" on same-domain links
  // ---------------------------------------------------------------------------

  private checkNofollowInternalLinks(
    context: SignalContext,
    conflicts: SignalConflict[]
  ): void {
    const internalNofollowLinks = this.findInternalNofollowLinks(
      context.html,
      context.pageUrl
    );

    if (internalNofollowLinks.length > 0) {
      conflicts.push({
        ruleId: 'rule-nofollow-internal',
        severity: 'medium',
        title: 'Internal links use rel="nofollow"',
        description:
          `Found ${internalNofollowLinks.length} internal link(s) with rel="nofollow". ` +
          'Using nofollow on internal links prevents PageRank flow within your own site and wastes crawl equity.',
        affectedElement: internalNofollowLinks.join(', '),
        exampleFix:
          'Remove rel="nofollow" from internal links. Reserve nofollow for untrusted external or user-generated links.',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // robots.txt parsing
  // ---------------------------------------------------------------------------

  /**
   * Returns true if the given URL is effectively blocked by the robots.txt content.
   *
   * Implements simple prefix-based matching per the robots.txt specification:
   *  - Finds the most specific user-agent section (* or exact match)
   *  - Checks Disallow / Allow rules in declaration order
   *  - Longest matching pattern wins; on tie, Allow takes precedence
   */
  isUrlBlocked(robotsTxt: string, url: string, userAgent = '*'): boolean {
    const sections = this.parseRobotsTxt(robotsTxt);
    const urlPath = this.extractPath(url);

    // Find the section that applies: prefer an exact user-agent match, fall back to *
    let applicableSection: RobotsTxtSection | undefined;

    for (const section of sections) {
      const agents = section.userAgents.map((a) => a.toLowerCase());
      if (agents.includes(userAgent.toLowerCase())) {
        applicableSection = section;
        break;
      }
    }

    if (!applicableSection) {
      for (const section of sections) {
        if (section.userAgents.includes('*')) {
          applicableSection = section;
          break;
        }
      }
    }

    if (!applicableSection) return false;

    // Evaluate rules — longest matching pattern wins. On tie, Allow > Disallow.
    let bestMatch: { type: 'allow' | 'disallow'; length: number } | null = null;

    for (const rule of applicableSection.rules) {
      if (this.pathMatchesPattern(urlPath, rule.pattern)) {
        const matchLength = rule.pattern.length;
        if (
          !bestMatch ||
          matchLength > bestMatch.length ||
          (matchLength === bestMatch.length && rule.type === 'allow')
        ) {
          bestMatch = { type: rule.type, length: matchLength };
        }
      }
    }

    return bestMatch?.type === 'disallow';
  }

  private parseRobotsTxt(robotsTxt: string): RobotsTxtSection[] {
    const sections: RobotsTxtSection[] = [];
    let currentSection: RobotsTxtSection | null = null;

    const lines = robotsTxt.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.replace(/#.*$/, '').trim();
      if (!line) continue;

      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const directive = line.slice(0, colonIndex).trim().toLowerCase();
      const value = line.slice(colonIndex + 1).trim();

      if (directive === 'user-agent') {
        if (!currentSection || currentSection.rules.length > 0) {
          currentSection = { userAgents: [], rules: [] };
          sections.push(currentSection);
        }
        currentSection.userAgents.push(value);
      } else if (directive === 'disallow' && currentSection) {
        if (value) {
          currentSection.rules.push({ type: 'disallow', pattern: value });
        }
      } else if (directive === 'allow' && currentSection) {
        if (value) {
          currentSection.rules.push({ type: 'allow', pattern: value });
        }
      }
    }

    return sections;
  }

  private extractPath(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      // Fallback: treat the url itself as a path
      return url.startsWith('/') ? url : `/${url}`;
    }
  }

  /**
   * Simple prefix-based pattern matching (supports trailing `*` wildcard
   * and `$` end-of-path anchor as per the specification).
   */
  private pathMatchesPattern(path: string, pattern: string): boolean {
    if (pattern.endsWith('$')) {
      const prefix = pattern.slice(0, -1);
      return path === prefix;
    }
    const cleanPattern = pattern.endsWith('*')
      ? pattern.slice(0, -1)
      : pattern;
    return path.startsWith(cleanPattern);
  }

  // ---------------------------------------------------------------------------
  // HTML extraction helpers
  // ---------------------------------------------------------------------------

  private hasNoindexDirective(html: string): boolean {
    // Match <meta name="robots" content="...noindex...">
    const metaRegex =
      /<meta\s[^>]*name\s*=\s*["']robots["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*\/?>/gi;
    const metaRegexAlt =
      /<meta\s[^>]*content\s*=\s*["']([^"']*)["'][^>]*name\s*=\s*["']robots["'][^>]*\/?>/gi;

    let match: RegExpExecArray | null;

    // eslint-disable-next-line no-cond-assign
    while ((match = metaRegex.exec(html)) !== null) {
      if (match[1].toLowerCase().includes('noindex')) return true;
    }
    // eslint-disable-next-line no-cond-assign
    while ((match = metaRegexAlt.exec(html)) !== null) {
      if (match[1].toLowerCase().includes('noindex')) return true;
    }

    return false;
  }

  private extractCanonicalHref(html: string): string | null {
    const canonicalRegex =
      /<link\s[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']*)["'][^>]*\/?>/gi;
    const canonicalRegexAlt =
      /<link\s[^>]*href\s*=\s*["']([^"']*)["'][^>]*rel\s*=\s*["']canonical["'][^>]*\/?>/gi;

    let match = canonicalRegex.exec(html);
    if (match) return match[1];

    match = canonicalRegexAlt.exec(html);
    if (match) return match[1];

    return null;
  }

  private findInternalNofollowLinks(
    html: string,
    pageUrl: string
  ): string[] {
    const results: string[] = [];
    let pageDomain: string;

    try {
      pageDomain = new URL(pageUrl).hostname;
    } catch {
      return results;
    }

    // Match all <a> tags
    const anchorRegex = /<a\s[^>]*>/gi;
    let anchorMatch: RegExpExecArray | null;

    // eslint-disable-next-line no-cond-assign
    while ((anchorMatch = anchorRegex.exec(html)) !== null) {
      const tag = anchorMatch[0];

      // Check for rel="nofollow"
      const relMatch = tag.match(/\brel\s*=\s*["']([^"']*)["']/i);
      if (!relMatch) continue;

      const relValues = relMatch[1].toLowerCase().split(/\s+/);
      if (!relValues.includes('nofollow')) continue;

      // Extract href
      const hrefMatch = tag.match(/\bhref\s*=\s*["']([^"']*)["']/i);
      if (!hrefMatch) continue;

      const href = hrefMatch[1];

      // Determine if internal
      try {
        const linkDomain = new URL(href).hostname;
        if (linkDomain === pageDomain) {
          results.push(href);
        }
      } catch {
        // Relative URLs are always internal
        if (href.startsWith('/') || (!href.includes('://') && !href.startsWith('mailto:'))) {
          results.push(href);
        }
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slash for consistency, keep path as-is otherwise
      let path = parsed.pathname;
      if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      return `${parsed.protocol}//${parsed.hostname}${path}`;
    } catch {
      return url.replace(/\/+$/, '');
    }
  }
}
