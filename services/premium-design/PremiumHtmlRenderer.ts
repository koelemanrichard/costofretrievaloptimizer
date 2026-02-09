// =============================================================================
// PremiumHtmlRenderer — Bridges LayoutEngine blueprint to component-rich HTML
// =============================================================================
// Adapter between the layout-engine's BlueprintSection output and the
// componentLibrary's rich component renderers. Produces HTML with .ctc-*
// classes that match the CSS from BrandDesignSystemGenerator.

import type { LayoutBlueprintOutput } from '../layout-engine/LayoutEngine';
import type { BlueprintSection, ComponentType as LayoutComponentType } from '../layout-engine/types';
import type { ComponentType as PublishingComponentType } from '../publishing/architect/blueprintTypes';
import { getComponentRenderer, type RenderContext } from '../publishing/renderer/componentLibrary';
import { convertMarkdownToSemanticHtml } from '../contentAssemblyService';
import { injectHeadingIds, generateTableOfContentsHtml } from '../quickExportStylesheet';
import type { DesignDNA } from '../../types/designDna';
import type { BusinessContext } from './types';

// =============================================================================
// COMPONENT TYPE MAPPING
// =============================================================================

/**
 * Map layout-engine ComponentType to publishing ComponentType.
 * The componentLibrary expects publishing ComponentTypes.
 */
const COMPONENT_TYPE_MAP: Record<LayoutComponentType, PublishingComponentType> = {
  'prose': 'prose',
  'card': 'card-grid',
  'hero': 'prose',           // hero is handled by the hero section renderer
  'feature-grid': 'card-grid',
  'accordion': 'faq-accordion',
  'timeline': 'timeline-vertical',
  'comparison-table': 'comparison-table',
  'testimonial-card': 'testimonial-single',
  'key-takeaways': 'key-takeaways',
  'cta-banner': 'cta-banner',
  'step-list': 'steps-numbered',
  'checklist': 'checklist',
  'stat-highlight': 'stat-cards',
  'blockquote': 'pull-quote',
  'definition-box': 'highlight-box',
  'faq-accordion': 'faq-accordion',
  'alert-box': 'callout',
  'info-box': 'highlight-box',
  'lead-paragraph': 'lead-paragraph',
};

/**
 * Map layout-engine emphasis level to publishing SectionEmphasis
 */
function mapEmphasis(level: string): 'background' | 'normal' | 'featured' | 'hero-moment' {
  switch (level) {
    case 'hero': return 'hero-moment';
    case 'featured': return 'featured';
    case 'supporting':
    case 'minimal': return 'background';
    default: return 'normal';
  }
}

/**
 * Map layout-engine spacing to publishing SectionSpacing
 */
function mapSpacing(spacingBefore: string): 'tight' | 'normal' | 'breathe' {
  switch (spacingBefore) {
    case 'tight': return 'tight';
    case 'generous':
    case 'dramatic': return 'breathe';
    default: return 'normal';
  }
}

// =============================================================================
// HERO RENDERER
// =============================================================================

/**
 * Render hero section based on DesignDNA heroStyle
 */
function renderHero(
  title: string,
  subtitle: string,
  designDna?: DesignDNA,
  businessContext?: BusinessContext
): string {
  const heroStyle = designDna?.layout?.heroStyle || 'contained';
  const ctaHtml = businessContext?.ctaText && businessContext?.ctaUrl
    ? `<div class="ctc-hero-actions">
        <a href="${escapeHtml(businessContext.ctaUrl)}" class="ctc-btn ctc-btn-primary ctc-btn-lg">${escapeHtml(businessContext.ctaText)}</a>
      </div>`
    : '';

  const subtitleHtml = subtitle
    ? `<p class="ctc-hero-subtitle">${escapeHtml(subtitle)}</p>`
    : '';

  const industryBadge = businessContext?.industry
    ? `<div class="ctc-hero-badge">${escapeHtml(businessContext.industry)}</div>`
    : '';

  switch (heroStyle) {
    case 'minimal':
      return `
<header class="ctc-hero ctc-hero--minimal" role="banner">
  <div class="ctc-hero-content">
    <h1 class="ctc-hero-title">${escapeHtml(title)}</h1>
    ${subtitleHtml}
  </div>
</header>`;

    case 'full-bleed':
      return `
<header class="ctc-hero ctc-hero--full-bleed" role="banner">
  ${industryBadge}
  <div class="ctc-hero-content">
    <h1 class="ctc-hero-title">${escapeHtml(title)}</h1>
    ${subtitleHtml}
    ${ctaHtml}
  </div>
</header>`;

    case 'split':
      return `
<header class="ctc-hero ctc-hero--split" role="banner">
  <div class="ctc-container">
    <div class="ctc-hero-grid">
      <div class="ctc-hero-content">
        ${industryBadge}
        <h1 class="ctc-hero-title">${escapeHtml(title)}</h1>
        ${subtitleHtml}
        ${ctaHtml}
      </div>
      <div class="ctc-hero-visual">
        <div class="ctc-hero-visual-glow"></div>
      </div>
    </div>
  </div>
</header>`;

    case 'video':
    case 'animated':
      return `
<header class="ctc-hero ctc-hero--dynamic" role="banner">
  <div class="ctc-hero-overlay"></div>
  <div class="ctc-hero-content">
    ${industryBadge}
    <h1 class="ctc-hero-title">${escapeHtml(title)}</h1>
    ${subtitleHtml}
    ${ctaHtml}
  </div>
</header>`;

    case 'contained':
    default:
      // Clean contained header — NO gradient, matching target sites like NFIR
      return `
<header class="ctc-hero ctc-hero--contained" role="banner">
  <div class="ctc-hero-content">
    ${industryBadge}
    <h1 class="ctc-hero-title">${escapeHtml(title)}</h1>
    ${subtitleHtml}
    ${ctaHtml}
  </div>
</header>`;
  }
}

