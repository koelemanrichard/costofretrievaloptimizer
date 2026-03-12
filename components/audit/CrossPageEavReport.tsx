import React, { useState, useMemo } from 'react';
import type { CrossPageEavIssue } from '../../services/audit/rules/CrossPageEavAuditor';

export interface CrossPageEavReportProps {
  issues: CrossPageEavIssue[];
}

const SEVERITY_COLORS: Record<string, { badge: string; border: string }> = {
  critical: { badge: 'bg-red-900/30 text-red-400', border: 'border-red-800/50' },
  high: { badge: 'bg-orange-900/30 text-orange-400', border: 'border-orange-800/50' },
  medium: { badge: 'bg-yellow-900/30 text-yellow-400', border: 'border-yellow-800/50' },
  low: { badge: 'bg-blue-900/30 text-blue-400', border: 'border-blue-800/50' },
};

export const CrossPageEavReport: React.FC<CrossPageEavReportProps> = ({ issues }) => {
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  // Group issues by entity
  const groupedByEntity = useMemo(() => {
    const groups = new Map<string, CrossPageEavIssue[]>();
    for (const issue of issues) {
      const entity = issue.affectedEntity;
      if (!groups.has(entity)) {
        groups.set(entity, []);
      }
      groups.get(entity)!.push(issue);
    }
    return groups;
  }, [issues]);

  if (issues.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4" data-testid="cross-page-eav-report">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Cross-Page EAV Consistency</h3>
        <p className="text-sm text-green-400" data-testid="no-issues">No cross-page EAV issues found.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-4" data-testid="cross-page-eav-report">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Cross-Page EAV Consistency</h3>
        <span
          className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300 font-medium"
          data-testid="issue-count"
        >
          {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
        </span>
      </div>

      {/* Issues grouped by entity */}
      {Array.from(groupedByEntity.entries()).map(([entity, entityIssues]) => (
        <div key={entity} className="space-y-2" data-testid="entity-group">
          <h4 className="text-xs font-medium text-orange-400 uppercase tracking-wide" data-testid="entity-name">
            {entity}
          </h4>

          {entityIssues.map((issue, idx) => {
            const issueKey = `${issue.ruleId}-${entity}-${issue.affectedAttribute}-${idx}`;
            const isExpanded = expandedIssueId === issueKey;
            const colors = SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.low;

            return (
              <div
                key={issueKey}
                className={`border ${colors.border} rounded-lg overflow-hidden`}
                data-testid="eav-issue-card"
              >
                {/* Collapsed header */}
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-800/50 transition-colors"
                  onClick={() => setExpandedIssueId(isExpanded ? null : issueKey)}
                  data-testid="issue-toggle"
                >
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-medium ${colors.badge}`}
                    data-testid="severity-badge"
                  >
                    {issue.severity}
                  </span>
                  <span className="text-sm text-gray-300 flex-1">
                    <span className="font-medium text-gray-200" data-testid="attribute-name">{issue.affectedAttribute}</span>
                    <span className="text-gray-500 mx-1">-</span>
                    <span className="text-gray-400">{issue.title}</span>
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-gray-700/50">
                    {/* Description */}
                    <p className="text-xs text-gray-400 mt-2">{issue.description}</p>

                    {/* Conflicting values */}
                    {issue.conflictingValues && issue.conflictingValues.length > 0 && (
                      <div data-testid="conflicting-values">
                        <span className="text-xs text-gray-500 block mb-1">Conflicting values:</span>
                        <div className="flex flex-wrap gap-2">
                          {issue.conflictingValues.map((val, vidx) => (
                            <span
                              key={vidx}
                              className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-200 font-mono"
                              data-testid="conflicting-value"
                            >
                              {val}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Affected pages */}
                    <div data-testid="affected-pages">
                      <span className="text-xs text-gray-500 block mb-1">Affected pages:</span>
                      <ul className="space-y-0.5">
                        {issue.affectedPages.map((page, pidx) => (
                          <li key={pidx} className="text-xs text-gray-400 font-mono" data-testid="affected-page">
                            {page}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Example fix */}
                    {issue.exampleFix && (
                      <div className="bg-gray-900/50 rounded p-2" data-testid="example-fix">
                        <span className="text-xs text-gray-500 block mb-1">Suggested fix:</span>
                        <p className="text-xs text-gray-300">{issue.exampleFix}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default CrossPageEavReport;
