/**
 * Gamification Module
 *
 * Exports all gamification utilities, types, and helpers
 */

// Score calculations
export {
  calculateSemanticAuthorityScore,
  calculateEntityClarity,
  calculateTopicalCoverage,
  calculateIntentAlignment,
  calculateCompetitiveParity,
  calculateContentReadiness,
  getTierForScore,
  compareScores,
  getEntityClarityLabel,
  getTopicalCoverageLabel,
  getIntentAlignmentLabel,
  getCompetitiveParityLabel,
  getContentReadinessLabel,
  SCORE_TIERS
} from './scoreCalculations';

// Types
export type {
  SemanticAuthorityScore,
  SubScore,
  ScoreTier,
  TierConfig
} from './scoreCalculations';

// Tier assignment
export {
  assignTopicTiers,
  getTierConfig,
  PRIORITY_TIERS
} from './tierAssignment';

export type {
  PriorityTier,
  TierAssignment,
  TierSummary
} from './tierAssignment';

// Progress messages
export {
  getProgressMessage,
  getActionMessage,
  getScoreChangeMessage,
  getEmptyStateMessage,
  WIZARD_MESSAGES,
  ACTION_MESSAGES,
  EMPTY_STATE_MESSAGES
} from './progressMessages';

export type {
  ProgressMessage,
  MessageCategory
} from './progressMessages';

// Celebrations
export {
  celebrateScoreIncrease,
  celebrateTierUp,
  celebratePerfectScore,
  celebrateAchievement,
  celebrateFirstMap,
  onCelebration,
  renderConfetti,
  getCelebrationClasses,
  CELEBRATION_STYLES
} from './celebrations';

export type {
  CelebrationConfig
} from './celebrations';

// Additional tier assignment exports
export {
  getTierSummary,
  getAllTierSummaries,
  getTierProTip
} from './tierAssignment';

export type {
  TierId
} from './tierAssignment';

// Additional message exports
export {
  getWizardMessage,
  interpolateMessage,
  getTooltipContent,
  SCORE_CHANGE_MESSAGES,
  CONTEXTUAL_TOOLTIPS
} from './progressMessages';

export type {
  EmptyStateConfig,
  TooltipContent
} from './progressMessages';
