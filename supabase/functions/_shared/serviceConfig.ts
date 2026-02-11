/**
 * Service Configuration for Edge Functions (Deno)
 *
 * MIRROR of config/serviceRegistry.ts — edge functions cannot import from the main codebase.
 * IMPORTANT: Keep in sync with config/serviceRegistry.ts when updating models, pricing, or URLs.
 *
 * Updated: February 2026
 */

// ============================================================================
// API Endpoints
// ============================================================================

export const ENDPOINTS = {
  ANTHROPIC: 'https://api.anthropic.com/v1/messages',
  OPENAI: 'https://api.openai.com/v1/chat/completions',
  GEMINI: 'https://generativelanguage.googleapis.com/v1/models/',
  GEMINI_BETA: 'https://generativelanguage.googleapis.com/v1beta/models/',
  PERPLEXITY: 'https://api.perplexity.ai/chat/completions',
  OPENROUTER: 'https://openrouter.ai/api/v1/chat/completions',
  APIFY: 'https://api.apify.com/v2',
  FIRECRAWL_SCRAPE: 'https://api.firecrawl.dev/v1/scrape',
  FIRECRAWL_SCRAPE_V0: 'https://api.firecrawl.dev/v0/scrape',
} as const;

// ============================================================================
// Default Models
// ============================================================================

export const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-4-5-20250929',
  openai: 'gpt-5.1',
  gemini: 'gemini-3-pro-preview',
  perplexity: 'sonar-pro',
} as const;

export const FAST_MODELS = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-5-mini',
  gemini: 'gemini-2.5-flash',
  perplexity: 'llama-3.1-sonar-small-128k-online',
} as const;

// ============================================================================
// Pricing (per 1K tokens, USD) — provider:model keyed
// ============================================================================

export const PRICING_RATES: Record<string, { inputPer1k: number; outputPer1k: number }> = {
  // Anthropic
  'anthropic:claude-opus-4-5-20251101':   { inputPer1k: 0.015,   outputPer1k: 0.075 },
  'anthropic:claude-sonnet-4-5-20250929': { inputPer1k: 0.003,   outputPer1k: 0.015 },
  'anthropic:claude-haiku-4-5-20251001':  { inputPer1k: 0.001,   outputPer1k: 0.005 },
  'anthropic:claude-opus-4-1-20250805':   { inputPer1k: 0.015,   outputPer1k: 0.075 },
  'anthropic:claude-sonnet-4-20250514':   { inputPer1k: 0.003,   outputPer1k: 0.015 },
  'anthropic:claude-opus-4-20250514':     { inputPer1k: 0.015,   outputPer1k: 0.075 },
  'anthropic:claude-3-7-sonnet-20250219': { inputPer1k: 0.003,   outputPer1k: 0.015 },
  'anthropic:claude-3-5-haiku-20241022':  { inputPer1k: 0.001,   outputPer1k: 0.005 },
  'anthropic:claude-3-haiku-20240307':    { inputPer1k: 0.00025, outputPer1k: 0.00125 },
  // Legacy keys for backward compatibility
  'anthropic:claude-3-opus-20240229':     { inputPer1k: 0.015,   outputPer1k: 0.075 },
  'anthropic:claude-3-sonnet-20240229':   { inputPer1k: 0.003,   outputPer1k: 0.015 },
  'anthropic:claude-3-5-sonnet-20241022': { inputPer1k: 0.003,   outputPer1k: 0.015 },

  // OpenAI
  'openai:gpt-5.1':       { inputPer1k: 0.005,   outputPer1k: 0.015 },
  'openai:gpt-5':         { inputPer1k: 0.005,   outputPer1k: 0.015 },
  'openai:gpt-5-mini':    { inputPer1k: 0.0003,  outputPer1k: 0.0012 },
  'openai:gpt-5-nano':    { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  'openai:gpt-4.1':       { inputPer1k: 0.002,   outputPer1k: 0.008 },
  'openai:gpt-4.1-mini':  { inputPer1k: 0.0004,  outputPer1k: 0.0016 },
  'openai:gpt-4.1-nano':  { inputPer1k: 0.0001,  outputPer1k: 0.0004 },
  'openai:gpt-4-turbo':   { inputPer1k: 0.01,    outputPer1k: 0.03 },
  'openai:gpt-4o':        { inputPer1k: 0.005,   outputPer1k: 0.015 },
  'openai:gpt-4o-mini':   { inputPer1k: 0.00015, outputPer1k: 0.0006 },

  // Google / Gemini
  'google:gemini-3-pro-preview':  { inputPer1k: 0.00125, outputPer1k: 0.005 },
  'google:gemini-2.5-flash':      { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  'google:gemini-2.5-flash-lite': { inputPer1k: 0.0001,  outputPer1k: 0.0004 },
  'google:gemini-2.5-pro':        { inputPer1k: 0.00125, outputPer1k: 0.005 },
  'google:gemini-2.0-flash':      { inputPer1k: 0.0001,  outputPer1k: 0.0004 },
  'google:gemini-1.5-pro':        { inputPer1k: 0.00125, outputPer1k: 0.005 },
  'google:gemini-1.5-flash':      { inputPer1k: 0.000075, outputPer1k: 0.0003 },

  // Perplexity
  'perplexity:sonar-pro':                         { inputPer1k: 0.003,  outputPer1k: 0.015 },
  'perplexity:llama-3.1-sonar-large-128k-online':  { inputPer1k: 0.001,  outputPer1k: 0.001 },
  'perplexity:llama-3.1-sonar-small-128k-online':  { inputPer1k: 0.0002, outputPer1k: 0.0002 },
};

/**
 * Calculate estimated cost (fallback when DB lookup fails).
 */
export function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const key = `${provider}:${model}`;
  const rates = PRICING_RATES[key];

  if (!rates) {
    // Default fallback
    return (inputTokens / 1000) * 0.002 + (outputTokens / 1000) * 0.006;
  }

  return (inputTokens / 1000) * rates.inputPer1k + (outputTokens / 1000) * rates.outputPer1k;
}
