// deno-lint-ignore-file no-explicit-any
/**
 * Brand URL Discovery Edge Function
 *
 * Discovers URLs from a domain for brand extraction.
 * Uses fast sitemap and HTML parsing (no external services).
 */

// --- CORS Headers ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Types ---
interface UrlSuggestion {
  url: string;
  pageType: 'homepage' | 'service' | 'article' | 'contact' | 'other';
  discoveredFrom: 'sitemap' | 'nav_link' | 'hero_cta' | 'featured_content' | 'footer';
  prominenceScore: number;
  visualContext: string;
}

// --- Helper Functions ---
function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function normalizeDomain(domain: string): string {
  let normalized = domain.trim().replace(/\/+$/, '');
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}

function categorizeUrl(url: string): UrlSuggestion['pageType'] {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (path === '/' || path === '' || path === '/index.html') return 'homepage';
    if (path.includes('/services') || path.includes('/diensten') || path.includes('/dienst')) return 'service';
    if (path.includes('/blog') || path.includes('/news') || path.includes('/artikel') || path.includes('/article')) return 'article';
    if (path.includes('/contact')) return 'contact';
    return 'other';
  } catch {
    return 'other';
  }
}

// --- Sitemap Discovery ---
async function trySitemap(domain: string): Promise<UrlSuggestion[]> {
  const suggestions: UrlSuggestion[] = [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${domain}/sitemap.xml`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return suggestions;

    const xml = await response.text();
    const locMatches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];

    for (const match of locMatches.slice(0, 30)) {
      const url = match.replace(/<\/?loc>/g, '');
      if (url && url.startsWith(domain)) {
        suggestions.push({
          url,
          pageType: categorizeUrl(url),
          discoveredFrom: 'sitemap',
          prominenceScore: 40,
          visualContext: 'From sitemap.xml'
        });
      }
    }
  } catch (e) {
    console.log('[Sitemap] Failed:', e);
  }
  return suggestions;
}

// --- Homepage Link Discovery ---
async function discoverFromHomepage(domain: string): Promise<UrlSuggestion[]> {
  const suggestions: UrlSuggestion[] = [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(domain, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrandBot/1.0)' }
    });
    clearTimeout(timeoutId);

    if (!response.ok) return suggestions;

    const html = await response.text();
    const baseUrl = new URL(domain);
    const seen = new Set<string>();

    // Simple regex to extract href attributes
    const hrefPattern = /href=["']([^"']+)["']/gi;
    let match;

    // Skip static assets
    const skipExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.eot', '.webmanifest', '.xml', '.json'];

    while ((match = hrefPattern.exec(html)) !== null) {
      const href = match[1];
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;

      // Skip static assets
      const lowerHref = href.toLowerCase();
      if (skipExtensions.some(ext => lowerHref.endsWith(ext))) continue;
      if (lowerHref.includes('/wp-content/') && (lowerHref.includes('/cache/') || lowerHref.includes('/uploads/'))) continue;

      let fullUrl: string;
      try {
        fullUrl = href.startsWith('http') ? href : new URL(href, domain).href;
        const url = new URL(fullUrl);
        if (url.hostname !== baseUrl.hostname) continue;
      } catch { continue; }

      if (seen.has(fullUrl)) continue;
      seen.add(fullUrl);

      const path = new URL(fullUrl).pathname.toLowerCase();
      let prominence = 50;
      let context: UrlSuggestion['discoveredFrom'] = 'featured_content';

      if (path.includes('/dienst') || path.includes('/service')) {
        prominence = 80;
        context = 'nav_link';
      } else if (path.includes('/over') || path.includes('/about')) {
        prominence = 70;
        context = 'nav_link';
      } else if (path.includes('/contact')) {
        prominence = 60;
        context = 'footer';
      }

      suggestions.push({
        url: fullUrl,
        pageType: categorizeUrl(fullUrl),
        discoveredFrom: context,
        prominenceScore: prominence,
        visualContext: 'From homepage'
      });
    }
  } catch (e) {
    console.log('[Homepage] Failed:', e);
  }
  return suggestions;
}

// --- Dedupe and Rank ---
function dedupeAndRank(suggestions: UrlSuggestion[]): UrlSuggestion[] {
  const urlMap = new Map<string, UrlSuggestion>();
  for (const s of suggestions) {
    const existing = urlMap.get(s.url);
    if (!existing || s.prominenceScore > existing.prominenceScore) {
      urlMap.set(s.url, s);
    }
  }
  return Array.from(urlMap.values()).sort((a, b) => b.prominenceScore - a.prominenceScore);
}

// --- Main Handler ---
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { domain } = await req.json();

    if (!domain) {
      return jsonResponse({ ok: false, error: 'domain is required' }, 400);
    }

    const normalizedDomain = normalizeDomain(domain);
    console.log('[Discovery] Starting for:', normalizedDomain);

    const suggestions: UrlSuggestion[] = [];

    // Homepage always first
    suggestions.push({
      url: normalizedDomain,
      pageType: 'homepage',
      discoveredFrom: 'sitemap',
      prominenceScore: 100,
      visualContext: 'Homepage'
    });

    // Try sitemap
    const sitemapUrls = await trySitemap(normalizedDomain);
    console.log('[Discovery] Sitemap:', sitemapUrls.length, 'URLs');
    suggestions.push(...sitemapUrls);

    // Try homepage links
    const homepageUrls = await discoverFromHomepage(normalizedDomain);
    console.log('[Discovery] Homepage:', homepageUrls.length, 'URLs');
    suggestions.push(...homepageUrls);

    // Dedupe and return top 15
    const ranked = dedupeAndRank(suggestions);
    const topUrls = ranked.slice(0, 15);

    console.log('[Discovery] Returning', topUrls.length, 'URLs');

    return jsonResponse({
      ok: true,
      urls: topUrls,
      metadata: {
        domain: normalizedDomain,
        total: suggestions.length,
        sitemap: sitemapUrls.length,
        homepage: homepageUrls.length,
      }
    });

  } catch (error) {
    console.error('[Discovery] Error:', error);
    return jsonResponse({
      ok: false,
      error: error instanceof Error ? error.message : 'Discovery failed'
    }, 500);
  }
});
