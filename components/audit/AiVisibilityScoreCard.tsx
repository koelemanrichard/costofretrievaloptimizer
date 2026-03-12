// components/audit/AiVisibilityScoreCard.tsx
import React from 'react';

interface AiVisibilityScoreCardProps {
  passageScore: number;
  chunkingScore: number;
  entityExplicitness: number;
  answerCapsuleCompliance: number;
}

export const AiVisibilityScoreCard: React.FC<AiVisibilityScoreCardProps> = ({
  passageScore,
  chunkingScore,
  entityExplicitness,
  answerCapsuleCompliance,
}) => {
  const overallScore = Math.round(
    passageScore * 0.30 +
    chunkingScore * 0.25 +
    entityExplicitness * 0.25 +
    answerCapsuleCompliance * 0.20
  );

  const getColor = (score: number) =>
    score >= 80 ? 'text-green-400' :
    score >= 50 ? 'text-yellow-400' :
    'text-red-400';

  const getBarColor = (score: number) =>
    score >= 80 ? 'bg-green-500' :
    score >= 50 ? 'bg-yellow-500' :
    'bg-red-500';

  const dimensions = [
    { label: 'Perfect Passage', score: passageScore, weight: '30%' },
    { label: 'Chunking Resistance', score: chunkingScore, weight: '25%' },
    { label: 'Entity Explicitness', score: entityExplicitness, weight: '25%' },
    { label: 'Answer Capsules', score: answerCapsuleCompliance, weight: '20%' },
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <span className="text-purple-400">⚡</span>
          AI Visibility Score
        </h3>
        <span className={`text-2xl font-bold ${getColor(overallScore)}`}>
          {overallScore}
        </span>
      </div>

      {overallScore < 50 && (
        <div className="text-xs text-red-400 mb-3 bg-red-900/20 rounded px-2 py-1">
          Content needs improvement for AI/LLM visibility
        </div>
      )}

      <div className="space-y-2">
        {dimensions.map(dim => (
          <div key={dim.label} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-8">{dim.weight}</span>
            <span className="text-xs text-gray-400 flex-1">{dim.label}</span>
            <div className="w-16 bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${getBarColor(dim.score)}`}
                style={{ width: `${dim.score}%` }}
              />
            </div>
            <span className={`text-xs font-mono w-6 text-right ${getColor(dim.score)}`}>
              {dim.score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
