/**
 * ImprovementConfirmationModal
 *
 * Shows proposed map improvements BEFORE they are applied.
 * Allows user to review additions, removals, and reclassifications
 * before confirming the destructive action.
 */

import React, { useState } from 'react';
import { MapImprovementSuggestion } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';

interface ImprovementConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: MapImprovementSuggestion | null;
  onConfirm: () => void;
  isApplying: boolean;
}

const ImprovementConfirmationModal: React.FC<ImprovementConfirmationModalProps> = ({
  isOpen,
  onClose,
  suggestion,
  onConfirm,
  isApplying,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!isOpen || !suggestion) return null;

  const hasAdditions = suggestion.newTopics.length > 0;
  const hasDeletions = suggestion.topicTitlesToDelete.length > 0;
  const hasReclassifications = suggestion.typeReclassifications && suggestion.typeReclassifications.length > 0;
  const hasHubSpokeFills = suggestion.hubSpokeGapFills && suggestion.hubSpokeGapFills.length > 0;

  const totalAdditions = suggestion.newTopics.length +
    (suggestion.hubSpokeGapFills?.reduce((sum, h) => sum + h.newSpokes.length, 0) || 0);
  const totalDeletions = suggestion.topicTitlesToDelete.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Review Proposed Changes</h2>
            <p className="text-sm text-gray-400 mt-1">Please review before applying</p>
          </div>
          <button onClick={onClose} disabled={isApplying} className="text-gray-400 text-2xl leading-none hover:text-white disabled:opacity-50">&times;</button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Warning Banner */}
          {hasDeletions && (
            <div className="p-4 bg-red-900/30 border border-red-600 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-semibold text-red-300">Warning: Topics Will Be Permanently Deleted</p>
                  <p className="text-sm text-red-400/80 mt-1">
                    {totalDeletions} topic{totalDeletions > 1 ? 's' : ''} will be removed. This action cannot be undone.
                    Any briefs associated with these topics will also be deleted.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border ${totalAdditions > 0 ? 'bg-green-900/20 border-green-600' : 'bg-gray-800/50 border-gray-700'}`}>
              <div className="text-2xl font-bold text-green-400">{totalAdditions}</div>
              <div className="text-sm text-gray-400">Topics to Add</div>
            </div>
            <div className={`p-4 rounded-lg border ${totalDeletions > 0 ? 'bg-red-900/20 border-red-600' : 'bg-gray-800/50 border-gray-700'}`}>
              <div className="text-2xl font-bold text-red-400">{totalDeletions}</div>
              <div className="text-sm text-gray-400">Topics to Remove</div>
            </div>
            <div className={`p-4 rounded-lg border ${hasReclassifications ? 'bg-yellow-900/20 border-yellow-600' : 'bg-gray-800/50 border-gray-700'}`}>
              <div className="text-2xl font-bold text-yellow-400">{suggestion.typeReclassifications?.length || 0}</div>
              <div className="text-sm text-gray-400">To Reclassify</div>
            </div>
          </div>

          {/* Topics to be REMOVED */}
          {hasDeletions && (
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Topics to be Removed ({totalDeletions})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {suggestion.topicTitlesToDelete.map((title, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-red-900/20 border border-red-800/50 rounded">
                    <span className="text-red-400">✕</span>
                    <span className="text-gray-300">{title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Topics to be ADDED */}
          {hasAdditions && (
            <div>
              <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Topics to be Added ({suggestion.newTopics.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {suggestion.newTopics.map((topic, index) => (
                  <div key={index} className="p-3 bg-green-900/20 border border-green-800/50 rounded">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{topic.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${topic.type === 'core' ? 'bg-green-500/20 text-green-300' : 'bg-purple-500/20 text-purple-300'}`}>
                        {topic.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{topic.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hub-Spoke Gap Fills */}
          {hasHubSpokeFills && (
            <div>
              <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                </svg>
                Hub-Spoke Gap Fills
              </h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {suggestion.hubSpokeGapFills!.map((fill, index) => (
                  <div key={index} className="p-3 bg-blue-900/20 border border-blue-800/50 rounded">
                    <div className="font-medium text-white mb-2">Hub: {fill.hubTitle}</div>
                    <div className="pl-4 space-y-1">
                      {fill.newSpokes.map((spoke, idx) => (
                        <div key={idx} className="text-sm text-gray-300">+ {spoke.title}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Type Reclassifications */}
          {hasReclassifications && (
            <div>
              <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Type Reclassifications
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {suggestion.typeReclassifications!.map((reclass, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-yellow-900/20 border border-yellow-800/50 rounded">
                    <span className="text-gray-300">{reclass.topicTitle}</span>
                    <span className="text-gray-500">→</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${reclass.newType === 'core' ? 'bg-green-500/20 text-green-300' : 'bg-purple-500/20 text-purple-300'}`}>
                      {reclass.newType}
                    </span>
                    {reclass.newParentTitle && (
                      <span className="text-xs text-gray-500">under "{reclass.newParentTitle}"</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acknowledgment Checkbox (required for deletions) */}
          {hasDeletions && (
            <div className="pt-4 border-t border-gray-700">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-1 w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                />
                <span className="text-sm text-gray-300">
                  I understand that {totalDeletions} topic{totalDeletions > 1 ? 's' : ''} will be permanently deleted and this action cannot be undone.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center gap-4">
          <Button onClick={onClose} variant="secondary" disabled={isApplying}>
            Cancel
          </Button>
          <div className="flex gap-3">
            <Button
              onClick={onConfirm}
              disabled={isApplying || (hasDeletions && !acknowledged)}
              className={hasDeletions ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
            >
              {isApplying ? (
                <>
                  <Loader className="w-4 h-4 mr-2" />
                  Applying Changes...
                </>
              ) : (
                `Apply ${hasDeletions ? 'Destructive ' : ''}Changes`
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ImprovementConfirmationModal;
