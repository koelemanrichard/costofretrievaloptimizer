import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../state/appState';
import { MapSelectionScreen } from '../screens';
import NewMapModal from '../modals/NewMapModal';
import { TopicalMap } from '../../types';
import { getSupabaseClient } from '../../services/supabaseClient';
import { verifiedDelete, verifiedBulkDelete } from '../../services/verifiedDatabaseService';
import { normalizeRpcData, parseTopicalMap } from '../../utils/parsers';
import { pipelineActions } from '../../state/slices/pipelineSlice';

/**
 * MapSelectionPage - Route wrapper for map selection within a project.
 * Adapts the existing MapSelectionScreen to URL routing.
 */
const MapSelectionPage: React.FC = () => {
    const { state, dispatch } = useAppState();
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();

    const activeProject = state.projects.find(p => p.id === projectId);
    const projectMaps = state.topicalMaps.filter(m => m.project_id === projectId);

    const handleSelectMap = (mapId: string) => {
        dispatch({ type: 'SET_ACTIVE_MAP', payload: mapId });
        const map = projectMaps.find(m => m.id === mapId);
        if (map?.pipeline_state?.isActive) {
            navigate(`/p/${projectId}/m/${mapId}/pipeline`);
        } else {
            navigate(`/p/${projectId}/m/${mapId}`);
        }
    };

    const handleOpenNewMapModal = () => {
        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'newMap', visible: true } });
    };

    const handleCreateNewMap = async (mapName: string) => {
        if (!projectId) return;
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { data, error } = await supabase.rpc('create_new_map', { p_project_id: projectId, p_map_name: mapName });
            if (error) throw error;

            const rawMap = normalizeRpcData(data);
            const newMap = parseTopicalMap(rawMap);

            dispatch({ type: 'ADD_TOPICAL_MAP', payload: newMap });
            dispatch({ type: 'SET_ACTIVE_MAP', payload: newMap.id });
            navigate(`/p/${projectId}/m/${newMap.id}/setup/business`);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to create map.';
            dispatch({ type: 'SET_ERROR', payload: message });
            throw e;
        }
    };

    const handleStartAnalysis = async () => {
        if (!projectId) return;

        // Reuse an existing empty import map if one exists (prevents duplicates)
        const existingImportMap = projectMaps.find(m =>
            m.name.endsWith('- Import') && (!m.topics || m.topics.length === 0)
        );

        if (existingImportMap) {
            dispatch({ type: 'SET_ACTIVE_MAP', payload: existingImportMap.id });
            dispatch({ type: 'SET_MIGRATION_WIZARD_PATH', payload: 'existing' });
            dispatch({ type: 'SET_VIEW_MODE', payload: 'MIGRATION' });
            navigate(`/p/${projectId}/m/${existingImportMap.id}`);
            return;
        }

        const mapName = `${activeProject?.project_name || 'Site'} - Import`;
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { data, error } = await supabase.rpc('create_new_map', { p_project_id: projectId, p_map_name: mapName });
            if (error) throw error;

            const rawMap = normalizeRpcData(data);
            const newMap = parseTopicalMap(rawMap);

            dispatch({ type: 'ADD_TOPICAL_MAP', payload: newMap });
            dispatch({ type: 'SET_ACTIVE_MAP', payload: newMap.id });
            dispatch({ type: 'SET_MIGRATION_WIZARD_PATH', payload: 'existing' });
            dispatch({ type: 'SET_VIEW_MODE', payload: 'MIGRATION' });
            navigate(`/p/${projectId}/m/${newMap.id}`);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to create map.';
            dispatch({ type: 'SET_ERROR', payload: message });
        }
    };

    const handleBackToProjects = () => {
        dispatch({ type: 'SET_ACTIVE_PROJECT', payload: null });
        navigate('/projects');
    };

    const handleRenameMap = async (mapId: string, newName: string) => {
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { error } = await supabase
                .from('topical_maps')
                .update({ name: newName })
                .eq('id', mapId);
            if (error) throw error;
            dispatch({ type: 'UPDATE_MAP_DATA', payload: { mapId, data: { name: newName } } });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to rename map.' });
        }
    };

    const handleInitiateDeleteMap = (map: TopicalMap) => {
        dispatch({
            type: 'SHOW_CONFIRMATION',
            payload: {
                title: 'Delete Topical Map?',
                message: `Are you sure you want to permanently delete the map "${map.name}"? This action cannot be undone.`,
                onConfirm: async () => {
                    try {
                        const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
                        const { data: topics } = await supabase.from('topics').select('id').eq('map_id', map.id);
                        const topicIds = (topics || []).map(t => t.id);

                        if (topicIds.length > 0) {
                            await verifiedBulkDelete(supabase, { table: 'content_briefs', operationDescription: `delete briefs for map ${map.id}` }, { column: 'topic_id', operator: 'in', value: topicIds });
                            await verifiedBulkDelete(supabase, { table: 'topics', operationDescription: `delete topics for map ${map.id}` }, { column: 'map_id', operator: 'eq', value: map.id }, topicIds.length);
                        }

                        await verifiedBulkDelete(supabase, { table: 'foundation_pages', operationDescription: `delete foundation pages for map ${map.id}` }, { column: 'map_id', operator: 'eq', value: map.id });
                        await verifiedBulkDelete(supabase, { table: 'navigation_structures', operationDescription: `delete navigation structures for map ${map.id}` }, { column: 'map_id', operator: 'eq', value: map.id });
                        await verifiedBulkDelete(supabase, { table: 'navigation_sync_status', operationDescription: `delete navigation sync status for map ${map.id}` }, { column: 'map_id', operator: 'eq', value: map.id });

                        const mapResult = await verifiedDelete(supabase, { table: 'topical_maps', operationDescription: `delete map "${map.name}"` }, { column: 'id', value: map.id });
                        if (!mapResult.success) throw new Error(mapResult.error || 'Map deletion verification failed');

                        dispatch({ type: 'DELETE_TOPICAL_MAP', payload: { mapId: map.id } });
                        dispatch({ type: 'SET_NOTIFICATION', payload: `Map "${map.name}" deleted.` });
                    } catch (e) {
                        dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to delete map.' });
                    } finally {
                        dispatch({ type: 'HIDE_CONFIRMATION' });
                    }
                }
            }
        });
    };

    const handleStartPipeline = async (isGreenfield: boolean, siteUrl?: string) => {
        if (!projectId) return;
        const mapName = isGreenfield
            ? `${activeProject?.project_name || 'Site'} - Pipeline`
            : `${siteUrl ? new URL(siteUrl).hostname : activeProject?.project_name || 'Site'} - Pipeline`;
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { data, error } = await supabase.rpc('create_new_map', { p_project_id: projectId, p_map_name: mapName });
            if (error) throw error;

            const rawMap = normalizeRpcData(data);
            const newMap = parseTopicalMap(rawMap);

            dispatch({ type: 'ADD_TOPICAL_MAP', payload: newMap });
            dispatch({ type: 'SET_ACTIVE_MAP', payload: newMap.id });
            dispatch(pipelineActions.activate(isGreenfield, siteUrl));
            navigate(`/p/${projectId}/m/${newMap.id}/pipeline/crawl`);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to create pipeline map.';
            dispatch({ type: 'SET_ERROR', payload: message });
        }
    };

    return (
        <>
            <MapSelectionScreen
                projectName={activeProject?.project_name || 'Project'}
                topicalMaps={projectMaps}
                onSelectMap={handleSelectMap}
                onCreateNewMap={handleOpenNewMapModal}
                onStartAnalysis={handleStartAnalysis}
                onStartPipeline={handleStartPipeline}
                onBackToProjects={handleBackToProjects}
                onInitiateDeleteMap={handleInitiateDeleteMap}
                onRenameMap={handleRenameMap}
            />
            <NewMapModal
                isOpen={!!state.modals.newMap}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'newMap', visible: false } })}
                onCreateMap={handleCreateNewMap}
            />
        </>
    );
};

export default MapSelectionPage;
