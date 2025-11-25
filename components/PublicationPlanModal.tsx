
import React from 'react';
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Changed import to be a relative path.
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
import { PublicationPlan } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface PublicationPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PublicationPlan | null;
}

const PublicationPlanModal: React.FC<PublicationPlanModalProps> = ({ isOpen, onClose, plan }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">AI-Generated Publication Plan</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none hover:text-white">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {!plan ? (
            <p className="text-gray-400 text-center py-10">No publication plan available. Generate one from the dashboard.</p>
          ) : (
            <div className="space-y-6">
              <div className="text-center p-4 bg-gray-900/50 rounded-lg">
                <p className="text-sm text-gray-400">Total Estimated Duration</p>
                <p className="text-4xl font-bold text-blue-400">{plan.total_duration_weeks} Weeks</p>
              </div>
              {plan.phases.map(phase => (
                <Card key={phase.phase} className="p-4">
                  <h3 className="text-lg font-bold text-white">Phase {phase.phase}: {phase.name}</h3>
                  <div className="flex gap-4 text-sm text-gray-400 mt-2 border-b border-gray-700 pb-2 mb-3">
                    <span>Duration: <span className="font-semibold text-white">{phase.duration_weeks} weeks</span></span>
                    <span>Publishing Rate: <span className="font-semibold text-white">{phase.publishing_rate}</span></span>
                  </div>
                  <ul className="space-y-2">
                    {phase.content.map((item, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <span className={`mr-2 px-2 py-0.5 rounded-full text-xs font-semibold ${item.type === 'core' ? 'bg-green-800 text-green-200' : 'bg-purple-800 text-purple-200'}`}>
                          {item.type}
                        </span>
                        <span className="text-gray-300">{item.title}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
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

export default PublicationPlanModal;
