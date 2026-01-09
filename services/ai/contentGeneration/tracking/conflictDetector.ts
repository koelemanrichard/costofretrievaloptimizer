// services/ai/contentGeneration/tracking/conflictDetector.ts
/**
 * ConflictDetector
 *
 * Detects when a pass "regresses" rules - fixes some but breaks others that were
 * previously passing. This enables automatic rollback decisions.
 *
 * Compares before/after snapshots to determine:
 * - Rules that were FIXED (failing -> passing)
 * - Rules that REGRESSED (passing -> failing)
 * - Rules UNCHANGED
 *
 * Recommends action: accept, revert, or review based on analysis.
 */

import type { RuleSnapshot, RuleStatus } from './ruleSnapshotService';

/**
 * Result of comparing before/after snapshots for a pass
 */
export interface PassDelta {
  passNumber: number;
  rulesFixed: string[];       // Rule IDs that improved (failing -> passing)
  rulesRegressed: string[];   // Rule IDs that got worse (passing -> failing)
  rulesUnchanged: string[];   // Rule IDs with no change
  netChange: number;          // Fixed count - Regressed count
  recommendation: 'accept' | 'revert' | 'review';
}

/**
 * Critical rule IDs that should trigger automatic revert if regressed
 * These are typically rules with severity 'error' that represent fundamental issues
 */
const CRITICAL_RULE_INDICATORS = ['error'] as const;

export class ConflictDetector {
  /**
   * Compare before and after snapshots to detect changes in rule compliance
   *
   * @param before - Snapshot taken before the pass
   * @param after - Snapshot taken after the pass
   * @returns PassDelta with analysis and recommendation
   */
  static compareSnapshots(before: RuleSnapshot, after: RuleSnapshot): PassDelta {
    const rulesFixed: string[] = [];
    const rulesRegressed: string[] = [];
    const rulesUnchanged: string[] = [];
    const criticalRegressions: string[] = [];

    // Get all unique rule IDs from both snapshots
    const allRuleIds = new Set([
      ...Object.keys(before.rules),
      ...Object.keys(after.rules),
    ]);

    for (const ruleId of allRuleIds) {
      const beforeStatus = before.rules[ruleId];
      const afterStatus = after.rules[ruleId];

      const wasPassing = beforeStatus ? beforeStatus.passed : true;  // Missing = implicitly passing
      const isPassing = afterStatus ? afterStatus.passed : true;     // Missing = implicitly passing

      if (!wasPassing && isPassing) {
        // Was failing, now passing = FIXED
        rulesFixed.push(ruleId);
      } else if (wasPassing && !isPassing) {
        // Was passing, now failing = REGRESSED
        rulesRegressed.push(ruleId);

        // Check if this is a critical rule regression
        if (afterStatus && this.isCriticalRule(afterStatus)) {
          criticalRegressions.push(ruleId);
        }
      } else {
        // No change in pass/fail status
        rulesUnchanged.push(ruleId);
      }
    }

    const netChange = rulesFixed.length - rulesRegressed.length;
    const recommendation = this.determineRecommendation(
      netChange,
      rulesRegressed.length,
      criticalRegressions.length
    );

    return {
      passNumber: after.passNumber,
      rulesFixed,
      rulesRegressed,
      rulesUnchanged,
      netChange,
      recommendation,
    };
  }

  /**
   * Determine whether a rule status indicates a critical rule
   */
  private static isCriticalRule(status: RuleStatus): boolean {
    return status.severity === 'error';
  }

  /**
   * Determine the recommendation based on analysis results
   *
   * Decision logic:
   * - ACCEPT: net positive change, no critical regressions
   * - REVERT: more regressions than fixes, OR any critical rule regressed
   * - REVIEW: mixed results, needs human decision
   */
  private static determineRecommendation(
    netChange: number,
    regressionsCount: number,
    criticalRegressionsCount: number
  ): 'accept' | 'revert' | 'review' {
    // Any critical regression = automatic revert recommendation
    if (criticalRegressionsCount > 0) {
      return 'revert';
    }

    // More regressions than fixes = revert
    if (netChange < 0) {
      return 'revert';
    }

    // No regressions and no changes, or pure improvements = accept
    if (regressionsCount === 0) {
      return 'accept';
    }

    // Mixed results (some fixes, some regressions, net zero or positive) = review
    return 'review';
  }

  /**
   * Determine if the delta indicates an automatic revert should occur
   *
   * Returns true only for clear-cut cases where reverting is the right choice.
   * For 'review' cases, returns false to allow human decision.
   */
  static shouldRevert(delta: PassDelta): boolean {
    return delta.recommendation === 'revert';
  }

  /**
   * Get a human-readable reason for why a revert is recommended
   *
   * @returns Reason string if revert is recommended, null otherwise
   */
  static getRevertReason(delta: PassDelta): string | null {
    if (!this.shouldRevert(delta)) {
      return null;
    }

    const regressedList = delta.rulesRegressed.join(', ');

    return `Pass ${delta.passNumber} caused ${delta.rulesRegressed.length} rule regression(s): ${regressedList}. ` +
      `Net quality change: ${delta.netChange > 0 ? '+' : ''}${delta.netChange}. ` +
      `Recommendation: revert to preserve content quality.`;
  }
}
