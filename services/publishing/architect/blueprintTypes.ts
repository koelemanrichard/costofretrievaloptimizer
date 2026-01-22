/**
 * Layout Blueprint Types
 *
 * Defines the core interfaces for the AI Layout Architect system.
 * The blueprint is a declarative specification of how content should be rendered,
 * produced by AI analysis and consumed by a deterministic renderer.
 *
 * @module services/publishing/architect/blueprintTypes
 */

// ============================================================================
// COMPONENT TYPES
// ============================================================================

/**
 * All available component types for content rendering.
 * The AI Architect selects appropriate components based on content analysis.
 */
export type ComponentType =
  // Core content
  | 'prose'
  | 'lead-paragraph'
  | 'pull-quote'
  | 'highlight-box'
  | 'callout'

  // List presentations
  | 'bullet-list'
  | 'numbered-list'
  | 'checklist'
  | 'icon-list'
  | 'card-grid'
  | 'masonry-grid'
  | 'feature-list'
  | 'stat-cards'

  // Process & structure
  | 'timeline-vertical'
  | 'timeline-horizontal'
  | 'timeline-zigzag'
  | 'steps-numbered'
  | 'steps-icons'
  | 'accordion'
  | 'tabs'

  // Comparison & data
  | 'comparison-table'
  | 'pros-cons'
  | 'pricing-table'
  | 'spec-table'
  | 'data-table'

  // Trust & social proof
  | 'testimonial-single'
  | 'testimonial-grid'
  | 'testimonial-carousel'
  | 'logo-cloud'
  | 'trust-badges'
  | 'case-study-card'

  // Media & visual
  | 'image-hero'
  | 'image-gallery'
  | 'before-after'
  | 'video-embed'
  | 'image-with-caption'

  // Conversion
  | 'cta-banner'
  | 'cta-inline'
  | 'cta-sticky'
  | 'lead-magnet-box'

  // Navigation & structure
  | 'toc-sidebar'
  | 'toc-inline'
  | 'author-box'
  | 'related-content'
  | 'breadcrumb'

  // Specialized
  | 'faq-accordion'
  | 'faq-cards'
  | 'key-takeaways'
  | 'summary-box'
  | 'sources-section';

// ============================================================================
// VISUAL STYLE
// ============================================================================

/**
 * High-level visual style direction for the page
 */
export type VisualStyle =
  | 'editorial'     // Clean, magazine-like, content-focused
  | 'marketing'     // Conversion-focused, bold CTAs
  | 'minimal'       // Sparse, lots of whitespace
  | 'bold'          // Strong colors, dramatic shadows
  | 'warm-modern';  // Friendly, approachable, soft edges

/**
 * Content pacing - how dense or spacious the layout feels
 */
export type ContentPacing = 'dense' | 'balanced' | 'spacious';

/**
 * Color intensity - how vibrant/saturated colors appear
 */
export type ColorIntensity = 'subtle' | 'moderate' | 'vibrant';

/**
 * Section emphasis level
 */
export type SectionEmphasis = 'background' | 'normal' | 'featured' | 'hero-moment';

/**
 * Section spacing
 */
export type SectionSpacing = 'tight' | 'normal' | 'breathe';

// ============================================================================
// PAGE STRATEGY
// ============================================================================

/**
 * Page-level design strategy determined by AI
 */
export interface PageStrategy {
  /** Overall visual direction */
  visualStyle: VisualStyle;

  /** Content density/spacing approach */
  pacing: ContentPacing;

  /** How vibrant colors should be */
  colorIntensity: ColorIntensity;

  /** Primary goal of the page */
  primaryGoal: 'inform' | 'convert' | 'engage' | 'educate';

  /** Buyer journey stage the content targets */
  buyerJourneyStage: 'awareness' | 'consideration' | 'decision' | 'retention';

  /** AI's explanation for these choices */
  reasoning: string;
}

// ============================================================================
// SECTION DESIGN
// ============================================================================

/**
 * Design specification for a single content section
 */
export interface SectionDesign {
  /** Unique identifier for this section */
  id: string;

  /** Original content from the article (preserved for SEO) */
  sourceContent: string;

  /** Optional heading for this section */
  heading?: string;

  /** Heading level (2-6, or 0 for no heading) */
  headingLevel: number;

