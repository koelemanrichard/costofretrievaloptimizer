import { describe, it, expect } from 'vitest';
import { AuditPhase } from '../../phases/AuditPhase';
import type { AuditRequest, AuditPhaseResult, AuditFinding, AuditPhaseName } from '../../types';

// Concrete test implementation
class TestPhase extends AuditPhase {
  readonly phaseName: AuditPhaseName = 'strategicFoundation';

  async execute(request: AuditRequest): Promise<AuditPhaseResult> {
    return this.buildResult([], 0);
  }
}

describe('AuditPhase base class', () => {
  it('buildResult creates correct structure with zero findings', () => {
    const phase = new TestPhase();
    const result = phase.buildResult([], 0);
    expect(result.phase).toBe('strategicFoundation');
    expect(result.score).toBe(100);
    expect(result.findings).toHaveLength(0);
    expect(result.passedChecks).toBe(0);
    expect(result.totalChecks).toBe(0);
    expect(result.summary).toBeDefined();
  });

  it('buildResult with totalChecks and no findings gives score 100', () => {
    const phase = new TestPhase();
    const result = phase.buildResult([], 10);
    expect(result.score).toBe(100);
    expect(result.passedChecks).toBe(10);
    expect(result.totalChecks).toBe(10);
  });

  it('buildResult calculates score with severity penalties', () => {
    const phase = new TestPhase();
    const findings: AuditFinding[] = [
      {
        id: '1', phase: 'strategicFoundation', ruleId: 'r1',
        checklistRuleNumber: 1, severity: 'critical',
        title: 'Critical issue', description: 'd',
        whyItMatters: 'w', autoFixAvailable: false,
        estimatedImpact: 'high', category: 'c',
      },
    ];
    const result = phase.buildResult(findings, 10);
    expect(result.score).toBeLessThan(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.totalChecks).toBe(10);
    expect(result.passedChecks).toBe(9); // 10 - 1 finding
    expect(result.findings).toHaveLength(1);
  });

  it('severity penalties: critical > high > medium > low', () => {
    const phase = new TestPhase();

    const makeFinding = (severity: AuditFinding['severity']): AuditFinding => ({
      id: `${severity}-1`, phase: 'strategicFoundation', ruleId: `r-${severity}`,
      severity, title: `${severity} issue`, description: 'd',
      whyItMatters: 'w', autoFixAvailable: false,
      estimatedImpact: 'high', category: 'c',
    });

    const criticalResult = phase.buildResult([makeFinding('critical')], 10);
    const highResult = phase.buildResult([makeFinding('high')], 10);
    const mediumResult = phase.buildResult([makeFinding('medium')], 10);
    const lowResult = phase.buildResult([makeFinding('low')], 10);

    expect(criticalResult.score).toBeLessThan(highResult.score);
    expect(highResult.score).toBeLessThan(mediumResult.score);
    expect(mediumResult.score).toBeLessThan(lowResult.score);
  });

  it('score never goes below 0', () => {
    const phase = new TestPhase();
    const manyFindings: AuditFinding[] = Array.from({ length: 20 }, (_, i) => ({
      id: `${i}`, phase: 'strategicFoundation' as const, ruleId: `r${i}`,
      severity: 'critical' as const, title: 't', description: 'd',
      whyItMatters: 'w', autoFixAvailable: false,
      estimatedImpact: 'high' as const, category: 'c',
    }));
    const result = phase.buildResult(manyFindings, 5);
    expect(result.score).toBe(0);
  });

  it('createFinding produces valid AuditFinding with defaults', () => {
    const phase = new TestPhase();
    const finding = phase.createFinding({
      ruleId: 'rule-42',
      checklistRuleNumber: 42,
      severity: 'high',
      title: 'Missing H1',
      description: 'No H1 tag found',
      whyItMatters: 'H1 signals page topic to search engines',
      category: 'headings',
    });
    expect(finding.id).toBeTruthy();
    expect(finding.phase).toBe('strategicFoundation');
    expect(finding.ruleId).toBe('rule-42');
    expect(finding.autoFixAvailable).toBe(false);
    expect(finding.estimatedImpact).toBe('medium'); // default
  });

  it('buildResult generates summary string', () => {
    const phase = new TestPhase();
    const result = phase.buildResult([], 5);
    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(0);
  });
});
