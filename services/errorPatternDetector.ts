/**
 * Error Pattern Detector Service
 *
 * Analyzes collected console logs and API call logs to identify
 * recurring error patterns and suggest fixes.
 *
 * @module services/errorPatternDetector
 */

import { SupabaseClient } from '@supabase/supabase-js';
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

export interface ErrorPattern {
  pattern: string;
  description: string;
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  affectedPasses: number[];
  affectedProviders: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedFix?: string;
  category: string;
}

export interface PatternAnalysis {
  patterns: ErrorPattern[];
  summary: {
    totalErrors: number;
    uniquePatterns: number;
    criticalPatterns: number;
    mostAffectedProvider: string | null;
    mostAffectedPass: number | null;
  };
  analyzedAt: Date;
  timeRange: {
    from: Date;
    to: Date;
  };
}

// =============================================================================
// Pattern Detection Rules
// =============================================================================

interface PatternRule {
  id: string;
  pattern: RegExp | string[];
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedFix: string;
  category: string;
}

const PATTERN_RULES: PatternRule[] = [
  {
    id: 'rate_limit',
    pattern: ['rate limit', '429', 'quota exceeded', 'too many requests'],
    description: 'API rate limiting detected',
    severity: 'high',
    suggestedFix: 'Increase delay between AI calls or implement exponential backoff. Consider switching to a different provider temporarily.',
    category: 'AI_PROVIDER',
  },
  {
    id: 'context_length',
    pattern: ['context too long', 'token limit', 'maximum context', 'input too long'],
    description: 'Content exceeds AI context window',
    severity: 'high',
    suggestedFix: 'Reduce chunk size in section processing. Consider splitting large sections into smaller sub-sections.',
    category: 'AI_PROVIDER',
  },
  {
    id: 'json_parse',
    pattern: ['json parse', 'unexpected token', 'syntax error', 'invalid json'],
    description: 'Failed to parse AI response as JSON',
    severity: 'medium',
    suggestedFix: 'AI response format validation needed. Consider adding response sanitization or retry with stricter prompt.',
    category: 'PARSE',
  },
  {
    id: 'network_timeout',
    pattern: ['timeout', 'timed out', 'econnrefused', 'connection refused'],
    description: 'Network connection issues',
    severity: 'medium',
    suggestedFix: 'Check network connectivity. Consider increasing timeout values or implementing connection pooling.',
    category: 'NETWORK',
  },
  {
    id: 'fetch_failed',
    pattern: ['failed to fetch', 'network error', 'fetch error'],
    description: 'HTTP request failed',
    severity: 'medium',
    suggestedFix: 'Check if the target URL is accessible. May need CORS proxy or different fetching strategy.',
    category: 'NETWORK',
  },
  {
    id: 'rls_violation',
    pattern: ['row-level security', 'permission denied', 'rls', 'policy violation'],
    description: 'Database access denied by RLS policy',
    severity: 'critical',
    suggestedFix: 'User may not have permission to access this data. Check if data belongs to the correct user or if RLS policies need updating.',
    category: 'DATABASE',
  },
  {
    id: 'foreign_key',
    pattern: ['foreign key', 'constraint violation', 'referential integrity'],
    description: 'Database constraint violation',
    severity: 'high',
    suggestedFix: 'Related record may not exist. Ensure parent records are created before child records.',
    category: 'DATABASE',
  },
  {
    id: 'auth_error',
    pattern: ['unauthorized', '401', 'invalid token', 'expired token', 'forbidden', '403'],
    description: 'Authentication or authorization failure',
    severity: 'high',
    suggestedFix: 'API key may be invalid or expired. Re-enter credentials in settings.',
    category: 'AUTH',
  },
  {
    id: 'render_error',
    pattern: ['render error', 'component error', 'minified react error', 'error #31'],
    description: 'React rendering failure',
    severity: 'critical',
    suggestedFix: 'Malformed data causing render crash. Check data sanitization in AI response handling.',
    category: 'REACT',
  },
  {
    id: 'hook_error',
    pattern: ['hook error', 'invalid hook', 'hooks can only be called'],
    description: 'React hook usage error',
    severity: 'high',
    suggestedFix: 'Component may be calling hooks conditionally or outside React context.',
    category: 'REACT',
  },
  {
    id: 'gemini_error',
    pattern: ['gemini', 'google generative ai'],
    description: 'Gemini AI provider error',
    severity: 'medium',
    suggestedFix: 'Check Gemini API key validity. Consider trying an alternative AI provider.',
    category: 'AI_PROVIDER',
  },
  {
    id: 'anthropic_error',
    pattern: ['anthropic', 'claude'],
    description: 'Anthropic Claude provider error',
    severity: 'medium',
    suggestedFix: 'Check Anthropic API key validity. Verify account has sufficient credits.',
    category: 'AI_PROVIDER',
  },
  {
    id: 'openai_error',
    pattern: ['openai', 'gpt-'],
    description: 'OpenAI provider error',
    severity: 'medium',
    suggestedFix: 'Check OpenAI API key validity. Verify account has sufficient credits.',
    category: 'AI_PROVIDER',
  },
];

