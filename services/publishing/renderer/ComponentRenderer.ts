/**
 * ComponentRenderer
 *
 * Generates rich, agency-quality HTML for each component type.
 * Creates visually distinct output based on:
 * - Component type (hero, card, timeline, feature-grid, etc.)
 * - Emphasis level (hero, featured, standard, supporting, minimal)
 * - Layout parameters (columns, width, spacing, image position)
 *
 * This is what creates the "wow factor" - not generic prose but
 * purposefully designed visual components.
 */

import type {
  ComponentType,
  LayoutParameters,
  VisualEmphasis,
  EmphasisLevel,
  ColumnLayout,
  LayoutWidth,
  ImagePosition,
} from '../../layout-engine/types';
import { ContentStructureParser } from './ContentStructureParser';

// =============================================================================
// TYPES
// =============================================================================

export interface ComponentRenderInput {
  sectionId: string;
  heading: string;
  headingLevel: number;
  content: string;
  component: ComponentType;
  variant?: string;
  layout: LayoutParameters;
  emphasis: VisualEmphasis;
  cssClasses?: string[];
}

export interface ParsedContentBlock {
  type: 'paragraph' | 'list' | 'table' | 'quote' | 'image' | 'heading';
  content: string;
  items?: string[];
  rows?: string[][];
  headers?: string[];
  src?: string;
  alt?: string;
  level?: number;
}

// =============================================================================
// MAIN RENDERER
// =============================================================================

export class ComponentRenderer {
  /**
   * Render a section using the appropriate component type
   */
  static render(input: ComponentRenderInput): string {
    const {
      sectionId,
      heading,
      headingLevel,
      content,
      component,
      variant,
      layout,
      emphasis,
      cssClasses = [],
    } = input;

    // Build section wrapper classes
    const wrapperClasses = [
      'section',
      `section-${component}`,
      `emphasis-${emphasis.level}`,
      `layout-${layout.width}`,
      `columns-${layout.columns}`,
      `spacing-before-${layout.verticalSpacingBefore}`,
      `spacing-after-${layout.verticalSpacingAfter}`,
      ...cssClasses,
    ].filter(Boolean).join(' ');

    // Get inline styles for layout
    const wrapperStyles = this.getLayoutStyles(layout, emphasis);

    // Render heading with emphasis styling
    const headingHtml = this.renderHeading(heading, headingLevel, emphasis);

    // Render content based on component type
    const contentHtml = this.renderComponentContent(component, content, emphasis, layout, variant);

    return `
<section id="${sectionId}" class="${wrapperClasses}" style="${wrapperStyles}">
  <div class="section-container">
    ${headingHtml}
    <div class="section-content">
      ${contentHtml}
    </div>
  </div>
</section>`;
  }

  /**
   * Render heading with emphasis-appropriate styling
   */
  private static renderHeading(heading: string, level: number, emphasis: VisualEmphasis): string {
    if (!heading) return '';

    const tag = `h${level}`;
    const classes = [
      'section-heading',
      `heading-${emphasis.headingSize}`,
      emphasis.headingDecoration.type !== 'none' ? `heading-decorated heading-deco-${emphasis.headingDecoration.type}` : '',
    ].filter(Boolean).join(' ');

    // Add decoration for hero/featured emphasis
    let decoration = '';
    if (emphasis.level === 'hero' || (emphasis.level === 'featured' && emphasis.headingDecoration.type !== 'none')) {
      decoration = '<span class="heading-accent"></span>';
    }

    return `<${tag} class="${classes}">${decoration}${this.escapeHtml(heading)}</${tag}>`;
  }

