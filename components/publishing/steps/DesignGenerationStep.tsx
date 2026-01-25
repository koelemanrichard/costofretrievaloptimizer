/**
 * Design Generation Step Component
 *
 * Shows the multi-pass design generation progress and results.
 * Displays each pass as it completes with detailed information.
 *
 * @module components/publishing/steps/DesignGenerationStep
 */

import React from 'react';
import type {
  ContentAnalysis,
  ComponentSelection,
  VisualRhythmPlan,
  DesignQualityValidation,
} from '../../../types/publishing';
import type { MultiPassResult } from '../../../services/publishing/multipass';

// ============================================================================
// TYPES
// ============================================================================

export interface DesignGenerationStepProps {
  /** Whether generation is in progress */
  isGenerating: boolean;

  /** Current pass being executed (1-5 or 'complete') */
  currentPass: 1 | 2 | 3 | 4 | 5 | 'complete' | null;

  /** Progress percentage (0-100) */
  progress: number;

  /** Pass 1 result: Content analysis */
  contentAnalysis: ContentAnalysis | null;

  /** Pass 2 result: Component selections */
  componentSelections: ComponentSelection[] | null;

  /** Pass 3 result: Visual rhythm plan */
  rhythmPlan: VisualRhythmPlan | null;

  /** Pass 4 complete flag */
  designApplied: boolean;

  /** Pass 5 result: Quality validation */
  qualityValidation: DesignQualityValidation | null;

  /** Error message if generation failed */
  error: string | null;

  /** Callback to start generation */
  onGenerate: () => void;

