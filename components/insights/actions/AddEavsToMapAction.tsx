// components/insights/actions/AddEavsToMapAction.tsx
// Modal for adding competitor EAVs to the map

import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import type { SemanticTriple } from '../../../types';

interface AddEavsToMapActionProps {
  eavs: SemanticTriple[];
  existingEavCount: number;
  onConfirm: (selectedEavs: SemanticTriple[], options: AddEavOptions) => Promise<void>;
  onCancel: () => void;
}

interface AddEavOptions {
  deduplicateAgainstExisting: boolean;
  autoClassify: boolean;
  addLexicalData: boolean;
}

export const AddEavsToMapAction: React.FC<AddEavsToMapActionProps> = ({
  eavs,
  existingEavCount,
  onConfirm,
  onCancel,
}) => {
  const [selectedEavs, setSelectedEavs] = useState<Set<number>>(new Set(eavs.map((_, i) => i)));
  const [options, setOptions] = useState<AddEavOptions>({
    deduplicateAgainstExisting: true,
    autoClassify: true,
    addLexicalData: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleEav = (index: number) => {
    setSelectedEavs(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedEavs(new Set(eavs.map((_, i) => i)));
  };

  const selectNone = () => {
    setSelectedEavs(new Set());
  };

  const handleConfirm = async () => {
    const selected = eavs.filter((_, i) => selectedEavs.has(i));
    if (selected.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      await onConfirm(selected, options);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add EAVs');
    } finally {
      setLoading(false);
    }
  };

  // Group EAVs by category
  const groupedByCategory = eavs.reduce((acc, eav, index) => {
    const category = eav.predicate.category || 'UNCATEGORIZED';
    if (!acc[category]) acc[category] = [];
    acc[category].push({ eav, index });
    return acc;
  }, {} as Record<string, Array<{ eav: SemanticTriple; index: number }>>);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Add EAVs to Your Map</h2>
          <p className="text-sm text-gray-400 mt-1">
            Select the semantic triples you want to add from competitor analysis.
            Your map currently has {existingEavCount} EAVs.
          </p>
        </div>

        {/* EAV Selection */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Selection Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Select All
              </button>
              <span className="text-gray-600">|</span>
              <button
                onClick={selectNone}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Select None
              </button>
            </div>
            <span className="text-sm text-gray-400">
              {selectedEavs.size} of {eavs.length} selected
            </span>
          </div>

          {/* Grouped EAV List */}
          <div className="space-y-4">
            {Object.entries(groupedByCategory).map(([category, items]) => (
              <div key={category} className="border border-gray-700 rounded-lg overflow-hidden">
                <div className="p-3 bg-gray-800/50 flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{category}</span>
                  <span className="text-xs text-gray-400">{items.length} items</span>
                </div>
                <div className="divide-y divide-gray-800 max-h-60 overflow-y-auto">
                  {items.map(({ eav, index }) => (
                    <label
                      key={index}
                      className="flex items-center gap-3 p-3 hover:bg-gray-800/30 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEavs.has(index)}
                        onChange={() => toggleEav(index)}
                        className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                      />
                      <div className="flex-1 text-sm">
                        <span className="text-white font-medium">{eav.subject.label}</span>
                        <span className="text-gray-400 mx-2">{eav.predicate.relation}</span>
                        <span className="text-blue-300">{String(eav.object.value)}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Options */}
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
            <h3 className="text-sm font-medium text-white mb-3">Import Options</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.deduplicateAgainstExisting}
                  onChange={(e) => setOptions({ ...options, deduplicateAgainstExisting: e.target.checked })}
                  className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm text-white">Deduplicate against existing EAVs</span>
                  <p className="text-xs text-gray-500">Skip EAVs that already exist in your map</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.autoClassify}
                  onChange={(e) => setOptions({ ...options, autoClassify: e.target.checked })}
                  className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm text-white">Auto-classify categories</span>
                  <p className="text-xs text-gray-500">Assign UNIQUE/ROOT/RARE/COMMON categories using AI</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.addLexicalData}
                  onChange={(e) => setOptions({ ...options, addLexicalData: e.target.checked })}
                  className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm text-white">Add lexical data</span>
                  <p className="text-xs text-gray-500">Generate synonyms, antonyms, and hypernyms for each EAV</p>
                </div>
              </label>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {selectedEavs.size > 0 && (
              <>
                Adding <strong className="text-white">{selectedEavs.size}</strong> EAVs
                {options.deduplicateAgainstExisting && ' (duplicates will be skipped)'}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={onCancel} variant="secondary" disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              variant="primary"
              disabled={selectedEavs.size === 0 || loading}
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2" />
                  Adding...
                </>
              ) : (
                `Add ${selectedEavs.size} EAVs`
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
