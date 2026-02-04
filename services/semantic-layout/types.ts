/**
 * Semantic Layout Engine Types
 *
 * Comprehensive type definitions for the AI-driven layout engine that produces
 * design-agency quality HTML while maintaining semantic SEO compliance.
 *
 * @module services/semantic-layout/types
 */

import type { SemanticTriple, ContentBrief, BriefSection } from '../../types';
import type { DesignDNA } from '../../types/designDna';
import type { BrandDesignSystem } from '../../types/designDna';
import type { BlueprintSection as LayoutBlueprintSection } from '../layout-engine/types';

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Unified context for article rendering decisions
 */
export interface ArticleContext {
  /** Business context from project/map */
  business: BusinessContext;
  /** Content context from article/brief */
  content: ContentContext;
  /** SEO context for optimization */
  seo: SEOContext;
  /** Brand context for styling */
  brand: BrandContext;
}

/**
 * Business-level context
 */
export interface BusinessContext {
  /** Central entity the website is about */
  centralEntity: string;
  /** How the business monetizes (source context) */
  sourceContext: string;
  /** Target audience description */
  targetAudience: string;
  /** Brand personality traits */
  brandPersonality: BrandPersonality;
  /** Industry vertical */
  industry: string;
  /** Monetization model */
  monetizationModel: 'ecommerce' | 'saas' | 'agency' | 'publisher' | 'affiliate' | 'other';
}

/**
 * Brand personality scores (0-100)
 */
export interface BrandPersonality {
  professional: number;
  innovative: number;
  trustworthy: number;
  friendly: number;
  authoritative: number;
  primaryTrait: string;
}

/**
 * Content-level context
 */
export interface ContentContext {
  /** Article title */
  title: string;
  /** Article sections */
  sections: ArticleSectionInput[];
  /** Total word count */
  totalWordCount: number;
  /** Primary target keyword */
  primaryKeyword: string;
  /** Search intent of the content */
  searchIntent: SearchIntent;
  /** Type of content */
  contentType: ArticleContentType;
  /** Content language */
  language: string;
}

/**
 * Search intent classification
 */
export type SearchIntent =
  | 'informational'
  | 'transactional'
  | 'navigational'
  | 'comparison'
  | 'commercial-investigation';

/**
 * Article content type
 */
export type ArticleContentType =
  | 'pillar'      // Comprehensive hub content
  | 'cluster'     // Supporting topic content
  | 'supporting'  // Auxiliary content
  | 'landing'     // Conversion-focused
  | 'blog';       // News/updates

/**
 * Input section for analysis
 */
export interface ArticleSectionInput {
  id: string;
  heading: string;
  headingLevel: 1 | 2 | 3 | 4;
  content: string;
  wordCount: number;
  position: number;
}

/**
 * SEO context for optimization
 */
export interface SEOContext {
  /** Required EAV triples to include */
  eavTriples: SemanticTriple[];
  /** Featured snippet targets */
  fsTargets: FSTarget[];
  /** Internal link targets */
  internalLinks: LinkTarget[];
  /** Content gaps from competitors */
  competitorGaps: string[];
  /** Related keywords */
  relatedKeywords: string[];
}

/**
 * Featured snippet target
 */
export interface FSTarget {
  /** Question being targeted */
  question: string;
  /** Type of FS to optimize for */
  fsType: 'paragraph' | 'list' | 'table';
  /** Section ID containing the answer */
  sectionId: string;
  /** Priority level */
  priority: 'primary' | 'secondary';
}

/**
 * Internal link target
 */
export interface LinkTarget {
  /** Target URL */
  url: string;
  /** Anchor text to use */
  anchorText: string;
  /** Target topic title */
  targetTopic: string;
  /** Context requirement for placement */
  contextRequirement: string;
}

/**
 * Brand styling context
 */
export interface BrandContext {
  /** Brand design system */
  designSystem?: BrandDesignSystem;
  /** Design DNA */
  designDna?: DesignDNA;
  /** Color palette */
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  /** Typography settings */
  typography: {
    headingFont: string;
    bodyFont: string;
    baseFontSize: string;
  };
  /** Brand name */
  brandName: string;
}

// ============================================================================
// SECTION INTELLIGENCE TYPES
// ============================================================================

/**
 * AI analysis result for a section
 */
export interface SectionIntelligence {
  sectionId: string;

  /** Content classification */
  contentType: SectionContentType;
  contentTypeConfidence: number;
  contentTypeReasoning: string;

  /** Semantic weight (1-5) */
  semanticWeight: SemanticWeight;
  attributeCategory: 'UNIQUE' | 'RARE' | 'ROOT' | 'COMMON';

