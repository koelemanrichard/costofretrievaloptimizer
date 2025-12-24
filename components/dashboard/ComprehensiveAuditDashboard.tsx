// components/dashboard/ComprehensiveAuditDashboard.tsx
// Comprehensive dashboard combining all audit and research data

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { useAppState } from '../../state/appState';
import {
  EnhancedAuditMetrics,
  generateEnhancedMetrics,
} from '../../services/reportGenerationService';
import { exportEnhancedMetricsToHtml } from '../../services/pdfExportService';
import {
  loadQueryNetworkAuditHistory,
  loadEATScannerAuditHistory,
  loadCorpusAuditHistory,
  loadEnhancedMetricsHistory,
  StoredQueryNetworkAudit,
  StoredEATScannerAudit,
  StoredCorpusAudit,
  StoredEnhancedMetricsSnapshot,
} from '../../services/auditPersistenceService';
import { getSupabaseClient } from '../../services/supabaseClient';
import type { SemanticTriple, UnifiedAuditIssue, CompetitorEAV, ContentGap } from '../../types';
import { CompetitorGapGraph } from '../visualization/CompetitorGapGraph';
import { SemanticDistanceMatrix, MatrixItem, MatrixCell } from '../visualization/SemanticDistanceMatrix';
import { useCompetitorGapNetwork, CompetitorGapNetworkInput } from '../../hooks/useCompetitorGapNetwork';

interface ComprehensiveAuditDashboardProps {
  eavs: SemanticTriple[];
  topicCount: number;
  issues?: UnifiedAuditIssue[];
  mapId?: string;
  projectName?: string;
  mapName?: string;
  onClose?: () => void;
  onOpenQueryNetworkAudit?: () => void;
  onOpenEATScanner?: () => void;
  onOpenCorpusAudit?: () => void;
}

type TabId = 'overview' | 'your-map' | 'competitor-research' | 'gap-analysis' | 'semantic-map' | 'eat-authority' | 'corpus' | 'history';

