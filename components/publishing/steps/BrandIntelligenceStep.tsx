/**
 * Brand Intelligence Step
 *
 * Consolidated brand detection experience that combines AI brand detection
 * with inline personality adjustments. This replaces the separate BrandStep
 * and BrandStyleStep tabs for a cleaner single-step experience.
 *
 * Features:
 * - Mode toggle: Full Extraction (multi-page) vs Quick Detection (single URL)
 * - URL input for brand detection
 * - Screenshot display (prominent at top)
 * - Color palette summary (horizontal palette)
 * - Font summary (heading and body fonts)
 * - Personality sliders (formality, energy, warmth) - VISIBLE inline
 * - Expandable Design DNA details for advanced users
 *
 * @module components/publishing/steps/BrandIntelligenceStep
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { AnalysisProgress } from '../AnalysisProgress';
import { useBrandDetection } from '../../../hooks/useBrandDetection';
import { useBrandExtraction } from '../../../hooks/useBrandExtraction';
import { BrandUrlDiscovery, BrandExtractionProgress, BrandComponentPreview } from '../brand';
import { BrandDesignSystemGenerator } from '../../../services/design-analysis/BrandDesignSystemGenerator';
import type { DesignDNA, BrandDesignSystem } from '../../../types/designDna';
import type { UrlSuggestion } from '../../../services/brand-extraction/UrlDiscoveryService';
import type { ExtractedComponent } from '../../../types/brandExtraction';

// ============================================================================
// Types
// ============================================================================

interface BrandIntelligenceStepProps {
  // Detection inputs
  defaultDomain?: string;
  apifyToken: string;
  geminiApiKey?: string;
  anthropicApiKey?: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  projectId?: string;

  // Detection results (passed in when already detected)
  designDna: DesignDNA | null;
  brandDesignSystem: BrandDesignSystem | null;
  screenshotBase64: string | null;

  // Saved brand data info (for showing when data was last analyzed)
  savedSourceUrl?: string | null;
  savedExtractedAt?: string | null;
  isLoadingSavedData?: boolean;

  // Saved extraction data (URL suggestions + components from DB)
  savedUrlSuggestions?: UrlSuggestion[];
  savedComponents?: ExtractedComponent[];

  // Callbacks
  onDetectionComplete: (result: {
    designDna: DesignDNA;
    designSystem: BrandDesignSystem;
    screenshotBase64: string;
    /** Extracted components with literal HTML/CSS from the target site */
    extractedComponents?: import('../../../types/brandExtraction').ExtractedComponent[];
  }) => void;
  onDesignDnaChange?: (dna: DesignDNA) => void;
  onRegenerate?: () => void;
  /** Called when user wants to reset and enter a new brand URL */
  onReset?: () => void;
}

// ============================================================================
// Helper Components
// ============================================================================

