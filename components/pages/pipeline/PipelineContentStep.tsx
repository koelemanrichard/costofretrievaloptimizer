import React, { useState, useCallback, useMemo } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import { useActionPlan } from '../../../hooks/useActionPlan';
import ApprovalGate from '../../pipeline/ApprovalGate';
import {
  ContentGenerationOrchestrator,
  executePass1,
  executePass2,
  executePass3,
} from '../../../services/ai/contentGeneration';
// Pass 9 (audit) is aliased as executePass9 in the barrel but the underlying function signature is from pass8Audit
import type { EnrichedTopic } from '../../../types';
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

// ──── Wave Progress Bar ────

function WaveProgressBar({ completed, total }: { completed: number; total: number }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-200">Overall Progress</h3>
        <span className="text-sm font-medium text-gray-300">
          {completed}/{total} pages complete
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3">
        <div
          className="bg-blue-500 h-3 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">{percent}% of content generated</p>
    </div>
  );
}

// ──── Wave Card ────

interface WaveProgress {
  done: number;
  total: number;
  isGenerating: boolean;
}

interface WaveTopicInfo {
  id: string;
  title: string;
  hasBrief: boolean;
  hasContent: boolean;
  isGenerating: boolean;
}

// W1: Wave rationale and action guidance per the plan
const WAVE_CONFIG: Record<number, {
  name: string;
  rationale: string;
  action: string;
  improvement: string;
}> = {
  1: {
    name: 'Your Services (revenue)',
    rationale: 'Revenue pages first — these drive conversions and establish your service authority.',
    action: 'Submit to Search Console, add homepage links, share on business channels.',
    improvement: 'Strengthened in Wave 2 when knowledge content links back to them.',
  },
  2: {
    name: 'Knowledge Content',
    rationale: 'Informational content that supports your service pages and builds topical depth.',
    action: 'Add contextual links from these pages to your Wave 1 service pages.',
    improvement: 'Expect Wave 1 ranking improvements within 4-6 weeks as authority flows.',
  },
  3: {
    name: 'Regional Pages',
    rationale: 'Location-specific content for geographic targeting and local search visibility.',
    action: 'Update Google Business Profiles with links to these regional pages.',
    improvement: 'Regional pages target local search queries and strengthen geographic relevance.',
  },
  4: {
    name: 'Authority Content',
    rationale: 'Expertise-building pages that establish your authority and strengthen all content.',
    action: 'Share on professional networks and link from author bio pages.',
    improvement: 'Completes your topical authority and improves E-E-A-T signals site-wide.',
  },
};

