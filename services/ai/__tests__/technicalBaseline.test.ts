import { describe, it, expect } from 'vitest';
import {
  extractTechnicalBaseline,
  TechnicalBaselineInput,
} from '../technicalBaseline';

function makeInput(overrides: Partial<TechnicalBaselineInput> = {}): TechnicalBaselineInput {
  return {
    html: overrides.html ?? '<html><head></head><body></body></html>',
    headers: overrides.headers ?? {},
    domainAuthority: overrides.domainAuthority,
  };
}

describe('extractTechnicalBaseline', () => {
  describe('CMS detection', () => {
    it('should detect CMS from meta generator tag', () => {
      const input = makeInput({
        html: '<html><head><meta name="generator" content="WordPress 6.4"></head><body></body></html>',
      });

      const result = extractTechnicalBaseline(input);
      expect(result.cms).toBe('WordPress');
    });

    it('should detect CMS from HTML patterns when no generator tag', () => {
      const input = makeInput({
        html: '<html><head></head><body><link rel="stylesheet" href="/wp-content/themes/theme/style.css"></body></html>',
      });

      const result = extractTechnicalBaseline(input);
      expect(result.cms).toBe('WordPress');
    });

    it('should detect Shopify from CDN pattern', () => {
      const input = makeInput({
        html: '<html><head></head><body><script src="https://cdn.shopify.com/s/files/1/theme.js"></script></body></html>',
      });

      const result = extractTechnicalBaseline(input);
      expect(result.cms).toBe('Shopify');
    });

    it('should detect Next.js from _next pattern', () => {
      const input = makeInput({
        html: '<html><head></head><body><script src="/_next/static/chunks/main.js"></script></body></html>',
      });

      const result = extractTechnicalBaseline(input);
      expect(result.cms).toBe('Next.js');
    });

    it('should return null when no CMS detected', () => {
      const input = makeInput({
        html: '<html><head></head><body><p>Plain HTML</p></body></html>',
      });

      const result = extractTechnicalBaseline(input);
      expect(result.cms).toBeNull();
    });
  });

  describe('Schema markup extraction', () => {
    it('should extract schema types from JSON-LD', () => {
      const input = makeInput({
        html: `<html><head>
          <script type="application/ld+json">
            {"@type": "Organization", "name": "Test"}
          </script>
        </head><body></body></html>`,
      });

      const result = extractTechnicalBaseline(input);
      expect(result.hasSchemaMarkup).toBe(true);
      expect(result.schemaTypes).toContain('Organization');
    });

    it('should extract types from @graph arrays', () => {
      const input = makeInput({
        html: `<html><head>
          <script type="application/ld+json">
            {"@graph": [
              {"@type": "WebSite", "name": "Test"},
              {"@type": "WebPage", "name": "Home"}
            ]}
          </script>
        </head><body></body></html>`,
      });

      const result = extractTechnicalBaseline(input);
      expect(result.hasSchemaMarkup).toBe(true);
      expect(result.schemaTypes).toContain('WebSite');
      expect(result.schemaTypes).toContain('WebPage');
    });

    it('should handle multiple JSON-LD blocks', () => {
      const input = makeInput({
        html: `<html><head>
          <script type="application/ld+json">{"@type": "Organization"}</script>
          <script type="application/ld+json">{"@type": "BreadcrumbList"}</script>
        </head><body></body></html>`,
      });

      const result = extractTechnicalBaseline(input);
      expect(result.schemaTypes).toEqual(['BreadcrumbList', 'Organization']);
    });

    it('should handle invalid JSON-LD gracefully', () => {
      const input = makeInput({
        html: `<html><head>
          <script type="application/ld+json">{ invalid json }</script>
        </head><body></body></html>`,
      });

      const result = extractTechnicalBaseline(input);
      expect(result.hasSchemaMarkup).toBe(false);
      expect(result.schemaTypes).toEqual([]);
    });
  });

  describe('Canonical and hreflang detection', () => {
    it('should detect canonical link', () => {
      const input = makeInput({
        html: '<html><head><link rel="canonical" href="https://example.com/page"></head><body></body></html>',
      });

      const result = extractTechnicalBaseline(input);
      expect(result.hasCanonical).toBe(true);
    });

    it('should detect hreflang link', () => {
      const input = makeInput({
        html: '<html><head><link rel="alternate" hreflang="en" href="https://example.com/en/page"></head><body></body></html>',
      });

      const result = extractTechnicalBaseline(input);
      expect(result.hasHreflang).toBe(true);
    });
  });

  describe('Server tech detection', () => {
    it('should detect server tech from x-powered-by header', () => {
      const input = makeInput({
        headers: { 'X-Powered-By': 'Express' },
      });

      const result = extractTechnicalBaseline(input);
      expect(result.serverTech).toBe('Express');
    });

    it('should detect server tech from server header', () => {
      const input = makeInput({
        headers: { 'server': 'nginx/1.24' },
      });

      const result = extractTechnicalBaseline(input);
      expect(result.serverTech).toBe('nginx/1.24');
    });

    it('should prefer x-powered-by over server header', () => {
      const input = makeInput({
        headers: { 'X-Powered-By': 'Express', 'Server': 'nginx' },
      });

      const result = extractTechnicalBaseline(input);
      expect(result.serverTech).toBe('Express');
    });
  });

  describe('Technical issues detection', () => {
    it('should detect missing canonical, schema, viewport, title, description, and lang', () => {
      const input = makeInput({
        html: '<html><head></head><body></body></html>',
      });

      const result = extractTechnicalBaseline(input);

      expect(result.technicalIssues).toContain('Missing canonical tag');
      expect(result.technicalIssues).toContain('No structured data (JSON-LD) found');
      expect(result.technicalIssues).toContain('Missing viewport meta tag');
      expect(result.technicalIssues).toContain('Missing or empty title tag');
      expect(result.technicalIssues).toContain('Missing meta description');
      expect(result.technicalIssues).toContain('Missing lang attribute on html element');
    });

    it('should report no issues for a well-formed page', () => {
      const input = makeInput({
        html: `<html lang="en"><head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="description" content="Test page">
          <title>Test Page</title>
          <link rel="canonical" href="https://example.com/test">
          <script type="application/ld+json">{"@type": "WebPage"}</script>
        </head><body></body></html>`,
      });

      const result = extractTechnicalBaseline(input);
      expect(result.technicalIssues).toEqual([]);
    });
  });
});
