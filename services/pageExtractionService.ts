// services/pageExtractionService.ts
// Unified page extraction orchestrator - combines Apify (technical) + Jina (semantic)

import { ApifyPageData, JinaExtraction, ExtractedPageData } from '../types';
import { extractMultiplePagesTechnicalData } from './apifyService';
import {
  extractPageContent as jinaExtractPage,
  extractMultiplePages as jinaExtractMultiple,
  generateContentHash,
} from './jinaService';

export interface ExtractionConfig {
  apifyToken: string;
  jinaApiKey: string;
  // Which extractors to use
  useApify?: boolean;
  useJina?: boolean;
  // Concurrency settings
  batchSize?: number;
  // Timeout settings
  timeoutMs?: number;
  // Proxy config for CORS-safe requests
  proxyConfig?: {
    supabaseUrl: string;
    supabaseAnonKey: string;
  };
}

export interface ExtractionProgress {
  phase: 'technical' | 'semantic' | 'complete';
  completed: number;
  total: number;
  currentUrl?: string;
  errors: { url: string; error: string; phase: string }[];
}

export type ProgressCallback = (progress: ExtractionProgress) => void;

/**
 * Extract a single page with both technical and semantic data
 */
export const extractSinglePage = async (
  url: string,
  config: ExtractionConfig
): Promise<ExtractedPageData> => {
  const { apifyToken, jinaApiKey, useApify = true, useJina = true, proxyConfig } = config;

  let technical: ApifyPageData | null = null;
  let semantic: JinaExtraction | null = null;
  const errors: string[] = [];

  // Run extractions in parallel
  const extractions = await Promise.allSettled([
    useApify && apifyToken
      ? extractMultiplePagesTechnicalData([url], apifyToken).then(r => r[0] || null)
      : Promise.resolve(null),
    useJina && jinaApiKey
      ? jinaExtractPage(url, jinaApiKey, proxyConfig)
      : Promise.resolve(null),
  ]);

  // Handle Apify result
  if (extractions[0].status === 'fulfilled') {
    technical = extractions[0].value;
  } else if (useApify) {
    errors.push(`Apify extraction failed: ${extractions[0].reason}`);
  }

  // Handle Jina result
  if (extractions[1].status === 'fulfilled') {
    semantic = extractions[1].value;
  } else if (useJina) {
    errors.push(`Jina extraction failed: ${extractions[1].reason}`);
  }

  // Generate content hash from the best available content
  const contentForHash = semantic?.content || technical?.html || '';
  const contentHash = generateContentHash(contentForHash);

  return {
    url,
    technical,
    semantic,
    contentHash,
    extractedAt: Date.now(),
    errors: errors.length > 0 ? errors : undefined,
  };
};

/**
 * Extract multiple pages with both technical and semantic data
 * Orchestrates parallel extraction with progress reporting
 */
