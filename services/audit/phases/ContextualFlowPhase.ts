/**
 * Contextual Flow Phase Adapter
 *
 * Wraps flowValidator.ts for the unified audit system.
 * Evaluates contextual bridges, transitions, and narrative flow between sections.
 *
 * Rule 113: Centerpiece text validation — first 400 chars must contain CE + definition + key attributes
 */

import { AuditPhase } from './AuditPhase';
import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';

export class ContextualFlowPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'contextualFlow';

  async execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult> {
    const findings: AuditFinding[] = [];
    let totalChecks = 0;

    const contentData = this.extractContent(content);
    if (contentData && contentData.centralEntity) {
      // Rule 113: Centerpiece text — first 400 chars must contain CE + definition + key attributes
      totalChecks++;
      const centerpieceIssues = this.checkCenterpieceText(contentData);
      findings.push(...centerpieceIssues);
    }

    return this.buildResult(findings, totalChecks);
  }

  private extractContent(content: unknown): { text: string; centralEntity?: string; keyAttributes?: string[] } | null {
    if (!content) return null;
    if (typeof content === 'string') return { text: content };
    if (typeof content === 'object' && 'text' in (content as Record<string, unknown>)) {
      const c = content as Record<string, unknown>;
      return {
        text: c.text as string,
        centralEntity: c.centralEntity as string | undefined,
        keyAttributes: c.keyAttributes as string[] | undefined,
      };
    }
    return null;
  }

  /**
   * Rule 113: First 400 characters must contain:
   * 1. The Central Entity
   * 2. A definition (indicated by "is", "are", "refers to", "means")
   * 3. At least one key attribute
   */
  checkCenterpieceText(content: { text: string; centralEntity?: string; keyAttributes?: string[] }): AuditFinding[] {
    const issues: AuditFinding[] = [];
    const intro = content.text.slice(0, 400).toLowerCase();

    if (content.centralEntity) {
      const ce = content.centralEntity.toLowerCase();
      if (!intro.includes(ce)) {
        issues.push(this.createFinding({
          ruleId: 'rule-113-ce',
          severity: 'critical',
          title: 'Central Entity missing from introduction',
          description: `The Central Entity "${content.centralEntity}" does not appear in the first 400 characters.`,
          whyItMatters: 'The centerpiece text must establish the Central Entity immediately to signal topic focus to search engines.',
          currentValue: intro.slice(0, 100) + '...',
          expectedValue: `"${content.centralEntity}" in first 400 chars`,
          category: 'Contextual Flow',
          estimatedImpact: 'high',
        }));
      }
    }

    // Check for definition pattern
    const definitionPatterns = [/\bis\b/, /\bare\b/, /\brefers?\s+to\b/, /\bmeans?\b/, /\bdefine[ds]?\b/];
    const hasDefinition = definitionPatterns.some(p => p.test(intro));
    if (content.centralEntity && !hasDefinition) {
      issues.push(this.createFinding({
        ruleId: 'rule-113-def',
        severity: 'high',
        title: 'No definition in introduction',
        description: 'The first 400 characters lack a definitional statement (is/are/refers to/means).',
        whyItMatters: 'A clear definition in the introduction helps search engines understand the topic scope.',
        category: 'Contextual Flow',
        estimatedImpact: 'medium',
      }));
    }

    // Check for key attributes
    if (content.keyAttributes && content.keyAttributes.length > 0) {
      const foundAttrs = content.keyAttributes.filter(attr => intro.includes(attr.toLowerCase()));
      if (foundAttrs.length === 0) {
        issues.push(this.createFinding({
          ruleId: 'rule-113-attr',
          severity: 'high',
          title: 'No key attributes in introduction',
          description: `None of the key attributes appear in the first 400 characters: ${content.keyAttributes.join(', ')}`,
          whyItMatters: 'Key attributes in the introduction establish the scope and depth of coverage.',
          category: 'Contextual Flow',
          estimatedImpact: 'medium',
        }));
      }
    }

    return issues;
  }
}
