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

/**
 * Generate a specific topic title from a contextual gap.
 * Extracts key topic suggestion from the reasoning or creates a descriptive title.
 */
function generateTopicTitle(gap: ContextualCoverageGap): string {
  const reasoning = gap.reasoning || '';

  // Try to extract a quoted topic suggestion from reasoning
  // e.g., 'Consider adding "Advanced VPN Configuration Guide"' -> 'Advanced VPN Configuration Guide'
  const quotedMatch = reasoning.match(/["""]([^"""]+)["""]/);
  if (quotedMatch && quotedMatch[1].length > 5 && quotedMatch[1].length < 80) {
    return quotedMatch[1];
  }

  // Try to extract topic from "add/create/cover X" patterns
  const actionMatch = reasoning.match(/(?:add|create|cover|include|write about|need)\s+(?:a\s+)?(?:topic\s+(?:on|about)\s+)?[""]?([^.,""\n]+)[""]?/i);
  if (actionMatch && actionMatch[1].length > 5 && actionMatch[1].length < 80) {
    // Capitalize first letter
    return actionMatch[1].charAt(0).toUpperCase() + actionMatch[1].slice(1).trim();
  }

  // Try to extract from "missing X" patterns
  const missingMatch = reasoning.match(/missing\s+(?:coverage\s+(?:of|for)\s+)?[""]?([^.,""\n]+)[""]?/i);
  if (missingMatch && missingMatch[1].length > 5 && missingMatch[1].length < 80) {
    return missingMatch[1].charAt(0).toUpperCase() + missingMatch[1].slice(1).trim();
  }

  // Fallback: Create a descriptive title from context type
  const contextLower = gap.context.toLowerCase();
  if (contextLower.includes('temporal')) {
    return `${gap.type === 'TEMPORAL' ? 'Historical & Temporal' : gap.context} Coverage`;
  }
  if (contextLower.includes('micro')) {
    return `Detailed ${gap.context} Analysis`;
  }
  if (contextLower.includes('macro')) {
    return `Broader ${gap.context} Perspective`;
  }
  if (contextLower.includes('intentional')) {
    return `User Intent: ${gap.context}`;
  }

  // Last fallback: Use context with "Guide" suffix
  return `${gap.context} Guide`;
}

const ContextualCoverageModal: React.FC<ContextualCoverageModalProps> = ({ isOpen, onClose, result, onAddTopic }) => {
  const [loadingGaps, setLoadingGaps] = useState<string[]>([]);
  const [addedGaps, setAddedGaps] = useState<string[]>([]);

  const handleAddGap = async (gap: ContextualCoverageGap) => {
    setLoadingGaps(prev => [...prev, gap.context]);
    try {
        // Generate a specific topic title instead of using the generic gap.context
        const topicTitle = generateTopicTitle(gap);
        await onAddTopic(topicTitle, gap.reasoning);
        // Mark as successfully added
        setAddedGaps(prev => [...prev, gap.context]);
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
                                      {addedGaps.includes(gap.context) ? (
                                        <span className="flex items-center gap-1.5 text-green-400 text-xs font-medium py-1 px-3">
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                          Added
                                        </span>
                                      ) : (
                                        <Button
                                          onClick={() => handleAddGap(gap)}
                                          disabled={loadingGaps.includes(gap.context)}
                                          className="text-xs py-1 px-3"
                                        >
                                          {loadingGaps.includes(gap.context) ? <Loader className="w-4 h-4" /> : 'Add as Topic'}
                                        </Button>
                                      )}
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