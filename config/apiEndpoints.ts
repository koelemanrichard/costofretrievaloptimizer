/**
 * Centralized API Endpoints
 *
 * @deprecated Import from `config/serviceRegistry.ts` instead for new code.
 * This file is a backward-compatible re-export facade.
 * All URLs are now sourced from the unified service registry.
 *
 * Note: API keys are managed separately via import.meta.env.VITE_* variables.
 */

import { buildApiEndpoints } from './serviceRegistry';

const _endpoints = buildApiEndpoints();

export const API_ENDPOINTS = {
  // --- AI Providers ---
  ANTHROPIC: _endpoints.ANTHROPIC,
  OPENAI: _endpoints.OPENAI,
  OPENROUTER: _endpoints.OPENROUTER,
  OPENROUTER_MODELS: _endpoints.OPENROUTER_MODELS,
  PERPLEXITY: _endpoints.PERPLEXITY,
  /** @deprecated Use SERVICE_REGISTRY.providers.gemini.endpoints.generateContent */
  GEMINI: _endpoints.GEMINI,
  /** @deprecated Use SERVICE_REGISTRY.providers.gemini.endpoints.generateContentBeta */
  GEMINI_BETA: _endpoints.GEMINI_BETA,

  // --- Content & Scraping ---
  APIFY: _endpoints.APIFY,
  FIRECRAWL_SCRAPE: _endpoints.FIRECRAWL_SCRAPE,
  FIRECRAWL_SCRAPE_V0: _endpoints.FIRECRAWL_SCRAPE_V0,
  JINA_READER: _endpoints.JINA_READER,

  // --- Search & SEO ---
  SPACESERP: _endpoints.SPACESERP,
  DATAFORSEO_SERP: _endpoints.DATAFORSEO_SERP,
  DATAFORSEO_SEARCH_VOLUME: _endpoints.DATAFORSEO_SEARCH_VOLUME,

  // --- Media & Assets ---
  CLOUDINARY: _endpoints.CLOUDINARY,
  MARKUPGO: _endpoints.MARKUPGO,
} as const;

export type ApiEndpointKey = keyof typeof API_ENDPOINTS;
