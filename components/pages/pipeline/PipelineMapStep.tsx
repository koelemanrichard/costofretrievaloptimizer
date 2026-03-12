import React, { useState, useMemo, useCallback } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import StepDialogue from '../../pipeline/StepDialogue';
import { generateInitialTopicalMap, generateSingleCluster } from '../../../services/ai/mapGeneration';
import { extractServicesFromEavs, matchTopicsToExistingUrls, matchServicesToExistingUrls } from '../../../utils/eavUtils';
import type { ServiceWithPage } from '../../../utils/eavUtils';
import { generateTopicRationales } from '../../../services/ai/actionPlanService';
import type { ActionPlan } from '../../../types/actionPlan';
import type { EnrichedTopic, SemanticTriple } from '../../../types';
import type { DialogueContext, ExtractedData, CascadeImpact } from '../../../types/dialogue';
import { createEmptyDialogueContext, ensureValidDialogueContext } from '../../../services/ai/dialogueEngine';
import { getSupabaseClient } from '../../../services/supabaseClient';
import { verifiedBulkInsert } from '../../../services/verifiedDatabaseService';
import { v4 as uuidv4 } from 'uuid';
import { slugify, cleanSlug } from '../../../utils/helpers';
import { runPreAnalysis, calculateHealthScore, type PreAnalysisFinding } from '../../../services/ai/dialoguePreAnalysis';
import { PageInventoryView } from '../../pipeline/PageInventoryView';
import { ActionableFindingsPanel, type ActionableFinding, type FindingAction } from '../../pipeline/ActionableFindingsPanel';
import type { PageInventory } from '../../../types';

// ──── Ensure existing service pages are pillar topics ────

/**
 * Deterministic safety net: ensures services with existing pages
 * always appear as pillar topics, regardless of AI compliance.
 * Mutates topics in-place.
 */
function ensureExistingPagesArePillars(
  topics: EnrichedTopic[],
  servicesWithPages: ServiceWithPage[]
): void {
  for (const service of servicesWithPages) {
    if (!service.existingUrl) continue;

    // Check if AI created a matching core topic (by slug or service_alignment)
    const existingSlugLower = service.existingSlug?.toLowerCase();
    const serviceNameLower = service.name.toLowerCase();

    const matchingCore = topics.find(t =>
      t.type === 'core' && (
        (existingSlugLower && t.slug?.toLowerCase().includes(existingSlugLower)) ||
        (t.metadata as any)?.service_alignment?.toLowerCase() === serviceNameLower ||
        t.title.toLowerCase().includes(serviceNameLower)
      )
    );

    if (matchingCore) {
      // AI created a matching topic — enrich it
      matchingCore.target_url = service.existingUrl;
      matchingCore.cluster_role = 'pillar';
      if (service.existingSlug && !matchingCore.slug?.includes(service.existingSlug)) {
        matchingCore.slug = service.existingSlug;
      }
      matchingCore.metadata = {
        ...matchingCore.metadata,
        is_existing_page: true,
        original_service: service.name,
      };
    }
    // Note: We don't inject missing pillar topics here because the AI already
    // received strong prompt instructions. If a service wasn't mapped, it's
    // likely been merged into another topic by the AI's judgment.
  }
}

// ──── Metric Card ────

