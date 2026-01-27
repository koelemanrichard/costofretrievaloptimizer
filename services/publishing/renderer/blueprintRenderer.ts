/**
 * Blueprint Renderer
 *
 * Transforms a LayoutBlueprint into semantic HTML output.
 * This is a deterministic process - same blueprint always produces same HTML.
 *
 * @module services/publishing/renderer/blueprintRenderer
 */

import type { LayoutBlueprint, SectionDesign, VisualStyle } from '../architect/blueprintTypes';
import { getComponentRenderer, type RenderContext } from './componentLibrary';
import { generateDesignSystemCss, type GeneratedCss } from '../cssGenerator';
import { extractSemanticData, type SemanticContentData } from '../semanticExtractor';
import { generateJsonLd, type JsonLdOptions } from '../jsonLdGenerator';
import type { ContentBrief, EnrichedTopic, TopicalMap } from '../../../types';
import type { DesignPersonality } from '../../../config/designTokens/personalities';
import { designPersonalities } from '../../../config/designTokens/personalities';
import type { BrandDesignSystem } from '../../../types/designDna';

// ============================================================================
// TYPES
// ============================================================================

export interface BlueprintRenderOptions {
  /** Content brief for semantic extraction */
  brief?: ContentBrief;
  /** Topic data */
  topic?: EnrichedTopic;
  /** Topical map for context */
  topicalMap?: TopicalMap;
  /** Design personality override */
  personalityId?: string;
  /**
   * Full Brand Design System (takes precedence over designTokens)
   * This is THE KEY: Use the complete compiled CSS from the brand design system
   * instead of just generating CSS variable overrides.
   */
  brandDesignSystem?: BrandDesignSystem;
  /**
   * Legacy: Custom design tokens (colors, fonts, etc.) from BrandStyleStep
   * @deprecated Use brandDesignSystem for full brand styling
   */
  designTokens?: {
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
      background?: string;
      surface?: string;
      text?: string;
      textMuted?: string;
      border?: string;
    };
    fonts?: {
      heading?: string;
      body?: string;
    };
  };
  /** Include dark mode CSS */
  darkMode?: boolean;
  /** Minify CSS output */
  minifyCss?: boolean;
  /** Language code for localized defaults (e.g., 'nl', 'en', 'de') */
  language?: string;
  /** Hero image URL */
  heroImage?: string;
  /** CTA configuration */
  ctaConfig?: {
    primaryText?: string;
    primaryUrl?: string;
    secondaryText?: string;
    secondaryUrl?: string;
    bannerTitle?: string;
    bannerText?: string;
  };
  /** Author info for author box */
  author?: {
    name: string;
    title?: string;
    bio?: string;
    imageUrl?: string;
  };
}

