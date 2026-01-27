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
import type { ContentBrief, EnrichedTopic, TopicalMap, ImagePlaceholder } from '../../../types';
import type { DesignDNA } from '../../../types/designDna';
import type { LayoutBlueprint } from '../architect/blueprintTypes';
import type { StyledContentOutput, CssVariables } from '../../../types/publishing';
import {
  injectImagesIntoContent,
  placeholdersToInjectableImages,
  countUnresolvedPlaceholders,
  type InjectableImage,
  type ImageInjectionResult,
} from './imageInjector';

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
  aiProvider?: 'gemini' | 'anthropic';
  /** API key for AI provider */
  aiApiKey?: string;
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
  /** Generated images from content generation (priority 1 for injection) */
  generatedImages?: ImagePlaceholder[];
  /** Brand-extracted images (priority 2 for injection) */
  brandImages?: InjectableImage[];
  /** Extracted components with literal HTML/CSS (bypass database lookup) */
  extractedComponents?: import('../../../types/brandExtraction').ExtractedComponent[];
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

  // 1. Check if extracted components are provided directly (BYPASS DATABASE)
  console.log('-'.repeat(80));
  console.log('[STYLING PIPELINE] STEP 2: Checking for brand extraction components...');
  const hasDirectComponents = options.extractedComponents && options.extractedComponents.length > 0;
  console.log('[STYLING PIPELINE] Direct components provided:', hasDirectComponents ? options.extractedComponents!.length : 0);

  // Also check database as fallback
  const hasDbExtraction = !hasDirectComponents ? await hasBrandExtraction(options.projectId) : false;
  console.log('[STYLING PIPELINE] Database extraction check result:', hasDbExtraction);

  if ((hasDirectComponents || hasDbExtraction) && options.aiApiKey) {
    // PRIMARY PATH: Brand-aware rendering using LITERAL HTML from target site
    console.log('-'.repeat(80));
    console.log('[STYLING PIPELINE] STEP 3A: ROUTING TO BrandAwareComposer (PRIMARY PATH)');
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

    // Convert BrandReplicationOutput to StyledContentOutput format
    return {
      html: result.html,
      css: result.standaloneCss,
      cssVariables: {} as CssVariables, // Brand CSS handles variables internally
      components: [], // Could be enhanced to map componentsUsed
      seoValidation: {
        isValid: true,
        warnings: [],
        headingStructure: {
          hasH1: true,
          hierarchy: [],
          issues: []
        },
        schemaPreserved: true,
        metaPreserved: true
      },
      template: 'brand-aware', // New template type to indicate BrandAwareComposer was used
      renderMetadata: {
        unresolvedImageCount: imageInjectionResult?.unresolvedCount || 0,
      },
    };
  }

  // ============================================================================
  // PATH B: CleanArticleRenderer - NO TEMPLATES, design-agency quality output
  // ============================================================================
  if (options.designDna) {
    console.log('-'.repeat(80));
    console.log('[STYLING PIPELINE] STEP 3B: ROUTING TO CleanArticleRenderer (CLEAN PATH)');
    console.log('[STYLING PIPELINE] Reason: DesignDNA provided - generating template-free HTML');
    console.log('[Renderer] Using CleanArticleRenderer for project:', options.projectId);
    console.log('[STYLING PIPELINE] DesignDNA summary:', {
      hasPrimaryColor: !!options.designDna.colors?.primary,
      hasTypography: !!options.designDna.typography,
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
    const cleanResult = renderCleanArticle(
      articleInput,
      options.designDna,
      options.brandDesignSystem?.brandName || 'Brand'
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
      seoValidation: {
        isValid: true,
        warnings: [],
        headingStructure: {
          hasH1: true,
          hierarchy: [],
          issues: []
        },
        schemaPreserved: true,
        metaPreserved: true
      },
      template: 'clean-article', // New template type
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
  console.log('[STYLING PIPELINE] Reason:', !hasExtraction
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
    // Pass brandDesignSystem for AI-generated CSS
    brandDesignSystem: options.brandDesignSystem,
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
    seoValidation: {
      isValid: true,
      warnings: [],
      headingStructure: {
        hasH1: true,
        hierarchy: [],
        issues: []
      },
      schemaPreserved: true,
      metaPreserved: true
    },
    template: 'blog-article',
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
