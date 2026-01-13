/**
 * Holistic Competitor Analyzer Service
 *
 * Master orchestrator that combines all three layers of analysis:
 * 1. SERP data (fast or deep mode)
 * 2. Content Layer (EAV classification, Central Entity)
 * 3. Technical Layer (Schema, Navigation)
 * 4. Link Layer (PageRank flow, Anchor quality, Bridge justification)
 *
 * Returns comprehensive competitive intelligence for a topic.
 *
 * Created: December 25, 2024
 *
 * @module services/holisticCompetitorAnalyzer
 */

import {
  TopicSerpIntelligence,
  CompetitorAnalysis,
  ComprehensiveGapAnalysis,
  ContentLayerAnalysis,
  TechnicalLayerAnalysis,
  LinkLayerAnalysis,
  AttributeGapAnalysis,
} from '../types/competitiveIntelligence';
import { BusinessInfo } from '../types';

import { analyzeSerpForTopic, SerpMode, SerpAnalysisResult } from './serpService';
import { FullSerpResult } from './serpApiService';
import { analyzeContentForUrl, ContentAnalysisOptions } from './contentAnalysisService';
import { analyzeTechnicalForUrl, TechnicalAnalysisOptions } from './technicalLayerService';
import { analyzeLinkLayerForUrl, LinkAnalysisOptions } from './linkAnalysisService';
import { identifyAttributeGaps, classifyAllAttributes, CompetitorEAVSource } from './ai/attributeClassifier';
import { cacheService } from './cacheService';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for holistic competitor analysis
 */
export interface HolisticAnalysisOptions {
  /** SERP analysis mode */
  mode: SerpMode;
  /** Business info with all credentials and settings */
  businessInfo: BusinessInfo;
  /** Skip cache */
  skipCache?: boolean;
  /** Number of competitors to analyze (default: 5) */
  competitorLimit?: number;
  /** Progress callback */
  onProgress?: (stage: string, progress: number, detail?: string) => void;
}

/**
 * Analysis result for a single topic
 */
export interface TopicAnalysisResult {
  intelligence: TopicSerpIntelligence;
  success: boolean;
  error?: string;
  analysisTime: number;
}

// =============================================================================
// Cache Configuration
// =============================================================================

const HOLISTIC_CACHE_TTL = 86400; // 24 hours

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
 * Calculate overall competitor score
 */
function calculateOverallScore(
  content: ContentLayerAnalysis,
  technical: TechnicalLayerAnalysis,
  links: LinkLayerAnalysis
): number {
  // Weighted average of all three layers
  const contentWeight = 0.4;
  const technicalWeight = 0.25;
  const linkWeight = 0.35;

  return Math.round(
    (content.contentScore * contentWeight) +
    (technical.technicalScore * technicalWeight) +
    (links.linkScore * linkWeight)
  );
}

/**
 * Identify competitor strengths
 */
function identifyStrengths(
  content: ContentLayerAnalysis,
  technical: TechnicalLayerAnalysis,
  links: LinkLayerAnalysis
): string[] {
  const strengths: string[] = [];

  // Content strengths
  if (content.contentScore >= 80) {
    strengths.push('Strong content organization and entity consistency');
  }
  if (content.attributeDistribution.rootCoverage >= 90) {
    strengths.push('Comprehensive coverage of root attributes');
  }
  if (content.attributeDistribution.unique > 0) {
    strengths.push(`${content.attributeDistribution.unique} unique differentiating attributes`);
  }

  // Technical strengths
  if (technical.technicalScore >= 80) {
    strengths.push('Excellent technical SEO implementation');
  }
  if (technical.schema.entityLinking.disambiguationScore >= 80) {
    strengths.push('Strong entity disambiguation with Wikidata linking');
  }
  if (technical.navigationAnalysis.navigationScore >= 80) {
    strengths.push('Optimized navigation structure');
  }

  // Link strengths
  if (links.linkScore >= 80) {
    strengths.push('Strong internal linking strategy');
  }
  if (links.pageRankFlow.flowAnalysis.flowScore >= 80) {
    strengths.push('Optimal PageRank flow direction');
  }
  if (links.internal.anchorTextQuality.scores.overall >= 80) {
    strengths.push('High-quality anchor text usage');
  }

  return strengths;
}

/**
 * Identify competitor weaknesses
 */
