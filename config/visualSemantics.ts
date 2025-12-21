/**
 * Visual Semantics Configuration
 * Based on Koray Tugberk GÜBÜR's "Pixels, Letters, and Bytes" Framework
 *
 * This framework establishes that search engines evaluate web content through
 * three interconnected channels: visual elements (pixels), textual content (letters),
 * and technical data (bytes). Optimal SEO requires all three to work in semantic harmony.
 *
 * Key principles:
 * - Layout affects semantic meaning
 * - Images must reinforce the page's Centerpiece Annotation
 * - Alt text must contain entities and serve accessibility
 * - Visual hierarchy must align with content hierarchy
 */

import type { VisualSemanticRule, ImageOptimizationSpec, VisualSemanticRuleType } from '../types';

// =============================================================================
// ALT TEXT RULES
// Based on Koray's 7 characteristics of effective alt text
// =============================================================================

export const ALT_TEXT_RULES: VisualSemanticRule[] = [
  {
    id: 'alt-entity',
    rule_type: 'alt_text',
    name: 'Entity Presence',
    description: 'Must contain at least one entity name (not just generic descriptors)',
    validation_fn: 'validateAltTextEntityPresence',
    weight: 25,
    is_critical: true,
  },
  {
    id: 'alt-natural',
    rule_type: 'alt_text',
    name: 'Natural Language Flow',
    description: 'Words flow naturally without forced keyword insertion',
    validation_fn: 'validateAltTextNaturalFlow',
    weight: 20,
    is_critical: false,
  },
  {
    id: 'alt-content-purpose',
    rule_type: 'alt_text',
    name: 'Content & Purpose',
    description: 'Describes visual content AND explains why the image exists on this page',
    validation_fn: 'validateAltTextContentPurpose',
    weight: 20,
    is_critical: true,
  },
  {
    id: 'alt-no-stuffing',
    rule_type: 'alt_text',
    name: 'No Keyword Stuffing',
    description: 'No repeated keywords - each keyword should appear at most once',
    validation_fn: 'validateAltTextNoStuffing',
    weight: 15,
    is_critical: true,
  },
  {
    id: 'alt-intent-alignment',
    rule_type: 'alt_text',
    name: 'Search Intent Alignment',
    description: 'Increases relevance for target user queries',
    validation_fn: 'validateAltTextIntentAlignment',
    weight: 10,
    is_critical: false,
  },
  {
    id: 'alt-accessibility',
    rule_type: 'alt_text',
    name: 'Web Accessibility',
    description: 'Supports screen readers and assistive technology',
    validation_fn: 'validateAltTextAccessibility',
    weight: 10,
    is_critical: true,
  },
];

// =============================================================================
// FILE NAMING RULES
// Pattern: [primary-subject]-[secondary-descriptor]-[context].extension
// =============================================================================

export const FILE_NAMING_RULES: VisualSemanticRule[] = [
  {
    id: 'file-hyphen-separator',
    rule_type: 'file_naming',
    name: 'Hyphen Separator',
    description: 'Use hyphens as word separators (not underscores or spaces)',
    validation_fn: 'validateFileNameHyphens',
    weight: 30,
    is_critical: true,
  },
  {
    id: 'file-entity-keyword',
    rule_type: 'file_naming',
    name: 'Entity Keyword',
    description: 'Include primary topic/entity keyword in filename',
    validation_fn: 'validateFileNameEntity',
    weight: 35,
    is_critical: true,
  },
  {
    id: 'file-alt-match',
    rule_type: 'file_naming',
    name: 'Alt Text Match',
    description: 'File name should share vocabulary with alt text attribute',
    validation_fn: 'validateFileNameAltMatch',
    weight: 25,
    is_critical: false,
  },
  {
    id: 'file-pattern',
    rule_type: 'file_naming',
    name: 'Pattern Structure',
    description: 'Follow [entity]-[descriptor]-[context] pattern',
    validation_fn: 'validateFileNamePattern',
    weight: 10,
    is_critical: false,
  },
];

// =============================================================================
// PLACEMENT RULES
// Based on wrapper text and semantic proximity
// =============================================================================

