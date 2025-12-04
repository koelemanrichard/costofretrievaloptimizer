import { describe, it, expect } from 'vitest';
import {
  selectProvidersForExtraction,
  getDefaultFallbackOrder,
  shouldForceApify,
} from '../scrapingProviderRouter';
import { ExtractionType, ScrapingProvider } from '../../types';

describe('scrapingProviderRouter', () => {
  describe('getDefaultFallbackOrder', () => {
    it('returns jina-first order for semantic_only', () => {
      const order = getDefaultFallbackOrder('semantic_only');
      expect(order).toEqual(['jina', 'firecrawl']);
    });

    it('returns apify-first order for technical_only', () => {
      const order = getDefaultFallbackOrder('technical_only');
      expect(order).toEqual(['apify', 'firecrawl']);
    });

    it('returns full order for full_audit', () => {
      const order = getDefaultFallbackOrder('full_audit');
      expect(order).toEqual(['jina', 'firecrawl', 'apify']);
    });

    it('returns jina-first for auto', () => {
      const order = getDefaultFallbackOrder('auto');
      expect(order).toEqual(['jina', 'firecrawl', 'apify']);
    });
  });

  describe('shouldForceApify', () => {
    it('returns true for known JS-heavy domains', () => {
      expect(shouldForceApify('https://www.linkedin.com/in/someone')).toBe(true);
      expect(shouldForceApify('https://twitter.com/user')).toBe(true);
      expect(shouldForceApify('https://www.amazon.com/product')).toBe(true);
    });

    it('returns false for regular domains', () => {
      expect(shouldForceApify('https://example.com')).toBe(false);
      expect(shouldForceApify('https://blog.company.com/post')).toBe(false);
    });

    it('handles custom force domains', () => {
      const customDomains = ['custom-spa.com'];
      expect(shouldForceApify('https://custom-spa.com/page', customDomains)).toBe(true);
    });
  });

  describe('selectProvidersForExtraction', () => {
    const allKeys = {
      jinaApiKey: 'jina-key',
      firecrawlApiKey: 'fc-key',
      apifyToken: 'apify-token',
    };

    it('filters to only available providers', () => {
      const result = selectProvidersForExtraction('semantic_only', {
        jinaApiKey: 'key',
        // no firecrawl or apify
      });
      expect(result).toEqual(['jina']);
    });

    it('respects preferredProvider when available', () => {
      const result = selectProvidersForExtraction('semantic_only', {
        ...allKeys,
        preferredProvider: 'firecrawl',
      });
      expect(result[0]).toBe('firecrawl');
    });

    it('skips preferred provider if key not available', () => {
      const result = selectProvidersForExtraction('semantic_only', {
        jinaApiKey: 'key',
        preferredProvider: 'firecrawl', // but no firecrawl key
      });
      expect(result).toEqual(['jina']);
    });

    it('forces apify for JS-heavy URLs', () => {
      const result = selectProvidersForExtraction('semantic_only', {
        ...allKeys,
        url: 'https://linkedin.com/in/user',
      });
      expect(result[0]).toBe('apify');
    });
  });
});