  /** Structure analysis */
  structureAnalysis: StructureAnalysis;

  /** Featured snippet analysis */
  fsAnalysis: FSAnalysis;

  /** Visual recommendations */
  visualRecommendation: VisualRecommendation;

  /** Accessory recommendations */
  accessories: AccessoryRecommendations;
}

/**
 * Section content type classification
 */
export type SectionContentType =
  | 'definition'    // What is X?
  | 'enumeration'   // List of things
  | 'comparison'    // X vs Y
  | 'process'       // How to / Steps
  | 'evidence'      // Stats, proof, citations
  | 'narrative'     // Story, context, background
  | 'faq'           // Questions and answers
  | 'specification' // Technical details
  | 'benefit'       // Advantages/value props
  | 'risk'          // Warnings, drawbacks
  | 'cta';          // Call to action

/**
 * Semantic weight levels
 */
export type SemanticWeight = 1 | 2 | 3 | 4 | 5;

/**
 * Structure analysis results
 */
export interface StructureAnalysis {
  /** Can prose be converted to list? */
  hasImplicitList: boolean;
  /** Number of potential list items */
  listItemCount: number;
  /** Can content be tabled? */
  hasImplicitComparison: boolean;
  /** Subjects being compared */
  comparisonSubjects: string[];
  /** Contains statistics? */
  hasStatistics: boolean;
  /** Extracted statistics */
  extractedStats: ExtractedStat[];
  /** Has quotable excerpts? */
  hasQuotableContent: boolean;
  /** Quotable excerpts */
  quotableExcerpts: string[];
  /** Has actionable steps? */
  hasActionableSteps: boolean;
  /** Number of steps */
  stepCount: number;
}

/**
 * Extracted statistic
 */
export interface ExtractedStat {
  value: string;
  label: string;
  context: string;
  isPercentage: boolean;
}

/**
 * Featured snippet analysis
 */
export interface FSAnalysis {
  /** Has FS target potential */
  hasTarget: boolean;
  /** Target FS type */
  targetType: 'paragraph' | 'list' | 'table' | null;
  /** Target question */
  targetQuestion: string | null;
  /** Optimization suggestions */
  optimizationSuggestions: string[];
  /** Current compliance score */
  currentCompliance: number;
}

/**
 * Visual presentation recommendations
 */
export interface VisualRecommendation {
  /** Primary component to use */
  primaryComponent: ComponentType;
  /** Reasoning for selection */
  primaryReasoning: string;
  /** Alternative component */
  alternativeComponent: ComponentType;
  /** Alternative reasoning */
  alternativeReasoning: string;
  /** Visual emphasis level */
  emphasis: VisualEmphasis;
  /** Layout width */
  layoutWidth: 'full' | 'contained' | 'narrow';
  /** Background treatment */
  backgroundTreatment: BackgroundTreatment;
}

/**
 * Component type for rendering
 */
export type ComponentType =
  | 'hero-prose'
  | 'lead-paragraph'
  | 'prose'
  | 'feature-cards'
  | 'numbered-list'
  | 'bulleted-list'
  | 'checklist'
  | 'comparison-table'
  | 'data-table'
  | 'timeline'
  | 'step-cards'
  | 'stat-grid'
  | 'stat-highlight'
  | 'faq-accordion'
  | 'faq-cards'
  | 'quote-callout'
  | 'blockquote'
  | 'cta-section'
  | 'cta-inline'
  | 'highlight-box'
  | 'warning-box'
  | 'info-box';

/**
 * Visual emphasis levels
 */
export type VisualEmphasis =
  | 'hero'       // Maximum visual weight
  | 'featured'   // High visual weight
  | 'standard'   // Normal visual weight
  | 'supporting' // Reduced visual weight
  | 'minimal';   // Minimum visual weight

/**
 * Background treatment options
 */
export type BackgroundTreatment =
  | 'gradient'
  | 'solid-primary'
  | 'solid-secondary'
  | 'solid-accent'
  | 'subtle-gray'
  | 'white'
  | 'transparent';

/**
 * Accessory recommendations
 */
export interface AccessoryRecommendations {
  /** Add CTA? */
  addCta: boolean;
  /** CTA type */
  ctaType: 'primary' | 'secondary' | 'inline' | null;
  /** CTA placement */
  ctaPlacement: 'before' | 'after' | 'within' | null;
  /** CTA text suggestion */
  ctaText: string | null;
  /** CTA reasoning */
  ctaReasoning: string;

