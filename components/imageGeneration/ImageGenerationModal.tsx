// components/imageGeneration/ImageGenerationModal.tsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ImagePlaceholder, BrandKit, BusinessInfo, ImageGenerationProgress, HeroImageMetadata } from '../../types';
import { DEFAULT_HERO_TEMPLATES, DEFAULT_MARKUPGO_TEMPLATE_ID } from '../../config/imageTemplates';
import { generateImage, ImageGenerationOptions, initImageGeneration, ensureClientReady } from '../../services/ai/imageGeneration/orchestrator';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { HeroImageEditor } from './HeroImageEditor';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';

// Re-export for backwards compatibility
export type { ImageGenerationOptions } from '../../services/ai/imageGeneration/orchestrator';
export type GenerationOptions = ImageGenerationOptions;

interface ImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeholder: ImagePlaceholder;
  brandKit?: BrandKit;
  businessInfo: BusinessInfo;
  onInsert: (generatedPlaceholder: ImagePlaceholder) => void;
  /** When true, opens directly in Visual Editor mode (for HERO images) */
  openInVisualEditor?: boolean;
}

export const ImageGenerationModal: React.FC<ImageGenerationModalProps> = ({
  isOpen,
  onClose,
  placeholder,
  brandKit,
  businessInfo,
  onInsert,
  openInVisualEditor = false,
}) => {
  const { state } = useAppState();

  // Initialize image generation with Supabase client for CORS-free proxy
  const supabase = useMemo(() => {
    if (!state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) return null;
    return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  // Track when Supabase client is ready for authenticated requests
  // This fixes the first-run race condition where Generate fails on first click
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    if (supabase) {
      initImageGeneration(supabase);

      // Warm up the auth connection - this ensures the SDK has completed
      // any pending auth initialization before user clicks Generate
      let cancelled = false;
      ensureClientReady().then(ready => {
        if (!cancelled) {
          setIsClientReady(ready);
          if (!ready) {
            // Even if not authenticated, allow generation (will use non-proxy providers)
            // Give a small delay to ensure SDK has fully initialized
            setTimeout(() => {
              if (!cancelled) setIsClientReady(true);
            }, 500);
          }
        }
      });

      return () => {
        cancelled = true;
      };
    } else {
      // No Supabase client - generation can still work with direct API keys
      setIsClientReady(true);
    }
  }, [supabase]);

  // Form state
  const [textOverlay, setTextOverlay] = useState(placeholder.specs.textOverlay?.text || '');
  const [selectedTemplate, setSelectedTemplate] = useState('bold-center');
  const [markupGoTemplateId, setMarkupGoTemplateId] = useState(
    brandKit?.markupGoDefaultTemplateId || DEFAULT_MARKUPGO_TEMPLATE_ID
  );
  const [altText, setAltText] = useState(placeholder.altTextSuggestion);
  const [additionalPrompt, setAdditionalPrompt] = useState('');

  // Progress state
  const [progress, setProgress] = useState<ImageGenerationProgress | null>(null);
  const [generatedPlaceholder, setGeneratedPlaceholder] = useState<ImagePlaceholder | null>(null);

  // Visual editor state - start in visual editor if requested and it's a HERO image
  const [showVisualEditor, setShowVisualEditor] = useState(openInVisualEditor && placeholder.type === 'HERO');

  // Sync visual editor state with prop changes (in case modal doesn't remount)
  useEffect(() => {
    if (openInVisualEditor && placeholder.type === 'HERO') {
      setShowVisualEditor(true);
    }
  }, [openInVisualEditor, placeholder.type]);

  const templates = brandKit?.heroTemplates || DEFAULT_HERO_TEMPLATES;

  const isGenerating = progress !== null && progress.phase !== 'complete' && progress.phase !== 'error';
  const hasError = progress?.phase === 'error';
  const isComplete = progress?.phase === 'complete' && generatedPlaceholder !== null;

  const handleGenerate = useCallback(async () => {
    setProgress({ phase: 'generating', progress: 0, message: 'Starting...' });
    setGeneratedPlaceholder(null);

    try {
      const result = await generateImage(
        placeholder,
        {
          textOverlay: placeholder.type === 'HERO' ? textOverlay : undefined,
          templateId: placeholder.type === 'HERO' && businessInfo.markupGoApiKey ? markupGoTemplateId : undefined,
          altText,
          additionalPrompt: additionalPrompt || undefined,
          excludeText: businessInfo.brandKit?.imageGeneration?.excludeText ?? true,
          excludePeople: businessInfo.brandKit?.imageGeneration?.excludePeople ?? true,
        },
        businessInfo,
        setProgress
      );

      if (result.status === 'generated' || result.status === 'uploaded') {
        setGeneratedPlaceholder(result);
      }
    } catch (err) {
      setProgress({
        phase: 'error',
        progress: 0,
        message: err instanceof Error ? err.message : 'Generation failed',
        error: {
          phase: 'generating',
          provider: 'unknown',
          message: err instanceof Error ? err.message : 'Generation failed',
          retryable: true,
          suggestion: 'Check your API keys and try again.',
        },
      });
    }
  }, [placeholder, textOverlay, markupGoTemplateId, altText, additionalPrompt, businessInfo]);

  const handleInsert = useCallback(() => {
    if (generatedPlaceholder) {
      onInsert(generatedPlaceholder);
      onClose();
    }
  }, [generatedPlaceholder, onInsert, onClose]);

  const handleRetry = useCallback(() => {
    setProgress(null);
    setGeneratedPlaceholder(null);
    handleGenerate();
  }, [handleGenerate]);

  const handleReset = useCallback(() => {
    setProgress(null);
    setGeneratedPlaceholder(null);
  }, []);

  // Handle export from visual editor
  const handleVisualEditorExport = useCallback((blob: Blob, format: string, metadata: HeroImageMetadata) => {
    // Convert blob to data URL for the placeholder
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;

      // Transform HeroImageMetadata to ImageMetadata format
      const transformedMetadata = {
        filename: metadata.fileName || 'hero-image',
        altText: metadata.altText || altText,
        caption: metadata.iptc?.caption,
        generatedBy: 'visual-editor',
        generatedAt: new Date().toISOString(),
        exif: {
          author: metadata.exif?.artist || '',
          copyright: metadata.exif?.copyright || '',
          software: metadata.exif?.software || 'Visual Editor',
          description: metadata.exif?.imageDescription || ''
        },
        iptc: {
          creator: metadata.iptc?.creator || '',
          rights: metadata.iptc?.copyright || '',
          source: metadata.iptc?.source || '',
          keywords: metadata.iptc?.keywords || []
        },
        schemaOrg: metadata.schemaOrg
      };

      // Create the generated placeholder with the exported image
      const newPlaceholder: ImagePlaceholder = {
        ...placeholder,
        status: 'generated',
        generatedUrl: dataUrl,
        altTextSuggestion: metadata.altText || altText,
        metadata: {
          ...placeholder.metadata,
          ...transformedMetadata
        }
      };

      // Auto-insert into draft and close the modal
      onInsert(newPlaceholder);
      onClose();
    };
    reader.readAsDataURL(blob);
  }, [placeholder, altText, onInsert, onClose]);

  // Warn user if they try to close with an un-inserted generated image
  const handleClose = useCallback(() => {
    if (isComplete && generatedPlaceholder) {
      const confirmed = window.confirm(
        'You have a generated image that hasn\'t been inserted yet.\n\n' +
        'If you close now, you\'ll lose this image and need to regenerate it.\n\n' +
        'Click "Cancel" to go back and insert the image, or "OK" to discard it.'
      );
      if (!confirmed) return;
    }
    onClose();
  }, [isComplete, generatedPlaceholder, onClose]);

  if (!isOpen) return null;

  // Determine which providers are available
  const availableProviders: string[] = [];
  if (businessInfo.markupGoApiKey && placeholder.type === 'HERO') availableProviders.push('MarkupGo');
  if (businessInfo.geminiApiKey) availableProviders.push('Gemini Imagen');
  if (businessInfo.openAiApiKey) availableProviders.push('DALL-E 3');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]" onClick={handleClose}>
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">
          Generate {placeholder.type} Image
        </h2>

        {/* Progress / Preview Section */}
        {(isGenerating || isComplete || hasError) && (
          <div className="mb-6">
            {/* Progress Bar */}
            {isGenerating && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${progress?.progress || 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-400 w-12 text-right">
                    {progress?.progress || 0}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                  <span className="text-sm text-gray-300">{progress?.message}</span>
                  {progress?.provider && (
                    <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-400">
                      {progress.provider}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Preview when complete */}
            {isComplete && generatedPlaceholder?.generatedUrl && (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center" style={{ maxHeight: '300px' }}>
                  <img
                    src={generatedPlaceholder.generatedUrl}
                    alt={altText}
                    className="max-w-full max-h-[300px] object-contain"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <span className="text-xs px-2 py-1 bg-green-600/80 rounded text-white">
                      Generated
                    </span>
                    {generatedPlaceholder.metadata?.generatedBy && (
                      <span className="text-xs px-2 py-1 bg-gray-700/80 rounded text-gray-300">
                        via {generatedPlaceholder.metadata.generatedBy}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleInsert} className="flex-1">
                    Insert into Draft
                  </Button>
                  <Button variant="secondary" onClick={handleReset}>
                    Regenerate
                  </Button>
                </div>
              </div>
            )}

            {/* Error State */}
            {hasError && progress?.error && (
              <div className="space-y-3">
                <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="text-red-400 mt-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-red-400 font-medium">Generation Failed</p>
                      <p className="text-red-300 text-sm mt-1">{progress.error.message}</p>
                      {progress.error.provider && progress.error.provider !== 'none' && (
                        <p className="text-red-400/70 text-xs mt-1">Provider: {progress.error.provider}</p>
                      )}
                      <p className="text-gray-400 text-sm mt-2">
                        <strong>Suggestion:</strong> {progress.error.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
                {progress.error.retryable && (
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleRetry}>
                      Try Again
                    </Button>
                    <Button variant="secondary" onClick={handleReset}>
                      Edit Options
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Form Section - Hidden during generation/preview */}
        {!isGenerating && !isComplete && !hasError && (
          <div className="space-y-4">
            {/* Description */}
            <div>
              <Label>Image Description</Label>
              <p className="text-sm text-gray-400 bg-gray-900 p-2 rounded">
                {placeholder.description}
              </p>
            </div>

            {/* Hero-specific options */}
            {placeholder.type === 'HERO' && (
              <>
                {/* Visual Editor Option */}
                <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-300">Visual Editor</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Create a semantically optimized hero image with layers, text positioning, and IPTC/EXIF metadata
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => setShowVisualEditor(true)}
                      className="ml-4 flex-shrink-0"
                    >
                      Open Editor
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-gray-800 text-gray-500">or use auto-generation</span>
                  </div>
                </div>

                <div>
                  <Label>Text Overlay</Label>
                  <Input
                    value={textOverlay}
                    onChange={(e) => setTextOverlay(e.target.value)}
                    placeholder="Title text to display on image"
                  />
                </div>
                <div>
                  <Label>Template Style</Label>
                  <Select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} - {t.description}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* MarkupGo Template ID */}
                {businessInfo.markupGoApiKey && (
                  <div>
                    <Label>MarkupGo Template ID</Label>
                    <Input
                      value={markupGoTemplateId}
                      onChange={(e) => setMarkupGoTemplateId(e.target.value)}
                      placeholder={DEFAULT_MARKUPGO_TEMPLATE_ID}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Override the default template for this image
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Alt Text */}
            <div>
              <Label>Alt Text (SEO)</Label>
              <Textarea
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Should extend vocabulary beyond H1/Title
              </p>
            </div>

            {/* Additional prompt */}
            <div>
              <Label>Additional Instructions (optional)</Label>
              <Textarea
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                rows={2}
                placeholder="Any specific requirements for the image..."
              />
            </div>

            {/* Available Providers */}
            <div className="p-3 bg-gray-900 rounded-lg">
              <Label className="text-xs">Available Providers</Label>
              {availableProviders.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableProviders.map((provider, i) => (
                    <span key={provider} className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
                      {i + 1}. {provider}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-400 mt-1">
                  No image providers configured. Add API keys in Settings.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Providers will be tried in order until one succeeds.
              </p>
            </div>

            {/* Specs */}
            <div className="text-xs text-gray-500 flex gap-4">
              <span>Size: {placeholder.specs.width}x{placeholder.specs.height}</span>
              <span>Format: {placeholder.specs.format.toUpperCase()}</span>
              <span>Max: {placeholder.specs.maxFileSize}KB</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-6">
          {!isGenerating && !isComplete && (
            <>
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={availableProviders.length === 0 || !isClientReady}
              >
                {!isClientReady ? 'Initializing...' : 'Generate Image'}
              </Button>
            </>
          )}
          {isGenerating && (
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
          )}
          {isComplete && (
            <Button variant="secondary" onClick={handleClose}>
              Close (Discard Image)
            </Button>
          )}
        </div>
      </div>

      {/* Hero Image Visual Editor */}
      {showVisualEditor && (
        <HeroImageEditor
          businessInfo={businessInfo}
          h1Text={textOverlay || placeholder.specs.textOverlay?.text || 'Your Title Here'}
          entityName={placeholder.description.split(' ')[0] || 'Entity'}
          initialBackgroundImage={generatedPlaceholder?.generatedUrl || generatedPlaceholder?.userUploadUrl || placeholder.generatedUrl || placeholder.userUploadUrl}
          initialAltText={altText}
          onExport={handleVisualEditorExport}
          onClose={() => setShowVisualEditor(false)}
          onGenerateBackground={handleGenerate}
          isGeneratingBackground={isGenerating}
        />
      )}
    </div>
  );
};

export default ImageGenerationModal;
