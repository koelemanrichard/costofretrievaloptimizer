
import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Loader } from './ui/Loader';
import { SemanticTriple } from '../types';
import { safeString } from '../utils/parsers';

interface EavManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  eavs: SemanticTriple[];
  onSave: (newEavs: SemanticTriple[]) => Promise<void>;
}

const EavManagerModal: React.FC<EavManagerModalProps> = ({ isOpen, onClose, eavs, onSave }) => {
  const [localEavs, setLocalEavs] = useState<SemanticTriple[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [newSubject, setNewSubject] = useState('');
  const [newPredicate, setNewPredicate] = useState('');
  const [newObject, setNewObject] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLocalEavs(eavs || []);
      setNewSubject('');
      setNewPredicate('');
      setNewObject('');
    }
  }, [isOpen, eavs]);

  const handleAdd = () => {
    if (newSubject.trim() && newPredicate.trim() && newObject.trim()) {
      const newTriple: SemanticTriple = {
        subject: { label: newSubject.trim(), type: 'Manual' },
        predicate: { relation: newPredicate.trim(), type: 'Manual' },
        object: { value: newObject.trim(), type: 'Manual' }
      };
      setLocalEavs([...localEavs, newTriple]);
      setNewSubject('');
      setNewPredicate('');
      setNewObject('');
    }
  };

  const handleDelete = (indexToRemove: number) => {
    setLocalEavs(localEavs.filter((_, index) => index !== indexToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localEavs);
      onClose();
    } catch (error) {
      console.error("Failed to save EAVs:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Manage Semantic Triples (E-A-V)</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          <div className="space-y-6">
            {/* Add New Section */}
            <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-400 mb-3">Add New Fact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="new-subject" className="text-xs">Subject (Entity)</Label>
                        <Input 
                            id="new-subject"
                            value={newSubject}
                            onChange={(e) => setNewSubject(e.target.value)}
                            placeholder="e.g. Software"
                            className="!text-sm"
                        />
                    </div>
                    <div>
                        <Label htmlFor="new-predicate" className="text-xs">Predicate (Attribute)</Label>
                        <Input 
                            id="new-predicate"
                            value={newPredicate}
                            onChange={(e) => setNewPredicate(e.target.value)}
                            placeholder="e.g. HAS_FEATURE"
                            className="!text-sm"
                        />
                    </div>
                    <div>
                        <Label htmlFor="new-object" className="text-xs">Object (Value)</Label>
                        <div className="flex gap-2">
                            <Input 
                                id="new-object"
                                value={newObject}
                                onChange={(e) => setNewObject(e.target.value)}
                                placeholder="e.g. Automation"
                                className="!text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            />
                            <Button onClick={handleAdd} disabled={!newSubject || !newPredicate || !newObject} className="!py-1 !px-3">Add</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Defined Triples ({localEavs.length})</h3>
                {localEavs.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No semantic triples defined.</p>
                ) : (
                    <div className="space-y-2">
                        {localEavs.map((triple, index) => (
                            <div key={index} className="flex justify-between items-center bg-gray-800 p-3 rounded border border-gray-700">
                                <div className="flex-grow grid grid-cols-3 gap-4 text-sm">
                                    <span className="font-semibold text-white break-words">{safeString(triple.subject.label)}</span>
                                    <span className="text-gray-400 text-center font-mono text-xs bg-gray-900 py-1 rounded">{safeString(triple.predicate.relation)}</span>
                                    <span className="text-blue-300 break-words">{safeString(triple.object.value)}</span>
                                </div>
                                <button 
                                    onClick={() => handleDelete(index)}
                                    className="ml-4 text-red-400 hover:text-red-300 p-1 flex-shrink-0"
                                    title="Delete"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
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

export default EavManagerModal;
