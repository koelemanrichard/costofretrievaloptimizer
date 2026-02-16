/**
 * Content Quality Phase Adapter
 *
 * Covers checklist categories C, D, E: micro-semantics, density, content format, flow.
 *
 * Uses:
 *   - MicroSemanticsValidator for modality, hedging, predicate specificity, SPO
 *   - AiAssistedRuleEngine (fallback) for experience indicators, examples, snippet optimization
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { MicroSemanticsValidator } from '../rules/MicroSemanticsValidator';
import { AiAssistedRuleEngine } from '../rules/AiAssistedRuleEngine';
import type { AiRuleInput } from '../rules/AiAssistedRuleEngine';

export class ContentQualityPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'microSemantics';

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    // Rules 57-58, 61, 73: Micro-semantics validation (modality, predicate specificity, SPO)
    const contentData = this.extractContent(content);
    if (contentData?.text) {
      totalChecks += 4; // modality, hedging, predicate specificity, SPO checks
      const microValidator = new MicroSemanticsValidator();
      const microIssues = microValidator.validate(contentData.text);
      for (const issue of microIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Sentence-level semantic quality affects how search engines parse and understand content.',
          category: 'Micro-Semantics',
        }));
      }
    }

    // Rules 21-ai, 22-ai, 225-ai, 226-ai: AI-assisted fallback heuristic checks
    if (contentData?.text) {
      totalChecks += 4; // experience indicators, specific examples, snippet paragraph, how-to steps
      const aiEngine = new AiAssistedRuleEngine();
      const aiInput: AiRuleInput = {
        text: contentData.text,
        centralEntity: contentData.centralEntity,
        eavTriples: contentData.eavTriples,
        keyAttributes: contentData.keyAttributes,
        language: request.language,
      };
      const aiIssues = aiEngine.validateFallback(aiInput);
      for (const issue of aiIssues) {
        findings.push(this.createFinding({
          ruleId: issue.ruleId,
          severity: issue.severity,
          title: issue.title,
          description: issue.description,
          affectedElement: issue.affectedElement,
          exampleFix: issue.exampleFix,
          whyItMatters: 'Author expertise signals and featured snippet optimization improve E-E-A-T and SERP visibility.',
          category: 'Content Quality',
        }));
      }
    }

    return this.buildResult(findings, totalChecks);
  }

  private extractContent(content: unknown): {
    text: string;
    centralEntity?: string;
    eavTriples?: Array<{ entity: string; attribute: string; value: string }>;
    keyAttributes?: string[];
  } | null {
    if (!content) return null;
    if (typeof content === 'string') return { text: content };
    if (typeof content === 'object' && 'text' in (content as Record<string, unknown>)) {
      const c = content as Record<string, unknown>;
      return {
        text: c.text as string,
        centralEntity: c.centralEntity as string | undefined,
        eavTriples: c.eavTriples as Array<{ entity: string; attribute: string; value: string }> | undefined,
        keyAttributes: c.rootAttributes as string[] | undefined,
      };
    }
    return null;
  }
}
