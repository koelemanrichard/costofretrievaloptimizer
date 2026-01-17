/**
 * CostDashboardModal Component
 *
 * Full cost dashboard modal with date filtering, summary cards,
 * provider/project breakdown tables, and CSV export functionality.
 *
 * Features:
 * - Date range selector (this_week, this_month, last_month, last_90_days)
 * - Summary cards: Total Cost, Total Tokens, Total Requests
 * - Table: By Provider with cost, tokens, requests, and percentage
 * - Table: By Project (top 10) with project name, cost, tokens, requests
 * - Export CSV button in footer
 * - Permission check for canViewCosts
 *
 * Created: 2026-01-10 - Multi-tenancy Phase 2, Task 13
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SmartLoader } from '../ui/FunLoaders';
import { useCosts, CostReport } from '../../hooks/useCosts';

// ============================================================================
// Types
// ============================================================================

interface CostDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DateRangeOption = 'this_week' | 'this_month' | 'last_month' | 'last_90_days' | 'custom';

interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

/**
 * Format date for input[type="date"]
 */
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse date from input[type="date"]
 */
function parseDateFromInput(dateStr: string, endOfDay: boolean = false): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (endOfDay) {
    return new Date(year, month - 1, day, 23, 59, 59);
  }
  return new Date(year, month - 1, day, 0, 0, 0);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get date range based on selected option
 */
function getDateRange(option: DateRangeOption): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (option) {
    case 'this_week': {
      // Get start of current week (Sunday)
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);
      return {
        startDate: startOfWeek,
        endDate: today,
        label: 'This Week',
      };
    }
    case 'this_month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: startOfMonth,
        endDate: today,
        label: 'This Month',
      };
    }
    case 'last_month': {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return {
        startDate: startOfLastMonth,
        endDate: endOfLastMonth,
        label: 'Last Month',
      };
    }
    case 'last_90_days': {
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(now.getDate() - 90);
      ninetyDaysAgo.setHours(0, 0, 0, 0);
      return {
        startDate: ninetyDaysAgo,
        endDate: today,
        label: 'Last 90 Days',
      };
    }
  }
}

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
  return tokens.toLocaleString();
}

/**
 * Format cost value
 */
function formatCost(cost: number): string {
  if (cost >= 100) {
    return `$${cost.toFixed(2)}`;
  }
  if (cost >= 1) {
    return `$${cost.toFixed(3)}`;
  }
  return `$${cost.toFixed(4)}`;
}

// ============================================================================
// Provider Color Mapping
// ============================================================================

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

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

function SummaryCard({ title, value, subtitle, icon }: SummaryCardProps) {
  return (
    <div className="bg-gray-800/70 rounded-lg p-4 border border-gray-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-200">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="text-gray-500">{icon}</div>}
      </div>
    </div>
  );
}

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

// ============================================================================
// Main Component
// ============================================================================

