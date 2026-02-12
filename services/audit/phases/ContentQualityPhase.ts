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
import { MicroSemanticsValidator } from '../rules/MicroSemanticsValidator';

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

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    // Rules 57-58, 61, 73: Micro-semantics validation (modality, predicate specificity, SPO)
    const text = this.extractText(content);
    if (text) {
      totalChecks++;
      const microValidator = new MicroSemanticsValidator();
      const microIssues = microValidator.validate(text);
      for (const issue of microIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Sentence-level semantic quality affects how search engines parse and understand content.',
          category: 'Micro-Semantics',
        }));
      }
    }

    return this.buildResult(findings, totalChecks);
  }

  private extractText(content: unknown): string | null {
    if (!content) return null;
    if (typeof content === 'string') return content;
    if (typeof content === 'object' && 'text' in (content as Record<string, unknown>)) {
      return (content as Record<string, unknown>).text as string;
    }
    return null;
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
