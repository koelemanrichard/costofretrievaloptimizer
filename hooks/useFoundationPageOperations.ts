
import { useCallback, useEffect, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { AppAction } from '../state/appState';
import {
    BusinessInfo,
    TopicalMap,
    EnrichedTopic,
    SEOPillars,
    FoundationPage,
    FoundationPageType,
    NAPData,
    NavigationStructure,
} from '../types';
import * as foundationPagesService from '../services/ai/foundationPages';
import { getSupabaseClient } from '../services/supabaseClient';
import { repairBriefsInMap } from '../utils/parsers';

// ============================================
// useFoundationPageOperations
// Extracted from ProjectDashboardContainer - handles foundation pages CRUD,
// NAP data operations, navigation structure, briefing repairs, and
// business info / brand kit save handlers.
// ============================================

interface UseFoundationPageOperationsParams {
    activeMapId: string | null;
    activeMap: TopicalMap | undefined;
    effectiveBusinessInfo: BusinessInfo;
    businessInfo: BusinessInfo;
    user: User | null;
    dispatch: React.Dispatch<AppAction>;
    allTopics: EnrichedTopic[];
    websiteStructure: {
        foundationPages: any[];
        navigation: any;
    };
}

export function useFoundationPageOperations({
    activeMapId,
    activeMap,
    effectiveBusinessInfo,
    businessInfo,
    user,
    dispatch,
    allTopics,
    websiteStructure,
}: UseFoundationPageOperationsParams) {

    // Get foundation pages from state
    const foundationPages = useMemo(() => websiteStructure?.foundationPages || [], [websiteStructure?.foundationPages]);
    const napData = useMemo(() => {
        // Get NAP data from the first foundation page that has it, or undefined
        const pageWithNap = foundationPages.find((p: any) => p.nap_data);
        return pageWithNap?.nap_data;
    }, [foundationPages]);

    // Get navigation structure from state
    const navigation = useMemo(() => websiteStructure?.navigation || null, [websiteStructure?.navigation]);

    // Load foundation pages and navigation when map changes
    useEffect(() => {
        const loadFoundationPagesAndNavigation = async () => {
            if (!activeMapId) return;

            // Clear existing data first to prevent showing stale data from previous map
            dispatch({ type: 'SET_FOUNDATION_PAGES', payload: [] });
            dispatch({ type: 'SET_NAVIGATION', payload: null });

            try {
                // Load foundation pages for this specific map
                const pages = await foundationPagesService.loadFoundationPages(activeMapId);
                dispatch({ type: 'SET_FOUNDATION_PAGES', payload: pages });

                // Load navigation structure for this specific map
                const nav = await foundationPagesService.loadNavigationStructure(activeMapId);
                dispatch({ type: 'SET_NAVIGATION', payload: nav });
            } catch (error) {
                console.error('Failed to load foundation pages/navigation:', error);
            }
        };
        loadFoundationPagesAndNavigation();
    }, [activeMapId, dispatch]);

    const handleSaveNAPData = useCallback(async (newNapData: NAPData) => {
        if (!activeMapId || !user?.id) {
            dispatch({ type: 'SET_ERROR', payload: 'Cannot save NAP data: missing map or user session.' });
            return;
        }

        // If no foundation pages exist yet, store NAP data in map's business_info temporarily
        if (foundationPages.length === 0) {
            try {
                const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
                const currentBusinessInfo = activeMap?.business_info || {};
                const updatedBusinessInfo = {
                    ...currentBusinessInfo,
                    napData: newNapData,
                };

                const { error } = await supabase
                    .from('topical_maps')
                    .update({ business_info: updatedBusinessInfo as any })
                    .eq('id', activeMapId);

                if (error) throw error;

                // Update local state
                dispatch({ type: 'UPDATE_MAP_DATA', payload: { mapId: activeMapId, data: { business_info: updatedBusinessInfo } } });
                dispatch({ type: 'SET_NOTIFICATION', payload: 'NAP data saved. Generate foundation pages to apply it.' });
            } catch (error) {
                dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to save NAP data.' });
            }
            return;
        }

        // Update NAP data on all foundation pages
        const updatedPages = foundationPages.map((page: any) => ({
            ...page,
            nap_data: newNapData
        }));

        try {
            await foundationPagesService.saveFoundationPages(
                activeMapId,
                user.id,
                updatedPages,
                effectiveBusinessInfo.supabaseUrl,
                effectiveBusinessInfo.supabaseAnonKey
            );
            dispatch({ type: 'SET_FOUNDATION_PAGES', payload: updatedPages });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'NAP data saved successfully.' });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to save NAP data.' });
        }
    }, [activeMapId, user?.id, foundationPages, effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey, dispatch, activeMap?.business_info]);

    const handleUpdateFoundationPage = useCallback(async (pageId: string, updates: Partial<FoundationPage>) => {
        try {
            const updatedPage = await foundationPagesService.updateFoundationPage(pageId, updates);
            dispatch({ type: 'UPDATE_FOUNDATION_PAGE', payload: { pageId, updates: updatedPage } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Foundation page updated.' });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to update foundation page.' });
        }
    }, [dispatch]);

    const handleDeleteFoundationPage = useCallback(async (pageId: string) => {
        try {
            await foundationPagesService.deleteFoundationPage(pageId, 'user_deleted');
            dispatch({ type: 'DELETE_FOUNDATION_PAGE', payload: { pageId } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Foundation page deleted.' });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete foundation page.' });
        }
    }, [dispatch]);

    const handleRestoreFoundationPage = useCallback(async (pageId: string) => {
        try {
            const restoredPage = await foundationPagesService.restoreFoundationPage(pageId);
            dispatch({ type: 'UPDATE_FOUNDATION_PAGE', payload: { pageId, updates: restoredPage } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Foundation page restored.' });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to restore foundation page.' });
        }
    }, [dispatch]);

    // Save navigation structure
    const handleSaveNavigation = useCallback(async (updatedNavigation: NavigationStructure) => {
        if (!activeMapId || !user?.id) {
            dispatch({ type: 'SET_ERROR', payload: 'Cannot save navigation: missing map or user.' });
            return;
        }

        try {
            const savedNavigation = await foundationPagesService.saveNavigationStructure(
                activeMapId,
                user.id,
                updatedNavigation
            );
            dispatch({ type: 'SET_NAVIGATION', payload: savedNavigation });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Navigation saved successfully.' });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to save navigation.' });
        }
    }, [activeMapId, user?.id, dispatch]);

    // Business Info save handler
    // SECURITY: Strip API keys and sensitive credentials before saving to business_info column.
    // API keys are stored in user_settings (encrypted), never in topical_maps.business_info.
    const handleSaveBusinessInfo = useCallback(async (updates: Partial<BusinessInfo>) => {
        if (!activeMapId) {
            dispatch({ type: 'SET_ERROR', payload: 'Cannot save business info: no active map.' });
            return;
        }

        try {
            const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);

            // Merge updates with existing map business info (NOT effectiveBusinessInfo which includes API keys)
            const currentMapInfo = (activeMap?.business_info || {}) as Partial<BusinessInfo>;
            const merged = { ...currentMapInfo, ...updates };

            // Strip sensitive fields — only strategic context should be saved with the map
            const {
                supabaseUrl: _su, supabaseAnonKey: _sa,
                geminiApiKey: _g, openAiApiKey: _o, anthropicApiKey: _a,
                perplexityApiKey: _p, openRouterApiKey: _or,
                ...strategicInfo
            } = merged;

            const { error } = await supabase
                .from('topical_maps')
                .update({ business_info: strategicInfo as any })
                .eq('id', activeMapId);

            if (error) throw error;

            // Update local state
            dispatch({
                type: 'UPDATE_MAP_DATA',
                payload: { mapId: activeMapId, data: { business_info: strategicInfo } }
            });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Business info saved successfully.' });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to save business info.' });
        }
    }, [activeMapId, effectiveBusinessInfo, activeMap?.business_info, dispatch]);

    // Brand Kit save handler (saves via business info)
    const handleSaveBrandKit = useCallback(async (brandKit: any) => {
        await handleSaveBusinessInfo({ brandKit });
    }, [handleSaveBusinessInfo]);

    const handleGenerateMissingFoundationPages = useCallback(async () => {
        console.log('=== handleGenerateMissingFoundationPages START ===');
        if (!activeMapId || !user?.id || !activeMap?.pillars) {
            console.error('Missing required data:', { activeMapId, userId: user?.id, pillars: !!activeMap?.pillars });
            dispatch({ type: 'SET_ERROR', payload: 'Cannot generate foundation pages: missing map, user, or pillars.' });
            return;
        }

        // Determine which page types are missing (active pages only, not deleted ones)
        const REQUIRED_PAGES: FoundationPageType[] = ['homepage', 'about', 'contact', 'privacy', 'terms'];
        const existingActivePageTypes = foundationPages
            .filter((p: any) => !p.deleted_at)
            .map((p: any) => p.page_type);
        const missingPageTypes = REQUIRED_PAGES.filter(pt => !existingActivePageTypes.includes(pt));

        console.log('Existing page types:', existingActivePageTypes);
        console.log('Missing page types:', missingPageTypes);

        if (missingPageTypes.length === 0) {
            dispatch({ type: 'SET_NOTIFICATION', payload: 'All required foundation pages already exist.' });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'foundationPages', value: true } });
        try {
            console.log('Generating missing pages with AI...');
            // Generate ONLY the missing page types
            const result = await foundationPagesService.generateFoundationPages(
                effectiveBusinessInfo,
                activeMap.pillars as SEOPillars,
                dispatch,
                missingPageTypes // Pass only missing page types
            );
            console.log('AI generation result:', result);

            console.log('Preparing pages for save...');
            const pagesToSave = foundationPagesService.prepareFoundationPagesForSave(
                result,
                activeMapId,
                user.id,
                napData
            );
            console.log('Pages to save:', pagesToSave.length);

            console.log('Saving to database...');
            const savedPages = await foundationPagesService.saveFoundationPages(
                activeMapId,
                user.id,
                pagesToSave,
                effectiveBusinessInfo.supabaseUrl,
                effectiveBusinessInfo.supabaseAnonKey
            );
            console.log('Saved pages:', savedPages.length);

            // MERGE new pages with existing pages instead of replacing
            const existingPageIds = foundationPages.map((p: any) => p.id);
            const newPages = savedPages.filter((p: any) => !existingPageIds.includes(p.id));
            const updatedPages = foundationPages.map((existingPage: any) => {
                const updated = savedPages.find((p: any) => p.id === existingPage.id);
                return updated || existingPage;
            });
            const mergedPages = [...updatedPages, ...newPages];
            console.log('Merged pages total:', mergedPages.length);

            dispatch({ type: 'SET_FOUNDATION_PAGES', payload: mergedPages });
            dispatch({ type: 'SET_NOTIFICATION', payload: `Generated ${savedPages.length} missing foundation pages.` });
            console.log('=== handleGenerateMissingFoundationPages SUCCESS ===');
        } catch (error) {
            console.error('Error generating missing pages:', error);
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to generate foundation pages.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'foundationPages', value: false } });
        }
    }, [activeMapId, user?.id, activeMap?.pillars, effectiveBusinessInfo, napData, foundationPages, dispatch]);

    // Repair foundation pages from validation modal
    const handleRepairFoundation = useCallback(async (missingPageTypes: FoundationPageType[]) => {
        if (!activeMapId || !user?.id || !activeMap?.pillars) {
            dispatch({ type: 'SET_ERROR', payload: 'Cannot repair foundation pages: missing map, user, or pillars.' });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'repairFoundation', value: true } });
        try {
            // Generate only the missing pages
            const result = await foundationPagesService.generateFoundationPages(
                effectiveBusinessInfo,
                activeMap.pillars as SEOPillars,
                dispatch
            );

            // Filter to only the missing page types
            const filteredResult = {
                ...result,
                foundationPages: result.foundationPages.filter((p: any) => missingPageTypes.includes(p.page_type))
            };

            if (filteredResult.foundationPages.length === 0) {
                dispatch({ type: 'SET_NOTIFICATION', payload: 'All foundation pages already exist.' });
                return;
            }

            const pagesToSave = foundationPagesService.prepareFoundationPagesForSave(
                filteredResult,
                activeMapId,
                user.id,
                napData
            );

            const savedPages = await foundationPagesService.saveFoundationPages(
                activeMapId,
                user.id,
                pagesToSave,
                effectiveBusinessInfo.supabaseUrl,
                effectiveBusinessInfo.supabaseAnonKey
            );

            // Merge with existing pages
            const existingPages = websiteStructure?.foundationPages || [];
            const allPages = [...existingPages, ...savedPages];
            dispatch({ type: 'SET_FOUNDATION_PAGES', payload: allPages });
            dispatch({ type: 'SET_NOTIFICATION', payload: `Generated ${savedPages.length} missing foundation page${savedPages.length > 1 ? 's' : ''}.` });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to repair foundation pages.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'repairFoundation', value: false } });
        }
    }, [activeMapId, user?.id, activeMap?.pillars, effectiveBusinessInfo, napData, websiteStructure?.foundationPages, dispatch]);

    // Repair/regenerate navigation structure
    const handleRepairNavigation = useCallback(async () => {
        if (!activeMapId || !user?.id) {
            dispatch({ type: 'SET_ERROR', payload: 'Cannot repair navigation: missing map or user.' });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: { key: 'repairNavigation', value: true } });
        try {
            const currentFoundationPages = websiteStructure?.foundationPages || [];

            // Generate new navigation structure
            const navigation = await foundationPagesService.generateDefaultNavigation(
                currentFoundationPages,
                allTopics,
                effectiveBusinessInfo,
                dispatch
            );

            // Save the navigation
            const savedNavigation = await foundationPagesService.saveNavigationStructure(
                activeMapId,
                user.id,
                navigation
            );

            dispatch({ type: 'SET_NAVIGATION', payload: savedNavigation });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Navigation structure regenerated.' });
        } catch (error) {
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to repair navigation.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'repairNavigation', value: false } });
        }
    }, [activeMapId, user?.id, websiteStructure?.foundationPages, allTopics, effectiveBusinessInfo, dispatch]);

    // Repair malformed briefs in the current map
    const handleRepairBriefs = useCallback(async () => {
        if (!activeMapId) {
            return { repaired: 0, skipped: 0, errors: ['No active map'] };
        }

        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
        const result = await repairBriefsInMap(supabase, activeMapId);

        if (result.repaired > 0) {
            dispatch({ type: 'SET_NOTIFICATION', payload: `Repaired ${result.repaired} brief(s). Reload the page to see changes.` });
        }

        return result;
    }, [activeMapId, businessInfo.supabaseUrl, businessInfo.supabaseAnonKey, dispatch]);

    return {
        // Memoized data
        foundationPages,
        napData,
        navigation,
        // Handlers
        handleSaveNAPData,
        handleUpdateFoundationPage,
        handleDeleteFoundationPage,
        handleRestoreFoundationPage,
        handleSaveNavigation,
        handleSaveBusinessInfo,
        handleSaveBrandKit,
        handleGenerateMissingFoundationPages,
        handleRepairFoundation,
        handleRepairNavigation,
        handleRepairBriefs,
    };
}
