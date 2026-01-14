/**
 * Technical Layer Service
 *
 * Orchestrates the complete technical layer analysis for competitive intelligence:
 * 1. Fetch HTML content (via Jina extended)
 * 2. Extract and analyze schema.org markup
 * 3. Analyze navigation patterns
 * 4. Extract HTML semantic tags
 * 5. Return complete TechnicalLayerAnalysis
 *
 * Research Sources:
 * - schema.md - Entity linking via about/mentions
 * - site-architecture.md - Navigation and PageRank flow
 *
 * Created: December 25, 2024
 *
 * @module services/technicalLayerService
 */

import {
  TechnicalLayerAnalysis,
  NavigationAnalysis,
  EntityLinkingAnalysis,
} from '../types/competitiveIntelligence';

import { fetchHtml, FetcherConfig } from './htmlFetcherService';
import {
  extractSchemasFromHtml,
  analyzeEntityLinking,
  getSchemaTypes,
} from './schemaEntityAnalyzer';
import { analyzeNavigation } from './navigationAnalyzer';
import { cacheService } from './cacheService';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for technical layer analysis
 */
export interface TechnicalAnalysisOptions {
  /** Skip fetch and use provided HTML */
  providedHtml?: string;
  /** Skip cache and force fresh analysis */
  skipCache?: boolean;
  /** Page context for navigation analysis (e.g., "guide", "product", "category") */
  pageContext?: string;
  /** Other pages HTML for cross-page navigation comparison */
  otherPagesHtml?: string[];
  /** Jina API key (primary scraper) */
  jinaApiKey?: string;
  /** Firecrawl API key (fallback scraper) */
  firecrawlApiKey?: string;
  /** Apify token (third fallback, uses browser rendering) */
  apifyToken?: string;
  /** Supabase URL for fetch proxy (required for browser CORS) */
  supabaseUrl?: string;
  /** Supabase anon key for fetch proxy */
  supabaseAnonKey?: string;
}

/**
 * Result of analyzing multiple competitors' technical aspects
 */
export interface CompetitorTechnicalAnalysisResult {
  competitors: TechnicalLayerAnalysis[];
  patterns: {
    commonSchemaTypes: { type: string; coverage: number }[];
    avgNavigationScore: number;
    avgTechnicalScore: number;
    avgDisambiguationScore: number;
    schemaUsageRate: number;
  };
}

// =============================================================================
// Cache Configuration
// =============================================================================

const TECHNICAL_ANALYSIS_CACHE_TTL = 86400; // 24 hours

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Extract semantic HTML tags presence from HTML
 */
function extractSemanticTags(html: string): TechnicalLayerAnalysis['semanticTags'] {
  const lowerHtml = html.toLowerCase();

  return {
    hasArticle: /<article[\s>]/i.test(html),
    hasMain: /<main[\s>]/i.test(html),
    hasAside: /<aside[\s>]/i.test(html),
    hasNav: /<nav[\s>]/i.test(html),
    hasHeader: /<header[\s>]/i.test(html),
    hasFooter: /<footer[\s>]/i.test(html),
  };
}

/**
 * Calculate overall technical score
 */
function calculateTechnicalScore(
  schema: TechnicalLayerAnalysis['schema'],
  navigationAnalysis: NavigationAnalysis,
  semanticTags: TechnicalLayerAnalysis['semanticTags']
): number {
  let score = 0;

  // Schema score (max 40 points)
  if (schema.hasSchema) {
    score += 15; // Base for having schema

    // Entity linking quality
    score += Math.min(15, schema.entityLinking.disambiguationScore * 0.15);

    // Schema variety (more types = better)
    score += Math.min(10, schema.schemaTypes.length * 2.5);
  }

  // Navigation score (max 30 points)
  score += navigationAnalysis.navigationScore * 0.3;

  // Semantic tags score (max 30 points)
  const semanticTagsCount = [
    semanticTags.hasArticle,
    semanticTags.hasMain,
    semanticTags.hasNav,
    semanticTags.hasHeader,
    semanticTags.hasFooter,
    semanticTags.hasAside,
  ].filter(Boolean).length;

  score += Math.min(30, semanticTagsCount * 5);

  return Math.round(Math.min(100, Math.max(0, score)));
}

// =============================================================================
// Core Analysis Functions
// =============================================================================

/**
 * Analyze technical layer for a single URL
 */
