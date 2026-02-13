// components/insights/tabs/TopicalAuthorityTab.tsx
// Topical Authority - Deep dive into map quality and EAV coverage

import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import type { AggregatedInsights, InsightActionType } from '../../../types/insights';

interface TopicalAuthorityTabProps {
  insights: AggregatedInsights;
  mapId: string;
  onRefresh: () => void;
  onAction?: (actionType: InsightActionType, payload?: Record<string, any>) => Promise<void>;
  actionLoading?: string | null;
}

export const TopicalAuthorityTab: React.FC<TopicalAuthorityTabProps> = ({
  insights,
  mapId,
  onRefresh,
  onAction,
  actionLoading,
}) => {
  const { topicalAuthority } = insights;
  const [expandedEntities, setExpandedEntities] = useState(false);

  // Calculate category colors
  const categoryColors: Record<string, string> = {
    UNIQUE: '#22c55e',
    ROOT: '#3b82f6',
    RARE: '#f97316',
    COMMON: '#6b7280',
    UNCATEGORIZED: '#9333ea',
  };

  // Calculate pie chart data
  const totalEavs = topicalAuthority.eavDistribution.totalEavs;
  const categories = Object.entries(topicalAuthority.eavDistribution.byCategory);
  let currentAngle = 0;

  const pieSlices = categories.map(([category, count]) => {
    const percentage = totalEavs > 0 ? (count / totalEavs) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    return {
      category,
      count,
      percentage,
      startAngle,
      angle,
      color: categoryColors[category] || '#6b7280',
    };
  });

  // Check if there's any EAV data
  const hasEavData = totalEavs > 0;

  return (
    <div className="space-y-6">
      {/* No EAV Data Banner */}
      {!hasEavData && (
        <div className="p-6 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-700/50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-full">
              <svg className="w-8 h-8 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">No EAVs Discovered Yet</h3>
              <p className="text-gray-400">
                Entity-Attribute-Value triples form the foundation of your topical authority. Complete the EAV Discovery Wizard to generate semantic triples that define your expertise.
              </p>
            </div>
            <button
              onClick={() => onAction?.('expand_eavs')}
              disabled={!!actionLoading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {actionLoading === 'expand_eavs' ? 'Generating...' : 'Generate EAVs'}
            </button>
          </div>
        </div>
      )}

      {/* Map Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Map Structure Health</h3>
          <div className="space-y-4">
            {/* Hub-Spoke Ratio */}
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">Hub-Spoke Ratio</span>
                <span className={`font-mono ${
                  topicalAuthority.mapHealth.hubSpokeRatio >= 3 && topicalAuthority.mapHealth.hubSpokeRatio <= 8
                    ? 'text-green-400'
                    : topicalAuthority.mapHealth.hubSpokeRatio >= 2
                      ? 'text-yellow-400'
                      : 'text-red-400'
                }`}>
                  1:{topicalAuthority.mapHealth.hubSpokeRatio}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Optimal ratio is {topicalAuthority.mapHealth.optimalRatio}.
                {topicalAuthority.mapHealth.hubSpokeRatio < 3 && ' Consider merging under-supported hubs or adding supporting content.'}
              </div>
            </div>

            {/* Topic Counts */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {topicalAuthority.mapHealth.coreTopics}
                </div>
                <div className="text-xs text-gray-400">Core Topics</div>
              </div>
              <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-400">
                  {topicalAuthority.mapHealth.outerTopics}
                </div>
                <div className="text-xs text-gray-400">Outer Topics</div>
              </div>
              <div className="p-3 bg-orange-900/30 border border-orange-700/50 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {topicalAuthority.mapHealth.orphanTopicCount}
                </div>
                <div className="text-xs text-gray-400">Orphan Topics</div>
              </div>
            </div>

            {topicalAuthority.mapHealth.orphanTopicCount > 0 && (
              <div className="p-3 bg-orange-900/30 border border-orange-700/50 rounded-lg text-sm text-orange-300">
                <strong>Tip:</strong> You have {topicalAuthority.mapHealth.orphanTopicCount} orphan topics without parent links.
                Consider linking them to core topics for better topical clustering.
              </div>
            )}
          </div>
        </Card>

        {/* EAV Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">EAV Distribution</h3>
          <div className="flex items-center gap-6">
            {/* Pie Chart */}
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {pieSlices.map((slice, index) => {
                  const radius = 40;
                  const circumference = 2 * Math.PI * radius;
                  const offset = (slice.startAngle / 360) * circumference;
                  const length = (slice.angle / 360) * circumference;

                  return (
                    <circle
                      key={slice.category}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="20"
                      strokeDasharray={`${length} ${circumference - length}`}
                      strokeDashoffset={-offset}
                      className="transition-all duration-500"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{totalEavs}</div>
                  <div className="text-xs text-gray-400">Total EAVs</div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-2">
              {pieSlices.map((slice) => (
                <div key={slice.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-sm text-gray-300">{slice.category}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-white font-medium">{slice.count}</span>
                    <span className="text-gray-500 ml-1">({slice.percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Missing Categories Warning */}
          {topicalAuthority.eavDistribution.missingCategories.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-sm text-yellow-300">
              <strong>Gap:</strong> Missing EAVs in categories: {topicalAuthority.eavDistribution.missingCategories.join(', ')}.
              Consider expanding your semantic triples to cover all categories.
            </div>
          )}
        </Card>
      </div>

      {/* Top Entities */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Top Entities by Attribute Count</h3>
          <button
            onClick={() => setExpandedEntities(!expandedEntities)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            {expandedEntities ? 'Show Less' : 'Show All'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {topicalAuthority.eavDistribution.topEntities
            .slice(0, expandedEntities ? undefined : 10)
            .map((entity, index) => (
              <div
                key={entity.entity}
                className="p-3 bg-gray-800/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                  <span className="text-sm text-white font-medium truncate" title={entity.entity}>
                    {entity.entity}
                  </span>
                </div>
                <div className="text-lg font-bold text-blue-400">
                  {entity.attributeCount}
                  <span className="text-xs text-gray-500 ml-1">attributes</span>
                </div>
              </div>
            ))}
        </div>
      </Card>

      {/* Semantic Compliance */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Semantic Compliance</h3>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className={`text-5xl font-bold ${
              topicalAuthority.semanticCompliance.score >= 80 ? 'text-green-400' :
              topicalAuthority.semanticCompliance.score >= 60 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {topicalAuthority.semanticCompliance.score}%
            </div>
            <div className="text-sm text-gray-400">Compliance Score</div>
          </div>
          <div className="flex-1">
            <p className="text-gray-300 mb-3">
              Semantic compliance measures how well your content aligns with SEO best practices
              for entity-based search optimization.
            </p>
            {topicalAuthority.semanticCompliance.score < 80 && (
              <div className="p-3 bg-gray-800/50 rounded-lg text-sm">
                <strong className="text-white">Recommendations:</strong>
                <ul className="mt-2 space-y-1 text-gray-400">
                  <li>Ensure all topics have clear entity relationships</li>
                  <li>Add more specific attributes to your EAVs</li>
                  <li>Review non-compliant topics in the list below</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Information Density */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Information Density</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-800/50 rounded-lg text-center">
            <div className="text-3xl font-bold text-white">
              {topicalAuthority.informationDensity.averageFactsPerTopic}
            </div>
            <div className="text-sm text-gray-400">Avg Facts per Topic</div>
            <div className="text-xs text-gray-500 mt-1">
              {topicalAuthority.informationDensity.averageFactsPerTopic >= 5
                ? 'Good density'
                : 'Run Query Network Audit to discover competitor EAVs'}
            </div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg text-center">
            <div className="text-3xl font-bold text-white">
              {topicalAuthority.eavDistribution.totalEavs}
            </div>
            <div className="text-sm text-gray-400">Total Facts (EAVs)</div>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-lg text-center">
            <div className="text-3xl font-bold text-white">
              {topicalAuthority.mapHealth.totalTopics}
            </div>
            <div className="text-sm text-gray-400">Total Topics</div>
          </div>
        </div>

        {topicalAuthority.informationDensity.lowDensityTopics.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Low Density Topics</h4>
            <div className="space-y-2">
              {topicalAuthority.informationDensity.lowDensityTopics.slice(0, 5).map((topic) => (
                <div
                  key={topic.topic}
                  className="flex items-center justify-between p-2 bg-gray-800/30 rounded"
                >
                  <span className="text-sm text-gray-400">{topic.topic}</span>
                  <span className="text-sm text-red-400">{topic.factCount} facts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* AI Actions */}
      <Card className="p-6 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">AI-Powered Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onAction?.('expand_eavs')}
            disabled={actionLoading === 'expand_eavs'}
            className="p-4 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded">
                {actionLoading === 'expand_eavs' ? (
                  <Loader className="w-5 h-5" />
                ) : (
                  <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </div>
              <span className="font-medium text-white">
                {actionLoading === 'expand_eavs' ? 'Generating...' : 'Expand EAVs'}
              </span>
            </div>
            <p className="text-sm text-gray-400">Generate additional semantic triples using AI</p>
          </button>

          <button
            onClick={() => {
              // Find the first missing category to balance
              const missingCategory = topicalAuthority.eavDistribution.missingCategories[0];
              onAction?.('expand_eavs', { category: missingCategory || 'RARE' });
            }}
            disabled={actionLoading === 'expand_eavs'}
            className="p-4 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded">
                <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </div>
              <span className="font-medium text-white">Balance Categories</span>
            </div>
            <p className="text-sm text-gray-400">Fill gaps in underrepresented EAV categories</p>
          </button>

          <button
            onClick={() => onAction?.('expand_eavs', { suggestTopics: true })}
            disabled={actionLoading === 'expand_eavs'}
            className="p-4 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded">
                <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="font-medium text-white">Suggest Topics</span>
            </div>
            <p className="text-sm text-gray-400">Discover new topics from EAV analysis</p>
          </button>
        </div>
      </Card>
    </div>
  );
};
