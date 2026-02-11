import { describe, it, expect } from 'vitest';
import {
  CONTENT_TEMPLATES,
  getTemplateByName,
  getTemplateForWebsiteType,
  getAllTemplateNames,
  getRequiredSections,
  getOptionalSections,
} from '../contentTemplates';

describe('contentTemplates', () => {
  describe('CONTENT_TEMPLATES', () => {
    it('should have 13 template definitions', () => {
      expect(Object.keys(CONTENT_TEMPLATES)).toHaveLength(13);
    });

    it('should have DEFINITIONAL template with required sections', () => {
      const template = CONTENT_TEMPLATES.DEFINITIONAL;
      expect(template.templateName).toBe('DEFINITIONAL');
      expect(template.sectionStructure.length).toBeGreaterThan(0);
      expect(template.sectionStructure.some(s => s.required)).toBe(true);
    });

    it('should have valid format codes for all sections', () => {
      const validCodes = ['FS', 'PAA', 'LISTING', 'DEFINITIVE', 'TABLE', 'PROSE'];
      for (const [name, template] of Object.entries(CONTENT_TEMPLATES)) {
        for (const section of template.sectionStructure) {
          expect(validCodes).toContain(section.formatCode);
        }
      }
    });
  });

  describe('getTemplateByName', () => {
    it('should return template by name', () => {
      const template = getTemplateByName('DEFINITIONAL');
      expect(template?.templateName).toBe('DEFINITIONAL');
    });

    it('should return undefined for unknown template', () => {
      const template = getTemplateByName('UNKNOWN' as any);
      expect(template).toBeUndefined();
    });
  });

  describe('getTemplateForWebsiteType', () => {
    it('should return ECOMMERCE_PRODUCT for ECOMMERCE website', () => {
      const template = getTemplateForWebsiteType('ECOMMERCE');
      expect(template.templateName).toBe('ECOMMERCE_PRODUCT');
    });

    it('should return DEFINITIONAL for INFORMATIONAL website', () => {
      const template = getTemplateForWebsiteType('INFORMATIONAL');
      expect(template.templateName).toBe('DEFINITIONAL');
    });

    it('should return HEALTHCARE_YMYL for HEALTHCARE website', () => {
      const template = getTemplateForWebsiteType('HEALTHCARE');
      expect(template.templateName).toBe('HEALTHCARE_YMYL');
    });
  });

  describe('getAllTemplateNames', () => {
    it('should return all 13 template names', () => {
      const names = getAllTemplateNames();
      expect(names).toHaveLength(13);
      expect(names).toContain('DEFINITIONAL');
      expect(names).toContain('ECOMMERCE_PRODUCT');
    });

    it('should include all expected template types', () => {
      const names = getAllTemplateNames();
      const expectedTemplates = [
        'DEFINITIONAL',
        'PROCESS_HOWTO',
        'ECOMMERCE_PRODUCT',
        'COMPARISON',
        'HEALTHCARE_YMYL',
        'SAAS_FEATURE',
        'NEWS_ARTICLE',
        'LISTING_DIRECTORY',
        'EVENT_EXPERIENCE',
        'COURSE_EDUCATION',
        'IMPACT_NONPROFIT',
        'ECOMMERCE_CATEGORY',
        'LOCATION_REALESTATE',
      ];
      expectedTemplates.forEach(template => {
        expect(names).toContain(template);
      });
    });
  });

  describe('getRequiredSections', () => {
    it('should return only required sections for a template', () => {
      const template = getTemplateByName('DEFINITIONAL');
      expect(template).toBeDefined();
      const sections = getRequiredSections(template!);
      expect(sections.every(s => s.required)).toBe(true);
      expect(sections.length).toBeGreaterThan(0);
    });

    it('should return correct number of required sections for DEFINITIONAL', () => {
      const template = getTemplateByName('DEFINITIONAL');
      const sections = getRequiredSections(template!);
      // DEFINITIONAL has 2 required sections based on the config
      expect(sections.length).toBe(2);
    });

    it('should return required sections for HEALTHCARE_YMYL', () => {
      const template = getTemplateByName('HEALTHCARE_YMYL');
      expect(template).toBeDefined();
      const sections = getRequiredSections(template!);
      expect(sections.every(s => s.required)).toBe(true);
      // HEALTHCARE_YMYL has 5 required sections
      expect(sections.length).toBe(5);
    });
  });

  describe('getOptionalSections', () => {
    it('should return only optional sections for a template', () => {
      const template = getTemplateByName('DEFINITIONAL');
      expect(template).toBeDefined();
      const sections = getOptionalSections(template!);
      expect(sections.every(s => !s.required)).toBe(true);
    });

    it('should return correct number of optional sections for DEFINITIONAL', () => {
      const template = getTemplateByName('DEFINITIONAL');
      const sections = getOptionalSections(template!);
      // DEFINITIONAL has 4 optional sections (6 total - 2 required)
      expect(sections.length).toBe(4);
    });

    it('should have combined required and optional equal total sections', () => {
      const template = getTemplateByName('ECOMMERCE_PRODUCT');
      expect(template).toBeDefined();
      const required = getRequiredSections(template!);
      const optional = getOptionalSections(template!);
      expect(required.length + optional.length).toBe(template!.sectionStructure.length);
    });
  });
});