  /** Add callout? */
  addCallout: boolean;
  /** Callout content */
  calloutContent: string | null;
  /** Callout type */
  calloutType: 'insight' | 'warning' | 'tip' | 'quote' | null;

  /** Add stat highlight? */
  addStatHighlight: boolean;
  /** Stats to highlight */
  statContent: ExtractedStat[];

  /** Add visual break? */
  addVisualBreak: boolean;
  /** Break type */
  breakType: 'divider' | 'spacing' | 'decorative' | null;
}

// ============================================================================
// STRUCTURE TRANSFORMATION TYPES
// ============================================================================

/**
 * Result of transforming prose to structured content
 */
export interface StructureTransformation {
  sectionId: string;
  originalContent: string;
  targetComponent: ComponentType;
  transformedContent: TransformedContent;
  extractionMethod: string;
  confidenceScore: number;
  warnings: string[];
}

/**
 * Union of all transformed content types
 */
export type TransformedContent =
  | ProseContent
  | ListContent
  | CardContent
  | TableContent
  | TimelineContent
  | StatContent
  | FAQContent
  | QuoteContent
  | CTAContent;

/**
 * Prose content (paragraphs)
 */
export interface ProseContent {
  type: 'prose';
  paragraphs: string[];
  leadParagraph?: string;
}

/**
 * List content (ordered or unordered)
 */
export interface ListContent {
  type: 'list';
  ordered: boolean;
  /** Required intro sentence with exact count */
  introSentence: string;
  items: ListItem[];
}

/**
 * List item
 */
export interface ListItem {
  text: string;
  subItems?: string[];
}

/**
 * Card grid content
 */
export interface CardContent {
  type: 'cards';
  columns: 2 | 3 | 4;
  items: CardItem[];
}

/**
 * Card item
 */
export interface CardItem {
  title: string;
  description: string;
  icon?: string;
  link?: string;
}

/**
 * Table content
 */
export interface TableContent {
  type: 'table';
  caption: string;
  headers: string[];
  rows: string[][];
  highlightFirstColumn: boolean;
}

/**
 * Timeline/step content
 */
export interface TimelineContent {
  type: 'timeline';
  items: TimelineItem[];
}

/**
 * Timeline item
 */
export interface TimelineItem {
  marker: string;
  title: string;
  content: string;
}

/**
 * Statistics content
 */
export interface StatContent {
  type: 'stats';
  layout: 'grid' | 'inline' | 'featured';
  items: StatItem[];
}

/**
 * Stat item
 */
export interface StatItem {
  value: string;
  label: string;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
}

/**
 * FAQ content
 */
export interface FAQContent {
  type: 'faq';
  style: 'accordion' | 'cards' | 'simple';
  items: FAQItem[];
}

/**
 * FAQ item
 */
export interface FAQItem {
  question: string;
  answer: string;
}

/**
 * Quote content
 */
export interface QuoteContent {
  type: 'quote';
  quote: string;
  attribution?: string;
  source?: string;
}

/**
 * CTA content
 */
export interface CTAContent {
  type: 'cta';
  style: 'primary' | 'secondary' | 'inline';
  heading?: string;
  text: string;
  buttonText: string;
  buttonUrl?: string;
}

// ============================================================================
// BLUEPRINT TYPES
// ============================================================================

/**
 * Complete layout blueprint for an article
 */
export interface SemanticLayoutBlueprint {
  /** Unique ID */
  id: string;
  /** Article ID reference */
  articleId: string;
  /** Generation timestamp */
  generatedAt: Date;
  /** Blueprint version */
  version: string;

  /** Context summary */
  context: {
    searchIntent: SearchIntent;
    contentType: ArticleContentType;
    brandPersonality: BrandPersonality;
    primaryKeyword: string;
  };

  /** Document metadata */
  document: {
    title: string;
    metaDescription: string;
    schema: SchemaMarkup;
  };

  /** Section blueprints */
  sections: BlueprintSection[];

  /** Table of contents */
  toc: TOCBlueprint;

  /** Header accessories */
  headerAccessories: AccessoryBlueprint[];

  /** Footer accessories */
  footerAccessories: AccessoryBlueprint[];

  /** CSS requirements for rendering */
  cssRequirements: CSSRequirements;

  /** AI reasoning for decisions */
  aiReasoning?: {
    overallStrategy: string;
    sectionDecisions: Array<{
      sectionId: string;
      decision: string;
      reasoning: string;
    }>;
  };
}

/**
 * Blueprint for a single section
 */
export interface BlueprintSection {
  id: string;
  position: number;

  /** Heading info */
  heading: {
    text: string;
    level: 1 | 2 | 3 | 4;
    id: string;
  };

