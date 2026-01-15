// services/jinaService.ts
// Jina.ai Reader API for semantic content extraction

import { JinaExtraction } from '../types';
import { jinaLogger } from './apiCallLogger';

const JINA_READER_URL = 'https://r.jina.ai/';

interface JinaResponse {
  code: number;
  status: number;
  data: {
    title: string;
    description: string;
    url: string;
    content: string;
    usage: {
      tokens: number;
    };
  };
}

interface ProxyConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

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

// Common selectors for elements to remove (cookie banners, popups, etc.)
// NOTE: Be specific - avoid broad selectors like [id*="cookie"] which can remove legitimate content
const REMOVE_SELECTORS = [
  // Cookiebot - be specific
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
  '#cookie-law-info-again',
  // Specific cookie banner IDs (full match, not partial)
  '#cookie-notice',
  '#cookie-banner',
  '#cookiebanner',
  '#gdpr-cookie-notice',
  '#gdpr-banner',
  // Class-based cookie banners (specific patterns)
  '.cookie-consent-banner',
  '.cookie-notice-container',
  '.gdpr-cookie-notice',
  '.cookie-popup',
  '.consent-banner',
  '.privacy-banner',
].join(', ');

// Common selectors for main content (fallback targets)
const MAIN_CONTENT_SELECTORS = [
  'main',
  'article',
  '[role="main"]',
  '#main-content',
  '#content',
  '.main-content',
  '.post-content',
  '.article-content',
  '.entry-content',
].join(', ');

/**
 * Extract semantic content from a URL using Jina.ai Reader API
 * Uses proxy to avoid CORS issues in browser
 */
export const extractPageContent = async (
  url: string,
  apiKey: string,
  proxyConfig?: ProxyConfig,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<JinaExtraction> => {
  if (!apiKey) {
    throw new Error('Jina.ai API key is not configured.');
  }

  // Start API call logging
  const apiCallLog = jinaLogger.start('extractPageContent', 'GET');

  // Retry loop with exponential backoff
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
    try {
      const result = await doExtraction(url, apiKey, proxyConfig);

      // Log successful API call
      jinaLogger.success(apiCallLog.id, {
        url,
        responseSize: result.content?.length || 0,
        retryCount: attempt,
      });

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const statusMatch = lastError.message.match(/(\d{3})/);
      const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;

      // If not retryable or last attempt, log error and throw
      if (!isRetryableError(status) || attempt === retryConfig.maxRetries - 1) {
        jinaLogger.error(apiCallLog.id, lastError, {
          url,
          retryCount: attempt,
        });
        throw lastError;
      }

      // Calculate backoff delay
      const delayMs = retryConfig.initialDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt);
      await sleep(delayMs);
    }
  }

  // Should never reach here, but TypeScript doesn't know that
  jinaLogger.error(apiCallLog.id, lastError || new Error('Failed to extract content'), { url });
  throw lastError || new Error('Failed to extract content');
};

/**
 * Internal function to perform the actual extraction
 */
