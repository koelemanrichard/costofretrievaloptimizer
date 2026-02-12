/**
 * Content Format Phase Adapter
 *
 * Analyzes content formatting: lists, tables, media elements, and structured data within content.
 * Evaluates Featured Snippet optimization and content element variety.
 *
 * Rules implemented:
 *   205-206, 210, 215-216, 229 - Content format (list types, table headers, IR Zone)
 *   211-224 - Extended formatting (list/table details, visual hierarchy)
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { ContentFormatValidator } from '../rules/ContentFormatValidator';
import { ContentFormattingExtended } from '../rules/ContentFormattingExtended';

export class ContentFormatPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'contentFormat';

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    const contentData = this.extractContent(content);
    if (contentData?.html) {
      // Rules 205-206, 210, 215-216, 229: Content format validation
      totalChecks++;
      const formatValidator = new ContentFormatValidator();
      const formatIssues = formatValidator.validate(contentData.html, contentData.targetQuery);
      for (const issue of formatIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Proper content formatting improves readability and Featured Snippet eligibility.',
          category: 'Content Format',
        }));
      }

      // Rules 211-224: Extended formatting (list/table details, visual hierarchy)
      totalChecks++;
      const extendedValidator = new ContentFormattingExtended();
      const extendedIssues = extendedValidator.validate(contentData.html, contentData.text);
      for (const issue of extendedIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Formatting details affect scan-ability, accessibility, and content quality perception.',
          category: 'Content Format',
        }));
      }
    }

    return this.buildResult(findings, totalChecks);
  }

  private extractContent(content: unknown): {
    html: string;
    text?: string;
    targetQuery?: string;
  } | null {
    if (!content) return null;
    if (typeof content === 'string') return { html: content };
    if (typeof content === 'object' && 'html' in (content as Record<string, unknown>)) {
      const c = content as Record<string, unknown>;
      return {
        html: c.html as string,
        text: c.text as string | undefined,
        targetQuery: c.targetQuery as string | undefined,
      };
    }
    return null;
  }
}
