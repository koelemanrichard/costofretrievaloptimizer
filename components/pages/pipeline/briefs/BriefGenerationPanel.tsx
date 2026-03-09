import React, { useState, useMemo, useCallback } from 'react';
import type { EnrichedTopic, ContentBrief, BriefSection } from '../../../../types';
import type { ActionPlan, ActionPlanEntry, BriefQualityReport } from '../../../../types/actionPlan';

// ──── Extracted inline components from original PipelineBriefsStep ────

function StatusBadge({ status }: { status: 'Pending' | 'Generating' | 'Generated' | 'Reviewed' | 'Failed' | 'Approved' | 'Rejected' }) {
  const styles: Record<string, string> = {
    Pending: 'bg-gray-600/20 text-gray-400 border-gray-600/30',
    Generating: 'bg-amber-600/20 text-amber-300 border-amber-500/30',
    Generated: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
    Reviewed: 'bg-green-600/20 text-green-300 border-green-500/30',
    Failed: 'bg-red-600/20 text-red-300 border-red-500/30',
    Approved: 'bg-green-600/20 text-green-300 border-green-500/30',
    Rejected: 'bg-red-600/20 text-red-300 border-red-500/30',
  };

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${styles[status] || styles.Pending} flex items-center gap-1.5`}>
      {status === 'Generating' && (
        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {status}
    </span>
  );
}

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

function BriefCard({ topic, brief, actionContext, generatingTopicId, qualityReport, briefStatus, eavTotal, onGenerate, onApprove, onReject }: {
  topic: EnrichedTopic;
  brief: ContentBrief | null;
  actionContext?: string;
  generatingTopicId?: string | null;
  qualityReport?: BriefQualityReport;
  briefStatus?: string;
  eavTotal?: number;
  onGenerate?: (topicId: string) => void;
  onApprove?: (topicId: string) => void;
  onReject?: (topicId: string, reason: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const sections = brief?.structured_outline ?? [];
  const sectionCount = sections.length;
  const isGenerating = generatingTopicId === topic.id;
  const isPending = !brief && !isGenerating;

  const frameworkLabel = topic.topic_class === 'monetization' ? 'revenue page' : 'authority page';
  const labelColor = topic.topic_class === 'monetization' ? 'text-emerald-400/60' : 'text-sky-400/60';

  const formatCounts = { prose: 0, table: 0, list: 0 };
  for (const s of sections) {
    const fmt = (s.format_code || (s as any).content_type || (s as any).format || '').toLowerCase();
    if (fmt.includes('table')) formatCounts.table++;
    else if (fmt.includes('list') || fmt === 'listing' || fmt === 'paa') formatCounts.list++;
    else formatCounts.prose++;
  }
  const formatSummary = [
    formatCounts.prose > 0 ? `${formatCounts.prose} prose` : '',
    formatCounts.table > 0 ? `${formatCounts.table} table${formatCounts.table > 1 ? 's' : ''}` : '',
    formatCounts.list > 0 ? `${formatCounts.list} list${formatCounts.list > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join(', ');

  const snippetTargets = sections.filter(s => {
    const fmt = (s.format_code || '').toUpperCase();
    return fmt === 'FS' || fmt === 'PAA';
  }).length;

  let eavCount = 0;
  for (const s of sections) eavCount += (s.mapped_eavs?.length ?? 0);
  if (brief?.contextualVectors) eavCount = Math.max(eavCount, brief.contextualVectors.length);

  const wordTarget = topic.cluster_role === 'pillar' ? '1,200-1,500' : '800-1,200';

  const getSnippetType = (section: BriefSection): string | null => {
    const fmt = (section.format_code || '').toUpperCase();
    if (fmt === 'FS') return 'paragraph';
    if (fmt === 'PAA') return 'list';
    if (fmt === 'TABLE') return 'table';
    if (fmt === 'LISTING') return 'list';
    return null;
  };

  return (
    <div className={`bg-gray-900 border rounded-md overflow-hidden ${isGenerating ? 'border-amber-500/40 animate-pulse' : 'border-gray-700'} ${isPending ? 'opacity-60' : ''}`}>
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
            {actionContext && (
              <span className="text-[9px] bg-blue-900/15 text-blue-300 border border-blue-700/20 rounded px-1 py-0.5 flex-shrink-0">
                {actionContext}
              </span>
            )}
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
                  {eavTotal && eavTotal > 0 ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-[10px] text-blue-400">{eavCount}/{eavTotal} EAVs</span>
                      <span className="inline-block w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden align-middle">
                        <span
                          className={`block h-full rounded-full transition-all ${
                            eavCount >= eavTotal ? 'bg-green-500' :
                            eavCount >= eavTotal * 0.5 ? 'bg-blue-500' :
                            'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.round((eavCount / eavTotal) * 100))}%` }}
                        />
                      </span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-blue-400">{eavCount} facts</span>
                  )}
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
          {qualityReport && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
              qualityReport.score >= 85 ? 'bg-green-900/20 text-green-300 border-green-500/30' :
              qualityReport.score >= 60 ? 'bg-amber-900/20 text-amber-300 border-amber-500/30' :
              'bg-red-900/20 text-red-300 border-red-500/30'
            }`}>
              {qualityReport.score}%
            </span>
          )}
          <StatusBadge status={
            isGenerating ? 'Generating' :
            briefStatus === 'failed' ? 'Failed' :
            briefStatus === 'approved' ? 'Approved' :
            briefStatus === 'rejected' ? 'Rejected' :
            isPending ? 'Pending' : 'Generated'
          } />
          {/* Per-topic generate/regenerate button */}
          {onGenerate && !isGenerating && (isPending || briefStatus === 'failed' || brief) && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onGenerate(topic.id); }}
              className="text-[10px] bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded px-1.5 py-0.5 hover:bg-blue-600/30 transition-colors"
              title={brief ? 'Regenerate' : 'Generate'}
            >
              {brief ? 'Regen' : 'Gen'}
            </button>
          )}
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

      {expanded && brief && (
        <div className="border-t border-gray-700/50 px-4 py-3 space-y-3">
          {sections.length > 0 && (
            <div className="space-y-1">
              {sections.map((section, i) => {
                const snippetType = getSnippetType(section);
                const fmt = section.format_code || (section as any).content_type || (section as any).format || 'PROSE';
                return (
                  <div key={i} className="flex items-center gap-2 text-xs" style={{ paddingLeft: `${(section.level - 1) * 16}px` }}>
                    <span className="text-gray-500 font-mono text-[10px] w-6 flex-shrink-0">H{section.level}</span>
                    <span className="text-gray-300 truncate flex-1">{section.heading}</span>
                    <FormatIcon format={fmt} />
                    {snippetType && (
                      <span className="text-[9px] bg-amber-900/20 text-amber-300 border border-amber-700/30 rounded px-1 py-0.5">
                        Google answer: {snippetType}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Quality checks */}
          {qualityReport && (
            <div className="space-y-1 pt-2 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-500 uppercase font-medium">Quality Checks ({qualityReport.passCount}/{qualityReport.checks.length})</p>
                {qualityReport.componentScores && (
                  <div className="flex items-center gap-2">
                    {Object.entries(qualityReport.componentScores).map(([key, score]) => (
                      <span key={key} className={`text-[9px] px-1 py-0.5 rounded ${
                        score >= 85 ? 'bg-green-900/20 text-green-400' :
                        score >= 50 ? 'bg-amber-900/20 text-amber-400' :
                        'bg-red-900/20 text-red-400'
                      }`}>
                        {key.replace(/([A-Z])/g, ' $1').trim().split(' ')[0]}: {score}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {qualityReport.checks.map((check, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <span className={check.passed ? 'text-green-400' : 'text-red-400'}>
                    {check.passed ? '\u2713' : '\u2717'}
                  </span>
                  <span className="text-gray-400">{check.name}</span>
                  <span className="text-gray-600 truncate flex-1">{check.details}</span>
                </div>
              ))}
            </div>
          )}

          {/* Approve / Reject actions */}
          {brief && briefStatus !== 'approved' && (onApprove || onReject) && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
              {onApprove && (
                <button
                  type="button"
                  onClick={() => onApprove(topic.id)}
                  className="text-[10px] bg-green-600/20 text-green-300 border border-green-500/30 rounded px-2 py-1 hover:bg-green-600/30 transition-colors"
                >
                  Approve
                </button>
              )}
              {onReject && !rejecting && (
                <button
                  type="button"
                  onClick={() => setRejecting(true)}
                  className="text-[10px] bg-red-600/20 text-red-300 border border-red-500/30 rounded px-2 py-1 hover:bg-red-600/30 transition-colors"
                >
                  Reject
                </button>
              )}
              {onReject && rejecting && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Rejection reason..."
                    className="text-[10px] bg-gray-800 text-gray-200 border border-red-500/30 rounded px-2 py-1 w-48 focus:outline-none focus:border-red-400/50 placeholder-gray-600"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && rejectionReason.trim()) {
                        onReject(topic.id, rejectionReason.trim());
                        setRejecting(false);
                        setRejectionReason('');
                      } else if (e.key === 'Escape') {
                        setRejecting(false);
                        setRejectionReason('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (rejectionReason.trim()) {
                        onReject(topic.id, rejectionReason.trim());
                        setRejecting(false);
                        setRejectionReason('');
                      }
                    }}
                    disabled={!rejectionReason.trim()}
                    className="text-[10px] bg-red-600/20 text-red-300 border border-red-500/30 rounded px-1.5 py-1 hover:bg-red-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRejecting(false); setRejectionReason(''); }}
                    className="text-[10px] bg-gray-700/30 text-gray-400 border border-gray-600/30 rounded px-1.5 py-1 hover:bg-gray-700/50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──── Wave Quality ────

function computeWaveQuality(briefs: Array<{ topic: EnrichedTopic; brief: ContentBrief | null }>): number {
  const generated = briefs.filter(b => b.brief !== null);
  if (generated.length === 0) return 0;

  let totalScore = 0;
  for (const { brief } of generated) {
    if (!brief) continue;
    let score = 0;
    const sections = brief.structured_outline ?? [];
    if (sections.length >= 3) score += 25;
    else if (sections.length > 0) score += 15;
    const eavCount = sections.reduce((sum, s) => sum + (s.mapped_eavs?.length ?? 0), 0);
    if (eavCount >= 3) score += 25;
    else if (eavCount > 0) score += 15;
    const hasLinks = brief.contextualBridge || sections.some(s => (s as any).internal_links?.length > 0);
    if (hasLinks) score += 25;
    const fsCount = sections.filter(s => (s.format_code || '').toUpperCase() === 'FS' || (s.format_code || '').toUpperCase() === 'PAA').length;
    if (fsCount >= 2) score += 25;
    else if (fsCount > 0) score += 15;
    totalScore += score;
  }

  return Math.round(totalScore / generated.length);
}

// ──── Wave Brief Group ────

function WaveBriefGroup({
  waveNumber,
  briefs,
  onGenerateWave,
  onGenerateTopics,
  isGenerating,
  actionEntries,
  generatingTopicId,
  qualityReports,
  onApproveBrief,
  onRejectBrief,
  eavTotal,
}: {
  waveNumber: number;
  briefs: Array<{ topic: EnrichedTopic; brief: ContentBrief | null }>;
  onGenerateWave: (waveNumber: number) => void;
  onGenerateTopics?: (topicIds: string[]) => void;
  isGenerating: boolean;
  actionEntries?: Map<string, ActionPlanEntry>;
  generatingTopicId?: string | null;
  qualityReports?: Record<string, BriefQualityReport>;
  onApproveBrief?: (topicId: string) => void;
  onRejectBrief?: (topicId: string, reason: string) => void;
  eavTotal?: number;
}) {
  const [expanded, setExpanded] = useState(waveNumber === 1);
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((topicId: string) => {
    setSelectedTopicIds(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedTopicIds.size === briefs.length) {
      setSelectedTopicIds(new Set());
    } else {
      setSelectedTopicIds(new Set(briefs.map(b => b.topic.id)));
    }
  }, [briefs, selectedTopicIds.size]);

  const handleGenerateSelected = useCallback(() => {
    if (onGenerateTopics && selectedTopicIds.size > 0) {
      onGenerateTopics([...selectedTopicIds]);
      setSelectedTopicIds(new Set());
    }
  }, [onGenerateTopics, selectedTopicIds]);

  const handleApproveAllPassing = useCallback(() => {
    if (!onApproveBrief || !qualityReports) return;
    for (const b of briefs) {
      const report = qualityReports[b.topic.id];
      if (report && report.score >= 85 && b.brief) {
        onApproveBrief(b.topic.id);
      }
    }
  }, [briefs, qualityReports, onApproveBrief]);

  const WAVE_BORDER_PALETTE = [
    'border-emerald-500/50', 'border-blue-500/50', 'border-amber-500/50', 'border-sky-500/50',
    'border-purple-500/50', 'border-rose-500/50', 'border-teal-500/50', 'border-orange-500/50',
    'border-indigo-500/50', 'border-lime-500/50',
  ];
  const waveBorderColor = WAVE_BORDER_PALETTE[(waveNumber - 1) % WAVE_BORDER_PALETTE.length];

  const generatedCount = briefs.filter(b => b.brief !== null).length;
  const qualityScore = computeWaveQuality(briefs);
  const qualityThreshold = 85;
  const qualityOk = qualityScore >= qualityThreshold;

  return (
    <div className={`border rounded-lg ${waveBorderColor}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <h4 className="text-sm font-medium text-gray-200">Wave {waveNumber}</h4>
          <span className="text-xs text-gray-500">
            {generatedCount}/{briefs.length} briefs generated
          </span>
          {generatedCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
              qualityOk
                ? 'bg-green-900/20 text-green-300 border-green-500/30'
                : 'bg-amber-900/20 text-amber-300 border-amber-500/30'
            }`}>
              {qualityScore}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedTopicIds.size > 0 && onGenerateTopics && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleGenerateSelected(); }}
              disabled={isGenerating}
              className="text-xs bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded px-2.5 py-1 hover:bg-purple-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Selected ({selectedTopicIds.size})
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onGenerateWave(waveNumber);
            }}
            disabled={isGenerating || briefs.length === 0}
            className="text-xs bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded px-2.5 py-1 hover:bg-blue-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate All'}
          </button>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
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

          {/* Select all + Approve all passing */}
          {briefs.length > 0 && (
            <div className="flex items-center gap-3 py-1">
              <label className="flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedTopicIds.size === briefs.length && briefs.length > 0}
                  onChange={toggleSelectAll}
                  className="w-3 h-3 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-0"
                />
                Select all
              </label>
              {onApproveBrief && qualityReports && generatedCount > 0 && (
                <button
                  type="button"
                  onClick={handleApproveAllPassing}
                  className="text-[10px] text-green-400 hover:text-green-300 transition-colors"
                >
                  Approve all passing (&ge;85%)
                </button>
              )}
            </div>
          )}

          {briefs.length > 0 ? (
            briefs.map((item, i) => {
              const entry = actionEntries?.get(item.topic.id);
              const actionContext = entry?.actionType && entry.actionType !== 'CREATE_NEW'
                ? entry.actionType.replace('_', ' ').toLowerCase()
                : undefined;
              return (
                <div key={i} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedTopicIds.has(item.topic.id)}
                    onChange={() => toggleSelection(item.topic.id)}
                    className="w-3 h-3 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-0 mt-3 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <BriefCard
                      topic={item.topic}
                      brief={item.brief}
                      actionContext={actionContext}
                      generatingTopicId={generatingTopicId}
                      qualityReport={qualityReports?.[item.topic.id]}
                      briefStatus={entry?.config?.briefStatus}
                      eavTotal={eavTotal}
                      onGenerate={onGenerateTopics ? (id) => onGenerateTopics([id]) : undefined}
                      onApprove={onApproveBrief}
                      onReject={onRejectBrief}
                    />
                  </div>
                </div>
              );
            })
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

// ──── Main Panel ────

interface BriefGenerationPanelProps {
  actionPlan: ActionPlan | null;
  topics: EnrichedTopic[];
  existingBriefs: Record<string, ContentBrief>;
  waveTopics: Map<number, EnrichedTopic[]>;
  isGenerating: boolean;
  generatingWave: number | null;
  generatingTopicId?: string | null;
  onGenerateWave: (waveNumber: number) => void;
  onGenerateTopics?: (topicIds: string[]) => void;
  onApproveBrief?: (topicId: string) => void;
  onRejectBrief?: (topicId: string, reason: string) => void;
  qualityReports?: Record<string, BriefQualityReport>;
  eavTotal?: number;
  language: string;
}

export function BriefGenerationPanel({
  actionPlan,
  topics,
  existingBriefs,
  waveTopics,
  isGenerating,
  generatingWave,
  generatingTopicId,
  onGenerateWave,
  onGenerateTopics,
  onApproveBrief,
  onRejectBrief,
  qualityReports,
  eavTotal,
  language,
}: BriefGenerationPanelProps) {
  const isLocked = !actionPlan || actionPlan.status !== 'approved';

  // Build action entries map for context badges
  const actionEntries = useMemo(() => {
    if (!actionPlan) return new Map<string, ActionPlanEntry>();
    return new Map(actionPlan.entries.map(e => [e.topicId, e]));
  }, [actionPlan]);

  // Wave definitions from AI or defaults
  const waveDefinitions = useMemo(() => {
    if (actionPlan?.waveDefinitions?.length) return actionPlan.waveDefinitions;
    return [
      { number: 1, name: 'Foundation', description: '' },
      { number: 2, name: 'Knowledge', description: '' },
      { number: 3, name: 'Extension', description: '' },
      { number: 4, name: 'Authority', description: '' },
    ];
  }, [actionPlan?.waveDefinitions]);

  // Build wave data using the action plan's wave assignments if available
  const waveData = useMemo(() => {
    if (actionPlan && actionPlan.status === 'approved') {
      // Use action plan's wave assignments
      const byWave: Record<number, EnrichedTopic[]> = {};
      for (const wd of waveDefinitions) byWave[wd.number] = [];
      const topicMap = new Map(topics.map(t => [t.id, t]));
      for (const entry of actionPlan.entries) {
        if (entry.removed) continue;
        const topic = topicMap.get(entry.topicId);
        if (topic) {
          if (!byWave[entry.wave]) byWave[entry.wave] = [];
          byWave[entry.wave].push(topic);
        }
      }
      return waveDefinitions.map(wd => ({
        waveNumber: wd.number,
        briefs: (byWave[wd.number] || []).map(t => ({
          topic: t,
          brief: existingBriefs[t.id] ?? null,
        })),
      }));
    }

    // Fallback: use waveTopics from parent
    return waveDefinitions.map(wd => ({
      waveNumber: wd.number,
      briefs: (waveTopics.get(wd.number) || []).map(t => ({
        topic: t,
        brief: existingBriefs[t.id] ?? null,
      })),
    }));
  }, [actionPlan, topics, existingBriefs, waveTopics, waveDefinitions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Brief Generation</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {isLocked
              ? 'Approve the action plan above to enable brief generation'
              : 'Generate content specs per wave'}
          </p>
        </div>
      </div>

      {isLocked && (
        <div className="bg-gray-800/50 border border-gray-700/50 border-dashed rounded-lg p-6 text-center">
          <svg className="w-8 h-8 text-gray-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <p className="text-xs text-gray-500">
            Generate and approve an action plan to unlock brief generation
          </p>
        </div>
      )}

      {!isLocked && (
        <div className="space-y-4">
          {waveData.map((wave) => (
            <WaveBriefGroup
              key={wave.waveNumber}
              waveNumber={wave.waveNumber}
              briefs={wave.briefs}
              onGenerateWave={onGenerateWave}
              onGenerateTopics={onGenerateTopics}
              isGenerating={isGenerating && generatingWave === wave.waveNumber}
              actionEntries={actionEntries}
              generatingTopicId={generatingTopicId}
              qualityReports={qualityReports}
              onApproveBrief={onApproveBrief}
              onRejectBrief={onRejectBrief}
              eavTotal={eavTotal}
            />
          ))}
        </div>
      )}
    </div>
  );
}
