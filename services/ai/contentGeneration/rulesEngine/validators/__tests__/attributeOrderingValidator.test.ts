// services/ai/contentGeneration/rulesEngine/validators/__tests__/attributeOrderingValidator.test.ts
import { describe, it, expect } from 'vitest';
import { AttributeOrderingValidator } from '../attributeOrderingValidator';
import { SectionGenerationContext, BriefSection } from '../../../../../../types';

describe('AttributeOrderingValidator', () => {
  const createSection = (heading: string, category: string): BriefSection => ({
    heading,
    level: 2,
    attribute_category: category as any,
    content_zone: 'MAIN',
  } as BriefSection);

  const createContext = (sections: BriefSection[]): SectionGenerationContext => ({
    section: sections[0] || createSection('Test', 'ROOT'),
    brief: {
      structured_outline: sections,
    },
    businessInfo: { seedKeyword: 'Test' },
    allSections: sections,
    isYMYL: false,
  } as any);

  describe('validateSectionOrder', () => {
    it('should pass when UNIQUE comes before ROOT', () => {
      const sections = [
        createSection('What Makes It Special', 'UNIQUE'),
        createSection('Basic Definition', 'ROOT'),
        createSection('Technical Details', 'RARE'),
      ];
      const result = AttributeOrderingValidator.validateSectionOrder(createContext(sections));
      expect(result.filter(v => v.severity === 'error').length).toBe(0);
    });

    it('should warn when ROOT comes before UNIQUE', () => {
      const sections = [
        createSection('Basic Definition', 'ROOT'),
        createSection('What Makes It Special', 'UNIQUE'),
      ];
      const result = AttributeOrderingValidator.validateSectionOrder(createContext(sections));
      expect(result.some(v => v.rule === 'ATTRIBUTE_ORDER_VIOLATION')).toBe(true);
    });

    it('should warn when RARE comes before ROOT', () => {
      const sections = [
        createSection('Technical Details', 'RARE'),
        createSection('Basic Definition', 'ROOT'),
      ];
      const result = AttributeOrderingValidator.validateSectionOrder(createContext(sections));
      expect(result.some(v => v.rule === 'ATTRIBUTE_ORDER_VIOLATION')).toBe(true);
    });

    it('should skip sections without attribute_category', () => {
      const sections = [
        { heading: 'Introduction', level: 1, content_zone: 'MAIN' } as BriefSection,
        createSection('Basic Definition', 'ROOT'),
      ];
      const result = AttributeOrderingValidator.validateSectionOrder(createContext(sections));
      expect(result.filter(v => v.severity === 'error').length).toBe(0);
    });

    it('should allow COMMON anywhere', () => {
      const sections = [
        createSection('General Info', 'COMMON'),
        createSection('What Makes It Special', 'UNIQUE'),
        createSection('More General Info', 'COMMON'),
        createSection('Basic Definition', 'ROOT'),
      ];
      const result = AttributeOrderingValidator.validateSectionOrder(createContext(sections));
      // Should not flag COMMON placements
      expect(result.filter(v => v.text.includes('COMMON')).length).toBe(0);
    });
  });
});
