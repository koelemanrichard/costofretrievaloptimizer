// @/components/TopicalAuthorityModal.tsx
import React from 'react';
import { TopicalAuthorityScore } from '../../types';
import { Button } from '../ui/Button';
import { ProgressCircle } from '../ui/ProgressCircle';
import { Modal } from '../ui/Modal';

interface TopicalAuthorityModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: TopicalAuthorityScore | null;
}

const TopicalAuthorityModal: React.FC<TopicalAuthorityModalProps> = ({ isOpen, onClose, result }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Topical Authority Score"
      description="Analysis of your content's topical authority coverage"
      maxWidth="max-w-2xl"
      footer={<Button onClick={onClose} variant="secondary">Close</Button>}
    >
      {!result ? (
        <p className="text-gray-400 text-center py-10">No topical authority data available.</p>
      ) : (
        <div className="space-y-6">
          <div className="text-center p-4 rounded-lg bg-gray-900/50 flex flex-col items-center">
            <p className="text-gray-400 text-sm">Overall Topical Authority</p>
            <div className="my-4" role="img" aria-label={`Overall score: ${result.overallScore}%`}>
              <ProgressCircle percentage={result.overallScore} size={120} strokeWidth={10} />
            </div>
            <p className="text-gray-300 mt-2 italic max-w-md mx-auto">{result.summary}</p>
          </div>

          <div>
            <h4 className="text-md font-semibold text-white mb-2">Score Breakdown:</h4>
            <dl className="space-y-3">
              {Object.entries(result.breakdown).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center">
                  <dt className="text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</dt>
                  <dd className="font-bold text-white">{Math.round(value as number)}/100</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default TopicalAuthorityModal;
