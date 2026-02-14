// services/ai/imageGeneration/providers/types.ts
import { ImagePlaceholder, BusinessInfo, ImageGenerationProgress } from '../../../../types';

export interface ImageGenerationOptions {
  textOverlay?: string;
  templateId?: string;  // MarkupGo template ID override
  altText: string;
  additionalPrompt?: string;
  // Style and customization
  style?: 'photorealistic' | 'illustration' | 'cartoon' | 'minimal' | 'artistic' | 'technical';
  customInstructions?: string; // Additional instructions from map settings
  figcaption?: string; // Figcaption from placeholder — used as semantic context hint
  excludeText?: boolean;    // Stronger no-text reinforcement (default: true when undefined)
  excludePeople?: boolean;  // Force no-people across all providers (default: true when undefined)
}

export interface ProviderConfig {
  timeoutMs?: number;
  maxRetries?: number;
}

export interface GenerationResult {
  success: boolean;
  imageUrl?: string;  // Direct URL from provider (e.g., MarkupGo returns URL)
  blob?: Blob;        // Binary image data (e.g., Gemini/DALL-E return base64)
  error?: string;
  provider: string;
  durationMs: number;
}

export type ProgressCallback = (update: ImageGenerationProgress) => void;

export interface ImageProvider {
  name: string;
  isAvailable(businessInfo: BusinessInfo): boolean;
  generate(
    placeholder: ImagePlaceholder,
    options: ImageGenerationOptions,
    businessInfo: BusinessInfo,
    config?: ProviderConfig
  ): Promise<GenerationResult>;
}
