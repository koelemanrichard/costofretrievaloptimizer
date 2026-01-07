/**
 * SemanticScoreDisplay
 *
 * Main score visualization component with:
 * - Animated circular progress ring
 * - Tier badge with emoji
 * - Score breakdown on hover/click
 * - Animation on score changes
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  SemanticAuthorityScore,
  TierConfig,
  SCORE_TIERS
} from '../../utils/gamification';

interface SemanticScoreDisplayProps {
  score: SemanticAuthorityScore | null;
  size?: 'sm' | 'md' | 'lg';
  showBreakdown?: boolean;
  animate?: boolean;
  className?: string;
  onScoreClick?: () => void;
}

const SIZE_CONFIG = {
  sm: { ring: 64, stroke: 6, fontSize: 'text-lg', emojiSize: 'text-sm' },
  md: { ring: 96, stroke: 8, fontSize: 'text-2xl', emojiSize: 'text-lg' },
  lg: { ring: 140, stroke: 10, fontSize: 'text-4xl', emojiSize: 'text-2xl' }
};

export const SemanticScoreDisplay: React.FC<SemanticScoreDisplayProps> = ({
  score,
  size = 'md',
  showBreakdown = false,
  animate = true,
  className = '',
  onScoreClick
}) => {
  const [displayScore, setDisplayScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevScoreRef = useRef<number>(0);

  const config = SIZE_CONFIG[size];
  const tierConfig = score?.tierConfig || SCORE_TIERS['just-starting'];

  // Animate score counter
  useEffect(() => {
    if (!score || !animate) {
      setDisplayScore(score?.overall || 0);
      return;
    }

    const targetScore = score.overall;
    const startScore = prevScoreRef.current;
    const diff = targetScore - startScore;

    if (diff === 0) return;

    setIsAnimating(true);
    const duration = 1000; // 1 second
    const steps = 30;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentScore = Math.round(startScore + diff * eased);
      setDisplayScore(currentScore);

      if (currentStep >= steps) {
        clearInterval(timer);
        setDisplayScore(targetScore);
        setIsAnimating(false);
        prevScoreRef.current = targetScore;
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [score?.overall, animate]);

  // Calculate ring properties
  const radius = (config.ring - config.stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (displayScore / 100) * circumference;

  if (!score) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div
          className="rounded-full bg-gray-800/50 flex items-center justify-center"
          style={{ width: config.ring, height: config.ring }}
        >
          <span className="text-gray-500 text-sm">--</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center gap-2 ${className} ${onScoreClick ? 'cursor-pointer' : ''}`}
      onClick={onScoreClick}
    >
      {/* Score Ring */}
      <div
        className={`relative flex items-center justify-center ${isAnimating ? 'scale-105' : ''}`}
        style={{
          width: config.ring,
          height: config.ring,
          transition: 'transform 0.3s ease-out'
        }}
      >
        {/* Background glow on animation */}
        {isAnimating && (
          <div
            className="absolute inset-0 rounded-full opacity-30 blur-lg"
            style={{ backgroundColor: tierConfig.color }}
          />
        )}

        <svg
          className="transform -rotate-90"
          width={config.ring}
          height={config.ring}
        >
          {/* Background circle */}
          <circle
            className="text-gray-700"
            stroke="currentColor"
            strokeWidth={config.stroke}
            fill="transparent"
            r={radius}
            cx={config.ring / 2}
            cy={config.ring / 2}
          />
          {/* Progress circle */}
          <circle
            stroke={tierConfig.color}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            fill="transparent"
            r={radius}
            cx={config.ring / 2}
            cy={config.ring / 2}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              transition: animate ? 'stroke-dashoffset 1s ease-out' : 'none',
              filter: `drop-shadow(0 0 6px ${tierConfig.color}40)`
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`font-bold text-white ${config.fontSize}`}>
            {displayScore}
          </span>
          <span className={tierConfig.emoji ? config.emojiSize : 'hidden'}>
            {tierConfig.emoji}
          </span>
        </div>
      </div>

      {/* Tier Label */}
      <div className="text-center">
        <div
          className="font-semibold text-sm"
          style={{ color: tierConfig.color }}
        >
          {tierConfig.label}
        </div>
        {showBreakdown && (
          <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
            {tierConfig.message}
          </p>
        )}
      </div>

      {/* Score Breakdown (expandable) */}
      {showBreakdown && score.breakdown && (
        <div className="mt-3 w-full max-w-[240px] space-y-2">
          <SubScoreRow
            label="Entity Clarity"
            score={score.breakdown.entityClarity.score}
            weight={score.breakdown.entityClarity.weight}
            color="#8B5CF6"
          />
          <SubScoreRow
            label="Topical Coverage"
            score={score.breakdown.topicalCoverage.score}
            weight={score.breakdown.topicalCoverage.weight}
            color="#3B82F6"
          />
          <SubScoreRow
            label="Intent Alignment"
            score={score.breakdown.intentAlignment.score}
            weight={score.breakdown.intentAlignment.weight}
            color="#10B981"
          />
          <SubScoreRow
            label="Competitive Parity"
            score={score.breakdown.competitiveParity.score}
            weight={score.breakdown.competitiveParity.weight}
            color="#F59E0B"
          />
          <SubScoreRow
            label="Content Readiness"
            score={score.breakdown.contentReadiness.score}
            weight={score.breakdown.contentReadiness.weight}
            color="#EF4444"
          />
        </div>
      )}
    </div>
  );
};

// Sub-score row component
interface SubScoreRowProps {
  label: string;
  score: number;
  weight: number;
  color: string;
}

const SubScoreRow: React.FC<SubScoreRowProps> = ({ label, score, weight, color }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300">{score}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${score}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
    <span className="text-[10px] text-gray-500 w-8">
      {Math.round(weight * 100)}%
    </span>
  </div>
);

export default SemanticScoreDisplay;
