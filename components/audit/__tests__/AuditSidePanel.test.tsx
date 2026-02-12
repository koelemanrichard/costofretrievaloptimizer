import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditSidePanel } from '../AuditSidePanel';
import type { UnifiedAuditReport, AuditFinding, AuditPhaseResult } from '../../../services/audit/types';

function makeFinding(overrides: Partial<AuditFinding> = {}): AuditFinding {
  return {
    id: 'f-1',
    phase: 'strategicFoundation',
    ruleId: 'SF-001',
    severity: 'high',
    title: 'Missing business description',
    description: 'The business description is absent.',
    whyItMatters: 'Establishes content direction.',
    autoFixAvailable: false,
    estimatedImpact: 'medium',
    category: 'strategy',
    ...overrides,
  };
}

function makePhaseResult(overrides: Partial<AuditPhaseResult> = {}): AuditPhaseResult {
  return {
    phase: 'strategicFoundation',
    score: 72,
    weight: 10,
    passedChecks: 7,
    totalChecks: 10,
    findings: [makeFinding()],
    summary: 'Good foundation with minor gaps.',
    ...overrides,
  };
}

function makeReport(overrides: Partial<UnifiedAuditReport> = {}): UnifiedAuditReport {
  return {
    id: 'report-1',
    projectId: 'proj-1',
    auditType: 'internal',
    overallScore: 68,
    phaseResults: [
      makePhaseResult(),
      makePhaseResult({
        phase: 'eavSystem',
        score: 55,
        weight: 15,
        passedChecks: 5,
        totalChecks: 10,
        findings: [
          makeFinding({ id: 'f-2', phase: 'eavSystem', severity: 'critical', title: 'Missing EAV triples' }),
        ],
        summary: 'EAV coverage is low.',
      }),
    ],
    contentMergeSuggestions: [],
    missingKnowledgeGraphTopics: [],
    cannibalizationRisks: [],
    language: 'en',
    version: 1,
    createdAt: '2026-02-12T00:00:00Z',
    auditDurationMs: 5000,
    prerequisitesMet: { businessInfo: true, pillars: true, eavs: true },
    ...overrides,
  };
}