// =============================================================================
// Pattern Detection Functions
// =============================================================================

/**
 * Check if a message matches a pattern rule
 */
function matchesRule(message: string, rule: PatternRule): boolean {
  const lowerMessage = message.toLowerCase();

  if (Array.isArray(rule.pattern)) {
    return rule.pattern.some(p => lowerMessage.includes(p.toLowerCase()));
  }

  return rule.pattern.test(lowerMessage);
}

/**
 * Find all matching rules for a message
 */
function findMatchingRules(message: string): PatternRule[] {
  return PATTERN_RULES.filter(rule => matchesRule(message, rule));
}

// =============================================================================
// Database Analysis Functions
// =============================================================================

interface ConsoleLogRow {
  id: string;
  message: string;
  level: string;
  stack: string | null;
  context: {
    passNumber?: number;
    provider?: string;
    errorType?: string;
  } | null;
  created_at: string;
}

interface ApiCallLogRow {
  id: string;
  provider: string;
  endpoint: string;
  status: string;
  error_type: string | null;
  error_message: string | null;
  created_at: string;
}

/**
 * Analyze console logs for patterns
 */
export async function analyzeConsoleLogs(
  hoursBack: number = 24
): Promise<PatternAnalysis> {
  const fromTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const toTime = new Date();

  const client = getLoggingClient();
  if (!client) {
    console.warn('[ErrorPatternDetector] No Supabase client available');
    return createEmptyAnalysis(fromTime, toTime);
  }

  // Fetch error logs
  const { data: logs, error } = await client
    .from('console_logs')
    .select('id, message, level, stack, context, created_at')
    .eq('level', 'error')
    .gte('created_at', fromTime.toISOString())
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('[ErrorPatternDetector] Failed to fetch console logs:', error);
    return createEmptyAnalysis(fromTime, toTime);
  }

  // Note: This code is never reached (client is always null), cast via unknown for type safety
  const typedLogs = (logs || []) as unknown as ConsoleLogRow[];
  return analyzeLogEntries(typedLogs, fromTime, toTime);
}

/**
 * Analyze API call logs for error patterns
 */
export async function analyzeApiCallLogs(
  hoursBack: number = 24
): Promise<PatternAnalysis> {
  const fromTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const toTime = new Date();

  const client = getLoggingClient();
  if (!client) {
    console.warn('[ErrorPatternDetector] No Supabase client available');
    return createEmptyAnalysis(fromTime, toTime);
  }

  // Fetch error API calls
  const { data: calls, error } = await client
    .from('api_call_logs')
    .select('id, provider, endpoint, status, error_type, error_message, created_at')
    .eq('status', 'error')
    .gte('created_at', fromTime.toISOString())
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('[ErrorPatternDetector] Failed to fetch API call logs:', error);
    return createEmptyAnalysis(fromTime, toTime);
  }

  // Note: This code is never reached (client is always null), cast via unknown for type safety
  const typedCalls = (calls || []) as unknown as ApiCallLogRow[];
  return analyzeApiCallEntries(typedCalls, fromTime, toTime);
}

