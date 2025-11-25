
// @/components/AddTopicModal.tsx

import React, { useState, useCallback } from 'react';
import { EnrichedTopic, FreshnessProfile, TopicViabilityResult } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Textarea } from './ui/Textarea';
import { Select } from './ui/Select';
import * as aiService from '../services/ai/index';
import { useAppState } from '../state/appState';
import { Loader } from './ui/Loader';

interface AddTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTopic: (topicData: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>, placement: 'ai' | 'root' | string) => void;
  onBulkAddTopics?: (topics: {data: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>, placement: 'ai' | 'root' | string}[]) => Promise<void>;
  coreTopics: EnrichedTopic[];
  isLoading: boolean;
}

// Structure for the new AI response
interface StructuredSuggestion {
    title: string;
    description: string;
    type: 'core' | 'outer';
    suggestedParent?: string; // Title of the parent
    reasoning?: string; // Keep optional for backward compat if needed
}

const AddTopicModal: React.FC<AddTopicModalProps> = ({ isOpen, onClose, onAddTopic, onBulkAddTopics, coreTopics, isLoading }) => {
  const { state, dispatch } = useAppState();
  
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  
  // Manual State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'core' | 'outer'>('outer');
  const [placement, setPlacement] = useState<'ai' | 'root' | string>('ai');
  const [viabilityResult, setViabilityResult] = useState<TopicViabilityResult | null>(null);
  const [isCheckingViability, setIsCheckingViability] = useState(false);

  // AI Assistant State
  const [userThoughts, setUserThoughts] = useState('');
  const [suggestions, setSuggestions] = useState<StructuredSuggestion[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  // --- Manual Handlers ---

  const handleCheckViability = async () => {
      if (!title) return;
      setIsCheckingViability(true);
      setViabilityResult(null);
      try {
          const effectiveBusinessInfo = {
              ...state.businessInfo,
              ...(state.topicalMaps.find(m => m.id === state.activeMapId)?.business_info || {})
          };
          const result = await aiService.analyzeTopicViability(title, description, effectiveBusinessInfo, dispatch);
          setViabilityResult(result);
      } catch (error) {
          console.error("Viability check failed", error);
      } finally {
          setIsCheckingViability(false);
      }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || isLoading) return;

    onAddTopic({
      title,
      description,
      type,
      parent_topic_id: type === 'core' || placement === 'ai' || placement === 'root' ? null : placement,
      freshness: FreshnessProfile.EVERGREEN,
    }, placement);

    resetState();
  };

  // --- AI Assistant Handlers ---

  const handleGenerateSuggestions = async () => {
      if (!userThoughts.trim()) return;
      setIsGenerating(true);
      setSuggestions([]);
      setSelectedIndices(new Set());
      try {
          const effectiveBusinessInfo = {
              ...state.businessInfo,
              ...(state.topicalMaps.find(m => m.id === state.activeMapId)?.business_info || {})
          };
          
          // Prepare existing core topics for context
          const existingCores = coreTopics.map(t => ({ title: t.title, id: t.id }));
          
          // Call the structured service
          const results = await aiService.generateStructuredTopicSuggestions(
              userThoughts, 
              existingCores, 
              effectiveBusinessInfo, 
              dispatch
          );
          setSuggestions(results);
          
          // Pre-select all by default for convenience
          const allIndices = new Set(results.map((_, i) => i));
          setSelectedIndices(allIndices);

      } catch (error) {
          console.error("Generation failed", error);
      } finally {
          setIsGenerating(false);
      }
  };

  const toggleSelection = (index: number) => {
      setSelectedIndices(prev => {
          const next = new Set(prev);
          if (next.has(index)) next.delete(index);
          else next.add(index);
          return next;
      });
  };

  const handleAddSelected = async () => {
      if (selectedIndices.size === 0) return;
      
      if (!onBulkAddTopics) {
          console.error("Bulk add handler not provided.");
          return;
      }

      const topicsToAdd = Array.from(selectedIndices).map(index => {
          const suggestion = suggestions[index];
          return {
              data: {
                  title: suggestion.title,
                  description: suggestion.description,
                  type: suggestion.type,
                  freshness: FreshnessProfile.EVERGREEN,
                  parent_topic_id: null // Logic handles this based on placement
              },
              // For Core topics, placement is 'root'.
              // For Outer topics, we pass the 'suggestedParent' (Title) as the placement.
              // The container logic will need to resolve this Title to an ID (either existing or newly created).
              placement: suggestion.type === 'core' ? 'root' : (suggestion.suggestedParent || 'ai')
          };
      });

      await onBulkAddTopics(topicsToAdd);
      resetState();
  };

  const resetState = () => {
      setTitle('');
      setDescription('');
      setType('outer');
      setPlacement('ai');
      setViabilityResult(null);
      setUserThoughts('');
      setSuggestions([]);
      setSelectedIndices(new Set());
      // Keep active tab context
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
            <h2 className="text-xl font-bold text-white">Add New Topic</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>

        <div className="flex border-b border-gray-700 bg-gray-800">
            <button 
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'manual' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-300'}`}
                onClick={() => setActiveTab('manual')}
            >
                Manual Entry
            </button>
            <button 
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'ai' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}
                onClick={() => setActiveTab('ai')}
            >
                AI Assistant (Beta)
            </button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
            {activeTab === 'manual' ? (
                <form id="manual-form" onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="topic-title">Title</Label>
                        <div className="flex gap-2">
                            <Input id="topic-title" value={title} onChange={(e) => setTitle(e.target.value)} required onBlur={() => { if(title && !viabilityResult) handleCheckViability() }} />
                            <Button type="button" onClick={handleCheckViability} variant="secondary" disabled={isCheckingViability || !title} className="text-xs">
                                {isCheckingViability ? <Loader className="w-4 h-4"/> : 'Check Viability'}
                            </Button>
                        </div>
                    </div>
                    
                    {viabilityResult && (
                        <div className={`p-3 rounded border text-sm ${viabilityResult.decision === 'SECTION' ? 'bg-yellow-900/20 border-yellow-600 text-yellow-200' : 'bg-green-900/20 border-green-600 text-green-200'}`}>
                            <div className="flex justify-between font-bold mb-1">
                                <span>AI Recommendation: {viabilityResult.decision === 'SECTION' ? 'MERGE AS SECTION' : 'CREATE NEW PAGE'}</span>
                            </div>
                            <p>{viabilityResult.reasoning}</p>
                            {viabilityResult.decision === 'SECTION' && viabilityResult.targetParent && (
                                <p className="mt-2 text-xs italic">Suggested Parent: {viabilityResult.targetParent}</p>
                            )}
                        </div>
                    )}

                    <div>
                        <Label htmlFor="topic-description">Description</Label>
                        <Textarea id="topic-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                    </div>
                    <div>
                        <Label htmlFor="topic-type">Type</Label>
                        <Select id="topic-type" value={type} onChange={(e) => setType(e.target.value as any)}>
                        <option value="outer">Outer (Supporting Topic)</option>
                        <option value="core">Core (Pillar Topic)</option>
                        </Select>
                    </div>
                    {type === 'outer' && (
                        <div>
                        <Label htmlFor="topic-placement">Placement</Label>
                        <Select id="topic-placement" value={placement} onChange={(e) => setPlacement(e.target.value)}>
                            <option value="ai">Let AI Decide</option>
                            <option value="root">Make Standalone (No Parent)</option>
                            {coreTopics.map(core => (
                            <option key={core.id} value={core.id}>Place under: {core.title}</option>
                            ))}
                        </Select>
                        </div>
                    )}
                </form>
            ) : (
                <div className="space-y-6">
                    <div>
                        <Label htmlFor="user-thoughts">What content structure do you need?</Label>
                        <p className="text-xs text-gray-400 mb-2">Describe a topic cluster. The AI will break it down into Pillars (Core) and Sub-topics (Outer). e.g. "Create a guide for 'Office Cleaning' with subtopics like 'Desks', 'Floors'."</p>
                        <Textarea 
                            id="user-thoughts" 
                            value={userThoughts} 
                            onChange={(e) => setUserThoughts(e.target.value)} 
                            placeholder="e.g., We need a new cluster about 'Enterprise Security' covering audit logs, role-based access, and sso..."
                            rows={3}
                        />
                        <div className="mt-2 text-right">
                            <Button onClick={handleGenerateSuggestions} disabled={isGenerating || !userThoughts.trim()} className="bg-purple-600 hover:bg-purple-700">
                                {isGenerating ? <Loader className="w-4 h-4" /> : 'Generate Structure'}
                            </Button>
                        </div>
                    </div>

                    {suggestions.length > 0 && (
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-semibold text-white">Suggested Structure</h3>
                                <div className='text-xs'>
                                    <button onClick={() => setSelectedIndices(new Set(suggestions.map((_, i) => i)))} className="text-blue-400 hover:underline mr-3">Select All</button>
                                    <button onClick={() => setSelectedIndices(new Set())} className="text-gray-400 hover:underline">Clear</button>
                                </div>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {suggestions.map((s, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`p-3 rounded border cursor-pointer transition-all ${selectedIndices.has(idx) ? 'bg-purple-900/30 border-purple-500 ring-1 ring-purple-500' : 'bg-gray-700/30 border-gray-600 hover:border-gray-500'}`}
                                        onClick={() => toggleSelection(idx)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIndices.has(idx)} 
                                                readOnly 
                                                className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                                            />
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${s.type === 'core' ? 'bg-green-900 text-green-300 border border-green-700' : 'bg-indigo-900 text-indigo-300 border border-indigo-700'}`}>
                                                        {s.type}
                                                    </span>
                                                    <h4 className="font-bold text-white text-sm">{s.title}</h4>
                                                </div>
                                                <p className="text-xs text-gray-300 mt-1">{s.description}</p>
                                                {s.type === 'outer' && s.suggestedParent && (
                                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                        <span className="text-gray-600">↳</span>
                                                        Parent: <span className="text-gray-400">{s.suggestedParent}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end gap-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading || isGenerating}>Cancel</Button>
            {activeTab === 'manual' ? (
                <Button type="submit" form="manual-form" disabled={isLoading || !title}>
                    {isLoading ? 'Adding...' : 'Add Topic'}
                </Button>
            ) : (
                <Button onClick={handleAddSelected} disabled={isLoading || isGenerating || selectedIndices.size === 0} className="bg-purple-600 hover:bg-purple-700">
                    {isLoading ? 'Adding...' : `Add Selected (${selectedIndices.size})`}
                </Button>
            )}
        </div>
      </Card>
    </div>
  );
};

export default AddTopicModal;
