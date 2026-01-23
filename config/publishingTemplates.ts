/**
 * Publishing Templates Configuration
 *
 * Defines the 5 content type templates with their default configurations:
 * - Blog Article: Standard blog with ToC, Key Takeaways, FAQ
 * - Landing Page: High-conversion with CTAs, Benefits, Social Proof
 * - E-commerce Product: Product page with Specs, Gallery, Reviews
 * - E-commerce Category: Category page with Grid, Description
 * - Service Page: Service page with Process, Benefits, Team
 *
 * @module config/publishingTemplates
 */

import type {
  ContentTypeTemplate,
  ContentTemplateInfo,
  ComponentConfig,
  DesignTokens,
  PublishingStyle,
  StylePreset,
} from '../types/publishing';

// ============================================================================
// DEFAULT COMPONENT CONFIGURATIONS BY TEMPLATE
// ============================================================================

/**
 * Blog Article - Standard content-focused blog post
 * Key features: ToC sidebar, Key Takeaways box, FAQ accordion, Author box
 */
export const blogArticleComponents: ComponentConfig = {
  hero: {
    enabled: true,
    style: 'minimal',
    showImage: true,
    showSubtitle: true,
    ctaButton: false,
  },
  keyTakeaways: {
    enabled: true,
    position: 'after-intro',
    style: 'box',
    maxItems: 5,
  },
  toc: {
    enabled: true,
    position: 'sidebar',
    sticky: true,
    maxDepth: 3,
    collapsible: true,
  },
  ctaBanners: {
    enabled: true,
    intensity: 'low',
    positions: ['end'],
    style: 'box',
    primaryText: 'Meer Informatie',
    secondaryText: 'Contact',
  },
  faq: {
    enabled: true,
    style: 'accordion',
    showSchema: true,
  },
  authorBox: {
    enabled: true,
    position: 'bottom',
    showImage: true,
    showBio: true,
    showSocial: true,
  },
  relatedContent: {
    enabled: true,
    style: 'cards',
    maxItems: 3,
    showImages: true,
  },
  readingExperience: {
    progressBar: true,
    estimatedReadTime: true,
    socialShare: true,
    printOptimized: true,
    darkModeSupport: true,
  },
};

/**
 * Landing Page - High-conversion focused
 * Key features: Full-width hero, Benefits grid, Process steps, Multi-CTA
 */
export const landingPageComponents: ComponentConfig = {
  hero: {
    enabled: true,
    style: 'full-width',
    showImage: true,
    showSubtitle: true,
    ctaButton: true,
  },
  keyTakeaways: {
    enabled: false,
    position: 'top',
    style: 'icon-list',
    maxItems: 4,
  },
  toc: {
    enabled: false,
    position: 'inline',
    sticky: false,
    maxDepth: 2,
    collapsible: false,
  },
  ctaBanners: {
    enabled: true,
    intensity: 'high',
    positions: ['after-intro', 'mid-content', 'end'],
    style: 'full-width',
    // Note: These values should ideally come from localized defaults based on project language
    // For now using Dutch as the application default
    primaryText: 'Offerte Aanvragen',
    secondaryText: 'Meer Informatie',
  },
  faq: {
    enabled: true,
    style: 'accordion',
    showSchema: true,
  },
  authorBox: {
    enabled: false,
    position: 'bottom',
    showImage: false,
    showBio: false,
    showSocial: false,
  },
  relatedContent: {
    enabled: false,
    style: 'cards',
    maxItems: 0,
    showImages: false,
  },
  landing: {
    benefits: {
      enabled: true,
      columns: 3,
      style: 'icons',
    },
    processSteps: {
      enabled: true,
      style: 'numbered',
    },
    testimonials: {
      enabled: true,
      style: 'carousel',
      maxItems: 5,
    },
    socialProof: {
      enabled: true,
      showLogos: true,
      showStats: true,
    },
  },
  readingExperience: {
    progressBar: false,
    estimatedReadTime: false,
    socialShare: true,
    printOptimized: false,
    darkModeSupport: true,
  },
};

