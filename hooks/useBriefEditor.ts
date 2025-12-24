// hooks/useBriefEditor.ts
// Hook for managing content brief editing state and operations

import { useState, useCallback, useMemo, useRef } from 'react';
import { useAppState } from '../state/appState';
import { ContentBrief, BriefSection, EnrichedTopic, SEOPillars } from '../types';
import { getSupabaseClient } from '../services/supabaseClient';
import * as briefEditingService from '../services/ai/briefEditing';
import { RegenerationProgress } from '../services/ai/briefEditing';
// Note: verifiedUpsert removed due to hanging issues with Supabase upsert+onConflict
// Using check-then-insert/update pattern instead

// Re-export for consumers
export type { RegenerationProgress };

// Module-level guard to prevent concurrent regenerations across HMR reloads
let isRegeneratingGlobal = false;

export interface UseBriefEditorReturn {
    // State
    editedBrief: ContentBrief | null;
    hasUnsavedChanges: boolean;
    isSaving: boolean;
    isRegenerating: boolean;
    isRefiningSection: number | null;
    isGeneratingSection: number | null;
    error: string | null;

    // Progress tracking for multi-pass regeneration
    regenerationProgress: RegenerationProgress | null;

    // Section operations
    updateSection: (index: number, updates: Partial<BriefSection>) => void;
    deleteSection: (index: number) => void;
    addSection: (index: number, section: BriefSection) => void;
    reorderSections: (sections: BriefSection[]) => void;
    aiRefineSection: (index: number, instruction: string) => Promise<BriefSection | null>;
    aiGenerateSection: (index: number, instruction: string, parentHeading: string | null) => Promise<BriefSection | null>;

    // Brief operations
    updateBriefField: <K extends keyof ContentBrief>(field: K, value: ContentBrief[K]) => void;
    regenerateBrief: (instruction: string, topic: EnrichedTopic, pillars: SEOPillars, allTopics: EnrichedTopic[]) => Promise<ContentBrief | null>;

    // Persistence
    saveToDB: () => Promise<boolean>;
    discardChanges: () => void;
    setEditedBrief: (brief: ContentBrief | null) => void;
    initializeBrief: (brief: ContentBrief | null) => void;
    clearError: () => void;
}

