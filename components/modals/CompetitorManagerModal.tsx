import React, { useState, useEffect, useId } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Loader } from '../ui/Loader';
import { Modal } from '../ui/Modal';

interface CompetitorManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitors: string[];
  onSave: (newCompetitors: string[]) => Promise<void>;
}

const CompetitorManagerModal: React.FC<CompetitorManagerModalProps> = ({ isOpen, onClose, competitors, onSave }) => {
  const [localCompetitors, setLocalCompetitors] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const sectionId = useId();

  useEffect(() => {
    if (isOpen) {
      setLocalCompetitors(competitors || []);
      setNewUrl('');
    }
  }, [isOpen, competitors]);

  const handleAdd = () => {
    if (newUrl.trim() && !localCompetitors.includes(newUrl.trim())) {
      setLocalCompetitors([...localCompetitors, newUrl.trim()]);
      setNewUrl('');
    }
  };

  const handleRemove = (urlToRemove: string) => {
    setLocalCompetitors(localCompetitors.filter(url => url !== urlToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localCompetitors);
      onClose();
    } catch (error) {
      console.error("Failed to save competitors:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const footer = (
    <div className="flex justify-end gap-4 w-full">
      <Button onClick={onClose} variant="secondary" disabled={isSaving}>Cancel</Button>
      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? <Loader className="w-5 h-5" /> : 'Save Changes'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Competitors"
      description="Add and manage competitor URLs for analysis"
      maxWidth="max-w-lg"
      footer={footer}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor={`${sectionId}-add`}>Add New Competitor URL</Label>
          <div className="flex gap-2">
            <Input
              id={`${sectionId}-add`}
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} variant="secondary" disabled={!newUrl.trim()}>Add</Button>
          </div>
        </div>

        <div>
          <h3 id={`${sectionId}-list-heading`} className="text-sm font-semibold text-gray-400 mb-2">Current Competitors</h3>
          {localCompetitors.length === 0 ? (
            <p className="text-gray-500 italic text-sm">No competitors added yet.</p>
          ) : (
            <ul className="space-y-2" role="list" aria-labelledby={`${sectionId}-list-heading`}>
              {localCompetitors.map((url) => (
                <li key={url} className="flex justify-between items-center bg-gray-900/50 p-2 rounded border border-gray-700">
                  <span className="text-sm text-gray-300 truncate mr-2">{url}</span>
                  <button
                    onClick={() => handleRemove(url)}
                    className="text-red-400 hover:text-red-300 p-1"
                    aria-label={`Remove ${url}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CompetitorManagerModal;