/**
 * E-commerce Product Page - Product-focused with purchase intent
 * Key features: Specs table, Gallery, Reviews, Buy CTA
 */
export const productPageComponents: ComponentConfig = {
  hero: {
    enabled: true,
    style: 'split',
    showImage: true,
    showSubtitle: true,
    ctaButton: true,
  },
  keyTakeaways: {
    enabled: true,
    position: 'top',
    style: 'icon-list',
    maxItems: 4,
  },
  toc: {
    enabled: false,
    position: 'inline',
    sticky: false,
    maxDepth: 2,
    collapsible: false,
  },
  ctaBanners: {
    enabled: true,
    intensity: 'high',
    positions: ['after-intro', 'end'],
    style: 'box',
    primaryText: 'Buy Now',
    secondaryText: 'Add to Cart',
  },
  faq: {
    enabled: true,
    style: 'list',
    showSchema: true,
  },
  authorBox: {
    enabled: false,
    position: 'bottom',
    showImage: false,
    showBio: false,
    showSocial: false,
  },
  relatedContent: {
    enabled: true,
    style: 'grid',
    maxItems: 4,
    showImages: true,
  },
  product: {
    specsTable: {
      enabled: true,
      style: 'table',
    },
    gallery: {
      enabled: true,
      style: 'lightbox',
    },
    reviews: {
      enabled: true,
      showRating: true,
      showCount: true,
    },
    pricing: {
      enabled: true,
      showCompare: true,
    },
  },
  readingExperience: {
    progressBar: false,
    estimatedReadTime: false,
    socialShare: true,
    printOptimized: false,
    darkModeSupport: true,
  },
};

/**
 * E-commerce Category Page - Category overview with product grid
 * Key features: Category intro, Featured items grid, Browse CTA
 */
export const categoryPageComponents: ComponentConfig = {
  hero: {
    enabled: true,
    style: 'centered',
    showImage: true,
    showSubtitle: true,
    ctaButton: false,
  },
  keyTakeaways: {
    enabled: false,
    position: 'top',
    style: 'box',
    maxItems: 0,
  },
  toc: {
    enabled: false,
    position: 'inline',
    sticky: false,
    maxDepth: 2,
    collapsible: false,
  },
  ctaBanners: {
    enabled: true,
    intensity: 'medium',
    positions: ['mid-content', 'end'],
    style: 'inline',
    primaryText: 'Browse All',
  },
  faq: {
    enabled: true,
    style: 'accordion',
    showSchema: true,
  },
  authorBox: {
    enabled: false,
    position: 'bottom',
    showImage: false,
    showBio: false,
    showSocial: false,
  },
  relatedContent: {
    enabled: true,
    style: 'grid',
    maxItems: 8,
    showImages: true,
  },
  readingExperience: {
    progressBar: false,
    estimatedReadTime: false,
    socialShare: false,
    printOptimized: false,
    darkModeSupport: true,
  },
};

/**
 * Service Page - Service-focused with consultation CTA
 * Key features: Process steps, Benefits, Team, Contact CTA
 */
export const servicePageComponents: ComponentConfig = {
  hero: {
    enabled: true,
    style: 'split',
    showImage: true,
    showSubtitle: true,
    ctaButton: true,
  },
  keyTakeaways: {
    enabled: true,
    position: 'after-intro',
    style: 'numbered-list',
    maxItems: 5,
  },
  toc: {
    enabled: true,
    position: 'inline',
    sticky: false,
    maxDepth: 2,
    collapsible: false,
  },
  ctaBanners: {
    enabled: true,
    intensity: 'medium',
    positions: ['mid-content', 'end'],
    style: 'box',
    primaryText: 'Get a Quote',
    secondaryText: 'Schedule Consultation',
  },
  faq: {
    enabled: true,
    style: 'accordion',
    showSchema: true,
  },
  authorBox: {
    enabled: false,
    position: 'bottom',
    showImage: false,
    showBio: false,
    showSocial: false,
  },
  relatedContent: {
    enabled: true,
    style: 'cards',
    maxItems: 3,
    showImages: true,
  },
  service: {
    processSteps: {
      enabled: true,
      style: 'timeline',
    },
    team: {
      enabled: true,
      style: 'grid',
      maxMembers: 4,
    },
    portfolio: {
      enabled: true,
      style: 'gallery',
      maxItems: 6,
    },
    contactCta: {
      enabled: true,
      style: 'button',
    },
  },
  readingExperience: {
    progressBar: false,
    estimatedReadTime: true,
    socialShare: true,
    printOptimized: false,
    darkModeSupport: true,
  },
};

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

