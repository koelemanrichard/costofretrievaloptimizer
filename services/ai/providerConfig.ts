// services/ai/providerConfig.ts
// Re-exports from the unified service registry for backward compatibility.
//
// @deprecated — New code should import directly from 'config/serviceRegistry'.

import { BusinessInfo } from '../../types';
import {
  SERVICE_REGISTRY,
  getValidModels,
  getDefaultModel,
  getFastModel,
  getModelForPrompt as _getModelForPrompt,
  isValidModel as _isValidModel,
  type AIProvider,
} from '../../config/serviceRegistry';

/**
 * Valid model IDs per provider
 * @deprecated Import { getValidModels } from 'config/serviceRegistry'
 */
export const VALID_MODELS = {
  anthropic: SERVICE_REGISTRY.providers.anthropic.models.valid,
  openai: SERVICE_REGISTRY.providers.openai.models.valid,
  gemini: SERVICE_REGISTRY.providers.gemini.models.valid,
  perplexity: SERVICE_REGISTRY.providers.perplexity.models.valid,
  openrouter: SERVICE_REGISTRY.providers.openrouter.models.valid,
} as const;

/**
 * Default model per provider
 * @deprecated Import { getDefaultModel } from 'config/serviceRegistry'
 */
export const DEFAULT_MODELS = {
  anthropic: getDefaultModel('anthropic'),
  openai: getDefaultModel('openai'),
  gemini: getDefaultModel('gemini'),
  perplexity: getDefaultModel('perplexity'),
  openrouter: getDefaultModel('openrouter'),
} as const;

/**
 * Fast/cheap models per provider
 * @deprecated Import { getFastModel } from 'config/serviceRegistry'
 */
export const FAST_MODELS = {
  anthropic: getFastModel('anthropic'),
  openai: getFastModel('openai'),
  gemini: getFastModel('gemini'),
  perplexity: getFastModel('perplexity'),
  openrouter: getFastModel('openrouter'),
} as const;

/**
 * Fallback order when primary provider fails
 */
export const FALLBACK_ORDER = SERVICE_REGISTRY.fallbackOrder;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = SERVICE_REGISTRY.retry;

/**
 * Timeout configuration (in milliseconds)
 */
export const TIMEOUT_CONFIG = {
  default: SERVICE_REGISTRY.limits.timeout.default,
  largePrompt: SERVICE_REGISTRY.limits.timeout.largePrompt,
  edgeFunction: SERVICE_REGISTRY.limits.timeout.edgeFunction,
} as const;

/**
 * Provider type
 */
export type Provider = AIProvider;

/**
 * Check if a model is valid for a provider
 */
export function isValidModel(provider: Provider, model: string): boolean {
  return _isValidModel(provider, model);
}

/**
 * Get the best model for a provider based on prompt size
 */
export function getModelForPrompt(provider: Provider, promptLength: number, configuredModel?: string): string {
  return _getModelForPrompt(provider, promptLength, configuredModel);
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

// Re-export registry functions for convenience
export { getValidModels, getDefaultModel, getFastModel };
