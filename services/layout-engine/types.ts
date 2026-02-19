/**
 * Layout Engine Types
 *
 * Comprehensive types for the intelligent layout engine that transforms
 * content briefs into visual layouts based on semantic weight, brand DNA,
 * and SEO best practices.
 *
 * NOTE ON TYPE RELATIONSHIP WITH architect/blueprintTypes.ts:
 * Both this file and `services/publishing/architect/blueprintTypes.ts` define
 * types named `ComponentType` and `LayoutBlueprint`. These are intentionally
 * SEPARATE types with different structures. See the module-level doc comment
 * in `architect/blueprintTypes.ts` for a full comparison.
 *
 * @see services/publishing/architect/blueprintTypes.ts — AI Architect types
 */

import { AttributeCategory, BriefSection, FormatCode } from '../../types';
import { DesignDNA } from '../../types/designDna';

// =============================================================================
// CONTENT TYPE & SEMANTIC WEIGHT
// =============================================================================

/**
 * Content type detected from section analysis
 */
export type ContentType =
  | 'introduction'
  | 'explanation'
  | 'steps'
  | 'faq'
  | 'comparison'
  | 'summary'
  | 'testimonial'
  | 'definition'
  | 'list'
  | 'data';

/**
 * Factors that contribute to semantic weight calculation
 */
export interface SemanticWeightFactors {
  baseWeight: number;
  topicCategoryBonus: number;
  coreTopicBonus: number;
  fsTargetBonus: number;
  mainIntentBonus: number;
  totalWeight: number;
}

/**
 * Constraints for a section's layout
 */
export interface SectionConstraints {
  minWordCount?: number;
  maxWordCount?: number;
  requiresVisual?: boolean;
  requiresTable?: boolean;
  requiresList?: boolean;
  fsTarget?: boolean;
  paaTarget?: boolean;
  /** Whether an image is required for this section (alias for requiresVisual) */
  imageRequired?: boolean;
}

/**
 * Complete analysis result for a single section
 */
export interface SectionAnalysis {
  sectionId: string;
  heading: string;
  headingLevel: number;
  contentType: ContentType;
  semanticWeight: number;
  semanticWeightFactors: SemanticWeightFactors;
  attributeCategory?: AttributeCategory;
  formatCode?: FormatCode;
  constraints: SectionConstraints;
  wordCount: number;
  hasTable: boolean;
  hasList: boolean;
  hasQuote: boolean;
  hasImage: boolean;
  isCoreTopic: boolean;
  answersMainIntent: boolean;
  contentZone: 'MAIN' | 'SUPPLEMENTARY';
}

// =============================================================================
// LAYOUT PARAMETERS
// =============================================================================

/**
 * Width options for layout
 */
export type LayoutWidth = 'narrow' | 'medium' | 'wide' | 'full';

/**
 * Column layout options
 */
export type ColumnLayout = '1-column' | '2-column' | '3-column' | 'asymmetric-left' | 'asymmetric-right';

/**
 * Image position options
 */
export type ImagePosition = 'left' | 'right' | 'above' | 'below' | 'background' | 'inline' | 'none';

/**
 * Vertical spacing between sections
 */
export type VerticalSpacing = 'tight' | 'normal' | 'generous' | 'dramatic';

/**
 * Break type for page flow
 */
export type BreakType = 'none' | 'soft' | 'hard';

/**
 * Layout parameters for a section
 */
export interface LayoutParameters {
  width: LayoutWidth;
  columns: ColumnLayout;
  imagePosition: ImagePosition;
  verticalSpacingBefore: VerticalSpacing;
  verticalSpacingAfter: VerticalSpacing;
  breakBefore: BreakType;
  breakAfter: BreakType;
  alignText: 'left' | 'center' | 'justify';
  maxContentWidth?: string;
}

// =============================================================================
// VISUAL EMPHASIS
// =============================================================================

/**
 * Level of visual emphasis mapped from semantic weight
 * Weight 5 -> hero, Weight 4 -> featured, Weight 3 -> standard,
 * Weight 2 -> supporting, Weight 1 -> minimal
 */
export type EmphasisLevel = 'hero' | 'featured' | 'standard' | 'supporting' | 'minimal';

/**
 * Heading size options
 */
export type HeadingSize = 'xl' | 'lg' | 'md' | 'sm';

/**
 * Background treatment types
 */
export type BackgroundType = 'solid' | 'gradient' | 'pattern' | 'image';

/**
 * Accent border positions
 */
export type AccentPosition = 'left' | 'top' | 'bottom' | 'all';

/**
 * Animation types for entry effects
 */
export type AnimationType = 'fade' | 'slide' | 'scale';

/**
 * Elevation levels (shadow depth)
 */
export type ElevationLevel = 0 | 1 | 2 | 3;

