/**
 * Analysis Status Panel Component
 *
 * Displays real-time progress and status for competitor analysis operations.
 * Shows progress bar, success/fail counts, warnings, and data quality indicator.
 *
 * @module components/analysis/AnalysisStatusPanel
 */

import React, { useState } from 'react';
import { SmartLoader } from '../ui/FunLoaders';

// =============================================================================
// INLINE ICONS (avoiding external icon library dependency)
// =============================================================================

const ChevronDown: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUp: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const AlertTriangle: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckCircle: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircle: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Info: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// =============================================================================
// TYPES
// =============================================================================

export interface AnalysisWarning {
  url?: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  fallbackUsed?: string;
}

export interface AnalysisStatusData {
  stage: 'idle' | 'fetching-serp' | 'extracting' | 'aggregating' | 'complete' | 'failed';
  stageLabel?: string;
  progress: number; // 0-100
  competitorsTotal: number;
  competitorsSuccess: number;
  competitorsFailed: number;
  currentUrl?: string;
  warnings: AnalysisWarning[];
  dataQuality?: 'high' | 'medium' | 'low' | 'none';
  error?: string;
}

export interface AnalysisStatusPanelProps {
  status: AnalysisStatusData;
  onRetry?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getStageLabel = (stage: AnalysisStatusData['stage'], stageLabel?: string): string => {
  if (stageLabel) return stageLabel;
  switch (stage) {
    case 'idle': return 'Ready to analyze';
    case 'fetching-serp': return 'Fetching SERP data...';
    case 'extracting': return 'Extracting competitor content...';
    case 'aggregating': return 'Aggregating market patterns...';
    case 'complete': return 'Analysis complete';
    case 'failed': return 'Analysis failed';
    default: return 'Processing...';
  }
};

const getSeverityIcon = (severity: AnalysisWarning['severity']) => {
  switch (severity) {
    case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    case 'info':
    default: return <Info className="w-4 h-4 text-blue-400" />;
  }
};

const getQualityColor = (quality?: AnalysisStatusData['dataQuality']): string => {
  switch (quality) {
    case 'high': return 'text-green-400';
    case 'medium': return 'text-yellow-400';
    case 'low': return 'text-red-400';
    case 'none': return 'text-gray-500';
    default: return 'text-gray-400';
  }
};

const getProgressBarColor = (stage: AnalysisStatusData['stage']): string => {
  switch (stage) {
    case 'complete': return 'bg-green-500';
    case 'failed': return 'bg-red-500';
    default: return 'bg-blue-500';
  }
};

// =============================================================================
// COMPONENT
// =============================================================================

export const AnalysisStatusPanel: React.FC<AnalysisStatusPanelProps> = ({
  status,
  onRetry,
  onCancel,
  compact = false,
}) => {
  const [showWarnings, setShowWarnings] = useState(false);
  const isActive = status.stage !== 'idle' && status.stage !== 'complete' && status.stage !== 'failed';
  const hasWarnings = status.warnings.length > 0;
  const errorCount = status.warnings.filter(w => w.severity === 'error').length;
  const warningCount = status.warnings.filter(w => w.severity === 'warning').length;

  if (compact && status.stage === 'idle') {
    return null;
  }

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          {isActive ? (
            <SmartLoader context="analyzing" size="sm" showText={false} />
          ) : status.stage === 'complete' ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : status.stage === 'failed' ? (
            <XCircle className="w-5 h-5 text-red-400" />
          ) : null}

          {/* Stage Label */}
          <div>
            <p className="text-sm font-medium text-white">
              {getStageLabel(status.stage, status.stageLabel)}
            </p>
            {status.currentUrl && isActive && (
              <p className="text-xs text-gray-400 truncate max-w-[300px]">
                {status.currentUrl}
              </p>
            )}
          </div>
        </div>

        {/* Right side: counts and quality */}
        <div className="flex items-center gap-4">
          {status.competitorsTotal > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle className="w-4 h-4" />
                {status.competitorsSuccess}
              </span>
              {status.competitorsFailed > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <XCircle className="w-4 h-4" />
                  {status.competitorsFailed}
                </span>
              )}
              <span className="text-gray-500">
                / {status.competitorsTotal}
              </span>
            </div>
          )}

          {status.dataQuality && status.stage === 'complete' && (
            <span className={`text-sm font-medium ${getQualityColor(status.dataQuality)}`}>
              {status.dataQuality.toUpperCase()}
            </span>
          )}

          {/* Actions */}
          {status.stage === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded"
            >
              Retry
            </button>
          )}
          {isActive && onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {status.progress > 0 && (
        <div className="px-4 pb-3">
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressBarColor(status.stage)} transition-all duration-300 ease-out`}
              style={{ width: `${status.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {status.error && (
        <div className="px-4 pb-3">
          <div className="bg-red-900/30 border border-red-800 rounded p-2 text-sm text-red-300">
            {status.error}
          </div>
        </div>
      )}

      {/* Warnings Section */}
      {hasWarnings && (
        <div className="border-t border-gray-700">
          <button
            onClick={() => setShowWarnings(!showWarnings)}
            className="w-full px-4 py-2 flex items-center justify-between text-sm text-gray-400 hover:bg-gray-700/30"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              {status.warnings.length} warning{status.warnings.length !== 1 ? 's' : ''}
              {errorCount > 0 && (
                <span className="text-red-400">({errorCount} error{errorCount !== 1 ? 's' : ''})</span>
              )}
            </span>
            {showWarnings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showWarnings && (
            <div className="px-4 pb-3 space-y-2 max-h-48 overflow-y-auto">
              {status.warnings.map((warning, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 p-2 rounded text-sm ${
                    warning.severity === 'error' ? 'bg-red-900/20' :
                    warning.severity === 'warning' ? 'bg-yellow-900/20' :
                    'bg-blue-900/20'
                  }`}
                >
                  {getSeverityIcon(warning.severity)}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200">{warning.message}</p>
                    {warning.url && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{warning.url}</p>
                    )}
                    {warning.fallbackUsed && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Fallback: {warning.fallbackUsed}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// COMPACT PROGRESS INDICATOR (for inline use)
// =============================================================================

export interface CompactProgressProps {
  progress: number;
  label?: string;
  isLoading?: boolean;
}

export const CompactProgress: React.FC<CompactProgressProps> = ({
  progress,
  label,
  isLoading = false,
}) => {
  return (
    <div className="flex items-center gap-2">
      {isLoading && <SmartLoader context="analyzing" size="sm" showText={false} />}
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden min-w-[60px]">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      {label && <span className="text-xs text-gray-400">{label}</span>}
    </div>
  );
};

// =============================================================================
// QUALITY BADGE (for displaying data quality inline)
// =============================================================================

export interface QualityBadgeProps {
  quality: 'high' | 'medium' | 'low' | 'none';
  competitors?: number;
  showLabel?: boolean;
}

export const QualityBadge: React.FC<QualityBadgeProps> = ({
  quality,
  competitors,
  showLabel = true,
}) => {
  const colors = {
    high: 'bg-green-900/30 text-green-400 border-green-700',
    medium: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
    low: 'bg-red-900/30 text-red-400 border-red-700',
    none: 'bg-gray-800 text-gray-500 border-gray-700',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${colors[quality]}`}>
      {quality === 'high' && <CheckCircle className="w-3 h-3" />}
      {quality === 'medium' && <AlertTriangle className="w-3 h-3" />}
      {quality === 'low' && <AlertTriangle className="w-3 h-3" />}
      {quality === 'none' && <XCircle className="w-3 h-3" />}
      {showLabel && <span>{quality.toUpperCase()}</span>}
      {competitors !== undefined && <span className="text-gray-400">({competitors})</span>}
    </span>
  );
};

export default AnalysisStatusPanel;
