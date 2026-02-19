/**
 * CleanArticleRenderer — Coordinator
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
 *
 * Implementation is split across modules:
 * - contentParser.ts: Content parsing and inline markdown processing
 * - cssBuilder.ts: CSS generation from brand design values
 * - designDnaHelpers.ts: DesignDNA value extraction utilities
 */

import type { DesignDNA } from '../../../types/designDna';
import type {
  BlueprintSection,
  ContentType,
  EmphasisLevel,
  ComponentType,
} from '../../layout-engine/types';
import { ComponentRenderer } from './ComponentRenderer';
import { generateComponentStyles } from './ComponentStyles';

// Extracted modules
import {
  parseContent,
  processInlineMarkdown,
  escapeHtml,
  renderBlock,
  renderTable,
} from './contentParser';
import {
  generateStructuralCSS,
  generateBaseCSS,
  generateEmphasisCSS,
  generateStepsCSS,
  generateFaqCSS,
  generateComparisonCSS,
  generateListCSS,
  generateSummaryCSS,
  generateDefinitionCSS,
  generateTestimonialCSS,
} from './cssBuilder';
import {
  getColor,
  getNeutral,
  getFont,
  getRadius,
  mapPersonalityForComponentStyles,
  getGoogleFontsUrl,
} from './designDnaHelpers';

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
   */
  render(article: ArticleInput): CleanRenderOutput {
    this.usedContentTypes.clear();
    this.usedEmphasisLevels.clear();
    this.sectionTelemetry = [];
    this.pipelineWarnings = [];

    const html = this.generateHTML(article);
    const css = this.generateCSS();
    const fullDocument = this.wrapInDocument(html, css, article.title);

    const pipelineTelemetry: import('../../../types/publishing').PipelineTelemetry = {
      cssSources: {
        compiledCss: !!this.compiledCss,
        componentStyles: true,
        structural: true,
        compiledCssLength: this.compiledCss?.length,
      },
      sectionDecisions: this.sectionTelemetry,
      brandInfo: {
        brandName: this.brandName,
        primaryColor: getColor(this.designDna, 'primary'),
        secondaryColor: getColor(this.designDna, 'secondary'),
        accentColor: getColor(this.designDna, 'accent'),
        headingFont: getFont(this.designDna, 'heading'),
        bodyFont: getFont(this.designDna, 'body'),
        personality: this.designDna?.personality?.overall,
        confidence: this.designDna?.confidence?.overall,
      },
      warnings: this.pipelineWarnings,
    };

    return { html, css, fullDocument, pipelineTelemetry };
  }

  // ============================================================================
  // HTML GENERATION
  // ============================================================================

  private generateHTML(article: ArticleInput): string {
    const parts: string[] = [];
    const firstSection = article.sections[0];
    let subtitle: string | undefined;
    if (firstSection?.content) {
      const textOnly = firstSection.content.replace(/<[^>]+>/g, '').trim();
      const firstSentence = textOnly.match(/^[^.!?]+[.!?]/)?.[0];
      if (firstSentence && firstSentence.length > 30 && firstSentence.length < 200) {
        subtitle = firstSentence;
      }
    }

    const totalText = article.sections.map(s => s.content.replace(/<[^>]+>/g, '')).join(' ');
    const wordCount = totalText.split(/\s+/).length;
    const readTime = `${Math.max(1, Math.round(wordCount / 200))} min`;

    parts.push(this.buildHero(article.title, subtitle, { readTime }));

    const tocItems = article.sections
      .filter(s => s.heading)
      .map((s, i) => ({ id: s.id || `section-${i}`, heading: s.heading! }));

    if (tocItems.length > 2) {
      parts.push(this.buildTableOfContents(tocItems));
    }

    parts.push('<main>');
    parts.push('<article>');

    console.log('[CleanArticleRenderer] Starting section rendering with layout blueprint:', {
      hasBlueprint: !!this.layoutBlueprint,
      blueprintSections: this.layoutBlueprint?.sections?.length || 0,
      articleSections: article.sections.length,
      blueprintEmphasisLevels: this.layoutBlueprint?.sections?.map(s => ({ id: s.id, emphasis: s.emphasis?.level })) || [],
    });

    const usedBlueprintIndices = new Set<number>();

    for (let i = 0; i < article.sections.length; i++) {
      const section = article.sections[i];
      const isFirst = i === 0;
      const isAlternate = i % 2 === 1;

      let layoutSection = this.findMatchingLayoutSection(section, i, usedBlueprintIndices);

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
              columns: '1-column' as const,
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
              headingDecoration: { type: 'none' as const },
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

    return parts.join('\n');
  }

  private buildHero(title: string, subtitle?: string, metadata?: { readTime?: string; date?: string }): string {
    return `
<header class="article-header">
  <div class="article-header-inner">
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="article-subtitle">${escapeHtml(subtitle)}</p>` : ''}
    ${metadata?.readTime || metadata?.date ? `
    <div class="article-meta">
      ${metadata.date ? `<span class="meta-item">${escapeHtml(metadata.date)}</span>` : ''}
      ${metadata.readTime ? `<span class="meta-item">${escapeHtml(metadata.readTime)}</span>` : ''}
    </div>` : ''}
  </div>
</header>`;
  }

  private buildTableOfContents(items: { id: string; heading: string }[], language: string = 'en'): string {
    const listItems = items.map((item) =>
      `<li><a href="#${item.id}">${escapeHtml(item.heading)}</a></li>`
    ).join('\n');
    return `
<nav class="article-toc" aria-label="Table of contents">
  <ul>
${listItems}
  </ul>
</nav>`;
  }

  private buildSection(
    section: ArticleSection,
    isFirst: boolean,
    isAlternate: boolean,
    layoutSection?: BlueprintSection
  ): string {
    const sectionId = section.id || '';
    const contentType = layoutSection?.contentType || this.inferContentType(section);
    const emphasisLevel = layoutSection?.emphasis?.level || (isFirst ? 'hero' : 'standard');
    const component = layoutSection?.component?.primaryComponent || this.inferComponent(contentType);
    const variant = layoutSection?.component?.componentVariant || 'default';

    this.usedContentTypes.add(contentType);
    this.usedEmphasisLevels.add(emphasisLevel);

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
      }
    }

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

    const classes = [
      'section',
      `section-${contentType}`,
      `emphasis-${emphasisLevel}`,
      isAlternate && emphasisLevel === 'standard' ? 'section-alt' : '',
    ].filter(Boolean).join(' ');

    const contentHtml = this.buildSemanticHtml(section, contentType);
    const headingLevel = section.headingLevel || 2;
    const headingHtml = section.heading
      ? `<h${headingLevel} class="section-heading">${escapeHtml(section.heading)}</h${headingLevel}>`
      : '';

    return `
<section id="${sectionId}" class="${classes}" data-component="${component}" data-variant="${variant}">
  <div class="section-inner">
    ${headingHtml}
    ${contentHtml}
  </div>
</section>`;
  }

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

  private findMatchingLayoutSection(
    section: ArticleSection,
    articleIndex: number,
    usedIndices: Set<number>
  ): BlueprintSection | undefined {
    if (!this.layoutBlueprint?.sections || this.layoutBlueprint.sections.length === 0) {
      return undefined;
    }
    const blueprintSections = this.layoutBlueprint.sections;

    for (let i = 0; i < blueprintSections.length; i++) {
      if (usedIndices.has(i)) continue;
      if (blueprintSections[i].id === section.id) {
        usedIndices.add(i);
        return blueprintSections[i];
      }
    }

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

    const isIntroSection = section.id.includes('intro');
    if (isIntroSection) return undefined;

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

    if (articleIndex < blueprintSections.length && !usedIndices.has(articleIndex)) {
      usedIndices.add(articleIndex);
      return blueprintSections[articleIndex];
    }

    return undefined;
  }

  private normalizeForComparison(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private headingsAreSimilar(h1: string, h2: string): boolean {
    if (h1 === h2) return true;
    if (h1.includes(h2) || h2.includes(h1)) return true;
    const words1 = h1.split(' ').filter(w => w.length > 0);
    const words2 = h2.split(' ').filter(w => w.length > 0);
    if (words1.length === 0 || words2.length === 0) return false;
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const overlap = [...set1].filter(w => set2.has(w)).length;
    return overlap / Math.max(set1.size, set2.size) >= 0.5;
  }

  private inferContentType(section: ArticleSection): ContentType {
    const heading = (section.heading || '').toLowerCase();
    const content = section.content.toLowerCase();
    if (/step|how to|tutorial|guide|process/i.test(heading) || /^\d+\.\s+/m.test(section.content)) return 'steps';
    if (/faq|question|q&a/i.test(heading) || /\?[\s]*$/m.test(section.content)) return 'faq';
    if (/compare|vs\.|versus|comparison|difference/i.test(heading) ||
        section.content.includes('|') && section.content.split('\n').filter(l => l.includes('|')).length > 2) return 'comparison';
    if (content.includes('- ') || /^\*\s+/m.test(content) || /benefit|feature|advantage|tip/i.test(heading)) return 'list';
    if (/summary|conclusion|takeaway|key point/i.test(heading)) return 'summary';
    if (/intro|overview|what is/i.test(heading) || !section.heading) return 'introduction';
    if (/definition|meaning|what does/i.test(heading)) return 'definition';
    return 'explanation';
  }

  // ============================================================================
  // SEMANTIC HTML BUILDERS — Delegate to contentParser
  // ============================================================================

  private buildSemanticHtml(section: ArticleSection, contentType: ContentType): string {
    switch (contentType) {
      case 'steps': return this.buildStepsHtml(section);
      case 'faq': return this.buildFaqHtml(section);
      case 'comparison': return this.buildComparisonHtml(section);
      case 'list': return this.buildListHtml(section);
      case 'summary': return this.buildSummaryHtml(section);
      case 'testimonial': return this.buildTestimonialHtml(section);
      case 'definition': return this.buildDefinitionHtml(section);
      case 'data': return this.buildDataHtml(section);
      default: return this.buildProseHtml(section);
    }
  }

  private buildStepsHtml(section: ArticleSection): string {
    const parsedBlocks = parseContent(section.content);
    const steps: string[] = [];
    let currentStepContent = '';
    for (const block of parsedBlocks) {
      if (block.type === 'list' && block.items) { steps.push(...block.items); }
      else if (block.type === 'heading') {
        if (currentStepContent) { steps.push(currentStepContent); currentStepContent = ''; }
        currentStepContent = `<strong>${processInlineMarkdown(block.text || '')}</strong>`;
      } else if (block.type === 'paragraph' && block.text) {
        currentStepContent = currentStepContent
          ? currentStepContent + ' ' + processInlineMarkdown(block.text)
          : processInlineMarkdown(block.text);
      }
    }
    if (currentStepContent) steps.push(currentStepContent);
    if (steps.length === 0) return this.buildProseHtml(section);
    return `<ol class="steps-list">${steps.map((step, i) =>
      `<li class="step-item"><span class="step-number">${i + 1}</span><div class="step-content">${step}</div></li>`
    ).join('\n')}</ol>`;
  }

  private buildFaqHtml(section: ArticleSection): string {
    const parsedBlocks = parseContent(section.content);
    const faqItems: { question: string; answer: string }[] = [];
    let currentQuestion = '', currentAnswer = '';
    for (const block of parsedBlocks) {
      if (block.type === 'heading' && block.text) {
        if (currentQuestion && currentAnswer) faqItems.push({ question: currentQuestion, answer: currentAnswer });
        currentQuestion = block.text; currentAnswer = '';
      } else if (block.type === 'paragraph' && block.text) {
        if (block.text.endsWith('?') && !currentAnswer) {
          if (currentQuestion && currentAnswer) faqItems.push({ question: currentQuestion, answer: currentAnswer });
          currentQuestion = block.text; currentAnswer = '';
        } else { currentAnswer += (currentAnswer ? ' ' : '') + processInlineMarkdown(block.text); }
      } else { currentAnswer += (currentAnswer ? ' ' : '') + renderBlock(block); }
    }
    if (currentQuestion && currentAnswer) faqItems.push({ question: currentQuestion, answer: currentAnswer });
    if (faqItems.length === 0) return this.buildProseHtml(section);
    return `<dl class="faq-list">${faqItems.map((item) =>
      `<div class="faq-item"><dt class="faq-question"><span class="faq-icon">Q</span>${escapeHtml(item.question)}</dt><dd class="faq-answer">${item.answer}</dd></div>`
    ).join('\n')}</dl>`;
  }

  private buildComparisonHtml(section: ArticleSection): string {
    const parsedBlocks = parseContent(section.content);
    const tableBlock = parsedBlocks.find(b => b.type === 'table');
    if (tableBlock && tableBlock.headers && tableBlock.rows) return renderTable(tableBlock.headers, tableBlock.rows);
    return this.buildProseHtml(section);
  }

  private buildListHtml(section: ArticleSection): string {
    const parsedBlocks = parseContent(section.content);
    return parsedBlocks.map(block => {
      if (block.type === 'list' && block.items) {
        return `<ul class="styled-list">${block.items.map(item =>
          `<li class="list-item"><span class="list-marker"></span><span class="list-content">${processInlineMarkdown(item)}</span></li>`
        ).join('\n')}</ul>`;
      }
      return renderBlock(block);
    }).join('\n');
  }

  private buildSummaryHtml(section: ArticleSection): string {
    const parsedBlocks = parseContent(section.content);
    return `<aside class="summary-box"><div class="summary-icon">💡</div><div class="summary-content">${parsedBlocks.map(block => renderBlock(block)).join('\n')}</div></aside>`;
  }

  private buildTestimonialHtml(section: ArticleSection): string {
    const parsedBlocks = parseContent(section.content);
    return parsedBlocks.map(block => block.type === 'blockquote'
      ? `<blockquote class="testimonial"><p class="testimonial-text">${processInlineMarkdown(block.text || '')}</p></blockquote>`
      : renderBlock(block)
    ).join('\n');
  }

  private buildDefinitionHtml(section: ArticleSection): string {
    const parsedBlocks = parseContent(section.content);
    return `<div class="definition-box"><div class="definition-icon">📖</div><div class="definition-content">${parsedBlocks.map(block => renderBlock(block)).join('\n')}</div></div>`;
  }

  private buildDataHtml(section: ArticleSection): string {
    const parsedBlocks = parseContent(section.content);
    return `<figure class="data-highlight">${parsedBlocks.map(block => renderBlock(block)).join('\n')}</figure>`;
  }

  private buildProseHtml(section: ArticleSection): string {
    return parseContent(section.content).map(block => renderBlock(block)).join('\n');
  }

  private buildCTA(ctaConfig?: { heading?: string; text?: string; primaryText?: string; primaryUrl?: string; secondaryText?: string; secondaryUrl?: string }): string {
    if (!ctaConfig || (!ctaConfig.heading && !ctaConfig.primaryText)) return '';
    const parts: string[] = ['<aside class="article-cta">'];
    if (ctaConfig.heading) parts.push(`<h2>${escapeHtml(ctaConfig.heading)}</h2>`);
    if (ctaConfig.text) parts.push(`<p>${escapeHtml(ctaConfig.text)}</p>`);
    if (ctaConfig.primaryText || ctaConfig.secondaryText) {
      parts.push('<div class="cta-actions">');
      if (ctaConfig.primaryText && ctaConfig.primaryUrl) parts.push(`<a href="${ctaConfig.primaryUrl}" class="cta-primary">${escapeHtml(ctaConfig.primaryText)}</a>`);
      if (ctaConfig.secondaryText && ctaConfig.secondaryUrl) parts.push(`<a href="${ctaConfig.secondaryUrl}" class="cta-secondary">${escapeHtml(ctaConfig.secondaryText)}</a>`);
      parts.push('</div>');
    }
    parts.push('</aside>');
    return parts.join('\n');
  }

  // ============================================================================
  // CSS GENERATION — Delegates to cssBuilder + designDnaHelpers
  // ============================================================================

  private generateCSS(): string {
    if (this.compiledCss) {
      console.log('[CleanArticleRenderer] Using AI-generated compiledCss + component visual styles');
      const brandColors = {
        primaryColor: getColor(this.designDna, 'primary'),
        primaryDark: getColor(this.designDna, 'primaryDark'),
        secondaryColor: getColor(this.designDna, 'secondary'),
        accentColor: getColor(this.designDna, 'accent'),
        textColor: getNeutral(this.designDna, 'dark'),
        textMuted: getNeutral(this.designDna, 'medium'),
        backgroundColor: '#ffffff',
        surfaceColor: getNeutral(this.designDna, 'lightest'),
        borderColor: getNeutral(this.designDna, 'light'),
        headingFont: getFont(this.designDna, 'heading'),
        bodyFont: getFont(this.designDna, 'body'),
        radiusSmall: getRadius(this.designDna, 'small'),
        radiusMedium: getRadius(this.designDna, 'medium'),
        radiusLarge: getRadius(this.designDna, 'large'),
        personality: mapPersonalityForComponentStyles(this.designDna?.personality?.overall),
      };
      const componentCss = generateComponentStyles(brandColors);
      const personality = this.designDna?.personality?.overall || 'corporate';
      const pageBgOverride = personality === 'luxurious' ? '#faf9f7' : personality === 'creative' ? `${brandColors.primaryColor}08` : '#ffffff';
      const safetyOverrides = `
/* === Safety Overrides (personality: ${personality}) === */
body { background-color: ${pageBgOverride}; }
.section-heading { font-weight: 700; color: ${brandColors.primaryDark}; }
.prose h2, .prose h3, .prose h4 { font-weight: 600; }
.faq-question { font-weight: 600; }
.emphasis-featured { font-style: normal; font-weight: normal; }
.emphasis-standard { font-style: normal; font-weight: normal; }
.emphasis-featured .section-heading,
.emphasis-standard .section-heading,
.emphasis-hero .section-heading { font-weight: 700; }
.section-content p, .prose p, .card-body p { font-weight: normal; }
`;
      return `${componentCss}\n\n/* === Brand-Specific Overrides (compiledCss) === */\n${this.compiledCss}\n\n${generateStructuralCSS()}${safetyOverrides}`;
    }

    console.log('[CleanArticleRenderer] Generating fallback CSS from DesignDNA');
    const primary = getColor(this.designDna, 'primary');
    const primaryDark = getColor(this.designDna, 'primaryDark');
    const secondary = getColor(this.designDna, 'secondary');
    const accent = getColor(this.designDna, 'accent');
    const textDark = getNeutral(this.designDna, 'dark');
    const textMedium = getNeutral(this.designDna, 'medium');
    const bgLight = getNeutral(this.designDna, 'lightest');
    const border = getNeutral(this.designDna, 'light');
    const headingFont = getFont(this.designDna, 'heading');
    const bodyFont = getFont(this.designDna, 'body');
    const radiusSm = getRadius(this.designDna, 'small');
    const radiusMd = getRadius(this.designDna, 'medium');
    const radiusLg = getRadius(this.designDna, 'large');

    return [
      generateBaseCSS(primary, primaryDark, textDark, textMedium, bgLight, border, headingFont, bodyFont, radiusSm, radiusMd, radiusLg, accent, this.brandName),
      generateEmphasisCSS(primary, primaryDark, accent, bgLight, headingFont, radiusMd, radiusLg),
      generateStepsCSS(primary, primaryDark, bgLight, headingFont, radiusMd),
      generateFaqCSS(primary, primaryDark, textDark, bgLight, headingFont, radiusMd),
      generateComparisonCSS(primary, bgLight, radiusMd),
      generateListCSS(primary, textDark, textMedium),
      generateSummaryCSS(primary, primaryDark, bgLight, radiusMd),
      generateDefinitionCSS(primary, bgLight, radiusMd),
      generateTestimonialCSS(primary, textMedium, bgLight, radiusMd),
      generateComponentStyles({
        primaryColor: primary, primaryDark, secondaryColor: secondary, accentColor: accent,
        textColor: textDark, textMuted: textMedium, backgroundColor: '#ffffff', surfaceColor: bgLight,
        borderColor: border, headingFont, bodyFont, radiusSmall: radiusSm, radiusMedium: radiusMd,
        radiusLarge: radiusLg, personality: mapPersonalityForComponentStyles(this.designDna?.personality?.overall),
      }),
    ].join('\n');
  }

  // ============================================================================
  // DOCUMENT WRAPPER
  // ============================================================================

  private wrapInDocument(html: string, css: string, title: string): string {
    const fontsToLoad = getGoogleFontsUrl(this.designDna);
    return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
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
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Render article to clean, design-agency quality HTML
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
