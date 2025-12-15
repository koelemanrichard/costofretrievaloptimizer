/**
 * StrategyOverview
 *
 * Condensed panel showing key metrics and SEO pillars.
 * Replaces the separate StrategicDashboard and StrategicContextPanel.
 */

import React, { useMemo, useState } from 'react';
import { SEOPillars, EnrichedTopic, ContentBrief, SemanticTriple } from '../../types';
import { KnowledgeGraph } from '../../lib/knowledgeGraph';
import { calculateBriefHealthStats, calculateBriefQualityScore, getMissingFields } from '../../utils/briefQualityScore';

interface StrategyOverviewProps {
  pillars?: SEOPillars;
  topics: EnrichedTopic[];
  briefs: Record<string, ContentBrief>;
  eavs?: SemanticTriple[];
  knowledgeGraph?: KnowledgeGraph | null;
  onEditPillars?: () => void;
  onEditEavs?: () => void;
  onEditCompetitors?: () => void;
}

type MetricDetailType = 'ready' | 'domain' | 'eav' | 'context' | null;

const StrategyOverview: React.FC<StrategyOverviewProps> = ({
  pillars,
  topics,
  briefs,
  eavs = [],
  knowledgeGraph,
  onEditPillars,
  onEditEavs,
  onEditCompetitors,
}) => {
  const [activeDetail, setActiveDetail] = useState<MetricDetailType>(null);

  // Calculate metrics
  const metrics = useMemo(() => {
    const topicIds = topics.map(t => t.id);
    const briefStats = calculateBriefHealthStats(briefs, topicIds);

    // Brief quality percentage - only COMPLETE briefs count toward 100%
    // This gives users accurate info about content readiness
    const briefQualityPercent = topics.length > 0
      ? Math.round((briefStats.complete / topics.length) * 100)
      : 0;

    // Domain coverage estimate (based on KG node count vs topics)
    const kgNodeCount = knowledgeGraph?.getNodes?.()?.size || 0;
    const domainCoverage = topics.length > 0 && kgNodeCount > 0
      ? Math.min(100, Math.round((kgNodeCount / topics.length) * 50))
      : 0;

    // EAV density
    const eavDensity = topics.length > 0
      ? (eavs.length / topics.length).toFixed(1)
      : '0';

    // Context completeness (topics with contextual bridge)
    const topicsWithContext = Object.values(briefs).filter(b => {
      const hasContext = b.contextualBridge && (
        Array.isArray(b.contextualBridge)
          ? b.contextualBridge.length > 0
          : (b.contextualBridge as any)?.suggested_internal_links?.length > 0
      );
      return hasContext;
    }).length;
    const contextCoverage = briefStats.withBriefs > 0
      ? Math.round((topicsWithContext / briefStats.withBriefs) * 100)
      : 0;

    // Detailed breakdown for popups
    const topicsNeedingBriefs = topics.filter(t => !briefs[t.id]).map(t => t.title);
    const partialBriefs = topics.filter(t => {
      const brief = briefs[t.id];
      if (!brief) return false;
      const result = calculateBriefQualityScore(brief);
      return result.score >= 40 && result.score < 80;
    }).map(t => ({ title: t.title, missing: getMissingFields(briefs[t.id]) }));
    const failedBriefs = topics.filter(t => {
      const brief = briefs[t.id];
      if (!brief) return false;
      const result = calculateBriefQualityScore(brief);
      return result.score < 40;
    }).map(t => ({ title: t.title, missing: getMissingFields(briefs[t.id]) }));

    const topicsWithoutContext = Object.entries(briefs)
      .filter(([, b]) => {
        const hasContext = b.contextualBridge && (
          Array.isArray(b.contextualBridge)
            ? b.contextualBridge.length > 0
            : (b.contextualBridge as any)?.suggested_internal_links?.length > 0
        );
        return !hasContext;
      })
      .map(([id]) => topics.find(t => t.id === id)?.title)
      .filter(Boolean) as string[];

    return {
      briefQualityPercent,
      domainCoverage,
      eavDensity,
      contextCoverage,
      briefStats,
      totalTopics: topics.length,
      totalEavs: eavs.length,
      // Detailed breakdowns
      topicsNeedingBriefs,
      partialBriefs,
      failedBriefs,
      topicsWithoutContext,
    };
  }, [topics, briefs, eavs, knowledgeGraph]);

  // Pillar status
  const pillarStatus = useMemo(() => {
    if (!pillars) return { defined: false, summary: 'Not defined' };

    const defined = [];
    if (pillars.centralEntity) defined.push('CE');
    if (pillars.sourceContext) defined.push('SC');
    if (pillars.centralSearchIntent) defined.push('CSI');

    return {
      defined: defined.length === 3,
      summary: defined.length > 0 ? defined.join(', ') : 'Not defined',
    };
  }, [pillars]);

  return (
    <div className="space-y-4">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          value={`${metrics.briefQualityPercent}%`}
          label="Ready"
          detail={`${metrics.briefStats.complete}/${metrics.totalTopics} complete`}
          status={metrics.briefQualityPercent >= 80 ? 'good' : metrics.briefQualityPercent >= 50 ? 'warning' : 'low'}
          onClick={() => setActiveDetail(activeDetail === 'ready' ? null : 'ready')}
          isActive={activeDetail === 'ready'}
        />
        <MetricCard
          value={`${metrics.domainCoverage}%`}
          label="Domain"
          detail="knowledge coverage"
          status={metrics.domainCoverage >= 70 ? 'good' : metrics.domainCoverage >= 40 ? 'warning' : 'low'}
          onClick={() => setActiveDetail(activeDetail === 'domain' ? null : 'domain')}
          isActive={activeDetail === 'domain'}
        />
        <MetricCard
          value={metrics.eavDensity}
          label="Avg EAV"
          detail={`${metrics.totalEavs} total`}
          status={Number(metrics.eavDensity) >= 3 ? 'good' : Number(metrics.eavDensity) >= 1 ? 'warning' : 'low'}
          onClick={() => setActiveDetail(activeDetail === 'eav' ? null : 'eav')}
          isActive={activeDetail === 'eav'}
        />
        <MetricCard
          value={`${metrics.contextCoverage}%`}
          label="Context"
          detail="internal links"
          status={metrics.contextCoverage >= 80 ? 'good' : metrics.contextCoverage >= 50 ? 'warning' : 'low'}
          onClick={() => setActiveDetail(activeDetail === 'context' ? null : 'context')}
          isActive={activeDetail === 'context'}
        />
      </div>

      {/* Metric Detail Popup */}
      {activeDetail && (
        <MetricDetailPopup
          type={activeDetail}
          metrics={metrics}
          onClose={() => setActiveDetail(null)}
          onEditEavs={onEditEavs}
        />
      )}

      {/* Pillars & Quick Actions */}
      <div className="flex items-center justify-between gap-4 p-3 bg-gray-800/30 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">SEO Pillars:</span>
          <span className={`text-sm font-medium ${pillarStatus.defined ? 'text-green-400' : 'text-yellow-400'}`}>
            {pillarStatus.summary}
          </span>
          {pillarStatus.defined && (
            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onEditPillars && (
            <QuickActionButton onClick={onEditPillars} label="Edit Pillars" />
          )}
          {onEditEavs && (
            <QuickActionButton onClick={onEditEavs} label="Manage EAVs" />
          )}
          {onEditCompetitors && (
            <QuickActionButton onClick={onEditCompetitors} label="Competitors" />
          )}
        </div>
      </div>

      {/* Brief Health Summary */}
      {metrics.briefStats.withBriefs > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">Brief Health:</span>
          <HealthPill count={metrics.briefStats.complete} label="Complete" color="green" />
          <HealthPill count={metrics.briefStats.partial} label="Partial" color="yellow" />
          <HealthPill count={metrics.briefStats.empty} label="Failed" color="red" />
        </div>
      )}
    </div>
  );
};

