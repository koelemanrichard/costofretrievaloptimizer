/**
 * Site Analysis Types Module
 *
 * Contains site analysis V2 types including:
 * - SiteAnalysisProject: Site-first architecture container
 * - SitePageRecord: Individual page records
 * - JinaExtraction: Semantic extraction data
 * - ApifyPageData: Technical extraction data
 * - CrawlSession: Crawl progress tracking
 *
 * Created: 2024-12-19 - Types refactoring initiative
 *
 * @module types/siteAnalysis
 */

import type { PageAuditResult } from './audit';
import type { GscRow } from './content';

// ============================================================================
// SITE ANALYSIS STATUS
// ============================================================================

/**
 * Workflow status for site analysis
 */
export type SiteAnalysisStatus =
  | 'created'
  | 'crawling'
  | 'extracting'
  | 'discovering_pillars'
  | 'awaiting_validation'
  | 'building_graph'
  | 'analyzing'
  | 'completed'
  | 'error';

// ============================================================================
// SITE ANALYSIS PROJECT
// ============================================================================

/**
 * Site Analysis Project - Top-level container
 */
export interface SiteAnalysisProject {
  id: string;
  userId: string;
  name: string;
  domain: string;
  status: SiteAnalysisStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  lastAuditAt?: string;

  // Input sources
  inputMethod: 'url' | 'sitemap' | 'gsc' | 'manual';
  sitemapUrl?: string;

  // Link to existing topical map (optional)
  linkedMapId?: string;

  // Semantic Foundation (CE/SC/CSI) - The Pillars
  centralEntity?: string;
  centralEntityType?: string;
  sourceContext?: string;
  sourceContextType?: string;
  centralSearchIntent?: string;
  pillarsValidated: boolean;
  pillarsValidatedAt?: string;
  pillarsSource?: 'inferred' | 'linked' | 'manual';

  // Pages (loaded separately for large sites)
  pages?: SitePageRecord[];
  pageCount?: number;

  // GSC data (if uploaded)
  gscData?: GscRow[];

  // Generated topical map
  generatedTopicalMapId?: string;

  // Crawl session tracking
  crawlSession?: CrawlSession;
}

/**
 * Discovered pillars from AI analysis
 */
export interface DiscoveredPillars {
  centralEntity: {
    suggested: string;
    type: string;
    confidence: number;
    evidence: string[];
    alternatives: { value: string; confidence: number }[];
  };
  sourceContext: {
    suggested: string;
    type: string;
    confidence: number;
    evidence: string[];
    alternatives: { value: string; confidence: number }[];
  };
  centralSearchIntent: {
    suggested: string;
    confidence: number;
    evidence: string[];
    alternatives: { value: string; confidence: number }[];
  };
}

// ============================================================================
// SITE PAGE RECORD
// ============================================================================

/**
 * Individual page record in site analysis
 */
export interface SitePageRecord {
  id: string;
  projectId?: string;
  url: string;
  path?: string;

  // Discovery
  discoveredVia?: 'sitemap' | 'crawl' | 'gsc' | 'manual' | 'link';
  sitemapLastmod?: string;
  sitemapPriority?: number;
  sitemapChangefreq?: string;

  // Crawl status
  crawlStatus?: 'pending' | 'crawling' | 'crawled' | 'failed' | 'skipped';
  crawlError?: string;
  error?: string;
  crawledAt?: string;
  apifyCrawled?: boolean;
  jinaCrawled?: boolean;
  firecrawlCrawled?: boolean;

  // Content basics
  contentHash?: string;
  contentChanged?: boolean;
  title?: string;
  metaDescription?: string;
  h1?: string;
  wordCount?: number;

  // Technical data (from Apify)
  statusCode?: number;
  canonicalUrl?: string;
  robotsMeta?: string;
  schemaTypes?: string[];
  schemaJson?: unknown[];
  ttfbMs?: number;
  loadTimeMs?: number;
  domNodes?: number;
  htmlSizeKb?: number;

  // Semantic data (from Jina)
  headings?: { level: number; text: string }[];
  links?: { href: string; text: string; isInternal: boolean; position?: string }[];
  images?: { src: string; alt: string; width?: number; height?: number }[];
  contentMarkdown?: string;

  // Raw extraction data
  jinaExtraction?: {
    title?: string;
    description?: string;
    content?: string;
    links?: unknown[];
    images?: unknown[];
    headings?: { level: number; text: string }[];
    wordCount?: number;
    schema?: unknown[];
  };
  gscData?: GscRow[];