export interface BlueprintRenderOutput {
  /** Complete HTML output */
  html: string;
  /** Generated CSS */
  css: string;
  /** JSON-LD structured data */
  jsonLd: string;
  /** Metadata about the render */
  metadata: {
    blueprint: {
      id: string;
      version: string;
      visualStyle: VisualStyle;
    };
    sectionsRendered: number;
    componentsUsed: string[];
    renderDurationMs: number;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convert custom design tokens to CSS variable overrides
 */
function convertDesignTokensToOverrides(tokens: BlueprintRenderOptions['designTokens']): Record<string, string> {
  const overrides: Record<string, string> = {};

  if (tokens?.colors) {
    if (tokens.colors.primary) {
      overrides['--ctc-primary'] = tokens.colors.primary;
      // Generate light/dark variants
      overrides['--ctc-primary-light'] = adjustColorBrightness(tokens.colors.primary, 20);
      overrides['--ctc-primary-dark'] = adjustColorBrightness(tokens.colors.primary, -20);
    }
    if (tokens.colors.secondary) {
      overrides['--ctc-secondary'] = tokens.colors.secondary;
    }
    if (tokens.colors.accent) {
      overrides['--ctc-accent'] = tokens.colors.accent;
    }
    if (tokens.colors.background) {
      overrides['--ctc-background'] = tokens.colors.background;
    }
    if (tokens.colors.surface) {
      overrides['--ctc-surface'] = tokens.colors.surface;
      overrides['--ctc-surface-elevated'] = adjustColorBrightness(tokens.colors.surface, 5);
    }
    if (tokens.colors.text) {
      overrides['--ctc-text'] = tokens.colors.text;
      overrides['--ctc-text-secondary'] = adjustColorBrightness(tokens.colors.text, 30);
    }
    if (tokens.colors.textMuted) {
      overrides['--ctc-text-muted'] = tokens.colors.textMuted;
    }
    if (tokens.colors.border) {
      overrides['--ctc-border'] = tokens.colors.border;
      overrides['--ctc-border-subtle'] = adjustColorBrightness(tokens.colors.border, 20);
    }
  }

  if (tokens?.fonts) {
    if (tokens.fonts.heading) {
      overrides['--ctc-font-display'] = tokens.fonts.heading;
    }
    if (tokens.fonts.body) {
      overrides['--ctc-font-body'] = tokens.fonts.body;
    }
  }

  return overrides;
}

/**
 * Adjust color brightness (simple hex color adjustment)
 */
function adjustColorBrightness(hex: string, percent: number): string {
  // Handle both 3 and 6 character hex codes
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('');
  }

  const num = parseInt(h, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(255 * percent / 100)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100)));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + Math.round(255 * percent / 100)));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Get mapped variant class from brand design system
 *
 * THE KEY FIX: Maps generic variant names (e.g., 'clean', 'modern') to
 * brand-specific CSS classes (e.g., 'ctc-faq--corporate-clean')
 */
function getMappedVariantClass(
  component: string,
  variant: string | undefined,
  brandSystem?: BrandDesignSystem
): string | undefined {
  if (!variant || !brandSystem?.variantMappings) return undefined;

  // Normalize component name for lookup (e.g., 'faq-accordion' -> 'faq')
  const componentKey = component.split('-')[0];

  // Try exact component match first
  const mappings = brandSystem.variantMappings as Record<string, Record<string, string> | undefined>;
  let componentMappings = mappings[component];

  // Fall back to normalized key
  if (!componentMappings) {
    componentMappings = mappings[componentKey];
  }

  return componentMappings?.[variant];
}

// ============================================================================
// MAIN RENDERER
// ============================================================================

/**
 * Render a LayoutBlueprint to styled HTML
 */
