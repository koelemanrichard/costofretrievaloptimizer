// services/firecrawlService.ts
// Firecrawl API integration for page extraction (fallback for Apify)
// API Documentation: https://docs.firecrawl.dev/

import { ApifyPageData } from '../types';
import { API_ENDPOINTS } from '../config/apiEndpoints';
import { logAiUsage } from './telemetryService';
import { getSupabaseClient } from './supabaseClient';

const FIRECRAWL_API_URL = API_ENDPOINTS.FIRECRAWL_SCRAPE;

export interface FirecrawlProxyConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Fetch via Supabase edge proxy if config available, otherwise direct fetch.
 * Firecrawl API blocks CORS from browser origins.
 */
const FETCH_TIMEOUT_MS = 30000;

const firecrawlFetch = async (
  url: string,
  options?: RequestInit,
  proxyConfig?: FirecrawlProxyConfig
): Promise<Response> => {
  if (proxyConfig?.supabaseUrl && proxyConfig?.supabaseAnonKey) {
    const proxyUrl = `${proxyConfig.supabaseUrl}/functions/v1/fetch-proxy`;
    const method = options?.method || 'GET';
    const customHeaders: Record<string, string> = {};
    if (options?.headers) {
      const h = options.headers;
      if (h instanceof Headers) {
        h.forEach((v, k) => { customHeaders[k] = v; });
      } else if (Array.isArray(h)) {
        h.forEach(([k, v]) => { customHeaders[k] = v; });
      } else {
        Object.assign(customHeaders, h);
      }
    }

    const proxyBody: Record<string, unknown> = { url, method, headers: customHeaders };
    if (options?.body) {
      proxyBody.body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${proxyConfig.supabaseAnonKey}`,
          'apikey': proxyConfig.supabaseAnonKey,
        },
        body: JSON.stringify(proxyBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Edge proxy HTTP error: ${response.status} ${response.statusText}`);
      }

      const wrapper = await response.json();
      if (wrapper.error && !wrapper.body) {
        throw new Error(`Proxy error: ${wrapper.error}`);
      }

      const responseBody = wrapper.body ?? '';
      return new Response(typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody), {
        status: wrapper.status || 200,
        statusText: wrapper.statusText || '',
        headers: { 'Content-Type': wrapper.contentType || 'application/json' },
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Retry configuration for Firecrawl API calls
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
};

// Helper to sleep for a given duration
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Helper to determine if an error is retryable
const isRetryableError = (status: number): boolean => {
  // Retry on 5xx server errors and 429 rate limiting
  return status >= 500 || status === 429;
};

/**
 * Firecrawl scrape response format
 */
interface FirecrawlScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
      ogTitle?: string;
      ogDescription?: string;
      statusCode?: number;
      sourceURL?: string;
      [key: string]: any;
    };
    links?: string[];
  };
  error?: string;
}

/**
 * Parse HTML to extract schema markup
 */
const extractSchemaMarkup = (html: string): { schemaMarkup: any[]; schemaTypes: string[] } => {
  const schemaMarkup: any[] = [];
  const schemaTypes: string[] = [];

  // Find JSON-LD script tags
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const schema = JSON.parse(match[1].trim());
      schemaMarkup.push(schema);

      // Extract @type
      if (schema['@type']) {
        const types = Array.isArray(schema['@type']) ? schema['@type'] : [schema['@type']];
        schemaTypes.push(...types.filter((t: string) => !schemaTypes.includes(t)));
      }
    } catch (e) {
      console.warn('[Firecrawl] Invalid schema JSON:', (e as Error)?.message);
    }
  }

  return { schemaMarkup, schemaTypes };
};

/**
 * Parse HTML to extract meta tags
 */
const extractMetaTags = (html: string): { canonical: string; robotsMeta: string } => {
  let canonical = '';
  let robotsMeta = '';

  // Extract canonical
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  if (canonicalMatch) {
    canonical = canonicalMatch[1];
  }

  // Extract robots meta
  const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i);
  if (robotsMatch) {
    robotsMeta = robotsMatch[1];
  }

  return { canonical, robotsMeta };
};

/**
 * Parse HTML to extract links
 */