function identifyWeaknesses(
  content: ContentLayerAnalysis,
  technical: TechnicalLayerAnalysis,
  links: LinkLayerAnalysis
): string[] {
  const weaknesses: string[] = [];

  // Content weaknesses
  if (content.centralEntityAnalysis.consistencyScore < 60) {
    weaknesses.push('Poor central entity consistency');
  }
  if (content.attributeDistribution.rootCoverage < 70) {
    weaknesses.push('Missing key root attributes');
  }

  // Technical weaknesses
  if (!technical.schema.hasSchema) {
    weaknesses.push('No structured data markup');
  } else if (technical.schema.entityLinking.disambiguationScore < 40) {
    weaknesses.push('Weak entity linking in schema');
  }
  if (technical.navigationAnalysis.issues.length > 0) {
    weaknesses.push(`Navigation issues: ${technical.navigationAnalysis.issues.length}`);
  }

  // Link weaknesses
  if (links.internal.anchorTextQuality.scores.overall < 50) {
    weaknesses.push('Poor anchor text quality');
  }
  if (links.pageRankFlow.flowAnalysis.flowDirection === 'reversed') {
    weaknesses.push('Reversed PageRank flow');
  }
  if (links.internal.anchorTextQuality.repetitionIssues.length > 0) {
    weaknesses.push('Anchor text repetition issues');
  }

  return weaknesses;
}

/**
 * Aggregate patterns across competitors
 */
function aggregatePatterns(
  competitors: CompetitorAnalysis[]
): TopicSerpIntelligence['patterns'] {
  if (competitors.length === 0) {
    return {
      dominantContentType: 'unknown',
      avgWordCount: 0,
      commonSchemaTypes: [],
      topAttributes: [],
    };
  }

  // Detect dominant content type from URLs/content
  const contentTypes = competitors.map(c => {
    const url = c.url.toLowerCase();
    if (url.includes('guide') || url.includes('tutorial')) return 'guide';
    if (url.includes('how-to')) return 'how-to';
    if (url.includes('review')) return 'review';
    if (url.includes('comparison') || url.includes('vs')) return 'comparison';
    if (url.includes('best') || url.includes('top')) return 'listicle';
    return 'article';
  });

  const typeCounts = contentTypes.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dominantContentType = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'article';

  // Average word count - use actual word count if available, otherwise estimate from EAVs
  const wordCounts = competitors.map(c => {
    // Prefer actual word count from ContentLayerAnalysis
    if (c.content.wordCount && c.content.wordCount > 0) {
      return c.content.wordCount;
    }
    // Fallback: estimate from EAV count (50 words per EAV as rough estimate)
    return c.content.eavTriples.length * 50;
  });
  const avgWordCount = Math.round(
    wordCounts.reduce((sum, wc) => sum + wc, 0) / wordCounts.length
  );

  // Common schema types
  const schemaTypeCounts: Record<string, number> = {};
  for (const c of competitors) {
    for (const type of c.technical.schema.schemaTypes) {
      schemaTypeCounts[type] = (schemaTypeCounts[type] || 0) + 1;
    }
  }

  const commonSchemaTypes = Object.entries(schemaTypeCounts)
    .filter(([_, count]) => count >= competitors.length * 0.5)
    .map(([type]) => type);

  // Top attributes
  const attributeCounts: Record<string, number> = {};
  for (const c of competitors) {
    for (const eav of c.content.eavTriples) {
      const attr = eav.predicate.relation;
      attributeCounts[attr] = (attributeCounts[attr] || 0) + 1;
    }
  }

  const topAttributes = Object.entries(attributeCounts)
    .map(([attribute, count]) => ({
      attribute,
      coverage: count / competitors.length,
    }))
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, 10);

  return {
    dominantContentType,
    avgWordCount,
    commonSchemaTypes,
    topAttributes,
  };
}

/**
 * Generate comprehensive gap analysis
 *
 * NOTE: This is PRE-CONTENT analysis - user hasn't created content yet.
 * The "gaps" represent:
 * - Root attributes: What you MUST cover (70%+ competitors have these)
 * - Rare attributes: Authority opportunities (20-69% have these)
 * - Unique opportunities: Differentiation potential (under-covered in market)
 * - Technical/Link gaps: Competitor weaknesses you can exploit
 */
