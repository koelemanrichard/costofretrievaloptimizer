// supabase/functions/_shared/usage.ts
// Shared utilities for AI usage logging
//
// Used by edge functions that need to log AI API usage
//
// deno-lint-ignore-file no-explicit-any

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Parameters for logging AI usage
 */
export interface UsageLogParams {
  userId?: string;
  organizationId?: string;
  projectId?: string;
  mapId?: string;
  topicId?: string;
  briefId?: string;
  jobId?: string;

  // Provider & Model
  provider: string;
  model: string;

  // Operation context
  operation: string;
  operationDetail?: string;

  // Token usage
  tokensIn: number;
  tokensOut: number;

  // Timing
  durationMs?: number;

  // Size
  requestSizeBytes?: number;
  responseSizeBytes?: number;

  // Status
  success: boolean;
  errorMessage?: string;
  errorCode?: string;

  // Billing context
  keySource?: string;  // 'platform', 'org_byok', 'project_byok', 'user_settings'
  billableTo?: string; // 'platform', 'organization', 'project', 'user'
  billableId?: string;
  isExternalUsage?: boolean;
}

/**
 * Log AI usage to the ai_usage_logs table
 *
 * @param client - Supabase client (service role for logging)
 * @param params - Usage log parameters
 * @returns The created log entry ID
 */
export async function logUsage(
  client: SupabaseClient,
  params: UsageLogParams
): Promise<{ logId: string | null; error: string | null }> {
  try {
    // The cost will be calculated by the trigger in the database
    const { data, error } = await client
      .from('ai_usage_logs')
      .insert({
        user_id: params.userId || null,
        organization_id: params.organizationId || null,
        project_id: params.projectId || null,
        map_id: params.mapId || null,
        topic_id: params.topicId || null,
        brief_id: params.briefId || null,
        job_id: params.jobId || null,

        provider: params.provider,
        model: params.model,

        operation: params.operation,
        operation_detail: params.operationDetail || null,

        tokens_in: params.tokensIn,
        tokens_out: params.tokensOut,

        duration_ms: params.durationMs || null,
        request_size_bytes: params.requestSizeBytes || null,
        response_size_bytes: params.responseSizeBytes || null,

        success: params.success,
        error_message: params.errorMessage || null,
        error_code: params.errorCode || null,

        key_source: params.keySource || null,
        billable_to: params.billableTo || null,
        billable_id: params.billableId || null,
        is_external_usage: params.isExternalUsage || false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[usage] log error:', error);
      return { logId: null, error: error.message };
    }

    return { logId: data?.id || null, error: null };
  } catch (err: any) {
    console.error('[usage] log exception:', err);
    return { logId: null, error: err.message || 'Unknown error' };
  }
}

/**
 * Pricing rates — sourced from shared service config (mirror of config/serviceRegistry.ts)
 */
export { PRICING_RATES, calculateCost } from './serviceConfig.ts';

/**
 * Calculate estimated cost from database rates
 *
 * @param client - Supabase client
 * @param provider - The AI provider
 * @param model - The model name
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Estimated cost in USD
 */
export async function calculateCostFromDb(
  client: SupabaseClient,
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<number> {
  try {
    const { data, error } = await client.rpc('calculate_ai_cost', {
      p_provider: provider,
      p_model: model,
      p_input_tokens: inputTokens,
      p_output_tokens: outputTokens,
    });

    if (error || data === null) {
      // Fall back to static rates
      return calculateCost(provider, model, inputTokens, outputTokens);
    }

    return Number(data);
  } catch {
    return calculateCost(provider, model, inputTokens, outputTokens);
  }
}

/**
 * Extract billing context from key resolution result
 */
export interface BillingContext {
  keySource: string;
  billableTo: string;
  billableId: string;
  organizationId?: string;
}

/**
 * Get billing context for a project/provider combination
 */
export async function getBillingContext(
  client: SupabaseClient,
  projectId: string,
  provider: string
): Promise<BillingContext | null> {
  try {
    const { data, error } = await client.rpc('get_billable_info', {
      p_project_id: projectId,
      p_provider: provider,
    });

    if (error || !data) {
      return null;
    }

    return {
      keySource: data.key_source,
      billableTo: data.billable_to,
      billableId: data.billable_id,
    };
  } catch {
    return null;
  }
}

/**
 * Create a usage logging wrapper for AI calls
 * This wraps an AI call function to automatically log usage
 */
export function withUsageLogging<T extends (...args: any[]) => Promise<any>>(
  client: SupabaseClient,
  fn: T,
  baseParams: Partial<UsageLogParams>
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const startTime = Date.now();
    let success = true;
    let errorMessage: string | undefined;
    let errorCode: string | undefined;
    let result: ReturnType<T>;

    try {
      result = await fn(...args);
      return result;
    } catch (err: any) {
      success = false;
      errorMessage = err.message;
      errorCode = err.code;
      throw err;
    } finally {
      const durationMs = Date.now() - startTime;

      // Log usage (fire and forget, don't block the response)
      logUsage(client, {
        ...baseParams,
        provider: baseParams.provider || 'unknown',
        model: baseParams.model || 'unknown',
        operation: baseParams.operation || 'unknown',
        tokensIn: 0, // Would need to be extracted from result
        tokensOut: 0,
        durationMs,
        success,
        errorMessage,
        errorCode,
      }).catch(err => console.error('[usage] Failed to log:', err));
    }
  }) as T;
}
