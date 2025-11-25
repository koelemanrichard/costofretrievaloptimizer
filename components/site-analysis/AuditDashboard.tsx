// components/site-analysis/AuditDashboard.tsx
// Main dashboard for audit results

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { ProgressCircle } from '../ui/ProgressCircle';
import { SiteAnalysisProject, SitePageRecord } from '../../types';
import { getProjectSummary } from '../../services/siteAnalysisService';
import { PHASE_CONFIG } from '../../config/pageAuditRules';

interface AuditDashboardProps {
  project: SiteAnalysisProject;
  onViewPageDetail: (url: string) => void;
}

export const AuditDashboard: React.FC<AuditDashboardProps> = ({
  project,
  onViewPageDetail,
}) => {
  const [sortBy, setSortBy] = useState<'score' | 'issues' | 'url'>('score');
  const [filterPhase, setFilterPhase] = useState<string>('all');

  const summary = getProjectSummary(project);

  // Get pages with audits
  const auditedPages = project.pages.filter(p => p.auditResult);

  // Sort pages
  const sortedPages = [...auditedPages].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return (a.auditResult?.overallScore || 0) - (b.auditResult?.overallScore || 0);
      case 'issues':
        return (b.auditResult?.actionItems.length || 0) - (a.auditResult?.actionItems.length || 0);
      case 'url':
        return a.url.localeCompare(b.url);
      default:
        return 0;
    }
  });

  // Calculate phase averages
  const phaseAverages = {
    technical: Math.round(auditedPages.reduce((sum, p) => sum + (p.auditResult?.phases.technical.score || 0), 0) / (auditedPages.length || 1)),
    semantic: Math.round(auditedPages.reduce((sum, p) => sum + (p.auditResult?.phases.semantic.score || 0), 0) / (auditedPages.length || 1)),
    linkStructure: Math.round(auditedPages.reduce((sum, p) => sum + (p.auditResult?.phases.linkStructure.score || 0), 0) / (auditedPages.length || 1)),
    contentQuality: Math.round(auditedPages.reduce((sum, p) => sum + (p.auditResult?.phases.contentQuality.score || 0), 0) / (auditedPages.length || 1)),
    visualSchema: Math.round(auditedPages.reduce((sum, p) => sum + (p.auditResult?.phases.visualSchema.score || 0), 0) / (auditedPages.length || 1)),
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#eab308'; // yellow
    if (score >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-6 text-center">
          <div className="flex justify-center mb-3">
            <ProgressCircle
              percentage={summary.averageScore}
              size={80}
              strokeWidth={8}
              color={getScoreColor(summary.averageScore)}
            />
          </div>
          <p className="text-sm text-gray-400">Average Score</p>
        </Card>

        <Card className="p-6 text-center">
          <p className="text-3xl font-bold text-white">{summary.totalPages}</p>
          <p className="text-sm text-gray-400 mt-1">Total Pages</p>
        </Card>

        <Card className="p-6 text-center">
          <p className="text-3xl font-bold text-green-400">{summary.auditedPages}</p>
          <p className="text-sm text-gray-400 mt-1">Audited</p>
        </Card>

        <Card className="p-6 text-center">
          <p className="text-3xl font-bold text-red-400">{summary.criticalIssues}</p>
          <p className="text-sm text-gray-400 mt-1">Critical Issues</p>
        </Card>

        <Card className="p-6 text-center">
          <p className="text-3xl font-bold text-yellow-400">{summary.highIssues}</p>
          <p className="text-sm text-gray-400 mt-1">High Priority</p>
        </Card>
      </div>

      {/* Phase Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Phase Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(PHASE_CONFIG).map(([key, config]) => {
            const score = phaseAverages[key as keyof typeof phaseAverages];
            return (
              <div
                key={key}
                className="p-4 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors"
                onClick={() => setFilterPhase(filterPhase === key ? 'all' : key)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">{config.name}</span>
                  <span
                    className="text-lg font-bold"
                    style={{ color: getScoreColor(score) }}
                  >
                    {score}
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${score}%`,
                      backgroundColor: getScoreColor(score),
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Top Issues */}
      {summary.topIssues.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Most Common Issues</h3>
          <div className="space-y-2">
            {summary.topIssues.slice(0, 5).map((issue) => (
              <div
                key={issue.ruleId}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
              >
                <span className="text-gray-300">{issue.ruleName}</span>
                <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                  {issue.count} pages
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Page List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Page Results</h3>
          <div className="flex items-center gap-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value="score">Sort by Score</option>
              <option value="issues">Sort by Issues</option>
              <option value="url">Sort by URL</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {sortedPages.map((page) => (
            <PageRow
              key={page.id}
              page={page}
              onViewDetail={() => onViewPageDetail(page.url)}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};

// Page Row Component
const PageRow: React.FC<{
  page: SitePageRecord;
  onViewDetail: () => void;
}> = ({ page, onViewDetail }) => {
  const { auditResult } = page;
  if (!auditResult) return null;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const criticalCount = auditResult.actionItems.filter(i => i.priority === 'critical').length;
  const highCount = auditResult.actionItems.filter(i => i.priority === 'high').length;

  // Extract path from URL
  let path = '';
  try {
    path = new URL(page.url).pathname;
  } catch {
    path = page.url;
  }

  return (
    <div
      onClick={onViewDetail}
      className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 cursor-pointer transition-colors"
    >
      {/* Score */}
      <div className={`text-2xl font-bold ${getScoreColor(auditResult.overallScore)} min-w-[60px] text-center`}>
        {auditResult.overallScore}
      </div>

      {/* URL */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{path}</p>
        <p className="text-xs text-gray-500 truncate">{page.url}</p>
      </div>

      {/* Phase Mini-Scores */}
      <div className="hidden lg:flex items-center gap-2">
        {Object.entries(auditResult.phases).map(([key, phase]) => (
          <div
            key={key}
            className="w-8 h-8 rounded flex items-center justify-center text-xs font-medium"
            style={{
              backgroundColor: phase.score >= 70 ? 'rgba(34, 197, 94, 0.2)' : phase.score >= 50 ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: phase.score >= 70 ? '#22c55e' : phase.score >= 50 ? '#eab308' : '#ef4444',
            }}
            title={PHASE_CONFIG[key as keyof typeof PHASE_CONFIG].name}
          >
            {phase.score}
          </div>
        ))}
      </div>

      {/* Issue Counts */}
      <div className="flex items-center gap-2">
        {criticalCount > 0 && (
          <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
            {criticalCount} critical
          </span>
        )}
        {highCount > 0 && (
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
            {highCount} high
          </span>
        )}
      </div>

      {/* Arrow */}
      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
};

export default AuditDashboard;