describe('AuditSidePanel', () => {
  it('renders panel when isOpen=true', () => {
    render(
      <AuditSidePanel report={null} isOpen={true} onClose={vi.fn()} />
    );
    const panel = screen.getByTestId('side-panel');
    expect(panel.style.transform).toBe('translateX(0%)');
  });

  it('does not visually show panel when isOpen=false (translateX 100%)', () => {
    render(
      <AuditSidePanel report={null} isOpen={false} onClose={vi.fn()} />
    );
    const panel = screen.getByTestId('side-panel');
    expect(panel.style.transform).toBe('translateX(100%)');
  });

  it('does not render overlay when isOpen=false', () => {
    render(
      <AuditSidePanel report={null} isOpen={false} onClose={vi.fn()} />
    );
    expect(screen.queryByTestId('side-panel-overlay')).toBeNull();
  });

  it('renders overlay when isOpen=true', () => {
    render(
      <AuditSidePanel report={null} isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByTestId('side-panel-overlay')).toBeDefined();
  });

  it('shows loading spinner when isLoading', () => {
    render(
      <AuditSidePanel report={null} isOpen={true} isLoading={true} onClose={vi.fn()} />
    );
    expect(screen.getByTestId('loading-state')).toBeDefined();
    expect(screen.getByText('Running audit...')).toBeDefined();
  });

  it('shows report content when report is provided', () => {
    const report = makeReport();
    render(
      <AuditSidePanel report={report} isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByTestId('score-section')).toBeDefined();
    expect(screen.getByTestId('phase-scores-section')).toBeDefined();
    expect(screen.getByTestId('top-findings-section')).toBeDefined();
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    render(
      <AuditSidePanel report={null} isOpen={true} onClose={onClose} />
    );
    fireEvent.click(screen.getByTestId('close-panel-btn'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('overlay click calls onClose', () => {
    const onClose = vi.fn();
    render(
      <AuditSidePanel report={null} isOpen={true} onClose={onClose} />
    );
    fireEvent.click(screen.getByTestId('side-panel-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('"Open Full Audit" calls onOpenFullAudit', () => {
    const onOpenFullAudit = vi.fn();
    render(
      <AuditSidePanel
        report={null}
        isOpen={true}
        onClose={vi.fn()}
        onOpenFullAudit={onOpenFullAudit}
      />
    );
    fireEvent.click(screen.getByTestId('open-full-audit-btn'));
    expect(onOpenFullAudit).toHaveBeenCalledOnce();
  });

  it('does not show "Open Full Audit" when callback is not provided', () => {
    render(
      <AuditSidePanel report={null} isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.queryByTestId('open-full-audit-btn')).toBeNull();
  });

  it('shows score ring with correct score', () => {
    const report = makeReport({ overallScore: 68 });
    render(
      <AuditSidePanel report={report} isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByTestId('audit-score-value').textContent).toBe('68');
  });

  it('shows phase score bars for each phase', () => {
    const report = makeReport();
    render(
      <AuditSidePanel report={report} isOpen={true} onClose={vi.fn()} />
    );
    const bars = screen.getAllByTestId('phase-score-bar');
    expect(bars).toHaveLength(2);
  });

  it('shows top critical/high findings', () => {
    const report = makeReport();
    render(
      <AuditSidePanel report={report} isOpen={true} onClose={vi.fn()} />
    );
    // Both findings are critical or high severity
    expect(screen.getByText('Missing business description')).toBeDefined();
    expect(screen.getByText('Missing EAV triples')).toBeDefined();
  });

  it('limits top findings to 5 critical/high items', () => {
    const manyFindings: AuditFinding[] = Array.from({ length: 8 }, (_, i) =>
      makeFinding({
        id: `f-${i}`,
        severity: i < 3 ? 'critical' : 'high',
        title: `Finding ${i}`,
      })
    );
    const report = makeReport({
      phaseResults: [
        makePhaseResult({ findings: manyFindings }),
      ],
    });
    render(
      <AuditSidePanel report={report} isOpen={true} onClose={vi.fn()} onOpenFullAudit={vi.fn()} />
    );
    const cards = screen.getAllByTestId('audit-finding-card');
    expect(cards).toHaveLength(5);
  });

  it('shows "View all X findings" when there are more findings than shown', () => {
    const manyFindings: AuditFinding[] = Array.from({ length: 8 }, (_, i) =>
      makeFinding({
        id: `f-${i}`,
        severity: 'high',
        title: `Finding ${i}`,
      })
    );
    const report = makeReport({
      phaseResults: [
        makePhaseResult({ findings: manyFindings }),
      ],
    });
    render(
      <AuditSidePanel report={report} isOpen={true} onClose={vi.fn()} onOpenFullAudit={vi.fn()} />
    );
    expect(screen.getByTestId('view-all-findings-btn')).toBeDefined();
    expect(screen.getByText('View all 8 findings')).toBeDefined();
  });

  it('does not show report content when loading', () => {
    const report = makeReport();
    render(
      <AuditSidePanel report={report} isOpen={true} isLoading={true} onClose={vi.fn()} />
    );
    expect(screen.getByTestId('loading-state')).toBeDefined();
    expect(screen.queryByTestId('score-section')).toBeNull();
  });

  it('shows empty state when no report and not loading', () => {
    render(
      <AuditSidePanel report={null} isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByText('No audit report available.')).toBeDefined();
  });

  it('has proper dialog role and aria-label', () => {
    render(
      <AuditSidePanel report={null} isOpen={true} onClose={vi.fn()} />
    );
    const panel = screen.getByRole('dialog');
    expect(panel).toBeDefined();
    expect(panel.getAttribute('aria-label')).toBe('Audit Results');
  });
});
