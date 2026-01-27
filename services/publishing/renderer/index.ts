/**
 * Unified Renderer Entry Point
 *
 * Routes rendering to BrandAwareComposer when brand extraction exists,
 * otherwise falls back to the existing BlueprintRenderer.
 *
 * @module services/publishing/renderer
 */

import { BrandAwareComposer } from '../../brand-composer/BrandAwareComposer';
import { ComponentLibrary } from '../../brand-extraction/ComponentLibrary';
import type { ContentBrief, EnrichedTopic, TopicalMap, ImagePlaceholder } from '../../../types';
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
  /** Generated images from content generation (priority 1 for injection) */
  generatedImages?: ImagePlaceholder[];
  /** Brand-extracted images (priority 2 for injection) */
  brandImages?: InjectableImage[];
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

  // 1. Check if project has brand extraction
  const hasExtraction = await hasBrandExtraction(options.projectId);

  if (hasExtraction && options.aiApiKey) {
    // PRIMARY PATH: Brand-aware rendering
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

    const result = await composer.compose(normalizedContent);

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
      template: 'blog-article',
      renderMetadata: {
        unresolvedImageCount: imageInjectionResult?.unresolvedCount || 0,
      },
    };
  }

  // FALLBACK: Use existing blueprint renderer
  console.log('[Renderer] Using BlueprintRenderer fallback for project:', options.projectId);

  if (!options.blueprint) {
    throw new Error('No brand extraction and no blueprint provided');
  }

  // Import and call renderBlueprint
  const { renderBlueprint } = await import('./blueprintRenderer');
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
    brandDesignSystem: options.brandDesignSystem
  });

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
// BACKWARD COMPATIBILITY RE-EXPORTS
// ============================================================================

// Blueprint Renderer (for direct usage when needed)
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
