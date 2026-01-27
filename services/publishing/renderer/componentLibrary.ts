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
  /** Map of image descriptions to URLs (for replacing [IMAGE:...] placeholders) */
  imageUrlMap?: Map<string, string>;
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
      return 'ctc-section--bg';
    case 'featured':
      return 'ctc-section--featured';
    case 'hero-moment':
      return 'ctc-section--hero';
    default:
      return '';
  }
}

/**
 * DEPRECATED: Use emphasisClasses() instead.
 * Inline styles override brand CSS due to specificity.
 * This function is kept for reference but should NOT be used.
 */
// function emphasisStyles(emphasis: SectionEmphasis): string { ... }

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
function markdownToHtml(markdown: string, imageUrlMap?: Map<string, string>): string {
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

  // Images with proper figure structure (standard markdown)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure class="ctc-figure"><img src="$2" alt="$1" loading="lazy"><figcaption>$1</figcaption></figure>');

  // Custom image placeholders: [IMAGE: description | alt="alt text"]
  // If imageUrlMap has a URL for this description, render the actual image
  // Otherwise, render a styled placeholder
  // Use non-greedy matching (.+?) to properly capture the description
  html = html.replace(/\[IMAGE:\s*(.+?)\s*\|\s*alt="([^"]*)"\s*\]/g, (match, description, altText) => {
    const cleanDescription = description.trim();
    const alt = altText?.trim() || cleanDescription;

    // Check if we have an actual URL for this image
    if (imageUrlMap && imageUrlMap.has(cleanDescription)) {
      const imageUrl = imageUrlMap.get(cleanDescription)!;
      return `<figure class="ctc-figure ctc-image-figure">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}" loading="lazy" class="ctc-image">
        <figcaption class="ctc-figcaption">${escapeHtml(alt)}</figcaption>
      </figure>`;
    }

    // Render as a styled placeholder
    return `<figure class="ctc-image-placeholder">
      <div class="ctc-image-placeholder-icon">🖼️</div>
      <p class="ctc-image-placeholder-desc">${escapeHtml(cleanDescription)}</p>
      <p class="ctc-image-placeholder-alt">Alt: ${escapeHtml(alt)}</p>
    </figure>`;
  });

  // Also handle simpler format without alt: [IMAGE: description]
  html = html.replace(/\[IMAGE:\s*([^\]]+)\]/g, (match, description) => {
    const cleanDescription = description.trim();

    // Skip if already processed (has alt attribute pattern inside)
    if (cleanDescription.includes('| alt=')) return match;

    // Check if we have an actual URL for this image
    if (imageUrlMap && imageUrlMap.has(cleanDescription)) {
      const imageUrl = imageUrlMap.get(cleanDescription)!;
      return `<figure class="ctc-figure ctc-image-figure">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(cleanDescription)}" loading="lazy" class="ctc-image">
        <figcaption class="ctc-figcaption">${escapeHtml(cleanDescription)}</figcaption>
      </figure>`;
    }

    // Render as a styled placeholder
    return `<figure class="ctc-image-placeholder">
      <div class="ctc-image-placeholder-icon">🖼️</div>
      <p class="ctc-image-placeholder-desc">${escapeHtml(cleanDescription)}</p>
    </figure>`;
  });

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
 * Result of extracting steps from content
 */
interface ExtractedSteps {
  /** Intro prose that appears before the steps (provides semantic context) */
  introProse: string;
  /** The extracted steps */
  steps: Array<{ title: string; description: string }>;
}

/**
 * Extract process steps from content, preserving intro prose
 *
 * The intro prose often contains important semantic context like
 * "This process consists of 5 phases" which must be preserved for SEO.
 */
