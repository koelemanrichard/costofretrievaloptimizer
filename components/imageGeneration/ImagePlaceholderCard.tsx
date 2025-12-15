// components/imageGeneration/ImagePlaceholderCard.tsx
import React from 'react';
import { ImagePlaceholder } from '../../types';
import { Button } from '../ui/Button';

interface ImagePlaceholderCardProps {
  placeholder: ImagePlaceholder;
  onGenerate: () => void;
  onUpload: () => void;
  onSkip: () => void;
}

export const ImagePlaceholderCard: React.FC<ImagePlaceholderCardProps> = ({
  placeholder,
  onGenerate,
  onUpload,
  onSkip,
}) => {
  const typeColors: Record<string, string> = {
    HERO: 'border-amber-500 bg-amber-900/20',
    SECTION: 'border-blue-500 bg-blue-900/20',
    INFOGRAPHIC: 'border-purple-500 bg-purple-900/20',
    CHART: 'border-green-500 bg-green-900/20',
    DIAGRAM: 'border-cyan-500 bg-cyan-900/20',
    AUTHOR: 'border-pink-500 bg-pink-900/20',
  };

  const statusBadges: Record<string, string> = {
    placeholder: 'bg-gray-600 text-gray-200',
    generating: 'bg-yellow-600 text-yellow-100 animate-pulse',
    generated: 'bg-green-600 text-green-100',
    uploaded: 'bg-blue-600 text-blue-100',
    error: 'bg-red-600 text-red-100',
  };

  return (
    <div className={`p-4 rounded-lg border ${typeColors[placeholder.type] || 'border-gray-500 bg-gray-900/20'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-700">
            {placeholder.type}
          </span>
          <span className={`text-xs px-2 py-1 rounded ${statusBadges[placeholder.status] || 'bg-gray-600'}`}>
            {placeholder.status}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {placeholder.specs.width}x{placeholder.specs.height}
        </span>
      </div>

      <p className="text-sm text-gray-300 mb-2">{placeholder.description}</p>
      <p className="text-xs text-gray-500 italic mb-3">Alt: {placeholder.altTextSuggestion}</p>

      {placeholder.status === 'placeholder' && (
        <div className="flex gap-2">
          <Button size="sm" onClick={onGenerate}>Generate</Button>
          <Button size="sm" variant="secondary" onClick={onUpload}>Upload</Button>
          <Button size="sm" variant="ghost" onClick={onSkip}>Skip</Button>
        </div>
      )}

      {placeholder.generatedUrl && (
        <img
          src={placeholder.generatedUrl}
          alt={placeholder.altTextSuggestion}
          className="mt-2 rounded max-h-32 object-cover"
        />
      )}

      {placeholder.userUploadUrl && (
        <img
          src={placeholder.userUploadUrl}
          alt={placeholder.altTextSuggestion}
          className="mt-2 rounded max-h-32 object-cover"
        />
      )}
    </div>
  );
};

export default ImagePlaceholderCard;
