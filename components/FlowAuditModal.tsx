
import React, { useState, useEffect } from 'react';
import { FlowAuditResult, ContextualFlowIssue } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ProgressCircle } from './ui/ProgressCircle';
import { InfoTooltip } from './ui/InfoTooltip';
import { safeString } from '../utils/parsers';
import { Loader } from './ui/Loader';

interface FlowAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: FlowAuditResult | null;
  onAutoFix: (issue: ContextualFlowIssue) => Promise<void>;
  onBatchAutoFix: (issues: ContextualFlowIssue[]) => Promise<void>;
}

const getSeverityStyles = (issue: ContextualFlowIssue) => {
    // Simple heuristic: Vector/Macro issues are more critical for flow
    if (issue.category === 'VECTOR' || issue.category === 'MACRO') {
        return 'border-red-500 bg-red-900/20 text-red-200';
    }
    return 'border-yellow-500 bg-yellow-900/20 text-yellow-200';
};

const FlowAuditModal: React.FC<FlowAuditModalProps> = ({ isOpen, onClose, result, onAutoFix, onBatchAutoFix }) => {
  const [issueStatus, setIssueStatus] = useState<Record<number, 'IDLE' | 'FIXING' | 'FIXED' | 'DISMISSED'>>({});
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isBatchFixing, setIsBatchFixing] = useState(false);

  // Reset status when a new result loads
  useEffect(() => {
      if (isOpen) {
          setIssueStatus({});
          setSelectedIndices(new Set());
      }
  }, [isOpen, result]);

  const handleFix = async (index: number, issue: ContextualFlowIssue) => {
      setIssueStatus(prev => ({ ...prev, [index]: 'FIXING' }));
      try {
          await onAutoFix(issue);
          setIssueStatus(prev => ({ ...prev, [index]: 'FIXED' }));
      } catch (error) {
          console.error("Auto-fix failed", error);
          setIssueStatus(prev => ({ ...prev, [index]: 'IDLE' })); // Revert on error so user can try again
      }
  };

  const handleDismiss = (index: number) => {
      setIssueStatus(prev => ({ ...prev, [index]: 'DISMISSED' }));
      const newSet = new Set(selectedIndices);
      newSet.delete(index);
      setSelectedIndices(newSet);
  };

  const toggleSelection = (index: number) => {
      const newSet = new Set(selectedIndices);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      setSelectedIndices(newSet);
  };

  const handleSelectAll = () => {
      if (!result) return;
      
      const fixableIndices: number[] = [];
      result.issues.forEach((issue, idx: number) => {
          const isActionable = 
              issue.offendingSnippet && 
              issue.remediation && 
              issueStatus[idx] !== 'DISMISSED' && 
              issueStatus[idx] !== 'FIXED';
          
          if (isActionable) {
              fixableIndices.push(idx);
          }
      });
      
      setSelectedIndices(new Set(fixableIndices));
  };

  const handleDeselectAll = () => {
      setSelectedIndices(new Set());
  };

  const handleBatchFixClick = async () => {
      if(!result) return;
      setIsBatchFixing(true);
      
      const indicesToFix: number[] = Array.from(selectedIndices);
      // Optimistically mark as fixing
      const newStatus = { ...issueStatus };
      indicesToFix.forEach((idx: number) => { newStatus[idx] = 'FIXING'; });
      setIssueStatus(newStatus);

      const issuesToFix = indicesToFix.map((idx: number) => result.issues[idx]);
      
      await onBatchAutoFix(issuesToFix);
      
      setIsBatchFixing(false);
      // Note: Parent will update 'result', triggering useEffect to clear selection and statuses, which is correct for a fresh state.
  };

  if (!isOpen) return null;

  const fixableIssuesCount = result?.issues.filter(i => i.offendingSnippet && i.remediation).length || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-[70] flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <div>
             <h2 className="text-xl font-bold text-white">Semantic Flow & Vector Audit</h2>
             <p className="text-sm text-gray-400">Deep analysis of intra-page contextual progression.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
        </header>

        <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
            {!result ? (
                <div className="w-full p-10 text-center text-gray-400">No audit data available.</div>
            ) : (
                <>
                    {/* Left Column: Visual Vector Timeline */}
                    <div className="w-full md:w-1/3 border-r border-gray-700 bg-gray-900/50 p-6 overflow-y-auto">
                        <h3 className="font-semibold text-blue-300 mb-4 flex items-center">
                            Contextual Vector
                            <InfoTooltip text="The sequence of headings must form a logical, unbroken chain of context." />
                        </h3>
                        
                        <div className="relative pl-4 border-l-2 border-gray-700 space-y-6">
                            {result.headingVector.map((heading, index) => {
                                const isIssue = result.issues.some(i => i.offendingSnippet && heading.includes(i.offendingSnippet));
                                return (
                                    <div key={index} className="relative">
                                        <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ${isIssue ? 'bg-red-500' : 'bg-green-500'} border-2 border-gray-900`}></div>
                                        <p className={`text-sm ${isIssue ? 'text-red-300 font-medium' : 'text-gray-300'}`}>
                                            {safeString(heading)}
                                        </p>
                                        {isIssue && (
                                            <span className="text-xs text-red-500 block mt-1">⚠️ Vector Break</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                         <div className="mt-8 pt-6 border-t border-gray-700">
                            <h3 className="font-semibold text-blue-300 mb-4">Discourse Continuity</h3>
                            {result.discourseGaps.length === 0 ? (
                                <p className="text-green-400 text-sm">✓ No discourse gaps detected. Paragraphs flow smoothly.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {result.discourseGaps.map((gapIndex) => (
                                        <li key={gapIndex} className="text-sm text-yellow-300">
                                            ⚠️ Gap detected after Paragraph {gapIndex + 1}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Scorecard & Details */}
                    <div className="w-full md:w-2/3 p-6 overflow-y-auto relative">
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg border border-gray-700">
                                <span className="text-sm text-gray-400 mb-2">Overall Flow</span>
                                <ProgressCircle percentage={result.overallFlowScore} size={80} color={result.overallFlowScore > 80 ? '#22c55e' : '#eab308'} />
                            </div>
                             <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg border border-gray-700">
                                <span className="text-sm text-gray-400 mb-2">Vector Straightness</span>
                                <span className="text-3xl font-bold text-white mt-2">{result.vectorStraightness}/100</span>
                            </div>
                             <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg border border-gray-700">
                                <span className="text-sm text-gray-400 mb-2">Information Density</span>
                                <span className="text-3xl font-bold text-white mt-2">{result.informationDensity}/100</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-4">
                             <h3 className="font-semibold text-white">Identified Flow Issues</h3>
                             {fixableIssuesCount > 0 && (
                                 <div className="text-xs space-x-3">
                                     <button onClick={handleSelectAll} className="text-blue-400 hover:text-blue-300">Select All Fixable</button>
                                     <button onClick={handleDeselectAll} className="text-gray-400 hover:text-gray-300">Deselect All</button>
                                 </div>
                             )}
                        </div>
                        
                        {result.issues.length === 0 ? (
                            <p className="text-gray-400 italic">No semantic flow issues detected.</p>
                        ) : (
                            <div className="space-y-4 pb-20">
                                {result.issues.map((issue, idx) => {
                                    const status = issueStatus[idx] || 'IDLE';
                                    if (status === 'DISMISSED') return null;

                                    const canFix = issue.offendingSnippet && issue.remediation;
                                    const isSelected = selectedIndices.has(idx);

                                    return (
                                        <div 
                                            key={idx} 
                                            className={`p-4 rounded-lg border-l-4 transition-colors ${getSeverityStyles(issue)} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {canFix && status !== 'FIXED' && (
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected} 
                                                        onChange={() => toggleSelection(idx)}
                                                        className="mt-1 h-4 w-4 rounded border-gray-500 bg-gray-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                )}
                                                <div className="flex-grow">
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-xs uppercase tracking-wider opacity-80">{issue.category} RULE: {issue.rule}</span>
                                                        <button onClick={() => handleDismiss(idx)} className="text-gray-400 hover:text-white text-xs font-medium">
                                                            Dismiss
                                                        </button>
                                                    </div>
                                                    <p className="mt-1 font-medium">{issue.details}</p>
                                                    {issue.offendingSnippet && (
                                                        <div className="mt-2 p-2 bg-black/20 rounded text-xs font-mono opacity-90">
                                                            Snippet: "{safeString(issue.offendingSnippet)}"
                                                        </div>
                                                    )}
                                                    {issue.remediation && (
                                                        <div className="mt-2 text-sm italic border-l-2 border-white/20 pl-2 mb-3">
                                                            <strong>Suggestion:</strong> {safeString(issue.remediation)}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Action Area */}
                                                    <div className="flex justify-end mt-2 pt-2 border-t border-white/10">
                                                        {status === 'FIXED' ? (
                                                            <span className="text-green-400 font-bold text-sm flex items-center gap-1">
                                                                ✓ Resolved
                                                            </span>
                                                        ) : canFix ? (
                                                            <Button 
                                                                onClick={() => handleFix(idx, issue)} 
                                                                disabled={status === 'FIXING' || isBatchFixing}
                                                                className="text-xs !py-1 !px-3 bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                                                            >
                                                                {status === 'FIXING' ? <Loader className="w-3 h-3" /> : '✨ Auto-Fix'}
                                                            </Button>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">Manual fix required</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        
                        {/* Floating Action Bar for Batch Fix */}
                        {selectedIndices.size > 0 && (
                            <div className="absolute bottom-4 left-6 right-6 bg-blue-900/90 backdrop-blur-md p-4 rounded-lg shadow-2xl border border-blue-500 flex justify-between items-center animate-fade-in-up">
                                <span className="text-white font-semibold">{selectedIndices.size} issues selected for remediation</span>
                                <Button onClick={handleBatchFixClick} disabled={isBatchFixing} className="bg-white text-blue-900 hover:bg-gray-100 font-bold shadow-md">
                                    {isBatchFixing ? <div className="flex items-center gap-2"><Loader className="w-4 h-4 text-blue-900"/> <span>Processing Batch...</span></div> : `Fix ${selectedIndices.size} Issues`}
                                </Button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>

        <footer className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end">
            <Button onClick={onClose} variant="secondary">Close</Button>
        </footer>
        <style>{`
            @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
        `}</style>
      </Card>
    </div>
  );
};

export default FlowAuditModal;
