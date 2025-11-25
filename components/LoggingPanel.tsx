// components/LoggingPanel.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAppState } from '../state/appState';
import { Card } from './ui/Card';
import { GenerationLogEntry } from '../types';
import { Button } from './ui/Button';

const statusStyles: Record<GenerationLogEntry['status'], string> = {
    success: 'text-green-400',
    failure: 'text-red-400',
    info: 'text-blue-400',
    skipped: 'text-yellow-400',
    warning: 'text-orange-400',
};

const LoggingPanel: React.FC = () => {
    const { state, dispatch } = useAppState();
    const { generationLog } = state;
    const [isOpen, setIsOpen] = useState(false);
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Auto-scroll to the bottom when a new log entry is added
        if (isOpen && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [generationLog, isOpen]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="bg-gray-700 hover:bg-gray-600 text-white font-mono text-xs py-2 px-3 rounded-full shadow-lg"
                title="Show Logs"
            >
                [LOGS]
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-[99]" onClick={() => setIsOpen(false)}>
            <Card 
                className="fixed bottom-4 right-4 z-[100] w-[600px] max-w-[90vw] h-[70vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex-shrink-0 bg-gray-800 p-2 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">Application Log</h3>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" className="!text-xs !py-1 !px-2" onClick={() => dispatch({ type: 'CLEAR_LOG' })}>
                            Clear Log
                        </Button>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                    </div>
                </div>
                <div ref={logContainerRef} className="flex-grow p-2 overflow-y-auto bg-gray-900/80 font-mono text-xs space-y-2">
                    {generationLog.length === 0 ? (
                        <p className="text-gray-500 p-2">No events logged yet.</p>
                    ) : (
                        generationLog.map((entry, index) => (
                            <div key={index} className="border-b border-gray-800 pb-1">
                                <span className="text-gray-500 mr-2">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
                                <span className={`${statusStyles[entry.status]} font-bold`}>{entry.service}:</span>
                                <p className="text-gray-300 pl-2">{entry.message}</p>
                            </div>
                        ))
                    )}
                </div>
            </Card>
        </div>
    );
};

export default LoggingPanel;