function extractSteps(content: string): ExtractedSteps {
  const steps: Array<{ title: string; description: string }> = [];
  let introProse = '';

  // Find where the numbered list starts
  const firstNumberedMatch = content.match(/^\d+\.\s+/m);
  const firstStepMatch = content.match(/(?:stap|step)\s*\d+[:\.]?/im);

  // Determine where the list starts
  let listStartIndex = content.length;
  if (firstNumberedMatch && firstNumberedMatch.index !== undefined) {
    listStartIndex = Math.min(listStartIndex, firstNumberedMatch.index);
  }
  if (firstStepMatch && firstStepMatch.index !== undefined) {
    listStartIndex = Math.min(listStartIndex, firstStepMatch.index);
  }

  // Extract intro prose (content before the list)
  if (listStartIndex > 0 && listStartIndex < content.length) {
    introProse = content.substring(0, listStartIndex).trim();
    // Remove heading patterns from intro prose (they're handled separately)
    introProse = introProse.replace(/^#+\s+[^\n]+\n*/gm, '').trim();
  }

  // Try numbered steps with descriptions (e.g., "Stap 1: Title - Description")
  const stepPattern = /(?:stap|step)\s*(\d+)[:\.]?\s*\*?\*?([^*\n]+)\*?\*?\s*[-–:]?\s*([^\n]+)?/gi;
  let match;
  while ((match = stepPattern.exec(content)) !== null) {
    steps.push({
      title: match[2].trim(),
      description: match[3]?.trim() || '',
    });
  }

  // Fall back to numbered list (e.g., "1. Title - Description")
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

  return { introProse, steps };
}

// ============================================================================
// COMPONENT RENDERERS
// ============================================================================

const componentRenderers: Partial<Record<ComponentType, ComponentRenderer>> = {
  // ---------------------------------------------------------------------------
  // CORE CONTENT
  // ---------------------------------------------------------------------------

  'prose': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content, ctx.imageUrlMap);

    // Build CSS classes - NO inline styles to allow brand CSS to control styling
    const bgClass = ctx.hasBackground ? 'ctc-prose--has-bg' : '';

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-prose ${emphasisClasses(ctx.emphasis)} ${bgClass} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `
  <div class="ctc-section-header">
    <div class="ctc-section-heading-accent"></div>
    <h${ctx.headingLevel} id="${slugify(ctx.heading)}" class="ctc-section-heading">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>
  </div>` : ''}
  <div class="ctc-prose-content">
    ${htmlContent}
  </div>
  ${ctx.hasDivider ? '<hr class="ctc-divider">' : ''}
