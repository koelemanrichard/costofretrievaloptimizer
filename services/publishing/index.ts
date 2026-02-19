/**
 * Publishing Services Module
 *
 * Re-exports all publishing-related services for styled content publishing.
 *
 * @module services/publishing
 */

// Style Configuration
export {
  brandKitToDesignTokens,
  designTokensToCssVariables,
  cssVariablesToString,
  createPublishingStyle,
  getProjectStyles,
  getDefaultStyle,
  getStyleById,
  updatePublishingStyle,
  deletePublishingStyle,
  createStyleFromBrandKit,
  createStyleFromPreset,
  createInMemoryStyle,
  mergeDesignTokens,
} from './styleConfigService';

// Layout Configuration
export {
  createLayoutTemplate,
  getUserLayoutTemplates,
  getLayoutTemplatesByType,
  getDefaultLayoutTemplate,
  getLayoutTemplateById,
  updateLayoutTemplate,
  deleteLayoutTemplate,
  countEnabledComponents,
  toggleComponent,
  updateComponentConfig,
  resetToTemplateDefaults,
  createInMemoryLayout,
  cloneLayout,
  getTemplateInfoForLayout,
  validateComponentConfig,
} from './layoutConfigService';

// Component Detection
export {
  detectComponents,
  detectComponentByType,
  hasComponent,
  extractFaqItems,
  extractKeyTakeaways,
  extractHeadings,
  suggestTemplateFromContent,
  getComponentSummary,
} from './componentDetector';

// Styled HTML Generation
export {
  generateStyledContent,
  calculateReadTime,
  generateStandaloneHtml,
} from './styledHtmlGenerator';

// ============================================================================
// NEW DESIGN SYSTEM v2.0
// ============================================================================

// Semantic SEO Extraction
export {
  extractSemanticData,
  type SemanticContentData,
  type ExtractedEntity,
  type ExtractedKeywords,
  type TopicalContext,
  type AuthorshipData,
  type SourceCitation,
} from './semanticExtractor';

// JSON-LD Generation
export {
  generateJsonLd,
  generateFaqSchema,
  generateHowToSchema,
  generateServiceSchema,
  generateProductSchema,
  type JsonLdOptions,
} from './jsonLdGenerator';

// Vocabulary Expansion
export {
  expandVocabulary,
  generateSemanticAltText,
  enhanceImageAltTexts,
  type ExpansionResult,
  type VocabularyExpansionOptions,
  type ImagePlaceholder,
} from './vocabularyExpander';

// Token Resolution
export {
  resolvePersonalityToTokens,
  tokensToCSS,
  tokensToStyleObject,
  getDarkModeOverrides,
  type ResolvedTokens,
} from './tokenResolver';

// Component Registry
export {
  componentRegistry,
  getComponentDefinition,
  getAllComponentNames,
  buttonComponent,
  heroComponent,
  cardComponent,
  timelineComponent,
  testimonialComponent,
  faqComponent,
  ctaSectionComponent,
  keyTakeawaysComponent,
  benefitsGridComponent,
  authorBoxComponent,
  tocComponent,
  sourcesComponent,
  type ComponentDefinition,
  type ComponentVariants,
  type ComponentName,
} from './components/registry';

// Class Generator
export {
  generateComponentClasses,
  generateComponent,
  buttonClasses,
  heroClasses,
  cardClasses,
  timelineClasses,
  testimonialClasses,
  faqClasses,
  ctaSectionClasses,
  keyTakeawaysClasses,
  benefitsGridClasses,
  authorBoxClasses,
  tocClasses,
  mergeClasses,
  conditionalClasses,
  getComponentVariants,
  validateVariantSelection,
  generateComponentDocs,
  type VariantSelection,
  type GeneratedComponent,
} from './components/classGenerator';

// HTML Builder
export {
  SemanticHtmlBuilder,
  type ArticleSection,
  type FaqItem,
  type TimelineStep,
  type TestimonialItem,
  type BenefitItem,
  type CtaConfig,
  type HeadingItem,
} from './htmlBuilder';

// Content Analyzer
export {
  analyzeContent,
  type ContentAnalysisResult,
  type CtaPlacement,
} from './contentAnalyzer';

// CSS Generator
export {
  generateDesignSystemCss,
  type CssGenerationOptions,
  type GeneratedCss,
} from './cssGenerator';

// Page Assembler (Main Orchestration)
export {
  assemblePage,
  validateSeo,
  detectComponentsInHtml,
  type PageTemplate,
  type PageAssemblyOptions,
  type SeoConfiguration,
  type CtaConfiguration,
  type StyledContentOutput,
  type DetectedComponent,
  type SeoValidationResult,
  type SeoIssue,
  type AssemblyMetadata,
} from './pageAssembler';

