/**
 * Semantic HTML Builder
 *
 * Generates SEO-preserving semantic HTML with proper structure:
 * - Semantic landmarks (header, main, article, aside, footer)
 * - Schema.org microdata integration
 * - ARIA attributes for accessibility
 * - Proper heading hierarchy
 *
 * @module services/publishing/htmlBuilder
 */

import {
  heroClasses,
  cardClasses,
  buttonClasses,
  timelineClasses,
  testimonialClasses,
  faqClasses,
  ctaSectionClasses,
  keyTakeawaysClasses,
  benefitsGridClasses,
  authorBoxClasses,
  tocClasses,
} from './components/classGenerator';
import type { SemanticContentData, AuthorshipData, TopicalContext, ExtractedEntity } from './semanticExtractor';
import type { DesignPersonality } from '../../config/designTokens/personalities';

// ============================================================================
// TYPES
// ============================================================================

export interface ArticleSection {
  id: string;
  level: number;
  heading: string;
  content: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface TimelineStep {
  title: string;
  description: string;
  icon?: string;
}

export interface TestimonialItem {
  quote: string;
  authorName: string;
  authorTitle?: string;
  avatarUrl?: string;
  rating?: number;
}

export interface BenefitItem {
  title: string;
  description: string;
  icon?: string;
}

export interface CtaConfig {
  title: string;
  text?: string;
  primaryButton: { text: string; url: string };
  secondaryButton?: { text: string; url: string };
}

export interface HeadingItem {
  level: number;
  text: string;
  id: string;
}

// ============================================================================
// SEMANTIC HTML BUILDER CLASS
// ============================================================================

export class SemanticHtmlBuilder {
  private parts: string[] = [];
  private jsonLdData: object[] = [];
  private personality?: DesignPersonality;

  constructor(personality?: DesignPersonality) {
    this.personality = personality;
  }

  /**
   * Reset builder state
   */
  reset(): void {
    this.parts = [];
    this.jsonLdData = [];
  }

  /**
   * Get all parts as joined HTML
   */
  getHtml(): string {
    return this.parts.join('\n');
  }

  /**
   * Get collected JSON-LD scripts
   */
  getJsonLdScripts(): string {
    return this.jsonLdData.map(data =>
      `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n</script>`
    ).join('\n');
  }

  // ==========================================================================
  // HERO SECTION
  // ==========================================================================

  buildHero(options: {
    title: string;
    subtitle?: string;
    pretitle?: string;
    primaryCta?: { text: string; url: string };
    secondaryCta?: { text: string; url: string };
    layout?: 'centered' | 'split' | 'minimal' | 'asymmetric' | 'full-bleed';
    background?: 'gradient' | 'solid' | 'image' | 'image-overlay';
    imageUrl?: string;
  }): string {
    const {
      title,
      subtitle,
      pretitle,
      primaryCta,
      secondaryCta,
      layout = 'centered',
      background = 'gradient',
      imageUrl,
    } = options;

    const classes = heroClasses(layout, background);
    const isGradient = background === 'gradient' || background === 'image-overlay';

    const html = `
<header class="${classes}" role="banner">
  ${background === 'gradient' ? `
  <div class="ctc-hero-bg-effects" aria-hidden="true">
    <div class="ctc-hero-orb ctc-hero-orb--1"></div>
    <div class="ctc-hero-orb ctc-hero-orb--2"></div>
  </div>
  ` : ''}
  ${imageUrl && (background === 'image' || background === 'image-overlay') ? `
  <div class="ctc-hero-image-bg" style="background-image: url('${this.escape(imageUrl)}')" aria-hidden="true"></div>
  ` : ''}
  <div class="ctc-hero-content relative z-10 max-w-4xl mx-auto px-4">
    ${pretitle ? `<span class="ctc-hero-pretitle text-sm font-medium tracking-wider uppercase opacity-80 mb-2 block">${this.escape(pretitle)}</span>` : ''}
    <h1 class="ctc-hero-title text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4" style="font-weight: var(--ctc-heading-weight); letter-spacing: var(--ctc-heading-letter-spacing)">
      ${this.escape(title)}
    </h1>
    ${subtitle ? `
    <p class="ctc-hero-subtitle text-lg md:text-xl opacity-90 mb-8 max-w-2xl ${layout === 'centered' ? 'mx-auto' : ''}">
      ${this.escape(subtitle)}
    </p>
    ` : ''}
    ${(primaryCta || secondaryCta) ? `
    <div class="ctc-hero-actions flex gap-4 ${layout === 'centered' ? 'justify-center' : ''} flex-wrap">
      ${primaryCta ? `
      <a href="${this.escape(primaryCta.url)}" class="${buttonClasses(isGradient ? 'white' : 'primary', 'lg')}">
        ${this.escape(primaryCta.text)}
      </a>
      ` : ''}
      ${secondaryCta ? `
      <a href="${this.escape(secondaryCta.url)}" class="${buttonClasses(isGradient ? 'outline' : 'secondary', 'lg')}" style="${isGradient ? 'color: white; border-color: white;' : ''}">
        ${this.escape(secondaryCta.text)}
      </a>
      ` : ''}
    </div>
    ` : ''}
  </div>
</header>`;

    this.parts.push(html);
    return html;
  }

