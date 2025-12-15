// services/ai/imageGeneration/providers/geminiImageProvider.ts
import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { ImagePlaceholder, BusinessInfo } from '../../../../types';
import { ImageProvider, ImageGenerationOptions, GenerationResult, ProviderConfig } from './types';
import { IMAGE_SPECS_BY_TYPE } from '../../../../config/imageTemplates';

// Imagen models - try newer first, fall back to older
const IMAGEN_MODELS = [
  'imagen-4.0-generate-001',
  'imagen-3.0-generate-001',
];

const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds for image generation

/**
 * Gemini Imagen Provider
 *
 * Uses Google's Imagen model via the @google/genai SDK to generate images.
 * Returns base64 image data that needs to be converted to blob/URL.
 */
export const geminiImageProvider: ImageProvider = {
  name: 'gemini-imagen',

  isAvailable(businessInfo: BusinessInfo): boolean {
    return !!businessInfo.geminiApiKey;
  },

  async generate(
    placeholder: ImagePlaceholder,
    options: ImageGenerationOptions,
    businessInfo: BusinessInfo,
    config?: ProviderConfig
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const timeoutMs = config?.timeoutMs || DEFAULT_TIMEOUT_MS;

    if (!businessInfo.geminiApiKey) {
      return {
        success: false,
        error: 'Gemini API key not configured. Add it in Settings → API Keys.',
        provider: this.name,
        durationMs: Date.now() - startTime,
      };
    }

    // Build the image generation prompt
    const prompt = buildImagePrompt(placeholder, options, businessInfo);

    // Determine aspect ratio from placeholder specs
    const aspectRatio = getAspectRatio(placeholder.specs.width, placeholder.specs.height);

    const ai = new GoogleGenAI({ apiKey: businessInfo.geminiApiKey });

    // Try models in order until one works
    let lastError: string = 'No Imagen models available';

    for (const modelId of IMAGEN_MODELS) {
      try {
        const result = await generateWithModel(
          ai,
          modelId,
          prompt,
          aspectRatio,
          timeoutMs
        );

        if (result.success) {
          return {
            ...result,
            provider: this.name,
            durationMs: Date.now() - startTime,
          };
        }

        lastError = result.error || 'Unknown error';

        // If it's a model-specific error, try next model
        if (lastError.includes('not found') || lastError.includes('not supported')) {
          continue;
        }

        // For other errors (rate limit, content policy), don't retry with different model
        break;

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown Imagen error';

        // If model not found, try next
        if (lastError.includes('not found') || lastError.includes('404')) {
          continue;
        }

        break;
      }
    }

    return {
      success: false,
      error: formatError(lastError),
      provider: this.name,
      durationMs: Date.now() - startTime,
    };
  },
};

/**
 * Generate image with a specific Imagen model
 */
async function generateWithModel(
  ai: GoogleGenAI,
  modelId: string,
  prompt: string,
  aspectRatio: string,
  timeoutMs: number
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await ai.models.generateImages({
      model: modelId,
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: aspectRatio as '1:1' | '3:4' | '4:3' | '9:16' | '16:9',
        // Don't allow person generation by default (can be made configurable)
        personGeneration: PersonGeneration.DONT_ALLOW,
      },
    });

    clearTimeout(timeoutId);

    if (!response.generatedImages || response.generatedImages.length === 0) {
      return {
        success: false,
        error: 'Imagen returned no images. The prompt may have been blocked by content policy.',
      };
    }

    const generatedImage = response.generatedImages[0];
    const imageBytes = generatedImage.image?.imageBytes;

    if (!imageBytes) {
      return {
        success: false,
        error: 'Imagen returned empty image data.',
      };
    }

    // Convert base64 to Blob
    const binaryString = atob(imageBytes);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/png' });

    return {
      success: true,
      blob,
    };

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: `Image generation timed out after ${timeoutMs / 1000} seconds.`,
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Unknown error during image generation.',
    };
  }
}

/**
 * Get style description for prompt
 */
