import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';

const SEVERITY_PENALTIES: Record<AuditFinding['severity'], number> = {
  critical: 15,
  high: 8,
  medium: 4,
  low: 1,
};

export abstract class AuditPhase {
  abstract readonly phaseName: AuditPhaseName;
  abstract execute(request: AuditRequest, content?: unknown): Promise<AuditPhaseResult>;

  buildResult(findings: AuditFinding[], totalChecks: number): AuditPhaseResult {
    const totalPenalty = findings.reduce(
      (sum, f) => sum + (SEVERITY_PENALTIES[f.severity] || 0),
      0
    );
    const score = Math.max(0, Math.min(100, 100 - totalPenalty));
    const passedChecks = Math.max(0, totalChecks - findings.length);

    return {
      phase: this.phaseName,
      score,
      weight: 0, // Set by orchestrator based on config
      passedChecks,
      totalChecks,
      findings,
      summary: this.generateSummary(score, findings, totalChecks),
    };
  }

  createFinding(params: {
    ruleId: string;
    checklistRuleNumber?: number;
    severity: AuditFinding['severity'];
    title: string;
    description: string;
    whyItMatters: string;
    currentValue?: string;
    expectedValue?: string;
    exampleFix?: string;
    affectedElement?: string;
    autoFixAvailable?: boolean;
    estimatedImpact?: AuditFinding['estimatedImpact'];
    category: string;
    language?: string;
  }): AuditFinding {
    return {
      id: crypto.randomUUID(),
      phase: this.phaseName,
      autoFixAvailable: false,
      estimatedImpact: 'medium',
      ...params,
    };
  }

  private generateSummary(score: number, findings: AuditFinding[], totalChecks: number): string {
    if (findings.length === 0) {
      return totalChecks > 0
        ? `All ${totalChecks} checks passed.`
        : 'No checks performed.';
    }
    const critical = findings.filter(f => f.severity === 'critical').length;
    const high = findings.filter(f => f.severity === 'high').length;
    const parts: string[] = [];
    if (critical > 0) parts.push(`${critical} critical`);
    if (high > 0) parts.push(`${high} high`);
    const otherCount = findings.length - critical - high;
    if (otherCount > 0) parts.push(`${otherCount} other`);
    return `Score: ${score}/100. Found ${findings.length} issues (${parts.join(', ')}).`;
  }
}
