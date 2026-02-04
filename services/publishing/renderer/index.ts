/**
 * Unified Renderer Entry Point
 *
 * Routes rendering to:
 * 1. BrandAwareComposer when brand extraction exists
 * 2. CleanArticleRenderer when DesignDNA is provided (NO TEMPLATES)
 * 3. BlueprintRenderer as last resort fallback
 *
 * @module services/publishing/renderer
 */

import { BrandAwareComposer } from '../../brand-composer/BrandAwareComposer';
import { ComponentLibrary } from '../../brand-extraction/ComponentLibrary';
import { renderCleanArticle, type CleanRenderOutput } from './CleanArticleRenderer';
import { SemanticLayoutEngine } from '../../semantic-layout';
import type { ContentBrief, EnrichedTopic, TopicalMap, ImagePlaceholder } from '../../../types';
import type { DesignDNA } from '../../../types/designDna';
import type { LayoutBlueprint } from '../architect/blueprintTypes';
import type { StyledContentOutput, CssVariables, RenderInfo, ContentTypeTemplate } from '../../../types/publishing';
import {
  injectImagesIntoContent,
  placeholdersToInjectableImages,
  countUnresolvedPlaceholders,
  type InjectableImage,
  type ImageInjectionResult,
} from './imageInjector';
import type { SectionDesignDecision, BrandComponent } from '../../brand-replication/interfaces';
import {
  mapDecisionsToBlueprint,
  mergeDecisionsWithBlueprint,
  extractBrandCss,
} from '../../brand-replication/integration';
import { validateHeadingStructure } from './contentAdapter';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Article content structure for rendering
 */
export interface ArticleContent {
  title: string;
  sections: Array<{
    id: string;
    heading?: string;
    headingLevel?: number;
    content: string;
    type?: string;
  }>;
}

/**
 * Options for the unified renderContent function
 */
export interface RenderContentOptions {
  /** Project ID for brand extraction lookup */
  projectId: string;
  /** AI provider for brand-aware composition */
  aiProvider?: 'gemini' | 'anthropic' | 'openai';
  /** AI model to use (optional - uses providerConfig defaults if not specified) */
  aiModel?: string;
  /** API key for the primary AI provider (legacy - prefer individual keys below) */
  aiApiKey?: string;
  /** Gemini API key (for direct browser calls) */
  geminiApiKey?: string;
  /** Anthropic API key (uses Supabase proxy) */
  anthropicApiKey?: string;
  /** OpenAI API key (uses Supabase proxy) */
  openAiApiKey?: string;
  /** Layout blueprint for fallback rendering */
  blueprint?: LayoutBlueprint;
  /** Content brief for semantic extraction */
  brief?: ContentBrief;
  /** Topic data */
  topic?: EnrichedTopic;
  /** Topical map for context */
  topicalMap?: TopicalMap;
  /** Design personality override */
  personalityId?: string;
  /** Custom design tokens */
  designTokens?: {
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
      background?: string;
      surface?: string;
      text?: string;
      textMuted?: string;
      border?: string;
    };
    fonts?: {
      heading?: string;
      body?: string;
    };
  };
  /** Include dark mode CSS */
  darkMode?: boolean;
  /** Minify CSS output */
  minifyCss?: boolean;
  /** Language code for localized defaults */
  language?: string;
  /** Hero image URL */
  heroImage?: string;
  /** CTA configuration */
  ctaConfig?: {
    primaryText?: string;
    primaryUrl?: string;
    secondaryText?: string;
    secondaryUrl?: string;
    bannerTitle?: string;
    bannerText?: string;
  };
  /** Author info for author box */
  author?: {
    name: string;
    title?: string;
    bio?: string;
    imageUrl?: string;
  };
  /** Brand design system with AI-generated CSS */
  brandDesignSystem?: {
    brandName?: string;
    compiledCss?: string;
    designDnaHash?: string;
  };
  /** Brand DesignDNA for CleanArticleRenderer (NO templates) */
  designDna?: DesignDNA;
  /** Layout blueprint with component/emphasis decisions from Layout Engine */
  layoutBlueprint?: import('../../layout-engine/types').LayoutBlueprint;
  /** Generated images from content generation (priority 1 for injection) */
  generatedImages?: ImagePlaceholder[];
  /** Brand-extracted images (priority 2 for injection) */
  brandImages?: InjectableImage[];
  /** Extracted components with literal HTML/CSS (bypass database lookup) */
  extractedComponents?: import('../../../types/brandExtraction').ExtractedComponent[];
  /** Use the new Semantic Layout Engine for AI-driven layout decisions */
  useSemanticLayoutEngine?: boolean;
  /** Map ID for semantic layout context */
  mapId?: string;
  /** Topic ID for telemetry */
  topicId?: string;
  /** React dispatch for logging (required for Semantic Layout Engine) */
  dispatch?: React.Dispatch<any>;
  /** Supabase URL for telemetry */
  supabaseUrl?: string;
  /** Supabase anon key for telemetry */
  supabaseAnonKey?: string;
  /**
   * Pipeline decisions from Phase 3 Intelligence.
   * When provided, these AI-driven design decisions override the layout engine's decisions.
   */
  pipelineDecisions?: SectionDesignDecision[];
  /**
   * Brand components from Phase 2 CodeGen.
   * Required when pipelineDecisions is provided to get component CSS.
   */
  pipelineComponents?: BrandComponent[];
  /**
   * Force a specific renderer path:
   * - 'auto': Use normal routing logic (default)
   * - 'brand-templates': Force BrandAwareComposer (PATH A)
   * - 'clean-components': Force CleanArticleRenderer (PATH B)
   */
  rendererPath?: 'auto' | 'brand-templates' | 'clean-components';
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Unified content rendering function.
 *
 * Routes to BrandAwareComposer when brand extraction exists for the project,
 * otherwise falls back to BlueprintRenderer.
 *
 * @param content - Article content to render
 * @param options - Rendering options including project ID and optional blueprint
 * @returns Styled content output with HTML, CSS, and metadata
 */
