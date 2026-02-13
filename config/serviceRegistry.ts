/**
 * Unified Service Registry
 *
 * SINGLE SOURCE OF TRUTH for all external service configuration:
 * - AI model lists, defaults, and fast models
 * - API endpoint URLs
 * - Operational limits (max tokens, batch sizes, timeouts)
 * - Pricing (per 1K tokens for AI, per-request for services)
 *
 * Updated: February 2026
 *
 * HOW TO UPDATE:
 *   1. Edit this file
 *   2. Mirror changes to supabase/functions/_shared/serviceConfig.ts (Deno edge functions)
 *   3. Run `npx tsc --noEmit && npx vitest run config/__tests__/serviceRegistry.test.ts`
 */

// ============================================================================
// Types
// ============================================================================

export type AIProvider = 'anthropic' | 'gemini' | 'openai' | 'perplexity' | 'openrouter';
export type ServiceName = 'dataforseo' | 'spaceserp' | 'apify' | 'firecrawl' | 'jina' | 'cloudinary' | 'markupgo';

export interface ProviderModels {
  /** All valid model IDs accepted by this provider */
  valid: readonly string[];
  /** Default model for standard operations */
  default: string;
  /** Fast/cheap model for high-throughput or large prompts */
  fast: string;
}

export interface ProviderEndpoints {
  [name: string]: string;
}

export interface ProviderLimits {
  maxTokens: {
    default: number;
    contentGeneration: number;
    briefGeneration: number;
    suggestion: number;
    designAnalysis: number;
    visionValidation: number;
  };
  batchSize: {
    default: number;
    topicClassification: number;
    orchestrator: number;
  };
  timeout: {
    default: number;
    largePrompt: number;
    edgeFunction: number;
  };
  temperature: {
    default: number;
    designAnalysis: number;
    creative: number;
    precise: number;
  };
  topicMap: {
    optimalMax: number;
    warningThreshold: number;
    performanceRisk: number;
    splitAdvisory: number;
    promptFullMax: number;
    promptPairSampleMax: number;
    graphViewMax: number;
    listViewPageSize: number;
  };
}

export interface PricingRate {
  /** Cost per 1K input tokens (USD) */
  in: number;
  /** Cost per 1K output tokens (USD) */
  out: number;
}

export interface ProviderConfig {
  models: ProviderModels;
  endpoints: ProviderEndpoints;
  pricing: Record<string, PricingRate>;
}

export interface ServiceConfig {
  endpoints: ProviderEndpoints;
  pricing: Record<string, PricingRate>;
}

// ============================================================================
// AI Provider Configuration
// ============================================================================

const anthropic: ProviderConfig = {
  models: {
    valid: [
      // Claude 4.5 models (Latest - November 2025)
      'claude-opus-4-5-20251101',
      'claude-sonnet-4-5-20250929',
      'claude-haiku-4-5-20251001',
      // Claude 4.x models (Legacy)
      'claude-opus-4-1-20250805',
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
      'claude-3-7-sonnet-20250219',
      // Claude 3.5 models (Legacy)
      'claude-3-5-haiku-20241022',
      'claude-3-haiku-20240307',
    ],
    default: 'claude-sonnet-4-5-20250929',
    fast: 'claude-haiku-4-5-20251001',
  },
  endpoints: {
    messages: 'https://api.anthropic.com/v1/messages',
  },
  pricing: {
    'claude-opus-4-5-20251101':   { in: 0.015,   out: 0.075 },
    'claude-sonnet-4-5-20250929': { in: 0.003,   out: 0.015 },
    'claude-haiku-4-5-20251001':  { in: 0.001,   out: 0.005 },
    'claude-opus-4-1-20250805':   { in: 0.015,   out: 0.075 },
    'claude-sonnet-4-20250514':   { in: 0.003,   out: 0.015 },
    'claude-opus-4-20250514':     { in: 0.015,   out: 0.075 },
    'claude-3-7-sonnet-20250219': { in: 0.003,   out: 0.015 },
    'claude-3-5-haiku-20241022':  { in: 0.001,   out: 0.005 },
    'claude-3-haiku-20240307':    { in: 0.00025, out: 0.00125 },
  },
};

