import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../ui/Button';
import { getSupabaseClient } from '../../services/supabaseClient';

interface ConnectedAccount {
  id: string;
  account_email: string;
  scopes: string[];
  updated_at: string;
}

interface GscProperty {
  siteUrl: string;
  permissionLevel: string;
}

interface LinkedPropertyRow {
  id: string;
  account_id: string;
  property_id: string;
  property_name: string | null;
  service: 'gsc' | 'ga4';
  is_primary: boolean;
}

interface SearchConsoleConnectionProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
  projectId?: string;
  projectName?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const SearchConsoleConnection: React.FC<SearchConsoleConnectionProps> = ({
  supabaseUrl,
  supabaseAnonKey,
  projectId,
  projectName,
  onConnect,
  onDisconnect,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Properties per account
  const [propertiesMap, setPropertiesMap] = useState<Record<string, GscProperty[]>>({});
  const [loadingProperties, setLoadingProperties] = useState<Record<string, boolean>>({});
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  // Linked properties for the active project
  const [linkedProperties, setLinkedProperties] = useState<LinkedPropertyRow[]>([]);
  const [linkingInProgress, setLinkingInProgress] = useState<string | null>(null);

  const getClient = useCallback(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return getSupabaseClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseUrl, supabaseAnonKey]);

  // Fetch connected Google accounts on mount
  const fetchAccounts = useCallback(async () => {
    const supabase = getClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    try {
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
  }, [getClient]);

  // Fetch linked properties for active project
  const fetchLinkedProperties = useCallback(async () => {
    if (!projectId) return;
    const supabase = getClient();
    if (!supabase) return;

    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('analytics_properties')
        .select('id, account_id, property_id, property_name, service, is_primary')
        .eq('project_id', projectId)
        .eq('service', 'gsc');

      if (!fetchError && data) {
        setLinkedProperties(data as LinkedPropertyRow[]);
      }
    } catch (err) {
      console.warn('[SearchConsoleConnection] Failed to fetch linked properties:', err);
    }
  }, [getClient, projectId]);

  useEffect(() => {
    fetchAccounts();
    fetchLinkedProperties();
  }, [fetchAccounts, fetchLinkedProperties]);

  // Listen for OAuth completion from the popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GSC_CONNECTED') {
        setIsConnecting(false);
        fetchAccounts();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchAccounts]);

  const handleConnect = useCallback(() => {
    setIsConnecting(true);
    setError(null);
    setSuccessMsg(null);
    onConnect();
    setTimeout(() => setIsConnecting(false), 30000);
  }, [onConnect]);

  const handleDisconnect = useCallback(async (accountId: string) => {
    const supabase = getClient();
    if (!supabase) return;
    try {
      // Also remove linked properties for this account
      if (projectId) {
        await (supabase as any).from('analytics_properties').delete().eq('account_id', accountId).eq('project_id', projectId);
      }
      await (supabase as any).from('analytics_accounts').delete().eq('id', accountId);
      setAccounts(prev => prev.filter(a => a.id !== accountId));
      setPropertiesMap(prev => {
        const next = { ...prev };
        delete next[accountId];
        return next;
      });
      setLinkedProperties(prev => prev.filter(lp => lp.account_id !== accountId));
      onDisconnect();
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    }
  }, [getClient, onDisconnect, projectId]);

  const handleLoadProperties = useCallback(async (accountId: string) => {
    if (expandedAccount === accountId) {
      setExpandedAccount(null);
      return;
    }

    setExpandedAccount(accountId);

    if (propertiesMap[accountId]) return;

    const supabase = getClient();
    if (!supabase) return;

    setLoadingProperties(prev => ({ ...prev, [accountId]: true }));
    setError(null);
    setSuccessMsg(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('gsc-list-properties', {
        body: { accountId },
      });

      if (fnError) {
        // Try to extract the response body from the FunctionsHttpError context
        let detail = '';
        try {
          if (fnError.context && typeof fnError.context.json === 'function') {
            const body = await fnError.context.json();
            detail = body?.detail ? `${body.error || 'Error'}: ${body.detail}` : body?.error || '';
          }
        } catch { /* ignore parse errors */ }
        setError(detail || fnError.message || 'Failed to load properties');
        setPropertiesMap(prev => ({ ...prev, [accountId]: [] }));
      } else if (!data?.ok) {
        const msg = data?.detail
          ? `${data?.error || 'Error'}: ${data.detail}`
          : data?.error || 'Failed to load properties';
        setError(msg);
        setPropertiesMap(prev => ({ ...prev, [accountId]: [] }));
      } else {
        setPropertiesMap(prev => ({ ...prev, [accountId]: data.properties || [] }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load properties');
      setPropertiesMap(prev => ({ ...prev, [accountId]: [] }));
    } finally {
      setLoadingProperties(prev => ({ ...prev, [accountId]: false }));
    }
  }, [getClient, expandedAccount, propertiesMap]);

  // Link a GSC property to the active project
  const handleLinkProperty = useCallback(async (accountId: string, siteUrl: string) => {
    if (!projectId) return;
    const supabase = getClient();
    if (!supabase) return;

    setLinkingInProgress(siteUrl);
    setError(null);
    setSuccessMsg(null);

    try {
      const isFirst = linkedProperties.length === 0;
      const { error: insertError } = await (supabase as any)
        .from('analytics_properties')
        .upsert({
          project_id: projectId,
          account_id: accountId,
          service: 'gsc',
          property_id: siteUrl,
          property_name: siteUrl,
          is_primary: isFirst,
          sync_enabled: false,
          sync_frequency: 'daily',
        }, { onConflict: 'project_id,service,property_id' });

      if (insertError) {
        setError(`Failed to link property: ${insertError.message}`);
      } else {
        setSuccessMsg(`Linked ${siteUrl} to project`);
        await fetchLinkedProperties();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to link property');
    } finally {
      setLinkingInProgress(null);
    }
  }, [getClient, projectId, linkedProperties.length, fetchLinkedProperties]);

  // Unlink a property from the project
  const handleUnlinkProperty = useCallback(async (linkedPropertyId: string) => {
    const supabase = getClient();
    if (!supabase) return;

    setError(null);
    setSuccessMsg(null);

    try {
      await (supabase as any).from('analytics_properties').delete().eq('id', linkedPropertyId);
      setLinkedProperties(prev => prev.filter(lp => lp.id !== linkedPropertyId));
      setSuccessMsg('Property unlinked');
    } catch (err: any) {
      setError(err.message || 'Failed to unlink property');
    }
  }, [getClient]);

  // Set a linked property as primary
  const handleSetPrimary = useCallback(async (linkedPropertyId: string) => {
    if (!projectId) return;
    const supabase = getClient();
    if (!supabase) return;

    try {
      // Unset all others first
      await (supabase as any)
        .from('analytics_properties')
        .update({ is_primary: false })
        .eq('project_id', projectId)
        .eq('service', 'gsc');
      // Set the selected one
      await (supabase as any)
        .from('analytics_properties')
        .update({ is_primary: true })
        .eq('id', linkedPropertyId);
      await fetchLinkedProperties();
    } catch (err: any) {
      setError(err.message || 'Failed to set primary');
    }
  }, [getClient, projectId, fetchLinkedProperties]);

  const isPropertyLinked = (siteUrl: string) =>
    linkedProperties.some(lp => lp.property_id === siteUrl);

  const getLinkedPropertyId = (siteUrl: string) =>
    linkedProperties.find(lp => lp.property_id === siteUrl)?.id;

  const isPropertyPrimary = (siteUrl: string) =>
    linkedProperties.find(lp => lp.property_id === siteUrl)?.is_primary ?? false;

  const permissionColor = (level: string) => {
    switch (level) {
      case 'siteOwner': return 'text-green-400';
      case 'siteFullUser': return 'text-blue-400';
      case 'siteRestrictedUser': return 'text-amber-400';
      default: return 'text-gray-400';
    }
  };

  const permissionLabel = (level: string) => {
    switch (level) {
      case 'siteOwner': return 'Owner';
      case 'siteFullUser': return 'Full';
      case 'siteRestrictedUser': return 'Restricted';
      default: return level;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-orange-400">Google Search Console</h3>
      <p className="text-sm text-gray-400 -mt-3">
        Connect your Search Console to enable performance tracking and audit correlations.
      </p>

      {/* Show linked properties summary when project is active */}
      {projectId && linkedProperties.length > 0 && (
        <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-md space-y-2">
          <div className="text-xs text-blue-300 font-medium uppercase tracking-wider">
            Linked to {projectName || 'this project'}
          </div>
          {linkedProperties.map(lp => (
            <div key={lp.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-200 font-mono">{lp.property_id}</span>
                {lp.is_primary && (
                  <span className="text-xs bg-blue-800 text-blue-200 px-1.5 py-0.5 rounded">Primary</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!lp.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(lp.id)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Set Primary
                  </button>
                )}
                <button
                  onClick={() => handleUnlinkProperty(lp.id)}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Unlink
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 p-3 bg-gray-800 border border-gray-700 rounded-md">
          <span className="text-gray-500 text-sm">Checking connection...</span>
        </div>
      ) : accounts.length > 0 ? (
        <div className="space-y-3">
          {accounts.map((account) => {
            const isExpanded = expandedAccount === account.id;
            const properties = propertiesMap[account.id];
            const isLoadingProps = loadingProperties[account.id];

            return (
              <div key={account.id} className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-800 rounded-md">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 text-sm font-medium">Connected</span>
                    <span className="text-gray-300 text-sm">{account.account_email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoadProperties(account.id)}
                      className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                    >
                      {isExpanded ? 'Hide Properties' : 'Show Properties'}
                    </button>
                    <button
                      onClick={() => handleDisconnect(account.id)}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                {/* Property list */}
                {isExpanded && (
                  <div className="ml-4 space-y-1">
                    {isLoadingProps ? (
                      <div className="p-2 text-sm text-gray-500">Loading properties...</div>
                    ) : properties && properties.length > 0 ? (
                      <>
                        <div className="text-xs text-gray-500 mb-2">
                          {properties.length} {properties.length === 1 ? 'property' : 'properties'} available
                        </div>
                        {properties.map((prop) => {
                          const linked = isPropertyLinked(prop.siteUrl);
                          const linkedId = getLinkedPropertyId(prop.siteUrl);
                          const isPrimary = isPropertyPrimary(prop.siteUrl);
                          const isLinking = linkingInProgress === prop.siteUrl;

                          return (
                            <div
                              key={prop.siteUrl}
                              className={`flex items-center justify-between p-2 rounded text-sm ${
                                linked
                                  ? 'bg-blue-900/20 border border-blue-700/50'
                                  : 'bg-gray-800/50 border border-gray-700/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-gray-200 font-mono text-xs truncate">
                                  {prop.siteUrl}
                                </span>
                                <span className={`text-xs flex-shrink-0 ${permissionColor(prop.permissionLevel)}`}>
                                  {permissionLabel(prop.permissionLevel)}
                                </span>
                                {linked && isPrimary && (
                                  <span className="text-xs bg-blue-800 text-blue-200 px-1 py-0.5 rounded flex-shrink-0">
                                    Primary
                                  </span>
                                )}
                              </div>
                              {projectId && (
                                <div className="flex-shrink-0 ml-2">
                                  {linked ? (
                                    <button
                                      onClick={() => linkedId && handleUnlinkProperty(linkedId)}
                                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                    >
                                      Unlink
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleLinkProperty(account.id, prop.siteUrl)}
                                      disabled={isLinking}
                                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                                    >
                                      {isLinking ? 'Linking...' : 'Link to Project'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {!projectId && (
                          <p className="text-xs text-gray-600 mt-1">
                            Open a project first to link properties.
                          </p>
                        )}
                      </>
                    ) : properties ? (
                      <div className="p-2 text-sm text-gray-500">
                        No Search Console properties found for this account.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}

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
      {successMsg && (
        <p className="text-green-400 text-sm">{successMsg}</p>
      )}
    </div>
  );
};
