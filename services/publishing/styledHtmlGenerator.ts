/**
 * Styled HTML Generator Service
 *
 * Converts content + style/layout configuration to publication-ready HTML:
 * - Applies semantic CSS classes (ctc-*)
 * - Generates CSS variables from design tokens
 * - Assembles components based on layout configuration
 * - Preserves SEO elements (schema, headings, meta)
 *
 * @module services/publishing/styledHtmlGenerator
 */

import type {
  PublishingStyle,
  LayoutConfiguration,
  StyledContentOutput,
  CssVariables,
  DetectedComponent,
  SeoValidationResult,
  SeoWarning,
  ComponentConfig,
} from '../../types/publishing';
import { designTokensToCssVariables, cssVariablesToString } from './styleConfigService';
import {
  detectComponents,
  extractHeadings,
  extractFaqItems,
  extractKeyTakeaways,
} from './componentDetector';

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate styled HTML from content and configuration
 */
export function generateStyledContent(
  content: string,
  style: PublishingStyle,
  layout: LayoutConfiguration,
  options: {
    title?: string;
    authorName?: string;
    authorBio?: string;
    authorImage?: string;
    publishDate?: string;
    readTime?: number;
    ctaText?: string;
    ctaUrl?: string;
  } = {}
): StyledContentOutput {
  // Generate CSS variables
  const cssVariables = designTokensToCssVariables(style.designTokens);

  // Detect components in content
  const detectedComponents = detectComponents(content);

  // Process content with semantic classes
  let processedHtml = processContentToHtml(content, layout.components);

  // Generate component HTML sections
  const componentSections = generateComponentSections(
    content,
    layout.components,
    detectedComponents,
    options
  );

  // Assemble final HTML
  const assembledHtml = assembleStyledHtml(
    processedHtml,
    componentSections,
    layout,
    options
  );

  // Generate scoped CSS
  const scopedCss = generateScopedCss(style, layout);

  // Validate SEO
  const seoValidation = validateSeo(assembledHtml, content);

  return {
    html: assembledHtml,
    css: scopedCss,
    cssVariables,
    components: detectedComponents,
    seoValidation,
    template: layout.template,
  };
}

// ============================================================================
// Content Processing
// ============================================================================

/**
 * Process raw content to HTML with semantic classes
 */
function processContentToHtml(content: string, components: ComponentConfig): string {
  let html = content;

  // Convert markdown to HTML if needed
  if (!html.includes('<')) {
    html = markdownToHtml(html);
  }

  // Add semantic classes to headings
  html = html.replace(/<h1([^>]*)>/gi, '<h1$1 class="ctc-title">');
  html = html.replace(/<h2([^>]*)>/gi, '<h2$1 class="ctc-heading ctc-h2">');
  html = html.replace(/<h3([^>]*)>/gi, '<h3$1 class="ctc-heading ctc-h3">');
  html = html.replace(/<h4([^>]*)>/gi, '<h4$1 class="ctc-heading ctc-h4">');

  // Add classes to paragraphs
  html = html.replace(/<p([^>]*)>/gi, '<p$1 class="ctc-paragraph">');

  // Add classes to lists
  html = html.replace(/<ul([^>]*)>/gi, '<ul$1 class="ctc-list ctc-list--unordered">');
  html = html.replace(/<ol([^>]*)>/gi, '<ol$1 class="ctc-list ctc-list--ordered">');
  html = html.replace(/<li([^>]*)>/gi, '<li$1 class="ctc-list-item">');

  // Add classes to tables
  html = html.replace(/<table([^>]*)>/gi, '<table$1 class="ctc-table">');
  html = html.replace(/<thead([^>]*)>/gi, '<thead$1 class="ctc-table-head">');
  html = html.replace(/<tbody([^>]*)>/gi, '<tbody$1 class="ctc-table-body">');
  html = html.replace(/<tr([^>]*)>/gi, '<tr$1 class="ctc-table-row">');
  html = html.replace(/<th([^>]*)>/gi, '<th$1 class="ctc-table-header">');
  html = html.replace(/<td([^>]*)>/gi, '<td$1 class="ctc-table-cell">');

  // Add classes to images
  html = html.replace(/<img([^>]*)>/gi, '<img$1 class="ctc-image">');
  html = html.replace(/<figure([^>]*)>/gi, '<figure$1 class="ctc-figure">');
  html = html.replace(/<figcaption([^>]*)>/gi, '<figcaption$1 class="ctc-figcaption">');

  // Add classes to blockquotes
  html = html.replace(/<blockquote([^>]*)>/gi, '<blockquote$1 class="ctc-blockquote">');

  // Add classes to code blocks
  html = html.replace(/<pre([^>]*)>/gi, '<pre$1 class="ctc-code-block">');
  html = html.replace(/<code([^>]*)>/gi, '<code$1 class="ctc-code">');

  // Wrap content sections
  html = wrapContentSections(html);

  return html;
}