const openai: ProviderConfig = {
  models: {
    valid: [
      // GPT-5 series (Latest)
      'gpt-5.1',
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      // GPT-4.1 series
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      // Image generation models
      'gpt-image-1',
      // Reasoning models
      'o3',
      'o4-mini',
      'o4-mini-high',
      // Legacy
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
    ],
    default: 'gpt-5.1',
    fast: 'gpt-5-mini',
  },
  endpoints: {
    chat: 'https://api.openai.com/v1/chat/completions',
  },
  pricing: {
    'gpt-5.1':       { in: 0.005,   out: 0.015 },
    'gpt-5':         { in: 0.005,   out: 0.015 },
    'gpt-5-mini':    { in: 0.0003,  out: 0.0012 },
    'gpt-5-nano':    { in: 0.00015, out: 0.0006 },
    'gpt-4.1':       { in: 0.002,   out: 0.008 },
    'gpt-4.1-mini':  { in: 0.0004,  out: 0.0016 },
    'gpt-4.1-nano':  { in: 0.0001,  out: 0.0004 },
    'gpt-image-1':   { in: 0.01,    out: 0.04 },  // Per-image pricing (~$0.04/image at medium quality)
    'o3':            { in: 0.01,    out: 0.04 },
    'o4-mini':       { in: 0.001,   out: 0.004 },
    'o4-mini-high':  { in: 0.001,   out: 0.004 },
    'gpt-4o':        { in: 0.005,   out: 0.015 },
    'gpt-4o-mini':   { in: 0.00015, out: 0.0006 },
    'gpt-4-turbo':   { in: 0.01,    out: 0.03 },
    'gpt-4':         { in: 0.03,    out: 0.06 },
    'gpt-3.5-turbo': { in: 0.0005,  out: 0.0015 },
  },
};

const gemini: ProviderConfig = {
  models: {
    valid: [
      // Gemini 3 series (Latest - November 2025)
      'gemini-3-pro-preview',
      'gemini-3-pro-image-preview',
      // Gemini 2.5 series (Production)
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-2.5-pro',
      'gemini-2.5-flash-preview-09-2025',
      'gemini-2.5-flash-lite-preview-09-2025',
      // Gemini 2.0 series (Legacy)
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash-lite',
    ],
    default: 'gemini-3-pro-preview',
    fast: 'gemini-2.5-flash',
  },
  endpoints: {
    generateContent: 'https://generativelanguage.googleapis.com/v1/models/',
    generateContentBeta: 'https://generativelanguage.googleapis.com/v1beta/models/',
  },
  pricing: {
    'gemini-3-pro-preview':       { in: 0.00125, out: 0.005 },
    'gemini-3-pro-image-preview': { in: 0.00125, out: 0.005 },
    'gemini-2.5-flash':           { in: 0.00015, out: 0.0006 },
    'gemini-2.5-flash-lite':      { in: 0.0001,  out: 0.0004 },
    'gemini-2.5-pro':             { in: 0.00125, out: 0.005 },
    'gemini-2.5-flash-preview-09-2025':      { in: 0.00015, out: 0.0006 },
    'gemini-2.5-flash-lite-preview-09-2025': { in: 0.0001,  out: 0.0004 },
    'gemini-2.0-flash':           { in: 0.0001,  out: 0.0004 },
    'gemini-2.0-flash-exp':       { in: 0.0001,  out: 0.0004 },
    'gemini-2.0-flash-lite':      { in: 0.0001,  out: 0.0004 },
  },
};

