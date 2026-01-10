/**
 * useCosts Hook
 *
 * Hook for tracking and exporting AI usage costs.
 * Provides cost aggregation, filtering, and CSV export.
 *
 * Created: 2026-01-09 - Multi-tenancy Phase 5
 */

import { useCallback, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { getSupabaseClient } from '../services/supabaseClient';
import { useOrganizationContext } from '../components/organization/OrganizationProvider';
import { usePermissions } from './usePermissions';
import { useAppState } from '../state/appState';

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
  mapId?: string;
  mapName?: string;
  organizationId?: string;
}

export interface CostByMap {
  mapId: string;
  mapName: string;
  cost: number;
  tokens: number;
  requests: number;
}

export interface CostByKeySource {
  keySource: string;
  cost: number;
  tokens: number;
  requests: number;
  percentage: number;
}

export interface CostReport {
  summary: CostSummary;
  byProvider: CostByProvider[];    // Always an array
  byProject: CostByProject[];      // Always an array
  byModel: CostByModel[];          // Always an array
  byMap: CostByMap[];              // Always an array
  byKeySource: CostByKeySource[];  // Always an array
  logs: UsageLogEntry[];           // Always an array
}

// ============================================================================
// Hook
// ============================================================================

export function useCosts() {
  const { state } = useAppState();
  const supabase = useMemo(() => {
    if (!state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) {
      return null;
    }
    return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
  }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

  const { current: organization } = useOrganizationContext();
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
    if (!supabase || !organization || !can('canViewCosts')) {
      setError('No permission to view costs');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Supabase has a default 1000 row limit - we need to paginate to get all data
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let hasMore = true;
      let offset = 0;

      while (hasMore) {
        let query = supabase
          .from('ai_usage_logs')
          .select(`
            id,
            created_at,
            provider,
            model,
            tokens_in,
            tokens_out,
            cost_usd,
            project_id,
            operation,
            key_source,
            map_id,
            organization_id,
            projects:project_id (project_name),
            topical_maps:map_id (name)
          `)
          .eq('organization_id', organization.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (projectId) {
          query = query.eq('project_id', projectId);
        }

        const { data: pageData, error: queryError } = await query;

        if (queryError) throw queryError;

        if (pageData && pageData.length > 0) {
          allData = allData.concat(pageData);
          offset += PAGE_SIZE;
          // If we got fewer than PAGE_SIZE, we've reached the end
          hasMore = pageData.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      const data = allData;

      // Process data
      const logs: UsageLogEntry[] = (data || []).map((log: any) => ({
        id: log.id,
        createdAt: log.created_at,
        provider: log.provider,
        model: log.model,
        inputTokens: log.tokens_in || 0,
        outputTokens: log.tokens_out || 0,
        costUsd: log.cost_usd || 0,
        projectId: log.project_id,
        projectName: log.projects?.project_name,
        operation: log.operation,
        keySource: log.key_source,
        mapId: log.map_id,
        mapName: log.topical_maps?.name,
        organizationId: log.organization_id,
      }));

      // Aggregate by various dimensions
      const providerMap = new Map<string, { cost: number; tokens: number; requests: number }>();
      const projectMap = new Map<string, { name: string; cost: number; tokens: number; requests: number }>();
      const modelMap = new Map<string, { provider: string; cost: number; tokens: number; requests: number }>();
      const mapMap = new Map<string, { name: string; cost: number; tokens: number; requests: number }>();
      const keySourceMap = new Map<string, { cost: number; tokens: number; requests: number }>();

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

        // By topical map
        if (log.mapId) {
          const mapStats = mapMap.get(log.mapId) || { name: log.mapName || 'Unknown Map', cost: 0, tokens: 0, requests: 0 };
          mapStats.cost += log.costUsd;
          mapStats.tokens += tokens;
          mapStats.requests += 1;
          mapMap.set(log.mapId, mapStats);
        }

        // By key source (user vs organization)
        const keySource = log.keySource || 'unknown';
        const keyStats = keySourceMap.get(keySource) || { cost: 0, tokens: 0, requests: 0 };
        keyStats.cost += log.costUsd;
        keyStats.tokens += tokens;
        keyStats.requests += 1;
        keySourceMap.set(keySource, keyStats);
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

      const byMap: CostByMap[] = Array.from(mapMap.entries())
        .map(([mapId, stats]) => ({
          mapId,
          mapName: stats.name,
          cost: stats.cost,
          tokens: stats.tokens,
          requests: stats.requests,
        }))
        .sort((a, b) => b.cost - a.cost);

      const byKeySource: CostByKeySource[] = Array.from(keySourceMap.entries())
        .map(([keySource, stats]) => ({
          keySource,
          ...stats,
          percentage: totalCost > 0 ? (stats.cost / totalCost) * 100 : 0,
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
        byMap,
        byKeySource,
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

    // By Model
    lines.push('--- BY MODEL ---');
    lines.push('Provider,Model,Cost (USD),Tokens,Requests');
    for (const m of report.byModel) {
      lines.push(`${m.provider},${m.model},$${m.cost.toFixed(4)},${m.tokens},${m.requests}`);
    }
    lines.push('');

    // By Topical Map
    lines.push('--- BY TOPICAL MAP ---');
    lines.push('Map Name,Cost (USD),Tokens,Requests');
    for (const m of report.byMap) {
      lines.push(`"${m.mapName}",$${m.cost.toFixed(4)},${m.tokens},${m.requests}`);
    }
    lines.push('');

    // By Key Source
    lines.push('--- BY KEY SOURCE ---');
    lines.push('Key Source,Cost (USD),Tokens,Requests,Percentage');
    for (const k of report.byKeySource) {
      lines.push(`${k.keySource},$${k.cost.toFixed(4)},${k.tokens},${k.requests},${k.percentage.toFixed(1)}%`);
    }
    lines.push('');

    // Detailed Logs
    lines.push('--- DETAILED LOGS ---');
    lines.push('Date,Provider,Model,Input Tokens,Output Tokens,Cost (USD),Project,Map,Operation,Key Source');
    for (const log of report.logs) {
      lines.push([
        log.createdAt,
        log.provider,
        log.model,
        log.inputTokens,
        log.outputTokens,
        `$${log.costUsd.toFixed(6)}`,
        `"${log.projectName || ''}"`,
        `"${log.mapName || ''}"`,
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
   * Export cost report to formatted Excel (.xlsx)
   */
  const exportToExcel = useCallback((report: CostReport, filename?: string) => {
    if (!can('canExportData')) {
      throw new Error('No permission to export data');
    }

    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Cost Report Summary'],
      ['Organization', organization?.name || 'Unknown'],
      ['Period', `${report.summary.periodStart.split('T')[0]} to ${report.summary.periodEnd.split('T')[0]}`],
      [''],
      ['Metric', 'Value'],
      ['Total Cost', `$${report.summary.totalCost.toFixed(4)}`],
      ['Total Tokens', report.summary.totalTokens.toLocaleString()],
      ['Total Requests', report.summary.totalRequests.toLocaleString()],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    // Set column widths
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // By Provider Sheet
    const providerData = [
      ['Provider', 'Cost (USD)', 'Tokens', 'Requests', 'Percentage'],
      ...report.byProvider.map(p => [
        p.provider,
        p.cost,
        p.tokens,
        p.requests,
        `${p.percentage.toFixed(1)}%`,
      ]),
    ];
    const providerSheet = XLSX.utils.aoa_to_sheet(providerData);
    providerSheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, providerSheet, 'By Provider');

    // By Project Sheet
    const projectData = [
      ['Project', 'Cost (USD)', 'Tokens', 'Requests'],
      ...report.byProject.map(p => [
        p.projectName,
        p.cost,
        p.tokens,
        p.requests,
      ]),
    ];
    const projectSheet = XLSX.utils.aoa_to_sheet(projectData);
    projectSheet['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(workbook, projectSheet, 'By Project');

    // By Model Sheet
    const modelData = [
      ['Provider', 'Model', 'Cost (USD)', 'Tokens', 'Requests'],
      ...report.byModel.map(m => [
        m.provider,
        m.model,
        m.cost,
        m.tokens,
        m.requests,
      ]),
    ];
    const modelSheet = XLSX.utils.aoa_to_sheet(modelData);
    modelSheet['!cols'] = [{ wch: 15 }, { wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(workbook, modelSheet, 'By Model');

    // By Topical Map Sheet
    const mapData = [
      ['Topical Map', 'Cost (USD)', 'Tokens', 'Requests'],
      ...report.byMap.map(m => [
        m.mapName,
        m.cost,
        m.tokens,
        m.requests,
      ]),
    ];
    const mapSheet = XLSX.utils.aoa_to_sheet(mapData);
    mapSheet['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(workbook, mapSheet, 'By Topical Map');

    // By Key Source Sheet
    const keySourceData = [
      ['Key Source', 'Cost (USD)', 'Tokens', 'Requests', 'Percentage'],
      ...report.byKeySource.map(k => [
        k.keySource === 'user' ? 'Personal Key' : k.keySource === 'organization' ? 'Organization Key' : k.keySource,
        k.cost,
        k.tokens,
        k.requests,
        `${k.percentage.toFixed(1)}%`,
      ]),
    ];
    const keySourceSheet = XLSX.utils.aoa_to_sheet(keySourceData);
    keySourceSheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, keySourceSheet, 'By Key Source');

    // Detailed Logs Sheet
    const logsData = [
      ['Date', 'Provider', 'Model', 'Input Tokens', 'Output Tokens', 'Cost (USD)', 'Project', 'Map', 'Operation', 'Key Source'],
      ...report.logs.map(log => [
        log.createdAt.split('T')[0] + ' ' + log.createdAt.split('T')[1]?.substring(0, 8),
        log.provider,
        log.model,
        log.inputTokens,
        log.outputTokens,
        log.costUsd,
        log.projectName || '',
        log.mapName || '',
        log.operation || '',
        log.keySource,
      ]),
    ];
    const logsSheet = XLSX.utils.aoa_to_sheet(logsData);
    logsSheet['!cols'] = [
      { wch: 20 }, { wch: 12 }, { wch: 35 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(workbook, logsSheet, 'Detailed Logs');

    // Generate and download
    const excelFilename = filename || `cost-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, excelFilename);
  }, [can, organization]);

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
    exportToExcel,
    getCurrentMonthCosts,

    // Permission check
    canViewCosts: can('canViewCosts'),
    canExportCosts: can('canExportData'),
  };
}
