/**
 * Publishing Types Module
 *
 * Contains types for the styled content publishing system including:
 * - Content type templates (Blog, Landing, Product, Service, Category)
 * - Publishing styles extending BrandKit
 * - Layout configurations with component toggles
 * - Styled content output interfaces
 *
 * Created: 2026-01-22 - Styled Content Publishing System
 *
 * @module types/publishing
 */

import { BrandKit } from './business';

// ============================================================================
// CONTENT TYPE TEMPLATES
// ============================================================================

/**
 * Available content type templates
 * Each template has different component configurations and default layouts
 */
export type ContentTypeTemplate =
  | 'blog-article'        // Standard blog post with ToC, Key Takeaways, FAQ
  | 'landing-page'        // High-conversion page with CTAs, Benefits, Social Proof
  | 'ecommerce-product'   // Product page with Specs, Gallery, Reviews
  | 'ecommerce-category'  // Category page with Grid, Description, Filters
  | 'service-page';       // Service page with Process, Benefits, Team, Contact

/**
 * Template metadata for UI display
 */
export interface ContentTemplateInfo {
  id: ContentTypeTemplate;
  name: string;
  description: string;
  icon: string;
  defaultComponents: ComponentConfig;
  suggestedFor: string[];  // Content characteristics that match this template
}

// ============================================================================
// DESIGN TOKENS (Extended from BrandKit)
// ============================================================================

/**
 * Extended design tokens for publishing styles
 * Builds upon BrandKit with additional tokens for layout and typography
 */
export interface DesignTokens {
  colors: {
    primary: string;       // Main brand color (from BrandKit)
    secondary: string;     // Secondary brand color (from BrandKit)
    accent: string;        // Accent for CTAs and highlights
    background: string;    // Page background
    surface: string;       // Card/section backgrounds
    text: string;          // Main text color
    textMuted: string;     // Secondary text color
    border: string;        // Border color
    success: string;       // Success state
    warning: string;       // Warning state
    error: string;         // Error state
  };
  fonts: {
    heading: string;       // Heading font family (from BrandKit)
    body: string;          // Body font family (from BrandKit)
    mono?: string;         // Monospace font for code
  };
  spacing: {
    sectionGap: 'compact' | 'normal' | 'spacious';
    contentWidth: 'narrow' | 'standard' | 'wide' | 'full';
    paragraphSpacing: 'tight' | 'normal' | 'relaxed';
  };
  borderRadius: 'none' | 'subtle' | 'rounded' | 'pill';
  shadows: 'none' | 'subtle' | 'medium' | 'dramatic';
  typography: {
    headingWeight: 'normal' | 'medium' | 'semibold' | 'bold';
    bodyLineHeight: 'tight' | 'normal' | 'relaxed';
    headingLineHeight: 'tight' | 'normal' | 'relaxed';
  };
}

/**
 * Publishing style configuration
 * Extends BrandKit concept with full design tokens for publishing
 */
