
// App.tsx
import React, { useEffect, useReducer, useRef } from 'react';
import { AppStateContext, appReducer, initialState } from './state/appState';
import { AppStep, BusinessInfo, Project, TopicalMap } from './types';
import { getSupabaseClient, resetSupabaseClient, clearSupabaseAuthStorage } from './services/supabaseClient';
import { verifiedDelete, verifiedBulkDelete } from './services/verifiedDatabaseService';
import { parseTopicalMap, normalizeRpcData, parseProject, repairBriefsInMap } from './utils/parsers';
import { setGlobalUsageContext, clearGlobalUsageContext } from './services/telemetryService';

// Import Screens
import { AuthScreen, ProjectSelectionScreen, AnalysisStatusScreen } from './components/screens';
import ProjectWorkspace from './components/ProjectWorkspace';
import { SiteAnalysisToolV2 } from './components/site-analysis';
import AdminDashboard from './components/admin/AdminDashboard';

// Import Global UI
import { SettingsModal } from './components/modals';
import { NotificationBanner } from './components/ui/NotificationBanner';
import ConfirmationModal from './components/ui/ConfirmationModal';
import GlobalLoadingBar from './components/ui/GlobalLoadingBar';
import LoggingPanel from './components/LoggingPanel';
import FooterDock, { DockIcons } from './components/ui/FooterDock';
import MainLayout from './components/layout/MainLayout';
import { useVersionCheck, UpdateBanner } from './hooks/useVersionCheck';