// ============================================================================
// AI LAYOUT ARCHITECT (v3.0)
// ============================================================================

// Blueprint Types
export {
  type ComponentType as BlueprintComponentType,
  type VisualStyle,
  type ContentPacing,
  type ColorIntensity,
  type SectionEmphasis,
  type SectionSpacing,
  type PageStrategy,
  type SectionDesign,
  type LayoutBlueprint,
  type ArchitectInput,
  type BusinessContext,
  type MarketContext,
  type CompetitorContext,
  type SiteContext,
  type ContentSignals,
  type UserPreferences,
  type ProjectBlueprint,
  type TopicalMapBlueprint,
  type ArticleBlueprintOverrides,
  type SectionRefinementRequest,
  type BulkRefinementRequest,
  type BlueprintValidation,
  type CompactBlueprint,
} from './architect';

export { toCompactBlueprint } from './architect';

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
} from './architect';

// v2.0 Context & Coherence Types
export type {
  RichArchitectContext,
  ParsedSection,
  CoherenceAnalysis,
} from './architect';

// Architect Prompts (for debugging/inspection)
export {
  buildSystemPrompt as buildArchitectSystemPrompt,
  buildUserPrompt as buildArchitectUserPrompt,
  COMPONENT_DESCRIPTIONS,
  VISUAL_STYLE_DESCRIPTIONS,
} from './architect';

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
} from './architect';

export type {
  ProjectBlueprintRow,
  TopicalMapBlueprintRow,
  ArticleBlueprintRow,
} from './architect';

export { initSupabaseClient as initBlueprintSupabase } from './architect';

// Blueprint Resolver (Hierarchy Merging)
export {
  resolveBlueprintSettings,
  applyOverrides,
  mergeBlueprints,
  needsRegeneration,
  summarizeSettings,
  validateBlueprint,
  DEFAULT_SETTINGS as BLUEPRINT_DEFAULT_SETTINGS,
} from './architect';

export type {
  ResolvedBlueprintSettings,
  BlueprintHierarchy,
} from './architect';

// Blueprint Renderer
export {
  renderBlueprint,
  mapVisualStyleToPersonality,
  generateStandaloneBlueprintHtml,
} from './renderer';

export type {
  BlueprintRenderOptions,
  BlueprintRenderOutput,
} from './renderer';

// Component Library (Renderer)
export {
  getComponentRenderer,
  hasRenderer,
  getAvailableComponents,
  getRegisteredComponents,
  isRegisteredComponent,
} from './renderer';

export type {
  RenderContext,
  RenderedComponent,
  ComponentRenderer,
} from './renderer';

// ============================================================================
// REFINEMENT & LEARNING (v4.0)
// ============================================================================

// Section Refinement
export {
  refineSingleSection,
  refineMultipleSections,
  swapComponent,
  swapAllComponents,
  changeEmphasis,
  toggleBackground,
  changeSpacing,
  applyComponentToAllArticles,
  applyEmphasisToAllArticles,
  toUserOverrides,
  saveRefinements,
  suggestAlternativeComponents,
  getComponentCompatibility,
} from './refinement';

export type {
  SectionRefinement,
  RefinementResult,
  ApplyToAllResult,
  RefinementHistory,
} from './refinement';

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
} from './refinement';

export type {
  RefinementPattern,
  ComponentSwapStats,
  LearnedPreferences,
  SuggestionContext,
} from './refinement';

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
} from './refinement';

export type {
  CompetitorDesignAnalysis,
  CompetitorInsights,
  ExtractedDesignFeatures,
} from './refinement';

// Enhanced Suggestions
export {
  getSectionSuggestions,
  getBlueprintSuggestions,
  applyAutoSuggestions,
  calculateSuggestionQuality,
  DEFAULT_SUGGESTION_CONFIG,
} from './refinement';

export type {
  EnhancedSuggestion,
  SectionSuggestions,
  BlueprintSuggestions,
  SuggestionConfig,
} from './refinement';

// ============================================================================
// MULTI-PASS DESIGN GENERATION (v5.0)
// ============================================================================

export {
  analyzeContent as analyzeContentStructure,
  selectComponents,
  planVisualRhythm,
  MultiPassOrchestrator,
} from './multipass';

export type {
  MultiPassConfig,
  MultiPassResult,
} from './multipass';

// ============================================================================
// DESIGN INHERITANCE (v5.0)
// ============================================================================

export {
  DesignInheritanceService,
  initDesignInheritanceService,
  getDesignInheritanceService,
} from './designInheritance';

export type {
  DesignInheritanceConfig,
  DesignProfileRow,
  ProjectDesignDefaultsRow,
  TopicalMapDesignRulesRow,
} from './designInheritance';
