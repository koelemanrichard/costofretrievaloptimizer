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
 * Generate inline styles for emphasis level
 */
function emphasisStyles(emphasis: SectionEmphasis): string {
  switch (emphasis) {
    case 'background':
      return 'background: var(--ctc-surface); border-radius: var(--ctc-radius-xl); padding: var(--ctc-space-8); border: 1px solid var(--ctc-border-subtle)';
    case 'featured':
      return 'background: linear-gradient(135deg, var(--ctc-surface) 0%, color-mix(in srgb, var(--ctc-primary) 5%, var(--ctc-surface)) 100%); border-radius: var(--ctc-radius-2xl); padding: var(--ctc-space-10); box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1), 0 4px 12px -2px rgba(0,0,0,0.05); border: 1px solid var(--ctc-border)';
    case 'hero-moment':
      return 'background: linear-gradient(135deg, var(--ctc-primary) 0%, var(--ctc-primary-dark) 100%); color: white; padding: var(--ctc-space-12); border-radius: var(--ctc-radius-2xl); position: relative; overflow: hidden';
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

  // Images with proper figure structure
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure class="ctc-figure"><img src="$2" alt="$1" loading="lazy"><figcaption>$1</figcaption></figure>');

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
    const htmlContent = markdownToHtml(ctx.content);
    const emphasisStyle = emphasisStyles(ctx.emphasis);
    const bgStyles = ctx.hasBackground && !emphasisStyle
      ? 'background: var(--ctc-surface); border-radius: var(--ctc-radius-xl); padding: 2rem; border: 1px solid var(--ctc-border-subtle)'
      : emphasisStyle;

    // Add decorative element for hero-moment or featured sections
    const isSpecial = ctx.emphasis === 'hero-moment' || ctx.emphasis === 'featured';
    const decorElement = isSpecial ? `
      <div style="position: absolute; top: -30%; right: -15%; width: 300px; height: 300px; background: ${ctx.emphasis === 'hero-moment' ? 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' : 'radial-gradient(circle, color-mix(in srgb, var(--ctc-primary) 10%, transparent) 0%, transparent 70%)'}; pointer-events: none; z-index: 0"></div>
    ` : '';

    // Heading styles with underline accent
    const headingStyle = `
      font-weight: var(--ctc-heading-weight);
      font-family: var(--ctc-font-display);
      font-size: 1.5rem;
      color: ${ctx.emphasis === 'hero-moment' ? 'white' : 'var(--ctc-text)'};
      margin-bottom: 1.5rem;
      position: relative;
      z-index: 1;
      padding-bottom: 0.75rem;
    `;

    const headingAfterStyle = ctx.heading && ctx.emphasis !== 'hero-moment' ? `
      <div style="width: 50px; height: 3px; background: linear-gradient(to right, var(--ctc-primary), var(--ctc-primary-light)); border-radius: 2px; margin-bottom: 0.5rem"></div>
    ` : '';

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-prose ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" style="${bgStyles || ''}; position: relative; overflow: hidden">
  ${decorElement}
  ${ctx.heading ? `
  <div style="position: relative; z-index: 1">
    ${headingAfterStyle}
    <h${ctx.headingLevel} id="${slugify(ctx.heading)}" class="ctc-section-heading" style="${headingStyle}">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>
  </div>` : ''}
  <div class="ctc-prose-content" style="position: relative; z-index: 1; color: ${ctx.emphasis === 'hero-moment' ? 'rgba(255,255,255,0.9)' : 'var(--ctc-text-secondary)'}; line-height: 1.8; font-size: 1.0625rem">
    ${htmlContent}
  </div>
  ${ctx.hasDivider ? '<hr class="ctc-divider" style="border: 0; height: 1px; background: linear-gradient(to right, var(--ctc-border), transparent); margin-top: 2.5rem">' : ''}
</section>`,
    };
  },

  'lead-paragraph': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content);
    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-lead-paragraph ${spacingClasses(ctx.spacing)}" style="position: relative">
  <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(to bottom, var(--ctc-primary), var(--ctc-primary-light)); border-radius: 2px; opacity: 0.6"></div>
  <div style="padding-left: var(--ctc-space-8); font-size: 1.25rem; line-height: 1.8; color: var(--ctc-text-secondary); font-weight: 400; letter-spacing: -0.01em">
    ${htmlContent}
  </div>
</div>`,
    };
  },

  'pull-quote': (ctx) => {
    // Extract the main quote from content
    const quoteMatch = ctx.content.match(/"([^"]+)"|>?\s*([^\n]+)/);
    const quote = quoteMatch ? (quoteMatch[1] || quoteMatch[2]) : ctx.content;
    const emphasisStyle = emphasisStyles(ctx.emphasis);

    return {
      html: `
<figure id="${ctx.sectionId}" class="ctc-pull-quote ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" style="${emphasisStyle || 'background: linear-gradient(135deg, var(--ctc-surface) 0%, color-mix(in srgb, var(--ctc-primary) 4%, var(--ctc-surface)) 100%)'}; border-radius: var(--ctc-radius-2xl); padding: var(--ctc-space-12) var(--ctc-space-10); position: relative; text-align: center; overflow: hidden">
  <div style="position: absolute; top: 20px; left: 40px; font-size: 8rem; line-height: 1; font-family: Georgia, serif; color: var(--ctc-primary); opacity: 0.08; pointer-events: none; z-index: 0">"</div>
  <div style="position: absolute; bottom: 20px; right: 40px; font-size: 8rem; line-height: 1; font-family: Georgia, serif; color: var(--ctc-primary); opacity: 0.08; pointer-events: none; z-index: 0; transform: rotate(180deg)">"</div>
  <blockquote style="position: relative; z-index: 1; font-size: var(--ctc-text-2xl); font-weight: 500; line-height: 1.5; color: ${ctx.emphasis === 'hero-moment' ? 'white' : 'var(--ctc-text)'}; max-width: 700px; margin: 0 auto; font-style: italic">
    "${escapeHtml(quote)}"
  </blockquote>
</figure>`,
    };
  },

  'highlight-box': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content);
    const variant = ctx.variant || 'info';
    const variantStyles: Record<string, { variantClass: string; icon: string; iconBg: string }> = {
      'info': { variantClass: 'ctc-highlight-box--info', icon: 'ℹ️', iconBg: '#3B82F6' },
      'warning': { variantClass: 'ctc-highlight-box--warning', icon: '⚠️', iconBg: '#F59E0B' },
      'success': { variantClass: 'ctc-highlight-box--success', icon: '✓', iconBg: '#10B981' },
      'tip': { variantClass: 'ctc-highlight-box--tip', icon: '💡', iconBg: '#8B5CF6' },
    };
    const style = variantStyles[variant] || variantStyles.info;

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-highlight-box ${style.variantClass} ${spacingClasses(ctx.spacing)}">
  <div style="display: flex; gap: var(--ctc-space-4); align-items: flex-start; position: relative; z-index: 1">
    <span style="width: 32px; height: 32px; min-width: 32px; border-radius: var(--ctc-radius-md); background: ${style.iconBg}; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: 700">${style.icon}</span>
    <div style="flex: 1">
      ${ctx.heading ? `<h${ctx.headingLevel} style="font-weight: 600; font-size: 1.0625rem; margin-bottom: var(--ctc-space-2); color: #1f2937">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
      <div style="color: #4b5563; line-height: 1.7; font-size: 0.9375rem">
        ${htmlContent}
      </div>
    </div>
  </div>
</aside>`,
    };
  },

  'callout': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content);
    const icon = ctx.styleHints?.icon || '💡';

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-callout ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  <div class="ctc-callout-content">
    <div class="ctc-callout-icon" aria-hidden="true">${icon}</div>
    <div style="flex: 1">
      ${ctx.heading ? `<h${ctx.headingLevel} style="font-weight: 600; font-size: 1.125rem; margin-bottom: var(--ctc-space-3); color: ${ctx.emphasis === 'hero-moment' ? 'white' : 'var(--ctc-text)'}">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
      <div style="color: ${ctx.emphasis === 'hero-moment' ? 'rgba(255,255,255,0.9)' : 'var(--ctc-text-secondary)'}; line-height: 1.7">${htmlContent}</div>
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
    const bgStyles = ctx.hasBackground
      ? 'padding: var(--ctc-space-8); border-radius: var(--ctc-radius-lg); background: var(--ctc-surface); border: 1px solid var(--ctc-border-subtle)'
      : '';

    const htmlContent = items.length > 0
      ? `<ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--ctc-space-4)">${items.map(item => `<li style="display: flex; align-items: flex-start; gap: var(--ctc-space-3); color: var(--ctc-text-secondary); line-height: 1.6"><span style="width: 8px; height: 8px; min-width: 8px; background: var(--ctc-primary); border-radius: 50%; margin-top: 8px"></span><span>${markdownToHtml(item)}</span></li>`).join('')}</ul>`
      : markdownToHtml(ctx.content);

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-bullet-list ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" style="${bgStyles}">
  ${ctx.heading ? `<h${ctx.headingLevel} id="${slugify(ctx.heading || '')}" style="font-family: var(--ctc-font-display); font-weight: var(--ctc-heading-weight); font-size: var(--ctc-text-xl); margin-bottom: var(--ctc-space-6); color: var(--ctc-text)">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  ${htmlContent}
</section>`,
    };
  },

  'numbered-list': (ctx) => {
    const items = extractListItems(ctx.content);
    const htmlContent = items.length > 0
      ? `<ol class="ctc-list list-decimal pl-6 space-y-2">${items.map(item => `<li class="ctc-li">${markdownToHtml(item)}</li>`).join('')}</ol>`
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

    // CRITICAL: Fallback to prose if no list items
    if (items.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-checklist ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" style="background: var(--ctc-surface); padding: var(--ctc-space-8); border-radius: var(--ctc-radius-xl); border: 1px solid var(--ctc-border-subtle)">
  ${ctx.heading ? `<h${ctx.headingLevel} style="font-family: var(--ctc-font-display); font-weight: var(--ctc-heading-weight); font-size: var(--ctc-text-xl); margin-bottom: var(--ctc-space-6); color: var(--ctc-text)">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--ctc-space-4)">
    ${items.map(item => `
    <li style="display: flex; align-items: flex-start; gap: var(--ctc-space-4)">
      <span style="width: 24px; height: 24px; min-width: 24px; border-radius: var(--ctc-radius-md); background: linear-gradient(135deg, var(--ctc-primary), var(--ctc-primary-light)); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; margin-top: 2px">✓</span>
      <span style="color: var(--ctc-text-secondary); line-height: 1.6">${markdownToHtml(item)}</span>
    </li>`).join('')}
  </ul>
</section>`,
    };
  },

  'icon-list': (ctx) => {
    const items = extractListItems(ctx.content);
    const icons = ['🔹', '🔸', '▸', '→', '•'];

    // CRITICAL: Fallback to prose if no list items
    if (items.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-icon-list ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-xl font-semibold mb-6">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <ul class="space-y-4">
    ${items.map((item, i) => `
    <li class="ctc-icon-list-item flex items-start gap-4">
      <span class="ctc-icon w-8 h-8 rounded-full bg-[var(--ctc-primary)] text-white flex items-center justify-center flex-shrink-0">${icons[i % icons.length]}</span>
      <span class="pt-1">${markdownToHtml(item)}</span>
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
      const htmlContent = markdownToHtml(ctx.content);
      return {
        html: `
<section id="${ctx.sectionId}" class="ctc-prose ctc-card-grid-fallback ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} id="${slugify(ctx.heading)}" class="ctc-section-heading" style="font-weight: var(--ctc-heading-weight); font-family: var(--ctc-font-display); font-size: var(--ctc-text-2xl); color: var(--ctc-text)">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="ctc-prose-content">
    ${htmlContent}
  </div>
</section>`,
      };
    }

    const emphasisStyle = emphasisStyles(ctx.emphasis);

    // Determine card variant based on emphasis
    const cardClass = ctx.emphasis === 'hero-moment' ? 'ctc-card--glass' : 'ctc-card--raised';

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-card-grid ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" ${emphasisStyle ? `style="${emphasisStyle}"` : ''}>
  ${ctx.heading ? `<h${ctx.headingLevel} style="font-family: var(--ctc-font-display); font-weight: var(--ctc-heading-weight); font-size: var(--ctc-text-2xl); text-align: center; margin-bottom: var(--ctc-space-10); color: ${ctx.emphasis === 'hero-moment' ? 'white' : 'var(--ctc-text)'}; position: relative; z-index: 1">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--ctc-space-6); position: relative; z-index: 1">
    ${items.map((item, i) => {
      const parts = item.split(/[:\-–]/).map(p => p.trim());
      const title = parts[0];
      const desc = parts[1] || '';
      const textColor = ctx.emphasis === 'hero-moment' ? 'white' : 'var(--ctc-text)';
      const descColor = ctx.emphasis === 'hero-moment' ? 'rgba(255,255,255,0.85)' : 'var(--ctc-text-secondary)';
      const glassBg = ctx.emphasis === 'hero-moment' ? 'background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2);' : '';
      return `
    <div class="ctc-card ${cardClass}" style="padding: var(--ctc-space-8); ${glassBg}">
      <div class="ctc-card-icon" aria-hidden="true">${icons[i % icons.length]}</div>
      <h3 style="font-weight: 600; font-size: var(--ctc-text-lg); margin-bottom: var(--ctc-space-3); color: ${textColor}; line-height: 1.3">${markdownToHtml(title)}</h3>
      ${desc ? `<p style="font-size: var(--ctc-text-sm); color: ${descColor}; line-height: 1.7">${markdownToHtml(desc)}</p>` : ''}
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

    const emphasisStyle = emphasisStyles(ctx.emphasis);

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-feature-list ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" ${emphasisStyle ? `style="${emphasisStyle}"` : ''}>
  ${ctx.heading ? `<h${ctx.headingLevel} style="font-family: var(--ctc-font-display); font-weight: var(--ctc-heading-weight); font-size: var(--ctc-text-xl); margin-bottom: var(--ctc-space-8); color: ${ctx.emphasis === 'hero-moment' ? 'white' : 'var(--ctc-text)'}">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <dl style="display: flex; flex-direction: column; gap: var(--ctc-space-4)">
    ${items.map((item, i) => {
      const parts = item.split(/[:\-–]/).map(p => p.trim());
      const bgColor = ctx.emphasis === 'hero-moment' ? 'rgba(255,255,255,0.1)' : 'var(--ctc-surface)';
      const borderColor = ctx.emphasis === 'hero-moment' ? 'rgba(255,255,255,0.2)' : 'var(--ctc-border-subtle)';
      return `
    <div style="display: flex; gap: var(--ctc-space-6); padding: var(--ctc-space-5) var(--ctc-space-6); border-radius: var(--ctc-radius-lg); background: ${bgColor}; border: 1px solid ${borderColor}; align-items: flex-start; transition: all 0.2s ease">
      <div style="width: 36px; height: 36px; min-width: 36px; border-radius: var(--ctc-radius-md); background: linear-gradient(135deg, var(--ctc-primary), var(--ctc-primary-light)); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.875rem">${i + 1}</div>
      <div style="flex: 1">
        <dt style="font-weight: 600; font-size: 1.0625rem; color: ${ctx.emphasis === 'hero-moment' ? 'white' : 'var(--ctc-text)'}; margin-bottom: var(--ctc-space-1)">${markdownToHtml(parts[0])}</dt>
        <dd style="color: ${ctx.emphasis === 'hero-moment' ? 'rgba(255,255,255,0.85)' : 'var(--ctc-text-secondary)'}; line-height: 1.6; font-size: 0.9375rem">${markdownToHtml(parts[1] || '')}</dd>
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
      ? `<div class="ctc-timeline-intro" style="max-width: 700px; margin: 0 auto var(--ctc-space-8) auto; color: var(--ctc-text-secondary); line-height: 1.8; font-size: 1.0625rem">${markdownToHtml(introProse)}</div>`
      : '';

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-timeline-vertical ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" itemscope itemtype="https://schema.org/HowTo">
  ${ctx.heading ? `<h${ctx.headingLevel} class="ctc-section-heading" style="font-family: var(--ctc-font-display); font-weight: var(--ctc-heading-weight); font-size: var(--ctc-text-2xl); text-align: center; margin-bottom: var(--ctc-space-6); color: var(--ctc-text)" itemprop="name">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  ${introHtml}
  <div class="ctc-timeline-track" style="position: relative; padding-left: var(--ctc-space-12); max-width: 700px; margin: 0 auto">
    <div class="ctc-timeline-line" style="position: absolute; left: 16px; top: 8px; bottom: 8px; width: 3px; background: linear-gradient(to bottom, var(--ctc-primary), var(--ctc-primary-light)); border-radius: 2px"></div>
    ${steps.map((step, i) => `
    <div class="ctc-timeline-step" style="${i === steps.length - 1 ? 'padding-bottom: 0' : ''}" itemscope itemprop="step" itemtype="https://schema.org/HowToStep">
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
      ? `<div class="ctc-timeline-intro" style="max-width: 700px; margin: 0 auto 2.5rem auto; text-align: center; color: var(--ctc-text-secondary); line-height: 1.8; font-size: 1.0625rem">${markdownToHtml(introProse)}</div>`
      : '';

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-timeline-zigzag ${emphasisClasses(ctx.emphasis)} ${spacingClasses('breathe')}" itemscope itemtype="https://schema.org/HowTo">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-3xl font-bold text-center mb-6" itemprop="name">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  ${introHtml}
  <div class="ctc-timeline-zigzag-track relative before:absolute before:left-1/2 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-[var(--ctc-primary)] before:to-[var(--ctc-primary-light)] before:-translate-x-1/2">
    ${steps.map((step, i) => {
      const isLeft = i % 2 === 0;
      return `
    <div class="ctc-timeline-zigzag-step relative flex mb-12 ${isLeft ? '' : 'flex-row-reverse'}" itemscope itemprop="step" itemtype="https://schema.org/HowToStep">
      <meta itemprop="position" content="${i + 1}">
      <div class="flex-1 ${isLeft ? 'pr-12 text-right' : 'pl-12 text-left'}">
        <div class="ctc-step-card inline-block max-w-md p-6 rounded-[var(--ctc-radius-lg)] bg-[var(--ctc-surface)] shadow-lg">
          <h3 class="ctc-step-title text-xl font-semibold mb-2" itemprop="name">${markdownToHtml(step.title)}</h3>
          <p class="ctc-step-desc text-[var(--ctc-text-secondary)]" itemprop="text">${markdownToHtml(step.description)}</p>
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
    const { introProse, steps } = extractSteps(ctx.content);
    if (steps.length === 0) {
      return componentRenderers['numbered-list']!(ctx);
    }

    // Render intro prose if present (provides semantic context like "5 phases")
    const introHtml = introProse
      ? `<div class="ctc-steps-intro" style="color: var(--ctc-text-secondary); line-height: 1.8; font-size: 1.0625rem; margin-bottom: var(--ctc-space-6)">${markdownToHtml(introProse)}</div>`
      : '';

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-steps-numbered ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" itemscope itemtype="https://schema.org/HowTo">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-xl font-semibold mb-4" itemprop="name">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  ${introHtml}
  <ol class="ctc-steps-list space-y-4">
    ${steps.map((step, i) => `
    <li class="ctc-step flex items-start gap-4 p-4 rounded-lg bg-[var(--ctc-surface)]" itemscope itemprop="step" itemtype="https://schema.org/HowToStep">
      <meta itemprop="position" content="${i + 1}">
      <span class="ctc-step-num w-8 h-8 rounded-full bg-[var(--ctc-primary)] text-white flex items-center justify-center font-bold flex-shrink-0">${i + 1}</span>
      <div>
        <h4 class="ctc-step-title font-semibold" itemprop="name">${markdownToHtml(step.title)}</h4>
        ${step.description ? `<p class="ctc-step-desc text-sm text-[var(--ctc-text-secondary)] mt-1" itemprop="text">${markdownToHtml(step.description)}</p>` : ''}
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
  <div style="text-align: center; margin-bottom: 2.5rem">
    <span style="display: inline-flex; align-items: center; gap: 0.5rem; background: linear-gradient(135deg, var(--ctc-primary), var(--ctc-primary-light)); color: white; padding: 0.5rem 1rem; border-radius: var(--ctc-radius-full); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem">
      <span>❓</span> FAQ
    </span>
    <h${ctx.headingLevel} style="font-family: var(--ctc-font-display); font-weight: var(--ctc-heading-weight); font-size: 1.75rem; color: var(--ctc-text); margin: 0">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>
  </div>` : ''}
  <div style="max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 0.75rem">
    ${faqs.map((faq, i) => `
    <div style="background: var(--ctc-surface); border-radius: var(--ctc-radius-xl); border: 1px solid var(--ctc-border-subtle); overflow: hidden; transition: all 0.2s ease" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <h3 style="margin: 0">
        <button type="button" aria-expanded="false" aria-controls="faq-answer-${ctx.sectionId}-${i}" class="ctc-faq-trigger" style="width: 100%; display: flex; justify-content: space-between; align-items: center; text-align: left; padding: 1.25rem 1.5rem; background: transparent; border: none; cursor: pointer; font-size: 1.0625rem; font-weight: 600; color: var(--ctc-text); transition: all 0.2s ease; gap: 1rem">
          <span style="display: flex; align-items: center; gap: 0.75rem">
            <span style="width: 28px; height: 28px; min-width: 28px; border-radius: var(--ctc-radius-md); background: linear-gradient(135deg, var(--ctc-surface), var(--ctc-background)); border: 1px solid var(--ctc-border); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; color: var(--ctc-text-muted)">${i + 1}</span>
            <span itemprop="name">${markdownToHtml(faq.question)}</span>
          </span>
          <span class="ctc-faq-icon" style="width: 28px; height: 28px; min-width: 28px; border-radius: 50%; background: linear-gradient(135deg, var(--ctc-primary), var(--ctc-primary-light)); color: white; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 300; transition: transform 0.2s ease" aria-hidden="true">+</span>
        </button>
      </h3>
      <div id="faq-answer-${ctx.sectionId}-${i}" class="ctc-faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer" hidden>
        <div style="padding: 0 1.5rem 1.5rem 4rem; color: var(--ctc-text-secondary); line-height: 1.7; font-size: 0.9375rem" itemprop="text">${markdownToHtml(faq.answer)}</div>
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
      <h3 class="ctc-faq-question font-semibold mb-3" itemprop="name">${markdownToHtml(faq.question)}</h3>
      <div class="ctc-faq-answer text-[var(--ctc-text-secondary)]" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
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
    const bgStyle = isHeroMoment
      ? 'background: linear-gradient(135deg, var(--ctc-primary) 0%, var(--ctc-primary-dark) 100%); color: white'
      : 'background: linear-gradient(135deg, var(--ctc-surface) 0%, color-mix(in srgb, var(--ctc-primary) 5%, var(--ctc-surface)) 100%); border: 1px solid var(--ctc-border)';

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-cta-banner" style="${bgStyle}; border-radius: var(--ctc-radius-2xl); padding: var(--ctc-space-12) var(--ctc-space-10); text-align: center; margin: var(--ctc-space-16) 0; position: relative; overflow: hidden; box-shadow: 0 20px 40px -12px rgba(0,0,0,0.15)">
  <div style="position: absolute; top: -100px; right: -100px; width: 300px; height: 300px; background: ${isHeroMoment ? 'rgba(255,255,255,0.1)' : 'var(--ctc-primary)'}; opacity: ${isHeroMoment ? '1' : '0.05'}; border-radius: 50%; pointer-events: none"></div>
  <div style="position: absolute; bottom: -80px; left: -80px; width: 200px; height: 200px; background: ${isHeroMoment ? 'rgba(255,255,255,0.08)' : 'var(--ctc-primary)'}; opacity: ${isHeroMoment ? '1' : '0.03'}; border-radius: 50%; pointer-events: none"></div>
  <div style="position: relative; z-index: 1">
    ${ctx.heading ? `<h2 style="font-family: var(--ctc-font-display); font-weight: 700; font-size: var(--ctc-text-3xl); margin-bottom: var(--ctc-space-4); color: ${isHeroMoment ? 'white' : 'var(--ctc-text)'}">${escapeHtml(ctx.heading)}</h2>` : ''}
    <div style="font-size: var(--ctc-text-lg); opacity: 0.9; margin-bottom: var(--ctc-space-8); max-width: 600px; margin-left: auto; margin-right: auto; line-height: 1.6; color: ${isHeroMoment ? 'rgba(255,255,255,0.9)' : 'var(--ctc-text-secondary)'}">
      ${markdownToHtml(ctx.content)}
    </div>
    <div style="display: flex; gap: var(--ctc-space-4); justify-content: center; flex-wrap: wrap">
      <a href="#contact" style="display: inline-flex; align-items: center; gap: var(--ctc-space-2); padding: var(--ctc-space-4) var(--ctc-space-10); border-radius: var(--ctc-radius-full); font-weight: 600; font-size: 1.0625rem; ${isHeroMoment ? 'background: white; color: var(--ctc-primary); box-shadow: 0 4px 16px -2px rgba(0,0,0,0.2)' : 'background: linear-gradient(135deg, var(--ctc-primary), var(--ctc-primary-light)); color: white; box-shadow: 0 4px 16px -2px color-mix(in srgb, var(--ctc-primary) 40%, transparent)'}; transition: all 0.2s ease; text-decoration: none">
        Neem Contact Op
        <span style="font-size: 1.25rem">→</span>
      </a>
    </div>
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
    const icons = ['💡', '✓', '🎯', '📌', '⭐', '🔑', '📍', '✨'];

    // If no list items found, fall back to prose
    if (items.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-key-takeaways" style="background: linear-gradient(135deg, var(--ctc-primary) 0%, var(--ctc-primary-dark) 100%); color: white; padding: 2.5rem 2rem; border-radius: var(--ctc-radius-2xl); margin: 3rem 0; position: relative; overflow: hidden; box-shadow: 0 25px 50px -12px color-mix(in srgb, var(--ctc-primary) 50%, transparent)">
  <div style="position: absolute; top: -80px; right: -80px; width: 300px; height: 300px; background: white; opacity: 0.08; border-radius: 50%; pointer-events: none"></div>
  <div style="position: absolute; bottom: -50px; left: 5%; width: 150px; height: 150px; background: white; opacity: 0.06; border-radius: 50%; pointer-events: none"></div>
  <div style="position: absolute; top: 40%; right: 10%; width: 80px; height: 80px; background: white; opacity: 0.04; border-radius: 50%; pointer-events: none"></div>

  <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; position: relative; z-index: 1">
    <span style="width: 48px; height: 48px; background: white; color: var(--ctc-primary); border-radius: var(--ctc-radius-xl); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.15)">💡</span>
    <h2 style="font-family: var(--ctc-font-display); font-size: 1.5rem; font-weight: 700; margin: 0">${escapeHtml(ctx.heading || 'Belangrijkste Punten')}</h2>
  </div>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; position: relative; z-index: 1">
    ${items.map((item, i) => `
    <div style="display: flex; align-items: flex-start; gap: 1rem; background: rgba(255, 255, 255, 0.12); backdrop-filter: blur(12px); padding: 1.25rem; border-radius: var(--ctc-radius-lg); border: 1px solid rgba(255, 255, 255, 0.18); transition: all 0.2s ease">
      <span style="width: 32px; height: 32px; min-width: 32px; border-radius: var(--ctc-radius-md); background: white; color: var(--ctc-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.875rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1)">${items.length <= 3 ? icons[1] : (i + 1)}</span>
      <span style="color: rgba(255, 255, 255, 0.95); line-height: 1.6; font-size: 0.9375rem">${markdownToHtml(item)}</span>
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
