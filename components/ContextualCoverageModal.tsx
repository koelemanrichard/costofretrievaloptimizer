import React, { useState } from 'react';
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Changed import to be a relative path.
import { ContextualCoverageMetrics, ContextualCoverageGap } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ProgressCircle } from './ui/ProgressCircle';
import { InfoTooltip } from './ui/InfoTooltip';
import { Loader } from './ui/Loader';

interface ContextualCoverageModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ContextualCoverageMetrics | null;
  onAddTopic: (title: string, description?: string) => Promise<void>;
}

const ContextualCoverageModal: React.FC<ContextualCoverageModalProps> = ({ isOpen, onClose, result, onAddTopic }) => {
  const [loadingGaps, setLoadingGaps] = useState<string[]>([]);

  const handleAddGap = async (gap: ContextualCoverageGap) => {
    setLoadingGaps(prev => [...prev, gap.context]);
    try {
        await onAddTopic(gap.context, gap.reasoning);
    } catch (error) {
        console.error("Failed to add topic from gap:", error);
    } finally {
        setLoadingGaps(prev => prev.filter(g => g !== gap.context));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Contextual Coverage Analysis</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
        </header>
        <div className="p-6 overflow-y-auto">
            {!result ? (
                <p className="text-gray-400 text-center py-10">No coverage data available. Run the analysis first.</p>
            ) : (
                <div className="space-y-6">
                    <Card className="p-4 bg-gray-900/50">
                        <h3 className="font-semibold text-lg text-blue-300 mb-2">AI Summary</h3>
                        <p className="text-gray-300 italic">{result.summary}</p>
                    </Card>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                       {/* Placeholder for metrics */}
                    </div>

                    {result.gaps && result.gaps.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-red-400 mb-3">Identified Contextual Gaps</h3>
                            <div className="space-y-3">
                                {result.gaps.map((gap, index) => (
                                    <Card key={index} className="p-3 bg-red-900/20 border border-red-700 flex justify-between items-center">
                                      <div>
                                        <p className="font-semibold text-white">{gap.context}</p>
                                        <p className="text-sm text-gray-400">{gap.reasoning}</p>
                                      </div>
                                      <Button onClick={() => handleAddGap(gap)} disabled={loadingGaps.includes(gap.context)} className="text-xs py-1 px-3">
                                        {loadingGaps.includes(gap.context) ? <Loader className="w-4 h-4" /> : 'Add as Topic'}
                                      </Button>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
        <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end">
            <Button onClick={onClose} variant="secondary">Close</Button>
        </div>
      </Card>
    </div>
  );
};

export default ContextualCoverageModal;