/**
 * Basic markdown to HTML conversion
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="ctc-link">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="ctc-image">');

  // Unordered lists
  html = html.replace(/^(\s*)-\s+(.+)$/gm, '$1<li>$2</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Ordered lists
  html = html.replace(/^(\s*)\d+\.\s+(.+)$/gm, '$1<li>$2</li>');

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Paragraphs (wrap remaining text)
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return line;
    return `<p>${line}</p>`;
  });
  html = processedLines.join('\n');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="ctc-divider">');

  return html;
}

/**
 * Wrap content in section containers
 */
function wrapContentSections(html: string): string {
  // Split by h2 headings and wrap each section
  const sections = html.split(/(?=<h2)/i);

  return sections.map((section, index) => {
    if (index === 0 && !section.trim().startsWith('<h2')) {
      // Introduction section
      return `<section class="ctc-section ctc-intro">${section}</section>`;
    }
    return `<section class="ctc-section">${section}</section>`;
  }).join('\n');
}

// ============================================================================
// Component Generation
// ============================================================================

interface ComponentSections {
  hero?: string;
  keyTakeaways?: string;
  toc?: string;
  authorBoxTop?: string;
  authorBoxBottom?: string;
  faq?: string;
  ctaBanners: string[];
  relatedContent?: string;
  progressBar?: string;
}

/**
 * Generate HTML for configured components
 */
function generateComponentSections(
  content: string,
  components: ComponentConfig,
  detected: DetectedComponent[],
  options: {
    title?: string;
    authorName?: string;
    authorBio?: string;
    authorImage?: string;
    publishDate?: string;
    readTime?: number;
    ctaText?: string;
    ctaUrl?: string;
  }
): ComponentSections {
  const sections: ComponentSections = {
    ctaBanners: [],
  };

  // Hero section
  if (components.hero.enabled && options.title) {
    sections.hero = generateHeroHtml(
      options.title,
      components.hero,
      options.publishDate,
      options.readTime
    );
  }

  // Key Takeaways
  if (components.keyTakeaways.enabled) {
    const takeaways = extractKeyTakeaways(content);
    if (takeaways.length > 0) {
      sections.keyTakeaways = generateKeyTakeawaysHtml(
        takeaways.slice(0, components.keyTakeaways.maxItems),
        components.keyTakeaways
      );
    }
  }

  // Table of Contents
  if (components.toc.enabled) {
    const headings = extractHeadings(content, components.toc.maxDepth);
    if (headings.length > 0) {
      sections.toc = generateTocHtml(headings, components.toc);
    }
  }

  // Author Box
  if (components.authorBox.enabled && options.authorName) {
    const authorHtml = generateAuthorBoxHtml(
      options.authorName,
      options.authorBio,
      options.authorImage,
      components.authorBox
    );
    if (components.authorBox.position === 'top' || components.authorBox.position === 'both') {
      sections.authorBoxTop = authorHtml;
    }
    if (components.authorBox.position === 'bottom' || components.authorBox.position === 'both') {
      sections.authorBoxBottom = authorHtml;
    }
  }

  // FAQ Section
  if (components.faq.enabled) {
    const faqs = extractFaqItems(content);
    if (faqs.length > 0) {
      sections.faq = generateFaqHtml(faqs, components.faq);
    }
  }

  // CTA Banners
  if (components.ctaBanners.enabled && options.ctaText) {
    const ctaHtml = generateCtaBannerHtml(
      options.ctaText,
      options.ctaUrl || '#',
      components.ctaBanners
    );
    sections.ctaBanners = components.ctaBanners.positions.map(() => ctaHtml);
  }

  // Progress Bar (reading experience)
  if (components.readingExperience.progressBar) {
    sections.progressBar = '<div class="ctc-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div class="ctc-progress-fill"></div></div>';
  }

  return sections;
}

