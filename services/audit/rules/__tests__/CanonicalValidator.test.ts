import { describe, it, expect } from 'vitest';
import { CanonicalValidator } from '../CanonicalValidator';
import type { CanonicalContext } from '../CanonicalValidator';

describe('CanonicalValidator', () => {
  const validator = new CanonicalValidator();

  // ---------------------------------------------------------------------------
  // Rule 271 — Canonical tag must be present
  // ---------------------------------------------------------------------------
  describe('rule-271: missing canonical', () => {
    it('detects missing canonical tag', () => {
      const issues = validator.validate({
        html: '<html><head><title>Test</title></head><body></body></html>',
        pageUrl: 'https://example.com/page',
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-271' }));
    });

    it('does not flag when canonical is present', () => {
      const issues = validator.validate({
        html: '<link rel="canonical" href="https://example.com/page">',
        pageUrl: 'https://example.com/page',
      });
      expect(issues.find(i => i.ruleId === 'rule-271')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 273 — noindex + canonical pointing elsewhere = conflict
  // ---------------------------------------------------------------------------
  describe('rule-273: noindex + canonical conflict', () => {
    it('detects noindex combined with canonical pointing elsewhere', () => {
      const issues = validator.validate({
        html:
          '<meta name="robots" content="noindex">' +
          '<link rel="canonical" href="https://example.com/other">',
        pageUrl: 'https://example.com/page',
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-273' }));
    });

    it('does not flag noindex with self-referencing canonical', () => {
      const issues = validator.validate({
        html:
          '<meta name="robots" content="noindex">' +
          '<link rel="canonical" href="https://example.com/page">',
        pageUrl: 'https://example.com/page',
      });
      expect(issues.find(i => i.ruleId === 'rule-273')).toBeUndefined();
    });

    it('does not flag canonical without noindex', () => {
      const issues = validator.validate({
        html: '<link rel="canonical" href="https://example.com/other">',
        pageUrl: 'https://example.com/page',
      });
      expect(issues.find(i => i.ruleId === 'rule-273')).toBeUndefined();
    });

    it('handles noindex in mixed robots directives', () => {
      const issues = validator.validate({
        html:
          '<meta name="robots" content="noindex, nofollow">' +
          '<link rel="canonical" href="https://example.com/other">',
        pageUrl: 'https://example.com/page',
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-273' }));
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 346 — Canonical should be self-referencing
  // ---------------------------------------------------------------------------
  describe('rule-346: non-self-referencing canonical', () => {
    it('detects canonical pointing to a different page', () => {
      const issues = validator.validate({
        html: '<link rel="canonical" href="https://example.com/other-page">',
        pageUrl: 'https://example.com/page',
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-346' }));
    });

    it('passes when canonical is self-referencing', () => {
      const issues = validator.validate({
        html: '<link rel="canonical" href="https://example.com/page">',
        pageUrl: 'https://example.com/page',
      });
      expect(issues.find(i => i.ruleId === 'rule-346')).toBeUndefined();
    });

    it('normalizes trailing slashes for comparison', () => {
      const issues = validator.validate({
        html: '<link rel="canonical" href="https://example.com/page/">',
        pageUrl: 'https://example.com/page',
      });
      expect(issues.find(i => i.ruleId === 'rule-346')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 347 — Canonical URL must be absolute, no fragments
  // ---------------------------------------------------------------------------
  describe('rule-347: canonical format', () => {
    it('detects relative canonical URL', () => {
      const issues = validator.validate({
        html: '<link rel="canonical" href="/page">',
        pageUrl: 'https://example.com/page',
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-347' }));
    });

    it('detects canonical URL with fragment', () => {
      const issues = validator.validate({
        html: '<link rel="canonical" href="https://example.com/page#section">',
        pageUrl: 'https://example.com/page',
      });
      expect(issues).toContainEqual(
        expect.objectContaining({
          ruleId: 'rule-347',
          title: expect.stringContaining('fragment'),
        })
      );
    });

    it('passes with a valid absolute canonical URL', () => {
      const issues = validator.validate({
        html: '<link rel="canonical" href="https://example.com/page">',
        pageUrl: 'https://example.com/page',
      });
      expect(issues.find(i => i.ruleId === 'rule-347')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 349 — HTML and HTTP header canonical must match
  // ---------------------------------------------------------------------------
  describe('rule-349: HTML / HTTP header canonical mismatch', () => {
    it('detects mismatch between HTML canonical and HTTP Link header', () => {
      const issues = validator.validate({
        html: '<link rel="canonical" href="https://example.com/page">',
        pageUrl: 'https://example.com/page',
        httpHeaders: { link: '<https://example.com/other>; rel="canonical"' },
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-349' }));
    });

    it('passes when HTML and HTTP header canonical match', () => {
      const issues = validator.validate({
        html: '<link rel="canonical" href="https://example.com/page">',
        pageUrl: 'https://example.com/page',
        httpHeaders: { link: '<https://example.com/page>; rel="canonical"' },
      });
      expect(issues.find(i => i.ruleId === 'rule-349')).toBeUndefined();
    });

    it('skips rule when no HTTP headers are provided', () => {
      const issues = validator.validate({
        html: '<link rel="canonical" href="https://example.com/page">',
        pageUrl: 'https://example.com/page',
      });
      expect(issues.find(i => i.ruleId === 'rule-349')).toBeUndefined();
    });

    it('skips rule when HTTP headers have no Link header', () => {
      const issues = validator.validate({
        html: '<link rel="canonical" href="https://example.com/page">',
        pageUrl: 'https://example.com/page',
        httpHeaders: { 'content-type': 'text/html' },
      });
      expect(issues.find(i => i.ruleId === 'rule-349')).toBeUndefined();
    });

    it('handles case-insensitive header key lookup', () => {
      const issues = validator.validate({
        html: '<link rel="canonical" href="https://example.com/page">',
        pageUrl: 'https://example.com/page',
        httpHeaders: { Link: '<https://example.com/other>; rel="canonical"' },
      });
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-349' }));
    });
  });

  // ---------------------------------------------------------------------------
  // Extraction helpers
  // ---------------------------------------------------------------------------
  describe('extractCanonical', () => {
    it('extracts canonical with rel before href', () => {
      const html = '<link rel="canonical" href="https://example.com/page">';
      expect(validator.extractCanonical(html)).toBe('https://example.com/page');
    });

    it('extracts canonical with href before rel', () => {
      const html = '<link href="https://example.com/page" rel="canonical">';
      expect(validator.extractCanonical(html)).toBe('https://example.com/page');
    });

    it('returns null when no canonical tag present', () => {
      const html = '<link rel="stylesheet" href="/style.css">';
      expect(validator.extractCanonical(html)).toBeNull();
    });

    it('handles single quotes in attributes', () => {
      const html = "<link rel='canonical' href='https://example.com/page'>";
      expect(validator.extractCanonical(html)).toBe('https://example.com/page');
    });
  });

  describe('extractMetaRobots', () => {
    it('extracts robots content with name before content', () => {
      const html = '<meta name="robots" content="noindex, nofollow">';
      expect(validator.extractMetaRobots(html)).toBe('noindex, nofollow');
    });

    it('extracts robots content with content before name', () => {
      const html = '<meta content="noindex" name="robots">';
      expect(validator.extractMetaRobots(html)).toBe('noindex');
    });

    it('returns empty string when no robots meta tag', () => {
      const html = '<meta name="description" content="A page">';
      expect(validator.extractMetaRobots(html)).toBe('');
    });
  });

  describe('extractHttpCanonical', () => {
    it('extracts URL from Link header', () => {
      const result = validator.extractHttpCanonical({
        link: '<https://example.com/page>; rel="canonical"',
      });
      expect(result).toBe('https://example.com/page');
    });

    it('returns null when no headers provided', () => {
      expect(validator.extractHttpCanonical(undefined)).toBeNull();
    });

    it('returns null when Link header has no canonical rel', () => {
      const result = validator.extractHttpCanonical({
        link: '<https://example.com/page>; rel="preload"',
      });
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Integration: clean canonical setup
  // ---------------------------------------------------------------------------
  describe('clean setup', () => {
    it('returns zero issues for a fully valid canonical setup', () => {
      const issues = validator.validate({
        html: '<link rel="canonical" href="https://example.com/page">',
        pageUrl: 'https://example.com/page',
      });
      expect(issues).toHaveLength(0);
    });

    it('returns zero issues when HTML and HTTP header both match the page URL', () => {
      const issues = validator.validate({
        html: '<link rel="canonical" href="https://example.com/page">',
        pageUrl: 'https://example.com/page',
        httpHeaders: { link: '<https://example.com/page>; rel="canonical"' },
      });
      expect(issues).toHaveLength(0);
    });
  });
});