interface ColorSwatchProps {
  label: string;
  color: string;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({ label, color }) => (
  <div className="text-center">
    <div
      className="w-12 h-12 rounded-lg border border-zinc-600 mb-1 transition-transform hover:scale-110"
      style={{ backgroundColor: color }}
      title={color}
    />
    <span className="text-[10px] text-zinc-400">{label}</span>
  </div>
);

interface PersonalitySliderProps {
  label: string;
  value: 1 | 2 | 3 | 4 | 5;
  lowLabel: string;
  highLabel: string;
  currentLabel: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const PersonalitySlider: React.FC<PersonalitySliderProps> = ({
  value,
  lowLabel,
  highLabel,
  currentLabel,
  onChange,
  disabled = false,
}) => (
  <div>
    <div className="flex justify-between text-xs text-zinc-400 mb-1">
      <span>{lowLabel}</span>
      <span className="text-white font-medium">{currentLabel}</span>
      <span>{highLabel}</span>
    </div>
    <input
      type="range"
      min="1"
      max="5"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      disabled={disabled}
      className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const BrandIntelligenceStep: React.FC<BrandIntelligenceStepProps> = ({
  defaultDomain,
  apifyToken,
  geminiApiKey,
  anthropicApiKey,
  supabaseUrl,
  supabaseAnonKey,
  projectId,
  designDna,
  brandDesignSystem,
  screenshotBase64,
  savedSourceUrl,
  savedExtractedAt,
  isLoadingSavedData,
  savedUrlSuggestions,
  savedComponents,
  onDetectionComplete,
  onDesignDnaChange,
  onRegenerate,
  onReset,
}) => {
  const [targetUrl, setTargetUrl] = useState(defaultDomain || '');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isRegeneratingStyles, setIsRegeneratingStyles] = useState(false);
  const [extractionMode, setExtractionMode] = useState<'full' | 'quick'>('full');

  // Quick detection hook (single URL)
  const detection = useBrandDetection({
    apifyToken,
    geminiApiKey,
    anthropicApiKey,
    supabaseUrl,
    supabaseAnonKey,
    projectId,
  });

  // Full extraction hook (multi-page)
  const brandExtraction = useBrandExtraction(
    projectId || '',
    'gemini',
    geminiApiKey || '',
    apifyToken // Required for URL discovery
  );

  const handleDetect = useCallback(() => {
    if (!targetUrl) return;
    detection.detect(targetUrl);
  }, [targetUrl, detection]);

  // Track which detection result we've already notified parent about (prevents infinite loop)
  // The loop happened because onDetectionComplete was in the dependency array,
  // and every time the parent updated state, the callback reference changed,
  // triggering this effect again even though the detection.result was the same.
  const lastNotifiedResultRef = useRef<typeof detection.result>(null);
  const lastNotifiedExtractionPhaseRef = useRef<string | null>(null);

  // Notify parent when Quick Detection completes (only once per unique result)
  useEffect(() => {
    if (detection.result && detection.result !== lastNotifiedResultRef.current) {
      lastNotifiedResultRef.current = detection.result;
      onDetectionComplete({
        designDna: detection.result.designDna,
        designSystem: detection.result.designSystem,
        screenshotBase64: detection.result.screenshotBase64,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDetectionComplete intentionally excluded to prevent infinite loops
  }, [detection.result]);

  // Notify parent when Full Extraction completes - convert tokens to DesignDNA
  useEffect(() => {
    const lightenColor = (hex: string, factor: number): string => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return '#' + [r, g, b].map(c =>
        Math.round(c + (255 - c) * factor).toString(16).padStart(2, '0')
      ).join('');
    };

    const darkenColor = (hex: string, factor: number): string => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return '#' + [r, g, b].map(c =>
        Math.round(c * (1 - factor)).toString(16).padStart(2, '0')
      ).join('');
    };

    const processFullExtraction = async () => {
      // Only process once when phase becomes 'complete'
      if (
        brandExtraction.phase === 'complete' &&
        brandExtraction.extractedTokens &&
        lastNotifiedExtractionPhaseRef.current !== 'complete'
      ) {
        lastNotifiedExtractionPhaseRef.current = 'complete';
        console.log('[BrandIntelligenceStep] Full Extraction complete, converting tokens to DesignDNA...');

        const tokens = brandExtraction.extractedTokens;

        // Usage-aware color lookups (instead of fragile index-based assignment)
        const findColorByUsage = (usage: string, exclude?: string[]) =>
          tokens.colors?.values?.find((c: { hex?: string; usage?: string }) => {
            const u = c.usage?.toLowerCase() || '';
            if (!u.includes(usage)) return false;
            if (exclude?.some(ex => u.includes(ex))) return false;
            return true;
          });

        const primaryHex = findColorByUsage('primary', ['light', 'dark'])?.hex || tokens.colors?.values?.[0]?.hex || '#3b82f6';
        let secondaryHex = findColorByUsage('secondary')?.hex || tokens.colors?.values?.[1]?.hex || '#1f2937';
        let accentHex = findColorByUsage('accent')?.hex || tokens.colors?.values?.[2]?.hex || '#f59e0b';

        console.log('[BrandIntelligenceStep] Color lookup results (raw) - primary:', primaryHex, 'secondary:', secondaryHex, 'accent:', accentHex);

        // Validate colors - reject useless colors (white, near-white, near-black, grays)
        const isUselessColor = (hex: string): boolean => {
          if (!hex) return true;
          const normalized = hex.toLowerCase().replace('#', '');
          // Known useless values
          if (['000000', 'ffffff', 'fff', '000', 'f3f5f5', 'f9fafb', 'e5e7eb', 'f5f5f5', 'fafafa'].includes(normalized)) return true;
          // Check if it's a gray or near-neutral
          const r = parseInt(normalized.slice(0, 2), 16);
          const g = parseInt(normalized.slice(2, 4), 16);
          const b = parseInt(normalized.slice(4, 6), 16);
          if (isNaN(r) || isNaN(g) || isNaN(b)) return true;
          // Near-white (all channels > 230) or near-black (all channels < 25)
          if (r > 230 && g > 230 && b > 230) return true;
          if (r < 25 && g < 25 && b < 25) return true;
          // Gray (channels within 20 of each other)
          if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20) return true;
          return false;
        };

        // Check if color is too similar to another (within delta)
        const isTooSimilar = (hex1: string, hex2: string, threshold = 40): boolean => {
          const r1 = parseInt(hex1.replace('#', '').slice(0, 2), 16);
          const g1 = parseInt(hex1.replace('#', '').slice(2, 4), 16);
          const b1 = parseInt(hex1.replace('#', '').slice(4, 6), 16);
          const r2 = parseInt(hex2.replace('#', '').slice(0, 2), 16);
          const g2 = parseInt(hex2.replace('#', '').slice(2, 4), 16);
          const b2 = parseInt(hex2.replace('#', '').slice(4, 6), 16);
          return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) < threshold;
        };

        // Compute complementary color (rotate hue 180°)
        const computeComplementary = (hex: string): string => {
          const r = parseInt(hex.replace('#', '').slice(0, 2), 16) / 255;
          const g = parseInt(hex.replace('#', '').slice(2, 4), 16) / 255;
          const b = parseInt(hex.replace('#', '').slice(4, 6), 16) / 255;
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          const l = (max + min) / 2;
          let h = 0, s = 0;
          if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            else if (max === g) h = ((b - r) / d + 2) / 6;
            else h = ((r - g) / d + 4) / 6;
          }
          h = (h + 0.5) % 1; // Rotate 180°
          // HSL to RGB
          const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1; if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
          };
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          const ro = Math.round(hue2rgb(p, q, h + 1/3) * 255);
          const go = Math.round(hue2rgb(p, q, h) * 255);
          const bo = Math.round(hue2rgb(p, q, h - 1/3) * 255);
          return '#' + [ro, go, bo].map(c => c.toString(16).padStart(2, '0')).join('');
        };

        // Fix useless accent: compute complementary from primary
        if (isUselessColor(accentHex) || isTooSimilar(accentHex, primaryHex)) {
          const computed = computeComplementary(primaryHex);
          console.log('[BrandIntelligenceStep] Accent was useless/duplicate, computed complementary:', computed);
          accentHex = computed;
        }

        // Fix useless secondary: derive darker shade from primary
        if (isUselessColor(secondaryHex) || isTooSimilar(secondaryHex, primaryHex)) {
          const derived = darkenColor(primaryHex, 0.4);
          console.log('[BrandIntelligenceStep] Secondary was useless/duplicate, derived from primary:', derived);
          secondaryHex = derived;
        }

        console.log('[BrandIntelligenceStep] Color lookup results (final) - primary:', primaryHex, 'secondary:', secondaryHex, 'accent:', accentHex);

        // Convert extracted tokens to DesignDNA format
        const designDna: DesignDNA = {
          colors: {
            primary: {
              hex: primaryHex,
              usage: 'primary',
              confidence: 0.9
            },
            primaryLight: {
              hex: lightenColor(primaryHex, 0.3),
              usage: 'primary light variant',
              confidence: 0.8
            },
            primaryDark: {
              hex: darkenColor(primaryHex, 0.2),
              usage: 'primary dark variant',
              confidence: 0.8
            },
            secondary: {
              hex: secondaryHex,
              usage: 'secondary',
              confidence: 0.8
            },
            accent: {
              hex: accentHex,
              usage: 'accent',
              confidence: 0.7
            },
            neutrals: {
              darkest: '#111827',
              dark: '#374151',
              medium: '#6b7280',
              light: '#e5e7eb',
              lightest: '#f9fafb'
            },
            semantic: {
              success: '#10b981',
              warning: '#f59e0b',
              error: '#ef4444',
              info: '#3b82f6'
            },
            harmony: 'complementary',
            dominantMood: 'corporate',
            contrastLevel: 'medium'
          },
          typography: {
            headingFont: {
              family: tokens.typography?.headings?.fontFamily || 'system-ui',
              fallback: 'sans-serif',
              weight: tokens.typography?.headings?.fontWeight || 700,
              style: 'sans-serif',
              character: 'modern'
            },
            bodyFont: {
              family: tokens.typography?.body?.fontFamily || 'system-ui',
              fallback: 'sans-serif',
              weight: tokens.typography?.body?.fontWeight || 400,
              style: 'sans-serif',
              lineHeight: tokens.typography?.body?.lineHeight || 1.6
            },
            scaleRatio: 1.25,
            baseSize: '16px',
            headingCase: 'none',
            headingLetterSpacing: '-0.02em',
            usesDropCaps: false,
            headingUnderlineStyle: 'none',
            linkStyle: 'underline'
          },
          spacing: {
            baseUnit: 8,
            density: 'comfortable',
            sectionGap: 'moderate',
            contentWidth: 'medium',
            whitespacePhilosophy: 'balanced'
          },
          shapes: {
            borderRadius: {
              style: 'subtle',
              small: tokens.borders?.radiusSmall || '4px',
              medium: tokens.borders?.radiusMedium || '8px',
              large: tokens.borders?.radiusLarge || '16px',
              full: '9999px'
            },
            buttonStyle: 'soft',
            cardStyle: 'subtle-shadow',
            inputStyle: 'bordered'
          },
          effects: {
            shadows: {
              style: 'subtle',
              cardShadow: tokens.shadows?.card || '0 1px 3px rgba(0,0,0,0.1)',
              buttonShadow: tokens.shadows?.button || 'none',
              elevatedShadow: tokens.shadows?.elevated || '0 4px 6px rgba(0,0,0,0.1)'
            },
            gradients: {
              usage: tokens.gradients ? 'subtle' : 'none',
              primaryGradient: tokens.gradients?.hero || 'none',
              heroGradient: tokens.gradients?.hero || 'none',
              ctaGradient: tokens.gradients?.cta || 'none'
            },
            backgrounds: {
              usesPatterns: false,
              usesTextures: false,
              usesOverlays: false
            },
            borders: {
              style: 'subtle',
              defaultColor: tokens.borders?.defaultColor || '#e5e7eb',
              accentBorderUsage: false
            }
          },
          decorative: {
            dividerStyle: 'line',
            usesFloatingShapes: false,
            usesCornerAccents: false,
            usesWaveShapes: false,
            usesGeometricPatterns: false,
            iconStyle: 'outline',
            decorativeAccentColor: tokens.colors?.values?.[0]?.hex || '#3b82f6'
          },
          layout: {
            gridStyle: 'strict-12',
            alignment: 'left',
            heroStyle: 'contained',
            cardLayout: 'grid',
            ctaPlacement: 'section-end',
            navigationStyle: 'standard'
          },
          motion: {
            overall: 'subtle',
            transitionSpeed: 'normal',
            easingStyle: 'ease',
            hoverEffects: {
              buttons: 'darken',
              cards: 'lift',
              links: 'color'
            },
            scrollAnimations: false,
            parallaxEffects: false
          },
          images: {
            treatment: 'natural',
            frameStyle: 'rounded',
            hoverEffect: 'none',
            aspectRatioPreference: '16:9'
          },
          componentPreferences: {
            preferredListStyle: 'bullets',
            preferredCardStyle: 'bordered',
            testimonialStyle: 'card',
            faqStyle: 'accordion',
            ctaStyle: 'button'
          },
          personality: {
            overall: 'corporate',
            formality: 4,
            energy: 3,
            warmth: 3,
            trustSignals: 'moderate'
          },
          confidence: {
            overall: 75,
            colorsConfidence: 85,
            typographyConfidence: 80,
            layoutConfidence: 70
          },
          analysisNotes: ['Extracted via Full Brand Extraction from multiple pages']
        };

        // Merge DOM-extracted high-confidence colors into DesignDNA
        // Only accept colors that are useful (not white/black/gray/near-neutral)
        if (brandExtraction.extractedTokens?.colors?.values) {
          const colorValues = brandExtraction.extractedTokens.colors.values;
          for (const cv of colorValues) {
            if (!cv?.hex || !cv?.usage) continue;
            const usage = cv.usage.toLowerCase();
            if (usage.includes('primary') && !usage.includes('light') && !usage.includes('dark')) {
              // Guard: only accept useful, non-gray/white/black primary from DOM
              if (!isUselessColor(cv.hex)) {
                designDna.colors.primary.hex = cv.hex;
                designDna.colors.primary.confidence = 0.95;
                // Recompute light/dark
                designDna.colors.primaryLight.hex = lightenColor(cv.hex, 0.3);
                designDna.colors.primaryDark.hex = darkenColor(cv.hex, 0.2);
                console.log('[BrandIntelligenceStep] Matched primary color by usage:', cv.hex);
              } else {
                console.log('[BrandIntelligenceStep] SKIPPED useless DOM primary color:', cv.hex, 'usage:', cv.usage);
              }
            } else if (usage.includes('secondary') && !isUselessColor(cv.hex) && !isTooSimilar(cv.hex, designDna.colors.primary.hex)) {
              designDna.colors.secondary.hex = cv.hex;
              designDna.colors.secondary.confidence = 0.9;
              console.log('[BrandIntelligenceStep] Matched secondary color by usage:', cv.hex);
            } else if (usage.includes('accent') && !isUselessColor(cv.hex) && !isTooSimilar(cv.hex, designDna.colors.primary.hex)) {
              designDna.colors.accent.hex = cv.hex;
              designDna.colors.accent.confidence = 0.85;
              console.log('[BrandIntelligenceStep] Matched accent color by usage:', cv.hex);
            }
          }
        }

        // Merge DOM-extracted fonts
        if (brandExtraction.extractedTokens?.typography?.headings?.fontFamily &&
            brandExtraction.extractedTokens.typography.headings.fontFamily !== 'system-ui') {
          designDna.typography.headingFont.family = brandExtraction.extractedTokens.typography.headings.fontFamily;
          console.log('[BrandIntelligenceStep] Using extracted heading font:', designDna.typography.headingFont.family);
        }
        if (brandExtraction.extractedTokens?.typography?.body?.fontFamily &&
            brandExtraction.extractedTokens.typography.body.fontFamily !== 'system-ui') {
          designDna.typography.bodyFont.family = brandExtraction.extractedTokens.typography.body.fontFamily;
          console.log('[BrandIntelligenceStep] Using extracted body font:', designDna.typography.bodyFont.family);
        }

        // Create placeholder design system so UI can show brand summary immediately
        const placeholderDesignSystem: BrandDesignSystem = {
          id: `bds_placeholder_${Date.now()}`,
          brandName: 'Extracted Brand',
          sourceUrl: brandExtraction.selectedUrls[0] || '',
          generatedAt: new Date().toISOString(),
          designDnaHash: 'placeholder',
          tokens: { css: '', json: {} },
          componentStyles: {} as BrandDesignSystem['componentStyles'],
          decorative: {
            dividers: { default: '', subtle: '', decorative: '' },
            sectionBackgrounds: { default: '', accent: '', featured: '' }
          },
          interactions: {
            buttonHover: '', buttonActive: '', buttonFocus: '',
            cardHover: '', linkHover: '', focusRing: '', keyframes: {}
          },
          typographyTreatments: {
            headingDecoration: '', dropCap: '', pullQuote: '',
            listMarker: '', linkUnderline: '', codeBlock: ''
          },
          imageTreatments: { defaultFrame: '', featured: '', thumbnail: '', gallery: '' },
          compiledCss: '', // Empty - CSS generation will update this
          variantMappings: { card: {}, hero: {}, button: {}, cta: {} }
        };

        // Immediately notify parent with DesignDNA so brand summary shows right away
        console.log('[BrandIntelligenceStep] Notifying parent with DesignDNA (CSS generation pending)...');
        onDetectionComplete({
          designDna,
          designSystem: placeholderDesignSystem,
          screenshotBase64: brandExtraction.screenshotBase64 || '',
          extractedComponents: brandExtraction.extractedComponents,
        });

        // Generate full BrandDesignSystem with CSS in the background
        try {
          const generator = new BrandDesignSystemGenerator({
            provider: geminiApiKey ? 'gemini' : 'anthropic',
            apiKey: geminiApiKey || anthropicApiKey || '',
          });

          // Construct Google Fonts URL from extracted font families
          const headingFamily = designDna.typography?.headingFont?.family?.split(',')[0]?.trim();
          const bodyFamily = designDna.typography?.bodyFont?.family?.split(',')[0]?.trim();
          const systemFonts = ['system-ui', 'sans-serif', 'serif', 'monospace', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Tahoma'];
          const googleFontFamilies: string[] = [];
          if (headingFamily && !systemFonts.includes(headingFamily)) {
            googleFontFamilies.push(headingFamily);
          }
          if (bodyFamily && !systemFonts.includes(bodyFamily) && bodyFamily !== headingFamily) {
            googleFontFamilies.push(bodyFamily);
          }
          const googleFontsUrl = googleFontFamilies.length > 0
            ? `https://fonts.googleapis.com/css2?${googleFontFamilies.map(f => `family=${encodeURIComponent(f)}:wght@400;600;700`).join('&')}&display=swap`
            : undefined;
          if (googleFontsUrl) {
            console.log('[BrandIntelligenceStep] Constructed Google Fonts URL:', googleFontsUrl);
          }

          const designSystem = await generator.generate(
            designDna,
            'Extracted Brand',
            brandExtraction.selectedUrls[0] || '',
            brandExtraction.screenshotBase64 || undefined,
            googleFontsUrl
          );

          console.log('[BrandIntelligenceStep] Generated design system, CSS length:', designSystem.compiledCss?.length);

          // Expose compiled CSS for E2E testing/debugging
          if (typeof window !== 'undefined') {
            (window as unknown as Record<string, unknown>).__BRAND_COMPILED_CSS__ = designSystem.compiledCss;
            (window as unknown as Record<string, unknown>).__BRAND_DESIGN_SYSTEM__ = designSystem;
          }

          // Update parent with the full design system (with generated CSS)
          onDetectionComplete({
            designDna,
            designSystem,
            screenshotBase64: brandExtraction.screenshotBase64 || '',
            extractedComponents: brandExtraction.extractedComponents,
          });

          console.log('[BrandIntelligenceStep] Full Extraction flow complete, notified parent with CSS');
        } catch (err) {
          console.error('[BrandIntelligenceStep] CSS generation failed, using placeholder:', err);
          // Parent already has DesignDNA from the immediate notification above
          // The placeholder design system will trigger legacy CSS fallback in the renderer
        }
      }
    };

    processFullExtraction();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDetectionComplete intentionally excluded to prevent infinite loops
  }, [brandExtraction.phase, brandExtraction.extractedTokens, brandExtraction.screenshotBase64, brandExtraction.selectedUrls, geminiApiKey, anthropicApiKey]);