  /** Presentation configuration */
  presentation: {
    /** Component type to use for rendering */
    component: ComponentType;

    /** Component variant (e.g., 'modern', 'classic', 'compact') */
    variant: string;

    /** Visual emphasis level */
    emphasis: SectionEmphasis;

    /** Spacing around section */
    spacing: SectionSpacing;

    /** Whether this section should have a distinct background */
    hasBackground: boolean;

    /** Whether to show a decorative border or divider */
    hasDivider: boolean;
  };

  /** AI's explanation for why this component was chosen */
  reasoning: string;

  /** Any section-specific styling hints */
  styleHints?: {
    /** Custom icon if applicable */
    icon?: string;
    /** Accent color override */
    accentColor?: string;
    /** Column count for grid layouts */
    columns?: 2 | 3 | 4;
    /** Animation on scroll */
    animateOnScroll?: boolean;
  };

  /** Child sections (for nested content) */
  children?: SectionDesign[];
}

// ============================================================================
// LAYOUT BLUEPRINT
// ============================================================================

/**
 * Complete layout blueprint for an article.
 * This is the primary output from the AI Architect.
 */
export interface LayoutBlueprint {
  /** Schema version for forward compatibility */
  version: '1.0';

  /** Unique identifier */
  id: string;

  /** Article/topic this blueprint is for */
  articleId: string;

  /** Page-level design strategy */
  pageStrategy: PageStrategy;

  /** Ordered list of section designs */
  sections: SectionDesign[];

  /** Global elements */
  globalElements: {
    /** Show table of contents */
    showToc: boolean;
    /** ToC position */
    tocPosition: 'sidebar' | 'inline' | 'floating';

    /** Show author box */
    showAuthorBox: boolean;
    /** Author box position */
    authorBoxPosition: 'top' | 'bottom' | 'both';

    /** CTA configuration */
    ctaStrategy: {
      /** Where to place CTAs */
      positions: ('after-intro' | 'mid-content' | 'before-faq' | 'end')[];
      /** CTA intensity/prominence */
      intensity: 'subtle' | 'moderate' | 'prominent';
      /** CTA style */
      style: 'inline' | 'banner' | 'floating';
    };

    /** Show sources/citations section */
    showSources: boolean;

    /** Show related content */
    showRelatedContent: boolean;
  };

  /** Metadata about generation */
  metadata: {
    /** When this blueprint was generated */
    generatedAt: string;
    /** AI model used */
    modelUsed: string;
    /** Generation duration in ms */
    generationDurationMs: number;
    /** Number of sections analyzed */
    sectionsAnalyzed: number;
    /** Content word count */
    wordCount: number;
  };
}

// ============================================================================
// ARCHITECT INPUT
// ============================================================================

/**
 * Business context from topical map
 */
export interface BusinessContext {
  name: string;
  industry: string;
  tone: string;
  positioning: string;
  targetAudience: string;
  uniqueSellingPoints?: string[];
}

/**
 * Market intelligence context
 */
export interface MarketContext {
  industryNorms: string[];
  trendingPatterns: string[];
  audienceExpectations: string[];
}

/**
 * Competitor analysis context
 */
export interface CompetitorContext {
  patterns: string[];
  strengths: string[];
  differentiationOpportunity: string;
}

/**
 * Existing site style context
 */
export interface SiteContext {
  existingStyle: string;
  primaryColor?: string;
  secondaryColor?: string;
  typography?: string;
}

/**
 * Content signals extracted from article
 */
export interface ContentSignals {
  pageType: string;
  buyerJourneyStage: 'awareness' | 'consideration' | 'decision' | 'retention';
  primaryIntent: 'inform' | 'persuade' | 'instruct' | 'compare';
  keyDifferentiators: string[];
  hasProcessSteps: boolean;
  hasFaq: boolean;
  hasTestimonials: boolean;
  hasBenefits: boolean;
  hasComparison: boolean;
  wordCount: number;
  readingLevel: 'simple' | 'moderate' | 'advanced';
}

/**
 * User preferences for styling
 */
export interface UserPreferences {
  styleLeaning: 'conservative' | 'modern' | 'bold' | 'auto';
  avoidPatterns?: string[];
  preferPatterns?: string[];
  colorPreference?: 'brand' | 'neutral' | 'vibrant';
}

/**
 * Complete input for the AI Architect
 */
export interface ArchitectInput {
  /** Raw article content (HTML or Markdown) */
  articleContent: string;

