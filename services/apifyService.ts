
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Changed import to be a relative path.
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
import { FullSerpData, ScrapedContent, ApifyPageData } from '../types';

const API_BASE_URL = 'https://api.apify.com/v2';
const WEB_SCRAPER_ACTOR_ID = 'apify/web-scraper';
const GOOGLE_SEARCH_ACTOR_ID = 'apify/google-search-scraper';
const WEBSITE_CONTENT_CRAWLER_ID = 'apify/website-content-crawler';

interface ApifyRun {
  id: string;
  actorId: string;
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED-OUT' | 'ABORTING' | 'ABORTED';
  startedAt: string;
  finishedAt?: string;
  defaultDatasetId: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const runApifyActor = async (actorId: string, apiToken: string, runInput: any): Promise<any[]> => {
  const startRunUrl = `${API_BASE_URL}/acts/${actorId.replace('/', '~')}/runs?token=${apiToken}`;

  console.log('[Apify] Starting actor:', actorId, 'with', runInput.startUrls?.length || 0, 'URLs');

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
  const maxRetries = 40; // ~200 seconds max wait
  for (let i = 0; i < maxRetries; i++) {
    await sleep(5000);
    const statusUrl = `${API_BASE_URL}/actor-runs/${run.id}?token=${apiToken}`;
    const statusResponse = await fetch(statusUrl);
    if (!statusResponse.ok) {
      console.error('[Apify] Status check failed:', statusResponse.status);
      throw new Error(`Apify status check failed (${statusResponse.status}): ${statusResponse.statusText}`);
    }
    const { data: currentRun }: { data: ApifyRun } = await statusResponse.json();
    run = currentRun;
    if (run.status === 'SUCCEEDED') break;
    if (['FAILED', 'TIMED-OUT', 'ABORTED'].includes(run.status)) throw new Error(`Apify actor run failed with status: ${run.status}`);
  }

  if (run.status !== 'SUCCEEDED') throw new Error('Apify actor run timed out.');

  const resultsUrl = `${API_BASE_URL}/datasets/${run.defaultDatasetId}/items?token=${apiToken}&format=json`;
  const resultsResponse = await fetch(resultsUrl);
  if (!resultsResponse.ok) throw new Error(`Apify fetch results failed: ${resultsResponse.statusText}`);

  return await resultsResponse.json();
};

export const countryNameToCode = (name: string): string | undefined => {
  const map: { [key: string]: string } = {
    'united states': 'us', 'usa': 'us',
    'netherlands': 'nl',
    'united kingdom': 'gb', 'uk': 'gb', 'great britain': 'gb',
    'germany': 'de',
    'france': 'fr',
    'canada': 'ca',
    'australia': 'au',
  };
  return map[name.toLowerCase().trim()];
};

export const collectSerpIntelligence = async (query: string, apiToken: string, targetMarket: string, languageCode: string): Promise<FullSerpData> => {
  if (!apiToken) {
    console.warn("Apify API token not configured. Skipping competitive intelligence gathering.");
    return { organicResults: [], peopleAlsoAsk: [], relatedQueries: [] };
  }

  const runInput = {
    queries: query,
    maxPagesPerQuery: 1,
    resultsPerPage: 10,
    countryCode: countryNameToCode(targetMarket),
    languageCode,
    includeAds: false,
    includePeopleAlsoAsk: true,
    includeRelatedQueries: true,
  };

  const results = await runApifyActor(GOOGLE_SEARCH_ACTOR_ID, apiToken, runInput);
  if (!Array.isArray(results) || results.length === 0) {
    return { organicResults: [], peopleAlsoAsk: [], relatedQueries: [] };
  }

  const firstResult = results[0];
  return {
    organicResults: firstResult.organicResults?.map((item: any, index: number) => ({
      position: item.position || index + 1,
      title: item.title,
      link: item.url,
      snippet: item.description || ''
    })) || [],
    peopleAlsoAsk: firstResult.peopleAlsoAsk?.map((item: any) => item.question) || [],
    relatedQueries: firstResult.relatedQueries?.map((item: any) => item.query) || [],
  };
};

export const scrapeCompetitorContent = async (urls: string[], apiToken: string): Promise<ScrapedContent[]> => {
  if (!apiToken || urls.length === 0) {
    return [];
  }

  const runInput = {
    startUrls: urls.map(url => ({ url })),
    "crawlerType": "cheerio",
    "includeUrlGlobs": [],
    "excludeUrlGlobs": [],
    "ignoreCanonicalUrl": false,
    "maxCrawlDepth": 0,
    "maxCrawlPages": urls.length,
    "initialConcurrency": 5,
    "maxConcurrency": 10,
    "initialCookies": [],
    "proxyConfiguration": { "useApifyProxy": true },
    "customDataFunction": `async ({ $, request, log }) => {
        const title = $('title').text().trim();
        const headings = [];
        $('h1, h2, h3, h4').each((index, el) => {
            const level = parseInt(el.tagName.substring(1), 10);
            const text = $(el).text().trim();
            if (text) {
                headings.push({ level, text });
            }
        });
        const rawText = $('body').text().replace(/\\s\\s+/g, ' ').trim();
        return {
            url: request.url,
            title,
            headings,
            rawText
        };
      };`
  };

  const results = await runApifyActor(WEBSITE_CONTENT_CRAWLER_ID, apiToken, runInput);

  return results.map(item => ({
    url: item.url,
    title: item.title,
    headings: item.headings,
    rawText: item.rawText
  }));
};

// ============================================
// SITE ANALYSIS EXTRACTION (V2)
// ============================================

/**
 * Extract full technical data from a single page
 * Includes: status code, schema markup, meta tags, performance, links
 */
export const extractPageTechnicalData = async (
  url: string,
  apiToken: string
): Promise<ApifyPageData | null> => {
  if (!apiToken) {
    throw new Error('Apify API token is required for technical extraction');
  }

  const results = await extractMultiplePagesTechnicalData([url], apiToken);
  return results[0] || null;
};

/**
 * Extract full technical data from multiple pages
 * Uses web-scraper actor with custom page function
 */
export const extractMultiplePagesTechnicalData = async (
  urls: string[],
  apiToken: string,
  onProgress?: (completed: number, total: number) => void
): Promise<ApifyPageData[]> => {
  if (!apiToken) {
    throw new Error('Apify API token is required for technical extraction');
  }

  if (urls.length === 0) {
    return [];
  }

  // Custom page function to extract all technical data
  const pageFunction = `
    async function pageFunction(context) {
      const { request, page, log } = context;
      const startTime = Date.now();

      try {
        // Wait for page to stabilize
        await page.waitForLoadState('domcontentloaded');

        // Try to dismiss cookie banners/consent dialogs
        const cookieSelectors = [
          // Cookiebot
          '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
          '#CybotCookiebotDialogBodyButtonAccept',
          '[data-cookiebanner="accept_button"]',
          // OneTrust
          '#onetrust-accept-btn-handler',
          '.onetrust-close-btn-handler',
          // Generic patterns
          'button[id*="accept"]',
          'button[class*="accept"]',
          'button[id*="cookie"]',
          '[class*="cookie-consent"] button',
          '[class*="cookie-banner"] button:first-of-type',
          '[class*="consent"] button[class*="accept"]',
          '.cc-accept',
          '.cc-btn.cc-dismiss',
          // Close buttons
          '[aria-label="Close"]',
          '[aria-label="Accept cookies"]',
          '[aria-label="Accept all cookies"]',
        ];

        for (const selector of cookieSelectors) {
          try {
            const button = await page.$(selector);
            if (button) {
              await button.click();
              log.info('Clicked cookie consent button:', selector);
              await page.waitForTimeout(500); // Brief wait for banner to close
              break;
            }
          } catch (e) {
            // Ignore click errors
          }
        }

        // Remove any remaining overlays/banners from DOM
        // NOTE: Use specific selectors to avoid removing legitimate content
        await page.evaluate(() => {
          const removeSelectors = [
            // Cookiebot - specific
            '#CybotCookiebotDialog',
            '#CybotCookiebotDialogBody',
            '#CybotCookiebotDialogBodyContent',
            '.CybotCookiebotDialogBody',
            // OneTrust
            '#onetrust-consent-sdk',
            '#onetrust-banner-sdk',
            '.onetrust-pc-dark-filter',
            // Cookie consent libraries
            '.cc-window',
            '.cc-banner',
            '#cookie-law-info-bar',
            // Specific cookie banner IDs
            '#cookie-notice',
            '#cookie-banner',
            '#cookiebanner',
            '#gdpr-cookie-notice',
            '#gdpr-banner',
            // Class-based (specific)
            '.cookie-consent-banner',
            '.cookie-notice-container',
            '.gdpr-cookie-notice',
            '.consent-banner',
            '.privacy-banner',
          ];

          for (const selector of removeSelectors) {
            document.querySelectorAll(selector).forEach(el => el.remove());
          }
        });

        // Brief wait after cleanup
        await page.waitForTimeout(300);

        // Get performance timing
        const performanceTiming = await page.evaluate(() => {
          const timing = performance.timing;
          return {
            ttfb: timing.responseStart - timing.requestStart,
            loadTime: timing.loadEventEnd - timing.navigationStart,
          };
        });

        // Get page content
        const html = await page.content();
        const htmlSizeKb = Math.round(html.length / 1024);

        // Count DOM nodes
        const domNodes = await page.evaluate(() => document.querySelectorAll('*').length);

        // Extract meta tags
        const title = await page.$eval('title', el => el.textContent || '').catch(() => '');
        const metaDescription = await page.$eval('meta[name="description"]', el => el.getAttribute('content') || '').catch(() => '');
        const canonical = await page.$eval('link[rel="canonical"]', el => el.getAttribute('href') || '').catch(() => '');
        const robotsMeta = await page.$eval('meta[name="robots"]', el => el.getAttribute('content') || '').catch(() => '');

        // Extract all JSON-LD schema
        const schemaMarkup = await page.$$eval('script[type="application/ld+json"]', scripts =>
          scripts.map(s => {
            try {
              return JSON.parse(s.textContent || '{}');
            } catch {
              return null;
            }
          }).filter(Boolean)
        );

        const schemaTypes = schemaMarkup.map(s => s['@type']).filter(Boolean).flat();

        // Extract internal and external links
        const baseUrl = new URL(request.url);
        const links = await page.$$eval('a[href]', (anchors, baseHost) => {
          return anchors.map(a => {
            const href = a.getAttribute('href') || '';
            const text = a.textContent?.trim() || '';
            const rel = a.getAttribute('rel') || '';

            // Determine position
            let position = 'content';
            const parent = a.closest('nav, header, footer, aside, .sidebar, .navigation');
            if (parent) {
              const tag = parent.tagName.toLowerCase();
              if (tag === 'nav' || parent.classList.contains('navigation')) position = 'nav';
              else if (tag === 'header') position = 'nav';
              else if (tag === 'footer') position = 'footer';
              else if (tag === 'aside' || parent.classList.contains('sidebar')) position = 'sidebar';
            }

            try {
              const url = new URL(href, baseHost);
              const isInternal = url.hostname === baseHost || url.hostname.endsWith('.' + baseHost);
              return { href: url.href, text, rel, position, isInternal };
            } catch {
              return { href, text, rel, position, isInternal: href.startsWith('/') };
            }
          });
        }, baseUrl.hostname);

        const internalLinks = links.filter(l => l.isInternal).map(({ isInternal, ...rest }) => rest);
        const externalLinks = links.filter(l => !l.isInternal).map(({ isInternal, ...rest }) => rest);

        // Extract images
        const images = await page.$$eval('img', imgs =>
          imgs.map(img => ({
            src: img.src,
            alt: img.alt || '',
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
          }))
        );

        // Get HTTP status code
        const response = request.response;
        const statusCode = response ? response.status() : 200;

        return {
          url: request.url,
          statusCode,
          title,
          metaDescription,
          canonical,
          robotsMeta,
          schemaMarkup,
          schemaTypes,
          ttfbMs: performanceTiming.ttfb,
          loadTimeMs: performanceTiming.loadTime,
          htmlSizeKb,
          domNodes,
          html,
          internalLinks,
          externalLinks,
          images,
        };
      } catch (error) {
        log.error('Page extraction failed:', error);
        return {
          url: request.url,
          statusCode: 0,
          title: '',
          metaDescription: '',
          canonical: '',
          robotsMeta: '',
          schemaMarkup: [],
          schemaTypes: [],
          ttfbMs: 0,
          loadTimeMs: 0,
          htmlSizeKb: 0,
          domNodes: 0,
          html: '',
          internalLinks: [],
          externalLinks: [],
          images: [],
          error: error.message,
        };
      }
    }
  `;

  const runInput = {
    startUrls: urls.map(url => ({ url })),
    pageFunction,
    proxyConfiguration: {
      useApifyProxy: true,
    },
    maxConcurrency: 10,
    maxRequestsPerCrawl: urls.length,
    maxRequestRetries: 2,
    requestTimeoutSecs: 60,
    // Don't follow links - only process the provided URLs
    linkSelector: '',
    pseudoUrls: [],
  };

  const results = await runApifyActor(WEB_SCRAPER_ACTOR_ID, apiToken, runInput);

  return results.map(item => ({
    url: item.url,
    statusCode: item.statusCode || 200,
    title: item.title || '',
    metaDescription: item.metaDescription || '',
    canonical: item.canonical || '',
    robotsMeta: item.robotsMeta || '',
    schemaMarkup: item.schemaMarkup || [],
    schemaTypes: item.schemaTypes || [],
    ttfbMs: item.ttfbMs || 0,
    loadTimeMs: item.loadTimeMs || 0,
    htmlSizeKb: item.htmlSizeKb || 0,
    domNodes: item.domNodes || 0,
    html: item.html || '',
    internalLinks: item.internalLinks || [],
    externalLinks: item.externalLinks || [],
    images: item.images || [],
  }));
};

/**
 * Start an async Apify run for batch processing (webhook-based)
 * Returns run ID for status checking
 */
export const startAsyncTechnicalExtraction = async (
  urls: string[],
  apiToken: string,
  webhookUrl?: string
): Promise<string> => {
  if (!apiToken) {
    throw new Error('Apify API token is required');
  }

  const pageFunction = `
    async function pageFunction(context) {
      const { request, page, log } = context;
      // ... same page function as above
      // Abbreviated for async runs
      await page.waitForLoadState('domcontentloaded');
      const html = await page.content();
      const title = await page.$eval('title', el => el.textContent || '').catch(() => '');

      return {
        url: request.url,
        title,
        htmlLength: html.length,
      };
    }
  `;

  const runInput = {
    startUrls: urls.map(url => ({ url })),
    pageFunction,
    proxyConfiguration: { useApifyProxy: true },
    maxConcurrency: 10,
    maxRequestsPerCrawl: urls.length,
  };

  const startRunUrl = `${API_BASE_URL}/acts/${WEB_SCRAPER_ACTOR_ID.replace('/', '~')}/runs?token=${apiToken}`;

  const body: any = runInput;
  if (webhookUrl) {
    body.webhooks = [{
      eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED'],
      requestUrl: webhookUrl,
    }];
  }

  const response = await fetch(startRunUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to start Apify run: ${await response.text()}`);
  }

  const { data }: { data: ApifyRun } = await response.json();
  return data.id;
};

/**
 * Check status of an Apify run
 */
export const checkApifyRunStatus = async (
  runId: string,
  apiToken: string
): Promise<{ status: string; datasetId?: string }> => {
  const statusUrl = `${API_BASE_URL}/actor-runs/${runId}?token=${apiToken}`;
  const response = await fetch(statusUrl);

  if (!response.ok) {
    throw new Error(`Failed to check Apify run status: ${response.status} ${response.statusText}`);
  }

  const { data }: { data: ApifyRun } = await response.json();

  return {
    status: data.status,
    datasetId: data.status === 'SUCCEEDED' ? data.defaultDatasetId : undefined,
  };
};

/**
 * Fetch results from an Apify dataset
 */
export const fetchApifyDatasetResults = async <T>(
  datasetId: string,
  apiToken: string
): Promise<T[]> => {
  const resultsUrl = `${API_BASE_URL}/datasets/${datasetId}/items?token=${apiToken}&format=json`;
  const response = await fetch(resultsUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch dataset: ${response.statusText}`);
  }

  return response.json();
};
