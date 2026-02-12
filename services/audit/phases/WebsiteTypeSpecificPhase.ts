/**
 * Website Type-Specific Phase Adapter
 *
 * Applies audit rules specific to the website type (e-commerce, blog, SaaS, etc.).
 * Bonus/optional phase -- not included in the standard 100% weight total.
 *
 * Rules implemented:
 *   400-432 - Website type-specific rules (ecommerce, SaaS, B2B, blog)
 *   AI-assisted rules (fallback mode when no AI provider is available)
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { WebsiteTypeRuleEngine } from '../rules/WebsiteTypeRuleEngine';
import type { WebsiteType } from '../rules/WebsiteTypeRuleEngine';
import { AiAssistedRuleEngine } from '../rules/AiAssistedRuleEngine';

export class WebsiteTypeSpecificPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'websiteTypeSpecific';

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    const contentData = this.extractContent(content);

    // Rules 400-432: Website type-specific checks
    if (contentData?.html && contentData?.websiteType && contentData.websiteType !== 'other') {
      totalChecks++;
      const typeEngine = new WebsiteTypeRuleEngine();
      const typeIssues = typeEngine.validate({
        websiteType: contentData.websiteType,
        html: contentData.html,
        text: contentData.text,
        url: request.url,
        schemaTypes: contentData.schemaTypes,
      });
      for (const issue of typeIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Website type-specific requirements ensure content meets industry standards and user expectations.',
          category: 'Website Type-Specific',
        }));
      }
    }

    // AI-assisted rules (fallback mode -- heuristic checks only, no LLM call)
    if (contentData?.text) {
      totalChecks++;
      const aiEngine = new AiAssistedRuleEngine();
      const aiIssues = aiEngine.validateFallback({
        text: contentData.text,
        centralEntity: contentData.centralEntity,
        targetKeyword: contentData.targetKeyword,
        keyAttributes: contentData.keyAttributes,
        eavTriples: contentData.eavTriples,
        headings: contentData.headings,
        authorInfo: contentData.authorInfo,
      });
      for (const issue of aiIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Deep semantic checks validate content quality beyond surface-level patterns.',
          category: 'Website Type-Specific',
        }));
      }
    }

    return this.buildResult(findings, totalChecks);
  }

  private extractContent(content: unknown): {
    html?: string;
    text?: string;
    websiteType?: WebsiteType;
    schemaTypes?: string[];
    centralEntity?: string;
    targetKeyword?: string;
    keyAttributes?: string[];
    eavTriples?: Array<{ entity: string; attribute: string; value: string }>;
    headings?: string[];
    authorInfo?: { name?: string; bio?: string };
  } | null {
    if (!content) return null;
    if (typeof content === 'string') return { text: content };
    if (typeof content === 'object') {
      const c = content as Record<string, unknown>;
      return {
        html: c.html as string | undefined,
        text: c.text as string | undefined,
        websiteType: c.websiteType as WebsiteType | undefined,
        schemaTypes: c.schemaTypes as string[] | undefined,
        centralEntity: c.centralEntity as string | undefined,
        targetKeyword: c.targetKeyword as string | undefined,
        keyAttributes: c.keyAttributes as string[] | undefined,
        eavTriples: c.eavTriples as Array<{ entity: string; attribute: string; value: string }> | undefined,
        headings: c.headings as string[] | undefined,
        authorInfo: c.authorInfo as { name?: string; bio?: string } | undefined,
      };
    }
    return null;
  }
}
