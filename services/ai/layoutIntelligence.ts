/**
 * Layout Intelligence AI Service
 *
 * Centralized AI service for the Semantic Layout Engine.
 * Follows the standard provider dispatch pattern with telemetry/billing.
 *
 * @module services/ai/layoutIntelligence
 */

import type { BusinessInfo } from '../../types';
import { dispatchToProvider } from './providerDispatcher';
import { DEFAULT_MODELS, FAST_MODELS, getModelForPrompt, type Provider } from './providerConfig';
import {
  logAiUsage,
  estimateTokens,
  setGlobalUsageContext,
  getGlobalUsageContext,
  type AIUsageContext,
} from '../telemetryService';
import { getSupabaseClient } from '../supabaseClient';

// Import provider services
import * as geminiService from '../geminiService';
import * as anthropicService from '../anthropicService';
import * as openAiService from '../openAiService';
import * as perplexityService from '../perplexityService';
import * as openRouterService from '../openRouterService';

/**
 * Operation names for telemetry tracking
 */
export const LAYOUT_OPERATIONS = {
  SECTION_ANALYSIS: 'layout_section_analysis',
  STRUCTURE_TRANSFORMATION: 'layout_structure_transformation',
  BLUEPRINT_GENERATION: 'layout_blueprint_generation',
  BATCH_ANALYSIS: 'layout_batch_analysis',
} as const;

export type LayoutOperation = typeof LAYOUT_OPERATIONS[keyof typeof LAYOUT_OPERATIONS];

/**
 * Set usage context for layout intelligence operations
 */
export function setLayoutUsageContext(context: {
  projectId?: string;
  mapId?: string;
  topicId?: string;
}): void {
  setGlobalUsageContext({
    ...getGlobalUsageContext(),
    ...context,
  });
}

/**
 * Generate text for layout intelligence operations
 *
 * Uses the central provider dispatch pattern with full telemetry.
 *
 * @param prompt - The AI prompt
 * @param businessInfo - Contains API keys and provider settings
 * @param dispatch - React dispatch for logging
 * @param operation - Operation name for telemetry
 * @returns AI response text
 */
export async function generateLayoutText(
  prompt: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>,
  operation: LayoutOperation = LAYOUT_OPERATIONS.SECTION_ANALYSIS
): Promise<string> {
  const startTime = Date.now();
  const promptLength = prompt.length;

  // Get the appropriate model based on prompt size
  const provider = (businessInfo.aiProvider || 'gemini') as Provider;
  const model = getModelForPrompt(provider, promptLength, businessInfo.aiModel);

  // Log operation start
  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'LayoutIntelligence',
      message: `Starting ${operation} with ${provider}/${model}`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  try {
    // Dispatch to the appropriate provider
    const result = await dispatchToProvider(businessInfo, {
      gemini: () => geminiService.generateText(prompt, businessInfo, dispatch, model),
      anthropic: () => anthropicService.generateText(prompt, businessInfo, dispatch),
      openai: () => openAiService.generateText(prompt, businessInfo, dispatch),
      perplexity: () => perplexityService.generateText(prompt, businessInfo, dispatch),
      openrouter: () => openRouterService.generateText(prompt, businessInfo, dispatch),
    });

    const durationMs = Date.now() - startTime;

    // Log successful usage
    await logLayoutUsage({
      provider,
      model,
      operation,
      prompt,
      response: result,
      durationMs,
      success: true,
      businessInfo,
    });

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'LayoutIntelligence',
        message: `${operation} completed in ${durationMs}ms`,
        status: 'success',
        timestamp: Date.now(),
      },
    });

    return result;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log failed usage
    await logLayoutUsage({
      provider,
      model,
      operation,
      prompt,
      response: '',
      durationMs,
      success: false,
      errorMessage,
      businessInfo,
    });

    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'LayoutIntelligence',
        message: `${operation} failed: ${errorMessage}`,
        status: 'failure',
        timestamp: Date.now(),
      },
    });

    throw error;
  }
}

/**
 * Generate JSON response for layout intelligence operations
 *
 * @param prompt - The AI prompt expecting JSON response
 * @param businessInfo - Contains API keys and provider settings
 * @param dispatch - React dispatch for logging
 * @param fallback - Fallback value if parsing fails
 * @param operation - Operation name for telemetry
 * @returns Parsed JSON response
 */
export async function generateLayoutJson<T extends object>(
  prompt: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>,
  fallback: T,
  operation: LayoutOperation = LAYOUT_OPERATIONS.SECTION_ANALYSIS
): Promise<T> {
  const response = await generateLayoutText(prompt, businessInfo, dispatch, operation);

  try {
    // Clean response - remove markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }

    return JSON.parse(cleaned.trim()) as T;
  } catch (parseError) {
    console.warn('[LayoutIntelligence] Failed to parse JSON response, using fallback:', parseError);
    dispatch({
      type: 'LOG_EVENT',
      payload: {
        service: 'LayoutIntelligence',
        message: `JSON parse failed for ${operation}, using fallback`,
        status: 'warning',
        timestamp: Date.now(),
      },
    });
    return fallback;
  }
}

/**
 * Batch analyze multiple sections in parallel
 *
 * @param prompts - Array of prompts to process
 * @param businessInfo - Contains API keys and provider settings
 * @param dispatch - React dispatch for logging
 * @param batchSize - Maximum concurrent requests
 * @returns Array of responses
 */
export async function batchAnalyze(
  prompts: string[],
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<any>,
  batchSize: number = 3
): Promise<string[]> {
  const results: string[] = [];

  dispatch({
    type: 'LOG_EVENT',
    payload: {
      service: 'LayoutIntelligence',
      message: `Batch analyzing ${prompts.length} sections (batch size: ${batchSize})`,
      status: 'info',
      timestamp: Date.now(),
    },
  });

  // Process in batches
  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(prompt =>
        generateLayoutText(prompt, businessInfo, dispatch, LAYOUT_OPERATIONS.BATCH_ANALYSIS)
          .catch(error => {
            console.error('[LayoutIntelligence] Batch item failed:', error);
            return ''; // Return empty on failure, caller can handle
          })
      )
    );
    results.push(...batchResults);
  }

  return results;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

interface LayoutUsageParams {
  provider: string;
  model: string;
  operation: string;
  prompt: string;
  response: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  businessInfo: BusinessInfo;
}

/**
 * Log layout intelligence AI usage to telemetry
 */
async function logLayoutUsage(params: LayoutUsageParams): Promise<void> {
  const {
    provider,
    model,
    operation,
    prompt,
    response,
    durationMs,
    success,
    errorMessage,
    businessInfo,
  } = params;

  const tokensIn = estimateTokens(prompt.length);
  const tokensOut = estimateTokens(response.length);

  // Get supabase client for database logging
  let supabase;
  try {
    if (businessInfo.supabaseUrl && businessInfo.supabaseAnonKey) {
      supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
    }
  } catch (e) {
    // Ignore if supabase not available
  }

  await logAiUsage(
    {
      provider,
      model,
      operation,
      operationDetail: 'semantic-layout-engine',
      tokensIn,
      tokensOut,
      durationMs,
      success,
      errorMessage,
      requestSizeBytes: prompt.length,
      responseSizeBytes: response.length,
      context: getGlobalUsageContext(),
    },
    supabase
  );
}
