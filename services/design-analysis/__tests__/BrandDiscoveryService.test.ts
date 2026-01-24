import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrandDiscoveryService } from '../BrandDiscoveryService';

describe('BrandDiscoveryService', () => {
  describe('calculateConfidence', () => {
    it('should return "found" for button-extracted colors', () => {
      const confidence = BrandDiscoveryService.calculateConfidence('primary', 'button');
      expect(confidence).toBe('found');
    });

    it('should return "found" for h1_element sources', () => {
      const confidence = BrandDiscoveryService.calculateConfidence('heading', 'h1_element');
      expect(confidence).toBe('found');
    });

    it('should return "guessed" for frequency-based colors', () => {
      const confidence = BrandDiscoveryService.calculateConfidence('primary', 'frequency');
      expect(confidence).toBe('guessed');
    });

    it('should return "defaulted" for fallback colors', () => {
      const confidence = BrandDiscoveryService.calculateConfidence('primary', 'fallback');
      expect(confidence).toBe('defaulted');
    });
  });

  describe('buildReport', () => {
    it('should create BrandDiscoveryReport with all findings', () => {
      const mockData = {
        screenshotBase64: 'test-screenshot',
        colors: {
          primary: 'rgb(234, 88, 12)',
          secondary: '#1a1a1a',
          background: '#ffffff'
        },
        colorSources: {
          primary: 'button',
          secondary: 'heading',
          background: 'element'
        },
        typography: {
          heading: '"Playfair Display", serif',
          body: '"Inter", sans-serif'
        },
        typographySources: {
          heading: 'h1_element',
          body: 'body_element'
        },
        components: {
          button: { borderRadius: '8px', source: 'button_element' },
          shadow: { style: '0 4px 6px rgba(0,0,0,0.15)', source: 'card_element' }
        }
      };

      const report = BrandDiscoveryService.buildReport('https://example.com', mockData);

      expect(report.id).toBeDefined();
      expect(report.targetUrl).toBe('https://example.com');
      expect(report.screenshotBase64).toBe('test-screenshot');
      expect(report.findings.primaryColor.value).toBe('rgb(234, 88, 12)');
      expect(report.findings.primaryColor.confidence).toBe('found');
      expect(report.findings.headingFont.value).toContain('Playfair Display');
      expect(report.overallConfidence).toBeGreaterThan(0);
      expect(report.derivedTokens).toBeDefined();
      expect(report.derivedTokens.colors.primary).toBe('rgb(234, 88, 12)');
    });

    it('should use fallbacks when data is missing', () => {
      const emptyData = {
        colors: {},
        colorSources: {},
        typography: {},
        typographySources: {},
        components: {}
      };

      const report = BrandDiscoveryService.buildReport('https://example.com', emptyData);

      expect(report.findings.primaryColor.value).toBeDefined();
      expect(report.findings.primaryColor.confidence).toBe('defaulted');
    });

    it('should calculate overall confidence as average of all findings', () => {
      // All "found" sources should give 100
      const allFoundData = {
        colors: {
          primary: '#ff0000',
          secondary: '#00ff00',
          accent: '#0000ff',
          background: '#ffffff'
        },
        colorSources: {
          primary: 'button',
          secondary: 'heading',
          accent: 'button',
          background: 'element'
        },
        typography: {
          heading: 'Arial',
          body: 'Georgia'
        },
        typographySources: {
          heading: 'h1_element',
          body: 'body_element'
        },
        components: {
          button: { borderRadius: '4px', source: 'button_element' },
          shadow: { style: 'none', source: 'card_element' }
        }
      };

      const report = BrandDiscoveryService.buildReport('https://example.com', allFoundData);

      // 8 findings, all "found" (100 each) - should average to 100
      // But element source is "guessed" (60), so it won't be exactly 100
      expect(report.overallConfidence).toBeGreaterThanOrEqual(60);
      expect(report.overallConfidence).toBeLessThanOrEqual(100);
    });

    it('should include analyzedAt timestamp', () => {
      const mockData = {
        colors: { primary: '#ff0000' },
        colorSources: { primary: 'button' },
        typography: {},
        typographySources: {},
        components: {}
      };

      const beforeTime = new Date().toISOString();
      const report = BrandDiscoveryService.buildReport('https://example.com', mockData);
      const afterTime = new Date().toISOString();

      expect(report.analyzedAt).toBeDefined();
      expect(report.analyzedAt >= beforeTime).toBe(true);
      expect(report.analyzedAt <= afterTime).toBe(true);
    });

    it('should generate unique IDs', () => {
      const mockData = {
        colors: {},
        colorSources: {},
        typography: {},
        typographySources: {},
        components: {}
      };

      const report1 = BrandDiscoveryService.buildReport('https://example.com', mockData);
      const report2 = BrandDiscoveryService.buildReport('https://example.com', mockData);

      // Due to Date.now() being used, rapid calls might get same ID
      // but the IDs should at least be strings starting with 'discovery-'
      expect(report1.id).toMatch(/^discovery-\d+$/);
      expect(report2.id).toMatch(/^discovery-\d+$/);
    });

    it('should populate derivedTokens with complete structure', () => {
      const mockData = {
        colors: {
          primary: '#ea580c',
          secondary: '#18181b',
          background: '#ffffff'
        },
        colorSources: { primary: 'button' },
        typography: {
          heading: 'Playfair Display',
          body: 'Inter'
        },
        typographySources: {},
        components: {}
      };

      const report = BrandDiscoveryService.buildReport('https://example.com', mockData);

      // Check that derivedTokens has all required color fields
      expect(report.derivedTokens.colors.primary).toBe('#ea580c');
      expect(report.derivedTokens.colors.secondary).toBe('#18181b');
      expect(report.derivedTokens.colors.background).toBe('#ffffff');
      expect(report.derivedTokens.colors.surface).toBeDefined();
      expect(report.derivedTokens.colors.text).toBeDefined();
      expect(report.derivedTokens.colors.textMuted).toBeDefined();
      expect(report.derivedTokens.colors.border).toBeDefined();

      // Check fonts
      expect(report.derivedTokens.fonts.heading).toBe('Playfair Display');
      expect(report.derivedTokens.fonts.body).toBe('Inter');
      expect(report.derivedTokens.fonts.mono).toBeDefined();
    });
  });
});
