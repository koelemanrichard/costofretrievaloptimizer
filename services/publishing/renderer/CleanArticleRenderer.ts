/**
 * CleanArticleRenderer
 *
 * Generates design-agency quality HTML output WITHOUT templates.
 *
 * KEY PRINCIPLES:
 * - NO template classes (no ctc-*, no preset components)
 * - HTML structure is derived from CONTENT SEMANTICS + Layout Engine decisions
 * - CSS uses ACTUAL brand values (hex colors, font names, pixels)
 * - Each brand produces UNIQUE output
 * - Layout Engine decisions (component, variant, emphasis) affect rendered output
 * - Standalone HTML that works without external dependencies
 */

import type { DesignDNA } from '../../../types/designDna';
import type {
  BlueprintSection,
  ContentType,
  EmphasisLevel,
  LayoutBlueprint,
  ComponentType,
  LayoutParameters,
  VisualEmphasis,
} from '../../layout-engine/types';
import { ComponentRenderer } from './ComponentRenderer';
import { generateComponentStyles } from './ComponentStyles';

// ============================================================================
// TYPES
// ============================================================================

export interface ArticleSection {
  id: string;
  heading?: string;
  headingLevel?: number;
  content: string;
}

export interface ArticleInput {
  title: string;
  sections: ArticleSection[];
}

export interface CleanRenderOutput {
  html: string;
  css: string;
  fullDocument: string; // Complete standalone HTML document
  /** Pipeline telemetry for debugging and PipelineInspector */
  pipelineTelemetry?: import('../../../types/publishing').PipelineTelemetry;
}

/**
 * Layout blueprint input for connecting Layout Engine decisions to rendering
 */
export interface LayoutBlueprintInput {
  sections: BlueprintSection[];
}

interface ParsedContent {
  type: 'paragraph' | 'heading' | 'list' | 'table' | 'image' | 'blockquote';
  level?: number; // for headings
  items?: string[]; // for lists
  rows?: string[][]; // for tables
  headers?: string[]; // for tables
  src?: string; // for images
  alt?: string; // for images
  text?: string; // for paragraph/blockquote
  raw: string;
}

// ============================================================================
// MAIN RENDERER
// ============================================================================

export class CleanArticleRenderer {
  private designDna: DesignDNA;
  private brandName: string;
  private layoutBlueprint?: LayoutBlueprintInput;
  /**
   * THE KEY FIX: AI-generated CSS unique to this brand
   * When provided, this CSS is used directly instead of generating from DesignDNA
   * This is what makes output "design-agency quality" - using the AI's brand-specific CSS
   */
  private compiledCss?: string;
  /** Track which content types are actually used for CSS generation */
  private usedContentTypes: Set<ContentType> = new Set();
  private usedEmphasisLevels: Set<EmphasisLevel> = new Set();
  /** Pipeline telemetry for debugging */
  private sectionTelemetry: Array<{
    heading: string;
    assignedComponent: string;
    emphasis: string;
    width: string;
    renderedAs: string;
    status: 'ok' | 'fallback' | 'error';
    fallbackReason?: string;
  }> = [];
  private pipelineWarnings: string[] = [];

  constructor(
    designDna: DesignDNA,
    brandName: string = 'Brand',
    layoutBlueprint?: LayoutBlueprintInput,
    compiledCss?: string
  ) {
    this.designDna = designDna;
    this.brandName = brandName;
    this.layoutBlueprint = layoutBlueprint;
    this.compiledCss = compiledCss;
  }

  /**
   * Render article content to clean, professional HTML
   * When layoutBlueprint is provided, uses Layout Engine decisions for:
   * - Content type → semantic HTML structure
   * - Emphasis level → visual styling
   * - Component selection → CSS classes
   */
  render(article: ArticleInput): CleanRenderOutput {
    // Reset tracking for this render
    this.usedContentTypes.clear();
    this.usedEmphasisLevels.clear();
    this.sectionTelemetry = [];
    this.pipelineWarnings = [];

    // Generate HTML first (this populates usedContentTypes and usedEmphasisLevels)
    const html = this.generateHTML(article);

    // Generate CSS with only the needed content type styles
    const css = this.generateCSS();

    const fullDocument = this.wrapInDocument(html, css, article.title);

    // Build pipeline telemetry
    const pipelineTelemetry: import('../../../types/publishing').PipelineTelemetry = {
      cssSources: {
        compiledCss: !!this.compiledCss,
        componentStyles: true, // Always included now
        structural: true,
        compiledCssLength: this.compiledCss?.length,
      },
      sectionDecisions: this.sectionTelemetry,
      brandInfo: {
        brandName: this.brandName,
        primaryColor: this.getColor('primary'),
        secondaryColor: this.getColor('secondary'),
        accentColor: this.getColor('accent'),
        headingFont: this.getFont('heading'),
        bodyFont: this.getFont('body'),
        personality: this.designDna?.personality?.overall,
        confidence: this.designDna?.confidence?.overall,
      },
      warnings: this.pipelineWarnings,
    };

    return { html, css, fullDocument, pipelineTelemetry };
  }

  // ============================================================================
  // HTML GENERATION - Built from content, NOT templates
  // ============================================================================

  private generateHTML(article: ArticleInput): string {
    const parts: string[] = [];

    // Extract subtitle from first section if it's an introduction
    const firstSection = article.sections[0];
    let subtitle: string | undefined;
    if (firstSection?.content) {
      const textOnly = firstSection.content.replace(/<[^>]+>/g, '').trim();
      const firstSentence = textOnly.match(/^[^.!?]+[.!?]/)?.[0];
      if (firstSentence && firstSentence.length > 30 && firstSentence.length < 200) {
        subtitle = firstSentence;
      }
    }

    // Estimate read time
    const totalText = article.sections.map(s => s.content.replace(/<[^>]+>/g, '')).join(' ');
    const wordCount = totalText.split(/\s+/).length;
    const readTime = `${Math.max(1, Math.round(wordCount / 200))} min`;

    // Hero section - built dynamically from title, subtitle, and metadata
    parts.push(this.buildHero(article.title, subtitle, { readTime }));

    // Table of contents - built from actual section headings
    const tocItems = article.sections
      .filter(s => s.heading)
      .map((s, i) => ({ id: s.id || `section-${i}`, heading: s.heading! }));

    if (tocItems.length > 2) {
      parts.push(this.buildTableOfContents(tocItems));
    }

    // Main content
    parts.push('<main>');
    parts.push('<article>');

    // Each section - HTML built from parsing the actual content
    // When Layout Blueprint is available, use its decisions for structure and styling
    console.log('[CleanArticleRenderer] Starting section rendering with layout blueprint:', {
      hasBlueprint: !!this.layoutBlueprint,
      blueprintSections: this.layoutBlueprint?.sections?.length || 0,
      articleSections: article.sections.length,
      blueprintEmphasisLevels: this.layoutBlueprint?.sections?.map(s => ({ id: s.id, emphasis: s.emphasis?.level })) || [],
    });

    // Track matched blueprint sections to avoid double-matching
    const usedBlueprintIndices = new Set<number>();

    for (let i = 0; i < article.sections.length; i++) {
      const section = article.sections[i];
      const isFirst = i === 0;
      const isAlternate = i % 2 === 1;

      // Find corresponding layout blueprint section using multiple strategies:
      // 1. Exact ID match
      // 2. Heading text similarity match
      // 3. Order-based match (accounting for intro sections)
      let layoutSection = this.findMatchingLayoutSection(section, i, usedBlueprintIndices);

      // If no match but we have a blueprint, synthesize a section to use ComponentRenderer
      if (!layoutSection && this.layoutBlueprint?.sections?.length) {
        const inferredType = this.inferContentType(section);
        const inferredComponent = this.inferComponent(inferredType);
        if (inferredComponent !== 'prose') {
          layoutSection = {
            id: section.id || `synth-${i}`,
            heading: section.heading || '',
            headingLevel: section.headingLevel || 2,
            order: i,
            contentType: inferredType,
            semanticWeight: isFirst ? 4 : 3,
            component: {
              primaryComponent: inferredComponent,
              alternativeComponents: [],
              confidence: 0.6,
              reasoning: 'Synthesized from content analysis',
            },
            layout: {
              width: 'medium' as const,
              columns: 1 as const,
              imagePosition: 'none' as const,
              verticalSpacingBefore: 'normal' as const,
              verticalSpacingAfter: 'normal' as const,
              breakBefore: 'none' as const,
              breakAfter: 'none' as const,
              alignText: 'left' as const,
            },
            emphasis: {
              level: isFirst ? 'hero' as const : (i <= 2 ? 'featured' as const : 'standard' as const),
              headingSize: isFirst ? 'xl' as const : 'lg' as const,
              headingDecoration: false,
              paddingMultiplier: 1,
              marginMultiplier: 1,
              hasBackgroundTreatment: false,
              hasAccentBorder: false,
              elevation: 0 as const,
              hasEntryAnimation: false,
            },
            constraints: {},
            contentZone: 'MAIN' as const,
            cssClasses: [],
          } as BlueprintSection;
          console.log(`[CleanArticleRenderer] Synthesized layoutSection for ${section.id}: ${inferredComponent}`);
        }
      }

      console.log(`[CleanArticleRenderer] Section ${i} (${section.id}) matched:`, {
        sectionHeading: section.heading?.substring(0, 40),
        matchedLayoutId: layoutSection?.id || 'NONE',
        matchedEmphasis: layoutSection?.emphasis?.level || 'DEFAULT',
        matchedContentType: layoutSection?.contentType || 'INFERRED',
      });

      parts.push(this.buildSection(section, isFirst, isAlternate, layoutSection));
    }

    parts.push('</article>');
    parts.push('</main>');

    // CTA - only if configured (no hardcoded content)
    // CTA content should come from the brief/business info, not hardcoded here
    // For now, we skip the CTA - it can be added when proper content is available
    // parts.push(this.buildCTA());

    return parts.join('\n');
  }

  /**
   * Build hero section - semantic HTML with optional subtitle and metadata
   */
  private buildHero(title: string, subtitle?: string, metadata?: { readTime?: string; date?: string }): string {
    return `
<header class="article-header">
  <div class="article-header-inner">
    <h1>${this.escapeHtml(title)}</h1>
    ${subtitle ? `<p class="article-subtitle">${this.escapeHtml(subtitle)}</p>` : ''}
    ${metadata?.readTime || metadata?.date ? `
    <div class="article-meta">
      ${metadata.date ? `<span class="meta-item">${this.escapeHtml(metadata.date)}</span>` : ''}
      ${metadata.readTime ? `<span class="meta-item">${this.escapeHtml(metadata.readTime)}</span>` : ''}
    </div>` : ''}
  </div>
</header>`;
  }

