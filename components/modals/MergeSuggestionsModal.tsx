import React from 'react';
import { MergeSuggestion } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface MergeSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: MergeSuggestion[];
  onExecuteMerge: (suggestion: MergeSuggestion) => void;
}

const MergeSuggestionsModal: React.FC<MergeSuggestionsModalProps> = ({ isOpen, onClose, suggestions, onExecuteMerge }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Topic Merge Opportunities"
      description="AI-identified opportunities to merge overlapping topics for better content strategy"
      maxWidth="max-w-3xl"
      footer={<Button onClick={onClose} variant="secondary">Close</Button>}
    >
      {(!suggestions || suggestions.length === 0) ? (
        <p className="text-gray-400 text-center py-10">The AI found no significant topic overlaps to suggest for merging.</p>
      ) : (
        <div className="space-y-4" role="list" aria-label="Merge suggestions">
          {suggestions.map((suggestion, index) => (
            <Card key={index} className="p-4 bg-gray-900/40" role="listitem">
              <div className="border-b border-gray-700 pb-3 mb-3">
                <div className="flex justify-between items-start">
                  <p className="text-sm text-gray-400">Topics to Merge:</p>
                  {suggestion.canonicalQuery && (
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-300 bg-purple-900/30 px-2 py-1 rounded border border-purple-700/50">
                      Canonical Query: {suggestion.canonicalQuery}
                    </span>
                  )}
                </div>
                <ul className="flex flex-wrap gap-2 mt-2" aria-label="Topics to merge">
                  {suggestion.topicTitles.map(title => (
                    <li key={title} className="bg-gray-700 text-gray-200 text-xs font-medium px-2.5 py-1 rounded-full">{title}</li>
                  ))}
                </ul>
              </div>

              <p className="text-sm text-cyan-300/90 italic border-l-2 border-cyan-500/20 pl-3 mb-4">
                <strong>Reasoning:</strong> {suggestion.reasoning}
              </p>

              <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                <p className="text-sm text-gray-400">Suggested New Topic:</p>
                <h4 className="font-semibold text-green-300">{suggestion.newTopic.title}</h4>
                <p className="text-xs text-gray-300 mt-1">{suggestion.newTopic.description}</p>
              </div>

              <div className="text-right mt-4">
                <Button onClick={() => onExecuteMerge(suggestion)} className="!py-1 !px-4 text-sm">
                  Execute Merge
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default MergeSuggestionsModal;
