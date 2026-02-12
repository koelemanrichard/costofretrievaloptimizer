// components/drafting/AuditIssuesPanel.tsx
import React, { useState, useCallback } from 'react';
import { AuditIssue, ContentBrief, BusinessInfo } from '../../types';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { generateAutoFix, applyAutoFix, batchApplyAutoFixes, AutoFixContext } from '../../services/ai/contentGeneration/passes/auditChecks';

interface AuditIssuesPanelProps {
  issues: AuditIssue[];
  draft: string;
  brief: ContentBrief;
  businessInfo: BusinessInfo;
  onApplyFix: (updatedDraft: string, issueId: string) => void;
  onDismiss: (issueId: string) => void;
}

const SeverityBadge: React.FC<{ severity: 'critical' | 'warning' | 'suggestion' }> = ({ severity }) => {
  const colors = {
    critical: 'bg-red-900/60 text-red-300 border-red-700',
    warning: 'bg-amber-900/60 text-amber-300 border-amber-700',
    suggestion: 'bg-blue-900/60 text-blue-300 border-blue-700'
  };

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border ${colors[severity]}`}>
      {severity}
    </span>
  );
};

const IssueCard: React.FC<{
  issue: AuditIssue;
  draft: string;
  brief: ContentBrief;
  businessInfo: BusinessInfo;
  onApply: (updatedDraft: string) => void;
  onDismiss: () => void;
}> = ({ issue, draft, brief, businessInfo, onApply, onDismiss }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFix, setGeneratedFix] = useState<string | null>(issue.suggestedFix || null);
  const [isApplying, setIsApplying] = useState(false);

  const handleGenerateFix = useCallback(async () => {
    setIsGenerating(true);
    try {
      const ctx: AutoFixContext = { draft, brief, businessInfo, issue };
      const fix = await generateAutoFix(ctx);
      setGeneratedFix(fix);
      setShowPreview(true);
    } catch (error) {
      console.error('[AuditPanel] Failed to generate fix:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [draft, brief, businessInfo, issue]);

  const handleApplyFix = useCallback(() => {
    if (!generatedFix) return;
    setIsApplying(true);
    try {
      const result = applyAutoFix(draft, issue, generatedFix);
      if (result.success) {
        onApply(result.updatedDraft);
      } else {
        console.warn('[AuditPanel] Fix application failed:', result.message);
      }
    } catch (error) {
      console.error('[AuditPanel] Failed to apply fix:', error);
    } finally {
      setIsApplying(false);
    }
  }, [draft, issue, generatedFix, onApply]);

  if (issue.fixApplied) {
    return (
      <div className="p-3 bg-green-900/20 border border-green-800/50 rounded-lg opacity-60">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-green-300">Fixed: {issue.type.replace(/_/g, ' ')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg border ${
      issue.severity === 'critical' ? 'bg-red-900/20 border-red-800/50' :
      issue.severity === 'warning' ? 'bg-amber-900/20 border-amber-800/50' :
      'bg-blue-900/20 border-blue-800/50'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={issue.severity} />
          <span className="text-xs text-gray-400 font-mono">{issue.type}</span>
        </div>
      </div>

      <p className="text-sm text-gray-200 mb-2">{issue.description}</p>

      {issue.currentContent && (
        <div className="text-xs bg-gray-900/50 p-2 rounded mb-2 text-gray-400 font-mono max-h-20 overflow-hidden">
          <span className="text-red-400">Affected: </span>
          {issue.currentContent.substring(0, 100)}{issue.currentContent.length > 100 && '...'}
        </div>
      )}

      {showPreview && generatedFix && (
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-1">Suggested Fix:</div>
          <div className="text-xs bg-green-900/30 p-2 rounded text-green-200 font-mono max-h-32 overflow-y-auto">
            {generatedFix}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!generatedFix && issue.autoFixable && (
          <Button
            onClick={handleGenerateFix}
            disabled={isGenerating}
            className="text-xs py-1 px-2 bg-teal-700 hover:bg-teal-600"
            variant="secondary"
          >
            {isGenerating ? <Loader className="w-3 h-3" /> : 'Generate Fix'}
          </Button>
        )}

        {generatedFix && !showPreview && (
          <Button
            onClick={() => setShowPreview(true)}
            className="text-xs py-1 px-2"
            variant="secondary"
          >
            Preview Fix
          </Button>
        )}

        {generatedFix && showPreview && (
          <>
            <Button
              onClick={handleApplyFix}
              disabled={isApplying}
              className="text-xs py-1 px-2 bg-green-700 hover:bg-green-600"
              variant="secondary"
            >
              {isApplying ? <Loader className="w-3 h-3" /> : 'Apply Fix'}
            </Button>
            <Button
              onClick={() => setShowPreview(false)}
              className="text-xs py-1 px-2"
              variant="secondary"
            >
              Hide
            </Button>
          </>
        )}

        <Button
          onClick={onDismiss}
          className="text-xs py-1 px-2 text-gray-400 hover:text-white"
          variant="secondary"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
};

export const AuditIssuesPanel: React.FC<AuditIssuesPanelProps> = ({
  issues,
  draft,
  brief,
  businessInfo,
  onApplyFix,
  onDismiss
}) => {
  const [isApplyingAll, setIsApplyingAll] = useState(false);

  const handleFixAll = useCallback(async () => {
    const autoFixable = issues.filter(i => i.autoFixable && !i.fixApplied);
    if (autoFixable.length === 0) return;
    setIsApplyingAll(true);
    try {
      const result = await batchApplyAutoFixes(draft, autoFixable, brief, businessInfo);
      if (result.appliedFixes.length > 0) {
        onApplyFix(result.updatedDraft, 'batch');
      }
    } catch (error) {
      console.error('[AuditPanel] Batch fix failed:', error);
    } finally {
      setIsApplyingAll(false);
    }
  }, [issues, draft, brief, businessInfo, onApplyFix]);

  // Group issues by severity
  const criticalIssues = issues.filter(i => i.severity === 'critical' && !i.fixApplied);
  const warnings = issues.filter(i => i.severity === 'warning' && !i.fixApplied);
  const suggestions = issues.filter(i => i.severity === 'suggestion' && !i.fixApplied);
  const fixedIssues = issues.filter(i => i.fixApplied);

  const pendingCount = criticalIssues.length + warnings.length + suggestions.length;

  if (issues.length === 0) {
    return (
      <div className="p-4 bg-green-900/20 border border-green-700/50 rounded-lg text-center">
        <svg className="w-8 h-8 text-green-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-green-300 text-sm">All audit checks passed!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Audit Issues</h3>
          <div className="flex items-center gap-2">
            {criticalIssues.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-red-900/50 text-red-300">
                {criticalIssues.length} critical
              </span>
            )}
            {warnings.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-amber-900/50 text-amber-300">
                {warnings.length} warnings
              </span>
            )}
            {suggestions.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-900/50 text-blue-300">
                {suggestions.length} suggestions
              </span>
            )}
          </div>
        </div>
        {pendingCount > 1 && (
          <Button
            onClick={handleFixAll}
            disabled={isApplyingAll}
            className="text-xs py-1 px-3 bg-teal-700 hover:bg-teal-600"
            variant="secondary"
            title="Generate and apply fixes for all issues (in order of severity)"
          >
            {isApplyingAll ? <Loader className="w-3 h-3" /> : `Fix All (${pendingCount})`}
          </Button>
        )}
      </div>

      {/* Critical Issues */}
      {criticalIssues.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-300 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Critical Issues ({criticalIssues.length})
          </h4>
          {criticalIssues.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              draft={draft}
              brief={brief}
              businessInfo={businessInfo}
              onApply={(updatedDraft) => onApplyFix(updatedDraft, issue.id)}
              onDismiss={() => onDismiss(issue.id)}
            />
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-amber-300 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Warnings ({warnings.length})
          </h4>
          {warnings.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              draft={draft}
              brief={brief}
              businessInfo={businessInfo}
              onApply={(updatedDraft) => onApplyFix(updatedDraft, issue.id)}
              onDismiss={() => onDismiss(issue.id)}
            />
          ))}
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-blue-300 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Suggestions ({suggestions.length})
          </h4>
          {suggestions.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              draft={draft}
              brief={brief}
              businessInfo={businessInfo}
              onApply={(updatedDraft) => onApplyFix(updatedDraft, issue.id)}
              onDismiss={() => onDismiss(issue.id)}
            />
          ))}
        </div>
      )}

      {/* Fixed Issues */}
      {fixedIssues.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-green-300 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Fixed ({fixedIssues.length})
          </h4>
          {fixedIssues.map(issue => (
            <IssueCard
              key={issue.id}
              issue={issue}
              draft={draft}
              brief={brief}
              businessInfo={businessInfo}
              onApply={(updatedDraft) => onApplyFix(updatedDraft, issue.id)}
              onDismiss={() => onDismiss(issue.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditIssuesPanel;
