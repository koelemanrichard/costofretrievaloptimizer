import React, { useState, useEffect } from 'react';
import { MergeSuggestion } from '../../types';
import { Card } from './Card';
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

  if (!isOpen || !suggestion) return null;

  const handleConfirm = () => {
    onConfirm({
      title: newTopicTitle,
      description: newTopicDescription,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">Confirm Topic Merge</h2>

          <div className="space-y-4">
            <div>
              <Label>Topics to Merge:</Label>
              <ul className="flex flex-wrap gap-2">
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
              />
              <Textarea
                value={newTopicDescription}
                onChange={(e) => setNewTopicDescription(e.target.value)}
                rows={4}
                className="mt-2"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end gap-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !newTopicTitle}>
            {isLoading ? <Loader className="w-5 h-5" /> : 'Confirm Merge'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MergeConfirmationModal;
