// components/site-analysis/PageAuditDetailV2.tsx
// V2 Page audit detail view with full audit breakdown

import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import { SitePageRecord, PageAudit, AuditCheck, AuditTask, SiteAnalysisProject, AISuggestion } from '../../types';
import AISuggestionReviewModal from './AISuggestionReviewModal';
import BatchSuggestionReviewModal from './BatchSuggestionReviewModal';
import { SEOAuditReportModal } from './report';
import { useSemanticAnalysis } from '../../hooks/useSemanticAnalysis';
import { SemanticAnalysisPanel } from '../ui/SemanticAnalysisPanel';
import { AuditHeader } from './page-audit/AuditHeader';
import { AuditScoreGrid } from './page-audit/AuditScoreGrid';
import { AuditTaskSummary } from './page-audit/AuditTaskSummary';
import { AuditTaskList } from './page-audit/AuditTaskList';
import { AuditCheckItem } from './page-audit/AuditCheckItem';
import { AuditButton } from '../audit/AuditButton';

interface PageAuditDetailV2Props {
  projectId: string;
  pageId: string;
  onBack: () => void;
  onReextract?: (pageId: string) => Promise<void>;
  onReaudit?: (pageId: string) => Promise<void>;
  isProcessing?: boolean;
  refreshTrigger?: number; // Increment to force data reload
}

