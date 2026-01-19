// components/modals/DepthSelectionModal.tsx
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { DepthMode, DepthSuggestion } from '../../types/contentTemplates';

interface DepthSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mode: DepthMode | 'custom', customSettings?: { maxSections: number; targetWordCount: { min: number; max: number } }) => void;
  suggestion: DepthSuggestion;
}

const DEPTH_OPTIONS: Array<{
  mode: DepthMode;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    mode: 'high-quality',
    label: 'High Quality',
    description: 'Comprehensive content for competitive rankings. Best for pillar pages and cornerstone content.',
    icon: '🏆',
  },
  {
    mode: 'moderate',
    label: 'Moderate',
    description: 'Balanced depth matching competitor average. Good for most content.',
    icon: '⚖️',
  },
  {
    mode: 'quick-publish',
    label: 'Quick Publish',
    description: 'Shorter content for fast publishing. Good for low-competition topics or supporting content.',
    icon: '⚡',
  },
];

const DepthSelectionModal: React.FC<DepthSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  suggestion,
}) => {
  const [chosen, setChosen] = useState<DepthMode>(suggestion.recommended);

  const handleConfirm = () => {
    onSelect(chosen, undefined);
    // Don't call onClose() here - the parent flow advances to the next step
    // onClose is only for cancellation
  };

  const getSettingsForMode = (mode: DepthMode) => {
    const multipliers = {
      'high-quality': 1.3,
      'moderate': 1.0,
      'quick-publish': 0.6,
    };
    const base = suggestion.competitorBenchmark.avgWordCount;
    const mult = multipliers[mode];
    return {
      wordCount: { min: Math.round(base * mult * 0.8), max: Math.round(base * mult * 1.2) },
      sections: mode === 'high-quality' ? 10 : mode === 'moderate' ? 6 : 4,
    };
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={handleConfirm}>
        Confirm Selection
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Content Depth"
      description="Choose how comprehensive your content should be based on competitor analysis"
      maxWidth="max-w-2xl"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Competitor Benchmark */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Competitor Analysis</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {suggestion.competitorBenchmark.avgWordCount.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">Avg. Words</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {suggestion.competitorBenchmark.avgSections}
              </div>
              <div className="text-xs text-gray-400">Avg. Sections</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {suggestion.competitorBenchmark.topPerformerWordCount.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">Top Performer</div>
            </div>
          </div>
        </div>

        {/* AI Reasoning */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">AI Analysis</h3>
          <ul className="space-y-1">
            {suggestion.reasoning.map((reason, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Depth Options */}
        <div className="space-y-3">
          {DEPTH_OPTIONS.map((option) => {
            const settings = getSettingsForMode(option.mode);
            const isRecommended = option.mode === suggestion.recommended;

            return (
              <button
                key={option.mode}
                onClick={() => setChosen(option.mode)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  chosen === option.mode
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-gray-700 bg-gray-900/30 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{option.label}</span>
                        {isRecommended && (
                          <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mt-0.5">{option.description}</p>
                    </div>
                  </div>
                  {chosen === option.mode && (
                    <svg className="w-5 h-5 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex gap-4 mt-3 text-xs text-gray-500 ml-11">
                  <span>{settings.wordCount.min.toLocaleString()}-{settings.wordCount.max.toLocaleString()} words</span>
                  <span>Up to {settings.sections} sections</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

export default DepthSelectionModal;
