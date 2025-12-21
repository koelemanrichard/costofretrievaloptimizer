/**
 * MergeConfirmationModal Component
 *
 * Confirmation dialog for merging topics, with editable suggestion fields.
 * Uses the accessible Modal component with full keyboard navigation and ARIA support.
 *
 * Updated: 2024-12-19 - Migrated to accessible Modal component
 */

import React, { useState, useEffect } from 'react';
import { MergeSuggestion } from '../../types';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Label } from './Label';
import { Textarea } from './Textarea';
import { Loader } from './Loader';

interface MergeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newTopicData: { title: string; description: string }) => void;
  suggestion: MergeSuggestion | null;
  isLoading: boolean;
}

const MergeConfirmationModal: React.FC<MergeConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  suggestion,
  isLoading,
}) => {
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDescription, setNewTopicDescription] = useState('');

  useEffect(() => {
    if (suggestion) {
      setNewTopicTitle(suggestion.newTopic.title);
      setNewTopicDescription(suggestion.newTopic.description);
    }
  }, [suggestion]);

  if (!suggestion) return null;

  const handleConfirm = () => {
    onConfirm({
      title: newTopicTitle,
      description: newTopicDescription,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Topic Merge"
      description={`Merge ${suggestion.topicTitles.length} topics into one`}
      maxWidth="max-w-2xl"
      zIndex="z-[60]"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !newTopicTitle}>
            {isLoading ? <Loader className="w-5 h-5" /> : 'Confirm Merge'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Topics to Merge:</Label>
          <ul className="flex flex-wrap gap-2" role="list" aria-label="Topics to be merged">
            {suggestion.topicTitles.map((title) => (
              <li key={title} className="bg-gray-700 text-gray-200 text-xs font-medium px-2.5 py-1 rounded-full">
                {title}
              </li>
            ))}
          </ul>
        </div>

        <div className="text-sm text-cyan-300/90 italic border-l-2 border-cyan-500/20 pl-3">
          <strong>AI Reasoning:</strong> {suggestion.reasoning}
        </div>

        <div className="pt-4 border-t border-gray-700">
          <Label htmlFor="new-topic-title">Suggested New Topic (Editable)</Label>
          <Input
            id="new-topic-title"
            value={newTopicTitle}
            onChange={(e) => setNewTopicTitle(e.target.value)}
            disabled={isLoading}
            aria-describedby="new-topic-hint"
          />
          <span id="new-topic-hint" className="sr-only">
            Enter the title for the merged topic
          </span>
          <Textarea
            value={newTopicDescription}
            onChange={(e) => setNewTopicDescription(e.target.value)}
            rows={4}
            className="mt-2"
            disabled={isLoading}
            aria-label="Topic description"
          />
        </div>
      </div>
    </Modal>
  );
};

export default MergeConfirmationModal;
