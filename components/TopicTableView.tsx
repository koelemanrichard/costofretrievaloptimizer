/**
 * TopicTableView.tsx
 *
 * Table-based view for topics with compact rows and inline detail expansion.
 * Designed for efficient management of large topical maps (50+ topics).
 * Uses @tanstack/react-virtual for virtualized rendering of 700+ rows.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { EnrichedTopic, ExpansionMode, ContentBrief } from '../types';
import { TopicCompactRow } from './TopicCompactRow';
import { TopicInlineDetail } from './TopicInlineDetail';

interface TopicTableViewProps {
  // Data
  coreTopics: EnrichedTopic[];
  outerTopics: EnrichedTopic[];
  childTopics: EnrichedTopic[];
  briefs: Map<string, ContentBrief>;

  // Selection
  selectedTopicIds: Set<string>;
  onToggleSelection: (topicId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;

  // Actions
  onGenerateBrief: (topic: EnrichedTopic) => void;
  onExpand: (topic: EnrichedTopic, mode: ExpansionMode) => void;
  onDelete: (topicId: string) => void;
  onHighlight: (topic: EnrichedTopic) => void;

  // State
  expandingTopicIds: Set<string>;
  generatingBriefTopicIds: Set<string>;
  canExpand: boolean;
  canGenerateBriefs: boolean;

  // Hierarchy mode
  hierarchyMode: 'seo' | 'business';

  // Optional: Open full detail modal
  onOpenFullDetail?: (topic: EnrichedTopic) => void;

  // Optional: Update topic (for promote/demote functionality)
  onUpdateTopic?: (topicId: string, updates: Partial<EnrichedTopic>) => void;

  // Bulk actions (provided by parent TopicalMapDisplay)
  onBulkGenerateBriefs?: () => void;
  onBulkMerge?: () => void;
  onBulkPromote?: () => void;
  onBulkDemote?: (parentCoreId: string) => void;
  onBulkDelete?: () => void;
  isMerging?: boolean;
}

interface FlattenedTopic {
  topic: EnrichedTopic;
  depth: number;
  hasChildren: boolean;
  parentId: string | null;
}

export const TopicTableView: React.FC<TopicTableViewProps> = ({
  coreTopics,
  outerTopics,
  childTopics,
  briefs,
  selectedTopicIds,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onGenerateBrief,
  onExpand,
  onDelete,
  onHighlight,
  expandingTopicIds,
  generatingBriefTopicIds,
  canExpand,
  canGenerateBriefs,
  hierarchyMode,
  onOpenFullDetail,
  onUpdateTopic,
  onBulkGenerateBriefs,
  onBulkMerge,
  onBulkPromote,
  onBulkDemote,
  onBulkDelete,
  isMerging,
}) => {
  // Track which hierarchy rows are collapsed
  const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());

  // Track which row has inline detail open
  const [openDetailTopicId, setOpenDetailTopicId] = useState<string | null>(null);

  // Ref for the scrollable container
  const parentRef = useRef<HTMLDivElement>(null);

  // Build flattened topic list with hierarchy info
  const flattenedTopics = useMemo(() => {
    const result: FlattenedTopic[] = [];

    // Helper to get children of a topic
    const getOuterTopicsForCore = (coreId: string) =>
      outerTopics.filter(t => t.parent_topic_id === coreId);

    const getChildTopicsForOuter = (outerId: string) =>
      childTopics.filter(t => t.parent_topic_id === outerId);

    // Build hierarchy
    coreTopics.forEach(core => {
      const coreOuterTopics = getOuterTopicsForCore(core.id);

      result.push({
        topic: core,
        depth: 0,
        hasChildren: coreOuterTopics.length > 0,
        parentId: null,
      });

      // Only add children if not collapsed
      if (!collapsedRows.has(core.id)) {
        coreOuterTopics.forEach(outer => {
          const outerChildTopics = getChildTopicsForOuter(outer.id);

          result.push({
            topic: outer,
            depth: 1,
            hasChildren: outerChildTopics.length > 0,
            parentId: core.id,
          });

          // Only add sub-children if not collapsed
          if (!collapsedRows.has(outer.id)) {
            outerChildTopics.forEach(child => {
              result.push({
                topic: child,
                depth: 2,
                hasChildren: false,
                parentId: outer.id,
              });
            });
          }
        });
      }
    });

    return result;
  }, [coreTopics, outerTopics, childTopics, collapsedRows]);

  // Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: flattenedTopics.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = flattenedTopics[index];
      // Detail rows are taller
      return openDetailTopicId === item?.topic.id ? 280 : 40;
    },
    overscan: 5,
  });

  // Toggle row collapse
  const toggleRowCollapse = useCallback((topicId: string) => {
    setCollapsedRows(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  }, []);

  // Handle row click - open inline detail
  const handleRowClick = useCallback((topic: EnrichedTopic) => {
    setOpenDetailTopicId(prev => prev === topic.id ? null : topic.id);
    onHighlight(topic);
  }, [onHighlight]);

  // Close inline detail
  const closeInlineDetail = useCallback(() => {
    setOpenDetailTopicId(null);
  }, []);

  // Check if all visible topics are selected
  const allSelected = flattenedTopics.length > 0 &&
    flattenedTopics.every(({ topic }) => selectedTopicIds.has(topic.id));

  // Check if some are selected
  const someSelected = flattenedTopics.some(({ topic }) => selectedTopicIds.has(topic.id));

  // Topic counts and statistics
  const totalTopics = flattenedTopics.length;
  const topicsWithBriefs = flattenedTopics.filter(({ topic }) => briefs.has(topic.id)).length;
  const topicsWithDrafts = flattenedTopics.filter(({ topic }) => {
    const brief = briefs.get(topic.id);
    return brief?.articleDraft && brief.articleDraft.length > 100;
  }).length;
  const topicsWithWarnings = flattenedTopics.filter(({ topic }) => {
    const brief = briefs.get(topic.id);
    if (!brief) return false;
    const hasWarning =
      !brief.structured_outline?.length ||
      !brief.searchIntent ||
      !brief.metaDescription || brief.metaDescription.length < 50;
    return hasWarning;
  }).length;

  // Completion percentages
  const briefCompletion = totalTopics > 0 ? Math.round((topicsWithBriefs / totalTopics) * 100) : 0;
  const draftCompletion = totalTopics > 0 ? Math.round((topicsWithDrafts / totalTopics) * 100) : 0;

  // Bulk action computations
  const selectedTopicsList = useMemo(() =>
    flattenedTopics.filter(({ topic }) => selectedTopicIds.has(topic.id)).map(({ topic }) => topic),
    [flattenedTopics, selectedTopicIds]
  );
  const needsBriefCount = selectedTopicsList.filter(t => !briefs.has(t.id)).length;
  const hasOuterSelected = selectedTopicsList.some(t => t.type === 'outer');
  const hasCoreSelected = selectedTopicsList.some(t => t.type === 'core');
  const unselectedCoreCount = coreTopics.filter(t => !selectedTopicIds.has(t.id)).length;
  const canDemote = hasCoreSelected && unselectedCoreCount >= 1;
  const demoteTargets = useMemo(() =>
    coreTopics.filter(t => !selectedTopicIds.has(t.id)),
    [coreTopics, selectedTopicIds]
  );

  // Demote dropdown state
  const [demoteOpen, setDemoteOpen] = useState(false);
  const demoteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!demoteOpen) return;
    const handler = (e: MouseEvent) => {
      if (demoteRef.current && !demoteRef.current.contains(e.target as Node)) {
        setDemoteOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [demoteOpen]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      {/* Summary Stats Bar / Bulk Actions Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700 gap-3 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Total + progress (always shown) */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{totalTopics}</span>
            <span className="text-xs text-gray-500">topics</span>
          </div>

          {/* Briefs Progress */}
          <div className="flex items-center gap-2" title={`${topicsWithBriefs} of ${totalTopics} topics have briefs`}>
            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${briefCompletion >= 80 ? 'bg-green-500' : briefCompletion >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${briefCompletion}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{briefCompletion}% briefs</span>
          </div>

          {/* Drafts Progress */}
          <div className="flex items-center gap-2" title={`${topicsWithDrafts} of ${totalTopics} topics have drafts`}>
            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${draftCompletion >= 80 ? 'bg-green-500' : draftCompletion >= 50 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                style={{ width: `${draftCompletion}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{draftCompletion}% drafts</span>
          </div>

          {/* Warnings */}
          {topicsWithWarnings > 0 && (
            <div className="flex items-center gap-1 text-amber-400" title={`${topicsWithWarnings} topics have issues`}>
              <span className="text-xs">{'\u26A0'}</span>
              <span className="text-xs">{topicsWithWarnings} with issues</span>
            </div>
          )}

          {/* Selection count + inline bulk actions */}
          {someSelected && (
            <>
              <span className="text-xs text-gray-600">|</span>
              <span className="text-sm text-blue-400 font-medium shrink-0">
                {selectedTopicIds.size} selected
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Generate Briefs */}
                {needsBriefCount > 0 && onBulkGenerateBriefs && (
                  <button
                    onClick={onBulkGenerateBriefs}
                    disabled={!canGenerateBriefs}
                    className="px-2 py-0.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Briefs ({needsBriefCount})
                  </button>
                )}
                {/* Merge */}
                {selectedTopicIds.size >= 2 && onBulkMerge && (
                  <button
                    onClick={onBulkMerge}
                    disabled={isMerging}
                    className="px-2 py-0.5 text-[11px] bg-purple-600 hover:bg-purple-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isMerging ? 'Merging...' : `Merge (${selectedTopicIds.size})`}
                  </button>
                )}
                {/* Promote */}
                {hasOuterSelected && onBulkPromote && (
                  <button
                    onClick={onBulkPromote}
                    className="px-2 py-0.5 text-[11px] bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
                  >
                    Promote to Core
                  </button>
                )}
                {/* Demote */}
                {canDemote && onBulkDemote && (
                  <div ref={demoteRef} className="relative">
                    <button
                      onClick={() => setDemoteOpen(prev => !prev)}
                      className="px-2 py-0.5 text-[11px] bg-amber-600 hover:bg-amber-700 text-white rounded font-medium transition-colors"
                    >
                      Demote {demoteOpen ? '\u25B4' : '\u25BE'}
                    </button>
                    {demoteOpen && (
                      <div className="absolute left-0 top-full mt-1 w-56 max-h-48 overflow-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-30 py-1">
                        <p className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider">Select parent</p>
                        {demoteTargets.map(core => (
                          <button
                            key={core.id}
                            onClick={() => { onBulkDemote(core.id); setDemoteOpen(false); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 truncate"
                          >
                            Under: {core.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Delete */}
                {onBulkDelete && (
                  <button
                    onClick={onBulkDelete}
                    className="px-2 py-0.5 text-[11px] bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
                  >
                    Delete
                  </button>
                )}
                {/* Clear */}
                <button
                  onClick={onDeselectAll}
                  className="px-2 py-0.5 text-[11px] bg-gray-700 hover:bg-gray-600 text-gray-400 rounded font-medium transition-colors"
                >
                  {'\u2715'} Clear
                </button>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500">
            <span className="text-green-400">{'\u25CF'}</span> Core
            <span className="text-purple-400 ml-2">{'\u25CB'}</span> Outer
            <span className="text-orange-400 ml-2">{'\u25D0'}</span> Sub
          </span>
        </div>
      </div>

      {/* Table */}
      <div ref={parentRef} className="overflow-auto" style={{ maxHeight: '70vh' }}>
        <table className="w-full">
          <thead className="bg-gray-800/30 sticky top-0 z-10">
            <tr className="border-b border-gray-700">
              {/* Select All */}
              <th className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={() => {
                    if (allSelected) {
                      onDeselectAll();
                    } else {
                      onSelectAll();
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-600"
                />
              </th>
              <th className="w-6 px-1 py-2"></th>
              <th className="w-6 px-1 py-2 text-xs font-medium text-gray-500" title="Topic Type">Type</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Title</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 hidden lg:table-cell">Slug</th>
              <th className="w-20 px-1 py-2 text-center text-xs font-medium text-gray-500" title="Pipeline: Brief > Draft > Audit > Published">Pipeline</th>
              <th className="w-10 px-1 py-2 text-center text-xs font-medium text-gray-500 hidden lg:table-cell" title="Topic Section: Core (monetization) or Auth (authority)">Class</th>
              <th className="w-12 px-1 py-2 text-center text-xs font-medium text-gray-500 hidden md:table-cell" title="Query Type: Def(initional), Cmp(arative), Ins(tructional), Grp(ouping), Bool(ean)">QType</th>
              <th className="w-10 px-1 py-2 text-center text-xs font-medium text-gray-500 hidden md:table-cell" title="Structured Outline Sections">Sect</th>
              <th className="w-10 px-1 py-2 text-center text-xs font-medium text-gray-500" title="Warnings and Issues">Warn</th>
              <th className="w-20 px-2 py-2 text-right text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Spacer for virtual scroll offset */}
            {rowVirtualizer.getVirtualItems().length > 0 && (
              <tr style={{ height: rowVirtualizer.getVirtualItems()[0]?.start ?? 0 }}>
                <td colSpan={11} />
              </tr>
            )}
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const { topic, depth, hasChildren } = flattenedTopics[virtualRow.index];
              const hasBrief = briefs.has(topic.id);
              const brief = briefs.get(topic.id);
              const isExpanding = expandingTopicIds.has(topic.id);
              const isGeneratingBrief = generatingBriefTopicIds.has(topic.id);
              const isDetailOpen = openDetailTopicId === topic.id;
              const isRowCollapsed = collapsedRows.has(topic.id);

              return (
                <React.Fragment key={virtualRow.key}>
                  <TopicCompactRow
                    topic={topic}
                    depth={depth}
                    hasChildren={hasChildren}
                    isRowExpanded={!isRowCollapsed}
                    onToggleRowExpand={() => toggleRowCollapse(topic.id)}
                    isChecked={selectedTopicIds.has(topic.id)}
                    onToggleSelection={onToggleSelection}
                    hasBrief={hasBrief}
                    brief={brief}
                    onGenerateBrief={() => onGenerateBrief(topic)}
                    onExpand={onExpand}
                    isExpanding={isExpanding}
                    onDelete={() => onDelete(topic.id)}
                    onRowClick={() => handleRowClick(topic)}
                    canExpand={canExpand}
                    canGenerateBriefs={canGenerateBriefs}
                    isGeneratingBrief={isGeneratingBrief}
                    isDetailOpen={isDetailOpen}
                  />

                  {/* Inline Detail Row */}
                  {isDetailOpen && (
                    <tr>
                      <td colSpan={11} className="p-0">
                        <TopicInlineDetail
                          topic={topic}
                          brief={brief}
                          hasBrief={hasBrief}
                          onGenerateBrief={() => onGenerateBrief(topic)}
                          onExpand={onExpand}
                          isExpanding={isExpanding}
                          onDelete={() => onDelete(topic.id)}
                          onClose={closeInlineDetail}
                          canExpand={canExpand}
                          canGenerateBriefs={canGenerateBriefs}
                          isGeneratingBrief={isGeneratingBrief}
                          onOpenFullDetail={onOpenFullDetail ? () => onOpenFullDetail(topic) : undefined}
                          onUpdateTopic={onUpdateTopic}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {/* End spacer for virtual scroll */}
            {rowVirtualizer.getVirtualItems().length > 0 && (
              <tr style={{
                height: rowVirtualizer.getTotalSize() -
                  (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end ?? 0)
              }}>
                <td colSpan={11} />
              </tr>
            )}
          </tbody>
        </table>

        {/* Empty State */}
        {flattenedTopics.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            <p>No topics to display</p>
            <p className="text-sm mt-1">Add core topics to get started</p>
          </div>
        )}
      </div>

      {/* Bulk action bar removed — parent component (TopicalMapDisplay) now provides TopicBulkActionBar */}
    </div>
  );
};

export default TopicTableView;