  /**
   * Route to the appropriate component renderer
   * Now includes intelligent structure extraction from prose when needed
   */
  private static renderComponentContent(
    component: ComponentType,
    content: string,
    emphasis: VisualEmphasis,
    layout: LayoutParameters,
    variant?: string
  ): string {
    // For visual components, try to extract structure from prose content
    // This enables proper rendering even when content is just paragraphs
    const visualComponents = ['timeline', 'step-list', 'feature-grid', 'stat-highlight', 'checklist'];
    let processedContent = content;
    let structureExtracted = false;

    if (visualComponents.includes(component)) {
      // Check if content already has list structure
      const hasListStructure = content.includes('<ul>') || content.includes('<ol>') || content.includes('<li>');
      const hasMarkdownList = /^[\*\-\+]\s+/m.test(content) || /^\d+\.\s+/m.test(content);

      console.log(`[ComponentRenderer] Visual component "${component}" - checking content structure:`, {
        hasHtmlList: hasListStructure,
        hasMarkdownList,
        contentPreview: content.substring(0, 150).replace(/\n/g, ' '),
      });

      if (!hasListStructure && !hasMarkdownList) {
        // Try to extract structure from prose
        const extracted = ContentStructureParser.analyze(content, component);
        console.log(`[ComponentRenderer] ContentStructureParser result for "${component}":`, {
          type: extracted.type,
          itemCount: extracted.items.length,
          confidence: extracted.confidence,
          items: extracted.items.slice(0, 3).map(i => i.text?.substring(0, 50)),
        });

        if (extracted.confidence >= 0.4 && extracted.items.length >= 2) {
          // Lower threshold to allow more extraction - even 40% confidence is better than prose fallback
          processedContent = ContentStructureParser.toComponentHtml(extracted);
          structureExtracted = true;
          console.log(`[ComponentRenderer] ✓ Extracted ${extracted.items.length} items for ${component} (confidence: ${extracted.confidence})`);
        } else {
          console.warn(`[ComponentRenderer] ⚠ Could not extract structure for "${component}" - will fall back to prose.`);
          console.warn(`[ComponentRenderer] ⚠ To fix: add explicit list markers (1. 2. 3. or - bullet points) or use sequence words (First, Second, Then...)`);
        }
      } else {
        console.log(`[ComponentRenderer] ✓ Content already has list structure for "${component}"`);
      }
    }

    switch (component) {
      case 'hero':
        return this.renderHero(processedContent, emphasis, layout);
      case 'card':
        return this.renderCard(processedContent, emphasis);
      case 'feature-grid':
        return this.renderFeatureGrid(processedContent, emphasis, layout);
      case 'timeline':
        return this.renderTimeline(processedContent, emphasis);
      case 'step-list':
        return this.renderStepList(processedContent, emphasis);
      case 'accordion':
      case 'faq-accordion':
        return this.renderFaqAccordion(processedContent, emphasis);
      case 'comparison-table':
        return this.renderComparisonTable(processedContent, emphasis);
      case 'testimonial-card':
        return this.renderTestimonialCard(processedContent, emphasis);
      case 'key-takeaways':
        return this.renderKeyTakeaways(processedContent, emphasis);
      case 'cta-banner':
        return this.renderCtaBanner(processedContent, emphasis);
      case 'stat-highlight':
        return this.renderStatHighlight(processedContent, emphasis);
      case 'checklist':
        return this.renderChecklist(processedContent, emphasis);
      case 'blockquote':
        return this.renderBlockquote(processedContent, emphasis);
      case 'definition-box':
        return this.renderDefinitionBox(processedContent, emphasis);
      case 'alert-box':
        return this.renderAlertBox(processedContent, emphasis);
      case 'info-box':
        return this.renderInfoBox(processedContent, emphasis);
      case 'lead-paragraph':
        return this.renderLeadParagraph(processedContent, emphasis);
      case 'prose':
      default:
        return this.renderProse(processedContent, emphasis, layout);
    }
  }

  // ===========================================================================
  // COMPONENT RENDERERS - Each creates visually distinct, agency-quality HTML
  // ===========================================================================

  /**
   * Hero component - Maximum visual impact with gradient backgrounds and large typography
   */
  private static renderHero(content: string, emphasis: VisualEmphasis, layout: LayoutParameters): string {
    const blocks = this.parseContent(content);
    const firstParagraph = blocks.find(b => b.type === 'paragraph')?.content || '';
    const remainingBlocks = blocks.filter(b => b !== blocks.find(bb => bb.type === 'paragraph'));

    return `
<div class="hero-content">
  <div class="hero-lead">
    <p class="hero-text">${this.processInlineMarkdown(firstParagraph)}</p>
  </div>
  ${remainingBlocks.length > 0 ? `
  <div class="hero-details">
    ${remainingBlocks.map(block => this.renderBlock(block)).join('\n')}
  </div>` : ''}
</div>`;
  }

  /**
   * Card component - Elevated container with shadow and rounded corners
   */
  private static renderCard(content: string, emphasis: VisualEmphasis): string {
    const blocks = this.parseContent(content);
    const elevation = emphasis.elevation || 1;

    return `
<div class="card card-elevation-${elevation}">
  <div class="card-body">
    ${blocks.map(block => this.renderBlock(block)).join('\n')}
  </div>
</div>`;
  }

