import { describe, it, expect } from 'vitest';
import { MetaValidator } from '../MetaValidator';

describe('MetaValidator', () => {
  const validator = new MetaValidator();

  // ---------------------------------------------------------------------------
  // Helper: builds a minimal valid HTML page with all meta elements present
  // ---------------------------------------------------------------------------
  function validPage(overrides: Partial<{
    lang: string;
    charset: string;
    viewport: string;
    description: string;
    schema: string;
  }> = {}): string {
    const lang = overrides.lang ?? 'en';
    const charset = overrides.charset ?? '<meta charset="utf-8">';
    const viewport = overrides.viewport ?? '<meta name="viewport" content="width=device-width, initial-scale=1">';
    const description = overrides.description ??
      '<meta name="description" content="A well-crafted meta description that is exactly within the recommended length range for search engine result pages and provides value.">';
    const schema = overrides.schema ??
      '<script type="application/ld+json">{"@type":"Article","headline":"Test"}</script>';

    return `<html lang="${lang}"><head>${charset}${viewport}${description}${schema}<title>Test</title></head><body></body></html>`;
  }

  // ---------------------------------------------------------------------------
  // Rule 270: Meta description
  // ---------------------------------------------------------------------------
  describe('rule-270: meta description', () => {
    it('detects missing meta description', () => {
      const html = '<html lang="en"><head><meta charset="utf-8"><title>Test</title></head></html>';
      const issues = validator.validate(html);
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-270' }));
    });

    it('detects meta description that is too short', () => {
      const shortDesc = 'Too short';
      const html = `<html lang="en"><head><meta name="description" content="${shortDesc}"></head></html>`;
      const issues = validator.validate(html);
      const issue = issues.find(i => i.ruleId === 'rule-270-short');
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('medium');
      expect(issue!.currentValue).toBe(shortDesc);
    });

    it('detects meta description that is too long', () => {
      const longDesc = 'A'.repeat(180);
      const html = `<html lang="en"><head><meta name="description" content="${longDesc}"></head></html>`;
      const issues = validator.validate(html);
      const issue = issues.find(i => i.ruleId === 'rule-270-long');
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('low');
      expect(issue!.description).toContain('180');
    });

    it('passes for meta description in the optimal range (120-160 chars)', () => {
      const goodDesc = 'A'.repeat(140);
      const html = `<html lang="en"><head><meta name="description" content="${goodDesc}"></head></html>`;
      const issues = validator.validate(html);
      const descIssues = issues.filter(i => i.ruleId.startsWith('rule-270'));
      expect(descIssues).toHaveLength(0);
    });

    it('handles content-before-name attribute ordering', () => {
      const html = '<meta content="Short" name="description">';
      const issues = validator.validate(html);
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-270-short' }));
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 276: HTML lang attribute
  // ---------------------------------------------------------------------------
  describe('rule-276: lang attribute', () => {
    it('detects missing lang attribute on <html>', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>';
      const issues = validator.validate(html);
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-276' }));
    });

    it('passes when lang attribute is present', () => {
      const html = '<html lang="en"><head><title>Test</title></head></html>';
      const issues = validator.validate(html);
      expect(issues.find(i => i.ruleId === 'rule-276')).toBeUndefined();
    });

    it('accepts non-English lang values', () => {
      const html = '<html lang="fr"><head><title>Test</title></head></html>';
      const issues = validator.validate(html);
      expect(issues.find(i => i.ruleId === 'rule-276')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 277: Viewport meta tag
  // ---------------------------------------------------------------------------
  describe('rule-277: viewport meta tag', () => {
    it('detects missing viewport meta tag', () => {
      const html = '<html lang="en"><head><meta charset="utf-8"><title>Test</title></head></html>';
      const issues = validator.validate(html);
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-277' }));
    });

    it('passes when viewport meta tag is present', () => {
      const html = '<meta name="viewport" content="width=device-width, initial-scale=1">';
      const issues = validator.validate(html);
      expect(issues.find(i => i.ruleId === 'rule-277')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 278: Charset declaration
  // ---------------------------------------------------------------------------
  describe('rule-278: charset declaration', () => {
    it('detects missing charset declaration', () => {
      const html = '<html lang="en"><head><title>Test</title></head></html>';
      const issues = validator.validate(html);
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-278' }));
    });

    it('passes when charset is declared', () => {
      const html = '<meta charset="utf-8">';
      const issues = validator.validate(html);
      expect(issues.find(i => i.ruleId === 'rule-278')).toBeUndefined();
    });

    it('accepts charset without quotes', () => {
      const html = '<meta charset=utf-8>';
      const issues = validator.validate(html);
      expect(issues.find(i => i.ruleId === 'rule-278')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 279: JSON-LD schema presence
  // ---------------------------------------------------------------------------
  describe('rule-279: JSON-LD structured data', () => {
    it('detects absence of JSON-LD structured data', () => {
      const html = '<html lang="en"><head><title>Test</title></head></html>';
      const issues = validator.validate(html);
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-279' }));
    });

    it('passes when JSON-LD schema is present', () => {
      const html = '<script type="application/ld+json">{"@type":"Article"}</script>';
      const issues = validator.validate(html);
      expect(issues.find(i => i.ruleId === 'rule-279')).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Rule 284: JSON-LD schema validity
  // ---------------------------------------------------------------------------
  describe('rule-284: JSON-LD schema validity', () => {
    it('detects invalid JSON in a JSON-LD block', () => {
      const html = '<script type="application/ld+json">{invalid json}</script>';
      const issues = validator.validate(html);
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-284' }));
    });

    it('detects JSON-LD without @type or @graph', () => {
      const html = '<script type="application/ld+json">{"name":"Missing type"}</script>';
      const issues = validator.validate(html);
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-284' }));
    });

    it('passes for valid JSON-LD with @type', () => {
      const html = '<script type="application/ld+json">{"@type":"Article","headline":"Test"}</script>';
      const issues = validator.validate(html);
      expect(issues.find(i => i.ruleId === 'rule-284')).toBeUndefined();
    });

    it('passes for valid JSON-LD with @graph', () => {
      const html = '<script type="application/ld+json">{"@graph":[{"@type":"WebPage"}]}</script>';
      const issues = validator.validate(html);
      expect(issues.find(i => i.ruleId === 'rule-284')).toBeUndefined();
    });

    it('counts multiple invalid JSON-LD blocks', () => {
      const html =
        '<script type="application/ld+json">{bad}</script>' +
        '<script type="application/ld+json">{"no_type": true}</script>';
      const issues = validator.validate(html);
      const issue = issues.find(i => i.ruleId === 'rule-284');
      expect(issue).toBeDefined();
      expect(issue!.description).toContain('2');
    });
  });

  // ---------------------------------------------------------------------------
  // Integration: fully valid page produces zero issues
  // ---------------------------------------------------------------------------
  describe('clean pass', () => {
    it('returns zero issues for a fully valid page', () => {
      const html = validPage();
      const issues = validator.validate(html);
      expect(issues).toHaveLength(0);
    });

    it('returns zero issues for a page with multiple valid schemas', () => {
      const html = validPage({
        schema:
          '<script type="application/ld+json">{"@type":"Article","headline":"Test"}</script>' +
          '<script type="application/ld+json">{"@type":"BreadcrumbList","itemListElement":[]}</script>',
      });
      const issues = validator.validate(html);
      expect(issues).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------
  describe('edge cases', () => {
    it('handles completely empty HTML string', () => {
      const issues = validator.validate('');
      // Should flag: missing description, missing lang, missing viewport,
      // missing charset, and no JSON-LD
      expect(issues.length).toBeGreaterThanOrEqual(5);
    });

    it('does not flag meta description at exactly 70 characters (boundary)', () => {
      const desc = 'A'.repeat(70);
      const html = `<meta name="description" content="${desc}">`;
      const issues = validator.validate(html);
      const descIssues = issues.filter(i => i.ruleId.startsWith('rule-270'));
      expect(descIssues).toHaveLength(0);
    });

    it('flags meta description at 69 characters as too short', () => {
      const desc = 'A'.repeat(69);
      const html = `<meta name="description" content="${desc}">`;
      const issues = validator.validate(html);
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-270-short' }));
    });

    it('does not flag meta description at exactly 160 characters (boundary)', () => {
      const desc = 'A'.repeat(160);
      const html = `<meta name="description" content="${desc}">`;
      const issues = validator.validate(html);
      const descIssues = issues.filter(i => i.ruleId.startsWith('rule-270'));
      expect(descIssues).toHaveLength(0);
    });

    it('flags meta description at 161 characters as too long', () => {
      const desc = 'A'.repeat(161);
      const html = `<meta name="description" content="${desc}">`;
      const issues = validator.validate(html);
      expect(issues).toContainEqual(expect.objectContaining({ ruleId: 'rule-270-long' }));
    });
  });
});