export const PLACEMENT_RULES: VisualSemanticRule[] = [
  {
    id: 'placement-section',
    rule_type: 'placement',
    name: 'Section Relevance',
    description: 'Image appears within relevant content section, not randomly placed',
    validation_fn: 'validatePlacementSection',
    weight: 30,
    is_critical: true,
  },
  {
    id: 'placement-hierarchy',
    rule_type: 'placement',
    name: 'Visual-Content Hierarchy',
    description: 'Visual hierarchy aligns with content hierarchy (H1→H2→H3)',
    validation_fn: 'validatePlacementHierarchy',
    weight: 25,
    is_critical: false,
  },
  {
    id: 'placement-featured',
    rule_type: 'placement',
    name: 'Featured Image Relevance',
    description: 'Featured/hero image connects to page primary topic and title',
    validation_fn: 'validatePlacementFeatured',
    weight: 25,
    is_critical: true,
  },
  {
    id: 'placement-centerpiece',
    rule_type: 'placement',
    name: 'Centerpiece Alignment',
    description: 'Images support (not contradict) the page Centerpiece Annotation',
    validation_fn: 'validatePlacementCenterpiece',
    weight: 20,
    is_critical: true,
  },
];

// =============================================================================
// SEMANTIC HTML STRUCTURE RULES
// =============================================================================

export const STRUCTURE_RULES: VisualSemanticRule[] = [
  {
    id: 'structure-figure',
    rule_type: 'structure',
    name: 'Figure Element',
    description: 'Images wrapped in <figure> semantic HTML element',
    validation_fn: 'validateStructureFigure',
    weight: 25,
    is_critical: false,
  },
  {
    id: 'structure-figcaption',
    rule_type: 'structure',
    name: 'Figcaption Present',
    description: '<figcaption> provides visible caption reinforcing topic entities',
    validation_fn: 'validateStructureFigcaption',
    weight: 20,
    is_critical: false,
  },
  {
    id: 'structure-dimensions',
    rule_type: 'structure',
    name: 'Width/Height Attributes',
    description: 'width and height attributes present to prevent CLS',
    validation_fn: 'validateStructureDimensions',
    weight: 20,
    is_critical: true,
  },
  {
    id: 'structure-alt-present',
    rule_type: 'structure',
    name: 'Alt Attribute',
    description: 'alt attribute present (empty only for decorative images)',
    validation_fn: 'validateStructureAlt',
    weight: 20,
    is_critical: true,
  },
  {
    id: 'structure-picture',
    rule_type: 'structure',
    name: 'Picture Element',
    description: '<picture> element with AVIF/WebP sources for format fallbacks',
    validation_fn: 'validateStructurePicture',
    weight: 15,
    is_critical: false,
  },
];

// =============================================================================
// FORMAT OPTIMIZATION RULES
// =============================================================================

export const FORMAT_RULES: VisualSemanticRule[] = [
  {
    id: 'format-modern',
    rule_type: 'format',
    name: 'Modern Format',
    description: 'Use AVIF or WebP format (AVIF preferred)',
    validation_fn: 'validateFormatModern',
    weight: 35,
    is_critical: false,
  },
  {
    id: 'format-width',
    rule_type: 'format',
    name: 'Optimal Width',
    description: 'Standard width of 600px for content images',
    validation_fn: 'validateFormatWidth',
    weight: 25,
    is_critical: false,
  },
  {
    id: 'format-lcp',
    rule_type: 'format',
    name: 'LCP Preload',
    description: 'Preload LCP (Largest Contentful Paint) images',
    validation_fn: 'validateFormatLCP',
    weight: 25,
    is_critical: false,
  },
  {
    id: 'format-sitemap',
    rule_type: 'format',
    name: 'Image Sitemap',
    description: 'Images included in image sitemap for discovery',
    validation_fn: 'validateFormatSitemap',
    weight: 15,
    is_critical: false,
  },
];

// =============================================================================
// IMAGE FORMAT HIERARCHY
// AVIF > WebP > JPEG/PNG
// =============================================================================

export const IMAGE_FORMAT_HIERARCHY = ['avif', 'webp', 'jpeg', 'png'] as const;

