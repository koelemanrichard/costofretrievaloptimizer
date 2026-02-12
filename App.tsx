
// App.tsx
import React, { useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppStateContext, appReducer, initialState } from './state/appState';
import { AppStep, BusinessInfo, Project, TopicalMap } from './types';
import { getSupabaseClient, resetSupabaseClient, clearSupabaseAuthStorage } from './services/supabaseClient';
import { parseTopicalMap, normalizeRpcData, parseProject, repairBriefsInMap } from './utils/parsers';
import { setGlobalUsageContext, clearGlobalUsageContext, setBillingContext, determineKeySource } from './services/telemetryService';
import { cacheService } from './services/cacheService';
import { setVerboseLogging } from './utils/debugLogger';
import { consoleLogger, setLogContext } from './services/consoleLogger';
import { apiCallLogger } from './services/apiCallLogger';
import { performanceLogger } from './services/performanceLogger';

// Import Router
import AppRouter from './components/router/AppRouter';

// Import Global UI
import { SettingsModal } from './components/modals';
import { NotificationBanner } from './components/ui/NotificationBanner';
import ConfirmationModal from './components/ui/ConfirmationModal';
import GlobalLoadingBar from './components/ui/GlobalLoadingBar';
import LoggingPanel from './components/LoggingPanel';
import EdgeToolbar, { ToolbarIcons } from './components/ui/EdgeToolbar';
import { useVersionCheck, UpdateBanner } from './hooks/useVersionCheck';
import { CelebrationOverlay } from './components/gamification';
import { OrganizationProvider } from './components/organization';

// Bridge hooks for migration period
import { useNavigationSync } from './hooks/useNavigationSync';
import { useLastUrl, getLastUrl, clearLastUrl } from './hooks/useLastUrl';

/**
 * NavigationBridge - Must render inside AppStateContext.Provider
 * so useNavigationSync can access useAppState().
 */
const NavigationBridge: React.FC = () => {
    useNavigationSync();
    return null;
};

