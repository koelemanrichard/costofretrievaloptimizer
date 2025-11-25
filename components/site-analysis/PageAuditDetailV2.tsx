// components/site-analysis/PageAuditDetailV2.tsx
// V2 Page audit detail view with full audit breakdown

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import { SitePageRecord, PageAudit, AuditCheck, AuditTask } from '../../types';

interface PageAuditDetailV2Props {
  projectId: string;
  pageId: string;
  onBack: () => void;
}

export const PageAuditDetailV2: React.FC<PageAuditDetailV2Props> = ({
  projectId,
  pageId,
  onBack,
}) => {
  const { state } = useAppState();

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
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'semantic' | 'links' | 'content' | 'schema' | 'tasks'>('overview');

  useEffect(() => {
    loadPageData();
  }, [pageId]);

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

      setTasks(tasksData?.map(mapDbTaskToModel) || []);

    } catch (err) {
      console.error('Failed to load page data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500/20';
    if (score >= 60) return 'bg-yellow-500/20';
    if (score >= 40) return 'bg-orange-500/20';
    return 'bg-red-500/20';
  };

  const renderPhaseScore = (name: string, score: number, checks: AuditCheck[]) => {
    const passed = checks.filter(c => c.passed).length;
    return (
      <div className={`p-4 rounded-lg ${getScoreBgColor(score)}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">{name}</span>
          <span className={`text-xl font-bold ${getScoreColor(score)}`}>{score}</span>
        </div>
        <div className="text-xs text-gray-500">
          {passed}/{checks.length} checks passed
        </div>
      </div>
    );
  };

  const renderCheckItem = (check: AuditCheck) => (
    <div
      key={check.ruleId}
      className={`p-3 rounded-lg border ${
        check.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {check.passed ? (
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className={`font-medium ${check.passed ? 'text-green-300' : 'text-red-300'}`}>
            {check.ruleName}
          </span>
        </div>
        <span className={`text-sm font-bold ${getScoreColor(check.score)}`}>
          {check.score}
        </span>
      </div>
      <p className="text-sm text-gray-400 mt-2 ml-7">{check.details}</p>
      {!check.passed && check.suggestion && (
        <p className="text-sm text-purple-400 mt-2 ml-7">
          <span className="font-medium">Fix:</span> {check.suggestion}
        </p>
      )}
    </div>
  );

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
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white text-sm mb-2 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h2 className="text-xl font-bold text-white">{page.title || page.url}</h2>
            <a
              href={page.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-sm"
            >
              {page.url} ↗
            </a>
          </div>
          {audit && (
            <div className="text-right">
              <div className={`text-4xl font-bold ${getScoreColor(audit.overallScore)}`}>
                {audit.overallScore}
              </div>
              <p className="text-sm text-gray-400">Overall Score</p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-500">Status Code</p>
            <p className={`text-lg font-bold ${page.statusCode === 200 ? 'text-green-400' : 'text-red-400'}`}>
              {page.statusCode || '-'}
            </p>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-500">Word Count</p>
            <p className="text-lg font-bold text-white">{page.wordCount || '-'}</p>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-500">TTFB</p>
            <p className={`text-lg font-bold ${(page.ttfbMs || 0) < 800 ? 'text-green-400' : 'text-yellow-400'}`}>
              {page.ttfbMs ? `${page.ttfbMs}ms` : '-'}
            </p>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-500">Schema Types</p>
            <p className="text-lg font-bold text-white">{page.schemaTypes?.length || 0}</p>
          </div>
        </div>
      </Card>

      {/* Phase Scores */}
      {audit && (
        <div className="grid grid-cols-5 gap-4">
          {renderPhaseScore('Technical', audit.technicalScore, audit.technicalChecks)}
          {renderPhaseScore('Semantic', audit.semanticScore, audit.semanticChecks)}
          {renderPhaseScore('Link Structure', audit.linkStructureScore, audit.linkStructureChecks)}
          {renderPhaseScore('Content', audit.contentQualityScore, audit.contentQualityChecks)}
          {renderPhaseScore('Schema', audit.visualSchemaScore, audit.visualSchemaChecks)}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex gap-6">
          {['overview', 'technical', 'semantic', 'links', 'content', 'schema', 'tasks'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'tasks' && tasks.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                  {tasks.filter(t => t.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
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
            {audit.technicalChecks.map(renderCheckItem)}
          </div>
        )}

        {activeTab === 'semantic' && audit && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">Semantic Checks</h3>
            {audit.semanticChecks.map(renderCheckItem)}
          </div>
        )}

        {activeTab === 'links' && audit && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">Link Structure Checks</h3>
            {audit.linkStructureChecks.map(renderCheckItem)}

            {/* Link Details */}
            {page.links && page.links.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h4 className="text-md font-semibold text-white mb-3">
                  Links Found ({page.links.length})
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {page.links.slice(0, 20).map((link, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        link.isInternal ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {link.isInternal ? 'Internal' : 'External'}
                      </span>
                      <span className="text-gray-400 truncate flex-1">{link.text || '(no text)'}</span>
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-purple-400 truncate max-w-xs">
                        {link.href}
                      </a>
                    </div>
                  ))}
                  {page.links.length > 20 && (
                    <p className="text-gray-500 text-sm">...and {page.links.length - 20} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'content' && audit && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">Content Quality Checks</h3>
            {audit.contentQualityChecks.map(renderCheckItem)}

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
          </div>
        )}

        {activeTab === 'schema' && audit && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">Schema & Visual Checks</h3>
            {audit.visualSchemaChecks.map(renderCheckItem)}

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
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        img.alt ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
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
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white mb-4">
              Action Items ({tasks.filter(t => t.status === 'pending').length} pending)
            </h3>
            {tasks.length === 0 ? (
              <p className="text-gray-500">No action items for this page</p>
            ) : (
              tasks.map(task => (
                <div
                  key={task.id}
                  className={`p-4 rounded-lg border ${
                    task.status === 'completed'
                      ? 'border-green-500/30 bg-green-500/5'
                      : task.priority === 'critical'
                        ? 'border-red-500/30 bg-red-500/5'
                        : task.priority === 'high'
                          ? 'border-orange-500/30 bg-orange-500/5'
                          : 'border-gray-700 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-medium ${
                          task.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                          task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {task.priority}
                        </span>
                        <span className="font-medium text-white">{task.title}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{task.description}</p>
                      {task.remediation && (
                        <p className="text-sm text-purple-400 mt-2">
                          <span className="font-medium">Fix:</span> {task.remediation}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>
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

export default PageAuditDetailV2;
