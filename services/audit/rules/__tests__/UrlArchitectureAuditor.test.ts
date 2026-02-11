import { describe, it, expect } from 'vitest';
import { UrlArchitectureAuditor } from '../UrlArchitectureAuditor';
import type { UrlArchitectureInput } from '../UrlArchitectureAuditor';

describe('UrlArchitectureAuditor', () => {
  const auditor = new UrlArchitectureAuditor();

  // ---------------------------------------------------------------------------
  // Rule 338 — Lowercase URLs
  // ---------------------------------------------------------------------------
  describe('rule-338: lowercase URLs', () => {
    it('detects uppercase letters in URL path', () => {
      const issues = auditor.validate({
        url: 'https://example.com/About-Us',
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-338' }));
    });

    it('passes when URL path is all lowercase', () => {
      const issues = auditor.validate({
        url: 'https://example.com/about-us',
      });
      expect(issues.find((i) => i.ruleId === 'rule-338')).toBeUndefined();
    });

    it('ignores uppercase in domain (only checks path)', () => {
      const issues = auditor.validate({
        url: 'https://Example.COM/about-us',
      });
      expect(issues.find((i) => i.ruleId === 'rule-338')).toBeUndefined();
    });

    it('detects mixed case in deep path segments', () => {
      const issues = auditor.validate({
        url: 'https://example.com/blog/My-Post/Details',
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-338' }));
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 340 — No session IDs in URLs
  // ---------------------------------------------------------------------------
  describe('rule-340: no session IDs in URLs', () => {
    it('detects PHPSESSID in query params', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page?PHPSESSID=abc123',
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-340' }));
    });

    it('detects session ID from explicit queryParams', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page',
        queryParams: ['sid', 'ref'],
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-340' }));
    });

    it('detects _ga tracking parameter', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page?_ga=1.12345.6789',
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-340' }));
    });

    it('passes when no session parameters are present', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page?category=shoes&color=red',
      });
      expect(issues.find((i) => i.ruleId === 'rule-340')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 348 — No canonical chains
  // ---------------------------------------------------------------------------
  describe('rule-348: no canonical chains', () => {
    it('detects canonical chain (canonical of canonical differs)', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page-a',
        canonicalUrl: 'https://example.com/page-b',
        canonicalOfCanonical: 'https://example.com/page-c',
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-348' }));
    });

    it('passes when canonical of canonical matches canonical (no chain)', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page-a',
        canonicalUrl: 'https://example.com/page-b',
        canonicalOfCanonical: 'https://example.com/page-b',
      });
      expect(issues.find((i) => i.ruleId === 'rule-348')).toBeUndefined();
    });

    it('skips when canonicalOfCanonical is not provided', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page-a',
        canonicalUrl: 'https://example.com/page-b',
      });
      expect(issues.find((i) => i.ruleId === 'rule-348')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rules 354-355 — Bot response time
  // ---------------------------------------------------------------------------
  describe('rule-354/355: bot response time', () => {
    it('flags critical when response time exceeds 5000ms (rule-354)', () => {
      const issues = auditor.validate({
        url: 'https://example.com/slow',
        responseTimeMs: 6500,
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-354', severity: 'critical' })
      );
    });

    it('flags medium when response time exceeds 2000ms but under 5000ms (rule-355)', () => {
      const issues = auditor.validate({
        url: 'https://example.com/somewhat-slow',
        responseTimeMs: 3000,
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-355', severity: 'medium' })
      );
    });

    it('passes when response time is under 2000ms', () => {
      const issues = auditor.validate({
        url: 'https://example.com/fast',
        responseTimeMs: 500,
      });
      expect(issues.find((i) => i.ruleId === 'rule-354')).toBeUndefined();
      expect(issues.find((i) => i.ruleId === 'rule-355')).toBeUndefined();
    });

    it('skips when responseTimeMs is not provided', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page',
      });
      expect(issues.find((i) => i.ruleId === 'rule-354')).toBeUndefined();
      expect(issues.find((i) => i.ruleId === 'rule-355')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 359 — No active 404s
  // ---------------------------------------------------------------------------
  describe('rule-359: no active 404s', () => {
    it('detects 404 page that is linked from other pages', () => {
      const issues = auditor.validate({
        url: 'https://example.com/deleted-page',
        statusCode: 404,
        linkedFrom: ['https://example.com/home', 'https://example.com/blog'],
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-359' }));
    });

    it('passes when 404 page has no incoming links', () => {
      const issues = auditor.validate({
        url: 'https://example.com/deleted-page',
        statusCode: 404,
        linkedFrom: [],
      });
      expect(issues.find((i) => i.ruleId === 'rule-359')).toBeUndefined();
    });

    it('passes when page is 200 even with incoming links', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page',
        statusCode: 200,
        linkedFrom: ['https://example.com/home'],
      });
      expect(issues.find((i) => i.ruleId === 'rule-359')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 361 — 301 for permanent redirects
  // ---------------------------------------------------------------------------
  describe('rule-361: permanent redirects should be 301', () => {
    it('detects 302 temporary redirect', () => {
      const issues = auditor.validate({
        url: 'https://example.com/old-page',
        redirectTarget: 'https://example.com/new-page',
        redirectStatusCode: 302,
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-361' }));
    });

    it('detects 307 temporary redirect', () => {
      const issues = auditor.validate({
        url: 'https://example.com/old-page',
        redirectTarget: 'https://example.com/new-page',
        redirectStatusCode: 307,
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-361' }));
    });

    it('passes when redirect is 301', () => {
      const issues = auditor.validate({
        url: 'https://example.com/old-page',
        redirectTarget: 'https://example.com/new-page',
        redirectStatusCode: 301,
      });
      expect(issues.find((i) => i.ruleId === 'rule-361')).toBeUndefined();
    });

    it('skips when no redirect is present', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page',
      });
      expect(issues.find((i) => i.ruleId === 'rule-361')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 362 — No redirect chains
  // ---------------------------------------------------------------------------
  describe('rule-362: no redirect chains', () => {
    it('detects redirect chain with more than 1 hop', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page',
        redirectChainLength: 3,
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-362' }));
    });

    it('passes with single redirect hop', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page',
        redirectChainLength: 1,
      });
      expect(issues.find((i) => i.ruleId === 'rule-362')).toBeUndefined();
    });

    it('passes when redirectChainLength is 0', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page',
        redirectChainLength: 0,
      });
      expect(issues.find((i) => i.ruleId === 'rule-362')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 365 — No filter/facet URL explosion
  // ---------------------------------------------------------------------------
  describe('rule-365: no filter/facet URL explosion', () => {
    it('detects more than 3 facet-like query params', () => {
      const issues = auditor.validate({
        url: 'https://example.com/shop',
        queryParams: ['filter', 'sort', 'page', 'color'],
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-365' }));
    });

    it('passes with 3 or fewer facet params', () => {
      const issues = auditor.validate({
        url: 'https://example.com/shop',
        queryParams: ['filter', 'sort', 'page'],
      });
      expect(issues.find((i) => i.ruleId === 'rule-365')).toBeUndefined();
    });

    it('ignores non-facet query params', () => {
      const issues = auditor.validate({
        url: 'https://example.com/shop',
        queryParams: ['utm_source', 'utm_medium', 'ref', 'campaign'],
      });
      expect(issues.find((i) => i.ruleId === 'rule-365')).toBeUndefined();
    });

    it('detects facet params from URL parsing when queryParams not provided', () => {
      const issues = auditor.validate({
        url: 'https://example.com/shop?filter=red&sort=price&page=2&category=shoes',
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-365' }));
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 367 — Duplicates handled via canonical
  // ---------------------------------------------------------------------------
  describe('rule-367: duplicates handled via canonical', () => {
    it('detects duplicate URLs without a canonical tag', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page',
        duplicateUrls: ['https://example.com/page?ref=123', 'https://example.com/page/'],
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-367' }));
    });

    it('passes when duplicates exist but canonical is set', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page',
        canonicalUrl: 'https://example.com/page',
        duplicateUrls: ['https://example.com/page?ref=123'],
      });
      expect(issues.find((i) => i.ruleId === 'rule-367')).toBeUndefined();
    });

    it('passes when no duplicates are reported', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page',
        duplicateUrls: [],
      });
      expect(issues.find((i) => i.ruleId === 'rule-367')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 374 — URL in sitemap
  // ---------------------------------------------------------------------------
  describe('rule-374: URL in sitemap', () => {
    it('detects URL not in sitemap', () => {
      const issues = auditor.validate({
        url: 'https://example.com/orphan-page',
        sitemapUrls: ['https://example.com/', 'https://example.com/about'],
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-374' }));
    });

    it('passes when URL is in sitemap', () => {
      const issues = auditor.validate({
        url: 'https://example.com/about',
        sitemapUrls: ['https://example.com/', 'https://example.com/about'],
      });
      expect(issues.find((i) => i.ruleId === 'rule-374')).toBeUndefined();
    });

    it('normalizes URLs for comparison (trailing slash)', () => {
      const issues = auditor.validate({
        url: 'https://example.com/about',
        sitemapUrls: ['https://example.com/about/'],
      });
      expect(issues.find((i) => i.ruleId === 'rule-374')).toBeUndefined();
    });

    it('skips when sitemapUrls is not provided', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page',
      });
      expect(issues.find((i) => i.ruleId === 'rule-374')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 375 — Sitemap clean (no 4xx/5xx URLs)
  // ---------------------------------------------------------------------------
  describe('rule-375: sitemap clean', () => {
    it('detects 404 URL in sitemap', () => {
      const issues = auditor.validate({
        url: 'https://example.com/removed-page',
        statusCode: 404,
        sitemapUrls: ['https://example.com/removed-page'],
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-375' }));
    });

    it('detects 500 URL in sitemap', () => {
      const issues = auditor.validate({
        url: 'https://example.com/broken-page',
        statusCode: 500,
        sitemapUrls: ['https://example.com/broken-page'],
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-375' }));
    });

    it('passes when 200 URL is in sitemap', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page',
        statusCode: 200,
        sitemapUrls: ['https://example.com/page'],
      });
      expect(issues.find((i) => i.ruleId === 'rule-375')).toBeUndefined();
    });

    it('passes when error URL is NOT in sitemap', () => {
      const issues = auditor.validate({
        url: 'https://example.com/error-page',
        statusCode: 500,
        sitemapUrls: ['https://example.com/other-page'],
      });
      expect(issues.find((i) => i.ruleId === 'rule-375')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 378 — Sitemap must exist
  // ---------------------------------------------------------------------------
  describe('rule-378: sitemap exists', () => {
    it('detects empty sitemap', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page',
        sitemapUrls: [],
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-378' }));
    });

    it('passes when sitemap has URLs', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page',
        sitemapUrls: ['https://example.com/page'],
      });
      expect(issues.find((i) => i.ruleId === 'rule-378')).toBeUndefined();
    });

    it('skips when sitemapUrls is not provided (not checked)', () => {
      const issues = auditor.validate({
        url: 'https://example.com/page',
      });
      expect(issues.find((i) => i.ruleId === 'rule-378')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Integration: clean URL setup
  // ---------------------------------------------------------------------------
  describe('clean setup', () => {
    it('returns zero issues for a fully valid URL configuration', () => {
      const issues = auditor.validate({
        url: 'https://example.com/about-us',
        canonicalUrl: 'https://example.com/about-us',
        statusCode: 200,
        responseTimeMs: 400,
        sitemapUrls: ['https://example.com/', 'https://example.com/about-us'],
      });
      expect(issues).toHaveLength(0);
    });

    it('reports multiple issues for a badly configured URL', () => {
      const input: UrlArchitectureInput = {
        url: 'https://example.com/About-Us?PHPSESSID=abc&filter=a&sort=b&page=1&category=x',
        statusCode: 404,
        responseTimeMs: 6000,
        linkedFrom: ['https://example.com/home'],
        sitemapUrls: ['https://example.com/About-Us?PHPSESSID=abc&filter=a&sort=b&page=1&category=x'],
        duplicateUrls: ['https://example.com/about-us'],
      };
      const issues = auditor.validate(input);

      // Should detect: uppercase (338), session ID (340), slow response (354),
      // active 404 (359), facet explosion (365), no canonical for duplicates (367),
      // error URL in sitemap (375)
      const ruleIds = issues.map((i) => i.ruleId);
      expect(ruleIds).toContain('rule-338');
      expect(ruleIds).toContain('rule-340');
      expect(ruleIds).toContain('rule-354');
      expect(ruleIds).toContain('rule-359');
      expect(ruleIds).toContain('rule-365');
      expect(ruleIds).toContain('rule-367');
      expect(ruleIds).toContain('rule-375');
    });
  });
});
