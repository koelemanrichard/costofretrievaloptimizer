import React, { useMemo } from 'react';
import { DEFAULT_AUDIT_WEIGHTS } from '../../services/audit/types';

export interface AuditWeightSlidersProps {
  weights: Record<string, number>;
  onChange: (weights: Record<string, number>) => void;
  disabled?: boolean;
}

/** Display names for scored audit phases (excludes websiteTypeSpecific and factValidation). */
const PHASE_NAMES: Record<string, string> = {
  strategicFoundation: 'Strategic Foundation',
  eavSystem: 'EAV System',
  microSemantics: 'Micro-Semantics',
  informationDensity: 'Information Density',
  contextualFlow: 'Contextual Flow',
  internalLinking: 'Internal Linking',
  semanticDistance: 'Semantic Distance',
  contentFormat: 'Content Format',
  htmlTechnical: 'HTML Technical',
  metaStructuredData: 'Meta & Structured Data',
  costOfRetrieval: 'Cost of Retrieval',
  urlArchitecture: 'URL Architecture',
  crossPageConsistency: 'Cross-Page Consistency',
};

const SCORED_PHASES = Object.keys(PHASE_NAMES);

export const AuditWeightSliders: React.FC<AuditWeightSlidersProps> = ({
  weights,
  onChange,
  disabled = false,
}) => {
  const total = useMemo(
    () => SCORED_PHASES.reduce((sum, phase) => sum + (weights[phase] ?? 0), 0),
    [weights],
  );

  const isTotalValid = total === 100;

  const handleSliderChange = (phase: string, value: number) => {
    const updated = { ...weights, [phase]: value };
    onChange(updated);
  };

  const handleReset = () => {
    onChange({ ...DEFAULT_AUDIT_WEIGHTS });
  };

  return (
    <div
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
      data-testid="audit-weight-sliders"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-100">Audit Weights</h3>
        <button
          type="button"
          className="text-sm text-orange-400 hover:text-orange-300 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleReset}
          disabled={disabled}
          data-testid="reset-weights-button"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Total indicator */}
      <div className="mb-4" data-testid="total-indicator">
        <span
          className={`text-lg font-semibold ${isTotalValid ? 'text-green-400' : 'text-red-400'}`}
          data-testid="total-value"
        >
          Total: {total}%
        </span>
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        {SCORED_PHASES.map((phase) => (
          <div key={phase} className="flex items-center gap-3" data-testid={`slider-row-${phase}`}>
            <label
              className="text-sm text-gray-300 w-44 shrink-0"
              htmlFor={`weight-slider-${phase}`}
            >
              {PHASE_NAMES[phase]}
            </label>
            <input
              id={`weight-slider-${phase}`}
              type="range"
              min={0}
              max={50}
              step={1}
              value={weights[phase] ?? 0}
              onChange={(e) => handleSliderChange(phase, Number(e.target.value))}
              disabled={disabled}
              className="flex-1 accent-orange-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid={`slider-${phase}`}
            />
            <span
              className="text-sm font-mono text-gray-300 w-10 text-right"
              data-testid={`value-${phase}`}
            >
              {weights[phase] ?? 0}%
            </span>
          </div>
        ))}
      </div>

      {/* Warning / helper text */}
      {!isTotalValid && (
        <p
          className="mt-3 text-sm text-red-400"
          data-testid="total-warning"
        >
          Weights must sum to 100%. Currently {total}%.
        </p>
      )}
      <p className="mt-3 text-xs text-gray-500">
        Adjust the weight of each audit phase. Weights must total 100%.
      </p>
    </div>
  );
};

export default AuditWeightSliders;
