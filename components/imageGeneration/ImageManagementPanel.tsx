// components/imageGeneration/ImageManagementPanel.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ImagePlaceholder, BusinessInfo, ImageGenerationProgress, ImageStyle } from '../../types';
import { generateImage, uploadImage, initImageGeneration, ensureClientReady } from '../../services/ai/imageGeneration/orchestrator';
import { ImageCard } from './ImageCard';
import { Button } from '../ui/Button';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import { Json } from '../../database.types';

const IMAGE_STYLES: { value: ImageStyle; label: string; description: string }[] = [
  { value: 'photorealistic', label: 'Photorealistic', description: 'Professional photography style' },
  { value: 'illustration', label: 'Illustration', description: 'Clean vector-like artwork' },
  { value: 'cartoon', label: 'Cartoon', description: 'Colorful and playful' },
  { value: 'minimal', label: 'Minimal', description: 'Simple shapes, modern' },
  { value: 'artistic', label: 'Artistic', description: 'Creative and expressive' },
  { value: 'technical', label: 'Technical', description: 'Precise and detailed' },
];

interface ImageManagementPanelProps {
  placeholders: ImagePlaceholder[];
  businessInfo: BusinessInfo;
  draftContent: string;
  onUpdateDraft: (newDraft: string, shouldAutoSave?: boolean) => void;
  onOpenVisualEditor?: (placeholder: ImagePlaceholder) => void;
  /** Job ID for persisting generated images */
  jobId?: string;
}

/**
 * Replace a placeholder pattern in the draft with actual image markdown
 * Uses multiple matching strategies to handle description variations
 */
function replacePlaceholder(draft: string, placeholder: ImagePlaceholder, imageUrl: string, altText: string): string {
  const markdown = `![${altText}](${imageUrl})`;

  // Strategy 1: Exact match on full description
  const escapedDesc = placeholder.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exactPattern = new RegExp(`\\[IMAGE:\\s*${escapedDesc}[^\\]]*\\]`, 'i');
  if (exactPattern.test(draft)) {
    console.log('[ImageManagement] Exact match found for:', placeholder.description.slice(0, 50));
    return draft.replace(exactPattern, markdown);
  }

  // Strategy 2: Match on first few words of description (handles truncation)
  const descWords = placeholder.description.split(/\s+/).slice(0, 4).join('\\s+');
  const loosePattern = new RegExp(`\\[IMAGE:\\s*${descWords}[^\\]]*\\]`, 'i');
  if (loosePattern.test(draft)) {
    console.log('[ImageManagement] Loose match found for:', placeholder.description.slice(0, 50));
    return draft.replace(loosePattern, markdown);
  }

  // Strategy 3: Match any IMAGE placeholder if we have a unique altText match
  const altPattern = new RegExp(`\\[IMAGE:[^|]*\\|[^\\]]*alt="[^"]*${altText.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^\\]]*\\]`, 'i');
  if (altPattern.test(draft)) {
    console.log('[ImageManagement] Alt text match found for:', altText.slice(0, 30));
    return draft.replace(altPattern, markdown);
  }

  // Strategy 4: For HERO images, try matching by type
  if (placeholder.type === 'HERO') {
    const heroPattern = /\[IMAGE:\s*HERO[^\]]*\]/i;
    if (heroPattern.test(draft)) {
      console.log('[ImageManagement] HERO type match found');
      return draft.replace(heroPattern, markdown);
    }
    // Also try finding any placeholder near the start of content
    const anyHeroPattern = /^([\s\S]{0,500})\[IMAGE:[^\]]*\]/;
    const heroMatch = draft.match(anyHeroPattern);
    if (heroMatch) {
      console.log('[ImageManagement] Early placeholder match for HERO');
      return draft.replace(/^([\s\S]{0,500})\[IMAGE:[^\]]*\]/, `$1${markdown}`);
    }
  }

  console.warn('[ImageManagement] No placeholder pattern matched for:', placeholder.description.slice(0, 50));
  console.warn('[ImageManagement] Draft contains IMAGE placeholders:', (draft.match(/\[IMAGE:[^\]]+\]/g) || []).length);

  return draft; // No match found, return unchanged
}

/**
 * Remove/skip a placeholder from the draft
 */
