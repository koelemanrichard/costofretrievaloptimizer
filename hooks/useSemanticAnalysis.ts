// hooks/useSemanticAnalysis.ts
// React hook for managing semantic analysis state

import { useState, useCallback } from 'react';
import { SemanticAuditResult, BusinessInfo } from '../types';
import { analyzePageSemantics } from '../services/ai/semanticAnalysis';
import { AppAction } from '../state/appState';

export interface UseSemanticAnalysisReturn {
  result: SemanticAuditResult | null;
  isAnalyzing: boolean;
  error: string | null;
  analyze: (content: string, url: string) => Promise<void>;
  reset: () => void;
  updateActionFix: (actionId: string, fix: string) => void;
}

/**
 * React hook for managing semantic analysis state
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
  const [error, setError] = useState<string | null>(null);

  /**
   * Analyzes page semantics using AI
   */
  const analyze = useCallback(
    async (content: string, url: string): Promise<void> => {
      setIsAnalyzing(true);
      setError(null);

      try {
        const analysisResult = await analyzePageSemantics(
          content,
          url,
          businessInfo,
          dispatch
        );

        setResult(analysisResult);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
        console.error('Semantic analysis error:', err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [businessInfo, dispatch]
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
    error,
    analyze,
    reset,
    updateActionFix
  };
};
