/**
 * useCompetitiveIntelligence Hook
 *
 * React hook for analyzing topic-level competitive intelligence.
 * Provides:
 * - State management for analysis progress
 * - Loading/error states
 * - Easy integration with UI components
 *
 * Created: December 25, 2024
 */

import { useState, useCallback, useMemo } from 'react';
import { BusinessInfo } from '../types';
import {
  TopicSerpIntelligence,
  CompetitorAnalysis,
} from '../types/competitiveIntelligence';
import { SerpMode, analyzeSerpForTopic } from '../services/serpService';
import { FullSerpResult } from '../services/serpApiService';
import {
  analyzeTopicCompetitors,
  HolisticAnalysisOptions,
} from '../services/holisticCompetitorAnalyzer';
import {
  saveAnalysis,
  getAnalysisByTopicId,
  getAnalysisByTitle,
  SavedAnalysis,
} from '../services/topicAnalysisPersistence';
import { getSupabaseClient } from '../services/supabaseClient';

// =============================================================================
// Types
// =============================================================================

export interface CompetitiveIntelligenceState {
  /** Current analysis status */
  status: 'idle' | 'loading' | 'success' | 'error';
  /** Progress percentage (0-100) */
  progress: number;
  /** Current progress stage */
  progressStage: string;
  /** Progress detail message */
  progressDetail: string;
  /** Analysis result */
  intelligence: TopicSerpIntelligence | null;
  /** Error message if failed */
  error: string | null;
  /** Analysis time in ms */
  analysisTime: number;
  /** Whether result is from cache */
  isFromCache: boolean;
  /** When the cached result expires */
  cacheExpiresAt: Date | null;
}

/**
 * SERP Competitor for selection UI
 */
export interface SerpCompetitorForSelection {
  url: string;
  domain: string;
  title: string;
  position: number;
  snippet?: string;
}

export interface UseCompetitiveIntelligenceResult extends CompetitiveIntelligenceState {
  /** Trigger analysis for a topic */
  analyze: (
    topic: string,
    mode: SerpMode,
    topicId?: string,
    selectedCompetitorUrls?: Array<{ url: string; position: number; domain?: string; title?: string }>
  ) => Promise<void>;
  /** Fetch SERP competitors for user selection (deep mode only) */
  fetchSerpCompetitors: (topic: string) => Promise<SerpCompetitorForSelection[]>;
  /** Load cached analysis for a topic */
  loadCached: (topicId?: string, topicTitle?: string) => Promise<boolean>;
  /** Reset state */
  reset: () => void;
  /** Check if deep mode is available */
  isDeepModeAvailable: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useCompetitiveIntelligence(
  businessInfo: BusinessInfo
): UseCompetitiveIntelligenceResult {
  const [state, setState] = useState<CompetitiveIntelligenceState>({
    status: 'idle',
    progress: 0,
    progressStage: '',
    progressDetail: '',
    intelligence: null,
    error: null,
    analysisTime: 0,
    isFromCache: false,
    cacheExpiresAt: null,
  });

  // Create Supabase client
  const supabase = useMemo(() => {
    if (businessInfo.supabaseUrl && businessInfo.supabaseAnonKey) {
      return getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
    }
    return null;
  }, [businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

  // Check if deep mode is available (has DataForSEO credentials)
  const isDeepModeAvailable = Boolean(
    businessInfo.dataforseoLogin && businessInfo.dataforseoPassword
  );

  // Reset state
  const reset = useCallback(() => {
    setState({
      status: 'idle',
      progress: 0,
      progressStage: '',
      progressDetail: '',
      intelligence: null,
      error: null,
      analysisTime: 0,
      isFromCache: false,
      cacheExpiresAt: null,
    });
  }, []);

  // Load cached analysis
  const loadCached = useCallback(async (topicId?: string, topicTitle?: string): Promise<boolean> => {
    if (!supabase) {
      console.warn('Supabase not available for loading cached analysis');
      return false;
    }

    try {
      let cached: SavedAnalysis | null = null;

      if (topicId) {
        cached = await getAnalysisByTopicId(supabase, topicId, { acceptStale: true });
      } else if (topicTitle) {
        cached = await getAnalysisByTitle(supabase, topicTitle, { acceptStale: true });
      }

      if (cached) {
        setState(prev => ({
          ...prev,
          status: 'success',
          progress: 100,
          progressStage: 'Loaded from cache',
          progressDetail: cached.isFresh ? 'Fresh data' : 'Stale data (consider re-analyzing)',
          intelligence: cached.intelligence,
          analysisTime: 0,
          isFromCache: true,
          cacheExpiresAt: cached.expiresAt,
        }));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to load cached analysis:', error);
      return false;
    }
  }, [supabase]);

  // Fetch SERP competitors for user selection (deep mode only)
  const fetchSerpCompetitors = useCallback(async (topic: string): Promise<SerpCompetitorForSelection[]> => {
    if (!isDeepModeAvailable) {
      console.warn('Deep mode not available - cannot fetch SERP competitors');
      return [];
    }

    try {
      setState(prev => ({
        ...prev,
        status: 'loading',
        progress: 5,
        progressStage: 'Fetching SERP data',
        progressDetail: topic,
        error: null,
      }));

      const serpResult = await analyzeSerpForTopic(topic, 'deep', businessInfo);

      if (serpResult.mode === 'deep' && 'organicResults' in serpResult.data) {
        const fullSerp = serpResult.data as FullSerpResult;

        setState(prev => ({
          ...prev,
          status: 'idle',
          progress: 0,
          progressStage: '',
          progressDetail: '',
        }));

        return fullSerp.organicResults.slice(0, 20).map(r => ({
          url: r.url,
          domain: r.domain,
          title: r.title,
          position: r.position,
          snippet: r.snippet,
        }));
      }

      setState(prev => ({
        ...prev,
        status: 'idle',
        progress: 0,
        progressStage: '',
        progressDetail: '',
      }));

      return [];
    } catch (error) {
      console.error('Failed to fetch SERP competitors:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to fetch SERP data',
      }));
      return [];
    }
  }, [businessInfo, isDeepModeAvailable]);

  // Analyze topic
  const analyze = useCallback(async (
    topic: string,
    mode: SerpMode,
    topicId?: string,
    selectedCompetitorUrls?: Array<{ url: string; position: number; domain?: string; title?: string }>
  ) => {
    // Validate mode availability
    if (mode === 'deep' && !isDeepModeAvailable) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Deep mode requires DataForSEO credentials. Please add them in settings.',
      }));
      return;
    }

