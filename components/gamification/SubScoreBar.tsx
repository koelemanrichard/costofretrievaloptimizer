/**
 * SubScoreBar
 *
 * Detailed progress bar for individual sub-scores with:
 * - Animated fill
 * - Label and value
 * - Improvement suggestions on hover
 * - Weight indicator
 */

import React, { useState } from 'react';
import { SubScore } from '../../utils/gamification';

interface SubScoreBarProps {
  name: string;
  subScore: SubScore;
  color: string;
  showDetails?: boolean;
  animate?: boolean;
  className?: string;
}

export const SubScoreBar: React.FC<SubScoreBarProps> = ({
  name,
  subScore,
  color,
  showDetails = false,
  animate = true,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10B981'; // green
    if (score >= 60) return '#F59E0B'; // amber
    if (score >= 40) return '#EF4444'; // red
    return '#6B7280'; // gray
  };

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div
        className={`flex justify-between items-center mb-1.5 ${
          showDetails ? 'cursor-pointer' : ''
        }`}
        onClick={() => showDetails && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">{name}</span>
          <span className="text-[10px] text-gray-500">
            ({Math.round(subScore.weight * 100)}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color: getScoreColor(subScore.score) }}
          >
            {subScore.score}
          </span>
          <span className="text-xs text-gray-500">{subScore.label}</span>
          {showDetails && (
            <span className="text-gray-500 text-xs">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${subScore.score}%`,
            backgroundColor: color,
            transition: animate ? 'width 0.8s ease-out' : 'none'
          }}
        />
      </div>

      {/* Expanded Details */}
      {showDetails && isExpanded && (
        <div className="mt-3 pl-2 border-l-2 border-gray-700 space-y-2">
          {/* What's contributing */}
          {subScore.details.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Contributing factors:</p>
              <ul className="space-y-1">
                {subScore.details.map((detail, i) => (
                  <li key={i} className="text-xs text-green-400 flex items-start gap-1.5">
                    <span className="mt-0.5">✓</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements needed */}
          {subScore.improvements.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">To improve:</p>
              <ul className="space-y-1">
                {subScore.improvements.map((improvement, i) => (
                  <li key={i} className="text-xs text-amber-400 flex items-start gap-1.5">
                    <span className="mt-0.5">→</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * SubScoreGrid - Shows all sub-scores in a grid layout
 */
interface SubScoreGridProps {
  breakdown: {
    entityClarity: SubScore;
    topicalCoverage: SubScore;
    intentAlignment: SubScore;
    competitiveParity: SubScore;
    contentReadiness: SubScore;
  };
  showDetails?: boolean;
  className?: string;
}

const SUB_SCORE_CONFIG = {
  entityClarity: { name: 'Entity Clarity', color: '#8B5CF6', icon: '🎯' },
  topicalCoverage: { name: 'Topical Coverage', color: '#3B82F6', icon: '🗺️' },
  intentAlignment: { name: 'Intent Alignment', color: '#10B981', icon: '🎪' },
  competitiveParity: { name: 'Competitive Parity', color: '#F59E0B', icon: '⚔️' },
  contentReadiness: { name: 'Content Readiness', color: '#EF4444', icon: '📝' }
};

export const SubScoreGrid: React.FC<SubScoreGridProps> = ({
  breakdown,
  showDetails = true,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {(Object.entries(SUB_SCORE_CONFIG) as [keyof typeof SUB_SCORE_CONFIG, typeof SUB_SCORE_CONFIG.entityClarity][]).map(
        ([key, config]) => (
          <SubScoreBar
            key={key}
            name={`${config.icon} ${config.name}`}
            subScore={breakdown[key]}
            color={config.color}
            showDetails={showDetails}
          />
        )
      )}
    </div>
  );
};

/**
 * SubScoreRadar - Radar/spider chart visualization (simplified)
 */
interface SubScoreRadarProps {
  breakdown: {
    entityClarity: SubScore;
    topicalCoverage: SubScore;
    intentAlignment: SubScore;
    competitiveParity: SubScore;
    contentReadiness: SubScore;
  };
  size?: number;
  className?: string;
}

export const SubScoreRadar: React.FC<SubScoreRadarProps> = ({
  breakdown,
  size = 200,
  className = ''
}) => {
  const scores = [
    breakdown.entityClarity.score,
    breakdown.topicalCoverage.score,
    breakdown.intentAlignment.score,
    breakdown.competitiveParity.score,
    breakdown.contentReadiness.score
  ];

  const labels = ['Entity', 'Coverage', 'Intent', 'Competitive', 'Content'];
  const center = size / 2;
  const maxRadius = (size - 40) / 2;

  // Calculate points for the score polygon
  const getPoint = (score: number, index: number): { x: number; y: number } => {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
    const radius = (score / 100) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle)
    };
  };

  const points = scores.map((score, i) => getPoint(score, i));
  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // Background grid circles
  const gridCircles = [20, 40, 60, 80, 100].map(level => {
    const radius = (level / 100) * maxRadius;
    return { level, radius };
  });

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Grid circles */}
        {gridCircles.map(({ level, radius }) => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#374151"
            strokeWidth="1"
            opacity={0.5}
          />
        ))}

        {/* Axis lines */}
        {scores.map((_, i) => {
          const point = getPoint(100, i);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke="#374151"
              strokeWidth="1"
              opacity={0.5}
            />
          );
        })}

        {/* Score polygon */}
        <polygon
          points={polygonPoints}
          fill="rgba(139, 92, 246, 0.3)"
          stroke="#8B5CF6"
          strokeWidth="2"
        />

        {/* Score points */}
        {points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#8B5CF6"
          />
        ))}
      </svg>

      {/* Labels */}
      {labels.map((label, i) => {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const labelRadius = maxRadius + 20;
        const x = center + labelRadius * Math.cos(angle);
        const y = center + labelRadius * Math.sin(angle);

        return (
          <div
            key={i}
            className="absolute text-[10px] text-gray-400 whitespace-nowrap"
            style={{
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
};

export default SubScoreBar;
