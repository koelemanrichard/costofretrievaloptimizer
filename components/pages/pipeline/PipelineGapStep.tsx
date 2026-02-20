import React, { useState } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import { runQueryNetworkAudit } from '../../../services/ai/queryNetworkAudit';
import type { QueryNetworkAnalysisResult, QueryNetworkAuditConfig } from '../../../types';

// ──── Metric Card ────

function ScoreCard({ label, value, color = 'gray' }: {
  label: string;
  value: string | number;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'gray';
}) {
  const colorMap: Record<string, string> = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    gray: 'text-gray-400',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
      <p className={`text-3xl font-bold ${colorMap[color]}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

// ──── Greenfield Skip Notice ────

function GreenfieldSkipNotice({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-center">
        <svg
          className="w-10 h-10 text-gray-500 mx-auto mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <p className="text-sm text-gray-400">
          No existing site to analyze &mdash; this step was auto-skipped.
        </p>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onContinue}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors"
        >
          Continue to Strategy
        </button>
      </div>
    </div>
  );
}

// ──── Gap Analysis Content ────

function GapAnalysisContent({
  results,
  isGenerating,
  progress,
  error,
  onRunAnalysis,
}: {
  results: QueryNetworkAnalysisResult | null;
  isGenerating: boolean;
  progress: string;
  error: string | null;
  onRunAnalysis: () => void;
}) {
  const criticalGaps = results?.contentGaps?.filter(g => g.priority === 'high') ?? [];
  const mediumGaps = results?.contentGaps?.filter(g => g.priority === 'medium') ?? [];
  const queryCount = results?.queryNetwork?.length ?? 0;
  const eavCount = results?.competitorEAVs?.length ?? 0;
  const densityScore = results?.informationDensity?.competitorAverage?.densityScore ?? '--';
  const recCount = results?.recommendations?.length ?? 0;

  // Build entity inventory from competitor EAVs
  const entityMap = new Map<string, { mentions: number; eavCount: number; consistent: boolean }>();
  if (results?.competitorEAVs) {
    for (const eav of results.competitorEAVs) {
      const key = eav.entity;
      const existing = entityMap.get(key);
      if (existing) {
        existing.eavCount++;
      } else {
        entityMap.set(key, { mentions: 1, eavCount: 1, consistent: eav.confidence > 0.7 });
      }
    }
  }
  const entities = [...entityMap.entries()].slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard
          label="Queries Analyzed"
          value={results ? queryCount : '--'}
          color={results ? 'blue' : 'gray'}
        />
        <ScoreCard
          label="Competitor EAVs"
          value={results ? eavCount : '--'}
          color={results ? 'green' : 'gray'}
        />
        <ScoreCard
          label="Density Score"
          value={results ? densityScore : '--'}
          color={results ? (Number(densityScore) >= 60 ? 'green' : 'amber') : 'gray'}
        />
        <ScoreCard
          label="Recommendations"
          value={results ? recCount : '--'}
          color={results ? (recCount > 0 ? 'amber' : 'green') : 'gray'}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Progress */}
      {isGenerating && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="animate-spin w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-blue-300">{progress || 'Running gap analysis...'}</p>
        </div>
      )}

      {/* Critical Gaps */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Critical Gaps</h3>
        <div className="space-y-3">
          {results && criticalGaps.length > 0 ? (
            criticalGaps.slice(0, 5).map((gap, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                <div>
                  <span className="text-gray-200">{gap.missingAttribute}</span>
                  <span className="text-gray-500 ml-2">
                    — found in {gap.frequency} competitor{gap.frequency !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))
          ) : results && criticalGaps.length === 0 ? (
            <div className="flex items-center gap-3 text-sm text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
              <span>No critical gaps found — good coverage</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
                <span>Run gap analysis to identify critical issues</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
                <span>Missing content clusters will appear here</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
                <span>Competitor coverage gaps will be highlighted</span>
              </div>
            </>
          )}
        </div>
        {results && mediumGaps.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-400 mb-2">{mediumGaps.length} medium-priority gaps also found</p>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {results && results.recommendations.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Top Recommendations</h3>
          <div className="space-y-3">
            {results.recommendations.slice(0, 4).map((rec, i) => (
              <div key={i} className="bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded border ${
                    rec.priority === 'critical'
                      ? 'bg-red-900/20 text-red-300 border-red-700/40'
                      : rec.priority === 'high'
                        ? 'bg-amber-900/20 text-amber-300 border-amber-700/40'
                        : 'bg-yellow-900/20 text-yellow-300 border-yellow-700/40'
                  }`}>
                    {rec.priority}
                  </span>
                  <span className="text-sm font-medium text-gray-200">{rec.title}</span>
                </div>
                <p className="text-xs text-gray-400">{rec.suggestedAction}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entity Inventory Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-200">Entity Inventory</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Entity</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Mentions</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">EAV Count</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Consistent?</th>
              </tr>
            </thead>
            <tbody>
              {entities.length > 0 ? (
                entities.map(([name, data], i) => (
                  <tr key={i} className="border-b border-gray-700/50">
                    <td className="px-6 py-3 text-gray-300 font-medium">{name}</td>
                    <td className="px-6 py-3 text-gray-400">Entity</td>
                    <td className="px-6 py-3 text-center text-gray-300">{data.mentions}</td>
                    <td className="px-6 py-3 text-center text-gray-300">{data.eavCount}</td>
                    <td className="px-6 py-3 text-center">
                      {data.consistent ? (
                        <span className="text-green-400 text-xs">Yes</span>
                      ) : (
                        <span className="text-amber-400 text-xs">Review</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No entities discovered yet. Run gap analysis to populate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Run Analysis Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onRunAnalysis}
          disabled={isGenerating}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2"
        >
          {isGenerating && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isGenerating ? 'Analyzing...' : results ? 'Re-run Gap Analysis' : 'Run Gap Analysis'}
        </button>
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineGapStep: React.FC = () => {
  const {
    isGreenfield,
    autoApprove,
    advanceStep,
    approveGate,
    rejectGate,
    reviseStep,
    toggleAutoApprove,
    getStepState,
    setCurrentStep,
    setStepStatus,
    activeMap,
  } = usePipeline();
  const { state } = useAppState();

  const stepState = getStepState('gap_analysis');
  const gate = stepState?.gate;

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<QueryNetworkAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleContinueToStrategy = () => {
    setCurrentStep('strategy');
  };

  const handleRunAnalysis = async () => {
    const businessInfo = state.businessInfo;
    const pillars = activeMap?.pillars;

    // Central Entity from pillars, or fall back to seedKeyword from business info (set during crawl step)
    const centralEntity = pillars?.centralEntity || businessInfo.seedKeyword;

    if (!centralEntity) {
      setError('Central Entity or Seed Keyword is required. Complete the Crawl step with business context first.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress('Starting gap analysis...');
    setStepStatus('gap_analysis', 'in_progress');

    const config: QueryNetworkAuditConfig = {
      seedKeyword: centralEntity,
      targetDomain: businessInfo.domain,
      maxQueries: 10,
      maxCompetitors: 5,
      includeOwnContent: !!businessInfo.domain,
      includeEntityValidation: false,
      language: businessInfo.language || 'en',
    };

    try {
      const result = await runQueryNetworkAudit(config, businessInfo, (prog) => {
        setProgress(prog.currentStep);
      });
      setResults(result);
      setStepStatus('gap_analysis', 'pending_approval');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gap analysis failed';
      setError(message);
      setStepStatus('gap_analysis', 'in_progress');
    } finally {
      setIsGenerating(false);
      setProgress('');
    }
  };

  const summaryMetrics = results
    ? [
        { label: 'Queries', value: results.queryNetwork.length, color: 'blue' as const },
        { label: 'Competitor EAVs', value: results.competitorEAVs.length, color: 'green' as const },
        { label: 'Density Score', value: results.informationDensity.competitorAverage.densityScore, color: 'amber' as const },
        { label: 'Recommendations', value: results.recommendations.length, color: 'amber' as const },
      ]
    : [
        { label: 'Queries', value: '--', color: 'gray' as const },
        { label: 'Competitor EAVs', value: '--', color: 'gray' as const },
        { label: 'Density Score', value: '--', color: 'gray' as const },
        { label: 'Recommendations', value: '--', color: 'gray' as const },
      ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Gap Analysis</h2>
        <p className="text-sm text-gray-400 mt-1">
          {isGreenfield
            ? 'No existing site to analyze'
            : 'Analyze your existing website against the Holistic SEO framework'}
        </p>
      </div>

      {/* Content */}
      {isGreenfield ? (
        <GreenfieldSkipNotice onContinue={handleContinueToStrategy} />
      ) : (
        <>
          <GapAnalysisContent
            results={results}
            isGenerating={isGenerating}
            progress={progress}
            error={error}
            onRunAnalysis={handleRunAnalysis}
          />

          {/* Approval Gate */}
          {gate && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
            <ApprovalGate
              step="gap_analysis"
              gate={gate}
              approval={stepState?.approval}
              autoApprove={autoApprove}
              onApprove={() => approveGate('gap_analysis')}
              onReject={(reason) => rejectGate('gap_analysis', reason)}
              onRevise={() => reviseStep('gap_analysis')}
              onToggleAutoApprove={toggleAutoApprove}
              summaryMetrics={summaryMetrics}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PipelineGapStep;
