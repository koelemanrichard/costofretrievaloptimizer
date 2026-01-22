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
  /** Include dark mode CSS */
  darkMode?: boolean;
  /** Minify CSS output */
  minifyCss?: boolean;
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
      options.ctaConfig,
      blueprint.globalElements.ctaStrategy.intensity
    );
    htmlParts.push(heroHtml);
    componentsUsed.push('hero');
  }

  // 2. Table of Contents (if enabled)
  if (blueprint.globalElements.showToc) {
    const tocHtml = renderToc(blueprint, blueprint.globalElements.tocPosition);
    htmlParts.push(tocHtml);
    componentsUsed.push('toc');
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
      htmlParts.push(renderInlineCta(options.ctaConfig, blueprint.globalElements.ctaStrategy));
      componentsUsed.push('cta-inline');
    }

    // Render the section
    const ctx: RenderContext = {
      sectionId: section.id,
      content: section.sourceContent,
      heading: section.heading,
      headingLevel: section.headingLevel || 2,
      emphasis: section.presentation.emphasis,
      spacing: section.presentation.spacing,
      hasBackground: section.presentation.hasBackground,
      hasDivider: section.presentation.hasDivider,
      variant: section.presentation.variant,
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

  // 4. Author box (if enabled)
  if (blueprint.globalElements.showAuthorBox && options.author) {
    const authorHtml = renderAuthorBox(options.author, blueprint.globalElements.authorBoxPosition);
    htmlParts.push(authorHtml);
    componentsUsed.push('author-box');
  }

  // 5. End CTA (if in positions)
  if (blueprint.globalElements.ctaStrategy.positions.includes('end')) {
    htmlParts.push(renderCtaBanner(options.ctaConfig, blueprint.globalElements.ctaStrategy));
    componentsUsed.push('cta-banner');
  }

  // 6. Sources section (if enabled)
  if (blueprint.globalElements.showSources) {
    // Would need sources data from options
    // For now, render a placeholder
  }

  // Wrap everything
  const html = wrapWithRoot(htmlParts.join('\n'), personalityId);

  // Generate CSS
  const cssResult = generateDesignSystemCss({
    personalityId,
    darkMode: options.darkMode ?? true,
    minify: options.minifyCss ?? false,
    includeReset: true,
    includeAnimations: true,
  });

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
    css: cssResult.css,
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
// HELPER RENDERERS
// ============================================================================

/**
 * Render hero section
 */
function renderHero(
  title: string,
  introContent: string,
  strategy: LayoutBlueprint['pageStrategy'],
  ctaConfig?: BlueprintRenderOptions['ctaConfig'],
  ctaIntensity?: string
): string {
  const bgClass = strategy.visualStyle === 'marketing' || strategy.visualStyle === 'bold'
    ? 'bg-gradient-to-br from-[var(--ctc-primary)] to-[var(--ctc-primary-light)] text-white'
    : 'bg-[var(--ctc-surface)]';

  const showCta = ctaIntensity === 'prominent' || strategy.primaryGoal === 'convert';

  return `
<header class="ctc-hero ${bgClass} py-16 md:py-24 px-4" role="banner">
  <div class="ctc-hero-content max-w-4xl mx-auto text-center">
    <h1 class="ctc-hero-title text-4xl md:text-5xl lg:text-6xl font-bold mb-6" style="font-weight: var(--ctc-heading-weight)">
      ${escapeHtml(title)}
    </h1>
    <p class="ctc-hero-subtitle text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
      ${extractFirstParagraph(introContent)}
    </p>
    ${showCta && ctaConfig?.primaryText ? `
    <div class="ctc-hero-actions mt-8 flex gap-4 justify-center flex-wrap">
      <a href="${escapeHtml(ctaConfig.primaryUrl || '#contact')}" class="ctc-btn ctc-btn-white px-8 py-3 rounded-[var(--ctc-radius-full)] font-semibold bg-white text-[var(--ctc-primary)] hover:opacity-90 transition-opacity">
        ${escapeHtml(ctaConfig.primaryText)}
      </a>
      ${ctaConfig.secondaryText ? `
      <a href="${escapeHtml(ctaConfig.secondaryUrl || '#')}" class="ctc-btn ctc-btn-outline px-8 py-3 rounded-[var(--ctc-radius-full)] font-semibold border-2 border-white text-white hover:bg-white/10 transition-colors">
        ${escapeHtml(ctaConfig.secondaryText)}
      </a>` : ''}
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

  const positionClass = position === 'sidebar'
    ? 'ctc-toc--sidebar lg:sticky lg:top-4 lg:w-64'
    : position === 'floating'
      ? 'ctc-toc--floating fixed bottom-4 right-4 z-50'
      : 'ctc-toc--inline my-8';

  return `
<nav class="ctc-toc ${positionClass} p-6 bg-[var(--ctc-surface)] rounded-[var(--ctc-radius-lg)] border border-[var(--ctc-border)]" aria-label="Inhoudsopgave">
  <h2 class="ctc-toc-title text-lg font-semibold mb-4">Inhoudsopgave</h2>
  <ol class="ctc-toc-list space-y-2">
    ${headings.map(h => `
    <li class="ctc-toc-item" style="margin-left: ${(h.level - 2) * 1}rem">
      <a href="#${h.id}" class="ctc-toc-link text-[var(--ctc-text-secondary)] hover:text-[var(--ctc-primary)] transition-colors text-sm block py-1">
        ${escapeHtml(h.text)}
      </a>
    </li>`).join('')}
  </ol>
</nav>`;
}

/**
 * Render inline CTA
 */
function renderInlineCta(
  ctaConfig?: BlueprintRenderOptions['ctaConfig'],
  strategy?: LayoutBlueprint['globalElements']['ctaStrategy']
): string {
  const title = ctaConfig?.bannerTitle || 'Interesse?';
  const text = ctaConfig?.bannerText || '';

  return `
<aside class="ctc-cta-inline flex items-center justify-between gap-6 p-6 rounded-[var(--ctc-radius-lg)] bg-[var(--ctc-surface)] border border-[var(--ctc-border)] my-8">
  <div class="ctc-cta-text">
    <strong class="block mb-1">${escapeHtml(title)}</strong>
    ${text ? `<span class="text-[var(--ctc-text-secondary)]">${escapeHtml(text)}</span>` : ''}
  </div>
  <a href="${escapeHtml(ctaConfig?.primaryUrl || '#contact')}" class="ctc-btn ctc-btn-primary px-6 py-2 rounded-[var(--ctc-radius-full)] bg-[var(--ctc-primary)] text-white font-semibold hover:opacity-90 transition-opacity flex-shrink-0">
    ${escapeHtml(ctaConfig?.primaryText || 'Meer Info')}
  </a>
</aside>`;
}

/**
 * Render CTA banner
 */
function renderCtaBanner(
  ctaConfig?: BlueprintRenderOptions['ctaConfig'],
  strategy?: LayoutBlueprint['globalElements']['ctaStrategy']
): string {
  const isProminent = strategy?.intensity === 'prominent';
  const title = ctaConfig?.bannerTitle || 'Klaar Om Te Beginnen?';
  const text = ctaConfig?.bannerText || '';

  const bgClass = isProminent
    ? 'bg-gradient-to-r from-[var(--ctc-primary)] to-[var(--ctc-primary-light)] text-white'
    : 'bg-[var(--ctc-surface)] border border-[var(--ctc-border)]';

  return `
<aside class="ctc-cta-banner ${bgClass} rounded-[var(--ctc-radius-xl)] p-8 md:p-12 text-center my-12">
  <h2 class="ctc-cta-title text-2xl md:text-3xl font-bold mb-4">${escapeHtml(title)}</h2>
  ${text ? `<p class="ctc-cta-text text-lg opacity-90 mb-6 max-w-2xl mx-auto">${escapeHtml(text)}</p>` : ''}
  <div class="ctc-cta-actions flex gap-4 justify-center flex-wrap">
    <a href="${escapeHtml(ctaConfig?.primaryUrl || '#contact')}" class="ctc-btn ${isProminent ? 'bg-white text-[var(--ctc-primary)]' : 'bg-[var(--ctc-primary)] text-white'} px-8 py-3 rounded-[var(--ctc-radius-full)] font-semibold hover:opacity-90 transition-opacity">
      ${escapeHtml(ctaConfig?.primaryText || 'Contact')}
    </a>
    ${ctaConfig?.secondaryText ? `
    <a href="${escapeHtml(ctaConfig?.secondaryUrl || '#')}" class="ctc-btn border-2 ${isProminent ? 'border-white text-white' : 'border-[var(--ctc-primary)] text-[var(--ctc-primary)]'} px-8 py-3 rounded-[var(--ctc-radius-full)] font-semibold hover:opacity-90 transition-opacity">
      ${escapeHtml(ctaConfig.secondaryText)}
    </a>` : ''}
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
    'editorial': 'corporate-professional',
    'marketing': 'modern-energetic',
    'minimal': 'corporate-professional',
    'bold': 'modern-energetic',
    'warm-modern': 'warm-approachable',
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
  return `<div class="ctc-root ctc-styled ctc-personality-${personalityId}" data-ctc-version="2.0" data-blueprint-rendered="true">
${html}
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
// EXPORTS
// ============================================================================

export { mapVisualStyleToPersonality };
