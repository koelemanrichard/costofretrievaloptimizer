import { describe, it, expect } from 'vitest';
import { RelatedUrlDiscoverer } from '../RelatedUrlDiscoverer';

describe('RelatedUrlDiscoverer', () => {
  const discoverer = new RelatedUrlDiscoverer();

  describe('parseSitemapXml', () => {
    it('parses sitemap.xml and returns URLs', () => {
      const sitemapXml = `<?xml version="1.0"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://example.com/page1</loc></url>
          <url><loc>https://example.com/page2</loc></url>
          <url><loc>https://example.com/page3</loc></url>
        </urlset>`;
      const urls = discoverer.parseSitemapXml(sitemapXml);
      expect(urls).toHaveLength(3);
      expect(urls[0]).toBe('https://example.com/page1');
      expect(urls[1]).toBe('https://example.com/page2');
    });

    it('handles empty sitemap', () => {
      const xml = `<?xml version="1.0"?><urlset></urlset>`;
      expect(discoverer.parseSitemapXml(xml)).toHaveLength(0);
    });
  });

  describe('extractInternalLinks', () => {
    it('extracts internal links and resolves relative URLs', () => {
      const html = '<a href="/about">About</a><a href="https://example.com/contact">Contact</a><a href="https://other.com">Ext</a>';
      const links = discoverer.extractInternalLinks(html, 'https://example.com');
      expect(links).toHaveLength(2);
      expect(links.find(l => l.href.includes('/about'))).toBeDefined();
      expect(links.find(l => l.href.includes('/contact'))).toBeDefined();
      expect(links.find(l => l.href.includes('other.com'))).toBeUndefined();
    });

    it('strips HTML from anchor text', () => {
      const html = '<a href="/page"><span>Styled</span> Link</a>';
      const links = discoverer.extractInternalLinks(html, 'https://example.com');
      expect(links[0].anchor).toBe('Styled Link');
    });
  });

  describe('deduplicateAndRank', () => {
    it('deduplicates URLs and boosts multi-source matches', () => {
      const urls = [
        { url: 'https://example.com/a', source: 'sitemap' as const, relevanceScore: 0.5 },
        { url: 'https://example.com/a', source: 'link' as const, relevanceScore: 0.7 },
        { url: 'https://example.com/b', source: 'link' as const, relevanceScore: 0.7 },
      ];
      const ranked = discoverer.deduplicateAndRank(urls, 'https://example.com/target');
      expect(ranked).toHaveLength(2);
      // URL found in both sources should rank higher
      const urlA = ranked.find(r => r.url.includes('/a'));
      const urlB = ranked.find(r => r.url.includes('/b'));
      expect(urlA!.relevanceScore).toBeGreaterThan(urlB!.relevanceScore);
    });

    it('excludes the target URL itself', () => {
      const urls = [
        { url: 'https://example.com/target', source: 'sitemap' as const, relevanceScore: 0.5 },
        { url: 'https://example.com/other', source: 'sitemap' as const, relevanceScore: 0.5 },
      ];
      const ranked = discoverer.deduplicateAndRank(urls, 'https://example.com/target');
      expect(ranked).toHaveLength(1);
      expect(ranked[0].url).toContain('/other');
    });

    it('boosts URLs in same directory', () => {
      const urls = [
        { url: 'https://example.com/blog/post-a', source: 'sitemap' as const, relevanceScore: 0.5 },
        { url: 'https://example.com/about', source: 'sitemap' as const, relevanceScore: 0.5 },
      ];
      const ranked = discoverer.deduplicateAndRank(urls, 'https://example.com/blog/target-post');
      const blogPost = ranked.find(r => r.url.includes('/blog/'));
      const aboutPage = ranked.find(r => r.url.includes('/about'));
      expect(blogPost!.relevanceScore).toBeGreaterThan(aboutPage!.relevanceScore);
    });
  });

  describe('findRelatedByPattern', () => {
    it('finds URLs in same category path', () => {
      const allUrls = [
        'https://example.com/blog/post-1',
        'https://example.com/blog/post-2',
        'https://example.com/about',
        'https://example.com/blog/target',
      ];
      const related = discoverer.findRelatedByPattern('https://example.com/blog/target', allUrls);
      expect(related).toHaveLength(2);
      expect(related.every(r => r.url.includes('/blog/'))).toBe(true);
    });

    it('returns empty for root-level URLs', () => {
      const related = discoverer.findRelatedByPattern('https://example.com/page', [
        'https://example.com/other',
      ]);
      // Root-level pages have < 2 segments — returns empty
      expect(related).toHaveLength(0);
    });
  });
});
