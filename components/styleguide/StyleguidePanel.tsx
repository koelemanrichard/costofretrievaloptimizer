// components/styleguide/StyleguidePanel.tsx
// Dashboard panel for brand styleguide generation.
// Shows editable URL, generate/regenerate button, progress tracker, preview/download actions.

import React, { useState, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StyleguideProgressTracker } from './StyleguideProgressTracker';
import type { StyleguideProgress, BrandStyleguideData } from '../../services/styleguide-generator/types';
import type { StyleguideResult } from '../../services/styleguide-generator/StyleguideOrchestrator';

export interface StyleguidePanelProps {
  /** Current domain URL to extract from */
  domain: string;
  /** Called when user edits the URL */
  onDomainChange: (url: string) => void;
  /** Existing styleguide data from the map record (null if not generated) */
  existingData: BrandStyleguideData | null;
  /** Called when user clicks Generate/Regenerate */
  onGenerate: () => Promise<StyleguideResult>;
  /** Called when user clicks Preview (opens HTML in new tab) */
  onPreview: () => void;
  /** Called when user clicks Download */
  onDownload: () => void;
  /** Whether generation is currently in progress */
  isGenerating: boolean;
  /** Current progress (updated during generation) */
  progress: StyleguideProgress | null;
  /** Optional error message */
  error: string | null;
}

export const StyleguidePanel: React.FC<StyleguidePanelProps> = ({
  domain,
  onDomainChange,
  existingData,
  onGenerate,
  onPreview,
  onDownload,
  isGenerating,
  progress,
  error,
}) => {
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!domain.trim()) {
      setLocalError('Enter a URL to extract brand data from');
      return;
    }
    setLocalError(null);
    try {
      await onGenerate();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Generation failed');
    }
  }, [onGenerate, domain]);

  const hasStyleguide = !!existingData?.htmlStorageKey;
  const displayError = error || localError;

  return (
    <Card className="bg-gray-800/50 border border-gray-700/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Brand Styleguide
        </h3>
        <StyleguideStatusBadge hasStyleguide={hasStyleguide} generatedAt={existingData?.generatedAt} />
      </div>

      {/* Editable URL input */}
      <div className="mb-3">
        <label className="block text-xs text-gray-400 mb-1">Source URL</label>
        <input
          type="text"
          value={domain}
          onChange={(e) => onDomainChange(e.target.value)}
          placeholder="example.com"
          disabled={isGenerating}
          className="w-full px-3 py-1.5 text-sm bg-gray-900/60 border border-gray-600/50 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
        />
      </div>

      {/* Progress tracker (shown during generation) */}
      {isGenerating && progress && (
        <div className="mb-3">
          <StyleguideProgressTracker progress={progress} />
        </div>
      )}

      {/* Error display */}
      {displayError && (
        <div className="mb-3 p-2 bg-red-900/30 border border-red-700/50 rounded text-xs text-red-300">
          {displayError}
        </div>
      )}

      {/* Quality info (if generated) */}
      {hasStyleguide && existingData && (
        <div className="mb-3 flex items-center gap-2 text-xs text-gray-400">
          <span>Version {existingData.version}</span>
          <span className="text-gray-600">|</span>
          <span>{existingData.designTokens.colors.primary[400]} primary</span>
          <span className="text-gray-600">|</span>
          <span>{existingData.designTokens.typography.headingFont.split("'")[1] || 'System'}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {!hasStyleguide ? (
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || !domain.trim()}
            className="flex-1"
          >
            {isGenerating ? 'Generating...' : 'Generate Styleguide'}
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onPreview}
              disabled={isGenerating}
            >
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDownload}
              disabled={isGenerating}
            >
              Download
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? 'Regenerating...' : 'Regenerate'}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};

// ============================================================================
// Status Badge (inline sub-component)
// ============================================================================

interface StatusBadgeProps {
  hasStyleguide: boolean;
  generatedAt?: string;
}

const StyleguideStatusBadge: React.FC<StatusBadgeProps> = ({ hasStyleguide, generatedAt }) => {
  if (!hasStyleguide) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
        Not generated
      </span>
    );
  }

  const dateStr = generatedAt
    ? new Date(generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400">
      Generated {dateStr}
    </span>
  );
};
