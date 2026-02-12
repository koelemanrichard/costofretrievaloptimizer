import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentFetcher } from '../ContentFetcher';

// Mock jinaService
vi.mock('../../jinaService', () => ({
  extractPageContentWithHtml: vi.fn(),
}));

// Mock firecrawlService
vi.mock('../../firecrawlService', () => ({
  extractPageWithFirecrawl: vi.fn(),
}));

describe('ContentFetcher', () => {
  let fetcher: ContentFetcher;

  beforeEach(() => {
    vi.clearAllMocks();
    fetcher = new ContentFetcher({
      jinaApiKey: 'test-jina-key',
      firecrawlApiKey: 'test-firecrawl-key',
    });
  });

  describe('fetch', () => {
    it('returns FetchedContent with both semanticText and rawHtml using jina', async () => {
      const { extractPageContentWithHtml } = await import('../../jinaService');
      vi.mocked(extractPageContentWithHtml).mockResolvedValue({
        title: 'Test Page',
        description: 'A test page',
        content: 'semantic text content',
        html: '<html><head><title>Test Page</title></head><body><h1>Hello</h1></body></html>',
        headings: [{ level: 1, text: 'Hello' }],
        links: [],
        images: [],
        schema: [],
        wordCount: 3,
        readingTime: 1,
      });

      const result = await fetcher.fetch('https://example.com', {
        preferredProvider: 'jina',
      });

      expect(result.semanticText).toBe('semantic text content');
      expect(result.rawHtml).toContain('<html>');
      expect(result.provider).toBe('jina');
      expect(result.url).toBe('https://example.com');
      expect(result.fetchDurationMs).toBeGreaterThanOrEqual(0);
      // Verify jina was called with apiKey
      expect(extractPageContentWithHtml).toHaveBeenCalledWith(
        'https://example.com',
        'test-jina-key',
        undefined
      );
    });

    it('falls back to firecrawl when jina fails', async () => {
      const { extractPageContentWithHtml } = await import('../../jinaService');
      const { extractPageWithFirecrawl } = await import(
        '../../firecrawlService'
      );

      vi.mocked(extractPageContentWithHtml).mockRejectedValue(
        new Error('Jina failed')
      );
      vi.mocked(extractPageWithFirecrawl).mockResolvedValue({
        url: 'https://example.com',
        statusCode: 200,
        title: 'FC Page',
        metaDescription: '',
        canonical: '',
        robotsMeta: '',
        schemaMarkup: [],
        schemaTypes: [],
        ttfbMs: 0,
        loadTimeMs: 0,
        htmlSizeKb: 1,
        domNodes: 10,
        html: '<html><body><h1>Firecrawl</h1></body></html>',
        markdown: 'firecrawl markdown',
        internalLinks: [],
        externalLinks: [],
        images: [],
      });

      const result = await fetcher.fetch('https://example.com', {
        preferredProvider: 'jina',
        fallbackEnabled: true,
      });

      expect(result.provider).toBe('firecrawl');
      expect(result.semanticText).toBe('firecrawl markdown');
    });

    it('throws when all providers fail and fallback disabled', async () => {
      const { extractPageContentWithHtml } = await import('../../jinaService');
      vi.mocked(extractPageContentWithHtml).mockRejectedValue(
        new Error('Jina failed')
      );

      await expect(
        fetcher.fetch('https://invalid.example', {
          preferredProvider: 'jina',
          fallbackEnabled: false,
        })
      ).rejects.toThrow('Jina failed');
    });

    it('throws when provider has no API key configured', async () => {
      const noKeyFetcher = new ContentFetcher({});

      await expect(
        noKeyFetcher.fetch('https://example.com', {
          preferredProvider: 'jina',
          fallbackEnabled: false,
        })
      ).rejects.toThrow('Jina API key not configured');
    });
  });

  describe('parseHtml', () => {
    it('extracts headings, images, and links from raw HTML', () => {
      const html = `<html lang="en"><head><title>Test</title><meta name="description" content="Test desc"></head>
        <body>
          <h1>Title</h1><h2>Subtitle</h2>
          <img src="img.jpg" alt="Photo">
          <a href="/about">About</a>
          <a href="https://other.com">External</a>
          <script type="application/ld+json">{"@type":"WebPage"}</script>
        </body></html>`;

      const parsed = fetcher.parseHtml(html, 'https://example.com');

      expect(parsed.title).toBe('Test');
      expect(parsed.metaDescription).toBe('Test desc');
      expect(parsed.language).toBe('en');
      expect(parsed.headings).toContainEqual({ level: 1, text: 'Title' });
      expect(parsed.headings).toContainEqual({ level: 2, text: 'Subtitle' });
      expect(parsed.images).toContainEqual({ src: 'img.jpg', alt: 'Photo' });
      expect(parsed.internalLinks).toContainEqual(
        expect.objectContaining({ anchor: 'About' })
      );
      expect(parsed.externalLinks).toContainEqual(
        expect.objectContaining({ href: 'https://other.com/' })
      );
      expect(parsed.schemaMarkup).toHaveLength(1);
    });

    it('handles meta description with reversed attribute order', () => {
      const html = `<html><head><meta content="Reversed desc" name="description"></head><body></body></html>`;
      const parsed = fetcher.parseHtml(html, 'https://example.com');
      expect(parsed.metaDescription).toBe('Reversed desc');
    });

    it('defaults language to en when not specified', () => {
      const html = `<html><head><title>No Lang</title></head><body></body></html>`;
      const parsed = fetcher.parseHtml(html, 'https://example.com');
      expect(parsed.language).toBe('en');
    });

    it('extracts multiple JSON-LD schema blocks', () => {
      const html = `<html><head></head><body>
        <script type="application/ld+json">{"@type":"Organization"}</script>
        <script type="application/ld+json">{"@type":"WebPage"}</script>
      </body></html>`;
      const parsed = fetcher.parseHtml(html, 'https://example.com');
      expect(parsed.schemaMarkup).toHaveLength(2);
    });

    it('skips invalid JSON-LD blocks', () => {
      const html = `<html><head></head><body>
        <script type="application/ld+json">not valid json</script>
        <script type="application/ld+json">{"@type":"Valid"}</script>
      </body></html>`;
      const parsed = fetcher.parseHtml(html, 'https://example.com');
      expect(parsed.schemaMarkup).toHaveLength(1);
    });

    it('skips invalid link URLs without crashing', () => {
      const html = `<html><head></head><body>
        <a href="javascript:void(0)">JS Link</a>
        <a href="/valid">Valid</a>
      </body></html>`;
      const parsed = fetcher.parseHtml(html, 'https://example.com');
      // javascript: URLs may or may not parse; the important thing is no crash
      expect(parsed.internalLinks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('buildFallbackChain', () => {
    it('puts preferred provider first', () => {
      const chain = fetcher.buildFallbackChain('firecrawl');
      expect(chain[0]).toBe('firecrawl');
      expect(chain).toContain('jina');
      expect(chain).toContain('direct');
    });

    it('does not duplicate preferred provider', () => {
      const chain = fetcher.buildFallbackChain('jina');
      const jinaCount = chain.filter((p) => p === 'jina').length;
      expect(jinaCount).toBe(1);
    });

    it('includes all three providers', () => {
      const chain = fetcher.buildFallbackChain('direct');
      expect(chain).toHaveLength(3);
      expect(chain[0]).toBe('direct');
    });
  });
});
