/**
 * Token Resolver Service
 *
 * Resolves design personalities into concrete CSS custom properties.
 * Converts the three-tier token system into production-ready CSS.
 *
 * @module services/publishing/tokenResolver
 */

import type { DesignPersonality, ColorPersonality, TypographyPersonality, LayoutPersonality, MotionPersonality } from '../../config/designTokens/personalities';
import { designPersonalities, getPersonalityById } from '../../config/designTokens/personalities';
import { colorPrimitives } from '../../config/designTokens/primitives';

// ============================================================================
// TYPES
// ============================================================================

export interface ResolvedTokens {
  // Color tokens
  '--ctc-primary': string;
  '--ctc-primary-light': string;
  '--ctc-primary-dark': string;
  '--ctc-secondary': string;
  '--ctc-accent': string;
  '--ctc-background': string;
  '--ctc-surface': string;
  '--ctc-surface-elevated': string;
  '--ctc-text': string;
  '--ctc-text-secondary': string;
  '--ctc-text-muted': string;
  '--ctc-text-inverse': string;
  '--ctc-border': string;
  '--ctc-border-subtle': string;
  '--ctc-success': string;
  '--ctc-warning': string;
  '--ctc-error': string;
  '--ctc-info': string;

  // Typography tokens
  '--ctc-font-display': string;
  '--ctc-font-body': string;
  '--ctc-font-mono': string;
  '--ctc-text-base': string;
  '--ctc-text-xs': string;
  '--ctc-text-sm': string;
  '--ctc-text-lg': string;
  '--ctc-text-xl': string;
  '--ctc-text-2xl': string;
  '--ctc-text-3xl': string;
  '--ctc-text-4xl': string;
  '--ctc-text-5xl': string;
  '--ctc-heading-weight': string;
  '--ctc-heading-case': string;
  '--ctc-heading-letter-spacing': string;
  '--ctc-line-height-body': string;
  '--ctc-paragraph-spacing': string;

  // Layout tokens
  '--ctc-radius-none': string;
  '--ctc-radius-sm': string;
  '--ctc-radius-md': string;
  '--ctc-radius-lg': string;
  '--ctc-radius-xl': string;
  '--ctc-radius-2xl': string;
  '--ctc-radius-full': string;
  '--ctc-shadow-none': string;
  '--ctc-shadow-sm': string;
  '--ctc-shadow-md': string;
  '--ctc-shadow-lg': string;
  '--ctc-shadow-xl': string;
  '--ctc-shadow-2xl': string;

  // Spacing tokens
  '--ctc-space-0': string;
  '--ctc-space-1': string;
  '--ctc-space-2': string;
  '--ctc-space-3': string;
  '--ctc-space-4': string;
  '--ctc-space-5': string;
  '--ctc-space-6': string;
  '--ctc-space-8': string;
  '--ctc-space-10': string;
  '--ctc-space-12': string;
  '--ctc-space-16': string;
  '--ctc-space-20': string;
  '--ctc-space-24': string;

  // Motion tokens
  '--ctc-duration-instant': string;
  '--ctc-duration-fast': string;
  '--ctc-duration-normal': string;
  '--ctc-duration-slow': string;
  '--ctc-duration-expressive': string;
  '--ctc-ease-default': string;
  '--ctc-ease-enter': string;
  '--ctc-ease-exit': string;
  '--ctc-ease-emphasis': string;

  // Gradient tokens
  '--ctc-gradient-hero': string;
  '--ctc-gradient-cta': string;
  '--ctc-gradient-subtle': string;
  '--ctc-gradient-overlay': string;

  // Allow additional tokens
  [key: string]: string;
}

// ============================================================================
// MAIN RESOLVER
// ============================================================================

/**
 * Resolve a design personality into CSS custom properties
 */
export function resolvePersonalityToTokens(
  personalityId: string,
  overrides?: Partial<DesignPersonality>
): ResolvedTokens {
  const personality = getPersonalityById(personalityId);
  if (!personality) {
    throw new Error(`Unknown design personality: ${personalityId}`);
  }

  // Apply overrides if provided
  const resolvedPersonality = overrides
    ? mergePersonality(personality, overrides)
    : personality;

  // Combine all token categories - the spread of all resolver functions
  // provides all required properties for ResolvedTokens
  return {
    // Colors
    ...resolveColorTokens(resolvedPersonality.colors),

    // Typography
    ...resolveTypographyTokens(resolvedPersonality.typography),

    // Layout
    ...resolveLayoutTokens(resolvedPersonality.layout),

    // Motion
    ...resolveMotionTokens(resolvedPersonality.motion),

    // Gradients (derived from colors)
    ...resolveGradientTokens(resolvedPersonality.colors),
  } as ResolvedTokens;
}

// ============================================================================
// COLOR TOKEN RESOLUTION
// ============================================================================

