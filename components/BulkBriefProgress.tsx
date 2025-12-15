/**
 * BulkBriefProgress
 *
 * Modal overlay shown during bulk brief generation.
 * Displays progress with current topic, count, and cancel button.
 */

import React from 'react';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';

interface BulkBriefProgressProps {
  isOpen: boolean;
  current: number;
  total: number;
  currentTopicTitle: string | null;
  onCancel: () => void;
}

const BulkBriefProgress: React.FC<BulkBriefProgressProps> = ({
  isOpen,
  current,
  total,
  currentTopicTitle,
  onCancel,
}) => {
  if (!isOpen || total === 0) return null;

  const progressPercent = Math.round((current / total) * 100);
  const remaining = total - current;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Loader className="w-5 h-5 text-blue-400" />
            Generating Briefs
          </h2>
          <span className="text-sm text-gray-400">
            {current} of {total}
          </span>
        </div>

        {/* Progress Content */}
        <div className="p-4 space-y-4">
          {/* Progress Bar */}
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Stats Row */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">
              {progressPercent}% complete
            </span>
            <span className="text-gray-400">
              {remaining} remaining
            </span>
          </div>

          {/* Current Topic */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Currently generating:
            </p>
            <p className="text-white font-medium truncate">
              {currentTopicTitle || 'Starting...'}
            </p>
          </div>

          {/* Info Text */}
          <p className="text-xs text-gray-500 text-center">
            Briefs are saved automatically as they complete.
            You can cancel and resume later.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700 bg-gray-800/30">
          <Button
            variant="secondary"
            onClick={onCancel}
            className="border-red-600/50 text-red-400 hover:bg-red-900/20"
          >
            Cancel Generation
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkBriefProgress;
