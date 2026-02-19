import { describe, it, expect } from 'vitest';
import { VisualEmphasizer } from '../VisualEmphasizer';
import { SectionAnalysis, ContentType, SectionConstraints, SemanticWeightFactors } from '../types';
import { DesignDNA } from '../../../types/designDna';

// =============================================================================
// HELPER FACTORIES
// =============================================================================

function createMockSectionAnalysis(overrides: Partial<SectionAnalysis> = {}): SectionAnalysis {
  const defaultFactors: SemanticWeightFactors = {
    baseWeight: 3,
    topicCategoryBonus: 0,
    coreTopicBonus: 0,
    fsTargetBonus: 0,
    mainIntentBonus: 0,
    totalWeight: 3,
  };

  const defaultConstraints: SectionConstraints = {};

  return {
    sectionId: 'section-1',
    heading: 'Test Section',
    headingLevel: 2,
    contentType: 'explanation' as ContentType,
    semanticWeight: 3,
    semanticWeightFactors: defaultFactors,
    constraints: defaultConstraints,
    wordCount: 100,
    hasTable: false,
    hasList: false,
    hasQuote: false,
    hasImage: false,
    isCoreTopic: false,
    answersMainIntent: false,
    contentZone: 'MAIN',
    ...overrides,
  };
}

