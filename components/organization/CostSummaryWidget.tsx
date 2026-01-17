// components/organization/CostSummaryWidget.tsx
/**
 * CostSummaryWidget
 *
 * Displays current month's AI usage costs summary including total cost,
 * tokens, requests, and top 3 providers with cost breakdown.
 *
 * Created: 2026-01-10 - Multi-tenancy Phase 1, Task 12
 */

import React, { useEffect, useState } from 'react';
import { useCosts, CostReport } from '../../hooks/useCosts';
import { SmartLoader } from '../ui/FunLoaders';

// ============================================================================
// Types
// ============================================================================

interface CostSummaryWidgetProps {
  className?: string;
  onViewDetails?: () => void;
}

// Provider color mapping
const PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'bg-orange-600',
  openai: 'bg-green-600',
  google: 'bg-blue-600',
  perplexity: 'bg-purple-600',
  openrouter: 'bg-cyan-600',
};

// ============================================================================
// Helper Components
// ============================================================================

interface ProviderIconProps {
  provider: string;
}

function ProviderIcon({ provider }: ProviderIconProps) {
  const colorClass = PROVIDER_COLORS[provider.toLowerCase()] || 'bg-gray-500';
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${colorClass}`}
      title={provider}
    />
  );
}

interface ProviderRowProps {
  provider: string;
  cost: number;
  percentage: number;
}

function ProviderRow({ provider, cost, percentage }: ProviderRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <ProviderIcon provider={provider} />
        <span className="text-sm text-gray-300 capitalize">{provider}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">{percentage.toFixed(1)}%</span>
        <span className="text-sm font-medium text-gray-200 w-20 text-right">
          ${cost.toFixed(4)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CostSummaryWidget({ className, onViewDetails }: CostSummaryWidgetProps) {
  const { getCostReport, canViewCosts, isLoading: hookLoading } = useCosts();
  const [report, setReport] = useState<CostReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load current month's cost report
  useEffect(() => {
    async function loadCosts() {
      if (!canViewCosts) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const costReport = await getCostReport(startOfMonth, endOfMonth);
        setReport(costReport);
      } catch (err) {
        console.error('Failed to load cost summary:', err);
        setError(err instanceof Error ? err.message : 'Failed to load costs');
      } finally {
        setIsLoading(false);
      }
    }

    loadCosts();
  }, [canViewCosts, getCostReport]);

  // Permission check - return null if user cannot view costs
  if (!canViewCosts) {
    return null;
  }

  // Loading state
  if (isLoading || hookLoading) {
    return (
      <div className={`bg-gray-800/50 rounded-lg p-4 ${className || ''}`}>
        <div className="flex items-center justify-center py-8">
          <SmartLoader context="loading" size="md" showText={false} />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-gray-800/50 rounded-lg p-4 ${className || ''}`}>
        <div className="text-center py-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Get current month name for display
  const currentMonth = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Get top 3 providers
  const topProviders = report?.byProvider.slice(0, 3) || [];

  return (
    <div className={`bg-gray-800/50 rounded-lg p-4 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          AI Costs - {currentMonth}
        </h4>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            View Details
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-2xl font-bold text-gray-200">
            ${(report?.summary.totalCost || 0).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">Total Cost</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-200">
            {formatTokenCount(report?.summary.totalTokens || 0)}
          </p>
          <p className="text-xs text-gray-500">Tokens</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-200">
            {report?.summary.totalRequests || 0}
          </p>
          <p className="text-xs text-gray-500">Requests</p>
        </div>
      </div>

      {/* Top Providers */}
      {topProviders.length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <p className="text-xs text-gray-500 mb-2">Top Providers</p>
          <div className="space-y-0.5">
            {topProviders.map((provider) => (
              <ProviderRow
                key={provider.provider}
                provider={provider.provider}
                cost={provider.cost}
                percentage={provider.percentage}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {topProviders.length === 0 && (
        <div className="border-t border-gray-700 pt-3">
          <p className="text-sm text-gray-500 text-center py-2">
            No usage data for this month
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format token count with K/M suffix for readability
 */
function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}
