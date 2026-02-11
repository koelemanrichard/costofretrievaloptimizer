// services/design-analysis/__tests__/BrandDesignSystemGenerator.test.ts
import { describe, it, expect } from 'vitest';
import { BrandDesignSystemGenerator } from '../BrandDesignSystemGenerator';
import type { DesignDNA } from '../../../types/designDna';

describe('BrandDesignSystemGenerator', () => {
  const mockDesignDna: Partial<DesignDNA> = {
    colors: {
      primary: { hex: '#012d55', usage: 'buttons', confidence: 95 },
      primaryLight: { hex: '#1a4a7a', usage: 'hover', confidence: 80 },
      primaryDark: { hex: '#001a33', usage: 'active', confidence: 75 },
      secondary: { hex: '#64748b', usage: 'text', confidence: 85 },
      accent: { hex: '#0ea5e9', usage: 'links', confidence: 90 },
      neutrals: {
        darkest: '#0f172a',
        dark: '#334155',
        medium: '#94a3b8',
        light: '#e2e8f0',
        lightest: '#f8fafc'
      },
      semantic: {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
      },
      harmony: 'monochromatic',
      dominantMood: 'corporate',
      contrastLevel: 'medium'
    },
    typography: {
      headingFont: {
        family: 'Inter',
        fallback: 'sans-serif',
        weight: 700,
        style: 'sans-serif',
        character: 'modern'
      },
      bodyFont: {
        family: 'Inter',
        fallback: 'sans-serif',
        weight: 400,
        style: 'sans-serif',
        lineHeight: 1.6
      },
      baseSize: '16px',
      scaleRatio: 1.25,
      headingCase: 'none',
      headingLetterSpacing: 'normal',
      usesDropCaps: false,
      headingUnderlineStyle: 'none',
      linkStyle: 'underline'
    },
    spacing: {
      baseUnit: 16,
      density: 'comfortable',
      sectionGap: 'generous',
      contentWidth: 'medium',
      whitespacePhilosophy: 'balanced'
    },
    shapes: {
      borderRadius: {
        style: 'subtle',
        small: '2px',
        medium: '4px',
        large: '6px',
        full: '9999px'
      },
      buttonStyle: 'sharp',
      cardStyle: 'bordered',
      inputStyle: 'bordered'
    },
    effects: {
      shadows: {
        style: 'subtle',
        cardShadow: '0 1px 2px rgba(0,0,0,0.05)',
        buttonShadow: '0 4px 6px rgba(0,0,0,0.1)',
        elevatedShadow: '0 10px 15px rgba(0,0,0,0.1)'
      },
      gradients: {
        usage: 'none',
        primaryGradient: 'none',
        heroGradient: 'none',
        ctaGradient: 'none'
      },
      backgrounds: {
        usesPatterns: false,
        usesTextures: false,
        usesOverlays: false
      },
      borders: {
        style: 'subtle',
        defaultColor: '#e2e8f0',
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
      decorativeAccentColor: '#0ea5e9'
    },
    layout: {
      gridStyle: 'strict-12',
      alignment: 'left',
      heroStyle: 'contained',
      cardLayout: 'grid',
      ctaPlacement: 'inline',
      navigationStyle: 'standard'
    },
    motion: {
      overall: 'subtle',
      transitionSpeed: 'normal',
      easingStyle: 'ease',
      hoverEffects: {
        buttons: 'darken',
        cards: 'lift',
        links: 'underline'
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
      energy: 2,
      warmth: 2,
      trustSignals: 'prominent'
    },
    confidence: {
      overall: 85,
      colorsConfidence: 90,
      typographyConfidence: 80,
      layoutConfidence: 85
    },
    analysisNotes: ['Corporate design with professional color palette']
  };

  describe('generateTokensFromDNA', () => {
    it('should generate CSS custom properties from design DNA', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const tokens = generator.generateTokensFromDNA(mockDesignDna as DesignDNA);

      expect(tokens.css).toContain('--ctc-primary');
      expect(tokens.css).toContain('#012d55');
      expect(tokens.json['--ctc-primary']).toBe('#012d55');
    });

    it('should include all color tokens', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const tokens = generator.generateTokensFromDNA(mockDesignDna as DesignDNA);

      expect(tokens.json['--ctc-primary']).toBe('#012d55');
      expect(tokens.json['--ctc-primary-light']).toBe('#1a4a7a');
      expect(tokens.json['--ctc-primary-dark']).toBe('#001a33');
      expect(tokens.json['--ctc-secondary']).toBe('#64748b');
      expect(tokens.json['--ctc-accent']).toBe('#0ea5e9');
    });

    it('should include neutral color tokens', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const tokens = generator.generateTokensFromDNA(mockDesignDna as DesignDNA);

      expect(tokens.json['--ctc-neutral-darkest']).toBe('#0f172a');
      expect(tokens.json['--ctc-neutral-dark']).toBe('#334155');
      expect(tokens.json['--ctc-neutral-medium']).toBe('#94a3b8');
      expect(tokens.json['--ctc-neutral-light']).toBe('#e2e8f0');
      expect(tokens.json['--ctc-neutral-lightest']).toBe('#f8fafc');
    });

    it('should include semantic color tokens', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const tokens = generator.generateTokensFromDNA(mockDesignDna as DesignDNA);

      expect(tokens.json['--ctc-success']).toBe('#10b981');
      expect(tokens.json['--ctc-warning']).toBe('#f59e0b');
      expect(tokens.json['--ctc-error']).toBe('#ef4444');
      expect(tokens.json['--ctc-info']).toBe('#3b82f6');
    });

    it('should include typography tokens', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const tokens = generator.generateTokensFromDNA(mockDesignDna as DesignDNA);

      expect(tokens.json['--ctc-font-heading']).toBe('Inter, sans-serif');
      expect(tokens.json['--ctc-font-body']).toBe('Inter, sans-serif');
      expect(tokens.json['--ctc-font-size-base']).toBe('16px');
    });

    it('should include spacing tokens', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const tokens = generator.generateTokensFromDNA(mockDesignDna as DesignDNA);

      expect(tokens.json['--ctc-spacing-unit']).toBe('16px');
      expect(tokens.json['--ctc-spacing-xs']).toBeDefined();
      expect(tokens.json['--ctc-spacing-sm']).toBeDefined();
      expect(tokens.json['--ctc-spacing-md']).toBeDefined();
      expect(tokens.json['--ctc-spacing-lg']).toBeDefined();
      expect(tokens.json['--ctc-spacing-xl']).toBeDefined();
    });

    it('should include border radius tokens', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const tokens = generator.generateTokensFromDNA(mockDesignDna as DesignDNA);

      expect(tokens.json['--ctc-radius-sm']).toBe('2px');
      expect(tokens.json['--ctc-radius-md']).toBe('4px');
      expect(tokens.json['--ctc-radius-lg']).toBe('6px');
      expect(tokens.json['--ctc-radius-full']).toBe('9999px');
    });

    it('should include shadow tokens', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const tokens = generator.generateTokensFromDNA(mockDesignDna as DesignDNA);

      expect(tokens.json['--ctc-shadow-card']).toBe('0 1px 2px rgba(0,0,0,0.05)');
      expect(tokens.json['--ctc-shadow-button']).toBe('0 4px 6px rgba(0,0,0,0.1)');
      expect(tokens.json['--ctc-shadow-elevated']).toBe('0 10px 15px rgba(0,0,0,0.1)');
    });

    it('should include motion tokens', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const tokens = generator.generateTokensFromDNA(mockDesignDna as DesignDNA);

      expect(tokens.json['--ctc-transition-speed']).toBeDefined();
      expect(tokens.json['--ctc-easing']).toBeDefined();
    });
  });

  describe('computeDesignDnaHash', () => {
    it('should generate consistent hash for same DNA', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const hash1 = generator.computeDesignDnaHash(mockDesignDna as DesignDNA);
      const hash2 = generator.computeDesignDnaHash(mockDesignDna as DesignDNA);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different DNA', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const modifiedDna = {
        ...mockDesignDna,
        colors: {
          ...mockDesignDna.colors!,
          primary: { hex: '#FF0000', usage: 'buttons', confidence: 95 }
        }
      };

      const hash1 = generator.computeDesignDnaHash(mockDesignDna as DesignDNA);
      const hash2 = generator.computeDesignDnaHash(modifiedDna as DesignDNA);

      expect(hash1).not.toBe(hash2);
    });

    it('should return a string hash', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const hash = generator.computeDesignDnaHash(mockDesignDna as DesignDNA);

      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('constructor', () => {
    it('should accept gemini provider', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });
      expect(generator).toBeDefined();
    });

    it('should accept anthropic provider', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'anthropic',
        apiKey: 'test-key'
      });
      expect(generator).toBeDefined();
    });
  });

  describe('getProviderInfo', () => {
    it('should return correct model for gemini provider', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const info = generator.getProviderInfo();
      expect(info.provider).toBe('gemini');
      expect(info.model).toBe('gemini-2.5-flash');
    });

    it('should return correct model for anthropic provider', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'anthropic',
        apiKey: 'test-key'
      });

      const info = generator.getProviderInfo();
      expect(info.provider).toBe('anthropic');
      expect(info.model).toBe('claude-sonnet-4-5-20250929');
    });

    it('should allow custom model override', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key',
        model: 'gemini-1.5-pro'
      });

      const info = generator.getProviderInfo();
      expect(info.model).toBe('gemini-1.5-pro');
    });
  });

  describe('parseAIResponse', () => {
    it('should parse clean JSON response', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const response = '{"componentStyles": {"button": {}}}';
      const result = generator.parseAIResponse(response);

      expect(result).toEqual({ componentStyles: { button: {} } });
    });

    it('should extract JSON from markdown code blocks', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const response = `Here is the design system:
\`\`\`json
{"componentStyles": {"card": {}}}
\`\`\`
That's the result.`;

      const result = generator.parseAIResponse(response);
      expect(result).toEqual({ componentStyles: { card: {} } });
    });

    it('should throw error for invalid JSON', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const response = 'This is not JSON at all';

      expect(() => generator.parseAIResponse(response)).toThrow('Failed to extract JSON from AI response');
    });
  });

  describe('defensive coding - edge cases', () => {
    it('should handle minimal DesignDNA with only required color fields', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      // Minimal DNA that might come from AI
      const minimalDna = {
        colors: {
          primary: { hex: '#3b82f6', usage: 'buttons', confidence: 80 }
        }
      } as unknown as DesignDNA;

      const tokens = generator.generateTokensFromDNA(minimalDna);

      // Should use fallbacks for missing properties
      expect(tokens.json['--ctc-primary']).toBe('#3b82f6');
      expect(tokens.json['--ctc-primary-light']).toBe('#e2ecfe'); // derived: lighten primary by 85%
      expect(tokens.json['--ctc-secondary']).toBe('#1f2937'); // fallback
      expect(tokens.json['--ctc-neutral-darkest']).toBe('#111827'); // fallback
      expect(tokens.json['--ctc-success']).toBe('#10b981'); // fallback
    });

    it('should handle DesignDNA with missing colors.neutrals', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const dnaMissingNeutrals = {
        colors: {
          primary: { hex: '#ff0000', usage: 'test', confidence: 90 },
          // neutrals intentionally missing
          semantic: {
            success: '#00ff00',
            warning: '#ffff00',
            error: '#ff0000',
            info: '#0000ff'
          }
        }
      } as unknown as DesignDNA;

      const tokens = generator.generateTokensFromDNA(dnaMissingNeutrals);

      // neutrals should use fallbacks
      expect(tokens.json['--ctc-neutral-darkest']).toBe('#111827');
      expect(tokens.json['--ctc-neutral-light']).toBe('#d1d5db');
      // semantic colors should be used
      expect(tokens.json['--ctc-success']).toBe('#00ff00');
    });

    it('should handle DesignDNA with missing typography', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const dnaNoTypography = {
        colors: {
          primary: { hex: '#3b82f6', usage: 'test', confidence: 90 }
        }
        // typography intentionally missing
      } as unknown as DesignDNA;

      const tokens = generator.generateTokensFromDNA(dnaNoTypography);

      // Should use fallback fonts
      expect(tokens.json['--ctc-font-heading']).toBe('system-ui, sans-serif');
      expect(tokens.json['--ctc-font-body']).toBe('system-ui, sans-serif');
      expect(tokens.json['--ctc-font-size-base']).toBe('16px');
    });

    it('should handle DesignDNA with missing effects.shadows', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const dnaNoShadows = {
        colors: {
          primary: { hex: '#3b82f6', usage: 'test', confidence: 90 }
        },
        effects: {
          // shadows intentionally missing
          backgrounds: {
            usesPatterns: false
          }
        }
      } as unknown as DesignDNA;

      const tokens = generator.generateTokensFromDNA(dnaNoShadows);

      // Should use fallback shadows
      expect(tokens.json['--ctc-shadow-card']).toBe('0 1px 3px rgba(0,0,0,0.1)');
      expect(tokens.json['--ctc-shadow-button']).toBe('0 1px 2px rgba(0,0,0,0.05)');
    });

    it('should handle completely empty DesignDNA', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const emptyDna = {} as unknown as DesignDNA;

      const tokens = generator.generateTokensFromDNA(emptyDna);

      // All values should be fallbacks
      expect(tokens.json['--ctc-primary']).toBe('#3b82f6');
      expect(tokens.json['--ctc-secondary']).toBe('#1f2937');
      expect(tokens.json['--ctc-font-heading']).toBe('system-ui, sans-serif');
      expect(tokens.json['--ctc-spacing-unit']).toBe('16px');
      expect(tokens.css).toContain(':root');
    });

    it('should handle DesignDNA where colors are strings instead of objects', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      // AI might return colors as plain strings
      const dnaWithStringColors = {
        colors: {
          primary: '#ff6600', // string instead of { hex, usage, confidence }
          secondary: '#333333'
        }
      } as unknown as DesignDNA;

      const tokens = generator.generateTokensFromDNA(dnaWithStringColors);

      // Should handle string colors via getHex helper
      expect(tokens.json['--ctc-primary']).toBe('#ff6600');
      expect(tokens.json['--ctc-secondary']).toBe('#333333');
    });
  });
});
