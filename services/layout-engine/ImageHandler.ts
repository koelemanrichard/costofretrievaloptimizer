/**
 * ImageHandler
 *
 * Manages image placement following Semantic SEO rules.
 *
 * CRITICAL RULE: NEVER place images between heading and first paragraph.
 * All image positions must be AFTER at least one paragraph.
 *
 * Image Placement Logic:
 * 1. Sections WITH generated images (hasImage = true):
 *    - Hero (weight 5) + full-bleed brand -> full-width-break
 *    - Featured (weight >= 4) -> full-width-break
 *    - Standard sections -> after-intro-paragraph
 *
 * 2. Sections WITH required images (constraints.imageRequired = true):
 *    - High weight (>= 4) -> full-width-break
 *    - Asymmetric brand layout -> alternate float-left / float-right
 *    - Default -> section-end
 *
 * 3. Sections WITHOUT images (placeholder suggestions):
 *    - FS-protected -> null (no placeholder)
 *    - Explanation with complex concepts -> diagram placeholder
 *    - Steps/process content -> flowchart placeholder
 *    - Otherwise -> null
 */

import { DesignDNA } from '../../types/designDna';
import { SERVICE_REGISTRY } from '../../config/serviceRegistry';
import {
  IImageHandler,
  ImagePlaceholderSpec,
  ImageSemanticRole,
  ImageSource,
  SectionAnalysis,
  SemanticImagePlacement,
  SemanticImagePosition,
} from './types';

// =============================================================================
// CONSTANTS (from SERVICE_REGISTRY.layoutEngine)
// =============================================================================

const FEATURED_WEIGHT_THRESHOLD = SERVICE_REGISTRY.layoutEngine.image.featuredWeightThreshold;
const HERO_WEIGHT_THRESHOLD = SERVICE_REGISTRY.layoutEngine.image.heroWeightThreshold;

/**
 * Patterns indicating complex concepts that would benefit from diagrams
 */
const COMPLEX_CONCEPT_PATTERNS = [
  /\brelationship\s+between\b/i,
  /\bprocess\s+of\b/i,
  /\bhow\s+.*?\s+works?\b/i,
  /\barchitecture\b/i,
  /\bflow\s+of\b/i,
  /\bstages\s+of\b/i,
  /\bcomponents\s+of\b/i,
  /\bstructure\s+of\b/i,
  /\bpipeline\b/i,
  /\bworkflow\b/i,
  /\blifecycle\b/i,
  /\binteraction\s+between\b/i,
];

const NO_IMAGE_CONTENT_TYPES = [...SERVICE_REGISTRY.layoutEngine.image.noImageContentTypes];
const FLOWCHART_CONTENT_TYPES = [...SERVICE_REGISTRY.layoutEngine.image.flowchartContentTypes];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if content contains complex concepts that would benefit from a diagram
 */
function hasComplexConcept(content?: string): boolean {
  if (!content) return false;

  return COMPLEX_CONCEPT_PATTERNS.some((pattern) => pattern.test(content));
}

/**
 * Extract main concept from content for placeholder suggestion
 */
function extractMainConcept(content: string, heading: string): string {
  // Try to extract from patterns first
  for (const pattern of COMPLEX_CONCEPT_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      // Return a meaningful portion around the match
      const index = content.indexOf(match[0]);
      const start = Math.max(0, index - 20);
      const end = Math.min(content.length, index + match[0].length + 30);
      const excerpt = content.slice(start, end).replace(/^\W+|\W+$/g, '');
      return excerpt;
    }
  }

  // Fall back to heading
  return heading || 'the concept';
}

/**
 * Check if section is FS-protected
 */
function isFsProtected(analysis: SectionAnalysis): boolean {
  return analysis.constraints?.fsTarget === true;
}

/**
 * Check if section has a generated image
 */
function hasGeneratedImage(analysis: SectionAnalysis): boolean {
  return analysis.hasImage === true;
}

/**
 * Check if section requires an image
 */
function requiresImage(analysis: SectionAnalysis): boolean {
  return (
    analysis.constraints?.imageRequired === true || analysis.constraints?.requiresVisual === true
  );
}

/**
 * Check if brand uses asymmetric layout
 */
function isAsymmetricLayout(dna?: DesignDNA): boolean {
  return dna?.layout?.gridStyle === 'asymmetric';
}

/**
 * Check if brand uses full-bleed hero style
 */
function isFullBleedHero(dna?: DesignDNA): boolean {
  return dna?.layout?.heroStyle === 'full-bleed';
}

