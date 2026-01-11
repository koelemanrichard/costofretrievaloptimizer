/**
 * API Call Logger Service
 *
 * Universal wrapper for logging all API calls including:
 * - AI providers (Gemini, Anthropic, OpenAI, Perplexity, OpenRouter)
 * - Scrapers (Jina, Firecrawl)
 * - External APIs (SERP, Wikidata)
 * - Database operations (Supabase)
 *
 * @module services/apiCallLogger
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSessionId } from './consoleLogger';

import { Database } from '../database.types';

// Logging client disabled - creating separate Supabase clients causes
// "Multiple GoTrueClient instances" warnings and RLS failures since the
// logging client doesn't share auth with the main app client.
// This is optional telemetry, so we disable it to avoid console noise.
function getLoggingClient(): SupabaseClient<Database> | null {
  return null;
}

// =============================================================================
// Types
// =============================================================================

export type ApiCategory =
  | 'AI_PROVIDER'
  | 'SCRAPER'
  | 'SERP'
  | 'ENTITY'
  | 'DATABASE'
  | 'OTHER';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type ApiCallStatus = 'pending' | 'success' | 'error';

export interface ApiCallMetadata {
  requestSize?: number;
  responseSize?: number;
  tokenCount?: number;
  inputTokens?: number;
  outputTokens?: number;
  retryCount?: number;
  errorType?: string;
  errorMessage?: string;
  statusCode?: number;
  model?: string;
  url?: string;
}

export interface ApiCallLog {
  id: string;
  sessionId: string;
  jobId?: string;
  category: ApiCategory;
  provider: string;
  endpoint: string;
  method: HttpMethod;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: ApiCallStatus;
  metadata: ApiCallMetadata;
}

interface ApiCallLogRecord {
  session_id: string;
  job_id?: string;
  category: string;
  provider: string;
  endpoint: string;
  method: string;
  duration_ms?: number;
  status: string;
  status_code?: number;
  request_size?: number;
  response_size?: number;
  token_count?: number;
  retry_count?: number;
  error_type?: string;
  error_message?: string;
}

// =============================================================================
// Context Management
// =============================================================================

let currentJobId: string | undefined;

/**
 * Set the current job ID for API call logging
 */
export function setCurrentJobId(jobId: string | undefined): void {
  currentJobId = jobId;
}

/**
 * Get the current job ID
 */
export function getCurrentJobId(): string | undefined {
  return currentJobId;
}

// =============================================================================
// In-Flight Call Tracking
// =============================================================================

const inFlightCalls: Map<string, ApiCallLog> = new Map();

function generateCallId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================================================
// Log Buffer & Batching
// =============================================================================

const logBuffer: ApiCallLogRecord[] = [];
const BUFFER_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isEnabled = true;

/**
 * Enable or disable API call logging
 */
export function setEnabled(enabled: boolean): void {
  isEnabled = enabled;
}

/**
 * Flush buffered logs to database
 */
async function flushLogs(): Promise<void> {
  if (logBuffer.length === 0) return;

  const client = getLoggingClient();
  if (!client) {
    // No client available - keep logs in buffer for later
    return;
  }

  const logsToFlush = [...logBuffer];
  logBuffer.length = 0;

  try {
    // Note: This code is never reached (client is always null), cast to any for type safety
    const { error } = await client
      .from('api_call_logs')
      .insert(logsToFlush as any);

    if (error) {
      console.error('[ApiCallLogger] Failed to flush logs:', error.message);
    }
  } catch (err) {
    console.error('[ApiCallLogger] Failed to flush logs:', err);
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;

  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushLogs();
  }, FLUSH_INTERVAL);
}

function addToBuffer(record: ApiCallLogRecord): void {
  logBuffer.push(record);

  if (logBuffer.length >= BUFFER_SIZE) {
    flushLogs();
  } else {
    scheduleFlush();
  }
}

// =============================================================================
// Core Logging Functions
// =============================================================================

/**
 * Start tracking an API call
 */
