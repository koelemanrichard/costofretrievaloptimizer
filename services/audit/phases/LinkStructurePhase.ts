/**
 * Link Structure Phase Adapter
 *
 * Covers internal linking checks: fundamentals, navigation, flow direction, external E-A-T.
 *
 * Uses:
 *   - InternalLinkingValidator for anchor text, placement, volume (page-level)
 *   - ExternalDataRuleEngine for navigation, breadcrumb, jump links
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { InternalLinkingValidator } from '../rules/InternalLinkingValidator';
import { ExternalDataRuleEngine } from '../rules/ExternalDataRuleEngine';

export class LinkStructurePhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'internalLinking';

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    const contentData = this.extractContent(content);

    // Rules 162-184: Internal linking validation (anchor text, placement, volume)
    if (contentData?.html && request.url) {
      totalChecks += 16; // generic anchor, short anchor, long anchor, dup anchor, main content, context, too few, density, excessive, annotation quality, first sentence page, first sentence sections, link distribution, anchor repetition, toc presence, heading ids
      const linkValidator = new InternalLinkingValidator();
      const linkIssues = linkValidator.validate({
        html: contentData.html,
        pageUrl: request.url,
        totalWords: contentData.totalWords,
      });
      for (const issue of linkIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Internal link quality affects PageRank flow and helps search engines understand content relationships.',
          category: 'Internal Linking',
        }));
      }
    }

    // Rules 186-194: Navigation, breadcrumb, jump links (external data engine)
    if (contentData?.html && request.url) {
      totalChecks += 13; // author citations, indexed, crawl recency, coverage, JS nav, nav count, breadcrumb, footer, jump links, TOC, anchor IDs, fragment links, skip-to-content
      const externalEngine = new ExternalDataRuleEngine();
      const navIssues = externalEngine.validate({
        url: request.url,
        html: contentData.html,
      });
      for (const issue of navIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Navigation structure and link accessibility affect crawlability and user experience.',
          category: 'Internal Linking',
        }));
      }
    }

    return this.buildResult(findings, totalChecks);
  }

  private extractContent(content: unknown): {
    html: string;
    totalWords?: number;
  } | null {
    if (!content) return null;
    if (typeof content === 'string') return { html: content };
    if (typeof content === 'object' && 'html' in (content as Record<string, unknown>)) {
      const c = content as Record<string, unknown>;
      return {
        html: c.html as string,
        totalWords: c.totalWords as number | undefined,
      };
    }
    return null;
  }
}
