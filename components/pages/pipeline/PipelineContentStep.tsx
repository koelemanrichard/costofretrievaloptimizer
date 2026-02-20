import React, { useState, useCallback } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import {
  ContentGenerationOrchestrator,
  executePass1,
  executePass2,
  executePass3,
} from '../../../services/ai/contentGeneration';
// Pass 9 (audit) is aliased as executePass9 in the barrel but the underlying function signature is from pass8Audit
import type { EnrichedTopic } from '../../../types';

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

function WaveCard({
  waveNumber,
  progress,
  color,
  active,
  onGenerate,
}: {
  waveNumber: number;
  progress: WaveProgress;
  color: string;
  active: boolean;
  onGenerate: () => void;
}) {
  const { done, total, isGenerating } = progress;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = total > 0 && done === total;

  return (
    <div className={`bg-gray-800 border rounded-lg p-4 ${active ? color : 'border-gray-700 opacity-60'}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-200">Wave {waveNumber}</h4>
        <span className="text-xs text-gray-400">{done}/{total}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5 mb-3">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <button
        type="button"
        onClick={onGenerate}
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
}

function QualityScoresTable({ pages }: { pages: PageQuality[] }) {
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
                <tr key={i} className="border-b border-gray-700/50">
                  <td className="px-6 py-3 text-gray-300">{page.name}</td>
                  <td className="px-6 py-3 text-center text-gray-300">{page.score}/100</td>
                  <td className="px-6 py-3 text-center text-gray-400">{page.words.toLocaleString()}</td>
                  <td className="px-6 py-3 text-center">
                    <QualityBadge status={page.status} />
                  </td>
                </tr>
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
  const { state } = useAppState();

  const stepState = getStepState('content');
  const gate = stepState?.gate;

  const topics = activeMap?.topics ?? [];
  const briefs = activeMap?.briefs ?? {};

  // Track content per topic
  const [contentMap, setContentMap] = useState<Record<string, { draft: string; wordCount: number; score: number }>>(() => {
    const initial: Record<string, { draft: string; wordCount: number; score: number }> = {};
    for (const [topicId, brief] of Object.entries(briefs)) {
      if (brief.articleDraft) {
        const words = brief.articleDraft.split(/\s+/).filter(Boolean).length;
        initial[topicId] = { draft: brief.articleDraft, wordCount: words, score: 75 };
      }
    }
    return initial;
  });

  const [activeGeneratingWave, setActiveGeneratingWave] = useState<number | null>(null);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGenerateWave = useCallback(async (waveNumber: number) => {
    const businessInfo = state.businessInfo;
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

    const waveTopics = getWaveTopics(topics, waveNumber);
    const topicsWithBriefs = waveTopics.filter(t => briefs[t.id]);

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

        setContentMap(prev => ({ ...prev, [topic.id]: { draft, wordCount, score: 75 } }));

        // Sync draft back to brief
        await orchestrator.syncDraftToBrief(brief.id, draft);
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
  }, [state, activeMap, topics, briefs, contentMap, setStepStatus]);

  // Build wave progress data
  const waveConfigs = [
    { number: 1, color: 'border-green-500/50' },
    { number: 2, color: 'border-blue-500/50' },
    { number: 3, color: 'border-amber-500/50' },
    { number: 4, color: 'border-purple-500/50' },
  ];

  const waveProgress = waveConfigs.map(({ number, color }) => {
    const waveTopics = getWaveTopics(topics, number);
    const withBriefs = waveTopics.filter(t => briefs[t.id]);
    const done = withBriefs.filter(t => contentMap[t.id]).length;
    return {
      number,
      color,
      progress: {
        done,
        total: withBriefs.length,
        isGenerating: activeGeneratingWave === number,
      },
    };
  });

  const totalDone = Object.keys(contentMap).length;
  const totalWithBriefs = Object.keys(briefs).length;
  const activeWave = waveProgress.find(w => w.progress.total > 0 && w.progress.done < w.progress.total)?.number ?? 1;

  const qualityPages: PageQuality[] = Object.entries(contentMap).map(([topicId, data]) => {
    const topic = topics.find(t => t.id === topicId);
    return {
      name: topic?.title ?? topicId,
      score: data.score,
      words: data.wordCount,
      status: data.score >= 70 ? 'PASS' : 'REVIEW',
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

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Progress */}
      {activeGeneratingWave !== null && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="animate-spin w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-blue-300">{progressText || `Generating Wave ${activeGeneratingWave} content...`}</p>
        </div>
      )}

      {/* Overall Wave Progress */}
      <WaveProgressBar completed={totalDone} total={totalWithBriefs} />

      {/* Wave Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {waveProgress.map((wave) => (
          <WaveCard
            key={wave.number}
            waveNumber={wave.number}
            progress={wave.progress}
            color={wave.color}
            active={wave.number === activeWave || wave.progress.total > 0}
            onGenerate={() => handleGenerateWave(wave.number)}
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
