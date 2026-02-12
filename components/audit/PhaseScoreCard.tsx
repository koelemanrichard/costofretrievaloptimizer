import React from 'react';
import type { AuditPhaseResult, AuditFinding } from '../../services/audit/types';

export interface PhaseScoreCardProps {
  result: AuditPhaseResult;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const PHASE_DISPLAY_NAMES: Record<string, string> = {
  strategicFoundation: 'Strategic Foundation',
  eavSystem: 'EAV System',
  microSemantics: 'Micro-Semantics',
  informationDensity: 'Information Density',
  contextualFlow: 'Contextual Flow',
  internalLinking: 'Internal Linking',
  semanticDistance: 'Semantic Distance',
  contentFormat: 'Content Format',
  htmlTechnical: 'HTML Technical',
  metaStructuredData: 'Meta & Structured Data',
  costOfRetrieval: 'Cost of Retrieval',
  urlArchitecture: 'URL Architecture',
  crossPageConsistency: 'Cross-Page Consistency',
  websiteTypeSpecific: 'Website Type',
  factValidation: 'Fact Validation',
};

function getScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function getScoreTextColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

const SEVERITY_ORDER: AuditFinding['severity'][] = ['critical', 'high', 'medium', 'low'];
const SEVERITY_DOT_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-gray-400',
};

function countFindingsBySeverity(
  findings: AuditFinding[]
): { severity: AuditFinding['severity']; count: number }[] {
  const counts: Record<string, number> = {};
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
  }
  return SEVERITY_ORDER.filter((s) => counts[s] > 0).map((s) => ({
    severity: s,
    count: counts[s],
  }));
}

export const PhaseScoreCard: React.FC<PhaseScoreCardProps> = ({
  result,
  isExpanded = false,
  onToggle,
}) => {
  const displayName = PHASE_DISPLAY_NAMES[result.phase] || result.phase;
  const barColor = getScoreBarColor(result.score);
  const textColor = getScoreTextColor(result.score);
  const severityCounts = countFindingsBySeverity(result.findings);

  return (
    <div
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
      data-testid="phase-score-card"
    >
      {/* Clickable header area */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left"
        aria-expanded={isExpanded}
      >
        {/* Top row: phase name + score */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-200">{displayName}</span>
          <span className={`font-semibold tabular-nums ${textColor}`} data-testid="score-value">
            {result.score}
          </span>
        </div>

        {/* Score progress bar */}
        <div className="w-full h-2 rounded-full bg-gray-700" data-testid="progress-bar-track">
          <div
            className={`h-2 rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(Math.max(result.score, 0), 100)}%` }}
            data-testid="progress-bar-fill"
          />
        </div>

        {/* Below bar: checks passed + weight */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500" data-testid="checks-passed">
            {result.passedChecks}/{result.totalChecks} checks passed
          </span>
          {result.weight > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400"
              data-testid="weight-badge"
            >
              Weight: {result.weight}%
            </span>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-3" data-testid="expanded-content">
          {/* Summary */}
          {result.summary && (
            <p className="text-sm text-gray-400">{result.summary}</p>
          )}

          {/* Findings by severity */}
          {severityCounts.length > 0 && (
            <div className="flex items-center gap-3" data-testid="severity-counts">
              {severityCounts.map(({ severity, count }) => (
                <span key={severity} className="flex items-center gap-1 text-xs text-gray-400">
                  <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT_COLORS[severity]}`} />
                  {count} {severity}
                </span>
              ))}
            </div>
          )}

          {/* Individual finding titles */}
          {result.findings.length > 0 && (
            <ul className="space-y-1" data-testid="finding-titles">
              {result.findings.map((finding) => (
                <li
                  key={finding.id}
                  className="flex items-center gap-2 text-sm text-gray-300"
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEVERITY_DOT_COLORS[finding.severity]}`} />
                  {finding.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default PhaseScoreCard;
