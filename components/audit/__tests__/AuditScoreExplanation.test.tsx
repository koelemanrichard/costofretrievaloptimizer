import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditScoreExplanation } from '../AuditScoreExplanation';

describe('AuditScoreExplanation', () => {
  // ── Badge label and color per score range ──────────────────────────

  it('shows "Exceptional" green badge for score 95', () => {
    render(<AuditScoreExplanation score={95} />);
    const badge = screen.getByTestId('score-badge');
    expect(badge.textContent).toBe('Exceptional');
    expect(badge.className).toContain('bg-green-600');
  });

  it('shows "Exceptional" green badge for score 90 (boundary)', () => {
    render(<AuditScoreExplanation score={90} />);
    const badge = screen.getByTestId('score-badge');
    expect(badge.textContent).toBe('Exceptional');
    expect(badge.className).toContain('bg-green-600');
  });

  it('shows "Strong" green badge for score 85', () => {
    render(<AuditScoreExplanation score={85} />);
    const badge = screen.getByTestId('score-badge');
    expect(badge.textContent).toBe('Strong');
    expect(badge.className).toContain('bg-green-600');
  });

  it('shows "Strong" green badge for score 80 (boundary)', () => {
    render(<AuditScoreExplanation score={80} />);
    const badge = screen.getByTestId('score-badge');
    expect(badge.textContent).toBe('Strong');
    expect(badge.className).toContain('bg-green-600');
  });

  it('shows "Good" blue badge for score 75', () => {
    render(<AuditScoreExplanation score={75} />);
    const badge = screen.getByTestId('score-badge');
    expect(badge.textContent).toBe('Good');
    expect(badge.className).toContain('bg-blue-600');
  });

  it('shows "Good" blue badge for score 70 (boundary)', () => {
    render(<AuditScoreExplanation score={70} />);
    const badge = screen.getByTestId('score-badge');
    expect(badge.textContent).toBe('Good');
    expect(badge.className).toContain('bg-blue-600');
  });

  it('shows "Fair" yellow badge for score 65', () => {
    render(<AuditScoreExplanation score={65} />);
    const badge = screen.getByTestId('score-badge');
    expect(badge.textContent).toBe('Fair');
    expect(badge.className).toContain('bg-yellow-600');
  });

  it('shows "Fair" yellow badge for score 60 (boundary)', () => {
    render(<AuditScoreExplanation score={60} />);
    const badge = screen.getByTestId('score-badge');
    expect(badge.textContent).toBe('Fair');
    expect(badge.className).toContain('bg-yellow-600');
  });

  it('shows "Needs Work" orange badge for score 50', () => {
    render(<AuditScoreExplanation score={50} />);
    const badge = screen.getByTestId('score-badge');
    expect(badge.textContent).toBe('Needs Work');
    expect(badge.className).toContain('bg-orange-600');
  });

  it('shows "Needs Work" orange badge for score 40 (boundary)', () => {
    render(<AuditScoreExplanation score={40} />);
    const badge = screen.getByTestId('score-badge');
    expect(badge.textContent).toBe('Needs Work');
    expect(badge.className).toContain('bg-orange-600');
  });

  it('shows "Major Issues" red badge for score 30', () => {
    render(<AuditScoreExplanation score={30} />);
    const badge = screen.getByTestId('score-badge');
    expect(badge.textContent).toBe('Major Issues');
    expect(badge.className).toContain('bg-red-600');
  });

  it('shows "Major Issues" red badge for score 0', () => {
    render(<AuditScoreExplanation score={0} />);
    const badge = screen.getByTestId('score-badge');
    expect(badge.textContent).toBe('Major Issues');
    expect(badge.className).toContain('bg-red-600');
  });

  // ── Contextual messages ────────────────────────────────────────────

  it('shows "exceeds professional standards" for exceptional scores', () => {
    render(<AuditScoreExplanation score={95} />);
    expect(screen.getByTestId('score-message').textContent).toBe(
      'This content exceeds professional standards.'
    );
  });

  it('shows "meets high-quality standards" for strong scores', () => {
    render(<AuditScoreExplanation score={85} />);
    expect(screen.getByTestId('score-message').textContent).toContain(
      'meets high-quality standards'
    );
  });

  it('shows "well-optimized" for good scores', () => {
    render(<AuditScoreExplanation score={72} />);
    expect(screen.getByTestId('score-message').textContent).toContain('well-optimized');
  });

  it('shows "improvements needed" for fair scores', () => {
    render(<AuditScoreExplanation score={63} />);
    expect(screen.getByTestId('score-message').textContent).toContain('improvements needed');
  });

  it('shows "areas need attention" for needs-work scores', () => {
    render(<AuditScoreExplanation score={45} />);
    expect(screen.getByTestId('score-message').textContent).toContain('areas need attention');
  });

  it('shows "Significant optimization needed" for major-issues scores', () => {
    render(<AuditScoreExplanation score={20} />);
    expect(screen.getByTestId('score-message').textContent).toContain(
      'Significant optimization needed'
    );
  });

  // ── Scoring philosophy text ────────────────────────────────────────

  it('shows the penalty-based scoring philosophy explanation', () => {
    render(<AuditScoreExplanation score={75} />);
    const philosophy = screen.getByTestId('scoring-philosophy');
    expect(philosophy.textContent).toContain('penalty-based scoring model');
    expect(philosophy.textContent).toContain('70+');
    expect(philosophy.textContent).toContain('critical and high-severity findings');
  });

  // ── Collapsible section toggle ─────────────────────────────────────

  it('renders the "How is this calculated?" toggle button', () => {
    render(<AuditScoreExplanation score={75} />);
    expect(screen.getByTestId('calculation-toggle')).toBeDefined();
    expect(screen.getByText('How is this calculated?')).toBeDefined();
  });

  it('calculation details are hidden by default', () => {
    render(<AuditScoreExplanation score={75} />);
    expect(screen.queryByTestId('calculation-details')).toBeNull();
  });

  it('shows calculation details when toggle is clicked', () => {
    render(<AuditScoreExplanation score={75} />);
    fireEvent.click(screen.getByTestId('calculation-toggle'));
    expect(screen.getByTestId('calculation-details')).toBeDefined();
  });

  it('hides calculation details when toggle is clicked twice', () => {
    render(<AuditScoreExplanation score={75} />);
    const toggle = screen.getByTestId('calculation-toggle');
    fireEvent.click(toggle);
    expect(screen.getByTestId('calculation-details')).toBeDefined();
    fireEvent.click(toggle);
    expect(screen.queryByTestId('calculation-details')).toBeNull();
  });

  it('sets aria-expanded correctly on the toggle button', () => {
    render(<AuditScoreExplanation score={75} />);
    const toggle = screen.getByTestId('calculation-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  // ── Penalty system explanation ─────────────────────────────────────

  it('shows penalty values in the calculation details', () => {
    render(<AuditScoreExplanation score={75} />);
    fireEvent.click(screen.getByTestId('calculation-toggle'));
    const penaltyTable = screen.getByTestId('penalty-table');
    expect(penaltyTable.textContent).toContain('Critical: -15 points');
    expect(penaltyTable.textContent).toContain('High: -8 points');
    expect(penaltyTable.textContent).toContain('Medium: -4 points');
    expect(penaltyTable.textContent).toContain('Low: -1 point');
  });

  it('shows the top 3 phase weights', () => {
    render(<AuditScoreExplanation score={75} />);
    fireEvent.click(screen.getByTestId('calculation-toggle'));
    const topWeights = screen.getByTestId('top-weights');
    // The top 3 weights by DEFAULT_AUDIT_WEIGHTS are:
    // contextualFlow: 15, eavSystem: 15, microSemantics: 13
    expect(topWeights.textContent).toContain('15%');
    expect(topWeights.textContent).toContain('13%');
    // Should only show 3 entries
    const entries = topWeights.querySelectorAll('[class*="flex items-center justify-between"]');
    expect(entries.length).toBe(3);
  });

  // ── Edge cases ─────────────────────────────────────────────────────

  it('clamps score above 100 to "Exceptional"', () => {
    render(<AuditScoreExplanation score={150} />);
    expect(screen.getByTestId('score-badge').textContent).toBe('Exceptional');
  });

  it('clamps negative score to "Major Issues"', () => {
    render(<AuditScoreExplanation score={-10} />);
    expect(screen.getByTestId('score-badge').textContent).toBe('Major Issues');
  });

  it('shows score 89 as "Strong" (upper boundary of 80-89 range)', () => {
    render(<AuditScoreExplanation score={89} />);
    expect(screen.getByTestId('score-badge').textContent).toBe('Strong');
  });

  it('shows score 69 as "Fair" (upper boundary of 60-69 range)', () => {
    render(<AuditScoreExplanation score={69} />);
    expect(screen.getByTestId('score-badge').textContent).toBe('Fair');
  });

  it('shows score 39 as "Major Issues" (upper boundary of 0-39 range)', () => {
    render(<AuditScoreExplanation score={39} />);
    expect(screen.getByTestId('score-badge').textContent).toBe('Major Issues');
  });
});
