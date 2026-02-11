import { describe, it, expect } from 'vitest';
import { StandaloneCssGenerator } from '../StandaloneCssGenerator';
import type { ExtractedComponent, ExtractedTokens } from '../../../types/brandExtraction';

describe('StandaloneCssGenerator', () => {
  const mockTokens: ExtractedTokens = {
    id: 'tokens-1',
    projectId: 'proj-1',
    colors: { values: [{ hex: '#1a365d', usage: 'primary', frequency: 10 }] },
    typography: {
      headings: { fontFamily: 'Inter', fontWeight: 700 },
      body: { fontFamily: 'Inter', fontWeight: 400, lineHeight: 1.6 }
    },
    spacing: { sectionGap: '64px', cardPadding: '32px', contentWidth: '1200px' },
    shadows: { card: '0 4px 20px rgba(0,0,0,0.1)', elevated: '0 10px 40px rgba(0,0,0,0.15)' },
    borders: { radiusSmall: '4px', radiusMedium: '8px', radiusLarge: '16px', defaultColor: '#e2e8f0' },
    extractedFrom: ['https://example.com'],
    extractedAt: new Date().toISOString()
  };

  describe('generate', () => {
    it('creates standalone CSS from extracted components', () => {
      const generator = new StandaloneCssGenerator();
      const components: ExtractedComponent[] = [{
        id: 'comp-1',
        extractionId: 'ext-1',
        projectId: 'proj-1',
        visualDescription: 'Hero section',
        literalHtml: '<section class="hero"></section>',
        literalCss: '.hero { background: #1a365d; padding: 80px; }',
        theirClassNames: ['hero'],
        contentSlots: [],
        createdAt: new Date().toISOString()
      }];

      const css = generator.generate(components, [], mockTokens);

      expect(css).toContain('Brand CSS');
      expect(css).toContain('.hero');
      expect(css).toContain('background: #1a365d');
    });
  });
});
