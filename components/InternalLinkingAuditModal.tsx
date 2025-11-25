import React from 'react';
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Changed import to be a relative path.
import { InternalLinkAuditResult } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface InternalLinkingAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: InternalLinkAuditResult | null;
}

export const InternalLinkingAuditModal: React.FC<InternalLinkingAuditModalProps> = ({ isOpen, onClose, result }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Internal Linking Audit Report</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
            {!result ? (
                 <p className="text-gray-400 text-center py-10">No audit data available. Run the audit first.</p>
            ) : (
                <div className="space-y-6">
                    <Card className="p-4 bg-gray-900/50">
                        <h3 className="font-semibold text-lg text-blue-300 mb-2">AI Summary</h3>
                        <p className="text-gray-300 italic">{result.summary}</p>
                    </Card>

                    {result.missedLinks.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-green-400 mb-3">Missed Linking Opportunities</h3>
                            <div className="space-y-3">
                                {result.missedLinks.map((link, index) => (
                                    <Card key={index} className="p-3 bg-gray-800/80">
                                        <p className="text-sm">
                                            From <strong className="text-white">{link.sourceTopic}</strong> to <strong className="text-white">{link.targetTopic}</strong>
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Suggested Anchor: <em className="text-cyan-300">"{link.suggestedAnchor}"</em>
                                        </p>
                                        <p className="text-xs text-yellow-400 mt-1">Priority: {link.linkingPriority}</p>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {result.dilutionRisks.length > 0 && (
                         <div>
                            <h3 className="text-lg font-semibold text-red-400 mb-3">Potential Dilution Risks</h3>
                            <div className="space-y-3">
                                {result.dilutionRisks.map((risk, index) => (
                                    <Card key={index} className="p-3 bg-red-900/20 border border-red-700">
                                        <p className="font-semibold text-white">{risk.topic}</p>
                                        <p className="text-sm text-gray-300">{risk.issue}</p>
                                    </Card>
                                ))}
                            </div>
                         </div>
                    )}
                </div>
            )}
        </div>
        <div className="p-4 bg-gray-800 border-t border-gray-700 text-right">
            <Button onClick={onClose} variant="secondary">Close</Button>
        </div>
      </Card>
    </div>
  );
};