import React from 'react';
import type { UnifiedAuditReport } from '../../services/audit/types';
import { AuditScoreRing } from './AuditScoreRing';
import { AuditFindingCard } from './AuditFindingCard';
import { PHASE_DISPLAY_NAMES } from './PhaseScoreCard';

export interface AuditSidePanelProps {
  report: UnifiedAuditReport | null;
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onOpenFullAudit?: () => void;
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export const AuditSidePanel: React.FC<AuditSidePanelProps> = ({
  report,
  isOpen,
  isLoading = false,
  onClose,
  onOpenFullAudit,
}) => {
  // Collect all findings, sorted by severity (critical first, then high)
  const allFindings = report?.phaseResults.flatMap((pr) => pr.findings) ?? [];
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedFindings = [...allFindings].sort(
    (a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4)
  );
  const topFindings = sortedFindings
    .filter((f) => f.severity === 'critical' || f.severity === 'high')
    .slice(0, 5);
  const totalFindings = allFindings.length;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-50"
          data-testid="side-panel-overlay"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full bg-gray-900 border-l border-gray-700 z-50 overflow-y-auto"
        style={{
          width: 'max(400px, 50%)',
          transform: isOpen ? 'translateX(0%)' : 'translateX(100%)',
          transition: 'transform 300ms ease-in-out',
        }}
        data-testid="side-panel"
        role="dialog"
        aria-label="Audit Results"
      >
        {/* Header (sticky) */}
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100">Audit Results</h2>
          <div className="flex items-center gap-3">
            {onOpenFullAudit && (
              <button
                type="button"
                onClick={onOpenFullAudit}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                data-testid="open-full-audit-btn"
              >
                Open Full Audit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 transition-colors"
              aria-label="Close panel"
              data-testid="close-panel-btn"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">
          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4" data-testid="loading-state">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-400 text-sm">Running audit...</span>
            </div>
          )}

          {/* Report content */}
          {!isLoading && report && (
            <>
              {/* Score ring (compact, 80px) */}
              <div className="flex justify-center" data-testid="score-section">
                <AuditScoreRing
                  score={report.overallScore}
                  size={80}
                  strokeWidth={6}
                  label="Overall"
                />
              </div>

              {/* Phase scores list */}
              <div className="space-y-2" data-testid="phase-scores-section">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Phase Scores</h3>
                {report.phaseResults.map((pr) => {
                  const barColor = getScoreBarColor(pr.score);
                  const displayName = PHASE_DISPLAY_NAMES[pr.phase] || pr.phase;
                  return (
                    <div key={pr.phase} className="flex items-center gap-3" data-testid="phase-score-bar">
                      <span className="text-xs text-gray-400 w-36 truncate flex-shrink-0">
                        {displayName}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-gray-700">
                        <div
                          className={`h-2 rounded-full ${barColor}`}
                          style={{ width: `${Math.min(Math.max(pr.score, 0), 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right tabular-nums">
                        {pr.score}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Top critical/high findings */}
              {topFindings.length > 0 && (
                <div className="space-y-2" data-testid="top-findings-section">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Top Findings</h3>
                  {topFindings.map((finding) => (
                    <AuditFindingCard key={finding.id} finding={finding} />
                  ))}
                  {totalFindings > topFindings.length && (
                    <button
                      type="button"
                      onClick={onOpenFullAudit}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      data-testid="view-all-findings-btn"
                    >
                      View all {totalFindings} findings
                    </button>
                  )}
                </div>
              )}

              {/* No findings case */}
              {topFindings.length === 0 && totalFindings === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No findings reported.</p>
              )}
            </>
          )}

          {/* Empty state: not loading, no report */}
          {!isLoading && !report && (
            <p className="text-sm text-gray-500 text-center py-8">
              No audit report available.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default AuditSidePanel;
