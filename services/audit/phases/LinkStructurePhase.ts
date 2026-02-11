/**
 * Link Structure Phase Adapter
 *
 * Wraps the linkingAudit.ts service for the unified audit system.
 * Covers internal linking checks: fundamentals, navigation, flow direction, external E-A-T.
 *
 * When linking context is available via the request:
 *   - Calls runLinkingAudit(ctx) to run all 4 linking passes
 *   - Maps each LinkingIssue to an AuditFinding
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { runLinkingAudit } from '../../ai/linkingAudit';
import type { LinkingIssue } from '../../../types';

/**
 * Map linkingAudit severity to AuditFinding severity.
 * LinkingIssue uses 'critical' | 'warning' | 'suggestion'.
 */
function mapLinkSeverity(severity: LinkingIssue['severity']): AuditFinding['severity'] {
  switch (severity) {
    case 'critical': return 'critical';
    case 'warning': return 'high';
    case 'suggestion': return 'low';
    default: return 'medium';
  }
}

/**
 * Map linking issue type to a human-readable category.
 */
function mapLinkCategory(type: LinkingIssue['type']): string {
  switch (type) {
    case 'page_link_limit_exceeded':
    case 'anchor_repetition_per_target':
    case 'generic_anchor':
    case 'missing_annotation_text':
      return 'Link Fundamentals';
    case 'header_link_overflow':
    case 'footer_link_overflow':
    case 'duplicate_nav_anchor':
    case 'missing_eat_link':
    case 'static_navigation':
      return 'Navigation Structure';
    case 'wrong_flow_direction':
    case 'missing_contextual_bridge':
    case 'unclosed_loop':
    case 'orphaned_topic':
      return 'Link Flow Direction';
    case 'competitor_link':
    case 'missing_eat_reference':
      return 'External Links & E-A-T';
    default:
      return 'Internal Linking';
  }
}

export class LinkStructurePhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'internalLinking';

  async execute(request: AuditRequest): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    // The orchestrator will eventually pass a LinkingAuditContext containing:
    //   - topics, briefs, pillars, rules, navigation, foundationPages, etc.
    //
    // When available, we will:
    //   1. Call runLinkingAudit(ctx) to execute all 4 passes
    //   2. Flatten all LinkingIssue[] from passResults
    //   3. Transform each LinkingIssue into an AuditFinding

    // For now, return empty result until orchestrator provides linking context.
    // Full wiring happens when the orchestrator fetches project data.

    return this.buildResult(findings, totalChecks);
  }

  /**
   * Transform linking audit issues into audit findings.
   * Called internally when linking context is available.
   */
  transformLinkingIssues(issues: LinkingIssue[]): AuditFinding[] {
    return issues.map((issue) =>
      this.createFinding({
        ruleId: `link-${issue.id}`,
        severity: mapLinkSeverity(issue.severity),
        title: this.getLinkIssueTitle(issue),
        description: issue.message,
        whyItMatters: 'Internal linking controls PageRank flow and helps search engines understand site hierarchy. Poor linking dilutes authority and creates orphan pages.',
        currentValue: issue.currentCount != null ? String(issue.currentCount) : undefined,
        expectedValue: issue.limit != null ? `Max ${issue.limit}` : undefined,
        exampleFix: issue.suggestedFix,
        affectedElement: [issue.sourceTopic, issue.targetTopic].filter(Boolean).join(' -> '),
        autoFixAvailable: issue.autoFixable,
        category: mapLinkCategory(issue.type),
        estimatedImpact: issue.severity === 'critical' ? 'high' : 'medium',
      })
    );
  }

  private getLinkIssueTitle(issue: LinkingIssue): string {
    switch (issue.type) {
      case 'page_link_limit_exceeded': return 'Page link limit exceeded';
      case 'anchor_repetition_per_target': return 'Repetitive anchor text';
      case 'generic_anchor': return 'Generic anchor text detected';
      case 'missing_annotation_text': return 'Missing link annotation text';
      case 'header_link_overflow': return 'Too many header links';
      case 'footer_link_overflow': return 'Too many footer links';
      case 'duplicate_nav_anchor': return 'Duplicate navigation anchor';
      case 'missing_eat_link': return 'Missing E-A-T link in footer';
      case 'static_navigation': return 'Static navigation detected';
      case 'wrong_flow_direction': return 'Incorrect link flow direction';
      case 'missing_contextual_bridge': return 'Missing contextual bridge';
      case 'unclosed_loop': return 'Unclosed link loop to Central Entity';
      case 'orphaned_topic': return 'Orphaned topic (no incoming links)';
      case 'competitor_link': return 'Link to competitor domain';
      case 'missing_eat_reference': return 'Missing external authority reference';
      default: return 'Internal linking issue';
    }
  }
}
