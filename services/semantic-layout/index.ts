/**
 * Semantic Layout Engine
 *
 * AI-driven layout engine that produces design-agency quality HTML
 * while maintaining strict semantic SEO compliance.
 *
 * Key features:
 * - AI analyzes each section to determine optimal visual presentation
 * - Transforms prose content into structured data (cards, timelines, tables)
 * - Validates output against Cost of Retrieval optimization rules
 * - Produces visually distinct, brand-consistent output
 *
 * Uses the centralized AI service layer for proper telemetry and billing.
 *
 * @module services/semantic-layout
 */

// Types
export * from './types';

// Services
export { LayoutIntelligenceService } from './LayoutIntelligenceService';
export { SemanticRenderer } from './SemanticRenderer';

// Prompts (for customization)
export {
  generateSectionAnalysisPrompt,
  generateBatchAnalysisPrompt,
  generateAccessoryPrompt,
} from './prompts/sectionAnalysis';

export {
  getTransformationPrompt,
  generateCardTransformationPrompt,
  generateTimelineTransformationPrompt,
  generateTableTransformationPrompt,
  generateStatsTransformationPrompt,
  generateFAQTransformationPrompt,
  generateListTransformationPrompt,
} from './prompts/structureTransformation';

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

import type {
  ArticleContext,
  ArticleSectionInput,
  SemanticLayoutBlueprint,
  RenderedArticle,
  BrandContext,
  BusinessContext,
  ContentContext,
  SEOContext,
} from './types';
import { LayoutIntelligenceService } from './LayoutIntelligenceService';
import { SemanticRenderer } from './SemanticRenderer';
import { setLayoutUsageContext } from '../ai/layoutIntelligence';
import type { BrandDesignSystem } from '../../types/designDna';
import type { BusinessInfo, ContentBrief, TopicalMap } from '../../types';
import type { DesignDNA } from '../../types/designDna';

/**
 * Options for SemanticLayoutEngine
 *
 * Uses BusinessInfo for centralized provider management and telemetry.
 */
export interface SemanticLayoutEngineOptions {
  /** Business info containing API keys and provider settings */
  businessInfo: BusinessInfo;
  /** React dispatch for logging */
  dispatch: React.Dispatch<any>;
  /** Enable debug logging */
  debug?: boolean;
}

export interface ArticleInput {
  title: string;
  sections: Array<{
    id: string;
    heading: string;
    headingLevel?: number;
    content: string;
  }>;
}

export interface RenderOptions {
  projectId: string;
  mapId?: string;
  topicId?: string;
  brief?: ContentBrief;
  topicalMap?: TopicalMap;
  brandDesignSystem?: BrandDesignSystem;
  designDna?: DesignDNA;
  language?: string;
}

/**
 * Semantic Layout Engine
 *
 * Main entry point for AI-driven layout generation.
 * Uses the centralized AI service layer for proper telemetry and billing.
 *
 * @example
 * ```typescript
 * const engine = new SemanticLayoutEngine({
 *   businessInfo: state.businessInfo,
 *   dispatch: dispatch,
 *   debug: true
 * });
 *
 * const result = await engine.render(article, {
 *   projectId: 'project-123',
 *   brandDesignSystem: extractedBrand
 * });
 * ```
 */
export class SemanticLayoutEngine {
  private intelligenceService: LayoutIntelligenceService;
  private renderer: SemanticRenderer;
  private debug: boolean;

  constructor(options: SemanticLayoutEngineOptions) {
    this.debug = options.debug ?? false;
    this.intelligenceService = new LayoutIntelligenceService({
      businessInfo: options.businessInfo,
      dispatch: options.dispatch,
      debug: this.debug,
    });
    this.renderer = new SemanticRenderer();
  }

  /**
   * Build article context from inputs
   */
  async buildContext(
    article: ArticleInput,
    options: RenderOptions
  ): Promise<ArticleContext> {
    if (this.debug) {
      console.log('[SemanticLayoutEngine] Building context for:', article.title);
    }

    // Set usage context for telemetry
    setLayoutUsageContext({
      projectId: options.projectId,
      mapId: options.mapId,
      topicId: options.topicId,
    });

    // Build business context from topical map or defaults
    const businessContext: BusinessContext = this.buildBusinessContext(options);

    // Build content context from article
    const contentContext: ContentContext = this.buildContentContext(article, options);

    // Build SEO context from brief
    const seoContext: SEOContext = this.buildSEOContext(options);

    // Build brand context
    const brandContext: BrandContext = this.buildBrandContext(options);

    return {
      business: businessContext,
      content: contentContext,
      seo: seoContext,
      brand: brandContext,
    };
  }

  /**
   * Generate semantic layout blueprint
   */
  async generateBlueprint(context: ArticleContext): Promise<SemanticLayoutBlueprint> {
    if (this.debug) {
      console.log('[SemanticLayoutEngine] Generating blueprint...');
    }

    return this.intelligenceService.generateBlueprint(context);
  }

  /**
   * Render blueprint to HTML
   */
  async renderBlueprint(
    blueprint: SemanticLayoutBlueprint,
    brandContext: BrandContext
  ): Promise<RenderedArticle> {
    if (this.debug) {
      console.log('[SemanticLayoutEngine] Rendering blueprint...');
    }

    return this.renderer.render(blueprint, brandContext);
  }

  /**
   * Complete render pipeline: build context → generate blueprint → render
   */
  async render(
    article: ArticleInput,
    options: RenderOptions
  ): Promise<RenderedArticle> {
    console.log('[SemanticLayoutEngine] Starting render pipeline for:', article.title);

    // Build context
    const context = await this.buildContext(article, options);

    // Generate blueprint with AI intelligence
    const blueprint = await this.generateBlueprint(context);

    // Render to HTML
    const rendered = await this.renderBlueprint(blueprint, context.brand);

    console.log('[SemanticLayoutEngine] Render complete:', {
      sections: blueprint.sections.length,
      wordCount: rendered.metadata.wordCount,
      domNodes: rendered.metadata.domNodeCount,
      textRatio: (rendered.metadata.textToCodeRatio * 100).toFixed(1) + '%',
    });

    return rendered;
  }

