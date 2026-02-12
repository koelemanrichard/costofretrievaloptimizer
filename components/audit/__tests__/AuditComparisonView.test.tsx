/**
 * AuditComparisonView Tests
 *
 * Verifies side-by-side audit snapshot comparison:
 *  - dates, overall score delta
 *  - per-phase comparison table (improvement / regression colouring)
 *  - findings diff: new, resolved, persistent
 */

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AuditComparisonView } from '../AuditComparisonView';
import type {
  UnifiedAuditReport,
  AuditPhaseResult,
  AuditFinding,
} from '../../../services/audit/types';

// ── Factory helpers ──────────────────────────────────────────────────────────

function makeFinding(overrides: Partial<AuditFinding> & { ruleId: string; id: string }): AuditFinding {
  return {
    phase: 'htmlTechnical',
    severity: 'medium',
    title: `Finding ${overrides.ruleId}`,
    description: 'desc',
    whyItMatters: 'matters',
    autoFixAvailable: false,
    estimatedImpact: 'medium',
    category: 'general',
    ...overrides,
  };
}

function makePhase(overrides: Partial<AuditPhaseResult>): AuditPhaseResult {
  return {
    phase: 'htmlTechnical',
    score: 70,
    weight: 20,
    passedChecks: 7,
    totalChecks: 10,
    findings: [],
    summary: 'OK',
    ...overrides,
  };
}

function makeReport(overrides: Partial<UnifiedAuditReport>): UnifiedAuditReport {
  return {
    id: 'report-1',
    projectId: 'proj-1',
    auditType: 'internal',
    overallScore: 65,
    phaseResults: [],
    contentMergeSuggestions: [],
    missingKnowledgeGraphTopics: [],
    cannibalizationRisks: [],
    language: 'en',
    version: 1,
    createdAt: '2026-01-15T10:00:00Z',
    auditDurationMs: 5000,
    prerequisitesMet: { businessInfo: true, pillars: true, eavs: true },
    ...overrides,
  };
}

// ── Test data ────────────────────────────────────────────────────────────────

const findingA = makeFinding({ id: 'f1', ruleId: 'RULE_A', severity: 'high', title: 'Missing H1' });
const findingB = makeFinding({ id: 'f2', ruleId: 'RULE_B', severity: 'critical', title: 'Broken schema' });
const findingC = makeFinding({ id: 'f3', ruleId: 'RULE_C', severity: 'low', title: 'Short meta' });
const findingD = makeFinding({ id: 'f4', ruleId: 'RULE_D', severity: 'medium', title: 'No alt text' });

const beforeReport = makeReport({
  id: 'before-1',
  overallScore: 65,
  createdAt: '2026-01-15T10:00:00Z',
  phaseResults: [
    makePhase({ phase: 'htmlTechnical', score: 60, findings: [findingA, findingB] }),
    makePhase({ phase: 'microSemantics', score: 70, findings: [] }),
    makePhase({ phase: 'eavSystem', score: 80, findings: [findingC] }),
  ],
});

