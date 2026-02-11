
// services/batchProcessor.ts

import { AppState, AppAction } from '../state/appState';
import { BusinessInfo, EnrichedTopic, ResponseCode, SEOPillars, ContentBrief } from '../types';
import * as aiService from './aiService';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './supabaseClient';
import React from 'react';
import { sanitizeBriefFromDb } from '../utils/parsers';
import { verifiedInsert } from './verifiedDatabaseService';
import type { Json } from '../database.types';
import { findCategoryByLinkedTopicId, buildCategoryPageContext } from './catalog/catalogService';
import type { CategoryPageContext } from '../types/catalog';

export class BatchProcessor {
    private dispatch: React.Dispatch<AppAction>;
    private getState: () => AppState;

    constructor(dispatch: React.Dispatch<AppAction>, getState: () => AppState) {
        this.dispatch = dispatch;
        this.getState = getState;
    }

    public async generateAllBriefs(topics: EnrichedTopic[]): Promise<void> {
        this.dispatch({ type: 'SET_LOADING', payload: { key: 'briefs', value: true } });
        this.dispatch({ type: 'RESET_BRIEF_GENERATION' }); // Reset cancel flag and counters

        const state = this.getState();
        const activeMap = state.topicalMaps.find(m => m.id === state.activeMapId);
        const user = state.user;

        if (!activeMap || !activeMap.business_info || !activeMap.pillars || !state.knowledgeGraph || !user) {
            this.dispatch({ type: 'SET_ERROR', payload: "Cannot start batch generation: missing required context or user session." });
            this.dispatch({ type: 'SET_LOADING', payload: { key: 'briefs', value: false } });
            return;
        }

        const topicsWithoutBriefs = topics.filter(t => !activeMap.briefs?.[t.id]);
        const totalCount = topicsWithoutBriefs.length;

        if (totalCount === 0) {
            this.dispatch({ type: 'SET_NOTIFICATION', payload: 'All topics already have briefs.' });
            this.dispatch({ type: 'SET_LOADING', payload: { key: 'briefs', value: false } });
            return;
        }

        // Get active project for domain fallback
        const activeProject = state.projects.find(p => p.id === state.activeProjectId);

        // Use map-specific business info if available, merged with global and project domain
        // AI settings (provider, model, API keys) ALWAYS come from global state, not map's business_info
        const mapBusinessInfo = activeMap.business_info as Partial<BusinessInfo> || {};
        // Strip AI settings from map - they should come from global user_settings
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

        const effectiveBusinessInfo = {
            ...state.businessInfo,
            domain: mapBusinessContext.domain || activeProject?.domain || state.businessInfo.domain,
            projectName: mapBusinessContext.projectName || activeProject?.project_name || state.businessInfo.projectName,
            ...mapBusinessContext,
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

        const failures: string[] = [];
        let successCount = 0;

        for (let i = 0; i < topicsWithoutBriefs.length; i++) {
            // Fetch fresh state inside loop to catch cancellations or map changes
            const currentState = this.getState();

            // Check for cancellation
            if (currentState.briefGenerationCancelled) {
                this.dispatch({ type: 'LOG_EVENT', payload: { service: 'BatchProcessor', message: `Batch generation cancelled after ${i} of ${totalCount} briefs.`, status: 'warning', timestamp: Date.now() } });
                this.dispatch({ type: 'SET_NOTIFICATION', payload: `Generation cancelled. ${i} briefs were generated.` });
                break;
            }

            if (currentState.activeMapId !== activeMap.id) {
                this.dispatch({ type: 'LOG_EVENT', payload: { service: 'BatchProcessor', message: 'Batch process aborted: Map changed.', status: 'failure', timestamp: Date.now() } });
                break;
            }

            const topic = topicsWithoutBriefs[i];

            // Look up linked catalog category for this topic
            let categoryContext: CategoryPageContext | undefined;
            const catalogCategories = currentState.catalog?.categories;
            if (catalogCategories && catalogCategories.length > 0) {
                const linkedCategory = findCategoryByLinkedTopicId(catalogCategories, topic.id);
                if (linkedCategory) {
                    try {
                        const supabaseForCatalog = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
                        categoryContext = await buildCategoryPageContext(supabaseForCatalog, linkedCategory.id, catalogCategories);
                    } catch (e) {
                        this.dispatch({ type: 'LOG_EVENT', payload: { service: 'BatchProcessor', message: `Failed to build catalog context for "${topic.title}": ${e instanceof Error ? e.message : 'Unknown error'}`, status: 'warning', timestamp: Date.now() } });
                    }
                }
            }

            const catalogSuffix = categoryContext
                ? ` [Catalog: ${categoryContext.categoryName} — ${categoryContext.totalProductCount} products]`
                : '';
            const statusMessage = topic.title + catalogSuffix;

            // Update progress with current/total counts
            this.dispatch({
                type: 'SET_BRIEF_GENERATION_PROGRESS',
                payload: {
                    current: i + 1,
                    total: totalCount,
                    status: statusMessage
                }
            });
            this.dispatch({
                type: 'LOG_EVENT',
                payload: {
                    service: 'BatchProcessor',
                    message: `Generating ${i + 1}/${totalCount}: ${statusMessage}`,
                    status: 'info',
                    timestamp: Date.now()
                }
            });

            try {
                const briefData = await aiService.generateContentBrief(
                    effectiveBusinessInfo,
                    topic,
                    activeMap.topics || [],
                    activeMap.pillars, // Safe: Checked in guard clause above
                    state.knowledgeGraph,
                    ResponseCode.INFORMATIONAL,
                    this.dispatch,
                    undefined,
                    activeMap.eavs || [],
                    categoryContext
                );

                const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);

                // Sanitize keyTakeaways to ensure string array for DB
                const sanitizedTakeaways = Array.isArray(briefData.keyTakeaways)
                    ? briefData.keyTakeaways.map(k => typeof k === 'string' ? k : JSON.stringify(k))
                    : [];

                // Use verified insert with read-back verification
                const result = await verifiedInsert(
                    supabase,
                    { table: 'content_briefs', operationDescription: `save brief for "${topic.title}"` },
                    {
                        topic_id: topic.id,
                        title: briefData.title,
                        meta_description: briefData.metaDescription,
                        key_takeaways: sanitizedTakeaways as unknown as Json,
                        user_id: user.id,
                        // Core fields
                        outline: briefData.outline,
                        serp_analysis: briefData.serpAnalysis as unknown as Json,
                        visuals: briefData.visuals as unknown as Json,
                        contextual_vectors: briefData.contextualVectors as unknown as Json,
                        contextual_bridge: briefData.contextualBridge as unknown as Json,
                        // Holistic SEO fields
                        perspectives: briefData.perspectives as unknown as Json,
                        methodology_note: briefData.methodology_note,
                        structured_outline: briefData.structured_outline as unknown as Json,
                        predicted_user_journey: briefData.predicted_user_journey,
                        // New fields
                        query_type_format: briefData.query_type_format,
                        featured_snippet_target: briefData.featured_snippet_target as unknown as Json,
                        visual_semantics: briefData.visual_semantics as unknown as Json,
                        discourse_anchors: briefData.discourse_anchors as unknown as Json,
                        // Ecommerce catalog context
                        ...(briefData.categoryContext ? { category_context: briefData.categoryContext as unknown as Json } : {}),
                    }
                );

                if (!result.success || !result.data) {
                    throw new Error(result.error || `Brief for "${topic.title}" was not saved - verification failed`);
                }

                const newBriefRow = result.data as unknown as { id: string };

                // Construct the new brief object for state
                const rawBrief = {
                    ...briefData,
                    keyTakeaways: sanitizedTakeaways,
                    id: newBriefRow.id,
                    topic_id: topic.id,
                };

                // Use centralized parser for consistency before dispatching
                const finalBrief = sanitizeBriefFromDb(rawBrief);

                this.dispatch({ type: 'ADD_BRIEF', payload: { mapId: activeMap.id, topicId: topic.id, brief: finalBrief } });
                successCount++;
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                const is429 = message.includes('429') || message.includes('rate limit') || message.includes('Too Many Requests');
                failures.push(topic.title);
                this.dispatch({ type: 'LOG_EVENT', payload: { service: 'BatchProcessor', message: `Failed to generate brief for "${topic.title}": ${message}`, status: 'failure', timestamp: Date.now(), data: error } });

                // Exponential backoff on rate limit
                if (is429) {
                    const backoffMs = Math.min(2000 * Math.pow(2, Math.min(i, 4)), 30000);
                    this.dispatch({ type: 'LOG_EVENT', payload: { service: 'BatchProcessor', message: `Rate limited — waiting ${backoffMs / 1000}s before next request`, status: 'warning', timestamp: Date.now() } });
                    await new Promise(resolve => setTimeout(resolve, backoffMs));
                }
            }

            // Rate limiting delay between API calls (skip after last item)
            if (i < topicsWithoutBriefs.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        this.dispatch({ type: 'RESET_BRIEF_GENERATION' });

        // Summary notification with failures if any
        if (failures.length > 0) {
            const failureNames = failures.slice(0, 3).join(', ') + (failures.length > 3 ? ` +${failures.length - 3} more` : '');
            this.dispatch({ type: 'SET_NOTIFICATION', payload: `Generated ${successCount}/${totalCount} briefs. ${failures.length} failed: ${failureNames}` });
        } else {
            this.dispatch({ type: 'SET_NOTIFICATION', payload: `Successfully generated ${successCount} briefs.` });
        }

        this.dispatch({ type: 'LOG_EVENT', payload: { service: 'BatchProcessor', message: `Batch brief generation complete. ${successCount}/${totalCount} succeeded, ${failures.length} failed.`, status: failures.length > 0 ? 'warning' : 'success', timestamp: Date.now() } });
        this.dispatch({ type: 'SET_LOADING', payload: { key: 'briefs', value: false } });
    }
}
