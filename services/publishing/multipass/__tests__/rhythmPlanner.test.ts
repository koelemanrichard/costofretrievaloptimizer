import { describe, it, expect } from 'vitest';
import { planVisualRhythm } from '../rhythmPlanner';
import type { ContentAnalysis, ComponentSelection } from '../../../../types/publishing';

describe('rhythmPlanner (Pass 3)', () => {
  describe('planVisualRhythm', () => {
    it('should assign hero-moment to first section', () => {
      const analysis: ContentAnalysis = {
        sections: [
          { index: 0, heading: 'Title', headingLevel: 1, contentType: 'prose', wordCount: 100, hasTable: false, hasList: false, hasQuote: false, semanticImportance: 'hero' },
          { index: 1, heading: 'Features', headingLevel: 2, contentType: 'list', wordCount: 200, hasTable: false, hasList: true, hasQuote: false, semanticImportance: 'key' }
        ],
        totalWordCount: 300,
        estimatedReadTime: 2
      };

      const components: ComponentSelection[] = [
        { sectionIndex: 0, selectedComponent: 'prose', reasoning: '', alternatives: [] },
        { sectionIndex: 1, selectedComponent: 'icon-list', reasoning: '', alternatives: [] }
      ];

      const result = planVisualRhythm(analysis, components);

      expect(result.sections[0].emphasisLevel).toBe('hero-moment');
    });

    it('should alternate emphasis to create rhythm', () => {
      const analysis: ContentAnalysis = {
        sections: Array.from({ length: 6 }, (_, i) => ({
          index: i,
          heading: `Section ${i}`,
          headingLevel: 2,
          contentType: 'prose' as const,
          wordCount: 150,
          hasTable: false,
          hasList: false,
          hasQuote: false,
          semanticImportance: 'supporting' as const
        })),
        totalWordCount: 900,
        estimatedReadTime: 5
      };

      const components = analysis.sections.map(s => ({
        sectionIndex: s.index,
        selectedComponent: 'prose',
        reasoning: '',
        alternatives: []
      }));

      const result = planVisualRhythm(analysis, components);

      // Should not have all sections with same emphasis
      const emphases = result.sections.map(s => s.emphasisLevel);
      const uniqueEmphases = new Set(emphases);
      expect(uniqueEmphases.size).toBeGreaterThan(1);
    });

    it('should place visual anchors for long content', () => {
      const analysis: ContentAnalysis = {
        sections: [
          { index: 0, heading: 'Long Section', headingLevel: 2, contentType: 'prose', wordCount: 600, hasTable: false, hasList: false, hasQuote: false, semanticImportance: 'key' }
        ],
        totalWordCount: 600,
        estimatedReadTime: 3
      };

      const components: ComponentSelection[] = [
        { sectionIndex: 0, selectedComponent: 'prose', reasoning: '', alternatives: [] }
      ];

      const result = planVisualRhythm(analysis, components);

      expect(result.sections[0].visualAnchor).toBe(true);
    });

    it('should determine overall pacing based on content length', () => {
      // Short article should be dense
      const shortAnalysis: ContentAnalysis = {
        sections: [
          { index: 0, heading: 'Short', headingLevel: 1, contentType: 'prose', wordCount: 200, hasTable: false, hasList: false, hasQuote: false, semanticImportance: 'hero' }
        ],
        totalWordCount: 200,
        estimatedReadTime: 1
      };

      const shortComponents: ComponentSelection[] = [
        { sectionIndex: 0, selectedComponent: 'prose', reasoning: '', alternatives: [] }
      ];

      const shortResult = planVisualRhythm(shortAnalysis, shortComponents);
      expect(shortResult.overallPacing).toBe('dense');

      // Long article should be spacious or balanced
      const longAnalysis: ContentAnalysis = {
        sections: Array.from({ length: 10 }, (_, i) => ({
          index: i,
          heading: `Section ${i}`,
          headingLevel: 2,
          contentType: 'prose' as const,
          wordCount: 300,
          hasTable: false,
          hasList: false,
          hasQuote: false,
          semanticImportance: 'supporting' as const
        })),
        totalWordCount: 3000,
        estimatedReadTime: 15
      };

      const longComponents = longAnalysis.sections.map(s => ({
        sectionIndex: s.index,
        selectedComponent: 'prose',
        reasoning: '',
        alternatives: []
      }));

      const longResult = planVisualRhythm(longAnalysis, longComponents);
      expect(['balanced', 'spacious']).toContain(longResult.overallPacing);
    });

    it('should give featured sections more breathing room', () => {
      const analysis: ContentAnalysis = {
        sections: [
          { index: 0, heading: 'Hero', headingLevel: 1, contentType: 'prose', wordCount: 100, hasTable: false, hasList: false, hasQuote: false, semanticImportance: 'hero' },
          { index: 1, heading: 'Key Point', headingLevel: 2, contentType: 'prose', wordCount: 400, hasTable: false, hasList: false, hasQuote: false, semanticImportance: 'key' }
        ],
        totalWordCount: 500,
        estimatedReadTime: 3
      };

      const components: ComponentSelection[] = [
        { sectionIndex: 0, selectedComponent: 'prose', reasoning: '', alternatives: [] },
        { sectionIndex: 1, selectedComponent: 'prose', reasoning: '', alternatives: [] }
      ];

      const result = planVisualRhythm(analysis, components);

      // Hero section should have breathe or dramatic spacing
      expect(['breathe', 'dramatic']).toContain(result.sections[0].spacingBefore);
    });

    it('should give FAQ and comparison sections background emphasis', () => {
      const analysis: ContentAnalysis = {
        sections: [
          { index: 0, heading: 'Intro', headingLevel: 1, contentType: 'prose', wordCount: 100, hasTable: false, hasList: false, hasQuote: false, semanticImportance: 'hero' },
          { index: 1, heading: 'FAQ', headingLevel: 2, contentType: 'faq', wordCount: 300, hasTable: false, hasList: false, hasQuote: false, semanticImportance: 'supporting' }
        ],
        totalWordCount: 400,
        estimatedReadTime: 2
      };

      const components: ComponentSelection[] = [
        { sectionIndex: 0, selectedComponent: 'prose', reasoning: '', alternatives: [] },
        { sectionIndex: 1, selectedComponent: 'faq-accordion', reasoning: '', alternatives: [] }
      ];

      const result = planVisualRhythm(analysis, components);

      // FAQ sections typically get background treatment
      expect(result.sections[1].emphasisLevel).toBe('background');
    });
  });
});
