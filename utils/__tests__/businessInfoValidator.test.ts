import { describe, it, expect } from 'vitest';
import { validateBusinessInfoForAnalysis, validatePillarsForAnalysis } from '../businessInfoValidator';

describe('businessInfoValidator', () => {
  describe('validateBusinessInfoForAnalysis', () => {
    it('should pass with complete business info', () => {
      const result = validateBusinessInfoForAnalysis({
        language: 'en',
        industry: 'SaaS',
        audience: 'developers',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when fields are missing', () => {
      const result = validateBusinessInfoForAnalysis({});
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });

    it('should fail with null input', () => {
      const result = validateBusinessInfoForAnalysis(null);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validatePillarsForAnalysis', () => {
    it('should pass with complete pillars', () => {
      const result = validatePillarsForAnalysis({
        centralEntity: 'Enterprise CMS',
        sourceContext: 'Software Company',
        centralSearchIntent: 'Buy CMS',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with empty strings', () => {
      const result = validatePillarsForAnalysis({
        centralEntity: '  ',
        sourceContext: '',
        centralSearchIntent: '',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });
});