  // Legacy status field
  status?: 'pending' | 'crawling' | 'crawled' | 'audited' | 'error' | 'failed';
  discoveredAt?: number;
  sitemapData?: {
    lastmod?: string;
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: number;
  };
  gscMetrics?: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };

  // GSC metrics
  gscClicks?: number;
  gscImpressions?: number;
  gscCtr?: number;
  gscPosition?: number;
  gscQueries?: GscRow[];

  // Latest audit
  latestAuditId?: string;
  latestAuditScore?: number;
  latestAuditAt?: string;

  // Inline audit result (populated during runtime)
  auditResult?: PageAuditResult;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// CRAWL TRACKING
// ============================================================================

/**
 * Crawl progress tracking (for UI)
 */
export interface CrawlProgress {
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalUrls: number;
  crawledUrls: number;
  failedUrls: number;
  currentPhase: 'discovery' | 'apify' | 'jina' | 'complete';
  errors: string[];
  startedAt?: number;
  completedAt?: number;
}

/**
 * Crawl session tracking
 */
export interface CrawlSession {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  totalUrls: number;
  crawledUrls: number;
  failedUrls: number;
  errors: string[];
  urlsDiscovered?: number;
  urlsCrawled?: number;
  urlsFailed?: number;
}

// ============================================================================
// EXTRACTION DATA TYPES
// ============================================================================

/**
 * Jina extraction result (semantic data)
 */
export interface JinaExtraction {
  url?: string;
  title: string;
  description: string;
  content: string;
  headings: { level: number; text: string }[];
  links: { href: string; text: string; isInternal: boolean; position?: string }[];
  images: { src: string; alt: string }[];
  schema: unknown[];
  wordCount: number;
  readingTime: number;
  author?: string | null;
  publishedTime?: string | null;
  modifiedTime?: string | null;
}

/**
 * Apify page data (technical data)
 */
export interface ApifyPageData {
  url: string;
  statusCode: number;

  // Meta
  title: string;
  metaDescription: string;
  canonical: string;
  robotsMeta: string;

  // Schema
  schemaMarkup: unknown[];
  schemaTypes: string[];

  // Performance
  ttfbMs: number;
  loadTimeMs: number;
  htmlSizeKb: number;
  domNodes: number;

  // Full HTML for custom parsing
  html: string;

  // Markdown content (if extracted)
  markdown?: string;

  // Links
  internalLinks: { href: string; text: string; rel?: string; position?: string }[];
  externalLinks: { href: string; text: string; rel?: string }[];

  // Link counts (computed)
  internalLinkCount?: number;
  externalLinkCount?: number;

  // Content metrics
  wordCount?: number;

  // Images
  images: { src: string; alt: string; width?: number; height?: number }[];
}

/** Legacy alias for ApifyPageData */
export type ApifyTechnicalData = ApifyPageData;

/**
 * Combined extraction result
 */
export interface PageExtraction {
  url: string;
  apify?: ApifyPageData;
  jina?: JinaExtraction;
  contentHash: string;
  extractedAt: string;
}

/**
 * Unified extraction result from pageExtractionService
 */
export interface ExtractedPageData {
  url: string;
  technical: ApifyPageData | null;
  semantic: JinaExtraction | null;
  contentHash: string;
  extractedAt: number;
  errors?: string[];
  primaryProvider?: ScrapingProvider;
  fallbackUsed?: boolean;
}

// ============================================================================
// SCRAPING PROVIDER TYPES
// ============================================================================

/**
 * Extraction type selection
 */
export type ExtractionType =
  | 'semantic_only'   // Content, headings, word count - Jina primary
  | 'technical_only'  // Schema, links, status, performance - Apify primary
  | 'full_audit'      // Both technical + semantic in parallel
  | 'auto';           // Smart selection based on available keys (default)

/**
 * Scraping provider
 */
export type ScrapingProvider = 'jina' | 'firecrawl' | 'apify';

/**
 * Provider result for extraction
 */
export interface ProviderResult {
  provider: ScrapingProvider;
  success: boolean;
  error?: string;
  duration?: number;
}

// ============================================================================
// DASHBOARD METRICS
// ============================================================================

/**
 * Dashboard metrics for site analysis
 */
export interface DashboardMetrics {
  briefGenerationProgress: number;
  knowledgeDomainCoverage: number;
  avgEAVsPerBrief: number;
  contextualFlowScore: number;
}

/**
 * Content calendar entry
 */
export interface ContentCalendarEntry {
  id: string;
  title: string;
  publishDate: Date;
  status: 'draft' | 'scheduled' | 'published';
}
