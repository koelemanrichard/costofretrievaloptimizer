// services/sitemapService.ts
// XML Sitemap parser for site analysis

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export interface SitemapParseResult {
  urls: SitemapUrl[];
  sitemapIndexUrls?: string[]; // If this was a sitemap index
  errors: string[];
  totalFound: number;
}

export interface ProxyConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

// Helper to fetch via proxy (avoids CORS issues)
const fetchViaProxy = async (
  url: string,
  method: 'GET' | 'HEAD' = 'GET',
  proxyConfig?: ProxyConfig
): Promise<{ ok: boolean; status: number; body?: string; error?: string }> => {
  // If no proxy config, try direct fetch (will fail with CORS in browser)
  if (!proxyConfig?.supabaseUrl) {
    try {
      const response = await fetch(url, {
        method,
        headers: { 'User-Agent': 'HolisticSEO-SiteAnalyzer/1.0' },
      });
      const body = method === 'GET' ? await response.text() : undefined;
      return { ok: response.ok, status: response.status, body };
    } catch (error: any) {
      return { ok: false, status: 0, error: error.message };
    }
  }

  // Use Supabase Edge Function proxy
  const proxyUrl = `${proxyConfig.supabaseUrl}/functions/v1/fetch-proxy`;
  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': proxyConfig.supabaseAnonKey,
      },
      body: JSON.stringify({ url, method }),
    });

    const data = await response.json();
    return {
      ok: data.ok,
      status: data.status,
      body: data.body,
      error: data.error,
    };
  } catch (error: any) {
    return { ok: false, status: 0, error: error.message };
  }
};

/**
 * Fetch and parse an XML sitemap from a URL
 */
