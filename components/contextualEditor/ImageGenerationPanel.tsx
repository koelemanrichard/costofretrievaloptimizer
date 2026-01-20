// components/contextualEditor/ImageGenerationPanel.tsx
/**
 * Panel for contextual image generation from selected text.
 */

import React, { useState, useEffect } from 'react';
import { ImagePromptResult, ImageStyle, AspectRatio } from '../../types/contextualEditor';
import { Button } from '../ui/Button';

interface ImageGenerationPanelProps {
  promptResult: ImagePromptResult | null;
  isGenerating: boolean;
  onGenerate: (prompt: string, style: ImageStyle, aspectRatio: AspectRatio) => void;
  onAccept: (imageUrl: string, altText: string) => void;
  onReject: () => void;
  onClose: () => void;
  generatedImageUrl?: string;
}

const STYLE_OPTIONS: { value: ImageStyle; label: string }[] = [
  { value: 'photograph', label: 'Photograph' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'diagram', label: 'Diagram' },
  { value: 'infographic', label: 'Infographic' },
];

const ASPECT_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: '16:9', label: '16:9 (Wide)' },
  { value: '4:3', label: '4:3 (Standard)' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '3:4', label: '3:4 (Portrait)' },
];

export const ImageGenerationPanel: React.FC<ImageGenerationPanelProps> = ({
  promptResult,
  isGenerating,
  onGenerate,
  onAccept,
  onReject,
  onClose,
  generatedImageUrl,
}) => {
  const [editedPrompt, setEditedPrompt] = useState(promptResult?.prompt || '');
  const [style, setStyle] = useState<ImageStyle>(promptResult?.suggestedStyle || 'photograph');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(promptResult?.suggestedAspectRatio || '4:3');
  const [altText, setAltText] = useState(promptResult?.altTextSuggestion || '');

  // Update when promptResult changes
  useEffect(() => {
    if (promptResult) {
      setEditedPrompt(promptResult.prompt);
      setStyle(promptResult.suggestedStyle);
      setAspectRatio(promptResult.suggestedAspectRatio);
      setAltText(promptResult.altTextSuggestion);
    }
  }, [promptResult]);

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-slate-800 border-l border-slate-600 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-600 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Generate Image</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Prompt editor */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Image Prompt
          </label>
          <textarea
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            placeholder="Describe the image..."
            className="w-full h-32 bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded p-2 resize-none focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Style selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Style
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setStyle(option.value)}
                className={`px-3 py-2 text-sm rounded transition-colors ${
                  style === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Aspect ratio selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Aspect Ratio
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ASPECT_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setAspectRatio(option.value)}
                className={`px-3 py-2 text-sm rounded transition-colors ${
                  aspectRatio === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <Button
          onClick={() => onGenerate(editedPrompt, style, aspectRatio)}
          disabled={!editedPrompt.trim() || isGenerating}
          fullWidth
        >
          {isGenerating ? 'Generating...' : 'Generate Image'}
        </Button>

        {/* Generated image preview */}
        {generatedImageUrl && (
          <div className="border border-slate-600 rounded-lg overflow-hidden">
            <img
              src={generatedImageUrl}
              alt={altText}
              className="w-full h-auto"
            />

            {/* Alt text editor */}
            <div className="p-3 bg-slate-900">
              <label className="block text-xs text-slate-400 mb-1">Alt Text</label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className="w-full px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-slate-200"
              />
            </div>

            {/* Placement info */}
            {promptResult?.placementSuggestion && (
              <div className="px-3 pb-3 bg-slate-900">
                <div className="text-xs text-slate-400">
                  Placement: {promptResult.placementSuggestion.position.replace('_', ' ')}
                </div>
                <div className="text-xs text-slate-500">
                  {promptResult.placementSuggestion.rationale}
                </div>
              </div>
            )}

            {/* Accept/Reject */}
            <div className="p-3 bg-slate-900 border-t border-slate-700 flex gap-2">
              <Button
                onClick={() => onAccept(generatedImageUrl, altText)}
                variant="primary"
                size="sm"
                className="flex-1"
              >
                Insert Image
              </Button>
              <Button
                onClick={onReject}
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isGenerating && (
        <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-sm">Generating image...</span>
          </div>
        </div>
      )}
    </div>
  );
};