function MetricCard({ label, value, color = 'gray' }: {
  label: string;
  value: string | number;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'gray';
}) {
  const colorMap: Record<string, string> = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    gray: 'text-gray-400',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

// ──── Cluster Cards (Decision 6 — primary view) ────

function ClusterCardsView({ coreTopics, outerTopics, contentAreas }: {
  coreTopics: EnrichedTopic[];
  outerTopics: EnrichedTopic[];
  contentAreas?: string[];
}) {
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [showTree, setShowTree] = useState(false);
  const INITIAL_SPOKES = 3;

  const hubs = coreTopics.filter(t => t.cluster_role === 'pillar');
  const spokesByHub = outerTopics.reduce<Record<string, EnrichedTopic[]>>((acc, spoke) => {
    const key = spoke.parent_topic_id ?? '_unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(spoke);
    return acc;
  }, {});

  // Match hubs to content areas from strategy (Decision 4 + S5)
  const getClusterLabel = (hub: EnrichedTopic): { businessName: string; frameworkLabel: string; colorType: 'revenue' | 'authority' } => {
    const topicClass = hub.topic_class;
    const colorType: 'revenue' | 'authority' = topicClass === 'monetization' ? 'revenue' : 'authority';
    const frameworkLabel = colorType === 'revenue' ? 'revenue pages' : 'authority pages';

    // Try to match with a content area from strategy step
    if (contentAreas && contentAreas.length > 0) {
      const hubTitleLower = hub.title.toLowerCase();
      const match = contentAreas.find(a =>
        hubTitleLower.includes(a.toLowerCase()) ||
        a.toLowerCase().includes(hubTitleLower.split(' ')[0])
      );
      if (match) {
        return { businessName: match, frameworkLabel, colorType };
      }
    }

    return { businessName: hub.title, frameworkLabel, colorType };
  };

  const toggleCard = (hubId: string) =>
    setExpandedCards(prev => ({ ...prev, [hubId]: !prev[hubId] }));

  if (hubs.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-2">Content Structure</h3>
        <p className="text-xs text-gray-500 text-center pt-2">
          Generate topical map to see your content organized into hub topics
        </p>
      </div>
    );
  }

  const unassigned = spokesByHub['_unassigned'] ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Content Structure</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{hubs.length} hub topics, {outerTopics.length} supporting articles</span>
          <button
            type="button"
            onClick={() => setShowTree(!showTree)}
            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {showTree ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              )}
            </svg>
            {showTree ? 'Card view' : 'Tree view'}
          </button>
        </div>
      </div>

      {showTree ? (
        /* Tree view — original hub-spoke hierarchy */
        <TreeView hubs={hubs} spokesByHub={spokesByHub} unassigned={unassigned} />
      ) : (
        /* Cluster cards — primary view (Decision 6) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {hubs.map(hub => {
            const spokes = spokesByHub[hub.id] ?? [];
            const totalPages = 1 + spokes.length;
            const { businessName, frameworkLabel, colorType } = getClusterLabel(hub);
            const isExpanded = expandedCards[hub.id] ?? false;
            const visibleSpokes = isExpanded ? spokes : spokes.slice(0, INITIAL_SPOKES);

            const borderColor = colorType === 'revenue' ? 'border-emerald-500' : 'border-sky-500';
            const bgColor = colorType === 'revenue' ? 'bg-emerald-900/10' : 'bg-sky-900/10';
            const badgeBg = colorType === 'revenue' ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30' : 'bg-sky-600/20 text-sky-300 border-sky-500/30';
            const labelColor = colorType === 'revenue' ? 'text-emerald-400/60' : 'text-sky-400/60';
            const countColor = colorType === 'revenue' ? 'text-emerald-400' : 'text-sky-400';

            return (
              <div
                key={hub.id}
                className={`${bgColor} border border-gray-700 border-l-4 ${borderColor} rounded-lg overflow-hidden`}
              >
                <button
                  type="button"
                  onClick={() => toggleCard(hub.id)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`${badgeBg} border rounded px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0`}>
                          {colorType === 'revenue' ? 'CS' : 'AS'}
                        </span>
                        <span className="text-sm font-medium text-gray-200 truncate">{businessName}</span>
                        <span className={`text-[10px] ${labelColor}`}>({frameworkLabel})</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        1 hub + {spokes.length} article{spokes.length !== 1 ? 's' : ''} = <span className={`font-semibold ${countColor}`}>{totalPages} pages</span>
                      </p>
                      {(hub.metadata as any)?.rationale && (
                        <p className="text-[11px] text-gray-500 italic mt-0.5 line-clamp-2">{(hub.metadata as any).rationale}</p>
                      )}
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 mt-1 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded: show hub + first spokes */}
                {isExpanded && (
                  <div className="border-t border-gray-700/50 px-4 py-2 space-y-1">
                    {/* Hub page */}
                    <div className="flex items-center gap-2 py-1">
                      <div className="w-4 h-4 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-[8px] font-semibold text-purple-300">H</span>
                      </div>
                      <span className="text-xs text-gray-300 truncate">{hub.title}</span>
                      {hub.slug && <span className="text-[10px] text-gray-600 font-mono truncate">/{hub.slug}</span>}
                    </div>
                    {/* Spoke pages */}
                    {visibleSpokes.map(spoke => (
                      <div key={spoke.id} className="py-1 pl-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-[7px] font-semibold text-blue-300">S</span>
                          </div>
                          <span className="text-[11px] text-gray-400 truncate">{spoke.title}</span>
                        </div>
                        {(spoke.metadata as any)?.rationale && (
                          <p className="text-[10px] text-gray-600 italic pl-5 line-clamp-1">{(spoke.metadata as any).rationale}</p>
                        )}
                      </div>
                    ))}
                    {spokes.length > visibleSpokes.length && (
                      <p className="text-[10px] text-gray-600 pl-3 py-1">
                        ... and {spokes.length - visibleSpokes.length} more articles
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unassigned topics */}
      {unassigned.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-md px-4 py-3">
          <p className="text-xs text-gray-500">
            {unassigned.length} topics without hub assignment
          </p>
        </div>
      )}
    </div>
  );
}

// ──── Tree View (secondary, toggled from ClusterCardsView) ────

function TreeView({ hubs, spokesByHub, unassigned }: {
  hubs: EnrichedTopic[];
  spokesByHub: Record<string, EnrichedTopic[]>;
  unassigned: EnrichedTopic[];
}) {
  const [expandedHubs, setExpandedHubs] = useState<Record<string, boolean>>({});
  const INITIAL_SPOKES = 5;

  const toggleHub = (hubId: string) =>
    setExpandedHubs(prev => ({ ...prev, [hubId]: !prev[hubId] }));

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-2">
      {hubs.map(hub => {
        const spokes = spokesByHub[hub.id] ?? [];
        const isExpanded = expandedHubs[hub.id] ?? false;
        const visibleSpokes = isExpanded ? spokes : spokes.slice(0, INITIAL_SPOKES);
        const hiddenCount = spokes.length - INITIAL_SPOKES;

        return (
          <div key={hub.id} className="bg-gray-900 border border-gray-700 rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => toggleHub(hub.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors text-left"
            >
              <div className="w-6 h-6 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-semibold text-purple-300">H</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{hub.title}</p>
                {hub.slug && <p className="text-[11px] text-gray-500 font-mono truncate">/{hub.slug}</p>}
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">{spokes.length} spokes</span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {spokes.length > 0 && (isExpanded || visibleSpokes.length > 0) && (
              <div className="border-t border-gray-700/50 px-4 py-2 space-y-1">
                {visibleSpokes.map(spoke => (
                  <div key={spoke.id} className="flex items-center gap-2 py-1 pl-4">
                    <div className="w-4 h-4 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-[8px] font-semibold text-blue-300">S</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 truncate">{spoke.title}</p>
                      {spoke.slug && <p className="text-[10px] text-gray-600 font-mono truncate">/{spoke.slug}</p>}
                    </div>
                  </div>
                ))}
                {!isExpanded && hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleHub(hub.id)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 pl-4 py-1"
                  >
                    Show {hiddenCount} more
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {unassigned.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
          <p className="text-xs text-gray-500">{unassigned.length} spokes without hub assignment</p>
        </div>
      )}
    </div>
  );
}

// ──── Linking Flow Diagram ────

function LinkingFlowDiagram({ coreTopics, outerTopics }: {
  coreTopics: EnrichedTopic[];
  outerTopics: EnrichedTopic[];
}) {
  const hubs = coreTopics.filter(t => t.cluster_role === 'pillar');

  // Classify hubs as AS or CS based on topic_class
  const asHubs = hubs.filter(h => h.topic_class === 'informational' || h.topic_class?.includes('authority'));
  const csHubs = hubs.filter(h => h.topic_class === 'monetization' || h.topic_class?.includes('transactional'));
  const otherHubs = hubs.filter(h => !asHubs.includes(h) && !csHubs.includes(h));

  const rules = [
    { code: 'Article \u2192 Hub', description: 'Every article links back to its hub topic page' },
    { code: 'Hub \u2192 Articles (max 15)', description: 'Main page links to all its articles, max 15 contextual links' },
    { code: 'No cross-hub', description: 'Articles don\u2019t link directly to articles in other hub topics' },
    { code: 'Authority \u2192 Revenue', description: 'Authority pages link to revenue pages, building their ranking power' },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-6">
      <h3 className="text-sm font-semibold text-gray-200">How Pages Link Together</h3>

      {/* Flow diagram */}
      {hubs.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-md p-4">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {/* Authority pages */}
            <div className="text-center min-w-[120px]">
              <p className="text-[10px] uppercase tracking-wider text-sky-400 mb-2">Authority pages</p>
              <div className="space-y-1">
                {(asHubs.length > 0 ? asHubs : otherHubs.slice(0, Math.ceil(otherHubs.length / 2))).slice(0, 3).map(h => (
                  <p key={h.id} className="text-[11px] text-gray-400 truncate max-w-[140px]">{h.title}</p>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-1">Builds expertise</p>
            </div>

            {/* Arrow */}
            <div className="text-gray-600 flex-shrink-0">
              <svg className="w-8 h-4" fill="none" viewBox="0 0 32 16">
                <path d="M0 8h24m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Knowledge pages */}
            <div className="text-center min-w-[120px]">
              <p className="text-[10px] uppercase tracking-wider text-blue-400 mb-2">Knowledge pages</p>
              <div className="space-y-1">
                {(csHubs.length > 1 ? csHubs.slice(0, Math.ceil(csHubs.length / 2)) : otherHubs.slice(Math.ceil(otherHubs.length / 2))).slice(0, 3).map(h => (
                  <p key={h.id} className="text-[11px] text-gray-400 truncate max-w-[140px]">{h.title}</p>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-1">Supports services</p>
            </div>

            {/* Arrow */}
            <div className="text-gray-600 flex-shrink-0">
              <svg className="w-8 h-4" fill="none" viewBox="0 0 32 16">
                <path d="M0 8h24m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Service/Revenue pages */}
            <div className="text-center min-w-[120px]">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2">Service pages</p>
              <div className="space-y-1">
                {(csHubs.length > 1 ? csHubs.slice(Math.ceil(csHubs.length / 2)) : csHubs).slice(0, 3).map(h => (
                  <p key={h.id} className="text-[11px] text-gray-400 truncate max-w-[140px]">{h.title}</p>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-1">Drives revenue</p>
            </div>
          </div>

          <p className="text-[10px] text-gray-600 text-center mt-3 border-t border-gray-700/50 pt-2">
            Authority pages build expertise that supports knowledge content, which drives traffic to your service pages.
          </p>
        </div>
      )}

      {/* Rules */}
      <div className="space-y-3">
        {rules.map((rule, i) => (
          <div key={i} className="flex items-start gap-3">
            <code className="bg-gray-900 text-green-400 border border-gray-700 rounded px-2 py-1 text-xs font-mono whitespace-nowrap flex-shrink-0">
              {rule.code}
            </code>
            <p className="text-sm text-gray-400 pt-0.5">{rule.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Anchor Text Strategy Card (M2) ────

function AnchorTextStrategyCard({ coreTopics, contentAreas }: {
  coreTopics: EnrichedTopic[];
  contentAreas?: string[];
}) {
  const hubs = coreTopics.filter(t => t.cluster_role === 'pillar');
  if (hubs.length < 2) return null;

  const getType = (hub: EnrichedTopic): 'revenue' | 'authority' =>
    hub.topic_class === 'monetization' ? 'revenue' : 'authority';

  const getLabel = (hub: EnrichedTopic): string => {
    if (contentAreas) {
      const titleLow = hub.title.toLowerCase();
      const match = contentAreas.find(a =>
        titleLow.includes(a.toLowerCase()) ||
        a.toLowerCase().includes(titleLow.split(' ')[0])
      );
      if (match) return match;
    }
    return hub.title;
  };

  // Build linking rules based on cluster types
  const rules: Array<{
    from: string;
    fromType: 'revenue' | 'authority';
    to: string;
    toType: 'revenue' | 'authority';
    anchorPattern: string;
    direction: string;
  }> = [];

  const authorityHubs = hubs.filter(h => getType(h) === 'authority');
  const revenueHubs = hubs.filter(h => getType(h) === 'revenue');

  // Authority → Revenue links (most valuable)
  for (const auth of authorityHubs.slice(0, 3)) {
    for (const rev of revenueHubs.slice(0, 2)) {
      const authLabel = getLabel(auth);
      const revLabel = getLabel(rev);
      rules.push({
        from: authLabel,
        fromType: 'authority',
        to: revLabel,
        toType: 'revenue',
        anchorPattern: `"${revLabel.split(' ')[0].toLowerCase()} services" or "${revLabel.toLowerCase()}"`,
        direction: 'authority \u2192 revenue',
      });
    }
  }

  // Revenue → Authority links (context building)
  for (const rev of revenueHubs.slice(0, 2)) {
    for (const auth of authorityHubs.slice(0, 2)) {
      const authLabel = getLabel(auth);
      const revLabel = getLabel(rev);
      rules.push({
        from: revLabel,
        fromType: 'revenue',
        to: authLabel,
        toType: 'authority',
        anchorPattern: `"learn more about ${authLabel.toLowerCase()}" or "${authLabel.split(' ')[0].toLowerCase()} guide"`,
        direction: 'revenue \u2192 authority',
      });
    }
  }

  const directionColors: Record<string, string> = {
    'authority \u2192 revenue': 'bg-emerald-900/20 text-emerald-300 border-emerald-500/30',
    'revenue \u2192 authority': 'bg-sky-900/20 text-sky-300 border-sky-500/30',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-1">Anchor Text Strategy</h3>
      <p className="text-xs text-gray-500 mb-4">
        Recommended link text between hub topics — authority pages pass ranking power to revenue pages
      </p>

      <div className="space-y-2">
        {rules.slice(0, 6).map((rule, i) => {
          const fromColor = rule.fromType === 'revenue' ? 'text-emerald-300' : 'text-sky-300';
          const toColor = rule.toType === 'revenue' ? 'text-emerald-300' : 'text-sky-300';
          return (
            <div key={i} className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2">
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className={`font-medium ${fromColor} truncate max-w-[140px]`}>{rule.from}</span>
                <span className="text-gray-600 flex-shrink-0">{'\u2192'}</span>
                <span className={`font-medium ${toColor} truncate max-w-[140px]`}>{rule.to}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border ml-auto ${directionColors[rule.direction] ?? 'bg-gray-700 text-gray-400 border-gray-600'}`}>
                  {rule.direction}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Anchor: {rule.anchorPattern}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 bg-gray-900/50 border border-gray-700/50 rounded-md px-3 py-2">
        <p className="text-[10px] text-gray-500">
          <span className="text-gray-400 font-medium">Rule:</span> Max 3 uses per anchor text. Vary anchors: use primary, synonym, and contextual variants.
        </p>
      </div>
    </div>
  );
}

// ──── Contextual Bridges Panel (M3 enhanced) ────

function ContextualBridgesPanel({ coreTopics, eavs, contentAreas }: {
  coreTopics: EnrichedTopic[];
  eavs: SemanticTriple[];
  contentAreas?: string[];
}) {
  const hubs = coreTopics.filter(t => t.cluster_role === 'pillar');

  if (hubs.length < 2 || eavs.length === 0) return null;

  const getLabel = (hub: EnrichedTopic): string => {
    if (contentAreas) {
      const titleLow = hub.title.toLowerCase();
      const match = contentAreas.find(a =>
        titleLow.includes(a.toLowerCase()) ||
        a.toLowerCase().includes(titleLow.split(' ')[0])
      );
      if (match) return match;
    }
    return hub.title;
  };

  // Build entity-to-hub mapping from EAVs and topic titles
  const hubEntityMap = new Map<string, Set<string>>();
  const hubAttributeMap = new Map<string, Array<{ predicate: string; value: string }>>();

  for (const hub of hubs) {
    const entities = new Set<string>();
    const attributes: Array<{ predicate: string; value: string }> = [];
    const hubTitle = hub.title.toLowerCase();

    for (const eav of eavs) {
      const entityName = eav.subject?.label?.toLowerCase() ?? '';
      const attrName = eav.predicate?.relation?.toLowerCase() ?? '';
      const valueName = String(eav.object?.value ?? '').toLowerCase();

      if (
        hubTitle.includes(entityName) ||
        entityName.includes(hubTitle.split(' ')[0]) ||
        attrName.includes(hubTitle.split(' ')[0]) ||
        valueName.includes(hubTitle.split(' ')[0])
      ) {
        entities.add(eav.subject?.label ?? '');
        if (eav.predicate?.relation) {
          entities.add(eav.predicate.relation);
          attributes.push({
            predicate: eav.predicate.relation,
            value: String(eav.object?.value ?? ''),
          });
        }
      }
    }

    hubEntityMap.set(hub.id, entities);
    hubAttributeMap.set(hub.id, attributes);
  }

  // Find hub pairs with shared references
  const bridges: Array<{
    hubA: EnrichedTopic;
    hubB: EnrichedTopic;
    sharedTerms: string[];
    businessConcept: string;
  }> = [];

  for (let i = 0; i < hubs.length; i++) {
    for (let j = i + 1; j < hubs.length; j++) {
      const setA = hubEntityMap.get(hubs[i].id) ?? new Set();
      const setB = hubEntityMap.get(hubs[j].id) ?? new Set();
      const shared = [...setA].filter(term => setB.has(term) && term.length > 0);

      // M3: Generate business concept explanation
      const labelA = getLabel(hubs[i]);
      const labelB = getLabel(hubs[j]);
      let businessConcept = '';
      if (shared.length > 0) {
        const mainTerm = shared[0];
        businessConcept = `${labelA} connects to ${labelB} through ${mainTerm}. When discussing ${mainTerm}, link to both hub topics.`;
      }

      if (shared.length > 0) {
        bridges.push({
          hubA: hubs[i],
          hubB: hubs[j],
          sharedTerms: shared.slice(0, 5),
          businessConcept,
        });
      }
    }
  }

  // Fallback: show all hub pairs as potential bridges
  const displayBridges = bridges.length > 0
    ? bridges
    : hubs.slice(0, 4).flatMap((a, i) =>
        hubs.slice(i + 1, i + 3).map(b => ({
          hubA: a,
          hubB: b,
          sharedTerms: [] as string[],
          businessConcept: '',
        }))
      ).slice(0, 6);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-1">Contextual Bridges</h3>
      <p className="text-xs text-gray-500 mb-4">
        How your content areas connect through shared business concepts
      </p>
      <div className="space-y-2">
        {displayBridges.map((bridge, i) => {
          const labelA = getLabel(bridge.hubA);
          const labelB = getLabel(bridge.hubB);
          return (
            <div key={i} className="bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-300 font-medium truncate max-w-[180px]">{labelA}</span>
                <span className="text-gray-600 flex-shrink-0">{'\u2194'}</span>
                <span className="text-gray-300 font-medium truncate max-w-[180px]">{labelB}</span>
              </div>
              {bridge.sharedTerms.length > 0 && (
                <>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="text-[10px] text-gray-500 mr-1">Shared:</span>
                    {bridge.sharedTerms.map((term, j) => (
                      <span key={j} className="text-[10px] bg-blue-900/20 text-blue-300 border border-blue-700/30 rounded px-1.5 py-0.5">
                        {term}
                      </span>
                    ))}
                  </div>
                  {bridge.businessConcept && (
                    <p className="text-[10px] text-gray-400 mt-1.5 italic">
                      {bridge.businessConcept}
                    </p>
                  )}
                </>
              )}
              {bridge.sharedTerms.length === 0 && (
                <p className="text-[10px] text-gray-600 mt-1">
                  Potential bridge — add shared EAV attributes to strengthen connection
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──── Publishing Waves ────

const DYNAMIC_WAVE_COLORS: Array<{ border: string; bg: string }> = [
  { border: 'border-emerald-500/50', bg: 'bg-emerald-900/10' },
  { border: 'border-blue-500/50', bg: 'bg-blue-900/10' },
  { border: 'border-amber-500/50', bg: 'bg-amber-900/10' },
  { border: 'border-sky-500/50', bg: 'bg-sky-900/10' },
  { border: 'border-purple-500/50', bg: 'bg-purple-900/10' },
  { border: 'border-rose-500/50', bg: 'bg-rose-900/10' },
  { border: 'border-teal-500/50', bg: 'bg-teal-900/10' },
  { border: 'border-orange-500/50', bg: 'bg-orange-900/10' },
];

function PublishingWavesPanel({ coreTopics, outerTopics, actionPlan, isGeneratingWaves }: {
  coreTopics: EnrichedTopic[];
  outerTopics: EnrichedTopic[];
  actionPlan?: import('../../../types/actionPlan').ActionPlan | null;
  isGeneratingWaves?: boolean;
}) {
  const [expandedWaves, setExpandedWaves] = useState<Record<number, boolean>>({});
  const allTopics = [...coreTopics, ...outerTopics];
  const total = allTopics.length;
  const WAVE_INITIAL = 8;

  // Show loading state while waves are being generated
  if (isGeneratingWaves) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Publishing Strategy</h3>
        <div className="flex items-center gap-3 text-sm text-blue-300">
          <svg className="animate-spin w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generating AI-driven publishing strategy based on your business context...
        </div>
      </div>
    );
  }

  // Show placeholder when no action plan exists yet
  if (!actionPlan?.waveDefinitions || actionPlan.waveDefinitions.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Publishing Strategy</h3>
        <p className="text-xs text-gray-500">
          {total > 0
            ? 'Publishing strategy will be generated after the topical map is created.'
            : 'Generate a topical map to see the AI-driven publishing strategy.'}
        </p>
      </div>
    );
  }

  // Build topic lookup by wave from action plan entries
  const topicById = new Map(allTopics.map(t => [t.id, t]));
  const topicsByWave = new Map<number, EnrichedTopic[]>();
  for (const wd of actionPlan.waveDefinitions) {
    topicsByWave.set(wd.number, []);
  }
  for (const entry of (actionPlan.entries ?? [])) {
    const topic = topicById.get(entry.topicId);
    if (topic) {
      const list = topicsByWave.get(entry.wave) ?? [];
      list.push(topic);
      topicsByWave.set(entry.wave, list);
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-200">Publishing Strategy</h3>
        <span className="text-[10px] text-gray-500">
          {actionPlan.waveDefinitions.length} waves — AI-generated
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actionPlan.waveDefinitions.map((wd, idx) => {
          const waveTopics = topicsByWave.get(wd.number) ?? [];
          const count = waveTopics.length;
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;
          const isExpanded = expandedWaves[wd.number] ?? false;
          const colors = DYNAMIC_WAVE_COLORS[idx % DYNAMIC_WAVE_COLORS.length];

          return (
            <div
              key={wd.number}
              className={`border rounded-lg p-4 ${colors.border} ${colors.bg}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-200">
                  Wave {wd.number}: {wd.name}
                </h4>
                <span className="text-xs text-gray-400">{count} pages</span>
              </div>
              <p className="text-xs text-gray-400">{wd.description}</p>
              <div className="mt-3">
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div className="bg-gray-500 h-1.5 rounded-full" style={{ width: `${percent}%` }} />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {count > 0 ? `${count} pages assigned` : 'No pages assigned'}
                </p>
              </div>

              {waveTopics.length > 0 && (
                <div className="mt-3 border-t border-gray-700/40 pt-2">
                  <button
                    type="button"
                    onClick={() => setExpandedWaves(prev => ({ ...prev, [wd.number]: !prev[wd.number] }))}
                    className="text-[11px] text-blue-400 hover:text-blue-300 mb-1.5 flex items-center gap-1"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    {isExpanded ? 'Hide pages' : `Show ${waveTopics.length} pages`}
                  </button>
                  {isExpanded && (
                    <div className="space-y-1">
                      {(isExpanded ? waveTopics : waveTopics.slice(0, WAVE_INITIAL)).map(t => (
                        <div key={t.id} className="text-[11px] text-gray-400 py-0.5 pl-1">
                          <span className="truncate block">{t.title}</span>
                          {t.slug && (
                            <span className="text-[10px] text-gray-600 font-mono block truncate">/{t.slug}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──── Topic List ────

function TopicList({ topics, label, allCoreTopics, onRename }: {
  topics: EnrichedTopic[];
  label: string;
  allCoreTopics?: EnrichedTopic[];
  onRename?: (topicId: string, newTitle: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const display = expanded ? topics : topics.slice(0, 5);

  // Build a lookup for parent hub names
  const hubNameById = (allCoreTopics ?? []).reduce<Record<string, string>>((acc, t) => {
    if (t.cluster_role === 'pillar') acc[t.id] = t.title;
    return acc;
  }, {});

  const startEditing = (topic: EnrichedTopic) => {
    if (!onRename) return;
    setEditingId(topic.id);
    setEditValue(topic.title);
  };

  const commitEdit = () => {
    if (editingId && editValue.trim() && onRename) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  if (topics.length === 0) return null;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-200">{label}</h4>
        <span className="text-xs text-gray-500">{topics.length} topics</span>
      </div>
      <div className="space-y-1">
        {display.map((t, i) => {
          const parentName = t.parent_topic_id ? hubNameById[t.parent_topic_id] : null;
          const isEditing = editingId === t.id;
          return (
            <div key={i} className="bg-gray-900 rounded px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  t.cluster_role === 'pillar' ? 'bg-purple-400' : 'bg-blue-400'
                }`} />
                {isEditing ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                    className="flex-1 bg-gray-800 border border-blue-500 rounded px-2 py-0.5 text-xs text-gray-200 focus:outline-none"
                  />
                ) : (
                  <span
                    className={`truncate ${onRename ? 'cursor-pointer hover:text-gray-200' : ''}`}
                    onDoubleClick={() => startEditing(t)}
                  >{t.title}</span>
                )}
                {t.topic_class && (
                  <span className="ml-auto text-gray-600 flex-shrink-0">{t.topic_class}</span>
                )}
              </div>
              {(t.slug || parentName) && (
                <div className="flex items-center gap-2 pl-4 mt-0.5">
                  {t.slug && (
                    <span className="text-[10px] text-gray-600 font-mono truncate">/{t.slug}</span>
                  )}
                  {parentName && (
                    <span className="text-[10px] text-gray-600 truncate">
                      <span className="text-gray-700 mx-1">&rarr;</span>Hub: {parentName}
                    </span>
                  )}
                </div>
              )}
              {(t.metadata as any)?.rationale && (
                <p className="text-[10px] text-gray-600 italic pl-4 mt-0.5 line-clamp-1">{(t.metadata as any).rationale}</p>
              )}
            </div>
          );
        })}
      </div>
      {topics.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-400 hover:text-blue-300 mt-2"
        >
          {expanded ? 'Show less' : `Show ${topics.length - 5} more`}
        </button>
      )}
    </div>
  );
}

// ──── Existing Page Mapping (M5 — Migration) ────

interface PageMapping {
  oldUrl: string;
  newSlug: string;
  action: 'keep' | 'redirect' | 'new';
  matchedTopic?: string;
}

function ExistingPageMappingPanel({
  topics,
  domain,
  pagesFound,
  crawledUrls,
}: {
  topics: EnrichedTopic[];
  domain?: string;
  pagesFound?: number;
  crawledUrls?: string[];
}) {
  const [expanded, setExpanded] = useState(false);

  // Normalize crawled URLs for matching
  const crawledSlugs = new Set(
    (crawledUrls ?? []).map(url => {
      try {
        const parsed = new URL(url);
        return parsed.pathname.replace(/\/$/, '').toLowerCase();
      } catch {
        return url.replace(/\/$/, '').toLowerCase();
      }
    }).filter(Boolean)
  );

  // Build mapping with intelligent action detection
  const mappings: PageMapping[] = topics
    .filter(t => t.slug)
    .map(t => {
      const slug = t.slug || '';
      const newSlug = `/${slug}`;

      // Determine action based on whether existing page matches
      let action: 'keep' | 'redirect' | 'new' = 'new';

      if (crawledSlugs.size > 0) {
        // Check for exact slug match in crawled pages
        const exactMatch = crawledSlugs.has(newSlug.toLowerCase());
        if (exactMatch) {
          action = 'keep'; // Same URL, content will be updated in-place
        } else {
          // Check for partial match (existing page covers similar topic)
          const slugWords = slug.toLowerCase().split('-').filter(w => w.length > 2);
          const hasPartialMatch = [...crawledSlugs].some(crawledSlug => {
            const crawledWords = crawledSlug.split('/').pop()?.split('-').filter(w => w.length > 2) ?? [];
            const overlap = slugWords.filter(w => crawledWords.includes(w));
            return overlap.length >= 2; // At least 2 meaningful words match
          });
          action = hasPartialMatch ? 'redirect' : 'new';
        }
      } else {
        // No crawled data: hubs are 'keep' (existing pages), spokes are 'new'
        action = t.cluster_role === 'pillar' ? 'redirect' : 'new';
      }

      return {
        oldUrl: domain ? `${domain}/${slug}` : newSlug,
        newSlug,
        action,
        matchedTopic: t.title,
      };
    });

  const newPages = mappings.filter(m => m.action === 'new').length;
  const redirectPages = mappings.filter(m => m.action === 'redirect').length;
  const keepPages = mappings.filter(m => m.action === 'keep').length;

  if (mappings.length === 0) return null;

  const shown = expanded ? mappings : mappings.slice(0, 8);

  const actionConfig = {
    keep: { label: 'Keep', bg: 'bg-green-900/20 text-green-400 border-green-700/30' },
    redirect: { label: 'Redirect', bg: 'bg-amber-900/20 text-amber-300 border-amber-700/30' },
    new: { label: 'New Page', bg: 'bg-blue-900/20 text-blue-300 border-blue-700/30' },
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-gray-200">Page Migration Mapping</h3>
            <p className="text-[10px] text-gray-500">
              {keepPages > 0 && `${keepPages} to update, `}
              {redirectPages > 0 && `${redirectPages} to redirect, `}
              {newPages} new page{newPages !== 1 ? 's' : ''}
              {pagesFound ? ` \u2014 ${pagesFound} existing pages on site` : ''}
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-700/50">
          {/* Summary bar */}
          <div className="px-6 py-3 bg-gray-900/50 flex items-center gap-4 text-xs">
            {keepPages > 0 && <span className="text-green-400">{keepPages} keep (update content)</span>}
            {redirectPages > 0 && <span className="text-amber-400">{redirectPages} redirects</span>}
            <span className="text-blue-400">{newPages} new pages</span>
            {pagesFound && pagesFound > (keepPages + redirectPages) && (
              <span className="text-gray-500">{pagesFound - keepPages - redirectPages} unchanged</span>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50 text-[10px] text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-2 text-left font-medium">New URL</th>
                  <th className="px-6 py-2 text-left font-medium">Maps To Topic</th>
                  <th className="px-6 py-2 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((m, i) => {
                  const ac = actionConfig[m.action];
                  return (
                    <tr key={i} className="border-b border-gray-700/20 hover:bg-gray-800/50">
                      <td className="px-6 py-2">
                        <span className="text-xs text-gray-400 font-mono">{m.newSlug}</span>
                      </td>
                      <td className="px-6 py-2">
                        <span className="text-xs text-gray-300">{m.matchedTopic ?? '\u2014'}</span>
                      </td>
                      <td className="px-6 py-2">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${ac.bg}`}>
                          {ac.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {mappings.length > 8 && !expanded && (
            <div className="px-6 py-2 text-center">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Show all {mappings.length} pages
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──── Service Confirmation Panel ────

function ServiceConfirmationPanel({ services, onServicesChange, source }: {
  services: string[];
  onServicesChange: (services: string[]) => void;
  source?: 'confirmed' | 'offerings' | 'eavs' | 'manual';
}) {
  const [newService, setNewService] = useState('');

  const removeService = (index: number) => {
    onServicesChange(services.filter((_, i) => i !== index));
  };

  const addService = () => {
    const trimmed = newService.trim();
    if (trimmed && !services.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      onServicesChange([...services, trimmed]);
      setNewService('');
    }
  };

  if (services.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-200 mb-2">Business Services</h4>
        <p className="text-xs text-gray-500 mb-3">
          No services detected. Add your core products/services to ensure the topical map covers your business.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newService}
            onChange={e => setNewService(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addService()}
            placeholder="e.g., Dakrenovatie, Daklekkage Reparatie"
            className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
          />
          <button type="button" onClick={addService} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm">Add</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-200 mb-1">Business Services</h4>
      <p className="text-xs text-gray-500 mb-3">
        {source === 'confirmed' || source === 'offerings'
          ? 'Confirmed from your business profile. Each service gets a dedicated hub topic. Edit if needed.'
          : 'Extracted from business facts. Review carefully — remove irrelevant ones and add missing services.'}
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {services.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-emerald-900/30 border border-emerald-700/40 text-emerald-300 px-2.5 py-1 rounded-full text-xs">
            {s}
            <button type="button" onClick={() => removeService(i)} className="ml-0.5 text-emerald-500 hover:text-red-400 transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newService}
          onChange={e => setNewService(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addService()}
          placeholder="Add a service..."
          className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <button type="button" onClick={addService} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm">Add</button>
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineMapStep: React.FC = () => {
  const {
    isGreenfield,
    autoApprove,
    advanceStep,
    approveGate,
    rejectGate,
    reviseStep,
    toggleAutoApprove,
    getStepState,
    setStepStatus,
    activeMap,
  } = usePipeline();
  const { state, dispatch } = useAppState();

  // Merge per-map business_info overrides with global state (per-map takes precedence)
  const effectiveBusinessInfo = useMemo(() => {
    const mapBI = activeMap?.business_info;
    return mapBI ? { ...state.businessInfo, ...mapBI } : state.businessInfo;
  }, [state.businessInfo, activeMap?.business_info]);

  const stepState = getStepState('map_planning');
  const gate = stepState?.gate;

  // Load existing topics from the active map
  const existingTopics = activeMap?.topics ?? [];
  const existingCore = existingTopics.filter(t => t.type === 'core');
  const existingOuter = existingTopics.filter(t => t.type === 'outer');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingWaves, setIsGeneratingWaves] = useState(false);
  const [generatedCore, setGeneratedCore] = useState<EnrichedTopic[]>([]);
  const [generatedOuter, setGeneratedOuter] = useState<EnrichedTopic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mapQualityFindings, setMapQualityFindings] = useState<PreAnalysisFinding[]>([]);
  const [mapHealthScore, setMapHealthScore] = useState<number | null>(null);
  const [dismissedFindings, setDismissedFindings] = useState<Set<number>>(new Set());
  const [pageInventory, setPageInventory] = useState<PageInventory | null>(
    (activeMap?.page_inventory as PageInventory | undefined) ?? null
  );
  const [researchDepth, setResearchDepth] = useState<'ai_guess' | 'full_api'>(
    effectiveBusinessInfo.researchDepth || 'ai_guess'
  );

  // Services: Priority 1 = confirmed_services from DB, Priority 2 = businessInfo.offerings, Priority 3 = EAV extraction (last resort)
  const extractedServices = useMemo(() => {
    const eavs = activeMap?.eavs ?? [];
    const ce = activeMap?.pillars?.centralEntity ?? '';
    return extractServicesFromEavs(eavs, ce);
  }, [activeMap?.eavs, activeMap?.pillars?.centralEntity]);

  const effectiveOfferings = useMemo(() => {
    const mapBI = activeMap?.business_info;
    const offerings = mapBI?.offerings ?? state.businessInfo?.offerings;
    return Array.isArray(offerings) ? offerings.filter((o: any) => typeof o === 'string' && o.trim()) as string[] : [];
  }, [activeMap?.business_info, state.businessInfo?.offerings]);

  // Load from DB first; fall back to businessInfo.offerings; last resort = EAV extraction
  const [confirmedServices, setConfirmedServices] = useState<string[]>(() => {
    const persisted = activeMap?.confirmed_services;
    if (persisted && persisted.length > 0) return persisted;
    if (effectiveOfferings.length > 0) return effectiveOfferings;
    return extractedServices;
  });

  // Track the source for display purposes
  const servicesSource: 'confirmed' | 'offerings' | 'eavs' | 'manual' = useMemo(() => {
    const persisted = activeMap?.confirmed_services;
    if (persisted && persisted.length > 0) return 'confirmed';
    if (effectiveOfferings.length > 0) return 'offerings';
    if (extractedServices.length > 0) return 'eavs';
    return 'manual';
  }, [activeMap?.confirmed_services, effectiveOfferings, extractedServices]);

  // Track whether user has made local edits (to avoid overwriting with stale DB data)
  const hasLocalEditsRef = React.useRef(false);

  // Hydrate from persisted data when it becomes available (e.g. after async load)
  const persistedServices = activeMap?.confirmed_services;
  React.useEffect(() => {
    if (hasLocalEditsRef.current) return;
    // Priority 1: Persisted confirmed_services from DB
    if (persistedServices && persistedServices.length > 0) {
      setConfirmedServices(persistedServices);
      return;
    }
    // Priority 2: businessInfo.offerings from crawl step
    if (effectiveOfferings.length > 0) {
      setConfirmedServices(prev => prev.length === 0 ? effectiveOfferings : prev);
      return;
    }
    // Priority 3: EAV extraction — absolute last resort
    if (extractedServices.length > 0) {
      setConfirmedServices(prev => prev.length === 0 ? extractedServices : prev);
    }
  }, [persistedServices, effectiveOfferings, extractedServices]);

  // Debounced persistence of confirmed services to DB
  const saveServicesTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistConfirmedServices = useCallback((services: string[]) => {
    if (!state.activeMapId) return;
    hasLocalEditsRef.current = true; // Prevent hydration effect from overwriting user edits
    dispatch({
      type: 'UPDATE_MAP_DATA',
      payload: { mapId: state.activeMapId, data: { confirmed_services: services } },
    });
    if (saveServicesTimeoutRef.current) clearTimeout(saveServicesTimeoutRef.current);
    saveServicesTimeoutRef.current = setTimeout(async () => {
      try {
        const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
        const { error, count } = await supabase.from('topical_maps').update({ confirmed_services: services } as any).eq('id', state.activeMapId);
        if (error) {
          console.warn(`[MapStep] confirmed_services save failed (${error.code}): ${error.message}`);
        } else {
          console.info(`[MapStep] confirmed_services saved (${services.length} services)`);
        }
      } catch (err) {
        console.warn('[MapStep] confirmed_services save network error:', err);
      }
    }, 1000);
  }, [state.activeMapId, effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey, dispatch]);

  React.useEffect(() => () => {
    if (saveServicesTimeoutRef.current) clearTimeout(saveServicesTimeoutRef.current);
  }, []);

  // ──── Dialogue Engine state ────
  const [dialogueContext, setDialogueContext] = useState<DialogueContext>(
    ensureValidDialogueContext(activeMap?.dialogue_context)
  );
  const loadedDialogueCtx = activeMap?.dialogue_context ? ensureValidDialogueContext(activeMap.dialogue_context) : null;
  const [dialogueComplete, setDialogueComplete] = useState(
    loadedDialogueCtx?.map_planning?.status === 'complete' || loadedDialogueCtx?.map_planning?.status === 'skipped'
  );
  const [showDialogue, setShowDialogue] = useState(
    loadedDialogueCtx?.map_planning?.status === 'in_progress'
  );

  // J1: Adaptive display — summary when data exists, detail when adjusting
  const hasMapData = existingCore.length > 0;
  const [isAdjusting, setIsAdjusting] = useState(!hasMapData);

  const coreTopics = existingCore.length > 0 ? existingCore : generatedCore;
  const outerTopics = existingOuter.length > 0 ? existingOuter : generatedOuter;
  const totalTopics = coreTopics.length + outerTopics.length;

  // Count clusters (pillars)
  const clusterCount = coreTopics.filter(t => t.cluster_role === 'pillar').length;

  // Count internal links estimate (each spoke -> hub = 1 link, each hub -> spoke = max 15)
  const internalLinksEstimate = outerTopics.length * 2; // Each spoke has at least 2 links (to/from hub)

  const handleGenerateMap = async () => {
    const businessInfo = effectiveBusinessInfo;
    const pillars = activeMap?.pillars;

    if (!pillars?.centralEntity) {
      setError('Central Entity is required. Complete the Strategy step first.');
      return;
    }

    const eavs = activeMap?.eavs ?? [];
    const competitors = activeMap?.competitors ?? [];

    setError(null);
    setIsGenerating(true);
    setStepStatus('map_planning', 'in_progress');

    try {
      // Load crawled URLs early to enrich services with existing page data
      const crawledUrls: string[] =
        (activeMap?.analysis_state as any)?.crawl?.urls ??
        (activeMap?.analysis_state as any)?.discovery?.urls ??
        [];

      // Enrich services with existing page data for prompt context
      const servicesWithPages: ServiceWithPage[] | undefined =
        confirmedServices.length > 0
          ? matchServicesToExistingUrls(confirmedServices, crawledUrls)
          : undefined;

      const result = await generateInitialTopicalMap(
        businessInfo,
        pillars,
        eavs,
        competitors,
        dispatch,
        undefined, // serpIntel
        servicesWithPages
      );

      const { coreTopics: newCore, outerTopics: newOuter } = result;

      // Assign real UUIDs and map_id (AI returns temp IDs with map_id='')
      let resolvedTopics: EnrichedTopic[] = [...newCore, ...newOuter]; // fallback to raw if no activeMapId
      if (state.activeMapId && state.user) {
        const topicIdMap = new Map<string, string>(); // temp ID -> real UUID
        const finalTopics: EnrichedTopic[] = [];

        // Process core topics
        newCore.filter(t => t.title?.trim()).forEach(core => {
          const realId = uuidv4();
          topicIdMap.set(core.id, realId);
          finalTopics.push({
            ...core,
            id: realId,
            map_id: state.activeMapId!,
            slug: slugify(core.title),
            parent_topic_id: null,
            type: 'core',
            freshness: core.freshness || 'EVERGREEN',
          } as EnrichedTopic);
        });

        // Process outer topics (resolve parent temp IDs to real UUIDs)
        newOuter.filter(t => t.title?.trim()).forEach(outer => {
          const parentRealId = outer.parent_topic_id ? topicIdMap.get(outer.parent_topic_id) : null;
          const parentTopic = finalTopics.find(t => t.id === parentRealId);
          const parentSlug = parentTopic ? parentTopic.slug : '';
          finalTopics.push({
            ...outer,
            id: uuidv4(),
            map_id: state.activeMapId!,
            slug: `${parentSlug}/${cleanSlug(parentSlug, outer.title)}`.replace(/^\//, ''),
            parent_topic_id: parentRealId || null,
            type: 'outer',
            freshness: outer.freshness || 'STANDARD',
          } as EnrichedTopic);
        });

        setGeneratedCore(finalTopics.filter(t => t.type === 'core'));
        setGeneratedOuter(finalTopics.filter(t => t.type === 'outer'));
        resolvedTopics = finalTopics;

        // Update React state with properly ID'd topics
        dispatch({
          type: 'SET_TOPICS_FOR_MAP',
          payload: { mapId: state.activeMapId, topics: finalTopics },
        });

        // Save to topics table (canonical storage)
        try {
          const supabase = getSupabaseClient(
            businessInfo.supabaseUrl,
            businessInfo.supabaseAnonKey
          );

          // Delete existing topics for this map before inserting
          await supabase.from('topics').delete().eq('map_id', state.activeMapId);

          // Map to DB column format
          const dbTopics = finalTopics.map(t => ({
            id: t.id,
            map_id: state.activeMapId,
            user_id: state.user!.id,
            parent_topic_id: t.parent_topic_id,
            title: t.title,
            slug: t.slug,
            description: t.description,
            type: t.type,
            freshness: t.freshness,
            metadata: {
              topic_class: t.topic_class || (t.type === 'core' ? 'monetization' : 'informational'),
              cluster_role: t.cluster_role,
              attribute_focus: t.attribute_focus,
              canonical_query: t.canonical_query,
              rationale: (t.metadata as any)?.rationale || '',
              service_alignment: (t.metadata as any)?.service_alignment || '',
            },
          }));

          const insertResult = await verifiedBulkInsert(
            supabase,
            { table: 'topics', operationDescription: `insert ${dbTopics.length} pipeline topics` },
            dbTopics,
            'id'
          );

          if (!insertResult.success) {
            console.warn(`[PipelineMap] Topic save failed: ${insertResult.error}`);
          }
        } catch (err) {
          console.warn('[PipelineMap] Supabase topics save failed:', err);
        }
      } else {
        setGeneratedCore(newCore);
        setGeneratedOuter(newOuter);
      }

      // ── Match topics to existing site URLs before action plan generation ──
      if (crawledUrls.length > 0) {
        matchTopicsToExistingUrls(
          resolvedTopics,
          crawledUrls,
          (activeMap?.business_info as any)?.domain || state.businessInfo.domain
        );

        // Safety net: ensure services with existing pages appear as pillar topics
        if (servicesWithPages) {
          ensureExistingPagesArePillars(resolvedTopics, servicesWithPages);
        }
      }

      // Build page inventory from resolved topics (enrichment post-step)
      try {
        const { buildPageInventory } = await import('../../../services/ai/pageInventoryBuilder');
        const inventory = buildPageInventory(resolvedTopics, researchDepth);
        setPageInventory(inventory);

        // Persist page_inventory to topical_maps table
        if (state.activeMapId) {
          dispatch({ type: 'UPDATE_MAP_DATA', payload: { mapId: state.activeMapId, data: { page_inventory: inventory } } });
          try {
            const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
            const { error } = await supabase.from('topical_maps').update({ page_inventory: inventory } as any).eq('id', state.activeMapId);
            if (error) console.warn(`[PipelineMap] page_inventory save failed (${error.code}): ${error.message}`);
            else console.info(`[PipelineMap] page_inventory saved (${inventory.totalPages} pages, ${inventory.consolidationRatio}x consolidation)`);
          } catch (err) {
            console.warn('[PipelineMap] page_inventory save error:', err);
          }
        }
      } catch (err) {
        console.warn('[PipelineMapStep] Page inventory build failed (non-fatal):', err);
      }

      // Generate AI-driven publishing waves after topics are created
      // Use resolvedTopics which have real UUIDs (not temp IDs)
      if (pillars && resolvedTopics.length > 0) {
        setIsGeneratingWaves(true);
        try {
          const rationaleResult = await generateTopicRationales(
            resolvedTopics,
            effectiveBusinessInfo,
            pillars,
            activeMap?.eavs ?? [],
            dispatch
          );

          const newActionPlan: ActionPlan = {
            status: 'ready',
            entries: rationaleResult.rationales.map(r => ({
              topicId: r.topicId,
              actionType: r.actionType,
              priority: r.priority,
              wave: r.suggestedWave,
              rationale: r.rationale,
            })),
            waveDefinitions: rationaleResult.waveDefinitions,
            generatedAt: new Date().toISOString(),
          };

          // Update React state
          if (state.activeMapId) {
            dispatch({
              type: 'UPDATE_MAP_DATA',
              payload: { mapId: state.activeMapId, data: { action_plan: newActionPlan } },
            });

            // Persist to Supabase
            try {
              const supabase = getSupabaseClient(
                effectiveBusinessInfo.supabaseUrl,
                effectiveBusinessInfo.supabaseAnonKey
              );
              const { error } = await supabase
                .from('topical_maps')
                .update({ action_plan: newActionPlan } as any)
                .eq('id', state.activeMapId);
              if (error) console.warn(`[PipelineMap] Action plan save failed (${error.code}): ${error.message}`);
            } catch (err) {
              console.warn('[PipelineMap] Action plan save error:', err);
            }
          }
        } catch (err) {
          console.warn('[PipelineMap] Wave generation failed (non-fatal):', err);
        } finally {
          setIsGeneratingWaves(false);
        }
      }

      // ── Map Quality Gate ──
      // Run pre-analysis to detect critical issues before allowing advancement
      try {
        const allTopics = [...coreTopics, ...outerTopics];
        const analysis = runPreAnalysis(
          'map_planning',
          { topics: allTopics, eavs: activeMap?.eavs ?? [], confirmedServices },
          effectiveBusinessInfo
        );
        setMapQualityFindings(analysis.findings);
        setMapHealthScore(analysis.healthScore);

        const criticalFindings = analysis.findings.filter(f => f.severity === 'critical');
        if (criticalFindings.length > 0) {
          console.warn(`[PipelineMap] Map quality gate: ${criticalFindings.length} critical findings, health score: ${analysis.healthScore}`);
        }
      } catch (err) {
        console.warn('[PipelineMap] Map quality check failed (non-fatal):', err);
      }

      setStepStatus('map_planning', 'pending_approval');
      setShowDialogue(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Map generation failed';
      setError(message);
      setStepStatus('map_planning', 'in_progress');
    } finally {
      setIsGenerating(false);
    }
  };

  // ──── Dialogue Engine handlers ────

  const persistDialogueContext = useCallback(async (updated: DialogueContext) => {
    setDialogueContext(updated);
    if (state.activeMapId) {
      dispatch({ type: 'UPDATE_MAP_DATA', payload: { mapId: state.activeMapId, data: { dialogue_context: updated } } });
      try {
        const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
        const { error } = await supabase.from('topical_maps').update({ dialogue_context: updated } as any).eq('id', state.activeMapId);
        if (error) console.warn(`[MapStep] dialogue_context save failed (${error.code}): ${error.message}`);
      } catch { /* non-fatal */ }
    }
  }, [state.activeMapId, effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey, dispatch]);

  const handleDialogueDataExtracted = useCallback(async (data: ExtractedData) => {
    // Apply topic decisions from dialogue answers
    if (data.topicDecisions && state.activeMapId) {
      const decisions = data.topicDecisions as Record<string, any>;

      // Handle add_cluster: generate a new hub+spokes for a service
      if (decisions.add_cluster?.service) {
        try {
          const pillars = activeMap?.pillars;
          const eavs = activeMap?.eavs ?? [];
          if (pillars) {
            const allTopics = [...coreTopics, ...outerTopics];
            const { hub, spokes } = await generateSingleCluster(
              decisions.add_cluster.service,
              effectiveBusinessInfo,
              pillars,
              eavs,
              allTopics,
              dispatch
            );
            // Merge into state
            setGeneratedCore(prev => [...prev, hub]);
            setGeneratedOuter(prev => [...prev, ...spokes]);
            if (state.activeMapId) {
              dispatch({
                type: 'SET_TOPICS_FOR_MAP',
                payload: { mapId: state.activeMapId, topics: [...allTopics, hub, ...spokes] },
              });
            }
          }
        } catch (err) {
          console.warn('[PipelineMap] Cluster generation failed:', err);
        }
      }

      // Handle remove_topic
      if (decisions.remove_topic?.topicId) {
        const removeId = decisions.remove_topic.topicId;
        setGeneratedCore(prev => prev.filter(t => t.id !== removeId));
        setGeneratedOuter(prev => prev.filter(t => t.id !== removeId && t.parent_topic_id !== removeId));
        // Persist deletion to topics table
        try {
          const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
          // Delete the topic and its children (outer topics referencing it)
          const { error: childErr } = await supabase.from('topics').delete().eq('parent_topic_id', removeId);
          if (childErr) console.warn(`[PipelineMap] Child topic delete failed: ${childErr.message}`);
          const { error } = await supabase.from('topics').delete().eq('id', removeId);
          if (error) console.warn(`[PipelineMap] Topic delete failed: ${error.message}`);
        } catch (err) {
          console.warn('[PipelineMap] Topic delete error:', err);
        }
      }

      // Handle rename_topic
      if (decisions.rename_topic?.topicId && decisions.rename_topic?.newTitle) {
        const { topicId, newTitle } = decisions.rename_topic;
        const updateTitle = (topics: EnrichedTopic[]) =>
          topics.map(t => t.id === topicId ? { ...t, title: newTitle } : t);
        setGeneratedCore(updateTitle);
        setGeneratedOuter(updateTitle);
        // Persist rename to topics table
        try {
          const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
          const { error } = await supabase.from('topics').update({ title: newTitle }).eq('id', topicId);
          if (error) console.warn(`[PipelineMap] Topic rename failed: ${error.message}`);
        } catch (err) {
          console.warn('[PipelineMap] Topic rename error:', err);
        }
      }
    }

    // Update questionsAnswered (uses functional updater to avoid stale closure)
    setDialogueContext(prev => {
      const mp = prev.map_planning ?? { answers: [], status: 'pending', questionsGenerated: 0, questionsAnswered: 0 };
      const updated = { ...prev, map_planning: { ...mp, status: 'in_progress' as const, questionsAnswered: (mp.questionsAnswered ?? 0) + 1 } };
      persistDialogueContext(updated);
      return updated;
    });
  }, [state.activeMapId, activeMap?.pillars, activeMap?.eavs, effectiveBusinessInfo, coreTopics, outerTopics, dispatch, persistDialogueContext]);

  // Push confirmed answer to dialogue_context.answers[]
  const handleAnswerConfirmed = useCallback((answer: import('../../../types/dialogue').DialogueAnswer) => {
    setDialogueContext(prev => {
      const mp = prev.map_planning ?? { answers: [], status: 'pending', questionsGenerated: 0, questionsAnswered: 0 };
      const updated = { ...prev, map_planning: { ...mp, answers: [...(mp.answers ?? []), answer] } };
      persistDialogueContext(updated);
      return updated;
    });
  }, [persistDialogueContext]);

  const handleDialogueComplete = useCallback(() => {
    setDialogueComplete(true);
    setDialogueContext(prev => {
      const mp = prev.map_planning ?? { answers: [], status: 'pending', questionsGenerated: 0, questionsAnswered: 0 };
      const updated = { ...prev, map_planning: { ...mp, status: 'complete' as const } };
      persistDialogueContext(updated);
      return updated;
    });
  }, [persistDialogueContext]);

  const handleCascadeAction = useCallback((_action: 'update_all' | 'review' | 'cancel', _impact: CascadeImpact) => {
    // Map planning cascade actions — handled by regeneration
  }, []);

  // Inline topic rename handler
  const handleTopicRename = useCallback((topicId: string, newTitle: string) => {
    const updateTitle = (topics: EnrichedTopic[]) =>
      topics.map(t => t.id === topicId ? { ...t, title: newTitle } : t);
    setGeneratedCore(updateTitle);
    setGeneratedOuter(updateTitle);
    // Also update in Redux state
    if (state.activeMapId) {
      const allTopics = [...coreTopics, ...outerTopics].map(t =>
        t.id === topicId ? { ...t, title: newTitle } : t
      );
      dispatch({ type: 'SET_TOPICS_FOR_MAP', payload: { mapId: state.activeMapId, topics: allTopics } });
    }
    // Persist rename to topics table
    try {
      const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
      supabase.from('topics').update({ title: newTitle }).eq('id', topicId)
        .then(({ error }) => { if (error) console.warn(`[PipelineMap] Inline rename failed: ${error.message}`); });
    } catch (err) {
      console.warn('[PipelineMap] Inline rename error:', err);
    }
  }, [coreTopics, outerTopics, state.activeMapId, dispatch, effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey]);

  // Stable allTopics for page inventory handlers
  const allTopics = useMemo(() => [...coreTopics, ...outerTopics], [coreTopics, outerTopics]);

  const rebuildPageInventory = useCallback(async (topics: EnrichedTopic[]) => {
    try {
      const { buildPageInventory } = await import('../../../services/ai/pageInventoryBuilder');
      const inv = buildPageInventory(topics, researchDepth);
      setPageInventory(inv);

      // Persist updated page_inventory to DB
      if (state.activeMapId) {
        dispatch({ type: 'UPDATE_MAP_DATA', payload: { mapId: state.activeMapId, data: { page_inventory: inv } } });
        try {
          const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
          const { error } = await supabase.from('topical_maps').update({ page_inventory: inv } as any).eq('id', state.activeMapId);
          if (error) console.warn(`[PipelineMap] page_inventory rebuild save failed (${error.code}): ${error.message}`);
        } catch { /* non-fatal */ }
      }
    } catch (err) {
      console.warn('[PipelineMapStep] Page inventory rebuild failed:', err);
    }
  }, [researchDepth, state.activeMapId, dispatch, effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey]);

  const handlePromoteTopic = useCallback((topicId: string) => {
    const topic = allTopics.find(t => t.id === topicId);
    if (!topic) return;

    const updateTopics = (topics: EnrichedTopic[]) =>
      topics.map(t => t.id === topicId ? { ...t, page_decision: 'standalone_page' as const, consolidation_target_id: null } : t);
    setGeneratedCore(updateTopics);
    setGeneratedOuter(updateTopics);

    if (state.activeMapId) {
      const updated = allTopics.map(t =>
        t.id === topicId ? { ...t, page_decision: 'standalone_page' as const, consolidation_target_id: null } : t
      );
      dispatch({ type: 'SET_TOPICS_FOR_MAP', payload: { mapId: state.activeMapId, topics: updated } });
      rebuildPageInventory(updated);

      // Persist page_decision to topics table
      try {
        const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
        supabase.from('topics').update({ page_decision: 'standalone_page', consolidation_target_id: null }).eq('id', topicId)
          .then(({ error }) => { if (error) console.warn(`[PipelineMap] Promote topic failed: ${error.message}`); });
      } catch { /* non-fatal */ }
    }
  }, [allTopics, state.activeMapId, dispatch, rebuildPageInventory, effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey]);

  const handleDemoteTopic = useCallback((topicId: string) => {
    const topic = allTopics.find(t => t.id === topicId);
    if (!topic) return;

    // Find nearest parent that is standalone
    const parent = allTopics.find(t => t.id === topic.parent_topic_id && t.page_decision === 'standalone_page');

    const updateTopics = (topics: EnrichedTopic[]) =>
      topics.map(t => t.id === topicId ? { ...t, page_decision: 'section' as const, consolidation_target_id: parent?.id || null } : t);
    setGeneratedCore(updateTopics);
    setGeneratedOuter(updateTopics);

    if (state.activeMapId) {
      const updated = allTopics.map(t =>
        t.id === topicId ? { ...t, page_decision: 'section' as const, consolidation_target_id: parent?.id || null } : t
      );
      dispatch({ type: 'SET_TOPICS_FOR_MAP', payload: { mapId: state.activeMapId, topics: updated } });
      rebuildPageInventory(updated);

      // Persist page_decision to topics table
      try {
        const supabase = getSupabaseClient(effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey);
        supabase.from('topics').update({ page_decision: 'section', consolidation_target_id: parent?.id || null }).eq('id', topicId)
          .then(({ error }) => { if (error) console.warn(`[PipelineMap] Demote topic failed: ${error.message}`); });
      } catch { /* non-fatal */ }
    }
  }, [allTopics, state.activeMapId, dispatch, rebuildPageInventory, effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey]);

  // Dismiss a finding and recalculate health score
  const handleDismissFinding = useCallback((findingIndex: number) => {
    setDismissedFindings(prev => {
      const next = new Set(prev);
      next.add(findingIndex);
      // Recalculate health score from remaining findings
      const activeFindings = (mapQualityFindings || []).filter((_, idx) => !next.has(idx));
      setMapHealthScore(activeFindings.length > 0 ? calculateHealthScore(activeFindings) : 100);
      return next;
    });
  }, [mapQualityFindings]);

  // Convert pre-analysis findings to actionable findings format
  const actionableFindings: ActionableFinding[] = useMemo(() => {
    return (mapQualityFindings || [])
      .map((f, idx) => ({ f, idx }))
      .filter(({ idx }) => !dismissedFindings.has(idx))
      .map(({ f, idx }) => {
      const actions: FindingAction[] = [];
      switch (f.category) {
        case 'title_cannibalization':
          actions.push({ label: 'Merge', variant: 'primary' as const, onClick: () => handleMergeFinding(f) });
          break;
        case 'page_worthiness':
          actions.push({ label: 'Consolidate', variant: 'primary' as const, onClick: () => handleConsolidateFinding(f) });
          break;
        case 'border_violation':
          actions.push({ label: 'Remove', variant: 'danger' as const, onClick: () => handleRemoveFinding(f) });
          actions.push({ label: 'Bridge', variant: 'secondary' as const, onClick: () => {} });
          break;
        case 'missing_frame':
          actions.push({ label: 'Dismiss', variant: 'secondary' as const, onClick: () => handleDismissFinding(idx) });
          break;
        case 'depth_imbalance':
          actions.push({ label: 'Dismiss', variant: 'secondary' as const, onClick: () => handleDismissFinding(idx) });
          break;
        case 'service_gap':
          actions.push({ label: 'Dismiss', variant: 'secondary' as const, onClick: () => handleDismissFinding(idx) });
          break;
        case 'eav_inconsistency':
        case 'eav_category_gap':
        case 'eav_pending_values':
        case 'ce_ambiguity':
        case 'sc_specificity':
        case 'csi_coverage':
          actions.push({ label: 'Dismiss', variant: 'secondary' as const, onClick: () => handleDismissFinding(idx) });
          break;
      }
      return {
        category: f.category,
        severity: f.severity,
        title: f.title,
        details: f.suggestedAction || f.details || '',
        affectedItems: f.affectedItems || [],
        actions,
      };
    });
  }, [mapQualityFindings, dismissedFindings, handleDismissFinding]);

  const handleMergeFinding = useCallback((finding: PreAnalysisFinding) => {
    // Merge first two affected items — keep the first, remove the second
    const items = finding.affectedItems || [];
    if (items.length < 2) return;
    const removeTitle = items[1];
    const removeTarget = allTopics.find(t => t.title === removeTitle);
    if (removeTarget) {
      setGeneratedCore(prev => prev.filter(t => t.id !== removeTarget.id));
      setGeneratedOuter(prev => prev.filter(t => t.id !== removeTarget.id && t.parent_topic_id !== removeTarget.id));
    }
  }, [allTopics]);

  const handleConsolidateFinding = useCallback((finding: PreAnalysisFinding) => {
    const items = finding.affectedItems || [];
    if (items.length === 0) return;
    const target = allTopics.find(t => t.title === items[0]);
    if (target) {
      handleDemoteTopic(target.id);
    }
  }, [allTopics, handleDemoteTopic]);

  const handleRemoveFinding = useCallback((finding: PreAnalysisFinding) => {
    const items = finding.affectedItems || [];
    if (items.length === 0) return;
    const target = allTopics.find(t => t.title === items[0]);
    if (target) {
      setGeneratedCore(prev => prev.filter(t => t.id !== target.id));
      setGeneratedOuter(prev => prev.filter(t => t.id !== target.id && t.parent_topic_id !== target.id));
    }
  }, [allTopics]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Content Plan</h2>
        <p className="text-sm text-gray-400 mt-1">
          Your content organized into hub topics with internal linking and publishing strategy
        </p>
      </div>

      {/* Prerequisite check */}
      {!activeMap?.pillars?.centralEntity && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-amber-300">
            Complete the Strategy step first — Central Entity and pillars are required to generate a topical map.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Generating progress */}
      {isGenerating && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="animate-spin w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-blue-300">Generating topical map with AI — this may take a moment...</p>
        </div>
      )}

      {/* Service Confirmation — shown before first generation or when adjusting */}
      {(isAdjusting || !hasMapData) && activeMap?.pillars?.centralEntity && (
        <ServiceConfirmationPanel
          services={confirmedServices}
          source={servicesSource}
          onServicesChange={(services) => {
            setConfirmedServices(services);
            persistConfirmedServices(services);
          }}
        />
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Hub Topics" value={clusterCount} color={clusterCount > 0 ? 'blue' : 'gray'} />
        <MetricCard label="Total Pages" value={totalTopics} color={totalTopics > 0 ? 'green' : 'gray'} />
        <MetricCard label="Internal Links" value={internalLinksEstimate > 0 ? `~${internalLinksEstimate}` : 0} color={internalLinksEstimate > 0 ? 'amber' : 'gray'} />
      </div>

      {/* Page Inventory View — shown when enrichment has produced page decisions */}
      {pageInventory && (
        <PageInventoryView
          pageInventory={pageInventory}
          topics={allTopics}
          onPromoteTopic={handlePromoteTopic}
          onDemoteTopic={handleDemoteTopic}
        />
      )}

      {/* Review: Content Structure (Decision 6 — cluster cards primary, tree toggle) */}
      <ClusterCardsView
        coreTopics={coreTopics}
        outerTopics={outerTopics}
        contentAreas={activeMap?.pillars?.contentAreas}
      />

      {/* J1: Adaptive display — Adjust button in summary mode */}
      {!isAdjusting && hasMapData && totalTopics > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setIsAdjusting(true)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 px-5 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
            </svg>
            Modify Content Plan
          </button>
        </div>
      )}

      {/* Detail sections — only shown when adjusting or no data */}
      {isAdjusting && (<>
      {/* Review: URL Slugs */}
      {totalTopics > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">All Pages</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopicList topics={coreTopics} label="Hub Pages (main hub topic pages)" allCoreTopics={coreTopics} onRename={handleTopicRename} />
            <TopicList topics={outerTopics} label="Articles (supporting pages)" allCoreTopics={coreTopics} onRename={handleTopicRename} />
          </div>
        </div>
      )}

      {/* Review: Link Architecture */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">Linking Strategy</p>
        <LinkingFlowDiagram coreTopics={coreTopics} outerTopics={outerTopics} />
      </div>

      {/* Review: Anchor Text Strategy (M2) */}
      <AnchorTextStrategyCard coreTopics={coreTopics} contentAreas={activeMap?.pillars?.contentAreas} />

      {/* Review: Contextual Bridges (M3 enhanced) */}
      <ContextualBridgesPanel coreTopics={coreTopics} eavs={activeMap?.eavs ?? []} contentAreas={activeMap?.pillars?.contentAreas} />

      {/* M5: Existing page mapping (migration only) */}
      {!isGreenfield && totalTopics > 0 && (
        <ExistingPageMappingPanel
          topics={[...coreTopics, ...outerTopics]}
          domain={activeMap?.business_info?.domain || state.businessInfo.domain}
          pagesFound={(activeMap?.business_info as any)?.pagesFound}
          crawledUrls={(activeMap?.analysis_state as any)?.crawl?.urls ?? (activeMap?.analysis_state as any)?.discovery?.urls}
        />
      )}

      {/* Review: Publishing Waves */}
      <PublishingWavesPanel
        coreTopics={coreTopics}
        outerTopics={outerTopics}
        actionPlan={activeMap?.action_plan}
        isGeneratingWaves={isGeneratingWaves}
      />

      {/* Research Depth Toggle */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-gray-600">Research:</span>
        <button
          type="button"
          onClick={() => setResearchDepth('ai_guess')}
          className={`px-3 py-1 text-xs rounded-l border ${researchDepth === 'ai_guess' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-300'}`}
        >
          AI Guess (free)
        </button>
        <button
          type="button"
          onClick={() => setResearchDepth('full_api')}
          className={`px-3 py-1 text-xs rounded-r border-t border-b border-r ${researchDepth === 'full_api' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-300'}`}
        >
          Full API (~${(allTopics.length * 0.005).toFixed(2)})
        </button>
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleGenerateMap}
          disabled={isGenerating || !activeMap?.pillars?.centralEntity}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2"
        >
          {isGenerating && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isGenerating
            ? 'Generating...'
            : totalTopics > 0
              ? 'Regenerate Topical Map'
              : 'Generate Topical Map'}
        </button>
      </div>
      </>)}

      {/* Intelligent Dialogue — Q&A before approval */}
      {showDialogue && !dialogueComplete && totalTopics > 0 && (
        <StepDialogue
          step="map_planning"
          stepOutput={{ topics: [...coreTopics, ...outerTopics], clusters: clusterCount, eavs: activeMap?.eavs ?? [], confirmedServices }}
          businessInfo={effectiveBusinessInfo}
          dialogueContext={dialogueContext}
          onDataExtracted={handleDialogueDataExtracted}
          onDialogueComplete={handleDialogueComplete}
          onCascadeAction={handleCascadeAction}
          onAnswerConfirmed={handleAnswerConfirmed}
        />
      )}

      {/* Map Quality Gate — show critical findings that block advancement */}
      {mapHealthScore !== null && actionableFindings.length > 0 && (
        <div className={`border rounded-lg p-4 space-y-3 ${
          mapHealthScore < 60
            ? 'bg-red-900/15 border-red-700/50'
            : mapHealthScore < 80
            ? 'bg-amber-900/15 border-amber-700/50'
            : 'bg-green-900/15 border-green-700/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${
                mapHealthScore < 60 ? 'text-red-300' :
                mapHealthScore < 80 ? 'text-amber-300' : 'text-green-300'
              }`}>
                Map Health: {mapHealthScore}%
              </span>
              {mapHealthScore < 60 && (
                <span className="text-[9px] bg-red-600/20 text-red-300 border border-red-500/30 rounded px-1.5 py-0.5">
                  Blocked — resolve critical issues
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500">{actionableFindings.length} findings</span>
          </div>
          <ActionableFindingsPanel findings={actionableFindings} />
        </div>
      )}

      {/* Approval Gate (gated on dialogue completion + map quality) */}
      {gate && (dialogueComplete || !showDialogue) && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
        <ApprovalGate
          step="map_planning"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove && (mapHealthScore === null || mapHealthScore >= 60)}
          onApprove={() => approveGate('map_planning')}
          onReject={(reason) => rejectGate('map_planning', reason)}
          onRevise={() => reviseStep('map_planning')}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Hub Topics', value: clusterCount, color: clusterCount > 0 ? 'green' : 'gray' },
            { label: 'Total Pages', value: pageInventory ? pageInventory.totalPages : totalTopics, color: (pageInventory ? pageInventory.totalPages : totalTopics) > 0 ? 'green' : 'gray' },
            { label: pageInventory ? 'Consolidation' : 'Internal Links', value: pageInventory ? `${pageInventory.consolidationRatio.toFixed(1)}x` : (internalLinksEstimate > 0 ? `~${internalLinksEstimate}` : 0), color: pageInventory ? 'blue' : (internalLinksEstimate > 0 ? 'amber' : 'gray') },
            { label: 'Map Health', value: mapHealthScore !== null ? `${mapHealthScore}%` : '--', color: mapHealthScore !== null ? (mapHealthScore >= 80 ? 'green' : mapHealthScore >= 60 ? 'amber' : 'red') : 'gray' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineMapStep;
