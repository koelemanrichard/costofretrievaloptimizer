// components/LinkingAuditModal.tsx
// Multi-pass Internal Linking Audit Modal with tabbed UI

import React, { useState, useMemo } from 'react';
import {
  LinkingAuditResult,
  LinkingPassResult,
  LinkingIssue,
  LinkingAuditPass,
  LinkingAutoFix,
  LinkingAuditContext,
} from '../types';
import { useAppState } from '../state/appState';
import {
  runLinkingAudit,
  generateAllFixes,
  applyFixes,
  saveAuditResults,
  DEFAULT_LINKING_RULES,
} from '../services/ai/linkingAudit';

interface LinkingAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapId: string;
}

// Pass tab configuration
const PASS_TABS = [
  { id: LinkingAuditPass.FUNDAMENTALS, label: 'Fundamentals', icon: '1' },
  { id: LinkingAuditPass.NAVIGATION, label: 'Navigation', icon: '2' },
  { id: LinkingAuditPass.FLOW_DIRECTION, label: 'Flow', icon: '3' },
  { id: LinkingAuditPass.EXTERNAL, label: 'External', icon: '4' },
] as const;

// Severity badge colors
const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  suggestion: 'bg-blue-100 text-blue-800 border-blue-200',
} as const;

// Pass status icons
const getPassStatusIcon = (result: LinkingPassResult | undefined): string => {
  if (!result) return '○';
  if (result.status === 'passed') return '✓';
  const critical = result.issues.filter(i => i.severity === 'critical').length;
  if (critical > 0) return '✗';
  return '⚠';
};

const getPassStatusColor = (result: LinkingPassResult | undefined): string => {
  if (!result) return 'text-gray-400';
  if (result.status === 'passed') return 'text-green-600';
  const critical = result.issues.filter(i => i.severity === 'critical').length;
  if (critical > 0) return 'text-red-600';
  return 'text-yellow-600';
};

