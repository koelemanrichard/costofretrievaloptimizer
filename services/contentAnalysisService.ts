/**
 * Content Analysis Orchestrator
 *
 * Orchestrates the complete content layer analysis for competitive intelligence:
 * 1. Fetch page content (via Jina)
 * 2. Extract EAVs (via existing EAV service)
 * 3. Classify attributes by competitor frequency
 * 4. Analyze central entity consistency
 * 5. Return complete ContentLayerAnalysis
 *
 * This service brings together:
 * - services/ai/attributeClassifier.ts (Task 1.1)
 * - services/ai/centralEntityAnalyzer.ts (Task 1.2)
 * - types/competitiveIntelligence.ts (Task 1.3)
 */

import { SemanticTriple, BusinessInfo } from '../types';
import {
  ContentLayerAnalysis,
  ClassifiedSemanticTriple,
} from '../types/competitiveIntelligence';

import {
  CompetitorEAVSource,
  classifyAllAttributes,
  calculateAttributeDistribution as calcDistribution,
  identifyAttributeGaps,
  enrichEavsWithRarity,
  AttributeClassificationResult,
  AttributeDistribution as ServiceAttributeDistribution,
} from './ai/attributeClassifier';

import {
  analyzeCentralEntityConsistency,
  parseHtmlContent,
  parseMarkdownContent,
  ParsedContent,
  CentralEntityAnalysis as ServiceCentralEntityAnalysis,
} from './ai/centralEntityAnalyzer';

import { extractPageContent } from './jinaService';
import { cacheService } from './cacheService';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for content analysis
 */
export interface ContentAnalysisOptions {
  /** Skip Jina fetch and use provided content */
  providedContent?: string;
  /** Content format if provided */
  contentFormat?: 'html' | 'markdown';
  /** Skip cache and force fresh analysis */
  skipCache?: boolean;
  /** Known central entity (skip detection) */
  centralEntity?: string;
  /** Competitor data for attribute classification */
  competitorEAVs?: CompetitorEAVSource[];
  /** Pre-computed market classification */
  marketClassification?: AttributeClassificationResult[];
  /** Jina API key (required if not providing content) */
  jinaApiKey?: string;
}

/**
 * Result of analyzing multiple competitors
 */
export interface CompetitorContentAnalysisResult {
  competitors: ContentLayerAnalysis[];
  marketClassification: AttributeClassificationResult[];
  patterns: {
    averageAttributeCount: number;
    commonAttributes: { attribute: string; coverage: number }[];
    averageCentralEntityScore: number;
  };
}

// =============================================================================
// Cache Configuration
// =============================================================================

const CONTENT_ANALYSIS_CACHE_TTL = 86400; // 24 hours

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
 * Extract EAVs from content
 * This is a simplified version - in production would use the full EAV extraction service
 */