/**
 * Determine semantic role based on section analysis
 */
function determineSemanticRole(analysis: SectionAnalysis, source: ImageSource): ImageSemanticRole {
  // Hero role for highest weight sections
  if (analysis.semanticWeight >= HERO_WEIGHT_THRESHOLD) {
    return 'hero';
  }

  // Brand kit images are decorative
  if (source === 'brand_kit') {
    return 'decorative';
  }

  // Data/comparison sections use evidence role
  if (analysis.contentType === 'comparison' || analysis.contentType === 'data') {
    return 'evidence';
  }

  // Default to explanatory
  return 'explanatory';
}

/**
 * Generate placeholder spec for a section
 */
function generatePlaceholderSpec(
  analysis: SectionAnalysis,
  sectionContent?: string,
  isFlowchart: boolean = false
): ImagePlaceholderSpec {
  const heading = analysis.heading?.trim() || 'the concept';
  const mainConcept = extractMainConcept(sectionContent || '', heading);

  if (isFlowchart) {
    return {
      aspectRatio: '16:9',
      suggestedContent: `Flowchart showing ${heading} steps`,
      altTextTemplate: `Step-by-step ${heading} flowchart showing the sequence of actions`,
    };
  }

  return {
    aspectRatio: '16:9',
    suggestedContent: `Diagram illustrating ${mainConcept}`,
    altTextTemplate: `${heading} diagram showing ${mainConcept.toLowerCase()}`,
  };
}

// =============================================================================
// IMAGE HANDLER CLASS
// =============================================================================

export class ImageHandler implements IImageHandler {
  /**
   * Track float alternation state for batch processing.
   * Public so callers can seed the state for single-section calls.
   */
  floatState: 'left' | 'right' = 'left';

  /**
   * Reset float state for new batch
   */
  private resetFloatState(): void {
    this.floatState = 'left';
  }

  /**
   * Get next float position (alternating)
   */
  private getNextFloatPosition(): SemanticImagePosition {
    const position = this.floatState === 'left' ? 'float-left' : 'float-right';
    this.floatState = this.floatState === 'left' ? 'right' : 'left';
    return position;
  }

  /**
   * Determine image placement for sections with generated images
   */
  private static handleGeneratedImage(
    analysis: SectionAnalysis,
    dna?: DesignDNA
  ): SemanticImagePlacement {
    const isHero = analysis.semanticWeight >= HERO_WEIGHT_THRESHOLD;
    const isFeatured = analysis.semanticWeight >= FEATURED_WEIGHT_THRESHOLD;

    let position: SemanticImagePosition;

    // Hero sections with full-bleed brand get full-width-break
    if (isHero && isFullBleedHero(dna)) {
      position = 'full-width-break';
    }
    // Featured sections get full-width-break
    else if (isFeatured) {
      position = 'full-width-break';
    }
    // Standard sections get after-intro-paragraph
    else {
      position = 'after-intro-paragraph';
    }

    return {
      position,
      source: 'article_generated',
      semanticRole: determineSemanticRole(analysis, 'article_generated'),
    };
  }

  /**
   * Determine image placement for sections with required images
   */
  private handleRequiredImage(
    analysis: SectionAnalysis,
    dna?: DesignDNA
  ): SemanticImagePlacement {
    const isFeatured = analysis.semanticWeight >= FEATURED_WEIGHT_THRESHOLD;

    let position: SemanticImagePosition;

    // High weight sections get full-width-break
    if (isFeatured) {
      position = 'full-width-break';
    }
    // Asymmetric layout uses alternating floats
    else if (isAsymmetricLayout(dna)) {
      position = this.getNextFloatPosition();
    }
    // Default to section-end
    else {
      position = 'section-end';
    }

    return {
      position,
      source: 'brand_kit',
      semanticRole: 'decorative',
    };
  }

