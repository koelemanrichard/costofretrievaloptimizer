// services/ai/providerConfig.ts
// SINGLE SOURCE OF TRUTH for AI provider configuration

import { BusinessInfo } from '../../types';

/**
 * Valid model IDs per provider
 * Updated: December 2025
 */
export const VALID_MODELS = {
  anthropic: [
    'claude-opus-4-5-20251101',
    'claude-sonnet-4-5-20250929',
    'claude-haiku-4-5-20251001',
    'claude-opus-4-1-20250805',
    'claude-sonnet-4-20250514',
    // Legacy (deprecated but functional)
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
  ],
  gemini: [
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ],
  perplexity: [
    'llama-3.1-sonar-large-128k-online',
    'llama-3.1-sonar-small-128k-online',
  ],
  openrouter: [
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o',
    'google/gemini-pro-1.5',
  ],
} as const;

/**
 * Default model per provider (used when no specific model is configured)
 */
export const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-4-5-20250929',
  openai: 'gpt-4o',
  gemini: 'gemini-1.5-pro',
  perplexity: 'llama-3.1-sonar-large-128k-online',
  openrouter: 'anthropic/claude-3.5-sonnet',
} as const;

/**
 * Fast/cheap models per provider (for large prompts or fallback)
 */
export const FAST_MODELS = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-1.5-flash',
  perplexity: 'llama-3.1-sonar-small-128k-online',
  openrouter: 'openai/gpt-4o-mini',
} as const;

/**
 * Fallback order when primary provider fails
 */
export const FALLBACK_ORDER = ['anthropic', 'openai', 'gemini', 'openrouter', 'perplexity'] as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelayMs: 2000,
  maxDelayMs: 8000,
  // Prompt length threshold for switching to fast model
  largePromptThreshold: 40000,
} as const;

/**
 * Timeout configuration (in milliseconds)
 */
export const TIMEOUT_CONFIG = {
  default: 120000,      // 2 minutes
  largePrompt: 180000,  // 3 minutes
  edgeFunction: 55000,  // Supabase edge function limit
} as const;

/**
 * Provider type
 */
export type Provider = keyof typeof VALID_MODELS;

/**
 * Check if a model is valid for a provider
 */
export function isValidModel(provider: Provider, model: string): boolean {
  return (VALID_MODELS[provider] as readonly string[]).includes(model);
}

/**
 * Get the best model for a provider based on prompt size
 */
export function getModelForPrompt(provider: Provider, promptLength: number, configuredModel?: string): string {
  if (promptLength > RETRY_CONFIG.largePromptThreshold) {
    console.log(`[ProviderConfig] Large prompt (${promptLength} chars) - using fast model`);
    return FAST_MODELS[provider];
  }
  if (configuredModel && isValidModel(provider, configuredModel)) {
    return configuredModel;
  }
  return DEFAULT_MODELS[provider];
}

/**
 * Check if provider has a configured API key
 */
export function hasApiKey(info: BusinessInfo, provider: Provider): boolean {
  switch (provider) {
    case 'anthropic': return !!info.anthropicApiKey;
    case 'openai': return !!info.openAiApiKey;
    case 'gemini': return !!info.geminiApiKey;
    case 'perplexity': return !!info.perplexityApiKey;
    case 'openrouter': return !!info.openRouterApiKey;
    default: return false;
  }
}

/**
 * Get available providers based on configured API keys
 */
export function getAvailableProviders(info: BusinessInfo): Provider[] {
  return FALLBACK_ORDER.filter(p => hasApiKey(info, p));
}

/**
 * Get the primary provider from business info
 */
export function getPrimaryProvider(info: BusinessInfo): Provider {
  const configured = info.aiProvider as Provider | undefined;
  if (configured && FALLBACK_ORDER.includes(configured)) {
    return configured;
  }
  return 'gemini'; // Default
}