function resolveColorTokens(colors: ColorPersonality): Partial<ResolvedTokens> {
  return {
    '--ctc-primary': colors.primary,
    '--ctc-primary-light': colors.primaryLight,
    '--ctc-primary-dark': colors.primaryDark,
    '--ctc-secondary': colors.secondary,
    '--ctc-accent': colors.accent,
    '--ctc-background': colors.background,
    '--ctc-surface': colors.surface,
    '--ctc-surface-elevated': colors.surfaceElevated,
    '--ctc-text': colors.text,
    '--ctc-text-secondary': colors.textSecondary,
    '--ctc-text-muted': colors.textMuted,
    '--ctc-text-inverse': colors.textInverse,
    '--ctc-border': colors.border,
    '--ctc-border-subtle': colors.borderSubtle,
    '--ctc-success': colors.success,
    '--ctc-warning': colors.warning,
    '--ctc-error': colors.error,
    '--ctc-info': colors.info,
  };
}

// ============================================================================
// TYPOGRAPHY TOKEN RESOLUTION
// ============================================================================

function resolveTypographyTokens(typography: TypographyPersonality): Partial<ResolvedTokens> {
  // Calculate type scale based on ratio
  const scale = calculateTypeScale(typography.baseSize, typography.scaleRatio);

  return {
    '--ctc-font-display': typography.displayFont,
    '--ctc-font-body': typography.bodyFont,
    '--ctc-font-mono': typography.monoFont,
    '--ctc-text-base': typography.baseSize,
    '--ctc-text-xs': scale.xs,
    '--ctc-text-sm': scale.sm,
    '--ctc-text-lg': scale.lg,
    '--ctc-text-xl': scale.xl,
    '--ctc-text-2xl': scale['2xl'],
    '--ctc-text-3xl': scale['3xl'],
    '--ctc-text-4xl': scale['4xl'],
    '--ctc-text-5xl': scale['5xl'],
    '--ctc-heading-weight': String(typography.headingWeight),
    '--ctc-heading-case': typography.headingCase,
    '--ctc-heading-letter-spacing': typography.headingLetterSpacing,
    '--ctc-line-height-body': String(typography.bodyLineHeight),
    '--ctc-paragraph-spacing': typography.paragraphSpacing,
  };
}

/**
 * Calculate modular type scale from base size and ratio
 */
function calculateTypeScale(
  baseSize: string,
  ratio: number
): Record<string, string> {
  const basePx = parseFloat(baseSize) * 16; // Convert rem to px

  return {
    xs: `${(basePx / ratio / ratio).toFixed(3)}px`,
    sm: `${(basePx / ratio).toFixed(3)}px`,
    base: `${basePx}px`,
    lg: `${(basePx * ratio).toFixed(3)}px`,
    xl: `${(basePx * ratio * ratio).toFixed(3)}px`,
    '2xl': `${(basePx * Math.pow(ratio, 3)).toFixed(3)}px`,
    '3xl': `${(basePx * Math.pow(ratio, 4)).toFixed(3)}px`,
    '4xl': `${(basePx * Math.pow(ratio, 5)).toFixed(3)}px`,
    '5xl': `${(basePx * Math.pow(ratio, 6)).toFixed(3)}px`,
  };
}

// ============================================================================
// LAYOUT TOKEN RESOLUTION
// ============================================================================

function resolveLayoutTokens(layout: LayoutPersonality): Partial<ResolvedTokens> {
  // Generate spacing scale
  const spacingTokens = generateSpacingTokens(layout.spacingBase);

  return {
    // Border radius
    '--ctc-radius-none': layout.radiusScale.none,
    '--ctc-radius-sm': layout.radiusScale.sm,
    '--ctc-radius-md': layout.radiusScale.md,
    '--ctc-radius-lg': layout.radiusScale.lg,
    '--ctc-radius-xl': layout.radiusScale.xl,
    '--ctc-radius-2xl': layout.radiusScale['2xl'],
    '--ctc-radius-full': layout.radiusScale.full,

    // Shadows
    '--ctc-shadow-none': layout.shadowScale.none,
    '--ctc-shadow-sm': layout.shadowScale.sm,
    '--ctc-shadow-md': layout.shadowScale.md,
    '--ctc-shadow-lg': layout.shadowScale.lg,
    '--ctc-shadow-xl': layout.shadowScale.xl,
    '--ctc-shadow-2xl': layout.shadowScale['2xl'],

    // Spacing
    ...spacingTokens,
  };
}

/**
 * Generate spacing tokens from base unit
 */
function generateSpacingTokens(base: number): Partial<ResolvedTokens> {
  return {
    '--ctc-space-0': '0',
    '--ctc-space-1': `${base * 0.25}px`,
    '--ctc-space-2': `${base * 0.5}px`,
    '--ctc-space-3': `${base * 0.75}px`,
    '--ctc-space-4': `${base}px`,
    '--ctc-space-5': `${base * 1.25}px`,
    '--ctc-space-6': `${base * 1.5}px`,
    '--ctc-space-8': `${base * 2}px`,
    '--ctc-space-10': `${base * 2.5}px`,
    '--ctc-space-12': `${base * 3}px`,
    '--ctc-space-16': `${base * 4}px`,
    '--ctc-space-20': `${base * 5}px`,
    '--ctc-space-24': `${base * 6}px`,
  };
}