export function renderBlueprint(
  blueprint: LayoutBlueprint,
  articleTitle: string,
  options: BlueprintRenderOptions = {}
): BlueprintRenderOutput {
  const startTime = Date.now();
  const componentsUsed: string[] = [];
  const jsonLdParts: object[] = [];

  // Get design personality based on visual style
  const personalityId = options.personalityId || mapVisualStyleToPersonality(blueprint.pageStrategy.visualStyle);
  const personality = designPersonalities[personalityId] || designPersonalities['corporate-professional'];

  // Build HTML parts
  const htmlParts: string[] = [];

  // 1. Hero section (using title and meta description)
  if (blueprint.sections.length > 0) {
    const heroHtml = renderHero(
      articleTitle,
      blueprint.sections[0].sourceContent,
      blueprint.pageStrategy,
      options.heroImage,
      options.ctaConfig,
      blueprint.globalElements.ctaStrategy.intensity,
      options.language,
      options.topicalMap
    );
    htmlParts.push(heroHtml);
    componentsUsed.push('hero');
  }

  // 2. Table of Contents (if enabled) & 3. Main content sections
  const isSidebarLayout = blueprint.globalElements.showToc && blueprint.globalElements.tocPosition === 'sidebar';

  // Render TOC for non-sidebar positions (inline or floating)
  if (blueprint.globalElements.showToc && blueprint.globalElements.tocPosition !== 'sidebar') {
    const tocHtml = renderToc(blueprint, blueprint.globalElements.tocPosition);
    htmlParts.push(tocHtml);
    componentsUsed.push('toc');
  }

  // For sidebar layout, wrap TOC and content in a grid container
  if (isSidebarLayout) {
    htmlParts.push('<div class="ctc-layout-sidebar lg:grid lg:grid-cols-[280px_1fr] lg:gap-8 relative">');
    // Render sidebar TOC
    const tocHtml = renderToc(blueprint, 'sidebar');
    htmlParts.push(`<aside class="ctc-sidebar hidden lg:block">${tocHtml}</aside>`);
    componentsUsed.push('toc');
    // Open content wrapper
    htmlParts.push('<div class="ctc-content-wrapper">');
  }

  // 3. Main content sections
  htmlParts.push('<main class="ctc-main" role="main">');
  htmlParts.push('<article class="ctc-article" itemscope itemtype="https://schema.org/Article">');
  htmlParts.push(`<meta itemprop="headline" content="${escapeHtml(articleTitle)}">`);

  // Skip first section if it was used as intro in hero
  const sectionsToRender = blueprint.sections;

  for (let i = 0; i < sectionsToRender.length; i++) {
    const section = sectionsToRender[i];

    // Insert CTA at appropriate positions
    if (shouldInsertCta(i, sectionsToRender.length, blueprint.globalElements.ctaStrategy.positions, 'mid-content')) {
      htmlParts.push(renderInlineCta(options.ctaConfig, blueprint.globalElements.ctaStrategy, options.language));
      componentsUsed.push('cta-inline');
    }

    // Render the section with brand-aware variant mapping
    // THE KEY FIX: Use mapped variant class from brand system if available
    const mappedVariant = getMappedVariantClass(
      section.presentation.component,
      section.presentation.variant,
      options.brandDesignSystem
    );

    const ctx: RenderContext = {
      sectionId: section.id,
      content: section.sourceContent,
      heading: section.heading,
      headingLevel: section.headingLevel || 2,
      emphasis: section.presentation.emphasis,
      spacing: section.presentation.spacing,
      hasBackground: section.presentation.hasBackground,
      hasDivider: section.presentation.hasDivider,
      variant: mappedVariant || section.presentation.variant, // Use mapped variant if available
      styleHints: section.styleHints,
    };

    const renderer = getComponentRenderer(section.presentation.component);
    const rendered = renderer(ctx);

    htmlParts.push(rendered.html);
    componentsUsed.push(section.presentation.component);

    if (rendered.jsonLd) {
      jsonLdParts.push(rendered.jsonLd);
    }
  }

  htmlParts.push('</article>');
  htmlParts.push('</main>');

  // Close sidebar layout wrappers if needed
  if (isSidebarLayout) {
    htmlParts.push('</div>'); // Close content wrapper
    htmlParts.push('</div>'); // Close sidebar layout
  }

  // 4. Author box (if enabled)
  if (blueprint.globalElements.showAuthorBox && options.author) {
    const authorHtml = renderAuthorBox(options.author, blueprint.globalElements.authorBoxPosition);
    htmlParts.push(authorHtml);
    componentsUsed.push('author-box');
  }

  // 5. End CTA (if in positions)
  if (blueprint.globalElements.ctaStrategy.positions.includes('end')) {
    htmlParts.push(renderCtaBanner(options.ctaConfig, blueprint.globalElements.ctaStrategy, options.language));
    componentsUsed.push('cta-banner');
  }

  // 6. Sources section (if enabled)
  if (blueprint.globalElements.showSources) {
    // Would need sources data from options
    // For now, render a placeholder
  }

  // Wrap everything
  const html = wrapWithRoot(htmlParts.join('\n'), personalityId);

  // ============================================================================
  // CSS GENERATION - THE KEY FIX
  // ============================================================================
  // BrandDesignSystem.compiledCss was being generated but NEVER used.
  // Now we properly inject it into the output CSS.

  let css: string;

  // DEBUG: Log what brandDesignSystem we received
  console.log('[BlueprintRenderer] CSS generation - options.brandDesignSystem:', {
    hasBrandDesignSystem: !!options.brandDesignSystem,
    hasCompiledCss: !!options.brandDesignSystem?.compiledCss,
    compiledCssLength: options.brandDesignSystem?.compiledCss?.length || 0,
    brandName: options.brandDesignSystem?.brandName,
  });

  if (options.brandDesignSystem?.compiledCss) {
    // THE KEY FIX: Use full brand design system CSS
    // IMPORTANT: compiledCss already includes the tokens CSS (:root declaration)
    // Do NOT add tokensCss separately - that causes duplicate :root declarations
    const brandCss = options.brandDesignSystem.compiledCss;

    // Just add a header comment and use the compiledCss directly
    css = `/* ============================================
   Brand Design System - Auto-Generated
   Source: ${options.brandDesignSystem.sourceUrl || 'Unknown'}
   Brand: ${options.brandDesignSystem.brandName || 'Unknown'}
   Generated: ${options.brandDesignSystem.generatedAt || 'Unknown'}
   ============================================ */

${brandCss}`;

    console.log('[BlueprintRenderer] Using BrandDesignSystem.compiledCss');
    console.log('[BlueprintRenderer] Brand CSS length:', brandCss.length);
  } else {
    console.log('[BlueprintRenderer] FALLBACK: No compiledCss - using legacy generateDesignSystemCss');
    // Legacy fallback: use designTokens with generateDesignSystemCss
    const customOverrides = options.designTokens ? convertDesignTokensToOverrides(options.designTokens) : undefined;

    // Debug: Log what tokens are being used (legacy path)
    console.log('[BlueprintRenderer] Using legacy designTokens fallback');
    console.log('[BlueprintRenderer] Design tokens received:', {
      hasTokens: !!options.designTokens,
      inputColors: options.designTokens?.colors,
      inputFonts: options.designTokens?.fonts,
    });
    console.log('[BlueprintRenderer] Custom overrides generated:', customOverrides ? {
      primary: customOverrides['--ctc-primary'],
      secondary: customOverrides['--ctc-secondary'],
      background: customOverrides['--ctc-background'],
      text: customOverrides['--ctc-text'],
    } : 'NO OVERRIDES');

    // Generate CSS using the design system generator
    const cssResult = generateDesignSystemCss({
      personalityId,
      darkMode: options.darkMode ?? true,
      minify: options.minifyCss ?? false,
      includeReset: true,
      includeAnimations: true,
      customOverrides,
    });

    css = cssResult.css;

    // Debug: Log a sample of the generated CSS
    console.log('[BlueprintRenderer] Generated CSS sample (first 500 chars):', css.substring(0, 500));
  }

  // Generate JSON-LD
  let jsonLd = '';
  if (options.brief && options.topic && options.topicalMap) {
    const semanticData = extractSemanticData(options.brief, options.topic, options.topicalMap);
    const jsonLdOptions: JsonLdOptions = {
      includeEavs: true,
      includeBreadcrumb: true,
      includeAuthor: !!options.author,
    };
    jsonLd = generateJsonLd(semanticData, jsonLdOptions);
  }

  // Add component-generated JSON-LD
  if (jsonLdParts.length > 0) {
    const componentJsonLd = jsonLdParts.map(data =>
      `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n</script>`
    ).join('\n');
    jsonLd = jsonLd + '\n' + componentJsonLd;
  }

  return {
    html,
    css, // THE KEY FIX: Now uses BrandDesignSystem.compiledCss when available
    jsonLd,
    metadata: {
      blueprint: {
        id: blueprint.id,
        version: blueprint.version,
        visualStyle: blueprint.pageStrategy.visualStyle,
      },
      sectionsRendered: sectionsToRender.length,
      componentsUsed: [...new Set(componentsUsed)],
      renderDurationMs: Date.now() - startTime,
    },
  };
}