/**
 * Metric Card
 */
interface MetricCardProps {
  value: string | number;
  label: string;
  detail?: string;
  status?: 'good' | 'warning' | 'low';
  onClick?: () => void;
  isActive?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  value,
  label,
  detail,
  status = 'good',
  onClick,
  isActive,
}) => {
  const statusColors = {
    good: 'text-green-400',
    warning: 'text-yellow-400',
    low: 'text-red-400',
  };

  return (
    <button
      onClick={onClick}
      className={`
        bg-gray-800/50 border rounded-lg p-3 text-center transition-all cursor-pointer
        hover:bg-gray-700/50 hover:border-gray-600
        ${isActive ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-700/50'}
      `}
    >
      <div className={`text-2xl font-bold ${statusColors[status]}`}>{value}</div>
      <div className="text-sm text-gray-300 mt-0.5">{label}</div>
      {detail && <div className="text-xs text-gray-500 mt-0.5">{detail}</div>}
      <div className="text-xs text-blue-400 mt-1 opacity-60">Click for details</div>
    </button>
  );
};

/**
 * Metric Detail Popup - Shows detailed breakdown when a metric is clicked
 */
interface MetricDetailPopupProps {
  type: MetricDetailType;
  metrics: {
    briefQualityPercent: number;
    domainCoverage: number;
    eavDensity: string;
    contextCoverage: number;
    briefStats: { complete: number; partial: number; empty: number; withBriefs: number };
    totalTopics: number;
    totalEavs: number;
    topicsNeedingBriefs: string[];
    partialBriefs: { title: string; missing: string[] }[];
    failedBriefs: { title: string; missing: string[] }[];
    topicsWithoutContext: string[];
  };
  onClose: () => void;
  onEditEavs?: () => void;
}

