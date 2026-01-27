
// App.tsx
import React, { useEffect, useReducer, useRef, useState } from 'react';
import { AppStateContext, appReducer, initialState } from './state/appState';
import { AppStep, BusinessInfo, Project, TopicalMap } from './types';
import { getSupabaseClient, resetSupabaseClient, clearSupabaseAuthStorage } from './services/supabaseClient';
import { verifiedDelete, verifiedBulkDelete } from './services/verifiedDatabaseService';
import { parseTopicalMap, normalizeRpcData, parseProject, repairBriefsInMap } from './utils/parsers';
import { setGlobalUsageContext, clearGlobalUsageContext, setBillingContext, determineKeySource } from './services/telemetryService';
import { cacheService } from './services/cacheService';
import { setVerboseLogging } from './utils/debugLogger';
import { consoleLogger, setLogContext } from './services/consoleLogger';
import { apiCallLogger } from './services/apiCallLogger';
import { performanceLogger } from './services/performanceLogger';

// Import Screens
import { AuthScreen, ProjectSelectionScreen, AnalysisStatusScreen } from './components/screens';
import ProjectWorkspace from './components/ProjectWorkspace';
import { SiteAnalysisToolV2 } from './components/site-analysis';
import AdminDashboard from './components/admin/AdminDashboard';
import { QuotationTool } from './components/quotation';

// Import Global UI
import { SettingsModal } from './components/modals';
import { NotificationBanner } from './components/ui/NotificationBanner';
import ConfirmationModal from './components/ui/ConfirmationModal';
import GlobalLoadingBar from './components/ui/GlobalLoadingBar';
import LoggingPanel from './components/LoggingPanel';
import EdgeToolbar, { ToolbarIcons } from './components/ui/EdgeToolbar';
import MainLayout from './components/layout/MainLayout';
import { useVersionCheck, UpdateBanner } from './hooks/useVersionCheck';
import { CelebrationOverlay } from './components/gamification';
import { OrganizationProvider } from './components/organization';

