import React from 'react';
import { Button } from '../ui/Button';

export interface AnalyticsAccount {
  id: string;
  provider: 'google' | 'bing';
  accountEmail: string;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsAccountsPanelProps {
  accounts: AnalyticsAccount[];
  onConnect: () => void;
  onDisconnect: (accountId: string) => void;
  isConnecting?: boolean;
}

/**
 * Formats a date string into a readable "MMM D, YYYY" format.
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats a scope string into a short human-readable label.
 * e.g. "https://www.googleapis.com/auth/webmasters.readonly" -> "webmasters.readonly"
 */
function formatScope(scope: string): string {
  // Strip common Google API prefix
  const stripped = scope.replace(/^https:\/\/www\.googleapis\.com\/auth\//, '');
  return stripped;
}

export const AnalyticsAccountsPanel: React.FC<AnalyticsAccountsPanelProps> = ({
  accounts,
  onConnect,
  onDisconnect,
  isConnecting = false,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-orange-400">Google Analytics Accounts</h3>
      <p className="text-sm text-gray-400 -mt-3">
        Connect one or more Google accounts to pull analytics data for content audits.
      </p>

      {accounts.length === 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-gray-800 border border-gray-700 rounded-md">
            <span className="text-gray-500 text-sm">No accounts connected</span>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={onConnect}
            disabled={isConnecting}
            className="text-sm"
          >
            {isConnecting ? 'Connecting...' : 'Connect Google Account'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="p-3 bg-green-900/20 border border-green-800 rounded-md space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-sm font-medium">Connected</span>
                  <span className="text-gray-300 text-sm">{account.accountEmail}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onDisconnect(account.id)}
                  className="text-red-400 text-sm hover:text-red-300 transition-colors"
                >
                  Disconnect
                </button>
              </div>

              {account.scopes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {account.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="bg-gray-700 text-gray-300 text-xs px-1.5 py-0.5 rounded"
                    >
                      {formatScope(scope)}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Connected: {formatDate(account.createdAt)}</span>
                <span>Last used: {formatDate(account.updatedAt)}</span>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            onClick={onConnect}
            disabled={isConnecting}
            className="text-sm"
          >
            {isConnecting ? 'Connecting...' : 'Add Another Google Account'}
          </Button>
        </div>
      )}
    </div>
  );
};