const perplexity: ProviderConfig = {
  models: {
    valid: [
      'sonar-pro',
      'llama-3.1-sonar-large-128k-online',
      'llama-3.1-sonar-small-128k-online',
    ],
    default: 'sonar-pro',
    fast: 'llama-3.1-sonar-small-128k-online',
  },
  endpoints: {
    chat: 'https://api.perplexity.ai/chat/completions',
  },
  pricing: {
    'sonar-pro':                           { in: 0.003, out: 0.015 },
    'llama-3.1-sonar-large-128k-online':   { in: 0.001, out: 0.001 },
    'llama-3.1-sonar-small-128k-online':   { in: 0.0002, out: 0.0002 },
  },
};

const openrouter: ProviderConfig = {
  models: {
    valid: [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'google/gemini-pro-1.5',
    ],
    default: 'anthropic/claude-3.5-sonnet',
    fast: 'openai/gpt-4o-mini',
  },
  endpoints: {
    chat: 'https://openrouter.ai/api/v1/chat/completions',
    models: 'https://openrouter.ai/api/v1/models',
  },
  pricing: {
    'anthropic/claude-3.5-sonnet': { in: 0.003,   out: 0.015 },
    'openai/gpt-4o':               { in: 0.005,   out: 0.015 },
    'openai/gpt-4o-mini':          { in: 0.00015, out: 0.0006 },
    'google/gemini-pro-1.5':       { in: 0.00125, out: 0.005 },
  },
};

// ============================================================================
// Non-AI Service Configuration
// ============================================================================

const dataforseo: ServiceConfig = {
  endpoints: {
    serp: 'https://api.dataforseo.com/v3/serp/google/organic/live/advanced',
    searchVolume: 'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live',
  },
  pricing: {
    serp:         { in: 0, out: 0.02 },   // ~$0.02 per SERP request
    searchVolume: { in: 0, out: 0.005 },   // ~$0.005 per search volume lookup
  },
};

const spaceserp: ServiceConfig = {
  endpoints: {
    search: 'https://api.spaceserp.com',
  },
  pricing: {
    search: { in: 0, out: 0.005 },  // ~$0.005 per search
  },
};

const apify: ServiceConfig = {
  endpoints: {
    base: 'https://api.apify.com/v2',
  },
  pricing: {
    'playwright-scraper':       { in: 0, out: 0.40 },
    'google-search-scraper':    { in: 0, out: 0.05 },
    'web-scraper':              { in: 0, out: 0.10 },
    'website-content-crawler':  { in: 0, out: 0.20 },
  },
};

const firecrawl: ServiceConfig = {
  endpoints: {
    scrape: 'https://api.firecrawl.dev/v1/scrape',
    scrapeV0: 'https://api.firecrawl.dev/v0/scrape',
  },
  pricing: {
    scrape: { in: 0, out: 0.01 },  // ~$0.01 per scrape
  },
};

const jina: ServiceConfig = {
  endpoints: {
    reader: 'https://r.jina.ai/',
  },
  pricing: {
    read: { in: 0, out: 0.001 },  // ~$0.001 per read
  },
};

const cloudinary: ServiceConfig = {
  endpoints: {
    upload: 'https://api.cloudinary.com/v1_1',
  },
  pricing: {
    upload: { in: 0, out: 0.002 },  // ~$0.002 per upload (varies by plan)
  },
};

const markupgo: ServiceConfig = {
  endpoints: {
    image: 'https://api.markupgo.com/api/v1/image',
  },
  pricing: {
    screenshot: { in: 0, out: 0.005 },
  },
};

// ============================================================================
// Shared Operational Limits
// ============================================================================