  /**
   * Determine if and what placeholder to suggest for sections without images
   */
  private static handlePlaceholderSuggestion(
    analysis: SectionAnalysis,
    sectionContent?: string
  ): SemanticImagePlacement | null {
    // NEVER add placeholders to FS-protected sections
    if (isFsProtected(analysis)) {
      return null;
    }

    // Skip content types that typically don't need images
    if (NO_IMAGE_CONTENT_TYPES.includes(analysis.contentType)) {
      return null;
    }

    // Steps/process content gets flowchart placeholder
    if (FLOWCHART_CONTENT_TYPES.includes(analysis.contentType)) {
      return {
        position: 'after-intro-paragraph',
        source: 'placeholder',
        semanticRole: 'explanatory',
        placeholder: generatePlaceholderSpec(analysis, sectionContent, true),
      };
    }

    // Explanation content with complex concepts gets diagram placeholder
    if (analysis.contentType === 'explanation' && hasComplexConcept(sectionContent)) {
      return {
        position: 'after-intro-paragraph',
        source: 'placeholder',
        semanticRole: 'explanatory',
        placeholder: generatePlaceholderSpec(analysis, sectionContent, false),
      };
    }

    // No placeholder needed
    return null;
  }

  /**
   * Determine image placement for a single section.
   * Returns null if no image is needed/suggested.
   *
   * @param analysis - Section analysis result
   * @param designDna - Optional brand design DNA
   * @param sectionContent - Optional section content text (for complex concept detection)
   */
  static determineImagePlacement(
    analysis: SectionAnalysis,
    designDna?: DesignDNA,
    sectionContent?: string,
    options?: { floatHint?: 'left' | 'right' }
  ): SemanticImagePlacement | null {
    // Priority 1: Section has generated image
    if (hasGeneratedImage(analysis)) {
      return ImageHandler.handleGeneratedImage(analysis, designDna);
    }

    // Priority 2: Section requires image (from constraints)
    if (requiresImage(analysis)) {
      // Use instance for float alternation, but create temporary instance for static call.
      // When floatHint is provided, seed the instance so the caller controls direction.
      const handler = new ImageHandler();
      if (options?.floatHint) {
        handler.floatState = options.floatHint;
      }
      return handler.handleRequiredImage(analysis, designDna);
    }

    // Priority 3: Suggest placeholder if helpful
    return ImageHandler.handlePlaceholderSuggestion(analysis, sectionContent);
  }

  /**
   * Determine image placements for all sections.
   * Handles stateful operations like float alternation.
   *
   * @param analyses - Array of section analyses
   * @param designDna - Optional brand design DNA
   * @param sectionContents - Optional array of section content texts
   */
  static determineAllImagePlacements(
    analyses: SectionAnalysis[],
    designDna?: DesignDNA,
    sectionContents?: string[]
  ): (SemanticImagePlacement | null)[] {
    if (analyses.length === 0) {
      return [];
    }

    // Use instance for stateful operations (float alternation)
    const handler = new ImageHandler();
    handler.resetFloatState();

    return analyses.map((analysis, index) => {
      const sectionContent = sectionContents?.[index];

      // Priority 1: Section has generated image
      if (hasGeneratedImage(analysis)) {
        return ImageHandler.handleGeneratedImage(analysis, designDna);
      }

      // Priority 2: Section requires image (from constraints)
      if (requiresImage(analysis)) {
        return handler.handleRequiredImage(analysis, designDna);
      }

      // Priority 3: Suggest placeholder if helpful
      return ImageHandler.handlePlaceholderSuggestion(analysis, sectionContent);
    });
  }

  // =============================================================================
  // INSTANCE METHODS (delegate to static methods for single, use instance for batch)
  // =============================================================================

  /**
   * Determine image placement for a section (instance method).
   * Implements IImageHandler interface.
   */
  determineImagePlacement(
    analysis: SectionAnalysis,
    designDna?: DesignDNA,
    sectionContent?: string,
    options?: { floatHint?: 'left' | 'right' }
  ): SemanticImagePlacement | null {
    // Priority 1: Section has generated image
    if (hasGeneratedImage(analysis)) {
      return ImageHandler.handleGeneratedImage(analysis, designDna);
    }

    // Priority 2: Section requires image (from constraints)
    if (requiresImage(analysis)) {
      // When floatHint is provided, seed float state before calling handleRequiredImage
      if (options?.floatHint) {
        this.floatState = options.floatHint;
      }
      return this.handleRequiredImage(analysis, designDna);
    }

    // Priority 3: Suggest placeholder if helpful
    return ImageHandler.handlePlaceholderSuggestion(analysis, sectionContent);
  }

  /**
   * Determine image placements for all sections (instance method).
   * Implements IImageHandler interface.
   */
  determineAllImagePlacements(
    analyses: SectionAnalysis[],
    designDna?: DesignDNA,
    sectionContents?: string[]
  ): (SemanticImagePlacement | null)[] {
    return ImageHandler.determineAllImagePlacements(analyses, designDna, sectionContents);
  }
}

export default ImageHandler;
