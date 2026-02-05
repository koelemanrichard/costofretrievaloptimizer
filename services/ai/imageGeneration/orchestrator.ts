// services/ai/imageGeneration/orchestrator.ts
import { ImagePlaceholder, BusinessInfo, BrandKit, ImageGenerationProgress } from '../../../types';
import { markupGoProvider } from './providers/markupGoProvider';
import { geminiImageProvider } from './providers/geminiImageProvider';
import { openAiImageProvider, setSupabaseClientForImageGen } from './providers/openAiImageProvider';
import { ImageProvider, ImageGenerationOptions, GenerationResult, ProgressCallback } from './providers/types';
import { uploadToCloudinary } from '../../cloudinaryService';
import { DEFAULT_HERO_TEMPLATES } from '../../../config/imageTemplates';
import { SupabaseClient } from '@supabase/supabase-js';

export type { ImageGenerationOptions } from './providers/types';

// Storage bucket for generated images
const IMAGE_STORAGE_BUCKET = 'generated-images';

// Store Supabase client reference for storage uploads
let supabaseClientRef: SupabaseClient | null = null;

/**
 * Initialize image generation with Supabase client for proxy support
 * Must be called before generating images to enable CORS-free generation
 */
export function initImageGeneration(supabase: SupabaseClient | null) {
  supabaseClientRef = supabase;
  setSupabaseClientForImageGen(supabase);
}

/**
 * Ensure the Supabase client is ready for authenticated requests.
 * This fixes the first-run race condition where the user clicks "Generate"
 * before the Supabase SDK has finished establishing the auth state.
 *
 * Call this before the first image generation to warm up the auth connection.
 * Returns true if the client is ready, false if not authenticated.
 */
export async function ensureClientReady(): Promise<boolean> {
  if (!supabaseClientRef) {
    console.warn('[ImageOrchestrator] ensureClientReady: No Supabase client available');
    return false;
  }

  try {
    // Make a lightweight call to verify auth is ready
    // This forces the SDK to complete any pending auth initialization
    const { data, error } = await supabaseClientRef.auth.getSession();

    if (error) {
      console.warn('[ImageOrchestrator] ensureClientReady: Auth check failed:', error.message);
      return false;
    }

    if (!data.session) {
      console.warn('[ImageOrchestrator] ensureClientReady: No active session');
      return false;
    }

    console.log('[ImageOrchestrator] ensureClientReady: Client ready, session active');
    return true;
  } catch (err) {
    console.warn('[ImageOrchestrator] ensureClientReady: Error checking auth:', err);
    return false;
  }
}

/**
 * Upload a blob to Supabase Storage and return a public URL
 * This provides persistent image storage without requiring Cloudinary
 */