export const FORMAT_DETAILS: Record<string, { compression: string; support: string; recommendation: string }> = {
  avif: {
    compression: '36% better than WebP',
    support: 'Chrome 85+, Firefox 93+, Safari 16+',
    recommendation: 'Best choice for modern browsers',
  },
  webp: {
    compression: 'Superior to JPEG with broad support',
    support: '95%+ browser coverage',
    recommendation: 'Good fallback for AVIF',
  },
  jpeg: {
    compression: 'Standard lossy compression',
    support: 'Universal',
    recommendation: 'Legacy fallback only',
  },
  png: {
    compression: 'Lossless, larger file size',
    support: 'Universal',
    recommendation: 'Only for transparency needs',
  },
};

// =============================================================================
// DEFAULT IMAGE SPECS
// =============================================================================

export const DEFAULT_IMAGE_SPECS: ImageOptimizationSpec = {
  recommended_format: 'avif',
  max_width: 600,
  max_file_size_kb: 150,
  required_attributes: ['alt', 'width', 'height', 'loading'],
  semantic_html_structure: 'figure > picture > img',
};

export const HERO_IMAGE_SPECS: ImageOptimizationSpec = {
  recommended_format: 'avif',
  max_width: 1200,
  max_file_size_kb: 300,
  required_attributes: ['alt', 'width', 'height', 'fetchpriority'],
  semantic_html_structure: 'figure > picture > img',
};

// =============================================================================
// HTML TEMPLATES
// Ready-to-use semantic HTML for images
// =============================================================================

export const SEMANTIC_IMAGE_TEMPLATE = `<figure itemscope itemtype="https://schema.org/ImageObject">
  <picture>
    <source srcset="{path}.avif" type="image/avif">
    <source srcset="{path}.webp" type="image/webp">
    <img src="{path}.jpg"
         alt="{alt_text}"
         title="{title}"
         width="{width}"
         height="{height}"
         itemprop="contentUrl"
         loading="lazy">
  </picture>
  <figcaption itemprop="description">{caption}</figcaption>
</figure>`;

export const HERO_IMAGE_TEMPLATE = `<figure itemscope itemtype="https://schema.org/ImageObject" class="hero-image">
  <picture>
    <source srcset="{path}.avif" type="image/avif">
    <source srcset="{path}.webp" type="image/webp">
    <img src="{path}.jpg"
         alt="{alt_text}"
         title="{title}"
         width="{width}"
         height="{height}"
         itemprop="contentUrl"
         fetchpriority="high">
  </picture>
  <figcaption itemprop="description">{caption}</figcaption>
</figure>`;

export const DECORATIVE_IMAGE_TEMPLATE = `<img src="{path}.webp"
     alt=""
     width="{width}"
     height="{height}"
     loading="lazy"
     role="presentation">`;

// =============================================================================
// FILE NAMING PATTERN
// =============================================================================

export const FILE_NAMING_PATTERN = '[primary-subject]-[secondary-descriptor]-[context]';

export const FILE_NAMING_EXAMPLES = [
  {
    bad: 'IMG_1234.jpg',
    good: 'tesla-model-3-charging-home-station.avif',
    explanation: 'Includes entity (Tesla Model 3) and context (charging at home)',
  },
  {
    bad: 'electric-car.png',
    good: 'cathedral-notre-dame-paris-sunset.webp',
    explanation: 'Specific entity (Notre Dame) rather than generic (cathedral)',
  },
  {
    bad: 'screenshot_2024.png',
    good: 'iphone-15-pro-camera-interface-night-mode.avif',
    explanation: 'Describes specific feature in context',
  },
];

// =============================================================================
// ALT TEXT EXAMPLES
// Good vs Bad patterns
// =============================================================================

export const ALT_TEXT_EXAMPLES = [
  {
    bad: 'Electric car',
    good: 'Tesla Model S white sedan on highway with mountains in background',
    explanation: 'Specific entity (Tesla Model S) with scene context',
  },
  {
    bad: 'Cathedral',
    good: 'Cathedral Notre Dame de Paris surrounded by cherry blossom trees in spring',
    explanation: 'Named entity with temporal and environmental context',
  },
  {
    bad: 'Phone camera',
    good: 'iPhone 15 Pro Max titanium blue color front and back view showing camera array',
    explanation: 'Full product name with specific attributes',
  },
  {
    bad: 'SEO, keywords, optimization, search engine, ranking',
    good: 'Diagram showing how Google crawls and indexes web pages through a flowchart',
    explanation: 'Describes actual visual content instead of keyword stuffing',
  },
];

