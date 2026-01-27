/**
 * Design DNA Types
 *
 * Complete design system extracted from a brand's website via AI Vision.
 * This is the foundation for generating unique brand design systems.
 */

export interface ColorWithUsage {
  hex: string;
  usage: string;
  confidence: number;
}

export interface DesignDNA {
  // COLOR SYSTEM
  colors: {
    primary: ColorWithUsage;
    primaryLight: ColorWithUsage;
    primaryDark: ColorWithUsage;
    secondary: ColorWithUsage;
    accent: ColorWithUsage;
    neutrals: {
      darkest: string;
      dark: string;
      medium: string;
      light: string;
      lightest: string;
    };
    semantic: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    harmony: 'monochromatic' | 'complementary' | 'analogous' | 'triadic' | 'split-complementary';
    dominantMood: 'corporate' | 'creative' | 'luxurious' | 'friendly' | 'bold' | 'minimal';
    contrastLevel: 'high' | 'medium' | 'subtle';
  };

  // TYPOGRAPHY SYSTEM
  typography: {
    headingFont: {
      family: string;
      fallback: string;
      weight: number;
      style: 'serif' | 'sans-serif' | 'display' | 'slab' | 'mono';
      character: 'modern' | 'classic' | 'playful' | 'corporate' | 'elegant';
    };
    bodyFont: {
      family: string;
      fallback: string;
      weight: number;
      style: 'serif' | 'sans-serif';
      lineHeight: number;
    };
    scaleRatio: number;
    baseSize: string;
    headingCase: 'none' | 'uppercase' | 'capitalize';
    headingLetterSpacing: string;
    usesDropCaps: boolean;
    headingUnderlineStyle: 'none' | 'solid' | 'gradient' | 'decorative';
    linkStyle: 'underline' | 'color-only' | 'animated-underline' | 'highlight';
  };

  // SPACING & RHYTHM
  spacing: {
    baseUnit: number;
    density: 'compact' | 'comfortable' | 'spacious' | 'airy';
    sectionGap: 'tight' | 'moderate' | 'generous' | 'dramatic';
    contentWidth: 'narrow' | 'medium' | 'wide' | 'full';
    whitespacePhilosophy: 'minimal' | 'balanced' | 'luxurious';
  };

  // SHAPE LANGUAGE
  shapes: {
    borderRadius: {
      style: 'sharp' | 'subtle' | 'rounded' | 'pill' | 'mixed';
      small: string;
      medium: string;
      large: string;
      full: string;
    };
    buttonStyle: 'sharp' | 'soft' | 'rounded' | 'pill';
    cardStyle: 'flat' | 'subtle-shadow' | 'elevated' | 'bordered' | 'glass';
    inputStyle: 'minimal' | 'bordered' | 'filled' | 'underlined';
  };

  // VISUAL EFFECTS
  effects: {
    shadows: {
      style: 'none' | 'subtle' | 'medium' | 'dramatic' | 'colored';
      cardShadow: string;
      buttonShadow: string;
      elevatedShadow: string;
    };
    gradients: {
      usage: 'none' | 'subtle' | 'prominent';
      primaryGradient: string;
      heroGradient: string;
      ctaGradient: string;
    };
    backgrounds: {
      usesPatterns: boolean;
      patternType?: 'dots' | 'grid' | 'waves' | 'geometric' | 'organic';
      usesTextures: boolean;
      usesOverlays: boolean;
    };
    borders: {
      style: 'none' | 'subtle' | 'visible' | 'decorative';
      defaultColor: string;
      accentBorderUsage: boolean;
    };
  };

  // DECORATIVE ELEMENTS
  decorative: {
    dividerStyle: 'none' | 'line' | 'gradient' | 'decorative' | 'icon';
    usesFloatingShapes: boolean;
    usesCornerAccents: boolean;
    usesWaveShapes: boolean;
    usesGeometricPatterns: boolean;
    iconStyle: 'outline' | 'solid' | 'duotone' | 'custom';
    decorativeAccentColor: string;
  };