const extractLinks = (html: string, baseUrl: string): { internalLinks: ApifyPageData['internalLinks']; externalLinks: ApifyPageData['externalLinks'] } => {
  const internalLinks: ApifyPageData['internalLinks'] = [];
  const externalLinks: ApifyPageData['externalLinks'] = [];

  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  let position = 0;

  try {
    const baseUrlObj = new URL(baseUrl);

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const text = match[2].replace(/<[^>]+>/g, '').trim().substring(0, 100);

      // Get rel attribute
      const relMatch = match[0].match(/rel=["']([^"']+)["']/i);
      const rel = relMatch ? relMatch[1] : undefined;

      try {
        const linkUrl = new URL(href, baseUrl);

        if (linkUrl.hostname === baseUrlObj.hostname) {
          internalLinks.push({
            href: linkUrl.href,
            text,
            rel,
            position: position < 1000 ? 'header' : position < 5000 ? 'body' : 'footer',
          });
        } else if (linkUrl.protocol.startsWith('http')) {
          externalLinks.push({ href: linkUrl.href, text, rel });
        }
      } catch { /* intentional: skip malformed URLs from HTML parsing */ }

      position += match[0].length;
    }
  } catch { /* intentional: skip malformed URLs from HTML parsing */ }

  return { internalLinks, externalLinks };
};

/**
 * Parse HTML to extract images
 */
const extractImages = (html: string, baseUrl: string): ApifyPageData['images'] => {
  const images: ApifyPageData['images'] = [];
  const imgRegex = /<img[^>]*>/gi;
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    const srcMatch = match[0].match(/src=["']([^"']+)["']/i);
    const altMatch = match[0].match(/alt=["']([^"']+)["']/i);
    const widthMatch = match[0].match(/width=["']?(\d+)/i);
    const heightMatch = match[0].match(/height=["']?(\d+)/i);

    if (srcMatch) {
      try {
        const src = new URL(srcMatch[1], baseUrl).href;
        images.push({
          src,
          alt: altMatch ? altMatch[1] : '',
          width: widthMatch ? parseInt(widthMatch[1]) : undefined,
          height: heightMatch ? parseInt(heightMatch[1]) : undefined,
        });
      } catch { /* intentional: skip malformed image URLs from HTML parsing */ }
    }
  }

  return images;
};

/**
 * Extract a single page using Firecrawl API with retry logic
 */
export const extractPageWithFirecrawl = async (
  url: string,
  apiKey: string,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
  proxyConfig?: FirecrawlProxyConfig
): Promise<ApifyPageData> => {
  // Retry loop with exponential backoff
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
    try {
      return await doFirecrawlExtraction(url, apiKey, proxyConfig);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const statusMatch = lastError.message.match(/(\d{3})/);
      const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;

      // If not retryable or last attempt, throw immediately
      if (!isRetryableError(status) || attempt === retryConfig.maxRetries - 1) {
        throw lastError;
      }

      // Calculate backoff delay
      const delayMs = retryConfig.initialDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt);
      await sleep(delayMs);
    }
  }

  // Should never reach here, but TypeScript doesn't know that
  throw lastError || new Error('Failed to extract page with Firecrawl');
};

/**
 * Internal function to perform the actual Firecrawl extraction
 */
const doFirecrawlExtraction = async (
  url: string,
  apiKey: string,
  proxyConfig?: FirecrawlProxyConfig
): Promise<ApifyPageData> => {
  console.log('[Firecrawl] Extracting:', url);
  const startTime = Date.now();

  let supabase;
  try {
    if (proxyConfig?.supabaseUrl && proxyConfig?.supabaseAnonKey) {
      supabase = getSupabaseClient(proxyConfig.supabaseUrl, proxyConfig.supabaseAnonKey);
    }
  } catch (e) { /* ignore */ }

  try {
  const response = await firecrawlFetch(FIRECRAWL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ['html', 'markdown'],
      includeTags: ['title', 'meta', 'link', 'script', 'a', 'img'],
      waitFor: 2000, // Wait for dynamic content
    }),
  }, proxyConfig);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Firecrawl] API error:', response.status, errorText);
    throw new Error(`Firecrawl API error (${response.status}): ${errorText}`);
  }

  const result: FirecrawlScrapeResponse = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Firecrawl extraction failed');
  }

  const { data } = result;
  const html = data.html || '';

  // Extract schema markup from HTML
  const { schemaMarkup, schemaTypes } = extractSchemaMarkup(html);

  // Extract meta tags
  const { canonical, robotsMeta } = extractMetaTags(html);

  // Extract links
  const { internalLinks, externalLinks } = extractLinks(html, url);

  // Extract images
  const images = extractImages(html, url);

  // Build ApifyPageData compatible response
  const pageData: ApifyPageData = {
    url,
    statusCode: data.metadata?.statusCode || 200,

    // Meta
    title: data.metadata?.title || data.metadata?.ogTitle || '',
    metaDescription: data.metadata?.description || data.metadata?.ogDescription || '',
    canonical,
    robotsMeta,

    // Schema
    schemaMarkup,
    schemaTypes,

    // Performance (Firecrawl doesn't provide these, use defaults)
    ttfbMs: 0, // Not available from Firecrawl
    loadTimeMs: 0, // Not available from Firecrawl
    htmlSizeKb: Math.round((html.length / 1024) * 100) / 100,
    domNodes: (html.match(/<[^>]+>/g) || []).length, // Rough estimate

    // Full HTML
    html,

    // Links
    internalLinks,
    externalLinks,

    // Images
    images,
  };

  console.log('[Firecrawl] Extracted:', url, '- Status:', pageData.statusCode);

  logAiUsage({
    provider: 'firecrawl',
    model: 'scraper',
    operation: 'page-extraction',
    tokensIn: 0,
    tokensOut: 1,
    durationMs: Date.now() - startTime,
    success: true,
  }, supabase).catch(() => {});

  return pageData;
  } catch (error) {
    logAiUsage({
      provider: 'firecrawl',
      model: 'scraper',
      operation: 'page-extraction',
      tokensIn: 0,
      tokensOut: 1,
      durationMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown Error',
    }, supabase).catch(() => {});
    throw error;
  }
};