  /**
   * Feature Grid - Multi-column grid of feature cards with icons
   * ENHANCED: Creates visual structure from paragraphs when no list exists
   */
  private static renderFeatureGrid(content: string, emphasis: VisualEmphasis, layout: LayoutParameters): string {
    const blocks = this.parseContent(content);
    const listBlock = blocks.find(b => b.type === 'list');

    // If no list, try to create feature cards from paragraphs
    // BUT only if paragraphs are SHORT enough to work as cards
    if (!listBlock?.items) {
      const paragraphs = blocks.filter(b => b.type === 'paragraph' && b.content && b.content.length > 30);
      // Only create feature cards if ALL paragraphs are reasonably short (< 200 chars)
      // Long paragraphs get truncated uglily in card format - use prose instead
      const allShortEnough = paragraphs.length >= 2 && paragraphs.every(p => (p.content || '').length < 200);

      if (allShortEnough) {
        console.log(`[ComponentRenderer] renderFeatureGrid: Creating grid from ${paragraphs.length} short paragraphs`);
        const columnCount = layout.columns === '3-column' ? 3 : layout.columns === '2-column' ? 2 : 2;
        const icons = ['✓', '★', '◆', '▸', '●', '◎', '⬢', '◈'];

        const features = paragraphs.slice(0, 6).map((p, idx) => {
          const icon = icons[idx % icons.length];
          // Extract first sentence as title, rest as description
          const text = p.content || '';
          const firstSentenceEnd = text.search(/[.!?]\s+[A-Z]/) + 1 || text.indexOf('.') + 1 || 100;
          const title = text.substring(0, Math.min(firstSentenceEnd, 100)).trim();
          const desc = text.substring(firstSentenceEnd).trim();

          return `
    <div class="feature-card">
      <div class="feature-icon">${icon}</div>
      <div class="feature-content">
        <div class="feature-title">${this.processInlineMarkdown(title)}</div>
        ${desc ? `<div class="feature-desc">${this.processInlineMarkdown(desc.substring(0, 150))}${desc.length > 150 ? '...' : ''}</div>` : ''}
      </div>
    </div>`;
        }).join('\n');

        return `
<div class="feature-grid columns-${columnCount}">
  ${features}
</div>`;
      }

      console.warn('[ComponentRenderer] renderFeatureGrid: Content too long for cards or not enough items - falling back to card');
      return this.renderCard(content, emphasis);
    }
    console.log(`[ComponentRenderer] renderFeatureGrid: Found ${listBlock.items.length} items for feature grid`);

    // Feature grids should always have at least 2 columns for visual impact
    const columnCount = layout.columns === '3-column' ? 3 : 2;
    const icons = ['✓', '★', '◆', '▸', '●', '◎', '⬢', '◈'];

    const features = listBlock.items.map((item, idx) => {
      const icon = icons[idx % icons.length];
      return `
    <div class="feature-card">
      <div class="feature-icon">${icon}</div>
      <div class="feature-content">${this.processInlineMarkdown(item)}</div>
    </div>`;
    }).join('\n');

    // Add any non-list content before the grid
    const proseBlocks = blocks.filter(b => b.type !== 'list');
    const proseHtml = proseBlocks.map(b => this.renderBlock(b)).join('\n');

    return `
${proseHtml}
<div class="feature-grid columns-${columnCount}">
  ${features}
</div>`;
  }

  /**
   * Timeline - Vertical timeline with connected nodes
   * ENHANCED: Creates timeline from paragraphs when no list exists
   */
  private static renderTimeline(content: string, emphasis: VisualEmphasis): string {
    const blocks = this.parseContent(content);
    const listBlock = blocks.find(b => b.type === 'list');

    // If no list, try to create timeline from paragraphs or sentences
    if (!listBlock?.items) {
      const paragraphs = blocks.filter(b => b.type === 'paragraph' && b.content && b.content.length > 20);

      if (paragraphs.length >= 2) {
        console.log(`[ComponentRenderer] renderTimeline: Creating timeline from ${paragraphs.length} paragraphs`);

        const timelineItems = paragraphs.slice(0, 8).map((p, idx) => {
          const text = p.content || '';
          return `
    <div class="timeline-item">
      <div class="timeline-marker">
        <span class="timeline-number">${idx + 1}</span>
        <span class="timeline-line"></span>
      </div>
      <div class="timeline-content">
        <div class="timeline-body">${this.processInlineMarkdown(text)}</div>
      </div>
    </div>`;
        }).join('\n');

        return `
<div class="timeline">
  ${timelineItems}
</div>`;
      }

      console.warn('[ComponentRenderer] renderTimeline: No list items found - trying step-list fallback');
      return this.renderStepList(content, emphasis);
    }
    console.log(`[ComponentRenderer] renderTimeline: Found ${listBlock.items.length} items for timeline`);


    const timelineItems = listBlock.items.map((item, idx) => `
    <div class="timeline-item">
      <div class="timeline-marker">
        <span class="timeline-number">${idx + 1}</span>
        <span class="timeline-line"></span>
      </div>
      <div class="timeline-content">
        <div class="timeline-body">${this.processInlineMarkdown(item)}</div>
      </div>
    </div>`).join('\n');

    return `
<div class="timeline">
  ${timelineItems}
</div>`;
  }