  /** AI intelligence results */
  intelligence: SectionIntelligence;

  /** Transformed content structure */
  transformation: StructureTransformation;

  /** Layout specification */
  layout: {
    component: ComponentType;
    emphasis: VisualEmphasis;
    width: 'full' | 'contained' | 'narrow';
    background: BackgroundTreatment;
    spacing: {
      marginTop: string;
      marginBottom: string;
      paddingY: string;
    };
  };

  /** Accessories for this section */
  accessories: SectionAccessory[];

  /** Internal links to inject */
  internalLinks: InternalLinkInjection[];
}

/**
 * Table of contents blueprint
 */
export interface TOCBlueprint {
  style: 'floating' | 'sidebar' | 'inline' | 'none';
  position: 'before-content' | 'after-intro' | 'sidebar';
  items: TOCItem[];
  showOnMobile: boolean;
}

/**
 * TOC item
 */
export interface TOCItem {
  id: string;
  text: string;
  level: number;
  children?: TOCItem[];
}

/**
 * Accessory blueprint
 */
export interface AccessoryBlueprint {
  type: 'cta' | 'newsletter' | 'related-posts' | 'author-bio' | 'social-share';
  position: 'header' | 'footer' | 'sidebar';
  content: Record<string, unknown>;
}

/**
 * Section accessory
 */
export interface SectionAccessory {
  type: 'callout' | 'stat-highlight' | 'pull-quote' | 'cta-inline' | 'visual-break';
  position: 'before' | 'after' | 'within';
  content: Record<string, unknown>;
}

/**
 * Internal link injection point
 */
export interface InternalLinkInjection {
  anchorText: string;
  url: string;
  insertAfterSentence: number;
  contextRequirement: string;
}

/**
 * CSS requirements for the blueprint
 */
export interface CSSRequirements {
  requiredComponents: ComponentType[];
  requiredEmphasisLevels: VisualEmphasis[];
  requiredBackgrounds: BackgroundTreatment[];
  brandVariables: Record<string, string>;
}

/**
 * Schema.org markup
 */
export interface SchemaMarkup {
  '@context': 'https://schema.org';
  '@type': string;
  [key: string]: unknown;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Full validation report
 */
export interface FullValidationReport {
  timestamp: Date;
  articleId: string;

  /** CoR validation */
  cor: CoRValidation;
  /** Featured snippet validation */
  featuredSnippet: FSValidation;
  /** Visual quality assessment */
  visualQuality: VisualQualityAssessment;
  /** Information completeness */
  information: InformationValidation;
  /** Accessibility checks */
  accessibility: AccessibilityValidation;

  /** Overall score (0-100) */
  overallScore: number;
  /** All critical checks passed */
  passed: boolean;
  /** Critical violations */
  criticalViolations: ValidationViolation[];
  /** Warnings */
  warnings: string[];
  /** Suggestions */
  suggestions: string[];
}

/**
 * Cost of Retrieval validation
 */
export interface CoRValidation {
  /** DOM node count */
  domNodeCount: number;
  domNodeLimit: number;
  domPassed: boolean;

  /** HTML/CSS sizes */
  htmlSize: number;
  cssSize: number;
  textContent: number;
  textToCodeRatio: number;
  textToCodeLimit: number;
  textToCodePassed: boolean;

  /** Heading hierarchy */
  headingHierarchy: {
    correct: boolean;
    issues: string[];
  };

  /** Semantic HTML usage */
  semanticHTML: {
    score: number;
    issues: string[];
  };

  /** Overall pass */
  passed: boolean;
  violations: string[];
}

/**
 * Featured snippet validation
 */
export interface FSValidation {
  targets: FSTargetValidation[];
  allTargetsPassed: boolean;
}

/**
 * Individual FS target validation
 */
export interface FSTargetValidation {
  sectionId: string;
  targetQuestion: string;
  targetType: 'paragraph' | 'list' | 'table';

  /** Paragraph FS checks */
  answerLength?: number;
  answerLengthLimit?: number;
  startsCorrectly?: boolean;
  expectedStart?: string;

  /** List FS checks */
  hasIntroSentence?: boolean;
  itemCount?: number;
  itemCountRange?: [number, number];

  /** Table FS checks */
  hasCaption?: boolean;
  rowCount?: number;

  passed: boolean;
  issues: string[];
}

/**
 * Visual quality assessment
 */
export interface VisualQualityAssessment {
  /** Component metrics */
  declaredComponents: Record<ComponentType, number>;
  actuallyRendered: Record<ComponentType, number>;
  proseFailbackCount: number;
  proseFailbackRate: number;
  proseFailbackLimit: number;