// ============================================================================
// LOCALIZATION
// ============================================================================

interface LocalizedCtaDefaults {
  bannerTitle: string;
  primaryText: string;
  secondaryText: string;
  inlineTitle: string;
}

/**
 * Get localized CTA defaults based on language
 */
function getLocalizedCtaDefaults(language?: string): LocalizedCtaDefaults {
  const lang = (language || 'en').toLowerCase().substring(0, 2);

  const localizations: Record<string, LocalizedCtaDefaults> = {
    nl: {
      bannerTitle: 'Klaar om te beginnen?',
      primaryText: 'Offerte aanvragen',
      secondaryText: 'Meer informatie',
      inlineTitle: 'Interesse?',
    },
    de: {
      bannerTitle: 'Bereit loszulegen?',
      primaryText: 'Angebot anfordern',
      secondaryText: 'Mehr erfahren',
      inlineTitle: 'Interesse?',
    },
    fr: {
      bannerTitle: 'Prêt à commencer?',
      primaryText: 'Demander un devis',
      secondaryText: 'En savoir plus',
      inlineTitle: 'Intéressé?',
    },
    es: {
      bannerTitle: '¿Listo para empezar?',
      primaryText: 'Solicitar presupuesto',
      secondaryText: 'Más información',
      inlineTitle: '¿Interesado?',
    },
    en: {
      bannerTitle: 'Ready to get started?',
      primaryText: 'Get a quote',
      secondaryText: 'Learn more',
      inlineTitle: 'Interested?',
    },
  };

  return localizations[lang] || localizations['en'];
}

