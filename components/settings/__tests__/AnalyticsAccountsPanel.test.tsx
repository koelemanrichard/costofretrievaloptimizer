import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalyticsAccountsPanel } from '../AnalyticsAccountsPanel';
import type { AnalyticsAccount } from '../AnalyticsAccountsPanel';

const mockAccounts: AnalyticsAccount[] = [
  {
    id: 'acc-1',
    provider: 'google',
    accountEmail: 'personal@gmail.com',
    scopes: [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/analytics.readonly',
    ],
    createdAt: '2025-12-01T10:00:00Z',
    updatedAt: '2026-02-10T14:30:00Z',
  },
  {
    id: 'acc-2',
    provider: 'google',
    accountEmail: 'business@company.com',
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-02-11T09:00:00Z',
  },
];

describe('AnalyticsAccountsPanel', () => {
  it('renders empty state when no accounts are connected', () => {
    render(
      <AnalyticsAccountsPanel
        accounts={[]}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );

    expect(screen.getByText('No accounts connected')).toBeDefined();
    expect(screen.getByText('Connect Google Account')).toBeDefined();
  });

  it('renders account list with emails', () => {
    render(
      <AnalyticsAccountsPanel
        accounts={mockAccounts}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );

    expect(screen.getByText('personal@gmail.com')).toBeDefined();
    expect(screen.getByText('business@company.com')).toBeDefined();
  });

  it('shows scope badges with formatted scope names', () => {
    render(
      <AnalyticsAccountsPanel
        accounts={mockAccounts}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );

    expect(screen.getByText('webmasters.readonly')).toBeDefined();
    // analytics.readonly appears for both accounts
    const analyticsBadges = screen.getAllByText('analytics.readonly');
    expect(analyticsBadges.length).toBe(2);
  });

  it('calls onConnect when "Add" button is clicked', () => {
    const onConnect = vi.fn();
    render(
      <AnalyticsAccountsPanel
        accounts={mockAccounts}
        onConnect={onConnect}
        onDisconnect={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Add Another Google Account'));
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it('calls onConnect in empty state when connect button is clicked', () => {
    const onConnect = vi.fn();
    render(
      <AnalyticsAccountsPanel
        accounts={[]}
        onConnect={onConnect}
        onDisconnect={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Connect Google Account'));
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it('calls onDisconnect with the correct account ID', () => {
    const onDisconnect = vi.fn();
    render(
      <AnalyticsAccountsPanel
        accounts={mockAccounts}
        onConnect={vi.fn()}
        onDisconnect={onDisconnect}
      />
    );

    const disconnectButtons = screen.getAllByText('Disconnect');
    fireEvent.click(disconnectButtons[0]);
    expect(onDisconnect).toHaveBeenCalledWith('acc-1');

    fireEvent.click(disconnectButtons[1]);
    expect(onDisconnect).toHaveBeenCalledWith('acc-2');
  });

  it('shows "Connecting..." state when isConnecting is true', () => {
    render(
      <AnalyticsAccountsPanel
        accounts={[]}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
        isConnecting={true}
      />
    );

    const connectButton = screen.getByText('Connecting...');
    expect(connectButton).toBeDefined();
    expect(connectButton.closest('button')?.disabled).toBe(true);
  });

  it('shows "Connecting..." on Add button when isConnecting is true with existing accounts', () => {
    render(
      <AnalyticsAccountsPanel
        accounts={mockAccounts}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
        isConnecting={true}
      />
    );

    const addButton = screen.getByText('Connecting...');
    expect(addButton).toBeDefined();
    expect(addButton.closest('button')?.disabled).toBe(true);
  });

  it('renders the panel heading and description', () => {
    render(
      <AnalyticsAccountsPanel
        accounts={[]}
        onConnect={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );

    expect(screen.getByText('Google Analytics Accounts')).toBeDefined();
    expect(
      screen.getByText('Connect one or more Google accounts to pull analytics data for content audits.')
    ).toBeDefined();
  });
});
