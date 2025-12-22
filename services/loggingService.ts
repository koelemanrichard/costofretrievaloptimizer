/**
 * Centralized Logging Service
 *
 * Provides structured logging with:
 * - Log levels (debug, info, warn, error)
 * - Context tagging for filtering
 * - Production mode suppression
 * - Easy migration to remote logging services
 *
 * Usage:
 *   import { logger } from '../services/loggingService';
 *   logger.info('[BriefGen]', 'Generating brief for topic', { topicId });
 *   logger.debug('[AI]', 'API response', { tokens: 1500 });
 *   logger.error('[DB]', 'Query failed', error);
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  context: string;
  message: string;
  data?: unknown;
}

export interface LoggerConfig {
  /** Minimum level to output (default: 'debug' in dev, 'warn' in prod) */
  minLevel: LogLevel;
  /** Whether to output to console (default: true) */
  consoleOutput: boolean;
  /** Optional callback for remote logging integration */
  remoteHandler?: (entry: LogEntry) => void;
  /** Whether to include timestamps (default: false for cleaner console) */
  includeTimestamp: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Detect production mode
const isProduction = typeof window !== 'undefined' &&
  (window.location.hostname !== 'localhost' &&
   !window.location.hostname.includes('127.0.0.1') &&
   !window.location.hostname.includes('.local'));

// Default configuration
const defaultConfig: LoggerConfig = {
  minLevel: isProduction ? 'warn' : 'debug',
  consoleOutput: true,
  includeTimestamp: false,
};

let currentConfig: LoggerConfig = { ...defaultConfig };

/**
 * Configure the logger
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Get current logger configuration
 */
export function getLoggerConfig(): LoggerConfig {
  return { ...currentConfig };
}

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentConfig.minLevel];
}

/**
 * Format a log entry for console output
 */
function formatForConsole(context: string, message: string, data?: unknown): string[] {
  const parts: string[] = [];

  if (currentConfig.includeTimestamp) {
    parts.push(`[${new Date().toISOString()}]`);
  }

  if (context) {
    parts.push(context);
  }

  parts.push(message);

  if (data !== undefined) {
    return [...parts, data as string];
  }

  return parts;
}

/**
 * Create a log entry object
 */
function createLogEntry(level: LogLevel, context: string, message: string, data?: unknown): LogEntry {
  return {
    level,
    timestamp: new Date().toISOString(),
    context,
    message,
    data,
  };
}

/**
 * Core logging function
 */
function log(level: LogLevel, context: string, message: string, data?: unknown): void {
  if (!shouldLog(level)) return;

  const entry = createLogEntry(level, context, message, data);

  // Console output
  if (currentConfig.consoleOutput) {
    const formatted = formatForConsole(context, message, data);
    const consoleFn = level === 'error' ? console.error :
                      level === 'warn' ? console.warn :
                      level === 'debug' ? console.debug :
                      console.log;

    if (data !== undefined) {
      consoleFn(...formatted.slice(0, -1), formatted[formatted.length - 1]);
    } else {
      consoleFn(formatted.join(' '));
    }
  }

  // Remote handler
  if (currentConfig.remoteHandler) {
    try {
      currentConfig.remoteHandler(entry);
    } catch (e) {
      // Silently fail remote logging to avoid disrupting app
    }
  }
}

/**
 * Logger instance with convenience methods
 */
export const logger = {
  /**
   * Debug level - verbose development info
   * Suppressed in production by default
   */
  debug: (context: string, message: string, data?: unknown) =>
    log('debug', context, message, data),

  /**
   * Info level - general operational messages
   * Suppressed in production by default
   */
  info: (context: string, message: string, data?: unknown) =>
    log('info', context, message, data),

  /**
   * Warn level - potential issues that don't break functionality
   * Shown in production
   */
  warn: (context: string, message: string, data?: unknown) =>
    log('warn', context, message, data),

  /**
   * Error level - failures that need attention
   * Always shown
   */
  error: (context: string, message: string, data?: unknown) =>
    log('error', context, message, data),

  /**
   * Configure logger settings
   */
  configure: configureLogger,

  /**
   * Get current configuration
   */
  getConfig: getLoggerConfig,

  /**
   * Check if running in production mode
   */
  isProduction: () => isProduction,
};

// Context-specific logger factories for common use cases
export const createContextLogger = (context: string) => ({
  debug: (message: string, data?: unknown) => logger.debug(context, message, data),
  info: (message: string, data?: unknown) => logger.info(context, message, data),
  warn: (message: string, data?: unknown) => logger.warn(context, message, data),
  error: (message: string, data?: unknown) => logger.error(context, message, data),
});

// Pre-configured loggers for common contexts
export const aiLogger = createContextLogger('[AI]');
export const dbLogger = createContextLogger('[DB]');
export const briefLogger = createContextLogger('[Brief]');
export const auditLogger = createContextLogger('[Audit]');
export const exportLogger = createContextLogger('[Export]');

export default logger;
