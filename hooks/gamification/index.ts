/**
 * Gamification Hooks
 *
 * React hooks for gamification features
 */

export {
  useSemanticScore,
  useScoreComparison,
  useScoreTracking,
  default as useSemanticScoreDefault
} from './useSemanticScore';

export type {
  UseSemanticScoreResult,
  UseSemanticScoreOptions,
  ScoreHistoryEntry
} from './useSemanticScore';

export {
  usePriorityTiers,
  default as usePriorityTiersDefault
} from './usePriorityTiers';

export type {
  UsePriorityTiersOptions,
  UsePriorityTiersResult
} from './usePriorityTiers';

// Re-export gamification types and utilities for convenience
export {
  SCORE_TIERS,
  PRIORITY_TIERS,
  calculateSemanticAuthorityScore,
  getTierForScore,
  assignTopicTiers
} from '../../utils/gamification';

export type {
  SemanticAuthorityScore,
  SubScore,
  ScoreTier,
  TierConfig,
  PriorityTier,
  TierAssignment
} from '../../utils/gamification';
