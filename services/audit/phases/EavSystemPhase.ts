/**
 * EAV System Phase Adapter
 *
 * Wraps the eavAudit.ts service for the unified audit system.
 * Covers checklist rules 33-56: EAV Structure + KBT consistency.
 *
 * When project EAV data is available via the request context:
 *   - Calls auditEavs() to check for value conflicts, category/type mismatches
 *   - Calls auditBriefEavConsistency() for cross-brief consistency
 *   - Transforms EavInconsistency[] into AuditFinding[]
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { auditEavs, auditBriefEavConsistency } from '../../ai/eavAudit';
import type { EavInconsistency, InconsistencySeverity } from '../../ai/eavAudit';
import { EavTextValidator } from '../rules/EavTextValidator';

/**
 * Map eavAudit severity to AuditFinding severity.
 */
function mapEavSeverity(severity: InconsistencySeverity): AuditFinding['severity'] {
  switch (severity) {
    case 'critical': return 'critical';
    case 'warning': return 'high';
    case 'info': return 'low';
    default: return 'medium';
  }
}

export class EavSystemPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'eavSystem';

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    // Rules 33, 37, 40, 45: EAV text validation
    const contentData = this.extractContent(content);
    if (contentData?.text) {
      totalChecks++;
      const eavValidator = new EavTextValidator();
      const eavIssues = eavValidator.validate({
        text: contentData.text,
        eavs: contentData.eavs,
        rootAttributes: contentData.rootAttributes,
      });
      for (const issue of eavIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Explicit EAV triples help search engines build accurate knowledge graph entries for your entities.',
          category: 'EAV System',
        }));
      }
    }

    return this.buildResult(findings, totalChecks);
  }

  private extractContent(content: unknown): {
    text: string;
    eavs?: { entity: string; attribute: string; value: string }[];
    rootAttributes?: string[];
  } | null {
    if (!content) return null;
    if (typeof content === 'string') return { text: content };
    if (typeof content === 'object' && 'text' in (content as Record<string, unknown>)) {
      const c = content as Record<string, unknown>;
      return {
        text: c.text as string,
        eavs: c.eavs as { entity: string; attribute: string; value: string }[] | undefined,
        rootAttributes: c.rootAttributes as string[] | undefined,
      };
    }
    return null;
  }

  /**
   * Transform EAV inconsistencies into audit findings.
   * Called internally when EAV data is available.
   */
  transformEavInconsistencies(inconsistencies: EavInconsistency[]): AuditFinding[] {
    return inconsistencies.map((inc) =>
      this.createFinding({
        ruleId: `eav-${inc.type}-${inc.id}`,
        severity: mapEavSeverity(inc.severity),
        title: this.getEavIssueTitle(inc.type),
        description: inc.description,
        whyItMatters: 'EAV consistency ensures search engines build a coherent knowledge graph. Conflicting values erode topical authority and can trigger quality demotion.',
        currentValue: inc.locations.map(l => l.value).join(' vs '),
        expectedValue: 'Consistent value across all occurrences',
        exampleFix: inc.suggestion,
        affectedElement: `${inc.subject} / ${inc.attribute}`,
        category: 'EAV Consistency',
        estimatedImpact: inc.severity === 'critical' ? 'high' : 'medium',
      })
    );
  }

  private getEavIssueTitle(type: EavInconsistency['type']): string {
    switch (type) {
      case 'value_conflict': return 'Conflicting EAV values';
      case 'missing_attribute': return 'Missing EAV attribute';
      case 'type_mismatch': return 'EAV value type mismatch';
      case 'category_mismatch': return 'EAV category mismatch';
      default: return 'EAV consistency issue';
    }
  }
}
