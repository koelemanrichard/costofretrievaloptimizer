import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnifiedAuditDashboard } from '../UnifiedAuditDashboard';
import type {
  UnifiedAuditReport,
  AuditPhaseResult,
  AuditFinding,
  CannibalizationRisk,
} from '../../../services/audit/types';

function makeFinding(overrides: Partial<AuditFinding> = {}): AuditFinding {
  return {
    id: 'f-1',
    phase: 'strategicFoundation',
    ruleId: 'sf-001',
    severity: 'medium',
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
    findings: [],
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
      makePhaseResult({
        phase: 'strategicFoundation',
        score: 72,
        weight: 10,
        findings: [
          makeFinding({ id: 'f-1', severity: 'medium', title: 'Missing business description' }),
        ],
      }),
      makePhaseResult({
        phase: 'eavSystem',
        score: 55,
        weight: 15,
        findings: [
          makeFinding({ id: 'f-2', severity: 'critical', phase: 'eavSystem', title: 'No EAV triples defined' }),
          makeFinding({ id: 'f-3', severity: 'high', phase: 'eavSystem', title: 'Low EAV coverage' }),
        ],
      }),
    ],
    contentMergeSuggestions: [],
    missingKnowledgeGraphTopics: [],
    cannibalizationRisks: [],
    language: 'en',
    version: 1,
    createdAt: '2026-02-12T10:00:00Z',
    auditDurationMs: 4523,
    prerequisitesMet: {
      businessInfo: true,
      pillars: true,
      eavs: false,
    },
    ...overrides,
  };
}