  /**
   * Step List - Numbered steps with prominent step indicators
   */
  private static renderStepList(content: string, emphasis: VisualEmphasis): string {
    const blocks = this.parseContent(content);
    const listBlock = blocks.find(b => b.type === 'list');

    if (!listBlock?.items) {
      // Fall back to parsing numbered patterns from prose
      const steps = this.extractStepsFromProse(content);
      if (steps.length === 0) {
        // Create steps from paragraphs (like renderTimeline does)
        const paragraphs = blocks.filter(b => b.type === 'paragraph' && b.content && b.content.length > 20);
        if (paragraphs.length >= 2) {
          console.log(`[ComponentRenderer] renderStepList: Creating steps from ${paragraphs.length} paragraphs`);
          return this.renderStepsHtml(
            paragraphs.slice(0, 8).map(p => p.content || ''),
            emphasis
          );
        }
        // Final fallback: split content into sentences
        const sentences = content.replace(/<[^>]+>/g, '').split(/(?<=[.!?])\s+/).filter(s => s.length > 15);
        if (sentences.length >= 2) {
          console.log(`[ComponentRenderer] renderStepList: Creating steps from ${sentences.length} sentences`);
          return this.renderStepsHtml(sentences.slice(0, 8), emphasis);
        }
        console.warn('[ComponentRenderer] renderStepList: No structured content found - falling back to prose');
        return this.renderProse(content, { ...emphasis, level: 'standard' }, { columns: '1-column' } as any);
      }
      console.log(`[ComponentRenderer] renderStepList: Extracted ${steps.length} steps from prose`);
      return this.renderStepsHtml(steps, emphasis);
    }

    console.log(`[ComponentRenderer] renderStepList: Found ${listBlock.items.length} items for step list`);
    return this.renderStepsHtml(listBlock.items, emphasis);
  }

  private static renderStepsHtml(steps: string[], emphasis: VisualEmphasis): string {
    const stepClass = emphasis.level === 'hero' ? 'step-large' :
                      emphasis.level === 'featured' ? 'step-medium' : 'step-standard';

    const stepsHtml = steps.map((step, idx) => `
    <div class="step-item ${stepClass}">
      <div class="step-indicator">
        <span class="step-number">${idx + 1}</span>
      </div>
      <div class="step-content">
        ${this.processInlineMarkdown(step)}
      </div>
    </div>`).join('\n');

    return `
<div class="step-list">
  ${stepsHtml}
</div>`;
  }

  /**
   * FAQ Accordion - Expandable question/answer pairs
   */
  private static renderFaqAccordion(content: string, emphasis: VisualEmphasis): string {
    const faqs = this.extractFaqPairs(content);

    if (faqs.length === 0) {
      return this.renderProse(content, emphasis, { columns: '1-column' } as any);
    }

    const faqItems = faqs.map((faq, idx) => `
    <div class="faq-item" data-faq-index="${idx}">
      <div class="faq-question">
        <span class="faq-icon">Q</span>
        <span class="faq-question-text">${this.escapeHtml(faq.question)}</span>
        <span class="faq-toggle">+</span>
      </div>
      <div class="faq-answer">
        <span class="faq-answer-icon">A</span>
        <div class="faq-answer-text">${this.processInlineMarkdown(faq.answer)}</div>
      </div>
    </div>`).join('\n');

    return `
<div class="faq-accordion">
  ${faqItems}
</div>`;
  }

  /**
   * Comparison Table - Styled table with header row and alternating rows
   */
  private static renderComparisonTable(content: string, emphasis: VisualEmphasis): string {
    const blocks = this.parseContent(content);
    const tableBlock = blocks.find(b => b.type === 'table');

    if (!tableBlock?.headers || !tableBlock?.rows) {
      return this.renderProse(content, emphasis, { columns: '1-column' } as any);
    }

    const headerCells = tableBlock.headers.map(h =>
      `<th>${this.processInlineMarkdown(h)}</th>`
    ).join('');

    const bodyRows = tableBlock.rows.map((row, idx) => {
      const cells = row.map(cell => `<td>${this.processInlineMarkdown(cell)}</td>`).join('');
      return `<tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">${cells}</tr>`;
    }).join('\n');

    // Render any prose before/after the table
    const proseBlocks = blocks.filter(b => b.type !== 'table');
    const proseHtml = proseBlocks.map(b => this.renderBlock(b)).join('\n');

    return `
${proseHtml}
<div class="comparison-table-wrapper">
  <table class="comparison-table">
    <thead>
      <tr>${headerCells}</tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>
</div>`;
  }