const App: React.FC = () => {
    const [state, dispatch] = useReducer(appReducer, initialState);

    // Version check for detecting app updates after deployments
    const { updateAvailable, handleReload, dismissUpdate } = useVersionCheck(60000); // Check every 60s

    // Use a ref to track the current step without triggering re-renders or effect dependencies
    const appStepRef = useRef(state.appStep);

    // Keep the ref synchronized with state
    useEffect(() => {
        appStepRef.current = state.appStep;
    }, [state.appStep]);

    // Check for existing session on app initialization
    // This handles stale sessions after hot reload by attempting to get the current session
    // If the session is invalid/expired, it will be cleared and user redirected to auth
    useEffect(() => {
        const checkInitialSession = async () => {
            try {
                const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);

                // Add timeout to prevent hanging on stale sessions
                const timeoutPromise = new Promise<{ data: { session: null }, error: Error }>((_, reject) =>
                    setTimeout(() => reject(new Error('Session check timeout')), 5000)
                );

                const sessionPromise = supabase.auth.getSession();
                const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);

                if (error) {
                    console.warn('[App] Session check error, clearing stale session:', error.message);
                    // Clear all Supabase auth storage to prevent stale data
                    clearSupabaseAuthStorage();
                    resetSupabaseClient(true);
                    dispatch({ type: 'SET_USER', payload: null });
                    dispatch({ type: 'SET_STEP', payload: AppStep.AUTH });
                } else if (session?.user) {
                    // Valid session found - set user but don't navigate (let onAuthStateChange handle that)
                    dispatch({ type: 'SET_USER', payload: session.user });
                    setGlobalUsageContext({ userId: session.user.id });
                    if (state.appStep === AppStep.AUTH) {
                        dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION });
                    }
                } else {
                    // No session found - ensure clean state
                    // This handles the case where localStorage has stale data but no valid session
                    console.log('[App] No session found, ensuring clean auth state');
                    clearSupabaseAuthStorage();
                    resetSupabaseClient(true);
                }
            } catch (e) {
                console.error('[App] Session initialization failed:', e);
                // Reset everything on critical error (including timeout)
                clearSupabaseAuthStorage();
                resetSupabaseClient(true);
                dispatch({ type: 'SET_USER', payload: null });
                dispatch({ type: 'SET_STEP', payload: AppStep.AUTH });
            }
        };

        checkInitialSession();
    }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

    useEffect(() => {
        const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            dispatch({ type: 'SET_USER', payload: session?.user ?? null });
            if (session?.user) {
                // Set global usage context for AI telemetry tracking
                setGlobalUsageContext({ userId: session.user.id });

                // Claim migrated data - updates user_id references after database migration
                // This is a one-time operation that ensures data is linked to the correct user
                if (event === 'SIGNED_IN') {
                    try {
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
                }

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

        return () => subscription.unsubscribe();
    }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);

    // Update global usage context when project/map changes for AI telemetry
    useEffect(() => {
        if (state.user) {
            setGlobalUsageContext({
                userId: state.user.id,
                projectId: state.activeProjectId || undefined,
                mapId: state.activeMapId || undefined
            });
        }
    }, [state.user, state.activeProjectId, state.activeMapId]);

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

        console.log('[App] Console utilities available: window.repairBriefs(), window.forceRefreshTopics(), window.getActiveMapId(), window.getActiveProjectId()');
    }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey, state.activeMapId, state.activeProjectId]);

    useEffect(() => {
        const fetchInitialData = async () => {
            if (state.user) {
                dispatch({ type: 'SET_LOADING', payload: { key: 'projects', value: true } });
                dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: true } });
                try {
                    const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
                    
                    // Fetch Projects
                    const { data: projectsData, error: projectsError } = await supabase
                        .from('projects')
                        .select('*')
                        .eq('user_id', state.user.id);
                    if (projectsError) throw projectsError;
                    dispatch({ type: 'SET_PROJECTS', payload: projectsData || [] });

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

                        // Debug: Log API key sources to help diagnose auth issues
                        const envKey = state.businessInfo.anthropicApiKey;
                        const dbKey = filteredSettings.anthropicApiKey;
                        console.log('[Settings] API Key Sources:', {
                            envKeyPreview: envKey ? `${envKey.substring(0, 15)}...` : 'NOT SET',
                            dbKeyPreview: dbKey ? `${dbKey.substring(0, 15)}...` : 'NOT SET',
                            usingSource: dbKey ? 'DATABASE (overrides env)' : 'ENV FILE',
                            dbKeyLength: dbKey?.length || 0,
                            envKeyLength: envKey?.length || 0
                        });

                        dispatch({ type: 'SET_BUSINESS_INFO', payload: { ...state.businessInfo, ...filteredSettings } });
                    }
                } catch (e) {
                    dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to load initial data.' });
                } finally {
                    dispatch({ type: 'SET_LOADING', payload: { key: 'projects', value: false } });
                    dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: false } });
                }
            }
        };
        fetchInitialData();
    }, [state.user, state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);


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

            // Update local state with what we sent
            dispatch({ type: 'SET_BUSINESS_INFO', payload: { ...state.businessInfo, ...globalSettings } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Settings saved successfully.' });
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
        switch (state.appStep) {
            case AppStep.AUTH: return <AuthScreen />;
            case AppStep.PROJECT_SELECTION: return <ProjectSelectionScreen onCreateProject={handleCreateProject} onLoadProject={handleLoadProject} onInitiateDeleteProject={handleInitiateDeleteProject} />;
            case AppStep.ANALYSIS_STATUS: return <AnalysisStatusScreen />;
            case AppStep.SITE_ANALYSIS: return <SiteAnalysisToolV2 onClose={() => dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION })} />;
            case AppStep.ADMIN: return <AdminDashboard />; // New Admin Route
            case AppStep.PROJECT_WORKSPACE:
            case AppStep.BUSINESS_INFO:
            case AppStep.PILLAR_WIZARD:
            case AppStep.EAV_WIZARD:
            case AppStep.COMPETITOR_WIZARD:
            case AppStep.BLUEPRINT_WIZARD:
            case AppStep.PROJECT_DASHBOARD:
                return <ProjectWorkspace />;
            default: return <p>Unknown application step.</p>;
        }
    };

    return (
        <AppStateContext.Provider value={{ state, dispatch }}>
            <MainLayout>
                <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
                    <GlobalLoadingBar />
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

                    {/* Main content container. Full width for admin/site-analysis, constrained for wizards if needed. */}
                    <div className={(state.appStep === AppStep.ADMIN || state.appStep === AppStep.SITE_ANALYSIS) ? "w-full" : "container mx-auto px-4 py-8"}>
                        {renderStep()}
                    </div>

                    {/* Footer Dock - collapsible corner toolbar */}
                    {/* Only show when logged in and not on auth screen - prevents showing during stale session race conditions */}
                    {state.user && state.appStep !== AppStep.AUTH && (
                        <FooterDock
                            items={[
                                {
                                    id: 'logs',
                                    icon: DockIcons.logs,
                                    label: 'Activity Logs',
                                    onClick: () => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'logs', visible: !state.modals.logs } }),
                                },
                                {
                                    id: 'help',
                                    icon: DockIcons.help,
                                    label: 'Help',
                                    onClick: () => openHelpWindow(),
                                },
                                {
                                    id: 'settings',
                                    icon: DockIcons.settings,
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
        </AppStateContext.Provider>
    );
};

export default App;
