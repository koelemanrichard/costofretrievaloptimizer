import React, { useState } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import {
  detectIndustryType,
  getPredicateSuggestions,
  generateEavTemplate,
  calculateIndustryCoverage,
} from '../../../services/ai/eavService';
import type { SemanticTriple } from '../../../types';
import { getSupabaseClient } from '../../../services/supabaseClient';

// ──── Metric Card ────

function MetricCard({ label, value, color = 'gray' }: {
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
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

// ──── EAV Table ────

function EavInventoryTable({ eavs }: { eavs: Partial<SemanticTriple>[] }) {
  const filled = eavs.filter(e => e.object?.value);
  const needConfirmation = eavs.filter(e => !e.object?.value);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">EAV Inventory</h3>
        <span className="text-xs text-gray-500">{eavs.length} triples</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Entity</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Attribute</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {eavs.length > 0 ? (
              eavs.map((eav, i) => (
                <tr key={i} className="border-b border-gray-700/50">
                  <td className="px-6 py-3 text-gray-300 font-medium truncate max-w-[120px]">
                    {eav.subject?.label ?? '—'}
                  </td>
                  <td className="px-6 py-3 text-gray-300 font-mono text-xs">
                    {eav.predicate?.relation ?? '—'}
                  </td>
                  <td className="px-6 py-3 text-gray-400 italic text-xs">
                    {eav.object?.value ? String(eav.object.value) : <span className="text-amber-500">needs value</span>}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${
                      eav.predicate?.category === 'UNIQUE'
                        ? 'bg-purple-900/20 text-purple-300 border-purple-700/40'
                        : eav.predicate?.category === 'ROOT'
                          ? 'bg-blue-900/20 text-blue-300 border-blue-700/40'
                          : eav.predicate?.category === 'RARE'
                            ? 'bg-green-900/20 text-green-300 border-green-700/40'
                            : 'bg-gray-700 text-gray-400 border-gray-600'
                    }`}>
                      {eav.predicate?.category ?? 'COMMON'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    {eav.object?.value ? (
                      <span className="text-green-400 text-xs">Ready</span>
                    ) : (
                      <span className="text-amber-400 text-xs">Pending</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <svg
                      className="w-10 h-10 text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                      />
                    </svg>
                    <p className="text-sm text-gray-500">Generate EAV inventory from strategy</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──── Data Requests Panel ────

function DataRequestsPanel({ questions }: { questions: string[] }) {
  const defaultQuestions = [
    'What are the unique specifications of your top 5 products/services?',
    'Do you have proprietary data, certifications, or awards to reference?',
    'What are the most common customer objections or misconceptions?',
    'Which attributes differentiate you from your top 3 competitors?',
    'What numeric values (prices, measurements, ratings) should be included?',
  ];

  const displayQuestions = questions.length > 0 ? questions : defaultQuestions;

  return (
    <div className="bg-gray-900 border border-amber-700/50 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-5 h-5 text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <h3 className="text-sm font-semibold text-amber-300">Data Requests</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        These questions need answers from the business to complete the EAV inventory accurately.
      </p>
      <div className="space-y-2">
        {displayQuestions.map((question, i) => (
          <div key={i} className="flex items-start gap-3 bg-gray-800/50 rounded-md px-4 py-3">
            <span className="text-xs text-amber-400 font-mono mt-0.5">Q{i + 1}</span>
            <p className="text-sm text-gray-300">{question}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineEavsStep: React.FC = () => {
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

  const stepState = getStepState('eavs');
  const gate = stepState?.gate;

  // Load existing EAVs from active map or state
  const existingEavs: SemanticTriple[] = activeMap?.eavs ?? state.topicalMaps.find(m => m.id === state.activeMapId)?.eavs ?? [];

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEavs, setGeneratedEavs] = useState<Partial<SemanticTriple>[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Use existing map EAVs if available, fallback to generated
  const displayEavs = existingEavs.length > 0 ? existingEavs : generatedEavs;

  const handleGenerateEavs = async () => {
    const businessInfo = state.businessInfo;
    const pillars = activeMap?.pillars;

    if (!pillars?.centralEntity) {
      setError('Central Entity is required. Complete the Strategy step first.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setStepStatus('eavs', 'in_progress');

    try {
      // Detect industry type from business info
      const industryType = detectIndustryType(businessInfo);

      // Get predicate suggestions for this industry
      const suggestions = getPredicateSuggestions(industryType);

      // Generate EAV templates for high and medium priority predicates
      const highAndMedium = suggestions.filter(s => s.priority === 'high' || s.priority === 'medium');
      const templates = highAndMedium.map(s => generateEavTemplate(s, pillars.centralEntity));

      setGeneratedEavs(templates);

      // If we have an active map with no existing EAVs, persist the templates
      if (state.activeMapId && existingEavs.length === 0) {
        // Convert partial templates to SemanticTriple format for storage
        const partialTriples = templates.map((t, i) => ({
          id: `eav-${i}`,
          ...t,
          subject: t.subject ?? { label: pillars.centralEntity, type: 'Entity' as const },
          predicate: t.predicate ?? { relation: '', type: 'Property' as const, category: 'COMMON' as const },
          object: t.object ?? { value: '', type: 'Value' as const },
        })) as SemanticTriple[];

        dispatch({
          type: 'UPDATE_MAP_DATA',
          payload: {
            mapId: state.activeMapId,
            data: { eavs: partialTriples },
          },
        });

        // Persist to Supabase
        try {
          const supabase = getSupabaseClient(
            businessInfo.supabaseUrl,
            businessInfo.supabaseAnonKey
          );
          await supabase
            .from('topical_maps')
            .update({ eavs: partialTriples } as any)
            .eq('id', state.activeMapId);
        } catch (err) {
          console.warn('[EAVs] Supabase save failed:', err);
        }
      }

      setStepStatus('eavs', 'pending_approval');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'EAV generation failed';
      setError(message);
      setStepStatus('eavs', 'in_progress');
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate coverage metrics
  const businessInfo = state.businessInfo;
  const industryType = detectIndustryType(businessInfo);
  const coverage = displayEavs.length > 0
    ? calculateIndustryCoverage(displayEavs as SemanticTriple[], industryType)
    : null;

  const totalTriples = displayEavs.length;
  const consistent = displayEavs.filter(e => e.object?.value).length;
  const needConfirmation = displayEavs.filter(e => !e.object?.value).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">EAV Inventory</h2>
        <p className="text-sm text-gray-400 mt-1">
          Entity-Attribute-Value triples that define your semantic content strategy
        </p>
      </div>

      {/* Prerequisite check */}
      {!activeMap?.pillars?.centralEntity && (
        <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-amber-300">
            Complete the Strategy step first — Central Entity is required to generate EAVs.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          label="Total Triples"
          value={totalTriples}
          color={totalTriples > 0 ? 'blue' : 'gray'}
        />
        <MetricCard
          label="With Values"
          value={consistent}
          color={consistent > 0 ? 'green' : 'gray'}
        />
        <MetricCard
          label="Need Confirmation"
          value={needConfirmation}
          color={needConfirmation > 0 ? 'amber' : 'gray'}
        />
      </div>

      {/* Industry coverage */}
      {coverage && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Industry Coverage ({industryType})
            </span>
            <span className="text-sm font-semibold text-blue-400">{coverage.score}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${coverage.score}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {coverage.highPriorityCovered}/{coverage.highPriorityTotal} high-priority predicates covered
          </p>
        </div>
      )}

      {/* EAV Table */}
      <EavInventoryTable eavs={displayEavs as SemanticTriple[]} />

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleGenerateEavs}
          disabled={isGenerating || !activeMap?.pillars?.centralEntity}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2"
        >
          {isGenerating && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isGenerating
            ? 'Generating...'
            : totalTriples > 0
              ? 'Regenerate EAVs'
              : 'Generate EAVs'}
        </button>
      </div>

      {/* Data Requests */}
      <DataRequestsPanel questions={[]} />

      {/* Approval Gate */}
      {gate && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
        <ApprovalGate
          step="eavs"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => approveGate('eavs')}
          onReject={(reason) => rejectGate('eavs', reason)}
          onRevise={() => reviseStep('eavs')}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Total Triples', value: totalTriples, color: totalTriples > 0 ? 'green' : 'gray' },
            { label: 'With Values', value: consistent, color: consistent > 0 ? 'green' : 'gray' },
            { label: 'Need Confirmation', value: needConfirmation, color: needConfirmation > 0 ? 'amber' : 'gray' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineEavsStep;