export const PageAuditDetailV2: React.FC<PageAuditDetailV2Props> = ({
  projectId,
  pageId,
  onBack,
  onReextract,
  onReaudit,
  isProcessing = false,
  refreshTrigger = 0,
}) => {
  const { state, dispatch } = useAppState();

  // Create Supabase client from business info
  const supabase = useMemo(() => {
    if (state.businessInfo?.supabaseUrl && state.businessInfo?.supabaseAnonKey) {
      return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
    }
    return null;
  }, [state.businessInfo?.supabaseUrl, state.businessInfo?.supabaseAnonKey]);

  const [page, setPage] = useState<SitePageRecord | null>(null);
  const [audit, setAudit] = useState<PageAudit | null>(null);
  const [tasks, setTasks] = useState<AuditTask[]>([]);
  const [project, setProject] = useState<SiteAnalysisProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingTask, setIsUpdatingTask] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'semantic' | 'semantic_ai' | 'links' | 'content' | 'schema' | 'tasks' | 'raw_data'>('overview');

  // AI Suggestion modal state
  const [selectedTaskForSuggestion, setSelectedTaskForSuggestion] = useState<AuditTask | null>(null);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [showBatchSuggestionModal, setShowBatchSuggestionModal] = useState(false);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);

  // Task expansion state
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());

  // Semantic AI analysis hook
  const {
    result: semanticResult,
    isAnalyzing: isAnalyzingSemantic,
    error: semanticError,
    analyze: runSemanticAnalysis,
    updateActionFix,
  } = useSemanticAnalysis(state.businessInfo, dispatch);

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const expandAllTasks = () => {
    setExpandedTaskIds(new Set(tasks.map(t => t.id)));
  };

  const collapseAllTasks = () => {
    setExpandedTaskIds(new Set());
  };

  // Update task status
  const updateTaskStatus = async (taskId: string, status: 'pending' | 'in_progress' | 'completed' | 'dismissed', reason?: string) => {
    if (!supabase) return;

    setIsUpdatingTask(taskId);
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      if (status === 'dismissed' && reason) {
        updateData.dismissed_reason = reason;
      }

      const { error } = await (supabase as any)
        .from('audit_tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;

      // Update local state
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, status, completedAt: status === 'completed' ? new Date().toISOString() : t.completedAt }
          : t
      ));
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setIsUpdatingTask(null);
    }
  };

  useEffect(() => {
    loadPageData();
  }, [pageId, refreshTrigger]);

  const loadPageData = async () => {
    if (!supabase) return;

    setIsLoading(true);
    try {
      // Load page (cast to any for tables not in generated types)
      const { data: pageData, error: pageError } = await (supabase as any)
        .from('site_pages')
        .select('*')
        .eq('id', pageId)
        .single();

      if (pageError) throw pageError;
      setPage(mapDbPageToModel(pageData));

      // Load latest audit
      if (pageData?.latest_audit_id) {
        const { data: auditData, error: auditError } = await (supabase as any)
          .from('page_audits')
          .select('*')
          .eq('id', pageData.latest_audit_id)
          .single();

        if (!auditError && auditData) {
          setAudit(mapDbAuditToModel(auditData));
        }
      }

      // Load tasks
      const { data: tasksData } = await (supabase as any)
        .from('audit_tasks')
        .select('*')
        .eq('page_id', pageId)
        .order('priority', { ascending: true });

      const loadedTasks = tasksData?.map(mapDbTaskToModel) || [];
      setTasks(loadedTasks);

      // Load AI suggestions for tasks
      if (loadedTasks.length > 0) {
        const taskIds = loadedTasks.map((t: AuditTask) => t.id);
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

      // Load project for AI suggestions context
      const { data: projectData } = await (supabase as any)
        .from('site_analysis_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectData) {
        setProject(mapDbProjectToModel(projectData));
      }

    } catch (err) {
      console.error('Failed to load page data:', err);
    } finally {
      setIsLoading(false);
    }
  };



  // Get tasks filtered by phase
  const getTasksByPhase = (phase: string): AuditTask[] => {
    return tasks.filter(t => t.phase?.toLowerCase() === phase.toLowerCase());
  };

  // Map tab names to phase names
  const tabToPhase: Record<string, string> = {
    'technical': 'Technical',
    'semantic': 'Semantic',
    'links': 'LinkStructure',
    'content': 'ContentQuality',
    'schema': 'VisualSchema',
  };

  const handleSuggestionClick = (task: AuditTask) => {
    setSelectedTaskForSuggestion(task);
    setShowSuggestionModal(true);
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader />
        <span className="ml-3 text-gray-400">Loading page details...</span>
      </div>
    );
  }

  if (!page) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-400">Page not found</p>
        <Button onClick={onBack} variant="secondary" className="mt-4">
          Back to Dashboard
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <AuditHeader
        page={page}
        audit={audit}
        onBack={onBack}
        onReextract={onReextract}
        onReaudit={onReaudit}
        onShowReport={() => setShowReportModal(true)}
        isProcessing={isProcessing || false}
      />

      {/* Phase Scores */}
      {audit && <AuditScoreGrid audit={audit} />}

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex gap-6">
          {['overview', 'technical', 'semantic', 'semantic_ai', 'links', 'content', 'schema', 'tasks', 'raw_data'].map(tab => {
            const getTabLabel = (t: string) => {
              if (t === 'raw_data') return 'Raw Data';
              if (t === 'semantic_ai') return 'AI Semantic';
              return t.charAt(0).toUpperCase() + t.slice(1);
            };

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
                  }`}
              >
                {getTabLabel(tab)}
                {tab === 'tasks' && tasks.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                    {tasks.filter(t => t.status === 'pending').length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <Card className="p-6">
        {activeTab === 'overview' && audit && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Summary</h3>
            <p className="text-gray-400">{audit.summary}</p>

            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-2xl font-bold text-red-400">{audit.criticalIssuesCount}</p>
                <p className="text-sm text-gray-400">Critical Issues</p>
              </div>
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <p className="text-2xl font-bold text-orange-400">{audit.highIssuesCount}</p>
                <p className="text-sm text-gray-400">High Priority</p>
              </div>
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-2xl font-bold text-yellow-400">{audit.mediumIssuesCount}</p>
                <p className="text-sm text-gray-400">Medium Priority</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/30">
                <p className="text-2xl font-bold text-gray-400">{audit.lowIssuesCount}</p>
                <p className="text-sm text-gray-400">Low Priority</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'technical' && audit && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">Technical Checks</h3>
            <AuditTaskSummary tasks={getTasksByPhase('Technical')} />
            {audit.technicalChecks.map(check => <AuditCheckItem key={check.ruleId} check={check} />)}
            <AuditTaskList
              tasks={getTasksByPhase('Technical')}
              expandedTaskIds={expandedTaskIds}
              onToggleExpand={toggleTaskExpanded}
              onExpandAll={(ids) => setExpandedTaskIds(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next; })}
              onCollapseAll={(ids) => setExpandedTaskIds(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; })}
              onUpdateStatus={updateTaskStatus}
              onSuggestionClick={handleSuggestionClick}
              isUpdatingTask={isUpdatingTask}
            />
          </div>
        )}

        {activeTab === 'semantic' && audit && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">Semantic Checks</h3>
            <AuditTaskSummary tasks={getTasksByPhase('Semantic')} />
            {audit.semanticChecks.map(check => <AuditCheckItem key={check.ruleId} check={check} />)}
            <AuditTaskList
              tasks={getTasksByPhase('Semantic')}
              expandedTaskIds={expandedTaskIds}
              onToggleExpand={toggleTaskExpanded}
              onExpandAll={(ids) => setExpandedTaskIds(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next; })}
              onCollapseAll={(ids) => setExpandedTaskIds(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; })}
              onUpdateStatus={updateTaskStatus}
              onSuggestionClick={handleSuggestionClick}
              isUpdatingTask={isUpdatingTask}
            />
          </div>
        )}

        {activeTab === 'links' && audit && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">Link Structure Checks</h3>
            <AuditTaskSummary tasks={getTasksByPhase('LinkStructure')} />
            {audit.linkStructureChecks.map(check => <AuditCheckItem key={check.ruleId} check={check} />)}

            {/* Link Details */}
            {page.links && page.links.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h4 className="text-md font-semibold text-white mb-3">
                  Links Found ({page.links.length})
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {page.links.slice(0, 20).map((link, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs ${link.isInternal ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                        }`}>
                        {link.isInternal ? 'Internal' : 'External'}
                      </span>
                      <span className="text-gray-400 truncate flex-1">{link.text || '(no text)'}</span>
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-purple-400 truncate max-w-xs">
                        {link.href}
                      </a>
                      <AuditButton url={link.href} variant="icon" size="sm" />
                    </div>
                  ))}
                  {page.links.length > 20 && (
                    <p className="text-gray-500 text-sm">...and {page.links.length - 20} more</p>
                  )}
                </div>
              </div>
            )}
            {/* Phase tasks rendered via AuditTaskList below */}
            <AuditTaskList
              tasks={getTasksByPhase('LinkStructure')}
              expandedTaskIds={expandedTaskIds}
              onToggleExpand={toggleTaskExpanded}
              onExpandAll={(ids) => setExpandedTaskIds(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next; })}
              onCollapseAll={(ids) => setExpandedTaskIds(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; })}
              onUpdateStatus={updateTaskStatus}
              onSuggestionClick={handleSuggestionClick}
              isUpdatingTask={isUpdatingTask}
            />
          </div>
        )}

        {activeTab === 'content' && audit && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">Content Quality Checks</h3>
            <AuditTaskSummary tasks={getTasksByPhase('ContentQuality')} />
            {audit.contentQualityChecks.map(check => <AuditCheckItem key={check.ruleId} check={check} />)}

            {/* Headings */}
            {page.headings && page.headings.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h4 className="text-md font-semibold text-white mb-3">Heading Structure</h4>
                <div className="space-y-1">
                  {page.headings.map((h, i) => (
                    <div
                      key={i}
                      className="text-sm text-gray-300"
                      style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
                    >
                      <span className="text-purple-400">H{h.level}</span> {h.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Phase tasks rendered via AuditTaskList below */}
            <AuditTaskList
              tasks={getTasksByPhase('ContentQuality')}
              expandedTaskIds={expandedTaskIds}
              onToggleExpand={toggleTaskExpanded}
              onExpandAll={(ids) => setExpandedTaskIds(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next; })}
              onCollapseAll={(ids) => setExpandedTaskIds(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; })}
              onUpdateStatus={updateTaskStatus}
              onSuggestionClick={handleSuggestionClick}
              isUpdatingTask={isUpdatingTask}
            />
          </div>
        )}

        {activeTab === 'schema' && audit && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">Schema & Visual Checks</h3>
            <AuditTaskSummary tasks={getTasksByPhase('VisualSchema')} />
            {audit.visualSchemaChecks.map(check => <AuditCheckItem key={check.ruleId} check={check} />)}

            {/* Schema Details */}
            {page.schemaTypes && page.schemaTypes.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h4 className="text-md font-semibold text-white mb-3">Schema Types Found</h4>
                <div className="flex flex-wrap gap-2">
                  {page.schemaTypes.map((type, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Images */}
            {page.images && page.images.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h4 className="text-md font-semibold text-white mb-3">
                  Images ({page.images.length})
                </h4>
                <div className="space-y-2">
                  {page.images.slice(0, 10).map((img, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs ${img.alt ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                        {img.alt ? 'Has Alt' : 'No Alt'}
                      </span>
                      <span className="text-gray-400 truncate flex-1">
                        {img.alt || '(no alt text)'}
                      </span>
                      <span className="text-gray-500 text-xs truncate max-w-xs">
                        {img.src}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Phase tasks rendered via AuditTaskList below */}
            <AuditTaskList
              tasks={getTasksByPhase('VisualSchema')}
              expandedTaskIds={expandedTaskIds}
              onToggleExpand={toggleTaskExpanded}
              onExpandAll={(ids) => setExpandedTaskIds(prev => { const next = new Set(prev); ids.forEach(id => next.add(id)); return next; })}
              onCollapseAll={(ids) => setExpandedTaskIds(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next; })}
              onUpdateStatus={updateTaskStatus}
              onSuggestionClick={handleSuggestionClick}
              isUpdatingTask={isUpdatingTask}
            />
          </div>
        )}

        {activeTab === 'semantic_ai' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">AI Semantic Analysis</h3>
              <Button
                onClick={() => {
                  console.log('[PageAuditDetailV2] Run Analysis clicked', {
                    hasContentMarkdown: !!page?.contentMarkdown,
                    contentMarkdownLength: page?.contentMarkdown?.length,
                    url: page?.url,
                    isAnalyzingSemantic
                  });
                  if (page?.contentMarkdown) {
                    console.log('[PageAuditDetailV2] Calling runSemanticAnalysis...');
                    runSemanticAnalysis(page.contentMarkdown, page.url);
                  } else {
                    console.log('[PageAuditDetailV2] No contentMarkdown available');
                  }
                }}
                disabled={isAnalyzingSemantic || !page?.contentMarkdown}
                variant="primary"
              >
                {isAnalyzingSemantic ? 'Analyzing...' : 'Run Analysis'}
              </Button>
            </div>

            {semanticError && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{semanticError}</p>
              </div>
            )}

            {!semanticResult && !isAnalyzingSemantic && !semanticError && (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">
                  Click "Run Analysis" to perform AI semantic analysis of this page.
                </p>
                <p className="text-gray-500 text-sm">
                  This will analyze content quality, semantic relevance, and provide improvement suggestions.
                </p>
              </div>
            )}

            {semanticResult && page?.contentMarkdown && (
              <SemanticAnalysisPanel
                result={semanticResult}
                pageContent={page.contentMarkdown}
                businessInfo={state.businessInfo}
                dispatch={dispatch}
                onActionFixGenerated={updateActionFix}
              />
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Action Items ({tasks.filter(t => t.status === 'pending').length} pending)
              </h3>
              <div className="flex items-center gap-3">
                {/* Batch AI Suggestions Button */}
                {tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length > 0 && project && page && (
                  <button
                    onClick={() => setShowBatchSuggestionModal(true)}
                    className="px-3 py-1 text-sm rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 flex items-center gap-1"
                  >
                    <span>🤖</span> Generate All AI Suggestions
                  </button>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={tasks.some(t => t.status === 'completed' || t.status === 'dismissed')}
                    onChange={() => { }}
                    className="rounded border-gray-600 bg-gray-800"
                  />
                  Show completed
                </label>
                {tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length > 0 && (
                  <button
                    onClick={async () => {
                      if (confirm('Mark all pending tasks as completed?')) {
                        for (const task of tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')) {
                          await updateTaskStatus(task.id, 'completed');
                        }
                      }
                    }}
                    className="px-3 py-1 text-sm rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  >
                    Mark All Done
                  </button>
                )}
                <span className="text-gray-600">|</span>
                <button
                  onClick={expandAllTasks}
                  className="px-3 py-1 text-sm rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAllTasks}
                  className="px-3 py-1 text-sm rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                >
                  Collapse All
                </button>
              </div>
            </div>
            {tasks.length === 0 ? (
              <p className="text-gray-500">No action items for this page</p>
            ) : (
              tasks.map(task => {
                const isExpanded = expandedTaskIds.has(task.id);
                const hasRemediation = task.remediation && task.remediation.trim().length > 0;
                // Create a short preview for collapsed view (first 100 chars, strip markdown)
                const remediationPreview = hasRemediation
                  ? task.remediation.replace(/[#*_`\[\]]/g, '').substring(0, 100) + (task.remediation.length > 100 ? '...' : '')
                  : '';

                return (
                  <div
                    key={task.id}
                    className={`rounded-lg border ${task.status === 'completed'
                      ? 'border-green-500/30 bg-green-500/5'
                      : task.priority === 'critical'
                        ? 'border-red-500/30 bg-red-500/5'
                        : task.priority === 'high'
                          ? 'border-orange-500/30 bg-orange-500/5'
                          : 'border-gray-700 bg-gray-800/50'
                      }`}
                  >
                    {/* Collapsible Header - Always visible */}
                    <div
                      className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => toggleTaskExpanded(task.id)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Expand/Collapse indicator */}
                          <span className="text-gray-500 text-sm flex-shrink-0">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-medium flex-shrink-0 ${task.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                            task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                              task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-500/20 text-gray-400'
                            }`}>
                            {task.priority}
                          </span>
                          <span className="font-medium text-white truncate">{task.title}</span>
                          {/* Show preview in collapsed view */}
                          {!isExpanded && hasRemediation && (
                            <span className="text-xs text-purple-400/70 truncate ml-2 hidden sm:inline">
                              — {remediationPreview}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* AI processed indicator */}
                          {hasRemediation && (
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400" title="AI suggestion applied">
                              🤖 Processed
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded ${task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                              task.status === 'dismissed' ? 'bg-gray-600/20 text-gray-500' :
                                'bg-gray-500/20 text-gray-400'
                            }`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-700/50">
                        <div className="pt-3">
                          <p className="text-sm text-gray-400">{task.description}</p>
                          {hasRemediation && (
                            <div className="text-sm text-purple-400 mt-3">
                              <span className="font-medium block mb-1">Fix:</span>
                              <div className="prose prose-compact max-w-none">
                                <ReactMarkdown>{task.remediation}</ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-700/50">
                            {task.status !== 'completed' && task.status !== 'dismissed' && (
                              <>
                                {task.status === 'pending' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, 'in_progress'); }}
                                    disabled={isUpdatingTask === task.id}
                                    className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50"
                                  >
                                    Start
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, 'completed'); }}
                                  disabled={isUpdatingTask === task.id}
                                  className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                                >
                                  {isUpdatingTask === task.id ? '...' : 'Done'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const reason = prompt('Why are you dismissing this task?');
                                    if (reason !== null) {
                                      updateTaskStatus(task.id, 'dismissed', reason || 'No reason provided');
                                    }
                                  }}
                                  disabled={isUpdatingTask === task.id}
                                  className="px-2 py-1 text-xs rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 disabled:opacity-50"
                                >
                                  Dismiss
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTaskForSuggestion(task);
                                    setShowSuggestionModal(true);
                                  }}
                                  className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                                >
                                  🤖 AI Suggestion
                                </button>
                              </>
                            )}
                            {task.status === 'completed' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, 'pending'); }}
                                disabled={isUpdatingTask === task.id}
                                className="px-2 py-1 text-xs rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 disabled:opacity-50"
                              >
                                Reopen
                              </button>
                            )}
                            {task.status === 'dismissed' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); updateTaskStatus(task.id, 'pending'); }}
                                disabled={isUpdatingTask === task.id}
                                className="px-2 py-1 text-xs rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 disabled:opacity-50"
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'raw_data' && page && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white mb-4">Extracted Page Data</h3>

            {/* Extraction Status - Debug Info */}
            <div className="space-y-3 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
              <h4 className="text-md font-medium text-purple-400 border-b border-gray-700 pb-2">Extraction Status</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${page.apifyCrawled ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm text-gray-300">Apify Extraction</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${page.apifyCrawled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {page.apifyCrawled ? 'Success' : 'Not run / Failed'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${page.firecrawlCrawled ? 'bg-orange-500' : 'bg-gray-500'}`}></span>
                  <span className="text-sm text-gray-300">Firecrawl Fallback</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${page.firecrawlCrawled ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {page.firecrawlCrawled ? 'Used' : 'Not needed'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${page.jinaCrawled ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm text-gray-300">Jina Extraction</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${page.jinaCrawled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {page.jinaCrawled ? 'Success' : 'Not run / Failed'}
                  </span>
                </div>
              </div>
              {!page.apifyCrawled && !page.firecrawlCrawled && !page.jinaCrawled && (
                <p className="text-sm text-yellow-400 mt-2">
                  ⚠️ No extraction succeeded. Check API keys in Settings and try Re-extract.
                </p>
              )}
              {(page.apifyCrawled || page.firecrawlCrawled) && !page.jinaCrawled && (
                <p className="text-sm text-yellow-400 mt-2">
                  ⚠️ Only {page.firecrawlCrawled ? 'Firecrawl' : 'Apify'} succeeded. Schema/technical data available, but no markdown content.
                </p>
              )}
              {!page.apifyCrawled && !page.firecrawlCrawled && page.jinaCrawled && (
                <p className="text-sm text-yellow-400 mt-2">
                  ⚠️ Only Jina succeeded. Markdown content available, but no schema or technical data (check Apify token).
                </p>
              )}
              {page.firecrawlCrawled && (
                <p className="text-sm text-orange-400 mt-2">
                  ℹ️ Firecrawl was used as fallback because Apify extraction failed.
                </p>
              )}
            </div>

            {/* Basic Info */}
            <div className="space-y-3">
              <h4 className="text-md font-medium text-gray-300 border-b border-gray-700 pb-2">Basic Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase">URL</label>
                  <div className="flex items-start gap-2">
                    <p className="text-sm text-white font-mono break-all">{page.url}</p>
                    <AuditButton url={page.url} variant="icon" size="sm" className="flex-shrink-0 mt-0.5" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Path</label>
                  <p className="text-sm text-white font-mono">{page.path || '/'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Status Code</label>
                  <p className={`text-sm font-bold ${page.statusCode === 200 ? 'text-green-400' : 'text-red-400'}`}>
                    {page.statusCode || 'Not fetched'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Crawl Status</label>
                  <p className={`text-sm ${page.crawlStatus === 'crawled' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {page.crawlStatus}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Discovered Via</label>
                  <p className="text-sm text-gray-300">{page.discoveredVia}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Crawled At</label>
                  <p className="text-sm text-gray-300">
                    {page.crawledAt ? new Date(page.crawledAt).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            {/* SEO Meta */}
            <div className="space-y-3">
              <h4 className="text-md font-medium text-gray-300 border-b border-gray-700 pb-2">SEO Metadata</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase">Title</label>
                  <p className="text-sm text-white bg-gray-800 p-2 rounded">{page.title || <span className="text-gray-500 italic">Not extracted</span>}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Meta Description</label>
                  <p className="text-sm text-white bg-gray-800 p-2 rounded">{page.metaDescription || <span className="text-gray-500 italic">Not extracted</span>}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">H1</label>
                  <p className="text-sm text-white bg-gray-800 p-2 rounded">{page.h1 || <span className="text-gray-500 italic">Not extracted</span>}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Canonical URL</label>
                  <p className="text-sm text-white font-mono bg-gray-800 p-2 rounded">{page.canonicalUrl || <span className="text-gray-500 italic">Not set</span>}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">Robots Meta</label>
                  <p className="text-sm text-white bg-gray-800 p-2 rounded">{page.robotsMeta || <span className="text-gray-500 italic">Not set</span>}</p>
                </div>
              </div>
            </div>

            {/* Performance */}
            <div className="space-y-3">
              <h4 className="text-md font-medium text-gray-300 border-b border-gray-700 pb-2">Performance Metrics</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-800 p-3 rounded">
                  <label className="text-xs text-gray-500 uppercase">Word Count</label>
                  <p className="text-lg font-bold text-white">{page.wordCount || 0}</p>
                </div>
                <div className="bg-gray-800 p-3 rounded">
                  <label className="text-xs text-gray-500 uppercase">TTFB</label>
                  <p className={`text-lg font-bold ${(page.ttfbMs || 0) < 800 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {page.ttfbMs ? `${page.ttfbMs}ms` : '-'}
                  </p>
                </div>
                <div className="bg-gray-800 p-3 rounded">
                  <label className="text-xs text-gray-500 uppercase">Load Time</label>
                  <p className="text-lg font-bold text-white">{page.loadTimeMs ? `${page.loadTimeMs}ms` : '-'}</p>
                </div>
                <div className="bg-gray-800 p-3 rounded">
                  <label className="text-xs text-gray-500 uppercase">HTML Size</label>
                  <p className="text-lg font-bold text-white">{page.htmlSizeKb ? `${page.htmlSizeKb}KB` : '-'}</p>
                </div>
              </div>
            </div>

            {/* Headings */}
            {page.headings && page.headings.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-300 border-b border-gray-700 pb-2">
                  Headings ({page.headings.length})
                </h4>
                <div className="bg-gray-800 p-4 rounded max-h-60 overflow-y-auto">
                  {page.headings.map((h, i) => (
                    <div
                      key={i}
                      className="text-sm text-gray-300 py-1"
                      style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
                    >
                      <span className="text-purple-400 font-mono mr-2">H{h.level}</span>
                      {h.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {page.links && page.links.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-300 border-b border-gray-700 pb-2">
                  Links ({page.links.length})
                </h4>
                <div className="bg-gray-800 p-4 rounded max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-left">
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Text</th>
                        <th className="pb-2">URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {page.links.slice(0, 50).map((link, i) => (
                        <tr key={i} className="border-t border-gray-700">
                          <td className="py-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${link.isInternal ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                              }`}>
                              {link.isInternal ? 'INT' : 'EXT'}
                            </span>
                          </td>
                          <td className="py-1 text-gray-300 max-w-xs truncate">{link.text || '(no text)'}</td>
                          <td className="py-1 text-gray-400 font-mono text-xs max-w-xs truncate">{link.href}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {page.links.length > 50 && (
                    <p className="text-gray-500 text-sm mt-2">...and {page.links.length - 50} more links</p>
                  )}
                </div>
              </div>
            )}

            {/* Images */}
            {page.images && page.images.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-300 border-b border-gray-700 pb-2">
                  Images ({page.images.length})
                </h4>
                <div className="bg-gray-800 p-4 rounded max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-left">
                        <th className="pb-2">Alt</th>
                        <th className="pb-2">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {page.images.slice(0, 30).map((img, i) => (
                        <tr key={i} className="border-t border-gray-700">
                          <td className="py-1">
                            {img.alt ? (
                              <span className="text-gray-300">{img.alt}</span>
                            ) : (
                              <span className="text-red-400 italic">Missing alt</span>
                            )}
                          </td>
                          <td className="py-1 text-gray-400 font-mono text-xs max-w-md truncate">{img.src}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Schema Types */}
            {page.schemaTypes && page.schemaTypes.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-300 border-b border-gray-700 pb-2">
                  Schema Types ({page.schemaTypes.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {page.schemaTypes.map((type, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Schema JSON */}
            {page.schemaJson && (
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-300 border-b border-gray-700 pb-2">Schema JSON</h4>
                <pre className="bg-gray-800 p-4 rounded text-xs text-gray-300 overflow-x-auto max-h-60">
                  {JSON.stringify(page.schemaJson, null, 2)}
                </pre>
              </div>
            )}

            {/* Content Markdown */}
            {page.contentMarkdown && (
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-300 border-b border-gray-700 pb-2">
                  Content Markdown ({page.contentMarkdown.length} chars)
                </h4>
                <pre className="bg-gray-800 p-4 rounded text-xs text-gray-300 overflow-x-auto max-h-80 whitespace-pre-wrap">
                  {page.contentMarkdown.slice(0, 5000)}
                  {page.contentMarkdown.length > 5000 && '\n\n... (truncated)'}
                </pre>
              </div>
            )}

            {/* Crawl Error */}
            {page.crawlError && (
              <div className="space-y-3">
                <h4 className="text-md font-medium text-red-400 border-b border-red-500/30 pb-2">Crawl Error</h4>
                <p className="text-sm text-red-300 bg-red-900/20 p-3 rounded">{page.crawlError}</p>
              </div>
            )}

            {/* Content Hash */}
            <div className="space-y-3">
              <h4 className="text-md font-medium text-gray-300 border-b border-gray-700 pb-2">Technical</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-gray-500 uppercase">Content Hash</label>
                  <p className="text-gray-400 font-mono text-xs">{page.contentHash || 'Not computed'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">DOM Nodes</label>
                  <p className="text-gray-300">{page.domNodes || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* AI Suggestion Review Modal */}
      {project && (
        <AISuggestionReviewModal
          isOpen={showSuggestionModal}
          task={selectedTaskForSuggestion}
          page={page}
          project={project}
          businessInfo={state.businessInfo}
          dispatch={dispatch}
          onClose={() => {
            setShowSuggestionModal(false);
            setSelectedTaskForSuggestion(null);
          }}
          onTaskUpdated={(taskId, newRemediation) => {
            // Update local task state with new remediation
            setTasks(prev => prev.map(t =>
              t.id === taskId
                ? { ...t, remediation: newRemediation }
                : t
            ));
          }}
        />
      )}

      {/* Batch AI Suggestion Review Modal */}
      {project && page && (
        <BatchSuggestionReviewModal
          isOpen={showBatchSuggestionModal}
          tasks={tasks.filter(t => t.status === 'pending' || t.status === 'in_progress')}
          page={page}
          project={project}
          businessInfo={state.businessInfo}
          dispatch={dispatch}
          onClose={() => setShowBatchSuggestionModal(false)}
          onTasksUpdated={() => {
            // Reload page data to get updated tasks
            loadPageData();
          }}
        />
      )}

      {/* SEO Audit Report Modal */}
      {project && page && (
        <SEOAuditReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          project={project}
          pages={[page]}
          tasks={tasks}
          suggestions={suggestions}
          scope="page"
          pageId={pageId}
        />
      )}
    </div>
  );
};

// Database mappers
const mapDbPageToModel = (db: any): SitePageRecord => ({
  id: db.id,
  projectId: db.project_id,
  url: db.url,
  path: db.path,
  discoveredVia: db.discovered_via,
  crawlStatus: db.crawl_status,
  crawlError: db.crawl_error,
  crawledAt: db.crawled_at,
  apifyCrawled: db.apify_crawled,
  jinaCrawled: db.jina_crawled,
  contentHash: db.content_hash,
  title: db.title,
  metaDescription: db.meta_description,
  h1: db.h1,
  wordCount: db.word_count,
  statusCode: db.status_code,
  canonicalUrl: db.canonical_url,
  robotsMeta: db.robots_meta,
  schemaTypes: db.schema_types,
  schemaJson: db.schema_json,
  ttfbMs: db.ttfb_ms,
  loadTimeMs: db.load_time_ms,
  domNodes: db.dom_nodes,
  htmlSizeKb: db.html_size_kb,
  headings: db.headings,
  links: db.links,
  images: db.images,
  contentMarkdown: db.content_markdown,
  latestAuditId: db.latest_audit_id,
  latestAuditScore: db.latest_audit_score,
  latestAuditAt: db.latest_audit_at,
});

const mapDbAuditToModel = (db: any): PageAudit => ({
  id: db.id,
  pageId: db.page_id,
  projectId: db.project_id,
  version: db.version,
  overallScore: db.overall_score,
  technicalScore: db.technical_score,
  semanticScore: db.semantic_score,
  linkStructureScore: db.link_structure_score,
  contentQualityScore: db.content_quality_score,
  visualSchemaScore: db.visual_schema_score,
  technicalChecks: db.technical_checks || [],
  semanticChecks: db.semantic_checks || [],
  linkStructureChecks: db.link_structure_checks || [],
  contentQualityChecks: db.content_quality_checks || [],
  visualSchemaChecks: db.visual_schema_checks || [],
  aiAnalysisComplete: db.ai_analysis_complete,
  ceAlignmentScore: db.ce_alignment_score,
  ceAlignmentExplanation: db.ce_alignment_explanation,
  scAlignmentScore: db.sc_alignment_score,
  scAlignmentExplanation: db.sc_alignment_explanation,
  csiAlignmentScore: db.csi_alignment_score,
  csiAlignmentExplanation: db.csi_alignment_explanation,
  contentSuggestions: db.content_suggestions,
  summary: db.summary,
  criticalIssuesCount: db.critical_issues_count,
  highIssuesCount: db.high_issues_count,
  mediumIssuesCount: db.medium_issues_count,
  lowIssuesCount: db.low_issues_count,
  contentHashAtAudit: db.content_hash_at_audit,
  auditType: db.audit_type,
  createdAt: db.created_at,
});

const mapDbTaskToModel = (db: any): AuditTask => ({
  id: db.id,
  projectId: db.project_id,
  pageId: db.page_id,
  auditId: db.audit_id,
  ruleId: db.rule_id,
  title: db.title,
  description: db.description,
  remediation: db.remediation,
  priority: db.priority,
  estimatedImpact: db.estimated_impact,
  phase: db.phase,
  status: db.status,
  completedAt: db.completed_at,
  dismissedReason: db.dismissed_reason,
  issueGroup: db.issue_group,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

const mapDbProjectToModel = (db: any): SiteAnalysisProject => ({
  id: db.id,
  userId: db.user_id,
  name: db.name,
  domain: db.domain,
  status: db.status,
  errorMessage: db.error_message,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
  lastAuditAt: db.last_audit_at,
  inputMethod: db.input_method || 'url',
  sitemapUrl: db.sitemap_url,
  linkedMapId: db.linked_map_id,
  centralEntity: db.central_entity,
  centralEntityType: db.central_entity_type,
  sourceContext: db.source_context,
  sourceContextType: db.source_context_type,
  centralSearchIntent: db.central_search_intent,
  pillarsValidated: db.pillars_validated || false,
  pillarsValidatedAt: db.pillars_validated_at,
  pillarsSource: db.pillars_source,
  pageCount: db.page_count,
  generatedTopicalMapId: db.generated_topical_map_id,
});

export default PageAuditDetailV2;
