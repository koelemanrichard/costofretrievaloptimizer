/**
 * VisualEmphasizer
 *
 * Maps semantic weight to visual emphasis properties.
 * Uses brand DNA to influence animation and background decisions.
 *
 * Semantic Weight to Emphasis Level Mapping:
 * - Weight 5 -> 'hero'
 * - Weight 4 -> 'featured'
 * - Weight 3 -> 'standard'
 * - Weight 2 -> 'supporting'
 * - Weight 1 -> 'minimal'
 */

import { DesignDNA } from '../../types/designDna';
import {
  AccentPosition,
  AnimationType,
  BackgroundType,
  ElevationLevel,
  EmphasisLevel,
  HeadingSize,
  IVisualEmphasizer,
  SectionAnalysis,
  VisualEmphasis,
} from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default energy threshold for enabling background treatment on featured sections
 */
const ENERGY_THRESHOLD_FOR_BACKGROUND = 3;

/**
 * Default animation type when animations are enabled
 */
const DEFAULT_ANIMATION_TYPE: AnimationType = 'fade';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert semantic weight to emphasis level.
 * Clamps weights to valid range [1-5] and rounds fractional values.
 */
function weightToEmphasisLevel(weight: number): EmphasisLevel {
  // Round and clamp to valid range
  const clampedWeight = Math.max(1, Math.min(5, Math.round(weight)));

  switch (clampedWeight) {
    case 5:
      return 'hero';
    case 4:
      return 'featured';
    case 3:
      return 'standard';
    case 2:
      return 'supporting';
    case 1:
    default:
      return 'minimal';
  }
}

/**
 * Check if motion is enabled in brand DNA.
 * Motion is disabled only when overall is 'static'.
 */
function isMotionEnabled(dna?: DesignDNA): boolean {
  if (!dna?.motion?.overall) {
    // Default: motion is enabled
    return true;
  }
  return dna.motion.overall !== 'static';
}

/**
 * Check if brand personality is 'minimal'.
 */
function isMinimalPersonality(dna?: DesignDNA): boolean {
  if (!dna?.personality?.overall) {
    return false;
  }
  return dna.personality.overall === 'minimal';
}

/**
 * Get energy level from brand DNA.
 * Defaults to 3 (moderate) if not specified.
 */
function getEnergy(dna?: DesignDNA): number {
  return dna?.personality?.energy ?? 3;
}

/**
 * Determine background type based on brand personality.
 * Minimal brands get solid, others get gradient.
 */
function determineBackgroundType(dna?: DesignDNA): BackgroundType {
  if (isMinimalPersonality(dna)) {
    return 'solid';
  }
  return 'gradient';
}

// =============================================================================
// EMPHASIS CONFIGURATION BY LEVEL
// =============================================================================

/**
 * Calculate hero-level (weight 5) emphasis properties.
 */
function calculateHeroEmphasis(dna?: DesignDNA): VisualEmphasis {
  const motionEnabled = isMotionEnabled(dna);
  const backgroundType = determineBackgroundType(dna);

  return {
    level: 'hero',
    headingSize: 'xl',
    headingDecoration: { type: 'background' },
    paddingMultiplier: 2,
    marginMultiplier: 2,
    hasBackgroundTreatment: true,
    backgroundType,
    hasAccentBorder: false,
    accentPosition: undefined,
    elevation: 0, // Hero sections are foundational
    hasEntryAnimation: motionEnabled,
    animationType: motionEnabled ? DEFAULT_ANIMATION_TYPE : undefined,
  };
}

/**
 * Calculate featured-level (weight 4) emphasis properties.
 */
