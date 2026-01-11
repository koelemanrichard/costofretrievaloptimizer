/**
 * Console Logger Service
 *
 * Captures console.error, console.warn, and uncaught exceptions for analysis.
 * Provides context enrichment and batched persistence to database.
 *
 * @module services/consoleLogger
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface ConsoleEvent {
  id: string;
  sessionId: string;
  level: LogLevel;
  message: string;
  stack?: string;
  timestamp: number;
  context: ConsoleEventContext;
}

export interface ConsoleEventContext {
  component?: string;
  operation?: string;
  passNumber?: number;
  jobId?: string;
  url?: string;
  provider?: string;
  userId?: string;
  errorType?: string;
}

interface ConsoleLogRecord {
  session_id: string;
  job_id?: string;
  level: string;
  message: string;
  stack?: string;
  context: ConsoleEventContext;
}

// =============================================================================
// Context Management
// =============================================================================

let currentContext: ConsoleEventContext = {};
let sessionId: string = generateSessionId();

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Set global context that will be attached to all log events
 */
export function setLogContext(context: Partial<ConsoleEventContext>): void {
  currentContext = { ...currentContext, ...context };
}

/**
 * Clear specific context keys
 */
export function clearLogContext(keys?: (keyof ConsoleEventContext)[]): void {
  if (keys) {
    keys.forEach(key => delete currentContext[key]);
  } else {
    currentContext = {};
  }
}

/**
 * Get current session ID
 */
export function getSessionId(): string {
  return sessionId;
}

/**
 * Start a new session (e.g., on page refresh)
 */
export function newSession(): void {
  sessionId = generateSessionId();
}

// =============================================================================
// Log Buffer & Batching
// =============================================================================

const logBuffer: ConsoleLogRecord[] = [];
const BUFFER_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isEnabled = true;

/**
 * Enable or disable console logging
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
      .from('console_logs')
      .insert(logsToFlush as any);

    if (error) {
      // Don't use console.error here to avoid infinite loop
      // Instead, log to original console
      originalConsole.error('[ConsoleLogger] Failed to flush logs:', error.message);
    }
  } catch (err) {
    originalConsole.error('[ConsoleLogger] Failed to flush logs:', err);
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;

  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushLogs();
  }, FLUSH_INTERVAL);
}

function addToBuffer(record: ConsoleLogRecord): void {
  logBuffer.push(record);

  if (logBuffer.length >= BUFFER_SIZE) {
    flushLogs();
  } else {
    scheduleFlush();
  }
}

// =============================================================================
// Error Categorization
// =============================================================================

export type ErrorCategory =
  | 'AI_PROVIDER'
  | 'DATABASE'
  | 'NETWORK'
  | 'VALIDATION'
  | 'REACT'
  | 'PARSE'
  | 'UNKNOWN';

/**
 * Categorize an error by its message/stack
 */
export function categorizeError(message: string, stack?: string): ErrorCategory {
  const combined = `${message} ${stack || ''}`.toLowerCase();

  // AI Provider errors
  if (
    combined.includes('rate limit') ||
    combined.includes('429') ||
    combined.includes('quota exceeded') ||
    combined.includes('gemini') ||
    combined.includes('anthropic') ||
    combined.includes('openai') ||
    combined.includes('perplexity') ||
    combined.includes('openrouter') ||
    combined.includes('context too long') ||
    combined.includes('token')
  ) {
    return 'AI_PROVIDER';
  }

  // Database errors
  if (
    combined.includes('supabase') ||
    combined.includes('postgres') ||
    combined.includes('rls') ||
    combined.includes('permission denied') ||
    combined.includes('violates row-level security') ||
    combined.includes('foreign key') ||
    combined.includes('unique constraint')
  ) {
    return 'DATABASE';
  }

  // Network errors
  if (
    combined.includes('fetch') ||
    combined.includes('cors') ||
    combined.includes('network') ||
    combined.includes('timeout') ||
    combined.includes('econnrefused') ||
    combined.includes('failed to fetch') ||
    combined.includes('connection refused')
  ) {
    return 'NETWORK';
  }

  // Validation errors
  if (
    combined.includes('validation') ||
    combined.includes('required') ||
    combined.includes('missing') ||
    combined.includes('invalid') ||
    combined.includes('expected')
  ) {
    return 'VALIDATION';
  }

  // React errors
  if (
    combined.includes('react') ||
    combined.includes('render') ||
    combined.includes('component') ||
    combined.includes('hook') ||
    combined.includes('usestate') ||
    combined.includes('useeffect')
  ) {
    return 'REACT';
  }

  // Parse errors
  if (
    combined.includes('json') ||
    combined.includes('parse') ||
    combined.includes('syntax') ||
    combined.includes('unexpected token')
  ) {
    return 'PARSE';
  }

  return 'UNKNOWN';
}

// =============================================================================
// Capture Functions
// =============================================================================

/**
 * Format arguments to a log message string
 */
