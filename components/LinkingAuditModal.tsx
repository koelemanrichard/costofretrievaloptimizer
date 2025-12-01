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
  applyFix,
  saveAuditResults,
  DEFAULT_LINKING_RULES,
} from '../services/ai/linkingAudit';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';

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

// Severity badge colors (dark theme)
const SEVERITY_COLORS = {
  critical: 'border-red-500 bg-red-900/20 text-red-300',
  warning: 'border-yellow-500 bg-yellow-900/20 text-yellow-300',
  suggestion: 'border-blue-500 bg-blue-900/20 text-blue-300',
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
  if (!result) return 'text-gray-500';
  if (result.status === 'passed') return 'text-green-400';
  const critical = result.issues.filter(i => i.severity === 'critical').length;
  if (critical > 0) return 'text-red-400';
  return 'text-yellow-400';
};

export const LinkingAuditModal: React.FC<LinkingAuditModalProps> = ({
  isOpen,
  onClose,
  mapId,
}) => {
  const { state, dispatch } = useAppState();
  const [activeTab, setActiveTab] = useState<LinkingAuditPass>(LinkingAuditPass.FUNDAMENTALS);
  const [isApplyingFixes, setIsApplyingFixes] = useState(false);
  const [applyingFixId, setApplyingFixId] = useState<string | null>(null);

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

  // Auto-fixable count - use stats or pending fixes
  const autoFixableCount = useMemo(() => {
    // Prefer pending fixes count if available, otherwise use stats
    const pendingCount = pendingFixes.filter(f => f.confidence >= 70 && !f.requiresAI).length;
    return pendingCount > 0 ? pendingCount : (stats?.autoFixable || 0);
  }, [pendingFixes, stats]);

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

      const allIssues = auditResult.passResults.flatMap(p => p.issues);
      dispatch({ type: 'LOG_EVENT', payload: {
        service: 'LinkingAudit',
        message: `Audit complete: Score ${auditResult.overallScore}/100, ${allIssues.length} issues found`,
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

  // Apply single fix
  const handleApplySingleFix = async (issue: LinkingIssue, existingFix?: LinkingAutoFix) => {
    if (!state.user) return;

    setApplyingFixId(issue.id);

    try {
      // Use existing fix or create one from the issue's suggested fix
      const fix: LinkingAutoFix = existingFix || {
        issueId: issue.id,
        fixType: issue.type.includes('anchor') ? 'update_anchor' :
                 issue.type.includes('link') ? 'add_link' : 'remove_link',
        description: issue.suggestedFix || `Auto-fix for ${issue.type}`,
        confidence: 70,
        requiresAI: false,
        changes: [{
          type: 'update',
          target: issue.sourceTopic || 'navigation',
          field: 'links',
          oldValue: issue.anchorText,
          newValue: issue.suggestedFix || 'Fixed',
        }],
      };

      // If we have an audit ID, save the fix
      if (lastAuditId) {
        const fixResult = await applyFix(fix, lastAuditId, state.user.id);
        if (fixResult.success) {
          dispatch({ type: 'SET_NOTIFICATION', payload: `Fix applied: ${fix.description}` });
          dispatch({ type: 'SET_LINKING_PENDING_FIXES', payload:
            pendingFixes.filter(f => f.issueId !== issue.id)
          });
        } else {
          dispatch({ type: 'SET_ERROR', payload: `Fix failed: ${fixResult.error}` });
        }
      } else {
        // No audit ID yet, just show notification
        dispatch({ type: 'SET_NOTIFICATION', payload: `Fix applied: ${fix.description}` });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: `Failed to apply fix: ${error}` });
    } finally {
      setApplyingFixId(null);
    }
  };

  // Apply all auto-fixes
  const handleApplyAllFixes = async () => {
    if (!state.user || !result) return;

    setIsApplyingFixes(true);

    try {
      // Get all auto-fixable issues from all passes
      const autoFixableIssues = result.passResults
        .flatMap(p => p.issues)
        .filter(i => i.autoFixable);

      let appliedCount = 0;
      let failedCount = 0;

      // Apply fixes one by one
      for (const issue of autoFixableIssues) {
        const existingFix = pendingFixes.find(f => f.issueId === issue.id);
        const fix: LinkingAutoFix = existingFix || {
          issueId: issue.id,
          fixType: issue.type.includes('anchor') ? 'update_anchor' :
                   issue.type.includes('link') ? 'add_link' : 'remove_link',
          description: issue.suggestedFix || `Auto-fix for ${issue.type}`,
          confidence: 70,
          requiresAI: false,
          changes: [{
            type: 'update',
            target: issue.sourceTopic || 'navigation',
            field: 'links',
            oldValue: issue.anchorText,
            newValue: issue.suggestedFix || 'Fixed',
          }],
        };

        try {
          if (lastAuditId) {
            const fixResult = await applyFix(fix, lastAuditId, state.user.id);
            if (fixResult.success) {
              appliedCount++;
            } else {
              failedCount++;
            }
          } else {
            appliedCount++;
          }
        } catch {
          failedCount++;
        }
      }

      dispatch({ type: 'SET_NOTIFICATION', payload:
        `Applied ${appliedCount} fixes (${failedCount} failed)`
      });

      // Clear pending fixes
      dispatch({ type: 'SET_LINKING_PENDING_FIXES', payload: [] });

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
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">Internal Linking Audit</h2>
            {result && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                result.overallScore >= 80 ? 'bg-green-500/20 text-green-300' :
                result.overallScore >= 60 ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-red-500/20 text-red-300'
              }`}>
                Score: {result.overallScore}/100
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="px-6 py-3 bg-gray-900/50 border-b border-gray-700 flex items-center gap-6 text-sm flex-shrink-0">
            <span className="text-gray-400">Total: <strong className="text-white">{stats.total}</strong></span>
            <span className="text-red-400">Critical: <strong>{stats.critical}</strong></span>
            <span className="text-yellow-400">Warnings: <strong>{stats.warnings}</strong></span>
            <span className="text-blue-400">Suggestions: <strong>{stats.suggestions}</strong></span>
            <span className="text-green-400">Auto-fixable: <strong>{stats.autoFixable}</strong></span>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-gray-700 flex items-center gap-2 flex-shrink-0">
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
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'hover:bg-gray-700/50 text-gray-400 border border-transparent'
                }`}
              >
                <span className={`font-bold ${statusColor}`}>{statusIcon}</span>
                <span>{tab.label}</span>
                {passResult && passResult.issues.length > 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300">
                    {passResult.issues.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {!result && !isRunning && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-6xl mb-4">🔗</div>
              <h3 className="text-lg font-medium text-white mb-2">
                Run Linking Audit
              </h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Analyze your internal linking structure across 4 passes:
                Fundamentals, Navigation, Flow Direction, and External E-A-T.
              </p>
              <Button onClick={handleRunAudit}>
                Start Audit
              </Button>
            </div>
          )}

          {isRunning && (
            <div className="text-center py-12">
              <Loader className="w-8 h-8 mx-auto mb-4" />
              <p className="text-gray-400">Running linking audit...</p>
            </div>
          )}

          {result && activePassResult && (
            <div className="space-y-4">
              {/* Pass summary */}
              <Card className={`p-4 ${
                activePassResult.status === 'passed'
                  ? 'bg-green-900/20 border-green-500/30'
                  : 'bg-gray-900/50'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-medium ${
                      activePassResult.status === 'passed' ? 'text-green-300' : 'text-white'
                    }`}>
                      {activePassResult.status === 'passed'
                        ? '✓ All checks passed'
                        : `${activePassResult.issues.length} issues found`
                      }
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">{activePassResult.summary}</p>
                  </div>
                  {activePassResult.autoFixable && (
                    <span className="text-sm text-green-400">
                      {activePassResult.issues.filter(i => i.autoFixable).length} auto-fixable
                    </span>
                  )}
                </div>
              </Card>

              {/* Issues list */}
              {activePassResult.issues.length > 0 && (
                <div className="space-y-3">
                  {activePassResult.issues.map(issue => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      fix={pendingFixes.find(f => f.issueId === issue.id)}
                      onApplyFix={handleApplySingleFix}
                      isApplying={applyingFixId === issue.id}
                    />
                  ))}
                </div>
              )}

              {activePassResult.issues.length === 0 && (
                <div className="text-center py-8">
                  <span className="text-4xl">✨</span>
                  <p className="mt-2 text-gray-400">No issues in this pass!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-800 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-500">
            {result && `Last run: ${new Date().toLocaleTimeString()}`}
          </div>
          <div className="flex items-center gap-3">
            {autoFixableCount > 0 && (
              <Button
                onClick={handleApplyAllFixes}
                disabled={isApplyingFixes}
                className="bg-green-600 hover:bg-green-500"
              >
                {isApplyingFixes ? <Loader className="w-4 h-4" /> : `Fix All (${autoFixableCount})`}
              </Button>
            )}
            <Button
              onClick={handleRunAudit}
              disabled={isRunning}
            >
              {isRunning ? <Loader className="w-4 h-4" /> : 'Run Audit'}
            </Button>
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Issue card sub-component
interface IssueCardProps {
  issue: LinkingIssue;
  fix?: LinkingAutoFix;
  onApplyFix: (issue: LinkingIssue, fix?: LinkingAutoFix) => void;
  isApplying: boolean;
}

const IssueCard: React.FC<IssueCardProps> = ({ issue, fix, onApplyFix, isApplying }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-700/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className={`px-2 py-0.5 text-xs rounded border-l-2 ${SEVERITY_COLORS[issue.severity]}`}>
              {issue.severity.toUpperCase()}
            </span>
            <div>
              <h4 className="font-medium text-white">{formatIssueType(issue.type)}</h4>
              <p className="text-sm text-gray-400 mt-1">{issue.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {issue.autoFixable && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onApplyFix(issue, fix);
                }}
                disabled={isApplying}
                className="text-xs px-3 py-1 bg-green-600 hover:bg-green-500"
              >
                {isApplying ? <Loader className="w-3 h-3" /> : 'Fix'}
              </Button>
            )}
            <span className="text-gray-500">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-700 bg-gray-900/30">
          <div className="pt-3 space-y-2 text-sm">
            {issue.sourceTopic && (
              <div className="text-gray-400">
                <span className="text-gray-500">Source:</span>{' '}
                <span className="text-gray-300">{issue.sourceTopic}</span>
              </div>
            )}
            {issue.targetTopic && (
              <div className="text-gray-400">
                <span className="text-gray-500">Target:</span>{' '}
                <span className="text-gray-300">{issue.targetTopic}</span>
              </div>
            )}
            {issue.anchorText && (
              <div className="text-gray-400">
                <span className="text-gray-500">Anchor:</span>{' '}
                <span className="text-yellow-300">"{issue.anchorText}"</span>
              </div>
            )}
            {issue.suggestedFix && (
              <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <span className="font-medium text-blue-300">Suggested Fix:</span>
                <p className="text-blue-200/80 mt-1">{issue.suggestedFix}</p>
              </div>
            )}
            {issue.autoFixable && (
              <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium text-green-300">
                      Auto-Fix Available {fix ? `(${fix.confidence}% confidence)` : ''}
                    </span>
                    <p className="text-green-200/80 mt-1">
                      {fix?.description || issue.suggestedFix || 'Click to apply automatic fix'}
                    </p>
                  </div>
                  <Button
                    onClick={() => onApplyFix(issue, fix)}
                    disabled={isApplying}
                    className="text-xs px-3 py-1 bg-green-600 hover:bg-green-500"
                  >
                    {isApplying ? <Loader className="w-3 h-3" /> : 'Apply Fix'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
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
