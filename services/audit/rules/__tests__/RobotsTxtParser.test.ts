import { describe, it, expect } from 'vitest';
import { RobotsTxtParser } from '../RobotsTxtParser';

describe('RobotsTxtParser', () => {
  const parser = new RobotsTxtParser();

  // ---------------------------------------------------------------------------
  // parse
  // ---------------------------------------------------------------------------
  describe('parse', () => {
    it('parses simple robots.txt', () => {
      const groups = parser.parse(
        'User-agent: *\nDisallow: /admin\nAllow: /admin/public'
      );
      expect(groups).toHaveLength(1);
      expect(groups[0].userAgents).toContain('*');
      expect(groups[0].rules).toHaveLength(2);
    });

    it('parses multiple user-agent groups', () => {
      const groups = parser.parse(
        'User-agent: Googlebot\nDisallow: /private\n\nUser-agent: *\nDisallow: /admin'
      );
      expect(groups).toHaveLength(2);
    });

    it('ignores comments', () => {
      const groups = parser.parse(
        '# Comment\nUser-agent: *\n# Another comment\nDisallow: /admin'
      );
      expect(groups).toHaveLength(1);
      expect(groups[0].rules).toHaveLength(1);
    });

    it('handles multiple user-agents sharing a group', () => {
      const groups = parser.parse(
        'User-agent: Googlebot\nUser-agent: Bingbot\nDisallow: /private'
      );
      expect(groups).toHaveLength(1);
      expect(groups[0].userAgents).toContain('Googlebot');
      expect(groups[0].userAgents).toContain('Bingbot');
      expect(groups[0].rules).toHaveLength(1);
    });

    it('skips empty Disallow values', () => {
      const groups = parser.parse('User-agent: *\nDisallow:');
      expect(groups).toHaveLength(1);
      expect(groups[0].rules).toHaveLength(0);
    });

    it('handles inline comments after directives', () => {
      const groups = parser.parse(
        'User-agent: * # all bots\nDisallow: /admin # admin area'
      );
      expect(groups).toHaveLength(1);
      expect(groups[0].userAgents).toContain('*');
      expect(groups[0].rules[0].path).toBe('/admin');
    });
  });

  // ---------------------------------------------------------------------------
  // isBlocked
  // ---------------------------------------------------------------------------
  describe('isBlocked', () => {
    it('detects blocked URL', () => {
      expect(
        parser.isBlocked('User-agent: *\nDisallow: /admin', '/admin/page')
      ).toBe(true);
    });

    it('allows non-blocked URL', () => {
      expect(
        parser.isBlocked('User-agent: *\nDisallow: /admin', '/public/page')
      ).toBe(false);
    });

    it('handles Allow override of Disallow', () => {
      const txt = 'User-agent: *\nDisallow: /admin\nAllow: /admin/public';
      expect(parser.isBlocked(txt, '/admin/public/page')).toBe(false);
      expect(parser.isBlocked(txt, '/admin/secret')).toBe(true);
    });

    it('handles empty Disallow (allow all)', () => {
      expect(
        parser.isBlocked('User-agent: *\nDisallow:', '/any-page')
      ).toBe(false);
    });

    it('handles wildcard user-agent', () => {
      expect(
        parser.isBlocked('User-agent: *\nDisallow: /secret', '/secret', '*')
      ).toBe(true);
    });

    it('matches specific user-agent over wildcard', () => {
      const txt =
        'User-agent: Googlebot\nDisallow: /google-only\n\nUser-agent: *\nDisallow: /all';
      expect(parser.isBlocked(txt, '/google-only', 'Googlebot')).toBe(true);
      expect(parser.isBlocked(txt, '/all', 'Googlebot')).toBe(false);
    });

    it('falls back to wildcard when no specific user-agent match', () => {
      const txt = 'User-agent: *\nDisallow: /blocked';
      expect(parser.isBlocked(txt, '/blocked', 'SomeBot')).toBe(true);
    });

    it('returns false when no matching group exists', () => {
      const txt = 'User-agent: Googlebot\nDisallow: /private';
      expect(parser.isBlocked(txt, '/private', 'Bingbot')).toBe(false);
    });

    it('handles end-of-path anchor ($)', () => {
      const txt = 'User-agent: *\nDisallow: /exact$';
      expect(parser.isBlocked(txt, '/exact')).toBe(true);
      expect(parser.isBlocked(txt, '/exact/sub')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // extractMetaRobots
  // ---------------------------------------------------------------------------
  describe('extractMetaRobots', () => {
    it('extracts noindex directive', () => {
      const directives = parser.extractMetaRobots(
        '<meta name="robots" content="noindex, nofollow">'
      );
      expect(directives).toContain('noindex');
      expect(directives).toContain('nofollow');
    });

    it('returns empty for no meta robots', () => {
      expect(
        parser.extractMetaRobots('<html><body></body></html>')
      ).toHaveLength(0);
    });

    it('handles content before name attribute ordering', () => {
      const directives = parser.extractMetaRobots(
        '<meta content="noindex" name="robots">'
      );
      expect(directives).toContain('noindex');
    });

    it('normalizes directive case', () => {
      const directives = parser.extractMetaRobots(
        '<meta name="robots" content="NOINDEX, NOFOLLOW">'
      );
      expect(directives).toContain('noindex');
      expect(directives).toContain('nofollow');
    });

    it('handles single directive without commas', () => {
      const directives = parser.extractMetaRobots(
        '<meta name="robots" content="noindex">'
      );
      expect(directives).toEqual(['noindex']);
    });
  });

  // ---------------------------------------------------------------------------
  // validate
  // ---------------------------------------------------------------------------
  describe('validate', () => {
    it('detects blocked URL in robots.txt (rule 371)', () => {
      const issues = parser.validate({
        html: '<html><body></body></html>',
        robotsTxt: 'User-agent: *\nDisallow: /blocked',
        urlPath: '/blocked/page',
        shouldBeIndexed: true,
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-371' })
      );
    });

    it('detects noindex meta tag (rule 372)', () => {
      const issues = parser.validate({
        html: '<meta name="robots" content="noindex">',
        urlPath: '/page',
        shouldBeIndexed: true,
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-372' })
      );
    });

    it('passes clean page', () => {
      const issues = parser.validate({
        html: '<html><body>Content</body></html>',
        robotsTxt: 'User-agent: *\nDisallow: /admin',
        urlPath: '/page',
        shouldBeIndexed: true,
      });
      expect(issues).toHaveLength(0);
    });

    it('skips rule 371 when shouldBeIndexed is false', () => {
      const issues = parser.validate({
        html: '<html><body></body></html>',
        robotsTxt: 'User-agent: *\nDisallow: /blocked',
        urlPath: '/blocked/page',
        shouldBeIndexed: false,
      });
      expect(issues.find((i) => i.ruleId === 'rule-371')).toBeUndefined();
    });

    it('skips rule 372 when shouldBeIndexed is false', () => {
      const issues = parser.validate({
        html: '<meta name="robots" content="noindex">',
        urlPath: '/page',
        shouldBeIndexed: false,
      });
      expect(issues.find((i) => i.ruleId === 'rule-372')).toBeUndefined();
    });

    it('reports both rule 371 and 372 when both conditions are met', () => {
      const issues = parser.validate({
        html: '<meta name="robots" content="noindex">',
        robotsTxt: 'User-agent: *\nDisallow: /blocked',
        urlPath: '/blocked/page',
        shouldBeIndexed: true,
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-371' })
      );
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-372' })
      );
    });

    it('defaults shouldBeIndexed to true when not provided', () => {
      const issues = parser.validate({
        html: '<meta name="robots" content="noindex">',
        urlPath: '/page',
      });
      expect(issues).toContainEqual(
        expect.objectContaining({ ruleId: 'rule-372' })
      );
    });
  });
});