  /** Diversity metrics */
  uniqueComponentTypes: number;
  componentDiversityScore: number;

  /** Visual rhythm */
  hasBackgroundVariation: boolean;
  hasWidthVariation: boolean;
  emphasisDistribution: Record<VisualEmphasis, number>;

  /** Brand consistency */
  brandColorUsage: number;
  typographyCompliance: number;
  brandConsistencyScore: number;

  /** Overall */
  visualQualityScore: number;
  passed: boolean;
  issues: string[];
}

/**
 * Information completeness validation
 */
export interface InformationValidation {
  /** EAV coverage */
  requiredEAVs: SemanticTriple[];
  foundEAVs: SemanticTriple[];
  missingEAVs: SemanticTriple[];
  eavCoverageScore: number;

  /** Section coverage */
  briefSections: string[];
  renderedSections: string[];
  missingSections: string[];
  sectionCoverageScore: number;

  /** Overall */
  passed: boolean;
  issues: string[];
}

/**
 * Accessibility validation
 */
export interface AccessibilityValidation {
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  descriptiveLinks: number;
  genericLinks: number;
  headingsInOrder: boolean;
  contrastIssues: string[];
  passed: boolean;
  issues: string[];
}

/**
 * Validation violation
 */
export interface ValidationViolation {
  type: 'cor' | 'fs' | 'visual' | 'information' | 'accessibility';
  severity: 'critical' | 'error' | 'warning';
  code: string;
  message: string;
  location?: {
    sectionId?: string;
    selector?: string;
    lineNumber?: number;
  };
  suggestedFix?: string;
}

// ============================================================================
// CORRECTION TYPES
// ============================================================================

/**
 * Correction request
 */
export interface CorrectionRequest {
  html: string;
  violations: ValidationViolation[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Correction result
 */
export interface CorrectionResult {
  correctedHtml: string;
  appliedFixes: AppliedFix[];
  remainingViolations: ValidationViolation[];
  iterationCount: number;
}

/**
 * Applied fix record
 */
export interface AppliedFix {
  violationCode: string;
  fixDescription: string;
  before: string;
  after: string;
}

// ============================================================================
// RENDERED OUTPUT TYPES
// ============================================================================

/**
 * Final rendered article output
 */
export interface RenderedArticle {
  html: string;
  css: string;
  metadata: RenderMetadata;
  validation?: FullValidationReport;
  corrections?: AppliedFix[];
}

/**
 * Render metadata
 */
export interface RenderMetadata {
  wordCount: number;
  componentCount: Record<ComponentType, number>;
  sectionCount: number;
  estimatedReadTime: number;
  domNodeCount: number;
  textToCodeRatio: number;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Context aggregator interface
 */
export interface IContextAggregator {
  buildContext(
    projectId: string,
    mapId: string,
    articleContent: { title: string; sections: ArticleSectionInput[] },
    brandSystem?: BrandDesignSystem
  ): Promise<ArticleContext>;
}

/**
 * Layout intelligence service interface
 */
export interface ILayoutIntelligenceService {
  analyzeSection(
    section: ArticleSectionInput,
    context: ArticleContext
  ): Promise<SectionIntelligence>;

  analyzeSections(
    sections: ArticleSectionInput[],
    context: ArticleContext
  ): Promise<SectionIntelligence[]>;

  generateBlueprint(
    context: ArticleContext
  ): Promise<SemanticLayoutBlueprint>;
}

/**
 * Structure transformer interface
 */
export interface IStructureTransformer {
  transform(
    section: ArticleSectionInput,
    intelligence: SectionIntelligence,
    context: ArticleContext
  ): Promise<StructureTransformation>;
}

/**
 * Semantic renderer interface
 */
export interface ISemanticRenderer {
  render(
    blueprint: SemanticLayoutBlueprint,
    brandContext: BrandContext
  ): Promise<RenderedArticle>;
}

/**
 * Output validator interface
 */
export interface IOutputValidator {
  validateCoR(html: string): CoRValidation;
  validateFS(html: string, targets: FSTarget[]): FSValidation;
  validateVisualQuality(html: string): VisualQualityAssessment;
  validateInformation(html: string, required: SemanticTriple[]): InformationValidation;
  fullValidation(html: string, context: ArticleContext): Promise<FullValidationReport>;
}

/**
 * Correction engine interface
 */
export interface ICorrectionEngine {
  correct(
    html: string,
    violations: ValidationViolation[],
    maxIterations?: number
  ): Promise<CorrectionResult>;
}
