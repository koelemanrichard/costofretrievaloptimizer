import React, { useId } from 'react';
// FIX: Corrected import path for 'types' to be relative, fixing module resolution error.
// FIX: Changed import to be a relative path.
import { InternalLinkAuditResult } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface InternalLinkingAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: InternalLinkAuditResult | null;
}

export const InternalLinkingAuditModal: React.FC<InternalLinkingAuditModalProps> = ({ isOpen, onClose, result }) => {
  const sectionId = useId();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Internal Linking Audit Report"
      description="Analysis of internal linking structure and opportunities"
      maxWidth="max-w-4xl"
      footer={<Button onClick={onClose} variant="secondary">Close</Button>}
    >
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
              <h3 id={`${sectionId}-missed`} className="text-lg font-semibold text-green-400 mb-3">Missed Linking Opportunities</h3>
              <ul className="space-y-3" role="list" aria-labelledby={`${sectionId}-missed`}>
                {result.missedLinks.map((link, index) => (
                  <li key={index}>
                    <Card className="p-3 bg-gray-800/80">
                      <p className="text-sm">
                        From <strong className="text-white">{link.sourceTopic}</strong> to <strong className="text-white">{link.targetTopic}</strong>
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Suggested Anchor: <em className="text-cyan-300">"{link.suggestedAnchor}"</em>
                      </p>
                      <p className="text-xs text-yellow-400 mt-1">Priority: {link.linkingPriority}</p>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.dilutionRisks.length > 0 && (
            <div>
              <h3 id={`${sectionId}-risks`} className="text-lg font-semibold text-red-400 mb-3">Potential Dilution Risks</h3>
              <ul className="space-y-3" role="list" aria-labelledby={`${sectionId}-risks`}>
                {result.dilutionRisks.map((risk, index) => (
                  <li key={index}>
                    <Card className="p-3 bg-red-900/20 border border-red-700">
                      <p className="font-semibold text-white">{risk.topic}</p>
                      <p className="text-sm text-gray-300">{risk.issue}</p>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};