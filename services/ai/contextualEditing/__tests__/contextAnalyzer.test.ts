// services/ai/contextualEditing/__tests__/contextAnalyzer.test.ts
import { describe, it, expect, vi } from 'vitest';
import { analyzeContext, extractServicesFromBusinessInfo, findContradictions } from '../contextAnalyzer';
import { BusinessInfo, ContentBrief, SemanticTriple } from '../../../../types';

describe('contextAnalyzer', () => {
  describe('extractServicesFromBusinessInfo', () => {
    it('extracts services from offerings array', () => {
      const businessInfo: Partial<BusinessInfo> = {
        offerings: ['Web Design', 'SEO Services', 'Content Marketing'],
      };

      const services = extractServicesFromBusinessInfo(businessInfo as BusinessInfo);

      expect(services).toContain('web design');
      expect(services).toContain('seo services');
      expect(services).toContain('content marketing');
    });

    it('returns empty array when no offerings', () => {
      const businessInfo: Partial<BusinessInfo> = {};
      const services = extractServicesFromBusinessInfo(businessInfo as BusinessInfo);
      expect(services).toEqual([]);
    });
  });

  describe('findContradictions', () => {
    it('detects service mention not in offerings', () => {
      const selectedText = 'We offer premium asbestos removal services';
      const fullArticle = 'Full article content here';
      const services = ['cleaning', 'renovation'];

      const issues = findContradictions(selectedText, fullArticle, services);

      expect(issues.some(i => i.type === 'missing_service')).toBe(true);
    });

    it('returns empty array when service exists', () => {
      const selectedText = 'We offer premium cleaning services';
      const services = ['cleaning', 'renovation'];

      const issues = findContradictions(selectedText, '', services);

      expect(issues.filter(i => i.type === 'missing_service')).toHaveLength(0);
    });
  });
});
