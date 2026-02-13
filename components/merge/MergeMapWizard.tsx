import React, { useCallback, useEffect } from 'react';
import { useMapMerge } from '../../hooks/useMapMerge';
import { useAppState } from '../../state/appState';
import { TopicalMap, TopicMergeDecision, EnrichedTopic, SemanticTriple, BusinessInfo } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import MergeMapSelectStep from './MergeMapSelectStep';
import MergeContextStep from './MergeContextStep';
import MergeTopicsStep from './MergeTopicsStep';
import MergeEavsStep from './MergeEavsStep';
import MergeReviewStep from './MergeReviewStep';
import * as mapMergeService from '../../services/ai/mapMerge';
import { executeMerge } from '../../services/mapMergeExecution';
import { getSupabaseClient } from '../../services/supabaseClient';
import { batchedIn } from '../../utils/supabaseBatchQuery';

interface MergeMapWizardProps {
  isOpen: boolean;
  onClose: () => void;
  availableMaps: TopicalMap[];
}

const MergeMapWizard: React.FC<MergeMapWizardProps> = ({
  isOpen,
  onClose,
  availableMaps,
}) => {
  const { state: appState, dispatch: appDispatch } = useAppState();
  const {
    state: mergeState,
    dispatch: mergeDispatch,
    setStep,
    selectMaps,
    setSourceMaps,
    resolveContextConflict,
    updateTopicDecision,
    addNewTopic,
    toggleExcludedTopic,
    setNewMapName,
    bulkEavAction,
    setCreating,
    reset,
  } = useMapMerge();

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleBack = useCallback(() => {
    const steps: Array<typeof mergeState.step> = ['select', 'context', 'eavs', 'topics', 'review'];
    const currentIndex = steps.indexOf(mergeState.step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  }, [mergeState.step, setStep]);

  const handleMapsSelected = useCallback((mapIds: string[]) => {
    selectMaps(mapIds);
    const maps = availableMaps.filter(m => mapIds.includes(m.id));
    setSourceMaps(maps);
  }, [selectMaps, setSourceMaps, availableMaps]);

  // Load full topic data for selected maps
  useEffect(() => {
    const loadFullTopics = async () => {
      if (mergeState.sourceMaps.length === 0) return;

      const mapIds = mergeState.sourceMaps.map(m => m.id);
      const mapsNeedingFullData = mergeState.sourceMaps.filter(
        m => !m.topics?.some(t => t.description !== undefined)
      );

      if (mapsNeedingFullData.length === 0) return;

      try {
        const supabase = getSupabaseClient(
          appState.businessInfo.supabaseUrl,
          appState.businessInfo.supabaseAnonKey
        );

        const { data: topicsData, error } = await batchedIn(
          supabase, 'topics', '*', 'map_id', mapIds
        );

        if (error) throw error;

        // Group by map and update source maps
        const topicsByMap = (topicsData || []).reduce((acc, topic) => {
          if (!acc[topic.map_id]) acc[topic.map_id] = [];
          acc[topic.map_id].push(topic);
          return acc;
        }, {} as Record<string, any[]>);

        const updatedMaps = mergeState.sourceMaps.map(map => ({
          ...map,
          topics: (topicsByMap[map.id] || []) as EnrichedTopic[],
        }));

        setSourceMaps(updatedMaps);
      } catch (error) {
        console.error('Failed to load full topic data:', error);
      }
    };

    loadFullTopics();
  }, [mergeState.sourceMaps.length, appState.businessInfo.supabaseUrl, appState.businessInfo.supabaseAnonKey, setSourceMaps]); // Only run when source maps count changes

  const handleAnalyzeContext = useCallback(async () => {
    if (mergeState.sourceMaps.length < 2) return;

    mergeDispatch({ type: 'SET_ANALYZING', payload: true });
    try {
      const analysis = await mapMergeService.analyzeMapMerge(
        mergeState.sourceMaps,
        appState.businessInfo,
        appDispatch
      );

      // Convert context recommendations to conflicts
      const conflicts = (analysis.contextRecommendations || []).map(rec => ({
        field: rec.field,
        values: mergeState.sourceMaps.map((map, idx) => ({
          mapId: map.id,
          mapName: map.name,
          value: (map.business_info as any)?.[rec.field] || (map.pillars as any)?.[rec.field] || '',
        })),
        aiSuggestion: rec.recommendation ? {
          value: rec.recommendation,
          reasoning: rec.reasoning || '',
          confidence: rec.confidence || 0,
        } : undefined,
        resolution: 'ai' as const,
      }));

      mergeDispatch({ type: 'SET_CONTEXT_CONFLICTS', payload: conflicts });
      mergeDispatch({ type: 'SET_TOPIC_SIMILARITIES', payload: analysis.topicSimilarities || [] });

      // Initialize topic decisions from similarities
      const decisions: TopicMergeDecision[] = (analysis.topicSimilarities || []).map(sim => ({
        id: sim.id,
        topicAId: sim.topicA.id,
        topicBId: sim.topicB.id,
        userDecision: sim.aiSuggestedAction === 'merge' ? 'merge' :
                      sim.aiSuggestedAction === 'parent_child' ? 'keep_both' : 'pending',
        finalTitle: sim.aiSuggestedTitle || sim.topicA.title,
        finalDescription: sim.topicA.description,
        finalType: sim.topicA.type,
        finalParentId: null,
      }));
      mergeDispatch({ type: 'SET_TOPIC_DECISIONS', payload: decisions });

    } catch (error) {
      mergeDispatch({ type: 'SET_ANALYSIS_ERROR', payload: error instanceof Error ? error.message : 'Analysis failed' });
    } finally {
      mergeDispatch({ type: 'SET_ANALYZING', payload: false });
    }
  }, [mergeState.sourceMaps, appState.businessInfo, appDispatch, mergeDispatch]);

  const handleExportDecisions = useCallback(() => {
    const exportData = {
      sourceMaps: mergeState.selectedMapIds,
      contextConflicts: mergeState.contextConflicts,
      topicDecisions: mergeState.topicDecisions,
      excludedTopicIds: mergeState.excludedTopicIds,
      newTopics: mergeState.newTopics,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merge-decisions-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [mergeState]);

  const handleImportDecisions = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.topicDecisions) {
            mergeDispatch({ type: 'SET_TOPIC_DECISIONS', payload: data.topicDecisions });
          }
          if (data.excludedTopicIds) {
            mergeDispatch({ type: 'SET_EXCLUDED_TOPICS', payload: data.excludedTopicIds });
          }
        } catch (err) {
          console.error('Failed to import decisions:', err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [mergeDispatch]);

  const getValidationErrors = useCallback((): string[] => {
    const errors: string[] = [];

    if (!mergeState.newMapName.trim()) {
      errors.push('Map name is required');
    }

    const pendingDecisions = mergeState.topicDecisions.filter(d => d.userDecision === 'pending');
    if (pendingDecisions.length > 0) {
      errors.push(`${pendingDecisions.length} topic pair(s) have pending decisions`);
    }

    // Check that at least one topic will be in the new map
    const allTopics = mergeState.sourceMaps.flatMap(m => m.topics || []);
    const inDecision = new Set<string>();
    mergeState.topicDecisions.forEach(d => {
      if (d.topicAId) inDecision.add(d.topicAId);
      if (d.topicBId) inDecision.add(d.topicBId);
    });
    const uniqueTopics = allTopics.filter(t => !inDecision.has(t.id));
    const uniqueIncluded = uniqueTopics.filter(t => !mergeState.excludedTopicIds.includes(t.id));

    const fromDecisions = mergeState.topicDecisions.filter(d => d.userDecision !== 'delete').length;
    const totalTopics = fromDecisions + uniqueIncluded.length + mergeState.newTopics.length;

    if (totalTopics === 0) {
      errors.push('The merged map would have no topics');
    }

    return errors;
  }, [mergeState]);

  const handleCreateMergedMap = useCallback(async () => {
    const errors = getValidationErrors();
    if (errors.length > 0) return;

    setCreating(true);
    try {
      // Build resolved EAVs from decisions
      const resolvedEavs: SemanticTriple[] = [];
      const seenEavKeys = new Set<string>();

      mergeState.sourceMaps.forEach((map) => {
        (map.eavs || []).forEach((eav, eavIdx) => {
          const eavId = `${map.id}_${eavIdx}`;
          const decision = mergeState.eavDecisions.find(d => d.eavId === eavId);
          if (!decision || decision.action === 'include') {
            const key = `${eav.subject.label}|${eav.predicate.relation}|${eav.object.value}`;
            if (!seenEavKeys.has(key)) {
              seenEavKeys.add(key);
              resolvedEavs.push(eav);
            }
          }
        });
      });

      // Build resolved context from conflict resolutions
      // START with base business_info from first map to preserve non-conflicting fields
      // BUT strip AI settings - they should come from global user_settings, not be saved per-map
      const baseBusinessInfo = mergeState.sourceMaps[0]?.business_info as Partial<BusinessInfo> || {};
      const {
          aiProvider: _ap,
          aiModel: _am,
          geminiApiKey: _gk,
          openAiApiKey: _ok,
          anthropicApiKey: _ak,
          perplexityApiKey: _pk,
          openRouterApiKey: _ork,
          ...baseBusinessContext
      } = baseBusinessInfo;
      const resolvedBusinessInfo: Partial<BusinessInfo> = { ...baseBusinessContext };
      const basePillars = mergeState.sourceMaps[0]?.pillars;
      const resolvedPillars = basePillars ? { ...basePillars } : null;

      // Override with conflict resolutions
      mergeState.contextConflicts.forEach(conflict => {
        let value: any;
        if (conflict.resolution === 'mapA') {
          value = conflict.values[0]?.value;
        } else if (conflict.resolution === 'mapB') {
          value = conflict.values[1]?.value;
        } else if (conflict.resolution === 'ai' && conflict.aiSuggestion) {
          value = conflict.aiSuggestion.value;
        } else if (conflict.resolution === 'custom') {
          value = conflict.customValue;
        }

        if (value !== undefined) {
          // Determine if it's a pillar or business field
          const pillarFields = ['centralEntity', 'sourceContext', 'centralSearchIntent'];
          if (pillarFields.includes(conflict.field) && resolvedPillars) {
            (resolvedPillars as any)[conflict.field] = value;
          } else {
            (resolvedBusinessInfo as any)[conflict.field] = value;
          }
        }
      });

      // Get competitors from first map (could be enhanced later)
      const resolvedCompetitors = mergeState.sourceMaps[0]?.competitors || [];

      const result = await executeMerge(
        {
          sourceMaps: mergeState.sourceMaps,
          newMapName: mergeState.newMapName,
          projectId: appState.activeProjectId!,
          userId: appState.user!.id,
          resolvedContext: {
            businessInfo: resolvedBusinessInfo,
            pillars: resolvedPillars,
          },
          resolvedEavs,
          resolvedCompetitors,
          topicDecisions: mergeState.topicDecisions,
          excludedTopicIds: mergeState.excludedTopicIds,
          newTopics: mergeState.newTopics,
        },
        appState.businessInfo.supabaseUrl,
        appState.businessInfo.supabaseAnonKey
      );

      // Add to app state
      appDispatch({ type: 'ADD_TOPICAL_MAP', payload: result.newMap });
      appDispatch({ type: 'SET_TOPICS_FOR_MAP', payload: { mapId: result.newMap.id, topics: result.newMap.topics || [] } });
      appDispatch({ type: 'SET_NOTIFICATION', payload: `Created merged map "${result.newMap.name}" with ${result.topicsCreated} topics` });

      if (result.warnings.length > 0) {
        console.warn('Merge warnings:', result.warnings);
      }

      handleClose();
    } catch (error) {
      console.error('Merge failed:', error);
      mergeDispatch({
        type: 'SET_ANALYSIS_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to create merged map',
      });
    } finally {
      setCreating(false);
    }
  }, [
    getValidationErrors,
    setCreating,
    mergeState,
    appState,
    appDispatch,
    handleClose,
    mergeDispatch,
  ]);

  const handleNext = useCallback(() => {
    const steps: Array<typeof mergeState.step> = ['select', 'context', 'eavs', 'topics', 'review'];
    const currentIndex = steps.indexOf(mergeState.step);

    // On review step, create the map instead of going next
    if (mergeState.step === 'review') {
      handleCreateMergedMap();
      return;
    }

    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  }, [mergeState.step, setStep, handleCreateMergedMap]);

  if (!isOpen) return null;

  const stepTitles: Record<typeof mergeState.step, string> = {
    select: 'Select Maps to Merge',
    context: 'Business Context & Pillars',
    eavs: 'EAV Consolidation',
    topics: 'Topic Matching',
    review: 'Review & Finalize',
  };

  const renderStep = () => {
    switch (mergeState.step) {
      case 'select':
        return (
          <MergeMapSelectStep
            availableMaps={availableMaps}
            selectedMapIds={mergeState.selectedMapIds}
            onMapsSelected={handleMapsSelected}
          />
        );
      case 'context':
        return (
          <MergeContextStep
            sourceMaps={mergeState.sourceMaps}
            contextConflicts={mergeState.contextConflicts}
            resolvedContext={mergeState.resolvedContext}
            isAnalyzing={mergeState.isAnalyzing}
            onResolveConflict={resolveContextConflict}
            onAnalyze={handleAnalyzeContext}
          />
        );
      case 'eavs':
        return (
          <MergeEavsStep
            sourceMaps={mergeState.sourceMaps}
            eavDecisions={mergeState.eavDecisions}
            onDecisionChange={(decision) => mergeDispatch({ type: 'UPDATE_EAV_DECISION', payload: decision })}
            onBulkAction={bulkEavAction}
          />
        );
      case 'topics':
        return (
          <MergeTopicsStep
            sourceMaps={mergeState.sourceMaps}
            topicSimilarities={mergeState.topicSimilarities}
            topicDecisions={mergeState.topicDecisions}
            newTopics={mergeState.newTopics}
            excludedTopicIds={mergeState.excludedTopicIds}
            isAnalyzing={mergeState.isAnalyzing}
            onDecisionChange={updateTopicDecision}
            onAddNewTopic={addNewTopic}
            onToggleExcluded={toggleExcludedTopic}
            onAnalyze={handleAnalyzeContext}
            onExport={handleExportDecisions}
            onImport={handleImportDecisions}
          />
        );
      case 'review':
        return (
          <MergeReviewStep
            sourceMaps={mergeState.sourceMaps}
            newMapName={mergeState.newMapName}
            onMapNameChange={setNewMapName}
            contextConflicts={mergeState.contextConflicts}
            resolvedEavs={mergeState.resolvedEavs}
            topicSimilarities={mergeState.topicSimilarities}
            topicDecisions={mergeState.topicDecisions}
            excludedTopicIds={mergeState.excludedTopicIds}
            newTopics={mergeState.newTopics}
            isCreating={mergeState.isCreating}
            validationErrors={getValidationErrors()}
          />
        );
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (mergeState.step) {
      case 'select':
        return mergeState.selectedMapIds.length >= 2;
      case 'context':
        return mergeState.contextConflicts.every(c => c.resolution !== null);
      case 'eavs':
        return true; // EAVs are optional
      case 'topics':
        return true; // Can proceed with pending decisions (warning shown in review)
      case 'review':
        return getValidationErrors().length === 0 && !mergeState.isCreating;
      default:
        return true;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">
              {stepTitles[mergeState.step]}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              &times;
            </button>
          </div>
          {/* Progress indicator */}
          <div className="flex gap-2 mt-4">
            {(['select', 'context', 'eavs', 'topics', 'review'] as const).map((step, index) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded ${
                  index <= ['select', 'context', 'eavs', 'topics', 'review'].indexOf(mergeState.step)
                    ? 'bg-blue-500'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {mergeState.analysisError && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-500 rounded text-red-300">
              {mergeState.analysisError}
            </div>
          )}
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-between">
          <Button
            variant="secondary"
            onClick={mergeState.step === 'select' ? handleClose : handleBack}
          >
            {mergeState.step === 'select' ? 'Cancel' : 'Back'}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || mergeState.isAnalyzing || mergeState.isCreating}
          >
            {mergeState.step === 'review'
              ? (mergeState.isCreating ? 'Creating...' : 'Create Merged Map')
              : 'Next'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MergeMapWizard;
