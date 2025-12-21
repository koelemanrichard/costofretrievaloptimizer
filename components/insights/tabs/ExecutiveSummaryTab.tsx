// components/insights/tabs/ExecutiveSummaryTab.tsx
// Executive Summary - C-suite overview of SEO performance

import React from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { ScoreGauge, MetricGrid, AlertList, TrendChart, TrendIndicator } from '../widgets';
import type { AggregatedInsights, InsightActionType } from '../../../types/insights';

interface ExecutiveSummaryTabProps {
  insights: AggregatedInsights;
  mapId: string;
  onRefresh: () => void;
  onOpenQueryNetworkAudit?: () => void;
  onOpenEATScanner?: () => void;
  onOpenCorpusAudit?: () => void;
  onExport?: () => void;
}

export const ExecutiveSummaryTab: React.FC<ExecutiveSummaryTabProps> = ({
  insights,
  mapId,
  onRefresh,
  onOpenQueryNetworkAudit,
  onOpenEATScanner,
  onOpenCorpusAudit,
  onExport,
}) => {
  const { executiveSummary } = insights;

  // Score component breakdown
  const scoreComponents = [
    { label: 'Semantic Compliance', value: executiveSummary.healthScore.components.semanticCompliance },
    { label: 'EAV Authority', value: executiveSummary.healthScore.components.eavAuthority },
    { label: 'E-A-T Score', value: executiveSummary.healthScore.components.eatScore },
    { label: 'Content Health', value: executiveSummary.healthScore.components.contentHealth },
  ];

  return (
    <div className="space-y-6">
      {/* Health Score Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Health Score */}
        <Card className="p-6 bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Overall Health Score</h3>
            {executiveSummary.healthScore.trend && (
              <TrendIndicator trend={executiveSummary.healthScore.trend} size="md" />
            )}
          </div>
          <div className="flex justify-center">
            <ScoreGauge
              score={executiveSummary.healthScore.overall}
              grade={executiveSummary.healthScore.grade}
              size="lg"
            />
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">
              {executiveSummary.healthScore.overall >= 80
                ? 'Your SEO strategy is performing well. Focus on maintaining momentum.'
                : executiveSummary.healthScore.overall >= 60
                  ? 'Good progress, but there\'s room for improvement. Check the Action Center.'
                  : 'Your strategy needs attention. Review the alerts and take action.'}
            </p>
          </div>
        </Card>

        {/* Score Breakdown */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Score Components</h3>
          <div className="grid grid-cols-2 gap-4">
            {scoreComponents.map((component) => (
              <div
                key={component.label}
                className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">{component.label}</span>
                  <ScoreGauge score={component.value} size="sm" showGrade={false} />
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      component.value >= 80 ? 'bg-green-500' :
                      component.value >= 60 ? 'bg-yellow-500' :
                      component.value >= 40 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${component.value}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {getComponentExplanation(component.label)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Key Metrics Grid */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Key Performance Metrics</h3>
        <MetricGrid metrics={executiveSummary.keyMetrics} columns={4} />
      </Card>

      {/* Trend Charts */}
      {executiveSummary.trendData.length > 1 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">30-Day Trends</h3>
          <TrendChart
            data={executiveSummary.trendData}
            dataKeys={[
              { key: 'semanticCompliance', label: 'Semantic Compliance', color: '#3b82f6' },
              { key: 'eatScore', label: 'E-A-T Score', color: '#22c55e' },
              { key: 'eavCount', label: 'EAV Count', color: '#f97316' },
            ]}
            height={200}
          />
        </Card>
      )}

      {/* Alerts & Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Critical Alerts</h3>
            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
              {executiveSummary.alerts.length} items
            </span>
          </div>
          <AlertList
            alerts={executiveSummary.alerts}
            maxItems={5}
          />
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => {
                onOpenQueryNetworkAudit?.();
                onOpenEATScanner?.();
                onOpenCorpusAudit?.();
              }}
              className="w-full p-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/50 rounded-lg text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-white">Run Full Audit</div>
                  <div className="text-sm text-gray-400">Execute all research tools for comprehensive analysis</div>
                </div>
              </div>
            </button>

            <button
              onClick={onRefresh}
              className="w-full p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-700 rounded-lg">
                  <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-white">Refresh Data</div>
                  <div className="text-sm text-gray-400">Reload all insights from latest sources</div>
                </div>
              </div>
            </button>

            <button
              onClick={onExport}
              className="w-full p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-700 rounded-lg">
                  <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-white">Export Executive Report</div>
                  <div className="text-sm text-gray-400">Generate PDF summary for stakeholders</div>
                </div>
              </div>
            </button>
          </div>
        </Card>
      </div>

      {/* What This Means Section */}
      <Card className="p-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-700/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4m0-4h.01" />
          </svg>
          What Does This Mean?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-gray-900/50 rounded-lg">
            <h4 className="font-medium text-white mb-2">For Your Business</h4>
            <p className="text-gray-400">
              {executiveSummary.healthScore.overall >= 70
                ? 'Your SEO foundation is strong. You\'re building topical authority that search engines recognize.'
                : 'There are gaps in your SEO strategy that may limit visibility. Addressing them will improve organic traffic.'}
            </p>
          </div>
          <div className="p-4 bg-gray-900/50 rounded-lg">
            <h4 className="font-medium text-white mb-2">Why It Matters</h4>
            <p className="text-gray-400">
              Topical authority helps search engines understand you\'re an expert in your field, leading to better rankings and more qualified traffic.
            </p>
          </div>
          <div className="p-4 bg-gray-900/50 rounded-lg">
            <h4 className="font-medium text-white mb-2">Recommended Next Steps</h4>
            <p className="text-gray-400">
              {executiveSummary.alerts.length > 0
                ? 'Review the alerts above and visit the Action Center for prioritized tasks.'
                : 'Continue expanding your content and monitor trends for opportunities.'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

function getComponentExplanation(label: string): string {
  switch (label) {
    case 'Semantic Compliance':
      return 'How well your content aligns with semantic SEO best practices.';
    case 'EAV Authority':
      return 'Strength of your entity-attribute-value knowledge graph.';
    case 'E-A-T Score':
      return 'Expertise, Authority, and Trust signals detected.';
    case 'Content Health':
      return 'Overall quality and coverage of your content corpus.';
    default:
      return '';
  }
}
