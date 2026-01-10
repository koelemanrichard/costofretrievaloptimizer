/**
 * LiveGenerationMonitor Component
 *
 * Real-time monitor showing pass execution progress, rule changes, and conflict
 * detection during content generation.
 *
 * Features:
 * - Display current pass being executed (1-10)
 * - Show real-time rule status changes
 * - Highlight conflicts/regressions when detected
 * - Show auto-revert actions
 * - Timeline of pass deltas
 *
 * @module components/quality
 */

import React, { useMemo } from 'react';
import type { PassDelta } from '../../services/ai/contentGeneration/tracking';
import { PASS_NAMES } from '../../types';

// =============================================================================
// Types
// =============================================================================

export interface LiveGenerationMonitorProps {
  /** Unique identifier for the content generation job */
  jobId: string;
  /** Current pass number being executed (1-10) */
  currentPass: number;
  /** Total number of passes (typically 10) */
  totalPasses: number;
  /** Array of pass deltas from completed passes */
  passDeltas: PassDelta[];
  /** Whether generation is currently in progress */
  isGenerating: boolean;
  /** Callback to pause generation */
  onPauseGeneration?: () => void;
  /** Callback to resume generation */
  onResumeGeneration?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

// PASS_NAMES imported from types.ts for consistency with Standard View
// 10-pass order: Draft, Headers, Intro, Lists, Discourse, Micro, Visuals, Polish, Audit, Schema

/**
 * Icons for different pass states
 */
const STATUS_ICONS = {
  pending: '\u25CB',      // Empty circle
  active: '\u25CF',       // Filled circle
  completed: '\u2713',    // Checkmark
  reverted: '\u21BA',     // Counterclockwise arrow
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get color class based on recommendation
 */
function getRecommendationColor(recommendation: PassDelta['recommendation']): string {
  switch (recommendation) {
    case 'accept':
      return 'text-green-400';
    case 'revert':
      return 'text-red-400';
    case 'review':
      return 'text-yellow-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get background color class based on recommendation
 */
function getRecommendationBgColor(recommendation: PassDelta['recommendation']): string {
  switch (recommendation) {
    case 'accept':
      return 'bg-green-900/30 border-green-700/50';
    case 'revert':
      return 'bg-red-900/30 border-red-700/50';
    case 'review':
      return 'bg-yellow-900/30 border-yellow-700/50';
    default:
      return 'bg-gray-800/30 border-gray-700/50';
  }
}

/**
 * Get pass status based on current progress and deltas
 */
function getPassStatus(
  passNumber: number,
  currentPass: number,
  isGenerating: boolean,
  delta?: PassDelta
): 'pending' | 'active' | 'completed' | 'reverted' {
  if (passNumber < currentPass) {
    // Pass is complete - check if it was reverted
    if (delta?.recommendation === 'revert') {
      return 'reverted';
    }
    return 'completed';
  }
  if (passNumber === currentPass && isGenerating) {
    return 'active';
  }
  return 'pending';
}

// =============================================================================
// Sub-Components
// =============================================================================

interface ProgressBarProps {
  value: number;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, className = '' }) => {
  const percentage = Math.min(100, Math.max(0, value * 100));

  return (
    <div className={`w-full h-2 bg-gray-700 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-blue-500 transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

interface DeltaSummaryProps {
  delta: PassDelta;
}

const DeltaSummary: React.FC<DeltaSummaryProps> = ({ delta }) => {
  return (
    <div className="flex items-center gap-3 text-sm">
      {delta.rulesFixed.length > 0 && (
        <span className="text-green-400 font-medium">
          +{delta.rulesFixed.length} fixed
        </span>
      )}
      {delta.rulesRegressed.length > 0 && (
        <span className="text-red-400 font-medium">
          -{delta.rulesRegressed.length} regressed
        </span>
      )}
      {delta.rulesFixed.length === 0 && delta.rulesRegressed.length === 0 && (
        <span className="text-gray-400">No changes</span>
      )}
      {delta.recommendation === 'revert' && (
        <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-900/50 text-red-300 border border-red-700">
          Auto-reverting
        </span>
      )}
      {delta.recommendation === 'review' && (
        <span className="px-2 py-0.5 text-xs font-medium rounded bg-yellow-900/50 text-yellow-300 border border-yellow-700">
          Needs review
        </span>
      )}
    </div>
  );
};

interface PassTimelineItemProps {
  passNumber: number;
  passName: string;
  status: 'pending' | 'active' | 'completed' | 'reverted';
  delta?: PassDelta;
  isLast: boolean;
}

const PassTimelineItem: React.FC<PassTimelineItemProps> = ({
  passNumber,
  passName,
  status,
  delta,
  isLast,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
          </span>
        );
      case 'completed':
        return (
          <span className="flex h-3 w-3 items-center justify-center rounded-full bg-green-500">
            <span className="text-[8px] text-white font-bold">{STATUS_ICONS.completed}</span>
          </span>
        );
      case 'reverted':
        return (
          <span className="flex h-3 w-3 items-center justify-center rounded-full bg-red-500">
            <span className="text-[8px] text-white font-bold">{STATUS_ICONS.reverted}</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="flex h-3 w-3 rounded-full border-2 border-gray-600 bg-gray-800" />
        );
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'text-blue-400';
      case 'completed':
        return 'text-green-400';
      case 'reverted':
        return 'text-red-400';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="flex gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        {getStatusIcon()}
        {!isLast && (
          <div
            className={`w-0.5 flex-1 min-h-[24px] ${
              status === 'completed' || status === 'reverted'
                ? 'bg-gray-600'
                : 'bg-gray-700'
            }`}
          />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-4 ${isLast ? 'pb-0' : ''}`}>
        <div className="flex items-center gap-2">
          <span className={`font-medium ${getStatusColor()}`}>
            Pass {passNumber}
          </span>
          <span className="text-gray-400 text-sm">{passName}</span>
        </div>

        {/* Delta details for completed passes */}
        {delta && (status === 'completed' || status === 'reverted') && (
          <div
            className={`mt-2 p-2 rounded-lg border ${getRecommendationBgColor(
              delta.recommendation
            )}`}
          >
            <div className="flex items-center justify-between text-xs">
              <DeltaSummary delta={delta} />
              <span className={`font-medium ${getRecommendationColor(delta.recommendation)}`}>
                Net: {delta.netChange > 0 ? '+' : ''}{delta.netChange}
              </span>
            </div>

            {/* Show regressed rules if any */}
            {delta.rulesRegressed.length > 0 && (
              <div className="mt-2 text-xs">
                <span className="text-red-400">Regressed: </span>
                <span className="text-gray-400 font-mono">
                  {delta.rulesRegressed.slice(0, 5).join(', ')}
                  {delta.rulesRegressed.length > 5 && ` +${delta.rulesRegressed.length - 5} more`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Active pass indicator */}
        {status === 'active' && (
          <div className="mt-2 flex items-center gap-2 text-sm text-blue-400">
            <span className="animate-pulse">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const LiveGenerationMonitor: React.FC<LiveGenerationMonitorProps> = ({
  jobId,
  currentPass,
  totalPasses,
  passDeltas: rawPassDeltas,
  isGenerating,
  onPauseGeneration,
  onResumeGeneration,
  className = '',
}) => {
  // Defensive guard: ensure passDeltas is always an array
  const passDeltas = Array.isArray(rawPassDeltas) ? rawPassDeltas : [];

  // Get the latest delta (most recent completed pass)
  const latestDelta = useMemo(() => {
    if (passDeltas.length === 0) return null;
    return passDeltas[passDeltas.length - 1];
  }, [passDeltas]);

  // Calculate overall progress
  const progressValue = totalPasses > 0 ? (currentPass - 1) / totalPasses : 0;

  // Build delta map for quick lookup
  const deltaMap = useMemo(() => {
    const map = new Map<number, PassDelta>();
    passDeltas.forEach(delta => map.set(delta.passNumber, delta));
    return map;
  }, [passDeltas]);

  // Generate pass list
  const passes = useMemo(() => {
    return Array.from({ length: totalPasses }, (_, i) => i + 1);
  }, [totalPasses]);

  return (
    <div className={`live-generation-monitor ${className}`}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Generation Progress</h3>
          <div className="flex items-center gap-2">
            {isGenerating ? (
              onPauseGeneration && (
                <button
                  onClick={onPauseGeneration}
                  className="px-3 py-1.5 text-sm font-medium text-yellow-400 bg-yellow-900/30 border border-yellow-700/50 rounded-lg hover:bg-yellow-900/50 transition-colors"
                  aria-label="Pause generation"
                >
                  Pause
                </button>
              )
            ) : (
              onResumeGeneration && currentPass <= totalPasses && (
                <button
                  onClick={onResumeGeneration}
                  className="px-3 py-1.5 text-sm font-medium text-green-400 bg-green-900/30 border border-green-700/50 rounded-lg hover:bg-green-900/50 transition-colors"
                  aria-label="Resume generation"
                >
                  Resume
                </button>
              )
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Pass {Math.min(currentPass, totalPasses)} of {totalPasses}
            </span>
            <span className="text-gray-400">
              {Math.round(progressValue * 100)}% complete
            </span>
          </div>
          <ProgressBar value={progressValue} />
        </div>
      </div>

      {/* Current pass status */}
      {isGenerating && currentPass <= totalPasses && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-300">
                Current Pass: {PASS_NAMES[currentPass] || `Pass ${currentPass}`}
              </h4>
              {latestDelta && latestDelta.passNumber === currentPass - 1 && (
                <div className="mt-1">
                  <span className="text-xs text-gray-400">Previous pass: </span>
                  <DeltaSummary delta={latestDelta} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              <span className="text-sm text-blue-400">Processing</span>
            </div>
          </div>
        </div>
      )}

      {/* Completed state */}
      {!isGenerating && currentPass > totalPasses && (
        <div className="mb-4 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-bold">{STATUS_ICONS.completed}</span>
            <span className="text-green-300 font-medium">Generation Complete</span>
          </div>
          {latestDelta && (
            <div className="mt-2 text-sm text-gray-400">
              Final pass delta: <DeltaSummary delta={latestDelta} />
            </div>
          )}
        </div>
      )}

      {/* Pass timeline */}
      <div className="pass-timeline">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Pass Timeline</h4>
        <div className="space-y-0">
          {passes.map((passNumber, index) => {
            const delta = deltaMap.get(passNumber);
            const status = getPassStatus(passNumber, currentPass, isGenerating, delta);

            return (
              <PassTimelineItem
                key={passNumber}
                passNumber={passNumber}
                passName={PASS_NAMES[passNumber] || `Pass ${passNumber}`}
                status={status}
                delta={delta}
                isLast={index === passes.length - 1}
              />
            );
          })}
        </div>
      </div>

      {/* Job ID for debugging */}
      <div className="mt-4 pt-3 border-t border-gray-700/50">
        <span className="text-xs text-gray-500 font-mono">
          Job: {jobId.slice(0, 8)}...
        </span>
      </div>
    </div>
  );
};

export default LiveGenerationMonitor;
