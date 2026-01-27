// deno-lint-ignore-file no-explicit-any
/**
 * Brand URL Discovery Edge Function
 *
 * Discovers URLs from a domain for brand extraction using Apify.
 * Avoids CORS issues by running server-side.
 *
 * Accepts: { domain: string, apifyToken: string }
 * Returns: { urls: UrlSuggestion[] }
 */

// --- Utility Functions ---

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function json(body: any, status = 200, origin = "*") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

interface UrlSuggestion {
  url: string;
  pageType: 'homepage' | 'service' | 'article' | 'contact' | 'other';
  discoveredFrom: 'sitemap' | 'nav_link' | 'hero_cta' | 'featured_content' | 'footer';
  prominenceScore: number;
  visualContext: string;
}

const API_BASE_URL = 'https://api.apify.com/v2';
const PLAYWRIGHT_SCRAPER_ACTOR_ID = 'apify/playwright-scraper';

// --- Apify Helper Functions ---

interface ApifyRun {
  id: string;
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED-OUT' | 'ABORTING' | 'ABORTED';
  defaultDatasetId: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runApifyActor(actorId: string, apiToken: string, runInput: any): Promise<any[]> {
  const startRunUrl = `${API_BASE_URL}/acts/${actorId.replace('/', '~')}/runs?token=${apiToken}`;

  console.log('[Apify] Starting actor:', actorId);

  const startResponse = await fetch(startRunUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(runInput)
  });

  if (!startResponse.ok) {
    const errorText = await startResponse.text();
    console.error('[Apify] Start run failed:', startResponse.status, errorText);
    throw new Error(`Apify start run failed (${startResponse.status}): ${errorText}`);
  }

  const { data: runDetails }: { data: ApifyRun } = await startResponse.json();

  let run = runDetails;
  console.log('[Apify] Run started with ID:', run.id, 'status:', run.status);

  const maxRetries = 24; // ~120 seconds max wait
  for (let i = 0; i < maxRetries; i++) {
    await sleep(5000);
    const statusUrl = `${API_BASE_URL}/actor-runs/${run.id}?token=${apiToken}`;
    const statusResponse = await fetch(statusUrl);
    if (!statusResponse.ok) {
      throw new Error(`Apify status check failed: ${statusResponse.statusText}`);
    }
    const { data: currentRun }: { data: ApifyRun } = await statusResponse.json();
    run = currentRun;
    console.log('[Apify] Run status:', run.status, `(attempt ${i + 1}/${maxRetries})`);
    if (run.status === 'SUCCEEDED') break;
    if (['FAILED', 'TIMED-OUT', 'ABORTED'].includes(run.status)) {
      throw new Error(`Apify actor run failed with status: ${run.status}`);
    }
  }

  if (run.status !== 'SUCCEEDED') throw new Error('Apify actor run timed out.');

  const resultsUrl = `${API_BASE_URL}/datasets/${run.defaultDatasetId}/items?token=${apiToken}&format=json`;
  const resultsResponse = await fetch(resultsUrl);
  if (!resultsResponse.ok) throw new Error(`Apify fetch results failed: ${resultsResponse.statusText}`);

  return resultsResponse.json();
}

// --- URL Discovery Logic ---

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
    if (path.includes('/blog') || path.includes('/news') || path.includes('/artikel') ||
        path.includes('/article') || path.includes('/nieuws')) return 'article';
    if (path.includes('/contact') || path.includes('/kontakt')) return 'contact';
    return 'other';
  } catch {
    return 'other';
  }
}

async function trySitemap(domain: string): Promise<UrlSuggestion[]> {
  const suggestions: UrlSuggestion[] = [];

  try {
    const sitemapUrl = `${domain}/sitemap.xml`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(sitemapUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return suggestions;

    const xml = await response.text();
    const locMatches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];

    for (const match of locMatches.slice(0, 50)) { // Limit to 50 URLs from sitemap
      const url = match.replace(/<\/?loc>/g, '');
      if (url && url.startsWith(domain)) {
        suggestions.push({
          url,
          pageType: categorizeUrl(url),
          discoveredFrom: 'sitemap',
          prominenceScore: 40,
          visualContext: 'Discovered from sitemap.xml'
        });
      }
    }
  } catch (e) {
    console.log('[SitemapDiscovery] Sitemap fetch failed:', e);
  }

  return suggestions;
}

