import React from 'react';
import { SemanticAuditResult, BusinessInfo } from '../../types';
import { CoreEntityBoxes } from './CoreEntityBoxes';
import { SemanticActionCard } from './SemanticActionCard';
import { SimpleMarkdown } from './SimpleMarkdown';
import { AppAction } from '../../state/appState';

interface SemanticAnalysisPanelProps {
  result: SemanticAuditResult;
  pageContent: string;
  businessInfo: BusinessInfo;
  dispatch: React.Dispatch<AppAction>;
  onActionFixGenerated?: (actionId: string, fix: string) => void;
}

export const SemanticAnalysisPanel: React.FC<SemanticAnalysisPanelProps> = ({
  result,
  pageContent,
  businessInfo,
  dispatch,
  onActionFixGenerated,
}) => {
  // Score color coding
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500/20 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Needs Optimization';
    return 'Critical Issues';
  };

  // Group actions by category
  const actionsByCategory = {
    'Low Hanging Fruit': result.actions.filter(a => a.category === 'Low Hanging Fruit'),
    'Mid Term': result.actions.filter(a => a.category === 'Mid Term'),
    'Long Term': result.actions.filter(a => a.category === 'Long Term'),
  };

  return (
    <div className="semantic-analysis-panel space-y-8">
      {/* Section 1: Core Entities */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Core Entities</h2>
        <CoreEntityBoxes entities={result.coreEntities} />
      </section>

      {/* Section 2: Score Card */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Overall Semantic Score</h2>
        <div
          className={`
            ${getScoreBgColor(result.overallScore)}
            border rounded-lg p-6 text-center
          `}
        >
          <div className={`text-6xl font-bold ${getScoreColor(result.overallScore)} mb-2`}>
            {result.overallScore}
            <span className="text-3xl text-gray-400">/100</span>
          </div>
          <div className={`text-xl font-semibold ${getScoreColor(result.overallScore)}`}>
            {getScoreLabel(result.overallScore)}
          </div>
        </div>
        {result.summary && (
          <div className="mt-4 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <SimpleMarkdown content={result.summary} />
          </div>
        )}
      </section>

      {/* Section 3: Macro/Micro Analysis Grid */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Semantic Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Macro-Semantics (Structure) */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🌐</span>
              <h3 className="text-xl font-bold text-white">Macro-Semantics (Structure)</h3>
            </div>

            <div className="space-y-4">
              {/* Contextual Vector */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Contextual Vector
                </h4>
                <div className="bg-gray-900/50 border border-gray-700 rounded p-3">
                  <SimpleMarkdown content={result.macroAnalysis.contextualVector} />
                </div>
              </div>

              {/* Hierarchy */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Hierarchy
                </h4>
                <div className="bg-gray-900/50 border border-gray-700 rounded p-3">
                  <SimpleMarkdown content={result.macroAnalysis.hierarchy} />
                </div>
              </div>

              {/* Source Context */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Source Context
                </h4>
                <div className="bg-gray-900/50 border border-gray-700 rounded p-3">
                  <SimpleMarkdown content={result.macroAnalysis.sourceContext} />
                </div>
              </div>
            </div>
          </div>

          {/* Micro-Semantics (Linguistics) */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔬</span>
              <h3 className="text-xl font-bold text-white">Micro-Semantics (Linguistics)</h3>
            </div>

            <div className="space-y-4">
              {/* Sentence Structure */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Sentence Structure
                </h4>
                <div className="bg-gray-900/50 border border-gray-700 rounded p-3">
                  <SimpleMarkdown content={result.microAnalysis.sentenceStructure} />
                </div>
              </div>

              {/* Information Density */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Information Density
                </h4>
                <div className="bg-gray-900/50 border border-gray-700 rounded p-3">
                  <SimpleMarkdown content={result.microAnalysis.informationDensity} />
                </div>
              </div>

              {/* HTML Semantics */}
              <div>
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  HTML Semantics
                </h4>
                <div className="bg-gray-900/50 border border-gray-700 rounded p-3">
                  <SimpleMarkdown content={result.microAnalysis.htmlSemantics} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Action Plan - 3 Phases */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Action Plan</h2>

        {/* Phase 1: Low Hanging Fruit */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🍏</span>
            <h3 className="text-xl font-bold text-green-400">
              Phase 1: Low Hanging Fruit
            </h3>
            <span className="text-sm text-gray-400 ml-2">
              ({actionsByCategory['Low Hanging Fruit'].length} actions)
            </span>
          </div>
          {actionsByCategory['Low Hanging Fruit'].length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {actionsByCategory['Low Hanging Fruit'].map((action) => (
                <SemanticActionCard
                  key={action.id}
                  action={action}
                  pageContent={pageContent}
                  businessInfo={businessInfo}
                  dispatch={dispatch}
                  onFixGenerated={onActionFixGenerated}
                />
              ))}
            </div>
          ) : (
            <div className="text-gray-400 italic bg-gray-800/30 border border-gray-700 rounded p-4">
              No quick-win actions identified. Great job!
            </div>
          )}
        </div>

        {/* Phase 2: Mid-Term */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🏗️</span>
            <h3 className="text-xl font-bold text-yellow-400">
              Phase 2: Mid-Term
            </h3>
            <span className="text-sm text-gray-400 ml-2">
              ({actionsByCategory['Mid Term'].length} actions)
            </span>
          </div>
          {actionsByCategory['Mid Term'].length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {actionsByCategory['Mid Term'].map((action) => (
                <SemanticActionCard
                  key={action.id}
                  action={action}
                  pageContent={pageContent}
                  businessInfo={businessInfo}
                  dispatch={dispatch}
                  onFixGenerated={onActionFixGenerated}
                />
              ))}
            </div>
          ) : (
            <div className="text-gray-400 italic bg-gray-800/30 border border-gray-700 rounded p-4">
              No mid-term actions identified.
            </div>
          )}
        </div>

        {/* Phase 3: Long-Term */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🏛️</span>
            <h3 className="text-xl font-bold text-blue-400">
              Phase 3: Long-Term
            </h3>
            <span className="text-sm text-gray-400 ml-2">
              ({actionsByCategory['Long Term'].length} actions)
            </span>
          </div>
          {actionsByCategory['Long Term'].length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {actionsByCategory['Long Term'].map((action) => (
                <SemanticActionCard
                  key={action.id}
                  action={action}
                  pageContent={pageContent}
                  businessInfo={businessInfo}
                  dispatch={dispatch}
                  onFixGenerated={onActionFixGenerated}
                />
              ))}
            </div>
          ) : (
            <div className="text-gray-400 italic bg-gray-800/30 border border-gray-700 rounded p-4">
              No long-term actions identified.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SemanticAnalysisPanel;
