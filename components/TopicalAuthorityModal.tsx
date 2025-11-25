// @/components/TopicalAuthorityModal.tsx
import React from 'react';
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
import { TopicalAuthorityScore } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ProgressCircle } from './ui/ProgressCircle';

interface TopicalAuthorityModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: TopicalAuthorityScore | null;
}

const TopicalAuthorityModal: React.FC<TopicalAuthorityModalProps> = ({ isOpen, onClose, result }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Topical Authority Score</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {!result ? (
            <p className="text-gray-400 text-center py-10">No topical authority data available.</p>
          ) : (
            <div className="space-y-6">
                <div className="text-center p-4 rounded-lg bg-gray-900/50 flex flex-col items-center">
                    <p className="text-gray-400 text-sm">Overall Topical Authority</p>
                    <div className='my-4'>
                        <ProgressCircle percentage={result.overallScore} size={120} strokeWidth={10} />
                    </div>
                    <p className="text-gray-300 mt-2 italic max-w-md mx-auto">{result.summary}</p>
                </div>

                <div>
                    <h4 className="text-md font-semibold text-white mb-2">Score Breakdown:</h4>
                    <div className="space-y-3">
                       {Object.entries(result.breakdown).map(([key, value]) => (
                           <div key={key} className="flex justify-between items-center">
                               <span className="text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                               {/* FIX: Cast 'value' from unknown to number to satisfy Math.round */}
                               <span className="font-bold text-white">{Math.round(value as number)}/100</span>
                           </div>
                       ))}
                    </div>
                </div>
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

export default TopicalAuthorityModal;