  /**
   * Testimonial Card - Quote with attribution and optional avatar
   */
  private static renderTestimonialCard(content: string, emphasis: VisualEmphasis): string {
    const blocks = this.parseContent(content);
    const quoteBlock = blocks.find(b => b.type === 'quote');
    const text = quoteBlock?.content || blocks.find(b => b.type === 'paragraph')?.content || content;

    // Try to extract attribution (often at the end after "—" or "-")
    const attributionMatch = text.match(/[—–-]\s*(.+)$/);
    const quoteText = attributionMatch ? text.replace(attributionMatch[0], '').trim() : text;
    const attribution = attributionMatch ? attributionMatch[1].trim() : '';

    return `
<div class="testimonial-card">
  <div class="testimonial-quote-mark">"</div>
  <blockquote class="testimonial-text">
    ${this.processInlineMarkdown(quoteText)}
  </blockquote>
  ${attribution ? `
  <div class="testimonial-attribution">
    <span class="testimonial-author">${this.escapeHtml(attribution)}</span>
  </div>` : ''}
</div>`;
  }

  /**
   * Key Takeaways - Highlighted summary box with bullet points
   */
  private static renderKeyTakeaways(content: string, emphasis: VisualEmphasis): string {
    const blocks = this.parseContent(content);
    const listBlock = blocks.find(b => b.type === 'list');

    const takeaways = listBlock?.items || [];
    const proseBlocks = blocks.filter(b => b.type !== 'list');

    const takeawayItems = takeaways.map(item => `
      <li class="takeaway-item">
        <span class="takeaway-icon">💡</span>
        <span class="takeaway-text">${this.processInlineMarkdown(item)}</span>
      </li>`).join('\n');

    return `
<aside class="key-takeaways">
  <div class="takeaways-header">
    <span class="takeaways-icon">📌</span>
    <span class="takeaways-title">Key Takeaways</span>
  </div>
  ${proseBlocks.length > 0 ? `
  <div class="takeaways-intro">
    ${proseBlocks.map(b => this.renderBlock(b)).join('\n')}
  </div>` : ''}
  ${takeaways.length > 0 ? `
  <ul class="takeaways-list">
    ${takeawayItems}
  </ul>` : ''}
</aside>`;
  }

  /**
   * CTA Banner - Call-to-action with primary and secondary buttons
   */
  private static renderCtaBanner(content: string, emphasis: VisualEmphasis): string {
    const blocks = this.parseContent(content);
    const text = blocks.find(b => b.type === 'paragraph')?.content || content;

    return `
<aside class="cta-banner cta-${emphasis.level}">
  <div class="cta-content">
    <p class="cta-text">${this.processInlineMarkdown(text)}</p>
  </div>
  <div class="cta-actions">
    <a href="#contact" class="cta-button cta-primary">Get Started</a>
    <a href="#learn-more" class="cta-button cta-secondary">Learn More</a>
  </div>
</aside>`;
  }

  /**
   * Stat Highlight - Large numbers/statistics with labels
   */
  private static renderStatHighlight(content: string, emphasis: VisualEmphasis): string {
    const blocks = this.parseContent(content);
    const listBlock = blocks.find(b => b.type === 'list');

    if (!listBlock?.items) {
      console.warn('[ComponentRenderer] renderStatHighlight: No list items found - falling back to card');
      return this.renderCard(content, emphasis);
    }
    console.log(`[ComponentRenderer] renderStatHighlight: Found ${listBlock.items.length} potential stat items`);


    // Parse stats: expect format like "95% - Customer Satisfaction" or "95%: Customer Satisfaction"
    const stats = listBlock.items.map(item => {
      const match = item.match(/^([0-9.,+%€$£]+)\s*[-:]\s*(.+)$/);
      if (match) {
        return { value: match[1], label: match[2] };
      }
      return { value: '', label: item };
    }).filter(s => s.value);

    if (stats.length === 0) {
      return this.renderCard(content, emphasis);
    }

    const statsHtml = stats.map(stat => `
    <div class="stat-item">
      <span class="stat-value">${this.escapeHtml(stat.value)}</span>
      <span class="stat-label">${this.processInlineMarkdown(stat.label)}</span>
    </div>`).join('\n');

    return `
<div class="stat-grid">
  ${statsHtml}
</div>`;
  }

