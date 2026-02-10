/**
 * Image Injector
 *
 * Injects generated images into content by replacing IMAGE placeholders
 * with actual <img> tags. Follows priority order:
 * 1. Content-generated images (matched by description/alt text)
 * 2. Brand images (for HERO/FEATURED slots)
 * 3. Leave placeholder with dimensions for remaining unmatched slots
 *
 * @module services/publishing/renderer/imageInjector
 */

import type { ImagePlaceholder, ImageType } from '../../../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * A generated image that can be injected into content
 */
export interface InjectableImage {
  id: string;
  url: string;
  description?: string;
  altText?: string;
  type?: ImageType;
  width?: number;
  height?: number;
  /** Figcaption text for the image (falls back to altText if not provided) */
  figcaption?: string;
}

/**
 * Image pool containing all available images for injection
 */
export interface ImagePool {
  /** Content-specific generated images (priority 1) */
  generated: InjectableImage[];
  /** Brand-extracted images (priority 2) */
  brand: InjectableImage[];
}

/**
 * Result of image injection
 */
export interface ImageInjectionResult {
  /** Content with images injected */
  content: string;
  /** Number of images successfully injected */
  injectedCount: number;
  /** Number of placeholders that remain unresolved */
  unresolvedCount: number;
  /** Details of unresolved placeholders */
  unresolvedPlaceholders: {
    fullMatch: string;
    description: string;
    altText: string;
  }[];
}

// ============================================================================
// REGEX PATTERNS
// ============================================================================

/**
 * Matches IMAGE placeholders in format: [IMAGE: description | alt="text"]
 */
const IMAGE_PLACEHOLDER_REGEX = /\[IMAGE:\s*([^|]+)\s*\|\s*alt="([^"]+)"\]/g;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize text for comparison (lowercase, remove extra spaces)
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Calculate similarity score between two strings (0-1)
 * Uses word overlap for semantic matching
 */
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeText(a).split(' '));
  const wordsB = new Set(normalizeText(b).split(' '));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.length / union.size;
}

/**
 * Get first N words from text
 */
function getFirstWords(text: string, n: number): string {
  return text.split(/\s+/).slice(0, n).join(' ');
}

/**
 * Find the best matching image for a placeholder
 */
function findBestMatch(
  description: string,
  altText: string,
  imageType: 'HERO' | 'SECTION' | 'INFOGRAPHIC' | 'CHART' | 'DIAGRAM' | 'AUTHOR' | null,
  images: InjectableImage[],
  usedImageIds: Set<string>
): InjectableImage | null {
  let bestMatch: InjectableImage | null = null;
  let bestScore = 0;

  const normalizedDesc = normalizeText(description);
  const normalizedAlt = normalizeText(altText);
  const firstFourWords = getFirstWords(normalizedDesc, 4);

  for (const image of images) {
    // Skip already used images
    if (usedImageIds.has(image.id)) continue;

    let score = 0;

    // Check for exact description match (highest priority)
    if (image.description && normalizeText(image.description) === normalizedDesc) {
      score = 1.0;
    }
    // Check for first 4 words match
    else if (image.description && normalizeText(image.description).startsWith(firstFourWords)) {
      score = 0.9;
    }
    // Check for alt text match
    else if (image.altText && normalizeText(image.altText) === normalizedAlt) {
      score = 0.85;
    }
    // Check for type match (for HERO especially)
    else if (imageType === 'HERO' && image.type === 'HERO') {
      score = 0.8;
    }
    // Calculate similarity score
    else if (image.description) {
      const descSimilarity = calculateSimilarity(description, image.description);
      const altSimilarity = image.altText ? calculateSimilarity(altText, image.altText) : 0;
      score = Math.max(descSimilarity, altSimilarity) * 0.7;
    }

    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = image;
    }
  }

  return bestMatch;
}

/**
 * Determine image type from description
 */
function determineImageType(description: string): 'HERO' | 'SECTION' | 'INFOGRAPHIC' | 'CHART' | 'DIAGRAM' | 'AUTHOR' | null {
  const lower = description.toLowerCase();

  if (lower.includes('hero') || lower.includes('featured') || lower.includes('banner')) {
    return 'HERO';
  }
  if (lower.includes('chart') || lower.includes('graph') || lower.includes('data')) {
    return 'CHART';
  }
  if (lower.includes('infographic') || lower.includes('statistics')) {
    return 'INFOGRAPHIC';
  }
  if (lower.includes('diagram') || lower.includes('flow') || lower.includes('process')) {
    return 'DIAGRAM';
  }
  if (lower.includes('author') || lower.includes('profile')) {
    return 'AUTHOR';
  }
  return 'SECTION';
}

