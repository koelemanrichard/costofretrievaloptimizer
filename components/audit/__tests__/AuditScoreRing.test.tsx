import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditScoreRing } from '../AuditScoreRing';

describe('AuditScoreRing', () => {
  it('renders the score text', () => {
    render(<AuditScoreRing score={72} />);
    expect(screen.getByTestId('audit-score-value').textContent).toBe('72');
  });

  it('renders an SVG element', () => {
    render(<AuditScoreRing score={50} />);
    expect(screen.getByTestId('audit-score-ring-svg')).toBeDefined();
    expect(screen.getByTestId('audit-score-ring-svg').tagName.toLowerCase()).toBe('svg');
  });

  it('uses green color for score 85', () => {
    render(<AuditScoreRing score={85} />);
    const scoreEl = screen.getByTestId('audit-score-value');
    expect(scoreEl.className).toContain('text-green-500');

    // Verify the progress circle stroke is green
    const svg = screen.getByTestId('audit-score-ring-svg');
    const circles = svg.querySelectorAll('circle');
    const progressCircle = circles[1];
    expect(progressCircle.getAttribute('stroke')).toBe('#22c55e');
  });

  it('uses red color for score 30', () => {
    render(<AuditScoreRing score={30} />);
    const scoreEl = screen.getByTestId('audit-score-value');
    expect(scoreEl.className).toContain('text-red-500');

    const svg = screen.getByTestId('audit-score-ring-svg');
    const circles = svg.querySelectorAll('circle');
    const progressCircle = circles[1];
    expect(progressCircle.getAttribute('stroke')).toBe('#ef4444');
  });

  it('shows positive delta when previousScore < score', () => {
    render(<AuditScoreRing score={80} previousScore={75} />);
    const delta = screen.getByTestId('audit-score-delta');
    expect(delta.textContent).toBe('+5');
    expect(delta.className).toContain('text-green-500');
  });

  it('shows negative delta when previousScore > score', () => {
    render(<AuditScoreRing score={60} previousScore={63} />);
    const delta = screen.getByTestId('audit-score-delta');
    expect(delta.textContent).toBe('-3');
    expect(delta.className).toContain('text-red-500');
  });

  it('does not show delta when previousScore is not provided', () => {
    render(<AuditScoreRing score={70} />);
    expect(screen.queryByTestId('audit-score-delta')).toBeNull();
  });

  it('applies custom size prop', () => {
    render(<AuditScoreRing score={50} size={200} />);
    const svg = screen.getByTestId('audit-score-ring-svg');
    expect(svg.getAttribute('width')).toBe('200');
    expect(svg.getAttribute('height')).toBe('200');
  });

  it('renders label when provided', () => {
    render(<AuditScoreRing score={50} label="Overall" />);
    expect(screen.getByTestId('audit-score-label').textContent).toBe('Overall');
  });

  it('does not render label when not provided', () => {
    render(<AuditScoreRing score={50} />);
    expect(screen.queryByTestId('audit-score-label')).toBeNull();
  });

  it('uses yellow color for score 65', () => {
    render(<AuditScoreRing score={65} />);
    const scoreEl = screen.getByTestId('audit-score-value');
    expect(scoreEl.className).toContain('text-yellow-500');
  });

  it('uses orange color for score 45', () => {
    render(<AuditScoreRing score={45} />);
    const scoreEl = screen.getByTestId('audit-score-value');
    expect(scoreEl.className).toContain('text-orange-500');
  });

  it('clamps score to 0-100 range', () => {
    const { rerender } = render(<AuditScoreRing score={150} />);
    expect(screen.getByTestId('audit-score-value').textContent).toBe('100');

    rerender(<AuditScoreRing score={-10} />);
    expect(screen.getByTestId('audit-score-value').textContent).toBe('0');
  });
});
