
import React, { useState, useEffect } from 'react';
// FIX: Corrected import path for 'types' to be relative, fixing module resolution errors.
// FIX: Changed import to be a relative path.
// FIX: Corrected import path for 'types' to be relative, fixing module resolution errors.
import { EnrichedTopic, ExpansionMode } from '../types';
// FIX: Corrected import path to be a relative path.
import { Loader } from './ui/Loader';
// FIX: Corrected import path to be a relative path.
import { slugify } from '../utils/helpers';
// FIX: Corrected import path to be a relative path.
import { Input } from './ui/Input';
import { safeString } from '../utils/parsers';
import TopicDetailPanel from './ui/TopicDetailPanel';

interface TopicItemProps {
  topic: EnrichedTopic;
  onHighlight: (topic: EnrichedTopic) => void;
  onGenerateBrief: () => void;
  onDelete: () => void;
  hasBrief: boolean;
  onExpand?: (topic: EnrichedTopic, mode: ExpansionMode) => void;
  isExpanding?: boolean;
  onUpdateTopic: (topicId: string, updates: Partial<EnrichedTopic>) => void;
  onDropOnTopic: (e: React.DragEvent, targetTopicId: string) => void;
  onDragStart: (e: React.DragEvent, topicId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isHighlighted?: boolean;
  isChecked: boolean;
  onToggleSelection: (topicId: string) => void;
  canExpand: boolean;
  canGenerateBriefs: boolean;
  allCoreTopics?: EnrichedTopic[]; // Added for reparenting
  onReparent?: (topicId: string, newParentId: string) => void; // Added for reparenting
  isGeneratingBrief?: boolean; // Pulsing indicator when brief is being generated
}

const ActionButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ReactNode }> = ({ icon, ...props }) => (
    <button
        {...props}
        onClick={(e) => {
            e.stopPropagation();
            if (props.onClick) props.onClick(e);
        }}
        className={`p-1 rounded-full text-gray-500 hover:bg-gray-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${props.className}`}
    >
        {icon}
    </button>
);