const App: React.FC = () => {
    const [state, dispatch] = useReducer(appReducer, initialState);

    // Counter to force re-subscription when the Supabase client is reset
    // This ensures onAuthStateChange cleanup runs and re-subscribes on the new client
    const [authClientVersion, setAuthClientVersion] = useState(0);

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
                    // Dispatch user and navigate to project selection immediately
                    // This ensures the user sees the correct screen after page reload
                    // without waiting for onAuthStateChange which may have race conditions
                    dispatch({ type: 'SET_USER', payload: session.user });
                    dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION });
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
                // This returns all projects the user has access to:
                // - Projects in organizations they're a member of (has_project_access)
                // - Legacy projects they own directly (user_id = auth.uid())
                // Include topical_maps with updated_at to calculate map_count and last_activity
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
                    // Filter to only apply global settings fields, not project-specific data
                    // This prevents stale project data from user_settings overwriting defaults
                    const GLOBAL_SETTINGS_FIELDS = [
                        'aiProvider', 'aiModel',
                        'geminiApiKey', 'openAiApiKey', 'anthropicApiKey', 'perplexityApiKey', 'openRouterApiKey',
                        'dataforseoLogin', 'dataforseoPassword', 'apifyToken', 'infranodusApiKey',
                        'jinaApiKey', 'firecrawlApiKey', 'apitemplateApiKey',
                        'neo4jUri', 'neo4jUser', 'neo4jPassword',
                        'cloudinaryCloudName', 'cloudinaryApiKey', 'cloudinaryUploadPreset', 'markupGoApiKey',
                        'language', 'targetMarket', 'expertise'
                    ];
                    const filteredSettings: Record<string, any> = {};
                    for (const key of GLOBAL_SETTINGS_FIELDS) {
                        if (key in settingsData) {
                            filteredSettings[key] = settingsData[key];
                        }
                    }

                    // Debug: Log API key sources to help diagnose auth issues (once per user)
                    const envKey = state.businessInfo.anthropicApiKey;
                    const dbKey = filteredSettings.anthropicApiKey;
                    console.log('[Settings] API Key Sources:', {
                        envKeyPreview: envKey ? `${envKey.substring(0, 15)}...` : 'NOT SET',
                        dbKeyPreview: dbKey ? `${dbKey.substring(0, 15)}...` : 'NOT SET',
                        usingSource: dbKey ? 'DATABASE (overrides env)' : 'ENV FILE',
                        dbKeyLength: dbKey?.length || 0,
                        envKeyLength: envKey?.length || 0
                    });
                    // Debug: Log Apify token specifically
                    console.log('[Settings] Apify Token:', {
                        hasApifyToken: !!filteredSettings.apifyToken,
                        apifyTokenLength: filteredSettings.apifyToken?.length || 0,
                        apifyTokenPreview: filteredSettings.apifyToken ? `${filteredSettings.apifyToken.substring(0, 10)}...` : 'NOT SET',
                    });

                    // Set billing context for AI usage tracking
                    // This determines whether platform keys or user BYOK keys are being used
                    const keySource = determineKeySource(!!dbKey, !!envKey);
                    setBillingContext({
                        keySource,
                        // If user has their own key, they are billable; otherwise platform is billable
                        billableTo: keySource === 'user_byok' ? 'user' : 'platform',
                        billableId: keySource === 'user_byok' ? userId : undefined,
                    });

                    dispatch({ type: 'SET_BUSINESS_INFO', payload: { ...state.businessInfo, ...filteredSettings } });

                    // Initialize verbose logging state from settings
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


    const handleCreateProject = async (projectName: string, domain: string) => {
        if (!state.user) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'createProject', value: true } });
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { data, error } = await supabase.rpc('create_new_project', {
                p_project_data: { project_name: projectName, domain: domain, user_id: state.user.id }
            });
            if (error) throw error;

            // FIX: Use normalizeRpcData to handle array vs object response safely
            const rawProject = normalizeRpcData(data);
            const newProject = parseProject(rawProject);

            dispatch({ type: 'ADD_PROJECT', payload: newProject });
            dispatch({ type: 'SET_ACTIVE_PROJECT', payload: newProject.id });
            dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_WORKSPACE });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to create project.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'createProject', value: false } });
        }
    };

    const handleLoadProject = async (projectId: string) => {
        dispatch({ type: 'SET_LOADING', payload: { key: 'loadProject', value: true } });
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { data, error } = await supabase.from('topical_maps').select('*').eq('project_id', projectId);
            if (error) throw error;

            // Parse/Sanitize the data before state update to prevent "Minified React Error #31"
            // This ensures columns that are strings (like 'pillars' or 'business_info' if stored as strings in some versions,
            // or objects containing bad data) are converted to safe Application Domain Objects.
            const sanitizedMaps = (data || []).map((map: any) => parseTopicalMap(map));

            // Fetch topic COUNTS only (not full data) for UI display in merge modal, etc.
            // We deliberately DO NOT set map.topics here - that stays undefined so useMapData
            // can properly hydrate full topic data + briefs when the map is selected.
            const mapIds = sanitizedMaps.map(m => m.id);
            if (mapIds.length > 0) {
                const { data: topicsData, error: topicsError } = await supabase
                    .from('topics')
                    .select('id, map_id, type')
                    .in('map_id', mapIds);

                if (!topicsError && topicsData) {
                    // Calculate counts per map
                    const countsByMap = topicsData.reduce((acc, topic) => {
                        if (!acc[topic.map_id]) acc[topic.map_id] = { core: 0, outer: 0, total: 0 };
                        acc[topic.map_id].total++;
                        if (topic.type === 'core') acc[topic.map_id].core++;
                        else acc[topic.map_id].outer++;
                        return acc;
                    }, {} as Record<string, { core: number; outer: number; total: number }>);

                    // Set topicCounts on each map (NOT topics array)
                    sanitizedMaps.forEach(map => {
                        map.topicCounts = countsByMap[map.id] || { core: 0, outer: 0, total: 0 };
                    });
                }
            }

            // FIX: Corrected the dispatch order to prevent a race condition.
            // SET_ACTIVE_PROJECT clears the old map state, THEN SET_TOPICAL_MAPS populates it with new data.
            dispatch({ type: 'SET_ACTIVE_PROJECT', payload: projectId });
            dispatch({ type: 'SET_TOPICAL_MAPS', payload: sanitizedMaps });

            dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_WORKSPACE });
        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to load project maps.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'loadProject', value: false } });
        }
    };
    
    const handleInitiateDeleteProject = (project: Project) => {
        dispatch({
            type: 'SHOW_CONFIRMATION',
            payload: {
                title: 'Delete Project?',
                message: <>Are you sure you want to permanently delete the project <strong>"{project.project_name}"</strong>? This will delete all associated topical maps and content briefs. This action cannot be undone.</>,
                onConfirm: async () => {
                    try {
                        const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);

                        // Get all maps for this project
                        const { data: maps } = await supabase
                            .from('topical_maps')
                            .select('id')
                            .eq('project_id', project.id);

                        const mapIds = (maps || []).map(m => m.id);

                        // Delete related records for each map individually to avoid .in() issues
                        for (const mapId of mapIds) {
                            // Get topic IDs first - content_briefs uses topic_id, not map_id
                            const { data: topics } = await supabase.from('topics').select('id').eq('map_id', mapId);
                            const topicIds = (topics || []).map(t => t.id);

                            // Delete content_briefs by topic_id (cascade)
                            if (topicIds.length > 0) {
                                const briefsResult = await verifiedBulkDelete(
                                    supabase,
                                    { table: 'content_briefs', operationDescription: `delete briefs for map ${mapId}` },
                                    { column: 'topic_id', operator: 'in', value: topicIds }
                                );
                                if (!briefsResult.success) {
                                    console.warn(`[DeleteProject] Content briefs deletion issue for map ${mapId}:`, briefsResult.error);
                                }
                            }

                            // Delete topics - verified since this is critical
                            if (topicIds.length > 0) {
                                const topicsResult = await verifiedBulkDelete(
                                    supabase,
                                    { table: 'topics', operationDescription: `delete topics for map ${mapId}` },
                                    { column: 'map_id', operator: 'eq', value: mapId },
                                    topicIds.length
                                );
                                if (!topicsResult.success) {
                                    console.warn(`[DeleteProject] Topics deletion issue for map ${mapId}:`, topicsResult.error);
                                }
                            }

                            // Delete foundation pages and navigation (optional - may not exist)
                            const foundationResult = await verifiedBulkDelete(
                                supabase,
                                { table: 'foundation_pages', operationDescription: `delete foundation pages for map ${mapId}` },
                                { column: 'map_id', operator: 'eq', value: mapId }
                            );
                            if (!foundationResult.success && foundationResult.error && !foundationResult.error.includes('0 records')) {
                                console.warn(`[DeleteProject] Foundation pages deletion issue:`, foundationResult.error);
                            }

                            const navStructResult = await verifiedBulkDelete(
                                supabase,
                                { table: 'navigation_structures', operationDescription: `delete navigation structures for map ${mapId}` },
                                { column: 'map_id', operator: 'eq', value: mapId }
                            );
                            if (!navStructResult.success && navStructResult.error && !navStructResult.error.includes('0 records')) {
                                console.warn(`[DeleteProject] Navigation structures deletion issue:`, navStructResult.error);
                            }

                            const navSyncResult = await verifiedBulkDelete(
                                supabase,
                                { table: 'navigation_sync_status', operationDescription: `delete navigation sync status for map ${mapId}` },
                                { column: 'map_id', operator: 'eq', value: mapId }
                            );
                            if (!navSyncResult.success && navSyncResult.error && !navSyncResult.error.includes('0 records')) {
                                console.warn(`[DeleteProject] Navigation sync status deletion issue:`, navSyncResult.error);
                            }

                            // Delete the map itself - verified
                            const mapResult = await verifiedDelete(
                                supabase,
                                { table: 'topical_maps', operationDescription: `delete map ${mapId}` },
                                { column: 'id', value: mapId }
                            );
                            if (!mapResult.success) {
                                console.warn(`[DeleteProject] Map deletion issue for ${mapId}:`, mapResult.error);
                            }
                        }

                        // Delete the project itself - verified
                        const projectResult = await verifiedDelete(
                            supabase,
                            { table: 'projects', operationDescription: `delete project "${project.project_name}"` },
                            { column: 'id', value: project.id }
                        );
                        if (!projectResult.success) {
                            throw new Error(projectResult.error || 'Project deletion verification failed');
                        }

                        dispatch({ type: 'DELETE_PROJECT', payload: { projectId: project.id } });
                        dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Project "${project.project_name}" deleted (verified).` });
                    } catch (e) {
                        console.error('Delete project error:', e);
                        dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to delete project.' });
                    } finally {
                        dispatch({ type: 'HIDE_CONFIRMATION' });
                    }
                }
            }
        });
    };

    // Fields that should be stored globally in user_settings (credentials only)
    // Project-specific fields like projectName, domain, valueProp, etc. should be stored in topical_maps.business_info
    const GLOBAL_SETTINGS_FIELDS = [
        'aiProvider', 'aiModel',
        'geminiApiKey', 'openAiApiKey', 'anthropicApiKey', 'perplexityApiKey', 'openRouterApiKey',
        'dataforseoLogin', 'dataforseoPassword', 'apifyToken', 'infranodusApiKey',
        'jinaApiKey', 'firecrawlApiKey', 'apitemplateApiKey',
        'neo4jUri', 'neo4jUser', 'neo4jPassword',
        'cloudinaryCloudName', 'cloudinaryApiKey', 'cloudinaryUploadPreset', 'markupGoApiKey',
        'supabaseUrl', 'supabaseAnonKey',
        'language', 'targetMarket', 'expertise' // These can be global defaults
    ];

    const handleSaveSettings = async (settings: Partial<BusinessInfo>) => {
        dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: true } });
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);

            // Filter to only save global credential fields to user_settings
            // Project-specific fields (projectName, domain, valueProp, etc.) should NOT be in global settings
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

            // Check response body for errors (Edge Function returns { ok: false, error: "..." } on failure)
            if (data && !data.ok) {
                throw new Error(data.error || 'Settings update failed');
            }

            // VERIFICATION: Read settings back to confirm they were saved
            console.log('[Settings] Verifying save by reading back...');
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('get-settings');
            if (verifyError) {
                console.warn('[Settings] Verification read failed:', verifyError);
                // Don't throw - the save likely succeeded, just verification failed
            } else if (verifyData?.settings) {
                // Verify at least one key field matches what we sent
                const saved = verifyData.settings;
                if ('aiProvider' in globalSettings && saved.aiProvider !== globalSettings.aiProvider) {
                    console.warn('[Settings] Verification mismatch: aiProvider', { sent: globalSettings.aiProvider, saved: saved.aiProvider });
                    throw new Error('Settings verification failed - saved data does not match');
                }
                console.log('[Settings] Verification passed - settings confirmed saved');
            }

            // Update local state with what we sent
            dispatch({ type: 'SET_BUSINESS_INFO', payload: { ...state.businessInfo, ...globalSettings } });

            // Update verbose logging state if it was changed
            if ('verboseLogging' in globalSettings) {
                setVerboseLogging(globalSettings.verboseLogging === true);
            }

            dispatch({ type: 'SET_NOTIFICATION', payload: 'Settings saved successfully (verified).' });
            // Keep modal open so user can see the save confirmation
        } catch(e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to save settings.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: false } });
        }
    };

    /**
     * Opens the help documentation in a separate browser window/tab.
     * This allows users to continue working while viewing help content.
     * @param featureKey - Optional feature key to deep-link to a specific article
     */
    const openHelpWindow = (featureKey?: string) => {
        const baseUrl = '/help.html';
        const url = featureKey ? `${baseUrl}#/${featureKey}` : baseUrl;
        window.open(url, 'holistic-seo-help', 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no');
    };

    const renderStep = () => {
        // Debug: Log current app step to help diagnose blank screen issues
        console.log('[App] Rendering step:', state.appStep, 'user:', !!state.user, 'activeProject:', !!state.activeProjectId, 'activeMap:', !!state.activeMapId);

        switch (state.appStep) {
            case AppStep.AUTH: return <AuthScreen />;
            case AppStep.PROJECT_SELECTION: return <ProjectSelectionScreen onCreateProject={handleCreateProject} onLoadProject={handleLoadProject} onInitiateDeleteProject={handleInitiateDeleteProject} />;
            case AppStep.ANALYSIS_STATUS: return <AnalysisStatusScreen />;
            case AppStep.SITE_ANALYSIS: return <SiteAnalysisToolV2 onClose={() => dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION })} />;
            case AppStep.ADMIN: return <AdminDashboard />;
            case AppStep.QUOTATION: return <QuotationTool onClose={() => dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION })} />;
            case AppStep.PROJECT_WORKSPACE:
            case AppStep.BUSINESS_INFO:
            case AppStep.PILLAR_WIZARD:
            case AppStep.EAV_WIZARD:
            case AppStep.COMPETITOR_WIZARD:
            case AppStep.BLUEPRINT_WIZARD:
            case AppStep.PROJECT_DASHBOARD:
                return <ProjectWorkspace />;
            default:
                console.warn('[App] Unknown app step:', state.appStep);
                return <p>Unknown application step: {state.appStep}</p>;
        }
    };

    return (
        <AppStateContext.Provider value={{ state, dispatch }}>
            <OrganizationProvider>
                <MainLayout>
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

                    {/* Main content container. Full width for admin/site-analysis/quality-demo, constrained for wizards if needed. */}
                    <div className={(state.appStep === AppStep.ADMIN || state.appStep === AppStep.SITE_ANALYSIS) ? "w-full" : "container mx-auto px-4 py-8"}>
                        {renderStep()}
                    </div>

                    {/* Edge Toolbar - compact right-edge toolbar that slides out on hover */}
                    {/* Only show when logged in and not on auth screen */}
                    {state.user && state.appStep !== AppStep.AUTH && (
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
                </MainLayout>
            </OrganizationProvider>
        </AppStateContext.Provider>
    );
};

export default App;
