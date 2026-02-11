/**
 * Enhanced Brief Generation Hook
 *
 * Orchestrates competitor analysis before brief generation to ensure
 * briefs are informed by real market data.
 *
 * Features:
 * - Auto-runs competitor analysis if data is stale (>30 days) or missing
 * - Configurable analysis depth (quick/standard/thorough)
 * - Progress tracking with status updates
 * - Graceful fallbacks if analysis fails
 *
 * @module hooks/useEnhancedBriefGeneration
 */

import { useState, useCallback, useRef } from 'react';
import { BusinessInfo, EnrichedTopic, SEOPillars, ResponseCode, ContentBrief, SemanticTriple } from '../types';
import { KnowledgeGraph } from '../lib/knowledgeGraph';
import type { CategoryPageContext } from '../types/catalog';
import {
  MarketPatterns,
  AnalysisDepth,
  DEPTH_CONFIG,
  createDefaultMarketPatterns,
  ExtractionResult,
  isSuccessfulExtraction,
} from '../types/competitiveIntelligence';
import { extractMultiple } from '../services/comprehensiveCompetitorExtractor';
import { aggregateMarketPatterns } from '../services/marketPatternAggregator';
import { generateContentBrief } from '../services/ai/briefGeneration';
import { AnalysisStatusData, AnalysisWarning } from '../components/analysis/AnalysisStatusPanel';

// =============================================================================
// TYPES
// =============================================================================

export interface EnhancedBriefGenerationOptions {
  /** Analysis depth - determines how many competitors to analyze */
  analysisDepth?: AnalysisDepth;
  /** Skip analysis if data exists and is less than this many days old */
  cacheMaxAgeDays?: number;
  /** Force re-analysis even if cached data exists */
  forceReanalysis?: boolean;
  /** Skip competitor analysis entirely (use defaults) */
  skipAnalysis?: boolean;
  /** Callback for status updates */
  onStatusUpdate?: (status: AnalysisStatusData) => void;
}

export interface EnhancedBriefGenerationResult {
  brief: Omit<ContentBrief, 'id' | 'topic_id' | 'articleDraft'> | null;
  marketPatterns: MarketPatterns | null;
  error: string | null;
  warnings: AnalysisWarning[];
}

export interface EnhancedBriefGenerationState {
  isAnalyzing: boolean;
  isGeneratingBrief: boolean;
  status: AnalysisStatusData;
  result: EnhancedBriefGenerationResult | null;
}

// =============================================================================
// CACHE HELPERS
// =============================================================================

const CACHE_KEY_PREFIX = 'competitor-analysis-';

interface CachedAnalysis {
  marketPatterns: MarketPatterns;
  analyzedAt: string;
  topicTitle: string;
}

