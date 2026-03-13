import React, { useState, useCallback, useMemo, useRef } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import { getSupabaseClient } from '../../../services/supabaseClient';
import {
  generateExportPackage,
  type ExportPackageOptions,
  type ExportResult,
} from '../../../services/packageExportService';
import { mergeMapBusinessInfo } from '../../../utils/helpers';

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

// ──── Download Card ────

function DownloadCard({
  name,
  description,
  format,
  primary = false,
  enabled = false,
  onDownload,
}: {
  name: string;
  description: string;
  format: string;
  primary?: boolean;
  enabled?: boolean;
  onDownload?: () => void;
}) {
  return (
    <div
      className={`border rounded-lg p-5 ${
        primary
          ? 'bg-blue-900/20 border-blue-500/50'
          : 'bg-gray-800 border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className={`text-sm font-semibold ${primary ? 'text-blue-200' : 'text-gray-200'}`}>
            {name}
          </h4>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
        <span className="text-[10px] text-gray-500 uppercase font-mono bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5">
          {format}
        </span>
      </div>
      <button
        type="button"
        disabled={!enabled}
        onClick={onDownload}
        className={`w-full text-sm font-medium px-4 py-2 rounded-md transition-colors ${
          enabled
            ? primary
              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              : 'bg-gray-600 hover:bg-gray-500 text-gray-200 border border-gray-500 cursor-pointer'
            : primary
              ? 'bg-blue-600 text-white cursor-not-allowed opacity-40'
              : 'bg-gray-700 text-gray-400 border border-gray-600 cursor-not-allowed'
        }`}
      >
        Download
      </button>
    </div>
  );
}

// ──── Visual Content Calendar (X1) ────

function ContentCalendar({
  topics,
  contentAreas,
}: {
  topics: Array<{ title: string; topic_class?: string | null; type: string; parent_topic_id?: string | null }>;
  contentAreas?: string[];
}) {
  // Assign topics to waves
  function getWave(cls: string, type: string): number {
    const c = cls.toLowerCase();
    if (c.includes('monetization') || c.includes('transactional')) return 1;
    if (c.includes('informational') || c.includes('educational')) return 2;
    if (c.includes('regional') || c.includes('local')) return 3;
    if (c.includes('authority') || c.includes('author')) return 4;
    return type === 'core' ? 1 : 2;
  }

  // Map waves to week ranges
  const waveWeeks: Record<number, [number, number]> = {
    1: [1, 2],
    2: [2, 4],
    3: [4, 5],
    4: [5, 7],
  };

  // Group topics by content area (or fallback to wave grouping)
  interface CalendarRow {
    label: string;
    type: 'revenue' | 'authority';
    pageCount: number;
    startWeek: number;
    endWeek: number;
  }

  const rows: CalendarRow[] = [];
  const totalWeeks = 7;

  if (contentAreas && contentAreas.length > 0) {
    // Use content areas for rows — distribute topics evenly across areas
    const perArea = Math.ceil(topics.length / Math.max(contentAreas.length, 1));
    for (let idx = 0; idx < contentAreas.length; idx++) {
      const area = contentAreas[idx];
      const count = Math.min(perArea, Math.max(0, topics.length - idx * perArea));
      // Spread areas across the timeline
      const waveIndex = (idx % 4) + 1;
      const weeks = waveWeeks[waveIndex];
      const colorType: 'revenue' | 'authority' = idx % 2 === 0 ? 'revenue' : 'authority';
      if (count > 0) {
        rows.push({
          label: area,
          type: colorType,
          pageCount: count,
          startWeek: weeks[0],
          endWeek: weeks[1],
        });
      }
    }
  }

  // Fallback: wave-based rows if no content areas or no rows produced
  if (rows.length === 0 && topics.length > 0) {
    const waveDefs = [
      { label: 'Service Pages', type: 'revenue' as const, wave: 1 },
      { label: 'Knowledge Content', type: 'authority' as const, wave: 2 },
      { label: 'Regional Pages', type: 'revenue' as const, wave: 3 },
      { label: 'Authority Content', type: 'authority' as const, wave: 4 },
    ];
    for (const def of waveDefs) {
      const count = topics.filter(t => getWave(t.topic_class ?? '', t.type) === def.wave).length;
      if (count > 0) {
        const weeks = waveWeeks[def.wave];
        rows.push({
          label: def.label,
          type: def.type,
          pageCount: count,
          startWeek: weeks[0],
          endWeek: weeks[1],
        });
      }
    }
  }

  if (rows.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Content Calendar</h3>
        <p className="text-xs text-gray-500">
          Topics will appear here after the content plan is generated.
        </p>
      </div>
    );
  }

  const weekHeaders = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Content Calendar</h3>
      <div className="space-y-1">
        {/* Week header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-40 flex-shrink-0" />
          {weekHeaders.map(w => (
            <div key={w} className="flex-1 text-center">
              <span className="text-[10px] text-gray-500 uppercase">Week {w}</span>
            </div>
          ))}
          <div className="w-16 flex-shrink-0" />
        </div>

        {/* Rows */}
        {rows.map((row, i) => {
          const barColor = row.type === 'revenue'
            ? 'bg-emerald-500/30 border-emerald-500/50'
            : 'bg-sky-500/30 border-sky-500/50';
          const labelColor = row.type === 'revenue' ? 'text-emerald-300' : 'text-sky-300';
          const typeLabel = row.type === 'revenue' ? '(revenue)' : '(authority)';

          return (
            <div key={i} className="flex items-center gap-2 h-10">
              <div className="w-40 flex-shrink-0 text-right pr-2">
                <span className="text-xs text-gray-300 truncate block">{row.label}</span>
                <span className={`text-[9px] ${labelColor}`}>{typeLabel}</span>
              </div>
              {weekHeaders.map(w => {
                const isActive = w >= row.startWeek && w <= row.endWeek;
                const isStart = w === row.startWeek;
                const isEnd = w === row.endWeek;
                return (
                  <div key={w} className="flex-1 h-7 flex items-center">
                    {isActive ? (
                      <div
                        className={`w-full h-6 border ${barColor} ${isStart ? 'rounded-l-md' : ''} ${isEnd ? 'rounded-r-md' : ''}`}
                      />
                    ) : (
                      <div className="w-full h-px bg-gray-700/50" />
                    )}
                  </div>
                );
              })}
              <div className="w-16 flex-shrink-0 text-right">
                <span className="text-xs text-gray-400">{row.pageCount} pg</span>
              </div>
            </div>
          );
        })}

        {/* Total row */}
        <div className="flex items-center gap-2 h-8 border-t border-gray-700/50 mt-2 pt-2">
          <div className="w-40 flex-shrink-0 text-right pr-2">
            <span className="text-xs font-medium text-gray-400">Total</span>
          </div>
          <div className="flex-1" />
          <div className="w-16 flex-shrink-0 text-right">
            <span className="text-xs font-medium text-gray-300">{topics.length} pg</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──── Open Items by Role (X2) ────

interface OpenItem {
  id: string;
  label: string;
  owner: 'business' | 'developer' | 'content';
  severity: 'high' | 'medium' | 'low';
}

function deriveOpenItems(
  topics: Array<{ title: string; type: string; topic_class?: string | null }>,
  briefs: Record<string, { articleDraft?: string }>,
  pillars?: { centralEntity?: string; contentAreas?: string[] },
  eavs?: Array<{ predicate?: { relation?: string } }>,
  analysisState?: Record<string, unknown>,
): OpenItem[] {
  const items: OpenItem[] = [];
  const briefCount = Object.keys(briefs).length;
  const hasArticles = Object.values(briefs).some(b => !!b.articleDraft);
  const auditScore = (analysisState as any)?.audit?.overallScore ?? null;

  // ── Business items ──
  if (pillars?.centralEntity) {
    items.push({ id: 'biz-review-strategy', label: 'Review and approve SEO strategy', owner: 'business', severity: 'high' });
  }
  if ((eavs?.length ?? 0) > 0) {
    items.push({ id: 'biz-verify-facts', label: `Verify ${eavs!.length} business facts are accurate`, owner: 'business', severity: 'high' });
  }
  if (topics.length > 0) {
    items.push({ id: 'biz-approve-plan', label: `Approve content plan (${topics.length} pages)`, owner: 'business', severity: 'high' });
  }
  if (pillars?.contentAreas && pillars.contentAreas.length > 0) {
    items.push({ id: 'biz-review-areas', label: 'Confirm content area naming matches business terminology', owner: 'business', severity: 'medium' });
  }
  items.push({ id: 'biz-brand-assets', label: 'Provide brand assets (logo, colors, fonts) for publishing', owner: 'business', severity: 'low' });

  // ── Developer items ──
  if (topics.length > 0) {
    items.push({ id: 'dev-urls', label: `Create ${topics.length} URL routes on the website`, owner: 'developer', severity: 'high' });
    items.push({ id: 'dev-sitemap', label: 'Generate and deploy XML sitemap', owner: 'developer', severity: 'high' });
    items.push({ id: 'dev-robots', label: 'Configure robots.txt for crawl optimization', owner: 'developer', severity: 'medium' });
  }
  if (pillars?.centralEntity) {
    items.push({ id: 'dev-schema', label: 'Implement Organization JSON-LD schema markup', owner: 'developer', severity: 'high' });
  }
  if (topics.length > 5) {
    items.push({ id: 'dev-linking', label: 'Set up internal linking structure between hub and spoke pages', owner: 'developer', severity: 'medium' });
  }
  if (auditScore !== null && auditScore < 80) {
    items.push({ id: 'dev-audit-fixes', label: `Fix technical audit issues (score: ${auditScore}/100)`, owner: 'developer', severity: 'high' });
  }
  items.push({ id: 'dev-analytics', label: 'Set up search analytics tracking (GSC, GA4)', owner: 'developer', severity: 'low' });

  // ── Content items ──
  if (briefCount > 0 && !hasArticles) {
    items.push({ id: 'content-write', label: `Write ${briefCount} articles from content briefs`, owner: 'content', severity: 'high' });
  } else if (hasArticles) {
    const written = Object.values(briefs).filter(b => !!b.articleDraft).length;
    const remaining = briefCount - written;
    if (remaining > 0) {
      items.push({ id: 'content-write', label: `Write remaining ${remaining} articles`, owner: 'content', severity: 'high' });
    }
    items.push({ id: 'content-review', label: `Review ${written} generated articles for accuracy`, owner: 'content', severity: 'high' });
  }
  if (topics.length > 0) {
    items.push({ id: 'content-meta', label: 'Write meta titles and descriptions for all pages', owner: 'content', severity: 'medium' });
    items.push({ id: 'content-images', label: 'Source and optimize images for each article', owner: 'content', severity: 'medium' });
  }
  if ((eavs?.length ?? 0) > 5) {
    items.push({ id: 'content-eav', label: 'Embed EAV facts naturally into article content', owner: 'content', severity: 'medium' });
  }
  items.push({ id: 'content-proofread', label: 'Final proofreading and brand voice check', owner: 'content', severity: 'low' });

  return items;
}

const OWNER_CONFIG = {
  business: { label: 'Business', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30', badge: 'bg-purple-900/40 text-purple-300 border-purple-500/30' },
  developer: { label: 'Developer', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', badge: 'bg-blue-900/40 text-blue-300 border-blue-500/30' },
  content: { label: 'Content', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', badge: 'bg-green-900/40 text-green-300 border-green-500/30' },
} as const;

const SEVERITY_BADGE: Record<string, string> = {
  high: 'bg-red-900/30 text-red-300 border border-red-500/30',
  medium: 'bg-amber-900/30 text-amber-300 border border-amber-500/30',
  low: 'bg-gray-800 text-gray-400 border border-gray-600',
};

function OpenItemsByRole({
  topics,
  briefs,
  pillars,
  eavs,
  analysisState,
  persistedCheckedItems,
  onCheckedItemsChange,
}: {
  topics: Array<{ title: string; type: string; topic_class?: string | null }>;
  briefs: Record<string, { articleDraft?: string }>;
  pillars?: { centralEntity?: string; contentAreas?: string[] };
  eavs?: Array<{ predicate?: { relation?: string } }>;
  analysisState?: Record<string, unknown>;
  persistedCheckedItems?: string[];
  onCheckedItemsChange?: (items: string[]) => void;
}) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    () => new Set(persistedCheckedItems ?? [])
  );

  const [filterOwner, setFilterOwner] = useState<'all' | 'business' | 'developer' | 'content'>('all');

  const toggleItem = useCallback((id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      onCheckedItemsChange?.([...next]);
      return next;
    });
  }, [onCheckedItemsChange]);

  const allItems = deriveOpenItems(topics, briefs, pillars, eavs, analysisState);
  const filtered = filterOwner === 'all' ? allItems : allItems.filter(i => i.owner === filterOwner);
  const doneCount = allItems.filter(i => checkedIds.has(i.id)).length;
  const totalCount = allItems.length;

  // Role summary counts
  const roleCounts = {
    business: allItems.filter(i => i.owner === 'business').length,
    developer: allItems.filter(i => i.owner === 'developer').length,
    content: allItems.filter(i => i.owner === 'content').length,
  };
  const roleDone = {
    business: allItems.filter(i => i.owner === 'business' && checkedIds.has(i.id)).length,
    developer: allItems.filter(i => i.owner === 'developer' && checkedIds.has(i.id)).length,
    content: allItems.filter(i => i.owner === 'content' && checkedIds.has(i.id)).length,
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
        <span className="text-sm font-medium text-gray-300 whitespace-nowrap">
          {doneCount}/{totalCount} done
        </span>
      </div>

      {/* Role filter tabs + counts */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterOwner('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            filterOwner === 'all'
              ? 'bg-gray-700 border-gray-500 text-gray-200'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-300'
          }`}
        >
          All ({totalCount})
        </button>
        {(Object.keys(OWNER_CONFIG) as Array<keyof typeof OWNER_CONFIG>).map(owner => (
          <button
            key={owner}
            type="button"
            onClick={() => setFilterOwner(owner)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              filterOwner === owner
                ? `${OWNER_CONFIG[owner].bg} ${OWNER_CONFIG[owner].color}`
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-300'
            }`}
          >
            {OWNER_CONFIG[owner].label} ({roleDone[owner]}/{roleCounts[owner]})
          </button>
        ))}
      </div>

      {/* Item list */}
      <div className="space-y-1">
        {filtered.map(item => {
          const done = checkedIds.has(item.id);
          const ownerCfg = OWNER_CONFIG[item.owner];
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                done ? 'bg-gray-800/50' : 'bg-gray-800 hover:bg-gray-750'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className={`w-5 h-5 flex-shrink-0 rounded border transition-colors flex items-center justify-center ${
                  done
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                }`}
              >
                {done && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className={`flex-1 text-sm ${done ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                {item.label}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ownerCfg.badge}`}>
                {ownerCfg.label}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${SEVERITY_BADGE[item.severity]}`}>
                {item.severity}
              </span>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-4">
          No open items for this role. Complete pipeline steps to generate action items.
        </p>
      )}
    </div>
  );
}

