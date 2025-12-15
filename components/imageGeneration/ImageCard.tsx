// components/imageGeneration/ImageCard.tsx
import React, { useRef } from 'react';
import { ImagePlaceholder, ImageGenerationProgress } from '../../types';
import { Button } from '../ui/Button';

interface ImageCardProps {
  placeholder: ImagePlaceholder;
  isSelected: boolean;
  isGenerating: boolean;
  isInserted?: boolean;
  generatedData?: ImagePlaceholder;
  progress?: ImageGenerationProgress | null;
  error?: string;
  onSelect: () => void;
  onGenerate: () => void;
  onUpload: (file: File) => void;
  onSkip: () => void;
  onRegenerate: () => void;
  onInsert: () => void;
  onDownload?: () => void;
}

const typeColors: Record<string, { border: string; bg: string; badge: string }> = {
  HERO: { border: 'border-amber-500', bg: 'bg-amber-900/20', badge: 'bg-amber-600 text-amber-100' },
  SECTION: { border: 'border-blue-500', bg: 'bg-blue-900/20', badge: 'bg-blue-600 text-blue-100' },
  INFOGRAPHIC: { border: 'border-purple-500', bg: 'bg-purple-900/20', badge: 'bg-purple-600 text-purple-100' },
  CHART: { border: 'border-green-500', bg: 'bg-green-900/20', badge: 'bg-green-600 text-green-100' },
  DIAGRAM: { border: 'border-cyan-500', bg: 'bg-cyan-900/20', badge: 'bg-cyan-600 text-cyan-100' },
  AUTHOR: { border: 'border-pink-500', bg: 'bg-pink-900/20', badge: 'bg-pink-600 text-pink-100' },
};

const statusBadges: Record<string, string> = {
  placeholder: 'bg-gray-600 text-gray-200',
  generating: 'bg-yellow-600 text-yellow-100 animate-pulse',
  generated: 'bg-green-600 text-green-100',
  uploaded: 'bg-blue-600 text-blue-100',
  inserted: 'bg-emerald-700 text-emerald-100',
  error: 'bg-red-600 text-red-100',
};

export const ImageCard: React.FC<ImageCardProps> = ({
  placeholder,
  isSelected,
  isGenerating,
  isInserted,
  generatedData,
  progress,
  error,
  onSelect,
  onGenerate,
  onUpload,
  onSkip,
  onRegenerate,
  onInsert,
  onDownload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colors = typeColors[placeholder.type] || { border: 'border-gray-500', bg: 'bg-gray-900/20', badge: 'bg-gray-600 text-gray-200' };

  const imageUrl = generatedData?.generatedUrl || generatedData?.userUploadUrl || placeholder.generatedUrl || placeholder.userUploadUrl;
  const status = isInserted ? 'inserted' : isGenerating ? 'generating' : (generatedData?.status || placeholder.status);
  const hasImage = !!imageUrl;
  const isError = status === 'error' || !!error;
  const isPending = status === 'placeholder' && !hasImage && !isGenerating && !isError && !isInserted;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className={`relative rounded-lg border-2 ${isInserted ? 'border-emerald-600 bg-emerald-900/10' : `${colors.border} ${colors.bg}`} ${isSelected ? 'ring-2 ring-amber-400' : ''} transition-all`}>
      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="w-4 h-4 rounded border-gray-500 text-amber-600 focus:ring-amber-500 bg-gray-700 cursor-pointer"
        />
      </div>

      {/* Header */}
      <div className="p-3 pt-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${colors.badge}`}>
              {placeholder.type}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${statusBadges[status] || 'bg-gray-600'}`}>
              {status}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {placeholder.specs.width}x{placeholder.specs.height}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-300 mb-1 line-clamp-2" title={placeholder.description}>
          {placeholder.description}
        </p>
        <p className="text-xs text-gray-500 italic mb-3 line-clamp-1" title={placeholder.altTextSuggestion}>
          Alt: {placeholder.altTextSuggestion}
        </p>

        {/* Progress Bar */}
        {isGenerating && progress && (
          <div className="mb-3">
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progress.progress || 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">
              {progress.message}
            </p>
          </div>
        )}

        {/* Image Preview */}
        {hasImage && (
          <div className="mb-3 bg-gray-900 rounded overflow-hidden flex items-center justify-center" style={{ maxHeight: '128px' }}>
            <img
              src={imageUrl}
              alt={placeholder.altTextSuggestion}
              className="max-h-32 max-w-full object-contain"
            />
          </div>
        )}

        {/* Error Display */}
        {isError && (
          <div className="mb-3 p-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-300">
            {error || placeholder.errorMessage || 'Generation failed'}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-1.5">
          {isPending && (
            <>
              <Button size="sm" onClick={onGenerate} className="text-xs px-2 py-1">
                Generate
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-2 py-1"
              >
                Upload
              </Button>
              <Button size="sm" variant="ghost" onClick={onSkip} className="text-xs px-2 py-1">
                Skip
              </Button>
            </>
          )}

          {hasImage && !isGenerating && !isInserted && (
            <>
              <Button size="sm" onClick={onInsert} className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700">
                Insert
              </Button>
              {onDownload && (
                <Button size="sm" variant="secondary" onClick={onDownload} className="text-xs px-2 py-1">
                  ⬇ Download
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={onRegenerate} className="text-xs px-2 py-1">
                Regenerate
              </Button>
            </>
          )}

          {isInserted && hasImage && (
            <>
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <span>✓</span> In Draft
              </span>
              {onDownload && (
                <Button size="sm" variant="secondary" onClick={onDownload} className="text-xs px-2 py-1">
                  ⬇ Download
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={onRegenerate} className="text-xs px-2 py-1 text-gray-400">
                Replace
              </Button>
            </>
          )}

          {isError && !isGenerating && (
            <>
              <Button size="sm" onClick={onGenerate} className="text-xs px-2 py-1">
                Retry
              </Button>
              <Button size="sm" variant="ghost" onClick={onSkip} className="text-xs px-2 py-1">
                Skip
              </Button>
            </>
          )}

          {isGenerating && (
            <span className="text-xs text-gray-400 animate-pulse">Generating...</span>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default ImageCard;
