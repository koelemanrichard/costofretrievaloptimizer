import React from 'react';
import { SiteInventoryItem, TransitionStatus } from '../../types';
import { Card } from '../ui/Card';

interface TransitionKanbanProps {
    inventory: SiteInventoryItem[];
    onStatusChange: (itemId: string, newStatus: TransitionStatus) => void;
    onSelect: (item: SiteInventoryItem) => void;
}

const COLUMNS: { id: TransitionStatus; label: string; color: string }[] = [
    { id: 'AUDIT_PENDING', label: 'Not Analyzed', color: 'border-gray-500' },
    { id: 'GAP_ANALYSIS', label: 'Analyzed', color: 'border-blue-500' },
    { id: 'ACTION_REQUIRED', label: 'Needs Work', color: 'border-yellow-500' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: 'border-purple-500' },
    { id: 'OPTIMIZED', label: 'Complete', color: 'border-green-500' },
];

export const TransitionKanban: React.FC<TransitionKanbanProps> = ({ inventory, onStatusChange, onSelect }) => {
    
    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('application/x-inventory-id', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, status: TransitionStatus) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('application/x-inventory-id');
        if (id) {
            onStatusChange(id, status);
        }
    };

    return (
        <div className="flex h-full gap-4 overflow-x-auto pb-4">
            {COLUMNS.map(col => (
                <div 
                    key={col.id} 
                    className="flex-shrink-0 w-72 flex flex-col bg-gray-900/30 rounded-lg border border-gray-800 h-full max-h-full"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.id)}
                >
                    <div className={`p-3 font-bold text-sm text-gray-300 border-b-2 ${col.color} flex justify-between items-center bg-gray-900/50 rounded-t-lg`}>
                        <span>{col.label}</span>
                        <span className="bg-gray-800 px-2 rounded-full text-xs py-0.5 text-gray-400 border border-gray-700">
                            {inventory.filter(i => i.status === col.id).length}
                        </span>
                    </div>
                    <div className="p-2 flex-grow overflow-y-auto space-y-2 custom-scrollbar">
                        {inventory.filter(i => i.status === col.id).map(item => (
                            <Card 
                                key={item.id} 
                                className={`p-3 cursor-grab active:cursor-grabbing hover:border-blue-500 transition-colors group ${item.mapped_topic_id ? 'bg-blue-900/10 border-blue-900/30' : ''}`}
                                onClick={() => onSelect(item)}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item.id)}
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <p className="text-sm font-medium text-white truncate flex-grow" title={item.url}>
                                        {item.url.replace(/^https?:\/\/[^/]+/, '')}
                                    </p>
                                    {item.mapped_topic_id && (
                                        <span title="Mapped to Topic" className="text-xs">🔗</span>
                                    )}
                                </div>
                                
                                {item.title && <p className="text-xs text-gray-500 mt-1 truncate">{item.title}</p>}

                                <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-700/50">
                                    <div className="text-[10px] text-gray-500 flex gap-2">
                                        {item.gsc_clicks > 0 && <span className="text-green-400 font-bold">{item.gsc_clicks} clicks</span>}
                                        {item.cor_score !== undefined && (
                                            <span className={item.cor_score > 70 ? 'text-red-400' : 'text-gray-400'}>
                                                CoR: {item.cor_score}
                                            </span>
                                        )}
                                    </div>
                                    {item.action && (
                                        <span className="text-[9px] uppercase bg-gray-700 px-1.5 py-0.5 rounded text-gray-300 font-bold">
                                            {item.action.replace('_', ' ')}
                                        </span>
                                    )}
                                </div>
                            </Card>
                        ))}
                        {inventory.filter(i => i.status === col.id).length === 0 && (
                            <div className="h-20 border-2 border-dashed border-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-600">
                                Drag items here
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};