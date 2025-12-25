/**
 * Link Analysis Service (Link Layer Orchestrator)
 *
 * Orchestrates all link layer analysis components:
 * 1. Extract links from HTML
 * 2. Analyze link positions
 * 3. Analyze anchor text quality
 * 4. Analyze PageRank flow
 * 5. Analyze bridge topic justifications
 * 6. Return complete LinkLayerAnalysis
 *
 * Research Sources:
 * - linking in website.md - Internal linking strategy
 * - site-architecture.md - PageRank flow principles
 *
 * Created: December 25, 2024
 *
 * @module services/linkAnalysisService
 */

import {
  LinkLayerAnalysis,
  InternalLink,
  PlacementPatterns,
  AnchorTextQuality,
  PageRankFlowAnalysis,
  BridgeTopic,
} from '../types/competitiveIntelligence';

import { extractLinks, ExtractedLinkData, LinkExtractionResult } from './linkExtractor';
import { analyzeAllLinkPositions, PositionAnalysisSummary, detectDestinationType } from './linkPositionAnalyzer';
import { analyzeAnchorTextQuality } from './anchorTextQualityAnalyzer';
import { analyzePageRankFlow, classifyPageType } from './pageRankFlowAnalyzer';
import { analyzeBridgeTopics } from './bridgeJustificationAnalyzer';
import { extractPageContentWithHtml } from './jinaService';
import { cacheService } from './cacheService';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for link layer analysis
 */
export interface LinkAnalysisOptions {
  /** Skip Jina fetch and use provided HTML */
  providedHtml?: string;
  /** Skip cache and force fresh analysis */
  skipCache?: boolean;
  /** H1 of the page (for page type classification) */
  h1?: string;
  /** Content sample (for page type classification) */
  contentSample?: string;
  /** Jina API key (required if not providing HTML) */
  jinaApiKey?: string;
}

/**
 * Result of analyzing multiple competitors' link layers
 */
export interface CompetitorLinkAnalysisResult {
  competitors: LinkLayerAnalysis[];
  patterns: {
    avgInternalLinks: number;
    avgExternalLinks: number;
    avgAnchorQualityScore: number;
    avgPlacementScore: number;
    avgFlowScore: number;
    commonIssues: { issue: string; count: number }[];
  };
}

// =============================================================================
// Cache Configuration
// =============================================================================

const LINK_ANALYSIS_CACHE_TTL = 86400; // 24 hours

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
 * Convert extracted link to InternalLink type
 */
function toInternalLink(link: ExtractedLinkData, positionSummary: PositionAnalysisSummary): InternalLink {
  // Find position analysis for this link
  const analyzed = positionSummary.analyzedLinks.find(
    al => al.link.href === link.href && al.link.anchorText === link.anchorText
  );

  return {
    href: link.href,
    anchorText: link.anchorText,
    context: link.context.fullSentence,
    placement: link.location.type === 'nav' || link.location.type === 'header' || link.location.type === 'footer'
      ? link.location.type as 'nav' | 'footer'
      : link.location.type === 'sidebar'
        ? 'sidebar'
        : link.location.type === 'related'
          ? 'related-posts'
          : 'in-content',
    followStatus: link.isNofollow ? 'nofollow' : 'follow',
    isImage: link.isImageLink,
    position: analyzed?.position || {
      contentZone: link.location.zone,
      percentageThrough: link.location.percentageThrough,
      paragraphNumber: link.location.paragraphNumber,
      totalParagraphs: link.location.totalParagraphs,
      contentType: link.location.type === 'main' ? 'main' :
                   ['nav', 'header', 'footer'].includes(link.location.type) ? 'navigation' : 'supplementary',
      isOptimalPlacement: analyzed?.isOptimal || false,
      placementScore: analyzed?.position.placementScore || 50,
    },
  };
}

/**
 * Build placement patterns summary
 */
