
import React from 'react';
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Changed import to be a relative path.
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
import { MapImprovementSuggestion } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface ImprovementLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: MapImprovementSuggestion | null;
}

const ImprovementLogModal: React.FC<ImprovementLogModalProps> = ({ isOpen, onClose, log }) => {
  if (!isOpen || !log) return null;

  const hasAddedTopics = log.newTopics.length > 0;
  const hasDeletedTopics = log.topicTitlesToDelete.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">AI Map Improvement Log</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="space-y-6">
            {hasAddedTopics && (
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-3">Topics Added:</h3>
                <div className="space-y-3">
                  {log.newTopics.map((topic, index) => (
                    <Card key={index} className="p-3 bg-green-900/20 border border-green-700">
                      <p className="font-semibold text-white">{topic.title}</p>
                      <p className="text-sm text-gray-400">{topic.description}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {hasDeletedTopics && (
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-3">Topics Removed:</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  {log.topicTitlesToDelete.map((title, index) => (
                    <li key={index}>{title}</li>
                  ))}
                </ul>
              </div>
            )}

            {!hasAddedTopics && !hasDeletedTopics && (
              <p className="text-gray-400 text-center py-10">No specific changes were logged for this operation.</p>
            )}
          </div>
        </div>
        <div className="p-4 bg-gray-800 border-t border-gray-700 text-right">
            <Button onClick={onClose} variant="secondary">Close</Button>
        </div>
      </Card>
    </div>
  );
};

export default ImprovementLogModal;
