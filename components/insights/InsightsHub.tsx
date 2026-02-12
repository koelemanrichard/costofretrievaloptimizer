// components/insights/InsightsHub.tsx
// Main container for the SEO Insights Hub

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import { sanitizeTopicFromDb } from '../../utils/parsers';
import { loadAllInsightsData, aggregateInsights, LocalStateOverrides } from '../../services/insights/insightsAggregator';
import { expandSemanticTriples } from '../../services/aiService';
import type { InsightsTabId, AggregatedInsights, InsightActionType } from '../../types/insights';
import type { SemanticTriple } from '../../types';

// Tab Components
import { ExecutiveSummaryTab } from './tabs/ExecutiveSummaryTab';
import { TopicalAuthorityTab } from './tabs/TopicalAuthorityTab';
import { CompetitiveIntelTab } from './tabs/CompetitiveIntelTab';
import { AuthorityTrustTab } from './tabs/AuthorityTrustTab';
import { ContentHealthTab } from './tabs/ContentHealthTab';
import { SemanticMapTab } from './tabs/SemanticMapTab';
import { GapAnalysisTab } from './tabs/GapAnalysisTab';
import { PublicationProgressTab } from './tabs/PublicationProgressTab';
import { CostUsageTab } from './tabs/CostUsageTab';
import { AuditHistoryTab } from './tabs/AuditHistoryTab';
import { ActionCenterTab } from './tabs/ActionCenterTab';

// Export Components
import { ComprehensiveExportModal } from './exports/ComprehensiveExportModal';

// Topic Suggestion Modal
import { TopicSuggestionModal } from './TopicSuggestionModal';

interface InsightsHubProps {
  mapId?: string;
  projectName?: string;
  mapName?: string;
  onClose?: () => void;
  onOpenQueryNetworkAudit?: () => void;
  onOpenEATScanner?: () => void;
  onOpenCorpusAudit?: () => void;
}

interface TabConfig {
  id: InsightsTabId;
  label: string;
  icon: React.ReactNode;
  shortLabel?: string;
}

