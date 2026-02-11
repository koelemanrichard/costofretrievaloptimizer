// components/AuditIssueCard.tsx
// Individual audit issue display card with fix capability

import React, { useState } from 'react';
import { UnifiedAuditIssue, AuditFix, AuditSeverity } from '../types';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';
import { SEVERITY_COLORS } from '../config/auditRules';

interface AuditIssueCardProps {
  issue: UnifiedAuditIssue;
  onApplyFix: (issue: UnifiedAuditIssue, fix?: AuditFix) => Promise<void>;
  isApplying: boolean;
}

const getSeverityIcon = (severity: AuditSeverity): string => {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'warning':
      return '🟡';
    case 'suggestion':
      return '🔵';
    default:
      return '⚪';
  }
};

const getSeverityLabel = (severity: AuditSeverity): string => {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'warning':
      return 'Warning';
    case 'suggestion':
      return 'Suggestion';
    default:
      return 'Unknown';
  }
};

const getSeverityStyles = (severity: AuditSeverity): string => {
  const colors = SEVERITY_COLORS[severity];
  return `${colors.bg} ${colors.text} ${colors.border}`;
};

const getFixTypeLabel = (fixType?: 'auto' | 'ai-assisted' | 'manual'): string => {
  switch (fixType) {
    case 'auto':
      return 'Auto Fix';
    case 'ai-assisted':
      return 'AI Assisted';
    case 'manual':
      return 'Manual Fix';
    default:
      return '';
  }
};

const getFixButtonText = (fixType?: 'auto' | 'ai-assisted' | 'manual'): string => {
  switch (fixType) {
    case 'auto':
      return 'Auto Fix';
    case 'ai-assisted':
      return 'AI Fix';
    case 'manual':
    default:
      return 'Dismiss';
  }
};

const AuditIssueCard: React.FC<AuditIssueCardProps> = ({
  issue,
  onApplyFix,
  isApplying,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const handleApplyFix = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFixing(true);
    try {
      await onApplyFix(issue);
    } finally {
      setIsFixing(false);
    }
  };

  const hasAffectedItems = issue.affectedItems && issue.affectedItems.length > 0;
  const severityStyles = getSeverityStyles(issue.severity);

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all duration-200 ${severityStyles}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-lg flex-shrink-0">{getSeverityIcon(issue.severity)}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-white truncate">{issue.ruleName}</h4>
              <span className={`px-2 py-0.5 text-xs rounded-full ${severityStyles}`}>
                {getSeverityLabel(issue.severity)}
              </span>
              {issue.autoFixable && (
                <span className="px-2 py-0.5 text-xs bg-green-900/30 text-green-300 rounded-full">
                  {getFixTypeLabel(issue.fixType)}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{issue.message}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {issue.autoFixable && (
            <Button
              onClick={handleApplyFix}
              disabled={isApplying || isFixing}
              className={`text-xs px-3 py-1.5 ${
                issue.fixType === 'auto'
                  ? 'bg-green-600 hover:bg-green-500'
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
            >
              {isFixing ? <Loader className="w-3 h-3" /> : getFixButtonText(issue.fixType)}
            </Button>
          )}
          <button
            className="text-gray-400 hover:text-white transition-colors"
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            aria-expanded={isExpanded}
            onClick={e => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-700/50">
          <div className="space-y-3 pt-3">
            {/* Details */}
            {issue.details && (
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider mb-1">Details</h5>
                <p className="text-sm text-gray-300">{issue.details}</p>
              </div>
            )}

            {/* Affected Items */}
            {hasAffectedItems && (
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  Affected Items ({issue.affectedItems!.length})
                </h5>
                <div className="max-h-32 overflow-y-auto">
                  <ul className="text-sm text-gray-300 space-y-1">
                    {issue.affectedItems!.slice(0, 10).map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full flex-shrink-0" />
                        <span className="truncate">{item}</span>
                      </li>
                    ))}
                    {issue.affectedItems!.length > 10 && (
                      <li className="text-gray-500 italic">
                        ...and {issue.affectedItems!.length - 10} more
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Suggested Fix */}
            {issue.suggestedFix && (
              <div>
                <h5 className="text-xs text-gray-500 uppercase tracking-wider mb-1">Suggested Fix</h5>
                <p className="text-sm text-green-300 bg-green-900/20 rounded-md p-2">
                  {issue.suggestedFix}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-gray-500 pt-2">
              <span>Category: {issue.category}</span>
              <span>Rule: {issue.ruleId}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(AuditIssueCard);