function WaveCard({
  waveNumber,
  progress,
  color,
  active,
  waveTopics,
  selectedTopicIds,
  onToggleSelect,
  onGenerateWave,
  onGenerateTopic,
  onGenerateSelected,
}: {
  waveNumber: number;
  progress: WaveProgress;
  color: string;
  active: boolean;
  waveTopics: WaveTopicInfo[];
  selectedTopicIds: Set<string>;
  onToggleSelect: (topicId: string) => void;
  onGenerateWave: () => void;
  onGenerateTopic: (topicId: string) => void;
  onGenerateSelected: (topicIds: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { done, total, isGenerating } = progress;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = total > 0 && done === total;
  const config = WAVE_CONFIG[waveNumber] ?? null;

  // Count how many selected topics belong to this wave and are actionable
  const waveTopicIds = new Set(waveTopics.map(t => t.id));
  const selectedInWave = [...selectedTopicIds].filter(id => waveTopicIds.has(id));
  const selectableInWave = waveTopics.filter(t => t.hasBrief && !t.hasContent && !t.isGenerating);

  const allSelected = selectableInWave.length > 0 && selectableInWave.every(t => selectedTopicIds.has(t.id));

  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all in this wave
      selectableInWave.forEach(t => {
        if (selectedTopicIds.has(t.id)) onToggleSelect(t.id);
      });
    } else {
      // Select all pending in this wave
      selectableInWave.forEach(t => {
        if (!selectedTopicIds.has(t.id)) onToggleSelect(t.id);
      });
    }
  };

  return (
    <div className={`bg-gray-800 border rounded-lg p-4 ${active ? color : 'border-gray-700 opacity-60'}`}>
      {/* Header row with expand toggle */}
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={() => total > 0 && setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-200 hover:text-white transition-colors"
          disabled={total === 0}
        >
          {total > 0 && (
            <svg
              className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
          Wave {waveNumber}{config ? `: ${config.name}` : ''}
        </button>
        <span className="text-xs text-gray-400">{done}/{total}</span>
      </div>

      {/* W1: Rationale */}
      {config && total > 0 && !expanded && (
        <p className="text-[10px] text-gray-400 mb-2 leading-relaxed">{config.rationale}</p>
      )}

      <div className="w-full bg-gray-700 rounded-full h-1.5 mb-2">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* W1: After-publishing actions */}
      {config && isComplete && total > 0 && !expanded && (
        <div className="mb-2 space-y-1">
          <p className="text-[10px] text-blue-400/80">
            <span className="font-medium">Next:</span> {config.action}
          </p>
          <p className="text-[10px] text-gray-500 italic">{config.improvement}</p>
        </div>
      )}

      {/* Collapsed: Generate Wave button */}
      {!expanded && (
        <button
          type="button"
          onClick={onGenerateWave}
          disabled={!active || isGenerating || isComplete || total === 0}
          className={`w-full text-xs font-medium px-3 py-1.5 rounded transition-colors flex items-center justify-center gap-1.5 ${
            active && !isComplete && total > 0
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isGenerating && (
            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isComplete && total > 0
            ? 'Complete'
            : total === 0
              ? 'No pages'
              : isGenerating
                ? 'Generating...'
                : `Generate Wave ${waveNumber}`}
        </button>
      )}

      {/* Expanded: Topic list with per-topic controls */}
      {expanded && total > 0 && (
        <div className="mt-3 space-y-2">
          {/* Select all + Generate Selected header */}
          <div className="flex items-center justify-between pb-2 border-b border-gray-700/50">
            <label className="flex items-center gap-2 text-[11px] text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                disabled={selectableInWave.length === 0}
                className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              Select all pending ({selectableInWave.length})
            </label>
            <div className="flex items-center gap-2">
              {selectedInWave.length > 0 && (
                <button
                  type="button"
                  onClick={() => onGenerateSelected(selectedInWave)}
                  disabled={isGenerating}
                  className="text-[11px] font-medium px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Selected ({selectedInWave.length})
                </button>
              )}
              <button
                type="button"
                onClick={onGenerateWave}
                disabled={!active || isGenerating || isComplete}
                className={`text-[11px] font-medium px-2.5 py-1 rounded transition-colors ${
                  active && !isComplete
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isComplete ? 'Complete' : isGenerating ? 'Generating...' : 'Generate All'}
              </button>
            </div>
          </div>

          {/* Topic rows */}
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
            {waveTopics.map((topic) => {
              const canGenerate = topic.hasBrief && !topic.hasContent && !topic.isGenerating;
              const canRegenerate = topic.hasBrief && topic.hasContent && !topic.isGenerating;

              return (
                <div
                  key={topic.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-700/30 group"
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedTopicIds.has(topic.id)}
                    onChange={() => onToggleSelect(topic.id)}
                    disabled={!canGenerate}
                    className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-30"
                  />

                  {/* Status indicator */}
                  <span className="flex-shrink-0">
                    {topic.isGenerating ? (
                      <svg className="animate-spin w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : topic.hasContent ? (
                      <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : topic.hasBrief ? (
                      <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-amber-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    )}
                  </span>

                  {/* Title */}
                  <span className={`flex-1 text-[11px] truncate ${
                    topic.hasContent ? 'text-gray-300' : topic.hasBrief ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {topic.title}
                  </span>

                  {/* Status label */}
                  <span className={`text-[10px] flex-shrink-0 ${
                    topic.isGenerating ? 'text-blue-400' :
                    topic.hasContent ? 'text-green-400/70' :
                    topic.hasBrief ? 'text-gray-500' : 'text-amber-500/50'
                  }`}>
                    {topic.isGenerating ? 'generating' :
                     topic.hasContent ? 'done' :
                     topic.hasBrief ? 'pending' : 'no brief'}
                  </span>

                  {/* Per-topic generate / regenerate button */}
                  {(canGenerate || canRegenerate) && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onGenerateTopic(topic.id); }}
                      disabled={topic.isGenerating || isGenerating}
                      className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30 flex-shrink-0"
                    >
                      {canRegenerate ? 'Regenerate' : 'Generate'}
                    </button>
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

// ──── Quality Badge ────

function QualityBadge({ status }: { status: 'PASS' | 'REVIEW' }) {
  const styles: Record<string, string> = {
    PASS: 'bg-green-600/20 text-green-300 border-green-500/30',
    REVIEW: 'bg-amber-600/20 text-amber-300 border-amber-500/30',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${styles[status]}`}>
      {status}
    </span>
  );
}

// ──── Quality Scores Table ────

interface PageQuality {
  name: string;
  score: number;
  words: number;
  status: 'PASS' | 'REVIEW';
  draft?: string;
}

function QualityScoresTable({ pages }: { pages: PageQuality[] }) {
  const [expandedPage, setExpandedPage] = useState<number | null>(null);

  // W4: Extract a preview snippet from the draft (first ~300 chars after title)
  const getPreview = (draft: string): string => {
    // Strip HTML tags and get first paragraph content
    const stripped = draft.replace(/<[^>]+>/g, '').replace(/^#+ .+\n/gm, '').trim();
    const firstChunk = stripped.slice(0, 400);
    const lastPeriod = firstChunk.lastIndexOf('.');
    return lastPeriod > 100 ? firstChunk.slice(0, lastPeriod + 1) : firstChunk + '...';
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-200">Quality Scores</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Page Name</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Score</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Words</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {pages.length > 0 ? (
              pages.map((page, i) => (
                <React.Fragment key={i}>
                  <tr
                    className={`border-b border-gray-700/50 ${page.draft ? 'cursor-pointer hover:bg-gray-800/50' : ''}`}
                    onClick={() => page.draft && setExpandedPage(expandedPage === i ? null : i)}
                  >
                    <td className="px-6 py-3 text-gray-300">
                      <div className="flex items-center gap-2">
                        {page.draft && (
                          <svg
                            className={`w-3.5 h-3.5 text-gray-500 transition-transform flex-shrink-0 ${expandedPage === i ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                        {page.name}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center text-gray-300">{page.score}/100</td>
                    <td className="px-6 py-3 text-center text-gray-400">{page.words.toLocaleString()}</td>
                    <td className="px-6 py-3 text-center">
                      <QualityBadge status={page.status} />
                    </td>
                  </tr>
                  {/* W4: Content preview */}
                  {expandedPage === i && page.draft && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 bg-gray-900/50 border-b border-gray-700/50">
                        <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">
                          {getPreview(page.draft)}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-2">
                          Preview of first section — full content available after export
                        </p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                    </svg>
                    <p className="text-sm text-gray-500">Generate content to see quality scores</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──── Assign topics to waves ────

function getWaveTopics(topics: EnrichedTopic[], waveNumber: number): EnrichedTopic[] {
  return topics.filter(t => {
    const cls = t.topic_class ?? '';
    switch (waveNumber) {
      case 1: return cls.includes('monetization') || cls.includes('transactional') || (t.type === 'core' && !cls);
      case 2: return cls.includes('informational') || cls.includes('educational') || (t.type === 'outer' && !cls);
      case 3: return cls.includes('regional') || cls.includes('local');
      case 4: return cls.includes('authority') || cls.includes('author');
      default: return false;
    }
  });
}

// ──── Main Component ────

const PipelineContentStep: React.FC = () => {
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

  const stepState = getStepState('content');
  const gate = stepState?.gate;

  const topics = activeMap?.topics ?? [];
  const briefs = activeMap?.briefs ?? {};
  const eavs = activeMap?.eavs ?? [];
  const pillars = activeMap?.pillars;

  // Merge per-map business_info overrides with global state (per-map takes precedence)
  const effectiveBusinessInfo = useMemo(() => {
    const mapBI = activeMap?.business_info;
    return mergeMapBusinessInfo(state.businessInfo, mapBI);
  }, [state.businessInfo, activeMap?.business_info]);

  // Action Plan for wave-aware topic assignment
  const { actionPlan } = useActionPlan(topics, effectiveBusinessInfo, pillars, eavs, state.activeMapId);

  // Track content per topic
  const [contentMap, setContentMap] = useState<Record<string, { draft: string; wordCount: number; score: number }>>(() => {
    const initial: Record<string, { draft: string; wordCount: number; score: number }> = {};
    for (const [topicId, brief] of Object.entries(briefs)) {
      if (brief.articleDraft) {
        const words = brief.articleDraft.split(/\s+/).filter(Boolean).length;
        const targetWords = brief.serpAnalysis?.avgWordCount || 1500;
        const completeness = Math.min(98, Math.round((words / targetWords) * 100));
        initial[topicId] = { draft: brief.articleDraft, wordCount: words, score: completeness };
      }
    }
    return initial;
  });

  const [activeGeneratingWave, setActiveGeneratingWave] = useState<number | null>(null);
  const [generatingTopicIds, setGeneratingTopicIds] = useState<Set<string>>(new Set());
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Build topic-to-wave mapping from action plan (must be defined before handleGenerateWave)
  const getWaveTopicsFromPlan = useCallback((waveNumber: number): EnrichedTopic[] => {
    if (actionPlan?.status === 'approved') {
      const topicMap = new Map(topics.map(t => [t.id, t]));
      return actionPlan.entries
        .filter(e => e.wave === waveNumber && !e.removed)
        .map(e => topicMap.get(e.topicId))
        .filter((t): t is EnrichedTopic => !!t);
    }
    return getWaveTopics(topics, waveNumber);
  }, [actionPlan, topics]);

  const handleGenerateWave = useCallback(async (waveNumber: number) => {
    const businessInfo = effectiveBusinessInfo;
    const pillars = activeMap?.pillars;
    const userId = state.user?.id;
    const mapId = state.activeMapId;

    if (!pillars?.centralEntity) {
      setError('Complete the Strategy step first — Central Entity is required.');
      return;
    }
    if (!mapId) {
      setError('No active map found.');
      return;
    }
    if (!userId) {
      setError('You must be logged in to generate content.');
      return;
    }

    const waveTopicsList = getWaveTopicsFromPlan(waveNumber);
    const topicsWithBriefs = waveTopicsList.filter(t => briefs[t.id]);

    if (topicsWithBriefs.length === 0) {
      setError(`No topics with briefs found for Wave ${waveNumber}. Generate briefs in the previous step first.`);
      return;
    }

    const topicsNeedingContent = topicsWithBriefs.filter(t => !contentMap[t.id]);
    if (topicsNeedingContent.length === 0) {
      setError(`All Wave ${waveNumber} pages already have content generated.`);
      return;
    }

    setError(null);
    setActiveGeneratingWave(waveNumber);
    setStepStatus('content', 'in_progress');

    // Create orchestrator with progress callbacks
    const orchestrator = new ContentGenerationOrchestrator(
      businessInfo.supabaseUrl ?? '',
      businessInfo.supabaseAnonKey ?? '',
      {
        onPassStart: (passNumber: number, passName: string) => setProgressText(`Pass ${passNumber}: ${passName}`),
        onPassComplete: (_passNumber: number) => {},
        onSectionStart: (_key: string, heading: string) => setProgressText(`Generating: ${heading}`),
        onSectionComplete: (_key: string) => {},
        onError: (err: Error, _context: string) => console.error('[ContentGen]', err),
        onJobComplete: (_score: number) => {},
      }
    );

    let aborted = false;
    const shouldAbort = () => aborted;

    try {
      for (let i = 0; i < topicsNeedingContent.length; i++) {
        const topic = topicsNeedingContent[i];
        const brief = briefs[topic.id];
        setProgressText(`Generating ${i + 1}/${topicsNeedingContent.length}: ${topic.title}`);

        // Create job
        const job = await orchestrator.createJob(brief.id, mapId, userId);

        // Pass 1: Draft Generation
        await executePass1(
          orchestrator,
          job,
          brief,
          businessInfo,
          (_key: string, _heading: string) => {},
          shouldAbort
        );

        // Pass 2: Header Optimization
        await executePass2(orchestrator, job, brief, businessInfo, undefined, shouldAbort);

        // Pass 3: Lists & Tables
        await executePass3(orchestrator, job, brief, businessInfo, undefined, shouldAbort);

        // Assemble the final draft
        const draft = await orchestrator.assembleDraft(job.id);
        const wordCount = draft.split(/\s+/).filter(Boolean).length;

        const targetWords = brief.serpAnalysis?.avgWordCount || 1500;
        const completeness = Math.min(98, Math.round((wordCount / targetWords) * 100));
        setContentMap(prev => ({ ...prev, [topic.id]: { draft, wordCount, score: completeness } }));

        // Sync draft back to brief
        await orchestrator.syncDraftToBrief(brief.id, draft);

        // Dispatch to global state so briefs reflect the articleDraft
        if (state.activeMapId) {
          dispatch({
            type: 'UPDATE_MAP_DATA',
            payload: {
              mapId: state.activeMapId,
              data: {
                briefs: {
                  ...activeMap?.briefs,
                  [topic.id]: { ...brief, articleDraft: draft },
                },
              },
            },
          });
        }
      }

      setStepStatus('content', 'pending_approval');
    } catch (err) {
      aborted = true;
      const message = err instanceof Error ? err.message : 'Content generation failed';
      setError(`Wave ${waveNumber}: ${message}`);
      setStepStatus('content', 'in_progress');
    } finally {
      setActiveGeneratingWave(null);
      setProgressText('');
    }
  }, [state, activeMap, topics, briefs, contentMap, setStepStatus, effectiveBusinessInfo, dispatch, getWaveTopicsFromPlan]);

  // Per-topic generation handler: generates content for specific topic IDs
  const handleGenerateTopics = useCallback(async (topicIds: string[]) => {
    const businessInfo = effectiveBusinessInfo;
    const currentPillars = activeMap?.pillars;
    const userId = state.user?.id;
    const mapId = state.activeMapId;

    if (!currentPillars?.centralEntity) {
      setError('Complete the Strategy step first — Central Entity is required.');
      return;
    }
    if (!mapId) {
      setError('No active map found.');
      return;
    }
    if (!userId) {
      setError('You must be logged in to generate content.');
      return;
    }

    const topicMap = new Map(topics.map(t => [t.id, t]));
    const topicsToGenerate = topicIds
      .map(id => topicMap.get(id))
      .filter((t): t is EnrichedTopic => !!t && !!briefs[t.id]);

    if (topicsToGenerate.length === 0) {
      setError('No valid topics with briefs found in selection.');
      return;
    }

    setError(null);
    setGeneratingTopicIds(prev => {
      const next = new Set(prev);
      topicsToGenerate.forEach(t => next.add(t.id));
      return next;
    });
    setStepStatus('content', 'in_progress');

    const orchestrator = new ContentGenerationOrchestrator(
      businessInfo.supabaseUrl ?? '',
      businessInfo.supabaseAnonKey ?? '',
      {
        onPassStart: (passNumber: number, passName: string) => setProgressText(`Pass ${passNumber}: ${passName}`),
        onPassComplete: (_passNumber: number) => {},
        onSectionStart: (_key: string, heading: string) => setProgressText(`Generating: ${heading}`),
        onSectionComplete: (_key: string) => {},
        onError: (err: Error, _context: string) => console.error('[ContentGen]', err),
        onJobComplete: (_score: number) => {},
      }
    );

    let aborted = false;
    const shouldAbort = () => aborted;

    try {
      for (let i = 0; i < topicsToGenerate.length; i++) {
        const topic = topicsToGenerate[i];
        const brief = briefs[topic.id];
        setProgressText(`Generating ${i + 1}/${topicsToGenerate.length}: ${topic.title}`);

        const job = await orchestrator.createJob(brief.id, mapId, userId);

        await executePass1(orchestrator, job, brief, businessInfo, (_key: string, _heading: string) => {}, shouldAbort);
        await executePass2(orchestrator, job, brief, businessInfo, undefined, shouldAbort);
        await executePass3(orchestrator, job, brief, businessInfo, undefined, shouldAbort);

        const draft = await orchestrator.assembleDraft(job.id);
        const wordCount = draft.split(/\s+/).filter(Boolean).length;
        const targetWords = brief.serpAnalysis?.avgWordCount || 1500;
        const completeness = Math.min(98, Math.round((wordCount / targetWords) * 100));

        setContentMap(prev => ({ ...prev, [topic.id]: { draft, wordCount, score: completeness } }));
        setGeneratingTopicIds(prev => {
          const next = new Set(prev);
          next.delete(topic.id);
          return next;
        });

        await orchestrator.syncDraftToBrief(brief.id, draft);

        if (state.activeMapId) {
          dispatch({
            type: 'UPDATE_MAP_DATA',
            payload: {
              mapId: state.activeMapId,
              data: {
                briefs: {
                  ...activeMap?.briefs,
                  [topic.id]: { ...brief, articleDraft: draft },
                },
              },
            },
          });
        }
      }

      // Clear selection for completed topics
      setSelectedTopicIds(prev => {
        const next = new Set(prev);
        topicsToGenerate.forEach(t => next.delete(t.id));
        return next;
      });

      setStepStatus('content', 'pending_approval');
    } catch (err) {
      aborted = true;
      const message = err instanceof Error ? err.message : 'Content generation failed';
      setError(message);
      setStepStatus('content', 'in_progress');
    } finally {
      setGeneratingTopicIds(prev => {
        const next = new Set(prev);
        topicsToGenerate.forEach(t => next.delete(t.id));
        return next;
      });
      setProgressText('');
    }
  }, [state, activeMap, topics, briefs, setStepStatus, effectiveBusinessInfo, dispatch]);

  const handleToggleSelect = useCallback((topicId: string) => {
    setSelectedTopicIds(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  }, []);

  // Build wave progress data — use action plan waves when available, else fallback
  const WAVE_COLOR_PALETTE = [
    'border-green-500/50', 'border-blue-500/50', 'border-amber-500/50', 'border-purple-500/50',
    'border-sky-500/50', 'border-rose-500/50', 'border-teal-500/50', 'border-orange-500/50',
  ];

  const waveConfigs = useMemo(() => {
    if (actionPlan?.status === 'approved' && actionPlan.waveDefinitions?.length) {
      return actionPlan.waveDefinitions.map(wd => ({
        number: wd.number,
        color: WAVE_COLOR_PALETTE[(wd.number - 1) % WAVE_COLOR_PALETTE.length],
        name: wd.name,
      }));
    }
    return [
      { number: 1, color: 'border-green-500/50', name: 'Your Services (revenue)' },
      { number: 2, color: 'border-blue-500/50', name: 'Knowledge Content' },
      { number: 3, color: 'border-amber-500/50', name: 'Regional Pages' },
      { number: 4, color: 'border-purple-500/50', name: 'Authority Content' },
    ];
  }, [actionPlan]);

  const waveProgress = waveConfigs.map(({ number, color }) => {
    const waveTopicsList = getWaveTopicsFromPlan(number);
    const withBriefs = waveTopicsList.filter(t => briefs[t.id]);
    const done = withBriefs.filter(t => contentMap[t.id]).length;
    const waveTopicInfos: WaveTopicInfo[] = waveTopicsList.map(t => ({
      id: t.id,
      title: t.title,
      hasBrief: !!briefs[t.id],
      hasContent: !!contentMap[t.id],
      isGenerating: generatingTopicIds.has(t.id),
    }));
    return {
      number,
      color,
      waveTopics: waveTopicInfos,
      progress: {
        done,
        total: withBriefs.length,
        isGenerating: activeGeneratingWave === number || waveTopicInfos.some(t => t.isGenerating),
      },
    };
  });

  const totalDone = Object.keys(contentMap).length;
  const totalWithBriefs = Object.keys(briefs).length;
  const activeWave = waveProgress.find(w => w.progress.total > 0 && w.progress.done < w.progress.total)?.number ?? 1;

  const qualityPages: PageQuality[] = Object.entries(contentMap).map(([topicId, data]) => {
    const topic = topics.find(t => t.id === topicId);
    return {
      name: topic?.title || (topicId.length > 20 ? '[Missing topic]' : topicId),
      score: data.score,
      words: data.wordCount,
      status: data.score >= 70 ? 'PASS' : 'REVIEW',
      draft: data.draft, // W4: content preview
    };
  });

  const avgQuality = qualityPages.length > 0
    ? Math.round(qualityPages.reduce((sum, p) => sum + p.score, 0) / qualityPages.length)
    : 0;
  const totalWords = Object.values(contentMap).reduce((sum, c) => sum + c.wordCount, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Content Writing</h2>
        <p className="text-sm text-gray-400 mt-1">
          Multi-pass content generation with wave-based orchestration and quality scoring
        </p>
      </div>

      {/* Prerequisite checks */}
      {topics.length === 0 && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-amber-300">
            No topics found. Complete the Topical Map step first.
          </p>
        </div>
      )}

      {topics.length > 0 && totalWithBriefs === 0 && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-amber-300">
            No briefs found. Complete the Content Briefs step first.
          </p>
        </div>
      )}

      {/* Brief completion gate — warn when waves have less than 80% briefs */}
      {topics.length > 0 && totalWithBriefs > 0 && (() => {
        const missingBriefWaves = waveProgress.filter(wave => {
          const waveTopicsList = wave.waveTopics;
          if (waveTopicsList.length === 0) return false;
          const briefedCount = waveTopicsList.filter(t => t.hasBrief).length;
          return briefedCount < waveTopicsList.length * 0.8;
        });
        if (missingBriefWaves.length === 0) return null;
        return (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
            <h3 className="font-medium text-yellow-300 text-sm">Brief Completion Required</h3>
            <p className="text-xs text-yellow-400/80 mt-1">
              Generate briefs for all waves before starting content generation.
            </p>
            <ul className="mt-2 space-y-1">
              {missingBriefWaves.map(wave => {
                const briefed = wave.waveTopics.filter(t => t.hasBrief).length;
                return (
                  <li key={wave.number} className="text-xs text-yellow-400/70">
                    Wave {wave.number}: {briefed}/{wave.waveTopics.length} topics briefed
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })()}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Progress */}
      {(activeGeneratingWave !== null || generatingTopicIds.size > 0) && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="animate-spin w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-blue-300">
            {progressText || (activeGeneratingWave !== null
              ? `Generating Wave ${activeGeneratingWave} content...`
              : `Generating content for ${generatingTopicIds.size} topic(s)...`)}
          </p>
        </div>
      )}

      {/* Overall Wave Progress */}
      <WaveProgressBar completed={totalDone} total={totalWithBriefs} />

      {/* Wave Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {waveProgress.map((wave) => (
          <WaveCard
            key={wave.number}
            waveNumber={wave.number}
            progress={wave.progress}
            color={wave.color}
            active={wave.number === activeWave || wave.progress.total > 0}
            waveTopics={wave.waveTopics}
            selectedTopicIds={selectedTopicIds}
            onToggleSelect={handleToggleSelect}
            onGenerateWave={() => handleGenerateWave(wave.number)}
            onGenerateTopic={(topicId) => handleGenerateTopics([topicId])}
            onGenerateSelected={(topicIds) => handleGenerateTopics(topicIds)}
          />
        ))}
      </div>

      {/* Quality Scores Table */}
      <QualityScoresTable pages={qualityPages} />

      {/* Approval Gate */}
      {gate && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
        <ApprovalGate
          step="content"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => approveGate('content')}
          onReject={(reason) => rejectGate('content', reason)}
          onRevise={() => reviseStep('content')}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Pages Complete', value: `${totalDone}/${totalWithBriefs}`, color: totalDone > 0 ? 'green' : 'gray' },
            { label: 'Avg. Quality', value: avgQuality > 0 ? `${avgQuality}/100` : '--', color: avgQuality >= 70 ? 'green' : avgQuality > 0 ? 'amber' : 'gray' },
            { label: 'Total Words', value: totalWords > 0 ? totalWords.toLocaleString() : 0, color: totalWords > 0 ? 'blue' : 'gray' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineContentStep;
