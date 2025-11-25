
import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Loader } from './ui/Loader';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Manage Competitors</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          <div className="space-y-4">
            <div>
                <Label htmlFor="add-competitor">Add New Competitor URL</Label>
                <div className="flex gap-2">
                    <Input 
                        id="add-competitor"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="https://example.com"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <Button onClick={handleAdd} variant="secondary" disabled={!newUrl.trim()}>Add</Button>
                </div>
            </div>

            <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Current Competitors</h3>
                {localCompetitors.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No competitors added yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {localCompetitors.map((url) => (
                            <li key={url} className="flex justify-between items-center bg-gray-900/50 p-2 rounded border border-gray-700">
                                <span className="text-sm text-gray-300 truncate mr-2">{url}</span>
                                <button 
                                    onClick={() => handleRemove(url)}
                                    className="text-red-400 hover:text-red-300 p-1"
                                    title="Remove"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
          </div>
        </div>

        <footer className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end gap-4 flex-shrink-0">
            <Button onClick={onClose} variant="secondary" disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader className="w-5 h-5" /> : 'Save Changes'}
            </Button>
        </footer>
      </Card>
    </div>
  );
};

export default CompetitorManagerModal;