const getCachedAnalysis = (topicId: string): CachedAnalysis | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${topicId}`);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
};

const setCachedAnalysis = (topicId: string, marketPatterns: MarketPatterns, topicTitle: string): void => {
  try {
    const cache: CachedAnalysis = {
      marketPatterns,
      analyzedAt: new Date().toISOString(),
      topicTitle,
    };
    localStorage.setItem(`${CACHE_KEY_PREFIX}${topicId}`, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to cache competitor analysis:', e);
  }
};

const isCacheStale = (cached: CachedAnalysis, maxAgeDays: number): boolean => {
  const analyzedAt = new Date(cached.analyzedAt);
  const daysSince = (Date.now() - analyzedAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > maxAgeDays;
};

// =============================================================================
// HOOK
// =============================================================================

export function useEnhancedBriefGeneration() {
  const [state, setState] = useState<EnhancedBriefGenerationState>({
    isAnalyzing: false,
    isGeneratingBrief: false,
    status: {
      stage: 'idle',
      progress: 0,
      competitorsTotal: 0,
      competitorsSuccess: 0,
      competitorsFailed: 0,
      warnings: [],
    },
    result: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const updateStatus = useCallback((updates: Partial<AnalysisStatusData>, options?: EnhancedBriefGenerationOptions) => {
    setState(prev => {
      const newStatus = { ...prev.status, ...updates };
      options?.onStatusUpdate?.(newStatus);
      return { ...prev, status: newStatus };
    });
  }, []);

  /**
   * Generate an enhanced content brief with competitor analysis
   */
  const generateEnhancedBrief = useCallback(async (
    businessInfo: BusinessInfo,
    topic: EnrichedTopic,
    allTopics: EnrichedTopic[],
    pillars: SEOPillars,
    knowledgeGraph: KnowledgeGraph,
    responseCode: ResponseCode,
    dispatch: React.Dispatch<any>,
    options: EnhancedBriefGenerationOptions = {},
    eavs?: SemanticTriple[],
    categoryContext?: CategoryPageContext
  ): Promise<EnhancedBriefGenerationResult> => {
    const {
      analysisDepth = 'standard',
      cacheMaxAgeDays = 30,
      forceReanalysis = false,
      skipAnalysis = false,
    } = options;

    const warnings: AnalysisWarning[] = [];
    let marketPatterns: MarketPatterns | null = null;

    // Reset state
    setState({
      isAnalyzing: false,
      isGeneratingBrief: false,
      status: {
        stage: 'idle',
        progress: 0,
        competitorsTotal: 0,
        competitorsSuccess: 0,
        competitorsFailed: 0,
        warnings: [],
      },
      result: null,
    });

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      // =================================================================
      // STEP 1: Check for cached analysis
      // =================================================================
      if (!skipAnalysis && !forceReanalysis) {
        const cached = getCachedAnalysis(topic.id);
        if (cached && !isCacheStale(cached, cacheMaxAgeDays)) {
          marketPatterns = cached.marketPatterns;
          warnings.push({
            message: `Using cached analysis from ${new Date(cached.analyzedAt).toLocaleDateString()}`,
            severity: 'info',
          });
          dispatch({
            type: 'LOG_EVENT',
            payload: {
              service: 'EnhancedBriefGeneration',
              message: `Using cached competitor analysis (${cached.marketPatterns.competitorsAnalyzed} competitors)`,
              status: 'info',
              timestamp: Date.now(),
            },
          });
        }
      }

      // =================================================================
      // STEP 2: Run competitor analysis if needed
      // =================================================================
      if (!skipAnalysis && !marketPatterns) {
        setState(prev => ({ ...prev, isAnalyzing: true }));
        updateStatus({
          stage: 'fetching-serp',
          stageLabel: 'Fetching competitor URLs...',
          progress: 5,
        }, options);

        dispatch({
          type: 'SET_NOTIFICATION',
          payload: 'Analyzing competitors before generating brief...',
        });

        // Get competitor URLs from SERP data (if available)
        // For now, we'll use a placeholder - in production, this would come from DataForSEO
        const competitorUrls = await getCompetitorUrls(topic, businessInfo, dispatch);
        const targetCount = DEPTH_CONFIG[analysisDepth].competitors;
        const urlsToAnalyze = competitorUrls.slice(0, targetCount);

        if (urlsToAnalyze.length === 0) {
          warnings.push({
            message: 'No competitor URLs available - using default market patterns',
            severity: 'warning',
          });
          marketPatterns = createDefaultMarketPatterns(['No competitor URLs available']);
        } else {
          updateStatus({
            stage: 'extracting',
            stageLabel: `Extracting content from ${urlsToAnalyze.length} competitors...`,
            progress: 15,
            competitorsTotal: urlsToAnalyze.length,
          }, options);

          // Extract content from each competitor
          const extractionWarnings: AnalysisWarning[] = [];
          const extractions = await extractMultiple(urlsToAnalyze, {
            jinaApiKey: businessInfo.jinaApiKey,
            firecrawlApiKey: businessInfo.firecrawlApiKey,
            proxyConfig: businessInfo.supabaseUrl && businessInfo.supabaseAnonKey ? {
              supabaseUrl: businessInfo.supabaseUrl,
              supabaseAnonKey: businessInfo.supabaseAnonKey,
            } : undefined,
            delayMs: 1000, // Rate limiting
            onProgress: (url, stage) => {
              updateStatus({
                currentUrl: url,
                stageLabel: `${stage}: ${new URL(url).hostname}`,
              }, options);
            },
            onWarning: (url, msgs) => {
              msgs.forEach(msg => {
                extractionWarnings.push({ url, message: msg, severity: 'warning' });
              });
            },
          });

          // Count results and collect successful extractions
          let successCount = 0;
          let failCount = 0;
          const extractionResults: ExtractionResult[] = [];

          extractions.forEach((result, url) => {
            if (isSuccessfulExtraction(result)) {
              successCount++;
              extractionResults.push(result);
            } else {
              failCount++;
              extractionWarnings.push({
                url,
                message: result.fetchStatus.warnings.join(', ') || 'Extraction failed',
                severity: 'error',
              });
            }

            updateStatus({
              competitorsSuccess: successCount,
              competitorsFailed: failCount,
              progress: 15 + Math.round((successCount + failCount) / urlsToAnalyze.length * 60),
            }, options);
          });

          warnings.push(...extractionWarnings);

          // Aggregate patterns from successful extractions
          updateStatus({
            stage: 'aggregating',
            stageLabel: 'Aggregating market patterns...',
            progress: 80,
          }, options);

          marketPatterns = aggregateMarketPatterns(
            extractionResults,
            targetCount
          );

          // Add aggregation warnings
          marketPatterns.warnings.forEach(w => {
            warnings.push({ message: w, severity: 'warning' });
          });

          // Cache the results
          setCachedAnalysis(topic.id, marketPatterns, topic.title);

          updateStatus({
            stage: 'complete',
            stageLabel: 'Competitor analysis complete',
            progress: 100,
            dataQuality: marketPatterns.dataQuality,
            warnings: warnings,
          }, options);
        }

        setState(prev => ({ ...prev, isAnalyzing: false }));
      }

      // =================================================================
      // STEP 3: Generate the brief with market data
      // =================================================================
      setState(prev => ({ ...prev, isGeneratingBrief: true }));

      dispatch({
        type: 'SET_NOTIFICATION',
        payload: marketPatterns
          ? `Generating brief with data from ${marketPatterns.competitorsAnalyzed} competitors...`
          : 'Generating content brief...',
      });

      const brief = await generateContentBrief(
        businessInfo,
        topic,
        allTopics,
        pillars,
        knowledgeGraph,
        responseCode,
        dispatch,
        marketPatterns || undefined,
        eavs,
        categoryContext
      );

      setState(prev => ({ ...prev, isGeneratingBrief: false }));

      const result: EnhancedBriefGenerationResult = {
        brief,
        marketPatterns,
        error: null,
        warnings,
      };

      setState(prev => ({ ...prev, result }));
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result: EnhancedBriefGenerationResult = {
        brief: null,
        marketPatterns,
        error: errorMessage,
        warnings,
      };

      updateStatus({
        stage: 'failed',
        error: errorMessage,
      }, options);

      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        isGeneratingBrief: false,
        result,
      }));

      return result;
    }
  }, [updateStatus]);

  /**
   * Cancel ongoing analysis
   */
  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(prev => ({
      ...prev,
      isAnalyzing: false,
      isGeneratingBrief: false,
      status: { ...prev.status, stage: 'idle' },
    }));
  }, []);

  /**
   * Clear cached analysis for a topic
   */
  const clearCache = useCallback((topicId: string) => {
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${topicId}`);
  }, []);

  return {
    ...state,
    generateEnhancedBrief,
    cancel,
    clearCache,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get competitor URLs from SERP data
 * This is a placeholder - in production, integrate with DataForSEO or similar
 */
async function getCompetitorUrls(
  topic: EnrichedTopic,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>
): Promise<string[]> {
  // Try to get URLs from topic metadata (if analysis was run previously)
  const existingUrls = topic.metadata?.serpUrls as string[] | undefined;
  if (existingUrls && existingUrls.length > 0) {
    return existingUrls;
  }

  // Try to use DataForSEO via serpService if credentials available
  if (businessInfo.dataforseoLogin && businessInfo.dataforseoPassword) {
    try {
      const { analyzeSerpForTopic } = await import('../services/serpService');
      const serpResult = await analyzeSerpForTopic(
        topic.title,
        'deep',
        businessInfo
      );

      // Check if we got full SERP data (deep mode with DataForSEO)
      if (serpResult?.success && serpResult.data && 'organicResults' in serpResult.data) {
        const fullData = serpResult.data as { organicResults: { url: string }[] };
        return fullData.organicResults.slice(0, 10).map((r) => r.url);
      }
    } catch (error) {
      dispatch({
        type: 'LOG_EVENT',
        payload: {
          service: 'EnhancedBriefGeneration',
          message: `DataForSEO unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'warning',
          timestamp: Date.now(),
        },
      });
    }
  }

  // Fallback: no URLs available
  return [];
}

export default useEnhancedBriefGeneration;
