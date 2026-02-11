/**
 * DesignDNA Helper Utilities
 *
 * Extracts color, font, radius, and other design values from DesignDNA objects.
 * Includes color validation and luminance calculations.
 *
 * @module services/publishing/renderer/designDnaHelpers
 */

import type { DesignDNA } from '../../../types/designDna';

// ============================================================================
// COLOR EXTRACTION
// ============================================================================

/**
 * Extract a color from DesignDNA with fallback defaults
 */
export function getColor(designDna: DesignDNA, type: 'primary' | 'primaryLight' | 'primaryDark' | 'secondary' | 'accent'): string {
  const colors = designDna.colors || {};
  const defaults: Record<string, string> = {
    primary: '#3b82f6', primaryLight: '#93c5fd', primaryDark: '#1e40af',
    secondary: '#64748b', accent: '#f59e0b'
  };

  const color = colors[type];
  let hex: string;
  if (!color) hex = defaults[type];
  else if (typeof color === 'string') hex = color;
  else hex = color.hex || defaults[type];

  // Validate: primaryDark MUST be dark enough for text on white backgrounds
  if (type === 'primaryDark') {
    const lum = hexLuminance(hex);
    if (lum > 0.4) {
      const primaryHex = getColor(designDna, 'primary');
      hex = hexLuminance(primaryHex) <= 0.4
        ? darkenHexColor(primaryHex, 0.35)
        : defaults['primaryDark'];
      console.warn(`[CleanArticleRenderer] primaryDark too light (lum=${lum.toFixed(2)}), corrected to ${hex}`);
    }
  }

  // Validate: primary should not be near-white
  if (type === 'primary' && hexLuminance(hex) > 0.85) {
    hex = defaults['primary'];
    console.warn(`[CleanArticleRenderer] primary too light, using fallback ${hex}`);
  }

  return hex;
}

/**
 * Extract a neutral color from DesignDNA with fallback defaults
 */
export function getNeutral(designDna: DesignDNA, level: 'darkest' | 'dark' | 'medium' | 'light' | 'lightest'): string {
  const neutrals = designDna.colors?.neutrals || {};
  const defaults: Record<string, string> = {
    darkest: '#111827',
    dark: '#374151',
    medium: '#6b7280',
    light: '#e5e7eb',
    lightest: '#f9fafb'
  };
  return neutrals[level] || defaults[level];
}

// ============================================================================
// FONT EXTRACTION
// ============================================================================

/**
 * Extract a font family from DesignDNA with fallback defaults
 */
export function getFont(designDna: DesignDNA, type: 'heading' | 'body'): string {
  const typography = designDna.typography || {} as Partial<DesignDNA['typography']>;
  const font = type === 'heading' ? typography.headingFont : typography.bodyFont;

  if (!font) {
    return type === 'heading' ? "'Georgia', serif" : "'Open Sans', Arial, sans-serif";
  }

  let family = font.family || (type === 'heading' ? 'Georgia' : 'Open Sans');
  const fallback = font.fallback || (type === 'heading' ? 'serif' : 'sans-serif');

  // Clean up: strip existing quotes and fallback stacks from family name
  // e.g. "'Barlow Semi Condensed', sans-serif" -> "Barlow Semi Condensed"
  family = family.replace(/^['"]|['"]$/g, ''); // strip outer quotes
  if (family.includes(',')) {
    family = family.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  }

  return `'${family}', ${fallback}`;
}

// ============================================================================
// SHAPE EXTRACTION
// ============================================================================

/**
 * Extract border radius from DesignDNA with fallback defaults
 */
export function getRadius(designDna: DesignDNA, size: 'small' | 'medium' | 'large'): string {
  const shapes = designDna.shapes || {} as Partial<DesignDNA['shapes']>;
  const borderRadius = shapes.borderRadius;

  const defaults: Record<string, string> = {
    small: '4px',
    medium: '8px',
    large: '16px'
  };

  if (!borderRadius || typeof borderRadius !== 'object') {
    return defaults[size];
  }

  return borderRadius[size] || defaults[size];
}

// ============================================================================
// COLOR UTILITIES
// ============================================================================

/** WCAG 2.0 relative luminance */
export function hexLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length < 6) return 0.5;
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Darken a hex color by factor (0-1). factor=0.35 makes color 35% darker. */
export function darkenHexColor(hex: string, factor: number): string {
  const clean = hex.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(clean.substring(0, 2), 16) * (1 - factor)));
  const g = Math.max(0, Math.round(parseInt(clean.substring(2, 4), 16) * (1 - factor)));
  const b = Math.max(0, Math.round(parseInt(clean.substring(4, 6), 16) * (1 - factor)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ============================================================================
// PERSONALITY MAPPING
// ============================================================================

/**
 * Map DesignDNA personality to ComponentStylesOptions personality.
 * DesignDNA allows 'playful' and 'elegant' which ComponentStyles doesn't support.
 */
export function mapPersonalityForComponentStyles(
  personality?: string
): 'corporate' | 'creative' | 'luxurious' | 'friendly' | 'bold' | 'minimal' | undefined {
  if (!personality) return undefined;
  const mapping: Record<string, 'corporate' | 'creative' | 'luxurious' | 'friendly' | 'bold' | 'minimal'> = {
    corporate: 'corporate',
    creative: 'creative',
    luxurious: 'luxurious',
    friendly: 'friendly',
    bold: 'bold',
    minimal: 'minimal',
    elegant: 'luxurious',   // elegant maps to luxurious (closest visual style)
    playful: 'creative',    // playful maps to creative (closest visual style)
  };
  return mapping[personality] || 'corporate';
}

// ============================================================================
// GOOGLE FONTS
// ============================================================================

/**
 * Generate Google Fonts URL from DesignDNA typography settings
 */
export function getGoogleFontsUrl(designDna: DesignDNA): string | null {
  const typography = designDna.typography || {} as Partial<DesignDNA['typography']>;
  const fonts: string[] = [];

  const headingFont = typography.headingFont?.family;
  const bodyFont = typography.bodyFont?.family;

  // Common Google Fonts - add to URL if detected
  const googleFonts = ['Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Roboto Slab',
    'Playfair Display', 'Merriweather', 'Source Sans Pro', 'Raleway', 'Poppins',
    'Nunito', 'Ubuntu', 'Work Sans', 'Fira Sans', 'Inter'];

  if (headingFont && googleFonts.some(f => headingFont.includes(f))) {
    fonts.push(headingFont.replace(/\s+/g, '+') + ':wght@400;700');
  }

  if (bodyFont && bodyFont !== headingFont && googleFonts.some(f => bodyFont.includes(f))) {
    fonts.push(bodyFont.replace(/\s+/g, '+') + ':wght@400;600');
  }

  if (fonts.length === 0) return null;

  return `https://fonts.googleapis.com/css2?family=${fonts.join('&family=')}&display=swap`;
}
