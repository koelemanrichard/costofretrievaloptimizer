export interface DiscoveredUrl {
  url: string;
  source: 'sitemap' | 'link' | 'pattern';
  relevanceScore: number;
}

export class RelatedUrlDiscoverer {
  /**
   * Discover related URLs for a given page.
   * Strategies: sitemap parsing, internal link extraction, URL pattern matching.
   */
  async discover(url: string, html?: string, limit: number = 20): Promise<DiscoveredUrl[]> {
    const base = new URL(url);
    const discovered: DiscoveredUrl[] = [];

    // Strategy 1: Try to fetch and parse sitemap
    try {
      const sitemapUrls = await this.fetchSitemap(base.origin);
      discovered.push(...sitemapUrls.map(u => ({ url: u, source: 'sitemap' as const, relevanceScore: 0.5 })));
    } catch {
      // Sitemap not available — skip
    }

    // Strategy 2: Extract internal links from provided HTML
    if (html) {
      const links = this.extractInternalLinks(html, url);
      discovered.push(...links.map(l => ({ url: l.href, source: 'link' as const, relevanceScore: 0.7 })));
    }

    // Deduplicate and rank
    const ranked = this.deduplicateAndRank(discovered, url);
    return ranked.slice(0, limit);
  }

  /**
   * Fetch sitemap.xml from root domain.
   */
  async fetchSitemap(baseUrl: string): Promise<string[]> {
    const response = await fetch(`${baseUrl}/sitemap.xml`);
    if (!response.ok) throw new Error(`Sitemap not found: HTTP ${response.status}`);
    const xml = await response.text();

    // Check if this is a sitemap index
    if (xml.includes('<sitemapindex')) {
      return this.parseSitemapIndex(xml);
    }
    return this.parseSitemapXml(xml);
  }

  /**
   * Parse a sitemap index to get URLs from child sitemaps.
   */
  private async parseSitemapIndex(xml: string): Promise<string[]> {
    const sitemapUrls: string[] = [];
    const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
    let match;
    while ((match = locRegex.exec(xml)) !== null) {
      sitemapUrls.push(match[1].trim());
    }
    // Fetch first 3 child sitemaps to avoid excessive requests
    const allUrls: string[] = [];
    for (const sitemapUrl of sitemapUrls.slice(0, 3)) {
      try {
        const response = await fetch(sitemapUrl);
        if (response.ok) {
          const childXml = await response.text();
          allUrls.push(...this.parseSitemapXml(childXml));
        }
      } catch {
        // Skip failed child sitemaps
      }
    }
    return allUrls;
  }

  /**
   * Parse sitemap XML and extract <loc> URLs.
   */
  parseSitemapXml(xml: string): string[] {
    const urls: string[] = [];
    const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
    let match;
    while ((match = locRegex.exec(xml)) !== null) {
      urls.push(match[1].trim());
    }
    return urls;
  }

  /**
   * Extract internal links from HTML, resolving relative URLs.
   */
  extractInternalLinks(html: string, baseUrl: string): { href: string; anchor: string }[] {
    const base = new URL(baseUrl);
    const links: { href: string; anchor: string }[] = [];
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const anchor = match[2].replace(/<[^>]+>/g, '').trim();
      try {
        const resolved = new URL(href, baseUrl);
        if (resolved.hostname === base.hostname) {
          links.push({ href: resolved.href, anchor });
        }
      } catch {
        // Skip invalid URLs
      }
    }
    return links;
  }

  /**
   * Deduplicate discovered URLs and rank by relevance.
   * URLs found in multiple sources get higher scores.
   * URLs closer in path to the target URL get boosted.
   */
  deduplicateAndRank(urls: DiscoveredUrl[], targetUrl: string): DiscoveredUrl[] {
    const urlMap = new Map<string, DiscoveredUrl>();

    for (const item of urls) {
      const normalized = this.normalizeUrl(item.url);
      if (normalized === this.normalizeUrl(targetUrl)) continue; // Skip self

      const existing = urlMap.get(normalized);
      if (existing) {
        // Boost score for URLs found in multiple sources
        existing.relevanceScore = Math.min(1.0, existing.relevanceScore + 0.3);
      } else {
        urlMap.set(normalized, { ...item, url: normalized });
      }
    }

    // Boost URLs in same directory
    const targetPath = new URL(targetUrl).pathname;
    const targetDir = targetPath.substring(0, targetPath.lastIndexOf('/'));

    for (const [, item] of urlMap) {
      try {
        const itemPath = new URL(item.url).pathname;
        const itemDir = itemPath.substring(0, itemPath.lastIndexOf('/'));
        if (itemDir === targetDir) {
          item.relevanceScore = Math.min(1.0, item.relevanceScore + 0.2);
        }
      } catch {
        // Skip
      }
    }

    return Array.from(urlMap.values()).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Find URLs matching the same directory/category pattern as the target.
   */
  findRelatedByPattern(targetUrl: string, allUrls: string[]): DiscoveredUrl[] {
    const target = new URL(targetUrl);
    const targetSegments = target.pathname.split('/').filter(Boolean);

    if (targetSegments.length < 2) return [];

    const parentPath = '/' + targetSegments.slice(0, -1).join('/');

    return allUrls
      .filter(u => {
        try {
          const parsed = new URL(u);
          return parsed.hostname === target.hostname && parsed.pathname.startsWith(parentPath) && parsed.href !== target.href;
        } catch {
          return false;
        }
      })
      .map(url => ({ url, source: 'pattern' as const, relevanceScore: 0.6 }));
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slash, hash, and common tracking params
      const normalized = parsed.origin + parsed.pathname.replace(/\/$/, '') + parsed.search;
      return normalized;
    } catch {
      return url;
    }
  }
}
