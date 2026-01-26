/**
 * Brand Match Indicator
 *
 * Displays a visual indicator showing how well the generated output
 * matches the detected brand style. Shows a score (0-100%), color-coded
 * assessment, and optional detailed validation info.
 *
 * @module components/publishing/BrandMatchIndicator
 */

import React from 'react';

// ============================================================================
// Types
// ============================================================================

interface BrandMatchIndicatorProps {
  /** Brand alignment score (0-100) */
  score: number;
  /** AI-generated assessment text describing the match quality */
  assessmentText?: string;
  /** Whether detail view is currently shown */
  showDetails?: boolean;
  /** Callback when user clicks to show/hide details */
  onShowDetails?: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get text color class based on score
 */
const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
};

/**
 * Get stroke color class for SVG circle based on score
 */
const getStrokeColor = (score: number): string => {
  if (score >= 80) return 'stroke-green-400';
  if (score >= 60) return 'stroke-yellow-400';
  return 'stroke-red-400';
};

/**
 * Get background/border color classes based on score
 */
const getBackgroundColor = (score: number): string => {
  if (score >= 80) return 'bg-green-900/30 border-green-500/30';
  if (score >= 60) return 'bg-yellow-900/30 border-yellow-500/30';
  return 'bg-red-900/30 border-red-500/30';
};

/**
 * Get human-readable score label
 */
const getScoreLabel = (score: number): string => {
  if (score >= 90) return 'Excellent Match';
  if (score >= 80) return 'Good Match';
  if (score >= 60) return 'Partial Match';
  if (score >= 40) return 'Needs Review';
  return 'Poor Match';
};

// ============================================================================
// Component
// ============================================================================

export const BrandMatchIndicator: React.FC<BrandMatchIndicatorProps> = ({
  score,
  assessmentText,
  showDetails = false,
  onShowDetails,
}) => {
  // Clamp score to valid range
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  const scoreColor = getScoreColor(clampedScore);
  const strokeColor = getStrokeColor(clampedScore);
  const bgColor = getBackgroundColor(clampedScore);
  const label = getScoreLabel(clampedScore);

  return (
    <div className={`p-3 rounded-lg border ${bgColor} flex items-center gap-4`}>
      {/* Score Circle */}
      <div className="relative w-14 h-14 flex-shrink-0">
        <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
          {/* Background circle */}
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            className="stroke-zinc-700"
            strokeWidth="3"
          />
          {/* Progress circle */}
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            className={strokeColor}
            strokeWidth="3"
            strokeDasharray={`${clampedScore} ${100 - clampedScore}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${scoreColor}`}>{clampedScore}%</span>
        </div>
      </div>

      {/* Label and Assessment */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">Brand Match</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`font-medium ${scoreColor}`}>{label}</span>
          {clampedScore >= 80 && (
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        {assessmentText && (
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{assessmentText}</p>
        )}
      </div>

      {/* Details Link */}
      {onShowDetails && (
        <button
          type="button"
          onClick={onShowDetails}
          className="text-xs text-blue-400 hover:text-blue-300 underline flex-shrink-0 transition-colors"
        >
          {showDetails ? 'Hide Details' : 'View Details'}
        </button>
      )}
    </div>
  );
};

export default BrandMatchIndicator;
