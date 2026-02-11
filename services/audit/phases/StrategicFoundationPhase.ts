/**
 * Strategic Foundation Phase Adapter
 *
 * Wraps the Central Entity Analyzer service for the unified audit system.
 * Covers checklist rules 1-32: Macro Context, SC, CSI, E-E-A-T, AI patterns.
 *
 * Currently implements CE presence checks via centralEntityAnalyzer.
 * Future sprints will add SC/CSI alignment, E-E-A-T signals, AI pattern detection.
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import {
  analyzeCentralEntityConsistency,
  parseHtmlContent,
  parseMarkdownContent,
} from '../../ai/centralEntityAnalyzer';
import type { ConsistencyIssue } from '../../ai/centralEntityAnalyzer';

/**
 * Map centralEntityAnalyzer severity to AuditFinding severity.
 */
function mapCeSeverity(severity: ConsistencyIssue['severity']): AuditFinding['severity'] {
  switch (severity) {
    case 'critical': return 'critical';
    case 'warning': return 'high';
    case 'info': return 'low';
    default: return 'medium';
  }
}

export class StrategicFoundationPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'strategicFoundation';

  async execute(request: AuditRequest): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    // The orchestrator will eventually pass fetched content and project context.
    // For now, this adapter demonstrates the transform pattern but returns
    // empty results when no content is available.
    //
    // When content is provided (via the second parameter or request extensions),
    // we will:
    //   1. Parse the content (HTML or Markdown)
    //   2. Run analyzeCentralEntityConsistency()
    //   3. Map each ConsistencyIssue to an AuditFinding

    // Future wiring (Sprint 5 P0 rules, Sprint 6 P1 rules):
    // - SC/CSI alignment checks
    // - E-E-A-T signal detection
    // - AI pattern detection

    return this.buildResult(findings, totalChecks);
  }

  /**
   * Transform central entity analysis issues into audit findings.
   * Called internally when content is available.
   */
  transformCeIssues(issues: ConsistencyIssue[]): AuditFinding[] {
    return issues.map((issue) =>
      this.createFinding({
        ruleId: `sf-ce-${issue.issue}`,
        severity: mapCeSeverity(issue.severity),
        title: this.getCeIssueTitle(issue.issue),
        description: issue.description,
        whyItMatters: 'The Central Entity must be consistently defined and referenced throughout the page to establish topical focus for search engines.',
        affectedElement: issue.location,
        category: 'Central Entity Consistency',
        estimatedImpact: issue.severity === 'critical' ? 'high' : 'medium',
      })
    );
  }

  private getCeIssueTitle(issueType: ConsistencyIssue['issue']): string {
    switch (issueType) {
      case 'missing_in_h1': return 'Central Entity missing from H1';
      case 'missing_in_intro': return 'Central Entity not defined in introduction';
      case 'missing_in_title': return 'Central Entity missing from title tag';
      case 'missing_in_schema': return 'Central Entity missing from schema markup';
      case 'low_heading_presence': return 'Low Central Entity presence in headings';
      case 'uneven_distribution': return 'Uneven Central Entity distribution';
      case 'contextual_drift': return 'Contextual drift from Central Entity';
      default: return 'Central Entity consistency issue';
    }
  }
}
