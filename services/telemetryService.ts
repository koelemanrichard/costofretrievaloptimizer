import { TelemetryLog } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseClient } from '@supabase/supabase-js';

// Cost estimation per 1k tokens (USD)
const COST_TABLE: Record<string, { in: number; out: number }> = {
    // OpenAI
    'gpt-4o': { in: 0.005, out: 0.015 },
    'gpt-4o-mini': { in: 0.00015, out: 0.0006 },
    'gpt-4-turbo': { in: 0.01, out: 0.03 },
    // Gemini
    'gemini-1.5-flash': { in: 0.000075, out: 0.0003 },
    'gemini-1.5-pro': { in: 0.0035, out: 0.0105 },
    'gemini-2.0-flash': { in: 0.0001, out: 0.0004 },
    'gemini-2.0-flash-exp': { in: 0.0001, out: 0.0004 },
    'gemini-2.5-flash': { in: 0.00015, out: 0.0006 },
    'gemini-exp-1206': { in: 0.0001, out: 0.0004 },
    // Anthropic
    'claude-3-5-sonnet': { in: 0.003, out: 0.015 },
    'claude-3-5-sonnet-20241022': { in: 0.003, out: 0.015 },
    'claude-3-haiku': { in: 0.00025, out: 0.00125 },
    'claude-3-opus': { in: 0.015, out: 0.075 },
    // Perplexity
    'llama-3.1-sonar-small-128k-online': { in: 0.0002, out: 0.0002 },
    'llama-3.1-sonar-large-128k-online': { in: 0.001, out: 0.001 },
    // Default fallback
    'default': { in: 0.001, out: 0.002 }
};

const STORAGE_KEY = 'app_telemetry_logs';
const PENDING_LOGS_KEY = 'app_telemetry_pending';

// Context for AI usage logging
export interface AIUsageContext {
    userId?: string;
    projectId?: string;
    mapId?: string;
    topicId?: string;
    briefId?: string;
    jobId?: string;
}

// Global usage context - this is the single source of truth for all providers
let globalUsageContext: AIUsageContext = {};

/**
 * Get the current global usage context
 */
export function getGlobalUsageContext(): AIUsageContext {
    return { ...globalUsageContext };
}

/**
 * Set the global usage context for all AI providers
 * Should be called when user authenticates or project/map context changes
 */
export function setGlobalUsageContext(context: Partial<AIUsageContext>): void {
    globalUsageContext = { ...globalUsageContext, ...context };
}

/**
 * Clear the global usage context (e.g., on logout)
 */
export function clearGlobalUsageContext(): void {
    globalUsageContext = {};
}

// Parameters for logging AI usage
export interface AIUsageLogParams {
    provider: string;
    model: string;
    operation: string;
    operationDetail?: string;
    tokensIn: number;
    tokensOut: number;
    durationMs?: number;
    success?: boolean;
    errorMessage?: string;
    errorCode?: string;
    requestSizeBytes?: number;
    responseSizeBytes?: number;
    context?: AIUsageContext;
}

// Estimate tokens from character count (4 chars ~= 1 token)
export function estimateTokens(charCount: number): number {
    return Math.ceil(charCount / 4);
}

// Calculate cost from tokens
export function calculateCost(model: string, tokensIn: number, tokensOut: number): number {
    const rates = COST_TABLE[model] || COST_TABLE['default'];
    return (tokensIn / 1000 * rates.in) + (tokensOut / 1000 * rates.out);
}

// Log AI usage to both localStorage (offline cache) and database
export async function logAiUsage(
    params: AIUsageLogParams,
    supabase?: SupabaseClient
): Promise<void> {
    const {
        provider,
        model,
        operation,
        operationDetail,
        tokensIn,
        tokensOut,
        durationMs,
        success = true,
        errorMessage,
        errorCode,
        requestSizeBytes,
        responseSizeBytes,
        context = {}
    } = params;

    // Merge global context with provided context (provided takes precedence)
    const mergedContext = { ...globalUsageContext, ...context };

    const costUsd = calculateCost(model, tokensIn, tokensOut);

    const logEntry = {
        id: uuidv4(),
        user_id: mergedContext.userId,
        project_id: mergedContext.projectId,
        map_id: mergedContext.mapId,
        topic_id: mergedContext.topicId,
        brief_id: mergedContext.briefId,
        job_id: mergedContext.jobId,
        provider,
        model,
        operation,
        operation_detail: operationDetail,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        cost_usd: parseFloat(costUsd.toFixed(6)),
        duration_ms: durationMs,
        request_size_bytes: requestSizeBytes,
        response_size_bytes: responseSizeBytes,
        success,
        error_message: errorMessage,
        error_code: errorCode,
        created_at: new Date().toISOString()
    };

    // Always save to localStorage as backup
    saveToLocalStorage(logEntry);

    // If supabase client provided, save to database
    if (supabase && mergedContext.userId) {
        try {
            const { error } = await supabase
                .from('ai_usage_logs')
                .insert(logEntry);

            if (error) {
                console.warn('Failed to save usage log to database:', error);
                // Store in pending queue for later sync
                addToPendingQueue(logEntry);
            }
        } catch (e) {
            console.warn('Failed to save usage log to database:', e);
            addToPendingQueue(logEntry);
        }
    } else if (mergedContext.userId) {
        // No supabase client, add to pending queue
        addToPendingQueue(logEntry);
    }
}

