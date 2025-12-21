/**
 * Brief Optimization Module
 *
 * Quality-first AI fix system for Money Page 4 Pillars.
 * Implements modify-first, append-only-if-necessary strategy.
 *
 * Main exports:
 * - generateMinimalFixes: Main entry point for fixing briefs
 * - applyMinimalFixes: Apply fixes to a brief
 * - analyzeContentGaps: Analyze what's missing in a brief
 * - getMonetizationPromptEnhancement: Pre-optimization for generation
 */

// Quality Specification - Single Source of Truth
export {
  CHECK_REQUIREMENTS,
  getCriticalRequirements,
  getRequirementsByPriority,
  getRequirementsForPillar,
  getRequirementById,
  FIELD_PATHS,
  ANTI_BLOAT_RULES,
} from './qualitySpec';
export type { CheckRequirement, FixStrategy } from './qualitySpec';

// Content Analyzer - Gap Detection
export {
  analyzeContentGaps,
  getGapsForPillar,
  getMostImpactfulGaps,
  canFixWithInjection,
  getRecommendedKeywords,
  wouldViolateSemanticsRules,
} from './contentAnalyzer';
export type { ContentGap, ContentAnalysisResult } from './contentAnalyzer';

// Keyword Injector - Smart Injection
export {
  injectKeywordsIntoText,
  injectKeywordSimple,
  canInjectSimple,
  batchInjectKeywords,
} from './keywordInjector';
export type { InjectionResult, InjectionOptions } from './keywordInjector';

// Minimal Fixer - Orchestrator
export {
  generateMinimalFixes,
  applyMinimalFixes,
} from './minimalFixer';
export type { MinimalFixResult, MinimalFixOptions } from './minimalFixer';

// Generation Presets - Monetization Enhancement
export {
  getMonetizationPromptEnhancement,
  getMonetizationStructureRequirements,
  getCTASuggestions,
  getHeroImagePromptTemplate,
  shouldApplyMonetizationEnhancement,
  getMonetizationValidationRules,
  getKeywordDensityRequirements,
} from './generationPresets';
