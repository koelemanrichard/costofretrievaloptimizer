import React, { useState, useEffect } from 'react';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import { Card } from '../ui/Card';
import { Loader } from '../ui/Loader';
import { Button } from '../ui/Button';
import { AppStep } from '../../types';

const AnalysisStatusScreen: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { activeProjectId, businessInfo } = state;
    const [status, setStatus] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>('Initializing analysis...');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!activeProjectId) {
            setError("No active project found.");
            return;
        }

        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

        const fetchStatus = async () => {
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('status, status_message')
                    .eq('id', activeProjectId)
                    .single();
                
                if (error) throw error;

                if (data) {
                    setStatus(data.status);
                    setStatusMessage(data.status_message);
                    if (data.status === 'complete' || data.status === 'error') {
                        clearInterval(intervalId);
                    }
                }
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to fetch project status.";
                setError(message);
                clearInterval(intervalId);
            }
        };

        const intervalId = setInterval(fetchStatus, 5000); // Poll every 5 seconds
        fetchStatus(); // Initial fetch

        return () => clearInterval(intervalId);
    }, [activeProjectId, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey]);

    const handleBackToProjects = () => {
        dispatch({ type: 'SET_ACTIVE_PROJECT', payload: null });
        // FIX: Changed the payload from a string literal to the AppStep enum member for type safety.
        dispatch({ type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION });
    };

    return (
        <Card className="max-w-2xl w-full p-8 text-center">
            <h1 className="text-3xl font-bold text-white">Website Analysis in Progress</h1>
            <p className="text-gray-400 mt-2">The AI is analyzing your website. This process can take several minutes.</p>

            <div className="my-8 flex flex-col items-center justify-center">
                {status !== 'complete' && status !== 'error' && <Loader className="w-12 h-12" />}
                {status === 'complete' && <div className="text-6xl">✅</div>}
                {status === 'error' && <div className="text-6xl">❌</div>}

                <div className="mt-4">
                    <p className="text-lg font-semibold text-white">{statusMessage || 'Please wait...'}</p>
                    {status && <p className="text-sm text-gray-500 font-mono mt-1">Current Status: {status}</p>}
                </div>
                
                {error && <p className="text-red-400 mt-4 bg-red-900/20 p-3 rounded-md">{error}</p>}
            </div>

            {(status === 'complete' || status === 'error') && (
                <div className="flex justify-center gap-4">
                    {status === 'complete' && <Button>View Analysis Report</Button>}
                    <Button onClick={handleBackToProjects} variant="secondary">Back to Projects</Button>
                </div>
            )}
        </Card>
    );
};

export default AnalysisStatusScreen;