function calculateFeaturedEmphasis(dna?: DesignDNA): VisualEmphasis {
  const motionEnabled = isMotionEnabled(dna);
  const energy = getEnergy(dna);
  const hasHighEnergy = energy >= ENERGY_THRESHOLD_FOR_BACKGROUND;

  // Featured sections get animations only if both motion is enabled AND energy is high
  const hasAnimation = motionEnabled && hasHighEnergy;

  return {
    level: 'featured',
    headingSize: 'lg',
    headingDecoration: { type: 'border-bottom' },
    paddingMultiplier: 1.5,
    marginMultiplier: 1.5,
    hasBackgroundTreatment: hasHighEnergy,
    backgroundType: hasHighEnergy ? determineBackgroundType(dna) : undefined,
    hasAccentBorder: true,
    accentPosition: 'left' as AccentPosition,
    elevation: 2 as ElevationLevel,
    hasEntryAnimation: hasAnimation,
    animationType: hasAnimation ? DEFAULT_ANIMATION_TYPE : undefined,
  };
}

/**
 * Calculate standard-level (weight 3) emphasis properties.
 */
function calculateStandardEmphasis(): VisualEmphasis {
  return {
    level: 'standard',
    headingSize: 'md',
    headingDecoration: { type: 'none' },
    paddingMultiplier: 1,
    marginMultiplier: 1,
    hasBackgroundTreatment: false,
    backgroundType: undefined,
    hasAccentBorder: false,
    accentPosition: undefined,
    elevation: 0 as ElevationLevel,
    hasEntryAnimation: false,
    animationType: undefined,
  };
}

/**
 * Calculate supporting-level (weight 2) emphasis properties.
 */
function calculateSupportingEmphasis(): VisualEmphasis {
  return {
    level: 'supporting',
    headingSize: 'sm',
    headingDecoration: { type: 'none' },
    paddingMultiplier: 0.75,
    marginMultiplier: 0.75,
    hasBackgroundTreatment: false,
    backgroundType: undefined,
    hasAccentBorder: false,
    accentPosition: undefined,
    elevation: 0 as ElevationLevel,
    hasEntryAnimation: false,
    animationType: undefined,
  };
}

/**
 * Calculate minimal-level (weight 1) emphasis properties.
 */
function calculateMinimalEmphasis(): VisualEmphasis {
  return {
    level: 'minimal',
    headingSize: 'sm',
    headingDecoration: { type: 'none' },
    paddingMultiplier: 0.5,
    marginMultiplier: 0.5,
    hasBackgroundTreatment: false,
    backgroundType: undefined,
    hasAccentBorder: false,
    accentPosition: undefined,
    elevation: 0 as ElevationLevel,
    hasEntryAnimation: false,
    animationType: undefined,
  };
}

// =============================================================================
// VISUAL EMPHASIZER CLASS
// =============================================================================

export class VisualEmphasizer implements IVisualEmphasizer {
  /**
   * Calculate visual emphasis for a section based on semantic weight and brand DNA.
   */
  static calculateEmphasis(analysis: SectionAnalysis, dna?: DesignDNA): VisualEmphasis {
    const level = weightToEmphasisLevel(analysis.semanticWeight);

    switch (level) {
      case 'hero':
        return calculateHeroEmphasis(dna);
      case 'featured':
        return calculateFeaturedEmphasis(dna);
      case 'standard':
        return calculateStandardEmphasis();
      case 'supporting':
        return calculateSupportingEmphasis();
      case 'minimal':
      default:
        return calculateMinimalEmphasis();
    }
  }

  /**
   * Calculate visual emphasis for all sections.
   */
  static calculateAllEmphasis(analyses: SectionAnalysis[], dna?: DesignDNA): VisualEmphasis[] {
    return analyses.map((analysis) => VisualEmphasizer.calculateEmphasis(analysis, dna));
  }

  // =============================================================================
  // INSTANCE METHODS (delegate to static methods)
  // =============================================================================

  /**
   * Determine visual emphasis for a section (instance method).
   * Implements IVisualEmphasizer interface.
   */
  determineEmphasis(analysis: SectionAnalysis, dna?: DesignDNA): VisualEmphasis {
    return VisualEmphasizer.calculateEmphasis(analysis, dna);
  }

  /**
   * Determine visual emphasis for all sections (instance method).
   * Implements IVisualEmphasizer interface.
   */
  determineAllEmphasis(analyses: SectionAnalysis[], dna?: DesignDNA): VisualEmphasis[] {
    return VisualEmphasizer.calculateAllEmphasis(analyses, dna);
  }
}

export default VisualEmphasizer;