export const extractPages = async (
  urls: string[],
  config: ExtractionConfig,
  onProgress?: ProgressCallback
): Promise<ExtractedPageData[]> => {
  const {
    apifyToken,
    jinaApiKey,
    useApify = true,
    useJina = true,
    batchSize = 10,
    proxyConfig,
  } = config;

  const results: ExtractedPageData[] = [];
  const technicalResults = new Map<string, ApifyPageData>();
  const semanticResults = new Map<string, JinaExtraction>();
  const extractionErrors: { url: string; error: string; phase: string }[] = [];

  // Phase 1: Technical extraction (Apify - handles batches internally)
  if (useApify && apifyToken) {
    try {
      onProgress?.({
        phase: 'technical',
        completed: 0,
        total: urls.length,
        errors: extractionErrors,
      });

      const technicalData = await extractMultiplePagesTechnicalData(
        urls,
        apifyToken,
        (completed, total) => {
          onProgress?.({
            phase: 'technical',
            completed,
            total,
            errors: extractionErrors,
          });
        }
      );

      // Map results by URL
      for (const data of technicalData) {
        if (data && data.url) {
          technicalResults.set(normalizeUrl(data.url), data);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      // Add error for all URLs if batch fails
      for (const url of urls) {
        extractionErrors.push({ url, error: errorMsg, phase: 'technical' });
      }
    }
  }

  // Phase 2: Semantic extraction (Jina - sequential with rate limiting)
  if (useJina && jinaApiKey) {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

      onProgress?.({
        phase: 'semantic',
        completed: i,
        total: urls.length,
        currentUrl: url,
        errors: extractionErrors,
      });

      try {
        const semantic = await jinaExtractPage(url, jinaApiKey, proxyConfig);
        semanticResults.set(normalizeUrl(url), semantic);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        extractionErrors.push({ url, error: errorMsg, phase: 'semantic' });
      }

      // Rate limiting between Jina requests
      if (i < urls.length - 1) {
        await sleep(100);
      }
    }
  }

  // Phase 3: Combine results
  onProgress?.({
    phase: 'complete',
    completed: urls.length,
    total: urls.length,
    errors: extractionErrors,
  });

  for (const url of urls) {
    const normalizedUrl = normalizeUrl(url);
    const technical = technicalResults.get(normalizedUrl) || null;
    const semantic = semanticResults.get(normalizedUrl) || null;

    // Collect errors for this URL
    const urlErrors = extractionErrors
      .filter(e => normalizeUrl(e.url) === normalizedUrl)
      .map(e => `${e.phase}: ${e.error}`);

    // Generate content hash
    const contentForHash = semantic?.content || technical?.html || '';
    const contentHash = generateContentHash(contentForHash);

    results.push({
      url,
      technical,
      semantic,
      contentHash,
      extractedAt: Date.now(),
      errors: urlErrors.length > 0 ? urlErrors : undefined,
    });
  }

  return results;
};

/**
 * Merge extracted data into a unified page record format
 * Combines technical + semantic data with preference logic
 */
export const mergeExtractionData = (extracted: ExtractedPageData): {
  // Core fields
  url: string;
  title: string;
  metaDescription: string;
  h1: string;
  wordCount: number;
  contentHash: string;

  // Technical fields (from Apify)
  statusCode: number;
  canonicalUrl: string;
  robotsMeta: string;
  schemaTypes: string[];
  schemaJson: any[];
  ttfbMs: number;
  loadTimeMs: number;
  domNodes: number;
  htmlSizeKb: number;

  // Content fields (from Jina)
  headings: { level: number; text: string }[];
  contentMarkdown: string;

  // Links (merged from both sources)
  internalLinks: { href: string; text: string; position?: string }[];
  externalLinks: { href: string; text: string; rel?: string }[];

  // Images (merged)
  images: { src: string; alt: string; width?: number; height?: number }[];
} => {
  const { technical, semantic, url, contentHash } = extracted;

  // Determine best source for each field
  // Title: prefer Apify (actual <title> tag) over Jina
  const title = technical?.title || semantic?.title || '';

  // Meta description: Apify has direct access
  const metaDescription = technical?.metaDescription || semantic?.description || '';

  // H1: extract from technical headings or Jina headings
  const h1 = findH1(technical?.html) || semantic?.headings?.find(h => h.level === 1)?.text || '';

  // Word count: prefer Jina (clean text) over estimate from HTML
  const wordCount = semantic?.wordCount || estimateWordCount(technical?.html);

  // Schema: prefer technical (direct extraction from HTML)
  const schemaJson = technical?.schemaMarkup || semantic?.schema || [];
  const schemaTypes = technical?.schemaTypes || schemaJson.map((s: any) => s['@type']).filter(Boolean).flat();

  // Headings: prefer Jina (cleaner extraction from markdown)
  const headings = semantic?.headings || parseHeadingsFromHtml(technical?.html) || [];

  // Links: merge both sources, preferring Apify for position data
  const internalLinks = mergeLinks(
    technical?.internalLinks || [],
    semantic?.links?.filter(l => l.isInternal) || [],
    true
  );

  const externalLinks = mergeLinks(
    technical?.externalLinks || [],
    semantic?.links?.filter(l => !l.isInternal) || [],
    false
  );

  // Images: merge both sources
  const images = mergeImages(technical?.images || [], semantic?.images || []);

  return {
    url,
    title,
    metaDescription,
    h1,
    wordCount,
    contentHash,

    // Technical
    statusCode: technical?.statusCode || 0,
    canonicalUrl: technical?.canonical || '',
    robotsMeta: technical?.robotsMeta || '',
    schemaTypes,
    schemaJson,
    ttfbMs: technical?.ttfbMs || 0,
    loadTimeMs: technical?.loadTimeMs || 0,
    domNodes: technical?.domNodes || 0,
    htmlSizeKb: technical?.htmlSizeKb || 0,

    // Content
    headings,
    contentMarkdown: semantic?.content || '',

    // Links
    internalLinks,
    externalLinks,

    // Images
    images,
  };
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Normalize URL for consistent comparison
 */
const normalizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    // Remove trailing slash, lowercase hostname
    let normalized = `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname}`;
    if (normalized.endsWith('/') && normalized.length > 1) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return url.toLowerCase();
  }
};

