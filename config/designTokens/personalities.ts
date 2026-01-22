/**
 * Design Personality Presets
 *
 * Complete design personalities that combine typography, colors, layout, and motion
 * into cohesive visual systems. Each personality produces genuinely different aesthetics.
 *
 * @module config/designTokens/personalities
 */

import {
  colorPrimitives,
  fontFamilyPrimitives,
  boxShadowPrimitives,
  borderRadiusPrimitives,
  transitionDurationPrimitives,
  transitionTimingPrimitives,
} from './primitives';

// ============================================================================
// TYPES
// ============================================================================

export interface TypographyPersonality {
  displayFont: string;
  bodyFont: string;
  monoFont: string;
  scaleRatio: 1.067 | 1.125 | 1.200 | 1.250 | 1.333 | 1.414 | 1.618;
  baseSize: string;
  headingWeight: 400 | 500 | 600 | 700 | 800 | 900;
  headingCase: 'normal' | 'uppercase' | 'small-caps';
  headingLetterSpacing: string;
  bodyLineHeight: number;
  paragraphSpacing: string;
}

export interface ColorPersonality {
  scheme: 'monochromatic' | 'branded' | 'high-contrast' | 'warm' | 'cool';
  saturation: 'muted' | 'medium' | 'vibrant' | 'rich';
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderSubtle: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface LayoutPersonality {
  heroStyle: 'full-bleed' | 'split' | 'minimal' | 'centered' | 'asymmetric';
  cardStyle: 'flat' | 'raised' | 'floating' | 'outlined' | 'glass';
  gridStyle: 'strict' | 'loose' | 'asymmetric' | 'masonry';
  spacingBase: 4 | 8 | 16;
  spacingScale: number[];
  radiusScale: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    full: string;
  };
  shadowScale: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
}

export interface MotionPersonality {
  duration: {
    instant: string;
    fast: string;
    normal: string;
    slow: string;
    expressive: string;
  };
  easing: {
    default: string;
    enter: string;
    exit: string;
    emphasis: string;
  };
  spring?: {
    stiffness: number;
    damping: number;
    mass: number;
  };
}

export interface ComponentVariants {
  hero: { layout: string; background: string };
  card: { elevation: string; padding: string };
  button: { style: string; radius: string };
  timeline: { orientation: string; style: string };
  testimonial: { layout: string };
  cta: { style: string };
}

export interface DesignPersonality {
  id: string;
  name: string;
  description: string;
  typography: TypographyPersonality;
  colors: ColorPersonality;
  layout: LayoutPersonality;
  motion: MotionPersonality;
  components: ComponentVariants;
}

// ============================================================================
// PRESET: MODERN MINIMAL
// ============================================================================

