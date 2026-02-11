import { describe, it, expect } from 'vitest';
import { API_ENDPOINTS } from '../apiEndpoints';

describe('API Endpoints', () => {
  it('should export all AI provider endpoints', () => {
    expect(API_ENDPOINTS.ANTHROPIC).toBeDefined();
    expect(API_ENDPOINTS.OPENAI).toBeDefined();
    expect(API_ENDPOINTS.OPENROUTER).toBeDefined();
    expect(API_ENDPOINTS.OPENROUTER_MODELS).toBeDefined();
    expect(API_ENDPOINTS.PERPLEXITY).toBeDefined();
    expect(API_ENDPOINTS.GEMINI).toBeDefined();
    expect(API_ENDPOINTS.GEMINI_BETA).toBeDefined();
  });

  it('should export all scraping/content endpoints', () => {
    expect(API_ENDPOINTS.APIFY).toBeDefined();
    expect(API_ENDPOINTS.FIRECRAWL_SCRAPE).toBeDefined();
    expect(API_ENDPOINTS.FIRECRAWL_SCRAPE_V0).toBeDefined();
    expect(API_ENDPOINTS.JINA_READER).toBeDefined();
  });

  it('should export all search/SEO endpoints', () => {
    expect(API_ENDPOINTS.SPACESERP).toBeDefined();
    expect(API_ENDPOINTS.DATAFORSEO_SERP).toBeDefined();
    expect(API_ENDPOINTS.DATAFORSEO_SEARCH_VOLUME).toBeDefined();
  });

  it('should export all media/asset endpoints', () => {
    expect(API_ENDPOINTS.CLOUDINARY).toBeDefined();
    expect(API_ENDPOINTS.MARKUPGO).toBeDefined();
  });

  it('should have all URLs as valid HTTPS URLs', () => {
    Object.entries(API_ENDPOINTS).forEach(([key, url]) => {
      expect(() => new URL(url), `${key} should be a valid URL`).not.toThrow();
      expect(url.startsWith('https://'), `${key} should use HTTPS`).toBe(true);
    });
  });

  it('should have the correct number of endpoints', () => {
    const keys = Object.keys(API_ENDPOINTS);
    expect(keys.length).toBe(16);
  });

  it('should match expected base domains', () => {
    expect(new URL(API_ENDPOINTS.ANTHROPIC).hostname).toBe('api.anthropic.com');
    expect(new URL(API_ENDPOINTS.OPENAI).hostname).toBe('api.openai.com');
    expect(new URL(API_ENDPOINTS.OPENROUTER).hostname).toBe('openrouter.ai');
    expect(new URL(API_ENDPOINTS.PERPLEXITY).hostname).toBe('api.perplexity.ai');
    expect(new URL(API_ENDPOINTS.GEMINI).hostname).toBe('generativelanguage.googleapis.com');
    expect(new URL(API_ENDPOINTS.APIFY).hostname).toBe('api.apify.com');
    expect(new URL(API_ENDPOINTS.FIRECRAWL_SCRAPE).hostname).toBe('api.firecrawl.dev');
    expect(new URL(API_ENDPOINTS.JINA_READER).hostname).toBe('r.jina.ai');
    expect(new URL(API_ENDPOINTS.SPACESERP).hostname).toBe('api.spaceserp.com');
    expect(new URL(API_ENDPOINTS.DATAFORSEO_SERP).hostname).toBe('api.dataforseo.com');
    expect(new URL(API_ENDPOINTS.CLOUDINARY).hostname).toBe('api.cloudinary.com');
    expect(new URL(API_ENDPOINTS.MARKUPGO).hostname).toBe('api.markupgo.com');
  });
});