/**
 * All template definitions with metadata
 */
export const contentTemplates: ContentTemplateInfo[] = [
  {
    id: 'blog-article',
    name: 'Blog Article',
    description: 'Standard blog post with ToC, key takeaways, FAQ, and author box. Best for informational content.',
    icon: '📝',
    defaultComponents: blogArticleComponents,
    suggestedFor: [
      'how-to guides',
      'educational content',
      'news articles',
      'opinion pieces',
      'tutorials',
      'listicles',
    ],
  },
  {
    id: 'landing-page',
    name: 'Landing Page',
    description: 'High-conversion page with benefits, social proof, testimonials, and multiple CTAs.',
    icon: '🚀',
    defaultComponents: landingPageComponents,
    suggestedFor: [
      'lead generation',
      'product launches',
      'campaign pages',
      'signup pages',
      'promotional content',
    ],
  },
  {
    id: 'ecommerce-product',
    name: 'Product Page',
    description: 'E-commerce product page with specs, gallery, reviews, and purchase CTAs.',
    icon: '🛍️',
    defaultComponents: productPageComponents,
    suggestedFor: [
      'product descriptions',
      'product comparisons',
      'product reviews',
      'affiliate content',
    ],
  },
  {
    id: 'ecommerce-category',
    name: 'Category Page',
    description: 'Category overview with featured items grid, descriptions, and browse CTAs.',
    icon: '📦',
    defaultComponents: categoryPageComponents,
    suggestedFor: [
      'category descriptions',
      'collection pages',
      'hub pages',
      'pillar content',
    ],
  },
  {
    id: 'service-page',
    name: 'Service Page',
    description: 'Service-focused page with process steps, team info, portfolio, and contact CTAs.',
    icon: '💼',
    defaultComponents: servicePageComponents,
    suggestedFor: [
      'service descriptions',
      'agency pages',
      'professional services',
      'consulting offers',
    ],
  },
];

/**
 * Get template info by ID
 */
export function getTemplateById(id: ContentTypeTemplate): ContentTemplateInfo | undefined {
  return contentTemplates.find(t => t.id === id);
}

/**
 * Get default components for a template
 */
export function getDefaultComponents(template: ContentTypeTemplate): ComponentConfig {
  const templateInfo = getTemplateById(template);
  return templateInfo?.defaultComponents ?? blogArticleComponents;
}

// ============================================================================
// DEFAULT DESIGN TOKENS
// ============================================================================

/**
 * Default design tokens (neutral, professional)
 */
export const defaultDesignTokens: DesignTokens = {
  colors: {
    primary: '#3B82F6',      // Blue 500
    secondary: '#1E40AF',    // Blue 800
    accent: '#F59E0B',       // Amber 500
    background: '#FFFFFF',
    surface: '#F9FAFB',      // Gray 50
    text: '#111827',         // Gray 900
    textMuted: '#6B7280',    // Gray 500
    border: '#E5E7EB',       // Gray 200
    success: '#10B981',      // Emerald 500
    warning: '#F59E0B',      // Amber 500
    error: '#EF4444',        // Red 500
  },
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  spacing: {
    sectionGap: 'normal',
    contentWidth: 'standard',
    paragraphSpacing: 'normal',
  },
  borderRadius: 'rounded',
  shadows: 'subtle',
  typography: {
    headingWeight: 'semibold',
    bodyLineHeight: 'relaxed',
    headingLineHeight: 'tight',
  },
};

/**
 * Create default publishing style from design tokens
 */
