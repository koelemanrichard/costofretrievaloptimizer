/**
 * Refinement Module
 *
 * Exports all refinement-related services for user feedback handling.
 *
 * @module services/publishing/refinement
 */

export {
  // Single section refinement
  refineSingleSection,
  refineMultipleSections,

  // Component operations
  swapComponent,
  swapAllComponents,

  // Styling operations
  changeEmphasis,
  toggleBackground,
  changeSpacing,

  // Apply to all (bulk operations)
  applyComponentToAllArticles,
  applyEmphasisToAllArticles,

  // User overrides
  toUserOverrides,
  saveRefinements,

  // Suggestion helpers
  suggestAlternativeComponents,
  getComponentCompatibility,
} from './sectionRefiner';

export type {
  SectionRefinement,
  RefinementResult,
  ApplyToAllResult,
  RefinementHistory,
} from './sectionRefiner';

// Pattern Learning
export {
  initPatternLearningClient,
  recordComponentSwap,
  recordEmphasisChange,
  recordComponentAvoidance,
  getLearnedPreferences,
  getSwapSuggestions,
  getRefinementAnalytics,
  getSmartSuggestions,
  shouldAutoApplyPattern,
} from './patternLearning';

export type {
  RefinementPattern,
  ComponentSwapStats,
  LearnedPreferences,
  SuggestionContext,
} from './patternLearning';

// Competitor Analysis
export {
  initCompetitorAnalysisClient,
  extractDesignFeatures,
  inferVisualStyle,
  inferComponentUsage,
  storeCompetitorAnalysis,
  getCompetitorAnalyses,
  deleteCompetitorAnalysis,
  generateCompetitorInsights,
  analyzeCompetitorUrl,
  getDesignRecommendations,
} from './competitorAnalysis';

export type {
  CompetitorDesignAnalysis,
  CompetitorInsights,
  ExtractedDesignFeatures,
} from './competitorAnalysis';

// Enhanced Suggestions
export {
  getSectionSuggestions,
  getBlueprintSuggestions,
  applyAutoSuggestions,
  calculateSuggestionQuality,
  DEFAULT_SUGGESTION_CONFIG,
} from './enhancedSuggestions';

export type {
  EnhancedSuggestion,
  SectionSuggestions,
  BlueprintSuggestions,
  SuggestionConfig,
} from './enhancedSuggestions';
