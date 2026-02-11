
// components/ContentBriefModal.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../state/appState';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { SmartLoader } from '../ui/FunLoaders';
import { Modal } from '../ui/Modal';
import { EnrichedTopic, ContentBrief, ContextualBridgeLink, BriefSection, EnhancedSchemaResult, ResponseCode } from '../../types';
import { safeString } from '../../utils/parsers';
import { useContentGeneration } from '../../hooks/useContentGeneration';
import ContentGenerationProgress from '../ContentGenerationProgress';
import { ContentGenerationSettingsPanel } from '../ContentGenerationSettingsPanel';
import { PassControlPanel } from '../PassControlPanel';
import { BriefEditModal } from '../brief/BriefEditModal';
import { ReportExportButton, ReportModal } from '../reports';
import { useContentBriefReport } from '../../hooks/useReportGeneration';
import {
  ContentGenerationSettings,
  PRIORITY_PRESETS,
  DEFAULT_CONTENT_GENERATION_SETTINGS,
  LENGTH_PRESETS,
  ContentLengthPreset,
  DEFAULT_CONTENT_LENGTH_SETTINGS
} from '../../types/contentGeneration';
import { BriefHealthOverview } from '../brief/BriefHealthOverview';
import { MoneyPagePillarsIndicator } from '../brief/MoneyPagePillarsIndicator';
import { VisualSemanticsPanel } from '../brief/VisualSemanticsPanel';
import { TopicBridgingContext } from '../brief/TopicBridgingContext';
import { getSupabaseClient } from '../../services/supabaseClient';
import CompetitiveIntelligenceWrapper from '../analysis/CompetitiveIntelligenceWrapper';
import { useFeatureGate } from '../../hooks/usePermissions';
import {
  ContentGenerationModeSelector,
  DEFAULT_GENERATION_SETTINGS,
  type ContentGenerationSettings as QualityModeSettings
} from '../settings/ContentGenerationModeSelector';
import { LiveGenerationMonitor } from '../quality/LiveGenerationMonitor';
import type { PassDelta } from '../../services/ai/contentGeneration/tracking';
import { useEnhancedBriefGeneration, EnhancedBriefGenerationOptions } from '../../hooks/useEnhancedBriefGeneration';
import { AnalysisStatusPanel } from '../analysis/AnalysisStatusPanel';
import { AnalysisDepth, DEPTH_CONFIG } from '../../types/competitiveIntelligence';
import TemplateConfirmationFlow from '../generation/TemplateConfirmationFlow';
import { syncBriefWithTemplate } from '../../services/briefTemplateSync';
import { TemplateName, DepthMode } from '../../types/contentTemplates';
import { findCategoryByLinkedTopicId, buildCategoryPageContext } from '../../services/catalog/catalogService';
import type { CategoryPageContext } from '../../types/catalog';

interface ContentBriefModalProps {
  allTopics: EnrichedTopic[];
  onGenerateDraft: (brief: ContentBrief) => void;
  asPage?: boolean;
}