  /** Callback to cancel generation */
  onCancel: () => void;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface PassIndicatorProps {
  passNumber: number;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  children?: React.ReactNode;
}

const PassIndicator: React.FC<PassIndicatorProps> = ({
  passNumber,
  title,
  description,
  status,
  children,
}) => {
  const statusStyles = {
    pending: 'bg-zinc-800 border-zinc-700 text-zinc-500',
    active: 'bg-blue-900/30 border-blue-500/50 text-blue-400 animate-pulse',
    complete: 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400',
    error: 'bg-red-900/30 border-red-500/50 text-red-400',
  };

  const iconStyles = {
    pending: 'bg-zinc-700 text-zinc-500',
    active: 'bg-blue-500/20 text-blue-400',
    complete: 'bg-emerald-500/20 text-emerald-400',
    error: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className={`p-4 rounded-xl border ${statusStyles[status]} transition-all duration-300`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${iconStyles[status]}`}>
          {status === 'complete' ? '✓' : status === 'error' ? '✕' : passNumber}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-zinc-200">{title}</h4>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          {children && status === 'complete' && (
            <div className="mt-3 pt-3 border-t border-zinc-700/50">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ContentAnalysisSummary: React.FC<{ analysis: ContentAnalysis }> = ({ analysis }) => (
  <div className="grid grid-cols-3 gap-2 text-xs">
    <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
      <div className="text-lg font-bold text-zinc-200">{analysis.sections.length}</div>
      <div className="text-zinc-500">Sections</div>
    </div>
    <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
      <div className="text-lg font-bold text-zinc-200">{analysis.totalWordCount}</div>
      <div className="text-zinc-500">Words</div>
    </div>
    <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
      <div className="text-lg font-bold text-zinc-200">{analysis.estimatedReadTime}</div>
      <div className="text-zinc-500">Min Read</div>
    </div>
    <div className="col-span-3 flex flex-wrap gap-1 mt-2">
      {analysis.sections.map((section, i) => (
        <span
          key={i}
          className="px-2 py-0.5 bg-zinc-700/50 rounded text-[10px] text-zinc-400"
        >
          {section.contentType}
        </span>
      ))}
    </div>
  </div>
);

const ComponentSelectionsSummary: React.FC<{ selections: ComponentSelection[] }> = ({ selections }) => {
  const componentCounts = selections.reduce((acc, s) => {
    acc[s.selectedComponent] = (acc[s.selectedComponent] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {Object.entries(componentCounts).map(([component, count]) => (
          <span
            key={component}
            className="px-2 py-1 bg-zinc-700/50 rounded text-[10px] text-zinc-300 flex items-center gap-1"
          >
            <span className="font-medium">{component}</span>
            {count > 1 && <span className="text-zinc-500">×{count}</span>}
          </span>
        ))}
      </div>
    </div>
  );
};

const RhythmPlanSummary: React.FC<{ plan: VisualRhythmPlan }> = ({ plan }) => {
  const emphasisCounts = plan.sections.reduce((acc, s) => {
    acc[s.emphasisLevel] = (acc[s.emphasisLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const emphasisColors: Record<string, string> = {
    'hero-moment': 'bg-purple-500/20 text-purple-300',
    'featured': 'bg-amber-500/20 text-amber-300',
    'background': 'bg-zinc-600/30 text-zinc-400',
    'normal': 'bg-zinc-700/30 text-zinc-500',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Pacing:</span>
        <span className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300 capitalize">
          {plan.overallPacing}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {Object.entries(emphasisCounts).map(([emphasis, count]) => (
          <span
            key={emphasis}
            className={`px-2 py-0.5 rounded text-[10px] ${emphasisColors[emphasis] || 'bg-zinc-700 text-zinc-400'}`}
          >
            {emphasis} ×{count}
          </span>
        ))}
      </div>
    </div>
  );
};

const QualityValidationSummary: React.FC<{ validation: DesignQualityValidation }> = ({ validation }) => {
  const scoreColor = validation.overallScore >= 80 ? 'text-emerald-400' :
                     validation.overallScore >= 60 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Overall Score</span>
        <span className={`text-2xl font-bold ${scoreColor}`}>{validation.overallScore}%</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center justify-between bg-zinc-800/50 rounded px-2 py-1">
          <span className="text-zinc-500">Colors</span>
          <span className={validation.colorMatch.passed ? 'text-emerald-400' : 'text-red-400'}>
            {validation.colorMatch.score}%
          </span>
        </div>
        <div className="flex items-center justify-between bg-zinc-800/50 rounded px-2 py-1">
          <span className="text-zinc-500">Typography</span>
          <span className={validation.typographyMatch.passed ? 'text-emerald-400' : 'text-red-400'}>
            {validation.typographyMatch.score}%
          </span>
        </div>
        <div className="flex items-center justify-between bg-zinc-800/50 rounded px-2 py-1">
          <span className="text-zinc-500">Depth</span>
          <span className={validation.visualDepth.passed ? 'text-emerald-400' : 'text-red-400'}>
            {validation.visualDepth.score}%
          </span>
        </div>
        <div className="flex items-center justify-between bg-zinc-800/50 rounded px-2 py-1">
          <span className="text-zinc-500">Brand Fit</span>
          <span className={validation.brandFit.passed ? 'text-emerald-400' : 'text-red-400'}>
            {validation.brandFit.score}%
          </span>
        </div>
      </div>
      {validation.passesThreshold ? (
        <div className="text-xs text-emerald-400 bg-emerald-900/20 rounded-lg p-2 text-center">
          ✓ Design passes quality threshold
        </div>
      ) : (
        <div className="text-xs text-amber-400 bg-amber-900/20 rounded-lg p-2 text-center">
          ⚠ Design may need adjustments
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DesignGenerationStep: React.FC<DesignGenerationStepProps> = ({
  isGenerating,
  currentPass,
  progress,
  contentAnalysis,
  componentSelections,
  rhythmPlan,
  designApplied,
  qualityValidation,
  error,
  onGenerate,
  onCancel,
}) => {
  const getPassStatus = (passNumber: number): 'pending' | 'active' | 'complete' | 'error' => {
    if (error) return 'error';
    if (currentPass === 'complete') return 'complete';
    if (currentPass === null) return 'pending';
    if (passNumber < currentPass) return 'complete';
    if (passNumber === currentPass) return 'active';
    return 'pending';
  };

  // Not started yet
  if (!isGenerating && currentPass === null && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
          <span className="text-3xl">🎨</span>
        </div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-2">
          Multi-Pass Design Generation
        </h3>
        <p className="text-sm text-zinc-500 max-w-md mb-6">
          Our AI will analyze your content and generate a professionally designed layout
          through 5 intelligent passes.
        </p>
        <button
          onClick={onGenerate}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
        >
          Generate Design
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Pass Indicators */}
      <div className="space-y-3">
        <PassIndicator
          passNumber={1}
          title="Content Analysis"
          description="Parsing article structure and identifying content types"
          status={getPassStatus(1)}
        >
          {contentAnalysis && <ContentAnalysisSummary analysis={contentAnalysis} />}
        </PassIndicator>

        <PassIndicator
          passNumber={2}
          title="Component Selection"
          description="Choosing optimal UI components for each section"
          status={getPassStatus(2)}
        >
          {componentSelections && <ComponentSelectionsSummary selections={componentSelections} />}
        </PassIndicator>

        <PassIndicator
          passNumber={3}
          title="Visual Rhythm"
          description="Planning emphasis, spacing, and visual anchors"
          status={getPassStatus(3)}
        >
          {rhythmPlan && <RhythmPlanSummary plan={rhythmPlan} />}
        </PassIndicator>

        <PassIndicator
          passNumber={4}
          title="Design Application"
          description="Building the complete design blueprint"
          status={getPassStatus(4)}
        >
          {designApplied && (
            <div className="text-xs text-emerald-400">
              ✓ Blueprint assembled with {componentSelections?.length || 0} sections
            </div>
          )}
        </PassIndicator>

        <PassIndicator
          passNumber={5}
          title="Quality Validation"
          description="Comparing output with target brand"
          status={getPassStatus(5)}
        >
          {qualityValidation && <QualityValidationSummary validation={qualityValidation} />}
        </PassIndicator>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={onGenerate}
            className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
          >
            Retry Generation
          </button>
        </div>
      )}

      {/* Cancel Button */}
      {isGenerating && (
        <div className="flex justify-center">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Complete State */}
      {currentPass === 'complete' && !error && (
        <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl text-center">
          <p className="text-sm text-emerald-400 font-medium">
            ✓ Design generation complete!
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Your article has been styled and is ready for preview.
          </p>
        </div>
      )}
    </div>
  );
};

export default DesignGenerationStep;
