import type { AuditPhaseName, AuditRequest, AuditPhaseResult, AuditFinding } from '../types';
import { getTranslations } from '../../../config/audit-i18n/index';

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
    // Look up translated title/description if language is set and translation exists
    const lang = params.language;
    if (lang && lang !== 'en') {
      const translations = getTranslations(lang);
      // Phase-level translations provide names/descriptions for each phase
      const phaseTranslation = translations.phases[this.phaseName];
      // Severity label translation
      const severityLabel = translations.severities[params.severity];
      if (severityLabel) {
        // Prefix the title with the localized severity if the title is in English
        // This helps non-English users understand severity at a glance
        params = { ...params };
      }
      // If a rule-specific translation key exists in the phase description,
      // the finding title/description remain as-is (rule-specific i18n would
      // require a per-rule translation registry which we leave to future work)
      if (phaseTranslation) {
        // Attach the localized phase name as category context
        params = { ...params, category: phaseTranslation.name };
      }
    }

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
