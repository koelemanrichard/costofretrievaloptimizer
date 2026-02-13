// services/ai/imageGeneration/providers/openAiImageProvider.ts
import { ImagePlaceholder, BusinessInfo } from '../../../../types';
import { ImageProvider, ImageGenerationOptions, GenerationResult, ProviderConfig } from './types';
import {
  IMAGE_TYPE_PROMPTS,
  buildNoTextInstruction,
  getPromptModifiers,
  getAvoidTerms,
  normalizeImageType
} from '../../../../config/imageTypeRouting';
import { ImageStyle } from '../../../../types/contextualEditor';

const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds for image generation

// Supabase function URL — set by orchestrator
let supabaseFunctionsUrl: string | null = null;

/**
 * Set the Supabase functions base URL for proxy requests.
 * Expected format: "https://<project>.supabase.co/functions/v1"
 */
export function setSupabaseFunctionsUrl(url: string | null) {
  supabaseFunctionsUrl = url;
}

/**
 * OpenAI Image Provider (GPT Image 1 + DALL-E 3 fallback)
 *
 * Uses OpenAI's image generation API via Supabase edge function proxy.
 * Passes the API key directly via header — no JWT dependency.
 */
export const openAiImageProvider: ImageProvider = {
  name: 'openai-images',

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

    // Try gpt-image-1 first, fall back to dall-e-3
    const models = ['gpt-image-1', 'dall-e-3'] as const;
    let lastError = '';

    for (const model of models) {
      try {
        const size = getSize(placeholder.specs.width, placeholder.specs.height, model);
        const result = await generateViaProxy(
          businessInfo.openAiApiKey,
          prompt,
          model,
          size,
          timeoutMs,
          startTime
        );

        if (result.success) {
          return { ...result, provider: `openai/${model}` };
        }

        lastError = result.error || 'Unknown error';

        // If model-specific error (not found, not available), try next model
        if (lastError.includes('not found') || lastError.includes('not available') ||
            lastError.includes('invalid_model') || lastError.includes('does not exist')) {
          console.warn(`[OpenAI Image] ${model} not available, trying next model...`);
          continue;
        }

        // For other errors (content policy, rate limit, billing), don't retry with different model
        break;

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';

        if (error instanceof Error && error.name === 'AbortError') {
          lastError = `Request timed out after ${timeoutMs / 1000} seconds.`;
          break;
        }

        // Model not found → try next
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
 * Generate image via Supabase proxy with API key in header (no JWT dependency)
 */
async function generateViaProxy(
  apiKey: string,
  prompt: string,
  model: 'gpt-image-1' | 'dall-e-3',
  size: string,
  timeoutMs: number,
  startTime: number
): Promise<GenerationResult> {
  if (!supabaseFunctionsUrl) {
    // Fall back to direct API call
    return await generateDirectly(apiKey, prompt, model, size, timeoutMs, startTime);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const isGptImage = model === 'gpt-image-1';
    const url = `${supabaseFunctionsUrl}/openai-image-proxy`;

    const body: Record<string, unknown> = {
      prompt,
      model,
      size,
      n: 1,
    };

    if (isGptImage) {
      body.quality = 'medium';
      // gpt-image-1 has no style parameter
    } else {
      body.quality = 'standard';
      body.style = 'natural';
      body.response_format = 'b64_json';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-openai-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data?.error || `Proxy returned ${response.status}`;
      return {
        success: false,
        error: errorMessage,
        provider: `openai/${model}`,
        durationMs: Date.now() - startTime,
      };
    }

    if (!data?.success || !data?.data || data.data.length === 0) {
      return {
        success: false,
        error: data?.error || 'OpenAI returned no images',
        provider: `openai/${model}`,
        durationMs: Date.now() - startTime,
      };
    }

    const imageData = data.data[0];
    const b64Json = imageData.b64_json;

    if (!b64Json) {
      // If we got a URL instead of base64, fetch and convert
      if (imageData.url) {
        const imgResponse = await fetch(imageData.url);
        const blob = await imgResponse.blob();
        return {
          success: true,
          blob,
          provider: `openai/${model}`,
          durationMs: Date.now() - startTime,
        };
      }

      return {
        success: false,
        error: 'OpenAI returned empty image data',
        provider: `openai/${model}`,
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
      provider: `openai/${model}`,
      durationMs: Date.now() - startTime,
    };

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Direct API call (fallback when no proxy URL configured)
 */
async function generateDirectly(
  apiKey: string,
  prompt: string,
  model: 'gpt-image-1' | 'dall-e-3',
  size: string,
  timeoutMs: number,
  startTime: number
): Promise<GenerationResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const isGptImage = model === 'gpt-image-1';

    const body: Record<string, unknown> = {
      model,
      prompt,
      n: 1,
      size,
    };

    if (isGptImage) {
      body.quality = 'medium';
      body.output_format = 'png';
    } else {
      body.quality = 'standard';
      body.response_format = 'b64_json';
      body.style = 'natural';
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data?.error?.message || 'Image generation failed',
        provider: `openai/${model}`,
        durationMs: Date.now() - startTime,
      };
    }

    if (!data?.data || data.data.length === 0) {
      return {
        success: false,
        error: 'OpenAI returned no images',
        provider: `openai/${model}`,
        durationMs: Date.now() - startTime,
      };
    }

    const imageData = data.data[0];
    const b64Json = imageData.b64_json;

    if (!b64Json) {
      if (imageData.url) {
        const imgResponse = await fetch(imageData.url);
        const blob = await imgResponse.blob();
        return {
          success: true,
          blob,
          provider: `openai/${model}`,
          durationMs: Date.now() - startTime,
        };
      }

      return {
        success: false,
        error: 'OpenAI returned empty image data',
        provider: `openai/${model}`,
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
      provider: `openai/${model}`,
      durationMs: Date.now() - startTime,
    };

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Format error message with actionable guidance
 */
function formatError(error: string): string {
  const lower = error.toLowerCase();

  if (lower.includes('content_policy') || lower.includes('content policy')) {
    return 'Image generation blocked by content policy. Try rephrasing the description.';
  }
  if (lower.includes('rate_limit') || lower.includes('429')) {
    return 'OpenAI rate limit reached. Please wait a moment and try again.';
  }
  if (lower.includes('invalid_api_key') || lower.includes('401')) {
    return 'OpenAI API key is invalid or expired. Check your API key in Settings.';
  }
  if (lower.includes('billing') || lower.includes('quota')) {
    return 'OpenAI billing/quota issue. Check your OpenAI account billing status.';
  }
  if (lower.includes('cors') || lower.includes('failed to fetch')) {
    return 'CORS error: Image generation proxy not available. Please check your configuration.';
  }
  if (lower.includes('timeout')) {
    return error; // Already formatted
  }

  return `OpenAI image error: ${error}`;
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
 * Build a detailed prompt for image generation
 * Uses photographic-first routing configuration
 */
function buildImagePrompt(
  placeholder: ImagePlaceholder,
  options: ImageGenerationOptions,
  businessInfo: BusinessInfo
): string {
  const parts: string[] = [];

  // Normalize the image type to handle legacy mappings
  const normalizedType = normalizeImageType(placeholder.type as ImageStyle);
  const mapping = IMAGE_TYPE_PROMPTS[normalizedType];

  // Get avoid terms to filter from description
  const avoidTerms = getAvoidTerms(normalizedType);

  // Start with tier-appropriate base instruction
  if (mapping?.tier === 'minimal-diagram') {
    parts.push('Minimal diagram with simple geometric shapes');
  } else {
    parts.push('Professional photograph');
  }

  // Add style direction if specified (optional override)
  if (options.style) {
    parts.push(getStyleDescription(options.style));
  }

  // Add the prompt modifiers from the routing configuration
  const promptModifiers = getPromptModifiers(normalizedType);
  parts.push(promptModifiers.join(', '));

  // Filter the placeholder description through avoid terms
  let filteredDescription = placeholder.description;
  for (const term of avoidTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    filteredDescription = filteredDescription.replace(regex, '');
  }
  filteredDescription = filteredDescription.replace(/\s+/g, ' ').trim();

  if (filteredDescription) {
    parts.push(filteredDescription);
  }

  // Add text overlay context if provided (but not as literal text)
  if (options.textOverlay) {
    parts.push(`The image should visually represent the concept: "${options.textOverlay}"`);
  }

  if (options.additionalPrompt) {
    parts.push(options.additionalPrompt);
  }

  if (options.customInstructions) {
    parts.push(options.customInstructions);
  }

  if (businessInfo.industry) {
    parts.push(`Context: ${businessInfo.industry} industry`);
  }

  if (businessInfo.brandKit?.colors?.primary) {
    parts.push(`Consider incorporating the color ${businessInfo.brandKit.colors.primary} where appropriate.`);
  }

  if (!options.style) {
    parts.push('Professional quality, clean composition, suitable for a website hero image or blog post.');
  }

  parts.push(buildNoTextInstruction(normalizedType));

  return parts.join('. ');
}

/**
 * Convert width/height to model-appropriate size
 *
 * DALL-E 3 sizes: 1024x1024, 1024x1792 (portrait), 1792x1024 (landscape)
 * GPT Image 1 sizes: 1024x1024, 1024x1536 (portrait), 1536x1024 (landscape), auto
 */
function getSize(
  width: number,
  height: number,
  model: 'gpt-image-1' | 'dall-e-3'
): string {
  const ratio = width / height;

  if (model === 'gpt-image-1') {
    if (ratio > 1.3) return '1536x1024';  // Landscape
    if (ratio < 0.7) return '1024x1536';  // Portrait
    return '1024x1024';                    // Square
  }

  // dall-e-3
  if (ratio > 1.3) return '1792x1024';  // Landscape
  if (ratio < 0.7) return '1024x1792';  // Portrait
  return '1024x1024';                    // Square
}

export default openAiImageProvider;
