import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditFindingCard } from '../AuditFindingCard';
import type { AuditFinding } from '../../../services/audit/types';

function makeFinding(overrides: Partial<AuditFinding> = {}): AuditFinding {
  return {
    id: 'f-1',
    phase: 'microSemantics',
    ruleId: 'MS-001',
    severity: 'high',
    title: 'Missing modality markers in opening paragraph',
    description: 'The first paragraph lacks epistemic modality cues.',
    whyItMatters: 'Modality markers help search engines gauge content confidence.',
    autoFixAvailable: false,
    estimatedImpact: 'medium',
    category: 'linguistics',
    ...overrides,
  };
}

describe('AuditFindingCard', () => {
  it('renders finding title', () => {
    render(<AuditFindingCard finding={makeFinding()} />);
    expect(screen.getByText('Missing modality markers in opening paragraph')).toBeDefined();
  });

  it('renders severity icon with correct color class for high severity', () => {
    render(<AuditFindingCard finding={makeFinding({ severity: 'high' })} />);
    const icon = screen.getByTestId('severity-icon');
    expect(icon.className).toContain('text-orange-500');
  });

  it('renders severity icon with correct color class for critical severity', () => {
    render(<AuditFindingCard finding={makeFinding({ severity: 'critical' })} />);
    const icon = screen.getByTestId('severity-icon');
    expect(icon.className).toContain('text-red-500');
  });

  it('renders severity icon with correct color class for medium severity', () => {
    render(<AuditFindingCard finding={makeFinding({ severity: 'medium' })} />);
    const icon = screen.getByTestId('severity-icon');
    expect(icon.className).toContain('text-yellow-500');
  });

  it('renders severity icon with correct color class for low severity', () => {
    render(<AuditFindingCard finding={makeFinding({ severity: 'low' })} />);
    const icon = screen.getByTestId('severity-icon');
    expect(icon.className).toContain('text-gray-400');
  });

  it('renders phase badge', () => {
    render(<AuditFindingCard finding={makeFinding({ phase: 'contextualFlow' })} />);
    expect(screen.getByText('Contextual Flow')).toBeDefined();
  });

  it('shows expanded content when isExpanded=true', () => {
    render(<AuditFindingCard finding={makeFinding()} isExpanded={true} />);
    expect(screen.getByText('The first paragraph lacks epistemic modality cues.')).toBeDefined();
    expect(screen.getByText('Why It Matters')).toBeDefined();
    expect(screen.getByText(/Rule: MS-001/)).toBeDefined();
  });

  it('hides expanded content when isExpanded=false', () => {
    render(<AuditFindingCard finding={makeFinding()} isExpanded={false} />);
    expect(screen.queryByText('The first paragraph lacks epistemic modality cues.')).toBeNull();
    expect(screen.queryByText('Why It Matters')).toBeNull();
  });

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<AuditFindingCard finding={makeFinding()} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('shows "Why It Matters" text when expanded', () => {
    render(<AuditFindingCard finding={makeFinding()} isExpanded={true} />);
    expect(
      screen.getByText('Modality markers help search engines gauge content confidence.')
    ).toBeDefined();
  });

  it('shows auto-fix button when autoFixAvailable is true', () => {
    render(
      <AuditFindingCard
        finding={makeFinding({ autoFixAvailable: true, autoFixAction: vi.fn() })}
        isExpanded={true}
      />
    );
    expect(screen.getByText('Auto-Fix')).toBeDefined();
  });

  it('hides auto-fix button when autoFixAvailable is false', () => {
    render(
      <AuditFindingCard
        finding={makeFinding({ autoFixAvailable: false })}
        isExpanded={true}
      />
    );
    expect(screen.queryByText('Auto-Fix')).toBeNull();
  });

  it('renders current and expected values when provided', () => {
    render(
      <AuditFindingCard
        finding={makeFinding({ currentValue: '35%', expectedValue: '70%' })}
        isExpanded={true}
      />
    );
    expect(screen.getByText('35%')).toBeDefined();
    expect(screen.getByText('70%')).toBeDefined();
    expect(screen.getByText('Current')).toBeDefined();
    expect(screen.getByText('Expected')).toBeDefined();
  });

  it('renders example fix block when provided', () => {
    render(
      <AuditFindingCard
        finding={makeFinding({ exampleFix: 'Add "typically" before the claim.' })}
        isExpanded={true}
      />
    );
    expect(screen.getByText('Add "typically" before the claim.')).toBeDefined();
  });
});
