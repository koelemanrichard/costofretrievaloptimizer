/**
 * Component Library for Blueprint Renderer
 *
 * Defines rendering functions for each component type.
 * All components preserve SEO content while applying visual presentation.
 *
 * @module services/publishing/renderer/componentLibrary
 */

import type { ComponentType, SectionEmphasis, SectionSpacing } from '../architect/blueprintTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface RenderContext {
  /** Unique section ID */
  sectionId: string;
  /** Original content to render */
  content: string;
  /** Optional heading */
  heading?: string;
  /** Heading level (2-6) */
  headingLevel: number;
  /** Visual emphasis level */
  emphasis: SectionEmphasis;
  /** Spacing around section */
  spacing: SectionSpacing;
  /** Whether section has background */
  hasBackground: boolean;
  /** Whether section has divider */
  hasDivider: boolean;
  /** Component variant */
  variant: string;
  /** Style hints from blueprint */
  styleHints?: {
    icon?: string;
    accentColor?: string;
    columns?: 2 | 3 | 4;
    animateOnScroll?: boolean;
  };
}

export interface RenderedComponent {
  html: string;
  jsonLd?: object;
}

export type ComponentRenderer = (ctx: RenderContext) => RenderedComponent;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate CSS classes for emphasis level
 */
function emphasisClasses(emphasis: SectionEmphasis): string {
  switch (emphasis) {
    case 'background':
      return 'ctc-section--bg opacity-90';
    case 'featured':
      return 'ctc-section--featured bg-[var(--ctc-gradient-subtle)] shadow-lg';
    case 'hero-moment':
      return 'ctc-section--hero bg-gradient-to-br from-[var(--ctc-primary)] to-[var(--ctc-primary-light)] text-white';
    default:
      return '';
  }
}

/**
 * Generate CSS classes for spacing
 */
function spacingClasses(spacing: SectionSpacing): string {
  switch (spacing) {
    case 'tight':
      return 'py-4 md:py-6';
    case 'breathe':
      return 'py-12 md:py-16';
    default:
      return 'py-8 md:py-10';
  }
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

/**
 * Generate slug from text
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .substring(0, 50);
}

/**
 * Convert markdown content to HTML (basic conversion)
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headings (h3-h6 only, h1/h2 handled by section structure)
  html = html.replace(/^######\s+(.+)$/gm, '<h6 class="ctc-h6 text-sm font-semibold mt-4 mb-2">$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5 class="ctc-h5 text-base font-semibold mt-4 mb-2">$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4 class="ctc-h4 text-lg font-semibold mt-5 mb-3">$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="ctc-h3 text-xl font-semibold mt-6 mb-3">$1</h3>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="ctc-link text-[var(--ctc-primary)] hover:underline">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure class="ctc-figure my-6"><img src="$2" alt="$1" class="ctc-image rounded-lg max-w-full" loading="lazy"></figure>');

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="ctc-pre bg-[var(--ctc-surface)] p-4 rounded-lg overflow-x-auto my-4"><code class="ctc-code language-$1">$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code class="ctc-inline-code bg-[var(--ctc-surface)] px-1.5 py-0.5 rounded text-sm">$1</code>');

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote class="ctc-blockquote border-l-4 border-[var(--ctc-primary)] pl-4 italic text-[var(--ctc-text-secondary)] my-4">$1</blockquote>');

  return html;
}

/**
 * Extract list items from content
 */
function extractListItems(content: string): string[] {
  const items: string[] = [];

  // Match bullet points (- or *)
  const bulletMatches = content.matchAll(/^[-*]\s+(.+)$/gm);
  for (const match of bulletMatches) {
    items.push(match[1].trim());
  }

  // Match numbered items
  if (items.length === 0) {
    const numberedMatches = content.matchAll(/^\d+\.\s+(.+)$/gm);
    for (const match of numberedMatches) {
      items.push(match[1].trim());
    }
  }

  return items;
}

/**
 * Extract FAQ items from content
 */
function extractFaqItems(content: string): Array<{ question: string; answer: string }> {
  const items: Array<{ question: string; answer: string }> = [];

  // Try Q/A pattern
  const qaPattern = /(?:Q[:\.]?\s*)?([^\n?]+\?)\s*\n+(?:A[:\.]?\s*)?([^\n]+(?:\n(?!Q[:\.]?\s*)[^\n]+)*)/gi;
  let match;
  while ((match = qaPattern.exec(content)) !== null) {
    items.push({
      question: match[1].trim(),
      answer: match[2].trim().replace(/\n+/g, ' '),
    });
  }

  // Try heading-based pattern
  if (items.length === 0) {
    const headingPattern = /#{3,4}\s*([^\n?]+\?)\s*\n+([^\n#]+)/g;
    while ((match = headingPattern.exec(content)) !== null) {
      items.push({
        question: match[1].trim(),
        answer: match[2].trim(),
      });
    }
  }

  return items;
}

/**
 * Extract process steps from content
 */
function extractSteps(content: string): Array<{ title: string; description: string }> {
  const steps: Array<{ title: string; description: string }> = [];

  // Try numbered steps with descriptions
  const stepPattern = /(?:stap|step)\s*(\d+)[:\.]?\s*\*?\*?([^*\n]+)\*?\*?\s*[-–:]?\s*([^\n]+)?/gi;
  let match;
  while ((match = stepPattern.exec(content)) !== null) {
    steps.push({
      title: match[2].trim(),
      description: match[3]?.trim() || '',
    });
  }

  // Fall back to numbered list
  if (steps.length === 0) {
    const numberedMatches = content.matchAll(/^\d+\.\s+(.+)$/gm);
    for (const m of numberedMatches) {
      const parts = m[1].split(/[:\-–]/).map(p => p.trim());
      steps.push({
        title: parts[0] || m[1],
        description: parts[1] || '',
      });
    }
  }

  return steps;
}

// ============================================================================
// COMPONENT RENDERERS
// ============================================================================

const componentRenderers: Partial<Record<ComponentType, ComponentRenderer>> = {
  // ---------------------------------------------------------------------------
  // CORE CONTENT
  // ---------------------------------------------------------------------------

  'prose': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content);
    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-prose ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)} ${ctx.hasBackground ? 'rounded-[var(--ctc-radius-lg)] px-6' : ''}">
  ${ctx.heading ? `<h${ctx.headingLevel} id="${slugify(ctx.heading)}" class="ctc-section-heading text-2xl font-semibold mb-4" style="font-weight: var(--ctc-heading-weight)">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="ctc-prose-content prose prose-lg max-w-none">
    ${htmlContent}
  </div>
  ${ctx.hasDivider ? '<hr class="ctc-divider border-t border-[var(--ctc-border)] mt-8">' : ''}
</div>`,
    };
  },

  'lead-paragraph': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content);
    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-lead-paragraph ${spacingClasses(ctx.spacing)}">
  <div class="ctc-lead-content text-lg md:text-xl leading-relaxed text-[var(--ctc-text-secondary)]">
    ${htmlContent}
  </div>
