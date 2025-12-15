// services/ai/imageGeneration/providers/openAiImageProvider.ts
import OpenAI from 'openai';
import { ImagePlaceholder, BusinessInfo } from '../../../../types';
import { ImageProvider, ImageGenerationOptions, GenerationResult, ProviderConfig } from './types';

const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds for image generation

/**
 * OpenAI DALL-E 3 Provider
 *
 * Uses OpenAI's DALL-E 3 model for high-quality image generation.
 * Returns base64 image data that needs to be converted to blob/URL.
 */
export const openAiImageProvider: ImageProvider = {
  name: 'dall-e-3',

  isAvailable(businessInfo: BusinessInfo): boolean {
    return !!businessInfo.openAiApiKey;
  },

  async generate(
    placeholder: ImagePlaceholder,
    options: ImageGenerationOptions,
    businessInfo: BusinessInfo,
    config?: ProviderConfig
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const timeoutMs = config?.timeoutMs || DEFAULT_TIMEOUT_MS;

    if (!businessInfo.openAiApiKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured. Add it in Settings → API Keys.',
        provider: this.name,
        durationMs: Date.now() - startTime,
      };
    }

    const openai = new OpenAI({
      apiKey: businessInfo.openAiApiKey,
      dangerouslyAllowBrowser: true,
    });

    // Build the image generation prompt
    const prompt = buildImagePrompt(placeholder, options, businessInfo);

    // Determine size from placeholder specs
    const size = getSize(placeholder.specs.width, placeholder.specs.height);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality: 'standard', // 'standard' or 'hd'
        response_format: 'b64_json', // Get base64 instead of URL
        style: 'natural', // 'natural' or 'vivid'
      });

      clearTimeout(timeoutId);

      if (!response.data || response.data.length === 0) {
        return {
          success: false,
          error: 'DALL-E returned no images. The prompt may have been blocked by content policy.',
          provider: this.name,
          durationMs: Date.now() - startTime,
        };
      }

      const imageData = response.data[0];
      const b64Json = imageData.b64_json;

      if (!b64Json) {
        return {
          success: false,
          error: 'DALL-E returned empty image data.',
          provider: this.name,
          durationMs: Date.now() - startTime,
        };
      }

      // Convert base64 to Blob
      const binaryString = atob(b64Json);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/png' });

      return {
        success: true,
        blob,
        provider: this.name,
        durationMs: Date.now() - startTime,
      };

    } catch (error) {
      clearTimeout(timeoutId);

      let errorMessage = 'Unknown DALL-E error';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `DALL-E request timed out after ${timeoutMs / 1000} seconds.`;
        } else if (error.message.includes('content_policy')) {
          errorMessage = 'Image generation blocked by content policy. Try rephrasing the description.';
        } else if (error.message.includes('rate_limit') || error.message.includes('429')) {
          errorMessage = 'OpenAI rate limit reached. Please wait a moment and try again.';
        } else if (error.message.includes('invalid_api_key') || error.message.includes('401')) {
          errorMessage = 'OpenAI API key is invalid or expired. Check your API key in Settings.';
        } else if (error.message.includes('billing') || error.message.includes('quota')) {
          errorMessage = 'OpenAI billing/quota issue. Check your OpenAI account billing status.';
        } else {
          errorMessage = `DALL-E error: ${error.message}`;
        }
      }

      return {
        success: false,
        error: errorMessage,
        provider: this.name,
        durationMs: Date.now() - startTime,
      };
    }
  },
};

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
 * Build a detailed prompt for DALL-E image generation
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

  // Start with the placeholder description
  parts.push(placeholder.description);

  // Add text overlay context if provided (but not as literal text)
  if (options.textOverlay) {
    parts.push(`The image should visually represent the concept: "${options.textOverlay}"`);
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
    parts.push(`Context: ${businessInfo.industry} industry`);
  }

  // Add style guidance based on image type
  const typeGuidance = getTypeStyleGuidance(placeholder.type);
  if (typeGuidance) {
    parts.push(typeGuidance);
  }

  // Add brand color hints if available
  if (businessInfo.brandKit?.colors?.primary) {
    parts.push(`Consider incorporating the color ${businessInfo.brandKit.colors.primary} where appropriate.`);
  }

  // Quality and style modifiers for DALL-E (only if no specific style set)
  if (!options.style) {
    parts.push('Professional quality, clean composition, suitable for a website hero image or blog post.');
  }

  // Important: Tell DALL-E NOT to add text
  parts.push('Do not include any text, letters, numbers, or words in the image.');

  return parts.join('. ');
}

/**
 * Get style guidance based on image type
 */
function getTypeStyleGuidance(type: string): string | null {
  switch (type) {
    case 'HERO':
      return 'Create a dramatic, attention-grabbing hero image with space on one side for text overlay. Wide cinematic format.';
    case 'SECTION':
      return 'Create a clear, focused image that illustrates a specific concept. Clean and professional.';
    case 'INFOGRAPHIC':
      return 'Create an abstract or geometric background suitable for an infographic. Clean layout with visual hierarchy.';
    case 'CHART':
      return 'Create an abstract data visualization or analytical themed image. Modern, clean, professional.';
    case 'DIAGRAM':
      return 'Create a clear, educational visual with simple shapes and clear relationships.';
    case 'AUTHOR':
      return 'Create a professional, trustworthy background suitable for an author bio section.';
    default:
      return null;
  }
}

/**
 * Convert width/height to DALL-E 3 supported size
 * DALL-E 3 supports: 1024x1024, 1024x1792 (portrait), 1792x1024 (landscape)
 */
function getSize(width: number, height: number): '1024x1024' | '1024x1792' | '1792x1024' {
  const ratio = width / height;

  if (ratio > 1.3) {
    return '1792x1024'; // Landscape
  } else if (ratio < 0.7) {
    return '1024x1792'; // Portrait
  }
  return '1024x1024'; // Square
}

export default openAiImageProvider;