export const LinkingAuditModal: React.FC<LinkingAuditModalProps> = ({
  isOpen,
  onClose,
  mapId,
}) => {
  const { state, dispatch } = useAppState();
  const [activeTab, setActiveTab] = useState<LinkingAuditPass>(LinkingAuditPass.FUNDAMENTALS);
  const [isApplyingFixes, setIsApplyingFixes] = useState(false);

  const { result, isRunning, pendingFixes, lastAuditId } = state.linkingAudit;

  // Get current map data
  const currentMap = state.topicalMaps.find(m => m.id === mapId);
  const topics = currentMap?.topics || [];
  const briefs = currentMap?.briefs || {};
  const pillars = currentMap?.pillars;

  // Get active pass result
  const activePassResult = useMemo(() => {
    return result?.passResults.find(p => p.pass === activeTab);
  }, [result, activeTab]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!result) return null;

    const allIssues = result.passResults.flatMap(p => p.issues);
    return {
      total: allIssues.length,
      critical: allIssues.filter(i => i.severity === 'critical').length,
      warnings: allIssues.filter(i => i.severity === 'warning').length,
      suggestions: allIssues.filter(i => i.severity === 'suggestion').length,
      autoFixable: allIssues.filter(i => i.autoFixable).length,
    };
  }, [result]);

  // Run audit
  const handleRunAudit = async () => {
    if (!currentMap || !pillars) return;

    dispatch({ type: 'SET_LINKING_AUDIT_RUNNING', payload: true });
    dispatch({ type: 'SET_LINKING_AUDIT_RESULT', payload: null });

    try {
      const ctx: LinkingAuditContext = {
        mapId,
        topics,
        briefs,
        foundationPages: state.websiteStructure.foundationPages,
        navigation: state.websiteStructure.navigation,
        pillars,
        rules: DEFAULT_LINKING_RULES,
      };

      const auditResult = runLinkingAudit(ctx);
      dispatch({ type: 'SET_LINKING_AUDIT_RESULT', payload: auditResult });

      // Generate fixes
      const fixes = generateAllFixes(auditResult, ctx);
      dispatch({ type: 'SET_LINKING_PENDING_FIXES', payload: fixes });

      // Save to database
      if (state.user) {
        const saveResult = await saveAuditResults(auditResult, state.user.id, DEFAULT_LINKING_RULES);
        if (saveResult.success && saveResult.auditId) {
          dispatch({ type: 'SET_LINKING_LAST_AUDIT_ID', payload: saveResult.auditId });
        }
      }

      dispatch({ type: 'LOG_EVENT', payload: {
        service: 'LinkingAudit',
        message: `Audit complete: Score ${auditResult.overallScore}/100, ${stats?.total || 0} issues found`,
        status: 'success',
        timestamp: Date.now(),
      }});

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: `Audit failed: ${error}` });
      dispatch({ type: 'LOG_EVENT', payload: {
        service: 'LinkingAudit',
        message: `Audit failed: ${error}`,
        status: 'failure',
        timestamp: Date.now(),
      }});
    } finally {
      dispatch({ type: 'SET_LINKING_AUDIT_RUNNING', payload: false });
    }
  };

  // Apply all auto-fixes
  const handleApplyAllFixes = async () => {
    if (!state.user || !lastAuditId || pendingFixes.length === 0) return;

    setIsApplyingFixes(true);

    try {
      const highConfidenceFixes = pendingFixes.filter(f => f.confidence >= 70 && !f.requiresAI);
      const fixResult = await applyFixes(highConfidenceFixes, lastAuditId, state.user.id);

      dispatch({ type: 'SET_NOTIFICATION', payload:
        `Applied ${fixResult.applied} fixes (${fixResult.failed} failed)`
      });

      // Clear applied fixes from pending
      const appliedIds = new Set(fixResult.results.filter(r => r.success).map(r => r.fix.issueId));
      dispatch({ type: 'SET_LINKING_PENDING_FIXES', payload:
        pendingFixes.filter(f => !appliedIds.has(f.issueId))
      });

      // Re-run audit to see updated results
      handleRunAudit();

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: `Failed to apply fixes: ${error}` });
    } finally {
      setIsApplyingFixes(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Internal Linking Audit</h2>
            {result && (
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                result.overallScore >= 80 ? 'bg-green-100 text-green-800' :
                result.overallScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                Score: {result.overallScore}/100
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="px-6 py-3 bg-gray-50 border-b flex items-center gap-6 text-sm">
            <span className="text-gray-600">Total Issues: <strong>{stats.total}</strong></span>
            <span className="text-red-600">Critical: <strong>{stats.critical}</strong></span>
            <span className="text-yellow-600">Warnings: <strong>{stats.warnings}</strong></span>
            <span className="text-blue-600">Suggestions: <strong>{stats.suggestions}</strong></span>
            <span className="text-green-600">Auto-fixable: <strong>{stats.autoFixable}</strong></span>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 py-2 border-b flex items-center gap-2">
          {PASS_TABS.map(tab => {
            const passResult = result?.passResults.find(p => p.pass === tab.id);
            const statusIcon = getPassStatusIcon(passResult);
            const statusColor = getPassStatusColor(passResult);
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  isActive
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <span className={`font-bold ${statusColor}`}>{statusIcon}</span>
                <span>{tab.label}</span>
                {passResult && passResult.issues.length > 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200">
                    {passResult.issues.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
          {!result && !isRunning && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔗</div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                Run Linking Audit
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Analyze your internal linking structure across 4 passes:
                Fundamentals, Navigation, Flow Direction, and External E-A-T.
              </p>
              <button
                onClick={handleRunAudit}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Start Audit
              </button>
            </div>
          )}

          {isRunning && (
            <div className="text-center py-12">
              <div className="animate-spin text-4xl mb-4">⚙️</div>
              <p className="text-gray-600">Running linking audit...</p>
            </div>
          )}

          {result && activePassResult && (
            <div className="space-y-4">
              {/* Pass summary */}
              <div className={`p-4 rounded-lg border ${
                activePassResult.status === 'passed'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      {activePassResult.status === 'passed'
                        ? '✓ All checks passed'
                        : `${activePassResult.issues.length} issues found`
                      }
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{activePassResult.summary}</p>
                  </div>
                  {activePassResult.autoFixable && (
                    <span className="text-sm text-green-600">
                      {activePassResult.issues.filter(i => i.autoFixable).length} auto-fixable
                    </span>
                  )}
                </div>
              </div>

              {/* Issues list */}
              {activePassResult.issues.length > 0 && (
                <div className="space-y-3">
                  {activePassResult.issues.map(issue => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      fix={pendingFixes.find(f => f.issueId === issue.id)}
                    />
                  ))}
                </div>
              )}

              {activePassResult.issues.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl">✨</span>
                  <p className="mt-2">No issues in this pass!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {result && `Last run: ${new Date().toLocaleTimeString()}`}
          </div>
          <div className="flex items-center gap-3">
            {pendingFixes.length > 0 && (
              <button
                onClick={handleApplyAllFixes}
                disabled={isApplyingFixes}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isApplyingFixes ? 'Applying...' : `Fix All (${pendingFixes.filter(f => f.confidence >= 70 && !f.requiresAI).length})`}
              </button>
            )}
            <button
              onClick={handleRunAudit}
              disabled={isRunning}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isRunning ? 'Running...' : 'Run Again'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Issue card sub-component
interface IssueCardProps {
  issue: LinkingIssue;
  fix?: LinkingAutoFix;
}

const IssueCard: React.FC<IssueCardProps> = ({ issue, fix }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className={`px-2 py-0.5 text-xs rounded border ${SEVERITY_COLORS[issue.severity]}`}>
              {issue.severity}
            </span>
            <div>
              <h4 className="font-medium text-gray-900">{formatIssueType(issue.type)}</h4>
              <p className="text-sm text-gray-600 mt-1">{issue.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {issue.autoFixable && (
              <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">
                Auto-fix
              </span>
            )}
            <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t bg-gray-50">
          <div className="pt-3 space-y-2 text-sm">
            {issue.sourceTopic && (
              <div><span className="text-gray-500">Source:</span> {issue.sourceTopic}</div>
            )}
            {issue.targetTopic && (
              <div><span className="text-gray-500">Target:</span> {issue.targetTopic}</div>
            )}
            {issue.anchorText && (
              <div><span className="text-gray-500">Anchor:</span> "{issue.anchorText}"</div>
            )}
            {issue.suggestedFix && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-blue-800">Suggested Fix:</span>
                <p className="text-blue-700 mt-1">{issue.suggestedFix}</p>
              </div>
            )}
            {fix && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <span className="font-medium text-green-800">Auto-Fix Available ({fix.confidence}% confidence)</span>
                <p className="text-green-700 mt-1">{fix.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to format issue type for display
const formatIssueType = (type: string): string => {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default LinkingAuditModal;