function buildPlacementPatterns(
  positionSummary: PositionAnalysisSummary
): PlacementPatterns {
  // Count core links by zone
  const coreLinks = positionSummary.analyzedLinks.filter(l => l.destinationType === 'core');
  const authorLinks = positionSummary.analyzedLinks.filter(l => l.destinationType === 'author');

  const corePlacements = {
    early: coreLinks.filter(l => l.position.contentZone === 'early').length,
    middle: coreLinks.filter(l => l.position.contentZone === 'middle').length,
    late: coreLinks.filter(l => l.position.contentZone === 'late').length,
    optimal: coreLinks.filter(l => l.isOptimal).length,
  };

  const authorPlacements = {
    early: authorLinks.filter(l => l.position.contentZone === 'early').length,
    middle: authorLinks.filter(l => l.position.contentZone === 'middle').length,
    late: authorLinks.filter(l => l.position.contentZone === 'late').length,
  };

  // Generate recommendations
  const recommendations: PlacementPatterns['recommendations'] = [];

  // Core links should be early
  if (corePlacements.late > corePlacements.early && coreLinks.length > 0) {
    recommendations.push({
      action: 'Move core topic links earlier in content',
      currentPlacement: 'late',
      suggestedPlacement: 'early',
      affectedLinks: coreLinks
        .filter(l => l.position.contentZone === 'late')
        .map(l => l.link.href),
    });
  }

  // Author links should be late
  if (authorPlacements.early > 0) {
    recommendations.push({
      action: 'Move author page links to end of content',
      currentPlacement: 'early',
      suggestedPlacement: 'late',
      affectedLinks: authorLinks
        .filter(l => l.position.contentZone === 'early')
        .map(l => l.link.href),
    });
  }

  return {
    coreLinksPlacements: corePlacements,
    authorLinksPlacements: authorPlacements,
    overallPlacementScore: positionSummary.overallPlacementScore,
    recommendations,
  };
}

/**
 * Calculate overall link score
 */
function calculateLinkScore(
  anchorQuality: AnchorTextQuality,
  pageRankFlow: PageRankFlowAnalysis,
  placementPatterns: PlacementPatterns
): number {
  // Weighted average
  const anchorWeight = 0.3;
  const flowWeight = 0.4;
  const placementWeight = 0.3;

  const score =
    (anchorQuality.scores.overall * anchorWeight) +
    (pageRankFlow.flowAnalysis.flowScore * flowWeight) +
    (placementPatterns.overallPlacementScore * placementWeight);

  return Math.round(Math.min(100, Math.max(0, score)));
}

// =============================================================================
// Core Analysis Functions
// =============================================================================

/**
 * Analyze link layer for a single URL
 */
