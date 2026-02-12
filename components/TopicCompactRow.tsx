/**
 * TopicCompactRow.tsx
 *
 * Compact table-row representation of a topic for dense list views.
 * Designed for ~30px row height with maximum information density.
 * Shows: Type, Title, Slug, Brief Quality, Draft Status, Intent, Sections, Warnings
 */

import React, { useMemo } from 'react';
import { EnrichedTopic, ExpansionMode, ContentBrief } from '../types';
import { Loader } from './ui/Loader';
import { safeString } from '../utils/parsers';
import { calculateBriefQualityScore, BriefQualityResult } from '../utils/briefQualityScore';
import { TopicPipelineIndicator } from './ui/TopicPipelineIndicator';
import { useAppState } from '../state/appState';
import { AuditButton } from './audit/AuditButton';

interface TopicCompactRowProps {
  topic: EnrichedTopic;
  depth: number;
  hasChildren: boolean;
  isRowExpanded: boolean;
  onToggleRowExpand: () => void;
  isChecked: boolean;
  onToggleSelection: (topicId: string) => void;
  hasBrief: boolean;
  brief?: ContentBrief | null;
  onGenerateBrief: () => void;
  onExpand?: (topic: EnrichedTopic, mode: ExpansionMode) => void;
  isExpanding?: boolean;
  onDelete: () => void;
  onRowClick: () => void;
  canExpand: boolean;
  canGenerateBriefs: boolean;
  isGeneratingBrief?: boolean;
  isDetailOpen?: boolean;
}

// Type indicator icons
const TYPE_ICONS = {
  core: { icon: '●', color: 'text-green-400', label: 'Core' },
  outer: { icon: '○', color: 'text-purple-400', label: 'Outer' },
  child: { icon: '◐', color: 'text-orange-400', label: 'Sub-topic' },
};

// Query Type labels (Framework terminology)
// These determine the required answer FORMAT (not traditional search intent)
const QUERY_TYPE_LABELS: Record<string, { label: string; color: string; title: string }> = {
  // Framework Query Types (from topic metadata)
  definitional: { label: 'Def', color: 'text-blue-400', title: 'Definitional - requires prose definition' },
  comparative: { label: 'Cmp', color: 'text-purple-400', title: 'Comparative - requires table/list comparison' },
  instructional: { label: 'Ins', color: 'text-green-400', title: 'Instructional - requires ordered list/steps' },
  boolean: { label: 'Bool', color: 'text-yellow-400', title: 'Boolean - requires yes/no with explanation' },
  grouping: { label: 'Grp', color: 'text-orange-400', title: 'Grouping - requires categorized list' },
  // Fallback traditional intents (if query_type not set)
  informational: { label: 'Info', color: 'text-blue-300', title: 'Informational intent' },
  transactional: { label: 'Trans', color: 'text-green-300', title: 'Transactional intent' },
  navigational: { label: 'Nav', color: 'text-purple-300', title: 'Navigational intent' },
  commercial: { label: 'Comm', color: 'text-yellow-300', title: 'Commercial intent' },
};

// Topic Class labels (Core Section vs Author Section)
const TOPIC_CLASS_LABELS: Record<string, { label: string; color: string; title: string }> = {
  monetization: { label: 'Core', color: 'text-green-400', title: 'Core Section - monetization focus' },
  informational: { label: 'Auth', color: 'text-blue-400', title: 'Author Section - authority/historical data' },
};

// Warning types for topics
interface TopicWarnings {
  noBrief: boolean;
  noOutline: boolean;
  lowQuality: boolean;
  noQueryType: boolean;  // Missing query_type (affects content format)
  noDraft: boolean;
  missingMeta: boolean;
  noCanonicalQuery: boolean;  // Missing canonical query
}

function getWarnings(topic: EnrichedTopic, brief: ContentBrief | null | undefined, quality: BriefQualityResult | null): TopicWarnings {
  const metadata = topic.metadata || {};
  return {
    noBrief: !brief,
    noOutline: brief ? (!brief.structured_outline || brief.structured_outline.length === 0) : false,
    lowQuality: quality ? quality.score < 40 : false,
    noQueryType: !metadata.query_type && !brief?.searchIntent && !brief?.query_type_format,  // No query type AND no fallback
    noDraft: brief ? !brief.articleDraft : false,
    missingMeta: brief ? (!brief.metaDescription || brief.metaDescription.length < 50) : false,
    noCanonicalQuery: !metadata.canonical_query && !brief?.targetKeyword,  // No canonical query
  };
}