  // LAYOUT PATTERNS
  layout: {
    gridStyle: 'strict-12' | 'asymmetric' | 'fluid' | 'modular';
    alignment: 'left' | 'center' | 'mixed';
    heroStyle: 'full-bleed' | 'contained' | 'split' | 'minimal' | 'video' | 'animated';
    cardLayout: 'grid' | 'masonry' | 'list' | 'carousel' | 'stacked';
    ctaPlacement: 'inline' | 'floating' | 'section-end' | 'prominent-banner';
    navigationStyle: 'minimal' | 'standard' | 'mega-menu' | 'sidebar';
  };

  // MOTION & INTERACTION
  motion: {
    overall: 'static' | 'subtle' | 'dynamic' | 'expressive';
    transitionSpeed: 'instant' | 'fast' | 'normal' | 'slow';
    easingStyle: 'linear' | 'ease' | 'spring' | 'bounce';
    hoverEffects: {
      buttons: 'none' | 'darken' | 'lift' | 'glow' | 'fill' | 'scale';
      cards: 'none' | 'lift' | 'tilt' | 'glow' | 'border';
      links: 'none' | 'underline' | 'color' | 'highlight';
    };
    scrollAnimations: boolean;
    parallaxEffects: boolean;
  };

  // IMAGE TREATMENT
  images: {
    treatment: 'natural' | 'duotone' | 'grayscale' | 'high-contrast' | 'colorized';
    frameStyle: 'none' | 'rounded' | 'shadow' | 'border' | 'custom-mask';
    hoverEffect: 'none' | 'zoom' | 'overlay' | 'caption-reveal';
    aspectRatioPreference: '16:9' | '4:3' | '1:1' | 'mixed';
  };

  // COMPONENT PREFERENCES
  componentPreferences: {
    preferredListStyle: 'bullets' | 'icons' | 'cards' | 'numbered';
    preferredCardStyle: 'minimal' | 'bordered' | 'elevated' | 'glass';
    testimonialStyle: 'card' | 'quote' | 'carousel' | 'grid';
    faqStyle: 'accordion' | 'cards' | 'list';
    ctaStyle: 'button' | 'banner' | 'floating' | 'inline';
  };

  // BRAND PERSONALITY
  personality: {
    overall: 'corporate' | 'creative' | 'luxurious' | 'friendly' | 'bold' | 'minimal' | 'elegant' | 'playful';
    formality: 1 | 2 | 3 | 4 | 5;
    energy: 1 | 2 | 3 | 4 | 5;
    warmth: 1 | 2 | 3 | 4 | 5;
    trustSignals: 'minimal' | 'moderate' | 'prominent';
  };

  // CONFIDENCE & METADATA
  confidence: {
    overall: number;
    colorsConfidence: number;
    typographyConfidence: number;
    layoutConfidence: number;
  };

  analysisNotes: string[];
}

export interface DesignDNAExtractionResult {
  designDna: DesignDNA;
  screenshotBase64: string;
  screenshotUrl?: string;
  sourceUrl: string;
  extractedAt: string;
  aiModel: string;
  processingTimeMs: number;
}

// ============================================================================
// BRAND HTML TEMPLATES (AI-Generated per brand personality)
// ============================================================================

/**
 * HTML template for a component type - AI generates UNIQUE structures per brand
 * Corporate brands get structured layouts, creative brands get dynamic ones, etc.
 */
export interface ComponentHtmlTemplate {
  /** The HTML template string with {{content}}, {{heading}}, {{items}} placeholders */
  template: string;
  /** CSS classes used in this template (for validation) */
  cssClasses: string[];
  /** Slots that can receive content */
  slots: ('content' | 'heading' | 'items' | 'icon' | 'badge' | 'image' | 'cta')[];
  /** Variants of this template (e.g., 'featured', 'minimal') */
  variants?: Record<string, string>;
}

/**
 * Complete set of HTML templates for a brand
 * Each brand gets UNIQUE HTML structures based on their personality
 */
