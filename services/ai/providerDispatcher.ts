/**
 * Provider Dispatcher Utility
 *
 * Centralizes AI provider dispatch logic to eliminate duplicate switch statements
 * across the codebase. Use this instead of writing switch (businessInfo.aiProvider)
 * everywhere.
 *
 * Usage:
 * ```typescript
 * import { dispatchToProvider } from './providerDispatcher';
 *
 * const result = await dispatchToProvider(businessInfo, {
 *   gemini: () => geminiService.generateText(...),
 *   openai: () => openAiService.generateText(...),
 *   anthropic: () => anthropicService.generateText(...),
 *   perplexity: () => perplexityService.generateText(...),
 *   openrouter: () => openRouterService.generateText(...),
 * });
 * ```
 */

import type { BusinessInfo } from '../../types';

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'perplexity' | 'openrouter';

/**
 * Provider handlers map - defines a function for each provider
 */
export interface ProviderHandlers<T> {
  gemini: () => T | Promise<T>;
  openai?: () => T | Promise<T>;
  anthropic?: () => T | Promise<T>;
  perplexity?: () => T | Promise<T>;
  openrouter?: () => T | Promise<T>;
}

/**
 * Dispatch to the appropriate AI provider based on businessInfo.aiProvider
 *
 * @param businessInfo - Contains the aiProvider setting
 * @param handlers - Map of provider-specific handler functions
 * @returns Result from the selected provider handler
 * @throws Error if provider is not supported or handler is not provided
 */
export async function dispatchToProvider<T>(
  businessInfo: BusinessInfo,
  handlers: ProviderHandlers<T>
): Promise<T> {
  const provider = businessInfo.aiProvider as AIProvider;

  switch (provider) {
    case 'openai':
      if (handlers.openai) return handlers.openai();
      break;
    case 'anthropic':
      if (handlers.anthropic) return handlers.anthropic();
      break;
    case 'perplexity':
      if (handlers.perplexity) return handlers.perplexity();
      break;
    case 'openrouter':
      if (handlers.openrouter) return handlers.openrouter();
      break;
    case 'gemini':
    default:
      return handlers.gemini();
  }

  // Fallback to gemini if specific handler not provided
  return handlers.gemini();
}

/**
 * Synchronous version for non-async handlers
 */
export function dispatchToProviderSync<T>(
  businessInfo: BusinessInfo,
  handlers: ProviderHandlers<T>
): T {
  const provider = businessInfo.aiProvider as AIProvider;

  switch (provider) {
    case 'openai':
      if (handlers.openai) return handlers.openai() as T;
      break;
    case 'anthropic':
      if (handlers.anthropic) return handlers.anthropic() as T;
      break;
    case 'perplexity':
      if (handlers.perplexity) return handlers.perplexity() as T;
      break;
    case 'openrouter':
      if (handlers.openrouter) return handlers.openrouter() as T;
      break;
    case 'gemini':
    default:
      return handlers.gemini() as T;
  }

  // Fallback to gemini if specific handler not provided
  return handlers.gemini() as T;
}

/**
 * Get the generateText function for the current provider
 *
 * This is a convenience function for the most common dispatch pattern.
 * Import the services at call site to avoid circular dependencies.
 */
export function getGenerateTextFunction(
  businessInfo: BusinessInfo,
  services: {
    gemini: { generateText: Function };
    openai?: { generateText: Function };
    anthropic?: { generateText: Function };
    perplexity?: { generateText: Function };
    openrouter?: { generateText: Function };
  }
): Function {
  const provider = businessInfo.aiProvider as AIProvider;

  switch (provider) {
    case 'openai':
      return services.openai?.generateText || services.gemini.generateText;
    case 'anthropic':
      return services.anthropic?.generateText || services.gemini.generateText;
    case 'perplexity':
      return services.perplexity?.generateText || services.gemini.generateText;
    case 'openrouter':
      return services.openrouter?.generateText || services.gemini.generateText;
    case 'gemini':
    default:
      return services.gemini.generateText;
  }
}

/**
 * Check if a provider is available (has an API key configured)
 */
export function isProviderConfigured(businessInfo: BusinessInfo): boolean {
  const provider = businessInfo.aiProvider as AIProvider;

  switch (provider) {
    case 'openai':
      return !!businessInfo.openAiApiKey;
    case 'anthropic':
      return !!businessInfo.anthropicApiKey;
    case 'perplexity':
      return !!businessInfo.perplexityApiKey;
    case 'openrouter':
      return !!businessInfo.openRouterApiKey;
    case 'gemini':
    default:
      return !!businessInfo.geminiApiKey;
  }
}

/**
 * Get all configured providers
 */
export function getConfiguredProviders(businessInfo: BusinessInfo): AIProvider[] {
  const providers: AIProvider[] = [];

  if (businessInfo.geminiApiKey) providers.push('gemini');
  if (businessInfo.openAiApiKey) providers.push('openai');
  if (businessInfo.anthropicApiKey) providers.push('anthropic');
  if (businessInfo.perplexityApiKey) providers.push('perplexity');
  if (businessInfo.openRouterApiKey) providers.push('openrouter');

  return providers;
}
