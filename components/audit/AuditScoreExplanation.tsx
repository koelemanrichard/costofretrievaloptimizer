import React, { useState } from 'react';
import { DEFAULT_AUDIT_WEIGHTS } from '../../services/audit/types';

export interface AuditScoreExplanationProps {
  score: number;
}

interface ScoreBand {
  label: string;
  badgeColor: string;
  textColor: string;
  message: string;
}

function getScoreBand(score: number): ScoreBand {
  if (score >= 90) {
    return {
      label: 'Exceptional',
      badgeColor: 'bg-green-600',
      textColor: 'text-green-100',
      message: 'This content exceeds professional standards.',
    };
  }
  if (score >= 80) {
    return {
      label: 'Strong',
      badgeColor: 'bg-green-600',
      textColor: 'text-green-100',
      message: 'This content meets high-quality standards. Minor refinements possible.',
    };
  }
  if (score >= 70) {
    return {
      label: 'Good',
      badgeColor: 'bg-blue-600',
      textColor: 'text-blue-100',
      message: 'This content is well-optimized. Focus on high-impact findings.',
    };
  }
  if (score >= 60) {
    return {
      label: 'Fair',
      badgeColor: 'bg-yellow-600',
      textColor: 'text-yellow-100',
      message: 'Some improvements needed. Address critical and high-severity findings first.',
    };
  }
  if (score >= 40) {
    return {
      label: 'Needs Work',
      badgeColor: 'bg-orange-600',
      textColor: 'text-orange-100',
      message: 'Several areas need attention. Start with critical issues.',
    };
  }
  return {
    label: 'Major Issues',
    badgeColor: 'bg-red-600',
    textColor: 'text-red-100',
    message: 'Significant optimization needed across multiple areas.',
  };
}

/** Returns the top 3 phase weights sorted by weight descending. */
function getTopWeights(): { name: string; weight: number }[] {
  const DISPLAY_NAMES: Record<string, string> = {
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

  return Object.entries(DEFAULT_AUDIT_WEIGHTS)
    .map(([key, weight]) => ({ name: DISPLAY_NAMES[key] || key, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);
}

export const AuditScoreExplanation: React.FC<AuditScoreExplanationProps> = ({ score }) => {
  const [isCalculationOpen, setIsCalculationOpen] = useState(false);
  const clampedScore = Math.max(0, Math.min(100, score));
  const band = getScoreBand(clampedScore);
  const topWeights = getTopWeights();

  return (
    <div className="space-y-3" data-testid="audit-score-explanation">
      {/* Badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${band.badgeColor} ${band.textColor}`}
          data-testid="score-badge"
        >
          {band.label}
        </span>
      </div>

      {/* Contextual message */}
      <p className="text-sm text-gray-300" data-testid="score-message">
        {band.message}
      </p>

      {/* Philosophy explanation */}
      <p className="text-sm text-gray-400" data-testid="scoring-philosophy">
        Our audit uses a penalty-based scoring model. A score of 70+ indicates well-crafted content.
        Focus on critical and high-severity findings for the biggest impact.
      </p>

      {/* Collapsible calculation section */}
      <div className="border border-gray-700 rounded-lg">
        <button
          type="button"
          onClick={() => setIsCalculationOpen(!isCalculationOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-800/50 transition-colors rounded-lg"
          aria-expanded={isCalculationOpen}
          data-testid="calculation-toggle"
        >
          <span>How is this calculated?</span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isCalculationOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isCalculationOpen && (
          <div
            className="px-4 pb-4 space-y-3 border-t border-gray-700/50"
            data-testid="calculation-details"
          >
            {/* Penalty system */}
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">
                Penalty System
              </h4>
              <p className="text-sm text-gray-400 mb-2">
                Each score starts at 100 and deducts points per finding based on severity:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm" data-testid="penalty-table">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-gray-400">Critical: -15 points</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-gray-400">High: -8 points</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-gray-400">Medium: -4 points</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  <span className="text-gray-400">Low: -1 point</span>
                </div>
              </div>
            </div>

            {/* Phase weights */}
            <div>
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2">
                Top Phase Weights
              </h4>
              <p className="text-sm text-gray-400 mb-2">
                Each audit phase contributes proportionally to the overall score:
              </p>
              <div className="space-y-1.5" data-testid="top-weights">
                {topWeights.map(({ name, weight }) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{name}</span>
                    <span className="text-gray-500 tabular-nums">{weight}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditScoreExplanation;
