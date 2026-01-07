/**
 * Celebrations - Visual Feedback for Achievements
 *
 * Triggers visual celebrations for:
 * - Score increases
 * - Tier upgrades
 * - Perfect scores
 * - Achievements/milestones
 *
 * Uses confetti-js patterns that are lightweight and satisfying.
 */

import type { ScoreTier, TierConfig } from './scoreCalculations';
import { SCORE_TIERS } from './scoreCalculations';

// ============================================================================
// TYPES
// ============================================================================

export interface CelebrationConfig {
  type: 'confetti' | 'pulse' | 'glow' | 'shake' | 'none';
  duration: number; // ms
  intensity: 'subtle' | 'medium' | 'intense';
  color?: string;
  message?: string;
}

export interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
}

// ============================================================================
// CELEBRATION CONFIGS
// ============================================================================

const CELEBRATION_CONFIGS: Record<string, CelebrationConfig> = {
  scoreIncrease: {
    type: 'pulse',
    duration: 800,
    intensity: 'subtle'
  },
  tierUp: {
    type: 'confetti',
    duration: 2500,
    intensity: 'medium'
  },
  perfectScore: {
    type: 'confetti',
    duration: 4000,
    intensity: 'intense'
  },
  achievement: {
    type: 'glow',
    duration: 1500,
    intensity: 'medium'
  },
  firstMap: {
    type: 'confetti',
    duration: 3000,
    intensity: 'medium'
  }
};

// Brand colors for confetti
const CONFETTI_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
];

// ============================================================================
// CELEBRATION FUNCTIONS
// ============================================================================

/**
 * State for tracking active celebrations
 */
let activeCelebration: CelebrationConfig | null = null;
let celebrationCallback: ((config: CelebrationConfig | null) => void) | null = null;

/**
 * Register a callback to receive celebration events
 * Used by UI components to display celebrations
 */
export function onCelebration(callback: (config: CelebrationConfig | null) => void): () => void {
  celebrationCallback = callback;
  return () => {
    celebrationCallback = null;
  };
}

/**
 * Trigger a celebration
 */
function triggerCelebration(config: CelebrationConfig): void {
  activeCelebration = config;

  if (celebrationCallback) {
    celebrationCallback(config);
  }

  // Auto-clear after duration
  setTimeout(() => {
    if (activeCelebration === config) {
      activeCelebration = null;
      if (celebrationCallback) {
        celebrationCallback(null);
      }
    }
  }, config.duration);
}

/**
 * Celebrate a score increase
 */
export function celebrateScoreIncrease(delta: number, newScore: number): void {
  // Scale intensity based on delta
  const config: CelebrationConfig = {
    ...CELEBRATION_CONFIGS.scoreIncrease,
    intensity: delta >= 15 ? 'intense' : delta >= 5 ? 'medium' : 'subtle',
    message: `+${delta} points`
  };

  triggerCelebration(config);
}

/**
 * Celebrate a tier upgrade
 */
export function celebrateTierUp(newTier: ScoreTier): void {
  const tierConfig = SCORE_TIERS[newTier];
  const config: CelebrationConfig = {
    ...CELEBRATION_CONFIGS.tierUp,
    color: tierConfig.color,
    message: `Level up: ${tierConfig.label}!`
  };

  triggerCelebration(config);
}

/**
 * Celebrate a perfect score (100)
 */
export function celebratePerfectScore(): void {
  const config: CelebrationConfig = {
    ...CELEBRATION_CONFIGS.perfectScore,
    message: 'Perfect Score!'
  };

  triggerCelebration(config);
}

/**
 * Celebrate an achievement
 */
export function celebrateAchievement(achievementName: string): void {
  const config: CelebrationConfig = {
    ...CELEBRATION_CONFIGS.achievement,
    message: achievementName
  };

  triggerCelebration(config);
}

/**
 * Celebrate first map creation
 */
export function celebrateFirstMap(topicCount: number): void {
  const config: CelebrationConfig = {
    ...CELEBRATION_CONFIGS.firstMap,
    message: `${topicCount} topics generated!`
  };

  triggerCelebration(config);
}

// ============================================================================
// CONFETTI CANVAS RENDERER
// ============================================================================

/**
 * Simple confetti animation using canvas
 * Call this with a canvas element to render confetti
 */
export function renderConfetti(
  canvas: HTMLCanvasElement,
  intensity: 'subtle' | 'medium' | 'intense' = 'medium'
): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const particleCount = intensity === 'intense' ? 150 : intensity === 'medium' ? 80 : 40;
  const particles: ConfettiParticle[] = [];

  // Initialize particles
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10
    });
  }

  let animationId: number;
  let isRunning = true;

  function animate() {
    if (!isRunning || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeParticles = 0;

    particles.forEach(p => {
      // Update
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // gravity
      p.rotation += p.rotationSpeed;

      // Skip if off screen
      if (p.y > canvas.height + 20) return;

      activeParticles++;

      // Draw
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });

    // Stop if all particles are off screen
    if (activeParticles > 0) {
      animationId = requestAnimationFrame(animate);
    }
  }

  animate();

  // Return cleanup function
  return () => {
    isRunning = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  };
}

// ============================================================================
// CSS CLASS HELPERS
// ============================================================================

/**
 * Get CSS classes for celebration animations
 */
export function getCelebrationClasses(config: CelebrationConfig | null): string {
  if (!config) return '';

  const classes: string[] = [];

  switch (config.type) {
    case 'pulse':
      classes.push('animate-pulse');
      break;
    case 'glow':
      classes.push('animate-glow');
      break;
    case 'shake':
      classes.push('animate-shake');
      break;
  }

  switch (config.intensity) {
    case 'intense':
      classes.push('celebration-intense');
      break;
    case 'medium':
      classes.push('celebration-medium');
      break;
    case 'subtle':
      classes.push('celebration-subtle');
      break;
  }

  return classes.join(' ');
}

/**
 * CSS styles to inject for celebration animations
 * Add this to your global styles or inject dynamically
 */
export const CELEBRATION_STYLES = `
@keyframes celebration-glow {
  0%, 100% {
    box-shadow: 0 0 5px currentColor;
  }
  50% {
    box-shadow: 0 0 20px currentColor, 0 0 40px currentColor;
  }
}

@keyframes celebration-shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}

.animate-glow {
  animation: celebration-glow 0.5s ease-in-out 3;
}

.animate-shake {
  animation: celebration-shake 0.5s ease-in-out;
}

.celebration-intense {
  animation-duration: 0.3s;
}

.celebration-medium {
  animation-duration: 0.5s;
}

.celebration-subtle {
  animation-duration: 0.8s;
}
`;