  // Personality slider handler
  const handlePersonalityChange = useCallback(
    (field: 'formality' | 'energy' | 'warmth', value: number) => {
      if (!onDesignDnaChange) return;

      // Use current DNA from props or detection result
      const currentDna = designDna || detection.result?.designDna;
      if (!currentDna) return;

      onDesignDnaChange({
        ...currentDna,
        personality: {
          overall: currentDna.personality?.overall || 'corporate',
          formality: currentDna.personality?.formality || 3,
          energy: currentDna.personality?.energy || 3,
          warmth: currentDna.personality?.warmth || 3,
          ...currentDna.personality,
          [field]: value as 1 | 2 | 3 | 4 | 5,
        },
      });
    },
    [designDna, detection.result, onDesignDnaChange]
  );

  // Get label for personality value
  const getPersonalityLabel = (
    field: 'formality' | 'energy' | 'warmth',
    value: number
  ): string => {
    const labels: Record<string, Record<number, string>> = {
      formality: { 1: 'Very Casual', 2: 'Casual', 3: 'Balanced', 4: 'Formal', 5: 'Corporate' },
      energy: { 1: 'Very Calm', 2: 'Calm', 3: 'Moderate', 4: 'Energetic', 5: 'Bold' },
      warmth: { 1: 'Very Cool', 2: 'Cool', 3: 'Neutral', 4: 'Warm', 5: 'Very Warm' },
    };
    return labels[field][value] || 'Unknown';
  };