// ============================================================================
// HELPER RENDERERS
// ============================================================================

/**
 * Render hero section
 * All visual styles get beautiful hero treatment - gradient for bold styles, elegant for editorial
 */
function renderHero(
  title: string,
  introContent: string,
  strategy: LayoutBlueprint['pageStrategy'],
  heroImage?: string,
  ctaConfig?: BlueprintRenderOptions['ctaConfig'],
  ctaIntensity?: string,
  language?: string,
  topicalMap?: TopicalMap
): string {
  const isEditorial = strategy.visualStyle === 'editorial' || strategy.visualStyle === 'minimal';
  const hasHeroImage = !!heroImage;

  // Get localized defaults
  const localizedDefaults = getLocalizedCtaDefaults(language);

  // Determine hero variant classes based on visual style
  const isBoldStyle = strategy.visualStyle === 'bold' || strategy.visualStyle === 'marketing';
  const heroVariantClass = isBoldStyle ? 'ctc-hero--gradient' : 'ctc-hero--solid';

  const showCta = ctaIntensity === 'prominent' || ctaIntensity === 'moderate' || strategy.primaryGoal === 'convert' || ctaConfig?.primaryText;
  const primaryText = ctaConfig?.primaryText || localizedDefaults.primaryText;
  const secondaryText = ctaConfig?.secondaryText || localizedDefaults.secondaryText;

  // Render Split Layout for Images (Modern Service Vibe)
  if (hasHeroImage && isEditorial) {
    return `
<header class="ctc-hero ctc-hero--split ${heroVariantClass}" role="banner">
  <span class="ctc-hero-badge-match">✨ Visual match: detected from site</span>
  <div class="ctc-container">
    <div class="ctc-hero-grid">
      <div class="ctc-hero-content">
        <div class="ctc-hero-badge">🛡️ Gecertificeerd Partner</div>
        <h1 class="ctc-hero-title">
          ${escapeHtml(title)}
        </h1>
        <p class="ctc-hero-subtitle">
          ${extractFirstParagraph(introContent)}
        </p>
        ${showCta ? `
        <div class="ctc-hero-actions">
          <a href="${escapeHtml(ctaConfig?.primaryUrl || '#contact')}" class="ctc-btn ctc-btn-primary ctc-btn-lg">
            ${escapeHtml(primaryText)} <span class="ctc-btn-arrow">→</span>
          </a>
        </div>` : ''}
      </div>
      <div class="ctc-hero-visual">
        <div class="ctc-hero-visual-glow"></div>
        <img src="${escapeHtml(heroImage)}" alt="${escapeHtml(title)}" class="ctc-hero-image" loading="lazy">
      </div>
    </div>
  </div>
</header>`;
  }

  // Classic Centered (High Impact)
  return `
<header class="ctc-hero ctc-hero--centered ${heroVariantClass}" role="banner">
  <span class="ctc-hero-badge-match">✨ Visual match: detected from site</span>
  <div class="ctc-hero-decor">
    <div class="ctc-hero-decor-orb ctc-hero-decor-orb--1"></div>
    <div class="ctc-hero-decor-orb ctc-hero-decor-orb--2"></div>
  </div>
  <div class="ctc-hero-content">
    <div class="ctc-hero-badge">🛡️ Gecertificeerd Partner</div>
    <h1 class="ctc-hero-title">
      ${escapeHtml(title)}
    </h1>
    <p class="ctc-hero-subtitle">
      ${extractFirstParagraph(introContent)}
    </p>
    ${showCta ? `
    <div class="ctc-hero-actions">
      <a href="${escapeHtml(ctaConfig?.primaryUrl || '#contact')}" class="ctc-btn ctc-btn-primary ctc-btn-lg">
        ${escapeHtml(primaryText)}
      </a>
    </div>` : ''}
  </div>
</header>`;
}

