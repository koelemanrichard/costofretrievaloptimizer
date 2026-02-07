// services/ai/imageGeneration/providers/markupGoProvider.ts
import { ImagePlaceholder, BusinessInfo, BrandKit } from '../../../../types';
import { ImageProvider, ImageGenerationOptions, GenerationResult, ProviderConfig } from './types';
import { DEFAULT_MARKUPGO_TEMPLATE_ID } from '../../../../config/imageTemplates';

const MARKUPGO_API_URL = 'https://api.markupgo.com/api/v1/image';
const DEFAULT_TIMEOUT_MS = 30000;

interface MarkupGoResponse {
  url?: string;
  error?: string;
  message?: string;
}

/**
 * MarkupGo Image Provider
 *
 * Uses MarkupGo's template-based API to generate hero images with text overlays.
 * API format:
 * {
 *   source: {
 *     type: "template",
 *     data: {
 *       id: templateId,
 *       context: { title, subtitle, logo, background, description, "alt-tag" },
 *       format: "jpeg" | "webp" | "png"
 *     }
 *   }
 * }
 */
export const markupGoProvider: ImageProvider = {
  name: 'markupgo',

  isAvailable(businessInfo: BusinessInfo): boolean {
    return !!businessInfo.markupGoApiKey;
  },

  async generate(
    placeholder: ImagePlaceholder,
    options: ImageGenerationOptions,
    businessInfo: BusinessInfo,
    config?: ProviderConfig
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const timeoutMs = config?.timeoutMs || DEFAULT_TIMEOUT_MS;

    if (!businessInfo.markupGoApiKey) {
      return {
        success: false,
        error: 'MarkupGo API key not configured. Add it in Settings → Business Info → Brand Kit.',
        provider: this.name,
        durationMs: Date.now() - startTime,
      };
    }

    // Resolve template ID: user override → brandKit default → global default
    const templateId = options.templateId
      || businessInfo.brandKit?.markupGoDefaultTemplateId
      || DEFAULT_MARKUPGO_TEMPLATE_ID;

    const brandKit = businessInfo.brandKit;

    // Build context for MarkupGo template
    const context: Record<string, string | undefined> = {
      title: options.textOverlay || placeholder.description.slice(0, 50),
      subtitle: undefined, // Can be extended later
      logo: brandKit?.logo?.url,
      description: placeholder.description,
      'alt-tag': options.altText,
    };

    // Determine output format based on specs
    const format = getOutputFormat(placeholder.specs.format);

    const requestBody = {
      source: {
        type: 'template',
        data: {
          id: templateId,
          context,
          format,
        },
      },
    };

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(MARKUPGO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': businessInfo.markupGoApiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `MarkupGo API error (${response.status})`;

        // Try to parse error JSON
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          if (errorText) {
            errorMessage += `: ${errorText.slice(0, 200)}`;
          }
        }

        // Provide specific guidance based on error code
        if (response.status === 401 || response.status === 403) {
          errorMessage = 'MarkupGo API key is invalid or expired. Check your API key in Settings.';
        } else if (response.status === 404) {
          errorMessage = `MarkupGo template not found (ID: ${templateId}). Check the template ID in Brand Kit settings.`;
        } else if (response.status === 429) {
          errorMessage = 'MarkupGo rate limit exceeded. Please wait a moment and try again.';
        }

        return {
          success: false,
          error: errorMessage,
          provider: this.name,
          durationMs: Date.now() - startTime,
        };
      }

      const result: MarkupGoResponse = await response.json();

      if (!result.url) {
        return {
          success: false,
          error: result.error || result.message || 'MarkupGo returned no image URL',
          provider: this.name,
          durationMs: Date.now() - startTime,
        };
      }

      return {
        success: true,
        imageUrl: result.url,
        provider: this.name,
        durationMs: Date.now() - startTime,
      };

    } catch (error) {
      clearTimeout(timeoutId);

      let errorMessage = 'Unknown MarkupGo error';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `MarkupGo request timed out after ${timeoutMs / 1000} seconds. Try again or check your network.`;
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Network error connecting to MarkupGo. Check your internet connection.';
        } else {
          errorMessage = error.message;
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
 * Convert internal format to MarkupGo format
 */
function getOutputFormat(internalFormat: string): 'jpeg' | 'webp' | 'png' {
  switch (internalFormat) {
    case 'avif':
    case 'jpeg':
      return 'jpeg';
    case 'webp':
      return 'webp';
    case 'png':
      return 'png';
    default:
      return 'jpeg';
  }
}

export default markupGoProvider;
