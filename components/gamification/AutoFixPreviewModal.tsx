// components/gamification/AutoFixPreviewModal.tsx
// Preview modal for auto-fix with approve/edit/reject options

import React, { useState, useId } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { AutoFixType } from '../../utils/gamification/scoreCalculations';
import { AutoFixPreview, TopicIntentUpdate, TopicSuggestion } from '../../services/ai/autoFixService';
import { SemanticTriple } from '../../types';

interface AutoFixPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  preview: AutoFixPreview | null;
  isLoading: boolean;
  isApplying: boolean;
  onApply: (selectedItems: unknown[]) => void;
}

const AutoFixPreviewModal: React.FC<AutoFixPreviewModalProps> = ({
  isOpen,
  onClose,
  preview,
  isLoading,
  isApplying,
  onApply
}) => {
  const formId = useId();
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Initialize selection when preview loads
  React.useEffect(() => {
    if (preview?.items) {
      // Select all items by default
      setSelectedItems(new Set(preview.items.map((_, i) => i)));
    }
  }, [preview]);

  const toggleItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const toggleAll = () => {
    if (selectedItems.size === preview?.items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(preview?.items.map((_, i) => i) || []));
    }
  };

  const handleApply = () => {
    if (!preview) return;
    const itemsToApply = preview.items.filter((_, i) => selectedItems.has(i));
    onApply(itemsToApply);
  };

  const footer = (
    <div className="flex justify-between items-center gap-4 w-full">
      <Button onClick={onClose} variant="secondary" disabled={isApplying}>
        Cancel
      </Button>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">
          {selectedItems.size} of {preview?.items.length || 0} selected
        </span>
        <Button
          onClick={handleApply}
          disabled={isApplying || selectedItems.size === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          {isApplying ? (
            <>
              <Loader className="w-4 h-4 mr-2" />
              Applying...
            </>
          ) : (
            <>
              <CheckIcon className="w-4 h-4 mr-2" />
              Apply Fix
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle(preview?.type)}
      description={preview?.description || 'Preview changes before applying'}
      maxWidth="max-w-3xl"
      footer={!isLoading ? footer : undefined}
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader className="w-8 h-8" />
          <p className="text-gray-400">Generating fix preview...</p>
        </div>
      ) : preview ? (
        <div className="space-y-6">
          {/* Impact Preview */}
          <div className="flex items-center gap-4 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <TrendUpIcon className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold text-white">
                +{preview.estimatedImpact.scoreIncrease} points
              </div>
              <div className="text-sm text-gray-400">
                Estimated impact on {preview.estimatedImpact.category}
              </div>
            </div>
          </div>

          {/* Items List */}
          {preview.items.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 id={`${formId}-items-heading`} className="text-lg font-semibold text-white">
                  {getItemsHeading(preview.type, preview.items.length)}
                </h3>
                <button
                  onClick={toggleAll}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  {selectedItems.size === preview.items.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <ul
                className="space-y-2 max-h-80 overflow-y-auto pr-2"
                role="list"
                aria-labelledby={`${formId}-items-heading`}
              >
                {preview.type === 'add_unique_eavs' || preview.type === 'expand_eavs' || preview.type === 'add_root_eavs' || preview.type === 'add_common_eavs'
                  ? renderEavItems(preview.items as SemanticTriple[], selectedItems, toggleItem, formId)
                  : preview.type === 'analyze_intents'
                    ? renderIntentItems(preview.items as TopicIntentUpdate[], selectedItems, toggleItem, formId)
                    : preview.type === 'add_buyer_topics' || preview.type === 'add_supporting_topics'
                      ? renderTopicItems(preview.items as TopicSuggestion[], selectedItems, toggleItem, formId)
                      : renderGenericItems(preview.items, selectedItems, toggleItem, formId)
                }
              </ul>
            </div>
          )}

          {/* Empty state */}
          {preview.items.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">{preview.description}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-400">No preview available</p>
        </div>
      )}
    </Modal>
  );
};

// ============================================================================
// ITEM RENDERERS
// ============================================================================

