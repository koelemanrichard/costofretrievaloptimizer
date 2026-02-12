import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalyticsSyncStatus } from '../AnalyticsSyncStatus';
import type { SyncableProperty } from '../AnalyticsSyncStatus';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago

const mockProperties: SyncableProperty[] = [
  {
    id: 'prop-gsc-1',
    service: 'gsc',
    propertyName: 'example.com',
    propertyId: 'sc-domain:example.com',
    syncEnabled: true,
    syncFrequency: 'daily',
    lastSyncedAt: recentDate,
    latestLog: {
      id: 'log-1',
      propertyId: 'prop-gsc-1',
      syncType: 'incremental',
      status: 'completed',
      rowsSynced: 4250,
      startedAt: recentDate,
      completedAt: recentDate,
    },
  },
  {
    id: 'prop-ga4-1',
    service: 'ga4',
    propertyName: 'My GA4 Property',
    propertyId: 'properties/123456',
    syncEnabled: true,
    syncFrequency: 'weekly',
    lastSyncedAt: recentDate,
    latestLog: {
      id: 'log-2',
      propertyId: 'prop-ga4-1',
      syncType: 'full',
      status: 'failed',
      rowsSynced: 0,
      errorMessage: 'Rate limit exceeded. Please retry later.',
      startedAt: recentDate,
    },
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnalyticsSyncStatus', () => {
  it('renders empty state when no properties are provided', () => {
    render(
      <AnalyticsSyncStatus
        properties={[]}
        onSyncNow={vi.fn()}
        onChangeSyncFrequency={vi.fn()}
        onToggleSync={vi.fn()}
      />,
    );

    expect(screen.getByText('No properties linked')).toBeDefined();
  });

  it('renders property list with service badges', () => {
    render(
      <AnalyticsSyncStatus
        properties={mockProperties}
        onSyncNow={vi.fn()}
        onChangeSyncFrequency={vi.fn()}
        onToggleSync={vi.fn()}
      />,
    );

    // Service badges
    expect(screen.getByText('GSC')).toBeDefined();
    expect(screen.getByText('GA4')).toBeDefined();

    // Property names
    expect(screen.getByText('example.com')).toBeDefined();
    expect(screen.getByText('My GA4 Property')).toBeDefined();
  });

  it('shows last sync time in relative format', () => {
    render(
      <AnalyticsSyncStatus
        properties={mockProperties}
        onSyncNow={vi.fn()}
        onChangeSyncFrequency={vi.fn()}
        onToggleSync={vi.fn()}
      />,
    );

    // Both properties were synced 2 hours ago
    const lastSyncElements = screen.getAllByText(/Last sync:/);
    expect(lastSyncElements.length).toBe(2);
    // The relative time should contain "2h ago"
    expect(lastSyncElements[0].textContent).toContain('2h ago');
  });

  it('shows error message for failed syncs', () => {
    render(
      <AnalyticsSyncStatus
        properties={mockProperties}
        onSyncNow={vi.fn()}
        onChangeSyncFrequency={vi.fn()}
        onToggleSync={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Rate limit exceeded. Please retry later.'),
    ).toBeDefined();
  });

  it('calls onSyncNow with the correct property ID', () => {
    const onSyncNow = vi.fn();
    render(
      <AnalyticsSyncStatus
        properties={mockProperties}
        onSyncNow={onSyncNow}
        onChangeSyncFrequency={vi.fn()}
        onToggleSync={vi.fn()}
      />,
    );

    const syncButtons = screen.getAllByText('Sync Now');
    fireEvent.click(syncButtons[0]);
    expect(onSyncNow).toHaveBeenCalledWith('prop-gsc-1');

    fireEvent.click(syncButtons[1]);
    expect(onSyncNow).toHaveBeenCalledWith('prop-ga4-1');
  });

  it('calls onChangeSyncFrequency with the correct property ID and value', () => {
    const onChangeSyncFrequency = vi.fn();
    render(
      <AnalyticsSyncStatus
        properties={mockProperties}
        onSyncNow={vi.fn()}
        onChangeSyncFrequency={onChangeSyncFrequency}
        onToggleSync={vi.fn()}
      />,
    );

    // The first property has syncFrequency 'daily'. Change it to 'hourly'.
    const selects = screen.getAllByDisplayValue('Daily');
    expect(selects.length).toBe(1); // Only first property is 'daily'

    fireEvent.change(selects[0], { target: { value: 'hourly' } });
    expect(onChangeSyncFrequency).toHaveBeenCalledWith('prop-gsc-1', 'hourly');
  });

  it('shows syncing state when isSyncing matches a property', () => {
    render(
      <AnalyticsSyncStatus
        properties={mockProperties}
        onSyncNow={vi.fn()}
        onChangeSyncFrequency={vi.fn()}
        onToggleSync={vi.fn()}
        isSyncing="prop-gsc-1"
      />,
    );

    // First property should show "Syncing..." and be disabled
    expect(screen.getByText('Syncing...')).toBeDefined();
    const syncingButton = screen.getByText('Syncing...').closest('button');
    expect(syncingButton?.disabled).toBe(true);

    // Second property should still show "Sync Now"
    expect(screen.getByText('Sync Now')).toBeDefined();
  });

  it('calls onToggleSync when enabled checkbox is toggled', () => {
    const onToggleSync = vi.fn();
    render(
      <AnalyticsSyncStatus
        properties={mockProperties}
        onSyncNow={vi.fn()}
        onChangeSyncFrequency={vi.fn()}
        onToggleSync={onToggleSync}
      />,
    );

    // Both properties are enabled; uncheck the first one
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(2);

    fireEvent.click(checkboxes[0]);
    expect(onToggleSync).toHaveBeenCalledWith('prop-gsc-1', false);
  });

  it('shows rows synced for completed syncs', () => {
    render(
      <AnalyticsSyncStatus
        properties={mockProperties}
        onSyncNow={vi.fn()}
        onChangeSyncFrequency={vi.fn()}
        onToggleSync={vi.fn()}
      />,
    );

    expect(screen.getByText('Rows synced: 4250')).toBeDefined();
  });

  it('shows "never" for properties that have not been synced', () => {
    const unsyncedProperty: SyncableProperty = {
      id: 'prop-new',
      service: 'gsc',
      propertyName: 'new-site.com',
      propertyId: 'sc-domain:new-site.com',
      syncEnabled: false,
      syncFrequency: 'daily',
    };

    render(
      <AnalyticsSyncStatus
        properties={[unsyncedProperty]}
        onSyncNow={vi.fn()}
        onChangeSyncFrequency={vi.fn()}
        onToggleSync={vi.fn()}
      />,
    );

    expect(screen.getByText(/never/)).toBeDefined();
  });
});
