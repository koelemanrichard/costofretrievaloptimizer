import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GscApiAdapter } from '../../adapters/GscApiAdapter';

describe('GscApiAdapter', () => {
  let adapter: GscApiAdapter;

  beforeEach(() => {
    adapter = new GscApiAdapter('test-client-id');
    vi.restoreAllMocks();
  });

  describe('getAuthorizationUrl', () => {
    it('generates correct OAuth authorization URL', () => {
      const url = adapter.getAuthorizationUrl('project-123', 'https://app.example.com/callback');
      expect(url).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('webmasters.readonly');
      expect(url).toContain('state=project-123');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('access_type=offline');
    });

    it('includes additional scopes in authorization URL', () => {
      const url = adapter.getAuthorizationUrl(
        'project-123',
        'https://app.example.com/callback',
        ['https://www.googleapis.com/auth/analytics.readonly']
      );
      expect(url).toContain('analytics.readonly');
      expect(url).toContain('webmasters.readonly');
    });
  });

  describe('getSearchAnalytics', () => {
    it('fetches and transforms search analytics data', async () => {
      vi.spyOn(adapter as any, 'callGscApi').mockResolvedValue({
        rows: [
          { keys: ['test keyword'], clicks: 100, impressions: 1000, ctr: 0.1, position: 5.2 },
          { keys: ['another query'], clicks: 50, impressions: 500, ctr: 0.1, position: 8.0 },
        ],
      });

      const data = await adapter.getSearchAnalytics({
        siteUrl: 'https://example.com',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        dimensions: ['query'],
        accessToken: 'test-token',
      });

      expect(data).toHaveLength(2);
      expect(data[0].clicks).toBe(100);
      expect(data[0].keys).toEqual(['test keyword']);
      expect(data[1].position).toBe(8.0);
    });

    it('returns empty array when no rows', async () => {
      vi.spyOn(adapter as any, 'callGscApi').mockResolvedValue({});
      const data = await adapter.getSearchAnalytics({
        siteUrl: 'https://example.com',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        dimensions: ['query'],
        accessToken: 'test-token',
      });
      expect(data).toEqual([]);
    });
  });

  describe('getPagePerformance', () => {
    it('converts GSC response to PerformanceSnapshot', async () => {
      vi.spyOn(adapter, 'getSearchAnalytics').mockResolvedValue([
        { keys: ['https://example.com/page'], clicks: 200, impressions: 2000, ctr: 0.1, position: 4.5 },
      ]);

      const snapshot = await adapter.getPagePerformance('https://example.com/page', 30, 'test-token');
      expect(snapshot.clicks).toBe(200);
      expect(snapshot.impressions).toBe(2000);
      expect(snapshot.ctr).toBeGreaterThan(0);
      expect(snapshot.position).toBe(4.5);
      expect(snapshot.period.start).toBeDefined();
      expect(snapshot.period.end).toBeDefined();
    });

    it('handles zero impressions', async () => {
      vi.spyOn(adapter, 'getSearchAnalytics').mockResolvedValue([]);
      const snapshot = await adapter.getPagePerformance('https://example.com/page', 30, 'test-token');
      expect(snapshot.clicks).toBe(0);
      expect(snapshot.ctr).toBe(0);
    });
  });

  describe('getTopQueries', () => {
    it('returns query rows for a page', async () => {
      vi.spyOn(adapter, 'getSearchAnalytics').mockResolvedValue([
        { keys: ['seo tips'], clicks: 50, impressions: 500, ctr: 0.1, position: 3.0 },
        { keys: ['content marketing'], clicks: 30, impressions: 300, ctr: 0.1, position: 5.0 },
      ]);

      const queries = await adapter.getTopQueries('https://example.com/page', 10, 'test-token');
      expect(queries).toHaveLength(2);
      expect(queries[0].query).toBe('seo tips');
    });
  });

  describe('getClickTrend', () => {
    it('returns daily click data', async () => {
      vi.spyOn(adapter, 'getSearchAnalytics').mockResolvedValue([
        { keys: ['2026-01-01'], clicks: 10, impressions: 100, ctr: 0.1, position: 5 },
        { keys: ['2026-01-02'], clicks: 15, impressions: 120, ctr: 0.125, position: 4.8 },
      ]);

      const trend = await adapter.getClickTrend('https://example.com/page', 7, 'test-token');
      expect(trend).toHaveLength(2);
      expect(trend[0].date).toBe('2026-01-01');
      expect(trend[0].clicks).toBe(10);
    });
  });

  describe('listSites', () => {
    it('lists available GSC sites', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          siteEntry: [
            { siteUrl: 'https://example.com/', permissionLevel: 'siteOwner' },
            { siteUrl: 'sc-domain:example.com', permissionLevel: 'siteFullUser' },
          ],
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const sites = await adapter.listSites('test-token');
      expect(sites).toHaveLength(2);
      expect(sites[0].siteUrl).toBe('https://example.com/');

      vi.unstubAllGlobals();
    });
  });
});