/**
 * Render table of contents
 */
function renderToc(
  blueprint: LayoutBlueprint,
  position: 'sidebar' | 'inline' | 'floating'
): string {
  const headings = blueprint.sections
    .filter(s => s.heading)
    .map(s => ({
      id: s.id,
      text: s.heading!,
      level: s.headingLevel || 2,
    }));

  if (headings.length < 3) return '';

  return `
<nav class="ctc-toc ctc-toc--${position}" aria-label="Inhoudsopgave">
  <div class="ctc-toc-header">
    <h2 class="ctc-toc-title">Wat u kunt verwachten</h2>
  </div>
  <ul class="ctc-toc-list">
    ${headings.map((h) => `
    <li class="ctc-toc-item">
      <a href="#${h.id}" class="ctc-toc-link">
        <span class="ctc-toc-arrow">→</span>
        <span>${escapeHtml(h.text)}</span>
      </a>
    </li>`).join('')}
  </ul>
</nav>`;
}

/**
 * Render inline CTA
 */
function renderInlineCta(
  ctaConfig?: BlueprintRenderOptions['ctaConfig'],
  strategy?: LayoutBlueprint['globalElements']['ctaStrategy'],
  language?: string
): string {
  // Get localized defaults
  const localizedDefaults = getLocalizedCtaDefaults(language);

  const title = ctaConfig?.bannerTitle || localizedDefaults.inlineTitle;
  const text = ctaConfig?.bannerText || '';
  const primaryText = ctaConfig?.primaryText || localizedDefaults.primaryText;

  return `
<aside class="ctc-cta-inline">
  <div class="ctc-cta-inline-decor"></div>
  <div class="ctc-cta-inline-content">
    <strong class="ctc-cta-inline-title">${escapeHtml(title)}</strong>
    ${text ? `<span class="ctc-cta-inline-text">${escapeHtml(text)}</span>` : ''}
  </div>
  <a href="${escapeHtml(ctaConfig?.primaryUrl || '#contact')}" class="ctc-btn ctc-btn-primary">
    ${escapeHtml(primaryText)}
    <span class="ctc-btn-arrow">→</span>
  </a>
</aside>`;
}

/**
 * Render CTA banner
 */
