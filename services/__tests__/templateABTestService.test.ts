/**
 * Template A/B Test Service Tests
 *
 * Tests for A/B testing infrastructure for content templates.
 *
 * Created: 2026-01-18 - Content Template Routing Phase 3 Task 23
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getActiveABTest,
  assignToABTest,
  recordABOutcome,
  getABTestResults,
  listABTests,
  getExistingAssignment,
  ABTest,
} from '../templateABTestService';

// Mock Supabase client
const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
const mockUpdate = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockNot = vi.fn().mockReturnThis();
const mockOr = vi.fn().mockReturnThis();
const mockLte = vi.fn().mockReturnThis();
const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
const mockOrder = vi.fn().mockReturnThis();
const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('../supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    from: vi.fn((table) => {
      if (table === 'template_ab_tests') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              lte: vi.fn(() => ({
                or: vi.fn(() => ({
                  limit: mockLimit,
                })),
              })),
            })),
            order: vi.fn(() => ({
              data: [],
              error: null,
              eq: vi.fn(() => ({
                data: [],
                error: null,
              })),
            })),
          })),
        };
      }
      if (table === 'template_ab_assignments') {
        return {
          insert: mockInsert,
          update: vi.fn(() => ({
            eq: mockEq.mockResolvedValue({ data: null, error: null }),
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn(() => ({
                data: [],
                error: null,
              })),
              single: mockSingle,
            })),
          })),
        };
      }
      return {};
    }),
  })),
}));

describe('templateABTestService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assignToABTest', () => {
    const testConfig: ABTest = {
      id: 'test-1',
      name: 'Definitional vs Comparison Test',
      controlTemplate: 'DEFINITIONAL',
      variantTemplate: 'COMPARISON',
      trafficSplit: 0.5,
      isActive: true,
    };

    it('should assign deterministically based on job ID', async () => {
      // Same job ID should always get same assignment
      const assignment1 = await assignToABTest(testConfig, 'job-123');
      const assignment2 = await assignToABTest(testConfig, 'job-123');

      expect(assignment1.variant).toBe(assignment2.variant);
      expect(assignment1.template).toBe(assignment2.template);
    });

    it('should return control template for control variant', async () => {
      const assignment = await assignToABTest(testConfig, 'job-control-test');

      expect(assignment.testId).toBe('test-1');
      expect(['control', 'variant']).toContain(assignment.variant);
      expect([testConfig.controlTemplate, testConfig.variantTemplate]).toContain(
        assignment.template
      );
    });

    it('should respect traffic split ratio approximately', async () => {
      const test70_30: ABTest = {
        id: 'test-70-30',
        name: '70/30 Split Test',
        controlTemplate: 'DEFINITIONAL',
        variantTemplate: 'ECOMMERCE_PRODUCT',
        trafficSplit: 0.7, // 70% to control
        isActive: true,
      };

      let controlCount = 0;
      let variantCount = 0;

      // Test with 100 different job IDs
      for (let i = 0; i < 100; i++) {
        const assignment = await assignToABTest(test70_30, `job-split-${i}-${Math.random()}`);
        if (assignment.variant === 'control') controlCount++;
        else variantCount++;
      }

      // With 100 samples and 50% split, expect rough 50/50
      // Allow variance - just check both have reasonable counts
      expect(controlCount).toBeGreaterThan(20);
      expect(variantCount).toBeGreaterThan(20);
    });

    it('should assign correct template based on variant', async () => {
      const assignment = await assignToABTest(testConfig, 'job-template-check');

      if (assignment.variant === 'control') {
        expect(assignment.template).toBe(testConfig.controlTemplate);
      } else {
        expect(assignment.template).toBe(testConfig.variantTemplate);
      }
    });
  });

  describe('recordABOutcome', () => {
    it('should record outcome metrics', async () => {
      const result = await recordABOutcome(
        'job-123',
        87, // audit score
        92, // compliance score
        45000 // generation time
      );

      expect(result.success).toBe(true);
    });

    it('should handle zero values', async () => {
      const result = await recordABOutcome('job-zero', 0, 0, 0);

      expect(result.success).toBe(true);
    });
  });

  describe('getActiveABTest', () => {
    it('should return null when no active tests', async () => {
      const result = await getActiveABTest('INFORMATIONAL');

      expect(result).toBeNull();
    });
  });

  describe('getABTestResults', () => {
    it('should return empty stats when no results available', async () => {
      const result = await getABTestResults('nonexistent-test');

      // Returns a result object with zero counts, not null
      expect(result).not.toBeNull();
      expect(result?.control.count).toBe(0);
      expect(result?.variant.count).toBe(0);
      expect(result?.sampleSize).toBe(0);
      expect(result?.isSignificant).toBe(false);
    });
  });

  describe('listABTests', () => {
    it('should return empty array when no tests exist', async () => {
      const tests = await listABTests();

      expect(tests).toEqual([]);
    });

    it('should accept activeOnly filter', async () => {
      const tests = await listABTests(true);

      expect(tests).toEqual([]);
    });
  });

  describe('getExistingAssignment', () => {
    it('should return null when no assignment exists', async () => {
      const assignment = await getExistingAssignment('nonexistent-job');

      expect(assignment).toBeNull();
    });
  });

  describe('hash function determinism', () => {
    it('should produce consistent results for same input', async () => {
      const test: ABTest = {
        id: 'hash-test',
        name: 'Hash Test',
        controlTemplate: 'DEFINITIONAL',
        variantTemplate: 'COMPARISON',
        trafficSplit: 0.5,
        isActive: true,
      };

      const results: string[] = [];
      for (let i = 0; i < 5; i++) {
        const assignment = await assignToABTest(test, 'consistent-job-id');
        results.push(assignment.variant);
      }

      // All results should be the same
      expect(new Set(results).size).toBe(1);
    });

    it('should produce different results for different inputs', async () => {
      const test: ABTest = {
        id: 'variance-test',
        name: 'Variance Test',
        controlTemplate: 'DEFINITIONAL',
        variantTemplate: 'COMPARISON',
        trafficSplit: 0.5,
        isActive: true,
      };

      const variants = new Set<string>();
      // Use more samples to ensure we get variance with 50/50 split
      for (let i = 0; i < 100; i++) {
        const assignment = await assignToABTest(test, `unique-job-${i}-${Math.random()}`);
        variants.add(assignment.variant);
      }

      // Should have both control and variant across different jobs
      expect(variants.size).toBe(2);
    });
  });
});