/**
 * Extract H1 from raw HTML
 */
const findH1 = (html?: string): string => {
  if (!html) return '';
  const match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
  return match ? match[1].trim() : '';
};

/**
 * Estimate word count from HTML
 */
const estimateWordCount = (html?: string): number => {
  if (!html) return 0;
  // Strip tags and count words
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.split(' ').filter(w => w.length > 0).length;
};

/**
 * Parse headings from raw HTML
 */
const parseHeadingsFromHtml = (html?: string): { level: number; text: string }[] => {
  if (!html) return [];
  const headings: { level: number; text: string }[] = [];
  const regex = /<h([1-6])[^>]*>([^<]*)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1], 10),
      text: match[2].trim(),
    });
  }
  return headings;
};

/**
 * Merge links from multiple sources
 */
const mergeLinks = (
  apifyLinks: { href: string; text: string; position?: string; rel?: string }[],
  jinaLinks: { href: string; text: string }[],
  isInternal: boolean
): { href: string; text: string; position?: string; rel?: string }[] => {
  const seen = new Set<string>();
  const merged: { href: string; text: string; position?: string; rel?: string }[] = [];

  // Add Apify links first (they have position data)
  for (const link of apifyLinks) {
    const key = normalizeUrl(link.href);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(link);
    }
  }

  // Add Jina links that weren't in Apify results
  for (const link of jinaLinks) {
    const key = normalizeUrl(link.href);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push({ ...link, position: 'content' });
    }
  }

  return merged;
};

/**
 * Merge images from multiple sources
 */
const mergeImages = (
  apifyImages: { src: string; alt: string; width?: number; height?: number }[],
  jinaImages: { src: string; alt: string }[]
): { src: string; alt: string; width?: number; height?: number }[] => {
  const seen = new Set<string>();
  const merged: { src: string; alt: string; width?: number; height?: number }[] = [];

  // Add Apify images first (they have dimensions)
  for (const img of apifyImages) {
    const key = img.src;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(img);
    }
  }

  // Add Jina images that weren't in Apify results
  for (const img of jinaImages) {
    if (!seen.has(img.src)) {
      seen.add(img.src);
      merged.push(img);
    }
  }

  return merged;
};

/**
 * Check if extraction was successful
 */
export const isExtractionSuccessful = (extracted: ExtractedPageData): boolean => {
  // At least one source should have data
  return !!(extracted.technical || extracted.semantic);
};

/**
 * Get extraction quality score (0-100)
 */
export const getExtractionQuality = (extracted: ExtractedPageData): number => {
  let score = 0;

  // Technical extraction (50 points)
  if (extracted.technical) {
    score += 20; // Base for having technical data
    if (extracted.technical.statusCode === 200) score += 10;
    if (extracted.technical.schemaMarkup?.length > 0) score += 10;
    if (extracted.technical.ttfbMs > 0) score += 5;
    if (extracted.technical.canonical) score += 5;
  }

  // Semantic extraction (50 points)
  if (extracted.semantic) {
    score += 20; // Base for having semantic data
    if (extracted.semantic.content?.length > 100) score += 10;
    if (extracted.semantic.headings?.length > 0) score += 10;
    if (extracted.semantic.wordCount > 0) score += 5;
    if (extracted.semantic.links?.length > 0) score += 5;
  }

  return Math.min(100, score);
};