</div>`,
    };
  },

  'pull-quote': (ctx) => {
    // Extract the main quote from content
    const quoteMatch = ctx.content.match(/"([^"]+)"|>?\s*([^\n]+)/);
    const quote = quoteMatch ? (quoteMatch[1] || quoteMatch[2]) : ctx.content;

    return {
      html: `
<figure id="${ctx.sectionId}" class="ctc-pull-quote ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)} relative my-8">
  <span class="ctc-quote-mark absolute -top-4 -left-2 text-8xl text-[var(--ctc-primary)] opacity-20 font-serif" aria-hidden="true">"</span>
  <blockquote class="text-2xl md:text-3xl font-medium leading-snug text-center px-8 relative z-10">
    ${escapeHtml(quote)}
  </blockquote>
</figure>`,
    };
  },

  'highlight-box': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content);
    const variant = ctx.variant || 'info';
    const variantClasses: Record<string, string> = {
      'info': 'bg-blue-50 border-blue-200 text-blue-900',
      'warning': 'bg-amber-50 border-amber-200 text-amber-900',
      'success': 'bg-green-50 border-green-200 text-green-900',
      'tip': 'bg-purple-50 border-purple-200 text-purple-900',
    };

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-highlight-box ${variantClasses[variant] || variantClasses.info} border-l-4 rounded-r-lg p-6 my-8">
  ${ctx.heading ? `<h${ctx.headingLevel} class="font-semibold mb-2">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="prose prose-sm max-w-none">
    ${htmlContent}
  </div>
</aside>`,
    };
  },

  'callout': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content);
    const icon = ctx.styleHints?.icon || '💡';

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-callout ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)} flex gap-4 p-6 rounded-[var(--ctc-radius-lg)] bg-[var(--ctc-surface)] border border-[var(--ctc-border)]">
  <div class="ctc-callout-icon text-3xl flex-shrink-0" aria-hidden="true">${icon}</div>
  <div class="ctc-callout-content">
    ${ctx.heading ? `<h${ctx.headingLevel} class="font-semibold mb-2">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
    <div class="prose prose-sm max-w-none">${htmlContent}</div>
  </div>