export const modernMinimal: DesignPersonality = {
  id: 'modern-minimal',
  name: 'Modern Minimal',
  description: 'Clean, sophisticated, clarity-first design with sharp edges and subtle shadows',

  typography: {
    displayFont: fontFamilyPrimitives.inter,
    bodyFont: fontFamilyPrimitives.inter,
    monoFont: fontFamilyPrimitives.jetbrainsMono,
    scaleRatio: 1.125, // Major Second - subtle jumps
    baseSize: '1rem',
    headingWeight: 500,
    headingCase: 'normal',
    headingLetterSpacing: '-0.01em',
    bodyLineHeight: 1.6,
    paragraphSpacing: '1em',
  },

  colors: {
    scheme: 'monochromatic',
    saturation: 'muted',
    primary: colorPrimitives.zinc[900],
    primaryLight: colorPrimitives.zinc[700],
    primaryDark: colorPrimitives.zinc[950],
    secondary: colorPrimitives.zinc[600],
    accent: colorPrimitives.blue[500],
    background: colorPrimitives.white.DEFAULT,
    surface: colorPrimitives.zinc[50],
    surfaceElevated: colorPrimitives.white.DEFAULT,
    text: colorPrimitives.zinc[900],
    textSecondary: colorPrimitives.zinc[600],
    textMuted: colorPrimitives.zinc[500],
    textInverse: colorPrimitives.white.DEFAULT,
    border: colorPrimitives.zinc[200],
    borderSubtle: colorPrimitives.zinc[100],
    success: colorPrimitives.green[500],
    warning: colorPrimitives.yellow[500],
    error: colorPrimitives.red[500],
    info: colorPrimitives.blue[500],
  },

  layout: {
    heroStyle: 'minimal',
    cardStyle: 'flat',
    gridStyle: 'strict',
    spacingBase: 8,
    spacingScale: [0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16],
    radiusScale: {
      none: '0',
      sm: '2px',
      md: '4px',
      lg: '6px',
      xl: '8px',
      '2xl': '10px',
      full: '9999px',
    },
    shadowScale: {
      none: 'none',
      sm: '0 1px 2px rgba(0,0,0,0.04)',
      md: '0 2px 4px rgba(0,0,0,0.06)',
      lg: '0 4px 8px rgba(0,0,0,0.08)',
      xl: '0 8px 16px rgba(0,0,0,0.1)',
      '2xl': '0 16px 32px rgba(0,0,0,0.12)',
    },
  },

  motion: {
    duration: {
      instant: '0ms',
      fast: '100ms',
      normal: '150ms',
      slow: '200ms',
      expressive: '300ms',
    },
    easing: {
      default: transitionTimingPrimitives.smoothInOut,
      enter: transitionTimingPrimitives.smoothOut,
      exit: transitionTimingPrimitives.smoothIn,
      emphasis: transitionTimingPrimitives.smoothInOut,
    },
  },

  components: {
    hero: { layout: 'minimal', background: 'solid' },
    card: { elevation: 'flat', padding: 'compact' },
    button: { style: 'solid', radius: 'sm' },
    timeline: { orientation: 'vertical', style: 'dots' },
    testimonial: { layout: 'minimal' },
    cta: { style: 'text-link' },
  },
};

// ============================================================================
// PRESET: CORPORATE PROFESSIONAL
// ============================================================================

export const corporateProfessional: DesignPersonality = {
  id: 'corporate-professional',
  name: 'Corporate Professional',
  description: 'Trustworthy, established, business-appropriate with serif/sans pairing',

  typography: {
    displayFont: fontFamilyPrimitives.merriweather,
    bodyFont: fontFamilyPrimitives.openSans,
    monoFont: fontFamilyPrimitives.jetbrainsMono,
    scaleRatio: 1.200, // Minor Third - moderate jumps
    baseSize: '1rem',
    headingWeight: 700,
    headingCase: 'normal',
    headingLetterSpacing: '-0.015em',
    bodyLineHeight: 1.7,
    paragraphSpacing: '1.25em',
  },

  colors: {
    scheme: 'branded',
    saturation: 'medium',
    primary: colorPrimitives.blue[800],
    primaryLight: colorPrimitives.blue[600],
    primaryDark: colorPrimitives.blue[900],
    secondary: colorPrimitives.teal[600],
    accent: colorPrimitives.amber[500],
    background: colorPrimitives.white.DEFAULT,
    surface: colorPrimitives.slate[50],
    surfaceElevated: colorPrimitives.white.DEFAULT,
    text: colorPrimitives.slate[900],
    textSecondary: colorPrimitives.slate[700],
    textMuted: colorPrimitives.slate[500],
    textInverse: colorPrimitives.white.DEFAULT,
    border: colorPrimitives.slate[200],
    borderSubtle: colorPrimitives.slate[100],
    success: colorPrimitives.emerald[600],
    warning: colorPrimitives.amber[600],
    error: colorPrimitives.red[600],
    info: colorPrimitives.blue[600],
  },

  layout: {
    heroStyle: 'split',
    cardStyle: 'raised',
    gridStyle: 'strict',
    spacingBase: 8,
    spacingScale: [0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16],
    radiusScale: {
      none: '0',
      sm: '4px',
      md: '6px',
      lg: '8px',
      xl: '12px',
      '2xl': '16px',
      full: '9999px',
    },
    shadowScale: {
      none: 'none',
      sm: '0 1px 3px rgba(0,0,0,0.08)',
      md: '0 4px 6px rgba(0,0,0,0.1)',
      lg: '0 10px 15px rgba(0,0,0,0.1)',
      xl: '0 20px 25px rgba(0,0,0,0.1)',
      '2xl': '0 25px 50px rgba(0,0,0,0.15)',
    },
  },

  motion: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
      expressive: '500ms',
    },
    easing: {
      default: transitionTimingPrimitives.smoothInOut,
      enter: transitionTimingPrimitives.smoothOut,
      exit: transitionTimingPrimitives.smoothIn,
      emphasis: transitionTimingPrimitives.smoothInOut,
    },
  },

  components: {
    hero: { layout: 'split', background: 'gradient' },
    card: { elevation: 'raised', padding: 'normal' },
    button: { style: 'solid', radius: 'md' },
    timeline: { orientation: 'zigzag', style: 'numbered' },
    testimonial: { layout: 'card' },
    cta: { style: 'gradient-banner' },
  },
};