  /**
   * Checklist - Interactive-looking checklist with check icons
   */
  private static renderChecklist(content: string, emphasis: VisualEmphasis): string {
    const blocks = this.parseContent(content);
    const listBlock = blocks.find(b => b.type === 'list');

    if (!listBlock?.items) {
      console.warn('[ComponentRenderer] renderChecklist: No list items found - falling back to card');
      return this.renderCard(content, emphasis);
    }
    console.log(`[ComponentRenderer] renderChecklist: Found ${listBlock.items.length} items for checklist`);


    const checklistItems = listBlock.items.map(item => `
    <li class="checklist-item">
      <span class="checklist-check">✓</span>
      <span class="checklist-text">${this.processInlineMarkdown(item)}</span>
    </li>`).join('\n');

    return `
<ul class="checklist">
  ${checklistItems}
</ul>`;
  }

  /**
   * Blockquote - Styled quote with accent border
   */
  private static renderBlockquote(content: string, emphasis: VisualEmphasis): string {
    const blocks = this.parseContent(content);
    const quoteBlock = blocks.find(b => b.type === 'quote');
    const text = quoteBlock?.content || blocks.find(b => b.type === 'paragraph')?.content || content;

    return `
<blockquote class="blockquote blockquote-${emphasis.level}">
  <p>${this.processInlineMarkdown(text)}</p>
</blockquote>`;
  }

  /**
   * Definition Box - Term definition with icon and clear structure
   */
  private static renderDefinitionBox(content: string, emphasis: VisualEmphasis): string {
    const blocks = this.parseContent(content);

    return `
<aside class="definition-box">
  <div class="definition-icon">📖</div>
  <div class="definition-content">
    ${blocks.map(block => this.renderBlock(block)).join('\n')}
  </div>
</aside>`;
  }

  /**
   * Alert Box - Warning/risk/important note with icon and colored border
   */
  private static renderAlertBox(content: string, emphasis: VisualEmphasis): string {
    const blocks = this.parseContent(content);
    const text = blocks.map(b => this.renderBlock(b)).join('\n');

    // Detect severity from content
    const lower = content.toLowerCase();
    const severity = lower.includes('warning') || lower.includes('waarschuwing') || lower.includes('risico') || lower.includes('risk')
      ? 'warning'
      : lower.includes('tip') || lower.includes('info')
      ? 'info'
      : 'warning';

    const icons: Record<string, string> = { warning: '\u26A0\uFE0F', info: '\u2139\uFE0F', success: '\u2705' };

    return `
<aside class="alert-box alert-box--${severity}">
  <div class="alert-box-icon">${icons[severity]}</div>
  <div class="alert-box-content">
    ${text}
  </div>
</aside>`;
  }

  /**
   * Info Box - Contextual information, tips, definitions
   */
  private static renderInfoBox(content: string, emphasis: VisualEmphasis): string {
    const blocks = this.parseContent(content);

    return `
<aside class="info-box">
  <div class="info-box-content">
    ${blocks.map(b => this.renderBlock(b)).join('\n')}
  </div>
</aside>`;
  }

  /**
   * Lead Paragraph - First paragraph with visual accent (left border)
   */
  private static renderLeadParagraph(content: string, emphasis: VisualEmphasis): string {
    const blocks = this.parseContent(content);
    const firstParagraphBlock = blocks.find(b => b.type === 'paragraph');
    const firstParagraph = firstParagraphBlock?.content || content;
    const remaining = blocks.filter(b => b !== firstParagraphBlock);

    return `
<div class="lead-paragraph">
  <p class="lead-text">${this.processInlineMarkdown(firstParagraph)}</p>
</div>
${remaining.length > 0 ? `<div class="prose">${remaining.map(b => this.renderBlock(b)).join('\n')}</div>` : ''}`;
  }