// ──── Growth Projections (X3) ────

function GrowthProjectionsCard({ topicCount, briefCount }: {
  topicCount: number;
  briefCount: number;
}) {
  if (topicCount === 0) return null;

  // Conservative estimates based on page count
  const month3Pages = Math.min(topicCount, Math.ceil(topicCount * 0.6));
  const month6Keywords = Math.ceil(topicCount * 1.5);
  const month12Sessions = Math.ceil(topicCount * 40); // conservative 40 sessions/page/month

  const milestones = [
    {
      period: 'Month 3',
      items: [
        `${month3Pages} pages indexed`,
        'Initial rankings appearing',
        'Internal linking structure active',
      ],
      color: 'border-amber-500/30 text-amber-300',
    },
    {
      period: 'Month 6',
      items: [
        `Top-20 rankings for ~${month6Keywords} keywords`,
        'Topical authority building',
        'Featured snippet opportunities appearing',
      ],
      color: 'border-blue-500/30 text-blue-300',
    },
    {
      period: 'Month 12',
      items: [
        `Estimated ${month12Sessions.toLocaleString()} organic sessions/month`,
        'Full topical coverage established',
        'Authority signals across all clusters',
      ],
      color: 'border-green-500/30 text-green-300',
    },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-1">Growth Projections</h3>
      <p className="text-[10px] text-gray-500 mb-4">
        Conservative estimates based on {topicCount} pages. Actual results depend on competition, domain authority, and content quality.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {milestones.map(m => (
          <div key={m.period} className={`border rounded-lg p-4 bg-gray-900 ${m.color.split(' ')[0]}`}>
            <h4 className={`text-sm font-semibold mb-2 ${m.color.split(' ')[1]}`}>{m.period}</h4>
            <ul className="space-y-1">
              {m.items.map((item, i) => (
                <li key={i} className="text-[11px] text-gray-400 flex items-start gap-1.5">
                  <span className="text-gray-600 mt-0.5 flex-shrink-0">&bull;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Maintenance Plan (X4) ────

function MaintenancePlanCard() {
  const schedule = [
    {
      frequency: 'Monthly',
      color: 'border-l-blue-500',
      tasks: [
        'Check Google Search Console for ranking changes',
        'Update EAV values if business facts changed',
        'Review and respond to new search queries',
      ],
    },
    {
      frequency: 'Quarterly',
      color: 'border-l-amber-500',
      tasks: [
        'Add 5-10 new articles targeting emerging queries',
        'Refresh top-performing pages with updated data',
        'Run competitive gap analysis for new opportunities',
      ],
    },
    {
      frequency: 'Annually',
      color: 'border-l-emerald-500',
      tasks: [
        'Full content audit (re-run all 15 phases)',
        'Competitor re-analysis and strategy update',
        'Prune underperforming content (410 vs 301 vs keep)',
        'Review and update content area priorities',
      ],
    },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-1">What Happens After Launch</h3>
      <p className="text-[10px] text-gray-500 mb-4">
        Your content plan is a living asset. Here's the ongoing maintenance schedule.
      </p>
      <div className="space-y-3">
        {schedule.map(s => (
          <div key={s.frequency} className={`bg-gray-900 border border-gray-700 border-l-4 ${s.color} rounded-md px-4 py-3`}>
            <h4 className="text-xs font-semibold text-gray-200 mb-1.5">{s.frequency}</h4>
            <ul className="space-y-1">
              {s.tasks.map((task, i) => (
                <li key={i} className="text-[11px] text-gray-400 flex items-start gap-1.5">
                  <span className="text-gray-600 mt-0.5 flex-shrink-0">&bull;</span>
                  {task}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Pipeline Complete Banner ────

function PipelineCompleteBanner({ allDone }: { allDone: boolean }) {
  if (!allDone) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
        <svg
          className="w-10 h-10 text-gray-600 mx-auto mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-gray-400">Complete all previous pipeline steps to unlock export</p>
        <p className="text-xs text-gray-500 mt-1">
          Steps 1–8 must be completed before the final package can be generated
        </p>
      </div>
    );
  }

  return (
    <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-6 text-center">
      <svg
        className="w-12 h-12 text-green-400 mx-auto mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 className="text-lg font-semibold text-green-300 mb-1">Pipeline Complete!</h3>
      <p className="text-sm text-gray-400">
        All steps completed. Generate and download your complete SEO package below.
      </p>
    </div>
  );
}

// ──── Role-Based View Tabs ────

function RoleViewTabs({ activeTab, onTabChange }: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const tabs = ['SEO', 'Business', 'Content', 'Developer'];

  return (
    <div className="flex gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === tab
              ? 'bg-gray-700 text-gray-200'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

// ──── Export Options ────

function ExportOptionsPanel({
  options,
  onChange,
}: {
  options: ExportPackageOptions;
  onChange: (opts: ExportPackageOptions) => void;
}) {
  const items: Array<{ key: keyof ExportPackageOptions; label: string; description: string }> = [
    { key: 'includeStrategy', label: 'Strategy & EAV Inventory', description: 'Five components, EAV triples CSV' },
    { key: 'includeBriefs', label: 'Content Briefs', description: 'All briefs as Markdown files' },
    { key: 'includeContent', label: 'Generated Content', description: 'Article HTML files per topic' },
    { key: 'includeAuditReport', label: 'Audit Report', description: 'Full audit results as JSON' },
    { key: 'includeTechSpec', label: 'Technical Spec', description: 'URLs, sitemap, robots.txt, meta tags' },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Package Contents</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={options[item.key]}
              onChange={(e) => onChange({ ...options, [item.key]: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500/20"
            />
            <div>
              <p className="text-sm text-gray-200 group-hover:text-white transition-colors">{item.label}</p>
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineExportStep: React.FC = () => {
  const {
    completedSteps,
    steps,
    activeMap,
  } = usePipeline();

  const { state, dispatch } = useAppState();

  // Merge per-map business_info overrides with global state
  const effectiveBusinessInfo = useMemo(() => {
    const mapBI = activeMap?.business_info;
    return mergeMapBusinessInfo(state.businessInfo, mapBI);
  }, [activeMap?.business_info, state.businessInfo]);

  const [activeTab, setActiveTab] = useState('SEO');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [options, setOptions] = useState<ExportPackageOptions>({
    includeContent: true,
    includeBriefs: true,
    includeTechSpec: true,
    includeAuditReport: true,
    includeStrategy: true,
  });

  // Check if all previous steps (excluding export) are completed
  const previousSteps = steps.filter(s => s.step !== 'export');
  const allPreviousDone = previousSteps.every(s => s.status === 'completed');

  // Derived stats
  const topics = activeMap?.topics ?? [];
  const briefs = activeMap?.briefs ?? {};
  const briefCount = Object.keys(briefs).length;
  const wordCount = Object.values(briefs).reduce((sum, b) => {
    const draft = b.articleDraft ?? '';
    const words = draft.split(/\s+/).filter(Boolean).length;
    return sum + words;
  }, 0);

  // ──── Generate full ZIP package ────

  const handleGeneratePackage = useCallback(async () => {
    if (!activeMap) {
      setError('No active topical map found.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateExportPackage(activeMap, options);
      setExportResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Export generation failed: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [activeMap, options]);

  // ──── Trigger browser download for ZIP ────

  const handleDownloadZip = useCallback(() => {
    if (!exportResult) return;
    const url = URL.createObjectURL(exportResult.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportResult]);

  // ──── Generate and download individual section as JSON/text ────

  const handleDownloadSection = useCallback(
    (section: keyof ExportPackageOptions, name: string) => {
      if (!activeMap) return;
      let content = '';
      let filename = name;

      if (section === 'includeStrategy') {
        const pillars = activeMap.pillars;
        const eavs = activeMap.eavs ?? [];
        content = JSON.stringify({ pillars, eavs }, null, 2);
        filename = 'strategy-eavs.json';
      } else if (section === 'includeBriefs') {
        content = JSON.stringify(briefs, null, 2);
        filename = 'content-briefs.json';
      } else if (section === 'includeAuditReport') {
        content = JSON.stringify(activeMap.analysis_state ?? {}, null, 2);
        filename = 'audit-report.json';
      }

      if (!content) return;
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [activeMap, briefs]
  );

  // ──── Export topical map as XLSX ────

  const handleExportTopicalMapXlsx = useCallback(async () => {
    if (!activeMap) return;
    try {
      const { AuditReportExporter } = await import('../../../services/audit/AuditReportExporter');
      const exporter = new AuditReportExporter();
      const buffer = await exporter.exportTopicalMapXlsx({
        topics: (activeMap.topics ?? []).map(t => ({
          title: t.title,
          type: t.type,
          cluster: t.topic_class ?? undefined,
          parent: t.parent_topic_id ?? undefined,
        })),
        pillars: activeMap.pillars,
        eavs: (activeMap.eavs ?? []).map(e => ({
          entity: e.subject?.label ?? '',
          attribute: typeof e.predicate === 'string' ? e.predicate : (e.predicate as any)?.relation ?? '',
          value: typeof e.object === 'string' ? e.object : String(e.object ?? ''),
          category: e.category ?? undefined,
          classification: e.classification ?? undefined,
        })),
      });
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `topical-map-${activeMap.name || 'export'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`XLSX export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [activeMap]);

  // ──── Export briefs as markdown ────

  const handleExportBriefsMarkdown = useCallback(() => {
    if (!activeMap) return;
    try {
      const { AuditReportExporter } = require('../../../services/audit/AuditReportExporter');
      const exporter = new AuditReportExporter();
      const allBriefsMd: string[] = [];
      for (const [, brief] of Object.entries(briefs)) {
        if (brief) {
          const md = exporter.exportBriefMarkdown(brief);
          allBriefsMd.push(md);
        }
      }
      const content = allBriefsMd.join('\n\n---\n\n');
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `content-briefs-${activeMap.name || 'export'}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Brief export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [activeMap, briefs]);

  // ──── Persist export checked items to analysis_state ────

  const persistedCheckedItems = (activeMap?.analysis_state as any)?.export_checked_items as string[] | undefined;

  // Debounce persistence to avoid writing on every toggle
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCheckedItemsChange = useCallback((items: string[]) => {
    const activeMapId = state.activeMapId;
    if (!activeMapId) return;

    const currentAnalysisState = (activeMap?.analysis_state as Record<string, unknown>) ?? {};
    const updatedAnalysisState = { ...currentAnalysisState, export_checked_items: items };

    dispatch({
      type: 'UPDATE_MAP_DATA',
      payload: { mapId: activeMapId, data: { analysis_state: updatedAnalysisState } as any },
    });

    // Debounce Supabase write
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const sbUrl = effectiveBusinessInfo.supabaseUrl;
        const sbKey = effectiveBusinessInfo.supabaseAnonKey;
        if (sbUrl && sbKey) {
          const supabase = getSupabaseClient(sbUrl, sbKey);
          const { error: dbErr } = await supabase.from('topical_maps')
            .update({ analysis_state: updatedAnalysisState } as any)
            .eq('id', activeMapId);
          if (dbErr) console.warn('[Export] Failed to persist checked items:', dbErr);
        }
      } catch (persistErr) {
        console.warn('[Export] Failed to persist checked items:', persistErr);
      }
    }, 1000);
  }, [state.activeMapId, activeMap?.analysis_state, effectiveBusinessInfo, dispatch]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Master Summary &amp; Export</h2>
        <p className="text-sm text-gray-400 mt-1">
          Complete package download, content calendar, and role-based action summaries
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Pages Created"
          value={topics.length}
          color={topics.length > 0 ? 'green' : 'gray'}
        />
        <MetricCard
          label="Words Written"
          value={wordCount > 0 ? wordCount.toLocaleString() : '--'}
          color={wordCount > 0 ? 'blue' : 'gray'}
        />
        <MetricCard
          label="Briefs Ready"
          value={briefCount > 0 ? briefCount : '--'}
          color={briefCount > 0 ? 'green' : 'gray'}
        />
        <MetricCard
          label="Steps Complete"
          value={`${completedSteps.length}/${steps.length}`}
          color={allPreviousDone ? 'green' : 'amber'}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Pipeline Complete / Pending Banner */}
      <PipelineCompleteBanner allDone={allPreviousDone} />

      {/* Export Options */}
      <ExportOptionsPanel options={options} onChange={setOptions} />

      {/* Export Result Stats */}
      {exportResult && (
        <div className="bg-green-900/20 border border-green-500/40 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-300">Package ready to download</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {exportResult.fileCount} files &bull; {formatBytes(exportResult.totalSize)} uncompressed
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadZip}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exportResult.filename}
          </button>
        </div>
      )}

      {/* Download Cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Downloads</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DownloadCard
            name="Complete Package"
            description="All deliverables in a single ZIP download"
            format="ZIP"
            primary
            enabled={topics.length > 0}
            onDownload={exportResult ? handleDownloadZip : handleGeneratePackage}
          />
          <DownloadCard
            name="Content Briefs"
            description="All briefs with heading hierarchy"
            format="JSON"
            enabled={briefCount > 0}
            onDownload={() => handleDownloadSection('includeBriefs', 'content-briefs.json')}
          />
          <DownloadCard
            name="Strategy &amp; EAV"
            description="Pillars, EAV inventory, semantic map"
            format="JSON"
            enabled={!!(activeMap?.pillars?.centralEntity)}
            onDownload={() => handleDownloadSection('includeStrategy', 'strategy-eavs.json')}
          />
          <DownloadCard
            name="Content Files"
            description="Generated articles (requires content generation)"
            format="HTML"
            enabled={Object.values(briefs).some(b => !!b.articleDraft)}
            onDownload={exportResult ? handleDownloadZip : handleGeneratePackage}
          />
          <DownloadCard
            name="Audit Report"
            description="Full audit results with action items"
            format="JSON"
            enabled={!!(activeMap?.analysis_state)}
            onDownload={() => handleDownloadSection('includeAuditReport', 'audit-report.json')}
          />
          <DownloadCard
            name="Technical Spec"
            description="URLs, redirects, sitemaps, robots.txt"
            format="ZIP"
            enabled={topics.length > 0}
            onDownload={exportResult ? handleDownloadZip : handleGeneratePackage}
          />
          <DownloadCard
            name="Topical Map"
            description="Hub-spoke structure, topics, EAV inventory"
            format="XLSX"
            enabled={topics.length > 0}
            onDownload={handleExportTopicalMapXlsx}
          />
          <DownloadCard
            name="Content Briefs"
            description="Structured briefs with outlines and links"
            format="MD"
            enabled={briefCount > 0}
            onDownload={handleExportBriefsMarkdown}
          />
        </div>
      </div>

      {/* Generate Package Button */}
      <div className="flex justify-center">
        <button
          type="button"
          disabled={isGenerating || topics.length === 0}
          onClick={handleGeneratePackage}
          className={`flex items-center gap-2 px-8 py-3 rounded-md font-medium text-base transition-colors ${
            isGenerating || topics.length === 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Building Package...
            </>
          ) : exportResult ? (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate Package
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Generate Full Package
            </>
          )}
        </button>
      </div>

      {/* Content Calendar (X1) */}
      <ContentCalendar topics={topics} contentAreas={activeMap?.pillars?.contentAreas} />

      {/* Role-Based View */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300">Summary by Role</h3>
          <RoleViewTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <OpenItemsByRole
          topics={topics}
          briefs={briefs}
          pillars={activeMap?.pillars}
          eavs={activeMap?.eavs}
          analysisState={activeMap?.analysis_state as Record<string, unknown> | undefined}
          persistedCheckedItems={persistedCheckedItems}
          onCheckedItemsChange={handleCheckedItemsChange}
        />
      </div>

      {/* Growth Projections (X3) */}
      <GrowthProjectionsCard topicCount={topics.length} briefCount={briefCount} />

      {/* Maintenance Plan (X4) */}
      <MaintenancePlanCard />
    </div>
  );
};

export default PipelineExportStep;