function renderCtaBanner(
  ctaConfig?: BlueprintRenderOptions['ctaConfig'],
  strategy?: LayoutBlueprint['globalElements']['ctaStrategy'],
  language?: string
): string {
  // Get localized defaults
  const localizedDefaults = getLocalizedCtaDefaults(language);

  const isProminent = strategy?.intensity === 'prominent';
  const title = ctaConfig?.bannerTitle || localizedDefaults.bannerTitle;
  const text = ctaConfig?.bannerText || '';
  const bannerClass = isProminent ? 'ctc-cta-banner--prominent' : 'ctc-cta-banner--subtle';

  return `
<aside class="ctc-cta-banner ${bannerClass}">
  <div class="ctc-cta-banner-decor ctc-cta-banner-decor--1"></div>
  <div class="ctc-cta-banner-decor ctc-cta-banner-decor--2"></div>
  <div class="ctc-cta-banner-inner">
    <h2 class="ctc-cta-banner-title">${escapeHtml(title)}</h2>
    ${text ? `<p class="ctc-cta-banner-text">${escapeHtml(text)}</p>` : ''}
    <div class="ctc-cta-banner-actions">
      <a href="${escapeHtml(ctaConfig?.primaryUrl || '#contact')}" class="ctc-btn ctc-btn-primary ctc-btn-lg">
        ${escapeHtml(ctaConfig?.primaryText || localizedDefaults.primaryText)}
        <span class="ctc-btn-arrow">→</span>
      </a>
      ${ctaConfig?.secondaryText || !ctaConfig?.primaryText ? `
      <a href="${escapeHtml(ctaConfig?.secondaryUrl || '#')}" class="ctc-btn ctc-btn-secondary">
        ${escapeHtml(ctaConfig?.secondaryText || localizedDefaults.secondaryText)}
      </a>` : ''}
    </div>
  </div>
</aside>`;
}

/**
 * Render author box
 */
function renderAuthorBox(
  author: NonNullable<BlueprintRenderOptions['author']>,
  position: 'top' | 'bottom' | 'both'
): string {
  return `
<aside class="ctc-author-box" itemscope itemtype="https://schema.org/Person">
  ${author.imageUrl ? `
  <img src="${escapeHtml(author.imageUrl)}" alt="${escapeHtml(author.name)}" class="ctc-author-avatar" itemprop="image">
  ` : `
  <div class="ctc-author-avatar ctc-author-avatar--placeholder">
    ${author.name.charAt(0).toUpperCase()}
  </div>`}
  <div class="ctc-author-info">
    <span class="ctc-author-label">Geschreven door</span>
    <strong class="ctc-author-name" itemprop="name">${escapeHtml(author.name)}</strong>
    ${author.title ? `<span class="ctc-author-title" itemprop="jobTitle">${escapeHtml(author.title)}</span>` : ''}
    ${author.bio ? `<p class="ctc-author-bio" itemprop="description">${escapeHtml(author.bio)}</p>` : ''}
  </div>
</aside>`;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Map visual style to design personality
 */
function mapVisualStyleToPersonality(style: VisualStyle): string {
  const mapping: Record<VisualStyle, string> = {
    'editorial': 'bold-editorial',
    'marketing': 'warm-friendly',
    'minimal': 'modern-minimal',
    'bold': 'tech-clean',
    'warm-modern': 'warm-friendly',
  };
  return mapping[style] || 'corporate-professional';
}

/**
 * Check if CTA should be inserted at this position
 */
function shouldInsertCta(
  currentIndex: number,
  totalSections: number,
  positions: string[],
  position: string
): boolean {
  if (!positions.includes(position)) return false;

  if (position === 'after-intro' && currentIndex === 1) return true;
  if (position === 'mid-content' && currentIndex === Math.floor(totalSections / 2)) return true;
  if (position === 'before-faq' && currentIndex === totalSections - 2) return true;

  return false;
}

/**
 * Wrap HTML with root element
 */
function wrapWithRoot(html: string, personalityId: string): string {
  // Interactive JavaScript for FAQ accordion and smooth scroll
  const interactiveScript = `
<script>
(function() {
  // FAQ Accordion Toggle
  document.querySelectorAll('.ctc-faq-trigger').forEach(function(trigger) {
    trigger.addEventListener('click', function() {
      var answer = document.getElementById(trigger.getAttribute('aria-controls'));
      var icon = trigger.querySelector('.ctc-faq-icon');
      var isExpanded = trigger.getAttribute('aria-expanded') === 'true';

      trigger.setAttribute('aria-expanded', !isExpanded);
      if (answer) {
        answer.hidden = isExpanded;
      }
      if (icon) {
        icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(45deg)';
      }
    });
  });

  // Smooth scroll for TOC links
  document.querySelectorAll('.ctc-toc a[href^="#"]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Add hover effects for cards and interactive elements
  document.querySelectorAll('.ctc-toc a').forEach(function(link) {
    link.addEventListener('mouseenter', function() {
      this.style.background = 'var(--ctc-surface)';
    });
    link.addEventListener('mouseleave', function() {
      this.style.background = 'transparent';
    });
  });
})();
</script>`;

  return `<div class="ctc-root ctc-styled ctc-personality-${personalityId}" data-ctc-version="2.0" data-blueprint-rendered="true">
${html}
${interactiveScript}
</div>`;
}

/**
 * Extract first paragraph from content
 */
function extractFirstParagraph(content: string): string {
  // Remove markdown headings
  const withoutHeadings = content.replace(/^#+\s+.+$/gm, '');

  // Get first substantial paragraph
  const paragraphs = withoutHeadings.split(/\n\n+/);
  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (trimmed && trimmed.length > 50 && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
      // Limit length and escape
      const limited = trimmed.length > 200 ? trimmed.slice(0, 200) + '...' : trimmed;
      return escapeHtml(limited);
    }
  }

  return '';
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, char => escapeMap[char]);
}