  // ==========================================================================
  // ARTICLE STRUCTURE
  // ==========================================================================

  buildArticle(options: {
    headline: string;
    datePublished?: string;
    dateModified?: string;
    author?: { name: string; url?: string };
    sections: ArticleSection[];
    readTime?: number;
    skipHeadline?: boolean; // Skip h1 if hero already has one
  }): string {
    const { headline, datePublished, dateModified, author, sections, readTime, skipHeadline = false } = options;

    // When skipHeadline is true, we don't render the h1 (it's already in the hero)
    // but we keep the meta info visible and include headline in schema
    const html = `
<article class="ctc-article" itemscope itemtype="https://schema.org/Article">
  ${!skipHeadline ? `
  <header class="ctc-article-header mb-8">
    <h1 class="ctc-article-title text-3xl md:text-4xl font-bold mb-4" itemprop="headline" style="font-weight: var(--ctc-heading-weight); letter-spacing: var(--ctc-heading-letter-spacing)">
      ${this.escape(headline)}
    </h1>` : `
  <header class="ctc-article-header mb-8">
    <meta itemprop="headline" content="${this.escape(headline)}">`}
    <div class="ctc-article-meta flex flex-wrap gap-4 text-sm text-[var(--ctc-text-muted)]">
      ${datePublished ? `
      <time itemprop="datePublished" datetime="${datePublished}" class="flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        ${this.formatDate(datePublished)}
      </time>
      ` : ''}
      ${dateModified ? `<meta itemprop="dateModified" content="${dateModified}">` : ''}
      ${readTime ? `
      <span class="flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        ${readTime} min leestijd
      </span>
      ` : ''}
      ${author ? `
      <span itemprop="author" itemscope itemtype="https://schema.org/Person" class="flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        <span itemprop="name">${this.escape(author.name)}</span>
        ${author.url ? `<meta itemprop="url" content="${author.url}">` : ''}
      </span>
      ` : ''}
    </div>
  </header>

  <div class="ctc-article-content prose prose-lg max-w-none" itemprop="articleBody">
    ${sections.map(section => this.buildSection(section)).join('\n')}
  </div>
</article>`;

    // Collect JSON-LD
    this.jsonLdData.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline,
      datePublished,
      dateModified,
      author: author ? {
        '@type': 'Person',
        name: author.name,
        url: author.url,
      } : undefined,
    });

