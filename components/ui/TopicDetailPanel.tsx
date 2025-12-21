
import React from 'react';
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Changed import to be a relative path.
import { EnrichedTopic, ExpansionMode } from '../../types';
import { Card } from './Card';
import { Button } from './Button';
import { Loader } from './Loader';
import { Select } from './Select';
import { Label } from './Label';
import { safeString } from '../../utils/parsers';

interface TopicDetailPanelProps {
  topic: EnrichedTopic;
  allCoreTopics: EnrichedTopic[];
  allOuterTopics?: EnrichedTopic[]; // For child topic reparenting
  allTopics?: EnrichedTopic[]; // All topics for visual parent selection
  hasBrief: boolean;
  isExpanding: boolean;
  onClose: () => void;
  onGenerateBrief: () => void;
  onExpand: (topic: EnrichedTopic, mode: ExpansionMode) => void;
  onDelete: (topicId: string) => void;
  onReparent: (topicId: string, newParentId: string) => void;
  canExpand: boolean;
  onUpdateTopic?: (topicId: string, updates: Partial<EnrichedTopic>) => void;
}

const TopicDetailPanel: React.FC<TopicDetailPanelProps> = ({
  topic,
  allCoreTopics,
  allOuterTopics = [],
  allTopics = [],
  hasBrief,
  isExpanding,
  onClose,
  onGenerateBrief,
  onExpand,
  onDelete,
  onReparent,
  canExpand,
  onUpdateTopic
}) => {
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete the topic "${topic.title}"?`)) {
      onDelete(topic.id);
      onClose();
    }
  };

  // Find parent from appropriate list based on topic type
  const currentParent = topic.type === 'child'
    ? allOuterTopics.find(ot => ot.id === topic.parent_topic_id)
    : allCoreTopics.find(ct => ct.id === topic.parent_topic_id);

  const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParentId = e.target.value;
    // Use onUpdateTopic directly for more reliable persistence
    // onReparent is used for drag-drop which also updates slugs
    if (onUpdateTopic) {
        onUpdateTopic(topic.id, {
            parent_topic_id: newParentId || null
        });
    }
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onUpdateTopic) {
          const newClass = e.target.value as 'monetization' | 'informational';
          // We must construct the update carefully.
          // 1. Update the root property for immediate UI feedback via optimistic update
          // 2. Update the metadata object because that's where it lives in the DB
          const updatedMetadata = { 
              ...topic.metadata, 
              topic_class: newClass 
          };
          
          onUpdateTopic(topic.id, { 
              topic_class: newClass,
              metadata: updatedMetadata
          });
      }
  };


  return (
    <Card className="fixed top-20 right-4 w-80 max-w-sm bg-gray-800/95 backdrop-blur-md z-50 animate-fade-in-right shadow-2xl border border-gray-600 max-h-[80vh] overflow-y-auto">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <h3 className={`text-lg font-bold ${topic.type === 'core' ? 'text-green-400' : topic.type === 'child' ? 'text-orange-400' : 'text-purple-400'}`}>{safeString(topic.title)}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        <p className="text-xs font-mono text-green-500 mt-1">/{safeString(topic.slug)}</p>
        <p className="text-sm text-gray-300 mt-3">{safeString(topic.description)}</p>
        
        {/* Holistic SEO Identity Section */}
        <div className="mt-4 pt-3 border-t border-gray-700 space-y-3">
            {/* Topic Type (core/outer hierarchy) */}
            <div>
                <Label htmlFor="topic-type-select" className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Topic Type (Hierarchy)</Label>
                <Select
                    id="topic-type-select"
                    value={topic.type}
                    onChange={(e) => {
                        if (onUpdateTopic) {
                            const newType = e.target.value as 'core' | 'outer' | 'child';
                            const oldType = topic.type;

                            // Determine the new parent based on type transition
                            let newParentId: string | null = topic.parent_topic_id;

                            if (newType === 'core') {
                                // Core topics have no parent
                                newParentId = null;
                            } else if (newType === 'outer' && oldType === 'core') {
                                // Core → Outer: keep null, user must select parent
                                // The children will be cascaded to 'child' type automatically
                                newParentId = null;
                            } else if (newType === 'child') {
                                // Clear parent - user must select an outer topic as parent
                                newParentId = null;
                            }

                            onUpdateTopic(topic.id, {
                                type: newType,
                                parent_topic_id: newParentId
                            });

                            // Show helpful message for type transitions
                            if (oldType === 'core' && newType === 'outer') {
                                console.log('[TopicDetailPanel] Core→Outer: Select a parent core topic below. Children will become child topics.');
                            }
                        }
                    }}
                    className="!py-1 !text-xs"
                    disabled={!onUpdateTopic}
                >
                    <option value="core">Core (Hub/Pillar Topic)</option>
                    <option value="outer">Outer (Supporting/Cluster Topic)</option>
                    <option value="child">Child (Sub-topic under Outer)</option>
                </Select>
            </div>

            {/* Topic Class / Section Toggle */}
            <div>
                <Label htmlFor="topic-section-select" className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Topic Section</Label>
                <Select
                    id="topic-section-select"
                    value={topic.topic_class || 'informational'}
                    onChange={handleSectionChange}
                    className="!py-1 !text-xs"
                    disabled={!onUpdateTopic}
                >
                    <option value="monetization">Monetization (Core Section)</option>
                    <option value="informational">Informational (Author Section)</option>
                </Select>
            </div>

            {(topic.canonical_query || (topic.query_network && topic.query_network.length > 0) || topic.url_slug_hint) && (
                <>
                    {topic.canonical_query && (
                        <div className="p-2 bg-gray-900/50 rounded border border-gray-700">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Canonical Query (Intent)</p>
                            <p className="text-sm text-white font-medium">{safeString(topic.canonical_query)}</p>
                        </div>
                    )}

                    {topic.query_network && topic.query_network.length > 0 && (
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Query Network</p>
                            <div className="flex flex-wrap gap-1">
                                {topic.query_network.map((q, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-blue-900/30 text-blue-200 text-[10px] rounded border border-blue-800/50">
                                        {safeString(q)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {(topic.url_slug_hint || topic.planned_publication_date) && (
                         <div className="grid grid-cols-2 gap-2">
                            {topic.url_slug_hint && (
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">URL Hint</p>
                                    <p className="text-xs text-green-400 font-mono">/{safeString(topic.url_slug_hint)}</p>
                                </div>
                            )}
                            {topic.planned_publication_date && (
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">Publish Date</p>
                                    <p className="text-xs text-gray-300">{safeString(topic.planned_publication_date)}</p>
                                </div>
                            )}
                         </div>
                    )}
                </>
            )}
        </div>

        {topic.type === 'outer' && (
            <div className="mt-4 pt-3 border-t border-gray-700">
                <Label htmlFor="parent-topic-select">Parent Topic (Core)</Label>
                <Select id="parent-topic-select" value={currentParent?.id || ''} onChange={handleParentChange}>
                    <option value="">-- No Parent --</option>
                    {allCoreTopics.map(core => (
                        <option key={core.id} value={core.id}>{core.title}</option>
                    ))}
                </Select>
            </div>
        )}

        {topic.type === 'child' && (
            <div className="mt-4 pt-3 border-t border-gray-700">
                <Label htmlFor="parent-topic-select">Parent Topic (Outer)</Label>
                <Select id="parent-topic-select" value={currentParent?.id || ''} onChange={handleParentChange}>
                    <option value="">-- No Parent --</option>
                    {allOuterTopics.map(outer => (
                        <option key={outer.id} value={outer.id}>{outer.title}</option>
                    ))}
                </Select>
                {allOuterTopics.length === 0 && (
                    <p className="text-xs text-amber-400 mt-1">No outer topics available. Create outer topics first.</p>
                )}
            </div>
        )}

        {/* Visual Display Parent - for business presentations (does NOT affect SEO) */}
        {allTopics.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-700">
                <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor="display-parent-select" className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                        Visual Display Parent
                    </Label>
                    <span
                        className="text-[10px] text-gray-500 cursor-help"
                        title="Group this topic visually under another topic for business presentations. This does NOT affect SEO behavior, priority scoring, or hub-spoke metrics."
                    >
                        ℹ️
                    </span>
                </div>
                <Select
                    id="display-parent-select"
                    value={topic.display_parent_id || ''}
                    onChange={(e) => {
                        if (onUpdateTopic) {
                            onUpdateTopic(topic.id, {
                                display_parent_id: e.target.value || null
                            });
                        }
                    }}
                    className="!py-1 !text-xs"
                    disabled={!onUpdateTopic}
                >
                    <option value="">-- No Visual Parent --</option>
                    {allTopics
                        .filter(t => t.id !== topic.id) // Exclude self
                        .map(t => (
                            <option key={t.id} value={t.id}>
                                [{t.type.toUpperCase()}] {t.title}
                            </option>
                        ))
                    }
                </Select>
                {topic.display_parent_id && topic.display_parent_id !== topic.parent_topic_id && (
                    <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                        <span>⚠️ Visual grouping differs from SEO parent</span>
                    </p>
                )}
                <p className="text-[10px] text-gray-500 mt-1">
                    For business presentations only - does not affect SEO.
                </p>
            </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-600 space-y-3">
           <Button onClick={onGenerateBrief} className="w-full !py-2 text-sm">
             {hasBrief ? 'View Content Brief' : 'Generate Content Brief'}
           </Button>

           {/* CORE TOPICS: Full expansion options (creates Outer topics) */}
           {topic.type === 'core' && (
             <div className="space-y-2">
                <Label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Smart Expansion</Label>
                <p className="text-[10px] text-gray-500">Creates Outer topics under this Core topic</p>
                <div className="grid grid-cols-4 gap-1">
                     <Button
                        onClick={() => onExpand(topic, 'ATTRIBUTE')}
                        variant="secondary"
                        className="!py-1 !px-1 text-[10px] flex flex-col items-center justify-center h-14"
                        disabled={isExpanding || !canExpand}
                        title="Deep Dive: Attributes, Features, Specs"
                      >
                        {isExpanding ? <Loader className="w-3 h-3" /> : <><span>🔍</span><span>Deep</span></>}
                     </Button>
                     <Button
                        onClick={() => onExpand(topic, 'ENTITY')}
                        variant="secondary"
                        className="!py-1 !px-1 text-[10px] flex flex-col items-center justify-center h-14"
                        disabled={isExpanding || !canExpand}
                        title="Breadth: Competitors, Alternatives, Related Tools"
                      >
                        {isExpanding ? <Loader className="w-3 h-3" /> : <><span>⚖️</span><span>Compare</span></>}
                     </Button>
                     <Button
                        onClick={() => onExpand(topic, 'CONTEXT')}
                        variant="secondary"
                        className="!py-1 !px-1 text-[10px] flex flex-col items-center justify-center h-14"
                        disabled={isExpanding || !canExpand}
                        title="Background: History, Trends, Context"
                      >
                         {isExpanding ? <Loader className="w-3 h-3" /> : <><span>📜</span><span>Context</span></>}
                     </Button>
                     <Button
                        onClick={() => onExpand(topic, 'FRAME')}
                        variant="secondary"
                        className="!py-1 !px-1 text-[10px] flex flex-col items-center justify-center h-14"
                        disabled={isExpanding || !canExpand}
                        title="Frame Semantics: Scene-based expansion using actions, participants, settings (best for abstract/process topics)"
                      >
                         {isExpanding ? <Loader className="w-3 h-3" /> : <><span>🎭</span><span>Frame</span></>}
                     </Button>
                </div>
             </div>
           )}

           {/* OUTER TOPICS: Frame and Child expansion (creates Child topics) */}
           {topic.type === 'outer' && (
             <div className="space-y-2">
                <Label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Topic Expansion</Label>
                <p className="text-[10px] text-gray-500">Creates Child topics under this Outer topic</p>
                <div className="grid grid-cols-2 gap-2">
                     <Button
                        onClick={() => onExpand(topic, 'FRAME')}
                        variant="secondary"
                        className="!py-2 !px-2 text-xs flex flex-col items-center justify-center h-16"
                        disabled={isExpanding || !canExpand}
                        title="Frame Semantics: Scene-based expansion for low-data topics"
                      >
                         {isExpanding ? <Loader className="w-4 h-4" /> : (
                           <>
                             <span className="text-base">🎭</span>
                             <span>Frame/Scene</span>
                           </>
                         )}
                     </Button>
                     <Button
                        onClick={() => onExpand(topic, 'CHILD')}
                        variant="secondary"
                        className="!py-2 !px-2 text-xs flex flex-col items-center justify-center h-16"
                        disabled={isExpanding || !canExpand}
                        title="Generate child sub-topics: FAQs, variations, audience-specific versions"
                      >
                         {isExpanding ? <Loader className="w-4 h-4" /> : (
                           <>
                             <span className="text-base">👶</span>
                             <span>Children</span>
                           </>
                         )}
                     </Button>
                </div>
             </div>
           )}

           {/* CHILD TOPICS: No expansion (leaf nodes) */}
           {topic.type === 'child' && (
             <div className="p-3 bg-gray-700/30 rounded border border-gray-600">
                <p className="text-xs text-gray-400 text-center">
                  Child topics are leaf nodes in the topical map.
                </p>
                <p className="text-[10px] text-gray-500 text-center mt-1">
                  Generate a Content Brief to develop this topic.
                </p>
             </div>
           )}

            <Button onClick={handleDelete} variant="secondary" className="w-full !py-2 text-sm bg-red-900/40 text-red-300 hover:bg-red-800/60 border border-red-800/50">
                Delete Topic
            </Button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-right {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-right { animation: fade-in-right 0.3s ease-out forwards; }
      `}</style>
    </Card>
  );
};

export default TopicDetailPanel;
