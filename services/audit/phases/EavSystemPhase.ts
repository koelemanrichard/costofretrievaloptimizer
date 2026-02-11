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

  async execute(request: AuditRequest): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    // The orchestrator will eventually pass project context containing:
    //   - mapEavs: SemanticTriple[] (map-level EAVs)
    //   - briefs: ContentBrief[] (for cross-brief consistency)
    //
    // When available, we will:
    //   1. Call auditEavs(mapEavs) for intra-map consistency
    //   2. Call auditBriefEavConsistency(mapEavs, briefs) for cross-brief checks
    //   3. Transform each EavInconsistency into an AuditFinding

    // For now, return empty result until orchestrator provides project context.
    // Checklist rules 33-56 will be fully wired in Sprint 5/6.

    return this.buildResult(findings, totalChecks);
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
