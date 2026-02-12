import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Ga4ApiAdapter } from '../../adapters/Ga4ApiAdapter';

describe('Ga4ApiAdapter', () => {
  let adapter: Ga4ApiAdapter;

  beforeEach(() => {
    adapter = new Ga4ApiAdapter();
    vi.restoreAllMocks();
  });

  describe('getPageMetrics', () => {
    it('returns page metrics from GA4 API response', async () => {
      vi.spyOn(adapter as any, 'callDataApi').mockResolvedValue({
        rows: [{
          dimensionValues: [{ value: '/blog/test' }],
          metricValues: [
            { value: '1500' },  // pageviews
            { value: '800' },   // sessions
            { value: '0.35' },  // bounceRate
            { value: '120.5' }, // avgSessionDuration
          ],
        }],
      });

      const metrics = await adapter.getPageMetrics(
        '123456', '/blog/test',
        { start: '2026-01-01', end: '2026-01-31' },
        'test-token'
      );

      expect(metrics.pageviews).toBe(1500);
      expect(metrics.sessions).toBe(800);
      expect(metrics.bounceRate).toBe(0.35);
      expect(metrics.avgSessionDuration).toBe(120.5);
    });

    it('returns zeros when no data', async () => {
      vi.spyOn(adapter as any, 'callDataApi').mockResolvedValue({ rows: [] });

      const metrics = await adapter.getPageMetrics(
        '123456', '/empty',
        { start: '2026-01-01', end: '2026-01-31' },
        'test-token'
      );

      expect(metrics.pageviews).toBe(0);
      expect(metrics.sessions).toBe(0);
    });
  });

  describe('getPageviewsTrend', () => {
    it('returns daily pageview data', async () => {
      vi.spyOn(adapter as any, 'callDataApi').mockResolvedValue({
        rows: [
          { dimensionValues: [{ value: '20260101' }, { value: '/blog' }], metricValues: [{ value: '100' }] },
          { dimensionValues: [{ value: '20260102' }, { value: '/blog' }], metricValues: [{ value: '150' }] },
        ],
      });

      const trend = await adapter.getPageviewsTrend('123456', '/blog', 7, 'test-token');
      expect(trend).toHaveLength(2);
      expect(trend[0].date).toBe('20260101');
      expect(trend[0].pageviews).toBe(100);
    });
  });

  describe('listProperties', () => {
    it('lists GA4 properties from account summaries', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          accountSummaries: [{
            account: 'accounts/123',
            displayName: 'My Account',
            propertySummaries: [
              { property: 'properties/456', displayName: 'Example.com' },
              { property: 'properties/789', displayName: 'Blog' },
            ],
          }],
        }),
      }));

      const properties = await adapter.listProperties('test-token');
      expect(properties).toHaveLength(2);
      expect(properties[0].propertyId).toBe('456');
      expect(properties[0].displayName).toBe('Example.com');

      vi.unstubAllGlobals();
    });

    it('returns empty when no accounts', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ accountSummaries: [] }),
      }));

      const properties = await adapter.listProperties('test-token');
      expect(properties).toHaveLength(0);

      vi.unstubAllGlobals();
    });
  });
});