  /**
   * Build table of contents from actual headings - semantic navigation
   * NO hardcoded text, NO numbered badges
   */
  private buildTableOfContents(items: { id: string; heading: string }[], language: string = 'en'): string {
    const listItems = items.map((item) =>
      `<li><a href="#${item.id}">${this.escapeHtml(item.heading)}</a></li>`
    ).join('\n');

    // Minimal semantic TOC - let CSS handle any styling
    return `
<nav class="article-toc" aria-label="Table of contents">
  <ul>
${listItems}
  </ul>
</nav>`;
  }

  /**
   * Build a content section - HTML structure from Layout Engine decisions + content parsing
   *
   * When layoutSection is provided:
   * - Uses component.primaryComponent to select visually distinct component renderer
   * - Uses emphasis for visual styling (hero, featured, etc.)
   * - Uses layout for columns, width, spacing
   *
   * Without layoutSection, falls back to simple prose rendering.
   */
  private buildSection(
    section: ArticleSection,
    isFirst: boolean,
    isAlternate: boolean,
    layoutSection?: BlueprintSection
  ): string {
    const sectionId = section.id || '';

    // Determine content type and emphasis from Layout Engine or infer from content
    const contentType = layoutSection?.contentType || this.inferContentType(section);
    const emphasisLevel = layoutSection?.emphasis?.level || (isFirst ? 'hero' : 'standard');
    const component = layoutSection?.component?.primaryComponent || this.inferComponent(contentType);
    const variant = layoutSection?.component?.componentVariant || 'default';

    // Track used types for CSS generation
    this.usedContentTypes.add(contentType);
    this.usedEmphasisLevels.add(emphasisLevel);

    // =========================================================================
    // USE COMPONENT RENDERER for rich, agency-quality visual components
    // =========================================================================
    // This is what creates the "wow factor" - not generic prose but
    // purposefully designed visual components (feature grids, timelines, etc.)
    if (layoutSection && layoutSection.component && layoutSection.layout && layoutSection.emphasis) {
      console.log(`[CleanArticleRenderer] Using ComponentRenderer for ${component}`);
      try {
        const rendered = ComponentRenderer.render({
          sectionId,
          heading: section.heading || '',
          headingLevel: section.headingLevel || 2,
          content: section.content,
          component: component as ComponentType,
          variant,
          layout: layoutSection.layout,
          emphasis: layoutSection.emphasis,
          cssClasses: layoutSection.cssClasses,
        });
        this.sectionTelemetry.push({
          heading: section.heading || '(untitled)',
          assignedComponent: component,
          emphasis: emphasisLevel,
          width: layoutSection.layout?.width || 'medium',
          renderedAs: component,
          status: 'ok',
        });
        return rendered;
      } catch (err) {
        console.error(`[CleanArticleRenderer] ComponentRenderer failed for ${component}:`, err);
        this.sectionTelemetry.push({
          heading: section.heading || '(untitled)',
          assignedComponent: component,
          emphasis: emphasisLevel,
          width: layoutSection.layout?.width || 'medium',
          renderedAs: 'prose',
          status: 'error',
          fallbackReason: String(err),
        });
        this.pipelineWarnings.push(`Section "${section.heading || sectionId}" component "${component}" failed: ${String(err)}`);
        // Fall through to prose rendering below
      }
    }

    // =========================================================================
    // FALLBACK: Simple prose rendering when no Layout Engine blueprint
    // =========================================================================
    console.log(`[CleanArticleRenderer] Fallback prose rendering for ${sectionId}`);
    this.sectionTelemetry.push({
      heading: section.heading || '(untitled)',
      assignedComponent: component,
      emphasis: emphasisLevel,
      width: 'medium',
      renderedAs: 'prose',
      status: 'fallback',
      fallbackReason: 'No layout blueprint section available',
    });
    this.pipelineWarnings.push(`Section "${section.heading || sectionId}" fell back to prose (no layout blueprint)`);

    // Build CSS classes based on inferred content type
    const classes = [
      'section',
      `section-${contentType}`,
      `emphasis-${emphasisLevel}`,
      isAlternate && emphasisLevel === 'standard' ? 'section-alt' : '',
    ].filter(Boolean).join(' ');

    // Build semantic HTML based on content type
    const contentHtml = this.buildSemanticHtml(section, contentType);

    // Build section with heading if present
    const headingLevel = section.headingLevel || 2;
    const headingHtml = section.heading
      ? `<h${headingLevel} class="section-heading">${this.escapeHtml(section.heading)}</h${headingLevel}>`
      : '';

    return `
<section id="${sectionId}" class="${classes}" data-component="${component}" data-variant="${variant}">
  <div class="section-inner">
    ${headingHtml}
    ${contentHtml}
  </div>
</section>`;
  }

  /**
   * Infer appropriate component type from content type
   */
  private inferComponent(contentType: ContentType): ComponentType {
    const componentMap: Record<ContentType, ComponentType> = {
      'introduction': 'prose',
      'explanation': 'prose',
      'steps': 'step-list',
      'faq': 'faq-accordion',
      'comparison': 'comparison-table',
      'summary': 'key-takeaways',
      'testimonial': 'testimonial-card',
      'definition': 'definition-box',
      'list': 'checklist',
      'data': 'stat-highlight',
    };
    return componentMap[contentType] || 'prose';
  }

  /**
   * Find the matching layout blueprint section using multiple strategies.
   * Strategies (in order of priority):
   * 1. Exact ID match
   * 2. Heading text similarity (case-insensitive, normalized)
   * 3. Order-based match (accounting for intro sections offset)
   */
  private findMatchingLayoutSection(
    section: ArticleSection,
    articleIndex: number,
    usedIndices: Set<number>
  ): BlueprintSection | undefined {
    if (!this.layoutBlueprint?.sections || this.layoutBlueprint.sections.length === 0) {
      return undefined;
    }

    const blueprintSections = this.layoutBlueprint.sections;

    // Strategy 1: Exact ID match
    for (let i = 0; i < blueprintSections.length; i++) {
      if (usedIndices.has(i)) continue;
      if (blueprintSections[i].id === section.id) {
        usedIndices.add(i);
        return blueprintSections[i];
      }
    }

    // Strategy 2: Heading similarity match
    if (section.heading) {
      const normalizedHeading = this.normalizeForComparison(section.heading);
      for (let i = 0; i < blueprintSections.length; i++) {
        if (usedIndices.has(i)) continue;
        const bpHeading = this.normalizeForComparison(blueprintSections[i].heading);
        if (normalizedHeading && bpHeading && this.headingsAreSimilar(normalizedHeading, bpHeading)) {
          usedIndices.add(i);
          return blueprintSections[i];
        }
      }
    }

    // Strategy 3: Order-based match
    // Account for intro sections: if section.id starts with 'section-intro', don't offset
    // Otherwise, check if there's an offset due to intro content
    const isIntroSection = section.id.includes('intro');
    if (isIntroSection) {
      // Intro sections might not have a blueprint match - that's OK
      return undefined;
    }

    // For non-intro sections, try matching by extracting the numeric part of the ID
    const sectionNumMatch = section.id.match(/section-(\d+)/);
    if (sectionNumMatch) {
      const sectionNum = parseInt(sectionNumMatch[1], 10);
      for (let i = 0; i < blueprintSections.length; i++) {
        if (usedIndices.has(i)) continue;
        if (blueprintSections[i].order === sectionNum) {
          usedIndices.add(i);
          return blueprintSections[i];
        }
      }
    }

    // Last resort: match by article index (only if within blueprint bounds)
    if (articleIndex < blueprintSections.length && !usedIndices.has(articleIndex)) {
      usedIndices.add(articleIndex);
      return blueprintSections[articleIndex];
    }

    return undefined;
  }

