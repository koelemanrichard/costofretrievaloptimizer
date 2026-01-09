/**
 * useCosts Hook
 *
 * Hook for tracking and exporting AI usage costs.
 * Provides cost aggregation, filtering, and CSV export.
 *
 * Created: 2026-01-09 - Multi-tenancy Phase 5
 */

import { useCallback, useState } from 'react';
import { getSupabaseClient } from '../services/supabaseClient';
import { useOrganization } from './useOrganization';
import { usePermissions } from './usePermissions';

// ============================================================================
// Types
// ============================================================================

export interface CostSummary {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  periodStart: string;
  periodEnd: string;
}

export interface CostByProvider {
  provider: string;
  cost: number;
  tokens: number;
  requests: number;
  percentage: number;
}

export interface CostByProject {
  projectId: string;
  projectName: string;
  cost: number;
  tokens: number;
  requests: number;
}

export interface CostByModel {
  provider: string;
  model: string;
  cost: number;
  tokens: number;
  requests: number;
}

export interface UsageLogEntry {
  id: string;
  createdAt: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  projectId: string;
  projectName?: string;
  operation?: string;
  keySource: string;
}

export interface CostReport {
  summary: CostSummary;
  byProvider: CostByProvider[];
  byProject: CostByProject[];
  byModel: CostByModel[];
  logs: UsageLogEntry[];
}

// ============================================================================
// Hook
// ============================================================================

