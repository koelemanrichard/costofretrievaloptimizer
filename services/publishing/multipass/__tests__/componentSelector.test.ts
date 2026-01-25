import { describe, it, expect } from 'vitest';
import { selectComponents } from '../componentSelector';
import type { ContentAnalysis } from '../../../../types/publishing';

describe('componentSelector (Pass 2)', () => {
  describe('selectComponents', () => {
    it('should select timeline/steps for process content', () => {
      const analysis: ContentAnalysis = {
        sections: [{
          index: 0,
          heading: 'How It Works',
          headingLevel: 2,
          contentType: 'process',
          wordCount: 150,
          hasTable: false,
          hasList: true,
          hasQuote: false,
          semanticImportance: 'key'
        }],
        totalWordCount: 150,
        estimatedReadTime: 1
      };

      const result = selectComponents(analysis, 'modern-minimal');

      expect(result[0].selectedComponent).toMatch(/timeline|steps/);
      expect(result[0].alternatives.length).toBeGreaterThan(0);
    });

    it('should select card-grid or table for comparison content', () => {
      const analysis: ContentAnalysis = {
        sections: [{
          index: 0,
          heading: 'Feature Comparison',
          headingLevel: 2,
          contentType: 'comparison',
          wordCount: 200,
          hasTable: true,
          hasList: false,
          hasQuote: false,
          semanticImportance: 'key'
        }],
        totalWordCount: 200,
        estimatedReadTime: 1
      };

      const result = selectComponents(analysis, 'bold-editorial');

      expect(result[0].selectedComponent).toMatch(/card|comparison|table/);
    });

    it('should select faq-accordion for FAQ content', () => {
      const analysis: ContentAnalysis = {
        sections: [{
          index: 0,
          heading: 'Frequently Asked Questions',
          headingLevel: 2,
          contentType: 'faq',
          wordCount: 300,
          hasTable: false,
          hasList: false,
          hasQuote: false,
          semanticImportance: 'supporting'
        }],
        totalWordCount: 300,
        estimatedReadTime: 2
      };

      const result = selectComponents(analysis, 'warm-friendly');

      expect(result[0].selectedComponent).toBe('faq-accordion');
    });

    it('should provide reasoning for component selection', () => {
      const analysis: ContentAnalysis = {
        sections: [{
          index: 0,
          heading: 'Test Section',
          headingLevel: 2,
          contentType: 'prose',
          wordCount: 100,
          hasTable: false,
          hasList: false,
          hasQuote: false,
          semanticImportance: 'key'
        }],
        totalWordCount: 100,
        estimatedReadTime: 1
      };

      const result = selectComponents(analysis, 'modern-minimal');

      expect(result[0].reasoning).toBeTruthy();
      expect(typeof result[0].reasoning).toBe('string');
    });

    it('should handle multiple sections', () => {
      const analysis: ContentAnalysis = {
        sections: [
          {
            index: 0,
            heading: 'Introduction',
            headingLevel: 1,
            contentType: 'prose',
            wordCount: 100,
            hasTable: false,
            hasList: false,
            hasQuote: false,
            semanticImportance: 'hero'
          },
          {
            index: 1,
            heading: 'Features',
            headingLevel: 2,
            contentType: 'list',
            wordCount: 150,
            hasTable: false,
            hasList: true,
            hasQuote: false,
            semanticImportance: 'key'
          },
          {
            index: 2,
            heading: 'How to Use',
            headingLevel: 2,
            contentType: 'process',
            wordCount: 200,
            hasTable: false,
            hasList: true,
            hasQuote: false,
            semanticImportance: 'key'
          }
        ],
        totalWordCount: 450,
        estimatedReadTime: 3
      };

      const result = selectComponents(analysis, 'modern-minimal');

      expect(result.length).toBe(3);
      expect(result[0].sectionIndex).toBe(0);
      expect(result[1].sectionIndex).toBe(1);
      expect(result[2].sectionIndex).toBe(2);
    });

    it('should use default personality when unknown personality provided', () => {
      const analysis: ContentAnalysis = {
        sections: [{
          index: 0,
          heading: 'Test',
          headingLevel: 2,
          contentType: 'prose',
          wordCount: 100,
          hasTable: false,
          hasList: false,
          hasQuote: false,
          semanticImportance: 'supporting'
        }],
        totalWordCount: 100,
        estimatedReadTime: 1
      };

      const result = selectComponents(analysis, 'unknown-personality');

      expect(result[0].selectedComponent).toBeDefined();
      expect(result[0].alternatives).toBeDefined();
    });
  });
});
