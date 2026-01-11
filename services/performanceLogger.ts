/**
 * Performance Logger Service
 *
 * Tracks timing of operations for performance analysis:
 * - Pass durations
 * - Section processing times
 * - Checkpoint operations
 * - Assembly times
 *
 * @module services/performanceLogger
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

export type PerformanceCategory =
  | 'PASS'
  | 'SECTION'
  | 'CHECKPOINT'
  | 'ASSEMBLY'
  | 'VALIDATION'
  | 'PARSE'
  | 'RENDER'
  | 'OTHER';

export interface PerformanceMetadata {
  passNumber?: number;
  sectionId?: string;
  sectionTitle?: string;
  sectionIndex?: number;
  totalSections?: number;
  provider?: string;
  model?: string;
  tokenCount?: number;
  chunkSize?: number;
  retryCount?: number;
  errorType?: string;
  checkpointType?: string;
}

export interface PerformanceEvent {
  id: string;
  sessionId: string;
  jobId?: string;
  category: PerformanceCategory;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  metadata: PerformanceMetadata;
}

interface PerformanceMetricRecord {
  session_id: string;
  job_id?: string;
  category: string;
  operation: string;
  duration_ms: number;
  success: boolean;
  metadata: PerformanceMetadata;
}

// =============================================================================
// Context Management
// =============================================================================

let currentJobId: string | undefined;

/**
 * Set the current job ID for performance logging
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
// In-Flight Event Tracking
// =============================================================================

const inFlightEvents: Map<string, PerformanceEvent> = new Map();

function generateEventId(): string {
  return `perf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================================================
// Log Buffer & Batching
// =============================================================================

const logBuffer: PerformanceMetricRecord[] = [];
const BUFFER_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isEnabled = true;

/**
 * Enable or disable performance logging
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
      .from('performance_metrics')
      .insert(logsToFlush as any);

    if (error) {
      console.error('[PerformanceLogger] Failed to flush logs:', error.message);
    }
  } catch (err) {
    console.error('[PerformanceLogger] Failed to flush logs:', err);
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;

  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushLogs();
  }, FLUSH_INTERVAL);
}

function addToBuffer(record: PerformanceMetricRecord): void {
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
 * Start tracking a performance event
 */
export function startEvent(
  category: PerformanceCategory,
  operation: string,
  metadata?: Partial<PerformanceMetadata>
): PerformanceEvent {
  const id = generateEventId();

  const event: PerformanceEvent = {
    id,
    sessionId: getSessionId(),
    jobId: currentJobId,
    category,
    operation,
    startTime: Date.now(),
    success: true,
    metadata: metadata || {},
  };

  if (isEnabled) {
    inFlightEvents.set(id, event);
  }

  return event;
}

/**
 * End a performance event successfully
 */
export function endEvent(
  eventId: string,
  additionalMetadata?: Partial<PerformanceMetadata>
): void {
  if (!isEnabled) return;

  const event = inFlightEvents.get(eventId);
  if (!event) {
    console.warn(`[PerformanceLogger] Event ${eventId} not found`);
    return;
  }

  event.endTime = Date.now();
  event.duration = event.endTime - event.startTime;
  event.success = true;
  event.metadata = { ...event.metadata, ...additionalMetadata };

  inFlightEvents.delete(eventId);
  persistEvent(event);
}

/**
 * End a performance event with failure
 */
export function failEvent(
  eventId: string,
  errorType?: string,
  additionalMetadata?: Partial<PerformanceMetadata>
): void {
  if (!isEnabled) return;

  const event = inFlightEvents.get(eventId);
  if (!event) {
    console.warn(`[PerformanceLogger] Event ${eventId} not found`);
    return;
  }

  event.endTime = Date.now();
  event.duration = event.endTime - event.startTime;
  event.success = false;
  event.metadata = {
    ...event.metadata,
    ...additionalMetadata,
    errorType,
  };

  inFlightEvents.delete(eventId);
  persistEvent(event);
}

/**
 * Persist a completed event to the database
 */
