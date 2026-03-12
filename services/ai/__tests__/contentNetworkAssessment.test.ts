import { describe, it, expect } from 'vitest';
import {
  assessContentNetwork,
  ContentNetworkPage,
} from '../contentNetworkAssessment';

function makePage(overrides: Partial<ContentNetworkPage> & { url: string }): ContentNetworkPage {
  return { ...overrides };
}

describe('assessContentNetwork', () => {
  it('should classify pages by URL patterns', () => {
    const pages: ContentNetworkPage[] = [
      makePage({ url: 'https://example.com/services/seo' }),
      makePage({ url: 'https://example.com/products/widget' }),
      makePage({ url: 'https://example.com/blog/seo-tips' }),
      makePage({ url: 'https://example.com/articles/guide' }),
      makePage({ url: 'https://example.com/about' }),
      makePage({ url: 'https://example.com/contact' }),
    ];

    const result = assessContentNetwork(pages);

    expect(result.totalPages).toBe(6);
    expect(result.corePages).toContain('https://example.com/services/seo');
    expect(result.corePages).toContain('https://example.com/products/widget');
    expect(result.authorPages).toContain('https://example.com/blog/seo-tips');
    expect(result.authorPages).toContain('https://example.com/articles/guide');
    expect(result.utilityPages).toContain('https://example.com/about');
    expect(result.utilityPages).toContain('https://example.com/contact');
  });

  it('should prefer explicit type field over URL pattern', () => {
    const pages: ContentNetworkPage[] = [
      makePage({ url: 'https://example.com/random-path', type: 'service' }),
      makePage({ url: 'https://example.com/another-path', type: 'blog' }),
      makePage({ url: 'https://example.com/misc', type: 'about' }),
    ];

    const result = assessContentNetwork(pages);

    expect(result.corePages).toEqual(['https://example.com/random-path']);
    expect(result.authorPages).toEqual(['https://example.com/another-path']);
    expect(result.utilityPages).toEqual(['https://example.com/misc']);
  });

  it('should detect orphan pages only when both link arrays are empty', () => {
    const pages: ContentNetworkPage[] = [
      // Orphan: both arrays present and empty
      makePage({ url: 'https://example.com/orphan', internalLinksTo: [], internalLinksFrom: [] }),
      // Not orphan: internalLinksTo is undefined
      makePage({ url: 'https://example.com/no-data', internalLinksFrom: [] }),
      // Not orphan: has outgoing links
      makePage({ url: 'https://example.com/linked', internalLinksTo: ['https://example.com/other'], internalLinksFrom: [] }),
      // Not orphan: both undefined
      makePage({ url: 'https://example.com/unknown' }),
    ];

    const result = assessContentNetwork(pages);

    expect(result.orphanPages).toEqual(['https://example.com/orphan']);
    expect(result.orphanPages).toHaveLength(1);
  });

  it('should calculate hub-spoke clarity as percentage of pages with parent or children', () => {
    const pages: ContentNetworkPage[] = [
      makePage({ url: 'https://example.com/a', parent: 'https://example.com/' }),
      makePage({ url: 'https://example.com/b', children: ['https://example.com/b/1'] }),
      makePage({ url: 'https://example.com/c' }), // no hierarchy
      makePage({ url: 'https://example.com/d' }), // no hierarchy
    ];

    const result = assessContentNetwork(pages);

    // 2 out of 4 = 50%
    expect(result.hubSpokeClarity).toBe(50);
  });

  it('should detect publishing frequency from dates', () => {
    // Weekly publishing: 7 days apart
    const weeklyPages: ContentNetworkPage[] = [
      makePage({ url: 'https://example.com/1', publishDate: '2026-01-01' }),
      makePage({ url: 'https://example.com/2', publishDate: '2026-01-08' }),
      makePage({ url: 'https://example.com/3', publishDate: '2026-01-15' }),
      makePage({ url: 'https://example.com/4', publishDate: '2026-01-22' }),
    ];

    const weeklyResult = assessContentNetwork(weeklyPages);
    expect(weeklyResult.publishingFrequency).toBe('weekly');

    // Daily publishing
    const dailyPages: ContentNetworkPage[] = [
      makePage({ url: 'https://example.com/1', publishDate: '2026-01-01' }),
      makePage({ url: 'https://example.com/2', publishDate: '2026-01-02' }),
      makePage({ url: 'https://example.com/3', publishDate: '2026-01-03' }),
      makePage({ url: 'https://example.com/4', publishDate: '2026-01-04' }),
    ];

    const dailyResult = assessContentNetwork(dailyPages);
    expect(dailyResult.publishingFrequency).toBe('daily');

    // Monthly publishing
    const monthlyPages: ContentNetworkPage[] = [
      makePage({ url: 'https://example.com/1', publishDate: '2026-01-01' }),
      makePage({ url: 'https://example.com/2', publishDate: '2026-02-01' }),
      makePage({ url: 'https://example.com/3', publishDate: '2026-03-01' }),
    ];

    const monthlyResult = assessContentNetwork(monthlyPages);
    expect(monthlyResult.publishingFrequency).toBe('monthly');
  });

  it('should return unknown frequency when insufficient dates', () => {
    const pages: ContentNetworkPage[] = [
      makePage({ url: 'https://example.com/1' }),
      makePage({ url: 'https://example.com/2', publishDate: '2026-01-01' }),
    ];

    const result = assessContentNetwork(pages);
    expect(result.publishingFrequency).toBe('unknown');
  });

  it('should detect content gaps', () => {
    // No service/product pages, no blog pages
    const pages: ContentNetworkPage[] = [
      makePage({ url: 'https://example.com/about', type: 'about' }),
      makePage({ url: 'https://example.com/contact', type: 'utility' }),
    ];

    const result = assessContentNetwork(pages);

    expect(result.contentGaps).toContain('No service or product pages detected');
    expect(result.contentGaps).toContain('No blog or knowledge content detected');
  });

  it('should detect high orphan ratio as a content gap', () => {
    // 3 out of 4 pages are orphans (75%)
    const pages: ContentNetworkPage[] = [
      makePage({ url: 'https://example.com/a', internalLinksTo: [], internalLinksFrom: [] }),
      makePage({ url: 'https://example.com/b', internalLinksTo: [], internalLinksFrom: [] }),
      makePage({ url: 'https://example.com/c', internalLinksTo: [], internalLinksFrom: [] }),
      makePage({ url: 'https://example.com/services/d', internalLinksTo: ['https://example.com/a'], internalLinksFrom: ['https://example.com/b'] }),
    ];

    const result = assessContentNetwork(pages);

    const orphanGap = result.contentGaps.find(g => g.includes('orphan'));
    expect(orphanGap).toBeDefined();
    expect(orphanGap).toContain('75%');
  });

  it('should handle empty input', () => {
    const result = assessContentNetwork([]);

    expect(result.totalPages).toBe(0);
    expect(result.corePages).toEqual([]);
    expect(result.authorPages).toEqual([]);
    expect(result.utilityPages).toEqual([]);
    expect(result.orphanPages).toEqual([]);
    expect(result.hubSpokeClarity).toBe(0);
    expect(result.publishingFrequency).toBe('unknown');
    expect(result.contentGaps).toEqual([]);
  });
});
