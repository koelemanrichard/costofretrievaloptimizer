import { describe, it, expect } from 'vitest';
import { SignalConflictChecker } from '../SignalConflictChecker';

describe('SignalConflictChecker', () => {
  const checker = new SignalConflictChecker();

  // ---------------------------------------------------------------------------
  // Rule 373 — robots.txt blocks URL that is in the sitemap
  // ---------------------------------------------------------------------------

  it('detects robots.txt block + sitemap inclusion (rule 373)', () => {
    const conflicts = checker.check({
      html: '<html><body>Content</body></html>',
      pageUrl: 'https://example.com/blocked-page',
      robotsTxt: 'User-agent: *\nDisallow: /blocked-page',
      sitemapUrls: ['https://example.com/blocked-page'],
    });
    expect(conflicts).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-373' })
    );
  });

  it('passes when URL not in robots.txt', () => {
    const conflicts = checker.check({
      html: '<html><body>Content</body></html>',
      pageUrl: 'https://example.com/ok-page',
      robotsTxt: 'User-agent: *\nDisallow: /blocked-page',
      sitemapUrls: ['https://example.com/ok-page'],
    });
    expect(conflicts.find((c) => c.ruleId === 'rule-373')).toBeUndefined();
  });

  it('passes when URL is blocked but not in sitemap', () => {
    const conflicts = checker.check({
      html: '<html><body>Content</body></html>',
      pageUrl: 'https://example.com/blocked-page',
      robotsTxt: 'User-agent: *\nDisallow: /blocked-page',
      sitemapUrls: ['https://example.com/other-page'],
    });
    expect(conflicts.find((c) => c.ruleId === 'rule-373')).toBeUndefined();
  });

  it('does not flag rule 373 when robotsTxt or sitemapUrls are absent', () => {
    const conflicts = checker.check({
      html: '<html><body>Content</body></html>',
      pageUrl: 'https://example.com/page',
    });
    expect(conflicts.find((c) => c.ruleId === 'rule-373')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Rule 273 — noindex + canonical pointing elsewhere
  // ---------------------------------------------------------------------------

  it('detects noindex + external canonical conflict (rule 273)', () => {
    const conflicts = checker.check({
      html: '<meta name="robots" content="noindex"><link rel="canonical" href="https://example.com/other">',
      pageUrl: 'https://example.com/page',
    });
    expect(conflicts).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-273' })
    );
  });

  it('allows noindex with self-canonical (no conflict)', () => {
    const conflicts = checker.check({
      html: '<meta name="robots" content="noindex"><link rel="canonical" href="https://example.com/page">',
      pageUrl: 'https://example.com/page',
    });
    expect(conflicts.find((c) => c.ruleId === 'rule-273')).toBeUndefined();
  });

  it('does not flag rule 273 when there is no noindex', () => {
    const conflicts = checker.check({
      html: '<link rel="canonical" href="https://example.com/other">',
      pageUrl: 'https://example.com/page',
    });
    expect(conflicts.find((c) => c.ruleId === 'rule-273')).toBeUndefined();
  });

  it('does not flag rule 273 when there is no canonical', () => {
    const conflicts = checker.check({
      html: '<meta name="robots" content="noindex">',
      pageUrl: 'https://example.com/page',
    });
    expect(conflicts.find((c) => c.ruleId === 'rule-273')).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Internal nofollow links
  // ---------------------------------------------------------------------------

  it('detects nofollow on internal links', () => {
    const conflicts = checker.check({
      html: '<a href="https://example.com/other" rel="nofollow">Link</a>',
      pageUrl: 'https://example.com/page',
    });
    expect(conflicts).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-nofollow-internal' })
    );
  });

  it('does not flag nofollow on external links', () => {
    const conflicts = checker.check({
      html: '<a href="https://external-site.com/page" rel="nofollow">External</a>',
      pageUrl: 'https://example.com/page',
    });
    expect(
      conflicts.find((c) => c.ruleId === 'rule-nofollow-internal')
    ).toBeUndefined();
  });

  it('detects nofollow on relative internal links', () => {
    const conflicts = checker.check({
      html: '<a href="/about" rel="nofollow">About</a>',
      pageUrl: 'https://example.com/page',
    });
    expect(conflicts).toContainEqual(
      expect.objectContaining({ ruleId: 'rule-nofollow-internal' })
    );
  });

  // ---------------------------------------------------------------------------
  // Clean page — no conflicts
  // ---------------------------------------------------------------------------

  it('passes clean page', () => {
    const conflicts = checker.check({
      html: '<link rel="canonical" href="https://example.com/page"><a href="https://example.com/other">Link</a>',
      pageUrl: 'https://example.com/page',
    });
    expect(conflicts).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // robots.txt parsing edge cases
  // ---------------------------------------------------------------------------

  describe('isUrlBlocked', () => {
    it('handles Allow overriding Disallow for longer match', () => {
      const robotsTxt = [
        'User-agent: *',
        'Disallow: /private/',
        'Allow: /private/public-page',
      ].join('\n');

      expect(
        checker.isUrlBlocked(robotsTxt, 'https://example.com/private/secret')
      ).toBe(true);
      expect(
        checker.isUrlBlocked(robotsTxt, 'https://example.com/private/public-page')
      ).toBe(false);
    });

    it('returns false when no matching rules', () => {
      const robotsTxt = 'User-agent: *\nDisallow: /admin/';
      expect(
        checker.isUrlBlocked(robotsTxt, 'https://example.com/public')
      ).toBe(false);
    });

    it('handles empty Disallow (allow all)', () => {
      const robotsTxt = 'User-agent: *\nDisallow:';
      expect(
        checker.isUrlBlocked(robotsTxt, 'https://example.com/anything')
      ).toBe(false);
    });

    it('ignores comments in robots.txt', () => {
      const robotsTxt =
        '# this is a comment\nUser-agent: *\nDisallow: /blocked # inline comment';
      expect(
        checker.isUrlBlocked(robotsTxt, 'https://example.com/blocked')
      ).toBe(true);
    });
  });
});
