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
import type { ContentBrief, EnrichedTopic, TopicalMap } from '../../../types';
import type { LayoutBlueprint } from '../architect/blueprintTypes';
import type { StyledContentOutput, CssVariables } from '../../../types/publishing';

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
): Promise<StyledContentOutput> {
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
      title: content.title,
      sections: content.sections.map(section => ({
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
      template: 'blog-article'
    };
  }

  // FALLBACK: Use existing blueprint renderer
  console.log('[Renderer] Using BlueprintRenderer fallback for project:', options.projectId);

  if (!options.blueprint) {
    throw new Error('No brand extraction and no blueprint provided');
  }

  // Import and call renderBlueprint
  const { renderBlueprint } = await import('./blueprintRenderer');
  const blueprintResult = renderBlueprint(options.blueprint, content.title, {
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
    author: options.author
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
    template: 'blog-article'
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