function renderEavItems(
  items: SemanticTriple[],
  selectedItems: Set<number>,
  toggleItem: (i: number) => void,
  formId: string
) {
  return items.map((eav, index) => (
    <li key={index} className="flex items-start gap-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
      <input
        type="checkbox"
        id={`${formId}-item-${index}`}
        checked={selectedItems.has(index)}
        onChange={() => toggleItem(index)}
        className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
      />
      <label htmlFor={`${formId}-item-${index}`} className="flex-1 cursor-pointer">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-blue-400 font-medium">{eav.entity}</span>
          <span className="text-gray-500">|</span>
          <span className="text-purple-400">{eav.attribute}</span>
          <span className="text-gray-500">|</span>
          <span className="text-green-400">{eav.value}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded ${getCategoryColor(eav.category)}`}>
            {eav.category}
          </span>
          {eav.classification && (
            <span className="text-gray-500">{eav.classification}</span>
          )}
        </div>
      </label>
    </li>
  ));
}

function renderIntentItems(
  items: TopicIntentUpdate[],
  selectedItems: Set<number>,
  toggleItem: (i: number) => void,
  formId: string
) {
  return items.map((item, index) => (
    <li key={index} className="flex items-start gap-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
      <input
        type="checkbox"
        id={`${formId}-item-${index}`}
        checked={selectedItems.has(index)}
        onChange={() => toggleItem(index)}
        className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
      />
      <label htmlFor={`${formId}-item-${index}`} className="flex-1 cursor-pointer">
        <div className="flex items-center justify-between mb-1">
          <span className="text-white font-medium">{item.title}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${getIntentColor(item.inferredIntent)}`}>
            {item.inferredIntent}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>Confidence: {item.confidence}%</span>
          <span className="truncate">{item.reasoning}</span>
        </div>
      </label>
    </li>
  ));
}

function renderTopicItems(
  items: TopicSuggestion[],
  selectedItems: Set<number>,
  toggleItem: (i: number) => void,
  formId: string
) {
  return items.map((item, index) => (
    <li key={index} className="flex items-start gap-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
      <input
        type="checkbox"
        id={`${formId}-item-${index}`}
        checked={selectedItems.has(index)}
        onChange={() => toggleItem(index)}
        className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
      />
      <label htmlFor={`${formId}-item-${index}`} className="flex-1 cursor-pointer">
        <div className="flex items-center justify-between mb-1">
          <span className="text-white font-medium">{item.title}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${getIntentColor(item.search_intent || 'informational')}`}>
            {item.search_intent || 'informational'}
          </span>
        </div>
        <div className="text-xs text-gray-400 mb-1">{item.description}</div>
        <div className="flex items-center gap-3 text-xs">
          <span className={`px-2 py-0.5 rounded ${item.type === 'core' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
            {item.type === 'core' ? 'Core' : 'Supporting'}
          </span>
          {item.suggestedParent && (
            <span className="text-gray-500">→ {item.suggestedParent}</span>
          )}
        </div>
      </label>
    </li>
  ));
}

function renderGenericItems(
  items: unknown[],
  selectedItems: Set<number>,
  toggleItem: (i: number) => void,
  formId: string
) {
  return items.map((item, index) => (
    <li key={index} className="flex items-start gap-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
      <input
        type="checkbox"
        id={`${formId}-item-${index}`}
        checked={selectedItems.has(index)}
        onChange={() => toggleItem(index)}
        className="mt-1 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
      />
      <label htmlFor={`${formId}-item-${index}`} className="flex-1 cursor-pointer text-gray-300">
        {JSON.stringify(item)}
      </label>
    </li>
  ));
}

// ============================================================================
// HELPERS
// ============================================================================

function getModalTitle(type?: AutoFixType): string {
  switch (type) {
    case 'add_unique_eavs':
      return 'Add UNIQUE E-A-Vs';
    case 'add_root_eavs':
      return 'Add ROOT E-A-Vs';
    case 'expand_eavs':
      return 'Expand E-A-Vs';
    case 'analyze_intents':
      return 'Assign Search Intents';
    case 'add_buyer_topics':
      return 'Add Buyer Topics';
    case 'add_supporting_topics':
      return 'Add Supporting Topics';
    case 'generate_briefs':
      return 'Generate Briefs';
    default:
      return 'Auto-Fix Preview';
  }
}

function getItemsHeading(type: AutoFixType, count: number): string {
  switch (type) {
    case 'add_unique_eavs':
    case 'add_root_eavs':
    case 'expand_eavs':
      return `E-A-Vs to Add (${count})`;
    case 'analyze_intents':
      return `Topics to Update (${count})`;
    case 'add_buyer_topics':
    case 'add_supporting_topics':
      return `Topics to Add (${count})`;
    default:
      return `Items (${count})`;
  }
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'UNIQUE':
      return 'bg-yellow-500/20 text-yellow-300';
    case 'ROOT':
      return 'bg-blue-500/20 text-blue-300';
    case 'RARE':
      return 'bg-purple-500/20 text-purple-300';
    case 'COMMON':
      return 'bg-gray-500/20 text-gray-300';
    default:
      return 'bg-gray-500/20 text-gray-300';
  }
}

function getIntentColor(intent: string): string {
  switch (intent) {
    case 'informational':
      return 'bg-blue-500/20 text-blue-300';
    case 'commercial':
    case 'commercial_investigation':
      return 'bg-yellow-500/20 text-yellow-300';
    case 'transactional':
      return 'bg-green-500/20 text-green-300';
    case 'navigational':
      return 'bg-purple-500/20 text-purple-300';
    default:
      return 'bg-gray-500/20 text-gray-300';
  }
}

// Icons
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const TrendUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

export default AutoFixPreviewModal;