// ============================================================================
// PRESET: BOLD EDITORIAL
// ============================================================================

export const boldEditorial: DesignPersonality = {
  id: 'bold-editorial',
  name: 'Bold Editorial',
  description: 'Magazine-style, dramatic typography, story-driven with high contrast',

  typography: {
    displayFont: fontFamilyPrimitives.playfairDisplay,
    bodyFont: fontFamilyPrimitives.sourceSansPro,
    monoFont: fontFamilyPrimitives.jetbrainsMono,
    scaleRatio: 1.333, // Perfect Fourth - dramatic jumps
    baseSize: '1.125rem',
    headingWeight: 900,
    headingCase: 'normal',
    headingLetterSpacing: '-0.03em',
    bodyLineHeight: 1.8,
    paragraphSpacing: '1.5em',
  },

  colors: {
    scheme: 'high-contrast',
    saturation: 'rich',
    primary: colorPrimitives.black.DEFAULT,
    primaryLight: colorPrimitives.gray[800],
    primaryDark: colorPrimitives.black.DEFAULT,
    secondary: colorPrimitives.gray[700],
    accent: colorPrimitives.red[600],
    background: colorPrimitives.white.DEFAULT,
    surface: colorPrimitives.gray[50],
    surfaceElevated: colorPrimitives.white.DEFAULT,
    text: colorPrimitives.gray[900],
    textSecondary: colorPrimitives.gray[700],
    textMuted: colorPrimitives.gray[500],
    textInverse: colorPrimitives.white.DEFAULT,
    border: colorPrimitives.gray[200],
    borderSubtle: colorPrimitives.gray[100],
    success: colorPrimitives.green[600],
    warning: colorPrimitives.amber[600],
    error: colorPrimitives.red[600],
    info: colorPrimitives.blue[600],
  },

  layout: {
    heroStyle: 'full-bleed',
    cardStyle: 'outlined',
    gridStyle: 'asymmetric',
    spacingBase: 8,
    spacingScale: [0, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24],
    radiusScale: {
      none: '0',
      sm: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      full: '9999px',
    },
    shadowScale: {
      none: 'none',
      sm: 'none',
      md: '0 0 0 1px rgba(0,0,0,0.1)',
      lg: '0 0 0 1px rgba(0,0,0,0.15)',
      xl: '0 0 0 2px rgba(0,0,0,0.15)',
      '2xl': '0 0 0 3px rgba(0,0,0,0.2)',
    },
  },

  motion: {
    duration: {
      instant: '0ms',
      fast: '200ms',
      normal: '350ms',
      slow: '500ms',
      expressive: '700ms',
    },
    easing: {
      default: 'cubic-bezier(0.33, 1, 0.68, 1)',
      enter: transitionTimingPrimitives.spring,
      exit: transitionTimingPrimitives.smoothIn,
      emphasis: transitionTimingPrimitives.bounce,
    },
  },

  components: {
    hero: { layout: 'asymmetric', background: 'image-overlay' },
    card: { elevation: 'flat', padding: 'spacious' },
    button: { style: 'outline', radius: 'none' },
    timeline: { orientation: 'vertical', style: 'icons' },
    testimonial: { layout: 'featured' },
    cta: { style: 'bold-contrast' },
  },
};

