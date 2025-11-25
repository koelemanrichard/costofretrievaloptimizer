
import React from 'react';
import { ContentCalendarEntry } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface ContentCalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    entries: ContentCalendarEntry[];
}

const ContentCalendarModal: React.FC<ContentCalendarModalProps> = ({ isOpen, onClose, entries }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
        <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
           <header className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
                <h2 className="text-xl font-bold text-white">Content Calendar</h2>
                <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
            </header>
            <div className="p-6 overflow-y-auto">
                 {entries.length === 0 ? (
                    <p className="text-gray-400 text-center py-10">No calendar entries available.</p>
                ) : (
                     <p className="text-gray-400 text-center py-10">Calendar view not yet implemented.</p>
                )}
            </div>
            <footer className="p-4 bg-gray-800 border-t border-gray-700 text-right">
                <Button onClick={onClose} variant="secondary">Close</Button>
            </footer>
        </Card>
      </div>
    );
};

export default ContentCalendarModal;