function removePlaceholder(draft: string, placeholder: ImagePlaceholder): string {
  const escapedDesc = placeholder.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\[IMAGE:\\s*${escapedDesc}[^\\]]*\\]\\n?`, 'gi');
  return draft.replace(pattern, '');
}

export const ImageManagementPanel: React.FC<ImageManagementPanelProps> = ({
  placeholders,
  businessInfo,
  draftContent,
  onUpdateDraft,
  onOpenVisualEditor,
  jobId,
}) => {
  const { state } = useAppState();

  // Initialize image generation with Supabase client for CORS-free proxy
  const supabase = useMemo(() => {
    if (!state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) return null;
    return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    if (supabase) {
      initImageGeneration(supabase, state.businessInfo.supabaseUrl);
      ensureClientReady().then(() => {
        setIsClientReady(true);
      });
    } else {
      setIsClientReady(true);
    }
  }, [supabase, state.businessInfo.supabaseUrl]);

  // Persist generated image to database so it's not lost on navigation
  const persistGeneratedImage = useCallback(async (placeholderId: string, result: ImagePlaceholder) => {
    if (!supabase || !jobId) {
      console.log('[ImageManagement] Cannot persist - missing supabase or jobId');
      return;
    }

    try {
      // Get current job image_placeholders
      const { data: job } = await supabase
        .from('content_generation_jobs')
        .select('image_placeholders')
        .eq('id', jobId)
        .single();

      const currentPlaceholders: ImagePlaceholder[] = (job?.image_placeholders || []) as unknown as ImagePlaceholder[];

      // Update or add the placeholder with generated URL
      const updatedPlaceholders = currentPlaceholders.map(p => {
        if (p.id === placeholderId) {
          return {
            ...p,
            ...result,
            status: result.generatedUrl ? 'generated' : result.userUploadUrl ? 'uploaded' : p.status,
          };
        }
        return p;
      });

      // If placeholder wasn't in the list, add it
      if (!currentPlaceholders.find(p => p.id === placeholderId)) {
        updatedPlaceholders.push(result);
      }

      await supabase
        .from('content_generation_jobs')
        .update({
          image_placeholders: updatedPlaceholders as unknown as Json,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      console.log('[ImageManagement] Persisted generated image to job:', placeholderId);
    } catch (err) {
      console.error('[ImageManagement] Failed to persist generated image:', err);
    }
  }, [supabase, jobId]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Queue and generation state
  const [queue, setQueue] = useState<string[]>([]);
  const [currentlyGenerating, setCurrentlyGenerating] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<Map<string, ImagePlaceholder>>(new Map());
  const [insertedIds, setInsertedIds] = useState<Set<string>>(new Set()); // Track which images have been inserted
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [progress, setProgress] = useState<ImageGenerationProgress | null>(null);

  // Generation options state
  const [showOptions, setShowOptions] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>(
    businessInfo.brandKit?.imageGeneration?.preferredStyle || 'photorealistic'
  );
  const [customInstructions, setCustomInstructions] = useState(
    businessInfo.brandKit?.imageGeneration?.customInstructions || ''
  );

  // Keep a ref to the latest draft content for updates
  const draftRef = useRef(draftContent);
  useEffect(() => {
    draftRef.current = draftContent;
  }, [draftContent]);

  // Load previously generated images from database on mount
  useEffect(() => {
    if (!supabase || !jobId) return;

    const loadPersistedImages = async () => {
      try {
        const { data: job } = await supabase
          .from('content_generation_jobs')
          .select('image_placeholders')
          .eq('id', jobId)
          .single();

        if (job?.image_placeholders && Array.isArray(job.image_placeholders)) {
          const persistedImages = job.image_placeholders as unknown as ImagePlaceholder[];
          const generatedMap = new Map<string, ImagePlaceholder>();

          for (const p of persistedImages) {
            if (p.generatedUrl || p.userUploadUrl) {
              generatedMap.set(p.id, p);
            }
          }

          if (generatedMap.size > 0) {
            setGeneratedImages(generatedMap);
            console.log('[ImageManagement] Loaded', generatedMap.size, 'persisted generated images');
          }
        }
      } catch (err) {
        console.error('[ImageManagement] Failed to load persisted images:', err);
      }
    };

    loadPersistedImages();
  }, [supabase, jobId]);

  // Detect already-inserted images by scanning draft for markdown images
  // This restores the "inserted" state when navigating back to the Images tab
  useEffect(() => {
    if (!draftContent || placeholders.length === 0) return;

    // Find all markdown images in the draft: ![alt](url)
    const imageMarkdownRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const insertedMatches: string[] = [];
    let match;

    while ((match = imageMarkdownRegex.exec(draftContent)) !== null) {
      const altText = match[1].toLowerCase();

      // Try to match this inserted image back to a placeholder
      for (const placeholder of placeholders) {
        // Check if alt text contains significant words from placeholder description
        const descWords = placeholder.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const matchCount = descWords.filter(word => altText.includes(word)).length;

        // If at least 2 words match, consider it the same image
        if (matchCount >= 2 || altText.includes(placeholder.altTextSuggestion.toLowerCase().slice(0, 30))) {
          insertedMatches.push(placeholder.id);
        }
      }
    }

    // Also detect if a placeholder's pattern is NO LONGER in the draft (meaning it was replaced)
    for (const placeholder of placeholders) {
      const escapedDesc = placeholder.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Use shorter prefix to match - just first 20 chars of description
      const shortDesc = escapedDesc.slice(0, 40);
      const pattern = new RegExp(`\\[IMAGE:\\s*${shortDesc}`, 'i');

      if (!pattern.test(draftContent)) {
        // The placeholder pattern is gone - it was likely replaced with an actual image
        if (!insertedMatches.includes(placeholder.id)) {
          insertedMatches.push(placeholder.id);
        }
      }
    }

    if (insertedMatches.length > 0) {
      setInsertedIds(prev => {
        const newSet = new Set(prev);
        insertedMatches.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  }, [draftContent, placeholders]);

  // Check available providers
  const availableProviders: string[] = [];
  if (businessInfo.markupGoApiKey) availableProviders.push('MarkupGo (HERO only)');
  if (businessInfo.geminiApiKey) availableProviders.push('Gemini Imagen');
  if (businessInfo.openAiApiKey) availableProviders.push('OpenAI Images');

  const hasProviders = availableProviders.length > 0;

  // Check if persistent storage is available
  const hasCloudinary = !!(businessInfo.cloudinaryCloudName && businessInfo.cloudinaryApiKey);
  const hasSupabaseStorage = !!supabase; // Supabase Storage bucket may exist
  const hasPersistentStorage = hasCloudinary || hasSupabaseStorage;

  // Stats
  const pendingCount = placeholders.filter(p =>
    p.status === 'placeholder' && !generatedImages.has(p.id) && !errors.has(p.id) && !insertedIds.has(p.id)
  ).length;
  const generatedCount = placeholders.filter(p =>
    (p.status === 'generated' || p.status === 'uploaded' || generatedImages.has(p.id)) && !insertedIds.has(p.id)
  ).length;
  const insertedCount = insertedIds.size;
  const errorCount = placeholders.filter(p => errors.has(p.id)).length;

  // Process queue
  useEffect(() => {
    if (queue.length === 0 || currentlyGenerating || !isClientReady) return;

    const nextId = queue[0];
    const placeholder = placeholders.find(p => p.id === nextId);

    if (!placeholder) {
      setQueue(q => q.slice(1));
      return;
    }

    // Skip if already generated
    if (generatedImages.has(nextId)) {
      setQueue(q => q.slice(1));
      return;
    }

    setCurrentlyGenerating(nextId);
    setProgress({ phase: 'generating', progress: 0, message: 'Starting...' });

    // Refresh session before each image to prevent expiry during long queues
    if (supabase) {
      supabase.auth.refreshSession().catch(() => {
        // Non-fatal — continue even if refresh fails
        console.warn('[ImageManagement] Session refresh failed before generation, continuing...');
      });
    }

    generateImage(
      placeholder,
      {
        altText: placeholder.altTextSuggestion,
        textOverlay: placeholder.specs.textOverlay?.text,
        style: selectedStyle,
        customInstructions: customInstructions || undefined,
      },
      businessInfo,
      setProgress
    )
      .then(result => {
        if (result.generatedUrl || result.userUploadUrl) {
          setGeneratedImages(m => new Map(m).set(nextId, result));
          setErrors(e => {
            const newErrors = new Map(e);
            newErrors.delete(nextId);
            return newErrors;
          });
          // Persist to database so it's not lost on navigation
          persistGeneratedImage(nextId, result);
        } else if (result.status === 'error') {
          setErrors(e => new Map(e).set(nextId, result.errorMessage || 'Generation failed'));
        }
      })
      .catch(err => {
        setErrors(e => new Map(e).set(nextId, err instanceof Error ? err.message : 'Generation failed'));
      })
      .finally(() => {
        setCurrentlyGenerating(null);
        setQueue(q => q.slice(1));
        setProgress(null);
      });
  }, [queue, currentlyGenerating, placeholders, businessInfo, generatedImages, selectedStyle, customInstructions, persistGeneratedImage, isClientReady, supabase]);

  // Handlers
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === placeholders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(placeholders.map(p => p.id)));
    }
  }, [selectedIds.size, placeholders]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleGenerateAll = useCallback(() => {
    const pendingIds = placeholders
      .filter(p => p.status === 'placeholder' && !generatedImages.has(p.id))
      .map(p => p.id);
    setQueue(pendingIds);
  }, [placeholders, generatedImages]);

  const handleGenerateSelected = useCallback(() => {
    const pendingIds = [...selectedIds].filter(id => {
      const p = placeholders.find(x => x.id === id);
      return p && p.status === 'placeholder' && !generatedImages.has(id);
    });
    setQueue(prev => [...prev, ...pendingIds]);
    setSelectedIds(new Set());
  }, [selectedIds, placeholders, generatedImages]);

  const handleSkipSelected = useCallback(() => {
    let newDraft = draftRef.current;
    for (const id of selectedIds) {
      const p = placeholders.find(x => x.id === id);
      if (p) {
        newDraft = removePlaceholder(newDraft, p);
      }
    }
    onUpdateDraft(newDraft, true); // Auto-save after skip
    setSelectedIds(new Set());
  }, [selectedIds, placeholders, onUpdateDraft]);

  const handleCancelQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const handleGenerateSingle = useCallback((id: string) => {
    if (!queue.includes(id)) {
      setQueue(prev => [...prev, id]);
    }
  }, [queue]);

  const handleUploadSingle = useCallback(async (placeholder: ImagePlaceholder, file: File) => {
    setCurrentlyGenerating(placeholder.id);
    setProgress({ phase: 'uploading', progress: 20, message: 'Uploading...' });

    try {
      const result = await uploadImage(
        placeholder,
        file,
        placeholder.altTextSuggestion,
        businessInfo,
        setProgress
      );

      if (result.userUploadUrl) {
        setGeneratedImages(m => new Map(m).set(placeholder.id, result));
        setErrors(e => {
          const newErrors = new Map(e);
          newErrors.delete(placeholder.id);
          return newErrors;
        });
        // Persist to database so it's not lost on navigation
        persistGeneratedImage(placeholder.id, result);
      } else if (result.status === 'error') {
        setErrors(e => new Map(e).set(placeholder.id, result.errorMessage || 'Upload failed'));
      }
    } catch (err) {
      setErrors(e => new Map(e).set(placeholder.id, err instanceof Error ? err.message : 'Upload failed'));
    } finally {
      setCurrentlyGenerating(null);
      setProgress(null);
    }
  }, [businessInfo, persistGeneratedImage]);

  const handleSkipSingle = useCallback((placeholder: ImagePlaceholder) => {
    const newDraft = removePlaceholder(draftRef.current, placeholder);
    onUpdateDraft(newDraft, true); // Auto-save after skip
  }, [onUpdateDraft]);

  const handleRegenerateSingle = useCallback((id: string) => {
    setGeneratedImages(m => {
      const newMap = new Map(m);
      newMap.delete(id);
      return newMap;
    });
    setErrors(e => {
      const newErrors = new Map(e);
      newErrors.delete(id);
      return newErrors;
    });
    // Also remove from inserted if it was inserted
    setInsertedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    setQueue(prev => [...prev, id]);
  }, []);

  const handleInsertSingle = useCallback((placeholder: ImagePlaceholder) => {
    const generated = generatedImages.get(placeholder.id);
    const imageUrl = generated?.generatedUrl || generated?.userUploadUrl || placeholder.generatedUrl || placeholder.userUploadUrl;
    const altText = generated?.metadata?.altText || placeholder.altTextSuggestion;

    if (imageUrl) {
      const newDraft = replacePlaceholder(draftRef.current, placeholder, imageUrl, altText);
      onUpdateDraft(newDraft, true); // Auto-save after insert to persist
      // Mark as inserted (keep in generatedImages for display)
      setInsertedIds(prev => new Set(prev).add(placeholder.id));
    }
  }, [generatedImages, onUpdateDraft]);

  // Download a single image
  const handleDownloadSingle = useCallback(async (placeholder: ImagePlaceholder) => {
    const generated = generatedImages.get(placeholder.id);
    const imageUrl = generated?.generatedUrl || generated?.userUploadUrl || placeholder.generatedUrl || placeholder.userUploadUrl;

    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Generate filename from description
      const safeName = placeholder.description.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `${placeholder.type.toLowerCase()}_${safeName}.${blob.type.split('/')[1] || 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download image:', err);
    }
  }, [generatedImages]);

  // Download all generated images
  const handleDownloadAll = useCallback(async () => {
    const imagesToDownload: { placeholder: ImagePlaceholder; url: string }[] = [];

    for (const placeholder of placeholders) {
      const generated = generatedImages.get(placeholder.id);
      const imageUrl = generated?.generatedUrl || generated?.userUploadUrl || placeholder.generatedUrl || placeholder.userUploadUrl;
      if (imageUrl) {
        imagesToDownload.push({ placeholder, url: imageUrl });
      }
    }

    // Download each image with a small delay to prevent browser blocking
    for (let i = 0; i < imagesToDownload.length; i++) {
      const { placeholder, url } = imagesToDownload[i];
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        const safeName = placeholder.description.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_');
        link.download = `${(i + 1).toString().padStart(2, '0')}_${placeholder.type.toLowerCase()}_${safeName}.${blob.type.split('/')[1] || 'png'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        // Small delay between downloads
        if (i < imagesToDownload.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (err) {
        console.error('Failed to download image:', err);
      }
    }
  }, [placeholders, generatedImages]);

  // Insert all generated images
  const handleInsertAll = useCallback(() => {
    let newDraft = draftRef.current;
    const newInsertedIds = new Set(insertedIds);

    for (const placeholder of placeholders) {
      const generated = generatedImages.get(placeholder.id);
      const imageUrl = generated?.generatedUrl || generated?.userUploadUrl || placeholder.generatedUrl || placeholder.userUploadUrl;
      const altText = generated?.metadata?.altText || placeholder.altTextSuggestion;

      if (imageUrl) {
        newDraft = replacePlaceholder(newDraft, placeholder, imageUrl, altText);
        newInsertedIds.add(placeholder.id);
      }
    }

    onUpdateDraft(newDraft, true); // Auto-save after bulk insert
    setInsertedIds(newInsertedIds);
  }, [placeholders, generatedImages, onUpdateDraft, insertedIds]);

  const hasGeneratedImages = generatedImages.size > 0 || placeholders.some(p => p.generatedUrl || p.userUploadUrl);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">Image Placeholders</h3>
            <span className="text-sm text-gray-400">
              {generatedCount} generated
              {insertedCount > 0 && <span className="text-green-400 ml-1">• {insertedCount} inserted</span>}
              {pendingCount > 0 && <span className="text-gray-500 ml-1">• {pendingCount} pending</span>}
              {errorCount > 0 && <span className="text-red-400 ml-1">• {errorCount} errors</span>}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasGeneratedImages && (
              <>
                <Button
                  onClick={handleInsertAll}
                  className="text-xs py-1 px-3 bg-green-600 hover:bg-green-700"
                >
                  Insert All to Draft
                </Button>
                <Button
                  onClick={handleDownloadAll}
                  variant="secondary"
                  className="text-xs py-1 px-3"
                >
                  ⬇ Download All
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Batch Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSelectAll}
            className="text-xs"
          >
            {selectedIds.size === placeholders.length ? 'Deselect All' : 'Select All'}
          </Button>

          {selectedIds.size > 0 && (
            <>
              <Button
                size="sm"
                onClick={handleGenerateSelected}
                disabled={!hasProviders || currentlyGenerating !== null}
                className="text-xs"
              >
                Generate Selected ({[...selectedIds].filter(id => {
                  const p = placeholders.find(x => x.id === id);
                  return p && p.status === 'placeholder' && !generatedImages.has(id);
                }).length})
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSkipSelected}
                className="text-xs"
              >
                Skip Selected
              </Button>
            </>
          )}

          {pendingCount > 0 && selectedIds.size === 0 && (
            <Button
              size="sm"
              onClick={handleGenerateAll}
              disabled={!hasProviders || currentlyGenerating !== null}
              className="text-xs bg-amber-600 hover:bg-amber-700"
            >
              Generate All ({pendingCount})
            </Button>
          )}
        </div>

        {/* Queue Progress */}
        {queue.length > 0 && (
          <div className="mt-3 p-3 bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">
                Queue: {queue.length - (currentlyGenerating ? 0 : 0)} remaining
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelQueue}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Cancel Queue
              </Button>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{
                  width: `${((placeholders.length - queue.length) / placeholders.length) * 100}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Provider Info */}
        {!hasProviders && (
          <div className="mt-3 p-3 bg-amber-900/30 border border-amber-700 rounded text-sm text-amber-300">
            No image providers configured. Add API keys for MarkupGo, Gemini, or OpenAI in Settings.
          </div>
        )}

        {hasProviders && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Available: {availableProviders.join(' • ')}
            </span>
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              {showOptions ? '▼' : '▶'} Generation Options
            </button>
          </div>
        )}

        {/* Warning: No persistent storage */}
        {hasProviders && !hasPersistentStorage && (
          <div className="mt-3 p-3 bg-orange-900/30 border border-orange-700 rounded text-sm text-orange-300">
            <strong>⚠️ No persistent storage:</strong> Generated images will be lost on page reload.
            To fix: Configure Cloudinary in Settings, or create a public bucket named "generated-images" in Supabase.
          </div>
        )}

        {/* Generation Options Panel */}
        {showOptions && (
          <div className="mt-3 p-3 bg-gray-900 rounded-lg border border-gray-700 space-y-3">
            {/* Style Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Image Style</label>
              <div className="grid grid-cols-3 gap-2">
                {IMAGE_STYLES.map(style => (
                  <button
                    key={style.value}
                    onClick={() => setSelectedStyle(style.value)}
                    className={`p-2 rounded text-xs text-left transition-all ${
                      selectedStyle === style.value
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                    title={style.description}
                  >
                    <div className="font-medium">{style.label}</div>
                    <div className="text-[10px] opacity-70 truncate">{style.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Instructions */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Custom Instructions <span className="text-gray-500">(optional)</span>
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="E.g., Use warm colors, include nature elements, focus on people..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
                rows={2}
              />
            </div>
          </div>
        )}
      </div>

      {/* Grid of Images */}
      <div className="flex-1 overflow-y-auto p-4">
        {placeholders.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-lg mb-2">No image placeholders found</p>
            <p className="text-sm">Image placeholders are added during content generation (Pass 4: Visual Semantics)</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {placeholders.map((placeholder) => (
              <ImageCard
                key={placeholder.id}
                placeholder={placeholder}
                isSelected={selectedIds.has(placeholder.id)}
                isGenerating={currentlyGenerating === placeholder.id}
                isInserted={insertedIds.has(placeholder.id)}
                generatedData={generatedImages.get(placeholder.id)}
                progress={currentlyGenerating === placeholder.id ? progress : null}
                error={errors.get(placeholder.id)}
                onSelect={() => handleToggleSelect(placeholder.id)}
                onGenerate={() => handleGenerateSingle(placeholder.id)}
                onUpload={(file) => handleUploadSingle(placeholder, file)}
                onSkip={() => handleSkipSingle(placeholder)}
                onRegenerate={() => handleRegenerateSingle(placeholder.id)}
                onInsert={() => handleInsertSingle(placeholder)}
                onDownload={() => handleDownloadSingle(placeholder)}
                onOpenVisualEditor={onOpenVisualEditor ? () => onOpenVisualEditor(placeholder) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageManagementPanel;
