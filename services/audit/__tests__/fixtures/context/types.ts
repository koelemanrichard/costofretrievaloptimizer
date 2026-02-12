/**
 * Extended context type for E2E test fixtures.
 * Includes all fields that any audit phase reads from the enriched content object.
 * In production, TopicalMapContext provides the semantic SEO fields;
 * here we add infrastructure fields (headers, CWV, URL metadata) that phases also consume.
 */
export interface FixtureContext {
  // --- TopicalMapContext fields (semantic SEO) ---
  centralEntity?: string;
  sourceContext?: {
    businessName: string;
    industry: string;
    targetAudience: string;
    coreServices: string[];
    uniqueSellingPoints: string[];
  };
  contentSpec?: {
    centralEntity: string;
    targetKeywords: string[];
    requiredAttributes: string[];
  };
  sourceContextAttributes?: string[];
  csiPredicates?: string[];
  eavs?: Array<{ entity: string; attribute: string; value: string; category?: string }>;
  rootAttributes?: string[];
  pageTopic?: string;
  otherPages?: Array<{ url: string; topic: string }>;
  relatedPages?: Array<{ url: string; topic: string; anchorText?: string }>;
  keyAttributes?: string[];
  websiteType?: string;
  eavTriples?: Array<{ entity: string; attribute: string; value: string }>;

  // --- CostOfRetrieval fields ---
  httpHeaders?: Record<string, string>;
  cwvMetrics?: Record<string, number | undefined>;
  ttfbMs?: number;
  contentEncoding?: string;

  // --- UrlArchitecture fields ---
  canonicalUrl?: string;
  statusCode?: number;
  redirectTarget?: string;
  redirectStatusCode?: number;
  responseTimeMs?: number;
  sitemapUrls?: string[];
  targetKeyword?: string;
  otherUrls?: string[];

  // --- CrossPageConsistency fields ---
  robotsTxt?: string;
  pageCentralEntity?: string;
  pageTargetQuery?: string;
  siteCentralEntity?: string;
  boilerplateHtml?: string;
  allPageUrls?: string[];
  allPageTargetQueries?: string[];
  allPageCentralEntities?: string[];
  internalLinksToThisPage?: string[];
  sectionTypes?: string[];

  // --- ContentFormat fields ---
  targetQuery?: string;

  // --- LinkStructure fields ---
  totalWords?: number;

  // --- WebsiteTypeSpecific fields ---
  schemaTypes?: string[];
  authorInfo?: { name?: string; bio?: string };
  headings?: string[];
}