// ============================================================================
// PRESET: WARM & FRIENDLY
// ============================================================================

export const warmFriendly: DesignPersonality = {
  id: 'warm-friendly',
  name: 'Warm & Friendly',
  description: 'Approachable, human, playful yet professional with rounded shapes',

  typography: {
    displayFont: fontFamilyPrimitives.dmSans,
    bodyFont: fontFamilyPrimitives.dmSans,
    monoFont: fontFamilyPrimitives.jetbrainsMono,
    scaleRatio: 1.250, // Major Third
    baseSize: '1.0625rem',
    headingWeight: 700,
    headingCase: 'normal',
    headingLetterSpacing: '-0.02em',
    bodyLineHeight: 1.7,
    paragraphSpacing: '1.25em',
  },

  colors: {
    scheme: 'warm',
    saturation: 'vibrant',
    primary: colorPrimitives.orange[600],
    primaryLight: colorPrimitives.orange[400],
    primaryDark: colorPrimitives.orange[700],
    secondary: colorPrimitives.amber[600],
    accent: colorPrimitives.teal[500],
    background: colorPrimitives.amber[50],
    surface: colorPrimitives.white.DEFAULT,
    surfaceElevated: colorPrimitives.white.DEFAULT,
    text: colorPrimitives.stone[800],
    textSecondary: colorPrimitives.stone[600],
    textMuted: colorPrimitives.stone[500],
    textInverse: colorPrimitives.white.DEFAULT,
    border: colorPrimitives.stone[200],
    borderSubtle: colorPrimitives.stone[100],
    success: colorPrimitives.green[500],
    warning: colorPrimitives.yellow[500],
    error: colorPrimitives.red[500],
    info: colorPrimitives.cyan[500],
  },

  layout: {
    heroStyle: 'centered',
    cardStyle: 'floating',
    gridStyle: 'loose',
    spacingBase: 8,
    spacingScale: [0, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24],
    radiusScale: {
      none: '0',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
      '2xl': '32px',
      full: '9999px',
    },
    shadowScale: {
      none: 'none',
      sm: `0 2px 8px ${colorPrimitives.orange[500]}15`,
      md: `0 4px 12px ${colorPrimitives.orange[500]}18`,
      lg: `0 8px 24px ${colorPrimitives.orange[500]}20`,
      xl: `0 16px 48px ${colorPrimitives.orange[500]}22`,
      '2xl': `0 24px 64px ${colorPrimitives.orange[500]}25`,
    },
  },

  motion: {
    duration: {
      instant: '0ms',
      fast: '200ms',
      normal: '400ms',
      slow: '600ms',
      expressive: '800ms',
    },
    easing: {
      default: transitionTimingPrimitives.bounce,
      enter: transitionTimingPrimitives.spring,
      exit: transitionTimingPrimitives.smoothIn,
      emphasis: transitionTimingPrimitives.bounce,
    },
    spring: {
      stiffness: 200,
      damping: 15,
      mass: 1,
    },
  },

  components: {
    hero: { layout: 'centered', background: 'gradient' },
    card: { elevation: 'floating', padding: 'normal' },
    button: { style: 'solid', radius: 'xl' },
    timeline: { orientation: 'horizontal', style: 'icons' },
    testimonial: { layout: 'card' },
    cta: { style: 'warm-gradient' },
  },
};

// ============================================================================
// PRESET: TECH CLEAN
// ============================================================================

