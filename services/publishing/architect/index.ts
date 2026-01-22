/**
 * AI Layout Architect Module
 *
 * Exports all architect-related services for generating intelligent layout blueprints.
 *
 * @module services/publishing/architect
 */

// Blueprint Types
export type {
  ComponentType,
  VisualStyle,
  ContentPacing,
  ColorIntensity,
  SectionEmphasis,
  SectionSpacing,
  PageStrategy,
  SectionDesign,
  LayoutBlueprint,
  ArchitectInput,
  BusinessContext,
  MarketContext,
  CompetitorContext,
  SiteContext,
  ContentSignals,
  UserPreferences,
  ProjectBlueprint,
  TopicalMapBlueprint,
  ArticleBlueprintOverrides,
  SectionRefinementRequest,
  BulkRefinementRequest,
  BlueprintValidation,
  CompactBlueprint,
} from './blueprintTypes';

export { toCompactBlueprint } from './blueprintTypes';

// Architect Service
export {
  generateBlueprint,
  generateBlueprintHeuristic,
  refineSection,
  generateProjectBlueprint,
  generateTopicalMapBlueprint,
  ensureProjectBlueprint,
  ensureTopicalMapBlueprint,
  // v2.0 Enhanced Generation
  generateBlueprintV2,
  generateBlueprintHeuristicV2,
  analyzeBlueprintQuality,
  // Style Preferences
  applyLearnedPreferences,
  getStylePreferenceSummary,
} from './architectService';

export type {
  RichArchitectContext,
  ParsedSection,
  CoherenceAnalysis,
} from './architectService';

// Context Assembler (v2.0)
export {
  assembleRichContext,
  toArchitectInput,
} from './contextAssembler';

export type {
  SectionSemanticType,
  BrandContext,
  CompetitorLayoutPattern,
  SerpFeatureAnalysis,
  IntentSignals,
  PerformanceContext,
  IndustryDesignNorms,
} from './contextAssembler';

// Component Selector (v2.0)
export {
  selectComponent,
  selectComponentsWithCoherence,
  getRecommendedComponent,
  isComponentAppropriate,
  getComponentWeight,
} from './componentSelector';

export type {
  ComponentSelection,
  SelectionContext,
} from './componentSelector';

// Coherence Engine (v2.0)
export {
  applyCoherence,
  analyzeCoherence,
  generateCoherenceReport,
  getCoherenceRules,
  COHERENCE_PRESETS,
} from './coherenceEngine';

export type {
  CoherenceRules,
} from './coherenceEngine';

// Architect Prompts (for debugging/inspection)
export {
  buildSystemPrompt,
  buildUserPrompt,
  parseArchitectResponse,
  COMPONENT_DESCRIPTIONS,
  VISUAL_STYLE_DESCRIPTIONS,
} from './architectPrompt';

// Blueprint Storage
export {
  getProjectBlueprint,
  upsertProjectBlueprint,
  deleteProjectBlueprint,
  getTopicalMapBlueprint,
  upsertTopicalMapBlueprint,
  deleteTopicalMapBlueprint,
  getArticleBlueprint,
  getArticleBlueprintsForMap,
  saveArticleBlueprint,
  updateArticleBlueprintOverrides,
  deleteArticleBlueprint,
  getBlueprintHistory,
  revertToHistory,
  getEffectiveSettings,
  bulkUpdateComponent,
} from './blueprintStorage';

export type {
  ProjectBlueprintRow,
  TopicalMapBlueprintRow,
  ArticleBlueprintRow,
} from './blueprintStorage';

export { initSupabaseClient } from './blueprintStorage';

// Blueprint Resolver (Hierarchy Merging)
export {
  resolveBlueprintSettings,
  applyOverrides,
  mergeBlueprints,
  needsRegeneration,
  summarizeSettings,
  validateBlueprint,
  DEFAULT_SETTINGS,
} from './blueprintResolver';

export type {
  ResolvedBlueprintSettings,
  BlueprintHierarchy,
} from './blueprintResolver';