const limits: ProviderLimits = {
  maxTokens: {
    default: 8192,
    contentGeneration: 32768,
    briefGeneration: 32768,
    suggestion: 2048,
    designAnalysis: 4096,
    visionValidation: 1024,
  },
  batchSize: {
    default: 30,
    topicClassification: 20,
    orchestrator: 8,
  },
  timeout: {
    default: 120_000,      // 2 minutes
    largePrompt: 180_000,  // 3 minutes
    edgeFunction: 55_000,  // Supabase edge function limit
  },
  temperature: {
    default: 0.7,
    designAnalysis: 0.3,
    creative: 0.8,
    precise: 0.1,
  },
  topicMap: {
    optimalMax: 150,           // Ideal maximum for Holistic SEO
    warningThreshold: 200,     // Soft warning
    performanceRisk: 350,      // Performance degrades
    splitAdvisory: 500,        // Strong recommendation to split
    promptFullMax: 100,        // Full serialization in prompts
    promptPairSampleMax: 200,  // Max semantic pairs to sample
    graphViewMax: 200,         // Max topics for graph rendering
    listViewPageSize: 50,      // Progressive loading chunk
  },
};

// ============================================================================
// Service Registry (main export)
// ============================================================================

export const SERVICE_REGISTRY = {
  providers: {
    anthropic,
    openai,
    gemini,
    perplexity,
    openrouter,
  } as Record<AIProvider, ProviderConfig>,

  services: {
    dataforseo,
    spaceserp,
    apify,
    firecrawl,
    jina,
    cloudinary,
    markupgo,
  } as Record<ServiceName, ServiceConfig>,

  limits,

  /** Provider fallback order when primary fails */
  fallbackOrder: ['anthropic', 'openai', 'gemini', 'openrouter', 'perplexity'] as readonly AIProvider[],

  /** Retry configuration */
  retry: {
    maxRetries: 2,
    baseDelayMs: 2000,
    maxDelayMs: 8000,
    largePromptThreshold: 40_000,
  },
} as const;

// ============================================================================
// Accessor Functions
// ============================================================================

/** Get the list of valid model IDs for a provider */
export function getValidModels(provider: AIProvider): readonly string[] {
  return SERVICE_REGISTRY.providers[provider].models.valid;
}

/** Check if a model ID is valid for a provider */
export function isValidModel(provider: AIProvider, model: string): boolean {
  return SERVICE_REGISTRY.providers[provider].models.valid.includes(model);
}

/** Get the default model for a provider */
export function getDefaultModel(provider: AIProvider): string {
  return SERVICE_REGISTRY.providers[provider].models.default;
}

/** Get the fast/cheap model for a provider */
export function getFastModel(provider: AIProvider): string {
  return SERVICE_REGISTRY.providers[provider].models.fast;
}

/** Get the best model for a prompt based on size */
export function getModelForPrompt(provider: AIProvider, promptLength: number, configuredModel?: string): string {
  if (promptLength > SERVICE_REGISTRY.retry.largePromptThreshold) {
    return getFastModel(provider);
  }
  if (configuredModel && isValidModel(provider, configuredModel)) {
    return configuredModel;
  }
  return getDefaultModel(provider);
}

/** Get an API endpoint URL for a provider */
export function getProviderEndpoint(provider: AIProvider, name: string): string {
  const endpoint = SERVICE_REGISTRY.providers[provider].endpoints[name];
  if (!endpoint) {
    throw new Error(`Unknown endpoint '${name}' for provider '${provider}'`);
  }
  return endpoint;
}

/** Get an API endpoint URL for a non-AI service */
export function getServiceEndpoint(service: ServiceName, name: string): string {
  const endpoint = SERVICE_REGISTRY.services[service].endpoints[name];
  if (!endpoint) {
    throw new Error(`Unknown endpoint '${name}' for service '${service}'`);
  }
  return endpoint;
}

/** Get pricing rate for a model (per 1K tokens) */
export function getModelPricing(provider: AIProvider, model: string): PricingRate {
  const rate = SERVICE_REGISTRY.providers[provider].pricing[model];
  if (rate) return rate;
  // Fall back to default model pricing
  const defaultModel = getDefaultModel(provider);
  return SERVICE_REGISTRY.providers[provider].pricing[defaultModel] || { in: 0.001, out: 0.002 };
}