function persistEvent(event: PerformanceEvent): void {
  if (event.duration === undefined) return;

  const record: PerformanceMetricRecord = {
    session_id: event.sessionId,
    job_id: event.jobId,
    category: event.category,
    operation: event.operation,
    duration_ms: event.duration,
    success: event.success,
    metadata: event.metadata,
  };

  addToBuffer(record);
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Measure the duration of an async function
 */
export async function measure<T>(
  category: PerformanceCategory,
  operation: string,
  fn: () => Promise<T>,
  metadata?: Partial<PerformanceMetadata>
): Promise<T> {
  const event = startEvent(category, operation, metadata);

  try {
    const result = await fn();
    endEvent(event.id);
    return result;
  } catch (error) {
    const errorType = error instanceof Error ? error.name : 'Unknown';
    failEvent(event.id, errorType);
    throw error;
  }
}

/**
 * Measure the duration of a sync function
 */
export function measureSync<T>(
  category: PerformanceCategory,
  operation: string,
  fn: () => T,
  metadata?: Partial<PerformanceMetadata>
): T {
  const event = startEvent(category, operation, metadata);

  try {
    const result = fn();
    endEvent(event.id);
    return result;
  } catch (error) {
    const errorType = error instanceof Error ? error.name : 'Unknown';
    failEvent(event.id, errorType);
    throw error;
  }
}

// =============================================================================
// Pass-Specific Logging
// =============================================================================

/**
 * Start tracking a content generation pass
 */
export function startPass(passNumber: number): PerformanceEvent {
  return startEvent('PASS', `pass_${passNumber}`, { passNumber });
}

/**
 * End tracking a content generation pass
 */
export function endPass(eventId: string, success: boolean = true): void {
  if (success) {
    endEvent(eventId);
  } else {
    failEvent(eventId, 'PASS_FAILED');
  }
}

/**
 * Start tracking section processing
 */
export function startSection(
  passNumber: number,
  sectionId: string,
  sectionTitle?: string,
  sectionIndex?: number,
  totalSections?: number
): PerformanceEvent {
  return startEvent('SECTION', `section_${sectionId}`, {
    passNumber,
    sectionId,
    sectionTitle,
    sectionIndex,
    totalSections,
  });
}

/**
 * End tracking section processing
 */
export function endSection(
  eventId: string,
  success: boolean = true,
  metadata?: Partial<PerformanceMetadata>
): void {
  if (success) {
    endEvent(eventId, metadata);
  } else {
    failEvent(eventId, 'SECTION_FAILED', metadata);
  }
}

/**
 * Log a checkpoint operation
 */
export function logCheckpoint(
  checkpointType: string,
  durationMs: number,
  passNumber?: number
): void {
  if (!isEnabled) return;

  const record: PerformanceMetricRecord = {
    session_id: getSessionId(),
    job_id: currentJobId,
    category: 'CHECKPOINT',
    operation: `checkpoint_${checkpointType}`,
    duration_ms: durationMs,
    success: true,
    metadata: { checkpointType, passNumber },
  };

  addToBuffer(record);
}

// =============================================================================
// Aggregation Helpers
// =============================================================================

/**
 * Get in-flight event statistics
 */
export function getInFlightStats(): {
  count: number;
  oldestAge: number;
  byCategory: Record<string, number>;
} {
  const now = Date.now();
  let oldestAge = 0;
  const byCategory: Record<string, number> = {};

  inFlightEvents.forEach(event => {
    const age = now - event.startTime;
    if (age > oldestAge) {
      oldestAge = age;
    }
    byCategory[event.category] = (byCategory[event.category] || 0) + 1;
  });

  return {
    count: inFlightEvents.size,
    oldestAge,
    byCategory,
  };
}

/**
 * Cancel tracking of an in-flight event
 */
export function cancelEvent(eventId: string): void {
  inFlightEvents.delete(eventId);
}

/**
 * Force flush all pending logs
 */
export function flush(): Promise<void> {
  return flushLogs();
}

// =============================================================================
// Export
// =============================================================================

export const performanceLogger = {
  startEvent,
  endEvent,
  failEvent,
  measure,
  measureSync,
  startPass,
  endPass,
  startSection,
  endSection,
  logCheckpoint,
  setEnabled,
  setCurrentJobId,
  getCurrentJobId,
  flush,
  getInFlightStats,
  cancelEvent,
};

export default performanceLogger;
