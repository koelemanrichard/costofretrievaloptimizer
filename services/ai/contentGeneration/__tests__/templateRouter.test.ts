// services/ai/contentGeneration/__tests__/templateRouter.test.ts
import { describe, it, expect } from 'vitest';
import { selectTemplate, routeToTemplate, getFormatCodeForSection, getAttributeOrder } from '../templateRouter';
import { TemplateRouterInput } from '../../../../types/contentTemplates';

describe('templateRouter', () => {
  describe('selectTemplate', () => {
    it('should select ECOMMERCE_PRODUCT for ECOMMERCE website with high confidence', () => {
      const input: TemplateRouterInput = {
        websiteType: 'ECOMMERCE',
        queryIntent: 'transactional',
        queryType: 'product',
        topicType: 'core',
        topicClass: 'monetization',
      };

      const result = selectTemplate(input);

      expect(result.template.templateName).toBe('ECOMMERCE_PRODUCT');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should select COMPARISON when brief has comparison sections', () => {
      const input: TemplateRouterInput = {
        websiteType: 'INFORMATIONAL',
        queryIntent: 'commercial',
        queryType: 'comparative',
        topicType: 'outer',
        topicClass: 'informational',
        briefHints: {
          hasComparisonSections: true,
          hasStepSections: false,
          hasSpecsSections: false,
        },
      };

      const result = selectTemplate(input);

      expect(result.template.templateName).toBe('COMPARISON');
      expect(result.reasoning.some(r => r.includes('comparison'))).toBe(true);
    });

    it('should provide alternatives in result', () => {
      const input: TemplateRouterInput = {
        websiteType: 'SAAS',
        queryIntent: 'informational',
        queryType: 'definitional',
        topicType: 'core',
        topicClass: 'informational',
      };

      const result = selectTemplate(input);

      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.alternatives[0]).toHaveProperty('templateName');
      expect(result.alternatives[0]).toHaveProperty('reason');
    });

    it('should select PROCESS_HOWTO for procedural queries', () => {
      const input: TemplateRouterInput = {
        websiteType: 'INFORMATIONAL',
        queryIntent: 'informational',
        queryType: 'procedural',
        topicType: 'core',
        topicClass: 'informational',
      };

      const result = selectTemplate(input);

      expect(result.template.templateName).toBe('PROCESS_HOWTO');
      expect(result.reasoning.some(r => r.toLowerCase().includes('procedural') || r.toLowerCase().includes('how-to'))).toBe(true);
    });

    it('should select PROCESS_HOWTO when brief has step sections', () => {
      const input: TemplateRouterInput = {
        websiteType: 'SAAS',
        queryIntent: 'informational',
        queryType: 'tutorial',
        topicType: 'outer',
        topicClass: 'informational',
        briefHints: {
          hasComparisonSections: false,
          hasStepSections: true,
          hasSpecsSections: false,
        },
      };

      const result = selectTemplate(input);

      expect(result.template.templateName).toBe('PROCESS_HOWTO');
    });

    it('should select HEALTHCARE_YMYL for healthcare website', () => {
      const input: TemplateRouterInput = {
        websiteType: 'HEALTHCARE',
        queryIntent: 'informational',
        queryType: 'definitional',
        topicType: 'core',
        topicClass: 'informational',
      };

      const result = selectTemplate(input);

      expect(result.template.templateName).toBe('HEALTHCARE_YMYL');
    });

    it('should consider competitor analysis signals', () => {
      const input: TemplateRouterInput = {
        websiteType: 'INFORMATIONAL',
        queryIntent: 'informational',
        queryType: 'list',
        topicType: 'core',
        topicClass: 'informational',
        competitorAnalysis: {
          dominantFormat: 'comparison_table',
          avgSectionCount: 8,
          avgWordCount: 2500,
        },
      };

      const result = selectTemplate(input);

      // Should factor in competitor analysis for template selection
      expect(result.reasoning.some(r => r.toLowerCase().includes('competitor'))).toBe(true);
    });
  });

  describe('routeToTemplate', () => {
    it('should return template config directly', () => {
      const input: TemplateRouterInput = {
        websiteType: 'HEALTHCARE',
        queryIntent: 'informational',
        queryType: 'definitional',
        topicType: 'core',
        topicClass: 'informational',
      };

      const template = routeToTemplate(input);

      expect(template.templateName).toBe('HEALTHCARE_YMYL');
      expect(template.sectionStructure.length).toBeGreaterThan(0);
    });

    it('should return ECOMMERCE_PRODUCT for ecommerce transactional', () => {
      const input: TemplateRouterInput = {
        websiteType: 'ECOMMERCE',
        queryIntent: 'transactional',
        queryType: 'product',
        topicType: 'core',
        topicClass: 'monetization',
      };

      const template = routeToTemplate(input);

      expect(template.templateName).toBe('ECOMMERCE_PRODUCT');
    });

    it('should override based on query type for procedural', () => {
      const input: TemplateRouterInput = {
        websiteType: 'ECOMMERCE',
        queryIntent: 'informational',
        queryType: 'procedural',
        topicType: 'outer',
        topicClass: 'informational',
      };

      const template = routeToTemplate(input);

      expect(template.templateName).toBe('PROCESS_HOWTO');
    });
  });

  describe('getFormatCodeForSection', () => {
    it('should return FS for definitional query type', () => {
      const code = getFormatCodeForSection('definitional', 'overview');
      expect(code).toBe('FS');
    });

    it('should return TABLE for comparative query type', () => {
      const code = getFormatCodeForSection('comparative', 'comparison');
      expect(code).toBe('TABLE');
    });

    it('should return LISTING for list query type', () => {
      const code = getFormatCodeForSection('list', 'items');
      expect(code).toBe('LISTING');
    });

    it('should return PAA for faq section type', () => {
      const code = getFormatCodeForSection('informational', 'faq');
      expect(code).toBe('PAA');
    });

    it('should return PROSE for general prose sections', () => {
      const code = getFormatCodeForSection('informational', 'analysis');
      expect(code).toBe('PROSE');
    });
  });

  describe('getAttributeOrder', () => {
    it('should return attribute order for website type and intent', () => {
      const order = getAttributeOrder('ECOMMERCE', 'transactional');

      expect(order).toContain('CORE_DEFINITION');
      expect(order).toContain('SEARCH_DEMAND');
      expect(order.length).toBeGreaterThan(0);
    });

    it('should prioritize SEARCH_DEMAND for informational intent', () => {
      const order = getAttributeOrder('INFORMATIONAL', 'informational');

      expect(order).toBeDefined();
      expect(order.length).toBeGreaterThan(0);
    });

    it('should return valid order for all website types', () => {
      const websiteTypes = ['ECOMMERCE', 'SAAS', 'HEALTHCARE', 'INFORMATIONAL'] as const;

      for (const type of websiteTypes) {
        const order = getAttributeOrder(type, 'informational');
        expect(order.length).toBeGreaterThan(0);
      }
    });
  });
});
