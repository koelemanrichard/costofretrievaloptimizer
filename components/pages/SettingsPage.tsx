import React, { useCallback } from 'react';
import { useAppState } from '../../state/appState';
import { SettingsFormContent } from '../modals';
import { getSupabaseClient } from '../../services/supabaseClient';
import type { BusinessInfo } from '../../types';

const GLOBAL_SETTINGS_FIELDS = [
    'aiProvider', 'aiModel',
    'geminiApiKey', 'openAiApiKey', 'anthropicApiKey', 'perplexityApiKey', 'openRouterApiKey',
    'dataforseoLogin', 'dataforseoPassword', 'apifyToken',
    'jinaApiKey', 'firecrawlApiKey', 'apitemplateApiKey',
    'neo4jUri', 'neo4jUser', 'neo4jPassword',
    'cloudinaryCloudName', 'cloudinaryApiKey', 'cloudinaryUploadPreset', 'markupGoApiKey',
    'auditScrapingProvider', 'auditScrapingFallback',
    'supabaseUrl', 'supabaseAnonKey',
    'language', 'targetMarket', 'expertise',
    'googleApiKey', 'googleKnowledgeGraphApiKey',
    'googleCloudNlpApiKey', 'serpApiKey',
    'enableUrlInspection', 'enableGa4Integration'
];

const SettingsPage: React.FC = () => {
    const { state, dispatch } = useAppState();

    const handleSave = useCallback(async (settings: Partial<BusinessInfo>) => {
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
            if (data && !data.ok) throw new Error(data.error || 'Settings update failed');

            // Verify save
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('get-settings');
            if (verifyError) {
                console.warn('[SettingsPage] Verification read failed:', verifyError);
            } else if (verifyData?.settings) {
                const saved = verifyData.settings;
                if ('aiProvider' in globalSettings && saved.aiProvider !== globalSettings.aiProvider) {
                    throw new Error('Settings verification failed - saved data does not match');
                }
            }

            dispatch({ type: 'SET_BUSINESS_INFO', payload: { ...state.businessInfo, ...globalSettings } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Settings saved successfully.' });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to save settings.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'settings', value: false } });
        }
    }, [state.businessInfo, dispatch]);

    return (
        <div className="-m-4">
            <SettingsFormContent
                onSave={handleSave}
                initialSettings={state.businessInfo}
                layout="page"
            />
        </div>
    );
};

export default SettingsPage;
