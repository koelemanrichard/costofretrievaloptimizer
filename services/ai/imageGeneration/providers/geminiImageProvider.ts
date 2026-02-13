// services/ai/imageGeneration/providers/geminiImageProvider.ts
import { GoogleGenAI, PersonGeneration } from '@google/genai';
import { ImagePlaceholder, BusinessInfo } from '../../../../types';
import { ImageProvider, ImageGenerationOptions, GenerationResult, ProviderConfig } from './types';
import { IMAGE_SPECS_BY_TYPE } from '../../../../config/imageTemplates';
import {
  IMAGE_TYPE_PROMPTS,
  buildNoTextInstruction,
  normalizeImageType
} from '../../../../config/imageTypeRouting';
import { ImageStyle } from '../../../../types/contextualEditor';

// Imagen models — Imagen 3 (stable) first, Imagen 4 (experimental) as fallback
const IMAGEN_MODELS = [
  'imagen-3.0-generate-001',
  'imagen-4.0-generate-001',
];

const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds for image generation

// Retry configuration for transient errors
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// Image types that may include people
const PERSON_IMAGE_TYPES = new Set(['portrait', 'action', 'team', 'lifestyle']);

/**
 * Sleep helper for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable (transient)
 */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  const errorAny = error as any;
  const status = errorAny.status || errorAny.httpStatusCode;

  // Retry on: 429 (rate limit), 500 (internal), 503 (unavailable)
  if (status === 429 || status === 500 || status === 503) return true;
  if (msg.includes('rate limit') || msg.includes('quota')) return true;
  if (msg.includes('internal') || msg.includes('unavailable')) return true;
  if (msg.includes('503') || msg.includes('500') || msg.includes('429')) return true;

  return false;
}

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

    // Determine person generation setting based on image type
    const normalizedType = normalizeImageType(placeholder.type as ImageStyle);
    const allowPeople = PERSON_IMAGE_TYPES.has(normalizedType);

    const ai = new GoogleGenAI({ apiKey: businessInfo.geminiApiKey });

    // Try models in order until one works
    let lastError: string = 'No Imagen models available';

    for (const modelId of IMAGEN_MODELS) {
      try {
        const result = await generateWithRetry(
          ai,
          modelId,
          prompt,
          aspectRatio,
          timeoutMs,
          allowPeople
        );

        if (result.success) {
          console.log(`[Gemini Imagen] Success with model: ${modelId}`);
          return {
            ...result,
            provider: `gemini-imagen/${modelId}`,
            durationMs: Date.now() - startTime,
          };
        }

        lastError = result.error || 'Unknown error';

        // If it's a model-specific error, try next model
        if (lastError.includes('not found') || lastError.includes('not supported')) {
          continue;
        }

        // For other errors (content policy), don't retry with different model
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
 * Generate image with retry and exponential backoff for transient errors
 */
async function generateWithRetry(
  ai: GoogleGenAI,
  modelId: string,
  prompt: string,
  aspectRatio: string,
  timeoutMs: number,
  allowPeople: boolean
): Promise<{ success: boolean; blob?: Blob; error?: string }> {
  let lastError: string = '';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = await generateWithModel(ai, modelId, prompt, aspectRatio, timeoutMs, allowPeople);

    if (result.success) {
      return result;
    }

    lastError = result.error || 'Unknown error';

    // Check if this error is retryable
    // We create a synthetic error to check
    const syntheticError = new Error(lastError);
    if (!isRetryableError(syntheticError) || attempt === MAX_RETRIES - 1) {
      return result;
    }

    // Exponential backoff: 1s → 2s → 4s
    const delay = BASE_DELAY_MS * Math.pow(2, attempt);
    console.warn(`[Gemini Imagen] Retryable error on attempt ${attempt + 1}/${MAX_RETRIES}, waiting ${delay}ms: ${lastError}`);
    await sleep(delay);
  }

  return { success: false, error: lastError };
}

/**
 * Generate image with a specific Imagen model
 */
async function generateWithModel(
  ai: GoogleGenAI,
  modelId: string,
  prompt: string,
  aspectRatio: string,
  timeoutMs: number,
  allowPeople: boolean
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
        personGeneration: allowPeople
          ? PersonGeneration.ALLOW_ADULT
          : PersonGeneration.DONT_ALLOW,
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

    console.error('[Gemini Imagen] Generation error:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: `Image generation timed out after ${timeoutMs / 1000} seconds.`,
        };
      }

      // For retryable errors, include status info
      const errorAny = error as any;
      let detailedError = error.message;

      if (errorAny.details) {
        detailedError += ` Details: ${JSON.stringify(errorAny.details)}`;
      }
      if (errorAny.status) {
        detailedError += ` (Status: ${errorAny.status})`;
      }
      if (errorAny.errorDetails) {
        detailedError += ` ${JSON.stringify(errorAny.errorDetails)}`;
      }

      return {
        success: false,
        error: detailedError,
      };
    }

    return {
      success: false,
      error: 'Unknown error during image generation.',
    };
  }
}

/**
 * Filter description to remove terms that could trigger unwanted text generation
 */
function filterDescriptionForAvoidTerms(description: string, avoidTerms: readonly string[]): string {
  let filtered = description;
  for (const term of avoidTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    filtered = filtered.replace(regex, '').replace(/\s+/g, ' ').trim();
  }
  return filtered;
}

/**
 * Build a detailed prompt for image generation based on placeholder and context
 * Uses the photographic-first routing configuration for optimal results
 */
function buildImagePrompt(
  placeholder: ImagePlaceholder,
  options: ImageGenerationOptions,
  businessInfo: BusinessInfo
): string {
  const parts: string[] = [];

  // Normalize the image type and get the mapping
  const normalizedType = normalizeImageType(placeholder.type as ImageStyle);
  const mapping = IMAGE_TYPE_PROMPTS[normalizedType] ?? IMAGE_TYPE_PROMPTS.scene;

  // Start with tier-appropriate base instruction
  if (mapping.tier === 'photographic') {
    parts.push('Create a professional photograph');
  } else if (mapping.tier === 'minimal-diagram') {
    parts.push('Create a minimal diagram with simple geometric shapes');
  }

  // Add the prompt modifiers from the routing configuration
  parts.push(mapping.promptModifiers.join(', '));

  // Filter description through avoid terms and add it
  const filteredDescription = filterDescriptionForAvoidTerms(
    placeholder.description,
    mapping.avoidTerms
  );
  if (filteredDescription) {
    parts.push(filteredDescription);
  }

  // Add text overlay context if provided (but not as literal text in image)
  if (options.textOverlay) {
    parts.push(`The image should visually represent: "${options.textOverlay}"`);
  }

  if (options.additionalPrompt) {
    parts.push(options.additionalPrompt);
  }

  if (options.customInstructions) {
    parts.push(options.customInstructions);
  }

  if (businessInfo.industry) {
    parts.push(`Industry context: ${businessInfo.industry}`);
  }

  if (businessInfo.brandKit?.colors?.primary) {
    parts.push(`Incorporate the brand color ${businessInfo.brandKit.colors.primary} subtly where appropriate.`);
  }

  parts.push(buildNoTextInstruction(normalizedType));

  return parts.join('. ');
}

/**
 * Convert width/height to Imagen aspect ratio
 */
function getAspectRatio(width: number, height: number): string {
  const ratio = width / height;

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
