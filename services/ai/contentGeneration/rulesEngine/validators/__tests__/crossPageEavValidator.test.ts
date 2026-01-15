// services/ai/contentGeneration/rulesEngine/validators/__tests__/crossPageEavValidator.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateCrossPageEavConsistency, EavConsistencyResult } from '../crossPageEavValidator';
import { SemanticTriple } from '../../../../../../types';

// Mock Supabase client with chainable methods
const createMockSupabase = (mockResponse: { data: any; error: any }) => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockResolvedValue(mockResponse)
        })
      })
    })
  })
});

// Helper to create SemanticTriple test data
const createEav = (entity: string, attribute: string, value: string | number): SemanticTriple => ({
  subject: { label: entity, type: 'Entity' },
  predicate: { relation: attribute, type: 'Attribute' },
  object: { value, type: typeof value === 'number' ? 'Number' : 'String' }
});

describe('CrossPageEavValidator', () => {
  describe('validateCrossPageEavConsistency', () => {
    it('should return consistent when no EAVs provided', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null });

      const result = await validateCrossPageEavConsistency(
        'job-1',
        'map-1',
        [],
        mockSupabase as any
      );

      expect(result.isConsistent).toBe(true);
      expect(result.contradictions).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return consistent when no mapId provided', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null });
      const currentEavs = [createEav('Product X', 'weight', '10kg')];

      const result = await validateCrossPageEavConsistency(
        'job-1',
        '', // empty mapId
        currentEavs,
        mockSupabase as any
      );

      expect(result.isConsistent).toBe(true);
      expect(result.contradictions).toHaveLength(0);
    });

    it('should return consistent when no related jobs exist', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null });
      const currentEavs = [createEav('Product X', 'weight', '10kg')];

      const result = await validateCrossPageEavConsistency(
        'job-1',
        'map-1',
        currentEavs,
        mockSupabase as any
      );

      expect(result.isConsistent).toBe(true);
      expect(result.contradictions).toHaveLength(0);
    });

    it('should detect contradiction when same entity-attribute has different values', async () => {
      // Related job has "Product X weighs 15kg"
      const relatedJobs = [{
        id: 'job-2',
        content_briefs: {
          id: 'brief-2',
          title: 'Product X Review',
          eavs: [createEav('Product X', 'weight', '15kg')]
        }
      }];
      const mockSupabase = createMockSupabase({ data: relatedJobs, error: null });

      // Current article says "Product X weighs 10kg"
      const currentEavs = [createEav('Product X', 'weight', '10kg')];

      const result = await validateCrossPageEavConsistency(
        'job-1',
        'map-1',
        currentEavs,
        mockSupabase as any
      );

      expect(result.isConsistent).toBe(false);
      expect(result.contradictions).toHaveLength(1);
      expect(result.contradictions[0]).toEqual({
        entity: 'Product X',
        attribute: 'weight',
        currentValue: '10kg',
        conflictingValue: '15kg',
        conflictingArticle: { id: 'brief-2', title: 'Product X Review' }
      });
    });

    it('should be case-insensitive when matching entities and attributes', async () => {
      const relatedJobs = [{
        id: 'job-2',
        content_briefs: {
          id: 'brief-2',
          title: 'Article 2',
          eavs: [createEav('PRODUCT X', 'WEIGHT', '15kg')]
        }
      }];
      const mockSupabase = createMockSupabase({ data: relatedJobs, error: null });

      // Different case but same entity/attribute
      const currentEavs = [createEav('product x', 'weight', '10kg')];

      const result = await validateCrossPageEavConsistency(
        'job-1',
        'map-1',
        currentEavs,
        mockSupabase as any
      );

      expect(result.isConsistent).toBe(false);
      expect(result.contradictions).toHaveLength(1);
    });

    it('should not flag contradiction when values match exactly', async () => {
      const relatedJobs = [{
        id: 'job-2',
        content_briefs: {
          id: 'brief-2',
          title: 'Article 2',
          eavs: [createEav('Product X', 'weight', '10kg')]
        }
      }];
      const mockSupabase = createMockSupabase({ data: relatedJobs, error: null });

      // Same value
      const currentEavs = [createEav('Product X', 'weight', '10kg')];

      const result = await validateCrossPageEavConsistency(
        'job-1',
        'map-1',
        currentEavs,
        mockSupabase as any
      );

      expect(result.isConsistent).toBe(true);
      expect(result.contradictions).toHaveLength(0);
    });

    it('should allow numeric tolerance within 5%', async () => {
      const relatedJobs = [{
        id: 'job-2',
        content_briefs: {
          id: 'brief-2',
          title: 'Article 2',
          eavs: [createEav('Product X', 'weight', '100')]
        }
      }];
      const mockSupabase = createMockSupabase({ data: relatedJobs, error: null });

      // 103 is within 5% of 100
      const currentEavs = [createEav('Product X', 'weight', '103')];

      const result = await validateCrossPageEavConsistency(
        'job-1',
        'map-1',
        currentEavs,
        mockSupabase as any
      );

      expect(result.isConsistent).toBe(true);
      expect(result.contradictions).toHaveLength(0);
    });

    it('should flag contradiction when numeric difference exceeds 5%', async () => {
      const relatedJobs = [{
        id: 'job-2',
        content_briefs: {
          id: 'brief-2',
          title: 'Article 2',
          eavs: [createEav('Product X', 'weight', '100')]
        }
      }];
      const mockSupabase = createMockSupabase({ data: relatedJobs, error: null });

      // 110 is 10% different from 100 (exceeds 5% tolerance)
      const currentEavs = [createEav('Product X', 'weight', '110')];

      const result = await validateCrossPageEavConsistency(
        'job-1',
        'map-1',
        currentEavs,
        mockSupabase as any
      );

      expect(result.isConsistent).toBe(false);
      expect(result.contradictions).toHaveLength(1);
    });

    it('should handle numeric values with units', async () => {
      const relatedJobs = [{
        id: 'job-2',
        content_briefs: {
          id: 'brief-2',
          title: 'Article 2',
          eavs: [createEav('Product X', 'weight', '100kg')]
        }
      }];
      const mockSupabase = createMockSupabase({ data: relatedJobs, error: null });

      // 102kg is within 5% of 100kg
      const currentEavs = [createEav('Product X', 'weight', '102kg')];

      const result = await validateCrossPageEavConsistency(
        'job-1',
        'map-1',
        currentEavs,
        mockSupabase as any
      );

      expect(result.isConsistent).toBe(true);
      expect(result.contradictions).toHaveLength(0);
    });

    it('should detect multiple contradictions', async () => {
      const relatedJobs = [{
        id: 'job-2',
        content_briefs: {
          id: 'brief-2',
          title: 'Article 2',
          eavs: [
            createEav('Product X', 'weight', '15kg'),
            createEav('Product X', 'color', 'blue')
          ]
        }
      }];
      const mockSupabase = createMockSupabase({ data: relatedJobs, error: null });

      // Both contradict
      const currentEavs = [
        createEav('Product X', 'weight', '10kg'),
        createEav('Product X', 'color', 'red')
      ];

      const result = await validateCrossPageEavConsistency(
        'job-1',
        'map-1',
        currentEavs,
        mockSupabase as any
      );

      expect(result.isConsistent).toBe(false);
      expect(result.contradictions).toHaveLength(2);
    });

    it('should skip EAVs with missing required fields', async () => {
      const relatedJobs = [{
        id: 'job-2',
        content_briefs: {
          id: 'brief-2',
          title: 'Article 2',
          eavs: [createEav('Product X', 'weight', '15kg')]
        }
      }];
      const mockSupabase = createMockSupabase({ data: relatedJobs, error: null });

      // EAV with missing subject
      const currentEavs: SemanticTriple[] = [
        { subject: { label: '', type: '' }, predicate: { relation: 'weight', type: '' }, object: { value: '10kg', type: '' } }
      ];

      const result = await validateCrossPageEavConsistency(
        'job-1',
        'map-1',
        currentEavs,
        mockSupabase as any
      );

      // Should not throw, just skip invalid EAVs
      expect(result.isConsistent).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: { message: 'Database connection failed' }
      });
      const currentEavs = [createEav('Product X', 'weight', '10kg')];

      const result = await validateCrossPageEavConsistency(
        'job-1',
        'map-1',
        currentEavs,
        mockSupabase as any
      );

      // Should not throw, return consistent as fallback
      expect(result.isConsistent).toBe(true);
      expect(result.contradictions).toHaveLength(0);
    });

    it('should handle jobs with missing or invalid eavs array', async () => {
      const relatedJobs = [
        { id: 'job-2', content_briefs: { id: 'brief-2', title: 'Article 2', eavs: null } },
        { id: 'job-3', content_briefs: { id: 'brief-3', title: 'Article 3', eavs: 'invalid' } },
        { id: 'job-4', content_briefs: { id: 'brief-4', title: 'Article 4' } }, // no eavs property
      ];
      const mockSupabase = createMockSupabase({ data: relatedJobs, error: null });

      const currentEavs = [createEav('Product X', 'weight', '10kg')];

      const result = await validateCrossPageEavConsistency(
        'job-1',
        'map-1',
        currentEavs,
        mockSupabase as any
      );

      // Should not throw
      expect(result.isConsistent).toBe(true);
    });

    it('should check EAVs across multiple related articles', async () => {
      const relatedJobs = [
        {
          id: 'job-2',
          content_briefs: {
            id: 'brief-2',
            title: 'Article 2',
            eavs: [createEav('Product X', 'weight', '10kg')]
          }
        },
        {
          id: 'job-3',
          content_briefs: {
            id: 'brief-3',
            title: 'Article 3',
            eavs: [createEav('Product Y', 'price', '$99')]
          }
        }
      ];
      const mockSupabase = createMockSupabase({ data: relatedJobs, error: null });

      // Contradicts first article, not second
      const currentEavs = [
        createEav('Product X', 'weight', '15kg'),
        createEav('Product Y', 'price', '$99') // matches
      ];

      const result = await validateCrossPageEavConsistency(
        'job-1',
        'map-1',
        currentEavs,
        mockSupabase as any
      );

      expect(result.isConsistent).toBe(false);
      expect(result.contradictions).toHaveLength(1);
      expect(result.contradictions[0].entity).toBe('Product X');
    });
  });
});
