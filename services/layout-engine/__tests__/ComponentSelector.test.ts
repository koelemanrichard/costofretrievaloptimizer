import { describe, it, expect } from 'vitest';
import { ComponentSelector } from '../ComponentSelector';
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
// FS-PROTECTED COMPONENT SELECTION TESTS
// =============================================================================

describe('ComponentSelector', () => {
  describe('FS-protected component selection', () => {
    it('should select plain ordered list for numbered-list with FS protection', () => {
      const analysis = createMockSectionAnalysis({
        contentType: 'steps',
        formatCode: 'FS',
        constraints: { fsTarget: true, requiresList: true },
        hasList: true,
      });

      const result = ComponentSelector.selectComponent(analysis);

      expect(result.primaryComponent).toBe('step-list');
      expect(result.componentVariant).toBe('fs-compliant');
      expect(result.reasoning).toContain('FS');
    });

    it('should select plain unordered list for bulleted-list with FS protection', () => {
      const analysis = createMockSectionAnalysis({
        contentType: 'list',
        formatCode: 'FS',
        constraints: { fsTarget: true },
        hasList: true,
      });

      const result = ComponentSelector.selectComponent(analysis);

      expect(result.primaryComponent).toBe('checklist');
      expect(result.componentVariant).toBe('fs-compliant');
      expect(result.reasoning).toContain('FS');
    });

    it('should select standard table for table content with FS protection', () => {
      const analysis = createMockSectionAnalysis({
        contentType: 'comparison',
        formatCode: 'FS',
        constraints: { fsTarget: true, requiresTable: true },
        hasTable: true,
      });

      const result = ComponentSelector.selectComponent(analysis);

      expect(result.primaryComponent).toBe('comparison-table');
      expect(result.componentVariant).toBe('fs-compliant');
      expect(result.reasoning).toContain('FS');
    });

    it('should preserve HTML structure reasoning for FS-protected sections', () => {
      const analysis = createMockSectionAnalysis({
        contentType: 'faq',
        formatCode: 'FS',
        constraints: { fsTarget: true },
      });

      const result = ComponentSelector.selectComponent(analysis);

      expect(result.componentVariant).toBe('fs-compliant');
      expect(result.reasoning).toMatch(/FS|Featured Snippet|structure/i);
    });
  });

  // =============================================================================
  // HIGH-VALUE COMPONENT SELECTION TESTS (UNIQUE/RARE)
  // =============================================================================

  describe('high-value component selection (UNIQUE/RARE)', () => {
    it('should select key-takeaway for summary with UNIQUE attribute', () => {
      const analysis = createMockSectionAnalysis({
        contentType: 'summary',
        attributeCategory: 'UNIQUE',
        semanticWeight: 5,
      });

      const result = ComponentSelector.selectComponent(analysis);

      expect(result.primaryComponent).toBe('key-takeaways');
      expect(result.reasoning).toContain('UNIQUE');
    });

    it('should enhance explanation with UNIQUE to unique-insight', () => {
      const analysis = createMockSectionAnalysis({
        contentType: 'explanation',
        attributeCategory: 'UNIQUE',
        semanticWeight: 5,
      });

      const result = ComponentSelector.selectComponent(analysis);

      // Should be enhanced prose or a special component
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.reasoning).toContain('UNIQUE');
    });

    it('should enhance components for RARE attribute category', () => {
      const analysis = createMockSectionAnalysis({
        contentType: 'definition',
        attributeCategory: 'RARE',
        semanticWeight: 4,
      });

      const result = ComponentSelector.selectComponent(analysis);

      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.reasoning).toContain('RARE');
    });

    it('should prioritize FS protection over high-value enhancement', () => {
      // FS protection should always win even if UNIQUE
      const analysis = createMockSectionAnalysis({
        contentType: 'summary',
        attributeCategory: 'UNIQUE',
        formatCode: 'FS',
        constraints: { fsTarget: true },
      });

      const result = ComponentSelector.selectComponent(analysis);

      // FS compliance should be the variant
      expect(result.componentVariant).toBe('fs-compliant');
    });
  });

  // =============================================================================
  // TWO-FACTOR MATRIX SELECTION TESTS
  // =============================================================================

  describe('two-factor matrix selection (content type x brand personality)', () => {
    describe('corporate personality', () => {
      const corporateDna = createMockDesignDNA({
        personality: {
          overall: 'corporate',
          formality: 4,
          energy: 2,
          warmth: 3,
          trustSignals: 'prominent',
        },
      });

      it('should select hero-section (contained) for introduction', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'introduction' });
        const result = ComponentSelector.selectComponent(analysis, corporateDna);

        expect(result.primaryComponent).toBe('hero');
        expect(result.componentVariant).toBe('contained');
      });

      it('should select prose-section (structured) for explanation', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'explanation' });
        const result = ComponentSelector.selectComponent(analysis, corporateDna);

        expect(result.primaryComponent).toBe('prose');
        expect(result.componentVariant).toBe('structured');
      });

      it('should select timeline (vertical-professional) for steps', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'steps' });
        const result = ComponentSelector.selectComponent(analysis, corporateDna);

        expect(result.primaryComponent).toBe('timeline');
        expect(result.componentVariant).toBe('vertical-professional');
      });

      it('should select comparison-table (striped) for comparison', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'comparison' });
        const result = ComponentSelector.selectComponent(analysis, corporateDna);

        expect(result.primaryComponent).toBe('comparison-table');
        expect(result.componentVariant).toBe('striped');
      });

      it('should select faq-accordion (clean) for faq', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'faq' });
        const result = ComponentSelector.selectComponent(analysis, corporateDna);

        expect(result.primaryComponent).toBe('faq-accordion');
        expect(result.componentVariant).toBe('clean');
      });

      it('should select callout-box (bordered) for evidence', () => {
        const analysis = createMockSectionAnalysis({
          contentType: 'testimonial',
        });
        const result = ComponentSelector.selectComponent(analysis, corporateDna);

        expect(result.primaryComponent).toBe('testimonial-card');
        expect(result.componentVariant).toBe('bordered');
      });

      it('should select summary-box (key-points) for summary', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'summary' });
        const result = ComponentSelector.selectComponent(analysis, corporateDna);

        expect(result.primaryComponent).toBe('key-takeaways');
        expect(result.componentVariant).toBe('key-points');
      });
    });

    describe('creative personality', () => {
      const creativeDna = createMockDesignDNA({
        personality: {
          overall: 'creative',
          formality: 2,
          energy: 4,
          warmth: 4,
          trustSignals: 'minimal',
        },
      });

      it('should select hero-section (gradient) for introduction', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'introduction' });
        const result = ComponentSelector.selectComponent(analysis, creativeDna);

        expect(result.primaryComponent).toBe('hero');
        expect(result.componentVariant).toBe('gradient');
      });

      it('should select prose-section (flowing) for explanation', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'explanation' });
        const result = ComponentSelector.selectComponent(analysis, creativeDna);

        expect(result.primaryComponent).toBe('prose');
        expect(result.componentVariant).toBe('flowing');
      });

      it('should select timeline (playful) for steps', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'steps' });
        const result = ComponentSelector.selectComponent(analysis, creativeDna);

        expect(result.primaryComponent).toBe('timeline');
        expect(result.componentVariant).toBe('playful');
      });

      it('should select comparison-table (cards) for comparison', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'comparison' });
        const result = ComponentSelector.selectComponent(analysis, creativeDna);

        expect(result.primaryComponent).toBe('comparison-table');
        expect(result.componentVariant).toBe('cards');
      });

      it('should select faq-accordion (colorful) for faq', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'faq' });
        const result = ComponentSelector.selectComponent(analysis, creativeDna);

        expect(result.primaryComponent).toBe('faq-accordion');
        expect(result.componentVariant).toBe('colorful');
      });

      it('should select summary-box (visual) for summary', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'summary' });
        const result = ComponentSelector.selectComponent(analysis, creativeDna);

        expect(result.primaryComponent).toBe('key-takeaways');
        expect(result.componentVariant).toBe('visual');
      });
    });

    describe('minimal personality', () => {
      const minimalDna = createMockDesignDNA({
        personality: {
          overall: 'minimal',
          formality: 2,
          energy: 2,
          warmth: 2,
          trustSignals: 'minimal',
        },
      });

      it('should select hero-section (simple) for introduction', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'introduction' });
        const result = ComponentSelector.selectComponent(analysis, minimalDna);

        expect(result.primaryComponent).toBe('hero');
        expect(result.componentVariant).toBe('simple');
      });

      it('should select prose-section (clean) for explanation', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'explanation' });
        const result = ComponentSelector.selectComponent(analysis, minimalDna);

        expect(result.primaryComponent).toBe('prose');
        expect(result.componentVariant).toBe('clean');
      });

      it('should select timeline (numbered) for steps', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'steps' });
        const result = ComponentSelector.selectComponent(analysis, minimalDna);

        expect(result.primaryComponent).toBe('timeline');
        expect(result.componentVariant).toBe('numbered');
      });

      it('should select comparison-table (simple) for comparison', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'comparison' });
        const result = ComponentSelector.selectComponent(analysis, minimalDna);

        expect(result.primaryComponent).toBe('comparison-table');
        expect(result.componentVariant).toBe('simple');
      });

      it('should select faq-accordion (minimal) for faq', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'faq' });
        const result = ComponentSelector.selectComponent(analysis, minimalDna);

        expect(result.primaryComponent).toBe('faq-accordion');
        expect(result.componentVariant).toBe('minimal');
      });

      it('should select summary-box (checklist) for summary', () => {
        const analysis = createMockSectionAnalysis({ contentType: 'summary' });
        const result = ComponentSelector.selectComponent(analysis, minimalDna);

        expect(result.primaryComponent).toBe('key-takeaways');
        expect(result.componentVariant).toBe('checklist');
      });
    });
  });

  // =============================================================================
  // PERSONALITY INFERENCE TESTS
  // =============================================================================

  describe('personality inference from formality/energy/warmth', () => {
    it('should infer corporate from high formality + low energy', () => {
      const dna = createMockDesignDNA({
        personality: {
          overall: undefined as unknown as 'corporate', // Simulate missing overall
          formality: 5,
          energy: 1,
          warmth: 3,
          trustSignals: 'moderate',
        },
      });
      // Force overall to be undefined for inference test
      (dna.personality as { overall?: string }).overall = undefined;

      const analysis = createMockSectionAnalysis({ contentType: 'introduction' });
      const result = ComponentSelector.selectComponent(analysis, dna);

      // Should infer corporate and use contained variant
      expect(result.componentVariant).toBe('contained');
    });

    it('should infer creative from low formality + high energy', () => {
      const dna = createMockDesignDNA({
        personality: {
          overall: undefined as unknown as 'creative',
          formality: 1,
          energy: 5,
          warmth: 4,
          trustSignals: 'minimal',
        },
      });
      (dna.personality as { overall?: string }).overall = undefined;

      const analysis = createMockSectionAnalysis({ contentType: 'introduction' });
      const result = ComponentSelector.selectComponent(analysis, dna);

      // Should infer creative and use gradient variant
      expect(result.componentVariant).toBe('gradient');
    });

    it('should infer minimal from low formality + low energy', () => {
      const dna = createMockDesignDNA({
        personality: {
          overall: undefined as unknown as 'minimal',
          formality: 1,
          energy: 1,
          warmth: 2,
          trustSignals: 'minimal',
        },
      });
      (dna.personality as { overall?: string }).overall = undefined;

      const analysis = createMockSectionAnalysis({ contentType: 'introduction' });
      const result = ComponentSelector.selectComponent(analysis, dna);

      // Should infer minimal and use simple variant
      expect(result.componentVariant).toBe('simple');
    });

    it('should default to corporate when DNA is not provided', () => {
      const analysis = createMockSectionAnalysis({ contentType: 'introduction' });
      const result = ComponentSelector.selectComponent(analysis);

      // Default should be corporate
      expect(result.componentVariant).toBe('contained');
    });
  });

  // =============================================================================
  // ALTERNATIVE COMPONENTS TESTS
  // =============================================================================

  describe('alternative components', () => {
    it('should provide alternative components in selection', () => {
      const analysis = createMockSectionAnalysis({ contentType: 'faq' });
      const result = ComponentSelector.selectComponent(analysis);

      expect(result.alternativeComponents).toBeDefined();
      expect(Array.isArray(result.alternativeComponents)).toBe(true);
    });

    it('should include related components as alternatives', () => {
      const analysis = createMockSectionAnalysis({ contentType: 'steps' });
      const result = ComponentSelector.selectComponent(analysis);

      // Steps should have checklist or step-list as alternatives
      expect(result.alternativeComponents.length).toBeGreaterThan(0);
    });
  });

  // =============================================================================
  // CONFIDENCE SCORING TESTS
  // =============================================================================

  describe('confidence scoring', () => {
    it('should have high confidence for FS-protected selections', () => {
      const analysis = createMockSectionAnalysis({
        formatCode: 'FS',
        constraints: { fsTarget: true },
      });

      const result = ComponentSelector.selectComponent(analysis);

      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should have high confidence for UNIQUE high-value selections', () => {
      const analysis = createMockSectionAnalysis({
        attributeCategory: 'UNIQUE',
        semanticWeight: 5,
      });

      const result = ComponentSelector.selectComponent(analysis);

      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should have moderate confidence for standard matrix selections', () => {
      const analysis = createMockSectionAnalysis({ contentType: 'explanation' });
      const dna = createMockDesignDNA();

      const result = ComponentSelector.selectComponent(analysis, dna);

      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      expect(result.confidence).toBeLessThanOrEqual(0.9);
    });
  });

  // =============================================================================
  // SELECT ALL COMPONENTS TESTS
  // =============================================================================

  describe('selectAllComponents', () => {
    it('should select components for all sections', () => {
      const analyses = [
        createMockSectionAnalysis({ sectionId: 'section-1', contentType: 'introduction' }),
        createMockSectionAnalysis({ sectionId: 'section-2', contentType: 'explanation' }),
        createMockSectionAnalysis({ sectionId: 'section-3', contentType: 'faq' }),
      ];

      const results = ComponentSelector.selectAllComponents(analyses);

      expect(results).toHaveLength(3);
      expect(results[0].primaryComponent).toBe('hero');
      expect(results[1].primaryComponent).toBe('prose');
      expect(results[2].primaryComponent).toBe('faq-accordion');
    });

    it('should apply design DNA consistently to all sections', () => {
      const analyses = [
        createMockSectionAnalysis({ sectionId: 'section-1', contentType: 'introduction' }),
        createMockSectionAnalysis({ sectionId: 'section-2', contentType: 'faq' }),
      ];
      const creativeDna = createMockDesignDNA({
        personality: {
          overall: 'creative',
          formality: 2,
          energy: 4,
          warmth: 4,
          trustSignals: 'minimal',
        },
      });

      const results = ComponentSelector.selectAllComponents(analyses, creativeDna);

      expect(results[0].componentVariant).toBe('gradient');
      expect(results[1].componentVariant).toBe('colorful');
    });

    it('should return empty array for empty input', () => {
      const results = ComponentSelector.selectAllComponents([]);
      expect(results).toEqual([]);
    });
  });

  // =============================================================================
  // INSTANCE METHODS TESTS
  // =============================================================================

  describe('instance methods', () => {
    it('should provide instance method for selectComponent', () => {
      const selector = new ComponentSelector();
      const analysis = createMockSectionAnalysis();
      const result = selector.selectComponent(analysis);

      expect(result).toBeDefined();
      expect(result.primaryComponent).toBeDefined();
    });

    it('should provide instance method for selectAllComponents', () => {
      const selector = new ComponentSelector();
      const analyses = [createMockSectionAnalysis()];
      const results = selector.selectAllComponents(analyses);

      expect(results).toHaveLength(1);
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('edge cases', () => {
    it('should handle unknown content types gracefully', () => {
      const analysis = createMockSectionAnalysis({
        contentType: 'data' as ContentType,
      });

      const result = ComponentSelector.selectComponent(analysis);

      expect(result.primaryComponent).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle missing personality overall gracefully', () => {
      const dna = createMockDesignDNA();
      (dna.personality as { overall?: string }).overall = undefined;

      const analysis = createMockSectionAnalysis({ contentType: 'faq' });
      const result = ComponentSelector.selectComponent(analysis, dna);

      expect(result.primaryComponent).toBe('faq-accordion');
      expect(result.componentVariant).toBeDefined();
    });

    it('should handle definition content type', () => {
      const analysis = createMockSectionAnalysis({ contentType: 'definition' });
      const result = ComponentSelector.selectComponent(analysis);

      expect(result.primaryComponent).toBe('definition-box');
    });

    it('should handle testimonial content type', () => {
      const analysis = createMockSectionAnalysis({ contentType: 'testimonial' });
      const result = ComponentSelector.selectComponent(analysis);

      expect(result.primaryComponent).toBe('testimonial-card');
    });

    it('should generate reasoning that explains the selection', () => {
      const analysis = createMockSectionAnalysis({
        contentType: 'steps',
        attributeCategory: 'COMMON',
      });
      const dna = createMockDesignDNA({
        personality: {
          overall: 'corporate',
          formality: 4,
          energy: 2,
          warmth: 3,
          trustSignals: 'moderate',
        },
      });

      const result = ComponentSelector.selectComponent(analysis, dna);

      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(10);
      expect(result.reasoning).toMatch(/steps|timeline|corporate/i);
    });
  });
});