/**
 * Visual emphasis configuration derived from semantic weight and brand DNA
 */
export interface VisualEmphasis {
  level: EmphasisLevel;
  headingSize: HeadingSize;
  headingDecoration: { type: 'underline' | 'border-bottom' | 'background' | 'none'; color?: string };
  paddingMultiplier: number;
  marginMultiplier: number;
  hasBackgroundTreatment: boolean;
  backgroundType?: BackgroundType;
  hasAccentBorder: boolean;
  accentPosition?: AccentPosition;
  elevation: ElevationLevel;
  hasEntryAnimation: boolean;
  animationType?: AnimationType;
}

// =============================================================================
// COMPONENT SELECTION
// =============================================================================

/**
 * Available component types for sections
 */
export type ComponentType =
  | 'prose'
  | 'card'
  | 'hero'
  | 'feature-grid'
  | 'accordion'
  | 'timeline'
  | 'comparison-table'
  | 'testimonial-card'
  | 'key-takeaways'
  | 'cta-banner'
  | 'step-list'
  | 'checklist'
  | 'stat-highlight'
  | 'blockquote'
  | 'definition-box'
  | 'faq-accordion'
  | 'alert-box'
  | 'info-box'
  | 'lead-paragraph';

/**
 * Component selection result
 */
export interface ComponentSelection {
  primaryComponent: ComponentType;
  alternativeComponents: ComponentType[];
  componentVariant?: string;
  confidence: number;
  reasoning: string;
}

// =============================================================================
// IMAGE PLACEMENT
// =============================================================================

/**
 * Image placement configuration (basic)
 */
export interface ImagePlacement {
  position: ImagePosition;
  size: 'small' | 'medium' | 'large' | 'full';
  aspectRatio: '16:9' | '4:3' | '1:1' | '3:4' | 'auto';
  wrapText: boolean;
  caption?: boolean;
  lazyLoad: boolean;
  priority: 'high' | 'medium' | 'low';
}

// =============================================================================
// SEMANTIC IMAGE PLACEMENT (for ImageHandler)
// =============================================================================

/**
 * Semantic image position options
 * CRITICAL: All positions are AFTER at least one paragraph (never between heading and first paragraph)
 */
export type SemanticImagePosition =
  | 'after-intro-paragraph' // Safe position after first paragraph
  | 'section-end' // At the end of a section
  | 'float-right' // Float right within paragraph text
  | 'float-left' // Float left within paragraph text
  | 'full-width-break' // Full width visual break between sections
  | 'inline'; // Inline with text (after paragraph)

/**
 * Image source type - where the image comes from
 */
export type ImageSource =
  | 'article_generated' // Images from content generation (uploaded/generated)
  | 'brand_kit' // From business brand kit
  | 'screenshot_derived' // Elements from brand screenshots
  | 'placeholder' // Structured placeholder with specs
  | 'none'; // No image for this section

/**
 * Semantic role of the image
 */
export type ImageSemanticRole = 'hero' | 'explanatory' | 'evidence' | 'decorative';

/**
 * Placeholder specification for images that need to be created
 */
export interface ImagePlaceholderSpec {
  aspectRatio: '16:9' | '4:3' | '1:1' | 'auto';
  suggestedContent: string; // e.g., "Diagram showing X process"
  altTextTemplate: string; // Vocabulary-extending alt text template
}

/**
 * Semantic image placement configuration
 * Used by ImageHandler following Semantic SEO rules
 */
export interface SemanticImagePlacement {
  position: SemanticImagePosition;
  source: ImageSource;
  semanticRole: ImageSemanticRole;
  placeholder?: ImagePlaceholderSpec;
}

// =============================================================================
// LAYOUT SUGGESTION
// =============================================================================

/**
 * Complete layout suggestion for a section
 */
export interface LayoutSuggestion {
  sectionAnalysis: SectionAnalysis;
  layoutParameters: LayoutParameters;
  visualEmphasis: VisualEmphasis;
  componentSelection: ComponentSelection;
  imagePlacement?: ImagePlacement;
}

// =============================================================================
// BLUEPRINT
// =============================================================================

/**
 * Single section in the layout blueprint
 */
export interface BlueprintSection {
  id: string;
  order: number;
  heading: string;
  headingLevel: number;
  contentType: ContentType;
  semanticWeight: number;
  layout: LayoutParameters;
  emphasis: VisualEmphasis;
  component: ComponentSelection;
  image?: ImagePlacement;
  constraints: SectionConstraints;
  contentZone: 'MAIN' | 'SUPPLEMENTARY';
  cssClasses: string[];
  customStyles?: Record<string, string>;

  // NEW: Cost of Retrieval impact
  estimatedDomNodes?: number;
  layoutComplexity?: 'lightweight' | 'moderate' | 'heavy';

