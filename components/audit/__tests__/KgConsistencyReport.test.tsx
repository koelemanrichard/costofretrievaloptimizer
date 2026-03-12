import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KgConsistencyReport } from '../KgConsistencyReport';
import type { ConsistencyReport } from '../../../services/audit/rules/CrossPageEavConsistencyReporter';

function makeReport(overrides: Partial<ConsistencyReport> = {}): ConsistencyReport {
  return {
    contradictions: [],
    namingInconsistencies: [],
    unitInconsistencies: [],
    kbtRiskScore: 0,
    totalEavsAnalyzed: 10,
    ...overrides,
  };
}

describe('KgConsistencyReport', () => {
  it('renders the title and KBT risk score', () => {
    render(<KgConsistencyReport report={makeReport({ kbtRiskScore: 42 })} />);

    expect(screen.getByText('Knowledge Graph Consistency')).toBeDefined();
    expect(screen.getByText('42')).toBeDefined();
    expect(screen.getByText('KBT Risk')).toBeDefined();
  });

  it('shows green "no issues" message when report is clean', () => {
    render(<KgConsistencyReport report={makeReport()} />);

    expect(screen.getByTestId('no-issues')).toBeDefined();
    expect(
      screen.getByText(/No issues found/)
    ).toBeDefined();
  });

  it('does not show "no issues" when there are contradictions', () => {
    const report = makeReport({
      contradictions: [
        {
          entity: 'React',
          attribute: 'year',
          values: [
            { page: '/a', value: '2013' },
            { page: '/b', value: '2014' },
          ],
        },
      ],
      kbtRiskScore: 50,
    });

    render(<KgConsistencyReport report={report} />);
    expect(screen.queryByTestId('no-issues')).toBeNull();
  });

  it('renders contradictions section with count badge', () => {
    const report = makeReport({
      contradictions: [
        {
          entity: 'React',
          attribute: 'release year',
          values: [
            { page: '/about', value: '2013' },
            { page: '/history', value: '2014' },
          ],
        },
      ],
      kbtRiskScore: 50,
    });

    render(<KgConsistencyReport report={report} />);

    const section = screen.getByTestId('contradictions-section');
    expect(section).toBeDefined();
    expect(screen.getByTestId('contradictions-section-count').textContent).toBe('1');
  });

  it('expands contradictions section to show details on click', () => {
    const report = makeReport({
      contradictions: [
        {
          entity: 'React',
          attribute: 'release year',
          values: [
            { page: '/about', value: '2013' },
            { page: '/history', value: '2014' },
          ],
        },
      ],
      kbtRiskScore: 50,
    });

    render(<KgConsistencyReport report={report} />);

    // Initially collapsed — table not visible
    expect(screen.queryByText('2013')).toBeNull();

    // Click to expand
    fireEvent.click(screen.getByText('Contradictions'));

    // Now values are visible
    expect(screen.getByText('2013')).toBeDefined();
    expect(screen.getByText('2014')).toBeDefined();
    expect(screen.getByText('/about')).toBeDefined();
  });

  it('renders naming inconsistencies section', () => {
    const report = makeReport({
      namingInconsistencies: [
        {
          variants: ['Next.js', 'Next-js'],
          pages: ['/a', '/b'],
          suggestion: 'Standardize to "Next.js"',
        },
      ],
      kbtRiskScore: 25,
    });

    render(<KgConsistencyReport report={report} />);

    expect(screen.getByTestId('naming-section')).toBeDefined();
    expect(screen.getByTestId('naming-section-count').textContent).toBe('1');

    // Expand section
    fireEvent.click(screen.getByText('Naming Inconsistencies'));

    expect(screen.getByText('Next.js')).toBeDefined();
    expect(screen.getByText('Next-js')).toBeDefined();
    expect(screen.getByText('Standardize to "Next.js"')).toBeDefined();
  });

  it('renders unit inconsistencies section', () => {
    const report = makeReport({
      unitInconsistencies: [
        {
          entity: 'Model X',
          attribute: 'weight',
          variants: [
            { page: '/specs', value: '2300 kg' },
            { page: '/compare', value: '5070 lbs' },
          ],
        },
      ],
      kbtRiskScore: 33,
    });

    render(<KgConsistencyReport report={report} />);

    expect(screen.getByTestId('units-section')).toBeDefined();

    // Expand
    fireEvent.click(screen.getByText('Unit Inconsistencies'));
    expect(screen.getByText('2300 kg')).toBeDefined();
    expect(screen.getByText('5070 lbs')).toBeDefined();
  });

  it('applies green color for low KBT score (<20)', () => {
    render(<KgConsistencyReport report={makeReport({ kbtRiskScore: 10 })} />);
    const scoreEl = screen.getByTestId('kbt-risk-score');
    expect(scoreEl.className).toContain('green');
  });

  it('applies yellow color for medium KBT score (20-50)', () => {
    render(<KgConsistencyReport report={makeReport({ kbtRiskScore: 35 })} />);
    const scoreEl = screen.getByTestId('kbt-risk-score');
    expect(scoreEl.className).toContain('yellow');
  });

  it('applies red color for high KBT score (>50)', () => {
    render(<KgConsistencyReport report={makeReport({ kbtRiskScore: 75 })} />);
    const scoreEl = screen.getByTestId('kbt-risk-score');
    expect(scoreEl.className).toContain('red');
  });

  it('displays total EAVs analyzed', () => {
    render(<KgConsistencyReport report={makeReport({ totalEavsAnalyzed: 42 })} />);
    expect(screen.getByText(/42 EAV triples/)).toBeDefined();
  });
});
