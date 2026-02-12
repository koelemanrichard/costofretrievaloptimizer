/**
 * Semantic Distance Phase Adapter
 *
 * Wraps lib/knowledgeGraph.ts for the unified audit system.
 * Checks semantic distance between topics, identifies cannibalization risks and clustering issues.
 *
 * Rules implemented:
 *   203 - Canonical query assignment: each page must have a unique focus topic
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { SemanticDistanceAuditor } from '../rules/SemanticDistanceAuditor';

export class SemanticDistancePhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'semanticDistance';

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    // Rule 203: Semantic distance / cannibalization detection
    const contentData = this.extractContent(content);
    if (contentData?.pageTopic && contentData?.otherPages && contentData.otherPages.length > 0) {
      totalChecks++;
      const distanceAuditor = new SemanticDistanceAuditor();
      const distanceIssues = distanceAuditor.validate({
        pageTopic: contentData.pageTopic,
        otherPages: contentData.otherPages,
        precomputedDistances: contentData.precomputedDistances,
      });
      for (const issue of distanceIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Pages targeting very similar topics cause keyword cannibalization, diluting ranking potential.',
          category: 'Semantic Distance',
        }));
      }
    }

    return this.buildResult(findings, totalChecks);
  }

  private extractContent(content: unknown): {
    pageTopic: string;
    otherPages?: Array<{ url: string; topic: string }>;
    precomputedDistances?: Array<{ url: string; topic: string; distance: number }>;
  } | null {
    if (!content) return null;
    if (typeof content === 'object' && 'pageTopic' in (content as Record<string, unknown>)) {
      const c = content as Record<string, unknown>;
      return {
        pageTopic: c.pageTopic as string,
        otherPages: c.otherPages as Array<{ url: string; topic: string }> | undefined,
        precomputedDistances: c.precomputedDistances as Array<{ url: string; topic: string; distance: number }> | undefined,
      };
    }
    return null;
  }
}