  /** Article title */
  articleTitle: string;

  /** Content brief if available */
  contentBrief?: {
    metaDescription: string;
    targetKeyword: string;
    secondaryKeywords: string[];
    intent: string;
  };

  /** Business context from topical map */
  business: BusinessContext;

  /** Market intelligence (optional) */
  marketContext?: MarketContext;

  /** Competitor analysis (optional) */
  competitorContext?: CompetitorContext;

  /** Existing site context (optional) */
  siteContext?: SiteContext;

  /** Content signals pre-extracted */
  contentSignals: ContentSignals;

  /** User preferences */
  preferences: UserPreferences;
}

// ============================================================================
// BLUEPRINT HIERARCHY
// ============================================================================

/**
 * Project-level blueprint defaults
 */
export interface ProjectBlueprint {
  projectId: string;
  defaults: {
    visualStyle: VisualStyle;
    pacing: ContentPacing;
    colorIntensity: ColorIntensity;
    ctaStrategy: LayoutBlueprint['globalElements']['ctaStrategy'];
  };
  componentPreferences: {
    preferredListStyle: 'bullet-list' | 'icon-list' | 'card-grid';
    preferredTimelineStyle: 'timeline-vertical' | 'timeline-zigzag' | 'steps-numbered';
    preferredFaqStyle: 'faq-accordion' | 'faq-cards';
  };
  avoidComponents: ComponentType[];
  reasoning: string;
  generatedAt: string;
}

/**
 * Topical map level blueprint defaults
 */
export interface TopicalMapBlueprint {
  topicalMapId: string;
  projectId: string;
  defaults: Partial<ProjectBlueprint['defaults']>;
  componentPreferences: Partial<ProjectBlueprint['componentPreferences']>;
  clusterSpecificRules?: {
    /** Rules for specific topic clusters */
    clusterId: string;
    overrides: Partial<PageStrategy>;
  }[];
  reasoning: string;
  generatedAt: string;
}

/**
 * Article-level user overrides
 */
export interface ArticleBlueprintOverrides {
  topicId: string;
  sectionOverrides: {
    sectionId: string;
    component?: ComponentType;
    variant?: string;
    emphasis?: SectionEmphasis;
    spacing?: SectionSpacing;
  }[];
  globalOverrides?: Partial<LayoutBlueprint['globalElements']>;
  pageStrategyOverrides?: Partial<PageStrategy>;
  appliedAt: string;
}

// ============================================================================
// REFINEMENT
// ============================================================================

/**
 * User refinement request for a section
 */
export interface SectionRefinementRequest {
  sectionId: string;
  action: 'change-component' | 'adjust-emphasis' | 'custom-instruction';
  newComponent?: ComponentType;
  newEmphasis?: SectionEmphasis;
  customInstruction?: string;
}

/**
 * Apply refinement to all similar sections
 */
export interface BulkRefinementRequest {
  /** Apply to all sections with this component type */
  sourceComponent: ComponentType;
  /** New component to use */
  targetComponent: ComponentType;
  /** Scope of application */
  scope: 'article' | 'topical-map' | 'project';
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Blueprint validation result
 */
export interface BlueprintValidation {
  isValid: boolean;
  errors: {
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }[];
  warnings: string[];
  seoPreservation: {
    headingHierarchyPreserved: boolean;
    schemaMarkupPreserved: boolean;
    contentIntegrityPreserved: boolean;
  };
}

// ============================================================================
// SERIALIZATION HELPERS
// ============================================================================

/**
 * Compact blueprint for storage (without full source content)
 */
export interface CompactBlueprint {
  version: '1.0';
  id: string;
  articleId: string;
  pageStrategy: PageStrategy;
  sections: Omit<SectionDesign, 'sourceContent'>[];
  globalElements: LayoutBlueprint['globalElements'];
  metadata: LayoutBlueprint['metadata'];
}

/**
 * Convert full blueprint to compact form for storage
 */
export function toCompactBlueprint(blueprint: LayoutBlueprint): CompactBlueprint {
  return {
    version: blueprint.version,
    id: blueprint.id,
    articleId: blueprint.articleId,
    pageStrategy: blueprint.pageStrategy,
    sections: blueprint.sections.map(({ sourceContent, ...rest }) => rest),
    globalElements: blueprint.globalElements,
    metadata: blueprint.metadata,
  };
}
