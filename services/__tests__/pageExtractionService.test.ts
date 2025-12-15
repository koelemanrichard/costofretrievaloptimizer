import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractSinglePage,
  ExtractionConfig,
  getExtractionTypeForUseCase,
} from '../pageExtractionService';
import * as jinaService from '../jinaService';
import * as firecrawlService from '../firecrawlService';
import * as apifyService from '../apifyService';

// Mock the services
vi.mock('../jinaService');
vi.mock('../firecrawlService');
vi.mock('../apifyService');

describe('pageExtractionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getExtractionTypeForUseCase', () => {
    it('returns semantic_only for content_brief', () => {
      const type = getExtractionTypeForUseCase('content_brief');
      expect(type).toBe('semantic_only');
    });

    it('returns semantic_only for topic_enrichment', () => {
      const type = getExtractionTypeForUseCase('topic_enrichment');
      expect(type).toBe('semantic_only');
    });

    it('returns technical_only for link_analysis', () => {
      const type = getExtractionTypeForUseCase('link_analysis');
      expect(type).toBe('technical_only');
    });

    it('returns technical_only for schema_extraction', () => {
      const type = getExtractionTypeForUseCase('schema_extraction');
      expect(type).toBe('technical_only');
    });

    it('returns full_audit for site_audit', () => {
      const type = getExtractionTypeForUseCase('site_audit');
      expect(type).toBe('full_audit');
    });

    it('returns full_audit for competitor_analysis', () => {
      const type = getExtractionTypeForUseCase('competitor_analysis');
      expect(type).toBe('full_audit');
    });

    it('returns auto for unknown use case', () => {
      const type = getExtractionTypeForUseCase('unknown' as any);
      expect(type).toBe('auto');
    });
  });

  describe('extractSinglePage', () => {
    const mockJinaResult = {
      url: 'https://example.com',
      title: 'Example Title',
      content: 'Example content',
      description: 'Example description',
      wordCount: 100,
      readingTime: 1,
      headings: [{ level: 1, text: 'Main Heading' }],
      links: [],
      images: [],
      schema: [],
      author: null,
      publishedTime: null,
      modifiedTime: null,
    };

    const mockFirecrawlResult = {
      url: 'https://example.com',
      title: 'Firecrawl Title',
      metaDescription: 'Firecrawl description',
      statusCode: 200,
      html: '<html><body>Content</body></html>',
      markdown: '# Main Heading\n\nContent',
      canonical: 'https://example.com',
      robotsMeta: 'index,follow',
      schemaMarkup: [],
      schemaTypes: [],
      internalLinks: [],
      externalLinks: [],
      images: [],
      ttfbMs: 100,
      loadTimeMs: 500,
      domNodes: 150,
      htmlSizeKb: 50,
    };

    const mockApifyResult = {
      url: 'https://example.com',
      title: 'Apify Title',
      metaDescription: 'Apify description',
      statusCode: 200,
      html: '<html><body>Content</body></html>',
      canonical: 'https://example.com',
      robotsMeta: 'index,follow',
      schemaMarkup: [],
      schemaTypes: [],
      internalLinks: [],
      externalLinks: [],
      images: [],
      ttfbMs: 100,
      loadTimeMs: 500,
      domNodes: 150,
      htmlSizeKb: 50,
    };

    it('uses Jina as primary for semantic_only extraction', async () => {
      vi.mocked(jinaService.extractPageContent).mockResolvedValue(mockJinaResult);

      const config: ExtractionConfig = {
        apifyToken: 'apify-token',
        jinaApiKey: 'jina-key',
        firecrawlApiKey: 'fc-key',
        extractionType: 'semantic_only',
      };

      const result = await extractSinglePage('https://example.com', config);

      expect(jinaService.extractPageContent).toHaveBeenCalledWith(
        'https://example.com',
        'jina-key',
        undefined
      );
      expect(result.semantic).toEqual(mockJinaResult);
      expect(result.primaryProvider).toBe('jina');
      expect(result.fallbackUsed).toBe(false);
    });

    it('falls back to Firecrawl when Jina fails', async () => {
      vi.mocked(jinaService.extractPageContent).mockRejectedValue(
        new Error('Jina failed')
      );
      vi.mocked(firecrawlService.extractPageWithFirecrawl).mockResolvedValue({
        ...mockFirecrawlResult,
        markdown: '# Main Heading\n\nContent',
      });

      const config: ExtractionConfig = {
        apifyToken: 'apify-token',
        jinaApiKey: 'jina-key',
        firecrawlApiKey: 'fc-key',
        extractionType: 'semantic_only',
        enableFallback: true,
      };

      const result = await extractSinglePage('https://example.com', config);

      expect(jinaService.extractPageContent).toHaveBeenCalled();
      expect(firecrawlService.extractPageWithFirecrawl).toHaveBeenCalled();
      expect(result.semantic).toBeDefined();
      expect(result.primaryProvider).toBe('firecrawl');
      expect(result.fallbackUsed).toBe(true);
    });

    it('uses Apify as primary for technical_only extraction', async () => {
      vi.mocked(apifyService.extractMultiplePagesTechnicalData).mockResolvedValue([
        mockApifyResult,
      ]);

      const config: ExtractionConfig = {
        apifyToken: 'apify-token',
        jinaApiKey: 'jina-key',
        extractionType: 'technical_only',
      };

      const result = await extractSinglePage('https://example.com', config);

      expect(apifyService.extractMultiplePagesTechnicalData).toHaveBeenCalledWith(
        ['https://example.com'],
        'apify-token'
      );
      expect(result.technical).toEqual(mockApifyResult);
      expect(result.primaryProvider).toBe('apify');
      expect(result.fallbackUsed).toBe(false);
    });

    it('runs parallel extraction for full_audit', async () => {
      vi.mocked(jinaService.extractPageContent).mockResolvedValue(mockJinaResult);
      vi.mocked(apifyService.extractMultiplePagesTechnicalData).mockResolvedValue([
        mockApifyResult,
      ]);

      const config: ExtractionConfig = {
        apifyToken: 'apify-token',
        jinaApiKey: 'jina-key',
        extractionType: 'full_audit',
      };

      const result = await extractSinglePage('https://example.com', config);

      expect(jinaService.extractPageContent).toHaveBeenCalled();
      expect(apifyService.extractMultiplePagesTechnicalData).toHaveBeenCalled();
      expect(result.semantic).toEqual(mockJinaResult);
      expect(result.technical).toEqual(mockApifyResult);
    });

    it('respects preferredProvider setting', async () => {
      vi.mocked(firecrawlService.extractPageWithFirecrawl).mockResolvedValue({
        ...mockFirecrawlResult,
        markdown: '# Main Heading\n\nContent',
      });

      const config: ExtractionConfig = {
        apifyToken: 'apify-token',
        jinaApiKey: 'jina-key',
        firecrawlApiKey: 'fc-key',
        extractionType: 'semantic_only',
        preferredProvider: 'firecrawl',
      };

      const result = await extractSinglePage('https://example.com', config);

      expect(firecrawlService.extractPageWithFirecrawl).toHaveBeenCalled();
      expect(jinaService.extractPageContent).not.toHaveBeenCalled();
      expect(result.primaryProvider).toBe('firecrawl');
    });

    it('forces Apify for JS-heavy domains', async () => {
      vi.mocked(apifyService.extractMultiplePagesTechnicalData).mockResolvedValue([
        mockApifyResult,
      ]);

      const config: ExtractionConfig = {
        apifyToken: 'apify-token',
        jinaApiKey: 'jina-key',
        extractionType: 'semantic_only',
      };

      const result = await extractSinglePage('https://linkedin.com/in/user', config);

      // Should use Apify even though semantic_only would normally use Jina
      expect(apifyService.extractMultiplePagesTechnicalData).toHaveBeenCalled();
      expect(result.primaryProvider).toBe('apify');
    });

    it('does not fall back when enableFallback is false', async () => {
      vi.mocked(jinaService.extractPageContent).mockRejectedValue(
        new Error('Jina failed')
      );

      const config: ExtractionConfig = {
        apifyToken: 'apify-token',
        jinaApiKey: 'jina-key',
        firecrawlApiKey: 'fc-key',
        extractionType: 'semantic_only',
        enableFallback: false,
      };

      const result = await extractSinglePage('https://example.com', config);

      expect(jinaService.extractPageContent).toHaveBeenCalled();
      expect(firecrawlService.extractPageWithFirecrawl).not.toHaveBeenCalled();
      expect(result.semantic).toBeNull();
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('adds custom domains to forceApifyDomains list', async () => {
      vi.mocked(apifyService.extractMultiplePagesTechnicalData).mockResolvedValue([
        mockApifyResult,
      ]);

      const config: ExtractionConfig = {
        apifyToken: 'apify-token',
        jinaApiKey: 'jina-key',
        extractionType: 'semantic_only',
        forceApifyDomains: ['custom-spa.com'],
      };

      const result = await extractSinglePage('https://custom-spa.com/page', config);

      expect(apifyService.extractMultiplePagesTechnicalData).toHaveBeenCalled();
      expect(result.primaryProvider).toBe('apify');
    });
  });
});