export async function renderContent(
  content: ArticleContent,
  options: RenderContentOptions
): Promise<StyledContentOutput & { renderMetadata?: { unresolvedImageCount: number } }> {
  // ============================================================================
  // STYLING PIPELINE LOGGING - Step-by-step trace for debugging
  // ============================================================================
  console.log('='.repeat(80));
  console.log('[STYLING PIPELINE] STEP 1: renderContent() ENTRY');
  console.log('='.repeat(80));
  console.log('[STYLING PIPELINE] Input summary:', {
    projectId: options.projectId,
    contentTitle: content.title,
    sectionCount: content.sections.length,
    hasBrief: !!options.brief,
    hasTopic: !!options.topic,
    hasTopicalMap: !!options.topicalMap,
    personalityId: options.personalityId || '(not specified)',
  });
  console.log('[STYLING PIPELINE] Brand data received:', {
    hasBrandDesignSystem: !!options.brandDesignSystem,
    brandName: options.brandDesignSystem?.brandName || '(none)',
    hasCompiledCss: !!options.brandDesignSystem?.compiledCss,
    compiledCssLength: options.brandDesignSystem?.compiledCss?.length || 0,
    designDnaHash: options.brandDesignSystem?.designDnaHash || '(none)',
  });
  console.log('[STYLING PIPELINE] Design tokens received:', {
    hasDesignTokens: !!options.designTokens,
    primaryColor: options.designTokens?.colors?.primary || '(default)',
    secondaryColor: options.designTokens?.colors?.secondary || '(default)',
    headingFont: options.designTokens?.fonts?.heading || '(default)',
    bodyFont: options.designTokens?.fonts?.body || '(default)',
  });
  console.log('[STYLING PIPELINE] Other options:', {
    hasBlueprint: !!options.blueprint,
    blueprintSections: options.blueprint?.sections?.length || 0,
    aiProvider: options.aiProvider || '(none)',
    hasAiApiKey: !!options.aiApiKey,
    language: options.language || 'en',
    darkMode: options.darkMode ?? true,
    minifyCss: options.minifyCss ?? false,
  });
  console.log('[STYLING PIPELINE] Pipeline decisions:', {
    hasPipelineDecisions: !!options.pipelineDecisions,
    decisionCount: options.pipelineDecisions?.length || 0,
    hasPipelineComponents: !!options.pipelineComponents,
    componentCount: options.pipelineComponents?.length || 0,
  });

  // 0. Inject images into content if available
  let processedContent = content;
  let imageInjectionResult: ImageInjectionResult | null = null;

  if (options.generatedImages || options.brandImages) {
    const generatedInjectables = options.generatedImages
      ? placeholdersToInjectableImages(options.generatedImages)
      : [];
    const brandInjectables = options.brandImages || [];

    // Only inject if we have images to inject
    if (generatedInjectables.length > 0 || brandInjectables.length > 0) {
      // Inject into each section's content
      const injectedSections = content.sections.map(section => {
        const result = injectImagesIntoContent(section.content, {
          generated: generatedInjectables,
          brand: brandInjectables,
        });
        return {
          ...section,
          content: result.content,
        };
      });

      processedContent = {
        ...content,
        sections: injectedSections,
      };

      // Count total unresolved across all sections
      const totalUnresolved = injectedSections.reduce((sum, section) => {
        return sum + countUnresolvedPlaceholders(section.content);
      }, 0);

      imageInjectionResult = {
        content: '', // Not used at this level
        injectedCount: generatedInjectables.length - totalUnresolved,
        unresolvedCount: totalUnresolved,
        unresolvedPlaceholders: [],
      };

      console.log('[Renderer] Image injection result:', {
        generatedImagesAvailable: generatedInjectables.length,
        brandImagesAvailable: brandInjectables.length,
        unresolvedCount: totalUnresolved,
      });
    }
  }

  // ============================================================================
  // PIPELINE DECISIONS HANDLING
  // ============================================================================
  // When pipeline decisions are provided, convert them to a layout blueprint
  // This takes precedence over the existing layoutBlueprint option
  let effectiveLayoutBlueprint = options.layoutBlueprint;
  let pipelineCss = '';

  if (options.pipelineDecisions && options.pipelineDecisions.length > 0) {
    console.log('-'.repeat(80));
    console.log('[STYLING PIPELINE] PIPELINE DECISIONS DETECTED');
    console.log('[STYLING PIPELINE] Converting', options.pipelineDecisions.length, 'decisions to layout blueprint');

    // Convert article content to the format expected by the decision mapper
    const articleContent = {
      title: processedContent.title,
      fullContent: processedContent.sections.map(s => s.content).join('\n\n'),
      sections: processedContent.sections.map(s => ({
        id: s.id,
        heading: s.heading || '',
        headingLevel: s.headingLevel || 2,
        content: s.content,
        wordCount: s.content.split(/\s+/).length,
      })),
    };

    // If we have an existing blueprint, merge the decisions; otherwise create new
    if (options.layoutBlueprint) {
      console.log('[STYLING PIPELINE] Merging decisions with existing blueprint');
      effectiveLayoutBlueprint = mergeDecisionsWithBlueprint(
        options.layoutBlueprint,
        options.pipelineDecisions,
        options.pipelineComponents || []
      );
    } else {
      console.log('[STYLING PIPELINE] Creating new blueprint from decisions');
      effectiveLayoutBlueprint = mapDecisionsToBlueprint(
        options.pipelineDecisions,
        options.pipelineComponents || [],
        articleContent,
        {
          brandName: options.brandDesignSystem?.brandName || 'Brand',
        }
      );
    }

    // Extract brand CSS from pipeline components
    if (options.pipelineComponents && options.pipelineComponents.length > 0) {
      pipelineCss = extractBrandCss(options.pipelineDecisions, options.pipelineComponents);
      console.log('[STYLING PIPELINE] Extracted brand CSS:', {
        cssLength: pipelineCss.length,
        componentsUsed: options.pipelineComponents.length,
      });
    }

    console.log('[STYLING PIPELINE] Effective layout blueprint created:', {
      sections: effectiveLayoutBlueprint.sections.length,
      heroSection: effectiveLayoutBlueprint.metadata.heroSectionId,
      averageWeight: effectiveLayoutBlueprint.metadata.averageSemanticWeight,
    });
  }

  // ============================================================================
  // EARLY CHECK: Do we have a complete rendering pipeline?
  // When LayoutBlueprint + BrandDesignSystem compiledCss are both available,
  // skip AI-driven paths (PATH 0, PATH A) and go directly to CleanArticleRenderer.
  // ============================================================================
  const hasCompletePipeline = effectiveLayoutBlueprint &&
    effectiveLayoutBlueprint.sections?.length > 0 &&
    options.brandDesignSystem?.compiledCss;

  // Renderer path overrides
  const forcePathA = options.rendererPath === 'brand-templates';
  const forcePathB = options.rendererPath === 'clean-components';

  if (forcePathA || forcePathB) {
    console.log('[STYLING PIPELINE] Renderer path override:', options.rendererPath);
  }

  // ============================================================================
  // PATH 0: Semantic Layout Engine (NEW - AI-driven layout intelligence)
  // SKIPPED when complete pipeline is available (avoids wasted AI API calls)
  // SKIPPED when renderer path is forced
  // ============================================================================
  if (options.useSemanticLayoutEngine && options.aiApiKey && options.dispatch && !hasCompletePipeline && !forcePathA && !forcePathB) {
    console.log('-'.repeat(80));
    console.log('[STYLING PIPELINE] STEP 2: ROUTING TO SemanticLayoutEngine (AI-DRIVEN)');
    console.log('[STYLING PIPELINE] Reason: useSemanticLayoutEngine=true');
    console.log('[Renderer] Using SemanticLayoutEngine for project:', options.projectId);

    try {
      // Build BusinessInfo for centralized AI service layer
      // Uses user's model preference, falls back to providerConfig defaults
      // All API keys are passed to enable provider fallback if needed
      const businessInfo = {
        aiProvider: options.aiProvider || 'gemini',
        aiModel: options.aiModel || '', // User's preference or providerConfig default
        // Pass all available API keys (supports user's preferred provider + fallback)
        geminiApiKey: options.geminiApiKey || (options.aiProvider === 'gemini' ? options.aiApiKey : undefined),
        anthropicApiKey: options.anthropicApiKey || (options.aiProvider === 'anthropic' ? options.aiApiKey : undefined),
        openAiApiKey: options.openAiApiKey || (options.aiProvider === 'openai' ? options.aiApiKey : undefined),
        // Supabase config required for Anthropic/OpenAI proxy
        supabaseUrl: options.supabaseUrl || '',
        supabaseAnonKey: options.supabaseAnonKey || '',
      } as import('../../../types').BusinessInfo;

      // Log which provider is being used
      console.log('[SemanticLayoutEngine] Using provider:', options.aiProvider || 'gemini',
        'with model:', options.aiModel || '(default)');

      const engine = new SemanticLayoutEngine({
        businessInfo,
        dispatch: options.dispatch,
        debug: true,
      });

      // Build article input
      const articleInput = {
        title: processedContent.title,
        sections: processedContent.sections.map(s => ({
          id: s.id,
          heading: s.heading || '',
          headingLevel: s.headingLevel,
          content: s.content,
        })),
      };

      // Render using Semantic Layout Engine
      const result = await engine.render(articleInput, {
        projectId: options.projectId,
        mapId: options.mapId,
        topicId: options.topicId || options.topic?.id,
        brief: options.brief,
        topicalMap: options.topicalMap,
        brandDesignSystem: options.brandDesignSystem ? {
          brandName: options.brandDesignSystem.brandName || 'Brand',
          compiledCss: options.brandDesignSystem.compiledCss,
        } as any : undefined,
        designDna: options.designDna,
        language: options.language,
      });

      console.log('[STYLING PIPELINE] SemanticLayoutEngine result:', {
        htmlLength: result.html.length,
        cssLength: result.css.length,
        sectionCount: result.metadata.sectionCount,
        componentTypes: Object.keys(result.metadata.componentCount),
        textToCodeRatio: (result.metadata.textToCodeRatio * 100).toFixed(1) + '%',
        domNodeCount: result.metadata.domNodeCount,
      });

      return {
        html: result.html,
        css: result.css,
        cssVariables: {} as CssVariables,
        components: [],
        seoValidation: (() => {
          const hv = validateHeadingStructure(result.html);
          return {
            isValid: hv.isValid,
            warnings: hv.issues.map(msg => ({ type: 'heading' as const, severity: 'warning' as const, message: msg })),
            headingStructure: { hasH1: hv.hasH1, hierarchy: hv.hierarchy.map(h => `h${h.level}: ${h.text}`), issues: hv.issues },
            schemaPreserved: true,
            metaPreserved: true,
          };
        })(),
        template: 'blog-article' as ContentTypeTemplate,
        renderInfo: {
          renderer: 'semantic-layout-engine',
          message: 'Using AI-driven Semantic Layout Engine for design-agency quality output with intelligent component selection',
          reason: 'Semantic Layout Engine transforms prose into visual components (cards, timelines, stats) based on content analysis',
          level: 'info',
          details: {
            brandExtractionUsed: false,
            semanticLayoutUsed: true,
            componentTypes: Object.keys(result.metadata.componentCount),
            textToCodeRatio: result.metadata.textToCodeRatio,
            domNodeCount: result.metadata.domNodeCount,
          },
        },
        renderMetadata: {
          unresolvedImageCount: imageInjectionResult?.unresolvedCount || 0,
        },
      };
    } catch (error) {
      console.error('[STYLING PIPELINE] SemanticLayoutEngine FAILED:', error);
      console.log('[STYLING PIPELINE] Falling back to standard rendering path...');
      // Fall through to other rendering paths
    }
  }

  // 1. Check if extracted components are provided directly (BYPASS DATABASE)
  console.log('-'.repeat(80));
  console.log('[STYLING PIPELINE] STEP 2: Checking for brand extraction components...');
  const hasDirectComponents = options.extractedComponents && options.extractedComponents.length > 0;
  console.log('[STYLING PIPELINE] Direct components provided:', hasDirectComponents ? options.extractedComponents!.length : 0);

  // Also check database as fallback
  const hasDbExtraction = !hasDirectComponents ? await hasBrandExtraction(options.projectId) : false;
  console.log('[STYLING PIPELINE] Database extraction check result:', hasDbExtraction);

  if (hasCompletePipeline && !forcePathA) {
    console.log('[STYLING PIPELINE] SKIPPING BrandAwareComposer - complete pipeline available');
    console.log('[STYLING PIPELINE] Blueprint sections:', effectiveLayoutBlueprint!.sections.length);
    console.log('[STYLING PIPELINE] CompiledCSS length:', options.brandDesignSystem!.compiledCss!.length);
  }

  if (forcePathB) {
    console.log('[STYLING PIPELINE] SKIPPING BrandAwareComposer - forced to clean-components path');
  }

  if (((hasDirectComponents || hasDbExtraction) && options.aiApiKey && !hasCompletePipeline && !forcePathB) || forcePathA) {
    // PATH A: BrandAwareComposer - ONLY when no complete pipeline
    console.log('-'.repeat(80));
    console.log('[STYLING PIPELINE] STEP 3A: ROUTING TO BrandAwareComposer (FALLBACK - no complete pipeline)');
    console.log('[STYLING PIPELINE] Reason: Extracted components available' + (hasDirectComponents ? ' (DIRECT)' : ' (DATABASE)'));
    console.log('[Renderer] Using BrandAwareComposer for project:', options.projectId);

    const composer = new BrandAwareComposer({
      projectId: options.projectId,
      aiProvider: options.aiProvider || 'gemini',
      apiKey: options.aiApiKey
    });

    // Normalize sections to match BrandAwareComposer's expected format
    const normalizedContent = {
      title: processedContent.title,
      sections: processedContent.sections.map(section => ({
        id: section.id,
        heading: section.heading || '',
        headingLevel: section.headingLevel || 2,
        content: section.content
      }))
    };

    // Pass direct components to compose method (they'll be used instead of DB lookup)
    const result = await composer.compose(normalizedContent, options.extractedComponents);

    // CRITICAL SAFETY CHECK: Detect contaminated output and fallback
    const contaminationPatterns = [
      /CybotCookiebot/i,
      /CookiebotDialog/i,
      /onetrust-/i,
      /ot-sdk-/i,
      /cookie-consent/i,
      /gdpr-cookie/i,
    ];

    const isContaminated = contaminationPatterns.some(pattern => pattern.test(result.html));

    // QUALITY CHECK: Detect when output has no useful styling
    // This happens when components have empty theirClassNames arrays
    // or when the extracted CSS doesn't match the HTML structure
    const emptySectionPattern = /<section class="">/g;
    const emptySections = (result.html.match(emptySectionPattern) || []).length;
    const totalSections = (result.html.match(/<section/g) || []).length;
    const isPoorQuality = totalSections > 0 && emptySections >= totalSections * 0.8; // 80%+ empty = poor

    if (isPoorQuality) {
      console.warn('[Renderer] POOR QUALITY OUTPUT DETECTED from BrandAwareComposer');
      console.warn(`[Renderer] ${emptySections}/${totalSections} sections have empty classes`);
      console.warn('[Renderer] Falling back to CleanArticleRenderer with ComponentRenderer');
    }

    if (isContaminated || isPoorQuality) {
      const reason = isContaminated ? 'contamination' : 'poor quality (empty section classes)';
      console.warn(`[Renderer] Falling back to CleanArticleRenderer due to: ${reason}`);

      // Fallback: If we have designDna or designTokens, use CleanArticleRenderer
      if (options.designDna || options.designTokens) {
        // Build a complete DesignDNA from designTokens when no real designDna is available
        const fallbackDna: DesignDNA = options.designDna || {
          colors: {
            primary: { hex: options.designTokens?.colors?.primary || '#1a1a2e', usage: 'primary', confidence: 0.5 },
            primaryLight: { hex: options.designTokens?.colors?.primary || '#3F3F46', usage: 'primary-light', confidence: 0.3 },
            primaryDark: { hex: options.designTokens?.colors?.primary || '#09090B', usage: 'primary-dark', confidence: 0.3 },
            secondary: { hex: options.designTokens?.colors?.secondary || '#4a4a68', usage: 'secondary', confidence: 0.5 },
            accent: { hex: options.designTokens?.colors?.accent || '#71717A', usage: 'accent', confidence: 0.3 },
            neutrals: { lightest: options.designTokens?.colors?.background || '#FFFFFF', light: options.designTokens?.colors?.surface || '#F8FAFC', medium: options.designTokens?.colors?.textMuted || '#64748B', dark: options.designTokens?.colors?.text || '#333333', darkest: '#000000' },
            semantic: { success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
            harmony: 'monochromatic', dominantMood: 'corporate', contrastLevel: 'medium',
          },
          typography: {
            headingFont: { family: options.designTokens?.fonts?.heading || 'system-ui', fallback: 'sans-serif', weight: 700, style: 'sans-serif', character: 'modern' },
            bodyFont: { family: options.designTokens?.fonts?.body || 'system-ui', fallback: 'sans-serif', weight: 400, style: 'sans-serif', lineHeight: 1.6 },
            scaleRatio: 1.25, baseSize: '16px', headingCase: 'none', headingLetterSpacing: '-0.02em',
            usesDropCaps: false, headingUnderlineStyle: 'none', linkStyle: 'underline',
          },
          spacing: { baseUnit: 8, density: 'comfortable', sectionGap: 'moderate', contentWidth: 'medium', whitespacePhilosophy: 'balanced' },
          shapes: { borderRadius: { style: 'subtle', small: '4px', medium: '8px', large: '16px', full: '9999px' }, buttonStyle: 'soft', cardStyle: 'subtle-shadow', inputStyle: 'bordered' },
          effects: {
            shadows: { style: 'subtle', cardShadow: '0 1px 3px rgba(0,0,0,0.12)', buttonShadow: '0 1px 2px rgba(0,0,0,0.08)', elevatedShadow: '0 4px 12px rgba(0,0,0,0.15)' },
            gradients: { usage: 'subtle', primaryGradient: 'linear-gradient(135deg, #1a1a2e 0%, #4a4a68 100%)', heroGradient: 'linear-gradient(180deg, #1a1a2e 0%, #333333 100%)', ctaGradient: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)' },
            backgrounds: { usesPatterns: false, usesTextures: false, usesOverlays: false },
            borders: { style: 'subtle', defaultColor: '#e5e7eb', accentBorderUsage: false },
          },
          decorative: { dividerStyle: 'line', usesFloatingShapes: false, usesCornerAccents: false, usesWaveShapes: false, usesGeometricPatterns: false, iconStyle: 'outline', decorativeAccentColor: '#3b82f6' },
          layout: { gridStyle: 'strict-12', alignment: 'left', heroStyle: 'contained', cardLayout: 'grid', ctaPlacement: 'section-end', navigationStyle: 'standard' },
          motion: { overall: 'subtle', transitionSpeed: 'normal', easingStyle: 'ease', hoverEffects: { buttons: 'darken', cards: 'lift', links: 'underline' }, scrollAnimations: false, parallaxEffects: false },
          images: { treatment: 'natural', frameStyle: 'rounded', hoverEffect: 'none', aspectRatioPreference: '16:9' },
          componentPreferences: { preferredListStyle: 'bullets', preferredCardStyle: 'bordered', testimonialStyle: 'card', faqStyle: 'accordion', ctaStyle: 'button' },
          personality: { overall: 'corporate', formality: 3, energy: 3, warmth: 3, trustSignals: 'moderate' },
          confidence: { overall: 0.4, colorsConfidence: 0.5, typographyConfidence: 0.4, layoutConfidence: 0.3 },
          analysisNotes: ['Fallback DesignDNA - generated from designTokens during contamination/quality fallback'],
        };

        const articleInput = {
          title: processedContent.title,
          sections: processedContent.sections.map(section => ({
            id: section.id,
            heading: section.heading,
            headingLevel: section.headingLevel,
            content: section.content,
          })),
        };

        // USE LAYOUT BLUEPRINT for ComponentRenderer to provide visual variety
        // This is what creates the "wow factor" - timelines, feature grids, etc.
        let layoutBlueprintInput = effectiveLayoutBlueprint ? {
          sections: effectiveLayoutBlueprint.sections
        } : undefined;

        // If no layout blueprint exists but we have AI API key, generate one using AI
        if (!layoutBlueprintInput && options.aiApiKey) {
          console.log('[Renderer] Generating AI-based layout blueprint for visual variety...');
          try {
            const { LayoutEngine } = await import('../../layout-engine/LayoutEngine');
            const fullContent = processedContent.sections.map(s =>
              `## ${s.heading || ''}\n${s.content}`
            ).join('\n\n');

            // AILayoutPlanner only supports 'gemini' | 'anthropic'; fallback to 'gemini' for 'openai'
            const layoutAiProvider = (options.aiProvider === 'anthropic' ? 'anthropic' : 'gemini') as import('../../layout-engine/AILayoutPlanner').AIProvider;
            const aiBlueprint = await LayoutEngine.generateBlueprintWithAI(
              fullContent,
              processedContent.title,
              { provider: layoutAiProvider, apiKey: options.aiApiKey },
              fallbackDna,
              { language: options.language }
            );

            layoutBlueprintInput = { sections: aiBlueprint.sections };
            console.log('[Renderer] AI layout blueprint generated:', {
              sections: aiBlueprint.sections.length,
              strategy: aiBlueprint.aiReasoning?.overallStrategy?.substring(0, 100),
            });
          } catch (aiError) {
            console.warn('[Renderer] AI layout generation failed, proceeding without blueprint:', aiError);
          }
        }

        console.log('[Renderer] Fallback with layout blueprint:', {
          hasLayoutBlueprint: !!layoutBlueprintInput,
          blueprintSections: layoutBlueprintInput?.sections?.length || 0,
        });

        // Combine brand design system CSS with pipeline CSS (if available)
        const fallbackCompiledCss = [
          options.brandDesignSystem?.compiledCss,
          pipelineCss, // CSS from pipeline components (Phase 2)
        ].filter(Boolean).join('\n\n') || undefined;

        const cleanResult = renderCleanArticle(
          articleInput,
          fallbackDna,
          options.brandDesignSystem?.brandName || 'Brand',
          layoutBlueprintInput, // USE LAYOUT BLUEPRINT for ComponentRenderer
          fallbackCompiledCss
        );

        console.log('[Renderer] CleanArticleRenderer fallback successful');

        // Determine user-friendly message based on reason
        const userMessage = isPoorQuality
          ? 'Brand styling produced limited results. Using enhanced clean renderer for better visual quality.'
          : 'Brand extraction contained unwanted content. Using clean renderer for a professional result.';

        return {
          html: cleanResult.fullDocument,
          css: cleanResult.css,
          cssVariables: {} as CssVariables,
          components: [],
          seoValidation: (() => {
            const hv = validateHeadingStructure(cleanResult.fullDocument || cleanResult.html);
            return {
              isValid: hv.isValid,
              warnings: [
                { type: 'content' as const, severity: 'warning' as const, message: `Fallback renderer used due to ${reason}` },
                ...hv.issues.map(msg => ({ type: 'heading' as const, severity: 'warning' as const, message: msg })),
              ],
              headingStructure: { hasH1: hv.hasH1, hierarchy: hv.hierarchy.map(h => `h${h.level}: ${h.text}`), issues: hv.issues },
              schemaPreserved: true,
              metaPreserved: true,
            };
          })(),
          template: 'blog-article' as ContentTypeTemplate,
          renderInfo: {
            renderer: 'fallback',
            message: userMessage,
            reason: isPoorQuality
              ? `Brand extraction had ${emptySections}/${totalSections} sections without proper styling`
              : 'Brand extraction contained cookie consent or tracking code',
            level: 'warning',
            details: {
              brandExtractionUsed: false,
              layoutBlueprintUsed: !!layoutBlueprintInput,
              aiLayoutUsed: !effectiveLayoutBlueprint && !!layoutBlueprintInput, // AI generated if no original
              compiledCssUsed: !!options.brandDesignSystem?.compiledCss,
              fallbackTriggered: true,
            },
            pipelineTelemetry: cleanResult.pipelineTelemetry,
          },
          renderMetadata: {
            unresolvedImageCount: imageInjectionResult?.unresolvedCount || 0,
          },
        };
      }
    }

    // Convert BrandReplicationOutput to StyledContentOutput format
    return {
      html: result.html,
      css: result.standaloneCss,
      cssVariables: {} as CssVariables, // Brand CSS handles variables internally
      components: [], // Could be enhanced to map componentsUsed
      seoValidation: (() => {
        const hv = validateHeadingStructure(result.html);
        return {
          isValid: hv.isValid,
          warnings: hv.issues.map(msg => ({ type: 'heading' as const, severity: 'warning' as const, message: msg })),
          headingStructure: { hasH1: hv.hasH1, hierarchy: hv.hierarchy.map(h => `h${h.level}: ${h.text}`), issues: hv.issues },
          schemaPreserved: true,
          metaPreserved: true,
        };
      })(),
      template: 'blog-article' as ContentTypeTemplate,
      renderInfo: {
        renderer: 'brand-aware',
        message: isPoorQuality
          ? 'Using brand template output (some sections may have limited styling)'
          : 'Using brand-aware styling with extracted components from your target site',
        reason: isPoorQuality
          ? `Brand extraction has ${emptySections}/${totalSections} sections without class names — output may look plain`
          : 'Brand extraction data was found for this project',
        level: isPoorQuality ? ('warning' as const) : ('info' as const),
        details: {
          brandExtractionUsed: true,
          componentsDetected: result.componentsUsed?.length || 0,
          fallbackTriggered: isPoorQuality,
        },
      },
      renderMetadata: {
        unresolvedImageCount: imageInjectionResult?.unresolvedCount || 0,
      },
    };
  }

  // ============================================================================
  // PATH B: CleanArticleRenderer - NO TEMPLATES, design-agency quality output
  // ============================================================================
  // CRITICAL FIX: When no DesignDNA is provided, create a fallback from designTokens
  // This ensures CleanArticleRenderer (with ComponentRenderer) is ALWAYS preferred
  // over the legacy BlueprintRenderer (which uses flat ctc-* sections)
  // Create fallback DesignDNA from designTokens when no real DesignDNA is available
  // CleanArticleRenderer handles missing fields gracefully with || {} patterns
  const effectiveDesignDna: DesignDNA = options.designDna || (options.designTokens ? {
    colors: {
      primary: { hex: options.designTokens.colors?.primary || '#18181B', usage: 'primary', confidence: 0.7 },
      primaryLight: { hex: options.designTokens.colors?.primary || '#3F3F46', usage: 'primary-light', confidence: 0.5 },
      primaryDark: { hex: options.designTokens.colors?.primary || '#09090B', usage: 'primary-dark', confidence: 0.5 },
      secondary: { hex: options.designTokens.colors?.secondary || '#475569', usage: 'secondary', confidence: 0.6 },
      accent: { hex: options.designTokens.colors?.accent || '#71717A', usage: 'accent', confidence: 0.5 },
      neutrals: {
        lightest: options.designTokens.colors?.background || '#FFFFFF',
        light: options.designTokens.colors?.surface || '#F8FAFC',
        medium: options.designTokens.colors?.textMuted || '#64748B',
        dark: options.designTokens.colors?.text || '#0F172A',
        darkest: '#000000',
      },
      semantic: { success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
      harmony: 'monochromatic',
      dominantMood: 'corporate',
      contrastLevel: 'medium',
    },
    typography: {
      headingFont: { family: options.designTokens.fonts?.heading || 'system-ui', fallback: 'sans-serif', weight: 700, style: 'sans-serif', character: 'modern' },
      bodyFont: { family: options.designTokens.fonts?.body || 'system-ui', fallback: 'sans-serif', weight: 400, style: 'sans-serif', lineHeight: 1.6 },
      scaleRatio: 1.25,
      baseSize: '16px',
      headingCase: 'none',
      headingLetterSpacing: '-0.02em',
      usesDropCaps: false,
      headingUnderlineStyle: 'none',
      linkStyle: 'underline',
    },
    spacing: { baseUnit: 8, density: 'comfortable', sectionGap: 'moderate', contentWidth: 'medium', whitespacePhilosophy: 'balanced' },
    shapes: {
      borderRadius: { style: 'subtle', small: '4px', medium: '8px', large: '16px', full: '9999px' },
      buttonStyle: 'soft', cardStyle: 'subtle-shadow', inputStyle: 'bordered',
    },
    effects: {
      shadows: { style: 'subtle', cardShadow: '0 1px 3px rgba(0,0,0,0.12)', buttonShadow: '0 1px 2px rgba(0,0,0,0.08)', elevatedShadow: '0 4px 12px rgba(0,0,0,0.15)' },
      gradients: { usage: 'subtle', primaryGradient: 'linear-gradient(135deg, #18181B 0%, #3F3F46 100%)', heroGradient: 'linear-gradient(180deg, #09090B 0%, #18181B 100%)', ctaGradient: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)' },
      backgrounds: { usesPatterns: false, usesTextures: false, usesOverlays: false },
      borders: { style: 'subtle', defaultColor: '#e5e7eb', accentBorderUsage: false },
    },
    decorative: { dividerStyle: 'line', usesFloatingShapes: false, usesCornerAccents: false, usesWaveShapes: false, usesGeometricPatterns: false, iconStyle: 'outline', decorativeAccentColor: '#3b82f6' },
    layout: { gridStyle: 'strict-12', alignment: 'left', heroStyle: 'contained', cardLayout: 'grid', ctaPlacement: 'section-end', navigationStyle: 'standard' },
    motion: { overall: 'subtle', transitionSpeed: 'normal', easingStyle: 'ease', hoverEffects: { buttons: 'darken', cards: 'lift', links: 'underline' }, scrollAnimations: false, parallaxEffects: false },
    images: { treatment: 'natural', frameStyle: 'rounded', hoverEffect: 'none', aspectRatioPreference: '16:9' },
    componentPreferences: { preferredListStyle: 'bullets', preferredCardStyle: 'bordered', testimonialStyle: 'card', faqStyle: 'accordion', ctaStyle: 'button' },
    personality: { overall: 'corporate', formality: 3, energy: 3, warmth: 3, trustSignals: 'moderate' },
    confidence: { overall: 0.5, colorsConfidence: 0.6, typographyConfidence: 0.5, layoutConfidence: 0.4 },
    analysisNotes: ['Generated from designTokens fallback - no real AI brand analysis performed'],
  } as DesignDNA : {
    // Absolute fallback when no designTokens exist either
    colors: {
      primary: { hex: '#3b82f6', usage: 'primary', confidence: 0.3 },
      primaryLight: { hex: '#93c5fd', usage: 'primary-light', confidence: 0.3 },
      primaryDark: { hex: '#1e40af', usage: 'primary-dark', confidence: 0.3 },
      secondary: { hex: '#64748b', usage: 'secondary', confidence: 0.3 },
      accent: { hex: '#f59e0b', usage: 'accent', confidence: 0.3 },
      neutrals: { lightest: '#f9fafb', light: '#e5e7eb', medium: '#6b7280', dark: '#374151', darkest: '#111827' },
      semantic: { success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
      harmony: 'monochromatic',
      dominantMood: 'corporate',
      contrastLevel: 'medium',
    },
    typography: {
      headingFont: { family: 'system-ui', fallback: 'sans-serif', weight: 700, style: 'sans-serif', character: 'modern' },
      bodyFont: { family: 'system-ui', fallback: 'sans-serif', weight: 400, style: 'sans-serif', lineHeight: 1.6 },
      scaleRatio: 1.25, baseSize: '16px', headingCase: 'none', headingLetterSpacing: '-0.02em',
      usesDropCaps: false, headingUnderlineStyle: 'none', linkStyle: 'underline',
    },
    spacing: { baseUnit: 8, density: 'comfortable', sectionGap: 'moderate', contentWidth: 'medium', whitespacePhilosophy: 'balanced' },
    shapes: {
      borderRadius: { style: 'subtle', small: '4px', medium: '8px', large: '16px', full: '9999px' },
      buttonStyle: 'soft', cardStyle: 'subtle-shadow', inputStyle: 'bordered',
    },
    effects: {
      shadows: { style: 'subtle', cardShadow: '0 1px 3px rgba(0,0,0,0.12)', buttonShadow: '0 1px 2px rgba(0,0,0,0.08)', elevatedShadow: '0 4px 12px rgba(0,0,0,0.15)' },
      gradients: { usage: 'subtle', primaryGradient: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', heroGradient: 'linear-gradient(180deg, #1e3a5f 0%, #3b82f6 100%)', ctaGradient: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)' },
      backgrounds: { usesPatterns: false, usesTextures: false, usesOverlays: false },
      borders: { style: 'subtle', defaultColor: '#e5e7eb', accentBorderUsage: false },
    },
    decorative: { dividerStyle: 'line', usesFloatingShapes: false, usesCornerAccents: false, usesWaveShapes: false, usesGeometricPatterns: false, iconStyle: 'outline', decorativeAccentColor: '#3b82f6' },
    layout: { gridStyle: 'strict-12', alignment: 'left', heroStyle: 'contained', cardLayout: 'grid', ctaPlacement: 'section-end', navigationStyle: 'standard' },
    motion: { overall: 'subtle', transitionSpeed: 'normal', easingStyle: 'ease', hoverEffects: { buttons: 'darken', cards: 'lift', links: 'underline' }, scrollAnimations: false, parallaxEffects: false },
    images: { treatment: 'natural', frameStyle: 'rounded', hoverEffect: 'none', aspectRatioPreference: '16:9' },
    componentPreferences: { preferredListStyle: 'bullets', preferredCardStyle: 'bordered', testimonialStyle: 'card', faqStyle: 'accordion', ctaStyle: 'button' },
    personality: { overall: 'corporate', formality: 3, energy: 3, warmth: 3, trustSignals: 'moderate' },
    confidence: { overall: 0.3, colorsConfidence: 0.3, typographyConfidence: 0.3, layoutConfidence: 0.3 },
    analysisNotes: ['Absolute fallback DesignDNA - no brand analysis or designTokens available'],
  } as DesignDNA);
  if (effectiveDesignDna) {
    console.log('-'.repeat(80));
    console.log('[STYLING PIPELINE] STEP 3B: ROUTING TO CleanArticleRenderer (CLEAN PATH)');
    console.log('[STYLING PIPELINE] Reason:', options.designDna
      ? 'DesignDNA provided - generating template-free HTML'
      : 'Using FALLBACK DesignDNA (from designTokens or defaults) - CleanArticleRenderer preferred over legacy');
    console.log('[Renderer] Using CleanArticleRenderer for project:', options.projectId);
    console.log('[STYLING PIPELINE] DesignDNA summary:', {
      hasPrimaryColor: !!effectiveDesignDna.colors?.primary,
      hasTypography: !!effectiveDesignDna.typography,
      brandName: options.brandDesignSystem?.brandName || 'Brand',
    });

    // Prepare article content for clean renderer
    const articleInput = {
      title: processedContent.title,
      sections: processedContent.sections.map(section => ({
        id: section.id,
        heading: section.heading,
        headingLevel: section.headingLevel,
        content: section.content,
      })),
    };

    // Render using CleanArticleRenderer - NO TEMPLATES
    // Pass layout blueprint for Layout Engine decisions (component, emphasis, etc.)
    const layoutBlueprintInput = effectiveLayoutBlueprint ? {
      sections: effectiveLayoutBlueprint.sections
    } : undefined;

    // THE KEY FIX: Pass compiledCss from BrandDesignSystem for agency-quality output
    // When user forces "Clean Components", skip compiledCss to show DesignDNA-only styling
    // This gives a visually distinct output from "Auto" which includes full compiledCss
    const compiledCss = forcePathB ? undefined : (
      [
        options.brandDesignSystem?.compiledCss,
        pipelineCss, // CSS from pipeline components (Phase 2)
      ].filter(Boolean).join('\n\n') || undefined
    );

    if (forcePathB) {
      console.log('[STYLING PIPELINE] Clean Components mode: using DesignDNA fallback CSS (no compiledCss)');
    }
    console.log('[STYLING PIPELINE] Passing to CleanArticleRenderer:', {
      hasCompiledCss: !!compiledCss,
      compiledCssLength: compiledCss?.length || 0,
      source: compiledCss ? 'BrandDesignSystem.compiledCss (AI-GENERATED)' : 'Will use DesignDNA fallback',
    });

    const cleanResult = renderCleanArticle(
      articleInput,
      effectiveDesignDna,
      options.brandDesignSystem?.brandName || 'Brand',
      layoutBlueprintInput,
      compiledCss // THE KEY FIX: Pass AI-generated CSS
    );

    console.log('-'.repeat(80));
    console.log('[STYLING PIPELINE] STEP 4: CleanArticleRenderer OUTPUT');
    console.log('[STYLING PIPELINE] Output summary:', {
      htmlLength: cleanResult.html.length,
      cssLength: cleanResult.css.length,
      fullDocumentLength: cleanResult.fullDocument.length,
      hasNoCtcClasses: !cleanResult.html.includes('ctc-'),
    });
    console.log('='.repeat(80));
    console.log('[STYLING PIPELINE] COMPLETE - Clean template-free output');
    console.log('='.repeat(80));

    return {
      html: cleanResult.fullDocument, // Return complete standalone document
      css: cleanResult.css,
      cssVariables: {} as CssVariables,
      components: [],
      seoValidation: (() => {
        const hv = validateHeadingStructure(cleanResult.fullDocument || cleanResult.html);
        return {
          isValid: hv.isValid,
          warnings: hv.issues.map(msg => ({ type: 'heading' as const, severity: 'warning' as const, message: msg })),
          headingStructure: { hasH1: hv.hasH1, hierarchy: hv.hierarchy.map(h => `h${h.level}: ${h.text}`), issues: hv.issues },
          schemaPreserved: true,
          metaPreserved: true,
        };
      })(),
      template: 'blog-article' as ContentTypeTemplate,
      renderInfo: {
        renderer: 'clean-article',
        message: compiledCss
          ? 'Using AI-generated brand styling for professional quality output'
          : 'Using clean article renderer with design DNA styling',
        reason: 'DesignDNA provided - generating template-free HTML with brand colors and typography',
        level: 'info',
        details: {
          brandExtractionUsed: false,
          layoutBlueprintUsed: !!layoutBlueprintInput,
          compiledCssUsed: !!compiledCss,
          componentsDetected: layoutBlueprintInput?.sections?.length || 0,
        },
        pipelineTelemetry: cleanResult.pipelineTelemetry,
      },
      renderMetadata: {
        unresolvedImageCount: imageInjectionResult?.unresolvedCount || 0,
      },
    };
  }

  // ============================================================================
  // PATH C: BlueprintRenderer - Legacy template fallback (DEPRECATED)
  // ============================================================================
  console.log('-'.repeat(80));
  console.log('[STYLING PIPELINE] STEP 3C: ROUTING TO BlueprintRenderer (LEGACY FALLBACK)');
  console.log('[STYLING PIPELINE] WARNING: Using template-based renderer');
  console.log('[STYLING PIPELINE] Reason:', !(hasDirectComponents || hasDbExtraction)
    ? 'No brand extraction components AND no DesignDNA'
    : 'No AI API key and no DesignDNA');
  console.log('[Renderer] Using BlueprintRenderer legacy fallback for project:', options.projectId);

  // DEBUG: Log what brand data we're passing to the renderer
  console.log('[STYLING PIPELINE] Brand data being passed to BlueprintRenderer:', {
    hasBrandDesignSystem: !!options.brandDesignSystem,
    hasCompiledCss: !!options.brandDesignSystem?.compiledCss,
    compiledCssLength: options.brandDesignSystem?.compiledCss?.length || 0,
    brandName: options.brandDesignSystem?.brandName,
    designDnaHash: options.brandDesignSystem?.designDnaHash,
    hasDesignTokens: !!options.designTokens,
    designTokenColors: options.designTokens?.colors ? {
      primary: options.designTokens.colors.primary,
      secondary: options.designTokens.colors.secondary,
    } : 'NO TOKENS',
  });

  if (!options.blueprint) {
    throw new Error('No brand extraction, no DesignDNA, and no blueprint provided');
  }

  // Import and call renderBlueprint
  const { renderBlueprint } = await import('./blueprintRenderer');

  // THE KEY FIX: Pass processedContent (with injected images) to renderBlueprint
  // Without this, the blueprint uses brief summaries instead of actual article content
  console.log('[STYLING PIPELINE] Passing articleContent to renderBlueprint:', {
    hasProcessedContent: !!processedContent,
    sectionCount: processedContent.sections.length,
    firstSectionContentLength: processedContent.sections[0]?.content?.length || 0,
    hasImages: processedContent.sections.some(s => s.content?.includes('<img') || s.content?.includes('!['))
  });

  const blueprintResult = renderBlueprint(options.blueprint, processedContent.title, {
    brief: options.brief,
    topic: options.topic,
    topicalMap: options.topicalMap,
    personalityId: options.personalityId,
    designTokens: options.designTokens,
    darkMode: options.darkMode,
    minifyCss: options.minifyCss,
    language: options.language,
    heroImage: options.heroImage,
    ctaConfig: options.ctaConfig,
    author: options.author,
    // Pass brandDesignSystem for AI-generated CSS (cast to full type; renderer only uses compiledCss/brandName/sourceUrl)
    brandDesignSystem: options.brandDesignSystem as import('../../../types/designDna').BrandDesignSystem | undefined,
    // THE KEY FIX: Pass actual article content with injected images
    // This ensures the REAL article is rendered, not brief summaries
    articleContent: processedContent,
  });

  // DEBUG: Log the output CSS info
  console.log('-'.repeat(80));
  console.log('[STYLING PIPELINE] STEP 5: BlueprintRenderer OUTPUT');
  console.log('[STYLING PIPELINE] Output summary:', {
    htmlLength: blueprintResult.html.length,
    cssLength: blueprintResult.css.length,
    sectionsRendered: blueprintResult.metadata.sectionsRendered,
    componentsUsed: blueprintResult.metadata.componentsUsed,
    visualStyle: blueprintResult.metadata.blueprint.visualStyle,
    renderDurationMs: blueprintResult.metadata.renderDurationMs,
  });
  console.log('[STYLING PIPELINE] CSS source:', blueprintResult.css.includes('Brand Design System')
    ? 'BrandDesignSystem.compiledCss (AI-GENERATED)'
    : 'generateDesignSystemCss (FALLBACK TEMPLATE)');
  console.log('[STYLING PIPELINE] CSS first 300 chars:', blueprintResult.css.substring(0, 300));
  console.log('='.repeat(80));
  console.log('[STYLING PIPELINE] COMPLETE');
  console.log('='.repeat(80));

  // Convert BlueprintRenderOutput to StyledContentOutput format
  return {
    html: blueprintResult.html,
    css: blueprintResult.css,
    cssVariables: {} as CssVariables, // Blueprint CSS handles variables internally
    components: [],
    seoValidation: (() => {
      const hv = validateHeadingStructure(blueprintResult.html);
      return {
        isValid: hv.isValid,
        warnings: hv.issues.map(msg => ({ type: 'heading' as const, severity: 'warning' as const, message: msg })),
        headingStructure: { hasH1: hv.hasH1, hierarchy: hv.hierarchy.map(h => `h${h.level}: ${h.text}`), issues: hv.issues },
        schemaPreserved: true,
        metaPreserved: true,
      };
    })(),
    template: 'blog-article',
    renderInfo: {
      renderer: 'blueprint',
      message: 'Using legacy blueprint renderer. For better results, ensure brand extraction or DesignDNA is available.',
      reason: 'No brand extraction components and no DesignDNA available - using template-based fallback',
      level: 'warning',
      details: {
        brandExtractionUsed: false,
        layoutBlueprintUsed: true,
        compiledCssUsed: !!options.brandDesignSystem?.compiledCss,
        componentsDetected: blueprintResult.metadata.componentsUsed?.length || 0,
      },
    },
    renderMetadata: {
      unresolvedImageCount: imageInjectionResult?.unresolvedCount || 0,
    },
  };
}

/**
 * Check if a project has brand extraction components available.
 *
 * @param projectId - The project ID to check
 * @returns True if brand components exist for this project
 */
async function hasBrandExtraction(projectId: string): Promise<boolean> {
  try {
    const library = new ComponentLibrary(projectId);
    const components = await library.getAll();
    return components.length > 0;
  } catch (error) {
    console.warn('[Renderer] Error checking brand extraction:', error);
    return false;
  }
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

// Clean Article Renderer (NO TEMPLATES - preferred path)
export {
  CleanArticleRenderer,
  renderCleanArticle,
} from './CleanArticleRenderer';

export type {
  ArticleSection,
  ArticleInput,
  CleanRenderOutput,
  LayoutBlueprintInput,
} from './CleanArticleRenderer';

// Blueprint Renderer (legacy template-based fallback)
export {
  renderBlueprint,
  mapVisualStyleToPersonality,
  generateStandaloneBlueprintHtml,
} from './blueprintRenderer';

export type {
  BlueprintRenderOptions,
  BlueprintRenderOutput,
} from './blueprintRenderer';

// Component Library
export {
  getComponentRenderer,
  hasRenderer,
  getAvailableComponents,
  markdownToHtml,
  extractListItems,
  extractFaqItems,
  extractSteps,
} from './componentLibrary';

export type {
  RenderContext,
  RenderedComponent,
  ComponentRenderer,
} from './componentLibrary';

// Image Injector
export {
  injectImagesIntoContent,
  placeholdersToInjectableImages,
  countUnresolvedPlaceholders,
} from './imageInjector';

export type {
  InjectableImage,
  ImagePool,
  ImageInjectionResult,
} from './imageInjector';
