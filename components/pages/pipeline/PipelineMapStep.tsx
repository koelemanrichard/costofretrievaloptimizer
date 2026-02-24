import React, { useState, useMemo, useCallback } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import StepDialogue from '../../pipeline/StepDialogue';
import { generateInitialTopicalMap } from '../../../services/ai/mapGeneration';
import type { EnrichedTopic, SemanticTriple } from '../../../types';
import type { DialogueContext, ExtractedData, CascadeImpact } from '../../../types/dialogue';
import { createEmptyDialogueContext } from '../../../services/ai/dialogueEngine';
import { getSupabaseClient } from '../../../services/supabaseClient';

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
                      <div key={spoke.id} className="flex items-center gap-2 py-1 pl-3">
                        <div className="w-3 h-3 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-[7px] font-semibold text-blue-300">S</span>
                        </div>
                        <span className="text-[11px] text-gray-400 truncate">{spoke.title}</span>
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

function PublishingWavesPanel({ coreTopics, outerTopics }: {
  coreTopics: EnrichedTopic[];
  outerTopics: EnrichedTopic[];
}) {
  const [expandedWaves, setExpandedWaves] = useState<Record<number, boolean>>({});

  // Classify topics into waves based on topic_class.
  // topic_class is typed as 'monetization' | 'informational' but may carry
  // additional legacy string values at runtime; cast for flexible comparisons.
  const allTopics = [...coreTopics, ...outerTopics];
  const wave1 = allTopics.filter(t => t.topic_class === 'monetization');
  const wave2 = allTopics.filter(t => t.topic_class === 'informational');
  // Outer topics without a classified topic_class fall into wave 3/4 buckets
  const wave3 = allTopics.filter(t => !t.topic_class && t.type === 'outer').slice(0, Math.ceil(allTopics.length / 4));
  const wave4 = allTopics.filter(t => !t.topic_class && t.type === 'outer').slice(Math.ceil(allTopics.length / 4));

  const waves = [
    {
      number: 1,
      name: 'Wave 1: Your Services (revenue)',
      description: 'Publish these first — they directly serve customers searching for your services and drive conversions.',
      action: 'After publishing: submit URLs to Google Search Console, add internal links from your homepage.',
      improvement: 'These pages will be strengthened in Wave 2 when knowledge content links back to them.',
      color: 'border-emerald-500/50 bg-emerald-900/10',
      count: wave1.length,
      topics: wave1,
    },
    {
      number: 2,
      name: 'Wave 2: Knowledge Content',
      description: 'Informational content that supports your service pages and builds topical depth.',
      action: 'After publishing: add contextual links from these pages to your Wave 1 service pages.',
      improvement: 'Expect Wave 1 ranking improvements within 4-6 weeks as authority flows from these pages.',
      color: 'border-blue-500/50 bg-blue-900/10',
      count: wave2.length,
      topics: wave2,
    },
    {
      number: 3,
      name: 'Wave 3: Regional Pages',
      description: 'Location-specific content for geographic targeting and local search visibility.',
      action: 'After publishing: update Google Business Profiles with links to these regional pages.',
      improvement: 'Regional pages target local search queries and strengthen geographic relevance.',
      color: 'border-amber-500/50 bg-amber-900/10',
      count: wave3.length,
      topics: wave3,
    },
    {
      number: 4,
      name: 'Wave 4: Authority Content',
      description: 'Expertise-building pages that establish your authority and strengthen all other content.',
      action: 'After publishing: share on professional networks and link from author bio pages.',
      improvement: 'These pages complete your topical authority and improve E-E-A-T signals across the entire site.',
      color: 'border-sky-500/50 bg-sky-900/10',
      count: wave4.length,
      topics: wave4,
    },
  ];

  const total = coreTopics.length + outerTopics.length;
  const WAVE_INITIAL = 8;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Publishing Strategy</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {waves.map((wave) => {
          const percent = total > 0 ? Math.round((wave.count / total) * 100) : 0;
          const isExpanded = expandedWaves[wave.number] ?? false;
          const visibleTopics = isExpanded ? wave.topics : wave.topics.slice(0, WAVE_INITIAL);
          const hiddenCount = wave.topics.length - WAVE_INITIAL;

          return (
            <div
              key={wave.number}
              className={`border rounded-lg p-4 ${wave.color}`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-200">{wave.name}</h4>
                <span className="text-xs text-gray-400">{wave.count} pages</span>
              </div>
              <p className="text-xs text-gray-400">{wave.description}</p>
              {wave.count > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] text-blue-400/80">
                    <span className="font-medium">Action:</span> {wave.action}
                  </p>
                  <p className="text-[10px] text-gray-500 italic">{wave.improvement}</p>
                </div>
              )}
              <div className="mt-3">
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div className="bg-gray-500 h-1.5 rounded-full" style={{ width: `${percent}%` }} />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {wave.count > 0 ? `${wave.count} pages assigned` : 'Not started'}
                </p>
              </div>

              {/* Expandable topic list */}
              {wave.topics.length > 0 && (
                <div className="mt-3 border-t border-gray-700/40 pt-2">
                  <button
                    type="button"
                    onClick={() => setExpandedWaves(prev => ({ ...prev, [wave.number]: !prev[wave.number] }))}
                    className="text-[11px] text-blue-400 hover:text-blue-300 mb-1.5 flex items-center gap-1"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    {isExpanded ? 'Hide pages' : `Show ${wave.topics.length} pages`}
                  </button>
                  {(isExpanded || visibleTopics.length <= WAVE_INITIAL) && isExpanded && (
                    <div className="space-y-1">
                      {visibleTopics.map(t => (
                        <div key={t.id} className="text-[11px] text-gray-400 py-0.5 pl-1">
                          <span className="truncate block">{t.title}</span>
                          {t.slug && (
                            <span className="text-[10px] text-gray-600 font-mono block truncate">/{t.slug}</span>
                          )}
                        </div>
                      ))}
                      {!isExpanded && hiddenCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedWaves(prev => ({ ...prev, [wave.number]: true }))}
                          className="text-[10px] text-blue-400 hover:text-blue-300 pl-1"
                        >
                          Show {hiddenCount} more
                        </button>
                      )}
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

function TopicList({ topics, label, allCoreTopics }: {
  topics: EnrichedTopic[];
  label: string;
  allCoreTopics?: EnrichedTopic[];
}) {
  const [expanded, setExpanded] = useState(false);
  const display = expanded ? topics : topics.slice(0, 5);

  // Build a lookup for parent hub names
  const hubNameById = (allCoreTopics ?? []).reduce<Record<string, string>>((acc, t) => {
    if (t.cluster_role === 'pillar') acc[t.id] = t.title;
    return acc;
  }, {});

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
          return (
            <div key={i} className="bg-gray-900 rounded px-3 py-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  t.cluster_role === 'pillar' ? 'bg-purple-400' : 'bg-blue-400'
                }`} />
                <span className="truncate">{t.title}</span>
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
  const [generatedCore, setGeneratedCore] = useState<EnrichedTopic[]>([]);
  const [generatedOuter, setGeneratedOuter] = useState<EnrichedTopic[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ──── Dialogue Engine state ────
  const [dialogueContext, setDialogueContext] = useState<DialogueContext>(
    (activeMap?.dialogue_context as DialogueContext) || createEmptyDialogueContext()
  );
  const loadedDialogueCtx = (activeMap?.dialogue_context as DialogueContext) || null;
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
      const result = await generateInitialTopicalMap(
        businessInfo,
        pillars,
        eavs,
        competitors,
        dispatch
      );

      const { coreTopics: newCore, outerTopics: newOuter } = result;

      setGeneratedCore(newCore);
      setGeneratedOuter(newOuter);

      // Persist to state and Supabase
      if (state.activeMapId) {
        const allTopics = [...newCore, ...newOuter];
        dispatch({
          type: 'UPDATE_MAP_DATA',
          payload: {
            mapId: state.activeMapId,
            data: { topics: allTopics },
          },
        });

        try {
          const supabase = getSupabaseClient(
            businessInfo.supabaseUrl,
            businessInfo.supabaseAnonKey
          );
          await supabase
            .from('topical_maps')
            .update({ topics: allTopics } as any)
            .eq('id', state.activeMapId);
        } catch (err) {
          console.warn('[MapGeneration] Supabase save failed:', err);
        }
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
        await supabase.from('topical_maps').update({ dialogue_context: updated } as any).eq('id', state.activeMapId);
      } catch { /* non-fatal */ }
    }
  }, [state.activeMapId, effectiveBusinessInfo.supabaseUrl, effectiveBusinessInfo.supabaseAnonKey, dispatch]);

  const handleDialogueDataExtracted = useCallback((data: ExtractedData) => {
    // Apply topic decisions from dialogue answers
    if (data.topicDecisions && state.activeMapId) {
      // Topic decisions are textual — for now store as raw insight for manual processing
      // Future: implement merge/split/add topic operations
    }

    // Add new topics if any
    if (data.rawInsight) {
      // Store the insight for future topic generation refinement
    }

    // Update questionsAnswered (uses functional updater to avoid stale closure)
    setDialogueContext(prev => {
      const updated = { ...prev, map_planning: { ...prev.map_planning, status: 'in_progress' as const, questionsAnswered: prev.map_planning.questionsAnswered + 1 } };
      persistDialogueContext(updated);
      return updated;
    });
  }, [state.activeMapId, persistDialogueContext]);

  // Push confirmed answer to dialogue_context.answers[]
  const handleAnswerConfirmed = useCallback((answer: import('../../../types/dialogue').DialogueAnswer) => {
    setDialogueContext(prev => {
      const updated = { ...prev, map_planning: { ...prev.map_planning, answers: [...prev.map_planning.answers, answer] } };
      persistDialogueContext(updated);
      return updated;
    });
  }, [persistDialogueContext]);

  const handleDialogueComplete = useCallback(() => {
    setDialogueComplete(true);
    setDialogueContext(prev => {
      const updated = { ...prev, map_planning: { ...prev.map_planning, status: 'complete' as const } };
      persistDialogueContext(updated);
      return updated;
    });
  }, [persistDialogueContext]);

  const handleCascadeAction = useCallback((_action: 'update_all' | 'review' | 'cancel', _impact: CascadeImpact) => {
    // Map planning cascade actions — handled by regeneration
  }, []);

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

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Hub Topics" value={clusterCount} color={clusterCount > 0 ? 'blue' : 'gray'} />
        <MetricCard label="Total Pages" value={totalTopics} color={totalTopics > 0 ? 'green' : 'gray'} />
        <MetricCard label="Internal Links" value={internalLinksEstimate > 0 ? `~${internalLinksEstimate}` : 0} color={internalLinksEstimate > 0 ? 'amber' : 'gray'} />
      </div>

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
            <TopicList topics={coreTopics} label="Hub Pages (main hub topic pages)" allCoreTopics={coreTopics} />
            <TopicList topics={outerTopics} label="Articles (supporting pages)" allCoreTopics={coreTopics} />
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
      <PublishingWavesPanel coreTopics={coreTopics} outerTopics={outerTopics} />

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
          stepOutput={{ topics: [...coreTopics, ...outerTopics], clusters: clusterCount }}
          businessInfo={effectiveBusinessInfo}
          dialogueContext={dialogueContext}
          onDataExtracted={handleDialogueDataExtracted}
          onDialogueComplete={handleDialogueComplete}
          onCascadeAction={handleCascadeAction}
          onAnswerConfirmed={handleAnswerConfirmed}
        />
      )}

      {/* Approval Gate (gated on dialogue completion) */}
      {gate && (dialogueComplete || !showDialogue) && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
        <ApprovalGate
          step="map_planning"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => approveGate('map_planning')}
          onReject={(reason) => rejectGate('map_planning', reason)}
          onRevise={() => reviseStep('map_planning')}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Hub Topics', value: clusterCount, color: clusterCount > 0 ? 'green' : 'gray' },
            { label: 'Total Pages', value: totalTopics, color: totalTopics > 0 ? 'green' : 'gray' },
            { label: 'Internal Links', value: internalLinksEstimate > 0 ? `~${internalLinksEstimate}` : 0, color: internalLinksEstimate > 0 ? 'amber' : 'gray' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineMapStep;
