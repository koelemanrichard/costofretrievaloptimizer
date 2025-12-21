import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';

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
    topic_id?: string;
    brief_id?: string;
    job_id?: string;
    created_at: string;
}

interface UsageSummary {
    totalCost: number;
    totalCalls: number;
    totalTokens: number;
    avgDurationMs: number;
    errorRate: number;
    byOperation: Record<string, { calls: number; cost: number; tokens: number }>;
    byProvider: Record<string, { calls: number; cost: number; tokens: number }>;
    byModel: Record<string, { calls: number; cost: number; tokens: number }>;
}

interface MapUsageReportProps {
    mapId: string;
    mapName?: string;
    onClose?: () => void;
}

const MapUsageReport: React.FC<MapUsageReportProps> = ({ mapId, mapName, onClose }) => {
    const { state } = useAppState();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [view, setView] = useState<'summary' | 'details' | 'operations'>('summary');

    const supabase = useMemo(() => {
        if (state.businessInfo.supabaseUrl && state.businessInfo.supabaseAnonKey) {
            return getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
        }
        return null;
    }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

    const loadData = async () => {
        if (!supabase || !mapId) return;

        setIsLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('ai_usage_logs')
                .select('*')
                .eq('map_id', mapId)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setLogs(data || []);
        } catch (e) {
            console.error('Failed to load map usage data:', e);
            setError(e instanceof Error ? e.message : 'Failed to load usage data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [mapId, supabase]);

    // Calculate summary statistics
    const summary: UsageSummary = useMemo(() => {
        const byOperation: Record<string, { calls: number; cost: number; tokens: number }> = {};
        const byProvider: Record<string, { calls: number; cost: number; tokens: number }> = {};
        const byModel: Record<string, { calls: number; cost: number; tokens: number }> = {};

        let totalCost = 0;
        let totalCalls = 0;
        let totalTokens = 0;
        let totalDuration = 0;
        let errorCount = 0;

        for (const log of logs) {
            const tokens = (log.tokens_in || 0) + (log.tokens_out || 0);
            const cost = log.cost_usd || 0;

            totalCost += cost;
            totalCalls++;
            totalTokens += tokens;
            totalDuration += log.duration_ms || 0;
            if (!log.success) errorCount++;

            // By operation
            const op = log.operation || 'unknown';
            if (!byOperation[op]) byOperation[op] = { calls: 0, cost: 0, tokens: 0 };
            byOperation[op].calls++;
            byOperation[op].cost += cost;
            byOperation[op].tokens += tokens;

            // By provider
            if (!byProvider[log.provider]) byProvider[log.provider] = { calls: 0, cost: 0, tokens: 0 };
            byProvider[log.provider].calls++;
            byProvider[log.provider].cost += cost;
            byProvider[log.provider].tokens += tokens;

            // By model
            if (!byModel[log.model]) byModel[log.model] = { calls: 0, cost: 0, tokens: 0 };
            byModel[log.model].calls++;
            byModel[log.model].cost += cost;
            byModel[log.model].tokens += tokens;
        }

        return {
            totalCost,
            totalCalls,
            totalTokens,
            avgDurationMs: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
            errorRate: totalCalls > 0 ? (errorCount / totalCalls) * 100 : 0,
            byOperation,
            byProvider,
            byModel
        };
    }, [logs]);

    // Group operations by category
    const operationCategories = useMemo(() => {
        const categories: Record<string, { calls: number; cost: number; tokens: number; operations: string[] }> = {
            'Map Generation': { calls: 0, cost: 0, tokens: 0, operations: [] },
            'Brief Generation': { calls: 0, cost: 0, tokens: 0, operations: [] },
            'Article Generation': { calls: 0, cost: 0, tokens: 0, operations: [] },
            'Analysis & Validation': { calls: 0, cost: 0, tokens: 0, operations: [] },
            'Other': { calls: 0, cost: 0, tokens: 0, operations: [] }
        };

        for (const [op, stats] of Object.entries(summary.byOperation)) {
            let category = 'Other';
            if (op.toLowerCase().includes('map') || op.toLowerCase().includes('topic') || op.toLowerCase().includes('expand')) {
                category = 'Map Generation';
            } else if (op.toLowerCase().includes('brief')) {
                category = 'Brief Generation';
            } else if (op.toLowerCase().includes('draft') || op.toLowerCase().includes('pass') || op.toLowerCase().includes('article')) {
                category = 'Article Generation';
            } else if (op.toLowerCase().includes('audit') || op.toLowerCase().includes('valid') || op.toLowerCase().includes('flow') || op.toLowerCase().includes('analyze')) {
                category = 'Analysis & Validation';
            }

            categories[category].calls += stats.calls;
            categories[category].cost += stats.cost;
            categories[category].tokens += stats.tokens;
            if (!categories[category].operations.includes(op)) {
                categories[category].operations.push(op);
            }
        }

        return categories;
    }, [summary.byOperation]);

    const formatCost = (cost: number) => `$${cost.toFixed(4)}`;
    const formatTokens = (tokens: number) => tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : tokens.toString();

    if (isLoading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <Loader />
                <span className="ml-2 text-gray-400">Loading usage data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-red-400">
                    Error loading usage data: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-gray-900 rounded-lg">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">AI Usage Report</h2>
                    <p className="text-sm text-gray-400">
                        {mapName ? `For: ${mapName}` : `Map ID: ${mapId.slice(0, 8)}...`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={loadData}>
                        Refresh
                    </Button>
                    {onClose && (
                        <Button variant="secondary" size="sm" onClick={onClose}>
                            Close
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
                    <div className="text-xs text-blue-300 uppercase font-medium">Total Cost</div>
                    <div className="text-2xl font-bold text-white mt-1">{formatCost(summary.totalCost)}</div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
                    <div className="text-xs text-green-300 uppercase font-medium">API Calls</div>
                    <div className="text-2xl font-bold text-white mt-1">{summary.totalCalls}</div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
                    <div className="text-xs text-purple-300 uppercase font-medium">Total Tokens</div>
                    <div className="text-2xl font-bold text-white mt-1">{formatTokens(summary.totalTokens)}</div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30">
                    <div className="text-xs text-amber-300 uppercase font-medium">Avg Duration</div>
                    <div className="text-2xl font-bold text-white mt-1">{summary.avgDurationMs}ms</div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30">
                    <div className="text-xs text-emerald-300 uppercase font-medium">Success Rate</div>
                    <div className="text-2xl font-bold text-white mt-1">{(100 - summary.errorRate).toFixed(1)}%</div>
                </Card>
            </div>

            {/* View Tabs */}
            <div className="flex gap-2 border-b border-gray-700 pb-2">
                {(['summary', 'operations', 'details'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setView(tab)}
                        className={`px-4 py-2 text-sm rounded-t transition-colors ${
                            view === tab
                                ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Content */}
            {view === 'summary' && (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* By Category */}
                    <Card className="p-4">
                        <h3 className="text-sm font-medium text-gray-300 mb-4">Cost by Category</h3>
                        <div className="space-y-3">
                            {Object.entries(operationCategories)
                                .filter(([, stats]) => stats.calls > 0)
                                .sort((a, b) => b[1].cost - a[1].cost)
                                .map(([category, stats]) => (
                                    <div key={category} className="flex justify-between items-center">
                                        <div>
                                            <div className="text-white font-medium">{category}</div>
                                            <div className="text-xs text-gray-500">{stats.calls} calls</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-green-400 font-mono">{formatCost(stats.cost)}</div>
                                            <div className="text-xs text-gray-500">{formatTokens(stats.tokens)} tok</div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </Card>

                    {/* By Provider */}
                    <Card className="p-4">
                        <h3 className="text-sm font-medium text-gray-300 mb-4">Cost by Provider</h3>
                        <div className="space-y-3">
                            {Object.entries(summary.byProvider)
                                .sort((a, b) => b[1].cost - a[1].cost)
                                .map(([provider, stats]) => {
                                    const percentage = summary.totalCost > 0
                                        ? ((stats.cost / summary.totalCost) * 100).toFixed(1)
                                        : '0';
                                    return (
                                        <div key={provider}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-white capitalize">{provider}</span>
                                                <span className="text-green-400 font-mono">{formatCost(stats.cost)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-500 w-12">{percentage}%</span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {stats.calls} calls, {formatTokens(stats.tokens)} tokens
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </Card>
                </div>
            )}

            {view === 'operations' && (
                <Card className="p-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-4">All Operations</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-400 border-b border-gray-700">
                                    <th className="pb-2 pr-4">Operation</th>
                                    <th className="pb-2 pr-4 text-right">Calls</th>
                                    <th className="pb-2 pr-4 text-right">Tokens</th>
                                    <th className="pb-2 text-right">Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {Object.entries(summary.byOperation)
                                    .sort((a, b) => b[1].cost - a[1].cost)
                                    .map(([operation, stats]) => (
                                        <tr key={operation} className="hover:bg-gray-800/50">
                                            <td className="py-2 pr-4 text-white">{operation}</td>
                                            <td className="py-2 pr-4 text-right text-gray-400">{stats.calls}</td>
                                            <td className="py-2 pr-4 text-right text-gray-400">{formatTokens(stats.tokens)}</td>
                                            <td className="py-2 text-right text-green-400 font-mono">{formatCost(stats.cost)}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {view === 'details' && (
                <Card className="p-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-4">Recent API Calls ({logs.length})</h3>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-800">
                                <tr className="text-left text-gray-400 border-b border-gray-700">
                                    <th className="pb-2 pr-4">Time</th>
                                    <th className="pb-2 pr-4">Provider</th>
                                    <th className="pb-2 pr-4">Operation</th>
                                    <th className="pb-2 pr-4 text-right">In/Out</th>
                                    <th className="pb-2 text-right">Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {logs.slice(0, 100).map((log) => {
                                    const date = new Date(log.created_at);
                                    const timeStr = !isNaN(date.getTime())
                                        ? date.toLocaleString()
                                        : 'Invalid';
                                    return (
                                        <tr key={log.id} className={`hover:bg-gray-800/50 ${!log.success ? 'bg-red-500/10' : ''}`}>
                                            <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">{timeStr}</td>
                                            <td className="py-2 pr-4 text-white capitalize">{log.provider}</td>
                                            <td className="py-2 pr-4 text-gray-300">{log.operation || 'unknown'}</td>
                                            <td className="py-2 pr-4 text-right text-gray-400 font-mono text-xs">
                                                {log.tokens_in || 0} / {log.tokens_out || 0}
                                            </td>
                                            <td className="py-2 text-right text-green-400 font-mono">
                                                {formatCost(log.cost_usd || 0)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* No data state */}
            {logs.length === 0 && !isLoading && (
                <div className="text-center py-12 text-gray-400">
                    <p>No usage data found for this topical map.</p>
                    <p className="text-sm mt-2">Data will appear here as you use AI features.</p>
                </div>
            )}
        </div>
    );
};

export default MapUsageReport;