async function extractEavsFromContent(
  content: ParsedContent,
  _businessInfo?: BusinessInfo
): Promise<SemanticTriple[]> {
  // For now, return a simplified extraction based on content structure
  // In production, this would call the full AI-powered EAV extraction
  const eavs: SemanticTriple[] = [];

  // Extract entity from H1
  const entity = content.h1 || 'Topic';

  // Create EAVs from H2 headings as attributes
  for (const h2 of content.h2s) {
    eavs.push({
      subject: { label: entity, type: 'Topic' },
      predicate: { relation: h2.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_'), type: 'Property' },
      object: { value: 'covered', type: 'String' },
    });
  }

  // In production, we would call:
  // return extractEavs(content.fullText, businessInfo);

  return eavs;
}

/**
 * Convert service distribution to types distribution
 */
function toTypesDistribution(dist: ServiceAttributeDistribution): ContentLayerAnalysis['attributeDistribution'] {
  return {
    root: dist.root,
    rare: dist.rare,
    unique: dist.unique,
    total: dist.total,
    rootCoverage: dist.rootCoverage,
    rareCoverage: dist.rareCoverage,
    uniqueAdvantage: dist.details
      .filter(d => d.rarity === 'unique')
      .map(d => d.attribute),
  };
}

/**
 * Convert service central entity analysis to types format
 */
function toTypesCentralEntityAnalysis(analysis: ServiceCentralEntityAnalysis): ContentLayerAnalysis['centralEntityAnalysis'] {
  return {
    detectedEntity: {
      name: analysis.detectedEntity.name,
      confidence: analysis.detectedEntity.confidence,
      sources: analysis.detectedEntity.sources,
    },
    consistency: {
      inH1: analysis.consistency.inH1,
      inTitle: analysis.consistency.inTitle,
      inIntroduction: analysis.consistency.inIntroduction,
      inSchema: analysis.consistency.inSchema,
      headingPresence: analysis.consistency.headingPresence,
      bodyPresence: analysis.consistency.bodyPresence,
      entityNGrams: analysis.consistency.entityNGrams,
    },
    contextualVector: {
      isConsistent: analysis.contextualVector.isConsistent,
      driftPoints: analysis.contextualVector.driftPoints.map(dp => ({
        position: dp.position,
        driftedTo: dp.driftedTo,
        severity: dp.severity,
      })),
      vectorScore: analysis.contextualVector.vectorScore,
    },
    consistencyScore: analysis.consistencyScore,
    issues: analysis.issues.map(issue => ({
      issue: issue.issue as ContentLayerAnalysis['centralEntityAnalysis']['issues'][0]['issue'],
      severity: issue.severity,
      description: issue.description,
      location: issue.location,
    })),
  };
}

// =============================================================================
// Core Analysis Functions
// =============================================================================

/**
 * Analyze content for a single URL
 */
export async function analyzeContentForUrl(
  url: string,
  options: ContentAnalysisOptions = {}
): Promise<ContentLayerAnalysis> {
  // Use cacheThrough for caching
  const fetchFn = async (): Promise<ContentLayerAnalysis> => {
    // Get content
    let parsedContent: ParsedContent;

    if (options.providedContent) {
      parsedContent = options.contentFormat === 'html'
        ? parseHtmlContent(options.providedContent)
        : parseMarkdownContent(options.providedContent);
    } else {
      // Fetch via Jina
      if (!options.jinaApiKey) {
        throw new Error('Jina API key required to fetch content. Provide jinaApiKey or providedContent.');
      }
      const jinaResult = await extractPageContent(url, options.jinaApiKey);
      if (!jinaResult || !jinaResult.content) {
        throw new Error(`Failed to fetch content from ${url}`);
      }
      parsedContent = parseMarkdownContent(jinaResult.content);
    }

    // Extract EAVs
    const eavs = await extractEavsFromContent(parsedContent);

    // Classify EAVs if competitor data available
    let classifiedEavs: ClassifiedSemanticTriple[] = eavs;
    let attributeDistribution: ContentLayerAnalysis['attributeDistribution'];

    if (options.marketClassification) {
      classifiedEavs = enrichEavsWithRarity(eavs, options.marketClassification);
      const serviceDist = calcDistribution(eavs, options.marketClassification);
      attributeDistribution = toTypesDistribution(serviceDist);
    } else if (options.competitorEAVs && options.competitorEAVs.length > 0) {
      const marketClassification = classifyAllAttributes(options.competitorEAVs);
      classifiedEavs = enrichEavsWithRarity(eavs, marketClassification);
      const serviceDist = calcDistribution(eavs, marketClassification);
      attributeDistribution = toTypesDistribution(serviceDist);
    } else {
      // No competitor data - cannot classify by frequency
      attributeDistribution = {
        root: 0,
        rare: 0,
        unique: eavs.length,
        total: eavs.length,
        rootCoverage: 0,
        rareCoverage: 0,
        uniqueAdvantage: [],
      };
    }

    // Analyze central entity
    const serviceEntityAnalysis = analyzeCentralEntityConsistency(
      parsedContent,
      options.centralEntity
    );
    const centralEntityAnalysis = toTypesCentralEntityAnalysis(serviceEntityAnalysis);

    // Calculate overall content score
    const contentScore = calculateContentScore(attributeDistribution, centralEntityAnalysis);

    return {
      url,
      domain: extractDomain(url),
      analyzedAt: new Date(),
      eavTriples: classifiedEavs,
      attributeDistribution,
      centralEntityAnalysis,
      contentScore,
    };
  };

  // Skip cache if requested
  if (options.skipCache) {
    return fetchFn();
  }

  // Use cacheThrough
  return cacheService.cacheThrough(
    'content:analysis',
    { url, centralEntity: options.centralEntity },
    fetchFn,
    CONTENT_ANALYSIS_CACHE_TTL
  );
}

/**
 * Calculate overall content score from components
 */
function calculateContentScore(
  distribution: ContentLayerAnalysis['attributeDistribution'],
  entityAnalysis: ContentLayerAnalysis['centralEntityAnalysis']
): number {
  let score = 0;

  // Attribute coverage (40 points max)
  score += Math.min(40, distribution.rootCoverage * 0.3 + distribution.rareCoverage * 0.1);

  // Central entity consistency (60 points max)
  score += entityAnalysis.consistencyScore * 0.6;

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Analyze content for multiple competitor URLs
 */
export async function analyzeCompetitorContent(
  urls: Array<{ url: string; position: number }>,
  options: {
    skipCache?: boolean;
    jinaApiKey?: string;
    onProgress?: (completed: number, total: number, currentUrl: string) => void;
  } = {}
): Promise<CompetitorContentAnalysisResult> {
  const analyses: ContentLayerAnalysis[] = [];
  const allEavSources: CompetitorEAVSource[] = [];

  // First pass: Fetch and extract EAVs from all competitors
  for (let i = 0; i < urls.length; i++) {
    const { url, position } = urls[i];

    if (options.onProgress) {
      options.onProgress(i, urls.length, url);
    }

    try {
      if (!options.jinaApiKey) {
        throw new Error('Jina API key required to fetch competitor content');
      }
      const jinaResult = await extractPageContent(url, options.jinaApiKey);
      if (!jinaResult?.content) continue;

      const parsedContent = parseMarkdownContent(jinaResult.content);
      const eavs = await extractEavsFromContent(parsedContent);

      allEavSources.push({
        url,
        domain: extractDomain(url),
        position,
        eavs,
      });
    } catch (error) {
      console.error(`Failed to fetch content from ${url}:`, error);
    }

    // Rate limiting
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Compute market classification from all competitors
  const marketClassification = classifyAllAttributes(allEavSources);

  // Second pass: Full analysis with classification
  for (const source of allEavSources) {
    try {
      const analysis = await analyzeContentForUrl(source.url, {
        skipCache: options.skipCache,
        marketClassification,
      });
      analyses.push(analysis);
    } catch (error) {
      console.error(`Failed to analyze ${source.url}:`, error);
    }
  }

  // Compute patterns
  const avgAttributeCount = analyses.length > 0
    ? analyses.reduce((sum, a) => sum + a.eavTriples.length, 0) / analyses.length
    : 0;
  const avgCentralEntityScore = analyses.length > 0
    ? analyses.reduce((sum, a) => sum + a.centralEntityAnalysis.consistencyScore, 0) / analyses.length
    : 0;

  // Find common attributes (covered by 50%+ of competitors)
  const commonAttributes = marketClassification
    .filter(c => c.competitorPercentage >= 0.5)
    .sort((a, b) => b.competitorPercentage - a.competitorPercentage)
    .slice(0, 10)
    .map(c => ({
      attribute: c.attribute,
      coverage: c.competitorPercentage,
    }));

  if (options.onProgress) {
    options.onProgress(urls.length, urls.length, 'Complete');
  }

  return {
    competitors: analyses,
    marketClassification,
    patterns: {
      averageAttributeCount: Math.round(avgAttributeCount),
      commonAttributes,
      averageCentralEntityScore: Math.round(avgCentralEntityScore),
    },
  };
}

/**
 * Analyze a single page against competitors
 */
export async function analyzePageAgainstCompetitors(
  pageUrl: string,
  competitorUrls: Array<{ url: string; position: number }>,
  options: {
    skipCache?: boolean;
    centralEntity?: string;
    jinaApiKey?: string;
    onProgress?: (stage: string, progress: number) => void;
  } = {}
): Promise<{
  page: ContentLayerAnalysis;
  competitors: CompetitorContentAnalysisResult;
  gaps: ReturnType<typeof identifyAttributeGaps>;
}> {
  // Analyze competitors first to get market classification
  if (options.onProgress) {
    options.onProgress('Analyzing competitors', 0);
  }

  const competitors = await analyzeCompetitorContent(competitorUrls, {
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

  const page = await analyzeContentForUrl(pageUrl, {
    skipCache: options.skipCache,
    centralEntity: options.centralEntity,
    jinaApiKey: options.jinaApiKey,
    marketClassification: competitors.marketClassification,
  });

  // Calculate gaps
  if (options.onProgress) {
    options.onProgress('Calculating gaps', 90);
  }

  const gaps = identifyAttributeGaps(page.eavTriples, competitors.marketClassification);

  if (options.onProgress) {
    options.onProgress('Complete', 100);
  }

  return {
    page,
    competitors,
    gaps,
  };
}

// =============================================================================
// Export
// =============================================================================

export default {
  analyzeContentForUrl,
  analyzeCompetitorContent,
  analyzePageAgainstCompetitors,
};