export const useBriefEditor = (
    initialBrief: ContentBrief | null,
    mapId: string | null,
    topicId: string
): UseBriefEditorReturn => {
    const { state, dispatch } = useAppState();
    const { businessInfo, user } = state;

    // Local editing state
    const [editedBrief, setEditedBrief] = useState<ContentBrief | null>(initialBrief);
    const [originalBrief, setOriginalBrief] = useState<ContentBrief | null>(initialBrief);
    const [isSaving, setIsSaving] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isRefiningSection, setIsRefiningSection] = useState<number | null>(null);
    const [isGeneratingSection, setIsGeneratingSection] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [regenerationProgress, setRegenerationProgress] = useState<RegenerationProgress | null>(null);

    // Check if there are unsaved changes
    const hasUnsavedChanges = useMemo(() => {
        if (!editedBrief || !originalBrief) return false;
        return JSON.stringify(editedBrief) !== JSON.stringify(originalBrief);
    }, [editedBrief, originalBrief]);

    // Update a single section
    const updateSection = useCallback((index: number, updates: Partial<BriefSection>) => {
        if (!editedBrief || !editedBrief.structured_outline) return;

        const newOutline = [...editedBrief.structured_outline];
        newOutline[index] = { ...newOutline[index], ...updates };

        setEditedBrief({
            ...editedBrief,
            structured_outline: newOutline
        });
    }, [editedBrief]);

    // Delete a section
    const deleteSection = useCallback((index: number) => {
        if (!editedBrief || !editedBrief.structured_outline) return;

        const newOutline = editedBrief.structured_outline.filter((_, idx) => idx !== index);

        setEditedBrief({
            ...editedBrief,
            structured_outline: newOutline
        });
    }, [editedBrief]);

    // Add a section at a specific index
    const addSection = useCallback((index: number, section: BriefSection) => {
        if (!editedBrief) return;

        const currentOutline = editedBrief.structured_outline || [];
        const newOutline = [
            ...currentOutline.slice(0, index),
            section,
            ...currentOutline.slice(index)
        ];

        setEditedBrief({
            ...editedBrief,
            structured_outline: newOutline
        });
    }, [editedBrief]);

    // Reorder sections (for drag-and-drop)
    const reorderSections = useCallback((sections: BriefSection[]) => {
        if (!editedBrief) return;

        setEditedBrief({
            ...editedBrief,
            structured_outline: sections
        });
    }, [editedBrief]);

    // AI-assisted section refinement
    const aiRefineSection = useCallback(async (
        index: number,
        instruction: string
    ): Promise<BriefSection | null> => {
        if (!editedBrief || !editedBrief.structured_outline) return null;

        const section = editedBrief.structured_outline[index];
        if (!section) return null;

        setIsRefiningSection(index);
        setError(null);

        try {
            const refinedSection = await briefEditingService.refineBriefSection(
                section,
                instruction,
                editedBrief,
                businessInfo,
                dispatch
            );

            // Return the refined section for preview (don't apply automatically)
            return refinedSection;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to refine section';
            setError(message);
            return null;
        } finally {
            setIsRefiningSection(null);
        }
    }, [editedBrief, businessInfo, dispatch]);

    // AI-assisted section generation
    const aiGenerateSection = useCallback(async (
        index: number,
        instruction: string,
        parentHeading: string | null
    ): Promise<BriefSection | null> => {
        if (!editedBrief) return null;

        // Get pillars from the active map
        const activeMap = state.topicalMaps.find(m => m.id === mapId);
        const pillars: SEOPillars = activeMap?.pillars || { centralEntity: '', sourceContext: '', centralSearchIntent: '' };

        setIsGeneratingSection(index);
        setError(null);

        try {
            const newSection = await briefEditingService.generateNewSection(
                index,
                parentHeading,
                instruction,
                editedBrief,
                businessInfo,
                pillars,
                dispatch
            );

            // Return the generated section for preview (don't apply automatically)
            return newSection;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to generate section';
            setError(message);
            return null;
        } finally {
            setIsGeneratingSection(null);
        }
    }, [editedBrief, businessInfo, mapId, state.topicalMaps, dispatch]);

    // Update any brief field
    const updateBriefField = useCallback(<K extends keyof ContentBrief>(
        field: K,
        value: ContentBrief[K]
    ) => {
        if (!editedBrief) return;

        setEditedBrief({
            ...editedBrief,
            [field]: value
        });
    }, [editedBrief]);

    // Regenerate entire brief with user instructions (uses multi-pass for large briefs)
    const regenerateBrief = useCallback(async (
        instruction: string,
        topic: EnrichedTopic,
        pillars: SEOPillars,
        allTopics: EnrichedTopic[]
    ): Promise<ContentBrief | null> => {
        if (!editedBrief) return null;

        // Guard against concurrent regenerations (survives HMR)
        if (isRegeneratingGlobal) {
            console.warn('[useBriefEditor] Regeneration already in progress, skipping duplicate call');
            return null;
        }

        isRegeneratingGlobal = true;
        setIsRegenerating(true);
        setError(null);
        setRegenerationProgress(null);

        try {
            const originalSectionCount = editedBrief.structured_outline?.length || 0;

            // Get EAVs from the map state - needed for section generation when structured_outline is empty
            const currentMap = mapId ? state.topicalMaps.find(m => m.id === mapId) : undefined;
            const mapEavs = currentMap?.eavs;
            if (originalSectionCount === 0) {
                console.log('[useBriefEditor] structured_outline is empty - will generate sections from scratch using', mapEavs?.length || 0, 'EAVs');
            }

            // Progress callback for multi-pass regeneration
            const handleProgress = (progress: RegenerationProgress) => {
                setRegenerationProgress(progress);
            };

            const regeneratedBrief = await briefEditingService.regenerateBrief(
                businessInfo,
                topic,
                editedBrief,
                instruction,
                pillars,
                allTopics,
                dispatch,
                handleProgress, // Enable progress tracking
                mapEavs // Pass EAVs for section generation when structured_outline is empty
            );

            // SAFEGUARD: If the AI returned empty structured_outline but original had sections,
            // preserve the original sections. This prevents data loss from AI failures.
            if (
                originalSectionCount > 0 &&
                (!regeneratedBrief.structured_outline || regeneratedBrief.structured_outline.length === 0)
            ) {
                console.warn(
                    `[useBriefEditor] AI returned 0 sections but original had ${originalSectionCount}. Preserving original sections.`
                );
                dispatch({
                    type: 'LOG_EVENT',
                    payload: {
                        service: 'BriefEditor',
                        message: `Warning: AI returned empty structured_outline. Original ${originalSectionCount} sections preserved.`,
                        status: 'warning',
                        timestamp: Date.now()
                    }
                });
                regeneratedBrief.structured_outline = editedBrief.structured_outline;
            }

            // Return the regenerated brief for preview (don't apply automatically)
            return regeneratedBrief;
        } catch (err) {
            console.error('[useBriefEditor] Regeneration error:', err);
            const message = err instanceof Error ? err.message : 'Failed to regenerate brief';
            setError(message);
            return null;
        } finally {
            isRegeneratingGlobal = false;
            setIsRegenerating(false);
            setRegenerationProgress(null);
        }
    }, [editedBrief, businessInfo, dispatch, mapId, state.topicalMaps]);

    // Save to database
    const saveToDB = useCallback(async (): Promise<boolean> => {
        if (!editedBrief || !mapId || !user) {
            setError('Missing required data for save');
            return false;
        }

        setIsSaving(true);
        setError(null);

        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // Debug: Log save context to help diagnose RLS issues
            console.log('[useBriefEditor] Save context:', {
                supabaseUrl: businessInfo.supabaseUrl,
                userId: user.id,
                topicId: editedBrief.topic_id,
                briefId: editedBrief.id,
                mapId
            });

            // Ensure key takeaways are safe for JSONB storage
            const sanitizedTakeaways = Array.isArray(editedBrief.keyTakeaways)
                ? editedBrief.keyTakeaways.map(k => typeof k === 'string' ? k : JSON.stringify(k))
                : [];

            // Build the record to save
            const briefRecord = {
                id: editedBrief.id,
                topic_id: editedBrief.topic_id,
                user_id: user.id,
                title: editedBrief.title,
                meta_description: editedBrief.metaDescription,
                key_takeaways: sanitizedTakeaways as any,
                outline: editedBrief.outline,
                serp_analysis: editedBrief.serpAnalysis as any,
                visuals: editedBrief.visuals as any,
                contextual_vectors: editedBrief.contextualVectors as any,
                contextual_bridge: editedBrief.contextualBridge as any,
                perspectives: editedBrief.perspectives as any,
                methodology_note: editedBrief.methodology_note,
                structured_outline: editedBrief.structured_outline as any,
                structural_template_hash: editedBrief.structural_template_hash,
                predicted_user_journey: editedBrief.predicted_user_journey,
                query_type_format: editedBrief.query_type_format,
                featured_snippet_target: editedBrief.featured_snippet_target as any,
                visual_semantics: editedBrief.visual_semantics as any,
                discourse_anchors: editedBrief.discourse_anchors as any,
                updated_at: new Date().toISOString()
            };

            // Check if brief already exists for this topic (using check-then-insert/update pattern
            // because Supabase upsert with onConflict can hang indefinitely)
            console.log('[useBriefEditor] Checking if brief exists for topic:', editedBrief.topic_id);
            const { data: existingBrief, error: checkError } = await supabase
                .from('content_briefs')
                .select('id')
                .eq('topic_id', editedBrief.topic_id)
                .maybeSingle();

            if (checkError) {
                console.error('[useBriefEditor] Error checking for existing brief:', checkError);
                throw new Error(`Failed to check for existing brief: ${checkError.message}`);
            }

            console.log('[useBriefEditor] Existing brief check:', { exists: !!existingBrief });

            let result: { success: boolean; data: any; error: string | null };

            if (existingBrief) {
                // UPDATE existing brief
                console.log('[useBriefEditor] Updating existing brief:', existingBrief.id);
                const { data, error } = await supabase
                    .from('content_briefs')
                    .update(briefRecord)
                    .eq('id', existingBrief.id)
                    .select('id, title')
                    .single();
                result = { success: !error, data, error: error?.message || null };
            } else {
                // INSERT new brief
                console.log('[useBriefEditor] Inserting new brief');
                const { data, error } = await supabase
                    .from('content_briefs')
                    .insert({ ...briefRecord, created_at: new Date().toISOString() })
                    .select('id, title')
                    .single();
                result = { success: !error, data, error: error?.message || null };
            }

            console.log('[useBriefEditor] Save result:', result);

            if (!result.success) {
                console.error('[useBriefEditor] Database save failed:', result.error);

                // Provide more helpful error message for RLS issues
                if (result.error?.includes('row-level security') || result.error?.includes('permission')) {
                    console.error('[useBriefEditor] RLS error - check:', {
                        'User owns the topic/map': 'Verify in Supabase Dashboard',
                        'Supabase URL matches migration target': businessInfo.supabaseUrl,
                        'User ID': user.id
                    });
                    throw new Error(`Permission denied: Unable to save brief. This may be due to a database migration issue. Please contact support. (RLS violation)`);
                }
                throw new Error(result.error || 'Brief save failed');
            }

            // Update global state
            dispatch({
                type: 'REPLACE_BRIEF',
                payload: { mapId, topicId, brief: editedBrief }
            });

            // Update original to match saved state
            setOriginalBrief(editedBrief);

            dispatch({ type: 'SET_NOTIFICATION', payload: '✓ Brief saved and verified.' });
            return true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save brief to database';
            setError(message);
            dispatch({ type: 'SET_ERROR', payload: message });
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [editedBrief, mapId, topicId, user, businessInfo, dispatch]);

    // Discard changes
    const discardChanges = useCallback(() => {
        setEditedBrief(originalBrief);
        setError(null);
    }, [originalBrief]);

    // Initialize brief (for initial load - sets both edited and original)
    const initializeBrief = useCallback((brief: ContentBrief | null) => {
        setEditedBrief(brief);
        setOriginalBrief(brief);
    }, []);

    // Update edited brief without changing original (for AI regeneration/apply)
    const updateEditedBrief = useCallback((brief: ContentBrief | null) => {
        setEditedBrief(brief);
        // Don't update originalBrief - this marks it as unsaved
    }, []);

    // Clear error state (useful when switching between operations)
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        editedBrief,
        hasUnsavedChanges,
        isSaving,
        isRegenerating,
        isRefiningSection,
        isGeneratingSection,
        error,
        regenerationProgress,
        updateSection,
        deleteSection,
        addSection,
        reorderSections,
        aiRefineSection,
        aiGenerateSection,
        updateBriefField,
        regenerateBrief,
        saveToDB,
        discardChanges,
        setEditedBrief: updateEditedBrief,  // For applying changes (keeps unsaved state)
        initializeBrief,  // For initial load (syncs original)
        clearError
    };
};
