/**
 * BriefHealthBadge
 *
 * Visual indicator showing brief completeness score.
 * Displays color-coded badge with percentage and tooltip with details.
 */

import React, { useState } from 'react';
import {
  BriefQualityResult,
  BriefHealthLevel,
  getHealthLevelColor,
  getHealthLevelEmoji,
} from '../../utils/briefQualityScore';

interface BriefHealthBadgeProps {
  quality: BriefQualityResult;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  showTooltip?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export const BriefHealthBadge: React.FC<BriefHealthBadgeProps> = ({
  quality,
  size = 'md',
  showPercentage = true,
  showTooltip = true,
  compact = false,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const colors = getHealthLevelColor(quality.level);

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const Icon = () => {
    switch (quality.level) {
      case 'complete':
        return (
          <svg className={`${iconSizes[size]} ${colors.icon}`} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'partial':
        return (
          <svg className={`${iconSizes[size]} ${colors.icon}`} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'empty':
        return (
          <svg className={`${iconSizes[size]} ${colors.icon}`} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={onClick}
        className={`
          inline-flex items-center rounded-full font-medium
          ${sizeClasses[size]}
          ${colors.bg} ${colors.text} border ${colors.border}
          transition-all duration-200
          ${onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
        `}
        title={quality.summary}
      >
        <Icon />
        {showPercentage && !compact && (
          <span>{quality.score}%</span>
        )}
        {compact && (
          <span className="sr-only">{quality.score}% - {quality.summary}</span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && isHovered && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 pointer-events-none">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className={`font-medium ${colors.text}`}>
                {quality.level === 'complete' && 'Complete'}
                {quality.level === 'partial' && 'Partial'}
                {quality.level === 'empty' && 'Incomplete'}
              </span>
              <span className="text-gray-400 text-sm">{quality.score}%</span>
            </div>

            <p className="text-gray-300 text-sm mb-2">{quality.summary}</p>

            {quality.missingFields.length > 0 && quality.level !== 'complete' && (
              <div className="border-t border-gray-700 pt-2 mt-2">
                <p className="text-xs text-gray-500 mb-1">Missing:</p>
                <ul className="text-xs text-gray-400 space-y-0.5">
                  {quality.missingFields.slice(0, 4).map((field, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span className="text-red-400">•</span>
                      {field}
                    </li>
                  ))}
                  {quality.missingFields.length > 4 && (
                    <li className="text-gray-500">
                      +{quality.missingFields.length - 4} more
                    </li>
                  )}
                </ul>
              </div>
            )}

            {quality.sectionCount > 0 && (
              <div className="border-t border-gray-700 pt-2 mt-2 flex items-center gap-3 text-xs text-gray-400">
                <span>{quality.sectionCount} sections</span>
                {quality.targetWordCount && (
                  <span>~{quality.targetWordCount.toLocaleString()} words</span>
                )}
              </div>
            )}

            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="border-8 border-transparent border-t-gray-900" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Brief Health Stats Summary Bar
 * Shows aggregate health statistics for a collection of briefs
 */
interface BriefHealthStatsBarProps {
  complete: number;
  partial: number;
  empty: number;
  withoutBriefs: number;
  onFilterClick?: (level: BriefHealthLevel | 'none') => void;
}

export const BriefHealthStatsBar: React.FC<BriefHealthStatsBarProps> = ({
  complete,
  partial,
  empty,
  withoutBriefs,
  onFilterClick,
}) => {
  const total = complete + partial + empty + withoutBriefs;
  if (total === 0) return null;

  const StatItem: React.FC<{
    count: number;
    label: string;
    level: BriefHealthLevel | 'none';
    emoji: string;
  }> = ({ count, label, level, emoji }) => {
    const colors = level === 'none'
      ? { text: 'text-gray-400', bg: 'bg-gray-500/20' }
      : getHealthLevelColor(level);

    return (
      <button
        onClick={() => onFilterClick?.(level)}
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded-md text-sm
          ${colors.bg} ${colors.text}
          ${onFilterClick ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}
          transition-opacity
        `}
      >
        <span>{emoji}</span>
        <span className="font-medium">{count}</span>
        <span className="hidden sm:inline text-xs opacity-75">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-gray-500 text-sm mr-1">Brief Health:</span>
      {complete > 0 && (
        <StatItem count={complete} label="Complete" level="complete" emoji="✅" />
      )}
      {partial > 0 && (
        <StatItem count={partial} label="Partial" level="partial" emoji="⚠️" />
      )}
      {empty > 0 && (
        <StatItem count={empty} label="Failed" level="empty" emoji="❌" />
      )}
      {withoutBriefs > 0 && (
        <StatItem count={withoutBriefs} label="No Brief" level="none" emoji="○" />
      )}
    </div>
  );
};

/**
 * Compact inline indicator for topic rows with actionable popup
 */
interface BriefHealthIndicatorProps {
  quality: BriefQualityResult | null;
  hasBrief: boolean;
  isGenerating?: boolean;
  isRepairing?: boolean;
  onRegenerate?: () => void;
  onRepairMissing?: (missingFields: string[]) => void;
  topicTitle?: string;
}

export const BriefHealthIndicator: React.FC<BriefHealthIndicatorProps> = ({
  quality,
  hasBrief,
  isGenerating,
  isRepairing,
  onRegenerate,
  onRepairMissing,
  topicTitle,
}) => {
  const [showPopup, setShowPopup] = useState(false);

  if (isRepairing) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs animate-pulse">
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Repairing...
      </span>
    );
  }

  if (isGenerating) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs animate-pulse">
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Generating...
      </span>
    );
  }

  // No brief - show generate option
  if (!hasBrief || !quality) {
    return (
      <div className="relative inline-flex">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onRegenerate) onRegenerate();
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 text-xs hover:bg-gray-500/30 hover:text-gray-300 transition-colors"
          title="Click to generate brief"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
          No brief
          {onRegenerate && <span className="ml-1">+</span>}
        </button>
      </div>
    );
  }

  const colors = getHealthLevelColor(quality.level);
  const needsAttention = quality.level !== 'complete';

  return (
    <div className="relative inline-flex">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowPopup(!showPopup);
        }}
        className={`
          inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
          ${colors.bg} ${colors.text} border ${colors.border}
          hover:opacity-80 transition-all cursor-pointer
        `}
        title={needsAttention ? "Click to see issues" : quality.summary}
      >
        {quality.level === 'complete' && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
        {quality.level === 'partial' && <span>!</span>}
        {quality.level === 'empty' && <span>-</span>}
        {quality.score}%
      </button>

      {/* Popup with details and actions */}
      {showPopup && (
        <>
          {/* Backdrop to close popup */}
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation();
              setShowPopup(false);
            }}
          />

          <div
            className="absolute z-50 top-full left-0 mt-1 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-3 py-2 border-b border-gray-700 ${colors.bg}`}>
              <div className="flex items-center justify-between">
                <span className={`font-medium ${colors.text}`}>
                  {quality.level === 'complete' && 'Brief Complete'}
                  {quality.level === 'partial' && 'Brief Incomplete'}
                  {quality.level === 'empty' && 'Brief Failed'}
                </span>
                <span className="text-gray-400 text-sm">{quality.score}%</span>
              </div>
            </div>

            {/* Missing Items */}
            {quality.missingFields.length > 0 && quality.level !== 'complete' && (
              <div className="px-3 py-2 border-b border-gray-700">
                <p className="text-xs text-gray-500 mb-1.5">Missing:</p>
                <ul className="space-y-1">
                  {quality.missingFields.map((field, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-red-400 mt-0.5">-</span>
                      <span>{field}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Stats */}
            {quality.sectionCount > 0 && (
              <div className="px-3 py-2 border-b border-gray-700 flex items-center gap-3 text-xs text-gray-400">
                <span>{quality.sectionCount} sections</span>
                {quality.targetWordCount && (
                  <span>~{quality.targetWordCount.toLocaleString()} words target</span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="px-3 py-2 space-y-2">
              {/* Repair Missing - Primary action for partial briefs */}
              {needsAttention && quality.level === 'partial' && onRepairMissing && quality.missingFields.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPopup(false);
                    onRepairMissing(quality.missingFields);
                  }}
                  className="w-full px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Repair Missing ({quality.missingFields.length})
                </button>
              )}

              {/* Regenerate - Secondary action or primary for failed briefs */}
              <div className="flex gap-2">
                {needsAttention && onRegenerate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPopup(false);
                      onRegenerate();
                    }}
                    className={`flex-1 px-3 py-1.5 text-sm rounded transition-colors ${
                      quality.level === 'empty'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {quality.level === 'empty' ? 'Regenerate Brief' : 'Full Regenerate'}
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPopup(false);
                  }}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors"
                >
                  Close
                </button>
              </div>

              {/* Help text */}
              {needsAttention && quality.level === 'partial' && onRepairMissing && (
                <p className="text-xs text-gray-500 text-center">
                  💡 "Repair" fills only missing fields. "Full Regenerate" recreates the entire brief.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BriefHealthBadge;
