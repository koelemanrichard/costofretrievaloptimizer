/**
 * PortfolioAnalytics Component
 *
 * Displays historical analytics for content quality across the user's portfolio.
 * Provides insights into compliance trends, improvement areas, and conflict patterns.
 *
 * Features:
 * - Overall compliance trend over time
 * - Articles generated/passed/fixed/manual intervention counts
 * - Top improvement areas with training links
 * - Best and worst performing rules
 * - Detected conflict patterns between passes
 * - CSV/Excel export capability
 *
 * @module components/quality
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  RuleRegistry,
  QualityRule,
  RuleCategory,
} from '../../services/ai/contentGeneration/rulesEngine/ruleRegistry';

// =============================================================================
// Types
// =============================================================================

export interface PortfolioAnalyticsProps {
  /** User ID for filtering data */
  userId: string;
  /** Date range for the analytics period */
  dateRange: {
    start: Date;
    end: Date;
  };
  /** Analytics data from the database */
  analyticsData?: PortfolioAnalyticsData;
  /** Callback when date range changes */
  onDateRangeChange?: (dateRange: { start: Date; end: Date }) => void;
  /** Callback to export data */
  onExport?: (format: 'csv' | 'excel') => void;
  /** Additional CSS classes */
  className?: string;
}

export interface PortfolioAnalyticsData {
  /** Summary statistics */
  summary: {
    totalArticles: number;
    passedFirstTime: number;
    autoFixed: number;
    manualIntervention: number;
    averageScore: number;
    scoreTrend: number; // positive = improving, negative = declining
  };
  /** Daily compliance data points */
  dailyData: DailyDataPoint[];
  /** Rule compliance rates */
  ruleCompliance: RuleComplianceRate[];
  /** Detected conflict patterns */
  conflictPatterns: ConflictPattern[];
}

interface DailyDataPoint {
  date: string; // ISO date string
  articlesGenerated: number;
  averageScore: number;
  passRate: number;
}

interface RuleComplianceRate {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  complianceRate: number; // 0-100
  trend: number; // positive = improving
  isCritical: boolean;
}

interface ConflictPattern {
  earlierPass: number;
  laterPass: number;
  affectedRule: string;
  frequency: number; // 0-1
  recommendation: string;
}

// =============================================================================
// Mock Data (for development/demo)
// =============================================================================

const MOCK_ANALYTICS_DATA: PortfolioAnalyticsData = {
  summary: {
    totalArticles: 47,
    passedFirstTime: 32,
    autoFixed: 12,
    manualIntervention: 3,
    averageScore: 78,
    scoreTrend: 5.2,
  },
  dailyData: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    articlesGenerated: Math.floor(Math.random() * 4) + 1,
    averageScore: Math.floor(Math.random() * 20) + 70,
    passRate: Math.random() * 0.3 + 0.6,
  })),
  ruleCompliance: [
    { ruleId: 'A1', ruleName: 'Entity in title', category: 'Central Entity', complianceRate: 98, trend: 2, isCritical: true },
    { ruleId: 'B1', ruleName: 'Centerpiece in 100 words', category: 'Introduction', complianceRate: 94, trend: 1, isCritical: true },
    { ruleId: 'E1', ruleName: 'Single H1', category: 'Headings', complianceRate: 100, trend: 0, isCritical: true },
    { ruleId: 'H3', ruleName: 'No LLM signatures', category: 'Vocabulary', complianceRate: 87, trend: 5, isCritical: true },
    { ruleId: 'C2', ruleName: 'UNIQUE in 300 words', category: 'EAV Integration', complianceRate: 72, trend: 8, isCritical: true },
    { ruleId: 'D5', ruleName: 'Discourse chaining', category: 'Sentence Structure', complianceRate: 65, trend: -3, isCritical: false },
    { ruleId: 'K4', ruleName: 'List items 3-7', category: 'Lists', complianceRate: 58, trend: 4, isCritical: false },
    { ruleId: 'G1', ruleName: 'Article word count', category: 'Word Count', complianceRate: 45, trend: -5, isCritical: true },
  ],
  conflictPatterns: [
    { earlierPass: 1, laterPass: 3, affectedRule: 'A4', frequency: 0.23, recommendation: 'Consider running Pass 3 before Pass 1 for entity-focused content' },
    { earlierPass: 1, laterPass: 5, affectedRule: 'D5', frequency: 0.15, recommendation: 'Discourse integration may override draft structure' },
    { earlierPass: 4, laterPass: 6, affectedRule: 'K5', frequency: 0.12, recommendation: 'List optimization can be affected by micro semantics pass' },
  ],
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format percentage with trend indicator
 */
