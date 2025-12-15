
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Loader } from './ui/Loader';
import { SemanticTriple, BusinessInfo, SEOPillars } from '../types';
import { safeString } from '../utils/parsers';
import { useAppState } from '../state/appState';
import * as aiService from '../services/aiService';
import { EavCategoryChartInline } from './eav/EavCategoryChart';

interface EavManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  eavs: SemanticTriple[];
  onSave: (newEavs: SemanticTriple[]) => Promise<void>;
}

const EavManagerModal: React.FC<EavManagerModalProps> = ({ isOpen, onClose, eavs, onSave }) => {
  const { state, dispatch } = useAppState();
  const [localEavs, setLocalEavs] = useState<SemanticTriple[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [expansionCount, setExpansionCount] = useState<number>(15);
  const [showExpansionConfig, setShowExpansionConfig] = useState(false);
  const [expandError, setExpandError] = useState<string | null>(null);

  // Form State
  const [newSubject, setNewSubject] = useState('');
  const [newPredicate, setNewPredicate] = useState('');
  const [newObject, setNewObject] = useState('');

  // Get active map and business info for AI expansion
  const activeMap = state.topicalMaps.find(m => m.id === state.activeMapId);
  const activeProject = state.projects.find(p => p.id === state.activeProjectId);

  const effectiveBusinessInfo = useMemo<BusinessInfo>(() => {
    const mapBusinessInfo = activeMap?.business_info as Partial<BusinessInfo> || {};
    return {
      ...state.businessInfo,
      domain: mapBusinessInfo.domain || activeProject?.domain || state.businessInfo.domain,
      projectName: mapBusinessInfo.projectName || activeProject?.project_name || state.businessInfo.projectName,
      ...mapBusinessInfo,
    };
  }, [state.businessInfo, activeMap, activeProject]);

  const pillars = activeMap?.pillars as SEOPillars | undefined;

  useEffect(() => {
    if (isOpen) {
      setLocalEavs(eavs || []);
      setNewSubject('');
      setNewPredicate('');
      setNewObject('');
      setExpandError(null);
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

  const handleAIExpand = async (count?: number) => {
    if (!pillars) {
      setExpandError('No SEO pillars defined. Please complete the pillar wizard first.');
      return;
    }

    setIsExpanding(true);
    setExpandError(null);
    setShowExpansionConfig(false);

    try {
      const targetCount = count ?? expansionCount;
      const newTriples = await aiService.expandSemanticTriples(
        effectiveBusinessInfo,
        pillars,
        localEavs,
        dispatch,
        targetCount
      );
      setLocalEavs(prev => [...prev, ...newTriples]);
    } catch (e) {
      setExpandError(e instanceof Error ? e.message : 'Failed to expand semantic triples.');
    } finally {
      setIsExpanding(false);
    }
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

            {/* AI Expansion Section */}
            {pillars && (
              <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-blue-400">AI Expansion</h3>
                    <p className="text-xs text-gray-400 mt-1">Generate additional semantic triples with AI</p>
                  </div>
                  <EavCategoryChartInline eavs={localEavs} />
                </div>

                {expandError && (
                  <div className="text-red-400 bg-red-900/20 p-2 rounded-md text-xs mb-3">{expandError}</div>
                )}

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => handleAIExpand()}
                        variant="secondary"
                        disabled={isExpanding || localEavs.length === 0}
                        className="flex-1 !py-2"
                      >
                        {isExpanding ? (
                          <>
                            <Loader className="w-4 h-4 mr-2" />
                            Expanding...
                          </>
                        ) : (
                          `Expand +${expansionCount} with AI`
                        )}
                      </Button>
                      <button
                        onClick={() => setShowExpansionConfig(!showExpansionConfig)}
                        disabled={isExpanding}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                        title="Configure expansion count"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>
                    {showExpansionConfig && (
                      <div className="absolute bottom-full left-0 mb-2 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-10 min-w-[220px]">
                        <label className="block text-xs text-gray-400 mb-2">Number of EAVs to generate:</label>
                        <input
                          type="number"
                          value={expansionCount}
                          onChange={(e) => setExpansionCount(Math.max(1, Math.min(500, parseInt(e.target.value) || 15)))}
                          min={1}
                          max={500}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {[15, 50, 100, 200].map(preset => (
                            <button
                              key={preset}
                              onClick={() => setExpansionCount(preset)}
                              className={`px-2 py-1 text-xs rounded transition-colors ${expansionCount === preset ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Large counts use batched generation.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!pillars && (
              <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                <p className="text-sm text-amber-200">
                  <strong>Note:</strong> Complete the SEO Pillar wizard to enable AI expansion.
                </p>
              </div>
            )}

            {/* List Section */}
            <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Defined Triples ({localEavs.length})</h3>
                {localEavs.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No semantic triples defined.</p>
                ) : (
                    <div className="space-y-2">
                        {localEavs.map((triple, index) => (
                            <div key={index} className="flex justify-between items-center bg-gray-800 p-3 rounded border border-gray-700 group hover:border-gray-600 transition-colors">
                                <div className="flex-grow grid grid-cols-3 gap-4 text-sm">
                                    <span className="font-semibold text-white break-words">{safeString(triple.subject.label)}</span>
                                    <span className="text-gray-400 text-center font-mono text-xs bg-gray-900 py-1 rounded">{safeString(triple.predicate.relation)}</span>
                                    <span className="text-blue-300 break-words">{safeString(triple.object.value)}</span>
                                </div>
                                {triple.predicate.category && (
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                                        triple.predicate.category === 'ROOT' ? 'bg-blue-900/50 text-blue-300' :
                                        triple.predicate.category === 'UNIQUE' ? 'bg-purple-900/50 text-purple-300' :
                                        triple.predicate.category === 'RARE' ? 'bg-orange-900/50 text-orange-300' :
                                        'bg-gray-700 text-gray-300'
                                    }`}>
                                        {triple.predicate.category}
                                    </span>
                                )}
                                <button
                                    onClick={() => handleDelete(index)}
                                    className="ml-2 text-red-400 hover:text-red-300 p-1 flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
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

        <footer className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center flex-shrink-0">
            <span className="text-xs text-gray-500">
                {localEavs.length} triples
                {isExpanding && ' • Expanding...'}
            </span>
            <div className="flex gap-4">
                <Button onClick={onClose} variant="secondary" disabled={isSaving || isExpanding}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving || isExpanding}>
                    {isSaving ? <Loader className="w-5 h-5" /> : 'Save Changes'}
                </Button>
            </div>
        </footer>
      </Card>
    </div>
  );
};

export default EavManagerModal;