const doExtraction = async (
  url: string,
  apiKey: string,
  proxyConfig?: ProxyConfig
): Promise<JinaExtraction> => {
  let responseData: JinaResponse;

  if (proxyConfig?.supabaseUrl) {
    // Use Supabase Edge Function proxy to avoid CORS
    const proxyUrl = `${proxyConfig.supabaseUrl}/functions/v1/fetch-proxy`;
    // NOTE: URL should NOT be encoded - Jina expects raw URL after base
    const jinaUrl = `${JINA_READER_URL}${url}`;

    const proxyResponse = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': proxyConfig.supabaseAnonKey,
        'Authorization': `Bearer ${proxyConfig.supabaseAnonKey}`,
      },
      body: JSON.stringify({
        url: jinaUrl,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'X-Return-Format': 'markdown',
          'X-With-Links-Summary': 'true',
          'X-With-Images-Summary': 'true',
          'X-With-Generated-Alt': 'true', // Generate alt text for images
          // Remove cookie banners and popups before extraction
          'X-Remove-Selector': REMOVE_SELECTORS,
          // Wait for main content to be visible (not just body)
          'X-Wait-For-Selector': 'main, article, .content, #content, body',
          // Set cookie to accept consent (workaround for cookie banners)
          'X-Set-Cookie': 'cookieconsent_status=dismiss; CookieConsent=true',
        },
      }),
    });

    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text();
      throw new Error(`Proxy request failed: ${proxyResponse.status} - ${errorText}`);
    }

    const proxyResult = await proxyResponse.json();

    if (!proxyResult.ok) {
      throw new Error(`Jina API error: ${proxyResult.status} - ${proxyResult.error || proxyResult.body}`);
    }

    // Parse the body from proxy response
    responseData = typeof proxyResult.body === 'string' ? JSON.parse(proxyResult.body) : proxyResult.body;
  } else {
    // Direct fetch (will fail with CORS in browser, but works server-side)
    // NOTE: URL should NOT be encoded - Jina expects raw URL after base
    const response = await fetch(`${JINA_READER_URL}${url}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'X-Return-Format': 'markdown',
        'X-With-Links-Summary': 'true',
        'X-With-Images-Summary': 'true',
        'X-With-Generated-Alt': 'true', // Generate alt text for images
        // Remove cookie banners and popups before extraction
        'X-Remove-Selector': REMOVE_SELECTORS,
        // Wait for main content to be visible (not just body)
        'X-Wait-For-Selector': 'main, article, .content, #content, body',
        // Set cookie to accept consent (workaround for cookie banners)
        'X-Set-Cookie': 'cookieconsent_status=dismiss; CookieConsent=true',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jina API error: ${response.status} - ${errorText}`);
    }

    responseData = await response.json();
  }

  const data = responseData;

  // Parse the markdown content to extract structured data
  const extraction = parseJinaContent(data.data.content, url);

  return {
    title: data.data.title || '',
    description: data.data.description || '',
    content: data.data.content || '',
    headings: extraction.headings,
    links: extraction.links,
    images: extraction.images,
    schema: extraction.schema,
    wordCount: extraction.wordCount,
    readingTime: extraction.readingTime,
  };
};

/**
 * Parse Jina markdown content to extract structured elements
 */