export function useCosts() {
  const supabase = getSupabaseClient();
  const { current: organization } = useOrganization();
  const { can } = usePermissions();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get cost report for the current organization
   */
  const getCostReport = useCallback(async (
    startDate: Date,
    endDate: Date,
    projectId?: string
  ): Promise<CostReport | null> => {
    if (!organization || !can('canViewCosts')) {
      setError('No permission to view costs');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('ai_usage_logs')
        .select(`
          id,
          created_at,
          provider,
          model,
          input_tokens,
          output_tokens,
          cost_usd,
          project_id,
          operation,
          key_source,
          projects:project_id (name)
        `)
        .eq('organization_id', organization.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Process data
      const logs: UsageLogEntry[] = (data || []).map((log: any) => ({
        id: log.id,
        createdAt: log.created_at,
        provider: log.provider,
        model: log.model,
        inputTokens: log.input_tokens || 0,
        outputTokens: log.output_tokens || 0,
        costUsd: log.cost_usd || 0,
        projectId: log.project_id,
        projectName: log.projects?.name,
        operation: log.operation,
        keySource: log.key_source,
      }));

      // Aggregate by provider
      const providerMap = new Map<string, { cost: number; tokens: number; requests: number }>();
      const projectMap = new Map<string, { name: string; cost: number; tokens: number; requests: number }>();
      const modelMap = new Map<string, { provider: string; cost: number; tokens: number; requests: number }>();

      let totalCost = 0;
      let totalTokens = 0;
      let totalRequests = 0;

      for (const log of logs) {
        const tokens = log.inputTokens + log.outputTokens;
        totalCost += log.costUsd;
        totalTokens += tokens;
        totalRequests += 1;

        // By provider
        const providerStats = providerMap.get(log.provider) || { cost: 0, tokens: 0, requests: 0 };
        providerStats.cost += log.costUsd;
        providerStats.tokens += tokens;
        providerStats.requests += 1;
        providerMap.set(log.provider, providerStats);

        // By project
        if (log.projectId) {
          const projectStats = projectMap.get(log.projectId) || { name: log.projectName || 'Unknown', cost: 0, tokens: 0, requests: 0 };
          projectStats.cost += log.costUsd;
          projectStats.tokens += tokens;
          projectStats.requests += 1;
          projectMap.set(log.projectId, projectStats);
        }

        // By model
        const modelKey = `${log.provider}:${log.model}`;
        const modelStats = modelMap.get(modelKey) || { provider: log.provider, cost: 0, tokens: 0, requests: 0 };
        modelStats.cost += log.costUsd;
        modelStats.tokens += tokens;
        modelStats.requests += 1;
        modelMap.set(modelKey, modelStats);
      }

      // Build response
      const byProvider: CostByProvider[] = Array.from(providerMap.entries())
        .map(([provider, stats]) => ({
          provider,
          ...stats,
          percentage: totalCost > 0 ? (stats.cost / totalCost) * 100 : 0,
        }))
        .sort((a, b) => b.cost - a.cost);

      const byProject: CostByProject[] = Array.from(projectMap.entries())
        .map(([projectId, stats]) => ({
          projectId,
          projectName: stats.name,
          cost: stats.cost,
          tokens: stats.tokens,
          requests: stats.requests,
        }))
        .sort((a, b) => b.cost - a.cost);

      const byModel: CostByModel[] = Array.from(modelMap.entries())
        .map(([key, stats]) => ({
          provider: stats.provider,
          model: key.split(':')[1],
          ...stats,
        }))
        .sort((a, b) => b.cost - a.cost);

      return {
        summary: {
          totalCost,
          totalTokens,
          totalRequests,
          periodStart: startDate.toISOString(),
          periodEnd: endDate.toISOString(),
        },
        byProvider,
        byProject,
        byModel,
        logs,
      };
    } catch (err) {
      console.error('Failed to get cost report:', err);
      setError(err instanceof Error ? err.message : 'Failed to get cost report');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [organization, can, supabase]);

  /**
   * Export cost report to CSV
   */
  const exportToCsv = useCallback((report: CostReport): string => {
    if (!can('canExportData')) {
      throw new Error('No permission to export data');
    }

    const lines: string[] = [];

    // Header
    lines.push('Cost Report Export');
    lines.push(`Organization: ${organization?.name || 'Unknown'}`);
    lines.push(`Period: ${report.summary.periodStart} to ${report.summary.periodEnd}`);
    lines.push(`Total Cost: $${report.summary.totalCost.toFixed(4)}`);
    lines.push(`Total Tokens: ${report.summary.totalTokens.toLocaleString()}`);
    lines.push(`Total Requests: ${report.summary.totalRequests.toLocaleString()}`);
    lines.push('');

    // By Provider
    lines.push('--- BY PROVIDER ---');
    lines.push('Provider,Cost (USD),Tokens,Requests,Percentage');
    for (const p of report.byProvider) {
      lines.push(`${p.provider},$${p.cost.toFixed(4)},${p.tokens},${p.requests},${p.percentage.toFixed(1)}%`);
    }
    lines.push('');

    // By Project
    lines.push('--- BY PROJECT ---');
    lines.push('Project,Cost (USD),Tokens,Requests');
    for (const p of report.byProject) {
      lines.push(`"${p.projectName}",$${p.cost.toFixed(4)},${p.tokens},${p.requests}`);
    }
    lines.push('');

    // Detailed Logs
    lines.push('--- DETAILED LOGS ---');
    lines.push('Date,Provider,Model,Input Tokens,Output Tokens,Cost (USD),Project,Operation,Key Source');
    for (const log of report.logs) {
      lines.push([
        log.createdAt,
        log.provider,
        log.model,
        log.inputTokens,
        log.outputTokens,
        `$${log.costUsd.toFixed(6)}`,
        `"${log.projectName || ''}"`,
        log.operation || '',
        log.keySource,
      ].join(','));
    }

    return lines.join('\n');
  }, [can, organization]);

  /**
   * Download CSV file
   */
  const downloadCsv = useCallback((report: CostReport, filename?: string) => {
    const csv = exportToCsv(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `cost-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportToCsv]);

  /**
   * Get current month's costs (quick summary)
   */
  const getCurrentMonthCosts = useCallback(async (): Promise<CostSummary | null> => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const report = await getCostReport(startOfMonth, endOfMonth);
    return report?.summary || null;
  }, [getCostReport]);

  return {
    // State
    isLoading,
    error,

    // Actions
    getCostReport,
    exportToCsv,
    downloadCsv,
    getCurrentMonthCosts,

    // Permission check
    canViewCosts: can('canViewCosts'),
    canExportCosts: can('canExportData'),
  };
}
