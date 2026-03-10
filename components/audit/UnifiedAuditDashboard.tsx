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
import { getTranslations } from '../../config/audit-i18n/index';
import { computeCor2Score, extractCor2InputFromReport } from '../../services/ai/cor2Scorer';
import type { Cor2Result } from '../../services/ai/cor2Scorer';

export interface UnifiedAuditDashboardProps {
  report: UnifiedAuditReport;
  onWeightChange?: (weights: Partial<Record<AuditPhaseName, number>>) => void;
  onWebsiteTypeChange?: (type: string) => void;
  websiteType?: string;
}

type SeverityTab = 'all' | 'critical' | 'high' | 'medium' | 'low';

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

  // Load i18n translations based on the audit report's language
  const t = useMemo(() => getTranslations(report.language), [report.language]);

  const SEVERITY_TABS: { key: SeverityTab; label: string }[] = useMemo(() => [
    { key: 'all', label: t.ui.viewAll },
    { key: 'critical', label: t.severities.critical || 'Critical' },
    { key: 'high', label: t.severities.high || 'High' },
    { key: 'medium', label: t.severities.medium || 'Medium' },
    { key: 'low', label: t.severities.low || 'Low' },
  ], [t]);

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

  // Compute CoR 2.0 score from audit findings
  const cor2Result = useMemo<Cor2Result>(() => {
    const cor2Input = extractCor2InputFromReport(report);
    return computeCor2Score(cor2Input);
  }, [report]);

  // Compute quick stats
  const criticalCount = allFindings.filter((f) => f.severity === 'critical').length;
  const highCount = allFindings.filter((f) => f.severity === 'high').length;

  return (
    <div className="bg-gray-900 p-6 space-y-6" data-testid="unified-audit-dashboard">
      {/* === Content Fetch Warning === */}
      {report.contentFetchFailed && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4" data-testid="content-fetch-warning">
          <p className="text-yellow-400 text-sm font-medium">Content fetch failed</p>
          <p className="text-yellow-500/80 text-xs mt-1">
            Could not retrieve page content. Phase scores may be incomplete.
            Check your API keys and proxy configuration.
          </p>
        </div>
      )}

      {/* === Top Section === */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left: Overall Score Ring + CoR 2.0 Badge + Export */}
        <div className="flex-shrink-0 flex flex-col items-center gap-3">
          <div className="flex items-end gap-4">
            <AuditScoreRing score={report.overallScore} size={140} label="Overall Score" />
            <Cor2ScoreBadge result={cor2Result} />
          </div>
          <AuditExportDropdown report={report} />
        </div>

        {/* Right: Quick Stats */}
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-800 rounded-lg p-3">
              <span className="block text-xs text-gray-500">{t.ui.findings}</span>
              <span className="text-xl font-bold text-gray-200" data-testid="total-findings">
                {allFindings.length}
              </span>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <span className="block text-xs text-gray-500">{t.severities.critical}</span>
              <span className="text-xl font-bold text-red-400" data-testid="critical-count">
                {criticalCount}
              </span>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <span className="block text-xs text-gray-500">{t.severities.high}</span>
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
          {t.ui.phaseScores}
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
          {t.ui.findings}
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
            {t.ui.noFindings}
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

/* ---- CoR 2.0 Score Badge sub-component ---- */

const COR2_COLORS: Record<Cor2Result['interpretation'], { ring: string; text: string; bg: string }> = {
  fully_optimized: { ring: '#22c55e', text: 'text-green-400', bg: 'bg-green-900/20' },
  good_foundation: { ring: '#eab308', text: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  significant_gaps: { ring: '#f97316', text: 'text-orange-400', bg: 'bg-orange-900/20' },
  not_optimized: { ring: '#ef4444', text: 'text-red-400', bg: 'bg-red-900/20' },
};

const COR2_LABELS: Record<Cor2Result['interpretation'], string> = {
  fully_optimized: 'Fully Optimized',
  good_foundation: 'Good Foundation',
  significant_gaps: 'Significant Gaps',
  not_optimized: 'Not Optimized',
};

interface Cor2ScoreBadgeProps {
  result: Cor2Result;
}

const Cor2ScoreBadge: React.FC<Cor2ScoreBadgeProps> = ({ result }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const colors = COR2_COLORS[result.interpretation];
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = result.score / 5;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div
      className="relative flex flex-col items-center gap-1"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      data-testid="cor2-score-badge"
    >
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            className="text-gray-700"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            stroke={colors.ring}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.5s ease-in-out',
            }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`text-lg font-bold ${colors.text}`}>
            {result.score}
          </span>
          <span className="text-[10px] text-gray-500">/5</span>
        </div>
      </div>
      <span className="text-xs text-gray-400">CoR 2.0</span>

      {/* Tooltip with factor breakdown */}
      {showTooltip && (
        <div
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-64 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl"
          data-testid="cor2-tooltip"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-300">CoR 2.0 LLM Readiness</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
              {COR2_LABELS[result.interpretation]}
            </span>
          </div>
          <div className="space-y-1.5">
            {Object.values(result.factors).map((factor) => (
              <div key={factor.label} className="flex items-center gap-2">
                <div className="flex-1 text-[11px] text-gray-400 truncate">{factor.label}</div>
                <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(factor.score / 5) * 100}%`,
                      backgroundColor: colors.ring,
                    }}
                  />
                </div>
                <span className="text-[11px] text-gray-400 w-6 text-right">{factor.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedAuditDashboard;
