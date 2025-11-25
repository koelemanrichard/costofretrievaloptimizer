// components/ui/DebugStatePanel.tsx
import React, { useState } from 'react';
import { Card } from './Card';

// FIX: Added props interface to accept a curated state snapshot for display.
interface DebugStatePanelProps {
  stateSnapshot: Record<string, any>;
}

const DebugStatePanel: React.FC<DebugStatePanelProps> = ({ stateSnapshot }) => {
  const [isOpen, setIsOpen] = useState(false);

  const togglePanel = () => setIsOpen(!isOpen);

  if (!isOpen) {
    return (
      <button
        onClick={togglePanel}
        className="fixed bottom-4 left-4 z-[200] bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-full shadow-lg text-xs"
        title="Debug State"
      >
        {"{...}"}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[199]" onClick={togglePanel}>
        <Card 
            className="fixed bottom-4 left-4 z-[200] w-[450px] max-w-[90vw] h-[80vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex-shrink-0 bg-gray-800 p-2 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white">Debug Snapshot</h3>
                <button onClick={togglePanel} className="text-gray-400 hover:text-white">&times;</button>
            </div>
            <div className="flex-grow p-2 overflow-auto bg-gray-900/80">
                <pre className="text-[10px] text-gray-300 whitespace-pre-wrap">
                    {/* FIX: Changed to display the passed `stateSnapshot` prop instead of the entire global state. */}
                    <code>
                        {JSON.stringify(stateSnapshot, null, 2)}
                    </code>
                </pre>
            </div>
        </Card>
    </div>
  );
};

export default DebugStatePanel;
