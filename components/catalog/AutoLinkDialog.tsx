/**
 * AutoLinkDialog - AI matching review dialog for category-to-topic linking
 *
 * Shows AI-suggested matches with confidence scores and lets users
 * accept, change, create new topics, or skip each match.
 */

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import type { EnrichedTopic } from '../../types';
import type { AutoLinkSuggestion, NewTopicSuggestion } from '../../types/catalog';

interface AutoLinkDialogProps {
  suggestions: AutoLinkSuggestion[];
  newTopicSuggestions: NewTopicSuggestion[];
  topics: EnrichedTopic[];
  onApply: (
    links: { categoryId: string; topicId: string }[],
    newTopics: { categoryId: string; title: string; type: 'core' | 'outer' | 'child'; topicClass: 'monetization' | 'informational'; parentTopicId?: string }[]
  ) => void;
  onClose: () => void;
}

const AutoLinkDialog: React.FC<AutoLinkDialogProps> = ({
  suggestions,
  newTopicSuggestions,
  topics,
  onApply,
  onClose,
}) => {
  const [decisions, setDecisions] = useState<Map<string, {
    action: 'accept' | 'change' | 'create' | 'skip';
    topicId?: string;
    newTitle?: string;
    newType?: 'core' | 'outer' | 'child';
    parentTopicId?: string;
  }>>(
    new Map(
      suggestions.map(s => [
        s.categoryId,
        {
          action: s.suggestedTopicId ? 'accept' : 'create',
          topicId: s.suggestedTopicId || undefined,
          newTitle: newTopicSuggestions.find(n => n.categoryId === s.categoryId)?.suggestedTitle,
          newType: newTopicSuggestions.find(n => n.categoryId === s.categoryId)?.suggestedType || 'core',
          parentTopicId: newTopicSuggestions.find(n => n.categoryId === s.categoryId)?.suggestedParentTopicId,
        },
      ])
    )
  );

  const updateDecision = (categoryId: string, updates: Partial<typeof decisions extends Map<string, infer V> ? V : never>) => {
    const current = decisions.get(categoryId) || { action: 'skip' as const };
    setDecisions(new Map(decisions).set(categoryId, { ...current, ...updates }));
  };

  const handleApply = () => {
    const links: { categoryId: string; topicId: string }[] = [];
    const newTopics: { categoryId: string; title: string; type: 'core' | 'outer' | 'child'; topicClass: 'monetization' | 'informational'; parentTopicId?: string }[] = [];

    for (const [categoryId, decision] of decisions) {
      if (decision.action === 'accept' && decision.topicId) {
        links.push({ categoryId, topicId: decision.topicId });
      } else if ((decision.action === 'change') && decision.topicId) {
        links.push({ categoryId, topicId: decision.topicId });
      } else if (decision.action === 'create' && decision.newTitle) {
        newTopics.push({
          categoryId,
          title: decision.newTitle,
          type: decision.newType || 'core',
          topicClass: 'monetization',
          parentTopicId: decision.parentTopicId,
        });
      }
    }

    onApply(links, newTopics);
  };

  const acceptCount = [...decisions.values()].filter(d => d.action === 'accept' || d.action === 'change').length;
  const createCount = [...decisions.values()].filter(d => d.action === 'create').length;
  const skipCount = [...decisions.values()].filter(d => d.action === 'skip').length;

  const confidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-[800px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-medium text-gray-200">Auto-Link Categories to Topics</h2>
            <p className="text-xs text-gray-400 mt-1">
              Review AI-suggested matches. Accept, change, or create new topics.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Category</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Suggested Topic</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 w-20">Conf.</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 w-48">Action</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map(suggestion => {
                const decision = decisions.get(suggestion.categoryId);
                const newTopicSugg = newTopicSuggestions.find(n => n.categoryId === suggestion.categoryId);

                return (
                  <tr key={suggestion.categoryId} className="border-b border-gray-800">
                    <td className="px-4 py-3 text-sm text-gray-200">
                      {suggestion.categoryName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {decision?.action === 'change' ? (
                        <select
                          value={decision.topicId || ''}
                          onChange={e => updateDecision(suggestion.categoryId, { topicId: e.target.value })}
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 w-full"
                        >
                          <option value="">Select topic...</option>
                          {topics.map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                          ))}
                        </select>
                      ) : decision?.action === 'create' ? (
                        <input
                          type="text"
                          value={decision.newTitle || ''}
                          onChange={e => updateDecision(suggestion.categoryId, { newTitle: e.target.value })}
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 w-full"
                          placeholder="New topic title..."
                        />
                      ) : (
                        suggestion.suggestedTopicTitle || <span className="text-gray-600 italic">No match</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {suggestion.confidence > 0 && (
                        <span className={`text-xs font-medium ${confidenceColor(suggestion.confidence)}`}>
                          {suggestion.confidence}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {suggestion.suggestedTopicId && (
                          <button
                            onClick={() => updateDecision(suggestion.categoryId, { action: 'accept', topicId: suggestion.suggestedTopicId! })}
                            className={`text-xs px-2 py-1 rounded ${
                              decision?.action === 'accept'
                                ? 'bg-green-900/40 text-green-300 border border-green-700'
                                : 'bg-gray-800 text-gray-400 hover:text-green-400'
                            }`}
                          >
                            Accept
                          </button>
                        )}
                        <button
                          onClick={() => updateDecision(suggestion.categoryId, { action: 'change', topicId: '' })}
                          className={`text-xs px-2 py-1 rounded ${
                            decision?.action === 'change'
                              ? 'bg-blue-900/40 text-blue-300 border border-blue-700'
                              : 'bg-gray-800 text-gray-400 hover:text-blue-400'
                          }`}
                        >
                          Change
                        </button>
                        <button
                          onClick={() => updateDecision(suggestion.categoryId, {
                            action: 'create',
                            newTitle: newTopicSugg?.suggestedTitle || suggestion.categoryName,
                            newType: newTopicSugg?.suggestedType || 'core',
                          })}
                          className={`text-xs px-2 py-1 rounded ${
                            decision?.action === 'create'
                              ? 'bg-purple-900/40 text-purple-300 border border-purple-700'
                              : 'bg-gray-800 text-gray-400 hover:text-purple-400'
                          }`}
                        >
                          Create
                        </button>
                        <button
                          onClick={() => updateDecision(suggestion.categoryId, { action: 'skip' })}
                          className={`text-xs px-2 py-1 rounded ${
                            decision?.action === 'skip'
                              ? 'bg-gray-700 text-gray-300'
                              : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          Skip
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
          <span className="text-xs text-gray-400">
            Link {acceptCount} | Create {createCount} new topics | Skip {skipCount}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleApply}>
              Apply ({acceptCount + createCount} changes)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoLinkDialog;
