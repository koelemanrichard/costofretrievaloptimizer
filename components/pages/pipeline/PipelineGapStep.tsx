import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import { runQueryNetworkAudit } from '../../../services/ai/queryNetworkAudit';
import { GscApiAdapter } from '../../../services/audit/adapters/GscApiAdapter';
import { getSupabaseClient } from '../../../services/supabaseClient';
import type {
  QueryNetworkAnalysisResult,
  QueryNetworkAuditConfig,
  CompetitorEAV,
  ContentGap,
  QueryNetworkNode,
  HeadingHierarchy,
  InformationDensityScore,
  GscInsight,
  GscRow,
} from '../../../types';
import { fetchAllGoogleApiData, type GoogleApiEnrichment } from '../../../services/googleApiOrchestrator';
import { GapAnalysisExportDropdown } from '../../pipeline/GapAnalysisExportDropdown';

// ──── Helper Functions ────

function scoreColor(score: number): 'green' | 'blue' | 'amber' | 'red' {
  if (score >= 80) return 'green';
  if (score >= 60) return 'blue';
  if (score >= 40) return 'amber';
  return 'red';
}

function computeGapScores(results: QueryNetworkAnalysisResult): {
  overallHealth: number;
  contentQuality: number;
  pageStructure: number;
  informationDensity: number;
  topicCoverage: number;
} {
  const ownDensity = results.informationDensity.own;
  const compAvgDensity = results.informationDensity.competitorAverage;

  // Content Quality: ratio-based (your EAV count / market average EAV count)
  let contentQuality: number;
  if (ownDensity && compAvgDensity.totalEAVs > 0) {
    contentQuality = Math.min(100, Math.round((ownDensity.totalEAVs / compAvgDensity.totalEAVs) * 100));
  } else if (ownDensity) {
    contentQuality = Math.min(100, Math.round(ownDensity.densityScore));
  } else {
    // No own content analyzed — low score
    contentQuality = 20;
  }

  // Page Structure: average heading hierarchy score across own pages
  let pageStructure = -1;
  if (results.headingAnalysis.length > 0) {
    const total = results.headingAnalysis.reduce((sum, h) => sum + h.hierarchyScore, 0);
    pageStructure = Math.round(total / results.headingAnalysis.length);
  }

  // Information Density: ratio of your facts/sentence vs competitor average
  let informationDensity: number;
  if (ownDensity && compAvgDensity.factsPerSentence > 0) {
    const ratio = ownDensity.factsPerSentence / compAvgDensity.factsPerSentence;
    informationDensity = Math.min(100, Math.round(ratio * 100));
  } else if (ownDensity) {
    informationDensity = Math.round(ownDensity.densityScore);
  } else {
    informationDensity = 15; // No own content
  }

  // Topic Coverage: (topics you cover / total topics in market) × 100
  let topicCoverage: number;
  const totalGaps = results.contentGaps.length;
  const ownEavEntities = new Set(results.ownContentEAVs?.map(e => e.entity.toLowerCase()) ?? []);
  const competitorEntities = new Set(results.competitorEAVs.map(e => e.entity.toLowerCase()));
  const totalMarketTopics = competitorEntities.size;
  if (totalMarketTopics > 0 && ownEavEntities.size > 0) {
    topicCoverage = Math.min(100, Math.round((ownEavEntities.size / totalMarketTopics) * 100));
  } else if (totalGaps > 0) {
    // More gaps = lower coverage
    topicCoverage = Math.max(10, 100 - totalGaps * 8);
  } else {
    topicCoverage = ownEavEntities.size > 0 ? 60 : 20;
  }

  // Overall Health: weighted average of ALL sub-scores (not starting at 100)
  let totalWeight = 0;
  let weightedSum = 0;

  weightedSum += contentQuality * 30;
  totalWeight += 30;

  if (pageStructure >= 0) {
    weightedSum += pageStructure * 20;
    totalWeight += 20;
  }

  weightedSum += informationDensity * 25;
  totalWeight += 25;

  weightedSum += topicCoverage * 25;
  totalWeight += 25;

  const overallHealth = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  return { overallHealth, contentQuality, pageStructure, informationDensity, topicCoverage };
}

function deriveEntityType(
  entityName: string,
  eavs: CompetitorEAV[],
  businessDomain?: string,
): string {
  const lowerName = entityName.toLowerCase();
  if (businessDomain) {
    try {
      const hostname = new URL(
        businessDomain.startsWith('http') ? businessDomain : `https://${businessDomain}`,
      ).hostname.replace(/^www\./, '');
      if (lowerName.includes(hostname.split('.')[0]) || hostname.includes(lowerName.replace(/\s+/g, ''))) {
        return 'Organization';
      }
    } catch {
      if (lowerName.includes(businessDomain.toLowerCase())) {
        return 'Organization';
      }
    }
  }

  const entityEavs = eavs.filter(e => e.entity === entityName);
  const attrs = entityEavs.map(e => e.attribute.toLowerCase());

  const personAttrs = ['founder', 'ceo', 'author', 'born', 'nationality', 'age', 'biography', 'role'];
  if (attrs.some(a => personAttrs.some(p => a.includes(p)))) return 'Person';

  const conceptAttrs = ['definition', 'type', 'classification', 'category', 'meaning', 'synonym'];
  if (attrs.some(a => conceptAttrs.some(c => a.includes(c)))) return 'Concept';

  const productAttrs = ['price', 'features', 'specifications', 'cost', 'plan', 'tier', 'model', 'version'];
  if (attrs.some(a => productAttrs.some(p => a.includes(p)))) return 'Service/Product';

  const orgAttrs = ['headquarters', 'employees', 'revenue', 'founded', 'website', 'industry', 'subsidiary'];
  if (attrs.some(a => orgAttrs.some(o => a.includes(o)))) return 'Organization';

  return 'Entity';
}

// ──── Discovery Event Types ────

interface AnalysisEvent {
  id: string;
  message: string;
  type: 'scanning' | 'found' | 'detected' | 'analyzing' | 'complete' | 'warning' | 'error' | 'gsc' | 'ga4' | 'inspection' | 'nlp' | 'trends' | 'kg';
  detail?: string;
  timestamp: number;
}

// ──── Analysis Narrative Feed ────

