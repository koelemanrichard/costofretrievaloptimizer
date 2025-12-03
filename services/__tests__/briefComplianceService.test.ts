import { describe, it, expect } from 'vitest';
import { BriefComplianceService } from '../briefComplianceService';

describe('BriefComplianceService', () => {
  const service = new BriefComplianceService();

  describe('inferMethodology', () => {
    it('returns ordered_list for "how to" headings', () => {
      const result = service.inferMethodology({ heading: 'How to Install Software' });
      expect(result).toBe('ordered_list');
    });

    it('returns unordered_list for "benefits of" headings', () => {
      const result = service.inferMethodology({ heading: 'Benefits of Cloud Computing' });
      expect(result).toBe('unordered_list');
    });

    it('returns comparison_table for "vs" headings', () => {
      const result = service.inferMethodology({ heading: 'AWS vs Azure Comparison' });
      expect(result).toBe('comparison_table');
    });

    it('returns definition_prose for "what is" headings', () => {
      const result = service.inferMethodology({ heading: 'What is Machine Learning?' });
      expect(result).toBe('definition_prose');
    });

    it('returns prose for generic headings', () => {
      const result = service.inferMethodology({ heading: 'Understanding the Basics' });
      expect(result).toBe('prose');
    });
  });

  describe('generateSubordinateTextHint', () => {
    it('returns definition hint for "what is" headings', () => {
      const result = service.generateSubordinateTextHint(
        { heading: 'What is Cloud Computing?' },
        { targetKeyword: 'cloud computing' } as any
      );
      expect(result).toContain('Define');
      expect(result).toContain('is-a');
    });

    it('returns action hint for "how to" headings', () => {
      const result = service.generateSubordinateTextHint(
        { heading: 'How to Deploy Applications' },
        { targetKeyword: 'deploy' } as any
      );
      expect(result).toContain('action verb');
    });

    it('returns reason hint for "why" headings', () => {
      const result = service.generateSubordinateTextHint(
        { heading: 'Why Use Containers?' },
        { targetKeyword: 'containers' } as any
      );
      expect(result).toContain('reason');
    });

    it('returns count hint for "benefits" headings', () => {
      const result = service.generateSubordinateTextHint(
        { heading: 'Benefits of Automation' },
        { targetKeyword: 'automation' } as any
      );
      expect(result).toContain('number');
      expect(result).toContain('benefits');
    });

    it('returns default hint for generic headings', () => {
      const result = service.generateSubordinateTextHint(
        { heading: 'Advanced Techniques' },
        { targetKeyword: 'techniques' } as any
      );
      expect(result).toContain('Directly answer');
    });
  });

  describe('inferFeaturedSnippetTarget', () => {
    it('returns paragraph type for "what is" titles', () => {
      const result = service.inferFeaturedSnippetTarget({
        title: 'What is Docker?',
        targetKeyword: 'docker'
      } as any);
      expect(result?.type).toBe('paragraph');
      expect(result?.maxLength).toBe(50);
    });

    it('returns ordered_list for "how to" titles', () => {
      const result = service.inferFeaturedSnippetTarget({
        title: 'How to Install Docker',
        targetKeyword: 'docker'
      } as any);
      expect(result?.type).toBe('ordered_list');
      expect(result?.maxItems).toBe(8);
    });

    it('returns table for comparison titles', () => {
      const result = service.inferFeaturedSnippetTarget({
        title: 'Docker vs Kubernetes Comparison',
        targetKeyword: 'docker'
      } as any);
      expect(result?.type).toBe('table');
    });

    it('returns null for generic titles', () => {
      const result = service.inferFeaturedSnippetTarget({
        title: 'Advanced Docker Techniques',
        targetKeyword: 'docker'
      } as any);
      expect(result).toBeNull();
    });
  });
});
