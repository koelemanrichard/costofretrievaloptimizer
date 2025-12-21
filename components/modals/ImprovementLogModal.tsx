import React, { useId } from 'react';
import { MapImprovementSuggestion } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ImprovementLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: MapImprovementSuggestion | null;
}

const ImprovementLogModal: React.FC<ImprovementLogModalProps> = ({ isOpen, onClose, log }) => {
  const sectionId = useId();

  if (!log) return null;

  const hasAddedTopics = log.newTopics.length > 0;
  const hasDeletedTopics = log.topicTitlesToDelete.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Map Improvement Log"
      description="Summary of changes made to your topical map"
      maxWidth="max-w-2xl"
      footer={<Button onClick={onClose} variant="secondary">Close</Button>}
    >
      <div className="space-y-6">
        {hasAddedTopics && (
          <div>
            <h3 id={`${sectionId}-added`} className="text-lg font-semibold text-green-400 mb-3">Topics Added:</h3>
            <ul className="space-y-3" role="list" aria-labelledby={`${sectionId}-added`}>
              {log.newTopics.map((topic, index) => (
                <li key={index}>
                  <Card className="p-3 bg-green-900/20 border border-green-700">
                    <p className="font-semibold text-white">{topic.title}</p>
                    <p className="text-sm text-gray-400">{topic.description}</p>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasDeletedTopics && (
          <div>
            <h3 id={`${sectionId}-removed`} className="text-lg font-semibold text-red-400 mb-3">Topics Removed:</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-1" role="list" aria-labelledby={`${sectionId}-removed`}>
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
    </Modal>
  );
};

export default ImprovementLogModal;
