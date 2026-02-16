import React, { useState, useMemo, useEffect } from 'react';
import type { SiteInventoryItem, EnrichedTopic } from '../../../types';
import { useAutoMatch } from '../../../hooks/useAutoMatch';
import type { MatchResult, GapTopic, MatchSignal } from '../../../services/migration/AutoMatchService';

// ── Props ──────────────────────────────────────────────────────────────────

interface MatchStepProps {
  projectId: string;
  mapId: string;
  inventory: SiteInventoryItem[];
  topics: EnrichedTopic[];
  onComplete: () => void;
  onRefreshInventory: () => void;
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

// ── Helpers ────────────────────────────────────────────────────────────────

/** Return tailwind text-color class based on confidence value (0-1). */
function confidenceColor(confidence: number): string {
  if (confidence >= 0.7) return 'text-green-400';
  if (confidence >= 0.4) return 'text-yellow-400';
  return 'text-red-400';
}

/** Return tailwind bg-color class based on confidence value (0-1). */
function confidenceBg(confidence: number): string {
  if (confidence >= 0.7) return 'bg-green-900/30';
  if (confidence >= 0.4) return 'bg-yellow-900/30';
  return 'bg-red-900/30';
}

/** Format confidence as percentage string. */
function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/** Signal icons and tooltips for user-friendly display. */
const SIGNAL_DISPLAY: Record<MatchSignal['type'], { icon: string; label: string; tooltip: string }> = {
  title: { icon: '\uD83D\uDCC4', label: 'Title', tooltip: 'Page title match' },
  h1: { icon: '\uD83C\uDFF7\uFE0F', label: 'H1', tooltip: 'Main heading (H1) match' },
  url_slug: { icon: '\uD83D\uDD17', label: 'URL', tooltip: 'URL slug keyword match' },
  gsc_query: { icon: '\uD83D\uDCCA', label: 'GSC', tooltip: 'Google Search Console query match' },
  content_body: { icon: '\uD83D\uDCDD', label: 'Body', tooltip: 'Body content keyword match' },
  heading_keywords: { icon: '\uD83D\uDCCB', label: 'Headings', tooltip: 'Sub-heading keyword match' },
};

/** Format signal types into icons with tooltips. */
function formatSignals(signals: MatchSignal[]): React.ReactNode {
  const activeSignals = signals.filter((s) => s.score > 0);
  if (activeSignals.length === 0) return '-';
  return (
    <span className="flex items-center gap-1.5">
      {activeSignals.map((s) => {
        const display = SIGNAL_DISPLAY[s.type];
        return (
          <span
            key={s.type}
            title={display.tooltip}
            className="cursor-help text-xs"
          >
            {display.icon}
          </span>
        );
      })}
    </span>
  );
}

/** Truncate a URL to a reasonable display length. */
function truncateUrl(url: string, maxLen = 45): string {
  if (url.length <= maxLen) return url;
  try {
    const u = new URL(url);
    const path = u.pathname;
    if (path.length > maxLen - 3) {
      return '...' + path.slice(-(maxLen - 3));
    }
    return path;
  } catch {
    return url.slice(0, maxLen - 3) + '...';
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export const MatchStep: React.FC<MatchStepProps> = ({
  projectId,
  mapId,
  inventory,
  topics,
  onComplete,
  onRefreshInventory,
}) => {
  const {
    isMatching,
    result,
    runMatch,
    confirmMatch,
    rejectMatch,
    confirmAll,
    tryLoadFromDb,
    error,
  } = useAutoMatch(projectId, mapId);

  // Try to load persisted match results from DB on mount
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

  // Build a lookup from inventoryId -> SiteInventoryItem
  const inventoryMap = useMemo(() => {
    const map = new Map<string, SiteInventoryItem>();
    for (const item of inventory) {
      map.set(item.id, item);
    }
    return map;
  }, [inventory]);

  // Build a lookup from topicId -> EnrichedTopic
  const topicMap = useMemo(() => {
    const map = new Map<string, EnrichedTopic>();
    for (const t of topics) {
      map.set(t.id, t);
    }
    return map;
  }, [topics]);

  // Filtered match results based on active tab
  const filteredMatches = useMemo((): MatchResult[] => {
    if (!result) return [];
    switch (activeTab) {
      case 'matched':
        return result.matches.filter((m) => m.category === 'matched');
      case 'orphans':
        return result.matches.filter((m) => m.category === 'orphan');
      case 'cannibalization':
        return result.matches.filter((m) => m.category === 'cannibalization');
      case 'gaps':
        return []; // Gaps are shown separately, not from matches array
      default:
        return result.matches;
    }
  }, [result, activeTab]);

  const filteredGaps = useMemo((): GapTopic[] => {
    if (!result) return [];
    if (activeTab === 'gaps' || activeTab === 'all') return result.gaps;
    return [];
  }, [result, activeTab]);

  // Cannibalization groups for the alert section
  const cannibalizationGroups = useMemo(() => {
    if (!result) return [];
    const cannibalMatches = result.matches.filter((m) => m.category === 'cannibalization');
    // Group by topicId
    const grouped = new Map<string, MatchResult[]>();
    for (const m of cannibalMatches) {
      if (!m.topicId) continue;
      const existing = grouped.get(m.topicId) || [];
      existing.push(m);
      grouped.set(m.topicId, existing);
    }
    return Array.from(grouped.entries()).map(([topicId, matches]) => ({
      topicId,
      topicTitle: topicMap.get(topicId)?.title ?? 'Unknown Topic',
      matches,
    }));
  }, [result, topicMap]);

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

  const handleConfirmAll = async () => {
    setIsBatchConfirming(true);
    try {
      await confirmAll(confirmThreshold / 100);
      // Mark all eligible as confirmed locally
      if (result) {
        const eligible = result.matches.filter(
          (m) =>
            m.category === 'matched' &&
            m.confidence >= confirmThreshold / 100 &&
            m.topicId !== null,
        );
        setConfirmedIds((prev) => {
          const next = new Set(prev);
          for (const m of eligible) {
            next.add(m.inventoryId);
          }
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

  // Count how many matches have been confirmed
  const confirmedCount = confirmedIds.size;
  const hasConfirmedSome = confirmedCount > 0;

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">
          Mapping your site to the target strategy
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Match existing URLs to topical map topics to identify coverage, gaps, and cannibalization
        </p>
      </div>

      {/* Stats Bar */}
      {result && (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <StatBadge
            label="Matched"
            count={result.stats.matched}
            colorClass="bg-green-900/40 text-green-400 border-green-700"
          />
          <StatBadge
            label="Cannibalization"
            count={result.stats.cannibalization}
            colorClass="bg-amber-900/40 text-amber-400 border-amber-700"
          />
          <StatBadge
            label="Orphans"
            count={result.stats.orphans}
            colorClass="bg-red-900/40 text-red-400 border-red-700"
          />
          <StatBadge
            label="Gaps"
            count={result.stats.gaps}
            colorClass="bg-blue-900/40 text-blue-400 border-blue-700"
          />
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
                isBatchConfirming
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-green-700 text-white hover:bg-green-600'
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
        <div className="px-4 py-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
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
            Click &quot;Run Auto-Match&quot; to match {inventory.length} URLs against{' '}
            {topics.length} topics.
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 border-b border-gray-700">
            {FILTER_TABS.map((tab) => {
              const count =
                tab.key === 'all'
                  ? result.matches.length + result.gaps.length
                  : tab.key === 'gaps'
                    ? result.gaps.length
                    : result.matches.filter((m) =>
                        tab.key === 'matched'
                          ? m.category === 'matched'
                          : tab.key === 'orphans'
                            ? m.category === 'orphan'
                            : m.category === 'cannibalization',
                      ).length;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Match Results Table */}
          {activeTab !== 'gaps' && filteredMatches.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800/60 text-gray-300 text-left">
                    <th className="px-4 py-3 font-medium">URL</th>
                    <th className="px-4 py-3 font-medium text-center">Match</th>
                    <th className="px-4 py-3 font-medium">Topic</th>
                    <th className="px-4 py-3 font-medium text-center">
                      <span className="inline-flex items-center gap-1" title="How similar this URL's content is to the topic. Based on title, headings, URL slug, and page content.">
                        Confidence
                        <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </span>
                    </th>
                    <th className="px-4 py-3 font-medium">Signals</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {filteredMatches.map((match) => {
                    const inv = inventoryMap.get(match.inventoryId);
                    const topic = match.topicId ? topicMap.get(match.topicId) : null;
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
                        } ${isConfirmed ? 'opacity-60' : ''} ${isRejected ? 'opacity-40 line-through' : ''}`}
                      >
                        {/* URL */}
                        <td className="px-4 py-3">
                          <span
                            className="text-gray-200 font-mono text-xs"
                            title={inv?.url ?? match.inventoryId}
                          >
                            {inv ? truncateUrl(inv.url) : match.inventoryId}
                          </span>
                        </td>

                        {/* Arrow */}
                        <td className="px-4 py-3 text-center text-gray-500">
                          {match.category === 'orphan' ? (
                            <span className="text-red-500 text-xs">(orphan)</span>
                          ) : (
                            <span className="text-lg">&harr;</span>
                          )}
                        </td>

                        {/* Topic */}
                        <td className="px-4 py-3">
                          {topic ? (
                            <span className="text-gray-200">{topic.title}</span>
                          ) : (
                            <span className="text-gray-600 italic">No match</span>
                          )}
                        </td>

                        {/* Confidence */}
                        <td className="px-4 py-3 text-center">
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

                        {/* Signals */}
                        <td className="px-4 py-3">
                          <span className="text-gray-400 text-xs">
                            {formatSignals(match.matchSignals) || '-'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {match.topicId && !isConfirmed && !isRejected && (
                              <button
                                onClick={() => handleConfirm(match.inventoryId, match.topicId!)}
                                className="p-1.5 rounded hover:bg-green-900/40 text-green-400 hover:text-green-300 transition-colors"
                                title="Confirm match"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </button>
                            )}
                            {!isRejected && (
                              <button
                                onClick={() => handleReject(match.inventoryId)}
                                className="p-1.5 rounded hover:bg-red-900/40 text-red-400 hover:text-red-300 transition-colors"
                                title="Reject match"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            )}
                            {isConfirmed && (
                              <span className="text-green-500 text-xs font-medium">Confirmed</span>
                            )}
                            {isRejected && (
                              <span className="text-red-500 text-xs font-medium">Rejected</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
                          <span className="text-blue-400 text-xs font-medium">
                            GAP &mdash; Content needed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cannibalization Alerts */}
          {(activeTab === 'all' || activeTab === 'cannibalization') &&
            cannibalizationGroups.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wide">
                  Cannibalization Alerts ({cannibalizationGroups.length} groups)
                </h3>
                <div className="space-y-2">
                  {cannibalizationGroups.map((group) => (
                    <div
                      key={group.topicId}
                      className="rounded-lg border border-amber-700/50 bg-amber-900/10 px-4 py-3"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-amber-400 mt-0.5 flex-shrink-0">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                        </span>
                        <div className="text-sm">
                          <p className="text-amber-300 font-medium">
                            &quot;{group.topicTitle}&quot; has {group.matches.length} competing URLs:
                          </p>
                          <p className="text-xs text-amber-400/60 mt-0.5">
                            Consider merging these pages or differentiating their focus to avoid competing for the same rankings.
                          </p>
                          <ul className="mt-1 space-y-0.5">
                            {group.matches.map((m) => {
                              const inv = inventoryMap.get(m.inventoryId);
                              return (
                                <li
                                  key={m.inventoryId}
                                  className="text-gray-300 font-mono text-xs"
                                >
                                  {inv ? inv.url : m.inventoryId}{' '}
                                  <span className={confidenceColor(m.confidence)}>
                                    ({formatConfidence(m.confidence)})
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Finish / Complete Button — always visible once results exist */}
          {result && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleFinish}
                className="px-6 py-2.5 rounded-lg text-sm font-medium bg-green-700 text-white hover:bg-green-600 transition-colors"
              >
                {confirmedCount > 0
                  ? `Finish Matching (${confirmedCount} confirmed)`
                  : 'Accept Results & Continue'}
                {' '}&rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────

function StatBadge({
  label,
  count,
  colorClass,
}: {
  label: string;
  count: number;
  colorClass: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${colorClass}`}
    >
      <span className="text-lg font-bold">{count}</span>
      <span>{label}</span>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default MatchStep;
