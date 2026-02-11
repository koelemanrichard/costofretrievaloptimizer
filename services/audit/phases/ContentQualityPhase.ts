/**
 * Content Quality Phase Adapter
 *
 * Wraps the Pass 8 auditChecks.ts (35 algorithmic checks) for the unified audit system.
 * Covers checklist categories C, D, E: micro-semantics, density, content format, flow.
 *
 * When content is available via the request context:
 *   - Calls runAlgorithmicAudit(draft, brief, info, language, eavs, template)
 *   - Maps each AuditRuleResult to an AuditFinding
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { runAlgorithmicAudit } from '../../ai/contentGeneration/passes/auditChecks';
import type { AuditRuleResult } from '../../../types';

/**
 * Map an AuditRuleResult pass/fail + score to an AuditFinding severity.
 */
function mapRuleSeverity(rule: AuditRuleResult): AuditFinding['severity'] {
  if (rule.isPassing) return 'low'; // passing rules mapped as informational
  const score = rule.score ?? 0;
  if (score <= 20) return 'critical';
  if (score <= 50) return 'high';
  if (score <= 75) return 'medium';
  return 'low';
}

export class ContentQualityPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'microSemantics';

  async execute(request: AuditRequest): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    // The orchestrator will eventually pass content context containing:
    //   - draft: string (the article content)
    //   - brief: ContentBrief
    //   - info: BusinessInfo
    //   - language: string
    //   - eavs: SemanticTriple[] (optional)
    //   - template: TemplateConfig (optional)
    //
    // When available, we will:
    //   1. Call runAlgorithmicAudit(draft, brief, info, language, eavs, template)
    //   2. Transform each failing AuditRuleResult into an AuditFinding

    // For now, return empty result until orchestrator provides content context.
    // The 35 algorithmic checks will be fully wired when content is fetched.

    return this.buildResult(findings, totalChecks);
  }

  /**
   * Transform Pass 8 AuditRuleResult[] into AuditFinding[].
   * Called internally when content audit results are available.
   */
  transformAuditRuleResults(results: AuditRuleResult[]): AuditFinding[] {
    return results
      .filter((rule) => !rule.isPassing)
      .map((rule, index) =>
        this.createFinding({
          ruleId: `cq-p8-${index + 1}-${slugify(rule.ruleName)}`,
          severity: mapRuleSeverity(rule),
          title: rule.ruleName,
          description: rule.details,
          whyItMatters: 'Content quality checks ensure micro-semantic optimization, proper information density, and structural compliance for both users and search engines.',
          currentValue: rule.affectedTextSnippet,
          exampleFix: rule.remediation,
          category: 'Content Quality',
          estimatedImpact: mapRuleSeverity(rule) === 'critical' ? 'high' : 'medium',
        })
      );
  }
}

/**
 * Convert a rule name to a URL-safe slug for use in ruleId.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
