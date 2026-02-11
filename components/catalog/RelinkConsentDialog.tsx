/**
 * RelinkConsentDialog - Consent dialog for re-evaluating category links after re-import
 *
 * Shown when a re-import detects categories that already have linked topics
 * with existing content briefs.
 */

import React from 'react';
import { Button } from '../ui/Button';

interface RelinkConsentDialogProps {
  affectedTopicCount: number;
  onRelink: () => void;
  onKeep: () => void;
}

const RelinkConsentDialog: React.FC<RelinkConsentDialogProps> = ({
  affectedTopicCount,
  onRelink,
  onKeep,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-[420px] shadow-xl">
        <h3 className="text-lg font-medium text-gray-200 mb-3">
          Re-evaluate Category Links?
        </h3>
        <p className="text-sm text-gray-400 mb-5">
          {affectedTopicCount} topic(s) have existing content briefs that reference catalog data.
          Re-linking may affect content accuracy for previously generated articles.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onKeep}>
            Keep Current Links
          </Button>
          <Button variant="primary" size="sm" onClick={onRelink}>
            Re-evaluate Links
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RelinkConsentDialog;
