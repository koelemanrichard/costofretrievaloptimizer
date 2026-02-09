// =============================================================================
// PremiumHtmlRenderer — Bridges LayoutEngine blueprint to styled HTML
// =============================================================================
// Renders HTML using class names from ComponentStyles.ts:
//   .article-header, .section, .section-heading, .prose, .feature-grid,
//   .step-list, .faq-accordion, .timeline, .card, .cta-banner, etc.
//
// These class names are styled by generateComponentStyles() which produces
// 1700+ lines of production CSS with brand colors, visual rhythm, and
// responsive layouts.

import type { LayoutBlueprintOutput } from '../layout-engine/LayoutEngine';
import type { BlueprintSection, ComponentType as LayoutComponentType } from '../layout-engine/types';
import { convertMarkdownToSemanticHtml } from '../contentAssemblyService';
import type { DesignDNA } from '../../types/designDna';
import type { BusinessContext } from './types';

// Import extraction functions from componentLibrary (NOT the renderers)
import { extractListItems, extractFaqItems, extractSteps } from '../publishing/renderer/componentLibrary';

// =============================================================================
// MARKDOWN PARSER
// =============================================================================

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
// HELPERS
// =============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').substring(0, 50);
}

/** Convert inline markdown (bold, italic, links) to HTML */
function inlineMarkdown(text: string): string {
  let html = text;
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  return html;
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

function normalizeHeading(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function findMatchingSection(
  bpSection: BlueprintSection,
  mdSections: Array<{ heading: string; headingLevel: number; content: string }>,
  index: number
): { heading: string; headingLevel: number; content: string } | undefined {
  if (!bpSection.heading) {
    return mdSections[index];
  }
  const exactMatch = mdSections.find(s =>
    normalizeHeading(s.heading) === normalizeHeading(bpSection.heading)
  );
  if (exactMatch) return exactMatch;
  return mdSections[index];
}

/** Map emphasis level to heading size class */
function emphasisToHeadingSize(emphasis: string): string {
  switch (emphasis) {
    case 'hero': return 'heading-xl';
    case 'featured': return 'heading-lg';
    case 'standard': return 'heading-md';
    case 'supporting': return 'heading-sm';
    case 'minimal': return 'heading-sm';
    default: return 'heading-md';
  }
}

/** Map emphasis level to CSS class */
function emphasisToClass(level: string): string {
  switch (level) {
    case 'hero': return 'emphasis-hero';
    case 'featured': return 'emphasis-featured';
    case 'supporting': return 'emphasis-supporting';
    case 'minimal': return 'emphasis-minimal';
    default: return 'emphasis-standard';
  }
}

// =============================================================================
// HERO RENDERER
// =============================================================================

function renderHero(
  title: string,
  subtitle: string,
  businessContext?: BusinessContext
): string {
  const ctaHtml = businessContext?.ctaText && businessContext?.ctaUrl
    ? `<a href="${escapeHtml(businessContext.ctaUrl)}" class="cta-button">${escapeHtml(businessContext.ctaText)}</a>`
    : '';

  const subtitleHtml = subtitle
    ? `<p class="article-subtitle">${escapeHtml(subtitle)}</p>`
    : '';

  const industryBadge = businessContext?.industry
    ? `<p class="subtitle">${escapeHtml(businessContext.industry)}${businessContext?.audience ? ` &middot; ${escapeHtml(businessContext.audience)}` : ''}</p>`
    : '';

  return `
<header class="article-header" role="banner">
  <h1>${escapeHtml(title)}</h1>
  ${industryBadge}
  ${subtitleHtml}
  ${ctaHtml}
</header>`;
}

// =============================================================================
// TOC RENDERER
// =============================================================================

function renderToc(sections: BlueprintSection[]): string {
  const headings = sections
    .filter(s => s.heading && s.headingLevel === 2)
    .map(s => ({ id: s.id, text: s.heading }));

  if (headings.length < 3) return '';

  return `
<nav class="article-toc" aria-label="Table of Contents">
  <ul>
    ${headings.map(h => `<li><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`).join('\n    ')}
  </ul>
</nav>`;
}

// =============================================================================
// CTA RENDERER
// =============================================================================

function renderCta(businessContext?: BusinessContext): string {
  if (!businessContext?.ctaText) return '';

  return `
<div class="cta-banner">
  <div class="cta-content">
    <p class="cta-text">${escapeHtml(businessContext.ctaText)}</p>
  </div>
  <div class="cta-actions">
    <a href="${escapeHtml(businessContext.ctaUrl || '#contact')}" class="cta-button cta-primary">
      ${escapeHtml(businessContext.ctaText)} &rarr;
    </a>
  </div>
</div>`;
}

// =============================================================================
// SECTION CONTENT RENDERERS
// =============================================================================

function renderProse(markdownContent: string): string {
  const html = convertMarkdownToSemanticHtml(markdownContent, { semantic: true });
  return `<div class="prose">${html}</div>`;
}

function renderFeatureGrid(items: string[]): string {
  const columns = items.length <= 4 ? 2 : 3;
  const icons = ['✨', '🎯', '🚀', '💡', '⭐', '🔥', '💪', '🎨', '📈', '🎁'];

  return `<div class="feature-grid columns-${columns}">
  ${items.map((item, i) => {
    const parts = item.split(/[:\-–]/).map(p => p.trim());
    const title = parts[0] || item;
    const desc = parts[1] || '';
    return `<div class="feature-card">
    <div class="feature-icon">${icons[i % icons.length]}</div>
    <div class="feature-content">
      <div class="feature-title">${inlineMarkdown(title)}</div>
      ${desc ? `<div class="feature-desc">${inlineMarkdown(desc)}</div>` : ''}
    </div>
  </div>`;
  }).join('\n  ')}
</div>`;
}

function renderStepList(extracted: { introProse: string; steps: Array<{ title: string; description: string }> }): string {
  const introHtml = extracted.introProse
    ? `<div class="prose"><p>${inlineMarkdown(extracted.introProse)}</p></div>`
    : '';

  return `${introHtml}
<div class="step-list">
  ${extracted.steps.map((step, i) => `<div class="step-item">
    <div class="step-indicator">
      <div class="step-number">${i + 1}</div>
    </div>
    <div class="step-content">
      <strong>${inlineMarkdown(step.title)}</strong>
      ${step.description ? `<br>${inlineMarkdown(step.description)}` : ''}
    </div>
  </div>`).join('\n  ')}
</div>`;
}

function renderFaqAccordion(faqs: Array<{ question: string; answer: string }>, sectionId: string): string {
  return `<div class="faq-accordion">
  ${faqs.map((faq, i) => `<div class="faq-item">
    <button type="button" class="faq-question" aria-expanded="false" aria-controls="faq-${sectionId}-${i}">
      <div class="faq-icon">Q</div>
      <div class="faq-question-text">${inlineMarkdown(faq.question)}</div>
      <div class="faq-toggle">+</div>
    </button>
    <div id="faq-${sectionId}-${i}" class="faq-answer" hidden>
      <div class="faq-answer-icon">A</div>
      <div class="faq-answer-text">${inlineMarkdown(faq.answer)}</div>
    </div>
  </div>`).join('\n  ')}
</div>`;
}

function renderTimeline(extracted: { introProse: string; steps: Array<{ title: string; description: string }> }): string {
  const introHtml = extracted.introProse
    ? `<div class="prose"><p>${inlineMarkdown(extracted.introProse)}</p></div>`
    : '';

  return `${introHtml}
<div class="timeline">
  ${extracted.steps.map((step, i) => `<div class="timeline-item">
    <div class="timeline-marker">
      <div class="timeline-number">${i + 1}</div>
    </div>
    <div class="timeline-content">
      <strong>${inlineMarkdown(step.title)}</strong>
      <div class="timeline-body">${step.description ? inlineMarkdown(step.description) : ''}</div>
    </div>
  </div>`).join('\n  ')}
</div>`;
}

function renderKeyTakeaways(items: string[], heading?: string): string {
  return `<div class="key-takeaways">
  <div class="takeaways-header">
    <span class="takeaways-icon">💡</span>
    <span class="takeaways-title">${escapeHtml(heading || 'Key Takeaways')}</span>
  </div>
  <ul class="takeaways-list">
    ${items.map(item => `<li class="takeaway-item">
      <span class="takeaway-icon">✓</span>
      <span class="takeaway-text">${inlineMarkdown(item)}</span>
    </li>`).join('\n    ')}
  </ul>
</div>`;
}

function renderChecklist(items: string[]): string {
  return `<ul class="checklist">
  ${items.map(item => `<li class="checklist-item">
    <span class="checklist-check">✓</span>
    <span class="checklist-text">${inlineMarkdown(item)}</span>
  </li>`).join('\n  ')}
</ul>`;
}

function renderStatGrid(items: string[]): string {
  return `<div class="stat-grid">
  ${items.map(item => {
    const match = item.match(/(\d+[%+]?|\d+\.\d+)/);
    const stat = match ? match[1] : '•';
    const label = item.replace(/\d+[%+]?|\d+\.\d+/, '').trim() || item;
    return `<div class="stat-item">
    <span class="stat-value">${escapeHtml(stat)}</span>
    <span class="stat-label">${inlineMarkdown(label)}</span>
  </div>`;
  }).join('\n  ')}
</div>`;
}

function renderTestimonial(markdownContent: string): string {
  const quoteMatch = markdownContent.match(/>\s*(.+)/);
  const text = quoteMatch ? quoteMatch[1].trim() : markdownContent.split('\n')[0].trim();
  return `<div class="testimonial-card">
  <div class="testimonial-quote-mark">&ldquo;</div>
  <p class="testimonial-text">${inlineMarkdown(text)}</p>
</div>`;
}

function renderBlockquote(markdownContent: string): string {
  const text = markdownContent.replace(/^>\s*/gm, '').trim();
  return `<div class="blockquote">
  <p>${inlineMarkdown(text)}</p>
</div>`;
}

function renderAlertBox(markdownContent: string): string {
  const html = convertMarkdownToSemanticHtml(markdownContent, { semantic: true });
  return `<div class="alert-box">
  <div class="alert-box-icon">⚠️</div>
  <div class="alert-box-content">${html}</div>
</div>`;
}

function renderInfoBox(markdownContent: string): string {
  const html = convertMarkdownToSemanticHtml(markdownContent, { semantic: true });
  return `<div class="info-box">
  ${html}
</div>`;
}

function renderDefinitionBox(markdownContent: string): string {
  const html = convertMarkdownToSemanticHtml(markdownContent, { semantic: true });
  return `<div class="definition-box">
  <div class="definition-icon">📖</div>
  <div class="definition-content">${html}</div>
</div>`;
}

function renderLeadParagraph(markdownContent: string): string {
  const firstPara = markdownContent.split(/\n\n+/)[0] || markdownContent;
  return `<div class="lead-paragraph">
  <div class="lead-text">${inlineMarkdown(firstPara.trim())}</div>
</div>`;
}

function renderComparisonTable(markdownContent: string): string {
  const html = convertMarkdownToSemanticHtml(markdownContent, { semantic: true });
  // Wrap any <table> in comparison-table-wrapper
  const wrapped = html.replace(/<table>/g, '<div class="comparison-table-wrapper"><table class="comparison-table">')
                       .replace(/<\/table>/g, '</table></div>');
  return wrapped;
}

// =============================================================================
// SECTION CONTENT DISPATCHER
// =============================================================================

function renderSectionContent(
  componentType: LayoutComponentType,
  markdownContent: string,
  sectionId: string,
  heading?: string
): string {
  // Try component-specific rendering; fall back to prose if no structured data found
  switch (componentType) {
    case 'feature-grid':
    case 'card': {
      const items = extractListItems(markdownContent);
      if (items.length >= 2) return renderFeatureGrid(items);
      return renderProse(markdownContent);
    }

    case 'step-list': {
      const extracted = extractSteps(markdownContent);
      if (extracted.steps.length >= 2) return renderStepList(extracted);
      return renderProse(markdownContent);
    }

    case 'accordion':
    case 'faq-accordion': {
      const faqs = extractFaqItems(markdownContent);
      if (faqs.length >= 1) return renderFaqAccordion(faqs, sectionId);
      return renderProse(markdownContent);
    }

    case 'timeline': {
      const extracted = extractSteps(markdownContent);
      if (extracted.steps.length >= 2) return renderTimeline(extracted);
      return renderProse(markdownContent);
    }

    case 'key-takeaways': {
      const items = extractListItems(markdownContent);
      if (items.length >= 1) return renderKeyTakeaways(items, heading);
      return renderProse(markdownContent);
    }

    case 'checklist': {
      const items = extractListItems(markdownContent);
      if (items.length >= 1) return renderChecklist(items);
      return renderProse(markdownContent);
    }

    case 'stat-highlight': {
      const items = extractListItems(markdownContent);
      if (items.length >= 1) return renderStatGrid(items);
      return renderProse(markdownContent);
    }

    case 'comparison-table':
      return renderComparisonTable(markdownContent);

    case 'testimonial-card':
      return renderTestimonial(markdownContent);

    case 'blockquote':
      return renderBlockquote(markdownContent);

    case 'alert-box':
      return renderAlertBox(markdownContent);

    case 'info-box':
      return renderInfoBox(markdownContent);

    case 'definition-box':
      return renderDefinitionBox(markdownContent);

    case 'lead-paragraph':
      return renderLeadParagraph(markdownContent);

    case 'cta-banner':
      return renderProse(markdownContent);

    case 'prose':
    case 'hero':
    default:
      return renderProse(markdownContent);
  }
}

// =============================================================================
// SECTION RENDERER
// =============================================================================

function renderSection(
  bpSection: BlueprintSection,
  markdownContent: string,
  index: number
): string {
  const componentType = bpSection.component.primaryComponent;
  const emphasisLevel = bpSection.emphasis.level;
  const emphasisClass = emphasisToClass(emphasisLevel);
  const layoutClass = `layout-${bpSection.layout.width || 'medium'}`;
  const spacingBefore = `spacing-before-${bpSection.layout.verticalSpacingBefore || 'normal'}`;
  const spacingAfter = `spacing-after-${bpSection.layout.verticalSpacingAfter || 'normal'}`;
  const sectionTypeClass = `section-${componentType}`;

  const headingSize = emphasisToHeadingSize(emphasisLevel);
  const headingHtml = bpSection.heading
    ? `<h2 id="${bpSection.id}" class="section-heading ${headingSize}">${escapeHtml(bpSection.heading)}</h2>`
    : '';

  const contentHtml = renderSectionContent(componentType, markdownContent, bpSection.id, bpSection.heading);

  return `
<section class="section ${emphasisClass} ${sectionTypeClass} ${layoutClass} ${spacingBefore} ${spacingAfter}">
  <div class="section-container">
    ${headingHtml}
    <div class="section-content">
      ${contentHtml}
    </div>
  </div>
</section>`;
}

// =============================================================================
// INTERACTIVE SCRIPT
// =============================================================================

const INTERACTIVE_SCRIPT = `
<script>
(function() {
  // FAQ Accordion Toggle
  document.querySelectorAll('.faq-question').forEach(function(trigger) {
    trigger.addEventListener('click', function() {
      var answerId = trigger.getAttribute('aria-controls');
      var answer = answerId ? document.getElementById(answerId) : trigger.nextElementSibling;
      var toggle = trigger.querySelector('.faq-toggle');
      var isExpanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', !isExpanded);
      if (answer) answer.hidden = isExpanded;
      if (toggle) toggle.textContent = isExpanded ? '+' : '−';
    });
  });

  // Smooth scroll for TOC links
  document.querySelectorAll('.article-toc a[href^="#"]').forEach(function(link) {
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

// =============================================================================
// MAIN RENDERER
// =============================================================================

export class PremiumHtmlRenderer {
  /**
   * Render component-rich HTML from a LayoutBlueprint + article markdown.
   *
   * Uses ComponentStyles class names (.section, .prose, .feature-grid, etc.)
   * so the output is properly styled by generateComponentStyles() CSS.
   */
  static render(
    blueprint: LayoutBlueprintOutput,
    articleMarkdown: string,
    title: string,
    designDna?: DesignDNA,
    businessContext?: BusinessContext
  ): string {
    // Split markdown into sections to match with blueprint sections
    const markdownSections = splitMarkdownIntoSections(articleMarkdown);

    // Extract first paragraph for hero subtitle
    const firstParagraph = markdownSections.length > 0
      ? extractFirstParagraph(markdownSections[0].content || markdownSections[0].heading)
      : '';

    // Build HTML parts
    const htmlParts: string[] = [];

    // 1. Hero (uses .article-header classes from ComponentStyles)
    htmlParts.push(renderHero(title, firstParagraph, businessContext));

    // 2. TOC (uses .article-toc classes from ComponentStyles)
    const tocHtml = renderToc(blueprint.sections);
    if (tocHtml) htmlParts.push(tocHtml);

    // 3. Main content (semantic article structure)
    htmlParts.push('<main role="main">');
    htmlParts.push(`<article itemscope itemtype="https://schema.org/Article">`);
    htmlParts.push(`<meta itemprop="headline" content="${escapeHtml(title)}">`);

    for (let i = 0; i < blueprint.sections.length; i++) {
      const bpSection = blueprint.sections[i];

      // Find matching markdown section content
      const mdSection = findMatchingSection(bpSection, markdownSections, i);
      const markdownContent = mdSection?.content || '';

      htmlParts.push(renderSection(bpSection, markdownContent, i));
    }

    htmlParts.push('</article>');
    htmlParts.push('</main>');

    // 4. CTA (uses .cta-banner classes from ComponentStyles)
    const ctaHtml = renderCta(businessContext);
    if (ctaHtml) htmlParts.push(ctaHtml);

    // 5. Interactive scripts (FAQ accordion, smooth scroll)
    htmlParts.push(INTERACTIVE_SCRIPT);

    // Wrap in styled-article container
    const personality = designDna?.personality?.overall || 'corporate';
    return `<div class="styled-article" data-ctc-version="2.0" data-blueprint-rendered="true" data-personality="${personality}">
${htmlParts.join('\n')}
</div>`;
  }
}