  /**
   * Prose - Standard paragraphs with proper typography
   * This is the fallback for content that doesn't match other components
   */
  private static renderProse(content: string, emphasis: VisualEmphasis, layout: LayoutParameters): string {
    const blocks = this.parseContent(content);

    // Apply column layout if specified
    const useColumns = layout.columns !== '1-column' && blocks.length > 3;
    const columnClass = useColumns ? `prose-columns-${layout.columns}` : '';

    return `
<div class="prose ${columnClass}">
  ${blocks.map(block => this.renderBlock(block)).join('\n')}
</div>`;
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Get CSS inline styles for layout parameters
   */
  private static getLayoutStyles(layout: LayoutParameters, emphasis: VisualEmphasis): string {
    const styles: string[] = [];

    // Max width based on layout width
    const widthMap: Record<LayoutWidth, string> = {
      'narrow': '680px',
      'medium': '860px',
      'wide': '1100px',
      'full': '100%',
    };
    styles.push(`--section-max-width: ${widthMap[layout.width]}`);

    // Padding multiplier from emphasis
    styles.push(`--padding-multiplier: ${emphasis.paddingMultiplier}`);

    // Text alignment
    styles.push(`text-align: ${layout.alignText}`);

    return styles.join('; ');
  }

  /**
   * Parse content into structured blocks
   */
  private static parseContent(content: string): ParsedContentBlock[] {
    const blocks: ParsedContentBlock[] = [];

    // First, extract HTML lists before splitting on double newlines
    // Content generation produces HTML lists (<ul>/<ol>) not markdown lists
    let remaining = content;
    const htmlListRegex = /<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    const segments: Array<{ type: 'html-list' | 'text'; content: string; tag?: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = htmlListRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: remaining.substring(lastIndex, match.index) });
      }
      segments.push({ type: 'html-list', content: match[2], tag: match[1] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < remaining.length) {
      segments.push({ type: 'text', content: remaining.substring(lastIndex) });
    }

    for (const segment of segments) {
      if (segment.type === 'html-list') {
        // Extract items from HTML list
        const itemRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
        const items: string[] = [];
        let itemMatch: RegExpExecArray | null;
        while ((itemMatch = itemRegex.exec(segment.content)) !== null) {
          const text = itemMatch[1].trim();
          if (text) items.push(text);
        }
        if (items.length > 0) {
          blocks.push({ type: 'list', content: segment.content, items });
        }
        continue;
      }

      // Process text segments with the original markdown-based parsing
      const rawBlocks = segment.content.split(/\n\n+/).filter(b => b.trim());

      for (const raw of rawBlocks) {
        const trimmed = raw.trim();
        if (!trimmed) continue;

        // Heading
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/m);
        if (headingMatch) {
          blocks.push({ type: 'heading', content: headingMatch[2], level: headingMatch[1].length });
          continue;
        }

        // Table
        if (trimmed.includes('|') && trimmed.split('\n').length > 1) {
          const tableData = this.parseMarkdownTable(trimmed);
          if (tableData) {
            blocks.push({ type: 'table', content: trimmed, headers: tableData.headers, rows: tableData.rows });
            continue;
          }
        }

        // Markdown list
        if (/^[\*\-\+]\s+/m.test(trimmed) || /^\d+\.\s+/m.test(trimmed)) {
          const items = trimmed
            .split('\n')
            .filter(line => /^[\*\-\+\d\.]\s*/.test(line.trim()))
            .map(line => line.replace(/^[\*\-\+]\s+/, '').replace(/^\d+\.\s+/, '').trim());
          if (items.length > 0) {
            blocks.push({ type: 'list', content: trimmed, items });
            continue;
          }
        }

        // Quote
        if (trimmed.startsWith('>')) {
          blocks.push({ type: 'quote', content: trimmed.replace(/^>\s*/gm, '') });
          continue;
        }

        // Image
        const imgMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (imgMatch) {
          blocks.push({ type: 'image', content: trimmed, alt: imgMatch[1], src: imgMatch[2] });
          continue;
        }

        // HTML paragraph tags - extract text content
        if (trimmed.startsWith('<p>') || trimmed.startsWith('<p ')) {
          const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
          let pMatch: RegExpExecArray | null;
          let foundParagraphs = false;
          while ((pMatch = pRegex.exec(trimmed)) !== null) {
            const text = pMatch[1].trim();
            if (text) {
              blocks.push({ type: 'paragraph', content: text });
              foundParagraphs = true;
            }
          }
          if (foundParagraphs) continue;
        }

        // Default: paragraph
        blocks.push({ type: 'paragraph', content: trimmed });
      }
    }