export async function analyzeTechnicalForUrl(
  url: string,
  options: TechnicalAnalysisOptions = {}
): Promise<TechnicalLayerAnalysis> {
  // Use cacheThrough for caching
  const fetchFn = async (): Promise<TechnicalLayerAnalysis> => {
    // Get HTML content
    let html: string;

    if (options.providedHtml) {
      html = options.providedHtml;
    } else {
      // Fetch via multi-provider fetcher (Jina -> Firecrawl -> Apify -> Direct)
      const fetcherConfig: FetcherConfig = {
        jinaApiKey: options.jinaApiKey,
        firecrawlApiKey: options.firecrawlApiKey,
        apifyToken: options.apifyToken,
        supabaseUrl: options.supabaseUrl,
        supabaseAnonKey: options.supabaseAnonKey,
      };

      // Check if any provider is available
      if (!options.jinaApiKey && !options.firecrawlApiKey && !options.apifyToken && !(options.supabaseUrl && options.supabaseAnonKey)) {
        throw new Error('At least one scraping provider (Jina, Firecrawl, Apify) or Supabase proxy config required.');
      }

      const result = await fetchHtml(url, fetcherConfig);
      if (!result.html) {
        throw new Error(`Failed to fetch HTML from ${url}`);
      }
      html = result.html;
      console.log(`[TechnicalLayer] Fetched ${url} via ${result.provider}`);
    }

    // Extract and analyze schema
    const schemaExtraction = extractSchemasFromHtml(html);
    const entityLinking = analyzeEntityLinking(html);

    const schema: TechnicalLayerAnalysis['schema'] = {
      hasSchema: schemaExtraction.hasSchema,
      schemaTypes: schemaExtraction.schemaTypes,
      entityLinking,
      validationErrors: schemaExtraction.validationErrors,
    };

    // Analyze navigation
    const navigationAnalysis = analyzeNavigation(
      html,
      url,
      options.pageContext || '',
      options.otherPagesHtml
    );

    // Extract semantic tags
    const semanticTags = extractSemanticTags(html);

    // Calculate overall score
    const technicalScore = calculateTechnicalScore(schema, navigationAnalysis, semanticTags);

    return {
      url,
      domain: extractDomain(url),
      analyzedAt: new Date(),
      schema,
      navigationAnalysis,
      semanticTags,
      technicalScore,
    };
  };

  // Skip cache if requested
  if (options.skipCache) {
    return fetchFn();
  }

  // Use cacheThrough
  return cacheService.cacheThrough(
    'technical:analysis',
    { url },
    fetchFn,
    TECHNICAL_ANALYSIS_CACHE_TTL
  );
}

/**
 * Analyze technical layer for multiple competitor URLs
 */
export async function analyzeCompetitorTechnical(
  urls: Array<{ url: string; position: number }>,
  options: {
    skipCache?: boolean;
    jinaApiKey?: string;
    onProgress?: (completed: number, total: number, currentUrl: string) => void;
  } = {}
): Promise<CompetitorTechnicalAnalysisResult> {
  const analyses: TechnicalLayerAnalysis[] = [];
  const schemaTypeCount: Record<string, number> = {};

  for (let i = 0; i < urls.length; i++) {
    const { url } = urls[i];

    if (options.onProgress) {
      options.onProgress(i, urls.length, url);
    }

    try {
      const analysis = await analyzeTechnicalForUrl(url, {
        skipCache: options.skipCache,
        jinaApiKey: options.jinaApiKey,
      });
      analyses.push(analysis);

      // Count schema types
      for (const schemaType of analysis.schema.schemaTypes) {
        schemaTypeCount[schemaType] = (schemaTypeCount[schemaType] || 0) + 1;
      }
    } catch (error) {
      console.error(`Failed to analyze technical layer for ${url}:`, error);
    }

    // Rate limiting
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Calculate patterns
  const totalAnalyses = analyses.length || 1;

  const commonSchemaTypes = Object.entries(schemaTypeCount)
    .map(([type, count]) => ({
      type,
      coverage: count / totalAnalyses,
    }))
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, 10);

  const avgNavigationScore = analyses.length > 0
    ? analyses.reduce((sum, a) => sum + a.navigationAnalysis.navigationScore, 0) / totalAnalyses
    : 0;

  const avgTechnicalScore = analyses.length > 0
    ? analyses.reduce((sum, a) => sum + a.technicalScore, 0) / totalAnalyses
    : 0;

  const avgDisambiguationScore = analyses.length > 0
    ? analyses.reduce((sum, a) => sum + a.schema.entityLinking.disambiguationScore, 0) / totalAnalyses
    : 0;

  const schemaUsageRate = analyses.filter(a => a.schema.hasSchema).length / totalAnalyses;

  if (options.onProgress) {
    options.onProgress(urls.length, urls.length, 'Complete');
  }

  return {
    competitors: analyses,
    patterns: {
      commonSchemaTypes,
      avgNavigationScore: Math.round(avgNavigationScore),
      avgTechnicalScore: Math.round(avgTechnicalScore),
      avgDisambiguationScore: Math.round(avgDisambiguationScore),
      schemaUsageRate: Math.round(schemaUsageRate * 100) / 100,
    },
  };
}

/**
 * Analyze a single page's technical layer against competitors
 */