  // =========================================================================
  // CONTEXT BUILDERS
  // =========================================================================

  private buildBusinessContext(options: RenderOptions): BusinessContext {
    const map = options.topicalMap;
    const business = map?.business_info;

    return {
      centralEntity: business?.seedKeyword || business?.projectName || 'Brand',
      sourceContext: business?.model || 'General business',
      targetAudience: business?.audience || 'General audience',
      industry: business?.industry || 'General',
      monetizationModel: this.inferMonetizationModel(business),
      brandPersonality: {
        professional: 70,
        innovative: 50,
        trustworthy: 80,
        friendly: 60,
        authoritative: 70,
        primaryTrait: 'Professional',
      },
    };
  }

  private buildContentContext(
    article: ArticleInput,
    options: RenderOptions
  ): ContentContext {
    const brief = options.brief;
    const sections: ArticleSectionInput[] = article.sections.map((s, i) => ({
      id: s.id,
      heading: s.heading,
      headingLevel: (s.headingLevel || 2) as 1 | 2 | 3 | 4,
      content: s.content,
      wordCount: s.content.split(/\s+/).length,
      position: i,
    }));

    const totalWordCount = sections.reduce((sum, s) => sum + s.wordCount, 0);

    return {
      title: article.title,
      sections,
      totalWordCount,
      primaryKeyword: brief?.targetKeyword || article.title,
      searchIntent: this.inferSearchIntent(brief),
      contentType: this.inferContentType(brief, options.topicalMap),
      language: options.language || 'nl',
    };
  }

  private buildSEOContext(options: RenderOptions): SEOContext {
    const brief = options.brief;

    return {
      eavTriples: brief?.eavs || [],
      fsTargets: this.extractFSTargets(brief),
      internalLinks: [],
      competitorGaps: [],
      relatedKeywords: brief?.discourse_anchors || [],
    };
  }

  private buildBrandContext(options: RenderOptions): BrandContext {
    const designDna = options.designDna;
    const brandSystem = options.brandDesignSystem;

    return {
      designSystem: brandSystem,
      designDna,
      colorPalette: {
        primary: designDna?.colors?.primary?.hex || brandSystem?.tokens?.json?.['--color-primary'] || '#3b82f6',
        secondary: designDna?.colors?.secondary?.hex || brandSystem?.tokens?.json?.['--color-secondary'] || '#64748b',
        accent: designDna?.colors?.accent?.hex || brandSystem?.tokens?.json?.['--color-accent'] || '#f59e0b',
        background: designDna?.colors?.neutrals?.lightest || '#ffffff',
        text: designDna?.colors?.neutrals?.darkest || '#1f2937',
      },
      typography: {
        headingFont: designDna?.typography?.headingFont?.family || 'Georgia',
        bodyFont: designDna?.typography?.bodyFont?.family || 'Open Sans',
        baseFontSize: '16px',
      },
      brandName: brandSystem?.brandName || 'Brand',
    };
  }

  // =========================================================================
  // INFERENCE HELPERS
  // =========================================================================

  private inferMonetizationModel(business: any): BusinessContext['monetizationModel'] {
    if (!business) return 'other';

    const sc = (business.model || '').toLowerCase();
    if (sc.includes('ecommerce') || sc.includes('shop')) return 'ecommerce';
    if (sc.includes('saas') || sc.includes('software')) return 'saas';
    if (sc.includes('agency') || sc.includes('service')) return 'agency';
    if (sc.includes('publish') || sc.includes('media')) return 'publisher';
    if (sc.includes('affiliate')) return 'affiliate';
    return 'other';
  }

  private inferSearchIntent(brief?: ContentBrief): ContentContext['searchIntent'] {
    if (!brief) return 'informational';

    const intent = brief.searchIntent?.toLowerCase() || '';
    if (intent.includes('transactional')) return 'transactional';
    if (intent.includes('commercial')) return 'commercial-investigation';
    if (intent.includes('comparison')) return 'comparison';
    if (intent.includes('navigational')) return 'navigational';
    return 'informational';
  }

  private inferContentType(
    brief?: ContentBrief,
    map?: TopicalMap
  ): ContentContext['contentType'] {
    if (!brief) return 'blog';

    // Infer content type from topic_class and search intent
    const briefAny = brief as unknown as Record<string, unknown>;
    if (briefAny.isPillar || briefAny.topicType === 'pillar') return 'pillar';
    if (briefAny.topicType === 'cluster') return 'cluster';
    if (briefAny.topicType === 'supporting') return 'supporting';

    // Fallback: use topic_class if available
    if (brief.topic_class === 'monetization') return 'landing';

    return 'blog';
  }

  private extractFSTargets(brief?: ContentBrief): SEOContext['fsTargets'] {
    if (!brief?.structured_outline) return [];

    // Extract questions from outline that could be FS targets
    const targets: SEOContext['fsTargets'] = [];

    for (const section of brief.structured_outline) {
      // A section targets a featured snippet when its format_code is 'FS'
      if (section.format_code === 'FS') {
        const fsFormat = brief.featured_snippet_target?.target_type?.toLowerCase() as 'paragraph' | 'list' | 'table' | undefined;
        targets.push({
          question: section.heading,
          fsType: fsFormat || 'paragraph',
          sectionId: section.key || `section-${targets.length}`,
          priority: 'secondary',
        });
      }
    }

    return targets;
  }
}
