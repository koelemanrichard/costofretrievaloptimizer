// services/design-analysis/BrandDesignSystemGenerator.ts
import type {
  DesignDNA,
  BrandDesignSystem,
  ComponentStyleDefinition
} from '../../types/designDna';
import { buildDesignSystemGenerationPrompt } from './prompts/designSystemPrompt';

interface BrandDesignSystemGeneratorConfig {
  provider: 'gemini' | 'anthropic';
  apiKey: string;
  model?: string;
}

interface ProviderInfo {
  provider: 'gemini' | 'anthropic';
  model: string;
}

/**
 * Brand Design System Generator
 *
 * Generates a complete CSS design system from extracted Design DNA.
 * Uses AI to generate component-specific styles that match the brand's
 * visual identity, with fallback to deterministic token generation.
 *
 * Supported providers:
 * - Gemini 2.0 Flash (default for gemini)
 * - Claude Sonnet 4 (default for anthropic)
 */
export class BrandDesignSystemGenerator {
  private config: BrandDesignSystemGeneratorConfig;
  private defaultModels = {
    gemini: 'gemini-2.0-flash',
    anthropic: 'claude-sonnet-4-20250514'
  };

  constructor(config: BrandDesignSystemGeneratorConfig) {
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
   * Generate a complete brand design system from Design DNA
   */
  async generate(
    designDna: DesignDNA,
    brandName: string,
    sourceUrl: string
  ): Promise<BrandDesignSystem> {
    const tokens = this.generateTokensFromDNA(designDna);
    const designDnaHash = this.computeDesignDnaHash(designDna);

    // Generate AI-powered component styles using focused, step-by-step approach
    console.log('[BrandDesignSystemGenerator] Starting AI-powered CSS generation for:', brandName);
    console.log('[BrandDesignSystemGenerator] Brand personality:', designDna.personality?.overall);
    console.log('[BrandDesignSystemGenerator] Shape language:', designDna.shapes?.borderRadius?.style);

    let componentStyles: BrandDesignSystem['componentStyles'];
    let decorative: BrandDesignSystem['decorative'];
    let interactions: BrandDesignSystem['interactions'];
    let typographyTreatments: BrandDesignSystem['typographyTreatments'];
    let imageTreatments: BrandDesignSystem['imageTreatments'];

    try {
      // Step 1: Generate component styles one by one for better quality
      console.log('[BrandDesignSystemGenerator] Step 1: Generating component styles...');
      componentStyles = await this.generateComponentStylesStepByStep(designDna);
      console.log('[BrandDesignSystemGenerator] Component styles generated successfully');

      // Step 2: Generate decorative elements
      console.log('[BrandDesignSystemGenerator] Step 2: Generating decorative elements...');
      decorative = await this.generateDecorativeElements(designDna);
      console.log('[BrandDesignSystemGenerator] Decorative elements generated');

      // Step 3: Generate interactions
      console.log('[BrandDesignSystemGenerator] Step 3: Generating interactions...');
      interactions = await this.generateInteractions(designDna);
      console.log('[BrandDesignSystemGenerator] Interactions generated');

      // Step 4: Generate typography treatments
      console.log('[BrandDesignSystemGenerator] Step 4: Generating typography treatments...');
      typographyTreatments = await this.generateTypographyTreatments(designDna);
      console.log('[BrandDesignSystemGenerator] Typography treatments generated');

      // Step 5: Generate image treatments
      console.log('[BrandDesignSystemGenerator] Step 5: Generating image treatments...');
      imageTreatments = await this.generateImageTreatments(designDna);
      console.log('[BrandDesignSystemGenerator] Image treatments generated');

      console.log('[BrandDesignSystemGenerator] All AI generation steps completed successfully');
    } catch (error) {
      // NO SILENT FALLBACK - Log and propagate the error
      console.error('[BrandDesignSystemGenerator] AI generation failed:', error);
      console.error('[BrandDesignSystemGenerator] This is a critical error - not falling back to templates');
      throw new Error(`AI-powered CSS generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Compile all CSS
    const compiledCss = this.compileCSS(
      tokens.css,
      componentStyles,
      decorative,
      interactions,
      typographyTreatments,
      imageTreatments
    );

    return {
      id: `bds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      brandName,
      sourceUrl,
      generatedAt: new Date().toISOString(),
      designDnaHash,
      tokens,
      componentStyles,
      decorative,
      interactions,
      typographyTreatments,
      imageTreatments,
      compiledCss,
      variantMappings: this.getDefaultVariantMappings(designDna)
    };
  }

  /**
   * Safely extract hex color from a ColorWithUsage object or string
   */
  private getHex(color: { hex?: string } | string | undefined, fallback: string): string {
    if (!color) return fallback;
    if (typeof color === 'string') return color;
    return color.hex || fallback;
  }

  /**
   * Generate CSS tokens from Design DNA
   * This is the deterministic fallback that always works
   */
  generateTokensFromDNA(designDna: DesignDNA): { css: string; json: Record<string, string> } {
    const json: Record<string, string> = {};

    // Safely extract colors with fallbacks
    const colors = designDna.colors || {} as DesignDNA['colors'];
    const primaryHex = this.getHex(colors.primary, '#3b82f6');
    const primaryLightHex = this.getHex(colors.primaryLight, '#60a5fa');
    const primaryDarkHex = this.getHex(colors.primaryDark, '#2563eb');
    const secondaryHex = this.getHex(colors.secondary, '#1f2937');
    const accentHex = this.getHex(colors.accent, '#f59e0b');

    // Color tokens
    json['--ctc-primary'] = primaryHex;
    json['--ctc-primary-light'] = primaryLightHex;
    json['--ctc-primary-dark'] = primaryDarkHex;
    json['--ctc-secondary'] = secondaryHex;
    json['--ctc-accent'] = accentHex;

    // Neutral colors (with fallbacks)
    const neutrals = colors.neutrals || {} as NonNullable<DesignDNA['colors']>['neutrals'];
    json['--ctc-neutral-darkest'] = neutrals?.darkest || '#111827';
    json['--ctc-neutral-dark'] = neutrals?.dark || '#374151';
    json['--ctc-neutral-medium'] = neutrals?.medium || '#6b7280';
    json['--ctc-neutral-light'] = neutrals?.light || '#d1d5db';
    json['--ctc-neutral-lightest'] = neutrals?.lightest || '#f9fafb';

    // Semantic colors (with fallbacks)
    const semantic = colors.semantic || {} as NonNullable<DesignDNA['colors']>['semantic'];
    json['--ctc-success'] = semantic?.success || '#10b981';
    json['--ctc-warning'] = semantic?.warning || '#f59e0b';
    json['--ctc-error'] = semantic?.error || '#ef4444';
    json['--ctc-info'] = semantic?.info || '#3b82f6';

    // Typography (with fallbacks for all nested properties)
    const typography = designDna.typography || {} as DesignDNA['typography'];
    const headingFont = typography.headingFont || { family: 'system-ui', fallback: 'sans-serif', weight: 700, lineHeight: 1.2 };
    const bodyFont = typography.bodyFont || { family: 'system-ui', fallback: 'sans-serif', weight: 400, lineHeight: 1.6 };

    // Typography tokens
    json['--ctc-font-heading'] = `${headingFont.family || 'system-ui'}, ${headingFont.fallback || 'sans-serif'}`;
    json['--ctc-font-body'] = `${bodyFont.family || 'system-ui'}, ${bodyFont.fallback || 'sans-serif'}`;
    json['--ctc-font-size-base'] = typography.baseSize || '16px';
    json['--ctc-font-scale-ratio'] = String(typography.scaleRatio || 1.25);
    json['--ctc-heading-weight'] = String(headingFont.weight || 700);
    json['--ctc-body-weight'] = String(bodyFont.weight || 400);
    json['--ctc-body-line-height'] = String(bodyFont.lineHeight || 1.6);

    // Typography scale (using scale ratio)
    const baseSize = parseFloat(typography.baseSize || '16') || 16;
    const ratio = typography.scaleRatio || 1.25;
    json['--ctc-font-size-xs'] = `${(baseSize / ratio / ratio).toFixed(2)}px`;
    json['--ctc-font-size-sm'] = `${(baseSize / ratio).toFixed(2)}px`;
    json['--ctc-font-size-md'] = `${baseSize}px`;
    json['--ctc-font-size-lg'] = `${(baseSize * ratio).toFixed(2)}px`;
    json['--ctc-font-size-xl'] = `${(baseSize * ratio * ratio).toFixed(2)}px`;
    json['--ctc-font-size-2xl'] = `${(baseSize * ratio * ratio * ratio).toFixed(2)}px`;
    json['--ctc-font-size-3xl'] = `${(baseSize * ratio * ratio * ratio * ratio).toFixed(2)}px`;

    // Spacing tokens (with fallbacks)
    const spacing = designDna.spacing || {} as DesignDNA['spacing'];
    const unit = spacing.baseUnit || 16;
    json['--ctc-spacing-unit'] = `${unit}px`;
    json['--ctc-spacing-xs'] = `${unit * 0.25}px`;
    json['--ctc-spacing-sm'] = `${unit * 0.5}px`;
    json['--ctc-spacing-md'] = `${unit}px`;
    json['--ctc-spacing-lg'] = `${unit * 1.5}px`;
    json['--ctc-spacing-xl'] = `${unit * 2}px`;
    json['--ctc-spacing-2xl'] = `${unit * 3}px`;
    json['--ctc-spacing-3xl'] = `${unit * 4}px`;

    // Border radius tokens (with fallbacks)
    // CRITICAL: Ensure borderRadius is an object, not a string (AI sometimes returns "rounded" instead of object)
    // Accessing .small on a string invokes deprecated String.prototype.small() which returns function code
    const shapes = designDna.shapes || {} as DesignDNA['shapes'];
    const borderRadius = shapes?.borderRadius;
    const isBorderRadiusObject = borderRadius && typeof borderRadius === 'object' && !Array.isArray(borderRadius);

    json['--ctc-radius-sm'] = (isBorderRadiusObject && typeof borderRadius.small === 'string') ? borderRadius.small : '4px';
    json['--ctc-radius-md'] = (isBorderRadiusObject && typeof borderRadius.medium === 'string') ? borderRadius.medium : '8px';
    json['--ctc-radius-lg'] = (isBorderRadiusObject && typeof borderRadius.large === 'string') ? borderRadius.large : '16px';
    json['--ctc-radius-full'] = (isBorderRadiusObject && typeof borderRadius.full === 'string') ? borderRadius.full : '9999px';

    // Shadow tokens (with fallbacks)
    const effects = designDna.effects || {} as DesignDNA['effects'];
    const shadows = effects?.shadows || {} as NonNullable<DesignDNA['effects']>['shadows'];
    json['--ctc-shadow-card'] = shadows?.cardShadow || '0 1px 3px rgba(0,0,0,0.1)';
    json['--ctc-shadow-button'] = shadows?.buttonShadow || '0 1px 2px rgba(0,0,0,0.05)';
    json['--ctc-shadow-elevated'] = shadows?.elevatedShadow || '0 10px 25px rgba(0,0,0,0.15)';

    // Motion tokens (with fallbacks)
    const motion = designDna.motion || {} as DesignDNA['motion'];
    const speedMap: Record<string, string> = {
      instant: '0ms',
      fast: '150ms',
      normal: '250ms',
      slow: '400ms'
    };
    json['--ctc-transition-speed'] = speedMap[motion.transitionSpeed] || '250ms';

    const easingMap: Record<string, string> = {
      linear: 'linear',
      ease: 'ease',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    };
    json['--ctc-easing'] = easingMap[motion.easingStyle] || 'ease';

    // Generate CSS string
    const cssLines = Object.entries(json)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');

    const css = `:root {\n${cssLines}\n}`;

    return { css, json };
  }

  /**
   * Compute a hash of the Design DNA for cache invalidation
   */
  computeDesignDnaHash(designDna: DesignDNA): string {
    const str = JSON.stringify(designDna);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Parse AI response and extract JSON
   * Handles both clean JSON and markdown-wrapped responses
   */
  parseAIResponse(text: string): unknown {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('Failed to extract JSON from AI response');
    }
  }

  // ============================================================================
  // STEP-BY-STEP AI GENERATION (Focused, Reliable, No Templates)
  // ============================================================================

  /**
   * Generate component styles one by one with focused prompts
   * This is more reliable than generating everything at once
   */
  private async generateComponentStylesStepByStep(designDna: DesignDNA): Promise<BrandDesignSystem['componentStyles']> {
    const personality = designDna.personality?.overall || 'corporate';
    const shapeStyle = designDna.shapes?.borderRadius?.style || 'rounded';
    const shadowStyle = designDna.effects?.shadows?.style || 'subtle';
    const motionStyle = designDna.motion?.overall || 'subtle';

    console.log('[BrandDesignSystemGenerator] Generating CSS for personality:', personality, 'shapes:', shapeStyle);

    // Generate each component with focused prompts
    const [button, card, hero, timeline, testimonial, faq, cta, keyTakeaways, prose, list, table, blockquote] = await Promise.all([
      this.generateComponentCSS('button', designDna),
      this.generateComponentCSS('card', designDna),
      this.generateComponentCSS('hero', designDna),
      this.generateComponentCSS('timeline', designDna),
      this.generateComponentCSS('testimonial', designDna),
      this.generateComponentCSS('faq', designDna),
      this.generateComponentCSS('cta', designDna),
      this.generateComponentCSS('keyTakeaways', designDna),
      this.generateComponentCSS('prose', designDna),
      this.generateComponentCSS('list', designDna),
      this.generateComponentCSS('table', designDna),
      this.generateComponentCSS('blockquote', designDna),
    ]);

    return { button, card, hero, timeline, testimonial, faq, cta, keyTakeaways, prose, list, table, blockquote };
  }

  /**
   * Generate CSS for a single component based on brand personality
   */
  private async generateComponentCSS(
    componentType: string,
    designDna: DesignDNA
  ): Promise<ComponentStyleDefinition> {
    const prompt = this.buildComponentPrompt(componentType, designDna);

    console.log(`[BrandDesignSystemGenerator] Generating ${componentType} CSS...`);

    let response: { baseCSS: string; variants: Record<string, string>; states: Record<string, string> };

    try {
      if (this.config.provider === 'gemini') {
        response = await this.callGeminiForComponent(prompt);
      } else {
        response = await this.callClaudeForComponent(prompt);
      }
    } catch (error) {
      console.error(`[BrandDesignSystemGenerator] Failed to generate ${componentType}:`, error);
      throw error;
    }

    console.log(`[BrandDesignSystemGenerator] ${componentType} CSS generated successfully`);

    return {
      baseCSS: response.baseCSS,
      variants: response.variants || {},
      states: {
        hover: response.states?.hover || '',
        active: response.states?.active || '',
        focus: response.states?.focus || '',
        disabled: response.states?.disabled || '',
      },
      responsive: {
        mobile: '',
        tablet: '',
      },
    };
  }

  /**
   * Build a focused prompt for a single component
   */
  private buildComponentPrompt(componentType: string, designDna: DesignDNA): string {
    const personality = designDna.personality?.overall || 'corporate';
    const formality = designDna.personality?.formality || 3;
    const energy = designDna.personality?.energy || 3;
    const warmth = designDna.personality?.warmth || 3;
    const shapeStyle = designDna.shapes?.borderRadius?.style || 'rounded';
    const buttonStyle = designDna.shapes?.buttonStyle || 'rounded';
    const cardStyle = designDna.shapes?.cardStyle || 'subtle-shadow';
    const shadowStyle = designDna.effects?.shadows?.style || 'subtle';
    const motionStyle = designDna.motion?.overall || 'subtle';
    const hoverButtons = designDna.motion?.hoverEffects?.buttons || 'darken';
    const hoverCards = designDna.motion?.hoverEffects?.cards || 'lift';

    const personalityDescriptions: Record<string, string> = {
      corporate: 'Professional, trustworthy, sharp edges, subtle shadows, restrained animations',
      creative: 'Bold, expressive, rounded corners, dramatic shadows, playful animations',
      luxurious: 'Elegant, refined, subtle curves, soft shadows, smooth transitions',
      friendly: 'Warm, approachable, soft corners, gentle shadows, bouncy animations',
      bold: 'Striking, impactful, strong contrasts, dramatic shadows, powerful animations',
      minimal: 'Clean, simple, subtle shapes, minimal shadows, quick transitions',
      elegant: 'Sophisticated, graceful, refined curves, delicate shadows, fluid animations',
      playful: 'Fun, energetic, rounded shapes, colorful shadows, bouncy animations',
    };

    const componentDescriptions: Record<string, string> = {
      button: 'Interactive button with primary, secondary, and outline variants',
      card: 'Content container with elevated, flat, and bordered variants',
      hero: 'Large header section with centered and full-bleed variants',
      timeline: 'Vertical timeline with markers and connecting line',
      testimonial: 'Quote display with author attribution',
      faq: 'Expandable question/answer accordion',
      cta: 'Call-to-action block with prominent styling',
      keyTakeaways: 'Summary box highlighting key points',
      prose: 'Body text content styling',
      list: 'Styled list items with custom markers',
      table: 'Data table with header and row styling',
      blockquote: 'Quoted text with decorative styling',
    };

    return `You are a senior CSS designer. Generate production-ready CSS for a ${componentType} component.

## Brand Personality
- Overall: ${personality} (${personalityDescriptions[personality] || 'Professional and clean'})
- Formality: ${formality}/5 (${formality <= 2 ? 'casual' : formality >= 4 ? 'formal' : 'balanced'})
- Energy: ${energy}/5 (${energy <= 2 ? 'calm' : energy >= 4 ? 'energetic' : 'moderate'})
- Warmth: ${warmth}/5 (${warmth <= 2 ? 'cool' : warmth >= 4 ? 'warm' : 'neutral'})

## Design Parameters
- Shape style: ${shapeStyle}
- Button style: ${buttonStyle}
- Card style: ${cardStyle}
- Shadow style: ${shadowStyle}
- Motion style: ${motionStyle}
- Button hover effect: ${hoverButtons}
- Card hover effect: ${hoverCards}

## Component: ${componentType}
${componentDescriptions[componentType] || 'UI component'}

## Requirements
1. Use CSS custom properties: --ctc-primary, --ctc-secondary, --ctc-accent, --ctc-neutral-*, --ctc-radius-*, --ctc-spacing-*, --ctc-shadow-*, --ctc-transition-speed
2. CSS class prefix: .ctc-${componentType}
3. The CSS MUST reflect the brand personality - ${personality} brands need ${personalityDescriptions[personality]}
4. Include hover, active, and focus states
5. Make it unique to THIS brand - not generic

## Output Format (JSON only)
{
  "baseCSS": ".ctc-${componentType} { ... complete CSS ... }",
  "variants": {
    "variantName": ".ctc-${componentType}--variantName { ... }"
  },
  "states": {
    "hover": ".ctc-${componentType}:hover { ... }",
    "active": ".ctc-${componentType}:active { ... }",
    "focus": ".ctc-${componentType}:focus-visible { ... }"
  }
}

CRITICAL: Return ONLY valid JSON. The CSS must be unique to this ${personality} brand.`;
  }

  /**
   * Call Gemini for a single component
   */
  private async callGeminiForComponent(prompt: string): Promise<{ baseCSS: string; variants: Record<string, string>; states: Record<string, string> }> {
    const model = this.config.model || this.defaultModels.gemini;
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${this.config.apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    return this.parseAIResponse(text) as { baseCSS: string; variants: Record<string, string>; states: Record<string, string> };
  }

  /**
   * Call Claude for a single component
   */
  private async callClaudeForComponent(prompt: string): Promise<{ baseCSS: string; variants: Record<string, string>; states: Record<string, string> }> {
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
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';

    return this.parseAIResponse(text) as { baseCSS: string; variants: Record<string, string>; states: Record<string, string> };
  }

  /**
   * Generate decorative elements (dividers, backgrounds, shapes)
   */
  private async generateDecorativeElements(designDna: DesignDNA): Promise<BrandDesignSystem['decorative']> {
    const personality = designDna.personality?.overall || 'corporate';
    const dividerStyle = designDna.decorative?.dividerStyle || 'line';
    const usesWaves = designDna.decorative?.usesWaveShapes || false;

    const prompt = `Generate decorative CSS elements for a ${personality} brand.
Divider style: ${dividerStyle}
Uses waves: ${usesWaves}

Return JSON:
{
  "dividers": {
    "default": ".ctc-divider { CSS }",
    "subtle": ".ctc-divider--subtle { CSS }",
    "decorative": ".ctc-divider--decorative { CSS }"
  },
  "sectionBackgrounds": {
    "default": ".ctc-section { CSS }",
    "accent": ".ctc-section--accent { CSS }",
    "featured": ".ctc-section--featured { CSS }"
  }
}

Use --ctc-* CSS variables. Make it unique to ${personality} personality.
CRITICAL: Return ONLY valid JSON.`;

    try {
      const response = this.config.provider === 'gemini'
        ? await this.callGeminiForComponent(prompt)
        : await this.callClaudeForComponent(prompt);

      return {
        dividers: {
          default: (response as unknown as { dividers?: { default?: string } }).dividers?.default || '.ctc-divider { border-top: 1px solid var(--ctc-neutral-light); }',
          subtle: (response as unknown as { dividers?: { subtle?: string } }).dividers?.subtle || '.ctc-divider--subtle { border-top: 1px solid var(--ctc-neutral-lightest); }',
          decorative: (response as unknown as { dividers?: { decorative?: string } }).dividers?.decorative || '.ctc-divider--decorative { border-top: 2px solid var(--ctc-primary); }',
        },
        sectionBackgrounds: {
          default: (response as unknown as { sectionBackgrounds?: { default?: string } }).sectionBackgrounds?.default || '.ctc-section { background: var(--ctc-neutral-lightest); }',
          accent: (response as unknown as { sectionBackgrounds?: { accent?: string } }).sectionBackgrounds?.accent || '.ctc-section--accent { background: var(--ctc-primary); color: white; }',
          featured: (response as unknown as { sectionBackgrounds?: { featured?: string } }).sectionBackgrounds?.featured || '.ctc-section--featured { background: linear-gradient(to bottom, var(--ctc-neutral-lightest), white); }',
        },
      };
    } catch (error) {
      console.error('[BrandDesignSystemGenerator] Decorative generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate interaction styles (hover, focus, animations)
   */
  private async generateInteractions(designDna: DesignDNA): Promise<BrandDesignSystem['interactions']> {
    const personality = designDna.personality?.overall || 'corporate';
    const motionStyle = designDna.motion?.overall || 'subtle';
    const hoverButtons = designDna.motion?.hoverEffects?.buttons || 'darken';
    const hoverCards = designDna.motion?.hoverEffects?.cards || 'lift';
    const hoverLinks = designDna.motion?.hoverEffects?.links || 'color';

    const prompt = `Generate interaction CSS for a ${personality} brand with ${motionStyle} motion style.
Button hover: ${hoverButtons}
Card hover: ${hoverCards}
Link hover: ${hoverLinks}

Return JSON with actual CSS (not descriptions):
{
  "buttonHover": ".ctc-button:hover { actual CSS properties }",
  "buttonActive": ".ctc-button:active { actual CSS properties }",
  "buttonFocus": ".ctc-button:focus-visible { actual CSS properties }",
  "cardHover": ".ctc-card:hover { actual CSS properties }",
  "linkHover": "a:hover { actual CSS properties }",
  "focusRing": ":focus-visible { actual CSS properties }",
  "keyframes": {
    "fadeIn": "@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }"
  }
}

Make animations reflect ${personality} personality:
- corporate: subtle, professional
- creative: bold, expressive
- playful: bouncy, fun
- minimal: quick, subtle

CRITICAL: Return ONLY valid JSON with actual CSS code.`;

    try {
      const response = this.config.provider === 'gemini'
        ? await this.callGeminiForComponent(prompt)
        : await this.callClaudeForComponent(prompt);

      const r = response as unknown as BrandDesignSystem['interactions'];
      return {
        buttonHover: r.buttonHover || '.ctc-button:hover { opacity: 0.9; }',
        buttonActive: r.buttonActive || '.ctc-button:active { transform: scale(0.98); }',
        buttonFocus: r.buttonFocus || '.ctc-button:focus-visible { outline: 2px solid var(--ctc-primary); outline-offset: 2px; }',
        cardHover: r.cardHover || '.ctc-card:hover { box-shadow: var(--ctc-shadow-elevated); }',
        linkHover: r.linkHover || 'a:hover { color: var(--ctc-primary-dark); }',
        focusRing: r.focusRing || ':focus-visible { outline: 2px solid var(--ctc-primary); outline-offset: 2px; }',
        keyframes: r.keyframes || {},
      };
    } catch (error) {
      console.error('[BrandDesignSystemGenerator] Interactions generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate typography treatments
   */
  private async generateTypographyTreatments(designDna: DesignDNA): Promise<BrandDesignSystem['typographyTreatments']> {
    const personality = designDna.personality?.overall || 'corporate';
    const headingStyle = designDna.typography?.headingUnderlineStyle || 'none';
    const usesDropCaps = designDna.typography?.usesDropCaps || false;
    const linkStyle = designDna.typography?.linkStyle || 'underline';

    const prompt = `Generate typography treatment CSS for a ${personality} brand.
Heading decoration: ${headingStyle}
Uses drop caps: ${usesDropCaps}
Link style: ${linkStyle}

Return JSON:
{
  "headingDecoration": ".ctc-heading-decorated::after { CSS for underline/decoration }",
  "dropCap": ".ctc-drop-cap::first-letter { CSS for drop cap }",
  "pullQuote": ".ctc-pull-quote { CSS for pull quotes }",
  "listMarker": ".ctc-list li::marker { CSS for list markers }",
  "linkUnderline": "a { CSS for links }",
  "codeBlock": "pre, code { CSS for code blocks }"
}

Make it unique to ${personality} personality.
CRITICAL: Return ONLY valid JSON.`;

    try {
      const response = this.config.provider === 'gemini'
        ? await this.callGeminiForComponent(prompt)
        : await this.callClaudeForComponent(prompt);

      const r = response as unknown as BrandDesignSystem['typographyTreatments'];
      return {
        headingDecoration: r.headingDecoration || '',
        dropCap: r.dropCap || '',
        pullQuote: r.pullQuote || '',
        listMarker: r.listMarker || '',
        linkUnderline: r.linkUnderline || '',
        codeBlock: r.codeBlock || '',
      };
    } catch (error) {
      console.error('[BrandDesignSystemGenerator] Typography generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate image treatment styles
   */
  private async generateImageTreatments(designDna: DesignDNA): Promise<BrandDesignSystem['imageTreatments']> {
    const personality = designDna.personality?.overall || 'corporate';
    const frameStyle = designDna.images?.frameStyle || 'rounded';
    const hoverEffect = designDna.images?.hoverEffect || 'none';

    const prompt = `Generate image treatment CSS for a ${personality} brand.
Frame style: ${frameStyle}
Hover effect: ${hoverEffect}

Return JSON:
{
  "defaultFrame": ".ctc-image { CSS for default images }",
  "featured": ".ctc-image--featured { CSS for featured images }",
  "thumbnail": ".ctc-image--thumbnail { CSS for thumbnails }",
  "gallery": ".ctc-image--gallery { CSS for gallery items }"
}

Make it unique to ${personality} personality.
CRITICAL: Return ONLY valid JSON.`;

    try {
      const response = this.config.provider === 'gemini'
        ? await this.callGeminiForComponent(prompt)
        : await this.callClaudeForComponent(prompt);

      const r = response as unknown as BrandDesignSystem['imageTreatments'];
      return {
        defaultFrame: r.defaultFrame || '.ctc-image { border-radius: var(--ctc-radius-md); }',
        featured: r.featured || '.ctc-image--featured { border-radius: var(--ctc-radius-lg); box-shadow: var(--ctc-shadow-card); }',
        thumbnail: r.thumbnail || '.ctc-image--thumbnail { border-radius: var(--ctc-radius-sm); }',
        gallery: r.gallery || '.ctc-image--gallery { border-radius: var(--ctc-radius-md); }',
      };
    } catch (error) {
      console.error('[BrandDesignSystemGenerator] Image treatments generation failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // LEGACY AI GENERATION (kept for reference, not used)
  // ============================================================================

  /**
   * Call AI to generate enhanced component styles (LEGACY - not used)
   */
  private async generateWithAI(designDna: DesignDNA): Promise<Partial<BrandDesignSystem>> {
    const prompt = buildDesignSystemGenerationPrompt(JSON.stringify(designDna, null, 2));

    if (this.config.provider === 'gemini') {
      return this.callGemini(prompt);
    } else {
      return this.callClaude(prompt);
    }
  }

  /**
   * Call Gemini API
   */
  private async callGemini(prompt: string): Promise<Partial<BrandDesignSystem>> {
    const model = this.config.model || this.defaultModels.gemini;
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${this.config.apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 16384
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    return this.parseAIResponse(text) as Partial<BrandDesignSystem>;
  }

  /**
   * Call Claude API
   */
  private async callClaude(prompt: string): Promise<Partial<BrandDesignSystem>> {
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
        max_tokens: 16384,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';

    return this.parseAIResponse(text) as Partial<BrandDesignSystem>;
  }

  /**
   * Compile all CSS sections into a single output
   */
  private compileCSS(
    tokensCSS: string,
    componentStyles: BrandDesignSystem['componentStyles'],
    decorative: BrandDesignSystem['decorative'],
    interactions: BrandDesignSystem['interactions'],
    typographyTreatments: BrandDesignSystem['typographyTreatments'],
    imageTreatments: BrandDesignSystem['imageTreatments']
  ): string {
    const sections: string[] = [
      '/* ==========================================================================',
      '   Brand Design System - Auto-generated CSS',
      '   ========================================================================== */',
      '',
      '/* CSS Custom Properties */',
      tokensCSS,
      '',
      '/* ==========================================================================',
      '   Component Styles',
      '   ========================================================================== */',
    ];

    // Add component styles
    for (const [name, def] of Object.entries(componentStyles)) {
      sections.push(`\n/* ${name.charAt(0).toUpperCase() + name.slice(1)} Component */`);
      sections.push(def.baseCSS);

      // Add variants
      for (const [variant, css] of Object.entries(def.variants)) {
        if (css) sections.push(css);
      }

      // Add states
      if (def.states.hover) sections.push(def.states.hover);
      if (def.states.active) sections.push(def.states.active);
      if (def.states.focus) sections.push(def.states.focus);
      if (def.states.disabled) sections.push(def.states.disabled);

      // Add responsive
      if (def.responsive?.mobile) sections.push(def.responsive.mobile);
      if (def.responsive?.tablet) sections.push(def.responsive.tablet);
    }

    sections.push('');
    sections.push('/* ==========================================================================');
    sections.push('   Decorative Elements');
    sections.push('   ========================================================================== */');
    sections.push(decorative.dividers.default);
    sections.push(decorative.dividers.subtle);
    sections.push(decorative.dividers.decorative);
    sections.push(decorative.sectionBackgrounds.default);
    sections.push(decorative.sectionBackgrounds.accent);
    sections.push(decorative.sectionBackgrounds.featured);

    sections.push('');
    sections.push('/* ==========================================================================');
    sections.push('   Interactions & Animations');
    sections.push('   ========================================================================== */');
    sections.push(interactions.buttonHover);
    sections.push(interactions.buttonActive);
    sections.push(interactions.buttonFocus);
    sections.push(interactions.cardHover);
    sections.push(interactions.linkHover);
    sections.push(interactions.focusRing);

    // Add keyframes
    for (const [name, keyframe] of Object.entries(interactions.keyframes)) {
      if (keyframe) sections.push(keyframe);
    }

    sections.push('');
    sections.push('/* ==========================================================================');
    sections.push('   Typography Treatments');
    sections.push('   ========================================================================== */');
    sections.push(typographyTreatments.headingDecoration);
    sections.push(typographyTreatments.dropCap);
    sections.push(typographyTreatments.pullQuote);
    sections.push(typographyTreatments.listMarker);
    sections.push(typographyTreatments.linkUnderline);
    sections.push(typographyTreatments.codeBlock);

    sections.push('');
    sections.push('/* ==========================================================================');
    sections.push('   Image Treatments');
    sections.push('   ========================================================================== */');
    sections.push(imageTreatments.defaultFrame);
    sections.push(imageTreatments.featured);
    sections.push(imageTreatments.thumbnail);
    sections.push(imageTreatments.gallery);
    if (imageTreatments.mask) sections.push(imageTreatments.mask);
    if (imageTreatments.overlay) sections.push(imageTreatments.overlay);

    return sections.filter(Boolean).join('\n');
  }

  /**
   * Generate default component styles from Design DNA
   */
  private getDefaultComponentStyles(designDna: DesignDNA): BrandDesignSystem['componentStyles'] {
    const radiusMap: Record<string, string> = {
      sharp: '0',
      soft: 'var(--ctc-radius-sm)',
      rounded: 'var(--ctc-radius-md)',
      pill: 'var(--ctc-radius-full)'
    };
    const buttonRadius = radiusMap[designDna.shapes.buttonStyle] || 'var(--ctc-radius-md)';

    const createComponentStyle = (baseCSS: string, variants: Record<string, string> = {}): ComponentStyleDefinition => ({
      baseCSS,
      variants,
      states: {
        hover: '',
        active: '',
        focus: '',
        disabled: ''
      },
      responsive: {
        mobile: '',
        tablet: ''
      }
    });

    return {
      button: createComponentStyle(
        `.ctc-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--ctc-spacing-sm) var(--ctc-spacing-lg);
  font-family: var(--ctc-font-body);
  font-size: var(--ctc-font-size-md);
  font-weight: 600;
  color: var(--ctc-neutral-lightest);
  background-color: var(--ctc-primary);
  border: none;
  border-radius: ${buttonRadius};
  cursor: pointer;
  transition: all var(--ctc-transition-speed) var(--ctc-easing);
  box-shadow: var(--ctc-shadow-button);
}`,
        {
          primary: `.ctc-button--primary { background-color: var(--ctc-primary); }`,
          secondary: `.ctc-button--secondary { background-color: var(--ctc-secondary); }`,
          outline: `.ctc-button--outline { background-color: transparent; border: 2px solid var(--ctc-primary); color: var(--ctc-primary); }`
        }
      ),

      card: createComponentStyle(
        `.ctc-card {
  background-color: var(--ctc-neutral-lightest);
  border-radius: var(--ctc-radius-lg);
  padding: var(--ctc-spacing-lg);
  box-shadow: var(--ctc-shadow-card);
  ${designDna.shapes.cardStyle === 'bordered' ? 'border: 1px solid var(--ctc-neutral-light);' : ''}
}`,
        {
          elevated: `.ctc-card--elevated { box-shadow: var(--ctc-shadow-elevated); }`,
          flat: `.ctc-card--flat { box-shadow: none; }`,
          bordered: `.ctc-card--bordered { border: 1px solid var(--ctc-neutral-light); box-shadow: none; }`
        }
      ),

      hero: createComponentStyle(
        `.ctc-hero {
  padding: var(--ctc-spacing-3xl) var(--ctc-spacing-lg);
  background-color: var(--ctc-neutral-lightest);
}`,
        {
          centered: `.ctc-hero--centered { text-align: center; }`,
          fullBleed: `.ctc-hero--full-bleed { padding: 0; width: 100vw; margin-left: calc(-50vw + 50%); }`
        }
      ),

      timeline: createComponentStyle(
        `.ctc-timeline {
  position: relative;
  padding-left: var(--ctc-spacing-xl);
}
.ctc-timeline::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: var(--ctc-primary);
}
.ctc-timeline__item {
  position: relative;
  padding-bottom: var(--ctc-spacing-lg);
}
.ctc-timeline__marker {
  position: absolute;
  left: calc(-1 * var(--ctc-spacing-xl) - 6px);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: var(--ctc-primary);
  border: 2px solid var(--ctc-neutral-lightest);
}`,
        {}
      ),

      testimonial: createComponentStyle(
        `.ctc-testimonial {
  padding: var(--ctc-spacing-lg);
  background-color: var(--ctc-neutral-lightest);
  border-radius: var(--ctc-radius-lg);
  border-left: 4px solid var(--ctc-primary);
}
.ctc-testimonial__quote {
  font-style: italic;
  font-size: var(--ctc-font-size-lg);
  color: var(--ctc-neutral-dark);
  margin-bottom: var(--ctc-spacing-md);
}
.ctc-testimonial__author {
  font-weight: 600;
  color: var(--ctc-neutral-darkest);
}`,
        {
          card: `.ctc-testimonial--card { border-left: none; box-shadow: var(--ctc-shadow-card); }`,
          minimal: `.ctc-testimonial--minimal { background: none; border-left: none; padding: 0; }`
        }
      ),

      faq: createComponentStyle(
        `.ctc-faq {
  border-bottom: 1px solid var(--ctc-neutral-light);
}
.ctc-faq__question {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--ctc-spacing-md) 0;
  font-weight: 600;
  cursor: pointer;
}
.ctc-faq__answer {
  padding-bottom: var(--ctc-spacing-md);
  color: var(--ctc-neutral-dark);
}`,
        {
          boxed: `.ctc-faq--boxed { border: 1px solid var(--ctc-neutral-light); border-radius: var(--ctc-radius-md); padding: 0 var(--ctc-spacing-md); margin-bottom: var(--ctc-spacing-sm); }`
        }
      ),

      cta: createComponentStyle(
        `.ctc-cta {
  background-color: var(--ctc-primary);
  color: var(--ctc-neutral-lightest);
  padding: var(--ctc-spacing-2xl);
  border-radius: var(--ctc-radius-lg);
  text-align: center;
}
.ctc-cta__heading {
  font-family: var(--ctc-font-heading);
  font-size: var(--ctc-font-size-2xl);
  font-weight: var(--ctc-heading-weight);
  margin-bottom: var(--ctc-spacing-md);
}`,
        {
          banner: `.ctc-cta--banner { border-radius: 0; }`,
          floating: `.ctc-cta--floating { position: fixed; bottom: var(--ctc-spacing-lg); right: var(--ctc-spacing-lg); max-width: 400px; box-shadow: var(--ctc-shadow-elevated); }`
        }
      ),

      keyTakeaways: createComponentStyle(
        `.ctc-key-takeaways {
  background-color: var(--ctc-neutral-light);
  border-radius: var(--ctc-radius-lg);
  padding: var(--ctc-spacing-lg);
  border-left: 4px solid var(--ctc-accent);
}
.ctc-key-takeaways__title {
  font-family: var(--ctc-font-heading);
  font-weight: var(--ctc-heading-weight);
  font-size: var(--ctc-font-size-lg);
  margin-bottom: var(--ctc-spacing-md);
}
.ctc-key-takeaways__list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.ctc-key-takeaways__item {
  padding: var(--ctc-spacing-xs) 0;
  padding-left: var(--ctc-spacing-lg);
  position: relative;
}
.ctc-key-takeaways__item::before {
  content: '\\2713';
  position: absolute;
  left: 0;
  color: var(--ctc-success);
  font-weight: bold;
}`,
        {}
      ),

      prose: createComponentStyle(
        `.ctc-prose {
  font-family: var(--ctc-font-body);
  font-size: var(--ctc-font-size-md);
  line-height: var(--ctc-body-line-height);
  color: var(--ctc-neutral-dark);
}
.ctc-prose h1, .ctc-prose h2, .ctc-prose h3, .ctc-prose h4 {
  font-family: var(--ctc-font-heading);
  font-weight: var(--ctc-heading-weight);
  color: var(--ctc-neutral-darkest);
  margin-top: var(--ctc-spacing-xl);
  margin-bottom: var(--ctc-spacing-md);
}
.ctc-prose h1 { font-size: var(--ctc-font-size-3xl); }
.ctc-prose h2 { font-size: var(--ctc-font-size-2xl); }
.ctc-prose h3 { font-size: var(--ctc-font-size-xl); }
.ctc-prose h4 { font-size: var(--ctc-font-size-lg); }
.ctc-prose p { margin-bottom: var(--ctc-spacing-md); }
.ctc-prose a { color: var(--ctc-primary); text-decoration: underline; }`,
        {}
      ),

      list: createComponentStyle(
        `.ctc-list {
  padding-left: var(--ctc-spacing-lg);
  margin-bottom: var(--ctc-spacing-md);
}
.ctc-list__item {
  margin-bottom: var(--ctc-spacing-sm);
  line-height: var(--ctc-body-line-height);
}`,
        {
          icons: `.ctc-list--icons { list-style: none; padding-left: 0; }
.ctc-list--icons .ctc-list__item { padding-left: var(--ctc-spacing-lg); position: relative; }
.ctc-list--icons .ctc-list__item::before { content: '\\2022'; position: absolute; left: 0; color: var(--ctc-primary); }`,
          cards: `.ctc-list--cards { list-style: none; padding-left: 0; display: grid; gap: var(--ctc-spacing-md); }`
        }
      ),

      table: createComponentStyle(
        `.ctc-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: var(--ctc-spacing-lg);
}
.ctc-table th, .ctc-table td {
  padding: var(--ctc-spacing-sm) var(--ctc-spacing-md);
  text-align: left;
  border-bottom: 1px solid var(--ctc-neutral-light);
}
.ctc-table th {
  font-weight: 600;
  background-color: var(--ctc-neutral-light);
  color: var(--ctc-neutral-darkest);
}
.ctc-table tr:hover {
  background-color: var(--ctc-neutral-lightest);
}`,
        {
          striped: `.ctc-table--striped tr:nth-child(even) { background-color: var(--ctc-neutral-lightest); }`,
          bordered: `.ctc-table--bordered, .ctc-table--bordered th, .ctc-table--bordered td { border: 1px solid var(--ctc-neutral-light); }`
        }
      ),

      blockquote: createComponentStyle(
        `.ctc-blockquote {
  padding: var(--ctc-spacing-md) var(--ctc-spacing-lg);
  margin: var(--ctc-spacing-lg) 0;
  border-left: 4px solid var(--ctc-primary);
  background-color: var(--ctc-neutral-lightest);
  font-style: italic;
  color: var(--ctc-neutral-dark);
}
.ctc-blockquote cite {
  display: block;
  margin-top: var(--ctc-spacing-sm);
  font-style: normal;
  font-weight: 600;
  color: var(--ctc-neutral-darkest);
}`,
        {
          centered: `.ctc-blockquote--centered { text-align: center; border-left: none; border-top: 4px solid var(--ctc-primary); }`,
          minimal: `.ctc-blockquote--minimal { background: none; border-left: 2px solid var(--ctc-neutral-medium); }`
        }
      )
    };
  }

  /**
   * Generate default decorative elements from Design DNA
   */
  private getDefaultDecorative(designDna: DesignDNA): BrandDesignSystem['decorative'] {
    // Safe access to nested properties with proper typing
    const decorative = designDna.decorative || {} as NonNullable<DesignDNA['decorative']>;
    const effects = designDna.effects || {} as NonNullable<DesignDNA['effects']>;
    const backgrounds = effects?.backgrounds || {} as NonNullable<NonNullable<DesignDNA['effects']>['backgrounds']>;

    return {
      dividers: {
        default: `.ctc-divider { height: 1px; background-color: var(--ctc-neutral-light); margin: var(--ctc-spacing-xl) 0; }`,
        subtle: `.ctc-divider--subtle { height: 1px; background-color: var(--ctc-neutral-lightest); margin: var(--ctc-spacing-lg) 0; }`,
        decorative: `.ctc-divider--decorative {
  height: 4px;
  background: linear-gradient(90deg, var(--ctc-primary), var(--ctc-accent));
  margin: var(--ctc-spacing-xl) auto;
  width: 80px;
  border-radius: var(--ctc-radius-full);
}`
      },
      sectionBackgrounds: {
        default: `.ctc-section { background-color: var(--ctc-neutral-lightest); }`,
        accent: `.ctc-section--accent { background-color: var(--ctc-neutral-light); }`,
        featured: `.ctc-section--featured { background-color: var(--ctc-primary); color: var(--ctc-neutral-lightest); }`
      },
      shapes: decorative?.usesWaveShapes ? {
        topWave: `.ctc-wave-top { position: absolute; top: 0; left: 0; width: 100%; }`,
        bottomWave: `.ctc-wave-bottom { position: absolute; bottom: 0; left: 0; width: 100%; transform: rotate(180deg); }`
      } : undefined,
      patterns: backgrounds?.usesPatterns ? {
        dots: `.ctc-pattern-dots { background-image: radial-gradient(var(--ctc-neutral-medium) 1px, transparent 1px); background-size: 20px 20px; }`,
        grid: `.ctc-pattern-grid { background-image: linear-gradient(var(--ctc-neutral-light) 1px, transparent 1px), linear-gradient(90deg, var(--ctc-neutral-light) 1px, transparent 1px); background-size: 20px 20px; }`
      } : undefined
    };
  }

  /**
   * Generate default interactions from Design DNA
   */
  private getDefaultInteractions(designDna: DesignDNA): BrandDesignSystem['interactions'] {
    // Safe access to nested properties with proper typing
    const motion = designDna.motion || {} as NonNullable<DesignDNA['motion']>;
    const hoverEffects = motion?.hoverEffects || {} as NonNullable<NonNullable<DesignDNA['motion']>['hoverEffects']>;

    const hoverMap: Record<string, string> = {
      none: '',
      darken: 'filter: brightness(0.9);',
      lift: 'transform: translateY(-2px); box-shadow: var(--ctc-shadow-elevated);',
      glow: 'box-shadow: 0 0 20px var(--ctc-primary);',
      fill: 'background-color: var(--ctc-primary-dark);',
      scale: 'transform: scale(1.05);'
    };

    const buttonHoverEffect = hoverMap[hoverEffects?.buttons || 'darken'] || hoverMap.darken;
    const cardHoverEffect = hoverMap[hoverEffects?.cards || 'none'] || '';

    return {
      buttonHover: `.ctc-button:hover { ${buttonHoverEffect} }`,
      buttonActive: `.ctc-button:active { transform: translateY(1px); }`,
      buttonFocus: `.ctc-button:focus { outline: 2px solid var(--ctc-accent); outline-offset: 2px; }`,
      cardHover: `.ctc-card:hover { ${cardHoverEffect} transition: all var(--ctc-transition-speed) var(--ctc-easing); }`,
      linkHover: `.ctc-prose a:hover { color: var(--ctc-primary-dark); }`,
      focusRing: `:focus-visible { outline: 2px solid var(--ctc-accent); outline-offset: 2px; }`,
      keyframes: {
        fadeIn: `@keyframes ctc-fade-in { from { opacity: 0; } to { opacity: 1; } }`,
        slideUp: `@keyframes ctc-slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`,
        pulse: `@keyframes ctc-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }`
      }
    };
  }

  /**
   * Generate default typography treatments from Design DNA
   */
  private getDefaultTypography(designDna: DesignDNA): BrandDesignSystem['typographyTreatments'] {
    // Safe access to nested properties
    const typography = designDna.typography || {} as DesignDNA['typography'];

    const headingDecorationMap: Record<string, string> = {
      none: '',
      solid: `
.ctc-heading-decorated::after {
  content: '';
  display: block;
  width: 60px;
  height: 3px;
  background-color: var(--ctc-primary);
  margin-top: var(--ctc-spacing-sm);
}`,
      gradient: `
.ctc-heading-decorated::after {
  content: '';
  display: block;
  width: 80px;
  height: 4px;
  background: linear-gradient(90deg, var(--ctc-primary), var(--ctc-accent));
  margin-top: var(--ctc-spacing-sm);
  border-radius: var(--ctc-radius-full);
}`,
      decorative: `
.ctc-heading-decorated {
  position: relative;
  display: inline-block;
}
.ctc-heading-decorated::before {
  content: '';
  position: absolute;
  left: -20px;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  background-color: var(--ctc-accent);
  border-radius: 50%;
}`
    };

    return {
      headingDecoration: headingDecorationMap[typography.headingUnderlineStyle] || '',
      dropCap: typography.usesDropCaps
        ? `.ctc-drop-cap::first-letter {
  float: left;
  font-size: 3.5em;
  line-height: 1;
  padding-right: var(--ctc-spacing-sm);
  font-family: var(--ctc-font-heading);
  font-weight: var(--ctc-heading-weight);
  color: var(--ctc-primary);
}`
        : '',
      pullQuote: `.ctc-pull-quote {
  font-size: var(--ctc-font-size-xl);
  font-style: italic;
  color: var(--ctc-primary);
  border-left: 4px solid var(--ctc-accent);
  padding-left: var(--ctc-spacing-lg);
  margin: var(--ctc-spacing-xl) 0;
}`,
      listMarker: `.ctc-list-custom li::marker { color: var(--ctc-primary); }`,
      linkUnderline: `.ctc-link-animated {
  position: relative;
  text-decoration: none;
}
.ctc-link-animated::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background-color: var(--ctc-primary);
  transition: width var(--ctc-transition-speed) var(--ctc-easing);
}
.ctc-link-animated:hover::after { width: 100%; }`,
      codeBlock: `.ctc-code {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.9em;
  padding: var(--ctc-spacing-xs) var(--ctc-spacing-sm);
  background-color: var(--ctc-neutral-light);
  border-radius: var(--ctc-radius-sm);
}
.ctc-code-block {
  display: block;
  padding: var(--ctc-spacing-md);
  overflow-x: auto;
  line-height: 1.5;
}`
    };
  }

  /**
   * Generate default image treatments from Design DNA
   */
  private getDefaultImageTreatments(designDna: DesignDNA): BrandDesignSystem['imageTreatments'] {
    // Safe access to nested properties
    const images = designDna.images || {} as DesignDNA['images'];

    const frameMap: Record<string, string> = {
      none: '',
      rounded: 'border-radius: var(--ctc-radius-lg);',
      shadow: 'box-shadow: var(--ctc-shadow-card);',
      border: 'border: 1px solid var(--ctc-neutral-light);',
      'custom-mask': 'clip-path: polygon(0 0, 100% 0, 100% 90%, 0 100%);'
    };

    const baseFrame = frameMap[images.frameStyle] || frameMap.rounded;
    const hoverEffect = images.hoverEffect || 'none';

    return {
      defaultFrame: `.ctc-image { ${baseFrame} width: 100%; height: auto; }`,
      featured: `.ctc-image--featured {
  ${baseFrame}
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
  ${hoverEffect === 'zoom' ? 'transition: transform var(--ctc-transition-speed) var(--ctc-easing);' : ''}
}
${hoverEffect === 'zoom' ? '.ctc-image--featured:hover { transform: scale(1.05); }' : ''}`,
      thumbnail: `.ctc-image--thumbnail {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--ctc-radius-md);
}`,
      gallery: `.ctc-image--gallery {
  ${baseFrame}
  aspect-ratio: 1/1;
  object-fit: cover;
}`,
      mask: images.frameStyle === 'custom-mask' ? `.ctc-image--masked { clip-path: polygon(0 0, 100% 0, 100% 90%, 0 100%); }` : undefined,
      overlay: `.ctc-image-overlay {
  position: relative;
}
.ctc-image-overlay::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.5));
  pointer-events: none;
}`
    };
  }

  /**
   * Generate default variant mappings from Design DNA
   */
  private getDefaultVariantMappings(designDna: DesignDNA): BrandDesignSystem['variantMappings'] {
    return {
      card: {
        default: 'ctc-card',
        elevated: 'ctc-card ctc-card--elevated',
        flat: 'ctc-card ctc-card--flat',
        bordered: 'ctc-card ctc-card--bordered'
      },
      hero: {
        default: 'ctc-hero',
        centered: 'ctc-hero ctc-hero--centered',
        fullBleed: 'ctc-hero ctc-hero--full-bleed'
      },
      button: {
        default: 'ctc-button',
        primary: 'ctc-button ctc-button--primary',
        secondary: 'ctc-button ctc-button--secondary',
        outline: 'ctc-button ctc-button--outline'
      },
      cta: {
        default: 'ctc-cta',
        banner: 'ctc-cta ctc-cta--banner',
        floating: 'ctc-cta ctc-cta--floating'
      }
    };
  }
}
