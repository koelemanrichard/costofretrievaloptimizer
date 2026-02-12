import React from 'react';
import type { AuditFinding } from '../../services/audit/types';

export interface AuditFindingCardProps {
  finding: AuditFinding;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-900/20', border: 'border-red-800', icon: 'text-red-500' },
  high: { bg: 'bg-orange-900/20', border: 'border-orange-800', icon: 'text-orange-500' },
  medium: { bg: 'bg-yellow-900/20', border: 'border-yellow-800', icon: 'text-yellow-500' },
  low: { bg: 'bg-gray-800', border: 'border-gray-700', icon: 'text-gray-400' },
} as const;

const IMPACT_COLORS: Record<string, string> = {
  high: 'bg-red-500/20 text-red-300',
  medium: 'bg-yellow-500/20 text-yellow-300',
  low: 'bg-gray-700 text-gray-400',
};

/** Format a phase name from camelCase to a human-readable label. */
function formatPhaseName(phase: string): string {
  return phase
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export const AuditFindingCard: React.FC<AuditFindingCardProps> = ({
  finding,
  isExpanded = false,
  onToggle,
}) => {
  const colors = SEVERITY_COLORS[finding.severity];

  return (
    <div
      className={`rounded-lg border ${colors.border} ${colors.bg} transition-colors`}
      data-testid="audit-finding-card"
    >
      {/* Collapsed header - always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        aria-expanded={isExpanded}
      >
        {/* Severity icon */}
        <span
          className={`flex-shrink-0 w-3 h-3 rounded-full ${colors.icon}`}
          data-testid="severity-icon"
          style={{
            backgroundColor: 'currentColor',
          }}
        />

        {/* Title */}
        <span className="flex-1 font-medium text-gray-200 truncate">
          {finding.title}
        </span>

        {/* Phase badge */}
        <span className="flex-shrink-0 px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300">
          {formatPhaseName(finding.phase)}
        </span>

        {/* Impact badge */}
        <span
          className={`flex-shrink-0 px-2 py-0.5 text-xs rounded-full ${IMPACT_COLORS[finding.estimatedImpact] || IMPACT_COLORS.low}`}
        >
          {finding.estimatedImpact}
        </span>

        {/* Chevron */}
        <svg
          className={`flex-shrink-0 w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-700/50">
          {/* Description */}
          <p className="text-sm text-gray-400 pt-3">{finding.description}</p>

          {/* Why It Matters */}
          <div className="rounded-md bg-gray-700 p-3">
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-1">
              Why It Matters
            </h4>
            <p className="text-sm text-gray-300">{finding.whyItMatters}</p>
          </div>

          {/* Current vs Expected */}
          {(finding.currentValue || finding.expectedValue) && (
            <div className="flex items-center gap-3 text-sm">
              {finding.currentValue && (
                <div className="flex-1 rounded-md bg-red-900/20 border border-red-800/50 px-3 py-2">
                  <span className="block text-xs text-gray-500 mb-0.5">Current</span>
                  <span className="text-gray-300">{finding.currentValue}</span>
                </div>
              )}
              {finding.currentValue && finding.expectedValue && (
                <span className="text-gray-500 flex-shrink-0">&rarr;</span>
              )}
              {finding.expectedValue && (
                <div className="flex-1 rounded-md bg-green-900/20 border border-green-800/50 px-3 py-2">
                  <span className="block text-xs text-gray-500 mb-0.5">Expected</span>
                  <span className="text-gray-300">{finding.expectedValue}</span>
                </div>
              )}
            </div>
          )}

          {/* Example Fix */}
          {finding.exampleFix && (
            <div className="rounded-md bg-gray-900 border border-gray-700 p-3 font-mono text-xs text-gray-300 whitespace-pre-wrap">
              {finding.exampleFix}
            </div>
          )}

          {/* Auto-fix button */}
          {finding.autoFixAvailable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                finding.autoFixAction?.();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-700 hover:bg-green-600 text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Auto-Fix
            </button>
          )}

          {/* Rule ID */}
          <div className="pt-1">
            <span className="text-xs text-gray-500">Rule: {finding.ruleId}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditFindingCard;