const TopicItem: React.FC<TopicItemProps> = ({
    topic,
    onHighlight,
    onGenerateBrief,
    onDelete,
    hasBrief,
    onExpand,
    isExpanding,
    onUpdateTopic,
    onDropOnTopic,
    onDragStart,
    onDragEnd,
    isHighlighted,
    isChecked,
    onToggleSelection,
    canExpand,
    canGenerateBriefs,
    allCoreTopics = [],
    onReparent = () => {},
    isGeneratingBrief = false,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    
    const title = safeString(topic.title);
    const slug = safeString(topic.slug);
    const description = safeString(topic.description);

    // Edit mode state
    const [editableTitle, setEditableTitle] = useState(title);
    const [editableSlug, setEditableSlug] = useState(slug);

    useEffect(() => {
        setEditableTitle(title);
        setEditableSlug(slug);
    }, [title, slug]);

    const topicTypeColor = topic.type === 'core' ? 'border-green-500/50' : 'border-purple-500/50';

    const handleContainerClick = () => {
        if (!isEditing) {
            setShowDetailPanel(true);
            onHighlight(topic);
        }
    };

    const handleDeleteClick = () => {
        onDelete();
    };

    const handleStartEdit = () => {
        setIsEditing(true);
        setEditableTitle(title);
        setEditableSlug(slug);
    };

    const handleSaveEdit = () => {
        const sanitizedSlug = slugify(editableSlug);
        const updates: Partial<EnrichedTopic> = {};
        
        if (editableTitle !== title) updates.title = editableTitle;
        if (sanitizedSlug !== slug) updates.slug = sanitizedSlug;

        if (Object.keys(updates).length > 0) {
            onUpdateTopic(topic.id, updates);
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditableTitle(title);
        setEditableSlug(slug);
    };
    
    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancelEdit();
        }
    };
    
    const [isDragOver, setIsDragOver] = useState(false);
    const [showDetailPanel, setShowDetailPanel] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = () => setIsDragOver(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        onDropOnTopic(e, topic.id);
        setIsDragOver(false);
    };
    
    const renderBriefButton = () => {
        const titleText = hasBrief 
            ? "View Content Brief" 
            : canGenerateBriefs 
            ? "Generate Content Brief" 
            : "Define SEO Pillars and run 'Analyze Domain' to enable.";
        
        const icon = hasBrief
            ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C3.732 4.943 9.522 3 10 3s6.268 1.943 9.542 7c-3.274 5.057-9.064 7-9.542 7S3.732 15.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
            : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 hover:text-blue-400" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>;

        return (
            <ActionButton
                onClick={onGenerateBrief}
                disabled={!hasBrief && !canGenerateBriefs}
                title={titleText}
                icon={icon}
            />
        );
    };
    
    const renderExpandButton = () => {
        if (topic.type !== 'core' || !onExpand) return null;
        
        return (
            <ActionButton
                onClick={() => onExpand(topic, 'CONTEXT')}
                disabled={isExpanding || !canExpand}
                title={!canExpand ? "Run 'Analyze Domain' and ensure SEO Pillars are set to enable expansion." : "Expand Topic"}
                className="hover:text-purple-400"
                icon={isExpanding ? <Loader className="w-5 h-5"/> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>}
            />
        );
    };

    const renderDeleteButton = () => (
         <ActionButton
            onClick={handleDeleteClick}
            title="Delete Topic"
            className="hover:text-red-400"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>}
        />
    );


    return (
        <>
            <div
                className={`group p-4 bg-gray-800 rounded-lg hover:bg-gray-700/80 transition-all duration-200 border flex items-start gap-3 cursor-pointer ${topicTypeColor} ${isHighlighted || isEditing ? 'ring-2 ring-blue-500' : ''} ${isDragOver ? 'ring-2 ring-blue-500 border-blue-400' : ''} ${isGeneratingBrief ? 'ring-2 ring-blue-400 animate-pulse' : ''}`}
                onClick={handleContainerClick}
                draggable={topic.type === 'outer'}
                onDragStart={(e) => onDragStart(e, topic.id)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={onDragEnd}
            >
                <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                        e.stopPropagation();
                        onToggleSelection(topic.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 mt-1 h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                />
                <div className="flex-grow flex flex-col">
                    <div className="w-full flex justify-between items-start">
                        <div className="flex-1 pr-2">
                            {isEditing ? (
                                <Input 
                                    value={editableTitle}
                                    onChange={(e) => setEditableTitle(e.target.value)}
                                    onKeyDown={handleEditKeyDown}
                                    onClick={e => e.stopPropagation()}
                                    autoFocus
                                    className="!h-8 !text-sm font-semibold !bg-gray-900 !border-blue-500 mb-1"
                                    placeholder="Topic Title"
                                />
                            ) : (
                                <h4 className="font-semibold text-white flex items-center gap-2">
                                    {title}
                                    {isGeneratingBrief && (
                                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                                            Generating...
                                        </span>
                                    )}
                                </h4>
                            )}
                            
                             <div className="flex items-center gap-1 mt-1">
                                 <span className="text-xs text-green-400 font-mono">/</span>
                                {isEditing ? (
                                    <div className="flex-grow flex items-center gap-1">
                                        <Input 
                                            value={editableSlug}
                                            onChange={(e) => setEditableSlug(e.target.value)}
                                            onKeyDown={handleEditKeyDown}
                                            onClick={e => e.stopPropagation()}
                                            className="!h-6 !text-xs !p-1 !w-full font-mono !bg-gray-900"
                                            placeholder="slug"
                                        />
                                        <ActionButton onClick={handleSaveEdit} title="Save" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>} className="hover:text-green-400" />
                                        <ActionButton onClick={handleCancelEdit} title="Cancel" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>} className="hover:text-red-400" />
                                    </div>
                                ) : (
                                     <p className="text-xs text-green-400 font-mono">{slug}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center flex-shrink-0 gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            {!isEditing && (
                                <ActionButton onClick={handleStartEdit} title="Edit" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>} className="hover:text-blue-400" />
                            )}
                            {renderBriefButton()}
                            {renderExpandButton()}
                            {renderDeleteButton()}
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 mt-2 pr-2">{description}</p>
                </div>
            </div>
            {showDetailPanel && (
                 <TopicDetailPanel 
                    topic={topic}
                    allCoreTopics={allCoreTopics}
                    hasBrief={hasBrief}
                    isExpanding={!!isExpanding}
                    onClose={() => setShowDetailPanel(false)}
                    onGenerateBrief={onGenerateBrief}
                    onExpand={(t, m) => onExpand && onExpand(t, m)}
                    onDelete={onDelete}
                    onReparent={onReparent}
                    canExpand={canExpand}
                    onUpdateTopic={onUpdateTopic}
                 />
            )}
        </>
    );
};

export default TopicItem;