export interface BrandHtmlTemplates {
  /** Hero/header section template */
  hero: ComponentHtmlTemplate;
  /** Regular prose/content section */
  prose: ComponentHtmlTemplate;
  /** Card grid layout */
  cardGrid: ComponentHtmlTemplate;
  /** Timeline/process steps */
  timeline: ComponentHtmlTemplate;
  /** FAQ/accordion section */
  faq: ComponentHtmlTemplate;
  /** Call-to-action section */
  cta: ComponentHtmlTemplate;
  /** Key takeaways/summary box */
  keyTakeaways: ComponentHtmlTemplate;
  /** Bullet/feature list */
  bulletList: ComponentHtmlTemplate;
  /** Highlight/callout box */
  highlightBox: ComponentHtmlTemplate;
  /** Table of contents */
  toc: ComponentHtmlTemplate;
  /** Comparison table */
  comparisonTable: ComponentHtmlTemplate;
  /** Testimonial/quote section */
  testimonial: ComponentHtmlTemplate;
}

// ============================================================================
// BRAND DESIGN SYSTEM (Generated from Design DNA)
// ============================================================================

export interface ComponentStyleDefinition {
  baseCSS: string;
  variants: Record<string, string>;
  states: {
    hover?: string;
    active?: string;
    focus?: string;
    disabled?: string;
  };
  responsive?: {
    mobile?: string;
    tablet?: string;
  };
}

export interface BrandDesignSystem {
  id: string;
  brandName: string;
  sourceUrl: string;
  generatedAt: string;
  designDnaHash: string;

  // CSS TOKENS
  tokens: {
    css: string;
    json: Record<string, string>;
  };

  // COMPONENT STYLES
  componentStyles: {
    button: ComponentStyleDefinition;
    card: ComponentStyleDefinition;
    hero: ComponentStyleDefinition;
    timeline: ComponentStyleDefinition;
    testimonial: ComponentStyleDefinition;
    faq: ComponentStyleDefinition;
    cta: ComponentStyleDefinition;
    keyTakeaways: ComponentStyleDefinition;
    prose: ComponentStyleDefinition;
    list: ComponentStyleDefinition;
    table: ComponentStyleDefinition;
    blockquote: ComponentStyleDefinition;
  };

  // DECORATIVE ELEMENTS
  decorative: {
    dividers: {
      default: string;
      subtle: string;
      decorative: string;
    };
    sectionBackgrounds: {
      default: string;
      accent: string;
      featured: string;
    };
    shapes?: {
      topWave?: string;
      bottomWave?: string;
      cornerAccent?: string;
      floatingOrb?: string;
    };
    patterns?: {
      dots?: string;
      grid?: string;
      custom?: string;
    };
  };

  // MICRO-INTERACTIONS
  interactions: {
    buttonHover: string;
    buttonActive: string;
    buttonFocus: string;
    cardHover: string;
    linkHover: string;
    focusRing: string;
    keyframes: Record<string, string>;
  };

  // TYPOGRAPHY TREATMENTS
  typographyTreatments: {
    headingDecoration: string;
    dropCap: string;
    pullQuote: string;
    listMarker: string;
    linkUnderline: string;
    codeBlock: string;
  };

  // IMAGE TREATMENTS
  imageTreatments: {
    defaultFrame: string;
    featured: string;
    thumbnail: string;
    gallery: string;
    mask?: string;
    overlay?: string;
  };

  // COMPLETE COMPILED CSS
  compiledCss: string;

  // VARIANT MAPPINGS
  variantMappings: {
    card: Record<string, string>;
    hero: Record<string, string>;
    button: Record<string, string>;
    cta: Record<string, string>;
  };

  // ============================================================================
  // AI-GENERATED HTML TEMPLATES (The key to brand-unique output)
  // ============================================================================

  /**
   * AI-generated HTML templates unique to this brand's personality
   * Corporate brands → structured, professional layouts
   * Creative brands → dynamic, asymmetric layouts
   * Minimal brands → sparse, clean layouts
   *
   * If not present, falls back to generic semantic HTML
   */
  htmlTemplates?: BrandHtmlTemplates;
}
