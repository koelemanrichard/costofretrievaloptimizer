// components/QueryNetworkAudit.tsx
// Query Network Audit UI Component for competitive content analysis

import React, { useState, useCallback, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAppState } from '../state/appState';
import {
  QueryNetworkAnalysisResult,
  QueryNetworkAuditConfig,
  QueryNetworkAuditProgress,
  QueryNetworkRecommendation,
  ContentGap,
  CompetitorEAV,
} from '../types';
import {
  runQueryNetworkAudit,
  generateBusinessSummary,
  generateTechnicalReport,
} from '../services/ai/queryNetworkAudit';
import {
  saveQueryNetworkAudit,
  loadQueryNetworkAuditHistory,
  StoredQueryNetworkAudit,
} from '../services/auditPersistenceService';
import { getSupabaseClient } from '../services/supabaseClient';

type ViewMode = 'business' | 'technical';
type TabId = 'overview' | 'gaps' | 'eavs' | 'recommendations' | 'queries';

interface QueryNetworkAuditProps {
  initialKeyword?: string;
  mapId?: string;
  onClose?: () => void;
}

export const QueryNetworkAudit: React.FC<QueryNetworkAuditProps> = ({
  initialKeyword = '',
  mapId,
  onClose,
}) => {
  const { state } = useAppState();
  const [seedKeyword, setSeedKeyword] = useState(initialKeyword);
  const [targetDomain, setTargetDomain] = useState(state.businessInfo.domain || '');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<QueryNetworkAuditProgress | null>(null);
  const [result, setResult] = useState<QueryNetworkAnalysisResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('business');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [error, setError] = useState<string | null>(null);

  // Configuration options
  const [maxQueries, setMaxQueries] = useState(10);
  const [maxCompetitors, setMaxCompetitors] = useState(5);
  const [includeEntityValidation, setIncludeEntityValidation] = useState(true);
  const [includeOwnContent, setIncludeOwnContent] = useState(true);

  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [auditHistory, setAuditHistory] = useState<StoredQueryNetworkAudit[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Get effective mapId from props or state
  const effectiveMapId = mapId || state.activeMapId;

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!effectiveMapId || !state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) return;

      setLoadingHistory(true);
      try {
        const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
        const history = await loadQueryNetworkAuditHistory(supabase, effectiveMapId);
        setAuditHistory(history);
      } catch (e) {
        console.error('[QueryNetworkAudit] Failed to load history:', e);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, [effectiveMapId, state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  // Load a historical audit
  const handleLoadHistorical = (stored: StoredQueryNetworkAudit) => {
    const restoredResult: QueryNetworkAnalysisResult = {
      seedKeyword: stored.seed_keyword,
      queryNetwork: stored.query_network || [],
      serpResults: new Map(),
      competitorEAVs: stored.competitor_eavs || [],
      contentGaps: stored.content_gaps || [],
      recommendations: stored.recommendations || [],
      informationDensity: {
        own: undefined,
        competitorAverage: { densityScore: 0, factsPerSentence: 0, uniqueEntitiesCount: 0, uniqueAttributesCount: 0, totalEAVs: 0 },
        topCompetitor: { densityScore: 0, factsPerSentence: 0, uniqueEntitiesCount: 0, uniqueAttributesCount: 0, totalEAVs: 0 },
      },
      headingAnalysis: [],
      timestamp: stored.created_at,
    };
    setResult(restoredResult);
    setShowHistory(false);
    setActiveTab('overview');
  };

  const handleRunAudit = useCallback(async () => {
    if (!seedKeyword.trim()) {
      setError('Please enter a seed keyword');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);

    const config: QueryNetworkAuditConfig = {
      seedKeyword: seedKeyword.trim(),
      targetDomain: targetDomain.trim() || undefined,
      language: state.businessInfo.language || 'en',
      region: state.businessInfo.region,
      maxQueries,
      maxCompetitors,
      includeEntityValidation,
      includeOwnContent,
    };

    try {
      const auditResult = await runQueryNetworkAudit(
        config,
        state.businessInfo,
        (p) => setProgress(p)
      );
      setResult(auditResult);
      setActiveTab('overview');

      // Save to database if we have the necessary credentials
      if (effectiveMapId && state.user?.id && state.businessInfo.supabaseUrl && state.businessInfo.supabaseAnonKey) {
        try {
          const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
          const savedId = await saveQueryNetworkAudit(
            supabase,
            effectiveMapId,
            state.user.id,
            auditResult,
            { seedKeyword: seedKeyword.trim(), targetDomain: targetDomain.trim() || undefined, language: state.businessInfo.language || 'en' }
          );
          if (savedId) {
            console.log('[QueryNetworkAudit] Saved audit with ID:', savedId);
            // Refresh history
            const history = await loadQueryNetworkAuditHistory(supabase, effectiveMapId);
            setAuditHistory(history);
          }
        } catch (saveErr) {
          console.error('[QueryNetworkAudit] Failed to save audit:', saveErr);
          // Don't show error to user, audit still succeeded
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed');
    } finally {
      setIsRunning(false);
    }
  }, [seedKeyword, targetDomain, maxQueries, maxCompetitors, includeEntityValidation, includeOwnContent, state.businessInfo, effectiveMapId, state.user?.id]);

  const handleExport = useCallback((format: 'markdown' | 'json') => {
    if (!result) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'markdown') {
      content = viewMode === 'business'
        ? generateBusinessSummary(result)
        : generateTechnicalReport(result);
      filename = `query-network-audit-${result.seedKeyword.replace(/\s+/g, '-')}.md`;
      mimeType = 'text/markdown';
    } else {
      content = JSON.stringify(result, (key, value) => {
        if (value instanceof Map) {
          return Object.fromEntries(value);
        }
        return value;
      }, 2);
      filename = `query-network-audit-${result.seedKeyword.replace(/\s+/g, '-')}.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result, viewMode]);

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-900/30';
      case 'high': return 'text-orange-400 bg-orange-900/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30';
      case 'low': return 'text-blue-400 bg-blue-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  // Render progress
  const renderProgress = () => {
    if (!progress) return null;

    return (
      <div className="mt-4 p-4 bg-slate-800 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-300">{progress.currentStep}</span>
          <span className="text-sm text-slate-400">{progress.progress}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
        {progress.error && (
          <p className="mt-2 text-red-400 text-sm">{progress.error}</p>
        )}
      </div>
    );
  };

  // Render overview tab
  const renderOverview = () => {
    if (!result) return null;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-slate-800">
            <div className="text-2xl font-bold text-blue-400">
              {result.queryNetwork.length}
            </div>
            <div className="text-sm text-slate-400">Queries Analyzed</div>
          </Card>
          <Card className="p-4 bg-slate-800">
            <div className="text-2xl font-bold text-purple-400">
              {result.competitorEAVs.length}
            </div>
            <div className="text-sm text-slate-400">Competitor EAVs</div>
          </Card>
          <Card className="p-4 bg-slate-800">
            <div className="text-2xl font-bold text-orange-400">
              {result.contentGaps.length}
            </div>
            <div className="text-sm text-slate-400">Content Gaps</div>
          </Card>
          <Card className="p-4 bg-slate-800">
            <div className={`text-2xl font-bold ${getScoreColor(result.informationDensity.competitorAverage.densityScore)}`}>
              {result.informationDensity.competitorAverage.densityScore}
            </div>
            <div className="text-sm text-slate-400">Avg. Density Score</div>
          </Card>
        </div>

        {/* Information Density Comparison */}
        <Card className="p-4 bg-slate-800">
          <h3 className="text-lg font-semibold text-white mb-4">Information Density Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 text-slate-400">Metric</th>
                  <th className="text-right py-2 text-slate-400">Your Content</th>
                  <th className="text-right py-2 text-slate-400">Competitor Avg</th>
                  <th className="text-right py-2 text-slate-400">Top Competitor</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-700/50">
                  <td className="py-2 text-slate-300">Density Score</td>
                  <td className={`text-right py-2 ${result.informationDensity.own ? getScoreColor(result.informationDensity.own.densityScore) : 'text-slate-500'}`}>
                    {result.informationDensity.own?.densityScore ?? 'N/A'}
                  </td>
                  <td className="text-right py-2 text-slate-300">
                    {result.informationDensity.competitorAverage.densityScore}
                  </td>
                  <td className="text-right py-2 text-slate-300">
                    {result.informationDensity.topCompetitor.densityScore}
                  </td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-2 text-slate-300">Facts per Sentence</td>
                  <td className="text-right py-2 text-slate-300">
                    {result.informationDensity.own?.factsPerSentence ?? 'N/A'}
                  </td>
                  <td className="text-right py-2 text-slate-300">
                    {result.informationDensity.competitorAverage.factsPerSentence}
                  </td>
                  <td className="text-right py-2 text-slate-300">
                    {result.informationDensity.topCompetitor.factsPerSentence}
                  </td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-2 text-slate-300">Unique Entities</td>
                  <td className="text-right py-2 text-slate-300">
                    {result.informationDensity.own?.uniqueEntitiesCount ?? 'N/A'}
                  </td>
                  <td className="text-right py-2 text-slate-300">
                    {result.informationDensity.competitorAverage.uniqueEntitiesCount}
                  </td>
                  <td className="text-right py-2 text-slate-300">
                    {result.informationDensity.topCompetitor.uniqueEntitiesCount}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-slate-300">Total EAVs</td>
                  <td className="text-right py-2 text-slate-300">
                    {result.informationDensity.own?.totalEAVs ?? 'N/A'}
                  </td>
                  <td className="text-right py-2 text-slate-300">
                    {result.informationDensity.competitorAverage.totalEAVs}
                  </td>
                  <td className="text-right py-2 text-slate-300">
                    {result.informationDensity.topCompetitor.totalEAVs}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top Recommendations */}
        <Card className="p-4 bg-slate-800">
          <h3 className="text-lg font-semibold text-white mb-4">Priority Actions</h3>
          <div className="space-y-3">
            {result.recommendations.slice(0, 3).map((rec, index) => (
              <div key={index} className="p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">{rec.title}</span>
                  <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(rec.priority)}`}>
                    {rec.priority.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-slate-300">{rec.description}</p>
                {viewMode === 'technical' && (
                  <p className="mt-2 text-sm text-slate-400 italic">
                    Action: {rec.suggestedAction}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  // Render content gaps tab
  const renderGaps = () => {
    if (!result) return null;

    const gaps = result.contentGaps;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Content Gaps ({gaps.length})
          </h3>
        </div>

        {gaps.length === 0 ? (
          <p className="text-slate-400">No content gaps identified.</p>
        ) : (
          <div className="space-y-3">
            {gaps.map((gap, index) => (
              <Card key={index} className="p-4 bg-slate-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{gap.missingAttribute}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(gap.priority)}`}>
                        {gap.priority}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      Found in {gap.frequency} competitor{gap.frequency > 1 ? 's' : ''}
                    </p>
                    {gap.suggestedContent && viewMode === 'technical' && (
                      <p className="text-sm text-slate-500 mt-2 italic">
                        Example: {gap.suggestedContent}
                      </p>
                    )}
                  </div>
                </div>
                {viewMode === 'technical' && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <p className="text-xs text-slate-500">
                      Sources: {gap.foundInCompetitors.slice(0, 3).join(', ')}
                      {gap.foundInCompetitors.length > 3 && ` +${gap.foundInCompetitors.length - 3} more`}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Handle importing selected EAVs to user's list
  const [selectedEAVs, setSelectedEAVs] = useState<Set<string>>(new Set());

  const handleToggleEAV = (eav: CompetitorEAV) => {
    const key = `${eav.entity}:${eav.attribute}:${eav.value}`;
    setSelectedEAVs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleImportSelectedEAVs = () => {
    if (!result || selectedEAVs.size === 0) return;

    // Convert selected EAVs to SemanticTriple format and dispatch
    const eavsToImport = result.competitorEAVs.filter(eav => {
      const key = `${eav.entity}:${eav.attribute}:${eav.value}`;
      return selectedEAVs.has(key);
    });

    // TODO: Integrate with app state to add these EAVs
    // For now, export as JSON that can be imported
    const exportData = eavsToImport.map(eav => ({
      subject: { label: eav.entity, uri: '' },
      predicate: { relation: eav.attribute, type: 'ATTRIBUTE' },
      object: { value: eav.value, uri: '' },
      category: eav.category || 'COMMON',
      classification: 'TYPE',
      source: eav.source,
      confidence: eav.confidence
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imported-eavs-${result.seedKeyword.replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSelectedEAVs(new Set());
  };

  // Render EAVs tab
  const renderEAVs = () => {
    if (!result) return null;

    const eavs = result.competitorEAVs;

    // Group by entity
    const eavsByEntity = new Map<string, CompetitorEAV[]>();
    for (const eav of eavs) {
      const key = eav.entity;
      if (!eavsByEntity.has(key)) {
        eavsByEntity.set(key, []);
      }
      eavsByEntity.get(key)!.push(eav);
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Competitor EAVs ({eavs.length})
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">
              {eavsByEntity.size} unique entities
            </span>
            {selectedEAVs.size > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleImportSelectedEAVs}
              >
                Export Selected ({selectedEAVs.size})
              </Button>
            )}
          </div>
        </div>

        {/* Scrollable container */}
        <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
          {[...eavsByEntity.entries()].map(([entity, entityEAVs]) => (
            <Card key={entity} className="p-4 bg-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-white">{entity}</h4>
                <button
                  onClick={() => {
                    // Select/deselect all EAVs for this entity
                    const entityKeys = entityEAVs.map(e => `${e.entity}:${e.attribute}:${e.value}`);
                    const allSelected = entityKeys.every(k => selectedEAVs.has(k));
                    setSelectedEAVs(prev => {
                      const newSet = new Set(prev);
                      entityKeys.forEach(k => {
                        if (allSelected) {
                          newSet.delete(k);
                        } else {
                          newSet.add(k);
                        }
                      });
                      return newSet;
                    });
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {entityEAVs.every(e => selectedEAVs.has(`${e.entity}:${e.attribute}:${e.value}`)) ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="space-y-2">
                {entityEAVs.map((eav, index) => {
                  const eavKey = `${eav.entity}:${eav.attribute}:${eav.value}`;
                  const isSelected = selectedEAVs.has(eavKey);
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-2 text-sm p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-blue-900/30 border border-blue-700' : 'hover:bg-slate-700/50'}`}
                      onClick={() => handleToggleEAV(eav)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleEAV(eav)}
                        className="rounded bg-slate-700 border-slate-600 text-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-slate-400 min-w-[120px]">{eav.attribute}:</span>
                      <span className="text-slate-300 flex-1">{eav.value}</span>
                      {viewMode === 'technical' && (
                        <>
                          <span className={`px-2 py-0.5 rounded text-xs ${eav.category === 'UNIQUE' ? 'bg-purple-900/30 text-purple-400' : eav.category === 'RARE' ? 'bg-blue-900/30 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
                            {eav.category || 'COMMON'}
                          </span>
                          <span className="text-slate-500 text-xs">
                            {Math.round(eav.confidence * 100)}%
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // Render recommendations tab
  const renderRecommendations = () => {
    if (!result) return null;

    // Extract all questions from query network for question-related recommendations
    const allQuestions = result.queryNetwork.flatMap(q => q.questions);

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          All Recommendations ({result.recommendations.length})
        </h3>

        <div className="space-y-4">
          {result.recommendations.map((rec, index) => {
            const isQuestionRec = rec.title.includes('Questions') || rec.type === 'new_topic' && rec.description?.includes('questions');

            return (
              <Card key={index} className="p-4 bg-slate-800">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-white">{rec.title}</h4>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${getPriorityColor(rec.priority)}`}>
                      {rec.priority.toUpperCase()} - {rec.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-300 mb-3">{rec.description}</p>

                {/* Show all questions if this is a question-related recommendation */}
                {isQuestionRec && allQuestions.length > 0 && (
                  <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                    <h5 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Questions Users Are Asking ({allQuestions.length})
                    </h5>
                    <ul className="space-y-2 max-h-60 overflow-y-auto">
                      {allQuestions.map((q, qIdx) => (
                        <li key={qIdx} className="flex items-start gap-2 text-sm">
                          <span className="text-yellow-500 mt-0.5 flex-shrink-0">?</span>
                          <span className="text-slate-300">{q}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-slate-500 mt-3">
                      Tip: Create FAQ sections or dedicated content answering these questions to capture featured snippets.
                    </p>
                  </div>
                )}

                <div className="p-3 bg-slate-700/50 rounded">
                  <p className="text-sm text-slate-400">
                    <strong className="text-slate-300">Suggested Action:</strong> {rec.suggestedAction}
                  </p>
                  {viewMode === 'technical' && rec.estimatedImpact && (
                    <p className="text-sm text-slate-400 mt-2">
                      <strong className="text-slate-300">Impact:</strong> {rec.estimatedImpact}
                    </p>
                  )}
                </div>

                {viewMode === 'technical' && rec.affectedQueries.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <p className="text-xs text-slate-500">
                      Affected queries: {rec.affectedQueries.join(', ')}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // Render queries tab
  const renderQueries = () => {
    if (!result) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">
          Query Network ({result.queryNetwork.length} queries)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-3 text-slate-400">Query</th>
                <th className="text-left py-2 px-3 text-slate-400">Intent</th>
                <th className="text-right py-2 px-3 text-slate-400">Related</th>
                <th className="text-right py-2 px-3 text-slate-400">Questions</th>
              </tr>
            </thead>
            <tbody>
              {result.queryNetwork.map((query, index) => (
                <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-2 px-3 text-slate-300">{query.query}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      query.intent === 'informational' ? 'bg-blue-900/30 text-blue-400' :
                      query.intent === 'commercial' ? 'bg-green-900/30 text-green-400' :
                      query.intent === 'transactional' ? 'bg-purple-900/30 text-purple-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {query.intent}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-slate-400">{query.relatedQueries.length}</td>
                  <td className="py-2 px-3 text-right text-slate-400">{query.questions.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Query Network Audit</h1>
            <p className="text-slate-400 mt-1">
              Competitive content analysis and gap identification
            </p>
          </div>
          <div className="flex items-center gap-2">
            {auditHistory.length > 0 && (
              <Button variant="secondary" onClick={() => setShowHistory(!showHistory)}>
                {showHistory ? 'Hide History' : `History (${auditHistory.length})`}
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <Card className="p-4 bg-slate-800 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Previous Audits</h3>
            {loadingHistory ? (
              <p className="text-slate-400">Loading history...</p>
            ) : auditHistory.length === 0 ? (
              <p className="text-slate-400">No previous audits found.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {auditHistory.map((audit) => (
                  <div
                    key={audit.id}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors"
                    onClick={() => handleLoadHistorical(audit)}
                  >
                    <div>
                      <span className="font-medium text-white">{audit.seed_keyword}</span>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(audit.created_at).toLocaleString()} | {audit.total_queries} queries | {audit.total_competitor_eavs} EAVs
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{audit.total_recommendations} recommendations</span>
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Configuration */}
        {!result && (
          <Card className="p-6 bg-slate-800 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Configuration</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Seed Keyword *</label>
                <input
                  type="text"
                  value={seedKeyword}
                  onChange={(e) => setSeedKeyword(e.target.value)}
                  placeholder="e.g., content marketing"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Your Domain (optional)</label>
                <input
                  type="text"
                  value={targetDomain}
                  onChange={(e) => setTargetDomain(e.target.value)}
                  placeholder="e.g., example.com"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Max Queries</label>
                <input
                  type="number"
                  value={maxQueries}
                  onChange={(e) => setMaxQueries(parseInt(e.target.value) || 10)}
                  min={5}
                  max={50}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Max Competitors</label>
                <input
                  type="number"
                  value={maxCompetitors}
                  onChange={(e) => setMaxCompetitors(parseInt(e.target.value) || 5)}
                  min={3}
                  max={20}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                  disabled={isRunning}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeOwnContent}
                  onChange={(e) => setIncludeOwnContent(e.target.checked)}
                  className="rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                  disabled={isRunning}
                />
                Include own content analysis
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEntityValidation}
                  onChange={(e) => setIncludeEntityValidation(e.target.checked)}
                  className="rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                  disabled={isRunning}
                />
                Validate entity authority
              </label>
            </div>

            {error && (
              <p className="mt-4 text-red-400 text-sm">{error}</p>
            )}

            {renderProgress()}

            <div className="mt-6">
              <Button
                onClick={handleRunAudit}
                disabled={isRunning || !seedKeyword.trim()}
                className="w-full md:w-auto"
              >
                {isRunning ? 'Running Audit...' : 'Run Query Network Audit'}
              </Button>
            </div>
          </Card>
        )}

        {/* Results */}
        {result && (
          <>
            {/* View Mode Toggle & Export */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('business')}
                  className={`px-4 py-2 rounded-l text-sm font-medium transition-colors ${
                    viewMode === 'business'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Business View
                </button>
                <button
                  onClick={() => setViewMode('technical')}
                  className={`px-4 py-2 rounded-r text-sm font-medium transition-colors ${
                    viewMode === 'technical'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Technical View
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => handleExport('markdown')}>
                  Export MD
                </Button>
                <Button variant="secondary" onClick={() => handleExport('json')}>
                  Export JSON
                </Button>
                <Button variant="ghost" onClick={() => setResult(null)}>
                  New Audit
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 border-b border-slate-700">
              {(['overview', 'gaps', 'eavs', 'recommendations', 'queries'] as TabId[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'gaps' && renderGaps()}
            {activeTab === 'eavs' && renderEAVs()}
            {activeTab === 'recommendations' && renderRecommendations()}
            {activeTab === 'queries' && renderQueries()}
          </>
        )}
      </div>
    </div>
  );
};

export default QueryNetworkAudit;
