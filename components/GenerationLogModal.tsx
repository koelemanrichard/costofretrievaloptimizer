
import React, { useState } from 'react';
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Changed import to be a relative path.
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
import { GenerationLogEntry } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface GenerationLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logEntries: GenerationLogEntry[];
}

const statusStyles = {
    success: {
        icon: '✅',
        bgColor: 'bg-green-900/40',
        borderColor: 'border-green-700',
        textColor: 'text-green-300',
    },
    failure: {
        icon: '❌',
        bgColor: 'bg-red-900/40',
        borderColor: 'border-red-700',
        textColor: 'text-red-300',
    },
    skipped: {
        icon: '⏩',
        bgColor: 'bg-yellow-900/40',
        borderColor: 'border-yellow-700',
        textColor: 'text-yellow-300',
    },
    info: {
        icon: 'ℹ️',
        bgColor: 'bg-blue-900/40',
        borderColor: 'border-blue-700',
        textColor: 'text-blue-300',
    },
};

const LogEntry: React.FC<{ entry: GenerationLogEntry }> = ({ entry }) => {
    const [isDataVisible, setIsDataVisible] = useState(false);
    const style = statusStyles[entry.status];

    return (
        <div className={`p-4 rounded-lg border ${style.bgColor} ${style.borderColor}`}>
            <div className="flex items-start gap-4">
                <span className="text-2xl mt-1">{style.icon}</span>
                <div className="flex-grow">
                    <div className="flex justify-between items-center">
                        <h4 className={`font-bold text-lg ${style.textColor}`}>{entry.service}</h4>
                        <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-gray-300 mt-1">{entry.message}</p>
                    {entry.data && (
                        <div className="mt-3">
                            <Button variant="secondary" className="!text-xs !py-1 !px-2" onClick={() => setIsDataVisible(!isDataVisible)}>
                                {isDataVisible ? 'Hide Data' : 'View Data'}
                            </Button>
                            {isDataVisible && (
                                <pre className="mt-2 bg-gray-900 p-3 rounded-md text-xs text-gray-400 overflow-auto max-h-60 border border-gray-700">
                                    <code>
                                        {JSON.stringify(entry.data, null, 2)}
                                    </code>
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const GenerationLogModal: React.FC<GenerationLogModalProps> = ({ isOpen, onClose, logEntries }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">Data Generation Log</h2>
                    <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {logEntries.length === 0 ? (
                        <p className="text-gray-400 text-center py-10">No log entries available.</p>
                    ) : (
                        <div className="space-y-4">
                            {logEntries.map((entry, index) => (
                                <LogEntry key={index} entry={entry} />
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default GenerationLogModal;