export interface PublishingStyle {
  id: string;
  name: string;
  projectId?: string;      // If project-specific
  isDefault: boolean;      // Default style for project
  sourceUrl?: string;      // URL used for brand detection (future)
  designTokens: DesignTokens;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert BrandKit to PublishingStyle design tokens
 */
export type BrandKitToTokens = (brandKit: BrandKit) => Partial<DesignTokens>;

// ============================================================================
// LAYOUT COMPONENT CONFIGURATIONS
// ============================================================================

/**
 * Hero section configuration
 */
export interface HeroConfig {
  enabled: boolean;
  style: 'minimal' | 'full-width' | 'split' | 'centered';
  showImage: boolean;
  showSubtitle: boolean;
  ctaButton: boolean;
}

/**
 * Key Takeaways box configuration
 */
export interface KeyTakeawaysConfig {
  enabled: boolean;
  position: 'top' | 'after-intro';
  style: 'box' | 'numbered-list' | 'icon-list';
  maxItems: number;
}

/**
 * Table of Contents configuration
 */
export interface TocConfig {
  enabled: boolean;
  position: 'sidebar' | 'inline' | 'floating';
  sticky: boolean;
  maxDepth: 2 | 3 | 4;
  collapsible: boolean;
}

/**
 * CTA Banner configuration
 */
export interface CtaBannerConfig {
  enabled: boolean;
  intensity: 'none' | 'low' | 'medium' | 'high';
  positions: ('after-intro' | 'mid-content' | 'before-faq' | 'end')[];
  style: 'inline' | 'box' | 'full-width';
  primaryText?: string;    // CTA button text
  secondaryText?: string;  // CTA description
}

/**
 * FAQ section configuration
 */
export interface FaqConfig {
  enabled: boolean;
  style: 'accordion' | 'list' | 'grid';
  showSchema: boolean;     // Include FAQ schema markup
}

/**
 * Author box configuration
 */
export interface AuthorBoxConfig {
  enabled: boolean;
  position: 'top' | 'bottom' | 'both';
  showImage: boolean;
  showBio: boolean;
  showSocial: boolean;
}

/**
 * Related topics/products configuration
 */
export interface RelatedContentConfig {
  enabled: boolean;
  style: 'cards' | 'list' | 'grid';
  maxItems: number;
  showImages: boolean;
}

/**
 * Product-specific components
 */
export interface ProductComponentsConfig {
  specsTable: {
    enabled: boolean;
    style: 'table' | 'list' | 'grid';
  };
  gallery: {
    enabled: boolean;
    style: 'carousel' | 'grid' | 'lightbox';
  };
  reviews: {
    enabled: boolean;
    showRating: boolean;
    showCount: boolean;
  };
  pricing: {
    enabled: boolean;
    showCompare: boolean;
  };
}

/**
 * Landing page specific components
 */
export interface LandingComponentsConfig {
  benefits: {
    enabled: boolean;
    columns: 2 | 3 | 4;
    style: 'icons' | 'cards' | 'list';
  };
  processSteps: {
    enabled: boolean;
    style: 'numbered' | 'timeline' | 'cards';
  };
  testimonials: {
    enabled: boolean;
    style: 'carousel' | 'grid' | 'quotes';
    maxItems: number;
  };
  socialProof: {
    enabled: boolean;
    showLogos: boolean;
    showStats: boolean;
  };
}

/**
 * Service page specific components
 */
export interface ServiceComponentsConfig {
  processSteps: {
    enabled: boolean;
    style: 'numbered' | 'timeline' | 'cards';
  };
  team: {
    enabled: boolean;
    style: 'grid' | 'list';
    maxMembers: number;
  };
  portfolio: {
    enabled: boolean;
    style: 'gallery' | 'cards';
    maxItems: number;
  };
  contactCta: {
    enabled: boolean;
    style: 'form' | 'button' | 'calendar';
  };
}

/**
 * Reading experience enhancements
 */
export interface ReadingExperienceConfig {
  progressBar: boolean;
  estimatedReadTime: boolean;
  socialShare: boolean;
  printOptimized: boolean;
  darkModeSupport: boolean;
}

/**
 * All component configurations combined
 */
export interface ComponentConfig {
  hero: HeroConfig;
  keyTakeaways: KeyTakeawaysConfig;
  toc: TocConfig;
  ctaBanners: CtaBannerConfig;
  faq: FaqConfig;
  authorBox: AuthorBoxConfig;
  relatedContent: RelatedContentConfig;
  // Template-specific (only one set active based on template)
  product?: ProductComponentsConfig;
  landing?: LandingComponentsConfig;
  service?: ServiceComponentsConfig;
  readingExperience: ReadingExperienceConfig;
}

/**
 * Complete layout configuration
 */
export interface LayoutConfiguration {
  id: string;
  name: string;
  userId?: string;         // User-level template
  projectId?: string;      // Project-level override
  template: ContentTypeTemplate;
  components: ComponentConfig;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// STYLED CONTENT OUTPUT
// ============================================================================

/**
 * CSS variables generated from design tokens
 */
export interface CssVariables {
  '--ctc-primary': string;
  '--ctc-secondary': string;
  '--ctc-accent': string;
  '--ctc-background': string;
  '--ctc-surface': string;
  '--ctc-text': string;
  '--ctc-text-muted': string;
  '--ctc-border': string;
  '--ctc-font-heading': string;
  '--ctc-font-body': string;
  '--ctc-font-mono'?: string;
  '--ctc-radius': string;
  '--ctc-shadow': string;
  '--ctc-section-gap': string;
  '--ctc-content-width': string;
  [key: string]: string | undefined;
}

/**
 * Detected component in content
 */
export interface DetectedComponent {
  type: 'hero' | 'key-takeaways' | 'toc' | 'faq' | 'author-box' | 'cta' | 'content-section' | 'image' | 'table' | 'list';
  startIndex: number;
  endIndex: number;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Styled HTML output
 */
export interface StyledContentOutput {
  html: string;              // Full styled HTML
  css: string;               // Scoped CSS to inject
  cssVariables: CssVariables;
  components: DetectedComponent[];
  seoValidation: SeoValidationResult;
  template: ContentTypeTemplate;
}

/**
 * SEO validation result for styled content
 */
export interface SeoValidationResult {
  isValid: boolean;
  warnings: SeoWarning[];
  headingStructure: {
    hasH1: boolean;
    hierarchy: string[];     // ['h1', 'h2', 'h2', 'h3', ...]
    issues: string[];
  };
  schemaPreserved: boolean;
  metaPreserved: boolean;
}

/**
 * Individual SEO warning
 */
export interface SeoWarning {
  type: 'heading' | 'schema' | 'meta' | 'accessibility' | 'content';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

// ============================================================================
// PUBLISHING WORKFLOW STATE
// ============================================================================

/**
 * Style publish modal step
 */
export type StylePublishStep = 'brand-style' | 'layout-config' | 'blueprint' | 'preview' | 'publish-options';

/**
 * Device preview mode
 */
export type DevicePreview = 'desktop' | 'tablet' | 'mobile';

/**
 * Style publish modal state
 */
export interface StylePublishModalState {
  currentStep: StylePublishStep;
  style: PublishingStyle | null;
  layout: LayoutConfiguration | null;
  preview: StyledContentOutput | null;
  devicePreview: DevicePreview;
  isGenerating: boolean;
  errors: string[];
}

/**
 * WordPress style injection method
 */
export type StyleInjectionMethod = 'scoped-css' | 'inline-styles' | 'theme-override';

/**
 * Extended publish options with styling
 */
export interface StyledPublishOptions {
  // From existing PublishOptions
  connectionId: string;
  postType: 'post' | 'page';
  status: 'draft' | 'publish' | 'pending' | 'future';
  scheduledDate?: string;
  categoryId?: number;
  tags?: string[];
  focusKeyword?: string;
  metaDescription?: string;