export async function analyzeLinkLayerForUrl(
  url: string,
  options: LinkAnalysisOptions = {}
): Promise<LinkLayerAnalysis> {
  // Use cacheThrough for caching
  const fetchFn = async (): Promise<LinkLayerAnalysis> => {
    // Get HTML content
    let html: string;

    if (options.providedHtml) {
      html = options.providedHtml;
    } else {
      // Fetch via Jina with HTML
      if (!options.jinaApiKey) {
        throw new Error('Jina API key required to fetch HTML. Provide jinaApiKey or providedHtml.');
      }
      const jinaResult = await extractPageContentWithHtml(url, options.jinaApiKey);
      if (!jinaResult || !jinaResult.html) {
        throw new Error(`Failed to fetch HTML from ${url}`);
      }
      html = jinaResult.html;
    }

    // Extract H1 if not provided
    let h1 = options.h1;
    if (!h1) {
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      h1 = h1Match ? h1Match[1].trim() : undefined;
    }

    // Extract content sample if not provided
    let contentSample = options.contentSample;
    if (!contentSample) {
      // Extract first 500 chars of visible text
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        contentSample = bodyMatch[1]
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 500);
      }
    }

    // Extract links
    const extraction = extractLinks(html, url);

    // Analyze positions
    const positionSummary = analyzeAllLinkPositions(extraction.links);

    // Analyze anchor text quality
    const anchorQuality = analyzeAnchorTextQuality(extraction.links);

    // Analyze PageRank flow
    const pageRankFlow = analyzePageRankFlow(extraction.links, url, h1, contentSample);

    // Analyze bridge topics
    const bridgeTopics = analyzeBridgeTopics(extraction.links, url);

    // Build placement patterns
    const placementPatterns = buildPlacementPatterns(positionSummary);

    // Convert to internal links
    const internalLinks = extraction.internalLinks.map(l => toInternalLink(l, positionSummary));

    // Build external links summary
    const externalLinksSummary = extraction.externalLinks.map(l => ({
      href: l.href,
      anchorText: l.anchorText,
      nofollow: l.isNofollow,
    }));

    // Calculate overall score
    const linkScore = calculateLinkScore(anchorQuality, pageRankFlow, placementPatterns);

    return {
      url,
      domain: extractDomain(url),
      analyzedAt: new Date(),
      internal: {
        links: internalLinks,
        totalCount: extraction.internalLinks.length,
        uniqueTargets: extraction.uniqueInternalTargets,
        anchorTextQuality: anchorQuality,
      },
      external: {
        links: externalLinksSummary,
        totalCount: extraction.externalLinks.length,
      },
      pageRankFlow,
      bridgeTopics,
      placementPatterns,
      linkScore,
    };
  };

  // Skip cache if requested
  if (options.skipCache) {
    return fetchFn();
  }

  // Use cacheThrough
  return cacheService.cacheThrough(
    'link:analysis',
    { url },
    fetchFn,
    LINK_ANALYSIS_CACHE_TTL
  );
}

/**
 * Analyze link layer for multiple competitor URLs
 */
