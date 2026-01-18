import { describe, it, expect } from 'vitest';
import { CONTENT_TEMPLATES, getTemplateByName, getTemplateForWebsiteType } from '../contentTemplates';

describe('contentTemplates', () => {
  describe('CONTENT_TEMPLATES', () => {
    it('should have 12 template definitions', () => {
      expect(Object.keys(CONTENT_TEMPLATES)).toHaveLength(12);
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
});
