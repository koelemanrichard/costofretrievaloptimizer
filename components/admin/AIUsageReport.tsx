import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Loader } from '../ui/Loader';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import { fetchUsageStats, fetchUsageSummary, syncPendingLogs, getPendingLogCount } from '../../services/telemetryService';

interface UsageLog {
    id: string;
    provider: string;
    model: string;
    operation: string;
    operation_detail?: string;
    tokens_in: number;
    tokens_out: number;
    cost_usd: number;
    duration_ms?: number;
    success: boolean;
    error_message?: string;
    map_id?: string;
    project_id?: string;
    created_at: string;
}

interface UsageSummary {
    byProvider: Record<string, { calls: number; cost: number; tokens: number }>;
    byOperation: Record<string, { calls: number; cost: number; tokens: number }>;
    totalCost: number;
    totalCalls: number;
    totalTokens: number;
    errorRate: number;
}

const AIUsageReport: React.FC = () => {
    const { state } = useAppState();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [summary, setSummary] = useState<UsageSummary | null>(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    // Filters
    const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('30');
    const [providerFilter, setProviderFilter] = useState<string>('all');
    const [operationFilter, setOperationFilter] = useState<string>('all');
    const [successFilter, setSuccessFilter] = useState<'all' | 'success' | 'error'>('all');
    const [view, setView] = useState<'summary' | 'details' | 'chart'>('summary');

    const supabase = useMemo(() => {
        if (state.businessInfo.supabaseUrl && state.businessInfo.supabaseAnonKey) {
            return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
        }
        return null;
    }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

    const loadData = async () => {
        if (!supabase || !state.user?.id) return;

        setIsLoading(true);
        setError(null);

        try {
            const days = dateRange === 'all' ? 365 : parseInt(dateRange);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // Fetch detailed logs
            const logsData = await fetchUsageStats(supabase, {
                userId: state.user.id,
                startDate: dateRange !== 'all' ? startDate : undefined,
            });
            setLogs(logsData);

            // Fetch summary
            const summaryData = await fetchUsageSummary(supabase, state.user.id, days);
            setSummary(summaryData);

            // Check pending logs
            setPendingCount(getPendingLogCount());
        } catch (e) {
            console.error('Failed to load usage data:', e);
            setError(e instanceof Error ? e.message : 'Failed to load usage data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [dateRange, supabase, state.user?.id]);

    const handleSyncPending = async () => {
        if (!supabase) return;
        setIsSyncing(true);
        try {
            const synced = await syncPendingLogs(supabase);
            setPendingCount(getPendingLogCount());
            if (synced > 0) {
                loadData();
            }
        } finally {
            setIsSyncing(false);
        }
    };

    // Filter logs
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            if (providerFilter !== 'all' && log.provider !== providerFilter) return false;
            if (operationFilter !== 'all' && log.operation !== operationFilter) return false;
            if (successFilter === 'success' && !log.success) return false;
            if (successFilter === 'error' && log.success) return false;
            return true;
        });
    }, [logs, providerFilter, operationFilter, successFilter]);

    // Get unique providers and operations for filters
    const providers = useMemo(() => [...new Set(logs.map(l => l.provider))], [logs]);
    const operations = useMemo(() => [...new Set(logs.map(l => l.operation))], [logs]);

    // Calculate filtered totals
    const filteredTotals = useMemo(() => {
        return filteredLogs.reduce(
            (acc, log) => ({
                cost: acc.cost + (log.cost_usd || 0),
                tokens: acc.tokens + (log.tokens_in || 0) + (log.tokens_out || 0),
                calls: acc.calls + 1,
            }),
            { cost: 0, tokens: 0, calls: 0 }
        );
    }, [filteredLogs]);

    // Group logs by day for chart view
    const dailyData = useMemo(() => {
        const byDay: Record<string, { cost: number; calls: number; tokens: number }> = {};

        filteredLogs.forEach(log => {
            const day = new Date(log.created_at).toLocaleDateString();
            if (!byDay[day]) {
                byDay[day] = { cost: 0, calls: 0, tokens: 0 };
            }
            byDay[day].cost += log.cost_usd || 0;
            byDay[day].calls += 1;
            byDay[day].tokens += (log.tokens_in || 0) + (log.tokens_out || 0);
        });

        return Object.entries(byDay)
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            .slice(-30);
    }, [filteredLogs]);

    if (!supabase) {
        return (
            <Card className="p-6">
                <p className="text-gray-400">Database connection not configured. Usage data will be stored locally only.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">AI Usage Report</h2>
                    <p className="text-sm text-gray-400 mt-1">Track API usage, costs, and performance across all AI providers</p>
                </div>
                <div className="flex items-center gap-3">
                    {pendingCount > 0 && (
                        <Button
                            onClick={handleSyncPending}
                            variant="secondary"
                            className="text-xs"
                            disabled={isSyncing}
                        >
                            {isSyncing ? <Loader className="w-4 h-4" /> : `Sync ${pendingCount} pending`}
                        </Button>
                    )}
                    <Button onClick={loadData} disabled={isLoading}>
                        {isLoading ? <Loader className="w-4 h-4" /> : 'Refresh'}
                    </Button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-900/20 border border-red-700/50 rounded text-sm text-red-300">
                    {error}
                </div>
            )}

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card className="p-4 bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-500/30">
                        <h3 className="text-xs uppercase text-blue-400 font-bold">Total Cost</h3>
                        <p className="text-2xl font-bold text-white">${summary.totalCost.toFixed(4)}</p>
                        <p className="text-xs text-gray-400 mt-1">Last {dateRange} days</p>
                    </Card>
                    <Card className="p-4 bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-500/30">
                        <h3 className="text-xs uppercase text-purple-400 font-bold">API Calls</h3>
                        <p className="text-2xl font-bold text-white">{summary.totalCalls.toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-1">{(summary.totalCalls / parseInt(dateRange || '30')).toFixed(1)}/day avg</p>
                    </Card>
                    <Card className="p-4 bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-500/30">
                        <h3 className="text-xs uppercase text-green-400 font-bold">Total Tokens</h3>
                        <p className="text-2xl font-bold text-white">{(summary.totalTokens / 1000).toFixed(1)}k</p>
                        <p className="text-xs text-gray-400 mt-1">${(summary.totalCost / (summary.totalTokens / 1000 || 1)).toFixed(4)}/1k</p>
                    </Card>
                    <Card className="p-4 bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border border-yellow-500/30">
                        <h3 className="text-xs uppercase text-yellow-400 font-bold">Success Rate</h3>
                        <p className="text-2xl font-bold text-white">{(100 - summary.errorRate).toFixed(1)}%</p>
                        <p className="text-xs text-gray-400 mt-1">{summary.errorRate.toFixed(1)}% errors</p>
                    </Card>
                    <Card className="p-4 bg-gradient-to-br from-gray-800/50 to-gray-700/30 border border-gray-600">
                        <h3 className="text-xs uppercase text-gray-400 font-bold">Providers</h3>
                        <p className="text-2xl font-bold text-white">{Object.keys(summary.byProvider).length}</p>
                        <p className="text-xs text-gray-400 mt-1">{Object.keys(summary.byOperation).length} operations</p>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card className="p-4 bg-gray-800/50">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Period:</span>
                        <Select
                            value={dateRange}
                            onChange={e => setDateRange(e.target.value as any)}
                            className="w-32"
                        >
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="all">All time</option>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Provider:</span>
                        <Select
                            value={providerFilter}
                            onChange={e => setProviderFilter(e.target.value)}
                            className="w-32"
                        >
                            <option value="all">All</option>
                            {providers.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Operation:</span>
                        <Select
                            value={operationFilter}
                            onChange={e => setOperationFilter(e.target.value)}
                            className="w-48"
                        >
                            <option value="all">All</option>
                            {operations.map(o => (
                                <option key={o} value={o}>{o}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Status:</span>
                        <Select
                            value={successFilter}
                            onChange={e => setSuccessFilter(e.target.value as any)}
                            className="w-28"
                        >
                            <option value="all">All</option>
                            <option value="success">Success</option>
                            <option value="error">Errors</option>
                        </Select>
                    </div>
                    <div className="ml-auto flex gap-2">
                        <Button
                            variant={view === 'summary' ? 'primary' : 'secondary'}
                            className="text-xs py-1"
                            onClick={() => setView('summary')}
                        >
                            Summary
                        </Button>
                        <Button
                            variant={view === 'details' ? 'primary' : 'secondary'}
                            className="text-xs py-1"
                            onClick={() => setView('details')}
                        >
                            Details
                        </Button>
                        <Button
                            variant={view === 'chart' ? 'primary' : 'secondary'}
                            className="text-xs py-1"
                            onClick={() => setView('chart')}
                        >
                            Chart
                        </Button>
                    </div>
                </div>
            </Card>

            {/* View Content */}
            {view === 'summary' && summary && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* By Provider */}
                    <Card className="p-0 overflow-hidden">
                        <div className="p-4 border-b border-gray-700 bg-gray-800">
                            <h3 className="font-bold text-white">Usage by Provider</h3>
                        </div>
                        <div className="divide-y divide-gray-800">
                            {Object.entries(summary.byProvider)
                                .sort((a, b) => b[1].cost - a[1].cost)
                                .map(([provider, stats]) => (
                                    <div key={provider} className="p-4 flex justify-between items-center hover:bg-gray-800/50">
                                        <div>
                                            <span className="font-medium text-white capitalize">{provider}</span>
                                            <p className="text-xs text-gray-400">{stats.calls} calls &middot; {(stats.tokens / 1000).toFixed(1)}k tokens</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-green-400 font-mono">${stats.cost.toFixed(4)}</span>
                                            <p className="text-xs text-gray-400">{((stats.cost / summary.totalCost) * 100).toFixed(1)}%</p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </Card>

                    {/* By Operation */}
                    <Card className="p-0 overflow-hidden">
                        <div className="p-4 border-b border-gray-700 bg-gray-800">
                            <h3 className="font-bold text-white">Usage by Operation</h3>
                        </div>
                        <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto">
                            {Object.entries(summary.byOperation)
                                .sort((a, b) => b[1].cost - a[1].cost)
                                .slice(0, 15)
                                .map(([operation, stats]) => (
                                    <div key={operation} className="p-4 flex justify-between items-center hover:bg-gray-800/50">
                                        <div>
                                            <span className="font-medium text-white text-sm">{operation}</span>
                                            <p className="text-xs text-gray-400">{stats.calls} calls</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-green-400 font-mono text-sm">${stats.cost.toFixed(4)}</span>
                                            <p className="text-xs text-gray-400">{(stats.tokens / 1000).toFixed(1)}k tok</p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </Card>
                </div>
            )}

            {view === 'details' && (
                <Card className="p-0 overflow-hidden">
                    <div className="p-4 border-b border-gray-700 bg-gray-800 flex justify-between items-center">
                        <h3 className="font-bold text-white">Detailed Logs</h3>
                        <span className="text-xs text-gray-400">
                            Showing {filteredLogs.length} of {logs.length} &middot;
                            ${filteredTotals.cost.toFixed(4)} total
                        </span>
                    </div>
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-gray-900 text-gray-200 text-xs uppercase sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Time</th>
                                    <th className="px-4 py-3">Provider</th>
                                    <th className="px-4 py-3">Model</th>
                                    <th className="px-4 py-3">Operation</th>
                                    <th className="px-4 py-3 text-right">Tokens</th>
                                    <th className="px-4 py-3 text-right">Duration</th>
                                    <th className="px-4 py-3 text-right">Cost</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {filteredLogs.slice(0, 100).map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-800/50">
                                        <td className="px-4 py-2 whitespace-nowrap text-xs">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2 capitalize">{log.provider}</td>
                                        <td className="px-4 py-2 font-mono text-xs">{log.model}</td>
                                        <td className="px-4 py-2">
                                            <span className="font-medium text-white text-xs">{log.operation}</span>
                                            {log.operation_detail && (
                                                <span className="text-gray-500 text-xs ml-1">({log.operation_detail})</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono text-xs">
                                            {log.tokens_in + log.tokens_out}
                                            <span className="text-gray-500 ml-1">
                                                ({log.tokens_in}/{log.tokens_out})
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono text-xs">
                                            {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}
                                        </td>
                                        <td className="px-4 py-2 text-right text-green-400 font-mono text-xs">
                                            ${log.cost_usd?.toFixed(5)}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            {log.success ? (
                                                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                                            ) : (
                                                <span className="inline-block w-2 h-2 rounded-full bg-red-500" title={log.error_message}></span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center italic">
                                            No logs match your filters.
                                        </td>
                                    </tr>
                                )}
                                {filteredLogs.length > 100 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-4 text-center text-xs text-gray-500">
                                            Showing first 100 of {filteredLogs.length} records
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {view === 'chart' && (
                <Card className="p-6">
                    <h3 className="font-bold text-white mb-4">Daily Usage (Last 30 days)</h3>
                    {dailyData.length > 0 ? (
                        <div className="space-y-6">
                            {/* Simple bar chart */}
                            <div className="h-48 flex items-end gap-1">
                                {dailyData.map(([day, data], i) => {
                                    const maxCost = Math.max(...dailyData.map(d => d[1].cost));
                                    const height = maxCost > 0 ? (data.cost / maxCost) * 100 : 0;
                                    return (
                                        <div
                                            key={day}
                                            className="flex-1 bg-blue-500/50 hover:bg-blue-400/60 rounded-t transition-colors group relative"
                                            style={{ height: `${Math.max(height, 2)}%` }}
                                        >
                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                                                <div className="font-bold">{day}</div>
                                                <div>${data.cost.toFixed(4)}</div>
                                                <div>{data.calls} calls</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>{dailyData[0]?.[0]}</span>
                                <span>{dailyData[dailyData.length - 1]?.[0]}</span>
                            </div>

                            {/* Daily totals table */}
                            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                                <div>
                                    <span className="text-xs text-gray-400">Avg Daily Cost</span>
                                    <p className="text-lg font-bold text-white">
                                        ${(dailyData.reduce((s, d) => s + d[1].cost, 0) / dailyData.length).toFixed(4)}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-400">Avg Daily Calls</span>
                                    <p className="text-lg font-bold text-white">
                                        {Math.round(dailyData.reduce((s, d) => s + d[1].calls, 0) / dailyData.length)}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-400">Peak Day</span>
                                    <p className="text-lg font-bold text-white">
                                        ${Math.max(...dailyData.map(d => d[1].cost)).toFixed(4)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-400 text-center py-8">No data available for the selected period.</p>
                    )}
                </Card>
            )}
        </div>
    );
};

export default AIUsageReport;
