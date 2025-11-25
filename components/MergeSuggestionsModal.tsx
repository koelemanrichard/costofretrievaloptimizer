
import React from 'react';
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Corrected import path to be a relative path.
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
import { MergeSuggestion } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface MergeSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: MergeSuggestion[];
  onExecuteMerge: (suggestion: MergeSuggestion) => void;
}

const MergeSuggestionsModal: React.FC<MergeSuggestionsModalProps> = ({ isOpen, onClose, suggestions, onExecuteMerge }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Topic Merge Opportunities</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {(!suggestions || suggestions.length === 0) ? (
            <p className="text-gray-400 text-center py-10">The AI found no significant topic overlaps to suggest for merging.</p>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <Card key={index} className="p-4 bg-gray-900/40">
                    <div className="border-b border-gray-700 pb-3 mb-3">
                        <div className="flex justify-between items-start">
                             <p className="text-sm text-gray-400">Topics to Merge:</p>
                             {suggestion.canonicalQuery && (
                                 <span className="text-xs font-bold uppercase tracking-wider text-purple-300 bg-purple-900/30 px-2 py-1 rounded border border-purple-700/50">
                                     Canonical Query: {suggestion.canonicalQuery}
                                 </span>
                             )}
                        </div>
                        <ul className="flex flex-wrap gap-2 mt-2">
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
        </div>
        <div className="p-4 bg-gray-800 border-t border-gray-700 text-right">
            <Button onClick={onClose} variant="secondary">Close</Button>
        </div>
      </Card>
    </div>
  );
};

export default MergeSuggestionsModal;
