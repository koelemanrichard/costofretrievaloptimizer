// hooks/useSemanticAnalysis.ts
// React hook for managing semantic analysis state with database persistence

import { useState, useCallback } from 'react';
import { SemanticAuditResult, BusinessInfo, SEOPillars } from '../types';
import { analyzePageSemantics } from '../services/ai/semanticAnalysis';
import { AppAction } from '../state/appState';
import {
  getExistingSemanticAnalysis,
  saveSemanticAnalysis
} from '../services/semanticAnalysisPersistence';

export interface AnalyzeOptions {
  content: string;
  url: string;
  inventoryId?: string;    // Required for persistence
  mapId?: string | null;   // For alignment mode persistence
  pillars?: SEOPillars | null;
  forceRefresh?: boolean;  // Skip cache check and re-analyze
}

export interface UseSemanticAnalysisReturn {
  result: SemanticAuditResult | null;
  isAnalyzing: boolean;
  isLoadingCached: boolean;
  error: string | null;
  analyze: (content: string, url: string, pillars?: SEOPillars | null) => Promise<void>;
  analyzeWithPersistence: (options: AnalyzeOptions) => Promise<void>;
  loadCachedResult: (inventoryId: string, mapId: string | null, content: string) => Promise<boolean>;
  reset: () => void;
  updateActionFix: (actionId: string, fix: string) => void;
}

/**
 * React hook for managing semantic analysis state with database persistence
 *
 * @param businessInfo - User's business context and API keys
 * @param dispatch - React dispatch for logging and state updates
 * @returns Semantic analysis state and control functions
 */
export const useSemanticAnalysis = (
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<AppAction>
): UseSemanticAnalysisReturn => {
  const [result, setResult] = useState<SemanticAuditResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingCached, setIsLoadingCached] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Loads cached semantic analysis result if available
   * @returns true if cached result was found and loaded
   */
  const loadCachedResult = useCallback(
    async (inventoryId: string, mapId: string | null, content: string): Promise<boolean> => {
      if (!inventoryId) return false;

      console.log('[useSemanticAnalysis] Checking for cached result...', { inventoryId, mapId });
      setIsLoadingCached(true);

      try {
        const cachedResult = await getExistingSemanticAnalysis(
          inventoryId,
          mapId,
          content,
          businessInfo.supabaseUrl,
          businessInfo.supabaseAnonKey
        );

        if (cachedResult && cachedResult.overallScore > 0) {
          console.log('[useSemanticAnalysis] Loaded cached result:', cachedResult.overallScore);
          setResult(cachedResult);
          return true;
        }
        return false;
      } catch (err) {
        console.warn('[useSemanticAnalysis] Error loading cached result:', err);
        return false;
      } finally {
        setIsLoadingCached(false);
      }
    },
    [businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]
  );

  /**
   * Analyzes page semantics using AI (original method for backward compatibility)
   * @param content - The page content to analyze
   * @param url - The URL of the page
   * @param pillars - Optional SEO pillars (CE/SC/CSI) to check alignment against
   */
  const analyze = useCallback(
    async (content: string, url: string, pillars?: SEOPillars | null): Promise<void> => {
      console.log('[useSemanticAnalysis] Starting analysis...', {
        url,
        contentLength: content?.length,
        hasPillars: !!pillars,
        pillars: pillars ? { ce: pillars.centralEntity, sc: pillars.sourceContext, csi: pillars.centralSearchIntent } : null
      });
      setIsAnalyzing(true);
      setError(null);

      try {
        console.log('[useSemanticAnalysis] Calling analyzePageSemantics...');
        const analysisResult = await analyzePageSemantics(
          content,
          url,
          businessInfo,
          dispatch,
          pillars || undefined
        );

        console.log('[useSemanticAnalysis] Analysis complete:', analysisResult);
        setResult(analysisResult);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
        console.error('[useSemanticAnalysis] Semantic analysis error:', err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [businessInfo, dispatch]
  );

  /**
   * Analyzes page semantics with database persistence
   * Checks cache first, saves result after analysis
   */
  const analyzeWithPersistence = useCallback(
    async (options: AnalyzeOptions): Promise<void> => {
      const { content, url, inventoryId, mapId, pillars, forceRefresh } = options;

      console.log('[useSemanticAnalysis] Starting analysis with persistence...', {
        url,
        inventoryId,
        mapId,
        hasPillars: !!pillars,
        forceRefresh
      });

      setError(null);

      // Check cache first (unless force refresh)
      if (inventoryId && !forceRefresh) {
        const hasCached = await loadCachedResult(inventoryId, mapId || null, content);
        if (hasCached) {
          console.log('[useSemanticAnalysis] Using cached result, skipping analysis');
          dispatch({
            type: 'SET_NOTIFICATION',
            payload: 'Loaded cached semantic analysis'
          });
          return;
        }
      }

      // Run analysis
      setIsAnalyzing(true);

      try {
        console.log('[useSemanticAnalysis] Running fresh analysis...');
        const analysisResult = await analyzePageSemantics(
          content,
          url,
          businessInfo,
          dispatch,
          pillars || undefined
        );

        console.log('[useSemanticAnalysis] Analysis complete:', analysisResult);
        setResult(analysisResult);

        // Save to database if we have inventory ID
        if (inventoryId && analysisResult.overallScore > 0) {
          try {
            await saveSemanticAnalysis(
              inventoryId,
              mapId || null,
              content,
              analysisResult,
              businessInfo.supabaseUrl,
              businessInfo.supabaseAnonKey
            );
            console.log('[useSemanticAnalysis] Analysis saved to database');
          } catch (saveErr) {
            console.warn('[useSemanticAnalysis] Failed to save analysis:', saveErr);
            // Don't throw - analysis succeeded, just persistence failed
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
        console.error('[useSemanticAnalysis] Semantic analysis error:', err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [businessInfo, dispatch, loadCachedResult]
  );

  /**
   * Resets all state to initial values
   */
  const reset = useCallback(() => {
    setResult(null);
    setIsAnalyzing(false);
    setError(null);
  }, []);

  /**
   * Updates the smartFix field for a specific action item
   */
  const updateActionFix = useCallback(
    (actionId: string, fix: string): void => {
      if (!result) return;

      setResult({
        ...result,
        actions: result.actions.map((action) =>
          action.id === actionId
            ? { ...action, smartFix: fix }
            : action
        )
      });
    },
    [result]
  );

  return {
    result,
    isAnalyzing,
    isLoadingCached,
    error,
    analyze,
    analyzeWithPersistence,
    loadCachedResult,
    reset,
    updateActionFix
  };
};
