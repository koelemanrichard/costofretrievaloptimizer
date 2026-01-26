import { describe, it, expect } from 'vitest';
import {
  calculateCriticalityScore,
  batchCalculateCriticality,
  filterCriticalEntities,
  sortByCriticality,
  CRITICALITY_THRESHOLD,
  EntityCriticalityInput,
  EntityCriticalityResult,
} from '../entityCriticality';

describe('entityCriticality', () => {
  describe('CRITICALITY_THRESHOLD', () => {
    it('should be 0.7', () => {
      expect(CRITICALITY_THRESHOLD).toBe(0.7);
    });
  });

  describe('calculateCriticalityScore', () => {
    describe('Central Entity', () => {
      it('should return 1.0 for central entity', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Main Entity',
          isCentralEntity: true,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: false,
          topicCount: 1,
          betweennessCentrality: 0,
        };
        const result = calculateCriticalityScore(input);
        expect(result.score).toBe(1.0);
        expect(result.isCritical).toBe(true);
      });

      it('should ignore other factors when central entity', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Main Entity',
          isCentralEntity: true,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: false,
          topicCount: 1,
          betweennessCentrality: 0,
        };
        const result = calculateCriticalityScore(input);
        expect(result.score).toBe(1.0);
        expect(result.breakdown.baseWeight).toBe(1.0);
      });
    });

    describe('Attribute Category Base Weights', () => {
      it('should return 0.9 base weight for UNIQUE attribute', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Unique Entity',
          isCentralEntity: false,
          attributeCategory: 'UNIQUE',
          isCoreSectionEntity: false,
          topicCount: 1,
          betweennessCentrality: 0,
        };
        const result = calculateCriticalityScore(input);
        expect(result.score).toBe(0.9);
        expect(result.breakdown.baseWeight).toBe(0.9);
        expect(result.isCritical).toBe(true);
      });

      it('should return 0.8 base weight for ROOT attribute', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Root Entity',
          isCentralEntity: false,
          attributeCategory: 'ROOT',
          isCoreSectionEntity: false,
          topicCount: 1,
          betweennessCentrality: 0,
        };
        const result = calculateCriticalityScore(input);
        expect(result.score).toBe(0.8);
        expect(result.breakdown.baseWeight).toBe(0.8);
        expect(result.isCritical).toBe(true);
      });

      it('should return 0.6 base weight for RARE attribute', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Rare Entity',
          isCentralEntity: false,
          attributeCategory: 'RARE',
          isCoreSectionEntity: false,
          topicCount: 1,
          betweennessCentrality: 0,
        };
        const result = calculateCriticalityScore(input);
        expect(result.score).toBe(0.6);
        expect(result.breakdown.baseWeight).toBe(0.6);
        expect(result.isCritical).toBe(false);
      });

      it('should return 0.4 base weight for COMMON attribute', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Common Entity',
          isCentralEntity: false,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: false,
          topicCount: 1,
          betweennessCentrality: 0,
        };
        const result = calculateCriticalityScore(input);
        expect(result.score).toBe(0.4);
        expect(result.breakdown.baseWeight).toBe(0.4);
        expect(result.isCritical).toBe(false);
      });
    });

    describe('Core Section Bonus', () => {
      it('should add 0.2 bonus for core section entity', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Core Entity',
          isCentralEntity: false,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: true,
          topicCount: 1,
          betweennessCentrality: 0,
        };
        const result = calculateCriticalityScore(input);
        expect(result.score).toBe(0.6); // 0.4 + 0.2
        expect(result.breakdown.coreSectionBonus).toBe(0.2);
      });

      it('should not add bonus for non-core section entity', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Non-Core Entity',
          isCentralEntity: false,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: false,
          topicCount: 1,
          betweennessCentrality: 0,
        };
        const result = calculateCriticalityScore(input);
        expect(result.breakdown.coreSectionBonus).toBe(0);
      });
    });

    describe('Co-occurrence Bonus', () => {
      it('should add 0.1 per topic beyond the first', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Multi-Topic Entity',
          isCentralEntity: false,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: false,
          topicCount: 3,
          betweennessCentrality: 0,
        };
        const result = calculateCriticalityScore(input);
        expect(result.score).toBe(0.6); // 0.4 + 0.2 (2 topics beyond first)
        expect(result.breakdown.coOccurrenceBonus).toBe(0.2);
      });

      it('should cap co-occurrence bonus at 0.3', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Highly Co-occurring Entity',
          isCentralEntity: false,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: false,
          topicCount: 10,
          betweennessCentrality: 0,
        };
        const result = calculateCriticalityScore(input);
        expect(result.breakdown.coOccurrenceBonus).toBe(0.3);
        expect(result.score).toBe(0.7); // 0.4 + 0.3 (capped)
      });

      it('should have 0 bonus for single topic', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Single Topic Entity',
          isCentralEntity: false,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: false,
          topicCount: 1,
          betweennessCentrality: 0,
        };
        const result = calculateCriticalityScore(input);
        expect(result.breakdown.coOccurrenceBonus).toBe(0);
      });

      it('should calculate 5 topics = 0.4 base (COMMON) + 0.3 max = 0.7', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Entity with 5 topics',
          isCentralEntity: false,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: false,
          topicCount: 5,
          betweennessCentrality: 0,
        };
        const result = calculateCriticalityScore(input);
        // 5 topics = 4 beyond first = 0.4, but capped at 0.3
        expect(result.breakdown.coOccurrenceBonus).toBe(0.3);
        expect(result.score).toBe(0.7);
        expect(result.isCritical).toBe(true);
      });
    });

    describe('Bridge Bonus', () => {
      it('should add betweennessCentrality * 0.3 as bridge bonus', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Bridge Entity',
          isCentralEntity: false,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: false,
          topicCount: 1,
          betweennessCentrality: 0.8,
        };
        const result = calculateCriticalityScore(input);
        expect(result.breakdown.bridgeBonus).toBe(0.24); // 0.8 * 0.3
        expect(result.score).toBe(0.64); // 0.4 + 0.24
      });

      it('should have 0 bridge bonus for zero centrality', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Non-Bridge Entity',
          isCentralEntity: false,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: false,
          topicCount: 1,
          betweennessCentrality: 0,
        };
        const result = calculateCriticalityScore(input);
        expect(result.breakdown.bridgeBonus).toBe(0);
      });

      it('should calculate max bridge bonus of 0.3 for centrality 1.0', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Max Bridge Entity',
          isCentralEntity: false,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: false,
          topicCount: 1,
          betweennessCentrality: 1.0,
        };
        const result = calculateCriticalityScore(input);
        expect(result.breakdown.bridgeBonus).toBe(0.3); // 1.0 * 0.3
        expect(result.score).toBe(0.7); // 0.4 + 0.3
      });
    });

    describe('Score Capping and Rounding', () => {
      it('should cap total score at 1.0', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Maximum Entity',
          isCentralEntity: false,
          attributeCategory: 'UNIQUE',
          isCoreSectionEntity: true,
          topicCount: 10,
          betweennessCentrality: 1.0,
        };
        const result = calculateCriticalityScore(input);
        // 0.9 + 0.2 + 0.3 + 0.3 = 1.7, capped to 1.0
        expect(result.score).toBe(1.0);
      });

      it('should round to 2 decimal places', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Precision Entity',
          isCentralEntity: false,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: false,
          topicCount: 2,
          betweennessCentrality: 0.333,
        };
        const result = calculateCriticalityScore(input);
        // 0.4 + 0.1 + (0.333 * 0.3 = 0.0999) = 0.5999, rounded to 0.6
        expect(result.score).toBe(0.6);
      });
    });

    describe('isCritical flag', () => {
      it('should be true when score >= 0.7', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Critical Entity',
          isCentralEntity: false,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: false,
          topicCount: 5,
          betweennessCentrality: 0,
        };
        const result = calculateCriticalityScore(input);
        expect(result.score).toBe(0.7);
        expect(result.isCritical).toBe(true);
      });

      it('should be false when score < 0.7', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Non-Critical Entity',
          isCentralEntity: false,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: false,
          topicCount: 1,
          betweennessCentrality: 0,
        };
        const result = calculateCriticalityScore(input);
        expect(result.score).toBe(0.4);
        expect(result.isCritical).toBe(false);
      });
    });

    describe('Result structure', () => {
      it('should include entityName in result', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Test Entity',
          isCentralEntity: false,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: false,
          topicCount: 1,
          betweennessCentrality: 0,
        };
        const result = calculateCriticalityScore(input);
        expect(result.entityName).toBe('Test Entity');
      });

      it('should include complete breakdown', () => {
        const input: EntityCriticalityInput = {
          entityName: 'Breakdown Test Entity',
          isCentralEntity: false,
          attributeCategory: 'RARE',
          isCoreSectionEntity: true,
          topicCount: 3,
          betweennessCentrality: 0.5,
        };
        const result = calculateCriticalityScore(input);
        expect(result.breakdown).toEqual({
          baseWeight: 0.6,
          coreSectionBonus: 0.2,
          coOccurrenceBonus: 0.2,
          bridgeBonus: 0.15,
        });
        expect(result.score).toBe(1.0); // 0.6 + 0.2 + 0.2 + 0.15 = 1.15, capped to 1.0
      });
    });
  });

  describe('batchCalculateCriticality', () => {
    it('should calculate criticality for multiple inputs', () => {
      const inputs: EntityCriticalityInput[] = [
        {
          entityName: 'Entity A',
          isCentralEntity: false,
          attributeCategory: 'UNIQUE',
          isCoreSectionEntity: false,
          topicCount: 1,
          betweennessCentrality: 0,
        },
        {
          entityName: 'Entity B',
          isCentralEntity: false,
          attributeCategory: 'COMMON',
          isCoreSectionEntity: false,
          topicCount: 1,
          betweennessCentrality: 0,
        },
      ];
      const results = batchCalculateCriticality(inputs);
      expect(results).toHaveLength(2);
      expect(results[0].entityName).toBe('Entity A');
      expect(results[0].score).toBe(0.9);
      expect(results[1].entityName).toBe('Entity B');
      expect(results[1].score).toBe(0.4);
    });

    it('should return empty array for empty input', () => {
      const results = batchCalculateCriticality([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('filterCriticalEntities', () => {
    it('should filter to only critical entities (score >= 0.7)', () => {
      const results: EntityCriticalityResult[] = [
        {
          entityName: 'Critical',
          score: 0.9,
          isCritical: true,
          breakdown: { baseWeight: 0.9, coreSectionBonus: 0, coOccurrenceBonus: 0, bridgeBonus: 0 },
        },
        {
          entityName: 'Non-Critical',
          score: 0.4,
          isCritical: false,
          breakdown: { baseWeight: 0.4, coreSectionBonus: 0, coOccurrenceBonus: 0, bridgeBonus: 0 },
        },
        {
          entityName: 'Borderline',
          score: 0.7,
          isCritical: true,
          breakdown: { baseWeight: 0.4, coreSectionBonus: 0, coOccurrenceBonus: 0.3, bridgeBonus: 0 },
        },
      ];
      const filtered = filterCriticalEntities(results);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.entityName)).toEqual(['Critical', 'Borderline']);
    });

    it('should return empty array when no critical entities', () => {
      const results: EntityCriticalityResult[] = [
        {
          entityName: 'Non-Critical',
          score: 0.4,
          isCritical: false,
          breakdown: { baseWeight: 0.4, coreSectionBonus: 0, coOccurrenceBonus: 0, bridgeBonus: 0 },
        },
      ];
      const filtered = filterCriticalEntities(results);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('sortByCriticality', () => {
    it('should sort by score descending', () => {
      const results: EntityCriticalityResult[] = [
        {
          entityName: 'Low',
          score: 0.4,
          isCritical: false,
          breakdown: { baseWeight: 0.4, coreSectionBonus: 0, coOccurrenceBonus: 0, bridgeBonus: 0 },
        },
        {
          entityName: 'High',
          score: 0.9,
          isCritical: true,
          breakdown: { baseWeight: 0.9, coreSectionBonus: 0, coOccurrenceBonus: 0, bridgeBonus: 0 },
        },
        {
          entityName: 'Medium',
          score: 0.7,
          isCritical: true,
          breakdown: { baseWeight: 0.4, coreSectionBonus: 0, coOccurrenceBonus: 0.3, bridgeBonus: 0 },
        },
      ];
      const sorted = sortByCriticality(results);
      expect(sorted.map(r => r.entityName)).toEqual(['High', 'Medium', 'Low']);
      expect(sorted.map(r => r.score)).toEqual([0.9, 0.7, 0.4]);
    });

    it('should not mutate original array', () => {
      const results: EntityCriticalityResult[] = [
        {
          entityName: 'Low',
          score: 0.4,
          isCritical: false,
          breakdown: { baseWeight: 0.4, coreSectionBonus: 0, coOccurrenceBonus: 0, bridgeBonus: 0 },
        },
        {
          entityName: 'High',
          score: 0.9,
          isCritical: true,
          breakdown: { baseWeight: 0.9, coreSectionBonus: 0, coOccurrenceBonus: 0, bridgeBonus: 0 },
        },
      ];
      const originalFirst = results[0].entityName;
      sortByCriticality(results);
      expect(results[0].entityName).toBe(originalFirst);
    });

    it('should return empty array for empty input', () => {
      const sorted = sortByCriticality([]);
      expect(sorted).toHaveLength(0);
    });
  });
});
