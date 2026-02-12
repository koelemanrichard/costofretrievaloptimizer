import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditPrerequisiteGate } from '../AuditPrerequisiteGate';

const allMet = { businessInfo: true, pillars: true, eavs: true };

describe('AuditPrerequisiteGate', () => {
  it('returns null when all prerequisites are met', () => {
    const { container } = render(
      <AuditPrerequisiteGate prerequisites={allMet} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows modal when businessInfo is false', () => {
    render(
      <AuditPrerequisiteGate
        prerequisites={{ ...allMet, businessInfo: false }}
      />
    );
    expect(screen.getByTestId('prerequisite-gate-overlay')).toBeDefined();
    expect(screen.getByText('Setup Required')).toBeDefined();
  });

  it('shows modal when pillars is false', () => {
    render(
      <AuditPrerequisiteGate
        prerequisites={{ ...allMet, pillars: false }}
      />
    );
    expect(screen.getByTestId('prerequisite-gate-overlay')).toBeDefined();
    expect(screen.getByText('Setup Required')).toBeDefined();
  });

  it('shows modal when eavs is false', () => {
    render(
      <AuditPrerequisiteGate
        prerequisites={{ ...allMet, eavs: false }}
      />
    );
    expect(screen.getByTestId('prerequisite-gate-overlay')).toBeDefined();
    expect(screen.getByText('Setup Required')).toBeDefined();
  });

  it('shows green checks for met prerequisites', () => {
    render(
      <AuditPrerequisiteGate
        prerequisites={{ businessInfo: true, pillars: true, eavs: false }}
      />
    );
    // businessInfo and pillars are met => green check icons
    expect(screen.getByTestId('check-icon-businessInfo')).toBeDefined();
    expect(screen.getByTestId('check-icon-pillars')).toBeDefined();
    // eavs is not met => no green check, but red X
    expect(screen.queryByTestId('check-icon-eavs')).toBeNull();
  });

  it('shows red marks for unmet prerequisites', () => {
    render(
      <AuditPrerequisiteGate
        prerequisites={{ businessInfo: false, pillars: false, eavs: false }}
      />
    );
    expect(screen.getByTestId('x-icon-businessInfo')).toBeDefined();
    expect(screen.getByTestId('x-icon-pillars')).toBeDefined();
    expect(screen.getByTestId('x-icon-eavs')).toBeDefined();
  });

  it('"Set Up" buttons call onNavigateToSetup with correct step', () => {
    const onNavigateToSetup = vi.fn();
    render(
      <AuditPrerequisiteGate
        prerequisites={{ businessInfo: false, pillars: false, eavs: false }}
        onNavigateToSetup={onNavigateToSetup}
      />
    );

    fireEvent.click(screen.getByTestId('setup-btn-businessInfo'));
    expect(onNavigateToSetup).toHaveBeenCalledWith('businessInfo');

    fireEvent.click(screen.getByTestId('setup-btn-pillars'));
    expect(onNavigateToSetup).toHaveBeenCalledWith('pillars');

    fireEvent.click(screen.getByTestId('setup-btn-eavs'));
    expect(onNavigateToSetup).toHaveBeenCalledWith('eavs');

    expect(onNavigateToSetup).toHaveBeenCalledTimes(3);
  });

  it('does not show "Set Up" buttons for met prerequisites', () => {
    render(
      <AuditPrerequisiteGate
        prerequisites={{ businessInfo: true, pillars: false, eavs: true }}
      />
    );
    expect(screen.queryByTestId('setup-btn-businessInfo')).toBeNull();
    expect(screen.getByTestId('setup-btn-pillars')).toBeDefined();
    expect(screen.queryByTestId('setup-btn-eavs')).toBeNull();
  });

  it('"Proceed Anyway" is shown only when isExternalUrl is true', () => {
    const { rerender } = render(
      <AuditPrerequisiteGate
        prerequisites={{ businessInfo: false, pillars: false, eavs: false }}
        isExternalUrl={false}
      />
    );
    expect(screen.queryByTestId('proceed-anyway-btn')).toBeNull();

    rerender(
      <AuditPrerequisiteGate
        prerequisites={{ businessInfo: false, pillars: false, eavs: false }}
        isExternalUrl={true}
      />
    );
    expect(screen.getByTestId('proceed-anyway-btn')).toBeDefined();
    expect(
      screen.getByText(
        'External URLs can be audited without project setup, but results will be less specific.'
      )
    ).toBeDefined();
  });

  it('"Proceed Anyway" calls onProceedAnyway', () => {
    const onProceedAnyway = vi.fn();
    render(
      <AuditPrerequisiteGate
        prerequisites={{ businessInfo: false, pillars: false, eavs: false }}
        isExternalUrl={true}
        onProceedAnyway={onProceedAnyway}
      />
    );
    fireEvent.click(screen.getByTestId('proceed-anyway-btn'));
    expect(onProceedAnyway).toHaveBeenCalledOnce();
  });

  it('renders description text', () => {
    render(
      <AuditPrerequisiteGate
        prerequisites={{ businessInfo: false, pillars: true, eavs: true }}
      />
    );
    expect(
      screen.getByText(
        'Complete the following steps to get the most accurate audit results.'
      )
    ).toBeDefined();
  });

  it('renders all three checklist labels', () => {
    render(
      <AuditPrerequisiteGate
        prerequisites={{ businessInfo: false, pillars: false, eavs: false }}
      />
    );
    expect(screen.getByText('Business Information')).toBeDefined();
    expect(screen.getByText('SEO Pillars')).toBeDefined();
    expect(screen.getByText('EAV Triples (Semantic Triples)')).toBeDefined();
  });
});