function createMockDesignDNA(overrides: Partial<DesignDNA> = {}): DesignDNA {
  return {
    colors: {
      primary: { hex: '#3B82F6', usage: 'primary', confidence: 0.9 },
      primaryLight: { hex: '#60A5FA', usage: 'primary-light', confidence: 0.8 },
      primaryDark: { hex: '#1D4ED8', usage: 'primary-dark', confidence: 0.8 },
      secondary: { hex: '#10B981', usage: 'secondary', confidence: 0.8 },
      accent: { hex: '#F59E0B', usage: 'accent', confidence: 0.8 },
      neutrals: {
        darkest: '#111827',
        dark: '#374151',
        medium: '#6B7280',
        light: '#D1D5DB',
        lightest: '#F9FAFB',
      },
      semantic: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      harmony: 'complementary',
      dominantMood: 'corporate',
      contrastLevel: 'medium',
    },
    typography: {
      headingFont: {
        family: 'Inter',
        fallback: 'sans-serif',
        weight: 700,
        style: 'sans-serif',
        character: 'modern',
      },
      bodyFont: {
        family: 'Inter',
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
      baseUnit: 8,
      density: 'comfortable',
      sectionGap: 'moderate',
      contentWidth: 'medium',
      whitespacePhilosophy: 'balanced',
    },
    shapes: {
      borderRadius: {
        style: 'subtle',
        small: '4px',
        medium: '8px',
        large: '12px',
        full: '9999px',
      },
      buttonStyle: 'soft',
      cardStyle: 'subtle-shadow',
      inputStyle: 'bordered',
    },
    effects: {
      shadows: {
        style: 'subtle',
        cardShadow: '0 1px 3px rgba(0,0,0,0.1)',
        buttonShadow: '0 1px 2px rgba(0,0,0,0.05)',
        elevatedShadow: '0 4px 6px rgba(0,0,0,0.1)',
      },
      gradients: {
        usage: 'subtle',
        primaryGradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
        heroGradient: 'linear-gradient(180deg, #F9FAFB, #FFFFFF)',
        ctaGradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
      },
      backgrounds: {
        usesPatterns: false,
        usesTextures: false,
        usesOverlays: false,
      },
      borders: {
        style: 'subtle',
        defaultColor: '#E5E7EB',
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
      decorativeAccentColor: '#3B82F6',
    },
    layout: {
      gridStyle: 'strict-12',
      alignment: 'left',
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
        links: 'underline',
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
      preferredCardStyle: 'minimal',
      testimonialStyle: 'card',
      faqStyle: 'accordion',
      ctaStyle: 'button',
    },
    personality: {
      overall: 'corporate',
      formality: 4,
      energy: 2,
      warmth: 3,
      trustSignals: 'moderate',
    },
    confidence: {
      overall: 0.85,
      colorsConfidence: 0.9,
      typographyConfidence: 0.85,
      layoutConfidence: 0.8,
    },
    analysisNotes: [],
    ...overrides,
  } as DesignDNA;
}

// =============================================================================
// EMPHASIS LEVEL MAPPING TESTS
// =============================================================================

describe('VisualEmphasizer', () => {
  describe('semantic weight to emphasis level mapping', () => {
    it('should map weight 5 to hero level', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.level).toBe('hero');
    });

    it('should map weight 4 to featured level', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.level).toBe('featured');
    });

    it('should map weight 3 to standard level', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.level).toBe('standard');
    });

    it('should map weight 2 to supporting level', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 2 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.level).toBe('supporting');
    });

    it('should map weight 1 to minimal level', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 1 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.level).toBe('minimal');
    });

    it('should handle weight 0 as minimal', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 0 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.level).toBe('minimal');
    });

    it('should clamp weights above 5 to hero', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 7 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.level).toBe('hero');
    });
  });

  // =============================================================================
  // HERO LEVEL PROPERTIES TESTS (weight 5)
  // =============================================================================

  describe('hero level properties (weight 5)', () => {
    it('should have xl heading size', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.headingSize).toBe('xl');
    });

    it('should have heading decoration with type background', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.headingDecoration).toEqual(expect.objectContaining({ type: 'background' }));
    });

    it('should have 2x padding multiplier', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.paddingMultiplier).toBe(2);
    });

    it('should have 2x margin multiplier', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.marginMultiplier).toBe(2);
    });

    it('should have background treatment', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.hasBackgroundTreatment).toBe(true);
    });

    it('should have solid background for minimal personality', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const minimalDna = createMockDesignDNA({
        personality: {
          overall: 'minimal',
          formality: 2,
          energy: 2,
          warmth: 2,
          trustSignals: 'minimal',
        },
      });

      const result = VisualEmphasizer.calculateEmphasis(analysis, minimalDna);

      expect(result.backgroundType).toBe('solid');
    });

    it('should have gradient background for non-minimal personality', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const creativeDna = createMockDesignDNA({
        personality: {
          overall: 'creative',
          formality: 2,
          energy: 4,
          warmth: 4,
          trustSignals: 'minimal',
        },
      });

      const result = VisualEmphasizer.calculateEmphasis(analysis, creativeDna);

      expect(result.backgroundType).toBe('gradient');
    });

    it('should have elevation 0 (hero is foundational)', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.elevation).toBe(0);
    });

    it('should have no accent border', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.hasAccentBorder).toBe(false);
    });

    it('should have entry animation when motion is not static', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const dynamicDna = createMockDesignDNA({
        motion: {
          overall: 'dynamic',
          transitionSpeed: 'normal',
          easingStyle: 'ease',
          hoverEffects: { buttons: 'darken', cards: 'lift', links: 'underline' },
          scrollAnimations: true,
          parallaxEffects: false,
        },
      });

      const result = VisualEmphasizer.calculateEmphasis(analysis, dynamicDna);

      expect(result.hasEntryAnimation).toBe(true);
    });

    it('should have no entry animation when motion is static', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const staticDna = createMockDesignDNA({
        motion: {
          overall: 'static',
          transitionSpeed: 'instant',
          easingStyle: 'linear',
          hoverEffects: { buttons: 'none', cards: 'none', links: 'none' },
          scrollAnimations: false,
          parallaxEffects: false,
        },
      });

      const result = VisualEmphasizer.calculateEmphasis(analysis, staticDna);

      expect(result.hasEntryAnimation).toBe(false);
    });
  });

  // =============================================================================
  // FEATURED LEVEL PROPERTIES TESTS (weight 4)
  // =============================================================================

  describe('featured level properties (weight 4)', () => {
    it('should have lg heading size', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.headingSize).toBe('lg');
    });

    it('should have heading decoration with type border-bottom', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.headingDecoration).toEqual(expect.objectContaining({ type: 'border-bottom' }));
    });

    it('should have 1.5x padding multiplier', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.paddingMultiplier).toBe(1.5);
    });

    it('should have 1.5x margin multiplier', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.marginMultiplier).toBe(1.5);
    });

    it('should have accent border', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.hasAccentBorder).toBe(true);
    });

    it('should have left accent position', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.accentPosition).toBe('left');
    });

    it('should have elevation 2', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.elevation).toBe(2);
    });

    it('should have background treatment when energy >= 3', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const energeticDna = createMockDesignDNA({
        personality: {
          overall: 'bold',
          formality: 3,
          energy: 4,
          warmth: 3,
          trustSignals: 'moderate',
        },
      });

      const result = VisualEmphasizer.calculateEmphasis(analysis, energeticDna);

      expect(result.hasBackgroundTreatment).toBe(true);
    });

    it('should not have background treatment when energy < 3', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const calmDna = createMockDesignDNA({
        personality: {
          overall: 'corporate',
          formality: 4,
          energy: 2,
          warmth: 3,
          trustSignals: 'moderate',
        },
      });

      const result = VisualEmphasizer.calculateEmphasis(analysis, calmDna);

      expect(result.hasBackgroundTreatment).toBe(false);
    });

    it('should have entry animation when motion is enabled and energy >= 3', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const energeticMotionDna = createMockDesignDNA({
        motion: {
          overall: 'dynamic',
          transitionSpeed: 'normal',
          easingStyle: 'ease',
          hoverEffects: { buttons: 'darken', cards: 'lift', links: 'underline' },
          scrollAnimations: true,
          parallaxEffects: false,
        },
        personality: {
          overall: 'bold',
          formality: 3,
          energy: 4,
          warmth: 3,
          trustSignals: 'moderate',
        },
      });

      const result = VisualEmphasizer.calculateEmphasis(analysis, energeticMotionDna);

      expect(result.hasEntryAnimation).toBe(true);
    });

    it('should not have entry animation when motion is static', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const staticDna = createMockDesignDNA({
        motion: {
          overall: 'static',
          transitionSpeed: 'instant',
          easingStyle: 'linear',
          hoverEffects: { buttons: 'none', cards: 'none', links: 'none' },
          scrollAnimations: false,
          parallaxEffects: false,
        },
        personality: {
          overall: 'bold',
          formality: 3,
          energy: 4,
          warmth: 3,
          trustSignals: 'moderate',
        },
      });

      const result = VisualEmphasizer.calculateEmphasis(analysis, staticDna);

      expect(result.hasEntryAnimation).toBe(false);
    });

    it('should not have entry animation when energy < 3 even with motion enabled', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const subtleMotionDna = createMockDesignDNA({
        motion: {
          overall: 'subtle',
          transitionSpeed: 'normal',
          easingStyle: 'ease',
          hoverEffects: { buttons: 'darken', cards: 'lift', links: 'underline' },
          scrollAnimations: false,
          parallaxEffects: false,
        },
        personality: {
          overall: 'corporate',
          formality: 4,
          energy: 2,
          warmth: 3,
          trustSignals: 'moderate',
        },
      });

      const result = VisualEmphasizer.calculateEmphasis(analysis, subtleMotionDna);

      expect(result.hasEntryAnimation).toBe(false);
    });
  });

  // =============================================================================
  // STANDARD LEVEL PROPERTIES TESTS (weight 3)
  // =============================================================================

  describe('standard level properties (weight 3)', () => {
    it('should have md heading size', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.headingSize).toBe('md');
    });

    it('should have no heading decoration', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.headingDecoration).toEqual({ type: 'none' });
    });

    it('should have 1x padding multiplier', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.paddingMultiplier).toBe(1);
    });

    it('should have 1x margin multiplier', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.marginMultiplier).toBe(1);
    });

    it('should not have background treatment', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.hasBackgroundTreatment).toBe(false);
    });

    it('should not have accent border', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.hasAccentBorder).toBe(false);
    });

    it('should have elevation 0', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.elevation).toBe(0);
    });

    it('should not have entry animation', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const dynamicDna = createMockDesignDNA({
        motion: {
          overall: 'dynamic',
          transitionSpeed: 'normal',
          easingStyle: 'ease',
          hoverEffects: { buttons: 'darken', cards: 'lift', links: 'underline' },
          scrollAnimations: true,
          parallaxEffects: false,
        },
      });

      const result = VisualEmphasizer.calculateEmphasis(analysis, dynamicDna);

      expect(result.hasEntryAnimation).toBe(false);
    });
  });

  // =============================================================================
  // SUPPORTING LEVEL PROPERTIES TESTS (weight 2)
  // =============================================================================

  describe('supporting level properties (weight 2)', () => {
    it('should have sm heading size', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 2 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.headingSize).toBe('sm');
    });

    it('should have 0.75x padding multiplier', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 2 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.paddingMultiplier).toBe(0.75);
    });

    it('should have 0.75x margin multiplier', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 2 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.marginMultiplier).toBe(0.75);
    });

    it('should have no heading decoration', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 2 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.headingDecoration).toEqual({ type: 'none' });
    });

    it('should not have background treatment', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 2 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.hasBackgroundTreatment).toBe(false);
    });

    it('should not have accent border', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 2 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.hasAccentBorder).toBe(false);
    });

    it('should have elevation 0', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 2 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.elevation).toBe(0);
    });

    it('should not have entry animation', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 2 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.hasEntryAnimation).toBe(false);
    });
  });

  // =============================================================================
  // MINIMAL LEVEL PROPERTIES TESTS (weight 1)
  // =============================================================================

  describe('minimal level properties (weight 1)', () => {
    it('should have sm heading size', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 1 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.headingSize).toBe('sm');
    });

    it('should have 0.5x padding multiplier', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 1 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.paddingMultiplier).toBe(0.5);
    });

    it('should have 0.5x margin multiplier', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 1 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.marginMultiplier).toBe(0.5);
    });

    it('should have no heading decoration', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 1 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.headingDecoration).toEqual({ type: 'none' });
    });

    it('should not have background treatment', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 1 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.hasBackgroundTreatment).toBe(false);
    });

    it('should not have accent border', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 1 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.hasAccentBorder).toBe(false);
    });

    it('should have elevation 0', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 1 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.elevation).toBe(0);
    });

    it('should not have entry animation', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 1 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.hasEntryAnimation).toBe(false);
    });
  });

  // =============================================================================
  // BRAND DNA INFLUENCE TESTS
  // =============================================================================

  describe('brand DNA influence', () => {
    describe('motion settings', () => {
      it('should disable all animations when motion is static', () => {
        const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
        const staticDna = createMockDesignDNA({
          motion: {
            overall: 'static',
            transitionSpeed: 'instant',
            easingStyle: 'linear',
            hoverEffects: { buttons: 'none', cards: 'none', links: 'none' },
            scrollAnimations: false,
            parallaxEffects: false,
          },
        });

        const result = VisualEmphasizer.calculateEmphasis(analysis, staticDna);

        expect(result.hasEntryAnimation).toBe(false);
        expect(result.animationType).toBeUndefined();
      });

      it('should enable animations when motion is subtle', () => {
        const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
        const subtleDna = createMockDesignDNA({
          motion: {
            overall: 'subtle',
            transitionSpeed: 'normal',
            easingStyle: 'ease',
            hoverEffects: { buttons: 'darken', cards: 'lift', links: 'underline' },
            scrollAnimations: false,
            parallaxEffects: false,
          },
        });

        const result = VisualEmphasizer.calculateEmphasis(analysis, subtleDna);

        expect(result.hasEntryAnimation).toBe(true);
      });

      it('should enable animations when motion is dynamic', () => {
        const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
        const dynamicDna = createMockDesignDNA({
          motion: {
            overall: 'dynamic',
            transitionSpeed: 'normal',
            easingStyle: 'ease',
            hoverEffects: { buttons: 'darken', cards: 'lift', links: 'underline' },
            scrollAnimations: true,
            parallaxEffects: false,
          },
        });

        const result = VisualEmphasizer.calculateEmphasis(analysis, dynamicDna);

        expect(result.hasEntryAnimation).toBe(true);
      });

      it('should enable animations when motion is expressive', () => {
        const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
        const expressiveDna = createMockDesignDNA({
          motion: {
            overall: 'expressive',
            transitionSpeed: 'slow',
            easingStyle: 'spring',
            hoverEffects: { buttons: 'glow', cards: 'tilt', links: 'highlight' },
            scrollAnimations: true,
            parallaxEffects: true,
          },
        });

        const result = VisualEmphasizer.calculateEmphasis(analysis, expressiveDna);

        expect(result.hasEntryAnimation).toBe(true);
      });
    });

    describe('personality settings', () => {
      it('should use solid background for minimal personality on hero', () => {
        const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
        const minimalDna = createMockDesignDNA({
          personality: {
            overall: 'minimal',
            formality: 2,
            energy: 2,
            warmth: 2,
            trustSignals: 'minimal',
          },
        });

        const result = VisualEmphasizer.calculateEmphasis(analysis, minimalDna);

        expect(result.backgroundType).toBe('solid');
      });

      it('should use gradient background for corporate personality on hero', () => {
        const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
        const corporateDna = createMockDesignDNA({
          personality: {
            overall: 'corporate',
            formality: 4,
            energy: 2,
            warmth: 3,
            trustSignals: 'prominent',
          },
        });

        const result = VisualEmphasizer.calculateEmphasis(analysis, corporateDna);

        expect(result.backgroundType).toBe('gradient');
      });

      it('should use gradient background for creative personality on hero', () => {
        const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
        const creativeDna = createMockDesignDNA({
          personality: {
            overall: 'creative',
            formality: 2,
            energy: 4,
            warmth: 4,
            trustSignals: 'minimal',
          },
        });

        const result = VisualEmphasizer.calculateEmphasis(analysis, creativeDna);

        expect(result.backgroundType).toBe('gradient');
      });
    });

    describe('energy settings for featured level', () => {
      it('should enable background treatment when energy is 3', () => {
        const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
        const dna = createMockDesignDNA({
          personality: {
            overall: 'corporate',
            formality: 3,
            energy: 3,
            warmth: 3,
            trustSignals: 'moderate',
          },
        });

        const result = VisualEmphasizer.calculateEmphasis(analysis, dna);

        expect(result.hasBackgroundTreatment).toBe(true);
      });

      it('should enable background treatment when energy is 5', () => {
        const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
        const dna = createMockDesignDNA({
          personality: {
            overall: 'bold',
            formality: 3,
            energy: 5,
            warmth: 3,
            trustSignals: 'moderate',
          },
        });

        const result = VisualEmphasizer.calculateEmphasis(analysis, dna);

        expect(result.hasBackgroundTreatment).toBe(true);
      });
    });
  });

  // =============================================================================
  // ANIMATION TYPE TESTS
  // =============================================================================

  describe('animation types', () => {
    it('should provide fade animation type for hero when animated', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const dynamicDna = createMockDesignDNA({
        motion: {
          overall: 'subtle',
          transitionSpeed: 'normal',
          easingStyle: 'ease',
          hoverEffects: { buttons: 'darken', cards: 'lift', links: 'underline' },
          scrollAnimations: false,
          parallaxEffects: false,
        },
      });

      const result = VisualEmphasizer.calculateEmphasis(analysis, dynamicDna);

      expect(result.hasEntryAnimation).toBe(true);
      expect(result.animationType).toBeDefined();
      expect(['fade', 'slide', 'scale']).toContain(result.animationType);
    });

    it('should not provide animation type when no animation', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result.hasEntryAnimation).toBe(false);
      expect(result.animationType).toBeUndefined();
    });
  });

  // =============================================================================
  // CALCULATE ALL EMPHASIS TESTS
  // =============================================================================

  describe('calculateAllEmphasis', () => {
    it('should calculate emphasis for all sections', () => {
      const analyses = [
        createMockSectionAnalysis({ sectionId: 'section-1', semanticWeight: 5 }),
        createMockSectionAnalysis({ sectionId: 'section-2', semanticWeight: 3 }),
        createMockSectionAnalysis({ sectionId: 'section-3', semanticWeight: 1 }),
      ];

      const results = VisualEmphasizer.calculateAllEmphasis(analyses);

      expect(results).toHaveLength(3);
      expect(results[0].level).toBe('hero');
      expect(results[1].level).toBe('standard');
      expect(results[2].level).toBe('minimal');
    });

    it('should apply design DNA consistently to all sections', () => {
      const analyses = [
        createMockSectionAnalysis({ sectionId: 'section-1', semanticWeight: 5 }),
        createMockSectionAnalysis({ sectionId: 'section-2', semanticWeight: 4 }),
      ];
      const staticDna = createMockDesignDNA({
        motion: {
          overall: 'static',
          transitionSpeed: 'instant',
          easingStyle: 'linear',
          hoverEffects: { buttons: 'none', cards: 'none', links: 'none' },
          scrollAnimations: false,
          parallaxEffects: false,
        },
      });

      const results = VisualEmphasizer.calculateAllEmphasis(analyses, staticDna);

      expect(results[0].hasEntryAnimation).toBe(false);
      expect(results[1].hasEntryAnimation).toBe(false);
    });

    it('should return empty array for empty input', () => {
      const results = VisualEmphasizer.calculateAllEmphasis([]);
      expect(results).toEqual([]);
    });
  });

  // =============================================================================
  // INSTANCE METHODS TESTS
  // =============================================================================

  describe('instance methods', () => {
    it('should provide instance method for determineEmphasis', () => {
      const emphasizer = new VisualEmphasizer();
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const result = emphasizer.determineEmphasis(analysis);

      expect(result).toBeDefined();
      expect(result.level).toBe('featured');
    });

    it('should provide instance method for determineAllEmphasis', () => {
      const emphasizer = new VisualEmphasizer();
      const analyses = [createMockSectionAnalysis({ semanticWeight: 5 })];
      const results = emphasizer.determineAllEmphasis(analyses);

      expect(results).toHaveLength(1);
      expect(results[0].level).toBe('hero');
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('edge cases', () => {
    it('should handle missing DNA gracefully', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      expect(result).toBeDefined();
      expect(result.level).toBe('hero');
      // Should default to gradient background without DNA
      expect(result.backgroundType).toBe('gradient');
    });

    it('should handle missing motion settings', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const partialDna = createMockDesignDNA();
      delete (partialDna as Partial<DesignDNA>).motion;

      const result = VisualEmphasizer.calculateEmphasis(analysis, partialDna);

      expect(result).toBeDefined();
      expect(result.level).toBe('hero');
    });

    it('should handle missing personality settings', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const partialDna = createMockDesignDNA();
      delete (partialDna as Partial<DesignDNA>).personality;

      const result = VisualEmphasizer.calculateEmphasis(analysis, partialDna);

      expect(result).toBeDefined();
      expect(result.level).toBe('hero');
    });

    it('should handle fractional semantic weights', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3.7 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      // Should round to nearest level (4 -> featured)
      expect(result.level).toBe('featured');
    });

    it('should handle negative semantic weights', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: -1 });
      const result = VisualEmphasizer.calculateEmphasis(analysis);

      // Should clamp to minimal
      expect(result.level).toBe('minimal');
    });
  });

  // =============================================================================
  // STRUCTURED HEADING DECORATION TESTS
  // =============================================================================

  describe('structured headingDecoration type', () => {
    it('hero emphasis should have headingDecoration with type background', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const emphasis = VisualEmphasizer.calculateEmphasis(analysis);
      expect(emphasis.headingDecoration).toEqual(expect.objectContaining({ type: 'background' }));
    });

    it('featured emphasis should have border-bottom decoration', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const emphasis = VisualEmphasizer.calculateEmphasis(analysis);
      expect(emphasis.headingDecoration).toEqual(expect.objectContaining({ type: 'border-bottom' }));
    });

    it('standard emphasis should have no decoration', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const emphasis = VisualEmphasizer.calculateEmphasis(analysis);
      expect(emphasis.headingDecoration).toEqual({ type: 'none' });
    });

    it('supporting emphasis should have no decoration', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 2 });
      const emphasis = VisualEmphasizer.calculateEmphasis(analysis);
      expect(emphasis.headingDecoration).toEqual({ type: 'none' });
    });

    it('minimal emphasis should have no decoration', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 1 });
      const emphasis = VisualEmphasizer.calculateEmphasis(analysis);
      expect(emphasis.headingDecoration).toEqual({ type: 'none' });
    });

    it('headingDecoration should always be an object with a type property', () => {
      const weights = [1, 2, 3, 4, 5];
      for (const weight of weights) {
        const analysis = createMockSectionAnalysis({ semanticWeight: weight });
        const emphasis = VisualEmphasizer.calculateEmphasis(analysis);
        expect(emphasis.headingDecoration).toHaveProperty('type');
        expect(['underline', 'border-bottom', 'background', 'none']).toContain(emphasis.headingDecoration.type);
      }
    });
  });
});