function generateGapAnalysis(
  competitors: CompetitorAnalysis[],
  marketClassification: ReturnType<typeof classifyAllAttributes>
): ComprehensiveGapAnalysis {
  // Attribute analysis - since user has no content yet, show what market covers
  const attributeGaps: AttributeGapAnalysis = {
    missingRoot: [],
    missingRare: [],
    uniqueOpportunities: [],
  };

  // ROOT attributes (70%+ competitors have these) - MUST cover these
  for (const attr of marketClassification.filter(a => a.rarity === 'root')) {
    attributeGaps.missingRoot.push({
      attribute: attr.attribute,
      competitorsCovering: Math.round(attr.competitorPercentage * competitors.length),
      priority: 'critical',
      example: attr.examples[0]?.value || 'N/A',
    });
  }

  // RARE attributes (20-69% have these) - Authority signals
  for (const attr of marketClassification.filter(a => a.rarity === 'rare')) {
    attributeGaps.missingRare.push({
      attribute: attr.attribute,
      competitorsCovering: Math.round(attr.competitorPercentage * competitors.length),
      priority: 'high',
      example: attr.examples[0]?.value || 'N/A',
    });
  }

  // UNIQUE opportunities (attributes only 1-2 competitors cover - differentiation potential)
  for (const attr of marketClassification.filter(a => a.rarity === 'unique')) {
    attributeGaps.uniqueOpportunities.push({
      attribute: attr.attribute,
      noCompetitorHas: attr.competitorCount === 0,
      potentialValue: attr.examples[0]?.value || 'Differentiation opportunity',
      priority: 'medium',
    });
  }

  // Technical gaps - analyze competitor weaknesses
  const technicalGaps = {
    missingSchemaTypes: [] as string[],
    entityLinkingGap: false,
    navigationIssues: [] as string[],
  };

  // Find schema types used by most competitors (you should have these)
  const schemaTypeCounts: Record<string, number> = {};
  for (const c of competitors) {
    for (const type of c.technical.schema.schemaTypes) {
      schemaTypeCounts[type] = (schemaTypeCounts[type] || 0) + 1;
    }
  }

  // Types used by 50%+ are expected - list them as requirements
  for (const [type, count] of Object.entries(schemaTypeCounts)) {
    if (count >= competitors.length * 0.5) {
      technicalGaps.missingSchemaTypes.push(type);
    }
  }

  // Entity linking analysis - if competitors are weak, it's an opportunity
  const avgDisambiguation = competitors.reduce(
    (sum, c) => sum + c.technical.schema.entityLinking.disambiguationScore, 0
  ) / (competitors.length || 1);

  // If avg < 50, competitors are weak at entity linking - opportunity!
  technicalGaps.entityLinkingGap = avgDisambiguation < 50;

  // Collect navigation issues across competitors
  const navIssueSet = new Set<string>();
  for (const c of competitors) {
    for (const issue of c.technical.navigationAnalysis.issues) {
      navIssueSet.add(issue.description);
    }
  }
  technicalGaps.navigationIssues = Array.from(navIssueSet);

  // Link gaps - competitor weaknesses = your opportunities
  const linkGaps = {
    flowIssues: [] as string[],
    anchorQualityIssues: [] as string[],
    bridgeOpportunities: [] as string[],
  };

  // Collect flow issues from competitors
  const flowIssueSet = new Set<string>();
  for (const c of competitors) {
    for (const issue of c.links.pageRankFlow.flowAnalysis.issues) {
      flowIssueSet.add(issue.issue);
    }
  }
  linkGaps.flowIssues = Array.from(flowIssueSet);

  // Collect anchor text quality issues from competitors
  const anchorIssueSet = new Set<string>();
  for (const c of competitors) {
    for (const issue of c.links.internal.anchorTextQuality.issues) {
      anchorIssueSet.add(issue.description);
    }
    // Also flag if competitors have generic anchors or repetition
    if (c.links.internal.anchorTextQuality.genericCount > 3) {
      anchorIssueSet.add('Excessive generic anchor text');
    }
    if (c.links.internal.anchorTextQuality.repetitionIssues.length > 0) {
      anchorIssueSet.add('Anchor text repetition issues');
    }
  }
  linkGaps.anchorQualityIssues = Array.from(anchorIssueSet);

  // Identify bridge topic opportunities (topics competitors link to poorly)
  const bridgeSet = new Set<string>();
  for (const c of competitors) {
    for (const bridge of c.links.bridgeTopics) {
      if (!bridge.justification.isJustified) {
        bridgeSet.add(`Improve bridge to: ${bridge.topic}`);
      }
    }
    // Check for placement recommendations
    for (const rec of c.links.placementPatterns.recommendations) {
      bridgeSet.add(rec.action);
    }
  }
  linkGaps.bridgeOpportunities = Array.from(bridgeSet);

  // Priority actions based on analysis
  const priorityActions: ComprehensiveGapAnalysis['priorityActions'] = [];

  // Content actions
  if (attributeGaps.missingRoot.length > 0) {
    priorityActions.push({
      action: `Cover ${attributeGaps.missingRoot.length} root attributes that competitors consistently include`,
      category: 'content',
      priority: 'critical',
      expectedImpact: 'Match baseline competitor content coverage',
    });
  }

  if (attributeGaps.missingRare.length > 0) {
    priorityActions.push({
      action: `Include ${attributeGaps.missingRare.length} rare attributes for authority signals`,
      category: 'content',
      priority: 'high',
      expectedImpact: 'Demonstrate expertise beyond basic coverage',
    });
  }

  if (attributeGaps.uniqueOpportunities.length > 0) {
    priorityActions.push({
      action: `Explore ${attributeGaps.uniqueOpportunities.length} unique differentiation opportunities`,
      category: 'content',
      priority: 'medium',
      expectedImpact: 'Stand out from competitor content',
    });
  }

  // Technical actions
  if (technicalGaps.entityLinkingGap) {
    priorityActions.push({
      action: 'Add Wikidata entity linking - competitors are weak here',
      category: 'technical',
      priority: 'high',
      expectedImpact: 'Gain advantage in entity disambiguation',
    });
  }

  if (technicalGaps.missingSchemaTypes.length > 0) {
    priorityActions.push({
      action: `Implement ${technicalGaps.missingSchemaTypes.join(', ')} schema types`,
      category: 'technical',
      priority: 'high',
      expectedImpact: 'Match competitor structured data coverage',
    });
  }

  if (technicalGaps.navigationIssues.length > 0) {
    priorityActions.push({
      action: `Avoid competitor navigation mistakes (${technicalGaps.navigationIssues.length} common issues found)`,
      category: 'technical',
      priority: 'medium',
      expectedImpact: 'Better user experience and crawlability',
    });
  }

  // Link actions
  if (linkGaps.anchorQualityIssues.length > 0) {
    priorityActions.push({
      action: `Use better anchor text - competitors have ${linkGaps.anchorQualityIssues.length} common issues`,
      category: 'links',
      priority: 'high',
      expectedImpact: 'Clearer topical signals to search engines',
    });
  }

  if (linkGaps.flowIssues.length > 0) {
    priorityActions.push({
      action: `Optimize PageRank flow - avoid ${linkGaps.flowIssues.length} competitor mistakes`,
      category: 'links',
      priority: 'medium',
      expectedImpact: 'Better link equity distribution',
    });
  }

  return {
    attributes: attributeGaps,
    technical: technicalGaps,
    links: linkGaps,
    priorityActions,
  };
}