/**
 * Generate Hero HTML
 */
function generateHeroHtml(
  title: string,
  config: ComponentConfig['hero'],
  publishDate?: string,
  readTime?: number
): string {
  const styleClass = `ctc-hero--${config.style}`;

  let metaHtml = '';
  if (publishDate || readTime) {
    metaHtml = '<div class="ctc-hero-meta">';
    if (publishDate) {
      metaHtml += `<time class="ctc-hero-date" datetime="${publishDate}">${formatDate(publishDate)}</time>`;
    }
    if (readTime) {
      metaHtml += `<span class="ctc-hero-readtime">${readTime} min read</span>`;
    }
    metaHtml += '</div>';
  }

  let ctaHtml = '';
  if (config.ctaButton) {
    ctaHtml = '<a href="#main-content" class="ctc-hero-cta ctc-button ctc-button--primary">Read More</a>';
  }

  return `
<header class="ctc-hero ${styleClass}">
  <div class="ctc-hero-content">
    <h1 class="ctc-hero-title">${title}</h1>
    ${config.showSubtitle ? '<p class="ctc-hero-subtitle"></p>' : ''}
    ${metaHtml}
    ${ctaHtml}
  </div>
</header>`;
}

/**
 * Generate Key Takeaways HTML
 */
function generateKeyTakeawaysHtml(
  takeaways: string[],
  config: ComponentConfig['keyTakeaways']
): string {
  const styleClass = `ctc-takeaways--${config.style}`;

  let listHtml = '';
  if (config.style === 'numbered-list') {
    listHtml = `<ol class="ctc-takeaways-list">${takeaways.map((t, i) => `<li class="ctc-takeaways-item"><span class="ctc-takeaways-number">${i + 1}</span>${t}</li>`).join('')}</ol>`;
  } else if (config.style === 'icon-list') {
    listHtml = `<ul class="ctc-takeaways-list">${takeaways.map(t => `<li class="ctc-takeaways-item"><span class="ctc-takeaways-icon">✓</span>${t}</li>`).join('')}</ul>`;
  } else {
    listHtml = `<ul class="ctc-takeaways-list">${takeaways.map(t => `<li class="ctc-takeaways-item">${t}</li>`).join('')}</ul>`;
  }

  return `
<aside class="ctc-takeaways ${styleClass}">
  <h2 class="ctc-takeaways-title">Key Takeaways</h2>
  ${listHtml}
</aside>`;
}

/**
 * Generate Table of Contents HTML
 */
function generateTocHtml(
  headings: Array<{ level: number; text: string; id: string }>,
  config: ComponentConfig['toc']
): string {
  const positionClass = `ctc-toc--${config.position}`;
  const stickyClass = config.sticky ? 'ctc-toc--sticky' : '';

  const listItems = headings.map(h => {
    const indentClass = `ctc-toc-item--level-${h.level}`;
    return `<li class="ctc-toc-item ${indentClass}"><a href="#${h.id}" class="ctc-toc-link">${h.text}</a></li>`;
  }).join('');

  return `
<nav class="ctc-toc ${positionClass} ${stickyClass}" aria-label="Table of Contents">
  <h2 class="ctc-toc-title">Contents</h2>
  ${config.collapsible ? '<button class="ctc-toc-toggle" aria-expanded="true">Toggle</button>' : ''}
  <ol class="ctc-toc-list">
    ${listItems}
  </ol>
</nav>`;
}

/**
 * Generate Author Box HTML
 */
function generateAuthorBoxHtml(
  name: string,
  bio?: string,
  image?: string,
  config?: ComponentConfig['authorBox']
): string {
  const showImage = config?.showImage ?? true;
  const showBio = config?.showBio ?? true;

  return `
<aside class="ctc-author-box">
  ${showImage && image ? `<img src="${image}" alt="${name}" class="ctc-author-image">` : ''}
  <div class="ctc-author-info">
    <span class="ctc-author-label">Written by</span>
    <span class="ctc-author-name">${name}</span>
    ${showBio && bio ? `<p class="ctc-author-bio">${bio}</p>` : ''}
  </div>
</aside>`;
}

/**
 * Generate FAQ HTML with optional schema
 */
