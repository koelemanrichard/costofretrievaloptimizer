/**
 * ConflictResolutionModal Component
 *
 * Modal for resolving conflicts between content brief settings and template recommendations.
 * Displays detected conflicts with severity levels and provides resolution options.
 *
 * Features:
 * - Visual conflict list with severity color coding (red=critical, yellow=moderate, gray=minor)
 * - AI recommendation display with reasoning
 * - Three resolution options: Use Template, Keep Brief, Smart Merge
 * - Pre-selects AI-recommended option
 *
 * Created: 2026-01-18 - Content Template Routing Phase 2
 *
 * @module components/modals/ConflictResolutionModal
 */

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ConflictDetectionResult } from '../../types/contentTemplates';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (choice: 'template' | 'brief' | 'merge') => void;
  detection: ConflictDetectionResult;
}

const RESOLUTION_OPTIONS = [
  {
    choice: 'template' as const,
    label: 'Use Template Values',
    description: 'Apply recommended format codes from the template for optimal SEO',
    icon: '📋',
  },
  {
    choice: 'brief' as const,
    label: 'Keep Brief Values',
    description: 'Keep your current brief settings unchanged',
    icon: '📝',
  },
  {
    choice: 'merge' as const,
    label: 'Smart Merge',
    description: 'Use template for critical/moderate conflicts, keep brief for minor ones',
    icon: '🔀',
  },
];

/** Map AI action values to user choice values */
const mapActionToChoice = (action: 'use-template' | 'use-brief' | 'merge'): 'template' | 'brief' | 'merge' => {
  switch (action) {
    case 'use-template': return 'template';
    case 'use-brief': return 'brief';
    default: return 'merge';
  }
};

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  onResolve,
  detection,
}) => {
  const recommendedChoice = mapActionToChoice(detection.aiRecommendation.action);
  const [chosen, setChosen] = useState<'template' | 'brief' | 'merge'>(recommendedChoice);

  const handleApply = () => {
    onResolve(chosen);
    // Don't call onClose() here - the parent flow advances to the next step
    // onClose is only for cancellation
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'moderate': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={handleApply}>
        Apply Resolution
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resolve Template Conflicts"
      description="Your brief has settings that differ from the recommended template"
      maxWidth="max-w-2xl"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Conflicts List */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Detected Conflicts ({detection.conflicts.length})
          </h3>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {detection.conflicts.map((conflict, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${getSeverityColor(conflict.severity)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">{conflict.field}</span>
                  <span className="text-xs uppercase font-semibold">{conflict.severity}</span>
                </div>
                <div className="flex items-center gap-2 text-sm mb-2">
                  <span className="bg-gray-800 px-2 py-0.5 rounded">{String(conflict.briefValue)}</span>
                  <span className="text-gray-500">→</span>
                  <span className="bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded">{String(conflict.templateValue)}</span>
                </div>
                <p className="text-xs text-gray-400">{conflict.semanticSeoArgument}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold text-cyan-400">
              AI Recommends: {detection.aiRecommendation.action === 'use-template' ? 'Use Template' : detection.aiRecommendation.action === 'use-brief' ? 'Keep Brief' : 'Smart Merge'}
            </span>
          </div>
          <ul className="space-y-1">
            {detection.aiRecommendation.reasoning.map((reason, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Resolution Options */}
        <div className="space-y-2">
          {RESOLUTION_OPTIONS.map((option) => (
            <button
              key={option.choice}
              onClick={() => setChosen(option.choice)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                chosen === option.choice
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-700 bg-gray-900/30 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{option.icon}</span>
                  <div>
                    <span className="text-white font-medium">{option.label}</span>
                    {recommendedChoice === option.choice && (
                      <span className="ml-2 text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
                        Recommended
                      </span>
                    )}
                    <p className="text-gray-400 text-sm mt-0.5">{option.description}</p>
                  </div>
                </div>
                {chosen === option.choice && (
                  <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default ConflictResolutionModal;