</section>`,
    };
  },

  'lead-paragraph': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content, ctx.imageUrlMap);
    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-lead-paragraph ${spacingClasses(ctx.spacing)}">
  <div class="ctc-lead-paragraph-accent"></div>
  <div class="ctc-lead-paragraph-content">
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
<figure id="${ctx.sectionId}" class="ctc-pull-quote ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  <div class="ctc-pull-quote-mark ctc-pull-quote-mark--open">"</div>
  <div class="ctc-pull-quote-mark ctc-pull-quote-mark--close">"</div>
  <blockquote class="ctc-pull-quote-text">
    "${escapeHtml(quote)}"
  </blockquote>
</figure>`,
    };
  },

  'highlight-box': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content, ctx.imageUrlMap);
    const variant = ctx.variant || 'info';
    const variantConfig: Record<string, { variantClass: string; icon: string }> = {
      'info': { variantClass: 'ctc-highlight-box--info', icon: 'ℹ️' },
      'warning': { variantClass: 'ctc-highlight-box--warning', icon: '⚠️' },
      'success': { variantClass: 'ctc-highlight-box--success', icon: '✓' },
      'tip': { variantClass: 'ctc-highlight-box--tip', icon: '💡' },
    };
    const config = variantConfig[variant] || variantConfig.info;

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-highlight-box ${config.variantClass} ${spacingClasses(ctx.spacing)}">
  <div class="ctc-highlight-box-inner">
    <span class="ctc-highlight-box-icon">${config.icon}</span>
    <div class="ctc-highlight-box-content">
      ${ctx.heading ? `<h${ctx.headingLevel} class="ctc-highlight-box-heading">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
      <div class="ctc-highlight-box-text">
        ${htmlContent}
      </div>
    </div>
  </div>
</aside>`,
    };
  },

  'callout': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content, ctx.imageUrlMap);
    const icon = ctx.styleHints?.icon || '💡';

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-callout ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  <div class="ctc-callout-content">
    <div class="ctc-callout-icon" aria-hidden="true">${icon}</div>
    <div class="ctc-callout-body">
      ${ctx.heading ? `<h${ctx.headingLevel} class="ctc-callout-heading">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
      <div class="ctc-callout-text">${htmlContent}</div>
    </div>
  </div>
</aside>`,
    };
  },

  // ---------------------------------------------------------------------------
  // LIST PRESENTATIONS
  // ---------------------------------------------------------------------------

  'bullet-list': (ctx) => {
    const items = extractListItems(ctx.content);
    const bgClass = ctx.hasBackground ? 'ctc-bullet-list--has-bg' : '';

    const htmlContent = items.length > 0
      ? `<ul class="ctc-bullet-list-items">${items.map(item => `<li class="ctc-bullet-list-item"><span class="ctc-bullet-list-marker"></span><span>${markdownToHtml(item)}</span></li>`).join('')}</ul>`
      : markdownToHtml(ctx.content, ctx.imageUrlMap);

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-bullet-list ${emphasisClasses(ctx.emphasis)} ${bgClass} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} id="${slugify(ctx.heading || '')}" class="ctc-bullet-list-heading">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  ${htmlContent}
</section>`,
    };
  },

  'numbered-list': (ctx) => {
    const items = extractListItems(ctx.content);
    const htmlContent = items.length > 0
      ? `<ol class="ctc-list list-decimal pl-6 space-y-2">${items.map(item => `<li class="ctc-li">${markdownToHtml(item)}</li>`).join('')}</ol>`
      : markdownToHtml(ctx.content, ctx.imageUrlMap);

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

    // CRITICAL: Fallback to prose if no list items
    if (items.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-checklist ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} class="ctc-checklist-heading">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <ul class="ctc-checklist-items">
    ${items.map(item => `
    <li class="ctc-checklist-item">
      <span class="ctc-checklist-check">✓</span>
      <span class="ctc-checklist-text">${markdownToHtml(item)}</span>
    </li>`).join('')}
  </ul>
</section>`,
    };
  },

  'icon-list': (ctx) => {
    const items = extractListItems(ctx.content);

    // CRITICAL: Fallback to prose if no list items
    if (items.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-icon-list ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} class="ctc-icon-list-heading">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <ul class="ctc-icon-list-items">
    ${items.map((item, i) => `
    <li class="ctc-icon-list-item">
      <span class="ctc-icon-list-number">${i + 1}</span>
      <div class="ctc-icon-list-content">${markdownToHtml(item)}</div>
    </li>`).join('')}
  </ul>
</div>`,
    };
  },

  'card-grid': (ctx) => {
    const items = extractListItems(ctx.content);
    const icons = ['✨', '🎯', '🚀', '💡', '⭐', '🔥', '💪', '🎨', '📈', '🎁'];

    // CRITICAL: If no list items found, fall back to prose to preserve ALL content
    if (items.length === 0) {
      const htmlContent = markdownToHtml(ctx.content, ctx.imageUrlMap);
      return {
        html: `
<section id="${ctx.sectionId}" class="ctc-prose ctc-card-grid-fallback ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} id="${slugify(ctx.heading)}" class="ctc-section-heading">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="ctc-prose-content">
    ${htmlContent}
  </div>
</section>`,
      };
    }

    // Determine card variant based on emphasis
    const cardClass = ctx.emphasis === 'hero-moment' ? 'ctc-card--glass' : 'ctc-card--raised';

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-card-grid ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} class="ctc-card-grid-heading">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="ctc-card-grid-container">
    ${items.map((item, i) => {
        const parts = item.split(/[:\-–]/).map(p => p.trim());
        const title = parts[0];
        const desc = parts[1] || '';
        return `
    <div class="ctc-card ${cardClass}">
      <div class="ctc-card-icon" aria-hidden="true">${icons[i % icons.length]}</div>
      <h3 class="ctc-card-title">${markdownToHtml(title)}</h3>
      ${desc ? `<p class="ctc-card-desc">${markdownToHtml(desc)}</p>` : ''}
    </div>`;
      }).join('')}
  </div>
</section>`,
    };
  },

  'feature-list': (ctx) => {
    const items = extractListItems(ctx.content);

    // CRITICAL: Fallback to prose if no list items
    if (items.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-feature-list ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} class="ctc-feature-list-heading">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <dl class="ctc-feature-list-items">
    ${items.map((item, i) => {
        const parts = item.split(/[:\-–]/).map(p => p.trim());
        return `
    <div class="ctc-feature-list-item">
      <div class="ctc-feature-list-number">${i + 1}</div>
      <div class="ctc-feature-list-content">
        <dt class="ctc-feature-list-title">${markdownToHtml(parts[0])}</dt>
        <dd class="ctc-feature-list-desc">${markdownToHtml(parts[1] || '')}</dd>
      </div>
    </div>`;
      }).join('')}
  </dl>
</section>`,
    };
  },

  'stat-cards': (ctx) => {
    const items = extractListItems(ctx.content);

    // CRITICAL: Fallback to prose if no list items
    if (items.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

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
      <div class="ctc-stat-label text-sm text-[var(--ctc-text-muted)] mt-2">${markdownToHtml(label)}</div>
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
    const { introProse, steps } = extractSteps(ctx.content);
    if (steps.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    // Render intro prose if present (provides semantic context like "5 phases")
    const introHtml = introProse
      ? `<div class="ctc-timeline-intro">${markdownToHtml(introProse)}</div>`
      : '';

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-timeline-vertical ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" itemscope itemtype="https://schema.org/HowTo">
  ${ctx.heading ? `<h${ctx.headingLevel} class="ctc-section-heading" itemprop="name">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  ${introHtml}
  <div class="ctc-timeline-track">
    <div class="ctc-timeline-line"></div>
    ${steps.map((step, i) => `
    <div class="ctc-timeline-step ${i === steps.length - 1 ? 'ctc-timeline-step--last' : ''}" itemscope itemprop="step" itemtype="https://schema.org/HowToStep">
      <meta itemprop="position" content="${i + 1}">
      <span class="ctc-timeline-step-number">${i + 1}</span>
      <div class="ctc-timeline-step-content">
        <h3 class="ctc-timeline-step-title" itemprop="name">${markdownToHtml(step.title)}</h3>
        <p class="ctc-timeline-step-desc" itemprop="text">${markdownToHtml(step.description)}</p>
      </div>
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
    const { introProse, steps } = extractSteps(ctx.content);
    if (steps.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    // Render intro prose if present (provides semantic context like "5 phases")
    const introHtml = introProse
      ? `<div class="ctc-timeline-intro ctc-timeline-intro--centered">${markdownToHtml(introProse)}</div>`
      : '';

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-timeline-zigzag ${emphasisClasses(ctx.emphasis)} ${spacingClasses('breathe')}" itemscope itemtype="https://schema.org/HowTo">
  ${ctx.heading ? `<h${ctx.headingLevel} class="ctc-section-heading" itemprop="name">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  ${introHtml}
  <div class="ctc-timeline-zigzag-track">
    ${steps.map((step, i) => {
        const isLeft = i % 2 === 0;
        return `
    <div class="ctc-timeline-zigzag-step ${isLeft ? 'ctc-timeline-zigzag-step--left' : 'ctc-timeline-zigzag-step--right'}" itemscope itemprop="step" itemtype="https://schema.org/HowToStep">
      <meta itemprop="position" content="${i + 1}">
      <div class="ctc-timeline-zigzag-content">
        <div class="ctc-step-card">
          <h3 class="ctc-step-title" itemprop="name">${markdownToHtml(step.title)}</h3>
          <p class="ctc-step-desc" itemprop="text">${markdownToHtml(step.description)}</p>
        </div>
      </div>
      <div class="ctc-step-node">
        <span class="ctc-step-node-number">${i + 1}</span>
      </div>
      <div class="ctc-timeline-zigzag-spacer"></div>
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
    const { introProse, steps } = extractSteps(ctx.content);
    if (steps.length === 0) {
      return componentRenderers['numbered-list']!(ctx);
    }

    // Render intro prose if present (provides semantic context like "5 phases")
    const introHtml = introProse
      ? `<div class="ctc-steps-intro">${markdownToHtml(introProse)}</div>`
      : '';

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-steps-numbered ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" itemscope itemtype="https://schema.org/HowTo">
  ${ctx.heading ? `<h${ctx.headingLevel} class="ctc-section-heading" itemprop="name">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  ${introHtml}
  <ol class="ctc-steps-list">
    ${steps.map((step, i) => `
    <li class="ctc-step" itemscope itemprop="step" itemtype="https://schema.org/HowToStep">
      <meta itemprop="position" content="${i + 1}">
      <span class="ctc-step-num">${i + 1}</span>
      <div class="ctc-step-content">
        <h4 class="ctc-step-title" itemprop="name">${markdownToHtml(step.title)}</h4>
        ${step.description ? `<p class="ctc-step-desc" itemprop="text">${markdownToHtml(step.description)}</p>` : ''}
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
  ${ctx.heading ? `
  <div class="ctc-faq-header">
    <span class="ctc-faq-badge">
      <span>❓</span> FAQ
    </span>
    <h${ctx.headingLevel} class="ctc-faq-title">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>
  </div>` : ''}
  <div class="ctc-faq-list">
    ${faqs.map((faq, i) => `
    <div class="ctc-faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <h3 class="ctc-faq-question-wrapper">
        <button type="button" aria-expanded="false" aria-controls="faq-answer-${ctx.sectionId}-${i}" class="ctc-faq-trigger">
          <span class="ctc-faq-question-content">
            <span class="ctc-faq-number">${i + 1}</span>
            <span itemprop="name">${markdownToHtml(faq.question)}</span>
          </span>
          <span class="ctc-faq-icon" aria-hidden="true">+</span>
        </button>
      </h3>
      <div id="faq-answer-${ctx.sectionId}-${i}" class="ctc-faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer" hidden>
        <div class="ctc-faq-answer-content" itemprop="text">${markdownToHtml(faq.answer)}</div>
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
<section id="${ctx.sectionId}" class="ctc-faq-cards ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" itemscope itemtype="https://schema.org/FAQPage" data-columns="${columns}">
  ${ctx.heading ? `<h${ctx.headingLevel} class="ctc-section-heading">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="ctc-faq-cards-grid">
    ${faqs.map(faq => `
    <div class="ctc-faq-card" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <h3 class="ctc-faq-question" itemprop="name">${markdownToHtml(faq.question)}</h3>
      <div class="ctc-faq-card-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <p itemprop="text">${markdownToHtml(faq.answer)}</p>
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
    const bannerClass = isHeroMoment ? 'ctc-cta-banner--prominent' : 'ctc-cta-banner--subtle';

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-cta-banner ${bannerClass} ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  <div class="ctc-cta-banner-decor ctc-cta-banner-decor--1"></div>
  <div class="ctc-cta-banner-decor ctc-cta-banner-decor--2"></div>
  <div class="ctc-cta-banner-content">
    ${ctx.heading ? `<h2 class="ctc-cta-banner-title">${escapeHtml(ctx.heading)}</h2>` : ''}
    <div class="ctc-cta-banner-text">
      ${markdownToHtml(ctx.content, ctx.imageUrlMap)}
    </div>
    <div class="ctc-cta-banner-actions">
      <a href="#contact" class="ctc-btn ctc-btn-primary">
        Neem Contact Op
        <span class="ctc-btn-arrow">→</span>
      </a>
    </div>
  </div>
</aside>`,
    };
  },

  'cta-inline': (ctx) => {
    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-cta-inline ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  <div class="ctc-cta-inline-text">
    ${ctx.heading ? `<strong class="ctc-cta-inline-heading">${escapeHtml(ctx.heading)}</strong>` : ''}
    <span class="ctc-cta-inline-desc">${markdownToHtml(ctx.content, ctx.imageUrlMap)}</span>
  </div>
  <a href="#contact" class="ctc-btn ctc-btn-primary">
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

    // If no list items found, fall back to prose
    if (items.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-key-takeaways ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  <div class="ctc-key-takeaways-decor ctc-key-takeaways-decor--1"></div>
  <div class="ctc-key-takeaways-decor ctc-key-takeaways-decor--2"></div>
  <div class="ctc-key-takeaways-decor ctc-key-takeaways-decor--3"></div>

  <div class="ctc-key-takeaways-header">
    <span class="ctc-key-takeaways-icon">💡</span>
    <h2 class="ctc-key-takeaways-title">${escapeHtml(ctx.heading || 'Belangrijkste Punten')}</h2>
  </div>

  <div class="ctc-key-takeaways-grid">
    ${items.map((item, i) => `
    <div class="ctc-key-takeaways-item">
      <span class="ctc-key-takeaways-number">${items.length <= 3 ? '✓' : (i + 1)}</span>
      <span class="ctc-key-takeaways-text">${markdownToHtml(item)}</span>
    </div>`).join('')}
  </div>
</aside>`,
    };
  },

  'summary-box': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content, ctx.imageUrlMap);

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-summary-box ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  <h2 class="ctc-summary-title">
    <span class="ctc-summary-icon">📋</span>
    ${escapeHtml(ctx.heading || 'Samenvatting')}
  </h2>
  <div class="ctc-summary-content">
    ${htmlContent}
  </div>
</aside>`,
    };
  },

  'sources-section': (ctx) => {
    const items = extractListItems(ctx.content);

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-sources-section ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  <h2 class="ctc-sources-title">${escapeHtml(ctx.heading || 'Bronnen')}</h2>
  <ul class="ctc-sources-list">
    ${items.map(item => `
    <li class="ctc-source-item">
      <span class="ctc-source-marker">•</span>
      <span class="ctc-source-text">${markdownToHtml(item)}</span>
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