function generateFaqHtml(
  faqs: Array<{ question: string; answer: string }>,
  config: ComponentConfig['faq']
): string {
  const styleClass = `ctc-faq--${config.style}`;

  const itemsHtml = faqs.map((faq, index) => {
    if (config.style === 'accordion') {
      return `
<div class="ctc-faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
  <button class="ctc-faq-question" aria-expanded="false" aria-controls="faq-answer-${index}">
    <span itemprop="name">${faq.question}</span>
    <span class="ctc-faq-icon" aria-hidden="true"></span>
  </button>
  <div id="faq-answer-${index}" class="ctc-faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
    <p itemprop="text">${faq.answer}</p>
  </div>
</div>`;
    }
    return `
<div class="ctc-faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
  <h3 class="ctc-faq-question" itemprop="name">${faq.question}</h3>
  <div class="ctc-faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
    <p itemprop="text">${faq.answer}</p>
  </div>
</div>`;
  }).join('');

  const schemaWrapper = config.showSchema
    ? 'itemscope itemtype="https://schema.org/FAQPage"'
    : '';

  return `
<section class="ctc-faq ${styleClass}" ${schemaWrapper}>
  <h2 class="ctc-faq-title">Frequently Asked Questions</h2>
  <div class="ctc-faq-list">
    ${itemsHtml}
  </div>
</section>`;
}

/**
 * Generate CTA Banner HTML
 */
function generateCtaBannerHtml(
  text: string,
  url: string,
  config: ComponentConfig['ctaBanners']
): string {
  const styleClass = `ctc-cta--${config.style}`;

  return `
<aside class="ctc-cta ${styleClass}">
  <div class="ctc-cta-content">
    ${config.secondaryText ? `<p class="ctc-cta-text">${config.secondaryText}</p>` : ''}
    <a href="${url}" class="ctc-cta-button ctc-button ctc-button--primary">${text}</a>
  </div>
</aside>`;
}

// ============================================================================
// HTML Assembly
// ============================================================================

/**
 * Assemble all components into final HTML
 */
function assembleStyledHtml(
  contentHtml: string,
  components: ComponentSections,
  layout: LayoutConfiguration,
  options: { title?: string }
): string {
  const templateClass = `ctc-template-${layout.template}`;
  const parts: string[] = [];

  // Progress bar (fixed position)
  if (components.progressBar) {
    parts.push(components.progressBar);
  }

  // Hero
  if (components.hero) {
    parts.push(components.hero);
  }

  // Main article wrapper
  parts.push(`<article class="ctc-styled ${templateClass}" id="main-content">`);

  // Author box (top)
  if (components.authorBoxTop) {
    parts.push(components.authorBoxTop);
  }

  // Key takeaways (if position is 'top')
  if (components.keyTakeaways && layout.components.keyTakeaways.position === 'top') {
    parts.push(components.keyTakeaways);
  }

  // Layout wrapper for ToC sidebar
  const hasSidebarToc = components.toc && layout.components.toc.position === 'sidebar';

  if (hasSidebarToc) {
    parts.push('<div class="ctc-layout ctc-layout--with-sidebar">');
    parts.push(components.toc!);
    parts.push('<main class="ctc-main">');
  } else {
    parts.push('<main class="ctc-main">');

    // Inline ToC
    if (components.toc && layout.components.toc.position === 'inline') {
      parts.push(components.toc);
    }
  }

  // Key takeaways (if position is 'after-intro')
  if (components.keyTakeaways && layout.components.keyTakeaways.position === 'after-intro') {
    // Insert after first section
    const firstSectionEnd = contentHtml.indexOf('</section>');
    if (firstSectionEnd > -1) {
      const beforeFirst = contentHtml.slice(0, firstSectionEnd + 10);
      const afterFirst = contentHtml.slice(firstSectionEnd + 10);

      // CTA after intro
      let afterIntroCta = '';
      if (components.ctaBanners.length > 0 && layout.components.ctaBanners.positions.includes('after-intro')) {
        afterIntroCta = components.ctaBanners[0];
      }

      parts.push(beforeFirst);
      parts.push(components.keyTakeaways);
      parts.push(afterIntroCta);
      parts.push(afterFirst);
    } else {
      parts.push(components.keyTakeaways);
      parts.push(contentHtml);
    }
  } else {
    parts.push(contentHtml);
  }

  // Mid-content CTA
  if (components.ctaBanners.length > 0 && layout.components.ctaBanners.positions.includes('mid-content')) {
    parts.push(components.ctaBanners[0]);
  }

  // FAQ section
  if (components.faq) {
    // CTA before FAQ
    if (components.ctaBanners.length > 0 && layout.components.ctaBanners.positions.includes('before-faq')) {
      parts.push(components.ctaBanners[0]);
    }
    parts.push(components.faq);
  }

  // End CTA
  if (components.ctaBanners.length > 0 && layout.components.ctaBanners.positions.includes('end')) {
    parts.push(components.ctaBanners[0]);
  }

  // Close main
  parts.push('</main>');

  if (hasSidebarToc) {
    parts.push('</div>'); // Close layout wrapper
  }

  // Author box (bottom)
  if (components.authorBoxBottom) {
    parts.push(components.authorBoxBottom);
  }

  // Related content
  if (components.relatedContent) {
    parts.push(components.relatedContent);
  }

  // Close article
  parts.push('</article>');

  return parts.join('\n');
}