function getStyleDescription(style?: string): string {
  switch (style) {
    case 'photorealistic':
      return 'Photorealistic, professional photography style, natural lighting';
    case 'illustration':
      return 'Digital illustration style, clean vector-like artwork';
    case 'cartoon':
      return 'Cartoon style, colorful and playful, friendly illustration';
    case 'minimal':
      return 'Minimalist design, simple shapes, clean and modern';
    case 'artistic':
      return 'Artistic style, creative and expressive, unique visual approach';
    case 'technical':
      return 'Technical illustration style, precise and detailed, educational';
    default:
      return 'Professional, clean, suitable for web publication';
  }
}

/**
 * Build a detailed prompt for image generation based on placeholder and context
 */
function buildImagePrompt(
  placeholder: ImagePlaceholder,
  options: ImageGenerationOptions,
  businessInfo: BusinessInfo
): string {
  const parts: string[] = [];

  // Start with style direction if specified
  if (options.style) {
    parts.push(getStyleDescription(options.style));
  }

  // Start with the placeholder description (primary visual direction)
  parts.push(placeholder.description);

  // Add text overlay context if provided (but not as literal text in image)
  if (options.textOverlay) {
    parts.push(`The image should visually represent: "${options.textOverlay}"`);
  }

  // Add additional prompt if provided
  if (options.additionalPrompt) {
    parts.push(options.additionalPrompt);
  }

  // Add custom instructions from map settings
  if (options.customInstructions) {
    parts.push(options.customInstructions);
  }

  // Add business context for brand consistency
  if (businessInfo.industry) {
    parts.push(`Industry context: ${businessInfo.industry}`);
  }

  // Add style guidance based on image type
  const typeGuidance = getTypeStyleGuidance(placeholder.type);
  if (typeGuidance) {
    parts.push(typeGuidance);
  }

  // Add brand color hints if available
  if (businessInfo.brandKit?.colors?.primary) {
    parts.push(`Incorporate the brand color ${businessInfo.brandKit.colors.primary} subtly where appropriate.`);
  }

  // Quality and style modifiers (only if no specific style set)
  if (!options.style) {
    parts.push('High quality, professional, clean composition, suitable for web publication.');
  }

  return parts.join('. ');
}

/**
 * Get style guidance based on image type
 */
function getTypeStyleGuidance(type: string): string | null {
  switch (type) {
    case 'HERO':
      return 'Create a bold, attention-grabbing hero image with space for text overlay. Wide format, dramatic lighting.';
    case 'SECTION':
      return 'Create a supporting image that illustrates the concept clearly. Clean and focused.';
    case 'INFOGRAPHIC':
      return 'Create a visual that could serve as a base for an infographic. Clean layout, organized visual hierarchy.';
    case 'CHART':
      return 'Create an abstract visualization or data-themed image. Clean, modern, analytical feel.';
    case 'DIAGRAM':
      return 'Create a clear, explanatory visual. Simple shapes, clear relationships, educational style.';
    case 'AUTHOR':
      return 'Create a professional headshot-style background or avatar base. Clean, trustworthy, approachable.';
    default:
      return null;
  }
}

/**
 * Convert width/height to Imagen aspect ratio
 */
function getAspectRatio(width: number, height: number): string {
  const ratio = width / height;

  // Map to closest supported aspect ratio
  if (ratio >= 1.7) return '16:9';  // 1.78
  if (ratio >= 1.2) return '4:3';   // 1.33
  if (ratio >= 0.9) return '1:1';   // 1.0
  if (ratio >= 0.7) return '3:4';   // 0.75
  return '9:16';                     // 0.56
}

/**
 * Format error message with actionable guidance
 */
function formatError(error: string): string {
  const lowerError = error.toLowerCase();

  if (lowerError.includes('quota') || lowerError.includes('rate limit')) {
    return 'Gemini Imagen rate limit reached. Please wait a moment and try again.';
  }

  if (lowerError.includes('content') || lowerError.includes('policy') || lowerError.includes('blocked')) {
    return 'Image generation blocked by content policy. Try rephrasing the description.';
  }

  if (lowerError.includes('api key') || lowerError.includes('unauthorized') || lowerError.includes('401')) {
    return 'Gemini API key is invalid or expired. Check your API key in Settings.';
  }

  if (lowerError.includes('not found') || lowerError.includes('404')) {
    return 'Imagen model not available. This may be a regional restriction or the model may not be enabled for your API key.';
  }

  if (lowerError.includes('timeout')) {
    return error; // Already formatted
  }

  return `Gemini Imagen error: ${error}`;
}

export default geminiImageProvider;
