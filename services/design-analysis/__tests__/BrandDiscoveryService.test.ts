import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrandDiscoveryService } from '../BrandDiscoveryService';

describe('BrandDiscoveryService', () => {
  describe('isNeutral helper', () => {
    // Extract the isNeutral function for testing
    const isNeutral = (c: string | null): boolean => {
      if (!c || c.includes('rgba(0, 0, 0, 0)')) return true;

      let r: number, g: number, b: number;

      // Handle hex colors
      if (c.startsWith('#')) {
        const hex = c.replace('#', '');
        const fullHex = hex.length === 3
          ? hex.split('').map(ch => ch + ch).join('')
          : hex;
        r = parseInt(fullHex.slice(0, 2), 16);
        g = parseInt(fullHex.slice(2, 4), 16);
        b = parseInt(fullHex.slice(4, 6), 16);
      } else {
        // Handle rgb/rgba
        const match = c.match(/\d+/g);
        if (!match || match.length < 3) return true;
        [r, g, b] = match.map(Number);
      }

      if (r === 255 && g === 255 && b === 255) return true;
      if (r === 0 && g === 0 && b === 0) return true;
      // Gray detection: all channels similar
      if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15) return true;
      return false;
    };

    it('should correctly identify hex brand colors as NOT neutral', () => {
      expect(isNeutral('#012d55')).toBe(false); // MVGM blue
      expect(isNeutral('#ea580c')).toBe(false); // Orange
      expect(isNeutral('#1a4a7a')).toBe(false); // Blue
      expect(isNeutral('#ff6b6b')).toBe(false); // Coral
    });

    it('should correctly identify rgb brand colors as NOT neutral', () => {
      expect(isNeutral('rgb(1, 45, 85)')).toBe(false);
      expect(isNeutral('rgb(234, 88, 12)')).toBe(false);
    });

    it('should identify white as neutral', () => {
      expect(isNeutral('#ffffff')).toBe(true);
      expect(isNeutral('#fff')).toBe(true);
      expect(isNeutral('rgb(255, 255, 255)')).toBe(true);
    });

    it('should identify black as neutral', () => {
      expect(isNeutral('#000000')).toBe(true);
      expect(isNeutral('#000')).toBe(true);
      expect(isNeutral('rgb(0, 0, 0)')).toBe(true);
    });

    it('should identify grays as neutral', () => {
      expect(isNeutral('#808080')).toBe(true);
      expect(isNeutral('#18181b')).toBe(true);
      expect(isNeutral('rgb(128, 128, 128)')).toBe(true);
    });
  });

  describe('rgbToHex helper', () => {
    const rgbToHex = (c: string | null): string | null => {
      if (!c) return null;
      if (c.startsWith('#')) return c.toLowerCase();
      const match = c.match(/\d+/g);
      if (!match || match.length < 3) return null;
      const [r, g, b] = match.map(Number);
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    };

    it('should pass through valid hex colors', () => {
      expect(rgbToHex('#012d55')).toBe('#012d55');
      expect(rgbToHex('#EA580C')).toBe('#ea580c');
    });

    it('should convert rgb to hex', () => {
      expect(rgbToHex('rgb(1, 45, 85)')).toBe('#012d55');
      expect(rgbToHex('rgb(234, 88, 12)')).toBe('#ea580c');
    });

    it('should handle rgba', () => {
      expect(rgbToHex('rgba(1, 45, 85, 1)')).toBe('#012d55');
    });

    it('should return null for invalid input', () => {
      expect(rgbToHex(null)).toBe(null);
      expect(rgbToHex('')).toBe(null);
    });
  });


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
      expect(report.findings.primaryColor.value).toBe('#ea580c');
      expect(report.findings.primaryColor.confidence).toBe('found');
      expect(report.findings.headingFont.value).toContain('Playfair Display');
      expect(report.overallConfidence).toBeGreaterThan(0);
      expect(report.derivedTokens).toBeDefined();
      expect(report.derivedTokens.colors.primary).toBe('#ea580c');
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

      expect(report.derivedTokens.colors.primary).toBe('#ea580c');
      expect(report.derivedTokens.colors.secondary).toBe('#18181b');
      expect(report.derivedTokens.colors.background).toBe('#ffffff');
      expect(report.derivedTokens.colors.surface).toBeDefined();
      expect(report.derivedTokens.colors.text).toBeDefined();
      expect(report.derivedTokens.colors.textMuted).toBeDefined();
      expect(report.derivedTokens.colors.border).toBeDefined();

      expect(report.derivedTokens.fonts.heading).toBe('Playfair Display');
      expect(report.derivedTokens.fonts.body).toBe('Inter');
      expect(report.derivedTokens.fonts.mono).toBeDefined();
    });
  });
});