export function startCall(
  category: ApiCategory,
  provider: string,
  endpoint: string,
  method: HttpMethod = 'POST'
): ApiCallLog {
  const id = generateCallId();

  const call: ApiCallLog = {
    id,
    sessionId: getSessionId(),
    jobId: currentJobId,
    category,
    provider,
    endpoint,
    method,
    startTime: Date.now(),
    status: 'pending',
    metadata: {},
  };

  if (isEnabled) {
    inFlightCalls.set(id, call);
  }

  return call;
}

/**
 * Mark a call as successful and log it
 */
export function successCall(
  callId: string,
  metadata?: Partial<ApiCallMetadata>
): void {
  if (!isEnabled) return;

  const call = inFlightCalls.get(callId);
  if (!call) {
    console.warn(`[ApiCallLogger] Call ${callId} not found`);
    return;
  }

  call.endTime = Date.now();
  call.duration = call.endTime - call.startTime;
  call.status = 'success';
  call.metadata = { ...call.metadata, ...metadata };

  inFlightCalls.delete(callId);
  persistCall(call);
}

/**
 * Mark a call as failed and log it
 */
export function errorCall(
  callId: string,
  error: unknown,
  metadata?: Partial<ApiCallMetadata>
): void {
  if (!isEnabled) return;

  const call = inFlightCalls.get(callId);
  if (!call) {
    console.warn(`[ApiCallLogger] Call ${callId} not found`);
    return;
  }

  call.endTime = Date.now();
  call.duration = call.endTime - call.startTime;
  call.status = 'error';

  // Extract error info
  let errorType = 'UNKNOWN';
  let errorMessage = 'Unknown error';

  if (error instanceof Error) {
    errorMessage = error.message;
    errorType = categorizeApiError(error.message);
  } else if (typeof error === 'string') {
    errorMessage = error;
    errorType = categorizeApiError(error);
  } else if (typeof error === 'object' && error !== null) {
    const err = error as { message?: string; status?: number; code?: string };
    errorMessage = err.message || JSON.stringify(error);
    errorType = err.code || categorizeApiError(errorMessage);
    if (err.status) {
      call.metadata.statusCode = err.status;
    }
  }

  call.metadata = {
    ...call.metadata,
    ...metadata,
    errorType,
    errorMessage: errorMessage.substring(0, 500),
  };

  inFlightCalls.delete(callId);
  persistCall(call);
}

/**
 * Categorize an API error
 */
function categorizeApiError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('quota')) {
    return 'RATE_LIMIT';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'TIMEOUT';
  }
  if (lower.includes('unauthorized') || lower.includes('401') || lower.includes('forbidden') || lower.includes('403')) {
    return 'AUTH';
  }
  if (lower.includes('not found') || lower.includes('404')) {
    return 'NOT_FOUND';
  }
  if (lower.includes('parse') || lower.includes('json') || lower.includes('syntax')) {
    return 'PARSE';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('connection')) {
    return 'NETWORK';
  }
  if (lower.includes('context') || lower.includes('token') || lower.includes('too long')) {
    return 'CONTEXT_LENGTH';
  }
  if (lower.includes('server') || lower.includes('500') || lower.includes('502') || lower.includes('503')) {
    return 'SERVER';
  }

  return 'UNKNOWN';
}

/**
 * Persist a completed call to the database
 */
function persistCall(call: ApiCallLog): void {
  const record: ApiCallLogRecord = {
    session_id: call.sessionId,
    job_id: call.jobId,
    category: call.category,
    provider: call.provider,
    endpoint: call.endpoint,
    method: call.method,
    duration_ms: call.duration,
    status: call.status,
    status_code: call.metadata.statusCode,
    request_size: call.metadata.requestSize,
    response_size: call.metadata.responseSize,
    token_count: call.metadata.tokenCount || call.metadata.inputTokens,
    retry_count: call.metadata.retryCount,
    error_type: call.metadata.errorType,
    error_message: call.metadata.errorMessage,
  };

  addToBuffer(record);
}

// =============================================================================
// Convenience Wrapper
// =============================================================================