export const parseSitemap = async (
  sitemapUrl: string,
  options?: {
    followSitemapIndex?: boolean;
    maxUrls?: number;
    filterPattern?: RegExp;
    proxyConfig?: ProxyConfig;
  }
): Promise<SitemapParseResult> => {
  const { followSitemapIndex = true, maxUrls = 10000, filterPattern, proxyConfig } = options || {};
  const result: SitemapParseResult = {
    urls: [],
    errors: [],
    totalFound: 0,
  };

  try {
    const fetchResult = await fetchViaProxy(sitemapUrl, 'GET', proxyConfig);

    if (!fetchResult.ok) {
      throw new Error(`Failed to fetch sitemap: ${fetchResult.status} ${fetchResult.error || 'Unknown error'}`);
    }

    const xmlText = fetchResult.body || '';

    // Parse the XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    // Check for XML parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error(`XML parse error: ${parseError.textContent}`);
    }

    // Check if this is a sitemap index
    const sitemapIndexElements = doc.querySelectorAll('sitemapindex > sitemap > loc');
    if (sitemapIndexElements.length > 0) {
      result.sitemapIndexUrls = Array.from(sitemapIndexElements).map(
        el => el.textContent?.trim() || ''
      ).filter(Boolean);

      if (followSitemapIndex) {
        // Recursively fetch each sitemap in the index
        for (const childSitemapUrl of result.sitemapIndexUrls) {
          if (result.urls.length >= maxUrls) break;

          try {
            const childResult = await parseSitemap(childSitemapUrl, {
              followSitemapIndex: false, // Don't recurse further
              maxUrls: maxUrls - result.urls.length,
              filterPattern,
              proxyConfig, // Pass through proxy config
            });
            result.urls.push(...childResult.urls);
            result.errors.push(...childResult.errors);
          } catch (error) {
            result.errors.push(`Error parsing ${childSitemapUrl}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    } else {
      // Regular sitemap - extract URLs
      const urlElements = doc.querySelectorAll('urlset > url');

      for (const urlEl of Array.from(urlElements)) {
        if (result.urls.length >= maxUrls) break;

        const loc = urlEl.querySelector('loc')?.textContent?.trim();
        if (!loc) continue;

        // Apply filter if provided
        if (filterPattern && !filterPattern.test(loc)) continue;

        const lastmod = urlEl.querySelector('lastmod')?.textContent?.trim();
        const changefreq = urlEl.querySelector('changefreq')?.textContent?.trim() as SitemapUrl['changefreq'];
        const priorityText = urlEl.querySelector('priority')?.textContent?.trim();
        const priority = priorityText ? parseFloat(priorityText) : undefined;

        result.urls.push({
          loc,
          lastmod,
          changefreq,
          priority: priority && !isNaN(priority) ? priority : undefined,
        });
      }
    }

    result.totalFound = result.urls.length;
    return result;

  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
    return result;
  }
};

/**
 * Discover sitemap URL from robots.txt or common locations
 */
export const discoverSitemap = async (domain: string, proxyConfig?: ProxyConfig): Promise<string[]> => {
  const sitemapUrls: string[] = [];
  const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
  const normalizedBase = baseUrl.replace(/\/$/, '');

  // Common sitemap locations to check
  const commonPaths = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap-index.xml',
    '/sitemaps.xml',
    '/sitemap/sitemap.xml',
    '/wp-sitemap.xml', // WordPress
    '/sitemap_index.xml', // Yoast
    '/page-sitemap.xml',
    '/post-sitemap.xml',
  ];

  // First, try robots.txt
  try {
    const robotsUrl = `${normalizedBase}/robots.txt`;
    const result = await fetchViaProxy(robotsUrl, 'GET', proxyConfig);

    if (result.ok && result.body) {
      const robotsText = result.body;
      // Extract sitemap directives (case-insensitive)
      const sitemapRegex = /^sitemap:\s*(.+)$/gim;
      let match;
      while ((match = sitemapRegex.exec(robotsText)) !== null) {
        const url = match[1].trim();
        if (url && !sitemapUrls.includes(url)) {
          sitemapUrls.push(url);
        }
      }
    }
  } catch (error) {
    // robots.txt not accessible, continue with common paths
  }

  // If no sitemaps found in robots.txt, check common locations
  if (sitemapUrls.length === 0) {
    for (const path of commonPaths) {
      try {
        const url = `${normalizedBase}${path}`;
        const result = await fetchViaProxy(url, 'HEAD', proxyConfig);

        if (result.ok) {
          sitemapUrls.push(url);
          break; // Found one, stop checking
        }
      } catch (error) {
        // Continue checking other paths
      }
    }
  }

  return sitemapUrls;
};

/**
 * Extract domain from a URL
 */
export const extractDomain = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
};

/**
 * Group sitemap URLs by path pattern
 */
export const groupUrlsByPattern = (urls: SitemapUrl[]): Map<string, SitemapUrl[]> => {
  const groups = new Map<string, SitemapUrl[]>();

  for (const url of urls) {
    try {
      const parsed = new URL(url.loc);
      const pathParts = parsed.pathname.split('/').filter(Boolean);

      // Create pattern from first path segment or root
      const pattern = pathParts.length > 0 ? `/${pathParts[0]}/` : '/';

      if (!groups.has(pattern)) {
        groups.set(pattern, []);
      }
      groups.get(pattern)!.push(url);
    } catch {
      // Invalid URL, skip
    }
  }

  return groups;
};

/**
 * Estimate site structure from sitemap URLs
 */
export const analyzeSitemapStructure = (urls: SitemapUrl[]): {
  totalPages: number;
  sections: { pattern: string; count: number; recentlyUpdated: number }[];
  hasRecentContent: boolean;
  oldestUpdate?: string;
  newestUpdate?: string;
} => {
  const groups = groupUrlsByPattern(urls);
  const sections: { pattern: string; count: number; recentlyUpdated: number }[] = [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let oldestUpdate: string | undefined;
  let newestUpdate: string | undefined;
  let hasRecentContent = false;

  for (const [pattern, patternUrls] of groups) {
    let recentlyUpdated = 0;

    for (const url of patternUrls) {
      if (url.lastmod) {
        const lastmodDate = new Date(url.lastmod);

        // Track oldest/newest
        if (!oldestUpdate || url.lastmod < oldestUpdate) {
          oldestUpdate = url.lastmod;
        }
        if (!newestUpdate || url.lastmod > newestUpdate) {
          newestUpdate = url.lastmod;
        }

        // Check if recently updated
        if (lastmodDate > thirtyDaysAgo) {
          recentlyUpdated++;
          hasRecentContent = true;
        }
      }
    }

    sections.push({
      pattern,
      count: patternUrls.length,
      recentlyUpdated,
    });
  }

  // Sort sections by count (most pages first)
  sections.sort((a, b) => b.count - a.count);

  return {
    totalPages: urls.length,
    sections,
    hasRecentContent,
    oldestUpdate,
    newestUpdate,
  };
};