/**
 * Calculate opportunity scores
 *
 * Scores represent how much OPPORTUNITY exists to beat competitors:
 * - High score = Competitors are weak in this area, easier to beat
 * - Low score = Competitors are strong, harder to differentiate
 */
function calculateScores(
  competitors: CompetitorAnalysis[],
  gaps: ComprehensiveGapAnalysis
): TopicSerpIntelligence['scores'] {
  // Content opportunity based on:
  // 1. Market diversity (more rare/unique attributes = more differentiation potential)
  // 2. Competitor content quality weaknesses
  const rareCount = gaps.attributes.missingRare.length;
  const uniqueCount = gaps.attributes.uniqueOpportunities.length;

  // Calculate avg competitor content score - lower = more opportunity
  const avgContentScore = competitors.length > 0
    ? competitors.reduce((sum, c) => sum + c.content.contentScore, 0) / competitors.length
    : 50;

  // Content opportunity: rare attributes + unique opportunities + inverse of competitor strength
  const contentOpportunity = Math.min(100, Math.max(0,
    (rareCount * 8) +                           // Each rare attribute = 8 points
    (uniqueCount * 12) +                        // Each unique opportunity = 12 points
    Math.max(0, (100 - avgContentScore) * 0.3)  // Weaker competitors = more opportunity
  ));

  // Technical opportunity based on competitor technical weaknesses
  const avgTechScore = competitors.length > 0
    ? competitors.reduce((sum, c) => sum + c.technical.technicalScore, 0) / competitors.length
    : 50;

  const technicalOpportunity = Math.min(100, Math.max(0,
    (gaps.technical.entityLinkingGap ? 35 : 0) +           // Entity linking weakness = 35 pts
    (gaps.technical.navigationIssues.length * 10) +         // Each nav issue = 10 pts
    Math.max(0, (100 - avgTechScore) * 0.4)                 // Weaker tech = more opportunity
  ));

  // Link opportunity based on competitor linking weaknesses
  const avgLinkScore = competitors.length > 0
    ? competitors.reduce((sum, c) => sum + c.links.linkScore, 0) / competitors.length
    : 50;

  const linkOpportunity = Math.min(100, Math.max(0,
    (gaps.links.flowIssues.length * 15) +                   // Each flow issue = 15 pts
    (gaps.links.anchorQualityIssues.length * 12) +          // Each anchor issue = 12 pts
    (gaps.links.bridgeOpportunities.length * 8) +           // Each bridge opportunity = 8 pts
    Math.max(0, (100 - avgLinkScore) * 0.3)                 // Weaker links = more opportunity
  ));

  // Overall difficulty = how strong competitors are overall (higher = harder to beat)
  const avgCompetitorScore = competitors.length > 0
    ? competitors.reduce((sum, c) => sum + c.overallScore, 0) / competitors.length
    : 50;
  const overallDifficulty = Math.round(avgCompetitorScore);

  return {
    contentOpportunity: Math.round(contentOpportunity),
    technicalOpportunity: Math.round(technicalOpportunity),
    linkOpportunity: Math.round(linkOpportunity),
    overallDifficulty,
  };
}

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Perform holistic competitor analysis for a topic
 */
