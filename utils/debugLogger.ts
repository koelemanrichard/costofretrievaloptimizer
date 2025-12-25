// utils/debugLogger.ts
// Centralized debug logging utility that respects the verboseLogging admin setting

/**
 * Debug logger that only logs when verbose logging is enabled.
 * This keeps the console clean in production while allowing detailed
 * debugging when needed.
 */

// Global verbose logging state - set by the app when businessInfo loads
let verboseLoggingEnabled = false;

/**
 * Set the verbose logging state (called from App.tsx when settings load)
 */
export function setVerboseLogging(enabled: boolean): void {
  verboseLoggingEnabled = enabled;
}

/**
 * Check if verbose logging is enabled
 */
export function isVerboseLoggingEnabled(): boolean {
  return verboseLoggingEnabled;
}

/**
 * Log a debug message (only when verbose logging is enabled)
 */
export function debugLog(prefix: string, message: string, ...args: unknown[]): void {
  if (verboseLoggingEnabled) {
    console.log(`[${prefix}] ${message}`, ...args);
  }
}

/**
 * Log a debug warning (only when verbose logging is enabled)
 */
export function debugWarn(prefix: string, message: string, ...args: unknown[]): void {
  if (verboseLoggingEnabled) {
    console.warn(`[${prefix}] ${message}`, ...args);
  }
}

/**
 * Log an error (always logs - errors should always be visible)
 */
export function debugError(prefix: string, message: string, ...args: unknown[]): void {
  console.error(`[${prefix}] ${message}`, ...args);
}

/**
 * Create a namespaced logger for a specific module
 */
export function createLogger(prefix: string) {
  return {
    log: (message: string, ...args: unknown[]) => debugLog(prefix, message, ...args),
    warn: (message: string, ...args: unknown[]) => debugWarn(prefix, message, ...args),
    error: (message: string, ...args: unknown[]) => debugError(prefix, message, ...args),
    /** Always log regardless of verbose setting (for critical info) */
    info: (message: string, ...args: unknown[]) => console.log(`[${prefix}] ${message}`, ...args),
  };
}
