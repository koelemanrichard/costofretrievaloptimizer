// components/site-analysis/AuditDashboardV2.tsx
// V2 Audit dashboard with pillar context and enhanced metrics

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SiteAnalysisProject, SitePageRecord, AuditTask, AISuggestion } from '../../types';
import { SEOAuditReportModal } from './report';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import { AuditButton } from '../audit/AuditButton';

interface AuditDashboardV2Props {
  project: SiteAnalysisProject;
  onViewPageDetail: (pageId: string) => void;
  onReaudit: () => void;
  onReextract?: () => void;
  onExtractPage?: (pageId: string) => void;
  isProcessing?: boolean;
}

type SortField = 'score' | 'url' | 'status' | 'issues';
type SortDirection = 'asc' | 'desc';

export const AuditDashboardV2: React.FC<AuditDashboardV2Props> = ({
  project,
  onViewPageDetail,
  onReaudit,
  onReextract,
  onExtractPage,
  isProcessing = false,
}) => {
  const { state } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showReportModal, setShowReportModal] = useState(false);

  // State for report data
  const [tasks, setTasks] = useState<AuditTask[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingReportData, setIsLoadingReportData] = useState(false);

  // Create Supabase client from business info
  const supabase = useMemo(() => {
    if (state.businessInfo?.supabaseUrl && state.businessInfo?.supabaseAnonKey) {
      return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
    }
    return null;
  }, [state.businessInfo?.supabaseUrl, state.businessInfo?.supabaseAnonKey]);

  // Load tasks and suggestions for report
  const loadReportData = useCallback(async () => {
    if (!supabase || !project.id) return;

    setIsLoadingReportData(true);
    try {
      // Load all tasks for the project
      const { data: tasksData } = await (supabase as any)
        .from('audit_tasks')
        .select('*')
        .eq('project_id', project.id)
        .order('priority', { ascending: true });

      const loadedTasks: AuditTask[] = (tasksData || []).map((t: any) => ({
        id: t.id,
        pageId: t.page_id,
        projectId: t.project_id,
        auditId: t.audit_id,
        ruleId: t.rule_id,
        phase: t.phase,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        remediation: t.remediation,
        context: t.context,
        dismissedReason: t.dismissed_reason,
        completedAt: t.completed_at,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));
      setTasks(loadedTasks);

      // Load AI suggestions for tasks
      if (loadedTasks.length > 0) {
        const taskIds = loadedTasks.map(t => t.id);
        const { data: suggestionsData } = await (supabase as any)
          .from('ai_suggestions')
          .select('*')
          .in('task_id', taskIds);

        if (suggestionsData) {
          setSuggestions(suggestionsData.map((s: any) => ({
            id: s.id,
            taskId: s.task_id,
            suggestionType: s.suggestion_type,
            suggestedValue: s.suggested_value,
            reasoning: s.reasoning,
            confidence: s.confidence,
            status: s.status,
            reviewedBy: s.reviewed_by,
            reviewedAt: s.reviewed_at,
            createdAt: s.created_at,
          })));
        }
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setIsLoadingReportData(false);
    }
  }, [supabase, project.id]);

  // Load report data when modal opens
  useEffect(() => {
    if (showReportModal && tasks.length === 0) {
      loadReportData();
    }
  }, [showReportModal, tasks.length, loadReportData]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const pages = project.pages || [];
    const auditedPages = pages.filter(p => p.latestAuditScore !== undefined);
    const scores = auditedPages.map(p => p.latestAuditScore!);

    return {
      totalPages: pages.length,
      auditedPages: auditedPages.length,
      crawledPages: pages.filter(p => p.crawlStatus === 'crawled').length,
      pendingPages: pages.filter(p => p.crawlStatus === 'pending').length,
      failedPages: pages.filter(p => p.crawlStatus === 'failed').length,
      averageScore: scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
      minScore: scores.length > 0 ? Math.min(...scores) : 0,
      maxScore: scores.length > 0 ? Math.max(...scores) : 0,
      pagesBelow50: scores.filter(s => s < 50).length,
      pagesAbove80: scores.filter(s => s >= 80).length,
    };
  }, [project.pages]);

  // Filter and sort pages
  const filteredPages = useMemo(() => {
    let pages = project.pages || [];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      pages = pages.filter(p =>
        p.url.toLowerCase().includes(query) ||
        p.title?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      if (filterStatus === 'needs-work') {
        pages = pages.filter(p => (p.latestAuditScore || 0) < 70);
      } else if (filterStatus === 'good') {
        pages = pages.filter(p => (p.latestAuditScore || 0) >= 70);
      } else if (filterStatus === 'failed') {
        pages = pages.filter(p => p.crawlStatus === 'failed');
      }
    }

    // Sort
    pages = [...pages].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'score':
          comparison = (a.latestAuditScore || 0) - (b.latestAuditScore || 0);
          break;
        case 'url':
          comparison = a.url.localeCompare(b.url);
          break;
        case 'status':
          comparison = (a.crawlStatus || '').localeCompare(b.crawlStatus || '');
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return pages;
  }, [project.pages, searchQuery, sortField, sortDirection, filterStatus]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header with Pillar Context */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">{project.name}</h2>
            <p className="text-gray-400">{project.domain}</p>
          </div>
          <div className="flex items-center gap-3">
            {onReextract && (
              <Button
                onClick={onReextract}
                variant="secondary"
                size="sm"
                disabled={isProcessing}
              >
                {isProcessing ? 'Extracting...' : 'Re-extract Content'}
              </Button>
            )}
            <Button
              onClick={onReaudit}
              variant="secondary"
              size="sm"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Re-audit All'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowReportModal(true)}
            >
              Export Report
            </Button>
          </div>
        </div>

        {/* Extraction Status Alert */}
        {(metrics.pendingPages > 0 || metrics.failedPages > 0) && (
          <div className={`p-4 rounded-lg border ${
            metrics.failedPages > 0 ? 'border-red-500/50 bg-red-900/20' : 'border-yellow-500/50 bg-yellow-900/20'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className={`w-5 h-5 ${metrics.failedPages > 0 ? 'text-red-400' : 'text-yellow-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className={`font-medium ${metrics.failedPages > 0 ? 'text-red-300' : 'text-yellow-300'}`}>
                    {metrics.pendingPages > 0 && `${metrics.pendingPages} page${metrics.pendingPages > 1 ? 's' : ''} pending extraction`}
                    {metrics.pendingPages > 0 && metrics.failedPages > 0 && ', '}
                    {metrics.failedPages > 0 && `${metrics.failedPages} page${metrics.failedPages > 1 ? 's' : ''} failed`}
                  </p>
                  <p className="text-sm text-gray-400">
                    Content extraction is required before auditing. Click "Re-extract Content" to process pending pages.
                  </p>
                </div>
              </div>
              {onReextract && (
                <Button
                  onClick={onReextract}
                  variant="primary"
                  size="sm"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Extracting...' : 'Extract Now'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Semantic Pillars */}
        {project.pillarsValidated && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800/50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Central Entity</p>
              <p className="text-white font-medium">{project.centralEntity}</p>
              {project.centralEntityType && (
                <p className="text-xs text-purple-400">{project.centralEntityType}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Source Context</p>
              <p className="text-white font-medium">{project.sourceContext}</p>
              {project.sourceContextType && (
                <p className="text-xs text-purple-400">{project.sourceContextType}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Central Search Intent</p>
              <p className="text-white font-medium">{project.centralSearchIntent}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Average Score */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Score</p>
              <p className={`text-3xl font-bold ${getScoreColor(metrics.averageScore)}`}>
                {metrics.averageScore}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
              <div
                className={`w-8 h-8 rounded-full ${getScoreBgColor(metrics.averageScore)}`}
                style={{
                  background: `conic-gradient(${getScoreBgColor(metrics.averageScore).replace('bg-', '')} ${metrics.averageScore}%, transparent 0)`,
                }}
              />
            </div>
          </div>
        </Card>

        {/* Pages Audited */}
        <Card className="p-4">
          <p className="text-sm text-gray-400">Pages Audited</p>
          <p className="text-3xl font-bold text-white">
            {metrics.auditedPages}
            <span className="text-lg text-gray-500">/{metrics.totalPages}</span>
          </p>
        </Card>

        {/* Needs Work */}
        <Card className="p-4">
          <p className="text-sm text-gray-400">Need Work (&lt;50)</p>
          <p className="text-3xl font-bold text-red-400">{metrics.pagesBelow50}</p>
        </Card>

        {/* Good Pages */}
        <Card className="p-4">
          <p className="text-sm text-gray-400">Good (&gt;80)</p>
          <p className="text-3xl font-bold text-green-400">{metrics.pagesAbove80}</p>
        </Card>
      </div>

      {/* Score Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Score Distribution</h3>
        <div className="flex items-end gap-1 h-24">
          {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(bucket => {
            const count = (project.pages || []).filter(p => {
              const score = p.latestAuditScore || 0;
              return score >= bucket && score < bucket + 10;
            }).length;
            const maxCount = Math.max(...[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(b =>
              (project.pages || []).filter(p => {
                const s = p.latestAuditScore || 0;
                return s >= b && s < b + 10;
              }).length
            ));
            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;

            return (
              <div key={bucket} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-t ${
                    bucket >= 80 ? 'bg-green-500' :
                    bucket >= 60 ? 'bg-yellow-500' :
                    bucket >= 40 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : 0 }}
                />
                <span className="text-xs text-gray-500 mt-1">{bucket}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Page List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Pages</h3>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages..."
                className="pl-9 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:border-purple-500 focus:outline-none w-64"
              />
              <svg
                className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:border-purple-500 focus:outline-none"
            >
              <option value="all">All Pages</option>
              <option value="needs-work">Needs Work (&lt;70)</option>
              <option value="good">Good (&gt;70)</option>
              <option value="failed">Failed Crawl</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th
                  className="text-left py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('score')}
                >
                  Score {sortField === 'score' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white"
                  onClick={() => handleSort('url')}
                >
                  Page {sortField === 'url' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                  Schema
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.map((page) => (
                <tr
                  key={page.id}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    {page.latestAuditScore !== undefined ? (
                      <span className={`text-lg font-bold ${getScoreColor(page.latestAuditScore)}`}>
                        {page.latestAuditScore}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate max-w-md" title={page.url}>
                          {page.path || page.url}
                        </p>
                        {page.title && (
                          <p className="text-gray-500 text-xs truncate max-w-md" title={page.title}>
                            {page.title}
                          </p>
                        )}
                      </div>
                      <AuditButton url={page.url} variant="icon" size="sm" />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      page.crawlStatus === 'crawled' ? 'bg-green-500/20 text-green-400' :
                      page.crawlStatus === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {page.crawlStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {page.schemaTypes && page.schemaTypes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {page.schemaTypes.slice(0, 2).map((schema, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                            {schema}
                          </span>
                        ))}
                        {page.schemaTypes.length > 2 && (
                          <span className="text-xs text-gray-500">+{page.schemaTypes.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">None</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {page.crawlStatus === 'pending' && onExtractPage && (
                        <Button
                          onClick={() => onExtractPage(page.id)}
                          variant="primary"
                          size="sm"
                          disabled={isProcessing}
                        >
                          Extract
                        </Button>
                      )}
                      <Button
                        onClick={() => onViewPageDetail(page.id)}
                        variant="secondary"
                        size="sm"
                      >
                        View
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No pages match your search criteria
          </div>
        )}

        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredPages.length} of {project.pages?.length || 0} pages
        </div>
      </Card>

      {/* SEO Audit Report Modal */}
      <SEOAuditReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        project={project}
        pages={project.pages || []}
        tasks={tasks}
        suggestions={suggestions}
        scope="site"
      />
    </div>
  );
};

export default AuditDashboardV2;