/** Get pricing rate for a non-AI service operation */
export function getServicePricing(service: ServiceName, operation: string): PricingRate {
  const rate = SERVICE_REGISTRY.services[service].pricing[operation];
  if (rate) return rate;
  return { in: 0, out: 0.01 }; // Fallback
}

/**
 * Calculate cost in USD from token counts.
 * Works for both AI models and non-AI services.
 */
export function calculateCost(provider: AIProvider | ServiceName, modelOrOperation: string, tokensIn: number, tokensOut: number): number {
  const isAIProvider = provider in SERVICE_REGISTRY.providers;
  const rate = isAIProvider
    ? getModelPricing(provider as AIProvider, modelOrOperation)
    : getServicePricing(provider as ServiceName, modelOrOperation);
  return (tokensIn / 1000 * rate.in) + (tokensOut / 1000 * rate.out);
}

/**
 * Build a flat pricing lookup table (model → {in, out}).
 * Used by telemetryService.ts for backward-compatible cost calculation.
 */
export function buildFlatPricingTable(): Record<string, PricingRate> {
  const table: Record<string, PricingRate> = {};

  // AI provider models
  for (const [, config] of Object.entries(SERVICE_REGISTRY.providers)) {
    for (const [model, rate] of Object.entries(config.pricing)) {
      table[model] = rate;
    }
  }

  // Apify actors (legacy format: 'apify/<actor>')
  for (const [operation, rate] of Object.entries(SERVICE_REGISTRY.services.apify.pricing)) {
    table[`apify/${operation}`] = rate;
  }

  // Fallback
  table['default'] = { in: 0.001, out: 0.002 };

  return table;
}

/**
 * Build a provider-prefixed pricing lookup table (provider:model → {inputPer1k, outputPer1k}).
 * Used by edge function usage.ts for backward-compatible cost calculation.
 */
export function buildPrefixedPricingTable(): Record<string, { inputPer1k: number; outputPer1k: number }> {
  const table: Record<string, { inputPer1k: number; outputPer1k: number }> = {};

  for (const [providerName, config] of Object.entries(SERVICE_REGISTRY.providers)) {
    // Normalize provider name for edge function compatibility
    const prefix = providerName === 'gemini' ? 'google' : providerName;
    for (const [model, rate] of Object.entries(config.pricing)) {
      table[`${prefix}:${model}`] = { inputPer1k: rate.in, outputPer1k: rate.out };
    }
  }

  return table;
}

/**
 * Build the legacy API_ENDPOINTS object shape for backward compatibility.
 */
export function buildApiEndpoints(): Record<string, string> {
  return {
    // AI Providers
    ANTHROPIC: anthropic.endpoints.messages,
    OPENAI: openai.endpoints.chat,
    OPENROUTER: openrouter.endpoints.chat,
    OPENROUTER_MODELS: openrouter.endpoints.models,
    PERPLEXITY: perplexity.endpoints.chat,
    // Gemini (new — not in legacy apiEndpoints.ts)
    GEMINI: gemini.endpoints.generateContent,
    GEMINI_BETA: gemini.endpoints.generateContentBeta,
    // Content & Scraping
    APIFY: apify.endpoints.base,
    FIRECRAWL_SCRAPE: firecrawl.endpoints.scrape,
    FIRECRAWL_SCRAPE_V0: firecrawl.endpoints.scrapeV0,
    JINA_READER: jina.endpoints.reader,
    // Search & SEO
    SPACESERP: spaceserp.endpoints.search,
    DATAFORSEO_SERP: dataforseo.endpoints.serp,
    DATAFORSEO_SEARCH_VOLUME: dataforseo.endpoints.searchVolume,
    // Media & Assets
    CLOUDINARY: cloudinary.endpoints.upload,
    MARKUPGO: markupgo.endpoints.image,
  };
}
