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

interface Ga4Property {
  propertyId: string;
  displayName: string;
  accountName: string;
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
  onGa4LinkedChange?: (linked: boolean) => void;
}

export const SearchConsoleConnection: React.FC<SearchConsoleConnectionProps> = ({
  supabaseUrl,
  supabaseAnonKey,
  projectId,
  projectName,
  onConnect,
  onDisconnect,
  onGa4LinkedChange,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // GSC properties per account
  const [propertiesMap, setPropertiesMap] = useState<Record<string, GscProperty[]>>({});
  const [loadingProperties, setLoadingProperties] = useState<Record<string, boolean>>({});
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  // GA4 properties per account
  const [ga4PropertiesMap, setGa4PropertiesMap] = useState<Record<string, Ga4Property[]>>({});
  const [loadingGa4Properties, setLoadingGa4Properties] = useState<Record<string, boolean>>({});

  // Linked properties for the active project (both GSC and GA4)
  const [linkedProperties, setLinkedProperties] = useState<LinkedPropertyRow[]>([]);
  const [linkingInProgress, setLinkingInProgress] = useState<string | null>(null);
  const [relinkNeeded, setRelinkNeeded] = useState<Record<string, boolean>>({});

  const gscLinkedProperties = linkedProperties.filter(lp => lp.service === 'gsc');
  const ga4LinkedProperties = linkedProperties.filter(lp => lp.service === 'ga4');

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

  // Fetch linked properties for active project (both GSC and GA4)
  const fetchLinkedProperties = useCallback(async () => {
    if (!projectId) return;
    const supabase = getClient();
    if (!supabase) return;

    try {
      const { data, error: fetchError } = await (supabase as any)
        .from('analytics_properties')
        .select('id, account_id, property_id, property_name, service, is_primary')
        .eq('project_id', projectId);

      if (!fetchError && data) {
        const rows = data as LinkedPropertyRow[];
        setLinkedProperties(rows);
        onGa4LinkedChange?.(rows.some(lp => lp.service === 'ga4'));
      }
    } catch (err) {
      console.warn('[SearchConsoleConnection] Failed to fetch linked properties:', err);
    }
  }, [getClient, projectId, onGa4LinkedChange]);

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
      setGa4PropertiesMap(prev => {
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

    // Load GSC properties if not cached
    if (!propertiesMap[accountId]) {
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
          let detail = '';
          let relink = false;
          try {
            if (fnError.context && typeof fnError.context.json === 'function') {
              const body = await fnError.context.json();
              detail = body?.detail ? `${body.error || 'Error'}: ${body.detail}` : body?.error || '';
              relink = !!body?.relink;
            }
          } catch { /* ignore parse errors */ }
          setError(detail || fnError.message || 'Failed to load GSC properties');
          setRelinkNeeded(prev => ({ ...prev, [accountId]: relink }));
          if (!relink) setPropertiesMap(prev => ({ ...prev, [accountId]: [] }));
        } else if (!data?.ok) {
          const relink = !!data?.relink;
          const msg = relink
            ? (data?.error || 'Google authorization expired — please re-connect your Google account')
            : data?.detail
              ? `${data?.error || 'Error'}: ${data.detail}`
              : data?.error || 'Failed to load GSC properties';
          setError(msg);
          setRelinkNeeded(prev => ({ ...prev, [accountId]: relink }));
          if (!relink) setPropertiesMap(prev => ({ ...prev, [accountId]: [] }));
        } else {
          setPropertiesMap(prev => ({ ...prev, [accountId]: data.properties || [] }));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load GSC properties');
        setPropertiesMap(prev => ({ ...prev, [accountId]: [] }));
      } finally {
        setLoadingProperties(prev => ({ ...prev, [accountId]: false }));
      }
    }

    // Load GA4 properties if not cached
    if (!ga4PropertiesMap[accountId]) {
      handleLoadGa4Properties(accountId);
    }
  }, [getClient, expandedAccount, propertiesMap, ga4PropertiesMap]);

  // Load GA4 properties for an account
  const handleLoadGa4Properties = useCallback(async (accountId: string) => {
    const supabase = getClient();
    if (!supabase) return;

    setLoadingGa4Properties(prev => ({ ...prev, [accountId]: true }));

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ga4-list-properties', {
        body: { accountId },
      });

      if (fnError) {
        let relink = false;
        try {
          if (fnError.context && typeof fnError.context.json === 'function') {
            const body = await fnError.context.json();
            relink = !!body?.relink;
          }
        } catch { /* ignore */ }
        // Don't overwrite GSC error — just log GA4 issue
        console.warn('[SearchConsoleConnection] GA4 properties error:', fnError.message);
        if (relink) setRelinkNeeded(prev => ({ ...prev, [`ga4_${accountId}`]: true }));
        setGa4PropertiesMap(prev => ({ ...prev, [accountId]: [] }));
      } else if (!data?.ok) {
        const relink = !!data?.relink;
        if (relink) {
          setRelinkNeeded(prev => ({ ...prev, [`ga4_${accountId}`]: true }));
        }
        console.warn('[SearchConsoleConnection] GA4 properties:', data?.error);
        setGa4PropertiesMap(prev => ({ ...prev, [accountId]: [] }));
      } else {
        setGa4PropertiesMap(prev => ({ ...prev, [accountId]: data.properties || [] }));
      }
    } catch (err: any) {
      console.warn('[SearchConsoleConnection] GA4 load error:', err);
      setGa4PropertiesMap(prev => ({ ...prev, [accountId]: [] }));
    } finally {
      setLoadingGa4Properties(prev => ({ ...prev, [accountId]: false }));
    }
  }, [getClient]);

  // Link a GSC property to the active project
  const handleLinkProperty = useCallback(async (accountId: string, siteUrl: string) => {
    if (!projectId) return;
    const supabase = getClient();
    if (!supabase) return;

    setLinkingInProgress(siteUrl);
    setError(null);
    setSuccessMsg(null);

    try {
      const isFirst = gscLinkedProperties.length === 0;
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
  }, [getClient, projectId, gscLinkedProperties.length, fetchLinkedProperties]);

  // Link a GA4 property to the active project
  const handleLinkGa4Property = useCallback(async (accountId: string, propertyId: string, displayName: string) => {
    if (!projectId) return;
    const supabase = getClient();
    if (!supabase) return;

    setLinkingInProgress(`ga4_${propertyId}`);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error: insertError } = await (supabase as any)
        .from('analytics_properties')
        .upsert({
          project_id: projectId,
          account_id: accountId,
          service: 'ga4',
          property_id: propertyId,
          property_name: displayName,
          is_primary: false,
          sync_enabled: true,
          sync_frequency: 'daily',
        }, { onConflict: 'project_id,service,property_id' });

      if (insertError) {
        setError(`Failed to link GA4 property: ${insertError.message}`);
      } else {
        setSuccessMsg(`Linked GA4 property "${displayName}" to project`);
        await fetchLinkedProperties();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to link GA4 property');
    } finally {
      setLinkingInProgress(null);
    }
  }, [getClient, projectId, fetchLinkedProperties]);

  // Unlink a property from the project
  const handleUnlinkProperty = useCallback(async (linkedPropertyId: string) => {
    const supabase = getClient();
    if (!supabase) return;

    setError(null);
    setSuccessMsg(null);

    try {
      await (supabase as any).from('analytics_properties').delete().eq('id', linkedPropertyId);
      setLinkedProperties(prev => {
        const next = prev.filter(lp => lp.id !== linkedPropertyId);
        onGa4LinkedChange?.(next.some(lp => lp.service === 'ga4'));
        return next;
      });
      setSuccessMsg('Property unlinked');
    } catch (err: any) {
      setError(err.message || 'Failed to unlink property');
    }
  }, [getClient, onGa4LinkedChange]);

  // Set a linked property as primary (for GSC)
  const handleSetPrimary = useCallback(async (linkedPropertyId: string, service: 'gsc' | 'ga4') => {
    if (!projectId) return;
    const supabase = getClient();
    if (!supabase) return;

    try {
      await (supabase as any)
        .from('analytics_properties')
        .update({ is_primary: false })
        .eq('project_id', projectId)
        .eq('service', service);
      await (supabase as any)
        .from('analytics_properties')
        .update({ is_primary: true })
        .eq('id', linkedPropertyId);
      await fetchLinkedProperties();
    } catch (err: any) {
      setError(err.message || 'Failed to set primary');
    }
  }, [getClient, projectId, fetchLinkedProperties]);

  const isPropertyLinked = (siteUrl: string, service: 'gsc' | 'ga4' = 'gsc') =>
    linkedProperties.some(lp => lp.property_id === siteUrl && lp.service === service);

  const getLinkedPropertyId = (siteUrl: string, service: 'gsc' | 'ga4' = 'gsc') =>
    linkedProperties.find(lp => lp.property_id === siteUrl && lp.service === service)?.id;

  const isPropertyPrimary = (siteUrl: string, service: 'gsc' | 'ga4' = 'gsc') =>
    linkedProperties.find(lp => lp.property_id === siteUrl && lp.service === service)?.is_primary ?? false;

  const hasAnalyticsScope = (account: ConnectedAccount) =>
    (account.scopes || []).some(s => s.includes('analytics.readonly') || s.includes('analytics'));

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
      <h3 className="text-lg font-semibold text-orange-400">Google Search Console & Analytics</h3>
      <p className="text-sm text-gray-400 -mt-3">
        Connect your Google account to enable Search Console performance tracking and GA4 traffic data.
      </p>

      {/* Show linked properties summary when project is active */}
      {projectId && (gscLinkedProperties.length > 0 || ga4LinkedProperties.length > 0) && (
        <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-md space-y-2">
          <div className="text-xs text-blue-300 font-medium uppercase tracking-wider">
            Linked to {projectName || 'this project'}
          </div>
          {gscLinkedProperties.map(lp => (
            <div key={lp.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-teal-400 bg-teal-900/30 px-1 py-0.5 rounded">GSC</span>
                <span className="text-sm text-gray-200 font-mono">{lp.property_id}</span>
                {lp.is_primary && (
                  <span className="text-xs bg-blue-800 text-blue-200 px-1.5 py-0.5 rounded">Primary</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!lp.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(lp.id, 'gsc')}
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
          {ga4LinkedProperties.map(lp => (
            <div key={lp.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-purple-400 bg-purple-900/30 px-1 py-0.5 rounded">GA4</span>
                <span className="text-sm text-gray-200">{lp.property_name || lp.property_id}</span>
              </div>
              <button
                onClick={() => handleUnlinkProperty(lp.id)}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                Unlink
              </button>
            </div>
          ))}
        </div>
      )}

      {/* GA4 scope upgrade banner — shown when accounts exist but none have analytics scope */}
      {!isLoading && accounts.length > 0 && ga4LinkedProperties.length === 0 && !accounts.some(a => hasAnalyticsScope(a)) && (
        <div className="p-3 bg-purple-900/20 border border-purple-700/40 rounded-md">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-purple-300 font-medium">GA4 Analytics Access Required</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Your Google account was connected before GA4 support was added. Re-connect to grant Analytics access, then link a GA4 property.
              </p>
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="mt-2 text-xs bg-purple-700 hover:bg-purple-600 text-white px-3 py-1.5 rounded transition-colors disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Re-connect Google Account'}
              </button>
            </div>
          </div>
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
            const ga4Properties = ga4PropertiesMap[account.id];
            const isLoadingProps = loadingProperties[account.id];
            const isLoadingGa4 = loadingGa4Properties[account.id];
            const accountHasAnalytics = hasAnalyticsScope(account);

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
                  <div className="ml-4 space-y-3">
                    {/* GSC Properties Section */}
                    <div className="space-y-1">
                      <div className="text-xs text-teal-400 font-medium uppercase tracking-wider">Search Console Properties</div>
                      {isLoadingProps ? (
                        <div className="p-2 text-sm text-gray-500">Loading GSC properties...</div>
                      ) : properties && properties.length > 0 ? (
                        <>
                          <div className="text-xs text-gray-500 mb-1">
                            {properties.length} {properties.length === 1 ? 'property' : 'properties'} available
                          </div>
                          {properties.map((prop) => {
                            const linked = isPropertyLinked(prop.siteUrl, 'gsc');
                            const linkedId = getLinkedPropertyId(prop.siteUrl, 'gsc');
                            const isPrimary = isPropertyPrimary(prop.siteUrl, 'gsc');
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
                        </>
                      ) : relinkNeeded[account.id] ? (
                        <div className="p-2 bg-red-900/20 border border-red-700/40 rounded">
                          <p className="text-sm text-red-300">
                            Google authorization expired — please re-connect your account.
                          </p>
                          <button
                            type="button"
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="mt-2 text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                          >
                            {isConnecting ? 'Connecting...' : 'Re-connect Google Account'}
                          </button>
                        </div>
                      ) : properties ? (
                        <div className="p-2 text-sm text-gray-500">
                          No Search Console properties found for this account.
                        </div>
                      ) : null}
                    </div>

                    {/* GA4 Properties Section */}
                    <div className="space-y-1 pt-2 border-t border-gray-700/50">
                      <div className="text-xs text-purple-400 font-medium uppercase tracking-wider">GA4 Analytics Properties</div>
                      {!accountHasAnalytics ? (
                        <div className="p-2 bg-amber-900/20 border border-amber-700/40 rounded">
                          <p className="text-sm text-amber-300">
                            GA4 access not granted — re-connect your Google account to grant Analytics access.
                          </p>
                          <button
                            type="button"
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="mt-2 text-xs bg-amber-700 hover:bg-amber-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                          >
                            {isConnecting ? 'Connecting...' : 'Re-connect with Analytics Access'}
                          </button>
                        </div>
                      ) : isLoadingGa4 ? (
                        <div className="p-2 text-sm text-gray-500">Loading GA4 properties...</div>
                      ) : relinkNeeded[`ga4_${account.id}`] ? (
                        <div className="p-2 bg-red-900/20 border border-red-700/40 rounded">
                          <p className="text-sm text-red-300">
                            GA4 authorization expired — please re-connect your account.
                          </p>
                          <button
                            type="button"
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="mt-2 text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                          >
                            {isConnecting ? 'Connecting...' : 'Re-connect Google Account'}
                          </button>
                        </div>
                      ) : ga4Properties && ga4Properties.length > 0 ? (
                        <>
                          <div className="text-xs text-gray-500 mb-1">
                            {ga4Properties.length} {ga4Properties.length === 1 ? 'property' : 'properties'} available
                          </div>
                          {ga4Properties.map((prop) => {
                            const linked = isPropertyLinked(prop.propertyId, 'ga4');
                            const linkedId = getLinkedPropertyId(prop.propertyId, 'ga4');
                            const isLinking = linkingInProgress === `ga4_${prop.propertyId}`;

                            return (
                              <div
                                key={prop.propertyId}
                                className={`flex items-center justify-between p-2 rounded text-sm ${
                                  linked
                                    ? 'bg-purple-900/20 border border-purple-700/50'
                                    : 'bg-gray-800/50 border border-gray-700/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-gray-200 text-xs truncate">
                                    {prop.displayName}
                                  </span>
                                  <span className="text-xs text-gray-500 flex-shrink-0">
                                    {prop.accountName}
                                  </span>
                                  <span className="text-[10px] text-gray-600 font-mono flex-shrink-0">
                                    {prop.propertyId}
                                  </span>
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
                                        onClick={() => handleLinkGa4Property(account.id, prop.propertyId, prop.displayName)}
                                        disabled={isLinking}
                                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                                      >
                                        {isLinking ? 'Linking...' : 'Link to Project'}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </>
                      ) : ga4Properties ? (
                        <div className="p-2 text-sm text-gray-500">
                          No GA4 properties found for this account.
                        </div>
                      ) : null}
                    </div>

                    {!projectId && (
                      <p className="text-xs text-gray-600 mt-1">
                        Open a project first to link properties.
                      </p>
                    )}
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
              {isConnecting ? 'Connecting...' : 'Connect Google Account'}
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
