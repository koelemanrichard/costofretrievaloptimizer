
// App.tsx
import React, { useEffect, useReducer } from 'react';
import { AppStateContext, appReducer, initialState } from './state/appState';
import { AppStep, BusinessInfo, Project, TopicalMap } from './types';
import { getSupabaseClient } from './services/supabaseClient';
import { parseTopicalMap, normalizeRpcData, parseProject } from './utils/parsers';

// Import Screens
import AuthScreen from './components/AuthScreen';
import ProjectSelectionScreen from './components/ProjectSelectionScreen';
import ProjectWorkspace from './components/ProjectWorkspace';
import AnalysisStatusScreen from './components/AnalysisStatusScreen';
import { SiteAnalysisToolV2 } from './components/site-analysis';

// Import Global UI
import SettingsModal from './components/SettingsModal';
import { NotificationBanner } from './components/ui/NotificationBanner';
import ConfirmationModal from './components/ui/ConfirmationModal';
import HelpModal from './components/HelpModal';
import GlobalLoadingBar from './components/ui/GlobalLoadingBar';
import LoggingPanel from './components/LoggingPanel';

const App: React.FC = () => {
    const [state, dispatch] = useReducer(appReducer, initialState);

    useEffect(() => {
        const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            dispatch({ type: 'SET_USER', payload: session?.user ?? null });
            if (session?.user) {
                dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION });
            } else {
                dispatch({ type: 'SET_STEP', payload: AppStep.AUTH });
            }
        });

        return () => subscription.unsubscribe();
    }, [state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey]);
    
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

                    // Fetch Settings
                    const { data: settingsData, error: settingsError } = await supabase.functions.invoke('get-settings');
                    if (settingsError) throw settingsError;
                    if (settingsData) {
                        dispatch({ type: 'SET_BUSINESS_INFO', payload: { ...state.businessInfo, ...settingsData } });
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
                        const { error } = await supabase.rpc('delete_project', { p_project_id: project.id });
                        if (error) throw error;
                        dispatch({ type: 'DELETE_PROJECT', payload: { projectId: project.id } });
                        dispatch({ type: 'SET_NOTIFICATION', payload: `Project "${project.project_name}" deleted.` });
                    } catch (e) {
                        dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to delete project.' });
                    } finally {
                        dispatch({ type: 'HIDE_CONFIRMATION' });
                    }
                }
            }
        });
    };

    const handleSaveSettings = async (settings: Partial<BusinessInfo>) => {
        dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: true } });
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { data, error } = await supabase.functions.invoke('update-settings', {
                body: settings
            });
            if (error) throw error;
            // Optimistically update local state with what we sent. The backend confirms it's saved.
            dispatch({ type: 'SET_BUSINESS_INFO', payload: { ...state.businessInfo, ...settings } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Settings saved successfully.' });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'settings', visible: false } });
        } catch(e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to save settings.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: false } });
        }
    };

    const renderStep = () => {
        switch (state.appStep) {
            case AppStep.AUTH: return <AuthScreen />;
            case AppStep.PROJECT_SELECTION: return <ProjectSelectionScreen onCreateProject={handleCreateProject} onLoadProject={handleLoadProject} onInitiateDeleteProject={handleInitiateDeleteProject} />;
            case AppStep.ANALYSIS_STATUS: return <AnalysisStatusScreen />;
            case AppStep.SITE_ANALYSIS: return <SiteAnalysisToolV2 onClose={() => dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION })} />;
            case AppStep.PROJECT_WORKSPACE:
            case AppStep.BUSINESS_INFO:
            case AppStep.PILLAR_WIZARD:
            case AppStep.EAV_WIZARD:
            case AppStep.COMPETITOR_WIZARD:
            case AppStep.PROJECT_DASHBOARD:
                return <ProjectWorkspace />;
            default: return <p>Unknown application step.</p>;
        }
    };

    return (
        <AppStateContext.Provider value={{ state, dispatch }}>
            <div className="bg-gray-900 text-gray-200 min-h-screen font-sans">
                <GlobalLoadingBar />
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
                
                <div className="container mx-auto px-4 py-8">
                    {renderStep()}
                </div>

                <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
                    <LoggingPanel />
                    <button onClick={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'help', visible: true }})} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 w-10 flex items-center justify-center rounded-full shadow-lg text-xl" title="Help">?</button>
                    <button onClick={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'settings', visible: true }})} className="bg-gray-600 hover:bg-gray-700 text-white font-bold h-10 w-10 flex items-center justify-center rounded-full shadow-lg" title="Settings">⚙️</button>
                </div>

                {/* Global Modals */}
                <SettingsModal 
                    isOpen={!!state.modals.settings}
                    onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'settings', visible: false } })}
                    onSave={handleSaveSettings}
                    initialSettings={state.businessInfo}
                />
                <HelpModal 
                    isOpen={!!state.modals.help}
                    onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'help', visible: false } })}
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
        </AppStateContext.Provider>
    );
};

export default App;