const ContentBriefModal: React.FC<ContentBriefModalProps> = ({ allTopics, onGenerateDraft, asPage }) => {
    const { state, dispatch } = useAppState();
    const routeNavigate = useNavigate();
    const routeParams = useParams<{ projectId: string; mapId: string; topicId: string }>();
    const { activeBriefTopic, topicalMaps, activeMapId, isLoading, businessInfo, user, knowledgeGraph } = state;

    // Feature gate for content generation
    const { enabled: canGenerateContent, loading: featureLoading, reason: featureReason } = useFeatureGate('content_generation');

    const activeMap = topicalMaps.find(m => m.id === activeMapId);
    const brief = activeBriefTopic ? activeMap?.briefs?.[activeBriefTopic.id] : null;

    // Compute effective business info that merges map-level settings (language, region) with global state
    // This ensures language/region from map.business_info is used for content generation
    const effectiveBusinessInfo = useMemo(() => {
        const mapBusinessInfo = activeMap?.business_info as Partial<typeof businessInfo> || {};

        // Extract map business context fields (NOT AI settings - those come from global)
        const {
            aiProvider: _mapAiProvider,
            aiModel: _mapAiModel,
            geminiApiKey: _gk,
            openAiApiKey: _ok,
            anthropicApiKey: _ak,
            perplexityApiKey: _pk,
            openRouterApiKey: _ork,
            ...mapBusinessContext
        } = mapBusinessInfo;

        return {
            ...businessInfo,
            // Spread map-specific business context (language, region, audience, etc.)
            ...mapBusinessContext,
            // AI settings ALWAYS from global (user_settings), not from map's business_info
            aiProvider: businessInfo.aiProvider,
            aiModel: businessInfo.aiModel,
            geminiApiKey: businessInfo.geminiApiKey,
            openAiApiKey: businessInfo.openAiApiKey,
            anthropicApiKey: businessInfo.anthropicApiKey,
            perplexityApiKey: businessInfo.perplexityApiKey,
            openRouterApiKey: businessInfo.openRouterApiKey,
        };
    }, [businessInfo, activeMap]);

    const isOpen = asPage ? !!brief : !!(state.modals.contentBrief && brief);
    const isDrafting = !!isLoading.audit; // 'audit' key is currently reused for drafting in container

    // Multi-pass generation state
    const [useMultiPass, setUseMultiPass] = useState(true);
    const [generationLogs, setGenerationLogs] = useState<Array<{ message: string; status: string; timestamp: number }>>([]);
    const [isStartingGeneration, setIsStartingGeneration] = useState(false);

    // Settings panel state - consolidated "Advanced Settings" section
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Load settings from localStorage or use defaults
    const [contentSettings, setContentSettings] = useState<ContentGenerationSettings>(() => {
        try {
            const saved = localStorage.getItem('contentGenerationSettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    ...DEFAULT_CONTENT_GENERATION_SETTINGS,
                    ...parsed,
                    id: 'temp',
                    userId: user?.id || '',
                };
            }
        } catch (e) {
            console.warn('Failed to load content settings from localStorage:', e);
        }
        return {
            ...DEFAULT_CONTENT_GENERATION_SETTINGS,
            id: 'temp',
            userId: user?.id || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    });

    const [qualityModeSettings, setQualityModeSettings] = useState<QualityModeSettings>(() => {
        try {
            const saved = localStorage.getItem('qualityModeSettings');
            if (saved) {
                return { ...DEFAULT_GENERATION_SETTINGS, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load quality mode settings from localStorage:', e);
        }
        return DEFAULT_GENERATION_SETTINGS;
    });

    const [showQualityView, setShowQualityView] = useState(false);

    // Persist settings to localStorage when they change
    useEffect(() => {
        try {
            localStorage.setItem('contentGenerationSettings', JSON.stringify(contentSettings));
        } catch (e) {
            console.warn('Failed to save content settings to localStorage:', e);
        }
    }, [contentSettings]);

    useEffect(() => {
        try {
            localStorage.setItem('qualityModeSettings', JSON.stringify(qualityModeSettings));
        } catch (e) {
            console.warn('Failed to save quality mode settings to localStorage:', e);
        }
    }, [qualityModeSettings]);

    // Report generation hook
    const reportHook = useContentBriefReport(brief, activeBriefTopic || undefined);

    // Brief repair state
    const [isRepairingBrief, setIsRepairingBrief] = useState(false);
    const [isRegeneratingBrief, setIsRegeneratingBrief] = useState(false);
    const [isAutoFixingVisuals, setIsAutoFixingVisuals] = useState(false);

    // Competitive intelligence state
    const [showCompetitiveAnalysis, setShowCompetitiveAnalysis] = useState(false);

    // Template confirmation flow state (Phase 3 - Template Routing Integration)
    const [showTemplateFlow, setShowTemplateFlow] = useState(false);

    // Analysis depth selector for enhanced brief generation
    const [analysisDepth, setAnalysisDepth] = useState<AnalysisDepth>(() => {
        try {
            const saved = localStorage.getItem('briefAnalysisDepth');
            if (saved && ['quick', 'standard', 'thorough'].includes(saved)) {
                return saved as AnalysisDepth;
            }
        } catch (e) {
            console.warn('Failed to load analysis depth from localStorage:', e);
        }
        return 'standard';
    });

    // Persist analysis depth to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('briefAnalysisDepth', analysisDepth);
        } catch (e) {
            console.warn('Failed to save analysis depth to localStorage:', e);
        }
    }, [analysisDepth]);

    // Enhanced brief generation hook
    const {
        isAnalyzing,
        isGeneratingBrief,
        status: analysisStatus,
        generateEnhancedBrief,
        cancel: cancelEnhancedGeneration,
        clearCache: clearAnalysisCache,
    } = useEnhancedBriefGeneration();

    // Handle full brief regeneration (from scratch) - now uses enhanced competitor-aware generation
    const handleFullRegenerate = useCallback(async () => {
        if (!brief || !activeMapId || !activeBriefTopic || !activeMap?.pillars || !knowledgeGraph) return;

        setIsRegeneratingBrief(true);
        try {
            // Determine response code (default to INFORMATIONAL for existing content)
            const responseCode = (activeBriefTopic.metadata?.response_code as ResponseCode) || ResponseCode.INFORMATIONAL;

            // Look up linked catalog category for this topic
            let categoryContext: CategoryPageContext | undefined;
            const catalogCategories = state.catalog?.categories;
            if (catalogCategories && catalogCategories.length > 0) {
                const linkedCategory = findCategoryByLinkedTopicId(catalogCategories, activeBriefTopic.id);
                if (linkedCategory) {
                    try {
                        const supabaseForCatalog = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
                        categoryContext = await buildCategoryPageContext(supabaseForCatalog, linkedCategory.id, catalogCategories);
                    } catch (e) {
                        console.warn('[ContentBriefModal] Failed to build catalog context:', e);
                    }
                }
            }

            dispatch({ type: 'SET_LOADING', payload: { key: 'brief', value: true } });
            dispatch({ type: 'SET_NOTIFICATION', payload: categoryContext
                ? `Analyzing competitors and regenerating brief (with catalog: ${categoryContext.categoryName})...`
                : 'Analyzing competitors and regenerating brief...' });

            // Use enhanced brief generation with competitor analysis
            const result = await generateEnhancedBrief(
                effectiveBusinessInfo,
                activeBriefTopic,
                allTopics,
                activeMap.pillars,
                knowledgeGraph,
                responseCode,
                dispatch,
                {
                    analysisDepth,
                    cacheMaxAgeDays: 30,
                    forceReanalysis: false, // Use cached data if available and fresh
                    skipAnalysis: false,
                },
                activeMap.eavs || [],
                categoryContext
            );

            if (result.error) {
                throw new Error(result.error);
            }

            if (result.brief) {
                // Persist to Supabase - cast complex objects to any for JSON storage
                const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
                const { data: updateData, error: dbError } = await supabase
                    .from('content_briefs')
                    .update({
                        meta_description: result.brief.metaDescription,
                        structured_outline: result.brief.structured_outline as any,
                        serp_analysis: result.brief.serpAnalysis as any,
                        contextual_bridge: result.brief.contextualBridge as any,
                        visuals: result.brief.visuals as any,
                        visual_semantics: result.brief.visual_semantics as any,
                        featured_snippet_target: result.brief.featured_snippet_target as any,
                        query_type_format: result.brief.query_type_format,
                        discourse_anchors: result.brief.discourse_anchors as any,
                        competitor_specs: result.brief.competitorSpecs as any, // NEW: Save competitor data
                        ...(result.brief.categoryContext ? { category_context: result.brief.categoryContext as any } : {}),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', brief.id)
                    .select('id');

                if (dbError) {
                    console.error('[ContentBriefModal] Failed to persist regenerated brief:', dbError);
                    throw new Error(`Database error: ${dbError.message}`);
                }

                // Verify the update actually happened (RLS can silently fail)
                if (!updateData || updateData.length === 0) {
                    console.error('[ContentBriefModal] Brief regeneration update returned no rows - likely RLS issue');
                    throw new Error('Brief was not saved - no rows were updated. This may be a permissions issue.');
                }

                // Update local state
                dispatch({
                    type: 'UPDATE_BRIEF',
                    payload: {
                        mapId: activeMapId,
                        topicId: activeBriefTopic.id,
                        updates: result.brief
                    }
                });

                // Show success with warnings if any
                const warningCount = result.warnings.filter(w => w.severity !== 'info').length;
                if (warningCount > 0) {
                    dispatch({ type: 'SET_NOTIFICATION', payload: `Brief regenerated with ${warningCount} warning(s). Check analysis for details.` });
                } else {
                    dispatch({ type: 'SET_NOTIFICATION', payload: 'Brief regenerated successfully with competitor data!' });
                }
            }
        } catch (error) {
            console.error('Brief regeneration failed:', error);
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to regenerate brief' });
        } finally {
            setIsRegeneratingBrief(false);
            dispatch({ type: 'SET_LOADING', payload: { key: 'brief', value: false } });
        }
    }, [brief, activeMapId, activeBriefTopic, activeMap?.pillars, activeMap?.eavs, effectiveBusinessInfo, allTopics, knowledgeGraph, dispatch, generateEnhancedBrief, analysisDepth, state.catalog?.categories]);

    // Handle repair missing fields
    const handleRepairMissing = useCallback(async (missingFields: string[]) => {
        if (!brief || !activeMapId || !activeBriefTopic || !activeMap?.pillars) return;

        setIsRepairingBrief(true);
        try {
            // Import the repair service dynamically to avoid circular dependencies
            const { repairBriefMissingFields } = await import('../../services/ai/briefRepair');
            const repairedBrief = await repairBriefMissingFields(
                brief,
                missingFields,
                activeBriefTopic,
                activeMap.pillars,
                effectiveBusinessInfo,
                allTopics,
                dispatch
            );

            if (repairedBrief) {
                // Build update payload for Supabase (snake_case)
                // Note: targetKeyword and searchIntent exist in TypeScript interface but NOT in database schema
                const dbUpdates: Record<string, any> = {};
                if (repairedBrief.metaDescription !== undefined) dbUpdates.meta_description = repairedBrief.metaDescription;
                if (repairedBrief.structured_outline !== undefined) dbUpdates.structured_outline = repairedBrief.structured_outline;
                if (repairedBrief.serpAnalysis !== undefined) dbUpdates.serp_analysis = repairedBrief.serpAnalysis;
                if (repairedBrief.contextualBridge !== undefined) dbUpdates.contextual_bridge = repairedBrief.contextualBridge;
                if (repairedBrief.visuals !== undefined) dbUpdates.visuals = repairedBrief.visuals;

                // Persist to Supabase with verification
                const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
                const { data: updateData, error: dbError } = await supabase
                    .from('content_briefs')
                    .update(dbUpdates)
                    .eq('id', brief.id)
                    .select('id');

                if (dbError) {
                    console.error('[ContentBriefModal] Failed to persist repaired brief:', dbError);
                    throw new Error(`Database error: ${dbError.message}`);
                }

                // Verify the update actually happened (RLS can silently fail)
                if (!updateData || updateData.length === 0) {
                    console.error('[ContentBriefModal] Repair update returned no rows - likely RLS issue');
                    throw new Error('Brief repair was not saved - no rows were updated. This may be a permissions issue.');
                }

                // Update local state
                dispatch({
                    type: 'UPDATE_BRIEF',
                    payload: {
                        mapId: activeMapId,
                        topicId: activeBriefTopic.id,
                        updates: repairedBrief
                    }
                });
                dispatch({ type: 'SET_NOTIFICATION', payload: `Repaired ${missingFields.length} missing field(s) successfully.` });
            }
        } catch (error) {
            console.error('Brief repair failed:', error);
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to repair brief' });
        } finally {
            setIsRepairingBrief(false);
        }
    }, [brief, activeMapId, activeBriefTopic, activeMap?.pillars, effectiveBusinessInfo, allTopics, dispatch]);

    // Handle applying pillar fixes
    const handleApplyPillarFixes = useCallback(async (updates: Partial<ContentBrief>) => {
        if (!brief || !activeMapId || !activeBriefTopic) return;

        try {
            // Build update payload for Supabase (snake_case)
            const dbUpdates: Record<string, any> = {};

            // Direct field updates that affect scoring
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.metaDescription !== undefined) dbUpdates.meta_description = updates.metaDescription;
            if (updates.cta !== undefined) dbUpdates.cta = updates.cta;
            if (updates.outline !== undefined) dbUpdates.outline = updates.outline;

            // Array/object updates
            if (updates.structured_outline !== undefined) dbUpdates.structured_outline = updates.structured_outline;
            if (updates.visual_semantics !== undefined) dbUpdates.visual_semantics = updates.visual_semantics;
            if (updates.contextualBridge !== undefined) dbUpdates.contextual_bridge = updates.contextualBridge;
            if (updates.visuals !== undefined) dbUpdates.visuals = updates.visuals;

            // Persist to Supabase using primary key (brief.id) for reliable updates
            // Note: Using topic_id + map_id may fail if map_id is NULL in existing rows
            const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
            const { data: updateData, error: dbError } = await supabase
                .from('content_briefs')
                .update(dbUpdates)
                .eq('id', brief.id)
                .select('id');

            if (dbError) {
                throw new Error(`Database error: ${dbError.message}`);
            }

            // Verify the update actually happened (RLS can silently fail)
            if (!updateData || updateData.length === 0) {
                console.error('[ContentBriefModal] Pillar fix update returned no rows - likely RLS issue');
                throw new Error('Pillar fixes were not saved - no rows were updated. This may be a permissions issue.');
            }

            // Update local state
            dispatch({
                type: 'UPDATE_BRIEF',
                payload: {
                    mapId: activeMapId,
                    topicId: activeBriefTopic.id,
                    updates
                }
            });
        } catch (error) {
            console.error('Failed to apply pillar fixes:', error);
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to apply pillar fixes' });
            throw error;
        }
    }, [brief, activeMapId, activeBriefTopic, effectiveBusinessInfo, dispatch]);

    // Handle AI auto-fix for visual semantics issues
    const handleAutoFixVisualSemantics = useCallback(async (issues: string[], recommendations: string[]) => {
        if (!brief || !activeMapId || !activeBriefTopic || !activeMap?.pillars) return;

        setIsAutoFixingVisuals(true);
        try {
            // Import visual semantics service for regeneration
            const { analyzeImageRequirements } = await import('../../services/visualSemanticsService');

            // Get primary entity and title for enhanced descriptions
            const primaryEntity = activeMap.pillars.centralEntity || activeBriefTopic.title;
            const title = brief.title || activeBriefTopic.title;

            // Build enhanced visual_semantics with entity-rich descriptions
            const existingVisuals = brief.visual_semantics || [];
            const enhancedVisuals = existingVisuals.map(visual => ({
                ...visual,
                // Enhance description with entity references
                description: visual.description?.includes(primaryEntity)
                    ? visual.description
                    : `${visual.description} - featuring ${primaryEntity}`,
                // Enhance caption with entity
                caption_data: visual.caption_data?.includes(primaryEntity)
                    ? visual.caption_data
                    : `${visual.caption_data || ''} ${primaryEntity}`.trim()
            }));

            // Also update structured outline sections with visual hints
            const enhancedOutline = brief.structured_outline?.map(section => ({
                ...section,
                // If section has a methodology note about visuals, enhance it
                methodology_note: section.methodology_note
            }));

            // Prepare database updates
            const dbUpdates: Record<string, any> = {
                visual_semantics: enhancedVisuals as any,
                updated_at: new Date().toISOString()
            };

            if (enhancedOutline && enhancedOutline.length > 0) {
                dbUpdates.structured_outline = enhancedOutline as any;
            }

            // Persist to Supabase with verification
            const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
            const { data: updateData, error: dbError } = await supabase
                .from('content_briefs')
                .update(dbUpdates)
                .eq('id', brief.id)
                .select('id');

            if (dbError) {
                throw new Error(`Database error: ${dbError.message}`);
            }

            // Verify the update actually happened (RLS can silently fail)
            if (!updateData || updateData.length === 0) {
                console.error('[ContentBriefModal] Visual semantics update returned no rows - likely RLS issue');
                throw new Error('Visual semantics were not saved - no rows were updated. This may be a permissions issue.');
            }

            // Update local state
            dispatch({
                type: 'UPDATE_BRIEF',
                payload: {
                    mapId: activeMapId,
                    topicId: activeBriefTopic.id,
                    updates: {
                        visual_semantics: enhancedVisuals,
                        structured_outline: enhancedOutline || brief.structured_outline
                    }
                }
            });

            dispatch({ type: 'SET_NOTIFICATION', payload: 'Visual semantics enhanced with entity references.' });
        } catch (error) {
            console.error('Visual semantics auto-fix failed:', error);
            dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to auto-fix visual semantics' });
        } finally {
            setIsAutoFixingVisuals(false);
        }
    }, [brief, activeMapId, activeBriefTopic, activeMap?.pillars, effectiveBusinessInfo, dispatch]);

    const handleLog = useCallback((message: string, status: 'info' | 'success' | 'failure' | 'warning') => {
        setGenerationLogs(prev => [...prev, { message, status, timestamp: Date.now() }]);
        dispatch({ type: 'LOG_EVENT', payload: { service: 'MultiPass', message, status, timestamp: Date.now() }});
    }, [dispatch]);

    // Handle completion - update local state AND database with the generated draft and schema
    const handleGenerationComplete = useCallback(async (draft: string, auditScore: number, schemaResult?: EnhancedSchemaResult) => {
        console.log('[ContentBriefModal] handleGenerationComplete called:', {
            draftLength: draft?.length || 0,
            auditScore,
            hasSchema: !!schemaResult,
            activeBriefTopic: activeBriefTopic?.id,
            activeMapId,
            briefId: brief?.id
        });

        if (!draft) {
            console.warn('[ContentBriefModal] Empty draft received, not updating');
            return;
        }

        if (activeBriefTopic && activeMapId) {
            // Update React state
            dispatch({
                type: 'UPDATE_BRIEF',
                payload: {
                    mapId: activeMapId,
                    topicId: activeBriefTopic.id,
                    updates: { articleDraft: draft }
                }
            });
            handleLog(`Draft synced to workspace (${draft.length} chars)`, 'success');

            // CRITICAL: Also persist to database immediately so it's not lost on reload
            // This ensures the new draft takes precedence over any old cached draft
            if (brief?.id && effectiveBusinessInfo?.supabaseUrl && effectiveBusinessInfo?.supabaseAnonKey) {
                try {
                    const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
                    const { error } = await supabase
                        .from('content_briefs')
                        .update({
                            article_draft: draft,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', brief.id);

                    if (error) {
                        console.error('[ContentBriefModal] Failed to persist draft to database:', error);
                    } else {
                        console.log('[ContentBriefModal] Draft persisted to content_briefs:', draft.length, 'chars');
                    }
                } catch (err) {
                    console.error('[ContentBriefModal] Error persisting draft:', err);
                }
            }

            if (schemaResult) {
                handleLog(`Schema generated: ${schemaResult.pageType} with ${schemaResult.resolvedEntities.length} entities`, 'success');
            }
        }
    }, [activeBriefTopic, activeMapId, dispatch, handleLog, brief?.id, effectiveBusinessInfo?.supabaseUrl, effectiveBusinessInfo?.supabaseAnonKey]);

    // Multi-pass generation hook
    const {
        job,
        sections,
        isGenerating,
        isPaused,
        isComplete,
        isFailed,
        progress,
        currentPassName,
        startGeneration,
        pauseGeneration,
        resumeGeneration,
        cancelGeneration,
        retryGeneration,
        triggerJobRefresh,
        error
    } = useContentGeneration({
        briefId: brief?.id || '',
        mapId: activeMapId || '',
        userId: user?.id || '',
        businessInfo: effectiveBusinessInfo,
        brief: brief || {} as ContentBrief,
        pillars: activeMap?.pillars,
        topic: activeBriefTopic || undefined,
        generationSettings: contentSettings, // Pass user's priority settings to control generation
        onLog: handleLog,
        onComplete: handleGenerationComplete,
        externalRefreshTrigger: state.jobRefreshTrigger // Listen for re-run triggers from DraftingModal
    });

    const handleClose = () => {
        if (asPage) {
            const pid = routeParams.projectId || state.activeProjectId;
            const mid = routeParams.mapId || activeMapId;
            const tid = routeParams.topicId || activeBriefTopic?.id;
            if (pid && mid && tid) {
                routeNavigate(`/p/${pid}/m/${mid}/topics/${tid}`);
            } else if (pid && mid) {
                routeNavigate(`/p/${pid}/m/${mid}`);
            }
        }
        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'contentBrief', visible: false } });
        dispatch({ type: 'SET_ACTIVE_BRIEF_TOPIC', payload: null });
    };

    const handleGenerateDraft = async () => {
      if (brief) {
        if (useMultiPass) {
          // If brief doesn't have a template selected, show template confirmation flow first
          if (!brief.selectedTemplate) {
            setShowTemplateFlow(true);
            return;
          }
          // Template already selected, proceed with generation
          setIsStartingGeneration(true);
          setGenerationLogs([]);
          try {
            await startGeneration();
          } finally {
            setIsStartingGeneration(false);
          }
        } else {
          onGenerateDraft(brief);
        }
      }
    };

    // Handle template confirmation and start generation
    const handleTemplateConfirmed = useCallback(async (templateName: TemplateName, depthMode: DepthMode) => {
      if (!brief || !activeMapId) return;

      setShowTemplateFlow(false);

      // Sync brief with selected template
      const updatedBrief = syncBriefWithTemplate(
        brief,
        templateName,
        90, // Default confidence for user selection
        depthMode
      );

      // Update local state with template selection
      // Note: Database schema doesn't have template fields yet - store in local state only
      // When analytics DB schema is added (Task 22), this will be persisted properly
      dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });

      console.log(`[ContentBriefModal] Template selected: ${templateName}, depth: ${depthMode}`);

      // Start generation with updated brief
      setIsStartingGeneration(true);
      setGenerationLogs([]);
      try {
        await startGeneration();
      } finally {
        setIsStartingGeneration(false);
      }
    }, [brief, activeMapId, effectiveBusinessInfo, dispatch, startGeneration]);

    const handleViewDraft = () => {
        if (brief && activeBriefTopic) {
            const pid = routeParams.projectId || state.activeProjectId;
            const mid = routeParams.mapId || activeMapId;
            if (pid && mid) {
                routeNavigate(`/p/${pid}/m/${mid}/topics/${activeBriefTopic.id}/draft`);
            } else {
                dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'drafting', visible: true } });
            }
        }
    }

    // Helper to safely extract links whether bridge is array or section object
    const bridgeLinks: ContextualBridgeLink[] = brief ? (
        Array.isArray(brief.contextualBridge)
            ? brief.contextualBridge
            : brief.contextualBridge?.links || []
    ) : [];

    // Show progress UI when actively generating, paused, or failed (to show pass status and allow retry)
    const showProgressUI = isGenerating || isPaused || isFailed || (job && !isComplete);

    // Generate pass deltas from job status for LiveGenerationMonitor
    // Use REAL passDeltas from quality_report when available, fall back to indicative improvements
    const passDeltas = useMemo((): PassDelta[] => {
        if (!job?.passes_status) return [];

        // Check if we have real passDeltas from quality_report (stored after generation completes)
        const qualityReport = (job as any).quality_report;
        if (qualityReport?.passDeltas && Array.isArray(qualityReport.passDeltas) && qualityReport.passDeltas.length > 0) {
            // Use real tracking data - this has actual rule fixes/regressions
            return qualityReport.passDeltas;
        }

        // Fall back to indicative improvements for in-progress generation
        const deltas: PassDelta[] = [];
        const passKeys = [
            'pass_1_draft', 'pass_2_headers', 'pass_3_lists', 'pass_4_discourse',
            'pass_5_microsemantics', 'pass_6_visuals', 'pass_7_intro',
            'pass_8_polish', 'pass_9_audit', 'pass_10_schema'
        ] as const;

        // Indicative improvements per pass (based on typical pass function)
        // Order: Draft → Headers → Lists → Discourse → Micro → Visuals → Intro → Polish → Audit → Schema
        const passImprovements: Record<number, { fixed: string[], description: string }> = {
            1: { fixed: ['CONTENT_CREATED'], description: 'Initial draft generated' },
            2: { fixed: ['HEADING_HIERARCHY', 'HEADING_OVERLAP'], description: 'Headers optimized' },
            3: { fixed: ['LIST_STRUCTURE', 'TABLE_FORMAT'], description: 'Lists and tables added' },
            4: { fixed: ['DISCOURSE_FLOW', 'TRANSITIONS'], description: 'Discourse integration' },
            5: { fixed: ['MODALITY', 'STOP_WORDS', 'SUBJECT_POSITION'], description: 'Micro semantics applied' },
            6: { fixed: ['IMAGE_PLACEMENT', 'ALT_TEXT'], description: 'Visual elements added' },
            7: { fixed: ['CENTERPIECE', 'INTRO_CONTEXT'], description: 'Introduction synthesized (with polished body)' },
            8: { fixed: ['POLISH_REFINEMENT', 'COHERENCE'], description: 'Final polish applied' },
            9: { fixed: [], description: 'Quality audit completed' },
            10: { fixed: ['SCHEMA_GENERATED'], description: 'Schema markup added' },
        };

        for (let i = 0; i < passKeys.length; i++) {
            const status = job.passes_status[passKeys[i]];
            const passNum = i + 1;
            if (status === 'completed') {
                const improvements = passImprovements[passNum] || { fixed: [], description: '' };
                deltas.push({
                    passNumber: passNum,
                    rulesFixed: improvements.fixed,
                    rulesRegressed: [],
                    rulesUnchanged: [],
                    netChange: improvements.fixed.length,
                    recommendation: 'accept'
                });
            }
        }
        return deltas;
    }, [job?.passes_status, (job as any)?.quality_report]);

    // Allow settings when: multi-pass enabled and NOT actively generating
    // Settings should be accessible even when there's an existing draft (for regeneration)
    const canShowSettings = useMultiPass && !isGenerating;

    // Highlight settings when there's an error to encourage switching providers
    const highlightSettings = isFailed && !showAdvancedSettings;

    // Count how many settings differ from defaults to show in collapsed summary
    const customSettingsCount = useMemo(() => {
        let count = 0;
        // Check priority preset
        const isDefaultPreset = (
            contentSettings.priorities.humanReadability === DEFAULT_CONTENT_GENERATION_SETTINGS.priorities.humanReadability &&
            contentSettings.priorities.businessConversion === DEFAULT_CONTENT_GENERATION_SETTINGS.priorities.businessConversion &&
            contentSettings.priorities.machineOptimization === DEFAULT_CONTENT_GENERATION_SETTINGS.priorities.machineOptimization &&
            contentSettings.priorities.factualDensity === DEFAULT_CONTENT_GENERATION_SETTINGS.priorities.factualDensity
        );
        if (!isDefaultPreset) count++;
        // Check tone
        if (contentSettings.tone !== DEFAULT_CONTENT_GENERATION_SETTINGS.tone) count++;
        // Check audience
        if (contentSettings.audienceExpertise !== DEFAULT_CONTENT_GENERATION_SETTINGS.audienceExpertise) count++;
        // Check content length preset
        const defaultLengthPreset = DEFAULT_CONTENT_GENERATION_SETTINGS.contentLength?.preset ?? 'standard';
        if ((contentSettings.contentLength?.preset ?? 'standard') !== defaultLengthPreset) count++;
        // Check if any passes are disabled
        const defaultPasses = DEFAULT_CONTENT_GENERATION_SETTINGS.passes;
        const currentPasses = contentSettings.passes;
        const hasDisabledPass = Object.keys(defaultPasses).some(key => {
            const k = key as keyof typeof defaultPasses;
            return currentPasses[k]?.enabled === false && defaultPasses[k]?.enabled !== false;
        });
        if (hasDisabledPass) count++;
        // Check quality mode
        if (qualityModeSettings.mode !== 'autonomous') count++;
        // Check analysis depth
        if (analysisDepth !== 'standard') count++;
        // Check design analysis
        if (contentSettings.enableDesignAnalysis) count++;
        return count;
    }, [contentSettings, qualityModeSettings, analysisDepth]);

    // Custom header with edit/settings buttons
    const customHeader = (
        <header className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
            <div>
                <h2 id="content-brief-modal-title" className="text-xl font-bold text-white">Content Brief</h2>
                <p className="text-sm text-gray-400">{activeBriefTopic?.title || safeString(brief?.title) || 'Untitled Topic'}</p>
            </div>
            <div className="flex items-center gap-3">
                {/* Edit Brief button */}
                <button
                    onClick={() => setShowEditModal(true)}
                    className="text-xs px-3 py-1.5 rounded border transition-colors bg-emerald-900/50 border-emerald-600 text-emerald-200 hover:bg-emerald-900/70"
                    title="Edit brief sections and settings"
                    aria-label="Edit brief sections and settings"
                >
                    Edit Brief
                </button>
                {/* Settings toggle in header - show when multi-pass and no draft */}
                {canShowSettings && (
                    <button
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        aria-expanded={showAdvancedSettings}
                        aria-controls="content-brief-settings"
                        className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                            showAdvancedSettings
                                ? 'bg-blue-900/50 border-blue-600 text-blue-200'
                                : highlightSettings
                                    ? 'bg-amber-900/50 border-amber-500 text-amber-200 animate-pulse'
                                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        {showAdvancedSettings
                            ? '\u25B2 Hide Advanced Settings'
                            : highlightSettings
                                ? '\u26A0 Change AI Provider'
                                : `\u25BC Advanced Settings${customSettingsCount > 0 ? ` (${customSettingsCount} custom)` : ''}`
                        }
                    </button>
                )}
                <button
                    onClick={handleClose}
                    className="text-gray-400 text-2xl leading-none hover:text-white"
                    aria-label="Close modal"
                >
                    &times;
                </button>
            </div>
        </header>
    );

    // Check if current settings differ from AI suggestion
    const currentLengthPreset = contentSettings?.contentLength?.preset ?? 'standard';
    const suggestedPreset = brief?.suggestedLengthPreset;
    const hasLengthMismatch = suggestedPreset && suggestedPreset !== currentLengthPreset;

    // Footer content
    const footerContent = brief ? (
        <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-4">
                {brief.articleDraft && <span className="text-sm text-green-400">Article draft is ready.</span>}
                {/* Show multi-pass toggle when not actively generating */}
                {!isGenerating && (
                    <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={useMultiPass}
                            onChange={(e) => setUseMultiPass(e.target.checked)}
                            className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                            aria-describedby="multipass-hint"
                        />
                        <span id="multipass-hint">Use Multi-Pass Generation (9 passes)</span>
                    </label>
                )}
                {/* Length suggestion indicator - shown when AI suggests different preset */}
                {!isGenerating && hasLengthMismatch && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-amber-900/30 border border-amber-600/40 rounded text-xs">
                        <span className="text-amber-300">
                            AI suggests: <strong>{suggestedPreset}</strong>
                        </span>
                        <button
                            onClick={() => {
                                setContentSettings(prev => ({
                                    ...prev,
                                    contentLength: {
                                        ...(prev.contentLength ?? DEFAULT_CONTENT_LENGTH_SETTINGS),
                                        preset: suggestedPreset as ContentLengthPreset
                                    }
                                }));
                            }}
                            className="text-amber-400 hover:text-amber-200 underline"
                            title={brief.suggestedLengthReason}
                        >
                            Use it
                        </button>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-400">Current: {currentLengthPreset}</span>
                    </div>
                )}
            </div>
            <div className="flex gap-2">
                {/* View All Resources button */}
                <Button
                    onClick={() => {
                        dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'topicResources', visible: true } });
                    }}
                    variant="secondary"
                    className="text-xs border-gray-600"
                >
                    All Resources
                </Button>
                {/* Show generate/view buttons when not actively generating */}
                {!isGenerating && (
                    <>
                        {/* Show Regenerate button when there's an existing draft */}
                        {brief.articleDraft && (
                            <Button
                                onClick={handleGenerateDraft}
                                variant="secondary"
                                disabled={isDrafting || isStartingGeneration || (!canGenerateContent && !featureLoading)}
                                className="text-xs border-amber-600 text-amber-300 hover:bg-amber-900/30"
                                title={!canGenerateContent && !featureLoading ? (featureReason || 'Content generation requires a subscription upgrade') : 'Regenerate the article draft based on the current brief'}
                            >
                                {isStartingGeneration ? (
                                    <SmartLoader context="generating" size="sm" customText="Starting..." />
                                ) : (
                                    'Regenerate Draft'
                                )}
                            </Button>
                        )}
                        <Button
                            onClick={brief.articleDraft ? handleViewDraft : handleGenerateDraft}
                            variant="primary"
                            disabled={isDrafting || isGenerating || (!brief.articleDraft && !canGenerateContent && !featureLoading)}
                            title={!canGenerateContent && !featureLoading && !brief.articleDraft ? (featureReason || 'Content generation requires a subscription upgrade') : undefined}
                        >
                            {isDrafting ? (
                                <SmartLoader context="generating" size="sm" />
                            ) : featureLoading && !brief.articleDraft ? (
                                <SmartLoader context="loading" size="sm" customText="Checking..." />
                            ) : (
                                brief.articleDraft ? 'View Draft' : (useMultiPass ? 'Generate (Multi-Pass)' : 'Generate Article Draft')
                            )}
                        </Button>
                    </>
                )}
                {reportHook.canGenerate && (
                    <ReportExportButton
                        reportType="content-brief"
                        onClick={reportHook.open}
                        variant="secondary"
                        size="sm"
                    />
                )}
                <Button onClick={handleClose} variant="secondary">Close</Button>
            </div>
            {!canGenerateContent && !featureLoading && featureReason && (
                <p className="text-sm text-amber-600 mt-1 text-right">{featureReason}</p>
            )}
        </div>
    ) : null;

    // Early return if brief is null to prevent null reference errors
    if (!brief) {
        return null;
    }

    // Modal body content shared between modal and page rendering
    const modalBodyContent = (
        <>

            {/* Consolidated Advanced Settings Panel */}
            {canShowSettings && (
                <div id="content-brief-settings" className="border-b border-gray-700 bg-gray-850 flex-shrink-0">
                    {/* Collapsed summary line */}
                    {!showAdvancedSettings && (
                        <button
                            onClick={() => setShowAdvancedSettings(true)}
                            className="w-full px-4 py-2 flex items-center justify-between text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 transition-colors"
                        >
                            <span>
                                {customSettingsCount === 0
                                    ? 'Using defaults'
                                    : `${customSettingsCount} custom setting${customSettingsCount !== 1 ? 's' : ''}`
                                }
                            </span>
                            <span className="text-gray-500">{'\u25BC'}</span>
                        </button>
                    )}

                    {/* Expanded settings */}
                    {showAdvancedSettings && (
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-5">
                            {/* Group 1: Content Priorities & Tone */}
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Content Priorities & Tone</h4>
                                <ContentGenerationSettingsPanel
                                    settings={contentSettings}
                                    onChange={setContentSettings}
                                    presets={PRIORITY_PRESETS}
                                />
                            </div>

                            {/* Group 2: Refinement Passes */}
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Refinement Passes</h4>
                                <PassControlPanel
                                    passes={contentSettings.passes}
                                    onChange={(passes) => setContentSettings(prev => ({ ...prev, passes }))}
                                    disabled={isGenerating}
                                />
                            </div>

                            {/* Group 3: Competitor Analysis Depth */}
                            {!isAnalyzing && !isGeneratingBrief && activeBriefTopic && (
                                <div>
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Competitor Analysis</h4>
                                    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-xs text-gray-400">
                                                    How many competitors are analyzed before generating the brief
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={analysisDepth}
                                                    onChange={(e) => setAnalysisDepth(e.target.value as AnalysisDepth)}
                                                    className="text-sm bg-gray-700 border border-gray-600 text-gray-200 rounded px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="quick">{DEPTH_CONFIG.quick.label}</option>
                                                    <option value="standard">{DEPTH_CONFIG.standard.label}</option>
                                                    <option value="thorough">{DEPTH_CONFIG.thorough.label}</option>
                                                </select>
                                                <button
                                                    onClick={() => clearAnalysisCache(activeBriefTopic.id)}
                                                    className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded border border-gray-700 hover:border-gray-600"
                                                    title="Clear cached competitor analysis for this topic"
                                                >
                                                    Clear Cache
                                                </button>
                                            </div>
                                        </div>
                                        {/* Show cached analysis info if available */}
                                        {brief.competitorSpecs && (
                                            <div className="mt-3 pt-3 border-t border-gray-700">
                                                <div className="flex items-center gap-4 text-xs text-gray-400">
                                                    <span>
                                                        Last analyzed: {new Date(brief.competitorSpecs.analysisDate).toLocaleDateString()}
                                                    </span>
                                                    <span className={`font-medium ${
                                                        brief.competitorSpecs.dataQuality === 'high' ? 'text-green-400' :
                                                        brief.competitorSpecs.dataQuality === 'medium' ? 'text-yellow-400' :
                                                        brief.competitorSpecs.dataQuality === 'low' ? 'text-red-400' : 'text-gray-500'
                                                    }`}>
                                                        {brief.competitorSpecs.competitorsAnalyzed} competitors {'\u2022'} {brief.competitorSpecs.dataQuality} quality
                                                    </span>
                                                    <span>
                                                        Target: {brief.competitorSpecs.targetWordCount} words
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Group 4: Quality Enforcement Mode */}
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Quality Enforcement</h4>
                                <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                                    <ContentGenerationModeSelector
                                        settings={qualityModeSettings}
                                        onChange={setQualityModeSettings}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

                <div className="p-6 overflow-y-auto flex-grow">
                    {/* Multi-Pass Progress UI */}
                    {showProgressUI && job && (
                        <div className="mb-6">
                            {/* View Toggle */}
                            <div className="flex gap-2 mb-3">
                                <button
                                    onClick={() => setShowQualityView(false)}
                                    className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                                        !showQualityView
                                            ? 'bg-blue-900/50 border-blue-600 text-blue-200'
                                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    Standard View
                                </button>
                                <button
                                    onClick={() => setShowQualityView(true)}
                                    className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                                        showQualityView
                                            ? 'bg-purple-900/50 border-purple-600 text-purple-200'
                                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                                    }`}
                                >
                                    Quality Timeline
                                </button>
                            </div>

                            {/* Standard Progress View */}
                            {!showQualityView && (
                                <ContentGenerationProgress
                                    job={job}
                                    sections={sections}
                                    progress={progress}
                                    currentPassName={currentPassName}
                                    onPause={pauseGeneration}
                                    onResume={resumeGeneration}
                                    onCancel={cancelGeneration}
                                    onRetry={retryGeneration}
                                    error={error}
                                    templateName={brief?.selectedTemplate}
                                    templateConfidence={brief?.templateConfidence}
                                    categoryContext={brief?.categoryContext}
                                />
                            )}

                            {/* Quality Timeline View */}
                            {showQualityView && (
                                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                                    <LiveGenerationMonitor
                                        jobId={job.id}
                                        currentPass={job.current_pass}
                                        totalPasses={10}
                                        passDeltas={passDeltas}
                                        isGenerating={isGenerating}
                                        onPauseGeneration={pauseGeneration}
                                        onResumeGeneration={resumeGeneration}
                                    />
                                    {/* Show error in quality view too */}
                                    {(job.last_error || error) && (
                                        <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded">
                                            <p className="text-sm text-red-300">{job.last_error || error}</p>
                                        </div>
                                    )}
                                    {/* Action buttons */}
                                    <div className="flex gap-2 mt-4">
                                        {isFailed && retryGeneration && (
                                            <button
                                                onClick={retryGeneration}
                                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                                            >
                                                Retry
                                            </button>
                                        )}
                                        {(isGenerating || isPaused || isFailed) && (
                                            <button
                                                onClick={cancelGeneration}
                                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Completion Message */}
                    {isComplete && job && (
                        <div className="mb-6 p-4 bg-green-900/30 border border-green-700 rounded">
                            <h3 className="text-green-300 font-semibold mb-2">Generation Complete!</h3>
                            <p className="text-gray-300 text-sm">
                                Your article has been generated through 9 optimization passes including schema generation.
                                Final audit score: <strong className="text-green-400">{job.final_audit_score}%</strong>
                                {job.schema_data && (
                                    <span className="ml-2">| Schema: <strong className="text-blue-400">{(job.schema_data as EnhancedSchemaResult).pageType}</strong></span>
                                )}
                            </p>
                            <div className="flex gap-2 mt-3">
                                <Button onClick={handleViewDraft} variant="primary">
                                    View Generated Draft
                                </Button>
                                {job.schema_data && (
                                    <Button
                                        onClick={() => {
                                            const schemaResult = job.schema_data as EnhancedSchemaResult;
                                            dispatch({ type: 'SET_SCHEMA_RESULT', payload: schemaResult });
                                            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'schema', visible: true } });
                                        }}
                                        variant="secondary"
                                        className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
                                    >
                                        View Schema
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Competitor Analysis Status Panel - shows during enhanced brief generation */}
                        {(isAnalyzing || isGeneratingBrief || analysisStatus.stage !== 'idle') && (
                            <AnalysisStatusPanel
                                status={analysisStatus}
                                onCancel={cancelEnhancedGeneration}
                                compact={false}
                            />
                        )}

                        {/* Brief Health Overview */}
                        <BriefHealthOverview
                            brief={brief}
                            onRepairMissing={handleRepairMissing}
                            onRegenerateBrief={handleFullRegenerate}
                            isRepairing={isRepairingBrief}
                            isRegenerating={isRegeneratingBrief || isAnalyzing || isGeneratingBrief}
                        />

                        {/* Competitive Intelligence Section */}
                        {effectiveBusinessInfo && activeBriefTopic && (
                            <Card className="p-4 bg-indigo-950/30 border border-indigo-800/50">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold text-lg text-indigo-300">Competitive Intelligence</h3>
                                        <p className="text-xs text-gray-400 mt-1">Analyze SERP competitors for strategic insights</p>
                                    </div>
                                    <Button
                                        onClick={() => setShowCompetitiveAnalysis(!showCompetitiveAnalysis)}
                                        variant="secondary"
                                        className="text-sm bg-indigo-900/40 text-indigo-300 hover:bg-indigo-800/60 border border-indigo-700/50"
                                    >
                                        {showCompetitiveAnalysis ? 'Hide Analysis' : 'Analyze Competitors'}
                                    </Button>
                                </div>
                                {showCompetitiveAnalysis && (
                                    <div className="mt-4 border-t border-indigo-800/30 pt-4">
                                        <CompetitiveIntelligenceWrapper
                                            topic={activeBriefTopic}
                                            businessInfo={effectiveBusinessInfo}
                                        />
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* Product Catalog Data */}
                        {brief.categoryContext && (
                            <Card className="p-4 bg-cyan-900/20 border border-cyan-700/50">
                                <h3 className="font-semibold text-lg text-cyan-300 mb-2 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                    Product Catalog Data
                                </h3>
                                <p className="text-cyan-100 text-sm mb-3">
                                    This brief uses real product data from your catalog category <strong>{brief.categoryContext.categoryName}</strong>. Content generation will reference actual products, prices, and attributes.
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                    <div className="bg-cyan-900/30 rounded p-2 text-center">
                                        <div className="text-lg font-bold text-cyan-300">{brief.categoryContext.totalProductCount}</div>
                                        <div className="text-xs text-cyan-500">Products</div>
                                    </div>
                                    <div className="bg-cyan-900/30 rounded p-2 text-center">
                                        <div className="text-lg font-bold text-cyan-300">
                                            {brief.categoryContext.priceRange
                                                ? `${brief.categoryContext.priceRange.currency} ${brief.categoryContext.priceRange.min}–${brief.categoryContext.priceRange.max}`
                                                : '—'}
                                        </div>
                                        <div className="text-xs text-cyan-500">Price Range</div>
                                    </div>
                                    <div className="bg-cyan-900/30 rounded p-2 text-center">
                                        <div className="text-lg font-bold text-cyan-300">{brief.categoryContext.subcategories.length}</div>
                                        <div className="text-xs text-cyan-500">Subcategories</div>
                                    </div>
                                    <div className="bg-cyan-900/30 rounded p-2 text-center">
                                        <div className="text-lg font-bold text-cyan-300">{brief.categoryContext.isSketchMode ? 'Sketch' : 'Full'}</div>
                                        <div className="text-xs text-cyan-500">Data Mode</div>
                                    </div>
                                </div>
                                {brief.categoryContext.products.length > 0 && (
                                    <details className="text-sm">
                                        <summary className="cursor-pointer text-cyan-400 hover:text-cyan-300">
                                            View {brief.categoryContext.products.length} referenced products
                                        </summary>
                                        <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                                            {brief.categoryContext.products.map((p: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between text-xs text-gray-300 bg-gray-800/50 rounded px-2 py-1">
                                                    <span className="truncate mr-2">{p.name}</span>
                                                    <span className="flex-shrink-0 text-cyan-400">
                                                        {p.brand && <span className="mr-2 text-gray-500">{p.brand}</span>}
                                                        {p.price != null ? `${p.currency || '$'}${p.price}` : '—'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}
                            </Card>
                        )}

                        {/* Money Page 4 Pillars - for monetization topics */}
                        <MoneyPagePillarsIndicator
                            brief={brief}
                            topicClass={(activeBriefTopic?.topic_class || activeBriefTopic?.metadata?.topic_class) as string | undefined}
                            businessInfo={effectiveBusinessInfo}
                            pillars={activeMap?.pillars}
                            dispatch={dispatch}
                            onApplyFixes={handleApplyPillarFixes}
                        />

                        {/* Meta Info */}
                        <Card className="p-4 bg-gray-900/50">
                            <h3 className="font-semibold text-lg text-blue-300 mb-2">Meta Information</h3>
                            <p><strong>Meta Description:</strong> {safeString(brief.metaDescription) || 'No description available.'}</p>
                            <p><strong>Slug:</strong> <span className="font-mono text-green-400">/{safeString(brief.slug)}</span></p>
                        </Card>

                        {/* Search & Retrieval Strategy (Holistic SEO) */}
                        {(brief.featured_snippet_target || brief.query_type_format || (brief.discourse_anchors && brief.discourse_anchors.length > 0)) && (
                            <Card className="p-4 bg-indigo-900/20 border border-indigo-700/50">
                                <h3 className="font-semibold text-lg text-indigo-300 mb-3">Search & Retrieval Strategy</h3>

                                {brief.query_type_format && (
                                    <div className="mb-3">
                                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Target Query Format:</span>
                                        <span className="ml-2 text-white text-sm font-mono bg-black/30 px-2 py-1 rounded">{safeString(brief.query_type_format)}</span>
                                    </div>
                                )}

                                {brief.featured_snippet_target && (
                                    <div className="mb-3 p-3 bg-black/20 rounded border border-indigo-500/30">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-indigo-400 text-xs font-bold uppercase">Featured Snippet Target</span>
                                            <span className="text-xs text-gray-500">{safeString(brief.featured_snippet_target.target_type)} | &lt; {brief.featured_snippet_target.answer_target_length} words</span>
                                        </div>
                                        <p className="text-white font-medium mb-1">"{safeString(brief.featured_snippet_target.question)}"</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {brief.featured_snippet_target.required_predicates.map((pred, i) => (
                                                <span key={i} className="text-[10px] bg-indigo-600/40 text-indigo-200 px-1.5 py-0.5 rounded">
                                                    Must use: "{safeString(pred)}"
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {brief.discourse_anchors && brief.discourse_anchors.length > 0 && (
                                    <div>
                                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider block mb-1">Discourse Anchors (Transitions)</span>
                                        <div className="flex flex-wrap gap-2">
                                            {brief.discourse_anchors.map((anchor, i) => (
                                                <span key={i} className="text-xs text-gray-300 italic bg-gray-800 px-2 py-1 rounded border border-gray-700">
                                                    "{safeString(anchor)}"
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* Strategic Context (New) */}
                        {((brief.perspectives && brief.perspectives.length > 0) || brief.methodology_note) && (
                            <Card className="p-4 bg-gray-900/50">
                                <h3 className="font-semibold text-lg text-blue-300 mb-2">Strategic Context</h3>
                                {brief.methodology_note && (
                                    <div className="mb-3">
                                        <span className="text-gray-400 text-sm font-bold block mb-1">Methodology:</span>
                                        <span className="text-gray-300 text-sm">{safeString(brief.methodology_note)}</span>
                                    </div>
                                )}
                                {brief.perspectives && brief.perspectives.length > 0 && (
                                    <div>
                                        <span className="text-gray-400 text-sm font-bold block mb-1">Perspectives:</span>
                                        <div className="flex flex-wrap gap-2">
                                            {brief.perspectives.map((p, i) => (
                                                <span key={i} className="text-xs bg-purple-900/40 text-purple-200 px-2 py-1 rounded border border-purple-800/50">
                                                    {safeString(p)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* Detailed Section Guidance (New) */}
                        {brief.structured_outline && brief.structured_outline.length > 0 ? (
                            <Card className="p-4 bg-gray-900/50">
                                <h3 className="font-semibold text-lg text-blue-300 mb-4">Detailed Section Guidance</h3>
                                <div className="space-y-4">
                                    {brief.structured_outline.map((section: BriefSection, idx) => (
                                        <div key={idx} className={`border-l-2 border-gray-700 pl-3 ${section.level > 2 ? 'ml-4' : ''}`}>
                                            <h4 className={`text-white font-medium ${section.level === 2 ? 'text-base' : 'text-sm'}`}>
                                                {safeString(section.heading)}
                                            </h4>
                                            {section.subordinate_text_hint && (
                                                <p className="text-xs text-gray-400 italic mt-1 bg-black/20 p-2 rounded">
                                                    <span className="text-yellow-500 font-bold">Hint:</span> {safeString(section.subordinate_text_hint)}
                                                </p>
                                            )}
                                            {section.methodology_note && (
                                                <p className="text-[10px] text-cyan-400 mt-1 uppercase font-bold tracking-wide">
                                                    Format: {safeString(section.methodology_note)}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        ) : (
                            /* Fallback to Legacy Markdown Outline if structured data is missing */
                            <Card className="p-4 bg-gray-900/50">
                                <h3 className="font-semibold text-lg text-blue-300 mb-2">Article Outline</h3>
                                <div className="whitespace-pre-wrap font-mono text-sm text-gray-300">
                                    {safeString(brief.outline)}
                                </div>
                            </Card>
                        )}

                        {/* Key Takeaways */}
                        {brief.keyTakeaways && brief.keyTakeaways.length > 0 && (
                             <Card className="p-4 bg-gray-900/50">
                                <h3 className="font-semibold text-lg text-blue-300 mb-2">Key Takeaways</h3>
                                <ul className="list-disc list-inside space-y-1">
                                    {brief.keyTakeaways.map((item, index) => (
                                        <li key={index}>{safeString(item)}</li>
                                    ))}
                                </ul>
                            </Card>
                        )}

                        {/* Enhanced Visual Semantics Panel - shows when we have any data to analyze */}
                        {((brief.structured_outline && brief.structured_outline.length > 0) ||
                          (brief.visual_semantics && brief.visual_semantics.length > 0) ||
                          brief.title) && (
                            <Card className="p-4 bg-gray-900/50">
                                <VisualSemanticsPanel
                                    brief={brief}
                                    searchIntent={activeBriefTopic?.metadata?.search_intent as string | undefined}
                                    onCopyHTML={(html) => {
                                        dispatch({ type: 'SET_NOTIFICATION', payload: 'HTML template copied to clipboard!' });
                                    }}
                                    onAutoFix={handleAutoFixVisualSemantics}
                                    isAutoFixing={isAutoFixingVisuals}
                                />
                            </Card>
                        )}

                        {/* Legacy Visual Semantics (fallback when panel can't render) */}
                        {!brief.structured_outline && !brief.visual_semantics && !brief.title && brief.visual_semantics && brief.visual_semantics.length > 0 && (
                            <Card className="p-4 bg-gray-900/50">
                                <h3 className="font-semibold text-lg text-blue-300 mb-3">Visual Semantics</h3>
                                <div className="space-y-3">
                                    {brief.visual_semantics.map((visual, i) => (
                                        <div key={i} className="p-3 bg-black/20 rounded border border-gray-700 flex flex-col gap-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-cyan-400 bg-cyan-900/20 px-2 py-0.5 rounded border border-cyan-700/50">
                                                    {safeString(visual.type)}
                                                </span>
                                                {(visual.width_hint || visual.height_hint) && (
                                                    <span className="text-[10px] text-gray-500 font-mono">
                                                        {safeString(visual.width_hint || '?')} x {safeString(visual.height_hint || '?')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-200">{safeString(visual.description)}</p>
                                            {visual.caption_data && (
                                                <div className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded border-l-2 border-gray-600">
                                                    <span className="font-bold">Data/Caption:</span> {safeString(visual.caption_data)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Knowledge Graph Bridging Context */}
                        {activeBriefTopic && knowledgeGraph && activeMap?.eavs && (
                            <TopicBridgingContext
                                topic={activeBriefTopic}
                                knowledgeGraph={knowledgeGraph}
                                eavs={activeMap.eavs as import('../../types').SemanticTriple[]}
                                pillars={activeMap.pillars}
                                allTopics={allTopics}
                            />
                        )}

                         {/* Internal Links */}
                        {bridgeLinks.length > 0 && (
                            <Card className="p-4 bg-gray-900/50">
                                <h3 className="font-semibold text-lg text-blue-300 mb-2">Internal Linking Plan</h3>
                                { !Array.isArray(brief.contextualBridge) && brief.contextualBridge?.content && (
                                    <div className="mb-4 p-3 bg-gray-800/50 rounded border border-gray-700">
                                        <p className="text-sm text-gray-300 italic">{safeString(brief.contextualBridge.content)}</p>
                                    </div>
                                )}
                                <ul className="space-y-3">
                                    {bridgeLinks.map((link, index) => (
                                        <li key={index} className="bg-black/20 p-2 rounded border border-gray-700/50">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p>Link to: <strong className="text-white">{safeString(link.targetTopic)}</strong></p>
                                                    <p className="text-sm mt-1">Anchor: <em className="text-cyan-300">"{safeString(link.anchorText)}"</em></p>
                                                </div>
                                            </div>
                                            {link.annotation_text_hint && (
                                                <p className="text-xs text-gray-400 mt-2 pl-2 border-l-2 border-gray-600">
                                                    <span className="font-bold text-gray-500">Context Hint:</span> "{safeString(link.annotation_text_hint)}"
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        )}
                    </div>
                </div>
        </>
    );

    // Sub-modals (always rendered as modals regardless of asPage)
    const subModals = (
        <>
        {/* Brief Edit Modal */}
        {showEditModal && brief && activeBriefTopic && activeMap && activeMapId && (
            <BriefEditModal
                isOpen={showEditModal}
                brief={brief}
                topic={activeBriefTopic}
                pillars={activeMap.pillars || { centralEntity: '', sourceContext: '', centralSearchIntent: '' }}
                allTopics={allTopics}
                mapId={activeMapId}
                businessInfo={effectiveBusinessInfo}
                onClose={() => setShowEditModal(false)}
                onSaved={() => setShowEditModal(false)}
                onRepairMissing={handleRepairMissing}
                isRepairing={isRepairingBrief}
            />
        )}

        {/* Report Modal */}
        {reportHook.data && (
            <ReportModal
                isOpen={reportHook.isOpen}
                onClose={reportHook.close}
                reportType="content-brief"
                data={reportHook.data}
                projectName={activeMap?.name || effectiveBusinessInfo?.projectName}
            />
        )}

        {/* Template Confirmation Flow (Phase 3 - Template Routing Integration) */}
        {showTemplateFlow && brief && (
            <TemplateConfirmationFlow
                isOpen={showTemplateFlow}
                onClose={() => setShowTemplateFlow(false)}
                onConfirm={handleTemplateConfirmed}
                brief={brief}
                businessInfo={effectiveBusinessInfo}
            />
        )}
        </>
    );

    if (asPage) {
        return (
            <>
                <div className="-m-4">
                    <Card className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
                        {customHeader}
                        {modalBodyContent}
                        {footerContent && (
                            <div className="border-t border-gray-700 p-4 flex-shrink-0">
                                {footerContent}
                            </div>
                        )}
                    </Card>
                </div>
                {subModals}
            </>
        );
    }

    return (
    <>
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Content Brief"
            description={`Content brief for ${activeBriefTopic?.title || 'topic'}`}
            maxWidth="max-w-4xl"
            showHeader={false}
            customHeader={customHeader}
            footer={footerContent}
            className="max-h-[90vh] flex flex-col"
        >
            {modalBodyContent}
        </Modal>
        {subModals}
    </>
    );
};

export default ContentBriefModal;
