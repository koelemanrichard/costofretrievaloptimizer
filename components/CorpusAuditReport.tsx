// components/CorpusAuditReport.tsx
// UI for Site-Wide Content Corpus Audit

import React, { useState, useCallback, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';
import { useAppState } from '../state/appState';
import { AuditButton } from './audit/AuditButton';
import {
  runCorpusAudit,
  generateBusinessSummary,
  generateTechnicalReport,
} from '../services/ai/corpusAudit';
import {
  saveCorpusAudit,
  loadCorpusAuditHistory,
  StoredCorpusAudit,
} from '../services/auditPersistenceService';
import { getSupabaseClient } from '../services/supabaseClient';
import type {
  CorpusAuditConfig,
  CorpusAuditProgress,
  CorpusAuditResult,
  BusinessInfo,
  SemanticTriple,
} from '../types';

interface CorpusAuditReportProps {
  businessInfo: BusinessInfo;
  targetEAVs?: SemanticTriple[];
  mapId?: string;
  onClose: () => void;
}

export const CorpusAuditReport: React.FC<CorpusAuditReportProps> = ({
  businessInfo,
  targetEAVs = [],
  mapId,
  onClose,
}) => {
  const { state } = useAppState();

  // Configuration state
  const [config, setConfig] = useState<CorpusAuditConfig>({
    domain: businessInfo.domain || '',
    sitemapUrl: '',
    maxPages: 50,
    targetEAVs,
    checkDuplicates: true,
    checkAnchors: true,
    checkCoverage: targetEAVs.length > 0,
  });

  // Progress and results state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<CorpusAuditProgress | null>(null);
  const [result, setResult] = useState<CorpusAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // History state
  const [history, setHistory] = useState<StoredCorpusAudit[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // View toggle
  const [viewMode, setViewMode] = useState<'business' | 'technical'>('business');
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'issues' | 'recommendations'>('overview');

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!mapId || !state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) return;

      setLoadingHistory(true);
      try {
        const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
        const historyData = await loadCorpusAuditHistory(supabase, mapId);
        setHistory(historyData);
      } catch (err) {
        console.error('[CorpusAudit] Failed to load history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [mapId, state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  const handleRunAudit = useCallback(async () => {
    if (!config.domain) {
      setError('Domain is required');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);
    setSaveStatus('idle');

    try {
      const auditResult = await runCorpusAudit(
        config,
        businessInfo,
        setProgress
      );
      setResult(auditResult);

      // Save to database if we have the necessary credentials
      if (mapId && state.user?.id && state.businessInfo.supabaseUrl && state.businessInfo.supabaseAnonKey) {
        setSaveStatus('saving');
        try {
          const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
          const savedId = await saveCorpusAudit(
            supabase,
            mapId,
            state.user.id,
            auditResult,
            {
              domain: config.domain,
              sitemapUrl: config.sitemapUrl || undefined,
              pageLimit: config.maxPages,
            }
          );

          if (savedId) {
            console.log('[CorpusAudit] Saved audit with ID:', savedId);
            setSaveStatus('saved');
            // Refresh history
            const historyData = await loadCorpusAuditHistory(supabase, mapId);
            setHistory(historyData);
          } else {
            console.warn('[CorpusAudit] Failed to save audit');
            setSaveStatus('error');
          }
        } catch (saveErr) {
          console.error('[CorpusAudit] Error saving audit:', saveErr);
          setSaveStatus('error');
        }
      } else {
        console.log('[CorpusAudit] Skipping save - missing mapId or user credentials');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed');
    } finally {
      setIsRunning(false);
    }
  }, [config, businessInfo, mapId, state.user?.id, state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  const handleExport = useCallback((format: 'markdown' | 'json') => {
    if (!result) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'markdown') {
      content = viewMode === 'business'
        ? generateBusinessSummary(result)
        : generateTechnicalReport(result);
      filename = `corpus-audit-${result.domain.replace(/\./g, '-')}.md`;
      mimeType = 'text/markdown';
    } else {
      content = JSON.stringify(result, null, 2);
      filename = `corpus-audit-${result.domain.replace(/\./g, '-')}.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, viewMode]);

  const handleLoadHistoricalAudit = useCallback((audit: StoredCorpusAudit) => {
    // Convert stored audit back to CorpusAuditResult format
    const loadedResult: CorpusAuditResult = {
      domain: audit.domain,
      timestamp: audit.created_at,
      pages: audit.pages || [],
      metrics: audit.metrics || {
        totalPages: audit.total_pages,
        totalWordCount: 0,
        avgWordCount: 0,
        avgInternalLinks: 0,
        avgExternalLinks: 0,
        avgHeadings: 0,
        topicalCoverage: audit.semantic_coverage_percentage || 0,
        contentFreshness: 0,
      },
      contentOverlaps: audit.content_overlaps || [],
      anchorPatterns: audit.anchor_patterns || [],
      semanticCoverage: audit.semantic_coverage || {},
      issues: audit.issues || [],
      recommendations: [],
    };

    setResult(loadedResult);
    setConfig(c => ({
      ...c,
      domain: audit.domain,
      sitemapUrl: audit.sitemap_url || '',
      maxPages: audit.page_limit || 50,
    }));
    setShowHistory(false);
    setSaveStatus('idle'); // Already saved in history
  }, []);

  const renderConfiguration = () => (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-white mb-4">Site-Wide Content Audit</h2>
      <p className="text-gray-400 text-sm mb-6">
        Analyze your entire site for content quality, duplicates, anchor patterns, and coverage gaps.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Domain *</label>
          <input
            type="text"
            value={config.domain}
            onChange={(e) => setConfig(c => ({ ...c, domain: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            placeholder="e.g., example.com"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Sitemap URL (optional)</label>
          <input
            type="text"
            value={config.sitemapUrl || ''}
            onChange={(e) => setConfig(c => ({ ...c, sitemapUrl: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            placeholder="e.g., https://example.com/sitemap.xml"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Max Pages to Audit</label>
          <input
            type="number"
            value={config.maxPages || 50}
            onChange={(e) => setConfig(c => ({ ...c, maxPages: parseInt(e.target.value) || 50 }))}
            min={1}
            max={200}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
          />
          <p className="text-xs text-gray-500 mt-1">Higher values take longer but provide more comprehensive analysis</p>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-4">
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={config.checkDuplicates}
            onChange={(e) => setConfig(c => ({ ...c, checkDuplicates: e.target.checked }))}
            className="rounded bg-gray-800 border-gray-700"
          />
          Check Duplicates
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={config.checkAnchors}
            onChange={(e) => setConfig(c => ({ ...c, checkAnchors: e.target.checked }))}
            className="rounded bg-gray-800 border-gray-700"
          />
          Analyze Anchors
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={config.checkCoverage}
            onChange={(e) => setConfig(c => ({ ...c, checkCoverage: e.target.checked }))}
            className="rounded bg-gray-800 border-gray-700"
            disabled={targetEAVs.length === 0}
          />
          Check Coverage {targetEAVs.length === 0 && '(no EAVs)'}
        </label>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-400">
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-between items-center">
        <div>
          {history.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => setShowHistory(!showHistory)}
              className="text-sm"
            >
              {showHistory ? 'Hide History' : `View History (${history.length})`}
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleRunAudit}
            disabled={isRunning || !config.domain}
            className="bg-purple-700 hover:bg-purple-600"
          >
            {isRunning ? <><Loader className="w-4 h-4 mr-2" /> Running Audit...</> : 'Run Audit'}
          </Button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-lg font-medium text-white mb-3">Previous Audits</h3>
          {loadingHistory ? (
            <div className="flex items-center justify-center p-4">
              <Loader className="w-5 h-5 text-purple-500" />
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((audit) => (
                <button
                  key={audit.id}
                  onClick={() => handleLoadHistoricalAudit(audit)}
                  className="w-full text-left p-3 bg-gray-900 hover:bg-gray-700 rounded border border-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white font-medium">{audit.domain}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-400">{audit.total_pages} pages</span>
                      {audit.semantic_coverage_percentage && (
                        <span className={`ml-2 font-bold ${
                          audit.semantic_coverage_percentage >= 70 ? 'text-green-400' :
                          audit.semantic_coverage_percentage >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {audit.semantic_coverage_percentage}% coverage
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(audit.created_at).toLocaleDateString()} {new Date(audit.created_at).toLocaleTimeString()}
                    {audit.total_overlaps > 0 && (
                      <span className="ml-2 text-yellow-400">({audit.total_overlaps} overlaps)</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No previous audits found.</p>
          )}
        </div>
      )}
    </Card>
  );

  const renderProgress = () => (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-white mb-4">Running Corpus Audit...</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{progress?.currentStep || 'Initializing...'}</span>
          <span>{progress?.progress || 0}%</span>
        </div>

        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress?.progress || 0}%` }}
          />
        </div>

        <div className="text-sm text-gray-500">
          {progress?.processedPages || 0} of {progress?.totalPages || 0} pages analyzed
        </div>
      </div>
    </Card>
  );

  const renderResults = () => {
    if (!result) return null;

    return (
      <div className="space-y-4">
        {/* Header */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">{result.domain}</h2>
                {/* Save status indicator */}
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1 text-xs text-yellow-400">
                    <Loader className="w-3 h-3" /> Saving...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-xs text-green-400">Saved to history</span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-xs text-red-400">Failed to save</span>
                )}
              </div>
              <p className="text-sm text-gray-400">
                {result.metrics.totalPages} pages &bull; {result.metrics.totalWordCount.toLocaleString()} words &bull;{' '}
                {result.issues.length} issues found
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('business')}
                  className={`px-3 py-1 rounded text-sm ${viewMode === 'business' ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Business
                </button>
                <button
                  onClick={() => setViewMode('technical')}
                  className={`px-3 py-1 rounded text-sm ${viewMode === 'technical' ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Technical
                </button>
              </div>

              <Button variant="secondary" size="sm" onClick={() => handleExport('markdown')}>
                Export MD
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleExport('json')}>
                Export JSON
              </Button>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-700 pb-2">
          {(['overview', 'pages', 'issues', 'recommendations'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-gray-800 text-white border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'issues' && result.issues.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-700 text-white text-xs rounded-full">
                  {result.issues.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Corpus Metrics</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Pages', value: result.metrics.totalPages },
                { label: 'Total Words', value: result.metrics.totalWordCount.toLocaleString() },
                { label: 'Avg Words/Page', value: result.metrics.avgWordCount },
                { label: 'Avg Internal Links', value: result.metrics.avgInternalLinks },
                { label: 'Avg External Links', value: result.metrics.avgExternalLinks },
                { label: 'Avg Headings', value: result.metrics.avgHeadings },
                { label: 'Topical Coverage', value: `${result.metrics.topicalCoverage}%` },
                { label: 'Content Freshness', value: `${result.metrics.contentFreshness}%` },
              ].map(metric => (
                <div key={metric.label} className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-white">{metric.value}</div>
                  <div className="text-sm text-gray-400">{metric.label}</div>
                </div>
              ))}
            </div>

            {result.contentOverlaps.length > 0 && (
              <>
                <h3 className="text-lg font-bold text-white mb-4">Content Overlaps ({result.contentOverlaps.length})</h3>
                <div className="space-y-2 mb-6">
                  {result.contentOverlaps.slice(0, 5).map((overlap, i) => (
                    <div key={i} className={`p-3 rounded-lg ${
                      overlap.overlapType === 'duplicate' ? 'bg-red-900/20 border border-red-700' :
                      overlap.overlapType === 'near_duplicate' ? 'bg-orange-900/20 border border-orange-700' :
                      'bg-yellow-900/20 border border-yellow-700'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300 truncate max-w-[40%]" title={overlap.pageA}>
                          {new URL(overlap.pageA).pathname}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          overlap.overlapType === 'duplicate' ? 'bg-red-700' :
                          overlap.overlapType === 'near_duplicate' ? 'bg-orange-700' :
                          'bg-yellow-700 text-black'
                        }`}>
                          {overlap.overlapPercentage}% {overlap.overlapType.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-gray-300 truncate max-w-[40%]" title={overlap.pageB}>
                          {new URL(overlap.pageB).pathname}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {result.anchorPatterns.length > 0 && (
              <>
                <h3 className="text-lg font-bold text-white mb-4">Top Anchor Patterns</h3>
                <div className="flex flex-wrap gap-2">
                  {result.anchorPatterns.slice(0, 15).map((pattern, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1 rounded-full text-sm ${
                        pattern.isOverOptimized ? 'bg-red-900/30 text-red-400' :
                        pattern.isGeneric ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-gray-700 text-gray-300'
                      }`}
                      title={`Used ${pattern.frequency} times`}
                    >
                      "{pattern.anchorText}" ({pattern.frequency})
                      {pattern.isOverOptimized && ' ⚠️'}
                      {pattern.isGeneric && ' 📢'}
                    </span>
                  ))}
                </div>
              </>
            )}
          </Card>
        )}

        {activeTab === 'pages' && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Pages Analyzed ({result.pages.length})</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="pb-2">URL</th>
                    <th className="pb-2">Words</th>
                    <th className="pb-2">Headings</th>
                    <th className="pb-2">Int. Links</th>
                    <th className="pb-2">Ext. Links</th>
                  </tr>
                </thead>
                <tbody>
                  {result.pages.map((page, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline truncate block max-w-[300px]"
                            title={page.url}
                          >
                            {new URL(page.url).pathname || '/'}
                          </a>
                          <AuditButton url={page.url} variant="icon" size="sm" />
                        </div>
                      </td>
                      <td className={`py-2 ${page.wordCount < 300 ? 'text-red-400' : 'text-gray-400'}`}>
                        {page.wordCount}
                      </td>
                      <td className="py-2 text-gray-400">{page.headings.length}</td>
                      <td className="py-2 text-gray-400">{page.internalLinks.length}</td>
                      <td className="py-2 text-gray-400">{page.externalLinks.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'issues' && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Issues Found ({result.issues.length})</h3>

            {result.issues.length > 0 ? (
              <div className="space-y-4">
                {result.issues.map((issue, i) => (
                  <div key={i} className={`p-4 rounded-lg border ${
                    issue.severity === 'critical' ? 'bg-red-900/20 border-red-700' :
                    issue.severity === 'high' ? 'bg-orange-900/20 border-orange-700' :
                    issue.severity === 'medium' ? 'bg-yellow-900/20 border-yellow-700' :
                    'bg-gray-800 border-gray-700'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        issue.severity === 'critical' ? 'bg-red-700 text-white' :
                        issue.severity === 'high' ? 'bg-orange-700 text-white' :
                        issue.severity === 'medium' ? 'bg-yellow-700 text-black' :
                        'bg-gray-600 text-white'
                      }`}>
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 uppercase">{issue.type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-white mb-2">{issue.description}</p>
                    {issue.details && (
                      <p className="text-sm text-gray-400 mb-2">{issue.details}</p>
                    )}
                    {issue.affectedUrls.length > 0 && (
                      <div className="text-sm text-gray-500">
                        Affected: {issue.affectedUrls.slice(0, 3).map(u => {
                          try {
                            return new URL(u).pathname;
                          } catch {
                            return u;
                          }
                        }).join(', ')}
                        {issue.affectedUrls.length > 3 && ` +${issue.affectedUrls.length - 3} more`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No issues found - your content corpus looks healthy!</p>
            )}
          </Card>
        )}

        {activeTab === 'recommendations' && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Recommendations ({result.recommendations.length})</h3>

            <div className="space-y-4">
              {result.recommendations.map((rec, i) => (
                <div key={i} className={`p-4 rounded-lg border ${
                  rec.priority === 'critical' ? 'bg-red-900/20 border-red-700' :
                  rec.priority === 'high' ? 'bg-orange-900/20 border-orange-700' :
                  rec.priority === 'medium' ? 'bg-yellow-900/20 border-yellow-700' :
                  'bg-gray-800 border-gray-700'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      rec.priority === 'critical' ? 'bg-red-700 text-white' :
                      rec.priority === 'high' ? 'bg-orange-700 text-white' :
                      rec.priority === 'medium' ? 'bg-yellow-700 text-black' :
                      'bg-gray-600 text-white'
                    }`}>
                      {rec.priority.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500 uppercase">{rec.type}</span>
                  </div>
                  <h4 className="font-medium text-white mb-1">{rec.title}</h4>
                  <p className="text-sm text-gray-400 mb-2">{rec.description}</p>
                  <div className="text-sm text-gray-300 bg-gray-800/50 p-2 rounded">
                    <span className="text-gray-500">Action:</span> {rec.suggestedAction}
                  </div>
                </div>
              ))}

              {result.recommendations.length === 0 && (
                <p className="text-gray-500">No recommendations - your content corpus is well-optimized!</p>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {!result && !isRunning && renderConfiguration()}
          {isRunning && renderProgress()}
          {result && renderResults()}
        </div>
      </div>
    </div>
  );
};

export default CorpusAuditReport;