  // NEW: Accessibility
  accessibilityRating?: 'AAA' | 'AA' | 'A';

  // NEW: Responsive behavior
  responsiveBreakpoints?: {
    mobile: { columns: ColumnLayout; width: LayoutWidth };
    tablet: { columns: ColumnLayout; width: LayoutWidth };
    desktop: { columns: ColumnLayout; width: LayoutWidth };
  };

  // NEW: Website type context
  websiteTypeRole?: string;
  liftPriority?: number;
}

/**
 * Complete layout blueprint for an article
 */
export interface LayoutBlueprint {
  id: string;
  articleId: string;
  createdAt: string;
  version: number;
  sections: BlueprintSection[];
  globalSettings: {
    defaultWidth: LayoutWidth;
    defaultSpacing: VerticalSpacing;
    primaryFont: string;
    secondaryFont: string;
    colorScheme: 'light' | 'dark' | 'auto';
  };
  designDnaHash?: string;
  metadata: {
    totalSections: number;
    mainSectionCount: number;
    supplementarySectionCount: number;
    averageSemanticWeight: number;
    heroSectionId?: string;
  };
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * Input for semantic weight calculation
 */
export interface SemanticWeightInput {
  attributeCategory?: AttributeCategory;
  isCoreTopic?: boolean;
  hasFSTarget?: boolean;
  answersMainIntent?: boolean;
}

/**
 * Input for section analysis
 */
export interface SectionAnalysisInput {
  sectionId: string;
  content: string;
  briefSection?: BriefSection;
  topicTitle?: string;
  isCoreTopic?: boolean;
  mainIntent?: string;
}

/**
 * Analyzed content result from raw markdown/HTML
 */
export interface AnalyzedContent {
  sections: Array<{
    id: string;
    heading: string;
    headingLevel: number;
    content: string;
    wordCount: number;
    hasTable: boolean;
    hasList: boolean;
    hasQuote: boolean;
    hasImage: boolean;
  }>;
  totalWordCount: number;
  estimatedReadTime: number;
}

// =============================================================================
// SERVICE INTERFACES
// =============================================================================

/**
 * Section analyzer service interface
 */
export interface ISectionAnalyzer {
  analyzeSection(input: SectionAnalysisInput): SectionAnalysis;
  analyzeAllSections(
    content: string,
    briefSections?: BriefSection[],
    options?: { topicTitle?: string; isCoreTopic?: boolean; mainIntent?: string }
  ): SectionAnalysis[];
  calculateSemanticWeight(input: SemanticWeightInput): number;
  detectContentType(heading: string, content: string, formatCode?: FormatCode): ContentType;
}

/**
 * Layout planner service interface
 */
export interface ILayoutPlanner {
  planLayout(analysis: SectionAnalysis, designDna?: DesignDNA): LayoutParameters;
  planAllLayouts(analyses: SectionAnalysis[], designDna?: DesignDNA): LayoutParameters[];
}

/**
 * Content pattern options for enhanced component selection.
 * When provided, enables detection of alert-box, info-box, and lead-paragraph.
 */
export interface ContentPatternOptions {
  /** Raw HTML/markdown content of the section for pattern detection */
  content?: string;
  /** Whether this is the first section in the article (for lead-paragraph) */
  isFirstSection?: boolean;
}

/**
 * Component selector service interface
 */
export interface IComponentSelector {
  selectComponent(analysis: SectionAnalysis, designDna?: DesignDNA, options?: ContentPatternOptions): ComponentSelection;
  selectAllComponents(analyses: SectionAnalysis[], designDna?: DesignDNA, contentOptions?: ContentPatternOptions[]): ComponentSelection[];
}

/**
 * Visual emphasizer service interface
 */
export interface IVisualEmphasizer {
  determineEmphasis(analysis: SectionAnalysis, designDna?: DesignDNA): VisualEmphasis;
  determineAllEmphasis(analyses: SectionAnalysis[], designDna?: DesignDNA): VisualEmphasis[];
}

/**
 * Image handler service interface
 */
export interface IImageHandler {
  determineImagePlacement(
    analysis: SectionAnalysis,
    designDna?: DesignDNA,
    sectionContent?: string,
    options?: { floatHint?: 'left' | 'right' }
  ): SemanticImagePlacement | null;
  determineAllImagePlacements(
    analyses: SectionAnalysis[],
    designDna?: DesignDNA,
    sectionContents?: string[]
  ): (SemanticImagePlacement | null)[];
}

/**
 * Layout engine orchestrator interface
 */
export interface ILayoutEngine {
  generateBlueprint(
    content: string,
    briefSections?: BriefSection[],
    designDna?: DesignDNA,
    options?: {
      topicTitle?: string;
      isCoreTopic?: boolean;
      mainIntent?: string;
    }
  ): LayoutBlueprint;
}
