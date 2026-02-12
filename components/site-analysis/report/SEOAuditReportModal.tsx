// components/site-analysis/report/SEOAuditReportModal.tsx
// Main modal for viewing and exporting SEO audit reports

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import { AuditButton } from '../../audit/AuditButton';
import {
  SEOAuditReport,
  ReportScope,
  ReportAudience,
  SiteAnalysisProject,
  SitePageRecord,
  AuditTask,
  AISuggestion,
} from '../../../types';
import { generateReport, groupIssuesByPriority, groupIssuesByPhase, getPhaseBusinessName } from '../../../services/reportGenerationService';
import { exportToXLSX, exportToHTML, openHTMLReportForPrint } from '../../../services/reportExportService';
import { HEALTH_STATUS_LABELS, PRIORITY_LABELS, PHASE_BUSINESS_NAMES } from '../../../config/businessLanguageMap';

interface SEOAuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: SiteAnalysisProject;
  pages: SitePageRecord[];
  tasks: AuditTask[];
  suggestions: AISuggestion[];
  scope: ReportScope;
  pageId?: string;
}

const SEOAuditReportModal: React.FC<SEOAuditReportModalProps> = ({
  isOpen,
  onClose,
  project,
  pages,
  tasks,
  suggestions,
  scope,
  pageId,
}) => {
  const [audience, setAudience] = useState<ReportAudience>('business');
  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<SEOAuditReport | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  // Generate report when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      // Small delay to show loading state
      setTimeout(() => {
        const generatedReport = generateReport(project, pages, tasks, suggestions, scope, pageId);
        setReport(generatedReport);
        setIsLoading(false);
      }, 100);
    }
  }, [isOpen, project, pages, tasks, suggestions, scope, pageId]);

  const handleExportXLSX = () => {
    if (report) {
      exportToXLSX(report, audience, project.name || project.domain);
    }
  };

  const handleExportHTML = () => {
    if (report) {
      exportToHTML(report, audience, project.name || project.domain);
    }
  };

  const handlePrint = () => {
    if (report) {
      openHTMLReportForPrint(report, audience, project.name || project.domain);
    }
  };

  const toggleIssue = (issueId: string) => {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500/20';
    if (score >= 60) return 'bg-blue-500/20';
    if (score >= 40) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-start overflow-y-auto p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl my-8"
        onClick={e => e.stopPropagation()}
      >
        <Card className="bg-gray-800 border-gray-700">
          {/* Header */}
          <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10">
            <div>
              <h2 className="text-xl font-bold text-white">SEO Audit Report</h2>
              <p className="text-sm text-gray-400">
                {project.name || project.domain} &bull; {scope === 'site' ? 'Full Site' : 'Single Page'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Audience Toggle */}
              <div className="flex rounded-lg overflow-hidden border border-gray-600">
                <button
                  onClick={() => setAudience('business')}
                  className={`px-3 py-1.5 text-sm ${
                    audience === 'business'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Business
                </button>
                <button
                  onClick={() => setAudience('technical')}
                  className={`px-3 py-1.5 text-sm ${
                    audience === 'technical'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Technical
                </button>
              </div>

              {/* Export Dropdown */}
              <div className="relative group">
                <Button variant="primary" size="sm">
                  Export ▾
                </Button>
                <div className="absolute right-0 mt-1 w-48 bg-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                  <button
                    onClick={handleExportXLSX}
                    className="w-full px-4 py-2 text-sm text-left text-gray-200 hover:bg-gray-600 rounded-t-lg"
                  >
                    Download Excel (.xlsx)
                  </button>
                  <button
                    onClick={handleExportHTML}
                    className="w-full px-4 py-2 text-sm text-left text-gray-200 hover:bg-gray-600"
                  >
                    Download HTML
                  </button>
                  <button
                    onClick={handlePrint}
                    className="w-full px-4 py-2 text-sm text-left text-gray-200 hover:bg-gray-600 rounded-b-lg"
                  >
                    Print / Save as PDF
                  </button>
                </div>
              </div>

              <button
                onClick={onClose}
                className="text-gray-400 text-2xl leading-none hover:text-white ml-2"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader />
                <p className="mt-4 text-gray-400">Generating report...</p>
              </div>
            ) : report ? (
              <div className="space-y-8">
                {/* Executive Summary */}
                <section>
                  <div className="flex items-center gap-6 mb-6">
                    {/* Score Circle */}
                    <div
                      className={`w-28 h-28 rounded-full flex items-center justify-center ${getScoreBgColor(report.executiveSummary.overallScore)}`}
                    >
                      <span className={`text-4xl font-bold ${getScoreColor(report.executiveSummary.overallScore)}`}>
                        {report.executiveSummary.overallScore}
                      </span>
                    </div>
                    <div>
                      <h3 className={`text-2xl font-bold ${getScoreColor(report.executiveSummary.overallScore)}`}>
                        {HEALTH_STATUS_LABELS[report.executiveSummary.healthStatus]?.label}
                      </h3>
                      <p className="text-gray-400">
                        {HEALTH_STATUS_LABELS[report.executiveSummary.healthStatus]?.description}
                      </p>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-gray-900/50 rounded-lg">
                      <div className="text-2xl font-bold text-white">{report.executiveSummary.pagesAnalyzed}</div>
                      <div className="text-sm text-gray-400">Pages Analyzed</div>
                    </div>
                    <div className="p-4 bg-gray-900/50 rounded-lg">
                      <div className="text-2xl font-bold text-red-400">{report.executiveSummary.issuesCritical}</div>
                      <div className="text-sm text-gray-400">Critical Issues</div>
                    </div>
                    <div className="p-4 bg-gray-900/50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-400">{report.executiveSummary.issuesHigh}</div>
                      <div className="text-sm text-gray-400">High Priority</div>
                    </div>
                    <div className="p-4 bg-gray-900/50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-400">
                        {report.executiveSummary.issuesMedium + report.executiveSummary.issuesLow}
                      </div>
                      <div className="text-sm text-gray-400">Other Issues</div>
                    </div>
                  </div>

                  {/* Key Findings */}
                  {report.executiveSummary.keyFindings.length > 0 && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-6">
                      <h4 className="text-sm font-semibold text-yellow-400 uppercase mb-2">Key Findings</h4>
                      <ul className="space-y-1">
                        {report.executiveSummary.keyFindings.map((finding, i) => (
                          <li key={i} className="text-gray-300 text-sm">• {finding}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>

                {/* Phase Scores */}
                <section>
                  <h3 className="text-lg font-semibold text-white mb-4">Performance by Category</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.entries(report.phaseScores).map(([phase, data]) => (
                      <div key={phase} className={`p-4 rounded-lg text-center ${getScoreBgColor(data.score)}`}>
                        <div className={`text-2xl font-bold ${getScoreColor(data.score)}`}>{data.score}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {audience === 'business'
                            ? PHASE_BUSINESS_NAMES[phase]?.name || phase
                            : phase}
                        </div>
                        <div className="text-xs text-gray-500">{data.passed}/{data.total} passed</div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Pillar Context */}
                {report.pillarContext && audience === 'business' && (
                  <section>
                    <h3 className="text-lg font-semibold text-white mb-4">SEO Foundation</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <div className="text-xs text-purple-400 uppercase font-semibold">Main Topic</div>
                        <div className="text-white mt-1">{report.pillarContext.centralEntity}</div>
                      </div>
                      <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <div className="text-xs text-purple-400 uppercase font-semibold">Business Model</div>
                        <div className="text-white mt-1">{report.pillarContext.sourceContext}</div>
                      </div>
                      <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <div className="text-xs text-purple-400 uppercase font-semibold">User Goal</div>
                        <div className="text-white mt-1">{report.pillarContext.centralSearchIntent}</div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Issues */}
                <section>
                  <h3 className="text-lg font-semibold text-white mb-4">Issues to Address</h3>
                  {audience === 'business' ? (
                    // Business View - Group by Priority
                    <div className="space-y-6">
                      {(['critical', 'high', 'medium', 'low'] as const).map(priority => {
                        const priorityIssues = report.issues.filter(i => i.priority === priority);
                        if (priorityIssues.length === 0) return null;
                        return (
                          <div key={priority}>
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`px-3 py-1 text-xs rounded-full border ${getPriorityColor(priority)}`}>
                                {PRIORITY_LABELS[priority]?.label}
                              </span>
                              <span className="text-sm text-gray-500">{priorityIssues.length} issues</span>
                            </div>
                            <div className="space-y-2">
                              {priorityIssues.map(issue => (
                                <div
                                  key={issue.id}
                                  className="rounded-lg border border-gray-700 bg-gray-900/50 overflow-hidden"
                                >
                                  <div
                                    className="p-4 cursor-pointer hover:bg-gray-800/50"
                                    onClick={() => toggleIssue(issue.id)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-500 text-sm">
                                          {expandedIssues.has(issue.id) ? '▼' : '▶'}
                                        </span>
                                        <span className="font-medium text-white">{issue.headline}</span>
                                      </div>
                                      <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                                        {issue.effortLevel}
                                      </span>
                                    </div>
                                  </div>
                                  {expandedIssues.has(issue.id) && (
                                    <div className="px-4 pb-4 border-t border-gray-700/50">
                                      <div className="pt-3 space-y-2 text-sm">
                                        <p className="text-gray-400">{issue.whyItMatters}</p>
                                        <p className="text-yellow-400/80">
                                          <strong>Impact:</strong> {issue.businessImpact}
                                        </p>
                                        <p className="text-purple-400">
                                          <strong>Action:</strong> {issue.suggestedAction}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Technical View - Group by Phase
                    <div className="space-y-6">
                      {Object.entries(groupIssuesByPhase(report.issues)).map(([phase, phaseIssues]) => {
                        if (phaseIssues.length === 0) return null;
                        return (
                          <div key={phase}>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-sm font-medium text-gray-300">{phase}</span>
                              <span className="text-sm text-gray-500">{phaseIssues.length} issues</span>
                            </div>
                            <div className="space-y-2">
                              {phaseIssues.map(issue => (
                                <div
                                  key={issue.id}
                                  className="rounded-lg border border-gray-700 bg-gray-900/50 overflow-hidden"
                                >
                                  <div
                                    className="p-4 cursor-pointer hover:bg-gray-800/50"
                                    onClick={() => toggleIssue(issue.id)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-500 text-sm">
                                          {expandedIssues.has(issue.id) ? '▼' : '▶'}
                                        </span>
                                        <span className="font-mono text-xs text-gray-500">{issue.ruleId}</span>
                                        <span className="font-medium text-white">{issue.technicalDetails.ruleName}</span>
                                      </div>
                                      <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(issue.priority)}`}>
                                        {issue.priority}
                                      </span>
                                    </div>
                                  </div>
                                  {expandedIssues.has(issue.id) && (
                                    <div className="px-4 pb-4 border-t border-gray-700/50">
                                      <div className="pt-3 space-y-2 text-sm">
                                        <p className="text-gray-400">{issue.technicalDetails.remediation}</p>
                                        {issue.technicalDetails.aiSuggestion && (
                                          <p className="text-purple-400">
                                            <strong>AI Suggestion:</strong> {issue.technicalDetails.aiSuggestion}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Pages Overview (Site Reports) */}
                {report.pages && report.pages.length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold text-white mb-4">Pages Overview</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                            <th className="pb-2">Page</th>
                            <th className="pb-2 text-center">Score</th>
                            <th className="pb-2 text-center">Issues</th>
                            <th className="pb-2">Top Issue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.pages.slice(0, 10).map((page, i) => (
                            <tr key={i} className="border-b border-gray-800">
                              <td className="py-3">
                                <div className="text-white text-sm truncate max-w-xs">{page.title}</div>
                                <div className="flex items-center gap-1">
                                  <div className="text-xs text-gray-500 truncate max-w-xs">{page.url}</div>
                                  <AuditButton url={page.url} variant="icon" size="sm" />
                                </div>
                              </td>
                              <td className="py-3 text-center">
                                <span className={`font-bold ${getScoreColor(page.overallScore)}`}>
                                  {page.overallScore}
                                </span>
                              </td>
                              <td className="py-3 text-center text-gray-300">{page.issueCount}</td>
                              <td className="py-3 text-sm text-gray-400">{page.topIssue || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {report.pages.length > 10 && (
                        <p className="text-sm text-gray-500 mt-2">
                          Showing 10 of {report.pages.length} pages. Export for full list.
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {/* Progress */}
                <section>
                  <h3 className="text-lg font-semibold text-white mb-4">Progress</h3>
                  <div className="p-4 bg-gray-900/50 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{report.progress.completed}</div>
                        <div className="text-sm text-gray-400">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">{report.progress.pending}</div>
                        <div className="text-sm text-gray-400">Pending</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">
                          {report.progress.totalTasks > 0
                            ? Math.round((report.progress.completed / report.progress.totalTasks) * 100)
                            : 0}%
                        </div>
                        <div className="text-sm text-gray-400">Completion</div>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{
                          width: `${report.progress.totalTasks > 0
                            ? (report.progress.completed / report.progress.totalTasks) * 100
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-12">No report data available</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SEOAuditReportModal;
