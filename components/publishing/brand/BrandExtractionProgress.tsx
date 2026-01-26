// components/publishing/brand/BrandExtractionProgress.tsx
import React from 'react';

export interface ExtractionProgress {
  phase: 'idle' | 'discovering' | 'selecting' | 'extracting' | 'analyzing' | 'complete' | 'error';
  currentUrl?: string;
  completedUrls: number;
  totalUrls: number;
  message: string;
}

interface BrandExtractionProgressProps {
  progress: ExtractionProgress;
}

const phaseLabels: Record<ExtractionProgress['phase'], string> = {
  idle: 'Ready',
  discovering: 'Discovering URLs',
  selecting: 'Select URLs',
  extracting: 'Capturing Pages',
  analyzing: 'Analyzing Components',
  complete: 'Extraction Complete',
  error: 'Error',
};

export const BrandExtractionProgress: React.FC<BrandExtractionProgressProps> = ({
  progress,
}) => {
  const { phase, currentUrl, completedUrls, totalUrls, message } = progress;

  const showProgressBar = phase === 'extracting' || phase === 'analyzing';
  const percentage = totalUrls > 0 ? Math.round((completedUrls / totalUrls) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Phase label */}
      <div className="flex items-center gap-2">
        {phase === 'complete' ? (
          <span className="text-green-400 text-lg">&#10003;</span>
        ) : phase === 'error' ? (
          <span className="text-red-400 text-lg">&#10005;</span>
        ) : phase !== 'idle' && phase !== 'selecting' ? (
          <span className="text-blue-400 animate-pulse">&#9679;</span>
        ) : null}
        <span
          className={
            phase === 'complete'
              ? 'text-green-400 font-medium'
              : phase === 'error'
              ? 'text-red-400 font-medium'
              : 'text-white font-medium'
          }
        >
          {phaseLabels[phase]}
        </span>
      </div>

      {/* Progress bar for extracting/analyzing phases */}
      {showProgressBar && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-gray-400">
            <span>
              {completedUrls} of {totalUrls} URLs
            </span>
            <span>{percentage}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Current URL indicator */}
      {currentUrl && phase !== 'complete' && phase !== 'error' && (
        <div className="text-sm text-gray-400 truncate">
          <span className="text-gray-500">Current: </span>
          <span className="text-gray-300">{currentUrl}</span>
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={
            phase === 'error'
              ? 'p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm'
              : phase === 'complete'
              ? 'p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-green-300 text-sm'
              : 'text-sm text-gray-400'
          }
        >
          {message}
        </div>
      )}
    </div>
  );
};
