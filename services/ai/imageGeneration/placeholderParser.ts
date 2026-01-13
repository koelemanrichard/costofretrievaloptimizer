// services/ai/imageGeneration/placeholderParser.ts
import { ImagePlaceholder, ImageType, ImageSpecs } from '../../../types';
import { IMAGE_SPECS_BY_TYPE } from '../../../config/imageTemplates';

/**
 * Generate a deterministic ID from a string using simple hash
 * This ensures the same placeholder always gets the same ID across re-parses
 */
function deterministicId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to positive hex string and prefix with 'img_'
  return `img_${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

const IMAGE_PLACEHOLDER_REGEX = /\[IMAGE:\s*([^|]+)\s*\|\s*alt="([^"]+)"\]/g;

export interface ParsedPlaceholder {
  fullMatch: string;
  description: string;
  altText: string;
  position: number;
  sectionKey?: string;
}

export function parsePlaceholders(content: string): ParsedPlaceholder[] {
  const placeholders: ParsedPlaceholder[] = [];
  let match;

  // Reset regex state
  IMAGE_PLACEHOLDER_REGEX.lastIndex = 0;

  while ((match = IMAGE_PLACEHOLDER_REGEX.exec(content)) !== null) {
    placeholders.push({
      fullMatch: match[0],
      description: match[1].trim(),
      altText: match[2].trim(),
      position: match.index,
    });
  }

  return placeholders;
}

export function determineImageType(description: string, position: number, isFirst: boolean): ImageType {
  const lowerDesc = description.toLowerCase();

  if (isFirst || lowerDesc.includes('hero') || lowerDesc.includes('featured')) {
    return 'HERO';
  }
  if (lowerDesc.includes('chart') || lowerDesc.includes('graph') || lowerDesc.includes('data')) {
    return 'CHART';
  }
  if (lowerDesc.includes('infographic') || lowerDesc.includes('statistics')) {
    return 'INFOGRAPHIC';
  }
  if (lowerDesc.includes('diagram') || lowerDesc.includes('flow') || lowerDesc.includes('process')) {
    return 'DIAGRAM';
  }
  if (lowerDesc.includes('author') || lowerDesc.includes('profile')) {
    return 'AUTHOR';
  }

  return 'SECTION';
}

export function createImagePlaceholder(
  parsed: ParsedPlaceholder,
  index: number,
  totalCount: number,
  options?: { heroTitle?: string }
): ImagePlaceholder {
  const isFirst = index === 0;
  const type = determineImageType(parsed.description, parsed.position, isFirst);
  const specs = IMAGE_SPECS_BY_TYPE[type];

  // Use deterministic ID based on description + alt text + position
  // Position ensures uniqueness even if same description appears multiple times in draft
  const idSource = `${parsed.description}|${parsed.altText}|${parsed.position}`;

  return {
    id: deterministicId(idSource),
    type,
    position: parsed.position,
    description: parsed.description,
    altTextSuggestion: parsed.altText,
    status: 'placeholder',
    specs: {
      ...specs,
      textOverlay: type === 'HERO' ? {
        text: options?.heroTitle || '',  // Pre-filled from brief title if available
        position: 'center',
        style: 'bold-center',
      } : undefined,
    } as ImageSpecs,
  };
}

/**
 * Extract image placeholders from draft content
 * @param draft - The draft content containing image placeholders
 * @param options - Optional settings
 * @param options.heroTitle - Title to use for HERO image text overlay (from content brief)
 */
export function extractPlaceholdersFromDraft(
  draft: string,
  options?: { heroTitle?: string }
): ImagePlaceholder[] {
  const parsed = parsePlaceholders(draft);
  return parsed.map((p, i) => createImagePlaceholder(p, i, parsed.length, options));
}
