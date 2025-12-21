// components/insights/tabs/CostUsageTab.tsx
// Cost & Usage - AI token consumption and budget tracking

import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Sparkline } from '../widgets';
import type { AggregatedInsights } from '../../../types/insights';

interface CostUsageTabProps {
  insights: AggregatedInsights;
  mapId: string;
  onRefresh: () => void;
}

type TimeRange = '7d' | '30d' | '90d';

export const CostUsageTab: React.FC<CostUsageTabProps> = ({
  insights,
  mapId,
  onRefresh,
}) => {
  const { costUsage } = insights;
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // Safe number formatting helpers to prevent NaN display
  const formatNumber = (n: number | undefined | null): string => {
    if (n === undefined || n === null || isNaN(n)) return '0';
    return n.toLocaleString();
  };

  const formatCurrency = (n: number | undefined | null): string => {
    if (n === undefined || n === null || isNaN(n)) return '$0.00';
    return `$${n.toFixed(2)}`;
  };

  const safeNumber = (n: number | undefined | null): number => {
    if (n === undefined || n === null || isNaN(n)) return 0;
    return n;
  };

  // Provider colors
  const providerColors: Record<string, string> = {
    gemini: '#4285f4',
    openai: '#10a37f',
    anthropic: '#d97706',
    perplexity: '#8b5cf6',
    openrouter: '#ec4899',
  };

  // Calculate provider percentages for pie chart
  const totalTokens = safeNumber(costUsage.tokenConsumption.totalTokens);
  const providerData = Object.entries(costUsage.tokenConsumption.byProvider)
    .map(([provider, tokens]) => ({
      provider,
      tokens: safeNumber(tokens),
      percentage: totalTokens > 0 ? (safeNumber(tokens) / totalTokens) * 100 : 0,
      color: providerColors[provider.toLowerCase()] || '#6b7280',
    }))
    .sort((a, b) => b.tokens - a.tokens);

  // Operation data
  const operationData = Object.entries(costUsage.tokenConsumption.byOperation)
    .map(([operation, tokens]) => ({
      operation,
      tokens: safeNumber(tokens),
      percentage: totalTokens > 0 ? (safeNumber(tokens) / totalTokens) * 100 : 0,
    }))
    .sort((a, b) => b.tokens - a.tokens);

  // Trend data for sparkline
  const trendTokens = costUsage.tokenConsumption.trends.map(t => safeNumber(t.tokens));
  const trendCosts = costUsage.tokenConsumption.trends.map(t => safeNumber(t.cost));

  // Check if there's any usage data
  const hasUsageData = totalTokens > 0 || costUsage.tokenConsumption.trends.length > 0;

  return (
    <div className="space-y-6">
      {/* No Usage Data Banner */}
      {!hasUsageData && (
        <div className="p-6 bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-700/50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-full">
              <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">No AI Usage Data Yet</h3>
              <p className="text-gray-400">
                AI usage data will appear here as you generate content briefs, articles, and use other AI-powered features.
                Start by generating a content brief or running an AI-powered audit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-white">
            {formatNumber(costUsage.tokenConsumption.totalTokens)}
          </div>
          <div className="text-sm text-gray-400">Total Tokens</div>
          <div className="text-xs text-gray-500">{costUsage.tokenConsumption.periodLabel}</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-green-400">
            {formatCurrency(costUsage.costBreakdown.totalCost)}
          </div>
          <div className="text-sm text-gray-400">Estimated Cost</div>
          {costUsage.costBreakdown.budgetTotal && safeNumber(costUsage.costBreakdown.budgetRemaining) > 0 && (
            <div className="text-xs text-gray-500">
              {formatCurrency(costUsage.costBreakdown.budgetRemaining)} remaining
            </div>
          )}
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-blue-400">
            {formatCurrency(costUsage.costBreakdown.costPerContent)}
          </div>
          <div className="text-sm text-gray-400">Cost per Content</div>
          <div className="text-xs text-gray-500">Average per brief</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-orange-400">
            {Object.keys(costUsage.tokenConsumption.byProvider).length}
          </div>
          <div className="text-sm text-gray-400">AI Providers Used</div>
        </Card>
      </div>

      {/* Token Consumption by Provider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Tokens by Provider</h3>
          <div className="flex items-center gap-6">
            {/* Simple bar representation */}
            <div className="flex-1">
              {providerData.map((provider) => (
                <div key={provider.provider} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: provider.color }}
                      />
                      <span className="text-sm text-gray-300 capitalize">{provider.provider}</span>
                    </div>
                    <span className="text-sm text-white">{provider.tokens.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${provider.percentage}%`,
                        backgroundColor: provider.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Cost by Provider</h3>
          <div className="space-y-3">
            {Object.entries(costUsage.costBreakdown.byProvider)
              .sort((a, b) => safeNumber(b[1]) - safeNumber(a[1]))
              .map(([provider, cost]) => (
                <div key={provider} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: providerColors[provider.toLowerCase()] || '#6b7280' }}
                    />
                    <span className="text-sm text-gray-300 capitalize">{provider}</span>
                  </div>
                  <span className="text-sm text-green-400">{formatCurrency(cost)}</span>
                </div>
              ))}
          </div>
        </Card>
      </div>

      {/* Usage by Operation */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Usage by Operation</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {operationData.slice(0, 8).map((op) => (
            <div key={op.operation} className="p-3 bg-gray-800/50 rounded-lg">
              <div className="text-lg font-bold text-white">
                {op.tokens.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400 truncate" title={op.operation}>
                {op.operation.replace(/_/g, ' ')}
              </div>
              <div className="text-xs text-gray-500">{op.percentage.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Trends */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Usage Trends</h3>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        {costUsage.tokenConsumption.trends.length > 1 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm text-gray-400 mb-2">Token Usage</h4>
              <div className="h-24 flex items-end">
                <Sparkline data={trendTokens} color="#3b82f6" width={400} height={80} />
              </div>
            </div>
            <div>
              <h4 className="text-sm text-gray-400 mb-2">Cost</h4>
              <div className="h-24 flex items-end">
                <Sparkline data={trendCosts} color="#22c55e" width={400} height={80} />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Not enough data for trend analysis
          </div>
        )}
      </Card>

      {/* Efficiency Metrics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Efficiency Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-sm text-gray-400 mb-3">Tokens per Operation</h4>
            <div className="space-y-2">
              {Object.entries(costUsage.efficiencyMetrics.tokensPerOperation)
                .slice(0, 5)
                .map(([operation, tokens]) => (
                  <div key={operation} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300 truncate" title={operation}>
                      {operation.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm text-white">{tokens.toLocaleString()}</span>
                  </div>
                ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm text-gray-400 mb-3">Retry Rate</h4>
            <div className="text-center py-4">
              <div className={`text-4xl font-bold ${
                costUsage.efficiencyMetrics.retryRate < 5 ? 'text-green-400' :
                costUsage.efficiencyMetrics.retryRate < 15 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {costUsage.efficiencyMetrics.retryRate}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {costUsage.efficiencyMetrics.retryRate < 5 ? 'Excellent' :
                 costUsage.efficiencyMetrics.retryRate < 15 ? 'Good' : 'Needs Attention'}
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm text-gray-400 mb-3">Model Performance</h4>
            {costUsage.efficiencyMetrics.modelComparison.length > 0 ? (
              <div className="space-y-2">
                {costUsage.efficiencyMetrics.modelComparison.map((model) => (
                  <div key={model.model} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{model.model}</span>
                    <span className="text-sm text-green-400">{model.successRate}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No model comparison data</div>
            )}
          </div>
        </div>
      </Card>

      {/* Optimization Suggestions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Optimization Suggestions</h3>
        {costUsage.optimizationSuggestions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-green-400 font-medium">No optimization suggestions</p>
            <p className="text-sm text-gray-500 mt-1">Your AI usage is efficient!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {costUsage.optimizationSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-white">{suggestion.title}</h4>
                  {suggestion.potentialSavings && (
                    <span className="text-sm text-green-400">
                      Save ~${suggestion.potentialSavings.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-2">{suggestion.description}</p>
                <p className="text-xs text-blue-400">
                  <strong>How:</strong> {suggestion.implementation}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Budget Management */}
      {costUsage.costBreakdown.budgetTotal && (
        <Card className="p-6 bg-gradient-to-r from-green-900/30 to-blue-900/30 border-green-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Budget Status</h3>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Budget Used</span>
                <span className="text-sm text-white">
                  ${costUsage.costBreakdown.totalCost.toFixed(2)} / ${costUsage.costBreakdown.budgetTotal.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    (costUsage.costBreakdown.totalCost / costUsage.costBreakdown.budgetTotal) > 0.9
                      ? 'bg-red-500'
                      : (costUsage.costBreakdown.totalCost / costUsage.costBreakdown.budgetTotal) > 0.7
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min((costUsage.costBreakdown.totalCost / costUsage.costBreakdown.budgetTotal) * 100, 100)}%`
                  }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                ${costUsage.costBreakdown.budgetRemaining?.toFixed(2)} remaining
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