  /**
   * Normalize a string for comparison (lowercase, remove special chars, collapse whitespace)
   */
  private normalizeForComparison(s: string): string {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if two normalized headings are similar (word overlap >= 70%)
   */
  private headingsAreSimilar(h1: string, h2: string): boolean {
    if (h1 === h2) return true;

    // Substring containment - if one heading contains the other
    if (h1.includes(h2) || h2.includes(h1)) return true;

    const words1 = h1.split(' ').filter(w => w.length > 0);
    const words2 = h2.split(' ').filter(w => w.length > 0);

    if (words1.length === 0 || words2.length === 0) return false;

    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const overlap = [...set1].filter(w => set2.has(w)).length;
    const total = Math.max(set1.size, set2.size);

    return overlap / total >= 0.5;
  }

  /**
   * Infer content type from section content when Layout Engine blueprint not available
   */
  private inferContentType(section: ArticleSection): ContentType {
    const heading = (section.heading || '').toLowerCase();
    const content = section.content.toLowerCase();

    // Check for steps/how-to
    if (/step|how to|tutorial|guide|process/i.test(heading) ||
        /^\d+\.\s+/m.test(section.content)) {
      return 'steps';
    }

    // Check for FAQ
    if (/faq|question|q&a/i.test(heading) ||
        /\?[\s]*$/m.test(section.content)) {
      return 'faq';
    }

    // Check for comparison
    if (/compare|vs\.|versus|comparison|difference/i.test(heading) ||
        section.content.includes('|') && section.content.split('\n').filter(l => l.includes('|')).length > 2) {
      return 'comparison';
    }

    // Check for list content
    if (content.includes('- ') || /^\*\s+/m.test(content) ||
        /benefit|feature|advantage|tip/i.test(heading)) {
      return 'list';
    }

    // Check for summary/key takeaways
    if (/summary|conclusion|takeaway|key point/i.test(heading)) {
      return 'summary';
    }

    // Check for introduction
    if (/intro|overview|what is/i.test(heading) || !section.heading) {
      return 'introduction';
    }

    // Check for definition
    if (/definition|meaning|what does/i.test(heading)) {
      return 'definition';
    }

    // Default to explanation
    return 'explanation';
  }

  /**
   * Build semantic HTML structure based on content type
   * This is the core of the "no-template" approach - HTML structure comes from
   * content semantics, not from predefined templates.
   */
  private buildSemanticHtml(section: ArticleSection, contentType: ContentType): string {
    switch (contentType) {
      case 'steps':
        return this.buildStepsHtml(section);
      case 'faq':
        return this.buildFaqHtml(section);
      case 'comparison':
        return this.buildComparisonHtml(section);
      case 'list':
        return this.buildListHtml(section);
      case 'summary':
        return this.buildSummaryHtml(section);
      case 'testimonial':
        return this.buildTestimonialHtml(section);
      case 'definition':
        return this.buildDefinitionHtml(section);
      case 'data':
        return this.buildDataHtml(section);
      case 'introduction':
      case 'explanation':
      default:
        return this.buildProseHtml(section);
    }
  }

  /**
   * Build steps/timeline HTML structure
   * Uses ordered list with step indicators
   */
  private buildStepsHtml(section: ArticleSection): string {
    const parsedBlocks = this.parseContent(section.content);

    // Extract numbered items or list items
    const steps: string[] = [];
    let currentStepContent = '';

    for (const block of parsedBlocks) {
      if (block.type === 'list' && block.items) {
        steps.push(...block.items);
      } else if (block.type === 'heading') {
        // Sub-heading might be a step title
        if (currentStepContent) {
          steps.push(currentStepContent);
          currentStepContent = '';
        }
        currentStepContent = `<strong>${this.processInlineMarkdown(block.text || '')}</strong>`;
      } else if (block.type === 'paragraph' && block.text) {
        if (currentStepContent) {
          currentStepContent += ' ' + this.processInlineMarkdown(block.text);
        } else {
          currentStepContent = this.processInlineMarkdown(block.text);
        }
      }
    }
    if (currentStepContent) {
      steps.push(currentStepContent);
    }

    // If no steps extracted, fall back to prose rendering
    if (steps.length === 0) {
      return this.buildProseHtml(section);
    }

    const stepsHtml = steps.map((step, index) =>
      `<li class="step-item">
        <span class="step-number">${index + 1}</span>
        <div class="step-content">${step}</div>
      </li>`
    ).join('\n');

    return `<ol class="steps-list">${stepsHtml}</ol>`;
  }

  /**
   * Build FAQ HTML structure
   * Uses definition list with question/answer pairs
   */
  private buildFaqHtml(section: ArticleSection): string {
    const parsedBlocks = this.parseContent(section.content);

    // Extract Q&A pairs
    const faqItems: { question: string; answer: string }[] = [];
    let currentQuestion = '';
    let currentAnswer = '';

    for (const block of parsedBlocks) {
      if (block.type === 'heading' && block.text) {
        // If we have a previous Q&A, save it
        if (currentQuestion && currentAnswer) {
          faqItems.push({ question: currentQuestion, answer: currentAnswer });
        }
        currentQuestion = block.text;
        currentAnswer = '';
      } else if (block.type === 'paragraph' && block.text) {
        // Check if this looks like a question
        if (block.text.endsWith('?') && !currentAnswer) {
          if (currentQuestion && currentAnswer) {
            faqItems.push({ question: currentQuestion, answer: currentAnswer });
          }
          currentQuestion = block.text;
          currentAnswer = '';
        } else {
          currentAnswer += (currentAnswer ? ' ' : '') + this.processInlineMarkdown(block.text);
        }
      } else {
        // Accumulate other content as part of answer
        currentAnswer += (currentAnswer ? ' ' : '') + this.renderBlock(block);
      }
    }

    // Save last Q&A
    if (currentQuestion && currentAnswer) {
      faqItems.push({ question: currentQuestion, answer: currentAnswer });
    }

    // If no FAQ items extracted, fall back to prose
    if (faqItems.length === 0) {
      return this.buildProseHtml(section);
    }

    const faqHtml = faqItems.map((item, index) =>
      `<div class="faq-item">
        <dt class="faq-question">
          <span class="faq-icon">Q</span>
          ${this.escapeHtml(item.question)}
        </dt>
        <dd class="faq-answer">${item.answer}</dd>
      </div>`
    ).join('\n');

    return `<dl class="faq-list">${faqHtml}</dl>`;
  }

  /**
   * Build comparison HTML structure
   * Uses table with styled header
   */
  private buildComparisonHtml(section: ArticleSection): string {
    const parsedBlocks = this.parseContent(section.content);

    // Look for table in parsed blocks
    const tableBlock = parsedBlocks.find(b => b.type === 'table');
    if (tableBlock && tableBlock.headers && tableBlock.rows) {
      return this.renderTable(tableBlock.headers, tableBlock.rows);
    }

    // Fall back to prose if no table found
    return this.buildProseHtml(section);
  }

  /**
   * Build list HTML structure
   * Uses unordered list with styled markers
   */
  private buildListHtml(section: ArticleSection): string {
    const parsedBlocks = this.parseContent(section.content);
    const parts: string[] = [];

    for (const block of parsedBlocks) {
      if (block.type === 'list' && block.items) {
        const listItems = block.items.map(item =>
          `<li class="list-item">
            <span class="list-marker"></span>
            <span class="list-content">${this.processInlineMarkdown(item)}</span>
          </li>`
        ).join('\n');
        parts.push(`<ul class="styled-list">${listItems}</ul>`);
      } else {
        parts.push(this.renderBlock(block));
      }
    }

    return parts.join('\n');
  }

  /**
   * Build summary/key takeaways HTML structure
   * Uses aside with highlighted key points
   */
  private buildSummaryHtml(section: ArticleSection): string {
    const parsedBlocks = this.parseContent(section.content);

    return `<aside class="summary-box">
      <div class="summary-icon">💡</div>
      <div class="summary-content">
        ${parsedBlocks.map(block => this.renderBlock(block)).join('\n')}
      </div>
    </aside>`;
  }

  /**
   * Build testimonial HTML structure
   * Uses blockquote with citation
   */
  private buildTestimonialHtml(section: ArticleSection): string {
    const parsedBlocks = this.parseContent(section.content);
    const parts: string[] = [];

    for (const block of parsedBlocks) {
      if (block.type === 'blockquote') {
        parts.push(`<blockquote class="testimonial">
          <p class="testimonial-text">${this.processInlineMarkdown(block.text || '')}</p>
        </blockquote>`);
      } else {
        parts.push(this.renderBlock(block));
      }
    }

    return parts.join('\n');
  }

  /**
   * Build definition HTML structure
   * Uses definition list for term/definition
   */
  private buildDefinitionHtml(section: ArticleSection): string {
    const parsedBlocks = this.parseContent(section.content);

    return `<div class="definition-box">
      <div class="definition-icon">📖</div>
      <div class="definition-content">
        ${parsedBlocks.map(block => this.renderBlock(block)).join('\n')}
      </div>
    </div>`;
  }

  /**
   * Build data/statistics HTML structure
   * Uses figure with highlighted stats
   */
  private buildDataHtml(section: ArticleSection): string {
    const parsedBlocks = this.parseContent(section.content);

    return `<figure class="data-highlight">
      ${parsedBlocks.map(block => this.renderBlock(block)).join('\n')}
    </figure>`;
  }

  /**
   * Build prose (introduction/explanation) HTML structure
   * Standard paragraphs with proper formatting
   */
  private buildProseHtml(section: ArticleSection): string {
    const parsedBlocks = this.parseContent(section.content);
    return parsedBlocks.map(block => this.renderBlock(block)).join('\n');
  }

  /**
   * Parse content string into structured blocks
   * This analyzes WHAT the content contains, not which template to use
   */
  private parseContent(content: string): ParsedContent[] {
    const blocks: ParsedContent[] = [];

    // Split by double newlines to get blocks
    const rawBlocks = content.split(/\n\n+/).filter(b => b.trim());

    for (const raw of rawBlocks) {
      const trimmed = raw.trim();

      // Check for markdown heading
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/m);
      if (headingMatch) {
        blocks.push({
          type: 'heading',
          level: headingMatch[1].length,
          text: headingMatch[2],
          raw: trimmed
        });
        continue;
      }

      // Check for image (markdown or HTML)
      const imgMatch = trimmed.match(/!\[([^\]]*)\]\(([^)]+)\)|<img[^>]+src=["']([^"']+)["'][^>]*>/);
      if (imgMatch) {
        blocks.push({
          type: 'image',
          alt: imgMatch[1] || '',
          src: imgMatch[2] || imgMatch[3] || '',
          raw: trimmed
        });
        continue;
      }

      // Check for markdown table
      if (trimmed.includes('|') && trimmed.split('\n').length > 1) {
        const tableData = this.parseMarkdownTable(trimmed);
        if (tableData) {
          blocks.push({
            type: 'table',
            headers: tableData.headers,
            rows: tableData.rows,
            raw: trimmed
          });
          continue;
        }
      }

      // Check for list (markdown)
      if (/^[\*\-\+]\s+/m.test(trimmed) || /^\d+\.\s+/m.test(trimmed)) {
        const items = trimmed
          .split('\n')
          .filter(line => /^[\*\-\+\d\.]\s*/.test(line.trim()))
          .map(line => line.replace(/^[\*\-\+]\s+/, '').replace(/^\d+\.\s+/, '').trim());

        if (items.length > 0) {
          blocks.push({
            type: 'list',
            items,
            raw: trimmed
          });
          continue;
        }
      }

      // Check for blockquote
      if (trimmed.startsWith('>')) {
        blocks.push({
          type: 'blockquote',
          text: trimmed.replace(/^>\s*/gm, ''),
          raw: trimmed
        });
        continue;
      }