// =============================================================================
// TOC RENDERER
// =============================================================================

function renderToc(sections: BlueprintSection[]): string {
  const headings = sections
    .filter(s => s.heading && s.headingLevel === 2)
    .map(s => ({ id: s.id, text: s.heading }));

  if (headings.length < 3) return '';

  const isCompact = headings.length >= 12;
  const compactClass = isCompact ? ' ctc-toc--compact' : '';

  return `
<nav class="ctc-toc${compactClass}" aria-label="Table of Contents" data-toc-count="${headings.length}">
  <div class="ctc-toc-header">
    <h2 class="ctc-toc-title">Contents</h2>
  </div>
  <ul class="ctc-toc-list">
    ${headings.map(h => `
    <li class="ctc-toc-item">
      <a href="#${h.id}" class="ctc-toc-link">
        <span class="ctc-toc-arrow">&rarr;</span>
        <span>${escapeHtml(h.text)}</span>
      </a>
    </li>`).join('')}
  </ul>
</nav>`;
}

// =============================================================================
// CTA RENDERER
// =============================================================================

function renderCta(designDna?: DesignDNA, businessContext?: BusinessContext): string {
  if (!businessContext?.ctaText) return '';

  const ctaStyle = designDna?.componentPreferences?.ctaStyle || 'button';

  return `
<aside class="ctc-cta-banner">
  <div class="ctc-cta-banner-inner">
    <h2 class="ctc-cta-banner-title">${escapeHtml(businessContext.ctaText)}</h2>
    <div class="ctc-cta-banner-actions">
      <a href="${escapeHtml(businessContext.ctaUrl || '#contact')}" class="ctc-btn ctc-btn-primary ctc-btn-lg">
        ${escapeHtml(businessContext.ctaText)}
        <span class="ctc-btn-arrow">&rarr;</span>
      </a>
    </div>
  </div>
</aside>`;
}

// =============================================================================
// MARKDOWN PARSER
// =============================================================================

/**
 * Split markdown into per-heading sections.
 * Returns array of { heading, headingLevel, content }.
 */
function splitMarkdownIntoSections(markdown: string): Array<{
  heading: string;
  headingLevel: number;
  content: string;
}> {
  const lines = markdown.split('\n');
  const sections: Array<{ heading: string; headingLevel: number; content: string }> = [];
  let currentHeading = '';
  let currentLevel = 0;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch && headingMatch[1].length <= 3) {
      // Save previous section
      if (currentContent.length > 0 || currentHeading) {
        sections.push({
          heading: currentHeading,
          headingLevel: currentLevel,
          content: currentContent.join('\n').trim(),
        });
      }
      currentHeading = headingMatch[2].trim();
      currentLevel = headingMatch[1].length;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save final section
  if (currentContent.length > 0 || currentHeading) {
    sections.push({
      heading: currentHeading,
      headingLevel: currentLevel,
      content: currentContent.join('\n').trim(),
    });
  }

  return sections;
}

// =============================================================================
// MAIN RENDERER
// =============================================================================

