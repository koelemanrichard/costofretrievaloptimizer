import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../ui/Button';
import { getSupabaseClient } from '../../services/supabaseClient';

interface ConnectedAccount {
  id: string;
  account_email: string;
  scopes: string[];
  updated_at: string;
}

interface SearchConsoleConnectionProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const SearchConsoleConnection: React.FC<SearchConsoleConnectionProps> = ({
  supabaseUrl,
  supabaseAnonKey,
  onConnect,
  onDisconnect,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch connected Google accounts on mount
  const fetchAccounts = useCallback(async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setIsLoading(false);
      return;
    }
    try {
      const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
      // analytics_accounts is not in generated types yet — use type assertion
      const { data, error: fetchError } = await (supabase as any)
        .from('analytics_accounts')
        .select('id, account_email, scopes, updated_at')
        .eq('provider', 'google')
        .order('updated_at', { ascending: false });

      if (fetchError) {
        console.warn('[SearchConsoleConnection] Failed to fetch accounts:', fetchError.message);
        setAccounts([]);
      } else {
        setAccounts((data as ConnectedAccount[]) || []);
      }
    } catch (err) {
      console.warn('[SearchConsoleConnection] Error:', err);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Listen for OAuth completion from the popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GSC_CONNECTED') {
        setIsConnecting(false);
        fetchAccounts(); // Refresh the list
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchAccounts]);

  const handleConnect = useCallback(() => {
    setIsConnecting(true);
    setError(null);
    onConnect();
    // Reset connecting state after timeout (in case popup is blocked)
    setTimeout(() => setIsConnecting(false), 30000);
  }, [onConnect]);

  const handleDisconnect = useCallback(async (accountId: string) => {
    if (!supabaseUrl || !supabaseAnonKey) return;
    try {
      const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
      await (supabase as any).from('analytics_accounts').delete().eq('id', accountId);
      setAccounts(prev => prev.filter(a => a.id !== accountId));
      onDisconnect();
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    }
  }, [supabaseUrl, supabaseAnonKey, onDisconnect]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-orange-400">Google Search Console</h3>
      <p className="text-sm text-gray-400 -mt-3">
        Connect your Search Console to enable performance tracking and audit correlations.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 p-3 bg-gray-800 border border-gray-700 rounded-md">
          <span className="text-gray-500 text-sm">Checking connection...</span>
        </div>
      ) : accounts.length > 0 ? (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div key={account.id} className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-800 rounded-md">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-sm font-medium">Connected</span>
                  <span className="text-gray-300 text-sm">{account.account_email}</span>
                </div>
                <button
                  onClick={() => handleDisconnect(account.id)}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))}

          {/* Add another account */}
          <Button
            type="button"
            variant="secondary"
            onClick={handleConnect}
            disabled={isConnecting}
            className="text-sm"
          >
            {isConnecting ? 'Connecting...' : 'Connect Another Account'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-gray-800 border border-gray-700 rounded-md">
            <span className="text-gray-500 text-sm">Not connected</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={handleConnect}
              disabled={isConnecting}
              className="text-sm"
            >
              {isConnecting ? 'Connecting...' : 'Connect Google Search Console'}
            </Button>
            <span className="text-xs text-gray-500">Or import CSV manually in the audit panel</span>
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
};