function countWarnings(warnings: TopicWarnings, hasBrief: boolean): number {
  if (!hasBrief) return 0; // Don't show warnings if no brief yet
  let count = 0;
  if (warnings.noOutline) count++;
  if (warnings.lowQuality) count++;
  if (warnings.noQueryType) count++;
  if (warnings.missingMeta) count++;
  if (warnings.noCanonicalQuery) count++;
  return count;
}

export const TopicCompactRow: React.FC<TopicCompactRowProps> = ({
  topic,
  depth,
  hasChildren,
  isRowExpanded,
  onToggleRowExpand,
  isChecked,
  onToggleSelection,
  hasBrief,
  brief,
  onGenerateBrief,
  onExpand,
  isExpanding,
  onDelete,
  onRowClick,
  canExpand,
  canGenerateBriefs,
  isGeneratingBrief = false,
  isDetailOpen = false,
}) => {
  const title = safeString(topic.title);
  const slug = safeString(topic.slug);
  const typeInfo = TYPE_ICONS[topic.type] || TYPE_ICONS.outer;

  // Catalog category lookup
  const { state: appState } = useAppState();
  const catalogCategoryName = useMemo(() => {
    const categories = appState.catalog?.categories;
    if (!categories || categories.length === 0) return null;
    const linked = categories.find(c => c.linked_topic_id === topic.id && c.status === 'active');
    return linked?.name || null;
  }, [appState.catalog?.categories, topic.id]);

  // Calculate brief quality
  const briefQuality = useMemo(() => {
    return calculateBriefQualityScore(brief);
  }, [brief]);

  // Get warnings
  const warnings = useMemo(() => getWarnings(topic, brief, briefQuality), [topic, brief, briefQuality]);
  const warningCount = useMemo(() => countWarnings(warnings, hasBrief), [warnings, hasBrief]);

  // Get Query Type info (Framework: Definitional, Comparative, etc.)
  // Priority: topic.metadata.query_type > brief.searchIntent
  const queryTypeInfo = useMemo(() => {
    const metadata = topic.metadata || {};
    // First try query_type from topic metadata (framework field)
    if (metadata.query_type) {
      const queryType = metadata.query_type as string;
      const key = queryType.toLowerCase();
      return QUERY_TYPE_LABELS[key] || { label: queryType.slice(0, 4), color: 'text-gray-400', title: queryType };
    }
    // Fallback to brief's searchIntent
    if (brief?.searchIntent) {
      const key = brief.searchIntent.toLowerCase();
      return QUERY_TYPE_LABELS[key] || { label: brief.searchIntent.slice(0, 4), color: 'text-gray-400', title: brief.searchIntent };
    }
    return null;
  }, [topic.metadata, brief?.searchIntent]);

  // Get Topic Class info (Core Section vs Author Section)
  const topicClassInfo = useMemo(() => {
    const topicClass = topic.topic_class;
    if (topicClass) {
      return TOPIC_CLASS_LABELS[topicClass] || null;
    }
    // Infer from topic type if not explicitly set
    if (topic.type === 'core') {
      return { label: 'Core', color: 'text-green-400/50', title: 'Inferred: Core topic (not explicitly set)' };
    }
    return null;
  }, [topic.topic_class, topic.type]);

  // Get section count
  const sectionCount = brief?.structured_outline?.length || 0;

  // Has draft
  const hasDraft = !!(brief?.articleDraft && brief.articleDraft.length > 100);

  // Audit URL: derive from domain + slug
  const domain = appState.businessInfo?.domain;
  const auditUrl = domain && slug ? `https://${domain}/${slug}` : null;

  // Indentation based on depth
  const indentPx = depth * 20;

  // Brief quality color
  const getBriefColor = () => {
    if (isGeneratingBrief) return 'text-blue-400';
    if (!hasBrief) return 'text-gray-600';
    if (!briefQuality) return 'text-gray-500';
    if (briefQuality.score >= 70) return 'text-green-400';
    if (briefQuality.score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <tr
      className={`group border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer ${
        isDetailOpen ? 'bg-blue-900/20' : ''
      } ${isGeneratingBrief ? 'animate-pulse' : ''}`}
      onClick={onRowClick}
    >
      {/* Checkbox */}
      <td className="w-8 px-2 py-1">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelection(topic.id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500"
        />
      </td>

      {/* Expand toggle */}
      <td className="w-6 px-1 py-1">
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleRowExpand();
            }}
            className="text-gray-500 hover:text-gray-300 text-xs"
            aria-label={isRowExpanded ? 'Collapse child topics' : 'Expand child topics'}
            aria-expanded={isRowExpanded}
          >
            {isRowExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="text-gray-700 text-xs">─</span>
        )}
      </td>

      {/* Type indicator */}
      <td className="w-6 px-1 py-1 text-center">
        <span className={typeInfo.color} title={typeInfo.label}>
          {typeInfo.icon}
        </span>
      </td>

      {/* Title with indentation */}
      <td className="px-2 py-1 max-w-[300px]">
        <div className="flex items-center" style={{ paddingLeft: `${indentPx}px` }}>
          {depth > 0 && (
            <span className="text-gray-600 mr-1 text-xs">└</span>
          )}
          <span
            className="text-sm text-white truncate"
            title={title}
          >
            {title}
          </span>
          {catalogCategoryName && (
            <span
              className="ml-1 text-cyan-400 flex-shrink-0"
              title={`Linked to catalog: ${catalogCategoryName}`}
            >
              <svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </span>
          )}
        </div>
      </td>

      {/* Slug */}
      <td className="px-2 py-1 hidden lg:table-cell max-w-[150px]">
        <span className="text-xs text-green-500 font-mono truncate block" title={`/${slug}`}>
          /{slug}
        </span>
      </td>

      {/* Pipeline Status */}
      <td className="w-20 px-1 py-1 text-center">
        <TopicPipelineIndicator
          hasBrief={hasBrief}
          hasDraft={hasDraft}
          hasAudit={!!(brief?.contentAudit?.algorithmicResults)}
          isPublished={false}
        />
      </td>

      {/* Topic Class (Core/Author Section) */}
      <td className="w-10 px-1 py-1 text-center hidden lg:table-cell">
        <span
          className={`text-xs ${topicClassInfo?.color || 'text-gray-600'}`}
          title={topicClassInfo?.title || 'Section not set'}
        >
          {topicClassInfo?.label || '--'}
        </span>
      </td>

      {/* Query Type (Definitional, Comparative, etc.) */}
      <td className="w-12 px-1 py-1 text-center hidden md:table-cell">
        <span
          className={`text-xs ${queryTypeInfo?.color || 'text-gray-600'}`}
          title={queryTypeInfo?.title || 'Query type not set'}
        >
          {queryTypeInfo?.label || '--'}
        </span>
      </td>

      {/* Sections Count */}
      <td className="w-10 px-1 py-1 text-center hidden md:table-cell">
        <span
          className={`text-xs ${sectionCount > 0 ? 'text-gray-300' : 'text-gray-600'}`}
          title={`${sectionCount} sections in outline`}
        >
          {sectionCount > 0 ? sectionCount : '--'}
        </span>
      </td>

      {/* Warnings */}
      <td className="w-10 px-1 py-1 text-center">
        {warningCount > 0 ? (
          <span
            className="text-xs text-amber-400 cursor-help"
            title={[
              warnings.noOutline && 'Missing structured outline',
              warnings.lowQuality && 'Low brief quality (<40%)',
              warnings.noQueryType && 'Missing query type',
              warnings.missingMeta && 'Short/missing meta description',
              warnings.noCanonicalQuery && 'Missing canonical query',
            ].filter(Boolean).join(', ')}
          >
            ⚠ {warningCount}
          </span>
        ) : hasBrief ? (
          <span className="text-xs text-green-500" title="No issues">✓</span>
        ) : (
          <span className="text-xs text-gray-700">-</span>
        )}
      </td>

      {/* Actions */}
      <td className="w-20 px-2 py-1">
        <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {/* Generate/View Brief */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateBrief();
            }}
            disabled={!hasBrief && !canGenerateBriefs}
            className={`p-1 rounded hover:bg-gray-700 ${
              hasBrief ? 'text-green-400' : 'text-gray-500 hover:text-blue-400'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            title={hasBrief ? 'View Brief' : canGenerateBriefs ? 'Generate Brief' : 'Enable briefs first'}
            aria-label={hasBrief ? 'View Brief' : canGenerateBriefs ? 'Generate Brief' : 'Enable briefs first'}
          >
            📝
          </button>

          {/* Expand (core topics only) */}
          {topic.type === 'core' && onExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand(topic, 'CONTEXT');
              }}
              disabled={isExpanding || !canExpand}
              className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-purple-400 disabled:opacity-30 disabled:cursor-not-allowed"
              title={canExpand ? 'Expand Topic' : 'Enable expansion first'}
              aria-label={canExpand ? 'Expand Topic' : 'Enable expansion first'}
            >
              {isExpanding ? <Loader className="w-4 h-4" /> : '➕'}
            </button>
          )}

          {/* Audit */}
          {auditUrl && (
            <span onClick={(e) => e.stopPropagation()}>
              <AuditButton url={auditUrl} variant="icon" size="sm" />
            </span>
          )}

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-red-400"
            title="Delete Topic"
            aria-label="Delete Topic"
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
};

export default React.memo(TopicCompactRow);