describe('UnifiedAuditDashboard', () => {
  it('renders overall score', () => {
    render(<UnifiedAuditDashboard report={makeReport()} />);
    // The AuditScoreRing renders the score value in a span with data-testid="audit-score-value"
    expect(screen.getByTestId('audit-score-value').textContent).toBe('68');
  });

  it('renders at least 2 phase cards', () => {
    render(<UnifiedAuditDashboard report={makeReport()} />);
    const phaseCards = screen.getAllByTestId('phase-score-card');
    expect(phaseCards.length).toBeGreaterThanOrEqual(2);
  });

  it('sorts phase cards by score ascending (lowest first)', () => {
    render(<UnifiedAuditDashboard report={makeReport()} />);
    const scoreValues = screen.getAllByTestId('score-value');
    const scores = scoreValues.map((el) => Number(el.textContent));
    // eavSystem (55) should come before strategicFoundation (72)
    expect(scores[0]).toBe(55);
    expect(scores[1]).toBe(72);
  });

  it('renders findings section with heading', () => {
    render(<UnifiedAuditDashboard report={makeReport()} />);
    expect(screen.getByTestId('findings-heading')).toBeDefined();
    expect(screen.getByTestId('findings-heading').textContent).toBe('Findings');
  });

  it('renders all findings by default (All tab)', () => {
    render(<UnifiedAuditDashboard report={makeReport()} />);
    const findingCards = screen.getAllByTestId('audit-finding-card');
    // 3 total findings across both phase results
    expect(findingCards.length).toBe(3);
  });

  it('filters findings when clicking Critical tab', () => {
    render(<UnifiedAuditDashboard report={makeReport()} />);
    const criticalTab = screen.getByTestId('tab-critical');
    fireEvent.click(criticalTab);

    const findingCards = screen.getAllByTestId('audit-finding-card');
    // Only 1 critical finding
    expect(findingCards.length).toBe(1);
    expect(screen.getByText('No EAV triples defined')).toBeDefined();
  });

  it('highlights active tab with orange styling', () => {
    render(<UnifiedAuditDashboard report={makeReport()} />);
    const allTab = screen.getByTestId('tab-all');
    expect(allTab.className).toContain('bg-orange-600');
    expect(allTab.className).toContain('text-white');

    const criticalTab = screen.getByTestId('tab-critical');
    expect(criticalTab.className).toContain('bg-gray-800');
    expect(criticalTab.className).toContain('text-gray-400');
  });

  it('switches active tab styling on click', () => {
    render(<UnifiedAuditDashboard report={makeReport()} />);
    const criticalTab = screen.getByTestId('tab-critical');
    fireEvent.click(criticalTab);

    expect(criticalTab.className).toContain('bg-orange-600');
    const allTab = screen.getByTestId('tab-all');
    expect(allTab.className).toContain('bg-gray-800');
  });

  it('shows prerequisite status badges', () => {
    render(<UnifiedAuditDashboard report={makeReport()} />);
    const badges = screen.getByTestId('prerequisite-badges');
    expect(badges).toBeDefined();

    // businessInfo and pillars are met (green), eavs is not (red)
    const businessBadge = screen.getByTestId('prerequisite-business-info');
    expect(businessBadge.className).toContain('text-green-400');

    const pillarsBadge = screen.getByTestId('prerequisite-pillars');
    expect(pillarsBadge.className).toContain('text-green-400');

    const eavsBadge = screen.getByTestId('prerequisite-eavs');
    expect(eavsBadge.className).toContain('text-red-400');
  });

  it('shows audit duration', () => {
    render(<UnifiedAuditDashboard report={makeReport({ auditDurationMs: 4523 })} />);
    expect(screen.getByTestId('audit-duration').textContent).toBe('4.5s');
  });

  it('shows duration in ms when under 1 second', () => {
    render(<UnifiedAuditDashboard report={makeReport({ auditDurationMs: 500 })} />);
    expect(screen.getByTestId('audit-duration').textContent).toBe('500ms');
  });

  it('renders quick stats correctly', () => {
    render(<UnifiedAuditDashboard report={makeReport()} />);
    expect(screen.getByTestId('total-findings').textContent).toBe('3');
    expect(screen.getByTestId('critical-count').textContent).toBe('1');
    expect(screen.getByTestId('high-count').textContent).toBe('1');
  });

  it('renders language', () => {
    render(<UnifiedAuditDashboard report={makeReport({ language: 'en' })} />);
    expect(screen.getByTestId('audit-language').textContent).toBe('en');
  });

  it('renders cannibalization risks section when present', () => {
    const risks: CannibalizationRisk[] = [
      {
        urls: ['/page-a', '/page-b'],
        sharedEntity: 'React Hooks',
        sharedKeywords: ['useState', 'useEffect'],
        severity: 'high',
        recommendation: 'Merge these pages or differentiate their focus.',
      },
    ];
    render(<UnifiedAuditDashboard report={makeReport({ cannibalizationRisks: risks })} />);
    expect(screen.getByTestId('cannibalization-section')).toBeDefined();
    expect(screen.getByText('Cannibalization Risks')).toBeDefined();
    expect(screen.getByText('React Hooks')).toBeDefined();
    expect(screen.getByText('Merge these pages or differentiate their focus.')).toBeDefined();
  });

  it('does not render cannibalization section when empty', () => {
    render(<UnifiedAuditDashboard report={makeReport({ cannibalizationRisks: [] })} />);
    expect(screen.queryByTestId('cannibalization-section')).toBeNull();
  });

  it('renders content merge suggestions section when present', () => {
    render(
      <UnifiedAuditDashboard
        report={makeReport({
          contentMergeSuggestions: [
            {
              sourceUrl: '/old-page',
              targetUrl: '/new-page',
              overlapPercentage: 72,
              reason: 'High content overlap detected.',
              suggestedAction: 'merge',
            },
          ],
        })}
      />
    );
    expect(screen.getByTestId('merge-suggestions-section')).toBeDefined();
    expect(screen.getByText('Content Merge Suggestions')).toBeDefined();
    expect(screen.getByText('High content overlap detected.')).toBeDefined();
  });

  it('does not render merge suggestions section when empty', () => {
    render(<UnifiedAuditDashboard report={makeReport({ contentMergeSuggestions: [] })} />);
    expect(screen.queryByTestId('merge-suggestions-section')).toBeNull();
  });

  it('shows "No findings" message when findings are empty', () => {
    const emptyReport = makeReport({
      phaseResults: [
        makePhaseResult({ phase: 'strategicFoundation', findings: [] }),
        makePhaseResult({ phase: 'eavSystem', findings: [] }),
      ],
    });
    render(<UnifiedAuditDashboard report={emptyReport} />);
    expect(screen.getByTestId('no-findings-message')).toBeDefined();
    expect(screen.getByTestId('no-findings-message').textContent).toBe(
      'No findings match the selected filter.'
    );
  });

  it('shows "No findings" message when filter has no matches', () => {
    // Report with only medium findings, then filter by critical
    const report = makeReport({
      phaseResults: [
        makePhaseResult({
          findings: [makeFinding({ id: 'f-1', severity: 'medium' })],
        }),
      ],
    });
    render(<UnifiedAuditDashboard report={report} />);
    fireEvent.click(screen.getByTestId('tab-critical'));
    expect(screen.getByTestId('no-findings-message')).toBeDefined();
  });

  it('renders audit metadata section', () => {
    render(<UnifiedAuditDashboard report={makeReport()} />);
    const metadata = screen.getByTestId('audit-metadata');
    expect(metadata).toBeDefined();
    expect(metadata.textContent).toContain('Version: 1');
    expect(metadata.textContent).toContain('report-1');
  });

  it('renders phase grid heading', () => {
    render(<UnifiedAuditDashboard report={makeReport()} />);
    expect(screen.getByTestId('phase-grid-heading').textContent).toBe('Phase Scores');
  });
});
