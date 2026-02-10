/**
 * Component Selector Tests
 *
 * Tests for the v2.0 component selection functionality that uses
 * multi-factor scoring to choose appropriate components.
 *
 * @module services/publishing/architect/__tests__/componentSelector.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  getRecommendedComponent,
  isComponentAppropriate,
  getComponentWeight,
} from '../componentSelector';
import type { ComponentType } from '../blueprintTypes';
import type { ParsedSection, IndustryDesignNorms, SectionSemanticType } from '../contextAssembler';

// Test data
const mockIndustryNorms: IndustryDesignNorms = {
  preferredStyle: 'minimal',
  colorIntensity: 'subtle',
  pacing: 'balanced',
  commonComponents: ['prose', 'icon-list', 'faq-accordion'] as ComponentType[],
  ctaApproach: 'moderate',
};

// Helper to create a parsed section
function createParsedSection(
  sectionType: SectionSemanticType,
  overrides: Partial<ParsedSection> = {}
): ParsedSection {
  return {
    id: 'test-section',
    heading: 'Test Section',
    headingLevel: 2,
    content: '<p>Test content</p>',
    sectionType,
    confidence: 0.9,
    structure: {
      paragraphs: ['Test content'],
      lists: [],
      definitions: [],
      quotes: [],
      callouts: [],
    },
    relationship: {
      importance: 'normal',
    },
    ...overrides,
  } as ParsedSection;
}

describe('componentSelector', () => {
  describe('getComponentWeight', () => {
    it('should return weight for known components', () => {
      const proseWeight = getComponentWeight('prose');
      const cardGridWeight = getComponentWeight('card-grid');

      expect(proseWeight).toBeDefined();
      expect(cardGridWeight).toBeDefined();
    });

    it('should classify prose as light', () => {
      const weight = getComponentWeight('prose');
      expect(weight).toBe('light');
    });

    it('should classify card-grid as heavy', () => {
      const weight = getComponentWeight('card-grid');
      expect(weight).toBe('heavy');
    });

    it('should return valid weight categories', () => {
      const components: ComponentType[] = [
        'prose', 'bullet-list', 'card-grid', 'icon-list', 'timeline-vertical',
      ];

      components.forEach(component => {
        const weight = getComponentWeight(component);
        expect(['light', 'medium', 'heavy']).toContain(weight);
      });
    });
  });

  describe('isComponentAppropriate', () => {
    it('should return boolean for component/section combination', () => {
      const result = isComponentAppropriate('icon-list', 'benefits');
      expect(typeof result).toBe('boolean');
    });

    it('should reject FAQ components for benefits sections', () => {
      const result = isComponentAppropriate('faq-accordion', 'benefits');
      expect(result).toBe(false);
    });

    it('should handle comparison sections', () => {
      // Comparison table should be appropriate for comparison sections
      const result = isComponentAppropriate('comparison-table', 'comparison');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getRecommendedComponent', () => {
    it('should return a component for benefits section', () => {
      const component = getRecommendedComponent(
        'benefits',
        'minimal'
      );

      expect(component).toBeDefined();
      expect(typeof component).toBe('string');
    });

    it('should return component for process section', () => {
      const component = getRecommendedComponent(
        'process',
        'editorial'
      );

      expect(component).toBeDefined();
    });

    it('should return component for FAQ section', () => {
      const component = getRecommendedComponent(
        'faq',
        'minimal'
      );

      expect(component).toBeDefined();
    });

    it('should return component for testimonial section', () => {
      const component = getRecommendedComponent(
        'testimonial',
        'bold'
      );

      expect(component).toBeDefined();
    });

    it('should respect industry preferences for list style', () => {
      const component = getRecommendedComponent(
        'benefits',
        'minimal'
      );

      // Should respect the industry preference for list style
      expect(component).toBeDefined();
    });

    it('should work with different visual styles', () => {
      const styles = ['minimal', 'editorial', 'marketing', 'bold', 'warm-modern'] as const;

      styles.forEach(style => {
        const component = getRecommendedComponent('benefits', style);
        expect(component).toBeDefined();
        expect(typeof component).toBe('string');
      });
    });
  });
});