const parseJinaContent = (content: string, sourceUrl: string): {
  headings: { level: number; text: string }[];
  links: { href: string; text: string; isInternal: boolean }[];
  images: { src: string; alt: string }[];
  schema: any[];
  wordCount: number;
  readingTime: number;
} => {
  const headings: { level: number; text: string }[] = [];
  const links: { href: string; text: string; isInternal: boolean }[] = [];
  const images: { src: string; alt: string }[] = [];
  const schema: any[] = [];

  // Extract domain from source URL for internal link detection
  let sourceDomain = '';
  try {
    sourceDomain = new URL(sourceUrl).hostname;
  } catch (e) {
    // Invalid URL, skip domain extraction
  }

  // Parse headings - both ATX style (# ##) and Setext style (=== ---)
  // ATX style: # Heading, ## Heading, etc.
  const atxHeadingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  while ((match = atxHeadingRegex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
    });
  }

  // Setext style: Heading followed by === (H1) or --- (H2)
  // Split content into lines for setext parsing
  const lines = content.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const currentLine = lines[i].trim();
    const nextLine = lines[i + 1].trim();

    // Skip empty lines or lines that are already ATX headings
    if (!currentLine || currentLine.startsWith('#')) continue;

    // H1: line followed by === (at least 3 equals signs)
    if (/^={3,}$/.test(nextLine)) {
      // Clean up the heading text (remove markdown formatting like **)
      const cleanText = currentLine.replace(/\*\*/g, '').replace(/\*/g, '').trim();
      if (cleanText && cleanText.length < 200) {
        headings.push({
          level: 1,
          text: cleanText,
        });
      }
    }
    // H2: line followed by --- (at least 3 dashes)
    else if (/^-{3,}$/.test(nextLine)) {
      const cleanText = currentLine.replace(/\*\*/g, '').replace(/\*/g, '').trim();
      if (cleanText && cleanText.length < 200) {
        headings.push({
          level: 2,
          text: cleanText,
        });
      }
    }
  }

  // Sort headings by their position in content (ATX first, then setext)
  // Note: This is a simplification - in real use, order matters less than finding the H1

  // Parse links [text](url)
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[2];
    let isInternal = false;

    try {
      const linkUrl = new URL(href, sourceUrl);
      isInternal = linkUrl.hostname === sourceDomain;
    } catch (e) {
      // Relative URL - likely internal
      isInternal = !href.startsWith('http');
    }

    links.push({
      text: match[1],
      href: href,
      isInternal,
    });
  }

  // Parse images ![alt](src)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  while ((match = imageRegex.exec(content)) !== null) {
    images.push({
      alt: match[1],
      src: match[2],
    });
  }

  // Extract JSON-LD schema if present in content
  const schemaRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  while ((match = schemaRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      schema.push(parsed);
    } catch (e) {
      // Invalid JSON, skip
    }
  }

  // Calculate word count and reading time
  const textOnly = content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1') // Replace links with text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
    .replace(/#{1,6}\s+/g, '') // Remove heading markers
    .replace(/[*_`]/g, ''); // Remove formatting

  const words = textOnly.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  const readingTime = Math.ceil(wordCount / 200); // ~200 words per minute

  return {
    headings,
    links,
    images,
    schema,
    wordCount,
    readingTime,
  };
};

/**
 * Batch extract content from multiple URLs
 */
export const extractMultiplePages = async (
  urls: string[],
  apiKey: string,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, JinaExtraction | Error>> => {
  const results = new Map<string, JinaExtraction | Error>();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const extraction = await extractPageContent(url, apiKey);
      results.set(url, extraction);
    } catch (error) {
      results.set(url, error instanceof Error ? error : new Error(String(error)));
    }

    if (onProgress) {
      onProgress(i + 1, urls.length);
    }

    // Rate limiting: 100ms delay between requests
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
};

/**
 * Generate content hash for change detection
 */
export const generateContentHash = (content: string): string => {
  // Simple hash function for content comparison
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

// =============================================================================
// HTML Extraction (for Technical Layer Analysis)
// =============================================================================

/**
 * Extended extraction result that includes raw HTML
 */
export interface JinaExtractionWithHtml extends JinaExtraction {
  html: string;
}

/**
 * Extract both markdown and HTML content from a URL
 * Used for technical layer analysis (schema, navigation)
 */
export const extractPageContentWithHtml = async (
  url: string,
  apiKey: string,
  proxyConfig?: ProxyConfig,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<JinaExtractionWithHtml> => {
  if (!apiKey) {
    throw new Error('Jina.ai API key is not configured.');
  }

  // Fetch markdown content first (main extraction)
  const markdownResult = await extractPageContent(url, apiKey, proxyConfig, retryConfig);

  // Fetch HTML content
  let html = '';
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retryConfig.maxRetries; attempt++) {
    try {
      html = await doHtmlExtraction(url, apiKey, proxyConfig);
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const statusMatch = lastError.message.match(/(\d{3})/);
      const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;

      if (!isRetryableError(status) || attempt === retryConfig.maxRetries - 1) {
        // If HTML extraction fails, return markdown result with empty HTML
        console.warn(`HTML extraction failed for ${url}:`, lastError.message);
        break;
      }

      const delayMs = retryConfig.initialDelayMs * Math.pow(retryConfig.backoffMultiplier, attempt);
      await sleep(delayMs);
    }
  }

  return {
    ...markdownResult,
    html,
  };
};

/**
 * Internal function to fetch HTML content
 */
const doHtmlExtraction = async (
  url: string,
  apiKey: string,
  proxyConfig?: ProxyConfig
): Promise<string> => {
  let responseData: JinaResponse;

  if (proxyConfig?.supabaseUrl) {
    const proxyUrl = `${proxyConfig.supabaseUrl}/functions/v1/fetch-proxy`;
    const jinaUrl = `${JINA_READER_URL}${url}`;

    const proxyResponse = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': proxyConfig.supabaseAnonKey,
        'Authorization': `Bearer ${proxyConfig.supabaseAnonKey}`,
      },
      body: JSON.stringify({
        url: jinaUrl,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'X-Return-Format': 'html',
          'X-Remove-Selector': REMOVE_SELECTORS,
          'X-Wait-For-Selector': 'main, article, .content, #content, body',
          'X-Set-Cookie': 'cookieconsent_status=dismiss; CookieConsent=true',
        },
      }),
    });

    if (!proxyResponse.ok) {
      const errorText = await proxyResponse.text();
      throw new Error(`Proxy request failed: ${proxyResponse.status} - ${errorText}`);
    }

    const proxyResult = await proxyResponse.json();

    if (!proxyResult.ok) {
      throw new Error(`Jina API error: ${proxyResult.status} - ${proxyResult.error || proxyResult.body}`);
    }

    responseData = typeof proxyResult.body === 'string' ? JSON.parse(proxyResult.body) : proxyResult.body;
  } else {
    const response = await fetch(`${JINA_READER_URL}${url}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'X-Return-Format': 'html',
        'X-Remove-Selector': REMOVE_SELECTORS,
        'X-Wait-For-Selector': 'main, article, .content, #content, body',
        'X-Set-Cookie': 'cookieconsent_status=dismiss; CookieConsent=true',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jina API error: ${response.status} - ${errorText}`);
    }

    responseData = await response.json();
  }

  return responseData.data.content || '';
};