    // Start loading
    setState(prev => ({
      ...prev,
      status: 'loading',
      progress: 0,
      progressStage: 'Starting analysis',
      progressDetail: topic,
      error: null,
      isFromCache: false,
      cacheExpiresAt: null,
    }));

    try {
      const options: HolisticAnalysisOptions = {
        mode,
        businessInfo,
        competitorLimit: selectedCompetitorUrls?.length || 5,
        selectedCompetitorUrls, // Pass user-selected URLs if provided
        onProgress: (stage, progress, detail) => {
          setState(prev => ({
            ...prev,
            progress,
            progressStage: stage,
            progressDetail: detail || '',
          }));
        },
      };

      const result = await analyzeTopicCompetitors(topic, options);

      if (result.success && result.intelligence) {
        // Save to database if supabase is available
        if (supabase) {
          const saveResult = await saveAnalysis(
            supabase,
            result.intelligence,
            result.analysisTime,
            { topicId }
          );

          if (!saveResult.success) {
            console.warn('Failed to save analysis to database:', saveResult.error);
          }
        }

        // Calculate expiration (7 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        setState(prev => ({
          ...prev,
          status: 'success',
          progress: 100,
          progressStage: 'Complete',
          progressDetail: '',
          intelligence: result.intelligence,
          analysisTime: result.analysisTime,
          isFromCache: false,
          cacheExpiresAt: expiresAt,
        }));
      } else {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: result.error || 'Analysis failed',
          analysisTime: result.analysisTime,
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, [businessInfo, isDeepModeAvailable, supabase]);

  return {
    ...state,
    analyze,
    fetchSerpCompetitors,
    loadCached,
    reset,
    isDeepModeAvailable,
  };
}

// =============================================================================
// Convenience Hooks
// =============================================================================

/**
 * Hook for analyzing a single competitor
 */
export function useCompetitorDetails(
  competitor: CompetitorAnalysis | null
): {
  hasData: boolean;
  contentScore: number;
  technicalScore: number;
  linkScore: number;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
} {
  if (!competitor) {
    return {
      hasData: false,
      contentScore: 0,
      technicalScore: 0,
      linkScore: 0,
      overallScore: 0,
      strengths: [],
      weaknesses: [],
    };
  }

  return {
    hasData: true,
    contentScore: competitor.content.contentScore,
    technicalScore: competitor.technical.technicalScore,
    linkScore: competitor.links.linkScore,
    overallScore: competitor.overallScore,
    strengths: competitor.strengths,
    weaknesses: competitor.weaknesses,
  };
}

/**
 * Hook for getting gap summary
 */
export function useGapSummary(
  intelligence: TopicSerpIntelligence | null
): {
  hasGaps: boolean;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  topActions: string[];
} {
  if (!intelligence) {
    return {
      hasGaps: false,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      topActions: [],
    };
  }

  const { gaps } = intelligence;

  const criticalCount = gaps.priorityActions.filter(a => a.priority === 'critical').length;
  const highCount = gaps.priorityActions.filter(a => a.priority === 'high').length;
  const mediumCount = gaps.priorityActions.filter(a => a.priority === 'medium').length;

  return {
    hasGaps: gaps.priorityActions.length > 0,
    criticalCount,
    highCount,
    mediumCount,
    topActions: gaps.priorityActions.slice(0, 3).map(a => a.action),
  };
}

export default useCompetitiveIntelligence;
