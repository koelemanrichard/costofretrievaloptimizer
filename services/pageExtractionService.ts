// services/pageExtractionService.ts
// Unified page extraction orchestrator - combines Apify (technical) + Jina (semantic) + Firecrawl fallback

import {
  ApifyPageData,
  JinaExtraction,
  ExtractedPageData,
  ExtractionType,
  ScrapingProvider,
} from '../types';
import { extractMultiplePagesTechnicalData } from './apifyService';
import {
  extractPageContent as jinaExtractPage,
  extractMultiplePages as jinaExtractMultiple,
  generateContentHash,
} from './jinaService';
import {
  extractPageWithFirecrawl,
  extractMultiplePagesWithFirecrawl,
} from './firecrawlService';
import {
  selectProvidersForExtraction,
  needsParallelExtraction,
  getSemanticProvider,
  getTechnicalProvider,
} from './scrapingProviderRouter';

export interface ExtractionConfig {
  apifyToken: string;
  jinaApiKey: string;
  firecrawlApiKey?: string; // Optional Firecrawl API key for fallback

  // New provider router fields
  extractionType?: ExtractionType; // Type of extraction (semantic_only, technical_only, full_audit, auto)
  preferredProvider?: ScrapingProvider | 'auto'; // User preference for provider
  enableFallback?: boolean; // Default true - use fallback providers when primary fails
  forceApifyDomains?: string[]; // Custom domains that require Apify (JS-heavy sites)

  // Legacy fields (deprecated but kept for backward compatibility)
  useApify?: boolean;
  useJina?: boolean;
  useFirecrawlFallback?: boolean; // Default true - use Firecrawl when Apify fails

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
  phase: 'technical' | 'firecrawl_fallback' | 'semantic' | 'complete';
  completed: number;
  total: number;
  currentUrl?: string;
  errors: { url: string; error: string; phase: string }[];
}

export type ProgressCallback = (progress: ExtractionProgress) => void;

/**
 * Use case type for determining extraction strategy
 */
export type ExtractionUseCase =
  | 'content_brief'
  | 'topic_enrichment'
  | 'link_analysis'
  | 'schema_extraction'
  | 'site_audit'
  | 'competitor_analysis'
  | 'full_seo'
  | 'content_quality';

/**
 * Map use cases to extraction types
 */
export function getExtractionTypeForUseCase(useCase: ExtractionUseCase): ExtractionType {
  switch (useCase) {
    case 'content_brief':
    case 'topic_enrichment':
    case 'content_quality':
      // Only need content and headings
      return 'semantic_only';
    case 'link_analysis':
    case 'schema_extraction':
      // Only need technical SEO data
      return 'technical_only';
    case 'site_audit':
    case 'competitor_analysis':
    case 'full_seo':
      // Need everything
      return 'full_audit';
    default:
      return 'auto';
  }
}

/**
 * Internal helper: Extract with a specific provider
 */
async function extractWithProvider(
  url: string,
  provider: ScrapingProvider,
  config: ExtractionConfig
): Promise<{ technical: ApifyPageData | null; semantic: JinaExtraction | null }> {
  const { apifyToken, jinaApiKey, firecrawlApiKey, proxyConfig } = config;

  let technical: ApifyPageData | null = null;
  let semantic: JinaExtraction | null = null;

  switch (provider) {
    case 'jina':
      if (jinaApiKey) {
        semantic = await jinaExtractPage(url, jinaApiKey, proxyConfig);
      }
      break;

    case 'firecrawl':
      if (firecrawlApiKey) {
        const firecrawlResult = await extractPageWithFirecrawl(url, firecrawlApiKey);
        // Firecrawl provides both technical and semantic data
        technical = firecrawlResult;
        // Convert markdown to semantic format
        if (firecrawlResult.markdown) {
          const wordCount = firecrawlResult.markdown.split(/\s+/).length;
          semantic = {
            url,
            title: firecrawlResult.title || '',
            content: firecrawlResult.markdown,
            description: firecrawlResult.metaDescription || '',
            wordCount,
            readingTime: Math.ceil(wordCount / 200), // ~200 wpm average reading speed
            headings: parseHeadingsFromMarkdown(firecrawlResult.markdown),
            links: [],
            images: firecrawlResult.images || [],
            schema: firecrawlResult.schemaMarkup || [],
            author: null,
            publishedTime: null,
            modifiedTime: null,
          };
        }
      }
      break;

    case 'apify':
      if (apifyToken) {
        const apifyResults = await extractMultiplePagesTechnicalData([url], apifyToken);
        technical = apifyResults[0] || null;
      }
      break;
  }

  return { technical, semantic };
}

