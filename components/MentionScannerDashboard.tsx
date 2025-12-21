// components/MentionScannerDashboard.tsx
// UI for Mention/Entity Authority Scanner

import React, { useState, useCallback, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';
import { useAppState } from '../state/appState';
import {
  runMentionScanner,
  generateBusinessSummary,
  generateTechnicalReport,
} from '../services/ai/mentionScanner';
import {
  saveEATScannerAudit,
  loadEATScannerAuditHistory,
  StoredEATScannerAudit,
} from '../services/auditPersistenceService';
import { getSupabaseClient } from '../services/supabaseClient';
import type {
  MentionScannerConfig,
  MentionScannerProgress,
  MentionScannerResult,
  BusinessInfo,
} from '../types';

interface MentionScannerDashboardProps {
  businessInfo: BusinessInfo;
  initialEntityName?: string;
  mapId?: string;
  onClose: () => void;
}

export const MentionScannerDashboard: React.FC<MentionScannerDashboardProps> = ({
  businessInfo,
  initialEntityName = '',
  mapId,
  onClose,
}) => {
  const { state } = useAppState();

  // Configuration state
  const [config, setConfig] = useState<MentionScannerConfig>({
    entityName: initialEntityName || businessInfo.projectName || '',
    domain: businessInfo.domain || '',
    industry: businessInfo.industry || '',
    language: businessInfo.language || 'en',
    includeReviews: true,
    includeSocialMentions: true,
    includeNewsArticles: true,
  });

  // Progress and results state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<MentionScannerProgress | null>(null);
  const [result, setResult] = useState<MentionScannerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // History state
  const [history, setHistory] = useState<StoredEATScannerAudit[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // View toggle
  const [viewMode, setViewMode] = useState<'business' | 'technical'>('business');
  const [activeTab, setActiveTab] = useState<'overview' | 'eat' | 'reputation' | 'recommendations'>('overview');

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!mapId || !state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) return;

      setLoadingHistory(true);
      try {
        const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
        const historyData = await loadEATScannerAuditHistory(supabase, mapId);
        setHistory(historyData);
      } catch (err) {
        console.error('[MentionScanner] Failed to load history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [mapId, state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  const handleRunScan = useCallback(async () => {
    if (!config.entityName) {
      setError('Entity name is required');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);
    setSaveStatus('idle');

    try {
      const scanResult = await runMentionScanner(
        config,
        businessInfo,
        setProgress
      );
      setResult(scanResult);

      // Save to database if we have the necessary credentials
      if (mapId && state.user?.id && state.businessInfo.supabaseUrl && state.businessInfo.supabaseAnonKey) {
        setSaveStatus('saving');
        try {
          const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
          const savedId = await saveEATScannerAudit(
            supabase,
            mapId,
            state.user.id,
            scanResult,
            {
              entityName: config.entityName,
              domain: config.domain || undefined,
              industry: config.industry || undefined,
              language: config.language || 'en',
            }
          );

          if (savedId) {
            console.log('[MentionScanner] Saved audit with ID:', savedId);
            setSaveStatus('saved');
            // Refresh history
            const historyData = await loadEATScannerAuditHistory(supabase, mapId);
            setHistory(historyData);
          } else {
            console.warn('[MentionScanner] Failed to save audit');
            setSaveStatus('error');
          }
        } catch (saveErr) {
          console.error('[MentionScanner] Error saving audit:', saveErr);
          setSaveStatus('error');
        }
      } else {
        console.log('[MentionScanner] Skipping save - missing mapId or user credentials');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
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
      filename = `mention-scan-${result.entityName.replace(/\s+/g, '-')}.md`;
      mimeType = 'text/markdown';
    } else {
      content = JSON.stringify(result, null, 2);
      filename = `mention-scan-${result.entityName.replace(/\s+/g, '-')}.json`;
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

  const handleLoadHistoricalAudit = useCallback((audit: StoredEATScannerAudit) => {
    // Convert stored audit back to MentionScannerResult format
    const loadedResult: MentionScannerResult = {
      entityName: audit.entity_name,
      domain: audit.domain || undefined,
      timestamp: audit.created_at,
      entityAuthority: audit.entity_authority || {} as any,
      reputationSignals: audit.reputation_signals || [],
      coOccurrences: audit.co_occurrences || [],
      topicalAssociations: [],
      eatBreakdown: audit.eat_breakdown || {
        expertise: { score: audit.expertise_score || 0, signals: [] },
        authority: { score: audit.authority_score || 0, signals: [] },
        trust: { score: audit.trust_score || 0, signals: [] },
      } as any,
      eatScore: audit.overall_eat_score || 0,
      overallSentiment: (audit.overall_sentiment as 'positive' | 'negative' | 'neutral' | 'mixed') || 'neutral',
      recommendations: audit.recommendations || [],
    };

    setResult(loadedResult);
    setConfig(c => ({
      ...c,
      entityName: audit.entity_name,
      domain: audit.domain || '',
      industry: audit.industry || '',
    }));
    setShowHistory(false);
    setSaveStatus('idle'); // Already saved in history
  }, []);

  const renderConfiguration = () => (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-white mb-4">Entity Authority Scanner</h2>
      <p className="text-gray-400 text-sm mb-6">
        Analyze E-A-T (Expertise, Authority, Trust) signals for any entity or brand.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Entity/Brand Name *</label>
          <input
            type="text"
            value={config.entityName}
            onChange={(e) => setConfig(c => ({ ...c, entityName: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            placeholder="e.g., Anthropic, OpenAI, Your Company"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Domain (optional)</label>
          <input
            type="text"
            value={config.domain || ''}
            onChange={(e) => setConfig(c => ({ ...c, domain: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            placeholder="e.g., example.com"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Industry (optional)</label>
          <input
            type="text"
            value={config.industry || ''}
            onChange={(e) => setConfig(c => ({ ...c, industry: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            placeholder="e.g., AI, SaaS, Healthcare"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Language</label>
          <select
            value={config.language}
            onChange={(e) => setConfig(c => ({ ...c, language: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
          >
            <option value="en">English</option>
            <option value="nl">Dutch</option>
            <option value="de">German</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-4">
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={config.includeReviews}
            onChange={(e) => setConfig(c => ({ ...c, includeReviews: e.target.checked }))}
            className="rounded bg-gray-800 border-gray-700"
          />
          Include Reviews
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={config.includeSocialMentions}
            onChange={(e) => setConfig(c => ({ ...c, includeSocialMentions: e.target.checked }))}
            className="rounded bg-gray-800 border-gray-700"
          />
          Social Mentions
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={config.includeNewsArticles}
            onChange={(e) => setConfig(c => ({ ...c, includeNewsArticles: e.target.checked }))}
            className="rounded bg-gray-800 border-gray-700"
          />
          News Articles
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
            onClick={handleRunScan}
            disabled={isRunning || !config.entityName}
            className="bg-purple-700 hover:bg-purple-600"
          >
            {isRunning ? <><Loader className="w-4 h-4 mr-2" /> Scanning...</> : 'Run Scan'}
          </Button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-lg font-medium text-white mb-3">Previous Scans</h3>
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
                      <span className="text-white font-medium">{audit.entity_name}</span>
                      {audit.domain && <span className="text-gray-500 ml-2">({audit.domain})</span>}
                    </div>
                    <span className={`text-sm font-bold ${
                      (audit.overall_eat_score || 0) >= 70 ? 'text-green-400' :
                      (audit.overall_eat_score || 0) >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {audit.overall_eat_score || 0}/100
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(audit.created_at).toLocaleDateString()} {new Date(audit.created_at).toLocaleTimeString()}
                    {audit.overall_sentiment && (
                      <span className="ml-2 capitalize">({audit.overall_sentiment})</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No previous scans found.</p>
          )}
        </div>
      )}
    </Card>
  );

  const renderProgress = () => (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-white mb-4">Scanning Entity Authority...</h2>

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
          Step {progress?.completedSteps || 0} of {progress?.totalSteps || 4}
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
                <h2 className="text-xl font-bold text-white">{result.entityName}</h2>
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
                E-A-T Score: <span className={`font-bold ${result.eatScore >= 70 ? 'text-green-400' : result.eatScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {result.eatScore}/100
                </span>
                {' '}&bull;{' '}
                Status: <span className={`font-bold ${result.entityAuthority.verificationStatus === 'verified' ? 'text-green-400' : result.entityAuthority.verificationStatus === 'partial' ? 'text-yellow-400' : 'text-red-400'}`}>
                  {result.entityAuthority.verificationStatus}
                </span>
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
          {(['overview', 'eat', 'reputation', 'recommendations'] as const).map(tab => (
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
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Identity Verification</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg ${result.entityAuthority.wikipedia?.found ? 'bg-green-900/20 border border-green-700' : 'bg-gray-800 border border-gray-700'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={result.entityAuthority.wikipedia?.found ? 'text-green-400' : 'text-gray-500'}>
                    {result.entityAuthority.wikipedia?.found ? '✓' : '✗'}
                  </span>
                  <span className="font-medium text-white">Wikipedia</span>
                </div>
                {result.entityAuthority.wikipedia?.found ? (
                  <a href={result.entityAuthority.wikipedia.pageUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">
                    View Article
                  </a>
                ) : (
                  <span className="text-sm text-gray-500">Not found</span>
                )}
              </div>

              <div className={`p-4 rounded-lg ${result.entityAuthority.wikidata ? 'bg-green-900/20 border border-green-700' : 'bg-gray-800 border border-gray-700'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={result.entityAuthority.wikidata ? 'text-green-400' : 'text-gray-500'}>
                    {result.entityAuthority.wikidata ? '✓' : '✗'}
                  </span>
                  <span className="font-medium text-white">Wikidata</span>
                </div>
                {result.entityAuthority.wikidata ? (
                  <span className="text-sm text-gray-400">{result.entityAuthority.wikidata.id}</span>
                ) : (
                  <span className="text-sm text-gray-500">Not found</span>
                )}
              </div>

              <div className={`p-4 rounded-lg ${result.entityAuthority.knowledgeGraph ? 'bg-green-900/20 border border-green-700' : 'bg-gray-800 border border-gray-700'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={result.entityAuthority.knowledgeGraph ? 'text-green-400' : 'text-gray-500'}>
                    {result.entityAuthority.knowledgeGraph ? '✓' : '✗'}
                  </span>
                  <span className="font-medium text-white">Knowledge Graph</span>
                </div>
                {result.entityAuthority.knowledgeGraph ? (
                  <span className="text-sm text-gray-400">{result.entityAuthority.knowledgeGraph.type?.join(', ')}</span>
                ) : (
                  <span className="text-sm text-gray-500">Not found</span>
                )}
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mt-6 mb-4">Overall Sentiment</h3>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
              result.overallSentiment === 'positive' ? 'bg-green-900/30 text-green-400' :
              result.overallSentiment === 'negative' ? 'bg-red-900/30 text-red-400' :
              result.overallSentiment === 'mixed' ? 'bg-yellow-900/30 text-yellow-400' :
              'bg-gray-800 text-gray-400'
            }`}>
              <span className="text-lg">
                {result.overallSentiment === 'positive' ? '😊' :
                 result.overallSentiment === 'negative' ? '😟' :
                 result.overallSentiment === 'mixed' ? '😐' : '😶'}
              </span>
              <span className="capitalize font-medium">{result.overallSentiment}</span>
            </div>
          </Card>
        )}

        {activeTab === 'eat' && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">E-A-T Breakdown</h3>

            <div className="space-y-6">
              {(['expertise', 'authority', 'trust'] as const).map(dimension => {
                const data = result.eatBreakdown[dimension];
                return (
                  <div key={dimension} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white capitalize">{dimension}</span>
                      <span className={`font-bold ${data.score >= 70 ? 'text-green-400' : data.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {data.score}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                      <div
                        className={`h-2 rounded-full ${data.score >= 70 ? 'bg-green-500' : data.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${data.score}%` }}
                      />
                    </div>
                    <div className="space-y-1">
                      {data.signals.map((signal, i) => (
                        <div key={i} className="text-sm text-gray-400 flex items-center gap-2">
                          <span className="text-green-400">+</span> {signal}
                        </div>
                      ))}
                      {data.signals.length === 0 && (
                        <div className="text-sm text-gray-500">No signals detected</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {activeTab === 'reputation' && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Reputation Signals ({result.reputationSignals.length})</h3>

            {result.reputationSignals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="pb-2">Source</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Sentiment</th>
                      <th className="pb-2">Mentions</th>
                      <th className="pb-2">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.reputationSignals.map((signal, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2 text-white">{signal.source}</td>
                        <td className="py-2 text-gray-400">{signal.sourceType.replace('_', ' ')}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            signal.sentiment === 'positive' ? 'bg-green-900/30 text-green-400' :
                            signal.sentiment === 'negative' ? 'bg-red-900/30 text-red-400' :
                            'bg-gray-700 text-gray-400'
                          }`}>
                            {signal.sentiment}
                          </span>
                        </td>
                        <td className="py-2 text-gray-400">{signal.mentionCount}</td>
                        <td className="py-2 text-gray-400">{signal.avgRating ? `${signal.avgRating}/5` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No reputation signals found.</p>
            )}

            <h3 className="text-lg font-bold text-white mt-6 mb-4">Co-Occurrences ({result.coOccurrences.length})</h3>

            {result.coOccurrences.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.coOccurrences.map((cooc, i) => (
                  <div key={i} className={`px-3 py-1 rounded-full text-sm ${
                    cooc.associationType === 'competitor' ? 'bg-red-900/30 text-red-400' :
                    cooc.associationType === 'partner' ? 'bg-green-900/30 text-green-400' :
                    cooc.associationType === 'industry_term' ? 'bg-blue-900/30 text-blue-400' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {cooc.entity} ({cooc.frequency})
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No co-occurrences found.</p>
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
                  <div className="text-xs text-gray-500 mt-2">
                    Impact: {rec.estimatedImpact}
                  </div>
                </div>
              ))}

              {result.recommendations.length === 0 && (
                <p className="text-gray-500">No recommendations - entity authority looks good!</p>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {!result && !isRunning && renderConfiguration()}
          {isRunning && renderProgress()}
          {result && renderResults()}
        </div>
      </div>
    </div>
  );
};

export default MentionScannerDashboard;