/**
 * Extract multiple pages using Firecrawl with rate limiting
 */
export const extractMultiplePagesWithFirecrawl = async (
  urls: string[],
  apiKey: string,
  onProgress?: (completed: number, total: number, currentUrl: string) => void,
  concurrency: number = 2, // Firecrawl rate limits, so keep concurrency low
  proxyConfig?: FirecrawlProxyConfig
): Promise<Map<string, ApifyPageData>> => {
  const results = new Map<string, ApifyPageData>();
  const errors: string[] = [];

  console.log(`[Firecrawl] Starting batch extraction of ${urls.length} URLs`);

  // Process in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map(url => extractPageWithFirecrawl(url, apiKey, DEFAULT_RETRY_CONFIG, proxyConfig))
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      const url = batch[j];

      if (result.status === 'fulfilled') {
        results.set(url, result.value);
      } else {
        console.error(`[Firecrawl] Failed to extract ${url}:`, result.reason);
        errors.push(`${url}: ${result.reason}`);
      }

      if (onProgress) {
        onProgress(i + j + 1, urls.length, url);
      }
    }

    // Rate limit: wait 500ms between batches
    if (i + concurrency < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  if (errors.length > 0) {
    console.warn(`[Firecrawl] Completed with ${errors.length} errors:`, errors);
  }

  return results;
};

/**
 * Check if Firecrawl API key is valid
 */
export const validateFirecrawlApiKey = async (apiKey: string, proxyConfig?: FirecrawlProxyConfig): Promise<boolean> => {
  try {
    // Try to scrape a simple test URL
    const response = await firecrawlFetch(FIRECRAWL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: 'https://example.com',
        formats: ['html'],
      }),
    }, proxyConfig);

    // 401/403 means invalid key, anything else might be valid
    return response.status !== 401 && response.status !== 403;
  } catch { /* API key validation failed — key is invalid */
    return false;
  }
};

/**
 * Simple URL scrape that returns just markdown content
 * Used by migration service for content analysis
 */
