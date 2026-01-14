/**
 * HTML Fetcher Service
 *
 * Multi-provider HTML fetching with automatic fallback.
 * Tries providers in order: Jina -> Firecrawl -> Apify -> Direct fetch
 *
 * @module services/htmlFetcherService
 */

import { jinaLogger, firecrawlLogger, directFetchLogger } from './apiCallLogger';
import { extractPageTechnicalData } from './apifyService';

export interface HtmlFetchResult {
  html: string;
  provider: 'jina' | 'firecrawl' | 'apify' | 'direct';
  error?: string;
}

export interface FetcherConfig {
  jinaApiKey?: string;
  firecrawlApiKey?: string;
  apifyToken?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

const JINA_READER_URL = 'https://r.jina.ai/';
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1/scrape';

// Common selectors to remove (cookie banners, popups)
const REMOVE_SELECTORS = [
  '#CybotCookiebotDialog',
  '#onetrust-consent-sdk',
  '.cc-window',
  '.cc-banner',
  '#cookie-notice',
  '#cookie-banner',
  '.cookie-consent-banner',
  '.consent-banner',
].join(', ');

/**
 * Fetch HTML from URL with automatic fallback between providers
 */
export async function fetchHtml(
  url: string,
  config: FetcherConfig
): Promise<HtmlFetchResult> {
  const errors: string[] = [];

  // Try Jina first (if API key available)
  if (config.jinaApiKey) {
    const jinaLog = jinaLogger.start('fetchHtml', 'GET');
    try {
      const html = await fetchWithJina(url, config);
      if (html && html.length > 500) {
        jinaLogger.success(jinaLog.id, { url, responseSize: html.length });
        return { html, provider: 'jina' };
      }
      jinaLogger.error(jinaLog.id, new Error('Empty or too short response'), { url });
      errors.push('Jina: Empty or too short response');
    } catch (error) {
      jinaLogger.error(jinaLog.id, error, { url });
      errors.push(`Jina: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Try Firecrawl second (if API key available)
  if (config.firecrawlApiKey) {
    const firecrawlLog = firecrawlLogger.start('fetchHtml', 'POST');
    try {
      const html = await fetchWithFirecrawl(url, config);
      if (html && html.length > 500) {
        firecrawlLogger.success(firecrawlLog.id, { url, responseSize: html.length });
        return { html, provider: 'firecrawl' };
      }
      firecrawlLogger.error(firecrawlLog.id, new Error('Empty or too short response'), { url });
      errors.push('Firecrawl: Empty or too short response');
    } catch (error) {
      firecrawlLogger.error(firecrawlLog.id, error, { url });
      errors.push(`Firecrawl: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Try Apify third (if token available) - uses browser rendering for JS-heavy sites
  if (config.apifyToken) {
    try {
      console.log(`[HtmlFetcher] Trying Apify for ${url}`);
      const apifyResult = await extractPageTechnicalData(url, config.apifyToken);
      if (apifyResult?.html && apifyResult.html.length > 500) {
        console.log(`[HtmlFetcher] Apify success for ${url}, size: ${apifyResult.html.length}`);
        return { html: apifyResult.html, provider: 'apify' };
      }
      errors.push('Apify: Empty or too short response');
    } catch (error) {
      console.warn(`[HtmlFetcher] Apify failed for ${url}:`, error instanceof Error ? error.message : String(error));
      errors.push(`Apify: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Try direct fetch via proxy as last resort
  if (config.supabaseUrl && config.supabaseAnonKey) {
    const directLog = directFetchLogger.start('fetchHtml', 'GET');
    try {
      const html = await fetchDirect(url, config);
      if (html && html.length > 500) {
        directFetchLogger.success(directLog.id, { url, responseSize: html.length });
        return { html, provider: 'direct' };
      }
      directFetchLogger.error(directLog.id, new Error('Empty or too short response'), { url });
      errors.push('Direct: Empty or too short response');
    } catch (error) {
      directFetchLogger.error(directLog.id, error, { url });
      errors.push(`Direct: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // All providers failed
  throw new Error(`All providers failed for ${url}. Errors: ${errors.join('; ')}`);
}

/**
 * Fetch HTML using Jina Reader API
 */
async function fetchWithJina(url: string, config: FetcherConfig): Promise<string> {
  if (!config.jinaApiKey) {
    throw new Error('Jina API key not configured');
  }

  const proxyUrl = config.supabaseUrl
    ? `${config.supabaseUrl}/functions/v1/fetch-proxy`
    : null;

  if (proxyUrl && config.supabaseAnonKey) {
    // Use proxy for CORS
    const jinaUrl = `${JINA_READER_URL}${url}`;

    const proxyResponse = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.supabaseAnonKey,
        'Authorization': `Bearer ${config.supabaseAnonKey}`,
      },
      body: JSON.stringify({
        url: jinaUrl,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.jinaApiKey}`,
          'Accept': 'application/json',
          'X-Return-Format': 'html',
          'X-Remove-Selector': REMOVE_SELECTORS,
          'X-Wait-For-Selector': 'main, article, .content, #content, body',
          'X-Set-Cookie': 'cookieconsent_status=dismiss',
          'X-Timeout': '30', // 30 second timeout
        },
      }),
    });

    if (!proxyResponse.ok) {
      throw new Error(`Proxy error: ${proxyResponse.status}`);
    }

    const proxyResult = await proxyResponse.json();
    if (!proxyResult.ok) {
      throw new Error(`Jina error: ${proxyResult.status || proxyResult.error}`);
    }

    const data = typeof proxyResult.body === 'string'
      ? JSON.parse(proxyResult.body)
      : proxyResult.body;

    return data?.data?.content || '';
  } else {
    // Direct fetch (server-side only)
    const response = await fetch(`${JINA_READER_URL}${url}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.jinaApiKey}`,
        'Accept': 'application/json',
        'X-Return-Format': 'html',
        'X-Remove-Selector': REMOVE_SELECTORS,
        'X-Wait-For-Selector': 'main, article, .content, #content, body',
        'X-Timeout': '30',
      },
    });

    if (!response.ok) {
      throw new Error(`Jina API: ${response.status}`);
    }

    const data = await response.json();
    return data?.data?.content || '';
  }
}

/**
 * Fetch HTML using Firecrawl API
 */
async function fetchWithFirecrawl(url: string, config: FetcherConfig): Promise<string> {
  if (!config.firecrawlApiKey) {
    throw new Error('Firecrawl API key not configured');
  }

  // Firecrawl can be called directly (they handle CORS)
  // or through proxy if needed
  const proxyUrl = config.supabaseUrl
    ? `${config.supabaseUrl}/functions/v1/fetch-proxy`
    : null;

  const firecrawlBody = {
    url,
    formats: ['html'],
    waitFor: 3000, // Wait 3s for JS rendering
    removeBase64Images: true,
    blockAds: true,
  };

  if (proxyUrl && config.supabaseAnonKey) {
    // Use proxy
    const proxyResponse = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.supabaseAnonKey,
        'Authorization': `Bearer ${config.supabaseAnonKey}`,
      },
      body: JSON.stringify({
        url: FIRECRAWL_API_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.firecrawlApiKey}`,
        },
        body: JSON.stringify(firecrawlBody),
      }),
    });

    if (!proxyResponse.ok) {
      throw new Error(`Proxy error: ${proxyResponse.status}`);
    }

    const proxyResult = await proxyResponse.json();
    if (!proxyResult.ok) {
      throw new Error(`Firecrawl error: ${proxyResult.status || proxyResult.error}`);
    }

    const data = typeof proxyResult.body === 'string'
      ? JSON.parse(proxyResult.body)
      : proxyResult.body;

    return data?.data?.html || '';
  } else {
    // Direct fetch
    const response = await fetch(FIRECRAWL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.firecrawlApiKey}`,
      },
      body: JSON.stringify(firecrawlBody),
    });

    if (!response.ok) {
      throw new Error(`Firecrawl API: ${response.status}`);
    }

    const data = await response.json();
    return data?.data?.html || '';
  }
}

/**
 * Fetch HTML directly via our proxy (simplest fallback)
 */
async function fetchDirect(url: string, config: FetcherConfig): Promise<string> {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('Supabase config required for direct fetch');
  }

  const proxyUrl = `${config.supabaseUrl}/functions/v1/fetch-proxy`;

  const proxyResponse = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': config.supabaseAnonKey,
      'Authorization': `Bearer ${config.supabaseAnonKey}`,
    },
    body: JSON.stringify({
      url,
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,nl;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    }),
  });

  if (!proxyResponse.ok) {
    throw new Error(`Direct fetch error: ${proxyResponse.status}`);
  }

  const proxyResult = await proxyResponse.json();
  if (!proxyResult.ok) {
    throw new Error(`Fetch failed: ${proxyResult.status}`);
  }

  // Direct fetch returns raw HTML as body
  return typeof proxyResult.body === 'string'
    ? proxyResult.body
    : JSON.stringify(proxyResult.body);
}

/**
 * Check which providers are available based on config
 */
export function getAvailableProviders(config: FetcherConfig): string[] {
  const providers: string[] = [];
  if (config.jinaApiKey) providers.push('jina');
  if (config.firecrawlApiKey) providers.push('firecrawl');
  if (config.apifyToken) providers.push('apify');
  if (config.supabaseUrl && config.supabaseAnonKey) providers.push('direct');
  return providers;
}

export default {
  fetchHtml,
  getAvailableProviders,
};