// ============================================================================
// CSS Generation
// ============================================================================

/**
 * Generate scoped CSS for the styled content
 */
function generateScopedCss(style: PublishingStyle, layout: LayoutConfiguration): string {
  const cssVars = cssVariablesToString(designTokensToCssVariables(style.designTokens));

  const componentCss = `
/* CTC Styled Content - Scoped Styles */

/* CSS Variables */
${cssVars}

/* Base Styles */
.ctc-styled {
  font-family: var(--ctc-font-body);
  color: var(--ctc-text);
  line-height: 1.7;
  max-width: var(--ctc-content-width);
  margin: 0 auto;
  padding: 0 1rem;
}

/* Typography */
.ctc-title {
  font-family: var(--ctc-font-heading);
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 1rem;
  color: var(--ctc-text);
}

.ctc-heading {
  font-family: var(--ctc-font-heading);
  color: var(--ctc-text);
  margin-top: 2rem;
  margin-bottom: 1rem;
}

.ctc-h2 { font-size: 1.875rem; font-weight: 600; }
.ctc-h3 { font-size: 1.5rem; font-weight: 600; }
.ctc-h4 { font-size: 1.25rem; font-weight: 600; }

.ctc-paragraph {
  margin-bottom: 1.25rem;
  color: var(--ctc-text);
}

.ctc-link {
  color: var(--ctc-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.ctc-link:hover {
  color: var(--ctc-secondary);
}

/* Layout */
.ctc-layout--with-sidebar {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 2rem;
}

@media (max-width: 1024px) {
  .ctc-layout--with-sidebar {
    grid-template-columns: 1fr;
  }
}

.ctc-main {
  min-width: 0;
}

.ctc-section {
  margin-bottom: var(--ctc-section-gap);
}

/* Hero */
.ctc-hero {
  padding: 3rem 1rem;
  margin-bottom: 2rem;
  background: var(--ctc-surface);
  border-radius: var(--ctc-radius);
}

.ctc-hero--full-width {
  padding: 4rem 2rem;
  text-align: center;
  background: linear-gradient(135deg, var(--ctc-primary), var(--ctc-secondary));
  color: white;
}

.ctc-hero--full-width .ctc-hero-title {
  color: white;
}

.ctc-hero--minimal {
  background: transparent;
  padding: 2rem 0;
}

.ctc-hero--split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: center;
}

.ctc-hero-meta {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  font-size: 0.875rem;
  color: var(--ctc-text-muted);
}

/* Key Takeaways */
.ctc-takeaways {
  background: var(--ctc-surface);
  border-left: 4px solid var(--ctc-primary);
  padding: 1.5rem;
  margin: 2rem 0;
  border-radius: var(--ctc-radius);
}

.ctc-takeaways-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--ctc-primary);
}

.ctc-takeaways-list {
  margin: 0;
  padding-left: 1.5rem;
}

.ctc-takeaways-item {
  margin-bottom: 0.5rem;
}

.ctc-takeaways--icon-list .ctc-takeaways-list {
  list-style: none;
  padding-left: 0;
}

.ctc-takeaways-icon {
  color: var(--ctc-primary);
  margin-right: 0.5rem;
}

.ctc-takeaways-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: var(--ctc-primary);
  color: white;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 0.75rem;
}

/* Table of Contents */
.ctc-toc {
  background: var(--ctc-surface);
  padding: 1.5rem;
  border-radius: var(--ctc-radius);
}

.ctc-toc--sidebar {
  position: sticky;
  top: 2rem;
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
}

.ctc-toc-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--ctc-text);
}

.ctc-toc-list {
  margin: 0;
  padding-left: 1rem;
  list-style: none;
}

.ctc-toc-item {
  margin-bottom: 0.5rem;
}

.ctc-toc-item--level-3 {
  margin-left: 1rem;
}

.ctc-toc-item--level-4 {
  margin-left: 2rem;
}

.ctc-toc-link {
  color: var(--ctc-text-muted);
  text-decoration: none;
  font-size: 0.875rem;
}

.ctc-toc-link:hover {
  color: var(--ctc-primary);
}

/* Author Box */
.ctc-author-box {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--ctc-surface);
  border-radius: var(--ctc-radius);
  margin: 2rem 0;
}

.ctc-author-image {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
}

.ctc-author-label {
  display: block;
  font-size: 0.75rem;
  color: var(--ctc-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ctc-author-name {
  display: block;
  font-weight: 600;
  color: var(--ctc-text);
}

.ctc-author-bio {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--ctc-text-muted);
}

/* FAQ */
.ctc-faq {
  margin: 3rem 0;
}

.ctc-faq-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

.ctc-faq-item {
  border-bottom: 1px solid var(--ctc-border);
  padding: 1rem 0;
}

.ctc-faq--accordion .ctc-faq-question {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  background: none;
  border: none;
  text-align: left;
  font-size: 1rem;
  font-weight: 500;
  color: var(--ctc-text);
  cursor: pointer;
  padding: 0;
}

.ctc-faq-icon::after {
  content: '+';
  font-size: 1.25rem;
}

.ctc-faq-question[aria-expanded="true"] .ctc-faq-icon::after {
  content: '−';
}

.ctc-faq-answer {
  padding-top: 0.75rem;
  color: var(--ctc-text-muted);
}

.ctc-faq--accordion .ctc-faq-answer {
  display: none;
}

.ctc-faq--accordion .ctc-faq-question[aria-expanded="true"] + .ctc-faq-answer {
  display: block;
}

/* CTA Banners */
.ctc-cta {
  padding: 2rem;
  background: var(--ctc-surface);
  border-radius: var(--ctc-radius);
  text-align: center;
  margin: 2rem 0;
}

.ctc-cta--full-width {
  background: linear-gradient(135deg, var(--ctc-primary), var(--ctc-secondary));
  color: white;
  padding: 3rem 2rem;
}

.ctc-cta--full-width .ctc-cta-text {
  color: rgba(255,255,255,0.9);
}

.ctc-cta-text {
  margin-bottom: 1rem;
  color: var(--ctc-text-muted);
}

/* Buttons */
.ctc-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  border-radius: var(--ctc-radius);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ctc-button--primary {
  background: var(--ctc-primary);
  color: white;
  border: none;
}

.ctc-button--primary:hover {
  background: var(--ctc-secondary);
}

/* Tables */
.ctc-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
  font-size: 0.875rem;
}

.ctc-table-header {
  background: var(--ctc-surface);
  font-weight: 600;
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 2px solid var(--ctc-border);
}

.ctc-table-cell {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--ctc-border);
}

/* Lists */
.ctc-list {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.ctc-list-item {
  margin-bottom: 0.5rem;
}

/* Blockquotes */
.ctc-blockquote {
  border-left: 4px solid var(--ctc-primary);
  padding-left: 1.5rem;
  margin: 1.5rem 0;
  font-style: italic;
  color: var(--ctc-text-muted);
}

/* Code */
.ctc-code {
  font-family: var(--ctc-font-mono);
  background: var(--ctc-surface);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.ctc-code-block {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1rem;
  border-radius: var(--ctc-radius);
  overflow-x: auto;
  margin: 1.5rem 0;
}

.ctc-code-block .ctc-code {
  background: none;
  padding: 0;
}

/* Images */
.ctc-image {
  max-width: 100%;
  height: auto;
  border-radius: var(--ctc-radius);
}

.ctc-figure {
  margin: 1.5rem 0;
}

.ctc-figcaption {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--ctc-text-muted);
  text-align: center;
}

/* Progress Bar */
.ctc-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--ctc-border);
  z-index: 1000;
}

.ctc-progress-fill {
  height: 100%;
  background: var(--ctc-primary);
  width: 0%;
  transition: width 0.1s ease;
}

/* Responsive */
@media (max-width: 768px) {
  .ctc-title {
    font-size: 2rem;
  }

  .ctc-hero--split {
    grid-template-columns: 1fr;
  }

  .ctc-hero {
    padding: 2rem 1rem;
  }

  .ctc-author-box {
    flex-direction: column;
    text-align: center;
  }
}
`;

  return componentCss;
}

