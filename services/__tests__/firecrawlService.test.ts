import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractPageWithFirecrawl } from '../firecrawlService';

describe('firecrawlService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractPageWithFirecrawl', () => {
    it('retries on 5xx errors', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as Response);
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            html: '<html><head><title>Test</title></head><body>Content</body></html>',
            markdown: '# Test\n\nContent',
            metadata: { title: 'Test', statusCode: 200 },
          },
        }),
      } as Response);

      const result = await extractPageWithFirecrawl('https://example.com', 'test-key', { maxRetries: 3 });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.title).toBe('Test');
    });

    it('throws after max retries', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as Response);

      await expect(
        extractPageWithFirecrawl('https://example.com', 'test-key', { maxRetries: 2 })
      ).rejects.toThrow('503');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