/**
 * Analyze log entries for patterns
 */
function analyzeLogEntries(
  logs: ConsoleLogRow[],
  fromTime: Date,
  toTime: Date
): PatternAnalysis {
  const patternMap = new Map<string, ErrorPattern>();

  for (const log of logs) {
    const matchingRules = findMatchingRules(log.message);

    for (const rule of matchingRules) {
      const existing = patternMap.get(rule.id);
      const logDate = new Date(log.created_at);
      const passNumber = log.context?.passNumber;
      const provider = log.context?.provider;

      if (existing) {
        existing.occurrences++;
        if (logDate < existing.firstSeen) existing.firstSeen = logDate;
        if (logDate > existing.lastSeen) existing.lastSeen = logDate;
        if (passNumber && !existing.affectedPasses.includes(passNumber)) {
          existing.affectedPasses.push(passNumber);
        }
        if (provider && !existing.affectedProviders.includes(provider)) {
          existing.affectedProviders.push(provider);
        }
      } else {
        patternMap.set(rule.id, {
          pattern: rule.id,
          description: rule.description,
          occurrences: 1,
          firstSeen: logDate,
          lastSeen: logDate,
          affectedPasses: passNumber ? [passNumber] : [],
          affectedProviders: provider ? [provider] : [],
          severity: rule.severity,
          suggestedFix: rule.suggestedFix,
          category: rule.category,
        });
      }
    }
  }

  const patterns = Array.from(patternMap.values())
    .sort((a, b) => b.occurrences - a.occurrences);

  return createAnalysis(patterns, logs.length, fromTime, toTime);
}

/**
 * Analyze API call entries for patterns
 */
function analyzeApiCallEntries(
  calls: ApiCallLogRow[],
  fromTime: Date,
  toTime: Date
): PatternAnalysis {
  const patternMap = new Map<string, ErrorPattern>();

  for (const call of calls) {
    const message = call.error_message || call.error_type || 'Unknown error';
    const matchingRules = findMatchingRules(message);

    // If no rules match, create a provider-specific pattern
    if (matchingRules.length === 0) {
      const patternId = `${call.provider}_error`;
      const existing = patternMap.get(patternId);
      const callDate = new Date(call.created_at);

      if (existing) {
        existing.occurrences++;
        if (callDate < existing.firstSeen) existing.firstSeen = callDate;
        if (callDate > existing.lastSeen) existing.lastSeen = callDate;
      } else {
        patternMap.set(patternId, {
          pattern: patternId,
          description: `${call.provider} errors`,
          occurrences: 1,
          firstSeen: callDate,
          lastSeen: callDate,
          affectedPasses: [],
          affectedProviders: [call.provider],
          severity: 'medium',
          suggestedFix: `Check ${call.provider} configuration and credentials.`,
          category: 'AI_PROVIDER',
        });
      }
      continue;
    }

    for (const rule of matchingRules) {
      const existing = patternMap.get(rule.id);
      const callDate = new Date(call.created_at);

      if (existing) {
        existing.occurrences++;
        if (callDate < existing.firstSeen) existing.firstSeen = callDate;
        if (callDate > existing.lastSeen) existing.lastSeen = callDate;
        if (!existing.affectedProviders.includes(call.provider)) {
          existing.affectedProviders.push(call.provider);
        }
      } else {
        patternMap.set(rule.id, {
          pattern: rule.id,
          description: rule.description,
          occurrences: 1,
          firstSeen: callDate,
          lastSeen: callDate,
          affectedPasses: [],
          affectedProviders: [call.provider],
          severity: rule.severity,
          suggestedFix: rule.suggestedFix,
          category: rule.category,
        });
      }
    }
  }

  const patterns = Array.from(patternMap.values())
    .sort((a, b) => b.occurrences - a.occurrences);

  return createAnalysis(patterns, calls.length, fromTime, toTime);
}