export const techClean: DesignPersonality = {
  id: 'tech-clean',
  name: 'Tech Clean',
  description: 'Modern technology aesthetic, sleek dark mode, data-forward design',

  typography: {
    displayFont: fontFamilyPrimitives.spaceGrotesk,
    bodyFont: fontFamilyPrimitives.ibmPlexSans,
    monoFont: fontFamilyPrimitives.geistMono,
    scaleRatio: 1.200, // Minor Third
    baseSize: '1rem',
    headingWeight: 600,
    headingCase: 'normal',
    headingLetterSpacing: '-0.02em',
    bodyLineHeight: 1.65,
    paragraphSpacing: '1.125em',
  },

  colors: {
    scheme: 'cool',
    saturation: 'medium',
    primary: colorPrimitives.indigo[500],
    primaryLight: colorPrimitives.indigo[400],
    primaryDark: colorPrimitives.indigo[600],
    secondary: colorPrimitives.violet[500],
    accent: colorPrimitives.cyan[400],
    background: colorPrimitives.slate[900],
    surface: colorPrimitives.slate[800],
    surfaceElevated: colorPrimitives.slate[700],
    text: colorPrimitives.slate[50],
    textSecondary: colorPrimitives.slate[300],
    textMuted: colorPrimitives.slate[400],
    textInverse: colorPrimitives.slate[900],
    border: colorPrimitives.slate[700],
    borderSubtle: colorPrimitives.slate[800],
    success: colorPrimitives.emerald[400],
    warning: colorPrimitives.amber[400],
    error: colorPrimitives.rose[400],
    info: colorPrimitives.cyan[400],
  },

  layout: {
    heroStyle: 'split',
    cardStyle: 'raised',
    gridStyle: 'strict',
    spacingBase: 8,
    spacingScale: [0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16],
    radiusScale: {
      none: '0',
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      '2xl': '20px',
      full: '9999px',
    },
    shadowScale: {
      none: 'none',
      sm: `0 0 0 1px ${colorPrimitives.indigo[500]}15`,
      md: '0 4px 12px rgba(0,0,0,0.3)',
      lg: '0 8px 24px rgba(0,0,0,0.4)',
      xl: '0 16px 48px rgba(0,0,0,0.5)',
      '2xl': `0 0 80px ${colorPrimitives.indigo[500]}30`,
    },
  },

  motion: {
    duration: {
      instant: '0ms',
      fast: '150ms',
      normal: '250ms',
      slow: '400ms',
      expressive: '600ms',
    },
    easing: {
      default: transitionTimingPrimitives.smoothInOut,
      enter: transitionTimingPrimitives.spring,
      exit: transitionTimingPrimitives.smoothIn,
      emphasis: transitionTimingPrimitives.bounce,
    },
  },

  components: {
    hero: { layout: 'split', background: 'gradient' },
    card: { elevation: 'raised', padding: 'normal' },
    button: { style: 'solid', radius: 'md' },
    timeline: { orientation: 'horizontal', style: 'numbered' },
    testimonial: { layout: 'card' },
    cta: { style: 'gradient-glow' },
  },
};

// ============================================================================
// ALL PERSONALITIES COLLECTION
// ============================================================================

export const designPersonalities: Record<string, DesignPersonality> = {
  'modern-minimal': modernMinimal,
  'corporate-professional': corporateProfessional,
  'bold-editorial': boldEditorial,
  'warm-friendly': warmFriendly,
  'tech-clean': techClean,
};

export type DesignPersonalityId = keyof typeof designPersonalities;

/**
 * Get personality by ID
 */
export function getPersonalityById(id: string): DesignPersonality | undefined {
  return designPersonalities[id];
}

/**
 * Get all personality IDs
 */
export function getAllPersonalityIds(): DesignPersonalityId[] {
  return Object.keys(designPersonalities) as DesignPersonalityId[];
}

/**
 * Get personality options for UI selection
 */
export function getPersonalityOptions(): Array<{ id: string; name: string; description: string }> {
  return Object.values(designPersonalities).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
  }));
}