export function CostDashboardModal({ isOpen, onClose }: CostDashboardModalProps) {
  const {
    getCostReport,
    downloadCsv,
    exportToExcel,
    canViewCosts,
    canExportCosts,
    isLoading: hookLoading,
    error: hookError,
  } = useCosts();

  const [dateRange, setDateRange] = useState<DateRangeOption>('this_month');
  const [report, setReport] = useState<CostReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Custom date range state
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const [customStartDate, setCustomStartDate] = useState<string>(formatDateForInput(thirtyDaysAgo));
  const [customEndDate, setCustomEndDate] = useState<string>(formatDateForInput(now));

  // Get effective date range (either preset or custom)
  const getEffectiveDateRange = useCallback((): DateRange => {
    if (dateRange === 'custom') {
      return {
        startDate: parseDateFromInput(customStartDate),
        endDate: parseDateFromInput(customEndDate, true),
        label: 'Custom Range',
      };
    }
    return getDateRange(dateRange);
  }, [dateRange, customStartDate, customEndDate]);

  // Load cost report when modal opens or date range changes
  const loadReport = useCallback(async () => {
    if (!isOpen || !canViewCosts) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const range = getEffectiveDateRange();
      const costReport = await getCostReport(range.startDate, range.endDate);
      setReport(costReport);
    } catch (err) {
      console.error('Failed to load cost report:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cost report');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, canViewCosts, getEffectiveDateRange, getCostReport]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
    }
  }, [isOpen]);

  // Handle CSV export
  const handleExportCsv = useCallback(() => {
    if (!report) return;
    const range = getEffectiveDateRange();
    const filename = `cost-report-${range.label.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCsv(report, filename);
  }, [report, getEffectiveDateRange, downloadCsv]);

  // Handle Excel export
  const handleExportExcel = useCallback(() => {
    if (!report) return;
    const range = getEffectiveDateRange();
    const filename = `cost-report-${range.label.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
    exportToExcel(report, filename);
  }, [report, getEffectiveDateRange, exportToExcel]);

  // Permission check
  if (!canViewCosts) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Cost Dashboard"
        zIndex="z-[60]"
      >
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <p className="text-gray-400">You do not have permission to view costs.</p>
          <p className="text-sm text-gray-500 mt-2">
            Contact your organization administrator for access.
          </p>
        </div>
      </Modal>
    );
  }

  // Current date range info
  const currentRange = getEffectiveDateRange();

  // Footer with export buttons
  const footer = (
    <div className="flex items-center justify-between w-full">
      <p className="text-xs text-gray-500">
        {currentRange.label}: {currentRange.startDate.toLocaleDateString()} - {currentRange.endDate.toLocaleDateString()}
      </p>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        {canExportCosts && report && (
          <>
            <Button variant="secondary" onClick={handleExportCsv}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                CSV
              </span>
            </Button>
            <Button variant="primary" onClick={handleExportExcel}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Excel
              </span>
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cost Dashboard"
      description="View and analyze AI usage costs across your organization"
      maxWidth="max-w-4xl"
      zIndex="z-[60]"
      footer={footer}
    >
      {/* Date Range Selector */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Period:</span>
          <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
            {(
              [
                { value: 'this_week', label: 'This Week' },
                { value: 'this_month', label: 'This Month' },
                { value: 'last_month', label: 'Last Month' },
                { value: 'last_90_days', label: '90 Days' },
                { value: 'custom', label: 'Custom' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  dateRange === option.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-4 pl-14">
            <div className="flex items-center gap-2">
              <label htmlFor="start-date" className="text-sm text-gray-400">From:</label>
              <input
                id="start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="end-date" className="text-sm text-gray-400">To:</label>
              <input
                id="end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Button
              variant="secondary"
              onClick={loadReport}
              className="!py-1.5 !px-4 text-sm"
            >
              Apply
            </Button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {(isLoading || hookLoading) && (
        <div className="flex items-center justify-center py-12">
          <SmartLoader context="loading" size="lg" showText={false} />
        </div>
      )}

      {/* Error State */}
      {(error || hookError) && !isLoading && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm mb-4">
          {error || hookError}
        </div>
      )}

      {/* Content */}
      {!isLoading && !hookLoading && report && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              title="Total Cost"
              value={formatCost(report.summary?.totalCost ?? 0)}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
            <SummaryCard
              title="Total Tokens"
              value={formatTokenCount(report.summary?.totalTokens ?? 0)}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              }
            />
            <SummaryCard
              title="Total Requests"
              value={(report.summary?.totalRequests ?? 0).toLocaleString()}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              }
            />
          </div>

          {/* By Provider Table */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              By Provider
            </h3>
            {(report.byProvider || []).length === 0 ? (
              <div className="bg-gray-800/30 rounded-lg p-4 text-center text-gray-500 text-sm">
                No usage data for this period
              </div>
            ) : (
              <div className="bg-gray-800/30 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-xs text-gray-400 font-medium p-3">Provider</th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3">Cost</th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3 hidden sm:table-cell">
                        Tokens
                      </th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3 hidden sm:table-cell">
                        Requests
                      </th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.byProvider || []).map((provider) => (
                      <tr key={provider.provider} className="border-b border-gray-700/50 last:border-0">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <ProviderIcon provider={provider.provider} />
                            <span className="text-sm text-gray-200 capitalize">
                              {provider.provider}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right text-sm text-gray-200 font-medium">
                          {formatCost(provider.cost)}
                        </td>
                        <td className="p-3 text-right text-sm text-gray-400 hidden sm:table-cell">
                          {formatTokenCount(provider.tokens)}
                        </td>
                        <td className="p-3 text-right text-sm text-gray-400 hidden sm:table-cell">
                          {provider.requests.toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm text-gray-400">
                              {provider.percentage.toFixed(1)}%
                            </span>
                            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${Math.min(provider.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* By Project Table (Top 10) */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              Top Projects
            </h3>
            {(report.byProject || []).length === 0 ? (
              <div className="bg-gray-800/30 rounded-lg p-4 text-center text-gray-500 text-sm">
                No project data for this period
              </div>
            ) : (
              <div className="bg-gray-800/30 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-xs text-gray-400 font-medium p-3">Project</th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3">Cost</th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3 hidden sm:table-cell">
                        Tokens
                      </th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3 hidden sm:table-cell">
                        Requests
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.byProject || []).slice(0, 10).map((project) => (
                      <tr key={project.projectId} className="border-b border-gray-700/50 last:border-0">
                        <td className="p-3">
                          <span className="text-sm text-gray-200 truncate block max-w-[200px]">
                            {project.projectName}
                          </span>
                        </td>
                        <td className="p-3 text-right text-sm text-gray-200 font-medium">
                          {formatCost(project.cost)}
                        </td>
                        <td className="p-3 text-right text-sm text-gray-400 hidden sm:table-cell">
                          {formatTokenCount(project.tokens)}
                        </td>
                        <td className="p-3 text-right text-sm text-gray-400 hidden sm:table-cell">
                          {project.requests.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(report.byProject || []).length > 10 && (
                  <div className="p-3 text-center text-xs text-gray-500 border-t border-gray-700/50">
                    Showing top 10 of {(report.byProject || []).length} projects
                  </div>
                )}
              </div>
            )}
          </div>

          {/* By Topical Map Table */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              By Topical Map
            </h3>
            {(report.byMap || []).length === 0 ? (
              <div className="bg-gray-800/30 rounded-lg p-4 text-center text-gray-500 text-sm">
                No map data for this period
              </div>
            ) : (
              <div className="bg-gray-800/30 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-xs text-gray-400 font-medium p-3">Topical Map</th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3">Cost</th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3 hidden sm:table-cell">
                        Tokens
                      </th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3 hidden sm:table-cell">
                        Requests
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.byMap || []).slice(0, 10).map((map) => (
                      <tr key={map.mapId} className="border-b border-gray-700/50 last:border-0">
                        <td className="p-3">
                          <span className="text-sm text-gray-200 truncate block max-w-[200px]">
                            {map.mapName}
                          </span>
                        </td>
                        <td className="p-3 text-right text-sm text-gray-200 font-medium">
                          {formatCost(map.cost)}
                        </td>
                        <td className="p-3 text-right text-sm text-gray-400 hidden sm:table-cell">
                          {formatTokenCount(map.tokens)}
                        </td>
                        <td className="p-3 text-right text-sm text-gray-400 hidden sm:table-cell">
                          {map.requests.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(report.byMap || []).length > 10 && (
                  <div className="p-3 text-center text-xs text-gray-500 border-t border-gray-700/50">
                    Showing top 10 of {(report.byMap || []).length} maps
                  </div>
                )}
              </div>
            )}
          </div>

          {/* By Model Table */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              By Model
            </h3>
            {(report.byModel || []).length === 0 ? (
              <div className="bg-gray-800/30 rounded-lg p-4 text-center text-gray-500 text-sm">
                No model data for this period
              </div>
            ) : (
              <div className="bg-gray-800/30 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-xs text-gray-400 font-medium p-3">Provider</th>
                      <th className="text-left text-xs text-gray-400 font-medium p-3">Model</th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3">Cost</th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3 hidden sm:table-cell">
                        Tokens
                      </th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3 hidden sm:table-cell">
                        Requests
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.byModel || []).slice(0, 10).map((model, idx) => (
                      <tr key={`${model.provider}-${model.model}-${idx}`} className="border-b border-gray-700/50 last:border-0">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <ProviderIcon provider={model.provider} />
                            <span className="text-sm text-gray-400 capitalize">
                              {model.provider}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-sm text-gray-200 truncate block max-w-[150px]">
                            {model.model}
                          </span>
                        </td>
                        <td className="p-3 text-right text-sm text-gray-200 font-medium">
                          {formatCost(model.cost)}
                        </td>
                        <td className="p-3 text-right text-sm text-gray-400 hidden sm:table-cell">
                          {formatTokenCount(model.tokens)}
                        </td>
                        <td className="p-3 text-right text-sm text-gray-400 hidden sm:table-cell">
                          {model.requests.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(report.byModel || []).length > 10 && (
                  <div className="p-3 text-center text-xs text-gray-500 border-t border-gray-700/50">
                    Showing top 10 of {(report.byModel || []).length} models
                  </div>
                )}
              </div>
            )}
          </div>

          {/* By Key Source Table */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
              By API Key Source
            </h3>
            {(report.byKeySource || []).length === 0 ? (
              <div className="bg-gray-800/30 rounded-lg p-4 text-center text-gray-500 text-sm">
                No key source data for this period
              </div>
            ) : (
              <div className="bg-gray-800/30 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-xs text-gray-400 font-medium p-3">Key Source</th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3">Cost</th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3 hidden sm:table-cell">
                        Tokens
                      </th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3 hidden sm:table-cell">
                        Requests
                      </th>
                      <th className="text-right text-xs text-gray-400 font-medium p-3">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.byKeySource || []).map((source) => (
                      <tr key={source.keySource} className="border-b border-gray-700/50 last:border-0">
                        <td className="p-3">
                          <span className="text-sm text-gray-200 capitalize">
                            {source.keySource === 'user' ? 'Personal Key' :
                             source.keySource === 'organization' ? 'Organization Key' :
                             source.keySource}
                          </span>
                        </td>
                        <td className="p-3 text-right text-sm text-gray-200 font-medium">
                          {formatCost(source.cost)}
                        </td>
                        <td className="p-3 text-right text-sm text-gray-400 hidden sm:table-cell">
                          {formatTokenCount(source.tokens)}
                        </td>
                        <td className="p-3 text-right text-sm text-gray-400 hidden sm:table-cell">
                          {source.requests.toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm text-gray-400">
                              {source.percentage.toFixed(1)}%
                            </span>
                            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(source.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !hookLoading && !error && !hookError && !report && (
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-400">No cost data available</p>
          <p className="text-sm text-gray-500 mt-2">
            Cost data will appear here once AI requests are made.
          </p>
        </div>
      )}
    </Modal>
  );
}

export default CostDashboardModal;
