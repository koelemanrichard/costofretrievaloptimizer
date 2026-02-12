/**
 * Information Density Phase Adapter
 *
 * Analyzes information density, content depth scoring, and value-per-paragraph metrics.
 * Rules implemented:
 *   94 - No redundant repetition
 *   95 - No filler paragraphs
 *   96 - No vague statements
 *   98 - Direct answers without preamble
 *   100-112 - Filler word replacement
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { InformationDensityValidator } from '../rules/InformationDensityValidator';
import { FillerReplacementAdvisor } from '../rules/FillerReplacementAdvisor';

export class InformationDensityPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'informationDensity';

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    const text = this.extractText(content);
    if (text) {
      // Rules 94-96, 98: Information density (redundancy, filler paragraphs, vagueness, preamble)
      totalChecks++;
      const densityValidator = new InformationDensityValidator();
      const densityIssues = densityValidator.validate(text);
      for (const issue of densityIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          currentValue: issue.currentValue,
          exampleFix: issue.exampleFix,
          whyItMatters: 'High information density reduces Cost of Retrieval and demonstrates expertise.',
          category: 'Information Density',
        }));
      }

      // Rules 100-112: Filler word replacement
      totalChecks++;
      const fillerAdvisor = new FillerReplacementAdvisor();
      const fillerIssues = fillerAdvisor.validate(text);
      for (const issue of fillerIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Filler words dilute information density and reduce content quality signals.',
          category: 'Information Density',
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
}