async function crawlHomepageLinks(domain: string, apifyToken: string): Promise<UrlSuggestion[]> {
  const suggestions: UrlSuggestion[] = [];

  const pageFunction = `
    async function pageFunction(context) {
      const { request, page, log } = context;

      try {
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
        await page.waitForTimeout(1500);

        // Extract links with context
        const baseUrl = new URL(request.url);
        const links = await page.evaluate((baseHost) => {
          const results = [];

          // Helper to add link
          const addLink = (el, context) => {
            const href = el.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;

            let fullUrl;
            try {
              fullUrl = href.startsWith('http') ? href : new URL(href, 'https://' + baseHost).href;
              const url = new URL(fullUrl);
              if (url.hostname !== baseHost && !url.hostname.endsWith('.' + baseHost)) return;
            } catch { return; }

            const anchorText = el.textContent?.trim() || '';
            results.push({ url: fullUrl, context, anchorText });
          };

          // Nav links
          document.querySelectorAll('nav a, header a').forEach(el => addLink(el, 'nav_link'));

          // Hero CTAs
          document.querySelectorAll('[class*="hero"] a, .hero a').forEach(el => {
            const hasCtaClass = el.className.toLowerCase().includes('cta') ||
                              el.className.toLowerCase().includes('button');
            addLink(el, hasCtaClass ? 'hero_cta' : 'featured_content');
          });

          // Featured sections
          document.querySelectorAll('[class*="featured"] a, main a').forEach(el => addLink(el, 'featured_content'));

          // Footer links
          document.querySelectorAll('footer a').forEach(el => addLink(el, 'footer'));

          return results;
        }, baseUrl.hostname);

        return { links, url: request.url };
      } catch (error) {
        log.error('Link extraction failed:', error.message);
        return { links: [], url: request.url, error: error.message };
      }
    }
  `;

  const runInput = {
    startUrls: [{ url: domain }],
    pageFunction,
    proxyConfiguration: { useApifyProxy: true },
    maxConcurrency: 1,
    maxRequestsPerCrawl: 1,
    linkSelector: '',
    navigationTimeoutSecs: 45,
    requestHandlerTimeoutSecs: 60,
  };

  try {
    const results = await runApifyActor(PLAYWRIGHT_SCRAPER_ACTOR_ID, apifyToken, runInput);

    if (results && results[0]?.links) {
      const seen = new Set<string>();
      for (const link of results[0].links) {
        if (seen.has(link.url)) continue;
        seen.add(link.url);

        const prominenceScores: Record<string, number> = {
          hero_cta: 100,
          featured_content: 80,
          nav_link: 60,
          footer: 30
        };

        suggestions.push({
          url: link.url,
          pageType: categorizeUrl(link.url),
          discoveredFrom: link.context,
          prominenceScore: prominenceScores[link.context] || 50,
          visualContext: link.context === 'hero_cta'
            ? `Hero CTA - "${link.anchorText || 'Call to action'}"`
            : link.context === 'nav_link'
            ? `Navigation - "${link.anchorText || 'Nav link'}"`
            : link.context === 'featured_content'
            ? `Featured - "${link.anchorText || 'Content link'}"`
            : `Footer - "${link.anchorText || 'Footer link'}"`
        });
      }
    }
  } catch (e) {
    console.error('[HomepageCrawl] Failed:', e);
  }

  return suggestions;
}

function dedupeAndRank(suggestions: UrlSuggestion[]): UrlSuggestion[] {
  const urlMap = new Map<string, UrlSuggestion>();

  for (const suggestion of suggestions) {
    const existing = urlMap.get(suggestion.url);
    if (!existing || suggestion.prominenceScore > existing.prominenceScore) {
      urlMap.set(suggestion.url, suggestion);
    }
  }

  return Array.from(urlMap.values()).sort((a, b) => b.prominenceScore - a.prominenceScore);
}

// --- Main Handler ---

const Deno = (globalThis as any).Deno;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "*";

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  try {
    const { domain, apifyToken } = await req.json();

    if (!domain) {
      return json({ ok: false, error: 'domain is required' }, 400, origin);
    }

    if (!apifyToken) {
      return json({ ok: false, error: 'apifyToken is required' }, 400, origin);
    }

    const normalizedDomain = normalizeDomain(domain);
    console.log('[BrandUrlDiscovery] Starting discovery for:', normalizedDomain);

    const suggestions: UrlSuggestion[] = [];

    // Add homepage as first suggestion
    suggestions.push({
      url: normalizedDomain,
      pageType: 'homepage',
      discoveredFrom: 'sitemap',
      prominenceScore: 100,
      visualContext: 'Homepage - primary entry point'
    });

    // Try sitemap first (fast, no Apify needed)
    const sitemapSuggestions = await trySitemap(normalizedDomain);
    console.log('[BrandUrlDiscovery] Found', sitemapSuggestions.length, 'URLs from sitemap');
    suggestions.push(...sitemapSuggestions);

    // Crawl homepage for prominent links (uses Apify)
    const homepageLinks = await crawlHomepageLinks(normalizedDomain, apifyToken);
    console.log('[BrandUrlDiscovery] Found', homepageLinks.length, 'URLs from homepage crawl');
    suggestions.push(...homepageLinks);

    // Dedupe and rank
    const ranked = dedupeAndRank(suggestions);
    const topUrls = ranked.slice(0, 15); // Return top 15

    console.log('[BrandUrlDiscovery] Returning', topUrls.length, 'suggestions');

    return json({
      ok: true,
      urls: topUrls,
      metadata: {
        domain: normalizedDomain,
        totalDiscovered: suggestions.length,
        fromSitemap: sitemapSuggestions.length,
        fromHomepage: homepageLinks.length,
      }
    }, 200, origin);

  } catch (error) {
    console.error('[BrandUrlDiscovery] Error:', error);
    return json({
      ok: false,
      error: error.message || 'URL discovery failed'
    }, 500, origin);
  }
});
