import React, { useState, useMemo, useCallback } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import { useActionPlan } from '../../../hooks/useActionPlan';
import ApprovalGate from '../../pipeline/ApprovalGate';
import { generateContentBrief, suggestResponseCode } from '../../../services/ai/briefGeneration';
import { reviewBriefQuality } from '../../../services/ai/briefQualityReview';
import { improveBrief } from '../../../services/ai/briefImprover';
import { validateCrossWaveLinks, type CrossWaveLinkReport } from '../../../services/ai/crossWaveLinkValidator';
import { KnowledgeGraph } from '../../../lib/knowledgeGraph';
import { mergeMapBusinessInfo } from '../../../utils/helpers';
import type { EnrichedTopic, ContentBrief } from '../../../types';
import type { Wave } from '../../../types/wave';
import type { ActionPlanEntry, BriefQualityReport } from '../../../types/actionPlan';
import { getSupabaseClient } from '../../../services/supabaseClient';
import { assignTopicsToWaves as assignTopicsToWavesService } from '../../../services/waveAssignmentService';

// Section components
import { ActionPlanDashboard } from './briefs/ActionPlanDashboard';
import { TopicManagementPanel } from './briefs/TopicManagementPanel';
import { BriefGenerationPanel } from './briefs/BriefGenerationPanel';

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

  // Merge per-map business_info overrides with global state
  const effectiveBusinessInfo = useMemo(() => {
    const mapBI = activeMap?.business_info;
    return mergeMapBusinessInfo(state.businessInfo, mapBI);
  }, [state.businessInfo, activeMap?.business_info]);

  const stepState = getStepState('briefs');
  const gate = stepState?.gate;

  const topics = activeMap?.topics ?? [];
  const existingBriefs = activeMap?.briefs ?? {};
  const pillars = activeMap?.pillars;
  const eavs = activeMap?.eavs ?? [];

  // Action Plan hook
  const {
    actionPlan,
    stats,
    isGenerating: isGeneratingPlan,
    generationProgress,
    generatePlan,
    approvePlan,
    resetPlan,
    updateEntry,
    removeEntry,
    moveToWave,
    changeActionType,
    rebalance,
    getEntriesByWave,
    updateTopicConfig,
    updateBriefStatus,
  } = useActionPlan(topics, effectiveBusinessInfo, pillars, eavs, state.activeMapId);

  // Brief generation state
  const [isBriefGenerating, setIsBriefGenerating] = useState(false);
  const [generatingWave, setGeneratingWave] = useState<number | null>(null);
  const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null);
  const [localBriefs, setLocalBriefs] = useState<Record<string, ContentBrief>>(existingBriefs);
  const [error, setError] = useState<string | null>(null);
  const [progressText, setProgressText] = useState('');
  const [qualityReports, setQualityReports] = useState<Record<string, BriefQualityReport>>({});

  const allBriefs = { ...existingBriefs, ...localBriefs };

  // Wave topic assignment — uses action plan if approved, otherwise fallback
  const waveTopics = useMemo(() => {
    if (actionPlan?.status === 'approved') {
      // Build wave map from action plan
      const waveNums = (actionPlan.waveDefinitions ?? []).map(wd => wd.number);
      const map = new Map<number, EnrichedTopic[]>();
      for (const n of waveNums) map.set(n, []);
      const topicMap = new Map(topics.map(t => [t.id, t]));
      for (const entry of actionPlan.entries) {
        if (entry.removed) continue;
        const topic = topicMap.get(entry.topicId);
        if (topic) {
          if (!map.has(entry.wave)) map.set(entry.wave, []);
          map.get(entry.wave)!.push(topic);
        }
      }
      return map;
    }

    // Fallback: use the wave assignment service
    const result = assignTopicsToWavesService(topics, 'monetization_first');
    const map = new Map<number, EnrichedTopic[]>();
    const topicMap = new Map(topics.map(t => [t.id, t]));
    for (const wave of result.waves) {
      if (!map.has(wave.number)) map.set(wave.number, []);
      for (const id of wave.topicIds) {
        const topic = topicMap.get(id);
        if (topic) map.get(wave.number)!.push(topic);
      }
    }
    return map;
  }, [actionPlan, topics]);

  // Core brief generation for a list of topic IDs
  const handleGenerateTopics = useCallback(async (topicIds: string[], waveNumber?: number) => {
    const businessInfo = effectiveBusinessInfo;

    if (!pillars?.centralEntity) {
      setError('Central Entity is required. Complete the Strategy step first.');
      return;
    }

    const topicMap = new Map(topics.map(t => [t.id, t]));
    const targetTopics = topicIds
      .map(id => topicMap.get(id))
      .filter((t): t is EnrichedTopic => !!t);

    if (targetTopics.length === 0) {
      setError('No valid topics selected for generation.');
      return;
    }

    setError(null);
    setIsBriefGenerating(true);
    if (waveNumber !== undefined) setGeneratingWave(waveNumber);
    setStepStatus('briefs', 'in_progress');

    const knowledgeGraph = new KnowledgeGraph();
    const newBriefs: Record<string, ContentBrief> = {};
    const failedTopics: string[] = [];

    const actionEntryMap = new Map(
      (actionPlan?.entries ?? []).map(e => [e.topicId, e])
    );

    const CONCURRENCY = 3;
    let completedCount = 0;

    async function generateSingleBrief(topic: EnrichedTopic) {
      setGeneratingTopicId(topic.id);
      completedCount++;
      setProgressText(`Generating brief ${completedCount}/${targetTopics.length}: ${topic.title}`);

      // Update brief status to generating
      updateBriefStatus(topic.id, 'generating');

      let attempts = 0;
      const MAX_ATTEMPTS = 3;
      while (attempts < MAX_ATTEMPTS) {
        attempts++;
        try {
          const { responseCode } = await suggestResponseCode(businessInfo, topic.title, dispatch);

          const actionEntry = actionEntryMap.get(topic.id);
          const briefData = await generateContentBrief(
            businessInfo,
            topic,
            topics,
            pillars,
            knowledgeGraph,
            responseCode,
            dispatch,
            undefined,
            eavs,
            undefined,
            actionEntry?.actionType,
            actionEntry?.config,
            allBriefs
          );

          const brief: ContentBrief = {
            id: topic.id,
            topic_id: topic.id,
            articleDraft: undefined,
            ...briefData,
          };

          // Run quality review
          const report = reviewBriefQuality(
            brief, topic, businessInfo, pillars, topics, eavs, actionEntry?.config,
            { ...allBriefs, ...newBriefs }, businessInfo.websiteType
          );

          // Quality-based status gating
          if (!report.meetsMinimum && attempts < MAX_ATTEMPTS) {
            // Score < 50: auto-retry
            console.warn(`[Briefs] Brief for "${topic.title}" scored ${report.score}% (below 50% minimum), retrying...`);
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          if (!report.meetsMinimum) {
            // Still below minimum after all retries: mark failed
            console.error(`[Briefs] Brief for "${topic.title}" scored ${report.score}% after ${MAX_ATTEMPTS} attempts — marking failed`);
            failedTopics.push(topic.title);
            updateBriefStatus(topic.id, 'failed');
            break;
          }

          // Multi-pass improvement for briefs scoring 50-84%
          let finalBrief = brief;
          let finalReport = report;
          if (report.meetsMinimum && !report.meetsTarget) {
            try {
              setProgressText(`Improving brief for "${topic.title}" (${report.score}%)...`);
              const { improved, newReport } = await improveBrief(
                brief, report, topic,
                {
                  businessInfo,
                  pillars,
                  allTopics: topics,
                  eavs,
                  topicConfig: actionEntry?.config,
                  allBriefs: { ...allBriefs, ...newBriefs },
                },
                dispatch
              );
              if (newReport.score > report.score) {
                finalBrief = improved;
                finalReport = newReport;
              }
            } catch (err) {
              console.warn(`[Briefs] Improvement pass failed for "${topic.title}":`, err);
              // Non-fatal: keep original brief
            }
          }

          newBriefs[topic.id] = finalBrief;
          setLocalBriefs(prev => ({ ...prev, [topic.id]: finalBrief }));
          setQualityReports(prev => ({ ...prev, [topic.id]: finalReport }));

          // Update brief status — generated (UI shows amber/green based on score)
          updateBriefStatus(topic.id, 'generated');
          break;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (attempts < MAX_ATTEMPTS) {
            console.warn(`[Briefs] Attempt ${attempts} failed for "${topic.title}", retrying: ${message}`);
            await new Promise(r => setTimeout(r, 2000));
          } else {
            console.error(`[Briefs] Failed after ${MAX_ATTEMPTS} attempts for "${topic.title}": ${message}`);
            failedTopics.push(topic.title);
            updateBriefStatus(topic.id, 'failed');
          }
        }
      }
    }

    // Run briefs with controlled concurrency
    const active = new Set<Promise<void>>();
    for (const topic of targetTopics) {
      const task = generateSingleBrief(topic).then(() => {
        active.delete(task);
      });
      active.add(task);
      if (active.size >= CONCURRENCY) {
        await Promise.race(active);
      }
    }
    await Promise.all(active);

    // Persist
    if (Object.keys(newBriefs).length > 0 && state.activeMapId) {
      const mergedBriefs = { ...allBriefs, ...newBriefs };
      dispatch({
        type: 'SET_BRIEFS_FOR_MAP',
        payload: { mapId: state.activeMapId, briefs: mergedBriefs },
      });

      try {
        const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

        for (const [topicId, brief] of Object.entries(newBriefs)) {
          const briefRecord = {
            topic_id: topicId,
            title: brief.title || '',
            slug: brief.slug,
            meta_description: brief.metaDescription,
            key_takeaways: Array.isArray(brief.keyTakeaways) ? brief.keyTakeaways : [],
            outline: brief.outline,
            target_keyword: brief.targetKeyword,
            search_intent: brief.searchIntent,
            serp_analysis: brief.serpAnalysis as any,
            visuals: brief.visuals as any,
            contextual_vectors: brief.contextualVectors as any,
            contextual_bridge: brief.contextualBridge as any,
            perspectives: brief.perspectives as any,
            methodology_note: brief.methodology_note,
            structured_outline: brief.structured_outline as any,
            structural_template_hash: brief.structural_template_hash,
            predicted_user_journey: brief.predicted_user_journey,
            query_type_format: brief.query_type_format,
            featured_snippet_target: brief.featured_snippet_target as any,
            visual_semantics: brief.visual_semantics as any,
            discourse_anchors: brief.discourse_anchors as any,
            visual_placement_map: brief.visual_placement_map as any,
            discourse_anchor_sequence: brief.discourse_anchor_sequence as any,
            cta: brief.cta,
          };

          const { data: existing } = await supabase
            .from('content_briefs')
            .select('id')
            .eq('topic_id', topicId)
            .maybeSingle();

          if (existing) {
            const { error } = await supabase
              .from('content_briefs')
              .update({ ...briefRecord, updated_at: new Date().toISOString() })
              .eq('id', existing.id);
            if (error) console.warn(`[Briefs] Update failed for topic ${topicId}: ${error.message}`);
          } else {
            const { error } = await supabase
              .from('content_briefs')
              .insert({ ...briefRecord, created_at: new Date().toISOString() });
            if (error) console.warn(`[Briefs] Insert failed for topic ${topicId}: ${error.message}`);
          }
        }
      } catch (err) {
        console.warn('[Briefs] Supabase save failed:', err);
      }
    }

    if (failedTopics.length > 0) {
      const successCount = Object.keys(newBriefs).length;
      setError(`${successCount} briefs generated, ${failedTopics.length} failed: ${failedTopics.join(', ')}`);
    }

    if (Object.keys(newBriefs).length > 0) {
      setStepStatus('briefs', 'pending_approval');
    } else {
      setStepStatus('briefs', 'available');
    }

    setIsBriefGenerating(false);
    setGeneratingWave(null);
    setGeneratingTopicId(null);
    setProgressText('');
  }, [effectiveBusinessInfo, pillars, topics, eavs, actionPlan, allBriefs, state.activeMapId, dispatch, setStepStatus, updateBriefStatus]);

  // Wave-level handler — generates all pending topics in a wave
  const handleGenerateWave = useCallback(async (waveNumber: number) => {
    const waveTopicsList = waveTopics.get(waveNumber) ?? [];
    const topicsNeedingBriefs = waveTopicsList.filter(t => !allBriefs[t.id]);

    if (topicsNeedingBriefs.length === 0) {
      setError(`All briefs for Wave ${waveNumber} are already generated.`);
      return;
    }

    await handleGenerateTopics(topicsNeedingBriefs.map(t => t.id), waveNumber);
  }, [waveTopics, allBriefs, handleGenerateTopics]);

  // Approval handlers
  const handleApproveBrief = useCallback((topicId: string) => {
    updateBriefStatus(topicId, 'approved');
  }, [updateBriefStatus]);

  const handleRejectBrief = useCallback((topicId: string, reason: string) => {
    updateBriefStatus(topicId, 'rejected', reason);
  }, [updateBriefStatus]);

  // Metrics for approval gate
  const hubTopics = topics.filter(t => t.cluster_role === 'pillar');
  const spokeTopics = topics.filter(t => t.cluster_role !== 'pillar');
  const generatedHubBriefs = hubTopics.filter(t => allBriefs[t.id]).length;
  const generatedSpokeBriefs = spokeTopics.filter(t => allBriefs[t.id]).length;

  // Cross-wave link coverage report
  const crossWaveLinkReport = useMemo<CrossWaveLinkReport | null>(() => {
    const briefCount = Object.keys(allBriefs).length;
    if (briefCount === 0 || waveTopics.size < 2) return null;

    // Build Wave[] from waveTopics map
    const waves: Wave[] = Array.from(waveTopics.entries()).map(([num, wTopics]) => ({
      id: `wave-${num}`,
      number: num,
      name: `Wave ${num}`,
      description: '',
      topicIds: wTopics.map(t => t.id),
      weekStart: 0,
      weekEnd: 0,
      status: 'planning' as const,
    }));

    return validateCrossWaveLinks(waves, allBriefs, topics);
  }, [allBriefs, waveTopics, topics]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Content Specs</h2>
        <p className="text-sm text-gray-400 mt-1">
          Strategic action plan and detailed page specifications with heading structure, business facts, and Google answer targets
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
      {isBriefGenerating && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="animate-spin w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-blue-300">{progressText || 'Generating briefs...'}</p>
        </div>
      )}

      {topics.length > 0 && (
        <>
          {/* ═══ Section 1: Strategic Action Plan Dashboard ═══ */}
          <ActionPlanDashboard
            actionPlan={actionPlan}
            stats={stats}
            isGenerating={isGeneratingPlan}
            generationProgress={generationProgress}
            onGenerate={generatePlan}
            onReset={resetPlan}
            topicCount={topics.length}
          />

          {/* ═══ Section 2: Topic Management Panel ═══ */}
          {actionPlan && actionPlan.status !== 'draft' && (
            <TopicManagementPanel
              actionPlan={actionPlan}
              topics={topics}
              onUpdate={updateEntry}
              onRemove={removeEntry}
              onMoveToWave={moveToWave}
              onChangeActionType={changeActionType}
              onRebalance={rebalance}
              onApprove={approvePlan}
              isApproved={actionPlan.status === 'approved'}
              onUpdateTopicConfig={updateTopicConfig}
            />
          )}

          {/* ═══ Section 3: Brief Generation ═══ */}
          <BriefGenerationPanel
            actionPlan={actionPlan}
            topics={topics}
            existingBriefs={allBriefs}
            waveTopics={waveTopics}
            isGenerating={isBriefGenerating}
            generatingWave={generatingWave}
            generatingTopicId={generatingTopicId}
            onGenerateWave={handleGenerateWave}
            onGenerateTopics={handleGenerateTopics}
            onApproveBrief={handleApproveBrief}
            onRejectBrief={handleRejectBrief}
            qualityReports={qualityReports}
            eavTotal={eavs.length}
            language={effectiveBusinessInfo.language || 'en'}
          />
        </>
      )}

      {/* Cross-Wave Link Coverage */}
      {crossWaveLinkReport && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-200">Cross-Wave Link Coverage</h3>
            <span className={`text-sm font-medium ${
              crossWaveLinkReport.overallCrossWavePercent >= 30 ? 'text-green-400' :
              crossWaveLinkReport.overallCrossWavePercent > 0 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {crossWaveLinkReport.overallCrossWavePercent}% cross-wave
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
            {crossWaveLinkReport.waveCoverages.map(wc => (
              <div key={wc.waveId} className="bg-gray-900/50 rounded px-3 py-2">
                <p className="text-[11px] text-gray-400 mb-0.5">Wave {wc.waveNumber}</p>
                <p className="text-xs text-gray-300">
                  <span className="font-medium">{wc.crossWaveLinksCount}</span> cross /
                  <span className="font-medium"> {wc.intraWaveLinksCount}</span> intra
                </p>
                <p className={`text-[10px] mt-0.5 ${
                  wc.coveragePercent >= 80 ? 'text-green-400/70' :
                  wc.coveragePercent > 0 ? 'text-amber-400/70' : 'text-red-400/70'
                }`}>
                  {wc.coveragePercent}% wave coverage
                </p>
              </div>
            ))}
          </div>

          {crossWaveLinkReport.warnings.length > 0 && (
            <div className="space-y-1">
              {crossWaveLinkReport.warnings.map((warning, i) => (
                <p key={i} className="text-[11px] text-amber-400/80 flex items-start gap-1.5">
                  <svg className="w-3 h-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {warning}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

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
            ...(crossWaveLinkReport ? [{ label: 'Cross-Wave Links', value: `${crossWaveLinkReport.overallCrossWavePercent}%`, color: crossWaveLinkReport.overallCrossWavePercent >= 30 ? 'green' as const : 'amber' as const }] : []),
          ]}
        />
      )}
    </div>
  );
};

export default PipelineBriefsStep;
