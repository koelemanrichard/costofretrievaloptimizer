import React, { useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../../state/appState';
import DraftingModal from '../../modals/DraftingModal';
import { FlowAuditModal } from '../../modals';
import { ContentBrief, BusinessInfo, ContextualFlowIssue } from '../../../types';
import * as aiService from '../../../services/aiService';
import { getSupabaseClient } from '../../../services/supabaseClient';

/**
 * DraftPage - Route wrapper for the Drafting workspace.
 * Renders the existing DraftingModal as a full page.
 * Computes effectiveBusinessInfo (map-level language/region merge),
 * provides real flow analysis handler, and renders FlowAuditModal.
 */
const DraftPage: React.FC = () => {
    const { state, dispatch } = useAppState();
    const navigate = useNavigate();
    const { projectId, mapId, topicId } = useParams<{ projectId: string; mapId: string; topicId: string }>();

    const currentMap = state.topicalMaps.find(m => m.id === state.activeMapId);
    const topic = currentMap?.topics?.find(t => t.id === topicId);
    const brief = topic ? currentMap?.briefs?.[topic.id] || null : null;
    const activeProject = useMemo(() => state.projects.find(p => p.id === state.activeProjectId), [state.projects, state.activeProjectId]);

    // Build effective business info: global settings + project domain + map overrides
    // Same pattern as ProjectDashboardContainer:94-133
    const effectiveBusinessInfo = useMemo<BusinessInfo>(() => {
        const mapBusinessInfo = currentMap?.business_info as Partial<BusinessInfo> || {};

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

        // Derive region from targetMarket if not explicitly set (backward compat)
        const effectiveRegion = mapBusinessContext.region || state.businessInfo.region || mapBusinessContext.targetMarket || state.businessInfo.targetMarket;

        return {
            ...state.businessInfo,
            // Use project domain if map doesn't have one set
            domain: mapBusinessContext.domain || activeProject?.domain || state.businessInfo.domain,
            projectName: mapBusinessContext.projectName || activeProject?.project_name || state.businessInfo.projectName,
            // Spread map-specific business context (NOT AI settings)
            ...mapBusinessContext,
            // Ensure region is populated (fallback to targetMarket for backward compat)
            region: effectiveRegion,
            // But ensure domain is always from project if map didn't override it
            ...(mapBusinessContext.domain ? {} : { domain: activeProject?.domain || state.businessInfo.domain }),
            // AI settings ALWAYS from global (user_settings), not from map's business_info
            aiProvider: state.businessInfo.aiProvider,
            aiModel: state.businessInfo.aiModel,
            geminiApiKey: state.businessInfo.geminiApiKey,
            openAiApiKey: state.businessInfo.openAiApiKey,
            anthropicApiKey: state.businessInfo.anthropicApiKey,
            perplexityApiKey: state.businessInfo.perplexityApiKey,
            openRouterApiKey: state.businessInfo.openRouterApiKey,
        };
    }, [state.businessInfo, currentMap, activeProject]);

    const handleClose = () => {
        navigate(`/p/${projectId}/m/${mapId}/topics/${topicId}`);
    };

    const handleAudit = (auditBrief: ContentBrief, draft: string) => {
        // Audit is handled within the DraftingModal itself
    };

    const handleGenerateSchema = (schemaBrief: ContentBrief) => {
        // Schema generation is handled within the DraftingModal itself
    };

    // Real flow analysis handler (based on useAnalysisOperations:913-967)
    const handleAnalyzeFlow = useCallback(async (draft: string) => {
        if (!currentMap?.pillars) {
            dispatch({ type: 'SET_ERROR', payload: "Missing map pillars for flow analysis." });
            return;
        }
        dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: true } });
        dispatch({ type: 'SET_NOTIFICATION', payload: 'Analyzing contextual flow...' });

        // Strip base64 images to reduce token count
        const draftForFlow = draft
            .replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+\)/g, '![image](base64-image-removed)')
            .replace(/<img[^>]*src="data:image\/[^;]+;base64,[A-Za-z0-9+/=]+"[^>]*>/g, '<img src="base64-image-removed" />');

        try {
            const result = await aiService.analyzeContextualFlow(
                draftForFlow,
                currentMap.pillars.centralEntity,
                effectiveBusinessInfo,
                dispatch
            );
            dispatch({ type: 'SET_FLOW_AUDIT_RESULT', payload: result });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'flowAudit', visible: true } });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Flow audit failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: false } });
        }
    }, [currentMap, effectiveBusinessInfo, dispatch]);

    // Flow auto-fix: apply a single issue remediation
    const handleFlowAutoFix = useCallback(async (issue: ContextualFlowIssue) => {
        if (!issue.offendingSnippet || !issue.remediation) {
            dispatch({ type: 'SET_ERROR', payload: "Cannot auto-fix: missing text context." });
            return;
        }
        if (!brief?.articleDraft || !state.activeMapId) return;

        dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: true } });

        try {
            const refinedSnippet = await aiService.applyFlowRemediation(
                issue.offendingSnippet,
                issue,
                effectiveBusinessInfo,
                dispatch
            );

            const newDraft = brief.articleDraft.replace(issue.offendingSnippet, refinedSnippet);

            // Update DB
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { error } = await supabase
                .from('content_briefs')
                .update({ article_draft: newDraft })
                .eq('id', brief.id);

            if (error) throw error;

            // Update State
            const updatedBrief = { ...brief, articleDraft: newDraft };
            dispatch({ type: 'ADD_BRIEF', payload: { mapId: state.activeMapId, topicId: brief.topic_id, brief: updatedBrief } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Applied flow remediation successfully. Re-run flow analysis to see updated results.' });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Flow auto-fix failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: false } });
        }
    }, [brief, state.activeMapId, state.businessInfo, effectiveBusinessInfo, dispatch]);

    // Batch flow auto-fix: apply all fixable issues
    const handleBatchFlowAutoFix = useCallback(async (issues: ContextualFlowIssue[]) => {
        if (!brief?.articleDraft || !state.activeMapId || issues.length === 0) return;

        dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: true } });

        try {
            const newDraft = await aiService.applyBatchFlowRemediation(
                brief.articleDraft,
                issues,
                effectiveBusinessInfo,
                dispatch
            );

            // Update DB
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { error } = await supabase
                .from('content_briefs')
                .update({ article_draft: newDraft })
                .eq('id', brief.id);

            if (error) throw error;

            // Update State
            const updatedBrief = { ...brief, articleDraft: newDraft };
            dispatch({ type: 'ADD_BRIEF', payload: { mapId: state.activeMapId, topicId: brief.topic_id, brief: updatedBrief } });
            dispatch({ type: 'SET_NOTIFICATION', payload: `Batch fixed ${issues.length} flow issues. Re-run flow analysis to see updated results.` });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Batch flow auto-fix failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: false } });
        }
    }, [brief, state.activeMapId, state.businessInfo, effectiveBusinessInfo, dispatch]);

    return (
        <>
            <DraftingModal
                isOpen={true}
                onClose={handleClose}
                brief={brief}
                onAudit={handleAudit}
                onGenerateSchema={handleGenerateSchema}
                isLoading={!!state.isLoading.draft || !!state.isLoading.flowAudit}
                businessInfo={effectiveBusinessInfo}
                onAnalyzeFlow={handleAnalyzeFlow}
                asPage={true}
            />
            <FlowAuditModal
                isOpen={!!state.modals.flowAudit}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'flowAudit', visible: false } })}
                result={state.flowAuditResult}
                onAutoFix={handleFlowAutoFix}
                onBatchAutoFix={handleBatchFlowAutoFix}
                onRefreshAnalysis={async () => {
                    if (brief?.articleDraft) {
                        await handleAnalyzeFlow(brief.articleDraft);
                    }
                }}
                isRefreshing={!!state.isLoading?.flowAudit}
            />
        </>
    );
};

export default DraftPage;
