
import React, { useEffect } from 'react';
import { AppAction } from '../state/appState';
import { getSupabaseClient } from '../services/supabaseClient';
import { sanitizeTopicFromDb, sanitizeBriefFromDb } from '../utils/parsers';
import { BusinessInfo, ContentBrief, TopicalMap } from '../types';

export const useMapData = (
    activeMapId: string | null, 
    activeMap: TopicalMap | undefined,
    businessInfo: BusinessInfo, 
    dispatch: React.Dispatch<AppAction>
) => {
    // 1. Hydrate analysis results from the map object if they exist
    useEffect(() => {
        if (activeMap && activeMap.analysis_state) {
            const { analysis_state } = activeMap;
            
            if (analysis_state.validationResult) {
                dispatch({ type: 'SET_VALIDATION_RESULT', payload: analysis_state.validationResult });
            }
            if (analysis_state.semanticAnalysisResult) {
                dispatch({ type: 'SET_SEMANTIC_ANALYSIS_RESULT', payload: analysis_state.semanticAnalysisResult });
            }
            if (analysis_state.contextualCoverageResult) {
                dispatch({ type: 'SET_CONTEXTUAL_COVERAGE_RESULT', payload: analysis_state.contextualCoverageResult });
            }
            if (analysis_state.internalLinkAuditResult) {
                dispatch({ type: 'SET_INTERNAL_LINK_AUDIT_RESULT', payload: analysis_state.internalLinkAuditResult });
            }
            if (analysis_state.topicalAuthorityScore) {
                dispatch({ type: 'SET_TOPICAL_AUTHORITY_SCORE', payload: analysis_state.topicalAuthorityScore });
            }
            if (analysis_state.publicationPlan) {
                dispatch({ type: 'SET_PUBLICATION_PLAN', payload: analysis_state.publicationPlan });
            }
            if (analysis_state.gscOpportunities) {
                dispatch({ type: 'SET_GSC_OPPORTUNITIES', payload: analysis_state.gscOpportunities });
            }
        }
    }, [activeMap, dispatch]);


    // 2. Fetch Topics and Briefs
    useEffect(() => {
        const fetchMapDetails = async () => {
            if (!activeMapId) return;

            // Data fetching regression fix: check for undefined topics, not just truthy
            if (activeMap && activeMap.topics !== undefined) return;

            dispatch({ type: 'SET_LOADING', payload: { key: 'mapDetails', value: true } });
            try {
                const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
                const { data: topicsData, error: topicsError } = await supabase.from('topics').select('*').eq('map_id', activeMapId);
                if (topicsError) throw topicsError;

                const rawTopics = (topicsData || []);
                const topics = rawTopics.map(sanitizeTopicFromDb);

                dispatch({ type: 'SET_TOPICS_FOR_MAP', payload: { mapId: activeMapId, topics } });

                const topicIds = topics.map(t => t.id);
                if (topicIds.length > 0) {
                    const { data: briefsData, error: briefsError } = await supabase.from('content_briefs').select('*').in('topic_id', topicIds);
                    if (briefsError) throw briefsError;
                    
                    const briefsRecord = (briefsData || []).reduce((acc, dbBrief) => {
                        if (dbBrief && dbBrief.topic_id) {
                             acc[dbBrief.topic_id] = sanitizeBriefFromDb(dbBrief);
                        }
                        return acc;
                    }, {} as Record<string, ContentBrief>);

                    dispatch({ type: 'SET_BRIEFS_FOR_MAP', payload: { mapId: activeMapId, briefs: briefsRecord } });
                } else {
                    // Ensure we set an empty briefs record if no topics exist, to stop future fetches
                    dispatch({ type: 'SET_BRIEFS_FOR_MAP', payload: { mapId: activeMapId, briefs: {} } });
                }

            } catch (e) {
                dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : "Failed to load map details." });
            } finally {
                dispatch({ type: 'SET_LOADING', payload: { key: 'mapDetails', value: false } });
            }
        };
        fetchMapDetails();
    }, [activeMapId, activeMap, businessInfo, dispatch]);
};
