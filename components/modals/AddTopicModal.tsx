
// @/components/AddTopicModal.tsx

import React, { useState, useCallback } from 'react';
import { EnrichedTopic, FreshnessProfile, TopicViabilityResult, ExpandedTemplateResult } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import * as aiService from '../../services/aiService';
import { useAppState } from '../../state/appState';
import { Loader } from '../ui/Loader';
import { QueryTemplatePanel } from '../templates/QueryTemplatePanel';

interface AddTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTopic: (topicData: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>, placement: 'ai' | 'root' | string) => void;
  onBulkAddTopics?: (topics: {data: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>, placement: 'ai' | 'root' | string}[]) => Promise<void>;
  coreTopics: EnrichedTopic[];
  outerTopics?: EnrichedTopic[]; // For child topic placement
  isLoading: boolean;
  // Template-related props
  mapId?: string;
  onGenerateTopicsFromTemplate?: (result: ExpandedTemplateResult) => Promise<void>;
  onOpenLocationManager?: () => void;
}

// Structure for the new AI response
interface StructuredSuggestion {
    title: string;
    description: string;
    type: 'core' | 'outer' | 'child';
    suggestedParent?: string; // Title of the parent
    reasoning?: string; // Keep optional for backward compat if needed
}

const AddTopicModal: React.FC<AddTopicModalProps> = ({
  isOpen,
  onClose,
  onAddTopic,
  onBulkAddTopics,
  coreTopics,
  outerTopics = [],
  isLoading,
  mapId,
  onGenerateTopicsFromTemplate,
  onOpenLocationManager,
}) => {
  const { state, dispatch } = useAppState();

  const [activeTab, setActiveTab] = useState<'manual' | 'template' | 'ai'>('manual');
  
  // Manual State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'core' | 'outer' | 'child'>('outer');
  const [placement, setPlacement] = useState<'ai' | 'root' | string>('ai');
  const [viabilityResult, setViabilityResult] = useState<TopicViabilityResult | null>(null);
  const [isCheckingViability, setIsCheckingViability] = useState(false);

  // AI Assistant State
  const [userThoughts, setUserThoughts] = useState('');
  const [suggestions, setSuggestions] = useState<StructuredSuggestion[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Manual Handlers ---

  const handleCheckViability = async () => {
      if (!title) return;
      setIsCheckingViability(true);
      setViabilityResult(null);
      try {
          // AI settings ALWAYS from global user_settings, strip them from map's business_info
          const mapBusinessInfo = state.topicalMaps.find(m => m.id === state.activeMapId)?.business_info as Partial<typeof state.businessInfo> || {};
          const { aiProvider: _, aiModel: __, geminiApiKey: _g, openAiApiKey: _o, anthropicApiKey: _a, perplexityApiKey: _p, openRouterApiKey: _or, ...mapBusinessContext } = mapBusinessInfo;
          const effectiveBusinessInfo = {
              ...state.businessInfo,
              ...mapBusinessContext,
              aiProvider: state.businessInfo.aiProvider,
              aiModel: state.businessInfo.aiModel,
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

    // Child topics require a parent (outer topic)
    if (type === 'child' && (!placement || placement === 'ai' || placement === 'root')) {
      return; // Don't submit without a valid parent
    }

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
          // AI settings ALWAYS from global user_settings, strip them from map's business_info
          const mapBusinessInfo = state.topicalMaps.find(m => m.id === state.activeMapId)?.business_info as Partial<typeof state.businessInfo> || {};
          const { aiProvider: _, aiModel: __, geminiApiKey: _g, openAiApiKey: _o, anthropicApiKey: _a, perplexityApiKey: _p, openRouterApiKey: _or, ...mapBusinessContext } = mapBusinessInfo;
          const effectiveBusinessInfo = {
              ...state.businessInfo,
              ...mapBusinessContext,
              aiProvider: state.businessInfo.aiProvider,
              aiModel: state.businessInfo.aiModel,
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
      setType('outer'); // Default back to outer (most common)
      setPlacement('ai');
      setViabilityResult(null);
      setUserThoughts('');
      setSuggestions([]);
      setSelectedIndices(new Set());
      // Keep active tab context
  };

  // Footer content based on active tab
  const footerContent = (
      <div className="flex justify-end gap-4 w-full">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading || isGenerating}>Cancel</Button>
          {activeTab === 'manual' && (
              <Button type="submit" form="manual-form" disabled={isLoading || !title}>
                  {isLoading ? 'Adding...' : 'Add Topic'}
              </Button>
          )}
          {activeTab === 'ai' && (
              <Button onClick={handleAddSelected} disabled={isLoading || isGenerating || selectedIndices.size === 0} className="bg-purple-600 hover:bg-purple-700">
                  {isLoading ? 'Adding...' : `Add Selected (${selectedIndices.size})`}
              </Button>
          )}
          {/* Template tab has its own "Generate Topics" button inside the panel */}
      </div>
  );

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Add New Topic"
        description="Add topics manually, from templates, or with AI assistance"
        maxWidth="max-w-3xl"
        footer={footerContent}
        className="max-h-[90vh] flex flex-col"
    >
        {/* Tab navigation */}
        <div className="flex border-b border-gray-700 bg-gray-800 -mx-6 -mt-6 mb-4" role="tablist" aria-label="Topic creation methods">
            <button
                role="tab"
                id="tab-manual"
                aria-selected={activeTab === 'manual'}
                aria-controls="panel-manual"
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'manual' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-300'}`}
                onClick={() => setActiveTab('manual')}
            >
                Manual
            </button>
            <button
                role="tab"
                id="tab-template"
                aria-selected={activeTab === 'template'}
                aria-controls="panel-template"
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'template' ? 'text-green-400 border-b-2 border-green-500' : 'text-gray-400 hover:text-gray-300'}`}
                onClick={() => setActiveTab('template')}
            >
                From Template
            </button>
            <button
                role="tab"
                id="tab-ai"
                aria-selected={activeTab === 'ai'}
                aria-controls="panel-ai"
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'ai' ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}
                onClick={() => setActiveTab('ai')}
            >
                AI Assistant
            </button>
        </div>

        <div className="overflow-y-auto flex-grow">
            {/* Manual Entry Tab */}
            {activeTab === 'manual' && (
                <form id="manual-form" role="tabpanel" aria-labelledby="tab-manual" onSubmit={handleManualSubmit} className="space-y-4">
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
                        <Select id="topic-type" value={type} onChange={(e) => { setType(e.target.value as any); setPlacement('ai'); }}>
                        <option value="outer">Outer (Supporting Topic)</option>
                        <option value="core">Core (Pillar Topic)</option>
                        <option value="child">Child (Sub-topic under Outer)</option>
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
                    {type === 'child' && (
                        <div>
                        <Label htmlFor="topic-placement">Parent Outer Topic</Label>
                        <Select id="topic-placement" value={placement} onChange={(e) => setPlacement(e.target.value)}>
                            <option value="">Select a parent...</option>
                            {outerTopics.map(outer => (
                            <option key={outer.id} value={outer.id}>Place under: {outer.title}</option>
                            ))}
                        </Select>
                        {outerTopics.length === 0 && (
                            <p className="text-xs text-amber-400 mt-1">No outer topics available. Create outer topics first.</p>
                        )}
                        </div>
                    )}
                </form>
            )}

            {/* From Template Tab */}
            {activeTab === 'template' && (
                <div id="panel-template" role="tabpanel" aria-labelledby="tab-template" className="space-y-4">
                    {mapId && onGenerateTopicsFromTemplate ? (
                        <QueryTemplatePanel
                            mapId={mapId}
                            businessInfo={{
                                industry: state.businessInfo?.industry,
                                region: state.businessInfo?.region,
                                websiteType: state.businessInfo?.websiteType,
                            }}
                            onGenerateTopics={async (result) => {
                                await onGenerateTopicsFromTemplate(result);
                                onClose();
                            }}
                            onOpenLocationManager={onOpenLocationManager}
                        />
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <p className="text-sm">Query templates are not available.</p>
                            <p className="text-xs mt-1">Please ensure a map is selected.</p>
                        </div>
                    )}
                </div>
            )}

            {/* AI Assistant Tab */}
            {activeTab === 'ai' && (
                <div id="panel-ai" role="tabpanel" aria-labelledby="tab-ai" className="space-y-6">
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
    </Modal>
  );
};

export default AddTopicModal;