</aside>`,
    };
  },

  // ---------------------------------------------------------------------------
  // LIST PRESENTATIONS
  // ---------------------------------------------------------------------------

  'bullet-list': (ctx) => {
    const items = extractListItems(ctx.content);
    const htmlContent = items.length > 0
      ? `<ul class="ctc-list list-disc pl-6 space-y-2">${items.map(item => `<li class="ctc-li">${escapeHtml(item)}</li>`).join('')}</ul>`
      : markdownToHtml(ctx.content);

    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-bullet-list ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)} ${ctx.hasBackground ? 'p-6 rounded-[var(--ctc-radius-lg)] bg-[var(--ctc-surface)]' : ''}">
  ${ctx.heading ? `<h${ctx.headingLevel} id="${slugify(ctx.heading || '')}" class="text-xl font-semibold mb-4">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  ${htmlContent}
</div>`,
    };
  },

  'numbered-list': (ctx) => {
    const items = extractListItems(ctx.content);
    const htmlContent = items.length > 0
      ? `<ol class="ctc-list list-decimal pl-6 space-y-2">${items.map(item => `<li class="ctc-li">${escapeHtml(item)}</li>`).join('')}</ol>`
      : markdownToHtml(ctx.content);

    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-numbered-list ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} id="${slugify(ctx.heading || '')}" class="text-xl font-semibold mb-4">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  ${htmlContent}
</div>`,
    };
  },

  'checklist': (ctx) => {
    const items = extractListItems(ctx.content);

    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-checklist ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-xl font-semibold mb-4">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <ul class="space-y-3">
    ${items.map(item => `
    <li class="ctc-checklist-item flex items-start gap-3">
      <span class="ctc-check w-5 h-5 rounded bg-[var(--ctc-primary)] text-white flex items-center justify-center flex-shrink-0 mt-0.5">✓</span>
      <span>${escapeHtml(item)}</span>
    </li>`).join('')}
  </ul>
</div>`,
    };
  },

  'icon-list': (ctx) => {
    const items = extractListItems(ctx.content);
    const icons = ['🔹', '🔸', '▸', '→', '•'];

    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-icon-list ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-xl font-semibold mb-6">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <ul class="space-y-4">
    ${items.map((item, i) => `
    <li class="ctc-icon-list-item flex items-start gap-4">
      <span class="ctc-icon w-8 h-8 rounded-full bg-[var(--ctc-primary)] text-white flex items-center justify-center flex-shrink-0">${icons[i % icons.length]}</span>
      <span class="pt-1">${escapeHtml(item)}</span>
    </li>`).join('')}
  </ul>
</div>`,
    };
  },

  'card-grid': (ctx) => {
    const items = extractListItems(ctx.content);
    const columns = ctx.styleHints?.columns || 3;

    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-card-grid ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-2xl font-semibold text-center mb-8">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="grid grid-cols-1 md:grid-cols-${columns} gap-6">
    ${items.map((item, i) => {
      const parts = item.split(/[:\-–]/).map(p => p.trim());
      const title = parts[0];
      const desc = parts[1] || '';
      return `
    <div class="ctc-card p-6 rounded-[var(--ctc-radius-lg)] bg-[var(--ctc-surface)] shadow-sm hover:shadow-md transition-shadow">
      <div class="ctc-card-icon w-10 h-10 rounded-full bg-[var(--ctc-primary)] text-white flex items-center justify-center mb-4 font-bold">${i + 1}</div>
      <h3 class="ctc-card-title font-semibold mb-2">${escapeHtml(title)}</h3>
      ${desc ? `<p class="ctc-card-desc text-sm text-[var(--ctc-text-secondary)]">${escapeHtml(desc)}</p>` : ''}
    </div>`;
    }).join('')}
  </div>
</div>`,
    };
  },

  'feature-list': (ctx) => {
    const items = extractListItems(ctx.content);

    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-feature-list ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-xl font-semibold mb-6">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <dl class="space-y-4">
    ${items.map(item => {
      const parts = item.split(/[:\-–]/).map(p => p.trim());
      return `
    <div class="ctc-feature flex gap-4 p-4 rounded-lg bg-[var(--ctc-surface)]">
      <dt class="ctc-feature-name font-semibold text-[var(--ctc-primary)] min-w-[120px]">${escapeHtml(parts[0])}</dt>
      <dd class="ctc-feature-desc text-[var(--ctc-text-secondary)]">${escapeHtml(parts[1] || '')}</dd>
    </div>`;
    }).join('')}
  </dl>
</div>`,
    };
  },

  'stat-cards': (ctx) => {
    const items = extractListItems(ctx.content);

    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-stat-cards ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-2xl font-semibold text-center mb-8">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
    ${items.map(item => {
      // Try to extract number and label
      const match = item.match(/(\d+[%+]?|\d+\.\d+)/);
      const stat = match ? match[1] : '•';
      const label = item.replace(/\d+[%+]?|\d+\.\d+/, '').trim() || item;
      return `
    <div class="ctc-stat text-center p-6 rounded-[var(--ctc-radius-lg)] bg-[var(--ctc-surface)]">
      <div class="ctc-stat-value text-4xl font-bold text-[var(--ctc-primary)]">${escapeHtml(stat)}</div>
      <div class="ctc-stat-label text-sm text-[var(--ctc-text-muted)] mt-2">${escapeHtml(label)}</div>
    </div>`;
    }).join('')}
  </div>
</div>`,
    };
  },

  // ---------------------------------------------------------------------------
  // PROCESS & STRUCTURE
  // ---------------------------------------------------------------------------

  'timeline-vertical': (ctx) => {
    const steps = extractSteps(ctx.content);
    if (steps.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-timeline-vertical ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" itemscope itemtype="https://schema.org/HowTo">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-2xl font-semibold text-center mb-8" itemprop="name">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="ctc-timeline-track relative pl-8 border-l-2 border-[var(--ctc-primary)]">
    ${steps.map((step, i) => `
    <div class="ctc-timeline-step relative pb-8 last:pb-0" itemscope itemprop="step" itemtype="https://schema.org/HowToStep">
      <meta itemprop="position" content="${i + 1}">
      <div class="ctc-step-marker absolute -left-[calc(1rem+1px)] w-8 h-8 rounded-full bg-[var(--ctc-primary)] text-white flex items-center justify-center font-bold">${i + 1}</div>
      <h3 class="ctc-step-title font-semibold mb-1" itemprop="name">${escapeHtml(step.title)}</h3>
      <p class="ctc-step-desc text-[var(--ctc-text-secondary)]" itemprop="text">${escapeHtml(step.description)}</p>
    </div>`).join('')}
  </div>
</section>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: ctx.heading || 'Process',
        step: steps.map((step, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: step.title,
          text: step.description,
        })),
      },
    };
  },

  'timeline-zigzag': (ctx) => {
    const steps = extractSteps(ctx.content);
    if (steps.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-timeline-zigzag ${emphasisClasses(ctx.emphasis)} ${spacingClasses('breathe')}" itemscope itemtype="https://schema.org/HowTo">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-3xl font-bold text-center mb-12" itemprop="name">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="ctc-timeline-zigzag-track relative before:absolute before:left-1/2 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-[var(--ctc-primary)] before:to-[var(--ctc-primary-light)] before:-translate-x-1/2">
    ${steps.map((step, i) => {
      const isLeft = i % 2 === 0;
      return `
    <div class="ctc-timeline-zigzag-step relative flex mb-12 ${isLeft ? '' : 'flex-row-reverse'}" itemscope itemprop="step" itemtype="https://schema.org/HowToStep">
      <meta itemprop="position" content="${i + 1}">
      <div class="flex-1 ${isLeft ? 'pr-12 text-right' : 'pl-12 text-left'}">
        <div class="ctc-step-card inline-block max-w-md p-6 rounded-[var(--ctc-radius-lg)] bg-[var(--ctc-surface)] shadow-lg">
          <h3 class="ctc-step-title text-xl font-semibold mb-2" itemprop="name">${escapeHtml(step.title)}</h3>
          <p class="ctc-step-desc text-[var(--ctc-text-secondary)]" itemprop="text">${escapeHtml(step.description)}</p>
        </div>
      </div>
      <div class="ctc-step-node absolute left-1/2 -translate-x-1/2 z-10">
        <span class="w-12 h-12 rounded-full bg-[var(--ctc-primary)] text-white flex items-center justify-center text-lg font-bold shadow-lg">${i + 1}</span>
      </div>
      <div class="flex-1"></div>
    </div>`;
    }).join('')}
  </div>
</section>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: ctx.heading || 'Process',
        step: steps.map((step, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: step.title,
          text: step.description,
        })),
      },
    };
  },

  'steps-numbered': (ctx) => {
    const steps = extractSteps(ctx.content);
    if (steps.length === 0) {
      return componentRenderers['numbered-list']!(ctx);
    }

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-steps-numbered ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" itemscope itemtype="https://schema.org/HowTo">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-xl font-semibold mb-6" itemprop="name">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <ol class="ctc-steps-list space-y-4">
    ${steps.map((step, i) => `
    <li class="ctc-step flex items-start gap-4 p-4 rounded-lg bg-[var(--ctc-surface)]" itemscope itemprop="step" itemtype="https://schema.org/HowToStep">
      <meta itemprop="position" content="${i + 1}">
      <span class="ctc-step-num w-8 h-8 rounded-full bg-[var(--ctc-primary)] text-white flex items-center justify-center font-bold flex-shrink-0">${i + 1}</span>
      <div>
        <h4 class="ctc-step-title font-semibold" itemprop="name">${escapeHtml(step.title)}</h4>
        ${step.description ? `<p class="ctc-step-desc text-sm text-[var(--ctc-text-secondary)] mt-1" itemprop="text">${escapeHtml(step.description)}</p>` : ''}
      </div>
    </li>`).join('')}
  </ol>
</section>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: ctx.heading || 'Steps',
        step: steps.map((step, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: step.title,
          text: step.description,
        })),
      },
    };
  },

  // ---------------------------------------------------------------------------
  // FAQ COMPONENTS
  // ---------------------------------------------------------------------------

  'faq-accordion': (ctx) => {
    const faqs = extractFaqItems(ctx.content);
    if (faqs.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-faq-accordion ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" itemscope itemtype="https://schema.org/FAQPage">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-2xl font-semibold text-center mb-8">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="ctc-faq-list max-w-3xl mx-auto divide-y divide-[var(--ctc-border)]">
    ${faqs.map((faq, i) => `
    <div class="ctc-faq-item py-4" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <h3 class="ctc-faq-question">
        <button type="button" aria-expanded="false" aria-controls="faq-answer-${ctx.sectionId}-${i}" class="ctc-faq-trigger w-full flex justify-between items-center text-left font-semibold text-lg hover:text-[var(--ctc-primary)] transition-colors">
          <span itemprop="name">${escapeHtml(faq.question)}</span>
          <span class="ctc-faq-icon text-2xl text-[var(--ctc-primary)]" aria-hidden="true">+</span>
        </button>
      </h3>
      <div id="faq-answer-${ctx.sectionId}-${i}" class="ctc-faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer" hidden>
        <div class="pt-3 text-[var(--ctc-text-secondary)]" itemprop="text">${escapeHtml(faq.answer)}</div>
      </div>
    </div>`).join('')}
  </div>
</section>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    };
  },

  'faq-cards': (ctx) => {
    const faqs = extractFaqItems(ctx.content);
    if (faqs.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    const columns = ctx.styleHints?.columns || 2;

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-faq-cards ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" itemscope itemtype="https://schema.org/FAQPage">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-2xl font-semibold text-center mb-8">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="grid md:grid-cols-${columns} gap-6">
    ${faqs.map(faq => `
    <div class="ctc-faq-card p-6 rounded-[var(--ctc-radius-lg)] bg-[var(--ctc-surface)] shadow-sm" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <h3 class="ctc-faq-question font-semibold mb-3" itemprop="name">${escapeHtml(faq.question)}</h3>
      <div class="ctc-faq-answer text-[var(--ctc-text-secondary)]" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <p itemprop="text">${escapeHtml(faq.answer)}</p>
      </div>
    </div>`).join('')}
  </div>
</section>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    };
  },

  // ---------------------------------------------------------------------------
  // CONVERSION COMPONENTS
  // ---------------------------------------------------------------------------

  'cta-banner': (ctx) => {
    const isHeroMoment = ctx.emphasis === 'hero-moment';

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-cta-banner ${isHeroMoment ? 'bg-gradient-to-r from-[var(--ctc-primary)] to-[var(--ctc-primary-light)] text-white' : 'bg-[var(--ctc-surface)] border border-[var(--ctc-border)]'} rounded-[var(--ctc-radius-xl)] p-8 md:p-12 text-center my-12">
  ${ctx.heading ? `<h2 class="ctc-cta-title text-2xl md:text-3xl font-bold mb-4">${escapeHtml(ctx.heading)}</h2>` : ''}
  <div class="ctc-cta-text text-lg opacity-90 mb-6 max-w-2xl mx-auto">
    ${markdownToHtml(ctx.content)}
  </div>
  <div class="ctc-cta-actions flex gap-4 justify-center flex-wrap">
    <a href="#contact" class="ctc-btn ctc-btn-${isHeroMoment ? 'white' : 'primary'} px-8 py-3 rounded-[var(--ctc-radius-full)] font-semibold ${isHeroMoment ? 'bg-white text-[var(--ctc-primary)]' : 'bg-[var(--ctc-primary)] text-white'} hover:opacity-90 transition-opacity">
      Contact
    </a>
  </div>
</aside>`,
    };
  },

  'cta-inline': (ctx) => {
    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-cta-inline flex items-center justify-between gap-6 p-6 rounded-[var(--ctc-radius-lg)] bg-[var(--ctc-surface)] border border-[var(--ctc-border)] my-8">
  <div class="ctc-cta-text">
    ${ctx.heading ? `<strong class="block mb-1">${escapeHtml(ctx.heading)}</strong>` : ''}
    <span class="text-[var(--ctc-text-secondary)]">${markdownToHtml(ctx.content)}</span>
  </div>
  <a href="#contact" class="ctc-btn ctc-btn-primary px-6 py-2 rounded-[var(--ctc-radius-full)] bg-[var(--ctc-primary)] text-white font-semibold hover:opacity-90 transition-opacity flex-shrink-0">
    Meer Info
  </a>
</aside>`,
    };
  },

  // ---------------------------------------------------------------------------
  // SPECIALIZED COMPONENTS
  // ---------------------------------------------------------------------------

  'key-takeaways': (ctx) => {
    const items = extractListItems(ctx.content);

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-key-takeaways bg-gradient-to-br from-[var(--ctc-primary)] to-[var(--ctc-primary-light)] text-white p-6 md:p-8 rounded-[var(--ctc-radius-xl)] my-8">
  <h2 class="ctc-takeaways-title text-xl font-semibold mb-4 flex items-center gap-2">
    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
    ${escapeHtml(ctx.heading || 'Belangrijkste Punten')}
  </h2>
  <div class="grid md:grid-cols-2 gap-4">
    ${items.map(item => `
    <div class="ctc-takeaway-item flex items-start gap-3 bg-white/15 backdrop-blur-sm p-4 rounded-lg">
      <span class="ctc-takeaway-check w-6 h-6 rounded-full bg-white text-[var(--ctc-primary)] flex items-center justify-center font-bold flex-shrink-0">✓</span>
      <span class="text-white/90">${escapeHtml(item)}</span>
    </div>`).join('')}
  </div>
</aside>`,
    };
  },

  'summary-box': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content);

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-summary-box border-2 border-[var(--ctc-primary)] rounded-[var(--ctc-radius-lg)] p-6 my-8">
  <h2 class="ctc-summary-title text-lg font-semibold text-[var(--ctc-primary)] mb-4 flex items-center gap-2">
    <span>📋</span>
    ${escapeHtml(ctx.heading || 'Samenvatting')}
  </h2>
  <div class="ctc-summary-content prose prose-sm max-w-none">
    ${htmlContent}
  </div>