    return blocks;
  }

  /**
   * Parse markdown table
   */
  private static parseMarkdownTable(content: string): { headers: string[]; rows: string[][] } | null {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return null;

    const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
    const dataLines = lines.slice(1).filter(l => !l.includes('---'));
    const rows = dataLines.map(line =>
      line.split('|').map(cell => cell.trim()).filter(c => c)
    );

    return { headers, rows };
  }

  /**
   * Extract FAQ question/answer pairs from content
   */
  private static extractFaqPairs(content: string): { question: string; answer: string }[] {
    const faqs: { question: string; answer: string }[] = [];
    const blocks = this.parseContent(content);

    let currentQuestion = '';
    let currentAnswer = '';

    for (const block of blocks) {
      if (block.type === 'heading' && block.content) {
        if (currentQuestion && currentAnswer) {
          faqs.push({ question: currentQuestion, answer: currentAnswer });
        }
        currentQuestion = block.content;
        currentAnswer = '';
      } else if (block.type === 'paragraph' && block.content) {
        if (block.content.endsWith('?') && !currentAnswer) {
          if (currentQuestion && currentAnswer) {
            faqs.push({ question: currentQuestion, answer: currentAnswer });
          }
          currentQuestion = block.content;
          currentAnswer = '';
        } else {
          currentAnswer += (currentAnswer ? ' ' : '') + block.content;
        }
      } else {
        currentAnswer += (currentAnswer ? ' ' : '') + this.renderBlock(block);
      }
    }

    if (currentQuestion && currentAnswer) {
      faqs.push({ question: currentQuestion, answer: currentAnswer });
    }

    return faqs;
  }

  /**
   * Extract steps from prose (looking for numbered patterns or splitting sentences)
   * ENHANCED: Falls back to splitting paragraphs into sentences for visual rendering
   */
  private static extractStepsFromProse(content: string): string[] {
    const steps: string[] = [];

    // First try numbered patterns
    const lines = content.split('\n');
    for (const line of lines) {
      const stepMatch = line.match(/^\s*(\d+)[.)]\s+(.+)$/);
      if (stepMatch) {
        steps.push(stepMatch[2]);
      }
    }

    if (steps.length >= 2) {
      return steps;
    }

    // Try to find sentences with sequence indicators
    const text = this.stripHtml(content);
    const sequenceWords = [
      'eerst', 'ten eerste', 'vervolgens', 'daarna', 'ten tweede', 'ten derde', 'tot slot',
      'first', 'second', 'third', 'then', 'next', 'finally', 'lastly', 'additionally',
    ];

    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20);
    const sequenceSteps: string[] = [];

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (sequenceWords.some(word => lower.startsWith(word) || lower.includes(`, ${word}`))) {
        sequenceSteps.push(sentence.trim());
      }
    }

    if (sequenceSteps.length >= 2) {
      return sequenceSteps;
    }

    // Last resort: if we have 2-6 sentences, use them as steps
    if (sentences.length >= 2 && sentences.length <= 6) {
      console.log(`[ComponentRenderer] extractStepsFromProse: Using ${sentences.length} sentences as steps`);
      return sentences.map(s => s.trim()).slice(0, 6);
    }

    // If we have one big paragraph with multiple sentences, split it
    if (sentences.length > 6) {
      // Take every other sentence to create a reasonable number of steps
      console.log(`[ComponentRenderer] extractStepsFromProse: Selecting ${Math.min(5, Math.ceil(sentences.length / 2))} sentences from ${sentences.length}`);
      return sentences.filter((_, i) => i % 2 === 0).slice(0, 5).map(s => s.trim());
    }

    return steps;
  }

  /**
   * Strip HTML tags from content
   */
  private static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }

  /**
   * Render a parsed block to HTML
   */
  private static renderBlock(block: ParsedContentBlock): string {
    switch (block.type) {
      case 'heading':
        return `<h${block.level || 3}>${this.processInlineMarkdown(block.content)}</h${block.level || 3}>`;
      case 'paragraph':
        return `<p>${this.processInlineMarkdown(block.content)}</p>`;
      case 'list':
        const items = (block.items || []).map(item => `<li>${this.processInlineMarkdown(item)}</li>`).join('\n');
        return `<ul>${items}</ul>`;
      case 'quote':
        return `<blockquote><p>${this.processInlineMarkdown(block.content)}</p></blockquote>`;
      case 'image':
        return `<figure><img src="${block.src}" alt="${this.escapeHtml(block.alt || '')}" loading="lazy"></figure>`;
      case 'table':
        if (block.headers && block.rows) {
          const headerCells = block.headers.map(h => `<th>${this.processInlineMarkdown(h)}</th>`).join('');
          const bodyRows = block.rows.map(row => {
            const cells = row.map(c => `<td>${this.processInlineMarkdown(c)}</td>`).join('');
            return `<tr>${cells}</tr>`;
          }).join('\n');
          return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
        }
        return `<p>${this.processInlineMarkdown(block.content)}</p>`;
      default:
        return `<p>${this.processInlineMarkdown(block.content)}</p>`;
    }
  }

  /**
   * Process inline markdown (bold, italic, links)
   */
  private static processInlineMarkdown(text: string): string {
    let result = text;
    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    result = result.replace(/_([^_]+)_/g, '<em>$1</em>');
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return result;
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export default ComponentRenderer;
