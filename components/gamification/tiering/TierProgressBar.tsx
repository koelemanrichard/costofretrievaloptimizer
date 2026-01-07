/**
 * TierProgressBar
 *
 * Progress bar showing completion within a tier
 */

import React from 'react';

interface TierProgressBarProps {
  progress: number; // 0-100
  color: string;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CONFIG = {
  sm: { height: 'h-1.5', text: 'text-xs' },
  md: { height: 'h-2', text: 'text-sm' },
  lg: { height: 'h-3', text: 'text-base' }
};

export const TierProgressBar: React.FC<TierProgressBarProps> = ({
  progress,
  color,
  label,
  showPercentage = true,
  size = 'md',
  className = ''
}) => {
  const config = SIZE_CONFIG[size];
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className={`flex justify-between items-center mb-1 ${config.text}`}>
          {label && <span className="text-gray-400">{label}</span>}
          {showPercentage && (
            <span className="text-gray-300 font-medium">{clampedProgress}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-700 rounded-full overflow-hidden ${config.height}`}>
        <div
          className={`${config.height} rounded-full transition-all duration-500 ease-out`}
          style={{
            width: `${clampedProgress}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  );
};

/**
 * ImpactBar - Shows impact level with filled bars
 */
interface ImpactBarProps {
  level: number; // 1-5
  color: string;
  label?: string;
  className?: string;
}

export const ImpactBar: React.FC<ImpactBarProps> = ({
  level,
  color,
  label,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && <span className="text-xs text-gray-400">{label}</span>}
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={`w-4 h-2 rounded-sm transition-colors ${
              i <= level ? '' : 'opacity-20'
            }`}
            style={{ backgroundColor: i <= level ? color : '#374151' }}
          />
        ))}
      </div>
    </div>
  );
};

export default TierProgressBar;