</aside>`,
    };
  },

  'sources-section': (ctx) => {
    const items = extractListItems(ctx.content);

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-sources-section p-6 bg-[var(--ctc-surface)] rounded-[var(--ctc-radius-lg)] border border-[var(--ctc-border)] my-8">
  <h2 class="ctc-sources-title text-xl font-semibold mb-4">${escapeHtml(ctx.heading || 'Bronnen')}</h2>
  <ul class="ctc-sources-list space-y-2">
    ${items.map(item => `
    <li class="ctc-source-item flex items-start gap-2">
      <span class="text-[var(--ctc-primary)]">•</span>
      <span class="text-[var(--ctc-text-secondary)]">${markdownToHtml(item)}</span>
    </li>`).join('')}
  </ul>
</section>`,
    };
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Get renderer for a component type
 */
export function getComponentRenderer(type: ComponentType): ComponentRenderer {
  return componentRenderers[type] || componentRenderers['prose']!;
}

/**
 * Check if a component type has a dedicated renderer
 */
export function hasRenderer(type: ComponentType): boolean {
  return type in componentRenderers;
}

/**
 * Get all available component types
 */
export function getAvailableComponents(): ComponentType[] {
  return Object.keys(componentRenderers) as ComponentType[];
}

export { markdownToHtml, extractListItems, extractFaqItems, extractSteps };