function formatArgs(args: unknown[]): string {
  return args.map(arg => {
    if (arg instanceof Error) {
      return arg.message;
    }
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
}

/**
 * Extract stack trace from arguments
 */
function extractStack(args: unknown[]): string | undefined {
  for (const arg of args) {
    if (arg instanceof Error && arg.stack) {
      return arg.stack;
    }
  }
  return undefined;
}

/**
 * Capture a console event
 */
function captureEvent(level: LogLevel, args: unknown[]): void {
  if (!isEnabled) return;

  const message = formatArgs(args);
  const stack = extractStack(args);
  const errorType = level === 'error' ? categorizeError(message, stack) : undefined;

  const record: ConsoleLogRecord = {
    session_id: sessionId,
    job_id: currentContext.jobId,
    level,
    message: message.substring(0, 5000), // Limit message length
    stack: stack?.substring(0, 10000), // Limit stack length
    context: {
      ...currentContext,
      errorType,
    },
  };

  addToBuffer(record);
}

/**
 * Capture an uncaught error
 */
export function captureUncaughtError(error: {
  message: string | Event;
  source?: string;
  lineno?: number;
  colno?: number;
  error?: Error;
}): void {
  if (!isEnabled) return;

  const message = typeof error.message === 'string'
    ? error.message
    : 'Unknown error';
  const stack = error.error?.stack;
  const errorType = categorizeError(message, stack);

  const record: ConsoleLogRecord = {
    session_id: sessionId,
    job_id: currentContext.jobId,
    level: 'error',
    message: `[Uncaught] ${message}`.substring(0, 5000),
    stack: stack?.substring(0, 10000),
    context: {
      ...currentContext,
      errorType,
      url: error.source,
    },
  };

  addToBuffer(record);
  // Flush immediately for uncaught errors
  flushLogs();
}

/**
 * Capture an unhandled promise rejection
 */
export function capturePromiseRejection(reason: unknown): void {
  if (!isEnabled) return;

  let message: string;
  let stack: string | undefined;

  if (reason instanceof Error) {
    message = reason.message;
    stack = reason.stack;
  } else if (typeof reason === 'string') {
    message = reason;
  } else {
    try {
      message = JSON.stringify(reason);
    } catch {
      message = String(reason);
    }
  }

  const errorType = categorizeError(message, stack);

  const record: ConsoleLogRecord = {
    session_id: sessionId,
    job_id: currentContext.jobId,
    level: 'error',
    message: `[UnhandledRejection] ${message}`.substring(0, 5000),
    stack: stack?.substring(0, 10000),
    context: {
      ...currentContext,
      errorType,
    },
  };

  addToBuffer(record);
  // Flush immediately for unhandled rejections
  flushLogs();
}

// =============================================================================
// Console Interception
// =============================================================================

const originalConsole = {
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
  log: console.log.bind(console),
};

let isInstalled = false;

/**
 * Install console interceptors
 */
export function install(): void {
  if (isInstalled) return;

  // Intercept console.error
  console.error = (...args: unknown[]) => {
    captureEvent('error', args);
    originalConsole.error(...args);
  };

  // Intercept console.warn
  console.warn = (...args: unknown[]) => {
    captureEvent('warn', args);
    originalConsole.warn(...args);
  };

  // Optionally intercept info (disabled by default to reduce noise)
  // console.info = (...args: unknown[]) => {
  //   captureEvent('info', args);
  //   originalConsole.info(...args);
  // };

  // Install global error handlers
  if (typeof window !== 'undefined') {
    window.onerror = (message, source, lineno, colno, error) => {
      captureUncaughtError({ message, source, lineno, colno, error });
      return false; // Let the error propagate
    };

    window.addEventListener('unhandledrejection', (event) => {
      capturePromiseRejection(event.reason);
    });
  }

  isInstalled = true;
  originalConsole.log('[ConsoleLogger] Installed');
}

/**
 * Uninstall console interceptors (restore original console)
 */
export function uninstall(): void {
  if (!isInstalled) return;

  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;

  isInstalled = false;
  flushLogs(); // Flush any remaining logs
}

/**
 * Force flush all pending logs
 */
export function flush(): Promise<void> {
  return flushLogs();
}

// =============================================================================
// Manual Logging Functions
// =============================================================================

/**
 * Log an error with context (bypasses console interception)
 */
export function logError(message: string, context?: Partial<ConsoleEventContext>): void {
  const record: ConsoleLogRecord = {
    session_id: sessionId,
    job_id: context?.jobId || currentContext.jobId,
    level: 'error',
    message: message.substring(0, 5000),
    context: { ...currentContext, ...context },
  };
  addToBuffer(record);
}

/**
 * Log a warning with context (bypasses console interception)
 */
export function logWarn(message: string, context?: Partial<ConsoleEventContext>): void {
  const record: ConsoleLogRecord = {
    session_id: sessionId,
    job_id: context?.jobId || currentContext.jobId,
    level: 'warn',
    message: message.substring(0, 5000),
    context: { ...currentContext, ...context },
  };
  addToBuffer(record);
}

/**
 * Log info with context (bypasses console interception)
 */
export function logInfo(message: string, context?: Partial<ConsoleEventContext>): void {
  const record: ConsoleLogRecord = {
    session_id: sessionId,
    job_id: context?.jobId || currentContext.jobId,
    level: 'info',
    message: message.substring(0, 5000),
    context: { ...currentContext, ...context },
  };
  addToBuffer(record);
}

// =============================================================================
// Export
// =============================================================================

export const consoleLogger = {
  install,
  uninstall,
  flush,
  setEnabled,
  setLogContext,
  clearLogContext,
  getSessionId,
  newSession,
  captureUncaughtError,
  capturePromiseRejection,
  categorizeError,
  logError,
  logWarn,
  logInfo,
};

export default consoleLogger;