export const scrapeUrl = async (
  url: string,
  apiKey: string,
  proxyConfig?: FirecrawlProxyConfig
): Promise<{ markdown: string; title: string; statusCode: number }> => {
  console.log('[Firecrawl] Scraping URL:', url);
  const startTime = Date.now();

  let supabase;
  try {
    if (proxyConfig?.supabaseUrl && proxyConfig?.supabaseAnonKey) {
      supabase = getSupabaseClient(proxyConfig.supabaseUrl, proxyConfig.supabaseAnonKey);
    }
  } catch (e) { /* ignore */ }

  try {
    const response = await firecrawlFetch(FIRECRAWL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        waitFor: 2000,
      }),
    }, proxyConfig);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl API error (${response.status}): ${errorText}`);
    }

    const result: FirecrawlScrapeResponse = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Firecrawl scrape failed');
    }

    logAiUsage({
      provider: 'firecrawl',
      model: 'scraper',
      operation: 'url-scrape',
      tokensIn: 0,
      tokensOut: 1,
      durationMs: Date.now() - startTime,
      success: true,
    }, supabase).catch(() => {});

    return {
      markdown: result.data.markdown || '',
      title: result.data.metadata?.title || '',
      statusCode: result.data.metadata?.statusCode || 200,
    };
  } catch (error) {
    logAiUsage({
      provider: 'firecrawl',
      model: 'scraper',
      operation: 'url-scrape',
      tokensIn: 0,
      tokensOut: 1,
      durationMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown Error',
    }, supabase).catch(() => {});
    throw error;
  }
};

/**
 * Scrape a URL for audit purposes with extended metadata
 * Returns content summary and SEO-relevant data
 */
export const scrapeForAudit = async (
  url: string,
  apiKey: string,
  proxyConfig?: FirecrawlProxyConfig
): Promise<{
  url: string;
  title: string;
  markdown: string;
  wordCount: number;
  headings: string[];
  internalLinkCount: number;
  externalLinkCount: number;
  statusCode: number;
}> => {
  console.log('[Firecrawl] Scraping for audit:', url);
  const startTime = Date.now();

  let supabase;
  try {
    if (proxyConfig?.supabaseUrl && proxyConfig?.supabaseAnonKey) {
      supabase = getSupabaseClient(proxyConfig.supabaseUrl, proxyConfig.supabaseAnonKey);
    }
  } catch (e) { /* ignore */ }

  try {
    const response = await firecrawlFetch(FIRECRAWL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['html', 'markdown'],
        includeTags: ['h1', 'h2', 'h3', 'h4', 'a'],
        waitFor: 2000,
      }),
    }, proxyConfig);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl API error (${response.status}): ${errorText}`);
    }

    const result: FirecrawlScrapeResponse = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Firecrawl audit scrape failed');
    }

    const { data } = result;
    const html = data.html || '';
    const markdown = data.markdown || '';

    // Extract headings
    const headings: string[] = [];
    const headingRegex = /<h[1-4][^>]*>(.*?)<\/h[1-4]>/gi;
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
      headings.push(match[1].replace(/<[^>]+>/g, '').trim());
    }

    // Count links
    const { internalLinks, externalLinks } = extractLinks(html, url);

    // Count words
    const plainText = markdown.replace(/[#*_\[\]()]/g, ' ').replace(/\s+/g, ' ');
    const wordCount = plainText.split(' ').filter(w => w.length > 0).length;

    logAiUsage({
      provider: 'firecrawl',
      model: 'scraper',
      operation: 'audit-scrape',
      tokensIn: 0,
      tokensOut: 1,
      durationMs: Date.now() - startTime,
      success: true,
    }, supabase).catch(() => {});

    return {
      url,
      title: data.metadata?.title || '',
      markdown,
      wordCount,
      headings,
      internalLinkCount: internalLinks.length,
      externalLinkCount: externalLinks.length,
      statusCode: data.metadata?.statusCode || 200,
    };
  } catch (error) {
    logAiUsage({
      provider: 'firecrawl',
      model: 'scraper',
      operation: 'audit-scrape',
      tokensIn: 0,
      tokensOut: 1,
      durationMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown Error',
    }, supabase).catch(() => {});
    throw error;
  }
};
