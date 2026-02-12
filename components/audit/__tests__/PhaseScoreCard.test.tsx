import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhaseScoreCard } from '../PhaseScoreCard';
import type { AuditPhaseResult, AuditFinding } from '../../../services/audit/types';

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

function makeResult(overrides: Partial<AuditPhaseResult> = {}): AuditPhaseResult {
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

describe('PhaseScoreCard', () => {
  it('renders phase display name', () => {
    render(<PhaseScoreCard result={makeResult()} />);
    expect(screen.getByText('Strategic Foundation')).toBeDefined();
  });

  it('renders score number', () => {
    render(<PhaseScoreCard result={makeResult({ score: 72 })} />);
    expect(screen.getByTestId('score-value').textContent).toBe('72');
  });

  it('renders passed/total checks text', () => {
    render(<PhaseScoreCard result={makeResult({ passedChecks: 7, totalChecks: 10 })} />);
    expect(screen.getByTestId('checks-passed').textContent).toBe('7/10 checks passed');
  });

  it('renders green progress bar when score >= 80', () => {
    render(<PhaseScoreCard result={makeResult({ score: 85 })} />);
    const fill = screen.getByTestId('progress-bar-fill');
    expect(fill.className).toContain('bg-green-500');
    expect(fill.style.width).toBe('85%');
  });

  it('renders yellow progress bar when score >= 60 and < 80', () => {
    render(<PhaseScoreCard result={makeResult({ score: 65 })} />);
    const fill = screen.getByTestId('progress-bar-fill');
    expect(fill.className).toContain('bg-yellow-500');
  });

  it('renders orange progress bar when score >= 40 and < 60', () => {
    render(<PhaseScoreCard result={makeResult({ score: 45 })} />);
    const fill = screen.getByTestId('progress-bar-fill');
    expect(fill.className).toContain('bg-orange-500');
  });

  it('renders red progress bar when score < 40', () => {
    render(<PhaseScoreCard result={makeResult({ score: 25 })} />);
    const fill = screen.getByTestId('progress-bar-fill');
    expect(fill.className).toContain('bg-red-500');
    expect(fill.style.width).toBe('25%');
  });

  it('shows weight badge when weight > 0', () => {
    render(<PhaseScoreCard result={makeResult({ weight: 10 })} />);
    expect(screen.getByTestId('weight-badge').textContent).toBe('Weight: 10%');
  });

  it('hides weight badge when weight is 0', () => {
    render(<PhaseScoreCard result={makeResult({ weight: 0 })} />);
    expect(screen.queryByTestId('weight-badge')).toBeNull();
  });

  it('shows expanded content when isExpanded=true', () => {
    render(<PhaseScoreCard result={makeResult()} isExpanded={true} />);
    expect(screen.getByTestId('expanded-content')).toBeDefined();
    expect(screen.getByText('Good foundation with minor gaps.')).toBeDefined();
    expect(screen.getByTestId('severity-counts')).toBeDefined();
    expect(screen.getByTestId('finding-titles')).toBeDefined();
    expect(screen.getByText('Missing business description')).toBeDefined();
  });

  it('hides expanded content when isExpanded=false', () => {
    render(<PhaseScoreCard result={makeResult()} isExpanded={false} />);
    expect(screen.queryByTestId('expanded-content')).toBeNull();
  });

  it('hides expanded content by default (isExpanded not provided)', () => {
    render(<PhaseScoreCard result={makeResult()} />);
    expect(screen.queryByTestId('expanded-content')).toBeNull();
  });

  it('calls onToggle on click', () => {
    const onToggle = vi.fn();
    render(<PhaseScoreCard result={makeResult()} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders severity counts in expanded state with multiple severities', () => {
    const findings: AuditFinding[] = [
      makeFinding({ id: 'f-1', severity: 'critical', title: 'Critical issue' }),
      makeFinding({ id: 'f-2', severity: 'critical', title: 'Another critical' }),
      makeFinding({ id: 'f-3', severity: 'low', title: 'Minor issue' }),
    ];
    render(
      <PhaseScoreCard result={makeResult({ findings })} isExpanded={true} />
    );
    expect(screen.getByText('2 critical')).toBeDefined();
    expect(screen.getByText('1 low')).toBeDefined();
  });

  it('renders all finding titles in expanded state', () => {
    const findings: AuditFinding[] = [
      makeFinding({ id: 'f-1', title: 'First issue' }),
      makeFinding({ id: 'f-2', title: 'Second issue' }),
    ];
    render(
      <PhaseScoreCard result={makeResult({ findings })} isExpanded={true} />
    );
    expect(screen.getByText('First issue')).toBeDefined();
    expect(screen.getByText('Second issue')).toBeDefined();
  });

  it('renders fallback phase name for unknown phases', () => {
    render(
      <PhaseScoreCard result={makeResult({ phase: 'unknownPhase' as any })} />
    );
    // Falls back to the raw phase string
    expect(screen.getByText('unknownPhase')).toBeDefined();
  });

  it('clamps progress bar width to 0-100%', () => {
    render(<PhaseScoreCard result={makeResult({ score: 150 })} />);
    expect(screen.getByTestId('progress-bar-fill').style.width).toBe('100%');
  });
});