// Legacy function for backward compatibility
export const logUsage = (
    provider: string,
    model: string,
    operation: string,
    inputLength: number,
    outputLength: number
) => {
    const tokensIn = estimateTokens(inputLength);
    const tokensOut = estimateTokens(outputLength);

    const rates = COST_TABLE[model] || COST_TABLE['default'];
    const cost = (tokensIn / 1000 * rates.in) + (tokensOut / 1000 * rates.out);

    const logEntry: TelemetryLog = {
        id: uuidv4(),
        timestamp: Date.now(),
        provider,
        model,
        operation,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        cost_est: parseFloat(cost.toFixed(6))
    };

    saveToLocalStorage(logEntry);
};

// Save to localStorage in TelemetryLog format for backward compatibility with System Overview
function saveToLocalStorage(entry: any) {
    try {
        // Convert to TelemetryLog format expected by AdminDashboard's System Overview
        const telemetryEntry = {
            id: entry.id,
            timestamp: entry.created_at ? new Date(entry.created_at).getTime() : Date.now(),
            provider: entry.provider || 'unknown',
            model: entry.model || 'unknown',
            operation: entry.operation || 'unknown',
            tokens_in: entry.tokens_in || 0,
            tokens_out: entry.tokens_out || 0,
            cost_est: entry.cost_usd || 0
        };
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const updated = [telemetryEntry, ...existing].slice(0, 1000);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.warn("Failed to save telemetry to localStorage", e);
    }
}

// Add to pending queue for later database sync
function addToPendingQueue(entry: any) {
    try {
        const pending = JSON.parse(localStorage.getItem(PENDING_LOGS_KEY) || '[]');
        pending.push(entry);
        // Keep last 500 pending entries
        const trimmed = pending.slice(-500);
        localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.warn("Failed to save pending log", e);
    }
}

// Sync pending logs to database
export async function syncPendingLogs(supabase: SupabaseClient): Promise<number> {
    try {
        const pending = JSON.parse(localStorage.getItem(PENDING_LOGS_KEY) || '[]');
        if (pending.length === 0) return 0;

        let synced = 0;
        const stillPending: any[] = [];

        // Process in batches of 50
        for (let i = 0; i < pending.length; i += 50) {
            const batch = pending.slice(i, i + 50);
            const { error } = await supabase
                .from('ai_usage_logs')
                .insert(batch);

            if (error) {
                // Keep failed entries in pending queue
                stillPending.push(...batch);
            } else {
                synced += batch.length;
            }
        }

        // Update pending queue
        localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(stillPending));
        return synced;
    } catch (e) {
        console.warn("Failed to sync pending logs", e);
        return 0;
    }
}

// Get pending log count
export function getPendingLogCount(): number {
    try {
        const pending = JSON.parse(localStorage.getItem(PENDING_LOGS_KEY) || '[]');
        return pending.length;
    } catch {
        return 0;
    }
}

export const getTelemetryLogs = (): TelemetryLog[] => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
};

export const clearTelemetryLogs = () => {
    localStorage.removeItem(STORAGE_KEY);
};

// Fetch usage stats from database
export async function fetchUsageStats(
    supabase: SupabaseClient,
    options: {
        userId?: string;
        mapId?: string;
        projectId?: string;
        startDate?: Date;
        endDate?: Date;
        groupBy?: 'provider' | 'model' | 'operation' | 'day';
    } = {}
): Promise<any[]> {
    const { userId, mapId, projectId, startDate, endDate } = options;

    let query = supabase
        .from('ai_usage_logs')
        .select('*');

    if (userId) query = query.eq('user_id', userId);
    if (mapId) query = query.eq('map_id', mapId);
    if (projectId) query = query.eq('project_id', projectId);
    if (startDate) query = query.gte('created_at', startDate.toISOString());
    if (endDate) query = query.lte('created_at', endDate.toISOString());

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

// Get aggregated usage summary
export async function fetchUsageSummary(
    supabase: SupabaseClient,
    userId: string,
    days: number = 30
): Promise<{
    byProvider: Record<string, { calls: number; cost: number; tokens: number }>;
    byOperation: Record<string, { calls: number; cost: number; tokens: number }>;
    totalCost: number;
    totalCalls: number;
    totalTokens: number;
    errorRate: number;
}> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
        .from('ai_usage_logs')
        .select('provider, model, operation, tokens_in, tokens_out, cost_usd, success')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const byProvider: Record<string, { calls: number; cost: number; tokens: number }> = {};
    const byOperation: Record<string, { calls: number; cost: number; tokens: number }> = {};
    let totalCost = 0;
    let totalCalls = 0;
    let totalTokens = 0;
    let errorCount = 0;

    for (const row of data || []) {
        const tokens = (row.tokens_in || 0) + (row.tokens_out || 0);
        const cost = row.cost_usd || 0;

        // By provider
        if (!byProvider[row.provider]) {
            byProvider[row.provider] = { calls: 0, cost: 0, tokens: 0 };
        }
        byProvider[row.provider].calls++;
        byProvider[row.provider].cost += cost;
        byProvider[row.provider].tokens += tokens;

        // By operation
        if (!byOperation[row.operation]) {
            byOperation[row.operation] = { calls: 0, cost: 0, tokens: 0 };
        }
        byOperation[row.operation].calls++;
        byOperation[row.operation].cost += cost;
        byOperation[row.operation].tokens += tokens;

        totalCost += cost;
        totalCalls++;
        totalTokens += tokens;
        if (!row.success) errorCount++;
    }

    return {
        byProvider,
        byOperation,
        totalCost,
        totalCalls,
        totalTokens,
        errorRate: totalCalls > 0 ? (errorCount / totalCalls) * 100 : 0
    };
}
