// services/__tests__/briefTemplateSync.test.ts
import { describe, it, expect } from 'vitest';
import { syncBriefWithTemplate, applyTemplateFormatCodes } from '../briefTemplateSync';
import { CONTENT_TEMPLATES } from '../../config/contentTemplates';
import { ContentBrief } from '../../types';

describe('briefTemplateSync', () => {
  describe('syncBriefWithTemplate', () => {
    it('should add template fields to brief', () => {
      const brief: Partial<ContentBrief> = {
        title: 'Test Brief',
        structured_outline: [
          { heading: 'What is Test?', level: 2 },
          { heading: 'Benefits', level: 2 },
        ],
      };

      const result = syncBriefWithTemplate(
        brief as ContentBrief,
        'DEFINITIONAL',
        85,
        'high-quality'
      );

      expect(result.selectedTemplate).toBe('DEFINITIONAL');
      expect(result.templateConfidence).toBe(85);
      expect(result.depthMode).toBe('high-quality');
    });
  });

  describe('applyTemplateFormatCodes', () => {
    it('should apply format codes from template to matching sections', () => {
      const brief: Partial<ContentBrief> = {
        structured_outline: [
          { heading: 'What is Test Entity?', level: 2 },
          { heading: 'Key Features', level: 2 },
        ],
      };

      const result = applyTemplateFormatCodes(
        brief as ContentBrief,
        CONTENT_TEMPLATES.ECOMMERCE_PRODUCT
      );

      // Should get format codes applied
      expect(result.structured_outline).toBeDefined();
    });

    it('should not override existing format codes when preserveExisting is true', () => {
      const brief: Partial<ContentBrief> = {
        structured_outline: [
          { heading: 'What is Test?', level: 2, format_code: 'PROSE' },
        ],
      };

      const result = applyTemplateFormatCodes(
        brief as ContentBrief,
        CONTENT_TEMPLATES.DEFINITIONAL,
        { preserveExisting: true }
      );

      expect(result.structured_outline?.[0].format_code).toBe('PROSE');
    });
  });
});
