/**
 * ScoreChangeIndicator
 *
 * Shows score changes with:
 * - +/- delta display
 * - Color-coded (green/red)
 * - Animation on change
 * - Optional message
 */

import React, { useState, useEffect } from 'react';

interface ScoreChangeIndicatorProps {
  delta: number;
  message?: string;
  showZero?: boolean;
  animate?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CONFIG = {
  sm: { text: 'text-xs', padding: 'px-1.5 py-0.5' },
  md: { text: 'text-sm', padding: 'px-2 py-1' },
  lg: { text: 'text-base', padding: 'px-3 py-1.5' }
};

export const ScoreChangeIndicator: React.FC<ScoreChangeIndicatorProps> = ({
  delta,
  message,
  showZero = false,
  animate = true,
  size = 'md',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const config = SIZE_CONFIG[size];

  useEffect(() => {
    if (delta !== 0 || showZero) {
      setIsVisible(true);
    }
  }, [delta, showZero]);

  if (!isVisible && !showZero) return null;
  if (delta === 0 && !showZero) return null;

  const isPositive = delta > 0;
  const isNegative = delta < 0;

  const getColor = () => {
    if (isPositive) return 'text-green-400 bg-green-400/10 border-green-400/30';
    if (isNegative) return 'text-red-400 bg-red-400/10 border-red-400/30';
    return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
  };

  const getIcon = () => {
    if (isPositive) return '↑';
    if (isNegative) return '↓';
    return '→';
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${config.padding} ${config.text} ${getColor()}
        ${animate ? 'animate-bounce-in' : ''}
        ${className}
      `}
    >
      <span>{getIcon()}</span>
      <span>
        {isPositive ? '+' : ''}{delta}
      </span>
      {message && (
        <span className="opacity-70 ml-1">{message}</span>
      )}
    </div>
  );
};

/**
 * ScoreChangeToast - Floating toast notification for score changes
 */
interface ScoreChangeToastProps {
  delta: number;
  message: string;
  tierChanged?: boolean;
  newTier?: string;
  onDismiss?: () => void;
  duration?: number;
}

export const ScoreChangeToast: React.FC<ScoreChangeToastProps> = ({
  delta,
  message,
  tierChanged = false,
  newTier,
  onDismiss,
  duration = 4000
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 300);

    const dismissTimer = setTimeout(() => {
      onDismiss?.();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [duration, onDismiss]);

  const isPositive = delta > 0;

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50
        bg-gray-800 border rounded-lg shadow-lg p-4 max-w-sm
        transform transition-all duration-300
        ${isExiting ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}
        ${isPositive ? 'border-green-500/50' : 'border-red-500/50'}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Score change indicator */}
        <div
          className={`
            flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
            ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
          `}
        >
          <span className="text-lg font-bold">
            {isPositive ? '+' : ''}{delta}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium">{message}</p>
          {tierChanged && newTier && (
            <p className="text-xs text-amber-400 mt-1">
              New tier: {newTier}!
            </p>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(() => onDismiss?.(), 300);
          }}
          className="text-gray-500 hover:text-gray-300"
        >
          ×
        </button>
      </div>
    </div>
  );
};

/**
 * ScoreHistory - Mini sparkline of recent scores
 */
interface ScoreHistoryProps {
  scores: number[];
  maxPoints?: number;
  height?: number;
  className?: string;
}

export const ScoreHistory: React.FC<ScoreHistoryProps> = ({
  scores,
  maxPoints = 10,
  height = 40,
  className = ''
}) => {
  const displayScores = scores.slice(0, maxPoints).reverse();

  if (displayScores.length < 2) {
    return (
      <div className={`flex items-center justify-center h-${height} ${className}`}>
        <span className="text-xs text-gray-500">Not enough data</span>
      </div>
    );
  }

  const min = Math.min(...displayScores);
  const max = Math.max(...displayScores);
  const range = max - min || 1;

  const width = 120;
  const pointSpacing = width / (displayScores.length - 1);

  const points = displayScores.map((score, i) => ({
    x: i * pointSpacing,
    y: height - ((score - min) / range) * (height - 10) - 5
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Determine trend
  const trend = displayScores[displayScores.length - 1] - displayScores[0];
  const trendColor = trend > 0 ? '#10B981' : trend < 0 ? '#EF4444' : '#6B7280';

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <svg width={width} height={height}>
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={trendColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* End point */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="3"
          fill={trendColor}
        />
      </svg>

      {/* Current score label */}
      <div
        className="absolute text-[10px] font-bold"
        style={{
          right: 0,
          top: points[points.length - 1].y - 12,
          color: trendColor
        }}
      >
        {displayScores[displayScores.length - 1]}
      </div>
    </div>
  );
};

export default ScoreChangeIndicator;