export const ComprehensiveAuditDashboard: React.FC<ComprehensiveAuditDashboardProps> = ({
  eavs,
  topicCount,
  issues = [],
  mapId,
  projectName = 'My Project',
  mapName,
  onClose,
  onOpenQueryNetworkAudit,
  onOpenEATScanner,
  onOpenCorpusAudit,
}) => {
  const { state } = useAppState();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);

  // Historical data
  const [queryNetworkHistory, setQueryNetworkHistory] = useState<StoredQueryNetworkAudit[]>([]);
  const [eatScannerHistory, setEatScannerHistory] = useState<StoredEATScannerAudit[]>([]);
  const [corpusHistory, setCorpusHistory] = useState<StoredCorpusAudit[]>([]);
  const [metricsHistory, setMetricsHistory] = useState<StoredEnhancedMetricsSnapshot[]>([]);

  // Current metrics
  const metrics = useMemo(() => {
    return generateEnhancedMetrics(eavs, topicCount, issues);
  }, [eavs, topicCount, issues]);

  const effectiveMapId = mapId || state.activeMapId;

  // Load historical data
  useEffect(() => {
    const loadData = async () => {
      console.log('[ComprehensiveAuditDashboard] Loading history for mapId:', effectiveMapId);

      if (!effectiveMapId || !state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) {
        console.log('[ComprehensiveAuditDashboard] Missing required data:', {
          mapId: !!effectiveMapId,
          supabaseUrl: !!state.businessInfo.supabaseUrl,
          supabaseAnonKey: !!state.businessInfo.supabaseAnonKey
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);

        const [qnHistory, eatHistory, corpHistory, metHistory] = await Promise.all([
          loadQueryNetworkAuditHistory(supabase, effectiveMapId, 5),
          loadEATScannerAuditHistory(supabase, effectiveMapId, 5),
          loadCorpusAuditHistory(supabase, effectiveMapId, 5),
          loadEnhancedMetricsHistory(supabase, effectiveMapId, 5),
        ]);

        console.log('[ComprehensiveAuditDashboard] History loaded:', {
          queryNetwork: qnHistory.length,
          eatScanner: eatHistory.length,
          corpus: corpHistory.length,
          metrics: metHistory.length
        });

        setQueryNetworkHistory(qnHistory);
        setEatScannerHistory(eatHistory);
        setCorpusHistory(corpHistory);
        setMetricsHistory(metHistory);
      } catch (e) {
        console.error('[ComprehensiveAuditDashboard] Failed to load history:', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [effectiveMapId, state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  // Latest audits
  const latestQueryNetwork = queryNetworkHistory[0];
  const latestEatScanner = eatScannerHistory[0];
  const latestCorpus = corpusHistory[0];

  // Get active map pillars for central entity
  const activeMap = state.topicalMaps.find(m => m.id === effectiveMapId);
  const centralEntity = activeMap?.pillars?.centralEntity || '';

  // Prepare gap network input from latest query network audit
  const gapNetworkInput = useMemo<CompetitorGapNetworkInput | null>(() => {
    if (!latestQueryNetwork) return null;

    const competitorEAVs = latestQueryNetwork.competitor_eavs as CompetitorEAV[] | undefined;
    const contentGaps = latestQueryNetwork.content_gaps as ContentGap[] | undefined;

    if (!competitorEAVs || !contentGaps || competitorEAVs.length === 0) return null;

    return {
      ownEAVs: eavs,
      competitorEAVs,
      contentGaps,
      centralEntity: centralEntity || latestQueryNetwork.seed_keyword || 'Unknown',
    };
  }, [latestQueryNetwork, eavs, centralEntity]);

  // Use gap network hook
  const { network: gapNetwork } = useCompetitorGapNetwork(gapNetworkInput);

  // Selected gap node for details panel
  const [selectedGapNode, setSelectedGapNode] = useState<string | null>(null);

  // Selected matrix cell for semantic map
  const [selectedMatrixCell, setSelectedMatrixCell] = useState<{
    cell: MatrixCell;
    rowItem: MatrixItem;
    colItem: MatrixItem;
  } | null>(null);

  // Prepare matrix items from topics/EAVs
  const matrixItems = useMemo<MatrixItem[]>(() => {
    // Use EAV subjects as matrix items
    const uniqueSubjects = new Map<string, MatrixItem>();

    for (const eav of eavs) {
      const id = eav.subject.id || eav.subject.label;
      if (!uniqueSubjects.has(id)) {
        uniqueSubjects.set(id, {
          id,
          label: eav.subject.label,
          type: 'eav',
        });
      }
    }

    return Array.from(uniqueSubjects.values()).slice(0, 25); // Limit to 25 for performance
  }, [eavs]);

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  // Export handler
  const handleExport = useCallback(() => {
    const reportData = {
      projectName: mapName || projectName,
      semanticCompliance: metrics.semanticCompliance,
      authorityIndicators: metrics.authorityIndicators,
      topicCount,
      actionRoadmap: metrics.actionRoadmap,
    };
    exportEnhancedMetricsToHtml(reportData, `comprehensive-audit-${projectName.replace(/\s+/g, '-').toLowerCase()}`);
  }, [metrics, topicCount, projectName, mapName]);

  // Render Overview Tab
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-blue-700">
          <div className="text-3xl font-bold text-white">{eavs.length}</div>
          <div className="text-sm text-blue-300">Your EAVs</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-purple-700">
          <div className="text-3xl font-bold text-white">{latestQueryNetwork?.total_competitor_eavs || 0}</div>
          <div className="text-sm text-purple-300">Competitor EAVs</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-green-900/40 to-green-800/20 border-green-700">
          <div className={`text-3xl font-bold ${getScoreColor(metrics.semanticCompliance.score)}`}>
            {metrics.semanticCompliance.score}%
          </div>
          <div className="text-sm text-green-300">Compliance Score</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-orange-900/40 to-orange-800/20 border-orange-700">
          <div className={`text-3xl font-bold ${getScoreColor(latestEatScanner?.overall_eat_score || 0)}`}>
            {latestEatScanner?.overall_eat_score || 0}%
          </div>
          <div className="text-sm text-orange-300">E-A-T Score</div>
        </Card>
      </div>

      {/* Research Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Query Network Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Competitor Research</h3>
            {latestQueryNetwork && (
              <span className="text-xs text-gray-400">
                {new Date(latestQueryNetwork.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
          {latestQueryNetwork ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Keyword:</span>
                <span className="text-white">{latestQueryNetwork.seed_keyword}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Queries analyzed:</span>
                <span className="text-white">{latestQueryNetwork.total_queries}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Competitor EAVs:</span>
                <span className="text-purple-400">{latestQueryNetwork.total_competitor_eavs}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Content Gaps:</span>
                <span className="text-orange-400">{latestQueryNetwork.total_content_gaps}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Recommendations:</span>
                <span className="text-blue-400">{latestQueryNetwork.total_recommendations}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-3">No competitor research yet</p>
              {onOpenQueryNetworkAudit && (
                <Button variant="secondary" size="sm" onClick={onOpenQueryNetworkAudit}>
                  Run Query Network Audit
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* E-A-T Scanner Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">E-A-T Authority</h3>
            {latestEatScanner && (
              <span className="text-xs text-gray-400">
                {new Date(latestEatScanner.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
          {latestEatScanner ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Entity:</span>
                <span className="text-white">{latestEatScanner.entity_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Overall E-A-T:</span>
                <span className={getScoreColor(latestEatScanner.overall_eat_score || 0)}>
                  {latestEatScanner.overall_eat_score}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Expertise:</span>
                <span className="text-white">{latestEatScanner.expertise_score || 0}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Authority:</span>
                <span className="text-white">{latestEatScanner.authority_score || 0}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Trust:</span>
                <span className="text-white">{latestEatScanner.trust_score || 0}%</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-3">No E-A-T scan yet</p>
              {onOpenEATScanner && (
                <Button variant="secondary" size="sm" onClick={onOpenEATScanner}>
                  Run E-A-T Scanner
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* Corpus Audit Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Site Corpus</h3>
            {latestCorpus && (
              <span className="text-xs text-gray-400">
                {new Date(latestCorpus.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
          {latestCorpus ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Domain:</span>
                <span className="text-white">{latestCorpus.domain}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Pages analyzed:</span>
                <span className="text-white">{latestCorpus.total_pages}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Content overlaps:</span>
                <span className="text-orange-400">{latestCorpus.total_overlaps}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">EAV coverage:</span>
                <span className={getScoreColor(latestCorpus.semantic_coverage_percentage || 0)}>
                  {latestCorpus.semantic_coverage_percentage?.toFixed(1) || 0}%
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-3">No corpus audit yet</p>
              {onOpenCorpusAudit && (
                <Button variant="secondary" size="sm" onClick={onOpenCorpusAudit}>
                  Run Corpus Audit
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Action Roadmap */}
      {metrics.actionRoadmap.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Priority Actions</h3>
          <div className="space-y-3">
            {metrics.actionRoadmap.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  item.priority === 'critical' ? 'bg-red-900/20 border-red-700' :
                  item.priority === 'high' ? 'bg-orange-900/20 border-orange-700' :
                  item.priority === 'medium' ? 'bg-yellow-900/20 border-yellow-700' :
                  'bg-blue-900/20 border-blue-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold uppercase ${
                    item.priority === 'critical' ? 'text-red-400' :
                    item.priority === 'high' ? 'text-orange-400' :
                    item.priority === 'medium' ? 'text-yellow-400' :
                    'text-blue-400'
                  }`}>
                    {item.priority}
                  </span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-xs text-gray-300">{item.category}</span>
                </div>
                <p className="text-sm text-white">{item.action}</p>
                <p className="text-xs text-gray-400 mt-1">{item.impact}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  // Render Your Map Tab
  const renderYourMap = () => {
    const { semanticCompliance, authorityIndicators, informationDensity } = metrics;

    return (
      <div className="space-y-6">
        {/* Data Source Banner */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Your Topical Map Analysis</h3>
              <p className="text-sm text-blue-300">
                Analyzing {eavs.length} EAVs across {topicCount} topics in your map
              </p>
            </div>
          </div>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 text-center">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Semantic Compliance</h4>
            <div className={`text-4xl font-bold ${getScoreColor(semanticCompliance.score)}`}>
              {semanticCompliance.score}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Target: {semanticCompliance.target}%</div>
          </Card>
          <Card className="p-6 text-center">
            <h4 className="text-sm font-medium text-gray-400 mb-2">EAV Authority</h4>
            <div className={`text-4xl font-bold ${getScoreColor(authorityIndicators.eavAuthorityScore)}`}>
              {authorityIndicators.eavAuthorityScore}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Topical Depth: {authorityIndicators.topicalDepthScore}%</div>
          </Card>
          <Card className="p-6 text-center">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Information Density</h4>
            <div className={`text-4xl font-bold ${getScoreColor(Math.min(100, (informationDensity.avgFactsPerSection / informationDensity.targetFactsPerSection) * 100))}`}>
              {informationDensity.avgFactsPerSection}
            </div>
            <div className="text-xs text-gray-500 mt-1">facts/topic (target: {informationDensity.targetFactsPerSection})</div>
          </Card>
        </div>

        {/* Category Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h4 className="text-lg font-semibold text-white mb-4">Category Distribution</h4>
            <div className="space-y-3">
              {Object.entries(semanticCompliance.categoryDistribution).map(([cat, count]) => {
                const total = Object.values(semanticCompliance.categoryDistribution).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                const colors: Record<string, string> = {
                  UNIQUE: 'bg-purple-500',
                  ROOT: 'bg-blue-500',
                  RARE: 'bg-green-500',
                  COMMON: 'bg-gray-500',
                  UNCLASSIFIED: 'bg-gray-700',
                };
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-24">{cat}</span>
                    <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors[cat] || 'bg-gray-600'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-16 text-right">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <h4 className="text-lg font-semibold text-white mb-4">Authority Indicators</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-purple-900/30 border border-purple-700 rounded-lg text-center">
                <div className="text-2xl font-bold text-white">{authorityIndicators.uniqueEavCount}</div>
                <div className="text-xs text-purple-300">UNIQUE</div>
              </div>
              <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-center">
                <div className="text-2xl font-bold text-white">{authorityIndicators.rootEavCount}</div>
                <div className="text-xs text-blue-300">ROOT</div>
              </div>
              <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg text-center">
                <div className="text-2xl font-bold text-white">{authorityIndicators.rareEavCount}</div>
                <div className="text-xs text-green-300">RARE</div>
              </div>
              <div className="p-3 bg-gray-800 border border-gray-600 rounded-lg text-center">
                <div className="text-2xl font-bold text-white">{authorityIndicators.commonEavCount}</div>
                <div className="text-xs text-gray-300">COMMON</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Recommendations */}
        {semanticCompliance.recommendations.length > 0 && (
          <Card className="p-6">
            <h4 className="text-lg font-semibold text-white mb-4">Recommendations</h4>
            <ul className="space-y-2">
              {semanticCompliance.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  };

  // Render Competitor Research Tab
  const renderCompetitorResearch = () => {
    if (!latestQueryNetwork) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Competitor Research Yet</h3>
          <p className="text-gray-400 mb-6">Run a Query Network Audit to analyze competitor content and find opportunities.</p>
          {onOpenQueryNetworkAudit && (
            <Button onClick={onOpenQueryNetworkAudit}>Run Query Network Audit</Button>
          )}
        </div>
      );
    }

    const competitorEavs = latestQueryNetwork.competitor_eavs || [];
    const recommendations = latestQueryNetwork.recommendations || [];
    const contentGaps = latestQueryNetwork.content_gaps || [];

    return (
      <div className="space-y-6">
        {/* Research Info Banner */}
        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Competitor Research: "{latestQueryNetwork.seed_keyword}"</h3>
              <p className="text-sm text-purple-300">
                Analyzed {latestQueryNetwork.total_queries} queries from {new Date(latestQueryNetwork.created_at).toLocaleDateString()}
              </p>
            </div>
            {onOpenQueryNetworkAudit && (
              <Button variant="secondary" size="sm" onClick={onOpenQueryNetworkAudit}>
                View Full Report
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{competitorEavs.length}</div>
            <div className="text-xs text-gray-400">Competitor EAVs</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{contentGaps.length}</div>
            <div className="text-xs text-gray-400">Content Gaps</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{recommendations.length}</div>
            <div className="text-xs text-gray-400">Recommendations</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{latestQueryNetwork.total_queries}</div>
            <div className="text-xs text-gray-400">Queries Analyzed</div>
          </Card>
        </div>

        {/* Top Competitor EAVs */}
        {competitorEavs.length > 0 && (
          <Card className="p-6">
            <h4 className="text-lg font-semibold text-white mb-4">
              Top Competitor EAVs ({competitorEavs.length})
            </h4>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {competitorEavs.slice(0, 20).map((eav: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-gray-800/50 rounded">
                  <span className="text-white font-medium">{eav.entity}</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-gray-400">{eav.attribute}</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-blue-300">{eav.value}</span>
                  {eav.category && (
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                      eav.category === 'UNIQUE' ? 'bg-purple-900/50 text-purple-300' :
                      eav.category === 'ROOT' ? 'bg-blue-900/50 text-blue-300' :
                      eav.category === 'RARE' ? 'bg-green-900/50 text-green-300' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {eav.category}
                    </span>
                  )}
                </div>
              ))}
              {competitorEavs.length > 20 && (
                <p className="text-center text-gray-500 text-sm py-2">
                  + {competitorEavs.length - 20} more EAVs
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <Card className="p-6">
            <h4 className="text-lg font-semibold text-white mb-4">Recommendations</h4>
            <div className="space-y-3">
              {recommendations.slice(0, 5).map((rec: any, idx: number) => {
                // Extract questions from query network if this is a questions recommendation
                const allQuestions = rec.title?.includes('Questions')
                  ? (latestQueryNetwork?.query_network || []).flatMap((q: any) => q.questions || [])
                  : [];

                return (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    rec.priority === 'critical' ? 'bg-red-900/20 border-red-700' :
                    rec.priority === 'high' ? 'bg-orange-900/20 border-orange-700' :
                    'bg-yellow-900/20 border-yellow-700'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase text-orange-400">{rec.priority}</span>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-xs text-gray-300">{rec.type?.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-white">{rec.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{rec.description}</p>

                    {/* Show actual questions if this is a questions recommendation */}
                    {allQuestions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-xs font-medium text-yellow-400 mb-2">Questions to Answer:</p>
                        <ul className="space-y-1 max-h-40 overflow-y-auto">
                          {allQuestions.slice(0, 10).map((q: string, qIdx: number) => (
                            <li key={qIdx} className="text-xs text-gray-300 flex items-start gap-2">
                              <span className="text-yellow-500 mt-0.5">?</span>
                              <span>{q}</span>
                            </li>
                          ))}
                          {allQuestions.length > 10 && (
                            <li className="text-xs text-gray-500 pl-4">
                              + {allQuestions.length - 10} more questions...
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Show affected queries if available */}
                    {rec.affectedQueries && rec.affectedQueries.length > 0 && !allQuestions.length && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">
                          Related queries: {rec.affectedQueries.slice(0, 3).join(', ')}
                          {rec.affectedQueries.length > 3 && ` +${rec.affectedQueries.length - 3} more`}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    );
  };

  // Render Gap Analysis Tab
  const renderGapAnalysis = () => {
    if (!gapNetworkInput || gapNetwork.nodes.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Gap Analysis Available</h3>
          <p className="text-gray-400 mb-6">Run Competitor Research first to identify content gaps in your coverage.</p>
          {onOpenQueryNetworkAudit && (
            <Button onClick={onOpenQueryNetworkAudit}>Run Competitor Research</Button>
          )}
        </div>
      );
    }

    const selectedNode = selectedGapNode
      ? gapNetwork.nodes.find(n => n.id === selectedGapNode)
      : null;

    return (
      <div className="space-y-6">
        {/* Gap Network Summary */}
        <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Content Gap Network</h3>
              <p className="text-sm text-gray-400">
                Visual representation of content gaps vs your coverage
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-gray-400">Your Coverage:</span>{' '}
                <span className="text-green-400 font-medium">{gapNetwork.metrics.yourCoverage}%</span>
              </div>
              <div>
                <span className="text-gray-400">Total Gaps:</span>{' '}
                <span className="text-red-400 font-medium">{gapNetwork.metrics.totalGaps}</span>
              </div>
              <div>
                <span className="text-gray-400">High Priority:</span>{' '}
                <span className="text-orange-400 font-medium">{gapNetwork.metrics.highPriorityGaps}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Gap Network Graph */}
          <div className="lg:col-span-2">
            <Card className="p-0 overflow-hidden h-[500px]">
              <CompetitorGapGraph
                network={gapNetwork}
                onNodeClick={(node) => setSelectedGapNode(node.id)}
                selectedNodeId={selectedGapNode}
              />
            </Card>
          </div>

          {/* Details Panel */}
          <div className="space-y-4">
            {/* Selected Node Details */}
            {selectedNode ? (
              <Card className="p-4">
                <h4 className="font-semibold text-white mb-3">
                  {selectedNode.type === 'gap' ? 'Content Gap' : 'Your Coverage'}
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">Label:</span>{' '}
                    <span className="text-white">{selectedNode.label}</span>
                  </div>
                  {selectedNode.entity && (
                    <div>
                      <span className="text-gray-400">Entity:</span>{' '}
                      <span className="text-white">{selectedNode.entity}</span>
                    </div>
                  )}
                  {selectedNode.attribute && (
                    <div>
                      <span className="text-gray-400">Attribute:</span>{' '}
                      <span className="text-white">{selectedNode.attribute}</span>
                    </div>
                  )}
                  {selectedNode.type === 'gap' && (
                    <>
                      <div>
                        <span className="text-gray-400">Priority:</span>{' '}
                        <span className={`font-medium ${
                          selectedNode.priority === 'high' ? 'text-red-400' :
                          selectedNode.priority === 'medium' ? 'text-orange-400' : 'text-yellow-400'
                        }`}>
                          {selectedNode.priority.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Competitors:</span>{' '}
                        <span className="text-purple-400">{selectedNode.competitorCount}</span>
                      </div>
                      {selectedNode.suggestedContent && (
                        <div className="mt-2">
                          <span className="text-gray-400 block mb-1">Suggested Content:</span>
                          <p className="text-gray-300 text-xs bg-gray-800 p-2 rounded">
                            {selectedNode.suggestedContent}
                          </p>
                        </div>
                      )}
                      {selectedNode.competitorUrls.length > 0 && (
                        <div className="mt-2">
                          <span className="text-gray-400 block mb-1">Found In:</span>
                          <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
                            {selectedNode.competitorUrls.slice(0, 5).map((url, i) => (
                              <div key={i} className="text-blue-400 truncate">{url}</div>
                            ))}
                            {selectedNode.competitorUrls.length > 5 && (
                              <div className="text-gray-500">+{selectedNode.competitorUrls.length - 5} more</div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="p-4 text-center text-gray-400">
                <p>Click a node to see details</p>
              </Card>
            )}

            {/* High Priority Gaps List */}
            <Card className="p-4">
              <h4 className="font-semibold text-white mb-3">High Priority Gaps</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {gapNetwork.nodes
                  .filter(n => n.type === 'gap' && n.priority === 'high')
                  .slice(0, 10)
                  .map(gap => (
                    <button
                      key={gap.id}
                      onClick={() => setSelectedGapNode(gap.id)}
                      className={`w-full text-left p-2 rounded text-sm transition-colors ${
                        selectedGapNode === gap.id
                          ? 'bg-red-900/50 border border-red-700'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      <div className="text-white truncate">{gap.label}</div>
                      <div className="text-xs text-gray-400">
                        {gap.competitorCount} competitor{gap.competitorCount !== 1 ? 's' : ''}
                      </div>
                    </button>
                  ))}
                {gapNetwork.nodes.filter(n => n.type === 'gap' && n.priority === 'high').length === 0 && (
                  <p className="text-gray-400 text-sm">No high priority gaps found</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  // Render Semantic Map Tab
  const renderSemanticMap = () => {
    if (matrixItems.length < 2) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Not Enough Data</h3>
          <p className="text-gray-400 mb-6">Add more EAVs to your topical map to see semantic distance analysis.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Semantic Map Summary */}
        <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Semantic Distance Matrix</h3>
              <p className="text-sm text-gray-400">
                Validate content architecture - see which topics are too similar or too different
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-gray-400">Entities:</span>{' '}
                <span className="text-purple-400 font-medium">{matrixItems.length}</span>
              </div>
              <div>
                <span className="text-gray-400">Comparisons:</span>{' '}
                <span className="text-indigo-400 font-medium">
                  {(matrixItems.length * (matrixItems.length - 1)) / 2}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Matrix */}
          <div className="lg:col-span-2">
            <Card className="p-4">
              <SemanticDistanceMatrix
                items={matrixItems}
                onCellClick={(cell, rowItem, colItem) => {
                  setSelectedMatrixCell({ cell, rowItem, colItem });
                }}
                title="Entity Semantic Relationships"
                maxItems={25}
                cellSize={36}
              />
            </Card>
          </div>

          {/* Details Panel */}
          <div className="space-y-4">
            {/* Selected Cell Details */}
            {selectedMatrixCell ? (
              <Card className="p-4">
                <h4 className="font-semibold text-white mb-3">Relationship Details</h4>
                <div className="space-y-3 text-sm">
                  <div className="bg-gray-800 rounded p-2">
                    <div className="text-gray-400 text-xs">Entity A</div>
                    <div className="text-white font-medium">{selectedMatrixCell.rowItem.label}</div>
                  </div>
                  <div className="text-center text-gray-500">
                    <svg className="w-4 h-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                  <div className="bg-gray-800 rounded p-2">
                    <div className="text-gray-400 text-xs">Entity B</div>
                    <div className="text-white font-medium">{selectedMatrixCell.colItem.label}</div>
                  </div>

                  <div className="border-t border-gray-700 pt-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Distance:</span>
                      <span className={`font-medium ${
                        selectedMatrixCell.cell.distance < 0.3 ? 'text-green-400' :
                        selectedMatrixCell.cell.distance < 0.7 ? 'text-blue-400' : 'text-red-400'
                      }`}>
                        {selectedMatrixCell.cell.distance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Should Link:</span>
                      <span className={selectedMatrixCell.cell.shouldLink ? 'text-green-400' : 'text-gray-500'}>
                        {selectedMatrixCell.cell.shouldLink ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded p-2 mt-2">
                    <div className="text-gray-400 text-xs mb-1">Recommendation</div>
                    <div className="text-gray-300 text-xs">
                      {selectedMatrixCell.cell.recommendation}
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-4 text-center text-gray-400">
                <p>Click a cell to see relationship details</p>
              </Card>
            )}

            {/* Interpretation Guide */}
            <Card className="p-4">
              <h4 className="font-semibold text-white mb-3">Interpretation Guide</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded bg-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-white font-medium">0.0 - 0.2 (Green)</span>
                    <p className="text-gray-400">Cannibalization risk - topics too similar, consider merging</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-white font-medium">0.3 - 0.5 (Blue)</span>
                    <p className="text-gray-400">Ideal for contextual linking - strongly related</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded bg-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-white font-medium">0.5 - 0.7 (Yellow)</span>
                    <p className="text-gray-400">Good for supporting links - moderately related</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded bg-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-white font-medium">0.7 - 0.85 (Orange)</span>
                    <p className="text-gray-400">Link sparingly - loosely related</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded bg-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-white font-medium">0.85 - 1.0 (Red)</span>
                    <p className="text-gray-400">Avoid linking - topics too different</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  // Render E-A-T Tab
  const renderEATAuthority = () => {
    if (!latestEatScanner) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No E-A-T Analysis Yet</h3>
          <p className="text-gray-400 mb-6">Run the E-A-T Scanner to analyze your entity's authority and trust signals.</p>
          {onOpenEATScanner && (
            <Button onClick={onOpenEATScanner}>Run E-A-T Scanner</Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4">
          <h3 className="font-semibold text-white">E-A-T Analysis: "{latestEatScanner.entity_name}"</h3>
          <p className="text-sm text-orange-300">
            Scanned on {new Date(latestEatScanner.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <div className={`text-3xl font-bold ${getScoreColor(latestEatScanner.overall_eat_score || 0)}`}>
              {latestEatScanner.overall_eat_score || 0}%
            </div>
            <div className="text-xs text-gray-400">Overall E-A-T</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{latestEatScanner.expertise_score || 0}%</div>
            <div className="text-xs text-gray-400">Expertise</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">{latestEatScanner.authority_score || 0}%</div>
            <div className="text-xs text-gray-400">Authority</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{latestEatScanner.trust_score || 0}%</div>
            <div className="text-xs text-gray-400">Trust</div>
          </Card>
        </div>

        {latestEatScanner.recommendations && latestEatScanner.recommendations.length > 0 && (
          <Card className="p-6">
            <h4 className="text-lg font-semibold text-white mb-4">E-A-T Recommendations</h4>
            <div className="space-y-2">
              {latestEatScanner.recommendations.slice(0, 5).map((rec: any, idx: number) => (
                <div key={idx} className="p-3 bg-gray-800/50 rounded-lg">
                  <p className="text-sm text-white">{rec.title || rec}</p>
                  {rec.description && <p className="text-xs text-gray-400 mt-1">{rec.description}</p>}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  // Render History Tab
  const renderHistory = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Query Network History */}
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Query Network Audits</h4>
          {queryNetworkHistory.length === 0 ? (
            <p className="text-gray-500 text-sm">No audits yet</p>
          ) : (
            <div className="space-y-2">
              {queryNetworkHistory.map((audit) => (
                <div key={audit.id} className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{audit.seed_keyword}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(audit.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {audit.total_queries} queries | {audit.total_competitor_eavs} EAVs | {audit.total_recommendations} recs
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* E-A-T Scanner History */}
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-white mb-4">E-A-T Scans</h4>
          {eatScannerHistory.length === 0 ? (
            <p className="text-gray-500 text-sm">No scans yet</p>
          ) : (
            <div className="space-y-2">
              {eatScannerHistory.map((audit) => (
                <div key={audit.id} className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{audit.entity_name}</span>
                    <span className={`text-sm ${getScoreColor(audit.overall_eat_score || 0)}`}>
                      {audit.overall_eat_score || 0}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(audit.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Corpus Audit History */}
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Corpus Audits</h4>
          {corpusHistory.length === 0 ? (
            <p className="text-gray-500 text-sm">No audits yet</p>
          ) : (
            <div className="space-y-2">
              {corpusHistory.map((audit) => (
                <div key={audit.id} className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{audit.domain}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(audit.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {audit.total_pages} pages | {audit.semantic_coverage_percentage?.toFixed(1)}% coverage
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Metrics Snapshots */}
        <Card className="p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Metrics Snapshots</h4>
          {metricsHistory.length === 0 ? (
            <p className="text-gray-500 text-sm">No snapshots yet</p>
          ) : (
            <div className="space-y-2">
              {metricsHistory.map((snapshot) => (
                <div key={snapshot.id} className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">
                      {snapshot.snapshot_name || 'Auto Snapshot'}
                    </span>
                    <span className={`text-sm ${getScoreColor(snapshot.semantic_compliance_score || 0)}`}>
                      {snapshot.semantic_compliance_score || 0}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(snapshot.created_at).toLocaleDateString()} | {snapshot.eav_count} EAVs
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );

  // Tab definitions
  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'your-map', label: 'Your Map', badge: eavs.length },
    { id: 'competitor-research', label: 'Competitors', badge: latestQueryNetwork?.total_competitor_eavs },
    { id: 'gap-analysis', label: 'Gap Analysis', badge: gapNetwork.metrics.highPriorityGaps || undefined },
    { id: 'semantic-map', label: 'Semantic Map', badge: matrixItems.length > 1 ? matrixItems.length : undefined },
    { id: 'eat-authority', label: 'E-A-T' },
    { id: 'history', label: 'History' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Research & Audit Dashboard</h2>
          <p className="text-gray-400">Comprehensive analysis of your topical map and competitive landscape</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleExport}>Export Report</Button>
          {onClose && (
            <Button variant="ghost" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-700 rounded">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'your-map' && renderYourMap()}
      {activeTab === 'competitor-research' && renderCompetitorResearch()}
      {activeTab === 'gap-analysis' && renderGapAnalysis()}
      {activeTab === 'semantic-map' && renderSemanticMap()}
      {activeTab === 'eat-authority' && renderEATAuthority()}
      {activeTab === 'history' && renderHistory()}
    </div>
  );
};

export default ComprehensiveAuditDashboard;
