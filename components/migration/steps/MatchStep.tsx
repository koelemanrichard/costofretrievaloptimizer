import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { SiteInventoryItem, EnrichedTopic } from '../../../types';
import { useAutoMatch } from '../../../hooks/useAutoMatch';
import type { MatchResult, GapTopic, MatchSignal } from '../../../services/migration/AutoMatchService';
import {
  classifyUrl,
  getCategoryLabel,
  getCategoryColor,
  detectLanguageFromUrl,
  type UrlCategory,
  type DetectedLanguage,
} from '../../../utils/urlClassifier';
import { TopicAssignmentModal } from '../TopicAssignmentModal';

// ── Props ──────────────────────────────────────────────────────────────────

interface MatchStepProps {
  projectId: string;
  mapId: string;
  inventory: SiteInventoryItem[];
  topics: EnrichedTopic[];
  onComplete: () => void;
  onRefreshInventory: () => void;
  onCreateTopic?: (data: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>, placement: string) => Promise<EnrichedTopic | undefined>;
}

// ── Filter tabs ────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'matched' | 'orphans' | 'gaps' | 'cannibalization';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'matched', label: 'Matched' },
  { key: 'orphans', label: 'Orphans' },
  { key: 'gaps', label: 'Gaps' },
  { key: 'cannibalization', label: 'Cannibalization' },
];

// ── Enriched match type ────────────────────────────────────────────────────

interface EnrichedMatch extends MatchResult {
  inv: SiteInventoryItem | undefined;
  topic: EnrichedTopic | null;
  urlCategory: UrlCategory;
  language: DetectedLanguage | null;
  pageTitle: string | null;
  clicks: number;
  auditScore: number | null;
}

// ── Static guidance per category ───────────────────────────────────────────

const CATEGORY_GUIDANCE: Record<UrlCategory, string> = {
  pagination: 'Pagination pages rarely need migration. Safe to reject unless they have significant backlinks.',
  media: "Media files don't need topic matching. Keep if they have backlinks or traffic.",
  legal: "Legal/utility pages are structural. They'll get KEEP in the Plan step.",
  category: 'Category/tag pages often have thin content. Keep if they drive traffic.',
  content: 'Content pages without a topic match may need new topics added to your map.',
  product: 'Product pages without a match may need new topics or may be outdated offerings.',
  uncategorized: "Couldn't be auto-categorized. Review individually.",
};

// ── Tab context banner content ─────────────────────────────────────────────

