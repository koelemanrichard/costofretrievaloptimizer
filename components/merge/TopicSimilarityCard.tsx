import React, { useState } from 'react';
import { TopicSimilarityResult, TopicMergeDecision } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface TopicSimilarityCardProps {
  similarity: TopicSimilarityResult;
  decision: TopicMergeDecision;
  mapAName: string;
  mapBName: string;
  onDecisionChange: (decision: TopicMergeDecision) => void;
}

const TopicSimilarityCard: React.FC<TopicSimilarityCardProps> = ({
  similarity,
  decision,
  mapAName,
  mapBName,
  onDecisionChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editedTitle, setEditedTitle] = useState(decision.finalTitle);

  const handleDecisionClick = (newDecision: TopicMergeDecision['userDecision']) => {
    let title = decision.finalTitle;
    if (newDecision === 'merge' && similarity.aiSuggestedTitle) {
      title = similarity.aiSuggestedTitle;
    } else if (newDecision === 'keep_a') {
      title = similarity.topicA.title;
    } else if (newDecision === 'keep_b') {
      title = similarity.topicB.title;
    }

    onDecisionChange({
      ...decision,
      userDecision: newDecision,
      finalTitle: title,
    });
  };

  const handleTitleChange = (newTitle: string) => {
    setEditedTitle(newTitle);
    onDecisionChange({
      ...decision,
      finalTitle: newTitle,
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getMatchTypeLabel = (type: string) => {
    switch (type) {
      case 'exact': return 'Exact Match';
      case 'semantic': return 'Semantic Match';
      case 'parent_child': return 'Parent-Child';
      default: return type;
    }
  };

  return (
    <Card className={`p-4 ${decision.userDecision === 'delete' ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold ${getScoreColor(similarity.similarityScore)}`}>
            {similarity.similarityScore}%
          </span>
          <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">
            {getMatchTypeLabel(similarity.matchType)}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white"
        >
          {isExpanded ? '\u25B2' : '\u25BC'}
        </button>
      </div>

      {/* Topic titles */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-gray-800 rounded">
          <p className="text-xs text-blue-400 mb-1">{mapAName}</p>
          <p className="text-white font-medium">{similarity.topicA.title}</p>
          {isExpanded && (
            <p className="text-sm text-gray-400 mt-2">{similarity.topicA.description}</p>
          )}
        </div>
        <div className="p-3 bg-gray-800 rounded">
          <p className="text-xs text-purple-400 mb-1">{mapBName}</p>
          <p className="text-white font-medium">{similarity.topicB.title}</p>
          {isExpanded && (
            <p className="text-sm text-gray-400 mt-2">{similarity.topicB.description}</p>
          )}
        </div>
      </div>

      {/* AI Reasoning */}
      {isExpanded && similarity.reasoning && (
        <div className="p-3 bg-gray-800/50 rounded mb-4">
          <p className="text-xs text-green-400 mb-1">AI Analysis</p>
          <p className="text-sm text-gray-300">{similarity.reasoning}</p>
          {similarity.aiSuggestedTitle && (
            <p className="text-sm text-white mt-2">
              Suggested title: <span className="font-medium">{similarity.aiSuggestedTitle}</span>
            </p>
          )}
        </div>
      )}

      {/* Decision buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Button
          size="sm"
          variant={decision.userDecision === 'merge' ? 'primary' : 'secondary'}
          onClick={() => handleDecisionClick('merge')}
        >
          &check; Merge
        </Button>
        <Button
          size="sm"
          variant={decision.userDecision === 'keep_both' ? 'primary' : 'secondary'}
          onClick={() => handleDecisionClick('keep_both')}
        >
          Keep Both
        </Button>
        <Button
          size="sm"
          variant={decision.userDecision === 'keep_a' ? 'primary' : 'secondary'}
          onClick={() => handleDecisionClick('keep_a')}
        >
          Keep A Only
        </Button>
        <Button
          size="sm"
          variant={decision.userDecision === 'keep_b' ? 'primary' : 'secondary'}
          onClick={() => handleDecisionClick('keep_b')}
        >
          Keep B Only
        </Button>
        <Button
          size="sm"
          variant={decision.userDecision === 'delete' ? 'primary' : 'secondary'}
          className="!bg-red-900/50 hover:!bg-red-800/50"
          onClick={() => handleDecisionClick('delete')}
        >
          Delete Both
        </Button>
      </div>

      {/* Editable title for merge */}
      {decision.userDecision === 'merge' && (
        <div>
          <label className="text-xs text-gray-400">Merged Title:</label>
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
          />
        </div>
      )}
    </Card>
  );
};

export default TopicSimilarityCard;
