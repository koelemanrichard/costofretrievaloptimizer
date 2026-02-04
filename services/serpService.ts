/**
 * SERP Service Facade
 *
 * Unified interface for SERP analysis that supports both:
 * - Fast mode: AI-inferred SERP characteristics (quick, cheap)
 * - Deep mode: Real DataForSEO API data (accurate, comprehensive)
 *
 * Usage:
 * ```typescript
 * const result = await analyzeSerpForTopic('semantic seo', 'fast', businessInfo);
 * // or
 * const result = await analyzeSerpForTopic('semantic seo', 'deep', businessInfo);
 * ```
 */

import { BusinessInfo } from '../types';
import { FullSerpResult, fetchFullSerpData } from './serpApiService';
import { InferredSerpData, inferSerpData } from './ai/serpInference';

// =============================================================================
// Types
// =============================================================================

export type SerpMode = 'fast' | 'deep';

export interface SerpAnalysisResult {
  mode: SerpMode;
  success: boolean;
  error?: string;

  // Data from either mode
  data: FullSerpResult | InferredSerpData | null;

  // Cache metadata
  cachedAt?: Date;
  expiresAt?: Date;

  // For UI display
  summary: {
    query: string;
    intent: string;
    contentType: string;
    difficulty: string;
    difficultyScore: number;
    topCompetitors: { domain: string; position?: number }[];
    serpFeatures: string[];
    recommendations: string[];
  };
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Analyze SERP for a topic using specified mode
 *
 * @param topic - The search query/topic to analyze
 * @param mode - 'fast' for AI inference, 'deep' for DataForSEO API
 * @param businessInfo - Business context with credentials and settings
 * @returns Unified SERP analysis result
 */
export async function analyzeSerpForTopic(
  topic: string,
  mode: SerpMode,
  businessInfo: BusinessInfo
): Promise<SerpAnalysisResult> {
  try {
    if (mode === 'fast') {
      return await analyzeFast(topic, businessInfo);
    } else {
      return await analyzeDeep(topic, businessInfo);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`SERP analysis failed for "${topic}" in ${mode} mode:`, error);

    return {
      mode,
      success: false,
      error: errorMessage,
      data: null,
      summary: createEmptySummary(topic)
    };
  }
}

/**
 * Fast mode analysis using AI inference
 */
async function analyzeFast(
  topic: string,
  businessInfo: BusinessInfo
): Promise<SerpAnalysisResult> {
  const data = await inferSerpData(topic, businessInfo);

  return {
    mode: 'fast',
    success: true,
    data,
    cachedAt: data.inferredAt,
    expiresAt: new Date(data.inferredAt.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
    summary: {
      query: topic,
      intent: data.dominantIntent,
      contentType: data.dominantContentType,
      difficulty: data.competitiveLandscape.difficulty,
      difficultyScore: data.competitiveLandscape.difficultyScore,
      topCompetitors: data.estimatedTopDomains.slice(0, 5).map(domain => ({ domain })),
      serpFeatures: extractFeaturesFromInferred(data),
      recommendations: [
        ...data.competitiveLandscape.opportunities,
        ...data.estimatedRequirements.contentElements.map(e => `Include: ${e}`),
        `Target word count: ${data.estimatedWordCount.avg}+`,
        ...data.estimatedRequirements.schemaTypes.map(s => `Add ${s} schema`)
      ].slice(0, 8)
    }
  };
}

/**
 * Deep mode analysis using DataForSEO API
 */
async function analyzeDeep(
  topic: string,
  businessInfo: BusinessInfo
): Promise<SerpAnalysisResult> {
  // Validate credentials
  if (!businessInfo.dataforseoLogin || !businessInfo.dataforseoPassword) {
    throw new Error('DataForSEO credentials required for deep analysis. Configure in Settings.');
  }

  const data = await fetchFullSerpData(
    topic,
    businessInfo.dataforseoLogin,
    businessInfo.dataforseoPassword,
    businessInfo.targetMarket || 'United States',
    businessInfo.language || 'en',
    { supabaseUrl: businessInfo.supabaseUrl, supabaseAnonKey: businessInfo.supabaseAnonKey }
  );

  return {
    mode: 'deep',
    success: true,
    data,
    cachedAt: data.fetchedAt,
    expiresAt: new Date(data.fetchedAt.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
    summary: {
      query: topic,
      intent: inferIntentFromSerp(data),
      contentType: inferContentTypeFromSerp(data),
      difficulty: inferDifficultyFromSerp(data),
      difficultyScore: calculateDifficultyScore(data),
      topCompetitors: data.organicResults.slice(0, 5).map(r => ({
        domain: r.domain,
        position: r.position
      })),
      serpFeatures: extractFeaturesFromFull(data),
      recommendations: generateRecommendationsFromSerp(data)
    }
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract feature list from inferred data
 */
function extractFeaturesFromInferred(data: InferredSerpData): string[] {
  const features: string[] = [];

  if (data.likelyFeatures.featuredSnippet.likely) {
    features.push(`Featured Snippet (${data.likelyFeatures.featuredSnippet.type || 'paragraph'})`);
  }
  if (data.likelyFeatures.peopleAlsoAsk.likely) {
    features.push('People Also Ask');
  }
  if (data.likelyFeatures.imagesPack) features.push('Image Pack');
  if (data.likelyFeatures.videoCarousel) features.push('Video Carousel');
  if (data.likelyFeatures.localPack) features.push('Local Pack');
  if (data.likelyFeatures.knowledgePanel) features.push('Knowledge Panel');
  if (data.likelyFeatures.reviews) features.push('Reviews');
  if (data.likelyFeatures.faq) features.push('FAQ');

  return features;
}

/**
 * Extract feature list from full SERP data
 */
function extractFeaturesFromFull(data: FullSerpResult): string[] {
  const features: string[] = [];

  if (data.features.hasFeaturedSnippet) {
    features.push(`Featured Snippet (${data.features.featuredSnippet?.type || 'paragraph'})`);
  }
  if (data.features.hasPeopleAlsoAsk) {
    features.push(`People Also Ask (${data.features.peopleAlsoAsk.length} questions)`);
  }
  if (data.features.hasImagePack) features.push(`Image Pack (${data.features.imagePackCount})`);
  if (data.features.hasVideoCarousel) features.push(`Video (${data.features.videoCount})`);
  if (data.features.hasLocalPack) features.push(`Local Pack (${data.features.localPackCount})`);
  if (data.features.hasKnowledgePanel) features.push('Knowledge Panel');
  if (data.features.hasReviews) features.push('Reviews');
  if (data.features.hasFaq) features.push(`FAQ (${data.features.faqCount})`);
  if (data.features.hasSitelinks) features.push('Sitelinks');
  if (data.features.hasRelatedSearches) features.push('Related Searches');

  return features;
}

/**
 * Infer search intent from SERP data
 */
function inferIntentFromSerp(data: FullSerpResult): string {
  const hasProducts = data.organicResults.some(r => r.price);
  const hasLocalPack = data.features.hasLocalPack;
  const hasReviews = data.features.hasReviews;
  const hasFaq = data.features.hasFaq || data.features.hasPeopleAlsoAsk;

  if (hasProducts || hasReviews) return 'commercial';
  if (hasLocalPack) return 'local';
  if (hasFaq) return 'informational';

  return 'informational';
}

/**
 * Infer dominant content type from SERP
 */
function inferContentTypeFromSerp(data: FullSerpResult): string {
  const titles = data.organicResults.map(r => r.title.toLowerCase());

  // Check for common patterns
  const hasNumbers = titles.filter(t => /\d+\s*(best|top|ways|tips|steps)/i.test(t)).length;
  const hasHowTo = titles.filter(t => /how\s+to/i.test(t)).length;
  const hasGuide = titles.filter(t => /guide|tutorial|explained/i.test(t)).length;
  const hasComparison = titles.filter(t => /vs\.?|versus|comparison|compare/i.test(t)).length;
  const hasReview = titles.filter(t => /review|rating/i.test(t)).length;

  if (hasNumbers >= 3) return 'listicle';
  if (hasHowTo >= 3) return 'how-to';
  if (hasComparison >= 2) return 'comparison';
  if (hasReview >= 2) return 'review';
  if (hasGuide >= 2) return 'guide';

  return 'guide';
}

/**
 * Infer difficulty from SERP characteristics
 */
function inferDifficultyFromSerp(data: FullSerpResult): string {
  const score = calculateDifficultyScore(data);

  if (score >= 70) return 'hard';
  if (score >= 40) return 'medium';
  return 'easy';
}

/**
 * Calculate difficulty score (0-100)
 */
function calculateDifficultyScore(data: FullSerpResult): number {
  let score = 50; // Base score

  // High authority domains increase difficulty
  const bigBrands = ['wikipedia.org', 'amazon.com', 'forbes.com', 'nytimes.com', 'bbc.com'];
  const bigBrandCount = data.organicResults.filter(r =>
    bigBrands.some(b => r.domain.includes(b))
  ).length;
  score += bigBrandCount * 5;

  // Many SERP features = more competition
  const featureCount = [
    data.features.hasFeaturedSnippet,
    data.features.hasPeopleAlsoAsk,
    data.features.hasImagePack,
    data.features.hasVideoCarousel,
    data.features.hasKnowledgePanel,
    data.features.hasFaq
  ].filter(Boolean).length;
  score += featureCount * 3;

  // Results with reviews/ratings = commercial competition
  const reviewCount = data.organicResults.filter(r => r.rating).length;
  score += reviewCount * 2;

  return Math.min(100, Math.max(0, score));
}

/**
 * Generate recommendations from SERP analysis
 */
function generateRecommendationsFromSerp(data: FullSerpResult): string[] {
  const recommendations: string[] = [];

  // Featured snippet opportunity
  if (data.features.hasFeaturedSnippet) {
    const fsType = data.features.featuredSnippet?.type;
    if (fsType === 'list') {
      recommendations.push('Optimize for list-based featured snippet');
    } else if (fsType === 'table') {
      recommendations.push('Include comparison table for featured snippet');
    } else {
      recommendations.push('Create concise paragraph for featured snippet');
    }
  }

  // PAA opportunity
  if (data.features.hasPeopleAlsoAsk && data.features.peopleAlsoAsk.length > 0) {
    recommendations.push(`Answer PAA questions: ${data.features.peopleAlsoAsk.slice(0, 3).map(q => q.question).join(', ')}`);
  }

  // Schema recommendations based on features
  if (data.features.hasFaq) {
    recommendations.push('Add FAQPage schema');
  }
  if (data.features.hasReviews) {
    recommendations.push('Add Product/Review schema with ratings');
  }

  // Content recommendations based on competitors
  const avgTitleLength = data.organicResults.reduce((sum, r) => sum + r.title.length, 0) / data.organicResults.length;
  if (avgTitleLength > 50) {
    recommendations.push('Use descriptive title (50-60 characters)');
  }

  // Related searches for content expansion
  if (data.features.hasRelatedSearches && data.features.relatedSearches.length > 0) {
    recommendations.push(`Cover related topics: ${data.features.relatedSearches.slice(0, 3).join(', ')}`);
  }

  return recommendations.slice(0, 8);
}

/**
 * Create empty summary for error cases
 */
function createEmptySummary(query: string): SerpAnalysisResult['summary'] {
  return {
    query,
    intent: 'unknown',
    contentType: 'unknown',
    difficulty: 'unknown',
    difficultyScore: 0,
    topCompetitors: [],
    serpFeatures: [],
    recommendations: []
  };
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Analyze multiple topics in batch
 *
 * @param topics - Array of topics to analyze
 * @param mode - 'fast' or 'deep'
 * @param businessInfo - Business context
 * @param onProgress - Optional progress callback
 * @returns Map of topic to analysis result
 */
export async function batchAnalyzeSerpForTopics(
  topics: string[],
  mode: SerpMode,
  businessInfo: BusinessInfo,
  onProgress?: (completed: number, total: number, currentTopic: string) => void
): Promise<Map<string, SerpAnalysisResult>> {
  const results = new Map<string, SerpAnalysisResult>();

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];

    if (onProgress) {
      onProgress(i, topics.length, topic);
    }

    const result = await analyzeSerpForTopic(topic, mode, businessInfo);
    results.set(topic, result);

    // Delay between requests to avoid rate limiting
    if (i < topics.length - 1) {
      await new Promise(resolve => setTimeout(resolve, mode === 'deep' ? 1000 : 500));
    }
  }

  if (onProgress) {
    onProgress(topics.length, topics.length, 'Complete');
  }

  return results;
}

/**
 * Check if deep mode is available (credentials configured)
 */
export function isDeepModeAvailable(businessInfo: BusinessInfo): boolean {
  return !!(businessInfo.dataforseoLogin && businessInfo.dataforseoPassword);
}

/**
 * Get recommended mode based on use case
 */
export function getRecommendedMode(
  useCase: 'exploration' | 'prioritization' | 'content-creation' | 'gap-analysis',
  businessInfo: BusinessInfo
): SerpMode {
  // Always use deep if available and use case benefits from accuracy
  if (isDeepModeAvailable(businessInfo)) {
    if (useCase === 'content-creation' || useCase === 'gap-analysis') {
      return 'deep';
    }
  }

  // Fast mode for exploration and bulk operations
  return 'fast';
}
