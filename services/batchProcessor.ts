
// services/batchProcessor.ts

import { AppState, AppAction } from '../state/appState';
import { BusinessInfo, EnrichedTopic, ResponseCode, SEOPillars, ContentBrief } from '../types';
import * as aiService from './aiService';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './supabaseClient';
import React from 'react';
import { sanitizeBriefFromDb } from '../utils/parsers';

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
        const mapBusinessInfo = activeMap.business_info as Partial<BusinessInfo> || {};
        const effectiveBusinessInfo = {
            ...state.businessInfo,
            domain: mapBusinessInfo.domain || activeProject?.domain || state.businessInfo.domain,
            projectName: mapBusinessInfo.projectName || activeProject?.project_name || state.businessInfo.projectName,
            ...mapBusinessInfo,
            ...(mapBusinessInfo.domain ? {} : { domain: activeProject?.domain || state.businessInfo.domain }),
        };

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
            const statusMessage = topic.title;

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
                    this.dispatch
                );

                const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
                
                // Sanitize keyTakeaways to ensure string array for DB
                const sanitizedTakeaways = Array.isArray(briefData.keyTakeaways) 
                    ? briefData.keyTakeaways.map(k => typeof k === 'string' ? k : JSON.stringify(k))
                    : [];

                const { data: newBriefRow, error } = await supabase.from('content_briefs').insert({
                    topic_id: topic.id,
                    title: briefData.title,
                    meta_description: briefData.metaDescription,
                    key_takeaways: sanitizedTakeaways as any,
                    user_id: user.id,
                    // Core fields
                    outline: briefData.outline,
                    serp_analysis: briefData.serpAnalysis as any,
                    visuals: briefData.visuals as any,
                    contextual_vectors: briefData.contextualVectors as any,
                    contextual_bridge: briefData.contextualBridge as any,
                    // Holistic SEO fields
                    perspectives: briefData.perspectives as any,
                    methodology_note: briefData.methodology_note,
                    structured_outline: briefData.structured_outline as any,
                    predicted_user_journey: briefData.predicted_user_journey,
                    // New fields
                    query_type_format: briefData.query_type_format,
                    featured_snippet_target: briefData.featured_snippet_target as any,
                    visual_semantics: briefData.visual_semantics as any,
                    discourse_anchors: briefData.discourse_anchors as any,
                }).select().single();

                if (error) throw error;
                
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
            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                this.dispatch({ type: 'LOG_EVENT', payload: { service: 'BatchProcessor', message: `Failed to generate brief for "${topic.title}": ${message}`, status: 'failure', timestamp: Date.now(), data: error } });
            }
        }
        
        this.dispatch({ type: 'RESET_BRIEF_GENERATION' });
        this.dispatch({ type: 'LOG_EVENT', payload: { service: 'BatchProcessor', message: 'Batch brief generation complete.', status: 'success', timestamp: Date.now() } });
        this.dispatch({ type: 'SET_LOADING', payload: { key: 'briefs', value: false } });
    }
}
