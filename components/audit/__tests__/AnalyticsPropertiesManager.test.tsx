import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalyticsPropertiesManager } from '../AnalyticsPropertiesManager';
import type { LinkedProperty } from '../AnalyticsPropertiesManager';

const mockLinked: LinkedProperty[] = [
  { id: 'lp-1', service: 'gsc', propertyId: 'https://example.com/', propertyName: 'example.com', isPrimary: true, syncEnabled: true, syncFrequency: 'daily', lastSyncedAt: '2026-02-10T00:00:00Z' },
  { id: 'lp-2', service: 'ga4', propertyId: '123456', propertyName: 'Example GA4', isPrimary: false, syncEnabled: false, syncFrequency: 'weekly' },
];

const defaultProps = {
  linkedProperties: mockLinked,
  availableGscProperties: [{ id: 'gsc-new', service: 'gsc' as const, displayName: 'New Site' }],
  availableGa4Properties: [{ id: 'ga4-new', service: 'ga4' as const, displayName: 'New GA4' }],
  onLink: vi.fn(),
  onUnlink: vi.fn(),
  onSetPrimary: vi.fn(),
  onToggleSync: vi.fn(),
  onChangeSyncFrequency: vi.fn(),
};

describe('AnalyticsPropertiesManager', () => {
  it('renders linked GSC and GA4 properties', () => {
    render(<AnalyticsPropertiesManager {...defaultProps} />);
    expect(screen.getByText('example.com')).toBeDefined();
    expect(screen.getByText('Example GA4')).toBeDefined();
  });

  it('shows Primary badge on primary property', () => {
    render(<AnalyticsPropertiesManager {...defaultProps} />);
    expect(screen.getByText('Primary')).toBeDefined();
  });

  it('calls onUnlink when Unlink button clicked', () => {
    render(<AnalyticsPropertiesManager {...defaultProps} />);
    const unlinkButtons = screen.getAllByText('Unlink');
    fireEvent.click(unlinkButtons[0]);
    expect(defaultProps.onUnlink).toHaveBeenCalledWith('lp-1');
  });

  it('calls onSetPrimary for non-primary properties', () => {
    render(<AnalyticsPropertiesManager {...defaultProps} />);
    const setPrimaryBtn = screen.getByText('Set Primary');
    fireEvent.click(setPrimaryBtn);
    expect(defaultProps.onSetPrimary).toHaveBeenCalledWith('lp-2');
  });

  it('shows empty state when no properties linked', () => {
    render(<AnalyticsPropertiesManager {...defaultProps} linkedProperties={[]} />);
    const emptyMessages = screen.getAllByText('No properties linked yet.');
    expect(emptyMessages.length).toBe(2); // One for GSC, one for GA4
  });
});
