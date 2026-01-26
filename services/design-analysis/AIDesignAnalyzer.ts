import type { DesignDNA, DesignDNAExtractionResult } from '../../types/designDna';
import { DESIGN_DNA_EXTRACTION_PROMPT } from './prompts/designDnaPrompt';

// ============================================================================
// DEFAULT VALUES FOR SANITIZATION
// ============================================================================

const DEFAULT_COLOR_WITH_USAGE = { hex: '#3b82f6', usage: 'default', confidence: 50 };

const DEFAULT_DESIGN_DNA: DesignDNA = {
  colors: {
    primary: { hex: '#3b82f6', usage: 'primary brand', confidence: 80 },
    primaryLight: { hex: '#60a5fa', usage: 'light variant', confidence: 70 },
    primaryDark: { hex: '#2563eb', usage: 'dark variant', confidence: 70 },
    secondary: { hex: '#1f2937', usage: 'secondary', confidence: 70 },
    accent: { hex: '#f59e0b', usage: 'accent/CTA', confidence: 70 },
    neutrals: {
      darkest: '#111827',
      dark: '#374151',
      medium: '#6b7280',
      light: '#d1d5db',
      lightest: '#f9fafb',
    },
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    harmony: 'monochromatic',
    dominantMood: 'corporate',
    contrastLevel: 'medium',
  },
  typography: {
    headingFont: {
      family: 'system-ui',
      fallback: 'sans-serif',
      weight: 700,
      style: 'sans-serif',
      character: 'modern',
    },
    bodyFont: {
      family: 'system-ui',
      fallback: 'sans-serif',
      weight: 400,
      style: 'sans-serif',
      lineHeight: 1.6,
    },
    scaleRatio: 1.25,
    baseSize: '16px',
    headingCase: 'none',
    headingLetterSpacing: 'normal',
    usesDropCaps: false,
    headingUnderlineStyle: 'none',
    linkStyle: 'underline',
  },
  spacing: {
    baseUnit: 16,
    density: 'comfortable',
    sectionGap: 'moderate',
    contentWidth: 'medium',
    whitespacePhilosophy: 'balanced',
  },
  shapes: {
    borderRadius: {
      style: 'rounded',
      small: '4px',
      medium: '8px',
      large: '16px',
      full: '9999px',
    },
    buttonStyle: 'rounded',
    cardStyle: 'subtle-shadow',
    inputStyle: 'bordered',
  },
  effects: {
    shadows: {
      style: 'subtle',
      cardShadow: '0 1px 3px rgba(0,0,0,0.1)',
      buttonShadow: '0 1px 2px rgba(0,0,0,0.05)',
      elevatedShadow: '0 10px 25px rgba(0,0,0,0.15)',
    },
    gradients: {
      usage: 'subtle',
      primaryGradient: 'linear-gradient(135deg, var(--ctc-primary), var(--ctc-primary-dark))',
      heroGradient: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
      ctaGradient: 'linear-gradient(135deg, var(--ctc-primary), var(--ctc-primary-light))',
    },
    backgrounds: {
      usesPatterns: false,
      usesTextures: false,
      usesOverlays: false,
    },
    borders: {
      style: 'subtle',
      defaultColor: '#e5e7eb',
      accentBorderUsage: false,
    },
  },
  decorative: {
    dividerStyle: 'line',
    usesFloatingShapes: false,
    usesCornerAccents: false,
    usesWaveShapes: false,
    usesGeometricPatterns: false,
    iconStyle: 'outline',
    decorativeAccentColor: '#3b82f6',
  },
  layout: {
    gridStyle: 'fluid',
    alignment: 'center',
    heroStyle: 'contained',
    cardLayout: 'grid',
    ctaPlacement: 'section-end',
    navigationStyle: 'standard',
  },
  motion: {
    overall: 'subtle',
    transitionSpeed: 'normal',
    easingStyle: 'ease',
    hoverEffects: {
      buttons: 'darken',
      cards: 'lift',
      links: 'color',
    },
    scrollAnimations: false,
    parallaxEffects: false,
  },
  images: {
    treatment: 'natural',
    frameStyle: 'rounded',
    hoverEffect: 'none',
    aspectRatioPreference: '16:9',
  },
  componentPreferences: {
    preferredListStyle: 'bullets',
    preferredCardStyle: 'elevated',
    testimonialStyle: 'card',
    faqStyle: 'accordion',
    ctaStyle: 'button',
  },
  personality: {
    overall: 'corporate',
    formality: 3,
    energy: 3,
    warmth: 3,
    trustSignals: 'moderate',
  },
  confidence: {
    overall: 70,
    colorsConfidence: 70,
    typographyConfidence: 70,
    layoutConfidence: 70,
  },
  analysisNotes: [],
};

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitize ColorWithUsage - ensure it's an object with hex, not a string
 */