// ============================================================================
// STANDALONE HTML GENERATION
// ============================================================================

/**
 * Generate a complete standalone HTML document from blueprint render output
 * This embeds CSS, JSON-LD, and interactive scripts in a single file
 */
export function generateStandaloneBlueprintHtml(
  output: BlueprintRenderOutput,
  title: string,
  options: {
    language?: string;
    includeScripts?: boolean;
    minify?: boolean;
  } = {}
): string {
  const {
    language = 'nl',
    includeScripts = true,
    minify = false,
  } = options;

  // Interactive scripts for FAQ accordion, TOC smooth scroll, hover effects
  const interactiveScripts = includeScripts ? `
<script>
(function() {
  // FAQ Accordion Toggle
  document.querySelectorAll('.ctc-faq-trigger').forEach(function(trigger) {
    trigger.addEventListener('click', function() {
      var answer = document.getElementById(trigger.getAttribute('aria-controls'));
      var icon = trigger.querySelector('.ctc-faq-icon');
      var isExpanded = trigger.getAttribute('aria-expanded') === 'true';

      trigger.setAttribute('aria-expanded', !isExpanded);
      if (answer) {
        answer.hidden = isExpanded;
      }
      if (icon) {
        icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(45deg)';
      }
    });
  });

  // Smooth scroll for TOC links
  document.querySelectorAll('.ctc-toc a[href^="#"]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Add hover effects for TOC items
  document.querySelectorAll('.ctc-toc a').forEach(function(link) {
    link.addEventListener('mouseenter', function() {
      this.style.background = 'var(--ctc-surface)';
      this.style.color = 'var(--ctc-primary)';
    });
    link.addEventListener('mouseleave', function() {
      this.style.background = 'transparent';
      this.style.color = 'var(--ctc-text-secondary)';
    });
  });

  // Reading progress bar
  var progressFill = document.querySelector('.ctc-progress-fill');
  if (progressFill) {
    window.addEventListener('scroll', function() {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var scrollPos = window.scrollY;
      var progress = docHeight > 0 ? (scrollPos / docHeight) * 100 : 0;
      progressFill.style.width = progress + '%';
    });
  }
})();
</script>
` : '';

  const htmlContent = `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <!-- Premium Font Stack -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;0,800;1,700&display=swap" rel="stylesheet">
  <style>
${output.css}
  </style>
</head>
<body>
${output.html}
${output.jsonLd ? `\n${output.jsonLd}` : ''}
${interactiveScripts}
</body>
</html>`;

  if (minify) {
    // Basic minification: remove excessive whitespace
    return htmlContent
      .replace(/\n\s+/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  return htmlContent;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { mapVisualStyleToPersonality };