export async function analyzePageTechnicalAgainstCompetitors(
  pageUrl: string,
  competitorUrls: Array<{ url: string; position: number }>,
  options: {
    skipCache?: boolean;
    pageContext?: string;
    jinaApiKey?: string;
    onProgress?: (stage: string, progress: number) => void;
  } = {}
): Promise<{
  page: TechnicalLayerAnalysis;
  competitors: CompetitorTechnicalAnalysisResult;
  gaps: {
    missingSchemaTypes: string[];
    entityLinkingGap: boolean;
    navigationIssues: string[];
    semanticTagsGap: string[];
  };
}> {
  // Analyze competitors first
  if (options.onProgress) {
    options.onProgress('Analyzing competitors', 0);
  }

  const competitors = await analyzeCompetitorTechnical(competitorUrls, {
    skipCache: options.skipCache,
    jinaApiKey: options.jinaApiKey,
    onProgress: (completed, total) => {
      if (options.onProgress) {
        options.onProgress('Analyzing competitors', (completed / total) * 50);
      }
    },
  });

  // Analyze the target page
  if (options.onProgress) {
    options.onProgress('Analyzing target page', 60);
  }

  const page = await analyzeTechnicalForUrl(pageUrl, {
    skipCache: options.skipCache,
    pageContext: options.pageContext,
    jinaApiKey: options.jinaApiKey,
  });

  // Calculate gaps
  if (options.onProgress) {
    options.onProgress('Calculating gaps', 90);
  }

  // Find missing schema types (types used by 50%+ of competitors but missing from page)
  const missingSchemaTypes = competitors.patterns.commonSchemaTypes
    .filter(st => st.coverage >= 0.5)
    .filter(st => !page.schema.schemaTypes.includes(st.type))
    .map(st => st.type);

  // Check entity linking gap
  const entityLinkingGap = page.schema.entityLinking.disambiguationScore <
    competitors.patterns.avgDisambiguationScore * 0.8;

  // Collect navigation issues
  const navigationIssues = page.navigationAnalysis.issues
    .filter(issue => issue.severity === 'critical' || issue.severity === 'warning')
    .map(issue => issue.description);

  // Check semantic tags gap
  const semanticTagsGap: string[] = [];
  const avgCompetitorTagUsage = {
    article: competitors.competitors.filter(c => c.semanticTags.hasArticle).length / (competitors.competitors.length || 1),
    main: competitors.competitors.filter(c => c.semanticTags.hasMain).length / (competitors.competitors.length || 1),
    nav: competitors.competitors.filter(c => c.semanticTags.hasNav).length / (competitors.competitors.length || 1),
    header: competitors.competitors.filter(c => c.semanticTags.hasHeader).length / (competitors.competitors.length || 1),
    footer: competitors.competitors.filter(c => c.semanticTags.hasFooter).length / (competitors.competitors.length || 1),
    aside: competitors.competitors.filter(c => c.semanticTags.hasAside).length / (competitors.competitors.length || 1),
  };

  if (avgCompetitorTagUsage.article >= 0.5 && !page.semanticTags.hasArticle) {
    semanticTagsGap.push('Missing <article> tag (used by 50%+ competitors)');
  }
  if (avgCompetitorTagUsage.main >= 0.5 && !page.semanticTags.hasMain) {
    semanticTagsGap.push('Missing <main> tag (used by 50%+ competitors)');
  }
  if (avgCompetitorTagUsage.aside >= 0.3 && !page.semanticTags.hasAside) {
    semanticTagsGap.push('Consider adding <aside> for supplementary content');
  }

  if (options.onProgress) {
    options.onProgress('Complete', 100);
  }

  return {
    page,
    competitors,
    gaps: {
      missingSchemaTypes,
      entityLinkingGap,
      navigationIssues,
      semanticTagsGap,
    },
  };
}

/**
 * Quick technical check for a URL without competitor comparison
 */
export async function quickTechnicalCheck(
  url: string,
  html?: string
): Promise<{
  hasSchema: boolean;
  schemaTypes: string[];
  disambiguationScore: number;
  hasEntityLinking: boolean;
  semanticTagsCount: number;
  quickScore: number;
}> {
  // If HTML not provided, we can't analyze (would need API key)
  if (!html) {
    throw new Error('HTML content required for quick technical check');
  }

  const schemaExtraction = extractSchemasFromHtml(html);
  const entityLinking = analyzeEntityLinking(html);
  const semanticTags = extractSemanticTags(html);

  const semanticTagsCount = [
    semanticTags.hasArticle,
    semanticTags.hasMain,
    semanticTags.hasNav,
    semanticTags.hasHeader,
    semanticTags.hasFooter,
    semanticTags.hasAside,
  ].filter(Boolean).length;

  // Calculate quick score
  let quickScore = 0;
  if (schemaExtraction.hasSchema) quickScore += 30;
  if (entityLinking.disambiguationScore >= 60) quickScore += 30;
  quickScore += semanticTagsCount * 5;
  quickScore += Math.min(10, schemaExtraction.schemaTypes.length * 2);

  return {
    hasSchema: schemaExtraction.hasSchema,
    schemaTypes: schemaExtraction.schemaTypes,
    disambiguationScore: entityLinking.disambiguationScore,
    hasEntityLinking: entityLinking.about.present || entityLinking.mentions.present,
    semanticTagsCount,
    quickScore: Math.min(100, quickScore),
  };
}

// =============================================================================
// Export
// =============================================================================

export default {
  analyzeTechnicalForUrl,
  analyzeCompetitorTechnical,
  analyzePageTechnicalAgainstCompetitors,
  quickTechnicalCheck,
};
