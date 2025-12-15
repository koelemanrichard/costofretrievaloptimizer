import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractPageContent } from '../jinaService';

describe('jinaService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('extractPageContent', () => {
    it('throws error when API key is missing', async () => {
      await expect(extractPageContent('https://example.com', '')).rejects.toThrow(
        'Jina.ai API key is not configured'
      );
    });

    it('retries on 5xx errors', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      // First call fails with 503
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as Response);
      // Second call succeeds
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            title: 'Test',
            description: 'Test desc',
            content: '# Heading\n\nContent',
            url: 'https://example.com',
          },
        }),
      } as Response);

      const result = await extractPageContent('https://example.com', 'test-key');
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
        extractPageContent('https://example.com', 'test-key', undefined, { maxRetries: 2, initialDelayMs: 100, backoffMultiplier: 2 })
      ).rejects.toThrow('503');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