// ============================================================================
// SEO Validation
// ============================================================================

/**
 * Validate SEO elements in styled content
 */
function validateSeo(styledHtml: string, originalContent: string): SeoValidationResult {
  const warnings: SeoWarning[] = [];

  // Check heading structure
  const h1Matches = styledHtml.match(/<h1[^>]*>/gi) || [];
  const hasH1 = h1Matches.length > 0;

  if (!hasH1) {
    warnings.push({
      type: 'heading',
      severity: 'error',
      message: 'Missing H1 heading',
      suggestion: 'Add a main title using the hero component',
    });
  }

  if (h1Matches.length > 1) {
    warnings.push({
      type: 'heading',
      severity: 'warning',
      message: 'Multiple H1 headings detected',
      suggestion: 'Use only one H1 per page for better SEO',
    });
  }

  // Extract heading hierarchy
  const headingPattern = /<h([1-6])[^>]*>/gi;
  const hierarchy: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = headingPattern.exec(styledHtml)) !== null) {
    hierarchy.push(`h${match[1]}`);
  }

  // Check for heading level skips
  const headingIssues: string[] = [];
  for (let i = 1; i < hierarchy.length; i++) {
    const current = parseInt(hierarchy[i].replace('h', ''), 10);
    const previous = parseInt(hierarchy[i - 1].replace('h', ''), 10);
    if (current > previous + 1) {
      headingIssues.push(`Skipped from ${hierarchy[i - 1]} to ${hierarchy[i]}`);
    }
  }

  if (headingIssues.length > 0) {
    warnings.push({
      type: 'heading',
      severity: 'warning',
      message: 'Heading hierarchy issues',
      suggestion: headingIssues.join('; '),
    });
  }

  // Check schema preservation
  const hasSchema = styledHtml.includes('itemtype="https://schema.org') ||
                    styledHtml.includes('application/ld+json');
  const originalHadSchema = originalContent.includes('itemtype="https://schema.org') ||
                            originalContent.includes('application/ld+json');

  if (originalHadSchema && !hasSchema) {
    warnings.push({
      type: 'schema',
      severity: 'error',
      message: 'Schema markup was removed during styling',
      suggestion: 'Schema markup should be preserved for rich results',
    });
  }

  // Check for images without alt text
  const imagesWithoutAlt = styledHtml.match(/<img(?![^>]*alt=)[^>]*>/gi) || [];
  if (imagesWithoutAlt.length > 0) {
    warnings.push({
      type: 'accessibility',
      severity: 'warning',
      message: `${imagesWithoutAlt.length} image(s) missing alt text`,
      suggestion: 'Add descriptive alt text to all images',
    });
  }

  return {
    isValid: warnings.filter(w => w.severity === 'error').length === 0,
    warnings,
    headingStructure: {
      hasH1,
      hierarchy,
      issues: headingIssues,
    },
    schemaPreserved: !originalHadSchema || hasSchema,
    metaPreserved: true, // Meta is typically not in content body
  };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calculate estimated read time
 */
export function calculateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Generate standalone HTML document
 */
export function generateStandaloneHtml(
  output: StyledContentOutput,
  title: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
${output.css}
  </style>
</head>
<body>
${output.html}
<script>
// Reading progress bar
const progressBar = document.querySelector('.ctc-progress-fill');
if (progressBar) {
  window.addEventListener('scroll', () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPos = window.scrollY;
    const progress = (scrollPos / docHeight) * 100;
    progressBar.style.width = progress + '%';
  });
}

// FAQ accordion
document.querySelectorAll('.ctc-faq--accordion .ctc-faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', !expanded);
  });
});

// ToC toggle
const tocToggle = document.querySelector('.ctc-toc-toggle');
if (tocToggle) {
  tocToggle.addEventListener('click', () => {
    const list = document.querySelector('.ctc-toc-list');
    list.classList.toggle('ctc-toc-list--collapsed');
    tocToggle.setAttribute('aria-expanded', !list.classList.contains('ctc-toc-list--collapsed'));
  });
}
</script>
</body>
</html>`;
}
