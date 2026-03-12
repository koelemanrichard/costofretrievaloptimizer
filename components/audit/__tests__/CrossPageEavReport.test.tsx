import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CrossPageEavReport } from '../CrossPageEavReport';
import type { CrossPageEavIssue } from '../../../services/audit/rules/CrossPageEavAuditor';

function makeIssue(overrides: Partial<CrossPageEavIssue> = {}): CrossPageEavIssue {
  return {
    ruleId: 'rule-48',
    severity: 'critical',
    title: 'Cross-page EAV value contradiction',
    description: '"React" has conflicting values for "release year"',
    affectedPages: ['/about', '/history'],
    affectedEntity: 'react',
    affectedAttribute: 'release year',
    conflictingValues: ['2013', '2014'],
    exampleFix: 'Standardize the value for "release year" across all pages.',
    ...overrides,
  };
}

describe('CrossPageEavReport', () => {
  it('renders issue count', () => {
    const issues = [makeIssue(), makeIssue({ affectedAttribute: 'creator' })];
    render(<CrossPageEavReport issues={issues} />);

    expect(screen.getByTestId('issue-count').textContent).toBe('2 issues');
  });

  it('renders singular "issue" for count of 1', () => {
    render(<CrossPageEavReport issues={[makeIssue()]} />);

    expect(screen.getByTestId('issue-count').textContent).toBe('1 issue');
  });

  it('displays entity and attribute names', () => {
    render(<CrossPageEavReport issues={[makeIssue()]} />);

    expect(screen.getByTestId('entity-name').textContent).toBe('react');
    expect(screen.getByTestId('attribute-name').textContent).toBe('release year');
  });

  it('shows conflicting values after expanding', () => {
    render(<CrossPageEavReport issues={[makeIssue()]} />);

    // Click to expand
    fireEvent.click(screen.getByTestId('issue-toggle'));

    const values = screen.getAllByTestId('conflicting-value');
    expect(values).toHaveLength(2);
    expect(values[0].textContent).toBe('2013');
    expect(values[1].textContent).toBe('2014');
  });

  it('shows affected page URLs after expanding', () => {
    render(<CrossPageEavReport issues={[makeIssue()]} />);

    fireEvent.click(screen.getByTestId('issue-toggle'));

    const pages = screen.getAllByTestId('affected-page');
    expect(pages).toHaveLength(2);
    expect(pages[0].textContent).toBe('/about');
    expect(pages[1].textContent).toBe('/history');
  });

  it('shows severity badge with correct text', () => {
    render(<CrossPageEavReport issues={[makeIssue({ severity: 'critical' })]} />);

    const badge = screen.getByTestId('severity-badge');
    expect(badge.textContent).toBe('critical');
    expect(badge.className).toContain('red');
  });

  it('shows example fix suggestion after expanding', () => {
    render(<CrossPageEavReport issues={[makeIssue()]} />);

    fireEvent.click(screen.getByTestId('issue-toggle'));

    const fix = screen.getByTestId('example-fix');
    expect(fix.textContent).toContain('Standardize');
  });

  it('renders "no issues" message when issues array is empty', () => {
    render(<CrossPageEavReport issues={[]} />);

    expect(screen.getByTestId('no-issues')).toBeDefined();
    expect(screen.getByText('No cross-page EAV issues found.')).toBeDefined();
  });

  it('groups issues by entity', () => {
    const issues = [
      makeIssue({ affectedEntity: 'react', affectedAttribute: 'year' }),
      makeIssue({ affectedEntity: 'react', affectedAttribute: 'creator' }),
      makeIssue({ affectedEntity: 'vue', affectedAttribute: 'year' }),
    ];

    render(<CrossPageEavReport issues={issues} />);

    const entityGroups = screen.getAllByTestId('entity-group');
    expect(entityGroups).toHaveLength(2);

    const entityNames = screen.getAllByTestId('entity-name');
    expect(entityNames[0].textContent).toBe('react');
    expect(entityNames[1].textContent).toBe('vue');
  });

  it('renders different severity colors', () => {
    const issues = [
      makeIssue({ severity: 'high', affectedAttribute: 'a' }),
      makeIssue({ severity: 'medium', affectedAttribute: 'b' }),
      makeIssue({ severity: 'low', affectedAttribute: 'c' }),
    ];

    render(<CrossPageEavReport issues={issues} />);

    const badges = screen.getAllByTestId('severity-badge');
    expect(badges[0].className).toContain('orange');
    expect(badges[1].className).toContain('yellow');
    expect(badges[2].className).toContain('blue');
  });
});
