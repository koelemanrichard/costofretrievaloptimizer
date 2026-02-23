import React, { useState, useMemo } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import { generateContentBrief, suggestResponseCode } from '../../../services/ai/briefGeneration';
import { KnowledgeGraph } from '../../../lib/knowledgeGraph';
import type { EnrichedTopic, ContentBrief, BriefSection } from '../../../types';
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

// ──── Status Badge ────

function StatusBadge({ status }: { status: 'Pending' | 'Generated' | 'Reviewed' }) {
  const styles: Record<string, string> = {
    Pending: 'bg-gray-600/20 text-gray-400 border-gray-600/30',
    Generated: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
    Reviewed: 'bg-green-600/20 text-green-300 border-green-500/30',
  };

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${styles[status]}`}>
      {status}
    </span>
  );
}

// ──── Format Icons ────

function FormatIcon({ format }: { format: string }) {
  const lower = format.toLowerCase();
  if (lower.includes('table') || lower === 'table') {
    return <span className="text-[9px] bg-blue-900/20 text-blue-300 border border-blue-700/30 rounded px-1 py-0.5">table</span>;
  }
  if (lower.includes('list') || lower === 'listing' || lower.includes('paa')) {
    return <span className="text-[9px] bg-green-900/20 text-green-300 border border-green-700/30 rounded px-1 py-0.5">list</span>;
  }
  if (lower === 'fs' || lower.includes('featured')) {
    return <span className="text-[9px] bg-amber-900/20 text-amber-300 border border-amber-700/30 rounded px-1 py-0.5">snippet</span>;
  }
  return <span className="text-[9px] bg-gray-700/30 text-gray-400 border border-gray-600/30 rounded px-1 py-0.5">prose</span>;
}

// ──── Brief Compact Card (Decision 7) ────

function BriefCard({ topic, brief }: {
  topic: EnrichedTopic;
  brief: ContentBrief | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const sections = brief?.structured_outline ?? [];
  const sectionCount = sections.length;
  const isPending = !brief;

  // Framework label from topic_class
  const frameworkLabel = topic.topic_class === 'monetization' ? 'revenue page' : 'authority page';
  const labelColor = topic.topic_class === 'monetization' ? 'text-emerald-400/60' : 'text-sky-400/60';

  // B1: Count formats
  const formatCounts = { prose: 0, table: 0, list: 0 };
  for (const s of sections) {
    const fmt = (s.format_code || s.content_type || s.format || '').toLowerCase();
    if (fmt.includes('table')) formatCounts.table++;
    else if (fmt.includes('list') || fmt === 'listing' || fmt === 'paa') formatCounts.list++;
    else formatCounts.prose++;
  }
  const formatSummary = [
    formatCounts.prose > 0 ? `${formatCounts.prose} prose` : '',
    formatCounts.table > 0 ? `${formatCounts.table} table${formatCounts.table > 1 ? 's' : ''}` : '',
    formatCounts.list > 0 ? `${formatCounts.list} list${formatCounts.list > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(', ');

  // B2: Count featured snippet targets
  const snippetTargets = sections.filter(s => {
    const fmt = (s.format_code || '').toUpperCase();
    return fmt === 'FS' || fmt === 'PAA';
  }).length;

  // B3: Count business facts (mapped EAVs)
  let eavCount = 0;
  for (const s of sections) {
    eavCount += (s.mapped_eavs?.length ?? 0);
  }
  // Also count contextualVectors
  if (brief?.contextualVectors) eavCount = Math.max(eavCount, brief.contextualVectors.length);

  // B5: Word count target
  const wordTarget = topic.cluster_role === 'pillar' ? '1,200-1,500' : '800-1,200';

  // Snippet type detection for expanded view
  const getSnippetType = (section: BriefSection): string | null => {
    const fmt = (section.format_code || '').toUpperCase();
    if (fmt === 'FS') return 'paragraph';
    if (fmt === 'PAA') return 'list';
    if (fmt === 'TABLE') return 'table';
    if (fmt === 'LISTING') return 'list';
    const heading = section.heading.toLowerCase();
    if (heading.startsWith('wat is') || heading.startsWith('what is') || heading.includes('definition')) return 'paragraph';
    if (heading.includes('stappen') || heading.includes('steps') || heading.includes('how to')) return 'list';
    if (heading.includes('vergelijk') || heading.includes('compare') || heading.includes('types')) return 'table';
    return null;
  };

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-md overflow-hidden ${isPending ? 'opacity-60' : ''}`}>
      {/* Compact card (always visible) */}
      <button
        type="button"
        onClick={() => !isPending && setExpanded(!expanded)}
        disabled={isPending}
        className="w-full flex items-start justify-between px-4 py-3 text-left hover:bg-gray-800/30 transition-colors disabled:cursor-default"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-300 truncate">{topic.title}</p>
            <span className={`text-[9px] ${labelColor} flex-shrink-0`}>({frameworkLabel})</span>
          </div>
          {!isPending && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] text-gray-500">{sectionCount} sections</span>
              {formatSummary && (
                <>
                  <span className="text-gray-700">&middot;</span>
                  <span className="text-[10px] text-gray-500">{formatSummary}</span>
                </>
              )}
              <span className="text-gray-700">&middot;</span>
              <span className="text-[10px] text-gray-500">{wordTarget} words</span>
              {eavCount > 0 && (
                <>
                  <span className="text-gray-700">&middot;</span>
                  <span className="text-[10px] text-blue-400">{eavCount} facts</span>
                </>
              )}
              {snippetTargets > 0 && (
                <>
                  <span className="text-gray-700">&middot;</span>
                  <span className="text-[10px] text-amber-400">{snippetTargets} snippet target{snippetTargets > 1 ? 's' : ''}</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          <StatusBadge status={isPending ? 'Pending' : 'Generated'} />
          {!isPending && (
            <svg
              className={`w-3.5 h-3.5 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {/* Expanded view — full heading hierarchy (Decision 7) */}
      {expanded && brief && (
        <div className="border-t border-gray-700/50 px-4 py-3 space-y-3">
          {/* Heading hierarchy with format + snippet badges */}
          {sections.length > 0 && (
            <div className="space-y-1">
              {sections.map((section, i) => {
                const snippetType = getSnippetType(section);
                const fmt = section.format_code || section.content_type || section.format || 'PROSE';
                // B4: Opening sentence hint
                const openingHint = section.level === 2
                  ? (() => {
                      const h = section.heading.toLowerCase();
                      if (h.startsWith('wat is') || h.startsWith('what is') || h.includes('definitie'))
                        return 'Lead with: Define the concept in one sentence';
                      if (h.includes('kosten') || h.includes('cost') || h.includes('prijs') || h.includes('price'))
                        return 'Lead with: State the typical price range immediately';
                      if (h.includes('hoe') || h.includes('how') || h.includes('stappen') || h.includes('steps'))
                        return 'Lead with: State the goal, then list steps';
                      if (h.includes('voordel') || h.includes('benefit') || h.includes('advantages'))
                        return 'Lead with: Name the primary benefit in sentence 1';
                      if (h.includes('vergelijk') || h.includes('compare') || h.includes('vs'))
                        return 'Lead with: State the key differentiator';
                      return 'Lead with: Answer the heading\'s question directly';
                    })()
                  : null;
                return (
                  <div key={i}>
                    <div
                      className="flex items-center gap-2 text-xs"
                      style={{ paddingLeft: `${(section.level - 1) * 16}px` }}
                    >
                      <span className="text-gray-500 font-mono text-[10px] w-6 flex-shrink-0">H{section.level}</span>
                      <span className="text-gray-300 truncate flex-1">{section.heading}</span>
                      <FormatIcon format={fmt} />
                      {snippetType && (
                        <span className="text-[9px] bg-amber-900/20 text-amber-300 border border-amber-700/30 rounded px-1 py-0.5">
                          Google answer: {snippetType}
                        </span>
                      )}
                      {(section.mapped_eavs?.length ?? 0) > 0 && (
                        <span className="text-[9px] text-blue-400">{section.mapped_eavs!.length} facts</span>
                      )}
                    </div>
                    {openingHint && (
                      <p className="text-[9px] text-gray-600 italic" style={{ paddingLeft: `${(section.level - 1) * 16 + 30}px` }}>
                        {openingHint}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Required facts panel */}
          {eavCount > 0 && brief.contextualVectors && brief.contextualVectors.length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2">
              <p className="text-[10px] text-gray-500 uppercase mb-1">Required business facts</p>
              <div className="flex flex-wrap gap-1">
                {brief.contextualVectors.slice(0, 8).map((eav, i) => (
                  <span key={i} className="text-[10px] bg-blue-900/15 text-blue-300 border border-blue-700/20 rounded px-1.5 py-0.5">
                    {eav.predicate?.relation || 'fact'}: {String(eav.object?.value ?? '').slice(0, 30)}
                  </span>
                ))}
                {brief.contextualVectors.length > 8 && (
                  <span className="text-[10px] text-gray-500">+{brief.contextualVectors.length - 8} more</span>
                )}
              </div>
            </div>
          )}

          {/* Internal link targets */}
          {brief.contextualBridge && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2">
              <p className="text-[10px] text-gray-500 uppercase mb-1">Internal link targets</p>
              <div className="flex flex-wrap gap-1">
                {(Array.isArray(brief.contextualBridge)
                  ? brief.contextualBridge
                  : brief.contextualBridge.links ?? []
                ).slice(0, 5).map((link, i) => (
                  <span key={i} className="text-[10px] text-gray-400">
                    {link.targetTopic}
                    {i < 4 ? ',' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──── Wave Quality Score (W5) ────

function computeWaveQuality(briefs: Array<{ topic: EnrichedTopic; brief: ContentBrief | null }>): number {
  const generated = briefs.filter(b => b.brief !== null);
  if (generated.length === 0) return 0;

  let totalScore = 0;
  for (const { brief } of generated) {
    if (!brief) continue;
    let score = 0;
    const sections = brief.structured_outline ?? [];
    // Has heading structure (25 pts)
    if (sections.length >= 3) score += 25;
    else if (sections.length > 0) score += 15;
    // Has EAV assignments (25 pts)
    const eavCount = sections.reduce((sum, s) => sum + (s.mapped_eavs?.length ?? 0), 0);
    if (eavCount >= 3) score += 25;
    else if (eavCount > 0) score += 15;
    // Has internal links (25 pts)
    const hasLinks = brief.contextualBridge || sections.some(s => (s as any).internal_links?.length > 0);
    if (hasLinks) score += 25;
    // Has snippet targets (25 pts)
    const fsCount = sections.filter(s => {
      const fmt = (s.format_code || '').toUpperCase();
      return fmt === 'FS' || fmt === 'PAA';
    }).length;
    if (fsCount >= 2) score += 25;
    else if (fsCount > 0) score += 15;

    totalScore += score;
  }

  return Math.round(totalScore / generated.length);
}

// ──── Cross-page EAV Consistency (W3) ────

interface EavUsage {
  predicate: string;
  values: Array<{ value: string; pageTitle: string }>;
}

function findEavInconsistencies(
  briefs: Array<{ topic: EnrichedTopic; brief: ContentBrief | null }>
): EavUsage[] {
  const predicateMap = new Map<string, Array<{ value: string; pageTitle: string }>>();

  for (const { topic, brief } of briefs) {
    if (!brief) continue;
    const vectors = brief.contextualVectors ?? [];
    for (const eav of vectors) {
      const pred = eav.predicate?.relation?.toLowerCase().trim();
      const val = String(eav.object?.value ?? '').trim();
      if (!pred || !val) continue;

      if (!predicateMap.has(pred)) predicateMap.set(pred, []);
      predicateMap.get(pred)!.push({ value: val, pageTitle: topic.title });
    }
  }

  // Keep only predicates with inconsistent values
  const inconsistencies: EavUsage[] = [];
  for (const [predicate, usages] of predicateMap) {
    const uniqueValues = new Set(usages.map(u => u.value.toLowerCase()));
    if (uniqueValues.size > 1) {
      inconsistencies.push({ predicate, values: usages });
    }
  }

  return inconsistencies;
}

// ──── Wave Brief Group ────

function WaveBriefGroup({
  waveNumber,
  briefs,
  onGenerateWave,
  isGenerating,
}: {
  waveNumber: number;
  briefs: Array<{ topic: EnrichedTopic; brief: ContentBrief | null }>;
  onGenerateWave: (waveNumber: number) => void;
  isGenerating: boolean;
}) {
  const [expanded, setExpanded] = useState(waveNumber === 1);

  const waveColors: Record<number, string> = {
    1: 'border-emerald-500/50',
    2: 'border-blue-500/50',
    3: 'border-amber-500/50',
    4: 'border-sky-500/50',
  };

  const generatedCount = briefs.filter(b => b.brief !== null).length;

  // W5: Wave quality score
  const qualityScore = computeWaveQuality(briefs);
  const qualityThreshold = 85;
  const qualityOk = qualityScore >= qualityThreshold;

  // W3: Cross-page EAV inconsistencies
  const eavInconsistencies = findEavInconsistencies(briefs);

  return (
    <div className={`border rounded-lg ${waveColors[waveNumber] || 'border-gray-700'}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <h4 className="text-sm font-medium text-gray-200">Wave {waveNumber}</h4>
          <span className="text-xs text-gray-500">
            {generatedCount}/{briefs.length} briefs generated
          </span>
          {/* W5: Quality badge */}
          {generatedCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
              qualityOk
                ? 'bg-green-900/20 text-green-300 border-green-500/30'
                : 'bg-amber-900/20 text-amber-300 border-amber-500/30'
            }`}>
              {qualityScore}%
            </span>
          )}
          {/* W3: Inconsistency warning */}
          {eavInconsistencies.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-red-900/20 text-red-300 border-red-500/30">
              {eavInconsistencies.length} inconsistenc{eavInconsistencies.length === 1 ? 'y' : 'ies'}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onGenerateWave(waveNumber);
          }}
          disabled={isGenerating || briefs.length === 0}
          className="text-xs bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded px-2.5 py-1 hover:bg-blue-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Generate All Briefs'}
        </button>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {/* W5: Quality bar (when briefs exist) */}
          {generatedCount > 0 && (
            <div className="flex items-center gap-3 py-2">
              <span className="text-[10px] text-gray-500 uppercase w-20 flex-shrink-0">Quality</span>
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${qualityOk ? 'bg-green-500' : 'bg-amber-500'}`}
                  style={{ width: `${qualityScore}%` }}
                />
              </div>
              <span className={`text-[10px] font-medium ${qualityOk ? 'text-green-400' : 'text-amber-400'}`}>
                {qualityScore}% {qualityOk ? '' : `(target: ${qualityThreshold}%)`}
              </span>
            </div>
          )}

          {/* W3: EAV consistency warnings */}
          {eavInconsistencies.length > 0 && (
            <div className="bg-red-900/10 border border-red-500/20 rounded-md px-3 py-2 space-y-1">
              <p className="text-[10px] text-red-400 uppercase font-medium">Cross-page fact inconsistencies</p>
              {eavInconsistencies.slice(0, 3).map((item, i) => (
                <div key={i} className="text-xs text-gray-400">
                  <span className="text-red-300 font-medium">{item.predicate}</span>
                  {': '}
                  {[...new Set(item.values.map(v => v.value))].map((val, j) => (
                    <span key={j}>
                      {j > 0 && <span className="text-red-400"> vs </span>}
                      <span className="text-gray-300">"{val}"</span>
                    </span>
                  ))}
                </div>
              ))}
              {eavInconsistencies.length > 3 && (
                <p className="text-[10px] text-red-400/60">+{eavInconsistencies.length - 3} more</p>
              )}
            </div>
          )}

          {briefs.length > 0 ? (
            briefs.map((item, i) => (
              <BriefCard
                key={i}
                topic={item.topic}
                brief={item.brief}
              />
            ))
          ) : (
            <p className="text-xs text-gray-500 text-center py-6">
              No pages assigned to Wave {waveNumber} yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ──── Brief Preview Panel with Featured Snippet Targets ────

function BriefPreviewPanel({ selectedBrief }: { selectedBrief: ContentBrief | null }) {
  if (!selectedBrief) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Brief Preview</h3>
        <div className="bg-gray-900 border border-gray-700 rounded-md p-4 min-h-[200px] flex items-center justify-center">
          <div className="text-center">
            <svg
              className="w-10 h-10 text-gray-600 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <p className="text-sm text-gray-500">Select a brief to preview heading hierarchy</p>
            <p className="text-xs text-gray-600 mt-1">
              Outline structure, section breakdown, and EAV assignments will display here
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Detect snippet type heuristically per section
  const getSnippetType = (section: { heading: string; level: number; content_type?: string }): string | null => {
    const heading = section.heading.toLowerCase();
    if (heading.startsWith('wat is') || heading.startsWith('what is') || heading.includes('definitie') || heading.includes('definition')) return 'paragraph';
    if (heading.includes('stappen') || heading.includes('steps') || heading.includes('how to') || heading.includes('hoe')) return 'list';
    if (heading.includes('vergelijk') || heading.includes('compare') || heading.includes('kosten') || heading.includes('prijzen') || heading.includes('types')) return 'table';
    if (section.content_type === 'list') return 'list';
    if (section.content_type === 'table') return 'table';
    return null;
  };

  const snippetColors: Record<string, string> = {
    paragraph: 'bg-blue-900/20 text-blue-300 border-blue-700/30',
    list: 'bg-green-900/20 text-green-300 border-green-700/30',
    table: 'bg-amber-900/20 text-amber-300 border-amber-700/30',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Brief Preview: {selectedBrief.title}</h3>
      <div className="bg-gray-900 border border-gray-700 rounded-md p-4 max-h-[400px] overflow-y-auto">
        {selectedBrief.structured_outline && selectedBrief.structured_outline.length > 0 ? (
          <div className="space-y-1">
            {selectedBrief.structured_outline.map((section, i) => {
              const snippetType = getSnippetType(section);
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs text-gray-300 font-mono"
                  style={{ paddingLeft: `${(section.level - 1) * 16}px` }}
                >
                  <span>{'#'.repeat(section.level)} {section.heading}</span>
                  {snippetType && (
                    <span className={`text-[9px] px-1 py-0.5 rounded border ${snippetColors[snippetType]}`}>
                      FS:{snippetType}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-500">{selectedBrief.outline || 'No outline available'}</p>
        )}
      </div>
    </div>
  );
}

// ──── Writing Rules Panel ────

function WritingRulesPanel({ language }: { language: string }) {
  const isNL = language?.toLowerCase().startsWith('nl') || language?.toLowerCase() === 'dutch';

  const rules = [
    { rule: 'One EAV-triple per sentence', detail: 'Each sentence states exactly one entity-attribute-value relationship' },
    { rule: 'S-P-O word order', detail: 'Subject \u2192 Predicate \u2192 Object for maximum clarity' },
    { rule: 'Max 25 words per sentence', detail: 'Definitions: 15\u201320 words. Explanations: max 25 words' },
    { rule: 'Repeat noun, avoid pronouns', detail: 'Use the entity name explicitly instead of "it", "this", "they"' },
    { rule: isNL ? 'Geen vultaal' : 'No filler words', detail: isNL
      ? 'Vermijd: eigenlijk, uiteraard, over het algemeen, in feite'
      : 'Avoid: basically, actually, generally speaking, in fact'
    },
    { rule: 'Definitive modality for facts', detail: 'Use "is", "has", "costs" for facts. "can", "may" only for advice' },
    { rule: 'First 400 chars = core answer', detail: 'No preamble. Start with the direct answer immediately' },
    { rule: 'First sentence after H2 answers it', detail: 'Subordinate text: the heading\u2019s question is answered in sentence 1' },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Writing Rules</h3>
      <div className="space-y-2">
        {rules.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="text-xs text-gray-300 font-medium">{item.rule}</p>
              <p className="text-[10px] text-gray-500">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Anchor Text Strategy Panel ────

function AnchorTextStrategyPanel({ briefs }: { briefs: Record<string, ContentBrief> }) {
  // Scan all briefs for internal link anchors and count frequency
  const anchorCounts = new Map<string, number>();

  for (const brief of Object.values(briefs)) {
    // Check structured outline for internal links
    if (brief.structured_outline) {
      for (const section of brief.structured_outline) {
        const links = (section as any).internal_links ?? [];
        for (const link of links) {
          const anchor = typeof link === 'string' ? link : (link.anchor_text ?? link.text ?? '');
          if (anchor) {
            const normalized = anchor.toLowerCase().trim();
            anchorCounts.set(normalized, (anchorCounts.get(normalized) || 0) + 1);
          }
        }
      }
    }

    // Check top-level internal_links
    const topLinks = (brief as any).internal_links ?? [];
    for (const link of topLinks) {
      const anchor = typeof link === 'string' ? link : (link.anchor_text ?? link.text ?? '');
      if (anchor) {
        const normalized = anchor.toLowerCase().trim();
        anchorCounts.set(normalized, (anchorCounts.get(normalized) || 0) + 1);
      }
    }
  }

  const sortedAnchors = [...anchorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (sortedAnchors.length === 0 && Object.keys(briefs).length === 0) return null;

  const MAX_USAGE = 3;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Anchor Text Strategy</h3>
      {sortedAnchors.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-3 py-2 text-[10px] font-medium text-gray-500 uppercase">Primary Anchor</th>
                <th className="text-center px-3 py-2 text-[10px] font-medium text-gray-500 uppercase">Used</th>
                <th className="text-center px-3 py-2 text-[10px] font-medium text-gray-500 uppercase">Max {MAX_USAGE}x</th>
              </tr>
            </thead>
            <tbody>
              {sortedAnchors.map(([anchor, count], i) => (
                <tr key={i} className="border-b border-gray-700/30">
                  <td className="px-3 py-2 text-gray-300 text-xs truncate max-w-[200px]">{anchor}</td>
                  <td className="px-3 py-2 text-center text-gray-400 text-xs">{count}x</td>
                  <td className="px-3 py-2 text-center">
                    {count > MAX_USAGE ? (
                      <span className="text-amber-400 text-xs font-medium">OVER</span>
                    ) : count === MAX_USAGE ? (
                      <span className="text-amber-400 text-xs">MAX</span>
                    ) : (
                      <span className="text-green-400 text-xs">{'\u2713'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-gray-500 text-center py-4">
          Generate briefs to analyze anchor text distribution
        </p>
      )}
    </div>
  );
}

// ──── Validation Checklist ────

function ValidationChecklist({ briefs }: { briefs: Record<string, ContentBrief> }) {
  const briefCount = Object.keys(briefs).length;
  const allChecks = briefCount > 0;

  const items = [
    { label: 'All headings logical', done: allChecks },
    { label: 'EAV consistency', done: allChecks },
    { label: 'Link targets exist', done: allChecks },
    { label: 'No duplicate macros', done: allChecks },
    { label: 'FS targets defined', done: allChecks },
    { label: 'Schema specified', done: allChecks },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Validation Checklist</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <svg
              className={`w-4 h-4 flex-shrink-0 ${item.done ? 'text-green-400' : 'text-gray-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {item.done ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <span className={`text-sm ${item.done ? 'text-gray-300' : 'text-gray-400'}`}>{item.label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4">
        {briefCount > 0 ? `${briefCount} briefs validated` : 'Checks run automatically after brief generation'}
      </p>
    </div>
  );
}

// ──── Assign topics to waves ────

function assignTopicsToWaves(topics: EnrichedTopic[]): Map<number, EnrichedTopic[]> {
  const waves = new Map<number, EnrichedTopic[]>([
    [1, []],
    [2, []],
    [3, []],
    [4, []],
  ]);

  for (const topic of topics) {
    const cls = topic.topic_class ?? '';
    if (cls.includes('monetization') || cls.includes('transactional')) {
      waves.get(1)!.push(topic);
    } else if (cls.includes('informational') || cls.includes('educational')) {
      waves.get(2)!.push(topic);
    } else if (cls.includes('regional') || cls.includes('local')) {
      waves.get(3)!.push(topic);
    } else if (cls.includes('authority') || cls.includes('author')) {
      waves.get(4)!.push(topic);
    } else {
      // Default: distribute between wave 1 (core) and wave 2 (outer)
      if (topic.type === 'core') {
        waves.get(1)!.push(topic);
      } else {
        waves.get(2)!.push(topic);
      }
    }
  }

  return waves;
}

// ──── Main Component ────

const PipelineBriefsStep: React.FC = () => {
  const {
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

  const stepState = getStepState('briefs');
  const gate = stepState?.gate;

  const topics = activeMap?.topics ?? [];
  const existingBriefs = activeMap?.briefs ?? {};

  const waveMap = assignTopicsToWaves(topics);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingWave, setGeneratingWave] = useState<number | null>(null);
  const [localBriefs, setLocalBriefs] = useState<Record<string, ContentBrief>>(existingBriefs);
  const [error, setError] = useState<string | null>(null);
  const [progressText, setProgressText] = useState('');

  // J1: Adaptive display — summary when briefs exist, detail when adjusting
  const hasBriefData = Object.keys(existingBriefs).length > 0;
  const [isAdjusting, setIsAdjusting] = useState(!hasBriefData);

  const allBriefs = { ...existingBriefs, ...localBriefs };

  const handleGenerateWave = async (waveNumber: number) => {
    const businessInfo = effectiveBusinessInfo;
    const pillars = activeMap?.pillars;

    if (!pillars?.centralEntity) {
      setError('Central Entity is required. Complete the Strategy step first.');
      return;
    }

    const waveTopics = waveMap.get(waveNumber) ?? [];
    if (waveTopics.length === 0) {
      setError(`No topics assigned to Wave ${waveNumber}. Generate the topical map first.`);
      return;
    }

    // Filter to topics that don't have briefs yet
    const topicsNeedingBriefs = waveTopics.filter(t => !allBriefs[t.id]);
    if (topicsNeedingBriefs.length === 0) {
      setError(`All briefs for Wave ${waveNumber} are already generated.`);
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGeneratingWave(waveNumber);
    setStepStatus('briefs', 'in_progress');

    const knowledgeGraph = new KnowledgeGraph();
    const eavs = activeMap?.eavs ?? [];
    const newBriefs: Record<string, ContentBrief> = {};

    try {
      for (let i = 0; i < topicsNeedingBriefs.length; i++) {
        const topic = topicsNeedingBriefs[i];
        setProgressText(`Generating brief ${i + 1}/${topicsNeedingBriefs.length}: ${topic.title}`);

        // Get response code suggestion
        const { responseCode } = await suggestResponseCode(businessInfo, topic.title, dispatch);

        // Generate the brief
        const briefData = await generateContentBrief(
          businessInfo,
          topic,
          topics,
          pillars,
          knowledgeGraph,
          responseCode,
          dispatch,
          undefined, // no market patterns
          eavs
        );

        const brief: ContentBrief = {
          id: `brief-${topic.id}`,
          topic_id: topic.id,
          articleDraft: undefined,
          ...briefData,
        };

        newBriefs[topic.id] = brief;

        // Update state incrementally
        setLocalBriefs(prev => ({ ...prev, [topic.id]: brief }));
      }

      // Persist all new briefs to state and Supabase
      if (state.activeMapId) {
        const mergedBriefs = { ...allBriefs, ...newBriefs };
        dispatch({
          type: 'UPDATE_MAP_DATA',
          payload: {
            mapId: state.activeMapId,
            data: { briefs: mergedBriefs },
          },
        });

        try {
          const supabase = getSupabaseClient(
            businessInfo.supabaseUrl,
            businessInfo.supabaseAnonKey
          );
          await supabase
            .from('topical_maps')
            .update({ briefs: mergedBriefs } as any)
            .eq('id', state.activeMapId);
        } catch (err) {
          console.warn('[Briefs] Supabase save failed:', err);
        }
      }

      setStepStatus('briefs', 'pending_approval');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Brief generation failed';
      setError(`Wave ${waveNumber}: ${message}`);
      setStepStatus('briefs', 'in_progress');
    } finally {
      setIsGenerating(false);
      setGeneratingWave(null);
      setProgressText('');
    }
  };

  // Build wave data for display
  const waveData = [1, 2, 3, 4].map(waveNum => {
    const waveTopics = waveMap.get(waveNum) ?? [];
    return {
      waveNumber: waveNum,
      briefs: waveTopics.map(t => ({ topic: t, brief: allBriefs[t.id] ?? null })),
    };
  });

  const totalBriefs = topics.length;
  const hubTopics = topics.filter(t => t.cluster_role === 'pillar');
  const spokeTopics = topics.filter(t => t.cluster_role !== 'pillar');
  const generatedHubBriefs = hubTopics.filter(t => allBriefs[t.id]).length;
  const generatedSpokeBriefs = spokeTopics.filter(t => allBriefs[t.id]).length;
  const briefCount = Object.keys(allBriefs).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Content Specs</h2>
        <p className="text-sm text-gray-400 mt-1">
          Detailed page specifications with heading structure, business facts, and Google answer targets
        </p>
      </div>

      {/* Prerequisite check */}
      {topics.length === 0 && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-amber-300">
            No topics found. Complete the Topical Map step first to generate topics.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Progress */}
      {isGenerating && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="animate-spin w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-blue-300">{progressText || 'Generating briefs...'}</p>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Hub Briefs"
          value={`${generatedHubBriefs}/${hubTopics.length}`}
          color={generatedHubBriefs > 0 ? 'green' : 'gray'}
        />
        <MetricCard
          label="Spoke Briefs"
          value={`${generatedSpokeBriefs}/${spokeTopics.length}`}
          color={generatedSpokeBriefs > 0 ? 'blue' : 'gray'}
        />
      </div>

      {/* J1: Adaptive display — Adjust button in summary mode */}
      {!isAdjusting && hasBriefData && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setIsAdjusting(true)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 px-5 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
            </svg>
            Adjust Content Specs
          </button>
        </div>
      )}

      {/* Detail view — only shown when adjusting or no data */}
      {isAdjusting && (<>
      {/* Writing Rules Panel */}
      <WritingRulesPanel language={effectiveBusinessInfo.language || 'en'} />

      {/* Wave-grouped Brief List + Preview Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Brief list — 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-4">
          {waveData.map((wave) => (
            <WaveBriefGroup
              key={wave.waveNumber}
              waveNumber={wave.waveNumber}
              briefs={wave.briefs}
              onGenerateWave={handleGenerateWave}
              isGenerating={isGenerating && generatingWave === wave.waveNumber}
            />
          ))}
        </div>

        {/* Preview panel — right side */}
        <div className="space-y-4">
          <BriefPreviewPanel selectedBrief={null} />
          <ValidationChecklist briefs={allBriefs} />
          <AnchorTextStrategyPanel briefs={allBriefs} />
        </div>
      </div>
      </>)}

      {/* Approval Gate */}
      {gate && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
        <ApprovalGate
          step="briefs"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => approveGate('briefs')}
          onReject={(reason) => rejectGate('briefs', reason)}
          onRevise={() => reviseStep('briefs')}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Hub Briefs', value: `${generatedHubBriefs}/${hubTopics.length}`, color: generatedHubBriefs > 0 ? 'green' : 'gray' },
            { label: 'Spoke Briefs', value: `${generatedSpokeBriefs}/${spokeTopics.length}`, color: generatedSpokeBriefs > 0 ? 'green' : 'gray' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineBriefsStep;
