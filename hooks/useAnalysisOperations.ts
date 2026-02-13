
import { useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { AppAction } from '../state/appState';
import {
    SEOPillars,
    EnrichedTopic,
    ContentBrief,
    BusinessInfo,
    TopicalMap,
    GscRow,
    ValidationIssue,
    MergeSuggestion,
    MapImprovementSuggestion,
    SemanticTriple,
    AuditRuleResult,
    ContextualFlowIssue,
    StreamingProgress,
} from '../types';
import * as aiService from '../services/aiService';
import { getSupabaseClient } from '../services/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { slugify, cleanSlug } from '../utils/helpers';
import { KnowledgeGraph } from '../lib/knowledgeGraph';
import { sanitizeTopicFromDb } from '../utils/parsers';
import { verifiedInsert, verifiedBulkInsert, verifiedUpdate, verifiedBulkDelete, verifiedDelete } from '../services/verifiedDatabaseService';
import { runUnifiedAudit, UnifiedAuditContext } from '../services/ai/unifiedAudit';
import { applyFix, generateFix, FixContext } from '../services/ai/auditFixes';
import type { Json } from '../database.types';

// ============================================
// useAnalysisOperations
// Extracted from ProjectDashboardContainer – handles all analysis,
// validation, audit, merge, GSC, knowledge domain, flow, and
// unified-audit related handlers.
// ============================================

interface UseAnalysisOperationsParams {
    activeMapId: string | null;
    activeMap: TopicalMap | undefined;
    effectiveBusinessInfo: BusinessInfo;
    businessInfo: BusinessInfo;
    knowledgeGraph: KnowledgeGraph | null;
    allTopics: EnrichedTopic[];
    briefs: Record<string, ContentBrief>;
    dispatch: React.Dispatch<AppAction>;
    user: User | null;
    // Slices of state referenced by individual handlers
    websiteStructure: {
        foundationPages: any[];
        navigation: any;
    };
    unifiedAudit: {
        lastAuditId: string | null;
    };
    activeBriefTopic: EnrichedTopic | null;
    improvementLog: MapImprovementSuggestion | null;
    topicalMaps: TopicalMap[];
    // Local state setters for improvement confirmation flow
    setShowImprovementConfirmation: (v: boolean) => void;
    setIsApplyingImprovement: (v: boolean) => void;
    pendingImprovementOptions: { includeTypeReclassifications: boolean };
    setPendingImprovementOptions: (v: { includeTypeReclassifications: boolean }) => void;
}

export function useAnalysisOperations({
    activeMapId,
    activeMap,
    effectiveBusinessInfo,
    businessInfo,
    knowledgeGraph,
    allTopics,
    briefs,
    dispatch,
    user,
    websiteStructure,
    unifiedAudit,
    activeBriefTopic,
    improvementLog,
    topicalMaps,
    setShowImprovementConfirmation,
    setIsApplyingImprovement,
    pendingImprovementOptions,
    setPendingImprovementOptions,
}: UseAnalysisOperationsParams) {

    // Helper to save analysis results to DB to persist them across reloads
    const saveAnalysisState = useCallback(async (key: string, data: any) => {
        if (!activeMapId || !activeMap) return;
        try {
            const currentAnalysisState = activeMap.analysis_state || {};
            const updatedAnalysisState = {
                ...currentAnalysisState,
                [key]: data
            };

            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            await supabase
                .from('topical_maps')
                .update({ analysis_state: updatedAnalysisState as any })
                .eq('id', activeMapId);

            // Update local state to reflect the change (important if we navigate away and back)
            dispatch({
                type: 'UPDATE_MAP_DATA',
                payload: {
                    mapId: activeMapId,
                    data: { analysis_state: updatedAnalysisState }
                }
            });

        } catch (err) {
            console.error("Failed to save analysis state:", err);
            // Non-critical error, don't block the UI
        }
    }, [activeMapId, activeMap, businessInfo, dispatch]);

    const onAnalyzeKnowledgeDomain = useCallback(async () => {
        if (!activeMapId || !activeMap?.pillars) {
            dispatch({ type: 'SET_ERROR', payload: 'Pillars must be defined to analyze the knowledge domain.' });
            return;
        }
        dispatch({ type: 'SET_LOADING', payload: { key: 'knowledgeDomain', value: true } });
        try {
            const triples = await aiService.expandSemanticTriples(effectiveBusinessInfo, activeMap.pillars, activeMap.eavs || [], dispatch);
            const kg = new KnowledgeGraph();

            // Rebuild from scratch to include new triples + existing
            const existingEavs = Array.isArray(activeMap.eavs) ? activeMap.eavs : [];
            [...existingEavs, ...triples].forEach((triple: any) => {
                if (triple?.subject?.label) kg.addNode({ id: triple.subject.label, term: triple.subject.label, type: triple.subject.type, definition: '', metadata: { importance: 8, source: 'AI' } });
                if (triple?.object?.value) kg.addNode({ id: String(triple.object.value), term: String(triple.object.value), type: triple.object.type, definition: '', metadata: { importance: 5, source: 'AI' } });
            });

            dispatch({ type: 'SET_KNOWLEDGE_GRAPH', payload: kg });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'knowledgeDomain', visible: true } });
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to analyze domain.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'knowledgeDomain', value: false } });
        }
    }, [activeMap, activeMapId, dispatch, effectiveBusinessInfo]);

    const handleExpandKnowledgeDomain = useCallback(async () => {
        if (!activeMapId || !activeMap?.pillars || !knowledgeGraph) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'knowledgeDomain', value: true } });

        try {
            const currentEavs = activeMap.eavs || [];
            const newTriples = await aiService.expandSemanticTriples(effectiveBusinessInfo, activeMap.pillars, currentEavs, dispatch);

            if (newTriples.length > 0) {
                // Update Knowledge Graph
                newTriples.forEach((triple) => {
                     if (triple?.subject?.label) knowledgeGraph.addNode({ id: triple.subject.label, term: triple.subject.label, type: triple.subject.type, definition: '', metadata: { importance: 7, source: 'Expansion' } });
                     if (triple?.object?.value) knowledgeGraph.addNode({ id: String(triple.object.value), term: String(triple.object.value), type: triple.object.type, definition: '', metadata: { importance: 4, source: 'Expansion' } });
                });

                // Update State and Persist (Optimistic update, skipping immediate DB save for session fluidity, or we can save to DB)
                const updatedEavs = [...currentEavs, ...newTriples];
                dispatch({ type: 'SET_EAVS', payload: { mapId: activeMapId, eavs: updatedEavs } });

                // Trigger KG re-render via dispatching the updated instance
                dispatch({ type: 'SET_KNOWLEDGE_GRAPH', payload: knowledgeGraph });

                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

                // Use verified update to ensure EAVs are persisted
                const updateResult = await verifiedUpdate(
                    supabase,
                    { table: 'topical_maps', operationDescription: 'save expanded EAVs' },
                    activeMapId,
                    { eavs: updatedEavs as any }
                );

                if (!updateResult.success) {
                    dispatch({ type: 'SET_ERROR', payload: `⚠️ Added concepts to graph but failed to persist: ${updateResult.error}` });
                } else {
                    dispatch({ type: 'SET_NOTIFICATION', payload: `✓ Added ${newTriples.length} new semantic concepts to the Knowledge Graph.` });
                }
            } else {
                 dispatch({ type: 'SET_NOTIFICATION', payload: 'AI did not find any significant new concepts to add.' });
            }
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to expand knowledge domain.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'knowledgeDomain', value: false } });
        }
    }, [activeMap, activeMapId, knowledgeGraph, effectiveBusinessInfo, dispatch, businessInfo]);

    const onValidateMap = useCallback(async () => {
        if (!activeMap || !activeMap.pillars) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'validation', value: true } });
        dispatch({ type: 'SET_NOTIFICATION', payload: 'Validating map structure... This may take a moment.' });
        try {
            const result = await aiService.validateTopicalMap(allTopics, activeMap.pillars, effectiveBusinessInfo, dispatch, briefs);
            dispatch({ type: 'SET_VALIDATION_RESULT', payload: result });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'validation', visible: true } });
            saveAnalysisState('validationResult', result);
            const issueCount = result.issues?.length || 0;
            dispatch({ type: 'SET_NOTIFICATION', payload: issueCount > 0
                ? `Validation complete: ${issueCount} issue${issueCount > 1 ? 's' : ''} found.`
                : 'Validation complete: No issues found!' });
        } catch(e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Validation failed' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'validation', value: false } });
        }
    }, [activeMap, allTopics, effectiveBusinessInfo, dispatch, saveAnalysisState, briefs]);

    const onFindMergeOpportunities = useCallback(async () => {
        if (!activeMap || !activeMap.pillars) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'merge', value: true } });
        try {
            const suggestions = await aiService.findMergeOpportunities(allTopics, effectiveBusinessInfo, dispatch);
            dispatch({ type: 'SET_MERGE_SUGGESTIONS', payload: suggestions });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'merge', visible: true } });
        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to find merge opportunities.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'merge', value: false } });
        }
    }, [activeMap, allTopics, effectiveBusinessInfo, dispatch]);

    const onAnalyzeSemanticRelationships = useCallback(async () => {
        if (!activeMap || !activeMap.pillars) return;
         dispatch({ type: 'SET_LOADING', payload: { key: 'semantic', value: true } });
         try {
             const result = await aiService.analyzeSemanticRelationships(allTopics, effectiveBusinessInfo, dispatch);
             dispatch({ type: 'SET_SEMANTIC_ANALYSIS_RESULT', payload: result });
             dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'semantic', visible: true } });
             saveAnalysisState('semanticAnalysisResult', result);
         } catch (e) {
              dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Semantic analysis failed.' });
         } finally {
              dispatch({ type: 'SET_LOADING', payload: { key: 'semantic', value: false } });
         }
    }, [activeMap, allTopics, effectiveBusinessInfo, dispatch, saveAnalysisState]);

    const onAnalyzeContextualCoverage = useCallback(async () => {
        if (!activeMap || !activeMap.pillars) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'coverage', value: true } });
        try {
             const result = await aiService.analyzeContextualCoverage(effectiveBusinessInfo, allTopics, activeMap.pillars, dispatch);
             dispatch({ type: 'SET_CONTEXTUAL_COVERAGE_RESULT', payload: result });
             dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'coverage', visible: true } });
             saveAnalysisState('contextualCoverageResult', result);
         } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Contextual coverage analysis failed.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'coverage', value: false } });
        }
    }, [activeMap, allTopics, effectiveBusinessInfo, dispatch, saveAnalysisState]);

    const onAuditInternalLinking = useCallback(async () => {
        if (!activeMap || !activeMap.pillars) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'linkingAudit', value: true } });
        try {
             const result = await aiService.auditInternalLinking(allTopics, briefs, effectiveBusinessInfo, dispatch);
             dispatch({ type: 'SET_INTERNAL_LINK_AUDIT_RESULT', payload: result });
             dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'linkingAudit', visible: true } });
             saveAnalysisState('internalLinkAuditResult', result);
        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Linking audit failed.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'linkingAudit', value: false } });
        }
    }, [activeMap, allTopics, briefs, effectiveBusinessInfo, dispatch, saveAnalysisState]);

    const onCalculateTopicalAuthority = useCallback(async () => {
        if (!activeMap || !activeMap.pillars || !knowledgeGraph) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'authority', value: true } });
        try {
             const result = await aiService.calculateTopicalAuthority(allTopics, briefs, knowledgeGraph, effectiveBusinessInfo, dispatch);
             dispatch({ type: 'SET_TOPICAL_AUTHORITY_SCORE', payload: result });
             dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'authority', visible: true } });
             saveAnalysisState('topicalAuthorityScore', result);
        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Authority calculation failed.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'authority', value: false } });
        }
    }, [activeMap, allTopics, briefs, knowledgeGraph, effectiveBusinessInfo, dispatch, saveAnalysisState]);

    const onGeneratePublicationPlan = useCallback(async () => {
        if (!activeMap || !activeMap.pillars) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'plan', value: true } });
        try {
             const result = await aiService.generatePublicationPlan(allTopics, effectiveBusinessInfo, dispatch);
             dispatch({ type: 'SET_PUBLICATION_PLAN', payload: result });
             dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'plan', visible: true } });
             saveAnalysisState('publicationPlan', result);
        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Publication plan generation failed.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'plan', value: false } });
        }
    }, [activeMap, allTopics, effectiveBusinessInfo, dispatch, saveAnalysisState]);

    // Unified Audit handler (Phase 6)
    const onRunUnifiedAudit = useCallback(async () => {
        if (!activeMap || !activeMapId) return;
        dispatch({ type: 'SET_UNIFIED_AUDIT_RUNNING', payload: true });
        dispatch({ type: 'SET_LOADING', payload: { key: 'unifiedAudit', value: true } });
        dispatch({ type: 'SET_UNIFIED_AUDIT_PROGRESS', payload: null });

        try {
            const context: UnifiedAuditContext = {
                mapId: activeMapId,
                topics: allTopics,
                briefs: briefs,
                foundationPages: websiteStructure.foundationPages || [],
                navigation: websiteStructure.navigation || null,
                eavs: (activeMap.eavs as SemanticTriple[]) || [],
                pillars: activeMap.pillars ? [{ id: activeMap.pillars.centralEntity, name: activeMap.pillars.centralEntity }] : [],
            };

            const result = await runUnifiedAudit(
                context,
                user?.id,
                (progress) => {
                    dispatch({ type: 'SET_UNIFIED_AUDIT_PROGRESS', payload: progress });
                }
            );
            dispatch({ type: 'SET_UNIFIED_AUDIT_RESULT', payload: result });
            dispatch({ type: 'SET_UNIFIED_AUDIT_ID', payload: result.id });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'unifiedAudit', visible: true } });
            saveAnalysisState('unifiedAuditResult', result);
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Unified audit failed.' });
        } finally {
            dispatch({ type: 'SET_UNIFIED_AUDIT_RUNNING', payload: false });
            dispatch({ type: 'SET_UNIFIED_AUDIT_PROGRESS', payload: null });
            dispatch({ type: 'SET_LOADING', payload: { key: 'unifiedAudit', value: false } });
        }
    }, [activeMap, activeMapId, allTopics, briefs, websiteStructure, user, dispatch, saveAnalysisState]);

    // Handle applying a single fix from unified audit
    const handleApplyUnifiedFix = useCallback(async (issue: any, existingFix?: any) => {
        if (!activeMapId || !user) return;
        const fix = existingFix || generateFix(issue);
        if (!fix) {
            dispatch({ type: 'SET_NOTIFICATION', payload: `Acknowledged: ${issue.suggestedFix || issue.message}` });
            return;
        }

        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
        const context: FixContext = {
            supabase,
            mapId: activeMapId,
            userId: user.id,
            auditRunId: unifiedAudit.lastAuditId || '',
        };

        const result = await applyFix(issue, fix, context);
        if (result.success) {
            dispatch({ type: 'SET_NOTIFICATION', payload: result.message });
            if (result.historyEntry) {
                dispatch({ type: 'ADD_UNIFIED_AUDIT_HISTORY', payload: result.historyEntry });
            }
        } else {
            dispatch({ type: 'SET_ERROR', payload: result.error || result.message });
        }
    }, [activeMapId, user, unifiedAudit.lastAuditId, businessInfo, dispatch]);

    // Handle applying all fixes from unified audit
    const handleApplyAllUnifiedFixes = useCallback(async (issues: any[], _fixes: any[]) => {
        for (const issue of issues) {
            await handleApplyUnifiedFix(issue);
        }
        dispatch({ type: 'SET_NOTIFICATION', payload: `Applied fixes for ${issues.length} issues` });
    }, [handleApplyUnifiedFix, dispatch]);

    // Phase 1: Generate improvement suggestions and show confirmation modal
    const onImproveMap = useCallback(async (issues: ValidationIssue[], options?: { includeTypeReclassifications?: boolean }) => {
        if (!activeMapId || !activeMap?.pillars) return;
        if (!user) return;

        const includeTypeReclassifications = options?.includeTypeReclassifications ?? true;
        setPendingImprovementOptions({ includeTypeReclassifications });

        dispatch({ type: 'SET_LOADING', payload: { key: 'improveMap', value: true } });

        try {
            const suggestion = await aiService.improveTopicalMap(allTopics, issues, effectiveBusinessInfo, dispatch);
            dispatch({ type: 'SET_IMPROVEMENT_LOG', payload: suggestion });

            // Show confirmation modal instead of immediately applying
            setShowImprovementConfirmation(true);
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'validation', visible: false } });

        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Map improvement analysis failed.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'improveMap', value: false } });
        }
    }, [activeMapId, activeMap, allTopics, effectiveBusinessInfo, dispatch, user, setPendingImprovementOptions, setShowImprovementConfirmation]);

    // Phase 2: Apply the confirmed improvements
    const onApplyImprovement = useCallback(async () => {
        if (!activeMapId || !improvementLog) return;
        if (!user) return;

        const suggestion = improvementLog;
        const includeTypeReclassifications = pendingImprovementOptions.includeTypeReclassifications;

        setIsApplyingImprovement(true);

        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            // Build a lookup of core topics by title for parent assignment
            const coreTopicsByTitle = new Map<string, EnrichedTopic>();
            allTopics.filter(t => t.type === 'core').forEach(t => {
                coreTopicsByTitle.set(t.title.toLowerCase(), t);
            });

            // Collect all new topics (from newTopics and hubSpokeGapFills)
            const allNewTopics: typeof suggestion.newTopics = [...suggestion.newTopics];

            // Process hubSpokeGapFills - convert to newTopics format
            if (suggestion.hubSpokeGapFills && suggestion.hubSpokeGapFills.length > 0) {
                suggestion.hubSpokeGapFills.forEach(fill => {
                    fill.newSpokes.forEach(spoke => {
                        allNewTopics.push({
                            title: spoke.title,
                            description: spoke.description,
                            type: 'outer',
                            topic_class: spoke.topic_class,
                            parentTopicTitle: fill.hubTitle,
                            reasoning: `Hub-spoke gap fill for "${fill.hubTitle}"`
                        });
                    });
                });
            }

            if (allNewTopics.length > 0) {
                // First pass: Create core topics to get their IDs
                const coreTopicsToAdd = allNewTopics.filter(t => t.type === 'core');
                const outerTopicsToAdd = allNewTopics.filter(t => t.type === 'outer');

                // Track newly created cores for parent resolution
                const newCoresByTitle = new Map<string, string>(); // title -> id

                // Add core topics first
                if (coreTopicsToAdd.length > 0) {
                    const coreDbTopics = coreTopicsToAdd.map(t => ({
                        id: uuidv4(),
                        map_id: activeMapId,
                        user_id: user.id,
                        title: t.title,
                        slug: slugify(t.title),
                        description: t.description,
                        type: 'core' as const,
                        freshness: 'EVERGREEN',
                        parent_topic_id: null,
                        metadata: {
                            topic_class: t.topic_class || 'informational'
                        }
                    }));

                    coreDbTopics.forEach(ct => {
                        newCoresByTitle.set(ct.title.toLowerCase(), ct.id);
                    });

                    // Use verified bulk insert
                    const coreResult = await verifiedBulkInsert(
                        supabase,
                        { table: 'topics', operationDescription: `add ${coreDbTopics.length} core topics from improvement` },
                        coreDbTopics,
                        '*'
                    );

                    if (!coreResult.success) {
                        throw new Error(coreResult.error || 'Core topic insert verification failed');
                    }

                    (coreResult.data || []).forEach(topic => {
                        dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: sanitizeTopicFromDb(topic) } });
                    });

                    dispatch({ type: 'LOG_EVENT', payload: {
                        service: 'MapImprovement',
                        message: `✓ Added ${coreResult.data?.length || 0} new core topics (verified)`,
                        status: 'info',
                        timestamp: Date.now()
                    }});
                }

                // Add outer topics with proper parent assignment
                if (outerTopicsToAdd.length > 0) {
                    const outerDbTopics = outerTopicsToAdd.map(t => {
                        // Resolve parent topic ID
                        let parentId: string | null = null;
                        if (t.parentTopicTitle) {
                            const parentTitleLower = t.parentTopicTitle.toLowerCase();
                            // First check newly created cores
                            if (newCoresByTitle.has(parentTitleLower)) {
                                parentId = newCoresByTitle.get(parentTitleLower) || null;
                            } else if (coreTopicsByTitle.has(parentTitleLower)) {
                                // Then check existing cores
                                parentId = coreTopicsByTitle.get(parentTitleLower)?.id || null;
                            }
                        }

                        // Generate proper slug with parent context
                        const parentTopic = parentId ?
                            (allTopics.find(p => p.id === parentId) || { slug: '' }) :
                            { slug: '' };
                        const parentSlug = parentTopic.slug || '';
                        const slug = parentId && parentSlug
                            ? `${parentSlug}/${cleanSlug(parentSlug, t.title)}`.replace(/^\//, '')
                            : slugify(t.title);

                        return {
                            id: uuidv4(),
                            map_id: activeMapId,
                            user_id: user.id,
                            title: t.title,
                            slug,
                            description: t.description,
                            type: 'outer' as const,
                            freshness: 'STANDARD',
                            parent_topic_id: parentId,
                            metadata: {
                                topic_class: t.topic_class || 'informational'
                            }
                        };
                    });

                    // Use verified bulk insert
                    const outerResult = await verifiedBulkInsert(
                        supabase,
                        { table: 'topics', operationDescription: `add ${outerDbTopics.length} outer topics from improvement` },
                        outerDbTopics,
                        '*'
                    );

                    if (!outerResult.success) {
                        throw new Error(outerResult.error || 'Outer topic insert verification failed');
                    }

                    (outerResult.data || []).forEach(topic => {
                        dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: sanitizeTopicFromDb(topic) } });
                    });

                    // Log parent assignment stats
                    const withParent = outerDbTopics.filter(t => t.parent_topic_id).length;
                    const orphaned = outerDbTopics.filter(t => !t.parent_topic_id).length;
                    dispatch({ type: 'LOG_EVENT', payload: {
                        service: 'MapImprovement',
                        message: `✓ Added ${outerResult.data?.length || 0} outer topics (${withParent} with parents, ${orphaned} orphaned) (verified)`,
                        status: orphaned > 0 ? 'warning' : 'info',
                        timestamp: Date.now()
                    }});
                }
            }

            if (suggestion.topicTitlesToDelete.length > 0) {
                const idsToDelete: string[] = [];
                suggestion.topicTitlesToDelete.forEach(title => {
                    const match = allTopics.find(t => t.title.toLowerCase() === title.toLowerCase());
                    if (match) idsToDelete.push(match.id);
                });

                if (idsToDelete.length > 0) {
                    const deleteResult = await verifiedBulkDelete(
                        supabase,
                        { table: 'topics', operationDescription: `delete ${idsToDelete.length} topics from improvement` },
                        { column: 'id', operator: 'in', value: idsToDelete },
                        idsToDelete.length
                    );

                    if (!deleteResult.success) {
                        throw new Error(deleteResult.error || 'Topic deletion verification failed');
                    }

                    idsToDelete.forEach(id => {
                         dispatch({ type: 'DELETE_TOPIC', payload: { mapId: activeMapId, topicId: id } });
                    });

                    dispatch({ type: 'LOG_EVENT', payload: {
                        service: 'MapImprovement',
                        message: `✓ Deleted ${idsToDelete.length} topics (verified)`,
                        status: 'info',
                        timestamp: Date.now()
                    }});
                }
            }

            // Process hub demotions (core -> outer under another hub)
            if (suggestion.hubDemotions && suggestion.hubDemotions.length > 0) {
                let demotedCount = 0;
                for (const demotion of suggestion.hubDemotions) {
                    const topic = allTopics.find(t => t.title.toLowerCase() === demotion.hubTitle.toLowerCase() && t.type === 'core');
                    if (!topic) continue;

                    const newParent = allTopics.find(t =>
                        t.title.toLowerCase() === demotion.newParentTitle.toLowerCase() && t.type === 'core'
                    );
                    if (!newParent) continue;

                    const updateData: Record<string, any> = {
                        type: 'outer',
                        parent_topic_id: newParent.id
                    };

                    if (newParent.slug) {
                        updateData.slug = `${newParent.slug}/${cleanSlug(newParent.slug, topic.title)}`.replace(/^\//, '');
                    }

                    // Also reassign orphaned spokes of this hub to the new parent
                    const orphanedSpokes = allTopics.filter(t => t.parent_topic_id === topic.id);

                    const demoteResult = await verifiedUpdate(
                        supabase,
                        { table: 'topics', operationDescription: `demote hub "${topic.title}" to outer` },
                        topic.id,
                        updateData,
                        'id, type, parent_topic_id, slug'
                    );

                    if (demoteResult.success) {
                        dispatch({ type: 'UPDATE_TOPIC', payload: {
                            mapId: activeMapId,
                            topicId: topic.id,
                            updates: {
                                type: 'outer',
                                parent_topic_id: newParent.id,
                                slug: demoteResult.data?.slug || updateData.slug || topic.slug
                            }
                        }});

                        // Reassign orphaned spokes
                        for (const spoke of orphanedSpokes) {
                            const spokeResult = await verifiedUpdate(
                                supabase,
                                { table: 'topics', operationDescription: `reassign spoke "${spoke.title}" to "${newParent.title}"` },
                                spoke.id,
                                { parent_topic_id: newParent.id },
                                'id, parent_topic_id'
                            );
                            if (spokeResult.success) {
                                dispatch({ type: 'UPDATE_TOPIC', payload: {
                                    mapId: activeMapId,
                                    topicId: spoke.id,
                                    updates: { parent_topic_id: newParent.id }
                                }});
                            }
                        }

                        demotedCount++;
                    }
                }

                if (demotedCount > 0) {
                    dispatch({ type: 'LOG_EVENT', payload: {
                        service: 'MapImprovement',
                        message: `✓ Demoted ${demotedCount} under-supported hubs to outer topics`,
                        status: 'info',
                        timestamp: Date.now()
                    }});
                }
            }

            // Process type reclassifications (core -> outer or vice versa) - only if enabled
            if (includeTypeReclassifications && suggestion.typeReclassifications && suggestion.typeReclassifications.length > 0) {
                let reclassifiedCount = 0;
                for (const reclass of suggestion.typeReclassifications) {
                    const topic = allTopics.find(t => t.title.toLowerCase() === reclass.topicTitle.toLowerCase());
                    if (!topic) continue;

                    // Find the new parent if specified
                    let newParentId: string | null = null;
                    if (reclass.newParentTitle && reclass.newType === 'outer') {
                        const parent = allTopics.find(t =>
                            t.title.toLowerCase() === reclass.newParentTitle!.toLowerCase() && t.type === 'core'
                        );
                        newParentId = parent?.id || null;
                    }

                    // Build update object
                    const updateData: Record<string, any> = {
                        type: reclass.newType,
                        parent_topic_id: newParentId
                    };

                    // Update slug if becoming outer with a parent
                    if (reclass.newType === 'outer' && newParentId) {
                        const parentTopic = allTopics.find(p => p.id === newParentId);
                        if (parentTopic?.slug) {
                            updateData.slug = `${parentTopic.slug}/${cleanSlug(parentTopic.slug, topic.title)}`.replace(/^\//, '');
                        }
                    }

                    const reclassResult = await verifiedUpdate(
                        supabase,
                        { table: 'topics', operationDescription: `reclassify topic "${topic.title}" to ${reclass.newType}` },
                        topic.id,
                        updateData,
                        'id, type, parent_topic_id, slug'
                    );

                    if (!reclassResult.success) {
                        console.error(`Failed to reclassify topic "${topic.title}":`, reclassResult.error);
                        dispatch({ type: 'LOG_EVENT', payload: {
                            service: 'MapImprovement',
                            message: `⚠ Failed to reclassify "${topic.title}": ${reclassResult.error}`,
                            status: 'warning',
                            timestamp: Date.now()
                        }});
                        continue;
                    }

                    // Update local state with verified data
                    dispatch({ type: 'UPDATE_TOPIC', payload: {
                        mapId: activeMapId,
                        topicId: topic.id,
                        updates: {
                            type: reclassResult.data?.type || reclass.newType,
                            parent_topic_id: reclassResult.data?.parent_topic_id || newParentId,
                            slug: reclassResult.data?.slug || updateData.slug || topic.slug
                        }
                    }});
                    reclassifiedCount++;
                }

                if (reclassifiedCount > 0) {
                    dispatch({ type: 'LOG_EVENT', payload: {
                        service: 'MapImprovement',
                        message: `Reclassified ${reclassifiedCount} topics (type changes applied)`,
                        status: 'info',
                        timestamp: Date.now()
                    }});
                }
            }

            // Close confirmation modal and show success log
            setShowImprovementConfirmation(false);
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'improvementLog', visible: true } });
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Map improvements applied successfully.' });

        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Map improvement failed.' });
        } finally {
             setIsApplyingImprovement(false);
        }
    }, [activeMapId, allTopics, dispatch, businessInfo, user, improvementLog, pendingImprovementOptions, setShowImprovementConfirmation, setIsApplyingImprovement]);

    const onExecuteMerge = useCallback(async (suggestion: MergeSuggestion) => {
        if (!activeMapId) return;
        if (!user) return;

        dispatch({ type: 'SET_LOADING', payload: { key: 'executeMerge', value: true } });

        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

            const newTopicData = {
                id: uuidv4(),
                map_id: activeMapId,
                user_id: user.id,
                title: suggestion.newTopic.title,
                description: suggestion.newTopic.description,
                slug: slugify(suggestion.newTopic.title),
                type: 'core' as 'core' | 'outer',
                freshness: 'EVERGREEN',
                parent_topic_id: null
            };

            // Verified insert for merged topic
            const insertResult = await verifiedInsert(
                supabase,
                { table: 'topics', operationDescription: `create merged topic "${suggestion.newTopic.title}"` },
                newTopicData,
                '*'
            );

            if (!insertResult.success || !insertResult.data) {
                throw new Error(insertResult.error || 'Merged topic insert verification failed');
            }

            // Verified delete for old topics
            const deleteResult = await verifiedBulkDelete(
                supabase,
                { table: 'topics', operationDescription: `delete ${suggestion.topicIds.length} topics being merged` },
                { column: 'id', operator: 'in', value: suggestion.topicIds },
                suggestion.topicIds.length
            );

            if (!deleteResult.success) {
                // Rollback: delete the newly created topic
                await verifiedDelete(
                    supabase,
                    { table: 'topics', operationDescription: 'rollback merged topic' },
                    newTopicData.id
                );
                throw new Error(deleteResult.error || 'Old topics deletion verification failed');
            }

            dispatch({ type: 'ADD_TOPIC', payload: { mapId: activeMapId, topic: sanitizeTopicFromDb(insertResult.data) } });
            suggestion.topicIds.forEach(id => {
                dispatch({ type: 'DELETE_TOPIC', payload: { mapId: activeMapId, topicId: id } });
            });

            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'merge', visible: false } });
            dispatch({ type: 'SET_NOTIFICATION', payload: '✓ Topics merged successfully (verified).' });

        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Merge execution failed.' });
        } finally {
             dispatch({ type: 'SET_LOADING', payload: { key: 'executeMerge', value: false } });
        }
    }, [activeMapId, businessInfo, dispatch, user]);

    const handleAnalyzeGsc = useCallback(async (gscData: GscRow[]) => {
        if (!knowledgeGraph) {
             dispatch({ type: 'SET_ERROR', payload: 'Knowledge Graph is required for GSC analysis. Please run "Analyze Domain" first.' });
             return;
        }
        dispatch({ type: 'SET_LOADING', payload: { key: 'gsc', value: true } });
        try {
            const opportunities = await aiService.analyzeGscDataForOpportunities(gscData, knowledgeGraph, effectiveBusinessInfo, dispatch);
            dispatch({ type: 'SET_GSC_OPPORTUNITIES', payload: opportunities });
            saveAnalysisState('gscOpportunities', opportunities);
            // The modal stays open, the results just populate inside it
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'GSC Analysis failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'gsc', value: false } });
        }
    }, [knowledgeGraph, effectiveBusinessInfo, dispatch, saveAnalysisState]);

    const onAuditDraft = useCallback(async (brief: ContentBrief, draft: string) => {
        if (!activeMapId) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: true } });

        // Strip base64 images to reduce token count - they can exceed context limits
        const draftForAudit = draft
            .replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+\)/g, '![image](base64-image-removed)')
            .replace(/<img[^>]*src="data:image\/[^;]+;base64,[A-Za-z0-9+/=]+"[^>]*>/g, '<img src="base64-image-removed" />');

        if (draftForAudit.length !== draft.length) {
            console.log(`[onAuditDraft] Stripped base64 images from draft. Content reduced from ${draft.length} to ${draftForAudit.length} chars`);
        }

        // Create a slimmed-down brief for the audit to stay within token limits
        // The audit prompt includes JSON.stringify(brief) which can be massive
        // Remove large fields that aren't needed for the audit
        const briefForAudit: Partial<ContentBrief> = {
            id: brief.id,
            topic_id: brief.topic_id,
            title: brief.title,
            slug: brief.slug,
            metaDescription: brief.metaDescription,
            keyTakeaways: brief.keyTakeaways?.slice(0, 5), // Limit to 5 takeaways
            targetKeyword: brief.targetKeyword,
            searchIntent: brief.searchIntent,
            // Slim down serpAnalysis - just PAA and basic info
            serpAnalysis: {
                peopleAlsoAsk: brief.serpAnalysis?.peopleAlsoAsk?.slice(0, 5) || [],
                competitorHeadings: [], // Exclude - can be huge
                avgWordCount: brief.serpAnalysis?.avgWordCount,
                query_type: brief.serpAnalysis?.query_type
            },
            // Only include essential vectors (max 20)
            contextualVectors: brief.contextualVectors?.slice(0, 20),
            // Exclude large fields:
            // - articleDraft (we're passing it separately, already stripped)
            // - structured_outline (can be huge)
            // - visual_semantics / enhanced_visual_semantics (image data)
            // - contextualBridge (can be large)
            cta: brief.cta,
            query_type_format: brief.query_type_format,
            featured_snippet_target: brief.featured_snippet_target
        };

        const briefJson = JSON.stringify(briefForAudit);
        console.log(`[onAuditDraft] Slimmed brief for audit: ${briefJson.length} chars (original would be ~${JSON.stringify(brief).length} chars)`)

        // Activity-based timeout: resets on each streaming progress event
        const INACTIVITY_TIMEOUT_MS = 90000; // 90 seconds of no activity = timeout
        let activityTimeoutId: ReturnType<typeof setTimeout> | null = null;
        let lastActivityTime = Date.now();

        const resetActivityTimeout = () => {
            if (activityTimeoutId) clearTimeout(activityTimeoutId);
            lastActivityTime = Date.now();
            activityTimeoutId = setTimeout(() => {
                const inactivityDuration = Date.now() - lastActivityTime;
                console.warn(`[onAuditDraft] Audit operation inactive for ${inactivityDuration}ms - timing out`);
                dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: false } });
                dispatch({ type: 'SET_ERROR', payload: `Audit operation timed out after ${Math.round(inactivityDuration/1000)}s of inactivity.` });
            }, INACTIVITY_TIMEOUT_MS);
        };

        resetActivityTimeout();
        const handleProgress = (_progress: StreamingProgress) => resetActivityTimeout();

        try {
            const result = await aiService.auditContentIntegrity(briefForAudit as ContentBrief, draftForAudit, effectiveBusinessInfo, dispatch, handleProgress);
            if (activityTimeoutId) clearTimeout(activityTimeoutId);
            dispatch({ type: 'SET_CONTENT_INTEGRITY_RESULT', payload: result });

            // Persist the audit result to the database with verification
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const updateResult = await verifiedUpdate(
                supabase,
                { table: 'content_briefs', operationDescription: `save content audit for "${brief.title}"` },
                brief.id,
                { content_audit: result as any },
                'id'
            );

            if (!updateResult.success) {
                console.warn('[onAuditDraft] Audit result could not be persisted:', updateResult.error);
                // Non-fatal: still show the result to user
            }

            // Update local brief state with the new audit result
            const updatedBrief = { ...brief, contentAudit: result };
            dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });

            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'integrity', visible: true } });
        } catch (e) {
            if (activityTimeoutId) clearTimeout(activityTimeoutId);
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Audit failed.' });
        } finally {
            if (activityTimeoutId) clearTimeout(activityTimeoutId);
            dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: false } });
        }
    }, [activeMapId, businessInfo, effectiveBusinessInfo, dispatch]);

    // New Auto-Fix Handler
    const handleAutoFix = useCallback(async (rule: AuditRuleResult, fullDraft: string) => {
        if (!activeMapId || !activeBriefTopic) return;
        if (!rule.affectedTextSnippet || !rule.remediation) {
            dispatch({ type: 'SET_ERROR', payload: "Cannot auto-fix: missing text context." });
            return;
        }

        const brief = briefs[activeBriefTopic.id];
        if (!brief) return;

        dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: true } }); // Use audit loading key for UI feedback

        try {
            const refinedSnippet = await aiService.refineDraftSection(
                rule.affectedTextSnippet,
                rule.ruleName,
                rule.remediation,
                effectiveBusinessInfo,
                dispatch
            );

            // Replace the first occurrence of the snippet
            const newDraft = fullDraft.replace(rule.affectedTextSnippet, refinedSnippet);

            // Update DB with verification
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const updateResult = await verifiedUpdate(
                supabase,
                { table: 'content_briefs', operationDescription: `save auto-fix for "${brief.title}"` },
                brief.id,
                { article_draft: newDraft },
                'id, article_draft'
            );

            if (!updateResult.success) {
                throw new Error(updateResult.error || 'Auto-fix save verification failed');
            }

            // Update State
            const updatedBrief = { ...brief, articleDraft: newDraft };
            dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });

            // Re-run audit locally to update result
            await onAuditDraft(updatedBrief, newDraft);

            dispatch({ type: 'SET_NOTIFICATION', payload: '✓ Applied fix successfully (verified).' });

        } catch(e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Auto-fix failed.' });
            dispatch({ type: 'SET_LOADING', payload: { key: 'audit', value: false } });
        }
    }, [activeMapId, activeBriefTopic, briefs, effectiveBusinessInfo, dispatch, businessInfo, onAuditDraft]);

    const handleAnalyzeFlow = useCallback(async (draft: string) => {
        if (!activeMap || !activeMap.pillars) {
             dispatch({ type: 'SET_ERROR', payload: "Missing map pillars for flow analysis." });
             return;
        }
        dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: true } });
        dispatch({ type: 'SET_NOTIFICATION', payload: 'Analyzing contextual flow... This may take a moment.' });

        // Strip base64 images to reduce token count - they can exceed context limits
        const draftForFlow = draft
            .replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+\)/g, '![image](base64-image-removed)')
            .replace(/<img[^>]*src="data:image\/[^;]+;base64,[A-Za-z0-9+/=]+"[^>]*>/g, '<img src="base64-image-removed" />');

        if (draftForFlow.length !== draft.length) {
            console.log(`[handleAnalyzeFlow] Stripped base64 images. Content reduced from ${draft.length} to ${draftForFlow.length} chars`);
        }

        // Activity-based timeout: resets on each streaming progress event
        const INACTIVITY_TIMEOUT_MS = 90000; // 90 seconds of no activity = timeout
        let activityTimeoutId: ReturnType<typeof setTimeout> | null = null;
        let lastActivityTime = Date.now();

        const resetActivityTimeout = () => {
            if (activityTimeoutId) clearTimeout(activityTimeoutId);
            lastActivityTime = Date.now();
            activityTimeoutId = setTimeout(() => {
                const inactivityDuration = Date.now() - lastActivityTime;
                console.warn(`[handleAnalyzeFlow] Flow analysis inactive for ${inactivityDuration}ms - timing out`);
                dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: false } });
                dispatch({ type: 'SET_ERROR', payload: `Flow analysis timed out after ${Math.round(inactivityDuration/1000)}s of inactivity.` });
            }, INACTIVITY_TIMEOUT_MS);
        };

        resetActivityTimeout();
        const handleProgress = (_progress: StreamingProgress) => resetActivityTimeout();

        try {
            const result = await aiService.analyzeContextualFlow(
                draftForFlow,
                activeMap.pillars.centralEntity,
                effectiveBusinessInfo,
                dispatch,
                handleProgress
            );
            if (activityTimeoutId) clearTimeout(activityTimeoutId);
            dispatch({ type: 'SET_FLOW_AUDIT_RESULT', payload: result });
            dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'flowAudit', visible: true } });
        } catch(e) {
            if (activityTimeoutId) clearTimeout(activityTimeoutId);
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Flow audit failed.' });
        } finally {
            if (activityTimeoutId) clearTimeout(activityTimeoutId);
            dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: false } });
        }
    }, [activeMap, effectiveBusinessInfo, dispatch]);

    const handleFlowAutoFix = useCallback(async (issue: ContextualFlowIssue) => {
        if (!activeMapId || !activeBriefTopic) return;
        if (!issue.offendingSnippet || !issue.remediation) {
            dispatch({ type: 'SET_ERROR', payload: "Cannot auto-fix: missing text context." });
            return;
        }

        const brief = briefs[activeBriefTopic.id];
        if (!brief || !brief.articleDraft) return;

        dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: true } });

        try {
            const refinedSnippet = await aiService.applyFlowRemediation(
                issue.offendingSnippet,
                issue,
                effectiveBusinessInfo,
                dispatch
            );

            // Replace the snippet in the full draft
            const newDraft = brief.articleDraft.replace(issue.offendingSnippet, refinedSnippet);

            // Update DB
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const { error } = await supabase
                .from('content_briefs')
                .update({ article_draft: newDraft })
                .eq('id', brief.id);

            if (error) throw error;

            // Update State
            const updatedBrief = { ...brief, articleDraft: newDraft };
            dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });

            // NOTE: Don't re-run analysis here - let the UI show "Fixed" first
            // User can re-run flow analysis manually to see updated results
            dispatch({ type: 'SET_NOTIFICATION', payload: 'Applied flow remediation successfully. Re-run flow analysis to see updated results.' });

        } catch(e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Flow auto-fix failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: false } });
        }
    }, [activeMapId, activeBriefTopic, briefs, effectiveBusinessInfo, dispatch, businessInfo]);

    const handleBatchFlowAutoFix = useCallback(async (issues: ContextualFlowIssue[]) => {
        if (!activeMapId || !activeBriefTopic) return;
        const brief = briefs[activeBriefTopic.id];
        if (!brief || !brief.articleDraft) return;

        if (issues.length === 0) return;

        dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: true } });

        try {
            const newDraft = await aiService.applyBatchFlowRemediation(
                brief.articleDraft,
                issues,
                effectiveBusinessInfo,
                dispatch
            );

            // Update DB
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            const { error } = await supabase
                .from('content_briefs')
                .update({ article_draft: newDraft })
                .eq('id', brief.id);

            if (error) throw error;

            // Update State
            const updatedBrief = { ...brief, articleDraft: newDraft };
            dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMapId, topicId: brief.topic_id, brief: updatedBrief } });

            // NOTE: Don't re-run analysis here - let the UI show "Fixed" first
            // User can re-run flow analysis manually to see updated results
            dispatch({ type: 'SET_NOTIFICATION', payload: `Batch fixed ${issues.length} flow issues. Re-run flow analysis to see updated results.` });

        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Batch flow auto-fix failed.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'flowAudit', value: false } });
        }
    }, [activeMapId, activeBriefTopic, briefs, effectiveBusinessInfo, dispatch, businessInfo]);

    return {
        saveAnalysisState,
        onAnalyzeKnowledgeDomain,
        handleExpandKnowledgeDomain,
        onValidateMap,
        onFindMergeOpportunities,
        onAnalyzeSemanticRelationships,
        onAnalyzeContextualCoverage,
        onAuditInternalLinking,
        onCalculateTopicalAuthority,
        onGeneratePublicationPlan,
        onRunUnifiedAudit,
        handleApplyUnifiedFix,
        handleApplyAllUnifiedFixes,
        onImproveMap,
        onApplyImprovement,
        onExecuteMerge,
        handleAnalyzeGsc,
        onAuditDraft,
        handleAutoFix,
        handleAnalyzeFlow,
        handleFlowAutoFix,
        handleBatchFlowAutoFix,
    };
}