export function createDefaultPublishingStyle(projectId?: string): PublishingStyle {
  return {
    id: crypto.randomUUID(),
    name: 'Default Style',
    projectId,
    isDefault: true,
    designTokens: defaultDesignTokens,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// STYLE PRESETS
// ============================================================================

/**
 * Pre-defined style presets for quick selection
 */
export const stylePresets: StylePreset[] = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean, minimal design with plenty of whitespace',
    designTokens: {
      colors: {
        primary: '#18181B',      // Zinc 900
        secondary: '#3F3F46',    // Zinc 700
        accent: '#3B82F6',       // Blue 500
        background: '#FFFFFF',
        surface: '#FAFAFA',      // Zinc 50
        text: '#18181B',
        textMuted: '#71717A',    // Zinc 500
        border: '#E4E4E7',       // Zinc 200
        success: '#22C55E',
        warning: '#EAB308',
        error: '#EF4444',
      },
      spacing: {
        sectionGap: 'spacious',
        contentWidth: 'narrow',
        paragraphSpacing: 'relaxed',
      },
      borderRadius: 'subtle',
      shadows: 'none',
    },
  },
  {
    id: 'corporate-professional',
    name: 'Corporate Professional',
    description: 'Traditional corporate style with strong hierarchy',
    designTokens: {
      colors: {
        primary: '#1E3A5F',      // Navy
        secondary: '#2563EB',    // Blue 600
        accent: '#059669',       // Emerald 600
        background: '#FFFFFF',
        surface: '#F8FAFC',      // Slate 50
        text: '#0F172A',         // Slate 900
        textMuted: '#64748B',    // Slate 500
        border: '#CBD5E1',       // Slate 300
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626',
      },
      spacing: {
        sectionGap: 'normal',
        contentWidth: 'standard',
        paragraphSpacing: 'normal',
      },
      borderRadius: 'subtle',
      shadows: 'subtle',
      typography: {
        headingWeight: 'bold',
        bodyLineHeight: 'normal',
        headingLineHeight: 'tight',
      },
    },
  },
  {
    id: 'bold-creative',
    name: 'Bold Creative',
    description: 'Eye-catching design with bold colors and shadows',
    designTokens: {
      colors: {
        primary: '#7C3AED',      // Violet 600
        secondary: '#DB2777',    // Pink 600
        accent: '#F59E0B',       // Amber 500
        background: '#FAFAF9',   // Stone 50
        surface: '#FFFFFF',
        text: '#1C1917',         // Stone 900
        textMuted: '#78716C',    // Stone 500
        border: '#D6D3D1',       // Stone 300
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      spacing: {
        sectionGap: 'spacious',
        contentWidth: 'wide',
        paragraphSpacing: 'relaxed',
      },
      borderRadius: 'rounded',
      shadows: 'dramatic',
      typography: {
        headingWeight: 'bold',
        bodyLineHeight: 'relaxed',
        headingLineHeight: 'normal',
      },
    },
  },
  {
    id: 'warm-friendly',
    name: 'Warm & Friendly',
    description: 'Approachable design with warm tones',
    designTokens: {
      colors: {
        primary: '#EA580C',      // Orange 600
        secondary: '#B45309',    // Amber 700
        accent: '#0D9488',       // Teal 600
        background: '#FFFBEB',   // Amber 50
        surface: '#FFFFFF',
        text: '#292524',         // Stone 800
        textMuted: '#78716C',    // Stone 500
        border: '#E7E5E4',       // Stone 200
        success: '#16A34A',
        warning: '#CA8A04',
        error: '#DC2626',
      },
      spacing: {
        sectionGap: 'normal',
        contentWidth: 'standard',
        paragraphSpacing: 'relaxed',
      },
      borderRadius: 'rounded',
      shadows: 'subtle',
      typography: {
        headingWeight: 'semibold',
        bodyLineHeight: 'relaxed',
        headingLineHeight: 'normal',
      },
    },
  },
  {
    id: 'tech-clean',
    name: 'Tech Clean',
    description: 'Modern tech aesthetic with clean lines',
    designTokens: {
      colors: {
        primary: '#0EA5E9',      // Sky 500
        secondary: '#0284C7',    // Sky 600
        accent: '#8B5CF6',       // Violet 500
        background: '#FFFFFF',
        surface: '#F0F9FF',      // Sky 50
        text: '#0C4A6E',         // Sky 900
        textMuted: '#64748B',    // Slate 500
        border: '#E0F2FE',       // Sky 100
        success: '#10B981',
        warning: '#F59E0B',
        error: '#F43F5E',
      },
      fonts: {
        heading: 'Geist, Inter, system-ui, sans-serif',
        body: 'Geist, Inter, system-ui, sans-serif',
        mono: 'Geist Mono, JetBrains Mono, monospace',
      },
      spacing: {
        sectionGap: 'compact',
        contentWidth: 'standard',
        paragraphSpacing: 'normal',
      },
      borderRadius: 'rounded',
      shadows: 'medium',
      typography: {
        headingWeight: 'medium',
        bodyLineHeight: 'normal',
        headingLineHeight: 'tight',
      },
    },
  },
];

/**
 * Get style preset by ID
 */
export function getStylePresetById(id: string): StylePreset | undefined {
  return stylePresets.find(p => p.id === id);
}

/**
 * Apply preset to existing design tokens (merges partial tokens)
 */
export function applyPresetToTokens(
  baseTokens: DesignTokens,
  preset: StylePreset
): DesignTokens {
  return {
    ...baseTokens,
    colors: {
      ...baseTokens.colors,
      ...preset.designTokens.colors,
    },
    fonts: {
      ...baseTokens.fonts,
      ...preset.designTokens.fonts,
    },
    spacing: {
      ...baseTokens.spacing,
      ...preset.designTokens.spacing,
    },
    borderRadius: preset.designTokens.borderRadius ?? baseTokens.borderRadius,
    shadows: preset.designTokens.shadows ?? baseTokens.shadows,
    typography: {
      ...baseTokens.typography,
      ...preset.designTokens.typography,
    },
  };
}

// ============================================================================
// CONTENT PATTERN DETECTION
// ============================================================================

/**
 * Patterns for detecting content type from article structure
 * Used to suggest appropriate template
 */
export const contentPatterns = {
  'blog-article': [
    /how\s+to/i,
    /what\s+is/i,
    /guide/i,
    /tutorial/i,
    /tips\s+for/i,
    /\d+\s+(best|top|ways)/i,
    /explained/i,
    /introduction\s+to/i,
  ],
  'landing-page': [
    /get\s+started/i,
    /sign\s+up/i,
    /free\s+trial/i,
    /start\s+your/i,
    /transform\s+your/i,
    /grow\s+your/i,
    /boost\s+your/i,
  ],
  'ecommerce-product': [
    /buy\s+(now|online)/i,
    /add\s+to\s+cart/i,
    /specifications/i,
    /product\s+details/i,
    /\$\d+(\.\d{2})?/,
    /price:/i,
    /in\s+stock/i,
  ],
  'ecommerce-category': [
    /browse\s+(all|our)/i,
    /shop\s+(by|all)/i,
    /collection/i,
    /category/i,
    /all\s+\w+\s+products/i,
  ],
  'service-page': [
    /our\s+services/i,
    /we\s+offer/i,
    /consultation/i,
    /get\s+a\s+quote/i,
    /contact\s+us/i,
    /work\s+with\s+us/i,
    /hire\s+us/i,
  ],
};

/**
 * Suggest template based on content analysis
 */
export function suggestTemplate(content: string, title: string): ContentTypeTemplate {
  const combinedText = `${title} ${content}`.toLowerCase();

  const scores: Record<ContentTypeTemplate, number> = {
    'blog-article': 0,
    'landing-page': 0,
    'ecommerce-product': 0,
    'ecommerce-category': 0,
    'service-page': 0,
  };

  for (const [template, patterns] of Object.entries(contentPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(combinedText)) {
        scores[template as ContentTypeTemplate] += 1;
      }
    }
  }

  // Find highest scoring template (default to blog-article)
  let bestTemplate: ContentTypeTemplate = 'blog-article';
  let bestScore = 0;

  for (const [template, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestTemplate = template as ContentTypeTemplate;
    }
  }

  return bestTemplate;
}
