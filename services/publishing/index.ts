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