/**
 * Extract a single page with both technical and semantic data
 * Now uses provider router for intelligent provider selection and fallback
 */
export const extractSinglePage = async (
  url: string,
  config: ExtractionConfig
): Promise<ExtractedPageData> => {
  const {
    apifyToken,
    jinaApiKey,
    firecrawlApiKey,
    extractionType = 'auto',
    preferredProvider = 'auto',
    enableFallback = true,
    forceApifyDomains,
    proxyConfig,
  } = config;

  let technical: ApifyPageData | null = null;
  let semantic: JinaExtraction | null = null;
  const errors: string[] = [];
  let primaryProvider: ScrapingProvider | undefined;
  let fallbackUsed = false;

  // Get provider priority list based on extraction type and config
  const providers = selectProvidersForExtraction(extractionType, {
    jinaApiKey,
    firecrawlApiKey,
    apifyToken,
    preferredProvider,
    forceApifyDomains,
    url,
  });

  if (providers.length === 0) {
    errors.push('No API keys configured for extraction');
    const contentHash = generateContentHash('');
    return {
      url,
      technical,
      semantic,
      contentHash,
      extractedAt: Date.now(),
      errors,
      primaryProvider,
      fallbackUsed,
    };
  }

  // Check if we need parallel extraction (full_audit)
  if (needsParallelExtraction(extractionType)) {
    // Full audit: run semantic and technical in parallel
    const semanticProvider = getSemanticProvider(providers);
    const technicalProvider = getTechnicalProvider(providers);

    const extractions = await Promise.allSettled([
      semanticProvider ? extractWithProvider(url, semanticProvider, config) : Promise.resolve({ technical: null, semantic: null }),
      technicalProvider && technicalProvider !== semanticProvider
        ? extractWithProvider(url, technicalProvider, config)
        : Promise.resolve({ technical: null, semantic: null }),
    ]);

    // Merge results from parallel extraction
    if (extractions[0].status === 'fulfilled') {
      const result = extractions[0].value;
      semantic = semantic || result.semantic;
      technical = technical || result.technical;
      if (result.semantic || result.technical) {
        primaryProvider = semanticProvider || undefined;
      }
    } else if (semanticProvider) {
      errors.push(`${semanticProvider} extraction failed: ${extractions[0].reason}`);
    }

    if (extractions[1].status === 'fulfilled') {
      const result = extractions[1].value;
      technical = technical || result.technical;
      semantic = semantic || result.semantic;
    } else if (technicalProvider && technicalProvider !== semanticProvider) {
      errors.push(`${technicalProvider} extraction failed: ${extractions[1].reason}`);
    }
  } else {
    // Sequential extraction with fallback
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const isFirstAttempt = i === 0;

      try {
        const result = await extractWithProvider(url, provider, config);

        // Check if we got useful data
        if (result.technical || result.semantic) {
          technical = result.technical;
          semantic = result.semantic;
          primaryProvider = provider;
          fallbackUsed = !isFirstAttempt;
          break; // Success, stop trying
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${provider} extraction failed: ${errorMsg}`);

        // If fallback is disabled or this is the last provider, stop
        if (!enableFallback || i === providers.length - 1) {
          break;
        }
        // Otherwise, continue to next provider
      }
    }
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
    primaryProvider,
    fallbackUsed,
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
    firecrawlApiKey,
    useApify = true,
    useJina = true,
    useFirecrawlFallback = true,
    batchSize = 10,
    proxyConfig,
  } = config;

  const results: ExtractedPageData[] = [];
  const technicalResults = new Map<string, ApifyPageData>();
  const semanticResults = new Map<string, JinaExtraction>();
  const extractionErrors: { url: string; error: string; phase: string }[] = [];
  let usedFirecrawlFallback = false;

  // Phase 1: Technical extraction (Apify - handles batches internally)
  let apifyFailed = false;
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
      console.error('[Extraction] Apify failed:', errorMsg);
      apifyFailed = true;
      // Add error for all URLs if batch fails
      for (const url of urls) {
        extractionErrors.push({ url, error: errorMsg, phase: 'technical' });
      }
    }
  }

  // Phase 1b: Firecrawl fallback (if Apify failed or wasn't used, and Firecrawl is configured)
  const urlsWithoutTechnicalData = urls.filter(url => !technicalResults.has(normalizeUrl(url)));
  if (useFirecrawlFallback && firecrawlApiKey && urlsWithoutTechnicalData.length > 0) {
    console.log(`[Extraction] Using Firecrawl fallback for ${urlsWithoutTechnicalData.length} URLs`);
    usedFirecrawlFallback = true;

    try {
      onProgress?.({
        phase: 'firecrawl_fallback',
        completed: 0,
        total: urlsWithoutTechnicalData.length,
        errors: extractionErrors,
      });

      const firecrawlResults = await extractMultiplePagesWithFirecrawl(
        urlsWithoutTechnicalData,
        firecrawlApiKey,
        (completed, total, currentUrl) => {
          onProgress?.({
            phase: 'firecrawl_fallback',
            completed,
            total,
            currentUrl,
            errors: extractionErrors,
          });
        }
      );

      // Add Firecrawl results to technical results
      for (const [url, data] of firecrawlResults) {
        technicalResults.set(normalizeUrl(url), data);
        // Remove the Apify error since Firecrawl succeeded
        const errorIndex = extractionErrors.findIndex(
          e => normalizeUrl(e.url) === normalizeUrl(url) && e.phase === 'technical'
        );
        if (errorIndex > -1) {
          extractionErrors.splice(errorIndex, 1);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Extraction] Firecrawl fallback also failed:', errorMsg);
      // Don't add duplicate errors - the Apify errors are already there
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

  // H1: prefer Jina headings (cleaner semantic extraction), fallback to HTML parsing
  // Jina's markdown parsing is more reliable than regex-based HTML extraction
  const jinaH1 = semantic?.headings?.find(h => h.level === 1)?.text || '';
  const htmlH1 = findH1(technical?.html);
  const h1 = jinaH1 || htmlH1 || '';

  // Debug: log headings to understand why H1 might be missing
  if (!h1 && semantic?.headings?.length) {
    console.log('[PageExtraction] H1 not found, headings available:',
      semantic.headings.slice(0, 5).map(h => ({ level: h.level, text: h.text?.slice(0, 50) }))
    );
  }

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
 * Parse headings from markdown content
 */
const parseHeadingsFromMarkdown = (markdown: string): { level: number; text: string }[] => {
  if (!markdown) return [];
  const headings: { level: number; text: string }[] = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    // Match markdown headings (# H1, ## H2, etc.)
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      if (text) {
        headings.push({ level, text });
      }
    }
  }

  return headings;
};

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
 * Extract H1 from raw HTML - handles nested elements inside H1
 */
const findH1 = (html?: string): string => {
  if (!html) return '';
  // Match H1 with any content (including nested tags)
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return '';
  // Strip inner HTML tags to get just the text
  const text = match[1]
    .replace(/<[^>]+>/g, ' ')  // Replace tags with space
    .replace(/\s+/g, ' ')       // Normalize whitespace
    .trim();
  return text;
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
 * Parse headings from raw HTML - handles nested elements inside headings
 */
const parseHeadingsFromHtml = (html?: string): { level: number; text: string }[] => {
  if (!html) return [];
  const headings: { level: number; text: string }[] = [];
  // Match headings with any content (including nested tags)
  const regex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    // Strip inner HTML tags to get just the text
    const text = match[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) {
      headings.push({
        level: parseInt(match[1], 10),
        text,
      });
    }
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