function AnalysisNarrativeFeed({ events, isActive }: { events: AnalysisEvent[]; isActive: boolean }) {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events.length]);

  const iconMap: Record<AnalysisEvent['type'], { icon: string; color: string }> = {
    scanning: { icon: '\u2026', color: 'text-blue-400' },
    found: { icon: '\u2713', color: 'text-green-400' },
    detected: { icon: '\u25C9', color: 'text-emerald-400' },
    analyzing: { icon: '\u21BB', color: 'text-amber-400' },
    complete: { icon: '\u2714', color: 'text-green-400' },
    warning: { icon: '!', color: 'text-amber-400' },
    error: { icon: '\u2717', color: 'text-red-400' },
    gsc: { icon: '\u2606', color: 'text-teal-400' },
    ga4: { icon: '\u2261', color: 'text-blue-400' },
    inspection: { icon: '\u2315', color: 'text-teal-400' },
    nlp: { icon: '\u2699', color: 'text-purple-400' },
    trends: { icon: '\u2197', color: 'text-green-400' },
    kg: { icon: '\u25CE', color: 'text-amber-400' },
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
        {isActive && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
        )}
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          {isActive ? 'Analyzing...' : 'Analysis Log'}
        </h3>
      </div>
      <div ref={feedRef} className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
        {events.length === 0 && (
          <p className="text-xs text-gray-500 italic">Waiting to start...</p>
        )}
        {events.map((event, i) => {
          const { icon, color } = iconMap[event.type];
          return (
            <div
              key={event.id}
              className="flex items-start gap-2 animate-fadeIn"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className={`text-xs font-bold mt-0.5 w-4 text-center flex-shrink-0 ${
                !isActive && (event.type === 'analyzing' || event.type === 'scanning') ? 'text-green-400' : color
              }`}>
                {event.type === 'analyzing' && isActive ? (
                  <svg className="w-3 h-3 animate-spin inline" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : !isActive && (event.type === 'analyzing' || event.type === 'scanning') ? '\u2713' : icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-gray-300">{event.message}</p>
                {event.detail && (
                  <p className="text-xs text-gray-500 mt-0.5">{event.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──── Data Source Badge ────

function DataSourceBadge({ source }: { source: 'gsc' | 'ai' | 'serp' | 'competitor' }) {
  const config = {
    gsc: { label: 'GSC Data', color: 'text-teal-400 bg-teal-900/20 border-teal-700/40' },
    ai: { label: 'AI Analysis', color: 'text-purple-400 bg-purple-900/20 border-purple-700/40' },
    serp: { label: 'SERP Data', color: 'text-blue-400 bg-blue-900/20 border-blue-700/40' },
    competitor: { label: 'Competitor', color: 'text-amber-400 bg-amber-900/20 border-amber-700/40' },
  };
  const c = config[source];
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${c.color}`}>
      {c.label}
    </span>
  );
}

// ──── Inline GSC Connection Panel ────

interface GscConnectionState {
  isConnected: boolean;
  propertyUrl?: string;
  queryCount?: number;
  isLoading: boolean;
}

function GscConnectionPanel({
  gscState,
  onConnect,
  onLoadData,
  gscData,
  gscError,
  gscNeedsRelink,
  ga4Enabled,
  ga4PropertyName,
  ga4Connected,
}: {
  gscState: GscConnectionState;
  onConnect: () => void;
  onLoadData: () => void;
  gscData: GscRow[] | null;
  gscError?: string | null;
  gscNeedsRelink?: boolean;
  ga4Enabled?: boolean;
  ga4PropertyName?: string | null;
  ga4Connected?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(!gscState.isConnected);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
          </svg>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-200">Data Sources</p>
            <p className="text-xs text-gray-500">
              {gscState.isConnected
                ? `GSC connected: ${gscState.propertyUrl || 'property linked'}`
                : 'Connect Search Console for real ranking data'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {gscState.isConnected && (
            <span className="text-xs text-green-400 bg-green-900/20 border border-green-700/40 px-2 py-0.5 rounded">Connected</span>
          )}
          {gscData && gscData.length > 0 && (
            <span className="text-xs text-teal-400">{gscData.length} queries loaded</span>
          )}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-700 pt-3 space-y-3">
          {/* GSC Connection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${gscState.isConnected ? 'bg-green-500' : 'bg-gray-600'}`} />
              <span className="text-sm text-gray-300">Google Search Console</span>
              {gscState.isConnected && gscState.propertyUrl && (
                <span className="text-xs text-gray-500 font-mono">{gscState.propertyUrl}</span>
              )}
            </div>
            {gscState.isConnected ? (
              <button
                type="button"
                onClick={onLoadData}
                disabled={gscState.isLoading}
                className="text-xs text-teal-400 hover:text-teal-300 disabled:opacity-50 transition-colors"
              >
                {gscState.isLoading ? 'Loading...' : gscData ? 'Refresh Data' : 'Load Data'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onConnect}
                className="text-xs bg-teal-700 hover:bg-teal-600 text-white px-3 py-1 rounded transition-colors"
              >
                Connect GSC
              </button>
            )}
          </div>

          {/* GSC error display */}
          {gscError && (
            <div className="bg-red-900/20 border border-red-700/40 rounded p-3">
              <p className="text-xs text-red-300">{gscError}</p>
              {gscNeedsRelink && (
                <button
                  type="button"
                  onClick={onConnect}
                  className="mt-2 text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors"
                >
                  Re-link Google Account
                </button>
              )}
            </div>
          )}

          {/* Loaded data summary */}
          {gscData && gscData.length > 0 && (
            <div className="bg-teal-900/10 border border-teal-800/30 rounded p-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-semibold text-teal-400">{gscData.length}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Queries</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-teal-400">
                    {gscData.reduce((sum, r) => sum + r.clicks, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase">Clicks</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-teal-400">
                    {gscData.reduce((sum, r) => sum + r.impressions, 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase">Impressions</p>
                </div>
              </div>
            </div>
          )}

          {/* Google Analytics 4 */}
          <div className={`flex items-center justify-between ${ga4Connected || ga4Enabled ? '' : 'opacity-50'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${ga4Connected ? 'bg-green-500' : ga4Enabled ? 'bg-amber-500' : 'bg-gray-600'}`} />
              <span className="text-sm text-gray-300">Google Analytics 4</span>
              {ga4Connected ? (
                <span className="text-[9px] text-green-400 px-1.5 py-0.5 rounded border border-green-700/40 bg-green-900/20">
                  Connected{ga4PropertyName ? `: ${ga4PropertyName}` : ''}
                </span>
              ) : ga4Enabled ? (
                <span className="text-[9px] text-amber-400 px-1.5 py-0.5 rounded border border-amber-700/40 bg-amber-900/20">
                  Not Connected — Link in Settings
                </span>
              ) : (
                <span className="text-[9px] text-gray-500 px-1.5 py-0.5 rounded border border-gray-700">Enable in Settings</span>
              )}
            </div>
          </div>

          {!gscState.isConnected && (
            <p className="text-xs text-gray-500 mt-2">
              Connecting data sources enriches the analysis with real ranking positions, search volumes, and click-through rates.
              The analysis will still run without them using AI + SERP data.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ──── GSC Insights Panel ────

function GscInsightsPanel({ insights }: { insights: GscInsight[] }) {
  const [showAll, setShowAll] = useState(false);

  if (insights.length === 0) return null;

  const quickWins = insights.filter(i => i.type === 'quick_win');
  const lowCtr = insights.filter(i => i.type === 'low_ctr');
  const zeroClicks = insights.filter(i => i.type === 'zero_clicks');

  const visibleInsights = showAll ? insights : insights.slice(0, 8);

  const typeConfig: Record<GscInsight['type'], { label: string; color: string }> = {
    quick_win: { label: 'Quick Win', color: 'text-emerald-300 bg-emerald-900/30 border-emerald-700/40' },
    low_ctr: { label: 'Low CTR', color: 'text-amber-300 bg-amber-900/30 border-amber-700/40' },
    declining: { label: 'Declining', color: 'text-red-300 bg-red-900/30 border-red-700/40' },
    zero_clicks: { label: 'Zero Clicks', color: 'text-gray-300 bg-gray-800 border-gray-700' },
    cannibalization: { label: 'Cannibalization', color: 'text-purple-300 bg-purple-900/30 border-purple-700/40' },
  };

  return (
    <div className="bg-gray-800 border border-teal-700/40 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-200">Search Performance Insights</h3>
        <DataSourceBadge source="gsc" />
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickWins.length > 0 && (
          <span className="text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-700/40 px-2 py-1 rounded">
            {quickWins.length} quick wins
          </span>
        )}
        {lowCtr.length > 0 && (
          <span className="text-xs text-amber-400 bg-amber-900/20 border border-amber-700/40 px-2 py-1 rounded">
            {lowCtr.length} low CTR
          </span>
        )}
        {zeroClicks.length > 0 && (
          <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 px-2 py-1 rounded">
            {zeroClicks.length} zero clicks
          </span>
        )}
      </div>

      {/* Insight rows */}
      <div className="space-y-2">
        {visibleInsights.map((insight, i) => {
          const tc = typeConfig[insight.type];
          return (
            <div key={i} className="bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded border ${tc.color}`}>
                  {tc.label}
                </span>
                <span className="text-sm text-gray-200 flex-1 truncate">{insight.query}</span>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  pos {Math.round(insight.position)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                <span>{insight.impressions.toLocaleString()} impr</span>
                <span>{insight.clicks} clicks</span>
                <span>{(insight.ctr * 100).toFixed(1)}% CTR</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{insight.recommendation}</p>
            </div>
          );
        })}
      </div>

      {insights.length > 8 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-teal-400 hover:text-teal-300 mt-3"
        >
          {showAll ? 'Show fewer' : `Show all ${insights.length} insights`}
        </button>
      )}
    </div>
  );
}

// ──── Existing UI Components (preserved) ────

function ScoreCard({ label, value, color = 'gray' }: {
  label: string;
  value: string | number;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'gray';
}) {
  const colorMap: Record<string, string> = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    gray: 'text-gray-400',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
      <p className={`text-3xl font-bold ${colorMap[color]}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function SeverityBadge({ priority }: { priority: ContentGap['priority'] }) {
  const config = {
    high: { label: 'CRITICAL', classes: 'bg-red-900/30 text-red-300 border-red-700/40' },
    medium: { label: 'HIGH', classes: 'bg-amber-900/30 text-amber-300 border-amber-700/40' },
    low: { label: 'MEDIUM', classes: 'bg-yellow-900/30 text-yellow-300 border-yellow-700/40' },
  };
  const c = config[priority];
  return (
    <span className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded border ${c.classes}`}>
      {c.label}
    </span>
  );
}

function GapItem({ gap }: { gap: ContentGap }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left"
      >
        <SeverityBadge priority={gap.priority} />
        <span className="text-sm text-gray-200 flex-1">
          {gap.missingAttribute}
          <span className="text-gray-500 ml-2">
            — found in {gap.frequency} competitor{gap.frequency !== 1 ? 's' : ''}
          </span>
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-700 text-xs space-y-2">
          {gap.suggestedContent && (
            <div>
              <span className="text-gray-400 font-medium">Suggested content: </span>
              <span className="text-gray-300">{gap.suggestedContent}</span>
            </div>
          )}
          {gap.foundInCompetitors.length > 0 && (
            <div>
              <span className="text-gray-400 font-medium">Found in: </span>
              <span className="text-gray-300">
                {gap.foundInCompetitors.slice(0, 3).map((url, i) => (
                  <span key={i}>
                    {i > 0 && ', '}
                    {(() => { try { return new URL(url).hostname; } catch { return url; } })()}
                  </span>
                ))}
                {gap.foundInCompetitors.length > 3 && ` +${gap.foundInCompetitors.length - 3} more`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──── Google API Insights Panel ────

function GoogleApiInsightsPanel({ enrichment }: { enrichment: NonNullable<QueryNetworkAnalysisResult['googleApiEnrichment']> }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const items: Array<{ label: string; value: string; detail?: string; color: string; icon: string }> = [];

  if (enrichment.urlInspection) {
    const { indexed, blocked, errors, total } = enrichment.urlInspection;
    items.push({
      label: 'Indexation Status',
      value: `${indexed}/${total} pages indexed`,
      detail: blocked > 0 ? `${blocked} blocked by robots.txt` : errors > 0 ? `${errors} errors` : 'All pages accessible',
      color: indexed === total ? 'text-green-400' : blocked > 0 ? 'text-amber-400' : 'text-red-400',
      icon: '\u2315',
    });
  }

  if (enrichment.entitySalience) {
    const { centralEntitySalience, rank, totalEntities } = enrichment.entitySalience;
    const pct = (centralEntitySalience * 100).toFixed(0);
    items.push({
      label: 'Entity Salience',
      value: `Central Entity salience: ${pct}% (rank #${rank} of ${totalEntities})`,
      detail: rank === 1 ? 'Most salient entity — strong signal' : rank <= 3 ? 'Top-3 salience — good signal' : 'Consider strengthening CE prominence',
      color: rank === 1 ? 'text-green-400' : rank <= 3 ? 'text-blue-400' : 'text-amber-400',
      icon: '\u2699',
    });
  }

  if (enrichment.trends) {
    const { peakMonths, seasonalityStrength } = enrichment.trends;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const peakStr = peakMonths.length > 0
      ? peakMonths.map(m => monthNames[m - 1] || m).join(', ')
      : 'None';
    items.push({
      label: 'Search Trends',
      value: seasonalityStrength > 0.3 ? `Seasonal (strength: ${(seasonalityStrength * 100).toFixed(0)}%)` : 'Evergreen topic',
      detail: peakMonths.length > 0 ? `Peak months: ${peakStr}` : 'Consistent interest throughout the year',
      color: seasonalityStrength > 0.5 ? 'text-amber-400' : 'text-green-400',
      icon: '\u2197',
    });
  }

  if (enrichment.ga4) {
    const { totalSessions, avgBounceRate, topPages } = enrichment.ga4;
    items.push({
      label: 'GA4 Highlights',
      value: `${totalSessions.toLocaleString()} sessions/week`,
      detail: `Avg bounce rate: ${avgBounceRate}%${topPages.length > 0 ? `, top page: ${topPages[0]}` : ''}`,
      color: avgBounceRate < 50 ? 'text-green-400' : avgBounceRate < 70 ? 'text-amber-400' : 'text-red-400',
      icon: '\u2261',
    });
  }

  if (enrichment.knowledgeGraph) {
    const { found, authorityScore } = enrichment.knowledgeGraph;
    items.push({
      label: 'Knowledge Graph',
      value: found ? `Entity verified (score: ${authorityScore}/100)` : 'Entity not found',
      detail: found ? 'Entity recognized by Google Knowledge Graph' : 'Build authority through structured data and mentions',
      color: found ? 'text-green-400' : 'text-amber-400',
      icon: '\u25CE',
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-200">Google API Insights</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-700/30">
            {items.length} source{items.length !== 1 ? 's' : ''}
          </span>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-t border-gray-700/50 first:border-0">
              <span className={`text-sm mt-0.5 ${item.color}`}>{item.icon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{item.label}</span>
                </div>
                <p className={`text-sm font-medium ${item.color}`}>{item.value}</p>
                {item.detail && <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QueryNetworkSummary({ queryNetwork, hasGsc }: { queryNetwork: QueryNetworkNode[]; hasGsc?: boolean }) {
  if (queryNetwork.length === 0) return null;

  const intentCounts: Record<string, number> = { informational: 0, commercial: 0, transactional: 0, navigational: 0 };
  const allQuestions: string[] = [];
  const withVolume = queryNetwork.filter(n => n.searchVolume !== undefined);
  for (const node of queryNetwork) {
    intentCounts[node.intent] = (intentCounts[node.intent] || 0) + 1;
    allQuestions.push(...node.questions);
  }
  const total = queryNetwork.length;
  const topQuestions = [...new Set(allQuestions)].slice(0, 3);

  const intentColors: Record<string, string> = {
    informational: 'bg-blue-400',
    commercial: 'bg-amber-400',
    transactional: 'bg-green-400',
    navigational: 'bg-purple-400',
  };
  const intentTextColors: Record<string, string> = {
    informational: 'text-blue-300',
    commercial: 'text-amber-300',
    transactional: 'text-green-300',
    navigational: 'text-purple-300',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-200">Query Network Summary</h3>
        <DataSourceBadge source="ai" />
        {hasGsc && withVolume.length > 0 && <DataSourceBadge source="gsc" />}
      </div>
      <p className="text-xs text-gray-400 mb-3">
        {total} queries analyzed
        {withVolume.length > 0 && ` — ${withVolume.length} enriched with real search data`}
      </p>

      {/* Intent distribution bar */}
      <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden flex mb-3">
        {Object.entries(intentCounts).map(([intent, count]) =>
          count > 0 ? (
            <div
              key={intent}
              className={`${intentColors[intent]} h-full`}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${intent}: ${count}`}
            />
          ) : null,
        )}
      </div>

      {/* Intent legend */}
      <div className="flex flex-wrap gap-3 text-xs mb-4">
        {Object.entries(intentCounts).map(([intent, count]) =>
          count > 0 ? (
            <div key={intent} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${intentColors[intent]}`} />
              <span className={intentTextColors[intent]}>
                {count} {intent}
              </span>
            </div>
          ) : null,
        )}
      </div>

      {/* Top questions */}
      {topQuestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-2">Top User Questions</p>
          <div className="space-y-1.5">
            {topQuestions.map((q, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-blue-400 mt-0.5">?</span>
                <span className="text-gray-300">{q}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DensityComparison({ informationDensity }: {
  informationDensity: {
    own?: InformationDensityScore;
    competitorAverage: InformationDensityScore;
    topCompetitor: InformationDensityScore;
  };
}) {
  const { own, competitorAverage, topCompetitor } = informationDensity;

  const rows: { label: string; ownVal: string; avgVal: string; topVal: string }[] = [
    {
      label: 'Density',
      ownVal: own ? `${Math.round(own.densityScore)}/100` : '\u2014',
      avgVal: `${Math.round(competitorAverage.densityScore)}/100`,
      topVal: `${Math.round(topCompetitor.densityScore)}/100`,
    },
    {
      label: 'Facts/sent',
      ownVal: own ? own.factsPerSentence.toFixed(2) : '\u2014',
      avgVal: competitorAverage.factsPerSentence.toFixed(2),
      topVal: topCompetitor.factsPerSentence.toFixed(2),
    },
    {
      label: 'Entities',
      ownVal: own ? String(own.uniqueEntitiesCount) : '\u2014',
      avgVal: String(competitorAverage.uniqueEntitiesCount),
      topVal: String(topCompetitor.uniqueEntitiesCount),
    },
    {
      label: 'Attributes',
      ownVal: own ? String(own.uniqueAttributesCount) : '\u2014',
      avgVal: String(competitorAverage.uniqueAttributesCount),
      topVal: String(topCompetitor.uniqueAttributesCount),
    },
    {
      label: 'Total EAVs',
      ownVal: own ? String(own.totalEAVs) : '\u2014',
      avgVal: String(competitorAverage.totalEAVs),
      topVal: String(topCompetitor.totalEAVs),
    },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-200">Information Density</h3>
        <DataSourceBadge source="competitor" />
      </div>
      {!own && (
        <p className="text-xs text-amber-400 mb-3">No own content found in SERPs — showing competitor benchmarks only</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider" />
              {own && (
                <th className="text-center px-4 py-2 text-xs font-medium text-blue-400 uppercase tracking-wider">Your Site</th>
              )}
              <th className="text-center px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Competitor Avg</th>
              <th className="text-center px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">Top Competitor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-gray-700/50">
                <td className="px-4 py-2 text-xs text-gray-400 font-medium">{row.label}</td>
                {own && (
                  <td className="px-4 py-2 text-center text-xs text-blue-300 font-medium">{row.ownVal}</td>
                )}
                <td className="px-4 py-2 text-center text-xs text-gray-300">{row.avgVal}</td>
                <td className="px-4 py-2 text-center text-xs text-gray-300">{row.topVal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeadingAnalysisSummary({ headingAnalysis }: { headingAnalysis: HeadingHierarchy[] }) {
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  if (headingAnalysis.length === 0) return null;

  const avgScore = Math.round(
    headingAnalysis.reduce((sum, h) => sum + h.hierarchyScore, 0) / headingAnalysis.length,
  );
  const allIssues = [...new Set(headingAnalysis.flatMap(h => h.issues))];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-gray-200">Heading Analysis</h3>
        <DataSourceBadge source="serp" />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-gray-400">Average hierarchy score:</span>
        <span className={`text-lg font-bold ${scoreColor(avgScore) === 'green' ? 'text-green-400' : scoreColor(avgScore) === 'blue' ? 'text-blue-400' : scoreColor(avgScore) === 'amber' ? 'text-amber-400' : 'text-red-400'}`}>
          {avgScore}/100
        </span>
        <span className="text-xs text-gray-500">across {headingAnalysis.length} page{headingAnalysis.length !== 1 ? 's' : ''}</span>
      </div>

      {allIssues.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-400 mb-2">Common Issues</p>
          <div className="space-y-1">
            {allIssues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-amber-400 mt-0.5">!</span>
                <span className="text-gray-300">{issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        {headingAnalysis.map((page) => {
          const isExpanded = expandedUrl === page.url;
          let displayUrl: string;
          try { displayUrl = new URL(page.url).pathname; } catch { displayUrl = page.url; }
          return (
            <div key={page.url} className="border border-gray-700/50 rounded">
              <button
                type="button"
                onClick={() => setExpandedUrl(isExpanded ? null : page.url)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-700/30"
              >
                <span className="text-gray-300 truncate mr-2">{displayUrl}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`font-medium ${page.hierarchyScore >= 70 ? 'text-green-400' : page.hierarchyScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                    {page.hierarchyScore}/100
                  </span>
                  <svg
                    className={`w-3 h-3 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-700/50">
                  {page.issues.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {page.issues.map((issue, j) => (
                        <li key={j} className="text-xs text-gray-400 flex items-start gap-1.5">
                          <span className="text-amber-400">-</span> {issue}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-green-400">No issues found</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──── Greenfield Skip Notice ────

function GreenfieldSkipNotice({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
        <svg
          className="w-10 h-10 text-gray-500 mx-auto mb-3"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
        >
          <path
            strokeLinecap="round" strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <p className="text-sm text-gray-400">
          No existing site to analyze &mdash; this step was auto-skipped.
        </p>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onContinue}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors"
        >
          Continue to Strategy
        </button>
      </div>
    </div>
  );
}

// ──── Gap Analysis Content (redesigned with narrative feed) ────

function GapAnalysisContent({
  results,
  isGenerating,
  events,
  error,
  onRunAnalysis,
  businessDomain,
  hasGscData,
  currentPhase,
}: {
  results: QueryNetworkAnalysisResult | null;
  isGenerating: boolean;
  events: AnalysisEvent[];
  error: string | null;
  onRunAnalysis: () => void;
  businessDomain?: string;
  hasGscData?: boolean;
  currentPhase?: string;
}) {
  const [showAllEntities, setShowAllEntities] = useState(false);

  const allGaps = results?.contentGaps ?? [];
  const criticalCount = allGaps.filter(g => g.priority === 'high').length;
  const highCount = allGaps.filter(g => g.priority === 'medium').length;
  const mediumCount = allGaps.filter(g => g.priority === 'low').length;

  const scores = results ? computeGapScores(results) : null;

  const entityMap = new Map<string, {
    eavCount: number;
    sources: Set<string>;
    totalConfidence: number;
    categories: Set<string>;
  }>();
  const allEavs = results?.competitorEAVs ?? [];
  for (const eav of allEavs) {
    const key = eav.entity;
    const existing = entityMap.get(key);
    if (existing) {
      existing.eavCount++;
      existing.sources.add(eav.source);
      existing.totalConfidence += eav.confidence;
    } else {
      entityMap.set(key, {
        eavCount: 1,
        sources: new Set([eav.source]),
        totalConfidence: eav.confidence,
        categories: new Set<string>(),
      });
    }
    entityMap.get(key)!.categories.add(eav.category || 'COMMON');
  }

  const allEntities = [...entityMap.entries()].sort((a, b) => b[1].eavCount - a[1].eavCount);
  const visibleEntities = showAllEntities ? allEntities : allEntities.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Two-column layout during analysis */}
      {isGenerating && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnalysisNarrativeFeed events={events} isActive={isGenerating} />
          <div className="space-y-4">
            {/* Progress summary card */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-200 mb-3">Analysis Progress</h3>
              <div className="space-y-3">
                {(() => {
                  const phases = [
                    { phase: 'generating_network', label: 'Building query network' },
                    { phase: 'fetching_serps', label: 'Fetching SERP results' },
                    { phase: 'extracting_eavs', label: 'Extracting competitor data' },
                    { phase: 'analyzing_gaps', label: 'Analyzing content gaps' },
                    { phase: 'validating_entities', label: 'Validating entities' },
                    ...(hasGscData ? [{ phase: 'enriching_gsc', label: 'Enriching with GSC data' }] : []),
                  ];
                  const currentIdx = phases.findIndex(p => p.phase === currentPhase);
                  return phases.map((step, i) => {
                    const isComplete = currentIdx > i || currentPhase === 'complete';
                    const isCurrent = currentIdx === i && currentPhase !== 'complete';
                    return (
                      <div key={step.phase} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                          isComplete ? 'bg-green-900/30 text-green-400' : isCurrent ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-700 text-gray-500'
                        }`}>
                          {isComplete ? '\u2713' : isCurrent ? (
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (i + 1)}
                        </div>
                        <span className={`text-sm ${isComplete ? 'text-green-400' : isCurrent ? 'text-gray-200' : 'text-gray-500'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completed narrative log (collapsed) */}
      {!isGenerating && events.length > 0 && !results && (
        <AnalysisNarrativeFeed events={events} isActive={false} />
      )}

      {/* Site Inventory Summary (show what you have FIRST) */}
      {results?.siteInventorySummary && (
        <div className="bg-gray-800 border border-blue-700/40 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-3">Your Content Inventory</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{results.siteInventorySummary.totalPages}</p>
              <p className="text-[10px] text-gray-500 uppercase">Pages Found</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{results.siteInventorySummary.totalTopics}</p>
              <p className="text-[10px] text-gray-500 uppercase">Topics Covered</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{results.siteInventorySummary.avgWordCount.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 uppercase">Avg Words/Page</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{results.siteInventorySummary.pagesWithH1}</p>
              <p className="text-[10px] text-gray-500 uppercase">Pages with H1</p>
            </div>
          </div>
          {results.siteInventorySummary.topicsCovered.length > 0 && (
            <div className="border-t border-gray-700/50 pt-3">
              <p className="text-xs text-gray-400 mb-2">Topics covered by your pages:</p>
              <div className="flex flex-wrap gap-1.5">
                {results.siteInventorySummary.topicsCovered.slice(0, 12).map((topic, i) => (
                  <span key={i} className="text-[10px] bg-blue-900/20 text-blue-300 border border-blue-700/30 rounded px-1.5 py-0.5">
                    {topic}
                  </span>
                ))}
                {results.siteInventorySummary.topicsCovered.length > 12 && (
                  <span className="text-[10px] text-gray-500">+{results.siteInventorySummary.topicsCovered.length - 12} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Market Benchmark */}
      {results && results.competitorEAVs.length > 0 && (
        <div className="bg-gray-800 border border-amber-700/40 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-3">Market Benchmark</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">
                {new Set(results.competitorEAVs.map(e => e.entity)).size}
              </p>
              <p className="text-[10px] text-gray-500 uppercase">Entities in Market</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">
                {new Set(results.competitorEAVs.map(e => e.source)).size}
              </p>
              <p className="text-[10px] text-gray-500 uppercase">Competitors Analyzed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{results.competitorEAVs.length}</p>
              <p className="text-[10px] text-gray-500 uppercase">Competitor EAVs</p>
            </div>
          </div>
        </div>
      )}

      {/* Score Cards */}
      {(results || !isGenerating) && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <ScoreCard
            label="Overall Health"
            value={scores ? `${scores.overallHealth}/100` : '--'}
            color={scores ? scoreColor(scores.overallHealth) : 'gray'}
          />
          <ScoreCard
            label="Content Quality"
            value={scores ? `${scores.contentQuality}/100` : '--'}
            color={scores ? scoreColor(scores.contentQuality) : 'gray'}
          />
          <ScoreCard
            label="Page Structure"
            value={scores ? (scores.pageStructure >= 0 ? `${scores.pageStructure}/100` : 'N/A') : '--'}
            color={scores ? (scores.pageStructure >= 0 ? scoreColor(scores.pageStructure) : 'gray') : 'gray'}
          />
          <ScoreCard
            label="Info Density"
            value={scores ? `${scores.informationDensity}/100` : '--'}
            color={scores ? scoreColor(scores.informationDensity) : 'gray'}
          />
          <ScoreCard
            label="Topic Coverage"
            value={scores ? `${scores.topicCoverage}/100` : '--'}
            color={scores ? scoreColor(scores.topicCoverage) : 'gray'}
          />
        </div>
      )}

      {/* Export dropdown */}
      {results && scores && (
        <div className="flex justify-end">
          <GapAnalysisExportDropdown results={results} scores={scores} businessDomain={businessDomain} />
        </div>
      )}

      {/* GSC Insights (if available) */}
      {results?.gscInsights && results.gscInsights.length > 0 && (
        <GscInsightsPanel insights={results.gscInsights} />
      )}

      {/* Google API Insights */}
      {results?.googleApiEnrichment && Object.keys(results.googleApiEnrichment).length > 0 && (
        <GoogleApiInsightsPanel enrichment={results.googleApiEnrichment} />
      )}

      {/* Query Network Summary */}
      {results && <QueryNetworkSummary queryNetwork={results.queryNetwork} hasGsc={results.hasGscData} />}

      {/* Gap Findings */}
      {!isGenerating && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-200">Gap Findings</h3>
            {results && <DataSourceBadge source="competitor" />}
          </div>
          {results && allGaps.length > 0 && (
            <p className="text-xs text-gray-400 mb-4">
              {criticalCount} critical, {highCount} high, {mediumCount} medium gap{allGaps.length !== 1 ? 's' : ''} found
            </p>
          )}
          <div className="space-y-2">
            {results && allGaps.length > 0 ? (
              allGaps.map((gap, i) => <GapItem key={i} gap={gap} />)
            ) : results && allGaps.length === 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm text-green-400">
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span>No EAV-level gaps detected against analyzed competitors</span>
                </div>
                {!results.ownContentEAVs && (
                  <p className="text-xs text-amber-400 pl-5">
                    Note: Own content could not be analyzed (no pages found in SERPs or site inventory).
                    Gaps are only detected when your content is compared against competitors.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
                  <span>Run gap analysis to identify issues</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
                  <span>Missing content clusters will appear here</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
                  <span>Competitor coverage gaps will be highlighted</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Information Density */}
      {results && <DensityComparison informationDensity={results.informationDensity} />}

      {/* Recommendations */}
      {results && results.recommendations.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-gray-200">
              Recommendations ({results.recommendations.length})
            </h3>
            <DataSourceBadge source="ai" />
            {results.hasGscData && <DataSourceBadge source="gsc" />}
          </div>
          <div className="space-y-3">
            {results.recommendations.map((rec, i) => (
              <div key={i} className="bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded border ${
                    rec.priority === 'critical'
                      ? 'bg-red-900/20 text-red-300 border-red-700/40'
                      : rec.priority === 'high'
                        ? 'bg-amber-900/20 text-amber-300 border-amber-700/40'
                        : 'bg-yellow-900/20 text-yellow-300 border-yellow-700/40'
                  }`}>
                    {rec.priority}
                  </span>
                  <span className="text-sm font-medium text-gray-200">{rec.title}</span>
                </div>
                <p className="text-xs text-gray-400">{rec.suggestedAction}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entity Inventory */}
      {!isGenerating && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-200">Entity Inventory</h3>
            {results && <DataSourceBadge source="competitor" />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Entity</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Mentions</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">EAV Count</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Consistent?</th>
                </tr>
              </thead>
              <tbody>
                {visibleEntities.length > 0 ? (
                  visibleEntities.map(([name, data], i) => {
                    const mentions = data.sources.size;
                    const consistent = (data.totalConfidence / data.eavCount) > 0.7;
                    const entityType = deriveEntityType(name, allEavs, businessDomain);
                    return (
                      <tr key={i} className="border-b border-gray-700/50">
                        <td className="px-6 py-3 text-gray-300 font-medium">{name}</td>
                        <td className="px-6 py-3 text-gray-400">{entityType}</td>
                        <td className="px-6 py-3 text-center text-gray-300">{mentions}</td>
                        <td className="px-6 py-3 text-center text-gray-300">{data.eavCount}</td>
                        <td className="px-6 py-3 text-center">
                          {consistent ? (
                            <span className="text-green-400 text-xs">Yes</span>
                          ) : (
                            <span className="text-amber-400 text-xs">Review</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                      No entities discovered yet. Run gap analysis to populate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {allEntities.length > 10 && (
            <div className="px-6 py-3 border-t border-gray-700">
              <button
                type="button"
                onClick={() => setShowAllEntities(!showAllEntities)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {showAllEntities ? `Show fewer` : `Show all ${allEntities.length} entities`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Heading Analysis */}
      {results && <HeadingAnalysisSummary headingAnalysis={results.headingAnalysis} />}

      {/* Run Analysis Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onRunAnalysis}
          disabled={isGenerating}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2"
        >
          {isGenerating && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isGenerating ? 'Analyzing...' : results ? 'Re-run Gap Analysis' : 'Run Gap Analysis'}
        </button>
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineGapStep: React.FC = () => {
  const {
    isGreenfield,
    autoApprove,
    approveGate,
    rejectGate,
    reviseStep,
    toggleAutoApprove,
    getStepState,
    setCurrentStep,
    setStepStatus,
    activeMap,
  } = usePipeline();
  const { state, dispatch } = useAppState();

  const stepState = getStepState('gap_analysis');
  const gate = stepState?.gate;

  const [isGenerating, setIsGenerating] = useState(false);
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [results, setResults] = useState<QueryNetworkAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('');

  // GSC state
  const [gscState, setGscState] = useState<GscConnectionState>({
    isConnected: false,
    isLoading: true,
  });
  const [gscData, setGscData] = useState<GscRow[] | null>(null);
  const [gscError, setGscError] = useState<string | null>(null);
  const [gscNeedsRelink, setGscNeedsRelink] = useState(false);

  // GA4 state
  const [ga4Connected, setGa4Connected] = useState(false);
  const [ga4PropertyName, setGa4PropertyName] = useState<string | null>(null);

  const eventIdCounter = useRef(0);
  const addEvent = useCallback((type: AnalysisEvent['type'], message: string, detail?: string) => {
    eventIdCounter.current++;
    setEvents(prev => [...prev, {
      id: `evt-${eventIdCounter.current}`,
      type,
      message,
      detail,
      timestamp: Date.now(),
    }]);
  }, []);

  // Helper: resolve GSC account ID for Google API orchestrator
  const getGscAccountId = useCallback(async (): Promise<string | undefined> => {
    if (!gscState.propertyUrl || !state.activeProjectId) return undefined;
    try {
      const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
      const { data } = await (supabase as any)
        .from('analytics_properties')
        .select('account_id')
        .eq('property_id', gscState.propertyUrl)
        .eq('project_id', state.activeProjectId)
        .limit(1);
      return data?.[0]?.account_id || undefined;
    } catch {
      return undefined;
    }
  }, [gscState.propertyUrl, state.activeProjectId, state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  // Check GSC connection on mount
  useEffect(() => {
    const checkGscConnection = async () => {
      const supabaseUrl = state.businessInfo.supabaseUrl;
      const supabaseAnonKey = state.businessInfo.supabaseAnonKey;
      if (!supabaseUrl || !supabaseAnonKey || !state.activeProjectId) {
        setGscState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
        // Check for linked GSC properties for this project
        const { data, error: fetchError } = await (supabase as any)
          .from('analytics_properties')
          .select('id, property_id, property_name, is_primary')
          .eq('project_id', state.activeProjectId)
          .eq('service', 'gsc')
          .limit(1);

        if (!fetchError && data && data.length > 0) {
          setGscState({
            isConnected: true,
            propertyUrl: data[0].property_id,
            isLoading: false,
          });
        } else {
          setGscState(prev => ({ ...prev, isLoading: false }));
        }
      } catch {
        setGscState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkGscConnection();
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey, state.activeProjectId]);

  // Check GA4 connection on mount
  useEffect(() => {
    const checkGa4Connection = async () => {
      const supabaseUrl = state.businessInfo.supabaseUrl;
      const supabaseAnonKey = state.businessInfo.supabaseAnonKey;
      if (!supabaseUrl || !supabaseAnonKey || !state.activeProjectId) return;

      try {
        const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
        const { data, error: fetchError } = await (supabase as any)
          .from('analytics_properties')
          .select('id, property_id, property_name')
          .eq('project_id', state.activeProjectId)
          .eq('service', 'ga4')
          .limit(1);

        if (!fetchError && data && data.length > 0) {
          setGa4Connected(true);
          setGa4PropertyName(data[0].property_name || data[0].property_id);
        } else {
          setGa4Connected(false);
          setGa4PropertyName(null);
        }
      } catch {
        setGa4Connected(false);
        setGa4PropertyName(null);
      }
    };

    checkGa4Connection();
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey, state.activeProjectId]);

  // Listen for OAuth completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GSC_CONNECTED') {
        // Re-check connection after OAuth flow
        setGscState(prev => ({ ...prev, isLoading: true }));
        const supabaseUrl = state.businessInfo.supabaseUrl;
        const supabaseAnonKey = state.businessInfo.supabaseAnonKey;
        if (supabaseUrl && supabaseAnonKey && state.activeProjectId) {
          const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
          (supabase as any)
            .from('analytics_properties')
            .select('id, property_id, property_name, is_primary')
            .eq('project_id', state.activeProjectId)
            .eq('service', 'gsc')
            .limit(1)
            .then(({ data }: any) => {
              if (data && data.length > 0) {
                setGscState({
                  isConnected: true,
                  propertyUrl: data[0].property_id,
                  isLoading: false,
                });
              } else {
                setGscState(prev => ({ ...prev, isLoading: false }));
              }
            })
            .catch(() => {
              setGscState(prev => ({ ...prev, isLoading: false }));
            });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey, state.activeProjectId]);

  const handleGscConnect = useCallback(() => {
    const adapter = new GscApiAdapter();
    const authUrl = adapter.getAuthorizationUrl(
      state.activeProjectId || 'gap-analysis',
      `${window.location.origin}/oauth-callback.html`,
    );
    window.open(authUrl, 'gsc-oauth', 'width=600,height=700,left=200,top=100');
  }, [state.activeProjectId]);

  const handleLoadGscData = useCallback(async () => {
    if (!gscState.propertyUrl) return;

    setGscState(prev => ({ ...prev, isLoading: true }));

    try {
      const supabaseUrl = state.businessInfo.supabaseUrl;
      const supabaseAnonKey = state.businessInfo.supabaseAnonKey;
      if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase not configured');

      const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);

      // Get the access token for the linked account
      const { data: propData } = await (supabase as any)
        .from('analytics_properties')
        .select('account_id')
        .eq('property_id', gscState.propertyUrl)
        .eq('project_id', state.activeProjectId)
        .limit(1);

      if (!propData?.length) throw new Error('No linked property found');

      // Fetch GSC data via edge function (avoids CORS)
      const { data, error: fnError } = await supabase.functions.invoke('gsc-integration', {
        body: {
          accountId: propData[0].account_id,
          siteUrl: gscState.propertyUrl,
          startDate: new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          dimensions: ['query'],
          rowLimit: 500,
        },
      });

      // Check for structured error responses from the edge function.
      // When the edge function returns a non-2xx status, supabase.functions.invoke()
      // sets fnError to a generic message but data still contains the actual error details.
      if (data?.error) {
        const needsRelink = !!data.relink;
        setGscNeedsRelink(needsRelink);
        const detail = data.detail ? ` (${data.detail})` : '';
        setGscError(`${data.error}${detail}`);
        setGscState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (fnError) throw fnError;

      const rows: GscRow[] = (data?.rows || []).map((row: any) => ({
        query: row.keys?.[0] || row.query || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));

      setGscError(null);
      setGscNeedsRelink(false);
      setGscData(rows);
      setGscState(prev => ({ ...prev, queryCount: rows.length, isLoading: false }));
    } catch (err: any) {
      console.warn('[GapStep] Failed to load GSC data:', err);
      // Try to parse structured error from edge function
      const message = err?.message || 'Failed to load GSC data';
      setGscError(message);
      setGscState(prev => ({ ...prev, isLoading: false }));
    }
  }, [gscState.propertyUrl, state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey, state.activeProjectId]);

  const handleContinueToStrategy = () => {
    setCurrentStep('strategy');
  };

  const handleRunAnalysis = async () => {
    const businessInfo = state.businessInfo;
    const pillars = activeMap?.pillars;
    const centralEntity = pillars?.centralEntity || businessInfo.seedKeyword;

    if (!centralEntity) {
      setError('Central Entity or Seed Keyword is required. Complete the Crawl step with business context first.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setEvents([]);
    setCurrentPhase('');
    setStepStatus('gap_analysis', 'in_progress');

    // Initial narrative events
    addEvent('scanning', 'Starting comprehensive gap analysis...', `Seed: "${centralEntity}"`);
    if (gscData && gscData.length > 0) {
      addEvent('gsc', `Loading ${gscData.length} GSC queries for enrichment`, `${gscData.reduce((s, r) => s + r.impressions, 0).toLocaleString()} total impressions`);
    }

    // Load site inventory: try analysis_state first, then Supabase site_inventory table
    let siteInventory: any[] = (activeMap?.analysis_state as any)?.site_inventory
      ?? (activeMap?.analysis_state as any)?.crawl?.pages
      ?? [];

    // Fallback: load from site_inventory table if not in analysis_state
    if (siteInventory.length === 0 && state.activeProjectId && businessInfo.supabaseUrl && businessInfo.supabaseAnonKey) {
      try {
        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
        const { data: inventoryData } = await supabase
          .from('site_inventory')
          .select('url, title, word_count, page_h1, meta_description, headings')
          .eq('project_id', state.activeProjectId)
          .limit(50);
        if (inventoryData && inventoryData.length > 0) {
          siteInventory = inventoryData;
          addEvent('found', `Loaded ${inventoryData.length} pages from site inventory`);
        }
      } catch {
        // Non-fatal — continue without inventory
      }
    }

    // Fetch all available Google API data in parallel (before main audit)
    let googleEnrichment: GoogleApiEnrichment = {};
    try {
      const gscAccountId = gscState.isConnected
        ? (await getGscAccountId())
        : undefined;
      const supabase = businessInfo.supabaseUrl && businessInfo.supabaseAnonKey
        ? getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey)
        : undefined;

      googleEnrichment = await fetchAllGoogleApiData({
        businessInfo,
        siteUrl: gscState.propertyUrl || `https://${businessInfo.domain}`,
        siteInventory: siteInventory.length > 0 ? siteInventory : undefined,
        projectId: state.activeProjectId || '',
        accountId: gscAccountId,
        supabase,
        onProgress: (event) => {
          addEvent(
            (event.type as AnalysisEvent['type']) || 'analyzing',
            event.message,
            event.detail
          );
        },
      });
    } catch (e) {
      addEvent('warning', 'Google API enrichment partially failed', (e as Error).message);
    }

    const config: QueryNetworkAuditConfig = {
      seedKeyword: centralEntity,
      targetDomain: businessInfo.domain,
      maxQueries: 10,
      maxCompetitors: 8,
      includeOwnContent: !!businessInfo.domain,
      includeEntityValidation: false,
      language: businessInfo.language || 'en',
      gscData: gscData || undefined,
      siteInventory: siteInventory.length > 0 ? siteInventory : undefined,
      urlInspectionResults: googleEnrichment.urlInspection?.results,
      entitySalienceResults: googleEnrichment.entitySalience?.entities,
      trendsData: googleEnrichment.trends?.data ? {
        interestOverTime: googleEnrichment.trends.data.interestOverTime,
        relatedQueries: googleEnrichment.trends.data.relatedQueries,
        risingQueries: googleEnrichment.trends.data.risingQueries,
      } : undefined,
      ga4Metrics: googleEnrichment.ga4?.metrics?.map(m => ({
        pagePath: m.pagePath,
        sessions: m.sessions,
        totalUsers: m.totalUsers,
        pageviews: m.pageviews,
        bounceRate: m.bounceRate,
        avgSessionDuration: m.avgSessionDuration,
      })),
      knowledgeGraphEntity: googleEnrichment.knowledgeGraph?.entity,
    };

    try {
      const result = await runQueryNetworkAudit(config, businessInfo, (prog) => {
        // Track current phase for progress step indicator
        setCurrentPhase(prog.phase);
        // Map progress phases to narrative events
        switch (prog.phase) {
          case 'generating_network':
            if (prog.completedSteps === 0) {
              addEvent('analyzing', 'Building query network...', `Generating ${config.maxQueries} related queries for "${centralEntity}"`);
            }
            break;
          case 'fetching_serps':
            addEvent('found', `Query network ready: ${prog.completedSteps > 0 ? 'fetching SERP data' : 'starting SERP analysis'}`, prog.currentStep);
            break;
          case 'extracting_eavs':
            addEvent('analyzing', 'Extracting competitor content...', `Analyzing top ${config.maxCompetitors} competitors per query`);
            break;
          case 'analyzing_gaps':
            addEvent('detected', 'Identifying content gaps...', 'Comparing your content against competitor data');
            break;
          case 'validating_entities':
            addEvent('analyzing', 'Validating entity authority...', 'Cross-referencing with knowledge bases');
            break;
          case 'enriching_gsc':
            addEvent('gsc', 'Enriching with search performance data...', 'Mapping GSC positions and CTR to query network');
            break;
          case 'complete':
            addEvent('complete', 'Gap analysis complete', `Found ${prog.completedSteps} data points`);
            break;
        }
      });

      // Post-analysis narrative events
      const gapCount = result.contentGaps.length;
      const entityCount = new Set(result.competitorEAVs.map(e => e.entity)).size;
      addEvent('found', `Discovered ${entityCount} entities across competitors`);
      if (gapCount > 0) {
        const critical = result.contentGaps.filter(g => g.priority === 'high').length;
        addEvent('warning', `Found ${gapCount} content gaps`, `${critical} critical gaps need attention`);
      } else {
        addEvent('found', 'No content gaps detected — good coverage');
      }
      if (result.gscInsights && result.gscInsights.length > 0) {
        const quickWins = result.gscInsights.filter(i => i.type === 'quick_win').length;
        addEvent('gsc', `${result.gscInsights.length} search performance insights`, quickWins > 0 ? `${quickWins} quick win opportunities identified` : undefined);
      }
      addEvent('complete', 'Analysis complete — review findings below');

      // Attach Google API enrichment summary to result
      if (Object.keys(googleEnrichment).length > 0) {
        result.googleApiEnrichment = {
          urlInspection: googleEnrichment.urlInspection?.summary,
          entitySalience: googleEnrichment.entitySalience?.prominence
            ? {
                centralEntitySalience: googleEnrichment.entitySalience.prominence.salience,
                rank: googleEnrichment.entitySalience.prominence.rank,
                totalEntities: googleEnrichment.entitySalience.prominence.totalEntities,
              }
            : undefined,
          trends: googleEnrichment.trends?.seasonality
            ? {
                peakMonths: googleEnrichment.trends.seasonality.peakMonths,
                seasonalityStrength: googleEnrichment.trends.seasonality.seasonalityStrength,
              }
            : undefined,
          ga4: googleEnrichment.ga4?.summary,
          knowledgeGraph: googleEnrichment.knowledgeGraph
            ? {
                found: googleEnrichment.knowledgeGraph.found,
                authorityScore: googleEnrichment.knowledgeGraph.authorityScore,
              }
            : undefined,
        };
      }

      setResults(result);

      // Persist to map state
      if (state.activeMapId) {
        dispatch({
          type: 'UPDATE_MAP_DATA',
          payload: {
            mapId: state.activeMapId,
            data: {
              analysis_state: {
                ...activeMap?.analysis_state,
                gap_analysis: result,
              },
            } as any,
          },
        });
      }

      setStepStatus('gap_analysis', 'pending_approval');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gap analysis failed';
      addEvent('error', 'Analysis failed', message);
      setError(message);
      setStepStatus('gap_analysis', 'in_progress');
    } finally {
      setIsGenerating(false);
    }
  };

  // Compute scores for ApprovalGate summary metrics
  type MetricColor = 'green' | 'blue' | 'amber' | 'red' | 'gray';
  const scores = results ? computeGapScores(results) : null;
  const summaryMetrics: Array<{ label: string; value: string | number; color?: MetricColor }> = scores
    ? [
        { label: 'Overall Health', value: `${scores.overallHealth}/100`, color: scoreColor(scores.overallHealth) },
        { label: 'Content Quality', value: `${scores.contentQuality}/100`, color: scoreColor(scores.contentQuality) },
        { label: 'Topic Coverage', value: `${scores.topicCoverage}/100`, color: scoreColor(scores.topicCoverage) },
        { label: 'Info Density', value: `${scores.informationDensity}/100`, color: scoreColor(scores.informationDensity) },
      ]
    : [
        { label: 'Overall Health', value: '--', color: 'gray' },
        { label: 'Content Quality', value: '--', color: 'gray' },
        { label: 'Topic Coverage', value: '--', color: 'gray' },
        { label: 'Info Density', value: '--', color: 'gray' },
      ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Gap Analysis</h2>
        <p className="text-sm text-gray-400 mt-1">
          {isGreenfield
            ? 'No existing site to analyze'
            : 'Analyze your existing website against the Holistic SEO framework'}
        </p>
      </div>

      {/* Content */}
      {isGreenfield ? (
        <GreenfieldSkipNotice onContinue={handleContinueToStrategy} />
      ) : (
        <>
          {/* Data Sources Panel */}
          <GscConnectionPanel
            gscState={gscState}
            onConnect={handleGscConnect}
            onLoadData={handleLoadGscData}
            gscData={gscData}
            gscError={gscError}
            gscNeedsRelink={gscNeedsRelink}
            ga4Enabled={!!state.businessInfo.enableGa4Integration}
            ga4Connected={ga4Connected}
            ga4PropertyName={ga4PropertyName}
          />

          <GapAnalysisContent
            results={results}
            isGenerating={isGenerating}
            events={events}
            error={error}
            onRunAnalysis={handleRunAnalysis}
            businessDomain={state.businessInfo.domain}
            hasGscData={!!(gscData && gscData.length > 0)}
            currentPhase={currentPhase}
          />

          {/* Approval Gate */}
          {gate && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
            <ApprovalGate
              step="gap_analysis"
              gate={gate}
              approval={stepState?.approval}
              autoApprove={autoApprove}
              onApprove={() => approveGate('gap_analysis')}
              onReject={(reason) => rejectGate('gap_analysis', reason)}
              onRevise={() => reviseStep('gap_analysis')}
              onToggleAutoApprove={toggleAutoApprove}
              summaryMetrics={summaryMetrics}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PipelineGapStep;