/**
 * Wrap an async function with API call logging
 *
 * @example
 * const result = await loggedApiCall(
 *   'AI_PROVIDER',
 *   'gemini',
 *   'generateContent',
 *   async () => {
 *     return await gemini.generateContent(prompt);
 *   }
 * );
 */
export async function loggedApiCall<T>(
  category: ApiCategory,
  provider: string,
  endpoint: string,
  fn: () => Promise<T>,
  options?: {
    method?: HttpMethod;
    requestSize?: number;
    retryCount?: number;
  }
): Promise<T> {
  const call = startCall(category, provider, endpoint, options?.method || 'POST');

  if (options?.requestSize) {
    call.metadata.requestSize = options.requestSize;
  }
  if (options?.retryCount) {
    call.metadata.retryCount = options.retryCount;
  }

  try {
    const result = await fn();

    // Try to estimate response size
    let responseSize: number | undefined;
    try {
      responseSize = JSON.stringify(result).length;
    } catch {
      // Ignore if we can't stringify
    }

    successCall(call.id, { responseSize });
    return result;
  } catch (error) {
    errorCall(call.id, error);
    throw error;
  }
}

/**
 * Create a logger instance for a specific provider
 */
export function createProviderLogger(category: ApiCategory, provider: string) {
  return {
    start: (endpoint: string, method: HttpMethod = 'POST') =>
      startCall(category, provider, endpoint, method),
    success: successCall,
    error: errorCall,
    wrap: <T>(endpoint: string, fn: () => Promise<T>, options?: { method?: HttpMethod; requestSize?: number; retryCount?: number }) =>
      loggedApiCall(category, provider, endpoint, fn, options),
  };
}

// =============================================================================
// Pre-built Provider Loggers
// =============================================================================

export const geminiLogger = createProviderLogger('AI_PROVIDER', 'gemini');
export const anthropicLogger = createProviderLogger('AI_PROVIDER', 'anthropic');
export const openAiLogger = createProviderLogger('AI_PROVIDER', 'openai');
export const perplexityLogger = createProviderLogger('AI_PROVIDER', 'perplexity');
export const openRouterLogger = createProviderLogger('AI_PROVIDER', 'openrouter');

export const jinaLogger = createProviderLogger('SCRAPER', 'jina');
export const firecrawlLogger = createProviderLogger('SCRAPER', 'firecrawl');
export const directFetchLogger = createProviderLogger('SCRAPER', 'direct');

export const serpLogger = createProviderLogger('SERP', 'serp');
export const wikidataLogger = createProviderLogger('ENTITY', 'wikidata');
export const supabaseLogger = createProviderLogger('DATABASE', 'supabase');

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Force flush all pending logs
 */
export function flush(): Promise<void> {
  return flushLogs();
}

/**
 * Get statistics about in-flight calls
 */
export function getInFlightStats(): { count: number; oldestAge: number } {
  const now = Date.now();
  let oldestAge = 0;

  inFlightCalls.forEach(call => {
    const age = now - call.startTime;
    if (age > oldestAge) {
      oldestAge = age;
    }
  });

  return {
    count: inFlightCalls.size,
    oldestAge,
  };
}

/**
 * Cancel tracking of an in-flight call (e.g., if request was cancelled)
 */
export function cancelCall(callId: string): void {
  inFlightCalls.delete(callId);
}

// =============================================================================
// Export
// =============================================================================

export const apiCallLogger = {
  startCall,
  successCall,
  errorCall,
  loggedApiCall,
  createProviderLogger,
  setEnabled,
  setCurrentJobId,
  getCurrentJobId,
  flush,
  getInFlightStats,
  cancelCall,
  // Pre-built loggers
  gemini: geminiLogger,
  anthropic: anthropicLogger,
  openAi: openAiLogger,
  perplexity: perplexityLogger,
  openRouter: openRouterLogger,
  jina: jinaLogger,
  firecrawl: firecrawlLogger,
  directFetch: directFetchLogger,
  serp: serpLogger,
  wikidata: wikidataLogger,
  supabase: supabaseLogger,
};

export default apiCallLogger;
