// components/ContentIntegrityModal.tsx
import React, { useState } from 'react';
import { AuditRuleResult, ContentIntegrityResult } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { Modal } from '../ui/Modal';

interface ContentIntegrityModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ContentIntegrityResult | null;
  onAutoFix?: (rule: AuditRuleResult, fullDraft: string) => Promise<void>;
}

const CheckResult: React.FC<{ rule: AuditRuleResult, fullDraft: string, onAutoFix?: (rule: AuditRuleResult, fullDraft: string) => Promise<void> }> = ({ rule, fullDraft, onAutoFix }) => {
    const [isFixing, setIsFixing] = useState(false);

    const handleFix = async () => {
        if (onAutoFix) {
            setIsFixing(true);
            try {
                await onAutoFix(rule, fullDraft);
            } finally {
                setIsFixing(false);
            }
        }
    };

    // Only show fix button if failed, has a remediation, has a snippet to fix, and handler exists
    const canFix = !rule.isPassing && rule.remediation && rule.affectedTextSnippet && onAutoFix;

    return (
        <div className="flex justify-between items-start gap-4 border-b border-gray-700/50 pb-3 mb-3 last:border-0">
            <div className="flex-grow">
                <h4 className="font-semibold text-white">{rule.ruleName} - <span className={rule.isPassing ? 'text-green-400' : 'text-red-400'}>{rule.isPassing ? 'Passing' : 'Failing'}</span></h4>
                <p className="text-sm text-gray-400 mt-1">{rule.details}</p>
                {!rule.isPassing && rule.affectedTextSnippet && (
                    <div className="mt-2 p-2 bg-red-900/10 border border-red-900/30 rounded text-xs font-mono text-gray-300">
                        <strong>Issue:</strong> "{rule.affectedTextSnippet}"
                    </div>
                )}
            </div>
            {canFix && (
                <Button onClick={handleFix} disabled={isFixing} className="text-xs !py-1 !px-3 bg-blue-700 hover:bg-blue-600 flex-shrink-0">
                    {isFixing ? <Loader className="w-3 h-3" /> : 'Auto-Fix'}
                </Button>
            )}
        </div>
    );
};

const ContentIntegrityModal: React.FC<ContentIntegrityModalProps> = ({ isOpen, onClose, result, onAutoFix }) => {
  if (!result) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Content Integrity Audit"
      description="Semantic and linguistic analysis of your content"
      maxWidth="max-w-2xl"
      footer={<Button onClick={onClose} variant="secondary">Close</Button>}
    >
      <div className="space-y-6">
        <Card className="p-4 bg-gray-900/50">
          <h3 className="font-semibold text-lg text-blue-300 mb-2">Overall Summary</h3>
          <p className="text-gray-300 italic">{result.overallSummary}</p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h4 className="font-semibold text-white mb-2">Semantic Checks</h4>
            <CheckResult rule={{ ruleName: "EAV Check", isPassing: result.eavCheck.isPassing, details: result.eavCheck.details }} fullDraft={result.draftText} />
            <CheckResult rule={{ ruleName: "Internal Link Check", isPassing: result.linkCheck.isPassing, details: result.linkCheck.details }} fullDraft={result.draftText} />
          </Card>
          <Card className="p-4">
            <h4 className="font-semibold text-white mb-2">Linguistic Score</h4>
            <div className="flex items-center gap-2 mb-2" role="img" aria-label={`Linguistic score: ${result.linguisticModality.score} out of 100`}>
              <span className="text-3xl font-bold text-yellow-400">{result.linguisticModality.score}</span>
              <span className="text-sm text-gray-400">/100</span>
            </div>
            <p className="text-sm text-gray-400">{result.linguisticModality.summary}</p>
          </Card>
        </div>

        {result.frameworkRules.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-lg text-white mb-4">Algorithmic Rule Compliance</h3>
            <ul className="space-y-1" role="list" aria-label="Compliance rules">
              {result.frameworkRules.map((rule, idx) => (
                <li key={idx}>
                  <CheckResult
                    rule={rule}
                    fullDraft={result.draftText}
                    onAutoFix={onAutoFix}
                  />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </Modal>
  );
};

export default ContentIntegrityModal;
