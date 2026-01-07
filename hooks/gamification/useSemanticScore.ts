/**
 * useSemanticScore Hook
 *
 * Provides reactive semantic authority score calculations.
 * Automatically recalculates when map data changes.
 * Tracks score history and tier changes.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TopicalMap, ContentBrief } from '../../types';
import {
  calculateSemanticAuthorityScore,
  getTierForScore,
  compareScores,
  SemanticAuthorityScore,
  ScoreTier,
  TierConfig,
  SCORE_TIERS
} from '../../utils/gamification/scoreCalculations';
import { getScoreChangeMessage } from '../../utils/gamification/progressMessages';

// ============================================================================
// TYPES
// ============================================================================

export interface ScoreHistoryEntry {
  score: number;
  tier: ScoreTier;
  tierConfig: TierConfig;
  timestamp: Date;
  trigger: string;
}

export interface UseSemanticScoreResult {
  // Current score data
  score: SemanticAuthorityScore | null;
  isCalculating: boolean;

  // Tier information (tier is the string ID, tierConfig has the full config)
  currentTier: ScoreTier | null;
  currentTierConfig: TierConfig | null;
  previousTier: ScoreTier | null;
  tierJustChanged: boolean;

  // Score changes
  previousScore: number | null;
  scoreDelta: number;
  scoreChangeMessage: string | null;

  // History
  scoreHistory: ScoreHistoryEntry[];

  // Actions
  recalculate: (trigger?: string) => void;
  clearHistory: () => void;

  // Helpers
  getSubScoreLabel: (key: string) => string;
  isImproving: boolean;
}

export interface UseSemanticScoreOptions {
  /** Auto-recalculate when map changes (default: true) */
  autoRecalculate?: boolean;
  /** Keep history of last N scores (default: 20) */
  historyLimit?: number;
  /** Debounce recalculation by ms (default: 500) */
  debounceMs?: number;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useSemanticScore(
  map: TopicalMap | null | undefined,
  briefs: ContentBrief[] = [],
  options: UseSemanticScoreOptions = {}
): UseSemanticScoreResult {
  const {
    autoRecalculate = true,
    historyLimit = 20,
    debounceMs = 500
  } = options;

  // State
  const [score, setScore] = useState<SemanticAuthorityScore | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryEntry[]>([]);
  const [tierJustChanged, setTierJustChanged] = useState(false);
  const [scoreChangeMessage, setScoreChangeMessage] = useState<string | null>(null);

  // Refs for tracking previous values
  const previousScoreRef = useRef<number | null>(null);
  const previousTierRef = useRef<ScoreTier | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate score function
  const calculateScore = useCallback((trigger: string = 'manual') => {
    if (!map) {
      setScore(null);
      return;
    }

    setIsCalculating(true);

    try {
      const newScore = calculateSemanticAuthorityScore(map, briefs);
      // newScore.tier is the ScoreTier string, newScore.tierConfig is the full config
      const newTier = newScore.tier;
      const newTierConfig = newScore.tierConfig;

      // Track tier changes
      const oldTier = previousTierRef.current;
      const tierChanged = oldTier !== null && oldTier !== newTier;
      setTierJustChanged(tierChanged);

      // Generate change message
      const oldScore = previousScoreRef.current;
      if (oldScore !== null) {
        const oldTierConfig = oldTier ? SCORE_TIERS[oldTier] : null;
        const message = getScoreChangeMessage(
          oldScore,
          newScore.overall,
          oldTierConfig?.label,
          newTierConfig.label
        );
        setScoreChangeMessage(message);
      } else {
        setScoreChangeMessage(null);
      }

      // Update history
      setScoreHistory(prev => {
        const newEntry: ScoreHistoryEntry = {
          score: newScore.overall,
          tier: newTier,
          tierConfig: newTierConfig,
          timestamp: new Date(),
          trigger
        };
        const updated = [newEntry, ...prev].slice(0, historyLimit);
        return updated;
      });

      // Update refs for next comparison
      previousScoreRef.current = newScore.overall;
      previousTierRef.current = newTier;

      setScore(newScore);
    } catch (error) {
      console.error('[useSemanticScore] Calculation error:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [map, briefs, historyLimit]);

  // Debounced recalculation
  const recalculate = useCallback((trigger: string = 'manual') => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      calculateScore(trigger);
    }, debounceMs);
  }, [calculateScore, debounceMs]);

  // Auto-recalculate effect
  useEffect(() => {
    if (!autoRecalculate) return;

    // Calculate on mount and when map changes
    recalculate('auto');

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    // Dependencies that should trigger recalculation
    map?.id,
    map?.eavs?.length,
    map?.topics?.length,
    // SEOPillars is an object, check if it exists
    map?.pillars ? 1 : 0,
    // competitors is the array of competitor URLs in TopicalMap
    map?.competitors?.length,
    briefs.length,
    autoRecalculate,
    recalculate
  ]);

  // Clear tier change flag after a delay (for animations)
  useEffect(() => {
    if (tierJustChanged) {
      const timer = setTimeout(() => {
        setTierJustChanged(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [tierJustChanged]);

  // Clear history
  const clearHistory = useCallback(() => {
    setScoreHistory([]);
    previousScoreRef.current = null;
    previousTierRef.current = null;
  }, []);

  // Sub-score label helper (key should be 'entityClarity', 'topicalCoverage', etc.)
  const getSubScoreLabel = useCallback((key: string): string => {
    if (!score?.breakdown) return '';

    const subScore = score.breakdown[key as keyof typeof score.breakdown];
    if (subScore && 'label' in subScore) {
      return subScore.label;
    }
    return '';
  }, [score]);

  // Computed values
  const currentTier = useMemo((): ScoreTier | null => {
    return score ? score.tier : null;
  }, [score]);

  const currentTierConfig = useMemo((): TierConfig | null => {
    return score ? score.tierConfig : null;
  }, [score]);

  const previousScore = previousScoreRef.current;
  const previousTier = previousTierRef.current;

  const scoreDelta = useMemo(() => {
    if (score === null || previousScore === null) return 0;
    return score.overall - previousScore;
  }, [score, previousScore]);

  const isImproving = useMemo(() => {
    if (scoreHistory.length < 2) return false;
    const recent = scoreHistory.slice(0, 5);
    if (recent.length < 2) return false;

    // Check if trend is positive over last 5 entries
    const oldest = recent[recent.length - 1].score;
    const newest = recent[0].score;
    return newest > oldest;
  }, [scoreHistory]);

  return {
    score,
    isCalculating,
    currentTier,
    currentTierConfig,
    previousTier,
    tierJustChanged,
    previousScore,
    scoreDelta,
    scoreChangeMessage,
    scoreHistory,
    recalculate,
    clearHistory,
    getSubScoreLabel,
    isImproving
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook for comparing scores between two maps
 */
export function useScoreComparison(
  mapA: TopicalMap | null | undefined,
  mapB: TopicalMap | null | undefined,
  briefsA: ContentBrief[] = [],
  briefsB: ContentBrief[] = []
) {
  const scoreA = useSemanticScore(mapA, briefsA, { autoRecalculate: true });
  const scoreB = useSemanticScore(mapB, briefsB, { autoRecalculate: true });

  const comparison = useMemo(() => {
    if (!scoreA.score || !scoreB.score) return null;
    return compareScores(scoreA.score, scoreB.score);
  }, [scoreA.score, scoreB.score]);

  return {
    scoreA,
    scoreB,
    comparison,
    isLoading: scoreA.isCalculating || scoreB.isCalculating
  };
}

/**
 * Hook for tracking score over time with persistence-ready data
 */
export function useScoreTracking(
  map: TopicalMap | null | undefined,
  briefs: ContentBrief[] = []
) {
  const { score, currentTier, currentTierConfig, scoreHistory, recalculate } = useSemanticScore(map, briefs);

  // Generate persistence-ready snapshot
  const snapshot = useMemo(() => {
    if (!score || !currentTier || !map) return null;

    return {
      mapId: map.id,
      score: score.overall,
      tierId: currentTier, // currentTier is already the string ID
      subScores: {
        entityClarity: score.breakdown.entityClarity.score,
        topicalCoverage: score.breakdown.topicalCoverage.score,
        intentAlignment: score.breakdown.intentAlignment.score,
        competitiveParity: score.breakdown.competitiveParity.score,
        contentReadiness: score.breakdown.contentReadiness.score
      },
      metadata: {
        eavCount: map.eavs?.length || 0,
        topicCount: map.topics?.length || 0,
        // pillars is an object (SEOPillars), count as 1 if present
        pillarCount: map.pillars ? 1 : 0,
        briefCount: briefs.length
      },
      timestamp: new Date().toISOString()
    };
  }, [score, currentTier, map, briefs]);

  return {
    score,
    currentTier,
    currentTierConfig,
    scoreHistory,
    snapshot,
    recalculate
  };
}

export default useSemanticScore;