  // Handle regenerate request - clears saved data and triggers new detection
  const handleRegenerate = useCallback(() => {
    setIsRegenerating(true);
    // Reset detection state
    detection.reset();
    // Notify parent to clear saved data
    if (onRegenerate) {
      onRegenerate();
    }
    setIsRegenerating(false);
  }, [detection, onRegenerate]);

  // Handle regenerate styles - regenerates CSS from existing DesignDNA without re-crawling
  const handleRegenerateStyles = useCallback(async () => {
    const apiKey = geminiApiKey || anthropicApiKey;
    if (!designDna || !apiKey) {
      console.warn('[BrandIntelligenceStep] Cannot regenerate styles: missing designDna or API key');
      return;
    }

    setIsRegeneratingStyles(true);
    try {
      console.log('[BrandIntelligenceStep] Regenerating CSS from existing DesignDNA...');

      const generator = new BrandDesignSystemGenerator({
        provider: geminiApiKey ? 'gemini' : 'anthropic',
        apiKey,
      });

      // Construct Google Fonts URL from DesignDNA font families
      const regenHeadingFamily = designDna.typography?.headingFont?.family?.split(',')[0]?.trim();
      const regenBodyFamily = designDna.typography?.bodyFont?.family?.split(',')[0]?.trim();
      const regenSystemFonts = ['system-ui', 'sans-serif', 'serif', 'monospace', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Tahoma'];
      const regenGoogleFamilies: string[] = [];
      if (regenHeadingFamily && !regenSystemFonts.includes(regenHeadingFamily)) {
        regenGoogleFamilies.push(regenHeadingFamily);
      }
      if (regenBodyFamily && !regenSystemFonts.includes(regenBodyFamily) && regenBodyFamily !== regenHeadingFamily) {
        regenGoogleFamilies.push(regenBodyFamily);
      }
      const regenGoogleFontsUrl = regenGoogleFamilies.length > 0
        ? `https://fonts.googleapis.com/css2?${regenGoogleFamilies.map(f => `family=${encodeURIComponent(f)}:wght@400;600;700`).join('&')}&display=swap`
        : undefined;

      const newDesignSystem = await generator.generate(
        designDna,
        brandDesignSystem?.brandName || 'Brand',
        brandDesignSystem?.sourceUrl || savedSourceUrl || '',
        screenshotBase64 || undefined,
        regenGoogleFontsUrl
      );

      console.log('[BrandIntelligenceStep] CSS regeneration complete, compiledCss length:', newDesignSystem.compiledCss?.length);

      // Notify parent with updated design system
      onDetectionComplete({
        designDna: designDna,
        designSystem: newDesignSystem,
        screenshotBase64: screenshotBase64 || '',
      });
    } catch (error) {
      console.error('[BrandIntelligenceStep] Failed to regenerate styles:', error);
    } finally {
      setIsRegeneratingStyles(false);
    }
  }, [designDna, geminiApiKey, anthropicApiKey, brandDesignSystem, savedSourceUrl, screenshotBase64, onDetectionComplete]);

  // Format the saved date for display
  const formatSavedDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Check for stored extractions when component mounts (for re-analyze option)
  useEffect(() => {
    if (projectId) {
      brandExtraction.checkStoredExtractions();
    }
  }, [projectId, brandExtraction.checkStoredExtractions]);

  // Load saved URL suggestions into extraction hook when available
  useEffect(() => {
    if (
      savedUrlSuggestions &&
      savedUrlSuggestions.length > 0 &&
      brandExtraction.phase === 'idle' &&
      brandExtraction.suggestions.length === 0
    ) {
      brandExtraction.loadSavedSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when savedUrlSuggestions changes
  }, [savedUrlSuggestions]);

  // State for re-analysis in progress
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  // Handle re-analyze request
  const handleReanalyze = useCallback(async () => {
    setIsReanalyzing(true);
    try {
      await brandExtraction.reanalyze();
    } finally {
      setIsReanalyzing(false);
    }
  }, [brandExtraction.reanalyze]);

  // Use the current state from props (if already detected) or detection result
  const currentDna = designDna || detection.result?.designDna;
  const currentScreenshot = screenshotBase64 || detection.result?.screenshotBase64;
  const hasDetection = Boolean(currentDna);
  const hasSavedData = Boolean(savedSourceUrl && savedExtractedAt && hasDetection);

  // Expose design system for E2E testing/debugging (works for both saved and fresh data)
  if (typeof window !== 'undefined' && brandDesignSystem?.compiledCss) {
    (window as unknown as Record<string, unknown>).__BRAND_COMPILED_CSS__ = brandDesignSystem.compiledCss;
    (window as unknown as Record<string, unknown>).__BRAND_DESIGN_SYSTEM__ = brandDesignSystem;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">&#127912;</span>
        <div>
          <h3 className="text-lg font-bold text-white">Brand Intelligence</h3>
          <p className="text-xs text-zinc-400">
            AI-powered design extraction from your website
          </p>
        </div>
      </div>

      {/* Mode Toggle - show when no detection yet */}
      {!hasDetection && !detection.isAnalyzing && !isLoadingSavedData && (
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setExtractionMode('full')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              extractionMode === 'full'
                ? 'bg-zinc-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Full Extraction (Recommended)
          </button>
          <button
            type="button"
            onClick={() => setExtractionMode('quick')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              extractionMode === 'quick'
                ? 'bg-zinc-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Quick Detection
          </button>
        </div>
      )}

      {/* Loading saved data indicator */}
      {isLoadingSavedData && (
        <div className="p-4 bg-zinc-900/40 rounded-lg border border-zinc-600/30 flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="text-sm text-zinc-300">Loading saved brand data...</span>
        </div>
      )}

      {/* Saved data banner - show when using previously saved detection */}
      {hasSavedData && !detection.isAnalyzing && (
        <div className="p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/20 rounded-lg border border-green-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">&#9989;</span>
              <div>
                <p className="text-sm text-green-300 font-medium">Using saved brand profile</p>
                <p className="text-xs text-zinc-400">
                  Analyzed from <span className="text-zinc-300">{savedSourceUrl}</span>
                  {savedExtractedAt && (
                    <> on <span className="text-zinc-300">{formatSavedDate(savedExtractedAt)}</span></>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleRegenerateStyles}
                disabled={isRegeneratingStyles || !geminiApiKey}
                className="text-xs bg-blue-600 hover:bg-blue-500"
              >
                {isRegeneratingStyles ? 'Regenerating...' : '🎨 Regenerate Styling'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating || !apifyToken}
                className="text-xs"
              >
                {isRegenerating ? 'Clearing...' : '↻ Re-analyze'}
              </Button>
            </div>
          </div>

          {/* Saved extraction stats */}
          {(savedUrlSuggestions && savedUrlSuggestions.length > 0) || (savedComponents && savedComponents.length > 0) ? (
            <div className="flex gap-3 mt-3 pt-3 border-t border-green-500/20">
              {savedUrlSuggestions && savedUrlSuggestions.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-lg">
                  <span className="text-xs text-zinc-400">Discovered Pages</span>
                  <span className="text-sm font-semibold text-zinc-200">{savedUrlSuggestions.length}</span>
                </div>
              )}
              {savedComponents && savedComponents.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-lg">
                  <span className="text-xs text-zinc-400">Extracted Components</span>
                  <span className="text-sm font-semibold text-zinc-200">{savedComponents.length}</span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* FULL EXTRACTION MODE - Multi-page URL Discovery */}
      {extractionMode === 'full' && !hasDetection && !detection.isAnalyzing && !isLoadingSavedData && (
        <div className="p-5 bg-gradient-to-br from-zinc-900/40 to-stone-900/20 rounded-2xl border-2 border-zinc-500/50 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-zinc-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-bl-lg">
            Recommended
          </div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">&#127919;</span>
            <div>
              <h3 className="text-base font-bold text-white">Full Brand Extraction</h3>
              <p className="text-xs text-zinc-300/70">Extract design from multiple pages for comprehensive brand replication</p>
            </div>
          </div>

          {/* Render based on phase - include 'error' phase with URL discovery so users can retry */}
          {brandExtraction.phase === 'idle' || brandExtraction.phase === 'discovering' || brandExtraction.phase === 'selecting' || brandExtraction.phase === 'error' ? (
            <BrandUrlDiscovery
              suggestions={brandExtraction.suggestions}
              selectedUrls={brandExtraction.selectedUrls}
              onToggleUrl={brandExtraction.toggleUrlSelection}
              onSelectAll={brandExtraction.selectAllUrls}
              onClearSelection={brandExtraction.clearSelection}
              onDiscover={brandExtraction.discoverUrls}
              onStartExtraction={brandExtraction.startExtraction}
              isDiscovering={brandExtraction.phase === 'discovering'}
            />
          ) : brandExtraction.phase === 'extracting' || brandExtraction.phase === 'analyzing' ? (
            <BrandExtractionProgress progress={brandExtraction.progress} />
          ) : brandExtraction.phase === 'complete' ? (
            <div className="space-y-4">
              <BrandExtractionProgress progress={brandExtraction.progress} />
              <BrandComponentPreview components={brandExtraction.extractedComponents} />
            </div>
          ) : null}

          {brandExtraction.error && (
            <p className="text-xs text-red-400 mt-3 bg-red-900/30 p-2.5 rounded-lg border border-red-500/30">
              &#9888;&#65039; {brandExtraction.error}
            </p>
          )}

          {/* Fallback info when Full Extraction is selected but not yet started */}
          {brandExtraction.phase === 'idle' && brandExtraction.suggestions.length === 0 && (
            <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-300/80 bg-zinc-500/10 p-2 rounded-lg border border-zinc-500/20">
              <span>&#128161;</span>
              <span>Enter your domain to discover key pages. We'll extract design elements from each page for pixel-perfect replication.</span>
            </div>
          )}
        </div>
      )}

      {/* QUICK DETECTION MODE - Single URL */}
      {extractionMode === 'quick' && !hasDetection && !detection.isAnalyzing && !isLoadingSavedData && (
        <div className="p-5 bg-gradient-to-br from-zinc-900/40 to-stone-900/20 rounded-2xl border border-zinc-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-gray-700 text-gray-300 text-[10px] font-bold uppercase tracking-widest rounded-bl-lg">
            Quick
          </div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl animate-pulse">&#10024;</span>
            <div>
              <h3 className="text-base font-bold text-white">Quick Brand Detection</h3>
              <p className="text-xs text-zinc-300/70">Extract colors, fonts, and style from a single page</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="https://your-website.com"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="flex-1 bg-gray-900/80 border-zinc-600/30"
            />
            <Button
              onClick={handleDetect}
              disabled={!targetUrl || !apifyToken}
              className="min-w-[140px] bg-blue-600 hover:bg-blue-500"
            >
              Detect Brand
            </Button>
          </div>
          {!apifyToken && (
            <p className="text-xs text-yellow-400 mt-3">
              &#9888; Add an Apify API token in Settings to enable brand detection
            </p>
          )}
          <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-300/80 bg-zinc-500/10 p-2 rounded-lg border border-zinc-500/20">
            <span>&#128161;</span>
            <span>Quick detection analyzes a single page. For comprehensive brand extraction, use Full Extraction mode.</span>
          </div>
        </div>
      )}

      {/* Progress */}
      {detection.isAnalyzing && (
        <div className="p-6 bg-zinc-900/40 rounded-2xl border border-zinc-500/30">
          <AnalysisProgress
            steps={detection.steps}
            progress={detection.progress}
            error={detection.error || undefined}
          />
        </div>
      )}

      {/* Error */}
      {detection.error && !detection.isAnalyzing && (
        <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-300">{detection.error}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => detection.reset()}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Results - Brand Summary */}
      {currentDna && (
        <>
          {/* Screenshot + Summary Row */}
          <div className="flex gap-6">
            {/* Screenshot */}
            {currentScreenshot && (
              <div className="flex-shrink-0">
                <div className="w-48 h-36 rounded-lg overflow-hidden border border-zinc-700 shadow-lg">
                  <img
                    src={`data:image/png;base64,${currentScreenshot}`}
                    alt="Brand screenshot"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-white">Brand Summary</h4>
                <div className="flex gap-2">
                  {/* Re-analyze button - uses stored data, faster */}
                  {brandExtraction.hasStoredExtractions && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleReanalyze}
                      disabled={isReanalyzing || brandExtraction.phase === 'analyzing'}
                      title="Re-run AI analysis on stored pages (faster, no re-crawling)"
                    >
                      {isReanalyzing || brandExtraction.phase === 'analyzing' ? 'Analyzing...' : 'Re-analyze'}
                    </Button>
                  )}
                  {/* Re-detect button - full re-crawl */}
                  <Button variant="secondary" size="sm" onClick={() => {
                    detection.reset();
                    onReset?.(); // Clear parent's cached state
                  }}>
                    Re-detect
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-zinc-400">Heading Font:</span>
                  <span className="ml-2 text-white font-medium">
                    {currentDna.typography?.headingFont?.family || 'System UI'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400">Body Font:</span>
                  <span className="ml-2 text-white font-medium">
                    {currentDna.typography?.bodyFont?.family || 'System UI'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400">Style:</span>
                  <span className="ml-2 text-white capitalize">
                    {currentDna.personality?.overall || 'corporate'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400">Confidence:</span>
                  <span className="ml-2 text-green-400 font-medium">
                    {Math.round(currentDna.confidence?.overall || 50)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CSS Generation Status */}
          {brandDesignSystem && !brandDesignSystem.compiledCss && (
            <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-xl flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <p className="text-sm text-blue-300">
                Generating brand-matched CSS styles... The brand summary is ready for review while styles are being created.
              </p>
            </div>
          )}

          {/* Color Palette */}
          <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-700/50">
            <h4 className="text-sm font-medium text-zinc-300 mb-3">Color Palette</h4>
            <div className="flex gap-3 flex-wrap">
              <ColorSwatch label="Primary" color={currentDna.colors?.primary?.hex || '#3b82f6'} />
              <ColorSwatch label="Secondary" color={currentDna.colors?.secondary?.hex || '#1f2937'} />
              <ColorSwatch label="Accent" color={currentDna.colors?.accent?.hex || '#f59e0b'} />
              <ColorSwatch label="Background" color={currentDna.colors?.neutrals?.lightest || '#f9fafb'} />
              <ColorSwatch label="Surface" color={currentDna.colors?.neutrals?.light || '#f3f4f6'} />
              <ColorSwatch label="Text" color={currentDna.colors?.neutrals?.darkest || '#111827'} />
            </div>
          </div>

          {/* Personality Sliders - VISIBLE INLINE */}
          <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-700/50">
            <h4 className="text-sm font-medium text-zinc-300 mb-4">Personality Adjustments</h4>
            <div className="space-y-5">
              {/* Formality Slider */}
              <PersonalitySlider
                label="Formality"
                value={currentDna.personality?.formality || 3}
                lowLabel="Casual"
                highLabel="Formal"
                currentLabel={getPersonalityLabel('formality', currentDna.personality?.formality || 3)}
                onChange={(value) => handlePersonalityChange('formality', value)}
                disabled={!onDesignDnaChange}
              />

              {/* Energy Slider */}
              <PersonalitySlider
                label="Energy"
                value={currentDna.personality?.energy || 3}
                lowLabel="Calm"
                highLabel="Bold"
                currentLabel={getPersonalityLabel('energy', currentDna.personality?.energy || 3)}
                onChange={(value) => handlePersonalityChange('energy', value)}
                disabled={!onDesignDnaChange}
              />

              {/* Warmth Slider */}
              <PersonalitySlider
                label="Warmth"
                value={currentDna.personality?.warmth || 3}
                lowLabel="Cool"
                highLabel="Warm"
                currentLabel={getPersonalityLabel('warmth', currentDna.personality?.warmth || 3)}
                onChange={(value) => handlePersonalityChange('warmth', value)}
                disabled={!onDesignDnaChange}
              />
            </div>
          </div>

          {/* Design DNA Visual Summary */}
          {currentDna.componentPreferences && (
            <div className="border border-zinc-700/50 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-medium text-zinc-300">Detected Component Styles</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(currentDna.componentPreferences).map(([key, value]) => {
                  const label = key.replace('preferred', '').replace(/([A-Z])/g, ' $1').replace('Style', '').trim();
                  return (
                    <span key={key} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs">
                      <span className="text-zinc-400">{label}:</span>
                      <span className="text-white font-medium">{String(value)}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Confidence Scores */}
          {currentDna.confidence && (
            <div className="border border-zinc-700/50 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-medium text-zinc-300">Detection Confidence</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Colors', value: currentDna.confidence.colorsConfidence },
                  { label: 'Typography', value: currentDna.confidence.typographyConfidence },
                  { label: 'Layout', value: currentDna.confidence.layoutConfidence },
                  { label: 'Overall', value: currentDna.confidence.overall },
                ].filter(item => item.value != null).map(item => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400">{item.label}</span>
                      <span className={`font-medium ${
                        (item.value || 0) >= 80 ? 'text-green-400' :
                        (item.value || 0) >= 60 ? 'text-yellow-400' : 'text-red-400'
                      }`}>{item.value}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (item.value || 0) >= 80 ? 'bg-green-500' :
                          (item.value || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${item.value || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expandable raw details (for power users) */}
          <div className="border border-zinc-700/50 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full p-4 flex items-center justify-between bg-zinc-900/40 hover:bg-zinc-800/50 transition-colors"
            >
              <span className="text-xs text-zinc-500">
                Raw Design DNA (technical details)
              </span>
              <span
                className={`text-zinc-500 text-xs transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              >
                &#9660;
              </span>
            </button>
            {isExpanded && (
              <div className="p-4 bg-zinc-950/50 text-xs font-mono text-zinc-400 max-h-96 overflow-auto">
                <pre>{JSON.stringify(currentDna, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Post-extraction guidance */}
          <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
            <p className="text-sm text-blue-300">
              Review the brand profile above. You can adjust the personality sliders to fine-tune the styling.
              When ready, click <span className="font-semibold">Next</span> to proceed to the Layout step.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default BrandIntelligenceStep;