/**
 * Create analysis summary
 */
function createAnalysis(
  patterns: ErrorPattern[],
  totalErrors: number,
  fromTime: Date,
  toTime: Date
): PatternAnalysis {
  // Find most affected provider
  const providerCounts: Record<string, number> = {};
  for (const pattern of patterns) {
    for (const provider of pattern.affectedProviders) {
      providerCounts[provider] = (providerCounts[provider] || 0) + pattern.occurrences;
    }
  }
  const mostAffectedProvider = Object.entries(providerCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

  // Find most affected pass
  const passCounts: Record<number, number> = {};
  for (const pattern of patterns) {
    for (const pass of pattern.affectedPasses) {
      passCounts[pass] = (passCounts[pass] || 0) + pattern.occurrences;
    }
  }
  const mostAffectedPass = Object.entries(passCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

  return {
    patterns,
    summary: {
      totalErrors,
      uniquePatterns: patterns.length,
      criticalPatterns: patterns.filter(p => p.severity === 'critical').length,
      mostAffectedProvider,
      mostAffectedPass: mostAffectedPass ? parseInt(mostAffectedPass, 10) : null,
    },
    analyzedAt: new Date(),
    timeRange: {
      from: fromTime,
      to: toTime,
    },
  };
}

/**
 * Create empty analysis result
 */
function createEmptyAnalysis(fromTime: Date, toTime: Date): PatternAnalysis {
  return {
    patterns: [],
    summary: {
      totalErrors: 0,
      uniquePatterns: 0,
      criticalPatterns: 0,
      mostAffectedProvider: null,
      mostAffectedPass: null,
    },
    analyzedAt: new Date(),
    timeRange: {
      from: fromTime,
      to: toTime,
    },
  };
}

/**
 * Run full pattern analysis (console logs + API calls)
 */
export async function runFullAnalysis(
  hoursBack: number = 24
): Promise<{
  consolePatterns: PatternAnalysis;
  apiPatterns: PatternAnalysis;
  combined: PatternAnalysis;
}> {
  const [consolePatterns, apiPatterns] = await Promise.all([
    analyzeConsoleLogs(hoursBack),
    analyzeApiCallLogs(hoursBack),
  ]);

  // Merge patterns
  const patternMap = new Map<string, ErrorPattern>();

  for (const pattern of consolePatterns.patterns) {
    patternMap.set(pattern.pattern, { ...pattern });
  }

  for (const pattern of apiPatterns.patterns) {
    const existing = patternMap.get(pattern.pattern);
    if (existing) {
      existing.occurrences += pattern.occurrences;
      if (pattern.firstSeen < existing.firstSeen) existing.firstSeen = pattern.firstSeen;
      if (pattern.lastSeen > existing.lastSeen) existing.lastSeen = pattern.lastSeen;
      existing.affectedPasses = [...new Set([...existing.affectedPasses, ...pattern.affectedPasses])];
      existing.affectedProviders = [...new Set([...existing.affectedProviders, ...pattern.affectedProviders])];
    } else {
      patternMap.set(pattern.pattern, { ...pattern });
    }
  }

  const combinedPatterns = Array.from(patternMap.values())
    .sort((a, b) => b.occurrences - a.occurrences);

  const combined = createAnalysis(
    combinedPatterns,
    consolePatterns.summary.totalErrors + apiPatterns.summary.totalErrors,
    consolePatterns.timeRange.from,
    consolePatterns.timeRange.to
  );

  return {
    consolePatterns,
    apiPatterns,
    combined,
  };
}

// =============================================================================
// Export
// =============================================================================

export const errorPatternDetector = {
  analyzeConsoleLogs,
  analyzeApiCallLogs,
  runFullAnalysis,
  findMatchingRules,
  PATTERN_RULES,
};

export default errorPatternDetector;
