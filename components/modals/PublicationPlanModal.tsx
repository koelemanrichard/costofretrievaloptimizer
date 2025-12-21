
import React from 'react';
import { PublicationPlan } from '../../types';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface PublicationPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PublicationPlan | null;
}

const PublicationPlanModal: React.FC<PublicationPlanModalProps> = ({ isOpen, onClose, plan }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI-Generated Publication Plan"
      description="View your content publication schedule organized by phases"
      maxWidth="max-w-3xl"
      footer={<Button onClick={onClose} variant="secondary">Close</Button>}
    >
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
    </Modal>
  );
};

export default PublicationPlanModal;
