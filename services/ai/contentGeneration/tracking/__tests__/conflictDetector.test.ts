// services/ai/contentGeneration/tracking/__tests__/conflictDetector.test.ts
import { describe, it, expect } from 'vitest';
import { ConflictDetector, PassDelta } from '../conflictDetector';
import type { RuleSnapshot, RuleStatus } from '../ruleSnapshotService';

/**
 * Helper to create a RuleSnapshot with given rule statuses
 */
function createSnapshot(
  passNumber: number,
  type: 'before' | 'after',
  rules: Record<string, RuleStatus>
): RuleSnapshot {
  return {
    jobId: 'test-job',
    passNumber,
    snapshotType: type,
    rules,
    contentHash: 'abc123',
    createdAt: new Date(),
  };
}

/**
 * Helper to create a passing rule status
 */
function passingRule(severity: 'error' | 'warning' | 'info' = 'warning'): RuleStatus {
  return { passed: true, severity, violationCount: 0 };
}

/**
 * Helper to create a failing rule status
 */
function failingRule(severity: 'error' | 'warning' | 'info' = 'warning', count = 1): RuleStatus {
  return { passed: false, severity, violationCount: count };
}

describe('ConflictDetector', () => {
  describe('compareSnapshots', () => {
    it('detects rules that were fixed (failing -> passing)', () => {
      const before = createSnapshot(1, 'before', {
        'A1': failingRule('error'),
        'A2': failingRule('warning'),
        'B1': passingRule(),
      });
      const after = createSnapshot(1, 'after', {
        'A1': passingRule(),  // Fixed!
        'A2': passingRule(),  // Fixed!
        'B1': passingRule(),  // Unchanged
      });

      const delta = ConflictDetector.compareSnapshots(before, after);

      expect(delta.rulesFixed).toContain('A1');
      expect(delta.rulesFixed).toContain('A2');
      expect(delta.rulesFixed).toHaveLength(2);
    });

    it('detects rules that regressed (passing -> failing)', () => {
      const before = createSnapshot(1, 'before', {
        'A1': passingRule(),
        'B1': passingRule(),
        'C1': failingRule(),
      });
      const after = createSnapshot(1, 'after', {
        'A1': failingRule('error'),  // Regressed!
        'B1': failingRule('warning'), // Regressed!
        'C1': failingRule(),          // Unchanged (still failing)
      });

      const delta = ConflictDetector.compareSnapshots(before, after);

      expect(delta.rulesRegressed).toContain('A1');
      expect(delta.rulesRegressed).toContain('B1');
      expect(delta.rulesRegressed).toHaveLength(2);
    });

    it('detects unchanged rules', () => {
      const before = createSnapshot(1, 'before', {
        'A1': passingRule(),
        'B1': failingRule(),
      });
      const after = createSnapshot(1, 'after', {
        'A1': passingRule(),  // Unchanged (still passing)
        'B1': failingRule(),  // Unchanged (still failing)
      });

      const delta = ConflictDetector.compareSnapshots(before, after);

      expect(delta.rulesUnchanged).toContain('A1');
      expect(delta.rulesUnchanged).toContain('B1');
      expect(delta.rulesUnchanged).toHaveLength(2);
    });

    it('calculates net change correctly', () => {
      const before = createSnapshot(1, 'before', {
        'A1': failingRule(),
        'A2': failingRule(),
        'A3': failingRule(),
        'B1': passingRule(),
      });
      const after = createSnapshot(1, 'after', {
        'A1': passingRule(),  // Fixed (+1)
        'A2': passingRule(),  // Fixed (+1)
        'A3': failingRule(),  // Unchanged
        'B1': failingRule(),  // Regressed (-1)
      });

      const delta = ConflictDetector.compareSnapshots(before, after);

      // Net = 2 fixed - 1 regressed = +1
      expect(delta.netChange).toBe(1);
    });

    it('handles negative net change', () => {
      const before = createSnapshot(1, 'before', {
        'A1': passingRule(),
        'A2': passingRule(),
        'A3': passingRule(),
        'B1': failingRule(),
      });
      const after = createSnapshot(1, 'after', {
        'A1': failingRule(),  // Regressed
        'A2': failingRule(),  // Regressed
        'A3': failingRule(),  // Regressed
        'B1': passingRule(),  // Fixed
      });

      const delta = ConflictDetector.compareSnapshots(before, after);

      // Net = 1 fixed - 3 regressed = -2
      expect(delta.netChange).toBe(-2);
    });

    it('handles new rules appearing in after snapshot', () => {
      const before = createSnapshot(1, 'before', {
        'A1': passingRule(),
      });
      const after = createSnapshot(1, 'after', {
        'A1': passingRule(),
        'A2': failingRule(),  // New rule appeared as failing
      });

      const delta = ConflictDetector.compareSnapshots(before, after);

      // New failing rules should be treated as regressions
      expect(delta.rulesRegressed).toContain('A2');
    });

    it('handles rules disappearing from after snapshot', () => {
      const before = createSnapshot(1, 'before', {
        'A1': passingRule(),
        'A2': failingRule(),
      });
      const after = createSnapshot(1, 'after', {
        'A1': passingRule(),
        // A2 disappeared - was failing, now not in snapshot (implicitly fixed)
      });

      const delta = ConflictDetector.compareSnapshots(before, after);

      // Disappeared failing rules should be treated as fixed
      expect(delta.rulesFixed).toContain('A2');
    });

    it('sets pass number from after snapshot', () => {
      const before = createSnapshot(2, 'before', {});
      const after = createSnapshot(2, 'after', {});

      const delta = ConflictDetector.compareSnapshots(before, after);

      expect(delta.passNumber).toBe(2);
    });

    it('handles empty before snapshot', () => {
      const before = createSnapshot(1, 'before', {});
      const after = createSnapshot(1, 'after', {
        'A1': failingRule(),
        'A2': passingRule(),
      });

      const delta = ConflictDetector.compareSnapshots(before, after);

      // New failing rule = regression, new passing rule = unchanged (baseline)
      expect(delta.rulesRegressed).toContain('A1');
      expect(delta.rulesUnchanged).toContain('A2');
    });

    it('handles empty after snapshot', () => {
      const before = createSnapshot(1, 'before', {
        'A1': failingRule(),
        'B1': passingRule(),
      });
      const after = createSnapshot(1, 'after', {});

      const delta = ConflictDetector.compareSnapshots(before, after);

      // Previously failing rule disappeared = fixed
      // Previously passing rule disappeared = unchanged (still implicitly passing)
      expect(delta.rulesFixed).toContain('A1');
      expect(delta.rulesUnchanged).toContain('B1');
    });
  });

  describe('recommendation logic', () => {
    it('recommends accept when net positive and no critical regressions', () => {
      const before = createSnapshot(1, 'before', {
        'A1': failingRule('warning'),
        'B1': passingRule('warning'),
      });
      const after = createSnapshot(1, 'after', {
        'A1': passingRule(),  // Fixed
        'B1': failingRule('warning'),  // Regressed but not critical
      });

      const delta = ConflictDetector.compareSnapshots(before, after);

      // Net = 1 fixed - 1 regressed = 0 (neutral)
      // This is edge case - neutral with no critical regressions
      expect(delta.recommendation).toBe('review'); // Neutral = needs review
    });

    it('recommends accept when clearly net positive', () => {
      const before = createSnapshot(1, 'before', {
        'A1': failingRule('warning'),
        'A2': failingRule('warning'),
        'B1': passingRule(),
      });
      const after = createSnapshot(1, 'after', {
        'A1': passingRule(),  // Fixed
        'A2': passingRule(),  // Fixed
        'B1': passingRule(),  // Unchanged
      });

      const delta = ConflictDetector.compareSnapshots(before, after);

      expect(delta.recommendation).toBe('accept');
    });

    it('recommends revert when more regressions than fixes', () => {
      const before = createSnapshot(1, 'before', {
        'A1': failingRule('warning'),
        'B1': passingRule(),
        'B2': passingRule(),
        'B3': passingRule(),
      });
      const after = createSnapshot(1, 'after', {
        'A1': passingRule(),   // Fixed (+1)
        'B1': failingRule(),   // Regressed (-1)
        'B2': failingRule(),   // Regressed (-1)
        'B3': failingRule(),   // Regressed (-1)
      });

      const delta = ConflictDetector.compareSnapshots(before, after);

      // Net = 1 - 3 = -2
      expect(delta.recommendation).toBe('revert');
    });

    it('recommends revert when critical rule regresses', () => {
      const before = createSnapshot(1, 'before', {
        'A1': failingRule('warning'),
        'A2': failingRule('warning'),
        'CRITICAL1': passingRule('error'),  // Critical rule passing
      });
      const after = createSnapshot(1, 'after', {
        'A1': passingRule(),      // Fixed
        'A2': passingRule(),      // Fixed
        'CRITICAL1': failingRule('error'),  // Critical regressed!
      });

      const delta = ConflictDetector.compareSnapshots(before, after);

      // Even though net is +1, critical regression forces revert
      expect(delta.recommendation).toBe('revert');
    });

    it('recommends review for mixed results', () => {
      const before = createSnapshot(1, 'before', {
        'A1': failingRule(),
        'B1': passingRule(),
      });
      const after = createSnapshot(1, 'after', {
        'A1': passingRule(),  // Fixed
        'B1': failingRule(),  // Regressed (same severity)
      });

      const delta = ConflictDetector.compareSnapshots(before, after);

      // Net is 0, mixed results
      expect(delta.recommendation).toBe('review');
    });
  });

  describe('shouldRevert', () => {
    it('returns true when net change is negative', () => {
      const delta: PassDelta = {
        passNumber: 1,
        rulesFixed: ['A1'],
        rulesRegressed: ['B1', 'B2'],
        rulesUnchanged: [],
        netChange: -1,
        recommendation: 'revert',
      };

      expect(ConflictDetector.shouldRevert(delta)).toBe(true);
    });

    it('returns true when recommendation is revert', () => {
      const delta: PassDelta = {
        passNumber: 1,
        rulesFixed: ['A1', 'A2'],
        rulesRegressed: ['CRITICAL1'],
        rulesUnchanged: [],
        netChange: 1,  // Positive, but critical regression
        recommendation: 'revert',
      };

      expect(ConflictDetector.shouldRevert(delta)).toBe(true);
    });

    it('returns false when recommendation is accept', () => {
      const delta: PassDelta = {
        passNumber: 1,
        rulesFixed: ['A1', 'A2'],
        rulesRegressed: [],
        rulesUnchanged: ['B1'],
        netChange: 2,
        recommendation: 'accept',
      };

      expect(ConflictDetector.shouldRevert(delta)).toBe(false);
    });

    it('returns false when recommendation is review', () => {
      const delta: PassDelta = {
        passNumber: 1,
        rulesFixed: ['A1'],
        rulesRegressed: ['B1'],
        rulesUnchanged: [],
        netChange: 0,
        recommendation: 'review',
      };

      expect(ConflictDetector.shouldRevert(delta)).toBe(false);
    });
  });

  describe('getRevertReason', () => {
    it('returns null when should not revert', () => {
      const delta: PassDelta = {
        passNumber: 1,
        rulesFixed: ['A1', 'A2'],
        rulesRegressed: [],
        rulesUnchanged: [],
        netChange: 2,
        recommendation: 'accept',
      };

      expect(ConflictDetector.getRevertReason(delta)).toBeNull();
    });

    it('returns reason mentioning regressed rules count', () => {
      const delta: PassDelta = {
        passNumber: 1,
        rulesFixed: ['A1'],
        rulesRegressed: ['B1', 'B2', 'B3'],
        rulesUnchanged: [],
        netChange: -2,
        recommendation: 'revert',
      };

      const reason = ConflictDetector.getRevertReason(delta);

      expect(reason).not.toBeNull();
      expect(reason).toContain('3');  // Number of regressions
    });

    it('returns reason mentioning specific regressed rules', () => {
      const delta: PassDelta = {
        passNumber: 1,
        rulesFixed: [],
        rulesRegressed: ['RULE_A', 'RULE_B'],
        rulesUnchanged: [],
        netChange: -2,
        recommendation: 'revert',
      };

      const reason = ConflictDetector.getRevertReason(delta);

      expect(reason).toContain('RULE_A');
      expect(reason).toContain('RULE_B');
    });

    it('mentions net change in reason', () => {
      const delta: PassDelta = {
        passNumber: 1,
        rulesFixed: ['A1'],
        rulesRegressed: ['B1', 'B2', 'B3'],
        rulesUnchanged: [],
        netChange: -2,
        recommendation: 'revert',
      };

      const reason = ConflictDetector.getRevertReason(delta);

      expect(reason).toContain('-2');
    });
  });

  describe('edge cases', () => {
    it('handles snapshot with no rules', () => {
      const before = createSnapshot(1, 'before', {});
      const after = createSnapshot(1, 'after', {});

      const delta = ConflictDetector.compareSnapshots(before, after);

      expect(delta.rulesFixed).toHaveLength(0);
      expect(delta.rulesRegressed).toHaveLength(0);
      expect(delta.rulesUnchanged).toHaveLength(0);
      expect(delta.netChange).toBe(0);
      expect(delta.recommendation).toBe('accept'); // No issues = accept
    });

    it('handles rule changing from error to warning severity (still failing)', () => {
      const before = createSnapshot(1, 'before', {
        'A1': failingRule('error', 3),
      });
      const after = createSnapshot(1, 'after', {
        'A1': failingRule('warning', 1),  // Still failing but improved
      });

      const delta = ConflictDetector.compareSnapshots(before, after);

      // Rule is still failing, so unchanged (not fixed)
      expect(delta.rulesUnchanged).toContain('A1');
      expect(delta.rulesFixed).not.toContain('A1');
    });

    it('handles only fixes with no regressions', () => {
      const before = createSnapshot(1, 'before', {
        'A1': failingRule(),
        'A2': failingRule(),
      });
      const after = createSnapshot(1, 'after', {
        'A1': passingRule(),
        'A2': passingRule(),
      });

      const delta = ConflictDetector.compareSnapshots(before, after);

      expect(delta.recommendation).toBe('accept');
      expect(delta.netChange).toBe(2);
    });

    it('handles only regressions with no fixes', () => {
      const before = createSnapshot(1, 'before', {
        'A1': passingRule(),
        'A2': passingRule(),
      });
      const after = createSnapshot(1, 'after', {
        'A1': failingRule(),
        'A2': failingRule(),
      });

      const delta = ConflictDetector.compareSnapshots(before, after);

      expect(delta.recommendation).toBe('revert');
      expect(delta.netChange).toBe(-2);
    });
  });
});
