import { describe, it, expect } from 'vitest';
import {
  SERVICE_REGISTRY,
  getValidModels,
  isValidModel,
  getDefaultModel,
  getFastModel,
  getModelForPrompt,
  getProviderEndpoint,
  getServiceEndpoint,
  getModelPricing,
  getServicePricing,
  calculateCost,
  buildFlatPricingTable,
  buildPrefixedPricingTable,
  buildApiEndpoints,
  type AIProvider,
  type ServiceName,
} from '../serviceRegistry';

describe('Service Registry', () => {
  const aiProviders: AIProvider[] = ['anthropic', 'gemini', 'openai', 'perplexity', 'openrouter'];
  const services: ServiceName[] = ['dataforseo', 'spaceserp', 'apify', 'firecrawl', 'jina', 'cloudinary', 'markupgo'];

  describe('Provider configuration', () => {
    it('should have all 5 AI providers', () => {
      for (const p of aiProviders) {
        expect(SERVICE_REGISTRY.providers[p]).toBeDefined();
      }
    });

    it('should have non-empty valid model arrays for each provider', () => {
      for (const p of aiProviders) {
        expect(SERVICE_REGISTRY.providers[p].models.valid.length).toBeGreaterThan(0);
      }
    });

    it('should have default models that are in the valid list', () => {
      for (const p of aiProviders) {
        const config = SERVICE_REGISTRY.providers[p];
        expect(config.models.valid).toContain(config.models.default);
      }
    });

    it('should have fast models that are in the valid list', () => {
      for (const p of aiProviders) {
        const config = SERVICE_REGISTRY.providers[p];
        expect(config.models.valid).toContain(config.models.fast);
      }
    });

    it('should have at least one endpoint per provider', () => {
      for (const p of aiProviders) {
        expect(Object.keys(SERVICE_REGISTRY.providers[p].endpoints).length).toBeGreaterThan(0);
      }
    });

    it('should have pricing for every valid model', () => {
      for (const p of aiProviders) {
        const config = SERVICE_REGISTRY.providers[p];
        for (const model of config.models.valid) {
          expect(config.pricing[model], `Missing pricing for ${p}:${model}`).toBeDefined();
        }
      }
    });

    it('should have all endpoint URLs as valid HTTPS URLs', () => {
      for (const p of aiProviders) {
        for (const [name, url] of Object.entries(SERVICE_REGISTRY.providers[p].endpoints)) {
          expect(() => new URL(url), `${p}.${name} should be a valid URL`).not.toThrow();
          expect(url.startsWith('https://'), `${p}.${name} should use HTTPS`).toBe(true);
        }
      }
    });
  });

  describe('Service configuration', () => {
    it('should have all 7 services', () => {
      for (const s of services) {
        expect(SERVICE_REGISTRY.services[s]).toBeDefined();
      }
    });

    it('should have at least one endpoint per service', () => {
      for (const s of services) {
        expect(Object.keys(SERVICE_REGISTRY.services[s].endpoints).length).toBeGreaterThan(0);
      }
    });

    it('should have at least one pricing entry per service', () => {
      for (const s of services) {
        expect(Object.keys(SERVICE_REGISTRY.services[s].pricing).length).toBeGreaterThan(0);
      }
    });

    it('should have all service endpoint URLs as valid HTTPS URLs', () => {
      for (const s of services) {
        for (const [name, url] of Object.entries(SERVICE_REGISTRY.services[s].endpoints)) {
          expect(() => new URL(url), `${s}.${name} should be a valid URL`).not.toThrow();
          expect(url.startsWith('https://'), `${s}.${name} should use HTTPS`).toBe(true);
        }
      }
    });
  });

  describe('Limits', () => {
    it('should have sensible max token defaults', () => {
      expect(SERVICE_REGISTRY.limits.maxTokens.default).toBe(8192);
      expect(SERVICE_REGISTRY.limits.maxTokens.contentGeneration).toBe(32768);
      expect(SERVICE_REGISTRY.limits.maxTokens.suggestion).toBe(2048);
    });

    it('should have sensible batch sizes', () => {
      expect(SERVICE_REGISTRY.limits.batchSize.default).toBe(30);
      expect(SERVICE_REGISTRY.limits.batchSize.topicClassification).toBe(20);
      expect(SERVICE_REGISTRY.limits.batchSize.orchestrator).toBe(8);
    });

    it('should have sensible timeouts', () => {
      expect(SERVICE_REGISTRY.limits.timeout.default).toBe(120_000);
      expect(SERVICE_REGISTRY.limits.timeout.largePrompt).toBe(180_000);
      expect(SERVICE_REGISTRY.limits.timeout.edgeFunction).toBe(55_000);
    });
  });

  describe('Accessor functions', () => {
    it('getValidModels returns the provider model array', () => {
      const models = getValidModels('anthropic');
      expect(models).toContain('claude-sonnet-4-5-20250929');
    });

    it('isValidModel returns true for valid models', () => {
      expect(isValidModel('anthropic', 'claude-sonnet-4-5-20250929')).toBe(true);
      expect(isValidModel('anthropic', 'nonexistent-model')).toBe(false);
    });

    it('getDefaultModel returns the default for each provider', () => {
      expect(getDefaultModel('anthropic')).toBe('claude-sonnet-4-5-20250929');
      expect(getDefaultModel('gemini')).toBe('gemini-3-pro-preview');
      expect(getDefaultModel('openai')).toBe('gpt-5.1');
      expect(getDefaultModel('perplexity')).toBe('sonar-pro');
    });

    it('getFastModel returns the fast model for each provider', () => {
      expect(getFastModel('anthropic')).toBe('claude-haiku-4-5-20251001');
      expect(getFastModel('gemini')).toBe('gemini-2.5-flash');
      expect(getFastModel('openai')).toBe('gpt-5-mini');
    });

    it('getModelForPrompt returns fast model for large prompts', () => {
      const model = getModelForPrompt('anthropic', 50000);
      expect(model).toBe('claude-haiku-4-5-20251001');
    });

    it('getModelForPrompt returns configured model for normal prompts', () => {
      const model = getModelForPrompt('anthropic', 1000, 'claude-opus-4-5-20251101');
      expect(model).toBe('claude-opus-4-5-20251101');
    });

    it('getModelForPrompt returns default for invalid configured model', () => {
      const model = getModelForPrompt('anthropic', 1000, 'invalid-model');
      expect(model).toBe('claude-sonnet-4-5-20250929');
    });

    it('getProviderEndpoint returns the correct URL', () => {
      expect(getProviderEndpoint('anthropic', 'messages')).toBe('https://api.anthropic.com/v1/messages');
    });

    it('getProviderEndpoint throws for unknown endpoint', () => {
      expect(() => getProviderEndpoint('anthropic', 'nonexistent')).toThrow();
    });

    it('getServiceEndpoint returns the correct URL', () => {
      expect(getServiceEndpoint('dataforseo', 'serp')).toContain('dataforseo.com');
    });

    it('getServiceEndpoint throws for unknown endpoint', () => {
      expect(() => getServiceEndpoint('dataforseo', 'nonexistent')).toThrow();
    });
  });

  describe('Pricing functions', () => {
    it('getModelPricing returns correct rates', () => {
      const rate = getModelPricing('anthropic', 'claude-sonnet-4-5-20250929');
      expect(rate.in).toBe(0.003);
      expect(rate.out).toBe(0.015);
    });

    it('getModelPricing falls back for unknown models', () => {
      const rate = getModelPricing('anthropic', 'nonexistent');
      expect(rate.in).toBeGreaterThan(0);
    });

    it('getServicePricing returns correct rates', () => {
      const rate = getServicePricing('dataforseo', 'serp');
      expect(rate.out).toBeGreaterThan(0);
    });

    it('calculateCost produces positive cost for tokens', () => {
      const cost = calculateCost('anthropic', 'claude-sonnet-4-5-20250929', 1000, 500);
      expect(cost).toBeGreaterThan(0);
    });

    it('calculateCost works for services', () => {
      const cost = calculateCost('dataforseo', 'serp', 0, 1);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('SERVICE_REGISTRY.layoutEngine', () => {
    it('should have weights config', () => {
      expect(SERVICE_REGISTRY.layoutEngine).toBeDefined();
      expect(SERVICE_REGISTRY.layoutEngine.weights.base).toBe(3);
      expect(SERVICE_REGISTRY.layoutEngine.weights.max).toBe(5);
      expect(SERVICE_REGISTRY.layoutEngine.weights.min).toBe(1);
    });

    it('should have category bonuses matching attribute categories', () => {
      expect(SERVICE_REGISTRY.layoutEngine.weights.categoryBonuses.UNIQUE).toBe(2);
      expect(SERVICE_REGISTRY.layoutEngine.weights.categoryBonuses.RARE).toBe(1);
      expect(SERVICE_REGISTRY.layoutEngine.weights.categoryBonuses.ROOT).toBe(0.5);
      expect(SERVICE_REGISTRY.layoutEngine.weights.categoryBonuses.COMMON).toBe(0);
    });

    it('should have confidence thresholds', () => {
      expect(SERVICE_REGISTRY.layoutEngine.confidence.autoApplyThreshold).toBe(0.8);
      expect(SERVICE_REGISTRY.layoutEngine.confidence.fsCompliant).toBe(0.95);
    });

    it('should have image config', () => {
      expect(SERVICE_REGISTRY.layoutEngine.image.preferredFormats).toContain('avif');
      expect(SERVICE_REGISTRY.layoutEngine.image.maxFileSizeBytes).toBe(500000);
    });
  });

  describe('Backward-compatible builders', () => {
    it('buildFlatPricingTable includes all provider models', () => {
      const table = buildFlatPricingTable();
      expect(table['claude-sonnet-4-5-20250929']).toBeDefined();
      expect(table['gpt-5.1']).toBeDefined();
      expect(table['gemini-3-pro-preview']).toBeDefined();
      expect(table['default']).toBeDefined();
    });

    it('buildFlatPricingTable includes Apify actors', () => {
      const table = buildFlatPricingTable();
      expect(table['apify/playwright-scraper']).toBeDefined();
    });

    it('buildPrefixedPricingTable uses provider:model format', () => {
      const table = buildPrefixedPricingTable();
      expect(table['anthropic:claude-sonnet-4-5-20250929']).toBeDefined();
      // Gemini uses 'google' prefix for edge function compatibility
      expect(table['google:gemini-3-pro-preview']).toBeDefined();
    });

    it('buildApiEndpoints includes all legacy keys', () => {
      const endpoints = buildApiEndpoints();
      expect(endpoints.ANTHROPIC).toBeDefined();
      expect(endpoints.OPENAI).toBeDefined();
      expect(endpoints.PERPLEXITY).toBeDefined();
      expect(endpoints.APIFY).toBeDefined();
      expect(endpoints.CLOUDINARY).toBeDefined();
    });

    it('buildApiEndpoints adds GEMINI keys', () => {
      const endpoints = buildApiEndpoints();
      expect(endpoints.GEMINI).toContain('generativelanguage.googleapis.com');
      expect(endpoints.GEMINI_BETA).toContain('v1beta');
    });
  });
});
