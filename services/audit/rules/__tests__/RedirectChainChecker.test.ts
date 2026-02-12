import { describe, it, expect, vi } from 'vitest';
import { RedirectChainChecker, type UrlFetcher } from '../RedirectChainChecker';

describe('RedirectChainChecker', () => {
  it('detects 5xx server error (rule 358)', async () => {
    const fetcher: UrlFetcher = vi.fn().mockResolvedValue({ status: 500 });
    const checker = new RedirectChainChecker(fetcher);
    const result = await checker.check('https://example.com/error');
    expect(result.issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-358' }));
    expect(result.statusCode).toBe(500);
  });

  it('detects redirect loop (rule 363)', async () => {
    const fetcher: UrlFetcher = vi.fn()
      .mockResolvedValueOnce({ status: 301, location: 'https://example.com/b' })
      .mockResolvedValueOnce({ status: 301, location: 'https://example.com/a' })
      .mockResolvedValueOnce({ status: 301, location: 'https://example.com/b' });
    const checker = new RedirectChainChecker(fetcher);
    const result = await checker.check('https://example.com/a');
    expect(result.issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-363' }));
  });

  it('detects long redirect chain', async () => {
    const fetcher: UrlFetcher = vi.fn()
      .mockResolvedValueOnce({ status: 301, location: 'https://example.com/b' })
      .mockResolvedValueOnce({ status: 302, location: 'https://example.com/c' })
      .mockResolvedValueOnce({ status: 301, location: 'https://example.com/d' })
      .mockResolvedValue({ status: 200 });
    const checker = new RedirectChainChecker(fetcher);
    const result = await checker.check('https://example.com/a');
    expect(result.issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-363-chain' }));
  });

  it('passes single redirect (200 after one hop)', async () => {
    const fetcher: UrlFetcher = vi.fn()
      .mockResolvedValueOnce({ status: 301, location: 'https://example.com/b' })
      .mockResolvedValueOnce({ status: 200 });
    const checker = new RedirectChainChecker(fetcher);
    const result = await checker.check('https://example.com/a');
    expect(result.issues).toHaveLength(0);
    expect(result.finalUrl).toBe('https://example.com/b');
  });

  it('passes direct 200 response', async () => {
    const fetcher: UrlFetcher = vi.fn().mockResolvedValue({ status: 200 });
    const checker = new RedirectChainChecker(fetcher);
    const result = await checker.check('https://example.com/page');
    expect(result.issues).toHaveLength(0);
    expect(result.redirectChain).toHaveLength(1);
  });

  it('handles maxHops limit', async () => {
    const fetcher: UrlFetcher = vi.fn()
      .mockResolvedValue({ status: 301, location: 'https://example.com/next' });
    const checker = new RedirectChainChecker(fetcher, 3);
    const result = await checker.check('https://example.com/start');
    expect(result.redirectChain.length).toBeLessThanOrEqual(3);
  });
});