const afterReport = makeReport({
  id: 'after-1',
  overallScore: 78,
  createdAt: '2026-02-10T14:30:00Z',
  phaseResults: [
    makePhase({ phase: 'htmlTechnical', score: 75, findings: [findingA] }), // RULE_B resolved
    makePhase({ phase: 'microSemantics', score: 65, findings: [] }),    // regression
    makePhase({ phase: 'eavSystem', score: 90, findings: [findingD] }), // RULE_C resolved, RULE_D new
  ],
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AuditComparisonView', () => {
  it('renders before and after dates', () => {
    render(<AuditComparisonView before={beforeReport} after={afterReport} />);

    const beforeDate = screen.getByTestId('before-date');
    const afterDate = screen.getByTestId('after-date');

    // The formatted date should contain "Jan" and "2026" for the before report
    expect(beforeDate.textContent).toContain('2026');
    expect(afterDate.textContent).toContain('2026');
    // "vs" separator
    expect(screen.getByText('vs')).toBeInTheDocument();
  });

  it('shows overall score change with positive delta', () => {
    render(<AuditComparisonView before={beforeReport} after={afterReport} />);

    const overall = screen.getByTestId('overall-score');
    expect(overall).toHaveTextContent('65');
    expect(overall).toHaveTextContent('78');

    // Positive delta indicator
    const positiveDelta = screen.getAllByTestId('delta-positive');
    // At least the overall delta should be positive
    const overallDelta = within(overall).getByTestId('delta-positive');
    expect(overallDelta).toHaveTextContent('+13');
  });

  it('shows phase comparison rows', () => {
    render(<AuditComparisonView before={beforeReport} after={afterReport} />);

    const rows = screen.getAllByTestId('phase-row');
    // 3 phases: htmlTechnical, microSemantics, eavSystem
    expect(rows).toHaveLength(3);

    // Table headers
    expect(screen.getByText('Phase')).toBeInTheDocument();
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.getByText('Change')).toBeInTheDocument();
  });

  it('sorts phase rows by largest improvement first', () => {
    render(<AuditComparisonView before={beforeReport} after={afterReport} />);

    const rows = screen.getAllByTestId('phase-row');
    const phaseNames = rows.map((row) => within(row).getAllByRole('cell')[0].textContent);

    // eavSystem: 80→90 (+10), htmlTechnical: 60→75 (+15), microSemantics: 70→65 (-5)
    // sorted by delta desc: htmlTechnical (+15), eavSystem (+10), microSemantics (-5)
    expect(phaseNames[0]).toBe('htmlTechnical');
    expect(phaseNames[1]).toBe('eavSystem');
    expect(phaseNames[2]).toBe('microSemantics');
  });

  it('shows green for improvements and red for regressions', () => {
    render(<AuditComparisonView before={beforeReport} after={afterReport} />);

    const rows = screen.getAllByTestId('phase-row');

    // First row (htmlTechnical, +15) should have a positive delta
    const techDelta = within(rows[0]).getByTestId('delta-positive');
    expect(techDelta).toHaveTextContent('+15');

    // Last row (microSemantics, -5) should have a negative delta
    const contentDelta = within(rows[2]).getByTestId('delta-negative');
    expect(contentDelta).toHaveTextContent('-5');
  });

  it('identifies new findings (in after but not before)', () => {
    render(<AuditComparisonView before={beforeReport} after={afterReport} />);

    const section = screen.getByTestId('new-findings');
    expect(section).toBeInTheDocument();
    // RULE_D is new
    expect(within(section).getByText('No alt text')).toBeInTheDocument();
    expect(section).toHaveTextContent('New Findings (1)');
  });

  it('identifies resolved findings (in before but not after)', () => {
    render(<AuditComparisonView before={beforeReport} after={afterReport} />);

    const section = screen.getByTestId('resolved-findings');
    expect(section).toBeInTheDocument();
    // RULE_B and RULE_C are resolved
    expect(within(section).getByText('Broken schema')).toBeInTheDocument();
    expect(within(section).getByText('Short meta')).toBeInTheDocument();
    expect(section).toHaveTextContent('Resolved Findings (2)');
  });

  it('identifies persistent findings (in both)', () => {
    render(<AuditComparisonView before={beforeReport} after={afterReport} />);

    const section = screen.getByTestId('persistent-findings');
    expect(section).toBeInTheDocument();
    // RULE_A is persistent
    expect(within(section).getByText('Missing H1')).toBeInTheDocument();
    expect(section).toHaveTextContent('Persistent Findings (1)');
  });

  it('applies line-through styling to resolved findings', () => {
    render(<AuditComparisonView before={beforeReport} after={afterReport} />);

    const section = screen.getByTestId('resolved-findings');
    const items = within(section).getAllByRole('listitem');
    for (const item of items) {
      expect(item.className).toContain('line-through');
    }
  });

  it('renders severity badges on findings', () => {
    render(<AuditComparisonView before={beforeReport} after={afterReport} />);

    // New finding RULE_D has severity "medium"
    const newSection = screen.getByTestId('new-findings');
    expect(within(newSection).getByText('medium')).toBeInTheDocument();

    // Resolved finding RULE_B has severity "critical"
    const resolvedSection = screen.getByTestId('resolved-findings');
    expect(within(resolvedSection).getByText('critical')).toBeInTheDocument();

    // Persistent finding RULE_A has severity "high"
    const persistentSection = screen.getByTestId('persistent-findings');
    expect(within(persistentSection).getByText('high')).toBeInTheDocument();
  });
});
