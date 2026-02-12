/**
 * Meta & Structured Data Phase Adapter
 *
 * Validates meta tags, Open Graph tags, JSON-LD structured data, and schema.org compliance.
 * Ensures all page-level metadata is complete and correctly formatted.
 *
 * Rules implemented:
 *   271 - Canonical tag must be present
 *   273 - noindex + canonical pointing elsewhere = conflict
 *   346 - Canonical should be self-referencing
 *   347 - Canonical URL must be absolute and well-formed
 *   349 - HTML canonical and HTTP Link header canonical must match
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { CanonicalValidator } from '../rules/CanonicalValidator';
import { MetaValidator } from '../rules/MetaValidator';

export class MetaStructuredDataPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'metaStructuredData';

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    const contentData = this.extractContent(content);
    if (contentData?.html && request.url) {
      // Rules 271, 273, 346, 347, 349: Canonical validation
      totalChecks += 5;
      const canonicalValidator = new CanonicalValidator();
      const canonicalIssues = canonicalValidator.validate({
        html: contentData.html,
        pageUrl: request.url,
        httpHeaders: contentData.httpHeaders,
      });
      for (const issue of canonicalIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Correct canonical tags are essential for preventing duplicate content issues and consolidating page authority.',
          category: 'Meta & Structured Data',
        }));
      }
    }

    // Rules 270, 276-279, 284: Meta tags and structured data validation
    if (contentData?.html) {
      totalChecks++;
      const metaValidator = new MetaValidator();
      const metaIssues = metaValidator.validate(contentData.html);
      for (const issue of metaIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          currentValue: issue.currentValue,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Complete and valid meta tags ensure proper indexing and rich result eligibility.',
          category: 'Meta & Structured Data',
        }));
      }
    }

    return this.buildResult(findings, totalChecks);
  }

  private extractContent(content: unknown): { html: string; httpHeaders?: Record<string, string> } | null {
    if (!content) return null;
    if (typeof content === 'string') return { html: content };
    if (typeof content === 'object' && 'html' in (content as Record<string, unknown>)) {
      const c = content as Record<string, unknown>;
      return {
        html: c.html as string,
        httpHeaders: c.httpHeaders as Record<string, string> | undefined,
      };
    }
    return null;
  }
}