export async function analyzeCompetitorLinks(
  urls: Array<{ url: string; position: number }>,
  options: {
    skipCache?: boolean;
    jinaApiKey?: string;
    onProgress?: (completed: number, total: number, currentUrl: string) => void;
  } = {}
): Promise<CompetitorLinkAnalysisResult> {
  const analyses: LinkLayerAnalysis[] = [];
  const issueCounter = new Map<string, number>();

  for (let i = 0; i < urls.length; i++) {
    const { url } = urls[i];

    if (options.onProgress) {
      options.onProgress(i, urls.length, url);
    }

    try {
      const analysis = await analyzeLinkLayerForUrl(url, {
        skipCache: options.skipCache,
        jinaApiKey: options.jinaApiKey,
      });
      analyses.push(analysis);

      // Count issues
      for (const issue of analysis.internal.anchorTextQuality.issues) {
        const key = issue.description;
        issueCounter.set(key, (issueCounter.get(key) || 0) + 1);
      }
      for (const issue of analysis.pageRankFlow.flowAnalysis.issues) {
        const key = issue.issue;
        issueCounter.set(key, (issueCounter.get(key) || 0) + 1);
      }
    } catch (error) {
      console.error(`Failed to analyze link layer for ${url}:`, error);
    }

    // Rate limiting
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Calculate patterns
  const totalAnalyses = analyses.length || 1;

  const avgInternalLinks = analyses.reduce((sum, a) => sum + a.internal.totalCount, 0) / totalAnalyses;
  const avgExternalLinks = analyses.reduce((sum, a) => sum + a.external.totalCount, 0) / totalAnalyses;
  const avgAnchorQualityScore = analyses.reduce((sum, a) => sum + a.internal.anchorTextQuality.scores.overall, 0) / totalAnalyses;
  const avgPlacementScore = analyses.reduce((sum, a) => sum + a.placementPatterns.overallPlacementScore, 0) / totalAnalyses;
  const avgFlowScore = analyses.reduce((sum, a) => sum + a.pageRankFlow.flowAnalysis.flowScore, 0) / totalAnalyses;

  const commonIssues = Array.from(issueCounter.entries())
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (options.onProgress) {
    options.onProgress(urls.length, urls.length, 'Complete');
  }

  return {
    competitors: analyses,
    patterns: {
      avgInternalLinks: Math.round(avgInternalLinks),
      avgExternalLinks: Math.round(avgExternalLinks),
      avgAnchorQualityScore: Math.round(avgAnchorQualityScore),
      avgPlacementScore: Math.round(avgPlacementScore),
      avgFlowScore: Math.round(avgFlowScore),
      commonIssues,
    },
  };
}

/**
 * Analyze a page's link layer against competitors
 */
export async function analyzePageLinksAgainstCompetitors(
  pageUrl: string,
  competitorUrls: Array<{ url: string; position: number }>,
  options: {
    skipCache?: boolean;
    jinaApiKey?: string;
    onProgress?: (stage: string, progress: number) => void;
  } = {}
): Promise<{
  page: LinkLayerAnalysis;
  competitors: CompetitorLinkAnalysisResult;
  gaps: {
    anchorQualityGap: boolean;
    flowGap: boolean;
    placementGap: boolean;
    recommendations: string[];
  };
}> {
  // Analyze competitors first
  if (options.onProgress) {
    options.onProgress('Analyzing competitors', 0);
  }

  const competitors = await analyzeCompetitorLinks(competitorUrls, {
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

  const page = await analyzeLinkLayerForUrl(pageUrl, {
    skipCache: options.skipCache,
    jinaApiKey: options.jinaApiKey,
  });

  // Calculate gaps
  if (options.onProgress) {
    options.onProgress('Calculating gaps', 90);
  }

  const anchorQualityGap = page.internal.anchorTextQuality.scores.overall <
    competitors.patterns.avgAnchorQualityScore * 0.8;

  const flowGap = page.pageRankFlow.flowAnalysis.flowScore <
    competitors.patterns.avgFlowScore * 0.8;

  const placementGap = page.placementPatterns.overallPlacementScore <
    competitors.patterns.avgPlacementScore * 0.8;

  // Generate recommendations
  const recommendations: string[] = [];

  if (anchorQualityGap) {
    recommendations.push('Improve anchor text descriptiveness and reduce generic anchors');
    if (page.internal.anchorTextQuality.repetitionIssues.length > 0) {
      recommendations.push('Reduce anchor text repetition for same target links');
    }
  }

  if (flowGap) {
    recommendations.push(`Page type (${page.pageRankFlow.pageType}) may need link restructuring`);
    recommendations.push(page.pageRankFlow.strategicAssessment.recommendation);
  }

  if (placementGap) {
    for (const rec of page.placementPatterns.recommendations) {
      recommendations.push(rec.action);
    }
  }

  if (page.internal.totalCount < competitors.patterns.avgInternalLinks * 0.5) {
    recommendations.push(`Add more internal links (current: ${page.internal.totalCount}, avg: ${competitors.patterns.avgInternalLinks})`);
  }

  if (options.onProgress) {
    options.onProgress('Complete', 100);
  }

  return {
    page,
    competitors,
    gaps: {
      anchorQualityGap,
      flowGap,
      placementGap,
      recommendations,
    },
  };
}

/**
 * Quick link health check
 */
export function quickLinkHealthCheck(
  extraction: LinkExtractionResult
): {
  internalCount: number;
  externalCount: number;
  hasGenericAnchors: boolean;
  hasRepetitionIssues: boolean;
  healthScore: number;
} {
  const anchorQuality = analyzeAnchorTextQuality(extraction.links);

  return {
    internalCount: extraction.internalLinks.length,
    externalCount: extraction.externalLinks.length,
    hasGenericAnchors: anchorQuality.genericCount > 0,
    hasRepetitionIssues: anchorQuality.repetitionIssues.length > 0,
    healthScore: anchorQuality.scores.overall,
  };
}

// =============================================================================
// Export
// =============================================================================

export default {
  analyzeLinkLayerForUrl,
  analyzeCompetitorLinks,
  analyzePageLinksAgainstCompetitors,
  quickLinkHealthCheck,
};