      // Default: paragraph
      blocks.push({
        type: 'paragraph',
        text: trimmed,
        raw: trimmed
      });
    }

    return blocks;
  }

  /**
   * Parse markdown table into structured data
   */
  private parseMarkdownTable(content: string): { headers: string[]; rows: string[][] } | null {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return null;

    // First line is headers
    const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);

    // Skip separator line (contains ---)
    const dataLines = lines.slice(1).filter(l => !l.includes('---'));

    const rows = dataLines.map(line =>
      line.split('|').map(cell => cell.trim()).filter(c => c)
    );

    return { headers, rows };
  }

  /**
   * Render a parsed block to HTML - dynamic, not templated
   */
  private renderBlock(block: ParsedContent): string {
    switch (block.type) {
      case 'heading':
        return `<h${block.level}>${this.processInlineMarkdown(block.text || '')}</h${block.level}>`;

      case 'paragraph':
        return `<p>${this.processInlineMarkdown(block.text || '')}</p>`;

      case 'image':
        return `<figure><img src="${block.src}" alt="${this.escapeHtml(block.alt || '')}" loading="lazy"><figcaption>${this.escapeHtml(block.alt || '')}</figcaption></figure>`;

      case 'list':
        const listItems = (block.items || [])
          .map(item => `<li>${this.processInlineMarkdown(item)}</li>`)
          .join('\n');
        return `<ul>${listItems}</ul>`;

      case 'table':
        return this.renderTable(block.headers || [], block.rows || []);

      case 'blockquote':
        return `<blockquote><p>${this.processInlineMarkdown(block.text || '')}</p></blockquote>`;

      default:
        return `<p>${this.processInlineMarkdown(block.raw)}</p>`;
    }
  }

  /**
   * Render table from data - built dynamically
   */
  private renderTable(headers: string[], rows: string[][]): string {
    const headerCells = headers.map(h => `<th>${this.processInlineMarkdown(h)}</th>`).join('');
    const headerRow = `<tr>${headerCells}</tr>`;

    const bodyRows = rows.map(row => {
      const cells = row.map(cell => `<td>${this.processInlineMarkdown(cell)}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('\n');

    return `
<div class="table-wrapper">
  <table>
    <thead>${headerRow}</thead>
    <tbody>${bodyRows}</tbody>
  </table>
</div>`;
  }

  /**
   * Process inline markdown (bold, italic, links)
   */
  private processInlineMarkdown(text: string): string {
    let result = text;

    // Bold: **text** or __text__
    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    result = result.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Links: [text](url)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    return result;
  }

  /**
   * Build CTA section - ONLY if CTA content is provided
   * NO hardcoded text whatsoever
   */
  private buildCTA(ctaConfig?: { heading?: string; text?: string; primaryText?: string; primaryUrl?: string; secondaryText?: string; secondaryUrl?: string }): string {
    // If no CTA config provided, return empty - don't inject hardcoded content
    if (!ctaConfig || (!ctaConfig.heading && !ctaConfig.primaryText)) {
      return '';
    }

    const parts: string[] = ['<aside class="article-cta">'];

    if (ctaConfig.heading) {
      parts.push(`<h2>${this.escapeHtml(ctaConfig.heading)}</h2>`);
    }
    if (ctaConfig.text) {
      parts.push(`<p>${this.escapeHtml(ctaConfig.text)}</p>`);
    }

    const hasButtons = ctaConfig.primaryText || ctaConfig.secondaryText;
    if (hasButtons) {
      parts.push('<div class="cta-actions">');
      if (ctaConfig.primaryText && ctaConfig.primaryUrl) {
        parts.push(`<a href="${ctaConfig.primaryUrl}" class="cta-primary">${this.escapeHtml(ctaConfig.primaryText)}</a>`);
      }
      if (ctaConfig.secondaryText && ctaConfig.secondaryUrl) {
        parts.push(`<a href="${ctaConfig.secondaryUrl}" class="cta-secondary">${this.escapeHtml(ctaConfig.secondaryText)}</a>`);
      }
      parts.push('</div>');
    }

    parts.push('</aside>');
    return parts.join('\n');
  }

  // ============================================================================
  // CSS GENERATION - Actual values, NOT CSS variables pointing to templates
  // ============================================================================

  private generateCSS(): string {
    // ==========================================================================
    // THE KEY FIX: Use AI-generated compiledCss when available
    // ==========================================================================
    // This is what makes output "design-agency quality" - the AI generates unique
    // CSS per brand that captures their exact style, not generic fallback styles.
    if (this.compiledCss) {
      console.log('[CleanArticleRenderer] Using AI-generated compiledCss + component visual styles');
      // CSS Layer Order (bottom to top):
      // 1. componentCss: Rich visual component styles - generic visual base
      // 2. compiledCss: AI-generated brand-specific overrides (wins cascade for matching selectors)
      // 3. structuralCSS: Layout-only (grid, flex, spacing, responsive breakpoints)
      //
      // CRITICAL: compiledCss MUST come AFTER componentCss so that brand-specific
      // AI-generated values (custom shadows, unique gradient angles, personality-specific
      // hover effects) override the generic component visual base.
      const brandColors = {
        primaryColor: this.getColor('primary'),
        primaryDark: this.getColor('primaryDark'),
        secondaryColor: this.getColor('secondary'),
        accentColor: this.getColor('accent'),
        textColor: this.getNeutral('dark'),
        textMuted: this.getNeutral('medium'),
        backgroundColor: '#ffffff',
        surfaceColor: this.getNeutral('lightest'),
        borderColor: this.getNeutral('light'),
        headingFont: this.getFont('heading'),
        bodyFont: this.getFont('body'),
        radiusSmall: this.getRadius('small'),
        radiusMedium: this.getRadius('medium'),
        radiusLarge: this.getRadius('large'),
        personality: this.designDna?.personality?.overall,
      };
      const componentCss = generateComponentStyles(brandColors);
      // NEW order: componentCss (generic visual base) → compiledCss (brand-specific overrides) → structuralCSS (layout)
      return `${componentCss}\n\n/* === Brand-Specific Overrides (compiledCss) === */\n${this.compiledCss}\n\n${this.generateStructuralCSS()}`;
    }

    console.log('[CleanArticleRenderer] Generating fallback CSS from DesignDNA');

    // FALLBACK: Generate CSS from DesignDNA when no compiledCss available
    // This produces acceptable but not "agency quality" output
    const primary = this.getColor('primary');
    const primaryLight = this.getColor('primaryLight');
    const primaryDark = this.getColor('primaryDark');
    const secondary = this.getColor('secondary');
    const accent = this.getColor('accent');

    const textDark = this.getNeutral('dark');
    const textMedium = this.getNeutral('medium');
    const textLight = this.getNeutral('light');
    const bgLight = this.getNeutral('lightest');
    const border = this.getNeutral('light');

    const headingFont = this.getFont('heading');
    const bodyFont = this.getFont('body');

    const radiusSm = this.getRadius('small');
    const radiusMd = this.getRadius('medium');
    const radiusLg = this.getRadius('large');

    // Generate CSS with ACTUAL values embedded
    // Include base CSS + content type CSS + emphasis CSS
    const cssParts = [
      this.generateBaseCSS(primary, primaryDark, textDark, textMedium, bgLight, border, headingFont, bodyFont, radiusSm, radiusMd, radiusLg, accent),
      this.generateEmphasisCSS(primary, primaryDark, accent, bgLight, headingFont, radiusMd, radiusLg),
      this.generateStepsCSS(primary, primaryDark, bgLight, headingFont, radiusMd),
      this.generateFaqCSS(primary, primaryDark, textDark, bgLight, headingFont, radiusMd),
      this.generateComparisonCSS(primary, bgLight, radiusMd),
      this.generateListCSS(primary, textDark, textMedium),
      this.generateSummaryCSS(primary, primaryDark, bgLight, radiusMd),
      this.generateDefinitionCSS(primary, bgLight, radiusMd),
      this.generateTestimonialCSS(primary, textMedium, bgLight, radiusMd),
      // AGENCY-QUALITY COMPONENTS: Include rich component styles
      generateComponentStyles({
        primaryColor: primary,
        primaryDark: primaryDark,
        secondaryColor: secondary,
        accentColor: accent,
        textColor: textDark,
        textMuted: textMedium,
        backgroundColor: '#ffffff',     // Page background (not bgLight)
        surfaceColor: bgLight,          // Card/quote backgrounds
        borderColor: border,
        headingFont: headingFont,
        bodyFont: bodyFont,
        radiusSmall: radiusSm,
        radiusMedium: radiusMd,
        radiusLarge: radiusLg,
        personality: this.designDna?.personality?.overall,
      }),
    ];

    return cssParts.join('\n');
  }

  /**
   * Generate STRUCTURAL-ONLY CSS for layout, grid, spacing, and responsive breakpoints.
   * Used when compiledCss exists — compiledCss provides ALL visual styles
   * (colors, backgrounds, fonts, shadows, borders, etc.) via dual selectors.
   * This method adds ONLY positioning, sizing, and structural rules.
   */
  private generateStructuralCSS(): string {
    // IMPORTANT: This method ONLY contains layout primitives (positioning, sizing,
    // spacing, responsive breakpoints). ALL component-specific selectors
    // (.feature-card, .step-item, .faq-item, .timeline-*, etc.) are defined
    // EXCLUSIVELY in ComponentStyles.ts to prevent CSS cascade conflicts.
    //
    // Previous versions duplicated component selectors here with conflicting
    // structural-only properties (e.g., .feature-card { display: flex; gap: 1rem; })
    // which overrode ComponentStyles' rich visual properties (backgrounds, shadows,
    // borders, colors). This caused the "unstyled but structured" appearance.
    return `
/* ==========================================================================
   Structural CSS - Layout primitives ONLY (no component selectors)
   ComponentStyles.ts is the single source of truth for all component styling.
   ========================================================================== */

/* Section layout structure */
.section { position: relative; margin: 0; }
.section-container { max-width: 860px; margin: 0 auto; padding: 0 1.5rem; }
.section-content { margin-top: 1.5rem; }
.section-inner { max-width: 100%; margin-top: 1.5rem; }

/* Layout width classes */
.layout-narrow .section-container { max-width: 680px; }
.layout-medium .section-container { max-width: 860px; }
.layout-wide .section-container { max-width: 1100px; }
.layout-full .section-container { max-width: 100%; padding: 0 2rem; }

/* Column layout */
.columns-2-column .section-content { column-count: 2; column-gap: 2rem; }
.columns-3-column .section-content { column-count: 3; column-gap: 1.5rem; }
.columns-asymmetric-left .section-content { display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; }
.columns-asymmetric-right .section-content { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }

/* Spacing utilities */
.spacing-before-tight { padding-top: 1rem; }
.spacing-before-normal { padding-top: 2rem; }
.spacing-before-generous { padding-top: 3rem; }
.spacing-before-dramatic { padding-top: 5rem; }
.spacing-after-tight { padding-bottom: 1rem; }
.spacing-after-normal { padding-bottom: 2rem; }
.spacing-after-generous { padding-bottom: 3rem; }
.spacing-after-dramatic { padding-bottom: 5rem; }

/* Generic HTML element resets for standalone documents */
table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
th { padding: 0.75rem 1rem; text-align: left; }
td { padding: 0.75rem 1rem; }
figure { margin: 2rem 0; }
figure img { width: 100%; height: auto; }
figcaption { text-align: center; margin-top: 0.75rem; }
blockquote { padding: 1rem 1.5rem; margin: 1.5rem 0; }

/* Responsive breakpoints */
@media (max-width: 768px) {
  .columns-2-column .section-content,
  .columns-3-column .section-content { column-count: 1; }
  .columns-asymmetric-left .section-content,
  .columns-asymmetric-right .section-content { grid-template-columns: 1fr; }
  .section-container { padding: 0 1rem; }
}

@media (max-width: 480px) {
  .section-container { padding: 0 1rem; }
}
`;
  }

  /**
   * Generate VISUAL FALLBACK CSS for when no compiledCss is available.
   * Includes full visual styling (colors, backgrounds, fonts, shadows, borders)
   * using brand CSS variables from the AI-generated compiledCss or hardcoded fallbacks.
   * This is the LEGACY path — kept for backward compatibility when no compiledCss exists.
   */
  private generateVisualFallbackCSS(): string {
    return `
/* ==========================================================================
   Supplementary Styles - Structure + Visual styling using brand CSS variables
   The AI-generated compiledCss sets --ctc-* custom properties.
   This CSS uses those properties to style ALL semantic class names
   that the CleanArticleRenderer generates in HTML.
   ========================================================================== */

/* Page-level: Soft branded background */
body, .article-body, .styled-article {
  background: linear-gradient(180deg, #f0f4ff 0%, #f8faff 100%);
  min-height: 100vh;
}
@supports (background: color-mix(in srgb, red 50%, blue)) {
  body, .article-body, .styled-article {
    background: linear-gradient(180deg, color-mix(in srgb, var(--ctc-primary, #2563eb) 7%, white) 0%, color-mix(in srgb, var(--ctc-primary, #2563eb) 4%, white) 100%);
  }
}

/* Article structure */
.article-header { margin-bottom: 2rem; text-align: center; }
.article-toc { margin: 1.5rem auto; max-width: 860px; padding: 1.5rem; background: var(--ctc-secondary, #f9fafb); border-radius: var(--ctc-radius-md, 8px); }
.article-toc a { color: var(--ctc-primary, #2563eb); text-decoration: none; }
.article-toc a:hover { text-decoration: underline; }
.section-inner { max-width: 100%; margin-top: 1.5rem; }

/* Section layout structure */
.section { position: relative; margin: 0; padding: 2rem 0; }
.section-container { max-width: 860px; margin: 0 auto; padding: 0 1.5rem; }
.section-content { margin-top: 1.5rem; }

/* White content cards on branded background */
.section:not(.emphasis-hero) .section-container {
  background: var(--ctc-neutral-lightest, #ffffff);
  border-radius: var(--ctc-radius-lg, 16px);
  padding: 2.5rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.section-heading {
  font-family: var(--ctc-font-heading, sans-serif);
  font-weight: var(--ctc-heading-weight, 700);
  color: var(--ctc-text-darkest, #0f172a);
  margin-bottom: 1rem;
  line-height: 1.3;
}

/* Heading size variants */
.heading-xl { font-size: var(--ctc-font-size-3xl, 2.1rem); }
.heading-lg { font-size: var(--ctc-font-size-2xl, 1.75rem); }
.heading-md { font-size: var(--ctc-font-size-xl, 1.45rem); }
.heading-sm { font-size: var(--ctc-font-size-lg, 1.2rem); }

/* Heading decoration */
.heading-decorated { position: relative; }
.heading-accent {
  display: inline-block;
  width: 40px;
  height: 4px;
  background: var(--ctc-primary, #2563eb);
  margin-right: 0.75rem;
  vertical-align: middle;
  border-radius: 2px;
}

/* Layout width classes */
.layout-narrow .section-container { max-width: 680px; }
.layout-medium .section-container { max-width: 860px; }
.layout-wide .section-container { max-width: 1100px; }
.layout-full .section-container { max-width: 100%; padding: 0 2rem; }

/* Column layout */
.columns-2-column .section-content { column-count: 2; column-gap: 2rem; }
.columns-3-column .section-content { column-count: 3; column-gap: 1.5rem; }
.columns-asymmetric-left .section-content { display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; }
.columns-asymmetric-right .section-content { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; }

/* Spacing utilities */
.spacing-before-tight { padding-top: 1rem; }
.spacing-before-normal { padding-top: 2rem; }
.spacing-before-generous { padding-top: 3rem; }
.spacing-before-dramatic { padding-top: 5rem; }
.spacing-after-tight { padding-bottom: 1rem; }
.spacing-after-normal { padding-bottom: 2rem; }
.spacing-after-generous { padding-bottom: 3rem; }
.spacing-after-dramatic { padding-bottom: 5rem; }

/* Emphasis levels - visual differentiation using brand colors */
.emphasis-hero {
  background: linear-gradient(135deg, var(--ctc-primary, #2563eb), var(--ctc-primary-dark, #1e40af));
  color: var(--ctc-neutral-lightest, #ffffff);
  padding: 3rem 0;
  border-radius: var(--ctc-radius-lg, 12px);
  margin: 1rem 0;
}
.emphasis-hero .section-heading { color: var(--ctc-neutral-lightest, #ffffff); }
.emphasis-hero .section-content { color: rgba(255,255,255,0.9); }
.emphasis-hero .section-content p { color: rgba(255,255,255,0.92); }
.emphasis-hero .prose { color: rgba(255,255,255,0.92); }
.emphasis-hero .prose p { color: rgba(255,255,255,0.92); }

/* Hero inner component styles */
.hero-content { text-align: center; }
.hero-lead { max-width: 800px; margin: 0 auto 2rem; }
.hero-text { font-size: 1.375rem; line-height: 1.8; color: var(--ctc-text-dark, #1e293b); }
.hero-details { display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap; margin-top: 2rem; }
.emphasis-hero .hero-lead { max-width: 720px; margin: 0 auto; }
.emphasis-hero .hero-text { font-size: 1.125rem; line-height: 1.7; color: rgba(255,255,255,0.92); }

/* Components inside hero - transparent overlays on gradient bg */
.emphasis-hero .step-item,
.emphasis-hero .card,
.emphasis-hero .feature-card,
.emphasis-hero .checklist-item { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2); color: white; }
.emphasis-hero .step-content,
.emphasis-hero .card-body,
.emphasis-hero .feature-content,
.emphasis-hero .feature-desc,
.emphasis-hero .checklist-text,
.emphasis-hero .timeline-body { color: rgba(255,255,255,0.92); }

.emphasis-featured {
  background: var(--ctc-secondary, #f9fafb);
  padding: 2.5rem 0;
  border-radius: var(--ctc-radius-md, 8px);
  margin: 0.5rem 0;
}

.emphasis-standard { padding: 2rem 0; }
.emphasis-supporting { padding: 1.5rem 0; }
.emphasis-minimal { padding: 1rem 0; }

/* Section dividers - branded separator between major sections */
.section + .section.emphasis-featured { border-top: none; position: relative; }
.section + .section.emphasis-featured::before {
  content: '';
  display: block;
  height: 4px;
  margin-bottom: 1.5rem;
  background: repeating-linear-gradient(
    90deg,
    var(--ctc-primary, #2563eb) 0px, var(--ctc-primary, #2563eb) 18px,
    transparent 18px, transparent 24px,
    var(--ctc-accent, #f59e0b) 24px, var(--ctc-accent, #f59e0b) 30px,
    transparent 30px, transparent 36px
  );
}
.section.emphasis-standard + .section.emphasis-standard {
  border-top: 2px solid var(--ctc-borders-dividers, #e2e8f0);
  padding-top: 3rem;
}

/* Background and accent utilities */
.has-background { background-color: var(--ctc-secondary, #f9fafb); }
.bg-gradient { background: linear-gradient(135deg, var(--ctc-secondary, #f9fafb) 0%, var(--ctc-neutral-lightest, #ffffff) 100%); }
.has-accent-border { border-left: 4px solid var(--ctc-primary, #2563eb); }
.accent-left { border-left: 4px solid var(--ctc-primary, #2563eb); padding-left: 1.5rem; }
.accent-top { border-top: 4px solid var(--ctc-primary, #2563eb); padding-top: 1.5rem; }

/* Elevation (box shadows) */
.elevation-1 { box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06); }
.elevation-2 { box-shadow: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06); }
.elevation-3 { box-shadow: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05); }
.card-elevation-1 {
  box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  border-radius: var(--ctc-radius-md, 8px);
  background: var(--ctc-neutral-lightest, #ffffff);
  border: 1px solid var(--ctc-borders-dividers, #e2e8f0);
}
.card-elevation-2 {
  box-shadow: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
  border-radius: var(--ctc-radius-md, 8px);
  background: var(--ctc-neutral-lightest, #ffffff);
}

/* Prose typography */
.prose { line-height: 1.7; color: var(--ctc-text-dark, #1e293b); }
.prose p { margin-bottom: 1.25rem; }
.prose a { color: var(--ctc-primary, #2563eb); text-decoration: underline; text-decoration-color: transparent; transition: text-decoration-color 0.2s; }
.prose a:hover { text-decoration-color: currentColor; }
.prose strong { font-weight: 600; color: var(--ctc-text-darkest, #0f172a); }
.prose h2, .prose h3, .prose h4 { font-family: var(--ctc-font-heading, sans-serif); color: var(--ctc-text-darkest, #0f172a); margin-top: 2rem; margin-bottom: 0.75rem; }

/* Card component */
.card {
  background: var(--ctc-neutral-lightest, #ffffff);
  border-radius: var(--ctc-radius-md, 8px);
  border: 1px solid var(--ctc-borders-dividers, #e2e8f0);
  overflow: hidden;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); transform: translateY(-1px); }
.card-body { padding: 1.5rem; }
.card-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--ctc-borders-dividers, #e2e8f0); font-weight: 600; }

/* Feature grid component */
.feature-grid { display: grid; gap: 1.5rem; }
.feature-grid.columns-2 { grid-template-columns: repeat(2, 1fr); }
.feature-grid.columns-3 { grid-template-columns: repeat(3, 1fr); }
.feature-card {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 1.25rem;
  background: var(--ctc-neutral-lightest, #ffffff);
  border: 1px solid var(--ctc-borders-dividers, #e2e8f0);
  border-radius: var(--ctc-radius-md, 8px);
  transition: box-shadow 0.2s ease;
}
.feature-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.feature-icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ctc-secondary, #f0f4ff);
  color: var(--ctc-primary, #2563eb);
  border-radius: var(--ctc-radius-sm, 6px);
  font-size: 1.1rem;
  font-weight: 700;
}
.feature-content { flex: 1; min-width: 0; }
.feature-title { font-weight: 600; color: var(--ctc-text-darkest, #0f172a); margin-bottom: 0.35rem; font-size: 0.95rem; line-height: 1.4; }
.feature-desc { font-size: 0.9rem; color: var(--ctc-text-medium, #475569); line-height: 1.5; }

/* Step list component */
.steps-list { list-style: none; padding: 0; counter-reset: step-counter; }
.step-item {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--ctc-neutral-lightest, #ffffff);
  border-radius: var(--ctc-radius-md, 8px);
  border: 1px solid var(--ctc-borders-dividers, #e2e8f0);
}
.step-number {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--ctc-primary, #2563eb);
  color: var(--ctc-neutral-lightest, #ffffff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
}
.step-content { flex: 1; }
.step-content strong { display: block; margin-bottom: 0.25rem; color: var(--ctc-text-darkest, #0f172a); }

/* FAQ component */
.faq-list { list-style: none; padding: 0; }
.faq-accordion { display: flex; flex-direction: column; gap: 0; }
.faq-item {
  border-bottom: 1px solid var(--ctc-borders-dividers, #e2e8f0);
  padding: 1rem 0;
}
.faq-question {
  font-weight: 600;
  color: var(--ctc-text-darkest, #0f172a);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.05rem;
}
.faq-icon { color: var(--ctc-primary, #2563eb); font-size: 1.1rem; flex-shrink: 0; }
.faq-answer { margin-top: 0.75rem; color: var(--ctc-text-medium, #475569); line-height: 1.6; padding-left: 1.75rem; }

/* Styled list component */
.styled-list { list-style: none; padding: 0; }
.list-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0;
}
.list-marker {
  flex-shrink: 0;
  color: var(--ctc-primary, #2563eb);
  font-weight: 700;
  font-size: 1.1rem;
  line-height: 1.5;
}
.list-content { flex: 1; line-height: 1.6; }

/* Summary box component */
.summary-box {
  background: var(--ctc-secondary, #f9fafb);
  border-radius: var(--ctc-radius-md, 8px);
  padding: 1.5rem;
  border-left: 4px solid var(--ctc-primary, #2563eb);
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin: 1.5rem 0;
}
.summary-icon {
  flex-shrink: 0;
  font-size: 1.5rem;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ctc-primary, #2563eb);
  color: white;
  border-radius: var(--ctc-radius-sm, 6px);
}
.summary-content { flex: 1; line-height: 1.6; }

/* Definition box component */
.definition-box {
  background: var(--ctc-neutral-lightest, #ffffff);
  border-radius: var(--ctc-radius-md, 8px);
  padding: 1.5rem;
  border: 1px solid var(--ctc-borders-dividers, #e2e8f0);
  border-left: 4px solid var(--ctc-accent, #3b82f6);
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin: 1.5rem 0;
}
.definition-icon { flex-shrink: 0; font-size: 1.5rem; color: var(--ctc-accent, #3b82f6); }
.definition-content { flex: 1; line-height: 1.6; }

/* Data highlight component */
.data-highlight {
  background: var(--ctc-secondary, #f9fafb);
  border-radius: var(--ctc-radius-md, 8px);
  padding: 2rem;
  text-align: center;
  margin: 1.5rem 0;
}

/* Testimonial component */
.testimonial {
  background: var(--ctc-secondary, #f9fafb);
  border-radius: var(--ctc-radius-md, 8px);
  padding: 2rem;
  border-left: 4px solid var(--ctc-primary, #2563eb);
  margin: 1.5rem 0;
  font-style: italic;
}
.testimonial-text { font-size: 1.1rem; line-height: 1.7; color: var(--ctc-text-dark, #1e293b); }
.testimonial-author { margin-top: 1rem; font-style: normal; font-weight: 600; color: var(--ctc-text-medium, #475569); }

/* Stat grid component */
.stat-grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.stat-card {
  text-align: center;
  padding: 1.5rem;
  background: var(--ctc-neutral-lightest, #ffffff);
  border: 1px solid var(--ctc-borders-dividers, #e2e8f0);
  border-radius: var(--ctc-radius-md, 8px);
}
.stat-value { font-size: 2rem; font-weight: 700; color: var(--ctc-primary, #2563eb); }
.stat-label { font-size: 0.875rem; color: var(--ctc-text-medium, #475569); margin-top: 0.25rem; }

/* Key takeaways component */
.key-takeaways-grid { display: grid; gap: 1rem; }
.key-takeaways-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 1rem;
  background: var(--ctc-secondary, #f9fafb);
  border-radius: var(--ctc-radius-sm, 6px);
}
.key-takeaways-icon { flex-shrink: 0; color: var(--ctc-primary, #2563eb); font-size: 1.1rem; }

/* Timeline component */
.timeline { position: relative; padding-left: 2rem; }
.timeline::before {
  content: '';
  position: absolute;
  left: 0.5rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--ctc-borders-dividers, #e2e8f0);
}
.timeline-item { position: relative; margin-bottom: 1.5rem; padding-left: 1.5rem; }
.timeline-marker {
  position: absolute;
  left: -1.5rem;
  top: 0.25rem;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: var(--ctc-primary, #2563eb);
  border: 2px solid var(--ctc-neutral-lightest, #ffffff);
  box-shadow: 0 0 0 2px var(--ctc-primary, #2563eb);
}
.timeline-content { padding-bottom: 0.5rem; }

/* Checklist component */
.checklist { list-style: none; padding: 0; }
.checklist-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0;
}
.checklist-icon { flex-shrink: 0; color: var(--ctc-success, #10b981); font-size: 1.1rem; }

/* CTA section */
.article-cta {
  background: linear-gradient(135deg, var(--ctc-primary, #2563eb), var(--ctc-primary-dark, #1e40af));
  color: var(--ctc-neutral-lightest, #ffffff);
  padding: 3rem;
  border-radius: var(--ctc-radius-lg, 12px);
  text-align: center;
  margin: 2rem 0;
}
.cta-actions { margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
.cta-primary {
  display: inline-block;
  padding: 0.75rem 2rem;
  background: var(--ctc-neutral-lightest, #ffffff);
  color: var(--ctc-primary, #2563eb);
  border-radius: var(--ctc-radius-md, 8px);
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}
.cta-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
.cta-secondary {
  display: inline-block;
  padding: 0.75rem 2rem;
  background: transparent;
  color: var(--ctc-neutral-lightest, #ffffff);
  border: 2px solid rgba(255,255,255,0.5);
  border-radius: var(--ctc-radius-md, 8px);
  font-weight: 600;
  text-decoration: none;
  transition: border-color 0.2s;
}
.cta-secondary:hover { border-color: rgba(255,255,255,0.9); }

/* Table styling */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
  font-size: 0.95rem;
}
th {
  background: var(--ctc-primary, #2563eb);
  color: var(--ctc-neutral-lightest, #ffffff);
  font-weight: 600;
  padding: 0.75rem 1rem;
  text-align: left;
}
td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--ctc-borders-dividers, #e2e8f0);
}
tr:nth-child(even) td { background: var(--ctc-secondary, #f9fafb); }

/* Blockquote */
blockquote {
  border-left: 4px solid var(--ctc-primary, #2563eb);
  padding: 1rem 1.5rem;
  margin: 1.5rem 0;
  background: var(--ctc-secondary, #f9fafb);
  border-radius: 0 var(--ctc-radius-md, 8px) var(--ctc-radius-md, 8px) 0;
  font-style: italic;
  color: var(--ctc-text-dark, #1e293b);
}

/* Image placeholders */
.ctc-image-placeholder {
  background: var(--ctc-secondary, #f0f4f8);
  border: 2px dashed var(--ctc-borders-dividers, #cbd5e1);
  border-radius: var(--ctc-radius-md, 8px);
  padding: 2rem;
  text-align: center;
  color: var(--ctc-text-medium, #64748b);
  font-style: italic;
  margin: 1.5rem 0;
}

/* Responsive */
@media (max-width: 768px) {
  .feature-grid.columns-2,
  .feature-grid.columns-3 { grid-template-columns: 1fr; }
  .columns-2-column .section-content,
  .columns-3-column .section-content { column-count: 1; }
  .columns-asymmetric-left .section-content,
  .columns-asymmetric-right .section-content { grid-template-columns: 1fr; }
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .article-cta { padding: 2rem 1.5rem; }
  .emphasis-hero { padding: 2rem 0; }
  .step-item { flex-direction: column; }
  .summary-box, .definition-box { flex-direction: column; }
}

@media (max-width: 480px) {
  .stat-grid { grid-template-columns: 1fr; }
  .section-container { padding: 0 1rem; }
}
`;
  }

  /**
   * Generate base CSS styles - typography, layout, basic elements
   */
  private generateBaseCSS(
    primary: string,
    primaryDark: string,
    textDark: string,
    textMedium: string,
    bgLight: string,
    border: string,
    headingFont: string,
    bodyFont: string,
    radiusSm: string,
    radiusMd: string,
    radiusLg: string,
    accent: string
  ): string {
    return `
/* ==========================================================================
   Clean Article Styles - Generated for ${this.brandName}
   Brand Primary: ${primary}
   ========================================================================== */

/* Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Base Typography */
html { font-size: 16px; scroll-behavior: smooth; }

body {
  font-family: ${bodyFont};
  font-size: 1rem;
  line-height: 1.7;
  color: ${textDark};
  background-color: #ffffff;
  -webkit-font-smoothing: antialiased;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  font-family: ${headingFont};
  font-weight: 700;
  color: ${primaryDark};
  line-height: 1.3;
  margin-bottom: 1rem;
}

h1 { font-size: 2.5rem; }
h2 { font-size: 1.875rem; margin-top: 2.5rem; }
h3 { font-size: 1.5rem; margin-top: 2rem; }
h4 { font-size: 1.25rem; margin-top: 1.5rem; }

p { margin-bottom: 1.25rem; max-width: 70ch; }

a { color: ${primary}; text-decoration: none; transition: color 0.2s; }
a:hover { color: ${primaryDark}; text-decoration: underline; }

strong { font-weight: 600; color: ${primaryDark}; }

/* Article Header - branded hero with gradient */
.article-header {
  padding: 4rem 2rem 3rem;
  background: linear-gradient(135deg, ${primaryDark} 0%, ${primary} 100%);
  position: relative;
  overflow: hidden;
}

.article-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, ${primary}, ${accent});
}

.article-header-inner {
  max-width: 900px;
  margin: 0 auto;
}

.article-header h1 {
  max-width: 900px;
  margin: 0 auto;
  font-size: 2.5rem;
  color: #ffffff;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

/* Table of Contents - minimal semantic styling */
.article-toc {
  max-width: 900px;
  margin: 2rem auto;
  padding: 1.5rem 2rem;
  border-left: 3px solid ${primary};
  background: ${bgLight};
}

.article-toc ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.article-toc li a {
  color: ${textDark};
  padding: 0.5rem 0;
  display: block;
  border-bottom: 1px solid transparent;
  transition: all 0.2s;
}

.article-toc li a:hover {
  color: ${primary};
  border-bottom-color: ${primary};
  text-decoration: none;
}

/* Main Content */
main {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 2rem;
}

article {
  padding: 2rem 0;
}

/* Sections - with visual rhythm using brand primary */
.section {
  padding: 3rem 0;
}

.section:nth-child(even of .section) {
  background: ${primary}06;
}

.section + .section {
  border-top: 1px solid ${primary}12;
}

.section:last-child {
  border-bottom: none;
}

.section-alt {
  background: ${primary}0a;
  margin: 0 -2rem;
  padding: 3rem 2rem;
  border-radius: ${radiusMd};
}

.section-inner {
  max-width: 100%;
}

/* Lists */
ul, ol {
  padding-left: 1.5rem;
  margin-bottom: 1.5rem;
}

li {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

ul li::marker {
  color: ${primary};
}

/* Tables */
.table-wrapper {
  overflow-x: auto;
  margin: 2rem 0;
  border-radius: ${radiusMd};
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

thead {
  background: ${primary};
  color: #ffffff;
}

th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
}

td {
  padding: 1rem;
  border-bottom: 1px solid ${bgLight};
}

tbody tr:hover {
  background: ${bgLight};
}

/* Images */
figure {
  margin: 2rem 0;
}

figure img {
  width: 100%;
  height: auto;
  border-radius: ${radiusMd};
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

figcaption {
  font-size: 0.875rem;
  color: ${textMedium};
  text-align: center;
  margin-top: 0.75rem;
}

/* Blockquotes */
blockquote {
  border-left: 4px solid ${primary};
  padding: 1.5rem 2rem;
  margin: 2rem 0;
  background: ${bgLight};
  border-radius: 0 ${radiusMd} ${radiusMd} 0;
}

blockquote p {
  font-size: 1.1rem;
  font-style: italic;
  color: ${textMedium};
  margin-bottom: 0;
}

/* CTA - only rendered if content provided */
.article-cta {
  max-width: 900px;
  margin: 3rem auto;
  padding: 2rem;
  background: ${bgLight};
  border-radius: ${radiusMd};
  text-align: center;
}

.article-cta h2 {
  color: ${primaryDark};
  margin-top: 0;
}

.cta-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 1.5rem;
}

.cta-primary, .cta-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: ${radiusSm};
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}

.cta-primary {
  background: ${primary};
  color: #ffffff;
}

.cta-primary:hover {
  background: ${primaryDark};
  text-decoration: none;
}

.cta-secondary {
  background: transparent;
  color: ${primary};
  border: 1px solid ${primary};
}

.cta-secondary:hover {
  background: ${primary};
  color: #ffffff;
  text-decoration: none;
}

/* Responsive */
@media (max-width: 768px) {
  .article-header { padding: 2rem 1rem; }
  .article-header h1 { font-size: 1.75rem; }

  .article-toc { margin: 1.5rem 1rem; padding: 1rem; }

  main { padding: 0 1rem; }

  .section-alt { margin: 0 -1rem; padding: 2rem 1rem; }

  h2 { font-size: 1.5rem; }
  h3 { font-size: 1.25rem; }

  .article-cta { margin: 2rem 1rem; padding: 1.5rem; }

  .cta-actions { flex-direction: column; }
  .cta-primary, .cta-secondary { width: 100%; text-align: center; }
}
`;
  }

  /**
   * Generate CSS for emphasis levels (hero, featured, standard, supporting, minimal)
   * Maps Layout Engine emphasis decisions to visual styling
   */
  private generateEmphasisCSS(
    primary: string,
    primaryDark: string,
    accent: string,
    bgLight: string,
    headingFont: string,
    radiusMd: string,
    radiusLg: string
  ): string {
    return `
/* ==========================================================================
   EMPHASIS LEVELS - Visual styling from Layout Engine decisions
   ========================================================================== */

/* Hero emphasis - Maximum visual impact */
.emphasis-hero {
  padding: 4rem 2rem;
  background: linear-gradient(135deg, ${primary}10 0%, ${primary}05 100%);
  border-radius: ${radiusLg};
  margin: 2rem 0;
  position: relative;
}

.emphasis-hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, ${primary}, ${accent});
  border-radius: ${radiusLg} ${radiusLg} 0 0;
}

.emphasis-hero .section-heading {
  font-size: 2.25rem;
  color: ${primary};
  margin-bottom: 1.5rem;
}

/* Featured emphasis - Strong visual presence */
.emphasis-featured {
  padding: 3rem 2rem;
  background: ${primary}08;
  border-radius: ${radiusMd};
  margin: 1.5rem 0;
  border-left: 4px solid ${primary};
}

.emphasis-featured .section-heading {
  font-size: 1.75rem;
  color: ${primary};
}

/* Standard emphasis - Default styling */
.emphasis-standard {
  padding: 2rem 0;
}

.emphasis-standard .section-heading {
  font-size: 1.5rem;
}

/* Supporting emphasis - Reduced visual weight */
.emphasis-supporting {
  padding: 1.5rem 0;
}

.emphasis-supporting .section-heading {
  font-size: 1.25rem;
  color: ${primary};
}

/* Minimal emphasis - Lightweight styling */
.emphasis-minimal {
  padding: 1rem 0;
}

.emphasis-minimal .section-heading {
  font-size: 1.125rem;
}

/* Emphasis responsive */
@media (max-width: 768px) {
  .emphasis-hero { padding: 2.5rem 1.5rem; }
  .emphasis-hero .section-heading { font-size: 1.75rem; }
  .emphasis-featured { padding: 2rem 1.5rem; }
  .emphasis-featured .section-heading { font-size: 1.5rem; }
}
`;
  }

  /**
   * Generate CSS for steps/timeline content type
   */
  private generateStepsCSS(
    primary: string,
    primaryDark: string,
    bgLight: string,
    headingFont: string,
    radiusMd: string
  ): string {
    return `
/* ==========================================================================
   STEPS/TIMELINE - Numbered process/how-to sections
   ========================================================================== */

.section-steps .steps-list {
  list-style: none;
  padding: 0;
  margin: 1.5rem 0;
  counter-reset: step-counter;
}

.section-steps .step-item {
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem 0;
  border-bottom: 1px solid ${bgLight};
  align-items: flex-start;
}

.section-steps .step-item:last-child {
  border-bottom: none;
}

.section-steps .step-number {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  background: ${primary};
  color: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${headingFont};
  font-weight: 700;
  font-size: 1rem;
}

.section-steps .step-content {
  flex: 1;
  padding-top: 0.25rem;
}

/* Steps with featured emphasis */
.emphasis-featured.section-steps {
  background: ${bgLight};
  padding: 2rem;
  border-radius: ${radiusMd};
}

.emphasis-featured.section-steps .step-number {
  width: 3rem;
  height: 3rem;
  font-size: 1.25rem;
  background: ${primaryDark};
}

/* Steps with hero emphasis */
.emphasis-hero.section-steps .step-number {
  width: 3.5rem;
  height: 3.5rem;
  font-size: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* Steps responsive */
@media (max-width: 768px) {
  .section-steps .step-item { gap: 1rem; padding: 1rem 0; }
  .section-steps .step-number { width: 2rem; height: 2rem; font-size: 0.875rem; }
}
`;
  }

  /**
   * Generate CSS for FAQ content type
   */
  private generateFaqCSS(
    primary: string,
    primaryDark: string,
    textDark: string,
    bgLight: string,
    headingFont: string,
    radiusMd: string
  ): string {
    return `
/* ==========================================================================
   FAQ - Question/Answer pairs
   ========================================================================== */

.section-faq .faq-list {
  margin: 1.5rem 0;
}

.section-faq .faq-item {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid ${bgLight};
}

.section-faq .faq-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.section-faq .faq-question {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-family: ${headingFont};
  font-weight: 600;
  font-size: 1.125rem;
  color: ${primaryDark};
  margin-bottom: 0.75rem;
}

.section-faq .faq-icon {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  background: ${primary};
  color: #ffffff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
}

.section-faq .faq-answer {
  margin-left: 2.5rem;
  color: ${textDark};
  line-height: 1.7;
}

/* FAQ with featured emphasis */
.emphasis-featured.section-faq .faq-item {
  background: #ffffff;
  padding: 1.5rem;
  border-radius: ${radiusMd};
  border-bottom: none;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.emphasis-featured.section-faq .faq-answer {
  margin-left: 0;
  margin-top: 1rem;
}

/* FAQ responsive */
@media (max-width: 768px) {
  .section-faq .faq-answer { margin-left: 0; margin-top: 0.75rem; }
}
`;
  }

  /**
   * Generate CSS for comparison/table content type
   */
  private generateComparisonCSS(
    primary: string,
    bgLight: string,
    radiusMd: string
  ): string {
    return `
/* ==========================================================================
   COMPARISON - Tables with visual enhancements
   ========================================================================== */

.section-comparison .table-wrapper {
  margin: 1.5rem 0;
  border-radius: ${radiusMd};
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.section-comparison table {
  border-collapse: collapse;
  width: 100%;
}

.section-comparison thead {
  background: ${primary};
  color: #ffffff;
}

.section-comparison th {
  padding: 1rem 1.25rem;
  text-align: left;
  font-weight: 600;
}

.section-comparison td {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${bgLight};
}

.section-comparison tbody tr:hover {
  background: ${bgLight};
}

.section-comparison tbody tr:last-child td {
  border-bottom: none;
}

/* Comparison with featured emphasis */
.emphasis-featured.section-comparison .table-wrapper {
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}

.emphasis-featured.section-comparison th {
  padding: 1.25rem 1.5rem;
  font-size: 1.05rem;
}
`;
  }

  /**
   * Generate CSS for list content type
   */
  private generateListCSS(
    primary: string,
    textDark: string,
    textMedium: string
  ): string {
    return `
/* ==========================================================================
   LIST - Styled bullet/feature lists
   ========================================================================== */

.section-list .styled-list {
  list-style: none;
  padding: 0;
  margin: 1.5rem 0;
}

.section-list .list-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.section-list .list-marker {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  background: ${primary};
  border-radius: 50%;
  margin-top: 0.5rem;
}

.section-list .list-content {
  flex: 1;
  color: ${textDark};
}

/* List with featured emphasis - card style */
.emphasis-featured.section-list .list-item {
  padding: 1rem;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
  border-left: 3px solid ${primary};
}

.emphasis-featured.section-list .list-marker {
  width: 0.75rem;
  height: 0.75rem;
}
`;
  }

  /**
   * Generate CSS for summary/key takeaways content type
   */
  private generateSummaryCSS(
    primary: string,
    primaryDark: string,
    bgLight: string,
    radiusMd: string
  ): string {
    return `
/* ==========================================================================
   SUMMARY - Key takeaways, conclusions
   ========================================================================== */

.section-summary .summary-box {
  display: flex;
  gap: 1.25rem;
  padding: 1.5rem;
  background: ${bgLight};
  border-radius: ${radiusMd};
  border-left: 4px solid ${primary};
  margin: 1.5rem 0;
}

.section-summary .summary-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.section-summary .summary-content {
  flex: 1;
}

.section-summary .summary-content ul {
  margin: 0.5rem 0;
  padding-left: 1.25rem;
}

.section-summary .summary-content li {
  margin-bottom: 0.5rem;
}

/* Summary with featured emphasis */
.emphasis-featured.section-summary .summary-box {
  padding: 2rem;
  background: linear-gradient(135deg, ${bgLight} 0%, #ffffff 100%);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.emphasis-featured.section-summary .summary-icon {
  font-size: 2rem;
}

/* Summary with hero emphasis */
.emphasis-hero.section-summary .summary-box {
  padding: 2.5rem;
  text-align: center;
  flex-direction: column;
  align-items: center;
}

.emphasis-hero.section-summary .summary-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}
`;
  }

  /**
   * Generate CSS for definition content type
   */
  private generateDefinitionCSS(
    primary: string,
    bgLight: string,
    radiusMd: string
  ): string {
    return `
/* ==========================================================================
   DEFINITION - Term definitions, glossary entries
   ========================================================================== */

.section-definition .definition-box {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: ${bgLight};
  border-radius: ${radiusMd};
  margin: 1.5rem 0;
}

.section-definition .definition-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.section-definition .definition-content {
  flex: 1;
}

/* Definition with featured emphasis */
.emphasis-featured.section-definition .definition-box {
  border: 2px solid ${primary};
  background: #ffffff;
}
`;
  }

  /**
   * Generate CSS for testimonial content type
   */
  private generateTestimonialCSS(
    primary: string,
    textMedium: string,
    bgLight: string,
    radiusMd: string
  ): string {
    return `
/* ==========================================================================
   TESTIMONIAL - Quotes, reviews, social proof
   ========================================================================== */

.section-testimonial .testimonial {
  position: relative;
  padding: 2rem;
  background: ${bgLight};
  border-radius: ${radiusMd};
  margin: 1.5rem 0;
  border-left: 4px solid ${primary};
}

.section-testimonial .testimonial::before {
  content: '"';
  position: absolute;
  top: -0.5rem;
  left: 1rem;
  font-size: 4rem;
  color: ${primary};
  opacity: 0.2;
  font-family: Georgia, serif;
  line-height: 1;
}

.section-testimonial .testimonial-text {
  font-size: 1.125rem;
  font-style: italic;
  color: ${textMedium};
  margin: 0;
  position: relative;
  z-index: 1;
}

/* Testimonial with featured emphasis */
.emphasis-featured.section-testimonial .testimonial {
  padding: 2.5rem;
  text-align: center;
  border-left: none;
  border-top: 4px solid ${primary};
}

.emphasis-featured.section-testimonial .testimonial::before {
  left: 50%;
  transform: translateX(-50%);
}
`;
  }

  // ============================================================================
  // DOCUMENT WRAPPER
  // ============================================================================

  private wrapInDocument(html: string, css: string, title: string): string {
    const headingFont = this.getFont('heading');
    const bodyFont = this.getFont('body');

    // Determine Google Fonts to load
    const fontsToLoad = this.getGoogleFontsUrl();

    return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  ${fontsToLoad ? `<link href="${fontsToLoad}" rel="stylesheet">` : ''}
  <style>
${css}
  </style>
</head>
<body>
${html}
</body>
</html>`;
  }

  // ============================================================================
  // HELPER METHODS - Extract actual values from DesignDNA
  // ============================================================================

  private getColor(type: 'primary' | 'primaryLight' | 'primaryDark' | 'secondary' | 'accent'): string {
    const colors = this.designDna.colors || {};
    const defaults: Record<string, string> = {
      primary: '#3b82f6', primaryLight: '#93c5fd', primaryDark: '#1e40af',
      secondary: '#64748b', accent: '#f59e0b'
    };

    const color = colors[type];
    let hex: string;
    if (!color) hex = defaults[type];
    else if (typeof color === 'string') hex = color;
    else hex = color.hex || defaults[type];

    // Validate: primaryDark MUST be dark enough for text on white backgrounds
    if (type === 'primaryDark') {
      const lum = this.hexLuminance(hex);
      if (lum > 0.4) {
        const primaryHex = this.getColor('primary');
        hex = this.hexLuminance(primaryHex) <= 0.4
          ? this.darkenHexColor(primaryHex, 0.35)
          : defaults['primaryDark'];
        console.warn(`[CleanArticleRenderer] primaryDark too light (lum=${lum.toFixed(2)}), corrected to ${hex}`);
      }
    }

    // Validate: primary should not be near-white
    if (type === 'primary' && this.hexLuminance(hex) > 0.85) {
      hex = defaults['primary'];
      console.warn(`[CleanArticleRenderer] primary too light, using fallback ${hex}`);
    }

    return hex;
  }

  private getNeutral(level: 'darkest' | 'dark' | 'medium' | 'light' | 'lightest'): string {
    const neutrals = this.designDna.colors?.neutrals || {};
    const defaults: Record<string, string> = {
      darkest: '#111827',
      dark: '#374151',
      medium: '#6b7280',
      light: '#e5e7eb',
      lightest: '#f9fafb'
    };
    return neutrals[level] || defaults[level];
  }

  private getFont(type: 'heading' | 'body'): string {
    const typography = this.designDna.typography || {};
    const font = type === 'heading' ? typography.headingFont : typography.bodyFont;

    if (!font) {
      return type === 'heading' ? "'Georgia', serif" : "'Open Sans', Arial, sans-serif";
    }

    let family = font.family || (type === 'heading' ? 'Georgia' : 'Open Sans');
    const fallback = font.fallback || (type === 'heading' ? 'serif' : 'sans-serif');

    // Clean up: strip existing quotes and fallback stacks from family name
    // e.g. "'Barlow Semi Condensed', sans-serif" → "Barlow Semi Condensed"
    family = family.replace(/^['"]|['"]$/g, ''); // strip outer quotes
    if (family.includes(',')) {
      family = family.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
    }

    return `'${family}', ${fallback}`;
  }

  private getRadius(size: 'small' | 'medium' | 'large'): string {
    const shapes = this.designDna.shapes || {};
    const borderRadius = shapes.borderRadius;

    const defaults: Record<string, string> = {
      small: '4px',
      medium: '8px',
      large: '16px'
    };

    if (!borderRadius || typeof borderRadius !== 'object') {
      return defaults[size];
    }

    return borderRadius[size] || defaults[size];
  }

  /** WCAG 2.0 relative luminance */
  private hexLuminance(hex: string): number {
    const clean = hex.replace('#', '');
    if (clean.length < 6) return 0.5;
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  /** Darken a hex color by factor (0-1). factor=0.35 makes color 35% darker. */
  private darkenHexColor(hex: string, factor: number): string {
    const clean = hex.replace('#', '');
    const r = Math.max(0, Math.round(parseInt(clean.substring(0, 2), 16) * (1 - factor)));
    const g = Math.max(0, Math.round(parseInt(clean.substring(2, 4), 16) * (1 - factor)));
    const b = Math.max(0, Math.round(parseInt(clean.substring(4, 6), 16) * (1 - factor)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private getGoogleFontsUrl(): string | null {
    const typography = this.designDna.typography || {};
    const fonts: string[] = [];

    const headingFont = typography.headingFont?.family;
    const bodyFont = typography.bodyFont?.family;

    // Common Google Fonts - add to URL if detected
    const googleFonts = ['Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Roboto Slab',
      'Playfair Display', 'Merriweather', 'Source Sans Pro', 'Raleway', 'Poppins',
      'Nunito', 'Ubuntu', 'Work Sans', 'Fira Sans', 'Inter'];

    if (headingFont && googleFonts.some(f => headingFont.includes(f))) {
      fonts.push(headingFont.replace(/\s+/g, '+') + ':wght@400;700');
    }

    if (bodyFont && bodyFont !== headingFont && googleFonts.some(f => bodyFont.includes(f))) {
      fonts.push(bodyFont.replace(/\s+/g, '+') + ':wght@400;600');
    }

    if (fonts.length === 0) return null;

    return `https://fonts.googleapis.com/css2?family=${fonts.join('&family=')}&display=swap`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Render article to clean, design-agency quality HTML
 *
 * @param article - Article content (title + sections)
 * @param designDna - Brand design DNA (colors, fonts, etc.)
 * @param brandName - Name of the brand (for display)
 * @param layoutBlueprint - Optional Layout Engine blueprint for component/emphasis decisions
 * @param compiledCss - THE KEY FIX: AI-generated CSS unique to this brand (from BrandDesignSystem)
 * @returns Complete standalone HTML document
 */
export function renderCleanArticle(
  article: ArticleInput,
  designDna: DesignDNA,
  brandName: string = 'Brand',
  layoutBlueprint?: LayoutBlueprintInput,
  compiledCss?: string
): CleanRenderOutput {
  const renderer = new CleanArticleRenderer(designDna, brandName, layoutBlueprint, compiledCss);
  return renderer.render(article);
}