async function uploadToSupabaseStorage(
  blob: Blob,
  placeholder: ImagePlaceholder,
  businessInfo: BusinessInfo
): Promise<string | null> {
  if (!supabaseClientRef) {
    console.warn('[ImageOrchestrator] No Supabase client available for storage upload');
    return null;
  }

  try {
    // Generate a unique filename
    const timestamp = Date.now();
    const entity = (businessInfo.seedKeyword || 'image').toLowerCase().replace(/[^a-z0-9]/gi, '-');
    const type = placeholder.type.toLowerCase();
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const filename = `${entity}/${type}-${timestamp}.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseClientRef.storage
      .from(IMAGE_STORAGE_BUCKET)
      .upload(filename, blob, {
        contentType: blob.type,
        upsert: false,
        cacheControl: '31536000' // 1 year cache
      });

    if (error) {
      // Check if bucket doesn't exist
      if (error.message.includes('Bucket not found')) {
        console.warn('[ImageOrchestrator] Storage bucket not found. Images will use temporary URLs.');
        console.info('[ImageOrchestrator] To enable persistent images, create a public bucket named "generated-images" in Supabase.');
        return null;
      }
      console.error('[ImageOrchestrator] Supabase Storage upload failed:', error.message);
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabaseClientRef.storage
      .from(IMAGE_STORAGE_BUCKET)
      .getPublicUrl(filename);

    if (urlData?.publicUrl) {
      console.log('[ImageOrchestrator] Image uploaded to Supabase Storage:', filename);
      return urlData.publicUrl;
    }

    return null;
  } catch (err) {
    console.error('[ImageOrchestrator] Supabase Storage upload error:', err);
    return null;
  }
}

// Alias for backwards compatibility
export type GenerationOptions = ImageGenerationOptions;

/**
 * Provider priority order for different image types
 * HERO: MarkupGo (template-based) → Gemini → DALL-E
 * Others: Gemini → DALL-E (no template-based providers)
 */
function getProviderOrder(placeholder: ImagePlaceholder, businessInfo: BusinessInfo): ImageProvider[] {
  if (placeholder.type === 'HERO') {
    return [markupGoProvider, geminiImageProvider, openAiImageProvider];
  }
  // Non-hero images: AI generation only
  return [geminiImageProvider, openAiImageProvider];
}

/**
 * Generate an image using fallback providers with progress reporting
 */
export async function generateImage(
  placeholder: ImagePlaceholder,
  options: ImageGenerationOptions,
  businessInfo: BusinessInfo,
  onProgress?: ProgressCallback
): Promise<ImagePlaceholder> {
  const brandKit = businessInfo.brandKit;
  const providers = getProviderOrder(placeholder, businessInfo);

  // Filter to only available providers
  const availableProviders = providers.filter(p => p.isAvailable(businessInfo));

  if (availableProviders.length === 0) {
    const errorMessage = 'No image generation providers configured. Add an API key for MarkupGo, Gemini, or OpenAI in Settings.';
    onProgress?.({
      phase: 'error',
      provider: undefined,
      progress: 0,
      message: errorMessage,
      error: {
        phase: 'error',
        provider: 'none',
        message: errorMessage,
        retryable: false,
        suggestion: 'Go to Settings → API Keys and configure at least one image provider.',
      },
    });
    return {
      ...placeholder,
      status: 'error',
      errorMessage,
    };
  }

  let lastError: string = '';
  let lastProvider: string = '';

  // Try each provider in order
  for (let i = 0; i < availableProviders.length; i++) {
    const provider = availableProviders[i];
    const isLastProvider = i === availableProviders.length - 1;

    // Report progress
    onProgress?.({
      phase: 'generating',
      provider: provider.name,
      progress: 10 + (i * 20),
      message: `Generating with ${formatProviderName(provider.name)}...`,
    });

    const result = await provider.generate(placeholder, options, businessInfo);

    if (result.success) {
      // Got an image! Now handle upload/URL creation
      let finalUrl: string;
      let blob: Blob | undefined = result.blob;

      if (result.imageUrl) {
        // Provider returned a URL directly (MarkupGo)
        finalUrl = result.imageUrl;
      } else if (result.blob) {
        // Provider returned a blob - upload to Cloudinary or create object URL
        onProgress?.({
          phase: 'uploading',
          provider: provider.name,
          progress: 70,
          message: 'Uploading image...',
        });

        try {
          if (businessInfo.cloudinaryCloudName && businessInfo.cloudinaryApiKey) {
            // Priority 1: Cloudinary (if configured)
            const uploadResult = await uploadToCloudinary(
              result.blob,
              businessInfo,
              {
                folder: `seo-images/${placeholder.type.toLowerCase()}`,
                publicId: generatePublicId(placeholder, businessInfo),
              }
            );
            finalUrl = uploadResult.secure_url;
          } else {
            // Priority 2: Supabase Storage (if available)
            const supabaseUrl = await uploadToSupabaseStorage(result.blob, placeholder, businessInfo);
            if (supabaseUrl) {
              finalUrl = supabaseUrl;
            } else {
              // Fallback: Object URL (temporary, won't persist on reload)
              console.warn('[ImageOrchestrator] No persistent storage available. Image will be lost on page reload.');
              console.warn('[ImageOrchestrator] Configure Cloudinary or create a "generated-images" bucket in Supabase.');
              finalUrl = URL.createObjectURL(result.blob);
            }
          }
        } catch (uploadError) {
          // Cloud upload failed - try Supabase Storage as fallback
          const uploadErrorMsg = uploadError instanceof Error ? uploadError.message : 'Upload failed';
          console.warn(`[ImageOrchestrator] Cloud upload failed: ${uploadErrorMsg}`);

          onProgress?.({
            phase: 'uploading',
            provider: provider.name,
            progress: 80,
            message: 'Trying backup storage...',
          });

          // Try Supabase Storage as backup
          const supabaseUrl = await uploadToSupabaseStorage(result.blob, placeholder, businessInfo);
          if (supabaseUrl) {
            finalUrl = supabaseUrl;
          } else {
            // Final fallback: Object URL (temporary)
            console.warn('[ImageOrchestrator] All storage options failed, using temporary URL');
            finalUrl = URL.createObjectURL(result.blob);
          }
        }
      } else {
        // Shouldn't happen - success but no image data
        lastError = 'Provider returned success but no image data';
        lastProvider = provider.name;
        continue;
      }

      // Success! Build the final placeholder
      onProgress?.({
        phase: 'complete',
        provider: provider.name,
        progress: 100,
        message: 'Image ready',
        previewUrl: finalUrl,
        finalUrl,
      });

      return buildSuccessPlaceholder(placeholder, finalUrl, options, businessInfo, provider.name);
    }

    // Provider failed - record error and try next
    lastError = result.error || 'Unknown error';
    lastProvider = provider.name;

    // If not the last provider, report fallback
    if (!isLastProvider) {
      onProgress?.({
        phase: 'generating',
        provider: provider.name,
        progress: 10 + ((i + 1) * 20),
        message: `${formatProviderName(provider.name)} failed, trying next provider...`,
      });
    }
  }

  // All providers failed
  const errorMessage = formatFinalError(lastError, lastProvider);
  onProgress?.({
    phase: 'error',
    provider: lastProvider,
    progress: 0,
    message: errorMessage,
    error: {
      phase: 'generating',
      provider: lastProvider,
      message: lastError,
      retryable: true,
      suggestion: getSuggestionForError(lastError),
    },
  });

  return {
    ...placeholder,
    status: 'error',
    errorMessage,
  };
}

/**
 * Upload a user-provided image
 */
export async function uploadImage(
  placeholder: ImagePlaceholder,
  file: File,
  altText: string,
  businessInfo: BusinessInfo,
  onProgress?: ProgressCallback
): Promise<ImagePlaceholder> {
  const brandKit = businessInfo.brandKit;

  onProgress?.({
    phase: 'uploading',
    progress: 20,
    message: 'Uploading image...',
  });

  try {
    let finalUrl: string;
    let width = placeholder.specs.width;
    let height = placeholder.specs.height;

    if (businessInfo.cloudinaryCloudName && businessInfo.cloudinaryApiKey) {
      // Priority 1: Cloudinary
      const uploadResult = await uploadToCloudinary(
        file,
        businessInfo,
        {
          folder: `seo-images/${placeholder.type.toLowerCase()}`,
          publicId: generatePublicId(placeholder, businessInfo),
        }
      );
      finalUrl = uploadResult.secure_url;
      width = uploadResult.width;
      height = uploadResult.height;
    } else {
      // Priority 2: Supabase Storage
      const supabaseUrl = await uploadToSupabaseStorage(file, placeholder, businessInfo);
      if (supabaseUrl) {
        finalUrl = supabaseUrl;
      } else {
        // Fallback: Object URL (temporary, won't persist)
        console.warn('[ImageOrchestrator] No persistent storage for uploads. Image will be lost on reload.');
        finalUrl = URL.createObjectURL(file);
      }
    }

    onProgress?.({
      phase: 'complete',
      progress: 100,
      message: 'Upload complete',
      finalUrl,
    });

    return {
      ...placeholder,
      status: 'uploaded',
      userUploadUrl: finalUrl,
      metadata: {
        filename: file.name,
        altText,
        exif: {
          author: brandKit?.copyright?.holder || businessInfo.authorProfile?.name || '',
          copyright: `© ${brandKit?.copyright?.holder || businessInfo.authorProfile?.name || ''} ${new Date().getFullYear()}`,
          software: 'Holistic SEO Generator',
          description: placeholder.description,
        },
        iptc: {
          creator: businessInfo.authorProfile?.name || '',
          rights: brandKit?.copyright?.holder || '',
          source: businessInfo.domain || '',
          keywords: extractKeywords(placeholder.description),
        },
        schema: {
          "@type": "ImageObject",
          url: finalUrl,
          width,
          height,
          caption: altText,
          license: brandKit?.copyright?.licenseUrl,
        },
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    onProgress?.({
      phase: 'error',
      progress: 0,
      message: errorMessage,
      error: {
        phase: 'uploading',
        provider: 'upload',
        message: errorMessage,
        retryable: true,
        suggestion: 'Check your file and try again.',
      },
    });

    return {
      ...placeholder,
      status: 'error',
      errorMessage,
    };
  }
}

/**
 * Build a successful placeholder with all metadata
 */
function buildSuccessPlaceholder(
  placeholder: ImagePlaceholder,
  imageUrl: string,
  options: ImageGenerationOptions,
  businessInfo: BusinessInfo,
  provider: string
): ImagePlaceholder {
  const brandKit = businessInfo.brandKit;

  return {
    ...placeholder,
    status: 'generated',
    generatedUrl: imageUrl,
    metadata: {
      filename: `${generatePublicId(placeholder, businessInfo)}.${placeholder.specs.format}`,
      altText: options.altText,
      generatedBy: provider,
      exif: {
        author: brandKit?.copyright?.holder || businessInfo.authorProfile?.name || '',
        copyright: `© ${brandKit?.copyright?.holder || businessInfo.authorProfile?.name || ''} ${new Date().getFullYear()}`,
        software: 'Holistic SEO Generator',
        description: placeholder.description,
      },
      iptc: {
        creator: businessInfo.authorProfile?.name || '',
        rights: brandKit?.copyright?.holder || '',
        source: businessInfo.domain || '',
        keywords: extractKeywords(placeholder.description),
      },
      schema: {
        "@type": "ImageObject",
        url: imageUrl,
        width: placeholder.specs.width,
        height: placeholder.specs.height,
        caption: options.altText,
        license: brandKit?.copyright?.licenseUrl,
      },
    },
  };
}

function generatePublicId(placeholder: ImagePlaceholder, info: BusinessInfo): string {
  const entity = (info.seedKeyword || 'image').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const type = placeholder.type.toLowerCase();
  const timestamp = Date.now();
  return `${entity}-${type}-${timestamp}`;
}

function extractKeywords(description: string): string[] {
  return description
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 10);
}

function formatProviderName(name: string): string {
  switch (name) {
    case 'markupgo': return 'MarkupGo';
    case 'gemini-imagen': return 'Gemini Imagen';
    case 'dall-e-3': return 'DALL-E 3';
    default: return name;
  }
}

function formatFinalError(error: string, provider: string): string {
  return `All providers failed. Last error (${formatProviderName(provider)}): ${error}`;
}

function getSuggestionForError(error: string): string {
  const lowerError = error.toLowerCase();

  if (lowerError.includes('api key') || lowerError.includes('unauthorized')) {
    return 'Check your API key in Settings → API Keys.';
  }
  if (lowerError.includes('rate limit') || lowerError.includes('quota')) {
    return 'Wait a moment and try again, or check your API quota.';
  }
  if (lowerError.includes('content') || lowerError.includes('policy')) {
    return 'Try rephrasing the image description to avoid content policy restrictions.';
  }
  if (lowerError.includes('timeout')) {
    return 'Check your internet connection and try again.';
  }
  if (lowerError.includes('template')) {
    return 'Check your MarkupGo template ID in Brand Kit settings.';
  }
  return 'Try again or use a different image provider.';
}

// Export default brand kit for backwards compatibility
export function getDefaultBrandKit(): BrandKit {
  return {
    logoPlacement: 'bottom-right',
    logoOpacity: 0.3,
    colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      textOnImage: '#FFFFFF',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    copyright: { holder: '' },
    heroTemplates: DEFAULT_HERO_TEMPLATES,
  };
}
