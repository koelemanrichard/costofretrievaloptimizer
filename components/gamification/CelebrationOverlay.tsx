/**
 * CelebrationOverlay
 *
 * Full-screen celebration effects:
 * - Confetti burst
 * - Tier-up celebration
 * - Achievement unlock
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  CelebrationConfig,
  onCelebration,
  renderConfetti,
  SCORE_TIERS,
  ScoreTier
} from '../../utils/gamification';

interface CelebrationOverlayProps {
  className?: string;
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  className = ''
}) => {
  const [celebration, setCelebration] = useState<CelebrationConfig | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Subscribe to celebration events
  useEffect(() => {
    const unsubscribe = onCelebration((config) => {
      setCelebration(config);
    });

    return () => {
      unsubscribe();
      cleanupRef.current?.();
    };
  }, []);

  // Handle confetti rendering
  useEffect(() => {
    if (celebration?.type === 'confetti' && canvasRef.current) {
      cleanupRef.current = renderConfetti(
        canvasRef.current,
        celebration.intensity
      );
    }

    return () => {
      cleanupRef.current?.();
    };
  }, [celebration]);

  if (!celebration) return null;

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-50 ${className}`}
    >
      {/* Confetti canvas */}
      {celebration.type === 'confetti' && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          width={window.innerWidth}
          height={window.innerHeight}
        />
      )}

      {/* Center message */}
      {celebration.message && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`
              text-white text-2xl font-bold
              px-6 py-3 rounded-xl
              bg-gray-900/80 backdrop-blur-sm
              border border-gray-700
              animate-bounce-in
            `}
            style={{
              boxShadow: celebration.color
                ? `0 0 30px ${celebration.color}40`
                : undefined
            }}
          >
            {celebration.message}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * TierUpCelebration - Dedicated tier upgrade celebration
 */
interface TierUpCelebrationProps {
  newTier: ScoreTier;
  onComplete?: () => void;
  duration?: number;
}

export const TierUpCelebration: React.FC<TierUpCelebrationProps> = ({
  newTier,
  onComplete,
  duration = 3000
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tierConfig = SCORE_TIERS[newTier];

  useEffect(() => {
    // Render confetti
    if (canvasRef.current) {
      const cleanup = renderConfetti(canvasRef.current, 'intense');

      // Auto-dismiss
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => {
        cleanup();
        clearTimeout(timer);
      };
    }
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Confetti */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        width={window.innerWidth}
        height={window.innerHeight}
      />

      {/* Content */}
      <div className="relative z-10 text-center animate-scale-in">
        {/* Big emoji */}
        <div
          className="text-8xl mb-4 animate-bounce"
          style={{ filter: `drop-shadow(0 0 20px ${tierConfig.color})` }}
        >
          {tierConfig.emoji}
        </div>

        {/* Title */}
        <h2
          className="text-4xl font-bold mb-2"
          style={{ color: tierConfig.color }}
        >
          LEVEL UP!
        </h2>

        {/* Tier name */}
        <p className="text-2xl text-white font-semibold mb-4">
          {tierConfig.label}
        </p>

        {/* Message */}
        <p className="text-gray-300 max-w-md mx-auto">
          {tierConfig.message}
        </p>
      </div>
    </div>
  );
};

/**
 * AchievementUnlock - Achievement popup
 */
interface AchievementUnlockProps {
  title: string;
  description: string;
  emoji?: string;
  onDismiss?: () => void;
  duration?: number;
}

export const AchievementUnlock: React.FC<AchievementUnlockProps> = ({
  title,
  description,
  emoji = '🏆',
  onDismiss,
  duration = 5000
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 500);

    const dismissTimer = setTimeout(() => {
      onDismiss?.();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [duration, onDismiss]);

  return (
    <div
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50
        transform transition-all duration-500
        ${isExiting ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}
      `}
    >
      <div className="bg-gradient-to-r from-amber-900/90 to-amber-800/90 backdrop-blur-sm border border-amber-500/50 rounded-lg shadow-lg p-4 flex items-center gap-4">
        {/* Icon */}
        <div className="text-4xl animate-bounce">{emoji}</div>

        {/* Content */}
        <div>
          <p className="text-amber-300 text-xs font-medium uppercase tracking-wide">
            Achievement Unlocked
          </p>
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <p className="text-amber-100/80 text-sm">{description}</p>
        </div>

        {/* Close button */}
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(() => onDismiss?.(), 500);
          }}
          className="text-amber-400 hover:text-white ml-2"
        >
          ×
        </button>
      </div>
    </div>
  );
};

/**
 * MilestoneReached - Milestone celebration banner
 */
interface MilestoneReachedProps {
  milestone: string;
  value: string | number;
  icon?: string;
  color?: string;
  onDismiss?: () => void;
}

export const MilestoneReached: React.FC<MilestoneReachedProps> = ({
  milestone,
  value,
  icon = '🎯',
  color = '#8B5CF6',
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-full border shadow-lg"
        style={{
          backgroundColor: `${color}20`,
          borderColor: `${color}50`
        }}
      >
        <span className="text-2xl">{icon}</span>
        <div>
          <span className="text-white font-medium">{milestone}</span>
          <span
            className="ml-2 font-bold"
            style={{ color }}
          >
            {value}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CelebrationOverlay;