// =============================================================================
// IMAGE N-GRAM EXPECTATIONS BY SEARCH INTENT
// What types of images rank for different query types
// =============================================================================

export const IMAGE_NGRAM_BY_INTENT: Record<string, string[]> = {
  informational: [
    'diagrams',
    'infographics',
    'flowcharts',
    'step-by-step illustrations',
    'comparison charts',
    'screenshots',
  ],
  transactional: [
    'product photos',
    'multiple angles',
    'lifestyle shots',
    'size comparisons',
    'unboxing images',
    'detail shots',
  ],
  commercial: [
    'comparison tables',
    'feature matrices',
    'before/after photos',
    'testimonial images',
    'pricing tables',
    'demo screenshots',
  ],
  navigational: [
    'brand logos',
    'UI screenshots',
    'app interfaces',
    'location maps',
    'team photos',
  ],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all rules for a specific rule type
 */
export function getRulesByType(type: VisualSemanticRuleType): VisualSemanticRule[] {
  const ruleMap: Record<VisualSemanticRuleType, VisualSemanticRule[]> = {
    alt_text: ALT_TEXT_RULES,
    file_naming: FILE_NAMING_RULES,
    placement: PLACEMENT_RULES,
    structure: STRUCTURE_RULES,
    format: FORMAT_RULES,
    semantic_html: STRUCTURE_RULES, // Alias
  };
  return ruleMap[type] || [];
}

/**
 * Get all critical rules
 */
export function getCriticalRules(): VisualSemanticRule[] {
  return [
    ...ALT_TEXT_RULES,
    ...FILE_NAMING_RULES,
    ...PLACEMENT_RULES,
    ...STRUCTURE_RULES,
    ...FORMAT_RULES,
  ].filter(rule => rule.is_critical);
}

/**
 * Get total weight for a rule type
 */
export function getTotalWeight(type: VisualSemanticRuleType): number {
  return getRulesByType(type).reduce((sum, rule) => sum + rule.weight, 0);
}

/**
 * Generate HTML from template
 */
export function generateImageHTML(
  template: string,
  vars: Record<string, string | number>
): string {
  let html = template;
  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return html;
}

/**
 * Generate recommended filename from entities and context
 */
export function generateRecommendedFilename(
  primaryEntity: string,
  descriptor: string,
  context: string,
  format: string = 'avif'
): string {
  const slugify = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

  const parts = [primaryEntity, descriptor, context]
    .filter(Boolean)
    .map(slugify);

  return `${parts.join('-')}.${format}`;
}

// =============================================================================
// VISUAL BRAND CONSISTENCY TRACKING
// Based on Koray's case study: "visual brand consistency functions as entity signal"
// Logo colors should be "represented in every image, the background of some answer
// boxes, buttons, and other design elements"
// =============================================================================

export interface BrandColorSpec {
  primary: string;         // Main brand color (hex)
  secondary: string;       // Secondary brand color (hex)
  accent?: string;         // Accent color for CTAs (hex)
  textOnPrimary: string;   // Text color on primary background
  textOnSecondary: string; // Text color on secondary background
}

export interface BrandConsistencyScore {
  overall: number;                    // 0-100
  colorPresence: number;              // Brand colors found in images
  logoUsage: number;                  // Logo placement consistency
  styleConsistency: number;           // Visual style uniformity
  issues: BrandConsistencyIssue[];
  recommendations: string[];
}

export interface BrandConsistencyIssue {
  severity: 'critical' | 'warning' | 'info';
  element: string;          // Which image/element has the issue
  issue: string;            // Description of the issue
  suggestion: string;       // How to fix it
}

export interface VisualBrandProfile {
  colors: BrandColorSpec;
  logoPlacement: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  logoOpacity: number;                // 0-100
  imageStyle: 'photographic' | 'illustrative' | 'flat-design' | 'mixed';
  overlayGradient?: string;           // CSS gradient for image overlays
  fontFamily?: string;                // For text-on-image elements
  borderRadius?: number;              // Consistent corner styling (px)
}

/**
 * Visual Brand Consistency Rules
 */
export const BRAND_CONSISTENCY_RULES: VisualSemanticRule[] = [
  {
    id: 'brand-color-presence',
    rule_type: 'structure', // Using 'structure' as closest match
    name: 'Brand Color Presence',
    description: 'Brand colors (primary/secondary) should appear in hero images, backgrounds, or overlays',
    validation_fn: 'validateBrandColorPresence',
    weight: 30,
    is_critical: true,
  },
  {
    id: 'brand-logo-consistency',
    rule_type: 'structure',
    name: 'Logo Placement Consistency',
    description: 'Logo should appear in consistent position across hero images and infographics',
    validation_fn: 'validateLogoConsistency',
    weight: 25,
    is_critical: false,
  },
  {
    id: 'brand-style-uniformity',
    rule_type: 'structure',
    name: 'Visual Style Uniformity',
    description: 'All images should follow same visual style (photographic, illustrative, etc.)',
    validation_fn: 'validateStyleUniformity',
    weight: 20,
    is_critical: false,
  },
  {
    id: 'brand-overlay-consistency',
    rule_type: 'structure',
    name: 'Overlay/Gradient Consistency',
    description: 'Image overlays should use consistent gradient or color treatment',
    validation_fn: 'validateOverlayConsistency',
    weight: 15,
    is_critical: false,
  },
  {
    id: 'brand-typography-on-image',
    rule_type: 'structure',
    name: 'Typography on Images',
    description: 'Text overlays on images should use brand fonts and colors',
    validation_fn: 'validateTypographyOnImage',
    weight: 10,
    is_critical: false,
  },
];

/**
 * Default brand profile for new projects
 */
export const DEFAULT_BRAND_PROFILE: VisualBrandProfile = {
  colors: {
    primary: '#1E3A5F',      // Deep blue
    secondary: '#2196F3',     // Bright blue
    accent: '#FF9800',        // Orange for CTAs
    textOnPrimary: '#FFFFFF',
    textOnSecondary: '#000000',
  },
  logoPlacement: 'bottom-right',
  logoOpacity: 85,
  imageStyle: 'photographic',
  borderRadius: 8,
};

/**
 * Brand consistency scoring weights
 */
export const BRAND_CONSISTENCY_WEIGHTS = {
  colorPresence: 35,
  logoUsage: 25,
  styleConsistency: 25,
  overlayConsistency: 10,
  typographyConsistency: 5,
};

/**
 * Calculate brand consistency score for a set of images
 */
export function calculateBrandConsistencyScore(
  images: Array<{
    hasLogo?: boolean;
    logoPosition?: string;
    dominantColors?: string[];
    style?: string;
    hasOverlay?: boolean;
    overlayType?: string;
    hasText?: boolean;
    textStyle?: string;
  }>,
  brandProfile: VisualBrandProfile
): BrandConsistencyScore {
  const issues: BrandConsistencyIssue[] = [];
  const recommendations: string[] = [];

  if (images.length === 0) {
    return {
      overall: 0,
      colorPresence: 0,
      logoUsage: 0,
      styleConsistency: 0,
      issues: [{ severity: 'warning', element: 'N/A', issue: 'No images to analyze', suggestion: 'Add images with visual semantics to evaluate brand consistency' }],
      recommendations: ['Add images with enhanced visual semantics data'],
    };
  }

  // Color presence score
  const colorMatches = images.filter(img => {
    if (!img.dominantColors) return false;
    const normalizedColors = img.dominantColors.map(c => c.toLowerCase());
    return normalizedColors.some(c =>
      c === brandProfile.colors.primary.toLowerCase() ||
      c === brandProfile.colors.secondary.toLowerCase()
    );
  }).length;
  const colorPresence = Math.round((colorMatches / images.length) * 100);

  if (colorPresence < 50) {
    issues.push({
      severity: 'warning',
      element: 'Overall',
      issue: `Only ${colorPresence}% of images contain brand colors`,
      suggestion: 'Add brand color overlays, borders, or backgrounds to images',
    });
    recommendations.push('Consider adding colored borders or overlays with your brand colors');
  }

  // Logo usage score
  const logoImages = images.filter(img => img.hasLogo);
  const logoUsage = Math.round((logoImages.length / images.length) * 100);

  // Check logo position consistency
  const logoPositions = logoImages.map(img => img.logoPosition).filter(Boolean);
  const uniquePositions = new Set(logoPositions);
  if (uniquePositions.size > 1) {
    issues.push({
      severity: 'info',
      element: 'Logo',
      issue: `Logo appears in ${uniquePositions.size} different positions`,
      suggestion: `Standardize logo placement to ${brandProfile.logoPlacement}`,
    });
  }

  // Style consistency score
  const imageStyles = images.map(img => img.style).filter(Boolean);
  const styleCounts = new Map<string, number>();
  imageStyles.forEach(style => {
    styleCounts.set(style!, (styleCounts.get(style!) || 0) + 1);
  });
  const dominantStyle = [...styleCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const styleConsistency = dominantStyle
    ? Math.round((dominantStyle[1] / images.length) * 100)
    : 0;

  if (styleConsistency < 70) {
    issues.push({
      severity: 'warning',
      element: 'Style',
      issue: 'Images have inconsistent visual styles',
      suggestion: `Aim for ${brandProfile.imageStyle} style across all images`,
    });
    recommendations.push(`Standardize image style to ${brandProfile.imageStyle}`);
  }

  // Calculate overall score
  const overall = Math.round(
    (colorPresence * BRAND_CONSISTENCY_WEIGHTS.colorPresence / 100) +
    (logoUsage * BRAND_CONSISTENCY_WEIGHTS.logoUsage / 100) +
    (styleConsistency * BRAND_CONSISTENCY_WEIGHTS.styleConsistency / 100)
  );

  // Add recommendations based on scores
  if (logoUsage < 30) {
    recommendations.push('Add your logo to hero images and infographics (bottom-right at 85% opacity recommended)');
  }
  if (overall < 60) {
    recommendations.push('Review Koray\'s case study on visual brand consistency - consistent styling helps Google associate your visual content with your brand entity');
  }

  return {
    overall,
    colorPresence,
    logoUsage,
    styleConsistency,
    issues,
    recommendations,
  };
}

/**
 * Generate CSS variables for brand consistency
 */
export function generateBrandCSSVariables(profile: VisualBrandProfile): string {
  return `:root {
  --brand-primary: ${profile.colors.primary};
  --brand-secondary: ${profile.colors.secondary};
  --brand-accent: ${profile.colors.accent || profile.colors.secondary};
  --brand-text-on-primary: ${profile.colors.textOnPrimary};
  --brand-text-on-secondary: ${profile.colors.textOnSecondary};
  --brand-logo-opacity: ${profile.logoOpacity / 100};
  --brand-border-radius: ${profile.borderRadius || 8}px;
  ${profile.overlayGradient ? `--brand-overlay: ${profile.overlayGradient};` : ''}
  ${profile.fontFamily ? `--brand-font: ${profile.fontFamily};` : ''}
}`;
}

/**
 * Hero image overlay template with brand colors
 */
export const BRANDED_HERO_TEMPLATE = `<figure class="branded-hero" itemscope itemtype="https://schema.org/ImageObject">
  <picture>
    <source srcset="{path}.avif" type="image/avif">
    <source srcset="{path}.webp" type="image/webp">
    <img src="{path}.jpg"
         alt="{alt_text}"
         title="{title}"
         width="{width}"
         height="{height}"
         itemprop="contentUrl"
         fetchpriority="high">
  </picture>
  <div class="hero-overlay" style="background: linear-gradient(to top, var(--brand-primary) 0%, transparent 60%);">
    <img src="/images/logo.svg" class="brand-logo" alt="{brand_name} logo"
         style="position: absolute; {logo_position}: 1rem; opacity: var(--brand-logo-opacity); height: 40px;">
  </div>
  <figcaption itemprop="description">{caption}</figcaption>
</figure>`;

/**
 * Image styles CSS for brand consistency
 */
export const BRAND_IMAGE_STYLES = `
.branded-hero {
  position: relative;
  overflow: hidden;
  border-radius: var(--brand-border-radius);
}

.hero-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40%;
  pointer-events: none;
}

.brand-logo {
  z-index: 10;
}

.branded-content-image {
  border: 2px solid var(--brand-primary);
  border-radius: var(--brand-border-radius);
}

.branded-infographic {
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%);
  padding: 1rem;
  border-radius: var(--brand-border-radius);
}
`;