function formatPercentWithTrend(value: number, trend: number): string {
  const trendIcon = trend > 0 ? '\u2191' : trend < 0 ? '\u2193' : '\u2192';
  return `${value}% ${trendIcon}`;
}

/**
 * Get trend color
 */
function getTrendColor(trend: number): string {
  if (trend > 0) return 'text-green-400';
  if (trend < 0) return 'text-red-400';
  return 'text-gray-400';
}

/**
 * Get compliance color
 */
function getComplianceColor(rate: number): string {
  if (rate >= 90) return 'text-green-400';
  if (rate >= 70) return 'text-blue-400';
  if (rate >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

/**
 * Get compliance bar color
 */
function getComplianceBarColor(rate: number): string {
  if (rate >= 90) return 'bg-green-500';
  if (rate >= 70) return 'bg-blue-500';
  if (rate >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * Format date range for display
 */
function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, options)}`;
}

// =============================================================================
// Sub-Components
// =============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon?: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'text-white',
}) => {
  return (
    <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && <span className="text-2xl">{icon}</span>}
        {trend !== undefined && (
          <span className={`text-sm font-medium ${getTrendColor(trend)}`}>
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
};

interface MiniChartProps {
  data: DailyDataPoint[];
  dataKey: 'averageScore' | 'articlesGenerated' | 'passRate';
  height?: number;
}

const MiniChart: React.FC<MiniChartProps> = ({ data, dataKey, height = 60 }) => {
  const values = data.map(d => d[dataKey]);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.slice(-14).map((point, index) => {
        const value = point[dataKey];
        const heightPercent = ((value - min) / range) * 100;

        return (
          <div
            key={point.date}
            className="flex-1 bg-blue-500/60 hover:bg-blue-500 transition-colors rounded-t"
            style={{ height: `${Math.max(10, heightPercent)}%` }}
            title={`${point.date}: ${typeof value === 'number' && value < 1 ? (value * 100).toFixed(0) + '%' : value}`}
          />
        );
      })}
    </div>
  );
};

interface RuleComplianceRowProps {
  rule: RuleComplianceRate;
}

const RuleComplianceRow: React.FC<RuleComplianceRowProps> = ({ rule }) => {
  return (
    <div className="flex items-center gap-4 p-3 hover:bg-gray-800/30 rounded-lg transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-500">{rule.ruleId}</span>
          <span className="text-sm text-white truncate">{rule.ruleName}</span>
          {rule.isCritical && (
            <span className="px-1.5 py-0.5 text-xs bg-red-900/50 text-red-300 rounded">
              Critical
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{rule.category}</span>
      </div>
      <div className="w-32">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getComplianceBarColor(rule.complianceRate)}`}
            style={{ width: `${rule.complianceRate}%` }}
          />
        </div>
      </div>
      <span className={`text-sm font-medium w-12 text-right ${getComplianceColor(rule.complianceRate)}`}>
        {rule.complianceRate}%
      </span>
      <span className={`text-xs w-12 text-right ${getTrendColor(rule.trend)}`}>
        {rule.trend > 0 ? '+' : ''}{rule.trend}%
      </span>
    </div>
  );
};

interface ConflictPatternCardProps {
  pattern: ConflictPattern;
}