// ============================================================================
// MOTION TOKEN RESOLUTION
// ============================================================================

function resolveMotionTokens(motion: MotionPersonality): Partial<ResolvedTokens> {
  return {
    '--ctc-duration-instant': motion.duration.instant,
    '--ctc-duration-fast': motion.duration.fast,
    '--ctc-duration-normal': motion.duration.normal,
    '--ctc-duration-slow': motion.duration.slow,
    '--ctc-duration-expressive': motion.duration.expressive,
    '--ctc-ease-default': motion.easing.default,
    '--ctc-ease-enter': motion.easing.enter,
    '--ctc-ease-exit': motion.easing.exit,
    '--ctc-ease-emphasis': motion.easing.emphasis,
  };
}

// ============================================================================
// GRADIENT TOKEN RESOLUTION
// ============================================================================

function resolveGradientTokens(colors: ColorPersonality): Partial<ResolvedTokens> {
  return {
    '--ctc-gradient-hero': `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
    '--ctc-gradient-cta': `linear-gradient(90deg, ${colors.accent} 0%, ${colors.primary} 100%)`,
    '--ctc-gradient-subtle': `linear-gradient(180deg, ${colors.surface} 0%, ${colors.background} 100%)`,
    '--ctc-gradient-overlay': `linear-gradient(180deg, transparent 0%, ${colorPrimitives.black.alpha[50]} 100%)`,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Merge personality with overrides
 */
function mergePersonality(
  base: DesignPersonality,
  overrides: Partial<DesignPersonality>
): DesignPersonality {
  return {
    ...base,
    ...(overrides.typography && {
      typography: { ...base.typography, ...overrides.typography },
    }),
    ...(overrides.colors && {
      colors: { ...base.colors, ...overrides.colors },
    }),
    ...(overrides.layout && {
      layout: { ...base.layout, ...overrides.layout },
    }),
    ...(overrides.motion && {
      motion: { ...base.motion, ...overrides.motion },
    }),
    ...(overrides.components && {
      components: { ...base.components, ...overrides.components },
    }),
  };
}

/**
 * Convert resolved tokens to CSS string
 */
export function tokensToCSS(tokens: ResolvedTokens, selector: string = ':root'): string {
  const lines = Object.entries(tokens)
    .filter(([key]) => key.startsWith('--ctc-'))
    .map(([key, value]) => `  ${key}: ${value};`);

  return `${selector} {\n${lines.join('\n')}\n}`;
}

/**
 * Convert resolved tokens to inline style object
 */
export function tokensToStyleObject(tokens: ResolvedTokens): Record<string, string> {
  const styleObj: Record<string, string> = {};

  for (const [key, value] of Object.entries(tokens)) {
    if (key.startsWith('--ctc-')) {
      styleObj[key] = value;
    }
  }

  return styleObj;
}

/**
 * Get dark mode token overrides for a personality
 */
export function getDarkModeOverrides(personalityId: string): Partial<ResolvedTokens> {
  const personality = getPersonalityById(personalityId);
  if (!personality) return {};

  // If already a dark personality, return empty
  if (personality.colors.background.includes('#0') || personality.colors.background.includes('#1')) {
    return {};
  }

  // Generate dark mode color overrides
  return {
    '--ctc-background': colorPrimitives.gray[900],
    '--ctc-surface': colorPrimitives.gray[800],
    '--ctc-surface-elevated': colorPrimitives.gray[700],
    '--ctc-text': colorPrimitives.gray[50],
    '--ctc-text-secondary': colorPrimitives.gray[300],
    '--ctc-text-muted': colorPrimitives.gray[400],
    '--ctc-border': colorPrimitives.gray[700],
    '--ctc-border-subtle': colorPrimitives.gray[800],
  };
}

/**
 * Validate that a personality has all required tokens
 */
export function validatePersonality(personality: DesignPersonality): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required color tokens
  const requiredColors = ['primary', 'background', 'surface', 'text', 'border'] as const;
  for (const color of requiredColors) {
    if (!personality.colors[color]) {
      errors.push(`Missing required color: ${color}`);
    }
  }

  // Check required typography tokens
  if (!personality.typography.displayFont) {
    errors.push('Missing displayFont in typography');
  }
  if (!personality.typography.bodyFont) {
    errors.push('Missing bodyFont in typography');
  }

  // Check required layout tokens
  if (!personality.layout.radiusScale) {
    errors.push('Missing radiusScale in layout');
  }
  if (!personality.layout.shadowScale) {
    errors.push('Missing shadowScale in layout');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate CSS custom properties for all personalities (for documentation)
 */
export function generateAllPersonalityCSS(): string {
  const sections: string[] = [];

  for (const [id, personality] of Object.entries(designPersonalities)) {
    const tokens = resolvePersonalityToTokens(id);
    sections.push(`/* ${personality.name} */\n${tokensToCSS(tokens, `[data-personality="${id}"]`)}`);
  }

  return sections.join('\n\n');
}