function sanitizeColorWithUsage(
  value: unknown,
  defaultVal: typeof DEFAULT_COLOR_WITH_USAGE
): typeof DEFAULT_COLOR_WITH_USAGE {
  if (!value) return defaultVal;

  // If it's just a string (hex color), convert to object
  if (typeof value === 'string') {
    return { hex: value, usage: defaultVal.usage, confidence: defaultVal.confidence };
  }

  // If it's an object, extract hex
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return {
      hex: typeof obj.hex === 'string' ? obj.hex : defaultVal.hex,
      usage: typeof obj.usage === 'string' ? obj.usage : defaultVal.usage,
      confidence: typeof obj.confidence === 'number' ? obj.confidence : defaultVal.confidence,
    };
  }

  return defaultVal;
}

/**
 * Sanitize a simple string with fallback
 */
function sanitizeString(value: unknown, defaultVal: string): string {
  return typeof value === 'string' && value.length > 0 ? value : defaultVal;
}

/**
 * Sanitize a number with fallback
 */
function sanitizeNumber(value: unknown, defaultVal: number): number {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return !isNaN(num) ? num : defaultVal;
}

/**
 * Sanitize a value that must be one of specific options
 */
function sanitizeEnum<T extends string>(value: unknown, options: T[], defaultVal: T): T {
  if (typeof value === 'string' && options.includes(value as T)) {
    return value as T;
  }
  return defaultVal;
}

/**
 * Sanitize borderRadius - critical fix for the .small() bug
 * MUST ensure this is an object with string properties, not a string
 */
function sanitizeBorderRadius(
  value: unknown,
  defaultVal: DesignDNA['shapes']['borderRadius']
): DesignDNA['shapes']['borderRadius'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaultVal;
  }

  const obj = value as Record<string, unknown>;

  return {
    style: sanitizeEnum(obj.style, ['sharp', 'subtle', 'rounded', 'pill', 'mixed'], defaultVal.style),
    small: sanitizeString(obj.small, defaultVal.small),
    medium: sanitizeString(obj.medium, defaultVal.medium),
    large: sanitizeString(obj.large, defaultVal.large),
    full: sanitizeString(obj.full, defaultVal.full),
  };
}

/**
 * Comprehensive DesignDNA sanitization
 * Ensures all nested properties exist with correct types and fallbacks
 */
