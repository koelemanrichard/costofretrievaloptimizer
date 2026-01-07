// services/ai/contentGeneration/providerUtils.ts
// Shared AI provider utilities for content generation passes

import { BusinessInfo } from '../../../types';
import * as geminiService from '../../geminiService';
import * as openAiService from '../../openAiService';
import * as anthropicService from '../../anthropicService';
import * as perplexityService from '../../perplexityService';
import * as openRouterService from '../../openRouterService';

// No-op dispatch for standalone calls
const noOpDispatch = () => {};

// Provider fallback order - used when primary provider fails
const FALLBACK_ORDER = ['anthropic', 'openai', 'gemini', 'openrouter', 'perplexity'] as const;

// Check if error is retryable with same provider (transient errors)
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return message.includes('503') ||
         message.includes('504') ||
         message.includes('gateway') ||
         message.includes('overload') ||
         message.includes('rate limit') ||
         message.includes('too many requests') ||
         message.includes('capacity') ||
         message.includes('unavailable') ||
         message.includes('failed to fetch') ||
         message.includes('network') ||
         message.includes('timeout') ||
         message.includes('econnreset') ||
         message.includes('socket hang up') ||
         message.includes('cors');
}

// Check if error should trigger fallback to another provider
// More permissive than isRetryableError - includes provider-specific errors
function shouldFallbackToAnotherProvider(error: Error): boolean {
  const message = error.message.toLowerCase();
  // Transient errors that might work with same or different provider
  if (isRetryableError(error)) return true;
  // Provider-specific errors that might work with different provider
  return message.includes('400') ||          // Bad request - different provider might accept
         message.includes('bad request') ||
         message.includes('invalid') ||       // Invalid model/params for this provider
         message.includes('not found') ||     // Model not found on this provider
         message.includes('401') ||           // Auth error - try other provider with different key
         message.includes('unauthorized') ||
         message.includes('api error');       // Generic API error
}

// Check if business info has API key for a provider
function checkProviderApiKey(info: BusinessInfo, provider: string): boolean {
  switch (provider) {
    case 'openai': return !!info.openAiApiKey;
    case 'anthropic': return !!info.anthropicApiKey;
    case 'gemini': return !!info.geminiApiKey;
    case 'perplexity': return !!info.perplexityApiKey;
    case 'openrouter': return !!info.openRouterApiKey;
    default: return false;
  }
}

// Helper to call AI based on provider
async function callProvider(
  info: BusinessInfo,
  prompt: string,
  provider: string
): Promise<string> {
  switch (provider) {
    case 'openai':
      return openAiService.generateText(prompt, info, noOpDispatch);
    case 'anthropic':
      return anthropicService.generateText(prompt, info, noOpDispatch);
    case 'perplexity':
      return perplexityService.generateText(prompt, info, noOpDispatch);
    case 'openrouter':
      return openRouterService.generateText(prompt, info, noOpDispatch);
    case 'gemini':
    default:
      return geminiService.generateText(prompt, info, noOpDispatch);
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Default timeout for AI calls (140 seconds - matches Anthropic proxy timeout of 145s)
const AI_CALL_TIMEOUT_MS = 140000;

/**
 * Wrap a promise with a timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`AI call timed out after ${timeoutMs / 1000}s (${operationName}). The model may be overloaded - try again or use a different provider.`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Call AI provider with automatic fallback on retryable errors
 * Uses the provider specified in businessInfo.aiProvider, falling back to alternatives
 * if a 503/overload error occurs
 *
 * Features:
 * - Per-call timeout (90s default) to prevent hanging
 * - Automatic retry with exponential backoff
 * - Fallback to other providers on failure
 */
export async function callProviderWithFallback(
  info: BusinessInfo,
  prompt: string,
  maxRetries: number = 2,
  timeoutMs: number = AI_CALL_TIMEOUT_MS
): Promise<string> {
  const primaryProvider = info.aiProvider || 'gemini';
  console.log(`[ContentGen] Using AI provider: ${primaryProvider} (from businessInfo.aiProvider: ${info.aiProvider})`);
  let lastError: Error | null = null;

  // Get fallback providers (exclude primary, it will be tried first)
  const fallbackProviders = FALLBACK_ORDER.filter(p => p !== primaryProvider);

  // Try primary provider first with retries
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[ContentGen] Attempt ${attempt}/${maxRetries} with ${primaryProvider} (prompt: ${prompt.length} chars)`);
      // Wrap the AI call with timeout to prevent hanging
      const response = await withTimeout(
        callProvider(info, prompt, primaryProvider),
        timeoutMs,
        `${primaryProvider} attempt ${attempt}`
      );
      if (typeof response === 'string') {
        return response.trim();
      }
      throw new Error('AI returned non-string response');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[ContentGen] Attempt ${attempt} failed:`, lastError.message);

      // If error warrants fallback on last attempt, try fallback providers
      if (attempt === maxRetries && shouldFallbackToAnotherProvider(lastError)) {
        console.warn(`[ContentGen] Primary provider ${primaryProvider} failed after ${maxRetries} attempts, trying fallbacks...`);
        break; // Exit retry loop to try fallbacks
      }

      if (attempt < maxRetries) {
        // Exponential backoff - longer delays for network errors
        const baseDelay = isRetryableError(lastError) ? 2000 : 1000;
        const delayMs = baseDelay * Math.pow(2, attempt - 1);
        console.log(`[ContentGen] Waiting ${delayMs}ms before retry...`);
        await delay(delayMs);
      }
    }
  }

  // Try fallback providers if primary failed with an error that warrants fallback
  if (lastError && shouldFallbackToAnotherProvider(lastError)) {
    console.log(`[ContentGen] Primary provider failed, checking fallbacks...`);
    console.log(`[ContentGen] Available fallback providers: ${fallbackProviders.join(', ')}`);

    let triedFallbacks = 0;
    for (const fallbackProvider of fallbackProviders) {
      // Check if we have API key for this provider
      const hasKey = checkProviderApiKey(info, fallbackProvider);
      if (!hasKey) {
        console.log(`[ContentGen] Skipping ${fallbackProvider} - no API key configured`);
        continue;
      }

      triedFallbacks++;
      console.log(`[ContentGen] Attempting fallback to ${fallbackProvider}...`);
      try {
        // Wrap fallback call with timeout too
        const response = await withTimeout(
          callProvider(info, prompt, fallbackProvider),
          timeoutMs,
          `${fallbackProvider} fallback`
        );
        if (typeof response === 'string') {
          console.log(`[ContentGen] Fallback to ${fallbackProvider} succeeded!`);
          return response.trim();
        }
      } catch (fallbackError) {
        const fallbackErrMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        console.warn(`[ContentGen] Fallback ${fallbackProvider} also failed:`, fallbackErrMsg);
        // Continue to next fallback
      }
    }

    if (triedFallbacks === 0) {
      console.error(`[ContentGen] No fallback providers available! Configure API keys for: ${fallbackProviders.join(', ')}`);
    }
  } else if (lastError) {
    console.log(`[ContentGen] Error does not warrant fallback. Error: ${lastError.message}`);
  }

  throw lastError || new Error('All providers failed');
}

/**
 * Simple provider call without fallback (for backward compatibility)
 * Uses businessInfo.aiProvider, defaulting to gemini if not set
 */
export async function callProviderWithPrompt(
  info: BusinessInfo,
  prompt: string
): Promise<string> {
  const provider = info.aiProvider || 'gemini';
  return callProvider(info, prompt, provider);
}
