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
  SiteWideAuditResult,
  PageLinkAudit,
  FlowViolation,
} from '../types';
import { useAppState } from '../state/appState';
import {
  runLinkingAudit,
  generateAllFixes,
  applyFixes,
  applyFix,
  saveAuditResults,
  DEFAULT_LINKING_RULES,
  runSiteWideAudit,
} from '../services/ai/linkingAudit';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';

interface LinkingAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapId: string;
}

// Tab types - includes both pass tabs and site-wide tab
type AuditTabId = LinkingAuditPass | 'site_overview';

// Pass tab configuration
const PASS_TABS: { id: AuditTabId; label: string; icon: string }[] = [
  { id: LinkingAuditPass.FUNDAMENTALS, label: 'Fundamentals', icon: '1' },
  { id: LinkingAuditPass.NAVIGATION, label: 'Navigation', icon: '2' },
  { id: LinkingAuditPass.FLOW_DIRECTION, label: 'Flow', icon: '3' },
  { id: LinkingAuditPass.EXTERNAL, label: 'External', icon: '4' },
  { id: 'site_overview', label: 'Site Overview', icon: '◉' },
];

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
  const [activeTab, setActiveTab] = useState<AuditTabId>(LinkingAuditPass.FUNDAMENTALS);
  const [isApplyingFixes, setIsApplyingFixes] = useState(false);
  const [applyingFixId, setApplyingFixId] = useState<string | null>(null);
  const [siteWideResult, setSiteWideResult] = useState<SiteWideAuditResult | null>(null);

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

      // Run site-wide audit
      const siteAudit = runSiteWideAudit(ctx);
      setSiteWideResult(siteAudit);

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

  // Determine target table based on issue type
  const getTargetTable = (issueType: string): 'content_briefs' | 'topics' | 'navigation_structures' | 'foundation_pages' => {
    if (issueType.includes('nav') || issueType.includes('header') || issueType.includes('footer')) {
      return 'navigation_structures';
    }
    if (issueType.includes('foundation') || issueType.includes('eat')) {
      return 'foundation_pages';
    }
    if (issueType.includes('brief') || issueType.includes('anchor') || issueType.includes('link')) {
      return 'content_briefs';
    }
    return 'topics';
  };

  // Apply single fix
  const handleApplySingleFix = async (issue: LinkingIssue, existingFix?: LinkingAutoFix) => {
    if (!state.user) return;

    setApplyingFixId(issue.id);

    try {
      // If we have an existing fix, use it
      if (existingFix) {
        if (lastAuditId) {
          const fixResult = await applyFix(existingFix, lastAuditId, state.user.id);
          if (fixResult.success) {
            dispatch({ type: 'SET_NOTIFICATION', payload: `Fix applied: ${existingFix.description}` });
            dispatch({ type: 'SET_LINKING_PENDING_FIXES', payload:
              pendingFixes.filter(f => f.issueId !== issue.id)
            });
          } else {
            dispatch({ type: 'SET_ERROR', payload: `Fix failed: ${fixResult.error}` });
          }
        }
      } else {
        // No pre-generated fix - these are informational fixes
        // Mark as acknowledged and show the suggested action
        dispatch({ type: 'SET_NOTIFICATION', payload:
          `Acknowledged: ${issue.suggestedFix || issue.message}. Please apply this fix manually in your content.`
        });
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
      let acknowledgedCount = 0;
      let failedCount = 0;

      // Apply fixes one by one
      for (const issue of autoFixableIssues) {
        const existingFix = pendingFixes.find(f => f.issueId === issue.id);

        if (existingFix && lastAuditId) {
          // We have a pre-generated fix - apply it
          try {
            const fixResult = await applyFix(existingFix, lastAuditId, state.user.id);
            if (fixResult.success) {
              appliedCount++;
            } else {
              failedCount++;
            }
          } catch {
            failedCount++;
          }
        } else {
          // No pre-generated fix - count as acknowledged
          acknowledgedCount++;
        }
      }

      const message = appliedCount > 0
        ? `Applied ${appliedCount} fixes, acknowledged ${acknowledgedCount} issues`
        : `Acknowledged ${acknowledgedCount} issues - please review and apply manually`;

      dispatch({ type: 'SET_NOTIFICATION', payload: message });

      // Clear pending fixes
      dispatch({ type: 'SET_LINKING_PENDING_FIXES', payload: [] });

      // Re-run audit to see updated results
      if (appliedCount > 0) {
        handleRunAudit();
      }

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
        <div className="px-6 py-3 border-b border-gray-700 flex items-center gap-2 flex-shrink-0 overflow-x-auto">
          {PASS_TABS.map(tab => {
            const isSiteOverview = tab.id === 'site_overview';
            const passResult = !isSiteOverview ? result?.passResults.find(p => p.pass === tab.id) : undefined;

            // Special handling for site overview tab
            const statusIcon = isSiteOverview
              ? (siteWideResult ? (siteWideResult.overallScore >= 70 ? '✓' : '⚠') : '○')
              : getPassStatusIcon(passResult);
            const statusColor = isSiteOverview
              ? (siteWideResult ? (siteWideResult.overallScore >= 70 ? 'text-green-400' : 'text-yellow-400') : 'text-gray-500')
              : getPassStatusColor(passResult);
            const isActive = activeTab === tab.id;

            // Issue count for site overview = flow violations
            const issueCount = isSiteOverview
              ? siteWideResult?.flowAnalysis.flowViolations.length || 0
              : passResult?.issues.length || 0;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'hover:bg-gray-700/50 text-gray-400 border border-transparent'
                }`}
              >
                <span className={`font-bold ${statusColor}`}>{statusIcon}</span>
                <span>{tab.label}</span>
                {issueCount > 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300">
                    {issueCount}
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

          {/* Regular pass content */}
          {result && activeTab !== 'site_overview' && (() => {
            const activePassResult = result.passResults.find(p => p.pass === activeTab);
            if (!activePassResult) return null;
            return (
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
            );
          })()}

          {/* Site Overview content */}
          {activeTab === 'site_overview' && siteWideResult && (
            <SiteOverviewContent
              result={siteWideResult}
              topics={topics}
            />
          )}

          {activeTab === 'site_overview' && !siteWideResult && result && (
            <div className="text-center py-8">
              <Loader className="w-8 h-8 mx-auto mb-4" />
              <p className="text-gray-400">Loading site-wide analysis...</p>
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

// Site Overview content component
interface SiteOverviewContentProps {
  result: SiteWideAuditResult;
  topics: { id: string; title: string }[];
}

const SiteOverviewContent: React.FC<SiteOverviewContentProps> = ({ result, topics }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const getTopicTitle = (id: string) => {
    const topic = topics.find(t => t.id === id);
    return topic?.title || id;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-900/20 border-green-500/30';
    if (score >= 60) return 'bg-yellow-900/20 border-yellow-500/30';
    return 'bg-red-900/20 border-red-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card className={`p-4 ${getScoreBg(result.overallScore)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-medium ${getScoreColor(result.overallScore)}`}>
              Site-Wide Score: {result.overallScore}/100
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Combined analysis of link counts, PageRank flow, and N-gram consistency
            </p>
          </div>
          <div className="text-right text-sm">
            <div className="text-gray-400">Links: <span className={getScoreColor(result.linkAudit.overallScore)}>{result.linkAudit.overallScore}</span></div>
            <div className="text-gray-400">Flow: <span className={getScoreColor(result.flowAnalysis.flowScore)}>{result.flowAnalysis.flowScore}</span></div>
            <div className="text-gray-400">N-grams: <span className={getScoreColor(result.ngramAudit.overallConsistencyScore)}>{result.ngramAudit.overallConsistencyScore}</span></div>
          </div>
        </div>
      </Card>

      {/* Section 1: Link Count Analysis */}
      <Card className="overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'links' ? null : 'links')}
          className="w-full p-4 text-left hover:bg-gray-700/30 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h4 className="font-medium text-white">Link Count Analysis</h4>
              <p className="text-sm text-gray-400">
                {result.linkAudit.pagesOverLimit} pages over 150 link limit • Avg: {result.linkAudit.averageLinkCount.toFixed(0)} links/page
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded text-xs ${result.linkAudit.pagesOverLimit === 0 ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
              {result.linkAudit.pagesOverLimit === 0 ? 'PASS' : `${result.linkAudit.pagesOverLimit} OVER`}
            </span>
            <span className="text-gray-500">{expandedSection === 'links' ? '▲' : '▼'}</span>
          </div>
        </button>

        {expandedSection === 'links' && (
          <div className="px-4 pb-4 border-t border-gray-700 bg-gray-900/30">
            {/* Distribution bars */}
            <div className="pt-4 space-y-2">
              <h5 className="text-sm text-gray-400 mb-3">Link Distribution</h5>
              {result.linkAudit.linkDistribution.map(d => (
                <div key={d.range} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20">{d.range}</span>
                  <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden">
                    <div
                      className={`h-full ${d.range.includes('150+') ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${(d.count / result.linkAudit.pages.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8">{d.count}</span>
                </div>
              ))}
            </div>

            {/* Pages over limit */}
            {result.linkAudit.pagesOverLimit > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h5 className="text-sm text-red-400 mb-2">Pages Over Limit</h5>
                <div className="space-y-2">
                  {result.linkAudit.pages.filter(p => p.isOverLimit).slice(0, 5).map(page => (
                    <div key={page.pageId} className="flex items-center justify-between text-sm p-2 bg-red-900/20 rounded">
                      <span className="text-white truncate max-w-[60%]">{page.pageTitle}</span>
                      <span className="text-red-300">{page.linkCounts.total} links</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* High dilution risk */}
            {result.linkAudit.pages.some(p => p.dilutionRisk === 'high') && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h5 className="text-sm text-yellow-400 mb-2">High PageRank Dilution Risk</h5>
                <div className="space-y-2">
                  {result.linkAudit.pages.filter(p => p.dilutionRisk === 'high').slice(0, 5).map(page => (
                    <div key={page.pageId} className="flex items-center justify-between text-sm p-2 bg-yellow-900/20 rounded">
                      <span className="text-white truncate max-w-[60%]">{page.pageTitle}</span>
                      <div className="text-right">
                        <span className="text-yellow-300">{page.linkCounts.total} links</span>
                        {page.topTargets[0] && (
                          <span className="text-gray-500 text-xs ml-2">→ {page.topTargets[0].count}x same target</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Section 2: PageRank Flow Analysis */}
      <Card className="overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'flow' ? null : 'flow')}
          className="w-full p-4 text-left hover:bg-gray-700/30 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔀</span>
            <div>
              <h4 className="font-medium text-white">PageRank Flow Analysis</h4>
              <p className="text-sm text-gray-400">
                {result.flowAnalysis.flowViolations.length} flow violations • {(result.flowAnalysis.centralEntityReachability * 100).toFixed(0)}% CE reachability
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded text-xs ${result.flowAnalysis.flowViolations.length === 0 ? 'bg-green-900/30 text-green-300' : 'bg-yellow-900/30 text-yellow-300'}`}>
              {result.flowAnalysis.flowViolations.length === 0 ? 'OPTIMAL' : `${result.flowAnalysis.flowViolations.length} ISSUES`}
            </span>
            <span className="text-gray-500">{expandedSection === 'flow' ? '▲' : '▼'}</span>
          </div>
        </button>

        {expandedSection === 'flow' && (
          <div className="px-4 pb-4 border-t border-gray-700 bg-gray-900/30">
            {/* Flow metrics */}
            <div className="pt-4 grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-800/50 rounded">
                <div className={`text-2xl font-bold ${getScoreColor(result.flowAnalysis.flowScore)}`}>
                  {result.flowAnalysis.flowScore}
                </div>
                <div className="text-xs text-gray-400">Flow Score</div>
              </div>
              <div className="text-center p-3 bg-gray-800/50 rounded">
                <div className="text-2xl font-bold text-blue-400">
                  {(result.flowAnalysis.coreToAuthorRatio * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-400">Core → Author</div>
              </div>
              <div className="text-center p-3 bg-gray-800/50 rounded">
                <div className="text-2xl font-bold text-purple-400">
                  {result.flowAnalysis.hubPages.length}
                </div>
                <div className="text-xs text-gray-400">Hub Pages</div>
              </div>
            </div>

            {/* Orphaned pages */}
            {result.flowAnalysis.orphanedPages.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h5 className="text-sm text-red-400 mb-2">Orphaned Pages (No Incoming Links)</h5>
                <div className="flex flex-wrap gap-2">
                  {result.flowAnalysis.orphanedPages.slice(0, 10).map(pageId => (
                    <span key={pageId} className="px-2 py-1 bg-red-900/30 text-red-300 text-xs rounded">
                      {getTopicTitle(pageId)}
                    </span>
                  ))}
                  {result.flowAnalysis.orphanedPages.length > 10 && (
                    <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">
                      +{result.flowAnalysis.orphanedPages.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Flow violations */}
            {result.flowAnalysis.flowViolations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h5 className="text-sm text-yellow-400 mb-2">Flow Violations</h5>
                <div className="space-y-2">
                  {result.flowAnalysis.flowViolations.slice(0, 5).map((v, i) => (
                    <FlowViolationCard key={i} violation={v} />
                  ))}
                  {result.flowAnalysis.flowViolations.length > 5 && (
                    <div className="text-xs text-gray-500 text-center pt-2">
                      +{result.flowAnalysis.flowViolations.length - 5} more violations
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hub pages */}
            {result.flowAnalysis.hubPages.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h5 className="text-sm text-green-400 mb-2">Hub Pages (High Connectivity)</h5>
                <div className="flex flex-wrap gap-2">
                  {result.flowAnalysis.hubPages.slice(0, 10).map(pageId => (
                    <span key={pageId} className="px-2 py-1 bg-green-900/30 text-green-300 text-xs rounded">
                      {getTopicTitle(pageId)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Section 3: N-gram Consistency */}
      <Card className="overflow-hidden">
        <button
          onClick={() => setExpandedSection(expandedSection === 'ngrams' ? null : 'ngrams')}
          className="w-full p-4 text-left hover:bg-gray-700/30 transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <div>
              <h4 className="font-medium text-white">N-gram Consistency</h4>
              <p className="text-sm text-gray-400">
                Central Entity and Source Context presence across site
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded text-xs ${result.ngramAudit.overallConsistencyScore >= 80 ? 'bg-green-900/30 text-green-300' : 'bg-yellow-900/30 text-yellow-300'}`}>
              {result.ngramAudit.overallConsistencyScore}%
            </span>
            <span className="text-gray-500">{expandedSection === 'ngrams' ? '▲' : '▼'}</span>
          </div>
        </button>

        {expandedSection === 'ngrams' && (
          <div className="px-4 pb-4 border-t border-gray-700 bg-gray-900/30">
            {/* Central Entity presence */}
            <div className="pt-4">
              <h5 className="text-sm text-gray-400 mb-3">Central Entity: "{result.ngramAudit.centralEntityPresence.term}"</h5>
              <div className="grid grid-cols-4 gap-2">
                <PresenceIndicator label="Header" present={result.ngramAudit.centralEntityPresence.inHeader} />
                <PresenceIndicator label="Footer" present={result.ngramAudit.centralEntityPresence.inFooter} />
                <PresenceIndicator label="Homepage" present={result.ngramAudit.centralEntityPresence.inHomepage} />
                <PresenceIndicator
                  label="Pillars"
                  present={result.ngramAudit.centralEntityPresence.inPillarPages.length > 0}
                  count={result.ngramAudit.centralEntityPresence.inPillarPages.length}
                />
              </div>
              {result.ngramAudit.centralEntityPresence.missingFrom.length > 0 && (
                <div className="mt-2 text-xs text-red-400">
                  Missing from: {result.ngramAudit.centralEntityPresence.missingFrom.join(', ')}
                </div>
              )}
            </div>

            {/* Source Context presence */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h5 className="text-sm text-gray-400 mb-3">Source Context: "{result.ngramAudit.sourceContextPresence.term}"</h5>
              <div className="grid grid-cols-4 gap-2">
                <PresenceIndicator label="Header" present={result.ngramAudit.sourceContextPresence.inHeader} />
                <PresenceIndicator label="Footer" present={result.ngramAudit.sourceContextPresence.inFooter} />
                <PresenceIndicator label="Homepage" present={result.ngramAudit.sourceContextPresence.inHomepage} />
                <PresenceIndicator
                  label="Pillars"
                  present={result.ngramAudit.sourceContextPresence.inPillarPages.length > 0}
                  count={result.ngramAudit.sourceContextPresence.inPillarPages.length}
                />
              </div>
            </div>

            {/* Boilerplate inconsistencies */}
            {result.ngramAudit.inconsistentBoilerplate.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h5 className="text-sm text-yellow-400 mb-2">Boilerplate Inconsistencies</h5>
                <div className="space-y-2">
                  {result.ngramAudit.inconsistentBoilerplate.map((b, i) => (
                    <div key={i} className="p-2 bg-yellow-900/20 rounded text-sm">
                      <div className="text-yellow-300">{b.field}</div>
                      <div className="text-gray-400 text-xs mt-1">
                        {b.variations.length} variations found
                      </div>
                      <div className="text-blue-300 text-xs mt-1">{b.recommendation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

// Presence indicator mini-component
const PresenceIndicator: React.FC<{ label: string; present: boolean; count?: number }> = ({ label, present, count }) => (
  <div className={`p-2 rounded text-center text-xs ${present ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
    <div className={present ? 'text-green-400' : 'text-red-400'}>
      {present ? '✓' : '✗'}
    </div>
    <div className="text-gray-400">{label}</div>
    {count !== undefined && <div className="text-gray-500">{count}</div>}
  </div>
);

// Flow violation card mini-component
const FlowViolationCard: React.FC<{ violation: FlowViolation }> = ({ violation }) => {
  const typeLabels: Record<string, string> = {
    reverse_flow: '↩ Reverse Flow',
    orphaned: '🔗 Orphaned',
    no_cluster_support: '📉 No Cluster Support',
    link_hoarding: '🏦 Link Hoarding',
    excessive_outbound: '📤 Excessive Outbound',
  };

  return (
    <div className={`p-3 rounded ${violation.severity === 'critical' ? 'bg-red-900/20 border border-red-500/30' : 'bg-yellow-900/20 border border-yellow-500/30'}`}>
      <div className="flex items-start justify-between">
        <div>
          <span className={`text-xs font-medium ${violation.severity === 'critical' ? 'text-red-300' : 'text-yellow-300'}`}>
            {typeLabels[violation.type] || violation.type}
          </span>
          <div className="text-sm text-white mt-1">{violation.sourceTitle}</div>
          {violation.targetTitle && (
            <div className="text-xs text-gray-400">→ {violation.targetTitle}</div>
          )}
        </div>
        <span className={`px-2 py-0.5 text-xs rounded ${violation.severity === 'critical' ? 'bg-red-500/30 text-red-300' : 'bg-yellow-500/30 text-yellow-300'}`}>
          {violation.severity}
        </span>
      </div>
      <div className="mt-2 text-xs text-blue-300">{violation.recommendation}</div>
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