export function sanitizeDesignDNA(raw: unknown): DesignDNA {
  if (!raw || typeof raw !== 'object') {
    console.warn('[AIDesignAnalyzer] AI returned invalid response, using defaults');
    return DEFAULT_DESIGN_DNA;
  }

  const input = raw as Record<string, unknown>;

  // Helper to get nested object
  const getObj = (key: string): Record<string, unknown> =>
    (input[key] && typeof input[key] === 'object' && !Array.isArray(input[key]))
      ? input[key] as Record<string, unknown>
      : {};

  const colors = getObj('colors');
  const colorsNeutrals = getObj('colors') ? getObj('colors').neutrals as Record<string, unknown> || {} : {};
  const colorsSemantic = getObj('colors') ? getObj('colors').semantic as Record<string, unknown> || {} : {};

  const typography = getObj('typography');
  const typographyHeading = typography.headingFont as Record<string, unknown> || {};
  const typographyBody = typography.bodyFont as Record<string, unknown> || {};

  const spacing = getObj('spacing');
  const shapes = getObj('shapes');
  const effects = getObj('effects');
  const effectsShadows = effects.shadows as Record<string, unknown> || {};
  const effectsGradients = effects.gradients as Record<string, unknown> || {};
  const effectsBackgrounds = effects.backgrounds as Record<string, unknown> || {};
  const effectsBorders = effects.borders as Record<string, unknown> || {};

  const decorative = getObj('decorative');
  const layout = getObj('layout');
  const motion = getObj('motion');
  const motionHoverEffects = motion.hoverEffects as Record<string, unknown> || {};
  const images = getObj('images');
  const componentPreferences = getObj('componentPreferences');
  const personality = getObj('personality');
  const confidence = getObj('confidence');

  return {
    colors: {
      primary: sanitizeColorWithUsage(colors.primary, DEFAULT_DESIGN_DNA.colors.primary),
      primaryLight: sanitizeColorWithUsage(colors.primaryLight, DEFAULT_DESIGN_DNA.colors.primaryLight),
      primaryDark: sanitizeColorWithUsage(colors.primaryDark, DEFAULT_DESIGN_DNA.colors.primaryDark),
      secondary: sanitizeColorWithUsage(colors.secondary, DEFAULT_DESIGN_DNA.colors.secondary),
      accent: sanitizeColorWithUsage(colors.accent, DEFAULT_DESIGN_DNA.colors.accent),
      neutrals: {
        darkest: sanitizeString(colorsNeutrals.darkest, DEFAULT_DESIGN_DNA.colors.neutrals.darkest),
        dark: sanitizeString(colorsNeutrals.dark, DEFAULT_DESIGN_DNA.colors.neutrals.dark),
        medium: sanitizeString(colorsNeutrals.medium, DEFAULT_DESIGN_DNA.colors.neutrals.medium),
        light: sanitizeString(colorsNeutrals.light, DEFAULT_DESIGN_DNA.colors.neutrals.light),
        lightest: sanitizeString(colorsNeutrals.lightest, DEFAULT_DESIGN_DNA.colors.neutrals.lightest),
      },
      semantic: {
        success: sanitizeString(colorsSemantic.success, DEFAULT_DESIGN_DNA.colors.semantic.success),
        warning: sanitizeString(colorsSemantic.warning, DEFAULT_DESIGN_DNA.colors.semantic.warning),
        error: sanitizeString(colorsSemantic.error, DEFAULT_DESIGN_DNA.colors.semantic.error),
        info: sanitizeString(colorsSemantic.info, DEFAULT_DESIGN_DNA.colors.semantic.info),
      },
      harmony: sanitizeEnum(colors.harmony, ['monochromatic', 'complementary', 'analogous', 'triadic', 'split-complementary'], DEFAULT_DESIGN_DNA.colors.harmony),
      dominantMood: sanitizeEnum(colors.dominantMood, ['corporate', 'creative', 'luxurious', 'friendly', 'bold', 'minimal'], DEFAULT_DESIGN_DNA.colors.dominantMood),
      contrastLevel: sanitizeEnum(colors.contrastLevel, ['high', 'medium', 'subtle'], DEFAULT_DESIGN_DNA.colors.contrastLevel),
    },
    typography: {
      headingFont: {
        family: sanitizeString(typographyHeading.family, DEFAULT_DESIGN_DNA.typography.headingFont.family),
        fallback: sanitizeString(typographyHeading.fallback, DEFAULT_DESIGN_DNA.typography.headingFont.fallback),
        weight: sanitizeNumber(typographyHeading.weight, DEFAULT_DESIGN_DNA.typography.headingFont.weight),
        style: sanitizeEnum(typographyHeading.style, ['serif', 'sans-serif', 'display', 'slab', 'mono'], DEFAULT_DESIGN_DNA.typography.headingFont.style),
        character: sanitizeEnum(typographyHeading.character, ['modern', 'classic', 'playful', 'corporate', 'elegant'], DEFAULT_DESIGN_DNA.typography.headingFont.character),
      },
      bodyFont: {
        family: sanitizeString(typographyBody.family, DEFAULT_DESIGN_DNA.typography.bodyFont.family),
        fallback: sanitizeString(typographyBody.fallback, DEFAULT_DESIGN_DNA.typography.bodyFont.fallback),
        weight: sanitizeNumber(typographyBody.weight, DEFAULT_DESIGN_DNA.typography.bodyFont.weight),
        style: sanitizeEnum(typographyBody.style, ['serif', 'sans-serif'], DEFAULT_DESIGN_DNA.typography.bodyFont.style),
        lineHeight: sanitizeNumber(typographyBody.lineHeight, DEFAULT_DESIGN_DNA.typography.bodyFont.lineHeight),
      },
      scaleRatio: sanitizeNumber(typography.scaleRatio, DEFAULT_DESIGN_DNA.typography.scaleRatio),
      baseSize: sanitizeString(typography.baseSize, DEFAULT_DESIGN_DNA.typography.baseSize),
      headingCase: sanitizeEnum(typography.headingCase, ['none', 'uppercase', 'capitalize'], DEFAULT_DESIGN_DNA.typography.headingCase),
      headingLetterSpacing: sanitizeString(typography.headingLetterSpacing, DEFAULT_DESIGN_DNA.typography.headingLetterSpacing),
      usesDropCaps: Boolean(typography.usesDropCaps),
      headingUnderlineStyle: sanitizeEnum(typography.headingUnderlineStyle, ['none', 'solid', 'gradient', 'decorative'], DEFAULT_DESIGN_DNA.typography.headingUnderlineStyle),
      linkStyle: sanitizeEnum(typography.linkStyle, ['underline', 'color-only', 'animated-underline', 'highlight'], DEFAULT_DESIGN_DNA.typography.linkStyle),
    },
    spacing: {
      baseUnit: sanitizeNumber(spacing.baseUnit, DEFAULT_DESIGN_DNA.spacing.baseUnit),
      density: sanitizeEnum(spacing.density, ['compact', 'comfortable', 'spacious', 'airy'], DEFAULT_DESIGN_DNA.spacing.density),
      sectionGap: sanitizeEnum(spacing.sectionGap, ['tight', 'moderate', 'generous', 'dramatic'], DEFAULT_DESIGN_DNA.spacing.sectionGap),
      contentWidth: sanitizeEnum(spacing.contentWidth, ['narrow', 'medium', 'wide', 'full'], DEFAULT_DESIGN_DNA.spacing.contentWidth),
      whitespacePhilosophy: sanitizeEnum(spacing.whitespacePhilosophy, ['minimal', 'balanced', 'luxurious'], DEFAULT_DESIGN_DNA.spacing.whitespacePhilosophy),
    },
    shapes: {
      borderRadius: sanitizeBorderRadius(shapes.borderRadius, DEFAULT_DESIGN_DNA.shapes.borderRadius),
      buttonStyle: sanitizeEnum(shapes.buttonStyle, ['sharp', 'soft', 'rounded', 'pill'], DEFAULT_DESIGN_DNA.shapes.buttonStyle),
      cardStyle: sanitizeEnum(shapes.cardStyle, ['flat', 'subtle-shadow', 'elevated', 'bordered', 'glass'], DEFAULT_DESIGN_DNA.shapes.cardStyle),
      inputStyle: sanitizeEnum(shapes.inputStyle, ['minimal', 'bordered', 'filled', 'underlined'], DEFAULT_DESIGN_DNA.shapes.inputStyle),
    },
    effects: {
      shadows: {
        style: sanitizeEnum(effectsShadows.style, ['none', 'subtle', 'medium', 'dramatic', 'colored'], DEFAULT_DESIGN_DNA.effects.shadows.style),
        cardShadow: sanitizeString(effectsShadows.cardShadow, DEFAULT_DESIGN_DNA.effects.shadows.cardShadow),
        buttonShadow: sanitizeString(effectsShadows.buttonShadow, DEFAULT_DESIGN_DNA.effects.shadows.buttonShadow),
        elevatedShadow: sanitizeString(effectsShadows.elevatedShadow, DEFAULT_DESIGN_DNA.effects.shadows.elevatedShadow),
      },
      gradients: {
        usage: sanitizeEnum(effectsGradients.usage, ['none', 'subtle', 'prominent'], DEFAULT_DESIGN_DNA.effects.gradients.usage),
        primaryGradient: sanitizeString(effectsGradients.primaryGradient, DEFAULT_DESIGN_DNA.effects.gradients.primaryGradient),
        heroGradient: sanitizeString(effectsGradients.heroGradient, DEFAULT_DESIGN_DNA.effects.gradients.heroGradient),
        ctaGradient: sanitizeString(effectsGradients.ctaGradient, DEFAULT_DESIGN_DNA.effects.gradients.ctaGradient),
      },
      backgrounds: {
        usesPatterns: Boolean(effectsBackgrounds.usesPatterns),
        patternType: sanitizeEnum(effectsBackgrounds.patternType, ['dots', 'grid', 'waves', 'geometric', 'organic'], undefined as unknown as 'dots'),
        usesTextures: Boolean(effectsBackgrounds.usesTextures),
        usesOverlays: Boolean(effectsBackgrounds.usesOverlays),
      },
      borders: {
        style: sanitizeEnum(effectsBorders.style, ['none', 'subtle', 'visible', 'decorative'], DEFAULT_DESIGN_DNA.effects.borders.style),
        defaultColor: sanitizeString(effectsBorders.defaultColor, DEFAULT_DESIGN_DNA.effects.borders.defaultColor),
        accentBorderUsage: Boolean(effectsBorders.accentBorderUsage),
      },
    },
    decorative: {
      dividerStyle: sanitizeEnum(decorative.dividerStyle, ['none', 'line', 'gradient', 'decorative', 'icon'], DEFAULT_DESIGN_DNA.decorative.dividerStyle),
      usesFloatingShapes: Boolean(decorative.usesFloatingShapes),
      usesCornerAccents: Boolean(decorative.usesCornerAccents),
      usesWaveShapes: Boolean(decorative.usesWaveShapes),
      usesGeometricPatterns: Boolean(decorative.usesGeometricPatterns),
      iconStyle: sanitizeEnum(decorative.iconStyle, ['outline', 'solid', 'duotone', 'custom'], DEFAULT_DESIGN_DNA.decorative.iconStyle),
      decorativeAccentColor: sanitizeString(decorative.decorativeAccentColor, DEFAULT_DESIGN_DNA.decorative.decorativeAccentColor),
    },
    layout: {
      gridStyle: sanitizeEnum(layout.gridStyle, ['strict-12', 'asymmetric', 'fluid', 'modular'], DEFAULT_DESIGN_DNA.layout.gridStyle),
      alignment: sanitizeEnum(layout.alignment, ['left', 'center', 'mixed'], DEFAULT_DESIGN_DNA.layout.alignment),
      heroStyle: sanitizeEnum(layout.heroStyle, ['full-bleed', 'contained', 'split', 'minimal', 'video', 'animated'], DEFAULT_DESIGN_DNA.layout.heroStyle),
      cardLayout: sanitizeEnum(layout.cardLayout, ['grid', 'masonry', 'list', 'carousel', 'stacked'], DEFAULT_DESIGN_DNA.layout.cardLayout),
      ctaPlacement: sanitizeEnum(layout.ctaPlacement, ['inline', 'floating', 'section-end', 'prominent-banner'], DEFAULT_DESIGN_DNA.layout.ctaPlacement),
      navigationStyle: sanitizeEnum(layout.navigationStyle, ['minimal', 'standard', 'mega-menu', 'sidebar'], DEFAULT_DESIGN_DNA.layout.navigationStyle),
    },
    motion: {
      overall: sanitizeEnum(motion.overall, ['static', 'subtle', 'dynamic', 'expressive'], DEFAULT_DESIGN_DNA.motion.overall),
      transitionSpeed: sanitizeEnum(motion.transitionSpeed, ['instant', 'fast', 'normal', 'slow'], DEFAULT_DESIGN_DNA.motion.transitionSpeed),
      easingStyle: sanitizeEnum(motion.easingStyle, ['linear', 'ease', 'spring', 'bounce'], DEFAULT_DESIGN_DNA.motion.easingStyle),
      hoverEffects: {
        buttons: sanitizeEnum(motionHoverEffects.buttons, ['none', 'darken', 'lift', 'glow', 'fill', 'scale'], DEFAULT_DESIGN_DNA.motion.hoverEffects.buttons),
        cards: sanitizeEnum(motionHoverEffects.cards, ['none', 'lift', 'tilt', 'glow', 'border'], DEFAULT_DESIGN_DNA.motion.hoverEffects.cards),
        links: sanitizeEnum(motionHoverEffects.links, ['none', 'underline', 'color', 'highlight'], DEFAULT_DESIGN_DNA.motion.hoverEffects.links),
      },
      scrollAnimations: Boolean(motion.scrollAnimations),
      parallaxEffects: Boolean(motion.parallaxEffects),
    },
    images: {
      treatment: sanitizeEnum(images.treatment, ['natural', 'duotone', 'grayscale', 'high-contrast', 'colorized'], DEFAULT_DESIGN_DNA.images.treatment),
      frameStyle: sanitizeEnum(images.frameStyle, ['none', 'rounded', 'shadow', 'border', 'custom-mask'], DEFAULT_DESIGN_DNA.images.frameStyle),
      hoverEffect: sanitizeEnum(images.hoverEffect, ['none', 'zoom', 'overlay', 'caption-reveal'], DEFAULT_DESIGN_DNA.images.hoverEffect),
      aspectRatioPreference: sanitizeEnum(images.aspectRatioPreference, ['16:9', '4:3', '1:1', 'mixed'], DEFAULT_DESIGN_DNA.images.aspectRatioPreference),
    },
    componentPreferences: {
      preferredListStyle: sanitizeEnum(componentPreferences.preferredListStyle, ['bullets', 'icons', 'cards', 'numbered'], DEFAULT_DESIGN_DNA.componentPreferences.preferredListStyle),
      preferredCardStyle: sanitizeEnum(componentPreferences.preferredCardStyle, ['minimal', 'bordered', 'elevated', 'glass'], DEFAULT_DESIGN_DNA.componentPreferences.preferredCardStyle),
      testimonialStyle: sanitizeEnum(componentPreferences.testimonialStyle, ['card', 'quote', 'carousel', 'grid'], DEFAULT_DESIGN_DNA.componentPreferences.testimonialStyle),
      faqStyle: sanitizeEnum(componentPreferences.faqStyle, ['accordion', 'cards', 'list'], DEFAULT_DESIGN_DNA.componentPreferences.faqStyle),
      ctaStyle: sanitizeEnum(componentPreferences.ctaStyle, ['button', 'banner', 'floating', 'inline'], DEFAULT_DESIGN_DNA.componentPreferences.ctaStyle),
    },
    personality: {
      overall: sanitizeEnum(personality.overall, ['corporate', 'creative', 'luxurious', 'friendly', 'bold', 'minimal', 'elegant', 'playful'], DEFAULT_DESIGN_DNA.personality.overall),
      formality: Math.min(5, Math.max(1, sanitizeNumber(personality.formality, DEFAULT_DESIGN_DNA.personality.formality))) as 1 | 2 | 3 | 4 | 5,
      energy: Math.min(5, Math.max(1, sanitizeNumber(personality.energy, DEFAULT_DESIGN_DNA.personality.energy))) as 1 | 2 | 3 | 4 | 5,
      warmth: Math.min(5, Math.max(1, sanitizeNumber(personality.warmth, DEFAULT_DESIGN_DNA.personality.warmth))) as 1 | 2 | 3 | 4 | 5,
      trustSignals: sanitizeEnum(personality.trustSignals, ['minimal', 'moderate', 'prominent'], DEFAULT_DESIGN_DNA.personality.trustSignals),
    },
    confidence: {
      overall: sanitizeNumber(confidence.overall, DEFAULT_DESIGN_DNA.confidence.overall),
      colorsConfidence: sanitizeNumber(confidence.colorsConfidence, DEFAULT_DESIGN_DNA.confidence.colorsConfidence),
      typographyConfidence: sanitizeNumber(confidence.typographyConfidence, DEFAULT_DESIGN_DNA.confidence.typographyConfidence),
      layoutConfidence: sanitizeNumber(confidence.layoutConfidence, DEFAULT_DESIGN_DNA.confidence.layoutConfidence),
    },
    analysisNotes: Array.isArray(input.analysisNotes)
      ? input.analysisNotes.filter((n): n is string => typeof n === 'string')
      : [],
  };
}