/**
 * Generate an <img> tag wrapped in <figure> with <figcaption>
 *
 * Wraps images in semantic figure elements with captions.
 * For HERO images, uses eager loading and high fetch priority.
 */
function generateImgTag(image: InjectableImage, altText: string, isFirst: boolean = false): string {
  const width = image.width || 800;
  const height = image.height || 450;
  const isHero = image.type === 'HERO';
  const loading = isHero || isFirst ? 'eager' : 'lazy';
  const figcaption = image.figcaption || altText;

  // Escape HTML entities in alt text and figcaption to prevent XSS
  const escapedAlt = altText.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapedCaption = figcaption.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<figure class="ctc-image-figure">
  <img src="${image.url}"
       alt="${escapedAlt}"
       width="${width}"
       height="${height}"
       loading="${loading}"
       ${isHero || isFirst ? 'fetchpriority="high"' : ''}
       class="ctc-injected-image" />
  <figcaption class="ctc-figcaption">${escapedCaption}</figcaption>
</figure>`;
}

/**
 * Generate a placeholder indicator for unresolved images
 */
function generatePlaceholderIndicator(description: string, altText: string): string {
  return `<div class="ctc-image-placeholder" data-description="${description}" data-alt="${altText}" style="background: linear-gradient(135deg, #f0f0f0, #e0e0e0); border: 2px dashed #ccc; border-radius: 8px; padding: 2rem; text-align: center; color: #666;">
    <p style="margin: 0; font-size: 14px;">📷 Image placeholder</p>
    <p style="margin: 0.5rem 0 0; font-size: 12px; opacity: 0.8;">${description}</p>
  </div>`;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Inject images into content by replacing IMAGE placeholders
 *
 * @param content - HTML content containing IMAGE placeholders
 * @param images - Pool of available images for injection
 * @param options - Optional configuration
 * @returns Result with injected content and statistics
 */
export function injectImagesIntoContent(
  content: string,
  images: ImagePool,
  options?: {
    /** Keep unresolved placeholders as visual indicators (default: true) */
    keepUnresolvedAsIndicators?: boolean;
    /** Remove unresolved placeholders entirely (default: false) */
    removeUnresolved?: boolean;
  }
): ImageInjectionResult {
  const keepIndicators = options?.keepUnresolvedAsIndicators ?? true;
  const removeUnresolved = options?.removeUnresolved ?? false;

  const usedImageIds = new Set<string>();
  const unresolvedPlaceholders: ImageInjectionResult['unresolvedPlaceholders'] = [];
  let injectedCount = 0;
  let isFirstImage = true;

  // Combine all images with priority (generated first, then brand)
  const allImages = [...images.generated, ...images.brand];

  // Reset regex state
  IMAGE_PLACEHOLDER_REGEX.lastIndex = 0;

  const injectedContent = content.replace(IMAGE_PLACEHOLDER_REGEX, (match, description, altText) => {
    const imageType = determineImageType(description);

    // Try to find a matching image
    const matchedImage = findBestMatch(
      description,
      altText,
      imageType,
      allImages,
      usedImageIds
    );

    if (matchedImage) {
      usedImageIds.add(matchedImage.id);
      injectedCount++;
      const imgHtml = generateImgTag(matchedImage, altText, isFirstImage);
      isFirstImage = false; // Only first image gets eager loading
      return imgHtml;
    }

    // No match found
    unresolvedPlaceholders.push({
      fullMatch: match,
      description,
      altText,
    });

    if (removeUnresolved) {
      return '';
    }

    if (keepIndicators) {
      return generatePlaceholderIndicator(description, altText);
    }

    // Keep original placeholder
    return match;
  });

  return {
    content: injectedContent,
    injectedCount,
    unresolvedCount: unresolvedPlaceholders.length,
    unresolvedPlaceholders,
  };
}

/**
 * Convert ImagePlaceholder array to InjectableImage array
 * Only includes placeholders with generated or uploaded URLs
 */
export function placeholdersToInjectableImages(
  placeholders: ImagePlaceholder[]
): InjectableImage[] {
  return placeholders
    .filter(p => p.status === 'generated' || p.status === 'uploaded')
    .map(p => ({
      id: p.id,
      url: p.generatedUrl || p.userUploadUrl || '',
      description: p.description,
      altText: p.altTextSuggestion,
      type: p.type,
      width: p.specs?.width,
      height: p.specs?.height,
      figcaption: p.figcaption, // Include figcaption if available
    }))
    .filter(img => img.url); // Only keep images with valid URLs
}

/**
 * Count unresolved IMAGE placeholders in content
 */
export function countUnresolvedPlaceholders(content: string): number {
  IMAGE_PLACEHOLDER_REGEX.lastIndex = 0;
  const matches = content.match(IMAGE_PLACEHOLDER_REGEX);
  return matches ? matches.length : 0;
}