const TABS: TabConfig[] = [
  {
    id: 'executive-summary',
    label: 'Executive Summary',
    shortLabel: 'Summary',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'topical-authority',
    label: 'Topical Authority',
    shortLabel: 'Authority',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    id: 'competitive-intel',
    label: 'Competitive Intel',
    shortLabel: 'Competition',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    id: 'authority-trust',
    label: 'Authority & Trust',
    shortLabel: 'E-A-T',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    id: 'content-health',
    label: 'Content Health',
    shortLabel: 'Health',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    id: 'semantic-map',
    label: 'Semantic Map',
    shortLabel: 'Semantic',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    id: 'gap-analysis',
    label: 'Gap Analysis',
    shortLabel: 'Gaps',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'publication-progress',
    label: 'Publication Progress',
    shortLabel: 'Progress',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <path d="M16 2v4M8 2v4M3 10h18M9 16h6" />
      </svg>
    ),
  },
  {
    id: 'cost-usage',
    label: 'Cost & Usage',
    shortLabel: 'Costs',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'audit-history',
    label: 'Audit History',
    shortLabel: 'History',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'action-center',
    label: 'Action Center',
    shortLabel: 'Actions',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

export const InsightsHub: React.FC<InsightsHubProps> = ({
  mapId,
  projectName = 'My Project',
  mapName,
  onClose,
  onOpenQueryNetworkAudit,
  onOpenEATScanner,
  onOpenCorpusAudit,
}) => {
  const { state, dispatch } = useAppState();
  const [activeTab, setActiveTab] = useState<InsightsTabId>('executive-summary');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<AggregatedInsights | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const effectiveMapId = mapId || state.activeMapId;
  const activeMap = state.topicalMaps.find(m => m.id === effectiveMapId);
  const displayName = mapName || activeMap?.name || projectName;

  // Refresh trigger - increment to force data reload
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Topic suggestion modal state
  const [showTopicSuggestionModal, setShowTopicSuggestionModal] = useState(false);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [topicAddLoading, setTopicAddLoading] = useState(false);

  // Helper function to persist EAVs to Supabase AND update local state
  // This ensures data is saved to the database, not just local React state
  const persistEavsToSupabase = useCallback(async (newEavs: SemanticTriple[]): Promise<boolean> => {
    if (!effectiveMapId || !state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) {
      console.error('[InsightsHub] Cannot persist EAVs: missing mapId or Supabase config');
      return false;
    }

    try {
      const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);

      // PERSIST TO SUPABASE FIRST
      const { error } = await supabase
        .from('topical_maps')
        .update({ eavs: newEavs as unknown as any })
        .eq('id', effectiveMapId);

      if (error) {
        console.error('[InsightsHub] Supabase error persisting EAVs:', error);
        throw error;
      }

      console.log(`[InsightsHub] Persisted ${newEavs.length} EAVs to database`);

      // THEN update local state (using SET_EAVS for proper state management)
      dispatch({ type: 'SET_EAVS', payload: { mapId: effectiveMapId, eavs: newEavs } });

      // Trigger refresh to reload insights with new data
      setRefreshTrigger(prev => prev + 1);

      return true;
    } catch (e) {
      console.error('[InsightsHub] Failed to persist EAVs:', e);
      setActionMessage({ type: 'error', text: 'Failed to save EAVs to database. Please try again.' });
      return false;
    }
  }, [effectiveMapId, state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey, dispatch]);

  // Handler to add selected topics to Supabase
  const handleAddSuggestedTopics = useCallback(async (selectedTopics: string[]): Promise<void> => {
    if (!effectiveMapId || !state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey || !state.user?.id) {
      setActionMessage({ type: 'error', text: 'Missing required configuration to add topics.' });
      return;
    }

    setTopicAddLoading(true);
    try {
      const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);

      // Get existing topics to check for duplicates
      const existingTopics = activeMap?.topics || [];
      const existingTitles = new Set(existingTopics.map(t => t.title.toLowerCase()));

      // Separate topics into new and already existing
      const newTopicTitles: string[] = [];
      const skippedTopics: string[] = [];

      selectedTopics.forEach(title => {
        if (existingTitles.has(title.toLowerCase())) {
          skippedTopics.push(title);
        } else {
          newTopicTitles.push(title);
        }
      });

      if (newTopicTitles.length === 0) {
        const skippedList = skippedTopics.slice(0, 3).join(', ');
        const moreCount = skippedTopics.length > 3 ? ` (+${skippedTopics.length - 3} more)` : '';
        setActionMessage({
          type: 'error',
          text: `All selected topics already exist: ${skippedList}${moreCount}`
        });
        return;
      }

      // Create topic objects
      const topicsToInsert = newTopicTitles.map(title => ({
        id: crypto.randomUUID(),
        map_id: effectiveMapId,
        user_id: state.user!.id,
        title: title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        type: 'outer' as const, // Default to outer topic (can be changed later)
        description: `Topic suggested from EAV analysis`,
        parent_topic_id: null, // No parent by default - will appear as orphan
        freshness: 'STANDARD' as const,
        metadata: {
          topic_class: 'informational',
          source: 'eav_suggestion',
          created_at: new Date().toISOString(),
        },
      }));

      // Insert into Supabase
      const { data: insertedTopics, error } = await supabase
        .from('topics')
        .insert(topicsToInsert)
        .select();

      if (error) {
        console.error('[InsightsHub] Failed to insert topics:', error);
        throw error;
      }

      // Update local state
      if (insertedTopics && insertedTopics.length > 0) {
        const sanitizedTopics = insertedTopics.map(t => sanitizeTopicFromDb(t));
        dispatch({
          type: 'ADD_TOPICS',
          payload: { mapId: effectiveMapId, topics: sanitizedTopics }
        });

        // Build detailed feedback message
        const addedNames = insertedTopics.map((t: any) => t.title).slice(0, 3).join(', ');
        const addedMore = insertedTopics.length > 3 ? ` (+${insertedTopics.length - 3} more)` : '';
        let message = `Added ${insertedTopics.length} topic${insertedTopics.length !== 1 ? 's' : ''}: ${addedNames}${addedMore}`;

        if (skippedTopics.length > 0) {
          message += ` (${skippedTopics.length} already existed)`;
        }

        message += '. Find them in "Orphan Topics" - assign parents in Topic Manager.';

        setActionMessage({ type: 'success', text: message });

        // Trigger refresh
        setRefreshTrigger(prev => prev + 1);
      }

      console.log(`[InsightsHub] Added ${insertedTopics?.length || 0} topics to map (${skippedTopics.length} skipped as duplicates)`);
    } catch (e) {
      console.error('[InsightsHub] Failed to add topics:', e);
      setActionMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Failed to add topics to map.'
      });
    } finally {
      setTopicAddLoading(false);
    }
  }, [effectiveMapId, state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey, state.user, activeMap?.topics, dispatch]);

  // Action handler for AI-powered actions
  const handleAction = useCallback(async (actionType: InsightActionType, payload?: Record<string, any>) => {
    if (!activeMap || !effectiveMapId) {
      setActionMessage({ type: 'error', text: 'No active map selected' });
      return;
    }

    setActionLoading(actionType);
    setActionMessage(null);

    try {
      switch (actionType) {
        case 'expand_eavs': {
          // Expand EAVs using the configured AI provider
          const hasApiKey = state.businessInfo.geminiApiKey ||
                           state.businessInfo.openAiApiKey ||
                           state.businessInfo.anthropicApiKey ||
                           state.businessInfo.perplexityApiKey ||
                           state.businessInfo.openRouterApiKey;
          if (!hasApiKey) {
            setActionMessage({
              type: 'error',
              text: 'No AI provider configured. Please add an API key in Settings.'
            });
            break;
          }
          const currentEavs = activeMap.eavs || [];
          const pillars = activeMap.pillars;
          if (!pillars || !pillars.centralEntity) {
            setActionMessage({ type: 'error', text: 'SEO pillars not configured. Please complete the pillar setup first.' });
            break;
          }

          // Determine the action mode based on payload
          const isBalanceCategories = payload?.category !== undefined;
          const isSuggestTopics = payload?.suggestTopics === true;
          const targetCategory = payload?.category as string | undefined;

          // Show appropriate loading message
          if (isBalanceCategories) {
            setActionMessage({ type: 'success', text: `Filling gaps in ${targetCategory || 'underrepresented'} category...` });
          } else if (isSuggestTopics) {
            setActionMessage({ type: 'success', text: 'Discovering new topic ideas from EAV analysis...' });
          } else {
            setActionMessage({ type: 'success', text: 'Generating new semantic triples...' });
          }

          const newEavs = await expandSemanticTriples(
            state.businessInfo,
            pillars,
            currentEavs.slice(0, 20), // Sample for context
            dispatch,
            payload?.count || 15 // Generate count (default 15)
          );

          if (newEavs && newEavs.length > 0) {
            // Deduplicate new EAVs against existing ones
            const existingKeys = new Set(currentEavs.map(e =>
              `${e.subject?.label?.toLowerCase()}|${e.predicate?.relation?.toLowerCase()}|${String(e.object?.value).toLowerCase()}`
            ));
            const uniqueNewEavs = newEavs.filter(e =>
              !existingKeys.has(`${e.subject?.label?.toLowerCase()}|${e.predicate?.relation?.toLowerCase()}|${String(e.object?.value).toLowerCase()}`)
            );

            if (uniqueNewEavs.length === 0) {
              setActionMessage({ type: 'error', text: 'All generated EAVs already exist in your map. Try again for different results.' });
              break;
            }

            const updatedEavs = [...currentEavs, ...uniqueNewEavs];

            // PERSIST TO SUPABASE - Critical: Save to database, not just local state!
            const saved = await persistEavsToSupabase(updatedEavs);
            if (!saved) {
              // Error message already set by persistEavsToSupabase
              break;
            }

            // Build success message with EAV details
            const eavSummaries = uniqueNewEavs.slice(0, 5).map(e =>
              `${e.subject?.label} → ${e.predicate?.relation} → ${e.object?.value}`
            );
            const moreCount = uniqueNewEavs.length > 5 ? ` (+${uniqueNewEavs.length - 5} more)` : '';

            if (isSuggestTopics) {
              // Extract unique subjects as potential topic suggestions
              const allSuggestedTopics = [...new Set(uniqueNewEavs.map(e => e.subject?.label).filter(Boolean))] as string[];

              if (allSuggestedTopics.length > 0) {
                // Store suggestions and show modal for user to select
                setSuggestedTopics(allSuggestedTopics);
                setShowTopicSuggestionModal(true);
                setActionMessage({
                  type: 'success',
                  text: `Saved ${uniqueNewEavs.length} EAVs. Found ${allSuggestedTopics.length} potential topic${allSuggestedTopics.length !== 1 ? 's' : ''} - select which to add.`
                });
              } else {
                setActionMessage({
                  type: 'success',
                  text: `Saved ${uniqueNewEavs.length} EAVs. No new topic suggestions found.`
                });
              }
            } else if (isBalanceCategories) {
              const categoryCounts = uniqueNewEavs.reduce((acc, e) => {
                const cat = e.predicate?.category || 'UNCATEGORIZED';
                acc[cat] = (acc[cat] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const categoryBreakdown = Object.entries(categoryCounts).map(([k, v]) => `${k}: ${v}`).join(', ');
              setActionMessage({
                type: 'success',
                text: `Saved ${uniqueNewEavs.length} EAVs (${categoryBreakdown})`
              });
            } else {
              setActionMessage({
                type: 'success',
                text: `Saved ${uniqueNewEavs.length} new EAVs: ${eavSummaries.join('; ')}${moreCount}`
              });
            }
          } else {
            setActionMessage({ type: 'error', text: 'No new EAVs generated. Try again later.' });
          }
          break;
        }

        case 'add_eavs_to_map': {
          // Add competitor EAVs to the map
          const eavsToAdd = payload?.eavs as SemanticTriple[] | undefined;
          if (!eavsToAdd || eavsToAdd.length === 0) {
            throw new Error('No EAVs provided to add');
          }
          const currentEavs = activeMap.eavs || [];
          // Deduplicate using lowercase comparison for robustness
          const existingLabels = new Set(currentEavs.map(e =>
            `${e.subject?.label?.toLowerCase()}|${e.predicate?.relation?.toLowerCase()}|${String(e.object?.value).toLowerCase()}`
          ));
          const uniqueNewEavs = eavsToAdd.filter(e =>
            !existingLabels.has(`${e.subject?.label?.toLowerCase()}|${e.predicate?.relation?.toLowerCase()}|${String(e.object?.value).toLowerCase()}`)
          );
          if (uniqueNewEavs.length > 0) {
            const updatedEavs = [...currentEavs, ...uniqueNewEavs];

            // PERSIST TO SUPABASE - Critical: Save to database, not just local state!
            const saved = await persistEavsToSupabase(updatedEavs);
            if (!saved) {
              // Error message already set by persistEavsToSupabase
              break;
            }

            setActionMessage({ type: 'success', text: `Saved ${uniqueNewEavs.length} competitor EAVs to your map` });
          } else {
            setActionMessage({ type: 'error', text: 'All selected EAVs already exist in your map' });
          }
          break;
        }

        case 'create_brief_from_gap': {
          // Notify user to create brief - this should open the brief modal
          const gap = payload?.gap;
          const gaps = payload?.gaps;
          if (gaps && gaps.length > 0) {
            const titles = gaps.map((g: any) => g.title).join(', ');
            setActionMessage({ type: 'success', text: `Ready to create ${gaps.length} brief(s) for: ${titles}. Use the Topic panel to create topics and generate briefs.` });
          } else if (gap) {
            setActionMessage({ type: 'success', text: `Ready to create brief for "${gap.title}". Use the Topic panel to create the topic and generate a brief.` });
          }
          break;
        }

        case 'add_questions_as_faq': {
          // Add questions to FAQ - notify user
          const questions = payload?.questions as string[] | undefined;
          if (questions && questions.length > 0) {
            setActionMessage({
              type: 'success',
              text: `${questions.length} question(s) ready to add as FAQs. Use the Content Brief editor to add these to your topics.`
            });
          } else {
            setActionMessage({ type: 'error', text: 'No questions provided' });
          }
          break;
        }

        case 'merge_topics':
        case 'differentiate_topics': {
          // Notify user about the action needed
          const strategy = actionType === 'merge_topics' ? 'merge' : 'differentiate';
          const topicCount = payload?.topicIds?.length || 0;
          setActionMessage({
            type: 'success',
            text: `To ${strategy} ${topicCount > 0 ? `these ${topicCount / 2} topic pair(s)` : 'these topics'}, please use the Topic Manager to edit them directly.`
          });
          break;
        }

        case 'schedule_update': {
          // Schedule content update for stale topics
          const topics = payload?.topics as Array<{ topic: string; daysOld: number }> | undefined;
          if (topics && topics.length > 0) {
            const topicNames = topics.slice(0, 3).map(t => t.topic).join(', ');
            const moreCount = topics.length > 3 ? ` and ${topics.length - 3} more` : '';
            setActionMessage({
              type: 'success',
              text: `${topics.length} topic(s) flagged for content refresh: ${topicNames}${moreCount}. Use the Publication Progress tab to schedule updates.`
            });
          } else {
            setActionMessage({ type: 'error', text: 'No topics provided for scheduling' });
          }
          break;
        }

        case 'run_query_network':
          onOpenQueryNetworkAudit?.();
          break;

        case 'run_eat_scan':
          onOpenEATScanner?.();
          break;

        case 'run_corpus_audit':
          onOpenCorpusAudit?.();
          break;

        default:
          // Provide helpful guidance for unknown action types
          console.warn(`[InsightsHub] Unknown action type: ${actionType}`);
          setActionMessage({
            type: 'error',
            text: `Action "${actionType}" is not available in this view. Try using the Action Center tab for manual actions.`
          });
      }
    } catch (e) {
      console.error(`[InsightsHub] Action ${actionType} failed:`, e);
      // Clean up error message for display - extract user-friendly message
      let errorText = 'Action failed';
      if (e instanceof Error) {
        const msg = e.message;
        // Check for common error patterns and provide friendly messages
        if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
          errorText = 'API rate limit exceeded. Please wait a moment and try again.';
        } else if (msg.includes('401') || msg.includes('API key')) {
          errorText = 'API authentication failed. Please check your API key settings.';
        } else if (msg.includes('not configured') || msg.includes('required')) {
          errorText = msg; // These are already user-friendly
        } else if (msg.includes('Gemini API Call Failed')) {
          // Extract just the status from the JSON error
          errorText = 'AI service temporarily unavailable. Please try again later.';
        } else {
          errorText = msg.length > 100 ? msg.substring(0, 100) + '...' : msg;
        }
      }
      setActionMessage({ type: 'error', text: errorText });
    } finally {
      setActionLoading(null);
    }
  }, [activeMap, effectiveMapId, state.businessInfo, dispatch, persistEavsToSupabase, onOpenQueryNetworkAudit, onOpenEATScanner, onOpenCorpusAudit]);

  // Load all insights data
  useEffect(() => {
    const loadInsights = async () => {
      if (!effectiveMapId || !state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) {
        setError('Missing required configuration. Please ensure you have selected a map and configured Supabase.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
        // Pass local state data to ensure consistency with app state
        const localOverrides: LocalStateOverrides = {
          eavs: activeMap?.eavs,
          topics: activeMap?.topics,
        };
        const rawData = await loadAllInsightsData(supabase, effectiveMapId, 10, localOverrides);
        const aggregated = aggregateInsights(rawData);
        setInsights(aggregated);
      } catch (e) {
        console.error('[InsightsHub] Failed to load insights:', e);
        setError(e instanceof Error ? e.message : 'Failed to load insights data');
      } finally {
        setLoading(false);
      }
    };

    loadInsights();
  // Use .length for reliable change detection (object references don't trigger re-renders reliably)
  // refreshTrigger forces reload after EAV persistence
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMapId, state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey, activeMap?.eavs?.length, activeMap?.topics?.length, refreshTrigger]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    if (!effectiveMapId || !state.businessInfo.supabaseUrl || !state.businessInfo.supabaseAnonKey) return;

    setLoading(true);
    try {
      const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
      // Pass local state data to ensure consistency with app state
      const localOverrides: LocalStateOverrides = {
        eavs: activeMap?.eavs,
        topics: activeMap?.topics,
      };
      const rawData = await loadAllInsightsData(supabase, effectiveMapId, 10, localOverrides);
      const aggregated = aggregateInsights(rawData);
      setInsights(aggregated);
    } catch (e) {
      console.error('[InsightsHub] Failed to refresh:', e);
    } finally {
      setLoading(false);
    }
  // Use .length for more stable dependency detection
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMapId, state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey, activeMap?.eavs?.length, activeMap?.topics?.length]);

  // Render active tab content
  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader />
          <span className="ml-3 text-gray-400">Loading insights...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-20">
          <div className="text-red-400 mb-4">{error}</div>
          <Button onClick={handleRefresh} variant="secondary">
            Try Again
          </Button>
        </div>
      );
    }

    if (!insights) {
      return (
        <div className="text-center py-20 text-gray-500">
          No insights data available
        </div>
      );
    }

    const tabProps = {
      insights,
      mapId: effectiveMapId!,
      onRefresh: handleRefresh,
      onAction: handleAction,
      actionLoading,
      onOpenQueryNetworkAudit,
      onOpenEATScanner,
      onOpenCorpusAudit,
      onExport: () => setShowExportModal(true),
    };

    switch (activeTab) {
      case 'executive-summary':
        return <ExecutiveSummaryTab {...tabProps} />;
      case 'topical-authority':
        return <TopicalAuthorityTab {...tabProps} />;
      case 'competitive-intel':
        return <CompetitiveIntelTab {...tabProps} />;
      case 'authority-trust':
        return <AuthorityTrustTab {...tabProps} />;
      case 'content-health':
        return <ContentHealthTab {...tabProps} />;
      case 'semantic-map':
        return <SemanticMapTab {...tabProps} />;
      case 'gap-analysis':
        return <GapAnalysisTab {...tabProps} />;
      case 'publication-progress':
        return <PublicationProgressTab {...tabProps} />;
      case 'cost-usage':
        return <CostUsageTab {...tabProps} />;
      case 'audit-history':
        return <AuditHistoryTab {...tabProps} />;
      case 'action-center':
        return <ActionCenterTab {...tabProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh] bg-gray-900 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">SEO Insights Hub</h1>
            <p className="text-sm text-gray-400">{displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {insights && (
            <span className="text-xs text-gray-500">
              Last updated: {new Date(insights.lastUpdated).toLocaleString()}
            </span>
          )}
          {insights && (
            <Button onClick={() => setShowExportModal(true)} variant="secondary">
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </Button>
          )}
          <Button onClick={handleRefresh} variant="secondary" disabled={loading}>
            <svg className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="secondary">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation - Scrollable with compact styling */}
      <div className="sticky top-0 z-10 border-b border-gray-700 bg-gray-800">
        <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors
                border-b-2 -mb-px flex-shrink-0
                ${activeTab === tab.id
                  ? 'text-blue-400 border-blue-400 bg-blue-500/10'
                  : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-700/50'
                }
              `}
              title={tab.label}
            >
              {tab.icon}
              <span>{tab.shortLabel || tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Action Message Banner */}
      {actionMessage && (
        <div className={`px-4 py-3 flex items-center justify-between ${
          actionMessage.type === 'success'
            ? 'bg-green-900/50 border-b border-green-700/50'
            : 'bg-red-900/50 border-b border-red-700/50'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <span className={`text-sm ${actionMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
              {actionMessage.text}
            </span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {renderTabContent()}
      </div>

      {/* Footer with data freshness */}
      {insights && (
        <div className="px-6 py-3 border-t border-gray-700 bg-gray-800/30">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>Data Sources:</span>
              {insights.dataFreshness.queryNetwork && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Query Network
                </span>
              )}
              {insights.dataFreshness.eatScanner && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  E-A-T Scanner
                </span>
              )}
              {insights.dataFreshness.corpusAudit && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Corpus Audit
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenQueryNetworkAudit}
                className="text-blue-400 hover:text-blue-300"
              >
                Run Query Network
              </button>
              <span className="text-gray-600">|</span>
              <button
                onClick={onOpenEATScanner}
                className="text-blue-400 hover:text-blue-300"
              >
                Run E-A-T Scan
              </button>
              <span className="text-gray-600">|</span>
              <button
                onClick={onOpenCorpusAudit}
                className="text-blue-400 hover:text-blue-300"
              >
                Run Corpus Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {insights && activeMap && (
        <ComprehensiveExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          insights={insights}
          businessInfo={state.businessInfo}
          topics={activeMap.topics || []}
          eavs={activeMap.eavs || []}
          mapInfo={{ name: displayName, projectName }}
        />
      )}

      {/* Topic Suggestion Modal */}
      <TopicSuggestionModal
        isOpen={showTopicSuggestionModal}
        onClose={() => setShowTopicSuggestionModal(false)}
        suggestions={suggestedTopics}
        existingTopicTitles={(activeMap?.topics || []).map(t => t.title)}
        onConfirm={handleAddSuggestedTopics}
        isLoading={topicAddLoading}
      />
    </div>
  );
};

export default InsightsHub;
