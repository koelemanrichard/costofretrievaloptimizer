
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

  const currentParent = allCoreTopics.find(ct => ct.id === topic.parent_topic_id);

  const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParentId = e.target.value;
    if (newParentId && newParentId !== currentParent?.id) {
        onReparent(topic.id, newParentId);
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
          <h3 className={`text-lg font-bold ${topic.type === 'core' ? 'text-green-400' : 'text-purple-400'}`}>{safeString(topic.title)}</h3>
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
                            const newType = e.target.value as 'core' | 'outer';
                            onUpdateTopic(topic.id, {
                                type: newType,
                                // Clear parent if promoting to core
                                parent_topic_id: newType === 'core' ? null : topic.parent_topic_id
                            });
                        }
                    }}
                    className="!py-1 !text-xs"
                    disabled={!onUpdateTopic}
                >
                    <option value="core">Core (Hub/Pillar Topic)</option>
                    <option value="outer">Outer (Supporting/Cluster Topic)</option>
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
                <Label htmlFor="parent-topic-select">Parent Topic</Label>
                <Select id="parent-topic-select" value={currentParent?.id || ''} onChange={handleParentChange}>
                    <option value="">-- No Parent --</option>
                    {allCoreTopics.map(core => (
                        <option key={core.id} value={core.id}>{core.title}</option>
                    ))}
                </Select>
            </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-600 space-y-3">
           <Button onClick={onGenerateBrief} className="w-full !py-2 text-sm">
             {hasBrief ? 'View Content Brief' : 'Generate Content Brief'}
           </Button>
           
           {topic.type === 'core' && (
             <div className="space-y-2">
                <Label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Smart Expansion</Label>
                <div className="grid grid-cols-3 gap-1">
                     <Button 
                        onClick={() => onExpand(topic, 'ATTRIBUTE')} 
                        variant="secondary" 
                        className="!py-1 !px-1 text-[10px] flex flex-col items-center justify-center h-14"
                        disabled={isExpanding || !canExpand}
                        title="Deep Dive: Attributes, Features, Specs"
                      >
                        {isExpanding ? <Loader className="w-3 h-3" /> : <><span>🔍</span><span>Deep Dive</span></>}
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
                </div>
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