const ConflictPatternCard: React.FC<ConflictPatternCardProps> = ({ pattern }) => {
  return (
    <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-yellow-400 font-bold">{'\u26A0'}</span>
        <span className="text-sm text-white">
          Pass {pattern.earlierPass} {'\u2192'} Pass {pattern.laterPass}
        </span>
        <span className="text-xs text-gray-400">({(pattern.frequency * 100).toFixed(0)}% frequency)</span>
      </div>
      <p className="text-xs text-gray-400 mb-1">Affects rule: {pattern.affectedRule}</p>
      <p className="text-xs text-yellow-300">{pattern.recommendation}</p>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const PortfolioAnalytics: React.FC<PortfolioAnalyticsProps> = ({
  userId,
  dateRange,
  analyticsData = MOCK_ANALYTICS_DATA,
  onDateRangeChange,
  onExport,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'conflicts'>('overview');
  const [sortBy, setSortBy] = useState<'compliance' | 'trend'>('compliance');

  // Sort rule compliance data
  const sortedRules = useMemo(() => {
    return [...analyticsData.ruleCompliance].sort((a, b) => {
      if (sortBy === 'compliance') {
        return a.complianceRate - b.complianceRate; // Lowest first (needs improvement)
      }
      return a.trend - b.trend; // Most declining first
    });
  }, [analyticsData.ruleCompliance, sortBy]);

  // Calculate statistics
  const stats = useMemo(() => {
    const { summary } = analyticsData;
    const passRate = summary.totalArticles > 0
      ? ((summary.passedFirstTime / summary.totalArticles) * 100).toFixed(0)
      : 0;
    const autoFixRate = summary.totalArticles > 0
      ? ((summary.autoFixed / summary.totalArticles) * 100).toFixed(0)
      : 0;

    return { passRate, autoFixRate };
  }, [analyticsData.summary]);

  // Handle preset date ranges
  const handlePresetRange = useCallback((days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    onDateRangeChange?.({ start, end });
  }, [onDateRangeChange]);

  return (
    <div className={`portfolio-analytics ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Portfolio Analytics</h2>
          <p className="text-sm text-gray-400 mt-1">
            {formatDateRange(dateRange.start, dateRange.end)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date range presets */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePresetRange(7)}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              7 days
            </button>
            <button
              onClick={() => handlePresetRange(30)}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              30 days
            </button>
            <button
              onClick={() => handlePresetRange(90)}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              90 days
            </button>
          </div>
          {/* Export button */}
          {onExport && (
            <div className="relative group">
              <button className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors">
                Export
              </button>
              <div className="absolute right-0 mt-2 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => onExport('csv')}
                  className="w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-gray-700 rounded-t-lg"
                >
                  CSV
                </button>
                <button
                  onClick={() => onExport('excel')}
                  className="w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-gray-700 rounded-b-lg"
                >
                  Excel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Articles"
          value={analyticsData.summary.totalArticles}
          icon="\uD83D\uDCC4"
        />
        <StatCard
          title="First-Time Pass Rate"
          value={`${stats.passRate}%`}
          subtitle={`${analyticsData.summary.passedFirstTime} articles`}
          color="text-green-400"
        />
        <StatCard
          title="Auto-Fixed"
          value={`${stats.autoFixRate}%`}
          subtitle={`${analyticsData.summary.autoFixed} articles`}
          color="text-blue-400"
        />
        <StatCard
          title="Average Score"
          value={analyticsData.summary.averageScore}
          trend={analyticsData.summary.scoreTrend}
          color={analyticsData.summary.averageScore >= 75 ? 'text-green-400' : 'text-yellow-400'}
        />
      </div>

      {/* Trend Chart */}
      <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/50 mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Score Trend (Last 14 Days)</h3>
        <MiniChart data={analyticsData.dailyData} dataKey="averageScore" height={80} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-700">
        {(['overview', 'rules', 'conflicts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${activeTab === tab
                ? 'text-blue-400 border-blue-400'
                : 'text-gray-400 border-transparent hover:text-white'}
            `}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Improvement Areas */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Top Improvement Areas</h3>
            <div className="space-y-1">
              {sortedRules.slice(0, 5).map(rule => (
                <RuleComplianceRow key={rule.ruleId} rule={rule} />
              ))}
            </div>
          </div>

          {/* Best Performing Rules */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Best Performing Rules</h3>
            <div className="space-y-1">
              {[...analyticsData.ruleCompliance]
                .sort((a, b) => b.complianceRate - a.complianceRate)
                .slice(0, 5)
                .map(rule => (
                  <RuleComplianceRow key={rule.ruleId} rule={rule} />
                ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">All Rule Compliance</h3>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'compliance' | 'trend')}
              className="bg-gray-800 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="compliance">Sort by Compliance</option>
              <option value="trend">Sort by Trend</option>
            </select>
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {sortedRules.map(rule => (
              <RuleComplianceRow key={rule.ruleId} rule={rule} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'conflicts' && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Detected Conflict Patterns ({analyticsData.conflictPatterns.length})
          </h3>
          {analyticsData.conflictPatterns.length > 0 ? (
            <div className="space-y-3">
              {analyticsData.conflictPatterns.map((pattern, index) => (
                <ConflictPatternCard key={index} pattern={pattern} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No conflict patterns detected in this period.</p>
              <p className="text-sm mt-1">This is good! Your passes are working harmoniously.</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-700/50 text-center">
        <span className="text-xs text-gray-500">
          Data refreshed every 24 hours. Last update: {new Date().toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default PortfolioAnalytics;
