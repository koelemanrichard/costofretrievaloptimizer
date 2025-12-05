import React, { useCallback } from 'react';
import { useMapMerge } from '../../hooks/useMapMerge';
import { useAppState } from '../../state/appState';
import { TopicalMap, TopicMergeDecision, EnrichedTopic } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import MergeMapSelectStep from './MergeMapSelectStep';
import MergeContextStep from './MergeContextStep';
import MergeTopicsStep from './MergeTopicsStep';
import * as mapMergeService from '../../services/ai/mapMerge';

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
    reset,
  } = useMapMerge();

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleNext = useCallback(() => {
    const steps: Array<typeof mergeState.step> = ['select', 'context', 'eavs', 'topics', 'review'];
    const currentIndex = steps.indexOf(mergeState.step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  }, [mergeState.step, setStep]);

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
        return <div className="text-gray-400 p-8 text-center">EAV consolidation step coming soon...</div>;
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
          <div className="space-y-4">
            <p className="text-gray-400">Review your merge decisions before creating the new map.</p>
            <div className="p-4 bg-gray-800 rounded">
              <p className="text-white"><strong>Maps to merge:</strong> {mergeState.sourceMaps.map(m => m.name).join(', ')}</p>
              <p className="text-white mt-2"><strong>Topic similarities:</strong> {mergeState.topicSimilarities.length}</p>
              <p className="text-white"><strong>Merge decisions:</strong> {mergeState.topicDecisions.filter(d => d.userDecision === 'merge').length}</p>
              <p className="text-white"><strong>Excluded topics:</strong> {mergeState.excludedTopicIds.length}</p>
              <p className="text-white"><strong>New topics:</strong> {mergeState.newTopics.length}</p>
            </div>
          </div>
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
        // Check if all conflicts are resolved
        return mergeState.contextConflicts.every(c => c.resolution !== undefined);
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
            disabled={!canProceed() || mergeState.isAnalyzing}
          >
            {mergeState.step === 'review' ? 'Create Merged Map' : 'Next'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MergeMapWizard;
