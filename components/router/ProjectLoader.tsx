import React, { useEffect } from 'react';
import { Outlet, useParams, Navigate } from 'react-router-dom';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import { batchedIn } from '../../utils/supabaseBatchQuery';
import { parseTopicalMap } from '../../utils/parsers';

/**
 * ProjectLoader - Reads :projectId from URL params and syncs it to app state.
 * Fetches maps for the project if not already loaded.
 * Renders <Outlet /> when ready.
 */
const ProjectLoader: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { state, dispatch } = useAppState();

    // Sync projectId from URL to state
    useEffect(() => {
        if (projectId && state.activeProjectId !== projectId) {
            dispatch({ type: 'SET_ACTIVE_PROJECT', payload: projectId });
        }
    }, [projectId, state.activeProjectId, dispatch]);

    // Fetch maps if project just changed and we don't have maps loaded
    useEffect(() => {
        if (!projectId || state.activeProjectId !== projectId) return;

        // Check if we already have maps loaded for this project
        const hasProjectMaps = state.topicalMaps.some(m => m.project_id === projectId);
        if (hasProjectMaps) return;

        const fetchMaps = async () => {
            dispatch({ type: 'SET_LOADING', payload: { key: 'loadProject', value: true } });
            try {
                const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
                const { data, error } = await supabase.from('topical_maps').select('*').eq('project_id', projectId);
                if (error) throw error;

                const sanitizedMaps = (data || []).map((map: any) => parseTopicalMap(map));

                // Fetch topic counts
                const mapIds = sanitizedMaps.map(m => m.id);
                if (mapIds.length > 0) {
                    const { data: topicsData, error: topicsError } = await batchedIn(
                        supabase, 'topics', 'id, map_id, type', 'map_id', mapIds
                    );

                    if (!topicsError && topicsData) {
                        const countsByMap = topicsData.reduce((acc: any, topic: any) => {
                            if (!acc[topic.map_id]) acc[topic.map_id] = { core: 0, outer: 0, total: 0 };
                            acc[topic.map_id].total++;
                            if (topic.type === 'core') acc[topic.map_id].core++;
                            else acc[topic.map_id].outer++;
                            return acc;
                        }, {} as Record<string, { core: number; outer: number; total: number }>);

                        sanitizedMaps.forEach((map: any) => {
                            map.topicCounts = countsByMap[map.id] || { core: 0, outer: 0, total: 0 };
                        });
                    }
                }

                dispatch({ type: 'SET_TOPICAL_MAPS', payload: sanitizedMaps });
            } catch (e) {
                dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to load project maps.' });
            } finally {
                dispatch({ type: 'SET_LOADING', payload: { key: 'loadProject', value: false } });
            }
        };

        fetchMaps();
    }, [projectId, state.activeProjectId, state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey, dispatch]);

    // Validate project exists in state
    if (projectId && state.projects.length > 0) {
        const projectExists = state.projects.some(p => p.id === projectId);
        if (!projectExists) {
            return <Navigate to="/projects" replace />;
        }
    }

    return <Outlet />;
};

export default ProjectLoader;