interface AIDesignAnalyzerConfig {
  provider: 'gemini' | 'anthropic';
  apiKey: string;
  model?: string;
}

interface ProviderInfo {
  provider: 'gemini' | 'anthropic';
  model: string;
}

/**
 * AI Vision-based Design DNA Analyzer
 *
 * Extracts complete design system from website screenshots using AI Vision.
 * This is the primary method for understanding a brand's visual identity.
 *
 * Supported providers:
 * - Gemini 2.0 Flash (default for gemini)
 * - Claude Sonnet 4 (default for anthropic)
 */
export class AIDesignAnalyzer {
  private config: AIDesignAnalyzerConfig;
  private defaultModels = {
    gemini: 'gemini-2.0-flash',
    anthropic: 'claude-sonnet-4-20250514'
  };

  constructor(config: AIDesignAnalyzerConfig) {
    this.config = config;
  }

  /**
   * Get provider and model information
   */
  getProviderInfo(): ProviderInfo {
    return {
      provider: this.config.provider,
      model: this.config.model || this.defaultModels[this.config.provider]
    };
  }

  /**
   * Extract Design DNA from a website screenshot
   */
  async extractDesignDNA(
    screenshotBase64: string,
    sourceUrl: string
  ): Promise<DesignDNAExtractionResult> {
    const startTime = Date.now();
    const prompt = this.generateExtractionPrompt();

    let designDna: DesignDNA;

    if (this.config.provider === 'gemini') {
      designDna = await this.callGeminiVision(screenshotBase64, prompt);
    } else {
      designDna = await this.callClaudeVision(screenshotBase64, prompt);
    }

    const { model } = this.getProviderInfo();

    return {
      designDna,
      screenshotBase64,
      sourceUrl,
      extractedAt: new Date().toISOString(),
      aiModel: model,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Generate the extraction prompt for Design DNA analysis
   */
  generateExtractionPrompt(): string {
    return DESIGN_DNA_EXTRACTION_PROMPT;
  }

  /**
   * Generate a validation prompt for color checking
   */
  generateValidationPrompt(extractedColors: Record<string, string>): string {
    const colorJson = JSON.stringify(extractedColors, null, 2);
    return `Validate these extracted colors against the screenshot:
${colorJson}

Compare each color to what you actually see in the screenshot.

Return JSON:
{
  "isValid": boolean,
  "corrections": { "colorName": "#hex" },
  "confidence": 0-100,
  "notes": "explanation of any differences found"
}

IMPORTANT: Only suggest corrections if the extracted value is CLEARLY wrong. Return only valid JSON.`;
  }

  /**
   * Parse AI response and extract JSON
   * Handles both clean JSON and markdown-wrapped responses
   */
  parseAIResponse(text: string): unknown {
    // Try to find JSON object in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error('Failed to extract JSON from AI response');
    }
  }

  /**
   * Call Gemini Vision API
   */
  private async callGeminiVision(
    imageBase64: string,
    prompt: string
  ): Promise<DesignDNA> {
    const model = this.config.model || this.defaultModels.gemini;
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${this.config.apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Parse and sanitize to ensure correct structure
    const rawDna = this.parseAIResponse(text);
    return sanitizeDesignDNA(rawDna);
  }

  /**
   * Call Claude Vision API
   */
  private async callClaudeVision(
    imageBase64: string,
    prompt: string
  ): Promise<DesignDNA> {
    const model = this.config.model || this.defaultModels.anthropic;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2024-01-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64
              }
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';

    // Parse and sanitize to ensure correct structure
    const rawDna = this.parseAIResponse(text);
    return sanitizeDesignDNA(rawDna);
  }

  /**
   * Validate extracted colors against the screenshot
   * Uses AI Vision to confirm color accuracy
   */
  async validateColors(
    screenshotBase64: string,
    extractedColors: Record<string, string>
  ): Promise<{
    isValid: boolean;
    corrections: Record<string, string>;
    confidence: number;
  }> {
    const prompt = this.generateValidationPrompt(extractedColors);

    let result;
    if (this.config.provider === 'gemini') {
      result = await this.callGeminiVision(screenshotBase64, prompt);
    } else {
      result = await this.callClaudeVision(screenshotBase64, prompt);
    }

    return result as unknown as {
      isValid: boolean;
      corrections: Record<string, string>;
      confidence: number;
    };
  }

  /**
   * Extract specific design elements from a screenshot
   * Useful for targeted analysis of specific components
   */
  async extractElements(
    screenshotBase64: string,
    elements: ('colors' | 'typography' | 'spacing' | 'shapes' | 'effects')[]
  ): Promise<Partial<DesignDNA>> {
    const elementPrompts: Record<string, string> = {
      colors: 'Extract ALL colors: primary, secondary, accent, neutrals (dark to light), and semantic colors. Return hex values.',
      typography: 'Extract typography: heading font family/weight/style, body font, scale ratio, special treatments.',
      spacing: 'Analyze spacing: density, section gaps, content width, whitespace philosophy.',
      shapes: 'Identify shapes: border radius style (sharp/rounded/pill), button/card/input styles.',
      effects: 'Identify visual effects: shadows, gradients, background patterns, border treatments.'
    };

    const elementDescriptions = elements.map(el => {
      const title = el.charAt(0).toUpperCase() + el.slice(1);
      return `## ${title}\n${elementPrompts[el]}`;
    }).join('\n\n');

    const focusedPrompt = `Analyze this screenshot and extract the following design elements:

${elementDescriptions}

Return a JSON object with only these properties. Use exact CSS values where possible.`;

    if (this.config.provider === 'gemini') {
      return await this.callGeminiVision(screenshotBase64, focusedPrompt) as Partial<DesignDNA>;
    } else {
      return await this.callClaudeVision(screenshotBase64, focusedPrompt) as Partial<DesignDNA>;
    }
  }
}
