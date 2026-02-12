import React, { useState, useMemo } from 'react';
import type {
  UnifiedAuditReport,
  AuditPhaseName,
  AuditFinding,
} from '../../services/audit/types';
import { AuditScoreRing } from './AuditScoreRing';
import { PhaseScoreCard } from './PhaseScoreCard';
import { AuditFindingCard } from './AuditFindingCard';
import { AuditExportDropdown } from './AuditExportDropdown';

export interface UnifiedAuditDashboardProps {
  report: UnifiedAuditReport;
  onWeightChange?: (weights: Partial<Record<AuditPhaseName, number>>) => void;
  onWebsiteTypeChange?: (type: string) => void;
  websiteType?: string;
}

type SeverityTab = 'all' | 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_TABS: { key: SeverityTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export const UnifiedAuditDashboard: React.FC<UnifiedAuditDashboardProps> = ({
  report,
}) => {
  const [activeSeverityTab, setActiveSeverityTab] = useState<SeverityTab>('all');
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<AuditPhaseName | null>(null);

  // Collect all findings from all phases
  const allFindings = useMemo<AuditFinding[]>(() => {
    return report.phaseResults.flatMap((pr) => pr.findings);
  }, [report.phaseResults]);

  // Filtered findings based on active severity tab
  const filteredFindings = useMemo<AuditFinding[]>(() => {
    if (activeSeverityTab === 'all') return allFindings;
    return allFindings.filter((f) => f.severity === activeSeverityTab);
  }, [allFindings, activeSeverityTab]);

  // Sort phase results by score ascending (lowest first)
  const sortedPhaseResults = useMemo(() => {
    return [...report.phaseResults].sort((a, b) => a.score - b.score);
  }, [report.phaseResults]);

  // Compute quick stats
  const criticalCount = allFindings.filter((f) => f.severity === 'critical').length;
  const highCount = allFindings.filter((f) => f.severity === 'high').length;

  return (
    <div className="bg-gray-900 p-6 space-y-6" data-testid="unified-audit-dashboard">
      {/* === Top Section === */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left: Overall Score Ring + Export */}
        <div className="flex-shrink-0 flex flex-col items-center gap-3">
          <AuditScoreRing score={report.overallScore} size={140} label="Overall Score" />
          <AuditExportDropdown report={report} />
        </div>

        {/* Right: Quick Stats */}
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-800 rounded-lg p-3">
              <span className="block text-xs text-gray-500">Total Findings</span>
              <span className="text-xl font-bold text-gray-200" data-testid="total-findings">
                {allFindings.length}
              </span>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <span className="block text-xs text-gray-500">Critical</span>
              <span className="text-xl font-bold text-red-400" data-testid="critical-count">
                {criticalCount}
              </span>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <span className="block text-xs text-gray-500">High</span>
              <span className="text-xl font-bold text-orange-400" data-testid="high-count">
                {highCount}
              </span>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <span className="block text-xs text-gray-500">Duration</span>
              <span className="text-xl font-bold text-gray-200" data-testid="audit-duration">
                {formatDuration(report.auditDurationMs)}
              </span>
            </div>
          </div>

          {/* Language */}
          <div className="text-sm text-gray-400">
            Language: <span className="text-gray-200" data-testid="audit-language">{report.language}</span>
          </div>

          {/* Prerequisite Status Badges */}
          <div className="flex items-center gap-3" data-testid="prerequisite-badges">
            <PrerequisiteBadge label="Business Info" met={report.prerequisitesMet.businessInfo} />
            <PrerequisiteBadge label="Pillars" met={report.prerequisitesMet.pillars} />
            <PrerequisiteBadge label="EAVs" met={report.prerequisitesMet.eavs} />
          </div>
        </div>
      </div>

      {/* === Phase Grid === */}
      <section>
        <h2 className="text-lg font-semibold text-orange-400 mb-4" data-testid="phase-grid-heading">
          Phase Scores
        </h2>
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="phase-grid"
        >
          {sortedPhaseResults.map((result) => (
            <PhaseScoreCard
              key={result.phase}
              result={result}
              isExpanded={expandedPhase === result.phase}
              onToggle={() =>
                setExpandedPhase((prev) =>
                  prev === result.phase ? null : result.phase
                )
              }
            />
          ))}
        </div>
      </section>

      {/* === Findings Section === */}
      <section>
        <h2 className="text-lg font-semibold text-orange-400 mb-4" data-testid="findings-heading">
          Findings
        </h2>

        {/* Severity Tabs */}
        <div className="flex items-center gap-2 mb-4" role="tablist" data-testid="severity-tabs">
          {SEVERITY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeSeverityTab === tab.key}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeSeverityTab === tab.key
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-300'
              }`}
              onClick={() => setActiveSeverityTab(tab.key)}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Findings List */}
        {filteredFindings.length === 0 ? (
          <p className="text-gray-500 text-sm py-4" data-testid="no-findings-message">
            No findings match the selected filter.
          </p>
        ) : (
          <div className="space-y-2" data-testid="findings-list">
            {filteredFindings.map((finding) => (
              <AuditFindingCard
                key={finding.id}
                finding={finding}
                isExpanded={expandedFindingId === finding.id}
                onToggle={() =>
                  setExpandedFindingId((prev) =>
                    prev === finding.id ? null : finding.id
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* === Cannibalization Risks === */}
      {report.cannibalizationRisks.length > 0 && (
        <section data-testid="cannibalization-section">
          <h2 className="text-lg font-semibold text-orange-400 mb-4">
            Cannibalization Risks
          </h2>
          <div className="space-y-3">
            {report.cannibalizationRisks.map((risk, idx) => (
              <div
                key={idx}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                data-testid="cannibalization-risk"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      risk.severity === 'high'
                        ? 'bg-red-900/30 text-red-400'
                        : risk.severity === 'medium'
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {risk.severity}
                  </span>
                  <span className="text-sm font-medium text-gray-200">
                    {risk.sharedEntity}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-2">{risk.recommendation}</p>
                <div className="flex flex-wrap gap-1">
                  {risk.sharedKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  URLs: {risk.urls.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* === Content Merge Suggestions === */}
      {report.contentMergeSuggestions.length > 0 && (
        <section data-testid="merge-suggestions-section">
          <h2 className="text-lg font-semibold text-orange-400 mb-4">
            Content Merge Suggestions
          </h2>
          <div className="space-y-3">
            {report.contentMergeSuggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                data-testid="merge-suggestion"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-900/30 text-blue-400 font-medium">
                    {suggestion.suggestedAction}
                  </span>
                  <span className="text-xs text-gray-500">
                    {suggestion.overlapPercentage}% overlap
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-2">{suggestion.reason}</p>
                <div className="text-xs text-gray-500">
                  <div>Source: {suggestion.sourceUrl}</div>
                  <div>Target: {suggestion.targetUrl}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* === Audit Metadata === */}
      <section
        className="border-t border-gray-800 pt-4"
        data-testid="audit-metadata"
      >
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <span>Version: {report.version}</span>
          <span>Created: {formatDate(report.createdAt)}</span>
          <span>Duration: {formatDuration(report.auditDurationMs)}</span>
          <span>ID: {report.id}</span>
        </div>
      </section>
    </div>
  );
};

/* ---- Prerequisite Badge sub-component ---- */

interface PrerequisiteBadgeProps {
  label: string;
  met: boolean;
}

const PrerequisiteBadge: React.FC<PrerequisiteBadgeProps> = ({ label, met }) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
      met
        ? 'bg-green-900/30 text-green-400 border border-green-800/50'
        : 'bg-red-900/30 text-red-400 border border-red-800/50'
    }`}
    data-testid={`prerequisite-${label.toLowerCase().replace(/\s+/g, '-')}`}
  >
    {met ? (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )}
    {label}
  </span>
);

export default UnifiedAuditDashboard;
