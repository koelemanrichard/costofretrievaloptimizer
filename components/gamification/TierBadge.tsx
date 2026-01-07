/**
 * TierBadge
 *
 * Compact tier indicator with:
 * - Emoji + label
 * - Color-coded background
 * - Optional score display
 * - Pulse animation on tier change
 */

import React from 'react';
import { ScoreTier, TierConfig, SCORE_TIERS } from '../../utils/gamification';

interface TierBadgeProps {
  tier: ScoreTier;
  score?: number;
  showScore?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outline' | 'minimal';
  pulse?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  xs: { padding: 'px-1.5 py-0.5', text: 'text-[10px]', emoji: 'text-xs' },
  sm: { padding: 'px-2 py-1', text: 'text-xs', emoji: 'text-sm' },
  md: { padding: 'px-3 py-1.5', text: 'text-sm', emoji: 'text-base' },
  lg: { padding: 'px-4 py-2', text: 'text-base', emoji: 'text-lg' }
};

export const TierBadge: React.FC<TierBadgeProps> = ({
  tier,
  score,
  showScore = false,
  size = 'sm',
  variant = 'filled',
  pulse = false,
  className = ''
}) => {
  const tierConfig = SCORE_TIERS[tier];
  const sizeConfig = SIZE_CONFIG[size];

  const getVariantStyles = (): string => {
    switch (variant) {
      case 'filled':
        return `bg-opacity-20 border border-opacity-40`;
      case 'outline':
        return `bg-transparent border-2`;
      case 'minimal':
        return `bg-transparent`;
      default:
        return '';
    }
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${sizeConfig.padding}
        ${getVariantStyles()}
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
      style={{
        backgroundColor: variant === 'filled' ? `${tierConfig.color}20` : undefined,
        borderColor: variant !== 'minimal' ? `${tierConfig.color}60` : undefined,
        color: tierConfig.color
      }}
    >
      <span className={sizeConfig.emoji}>{tierConfig.emoji}</span>
      <span className={sizeConfig.text}>{tierConfig.label}</span>
      {showScore && score !== undefined && (
        <span
          className={`${sizeConfig.text} opacity-70 ml-1`}
          style={{ color: tierConfig.color }}
        >
          ({score})
        </span>
      )}
    </div>
  );
};

/**
 * TierProgress - Shows progress to next tier
 */
interface TierProgressProps {
  currentScore: number;
  className?: string;
}

export const TierProgress: React.FC<TierProgressProps> = ({
  currentScore,
  className = ''
}) => {
  // Find current and next tier
  const tiers = Object.entries(SCORE_TIERS) as [ScoreTier, TierConfig][];
  const currentTierEntry = tiers.find(
    ([, config]) => currentScore >= config.range[0] && currentScore <= config.range[1]
  );
  const currentTierIndex = currentTierEntry
    ? tiers.findIndex(([id]) => id === currentTierEntry[0])
    : 0;
  const nextTierEntry = tiers[currentTierIndex + 1];

  if (!currentTierEntry) return null;

  const [currentTierId, currentConfig] = currentTierEntry;
  const progressInTier = currentScore - currentConfig.range[0];
  const tierRange = currentConfig.range[1] - currentConfig.range[0];
  const progressPercent = (progressInTier / tierRange) * 100;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center text-xs">
        <TierBadge tier={currentTierId} size="xs" variant="minimal" />
        {nextTierEntry && (
          <span className="text-gray-500">
            {nextTierEntry[1].range[0] - currentScore} pts to{' '}
            <span style={{ color: nextTierEntry[1].color }}>
              {nextTierEntry[1].label}
            </span>
          </span>
        )}
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: currentConfig.color
          }}
        />
      </div>
    </div>
  );
};

/**
 * TierCompare - Shows two tiers side by side
 */
interface TierCompareProps {
  oldTier: ScoreTier;
  newTier: ScoreTier;
  className?: string;
}

export const TierCompare: React.FC<TierCompareProps> = ({
  oldTier,
  newTier,
  className = ''
}) => {
  const isUpgrade = Object.keys(SCORE_TIERS).indexOf(newTier) >
    Object.keys(SCORE_TIERS).indexOf(oldTier);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TierBadge tier={oldTier} size="sm" variant="outline" />
      <span className={isUpgrade ? 'text-green-400' : 'text-red-400'}>
        {isUpgrade ? '→' : '←'}
      </span>
      <TierBadge tier={newTier} size="sm" variant="filled" pulse={isUpgrade} />
    </div>
  );
};

export default TierBadge;
