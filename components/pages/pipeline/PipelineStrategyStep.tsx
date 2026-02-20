import React, { useState, useEffect } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import { getSupabaseClient } from '../../../services/supabaseClient';

// ──── Tag Input ────

function TagInput({ tags, onAdd, onRemove, placeholder }: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      onAdd(input.trim());
      setInput('');
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onRemove(tags.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded px-2 py-0.5 text-xs"
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="text-blue-400 hover:text-blue-200 ml-0.5"
          >
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
      />
    </div>
  );
}

// ──── Section Allocation ────

function SectionAllocationPanel() {
  const [sections] = useState([
    { name: 'Core Section (CS)', active: true, description: 'Monetization and conversion-focused pages' },
    { name: 'Author Section (AS)', active: true, description: 'Authority and expertise-building pages' },
  ]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Section Allocation</h3>
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.name}
            className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-md px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-200">{section.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{section.description}</p>
            </div>
            <div className={`w-3 h-3 rounded-full ${section.active ? 'bg-green-500' : 'bg-gray-600'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineStrategyStep: React.FC = () => {
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

  const stepState = getStepState('strategy');
  const gate = stepState?.gate;

  // Initialise form from existing map pillars if available
  const existingPillars = activeMap?.pillars;

  const [ceName, setCeName] = useState(existingPillars?.centralEntity ?? '');
  const [scType, setScType] = useState(existingPillars?.sourceContext ?? '');
  const [csiText, setCsiText] = useState(existingPillars?.centralSearchIntent ?? '');
  const [scPriorities, setScPriorities] = useState<string[]>(
    existingPillars?.primary_verb ? [existingPillars.primary_verb] : []
  );
  const [csiPredicates, setCsiPredicates] = useState<string[]>(
    existingPillars?.auxiliary_verb ? [existingPillars.auxiliary_verb] : []
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync form if active map changes (e.g. after navigation)
  useEffect(() => {
    if (existingPillars) {
      setCeName(existingPillars.centralEntity ?? '');
      setScType(existingPillars.sourceContext ?? '');
      setCsiText(existingPillars.centralSearchIntent ?? '');
    }
  }, [activeMap?.id]);

  const handleSaveStrategy = async () => {
    if (!ceName.trim()) {
      setSaveError('Central Entity name is required.');
      return;
    }
    if (!scType.trim()) {
      setSaveError('Source Context type is required.');
      return;
    }

    setSaveError(null);
    setIsSaving(true);
    setStepStatus('strategy', 'in_progress');

    const pillars = {
      centralEntity: ceName.trim(),
      sourceContext: scType.trim(),
      centralSearchIntent: csiText.trim() || csiPredicates.join(', '),
      primary_verb: scPriorities[0] ?? '',
      auxiliary_verb: csiPredicates[0] ?? '',
    };

    // Dispatch to global state
    if (state.activeMapId) {
      dispatch({
        type: 'UPDATE_MAP_DATA',
        payload: { mapId: state.activeMapId, data: { pillars } },
      });

      // Persist to Supabase
      try {
        const supabase = getSupabaseClient(
          state.businessInfo.supabaseUrl,
          state.businessInfo.supabaseAnonKey
        );
        const { error } = await supabase
          .from('topical_maps')
          .update({ pillars } as any)
          .eq('id', state.activeMapId);

        if (error) {
          console.warn('[Strategy] Supabase save error:', error.message);
          // Non-fatal — state is saved in memory
        }
      } catch (err) {
        console.warn('[Strategy] Supabase save failed:', err);
      }
    }

    setSavedSuccess(true);
    setIsSaving(false);
    setStepStatus('strategy', 'pending_approval');

    // Reset success flash after 3 seconds
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Strategic Foundation</h2>
        <p className="text-sm text-gray-400 mt-1">
          Define the five core components: Central Entity, Source Context, and Central Search Intent
        </p>
      </div>

      {/* Error */}
      {saveError && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{saveError}</p>
        </div>
      )}

      {/* Success */}
      {savedSuccess && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-green-300">Strategy saved successfully.</p>
        </div>
      )}

      {/* Three-card strategy layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Central Entity (CE) */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded px-2 py-0.5 text-xs font-semibold">
              CE
            </span>
            <h3 className="text-sm font-semibold text-gray-200">Central Entity</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Entity Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={ceName}
                onChange={(e) => setCeName(e.target.value)}
                placeholder="e.g., Electric Bikes"
                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Source Context (SC) */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded px-2 py-0.5 text-xs font-semibold">
              SC
            </span>
            <h3 className="text-sm font-semibold text-gray-200">Source Context</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Source Type <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={scType}
                onChange={(e) => setScType(e.target.value)}
                placeholder="e.g., E-commerce retailer"
                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Attribute Priorities
              </label>
              <TagInput
                tags={scPriorities}
                onAdd={(tag) => setScPriorities([...scPriorities, tag])}
                onRemove={(i) => setScPriorities(scPriorities.filter((_, idx) => idx !== i))}
                placeholder="Type and press Enter..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Press Enter to add priority attributes
              </p>
            </div>
          </div>
        </div>

        {/* Central Search Intent (CSI) */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-green-600/20 text-green-300 border border-green-500/30 rounded px-2 py-0.5 text-xs font-semibold">
              CSI
            </span>
            <h3 className="text-sm font-semibold text-gray-200">Central Search Intent</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Intent Description
              </label>
              <input
                type="text"
                value={csiText}
                onChange={(e) => setCsiText(e.target.value)}
                placeholder="e.g., buy, compare, or learn about"
                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Predicates
              </label>
              <TagInput
                tags={csiPredicates}
                onAdd={(tag) => setCsiPredicates([...csiPredicates, tag])}
                onRemove={(i) => setCsiPredicates(csiPredicates.filter((_, idx) => idx !== i))}
                placeholder="e.g., buy, compare, reviews..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Define the primary search predicates users combine with the CE
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section Allocation */}
      <SectionAllocationPanel />

      {/* Save Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleSaveStrategy}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2"
        >
          {isSaving && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isSaving ? 'Saving...' : 'Save Strategy'}
        </button>
      </div>

      {/* Approval Gate — G1, most critical */}
      {gate && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
        <ApprovalGate
          step="strategy"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => approveGate('strategy')}
          onReject={(reason) => rejectGate('strategy', reason)}
          onRevise={() => reviseStep('strategy')}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Central Entity', value: ceName || '(not set)', color: ceName ? 'green' : 'amber' },
            { label: 'Source Context', value: scType || '(not set)', color: scType ? 'green' : 'amber' },
            { label: 'CSI Predicates', value: csiPredicates.length, color: csiPredicates.length > 0 ? 'green' : 'amber' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineStrategyStep;
