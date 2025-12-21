// components/insights/actions/CreateBriefFromGapAction.tsx
// Modal for creating a content brief from a content gap

import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import type { ContentGap } from '../../../types/insights';
import type { EnrichedTopic } from '../../../types';

interface CreateBriefFromGapActionProps {
  gap: ContentGap;
  coreTopics: EnrichedTopic[];
  onConfirm: (options: CreateBriefOptions) => Promise<void>;
  onCancel: () => void;
}

interface CreateBriefOptions {
  topicType: 'core' | 'outer';
  parentTopicId: string | null;
  includeCompetitorAnalysis: boolean;
  targetWordCount: number;
  customTitle?: string;
}

export const CreateBriefFromGapAction: React.FC<CreateBriefFromGapActionProps> = ({
  gap,
  coreTopics,
  onConfirm,
  onCancel,
}) => {
  const [options, setOptions] = useState<CreateBriefOptions>({
    topicType: 'outer',
    parentTopicId: null,
    includeCompetitorAnalysis: true,
    targetWordCount: 1500,
    customTitle: gap.title,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      await onConfirm(options);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create brief');
    } finally {
      setLoading(false);
    }
  };

  const wordCountPresets = [1000, 1500, 2000, 3000];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Create Content Brief from Gap</h2>
          <p className="text-sm text-gray-400 mt-1">
            Turn this content gap into a new topic with a generated brief.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Gap Info */}
          <div className="p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-300 mb-2">Content Gap</h3>
            <p className="text-white font-medium">{gap.title}</p>
            <p className="text-sm text-gray-400 mt-1">{gap.description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>{gap.competitorCoverageCount} competitor{gap.competitorCoverageCount !== 1 ? 's' : ''} cover this</span>
              {gap.searchVolume && <span>Est. volume: {gap.searchVolume.toLocaleString()}/mo</span>}
              <span className={`px-2 py-0.5 rounded ${
                gap.difficulty === 'low' ? 'bg-green-500/20 text-green-400' :
                gap.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {gap.difficulty} difficulty
              </span>
            </div>
          </div>

          {/* Topic Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Topic Title
            </label>
            <input
              type="text"
              value={options.customTitle || ''}
              onChange={(e) => setOptions({ ...options, customTitle: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter topic title"
            />
          </div>

          {/* Topic Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Topic Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="topicType"
                  checked={options.topicType === 'core'}
                  onChange={() => setOptions({ ...options, topicType: 'core', parentTopicId: null })}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <span className="text-white">Core Topic</span>
                  <p className="text-xs text-gray-500">Main pillar content</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="topicType"
                  checked={options.topicType === 'outer'}
                  onChange={() => setOptions({ ...options, topicType: 'outer' })}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <span className="text-white">Outer Topic</span>
                  <p className="text-xs text-gray-500">Supporting cluster content</p>
                </div>
              </label>
            </div>
          </div>

          {/* Parent Topic (for outer topics) */}
          {options.topicType === 'outer' && coreTopics.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Parent Topic (optional)
              </label>
              <select
                value={options.parentTopicId || ''}
                onChange={(e) => setOptions({ ...options, parentTopicId: e.target.value || null })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">No parent (standalone)</option>
                {coreTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Target Word Count */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Target Word Count
            </label>
            <div className="flex items-center gap-2">
              {wordCountPresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setOptions({ ...options, targetWordCount: preset })}
                  className={`px-3 py-1 text-sm rounded ${
                    options.targetWordCount === preset
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {preset.toLocaleString()}
                </button>
              ))}
              <input
                type="number"
                value={options.targetWordCount}
                onChange={(e) => setOptions({ ...options, targetWordCount: parseInt(e.target.value) || 1500 })}
                className="w-24 px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                min={500}
                max={10000}
              />
              <span className="text-sm text-gray-500">words</span>
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeCompetitorAnalysis}
                onChange={(e) => setOptions({ ...options, includeCompetitorAnalysis: e.target.checked })}
                className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm text-white">Include competitor analysis in brief</span>
                <p className="text-xs text-gray-500">Add insights from competitor coverage to the brief</p>
              </div>
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex items-center justify-end gap-3">
          <Button onClick={onCancel} variant="secondary" disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="primary"
            disabled={!options.customTitle?.trim() || loading}
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2" />
                Creating...
              </>
            ) : (
              'Create Topic & Brief'
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};