const TAB_BANNERS: Record<string, { title: string; body: string; actions?: string[] }> = {
  orphans: {
    title: 'What are orphan pages?',
    body: "Orphan pages have no matching topic in your topical map. Use the link icon to assign a topic or create a new one. Unassigned orphans with traffic get REDIRECT in the Plan step, decent quality gets KEEP, low-quality no-traffic gets PRUNE.",
    actions: [
      'Assign (link icon): Assign an existing topic or create a new one.',
      'Keep (default): Leave in the dataset \u2014 the Plan step decides based on traffic/quality.',
      'Reject (X): Remove from migration planning entirely.',
    ],
  },
  cannibalization: {
    title: 'What is cannibalization?',
    body: 'Multiple URLs matched the same topic above 30% confidence. Google may be confused about which page to rank, diluting your authority. In the Plan step, the strongest page becomes the MERGE target and weaker pages get REDIRECT.',
    actions: [
      'Confirm: Yes, these pages compete. Plan step will merge/redirect.',
      'Reject: Wrong match \u2014 removes this URL from the group.',
    ],
  },
  matched: {
    title: 'What are matched pages?',
    body: 'Pages automatically paired with topics from your map. Higher confidence = more signals agreed. In the Plan step, matched pages get KEEP, OPTIMIZE, or REWRITE based on quality/traffic.',
  },
  gaps: {
    title: 'What are gap topics?',
    body: "Topics from your map with no existing page. The Plan step auto-creates CREATE_NEW actions for these.",
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function confidenceColor(confidence: number): string {
  if (confidence >= 0.7) return 'text-green-400';
  if (confidence >= 0.4) return 'text-yellow-400';
  return 'text-red-400';
}

function confidenceBg(confidence: number): string {
  if (confidence >= 0.7) return 'bg-green-900/30';
  if (confidence >= 0.4) return 'bg-yellow-900/30';
  return 'bg-red-900/30';
}

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function auditScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-600';
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

const SIGNAL_DISPLAY: Record<MatchSignal['type'], { icon: string; label: string; tooltip: string }> = {
  title: { icon: '\uD83D\uDCC4', label: 'Title', tooltip: 'Page title match' },
  h1: { icon: '\uD83C\uDFF7\uFE0F', label: 'H1', tooltip: 'Main heading (H1) match' },
  url_slug: { icon: '\uD83D\uDD17', label: 'URL', tooltip: 'URL slug keyword match' },
  gsc_query: { icon: '\uD83D\uDCCA', label: 'GSC', tooltip: 'Google Search Console query match' },
  content_body: { icon: '\uD83D\uDCDD', label: 'Body', tooltip: 'Body content keyword match' },
  heading_keywords: { icon: '\uD83D\uDCCB', label: 'Headings', tooltip: 'Sub-heading keyword match' },
  detected_ce: { icon: '\uD83C\uDFAF', label: 'CE', tooltip: 'Detected Central Entity match' },
  detected_sc: { icon: '\uD83D\uDDE3\uFE0F', label: 'SC', tooltip: 'Detected Speaking Context match' },
  detected_csi: { icon: '\uD83D\uDD0D', label: 'CSI', tooltip: 'Detected Content Search Intent match' },
};

function formatSignals(signals: MatchSignal[]): React.ReactNode {
  const activeSignals = signals.filter((s) => s.score > 0);
  if (activeSignals.length === 0) return '-';
  return (
    <span className="flex items-center gap-1.5">
      {activeSignals.map((s) => {
        const display = SIGNAL_DISPLAY[s.type];
        return (
          <span key={s.type} title={display.tooltip} className="cursor-help text-xs">
            {display.icon}
          </span>
        );
      })}
    </span>
  );
}

function getPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function truncateStr(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '\u2026';
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

type OrphanGroupBy = 'category' | 'language' | 'flat';

// ── Component ──────────────────────────────────────────────────────────────

export const MatchStep: React.FC<MatchStepProps> = ({
  projectId,
  mapId,
  inventory,
  topics,
  onComplete,
  onRefreshInventory,
  onCreateTopic,
}) => {
  const {
    isMatching,
    result,
    runMatch,
    confirmMatch,
    rejectMatch,
    confirmAll,
    tryLoadFromDb,
    manualMatch,
    bulkManualMatch,
    error,
  } = useAutoMatch(projectId, mapId);

  useEffect(() => {
    if (inventory.length > 0 && topics.length > 0) {
      tryLoadFromDb(inventory, topics);
    }
  }, [inventory.length, topics.length, tryLoadFromDb]);

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [confirmThreshold, setConfirmThreshold] = useState(70);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [isBatchConfirming, setIsBatchConfirming] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [orphanGroupBy, setOrphanGroupBy] = useState<OrphanGroupBy>('category');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [collapsedBanners, setCollapsedBanners] = useState<Set<string>>(new Set());

  // Topic assignment modal state
  const [assignTarget, setAssignTarget] = useState<EnrichedMatch | null>(null);

  // Build lookups
  const inventoryMap = useMemo(() => {
    const map = new Map<string, SiteInventoryItem>();
    for (const item of inventory) map.set(item.id, item);
    return map;
  }, [inventory]);

  const topicMap = useMemo(() => {
    const map = new Map<string, EnrichedTopic>();
    for (const t of topics) map.set(t.id, t);
    return map;
  }, [topics]);

  // Enriched matches — all metadata computed once
  const enrichedMatches = useMemo((): EnrichedMatch[] => {
    if (!result) return [];
    return result.matches.map((match) => {
      const inv = inventoryMap.get(match.inventoryId);
      return {
        ...match,
        inv,
        topic: match.topicId ? topicMap.get(match.topicId) ?? null : null,
        urlCategory: classifyUrl(inv?.url ?? '').category,
        language: detectLanguageFromUrl(inv?.url ?? '', inv?.language),
        pageTitle: inv?.page_title || inv?.page_h1 || null,
        clicks: inv?.gsc_clicks ?? 0,
        auditScore: inv?.audit_score ?? null,
      };
    });
  }, [result, inventoryMap, topicMap]);

  // Detect available languages for filter dropdown
  const availableLanguages = useMemo(() => {
    const langs = new Map<string, string>(); // code -> label
    let unknownCount = 0;
    for (const m of enrichedMatches) {
      if (m.language) {
        langs.set(m.language.code, m.language.label);
      } else {
        unknownCount++;
      }
    }
    if (unknownCount > 0) langs.set('unknown', 'Unknown');
    return langs;
  }, [enrichedMatches]);

  const isMultilingual = availableLanguages.size >= 2;

  // Available categories for filter dropdown
  const availableCategories = useMemo(() => {
    const cats = new Set<UrlCategory>();
    for (const m of enrichedMatches) cats.add(m.urlCategory);
    return Array.from(cats).sort();
  }, [enrichedMatches]);

  // Filter enriched matches by tab + search + language + category
  const applyFilters = useCallback(
    (matches: EnrichedMatch[]) => {
      let filtered = matches;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter((m) => {
          const url = m.inv?.url?.toLowerCase() ?? '';
          const title = (m.pageTitle ?? '').toLowerCase();
          const topicTitle = (m.topic?.title ?? '').toLowerCase();
          const h1 = (m.inv?.page_h1 ?? '').toLowerCase();
          return url.includes(q) || title.includes(q) || topicTitle.includes(q) || h1.includes(q);
        });
      }

      // Language
      if (filterLanguage !== 'all') {
        if (filterLanguage === 'unknown') {
          filtered = filtered.filter((m) => !m.language);
        } else {
          filtered = filtered.filter((m) => m.language?.code === filterLanguage);
        }
      }

      // Category
      if (filterCategory !== 'all') {
        filtered = filtered.filter((m) => m.urlCategory === filterCategory);
      }

      return filtered;
    },
    [searchQuery, filterLanguage, filterCategory],
  );

  // Tab-specific match sets
  const tabMatches = useMemo(() => {
    switch (activeTab) {
      case 'matched':
        return applyFilters(enrichedMatches.filter((m) => m.category === 'matched'));
      case 'orphans':
        return applyFilters(enrichedMatches.filter((m) => m.category === 'orphan'));
      case 'cannibalization':
        return applyFilters(enrichedMatches.filter((m) => m.category === 'cannibalization'));
      case 'gaps':
        return [];
      default:
        return applyFilters(enrichedMatches);
    }
  }, [activeTab, enrichedMatches, applyFilters]);

  // Unfiltered tab counts (for tab badges)
  const tabCounts = useMemo(() => {
    if (!result) return { all: 0, matched: 0, orphans: 0, gaps: 0, cannibalization: 0 };
    return {
      all: result.matches.length + result.gaps.length,
      matched: result.stats.matched,
      orphans: result.stats.orphans,
      gaps: result.stats.gaps,
      cannibalization: result.stats.cannibalization,
    };
  }, [result]);

  const filteredGaps = useMemo((): GapTopic[] => {
    if (!result) return [];
    if (activeTab === 'gaps' || activeTab === 'all') return result.gaps;
    return [];
  }, [result, activeTab]);

  // Cannibalization groups
  const cannibalizationGroups = useMemo(() => {
    if (!result) return [];
    const cannibalMatches = enrichedMatches.filter((m) => m.category === 'cannibalization');
    const grouped = new Map<string, EnrichedMatch[]>();
    for (const m of cannibalMatches) {
      if (!m.topicId) continue;
      const existing = grouped.get(m.topicId) || [];
      existing.push(m);
      grouped.set(m.topicId, existing);
    }
    return Array.from(grouped.entries()).map(([topicId, matches]) => ({
      topicId,
      topicTitle: topicMap.get(topicId)?.title ?? 'Unknown Topic',
      matches: matches.sort((a, b) => computeCompositeScore(b) - computeCompositeScore(a)),
    }));
  }, [result, enrichedMatches, topicMap]);

  // Orphan groups by category or language
  const orphanGroups = useMemo(() => {
    const orphans = applyFilters(enrichedMatches.filter((m) => m.category === 'orphan'));
    if (orphanGroupBy === 'flat') return [{ key: 'all', label: 'All Orphans', items: orphans }];

    const groups = new Map<string, { label: string; items: EnrichedMatch[] }>();
    for (const m of orphans) {
      let key: string;
      let label: string;
      if (orphanGroupBy === 'language') {
        key = m.language?.code ?? 'unknown';
        label = m.language?.label ?? 'Unknown';
      } else {
        key = m.urlCategory;
        label = getCategoryLabel(m.urlCategory);
      }
      const existing = groups.get(key);
      if (existing) {
        existing.items.push(m);
      } else {
        groups.set(key, { label, items: [m] });
      }
    }

    // Sort groups: most items first
    return Array.from(groups.entries())
      .sort((a, b) => b[1].items.length - a[1].items.length)
      .map(([key, { label, items }]) => ({ key, label, items }));
  }, [enrichedMatches, orphanGroupBy, applyFilters]);

  // All orphan matches (for similar-orphan detection)
  const orphanMatches = useMemo(
    () => enrichedMatches.filter((m) => m.category === 'orphan'),
    [enrichedMatches],
  );

  // Find similar orphans by URL slug prefix (e.g., "sedumdak-breda" matches "sedumdak")
  const findSimilarOrphans = useCallback(
    (target: EnrichedMatch): EnrichedMatch[] => {
      const slug = getPathname(target.inv?.url ?? '').split('/').filter(Boolean).pop() || '';
      const parts = slug.split('-');
      if (parts.length < 2) return [];
      const baseSlug = parts[0];
      return orphanMatches.filter((o) => {
        if (o.inventoryId === target.inventoryId) return false;
        const oSlug = getPathname(o.inv?.url ?? '').split('/').filter(Boolean).pop() || '';
        return oSlug.startsWith(baseSlug + '-') || oSlug === baseSlug;
      });
    },
    [orphanMatches],
  );

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleRunMatch = async () => {
    await runMatch(inventory, topics);
  };

  const handleConfirm = async (inventoryId: string, topicId: string) => {
    await confirmMatch(inventoryId, topicId);
    setConfirmedIds((prev) => new Set(prev).add(inventoryId));
    setRejectedIds((prev) => {
      const next = new Set(prev);
      next.delete(inventoryId);
      return next;
    });
  };

  const handleReject = async (inventoryId: string) => {
    await rejectMatch(inventoryId);
    setRejectedIds((prev) => new Set(prev).add(inventoryId));
    setConfirmedIds((prev) => {
      const next = new Set(prev);
      next.delete(inventoryId);
      return next;
    });
  };

  const handleBulkReject = async (matches: EnrichedMatch[]) => {
    const unrejected = matches.filter((m) => !rejectedIds.has(m.inventoryId));
    for (const m of unrejected) {
      await rejectMatch(m.inventoryId);
    }
    setRejectedIds((prev) => {
      const next = new Set(prev);
      for (const m of unrejected) next.add(m.inventoryId);
      return next;
    });
  };

  const handleConfirmAll = async () => {
    setIsBatchConfirming(true);
    try {
      await confirmAll(confirmThreshold / 100);
      if (result) {
        const eligible = result.matches.filter(
          (m) => m.category === 'matched' && m.confidence >= confirmThreshold / 100 && m.topicId !== null,
        );
        setConfirmedIds((prev) => {
          const next = new Set(prev);
          for (const m of eligible) next.add(m.inventoryId);
          return next;
        });
      }
    } finally {
      setIsBatchConfirming(false);
    }
  };

  const handleFinish = () => {
    onRefreshInventory();
    onComplete();
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleBanner = (tab: string) => {
    setCollapsedBanners((prev) => {
      const next = new Set(prev);
      if (next.has(tab)) next.delete(tab);
      else next.add(tab);
      return next;
    });
  };

  const confirmedCount = confirmedIds.size;
  const showFilters = activeTab !== 'gaps' && result;

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Mapping your site to the target strategy</h2>
        <p className="text-sm text-gray-400 mt-1">
          Match existing URLs to topical map topics to identify coverage, gaps, and cannibalization
        </p>
      </div>

      {/* Stats Bar */}
      {result && (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <StatBadge label="Matched" count={result.stats.matched} colorClass="bg-green-900/40 text-green-400 border-green-700" />
          <StatBadge label="Cannibalization" count={result.stats.cannibalization} colorClass="bg-amber-900/40 text-amber-400 border-amber-700" />
          <StatBadge label="Orphans" count={result.stats.orphans} colorClass="bg-red-900/40 text-red-400 border-red-700" />
          <StatBadge label="Gaps" count={result.stats.gaps} colorClass="bg-blue-900/40 text-blue-400 border-blue-700" />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={handleRunMatch}
          disabled={isMatching || inventory.length === 0}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            isMatching || inventory.length === 0
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          {isMatching ? (
            <span className="flex items-center gap-2">
              <Spinner />
              Running Auto-Match...
            </span>
          ) : result ? (
            'Re-run Auto-Match'
          ) : (
            'Run Auto-Match'
          )}
        </button>

        {result && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Auto-confirm above</span>
            <select
              value={confirmThreshold}
              onChange={(e) => setConfirmThreshold(parseInt(e.target.value))}
              className="px-2 py-1.5 rounded bg-gray-800 border border-gray-600 text-gray-200 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value={60}>60%</option>
              <option value={70}>70%</option>
              <option value={80}>80%</option>
              <option value={90}>90%</option>
            </select>
            <button
              onClick={handleConfirmAll}
              disabled={isBatchConfirming}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isBatchConfirming ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-green-700 text-white hover:bg-green-600'
              }`}
            >
              {isBatchConfirming ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Confirming...
                </span>
              ) : (
                'Confirm All'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">{error}</div>
      )}

      {/* Loaded from DB indicator */}
      {result && result.matches.length > 0 && result.matches[0].matchSignals.length === 0 && (
        <div className="text-center text-xs text-gray-500 bg-gray-800/30 rounded py-1.5 px-3">
          Results loaded from previous run. Click &quot;Re-run Auto-Match&quot; for updated signal details.
        </div>
      )}

      {/* No result yet */}
      {!result && !isMatching && (
        <div className="text-center py-6 text-gray-500">
          <p className="text-base mb-1">No match results yet.</p>
          <p className="text-sm">
            Click &quot;Run Auto-Match&quot; to match {inventory.length} URLs against {topics.length} topics.
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-700">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label} ({tabCounts[tab.key]})
              </button>
            ))}
          </div>

          {/* Tab Context Banner */}
          {activeTab !== 'all' && TAB_BANNERS[activeTab] && (
            <TabContextBanner
              tab={activeTab}
              banner={TAB_BANNERS[activeTab]}
              collapsed={collapsedBanners.has(activeTab)}
              onToggle={() => toggleBanner(activeTab)}
            />
          )}

          {/* Filter Bar */}
          {showFilters && (activeTab as FilterTab) !== 'gaps' && (
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterLanguage={filterLanguage}
              onLanguageChange={setFilterLanguage}
              filterCategory={filterCategory}
              onCategoryChange={setFilterCategory}
              availableLanguages={availableLanguages}
              availableCategories={availableCategories}
              isMultilingual={isMultilingual}
              filteredCount={tabMatches.length}
              totalCount={
                activeTab === 'all'
                  ? enrichedMatches.length
                  : enrichedMatches.filter((m) =>
                      activeTab === 'matched'
                        ? m.category === 'matched'
                        : activeTab === 'orphans'
                          ? m.category === 'orphan'
                          : m.category === 'cannibalization',
                    ).length
              }
            />
          )}

          {/* ORPHANS TAB — Grouped View */}
          {activeTab === 'orphans' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400">Group by:</span>
                {(['category', 'language', 'flat'] as OrphanGroupBy[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setOrphanGroupBy(mode)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      orphanGroupBy === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {mode === 'flat' ? 'Flat list' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>

              {orphanGroups.map((group) => (
                <OrphanGroupSection
                  key={group.key}
                  groupKey={group.key}
                  label={group.label}
                  items={group.items}
                  guidance={orphanGroupBy === 'category' ? CATEGORY_GUIDANCE[group.key as UrlCategory] : undefined}
                  collapsed={collapsedGroups.has(group.key)}
                  onToggle={() => toggleGroup(group.key)}
                  onRejectAll={() => handleBulkReject(group.items)}
                  confirmedIds={confirmedIds}
                  rejectedIds={rejectedIds}
                  onReject={handleReject}
                  onAssign={setAssignTarget}
                />
              ))}
            </div>
          )}

          {/* CANNIBALIZATION TAB — Group Cards */}
          {(activeTab === 'cannibalization' || activeTab === 'all') && cannibalizationGroups.length > 0 && (
            <div className="space-y-3">
              {activeTab === 'all' && (
                <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                  Cannibalization Alerts ({cannibalizationGroups.length} groups)
                </h3>
              )}
              {cannibalizationGroups.map((group) => (
                <CannibGroupCard
                  key={group.topicId}
                  group={group}
                  confirmedIds={confirmedIds}
                  rejectedIds={rejectedIds}
                  onConfirm={handleConfirm}
                  onReject={handleReject}
                />
              ))}
            </div>
          )}

          {/* MATCHED / ALL TAB — Enhanced Table */}
          {(activeTab === 'matched' || activeTab === 'all') && (
            <>
              {activeTab === 'all' && tabMatches.filter((m) => m.category === 'matched').length > 0 && (
                <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wide">
                  Matched ({tabMatches.filter((m) => m.category === 'matched').length})
                </h3>
              )}
              <EnhancedMatchTable
                matches={activeTab === 'all' ? tabMatches.filter((m) => m.category === 'matched') : tabMatches}
                confirmedIds={confirmedIds}
                rejectedIds={rejectedIds}
                onConfirm={handleConfirm}
                onReject={handleReject}
                onAssign={setAssignTarget}
              />
            </>
          )}

          {/* ALL TAB — Orphans section */}
          {activeTab === 'all' && tabMatches.filter((m) => m.category === 'orphan').length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide">
                Orphans ({tabMatches.filter((m) => m.category === 'orphan').length})
              </h3>
              <EnhancedMatchTable
                matches={tabMatches.filter((m) => m.category === 'orphan')}
                confirmedIds={confirmedIds}
                rejectedIds={rejectedIds}
                onConfirm={handleConfirm}
                onReject={handleReject}
                onAssign={setAssignTarget}
              />
            </>
          )}

          {/* Gap Topics */}
          {filteredGaps.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">
                Gap Topics ({filteredGaps.length}) &mdash; No matching URL
              </h3>
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800/60 text-gray-300 text-left">
                      <th className="px-4 py-3 font-medium">Topic</th>
                      <th className="px-4 py-3 font-medium text-center">Importance</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {filteredGaps.map((gap) => (
                      <tr key={gap.topicId} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 text-gray-200">{gap.topicTitle}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                              gap.importance === 'pillar'
                                ? 'bg-purple-900/40 text-purple-300 border border-purple-700'
                                : 'bg-gray-800 text-gray-400 border border-gray-600'
                            }`}
                          >
                            {gap.importance}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-blue-400 text-xs font-medium">GAP &mdash; Content needed</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Finish Button */}
          {result && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleFinish}
                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-green-700 text-white hover:bg-green-600 transition-colors"
              >
                {confirmedCount > 0 ? `Finish Matching (${confirmedCount} confirmed)` : 'Accept Results & Continue'}{' '}
                &rarr;
              </button>
            </div>
          )}
        </>
      )}

      {/* Topic Assignment Modal */}
      <TopicAssignmentModal
        isOpen={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        orphan={assignTarget}
        topics={topics}
        similarOrphans={assignTarget ? findSimilarOrphans(assignTarget) : []}
        onAssign={manualMatch}
        onBulkAssign={bulkManualMatch}
        onCreateTopic={onCreateTopic}
      />
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────

function TabContextBanner({
  tab,
  banner,
  collapsed,
  onToggle,
}: {
  tab: string;
  banner: { title: string; body: string; actions?: string[] };
  collapsed: boolean;
  onToggle: () => void;
}) {
  const borderColor =
    tab === 'orphans'
      ? 'border-red-800/50'
      : tab === 'cannibalization'
        ? 'border-amber-800/50'
        : tab === 'matched'
          ? 'border-green-800/50'
          : 'border-blue-800/50';
  const bgColor =
    tab === 'orphans'
      ? 'bg-red-900/10'
      : tab === 'cannibalization'
        ? 'bg-amber-900/10'
        : tab === 'matched'
          ? 'bg-green-900/10'
          : 'bg-blue-900/10';

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} px-4 py-3`}>
      <button onClick={onToggle} className="flex items-center gap-2 w-full text-left">
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-90'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-medium text-gray-300">{banner.title}</span>
      </button>
      {!collapsed && (
        <div className="mt-2 ml-5.5 space-y-2">
          <p className="text-xs text-gray-400 leading-relaxed">{banner.body}</p>
          {banner.actions && (
            <ul className="text-xs text-gray-500 space-y-1">
              {banner.actions.map((a, i) => (
                <li key={i}>
                  <span className="text-gray-300 font-medium">{a.split(':')[0]}:</span>
                  {a.slice(a.indexOf(':') + 1)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function FilterBar({
  searchQuery,
  onSearchChange,
  filterLanguage,
  onLanguageChange,
  filterCategory,
  onCategoryChange,
  availableLanguages,
  availableCategories,
  isMultilingual,
  filteredCount,
  totalCount,
}: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  filterLanguage: string;
  onLanguageChange: (v: string) => void;
  filterCategory: string;
  onCategoryChange: (v: string) => void;
  availableLanguages: Map<string, string>;
  availableCategories: UrlCategory[];
  isMultilingual: boolean;
  filteredCount: number;
  totalCount: number;
}) {
  const hasActiveFilters = searchQuery || filterLanguage !== 'all' || filterCategory !== 'all';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search URL, title, or topic..."
          className="w-full pl-8 pr-3 py-1.5 rounded bg-gray-800 border border-gray-700 text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Language filter */}
      {isMultilingual && (
        <select
          value={filterLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="px-2 py-1.5 rounded bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="all">All languages</option>
          {Array.from(availableLanguages.entries()).map(([code, label]) => (
            <option key={code} value={code}>
              {label} ({code.toUpperCase()})
            </option>
          ))}
        </select>
      )}

      {/* Category filter */}
      <select
        value={filterCategory}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="px-2 py-1.5 rounded bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:border-blue-500"
      >
        <option value="all">All categories</option>
        {availableCategories.map((cat) => (
          <option key={cat} value={cat}>
            {getCategoryLabel(cat)}
          </option>
        ))}
      </select>

      {/* Count indicator */}
      <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
        {hasActiveFilters ? `${filteredCount} of ${totalCount}` : totalCount}
      </span>
    </div>
  );
}

function EnhancedMatchTable({
  matches,
  confirmedIds,
  rejectedIds,
  onConfirm,
  onReject,
  onAssign,
}: {
  matches: EnrichedMatch[];
  confirmedIds: Set<string>;
  rejectedIds: Set<string>;
  onConfirm: (inventoryId: string, topicId: string) => void;
  onReject: (inventoryId: string) => void;
  onAssign: (match: EnrichedMatch) => void;
}) {
  if (matches.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800/60 text-gray-300 text-left">
            <th className="px-3 py-2.5 font-medium">Page</th>
            <th className="px-3 py-2.5 font-medium">Category</th>
            <th className="px-3 py-2.5 font-medium">Lang</th>
            <th className="px-3 py-2.5 font-medium">Topic</th>
            <th className="px-3 py-2.5 font-medium text-center">Confidence</th>
            <th className="px-3 py-2.5 font-medium text-right">Clicks</th>
            <th className="px-3 py-2.5 font-medium text-center">Quality</th>
            <th className="px-3 py-2.5 font-medium text-center">Signals</th>
            <th className="px-3 py-2.5 font-medium text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {matches.map((match) => {
            const isConfirmed = confirmedIds.has(match.inventoryId);
            const isRejected = rejectedIds.has(match.inventoryId);

            return (
              <tr
                key={match.inventoryId}
                className={`transition-colors hover:bg-gray-800/40 ${
                  match.category === 'cannibalization'
                    ? 'bg-amber-900/10'
                    : match.category === 'orphan'
                      ? 'bg-red-900/10'
                      : ''
                } ${isConfirmed ? 'opacity-60' : ''} ${isRejected ? 'opacity-40' : ''}`}
              >
                {/* Page — two-line: title + pathname */}
                <td className="px-3 py-2.5 max-w-[280px]">
                  {match.pageTitle ? (
                    <div>
                      <div className="text-gray-200 text-xs truncate" title={match.pageTitle}>
                        {truncateStr(match.pageTitle, 50)}
                      </div>
                      <div
                        className="text-gray-500 font-mono text-[11px] truncate"
                        title={match.inv?.url}
                      >
                        {truncateStr(getPathname(match.inv?.url ?? ''), 45)}
                      </div>
                    </div>
                  ) : (
                    <span
                      className="text-gray-300 font-mono text-xs truncate block"
                      title={match.inv?.url ?? match.inventoryId}
                    >
                      {truncateStr(getPathname(match.inv?.url ?? match.inventoryId), 45)}
                    </span>
                  )}
                </td>

                {/* Category pill */}
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(match.urlCategory)} bg-gray-800/80`}
                  >
                    {getCategoryLabel(match.urlCategory)}
                  </span>
                </td>

                {/* Language */}
                <td className="px-3 py-2.5">
                  <span className="text-xs text-gray-400 uppercase">
                    {match.language?.code?.toUpperCase() ?? '--'}
                  </span>
                </td>

                {/* Topic */}
                <td className="px-3 py-2.5 max-w-[200px]">
                  {match.topic ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-200 text-xs truncate" title={match.topic.title}>
                        {truncateStr(match.topic.title, 40)}
                      </span>
                      {match.inv?.match_source === 'manual' && (
                        <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-700 flex-shrink-0">
                          manual
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-600 italic text-xs">No match</span>
                  )}
                </td>

                {/* Confidence */}
                <td className="px-3 py-2.5 text-center">
                  {match.category !== 'orphan' ? (
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${confidenceColor(match.confidence)} ${confidenceBg(match.confidence)}`}
                    >
                      {formatConfidence(match.confidence)}
                    </span>
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>

                {/* Clicks */}
                <td className="px-3 py-2.5 text-right">
                  <span className="text-xs text-gray-300 tabular-nums">{match.clicks > 0 ? formatNumber(match.clicks) : '-'}</span>
                </td>

                {/* Quality / Audit Score */}
                <td className="px-3 py-2.5 text-center">
                  <span className={`text-xs font-medium tabular-nums ${auditScoreColor(match.auditScore)}`}>
                    {match.auditScore !== null ? match.auditScore : '-'}
                  </span>
                </td>

                {/* Signals */}
                <td className="px-3 py-2.5 text-center">
                  <span className="text-gray-400 text-xs">{formatSignals(match.matchSignals) || '-'}</span>
                </td>

                {/* Actions */}
                <td className="px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {!match.topicId && match.category === 'orphan' && !isRejected && (
                      <button
                        onClick={() => onAssign(match)}
                        className="p-1.5 rounded hover:bg-blue-900/40 text-blue-400 hover:text-blue-300 transition-colors"
                        title="Assign topic"
                      >
                        <LinkIcon />
                      </button>
                    )}
                    {match.topicId && !isConfirmed && !isRejected && (
                      <button
                        onClick={() => onConfirm(match.inventoryId, match.topicId!)}
                        className="p-1.5 rounded hover:bg-green-900/40 text-green-400 hover:text-green-300 transition-colors"
                        title="Confirm match"
                      >
                        <CheckIcon />
                      </button>
                    )}
                    {!isRejected && (
                      <button
                        onClick={() => onReject(match.inventoryId)}
                        className="p-1.5 rounded hover:bg-red-900/40 text-red-400 hover:text-red-300 transition-colors"
                        title="Reject match"
                      >
                        <XIcon />
                      </button>
                    )}
                    {isConfirmed && <span className="text-green-500 text-xs font-medium">Confirmed</span>}
                    {isRejected && <span className="text-red-500 text-xs font-medium">Rejected</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OrphanGroupSection({
  groupKey,
  label,
  items,
  guidance,
  collapsed,
  onToggle,
  onRejectAll,
  confirmedIds,
  rejectedIds,
  onReject,
  onAssign,
}: {
  groupKey: string;
  label: string;
  items: EnrichedMatch[];
  guidance?: string;
  collapsed: boolean;
  onToggle: () => void;
  onRejectAll: () => void;
  confirmedIds: Set<string>;
  rejectedIds: Set<string>;
  onReject: (id: string) => void;
  onAssign: (match: EnrichedMatch) => void;
}) {
  const totalClicks = items.reduce((sum, m) => sum + m.clicks, 0);
  const unrejectedCount = items.filter((m) => !rejectedIds.has(m.inventoryId)).length;

  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden">
      {/* Group header */}
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-2.5 bg-gray-800/60 hover:bg-gray-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-90'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-gray-200">
            {label} ({items.length})
          </span>
        </div>
        <span className="text-xs text-gray-500 tabular-nums">
          {formatNumber(totalClicks)} total clicks
        </span>
      </button>

      {!collapsed && (
        <div className="px-4 py-2 space-y-2">
          {/* Guidance + Reject All */}
          {(guidance || unrejectedCount > 0) && (
            <div className="flex items-start justify-between gap-3">
              {guidance && (
                <p className="text-xs text-gray-500 flex items-start gap-1.5 leading-relaxed">
                  <span className="text-yellow-500 mt-0.5 flex-shrink-0">*</span>
                  {guidance}
                </p>
              )}
              {unrejectedCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRejectAll();
                  }}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors whitespace-nowrap flex-shrink-0"
                >
                  Reject All ({unrejectedCount})
                </button>
              )}
            </div>
          )}

          {/* Rows */}
          <div className="divide-y divide-gray-700/30">
            {items.map((match) => {
              const isRejected = rejectedIds.has(match.inventoryId);
              return (
                <div
                  key={match.inventoryId}
                  className={`flex items-center gap-3 py-1.5 ${isRejected ? 'opacity-40' : ''}`}
                >
                  {/* Page info */}
                  <div className="flex-1 min-w-0">
                    {match.pageTitle ? (
                      <>
                        <div className="text-xs text-gray-300 truncate">{truncateStr(match.pageTitle, 60)}</div>
                        <div className="text-[11px] text-gray-500 font-mono truncate">
                          {truncateStr(getPathname(match.inv?.url ?? ''), 55)}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-400 font-mono truncate">
                        {truncateStr(getPathname(match.inv?.url ?? match.inventoryId), 55)}
                      </div>
                    )}
                  </div>

                  {/* Category pill */}
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${getCategoryColor(match.urlCategory)} bg-gray-800/80 flex-shrink-0`}
                  >
                    {getCategoryLabel(match.urlCategory)}
                  </span>

                  {/* Lang */}
                  <span className="text-[10px] text-gray-500 uppercase w-5 text-center flex-shrink-0">
                    {match.language?.code?.toUpperCase() ?? '--'}
                  </span>

                  {/* Clicks */}
                  <span className="text-xs text-gray-400 tabular-nums w-12 text-right flex-shrink-0">
                    {match.clicks > 0 ? formatNumber(match.clicks) : '-'}
                  </span>

                  {/* Quality */}
                  <span className={`text-xs tabular-nums w-8 text-center flex-shrink-0 ${auditScoreColor(match.auditScore)}`}>
                    {match.auditScore !== null ? match.auditScore : '-'}
                  </span>

                  {/* Assign + Reject buttons */}
                  {!isRejected ? (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => onAssign(match)}
                        className="p-1 rounded hover:bg-blue-900/40 text-blue-400 hover:text-blue-300 transition-colors"
                        title="Assign topic"
                      >
                        <LinkIcon />
                      </button>
                      <button
                        onClick={() => onReject(match.inventoryId)}
                        className="p-1 rounded hover:bg-red-900/40 text-red-400 hover:text-red-300 transition-colors"
                        title="Reject"
                      >
                        <XIcon />
                      </button>
                    </div>
                  ) : (
                    <span className="text-red-500 text-[10px] font-medium flex-shrink-0 w-6 text-center">
                      Rej
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compute a simplified composite score for cannibalization prediction.
 * Mirrors MigrationPlanEngine.planCannibalization() scoring.
 */
function computeCompositeScore(m: EnrichedMatch): number {
  const auditPart = (m.auditScore ?? 0) * 0.4;
  const clicksPart = Math.min((m.clicks ?? 0) * 0.5, 30);
  const wordsPart = Math.min(((m.inv?.word_count ?? 0) / 50), 30);
  return auditPart + clicksPart + wordsPart;
}

function CannibGroupCard({
  group,
  confirmedIds,
  rejectedIds,
  onConfirm,
  onReject,
}: {
  group: { topicId: string; topicTitle: string; matches: EnrichedMatch[] };
  confirmedIds: Set<string>;
  rejectedIds: Set<string>;
  onConfirm: (inventoryId: string, topicId: string) => void;
  onReject: (inventoryId: string) => void;
}) {
  return (
    <div className="rounded-lg border border-amber-700/50 bg-amber-900/10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-amber-900/20 border-b border-amber-700/30">
        <div className="flex items-start gap-2">
          <WarningIcon />
          <div>
            <p className="text-sm font-medium text-amber-300">
              &quot;{group.topicTitle}&quot; &mdash; {group.matches.length} competing pages
            </p>
            <p className="text-xs text-amber-400/60 mt-0.5">
              If confirmed, the Plan step will merge into the strongest page and redirect the rest.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs text-left">
              <th className="px-4 py-2 font-medium">Page</th>
              <th className="px-4 py-2 font-medium text-right">Clicks</th>
              <th className="px-4 py-2 font-medium text-center">Quality</th>
              <th className="px-4 py-2 font-medium text-center">Conf.</th>
              <th className="px-4 py-2 font-medium">Prediction</th>
              <th className="px-4 py-2 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/30">
            {group.matches.map((match, index) => {
              const isConfirmed = confirmedIds.has(match.inventoryId);
              const isRejected = rejectedIds.has(match.inventoryId);
              const isMergeTarget = index === 0;

              return (
                <tr
                  key={match.inventoryId}
                  className={`hover:bg-gray-800/40 transition-colors ${isConfirmed ? 'opacity-60' : ''} ${isRejected ? 'opacity-40' : ''}`}
                >
                  {/* Page */}
                  <td className="px-4 py-2.5 max-w-[250px]">
                    {match.pageTitle ? (
                      <div>
                        <div className="text-xs text-gray-200 truncate">{truncateStr(match.pageTitle, 45)}</div>
                        <div className="text-[11px] text-gray-500 font-mono truncate">
                          {truncateStr(getPathname(match.inv?.url ?? ''), 40)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300 font-mono truncate block">
                        {truncateStr(getPathname(match.inv?.url ?? match.inventoryId), 40)}
                      </span>
                    )}
                  </td>

                  {/* Clicks */}
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-xs text-gray-300 tabular-nums">
                      {match.clicks > 0 ? formatNumber(match.clicks) : '-'}
                    </span>
                  </td>

                  {/* Quality */}
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs font-medium tabular-nums ${auditScoreColor(match.auditScore)}`}>
                      {match.auditScore !== null ? match.auditScore : '-'}
                    </span>
                  </td>

                  {/* Confidence */}
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs font-semibold ${confidenceColor(match.confidence)}`}>
                      {formatConfidence(match.confidence)}
                    </span>
                  </td>

                  {/* Prediction */}
                  <td className="px-4 py-2.5">
                    {isMergeTarget ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
                        <span className="text-yellow-400">&#9733;</span> MERGE TARGET
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        &#8594; REDIRECT
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {match.topicId && !isConfirmed && !isRejected && (
                        <button
                          onClick={() => onConfirm(match.inventoryId, match.topicId!)}
                          className="p-1 rounded hover:bg-green-900/40 text-green-400 hover:text-green-300 transition-colors"
                          title="Confirm"
                        >
                          <CheckIcon />
                        </button>
                      )}
                      {!isRejected && (
                        <button
                          onClick={() => onReject(match.inventoryId)}
                          className="p-1 rounded hover:bg-red-900/40 text-red-400 hover:text-red-300 transition-colors"
                          title="Reject"
                        >
                          <XIcon />
                        </button>
                      )}
                      {isConfirmed && <span className="text-green-500 text-[10px] font-medium">Confirmed</span>}
                      {isRejected && <span className="text-red-500 text-[10px] font-medium">Rejected</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatBadge({ label, count, colorClass }: { label: string; count: number; colorClass: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${colorClass}`}>
      <span className="text-lg font-bold">{count}</span>
      <span>{label}</span>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <span className="text-amber-400 mt-0.5 flex-shrink-0">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </span>
  );
}

export default MatchStep;