export class PremiumHtmlRenderer {
  /**
   * Render component-rich HTML from a LayoutBlueprint + article markdown.
   *
   * Uses the componentLibrary renderers to produce visual components
   * (timelines, feature grids, FAQ accordions, etc.) instead of flat text blocks.
   */
  static render(
    blueprint: LayoutBlueprintOutput,
    articleMarkdown: string,
    title: string,
    designDna?: DesignDNA,
    businessContext?: BusinessContext
  ): string {
    // Convert markdown to base HTML for content
    let baseHtml = convertMarkdownToSemanticHtml(articleMarkdown, { semantic: true });
    baseHtml = injectHeadingIds(baseHtml);

    // Split markdown into sections to match with blueprint sections
    const markdownSections = splitMarkdownIntoSections(articleMarkdown);

    // Extract first paragraph for hero subtitle
    const firstParagraph = markdownSections.length > 0
      ? extractFirstParagraph(markdownSections[0].content || markdownSections[0].heading)
      : '';

    // Build HTML parts
    const htmlParts: string[] = [];

    // 1. Hero
    htmlParts.push(renderHero(title, firstParagraph, designDna, businessContext));

    // 2. TOC
    htmlParts.push(renderToc(blueprint.sections));

    // 3. Main content
    htmlParts.push('<main class="ctc-main" role="main">');
    htmlParts.push('<article class="ctc-article" itemscope itemtype="https://schema.org/Article">');
    htmlParts.push(`<meta itemprop="headline" content="${escapeHtml(title)}">`);

    for (let i = 0; i < blueprint.sections.length; i++) {
      const bpSection = blueprint.sections[i];

      // Find matching markdown section content
      const mdSection = findMatchingSection(bpSection, markdownSections, i);
      const sectionHtml = mdSection
        ? convertMarkdownToSemanticHtml(mdSection.content, { semantic: true })
        : '';

      // Map to publishing component type
      const publishingType = COMPONENT_TYPE_MAP[bpSection.component.primaryComponent] || 'prose';

      // Build render context
      const ctx: RenderContext = {
        sectionId: bpSection.id,
        content: sectionHtml,
        heading: bpSection.heading,
        headingLevel: bpSection.headingLevel || 2,
        emphasis: mapEmphasis(bpSection.emphasis.level),
        spacing: mapSpacing(bpSection.layout.verticalSpacingBefore),
        hasBackground: bpSection.emphasis.hasBackgroundTreatment,
        hasDivider: false,
        variant: bpSection.component.componentVariant || 'default',
      };

      // Get the component renderer and render
      const renderer = getComponentRenderer(publishingType);
      const rendered = renderer(ctx);
      htmlParts.push(rendered.html);
    }

    htmlParts.push('</article>');
    htmlParts.push('</main>');

    // 4. CTA
    htmlParts.push(renderCta(designDna, businessContext));

    // 5. Interactive scripts
    htmlParts.push(INTERACTIVE_SCRIPT);

    // Wrap everything
    const personality = designDna?.personality?.overall || 'corporate';
    return `<div class="ctc-root ctc-styled ctc-personality-${personality}" data-ctc-version="2.0" data-blueprint-rendered="true">
${htmlParts.join('\n')}
</div>`;
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Find the markdown section that matches a blueprint section by heading
 */
function findMatchingSection(
  bpSection: BlueprintSection,
  mdSections: Array<{ heading: string; headingLevel: number; content: string }>,
  index: number
): { heading: string; headingLevel: number; content: string } | undefined {
  if (!bpSection.heading) {
    return mdSections[index];
  }

  // Try exact heading match first
  const exactMatch = mdSections.find(s =>
    normalizeHeading(s.heading) === normalizeHeading(bpSection.heading)
  );
  if (exactMatch) return exactMatch;

  // Fall back to index-based matching
  return mdSections[index];
}

function normalizeHeading(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractFirstParagraph(content: string): string {
  const withoutHeadings = content.replace(/^#+\s+.+$/gm, '');
  const paragraphs = withoutHeadings.split(/\n\n+/);
  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (trimmed && trimmed.length > 30 && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
      return trimmed.length > 200 ? trimmed.slice(0, 200) + '...' : trimmed;
    }
  }
  return '';
}

const INTERACTIVE_SCRIPT = `
<script>
(function() {
  // FAQ Accordion Toggle
  document.querySelectorAll('.ctc-faq-trigger').forEach(function(trigger) {
    trigger.addEventListener('click', function() {
      var answer = document.getElementById(trigger.getAttribute('aria-controls'));
      var icon = trigger.querySelector('.ctc-faq-icon');
      var isExpanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', !isExpanded);
      if (answer) answer.hidden = isExpanded;
      if (icon) icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(45deg)';
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
})();
</script>`;