export async function analyzeTopicCompetitors(
  topic: string,
  options: HolisticAnalysisOptions
): Promise<TopicAnalysisResult> {
  const startTime = Date.now();

  try {
    // Report progress
    const reportProgress = (stage: string, progress: number, detail?: string) => {
      if (options.onProgress) {
        options.onProgress(stage, progress, detail);
      }
    };

    reportProgress('Starting analysis', 0, topic);

    // Step 1: Get SERP data
    reportProgress('Fetching SERP data', 5);

    const serpResult = await analyzeSerpForTopic(topic, options.mode, options.businessInfo);

    // Extract competitor URLs
    let competitorUrls: Array<{ url: string; position: number }> = [];

    if (serpResult.mode === 'deep' && 'organicResults' in serpResult.data) {
      const fullSerp = serpResult.data as FullSerpResult;
      competitorUrls = fullSerp.organicResults
        .slice(0, options.competitorLimit || 5)
        .map(r => ({ url: r.url, position: r.position }));
    } else {
      // Fast mode - use estimated domains
      // For now, return with limited data
      reportProgress('Complete', 100);

      return {
        intelligence: {
          topic,
          analyzedAt: new Date(),
          mode: options.mode,
          serp: {
            totalResults: 0,
            features: [],
            topCompetitors: [],
          },
          competitors: [],
          patterns: {
            dominantContentType: 'unknown',
            avgWordCount: 0,
            commonSchemaTypes: [],
            topAttributes: [],
          },
          gaps: {
            attributes: { missingRoot: [], missingRare: [], uniqueOpportunities: [] },
            technical: { missingSchemaTypes: [], entityLinkingGap: false, navigationIssues: [] },
            links: { flowIssues: [], anchorQualityIssues: [], bridgeOpportunities: [] },
            priorityActions: [],
          },
          scores: { contentOpportunity: 0, technicalOpportunity: 0, linkOpportunity: 0, overallDifficulty: 50 },
        },
        success: true,
        analysisTime: Date.now() - startTime,
      };
    }

    // Step 2: Analyze each competitor
    const competitors: CompetitorAnalysis[] = [];
    const eavSources: CompetitorEAVSource[] = [];

    for (let i = 0; i < competitorUrls.length; i++) {
      const { url, position } = competitorUrls[i];
      const progress = 10 + (i / competitorUrls.length) * 70;

      reportProgress('Analyzing competitor', progress, url);

      try {
        // Analyze all three layers in parallel
        const [content, technical, links] = await Promise.all([
          analyzeContentForUrl(url, {
            skipCache: options.skipCache,
            jinaApiKey: options.businessInfo.jinaApiKey,
            firecrawlApiKey: options.businessInfo.firecrawlApiKey,
            supabaseUrl: options.businessInfo.supabaseUrl,
            supabaseAnonKey: options.businessInfo.supabaseAnonKey,
          }),
          analyzeTechnicalForUrl(url, {
            skipCache: options.skipCache,
            jinaApiKey: options.businessInfo.jinaApiKey,
            firecrawlApiKey: options.businessInfo.firecrawlApiKey,
            supabaseUrl: options.businessInfo.supabaseUrl,
            supabaseAnonKey: options.businessInfo.supabaseAnonKey,
          }),
          analyzeLinkLayerForUrl(url, {
            skipCache: options.skipCache,
            jinaApiKey: options.businessInfo.jinaApiKey,
            firecrawlApiKey: options.businessInfo.firecrawlApiKey,
            supabaseUrl: options.businessInfo.supabaseUrl,
            supabaseAnonKey: options.businessInfo.supabaseAnonKey,
          }),
        ]);

        // Calculate scores
        const overallScore = calculateOverallScore(content, technical, links);
        const strengths = identifyStrengths(content, technical, links);
        const weaknesses = identifyWeaknesses(content, technical, links);

        competitors.push({
          url,
          domain: extractDomain(url),
          position,
          analyzedAt: new Date(),
          content,
          technical,
          links,
          overallScore,
          strengths,
          weaknesses,
        });

        // Collect EAV sources for classification
        eavSources.push({
          url,
          domain: extractDomain(url),
          position,
          eavs: content.eavTriples,
        });
      } catch (error) {
        console.error(`Failed to analyze competitor ${url}:`, error);
      }

      // Rate limiting between competitors
      if (i < competitorUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Step 3: Aggregate and analyze
    reportProgress('Aggregating patterns', 85);

    // Classify all attributes across competitors
    const marketClassification = classifyAllAttributes(eavSources);

    // Aggregate patterns
    const patterns = aggregatePatterns(competitors);

    // Generate gap analysis
    const gaps = generateGapAnalysis(competitors, marketClassification);

    // Calculate scores
    const scores = calculateScores(competitors, gaps);

    // Build SERP summary
    const fullSerp = serpResult.data as FullSerpResult;
    const serpSummary = {
      totalResults: fullSerp.totalResults,
      features: Object.entries(fullSerp.features)
        .filter(([_, has]) => has === true)
        .map(([feature]) => feature),
      topCompetitors: fullSerp.organicResults.slice(0, 10).map(r => ({
        position: r.position,
        url: r.url,
        domain: r.domain,
        title: r.title,
      })),
    };

    reportProgress('Complete', 100);

    return {
      intelligence: {
        topic,
        analyzedAt: new Date(),
        mode: options.mode,
        serp: serpSummary,
        competitors,
        patterns,
        gaps,
        scores,
      },
      success: true,
      analysisTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      intelligence: null as unknown as TopicSerpIntelligence,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      analysisTime: Date.now() - startTime,
    };
  }
}

/**
 * Analyze multiple topics
 */
export async function analyzeMultipleTopics(
  topics: string[],
  options: HolisticAnalysisOptions
): Promise<Map<string, TopicAnalysisResult>> {
  const results = new Map<string, TopicAnalysisResult>();

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];

    if (options.onProgress) {
      options.onProgress(
        'Analyzing topics',
        (i / topics.length) * 100,
        `${i + 1}/${topics.length}: ${topic}`
      );
    }

    const result = await analyzeTopicCompetitors(topic, {
      ...options,
      onProgress: undefined, // Don't nest progress callbacks
    });

    results.set(topic, result);

    // Rate limiting between topics
    if (i < topics.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

// =============================================================================
// Export
// =============================================================================

export default {
  analyzeTopicCompetitors,
  analyzeMultipleTopics,
};