    this.parts.push(html);
    return html;
  }

  /**
   * Build individual section with proper heading
   * Converts markdown content to HTML
   * Level 0 means intro content without a heading
   */
  buildSection(section: ArticleSection): string {
    // Convert markdown content to HTML
    const htmlContent = this.markdownToHtml(section.content);

    // Level 0 is intro content - no heading needed
    if (section.level === 0 || !section.heading) {
      return `
<div class="ctc-intro-section mb-8">
  <div class="ctc-section-content prose prose-lg max-w-none">
    ${htmlContent}
  </div>
</div>`;
    }

    const headingTag = `h${Math.min(section.level, 6)}`;

    return `
<section class="ctc-section mb-8" aria-labelledby="${section.id}">
  <${headingTag} id="${section.id}" class="ctc-section-title text-2xl font-semibold mb-4" style="font-weight: var(--ctc-heading-weight)">
    ${this.escape(section.heading)}
  </${headingTag}>
  <div class="ctc-section-content prose prose-lg max-w-none">
    ${htmlContent}
  </div>
</section>`;
  }

  // ==========================================================================
  // KEY TAKEAWAYS
  // ==========================================================================

  buildKeyTakeaways(options: {
    title?: string;
    items: string[];
    style?: 'box' | 'cards' | 'numbered' | 'icons';
  }): string {
    const { title = 'Belangrijkste Punten', items, style = 'cards' } = options;

    const classes = keyTakeawaysClasses(style);
    const isCards = style === 'cards';

    const html = `
<aside class="${classes}" aria-label="${title}">
  <h2 class="ctc-takeaways-title text-xl font-semibold mb-4 ${isCards ? 'text-white' : 'text-[var(--ctc-primary)]'} flex items-center gap-2">
    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
    ${this.escape(title)}
  </h2>
  <div class="ctc-takeaways-grid ${isCards ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}">
    ${items.map((item, index) => `
    <div class="ctc-takeaway-item flex items-start gap-3 ${isCards ? 'bg-white/15 backdrop-blur-sm p-4 rounded-lg' : 'mb-3'}">
      <span class="ctc-takeaway-icon flex-shrink-0 w-6 h-6 rounded-full ${isCards ? 'bg-white text-[var(--ctc-primary)]' : 'bg-[var(--ctc-primary)] text-white'} flex items-center justify-center text-sm font-bold">
        ${style === 'numbered' ? index + 1 : '✓'}
      </span>
      <span class="ctc-takeaway-text ${isCards ? 'text-white/90' : ''}">${this.escape(item)}</span>
    </div>
    `).join('')}
  </div>
</aside>`;

    this.parts.push(html);
    return html;
  }

  // ==========================================================================
  // BENEFITS GRID
  // ==========================================================================

  buildBenefitsGrid(options: {
    title?: string;
    items: BenefitItem[];
    columns?: 2 | 3 | 4;
    style?: 'icons' | 'cards' | 'minimal';
  }): string {
    const { title = 'Voordelen', items, columns = 3, style = 'icons' } = options;

    const classes = benefitsGridClasses(String(columns) as '2' | '3' | '4', style);

    const html = `
<section class="ctc-benefits py-12">
  <h2 class="ctc-benefits-title text-3xl font-bold text-center mb-10" style="font-weight: var(--ctc-heading-weight)">
    ${this.escape(title)}
  </h2>
  <div class="${classes}">
    ${items.map(item => `
    <div class="${cardClasses('floating', 'normal')} text-center hover:scale-105 transition-transform">
      ${item.icon ? `
      <div class="ctc-benefit-icon w-12 h-12 rounded-full bg-[var(--ctc-primary)] text-white flex items-center justify-center mx-auto mb-4 text-xl">
        ${item.icon}
      </div>
      ` : ''}
      <h3 class="ctc-benefit-title text-lg font-semibold mb-2">${this.escape(item.title)}</h3>
      <p class="ctc-benefit-text text-[var(--ctc-text-secondary)]">${this.escape(item.description)}</p>
    </div>
    `).join('')}
  </div>
</section>`;

    this.parts.push(html);
    return html;
  }

  // ==========================================================================
  // TIMELINE / PROCESS STEPS
  // ==========================================================================

  buildTimeline(steps: TimelineStep[], options?: {
    title?: string;
    orientation?: 'vertical' | 'horizontal' | 'zigzag';
    style?: 'numbered' | 'icons' | 'dots';
  }): string {
    const { title = 'Hoe Wij Werken', orientation = 'zigzag', style = 'numbered' } = options || {};

    const classes = timelineClasses(orientation, style);

    const html = `
<section class="${classes} py-12" itemscope itemtype="https://schema.org/HowTo">
  <h2 class="ctc-timeline-title text-3xl font-bold text-center mb-12" itemprop="name" style="font-weight: var(--ctc-heading-weight)">
    ${this.escape(title)}
  </h2>
  ${orientation === 'zigzag' ? `
  <div class="ctc-timeline-line relative before:absolute before:left-1/2 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-[var(--ctc-primary)] before:to-[var(--ctc-primary-light)] before:-translate-x-1/2">
  ` : '<div class="ctc-timeline-steps">'}
    ${steps.map((step, index) => {
      const isLeft = index % 2 === 0;
      return orientation === 'zigzag' ? `
    <div class="ctc-timeline-step relative flex mb-12 ${isLeft ? '' : 'flex-row-reverse'}" itemscope itemprop="step" itemtype="https://schema.org/HowToStep">
      <meta itemprop="position" content="${index + 1}">
      <div class="ctc-timeline-card flex-1 ${isLeft ? 'pr-12 text-right' : 'pl-12 text-left'}">
        <div class="${cardClasses('raised', 'normal')} inline-block max-w-md">
          <h3 class="ctc-timeline-step-title text-xl font-semibold mb-2" itemprop="name">${this.escape(step.title)}</h3>
          <p class="ctc-timeline-step-text text-[var(--ctc-text-secondary)]" itemprop="text">${this.escape(step.description)}</p>
        </div>
      </div>
      <div class="ctc-timeline-node absolute left-1/2 -translate-x-1/2 z-10">
        <span class="w-12 h-12 rounded-full bg-[var(--ctc-primary)] text-white flex items-center justify-center text-lg font-bold shadow-lg">
          ${style === 'numbered' ? index + 1 : (step.icon || '•')}
        </span>
      </div>
      <div class="flex-1"></div>
    </div>
      ` : `
    <div class="ctc-timeline-step ${cardClasses('raised', 'normal')}" itemscope itemprop="step" itemtype="https://schema.org/HowToStep">
      <meta itemprop="position" content="${index + 1}">
      <span class="ctc-step-number w-8 h-8 rounded-full bg-[var(--ctc-primary)] text-white flex items-center justify-center text-sm font-bold mb-3">
        ${index + 1}
      </span>
      <h3 class="ctc-timeline-step-title font-semibold mb-1" itemprop="name">${this.escape(step.title)}</h3>
      <p class="ctc-timeline-step-text text-sm text-[var(--ctc-text-secondary)]" itemprop="text">${this.escape(step.description)}</p>
    </div>
      `;
    }).join('')}
  </div>
</section>`;

    // Collect JSON-LD
    this.jsonLdData.push({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: title,
      step: steps.map((step, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        name: step.title,
        text: step.description,
      })),
    });

    this.parts.push(html);
    return html;
  }

  // ==========================================================================
  // TESTIMONIALS
  // ==========================================================================

  buildTestimonials(options: {
    title?: string;
    items: TestimonialItem[];
    layout?: 'card' | 'minimal' | 'featured';
  }): string {
    const { title = 'Wat Klanten Zeggen', items, layout = 'card' } = options;

    const html = `
<section class="ctc-testimonials py-12 bg-[var(--ctc-gradient-subtle)] rounded-[var(--ctc-radius-2xl)]">
  <h2 class="ctc-testimonials-title text-3xl font-bold text-center mb-10" style="font-weight: var(--ctc-heading-weight)">
    ${this.escape(title)}
  </h2>
  <div class="ctc-testimonials-grid grid md:grid-cols-${Math.min(items.length, 3)} gap-6 px-6">
    ${items.map(item => `
    <blockquote class="${testimonialClasses(layout)}" itemscope itemtype="https://schema.org/Review">
      <span class="ctc-quote-mark absolute top-4 left-6 text-6xl leading-none text-[var(--ctc-primary)] opacity-15 font-serif" aria-hidden="true">"</span>
      ${item.rating ? `
      <div class="ctc-rating mb-3" itemprop="reviewRating" itemscope itemtype="https://schema.org/Rating">
        <meta itemprop="ratingValue" content="${item.rating}">
        ${Array.from({ length: 5 }, (_, i) => `
          <span class="${i < item.rating! ? 'text-yellow-400' : 'text-gray-300'}">★</span>
        `).join('')}
      </div>
      ` : ''}
      <p class="ctc-testimonial-text text-lg mb-4 relative z-10" itemprop="reviewBody">
        ${this.escape(item.quote)}
      </p>
      <footer class="ctc-testimonial-author" itemprop="author" itemscope itemtype="https://schema.org/Person">
        <cite class="ctc-author-name font-semibold not-italic" itemprop="name">${this.escape(item.authorName)}</cite>
        ${item.authorTitle ? `<span class="ctc-author-title block text-sm text-[var(--ctc-text-muted)]">${this.escape(item.authorTitle)}</span>` : ''}
      </footer>
    </blockquote>
    `).join('')}
  </div>
</section>`;

    this.parts.push(html);
    return html;
  }

  // ==========================================================================
  // CTA BANNER
  // ==========================================================================

  buildCtaBanner(options: CtaConfig & {
    variant?: 'gradient' | 'solid' | 'outlined' | 'bold-contrast' | 'gradient-glow' | 'warm-gradient';
  }): string {
    const { title, text, primaryButton, secondaryButton, variant = 'gradient' } = options;

    const classes = ctaSectionClasses(variant);
    const isLight = variant === 'outlined';

    const html = `
<aside class="${classes} my-12">
  <h2 class="ctc-cta-title text-2xl md:text-3xl font-bold mb-4" style="font-weight: var(--ctc-heading-weight)">
    ${this.escape(title)}
  </h2>
  ${text ? `
  <p class="ctc-cta-text text-lg opacity-90 mb-8 max-w-xl mx-auto">
    ${this.escape(text)}
  </p>
  ` : ''}
  <div class="ctc-cta-actions flex gap-4 justify-center flex-wrap">
    <a href="${this.escape(primaryButton.url)}" class="${buttonClasses(isLight ? 'primary' : 'white', 'lg')}">
      ${this.escape(primaryButton.text)}
    </a>
    ${secondaryButton ? `
    <a href="${this.escape(secondaryButton.url)}" class="${buttonClasses(isLight ? 'secondary' : 'outline', 'lg')}" ${!isLight ? 'style="color: white; border-color: white;"' : ''}>
      ${this.escape(secondaryButton.text)}
    </a>
    ` : ''}
  </div>
</aside>`;

    this.parts.push(html);
    return html;
  }

  // ==========================================================================
  // FAQ SECTION
  // ==========================================================================

  buildFaq(items: FaqItem[], options?: {
    title?: string;
    style?: 'accordion' | 'cards' | 'simple';
  }): string {
    const { title = 'Veelgestelde Vragen', style = 'accordion' } = options || {};

    const classes = faqClasses(style);

    const html = `
<section class="${classes} my-12" itemscope itemtype="https://schema.org/FAQPage">
  <h2 class="ctc-faq-title text-3xl font-bold text-center mb-8" style="font-weight: var(--ctc-heading-weight)">
    ${this.escape(title)}
  </h2>
  <div class="ctc-faq-list max-w-3xl mx-auto" role="list">
    ${items.map((item, index) => style === 'accordion' ? `
    <div class="ctc-faq-item border-b border-[var(--ctc-border)]" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question" role="listitem">
      <h3 class="ctc-faq-question">
        <button type="button" aria-expanded="false" aria-controls="faq-answer-${index}" class="ctc-faq-trigger w-full flex justify-between items-center py-5 text-left text-lg font-semibold text-[var(--ctc-text)] hover:text-[var(--ctc-primary)] transition-colors">
          <span itemprop="name">${this.escape(item.question)}</span>
          <span class="ctc-faq-icon text-2xl text-[var(--ctc-primary)] transition-transform" aria-hidden="true">+</span>
        </button>
      </h3>
      <div id="faq-answer-${index}" class="ctc-faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer" hidden>
        <div class="pb-5 text-[var(--ctc-text-secondary)]" itemprop="text">${this.escape(item.answer)}</div>
      </div>
    </div>
    ` : `
    <div class="${cardClasses('raised', 'normal')} mb-4" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question" role="listitem">
      <h3 class="ctc-faq-question font-semibold mb-2" itemprop="name">${this.escape(item.question)}</h3>
      <div class="ctc-faq-answer text-[var(--ctc-text-secondary)]" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <p itemprop="text">${this.escape(item.answer)}</p>
      </div>
    </div>
    `).join('')}
  </div>
</section>`;

    // Collect JSON-LD
    this.jsonLdData.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    });

    this.parts.push(html);
    return html;
  }

  // ==========================================================================
  // TABLE OF CONTENTS
  // ==========================================================================

  buildTableOfContents(headings: HeadingItem[], options?: {
    title?: string;
    position?: 'sidebar' | 'inline' | 'floating';
    collapsible?: boolean;
  }): string {
    const { title = 'Inhoudsopgave', position = 'sidebar', collapsible = true } = options || {};

    const classes = tocClasses(position);

    const html = `
<nav class="${classes}" aria-label="${title}">
  <h2 class="ctc-toc-title text-lg font-semibold mb-4 flex items-center justify-between">
    ${this.escape(title)}
    ${collapsible ? `
    <button class="ctc-toc-toggle p-1 hover:bg-[var(--ctc-border)] rounded" aria-expanded="true" aria-label="Toggle inhoudsopgave">
      <svg class="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
    </button>
    ` : ''}
  </h2>
  <ol class="ctc-toc-list space-y-2">
    ${headings.map(heading => `
    <li class="ctc-toc-item ctc-toc-item--level-${heading.level}" style="margin-left: ${(heading.level - 2) * 1}rem">
      <a href="#${heading.id}" class="ctc-toc-link text-[var(--ctc-text-secondary)] hover:text-[var(--ctc-primary)] transition-colors text-sm block py-1">
        ${this.escape(heading.text)}
      </a>
    </li>
    `).join('')}
  </ol>
</nav>`;

    this.parts.push(html);
    return html;
  }

  // ==========================================================================
  // AUTHOR BOX
  // ==========================================================================

  buildAuthorBox(authorship: AuthorshipData, options?: {
    layout?: 'horizontal' | 'vertical' | 'compact';
  }): string {
    const { layout = 'horizontal' } = options || {};

    const classes = authorBoxClasses(layout);

    const html = `
<aside class="${classes} my-8" itemscope itemtype="https://schema.org/Person">
  ${authorship.imageUrl ? `
  <img src="${this.escape(authorship.imageUrl)}" alt="${this.escape(authorship.name)}" class="ctc-author-avatar w-16 h-16 rounded-full object-cover" itemprop="image">
  ` : `
  <div class="ctc-author-avatar w-16 h-16 rounded-full bg-[var(--ctc-primary)] text-white flex items-center justify-center text-xl font-bold">
    ${authorship.name.charAt(0).toUpperCase()}
  </div>
  `}
  <div class="ctc-author-info ${layout === 'vertical' ? 'mt-4' : ''}">
    <span class="ctc-author-label text-xs text-[var(--ctc-text-muted)] uppercase tracking-wider">Geschreven door</span>
    <strong class="ctc-author-name block text-lg" itemprop="name">${this.escape(authorship.name)}</strong>
    ${authorship.title ? `<span class="ctc-author-title text-sm text-[var(--ctc-text-secondary)]" itemprop="jobTitle">${this.escape(authorship.title)}</span>` : ''}
    ${authorship.bio ? `<p class="ctc-author-bio text-sm text-[var(--ctc-text-muted)] mt-2" itemprop="description">${this.escape(authorship.bio)}</p>` : ''}
    ${authorship.knowsAbout && authorship.knowsAbout.length > 0 ? `
    <meta itemprop="knowsAbout" content="${authorship.knowsAbout.join(', ')}">
    ` : ''}
  </div>
</aside>`;

    this.parts.push(html);
    return html;
  }

  // ==========================================================================
  // SOURCES SECTION
  // ==========================================================================

  buildSourcesSection(sources: Array<{ title: string; url: string; type?: string }>, options?: {
    title?: string;
    methodology?: string;
    lastVerified?: string;
  }): string {
    const { title = 'Bronnen & Methodologie', methodology, lastVerified } = options || {};

    const html = `
<section class="ctc-sources my-8 p-6 bg-[var(--ctc-surface)] rounded-[var(--ctc-radius-lg)] border border-[var(--ctc-border)]">
  <h2 class="ctc-sources-title text-xl font-semibold mb-4">${this.escape(title)}</h2>
  ${methodology ? `<p class="ctc-methodology text-sm text-[var(--ctc-text-secondary)] mb-4">${this.escape(methodology)}</p>` : ''}
  <ul class="ctc-sources-list space-y-2">
    ${sources.map(source => `
    <li class="ctc-source-item flex items-start gap-2">
      <span class="ctc-source-bullet text-[var(--ctc-primary)]">•</span>
      <a href="${this.escape(source.url)}" class="ctc-source-link text-[var(--ctc-primary)] hover:underline" target="_blank" rel="noopener">
        ${this.escape(source.title)}
      </a>
      ${source.type ? `<span class="ctc-source-type text-xs text-[var(--ctc-text-muted)] px-2 py-0.5 bg-[var(--ctc-border)] rounded">${this.escape(source.type)}</span>` : ''}
    </li>
    `).join('')}
  </ul>
  ${lastVerified ? `
  <p class="ctc-last-verified text-xs text-[var(--ctc-text-muted)] mt-4">
    <strong>Laatst gecontroleerd:</strong> <time datetime="${lastVerified}">${this.formatDate(lastVerified)}</time>
  </p>
  ` : ''}
</section>`;

    this.parts.push(html);
    return html;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Convert markdown to HTML
   * Handles: headings, bold, italic, links, images, lists, blockquotes, code
   */
  private markdownToHtml(markdown: string): string {
    let html = markdown;

    // Headings (process from h6 to h1 to avoid partial matches)
    html = html.replace(/^######\s+(.+)$/gm, '<h6 class="ctc-h6">$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5 class="ctc-h5">$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4 class="ctc-h4">$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3 class="ctc-h3 text-xl font-semibold mt-6 mb-3">$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2 class="ctc-h2 text-2xl font-semibold mt-8 mb-4">$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1 class="ctc-h1 text-3xl font-bold mt-8 mb-4">$1</h1>');

    // Bold and italic (order matters - process triple first)
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Links (before images to avoid conflicts)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="ctc-link text-[var(--ctc-primary)] hover:underline">$1</a>');

    // Images (standard markdown)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure class="ctc-figure my-6"><img src="$2" alt="$1" class="ctc-image rounded-lg max-w-full" loading="lazy"><figcaption class="ctc-figcaption text-sm text-[var(--ctc-text-muted)] mt-2 text-center">$1</figcaption></figure>');

    // Custom image placeholders: [IMAGE: description | alt="alt text"]
    // Render as styled placeholders (htmlBuilder doesn't have imageUrlMap)
    html = html.replace(/\[IMAGE:\s*(.+?)\s*\|\s*alt="([^"]*)"\s*\]/g, (_, description, altText) => {
      const cleanDescription = description.trim();
      const alt = altText?.trim() || cleanDescription;
      return `<figure class="ctc-image-placeholder my-6" style="padding: 2rem; background: linear-gradient(135deg, var(--ctc-surface) 0%, color-mix(in srgb, var(--ctc-primary) 3%, var(--ctc-surface)) 100%); border: 2px dashed var(--ctc-border); border-radius: var(--ctc-radius-lg); text-align: center">
        <div style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5">🖼️</div>
        <p style="color: var(--ctc-text-secondary); font-size: 0.875rem; margin: 0">${this.escape(cleanDescription)}</p>
        <p style="color: var(--ctc-text-muted); font-size: 0.75rem; margin-top: 0.25rem; font-style: italic">Alt: ${this.escape(alt)}</p>
      </figure>`;
    });

    // Also handle simpler format: [IMAGE: description]
    html = html.replace(/\[IMAGE:\s*([^\]]+)\]/g, (match, description) => {
      const cleanDescription = description.trim();
      // Skip if already processed (has alt attribute pattern inside)
      if (cleanDescription.includes('| alt=')) return match;
      return `<figure class="ctc-image-placeholder my-6" style="padding: 2rem; background: linear-gradient(135deg, var(--ctc-surface) 0%, color-mix(in srgb, var(--ctc-primary) 3%, var(--ctc-surface)) 100%); border: 2px dashed var(--ctc-border); border-radius: var(--ctc-radius-lg); text-align: center">
        <div style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5">🖼️</div>
        <p style="color: var(--ctc-text-secondary); font-size: 0.875rem; margin: 0">${this.escape(cleanDescription)}</p>
      </figure>`;
    });

    // Code blocks (before inline code)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="ctc-pre bg-[var(--ctc-surface)] p-4 rounded-lg overflow-x-auto my-4"><code class="ctc-code language-$1">$2</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code class="ctc-inline-code bg-[var(--ctc-surface)] px-1.5 py-0.5 rounded text-sm">$1</code>');

    // Blockquotes
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote class="ctc-blockquote border-l-4 border-[var(--ctc-primary)] pl-4 italic text-[var(--ctc-text-secondary)] my-4">$1</blockquote>');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr class="ctc-divider border-t border-[var(--ctc-border)] my-8">');
    html = html.replace(/^\*\*\*$/gm, '<hr class="ctc-divider border-t border-[var(--ctc-border)] my-8">');

    // Process lists - mark with data attribute to preserve type info
    // Unordered lists (- or *)
    html = html.replace(/^(\s*)[-*]\s+(.+)$/gm, '$1<li class="ctc-li mb-2" data-list-type="ul">$2</li>');

    // Ordered lists (1. 2. etc)
    html = html.replace(/^(\s*)\d+\.\s+(.+)$/gm, '$1<li class="ctc-li mb-2" data-list-type="ol">$2</li>');

    // Wrap consecutive list items in ul/ol based on their type
    // Process groups of list items that share the same type
    html = html.replace(/((?:<li[^>]*data-list-type="(ul|ol)"[^>]*>.*?<\/li>\s*)+)/g, (match, _fullMatch, firstType) => {
      // Determine list type from the first item's marker
      const isOrdered = match.includes('data-list-type="ol"');
      const tag = isOrdered ? 'ol' : 'ul';
      const listClass = isOrdered ? 'ctc-list list-decimal pl-6 my-4 space-y-2' : 'ctc-list list-disc pl-6 my-4 space-y-2';
      // Clean up the data attributes from the final HTML
      const cleanedMatch = match.replace(/\s*data-list-type="(?:ul|ol)"/g, '');
      return `<${tag} class="${listClass}">${cleanedMatch}</${tag}>`;
    });

    // Paragraphs - wrap remaining text lines that aren't already in HTML tags
    const lines = html.split('\n');
    const processedLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      // Skip if already wrapped in a tag
      if (trimmed.startsWith('<')) return line;
      // Skip if it's just whitespace inside a list
      if (trimmed.match(/^\s*$/)) return line;
      return `<p class="ctc-p mb-4 leading-relaxed">${line}</p>`;
    });
    html = processedLines.join('\n');

    // Clean up empty paragraphs and fix nested issues
    html = html.replace(/<p class="ctc-p[^"]*">\s*<\/p>/g, '');
    html = html.replace(/\n\n+/g, '\n');

    return html;
  }

  /**
   * Escape HTML special characters
   */
  private escape(str: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return str.replace(/[&<>"']/g, char => escapeMap[char]);
  }

  /**
   * Format date for display
   */
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Generate slug from text
   */
  slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new HTML builder instance
 */
export function createHtmlBuilder(personality?: DesignPersonality): SemanticHtmlBuilder {
  return new SemanticHtmlBuilder(personality);
}
