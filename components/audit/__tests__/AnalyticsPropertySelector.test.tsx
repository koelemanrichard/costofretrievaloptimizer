import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalyticsPropertySelector } from '../AnalyticsPropertySelector';
import type { AnalyticsProperty } from '../AnalyticsPropertySelector';

const mockProperties: AnalyticsProperty[] = [
  { id: 'gsc-1', siteUrl: 'https://example.com/', service: 'gsc', permissionLevel: 'siteOwner' },
  { id: 'gsc-2', siteUrl: 'sc-domain:example.com', service: 'gsc', permissionLevel: 'siteFullUser' },
  { id: 'ga4-1', siteUrl: 'properties/123456', service: 'ga4', displayName: 'Example.com - GA4' },
];

describe('AnalyticsPropertySelector', () => {
  it('renders GSC and GA4 properties', () => {
    render(
      <AnalyticsPropertySelector
        properties={mockProperties}
        selectedIds={[]}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onSetPrimary={vi.fn()}
      />
    );
    expect(screen.getByText('https://example.com/')).toBeDefined();
    expect(screen.getByText('Example.com - GA4')).toBeDefined();
  });

  it('calls onSelect when checkbox is clicked', () => {
    const onSelect = vi.fn();
    render(
      <AnalyticsPropertySelector
        properties={mockProperties}
        selectedIds={[]}
        onSelect={onSelect}
        onDeselect={vi.fn()}
        onSetPrimary={vi.fn()}
      />
    );
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(onSelect).toHaveBeenCalledWith('gsc-1');
  });

  it('shows Set Primary button for selected properties', () => {
    render(
      <AnalyticsPropertySelector
        properties={mockProperties}
        selectedIds={['gsc-1']}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onSetPrimary={vi.fn()}
      />
    );
    expect(screen.getByText('Set Primary')).toBeDefined();
  });

  it('shows loading state', () => {
    render(
      <AnalyticsPropertySelector
        properties={[]}
        selectedIds={[]}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onSetPrimary={vi.fn()}
        isLoading={true}
      />
    );
    expect(screen.getByText('Loading properties...')).toBeDefined();
  });

  it('shows empty state message', () => {
    render(
      <AnalyticsPropertySelector
        properties={[]}
        selectedIds={[]}
        onSelect={vi.fn()}
        onDeselect={vi.fn()}
        onSetPrimary={vi.fn()}
      />
    );
    expect(screen.getByText(/Connect a Google account first/)).toBeDefined();
  });
});