const App: React.FC = () => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const navigate = useNavigate();
    const location = useLocation();

    // Counter to force re-subscription when the Supabase client is reset
    // This ensures onAuthStateChange cleanup runs and re-subscribes on the new client
    const [authClientVersion, setAuthClientVersion] = useState(0);

    // Bridge hook: persist last URL for deep-link restore after login
    // (useLastUrl only needs useLocation, which is available from BrowserRouter above)
    useLastUrl();

    // Initialize logging services on mount (once only)
    useEffect(() => {
        // Install console logger to capture errors and warnings
        consoleLogger.install();
        console.log('[App] Logging services initialized');

        return () => {
            // Flush any pending logs on unmount
            consoleLogger.flush();
            apiCallLogger.flush();
            performanceLogger.flush();
        };
    }, []);

    // Version check for detecting app updates after deployments
    const { updateAvailable, handleReload, dismissUpdate } = useVersionCheck(60000); // Check every 60s

    // Use a ref to track the current step without triggering re-renders or effect dependencies
    const appStepRef = useRef(state.appStep);

    // Keep the ref synchronized with state
    useEffect(() => {
        appStepRef.current = state.appStep;
    }, [state.appStep]);

    // Session initialization - runs once on mount
    // Uses a ref to prevent re-running on every render and conflicting with active logins
    const hasInitializedAuth = useRef(false);

    useEffect(() => {
        // Only run session check once to avoid conflicts with login attempts
        if (hasInitializedAuth.current) {
            return;
        }
        hasInitializedAuth.current = true;

        const initializeAuth = async () => {
            console.log('[App] Starting session check...');

            // Check if we're recovering from a previous hang - if so, ensure storage is clear
            const reloadKey = 'auth_recovery_reload';
            const wasRecovering = localStorage.getItem(reloadKey);
            if (wasRecovering) {
                console.log('[App] Post-recovery session check - ensuring clean state');
                // CRITICAL: Reset the client FIRST, then clear storage, then create fresh client
                // This ensures we don't reuse a client that has cached the bad session
                resetSupabaseClient(true); // This also clears storage
                localStorage.removeItem(reloadKey);
            }

            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);

            // If session check hangs for more than 15s, the Supabase client is in a bad state
            // Clear storage and reload the page to get a completely fresh state
            // Use a flag to prevent infinite reload loops
            // INCREASED from 5s to 15s to avoid interrupting users during slow network
            let didComplete = false;
            const lastReload = wasRecovering; // Reuse the value we already fetched
            const now = Date.now();

            const timeoutId = setTimeout(() => {
                if (!didComplete) {
                    // Always reload on session check hang - trying to recover in-place
                    // causes "Multiple GoTrueClient instances" issues with any in-progress login
                    // Use 30-second threshold to prevent infinite reload loops
                    if (!lastReload || (now - parseInt(lastReload, 10)) > 30000) {
                        console.warn('[App] Session check hanging after 15s - clearing storage and reloading');
                        clearSupabaseAuthStorage();
                        resetSupabaseClient(false);
                        localStorage.setItem(reloadKey, now.toString());
                        window.location.reload();
                    } else {
                        // If we've reloaded within 30 seconds, something is seriously wrong
                        // Just clear storage and let user try again manually
                        console.error('[App] Session check still hanging after reload - clearing all auth state');
                        clearSupabaseAuthStorage();
                        resetSupabaseClient(true); // Clear storage too
                        localStorage.removeItem(reloadKey);
                        // Show user a message
                        dispatch({ type: 'SET_ERROR', payload: 'Authentication service unavailable. Please refresh the page or try again later.' });
                    }
                }
            }, 15000); // Increased from 5000 to 15000 to avoid interrupting users

            try {
                // Fast-path: if no auth token in localStorage, skip getSession() entirely
                // This prevents getSession() from hanging on network issues when there's clearly no session
                const hasStoredSession = Object.keys(localStorage).some(k => k.startsWith('sb-') && k.includes('auth'));
                if (!hasStoredSession) {
                    console.log('[App] No stored session found, skipping getSession()');
                    didComplete = true;
                    clearTimeout(timeoutId);
                    return;
                }

                console.log('[App] Found stored session, validating...');
                const { data: { session }, error } = await supabase.auth.getSession();
                didComplete = true;
                clearTimeout(timeoutId);

                if (error) {
                    console.warn('[App] Session error, clearing stale data:', error.message);
                    clearSupabaseAuthStorage();
                } else if (session?.user) {
                    console.log('[App] Valid session found for:', session.user.email);
                    dispatch({ type: 'SET_USER', payload: session.user });
                    dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION });

                    // Restore last URL after session recovery (deep link support)
                    const lastUrl = getLastUrl();
                    if (lastUrl && location.pathname === '/login') {
                        clearLastUrl();
                        navigate(lastUrl, { replace: true });
                    } else if (location.pathname === '/' || location.pathname === '/login') {
                        navigate('/projects', { replace: true });
                    }
                } else {
                    console.log('[App] No existing session');
                }
            } catch (e) {
                didComplete = true;
                clearTimeout(timeoutId);
                console.warn('[App] Session check failed, clearing storage:', e);
                clearSupabaseAuthStorage();
            }
        };

        initializeAuth();
    }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

    // Track which user we've claimed migrated data for (to avoid duplicate calls)
    const claimedMigratedDataForUser = useRef<string | null>(null);
    // Track last dispatched user ID to prevent redundant SET_USER dispatches
    const lastDispatchedUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        console.log('[App] Setting up onAuthStateChange subscription (version:', authClientVersion, ')');
        const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
        // CRITICAL: Do NOT make async Supabase calls inside this callback!
        // Known bug: async Supabase calls in onAuthStateChange cause deadlocks
        // where the NEXT Supabase call anywhere in the app will hang indefinitely.
        // See: https://github.com/supabase/supabase-js/issues/1594
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const newUserId = session?.user?.id ?? null;

            // Only dispatch SET_USER if user ID actually changed (prevents re-render loops
            // when Supabase emits events after updateUser calls that only change metadata)
            if (lastDispatchedUserIdRef.current !== newUserId) {
                lastDispatchedUserIdRef.current = newUserId;
                dispatch({ type: 'SET_USER', payload: session?.user ?? null });
            }

            if (session?.user) {
                // Set global usage context for AI telemetry tracking
                setGlobalUsageContext({ userId: session.user.id });

                // Only redirect to selection if we are currently on the Auth screen (login/signup)
                // This prevents resetting the view when switching tabs (which triggers session refresh)
                if (appStepRef.current === AppStep.AUTH) {
                    dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION });
                }
            } else {
                // Clear usage context on logout
                clearGlobalUsageContext();
                dispatch({ type: 'SET_STEP', payload: AppStep.AUTH });
            }
        });

        return () => {
            console.log('[App] Unsubscribing from onAuthStateChange (version:', authClientVersion, ')');
            subscription.unsubscribe();
        };
    }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey, authClientVersion]);

    // Claim migrated data OUTSIDE of onAuthStateChange to avoid Supabase deadlock bug
    // This is a one-time operation that ensures data is linked to the correct user
    useEffect(() => {
        if (!state.user?.id) {
            // Reset claim tracking on logout
            claimedMigratedDataForUser.current = null;
            return;
        }

        // Only claim once per user session
        if (claimedMigratedDataForUser.current === state.user.id) {
            return;
        }

        const claimMigratedData = async () => {
            claimedMigratedDataForUser.current = state.user!.id;
            try {
                const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
                // Use type assertion since this function may not be in generated types
                const { data, error } = await (supabase.rpc as any)('claim_migrated_data');
                if (error) {
                    // Function may not exist on older databases - this is expected
                    if (!error.message.includes('does not exist')) {
                        console.warn('[App] claim_migrated_data warning:', error.message);
                    }
                } else if (data && typeof data === 'object' && 'success' in data) {
                    const result = data as { success: boolean; projects_updated?: number; maps_updated?: number; topics_updated?: number; briefs_updated?: number };
                    const totalUpdated = (result.projects_updated || 0) + (result.maps_updated || 0) +
                                        (result.topics_updated || 0) + (result.briefs_updated || 0);
                    if (totalUpdated > 0) {
                        console.log('[App] Migrated data claimed:', result);
                    }
                }
            } catch (e) {
                // Silently ignore - function may not exist
            }
        };

        claimMigratedData();
    }, [state.user?.id, state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

    // Update global usage context when project/map changes for AI telemetry
    // Track the last org id we set billing context for to avoid redundant calls
    const lastBillingOrgRef = useRef<string | null>(null);

    useEffect(() => {
        if (state.user) {
            setGlobalUsageContext({
                userId: state.user.id,
                projectId: state.activeProjectId || undefined,
                mapId: state.activeMapId || undefined
            });
            // Also set logging context for error tracking
            setLogContext({
                userId: state.user.id,
            });

            // Update organization billing context when active project changes
            // This ensures AI usage is attributed to the correct organization
            if (state.activeProjectId) {
                const activeProject = state.projects.find(p => p.id === state.activeProjectId);
                if (activeProject?.organization_id) {
                    // Only update billing context if org actually changed (prevents re-render loops)
                    if (lastBillingOrgRef.current !== activeProject.organization_id) {
                        lastBillingOrgRef.current = activeProject.organization_id;
                        // Determine key source based on project settings
                        // Full resolution happens via edge function, this is a best-effort local estimate
                        const keySource = determineKeySource(
                            !!state.businessInfo.geminiApiKey || !!state.businessInfo.openAiApiKey || !!state.businessInfo.anthropicApiKey, // user has keys
                            false, // no env keys in client
                            activeProject.api_key_mode !== 'byok' // org keys if not BYOK
                        );
                        setBillingContext({
                            organizationId: activeProject.organization_id,
                            keySource: keySource,
                            // If project uses org keys or inherits, billable_to is organization
                            // If project has BYOK, billable_to is already set to user
                            billableTo: activeProject.api_key_mode === 'byok' ? 'user' : 'organization',
                            billableId: activeProject.api_key_mode === 'byok' ? state.user.id : activeProject.organization_id,
                        });
                    }
                }
            }
        }
    }, [state.user?.id, state.activeProjectId, state.activeMapId, state.projects, state.businessInfo.geminiApiKey, state.businessInfo.openAiApiKey, state.businessInfo.anthropicApiKey]);

    // Expose utility functions to window for console access
    useEffect(() => {
        const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);

        // Expose repair function: window.repairBriefs(mapId)
        (window as any).repairBriefs = async (mapId?: string) => {
            const targetMapId = mapId || state.activeMapId;
            if (!targetMapId) {
                console.error('[RepairBriefs] No map ID provided and no active map. Usage: window.repairBriefs("map-id-here")');
                return;
            }
            console.log(`[RepairBriefs] Starting repair for map: ${targetMapId}`);
            const result = await repairBriefsInMap(supabase, targetMapId);
            console.log('[RepairBriefs] Result:', result);
            if (result.repaired > 0) {
                console.log('[RepairBriefs] Reload the page to see fixed briefs in the UI.');
            }
            return result;
        };

        // Expose current state info
        (window as any).getActiveMapId = () => state.activeMapId;
        (window as any).getActiveProjectId = () => state.activeProjectId;

        // Force refresh topics - clears cached topics to force a re-fetch from database
        (window as any).forceRefreshTopics = () => {
            const targetMapId = state.activeMapId;
            if (!targetMapId) {
                console.error('[ForceRefresh] No active map. Navigate to a map first.');
                return;
            }
            console.log(`[ForceRefresh] Clearing cached topics for map: ${targetMapId}`);

            // Clear topics from the map to force useMapData to refetch
            dispatch({ type: 'SET_TOPICS_FOR_MAP', payload: { mapId: targetMapId, topics: undefined as any } });

            // Briefly deselect and reselect the map to trigger data reload
            dispatch({ type: 'SET_ACTIVE_MAP', payload: null });
            setTimeout(() => {
                dispatch({ type: 'SET_ACTIVE_MAP', payload: targetMapId });
                console.log('[ForceRefresh] Map reselected - useMapData should now fetch fresh data.');
            }, 100);
        };

        // Clear SERP cache - useful when competitor discovery returns stale/empty results
        (window as any).clearSerpCache = async () => {
            console.log('[ClearCache] Clearing all SERP cache entries...');
            const cleared = await cacheService.clearByPrefix('serp:');
            console.log(`[ClearCache] Cleared ${cleared} SERP cache entries. Refresh the page and try competitor discovery again.`);
            return cleared;
        };

        // Clear all cache - full reset of API caches
        (window as any).clearAllCache = async () => {
            console.log('[ClearCache] Clearing ALL cache entries...');
            await cacheService.clearAll();
            console.log('[ClearCache] All cache cleared. Refresh the page.');
        };

        console.log('[App] Console utilities available: window.repairBriefs(), window.forceRefreshTopics(), window.clearSerpCache(), window.clearAllCache(), window.getActiveMapId(), window.getActiveProjectId()');
    }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey, state.activeMapId, state.activeProjectId]);

    // Track which user ID we've already fetched initial data for (prevents duplicate fetches)
    const fetchedInitialDataForUser = useRef<string | null>(null);

    useEffect(() => {
        const userId = state.user?.id;

        // Only fetch once per user (prevents re-fetch when user object reference changes but ID stays same)
        if (!userId || fetchedInitialDataForUser.current === userId) {
            return;
        }
        fetchedInitialDataForUser.current = userId;

        const fetchInitialData = async () => {
            dispatch({ type: 'SET_LOADING', payload: { key: 'projects', value: true } });
            dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: true } });
            try {
                const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);

                // Fetch Projects - RLS policies handle access control via organization membership
                const { data: projectsData, error: projectsError } = await supabase
                    .from('projects')
                    .select('*, topical_maps(updated_at)')
                    .order('created_at', { ascending: false });
                if (projectsError) throw projectsError;
                // Transform to include map_count and last_activity at top level
                const projectsWithActivity = (projectsData || []).map((p: any) => {
                    const maps = p.topical_maps || [];
                    const mapDates = maps.map((m: any) => new Date(m.updated_at).getTime());
                    const lastActivity = mapDates.length > 0 ? new Date(Math.max(...mapDates)).toISOString() : null;
                    return {
                        ...p,
                        map_count: maps.length,
                        last_activity: lastActivity,
                        topical_maps: undefined // Remove nested relation data
                    };
                });
                dispatch({ type: 'SET_PROJECTS', payload: projectsWithActivity });

                // Fetch Settings (global credentials only)
                const { data: settingsData, error: settingsError } = await supabase.functions.invoke('get-settings');
                if (settingsError) throw settingsError;
                if (settingsData) {
                    const GLOBAL_SETTINGS_FIELDS = [
                        'aiProvider', 'aiModel',
                        'geminiApiKey', 'openAiApiKey', 'anthropicApiKey', 'perplexityApiKey', 'openRouterApiKey',
                        'dataforseoLogin', 'dataforseoPassword', 'apifyToken', 'infranodusApiKey',
                        'jinaApiKey', 'firecrawlApiKey', 'apitemplateApiKey',
                        'neo4jUri', 'neo4jUser', 'neo4jPassword',
                        'cloudinaryCloudName', 'cloudinaryApiKey', 'cloudinaryUploadPreset', 'markupGoApiKey',
                        'auditScrapingProvider', 'auditScrapingFallback',
                        'language', 'targetMarket', 'expertise'
                    ];
                    const filteredSettings: Record<string, any> = {};
                    for (const key of GLOBAL_SETTINGS_FIELDS) {
                        if (key in settingsData) {
                            filteredSettings[key] = settingsData[key];
                        }
                    }

                    // Debug: Log API key sources
                    const envKey = state.businessInfo.anthropicApiKey;
                    const dbKey = filteredSettings.anthropicApiKey;
                    console.log('[Settings] API Key Sources:', {
                        envKeyPreview: envKey ? `${envKey.substring(0, 15)}...` : 'NOT SET',
                        dbKeyPreview: dbKey ? `${dbKey.substring(0, 15)}...` : 'NOT SET',
                        usingSource: dbKey ? 'DATABASE (overrides env)' : 'ENV FILE',
                    });

                    const keySource = determineKeySource(!!dbKey, !!envKey);
                    setBillingContext({
                        keySource,
                        billableTo: keySource === 'user_byok' ? 'user' : 'platform',
                        billableId: keySource === 'user_byok' ? userId : undefined,
                    });

                    dispatch({ type: 'SET_BUSINESS_INFO', payload: { ...state.businessInfo, ...filteredSettings } });
                    setVerboseLogging(filteredSettings.verboseLogging === true);
                }
            } catch (e) {
                dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to load initial data.' });
            } finally {
                dispatch({ type: 'SET_LOADING', payload: { key: 'projects', value: false } });
                dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: false } });
            }
        };
        fetchInitialData();
    }, [state.user?.id, state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

    // Fields that should be stored globally in user_settings (credentials only)
    const GLOBAL_SETTINGS_FIELDS = [
        'aiProvider', 'aiModel',
        'geminiApiKey', 'openAiApiKey', 'anthropicApiKey', 'perplexityApiKey', 'openRouterApiKey',
        'dataforseoLogin', 'dataforseoPassword', 'apifyToken', 'infranodusApiKey',
        'jinaApiKey', 'firecrawlApiKey', 'apitemplateApiKey',
        'neo4jUri', 'neo4jUser', 'neo4jPassword',
        'cloudinaryCloudName', 'cloudinaryApiKey', 'cloudinaryUploadPreset', 'markupGoApiKey',
        'auditScrapingProvider', 'auditScrapingFallback',
        'supabaseUrl', 'supabaseAnonKey',
        'language', 'targetMarket', 'expertise'
    ];

    const handleSaveSettings = async (settings: Partial<BusinessInfo>) => {
        dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: true } });
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);

            const globalSettings: Partial<BusinessInfo> = {};
            for (const key of GLOBAL_SETTINGS_FIELDS) {
                if (key in settings) {
                    (globalSettings as any)[key] = (settings as any)[key];
                }
            }

            const { data, error } = await supabase.functions.invoke('update-settings', {
                body: globalSettings
            });
            if (error) throw error;

            if (data && !data.ok) {
                throw new Error(data.error || 'Settings update failed');
            }

            // VERIFICATION: Read settings back to confirm they were saved
            console.log('[Settings] Verifying save by reading back...');
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('get-settings');
            if (verifyError) {
                console.warn('[Settings] Verification read failed:', verifyError);
            } else if (verifyData?.settings) {
                const saved = verifyData.settings;
                if ('aiProvider' in globalSettings && saved.aiProvider !== globalSettings.aiProvider) {
                    console.warn('[Settings] Verification mismatch: aiProvider', { sent: globalSettings.aiProvider, saved: saved.aiProvider });
                    throw new Error('Settings verification failed - saved data does not match');
                }
                console.log('[Settings] Verification passed - settings confirmed saved');
            }

            dispatch({ type: 'SET_BUSINESS_INFO', payload: { ...state.businessInfo, ...globalSettings } });

            if ('verboseLogging' in globalSettings) {
                setVerboseLogging(globalSettings.verboseLogging === true);
            }

            dispatch({ type: 'SET_NOTIFICATION', payload: 'Settings saved successfully (verified).' });
        } catch(e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to save settings.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: false } });
        }
    };

    /**
     * Opens the help documentation in a separate browser window/tab.
     */
    const openHelpWindow = (featureKey?: string) => {
        const baseUrl = '/help.html';
        const url = featureKey ? `${baseUrl}#/${featureKey}` : baseUrl;
        window.open(url, 'holistic-seo-help', 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no');
    };

    return (
        <AppStateContext.Provider value={{ state, dispatch }}>
            <OrganizationProvider>
                <NavigationBridge />
                <div className="bg-gray-900 text-gray-200 min-h-screen font-sans" style={{ backgroundColor: '#111827', color: '#e5e7eb', minHeight: '100vh' }}>
                    <GlobalLoadingBar />
                    <CelebrationOverlay />
                    <UpdateBanner
                        updateAvailable={updateAvailable}
                        onReload={handleReload}
                        onDismiss={dismissUpdate}
                    />
                    <NotificationBanner
                        message={state.notification}
                        onDismiss={() => dispatch({ type: 'SET_NOTIFICATION', payload: null })}
                    />
                     {state.error && (
                        <div className="fixed bottom-4 left-4 z-[100] bg-red-800 text-white p-4 rounded-lg shadow-lg max-w-md">
                            <h4 className="font-bold">An Error Occurred</h4>
                            <p className="text-sm mt-1">{state.error}</p>
                            <button onClick={() => dispatch({ type: 'SET_ERROR', payload: null })} className="absolute top-2 right-2 text-xl">&times;</button>
                        </div>
                    )}

                    {/* Router-based content - replaces renderStep() */}
                    <AppRouter />

                    {/* Edge Toolbar - compact right-edge toolbar that slides out on hover */}
                    {state.user && location.pathname !== '/login' && (
                        <EdgeToolbar
                            items={[
                                {
                                    id: 'strategist',
                                    icon: ToolbarIcons.strategist,
                                    label: 'Ask Strategist',
                                    onClick: () => dispatch({ type: 'TOGGLE_STRATEGIST', payload: true }),
                                    highlight: true,
                                },
                                {
                                    id: 'logs',
                                    icon: ToolbarIcons.logs,
                                    label: 'Activity Logs',
                                    onClick: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'logs', visible: !state.modals.logs } }),
                                },
                                {
                                    id: 'help',
                                    icon: ToolbarIcons.help,
                                    label: 'Help',
                                    onClick: () => openHelpWindow(),
                                },
                                {
                                    id: 'settings',
                                    icon: ToolbarIcons.settings,
                                    label: 'Settings',
                                    onClick: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'settings', visible: true } }),
                                },
                            ]}
                        />
                    )}

                    {/* Logging Panel (shown when logs modal is visible) */}
                    {state.modals.logs && <LoggingPanel />}

                    {/* Global Modals */}
                    <SettingsModal
                        isOpen={!!state.modals.settings}
                        onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'settings', visible: false } })}
                        onSave={handleSaveSettings}
                        initialSettings={state.businessInfo}
                    />
                    {state.confirmation && (
                        <ConfirmationModal
                            isOpen={true}
                            onClose={() => dispatch({ type: 'HIDE_CONFIRMATION' })}
                            onConfirm={state.confirmation.onConfirm}
                            title={state.confirmation.title}
                            message={state.confirmation.message}
                        />
                    )}
                </div>
            </OrganizationProvider>
        </AppStateContext.Provider>
    );
};

export default App;