const MetricDetailPopup: React.FC<MetricDetailPopupProps> = ({ type, metrics, onClose, onEditEavs }) => {
  const renderContent = () => {
    switch (type) {
      case 'ready':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-white">Brief Readiness Breakdown</h4>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="bg-green-500/10 border border-green-500/30 rounded p-2 text-center">
                <div className="text-lg font-bold text-green-400">{metrics.briefStats.complete}</div>
                <div className="text-green-300">Complete</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-center">
                <div className="text-lg font-bold text-yellow-400">{metrics.briefStats.partial}</div>
                <div className="text-yellow-300">Partial</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded p-2 text-center">
                <div className="text-lg font-bold text-red-400">{metrics.briefStats.empty}</div>
                <div className="text-red-300">Failed</div>
              </div>
            </div>

            {/* Topics needing briefs */}
            {metrics.topicsNeedingBriefs.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-300 mb-2">
                  Topics Without Briefs ({metrics.topicsNeedingBriefs.length})
                </h5>
                <ul className="text-xs text-gray-400 space-y-1 max-h-32 overflow-y-auto">
                  {metrics.topicsNeedingBriefs.slice(0, 10).map((title, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-gray-500">•</span> {title}
                    </li>
                  ))}
                  {metrics.topicsNeedingBriefs.length > 10 && (
                    <li className="text-gray-500 italic">...and {metrics.topicsNeedingBriefs.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}

            {/* Partial briefs */}
            {metrics.partialBriefs.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-yellow-400 mb-2">
                  Partial Briefs ({metrics.partialBriefs.length}) - Missing Components
                </h5>
                <ul className="text-xs space-y-2 max-h-40 overflow-y-auto">
                  {metrics.partialBriefs.slice(0, 5).map((brief, i) => (
                    <li key={i} className="bg-yellow-500/5 border border-yellow-500/20 rounded p-2">
                      <div className="text-gray-300 font-medium">{brief.title}</div>
                      <div className="text-yellow-400/80 mt-1">Missing: {brief.missing.join(', ')}</div>
                    </li>
                  ))}
                  {metrics.partialBriefs.length > 5 && (
                    <li className="text-gray-500 italic text-center py-1">...and {metrics.partialBriefs.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            {/* Failed briefs */}
            {metrics.failedBriefs.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-red-400 mb-2">
                  Failed Briefs ({metrics.failedBriefs.length}) - Need Regeneration
                </h5>
                <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {metrics.failedBriefs.slice(0, 5).map((brief, i) => (
                    <li key={i} className="text-gray-400">
                      <span className="text-red-400">✕</span> {brief.title}
                    </li>
                  ))}
                  {metrics.failedBriefs.length > 5 && (
                    <li className="text-gray-500 italic">...and {metrics.failedBriefs.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            <p className="text-xs text-gray-500">
              💡 Use "Generate All Briefs" in the Content menu to create missing briefs, or click individual topics to regenerate.
            </p>
          </div>
        );

      case 'domain':
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-white">Domain Knowledge Coverage</h4>
            <p className="text-sm text-gray-400">
              This metric estimates how well your Knowledge Graph covers your domain.
              A higher percentage means better semantic coverage for your content strategy.
            </p>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
              <div className="text-sm text-blue-300">
                <strong>Current Coverage: {metrics.domainCoverage}%</strong>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Based on Knowledge Graph nodes vs topic count
              </div>
            </div>
            <p className="text-xs text-gray-500">
              💡 Run "Analyze Domain" in the Strategy menu to expand your Knowledge Graph and improve coverage.
            </p>
          </div>
        );

      case 'eav':
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-white">Semantic Triples (EAV) Density</h4>
            <p className="text-sm text-gray-400">
              Entity-Attribute-Value triples provide unique differentiating information for your content.
              Higher density means more unique data points per topic.
            </p>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-300">Total EAVs:</span>
                <span className="text-lg font-bold text-purple-400">{metrics.totalEavs}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-purple-300">Average per Topic:</span>
                <span className="text-lg font-bold text-purple-400">{metrics.eavDensity}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              💡 Target: 3+ EAVs per topic for differentiated content. Use "Manage EAVs" to add more semantic triples.
            </p>
            {onEditEavs && (
              <button
                onClick={() => { onClose(); onEditEavs(); }}
                className="w-full py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
              >
                Manage Semantic Triples
              </button>
            )}
          </div>
        );

      case 'context':
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-white">Internal Linking Context</h4>
            <p className="text-sm text-gray-400">
              Topics with contextual bridges have internal linking suggestions that help build topical authority.
            </p>
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded p-3">
              <div className="text-sm text-cyan-300">
                <strong>{metrics.contextCoverage}%</strong> of briefs have internal links defined
              </div>
            </div>
            {metrics.topicsWithoutContext.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-300 mb-2">
                  Briefs Missing Context ({metrics.topicsWithoutContext.length})
                </h5>
                <ul className="text-xs text-gray-400 space-y-1 max-h-32 overflow-y-auto">
                  {metrics.topicsWithoutContext.slice(0, 8).map((title, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-gray-500">•</span> {title}
                    </li>
                  ))}
                  {metrics.topicsWithoutContext.length > 8 && (
                    <li className="text-gray-500 italic">...and {metrics.topicsWithoutContext.length - 8} more</li>
                  )}
                </ul>
              </div>
            )}
            <p className="text-xs text-gray-500">
              💡 Run "Internal Link Audit" in the Analysis menu to generate linking recommendations.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">{/* Title rendered in content */}</div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl leading-none ml-2"
        >
          ×
        </button>
      </div>
      {renderContent()}
    </div>
  );
};

/**
 * Quick Action Button
 */
interface QuickActionButtonProps {
  onClick: () => void;
  label: string;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ onClick, label }) => {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
    >
      {label}
    </button>
  );
};

/**
 * Health Pill
 */
interface HealthPillProps {
  count: number;
  label: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
}

const HealthPill: React.FC<HealthPillProps> = ({ count, label, color }) => {
  if (count === 0) return null;

  const colorClasses = {
    green: 'bg-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    red: 'bg-red-500/20 text-red-400',
    gray: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${colorClasses[color]}`}>
      <span className="font-medium">{count}</span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
};

export default StrategyOverview;
