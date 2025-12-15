/**
 * BriefHealthOverview
 *
 * Shows brief completeness status with missing items and repair/regenerate actions.
 * Collapsed by default - shows compact summary bar that expands on click.
 * Used in ContentBriefModal and BriefEditModal.
 */

import React, { useState } from 'react';
import { ContentBrief } from '../../types';
import {
  calculateBriefQualityScore,
  BriefQualityResult,
  getHealthLevelColor
} from '../../utils/briefQualityScore';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';

interface BriefHealthOverviewProps {
  brief: ContentBrief;
  onRepairMissing?: (missingFields: string[]) => void;
  onRegenerateBrief?: () => void;
  isRepairing?: boolean;
  isRegenerating?: boolean;
  defaultExpanded?: boolean;
}

export const BriefHealthOverview: React.FC<BriefHealthOverviewProps> = ({
  brief,
  onRepairMissing,
  onRegenerateBrief,
  isRepairing = false,
  isRegenerating = false,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const quality = calculateBriefQualityScore(brief);
  const colors = getHealthLevelColor(quality.level);
  const isComplete = quality.level === 'complete';
  const hasMissingFields = quality.missingFields.length > 0 && !isComplete;

  // Collapsed view - compact inline bar
  if (!isExpanded) {
    return (
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-all hover:brightness-110 ${colors.bg} ${colors.border}`}
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center gap-2">
          <StatusIcon level={quality.level} />
          <span className={`font-medium ${colors.text}`}>{quality.score}%</span>
          <span className="text-gray-400 text-sm">
            {quality.level === 'complete' && 'Brief Complete'}
            {quality.level === 'partial' && `${quality.missingFields.length} missing`}
            {quality.level === 'empty' && 'Brief Failed'}
          </span>
          {quality.sectionCount > 0 && (
            <span className="text-gray-500 text-xs hidden sm:inline">
              • {quality.sectionCount} sections
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Show repair button inline when collapsed if incomplete */}
          {!isComplete && !isRepairing && !isRegenerating && (
            <>
              {quality.level === 'partial' && onRepairMissing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRepairMissing(quality.missingFields);
                  }}
                  className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex items-center gap-1"
                >
                  <RepairIcon className="w-3 h-3" />
                  Repair ({quality.missingFields.length})
                </button>
              )}
            </>
          )}
          {(isRepairing || isRegenerating) && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Loader className="w-3 h-3" />
              {isRepairing ? 'Repairing...' : 'Regenerating...'}
            </div>
          )}
          <ChevronIcon className="w-4 h-4 text-gray-500" direction="down" />
        </div>
      </div>
    );
  }

  // Expanded view - full details
  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} overflow-hidden`}>
      {/* Header - clickable to collapse */}
      <div
        className="px-4 py-3 flex items-center justify-between border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/20 transition-colors"
        onClick={() => setIsExpanded(false)}
      >
        <div className="flex items-center gap-3">
          <StatusIcon level={quality.level} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${colors.text}`}>{quality.score}%</span>
              <span className="text-gray-300 font-medium">
                {quality.level === 'complete' && 'Brief Complete'}
                {quality.level === 'partial' && 'Brief Incomplete'}
                {quality.level === 'empty' && 'Brief Failed'}
              </span>
            </div>
            <p className="text-sm text-gray-400">{quality.summary}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Actions in Header */}
          {!isComplete && (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {isRepairing || isRegenerating ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader className="w-4 h-4" />
                  {isRepairing ? 'Repairing...' : 'Regenerating...'}
                </div>
              ) : (
                <>
                  {quality.level === 'partial' && onRepairMissing && (
                    <Button
                      onClick={() => onRepairMissing(quality.missingFields)}
                      variant="primary"
                      className="bg-purple-600 hover:bg-purple-700 text-sm"
                      disabled={isRepairing || isRegenerating}
                    >
                      <RepairIcon className="w-4 h-4 mr-1.5" />
                      Repair Missing ({quality.missingFields.length})
                    </Button>
                  )}
                  {onRegenerateBrief && (
                    <Button
                      onClick={onRegenerateBrief}
                      variant={quality.level === 'empty' ? 'primary' : 'secondary'}
                      className={quality.level === 'empty' ? '' : 'bg-gray-700 hover:bg-gray-600 text-sm'}
                      disabled={isRepairing || isRegenerating}
                    >
                      {quality.level === 'empty' ? 'Regenerate Brief' : 'Full Regenerate'}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
          <ChevronIcon className="w-5 h-5 text-gray-500" direction="up" />
        </div>
      </div>

      {/* Missing Items */}
      {hasMissingFields && (
        <div className="px-4 py-3">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Missing Components:</h4>
          <div className="grid grid-cols-2 gap-2">
            {quality.missingFields.map((field, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm bg-gray-800/50 rounded px-3 py-2"
              >
                <span className="text-red-400">✕</span>
                <span className="text-gray-300">{field}</span>
              </div>
            ))}
          </div>

          {/* Help Text */}
          <p className="text-xs text-gray-500 mt-3">
            <strong>Repair Missing</strong> fills only the missing fields without changing existing content.
            <strong> Full Regenerate</strong> recreates the entire brief from scratch.
          </p>
        </div>
      )}

      {/* Success State */}
      {isComplete && (
        <div className="px-4 py-3 flex items-center gap-2 text-green-300">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">All brief components are present. Ready for content generation!</span>
        </div>
      )}

      {/* Stats Footer */}
      {(quality.sectionCount > 0 || quality.targetWordCount) && (
        <div className="px-4 py-2 border-t border-gray-700/50 flex items-center gap-4 text-xs text-gray-400">
          {quality.sectionCount > 0 && (
            <span>{quality.sectionCount} sections defined</span>
          )}
          {quality.targetWordCount && (
            <span>~{quality.targetWordCount.toLocaleString()} words target</span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Status Icon Component
 */
const StatusIcon: React.FC<{ level: BriefQualityResult['level']; size?: 'sm' | 'lg' }> = ({ level, size = 'sm' }) => {
  const sizeClass = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';

  switch (level) {
    case 'complete':
      return (
        <svg className={`${sizeClass} text-green-400`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    case 'partial':
      return (
        <svg className={`${sizeClass} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    case 'empty':
      return (
        <svg className={`${sizeClass} text-red-400`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
  }
};

/**
 * Chevron Icon for expand/collapse
 */
const ChevronIcon: React.FC<{ className?: string; direction: 'up' | 'down' }> = ({ className, direction }) => (
  <svg
    className={`${className} transition-transform`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d={direction === 'down' ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'}
    />
  </svg>
);

/**
 * Repair Icon
 */
const RepairIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

export default BriefHealthOverview;
