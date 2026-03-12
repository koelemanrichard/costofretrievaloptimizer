import React, { useState } from 'react';
import type { ConsistencyReport } from '../../services/audit/rules/CrossPageEavConsistencyReporter';

export interface KgConsistencyReportProps {
  report: ConsistencyReport;
}

function getRiskScoreColor(score: number): string {
  if (score < 20) return 'text-green-400';
  if (score <= 50) return 'text-yellow-400';
  return 'text-red-400';
}

function getRiskScoreBg(score: number): string {
  if (score < 20) return 'bg-green-900/20 border-green-800';
  if (score <= 50) return 'bg-yellow-900/20 border-yellow-800';
  return 'bg-red-900/20 border-red-800';
}

interface CollapsibleSectionProps {
  title: string;
  count: number;
  accentColor: string;
  borderColor: string;
  badgeBg: string;
  children: React.ReactNode;
  testId: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  count,
  accentColor,
  borderColor,
  badgeBg,
  children,
  testId,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`border ${borderColor} rounded-lg`} data-testid={testId}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={isOpen}
      >
        <span className={`font-medium ${accentColor}`}>{title}</span>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${badgeBg} ${accentColor}`}
            data-testid={`${testId}-count`}
          >
            {count}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-700/50">
          {children}
        </div>
      )}
    </div>
  );
};

export const KgConsistencyReport: React.FC<KgConsistencyReportProps> = ({ report }) => {
  const totalIssues =
    report.contradictions.length +
    report.namingInconsistencies.length +
    report.unitInconsistencies.length;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4" data-testid="kg-consistency-report">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-200">
          Knowledge Graph Consistency
        </h3>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getRiskScoreBg(report.kbtRiskScore)}`}
          data-testid="kbt-risk-score"
        >
          <span className="text-xs text-gray-400">KBT Risk</span>
          <span className={`text-lg font-bold tabular-nums ${getRiskScoreColor(report.kbtRiskScore)}`}>
            {report.kbtRiskScore}
          </span>
        </div>
      </div>

      {/* Summary line */}
      <p className="text-sm text-gray-400">
        Analyzed {report.totalEavsAnalyzed} EAV triples across pages.
      </p>

      {/* Empty state */}
      {totalIssues === 0 && (
        <div
          className="rounded-lg bg-green-900/20 border border-green-800 px-4 py-3 text-green-400 text-sm"
          data-testid="no-issues"
        >
          No issues found. All EAV triples are consistent across pages.
        </div>
      )}

      {/* Contradictions */}
      {report.contradictions.length > 0 && (
        <CollapsibleSection
          title="Contradictions"
          count={report.contradictions.length}
          accentColor="text-red-400"
          borderColor="border-red-800/50"
          badgeBg="bg-red-900/30"
          testId="contradictions-section"
        >
          <div className="mt-3 space-y-3">
            {report.contradictions.map((c, i) => (
              <div key={i} className="rounded-md bg-gray-900/50 p-3">
                <div className="text-sm text-gray-300 mb-2">
                  <span className="font-medium text-gray-200">{c.entity}</span>
                  {' / '}
                  <span className="text-gray-400">{c.attribute}</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase">
                      <th className="text-left pb-1">Page</th>
                      <th className="text-left pb-1">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.values.map((v, j) => (
                      <tr key={j} className="border-t border-gray-700/30">
                        <td className="py-1 text-gray-400 pr-4">{v.page}</td>
                        <td className="py-1 text-red-300">{v.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Naming Inconsistencies */}
      {report.namingInconsistencies.length > 0 && (
        <CollapsibleSection
          title="Naming Inconsistencies"
          count={report.namingInconsistencies.length}
          accentColor="text-yellow-400"
          borderColor="border-yellow-800/50"
          badgeBg="bg-yellow-900/30"
          testId="naming-section"
        >
          <div className="mt-3 space-y-3">
            {report.namingInconsistencies.map((n, i) => (
              <div key={i} className="rounded-md bg-gray-900/50 p-3">
                <div className="flex flex-wrap gap-2 mb-2">
                  {n.variants.map((v, j) => (
                    <span
                      key={j}
                      className="px-2 py-0.5 text-xs rounded-full bg-yellow-900/30 text-yellow-300 border border-yellow-800/50"
                    >
                      {v}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  Found on: {n.pages.join(', ')}
                </p>
                <p className="text-xs text-green-400 mt-1">{n.suggestion}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Unit Inconsistencies */}
      {report.unitInconsistencies.length > 0 && (
        <CollapsibleSection
          title="Unit Inconsistencies"
          count={report.unitInconsistencies.length}
          accentColor="text-orange-400"
          borderColor="border-orange-800/50"
          badgeBg="bg-orange-900/30"
          testId="units-section"
        >
          <div className="mt-3 space-y-3">
            {report.unitInconsistencies.map((u, i) => (
              <div key={i} className="rounded-md bg-gray-900/50 p-3">
                <div className="text-sm text-gray-300 mb-2">
                  <span className="font-medium text-gray-200">{u.entity}</span>
                  {' / '}
                  <span className="text-gray-400">{u.attribute}</span>
                </div>
                <div className="space-y-1">
                  {u.variants.map((v, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">{v.page}:</span>
                      <span className="text-orange-300">{v.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
};

export default KgConsistencyReport;