  // Style-specific options
  styleConfig: PublishingStyle;
  layoutConfig: LayoutConfiguration;
  injectionMethod: StyleInjectionMethod;
  includeProgressBar: boolean;
  includeTocScript: boolean;
}

// ============================================================================
// DATABASE TYPES (for Supabase integration)
// ============================================================================

/**
 * Database row for publishing_styles table
 */
export interface PublishingStyleRow {
  id: string;
  project_id: string;
  name: string;
  is_default: boolean;
  source_url: string | null;
  design_tokens: DesignTokens;
  created_at: string;
  updated_at: string;
}

/**
 * Database row for layout_templates table
 */
export interface LayoutTemplateRow {
  id: string;
  user_id: string;
  name: string;
  template_type: ContentTypeTemplate;
  layout_config: Omit<LayoutConfiguration, 'id' | 'name' | 'userId' | 'projectId' | 'template' | 'createdAt' | 'updatedAt'>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Extended wordpress_publications columns
 */
export interface PublicationStyleColumns {
  style_config: PublishingStyle | null;
  layout_config: LayoutConfiguration | null;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Template component count for UI display
 */
export interface TemplateComponentCount {
  total: number;
  enabled: number;
  categories: {
    layout: number;
    content: number;
    conversion: number;
    experience: number;
  };
}

/**
 * Style preset for quick selection
 */
export interface StylePreset {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  designTokens: Partial<DesignTokens>;
}

/**
 * Default style presets
 */
export type StylePresetId =
  | 'modern-minimal'
  | 'corporate-professional'
  | 'bold-creative'
  | 'warm-friendly'
  | 'tech-clean';

// ============================================================================
// DESIGN SYSTEM v2.0 RE-EXPORTS
// ============================================================================

// These types are re-exported from the new design system modules for convenience.
// For full implementations, import directly from the respective modules.

/**
 * Re-export semantic extractor types
 */
export type {
  SemanticContentData,
  ExtractedEntity,
  ExtractedKeywords,
  TopicalContext,
  AuthorshipData,
  SourceCitation,
} from '../services/publishing/semanticExtractor';

/**
 * Re-export JSON-LD generator types
 */
export type { JsonLdOptions } from '../services/publishing/jsonLdGenerator';

/**
 * Re-export token resolver types
 */
export type { ResolvedTokens } from '../services/publishing/tokenResolver';

/**
 * Re-export component registry types
 */
export type {
  ComponentDefinition,
  ComponentVariants,
  ComponentName,
} from '../services/publishing/components/registry';

/**
 * Re-export class generator types
 */
export type {
  VariantSelection,
  GeneratedComponent,
} from '../services/publishing/components/classGenerator';

/**
 * Re-export HTML builder types
 */
export type {
  ArticleSection,
  FaqItem,
  TimelineStep,
  TestimonialItem,
  BenefitItem,
  CtaConfig,
  HeadingItem,
} from '../services/publishing/htmlBuilder';

/**
 * Re-export content analyzer types
 */
export type {
  ContentAnalysisResult,
  CtaPlacement,
} from '../services/publishing/contentAnalyzer';

/**
 * Re-export CSS generator types
 */
export type {
  CssGenerationOptions,
  GeneratedCss,
} from '../services/publishing/cssGenerator';

/**
 * Re-export page assembler types
 */
export type {
  PageTemplate,
  PageAssemblyOptions,
  SeoConfiguration,
  CtaConfiguration,
  StyledContentOutput as AssembledPageOutput,
  DetectedComponent as AssembledDetectedComponent,
  SeoValidationResult as AssembledSeoValidation,
  SeoIssue,
  AssemblyMetadata,
} from '../services/publishing/pageAssembler';

/**
 * Re-export design personality types
 */
export type {
  DesignPersonality,
  TypographyPersonality,
  ColorPersonality,
  LayoutPersonality,
  MotionPersonality,
  DesignPersonalityId,
} from '../config/designTokens/personalities';
