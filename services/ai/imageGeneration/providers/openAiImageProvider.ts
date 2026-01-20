// services/ai/imageGeneration/providers/openAiImageProvider.ts
import { ImagePlaceholder, BusinessInfo } from '../../../../types';
import { ImageProvider, ImageGenerationOptions, GenerationResult, ProviderConfig } from './types';
import { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds for image generation

// Supabase client reference - must be set before using the provider
let supabaseClient: SupabaseClient | null = null;

/**
 * Set the Supabase client for proxy requests
 */
export function setSupabaseClientForImageGen(client: SupabaseClient | null) {
  supabaseClient = client;
}

/**
 * OpenAI DALL-E 3 Provider
 *
 * Uses OpenAI's DALL-E 3 model for high-quality image generation.
 * Routes through Supabase edge function proxy to avoid CORS issues.
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

    // Build the image generation prompt
    const prompt = buildImagePrompt(placeholder, options, businessInfo);

    // Determine size from placeholder specs
    const size = getSize(placeholder.specs.width, placeholder.specs.height);

    try {
      // Use proxy if Supabase client is available (avoids CORS in browser)
      if (supabaseClient) {
        return await generateViaProxy(supabaseClient, prompt, size, timeoutMs, startTime);
      }

      // Fallback to direct API call (will fail in browser due to CORS)
      return await generateDirectly(businessInfo.openAiApiKey, prompt, size, timeoutMs, startTime);

    } catch (error) {
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
        } else if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
          errorMessage = 'CORS error: Image generation proxy not available. Please check your configuration.';
        } else {
          errorMessage = `DALL-E error: ${error.message}`;
        }
      }

      return {
        success: false,
        error: errorMessage,
        provider: 'dall-e-3',
        durationMs: Date.now() - startTime,
      };
    }
  },
};

/**
 * Generate image via Supabase proxy to avoid CORS
 */
async function generateViaProxy(
  supabase: SupabaseClient,
  prompt: string,
  size: string,
  timeoutMs: number,
  startTime: number
): Promise<GenerationResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { data, error } = await supabase.functions.invoke('openai-image-proxy', {
      body: {
        prompt,
        model: 'dall-e-3',
        size,
        quality: 'standard',
        style: 'natural',
        response_format: 'b64_json',
        n: 1
      }
    });

    clearTimeout(timeoutId);

    if (error) {
      // Try to extract the actual error message from the response data
      // Supabase SDK may put the response body in data even on error
      let errorMessage = 'Image generation proxy failed';

      if (data?.error) {
        // The edge function returned a JSON error response
        errorMessage = data.error;
      } else if (error.message) {
        // Check if it's a generic Supabase error vs actual error
        if (error.message.includes('non-2xx')) {
          errorMessage = 'OpenAI image proxy returned an error. Check your API key configuration in Settings.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
        provider: 'dall-e-3',
        durationMs: Date.now() - startTime,
      };
    }

    if (!data?.success || !data?.data || data.data.length === 0) {
      return {
        success: false,
        error: data?.error || 'DALL-E returned no images',
        provider: 'dall-e-3',
        durationMs: Date.now() - startTime,
      };
    }

    const imageData = data.data[0];
    const b64Json = imageData.b64_json;

    if (!b64Json) {
      // If we got a URL instead of base64, fetch and convert
      if (imageData.url) {
        const response = await fetch(imageData.url);
        const blob = await response.blob();
        return {
          success: true,
          blob,
          provider: 'dall-e-3',
          durationMs: Date.now() - startTime,
        };
      }

      return {
        success: false,
        error: 'DALL-E returned empty image data',
        provider: 'dall-e-3',
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
      provider: 'dall-e-3',
      durationMs: Date.now() - startTime,
    };

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Direct API call (for server-side or testing)
 */
async function generateDirectly(
  apiKey: string,
  prompt: string,
  size: string,
  timeoutMs: number,
  startTime: number
): Promise<GenerationResult> {
  // Dynamic import to avoid bundling issues
  const OpenAI = (await import('openai')).default;

  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: size as '1024x1024' | '1024x1792' | '1792x1024',
      quality: 'standard',
      response_format: 'b64_json',
      style: 'natural',
    });

    clearTimeout(timeoutId);

    if (!response.data || response.data.length === 0) {
      return {
        success: false,
        error: 'DALL-E returned no images',
        provider: 'dall-e-3',
        durationMs: Date.now() - startTime,
      };
    }

    const imageData = response.data[0];
    const b64Json = imageData.b64_json;

    if (!b64Json) {
      return {
        success: false,
        error: 'DALL-E returned empty image data',
        provider: 'dall-e-3',
        durationMs: Date.now() - startTime,
      };
    }

    const binaryString = atob(b64Json);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/png' });

    return {
      success: true,
      blob,
      provider: 'dall-e-3',
      durationMs: Date.now() - startTime,
    };

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
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
