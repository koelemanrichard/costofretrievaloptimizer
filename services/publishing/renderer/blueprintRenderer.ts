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

  if (options.brandDesignSystem?.compiledCss) {
    // THE KEY FIX: Use full brand design system CSS
    const brandCss = options.brandDesignSystem.compiledCss;
    const tokensCss = options.brandDesignSystem.tokens?.css || '';

    // Combine: tokens first (CSS variables), then compiled component styles
    css = `/* ============================================
   Brand Design System - Auto-Generated
   Source: ${options.brandDesignSystem.brandName || 'Unknown'}
   Generated: ${options.brandDesignSystem.generatedAt || 'Unknown'}
   ============================================ */

${tokensCss}

${brandCss}`;

    console.log('[BlueprintRenderer] Using BrandDesignSystem.compiledCss');
    console.log('[BlueprintRenderer] Brand CSS length:', brandCss.length);
    console.log('[BlueprintRenderer] Tokens CSS length:', tokensCss.length);
  } else {
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

  // AIRY LUXURY: White background with branded accents
  // This matches modern WordPress/Premium service aesthetics
  let heroStyle = 'background: #ffffff; border-bottom: 1px solid var(--ctc-border-subtle)';
  let textColor = 'color: var(--ctc-text)';
  let subtitleColor = 'color: var(--ctc-text-secondary)';
  let btnPrimaryStyle = 'background: var(--ctc-primary); color: white; box-shadow: 0 4px 12px color-mix(in srgb, var(--ctc-primary) 30%, transparent)';
  let btnSecondaryStyle = 'background: transparent; color: var(--ctc-primary); border: 2px solid var(--ctc-primary)';

  if (strategy.visualStyle === 'bold' || strategy.visualStyle === 'marketing') {
    heroStyle = 'background: linear-gradient(135deg, var(--ctc-surface) 0%, #ffffff 100%)';
  }

  const showCta = ctaIntensity === 'prominent' || ctaIntensity === 'moderate' || strategy.primaryGoal === 'convert' || ctaConfig?.primaryText;
  const primaryText = ctaConfig?.primaryText || localizedDefaults.primaryText;
  const secondaryText = ctaConfig?.secondaryText || localizedDefaults.secondaryText;

  // Render Split Layout for Images (Modern Service Vibe)
  if (hasHeroImage && isEditorial) {
    return `
<header class="ctc-hero" role="banner" style="${heroStyle}; padding: 8rem 0 6rem; overflow: hidden; position: relative">
  <span style="position: absolute; top: 2rem; right: 2rem; font-size: 0.65rem; color: var(--ctc-text-muted); background: rgba(255,255,255,0.8); backdrop-filter: blur(4px); padding: 0.3rem 0.6rem; border-radius: 4px; border: 1px solid var(--ctc-border-subtle); z-index: 20">✨ Visual match: detected from site</span>
  <div class="ctc-container">
    <div class="ctc-grid ctc-grid-2 items-center gap-16 text-left">
      <div class="ctc-hero-content">
        <div style="display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: var(--ctc-primary); background: var(--ctc-primary-light); padding: 0.4rem 1rem; border-radius: 100px; margin-bottom: 2rem; border: 1px solid color-mix(in srgb, var(--ctc-primary) 20%, transparent)">🛡️ Gecertificeerd Partner</div>
        <h1 class="ctc-hero-title" style="${textColor}; font-weight: 800; font-family: var(--ctc-font-display); font-size: clamp(2.8rem, 6vw, 4rem); line-height: 1.05; margin-bottom: 2rem; letter-spacing: -0.03em; text-transform: capitalize">
          ${escapeHtml(title).replace(/(&quot;[a-z ]+&quot;|&#39;[a-z ]+&#39;)/gi, '<span style="color: var(--ctc-primary)">$1</span>')}
        </h1>
        <p class="ctc-hero-subtitle" style="${subtitleColor}; font-size: 1.25rem; line-height: 1.7; margin-bottom: 3rem">
          ${extractFirstParagraph(introContent)}
        </p>
        ${showCta ? `
        <div class="ctc-hero-actions" style="display: flex; gap: 1rem; align-items: center">
          <a href="${escapeHtml(ctaConfig?.primaryUrl || '#contact')}" style="${btnPrimaryStyle}; padding: 1.25rem 3rem; border-radius: var(--ctc-radius-full); font-weight: 800; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; font-size: 1.125rem">
            ${escapeHtml(primaryText)} <span style="font-size: 1.25rem">→</span>
          </a>
        </div>` : ''}
      </div>
      <div class="ctc-hero-visual" style="position: relative">
        <div style="position: absolute; inset: -20px; background: var(--ctc-primary); opacity: 0.1; filter: blur(40px); border-radius: 50%"></div>
        <img src="${escapeHtml(heroImage)}" alt="${escapeHtml(title)}" style="position: relative; z-index: 1; border-radius: var(--ctc-radius-2xl); box-shadow: var(--ctc-shadow-float); width: 100%; height: 500px; object-fit: cover">
      </div>
    </div>
  </div>
</header>`;
  }

  // Classic Centered (High Impact)
  return `
<header class="ctc-hero ctc-hero--solid" role="banner" style="${heroStyle}; position: relative; padding: 10rem 1.5rem 8rem; text-align: center; overflow: hidden">
  <span style="position: absolute; top: 2rem; right: 2rem; font-size: 0.65rem; color: var(--ctc-text-muted); background: rgba(255,255,255,0.8); backdrop-filter: blur(4px); padding: 0.3rem 0.6rem; border-radius: 4px; border: 1px solid var(--ctc-border-subtle); z-index: 20">✨ Visual match: detected from site</span>
  <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden; z-index: 0">
    <div style="position: absolute; top: -100px; right: -50px; width: 500px; height: 500px; background: var(--ctc-primary); opacity: 0.08; border-radius: 50%; filter: blur(100px)"></div>
    <div style="position: absolute; bottom: -50px; left: -50px; width: 400px; height: 400px; background: var(--ctc-secondary, var(--ctc-primary)); opacity: 0.05; border-radius: 50%; filter: blur(80px)"></div>
  </div>
  <div class="ctc-hero-content" style="position: relative; z-index: 10; max-width: 56rem; margin: 0 auto">
    <div style="display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: var(--ctc-primary); background: white; padding: 0.5rem 1.25rem; border-radius: 100px; box-shadow: var(--ctc-shadow-sm); margin-bottom: 2.5rem; border: 1px solid var(--ctc-border-subtle); position: relative; z-index: 10">🛡️ Gecertificeerd Partner</div>
    <h1 class="ctc-hero-title" style="${textColor}; font-weight: 800; font-family: var(--ctc-font-display); font-size: clamp(2.8rem, 8vw, 4.8rem); line-height: 1.05; margin-bottom: 2rem; letter-spacing: -0.03em; text-transform: capitalize">
      ${escapeHtml(title)}
    </h1>
    <p class="ctc-hero-subtitle" style="${subtitleColor}; font-size: 1.35rem; max-width: 42rem; margin: 0 auto 3.5rem; line-height: 1.7">
      ${extractFirstParagraph(introContent)}
    </p>
    ${showCta ? `
    <div class="ctc-hero-actions" style="display: flex; gap: 1.5rem; justify-content: center">
      <a href="${escapeHtml(ctaConfig?.primaryUrl || '#contact')}" style="${btnPrimaryStyle}; padding: 1.25rem 3rem; border-radius: var(--ctc-radius-full); font-weight: 800; text-decoration: none; transition: transform 0.2s ease; font-size: 1.125rem">
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

  const isSidebar = position === 'sidebar';
  const isFloating = position === 'floating';

  // Base styles for all TOC positions
  let wrapperStyle = 'background: #ffffff; border-radius: var(--ctc-radius-lg); border: 1px solid var(--ctc-border-subtle); padding: 3rem; box-shadow: var(--ctc-shadow-float); z-index: 50; position: relative;';

  if (isSidebar) {
    wrapperStyle += ' position: sticky; top: 2rem;';
  } else if (isFloating) {
    wrapperStyle += ' position: fixed; bottom: 2rem; right: 2rem; z-index: 100;';
  } else {
    // LUXURY OVERLAP: Pull TOC up into the Hero
    wrapperStyle += ' margin: -6rem auto 6rem; width: 100%; max-width: 1100px;';
  }

  return `
<nav class="ctc-toc ctc-toc--${position}" style="${wrapperStyle}" aria-label="Inhoudsopgave">
  <div style="margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid var(--ctc-primary-light); display: inline-block">
    <h2 style="font-family: var(--ctc-font-display); font-weight: 700; font-size: 1.5rem; color: var(--ctc-text); margin: 0; letter-spacing: -0.01em">Wat u kunt verwachten</h2>
  </div>
  <ul style="list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem">
    ${headings.map((h, i) => `
    <li>
      <a href="#${h.id}" style="display: flex; align-items: center; gap: 0.75rem; color: var(--ctc-text-secondary); text-decoration: none; font-size: 1rem; font-weight: 500; transition: color 0.2s ease">
        <span style="color: var(--ctc-primary); opacity: 0.7; font-weight: 800">→</span>
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
<aside class="ctc-cta-inline" style="display: flex; align-items: center; justify-content: space-between; gap: 2rem; padding: 2.5rem 3rem; border-radius: var(--ctc-radius-lg); background: white; border: 1px solid var(--ctc-border-subtle); margin: 4rem 0; position: relative; overflow: hidden; box-shadow: var(--ctc-shadow-md)">
  <div style="position: absolute; top: -30px; left: -30px; width: 120px; height: 120px; background: var(--ctc-primary); opacity: 0.03; border-radius: 50%; pointer-events: none"></div>
  <div style="position: relative; z-index: 1; flex: 1">
    <strong style="display: block; margin-bottom: 0.5rem; font-family: var(--ctc-font-display); font-weight: 700; color: var(--ctc-text); font-size: 1.5rem; letter-spacing: -0.01em">${escapeHtml(title)}</strong>
    ${text ? `<span style="color: var(--ctc-text-secondary); font-size: 1.0625rem; line-height: 1.6">${escapeHtml(text)}</span>` : ''}
  </div>
  <a href="${escapeHtml(ctaConfig?.primaryUrl || '#contact')}" style="background: var(--ctc-primary); color: white; padding: 1rem 2.5rem; border-radius: var(--ctc-radius-full); font-weight: 800; text-decoration: none; transition: all 0.2s ease; flex-shrink: 0; font-size: 1rem; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 10px 20px -5px color-mix(in srgb, var(--ctc-primary) 30%, transparent)">
    ${escapeHtml(primaryText)}
    <span style="font-size: 1.25rem">→</span>
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

  // Determine styling based on intensity
  let bannerStyle: string;
  let titleStyle: string;
  let textStyle: string;
  let primaryBtnStyle: string;
  let secondaryBtnStyle: string;
  let decorativeOrbs: string;

  if (isProminent) {
    bannerStyle = 'background: linear-gradient(135deg, var(--ctc-primary) 0%, var(--ctc-primary-dark) 100%); color: white; position: relative; overflow: hidden; box-shadow: 0 30px 60px -12px color-mix(in srgb, var(--ctc-primary) 25%, transparent)';
    titleStyle = 'color: white; font-family: var(--ctc-font-display); font-size: clamp(2rem, 5vw, 3rem); font-weight: 800; margin-bottom: 1.5rem; letter-spacing: -0.02em';
    textStyle = 'color: rgba(255,255,255,0.9); font-size: 1.25rem; max-width: 42rem; margin: 0 auto 3rem; line-height: 1.7';
    primaryBtnStyle = 'background: white; color: var(--ctc-primary); box-shadow: 0 10px 20px -5px rgba(0,0,0,0.2); font-weight: 800; padding: 1.25rem 3.5rem; font-size: 1.125rem';
    secondaryBtnStyle = 'background: transparent; color: white; border: 2px solid rgba(255,255,255,0.8)';
    decorativeOrbs = `
    <div style="position: absolute; top: -80px; right: -80px; width: 250px; height: 250px; background: white; opacity: 0.1; border-radius: 50%; pointer-events: none"></div>
    <div style="position: absolute; bottom: -60px; left: -60px; width: 180px; height: 180px; background: white; opacity: 0.08; border-radius: 50%; pointer-events: none"></div>`;
  } else {
    bannerStyle = 'background: linear-gradient(135deg, var(--ctc-surface) 0%, color-mix(in srgb, var(--ctc-primary) 5%, var(--ctc-surface)) 100%); border: 1px solid var(--ctc-border); position: relative; overflow: hidden';
    titleStyle = 'color: var(--ctc-text); font-size: clamp(1.5rem, 4vw, 2rem); font-weight: 700; margin-bottom: 1rem';
    textStyle = 'color: var(--ctc-text-secondary); font-size: 1.125rem; max-width: 36rem; margin: 0 auto 2rem; line-height: 1.6';
    primaryBtnStyle = 'background: linear-gradient(135deg, var(--ctc-primary), var(--ctc-primary-light)); color: white; box-shadow: 0 4px 16px -2px color-mix(in srgb, var(--ctc-primary) 40%, transparent)';
    secondaryBtnStyle = 'background: transparent; color: var(--ctc-primary); border: 2px solid var(--ctc-primary)';
    decorativeOrbs = `
    <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: var(--ctc-primary); opacity: 0.05; border-radius: 50%; pointer-events: none"></div>
    <div style="position: absolute; bottom: -40px; left: -40px; width: 100px; height: 100px; background: var(--ctc-primary); opacity: 0.03; border-radius: 50%; pointer-events: none"></div>`;
  }

  return `
<aside class="ctc-cta-banner" style="${bannerStyle}; border-radius: var(--ctc-radius-2xl); padding: 3rem 2rem; text-align: center; margin: 3rem 0; box-shadow: 0 20px 50px -12px rgba(0,0,0,0.12)">
  ${decorativeOrbs}
  <div style="position: relative; z-index: 1">
    <h2 class="ctc-cta-title" style="${titleStyle}">${escapeHtml(title)}</h2>
    ${text ? `<p class="ctc-cta-text" style="${textStyle}">${escapeHtml(text)}</p>` : ''}
    <div class="ctc-cta-actions" style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap">
      <a href="${escapeHtml(ctaConfig?.primaryUrl || '#contact')}" style="${primaryBtnStyle}; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.875rem 2rem; border-radius: var(--ctc-radius-full); font-weight: 600; text-decoration: none; transition: all 0.2s ease; font-size: 1rem">
        ${escapeHtml(ctaConfig?.primaryText || localizedDefaults.primaryText)}
        <span style="font-size: 1.125rem">→</span>
      </a>
      ${ctaConfig?.secondaryText || !ctaConfig?.primaryText ? `
      <a href="${escapeHtml(ctaConfig?.secondaryUrl || '#')}" style="${secondaryBtnStyle}; display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.875rem 2rem; border-radius: var(--ctc-radius-full); font-weight: 600; text-decoration: none; transition: all 0.2s ease; font-size: 1rem">
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
<aside class="ctc-author-box flex gap-6 items-start p-6 bg-[var(--ctc-surface)] rounded-[var(--ctc-radius-lg)] border border-[var(--ctc-border)] my-8" itemscope itemtype="https://schema.org/Person">
  ${author.imageUrl ? `
  <img src="${escapeHtml(author.imageUrl)}" alt="${escapeHtml(author.name)}" class="ctc-author-avatar w-16 h-16 rounded-full object-cover" itemprop="image">
  ` : `
  <div class="ctc-author-avatar w-16 h-16 rounded-full bg-[var(--ctc-primary)] text-white flex items-center justify-center text-xl font-bold">
    ${author.name.charAt(0).toUpperCase()}
  </div>`}
  <div class="ctc-author-info">
    <span class="ctc-author-label text-xs text-[var(--ctc-text-muted)] uppercase tracking-wider">Geschreven door</span>
    <strong class="ctc-author-name block text-lg" itemprop="name">${escapeHtml(author.name)}</strong>
    ${author.title ? `<span class="ctc-author-title text-sm text-[var(--ctc-text-secondary)]" itemprop="jobTitle">${escapeHtml(author.title)}</span>` : ''}
    ${author.bio ? `<p class="ctc-author-bio text-sm text-[var(--ctc-text-muted)] mt-2" itemprop="description">${escapeHtml(author.bio)}</p>` : ''}
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
